import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/main.js';

function responseMock() {
  return {
    json(payload, status = 200, headers = {}) {
      return { type: 'json', payload, status, headers };
    },
    text(payload, status = 200, headers = {}) {
      return { type: 'text', payload, status, headers };
    },
  };
}

function context(req) {
  return {
    req,
    res: responseMock(),
    log() {},
    error() {},
  };
}

test('health endpoint is served natively by Appwrite bridge', async () => {
  const result = await handler(context({ method: 'GET', path: '/health', headers: { origin: 'https://example.test' } }));
  assert.equal(result.type, 'json');
  assert.equal(result.status, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.platform, 'appwrite');
  assert.equal(result.payload.mode, 'legacy-bridge');
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://example.test');
});

test('OPTIONS preflight never reaches legacy upstream', async () => {
  let calls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls += 1; throw new Error('should not run'); };
  try {
    const result = await handler(context({ method: 'OPTIONS', path: '/api/watch/feed', headers: { origin: 'https://example.test' } }));
    assert.equal(result.status, 204);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('API requests are proxied with path, query, status and content type preserved', async () => {
  const previousFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit;
  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true, source: 'legacy' }), {
      status: 207,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  };

  try {
    const result = await handler(context({
      method: 'POST',
      path: '/api/watch/feed',
      queryString: 'category=Prayer',
      bodyText: JSON.stringify({ hello: 'world' }),
      headers: { 'content-type': 'application/json', origin: 'https://example.test', 'x-nfcps-client': 'test' },
    }));

    assert.equal(capturedUrl, 'https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y/api/watch/feed?category=Prayer');
    assert.equal(capturedInit.method, 'POST');
    assert.equal(capturedInit.body, JSON.stringify({ hello: 'world' }));
    assert.equal(result.status, 207);
    assert.match(result.payload, /legacy/);
    assert.equal(result.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(result.headers['X-NFCPS-Bridge'], 'appwrite');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('legacy failure returns a retryable gateway response', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network down'); };
  try {
    const result = await handler(context({ method: 'GET', path: '/api/watch/feed', headers: {} }));
    assert.equal(result.type, 'json');
    assert.equal(result.status, 502);
    assert.equal(result.payload.retryable, true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
