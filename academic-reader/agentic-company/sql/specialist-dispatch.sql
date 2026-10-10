CREATE OR REPLACE FUNCTION nfcps_agent_ops.specialist_dispatch_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE o record; v_issue bigint; v_sent int:=0; v_skipped int:=0;
 v_kind text; v_summary text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(190647,20261010)
 THEN RETURN jsonb_build_object('status','busy'); END IF;
 FOR o IN SELECT * FROM nfcps_agent_ops.specialist_observation
   WHERE observation_state='detected' ORDER BY
   CASE severity WHEN 'critical' THEN 0 ELSE 1 END,id LIMIT 3 FOR UPDATE SKIP LOCKED
 LOOP
  IF NOT EXISTS(SELECT 1 FROM public.nfcps_academic_materials m
     WHERE m.drive_id=o.material_drive_id AND m.level=o.level
       AND m.item_type='file' AND m.polish_status='ready') THEN
    v_skipped:=v_skipped+1;CONTINUE;
  END IF;
  v_kind:=CASE WHEN o.issue_code='OUTSIDE_VERIFIED_SOURCE'
     THEN 'missing_page' ELSE 'unreadable_text' END;
  v_summary:=CASE o.issue_code
    WHEN 'OUTSIDE_VERIFIED_SOURCE' THEN 'Indexed source page is outside the independently counted PDF; verify source integrity.'
    WHEN 'UNVERIFIED_PASS_STATUS' THEN 'Historical audit pass conflicts with empty or unresolved text; source evidence review required.'
    WHEN 'EXHAUSTED_OCR' THEN 'OCR attempts exhausted with little indexed text; original source comparison required.'
    ELSE 'OCR marked ready on nearly empty indexed text; compare original visual before deciding whether it is defective.'
  END;
  INSERT INTO nfcps_agent_ops.student_improvement
   (level,problem_type,issue_summary,source_material_id,source_page,channel,state,source_evidence)
  VALUES(o.level,v_kind,v_summary,o.material_drive_id,o.page_number,'internal_audit','submitted',
    jsonb_build_object('source','specialist_page_inspector','observation_id',o.id,
       'issue_code',o.issue_code,'specialist_role',o.specialist_role,
       'page_index_id',o.source_page_id,'requires_independent_visual_review',true,
       'repair_verified',false))
  ON CONFLICT DO NOTHING RETURNING id INTO v_issue;
  IF v_issue IS NULL THEN
    SELECT id INTO v_issue FROM nfcps_agent_ops.student_improvement
    WHERE level=o.level AND problem_type=v_kind
      AND source_material_id=o.material_drive_id AND source_page=o.page_number
      AND channel='internal_audit' LIMIT 1;
  END IF;
  IF v_issue IS NOT NULL THEN
   UPDATE nfcps_agent_ops.specialist_observation SET observation_state='assigned'
   WHERE id=o.id AND observation_state='detected';
   v_sent:=v_sent+1;
  ELSE v_skipped:=v_skipped+1;END IF;
  v_issue:=NULL;
 END LOOP;
 RETURN jsonb_build_object('status','dispatched_to_ceo','observations_linked',v_sent,
   'not_linked',v_skipped,'source_modified',false);
END;$function$
;
