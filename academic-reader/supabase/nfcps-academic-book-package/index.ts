import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
const U=Deno.env.get('SUPABASE_URL')!,K=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb=createClient(U,K,{auth:{persistSession:false,autoRefreshToken:false}});
const EXTRACT=U+'/functions/v1/nfcps-academic-extract';
const VISUAL='https://nfcps-academic-visual.onrender.com/page.jpg';
const cors={'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','cache-control':'public, max-age=300, stale-while-revalidate=86400','vary':'accept-encoding'};
const norm=(s:string)=>String(s||'').replace(/\s+/g,' ').trim();
function chunks(pages:any[]){
 const out:any[]=[];let cur:any={sourcePages:[],parts:[],chars:0};
 const push=()=>{if(!cur.parts.length)return;out.push({sourcePages:cur.sourcePages,text:cur.parts.join('\n\n'),visualHint:cur.visualHint||false,visualUrl:cur.visualUrl||'',visualOnly:false});cur={sourcePages:[],parts:[],chars:0}};
 for(const p of pages){
   const text=String(p.page_text||'').trim();
   if(text.length<40){
     push();
     out.push({sourcePages:[p.page_number],text:text,visualHint:true,visualOnly:true,visualUrl:p.visual_url||'',ocrStatus:p.ocr_status||'pending'});
     continue;
   }
   const small=text.length<420;
   if(cur.parts.length&&((!small&&cur.chars>700)||cur.chars+text.length>1750))push();
   cur.sourcePages.push(p.page_number);cur.parts.push(text);cur.chars+=text.length;
   if(p.visual_url&&!cur.visualUrl)cur.visualUrl=p.visual_url;
   if(p.visual_url)cur.visualHint=true;
   if(!small&&cur.chars>1050)push();
 }
 push();return out;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const u=new URL(req.url),material=(u.searchParams.get('material')||'').trim(),mode=(u.searchParams.get('mode')||'').trim(),pageNo=Math.max(0,Number(u.searchParams.get('page')||0));
 if(!material)return new Response(JSON.stringify({error:'material required'}),{status:400,headers:cors});

 const {data:m}=await sb.from('nfcps_academic_materials')
   .select('drive_id,title,mime_type,polish_kind,polished_url,course_code,course_label,level,semester,lecturer,updated_at,polished_at,metadata')
   .eq('drive_id',material).maybeSingle();
 if(!m)return new Response(JSON.stringify({error:'Material unavailable'}),{status:404,headers:cors});

 const {data:pages}=await sb.from('nfcps_academic_page_index')
   .select('page_number,heading,page_text,topics,indexed_at,visual_url,ocr_status,ocr_confidence')
   .eq('material_drive_id',material).order('page_number');

 const slideDeck=String(m.mime_type||'').toLowerCase().includes('presentation')||/\.(ppt|pptx)$/i.test(String(m.title||''))||/(^|[ _-])(slides?|ppt|presentation)([ _.-]|$)/i.test(String(m.title||''));
 let sourcePageCount=(pages||[]).length?Math.max(...(pages||[]).map((x:any)=>Number(x.page_number)||0)):Number(m.metadata?.source_page_count||0);
 let firstPageWidth=Number(m.metadata?.source_page_width||0),firstPageHeight=Number(m.metadata?.source_page_height||0);
 if(!sourcePageCount&&m.polished_url){
   try{
     const pr=await fetch(m.polished_url);
     if(pr.ok){
       const bytes=new Uint8Array(await pr.arrayBuffer());
       const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
       sourcePageCount=pdf.getPageCount();
       const first=sourcePageCount?pdf.getPage(0):null;
       firstPageWidth=first?.getWidth?.()||0;
       firstPageHeight=first?.getHeight?.()||0;
       const metadata={...(m.metadata||{}),source_page_count:sourcePageCount,source_page_width:firstPageWidth,source_page_height:firstPageHeight,source_page_counted_at:new Date().toISOString()};
       await sb.from('nfcps_academic_materials').update({metadata}).eq('drive_id',material);
     }
   }catch(_){}
 }
 const layoutHint=slideDeck||(firstPageWidth>0&&firstPageHeight>0&&firstPageWidth/firstPageHeight>1.18)?'slides':'document';

 if(!(pages||[]).length){
   const work=fetch(EXTRACT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({driveId:material})}).catch(()=>{});
   // @ts-ignore
   EdgeRuntime.waitUntil(work);
 }
 const pageCount=Math.max(1,sourcePageCount||0);
 const version=String(m.polished_at||m.updated_at||pages?.[pages.length-1]?.indexed_at||'1');
 const sourceVisualBase=m.polished_url ? (VISUAL+'?url='+encodeURIComponent(m.polished_url)+'&page=') : '';

 if(mode==='manifest'){
   return new Response(JSON.stringify({
     ready:true,material,version,
     title:m.title,courseCode:m.course_code||'',courseLabel:m.course_label||'',
     level:m.level||null,semester:m.semester||null,lecturer:m.lecturer||'',
     pageCount,sourcePageCount:pageCount,sourceVisualBase,layoutHint,slideDeck
   }),{headers:{...cors,'cache-control':'public, max-age=60, stale-while-revalidate=3600'}});
 }

 if(pageNo>0){
   const p=(pages||[]).find((x:any)=>Number(x.page_number)===pageNo)||null;
   if(pageNo>pageCount)return new Response(JSON.stringify({error:'Page unavailable',page:pageNo,pageCount}),{status:404,headers:cors});
   const dynamicVisual=sourceVisualBase ? sourceVisualBase+encodeURIComponent(String(pageNo)) : '';
   return new Response(JSON.stringify({
     ready:true,material,version,page:pageNo,pageCount,layoutHint,slideDeck,
     heading:p?.heading||'',text:p?.page_text||'',topics:p?.topics||[],
     ocrStatus:p?.ocr_status||'pending',ocrConfidence:p?.ocr_confidence??null,
     storedVisualUrl:p?.visual_url||'',visualUrl:dynamicVisual||p?.visual_url||''
   }),{headers:{...cors,'cache-control':'public, max-age=120, stale-while-revalidate=3600'}});
 }

 const sections=chunks(pages||[]);
 const payload={
   ready:true,material,version,
   title:m.title,courseCode:m.course_code||'',courseLabel:m.course_label||'',level:m.level||null,semester:m.semester||null,lecturer:m.lecturer||'',
   sourcePageCount:pageCount,pageCount,sourceVisualBase,layoutHint,slideDeck,
   sections:sections.map((x:any,i:number)=>({id:i+1,sourcePages:x.sourcePages,text:x.text,visualHint:Boolean(x.visualHint||x.visualOnly||x.text.length<520||x.sourcePages.length>1),visualOnly:Boolean(x.visualOnly),visualUrl:x.visualUrl||((x.visualOnly&&m.polished_url)?(VISUAL+'?url='+encodeURIComponent(m.polished_url)+'&page='+encodeURIComponent(String(x.sourcePages?.[0]||1))):''),ocrStatus:x.ocrStatus||''})),
   stats:{sections:sections.length,characters:sections.reduce((a:number,x:any)=>a+x.text.length,0)}
 };
 const json=new TextEncoder().encode(JSON.stringify(payload));
 const ae=req.headers.get('accept-encoding')||'';
 if(ae.includes('gzip')){
   const cs=new CompressionStream('gzip');
   const body=new Blob([json]).stream().pipeThrough(cs);
   return new Response(body,{headers:{...cors,'content-encoding':'gzip','etag':'W/"'+material+'-'+encodeURIComponent(version)+'"'}});
 }
 return new Response(json,{headers:{...cors,'etag':'W/"'+material+'-'+encodeURIComponent(version)+'"'}});
});