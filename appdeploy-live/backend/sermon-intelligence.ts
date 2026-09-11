import { ai, db, error, json } from '@appdeploy/sdk';
import { createFile, MP4BoxBuffer } from 'mp4box';

type Segment = { start: number; dur: number; text: string };
type TranscriptPart = {
    videoId: string;
    title: string;
    creator: string;
    language: string;
    source?: string;
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
    source?: string;
    updatedAt: number;
    segments: Segment[];
    reason?: string;
};
type CaptionTrack = {
    baseUrl: string;
    languageCode?: string;
    kind?: string;
    name?: { simpleText?: string; runs?: { text?: string }[] };
    nfcpsClient?: string;
    nfcpsSource?: string;
};
type SpeechTranscriptPart = {
    videoId: string;
    title: string;
    creator: string;
    category: string;
    source?: string;
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
type AudioTranscriptRaw = { segments?: unknown };
type PodcastEpisode = { title: string; audioUrl: string; durationSeconds: number; totalBytes: number };

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
    if (first.unavailable && /caption/i.test(first.reason || '')) return null;
    if (first.unavailable) {
        return {
            available: false,
            videoId,
            title: first.title,
            creator: first.creator,
            language: first.language,
            source: first.source,
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
        source: first.source,
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
            source: transcriptValue.source,
            updatedAt: transcriptValue.updatedAt,
            part: 0,
            totalParts: 1,
            segments: [],
            unavailable: true,
            reason: transcriptValue.reason || 'Spoken transcript is not ready yet.',
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
            source: transcriptValue.source,
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

function captionTracksFromPlayer(value: unknown, client: string) {
    const data = value as { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } } };
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    return tracks
        .filter(track => Boolean(track?.baseUrl))
        .map(track => ({ ...track, nfcpsClient: client, nfcpsSource: 'innertube' }));
}

const INNER_TUBE_FALLBACK_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

async function innerTubeTracks(videoId: string, html: string) {
    let apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || '';
    if (!apiKey) {
        try {
            const home = await page('https://www.youtube.com/?hl=en');
            apiKey = home.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || '';
        } catch {
            // A missing public player key simply disables this optional transcript path.
        }
    }
    if (!apiKey) apiKey = INNER_TUBE_FALLBACK_KEY;
    const clients = [
        {
            name: 'ANDROID_VR',
            version: '1.61.48',
            clientId: '28',
            userAgent: 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
            extras: { androidSdkVersion: 32, deviceMake: 'Oculus', deviceModel: 'Quest 3', osName: 'Android', osVersion: '12L' },
        },
        {
            name: 'IOS',
            version: '20.10.4',
            clientId: '5',
            userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X)',
            extras: { deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '18.3.2.22D82' },
        },
        {
            name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
            version: '2.0',
            clientId: '85',
            userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
            extras: {},
        },
        {
            name: 'MWEB',
            version: '2.20250606.01.00',
            clientId: '2',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
            extras: {},
        },
    ];
    const responses = await Promise.allSettled(clients.map(async client => {
        const response = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'user-agent': client.userAgent,
                'accept-language': 'en-US,en;q=0.9',
                'x-youtube-client-name': client.clientId,
                'x-youtube-client-version': client.version,
                'origin': 'https://www.youtube.com',
                'cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+000',
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: client.name,
                        clientVersion: client.version,
                        hl: 'en',
                        gl: 'US',
                        ...client.extras,
                    },
                },
                videoId,
                contentCheckOk: true,
                racyCheckOk: true,
            }),
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return [] as CaptionTrack[];
        return captionTracksFromPlayer(await response.json(), client.name);
    }));
    return responses.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}

