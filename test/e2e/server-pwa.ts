/**
 * Serverul probelor PWA (ADR 0045 §9): o copie a `dist/`, servită pe un port liber, separat de `vite preview` (4173,
 * pe care rulează restul suitei cu workerul blocat). Ce face în plus față de un server static:
 * - `Cache-Control: no-store` pe tot: o pagină pornită offline n-are de unde lua fișierele decât din workerul PWA (cache-ul
 *   HTTP al browserului ar ascunde un fișier lipsă din precache: `/assets/*` e `immutable` pe hosting);
 * - `/sw.js` și `/config.json` se pot înlocui în timpul probei (a doua versiune a workerului, un worker „vechi”);
 * - `/admin` și `/admin/**` primesc `index.html`, ca pe hosting; orice altă cale necunoscută e 404 (și sub `/assets/`);
 * - `/gol.html`: o pagină goală, fila „aplicației vechi” din proba preluării;
 * - `/__/auth/*`: o pagină proprie, ca paginile rezervate ale Firebase Hosting (handler-ul login-ului Google, iframe-ul);
 * - `dosar(d)`: din clipa aceea servește alt build (o publicare nouă pe aceeași adresă, `publicareSimulata`);
 * - `lipsa(re)`: căile potrivite primesc 404 (o bucată dispărută sau nevenită);
 * - `opreste()` închide serverul de tot (conexiunea refuzată): offline adevărat, nu doar modul offline al browserului.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { Socket } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { cspPentru } from '../../scripts/cspHtml.ts';

const TIPURI: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

export interface ServerPwa {
  readonly origine: string;
  /** Căile cerute, în ordine (fără query). */
  readonly cereri: string[];
  /** Textul servit la `/sw.js` în locul celui din build (`null`: cel din build). */
  sw(text: string | null): void;
  /** Textul servit la `/config.json` (`null`: cel din build). */
  config(text: string | null): void;
  /** Dosarul servit de acum înainte (o publicare nouă). */
  dosar(d: string): void;
  /** Căile care primesc 404 (`null`: niciuna). */
  lipsa(re: RegExp | null): void;
  /** Căile servite abia după `ms` (`null`: niciuna), ca o rețea lentă; lipsa (404) vine și ea după întârziere. */
  intarzie(re: RegExp | null, ms?: number): void;
  opreste(): Promise<void>;
}

/** Ce servește hosting-ul la paginile lui rezervate (`/__/auth/handler`, `/__/auth/iframe`): o pagină care nu e aplicația. */
export const PAGINA_HANDLER = 'FIREBASE AUTH HANDLER';

/** Bucățile redenumite de o publicare simulată: numele din build-ul vechi și cel nou. */
export interface Redenumire { readonly vechi: string; readonly nou: string }

/**
 * O publicare nouă, simulată: copia `dosarA` în `dosarB`, cu bucățile potrivite de `re` (calea din `assets/`) redenumite,
 * ca un commit nou (alt conținut, altă amprentă): numele vechi DISPAR, iar fiecare fișier text care le pomenea (index.html,
 * celelalte bucăți, manifestul din `sw.js`) primește numele nou. Ca la un build adevărat (amprenta e a conținutului), o
 * bucată care pomenea un nume schimbat își schimbă și ea numele, până nu se mai schimbă nimic: altfel ea ar ieși cu același
 * nume și alt conținut, iar workerul ar servi copia veche din precache (recenzia 3.F: bucata comună a cititorului de
 * markdown importa pornirea veche, deci React de două ori în `/admin`). Revizia lui `index.html` din manifest se
 * recalculează (md5, ca workbox-build), iar `sw.js` iese diferit, deci browserul îl vede ca actualizare.
 */
export function publicareSimulata(dosarA: string, dosarB: string, re: RegExp): Redenumire[] {
  rmSync(dosarB, { recursive: true, force: true });
  cpSync(dosarA, dosarB, { recursive: true });
  const nume = (vechi: string): Redenumire => {
    const m = /^(.+-)([A-Za-z0-9_-]{8})(\.(?:js|css))$/.exec(vechi);
    if (!m) throw new Error(`fără amprentă: ${vechi}`);
    const amprenta = m[2] ?? '';
    // Ultimul caracter se schimbă și fără majuscule: pe un disc care nu le deosebește (NTFS), `…z` → `…Z` ar fi același fișier.
    return { vechi, nou: `${m[1] ?? ''}${amprenta.slice(0, 7)}${/[zZ]$/.test(amprenta) ? 'Y' : 'Z'}${m[3] ?? ''}` };
  };
  const bucati = readdirSync(join(dosarB, 'assets')).filter((f) => /\.(?:js|css)$/.test(f));
  const redenumiri: Redenumire[] = bucati.filter((f) => re.test(f)).map(nume);
  if (redenumiri.length === 0) throw new Error(`nicio bucată nu se potrivește cu ${String(re)}`);
  // Închiderea: bucățile care pomenesc o bucată redenumită se redenumesc și ele.
  for (let schimbat = true; schimbat;) {
    schimbat = false;
    for (const f of bucati) {
      if (redenumiri.some((r) => r.vechi === f)) continue;
      const text = readFileSync(join(dosarB, 'assets', f), 'utf8');
      if (redenumiri.some((r) => text.includes(r.vechi))) {
        redenumiri.push(nume(f));
        schimbat = true;
      }
    }
  }
  for (const { vechi, nou } of redenumiri) renameSync(join(dosarB, 'assets', vechi), join(dosarB, 'assets', nou));
  const texte = ['index.html', 'sw.js', ...readdirSync(join(dosarB, 'assets')).map((f) => `assets/${f}`)];
  for (const f of texte) {
    const cale = join(dosarB, f);
    const inainte = readFileSync(cale, 'utf8');
    const dupa = redenumiri.reduce((s, { vechi, nou }) => s.split(vechi).join(nou), inainte);
    if (dupa !== inainte) writeFileSync(cale, dupa);
  }
  // Harta importurilor din index.html are nume noi, deci CSP-ul ei își schimbă amprenta (ADR 0098), ca la un build adevărat.
  const html = readFileSync(join(dosarB, 'index.html'), 'utf8');
  const cuCsp = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/, `$1${cspPentru(html)}$2`);
  if (cuCsp === html && !html.includes(cspPentru(html))) throw new Error('index.html n-are meta-ul CSP');
  writeFileSync(join(dosarB, 'index.html'), cuCsp);
  const sw = readFileSync(join(dosarB, 'sw.js'), 'utf8');
  const revizie = createHash('md5').update(readFileSync(join(dosarB, 'index.html'))).digest('hex');
  const swNou = sw.replace(/("revision":")[0-9a-f]{32}(","url":"index\.html")/, `$1${revizie}$2`);
  if (swNou === sw) throw new Error('revizia lui index.html din manifest nu s-a găsit în sw.js');
  writeFileSync(join(dosarB, 'sw.js'), swNou);
  return redenumiri;
}

