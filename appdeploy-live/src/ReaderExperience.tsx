'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import {
    AlignJustify,
    Bookmark,
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    CloudOff,
    Heart,
    Highlighter,
    LayoutList,
    LoaderCircle,
    Maximize2,
    Minus,
    Moon,
    NotebookPen,
    Plus,
    Search,
    Settings2,
    Sun,
    Type,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import FlipBookMark from './FlipBookMark';

export type ReaderBook = {
    id: number;
    title: string;
    author: string;
    formats: Record<string, string>;
    cover?: string;
    summary?: string;
};

type Theme = 'dark' | 'paper' | 'sepia' | 'light';
type Family = 'serif' | 'sans' | 'literary' | 'humanist';
type TextColor = 'auto' | 'charcoal' | 'brown' | 'white';
type ReadingMode = 'page' | 'scroll';
type Annotation = { id: string; para: number; text: string; color: 'yellow' | 'green' | 'blue'; note?: string };
type ReaderRecord = {
    book: ReaderBook;
    progress: number;
    bookmarks: number[];
    saved: boolean;
    lastOpened: number;
    offline: boolean;
    annotations?: Annotation[];
    fontSize?: number;
    lineHeight?: number;
    theme?: Theme;
    family?: Family;
    margin?: number;
    brightness?: number;
    textColor?: TextColor;
    readingMode?: ReadingMode;
    pageTurnSound?: boolean;
};
type PageFlip = { direction: 'next' | 'previous'; from: number; to: number };
type ReaderState = { items: Record<string, ReaderRecord> };
type ReadingSource = { title: string; excerpts: string[] };

type Page = { start: number; end: number };

const STATE = 'nfcps-reader-v3';
const OLD_STATE = 'nfcps-reader-v2';
const SOURCE = 'nfcps-reader-moments-source';
const CACHE = 'nfcps-reader-offline-v3';
const OLD_CACHE = 'nfcps-reader-offline-v2';

const emptyState = (): ReaderState => ({ items: {} });

const readState = () => {
    try {
        const raw = localStorage.getItem(STATE) || localStorage.getItem(OLD_STATE) || '';
        return raw ? JSON.parse(raw) as ReaderState : emptyState();
    } catch {
        return emptyState();
    }
};

const writeState = (state: ReaderState) => {
    localStorage.setItem(STATE, JSON.stringify(state));
    window.dispatchEvent(new Event('nfcps-reader-updated'));
    window.dispatchEvent(new Event('nfcps-member-state-changed'));
};

export const openReader = (book: ReaderBook) => window.dispatchEvent(new CustomEvent<ReaderBook>('nfcps-open-reader', { detail: book }));

const cacheKey = (id: number) => `${location.origin}/__nfcps_reader_cache__/${id}`;

const textUrl = (book: ReaderBook) => {
    const entries = Object.entries(book.formats);
    return entries.find(([key, value]) => key.startsWith('text/plain') && Boolean(value))?.[1]
        || entries.find(([key, value]) => key === 'text/html' && Boolean(value))?.[1]
        || entries.find(([key, value]) => key.startsWith('text/html') && Boolean(value))?.[1]
        || '';
};

