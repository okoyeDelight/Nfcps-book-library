import { createClient } from 'npm:@supabase/supabase-js@2';

const sb=createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {auth:{persistSession:false,autoRefreshToken:false}}
);

const cors={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type, authorization',
  'access-control-allow-methods':'GET,POST,OPTIONS'
};
const out=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});

const STOP=new Set([
 'this','that','with','from','into','were','been','being','have','has','had','will','would','could','should',
 'what','when','where','which','while','whose','there','their','they','them','then','than','also','such','these',
 'those','about','between','through','during','under','over','after','before','because','used','using','use','uses',
 'page','figure','table','lecture','note','notes','student','students','course','section','question','questions',
 'define','describe','discuss','explain','state','list','write','following','given','according','including','include',
 'into','onto','upon','each','both','more','most','some','many','much','very','only','same','other','another',
 'and','the','for','are','was','is','of','to','in','on','at','a','an','or','as','by','be','it','its','can','may','contain','contains','containing','present','presents','important','importance','common','major','main',
 'does','did','do','all','not','than','these','those','their','our','your','his','her','its'
]);

const normalize=(s:string)=>String(s||'').replace(/\s+/g,' ').trim();
function toks(s:string){
 const m=normalize(s).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[];
 return m.filter(x=>x.length>2&&!STOP.has(x));
}
function keywords(s:string,limit=18){
 const f=new Map<string,number>();
 for(const t of toks(s))f.set(t,(f.get(t)||0)+1);
 return [...f.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).slice(0,limit).map(x=>x[0]);
}
function sentenceList(s:string){
 return normalize(s).split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>25);
}
function phraseCandidates(s:string,limit=10){
 const raw=normalize(s).toLowerCase().match(/[a-z][a-z0-9-]*/g)||[];
 const good=raw.map(x=>STOP.has(x)?'':x);
 const counts=new Map<string,number>();
 for(let n=3;n>=2;n--){
  for(let i=0;i<=good.length-n;i++){
   const part=good.slice(i,i+n);
   if(part.some(x=>!x)||part.every(x=>x.length<4))continue;
   const p=part.join(' ');
   counts.set(p,(counts.get(p)||0)+1);
  }
 }
 const singles=keywords(s,12);
 const phrases=[...counts.entries()]
  .sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length)
  .filter(([p])=>!/^introduction|continued|classification$/.test(p))
  .slice(0,limit)
  .map(([p])=>p);
 for(const x of singles)if(!phrases.some(p=>p.includes(x)))phrases.push(x);
 return phrases.slice(0,limit);
}
function pageGuide(pageText:string){
 const clean=normalize(pageText);
 const lines=String(pageText||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const heading=lines.find(x=>x.length>=4&&x.length<=100&&!/[.!?]$/.test(x))||lines[0]||'Current page';
 const keyTerms=phraseCandidates(clean,10);
 const opening=clean.slice(0,180).toLowerCase();
 const primaryTopic=keyTerms.find((t:string)=>t.includes(' ')&&opening.indexOf(t)>=0&&opening.indexOf(t)<80)||keyTerms[0]||heading;
 const ss=sentenceList(clean);
 const keyWords=keywords(clean,14);
 const focus:string[]=[];
 for(const s of ss){
  if(focus.length>=5)break;
  const low=s.toLowerCase();
  if(keyWords.some(k=>low.includes(k)))focus.push(s);
 }
 if(!focus.length)focus.push(...ss.slice(0,5));
 return {heading,primaryTopic,keyTerms,focusPoints:focus.slice(0,5),sourceGrounded:true};
}

function questionStyle(text:string){
 const q=String(text||'').toLowerCase();
 if(/\b(true|false)\b/.test(q))return 'truefalse';
 if(/which of|all of the following|except\b|select the|choose the/.test(q))return 'mcq';
 if(/differentiate|distinguish|compare|difference between/.test(q))return 'compare';
 if(/mechanism|how does|how do|mode of action|pathway/.test(q))return 'mechanism';
 if(/list|enumerate|mention|name\b|state\b/.test(q))return 'list';
 if(/define|what is|what are/.test(q))return 'define';
 if(/short note|write on/.test(q))return 'shortnote';
 if(/why|reason|advantage|disadvantage|importance|significance|use[s]?\b|application/.test(q))return 'application';
 if(/explain|describe|discuss/.test(q))return 'explain';
 return 'identify';
}
function scoreQuestion(q:any,keyList:string[],pageText:string,courseCode:string){
 const qt=String(q.question_text||'').toLowerCase();
 const tp=Array.isArray(q.topics)?q.topics.join(' ').toLowerCase():'';
 const page=pageText.toLowerCase();
 const qCourse=String(q.course_code||'').toUpperCase();
 const dept=(courseCode||'').trim().split(/\s+/)[0].toUpperCase();
 const qDept=String(q.department||'').toUpperCase();
 const sameCourse=!!courseCode&&qCourse===courseCode.toUpperCase();
 const sameDept=!sameCourse&&!!dept&&qDept===dept;

 let score=0,tokenHits=0,phraseHits=0;
 const pageTokens=new Set(keywords(pageText,28));
 const qTokens=new Set([...keywords(q.question_text||'',24),...keywords(tp,18)]);

 for(const k of keyList){
  const key=String(k||'').toLowerCase().trim();
  if(key.length<3)continue;
  const isPhrase=key.includes(' ');
  if(isPhrase&&(qt.includes(key)||tp.includes(key))){
   phraseHits++;score+=10;
  }
 }
 for(const k of pageTokens){
  if(qTokens.has(k)){tokenHits++;score+=3}
 }
 if(sameCourse)score+=12;
 else if(sameDept)score+=4;

 // Cross-course matches need genuine topical overlap.
 if(!sameCourse&&!sameDept&&phraseHits===0&&tokenHits<2)return 0;
 // Same-department matches still need at least one topic signal.
 if(sameDept&&phraseHits===0&&tokenHits<1)return 0;
 // Even same-course questions should not surface with no content overlap at all.
 if(sameCourse&&phraseHits===0&&tokenHits<1)return 0;

 return score;
}
function buildPredictions(pageText:string,guide:any,related:any[]){
 const topics=(guide.keyTerms||[]).filter((x:string)=>x.length>3).slice(0,6);
 const focus=(guide.focusPoints||[]).filter(Boolean);
 if(!topics.length&&!focus.length)return [];
 const styleCounts=new Map<string,number>();
 for(const q of related){
  const s=questionStyle(q.question_text);
  styleCounts.set(s,(styleCounts.get(s)||0)+1);
 }
 const rankedStyles=[...styleCounts.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 const defaults=['explain','list','define','shortnote','mcq','truefalse','application','compare'];
 for(const s of defaults)if(!rankedStyles.includes(s))rankedStyles.push(s);
 const primary=guide.primaryTopic||topics[0]||guide.heading||'the main topic';
 const secondary=topics[1]||'';
 const tertiary=topics[2]||'';
 const rows:any[]=[];
 const seen=new Set<string>();
 const add=(type:string,question:string)=>{
  const q=normalize(question); if(!q||seen.has(q.toLowerCase()))return;
  seen.add(q.toLowerCase());
  const count=styleCounts.get(type)||0;
  const strongActual=related.filter(x=>x._score>=9).length;
  rows.push({
   kind:'prediction',
   type,
   question:q,
   confidence:count>=2&&strongActual?'high':count>=1?'medium':'exploratory',
   patternCount:count,
   reason:count?('This '+type+' pattern appears '+count+' time'+(count===1?'':'s')+' in topically related indexed past questions.'):'A common exam form generated from the concepts on this page.',
   basedOnPage:true
  });
 };
 for(const type of rankedStyles){
  if(rows.length>=8)break;
  if(type==='define')add(type,'Define '+primary+' and state its important features as presented in the handout.');
  else if(type==='list')add(type,'List the key points, features or classifications of '+primary+' presented on this page.');
  else if(type==='explain')add(type,'Explain '+primary+' using the points given on this page.');
  else if(type==='shortnote')add(type,'Write a short note on '+primary+'.');
  else if(type==='compare'&&secondary)add(type,'Differentiate between '+primary+' and '+secondary+' using the handout.');
  else if(type==='mechanism')add(type,'Explain the mechanism or sequence involving '+primary+' described on this page.');
  else if(type==='application')add(type,'State the significance, uses or applications of '+primary+' discussed on this page.');
  else if(type==='identify')add(type,'Identify '+primary+' and state two important facts about it.');
  else if(type==='mcq')add(type,'Which statement about '+primary+' is correct according to this page?');
  else if(type==='truefalse'&&focus[0])add(type,'True or false: '+focus[0]);
 }
 if(secondary&&rows.length<8)add('explain','Explain the relationship between '+primary+' and '+secondary+'.');
 if(tertiary&&rows.length<8)add('list','State the important facts about '+tertiary+' that a student should remember for an exam.');
 return rows.slice(0,8);
}

function evidenceScore(sentence:string,query:string,page:number,currentPage:number){
 const st=sentence.toLowerCase(),qk=keywords(query,12);
 let score=page===currentPage?3:0;
 for(const k of qk)if(st.includes(k))score+=4;
 const q=query.toLowerCase();
 if(/\bwhy\b|reason|cause/.test(q)&&/because|due to|therefore|result|reason|cause/.test(st))score+=3;
 if(/\bhow\b|mechanism|process/.test(q)&&/first|then|through|by |during|convert|produce|form|result/.test(st))score+=2;
 if(/define|what is|what are/.test(q)&&/\bis\b|\bare\b|refers to|defined as|consists of/.test(st))score+=2;
 if(/list|mention|state|name/.test(q)&&/include|following|classified|types|examples|such as/.test(st))score+=2;
 return score;
}
function answerFromContexts(query:string,contexts:any[],currentPage:number){
 const q=normalize(query);
 const pool:any[]=[];
 for(const c of contexts||[]){
  const page=Math.max(1,Number(c?.page||currentPage));
  for(const s of sentenceList(String(c?.text||''))){
   const score=evidenceScore(s,q,page,currentPage);
   if(score>0)pool.push({page,text:s,score});
  }
 }
 pool.sort((a,b)=>b.score-a.score||a.page-b.page);
 const picked:any[]=[];
 const seen=new Set<string>();
 for(const r of pool){
  const key=r.text.toLowerCase();
  if(seen.has(key))continue;
  seen.add(key);picked.push(r);
  if(picked.length>=4)break;
 }
 if(!picked.length)return {supported:false,answer:'I cannot answer that reliably from the readable text in this handout yet.',evidence:[]};
 const qlow=q.toLowerCase();
 let answer='';
 if(/summari|what.*page.*about|main idea/.test(qlow)){
  answer=picked.slice(0,3).map(x=>x.text).join(' ');
 }else if(/list|mention|state|name/.test(qlow)){
  answer=picked.slice(0,4).map(x=>x.text).join(' ');
 }else{
  answer=picked.slice(0,2).map(x=>x.text).join(' ');
 }
 return {supported:true,answer,evidence:picked.slice(0,4).map(x=>({page:x.page,text:x.text,score:x.score}))};
}

async function fetchBank(){
 const {data,error}=await sb.from('nfcps_past_questions')
  .select('id,source_drive_id,page_number,question_number,question_text,options,marked_answer,department,course_code,level,exam_year,topics,confidence')
  .limit(1000);
 if(error)throw error;
 return data||[];
}
function questionFingerprint(s:string){
 return normalize(s).toLowerCase()
  .replace(/\b(question|true|false|write|discuss|explain|state|list|mention|define|differentiate|compare|briefly|short notes?|using a matrix)\b/g,' ')
  .replace(/[^a-z0-9]+/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}
async function rankBank(pageText:string,courseCode:string,guide:any){
 const bank=await fetchBank();
 const keys=[...new Set([...keywords(pageText,24),...(guide.keyTerms||[]).flatMap((x:string)=>keywords(x,4))])].slice(0,30);
 const scored=bank.map((x:any)=>({...x,_score:scoreQuestion(x,keys,pageText,courseCode)}))
  .filter((x:any)=>x._score>0)
  .sort((a:any,b:any)=>b._score-a._score);
 const grouped=new Map<string,any>();
 for(const row of scored){
  const fp=questionFingerprint(row.question_text)||String(row.id);
  const prev=grouped.get(fp);
  if(!prev){
   grouped.set(fp,{...row,_recurrence:1,_years:row.exam_year?[row.exam_year]:[],_sourcePages:[{source:row.source_drive_id,page:row.page_number}]});
  }else{
   prev._recurrence++;
   if(row.exam_year&&!prev._years.includes(row.exam_year))prev._years.push(row.exam_year);
   prev._sourcePages.push({source:row.source_drive_id,page:row.page_number});
   if(row._score>prev._score){
    const recurrence=prev._recurrence,years=prev._years,sourcePages=prev._sourcePages;
    grouped.set(fp,{...row,_recurrence:recurrence,_years:years,_sourcePages:sourcePages});
   }
  }
 }
 return [...grouped.values()].sort((a:any,b:any)=>b._score-a._score||b._recurrence-a._recurrence);
}
async function sourceMapFor(rows:any[]){
 const ids=[...new Set(rows.map(x=>x.source_drive_id))];
 if(!ids.length)return {};
 const {data}=await sb.from('nfcps_past_question_sources')
  .select('drive_id,title,source_url,department,level')
  .in('drive_id',ids);
 return Object.fromEntries((data||[]).map((x:any)=>[x.drive_id,x]));
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  if(req.method==='GET'){
   const u=new URL(req.url),mode=u.searchParams.get('mode')||'sources';
   if(mode==='sources'){
    const level=Number(u.searchParams.get('level')||0);
    let q=sb.from('nfcps_past_question_sources').select('drive_id,title,department,level,source_url,page_count,source_status,updated_at').neq('source_status','duplicate');
    if(level)q=q.eq('level',level);
    const {data,error}=await q.order('department').order('title');if(error)throw error;
    return out({sources:data||[]});
   }
   if(mode==='questions'){
    const department=(u.searchParams.get('department')||'').trim().toUpperCase();
    const course=(u.searchParams.get('course')||'').trim().toUpperCase();
    const level=Number(u.searchParams.get('level')||0);
    let q=sb.from('nfcps_past_questions').select('*').order('source_drive_id').order('page_number').limit(1000);
    if(department)q=q.eq('department',department);if(course)q=q.eq('course_code',course);if(level)q=q.eq('level',level);
    const {data,error}=await q;if(error)throw error;return out({questions:data||[]});
   }
   return out({error:'Unknown mode'},404);
  }

  if(req.method==='POST'){
   const body=await req.json().catch(()=>({}));
   const mode=String(body?.mode||'study');
   const materialId=String(body?.materialId||'').slice(0,180);
   const page=Math.max(1,Number(body?.page||1));
   const courseCode=String(body?.courseCode||'').trim().toUpperCase().slice(0,40);
   const pageText=String(body?.pageText||'').slice(0,30000);

   if(mode==='ask'){
    const question=String(body?.question||'').trim().slice(0,1000);
    if(!question)return out({error:'Ask a question first.'},400);
    let contexts=Array.isArray(body?.contexts)?body.contexts.slice(0,10):[];
    if(materialId){
     const {data:indexed}=await sb.from('nfcps_academic_page_index')
      .select('page_number,page_text')
      .eq('material_drive_id',materialId)
      .limit(250);
     for(const row of indexed||[]){
      if(!row?.page_text)continue;
      const p=Number(row.page_number||1);
      if(!contexts.some((c:any)=>Number(c?.page||0)===p))contexts.push({page:p,text:String(row.page_text)});
     }
    }
    if(!contexts.length&&pageText)contexts=[{page,text:pageText}];
    const result=answerFromContexts(question,contexts,page);
    return out({mode:'ask',materialId,page,question,...result,scope:contexts.length>1?'handout':'page',searchedPages:contexts.length,sourceGrounded:true});
   }

   if(mode!=='study'&&mode!=='related'&&mode!=='predict')return out({error:'Unknown mode'},404);
   const guide=pageGuide(pageText);
   const ranked=await rankBank(pageText,courseCode,guide);
   const top=ranked.slice(0,10);
   const sources=await sourceMapFor(top);
   const actual=top.map((x:any)=>{
    const src=(sources as any)[x.source_drive_id]||{};
    return {
     id:x.id,kind:'actual',question:x.question_text,options:x.options,markedAnswer:x.marked_answer||null,
     questionNumber:x.question_number,pastQuestionPage:x.page_number,department:x.department,courseCode:x.course_code,
     examYear:x.exam_year,topics:x.topics,matchStrength:x._score>=18?'strong':x._score>=9?'good':'possible',
     matchScore:x._score,recurrenceCount:x._recurrence||1,recurrenceYears:x._years||[],sourceTitle:src.title||'Past question',sourceUrl:src.source_url||''
    };
   });
   const predictions=buildPredictions(pageText,guide,ranked.slice(0,40));

   if(materialId&&pageText){
    await sb.from('nfcps_academic_page_index').upsert({
     material_drive_id:materialId,page_number:page,course_code:courseCode||null,
     heading:guide.heading,page_text:pageText,topics:guide.keyTerms,indexed_at:new Date().toISOString()
    },{onConflict:'material_drive_id,page_number'});
   }

   return out({
    materialId,page,courseCode,guide,pastQuestions:actual,predictions,
    shouldPop:actual.some((x:any)=>x.matchStrength==='strong'||x.matchStrength==='good'),
    popCount:actual.filter((x:any)=>x.matchStrength!=='possible').length,
    bankCoverage:{indexedQuestions:(await sb.from('nfcps_past_questions').select('*',{count:'exact',head:true})).count||0}
   });
  }
  return out({error:'Method not allowed'},405);
 }catch(e){
  console.error('study lens',e);
  return out({error:e instanceof Error?e.message:'Study Lens unavailable'},500);
 }
});