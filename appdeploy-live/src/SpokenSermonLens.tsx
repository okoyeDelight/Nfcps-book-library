'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import { ChevronRight, LoaderCircle, Mic, MicOff, Sparkles, X } from 'lucide-react';
import type { SharedWatchVideo } from './WatchDeepFeatures';
import { invalidateSermonPackage } from './ScriptureLens';

type Passage = { reference: string; text: string; translation: 'KJV' };
type Cue = { reference: string; start: number; end: number; relation: string; reason: string };
type DeepPackage = { available: boolean; scriptures?: Cue[]; passages?: Passage[] };
type TranscriptMeta = { available: boolean; source?: string; language?: string; segments?: number; durationSeconds?: number; reason?: string | null }; 
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
    onstart: (() => void) | null;
    onresult: ((event: RecognitionEvent) => void) | null;
    onerror: ((event: RecognitionError) => void) | null;
    onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;
type QueuedSpeech = { text: string; start: number; end: number };
type NativeSpeechBridge = {
    start: (token: string) => void;
    stop: (token: string) => void;
    isAvailable?: (token: string) => boolean;
};
type NativeSpeechDetail = { text?: string; final?: boolean };
type NativeSpeechStateDetail = { state?: 'listening' | 'permission-required' | 'unsupported' | 'paused'; message?: string };

function nativeSpeechBridge(): NativeSpeechBridge | null {
    if (typeof window === 'undefined') return null;
    const value = window as unknown as { NFCPSNativeSpeech?: NativeSpeechBridge };
    return value.NFCPSNativeSpeech || null;
}

function nativeSpeechToken() {
    if (typeof window === 'undefined') return '';
    const value = window as unknown as { __NFCPS_SPEECH_TOKEN__?: string };
    return value.__NFCPS_SPEECH_TOKEN__ || '';
}

function recognitionCtor(): RecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const value = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    return value.SpeechRecognition || value.webkitSpeechRecognition || null;
}

function packageUrl(video: SharedWatchVideo) {
    const query = new URLSearchParams({ title: video.title, creator: video.creator, category: video.category });
    return `/api/watch/sermon/${video.id}/intelligence?${query}`;
}

const SPOKEN_LENS_PREF = 'nfcps-watch-spoken-lens-enabled';

function spokenLensPreferred() {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(SPOKEN_LENS_PREF) === '1';
    } catch {
        return false;
    }
}

