const HATCHABLE = 'https://nfcps-one.hatchable.site';

type RequestOptions = { method?: string; body?: unknown; headers?: Record<string, string> };
type ApiResponse<T = any> = { data: T; status: number; headers: Headers };

const nativeApp = () => typeof window !== 'undefined' && Boolean((window as any).__NFCPS_NATIVE__);

function resolveUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/api/')) return url;

  if (
    url === '/api/ebooks/catalog' ||
    url.startsWith('/api/reader/book/') ||
    url.startsWith('/api/circulation/') ||
    url === '/api/watch/live' ||
    url.startsWith('/api/read/')
  ) return `${HATCHABLE}${url}`;

  return `${HATCHABLE}/api/compat${url.slice('/api'.length)}`;
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };
  const init: RequestInit = { method, headers, credentials: 'omit' };
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
    onOpen(_handler: Handler) { return connection; },
    onClose(handler: Handler) { closeHandler = handler; return connection; },
    onError(_handler: Handler) { return connection; },
    onMessage(_handler: Handler) { return connection; },
    disconnect() { stopped = true; if (!stopped) closeHandler?.(); },
  };
  return connection;
}

export const ws = {
  connect: (..._args: unknown[]) => inertRealtimeConnection(),
};

export const auth = {
  isSignedIn: () => nativeApp(),
  signIn: async (_options?: unknown) => {
    if (nativeApp()) return;
    throw new Error('Device notification sign-in is moving to the NFCPS One notification bridge.');
  },
  signOut: async (_options?: unknown) => undefined,
};

export const notifications = {
  configure: async (_options?: unknown) => undefined,
  getEnableGuidance: async (_options?: unknown) => {
    if (nativeApp()) return { kind: 'ready', title: '', message: '', steps: [] as string[] };
    return {
      kind: 'unsupported',
      title: 'Install NFCPS One for device reminders',
      message: 'Borrowing and waitlists work here. Native device reminders are handled by the NFCPS One app.',
      steps: [] as string[],
    };
  },
  subscribe: async (_options?: unknown) => ({ ok: nativeApp() }),
};
