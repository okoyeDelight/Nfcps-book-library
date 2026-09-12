'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import { ChevronRight, LoaderCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import type { SharedWatchVideo } from './WatchDeepFeatures';
import { invalidateSermonPackage } from './ScriptureLens';

type Passage = { reference: string; text: string; translation: 'KJV' };
type Cue = { reference: string; start: number; end: number; relation: string; reason: string };
type DeepPackage = { available: boolean; scriptures?: Cue[]; passages?: Passage[] };
type TranscriptMeta = {
    available: boolean;
    source?: string;
    language?: string;
    segments?: number;
    durationSeconds?: number;
    reason?: string | null;
};

type SourceState = 'checking' | 'prepared' | 'unprepared';

const TRUSTED_SOURCE_TYPES = new Set([
    'trusted-podcast-audio',
    'trusted-source-audio',
    'official-source-audio',
    'official-podcast-audio',
    'creator-source-audio',
]);

function packageUrl(video: SharedWatchVideo) {
    const query = new URLSearchParams({ title: video.title, creator: video.creator, category: video.category });
    return `/api/watch/sermon/${video.id}/intelligence?${query}`;
}

function transcriptUrl(video: SharedWatchVideo) {
    const query = new URLSearchParams({ title: video.title, creator: video.creator });
    return `/api/watch/sermon/${video.id}/transcript?${query}`;
}

function trusted(meta: TranscriptMeta | null | undefined) {
    return Boolean(meta?.available && meta.source && TRUSTED_SOURCE_TYPES.has(meta.source));
}

function sourceLabel(source?: string) {
    if (source === 'trusted-podcast-audio') return 'Trusted creator audio';
    if (source === 'official-podcast-audio') return 'Official podcast audio';
    if (source === 'official-source-audio') return 'Official sermon source';
    if (source === 'creator-source-audio') return 'Creator source audio';
    if (source === 'trusted-source-audio') return 'Trusted sermon source';
    return 'Source Resolver';
}

