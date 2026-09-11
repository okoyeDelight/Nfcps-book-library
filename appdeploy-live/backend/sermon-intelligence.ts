import { ai, db, error, json } from '@appdeploy/sdk';

type Segment = { start: number; dur: number; text: string };
type TranscriptPart = {
    videoId: string;
    title: string;
    creator: string;
    language: string;
    updatedAt: number;
    part: number;
    totalParts: number;
    segments: Segment[];
    unavailable?: boolean;
    reason?: string;
};
type Transcript = {
    available: boolean;
    videoId: string;
    title: string;
    creator: string;
    language: string;
    updatedAt: number;
    segments: Segment[];
    reason?: string;
};
type CaptionTrack = {
    baseUrl: string;
    languageCode?: string;
    kind?: string;
    name?: { simpleText?: string; runs?: { text?: string }[] };
};
type SpeechTranscriptPart = {
    videoId: string;
    title: string;
    creator: string;
    category: string;
    start: number;
    end: number;
    text: string;
    references: string[];
    theme: string;
    note: string;
    updatedAt: number;
};
type SpeechIndexRecord = {
    videoId: string;
    title: string;
    creator: string;
    category: string;
    segments: number;
    coverageSeconds: number;
    updatedAt: number;
    lastCompiledAt?: number;
};

type ScriptureRelation = 'cited' | 'quoted' | 'related' | 'compare' | 'context';
type ScriptureCue = {
    reference: string;
    start: number;
    end: number;
    relation: ScriptureRelation;
    reason: string;
};
type BiblePassage = {
    reference: string;
    text: string;
    translation: 'KJV';
};
type SermonChapter = { start: number; end: number; title: string; summary: string };
type SermonClaim = {
    id: string;
    start: number;
    end: number;
    claim: string;
    supportRefs: string[];
    compareRefs: string[];
    note: string;
};
type GraphEdge = { from: string; to: string; relation: string };
type SermonPackage = {
    available: boolean;
    videoId: string;
    title: string;
    creator: string;
    category: string;
    language: string;
    updatedAt: number;
    transcriptUpdatedAt: number;
    durationSeconds: number;
    summary: string;
    themes: string[];
    chapters: SermonChapter[];
    claims: SermonClaim[];
    scriptures: ScriptureCue[];
    scriptureTrail: string[];
    passages: BiblePassage[];
    graph: GraphEdge[];
    reason?: string;
};

type IntelligenceRaw = {
    summary?: unknown;
    themes?: unknown;
    chapters?: unknown;
    claims?: unknown;
    scriptures?: unknown;
    scriptureTrail?: unknown;
    graph?: unknown;
};

type LiveLensRaw = { references?: unknown; theme?: unknown; note?: unknown };

const CACHE_OK = 14 * 24 * 60 * 60 * 1000;
const CACHE_MISS = 6 * 60 * 60 * 1000;
const PACKAGE_TTL = 30 * 24 * 60 * 60 * 1000;
const SPEECH_INDEX = 'watch_speech_intelligence_index';
const validId = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id);
const transcriptTable = (id: string) => `watch_transcript_${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
const speechTranscriptTable = (id: string) => `watch_speech_transcript_${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
const intelligenceTable = (id: string) => `watch_sermon_intelligence_${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
const clean = (value: string) => value.replace(/\s+/g, ' ').replace(/\u200b/g, '').trim();
const asString = (value: unknown, limit = 500) => clean(String(value || '')).slice(0, limit);
const asNumber = (value: unknown, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};
const asStringArray = (value: unknown, limit = 12) =>
    Array.isArray(value)
        ? Array.from(new Set(value.map(item => asString(item, 120)).filter(Boolean))).slice(0, limit)
        : [];

function extractArray(text: string, key: string) {
    const at = text.indexOf(key);
    if (at < 0) return '';
    const start = text.indexOf('[', at + key.length);
    if (start < 0) return '';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (inString) {
            if (escape) escape = false;
            else if (char === '\\') escape = true;
            else if (char === '"') inString = false;
            continue;
        }
        if (char === '"') {
            inString = true;
            continue;
        }
        if (char === '[') depth += 1;
        if (char === ']') {
            depth -= 1;
            if (depth === 0) return text.slice(start, index + 1);
        }
    }
    return '';
}

const xmlDecode = (value: string) => value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)));

async function readTranscriptCache(videoId: string) {
    const { items } = await db.list<TranscriptPart>(transcriptTable(videoId), { limit: 20 });
    if (!items.length) return null;
    const sorted = [...items].sort((a, b) => a.part - b.part);
    const first = sorted[0];
    const fresh = Date.now() - first.updatedAt < (first.unavailable ? CACHE_MISS : CACHE_OK);
    if (!fresh) return null;
    if (first.unavailable) {
        return {
            available: false,
            videoId,
            title: first.title,
            creator: first.creator,
            language: first.language,
            updatedAt: first.updatedAt,
            segments: [],
            reason: first.reason,
        } as Transcript;
    }
    return {
        available: true,
        videoId,
        title: first.title,
        creator: first.creator,
        language: first.language,
        updatedAt: first.updatedAt,
        segments: sorted.flatMap(item => item.segments),
    } as Transcript;
}

async function writeTranscriptCache(transcriptValue: Transcript) {
    const name = transcriptTable(transcriptValue.videoId);
    const { items } = await db.list<TranscriptPart>(name, { limit: 20 });
    if (items.length) await db.delete(name, items.map(item => item.id));
    if (!transcriptValue.available) {
        await db.add(name, [{
            videoId: transcriptValue.videoId,
            title: transcriptValue.title,
            creator: transcriptValue.creator,
            language: transcriptValue.language,
            updatedAt: transcriptValue.updatedAt,
            part: 0,
            totalParts: 1,
            segments: [],
            unavailable: true,
            reason: transcriptValue.reason || 'Captions are unavailable.',
        }]);
        return;
    }
    const size = 220;
    const chunks: Array<Record<string, unknown>> = [];
    for (let index = 0; index < transcriptValue.segments.length; index += size) {
        chunks.push({
            videoId: transcriptValue.videoId,
            title: transcriptValue.title,
            creator: transcriptValue.creator,
            language: transcriptValue.language,
            updatedAt: transcriptValue.updatedAt,
            part: chunks.length,
            totalParts: Math.ceil(transcriptValue.segments.length / size),
            segments: transcriptValue.segments.slice(index, index + size),
        });
    }
    if (chunks.length) await db.add(name, chunks);
}

async function page(url: string) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'user-agent': 'Mozilla/5.0 NFCPS-Sermon-Companion/3.0',
            'accept-language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`YouTube page ${response.status}`);
    return response.text();
}

async function tracksFor(videoId: string) {
    for (const url of [
        `https://www.youtube.com/watch?v=${videoId}&hl=en`,
        `https://www.youtube-nocookie.com/embed/${videoId}`,
    ]) {
        try {
            const html = await page(url);
            const raw = extractArray(html, '"captionTracks":');
            if (!raw) continue;
            const tracks = JSON.parse(raw) as CaptionTrack[];
            if (Array.isArray(tracks) && tracks.length) return tracks;
        } catch {
            // Try the next YouTube surface.
        }
    }
    return [] as CaptionTrack[];
}

