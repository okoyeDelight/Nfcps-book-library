/**
 * NFCPS Academic: geometry helpers for faithful, selectable native reading.
 * This module contains no student data, network calls, AI or UI decisions.
 * Safe to execute in Deno Edge Functions and Node unit tests.
 */
export function rect(value) {
  if (Array.isArray(value)) return {
    x:Number(value[0])||0, y:Number(value[1])||0,
    w:(Number(value[2])||0)-(Number(value[0])||0),
    h:(Number(value[3])||0)-(Number(value[1])||0)
  };
  return {x:Number(value?.x)||0,y:Number(value?.y)||0,w:Number(value?.w)||0,h:Number(value?.h)||0};
}
export function escapeText(value) {
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
const tidy = text=>String(text??"").replace(/\u00a0/g," ").replace(/[\t ]+/g," ").trim();
const marker = text=>/^(?:y|○|◦|•|▪|�|[-–—])$/.test(tidy(text));
/**
 * Prevent two different columns at the same Y from being joined into one
 * invented sentence. Infer missing spaces only when fragment geometry shows
 * a gap; never invent words or remove punctuation/formula symbols.
 */
export function reconstructLines(raw, pageWidth) {
  const parts=(Array.isArray(raw)?raw:[])
    .map(p=>({text:String(p?.text??""),b:rect(p?.bbox??p?.b)}))
    .filter(p=>p.text.trim()||p.text===" ")
    .sort((a,b)=>a.b.y-b.b.y||a.b.x-b.b.x);
  const groups=[];
  for (const p of parts) {
    const height=Math.max(p.b.h,1), right=p.b.x+Math.max(0,p.b.w);
    let match=null;
    for(const g of groups) {
      const baseHeight=Math.max(g.h,height,1);
      const sameRow=Math.abs(g.y-p.b.y)<=baseHeight*.48;
      const separation=p.b.x>g.right ? p.b.x-g.right
        : g.left>right ? g.left-right : 0;
      // Column gaps, separate chart labels, table cells must never be
      // assumed to form a single sentence.
      const nearby=separation<=Math.min(Math.max(14,baseHeight*1.9),Math.max(14,pageWidth*.055));
      if(sameRow&&nearby){match=g;break;}
    }
    if(!match) {
      match={y:p.b.y,left:p.b.x,right,h:height,parts:[]};
      groups.push(match);
    }
    match.left=Math.min(match.left,p.b.x);
    match.right=Math.max(match.right,right);
    match.h=Math.max(match.h,height);
    match.parts.push(p);
  }
  return groups.sort((a,b)=>a.y-b.y||a.left-b.left).map(g=>{
    const fragments=g.parts.sort((a,b)=>a.b.x-b.b.x);
    const fullHeight=Math.max(...fragments.map(p=>Math.max(1,p.b.h)));
    const baseline=Math.min(...fragments.filter(p=>p.b.h>=fullHeight*.85).map(p=>p.b.y));
    let bullet="",text="",html="",previous=null;
    const first=fragments.find(p=>p.text.trim());
    for(const p of fragments) {
      if(!bullet&&first===p&&marker(p.text)) {bullet="•";previous=p;continue;}
      if(p.text==="\t")continue;
      const value=p.text.replace(/\u00a0/g," ");
      if(!value) continue;
      if(previous && value.trim() && text && !/\s$/.test(text) && !/^\s/.test(value)) {
        const gap=p.b.x-(previous.b.x+Math.max(0,previous.b.w));
        const small=p.b.h<fullHeight*.78;
        const adjacentLetter=/[\p{L}\p{N})\]]$/u.test(text) && /^[\p{L}\p{N}(]/u.test(value);
        if(!small && adjacentLetter && gap>Math.max(1.5,fullHeight*.17)) {
          text+=" ";
          html+=" ";
        }
      }
      text+=value;
      if(/^\s+$/.test(value)){html+=value;previous=p;continue;}
      const small=p.b.h<fullHeight*.78;
      if(small&&p.b.y>baseline+2)html+="<sub>"+escapeText(value)+"</sub>";
      else if(small&&p.b.y<baseline-2)html+="<sup>"+escapeText(value)+"</sup>";
      else html+=escapeText(value);
      previous=p;
    }
    return {x:g.left,y:g.y,w:Math.max(0,g.right-g.left),h:fullHeight,
      marker:bullet,text:tidy(text),html:html.replace(/[\t ]{2,}/g," ").trim()};
  }).filter(line=>line.text||line.marker);
}
/**
 * Detect actual parallel text bands, not simply left/right indent counts.
 * Ambiguous middle-width content is a reason to use conservative flow.
 */
