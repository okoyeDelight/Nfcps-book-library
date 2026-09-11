'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import { ChevronRight, LoaderCircle, Mic, MicOff, Sparkles } from 'lucide-react';
import type { SharedWatchVideo } from './WatchDeepFeatures';
import { invalidateSermonPackage } from './ScriptureLens';

type Passage = { reference: string; text: string; translation: 'KJV' };
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

export function SpokenSermonLens({ video, currentTime }: { video: SharedWatchVideo; currentTime: number }) {
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [latest, setLatest] = useState<SpeechReply | null>(null);
    const [heard, setHeard] = useState('');
    const recognitionRef = useRef<Recognition | null>(null);
    const activeRef = useRef(false);
    const currentTimeRef = useRef(currentTime);
    const bufferRef = useRef('');
    const bufferStartRef = useRef(0);
    const lastFlushRef = useRef(Date.now());
    const queueRef = useRef<QueuedSpeech[]>([]);
    const pumpingRef = useRef(false);
    const readyAnnouncedRef = useRef(false);

    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    useEffect(() => () => stop(false), [video.id]);

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
                    if (value.available) {
                        setLatest(value);
                        setNotice(value.progress?.ready
                            ? 'Spoken message learned · full sermon intelligence can now grow automatically.'
                            : `Learning the speaker’s words · ${Math.round(value.progress?.coverageSeconds || 0)}s mapped.`);
                        invalidateSermonPackage(video.id);
                        if (value.progress?.ready && !readyAnnouncedRef.current) {
                            readyAnnouncedRef.current = true;
                            window.dispatchEvent(new CustomEvent('nfcps-sermon-speech-ready', { detail: { videoId: video.id } }));
                        }
                    }
                } catch {
                    setNotice('Spoken Lens missed one section. It will continue with the next words it hears.');
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
        if (text.length < 12 || (!force && text.length < 110 && Date.now() - lastFlushRef.current < 8_000)) return;
        bufferRef.current = '';
        bufferStartRef.current = end;
        lastFlushRef.current = Date.now();
        queueRef.current.push({ text, start: Math.max(0, start), end: Math.max(start + 1, end) });
        void pumpQueue();
    }

    function acceptSpeech(text: string) {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (!cleanText) return;
        if (!bufferRef.current) bufferStartRef.current = currentTimeRef.current;
        bufferRef.current = `${bufferRef.current} ${cleanText}`.trim().slice(-5000);
        setHeard(bufferRef.current.slice(-240));
        flush(false);
    }

    function stop(flushRemaining = true) {
        activeRef.current = false;
        if (flushRemaining) flush(true);
        try { recognitionRef.current?.stop(); } catch {}
        recognitionRef.current = null;
        setListening(false);
    }

    function start() {
        const Ctor = recognitionCtor();
        if (!Ctor) {
            setNotice('Spoken Lens is not supported by this browser. Chrome on Android is recommended.');
            return;
        }
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-NG';
        recognition.onresult = event => {
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const result = event.results[index];
                if (result?.isFinal) acceptSpeech(result[0]?.transcript || '');
            }
        };
        recognition.onerror = event => {
            const fatal = event.error === 'not-allowed' || event.error === 'service-not-allowed';
            setNotice(fatal
                ? 'Microphone permission is needed for Spoken Lens.'
                : 'Spoken Lens briefly lost the speech service. It will restart when possible.');
            if (fatal) stop(false);
        };
        recognition.onend = () => {
            if (!activeRef.current) return;
            try { recognition.start(); } catch { setNotice('Tap Spoken Lens to resume listening.'); setListening(false); }
        };
        recognitionRef.current = recognition;
        activeRef.current = true;
        bufferStartRef.current = currentTimeRef.current;
        lastFlushRef.current = Date.now();
        try {
            recognition.start();
            setListening(true);
            setNotice('Listening to the actual spoken message. On phone, keep the sermon audible through the speaker.');
        } catch {
            activeRef.current = false;
            setNotice('Spoken Lens could not start on this device.');
        }
    }

    const passage = latest?.passages?.[0];
    return <>
        <div className='spoken-lens-control'>
            {!listening
                ? <button onClick={start}><Mic/><span>Spoken Lens</span></button>
                : <button className='active' onClick={() => stop(true)}><MicOff/><span>Spoken Lens · listening</span>{busy&&<LoaderCircle className='spin'/>}</button>}
        </div>
        {listening&&<div className='spoken-lens-status'>{notice}{heard&&<span>“{heard}”</span>}</div>}
        {!listening&&notice&&<div className='spoken-lens-status idle'>{notice}</div>}
        {passage&&<aside className='spoken-scripture-pop'>
            <button onClick={() => window.dispatchEvent(new Event('nfcps-scripture-lens-open'))}>
                <small><Sparkles/>HEARD IN THE MESSAGE</small>
                <strong>{passage.reference}</strong>
                <p>{passage.text.length > 190 ? `${passage.text.slice(0, 187)}…` : passage.text}</p>
                <span>{latest?.theme || 'Read alongside this point'} <ChevronRight/></span>
            </button>
        </aside>}
    </>;
}