function group(raw: Segment[]) {
    const output: Segment[] = [];
    let current: Segment | null = null;
    for (const segment of raw) {
        const text = clean(segment.text);
        if (!text) continue;
        if (current && segment.start - current.start <= 24 && current.text.length + text.length < 650) {
            if (!current.text.endsWith(text)) current.text = `${current.text} ${text}`;
            current.dur = Math.max(current.dur, segment.start + segment.dur - current.start);
        } else {
            if (current) output.push(current);
            current = { start: segment.start, dur: Math.max(0.2, segment.dur), text };
        }
    }
    if (current) output.push(current);
    return output.slice(0, 1500);
}

async function captionSegments(track: CaptionTrack) {
    const base = track.baseUrl.replace(/\\u0026/g, '&');
    try {
        const url = `${base}${base.includes('?') ? '&' : '?'}fmt=json3`;
        const response = await fetch(url, {
            headers: { 'user-agent': 'Mozilla/5.0 NFCPS-Sermon-Companion/3.0' },
            signal: AbortSignal.timeout(8_000),
        });
        if (response.ok) {
            const data = await response.json() as {
                events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[];
            };
            const raw = (data.events || [])
                .map(event => ({
                    start: (event.tStartMs || 0) / 1000,
                    dur: (event.dDurationMs || 0) / 1000,
                    text: (event.segs || []).map(segment => segment.utf8 || '').join(' '),
                }))
                .filter(item => clean(item.text));
            const grouped = group(raw);
            if (grouped.length) return grouped;
        }
    } catch {
        // Fall back to XML captions.
    }
    try {
        const response = await fetch(base, {
            headers: { 'user-agent': 'Mozilla/5.0 NFCPS-Sermon-Companion/3.0' },
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return [];
        const xml = await response.text();
        const raw = [...xml.matchAll(/<text[^>]*start="([\d.]+)"[^>]*duration="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)]
            .map(match => ({
                start: Number(match[1]),
                dur: Number(match[2]),
                text: xmlDecode(match[3].replace(/<[^>]+>/g, ' ')),
            }));
        return group(raw);
    } catch {
        return [];
    }
}

async function listSpeechParts(videoId: string) {
    const { items } = await db.list<SpeechTranscriptPart>(speechTranscriptTable(videoId), { limit: 480 });
    return items;
}

function speechTranscriptFromItems(videoId: string, title: string, creator: string, items: Array<SpeechTranscriptPart & { id: string }>) {
    if (!items.length) return null;
    const ordered = [...items].sort((a, b) => a.start - b.start || b.updatedAt - a.updatedAt);
    const unique = new Map<number, SpeechTranscriptPart>();
    for (const item of ordered) {
        const key = Math.round(item.start / 6);
        if (!unique.has(key)) unique.set(key, item);
    }
    const segments = [...unique.values()]
        .sort((a, b) => a.start - b.start)
        .map(item => ({ start: item.start, dur: Math.max(0.5, item.end - item.start), text: clean(item.text) }))
        .filter(item => item.text.length >= 4);
    const coverageSeconds = segments.reduce((total, item) => total + item.dur, 0);
    const updatedAt = Math.max(...ordered.map(item => item.updatedAt));
    const available = segments.length >= 3 && coverageSeconds >= 45;
    return {
        transcript: {
            available,
            videoId,
            title,
            creator,
            language: 'spoken-word',
            updatedAt,
            segments,
            reason: available ? undefined : `Spoken Lens has learned ${Math.round(coverageSeconds)} seconds of this message. Keep watching so NFCPS can build the full sermon map from the speaker's own words.`,
        } as Transcript,
        coverageSeconds,
        segments: segments.length,
    };
}

async function readSpeechTranscript(videoId: string, title: string, creator: string) {
    return speechTranscriptFromItems(videoId, title, creator, await listSpeechParts(videoId));
}

async function invalidatePackage(videoId: string) {
    const { items } = await db.list<SermonPackage>(intelligenceTable(videoId), { limit: 1 });
    if (items[0]) await db.delete(intelligenceTable(videoId), [items[0].id]);
}

async function upsertSpeechIndex(input: SpeechIndexRecord) {
    const { items } = await db.list<SpeechIndexRecord>(SPEECH_INDEX, { limit: 300 });
    const current = items.find(item => item.videoId === input.videoId);
    if (current) {
        const { id, ...record } = current;
        const [ok] = await db.update(SPEECH_INDEX, [{ id, record: { ...record, ...input, lastCompiledAt: record.lastCompiledAt } }]);
        if (!ok) throw new Error('Could not update Spoken Lens index');
        return;
    }
    const [id] = await db.add(SPEECH_INDEX, [input]);
    if (!id) throw new Error('Could not create Spoken Lens index');
}

async function saveSpokenSegment(input: {
    videoId: string;
    title: string;
    creator: string;
    category: string;
    start: number;
    end: number;
    text: string;
}) {
    const existingItems = await listSpeechParts(input.videoId);
    const near = existingItems.find(item => Math.abs(item.start - input.start) < 7);
    if (near && clean(near.text).length >= Math.max(24, clean(input.text).length * 0.8)) {
        const passages = await hydratePassages(near.references || []);
        const progress = speechTranscriptFromItems(input.videoId, input.title, input.creator, existingItems);
        return {
            available: true,
            cached: true,
            transcript: near.text,
            theme: near.theme,
            note: near.note,
            passages,
            progress: { segments: progress?.segments || 0, coverageSeconds: progress?.coverageSeconds || 0, ready: Boolean(progress?.transcript.available) },
        };
    }
    const analysis = await liveLens(input.text);
    const record: SpeechTranscriptPart = {
        videoId: input.videoId,
        title: input.title,
        creator: input.creator,
        category: input.category,
        start: input.start,
        end: Math.max(input.start + 1, input.end),
        text: clean(input.text).slice(0, 5000),
        references: analysis.passages.map(item => item.reference),
        theme: analysis.theme,
        note: analysis.note,
        updatedAt: Date.now(),
    };
    if (near) {
        const [ok] = await db.update(speechTranscriptTable(input.videoId), [{ id: near.id, record }]);
        if (!ok) throw new Error('Could not update Spoken Lens transcript');
    } else if (existingItems.length < 470) {
        const [id] = await db.add(speechTranscriptTable(input.videoId), [record]);
        if (!id) throw new Error('Could not save Spoken Lens transcript');
    }
    await invalidatePackage(input.videoId);
    const progress = await readSpeechTranscript(input.videoId, input.title, input.creator);
    if (progress?.transcript.available) {
        await upsertSpeechIndex({
            videoId: input.videoId,
            title: input.title,
            creator: input.creator,
            category: input.category,
            segments: progress.segments,
            coverageSeconds: progress.coverageSeconds,
            updatedAt: Date.now(),
        });
    }
    return {
        available: true,
        cached: false,
        transcript: record.text,
        theme: record.theme,
        note: record.note,
        passages: analysis.passages,
        progress: { segments: progress?.segments || 1, coverageSeconds: progress?.coverageSeconds || Math.max(0, input.end - input.start), ready: Boolean(progress?.transcript.available) },
    };
}

async function fetchTranscript(videoId: string, title: string, creator: string): Promise<Transcript> {
    const tracks = await tracksFor(videoId);
    if (!tracks.length) {
        return {
            available: false,
            videoId,
            title,
            creator,
            language: '',
            updatedAt: Date.now(),
            segments: [],
            reason: 'No reusable spoken transcript exists yet. Enable Spoken Lens and NFCPS will learn this message directly from the speaker’s own words.',
        };
    }
    const track = tracks.find(item => String(item.languageCode || '').toLowerCase().startsWith('en'))
        || tracks.find(item => item.kind !== 'asr')
        || tracks[0];
    const segments = await captionSegments(track);
    if (!segments.length) {
        return {
            available: false,
            videoId,
            title,
            creator,
            language: String(track.languageCode || ''),
            updatedAt: Date.now(),
            segments: [],
            reason: 'Captions were detected, but the transcript could not be retrieved right now.',
        };
    }
    return {
        available: true,
        videoId,
        title,
        creator,
        language: String(track.languageCode || 'en'),
        updatedAt: Date.now(),
        segments,
    };
}

async function transcript(videoId: string, title: string, creator: string) {
    const heard = await readSpeechTranscript(videoId, title, creator);
    if (heard?.transcript.available) return heard.transcript;
    const cached = await readTranscriptCache(videoId);
    if (cached?.available) return cached;
    if (cached && !cached.available) return heard?.transcript || cached;
    let next: Transcript;
    try {
        next = await fetchTranscript(videoId, title, creator);
    } catch (cause) {
        next = {
            available: false,
            videoId,
            title,
            creator,
            language: '',
            updatedAt: Date.now(),
            segments: [],
            reason: 'No reusable spoken transcript exists yet. Enable Spoken Lens so NFCPS can learn the actual message while it plays.',
        };
        console.warn('Optional caption shortcut failed', videoId, cause);
    }
    try {
        await writeTranscriptCache(next);
    } catch (cause) {
        console.warn('Optional transcript cache write failed', videoId, cause);
    }
    if (next.available) return next;
    return heard?.transcript || next;
}

const stamp = (seconds: number) => {
    const value = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const remainder = value % 60;
    return hours
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
        : `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const STOP = new Set([
    'what', 'when', 'where', 'which', 'this', 'that', 'with', 'from', 'about', 'have', 'does', 'did',
    'said', 'say', 'sermon', 'message', 'talk', 'tell', 'please', 'could', 'would', 'should', 'there',
    'their', 'them', 'then', 'than', 'into', 'your', 'you', 'the', 'and', 'for', 'are', 'was',
]);

function evidenceFor(value: Transcript, question: string) {
    const terms = Array.from(new Set(question.toLowerCase().match(/[a-z0-9']{3,}/g) || []))
        .filter(term => !STOP.has(term));
    const windows = value.segments.map((segment, index) => {
        const around = value.segments.slice(Math.max(0, index - 1), Math.min(value.segments.length, index + 3));
        const text = around.map(item => item.text).join(' ');
        const lower = text.toLowerCase();
        let score = terms.reduce((total, term) => total + (lower.includes(term) ? 3 : 0), 0);
        if (terms.length > 1 && terms.slice(0, 2).every(term => lower.includes(term))) score += 4;
        return {
            start: around[0]?.start || segment.start,
            end: (around[around.length - 1]?.start || segment.start) + (around[around.length - 1]?.dur || segment.dur),
            text: clean(text).slice(0, 1100),
            score,
        };
    }).sort((a, b) => b.score - a.score);
    const picked: typeof windows = [];
    for (const window of windows) {
        if (picked.some(item => Math.abs(item.start - window.start) < 35)) continue;
        picked.push(window);
        if (picked.length === 6) break;
    }
    if (picked.every(item => item.score === 0) && value.segments.length > 12) {
        return [0.15, 0.35, 0.55, 0.75, 0.9]
            .map(position => value.segments[Math.min(value.segments.length - 1, Math.floor(value.segments.length * position))])
            .filter(Boolean)
            .map(segment => ({
                start: segment.start,
                end: segment.start + segment.dur,
                text: segment.text.slice(0, 900),
                score: 0,
            }));
    }
    return picked;
}

const BOOK_NAMES = '(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\\s*Samuel|2\\s*Samuel|1\\s*Kings|2\\s*Kings|1\\s*Chronicles|2\\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs?|Ecclesiastes|Song(?:\\s+of\\s+Solomon)?|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\\s*Corinthians|2\\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\\s*Thessalonians|2\\s*Thessalonians|1\\s*Timothy|2\\s*Timothy|Titus|Philemon|Hebrews|James|1\\s*Peter|2\\s*Peter|1\\s*John|2\\s*John|3\\s*John|Jude|Revelation)';
const referenceRegex = new RegExp(`\\b(${BOOK_NAMES})\\s+(\\d{1,3})(?::(\\d{1,3})(?:[-–](\\d{1,3}))?)?`, 'gi');

function normalizeReference(reference: string) {
    return clean(reference)
        .replace(/\bPsalm\b/i, 'Psalms')
        .replace(/\s*[-–]\s*/g, '-')
        .replace(/\s*:\s*/g, ':')
        .slice(0, 80);
}

function transcriptReferences(value: Transcript) {
    const output: ScriptureCue[] = [];
    for (const segment of value.segments) {
        referenceRegex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = referenceRegex.exec(segment.text)) !== null) {
            const reference = normalizeReference(`${match[1]} ${match[3] ? `${match[2]}:${match[3]}${match[4] ? `-${match[4]}` : ''}` : match[2]}`);
            if (!output.some(item => item.reference.toLowerCase() === reference.toLowerCase() && Math.abs(item.start - segment.start) < 20)) {
                output.push({
                    reference,
                    start: Math.max(0, segment.start - 2),
                    end: segment.start + Math.max(16, segment.dur + 8),
                    relation: 'cited',
                    reason: 'The speaker appears to reference this passage directly.',
                });
            }
            if (output.length >= 18) return output;
        }
    }
    return output;
}

function fnv(value: string) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result = Math.imul(result ^ value.charCodeAt(index), 16777619);
    }
    return (result >>> 0).toString(36);
}

const bibleTable = (reference: string) => `watch_bible_kjv_${fnv(reference.toLowerCase())}`;

async function readBibleCache(reference: string) {
    const { items } = await db.list<BiblePassage>(bibleTable(reference), { limit: 1 });
    return items[0] || null;
}

async function fetchBible(reference: string): Promise<BiblePassage | null> {
    const normalized = normalizeReference(reference);
    if (!normalized) return null;
    const cached = await readBibleCache(normalized);
    if (cached) return { reference: cached.reference, text: cached.text, translation: 'KJV' };
    const urls = [
        `https://dailybible.ca/api/${encodeURIComponent(normalized)}?translation=kjv`,
        `https://bible-api.com/${encodeURIComponent(normalized)}?translation=kjv`,
    ];
    for (const url of urls) {
        try {
            const response = await fetch(url, {
                headers: { 'accept': 'application/json', 'user-agent': 'NFCPS-Scripture-Lens/1.0' },
                signal: AbortSignal.timeout(6_000),
            });
            if (!response.ok) continue;
            const data = await response.json() as { reference?: string; text?: string };
            const text = clean(String(data.text || '')).slice(0, 3500);
            if (!text) continue;
            const passage: BiblePassage = {
                reference: normalized,
                text,
                translation: 'KJV',
            };
            const [id] = await db.add(bibleTable(normalized), [passage]);
            if (!id) console.warn('Scripture Lens could not cache passage', normalized);
            return passage;
        } catch {
            // Try the fallback source.
        }
    }
    return null;
}

async function hydratePassages(references: string[]) {
    const unique = Array.from(new Set(references.map(normalizeReference).filter(Boolean))).slice(0, 24);
    const results = await Promise.all(unique.map(reference => fetchBible(reference)));
    return results.filter((item): item is BiblePassage => Boolean(item));
}

async function readPackage(videoId: string) {
    const { items } = await db.list<SermonPackage>(intelligenceTable(videoId), { limit: 1 });
    const value = items[0];
    if (!value) return null;
    const ttl = value.available ? PACKAGE_TTL : CACHE_MISS;
    if (Date.now() - value.updatedAt > ttl) return null;
    return value as SermonPackage & { id: string };
}

async function writePackage(value: SermonPackage) {
    const name = intelligenceTable(value.videoId);
    const { items } = await db.list<SermonPackage>(name, { limit: 1 });
    if (items[0]) {
        const [updated] = await db.update(name, [{ id: items[0].id, record: value }]);
        if (!updated) throw new Error('Could not update sermon intelligence package');
        return;
    }
    const [id] = await db.add(name, [value]);
    if (!id) throw new Error('Could not save sermon intelligence package');
}

function compactTranscript(value: Transcript) {
    if (!value.segments.length) return '';
    const maxSegments = 190;
    const stride = Math.max(1, Math.ceil(value.segments.length / maxSegments));
    const selected: Segment[] = [];
    for (let index = 0; index < value.segments.length; index += stride) selected.push(value.segments[index]);
    const direct = transcriptReferences(value);
    for (const cue of direct) {
        const nearest = value.segments.reduce((best, segment) =>
            Math.abs(segment.start - cue.start) < Math.abs(best.start - cue.start) ? segment : best, value.segments[0]);
        if (!selected.some(item => Math.abs(item.start - nearest.start) < 1)) selected.push(nearest);
    }
    return selected
        .sort((a, b) => a.start - b.start)
        .map(segment => `[${stamp(segment.start)}] ${segment.text}`)
        .join('\n')
        .slice(0, 60_000);
}

function sanitizeRelation(value: unknown): ScriptureRelation {
    const relation = String(value || '').toLowerCase();
    if (relation === 'cited' || relation === 'quoted' || relation === 'related' || relation === 'compare' || relation === 'context') return relation;
    return 'related';
}

function normalizeRawPackage(raw: IntelligenceRaw, value: Transcript, category: string) {
    const duration = value.segments.length
        ? Math.ceil(value.segments[value.segments.length - 1].start + value.segments[value.segments.length - 1].dur)
        : 0;
    const chapters = Array.isArray(raw.chapters) ? raw.chapters.slice(0, 10).map((item, index) => {
        const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
            start: Math.max(0, Math.min(duration, asNumber(record.start))),
            end: Math.max(0, Math.min(duration, asNumber(record.end, duration))),
            title: asString(record.title, 90) || `Section ${index + 1}`,
            summary: asString(record.summary, 260),
        };
    }).filter(item => item.end >= item.start) : [];
    const claims = Array.isArray(raw.claims) ? raw.claims.slice(0, 12).map((item, index) => {
        const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
            id: `claim-${index + 1}`,
            start: Math.max(0, Math.min(duration, asNumber(record.start))),
            end: Math.max(0, Math.min(duration, asNumber(record.end, asNumber(record.start) + 20))),
            claim: asString(record.claim, 320),
            supportRefs: asStringArray(record.supportRefs, 4).map(normalizeReference),
            compareRefs: asStringArray(record.compareRefs, 4).map(normalizeReference),
            note: asString(record.note, 220),
        };
    }).filter(item => item.claim) : [];
    const scriptures = Array.isArray(raw.scriptures) ? raw.scriptures.slice(0, 18).map(item => {
        const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        const start = Math.max(0, Math.min(duration, asNumber(record.start)));
        return {
            reference: normalizeReference(asString(record.reference, 80)),
            start,
            end: Math.max(start + 8, Math.min(duration || start + 30, asNumber(record.end, start + 24))),
            relation: sanitizeRelation(record.relation),
            reason: asString(record.reason, 220),
        };
    }).filter(item => item.reference) : [];
    const graph = Array.isArray(raw.graph) ? raw.graph.slice(0, 30).map(item => {
        const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
            from: asString(record.from, 100),
            to: asString(record.to, 100),
            relation: asString(record.relation, 80) || 'connects to',
        };
    }).filter(item => item.from && item.to) : [];
    return {
        summary: asString(raw.summary, 700),
        themes: asStringArray(raw.themes, 10),
        chapters,
        claims,
        scriptures,
        scriptureTrail: asStringArray(raw.scriptureTrail, 12).map(normalizeReference),
        graph,
        duration,
        category,
    };
}

