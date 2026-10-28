/**
 * Harta importurilor sub CSP (ADR 0098): harta e un script inline în `index.html`, deci CSP-ul (fără `unsafe-inline`) o
 * lasă să ruleze doar prin amprenta ei exactă în `script-src`, în meta-ul din build și în antetul de pe Hosting. Orice alt
 * script inline rămâne refuzat (proba din browser: `test/e2e/csp.spec.ts`). Plus versiunea build-ului, citită din antetul
 * paginii, nu dintr-o bucată JavaScript.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cspPentru, hashuriInline } from '../../scripts/cspHtml.ts';
import { CSP, cspCu } from '../../shared/csp.ts';
import { META_VERSIUNE, versiuneDin } from '../../shared/versiune.ts';

const HARTA = '{"imports":{"/assets/a-AAAAAAAA.js":"/assets/a-BBBBBBBB.js"}}';
/** Pe hârtie (în afara codului): base64(sha256(HARTA)), calculat cu `hashlib` din Python. */
const HASH_HARTA = "'sha256-k5SyWn6dTVsoqC1RdwYS3Fg/VEL82ia4WxSZblb33zk='";
/** La fel, pentru `document.title=1`. */
const HASH_TITLU = "'sha256-NLsF158hwB4cVlqsPS6P/wZoHw6fhD93dpSHcZZxMu8='";
const META_CSP = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;
const pagina = (cap: string): string => `<!doctype html>\n<html lang="ro">\n  <head>\n    ${cap}\n  </head>\n  <body></body>\n</html>\n`;

test('amprenta hărții: sha256 din textul exact dintre etichete, ca în CSP (valoarea calculată în afara codului)', () => {
  assert.deepEqual(hashuriInline(pagina(`<script type="importmap">${HARTA}</script>`)), [HASH_HARTA]);
});

test('scripturile cu src n-au amprentă; două scripturi inline dau două amprente, în ordine; fără ele, nimic', () => {
  assert.deepEqual(hashuriInline(pagina('<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>')), []);
  assert.deepEqual(hashuriInline(pagina(`<script type="importmap">${HARTA}</script>\n<script>document.title=1</script>`)), [HASH_HARTA, HASH_TITLU]);
  assert.deepEqual(hashuriInline(pagina(META_CSP)), []);
});

test('cspCu: amprentele intră o singură dată în script-src, iar restul directivelor rămâne același; fără amprente, CSP-ul', () => {
  assert.equal(cspCu([]), CSP);
  const cu = cspCu([HASH_HARTA]);
  const directive = (s: string): string[] => s.split('; ');
  const scriptSrc = directive(cu).find((d) => d.startsWith('script-src '));
  assert.ok(scriptSrc);
  assert.deepEqual(scriptSrc.split(' ').filter((x) => x === HASH_HARTA), [HASH_HARTA]);
  assert.ok(scriptSrc.startsWith("script-src 'self' "), scriptSrc);
  assert.deepEqual(directive(cu).filter((d) => !d.startsWith('script-src ')), directive(CSP).filter((d) => !d.startsWith('script-src ')));
  assert.ok(!cu.includes('unsafe-inline') && !cu.includes('unsafe-eval'));
  assert.equal(cspCu([HASH_HARTA, HASH_HARTA]), cu, 'aceeași amprentă de două ori');
});

test('cspPentru: CSP-ul unei pagini = CSP-ul cu amprentele scripturilor ei inline', () => {
  assert.equal(cspPentru(pagina(`${META_CSP}\n<script type="importmap">${HARTA}</script>`)), cspCu([HASH_HARTA]));
  assert.equal(cspPentru(pagina(META_CSP)), CSP);
});

test('versiunea build-ului, din antetul paginii; fără ea, „necunoscută”', () => {
  const doc = (content: string | null) => ({
    querySelector: (s: string) => {
      assert.equal(s, `meta[name="${META_VERSIUNE}"]`);
      return content === null ? null : { getAttribute: (a: string) => (a === 'content' ? content : null) };
    },
  });
  assert.equal(versiuneDin(doc('abc123def456')), 'abc123def456');
  assert.equal(versiuneDin(doc(null)), 'necunoscută');
  assert.equal(versiuneDin(doc('')), 'necunoscută');
});
