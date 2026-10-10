CREATE OR REPLACE FUNCTION nfcps_agent_ops.native_salvage_apply_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'nfcps_agent_ops', 'public'
AS $function$
DECLARE
 r record; c jsonb; v_text text; v_reason text; v_count int:=0;
 n_checked int:=0; n_recovered int:=0; n_rejected int:=0; v_changed int;
BEGIN
 IF NOT pg_try_advisory_xact_lock(791015,2)
 THEN RETURN jsonb_build_object('status','busy'); END IF;
 FOR r IN
  SELECT req.*,response.status_code,response.content,response.error_msg,
   response.id response_found
  FROM nfcps_agent_ops.native_salvage_request req
  LEFT JOIN net._http_response response ON response.id=req.http_request_id
  WHERE req.state='requested'
  ORDER BY req.requested_at LIMIT 18 FOR UPDATE OF req SKIP LOCKED
 LOOP
  IF r.response_found IS NULL THEN
    IF r.requested_at < now()-interval '3 minutes' THEN
      UPDATE nfcps_agent_ops.native_salvage_request SET
        state='expired',finished_at=now(),
        evidence=jsonb_build_object('reason','HTTP_RESPONSE_NOT_AVAILABLE')
      WHERE source_page_id=r.source_page_id;
      n_rejected:=n_rejected+1;
    END IF;
    CONTINUE;
  END IF;
  n_checked:=n_checked+1;
  v_reason:=NULL;c:=NULL;
  IF r.status_code<>200 OR left(btrim(coalesce(r.content,'')),1)<>'{' THEN
     v_reason:='FLOW_HTTP_OR_JSON_FAILURE';
  ELSE
    BEGIN c:=r.content::jsonb;
    EXCEPTION WHEN OTHERS THEN v_reason:='FLOW_JSON_INVALID'; END;
  END IF;
  IF v_reason IS NULL THEN
    v_text:=coalesce(c->>'text','');
    IF c->>'material'<>r.material_drive_id OR
       c->>'page'<>r.page_number::text OR
       c->>'ok'<>'true' OR c->>'layoutVersion'<>'6' OR
       c->>'textOrigin'<>'native' OR c->>'renderMode'<>'native' OR
       c->>'unreliableText'<>'false' OR c->>'needsVisualReview'<>'false' OR
       c->>'unresolvedImageResources'<>'0' OR
       jsonb_typeof(c->'reviewReasons')<>'array' OR
       jsonb_array_length(c->'reviewReasons')<>0 OR
       length(v_text) NOT BETWEEN 100 AND 25000 OR
       length(regexp_replace(v_text,'[^[:alpha:]]','','g'))<65
    THEN v_reason:='NATIVE_SOURCE_NOT_CONFIDENT'; END IF;
  END IF;
  IF v_reason IS NULL THEN
    UPDATE public.nfcps_academic_page_index page SET
      page_text=v_text,
      ocr_status='not_needed',
      audit_status='pending',
      audit_flags=array_append(coalesce(page.audit_flags,ARRAY[]::text[]),
        'native_text_recovered_review_pending'),
      indexed_at=now()
    FROM public.nfcps_academic_materials material
    WHERE page.id=r.source_page_id
      AND page.material_drive_id=r.material_drive_id
      AND page.page_number=r.page_number
      AND page.material_drive_id=material.drive_id
      AND material.level=r.level AND material.item_type='file'
      AND material.polish_status='ready'
      AND material.metadata->>'source_page_count_status'='source_pdf_verified'
      AND material.metadata->>'source_page_index_status'='complete'
      AND material.metadata->>'source_page_version'~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'
      AND (material.metadata->>'source_page_version')::timestamptz=material.polished_at
      AND page.ocr_status='pending' AND page.audit_status='pending'
      AND coalesce(page.ocr_attempts,0)=0
      AND length(btrim(coalesce(page.page_text,'')))<10;
    GET DIAGNOSTICS v_changed=ROW_COUNT;
    IF v_changed=1 THEN
      UPDATE nfcps_agent_ops.native_salvage_request SET
        state='recovered',finished_at=now(),text_characters=length(v_text),
        evidence=jsonb_build_object('source','verified original PDF native extraction',
         'original_text_retained',true,'academic_audit_passed',false,
         'layout_protocol',6,'images_untouched',true)
      WHERE source_page_id=r.source_page_id;
      n_recovered:=n_recovered+1;
    ELSE
      UPDATE nfcps_agent_ops.native_salvage_request SET
        state='lost_race',finished_at=now(),evidence=jsonb_build_object(
         'reason','PAGE_NO_LONGER_ELIGIBLE_NO_WRITE')
      WHERE source_page_id=r.source_page_id;
      n_rejected:=n_rejected+1;
    END IF;
  ELSE
    UPDATE nfcps_agent_ops.native_salvage_request SET
      state=CASE WHEN r.status_code=200 THEN 'unsafe_source' ELSE 'http_failed' END,
      finished_at=now(),evidence=jsonb_build_object('reason',v_reason)
    WHERE source_page_id=r.source_page_id;
    n_rejected:=n_rejected+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('status','applied','responses_checked',n_checked,
   'source_text_recovered_without_paid_ocr',n_recovered,
   'rejected_or_raced',n_rejected,'marked_scientifically_verified',0);
END;$function$
;
