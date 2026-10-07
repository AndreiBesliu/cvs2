// Server static pentru sonda, DOAR pe portul 5175, cu COOP/COEP (SharedArrayBuffer pentru workeri).
// POST /rezultat?nume=x scrie rezultate/browser-x.json
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm' };
export function startServer(port = 5175) {
  const srv = http.createServer(async (req, res) => {
    const h = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cache-Control': 'no-store' };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && url.pathname === '/rezultat') {
        const chunks = []; for await (const c of req) chunks.push(c);
        const name = (url.searchParams.get('nume') || 'x').replace(/[^a-z0-9_-]/gi, '');
        await mkdir(join(ROOT, 'rezultate'), { recursive: true });
        await writeFile(join(ROOT, 'rezultate', `browser-${name}.json`), Buffer.concat(chunks));
        res.writeHead(200, h); res.end('ok'); return;
      }
      const p = normalize(join(ROOT, decodeURIComponent(url.pathname === '/' ? '/web/index.html' : url.pathname)));
      if (!p.startsWith(normalize(ROOT))) { res.writeHead(403, h); res.end(); return; }
      const body = await readFile(p);
      res.writeHead(200, { ...h, 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body);
    } catch (e) { res.writeHead(404, h); res.end(String(e)); }
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  startServer().then(() => console.log('http://127.0.0.1:5175/'));
}
