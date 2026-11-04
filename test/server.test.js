import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createServer } from '../server.js';

async function fixture(t, fetchImpl) {
  const server = createServer({ fetch: fetchImpl });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}

test('HTTP service', async (t) => {
  const previous = process.env.DESEARCH_API_KEY;
  // Generate a synthetic credential instead of using a real key.
  const credential = crypto.randomUUID();
  process.env.DESEARCH_API_KEY = credential;
  t.after(() => {
    if (previous === undefined) delete process.env.DESEARCH_API_KEY;
    else process.env.DESEARCH_API_KEY = previous;
  });

  await t.test('forwards encoded query, count and only Bearer authentication', async (t) => {
    const data = { data: [{ title: 'Example', link: 'https://example.org', snippet: 'Excerpt' }] };
    let calls = 0;
    const request = await fixture(t, async (url, options) => {
      calls++;
      assert.equal(url.origin + url.pathname, 'https://api.desearch.ai/web');
      assert.deepEqual([...url.searchParams], [['query', 'a & b/日本'], ['num', '3']]);
      assert.equal(options.method, 'GET');
      assert.deepEqual(options.headers, { Authorization: `Bearer ${credential}` });
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json(data);
    });
    const response = await request('/search?q=a%20%26%20b%2F%E6%97%A5%E6%9C%AC&num=3');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await response.json(), data);
    assert.equal(calls, 1);
  });

  await t.test('defaults num to 10 and allows empty result sets', async (t) => {
    const request = await fixture(t, async (url) => {
      assert.equal(url.searchParams.get('num'), '10');
      return Response.json({ data: [] });
    });
    const response = await request('/search?q=test');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  });

  await t.test('health, routing and invalid inputs never call the provider', async (t) => {
    const request = await fixture(t, () => { throw new Error('Unexpected fetch'); });
    assert.deepEqual(await (await request('/health')).json(), { status: 'ok' });
    assert.equal((await request('/unknown')).status, 404);
    for (const path of ['/health', '/search?q=test']) {
      const response = await request(path, { method: 'POST' });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET');
    }
    for (const path of ['/search', '/search?q=', '/search?q=%20', ...['', '0', '-1', '1.5', 'abc', '1e2', '9007199254740992'].map(num => `/search?q=test&num=${num}`)]) {
      assert.equal((await request(path)).status, 400, path);
    }
  });

  await t.test('missing key returns 503 while health remains available', async (t) => {
    delete process.env.DESEARCH_API_KEY;
    try {
      const request = await fixture(t, () => { throw new Error('Unexpected fetch'); });
      assert.equal((await request('/search?q=test')).status, 503);
      assert.equal((await request('/health')).status, 200);
    } finally {
      process.env.DESEARCH_API_KEY = credential;
    }
  });

  for (const scenario of ['provider error', 'network error', 'invalid JSON', 'invalid shape']) {
    await t.test(`${scenario} returns a generic 502`, async (t) => {
      const request = await fixture(t, async () => {
        if (scenario === 'provider error') return new Response(credential, { status: 401 });
        if (scenario === 'network error') throw new Error(credential);
        if (scenario === 'invalid JSON') return new Response(credential);
        return Response.json({ unexpected: credential });
      });
      const response = await request('/search?q=test');
      assert.equal(response.status, 502);
      const body = await response.text();
      assert.ok(!body.includes(credential));
      assert.equal(typeof JSON.parse(body).error, 'string');
    });
  }
});