export function SpokenSermonLens({ video, currentTime }: { video: SharedWatchVideo; currentTime: number }) {
    const [dismissed, setDismissed] = useState(false);
    const [deep, setDeep] = useState<DeepPackage | null>(null);
    const [transcriptMeta, setTranscriptMeta] = useState<TranscriptMeta | null>(null);
    const [sourceState, setSourceState] = useState<SourceState>('checking');
    const [preparingSource, setPreparingSource] = useState(false);
    const [notice, setNotice] = useState('');
    const [timelineTime, setTimelineTime] = useState(currentTime);
    const currentTimeRef = useRef(currentTime);
    const mountedAtRef = useRef(Date.now());
    const lastKnownTimeRef = useRef(currentTime);
    const lastKnownAtRef = useRef(Date.now());
    const preparedBucketRef = useRef(-1);
    const requestIdRef = useRef(0);

    function effectiveTime() {
        const reported = currentTimeRef.current;
        if (reported > 0.4) return reported;
        const sinceMount = Math.max(0, (Date.now() - mountedAtRef.current) / 1000);
        const extrapolated = Math.max(0, lastKnownTimeRef.current + (Date.now() - lastKnownAtRef.current) / 1000);
        return Math.max(sinceMount, extrapolated);
    }

    useEffect(() => {
        currentTimeRef.current = currentTime;
        if (currentTime > 0.4) {
            lastKnownTimeRef.current = currentTime;
            lastKnownAtRef.current = Date.now();
            setTimelineTime(currentTime);
        }
    }, [currentTime]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (currentTimeRef.current <= 0.4) setTimelineTime(effectiveTime());
        }, 1000);
        return () => window.clearInterval(timer);
    }, [video.id]);

    async function loadPackage() {
        invalidateSermonPackage(video.id);
        try {
            const packageResponse = await api.get(packageUrl(video));
            if (packageResponse.data?.available) {
                setDeep(packageResponse.data as DeepPackage);
                window.dispatchEvent(new CustomEvent('nfcps-sermon-intelligence-ready', { detail: { videoId: video.id } }));
            }
        } catch {
            setNotice('The trusted transcript is ready. Deeper Scripture mapping is still preparing.');
        }
    }

    async function fetchTrustedMeta() {
        try {
            const response = await api.get(transcriptUrl(video));
            const meta = response.data as TranscriptMeta;
            if (trusted(meta)) return meta;
            return null;
        } catch {
            return null;
        }
    }

    async function resolveSource(at: number, announce = true) {
        const requestId = ++requestIdRef.current;
        setPreparingSource(true);
        if (announce) setNotice('Finding a trusted creator or ministry source for this message…');
        try {
            const prepared = await api.post(`/api/watch/sermon/${video.id}/prepare-source`, {
                title: video.title,
                creator: video.creator,
                category: video.category,
                at: Math.max(0, at),
            });
            if (requestId !== requestIdRef.current) return false;
            if (!prepared.data?.available) {
                const reason = String(prepared.data?.reason || '').trim();
                setSourceState('unprepared');
                setNotice(reason || 'No reusable trusted source has been resolved for this message yet. You can keep watching normally.');
                return false;
            }
            const meta = await fetchTrustedMeta();
            if (requestId !== requestIdRef.current) return false;
            if (!meta) {
                setSourceState('unprepared');
                setNotice('A source was found, but NFCPS is still preparing the reusable sermon transcript.');
                return false;
            }
            setTranscriptMeta(meta);
            setSourceState('prepared');
            setNotice('');
            preparedBucketRef.current = Math.max(0, Math.floor(at / 60));
            await loadPackage();
            return true;
        } catch {
            if (requestId !== requestIdRef.current) return false;
            setSourceState('unprepared');
            setNotice('Source Resolver could not prepare this message right now. You can keep watching normally.');
            return false;
        } finally {
            if (requestId === requestIdRef.current) setPreparingSource(false);
        }
    }

    useEffect(() => {
        requestIdRef.current += 1;
        preparedBucketRef.current = -1;
        mountedAtRef.current = Date.now();
        lastKnownTimeRef.current = 0;
        lastKnownAtRef.current = Date.now();
        setTimelineTime(0);
        setDeep(null);
        setTranscriptMeta(null);
        setSourceState('checking');
        setPreparingSource(false);
        setDismissed(false);
        setNotice('');
        let live = true;

        const start = async () => {
            const meta = await fetchTrustedMeta();
            if (!live) return;
            if (meta) {
                setTranscriptMeta(meta);
                setSourceState('prepared');
                preparedBucketRef.current = 0;
                setNotice('');
                await loadPackage();
                return;
            }
            if (!live) return;
            await resolveSource(0, true);
        };

        void start();
        return () => {
            live = false;
            requestIdRef.current += 1;
        };
    }, [video.id]);

    useEffect(() => {
        if (sourceState !== 'prepared' || !trusted(transcriptMeta) || preparingSource) return;
        const bucket = Math.max(0, Math.floor(timelineTime / 60));
        if (bucket === preparedBucketRef.current) return;
        preparedBucketRef.current = bucket;
        void resolveSource(timelineTime, false);
    }, [Math.floor(timelineTime / 60), sourceState, transcriptMeta?.source, video.id]);

    const activeCue = useMemo(() => {
        return (deep?.scriptures || [])
            .filter(cue => timelineTime >= cue.start - 1.5 && timelineTime <= cue.end + 3)
            .sort((a, b) => Math.abs(a.start - timelineTime) - Math.abs(b.start - timelineTime))[0] || null;
    }, [deep, timelineTime]);

    const passage = activeCue
        ? (deep?.passages || []).find(item => item.reference.toLowerCase() === activeCue.reference.toLowerCase()) || null
        : null;

    const footerLabel = sourceState === 'prepared'
        ? `${sourceLabel(transcriptMeta?.source)} · reusable intelligence`
        : preparingSource
            ? 'Source Resolver · preparing'
            : 'Source Resolver · waiting for a trusted source';

    if (dismissed) {
        return (
            <button className='sermon-lens-pill' onClick={() => setDismissed(false)}>
                <Sparkles />
                <span>Scripture Lens</span>
            </button>
        );
    }

    return (
        <aside className='sermon-auto-lens'>
            <header>
                <div className='sermon-auto-lens-title'>
                    <Sparkles />
                    <span>
                        <small>SCRIPTURE LENS</small>
                        <strong>{preparingSource ? 'Preparing the message' : sourceState === 'prepared' ? 'Following the message' : sourceState === 'checking' ? 'Finding the source' : 'Source still resolving'}</strong>
                    </span>
                </div>
                <div className='sermon-auto-lens-tools'>
                    {preparingSource && <LoaderCircle className='spin' />}
                    <button aria-label='Collapse Scripture Lens' onClick={() => setDismissed(true)}><X /></button>
                </div>
            </header>

            {passage ? (
                <button className='sermon-auto-lens-passage' onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}>
                    <div><strong>{passage.reference}</strong><small>KJV</small></div>
                    <p>{passage.text}</p>
                    {activeCue?.reason && <span>{activeCue.reason}</span>}
                </button>
            ) : (
                <div className='sermon-auto-lens-waiting'>
                    <strong>{sourceState === 'prepared' ? 'Mapping this part of the sermon…' : preparingSource ? 'NFCPS is resolving the sermon from a trusted source…' : 'No reusable trusted source is ready yet.'}</strong>
                    <p>
                        {sourceState === 'prepared'
                            ? 'Related Scripture appears automatically as playback reaches a strongly connected section.'
                            : 'Normal Watch does not use your microphone or YouTube captions. NFCPS looks for legitimate creator, ministry or podcast audio sources and prepares reusable sermon intelligence from those sources.'}
                    </p>
                    {sourceState === 'unprepared' && !preparingSource && (
                        <button type='button' onClick={() => void resolveSource(effectiveTime(), true)}>
                            <RefreshCw />
                            Retry Source Resolver
                        </button>
                    )}
                </div>
            )}

            {notice && sourceState !== 'prepared' && <p className='sermon-ai-notice'>{notice}</p>}

            <footer>
                <span>{footerLabel}</span>
                <button onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}>Open study <ChevronRight /></button>
            </footer>
        </aside>
    );
}
