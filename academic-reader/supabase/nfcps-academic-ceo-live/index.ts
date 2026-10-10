// Retired public Academic CEO endpoint.
// All Academic Agent Company meetings, task inspections, quality audits and
// independent repair records remain private in Supabase. Students see improved
// Academic materials and tools, never CEO/Board or work-log dashboards.
const headers={"content-type":"application/json; charset=utf-8",
"access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS",
"cache-control":"no-store"};
Deno.serve(req=>req.method==="OPTIONS"
 ?new Response(null,{status:204,headers})
 :new Response(JSON.stringify({error:"Private Academic operations are not a public app feature."}),
    {status:410,headers}));