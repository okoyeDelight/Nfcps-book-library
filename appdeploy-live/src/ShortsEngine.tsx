'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, ChevronRight, LoaderCircle, Search, Share2, ThumbsUp, Volume2, VolumeX } from 'lucide-react';
import type { SharedWatchVideo } from './WatchDeepFeatures';

type Video = SharedWatchVideo;

type Affinity = {
  categories: Record<string, number>;
  creators: Record<string, number>;
  seen: Record<string, number>;
  updatedAt: string;
};

type ShortYTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type ShortYTApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onAutoplayBlocked?: () => void;
        onError?: () => void;
      };
    },
  ) => ShortYTPlayer;
};

type ShortsEngineProps = {
  items: Video[];
  liked: Set<string>;
  saved: Set<string>;
  onLike: (video: Video) => void;
  onSave: (video: Video) => void;
  onOpen: (video: Video) => void;
  onClose: () => void;
  onShare: (video: Video) => void;
  onNeedMore: () => Promise<Video[]>;
};

const AFFINITY_KEY = 'nfcps-shorts-affinity-v2';
const SOUND_KEY = 'nfcps-shorts-sound';
let shortYTLoad: Promise<ShortYTApi> | null = null;

const emptyAffinity = (): Affinity => ({ categories: {}, creators: {}, seen: {}, updatedAt: new Date(0).toISOString() });

function readAffinity() {
  if (typeof window === 'undefined') return emptyAffinity();
  try {
    const value = JSON.parse(localStorage.getItem(AFFINITY_KEY) || '') as Partial<Affinity>;
    return {
      categories: value.categories || {},
      creators: value.creators || {},
      seen: value.seen || {},
      updatedAt: value.updatedAt || new Date(0).toISOString(),
    };
  } catch {
    return emptyAffinity();
  }
}

function storeAffinity(value: Affinity) {
  localStorage.setItem(AFFINITY_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event('nfcps-member-state-changed'));
}

function loadShortYT() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Shorts player unavailable'));
  const current = (window as unknown as { YT?: ShortYTApi }).YT;
  if (current?.Player) return Promise.resolve(current);
  if (shortYTLoad) return shortYTLoad;

  shortYTLoad = new Promise<ShortYTApi>((resolve, reject) => {
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube Shorts player could not load'));
      document.head.appendChild(script);
    }

    const startedAt = Date.now();
    const poll = () => {
      const api = (window as unknown as { YT?: ShortYTApi }).YT;
      if (api?.Player) {
        resolve(api);
        return;
      }
      if (Date.now() - startedAt > 8_000) {
        reject(new Error('YouTube Shorts player did not initialize'));
        return;
      }
      window.setTimeout(poll, 100);
    };
    poll();
  });

  return shortYTLoad;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function thumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}

function clampScore(value: number) {
  return Math.max(-24, Math.min(40, value));
}

function smartOrder(items: Video[], affinity: Affinity, seed: string) {
  const unique = Array.from(new Map(items.map(video => [video.id, video])).values());
  const score = (video: Video) => {
    const category = affinity.categories[video.category.toLowerCase()] || 0;
    const creator = affinity.creators[video.creatorKey] || 0;
    const seen = affinity.seen[video.id] || 0;
    return category * 1.7 + creator * 2.4 - Math.min(4, seen) * 1.4 + (hash(`${seed}:${video.id}`) % 1000) / 4000;
  };
  const ranked = [...unique].sort((a, b) => score(b) - score(a));
  const explore = [...unique].sort((a, b) => hash(`${seed}:explore:${a.id}`) - hash(`${seed}:explore:${b.id}`));
  const output: Video[] = [];
  const used = new Set<string>();

  for (let index = 0; index < unique.length; index += 1) {
    const source = index % 5 === 4 ? explore : ranked;
    const recentCreators = new Set(output.slice(-2).map(video => video.creatorKey));
    let next = source.find(video => !used.has(video.id) && !recentCreators.has(video.creatorKey));
    if (!next) next = source.find(video => !used.has(video.id));
    if (!next) next = ranked.find(video => !used.has(video.id));
    if (!next) break;
    used.add(next.id);
    output.push(next);
  }

  return output;
}