async function buildPackage(videoId: string, title: string, creator: string, category: string) {
    const cached = await readPackage(videoId);
    if (cached) {
        const { id: _id, ...value } = cached;
        return value;
    }
    const value = await transcript(videoId, title, creator);
    const duration = value.segments.length
        ? Math.ceil(value.segments[value.segments.length - 1].start + value.segments[value.segments.length - 1].dur)
        : 0;
    if (!value.available) {
        const unavailable: SermonPackage = {
            available: false,
            videoId,
            title,
            creator,
            category,
            language: value.language,
            updatedAt: Date.now(),
            transcriptUpdatedAt: value.updatedAt,
            durationSeconds: duration,
            summary: '',
            themes: [],
            chapters: [],
            claims: [],
            scriptures: [],
            scriptureTrail: [],
            passages: [],
            graph: [],
            reason: value.reason || 'A transcript is not available for this message.',
        };
        await writePackage(unavailable);
        return unavailable;
    }
    const directReferences = transcriptReferences(value);
    const compact = compactTranscript(value);
    let normalized: ReturnType<typeof normalizeRawPackage>;
    try {
        const result = await ai.extract({
            system: 'You are NFCPS Scripture Lens, a denomination-neutral Christian study assistant. Analyze only the supplied sermon transcript. Never declare a preacher spiritually approved or condemned. Never invent Bible verse text. Return Bible references only; another deterministic service will retrieve KJV text. Distinguish direct citations from passages that are merely related or useful for comparison. Use compare when a passage adds tension, qualification, balance, or important context to a claim. Keep claims close to what the speaker actually says. Build a useful sermon map and Scripture trail for discipleship, not an engagement-maximizing feed.',
            prompt: 'Create a structured sermon intelligence package. Produce a concise summary, 4-10 themes, 4-10 timestamped chapters, up to 12 significant claims, up to 18 timed Scripture references, and a 5-12 passage Scripture trail. For each claim, supportRefs are passages that strongly support the claim; compareRefs are passages worth reading alongside it for context or balance. The graph should connect themes, claims and Bible references using short relation labels. Timestamp values are seconds. Do not include Bible verse text.',
            content: `Sermon title: ${title}\nSpeaker: ${creator}\nCategory: ${category}\n\nTranscript:\n${compact}`,
            schema: {
                type: 'object',
                properties: {
                    summary: { type: 'string' },
                    themes: { type: 'array', items: { type: 'string' } },
                    chapters: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                start: { type: 'number' },
                                end: { type: 'number' },
                                title: { type: 'string' },
                                summary: { type: 'string' },
                            },
                            required: ['start', 'end', 'title', 'summary'],
                        },
                    },
                    claims: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                start: { type: 'number' },
                                end: { type: 'number' },
                                claim: { type: 'string' },
                                supportRefs: { type: 'array', items: { type: 'string' } },
                                compareRefs: { type: 'array', items: { type: 'string' } },
                                note: { type: 'string' },
                            },
                            required: ['start', 'end', 'claim', 'supportRefs', 'compareRefs', 'note'],
                        },
                    },
                    scriptures: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                start: { type: 'number' },
                                end: { type: 'number' },
                                reference: { type: 'string' },
                                relation: { type: 'string' },
                                reason: { type: 'string' },
                            },
                            required: ['start', 'end', 'reference', 'relation', 'reason'],
                        },
                    },
                    scriptureTrail: { type: 'array', items: { type: 'string' } },
                    graph: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                from: { type: 'string' },
                                to: { type: 'string' },
                                relation: { type: 'string' },
                            },
                            required: ['from', 'to', 'relation'],
                        },
                    },
                },
                required: ['summary', 'themes', 'chapters', 'claims', 'scriptures', 'scriptureTrail', 'graph'],
            },
            maxRetries: 2,
            maxTokens: 4500,
            temperature: 0.1,
            thinkingMode: 'FAST',
        });
        normalized = normalizeRawPackage(result.data as IntelligenceRaw, value, category);
    } catch (cause) {
        console.warn('Sermon intelligence extraction failed safely', videoId, cause);
        normalized = {
            summary: 'Transcript ready. Scripture Lens is temporarily using direct Bible references while deeper analysis is unavailable.',
            themes: [category || 'Christian Growth'],
            chapters: [],
            claims: [],
            scriptures: [],
            scriptureTrail: [],
            graph: [],
            duration,
            category,
        };
    }
    const mergedScriptures = Array.from(new Map(
        [...directReferences, ...normalized.scriptures]
            .map(item => [`${item.reference.toLowerCase()}:${Math.round(item.start / 15)}`, item]),
    ).values()).slice(0, 22);
    const allReferences = [
        ...mergedScriptures.map(item => item.reference),
        ...normalized.scriptureTrail,
        ...normalized.claims.flatMap(item => [...item.supportRefs, ...item.compareRefs]),
    ];
    const passages = await hydratePassages(allReferences);
    const safeScriptures = mergedScriptures.filter(item =>
        passages.some(passage => passage.reference.toLowerCase() === item.reference.toLowerCase()),
    );
    const packageValue: SermonPackage = {
        available: true,
        videoId,
        title,
        creator,
        category,
        language: value.language,
        updatedAt: Date.now(),
        transcriptUpdatedAt: value.updatedAt,
        durationSeconds: normalized.duration,
        summary: normalized.summary,
        themes: normalized.themes,
        chapters: normalized.chapters,
        claims: normalized.claims,
        scriptures: safeScriptures,
        scriptureTrail: normalized.scriptureTrail.filter(reference => passages.some(item => item.reference.toLowerCase() === reference.toLowerCase())),
        passages,
        graph: normalized.graph,
    };
    await writePackage(packageValue);
    return packageValue;
}

