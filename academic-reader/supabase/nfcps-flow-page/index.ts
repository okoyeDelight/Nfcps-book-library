import * as mupdf from 'npm:mupdf@1.28.1';
import {rect,reconstructLines,classifyColumns,orderedEvents,imageCoverage,normalizeForCoverage} from './flow-layout.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2';
const U=Deno.env.get('SUPABASE_URL')!,K=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb=createClient(U,K,{auth:{persistSession:false,autoRefreshToken:false}});
const H={'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'content-type','cache-control':'public,max-age=300,stale-while-revalidate=60'};
const docs=new Map<string,{bytes:Uint8Array,at:number}>(),cache=new Map<string,any>();
const esc=(s:string)=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clean=(s:string)=>String(s||'').replace(/\t/g,' ').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const isMarker=(s:string)=>/^(?:y|○|◦|•|▪|�|[-–—])$/.test(clean(s));
async function bytesFor(url:string){
 const hit=docs.get(url);if(hit){hit.at=Date.now();return hit.bytes}
 const r=await fetch(url);if(!r.ok)throw new Error('PDF fetch '+r.status);
 const b=new Uint8Array(await r.arrayBuffer());docs.set(url,{bytes:b,at:Date.now()});
 if(docs.size>2){const old=[...docs.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];if(old&&old!==url)docs.delete(old)}
 return b;
}
function bbox(b:any){if(!b)return{x:0,y:0,w:0,h:0};if(Array.isArray(b))return{x:+b[0]||0,y:+b[1]||0,w:(+b[2]||0)-(+b[0]||0),h:(+b[3]||0)-(+b[1]||0)};return{x:+b.x||0,y:+b.y||0,w:+b.w||0,h:+b.h||0}}
function imageSources(html:string){return [...html.matchAll(/<img\b[^>]*\bsrc=(?:\"([^\"]+)\"|'([^']+)')[^>]*>/gi)].map(m=>m[1]||m[2]).filter(Boolean)}
function leavesFrom(j:any){const out:any[]=[];const walk=(x:any)=>{if(!x)return;if(Array.isArray(x)){x.forEach(walk);return}if(typeof x!=='object')return;if(x.type&&x.type!=='structure'&&x.type!=='grid')out.push(x);if(x.type==='structure'&&x.contents)walk(x.contents);else for(const [k,v] of Object.entries(x))if(k!=='image')walk(v)};walk(j);return out}
function linesFromTextLeaf(leaf:any,pageWidth:number){
 return reconstructLines(leaf.lines||[],pageWidth);
}
function isHeading(line:any,medianH:number){
 const t=line.text;if(!t||line.marker)return false;
 if(line.h>medianH*1.2&&t.length<120)return true;
 if(t.length<90&&t===t.toUpperCase()&&/[A-Z]/.test(t))return true;
 if(/^(previous year.?s? question|rack your brain|summary|objectives?|introduction|conclusion|references|acknowledg(e)?ments)$/i.test(t))return true;
 return false;
}
function mergeTextLines(lines:any[],medianH:number){
 const out:string[]=[];let para='',prev:any=null;
 const flush=()=>{if(para){out.push('<p>'+para+'</p>');para='';prev=null}};
 for(const line of lines){
  if(!line.text)continue;
  if(line.marker){flush();out.push('<p class="book-bullet"><span>•</span>'+line.html+'</p>');continue}
  if(isHeading(line,medianH)){flush();out.push('<h2>'+line.html+'</h2>');continue}
  const can=prev&&Math.abs(line.x-prev.x)<=24&&(line.y-(prev.y+prev.h))<=Math.max(9,medianH*.78);
  if(!can)flush();
  if(para){
    if(/[-–]$/.test(para))para=para.slice(0,-1)+line.html;
    else para+=' '+line.html;
  }else para=line.html;
  prev=line;
 }
 flush();return out.join('');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:H});
 try{
  const u=new URL(req.url),material=(u.searchParams.get('material')||'').trim(),pageNo=Math.max(1,Number(u.searchParams.get('page')||1)),version=(u.searchParams.get('v')||'').trim();
  if(!material)return new Response(JSON.stringify({error:'material required'}),{status:400,headers:H});
  const ck=material+':'+pageNo+':'+version+':layout3';const hit=cache.get(ck);if(hit)return new Response(JSON.stringify(hit),{headers:H});
  const {data:m,error}=await sb.from('nfcps_academic_materials').select('drive_id,title,polished_url,mime_type,course_code,course_label').eq('drive_id',material).maybeSingle();
  if(error)throw error;if(!m?.polished_url)return new Response(JSON.stringify({error:'material unavailable'}),{status:404,headers:H});
  const bytes=await bytesFor(m.polished_url),doc=mupdf.Document.openDocument(bytes,'application/pdf'),pages=doc.countPages();
  if(pageNo>pages){doc.destroy();return new Response(JSON.stringify({error:'page out of range',pages}),{status:400,headers:H})}
  const page=doc.loadPage(pageNo-1),bounds=page.getBounds(),pageW=Math.max(1,bounds[2]-bounds[0]),pageH=Math.max(1,bounds[3]-bounds[1]);
  const st=page.toStructuredText('preserve-images,preserve-spans,preserve-whitespace,collect-styles,segment,table-hunt');
  const j=JSON.parse(st.asJSON()),leaves=leavesFrom(j),imgs=imageSources(st.asHTML(pageNo));
  let imgIdx=0;const textLines:any[]=[],images:any[]=[];
  for(const leaf of leaves){
    const bb=bbox(leaf.bbox);
    if(leaf.type==='text'){
      const lines=linesFromTextLeaf(leaf,pageW);
      for(const line of lines){
        if(!line.text)continue;
        textLines.push({...line,blockBbox:bb});
      }
    }else if(leaf.type==='image'){
      const src=imgs[imgIdx++]||'';if(src)images.push({type:'image',bbox:bb,src});
    }
  }
  // The extractor must not discard legitimate footnotes, figure labels or
  // page-end content simply because it lies near the physical page boundary.
  // Make every embedded image discoverable even if MuPDF JSON and HTML omit
  // different image nodes.
  while(imgIdx<imgs.length){
    const src=imgs[imgIdx++];
    images.push({type:'image',bbox:{x:0,y:pageH*.99,w:pageW,h:1},src,unplaced:true});
  }
  const hs=textLines.map(x=>x.h).filter(Boolean).sort((a,b)=>a-b),medianH=hs.length?hs[Math.floor(hs.length/2)]:12;
  const columnCandidate=classifyColumns(textLines,pageW);
  const crossingImages=images.some(im=>
    columnCandidate.twoColumn &&
    im.bbox.x<pageW*.55 &&
    im.bbox.x+Math.max(im.bbox.w,0)>pageW*.45 &&
    im.bbox.y>columnCandidate.activeTop &&
    im.bbox.y<columnCandidate.activeBottom
  );
  const twoCol=columnCandidate.twoColumn&&!crossingImages;
  const imageHtml=(im:any)=>'<figure class="book-figure"><img loading="lazy" src="'+esc(im.src)+'" alt="Figure from '+esc(m.title)+'"></figure>';
  const renderRegion=(lines:any[],pictures:any[])=>{
    let html='',run:any[]=[];
    const flush=()=>{if(run.length){html+=mergeTextLines(run,medianH);run=[]}};
    for(const event of orderedEvents(lines,pictures)){
      if(event.type==='image'){flush();html+=imageHtml(event)}
      else run.push(event);
    }
    flush();
    return html;
  };
  let flowHtml='';
  if(twoCol){
    const cut=pageW*.5;
    const top=columnCandidate.spanning.filter(x=>x.y<=columnCandidate.activeTop);
    const bottom=columnCandidate.spanning.filter(x=>x.y>columnCandidate.activeTop);
    const leftImgs=images.filter(x=>x.bbox.x+Math.max(0,x.bbox.w)<=cut);
    const rightImgs=images.filter(x=>x.bbox.x>=cut);
    const centerImgs=images.filter(x=>!leftImgs.includes(x)&&!rightImgs.includes(x));
    flowHtml=renderRegion(top,centerImgs.filter(x=>x.bbox.y<=columnCandidate.activeTop))
       +renderRegion(columnCandidate.left,leftImgs)
       +renderRegion(columnCandidate.right,rightImgs)
       +renderRegion(bottom,centerImgs.filter(x=>x.bbox.y>columnCandidate.activeTop));
  }else {
    // Conservative visual source order for pages containing intertwined
    // columns, diagrams, labels and full-width explanatory text.
    flowHtml=renderRegion(textLines,images);
  }
  const {data:indexed}=await sb.from('nfcps_academic_page_index').select('page_text,ocr_status').eq('material_drive_id',material).eq('page_number',pageNo).maybeSingle();
  const plain=clean(textLines.map(x=>x.text).join(' ')),scanOnly=images.length>0&&textLines.length===0;
  // OCR is indexing evidence and may be faulty or out of reading order. For a
  // scanned page preserve the complete source visual rather than replacing it
  // with invented paragraphs; Study Lens can still consume OCR separately.
  if(scanOnly)flowHtml=images.map(imageHtml).join('');
  const imageAudit=imageCoverage(flowHtml,imgs.length);
  const sourceChars=normalizeForCoverage(st.asText()).length;
  const flowChars=normalizeForCoverage(plain).length;
  const ambiguousColumns=columnCandidate.left.length>=4&&columnCandidate.right.length>=4&&!twoCol;
  const needsReview=!imageAudit.complete||!!images.find(x=>x.unplaced)||ambiguousColumns||(!scanOnly&&sourceChars>40&&flowChars<sourceChars*.85);
  const slideDeck=String(m.mime_type||'').toLowerCase().includes('presentation')||/\.(ppt|pptx|pptm)$/i.test(String(m.title||''))||pageW/pageH>1.18;
  const payload={ok:true,material,title:m.title,page:pageNo,pages,layoutHint:slideDeck?'slides':'document',slideDeck,html:flowHtml,text:plain||clean(indexed?.page_text||''),imageCount:imgs.length,renderedImageCount:imageAudit.rendered,scanOnly,twoColumn:twoCol,needsVisualReview:needsReview,layoutVersion:3};
  st.destroy();page.destroy();doc.destroy();cache.set(ck,payload);if(cache.size>120){const first=cache.keys().next().value;if(first)cache.delete(first)}
  return new Response(JSON.stringify(payload),{headers:H});
 }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:{...H,'cache-control':'no-store'}})}
});