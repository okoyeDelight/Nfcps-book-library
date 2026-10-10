CREATE OR REPLACE FUNCTION nfcps_agent_ops.specialist_page_audit_tick(p_material_id text DEFAULT NULL::text, p_page_number integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE r record; v_cursor bigint:=0; v_last bigint:=0; v_seen int:=0;
 v_flags int:=0; v_new int:=0; v_issues int:=0;
 v_code text; v_role text; v_severity text; v_problem text;
 v_source_count int; v_reason text; v_target boolean:=p_material_id IS NOT NULL;
BEGIN
 IF NOT pg_try_advisory_xact_lock(190645,20261010)
 THEN RETURN jsonb_build_object('status','busy'); END IF;
 IF NOT v_target THEN
  SELECT last_page_id INTO v_cursor FROM nfcps_agent_ops.specialist_cursor WHERE id=1 FOR UPDATE;
 END IF;
 FOR r IN SELECT p.id,p.material_drive_id,p.page_number,p.ocr_status,p.audit_status,
    coalesce(p.ocr_attempts,0) attempts,
    length(btrim(coalesce(p.page_text,''))) text_len,
    m.level,m.metadata
  FROM public.nfcps_academic_page_index p
  JOIN public.nfcps_academic_materials m ON m.drive_id=p.material_drive_id
  WHERE m.item_type='file' AND m.polish_status='ready' AND m.level IN (100,200,300,400,500)
   AND ((v_target AND p.material_drive_id=p_material_id AND
          (p_page_number IS NULL OR p.page_number=p_page_number))
     OR (NOT v_target AND p.id>v_cursor))
  ORDER BY p.id LIMIT CASE WHEN v_target THEN 1 ELSE 180 END
 LOOP
  v_seen:=v_seen+1;v_last:=r.id;
  v_source_count:=0;
  IF r.metadata->>'source_page_count_status'='source_pdf_verified'
   AND coalesce(r.metadata->>'source_page_count','')~'^[0-9]{1,6}$'
  THEN v_source_count:=(r.metadata->>'source_page_count')::int;END IF;
  FOR v_code,v_role,v_severity IN
   SELECT code,role,severity FROM (VALUES
    ('OUTSIDE_VERIFIED_SOURCE','pagination_inspector','critical',
      v_source_count>0 AND (r.page_number<1 OR r.page_number>v_source_count)),
    ('UNVERIFIED_PASS_STATUS','security_gatekeeper','critical',
      r.audit_status='passed' AND (r.text_len<10
        OR coalesce(r.ocr_status,'') NOT IN ('ready','not_needed'))),
    ('EXHAUSTED_OCR','ocr_recovery','high',
      r.ocr_status='needs_review' AND r.attempts>=5 AND r.text_len<10),
    ('OCR_READY_WITHOUT_TEXT','ocr_recovery','high',
      r.ocr_status='ready' AND r.text_len<10)
   ) checks(code,role,severity,broken) WHERE broken
  LOOP
   v_flags:=v_flags+1;
   INSERT INTO nfcps_agent_ops.specialist_observation
    (level,material_drive_id,page_number,issue_code,specialist_role,severity,source_page_id,evidence)
   VALUES(r.level,r.material_drive_id,r.page_number,v_code,v_role,v_severity,r.id,
    jsonb_build_object('page_index_id',r.id,'source_page_count',v_source_count,
     'observed_text_characters',r.text_len,'ocr_status',r.ocr_status,
     'audit_status',r.audit_status,'ocr_attempts',r.attempts,
     'evidence_type','original_academic_metadata','source_text_edited',false))
   ON CONFLICT(material_drive_id,page_number,issue_code)
   DO UPDATE SET last_detected_at=now(),evidence=EXCLUDED.evidence
   WHERE nfcps_agent_ops.specialist_observation.observation_state<>'independently_verified';
   GET DIAGNOSTICS v_new=ROW_COUNT;
  END LOOP;
 END LOOP;
 IF NOT v_target THEN
  UPDATE nfcps_agent_ops.specialist_cursor
   SET last_page_id=CASE WHEN v_seen=0 THEN 0 ELSE v_last END,
    scanned_total=scanned_total+v_seen,
    last_run_count=v_seen,last_run_at=now() WHERE id=1;
 END IF;
 RETURN jsonb_build_object('status','inspected','pages_checked',v_seen,
  'findings',v_flags,'cursor_reset',NOT v_target AND v_seen=0,
  'source_modified',false,'paid_calls',0);
END;$function$
;