async function compileSpeechIntelligenceHeartbeat() {
    const { items } = await db.list<SpeechIndexRecord>(SPEECH_INDEX, { limit: 300 });
    const pending = items
        .filter(item => item.segments >= 3 && item.coverageSeconds >= 45 && item.updatedAt > Number(item.lastCompiledAt || 0))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3);
    const compiled: Array<Record<string, unknown>> = [];
    for (const item of pending) {
        try {
            const packageValue = await buildPackage(item.videoId, item.title, item.creator, item.category);
            const { id, ...record } = item;
            const [ok] = await db.update(SPEECH_INDEX, [{ id, record: { ...record, lastCompiledAt: Date.now() } }]);
            if (!ok) throw new Error('Could not checkpoint Spoken Lens compile');
            compiled.push({ videoId: item.videoId, available: packageValue.available, themes: packageValue.themes.slice(0, 4), scriptures: packageValue.scriptures.length, chapters: packageValue.chapters.length });
        } catch (cause) {
            console.warn('Spoken intelligence compile failed safely', item.videoId, cause);
            compiled.push({ videoId: item.videoId, available: false, error: 'compile_failed' });
        }
    }
    return { processed: pending.length, compiled };
}

function relevantPackagePassages(packageValue: SermonPackage, evidence: ReturnType<typeof evidenceFor>, question: string) {
    const lower = question.toLowerCase();
    const refs = new Set<string>();
    for (const cue of packageValue.scriptures) {
        if (evidence.some(item => Math.abs(item.start - cue.start) < 90)) refs.add(cue.reference);
    }
    for (const claim of packageValue.claims) {
        if (evidence.some(item => Math.abs(item.start - claim.start) < 90)) {
            claim.supportRefs.forEach(reference => refs.add(reference));
            claim.compareRefs.forEach(reference => refs.add(reference));
        }
    }
    if (/scripture|verse|bible|passage|support|compare|context/.test(lower)) {
        packageValue.scriptureTrail.slice(0, 8).forEach(reference => refs.add(reference));
    }
    return packageValue.passages.filter(item => refs.has(item.reference)).slice(0, 8);
}

