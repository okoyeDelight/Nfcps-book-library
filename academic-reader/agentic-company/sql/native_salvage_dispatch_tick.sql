CREATE OR REPLACE FUNCTION nfcps_agent_ops.native_salvage_dispatch_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE r record; v_request bigint; n int:=0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(791015,1)
  THEN RETURN jsonb_build_object('status','busy'); END IF;
 FOR r IN
  WITH candidates AS (
    SELECT p.id,p.material_drive_id,p.page_number,m.level,
      row_number() OVER(PARTITION BY m.level ORDER BY p.id) rn
    FROM public.nfcps_academic_page_index p
    JOIN public.nfcps_academic_materials m ON m.drive_id=p.material_drive_id
    WHERE m.item_type='file' AND m.polish_status='ready'
     AND m.level IN (200,300,400,500)
     AND m.metadata->>'source_page_count_status'='source_pdf_verified'
     AND m.metadata->>'source_page_index_status'='complete'
     AND CASE WHEN m.metadata->>'source_page_version' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' THEN ((m.metadata->>'source_page_version')::timestamptz = m.polished_at) ELSE false END
     AND coalesce(m.metadata->>'source_page_count','')~'^[1-9][0-9]{0,4}$'
     AND p.page_number BETWEEN 1 AND (m.metadata->>'source_page_count')::int
     AND p.material_drive_id~'^[A-Za-z0-9_-]{8,120}$'
     AND p.ocr_status='pending'
     AND p.audit_status='pending'
     AND coalesce(p.ocr_attempts,0)=0
     AND length(btrim(coalesce(p.page_text,'')))<10
     AND NOT EXISTS(
       SELECT 1 FROM nfcps_agent_ops.native_salvage_request req
       WHERE req.source_page_id=p.id)
  )
  SELECT * FROM candidates WHERE rn=1
  ORDER BY ((level/100)+floor(extract(epoch from now())/120)::int)%4, id
  LIMIT 4
 LOOP
   SELECT net.http_get(
     url:='https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-flow-page'
        ||'?material='||r.material_drive_id||'&page='||r.page_number
        ||'&layout=6&native_salvage=1',
     timeout_milliseconds:=20000) INTO v_request;
   INSERT INTO nfcps_agent_ops.native_salvage_request
      (source_page_id,material_drive_id,level,page_number,http_request_id)
    VALUES(r.id,r.material_drive_id,r.level,r.page_number,v_request)
    ON CONFLICT(source_page_id) DO NOTHING;
   n:=n+1;
 END LOOP;
 RETURN jsonb_build_object('status','dispatched','new_native_source_requests',n,
    'max_per_run',4,'source_editing',false,'paid_api',false);
END;$function$
;
