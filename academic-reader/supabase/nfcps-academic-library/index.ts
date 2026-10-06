import { createClient } from 'npm:@supabase/supabase-js@2';
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,OPTIONS'};
const out=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});
const POLISH=Deno.env.get('SUPABASE_URL')!+'/functions/v1/nfcps-academic-polish';
const STUDY=Deno.env.get('SUPABASE_URL')!+'/functions/v1/nfcps-study-reader';
const PAST=Deno.env.get('SUPABASE_URL')!+'/functions/v1/nfcps-past-question-browser';
const FOLDER=Deno.env.get('SUPABASE_URL')!+'/functions/v1/nfcps-academic-folder';
const BOOK_PACKAGE=Deno.env.get('SUPABASE_URL')!+'/functions/v1/nfcps-academic-book-package';
const STUDY_LENS=Deno.env.get('SUPABASE_URL')!+'/functions/v1/nfcps-study-lens';
const bookDataUrl=(r:any)=>{
 const material=JSON.stringify(String(r.drive_id||''));
 const course=JSON.stringify(String(r.course_code||r.course_label||''));
 const title=String(r.title||'Academic material').replace(/[<>&]/g,(c:string)=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]||c));
 const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden}body{background:#f5f0e5;color:#2b2824;font-family:Georgia,serif}.dark{background:#101217;color:#f3f3ef}.prep{position:fixed;inset:0;display:grid;place-items:center;background:inherit;z-index:5;transition:.2s}.prep.hide{opacity:0;pointer-events:none}.prep div{text-align:center;font-family:system-ui}.prep b{display:block;font-size:21px}.prep span{display:block;color:#8b8378;margin-top:7px;font-size:13px}.book{height:100%;position:relative}.vp{height:100%;overflow:auto;padding:36px 28px 115px}.ch{max-width:720px;margin:auto}.k{font:800 10px system-ui;letter-spacing:.12em;text-transform:uppercase;color:#4668e8;margin-bottom:13px}.ch h1{font:800 27px/1.2 system-ui;margin:0 0 20px}.body{font-size:21px;line-height:1.72}.body p{margin:0 0 .9em}.nav{position:fixed;top:48%;width:42px;height:58px;border:0;background:transparent;color:#aaa296;font-size:38px;z-index:2}.prev{left:2px}.next{right:2px}.tools{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);height:52px;border:1px solid #ddd4c7;border-radius:999px;background:#fffdf7;padding:0 18px;font:700 14px system-ui;box-shadow:0 10px 30px #0002;z-index:3}.dark .tools{background:#191c23;color:#f3f3ef;border-color:#2d323c}.sheet{position:fixed;left:10px;right:10px;bottom:10px;max-height:72%;overflow:auto;background:#fffdf7;border-radius:22px;padding:14px;box-shadow:0 16px 50px #0004;z-index:10;font-family:system-ui;display:none}.dark .sheet{background:#191c23}.sheet.open{display:block}.tabs{display:flex;gap:6px;overflow:auto;margin-bottom:12px}.tabs button,.seg button{border:0;border-radius:999px;padding:8px 10px;background:#00000010;color:inherit;font-weight:800}.tabs .a{background:#4668e8;color:#fff}.card{border:1px solid #ddd4c7;border-radius:14px;padding:11px;margin:8px 0;font-size:13px;line-height:1.5}.dark .card{border-color:#2d323c}.ask{width:100%;min-height:84px;border:1px solid #ddd4c7;border-radius:12px;padding:10px;background:inherit;color:inherit}.go{margin-top:8px;border:0;border-radius:10px;background:#4668e8;color:white;padding:10px 13px;font-weight:800}.bar{position:fixed;left:0;top:0;height:2px;background:#4668e8;z-index:4}
</style></head><body><div class="prep" id="prep"><div><b>Preparing your copy</b><span>This should only take a moment…</span></div></div><div class="bar" id="bar"></div><main class="book"><div class="vp" id="vp"><article class="ch" id="ch"></article></div><button class="nav prev" id="prev">‹</button><button class="nav next" id="next">›</button><button class="tools" id="tools">Reading tools</button></main><section class="sheet" id="sheet"><div class="tabs"><button data-t="reader" class="a">Reader</button><button data-t="understand">Understand</button><button data-t="ask">Ask</button><button data-t="exam">Exam</button><button data-t="recall">Recall</button></div><div id="panel"></div></section><script>
const M=${material},C=${course},PKG=${JSON.stringify(BOOK_PACKAGE)},LENS=${JSON.stringify(STUDY_LENS)};let B=null,P=[],i=0,study=null,tab='reader';const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function textHtml(s){return String(s||'').split(/\\n+/).map(x=>x.trim()).filter(Boolean).map((x,n)=>n===0&&x.length<95?'<h1>'+esc(x)+'</h1>':'<p>'+esc(x.replace(/^[•●▪◦*-]\\s*/,''))+'</p>').join('')}
function render(){const p=P[i]||{sourcePages:[1],text:''},sp=p.sourcePages||[1];q('#ch').innerHTML='<div class="k">'+esc(B.courseCode||B.courseLabel||'Academic')+' · '+(sp.length>1?'Source pages '+sp[0]+'–'+sp[sp.length-1]:'Source page '+sp[0])+'</div><div class="body">'+textHtml(p.text)+'</div>';q('#prev').disabled=i===0;q('#next').disabled=i>=P.length-1;q('#bar').style.width=((i+1)/Math.max(1,P.length)*100)+'%';q('#vp').scrollTop=0;study=null}
function go(n){if(n>=0&&n<P.length){i=n;render()}}q('#prev').onclick=()=>go(i-1);q('#next').onclick=()=>go(i+1);let sx=0,sy=0;q('#vp').ontouchstart=e=>{sx=e.changedTouches[0].clientX;sy=e.changedTouches[0].clientY};q('#vp').ontouchend=e=>{const x=e.changedTouches[0].clientX-sx,y=e.changedTouches[0].clientY-sy;if(Math.abs(x)>65&&Math.abs(x)>Math.abs(y)*1.2)go(i+(x<0?1:-1))};
q('#tools').onclick=()=>{q('#sheet').classList.toggle('open');show('reader')};document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>show(b.dataset.t));
function show(t){tab=t;document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('a',b.dataset.t===t));const p=q('#panel');if(t==='reader'){p.innerHTML='<div class="seg"><button id="sm">A−</button> <button id="lg">A＋</button> <button id="th">Cream/Dark</button></div>';q('#sm').onclick=()=>size(-1);q('#lg').onclick=()=>size(1);q('#th').onclick=()=>document.body.classList.toggle('dark');return}if(t==='ask'){p.innerHTML='<textarea class="ask" id="aq" placeholder="Ask anything from this handout…"></textarea><button class="go" id="ag">Ask</button><div id="ar"></div>';q('#ag').onclick=ask;return}loadStudy()}
function size(d){const el=q('.body'),n=parseFloat(getComputedStyle(el).fontSize)||21;el.style.fontSize=Math.max(16,Math.min(31,n+d))+'px'}
async function loadStudy(){const p=P[i]||{sourcePages:[1],text:''};q('#panel').innerHTML='<div class="card">Reading this section…</div>';try{const r=await fetch(LENS,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'study',materialId:M,page:p.sourcePages?.[0]||1,courseCode:C,pageText:p.text})});study=await r.json()}catch{study={guide:{},pastQuestions:[],predictions:[]}}const g=study.guide||{};if(tab==='understand')q('#panel').innerHTML='<div class="card"><b>'+esc(g.primaryTopic||g.heading||'Current section')+'</b><br>'+esc((g.focusPoints||[]).join(' • '))+'</div>';else if(tab==='exam')q('#panel').innerHTML=(study.pastQuestions||[]).map(x=>'<div class="card"><b>Actual past question</b><br>'+esc(x.question)+'</div>').join('')+(study.predictions||[]).map(x=>'<div class="card"><b>Likely question</b><br>'+esc(x.question)+'</div>').join('')||'<div class="card">No strong exam match yet.</div>';else if(tab==='recall')q('#panel').innerHTML='<div class="card">Without looking back, explain '+esc((g.keyTerms||[])[0]||'the main idea')+'.</div>'}
async function ask(){const x=q('#aq').value.trim();if(!x)return;q('#ar').innerHTML='<div class="card">Searching the handout…</div>';const p=P[i]||{sourcePages:[1],text:''};try{const r=await fetch(LENS,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'ask',materialId:M,page:p.sourcePages?.[0]||1,courseCode:C,question:x,pageText:p.text})});const d=await r.json();q('#ar').innerHTML='<div class="card">'+esc(d.answer||d.error||'No answer found.')+'</div>'}catch{q('#ar').innerHTML='<div class="card">Could not answer right now.</div>'}}
(async()=>{for(let n=0;n<8;n++){try{const r=await fetch(PKG+'?material='+encodeURIComponent(M),{cache:'no-store'});const d=await r.json();if(d.ready){B=d;P=d.sections||[];render();q('#prep').classList.add('hide');return}}catch{}await new Promise(r=>setTimeout(r,450))}q('#prep').innerHTML='<div><b>Still preparing</b><span>Try opening this material again shortly.</span></div>'})();
</script></body></html>`;
 return 'data:text/html;charset=utf-8,'+encodeURIComponent(html);
};
const map=(r:any)=>{
 const internalUrl=r.item_type==='folder'?(FOLDER+'?folder='+encodeURIComponent(r.drive_id)):bookDataUrl(r);
 return ({
 id:r.drive_id,title:r.title,mimeType:r.mime_type,type:r.item_type,url:internalUrl,
 previewUrl:internalUrl,
 downloadUrl:'',
 originalDownloadUrl:'',
 polishedUrl:r.polished_url||'',
 polishStatus:r.polish_status||'pending',
 polishKind:r.polish_kind||'',
 section:r.source_section,level:r.level,semester:r.semester,courseCode:r.course_code,
 courseLabel:r.course_label,lecturer:r.lecturer||'',department:r.department,
 parentDriveId:r.parent_drive_id,size:r.size_bytes||0,rightsStatus:r.rights_status
 });
};
const queue=(rows:any[])=>{
 const ids=(rows||[]).filter(r=>r.item_type==='file'&&r.rights_status==='provided'&&r.polish_status!=='ready'&&r.polish_status!=='processing').slice(0,3).map(r=>r.drive_id);
 if(!ids.length)return;
 const work=(async()=>{for(const driveId of ids){try{await fetch(POLISH,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({driveId})})}catch(e){console.error('polish queue',driveId,e)}}})();
 // @ts-ignore Supabase Edge Runtime global
 EdgeRuntime.waitUntil(work);
};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='GET')return out({error:'Method not allowed'},405);
 const u=new URL(req.url),mode=u.searchParams.get('mode')||'levels';
 try{
  if(mode==='levels'){
   const {data,error}=await sb.from('nfcps_academic_materials').select('level,semester,drive_id,item_type').eq('source_section','handouts').not('level','is',null);if(error)throw error;
   const levels:any={};for(const r of data||[]){const k=String(r.level);levels[k]??={level:r.level,items:0,folders:0,semesters:new Set()};levels[k].items++;if(r.item_type==='folder')levels[k].folders++;levels[k].semesters.add(r.semester)}
   return out({levels:Object.values(levels).map((x:any)=>({...x,semesters:[...x.semesters].filter(Boolean).sort()})).sort((a:any,b:any)=>a.level-b.level)});
  }
  if(mode==='courses'){
   const level=Number(u.searchParams.get('level')||0),semester=Number(u.searchParams.get('semester')||0);
   let q=sb.from('nfcps_academic_materials').select('course_code,course_label,parent_drive_id,drive_id,item_type').eq('source_section','handouts').eq('level',level);if(semester)q=q.eq('semester',semester);
   const {data,error}=await q;if(error)throw error;
   const courses:any={};for(const r of data||[]){const k=r.course_label||r.course_code;if(!k)continue;courses[k]??={courseCode:r.course_code,courseLabel:r.course_label||r.course_code,folderId:r.parent_drive_id,total:0,files:0,folders:0};courses[k].total++;if(r.item_type==='file')courses[k].files++;else courses[k].folders++}
   if(level===200){const {count}=await sb.from('nfcps_past_question_sources').select('*',{count:'exact',head:true}).eq('level',200).neq('source_status','duplicate');if((count||0)>0)courses['__past_questions']={courseCode:'PAST QUESTIONS',courseLabel:'Past Questions',folderId:'__past_questions__',total:count||0,files:count||0,folders:0}}
   return out({level,semester,courses:Object.values(courses).sort((a:any,b:any)=>String(a.courseLabel).localeCompare(String(b.courseLabel)))});
  }
  if(mode==='materials'){
   const level=Number(u.searchParams.get('level')||0),semester=Number(u.searchParams.get('semester')||0),course=(u.searchParams.get('course')||'').trim();
   if(course==='Past Questions'){let pq=sb.from('nfcps_past_question_sources').select('drive_id,title,department,level,source_url,page_count,source_status').neq('source_status','duplicate');if(level)pq=pq.eq('level',level);const {data:pd,error:pe}=await pq.order('department').order('title');if(pe)throw pe;return out({level,semester,course,folderId:'__past_questions__',folderEmbed:'',materials:(pd||[]).map((x:any)=>({id:'pq:'+x.drive_id,title:x.title,mimeType:'application/pdf',type:'file',url:PAST+'?source='+encodeURIComponent(x.drive_id),previewUrl:PAST+'?source='+encodeURIComponent(x.drive_id),downloadUrl:'',originalDownloadUrl:'',polishedUrl:'',polishStatus:'ready',polishKind:'past-question-index',section:'past-questions',level:x.level,semester:0,courseCode:x.department||'PAST',courseLabel:'Past Questions',lecturer:'',department:x.department||'',parentDriveId:'',size:0,rightsStatus:'provided'}))})}
   let q=sb.from('nfcps_academic_materials').select('*').eq('source_section','handouts').eq('level',level);if(semester)q=q.eq('semester',semester);if(course)q=q.eq('course_label',course);
   const {data,error}=await q.order('item_type',{ascending:false}).order('title',{ascending:true});if(error)throw error;
   const candidates=(data||[]).filter((r:any)=>r.item_type==='file').filter((r:any)=>r.polish_status!=='failed'||Number(r.size_bytes||0)>0);
   const chosen=new Map<string,any>();
   const rank=(r:any)=>(r.item_type==='folder'?10:(r.polish_status==='ready'&&r.polished_url?8:r.polish_status==='processing'?5:r.polish_status==='pending'?4:1))+(Number(r.size_bytes||0)>0?1:0);
   for(const r of candidates){
     const key=String(r.item_type||'')+'|'+String(r.title||'').trim().toLowerCase();
     const prev=chosen.get(key);if(!prev||rank(r)>rank(prev))chosen.set(key,r);
   }
   const rows=[...chosen.values()].sort((a:any,b:any)=>String(a.title||'').localeCompare(String(b.title||'')));
   queue(rows);
   const folderId=(rows||[])[0]?.parent_drive_id||'';
   return out({level,semester,course,folderId,folderEmbed:'',materials:rows.map(map)});
  }
  if(mode==='folder'){
   const folderId=(u.searchParams.get('folder')||'').trim();
   if(!folderId)return out({error:'folder required'},400);
   const {data,error}=await sb.from('nfcps_academic_materials').select('*').eq('parent_drive_id',folderId).order('item_type',{ascending:false}).order('title',{ascending:true});
   if(error)throw error;
   const candidates=(data||[]).filter((r:any)=>r.item_type==='folder'||r.polish_status!=='failed'||Number(r.size_bytes||0)>0);
   const chosen=new Map<string,any>();
   const rank=(r:any)=>(r.item_type==='folder'?10:(r.polish_status==='ready'&&r.polished_url?8:r.polish_status==='processing'?5:r.polish_status==='pending'?4:1))+(Number(r.size_bytes||0)>0?1:0);
   for(const r of candidates){
     const key=String(r.item_type||'')+'|'+String(r.title||'').trim().toLowerCase();
     const prev=chosen.get(key);if(!prev||rank(r)>rank(prev))chosen.set(key,r);
   }
   const rows=[...chosen.values()].sort((a:any,b:any)=>String(a.title||'').localeCompare(String(b.title||'')));
   queue(rows);
   return out({folderId,materials:rows.map(map)});
  }
  if(mode==='search'){
   const query=(u.searchParams.get('q')||'').trim().slice(0,120);if(!query)return out({materials:[]});const safe=query.replace(/[%_,]/g,' ').trim();
   const filter='title.ilike.%'+safe+'%,course_code.ilike.%'+safe+'%,course_label.ilike.%'+safe+'%,lecturer.ilike.%'+safe+'%';
   const {data,error}=await sb.from('nfcps_academic_materials').select('*').or(filter).eq('source_section','handouts').limit(80);if(error)throw error;
   const chosen=new Map<string,any>();
   const rank=(r:any)=>(r.item_type==='folder'?10:(r.polish_status==='ready'&&r.polished_url?8:r.polish_status==='processing'?5:r.polish_status==='pending'?4:1))+(Number(r.size_bytes||0)>0?1:0);
   for(const r of (data||[]).filter((x:any)=>x.item_type==='file')){const key=String(r.item_type||'')+'|'+String(r.title||'').trim().toLowerCase();const prev=chosen.get(key);if(!prev||rank(r)>rank(prev))chosen.set(key,r)}
   const rows=[...chosen.values()];
   queue(rows);
   return out({materials:rows.map(map)});
  }
  return out({error:'Unknown mode'},404);
 }catch(e){console.error(e);return out({error:'Academic library unavailable'},500)}
});