async function tracksFor(videoId: string) {
    const collected: CaptionTrack[] = [];
    let watchHtml = '';
    try {
        watchHtml = await page(`https://www.youtube.com/watch?v=${videoId}&hl=en`);
        const raw = extractArray(watchHtml, '"captionTracks":');
        if (raw) {
            const tracks = JSON.parse(raw) as CaptionTrack[];
            if (Array.isArray(tracks)) collected.push(...tracks.map(track => ({ ...track, nfcpsClient: 'WEB', nfcpsSource: 'watch-page' })));
        }
    } catch {
        // InnerTube and embed fallbacks remain available.
    }
    if (watchHtml) {
        try {
            collected.push(...await innerTubeTracks(videoId, watchHtml));
        } catch {
            // Keep the ordinary YouTube surfaces as fallbacks.
        }
    }
    try {
        const html = await page(`https://www.youtube-nocookie.com/embed/${videoId}`);
        const raw = extractArray(html, '"captionTracks":');
        if (raw) {
            const tracks = JSON.parse(raw) as CaptionTrack[];
            if (Array.isArray(tracks)) collected.push(...tracks.map(track => ({ ...track, nfcpsClient: 'EMBED', nfcpsSource: 'embed' })));
        }
        if (!watchHtml) collected.push(...await innerTubeTracks(videoId, html));
    } catch {
        // No reusable YouTube track from this surface.
    }
    const seen = new Set<string>();
    return collected.filter(track => {
        const key = `${track.nfcpsClient || ''}:${track.baseUrl}`;
        if (!track.baseUrl || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
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
        const key = Math.round(item.start * 2);
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
            source: ordered.some(item => item.source === 'trusted-podcast-audio') ? 'trusted-podcast-audio' : 'nfcps-spoken',
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
    source?: string;
    start: number;
    end: number;
    text: string;
}) {
    const existingItems = await listSpeechParts(input.videoId);
    const near = existingItems.find(item => Math.abs(item.start - input.start) < 2.5);
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
        source: input.source || 'nfcps-spoken',
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

function orderedCaptionTracks(tracks: CaptionTrack[]) {
    const score = (track: CaptionTrack) => {
        const language = String(track.languageCode || '').toLowerCase();
        let value = language.startsWith('en') ? 100 : 0;
        if (track.kind !== 'asr') value += 20;
        if (track.nfcpsSource === 'innertube') value += 15;
        if (track.nfcpsClient === 'IOS') value += 9;
        if (track.nfcpsClient === 'ANDROID') value += 7;
        if (track.nfcpsClient === 'MWEB') value += 4;
        return value;
    };
    return [...tracks].sort((a, b) => score(b) - score(a));
}

const TRUSTED_AUDIO_FEEDS = [
    { creator: 'lawrence oyor', rss: 'https://anchor.fm/s/f34d4f10/podcast/rss' },
];

function normalizeEpisodeTitle(value: string) {
    return clean(value)
        .toLowerCase()
        .replace(/\|.*$/g, '')
        .replace(/\bpastor\b|\bapostle\b|\blawrence\s+oyor\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function durationSeconds(value: string) {
    const parts = value.trim().split(':').map(part => Number(part));
    if (!parts.length || parts.some(part => !Number.isFinite(part))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
}

function tagValue(xml: string, tag: string) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return xmlDecode(String(match?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '')).trim();
}

function attrValue(tag: string, name: string) {
    const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
    return xmlDecode(String(match?.[1] || '')).trim();
}

async function trustedPodcastEpisode(title: string, creator: string) {
    const source = TRUSTED_AUDIO_FEEDS.find(item => creator.toLowerCase().includes(item.creator));
    if (!source) return null;
    const response = await fetch(source.rss, {
        headers: { 'user-agent': 'NFCPS-One-Sermon-Intelligence/4.0', 'accept': 'application/rss+xml,application/xml,text/xml' },
        signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Trusted sermon feed ${response.status}`);
    const xml = await response.text();
    const target = normalizeEpisodeTitle(title);
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
    let best: { score: number; episode: PodcastEpisode } | null = null;
    for (const item of items) {
        const episodeTitle = tagValue(item, 'title');
        const normalized = normalizeEpisodeTitle(episodeTitle);
        if (!normalized) continue;
        let score = normalized === target ? 100 : 0;
        if (!score && target && (normalized.includes(target) || target.includes(normalized))) score = 80;
        if (!score) {
            const targetTerms = new Set(target.split(' ').filter(Boolean));
            const terms = normalized.split(' ').filter(Boolean);
            score = terms.filter(term => targetTerms.has(term)).length * 8;
        }
        const enclosure = item.match(/<enclosure\b[^>]*>/i)?.[0] || '';
        const audioUrl = attrValue(enclosure, 'url');
        if (!audioUrl || score < 24) continue;
        const totalBytes = Math.max(0, Number(attrValue(enclosure, 'length')) || 0);
        const episodeDuration = durationSeconds(tagValue(item, 'itunes:duration'));
        const episode = { title: episodeTitle, audioUrl, durationSeconds: episodeDuration, totalBytes };
        if (!best || score > best.score) best = { score, episode };
    }
    return best?.episode || null;
}

function splitTranscriptSegments(value: unknown, clipDuration: number) {
    const raw = (value as AudioTranscriptRaw)?.segments;
    const items = Array.isArray(raw) ? raw : [];
    const cleaned = items.map(item => {
        const part = item as { start?: unknown; end?: unknown; text?: unknown };
        const text = asString(part.text, 1500);
        const start = Math.max(0, Math.min(clipDuration, asNumber(part.start, 0)));
        const end = Math.max(start + 1, Math.min(clipDuration, asNumber(part.end, start + Math.max(6, clipDuration / Math.max(3, items.length)))));
        return { start, end, text };
    }).filter(item => item.text.length >= 8);
    if (cleaned.length >= 3) {
        const selected = cleaned.slice(0, 12);
        const firstStart = Math.min(...selected.map(item => item.start));
        const lastEnd = Math.max(...selected.map(item => item.end));
        const observedSpan = Math.max(0, lastEnd - firstStart);
        if (clipDuration >= 20 && observedSpan < clipDuration * 0.45) {
            const slot = clipDuration / selected.length;
            return selected.map((item, index) => ({
                start: slot * index,
                end: Math.min(clipDuration, slot * (index + 1)),
                text: item.text,
            }));
        }
        return selected;
    }
    const combined = cleaned.map(item => item.text).join(' ').trim();
    if (!combined) return [] as Array<{ start: number; end: number; text: string }>;
    const sentences = combined.split(/(?<=[.!?])\s+/).filter(Boolean);
    const pieces = sentences.length >= 3 ? sentences : combined.match(/.{1,220}(?:\s|$)/g) || [combined];
    const count = Math.max(1, Math.min(8, pieces.length));
    return pieces.slice(0, count).map((text, index) => ({
        start: (clipDuration * index) / count,
        end: (clipDuration * (index + 1)) / count,
        text: clean(text),
    })).filter(item => item.text.length >= 8);
}

function mpegFrameOffset(bytes: Buffer) {
    const limit = Math.min(bytes.length - 4, 32_768);
    for (let index = 0; index < limit; index += 1) {
        const first = bytes[index];
        const second = bytes[index + 1];
        const third = bytes[index + 2];
        const versionBits = (second >> 3) & 0x03;
        const layerBits = (second >> 1) & 0x03;
        const bitrateIndex = (third >> 4) & 0x0f;
        const sampleRateIndex = (third >> 2) & 0x03;
        if (first === 0xff && (second & 0xe0) === 0xe0 && versionBits !== 1 && layerBits !== 0 && bitrateIndex > 0 && bitrateIndex < 15 && sampleRateIndex !== 3) return index;
    }
    return -1;
}

function mp4BoxOffset(bytes: Buffer, type: string) {
    const marker = Buffer.from(type, 'ascii');
    const markerOffset = bytes.indexOf(marker);
    return markerOffset >= 4 ? markerOffset - 4 : -1;
}

function toMp4Buffer(bytes: Buffer, fileStart: number) {
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return MP4BoxBuffer.fromArrayBuffer(copy, fileStart);
}

async function fetchAudioRange(url: string, start: number, end: number) {
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'NFCPS-One-Sermon-Intelligence/4.0', 'accept': 'audio/mp4,audio/*;q=0.9', 'range': `bytes=${start}-${end}` }, signal: AbortSignal.timeout(15_000) });
    if (!(response.ok || response.status === 206)) throw new Error(`Trusted sermon MP4 ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
}

async function segmentMp4AudioWindow(episode: PodcastEpisode, requestedAt: number) {
    const mp4 = createFile(true);
    let audioTrack: { id: number; audio?: { sample_rate?: number } } | null = null;
    let parseError = '';
    mp4.onError = (module, message) => { parseError = `${module}:${message}`; };
    mp4.onReady = info => { audioTrack = info.audioTracks?.[0] || info.tracks.find(track => Boolean(track.audio)) || null; };
    const metadataEnd = Math.min(episode.totalBytes - 1, 1_249_999);
    const metadata = await fetchAudioRange(episode.audioUrl, 0, metadataEnd);
    let nextOffset = mp4.appendBuffer(toMp4Buffer(metadata, 0));
    if (!audioTrack && Number.isFinite(nextOffset) && nextOffset > metadata.length && nextOffset < episode.totalBytes) {
        const secondStart = Math.max(0, Math.floor(nextOffset));
        const secondEnd = Math.min(episode.totalBytes - 1, secondStart + 1_249_999);
        nextOffset = mp4.appendBuffer(toMp4Buffer(await fetchAudioRange(episode.audioUrl, secondStart, secondEnd), secondStart));
    }
    if (!audioTrack) return { available: false as const, reason: parseError ? 'The trusted MP4 metadata could not be parsed.' : 'The trusted MP4 audio track was not found.' };
    const track = audioTrack;
    const mediaSegments: Buffer[] = [];
    mp4.onSegment = (id, _user, buffer) => { if (id === track.id && buffer.byteLength) mediaSegments.push(Buffer.from(buffer)); };
    mp4.setSegmentOptions(track.id, null, { nbSamples: 1200, nbSamplesPerFragment: 1200, rapAlignement: false });
    const initSegments = mp4.initializeSegmentation('per-track');
    const init = initSegments.find(item => item.id === track.id)?.buffer;
    if (!init) return { available: false as const, reason: 'NFCPS could not initialize the trusted MP4 audio track.' };
    const seek = mp4.seek(Math.max(0, requestedAt - 8), false);
    if (!Number.isFinite(seek.offset) || seek.offset < 0 || seek.offset >= episode.totalBytes) return { available: false as const, reason: 'NFCPS could not seek to this sermon section in the trusted MP4.' };
    mp4.start();
    const mediaStart = Math.floor(seek.offset);
    const mediaEnd = Math.min(episode.totalBytes - 1, mediaStart + 1_399_999);
    mp4.appendBuffer(toMp4Buffer(await fetchAudioRange(episode.audioUrl, mediaStart, mediaEnd), mediaStart));
    mp4.flush();
    if (!mediaSegments.length) return { available: false as const, reason: 'NFCPS could not segment this trusted MP4 sermon section.' };
    const parts: Buffer[] = [Buffer.from(init)];
    let total = parts[0].length;
    let usedSegments = 0;
    for (const segment of mediaSegments) {
        if (total + segment.length > 1_850_000) break;
        parts.push(segment);
        total += segment.length;
        usedSegments += 1;
    }
    if (!usedSegments) return { available: false as const, reason: 'The trusted MP4 sermon segment exceeded the safe transcription size.' };
    const sampleRate = Math.max(8_000, Number(track.audio?.sample_rate || 44_100));
    const duration = Math.max(20, Math.min(90, usedSegments * 1200 * 1024 / sampleRate));
    return { available: true as const, bytes: Buffer.concat(parts), start: Math.max(0, Number(seek.time) || requestedAt - 8), duration };
}

async function prepareTrustedPodcastSegment(input: {
    videoId: string;
    title: string;
    creator: string;
    category: string;
    at: number;
}) {
    const episode = await trustedPodcastEpisode(input.title, input.creator);
    if (!episode) return { available: false, source: 'none', reason: 'No trusted reusable source audio is registered for this sermon yet.' };
    const requestedAt = Math.max(0, Math.min(Math.max(0, episode.durationSeconds - 30), input.at || 0));
    const existing = await listSpeechParts(input.videoId);
    const trusted = existing.filter(item => item.source === 'trusted-podcast-audio');
    const pointCovered = trusted.some(item => requestedAt >= Math.max(0, item.start - 6) && requestedAt <= item.end + 6);
    if (pointCovered) {
        const progress = await readSpeechTranscript(input.videoId, input.title, input.creator);
        if (progress?.transcript.available) {
            return { available: true, cached: true, source: 'trusted-podcast-audio', episodeTitle: episode.title, preparedAt: requestedAt, progress: { segments: progress.segments, coverageSeconds: progress.coverageSeconds, ready: true } };
        }
    }
    if (!episode.totalBytes || !episode.durationSeconds) {
        return { available: false, source: 'trusted-podcast-audio', reason: 'The trusted sermon source did not expose enough timing metadata to prepare safely.' };
    }
    const clipStart = Math.max(0, requestedAt - 8);
    const startByte = clipStart < 4 ? 0 : Math.max(0, Math.floor((clipStart / episode.durationSeconds) * episode.totalBytes) - 8_192);
    const maxBytes = 1_250_000;
    const endByte = Math.min(episode.totalBytes - 1, startByte + maxBytes - 1);
    const audioResponse = await fetch(episode.audioUrl, {
        redirect: 'follow',
        headers: {
            'user-agent': 'NFCPS-One-Sermon-Intelligence/4.0',
            'accept': 'audio/mpeg,audio/*;q=0.9',
            'range': `bytes=${startByte}-${endByte}`,
        },
        signal: AbortSignal.timeout(15_000),
    });
    if (!(audioResponse.ok || audioResponse.status === 206)) throw new Error(`Trusted sermon audio ${audioResponse.status}`);
    if (audioResponse.status !== 206 && episode.totalBytes > maxBytes) {
        return { available: false, source: 'trusted-podcast-audio', reason: 'This trusted audio host did not allow bounded range processing.' };
    }
    const audioBytes = Buffer.from(await audioResponse.arrayBuffer());
    if (!audioBytes.length || audioBytes.length > 1_900_000) throw new Error('Trusted sermon audio slice was outside the safe processing size.');
    const mediaType = String(audioResponse.headers.get('content-type') || '').toLowerCase();
    const contentRange = String(audioResponse.headers.get('content-range') || '');
    const isMp4 = /audio\/(?:mp4|x-m4a)|video\/mp4/.test(mediaType);
    const frameOffset = startByte > 0 && !isMp4 ? mpegFrameOffset(audioBytes) : 0;
    if (frameOffset < 0) return { available: false, source: 'trusted-podcast-audio', reason: 'This later audio section could not be aligned to a valid MPEG frame.', diagnostic: { mediaType: mediaType.slice(0, 80), contentRange: contentRange.slice(0, 120), prefixHex: audioBytes.subarray(0, 16).toString('hex') } };
    let usableAudioBytes = frameOffset > 0 ? audioBytes.subarray(frameOffset) : audioBytes;
    let adjustedClipStart = clipStart + (episode.durationSeconds * (frameOffset / episode.totalBytes));
    let clipDuration = Math.max(25, Math.min(95, episode.durationSeconds * (usableAudioBytes.length / episode.totalBytes)));
    if (isMp4 && startByte > 0) {
        const segmented = await segmentMp4AudioWindow(episode, requestedAt);
        if (!segmented.available) return { available: false, source: 'trusted-podcast-audio', reason: segmented.reason };
        usableAudioBytes = segmented.bytes;
        adjustedClipStart = segmented.start;
        clipDuration = segmented.duration;
    }
    const audioMimeType = isMp4 ? 'audio/mp4' : 'audio/mpeg';
    const result = await ai.extract({
        system: 'You are NFCPS sermon transcription. Transcribe only the spoken sermon words in the supplied audio. Do not summarize, interpret, add Scripture, or invent words. Ignore music and noise. Timestamps are relative to the beginning of this audio slice.',
        prompt: 'Return 3 to 10 consecutive transcript segments with relative start/end seconds and verbatim spoken text. If speech is unclear, omit that portion instead of guessing.',
        audios: [{ data: usableAudioBytes.toString('base64'), mimeType: audioMimeType }],
        schema: {
            type: 'object',
            properties: {
                segments: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            start: { type: 'number' },
                            end: { type: 'number' },
                            text: { type: 'string' },
                        },
                        required: ['start', 'end', 'text'],
                    },
                },
            },
            required: ['segments'],
        },
        maxRetries: 1,
        maxTokens: 2600,
        temperature: 0,
        thinkingMode: 'NONE',
    });
    const relative = splitTranscriptSegments(result.data, clipDuration);
    if (!relative.length) return { available: false, source: 'trusted-podcast-audio', reason: 'The trusted audio slice contained no clear spoken sermon text.' };
    const saved = [] as Array<{ start: number; end: number; text: string }>;
    for (const segment of relative) {
        const absoluteStart = Math.max(0, adjustedClipStart + segment.start);
        const absoluteEnd = Math.max(absoluteStart + 1, adjustedClipStart + segment.end);
        await saveSpokenSegment({
            videoId: input.videoId,
            title: input.title,
            creator: input.creator,
            category: input.category,
            source: 'trusted-podcast-audio',
            start: absoluteStart,
            end: absoluteEnd,
            text: segment.text,
        });
        saved.push({ start: absoluteStart, end: absoluteEnd, text: segment.text });
    }
    const progress = await readSpeechTranscript(input.videoId, input.title, input.creator);
    return {
        available: saved.length > 0,
        cached: false,
        source: 'trusted-podcast-audio',
        episodeTitle: episode.title,
        preparedAt: requestedAt,
        preparedSeconds: Math.round(clipDuration),
        segmentsAdded: saved.length,
        progress: { segments: progress?.segments || saved.length, coverageSeconds: progress?.coverageSeconds || clipDuration, ready: Boolean(progress?.transcript.available) },
    };
}

async function fetchTranscript(videoId: string, title: string, creator: string): Promise<Transcript> {
    const tracks = orderedCaptionTracks(await tracksFor(videoId));
    if (!tracks.length) {
        return {
            available: false,
            videoId,
            title,
            creator,
            language: '',
            source: 'none',
            updatedAt: Date.now(),
            segments: [],
            reason: 'No reusable YouTube transcript is available for this message yet.',
        };
    }
    for (const track of tracks.slice(0, 8)) {
        const segments = await captionSegments(track);
        if (!segments.length) continue;
        return {
            available: true,
            videoId,
            title,
            creator,
            language: String(track.languageCode || 'en'),
            source: track.kind === 'asr' ? 'youtube-auto-cc' : 'youtube-caption',
            updatedAt: Date.now(),
            segments,
        };
    }
    return {
        available: false,
        videoId,
        title,
        creator,
        language: String(tracks[0]?.languageCode || ''),
        source: 'youtube-track-blocked',
        updatedAt: Date.now(),
        segments: [],
        reason: 'YouTube exposed a caption track, but its timed text was not reusable from this playback surface.',
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
            source: 'none',
            updatedAt: Date.now(),
            segments: [],
            reason: 'No reusable transcript is available for this message yet.',
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
    if (!value.available && /caption/i.test(value.reason || '')) return null;
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
            source: value.source || (value.language === 'spoken-word' ? 'nfcps-spoken' : value.available ? 'cached-transcript' : 'none'),
            segments: value.segments.length,
            durationSeconds: last ? Math.ceil(last.start + last.dur) : 0,
            reason: value.reason || null,
            updatedAt: value.updatedAt,
        });
    }],
    'GET /api/watch/transcript-selftest': [async () => {
        const probes = [
            { videoId: 'dQw4w9WgXcQ', title: 'Known caption control', creator: 'YouTube control', control: true },
            { videoId: 'b2xNY69gxGo', title: 'Divine Prosperity (Part 1) | Pastor Lawrence Oyor', creator: 'Lawrence Oyor', control: false },
            { videoId: 'h6G5v37B_gg', title: 'Strength (Part 5) | Pastor Lawrence Oyor', creator: 'Lawrence Oyor', control: false },
            { videoId: '-iPmCD89G6s', title: 'Strength (Part 4) | Pastor Lawrence Oyor', creator: 'Lawrence Oyor', control: false },
            { videoId: 'Gpy4i8j0xgI', title: 'Strength (Part 3) | Pastor Lawrence Oyor', creator: 'Lawrence Oyor', control: false },
        ];
        const results: Array<Record<string, unknown>> = [];
        for (const probe of probes) {
            try {
                const value = await fetchTranscript(probe.videoId, probe.title, probe.creator);
                const last = value.segments[value.segments.length - 1];
                results.push({
                    videoId: probe.videoId,
                    title: probe.title,
                    available: value.available,
                    source: value.source || 'unknown',
                    language: value.language,
                    segments: value.segments.length,
                    durationSeconds: last ? Math.ceil(last.start + last.dur) : 0,
                    reason: value.reason || null,
                    control: probe.control,
                });
            } catch (cause) {
                results.push({ videoId: probe.videoId, title: probe.title, available: false, source: 'error', reason: cause instanceof Error ? cause.message : 'probe_failed', control: probe.control });
            }
        }
        const controlOk = results.some(item => item.control === true && item.available === true);
        const watchOk = results.some(item => item.control === false && item.available === true);
        return json({ ok: watchOk, controlOk, watchOk, checkedAt: new Date().toISOString(), results });
    }],
    'POST /api/watch/sermon/:id/prepare-source': [async ({ params, body }) => {
        const id = String(params.id || '');
        if (!validId(id)) return error('Invalid YouTube video id.', 400);
        const input = (body || {}) as { title?: string; creator?: string; category?: string; at?: number };
        try {
            return json(await prepareTrustedPodcastSegment({
                videoId: id,
                title: String(input.title || 'Sermon').slice(0, 180),
                creator: String(input.creator || 'Trusted creator').slice(0, 100),
                category: String(input.category || 'Christian Growth').slice(0, 80),
                at: Math.max(0, Number(input.at) || 0),
            }));
        } catch (cause) {
            console.warn('Trusted sermon source preparation failed safely', id, cause);
            const failure = cause as { statusCode?: number; message?: string };
            const statusCode = Number(failure?.statusCode || 0);
            const message = String(failure?.message || '');
            const failureType = statusCode === 429
                ? 'rate_limited'
                : /timeout|timed out|abort/i.test(message)
                    ? 'source_timeout'
                    : /audio|media|decode|mime|format|mpeg/i.test(message)
                        ? 'audio_slice_invalid'
                        : statusCode >= 500
                            ? 'upstream_unavailable'
                            : 'prepare_failed';
            return json({
                available: false,
                source: 'trusted-podcast-audio',
                retryable: true,
                failure: failureType,
                reason: failureType === 'rate_limited'
                    ? 'Trusted sermon transcription is temporarily rate limited.'
                    : failureType === 'audio_slice_invalid'
                        ? 'This later audio slice needs a safer decode boundary.'
                        : failureType === 'source_timeout'
                            ? 'The trusted sermon source timed out while preparing this section.'
                            : 'NFCPS could not prepare this trusted sermon section right now.',
            });
        }
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
