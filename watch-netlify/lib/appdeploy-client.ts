type RequestOptions = { method?: string; body?: unknown; headers?: Record<string, string> };

type ApiResponse<T = any> = { data: T; status: number; headers: Headers };

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };
  const init: RequestInit = { method, headers, credentials: 'include' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, init);
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
  get: <T = any>(url: string) => request<T>(url),
  post: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  patch: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
  delete: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'DELETE', body }),
};

type Handler = (...args: any[]) => void;

function inertRealtimeConnection() {
  let openHandler: Handler | null = null;
  let closeHandler: Handler | null = null;
  let errorHandler: Handler | null = null;
  let messageHandler: Handler | null = null;
  let stopped = false;
  const connection = {
    connectionId: '',
    ready: Promise.resolve(),
    onOpen(handler: Handler) { openHandler = handler; window.setTimeout(() => { if (!stopped) closeHandler?.(); }, 0); return connection; },
    onClose(handler: Handler) { closeHandler = handler; return connection; },
    onError(handler: Handler) { errorHandler = handler; return connection; },
    onMessage(handler: Handler) { messageHandler = handler; return connection; },
    disconnect() { stopped = true; closeHandler?.(); },
  };
  void openHandler; void errorHandler; void messageHandler;
  return connection;
}

export const ws = { connect: inertRealtimeConnection };

export const auth = {
  isSignedIn: () => false,
  signIn: async () => { throw new Error('Platform sign-in stays on the current NFCPS host during staged migration.'); },
  signOut: async () => undefined,
};

export const notifications = {
  getEnableGuidance: async () => ({ kind: 'unsupported', title: 'Notifications remain on the current NFCPS host', message: 'This Watch-only migration does not move notification delivery.', steps: [] }),
  subscribe: async () => ({ ok: false }),
};
