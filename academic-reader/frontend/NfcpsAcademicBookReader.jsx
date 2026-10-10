
function NfcpsAcademicBookReader({material:l}){
 const[manifest,setManifest]=d.useState(null),[loading,setLoading]=d.useState(!0),[err,setErr]=d.useState(""),[sourcePage,setSourcePage]=d.useState(1),[pages,setPages]=d.useState({}),[fontSize,setFontSize]=d.useState(18),[twoUp,setTwoUp]=d.useState(!1),[subPage,setSubPage]=d.useState(0),[subCount,setSubCount]=d.useState(1),[toolsOpen,setToolsOpen]=d.useState(!1),[tool,setTool]=d.useState("reader"),[study,setStudy]=d.useState(null),[busy,setBusy]=d.useState(!1),[ask,setAsk]=d.useState(""),[selectedQuestion,setSelectedQuestion]=d.useState(null),[questionDetail,setQuestionDetail]=d.useState(null),[questionBusy,setQuestionBusy]=d.useState(!1),[figure,setFigure]=d.useState(null),[figureZoom,setFigureZoom]=d.useState(1),[figurePan,setFigurePan]=d.useState({x:0,y:0}),[figureMode,setFigureMode]=d.useState("explore"),[figureReveal,setFigureReveal]=d.useState(100),[figureSpot,setFigureSpot]=d.useState({x:50,y:50}),[figurePlaying,setFigurePlaying]=d.useState(!1),[workProof,setWorkProof]=d.useState(null),[workError,setWorkError]=d.useState(""),[workRefresh,setWorkRefresh]=d.useState(0),[dark,setDark]=d.useState(!1),[retryCounter,setRetryCounter]=d.useState(0),[manifestRetry,setManifestRetry]=d.useState(0),viewportRef=d.useRef(null),columnsRef=d.useRef(null),gestureRef=d.useRef({dist:0,startFont:18,sx:0,sy:0,pinch:!1}),goLastRef=d.useRef(!1),figurePointers=d.useRef(new Map()),figureGesture=d.useRef(null);
 const PKG="https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-academic-book-package",FLOW="https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-flow-page",LENS="https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-study-lens";
 d.useEffect(()=>{let live=!0;const ctl=new AbortController;setLoading(!0);setErr("");setManifest(null);setSourcePage(1);setPages({});fetch(PKG+"?mode=manifest&material="+encodeURIComponent(l.id),{signal:ctl.signal,cache:"no-store"}).then(async r=>{const x=await r.json();if(!r.ok||!x?.ready)throw new Error(x?.error||"Material unavailable");if(live){setManifest(x);setTwoUp(x.layoutHint==="slides");setFontSize(x.layoutHint==="slides"?17:18);setLoading(!1)}}).catch(e=>{if(e?.name!=="AbortError"&&live){setErr(String(e?.message||e));setLoading(!1)}});return()=>{live=!1;ctl.abort()}},[l.id,manifestRetry]);
 const sourceCount=Math.max(1,Number(manifest?.pageCount||1)),current=Math.max(1,Math.min(sourceCount,sourcePage)),pairEnd=twoUp?Math.min(sourceCount,current+1):current,sourceStep=twoUp?2:1;
 const fetchFlow=async(n,signal)=>{const r=await fetch(FLOW+"?material="+encodeURIComponent(l.id)+"&page="+n+"&v="+encodeURIComponent(manifest?.version||"")+"&layout=7",{signal,cache:"force-cache"}),x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error||"Could not build this page");return x};
 d.useEffect(()=>{if(!manifest)return;let live=!0;const ctl=new AbortController,wanted=[current];if(twoUp&&pairEnd!==current)wanted.push(pairEnd);Promise.all(wanted.filter(n=>!pages[n]).map(n=>fetchFlow(n,ctl.signal).then(x=>[n,x]))).then(rows=>{if(live&&rows.length)setPages(prev=>{const next={...prev};rows.forEach(([n,x])=>next[n]=x);return next})}).catch(e=>{if(e?.name!=="AbortError"&&live)setErr(String(e?.message||e))});const ahead=[current+sourceStep,current+sourceStep+1].filter(n=>n>0&&n<=sourceCount&&!pages[n]);setTimeout(()=>ahead.forEach(n=>fetchFlow(n,ctl.signal).then(x=>{if(live)setPages(prev=>({...prev,[n]:x}))}).catch(()=>{})),120);return()=>{live=!1;ctl.abort()}},[l.id,current,twoUp,pairEnd,manifest?.version,retryCounter]);
 const pageData=pages[current]||null,secondData=twoUp&&pairEnd!==current?pages[pairEnd]||null:null;
 const restrictedStudy=!!(pageData?.unreliableText||secondData?.unreliableText),qualityNotice="The original source page is shown because its extracted words need verification. Study answers for this page are paused to avoid teaching incorrect text.";
 const combinedHtml=(pageData?.html||"")+(secondData?'<div class="book-slide-divider"><span>Next slide</span></div>'+secondData.html:"");
 const measure=()=>{const vp=viewportRef.current,col=columnsRef.current;if(!vp||!col)return;const w=Math.max(1,vp.clientWidth),count=Math.max(1,Math.round(col.scrollWidth/w));setSubCount(count);const target=goLastRef.current?count-1:Math.min(subPage,count-1);goLastRef.current=!1;setSubPage(target);requestAnimationFrame(()=>{vp.scrollLeft=target*w})};
 d.useEffect(()=>{setSubPage(0);setStudy(null);setTimeout(measure,40);setTimeout(measure,220)},[combinedHtml,fontSize,twoUp]);
 d.useEffect(()=>{const ro=typeof ResizeObserver!=="undefined"&&columnsRef.current?new ResizeObserver(()=>measure()):null;ro&&ro.observe(columnsRef.current);window.addEventListener("resize",measure);return()=>{ro&&ro.disconnect();window.removeEventListener("resize",measure)}},[combinedHtml]);
 const moveSub=n=>{const vp=viewportRef.current;if(!vp)return;const next=Math.max(0,Math.min(subCount-1,n));setSubPage(next);vp.scrollTo({left:next*vp.clientWidth,behavior:"smooth"})};
 const goSource=n=>{const next=Math.max(1,Math.min(sourceCount,n));setErr("");setSourcePage(next);setSubPage(0);setStudy(null);if(viewportRef.current)viewportRef.current.scrollLeft=0};
 const next=()=>{if(subPage<subCount-1)moveSub(subPage+1);else if(pairEnd<sourceCount)goSource(current+sourceStep)};
 const prev=()=>{if(subPage>0)moveSub(subPage-1);else if(current>1){goLastRef.current=!0;goSource(Math.max(1,current-sourceStep))}};
 d.useEffect(()=>{const el=viewportRef.current;if(!el)return;const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),ts=e=>{if(e.touches.length===2){gestureRef.current={...gestureRef.current,dist:dist(e.touches[0],e.touches[1]),startFont:fontSize,pinch:!0}}else if(e.touches.length===1){gestureRef.current={...gestureRef.current,sx:e.touches[0].clientX,sy:e.touches[0].clientY,pinch:!1}}},tm=e=>{if(e.touches.length===2&&gestureRef.current.dist>0){e.preventDefault();const ratio=dist(e.touches[0],e.touches[1])/gestureRef.current.dist;setFontSize(Math.max(14,Math.min(32,Math.round(gestureRef.current.startFont*ratio))))}},te=e=>{if(gestureRef.current.pinch){gestureRef.current.pinch=!1;return}const a=e.changedTouches?.[0];if(!a)return;const dx=a.clientX-gestureRef.current.sx,dy=a.clientY-gestureRef.current.sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.2){dx<0?next():prev()}};el.addEventListener("touchstart",ts,{passive:!0});el.addEventListener("touchmove",tm,{passive:!1});el.addEventListener("touchend",te,{passive:!0});return()=>{el.removeEventListener("touchstart",ts);el.removeEventListener("touchmove",tm);el.removeEventListener("touchend",te)}},[fontSize,subPage,subCount,current,pairEnd,twoUp]);
 const activeText=(pageData?.text||"")+(secondData?"\n"+(secondData.text||""):""),guide=study?.guide||{},past=study?.pastQuestions||[],pred=study?.predictions||[],answer=study?.askResult;
 const loadTool=async name=>{setTool(name);setStudy(null);if(restrictedStudy&&name!=="reader"){setStudy({error:qualityNotice});return}if(!["understand","exam","recall"].includes(name)||!pageData||busy)return;setBusy(!0);try{const r=await fetch(LENS,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"study",materialId:l.id,page:current,courseCode:manifest?.courseCode||l.courseCode||"",pageText:activeText})}),x=await r.json();if(!r.ok)throw new Error(x?.error||"Study tools unavailable");setStudy(x)}catch(e){setStudy({error:String(e?.message||e)})}finally{setBusy(!1)}};
 const askPage=async()=>{if(restrictedStudy){setStudy({askResult:{error:qualityNotice}});return}const q=ask.trim();if(!q||!pageData)return;setBusy(!0);try{const r=await fetch(LENS,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"ask",materialId:l.id,page:current,courseCode:manifest?.courseCode||l.courseCode||"",question:q,pageText:activeText})}),x=await r.json();if(!r.ok)throw new Error(x?.error||"Could not answer");setStudy({askResult:x})}catch(e){setStudy({askResult:{error:String(e?.message||e)}})}finally{setBusy(!1)}};
 const openQuestion=async q=>{
  setSelectedQuestion(q);setQuestionDetail(null);setQuestionBusy(!0);
  try{
   const r=await fetch(LENS,{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({mode:"question",questionId:q.id,materialId:l.id,page:current,
     courseCode:manifest?.courseCode||l.courseCode||"",pageText:activeText})});
   const x=await r.json();if(!r.ok)throw new Error(x?.error||"Question details unavailable");setQuestionDetail(x);
  }catch(e){setQuestionDetail({error:String(e?.message||e)})}finally{setQuestionBusy(!1)}
 };

 d.useEffect(()=>{
  if(!toolsOpen||tool!=="reader")return;
  let alive=true;
  const load=async()=>{
   try{
    const r=await fetch("https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-academic-ceo-live?mode=proof&material="+encodeURIComponent(l.id),{cache:"no-store"});
    const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error||"No academic work log available");
    if(alive){setWorkProof(x);setWorkError("")}
   }catch(e){if(alive)setWorkError(String(e?.message||e))}
  };
  load();const poll=setInterval(load,60000);return()=>{alive=false;clearInterval(poll)}
 },[toolsOpen,tool,l.id,workRefresh]);
 d.useEffect(()=>{
  if(!figure||!figurePlaying||figureMode!=="reveal")return;
  const timer=setInterval(()=>setFigureReveal(v=>v>=100?5:Math.min(100,v+5)),170);
  return()=>clearInterval(timer);
 },[figure,figurePlaying,figureMode]);
 const openFigure=e=>{
  const img=e.target?.closest?.("figure.book-figure img");
  if(!img)return;
  const src=String(img.getAttribute("src")||"");
  if(!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(src)
      && !/^https:\/\/(?:fuusztcioodflmgqawyl\.supabase\.co|nfcps-academic-visual\.onrender\.com)\//i.test(src))return;
  setFigure({src,alt:img.alt||"Original handout figure",page:current,title:manifest?.title||l.title||"Handout"});
  setFigureZoom(1);setFigurePan({x:0,y:0});setFigureMode("explore");setFigureReveal(100);setFigurePlaying(!1);
 };
 const moveFigureZoom=change=>setFigureZoom(z=>Math.max(1,Math.min(5,Math.round((z+change)*10)/10)));
 const pointerStart=e=>{
  e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);
  figurePointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const a=[...figurePointers.current.values()];
  if(a.length===2)figureGesture.current={startDistance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,startZoom:figureZoom};
 };
 const pointerMove=e=>{
  const map=figurePointers.current;if(!map.has(e.pointerId))return;
  const old=map.get(e.pointerId);map.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const a=[...map.values()];
  if(figureMode==="spotlight"){
   const b=e.currentTarget.getBoundingClientRect();
   setFigureSpot({x:Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100)),y:Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))});
  }
  if(a.length===2&&figureGesture.current){
   const dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
   setFigureZoom(Math.max(1,Math.min(5,figureGesture.current.startZoom*dist/figureGesture.current.startDistance)));
  }else if(a.length===1&&figureZoom>1){
   setFigurePan(p=>({x:p.x+e.clientX-old.x,y:p.y+e.clientY-old.y}));
  }
 };
 const pointerEnd=e=>{figurePointers.current.delete(e.pointerId);if(figurePointers.current.size<2)figureGesture.current=null};
 const ready=!!pageData&&(!twoUp||pairEnd===current||!!secondData),indicator=(twoUp&&pairEnd>current?"Sources "+current+"–"+pairEnd+" of "+sourceCount:"Source "+current+" of "+sourceCount)+(subCount>1?" · "+(subPage+1)+"/"+subCount:"");
 return t.jsxs("div",{className:"academic-book-reader"+(dark?" dark":""),children:[
  t.jsx("div",{className:"academic-book-progress",children:t.jsx("i",{style:{width:(pairEnd/sourceCount*100)+"%"}})}),
  t.jsxs("div",{className:"academic-book-top",children:[
   t.jsxs("div",{children:[t.jsx("strong",{children:indicator}),manifest?.courseCode&&t.jsx("small",{children:manifest.courseCode})]}),
   t.jsx("button",{onClick:()=>setToolsOpen(!toolsOpen),children:toolsOpen?"Close":"Reading tools"})
  ]}),
  t.jsxs("div",{className:"academic-book-viewport",ref:viewportRef,onClick:openFigure,children:[
   loading&&t.jsxs("div",{className:"academic-book-state",children:[t.jsx("strong",{children:"Opening book"}),t.jsx("small",{children:"Preparing the first reader page…"})]}),
   err&&t.jsxs("div",{className:"academic-book-state error",children:[t.jsx("strong",{children:"Could not build this page"}),t.jsx("small",{children:err}),t.jsx("button",{onClick:()=>{setErr("");if(!manifest){setManifestRetry(n=>n+1)}else{setPages(p=>{const n={...p};delete n[current];delete n[pairEnd];return n});setRetryCounter(n=>n+1)}},children:"Try again"})]}),
   !loading&&!err&&!ready&&t.jsx("div",{className:"academic-book-state",children:"Arranging this page…"}),
   !loading&&!err&&ready&&t.jsx("div",{className:"academic-book-columns"+(twoUp?" slides":""),ref:columnsRef,style:{fontSize:fontSize+"px"},dangerouslySetInnerHTML:{__html:combinedHtml}})
  ]}),
  !loading&&!err&&t.jsxs(t.Fragment,{children:[
   t.jsx("button",{className:"academic-book-arrow prev",disabled:current<=1&&subPage===0,onClick:prev,children:"‹"}),
   t.jsx("button",{className:"academic-book-arrow next",disabled:pairEnd>=sourceCount&&subPage>=subCount-1,onClick:next,children:"›"})
  ]}),
  figure&&t.jsxs("div",{role:"dialog","aria-modal":true,"aria-label":"Interactive original scientific figure",style:{
    position:"fixed",inset:"0",zIndex:999999,display:"flex",flexDirection:"column",
    justifyContent:"center",gap:"10px",padding:"14px",boxSizing:"border-box",color:"#f5f7fa",
    background:"rgba(9,17,23,.96)",backdropFilter:"blur(15px)",WebkitBackdropFilter:"blur(15px)"},children:[
    t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"},children:[
     t.jsxs("div",{style:{minWidth:0},children:[t.jsx("strong",{children:"Explore original source figure"}),t.jsx("small",{style:{display:"block",opacity:.8},children:(figure.title||"Handout")+" · source page "+figure.page})]}),
     t.jsx("button",{type:"button",onClick:()=>{setFigure(null);setFigurePlaying(!1);figurePointers.current.clear()},style:{padding:"10px 16px",borderRadius:"22px"},children:"Close"})
    ]}),
    t.jsxs("div",{style:{display:"flex",gap:"7px",flexWrap:"wrap"},children:[
     ...["explore","spotlight","reveal"].map(mode=>t.jsx("button",{type:"button",onClick:()=>{setFigureMode(mode);setFigurePlaying(!1);setFigureSpot({x:50,y:50})},style:{borderRadius:"18px",padding:"8px 12px",background:figureMode===mode?"#4770ec":"rgba(255,255,255,.15)",color:"#fff"},children:mode[0].toUpperCase()+mode.slice(1)},mode)),
     t.jsx("button",{type:"button",onClick:()=>moveFigureZoom(-.3),disabled:figureZoom<=1,children:"− Zoom"}),
     t.jsx("button",{type:"button",onClick:()=>moveFigureZoom(.3),disabled:figureZoom>=5,children:"+ Zoom"}),
     t.jsx("button",{type:"button",onClick:()=>{setFigureZoom(1);setFigurePan({x:0,y:0});setFigureReveal(100)},children:"Reset"})
    ]}),
    t.jsxs("div",{onPointerDown:pointerStart,onPointerMove:pointerMove,onPointerUp:pointerEnd,onPointerCancel:pointerEnd,onDoubleClick:()=>moveFigureZoom(figureZoom<2?1:-1),
     style:{touchAction:"none",position:"relative",overflow:"hidden",flex:"1 1 auto",minHeight:"160px",maxHeight:"68vh",borderRadius:"18px",border:"1px solid rgba(255,255,255,.17)",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.055)",cursor:figureZoom>1?"grab":"crosshair"},children:[
      t.jsx("img",{src:figure.src,alt:figure.alt,draggable:false,style:{display:"block",maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto",objectFit:"contain",userSelect:"none",WebkitUserSelect:"none",transform:"translate("+figurePan.x+"px,"+figurePan.y+"px) scale("+figureZoom+")",clipPath:figureMode==="reveal"?"inset(0 "+(100-figureReveal)+"% 0 0)":"none",pointerEvents:"none"}}),
      figureMode==="spotlight"&&t.jsx("div",{style:{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle 95px at "+figureSpot.x+"% "+figureSpot.y+"%, transparent 0px, transparent 66px, rgba(0,0,0,.75) 95px)"}})
     ]}),
    figureMode==="reveal"&&t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[
     t.jsx("label",{children:"Reveal "+figureReveal+"%"}),
     t.jsx("input",{type:"range",min:5,max:100,step:5,value:figureReveal,onChange:e=>setFigureReveal(Number(e.target.value)),style:{flex:1}, "aria-label":"Reveal original scientific figure"}),
     t.jsx("button",{type:"button",onClick:()=>setFigurePlaying(x=>!x),children:figurePlaying?"Pause":"Auto-reveal"})
    ]}),
    t.jsx("small",{style:{opacity:.75},children:"Pinch or use Zoom, drag to examine details, move the spotlight, or reveal the unchanged original figure step by step. No scientific labels or mechanisms have been invented."})
   ]}),
  toolsOpen&&!loading&&!err&&t.jsxs("section",{className:"academic-book-tools",children:[
   t.jsx("div",{className:"academic-book-tabs",children:["reader","understand","ask","exam","recall"].map(x=>t.jsx("button",{className:tool===x?"active":"",onClick:()=>loadTool(x),children:x[0].toUpperCase()+x.slice(1)},x))}),
   t.jsxs("div",{className:"academic-book-toolbody",children:[
    tool==="reader"&&t.jsxs("div",{className:"academic-book-control-stack",children:[
     t.jsxs("div",{className:"academic-book-control",children:[t.jsx("span",{children:"Text size"}),t.jsx("button",{onClick:()=>setFontSize(Math.max(14,fontSize-1)),children:"A−"}),t.jsx("button",{onClick:()=>setFontSize(Math.min(32,fontSize+1)),children:"A+"})]}),
     t.jsxs("div",{className:"academic-book-control",children:[t.jsx("span",{children:"Theme"}),t.jsx("button",{onClick:()=>setDark(!dark),children:dark?"Cream":"Dark"})]}),
     t.jsxs("div",{className:"academic-book-control",children:[t.jsx("span",{children:"Source grouping"}),t.jsx("button",{className:!twoUp?"active":"",onClick:()=>{setTwoUp(!1);setSubPage(0)},children:"1 page"}),t.jsx("button",{className:twoUp?"active":"",onClick:()=>{setTwoUp(!0);setSubPage(0)},children:"2 slides"})]}),
     t.jsx("small",{children:"Pinch with two fingers to change text size. The book will repaginate automatically."})
    ]}),
    tool==="reader"&&t.jsxs("section",{className:"academic-book-card",style:{marginTop:"12px"},children:[
  t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"},children:[
   t.jsx("strong",{children:"Evidence of Academic agents at work"}),
   t.jsx("button",{type:"button",onClick:()=>setWorkRefresh(x=>x+1),children:"Refresh"})
  ]}),
  t.jsx("small",{children:"Source-linked inspection receipts, not scripted CEO messages. Refreshed each minute from recorded backend actions."}),
  workError&&t.jsx("p",{role:"status",children:workError}),
  !workProof&&!workError&&t.jsx("p",{children:"Checking actual source and specialist records…"}),
  workProof&&t.jsxs("div",{children:[
   t.jsx("small",{style:{display:"block",margin:"8px 0"},children:(workProof.forHandout||[]).length?"Records for this handout":"Recent Academic records across other handouts"}),
   ...((workProof.forHandout||[]).length?workProof.forHandout:workProof.recentActions||[]).slice(0,7).map(x=>t.jsxs("div",{
    style:{borderTop:"1px solid rgba(82,90,90,.19)",padding:"10px 0",display:"flex",flexDirection:"column",gap:"3px"},
    children:[
     t.jsx("strong",{style:{fontSize:"13px"},children:x.source_kind==="source_page_audit"?
      "Verified source page count":x.source_kind==="independent_repair"?
      "Independently verified repair":"Specialist detected a source issue"}),
     t.jsx("small",{children:x.level+"-level · "+String(x.material_title||"Handout")+
       (x.source_page?" · source page "+x.source_page:"")}),
     t.jsx("small",{children:"Specialist: "+String(x.specialist_role||"Academic inspection").replace(/_/g," ")+
       " · "+(x.source_kind==="source_page_audit"?"Page range 1–N checked; text/diagrams still need separate review":
         String(x.action_code||"Observed").replace(/_/g," "))}),
     t.jsx("small",{children:"Status: "+(x.progress_state==="verified"?"Verified for this check":
       x.progress_state==="assigned"?"Assigned, not repaired":
       x.progress_state==="review_required"?"Independent review required":"Detected, not repaired")+
       " · Evidence "+x.source_kind+" #"+x.source_ref}),
     x.evidence_at&&t.jsx("small",{children:"Recorded "+new Date(x.evidence_at).toLocaleString()}),
     x.material_drive_id===l.id&&x.source_page&&t.jsx("button",{
      type:"button",onClick:()=>{setToolsOpen(!1);goSource(Number(x.source_page))},
      style:{alignSelf:"flex-start"},children:"Open inspected source page"})
    ]},x.source_kind+":"+x.source_ref)),
   t.jsx("small",{children:"A detected issue or an approved task does not count as a fixed page. Every verified repair needs separate academic evidence."})
  ]})
 ]}),
 tool==="understand"&&t.jsx("div",{children:busy?t.jsx("p",{children:"Understanding this page…"}):study?.error?t.jsx("div",{className:"academic-book-card",children:study.error}):t.jsxs("div",{className:"academic-book-card",children:[t.jsx("strong",{children:guide.primaryTopic||guide.heading||"Current section"}),(guide.focusPoints||[]).map((x,i)=>t.jsx("p",{children:x},i))]})}),
    tool==="ask"&&t.jsxs("div",{children:[t.jsx("textarea",{value:ask,onChange:e=>setAsk(e.target.value),placeholder:"Ask anything from this handout…"}),t.jsx("button",{className:"academic-book-ask",onClick:askPage,disabled:busy,children:busy?"Searching…":"Ask"}),answer&&t.jsx("div",{className:"academic-book-card",children:t.jsx("p",{children:answer.answer||answer.error||"No answer found."})})]}),
    tool==="exam"&&t.jsxs("div",{children:[restrictedStudy&&t.jsx("div",{className:"academic-book-card",children:qualityNotice}),busy&&t.jsx("p",{children:"Matching this section to past questions…"}),past.some(x=>x.matchStrength!=="possible")&&t.jsx("h4",{children:"Likely page-related past questions"}),past.filter(x=>x.matchStrength!=="possible").map((x,i)=>t.jsxs("button",{type:"button",className:"academic-book-card",style:{width:"100%",display:"block",textAlign:"left",cursor:"pointer"},onClick:()=>openQuestion(x),children:[t.jsx("strong",{children:x.question}),(x.sourceTitle||x.examYear||x.pastQuestionPage)&&t.jsx("small",{children:(x.sourceTitle||"Past question")+(x.examYear?" · "+x.examYear:"")+(x.pastQuestionPage?" · source page "+x.pastQuestionPage:"")}),t.jsx("small",{children:"Tap to discuss →"})]},x.id||i)),past.some(x=>x.matchStrength==="possible")&&t.jsx("h4",{children:"Other possible topic matches · verify relevance"}),past.filter(x=>x.matchStrength==="possible").map((x,i)=>t.jsxs("button",{type:"button",className:"academic-book-card",style:{width:"100%",textAlign:"left",opacity:.86},onClick:()=>openQuestion(x),children:[t.jsx("strong",{children:x.question}),t.jsx("small",{children:(x.sourceTitle||"Past question")+" · possible topic match · tap to inspect"})]},x.id||i)),t.jsx("h4",{children:"Likely questions"}),pred.map((x,i)=>t.jsxs("div",{className:"academic-book-card",children:[t.jsx("strong",{children:x.question}),t.jsx("small",{children:"Prediction · "+(x.reason||"Generated practice question")})]},i))]}),
    tool==="exam"&&selectedQuestion&&t.jsxs("div",{className:"academic-book-card",role:"dialog","aria-label":"Past question discussion",style:{position:"fixed",zIndex:999999,bottom:"12px",left:"12px",right:"12px",maxHeight:"79vh",overflowY:"auto",padding:"20px",borderRadius:"26px",background:"rgba(253,250,242,.96)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",boxShadow:"0 18px 55px rgba(0,0,0,.3)",color:"#262520"},children:[
 t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px"},children:[t.jsx("strong",{children:"Past question · Source-linked discussion"}),t.jsx("button",{type:"button",onClick:()=>{setSelectedQuestion(null);setQuestionDetail(null)},children:"Close"})]}),
 t.jsx("p",{style:{fontWeight:650},children:selectedQuestion.question}),
 t.jsx("small",{children:(selectedQuestion.sourceTitle||"Past question")+(selectedQuestion.pastQuestionPage?" · source page "+selectedQuestion.pastQuestionPage:"")}),
 questionBusy?t.jsx("p",{children:"Checking indexed question and available source evidence…"}):questionDetail?.error?t.jsx("p",{children:questionDetail.error}):
 t.jsxs("div",{children:[
 questionDetail?.recordedAnswer&&t.jsxs("div",{children:[t.jsx("strong",{children:"Recorded answer key"}),t.jsx("p",{children:questionDetail.recordedAnswer})]}),
 t.jsx("p",{children:questionDetail?.notice||"Checking source evidence…"}),
 questionDetail?.studyExplanation&&t.jsxs("div",{children:[t.jsx("strong",{children:"Relevant source passage"}),t.jsx("p",{children:questionDetail.studyExplanation}),t.jsx("small",{children:"Study evidence, not an independently verified model answer."})]}),
 t.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:"8px"},children:[
 t.jsx("button",{type:"button",onClick:()=>{setAsk("Explain this past question carefully using academic evidence: "+selectedQuestion.question);setTool("ask");setSelectedQuestion(null)},children:"Ask further"}),
 t.jsx("button",{type:"button",onClick:()=>{setTool("recall");setSelectedQuestion(null)},children:"Practise recall"}),
 t.jsx("button",{type:"button",onClick:()=>{setTool("understand");setSelectedQuestion(null)},children:"Understand topic"})]})
 ]})]}),
 tool==="recall"&&(restrictedStudy?t.jsx("div",{className:"academic-book-card",children:qualityNotice}):t.jsxs("div",{className:"academic-book-card",children:[t.jsx("strong",{children:"Active recall"}),t.jsxs("p",{children:["Without looking back, explain ",(guide.keyTerms||[])[0]||guide.primaryTopic||"the main idea"," in your own words."]})]}))
   ]})
  ]})
 ]})
}