/** Copia `dist/` a probelor, fără `banc/`, într-un dosar propriu (suita de pe 4173 nu e atinsă). */
export function copieDist(dosar: string): string {
  if (!existsSync('dist/sw.js')) throw new Error('dist/sw.js lipsește: rulează întâi `npm run build`');
  rmSync(dosar, { recursive: true, force: true });
  cpSync('dist', dosar, { recursive: true, filter: (f) => !normalize(f).split(/[\\/]/).includes('banc') });
  return dosar;
}

export async function pornesteServer(dosarInitial: string): Promise<ServerPwa> {
  let dosar = dosarInitial;
  let sw: string | null = null;
  let config: string | null = null;
  let lipsa: RegExp | null = null;
  let lente: { readonly re: RegExp; readonly ms: number } | null = null;
  const cereri: string[] = [];
  const conexiuni = new Set<Socket>();
  const trimite = (r: import('node:http').ServerResponse, status: number, tip: string, corp: string | Buffer): void => {
    r.writeHead(status, { 'content-type': tip, 'cache-control': 'no-store' });
    r.end(corp);
  };
  const server: Server = createServer((cerere, r) => {
    const cale = decodeURIComponent(new URL(cerere.url ?? '/', 'http://x').pathname);
    cereri.push(cale);
    if (lente?.re.test(cale)) {
      setTimeout(() => { raspunde(cale, r); }, lente.ms);
      return;
    }
    raspunde(cale, r);
  });
  const raspunde = (cale: string, r: import('node:http').ServerResponse): void => {
    if (lipsa?.test(cale)) return trimite(r, 404, 'text/plain', 'nu există');
    if (cale.startsWith('/__/auth/')) return trimite(r, 200, TIPURI['.html'] ?? '', `<!doctype html><meta charset="utf-8"><title>handler</title><p id="handler">${PAGINA_HANDLER}</p>`);
    if (cale === '/sw.js' && sw !== null) return trimite(r, 200, TIPURI['.js'] ?? '', sw);
    if (cale === '/config.json' && config !== null) return trimite(r, 200, TIPURI['.json'] ?? '', config);
    if (cale === '/gol.html') return trimite(r, 200, TIPURI['.html'] ?? '', '<!doctype html><meta charset="utf-8"><title>gol</title><p>fila veche</p>');
    const tinta = cale === '/' || cale === '/admin' || cale.startsWith('/admin/') ? '/index.html' : cale;
    const fisier = normalize(join(dosar, tinta));
    if (!fisier.startsWith(normalize(dosar)) || !existsSync(fisier) || tinta.endsWith('/')) return trimite(r, 404, 'text/plain', 'nu există');
    return trimite(r, 200, TIPURI[extname(fisier)] ?? 'application/octet-stream', readFileSync(fisier));
  };
  server.on('connection', (s) => {
    conexiuni.add(s);
    s.on('close', () => { conexiuni.delete(s); });
  });
  await new Promise<void>((ok) => { server.listen(0, '127.0.0.1', ok); });
  const adresa = server.address();
  if (adresa === null || typeof adresa === 'string') throw new Error('serverul n-are port');
  return {
    // 127.0.0.1 e context sigur (service worker-ul merge pe http), ca `localhost`, fără ocolul prin IPv6.
    origine: `http://127.0.0.1:${adresa.port}`,
    cereri,
    sw: (t) => { sw = t; },
    config: (t) => { config = t; },
    dosar: (d) => { dosar = d; },
    lipsa: (re) => { lipsa = re; },
    intarzie: (re, ms = 0) => { lente = re === null ? null : { re, ms }; },
    opreste: () => new Promise<void>((ok) => {
      for (const s of conexiuni) s.destroy();
      server.close(() => { ok(); });
    }),
  };
}
