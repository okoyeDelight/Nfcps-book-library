-- NFCPS Academic evidence receipts, privacy-minimised and read-only for students.
-- Only trusted system checks are published, never student submissions or handout page text.
CREATE TABLE IF NOT EXISTS public.nfcps_academic_work_receipts (
 source_kind text NOT NULL CHECK(source_kind IN ('source_page_audit','specialist_inspection','independent_repair')),
 source_ref text NOT NULL,
 level integer NOT NULL CHECK(level IN(100,200,300,400,500)),
 material_drive_id text NOT NULL, material_title text NOT NULL,
 source_page integer, specialist_role text NOT NULL, action_code text NOT NULL,
 progress_state text NOT NULL CHECK(progress_state IN ('verified','detected','assigned','review_required')),
 evidence_page_index_id bigint, evidence_at timestamptz NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(source_kind,source_ref)
);
CREATE INDEX IF NOT EXISTS academic_work_receipt_recent ON public.nfcps_academic_work_receipts(evidence_at DESC);
CREATE INDEX IF NOT EXISTS academic_work_receipt_material ON public.nfcps_academic_work_receipts(material_drive_id,evidence_at DESC);
ALTER TABLE public.nfcps_academic_work_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfcps_academic_work_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.nfcps_academic_work_receipts TO anon,authenticated;
DROP POLICY IF EXISTS academic_public_verified_receipts ON public.nfcps_academic_work_receipts;
CREATE POLICY academic_public_verified_receipts ON public.nfcps_academic_work_receipts FOR SELECT TO anon,authenticated USING(true);

CREATE OR REPLACE FUNCTION nfcps_agent_ops.publish_work_receipts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE v_obs integer:=0;v_pages integer:=0;v_repairs integer:=0;
BEGIN
 INSERT INTO public.nfcps_academic_work_receipts
 (source_kind,source_ref,level,material_drive_id,material_title,source_page,specialist_role,action_code,progress_state,evidence_page_index_id,evidence_at,published_at)
 SELECT 'specialist_inspection',o.id::text,o.level,o.material_drive_id,left(m.title,180),o.page_number,
  o.specialist_role,o.issue_code,
  CASE o.observation_state WHEN 'independently_verified' THEN 'review_required' ELSE o.observation_state END,
  o.source_page_id,o.first_detected_at,now()
 FROM (SELECT * FROM nfcps_agent_ops.specialist_observation
  ORDER BY id DESC LIMIT 420) o
 JOIN public.nfcps_academic_materials m ON m.drive_id=o.material_drive_id
 WHERE m.item_type='file' AND m.polish_status='ready'
 ON CONFLICT(source_kind,source_ref) DO UPDATE SET
  progress_state=EXCLUDED.progress_state,published_at=now();
 GET DIAGNOSTICS v_obs=ROW_COUNT;

 INSERT INTO public.nfcps_academic_work_receipts
 (source_kind,source_ref,level,material_drive_id,material_title,source_page,specialist_role,action_code,progress_state,evidence_page_index_id,evidence_at,published_at)
 SELECT 'source_page_audit',m.drive_id,m.level,m.drive_id,left(m.title,180),null,
  'pagination_inspector','ORIGINAL_PAGES_1_TO_N','verified',null,
  coalesce((m.metadata->>'source_page_index_verified_at')::timestamptz,now()),now()
 FROM public.nfcps_academic_materials m
 WHERE m.item_type='file' AND m.polish_status='ready'
 AND m.metadata->>'source_page_count_status'='source_pdf_verified'
 AND m.metadata->>'source_page_index_status'='complete'
 AND coalesce(m.metadata->>'source_page_count','')~'^[0-9]{1,6}$'
 AND EXISTS (SELECT 1 FROM public.nfcps_academic_page_index p WHERE p.material_drive_id=m.drive_id)
 ON CONFLICT(source_kind,source_ref) DO UPDATE SET
  evidence_at=EXCLUDED.evidence_at,published_at=now();
 GET DIAGNOSTICS v_pages=ROW_COUNT;

 INSERT INTO public.nfcps_academic_work_receipts
 (source_kind,source_ref,level,material_drive_id,material_title,source_page,specialist_role,action_code,progress_state,evidence_page_index_id,evidence_at,published_at)
 SELECT 'independent_repair',i.id::text,i.level,i.source_material_id,
  left(m.title,180),i.source_page,coalesce(i.assigned_role,'academic_reviewer'),
  'INDEPENDENTLY_VERIFIED_REPAIR','verified',null,i.verified_at,now()
 FROM nfcps_agent_ops.student_improvement i
 JOIN public.nfcps_academic_materials m ON m.drive_id=i.source_material_id
 WHERE i.state='verified' AND i.verified_at IS NOT NULL
 AND i.source_material_id IS NOT NULL AND i.outcome_evidence<>'{}'::jsonb
 ON CONFLICT(source_kind,source_ref) DO NOTHING;
 GET DIAGNOSTICS v_repairs=ROW_COUNT;
 RETURN jsonb_build_object('source_inspections',v_obs,'verified_source_page_manifests',v_pages,
 'independent_repair_receipts',v_repairs,'claims_of_full_text_correctness',false);
END;$function$
;
REVOKE ALL ON FUNCTION nfcps_agent_ops.publish_work_receipts() FROM PUBLIC,anon,authenticated,service_role;
-- Called exclusively via private nfcps_agent_ops.company_cycle every 20 minutes.