async function liveLens(text: string) {
    const cleaned = clean(text).slice(0, 2000);
    if (cleaned.length < 20) return { available: false, theme: '', note: 'Keep speaking for a little longer.', passages: [] as BiblePassage[] };
    try {
        const result = await ai.extract({
            system: 'You are NFCPS Live Scripture Lens. From a short spoken Christian teaching excerpt, identify up to three Bible passages that are directly referenced or strongly relevant. Never invent verse text. Return references only. Be denomination-neutral, avoid judging the speaker, and prefer no result over a weak connection.',
            prompt: 'Return a short theme, a one-sentence note explaining why the passages are useful to read alongside this statement, and up to three Bible references. If there is no strong Scripture connection, return an empty references array.',
            content: cleaned,
            schema: {
                type: 'object',
                properties: {
                    references: { type: 'array', items: { type: 'string' } },
                    theme: { type: 'string' },
                    note: { type: 'string' },
                },
                required: ['references', 'theme', 'note'],
            },
            maxRetries: 1,
            maxTokens: 320,
            temperature: 0,
            thinkingMode: 'FAST',
        });
        const data = result.data as LiveLensRaw;
        const references = asStringArray(data.references, 3).map(normalizeReference);
        const passages = await hydratePassages(references);
        return {
            available: passages.length > 0,
            theme: asString(data.theme, 100),
            note: asString(data.note, 260),
            passages,
        };
    } catch (cause) {
        console.warn('Live Scripture Lens analysis failed safely', cause);
        return { available: false, theme: '', note: 'Scripture Lens is temporarily busy. Keep listening and try again.', passages: [] as BiblePassage[] };
    }
}

