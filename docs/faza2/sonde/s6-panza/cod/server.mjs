// server.mjs — sonda s6-panza (ARUNCABIL). Server static minimal, doar pe 127.0.0.1:5176.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.ttf': 'font/ttf', '.css': 'text/css' };
export const PORT = 5176;

export function startServer() {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = u === '/font/arial.ttf' ? 'C:/Windows/Fonts/arial.ttf' : path.join(ROOT, u === '/' ? '/bench.html' : u);
    if (!f.startsWith(ROOT) && !f.startsWith('C:/Windows/Fonts/')) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('404 ' + u); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((ok) => srv.listen(PORT, '127.0.0.1', () => ok(srv)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer().then(() => console.log('http://127.0.0.1:' + PORT + '/'));
}