function ShortPlayer({
  video,
  active,
  soundOn,
  soundKick,
  onBlocked,
  onProgress,
  onEnded,
}: {
  video: Video;
  active: boolean;
  soundOn: boolean;
  soundKick: number;
  onBlocked: () => void;
  onProgress: (seconds: number, duration: number) => void;
  onEnded: () => void;
}) {
  const mount = useRef<HTMLDivElement | null>(null);
  const player = useRef<ShortYTPlayer | null>(null);
  const activeRef = useRef(active);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    let live = true;
    setReady(false);
    setFailed(false);

    loadShortYT()
      .then(api => {
        if (!live || !mount.current) return;
        const instance = new api.Player(mount.current, {
          videoId: video.id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            modestbranding: 1,
            playsinline: 1,
            playlist: video.id,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (!live) return;
              player.current = instance;
              setReady(true);
              if (!activeRef.current) {
                instance.mute();
                instance.pauseVideo();
              }
            },
            onStateChange: event => {
              if (!live || !activeRef.current) return;
              if (event.data === 0) {
                onEnded();
                instance.seekTo(0, true);
                instance.playVideo();
              }
            },
            onAutoplayBlocked: () => {
              if (!live || !activeRef.current) return;
              instance.mute();
              instance.playVideo();
              onBlocked();
            },
            onError: () => setFailed(true),
          },
        });
        player.current = instance;
      })
      .catch(() => setFailed(true));

    return () => {
      live = false;
      try {
        player.current?.destroy();
      } catch {
        // YouTube may already have released the iframe.
      }
      player.current = null;
    };
  }, [video.id]);

  useEffect(() => {
    if (!ready || !player.current) return;
    const current = player.current;
    if (!active) {
      current.mute();
      current.pauseVideo();
      return;
    }
    if (soundOn) {
      current.unMute();
      current.setVolume(100);
    } else {
      current.mute();
    }
    current.playVideo();
  }, [active, ready, soundOn, soundKick]);

  useEffect(() => {
    if (!active || !ready) return;
    const timer = window.setInterval(() => {
      const current = player.current;
      if (!current) return;
      onProgress(Math.max(0, current.getCurrentTime() || 0), Math.max(0, current.getDuration() || 0));
    }, 1_200);
    return () => window.clearInterval(timer);
  }, [active, ready, onProgress]);

  if (failed) {
    return (
      <iframe
        className='nfcps-short-fallback'
        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=${soundOn ? 0 : 1}&playsinline=1&rel=0&modestbranding=1&controls=1`}
        title={video.title}
        allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
        allowFullScreen
      />
    );
  }

  return (
    <div className='nfcps-short-player'>
      <div ref={mount} />
      {!ready && <span className='nfcps-short-buffer'><LoaderCircle /></span>}
    </div>
  );
}

export function ShortsEngine({ items, liked, saved, onLike, onSave, onOpen, onClose, onShare, onNeedMore }: ShortsEngineProps) {
  const initialAffinity = useMemo(() => readAffinity(), []);
  const sessionSeed = useMemo(() => `${Date.now()}:${Math.random().toString(36).slice(2)}`, []);
  const [affinity, setAffinity] = useState<Affinity>(initialAffinity);
  const [queue, setQueue] = useState<Video[]>(() => smartOrder(items, initialAffinity, sessionSeed));
  const [active, setActive] = useState(0);
  const [soundOn, setSoundOn] = useState(() => typeof window === 'undefined' || localStorage.getItem(SOUND_KEY) !== 'off');
  const [soundKick, setSoundKick] = useState(0);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recycleRound, setRecycleRound] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const activeRef = useRef(0);
  const queueRef = useRef(queue);
  const progressRef = useRef<Record<number, { seconds: number; ratio: number }>>({});
  const finalizedRef = useRef(new Set<number>());
  const replenishingRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const learn = (video: Video, delta: number, markSeen = false) => {
    setAffinity(current => {
      const categoryKey = video.category.toLowerCase();
      const next: Affinity = {
        categories: {
          ...current.categories,
          [categoryKey]: clampScore((current.categories[categoryKey] || 0) + delta),
        },
        creators: {
          ...current.creators,
          [video.creatorKey]: clampScore((current.creators[video.creatorKey] || 0) + delta),
        },
        seen: {
          ...current.seen,
          [video.id]: (current.seen[video.id] || 0) + (markSeen ? 1 : 0),
        },
        updatedAt: new Date().toISOString(),
      };
      storeAffinity(next);
      return next;
    });
  };

  const finalize = (index: number) => {
    if (finalizedRef.current.has(index)) return;
    const video = queueRef.current[index];
    if (!video) return;
    finalizedRef.current.add(index);
    const progress = progressRef.current[index] || { seconds: 0, ratio: 0 };
    const delta = progress.ratio >= 0.85 || progress.seconds >= 35
      ? 3
      : progress.ratio >= 0.5 || progress.seconds >= 15
        ? 1.5
        : progress.seconds < 2.5
          ? -1.5
          : 0;
    learn(video, delta, true);
  };

  const activate = (next: number) => {
    const bounded = Math.max(0, Math.min(queueRef.current.length - 1, next));
    if (!Number.isFinite(bounded) || bounded === activeRef.current) return;
    finalize(activeRef.current);
    activeRef.current = bounded;
    setActive(bounded);
    setSoundBlocked(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.72) activate(Number((entry.target as HTMLElement).dataset.i || 0));
        }
      },
      { threshold: [0.72, 0.9] },
    );
    refs.current.slice(0, queue.length).forEach(element => element && observer.observe(element));
    return () => observer.disconnect();
  }, [queue.length]);

  useEffect(() => {
    setQueue(current => {
      const known = new Set(current.map(video => video.id));
      const fresh = items.filter(video => !known.has(video.id));
      if (!fresh.length) return current;
      return [...current, ...smartOrder(fresh, affinity, `${sessionSeed}:new:${current.length}`)];
    });
  }, [items, sessionSeed]);

  useEffect(() => {
    setQueue(current => {
      if (current.length <= active + 3) return current;
      const fixed = current.slice(0, active + 3);
      const future = smartOrder(current.slice(active + 3), affinity, `${sessionSeed}:live:${active}`);
      return [...fixed, ...future];
    });
  }, [affinity.updatedAt]);

  const replenish = async () => {
    if (replenishingRef.current) return;
    replenishingRef.current = true;
    setLoadingMore(true);
    try {
      const incoming = await onNeedMore();
      const existing = new Set(queueRef.current.map(video => video.id));
      const fresh = incoming.filter(video => !existing.has(video.id));
      if (fresh.length) {
        setQueue(current => [...current, ...smartOrder(fresh, affinity, `${sessionSeed}:refill:${current.length}`)]);
      } else if (items.length > 5) {
        const nextRound = recycleRound + 1;
        setRecycleRound(nextRound);
        const recycled = smartOrder(items, affinity, `${sessionSeed}:recycle:${nextRound}`);
        setQueue(current => [...current, ...recycled]);
      }
    } finally {
      replenishingRef.current = false;
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (queue.length && active >= queue.length - 8) void replenish();
  }, [active, queue.length]);

  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const next = Math.round(element.scrollTop / Math.max(1, element.clientHeight));
    if (Number.isFinite(next)) activate(next);
  };

  const toggleSound = () => {
    if (soundBlocked) {
      setSoundBlocked(false);
      setSoundOn(true);
      localStorage.setItem(SOUND_KEY, 'on');
      setSoundKick(value => value + 1);
      return;
    }
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    setSoundKick(value => value + 1);
  };

  if (!queue.length) {
    return (
      <section className='wv3-shorts wv3-shorts-empty-v2'>
        <button onClick={onClose} aria-label='Back to Watch'><ArrowLeft /></button>
        <LoaderCircle />
        <h2>Refreshing Shorts…</h2>
        <p>The Watch engine is gathering the next Christian clips.</p>
      </section>
    );
  }

  return (
    <section className='wv3-shorts'>
      <div className='wv3-shorts-top'>
        <button onClick={() => { finalize(activeRef.current); onClose(); }} aria-label='Back to Watch'><ArrowLeft /></button>
        <div><strong>Shorts</strong><span>For You</span></div>
        <Search />
      </div>
      <div className='wv3-shorts-feed' onScroll={onScroll}>
        {queue.map((video, index) => {
          const warm = Math.abs(index - active) <= 1;
          return (
            <article key={`${video.id}-${index}`} data-i={index} ref={element => { refs.current[index] = element; }}>
              <div className='wv3-short-media'>
                {warm ? (
                  <ShortPlayer
                    video={video}
                    active={active === index}
                    soundOn={soundOn}
                    soundKick={soundKick}
                    onBlocked={() => setSoundBlocked(true)}
                    onProgress={(seconds, duration) => {
                      progressRef.current[index] = {
                        seconds: Math.max(progressRef.current[index]?.seconds || 0, seconds),
                        ratio: duration > 0 ? Math.max(progressRef.current[index]?.ratio || 0, seconds / duration) : 0,
                      };
                    }}
                    onEnded={() => {
                      if (!finalizedRef.current.has(index)) {
                        finalizedRef.current.add(index);
                        learn(video, 4, true);
                      }
                    }}
                  />
                ) : <img loading='lazy' src={thumb(video.id)} alt='' />}
                <i />
                {active === index && soundBlocked && soundOn && (
                  <button className='wv3-short-unmute' onClick={toggleSound}><Volume2 />Tap for sound</button>
                )}
              </div>
              <div className='wv3-short-copy'>
                <h2>{video.title}</h2>
                <div>
                  <span>{initials(video.creator)}</span>
                  <p><strong>{video.creator}</strong><small>{video.category}</small></p>
                </div>
                <button onClick={() => { learn(video, 5, true); onOpen(video); }}>Watch full message <ChevronRight /></button>
              </div>
              <aside>
                <button className={soundOn ? 'wv3-short-sound active' : 'wv3-short-sound'} onClick={toggleSound} aria-label={soundOn ? 'Mute Shorts' : 'Turn Shorts sound on'}>
                  {soundOn ? <Volume2 /> : <VolumeX />}<small>{soundOn ? 'Sound' : 'Muted'}</small>
                </button>
                <button className={liked.has(video.id) ? 'active' : ''} onClick={() => { learn(video, liked.has(video.id) ? -1 : 3); onLike(video); }}><ThumbsUp /><small>Like</small></button>
                <button className={saved.has(video.id) ? 'active' : ''} onClick={() => { learn(video, saved.has(video.id) ? -1 : 4); onSave(video); }}><Bookmark /><small>Save</small></button>
                <button onClick={() => { learn(video, 2); onShare(video); }}><Share2 /><small>Share</small></button>
              </aside>
              {loadingMore && index === queue.length - 1 && <span className='wv3-short-loading'><LoaderCircle />Finding more…</span>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
