'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@appdeploy/client';
import {
  ArrowLeft, Bookmark, ChevronRight, Flame, Home, LibraryBig, MessageCircle,
  Play, Search, Share2, Sparkles, Target, ThumbsUp, UserRound, Users, X,
} from 'lucide-react';
import { WatchRoomExperience, type SharedWatchVideo } from '../../appdeploy-live/src/WatchDeepFeatures';
import { SermonIntelligenceV2 } from '../../appdeploy-live/src/ScriptureLens';
import { ShortsEngine } from '../../appdeploy-live/src/ShortsEngine';

type Video = SharedWatchVideo;
type Feed = { videos?: Video[]; lives?: Video[]; clips?: Video[] };
type Screen = 'home' | 'saved' | 'history';

const fallback: Video[] = [
  { id:'3RHdq_h0ZH4', title:'You Were Created For A Reason', creator:'Apostle Michael Orokpo', creatorKey:'orokpo', published:'2026-06-02T00:00:00Z', category:'Purpose', source:'curated', channelUrl:'https://www.youtube.com/@apostleorokpomichael' },
  { id:'sNb2hzZAk0I', title:'The Question of God', creator:'Apostle Emmanuel Iren', creatorKey:'iren', published:'2026-03-17T00:00:00Z', category:'Bible Study', source:'curated', channelUrl:'https://www.youtube.com/@pst_iren' },
  { id:'IgyAYG5D8fM', title:'How to Pray Daily', creator:'Apostle Emmanuel Iren', creatorKey:'iren', published:'2026-02-11T00:00:00Z', category:'Prayer', source:'curated', channelUrl:'https://www.youtube.com/@pst_iren' },
  { id:'VtEV3LcG49U', title:'50 Days of Pentecost · Day 1', creator:'Apostle Edu Udechukwu', creatorKey:'edu', published:'2026-01-13T00:00:00Z', category:'Revival', source:'curated', channelUrl:'https://www.youtube.com/@ApostleEduUdechukwu' },
  { id:'SpZnHUsX2mI', title:'The Dealings of a Deliverer', creator:'Apostle Effa Emmanuel Isaac', creatorKey:'effa', published:'2026-01-07T00:00:00Z', category:'Discipleship', source:'curated', channelUrl:'https://www.youtube.com/@apostleeffaemmanuelisaac' },
  { id:'hNEghsp78Nc', title:'Favour', creator:'Lawrence Oyor', creatorKey:'lawrence', published:'2025-01-01T00:00:00Z', category:'Worship', source:'curated', channelUrl:'https://www.youtube.com/@LawrenceOyor' },
  { id:'Jy8s0NXriI0', title:'Spiritual Consciousness', creator:'Apostle Arome Osayi', creatorKey:'arome', published:'2024-05-06T00:00:00Z', category:'Spiritual Growth', source:'curated', channelUrl:'https://www.youtube.com/@apostlearomeosayi' },
  { id:'jeoLYMBdo50', title:'Quest For God · Weekly Bible Study', creator:'Bro. Gbile Akanni', creatorKey:'gbile', published:'2020-07-11T00:00:00Z', category:'Bible Study', source:'curated', channelUrl:'https://www.youtube.com/user/LivingseedTeam' },
];

const image = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const read = <T,>(key: string, fallbackValue: T): T => {
  if (typeof window === 'undefined') return fallbackValue;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallbackValue; }
};
const write = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('nfcps-member-state-changed'));
};
const unique = (items: Video[]) => Array.from(new Map(items.map(item => [item.id, item])).values());

function Card({ video, onOpen }: { video: Video; onOpen: (video: Video) => void }) {
  return <button className='wv3-card' onClick={() => onOpen(video)}>
    <div className='wv3-card-image'><img src={image(video.id)} alt='' loading='lazy'/><span><Play/></span></div>
    <strong>{video.title}</strong>
    <small>{video.creator}</small>
  </button>;
}

function Rail({ title, items, onOpen }: { title: string; items: Video[]; onOpen: (video: Video) => void }) {
  if (!items.length) return null;
  return <section className='wv3-rail'>
    <div className='wv3-rail-title'><h2>{title}</h2></div>
    <div className='wv3-rail-scroll'>{items.map(video => <Card key={`${title}-${video.id}`} video={video} onOpen={onOpen}/>)}</div>
  </section>;
}

function Dock() {
  return <nav className='cx-dock cx-watch-dock'>
    <a href='../'><Home/><span>Home</span></a>
    <a href='../#read'><LibraryBig/><span>Read</span></a>
    <a className='active' href='./'><Flame/><span>Watch</span></a>
    <a href='../#you'><UserRound/><span>You</span></a>
  </nav>;
}

