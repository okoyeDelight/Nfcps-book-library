-- Private Academic-only recovery metadata; no handout bodies copied into audit logs.
CREATE TABLE IF NOT EXISTS nfcps_agent_ops.native_salvage_request (
 source_page_id bigint PRIMARY KEY,
 material_drive_id text NOT NULL,
 level integer NOT NULL CHECK(level IN (100,200,300,400,500)),
 page_number integer NOT NULL CHECK(page_number>=1),
 http_request_id bigint NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'requested'
  CHECK(state IN('requested','recovered','unsafe_source','http_failed','expired','lost_race')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 text_characters integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS native_salvage_request_outstanding
 ON nfcps_agent_ops.native_salvage_request(state,requested_at);
REVOKE ALL ON nfcps_agent_ops.native_salvage_request FROM PUBLIC,anon,authenticated,service_role;
