// Server static minimal pe portul 5177 (singurul port alocat sondei). Opțional: antet CSP pe paginile HTML.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execFileSync } from 'node:child_process';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
export const PORT = 5177;
export const ORIGIN = `http://localhost:${PORT}`;

export function startServer(root, { csp = null, log = null } = {}) {
  const srv = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = normalize(join(root, p));
      if (!f.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
      const st = await stat(f).catch(() => null);
      if (!st || !st.isFile()) { res.writeHead(404).end('404'); log?.push(`404 ${p}`); return; }
      const ext = extname(f);
      const h = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' };
      // HTML și sw.js nu se țin în cache HTTP (altfel aplicația veche poate fi servită din cache-ul browserului).
      h['Cache-Control'] = ext === '.html' || p.endsWith('sw.js') || p.endsWith('registerSW.js') || ext === '.webmanifest' ? 'no-cache' : 'public, max-age=31536000, immutable';
      const c = typeof csp === 'function' ? csp(p) : ext === '.html' ? csp : null;
      if (c) h['Content-Security-Policy'] = c;
      res.writeHead(200, h);
      res.end(await readFile(f));
      log?.push(`200 ${p}`);
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
  return new Promise((ok, ko) => {
    srv.once('error', ko);
    srv.listen(PORT, '127.0.0.1', () => ok({ close: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(() => r()); }) }));
  });
}

// Browserul: Microsoft Edge instalat (Chromium 154). Chromium-ul din cache-ul Playwright nu pornește din sandbox-ul
// acestei sesiuni (spawn UNKNOWN), iar Edge e oricum o țintă din BRIEF §3.
export const LAUNCH = { channel: 'msedge' };
export const CHROME = 'msedge';

// Omoară brutal (TerminateProcess) toate procesele Chromium care folosesc profilul dat. Simulează o cădere.
export function killProfile(profileDir) {
  const needle = profileDir.replace(/\//g, '\\').split('\\').pop();
  const ps = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${needle}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }`;
  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  return out.split(/\s+/).filter(Boolean).length;
}
