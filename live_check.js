import { once } from 'node:events';
import { createServer } from './server.js';

const server = createServer();
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/search?q=bittensor&num=3`);
  if (!response.ok) throw new Error('Search failed');
  const { data } = await response.json();
  console.log(`Result count: ${data.length}`);
  console.log(`First title: ${String(data[0]?.title ?? '').replace(/[\r\n\u001b]/g, ' ')}`);
} catch {
  console.error('Live check failed. Check DESEARCH_API_KEY and network access.');
  process.exitCode = 1;
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
