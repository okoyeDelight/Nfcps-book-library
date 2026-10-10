-- Academic-only ZERO certification: read-only and intentionally strict.
-- Zero missing indexed documents != zero unreadable source pages.
WITH levels AS (SELECT unnest(ARRAY[100,200,300,400,500]) AS level),
ready AS (
 SELECT drive_id,level,title,metadata,polished_url
 FROM public.nfcps_academic_materials WHERE item_type='file' AND polish_status='ready'
),
page_audit AS (
 SELECT material_drive_id,COUNT(*) indexed_rows,COUNT(DISTINCT page_number) unique_pages,
 MIN(page_number) first_page,MAX(page_number) last_page,
 COUNT(*) FILTER (WHERE ocr_status IN ('pending','processing','needs_review')) OCR_unresolved,
 COUNT(*) FILTER (WHERE audit_status='review') review_pages,
 COUNT(*) FILTER (WHERE length(btrim(coalesce(page_text,'')))<10) empty_index_text,
 COUNT(*) FILTER (WHERE audit_status='passed' AND (
    length(btrim(coalesce(page_text,'')))<10
    OR ocr_status NOT IN ('ready','not_needed'))) invalid_pass
 FROM public.nfcps_academic_page_index GROUP BY material_drive_id
),row_summary AS (
 SELECT r.level,r.drive_id,
 COALESCE(x.indexed_rows,0) indexed_rows,
 COALESCE(x.OCR_unresolved,0) OCR_unresolved,
 COALESCE(x.review_pages,0) review_pages,
 COALESCE(x.empty_index_text,0) empty_index_text,
 COALESCE(x.invalid_pass,0) invalid_pass,
 CASE WHEN (r.metadata->>'source_page_count') ~ '^[0-9]+$'
  THEN (r.metadata->>'source_page_count')::int ELSE NULL END verified_source_pages,
 COALESCE(r.metadata->>'source_page_count_status','') count_status,
 COALESCE(r.metadata->>'book_bootstrap_error','') source_error,
 CASE WHEN COALESCE(x.indexed_rows,0)>0 AND
  (x.unique_pages<>x.indexed_rows OR x.first_page<>1) THEN 1 ELSE 0 END page_gap
 FROM ready r LEFT JOIN page_audit x ON x.material_drive_id=r.drive_id
),level_summary AS (
 SELECT level,COUNT(*) ready_materials,
 COUNT(*) FILTER(WHERE indexed_rows=0) completely_unindexed,
 COUNT(*) FILTER(WHERE source_error ~* 'encrypted|password') source_owner_needed,
 COUNT(*) FILTER(WHERE count_status<>'source_pdf_verified') pdf_count_not_verified,
 COUNT(*) FILTER(WHERE verified_source_pages IS NOT NULL AND indexed_rows<>verified_source_pages) mismatched_source_index,
 SUM(page_gap) pages_not_contiguous,
 SUM(OCR_unresolved) unresolved_OCR_pages,
 SUM(review_pages) review_pages,
 SUM(empty_index_text) near_empty_index_text_pages,
 SUM(invalid_pass) incorrectly_passed_pages
 FROM row_summary GROUP BY level
)
SELECT l.level,COALESCE(x.ready_materials,0) ready_materials,
 COALESCE(x.completely_unindexed,0) completely_unindexed,
 COALESCE(x.source_owner_needed,0) source_owner_needed,
 COALESCE(x.pdf_count_not_verified,0) pdf_count_not_verified,
 COALESCE(x.mismatched_source_index,0) mismatched_source_index,
 COALESCE(x.pages_not_contiguous,0) pages_not_contiguous,
 COALESCE(x.unresolved_OCR_pages,0) unresolved_OCR_pages,
 COALESCE(x.review_pages,0) review_pages,
 COALESCE(x.near_empty_index_text_pages,0) near_empty_index_text_pages,
 COALESCE(x.incorrectly_passed_pages,0) incorrectly_passed_pages
FROM levels l LEFT JOIN level_summary x USING(level) ORDER BY l.level;
