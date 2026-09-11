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
  trustedFastPathScore: number;
  trustedFastPathMinAccepted: number;
  bootstrapAfterHours: number;
  autoFreezeHours: number;
  updatedAt: string;
};

type Candidate = WatchDiscoveryVideo & {
  query: string;
  signalCount: number;
  evidence?: string;
};

type ReviewItem = Candidate & {
  classification: 'christian_safe' | 'ambiguous' | 'not_christian' | 'unsafe_or_misleading';
  reviewedAt: string;
  note: string;
};

type QueryStat = {
  query: string;
  attempts: number;
  accepted: number;
  ambiguous: number;
  rejected: number;
  unsafe: number;
  lastUsedAt: string | null;
};

type CreatorStat = {
  creatorKey: string;
  name: string;
  channelUrl: string;
  accepted: number;
  reviewed?: number;
  ambiguous?: number;
  rejected?: number;
  unsafe?: number;
  trust?: number;
  quarantinedUntil?: number | null;
  lastSeenAt: string;
};

type DiscoveryState = {
  queryCursor: number;
  seenIds: string[];
  creatorStats: CreatorStat[];
  queryStats?: QueryStat[];
  lastRunAt: string | null;
  lastAccepted: number;
  lastReviewed: number;
  lastCandidateCount?: number;
  lastSource?: 'cron' | 'feed_bootstrap' | 'external_tick' | null;
  totalRuns?: number;
  totalAccepted?: number;
  totalAmbiguous?: number;
  totalRejected?: number;
  totalUnsafe?: number;
  consecutiveFailures?: number;
  cooldownUntil?: number | null;
  frozenUntil?: number | null;
  lastError?: string | null;
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
  'Christian devotional Bible study',
  'Christian campus fellowship message',
  'Christian testimony Jesus transformation',
  'Christian doctrine discipleship teaching',
];

const defaultConfig = (): DiscoveryConfig => ({
  enabled: true,
  autoPublish: true,
  strictMode: true,
  maxPerRun: 12,
  maxPublishedPerCreator: 4,
  trustedFastPathScore: 0.84,
  trustedFastPathMinAccepted: 4,
  bootstrapAfterHours: 3,
  autoFreezeHours: 6,
  updatedAt: new Date().toISOString(),
});

const defaultQueryStats = (): QueryStat[] =>
  QUERY_SEEDS.map(query => ({ query, attempts: 0, accepted: 0, ambiguous: 0, rejected: 0, unsafe: 0, lastUsedAt: null }));

const defaultState = (): DiscoveryState => ({
  queryCursor: 0,
  seenIds: [],
  creatorStats: [],
  queryStats: defaultQueryStats(),
  lastRunAt: null,
  lastAccepted: 0,
  lastReviewed: 0,
  lastCandidateCount: 0,
  lastSource: null,
  totalRuns: 0,
  totalAccepted: 0,
  totalAmbiguous: 0,
  totalRejected: 0,
  totalUnsafe: 0,
  consecutiveFailures: 0,
  cooldownUntil: null,
  frozenUntil: null,
  lastError: null,
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

const cautionSignals = [
  /angel number|spirit guide|manifest(?:ing|ation) money/i,
  /guaranteed miracle|instant wealth|lottery prophecy/i,
  /pay(?:ing)? .*seed|send .*money .*prophecy/i,
];

type CreatorOutcome = 'accepted' | 'ambiguous' | 'rejected' | 'unsafe';

function christianSignal(candidate: Pick<Candidate, 'title' | 'creator'>) {
  const text = `${candidate.title} ${candidate.creator}`;
  return positiveSignals.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function textSignalCount(text: string) {
  return positiveSignals.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function hasBlockedText(text: string) {
  return blockedSignals.some(pattern => pattern.test(text));
}

function hasBlockedSignal(candidate: Pick<Candidate, 'title' | 'creator'>) {
  return hasBlockedText(`${candidate.title} ${candidate.creator}`);
}

function hasCautionSignal(candidate: Pick<Candidate, 'title' | 'creator'>) {
  const text = `${candidate.title} ${candidate.creator}`;
  return cautionSignals.some(pattern => pattern.test(text));
}

function creatorTrust(stat?: CreatorStat) {
  if (!stat) return 0.75;
  const accepted = Number(stat.accepted) || 0;
  const ambiguous = Number(stat.ambiguous) || 0;
  const rejected = Number(stat.rejected) || 0;
  const unsafe = Number(stat.unsafe) || 0;
  const score = (accepted + 3) / (accepted + 4 + ambiguous * 0.75 + rejected * 2 + unsafe * 5);
  return Math.max(0, Math.min(1, score));
}

function shouldAuditCandidate(id: string) {
  let total = 0;
  for (const char of id) total += char.charCodeAt(0);
  return total % 4 === 0;
} 

async function readConfig() {
  const { items } = await db.list<DiscoveryConfig>(CONFIG_TABLE, { limit: 1 });
  if (items[0]) return { ...defaultConfig(), ...items[0] };
  const config = defaultConfig();
  await db.add(CONFIG_TABLE, [{ ...config }]);
  return { ...config, id: '' };
}

async function readState() {
  const { items } = await db.list<DiscoveryState>(STATE_TABLE, { limit: 1 });
  if (!items[0]) return null;
  const base = defaultState();
  return {
    ...base,
    ...items[0],
    creatorStats: items[0].creatorStats || [],
    queryStats: items[0].queryStats?.length ? items[0].queryStats : base.queryStats,
  };
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

async function watchEvidence(id: string) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 NFCPSWatchAgent/2.0', 'accept-language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return '';
    const text = await response.text();
    const meta =
      text.match(/<meta[^>]+(?:name|property)="(?:description|og:description)"[^>]+content="([^"]+)"/i)?.[1] ||
      text.match(/<meta[^>]+content="([^"]+)"[^>]+(?:name|property)="(?:description|og:description)"/i)?.[1];
    const jsonDescription = text.match(/"shortDescription":"((?:\\.|[^"])*)"/)?.[1];
    return clean(meta || (jsonDescription ? decodeJsonText(jsonDescription) : '')).slice(0, 1400);
  } catch {
    return '';
  }
}

