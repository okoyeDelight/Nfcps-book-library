import { ai, db } from '@appdeploy/sdk';

export type WatchDiscoveryVideo = {
  id: string;
  title: string;
  creator: string;
  creatorKey: string;
  published: string;
  category: string;
  source: 'latest';
  channelUrl: string;
};

type DiscoveryConfig = {
  enabled: boolean;
  autoPublish: boolean;
  strictMode: boolean;
  maxPerRun: number;
  maxPublishedPerCreator: number;
  updatedAt: string;
};

type Candidate = WatchDiscoveryVideo & {
  query: string;
  signalCount: number;
};

type ReviewItem = Candidate & {
  classification: 'christian_safe' | 'ambiguous' | 'not_christian' | 'unsafe_or_misleading';
  reviewedAt: string;
  note: string;
};

type CreatorStat = {
  creatorKey: string;
  name: string;
  channelUrl: string;
  accepted: number;
  reviewed: number;
  lastSeenAt: string;
};

type DiscoveryState = {
  queryCursor: number;
  seenIds: string[];
  creatorStats: CreatorStat[];
  lastRunAt: string | null;
  lastAccepted: number;
  lastReviewed: number;
  cooldownUntil?: number | null;
};

type PublishedStore = {
  videos: WatchDiscoveryVideo[];
  updatedAt: string;
};

type ReviewStore = {
  items: ReviewItem[];
  updatedAt: string;
};

const CONFIG_TABLE = 'watch_discovery_config';
const STATE_TABLE = 'watch_discovery_state';
const PUBLISHED_TABLE = 'watch_discovery_published';
const REVIEW_TABLE = 'watch_discovery_review';

const QUERY_SEEDS = [
  'Christian sermon Jesus Bible teaching',
  'Christian worship gospel prayer',
  'Christian testimony devotional',
  'Christian apologetics Bible questions',
  'Christian youth fellowship discipleship',
  'Christian relationships purpose calling',
  'Christian evangelism missions gospel',
  'Christian music worship live session',
];

const defaultConfig = (): DiscoveryConfig => ({
  enabled: true,
  autoPublish: true,
  strictMode: true,
  maxPerRun: 6,
  maxPublishedPerCreator: 4,
  updatedAt: new Date().toISOString(),
});

const defaultState = (): DiscoveryState => ({
  queryCursor: 0,
  seenIds: [],
  creatorStats: [],
  lastRunAt: null,
  lastAccepted: 0,
  lastReviewed: 0,
  cooldownUntil: null,
});

const decodeJsonText = (raw: string) => {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw
      .replace(/\\u0026/g, '&')
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
  }
};

const clean = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

function publishedFromRelative(value: string) {
  const text = value.toLowerCase();
  const match = text.match(/(\d+)\s+(minute|hour|day|week|month|year)s?/);
  if (!match) return new Date().toISOString();
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 'minute'
      ? 60_000
      : unit === 'hour'
        ? 3_600_000
        : unit === 'day'
          ? 86_400_000
          : unit === 'week'
            ? 604_800_000
            : unit === 'month'
              ? 2_592_000_000
              : 31_536_000_000;
  return new Date(Date.now() - amount * multiplier).toISOString();
}

function categoryFor(title: string, query: string) {
  const text = `${title} ${query}`.toLowerCase();
  if (/testimony|my story|conversion/.test(text)) return 'Testimony';
  if (/apologetic|atheis|evidence|defend the faith|is god real/.test(text)) return 'Apologetics';
  if (/devotional|quiet time|daily word|morning devotion/.test(text)) return 'Devotional';
  if (/youth|student|campus|fellowship/.test(text)) return 'Youth & Fellowship';
  if (/prayer|pray|intercession|tarry|altar/.test(text)) return 'Prayer';
  if (/worship|praise|chant|song|music|sound/.test(text)) return 'Worship';
  if (/marriage|relationship|family|courtship/.test(text)) return 'Relationships';
  if (/revival|pentecost|holy spirit|holy ghost|awakening/.test(text)) return 'Revival';
  if (/evangel|mission|gospel outreach/.test(text)) return 'Evangelism';
  if (/purpose|calling|leadership|destiny/.test(text)) return 'Purpose';
  if (/bible|scripture|doctrine|disciple|word|teaching/.test(text)) return 'Bible Teaching';
  return 'Christian Growth';
}

