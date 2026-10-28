import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { EroareDocumentatie, genereazaDocumentatia } from './scripts/documentatie.ts';
import { CSP } from './shared/csp.ts';
import { DIR_DOCUMENTATIE } from './shared/documentatie.ts';
import { DIR_CODURI } from './shared/coduri.ts';
import { DIR_MANUAL } from './shared/manual.ts';
import { DIR_MESAJE } from './shared/mesaje.ts';
import { DIR_TUTORIAL } from './shared/tutorial.ts';
import { inPrecache } from './shared/precache.ts';

/**
 * Versiunea din build: commit-ul checkout-ului. Două build-uri ale aceluiași commit ies identice, octet cu octet. Întâi
 * `git` (în workflow-ul `publica`, pornit manual, `GITHUB_SHA` e capul lui `main`, nu commit-ul cerut și scos: ADR 0044);
 * `GITHUB_SHA` doar fără `git`. Exact 12 caractere: scriptul de publicare le caută în `dist/`.
 */
function versiune(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 12);
  } catch {
    return process.env['GITHUB_SHA']?.slice(0, 12) ?? 'necunoscută';
  }
}

/** CSP-ul intră doar în build: serverul de dezvoltare are nevoie de scripturile inline ale lui React. */
function cspInBuild(): Plugin {
  return {
    name: 'cncvs2-csp-in-build',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      ),
    },
  };
}

/**
 * Documentația admin (ADR 0048): la fiecare build, `scripts/documentatie.ts` citește `PLAN.md`, fișele din `docs/etape/`,
 * ADR-urile, `CLAUDE.md` și `DEVLOG.md` și scrie `dist/documentatie/` (roadmap-ul, catalogul, documentele), pe care
 * pagina `/admin` le cere abia la deschiderea filei. Un tabel care nu se mai poate citi oprește build-ul, cu fișierul și
 * motivul. În dezvoltare, aceleași fișiere se generează la fiecare cerere (un document editat se vede la reîncărcare).
 * Tot aici se generează manualul utilizatorului (ADR 0058), în `dist/manual/`, și dicționarul codurilor controlerului (ADR
 * 0085), în `dist/coduri/`, și mesajele modulelor la cerere (ADR 0086), în `dist/mesaje/`.
 */
function documentatie(): Plugin {
  let radacina = process.cwd();
  const genereaza = (): Map<string, string> => {
    try {
      return genereazaDocumentatia(radacina);
    } catch (e) {
      if (e instanceof EroareDocumentatie) throw new Error(`Documentația nu se poate genera (ADR 0048, manualul: ADR 0058): ${e.message}`, { cause: e });
      throw e;
    }
  };
  return {
    name: 'cncvs2-documentatie',
    configResolved(c) {
      radacina = c.root;
    },
    generateBundle() {
      for (const [fileName, source] of genereaza()) this.emitFile({ type: 'asset', fileName, source });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cale = (req.url ?? '').split('?')[0] ?? '';
        if (![DIR_DOCUMENTATIE, DIR_MANUAL, DIR_TUTORIAL, DIR_CODURI, DIR_MESAJE].some((d) => cale.startsWith(`/${d}/`))) {
          next();
          return;
        }
        let continut: string | undefined;
        try {
          continut = genereaza().get(decodeURIComponent(cale.slice(1)));
        } catch (e) {
          res.statusCode = 500;
          res.end(e instanceof Error ? e.message : String(e));
          return;
        }
        if (continut === undefined) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', cale.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8');
        res.end(continut);
      });
    },
  };
}

/**
 * Workerul PWA (ADR 0045, ADR 0017): `src/sw.ts`, scris de build la `/sw.js` (adresa workerului ediției întâi, pe care o
 * preia), cu lista precache-ului dată de `shared/precache.ts` (aceeași funcție o aplică poarta pe build). Fără manifestul
 * aplicației (instalabilitatea cere iconițe; nu e ținta), fără scriptul de înregistrare injectat în `index.html` (pornirea
 * cere un singur script; înregistrarea vine la cerere, `src/pwa/inregistrare.ts`) și fără worker în dezvoltare.
 */
function pwa(): Plugin[] {
  return VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    injectRegister: false,
    manifest: false,
    devOptions: { enabled: false },
    injectManifest: {
      // Un worker clasic (nu modul): se înregistrează fără `type: 'module'`, în orice browser cu service worker.
      rollupFormat: 'iife',
      sourcemap: false,
      globPatterns: ['**/*'],
      // Plafonul de mărime al unui fișier din precache. Peste el, vite-plugin-pwa 2.0.0 OPREȘTE build-ul (nu scoate tăcut
      // fișierul; probat în recenzia din 18.10 cu 100 kB), iar poarta mai verifică și ea manifestul. 8 MB lasă loc bucății
      // de pornire (peste 500 kB minificată) și workerului pânzei, fără să mute eroarea în build la fiecare creștere.
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      // Mărimea fiecărui fișier intră în manifest (`marime`): progresul instalării o adună (ADR 0097). Workbox scoate din
      // intrări doar `size`, după transformări; restul câmpurilor rămân în `sw.js`.
      manifestTransforms: [(intrari) => ({ manifest: intrari.filter((i) => inPrecache(i.url)).map((i) => ({ ...i, marime: i.size })), warnings: [] })],
    },
  });
}

export default defineConfig({
  plugins: [react(), cspInBuild(), documentatie(), pwa()],
  define: {
    __VERSIUNE__: JSON.stringify(versiune()),
  },
  build: {
    target: 'es2023',
    sourcemap: false,
    // Fără polyfill-ul `modulepreload`: toate browserele țintă (es2023) îl au nativ, iar polyfill-ul stătea în pornire.
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        // Tot ce importă static intrarea stă într-o singură bucată, `index.html` cere un singur script (plasa din
        // `scripts/build-determinist.ts`). Fără grup, un modul împărțit de pornire și de o bucată la cerere ieșea într-o
        // bucată comună, preîncărcată: o mutare la cerere putea astfel adăuga o cerere la pornire, nu scoate octeți.
        codeSplitting: { groups: [{ name: 'pornire', tags: ['$initial'] }] },
      },
    },
  },
});
