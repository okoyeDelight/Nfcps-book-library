CREATE OR REPLACE FUNCTION nfcps_agent_ops.company_cycle()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE
 leadership jsonb; proposals jsonb; intake jsonb; board jsonb;
 intake_after jsonb; workload jsonb; meeting_result jsonb; missions jsonb; inspection jsonb; dispatch jsonb; recheck jsonb;
BEGIN
 IF NOT pg_try_advisory_xact_lock(845128,20261010)
 THEN RETURN jsonb_build_object('status','already_processing'); END IF;
 IF (SELECT allow_paid_services OR NOT preserve_original_nfcps_ui
   FROM nfcps_agent_ops.board_policy WHERE id=1)
 THEN RETURN jsonb_build_object('status','blocked_by_immutable_company_rules'); END IF;
 leadership:=nfcps_agent_ops.competition_tick();
 proposals:=nfcps_agent_ops.agenda_sync();
 inspection:=nfcps_agent_ops.specialist_page_audit_tick();
 dispatch:=nfcps_agent_ops.specialist_dispatch_tick();
 recheck:=nfcps_agent_ops.specialist_recheck_tick();
 intake:=nfcps_agent_ops.improvement_intake_tick();
 board:=nfcps_agent_ops.board_session();
 intake_after:=nfcps_agent_ops.improvement_intake_tick();
 workload:=nfcps_agent_ops.work_tick();
 missions:=nfcps_agent_ops.joint_mission_tick();
 meeting_result:=nfcps_agent_ops.meeting_tick();
 PERFORM nfcps_agent_ops.publish_ceo_feed();
 INSERT INTO nfcps_agent_ops.governance_log
   (actor,action,entity,entity_key,outcome,reason,evidence)
 VALUES ('internal_company_cycle','periodic_company_operations','company',
   'five-academic-branches','checked',
   'Real academic issue intake and source-measured cross-branch tasks; never narrative simulations',
   jsonb_build_object('election',leadership,'agenda',proposals,
       'issue_triage',intake,'board',board,'issue_assignment',intake_after,
       'joint_missions',missions,'specialist_inspection',inspection,'specialist_dispatch',dispatch,'specialist_recheck',recheck));
 RETURN jsonb_build_object('status','complete','leadership',leadership,
   'agenda',proposals,'issue_intake',intake,'board',board,
   'issue_assignments',intake_after,'work',workload,
   'joint_missions',missions,'meetings',meeting_result,
   'specialist_inspection',inspection,'specialist_dispatch',dispatch,
  'specialist_recheck',recheck);
END;$function$
;
