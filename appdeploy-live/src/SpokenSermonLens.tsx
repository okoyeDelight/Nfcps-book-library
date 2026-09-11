'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import { ChevronRight, LoaderCircle, Mic, MicOff, Sparkles, X } from 'lucide-react';
import type { SharedWatchVideo } from './WatchDeepFeatures';
import { invalidateSermonPackage } from './ScriptureLens';

type Passage = { reference: string; text: string; translation: 'KJV' };
type Cue = { reference: string; start: number; end: number; relation: string; reason: string };
type DeepPackage = { available: boolean; scriptures?: Cue[]; passages?: Passage[] };
type SpeechReply = {
    available: boolean;
    cached?: boolean;
    transcript?: string;
    theme?: string;
    note?: string;
    passages?: Passage[];
    progress?: { segments: number; coverageSeconds: number; ready: boolean };
};
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionError = { error?: string };
type Recognition = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort?: () => void;
    onresult: ((event: RecognitionEvent) => void) | null;
    onerror: ((event: RecognitionError) => void) | null;
    onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;
type QueuedSpeech = { text: string; start: number; end: number };

function recognitionCtor(): RecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const value = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    return value.SpeechRecognition || value.webkitSpeechRecognition || null;
}

function packageUrl(video: SharedWatchVideo) {
    const query = new URLSearchParams({ title: video.title, creator: video.creator, category: video.category });
    return `/api/watch/sermon/${video.id}/intelligence?${query}`;
}

