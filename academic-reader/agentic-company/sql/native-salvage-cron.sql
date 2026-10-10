-- Existing project; no new hosting/payment services.
-- Strictly bounded: at most four clean native PDF page probes every two minutes.
SELECT cron.schedule('nfcps-academic-native-salvage','*/2 * * * *',
 $$SELECT nfcps_agent_ops.native_salvage_cycle()$$);
-- Investigate error rates via cron.job_run_details before raising throughput.