export function classifyColumns(lines,pageWidth) {
  const all=(Array.isArray(lines)?lines:[]).filter(x=>x?.text);
  const mid=pageWidth*.5, pad=pageWidth*.025;
  const left=[],right=[],spanning=[];
  for(const l of all) {
    const end=l.x+Math.max(0,l.w);
    if(end<mid-pad)left.push(l);
    else if(l.x>mid+pad)right.push(l);
    else spanning.push(l);
  }
  if(left.length<4||right.length<4)return {twoColumn:false,left,right,spanning};
  const lMin=Math.min(...left.map(x=>x.y)),lMax=Math.max(...left.map(x=>x.y+x.h));
  const rMin=Math.min(...right.map(x=>x.y)),rMax=Math.max(...right.map(x=>x.y+x.h));
  const overlap=Math.min(lMax,rMax)-Math.max(lMin,rMin);
  const taller=Math.min(lMax-lMin,rMax-rMin);
  if(overlap<=0 || overlap<Math.max(20,taller*.4))return {twoColumn:false,left,right,spanning};
  const pairs=left.filter(l=>right.some(r=>Math.abs(l.y-r.y)<=Math.max(l.h,r.h,1)*1.7)).length;
  if(pairs<3)return {twoColumn:false,left,right,spanning};
  const activeTop=Math.max(lMin,rMin),activeBottom=Math.min(lMax,rMax);
  // A central figure or text block crossing the bands makes a global
  // left-first/right-second ordering unreliable. Keep all content instead.
  if(spanning.some(x=>x.y>activeTop+3&&x.y<activeBottom-3))
    return {twoColumn:false,left,right,spanning};
  return {twoColumn:true,left,right,spanning,activeTop,activeBottom};
}
/**
 * Stable source ordering within a chosen region. Figures stay alongside
 * surrounding text, rather than being sent to the end of the handout page.
 */
export function orderedEvents(lines,images) {
  return [...(lines||[]).map(x=>({...x,type:"line"})),...(images||[]).map(x=>({...x,type:"image"}))]
    .sort((a,b)=>(a.type==="image"?a.bbox.y:a.y)-(b.type==="image"?b.bbox.y:b.y)||
      (a.type==="image"?a.bbox.x:a.x)-(b.type==="image"?b.bbox.x:b.x));
}
/** Count rendered image tags and preserve source-item coverage. */
export function imageCoverage(html,expectedCount) {
  const found=(String(html||"").match(/<img\b/gi)||[]).length;
  return {expected:expectedCount,rendered:found,complete:found===expectedCount};
}
/** Keep rendered words in source order when lines are combined. */
export function normalizeForCoverage(text) {
  return String(text??"").normalize("NFKC").replace(/[\s\u00ad]+/g,"")
    .replace(/[^\p{L}\p{N}°±×÷⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹+\-=/^]/gu,"").toLowerCase();
}

/**
 * Conservative indicators that the selectable PDF text layer is scrambled.
 * Never "correct" a lecturer's words using guesses; report for visual/OCR QA.
 */
export function readingQuality(lines, text) {
  const rows=(Array.isArray(lines)?lines:[]).filter(l=>typeof l?.text==="string"&&l.text.trim());
  const words=String(text??"").match(/[\p{L}\p{N}]+/gu)||[];
  const unusuallyShort=rows.filter(l=>l.text.trim().length<=8).length;
  const tinyTokens=words.filter(w=>w.length===1&&/[\p{L}]/u.test(w)).length;
  const brokenRows=rows.filter((l,i)=>{
    const next=rows[i+1];
    return next && /[\p{L}]{1,3}$/u.test(l.text.trim()) &&
      /^[\p{Ll}]{4,}/u.test(next.text.trim()) &&
      Math.abs(next.y-l.y)>Math.max(1,l.h)*.6;
  }).length;
  const flags=[];
  if(rows.length>=12 && unusuallyShort/rows.length>.23)flags.push("FRAGMENTED_SOURCE_LINES");
  if(words.length>=25 && tinyTokens/words.length>.15)flags.push("SUSPICIOUS_SINGLE_LETTER_TOKENS");
  if(rows.length>=12 && brokenRows/rows.length>.15)flags.push("WORDS_SPLIT_ACROSS_LINES");
  return {needsReview:flags.length>0,flags,metrics:{lines:rows.length,wordTokens:words.length,shortLineRatio:rows.length?Number((unusuallyShort/rows.length).toFixed(3)):0}};
}