export function SpokenSermonLens({ video, currentTime }: { video: SharedWatchVideo; currentTime: number }) {
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [permissionNeeded, setPermissionNeeded] = useState(false);
    const [unsupported, setUnsupported] = useState(false);
    const [notice, setNotice] = useState('');
    const [latest, setLatest] = useState<SpeechReply | null>(null);
    const [latestAt, setLatestAt] = useState(0);
    const [deep, setDeep] = useState<DeepPackage | null>(null);
    const recognitionRef = useRef<Recognition | null>(null);
    const activeRef = useRef(false);
    const currentTimeRef = useRef(currentTime);
    const bufferRef = useRef('');
    const bufferStartRef = useRef(0);
    const queueRef = useRef<QueuedSpeech[]>([]);
    const pumpingRef = useRef(false);
    const silenceTimerRef = useRef<number | undefined>(undefined);
    const autoAttemptedRef = useRef(false);
    const readyAnnouncedRef = useRef(false);
    const lastCompiledSegmentsRef = useRef(0);

    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    useEffect(() => {
        autoAttemptedRef.current = false;
        readyAnnouncedRef.current = false;
        lastCompiledSegmentsRef.current = 0;
        queueRef.current = [];
        bufferRef.current = '';
        setLatest(null);
        setDeep(null);
        setDismissed(false);
        setPermissionNeeded(false);
        setUnsupported(false);
        setNotice('');
        let live = true;
        api.get(packageUrl(video)).then(response => {
            if (live && response.data?.available) setDeep(response.data as DeepPackage);
        }).catch(() => {});
        return () => {
            live = false;
            stopListening(false);
        };
    }, [video.id]);

    useEffect(() => {
        if (currentTime <= 0.4 || autoAttemptedRef.current || activeRef.current) return;
        autoAttemptedRef.current = true;
        const timer = window.setTimeout(() => startListening(false), 450);
        return () => window.clearTimeout(timer);
    }, [currentTime, video.id]);

    async function warmDeepPackage(segments: number) {
        if (lastCompiledSegmentsRef.current && segments - lastCompiledSegmentsRef.current < 8) return;
        lastCompiledSegmentsRef.current = segments;
        try {
            invalidateSermonPackage(video.id);
            const response = await api.get(packageUrl(video));
            if (response.data?.available) {
                setDeep(response.data as DeepPackage);
                window.dispatchEvent(new CustomEvent('nfcps-sermon-intelligence-ready', { detail: { videoId: video.id } }));
            }
        } catch {
            // Immediate Scripture matching keeps running even if deeper compilation is temporarily busy.
        }
    }

    async function pumpQueue() {
        if (pumpingRef.current) return;
        pumpingRef.current = true;
        setBusy(true);
        try {
            while (queueRef.current.length) {
                const next = queueRef.current.shift();
                if (!next) break;
                try {
                    const response = await api.post(`/api/watch/sermon/${video.id}/speech-lens`, {
                        ...next,
                        title: video.title,
                        creator: video.creator,
                        category: video.category,
                    });
                    const value = response.data as SpeechReply;
                    if (!value.available) continue;
                    setLatest(value);
                    setLatestAt(Date.now());
                    setNotice('');
                    invalidateSermonPackage(video.id);
                    window.dispatchEvent(new CustomEvent('nfcps-scripture-lens-live', { detail: { videoId: video.id, value } }));
                    const progress = value.progress;
                    if (progress?.ready) {
                        if (!readyAnnouncedRef.current) {
                            readyAnnouncedRef.current = true;
                            window.dispatchEvent(new CustomEvent('nfcps-sermon-speech-ready', { detail: { videoId: video.id } }));
                        }
                        void warmDeepPackage(progress.segments);
                    }
                } catch {
                    setNotice('Lens missed one phrase. It is still listening to the message.');
                }
            }
        } finally {
            pumpingRef.current = false;
            setBusy(false);
        }
    }

    function flush(force = false) {
        const text = bufferRef.current.replace(/\s+/g, ' ').trim();
        const end = currentTimeRef.current;
        const start = bufferStartRef.current;
        if (text.length < 12 || (!force && text.length < 120)) return;
        bufferRef.current = '';
        bufferStartRef.current = end;
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        queueRef.current.push({ text, start: Math.max(0, start), end: Math.max(start + 1, end) });
        void pumpQueue();
    }

    function acceptSpeech(text: string) {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (!cleanText) return;
        if (!bufferRef.current) bufferStartRef.current = currentTimeRef.current;
        bufferRef.current = `${bufferRef.current} ${cleanText}`.trim().slice(-5000);
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = window.setTimeout(() => flush(true), 2200);
        if (bufferRef.current.length >= 150) flush(true);
    }

    function stopListening(flushRemaining = true) {
        activeRef.current = false;
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        if (flushRemaining) flush(true);
        try { recognitionRef.current?.stop(); } catch {}
        recognitionRef.current = null;
        setListening(false);
    }

    function startListening(userInitiated: boolean) {
        const Ctor = recognitionCtor();
        if (!Ctor) {
            setUnsupported(true);
            setPermissionNeeded(false);
            setNotice('Automatic listening is not available in this browser.');
            return;
        }
        setUnsupported(false);
        setPermissionNeeded(false);
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-NG';
        recognition.onresult = event => {
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const result = event.results[index];
                if (result?.isFinal) acceptSpeech(result[0]?.transcript || '');
            }
        };
        recognition.onerror = event => {
            const fatal = event.error === 'not-allowed' || event.error === 'service-not-allowed';
            if (fatal) {
                activeRef.current = false;
                setListening(false);
                setPermissionNeeded(true);
                setNotice(userInitiated
                    ? 'Microphone permission is needed so Scripture Lens can hear the sermon.'
                    : 'Tap Enable once so Scripture Lens can hear the sermon. After permission is granted, it starts automatically.');
                return;
            }
            if (event.error !== 'no-speech') setNotice('Lens briefly lost the speech service. It will keep trying.');
        };
        recognition.onend = () => {
            if (!activeRef.current) return;
            try {
                recognition.start();
            } catch {
                activeRef.current = false;
                setListening(false);
                setNotice('Lens paused. Tap Resume to continue listening.');
            }
        };
        recognitionRef.current = recognition;
        activeRef.current = true;
        bufferStartRef.current = currentTimeRef.current;
        try {
            recognition.start();
            setListening(true);
            setPermissionNeeded(false);
            setNotice('');
        } catch {
            activeRef.current = false;
            setListening(false);
            setPermissionNeeded(true);
            setNotice('Tap Enable once so Scripture Lens can listen while the sermon plays.');
        }
    }

    const activeCue = useMemo(() => {
        return (deep?.scriptures || [])
            .filter(cue => currentTime >= cue.start - 1.5 && currentTime <= cue.end + 3)
            .sort((a, b) => Math.abs(a.start - currentTime) - Math.abs(b.start - currentTime))[0] || null;
    }, [deep, currentTime]);
    const timedPassage = activeCue
        ? (deep?.passages || []).find(item => item.reference.toLowerCase() === activeCue.reference.toLowerCase()) || null
        : null;
    const freshLatest = latest && Date.now() - latestAt < 30_000 ? latest : null;
    const passage = freshLatest?.passages?.[0] || timedPassage;
    const theme = freshLatest?.theme || activeCue?.reason || '';
    const progress = latest?.progress;
    const started = currentTime > 0.4 || listening || permissionNeeded || Boolean(passage);

    if (!started) return null;

    if (dismissed) {
        return (
            <button className={`sermon-lens-pill ${listening ? 'live' : ''}`} onClick={() => setDismissed(false)}>
                <Sparkles />
                <span>{listening ? 'Lens live' : permissionNeeded ? 'Enable Lens' : 'Scripture Lens'}</span>
                {listening && <i />}
            </button>
        );
    }

    return (
        <aside className={`sermon-auto-lens ${listening ? 'listening' : ''}`}>
            <header>
                <div className='sermon-auto-lens-title'>
                    <Sparkles />
                    <span><small>SCRIPTURE LENS</small><strong>{listening ? 'Listening with the message' : permissionNeeded ? 'Ready to listen' : 'Following the message'}</strong></span>
                </div>
                <div className='sermon-auto-lens-tools'>
                    {busy && <LoaderCircle className='spin' />}
                    {listening
                        ? <button aria-label='Pause Scripture Lens' onClick={() => stopListening(true)}><MicOff /></button>
                        : !permissionNeeded && !unsupported && <button aria-label='Resume Scripture Lens' onClick={() => startListening(true)}><Mic /></button>}
                    <button aria-label='Collapse Scripture Lens' onClick={() => setDismissed(true)}><X /></button>
                </div>
            </header>

            {passage ? (
                <button className='sermon-auto-lens-passage' onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}>
                    <div><strong>{passage.reference}</strong><small>KJV</small></div>
                    <p>{passage.text}</p>
                    {theme && <span>{theme}</span>}
                </button>
            ) : (
                <div className='sermon-auto-lens-waiting'>
                    <strong>{permissionNeeded ? 'Let NFCPS hear the sermon once.' : unsupported ? 'Listening is unavailable on this browser.' : 'Listening for the preacher’s next thought…'}</strong>
                    <p>{permissionNeeded ? 'This replaces caption dependence: NFCPS learns the actual spoken words as the video plays.' : unsupported ? 'The deeper study tools still work for messages NFCPS has already learned.' : 'Related Scripture will appear here automatically when there is a strong connection.'}</p>
                    {permissionNeeded && <button onClick={() => startListening(true)}><Mic />Enable listening</button>}
                </div>
            )}

            <footer>
                <span>{progress?.coverageSeconds ? `${Math.round(progress.coverageSeconds)}s learned${progress.ready ? ' · map growing' : ''}` : listening ? 'Speech-first · captions not required' : notice || 'Scripture Lens'}</span>
                <button onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}>Open study <ChevronRight /></button>
            </footer>
        </aside>
    );
}