async function classifyCandidate(candidate: Candidate) {
  if (hasBlockedSignal(candidate)) return 'unsafe_or_misleading' as const;
  const evidence = await watchEvidence(candidate.id);
  candidate.evidence = evidence;
  if (evidence && hasBlockedText(evidence)) return 'unsafe_or_misleading' as const;
  const combinedSignals = candidate.signalCount + textSignalCount(evidence);
  if (combinedSignals === 0) return 'ambiguous' as const;

  const result = await ai.classify({
    labels: ['christian_safe', 'ambiguous', 'not_christian', 'unsafe_or_misleading'],
    system:
      'You are the conservative catalogue filter for NFCPS, a Christian student fellowship. Approve christian_safe only when the supplied title, creator and description clearly identify recognizably Christian content centered on Jesus Christ, Scripture, prayer, worship, gospel, testimony, devotional life, apologetics, discipleship, evangelism, Christian relationships, youth or fellowship. Be denomination-neutral and do not reject ordinary Christian doctrinal differences. Choose ambiguous when metadata is vague, sensational, mixed or insufficient. Choose not_christian for secular or other-religion material. Choose unsafe_or_misleading for occult or New Age spirituality, deceptive spiritual techniques, obvious spiritual scams, or content that clearly misrepresents itself as Christian. Never approve something merely because it came from a Christian search query. When uncertain, choose ambiguous.',
    content: `Title: ${candidate.title}\nCreator: ${candidate.creator}\nCategory hint: ${candidate.category}\nSearch context: ${candidate.query}\nDescription evidence: ${evidence || 'Unavailable'}${hasCautionSignal(candidate) ? '\nCaution: title metadata contains a sensational or scam-like signal; scrutinize carefully.' : ''}`,
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
  ) return result.label;
  return 'ambiguous' as const;
}

function updateCreatorStats(current: CreatorStat[], candidate: Candidate, outcome: CreatorOutcome) {
  const now = new Date().toISOString();
  const found = current.find(item => item.creatorKey === candidate.creatorKey);
  const base: CreatorStat = found || {
    creatorKey: candidate.creatorKey,
    name: candidate.creator,
    channelUrl: candidate.channelUrl,
    accepted: 0,
    reviewed: 0,
    ambiguous: 0,
    rejected: 0,
    unsafe: 0,
    trust: 0.75,
    quarantinedUntil: null,
    lastSeenAt: now,
  };
  const next: CreatorStat = {
    ...base,
    name: candidate.creator,
    channelUrl: candidate.channelUrl,
    accepted: (base.accepted || 0) + (outcome === 'accepted' ? 1 : 0),
    reviewed: (base.reviewed || 0) + (outcome === 'accepted' ? 0 : 1),
    ambiguous: (base.ambiguous || 0) + (outcome === 'ambiguous' ? 1 : 0),
    rejected: (base.rejected || 0) + (outcome === 'rejected' ? 1 : 0),
    unsafe: (base.unsafe || 0) + (outcome === 'unsafe' ? 1 : 0),
    quarantinedUntil: outcome === 'unsafe' ? Date.now() + 72 * 60 * 60 * 1000 : base.quarantinedUntil || null,
    lastSeenAt: now,
  };
  next.trust = creatorTrust(next);
  return [next, ...current.filter(item => item.creatorKey !== candidate.creatorKey)].slice(0, 200);
}

function queryWeight(stat: QueryStat) {
  const attempts = Math.max(0, stat.attempts || 0);
  const acceptedYield = ((stat.accepted || 0) + 1) / (attempts + 2);
  const unsafePenalty = (stat.unsafe || 0) / Math.max(1, attempts) * 1.5;
  const rejectPenalty = (stat.rejected || 0) / Math.max(1, attempts) * 0.4;
  return acceptedYield - unsafePenalty - rejectPenalty;
}

function ensureQueryStats(current?: QueryStat[]) {
  const byQuery = new Map((current || []).map(stat => [stat.query, stat]));
  return QUERY_SEEDS.map(query => byQuery.get(query) || { query, attempts: 0, accepted: 0, ambiguous: 0, rejected: 0, unsafe: 0, lastUsedAt: null });
}

function selectQueryIndexes(state: DiscoveryState) {
  const explore = state.queryCursor % QUERY_SEEDS.length;
  const stats = ensureQueryStats(state.queryStats);
  const ranked = stats
    .map((stat, index) => ({ index, score: queryWeight(stat) }))
    .filter(item => item.index !== explore)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = [explore];
  for (const item of ranked) {
    if (!selected.includes(item.index)) selected.push(item.index);
    if (selected.length >= 3) break;
  }
  while (selected.length < 3) selected.push((explore + selected.length) % QUERY_SEEDS.length);
  return selected;
}

function updateQueryStats(current: QueryStat[] | undefined, query: string, outcome: CreatorOutcome) {
  const stats = ensureQueryStats(current);
  return stats.map(stat => stat.query === query ? {
    ...stat,
    attempts: stat.attempts + 1,
    accepted: stat.accepted + (outcome === 'accepted' ? 1 : 0),
    ambiguous: stat.ambiguous + (outcome === 'ambiguous' ? 1 : 0),
    rejected: stat.rejected + (outcome === 'rejected' ? 1 : 0),
    unsafe: stat.unsafe + (outcome === 'unsafe' ? 1 : 0),
    lastUsedAt: new Date().toISOString(),
  } : stat);
}

function canUseTrustedFastPath(candidate: Candidate, stat: CreatorStat | undefined, config: DiscoveryConfig) {
  if (!stat || hasBlockedSignal(candidate) || hasCautionSignal(candidate)) return false;
  if ((stat.quarantinedUntil || 0) > Date.now()) return false;
  if ((stat.accepted || 0) < config.trustedFastPathMinAccepted) return false;
  if (creatorTrust(stat) < config.trustedFastPathScore) return false;
  if (candidate.signalCount < 2) return false;
  return !shouldAuditCandidate(candidate.id);
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

export async function getTrustedDiscoverySources() {
  const [config, stateRaw] = await Promise.all([readConfig(), readState()]);
  const state = stateRaw || defaultState();
  return (state.creatorStats || [])
    .filter(stat =>
      (stat.accepted || 0) >= config.trustedFastPathMinAccepted &&
      creatorTrust(stat) >= config.trustedFastPathScore &&
      (stat.quarantinedUntil || 0) <= Date.now(),
    )
    .sort((a, b) => creatorTrust(b) - creatorTrust(a) || (b.accepted || 0) - (a.accepted || 0))
    .slice(0, 16)
    .map(stat => ({
      key: stat.creatorKey,
      name: stat.name,
      channelUrl: stat.channelUrl,
      category: 'Christian Growth',
    }));
}

export async function runWatchDiscovery(options: { maxCandidates?: number; source?: 'cron' | 'feed_bootstrap' | 'external_tick'; minIntervalMinutes?: number } = {}) {
  const config = await readConfig();
  const state = (await readState()) || defaultState();
  const now = Date.now();
  const source = options.source || 'cron';
  const lastRun = state.lastRunAt ? Date.parse(state.lastRunAt) : 0;
  const minIntervalMinutes = Math.max(0, Number(options.minIntervalMinutes) || 0);

  if (!config.enabled) return { skipped: true, reason: 'disabled', accepted: 0, reviewed: 0 };
  if (minIntervalMinutes && lastRun && now - lastRun < minIntervalMinutes * 60 * 1000) return { skipped: true, reason: 'min_interval', accepted: 0, reviewed: 0, lastRunAt: state.lastRunAt };
  if (state.cooldownUntil && state.cooldownUntil > now) return { skipped: true, reason: 'ai_cooldown', accepted: 0, reviewed: 0 };
  if (state.frozenUntil && state.frozenUntil > now) return { skipped: true, reason: 'safety_freeze', accepted: 0, reviewed: 0 };

  const queryIndexes = selectQueryIndexes(state);
  const queryResults = await Promise.all(queryIndexes.map(index => youtubeSearch(QUERY_SEEDS[index])));
  const discovered = Array.from(new Map(queryResults.flat().map(candidate => [candidate.id, candidate])).values());
  const published = (await readPublished()) || { videos: [], updatedAt: new Date(0).toISOString(), id: '' };
  const review = (await readReview()) || { items: [], updatedAt: new Date(0).toISOString(), id: '' };
  const seen = new Set([...state.seenIds, ...published.videos.map(video => video.id)]);
  const limit = Math.max(1, Math.min(config.maxPerRun, options.maxCandidates || config.maxPerRun));
  const fresh = discovered.filter(candidate => !seen.has(candidate.id)).slice(0, limit);

  const accepted: WatchDiscoveryVideo[] = [];
  const reviewed: ReviewItem[] = [];
  const processedIds: string[] = [];
  let creatorStats = state.creatorStats || [];
  let queryStats = ensureQueryStats(state.queryStats);
  let cooldownUntil: number | null = null;
  let ambiguousThisRun = 0;
  let rejectedThisRun = 0;
  let unsafeThisRun = 0;
  let aiFailures = 0;

  for (const candidate of fresh) {
    try {
      const known = creatorStats.find(item => item.creatorKey === candidate.creatorKey);
      const classification = canUseTrustedFastPath(candidate, known, config)
        ? 'christian_safe'
        : await classifyCandidate(candidate);
      processedIds.push(candidate.id);
      const outcome: CreatorOutcome = classification === 'christian_safe'
        ? 'accepted'
        : classification === 'ambiguous'
          ? 'ambiguous'
          : classification === 'not_christian'
            ? 'rejected'
            : 'unsafe';
      creatorStats = updateCreatorStats(creatorStats, candidate, outcome);
      queryStats = updateQueryStats(queryStats, candidate.query, outcome);

      if (outcome === 'accepted' && config.autoPublish) {
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
      } else {
        if (outcome === 'ambiguous') ambiguousThisRun += 1;
        if (outcome === 'rejected') rejectedThisRun += 1;
        if (outcome === 'unsafe') unsafeThisRun += 1;
        reviewed.push({
          ...candidate,
          classification,
          reviewedAt: new Date().toISOString(),
          note: outcome === 'accepted'
            ? 'Clearly Christian but held because autonomous publishing is disabled in configuration.'
            : outcome === 'unsafe'
              ? 'Automatically rejected and creator trust reduced by the safety gate.'
              : outcome === 'rejected'
                ? 'Automatically rejected as non-Christian content.'
                : 'Held out of the live catalogue because the evidence was not clear enough.',
        });
      }
    } catch (error) {
      const rpc = error as { statusCode?: number; responseText?: string };
      if (rpc.statusCode === 429) {
        cooldownUntil = Date.now() + 6 * 60 * 60 * 1000;
        console.warn('NFCPS Watch agent entered AI cooldown after rate limit');
        break;
      }
      aiFailures += 1;
      ambiguousThisRun += 1;
      processedIds.push(candidate.id);
      creatorStats = updateCreatorStats(creatorStats, candidate, 'ambiguous');
      queryStats = updateQueryStats(queryStats, candidate.query, 'ambiguous');
      reviewed.push({
        ...candidate,
        classification: 'ambiguous',
        reviewedAt: new Date().toISOString(),
        note: 'Classification was unavailable, so the autonomous agent did not publish this item.',
      });
      console.warn('NFCPS Watch candidate classification failed', candidate.id, error);
    }
  }

  const processedCount = processedIds.length;
  const unsafeRatio = processedCount ? unsafeThisRun / processedCount : 0;
  const frozenUntil = processedCount >= 4 && unsafeThisRun >= 2 && unsafeRatio >= 0.4
    ? Date.now() + config.autoFreezeHours * 60 * 60 * 1000
    : null;
  const mergedPublished = Array.from(
    new Map([...accepted, ...published.videos].map(video => [video.id, video])).values(),
  ).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  const safePublished = limitCreatorDensity(mergedPublished, Math.max(1, config.maxPublishedPerCreator));
  const mergedReview = Array.from(
    new Map([...reviewed, ...review.items].map(item => [item.id, item])).values(),
  ).slice(0, 100);

  await Promise.all([
    writePublished({ videos: safePublished, updatedAt: new Date().toISOString() }),
    writeReview({ items: mergedReview, updatedAt: new Date().toISOString() }),
  ]);

  await writeState({
    ...state,
    queryCursor: (state.queryCursor + 3) % QUERY_SEEDS.length,
    seenIds: Array.from(new Set([...processedIds, ...state.seenIds])).slice(0, 600),
    creatorStats,
    queryStats,
    lastRunAt: new Date().toISOString(),
    lastAccepted: accepted.length,
    lastReviewed: reviewed.length,
    lastCandidateCount: discovered.length,
    lastSource: source,
    totalRuns: (state.totalRuns || 0) + 1,
    totalAccepted: (state.totalAccepted || 0) + accepted.length,
    totalAmbiguous: (state.totalAmbiguous || 0) + ambiguousThisRun,
    totalRejected: (state.totalRejected || 0) + rejectedThisRun,
    totalUnsafe: (state.totalUnsafe || 0) + unsafeThisRun,
    consecutiveFailures: processedCount ? 0 : (state.consecutiveFailures || 0) + 1,
    cooldownUntil,
    frozenUntil,
    lastError: aiFailures ? `${aiFailures} candidate classification attempt${aiFailures === 1 ? '' : 's'} failed safely.` : null,
  });

  return {
    skipped: false,
    source,
    accepted: accepted.length,
    reviewed: reviewed.length,
    unsafe: unsafeThisRun,
    published: safePublished.length,
    frozenUntil,
  };
}

export async function maybeBootstrapWatchAgent() {
  const config = await readConfig();
  const state = (await readState()) || defaultState();
  const published = await readPublished();
  const lastRun = state.lastRunAt ? Date.parse(state.lastRunAt) : 0;
  const stale = !lastRun || Date.now() - lastRun >= config.bootstrapAfterHours * 60 * 60 * 1000;
  if (!stale) return { skipped: true, reason: 'fresh' };
  const maxCandidates = published?.videos?.length ? 2 : 4;
  return runWatchDiscovery({ maxCandidates, source: 'feed_bootstrap' });
}

export async function getWatchAgentStatus() {
  const [config, stateRaw, published, review] = await Promise.all([readConfig(), readState(), readPublished(), readReview()]);
  const state = stateRaw || defaultState();
  const creators = (state.creatorStats || [])
    .map(item => ({
      creator: item.name,
      trust: Number(creatorTrust(item).toFixed(3)),
      accepted: item.accepted || 0,
      rejected: item.rejected || 0,
      unsafe: item.unsafe || 0,
      quarantined: (item.quarantinedUntil || 0) > Date.now(),
    }))
    .sort((a, b) => b.trust - a.trust || b.accepted - a.accepted);
  const queryStats = ensureQueryStats(state.queryStats)
    .map(item => ({ query: item.query, weight: Number(queryWeight(item).toFixed(3)), attempts: item.attempts, accepted: item.accepted, unsafe: item.unsafe }))
    .sort((a, b) => b.weight - a.weight);

  return {
    mode: 'autonomous',
    enabled: config.enabled,
    autoPublish: config.autoPublish,
    strictMode: config.strictMode,
    feedBootstrap: true,
    expectedSchedule: 'GitHub hourly engine heartbeat + 3h feed bootstrap + demand-driven Shorts replenishment',
    lastRunAt: state.lastRunAt,
    lastSource: state.lastSource || null,
    lastAccepted: state.lastAccepted,
    lastHeld: state.lastReviewed,
    publishedCount: published?.videos?.length || 0,
    heldCount: review?.items?.length || 0,
    totalRuns: state.totalRuns || 0,
    totalAccepted: state.totalAccepted || 0,
    totalAmbiguous: state.totalAmbiguous || 0,
    totalRejected: state.totalRejected || 0,
    totalUnsafe: state.totalUnsafe || 0,
    cooldownUntil: state.cooldownUntil || null,
    frozenUntil: state.frozenUntil || null,
    learnedCreatorCount: creators.length,
    trustedCreatorCount: creators.filter(item => item.accepted >= config.trustedFastPathMinAccepted && item.trust >= config.trustedFastPathScore && !item.quarantined).length,
    quarantinedCreatorCount: creators.filter(item => item.quarantined).length,
    topLearnedCreators: creators.slice(0, 8),
    topDiscoveryQueries: queryStats.slice(0, 6),
    lastError: state.lastError || null,
  };
}
