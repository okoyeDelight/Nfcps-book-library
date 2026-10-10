// Public, read-only, redacted Academic CEO status feed.
// No student submissions, names, secrets, meeting transcripts or worker payloads.
const H={"content-type":"application/json; charset=utf-8",
 "access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS",
 "cache-control":"public,max-age=20"};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
 if(req.method!=="GET")return new Response(JSON.stringify({error:"Read-only feed"}),{status:405,headers:H});
 try{
  const url=Deno.env.get("SUPABASE_URL")||"";
  const key=Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!url||!key)throw Error("Academic status service unavailable");
  const mode=new URL(req.url).searchParams.get("mode");
  if(mode==="proof"){
   const mat=new URL(req.url).searchParams.get("material")||"";
   if(mat&&!/^[A-Za-z0-9_-]{10,100}$/.test(mat))
     return new Response(JSON.stringify({ok:false,error:"Invalid material"}),{status:400,headers:H});
   const head=url.replace(/\\/$/,"")+
    "/rest/v1/nfcps_academic_work_receipts?select=source_kind,source_ref,level,material_drive_id,material_title,source_page,specialist_role,action_code,progress_state,evidence_page_index_id,evidence_at&order=evidence_at.desc&limit=25";
   const opts={headers:{"apikey":key,"authorization":"Bearer "+key},signal:AbortSignal.timeout(10000)};
   const [all,specific]=await Promise.all([
      fetch(head,opts),
      mat?fetch(head+"&material_drive_id=eq."+encodeURIComponent(mat),{headers:opts.headers,signal:AbortSignal.timeout(10000)}):Promise.resolve(null)]);
   if(!all.ok||(specific&&!specific.ok))throw Error("Academic evidence feed unavailable");
   const recent=await all.json(),inHandout=specific?await specific.json():[];
   return new Response(JSON.stringify({ok:true,source:"source-indexed Academic inspection evidence",
    recentActions:recent,forHandout:inHandout,refreshSeconds:60,
    important:"Detected and assigned issues are not verified repairs. Source page-count checks do not certify figure or scientific correctness.",
    fictionalActions:false}),{status:200,headers:H});
  }
  const target=url.replace(/\/$/,"")+
    "/rest/v1/nfcps_academic_ceo_feed?select=level,is_lead,performance_score,ready_handouts,indexed_handouts,verified_page_coverage,queued_tasks,board_decisions,last_meeting_at,last_updated_at&order=level.asc";
  const r=await fetch(target,{headers:{"apikey":key,"authorization":"Bearer "+key},
    signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error("Academic CEO read unavailable: "+r.status);
  const rows=await r.json();
  return new Response(JSON.stringify({
   ok:true,branches:Array.isArray(rows)?rows:[],source:"real Academic Board activity",
   fictionalMeeting:false,refreshSeconds:45,
   note:"Meeting times and counts reflect recorded Board operations; this is not a live video call."
  }),{status:200,headers:H});
 }catch(e){return new Response(JSON.stringify({ok:false,error:String(e instanceof Error?e.message:e)}),
   {status:503,headers:{...H,"cache-control":"no-store"}})}
});