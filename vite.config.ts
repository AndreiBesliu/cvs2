import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { CSP } from './shared/csp.ts';

/** Versiunea din build: commit-ul. Două build-uri ale aceluiași commit ies identice, octet cu octet. */
function versiune(): string {
  const dinCi = process.env['GITHUB_SHA'];
  if (dinCi) return dinCi.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'necunoscută';
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

export default defineConfig({
  plugins: [react(), cspInBuild()],
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