const cleanText = (raw: string, isHtml: boolean) => {
    let text = raw;
    if (isHtml || /<(?:html|body|p|div|h[1-6])\b/i.test(raw.slice(0, 3000))) {
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        text = doc.body?.innerText || raw;
    }
    text = text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
    const start = text.search(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
    if (start >= 0) {
        const newline = text.indexOf('\n', start);
        text = text.slice(newline >= 0 ? newline + 1 : start);
    }
    const end = text.search(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
    if (end > 0) text = text.slice(0, end);
    return text.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
};

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

const paragraphsFrom = (text: string) => {
    const primary = text.split(/\n\s*\n+/).map(normalize).filter(item => item.length > 18);
    const primaryChars = primary.reduce((total, item) => total + item.length, 0);
    if (primary.length >= 4 && primaryChars >= 900) return primary.slice(0, 6000);

    const lines = text.split(/\n+/).map(normalize).filter(item => item.length > 18);
    const lineChars = lines.reduce((total, item) => total + item.length, 0);
    if (lines.length >= 6 && lineChars >= 900) return lines.slice(0, 6000);

    const continuous = normalize(text);
    if (!continuous) return [] as string[];
    const chunks: string[] = [];
    let remaining = continuous;
    while (remaining.length) {
        if (remaining.length <= 900) {
            chunks.push(remaining);
            break;
        }
        const windowText = remaining.slice(0, 1050);
        const candidates = [...windowText.matchAll(/[.!?][”"']?\s+/g)].map(match => (match.index || 0) + match[0].length).filter(index => index >= 420);
        const cut = candidates.length ? candidates[candidates.length - 1] : 850;
        chunks.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
    }
    return chunks.filter(item => item.length > 18).slice(0, 6000);
};

const readable = (raw: string) => {
    const paragraphs = paragraphsFrom(raw);
    return paragraphs.length >= 3 && paragraphs.reduce((total, paragraph) => total + paragraph.length, 0) >= 700;
};

const isHeading = (paragraph: string) => /^(chapter|book|part|section|psalm|introduction|preface)\b/i.test(paragraph)
    || (/^[A-Z0-9 ,.'’:&-]{4,80}$/.test(paragraph) && paragraph.split(' ').length < 12);

const sourceFrom = (title: string, paragraphs: string[], index: number): ReadingSource => {
    const picks: number[] = [];
    for (let delta = -8; delta <= 18; delta += 2) picks.push(Math.max(0, Math.min(paragraphs.length - 1, index + delta)));
    const seen = new Set<string>();
    const excerpts: string[] = [];
    for (const i of picks) {
        const paragraph = paragraphs[i]?.trim();
        if (!paragraph || paragraph.length < 70 || paragraph.length > 280 || isHeading(paragraph) || seen.has(paragraph)) continue;
        seen.add(paragraph);
        excerpts.push(paragraph);
        if (excerpts.length === 12) break;
    }
    return { title, excerpts };
};

async function readValidCache(cacheName: string, key: string) {
    if (!('caches' in window)) return null;
    const cache = await caches.open(cacheName);
    const response = await cache.match(key);
    if (!response) return null;
    const raw = cleanText(await response.text(), false);
    if (readable(raw)) return raw;
    await cache.delete(key);
    return null;
}

async function storeCache(key: string, raw: string) {
    if (!('caches' in window)) return false;
    try {
        const cache = await caches.open(CACHE);
        await cache.put(key, new Response(raw, { headers: { 'content-type': 'text/plain;charset=utf-8' } }));
        return true;
    } catch {
        return false;
    }
}

async function loadBookText(book: ReaderBook) {
    const key = cacheKey(book.id);
    const current = await readValidCache(CACHE, key);
    if (current) return { raw: current, offline: true };

    const legacy = await readValidCache(OLD_CACHE, key);
    if (legacy) {
        await storeCache(key, legacy);
        return { raw: legacy, offline: true };
    }

    const source = textUrl(book);
    const response = await api.get(`/api/reader/book/${book.id}${source ? `?source=${encodeURIComponent(source)}` : ''}`);
    const data = response.data as { raw?: string; isHtml?: boolean };
    if (!data?.raw) throw new Error('This edition did not return any readable text.');
    const raw = cleanText(data.raw, Boolean(data.isHtml));
    if (!readable(raw)) throw new Error('This edition returned an incomplete reading copy. Please try again.');
    const offline = await storeCache(key, raw);
    return { raw, offline };
}

function makePages(paragraphs: string[]): Page[] {
    const pages: Page[] = [];
    let start = 0;
    let chars = 0;
    for (let index = 0; index < paragraphs.length; index += 1) {
        chars += paragraphs[index].length + (isHeading(paragraphs[index]) ? 340 : 0);
        if (chars >= 2300 && index > start) {
            pages.push({ start, end: index + 1 });
            start = index + 1;
            chars = 0;
        }
    }
    if (start < paragraphs.length) pages.push({ start, end: paragraphs.length });
    return pages.length ? pages : [{ start: 0, end: 0 }];
}

function readRecords() {
    if (typeof window === 'undefined') return [] as ReaderRecord[];
    return Object.values(readState().items).sort((a, b) => b.lastOpened - a.lastOpened);
}

function MarkedText({ text, annotations }: { text: string; annotations: Annotation[] }) {
    const marks = annotations.filter(annotation => annotation.text && text.includes(annotation.text));
    if (!marks.length) return <>{text}</>;
    const pieces: Array<{ text: string; annotation?: Annotation }> = [];
    let cursor = 0;
    for (const annotation of marks) {
        const index = text.indexOf(annotation.text, cursor);
        if (index < 0) continue;
        if (index > cursor) pieces.push({ text: text.slice(cursor, index) });
        pieces.push({ text: annotation.text, annotation });
        cursor = index + annotation.text.length;
    }
    if (cursor < text.length) pieces.push({ text: text.slice(cursor) });
    return <>{pieces.map((piece, index) => piece.annotation ? <mark key={index} className={`book-reader-mark mark-${piece.annotation.color}`} title={piece.annotation.note || 'Highlighted'}>{piece.text}</mark> : <span key={index}>{piece.text}</span>)}</>;
}

export function PersonalReadingHome() {
    const [items, setItems] = useState<ReaderRecord[]>([]);
    useEffect(() => {
        const load = () => setItems(readRecords());
        load();
        window.addEventListener('nfcps-reader-updated', load);
        window.addEventListener('nfcps-cloud-applied', load);
        return () => {
            window.removeEventListener('nfcps-reader-updated', load);
            window.removeEventListener('nfcps-cloud-applied', load);
        };
    }, []);
    const current = items[0];
    const saved = items.filter(item => item.saved).slice(0, 4);
    if (!current) {
        return (
            <section className='personal-reading empty-reading'>
                <div className='personal-reading-copy'>
                    <span><FlipBookMark size={16} /> YOUR READING SPACE</span>
                    <h2>Start once. We’ll remember the rest.</h2>
                    <p>Open any book inside NFCPS One. Your place, notes, highlights and bookmarks remain available locally, with cloud continuity when you sign in.</p>
                </div>
                <a className='gold' href='#read'>Choose a book</a>
            </section>
        );
    }
    return (
        <section className='personal-reading'>
            <div className='personal-reading-head'>
                <div><span><FlipBookMark size={16} /> YOUR READING SPACE</span><h2>Welcome back to your book.</h2></div>
                <small>{items.length} book{items.length === 1 ? '' : 's'} in your reading history</small>
            </div>
            <div className='continue-card'>
                <div className='continue-cover'>{current.book.cover ? <img src={current.book.cover} alt={`${current.book.title} cover`} /> : <FlipBookMark size={40} />}</div>
                <div className='continue-copy'>
                    <small>CONTINUE READING</small>
                    <h3>{current.book.title}</h3>
                    <p>{current.book.author}</p>
                    <div className='continue-progress'><i style={{ width: `${Math.max(2, current.progress)}%` }} /><span>{Math.round(current.progress)}%</span></div>
                    <div className='continue-meta'>
                        <span>{current.offline ? <><CloudOff size={13} />Offline copy on this device</> : <><BookOpen size={13} />Online reading</>}</span>
                        <span><Bookmark size={13} />{current.bookmarks.length} bookmarks</span>
                        <span><Highlighter size={13} />{current.annotations?.length || 0} notes & highlights</span>
                    </div>
                </div>
                <button className='gold' onClick={() => openReader(current.book)}>Continue <ChevronRight size={16} /></button>
            </div>
            {saved.length > 0 && (
                <div className='saved-row'>
                    <strong>Saved for later</strong>
                    <div>{saved.map(item => <button key={item.book.id} onClick={() => openReader(item.book)}><span>{item.book.cover ? <img src={item.book.cover} alt='' /> : <BookOpen />}</span><b>{item.book.title}</b><small>{Math.round(item.progress)}% read</small></button>)}</div>
                </div>
            )}
        </section>
    );
}

export function ReaderLayer() {
    const [book, setBook] = useState<ReaderBook | null>(null);
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [theme, setTheme] = useState<Theme>('paper');
    const [family, setFamily] = useState<Family>('serif');
    const [fontSize, setFontSize] = useState(19);
    const [lineHeight, setLineHeight] = useState(1.72);
    const [margin, setMargin] = useState(30);
    const [brightness, setBrightness] = useState(100);
    const [textColor, setTextColor] = useState<TextColor>('auto');
    const [readingMode, setReadingMode] = useState<ReadingMode>('page');
    const [immersive, setImmersive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [flip, setFlip] = useState<PageFlip | null>(null);
    const [pageTurnSound, setPageTurnSound] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [bookmarks, setBookmarks] = useState<number[]>([]);
    const [saved, setSaved] = useState(false);
    const [offline, setOffline] = useState(false);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [panel, setPanel] = useState<'settings' | 'contents' | 'notes' | null>(null);
    const [selected, setSelected] = useState<{ text: string; para: number } | null>(null);
    const [noteDraft, setNoteDraft] = useState<{ quote: string; para: number; text: string } | null>(null);
    const [retry, setRetry] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [chromeVisible, setChromeVisible] = useState(true);
    const scrollRef = useRef<HTMLElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const pages = useMemo(() => makePages(paragraphs), [paragraphs]);
    const pageProgress = pages.length <= 1 ? 0 : (page / (pages.length - 1)) * 100;
    const progress = readingMode === 'scroll' ? scrollProgress : pageProgress;
    const current = pages[Math.min(page, pages.length - 1)] || { start: 0, end: 0 };
    const currentParagraphs = paragraphs.slice(current.start, current.end);

    useEffect(() => {
        const open = (event: Event) => setBook((event as CustomEvent<ReaderBook>).detail);
        window.addEventListener('nfcps-open-reader', open);
        return () => window.removeEventListener('nfcps-open-reader', open);
    }, []);

    useEffect(() => {
        if (!book) return;
        let cancelled = false;
        const state = readState();
        const existing = state.items[String(book.id)];
        const initialMode = existing?.readingMode || 'page';
        const initialProgress = Math.max(0, Math.min(100, existing?.progress || 0));

        setBookmarks(existing?.bookmarks || []);
        setSaved(existing?.saved || false);
        setAnnotations(existing?.annotations || []);
        setFontSize(existing?.fontSize || 19);
        setLineHeight(existing?.lineHeight || 1.72);
        setTheme(existing?.theme || 'paper');
        setFamily(existing?.family || 'serif');
        setMargin(existing?.margin || 30);
        setBrightness(existing?.brightness || 100);
        setTextColor(existing?.textColor || 'auto');
        setReadingMode(initialMode);
        setPageTurnSound(existing?.pageTurnSound ?? true);
        setFlip(null);
        setScrollProgress(initialProgress);
        setImmersive(false);
        setSearchQuery('');
        setError('');
        setLoading(true);
        setParagraphs([]);
        setPanel(null);
        setSelected(null);
        setChromeVisible(true);

        loadBookText(book).then(({ raw, offline: ready }) => {
            if (cancelled) return;
            const parsed = paragraphsFrom(raw);
            const readableChars = parsed.reduce((total, paragraph) => total + paragraph.length, 0);
            if (parsed.length < 3 || readableChars < 700) throw new Error('This reading copy is incomplete. Please try again.');
            const nextPages = makePages(parsed);
            const initialPage = Math.max(0, Math.min(nextPages.length - 1, Math.round((initialProgress / 100) * Math.max(0, nextPages.length - 1))));
            setParagraphs(parsed);
            setOffline(ready);
            setPage(initialPage);
            const index = nextPages[initialPage]?.start || 0;
            const source = sourceFrom(book.title, parsed, index);
            localStorage.setItem(SOURCE, JSON.stringify(source));
            window.dispatchEvent(new CustomEvent<ReadingSource>('nfcps-reader-source-updated', { detail: source }));
            const nextState = readState();
            nextState.items[String(book.id)] = {
                book,
                progress: initialProgress,
                bookmarks: existing?.bookmarks || [],
                saved: existing?.saved || false,
                lastOpened: Date.now(),
                offline: ready,
                annotations: existing?.annotations || [],
                fontSize: existing?.fontSize || 19,
                lineHeight: existing?.lineHeight || 1.72,
                theme: existing?.theme || 'paper',
                family: existing?.family || 'serif',
                margin: existing?.margin || 30,
                brightness: existing?.brightness || 100,
                textColor: existing?.textColor || 'auto',
                readingMode: initialMode,
                pageTurnSound: existing?.pageTurnSound ?? true,
            };
            writeState(nextState);
        }).catch(cause => {
            if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not open this book.');
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [book?.id, retry]);

    const persist = (patch: Partial<ReaderRecord> = {}) => {
        if (!book) return;
        const state = readState();
        const previous = state.items[String(book.id)] || { book, progress: 0, bookmarks: [], saved: false, lastOpened: Date.now(), offline };
        state.items[String(book.id)] = {
            ...previous,
            ...patch,
            book,
            progress,
            bookmarks,
            saved,
            offline,
            annotations,
            fontSize,
            lineHeight,
            theme,
            family,
            margin,
            brightness,
            textColor,
            readingMode,
            pageTurnSound,
            lastOpened: Date.now(),
        };
        writeState(state);
    };

    useEffect(() => {
        if (!book || !paragraphs.length) return;
        const timer = window.setTimeout(() => {
            persist();
            const index = readingMode === 'page' ? current.start || 0 : Math.round((progress / 100) * Math.max(0, paragraphs.length - 1));
            const source = sourceFrom(book.title, paragraphs, index);
            localStorage.setItem(SOURCE, JSON.stringify(source));
            window.dispatchEvent(new CustomEvent<ReadingSource>('nfcps-reader-source-updated', { detail: source }));
        }, readingMode === 'scroll' ? 650 : 120);
        return () => window.clearTimeout(timer);
    }, [page, scrollProgress, bookmarks, saved, annotations, fontSize, lineHeight, theme, family, margin, brightness, textColor, readingMode, pageTurnSound, offline, paragraphs.length]);

    useEffect(() => {
        if (!book || loading || error || panel || selected || noteDraft || !chromeVisible) return;
        const timer = window.setTimeout(() => setChromeVisible(false), 2800);
        return () => window.clearTimeout(timer);
    }, [book, loading, error, panel, selected, noteDraft, chromeVisible, page]);

    useEffect(() => {
        if (readingMode !== 'scroll' || !paragraphs.length || !scrollRef.current) return;
        const element = scrollRef.current;
        window.requestAnimationFrame(() => {
            const max = Math.max(0, element.scrollHeight - element.clientHeight);
            element.scrollTop = max * (scrollProgress / 100);
        });
    }, [readingMode, paragraphs.length]);

    const goPage = (next: number) => {
        setPage(Math.max(0, Math.min(pages.length - 1, next)));
        setPanel(null);
        setSelected(null);
        setChromeVisible(true);
    };

    const playPageTurn = () => {
        if (!pageTurnSound || typeof window === 'undefined') return;
        try {
            const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) return;
            const context = audioContextRef.current || new AudioContextClass();
            audioContextRef.current = context;
            if (context.state === 'suspended') void context.resume();
            const duration = 0.28;
            const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
            const buffer = context.createBuffer(1, frameCount, context.sampleRate);
            const samples = buffer.getChannelData(0);
            for (let index = 0; index < samples.length; index += 1) {
                const phase = index / samples.length;
                const envelope = Math.pow(1 - phase, 1.55) * Math.min(1, phase * 20);
                samples[index] = (Math.random() * 2 - 1) * envelope;
            }
            const source = context.createBufferSource();
            const filter = context.createBiquadFilter();
            const gain = context.createGain();
            source.buffer = buffer;
            filter.type = 'bandpass';
            filter.frequency.value = 1450;
            filter.Q.value = 0.65;
            gain.gain.setValueAtTime(0.055, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
            source.connect(filter);
            filter.connect(gain);
            gain.connect(context.destination);
            source.start();
        } catch {
            // Page turning still works when a browser blocks or lacks Web Audio.
        }
    };

    const turnPage = (delta: -1 | 1) => {
        if (readingMode !== 'page' || flip || !pages.length) return;
        const target = Math.max(0, Math.min(pages.length - 1, page + delta));
        if (target === page) return;
        setPanel(null);
        setSelected(null);
        setChromeVisible(false);
        playPageTurn();
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) {
            setPage(target);
            return;
        }
        setFlip({ direction: delta > 0 ? 'next' : 'previous', from: page, to: target });
        window.setTimeout(() => {
            setPage(target);
            setFlip(null);
        }, 460);
    };

    const jumpProgress = (percent: number) => {
        const safe = Math.max(0, Math.min(100, percent));
        if (readingMode === 'scroll' && scrollRef.current) {
            const element = scrollRef.current;
            const max = Math.max(0, element.scrollHeight - element.clientHeight);
            element.scrollTo({ top: max * (safe / 100), behavior: 'smooth' });
            setScrollProgress(safe);
            return;
        }
        goPage(Math.round((safe / 100) * Math.max(0, pages.length - 1)));
    };

    const jumpParagraph = (para: number) => {
        if (readingMode === 'scroll') {
            setPanel(null);
            window.requestAnimationFrame(() => {
                document.querySelector(`[data-p='${para}']`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
            return;
        }
        const index = pages.findIndex(item => para >= item.start && para < item.end);
        if (index >= 0) goPage(index);
    };

    const changeMode = (mode: ReadingMode) => {
        if (mode === readingMode) return;
        const currentProgress = progress;
        if (mode === 'scroll') setScrollProgress(currentProgress);
        else setPage(Math.round((currentProgress / 100) * Math.max(0, pages.length - 1)));
        setReadingMode(mode);
        setChromeVisible(true);
    };

    const toggleBookmark = () => {
        const percent = Math.round(progress);
        const near = bookmarks.find(item => Math.abs(item - percent) <= 1);
        setBookmarks(near !== undefined ? bookmarks.filter(item => item !== near) : [...bookmarks, percent].sort((a, b) => a - b));
        setChromeVisible(true);
    };

    const captureSelection = () => {
        const selection = window.getSelection();
        const text = selection?.toString().trim().slice(0, 500) || '';
        if (!text) return;
        const node = selection?.anchorNode;
        const element = (node?.nodeType === 3 ? node.parentElement : node as HTMLElement | null)?.closest?.('[data-p]') as HTMLElement | null;
        const para = Number(element?.dataset.p);
        if (Number.isFinite(para)) {
            setSelected({ text, para });
            setChromeVisible(true);
        }
    };

    const addHighlight = (color: Annotation['color']) => {
        if (!selected) return;
        setAnnotations(previous => [...previous, { id: `${Date.now()}-${Math.random()}`, para: selected.para, text: selected.text, color }]);
        window.getSelection()?.removeAllRanges();
        setSelected(null);
    };

    const openNote = () => {
        if (selected) setNoteDraft({ quote: selected.text, para: selected.para, text: '' });
    };

    const saveNote = () => {
        if (!noteDraft) return;
        setAnnotations(previous => [...previous, { id: `${Date.now()}-${Math.random()}`, para: noteDraft.para, text: noteDraft.quote, color: 'yellow', note: noteDraft.text.trim() }]);
        setNoteDraft(null);
        setSelected(null);
        window.getSelection()?.removeAllRanges();
    };

    const deleteAnnotation = (id: string) => setAnnotations(previous => previous.filter(annotation => annotation.id !== id));

    const closeReader = () => {
        if (book && paragraphs.length) persist();
        setImmersive(false);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        setBook(null);
    };

    const toggleImmersive = () => {
        const next = !immersive;
        setImmersive(next);
        if (next) {
            const request = document.documentElement.requestFullscreen?.();
            if (request) void request.catch(() => {});
        } else if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => {});
        }
    };

    const chapters = useMemo(() => paragraphs.map((text, index) => ({ text, index })).filter(item => isHeading(item.text)).slice(0, 100), [paragraphs]);
    const searchMatches = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        if (needle.length < 2) return [] as { index: number; text: string }[];
        return paragraphs.map((text, index) => ({ index, text })).filter(item => item.text.toLowerCase().includes(needle)).slice(0, 50);
    }, [paragraphs, searchQuery]);

    useEffect(() => {
        if (!book) return;
        const keyboard = (event: KeyboardEvent) => {
            if (readingMode === 'page' && event.key === 'ArrowRight') turnPage(1);
            if (readingMode === 'page' && event.key === 'ArrowLeft') turnPage(-1);
            if (event.key === 'Escape') panel ? setPanel(null) : setChromeVisible(previous => !previous);
        };
        window.addEventListener('keydown', keyboard);
        return () => window.removeEventListener('keydown', keyboard);
    }, [book, page, pages.length, panel, readingMode]);

    if (!book) return null;

    const bookmarkedHere = bookmarks.some(item => Math.abs(item - Math.round(progress)) <= 1);
    const textStyle = {
        fontSize,
        lineHeight,
        paddingLeft: margin,
        paddingRight: margin,
        filter: `brightness(${brightness}%)`,
        color: textColor === 'auto' ? undefined : textColor === 'charcoal' ? '#292620' : textColor === 'brown' ? '#684a34' : '#f5f4f0',
    };

    const renderParagraph = (text: string, index: number) => {
        const marks = annotations.filter(annotation => annotation.para === index);
        return isHeading(text)
            ? <h2 data-p={index} key={index}><MarkedText text={text} annotations={marks} /></h2>
            : <p data-p={index} key={index}><MarkedText text={text} annotations={marks} /></p>;
    };

    const renderPageAt = (pageIndex: number, extraClass = '') => {
        const pageData = pages[Math.max(0, Math.min(pages.length - 1, pageIndex))] || { start: 0, end: 0 };
        const pageParagraphs = paragraphs.slice(pageData.start, pageData.end);
        return (
            <article className={`book-reader-page ${extraClass}`.trim()} style={textStyle}>
                {pageIndex === 0 && <header className='book-reader-opening'><small>NFCPS ONE · READING</small><h1>{book.title}</h1><p>{book.author}</p></header>}
                {pageParagraphs.map((paragraph, offset) => renderParagraph(paragraph, pageData.start + offset))}
                {pageIndex === pages.length - 1 && <footer className='book-reader-end'><Check /><strong>You reached the end.</strong><button onClick={() => goPage(0)}>Read again</button></footer>}
            </article>
        );
    };

    const handleStageClick = () => {
        if (window.getSelection()?.toString().trim()) return;
        if (!panel && !noteDraft) setChromeVisible(previous => !previous);
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
        if (touchStart !== null && readingMode === 'page') {
            const end = event.changedTouches[0]?.clientX ?? touchStart;
            const distance = end - touchStart;
            if (Math.abs(distance) > 58) {
                turnPage(distance < 0 ? 1 : -1);
                setTouchStart(null);
                return;
            }
        }
        setTouchStart(null);
        window.setTimeout(captureSelection, 70);
    };

    const handleScroll = (event: React.UIEvent<HTMLElement>) => {
        if (readingMode !== 'scroll') return;
        const element = event.currentTarget;
        const max = Math.max(1, element.scrollHeight - element.clientHeight);
        const next = Math.max(0, Math.min(100, (element.scrollTop / max) * 100));
        setScrollProgress(previous => Math.abs(previous - next) >= 0.35 ? next : previous);
    };

    return (
        <div className={`book-reader book-reader-${theme} book-reader-family-${family}${chromeVisible ? ' chrome-visible' : ' chrome-hidden'}${immersive ? ' is-immersive' : ''}`}>
            <header className='book-reader-top'>
                <button className='book-reader-round' onClick={closeReader} aria-label='Close book'><ChevronLeft /></button>
                <div className='book-reader-title'><strong>{book.title}</strong><small>{book.author}</small></div>
                <button className={`book-reader-round ${bookmarkedHere ? 'active' : ''}`} onClick={toggleBookmark} aria-label='Bookmark this place'><Bookmark /></button>
            </header>

            <main
                ref={node => { scrollRef.current = node; }}
                className={`book-reader-stage mode-${readingMode}`}
                onClick={handleStageClick}
                onMouseUp={captureSelection}
                onTouchStart={event => setTouchStart(event.touches[0]?.clientX ?? null)}
                onTouchEnd={handleTouchEnd}
                onScroll={handleScroll}
            >
                {loading ? (
                    <div className='book-reader-loading'>
                        <FlipBookMark size={46} />
                        <LoaderCircle className='spin' />
                        <strong>Opening {book.title}</strong>
                        <small>Preparing a clean reading copy…</small>
                    </div>
                ) : error ? (
                    <div className='book-reader-error'>
                        <BookOpen size={40} />
                        <strong>We couldn’t prepare this edition.</strong>
                        <p>{error}</p>
                        <button onClick={() => setRetry(value => value + 1)}>Try again</button>
                    </div>
                ) : readingMode === 'page' ? (
                    <div className={`book-reader-page-stack${flip ? ' is-flipping' : ''}`} aria-live='polite'>
                        {renderPageAt(flip?.direction === 'next' ? flip.to : page)}
                        {flip && renderPageAt(flip.direction === 'next' ? flip.from : flip.to, `book-reader-flip-sheet flip-${flip.direction}`)}
                    </div>
                ) : (
                    <article className='book-reader-page book-reader-continuous' style={textStyle}>
                        <header className='book-reader-opening'><small>NFCPS ONE · READING</small><h1>{book.title}</h1><p>{book.author}</p></header>
                        {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
                        <footer className='book-reader-end'><Check /><strong>You reached the end.</strong><button onClick={() => jumpProgress(0)}>Back to beginning</button></footer>
                    </article>
                )}
            </main>

            {!loading && !error && (
                <footer className='book-reader-controls'>
                    <div className='book-reader-progress-row'>
                        <span>{Math.round(progress)}%</span>
                        <input type='range' min='0' max='100' step='1' value={Math.round(progress)} onChange={event => jumpProgress(Number(event.target.value))} aria-label='Reading progress' />
                        <span>{readingMode === 'page' ? `${page + 1}/${pages.length}` : 'Continuous'}</span>
                    </div>
                    <nav>
                        <button onClick={() => { setPanel('contents'); setChromeVisible(true); }}><LayoutList /><span>Contents</span></button>
                        <button onClick={() => { setPanel('notes'); setChromeVisible(true); }}><NotebookPen /><span>Notes</span></button>
                        <button onClick={() => { setPanel('settings'); setChromeVisible(true); }}><Type /><span>Themes & Settings</span></button>
                    </nav>
                    <small className='book-reader-device-status'>{offline ? <><CloudOff /> Available offline on this device</> : <><BookOpen /> Reading online</>}</small>
                </footer>
            )}

            {panel && <button className='book-reader-sheet-backdrop' onClick={() => setPanel(null)} aria-label='Close reading panel' />}

            {panel === 'settings' && (
                <aside className='book-reader-sheet settings-sheet'>
                    <div className='book-reader-sheet-handle' />
                    <header><div><small>THEMES & SETTINGS</small><strong>Make the page yours.</strong></div><button onClick={() => setPanel(null)}><X /></button></header>
                    <section className='book-reader-setting-block'>
                        <label>Reading style</label>
                        <div className='book-reader-segmented'>
                            <button className={readingMode === 'page' ? 'active' : ''} onClick={() => changeMode('page')}>Pages</button>
                            <button className={readingMode === 'scroll' ? 'active' : ''} onClick={() => changeMode('scroll')}>Continuous</button>
                        </div>
                    </section>
                    <section className='book-reader-setting-block'>
                        <label>Text size</label>
                        <div className='book-reader-stepper'><button onClick={() => setFontSize(value => Math.max(15, value - 1))}><Minus /></button><span><Type /> Aa</span><button onClick={() => setFontSize(value => Math.min(31, value + 1))}><Plus /></button></div>
                    </section>
                    <section className='book-reader-setting-block'>
                        <label>Theme</label>
                        <div className='book-reader-themes'>
                            {(['paper', 'light', 'sepia', 'dark'] as Theme[]).map(item => <button key={item} className={`${item} ${theme === item ? 'active' : ''}`} onClick={() => setTheme(item)}><i />{item}</button>)}
                        </div>
                    </section>
                    <section className='book-reader-setting-block'>
                        <label>Typeface</label>
                        <div className='book-reader-grid-choice'>
                            <button className={family === 'serif' ? 'active' : ''} onClick={() => setFamily('serif')}>Classic</button>
                            <button className={family === 'literary' ? 'active' : ''} onClick={() => setFamily('literary')}>Literary</button>
                            <button className={family === 'sans' ? 'active' : ''} onClick={() => setFamily('sans')}>Clean</button>
                            <button className={family === 'humanist' ? 'active' : ''} onClick={() => setFamily('humanist')}>Humanist</button>
                        </div>
                    </section>
                    <section className='book-reader-setting-block two-up'>
                        <div><label>Line spacing</label><div className='book-reader-stepper compact'><button onClick={() => setLineHeight(value => Math.max(1.35, Number((value - 0.08).toFixed(2))))}><Minus /></button><span><AlignJustify /></span><button onClick={() => setLineHeight(value => Math.min(2.2, Number((value + 0.08).toFixed(2))))}><Plus /></button></div></div>
                        <div><label>Margins</label><div className='book-reader-stepper compact'><button onClick={() => setMargin(value => Math.max(16, value - 4))}><Minus /></button><span>↔</span><button onClick={() => setMargin(value => Math.min(64, value + 4))}><Plus /></button></div></div>
                    </section>
                    <section className='book-reader-setting-block'>
                        <label>Brightness <b>{brightness}%</b></label>
                        <div className='book-reader-stepper'><button onClick={() => setBrightness(value => Math.max(72, value - 5))}><Minus /></button><span><Sun /></span><button onClick={() => setBrightness(value => Math.min(115, value + 5))}><Plus /></button></div>
                    </section>
                    <section className='book-reader-setting-block'>
                        <label>Text colour</label>
                        <div className='book-reader-grid-choice'>
                            {(['auto', 'charcoal', 'brown', 'white'] as TextColor[]).map(item => <button key={item} className={textColor === item ? 'active' : ''} onClick={() => setTextColor(item)}>{item === 'auto' ? 'Automatic' : item === 'charcoal' ? 'Ink' : item === 'brown' ? 'Warm' : 'White'}</button>)}
                        </div>
                    </section>
                    <section className='book-reader-setting-actions'>
                        <button className={pageTurnSound ? 'active' : ''} onClick={() => setPageTurnSound(value => !value)}>{pageTurnSound ? <Volume2 /> : <VolumeX />}<span><strong>Page turn sound</strong><small>{pageTurnSound ? 'Soft paper sound plays when you swipe a page.' : 'Page turns are silent.'}</small></span></button>
                        <button className={saved ? 'active' : ''} onClick={() => setSaved(value => !value)}><Heart /><span><strong>{saved ? 'Saved for later' : 'Save for later'}</strong><small>Keep this title in your Reading space.</small></span></button>
                        <button className={immersive ? 'active' : ''} onClick={toggleImmersive}><Maximize2 /><span><strong>{immersive ? 'Leave fullscreen' : 'Fullscreen reading'}</strong><small>Use as much of your screen as your device allows.</small></span></button>
                    </section>
                </aside>
            )}

            {panel === 'contents' && (
                <aside className='book-reader-sheet contents-sheet'>
                    <div className='book-reader-sheet-handle' />
                    <header><div><small>BOOK</small><strong>Contents & search</strong></div><button onClick={() => setPanel(null)}><X /></button></header>
                    <label className='book-reader-search'><Search /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder='Search inside this book' /></label>
                    {searchQuery.trim().length >= 2 && <div className='book-reader-search-results'>{searchMatches.length ? searchMatches.map(item => <button key={item.index} onClick={() => jumpParagraph(item.index)}>{item.text.slice(0, 150)}</button>) : <p>No matches in this reading copy.</p>}</div>}
                    <section className='book-reader-panel-list'>
                        <small>CHAPTERS</small>
                        {chapters.length ? chapters.map(item => <button key={item.index} onClick={() => jumpParagraph(item.index)}>{item.text.slice(0, 110)}<ChevronRight /></button>) : [0, 25, 50, 75, 95].map(value => <button key={value} onClick={() => jumpProgress(value)}>{value === 0 ? 'Beginning' : `${value}% through`}<ChevronRight /></button>)}
                    </section>
                    <section className='book-reader-panel-list'>
                        <small>BOOKMARKS</small>
                        {bookmarks.length ? bookmarks.map(value => <button key={value} onClick={() => jumpProgress(value)}><span><Bookmark /> {value}% through</span><ChevronRight /></button>) : <p>No bookmarks yet. Tap the bookmark at the top of a page to save your place.</p>}
                    </section>
                </aside>
            )}

            {panel === 'notes' && (
                <aside className='book-reader-sheet notes-sheet'>
                    <div className='book-reader-sheet-handle' />
                    <header><div><small>YOUR MARGINS</small><strong>Notes & highlights</strong></div><button onClick={() => setPanel(null)}><X /></button></header>
                    <section className='book-reader-panel-list annotations-list'>
                        {annotations.length ? annotations.map(annotation => (
                            <article key={annotation.id}>
                                <button onClick={() => jumpParagraph(annotation.para)}>
                                    <mark className={`mark-${annotation.color}`}>{annotation.text.slice(0, 150)}</mark>
                                    {annotation.note && <p>{annotation.note}</p>}
                                </button>
                                <button className='book-reader-delete-note' onClick={() => deleteAnnotation(annotation.id)}><X /></button>
                            </article>
                        )) : <div className='book-reader-empty-notes'><Highlighter /><strong>Your margins are clear.</strong><p>Select text while reading to highlight it or attach a private note.</p></div>}
                    </section>
                </aside>
            )}

            {selected && !noteDraft && (
                <div className='book-reader-selection'>
                    <span>{selected.text.slice(0, 58)}{selected.text.length > 58 ? '…' : ''}</span>
                    <div><button className='yellow' onClick={() => addHighlight('yellow')}><Highlighter /> Yellow</button><button className='green' onClick={() => addHighlight('green')}>Green</button><button className='blue' onClick={() => addHighlight('blue')}>Blue</button><button onClick={openNote}><NotebookPen /> Note</button></div>
                </div>
            )}

            {noteDraft && (
                <div className='book-reader-note-composer'>
                    <div><small>ADD NOTE</small><strong>“{noteDraft.quote.slice(0, 120)}{noteDraft.quote.length > 120 ? '…' : ''}”</strong></div>
                    <textarea autoFocus value={noteDraft.text} onChange={event => setNoteDraft({ ...noteDraft, text: event.target.value })} placeholder='Write your thought, prayer, question or insight…' />
                    <footer><button onClick={() => setNoteDraft(null)}>Cancel</button><button className='primary' onClick={saveNote}>Save note</button></footer>
                </div>
            )}
        </div>
    );
}