export const sermonIntelligenceRoutes = {
    'GET /api/watch/sermon/:id/transcript': [async ({ params, query }) => {
        const id = String(params.id || '');
        if (!validId(id)) return error('Invalid YouTube video id.', 400);
        const value = await transcript(
            id,
            String(query.title || 'Sermon').slice(0, 180),
            String(query.creator || 'Trusted creator').slice(0, 100),
        );
        const last = value.segments[value.segments.length - 1];
        return json({
            available: value.available,
            language: value.language,
            segments: value.segments.length,
            durationSeconds: last ? Math.ceil(last.start + last.dur) : 0,
            reason: value.reason || null,
            updatedAt: value.updatedAt,
        });
    }],
    'POST /api/watch/sermon/:id/speech-lens': [async ({ params, body }) => {
        const id = String(params.id || '');
        if (!validId(id)) return error('Invalid YouTube video id.', 400);
        const input = (body || {}) as { text?: string; start?: number; end?: number; title?: string; creator?: string; category?: string };
        const text = clean(String(input.text || '')).slice(0, 5000);
        if (text.length < 12) return error('Spoken Lens needs a little more speech before it can learn this section.', 400);
        const start = Math.max(0, Number(input.start) || 0);
        const end = Math.max(start + 1, Math.min(start + 60, Number(input.end) || start + 20));
        try {
            return json(await saveSpokenSegment({
                videoId: id,
                title: String(input.title || 'Sermon').slice(0, 180),
                creator: String(input.creator || 'Trusted creator').slice(0, 100),
                category: String(input.category || 'Christian Growth').slice(0, 80),
                start,
                end,
                text,
            }));
        } catch (cause) {
            console.warn('Spoken Scripture Lens failed safely', id, cause);
            return error('Spoken Lens could not process this section right now. Keep watching and it will try again.', 503);
        }
    }],
    'GET /api/watch/speech-intelligence/heartbeat': [async () => json(await compileSpeechIntelligenceHeartbeat())],
    'GET /api/watch/sermon/:id/intelligence': [async ({ params, query }) => {
        const id = String(params.id || '');
        if (!validId(id)) return error('Invalid YouTube video id.', 400);
        const packageValue = await buildPackage(
            id,
            String(query.title || 'Sermon').slice(0, 180),
            String(query.creator || 'Trusted creator').slice(0, 100),
            String(query.category || 'Christian Growth').slice(0, 80),
        );
        return json(packageValue);
    }],
    'POST /api/watch/sermon/:id/ask': [async ({ params, body }) => {
        const id = String(params.id || '');
        if (!validId(id)) return error('Invalid YouTube video id.', 400);
        const input = (body || {}) as { question?: string; title?: string; creator?: string; category?: string };
        const question = clean(String(input.question || '')).slice(0, 320);
        if (question.length < 3) return error('Ask a clear question about this sermon.', 400);
        const value = await transcript(
            id,
            String(input.title || 'Sermon').slice(0, 180),
            String(input.creator || 'Trusted creator').slice(0, 100),
        );
        if (!value.available) {
            return json({
                available: false,
                reason: value.reason || 'A transcript is not available for this sermon.',
                answer: null,
                evidence: [],
                passages: [],
            });
        }
        const evidence = evidenceFor(value, question);
        const packageValue = await buildPackage(
            id,
            value.title,
            value.creator,
            String(input.category || 'Christian Growth').slice(0, 80),
        );
        const passages = relevantPackagePassages(packageValue, evidence, question);
        const context = evidence.map(item => `[${stamp(item.start)}] ${item.text}`).join('\n\n');
        const scriptureContext = passages.map(item => `${item.reference} (KJV): ${item.text}`).join('\n');
        try {
            const result = await ai.generate({
                system: 'You are NFCPS Sermon Companion. Answer from the supplied sermon transcript excerpts and the supplied canonical KJV passages only. Never invent a sermon statement, Bible reference, doctrine, quote, or timestamp. Do not present yourself as a theological authority and do not pronounce a preacher biblically approved or condemned. When Scripture adds context or tension, say that it is worth reading alongside the claim. Do not reproduce long Bible quotations in your prose; reference the passage because the app displays canonical verse text separately. If the evidence is insufficient, say so clearly.',
                prompt: `Sermon: ${value.title}\nSpeaker: ${value.creator}\nQuestion: ${question}\n\nRelevant transcript excerpts:\n${context}\n\nCanonical Scripture context:\n${scriptureContext || 'No Scripture cards were strongly connected to this question.'}\n\nAnswer in 1-4 short paragraphs. Cite useful transcript timestamps in square brackets and Bible references by name.`,
                maxTokens: 850,
                temperature: 0.1,
                thinkingMode: 'FAST',
            });
            const answer = clean(result.text || '');
            if (!answer) return error('Ask This Sermon could not form an answer right now.', 503);
            return json({
                available: true,
                answer,
                evidence: evidence.map(item => ({
                    start: item.start,
                    end: item.end,
                    label: stamp(item.start),
                    text: item.text.slice(0, 520),
                })),
                passages,
                language: value.language,
            });
        } catch (cause) {
            console.warn('Ask This Sermon AI failed', id, cause);
            return error('Ask This Sermon is temporarily busy. Your transcript is safe — try the question again.', 503);
        }
    }],
    'POST /api/watch/live-lens': [async ({ body }) => {
        const input = (body || {}) as { text?: string };
        const text = clean(String(input.text || '')).slice(0, 2000);
        if (text.length < 20) return error('Speak a little longer so Scripture Lens has enough context.', 400);
        return json(await liveLens(text));
    }],
};