const positiveSignals = [
  /\bjesus\b/i,
  /\bchrist\b/i,
  /\bchristian\b/i,
  /\bbible\b/i,
  /\bscripture\b/i,
  /\bgospel\b/i,
  /\bprayer\b|\bpray\b/i,
  /\bworship\b|\bpraise\b/i,
  /\bchurch\b/i,
  /\bministry\b|\bministries\b/i,
  /\bpastor\b|\bapostle\b|\bbishop\b|\breverend\b/i,
  /holy spirit|holy ghost/i,
  /\bdiscipleship\b|\bdevotional\b|\btestimony\b|\bapologetic/i,
  /\bevangel/i,
];

const blockedSignals = [
  /\bquran\b|\bislam\b|\bmuslim\b/i,
  /\bhindu\b|\bbuddh/i,
  /\btarot\b|\bastrolog|\bzodiac\b|\bhoroscope\b/i,
  /\bwitchcraft\b|\boccult\b|\bnew age\b/i,
  /\bsubliminal\b|\bmanifestation method\b/i,
];

function christianSignal(candidate: Pick<Candidate, 'title' | 'creator'>) {
  const text = `${candidate.title} ${candidate.creator}`;
  return positiveSignals.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function hasBlockedSignal(candidate: Pick<Candidate, 'title' | 'creator'>) {
  const text = `${candidate.title} ${candidate.creator}`;
  return blockedSignals.some(pattern => pattern.test(text));
}

async function readConfig() {
  const { items } = await db.list<DiscoveryConfig>(CONFIG_TABLE, { limit: 1 });
  if (items[0]) return items[0];
  const config = defaultConfig();
  await db.add(CONFIG_TABLE, [{ ...config }]);
  return { ...config, id: '' };
}

async function readState() {
  const { items } = await db.list<DiscoveryState>(STATE_TABLE, { limit: 1 });
  return items[0] || null;
}

async function writeState(state: DiscoveryState) {
  const existing = await readState();
  if (existing) {
    const [ok] = await db.update(STATE_TABLE, [{ id: existing.id, record: { ...state } }]);
    if (!ok) throw new Error('Could not update Watch discovery state');
    return;
  }
  const [id] = await db.add(STATE_TABLE, [{ ...state }]);
  if (!id) throw new Error('Could not create Watch discovery state');
}

async function readPublished() {
  const { items } = await db.list<PublishedStore>(PUBLISHED_TABLE, { limit: 1 });
  return items[0] || null;
}

async function writePublished(store: PublishedStore) {
  const existing = await readPublished();
  if (existing) {
    const [ok] = await db.update(PUBLISHED_TABLE, [{ id: existing.id, record: { ...store } }]);
    if (!ok) throw new Error('Could not update discovered Watch catalogue');
    return;
  }
  const [id] = await db.add(PUBLISHED_TABLE, [{ ...store }]);
  if (!id) throw new Error('Could not create discovered Watch catalogue');
}

async function readReview() {
  const { items } = await db.list<ReviewStore>(REVIEW_TABLE, { limit: 1 });
  return items[0] || null;
}

async function writeReview(store: ReviewStore) {
  const existing = await readReview();
  if (existing) {
    const [ok] = await db.update(REVIEW_TABLE, [{ id: existing.id, record: { ...store } }]);
    if (!ok) throw new Error('Could not update Watch review queue');
    return;
  }
  const [id] = await db.add(REVIEW_TABLE, [{ ...store }]);
  if (!id) throw new Error('Could not create Watch review queue');
}

async function youtubeSearch(query: string) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAI%253D`;
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 NFCPSWatchDiscovery/1.0',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(9_000),
    });
    if (!response.ok) throw new Error(`YouTube search ${response.status}`);
    const text = await response.text();
    const matches = [...text.matchAll(/"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"/g)].slice(0, 28);
    const candidates: Candidate[] = [];

    for (const match of matches) {
      const index = match.index || 0;
      const near = text.slice(index, index + 8_000);
      const titleRaw = near.match(/"title":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/)?.[1];
      const creatorRaw =
        near.match(/"ownerText":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/)?.[1] ||
        near.match(/"shortBylineText":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/)?.[1];
      const channelId = near.match(/"browseId":"(UC[A-Za-z0-9_-]+)"/)?.[1];
      const publishedRaw = near.match(/"publishedTimeText":\{"simpleText":"((?:\\.|[^"])*)"/)?.[1] || '';
      if (!titleRaw || !creatorRaw || !channelId) continue;
      const title = clean(decodeJsonText(titleRaw));
      const creator = clean(decodeJsonText(creatorRaw));
      if (!title || !creator) continue;
      const base: Candidate = {
        id: match[1],
        title,
        creator,
        creatorKey: `discover-${channelId.slice(2).toLowerCase()}`,
        published: publishedFromRelative(clean(decodeJsonText(publishedRaw))),
        category: categoryFor(title, query),
        source: 'latest',
        channelUrl: `https://www.youtube.com/channel/${channelId}`,
        query,
        signalCount: 0,
      };
      base.signalCount = christianSignal(base);
      candidates.push(base);
    }

    return Array.from(new Map(candidates.map(candidate => [candidate.id, candidate])).values());
  } catch (error) {
    console.warn('NFCPS Watch discovery search failed', query, error);
    return [] as Candidate[];
  }
}