export default function WatchFrontDoor() {
  const [videos, setVideos] = useState<Video[]>(fallback);
  const [clips, setClips] = useState<Video[]>([]);
  const [lives, setLives] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [shortsOpen, setShortsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [screen, setScreen] = useState<Screen>('home');
  const [saved, setSaved] = useState<Video[]>([]);
  const [history, setHistory] = useState<Video[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [playerStart, setPlayerStart] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setSaved(read('nfcps-watch-later', []));
    setHistory(read('nfcps-watch-history', []));
    setLiked(read('nfcps-watch-liked', []));
    const params = new URLSearchParams(location.search);
    if (params.get('saved') === '1') setScreen('saved');
    if (params.get('history') === '1') setScreen('history');
    let live = true;
    api.get('/api/watch/feed').then(response => {
      if (!live) return;
      const feed = response.data as Feed;
      setVideos(unique([...(Array.isArray(feed.videos) ? feed.videos : []), ...fallback]));
      setClips(Array.isArray(feed.clips) ? feed.clips : []);
      setLives(Array.isArray(feed.lives) ? feed.lives : []);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const long = useMemo(() => unique([...lives, ...videos.filter(video => video.source !== 'clip')]), [lives, videos]);
  const filtered = useMemo(() => {
    let next = long;
    if (filter === 'Prayer') next = next.filter(v => /prayer|intercession/i.test(`${v.category} ${v.title}`));
    if (filter === 'Worship') next = next.filter(v => /worship|praise|revival/i.test(`${v.category} ${v.title}`));
    if (filter === 'Bible') next = next.filter(v => /bible|scripture|discipleship|teaching/i.test(`${v.category} ${v.title}`));
    if (filter === 'Live') next = lives;
    const q = query.trim().toLowerCase();
    return q ? next.filter(v => `${v.title} ${v.creator} ${v.category}`.toLowerCase().includes(q)) : next;
  }, [long, lives, filter, query]);

  const savedIds = useMemo(() => new Set(saved.map(v => v.id)), [saved]);
  const likedIds = useMemo(() => new Set(liked), [liked]);
  const featured = filtered[0] || long[0] || fallback[0];
  const shortsItems = clips.length ? clips : long;

  const open = (video: Video) => {
    setSelected(video);
    setPlayerStart(0);
    setShortsOpen(false);
    const next = unique([video, ...history]).slice(0, 80);
    setHistory(next);
    write('nfcps-watch-history', next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSave = (video: Video) => {
    const next = savedIds.has(video.id) ? saved.filter(v => v.id !== video.id) : unique([video, ...saved]);
    setSaved(next);
    write('nfcps-watch-later', next);
    setToast(savedIds.has(video.id) ? 'Removed from Watch Later' : 'Saved to Watch Later');
    window.setTimeout(() => setToast(''), 1400);
  };

  const toggleLike = (video: Video) => {
    const next = likedIds.has(video.id) ? liked.filter(id => id !== video.id) : [video.id, ...liked];
    setLiked(next);
    write('nfcps-watch-liked', next);
  };

  const share = async (video: Video) => {
    const url = `https://youtu.be/${video.id}`;
    try {
      if (navigator.share) await navigator.share({ title: video.title, text: `${video.creator} · NFCPS Watch`, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const getMoreShorts = async () => {
    try {
      const response = await api.get('/api/watch/shorts/feed');
      const next = Array.isArray(response.data?.clips) ? response.data.clips as Video[] : [];
      if (next.length) setClips(current => unique([...current, ...next]));
      return next;
    } catch { return [] as Video[]; }
  };

  if (shortsOpen) {
    return <ShortsEngine
      items={shortsItems}
      liked={likedIds}
      saved={savedIds}
      onLike={toggleLike}
      onSave={toggleSave}
      onOpen={open}
      onClose={() => setShortsOpen(false)}
      onShare={video => void share(video)}
      onNeedMore={getMoreShorts}
    />;
  }

  if (selected) {
    return <main className='wv3-app wv3-selected'>
      <div className='wv3-selected-bar'>
        <button onClick={() => setSelected(null)}><ArrowLeft/></button>
        <span>Watch</span>
        <a href='../#you' className='cx-avatar'><UserRound/></a>
      </div>
      <div className='wv3-player'>
        <WatchRoomExperience video={selected} startAt={playerStart} onRoomVideo={setSelected}/>
      </div>
      <section className='wv3-info'>
        <div className='watch-source-first-badge'><Sparkles/><span>Source-first Scripture Lens</span></div>
        <h1>{selected.title}</h1>
        <div className='wv3-creator'><span>{selected.creator.split(/\s+/).slice(-2).map(x => x[0]).join('').toUpperCase()}</span><div><strong>{selected.creator}</strong><small>{selected.category}</small></div></div>
        <div className='wv3-actions'>
          <button className={likedIds.has(selected.id) ? 'active' : ''} onClick={() => toggleLike(selected)}><ThumbsUp/><span>Like</span></button>
          <button onClick={() => void share(selected)}><Share2/><span>Share</span></button>
          <button className={savedIds.has(selected.id) ? 'active' : ''} onClick={() => toggleSave(selected)}><Bookmark/><span>Save</span></button>
          <button onClick={() => window.dispatchEvent(new Event('nfcps-watch-together-open'))}><Users/><span>Together</span></button>
        </div>
        <button className='wv3-ask' onClick={() => window.dispatchEvent(new Event('nfcps-ask-sermon-open'))}><MessageCircle/><span>Ask about this message…</span><ChevronRight/></button>
        <button className='wv3-grow-link' onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}><Target/>Open Scripture Lens <ChevronRight/></button>
        <Rail title='Up Next' items={long.filter(v => v.id !== selected.id).slice(0, 10)} onOpen={open}/>
      </section>
      <SermonIntelligenceV2 video={selected} onJump={setPlayerStart}/>
      {toast && <div className='wv3-toast'>{toast}</div>}
    </main>;
  }

  if (screen !== 'home') {
    const list = screen === 'saved' ? saved : history;
    return <main className='wv3-app'>
      <section className='wv3-secondary'>
        <div className='wv3-secondary-bar'><button onClick={() => setScreen('home')}><ArrowLeft/></button><div><h1>{screen === 'saved' ? 'Watch Later' : 'Watch History'}</h1><p>{list.length ? `${list.length} messages` : 'Nothing here yet.'}</p></div></div>
        <div className='wv3-grid'>{list.map(video => <Card key={video.id} video={video} onOpen={open}/>)}</div>
        <Dock/>
      </section>
    </main>;
  }

  return <main className='wv3-app'>
    <div className='wv3-pagebar'>
      <div><h1>Watch</h1><p>Messages for real life.</p></div>
      <div><button onClick={() => setSearchOpen(value => !value)}><Search/></button><a href='../#you' className='cx-avatar'><UserRound/></a></div>
    </div>

    {searchOpen && <label className='wv3-search'><Search/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder='Search messages or creators'/>{query && <button onClick={() => setQuery('')}><X/></button>}</label>}

    <div className='wv3-filters'>{['All','Prayer','Worship','Bible','Live'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>

    <section className='watch-source-first-banner'>
      <Sparkles/>
      <div><small>WATCH LENS</small><strong>Follow the message beside the Word.</strong><p>Normal Watch now prefers reusable trusted creator, ministry and podcast sources — not your microphone and not YouTube captions.</p></div>
    </section>

    <section className='wv3-hero'>
      <img src={image(featured.id)} alt=''/><i/>
      <div className='wv3-hero-copy'><small>NFCPS WATCH</small><h2>{featured.title}</h2><p>{featured.creator}</p><div><button onClick={() => open(featured)}><Play/>Play</button><button onClick={() => toggleSave(featured)}><Bookmark/>Save</button></div></div>
    </section>

    {history.length > 0 && <Rail title='Continue Watching' items={history.slice(0, 8)} onOpen={open}/>} 
    <Rail title={query ? 'Results' : 'For You'} items={filtered.slice(1, 11)} onOpen={open}/>

    <section className='wv3-shorts-preview'>
      <div className='wv3-rail-title'><h2>Shorts</h2><button onClick={() => setShortsOpen(true)}>Open <ChevronRight/></button></div>
      <div>{shortsItems.slice(0, 5).map(video => <button key={video.id} onClick={() => setShortsOpen(true)}><img src={image(video.id)} alt=''/><i/><span>{video.title}</span></button>)}</div>
    </section>

    <Rail title='More to Explore' items={filtered.slice(5, 15)} onOpen={open}/>

    <section className='wv3-quick-links'>
      <button onClick={() => setScreen('saved')}><Bookmark/><span>Watch Later</span><ChevronRight/></button>
      <button onClick={() => setScreen('history')}><Flame/><span>History</span><ChevronRight/></button>
    </section>
    <Dock/>
    {toast && <div className='wv3-toast'>{toast}</div>}
  </main>;
}
