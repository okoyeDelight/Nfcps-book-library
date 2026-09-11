'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@appdeploy/client';
import { Bookmark, Check, ChevronRight, Clock3, GitBranch, LoaderCircle, Map as MapIcon, MessageCircle, Mic, MicOff, ScrollText, SearchCheck, Send, Sparkles, X } from 'lucide-react';
import type { SharedWatchVideo } from './WatchDeepFeatures';

type Passage = { reference: string; text: string; translation: 'KJV' };
type Cue = { reference: string; start: number; end: number; relation: 'cited'|'quoted'|'related'|'compare'|'context'; reason: string };
type Chapter = { start: number; end: number; title: string; summary: string };
type Claim = { id: string; start: number; end: number; claim: string; supportRefs: string[]; compareRefs: string[]; note: string };
type Package = { available: boolean; videoId: string; title: string; creator: string; category: string; summary: string; themes: string[]; chapters: Chapter[]; claims: Claim[]; scriptures: Cue[]; scriptureTrail: string[]; passages: Passage[]; graph: { from: string; to: string; relation: string }[]; reason?: string };
type AskResult = { available: boolean; answer?: string; reason?: string; evidence: { start: number; label: string; text: string }[]; passages?: Passage[] };
type LiveResult = { available: boolean; theme: string; note: string; passages: Passage[] };
type Tab = 'lens'|'map'|'claims'|'ask'|'trail'|'graph';
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start:()=>void; stop:()=>void; onresult:((e:{results:ArrayLike<RecognitionResult>})=>void)|null; onerror:(()=>void)|null; onend:(()=>void)|null };
type RecognitionCtor = new()=>Recognition;

const CACHE = new Map<string, Promise<Package>>();
export const invalidateSermonPackage = (videoId:string) => CACHE.delete(videoId);
const MEMORY = 'nfcps-watch-growth-memory';
const SAVED = 'nfcps-watch-scripture-saves';
const relationName: Record<Cue['relation'], string> = { cited:'Cited', quoted:'Quoted', related:'Related', compare:'Compare', context:'Context' };