async function classifyCandidate(candidate: Candidate) {
  if (hasBlockedSignal(candidate)) {
    return 'unsafe_or_misleading' as const;
  }
  if (candidate.signalCount === 0) {
    return 'ambiguous' as const;
  }

  const result = await ai.classify({
    labels: ['christian_safe', 'ambiguous', 'not_christian', 'unsafe_or_misleading'],
    system:
      'You are the strict catalogue relevance filter for a Christian student fellowship. Classify only from the supplied metadata. christian_safe means the content is clearly and recognizably Christian: Jesus Christ, Bible teaching, prayer, worship, gospel, testimony, devotional life, apologetics, discipleship, evangelism, Christian relationships, youth or fellowship. ambiguous means the metadata is too vague, mixed, sensational, or insufficient to establish Christian relevance. not_christian means another religion or generic secular content. unsafe_or_misleading means occult, New Age, deceptive spiritual techniques, or clearly harmful material. Do not approve content merely because it appeared in a Christian search query. When uncertain, choose ambiguous.',
    content: `Title: ${candidate.title}\nCreator: ${candidate.creator}\nCategory hint: ${candidate.category}`,
    maxRetries: 1,
    maxTokens: 64,
    temperature: 0,
    thinkingMode: 'FAST',
  });

  if (
    result.label === 'christian_safe' ||
    result.label === 'ambiguous' ||
    result.label === 'not_christian' ||
    result.label === 'unsafe_or_misleading'
  ) {
    return result.label;
  }
  return 'ambiguous' as const;
}

function updateCreatorStats(
  current: CreatorStat[],
  candidate: Candidate,
  accepted: boolean,
) {
  const now = new Date().toISOString();
  const found = current.find(item => item.creatorKey === candidate.creatorKey);
  const next: CreatorStat = found
    ? {
        ...found,
        name: candidate.creator,
        channelUrl: candidate.channelUrl,
        accepted: found.accepted + (accepted ? 1 : 0),
        reviewed: found.reviewed + (accepted ? 0 : 1),
        lastSeenAt: now,
      }
    : {
        creatorKey: candidate.creatorKey,
        name: candidate.creator,
        channelUrl: candidate.channelUrl,
        accepted: accepted ? 1 : 0,
        reviewed: accepted ? 0 : 1,
        lastSeenAt: now,
      };
  return [next, ...current.filter(item => item.creatorKey !== candidate.creatorKey)].slice(0, 200);
}

function limitCreatorDensity(videos: WatchDiscoveryVideo[], maxPerCreator: number) {
  const counts = new Map<string, number>();
  const output: WatchDiscoveryVideo[] = [];
  for (const video of videos) {
    const count = counts.get(video.creatorKey) || 0;
    if (count >= maxPerCreator) continue;
    counts.set(video.creatorKey, count + 1);
    output.push(video);
    if (output.length >= 100) break;
  }
  return output;
}

export async function getApprovedDiscoveries() {
  const config = await readConfig();
  if (!config.enabled) return [] as WatchDiscoveryVideo[];
  const published = await readPublished();
  return published?.videos || [];
}

