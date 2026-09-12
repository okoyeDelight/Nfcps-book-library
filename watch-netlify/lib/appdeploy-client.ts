const API_BASE = 'https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y';

type RequestOptions = { method?: string; body?: unknown; headers?: Record<string, string> };
type ApiResponse<T = any> = { data: T; status: number; headers: Headers };

function resolveUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return `${API_BASE}${url}`;
  return url;
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

export const ws = {
  connect: (..._args: unknown[]) => inertRealtimeConnection(),
};

export const auth = {
  isSignedIn: () => false,
  signIn: async (_options?: unknown) => { throw new Error('Push-notification sign-in is temporarily unavailable during the hosting migration.'); },
  signOut: async (_options?: unknown) => undefined,
};

export const notifications = {
  configure: async (_options?: unknown) => undefined,
  getEnableGuidance: async (_options?: unknown) => ({
    kind: 'unsupported',
    title: 'Push reminders are temporarily paused',
    message: 'Borrowing, waitlists and calendar reminders still work. Lock-screen push reminders will return after the notification layer is migrated.',
    steps: [] as string[],
  }),
  subscribe: async (_options?: unknown) => ({ ok: false }),
};
