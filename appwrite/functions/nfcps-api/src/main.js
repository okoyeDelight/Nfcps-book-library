const DEFAULT_LEGACY_API_BASE = 'https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y';
const DEFAULT_TIMEOUT_MS = 25000;
const FORWARDED_REQUEST_HEADERS = new Set([
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'if-none-match',
  'if-modified-since',
  'user-agent',
  'x-appwrite-user-jwt',
  'x-nfcps-client',
]);
const FORWARDED_RESPONSE_HEADERS = new Set([
  'cache-control',
  'content-disposition',
  'content-language',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'location',
]);

function asHeaderObject(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (value === undefined || value === null) continue;
    out[String(key).toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return out;
}

function allowedOrigins() {
  return (process.env.NFCPS_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(req) {
  const requestHeaders = asHeaderObject(req?.headers);
  const origin = requestHeaders.origin || '';
  const allowed = allowedOrigins();
  const wildcard = allowed.includes('*');
  const canUseOrigin = origin && (wildcard || allowed.includes(origin));
  return {
    'Access-Control-Allow-Origin': canUseOrigin ? origin : (wildcard ? '*' : allowed[0] || '*'),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Accept,Authorization,Content-Type,If-None-Match,If-Modified-Since,X-Appwrite-User-JWT,X-NFCPS-Client',
    'Access-Control-Expose-Headers': 'Content-Type,ETag,Last-Modified,X-NFCPS-Bridge,X-NFCPS-Upstream',
    'Vary': 'Origin',
  };
}

function getPathAndQuery(req) {
  let path = typeof req?.path === 'string' && req.path ? req.path : '/';
  let query = typeof req?.queryString === 'string' ? req.queryString.replace(/^\?/, '') : '';

  if ((!query || path === '/') && typeof req?.url === 'string' && req.url) {
    try {
      const parsed = new URL(req.url, 'https://nfcps.local');
      if (path === '/') path = parsed.pathname || '/';
      if (!query) query = parsed.search.replace(/^\?/, '');
    } catch {
      // Appwrite still gives us req.path, so malformed req.url is non-fatal.
    }
  }

  if (!path.startsWith('/')) path = `/${path}`;
  return query ? `${path}?${query}` : path;
}

function legacyBase() {
  return (process.env.NFCPS_LEGACY_API_BASE || DEFAULT_LEGACY_API_BASE).replace(/\/+$/, '');
}

function proxyTarget(req) {
  const pathAndQuery = getPathAndQuery(req);
  return `${legacyBase()}${pathAndQuery}`;
}

function proxyRequestHeaders(req) {
  const incoming = asHeaderObject(req?.headers);
  const out = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (FORWARDED_REQUEST_HEADERS.has(key)) out[key] = value;
  }
  out['x-nfcps-migration-bridge'] = 'appwrite';
  return out;
}

function responseHeaders(upstream, req) {
  const out = { ...corsHeaders(req), 'X-NFCPS-Bridge': 'appwrite', 'X-NFCPS-Upstream': 'legacy' };
  for (const [key, value] of upstream.headers.entries()) {
    if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) out[key] = value;
  }
  return out;
}

function timeoutMs() {
  const configured = Number(process.env.NFCPS_PROXY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1000 ? Math.min(configured, 29000) : DEFAULT_TIMEOUT_MS;
}

function healthPayload() {
  return {
    ok: true,
    service: 'nfcps-one-api',
    platform: 'appwrite',
    mode: 'legacy-bridge',
    revision: 1,
    timestamp: new Date().toISOString(),
    legacyUpstreamConfigured: Boolean(legacyBase()),
  };
}

export default async ({ req, res, log, error }) => {
  const method = String(req?.method || 'GET').toUpperCase();
  const pathAndQuery = getPathAndQuery(req);
  const pathOnly = pathAndQuery.split('?')[0];
  const cors = corsHeaders(req);

  if (method === 'OPTIONS') return res.text('', 204, cors);

  if (method === 'GET' && (pathOnly === '/health' || pathOnly === '/api/migration/health')) {
    return res.json(healthPayload(), 200, { ...cors, 'X-NFCPS-Bridge': 'appwrite' });
  }

  const target = proxyTarget(req);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    log?.(`[nfcps-api] ${method} ${pathAndQuery} -> legacy`);
    const bodyAllowed = !['GET', 'HEAD'].includes(method);
    const upstream = await fetch(target, {
      method,
      headers: proxyRequestHeaders(req),
      body: bodyAllowed && typeof req?.bodyText === 'string' ? req.bodyText : undefined,
      redirect: 'manual',
      signal: controller.signal,
    });
    const body = method === 'HEAD' ? '' : await upstream.text();
    return res.text(body, upstream.status, responseHeaders(upstream, req));
  } catch (cause) {
    const timedOut = cause?.name === 'AbortError';
    error?.(`[nfcps-api] upstream ${timedOut ? 'timeout' : 'failure'} for ${method} ${pathAndQuery}: ${cause?.message || cause}`);
    return res.json({
      ok: false,
      error: timedOut ? 'NFCPS upstream timed out' : 'NFCPS upstream is temporarily unavailable',
      bridge: 'appwrite',
      retryable: true,
    }, timedOut ? 504 : 502, { ...cors, 'X-NFCPS-Bridge': 'appwrite' });
  } finally {
    clearTimeout(timer);
  }
};
