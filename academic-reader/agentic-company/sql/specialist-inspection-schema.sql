-- Internal Supabase-only Academic specialist evidence storage. No UI exposure.
CREATE TABLE IF NOT EXISTS nfcps_agent_ops.specialist_cursor (
 id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),
 last_page_id bigint NOT NULL DEFAULT 0,
 scanned_total bigint NOT NULL DEFAULT 0,
 last_run_at timestamptz,
 last_run_count integer NOT NULL DEFAULT 0
);
INSERT INTO nfcps_agent_ops.specialist_cursor(id) VALUES(1)
 ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS nfcps_agent_ops.specialist_observation (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 level integer NOT NULL REFERENCES nfcps_agent_ops.branch(level),
 material_drive_id text NOT NULL,
 page_number integer NOT NULL CHECK(page_number>0),
 issue_code text NOT NULL CHECK(issue_code IN
  ('OUTSIDE_VERIFIED_SOURCE','UNVERIFIED_PASS_STATUS','EXHAUSTED_OCR','OCR_READY_WITHOUT_TEXT')),
 specialist_role text NOT NULL,
 severity text NOT NULL CHECK(severity IN ('critical','high','medium')),
 source_page_id bigint NOT NULL,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 observation_state text NOT NULL DEFAULT 'detected' CHECK(observation_state IN
  ('detected','assigned','review_required','independently_verified')),
 first_detected_at timestamptz NOT NULL DEFAULT now(),
 last_detected_at timestamptz NOT NULL DEFAULT now(),
 independent_review_ref text,
 UNIQUE(material_drive_id,page_number,issue_code),
 CHECK(observation_state<>'independently_verified' OR independent_review_ref IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS specialist_observation_review_idx
 ON nfcps_agent_ops.specialist_observation(observation_state,severity,last_detected_at);
REVOKE ALL ON ALL TABLES IN SCHEMA nfcps_agent_ops
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA nfcps_agent_ops
 FROM PUBLIC,anon,authenticated,service_role;