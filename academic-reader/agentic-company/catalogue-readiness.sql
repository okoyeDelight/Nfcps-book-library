-- NFCPS Academic complete-catalogue read-only QA snapshot.
-- Run with admin-only SQL access. Does not change source materials, RLS,
-- payment configuration, site routing, Watch/Movies/Family, or UI.
-- "passed" is not accepted as evidence of readable text when OCR is pending.
WITH levels AS (
  SELECT unnest(ARRAY[100,200,300,400,500]) AS level
), ready AS (
  SELECT drive_id,level,metadata
  FROM public.nfcps_academic_materials
  WHERE item_type='file' AND polish_status='ready'
), page_audit AS (
  SELECT material_drive_id,
    COUNT(*) indexed_pages,
    COUNT(DISTINCT page_number) distinct_pages,
    MAX(page_number) last_indexed_page,
    COUNT(*) FILTER(WHERE length(btrim(coalesce(page_text,'')))<10) empty_text_pages,
    COUNT(*) FILTER(WHERE ocr_status IN ('pending','processing')) pending_ocr_pages,
    COUNT(*) FILTER(WHERE audit_status='review') review_pages,
    COUNT(*) FILTER(WHERE audit_status='passed' AND (
      length(btrim(coalesce(page_text,'')))<10
      OR ocr_status IN ('pending','processing','needs_review')
    )) misleading_pass_pages
  FROM public.nfcps_academic_page_index GROUP BY material_drive_id
), per_level AS (
  SELECT r.level,
    COUNT(*) ready_materials,
    COUNT(*) FILTER(WHERE coalesce(p.indexed_pages,0)=0) without_index,
    COUNT(*) FILTER(WHERE coalesce(r.metadata->>'source_page_count','')='') unknown_source_page_count,
    COUNT(*) FILTER(WHERE
      (r.metadata->>'source_page_count')~'^[0-9]+$'
      AND p.last_indexed_page IS NOT NULL
      AND p.last_indexed_page < (r.metadata->>'source_page_count')::int
    ) source_pages_missing_from_index,
    SUM(coalesce(p.empty_text_pages,0)) empty_text_pages,
    SUM(coalesce(p.pending_ocr_pages,0)) pending_ocr_pages,
    SUM(coalesce(p.review_pages,0)) review_pages,
    SUM(coalesce(p.misleading_pass_pages,0)) misleading_pass_pages
  FROM ready r LEFT JOIN page_audit p ON p.material_drive_id=r.drive_id GROUP BY r.level
)
SELECT l.level,coalesce(p.ready_materials,0) ready_materials,
  coalesce(p.without_index,0) without_index,
  coalesce(p.unknown_source_page_count,0) unknown_source_page_count,
  coalesce(p.source_pages_missing_from_index,0) source_pages_missing_from_index,
  coalesce(p.empty_text_pages,0) empty_text_pages,
  coalesce(p.pending_ocr_pages,0) pending_ocr_pages,
  coalesce(p.review_pages,0) review_pages,
  coalesce(p.misleading_pass_pages,0) misleading_pass_pages
FROM levels l LEFT JOIN per_level p USING(level) ORDER BY l.level;