const read = <T,>(key:string, fallback:T):T => { try { return JSON.parse(localStorage.getItem(key)||'') as T; } catch { return fallback; } };
const stamp = (s:number) => { const n=Math.max(0,Math.floor(s)); const h=Math.floor(n/3600),m=Math.floor(n%3600/60),sec=n%60; return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`; };
const err = (e:unknown) => { const x=e as {response?:{data?:{error?:string}};message?:string}; return x?.response?.data?.error||x?.message||'Scripture Lens is temporarily unavailable.'; };

function getPackage(video:SharedWatchVideo){
    const current=CACHE.get(video.id); if(current)return current;
    const q=new URLSearchParams({title:video.title,creator:video.creator,category:video.category});
    const request=api.get(`/api/watch/sermon/${video.id}/intelligence?${q}`).then(r=>r.data as Package).catch(e=>{CACHE.delete(video.id);throw e});
    CACHE.set(video.id,request); return request;
}

function remember(video:SharedWatchVideo,p:Package){
    if(!p.available)return;
    const current=read<{videos:string[];themes:Record<string,number>;categories:Record<string,number>;scriptures:Record<string,number>;updatedAt:string}>(MEMORY,{videos:[],themes:{},categories:{},scriptures:{},updatedAt:''});
    if(current.videos.includes(video.id))return;
    const themes={...current.themes}; p.themes.forEach(t=>themes[t.toLowerCase()]=(themes[t.toLowerCase()]||0)+1);
    const categories={...current.categories,[video.category.toLowerCase()]:(current.categories[video.category.toLowerCase()]||0)+1};
    localStorage.setItem(MEMORY,JSON.stringify({...current,videos:[video.id,...current.videos].slice(0,120),themes,categories,updatedAt:new Date().toISOString()}));
    window.dispatchEvent(new Event('nfcps-watch-intelligence-learned')); window.dispatchEvent(new Event('nfcps-member-state-changed'));
}

function saveVerse(video:SharedWatchVideo,p:Passage,reason=''){
    const current=read<Array<Passage&{videoId:string;title:string;reason:string;at:string}>>(SAVED,[]);
    localStorage.setItem(SAVED,JSON.stringify([{...p,videoId:video.id,title:video.title,reason,at:new Date().toISOString()},...current.filter(x=>!(x.videoId===video.id&&x.reference===p.reference))].slice(0,100)));
    const memory=read<{videos:string[];themes:Record<string,number>;categories:Record<string,number>;scriptures:Record<string,number>;updatedAt:string}>(MEMORY,{videos:[],themes:{},categories:{},scriptures:{},updatedAt:''});
    memory.scriptures={...memory.scriptures,[p.reference]:(memory.scriptures[p.reference]||0)+2}; memory.updatedAt=new Date().toISOString(); localStorage.setItem(MEMORY,JSON.stringify(memory));
    window.dispatchEvent(new Event('nfcps-watch-intelligence-learned')); window.dispatchEvent(new Event('nfcps-member-state-changed'));
}

function Verse({video,passage,cue,onJump}:{video:SharedWatchVideo;passage:Passage;cue?:Cue;onJump?:(n:number)=>void}){
    const [saved,setSaved]=useState(()=>read<Array<{videoId:string;reference:string}>>(SAVED,[]).some(x=>x.videoId===video.id&&x.reference===passage.reference));
    return <article className='scripture-card'><div className='scripture-card-head'><span>{cue?relationName[cue.relation]:'Read'}</span><strong>{passage.reference}</strong><small>KJV</small></div><p>{passage.text}</p>{cue?.reason&&<em>{cue.reason}</em>}<div className='scripture-card-actions'>{cue&&onJump&&<button onClick={()=>onJump(cue.start)}><Clock3/>{stamp(cue.start)}</button>}<button className={saved?'active':''} onClick={()=>{saveVerse(video,passage,cue?.reason);setSaved(true)}}>{saved?<Check/>:<Bookmark/>}{saved?'Saved':'Save'}</button></div></article>;
}

export function ScriptureLensOverlay({video,currentTime,compact=false}:{video:SharedWatchVideo;currentTime:number;compact?:boolean}){
    const [data,setData]=useState<Package|null>(null); const [dismissed,setDismissed]=useState('');
    useEffect(()=>{let live=true;getPackage(video).then(p=>{if(live){setData(p);remember(video,p)}}).catch(()=>{});return()=>{live=false}},[video.id]);
    const cue=useMemo(()=>data?.scriptures.filter(x=>currentTime>=x.start-1.5&&currentTime<=x.end+2.5).sort((a,b)=>Math.abs(a.start-currentTime)-Math.abs(b.start-currentTime))[0]||null,[data,currentTime]);
    const passage=cue?data?.passages.find(x=>x.reference.toLowerCase()===cue.reference.toLowerCase()):null;
    if(!cue||!passage||dismissed===cue.reference)return null;
    return <aside className={compact?'scripture-lens-pop compact':'scripture-lens-pop'}><button className='scripture-lens-dismiss' onClick={()=>setDismissed(cue.reference)}><X/></button><button className='scripture-lens-body' onClick={()=>window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}><small><Sparkles/>SCRIPTURE LENS · {relationName[cue.relation]}</small><strong>{passage.reference}</strong><p>{passage.text.length>190?`${passage.text.slice(0,187)}…`:passage.text}</p><span>Read in context <ChevronRight/></span></button></aside>;
}

export function SermonIntelligenceV2({video,onJump}:{video:SharedWatchVideo;onJump:(n:number)=>void}){
    const [open,setOpen]=useState(false),[tab,setTab]=useState<Tab>('lens'),[data,setData]=useState<Package|null>(null),[loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[question,setQuestion]=useState(''),[asking,setAsking]=useState(false),[answer,setAnswer]=useState<AskResult|null>(null);
    const load=()=>{if(data||loading)return;setLoading(true);getPackage(video).then(p=>{setData(p);remember(video,p)}).catch(e=>setNotice(err(e))).finally(()=>setLoading(false))};
    useEffect(()=>{const ask=()=>{setOpen(true);setTab('ask');load()};const lens=()=>{setOpen(true);setTab('lens');load()};const map=()=>{setOpen(true);setTab('map');load()};window.addEventListener('nfcps-ask-sermon-open',ask);window.addEventListener('nfcps-scripture-lens-open',lens);window.addEventListener('nfcps-sermon-map-open',map);return()=>{window.removeEventListener('nfcps-ask-sermon-open',ask);window.removeEventListener('nfcps-scripture-lens-open',lens);window.removeEventListener('nfcps-sermon-map-open',map)}},[video.id,data,loading]);
    useEffect(()=>{if(open)load()},[open,video.id]);
    const passages=useMemo(()=>new Map((data?.passages||[]).map(x=>[x.reference.toLowerCase(),x])),[data]);
    const ask=async(e?:FormEvent)=>{e?.preventDefault();if(question.trim().length<3)return;setAsking(true);setNotice('');try{const r=await api.post(`/api/watch/sermon/${video.id}/ask`,{question:question.trim(),title:video.title,creator:video.creator,category:video.category});setAnswer(r.data as AskResult)}catch(cause){setNotice(err(cause))}finally{setAsking(false)}};
    if(!open)return null;
    const tabs:Array<[Tab,string]>=[['lens','Lens'],['map','Map'],['claims','Claims'],['ask','Ask'],['trail','Trail'],['graph','Connections']];
    return <section className='scripture-sheet deep-sheet'><header className='scripture-sheet-head'><div><small>WATCH INTELLIGENCE</small><h3>Scripture Lens</h3><p>See the message beside the Word.</p></div><button className='deep-sheet-close' onClick={()=>setOpen(false)}><X/></button></header><nav className='scripture-tabs'>{tabs.map(([k,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{l}</button>)}</nav>
    {loading&&<div className='scripture-loading'><LoaderCircle className='spin'/><div><strong>Preparing this message once.</strong><p>Mapping themes, claims and Scripture for reuse.</p></div></div>}
    {!loading&&data&&!data.available&&<p className='scripture-muted'>{data.reason||'Scripture Lens is learning this message from the speaker’s words. Keep the sermon playing and the map will grow automatically.'}</p>}
    {!loading&&data?.available&&tab==='lens'&&<div className='scripture-panel'><div className='scripture-summary'><small>MESSAGE OVERVIEW</small><p>{data.summary}</p><div>{data.themes.map(t=><span key={t}>{t}</span>)}</div></div><div className='scripture-list'>{data.scriptures.slice(0,12).map((c,i)=>{const p=passages.get(c.reference.toLowerCase());return p?<Verse key={`${c.reference}-${i}`} video={video} passage={p} cue={c} onJump={onJump}/>:null})}</div></div>}
    {!loading&&data?.available&&tab==='map'&&<div className='scripture-panel'><div className='panel-intro'><MapIcon/><div><strong>Sermon Map</strong><p>Navigate by ideas, not just minutes.</p></div></div><div className='sermon-map-list'>{data.chapters.map((c,i)=><button key={`${c.start}-${i}`} onClick={()=>{onJump(c.start);setOpen(false)}}><span>{stamp(c.start)}</span><div><strong>{c.title}</strong><p>{c.summary}</p></div><ChevronRight/></button>)}</div></div>}
    {!loading&&data?.available&&tab==='claims'&&<div className='scripture-panel'><div className='panel-intro'><SearchCheck/><div><strong>Examine the claims</strong><p>Read significant statements alongside Scripture; this is not an AI verdict on the preacher.</p></div></div><div className='claim-list'>{data.claims.map(c=><article key={c.id}><button className='claim-time' onClick={()=>{onJump(c.start);setOpen(false)}}><Clock3/>{stamp(c.start)}</button><h4>{c.claim}</h4>{c.note&&<p>{c.note}</p>}<div className='claim-refs support'><small>READ WITH</small>{c.supportRefs.map(r=><span key={r}>{r}</span>)}</div><div className='claim-refs compare'><small>COMPARE</small>{c.compareRefs.map(r=><span key={r}>{r}</span>)}</div>{[...c.supportRefs,...c.compareRefs].slice(0,3).map(r=>{const p=passages.get(r.toLowerCase());return p?<blockquote key={r}><strong>{p.reference}</strong><span>{p.text}</span></blockquote>:null})}</article>)}</div></div>}
    {!loading&&data?.available&&tab==='ask'&&<div className='scripture-panel'><div className='panel-intro'><MessageCircle/><div><strong>Ask This Sermon</strong><p>Grounded in transcript timestamps and canonical KJV passages.</p></div></div><div className='sermon-prompts'>{['What is the main point?','Which Scriptures support this?','What passages should I compare with this?','What should I apply?'].map(q=><button key={q} onClick={()=>setQuestion(q)}>{q}</button>)}</div><form className='scripture-ask-form' onSubmit={ask}><label><MessageCircle/><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder='Ask about this message or its Scripture basis'/><button disabled={asking||question.trim().length<3}>{asking?<LoaderCircle className='spin'/>:<Send/>}Ask</button></label></form>{answer?.available&&answer.answer&&<article className='sermon-answer scripture-answer'><p>{answer.answer}</p>{answer.evidence.map((x,i)=><button key={`${x.start}-${i}`} onClick={()=>{onJump(x.start);setOpen(false)}}><Clock3/><strong>{x.label}</strong><span>{x.text}</span><ChevronRight/></button>)}{(answer.passages||[]).map(p=><Verse key={p.reference} video={video} passage={p}/>)}</article>}{answer&&!answer.available&&<p className='scripture-muted'>{answer.reason}</p>}</div>}
    {!loading&&data?.available&&tab==='trail'&&<div className='scripture-panel'><div className='panel-intro'><ScrollText/><div><strong>Continue in Scripture</strong><p>A study trail for after the video.</p></div></div><div className='scripture-list'>{data.scriptureTrail.map(r=>{const p=passages.get(r.toLowerCase());return p?<Verse key={r} video={video} passage={p}/>:null})}</div></div>}
    {!loading&&data?.available&&tab==='graph'&&<div className='scripture-panel'><div className='panel-intro'><GitBranch/><div><strong>Message connections</strong><p>The knowledge graph linking themes, claims and passages.</p></div></div><div className='graph-list'>{data.graph.map((e,i)=><div key={`${e.from}-${i}`}><strong>{e.from}</strong><span>{e.relation}</span><strong>{e.to}</strong></div>)}</div></div>}
    {notice&&<p className='sermon-ai-notice'>{notice}</p>}</section>;
}

function recognitionCtor():RecognitionCtor|null{if(typeof window==='undefined')return null;const w=window as unknown as {SpeechRecognition?:RecognitionCtor;webkitSpeechRecognition?:RecognitionCtor};return w.SpeechRecognition||w.webkitSpeechRecognition||null}

export function LiveChurchLens(){
    const [open,setOpen]=useState(false),[listening,setListening]=useState(false),[speech,setSpeech]=useState(''),[manual,setManual]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[results,setResults]=useState<Array<LiveResult&{at:string}>>([]); const rec=useRef<Recognition|null>(null),last=useRef(0);
    useEffect(()=>{const show=()=>setOpen(true);window.addEventListener('nfcps-live-lens-open',show);return()=>window.removeEventListener('nfcps-live-lens-open',show)},[]);
    useEffect(()=>()=>{try{rec.current?.stop()}catch{}},[]);
    const analyze=async(text:string)=>{const excerpt=text.trim().slice(-1800);if(excerpt.length<20||busy)return;setBusy(true);setNotice('');try{const r=await api.post('/api/watch/live-lens',{text:excerpt});const v=r.data as LiveResult;if(v.available&&v.passages?.length)setResults(x=>[{...v,at:new Date().toISOString()},...x].slice(0,10))}catch(c){setNotice(err(c))}finally{setBusy(false)}};
    const start=()=>{const C=recognitionCtor();if(!C){setNotice('Live microphone transcription is not available in this browser. Type or paste what is being said below.');return}const r=new C();r.continuous=true;r.interimResults=true;r.lang='en-NG';r.onresult=e=>{let final='';for(let i=0;i<e.results.length;i++)if(e.results[i].isFinal)final+=` ${e.results[i][0]?.transcript||''}`;if(final.trim()){setSpeech(current=>{const next=`${current} ${final}`.replace(/\s+/g,' ').trim().slice(-2400);if(Date.now()-last.current>5000){last.current=Date.now();void analyze(next)}return next})}};r.onerror=()=>{setListening(false);setNotice('The microphone stopped. Restart it or use the text box.')};r.onend=()=>setListening(false);rec.current=r;try{r.start();setListening(true);setNotice('')}catch{setNotice('The microphone could not start on this device.')}};
    const stop=()=>{try{rec.current?.stop()}catch{}setListening(false)};
    if(!open)return null;
    return <section className='live-lens deep-sheet'><header className='scripture-sheet-head'><div><small>LIVE CHURCH MODE</small><h3>Live Scripture Lens</h3><p>Listen to the message. See passages worth reading alongside it.</p></div><button className='deep-sheet-close' onClick={()=>{stop();setOpen(false)}}><X/></button></header><div className='live-lens-hero'><div className={listening?'live-lens-orb listening':'live-lens-orb'}>{listening?<Mic/>:<MicOff/>}</div><div><strong>{listening?'Listening…':'Ready when the preacher begins.'}</strong><p>The browser transcribes audio; NFCPS sends only short text excerpts for Scripture matching.</p></div></div><button className={listening?'live-lens-start active':'live-lens-start'} onClick={listening?stop:start}>{listening?<><MicOff/> Stop listening</>:<><Mic/> Start Live Lens</>}</button>{speech&&<div className='live-transcript'><small>HEARD RECENTLY</small><p>{speech}</p></div>}<div className='live-manual'><label>Or type/paste what was said<textarea value={manual} onChange={e=>setManual(e.target.value)} placeholder='Sometimes waiting on God is part of how He forms endurance in us…'/></label><button disabled={busy||manual.trim().length<20} onClick={()=>void analyze(manual)}>{busy?<LoaderCircle className='spin'/>:<SearchCheck/>}Examine alongside Scripture</button></div><div className='live-results'>{results.map((r,i)=><article key={`${r.at}-${i}`}><small>{r.theme||'Scripture connection'}</small><p>{r.note}</p>{r.passages.map(p=><div key={p.reference}><strong>{p.reference}</strong><span>{p.text}</span><em>KJV</em></div>)}</article>)}</div>{notice&&<p className='sermon-ai-notice'>{notice}</p>}</section>;
}