export async function runWatchDiscovery() {
  const config = await readConfig();
  const state = (await readState()) || defaultState();
  const now = Date.now();

  if (!config.enabled) {
    return { skipped: true, reason: 'disabled', accepted: 0, reviewed: 0 };
  }
  if (state.cooldownUntil && state.cooldownUntil > now) {
    return { skipped: true, reason: 'ai_cooldown', accepted: 0, reviewed: 0 };
  }

  const queryIndexes = [state.queryCursor % QUERY_SEEDS.length, (state.queryCursor + 1) % QUERY_SEEDS.length];
  const queryResults = await Promise.all(queryIndexes.map(index => youtubeSearch(QUERY_SEEDS[index])));
  const discovered = Array.from(new Map(queryResults.flat().map(candidate => [candidate.id, candidate])).values());
  const published = (await readPublished()) || { videos: [], updatedAt: new Date(0).toISOString(), id: '' };
  const review = (await readReview()) || { items: [], updatedAt: new Date(0).toISOString(), id: '' };
  const seen = new Set([...state.seenIds, ...published.videos.map(video => video.id)]);
  const fresh = discovered.filter(candidate => !seen.has(candidate.id)).slice(0, config.maxPerRun);

  const accepted: WatchDiscoveryVideo[] = [];
  const reviewed: ReviewItem[] = [];
  const processedIds: string[] = [];
  let creatorStats = state.creatorStats || [];
  let cooldownUntil: number | null = null;

  for (const candidate of fresh) {
    try {
      const classification = await classifyCandidate(candidate);
      processedIds.push(candidate.id);
      const canPublish = classification === 'christian_safe' && candidate.signalCount > 0;
      if (canPublish && config.autoPublish) {
        accepted.push({
          id: candidate.id,
          title: candidate.title,
          creator: candidate.creator,
          creatorKey: candidate.creatorKey,
          published: candidate.published,
          category: candidate.category,
          source: 'latest',
          channelUrl: candidate.channelUrl,
        });
        creatorStats = updateCreatorStats(creatorStats, candidate, true);
      } else {
        reviewed.push({
          ...candidate,
          classification,
          reviewedAt: new Date().toISOString(),
          note:
            classification === 'christian_safe' && !config.autoPublish
              ? 'Clearly Christian, held because auto-publish is disabled.'
              : 'Held out of the live catalogue by the strict discovery gate.',
        });
        creatorStats = updateCreatorStats(creatorStats, candidate, false);
      }
    } catch (error) {
      const rpc = error as { statusCode?: number; responseText?: string };
      if (rpc.statusCode === 429) {
        cooldownUntil = Date.now() + 6 * 60 * 60 * 1000;
        console.warn('NFCPS Watch discovery entered AI cooldown after rate limit');
        break;
      }
      processedIds.push(candidate.id);
      reviewed.push({
        ...candidate,
        classification: 'ambiguous',
        reviewedAt: new Date().toISOString(),
        note: 'Classification was unavailable, so this item was not published.',
      });
      creatorStats = updateCreatorStats(creatorStats, candidate, false);
      console.warn('NFCPS Watch candidate classification failed', candidate.id, error);
    }
  }

  const mergedPublished = Array.from(
    new Map([...accepted, ...published.videos].map(video => [video.id, video])).values(),
  ).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  const safePublished = limitCreatorDensity(mergedPublished, Math.max(1, config.maxPublishedPerCreator));
  const mergedReview = Array.from(
    new Map([...reviewed, ...review.items].map(item => [item.id, item])).values(),
  ).slice(0, 80);

  await Promise.all([
    writePublished({ videos: safePublished, updatedAt: new Date().toISOString() }),
    writeReview({ items: mergedReview, updatedAt: new Date().toISOString() }),
  ]);

  await writeState({
    queryCursor: (state.queryCursor + 2) % QUERY_SEEDS.length,
    seenIds: Array.from(new Set([...processedIds, ...state.seenIds])).slice(0, 500),
    creatorStats,
    lastRunAt: new Date().toISOString(),
    lastAccepted: accepted.length,
    lastReviewed: reviewed.length,
    cooldownUntil,
  });

  return {
    skipped: false,
    accepted: accepted.length,
    reviewed: reviewed.length,
    published: safePublished.length,
  };
}
