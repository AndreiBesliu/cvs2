// Server static al sondei s11, DOAR pe portul 5187. Antetele de izolare se aleg din cale:
//   /m/<mod>/<fisier>  -> fisierul din dosarul sondei, cu antetele modului (pe TOATE raspunsurile: pagina, module, workeri)
//   /plain/<fisier>    -> fara niciun antet de izolare (iframe / popup "strain", fara opt-in)
//   /corp/<fisier>     -> cu CORP: cross-origin + COEP: require-corp (iframe care accepta sa fie incorporat)
//   POST /rezultat?nume=x -> scrie rezultate/browser-x.json
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
export const PORT = 5187;
export const MODES = {
  none: {},
  'coep-rc': { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' },
  'coep-cl': { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' },
  'dip-rc': { 'Document-Isolation-Policy': 'isolate-and-require-corp' },
  'dip-cl': { 'Document-Isolation-Policy': 'isolate-and-credentialless' },
  // control: COOP care lasa popup-urile + COEP -> NU trebuie sa dea crossOriginIsolated
  'coopap-rc': { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', 'Cross-Origin-Embedder-Policy': 'require-corp' },
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
export const requestLog = [];

export function startServer(port = PORT) {
  const srv = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const parts = url.pathname.split('/').filter(Boolean);
    let h = { 'Cache-Control': 'no-store' }, rel = null;
    if (parts[0] === 'm' && MODES[parts[1]]) { h = { ...h, ...MODES[parts[1]] }; rel = parts.slice(2).join('/'); }
    else if (parts[0] === 'plain') rel = parts.slice(1).join('/');
    else if (parts[0] === 'corp') { h = { ...h, 'Cross-Origin-Resource-Policy': 'cross-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }; rel = parts.slice(1).join('/'); }
    requestLog.push({ t: Date.now(), host: req.headers.host, path: url.pathname, sfd: req.headers['sec-fetch-dest'] || '' });
    try {
      if (req.method === 'POST' && url.pathname === '/rezultat') {
        const chunks = []; for await (const c of req) chunks.push(c);
        const name = (url.searchParams.get('nume') || 'x').replace(/[^a-z0-9_-]/gi, '');
        await mkdir(join(ROOT, 'rezultate'), { recursive: true });
        await writeFile(join(ROOT, 'rezultate', `browser-${name}.json`), Buffer.concat(chunks));
        res.writeHead(200, h); res.end('ok'); return;
      }
      if (rel === null) { res.writeHead(404, h); res.end('cale necunoscuta'); return; }
      const p = normalize(join(ROOT, decodeURIComponent(rel)));
      if (!p.startsWith(normalize(ROOT)) || p.includes('node_modules')) { res.writeHead(403, h); res.end(); return; }
      const body = await readFile(p);
      res.writeHead(200, { ...h, 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body);
    } catch (e) { res.writeHead(404, h); res.end(String(e)); }
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  startServer().then(() => console.log(`http://127.0.0.1:${PORT}/m/coep-rc/web/bench.html`));
}
