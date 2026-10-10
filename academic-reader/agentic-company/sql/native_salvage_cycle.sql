CREATE OR REPLACE FUNCTION nfcps_agent_ops.native_salvage_cycle()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE a jsonb;b jsonb;
BEGIN
 a:=nfcps_agent_ops.native_salvage_apply_tick();
 b:=nfcps_agent_ops.native_salvage_dispatch_tick();
 RETURN jsonb_build_object('apply',a,'dispatch',b);
END;$function$
;
