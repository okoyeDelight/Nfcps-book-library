CREATE OR REPLACE FUNCTION nfcps_agent_ops.specialist_recheck_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE o record; v_done int:=0;v_checked int:=0;
 v_ok boolean;v_expected int;
BEGIN
 IF NOT pg_try_advisory_xact_lock(190649,20261010)
 THEN RETURN jsonb_build_object('status','busy'); END IF;
 FOR o IN
  SELECT obs.*,p.page_text,p.ocr_status,p.audit_status,m.metadata
  FROM nfcps_agent_ops.specialist_observation obs
  JOIN public.nfcps_academic_page_index p ON p.id=obs.source_page_id
  JOIN public.nfcps_academic_materials m ON m.drive_id=obs.material_drive_id
  WHERE obs.observation_state='assigned' AND p.material_drive_id=obs.material_drive_id
    AND p.page_number=obs.page_number AND m.level=obs.level AND m.polish_status='ready'
  ORDER BY obs.last_detected_at,obs.id LIMIT 40 FOR UPDATE OF obs SKIP LOCKED
 LOOP
  v_checked:=v_checked+1;
  v_ok:=false;
  IF o.issue_code IN ('EXHAUSTED_OCR','OCR_READY_WITHOUT_TEXT','UNVERIFIED_PASS_STATUS') THEN
    v_ok:=coalesce(o.ocr_status,'') IN ('ready','not_needed')
       AND o.audit_status='passed' AND length(btrim(coalesce(o.page_text,'')))>=40;
  ELSIF o.issue_code='OUTSIDE_VERIFIED_SOURCE' THEN
    v_expected:=0;
    IF o.metadata->>'source_page_count_status'='source_pdf_verified'
     AND coalesce(o.metadata->>'source_page_count','')~'^[0-9]{1,6}$'
    THEN v_expected:=(o.metadata->>'source_page_count')::int;END IF;
    v_ok:=v_expected>0 AND o.page_number BETWEEN 1 AND v_expected;
  END IF;
  IF v_ok THEN
    UPDATE nfcps_agent_ops.specialist_observation
      SET observation_state='review_required',
          evidence=evidence||jsonb_build_object(
             'source_condition_cleared_at',now(),'rechecked_source_page_id',o.source_page_id,
             'independent_academic_review_still_required',true)
      WHERE id=o.id AND observation_state='assigned';
    UPDATE nfcps_agent_ops.student_improvement i
     SET state='review',outcome_evidence=coalesce(i.outcome_evidence,'{}'::jsonb)||
      jsonb_build_object('source_condition_rechecked',true,
        'specialist_observation_id',o.id,'human_academic_review_pending',true)
     WHERE i.source_evidence->>'observation_id'=o.id::text
       AND i.state='assigned';
    v_done:=v_done+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('status','source_rechecked','observations_checked',v_checked,
  'conditions_cleared_waiting_independent_review',v_done,
  'independently_verified_repairs',0,'source_modified',false);
END;$function$
;