function rememberSpokenLens(enabled: boolean) {
    if (typeof window === 'undefined') return;
    try {
        if (enabled) window.localStorage.setItem(SPOKEN_LENS_PREF, '1');
        else window.localStorage.removeItem(SPOKEN_LENS_PREF);
    } catch {
        // Private browsing or storage restrictions should not block the Lens.
    }
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
    const [transcriptMeta, setTranscriptMeta] = useState<TranscriptMeta | null>(null);
    const [sourceState, setSourceState] = useState<'checking' | 'prepared' | 'unprepared'>('checking');
    const [preparingSource, setPreparingSource] = useState(false);
    const [timelineTime, setTimelineTime] = useState(currentTime);
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
    const nativeListeningRef = useRef(false);
    const mountedAtRef = useRef(Date.now());
    const lastKnownTimeRef = useRef(currentTime);
    const lastKnownAtRef = useRef(Date.now());
    const nativeTokenRetryRef = useRef(0);
    const preparedBucketRef = useRef(-1);

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

    useEffect(() => {
        autoAttemptedRef.current = false;
        readyAnnouncedRef.current = false;
        lastCompiledSegmentsRef.current = 0;
        nativeListeningRef.current = false;
        nativeTokenRetryRef.current = 0;
        preparedBucketRef.current = -1;
        mountedAtRef.current = Date.now();
        lastKnownTimeRef.current = 0;
        lastKnownAtRef.current = Date.now();
        queueRef.current = [];
        bufferRef.current = '';
        setTimelineTime(0);
        setLatest(null);
        setDeep(null);
        setTranscriptMeta(null);
        setSourceState('checking');
        setDismissed(false);
        setPermissionNeeded(false);
        setUnsupported(false);
        setNotice('');
        let live = true;
        const query = new URLSearchParams({ title: video.title, creator: video.creator });
        const load = async () => {
            try {
                const response = await api.get(`/api/watch/sermon/${video.id}/transcript?${query}`);
                if (!live) return;
                let meta = response.data as TranscriptMeta;
                setTranscriptMeta(meta);
                if (!meta.available) {
                    setPreparingSource(true);
                    setNotice('Preparing this message from a trusted sermon source…');
                    try {
                        const prepared = await api.post(`/api/watch/sermon/${video.id}/prepare-source`, {
                            title: video.title,
                            creator: video.creator,
                            category: video.category,
                            at: 0,
                        });
                        if (!live) return;
                        if (prepared.data?.available) {
                            preparedBucketRef.current = 0;
                            const refreshed = await api.get(`/api/watch/sermon/${video.id}/transcript?${query}`);
                            meta = refreshed.data as TranscriptMeta;
                            setTranscriptMeta(meta);
                        } else if (prepared.data?.reason) {
                            setNotice(String(prepared.data.reason));
                        }
                    } catch {
                        if (live) setNotice('This sermon is waiting for source preparation. You can keep watching normally.');
                    } finally {
                        if (live) setPreparingSource(false);
                    }
                }
                if (!live) return;
                if (meta.available) {
                    setSourceState('prepared');
                    setNotice('');
                    try {
                        const packageResponse = await api.get(packageUrl(video));
                        if (live && packageResponse.data?.available) setDeep(packageResponse.data as DeepPackage);
                    } catch {
                        if (live) setNotice('Transcript ready. Deeper Scripture mapping is still preparing.');
                    }
                } else {
                    setSourceState('unprepared');
                    if (!notice) setNotice(meta.reason || 'This message is still being prepared.');
                }
            } catch {
                if (!live) return;
                setSourceState('unprepared');
                setNotice('NFCPS could not prepare this sermon intelligence right now.');
                setPreparingSource(false);
            }
        };
        void load();
        return () => {
            live = false;
            stopListening(false);
        };
    }, [video.id]);

    useEffect(() => {
        if (sourceState !== 'unprepared' || listening || autoAttemptedRef.current) return;
        if (!spokenLensPreferred()) return;
        autoAttemptedRef.current = true;
        const timer = window.setTimeout(() => startListening(false), 250);
        return () => window.clearTimeout(timer);
    }, [sourceState, video.id, listening]);

    useEffect(() => {
        if (sourceState !== 'prepared' || transcriptMeta?.source !== 'trusted-podcast-audio' || preparingSource) return;
        const bucket = Math.max(0, Math.floor(timelineTime / 60));
        if (bucket === preparedBucketRef.current) return;
        preparedBucketRef.current = bucket;
        setPreparingSource(true);
        api.post(`/api/watch/sermon/${video.id}/prepare-source`, {
            title: video.title,
            creator: video.creator,
            category: video.category,
            at: timelineTime,
        }).then(async response => {
            if (!response.data?.available) return;
            invalidateSermonPackage(video.id);
            const packageResponse = await api.get(packageUrl(video));
            if (packageResponse.data?.available) setDeep(packageResponse.data as DeepPackage);
        }).catch(() => {}).finally(() => setPreparingSource(false));
    }, [Math.floor(timelineTime / 60), sourceState, transcriptMeta?.source, video.id]);

    useEffect(() => {
        const speech = (event: Event) => {
            const detail = (event as CustomEvent<NativeSpeechDetail>).detail;
            if (detail?.text && detail.final !== false) acceptSpeech(detail.text);
        };
        const state = (event: Event) => {
            const detail = (event as CustomEvent<NativeSpeechStateDetail>).detail;
            if (!detail) return;
            if (detail.state === 'listening') {
                activeRef.current = true;
                nativeListeningRef.current = true;
                rememberSpokenLens(true);
                setListening(true);
                setPermissionNeeded(false);
                setUnsupported(false);
                setNotice('');
            } else if (detail.state === 'permission-required') {
                activeRef.current = false;
                nativeListeningRef.current = false;
                rememberSpokenLens(false);
                setListening(false);
                setPermissionNeeded(true);
                setNotice(detail.message || 'Allow microphone access once so Scripture Lens can hear the sermon.');
            } else if (detail.state === 'unsupported') {
                activeRef.current = false;
                nativeListeningRef.current = false;
                setListening(false);
                setUnsupported(true);
                setNotice(detail.message || 'Speech recognition is unavailable on this device.');
            } else if (detail.state === 'paused') {
                activeRef.current = false;
                nativeListeningRef.current = false;
                setListening(false);
                if (detail.message) setNotice(detail.message);
            }
        };
        window.addEventListener('nfcps-native-speech', speech as EventListener);
        window.addEventListener('nfcps-native-speech-state', state as EventListener);
        return () => {
            window.removeEventListener('nfcps-native-speech', speech as EventListener);
            window.removeEventListener('nfcps-native-speech-state', state as EventListener);
        };
    }, [video.id]);

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
                        setTranscriptMeta({
                            available: true,
                            source: 'nfcps-spoken',
                            language: 'spoken-word',
                            segments: progress.segments,
                            durationSeconds: Math.max(Math.ceil(progress.coverageSeconds), Math.ceil(effectiveTime())),
                            reason: null,
                        });
                        setSourceState('prepared');
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
        const end = effectiveTime();
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
        if (!bufferRef.current) bufferStartRef.current = effectiveTime();
        bufferRef.current = `${bufferRef.current} ${cleanText}`.trim().slice(-5000);
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = window.setTimeout(() => flush(true), 2200);
        if (bufferRef.current.length >= 150) flush(true);
    }

    function stopListening(flushRemaining = true) {
        activeRef.current = false;
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        if (flushRemaining) flush(true);
        if (nativeListeningRef.current) {
            try {
                const token = nativeSpeechToken();
                if (token) nativeSpeechBridge()?.stop(token);
            } catch {}
            nativeListeningRef.current = false;
        }
        try { recognitionRef.current?.stop(); } catch {}
        recognitionRef.current = null;
        setListening(false);
    }

    function startListening(userInitiated: boolean) {
        const native = nativeSpeechBridge();
        if (native) {
            const token = nativeSpeechToken();
            if (!token) {
                activeRef.current = false;
                nativeListeningRef.current = false;
                setListening(false);
                if (!userInitiated && nativeTokenRetryRef.current < 8) {
                    nativeTokenRetryRef.current += 1;
                    window.setTimeout(() => startListening(false), 350);
                } else {
                    setNotice('Preparing Android Scripture Lens…');
                }
                return;
            }
            nativeTokenRetryRef.current = 0;
            if (native.isAvailable?.(token) ?? true) {
                setUnsupported(false);
                setPermissionNeeded(false);
                bufferStartRef.current = effectiveTime();
                activeRef.current = true;
                nativeListeningRef.current = true;
                try {
                    native.start(token);
                    setListening(true);
                    setNotice('');
                } catch {
                    activeRef.current = false;
                    nativeListeningRef.current = false;
                    setListening(false);
                    setPermissionNeeded(true);
                    setNotice('Allow microphone access once so Scripture Lens can hear the sermon.');
                }
                return;
            }
            setUnsupported(true);
            setPermissionNeeded(false);
            setNotice('Android speech recognition is unavailable on this device.');
            return;
        }
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
                rememberSpokenLens(false);
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
        recognition.onstart = () => {
            rememberSpokenLens(true);
            setPermissionNeeded(false);
            setUnsupported(false);
        };
        recognitionRef.current = recognition;
        activeRef.current = true;
        bufferStartRef.current = effectiveTime();
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

    function toggleSpeakerFallback() {
        if (listening) {
            rememberSpokenLens(false);
            stopListening(true);
            setNotice('Spoken Lens paused. Reusable sermon intelligence will still be kept.');
            return;
        }
        setPermissionNeeded(false);
        setUnsupported(false);
        startListening(true);
    }

    const activeCue = useMemo(() => {
        return (deep?.scriptures || [])
            .filter(cue => timelineTime >= cue.start - 1.5 && timelineTime <= cue.end + 3)
            .sort((a, b) => Math.abs(a.start - timelineTime) - Math.abs(b.start - timelineTime))[0] || null;
    }, [deep, timelineTime]);
    const timedPassage = activeCue
        ? (deep?.passages || []).find(item => item.reference.toLowerCase() === activeCue.reference.toLowerCase()) || null
        : null;
    const freshLatest = latest && Date.now() - latestAt < 30_000 ? latest : null;
    const passage = freshLatest?.passages?.[0] || timedPassage;
    const theme = freshLatest?.theme || activeCue?.reason || '';
    const progress = latest?.progress;
    const preparedLabel = listening
        ? 'Spoken Lens live · recognized words only'
        : transcriptMeta?.source === 'trusted-podcast-audio'
        ? 'Trusted source audio · sermon prepared'
        : transcriptMeta?.source === 'youtube-auto-cc'
            ? 'YouTube Auto CC · reusable transcript'
            : transcriptMeta?.source === 'youtube-caption'
                ? 'YouTube caption · reusable transcript'
                : transcriptMeta?.source === 'nfcps-spoken'
                    ? 'NFCPS learned transcript'
                    : sourceState === 'prepared'
                        ? 'Reusable transcript ready'
                        : '';

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
                    <span><small>SCRIPTURE LENS</small><strong>{preparingSource ? 'Preparing the message' : sourceState === 'checking' ? 'Preparing this message' : sourceState === 'prepared' ? 'Following the message' : 'Message intelligence preparing'}</strong></span>
                </div>
                <div className='sermon-auto-lens-tools'>
                    {(busy || preparingSource) && <LoaderCircle className='spin' />}
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
                    <strong>{preparingSource ? 'NFCPS is preparing this sermon automatically…' : sourceState === 'checking' ? 'Finding the best reusable sermon source…' : sourceState === 'prepared' ? 'Mapping this part of the sermon…' : listening ? 'Listening to the speaker…' : 'No reusable source for this sermon yet.'}</strong>
                    <p>{preparingSource ? 'NFCPS is processing a trusted source for this message, so no microphone is needed.' : sourceState === 'checking' ? 'NFCPS checks learned intelligence, reusable captions and trusted sermon audio first.' : sourceState === 'prepared' ? 'Related Scripture will appear automatically as playback reaches a strongly connected section.' : listening ? 'NFCPS is learning from recognized spoken words. Raw sermon audio is not stored or uploaded.' : 'Enable Spoken Lens once so NFCPS can learn directly from the speaker when no reusable source exists. Only recognized text is sent; raw audio is not stored or uploaded.'}</p>
                    {sourceState === 'unprepared' && (
                        <button type='button' onClick={toggleSpeakerFallback} disabled={busy}>
                            {listening ? <MicOff /> : <Mic />}
                            {listening ? 'Pause Spoken Lens' : permissionNeeded ? 'Allow microphone' : unsupported ? 'Try Spoken Lens' : 'Enable Spoken Lens'}
                        </button>
                    )}
                </div>
            )}

            <footer>
                <span>{preparedLabel || (preparingSource ? 'Preparing trusted sermon intelligence…' : notice || 'Scripture Lens')}</span>
                <button onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}>Open study <ChevronRight /></button>
            </footer>
        </aside>
    );
}
