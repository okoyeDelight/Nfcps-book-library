const HATCHABLE_ORIGIN = 'https://nfcps-one.hatchable.site';
const COMPAT_BASE = `${HATCHABLE_ORIGIN}/api/compat`;

type RequestOptions = { method?: string; body?: unknown; headers?: Record<string, string> };
type ApiResponse<T = any> = { data: T; status: number; headers: Headers };

function directHatchablePath(url: string) {
  if (url === '/api/ebooks/catalog') return `${HATCHABLE_ORIGIN}/api/ebooks/catalog`;
  if (url.startsWith('/api/reader/book/')) return `${HATCHABLE_ORIGIN}${url}`;
  if (url.startsWith('/api/circulation/')) return `${HATCHABLE_ORIGIN}${url}`;
  if (url.startsWith('/api/nfcps-account/')) return `${HATCHABLE_ORIGIN}${url}`;
  if (url.startsWith('/api/member-sync/')) return `${HATCHABLE_ORIGIN}${url}`;
  if (url === '/api/watch/live') return `${HATCHABLE_ORIGIN}/api/watch/live`;
  return '';
}

function resolveUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/api/')) return url;
  const direct = directHatchablePath(url);
  if (direct) return direct;
  return `${COMPAT_BASE}/${url.slice('/api/'.length)}`;
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };
  const init: RequestInit = { method, headers, credentials: 'include' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(resolveUrl(url), init);
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

export const api = {
  get: <T = any>(url: string, _data?: unknown) => request<T>(url),
  post: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  patch: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
  delete: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'DELETE', body }),
};

type Handler = (...args: any[]) => void;
function inertRealtimeConnection() {
  let closeHandler: Handler | null = null;
  const connection = {
    connectionId: '',
    ready: Promise.resolve(),
    onOpen(_handler: Handler) { return connection; },
    onClose(handler: Handler) { closeHandler = handler; return connection; },
    onError(_handler: Handler) { return connection; },
    onMessage(_handler: Handler) { return connection; },
    disconnect() { closeHandler?.(); },
  };
  return connection;
}

export const ws = {
  connect: (..._args: unknown[]) => inertRealtimeConnection(),
};

function hasNativeNotifications() {
  return typeof window !== 'undefined' && Boolean((window as any).__NFCPS_NATIVE__);
}

export const auth = {
  isSignedIn: () => hasNativeNotifications(),
  signIn: async (_options?: unknown) => undefined,
  signOut: async (_options?: unknown) => undefined,
};

export const notifications = {
  configure: async (_options?: unknown) => undefined,
  getEnableGuidance: async (_options?: unknown) => hasNativeNotifications()
    ? ({ kind: 'ready', title: 'Phone reminders ready', message: 'NFCPS One will use Android notifications for this reminder.', steps: [] as string[] })
    : ({ kind: 'unsupported', title: 'Open NFCPS One on Android', message: 'Lock-screen reminders are available inside the installed NFCPS One app.', steps: [] as string[] }),
  subscribe: async (_options?: unknown) => ({ ok: hasNativeNotifications() }),
};
