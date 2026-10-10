CREATE OR REPLACE FUNCTION nfcps_agent_ops.command_centre_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
SELECT jsonb_build_object(
 'captured_at',now(),
 'source','real_operational_records',
 'claims_real_human_video_calls',false,
 'board_activity','recorded_policy_meetings_and_votes',
 'live_video_available',false,
 'ceos',coalesce((SELECT jsonb_agg(
    jsonb_build_object(
      'level',b.level,'ceo_id',b.ceo_id,'lead',b.is_lead,
      'reports_to_level',b.reports_to_level,
      'score',s.score,'eligible',s.eligible,
      'ready_files',s.ready_files,'indexed_files',s.indexed_files,
      'source_complete_files',s.source_complete_files,
      'unresolved_ocr_pages',s.pending_ocr_pages+s.review_pages,
      'measured_at',s.observed_at)
    ORDER BY b.level)
   FROM nfcps_agent_ops.branch b LEFT JOIN LATERAL(
    SELECT * FROM nfcps_agent_ops.scorecard sc
    WHERE sc.level=b.level ORDER BY sc.observed_at DESC LIMIT 1) s ON true),'[]'::jsonb),
 'meeting_timeline',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',x.id,'topic',x.topic,'state',x.state,
    'meeting_type',x.meeting_type,'started',x.scheduled_at,
    'ended',x.ended_at) ORDER BY x.id DESC)
   FROM (SELECT * FROM nfcps_agent_ops.meeting ORDER BY id DESC LIMIT 8) x),'[]'::jsonb),
 'board_decisions',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'proposal_id',x.id,'by_level',x.proposed_by_level,'kind',x.action_kind,
   'title',x.title,'state',x.state,'decision_at',x.reviewed_at)
   ORDER BY x.id DESC)
   FROM (SELECT * FROM nfcps_agent_ops.board_proposal ORDER BY id DESC LIMIT 12)x),'[]'::jsonb),
 'specialist_findings',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'level',x.level,'page',x.page_number,'issue',x.issue_code,
   'role',x.specialist_role,'state',x.observation_state,
   'observed_at',x.last_detected_at) ORDER BY x.last_detected_at DESC)
   FROM (SELECT * FROM nfcps_agent_ops.specialist_observation
     ORDER BY last_detected_at DESC LIMIT 12)x),'[]'::jsonb),
 'repair_status',jsonb_build_object(
    'assigned', (SELECT count(*) FROM nfcps_agent_ops.student_improvement WHERE state='assigned'),
    'independently_verified',(SELECT count(*) FROM nfcps_agent_ops.student_improvement WHERE state='verified'),
    'review_required',(SELECT count(*) FROM nfcps_agent_ops.student_improvement WHERE state='review')),
 'native_source_rescue',coalesce((SELECT jsonb_object_agg(state,n)
  FROM (SELECT state,count(*) n FROM nfcps_agent_ops.native_salvage_request GROUP BY state)x),'{}'::jsonb),
 'access','private_admin_only',
 'external_effects','no_student_ui_changes_no_paid_services'
);
$function$
;
