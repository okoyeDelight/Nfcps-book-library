-- Internal Academic CEO aggregate; no public CEO dashboard or worker feed.
-- Source feed is read-only and refreshed by the private Academic company cycle.
CREATE TABLE IF NOT EXISTS public.nfcps_academic_ceo_feed (
 level integer PRIMARY KEY CHECK(level IN(100,200,300,400,500)),
 is_lead boolean NOT NULL DEFAULT false,
 performance_score numeric(6,2),
 ready_handouts integer NOT NULL DEFAULT 0,
 indexed_handouts integer NOT NULL DEFAULT 0,
 verified_page_coverage integer NOT NULL DEFAULT 0,
 queued_tasks integer NOT NULL DEFAULT 0,
 board_decisions integer NOT NULL DEFAULT 0,
 last_meeting_at timestamptz,
 last_updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nfcps_academic_ceo_feed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfcps_academic_ceo_feed FROM PUBLIC,anon,authenticated;
-- No public SELECT: organisational evidence stays backend-only.
DROP POLICY IF EXISTS read_academic_ceo_summary ON public.nfcps_academic_ceo_feed;
-- No SELECT policy: UI sees only user-facing Academic learning outcomes.

CREATE OR REPLACE FUNCTION nfcps_agent_ops.publish_ceo_feed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE n integer;
BEGIN
 INSERT INTO public.nfcps_academic_ceo_feed
 (level,is_lead,performance_score,ready_handouts,indexed_handouts,
  verified_page_coverage,queued_tasks,board_decisions,last_meeting_at,last_updated_at)
 SELECT b.level,b.is_lead,s.score,coalesce(s.ready_files,0),
   coalesce(s.indexed_files,0),coalesce(s.source_complete_files,0),
   (select count(*) from nfcps_agent_ops.work_queue w where w.level=b.level and w.state IN('ready','blocked','review_required')),
   (select count(*) from nfcps_agent_ops.board_proposal bp where bp.proposed_by_level=b.level and bp.state='executed'),
   (select max(m.scheduled_at) from nfcps_agent_ops.meeting m
       where m.convened_by_level=b.level or m.meeting_type='board'),now()
 FROM nfcps_agent_ops.branch b
 LEFT JOIN LATERAL(
 SELECT score,ready_files,indexed_files,source_complete_files
 FROM nfcps_agent_ops.scorecard where level=b.level
 ORDER BY observed_at DESC LIMIT 1) s ON true
 WHERE b.active
 ON CONFLICT(level) DO UPDATE SET
 is_lead=EXCLUDED.is_lead,performance_score=EXCLUDED.performance_score,
 ready_handouts=EXCLUDED.ready_handouts,indexed_handouts=EXCLUDED.indexed_handouts,
 verified_page_coverage=EXCLUDED.verified_page_coverage,
 queued_tasks=EXCLUDED.queued_tasks,board_decisions=EXCLUDED.board_decisions,
 last_meeting_at=EXCLUDED.last_meeting_at,last_updated_at=EXCLUDED.last_updated_at;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN jsonb_build_object('updated',n,'source','private_live_ceo_board','paid_calls',0);
END;$function$
;
REVOKE ALL ON FUNCTION nfcps_agent_ops.publish_ceo_feed() FROM PUBLIC,anon,authenticated,service_role;
-- Existing private company_cycle() calls publish_ceo_feed() every 20 minutes.
