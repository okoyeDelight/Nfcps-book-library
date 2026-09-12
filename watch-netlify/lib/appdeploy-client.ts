const LEGACY_API_BASE = 'https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y';
const configuredApiBase = (process.env.NEXT_PUBLIC_NFCPS_API_BASE || '').trim();
const configuredFallbackBase = (process.env.NEXT_PUBLIC_NFCPS_API_FALLBACK || LEGACY_API_BASE).trim();
const API_BASE = (configuredApiBase || LEGACY_API_BASE).replace(/\/+$/, '');
const READ_FALLBACK_BASE = configuredFallbackBase.replace(/\/+$/, '');

type RequestOptions = { method?: string; body?: unknown; headers?: Record<string, string> };
type ApiResponse<T = any> = { data: T; status: number; headers: Headers };

function resolveUrl(url: string, base = API_BASE) {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return `${base}${url}`;
  return url;
}

async function requestOnce<T = any>(url: string, options: RequestOptions, base: string): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-NFCPS-Client': 'watch-route',
    ...(options.headers || {}),
  };
  const init: RequestInit = { method, headers, credentials: 'include' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(resolveUrl(url, base), init);
  const text = await response.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error: any = new Error(data?.error || data?.message || `Request failed (${response.status})`);
    error.response = { status: response.status, data };
    throw error;
  }
  return { data, status: response.status, headers: response.headers };
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isRelativeApi = url.startsWith('/api/');
  try {
    return await requestOnce<T>(url, options, API_BASE);
  } catch (error) {
    const canReadFailOver = isRelativeApi
      && (method === 'GET' || method === 'HEAD')
      && READ_FALLBACK_BASE
      && READ_FALLBACK_BASE !== API_BASE;
    if (!canReadFailOver) throw error;
    return requestOnce<T>(url, options, READ_FALLBACK_BASE);
  }
}

export const api = {
  get: <T = any>(url: string) => request<T>(url),
  post: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  patch: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
  delete: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'DELETE', body }),
};

type Handler = (...args: any[]) => void;
function inertRealtimeConnection() {
  let closeHandler: Handler | null = null;
  let stopped = false;
  const connection = {
    connectionId: '',
    ready: Promise.resolve(),
    onOpen(_handler: Handler) { window.setTimeout(() => { if (!stopped) closeHandler?.(); }, 0); return connection; },
    onClose(handler: Handler) { closeHandler = handler; return connection; },
    onError(_handler: Handler) { return connection; },
    onMessage(_handler: Handler) { return connection; },
    disconnect() { stopped = true; closeHandler?.(); },
  };
  return connection;
}
export const ws = { connect: inertRealtimeConnection };

export const auth = {
  isSignedIn: () => false,
  signIn: async () => { throw new Error('Push-notification sign-in is temporarily unavailable during the hosting migration.'); },
  signOut: async () => undefined,
};

export const notifications = {
  getEnableGuidance: async () => ({
    kind: 'unsupported',
    title: 'Push reminders are temporarily paused',
    message: 'Borrowing, waitlists and calendar reminders still work. Lock-screen push reminders will return after the notification layer is migrated.',
    steps: [],
  }),
  subscribe: async () => ({ ok: false }),
};
