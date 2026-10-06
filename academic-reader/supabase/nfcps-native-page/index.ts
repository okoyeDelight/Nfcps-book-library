import * as mupdf from 'npm:mupdf@1.28.1';
import { createClient } from 'npm:@supabase/supabase-js@2';

const U=Deno.env.get('SUPABASE_URL')!,K=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb=createClient(U,K,{auth:{persistSession:false,autoRefreshToken:false}});
const H={'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=31536000, immutable','access-control-allow-origin':'*','access-control-allow-headers':'content-type'};
const docs=new Map<string,{bytes:Uint8Array,at:number}>();
const pageCache=new Map<string,any>();

function cleanHtml(html:string){
  let s=html;
  s=s.replace(/<span([^>]*font-family:Wingdings2[^>]*)>y<\/span>/gi,'<span$1>•</span>');
  s=s.replace(/<span([^>]*font-family:Wingdings2[^>]*)>(?:&#xfffd;|�)<\/span>/gi,'<span$1>▪</span>');
  s=s.replace(/<span([^>]*)>&#x9;<\/span>/gi,'');
  s=s.replace(/font-family:WorkSans,serif/gi,'font-family:system-ui,sans-serif');
  s=s.replace(/font-family:Arial[^;"]*/gi,'font-family:Arial,sans-serif');
  s=s.replace(/font-family:Calibri[^;"]*/gi,'font-family:Calibri,Arial,sans-serif');
  return s;
}
async function bytesFor(url:string){
  const hit=docs.get(url);if(hit){hit.at=Date.now();return hit.bytes}
  const r=await fetch(url);if(!r.ok)throw new Error('PDF fetch '+r.status);
  const b=new Uint8Array(await r.arrayBuffer());
  docs.set(url,{bytes:b,at:Date.now()});
  if(docs.size>2){
    const old=[...docs.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];
    if(old&&old!==url)docs.delete(old);
  }
  return b;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:H});
 try{
  const u=new URL(req.url),material=(u.searchParams.get('material')||'').trim(),pageNo=Math.max(1,Number(u.searchParams.get('page')||1)),version=(u.searchParams.get('v')||'').trim();
  if(!material)return new Response(JSON.stringify({error:'material required'}),{status:400,headers:H});
  const key=material+':'+pageNo+':'+version;const cached=pageCache.get(key);if(cached)return new Response(JSON.stringify(cached),{headers:H});
  const {data:m,error}=await sb.from('nfcps_academic_materials').select('drive_id,title,polished_url,mime_type,polish_kind,metadata,course_code,course_label').eq('drive_id',material).maybeSingle();
  if(error)throw error;if(!m?.polished_url)return new Response(JSON.stringify({error:'material unavailable'}),{status:404,headers:H});
  const bytes=await bytesFor(m.polished_url);
  const doc=mupdf.Document.openDocument(bytes,'application/pdf');
  const pages=doc.countPages();if(pageNo>pages){doc.destroy();return new Response(JSON.stringify({error:'page out of range',pages}),{status:400,headers:H})}
  const page=doc.loadPage(pageNo-1),bounds=page.getBounds(),width=Math.max(1,bounds[2]-bounds[0]),height=Math.max(1,bounds[3]-bounds[1]);
  const st=page.toStructuredText('preserve-images,preserve-spans,preserve-whitespace,collect-styles,segment,table-hunt,vectors,structured');
  let html=cleanHtml(st.asHTML(pageNo));
  const plain=st.asText().replace(/\t+/g,' ').replace(/[ ]+\n/g,'\n').trim();
  const slideDeck=String(m.mime_type||'').toLowerCase().includes('presentation')||/\.(ppt|pptx|pptm)$/i.test(String(m.title||''))||/(^|[ _-])(slides?|ppt|presentation)([ _.-]|$)/i.test(String(m.title||''))||width/height>1.18;
  const payload={ok:true,material,title:m.title,page:pageNo,pages,width,height,ratio:width/height,layoutHint:slideDeck?'slides':'document',slideDeck,html,text:plain,hasText:plain.length>10};
  st.destroy();page.destroy();doc.destroy();
  pageCache.set(key,payload);
  if(pageCache.size>80){const first=pageCache.keys().next().value;if(first)pageCache.delete(first)}
  return new Response(JSON.stringify(payload),{headers:H});
 }catch(e){
  return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:{...H,'cache-control':'no-store'}})
 }
});