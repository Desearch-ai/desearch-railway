import http from 'node:http';
import { pathToFileURL } from 'node:url';

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export function createServer({ fetch: fetchImpl = globalThis.fetch } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/health' && url.pathname !== '/search') {
      return json(res, 404, { error: 'Not found' });
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return json(res, 405, { error: 'Method not allowed' });
    }
    if (url.pathname === '/health') return json(res, 200, { status: 'ok' });

    const query = url.searchParams.get('q')?.trim();
    const num = url.searchParams.get('num') ?? '10';
    if (!query || !/^[1-9]\d*$/.test(num) || !Number.isSafeInteger(Number(num))) {
      return json(res, 400, { error: 'Provide a nonempty q and a positive integer num' });
    }
    const key = process.env.DESEARCH_API_KEY;
    if (!key) return json(res, 503, { error: 'Search is not configured' });

    const upstream = new URL('https://api.desearch.ai/web');
    upstream.searchParams.set('query', query);
    upstream.searchParams.set('num', num);
    try {
      const response = await fetchImpl(upstream, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) return json(res, 502, { error: 'Search provider request failed' });
      const body = await response.json();
      if (!body || !Array.isArray(body.data)) {
        return json(res, 502, { error: 'Invalid search provider response' });
      }
      return json(res, 200, body);
    } catch {
      return json(res, 502, { error: 'Search provider unavailable' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer();
  server.listen(process.env.PORT || 3000, '0.0.0.0');
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => server.close());
  }
}
