/**
 * Planificatorul Trenuleț ca extensie (ADR 0129), construit din `extensii/trenulet/sursa/` fără Python: `repr` din Python
 * pe numerele catalogului și JSON-ul compact al lui `build.py`; pagina de sine stătătoare, octet cu octet cea din v18 (amprenta
 * copiei de pe PC, `preview.html`); pachetul, citit de cvs2 ca la instalare: manifestul, permisiunile, intrarea fără importuri,
 * scripturile paginii în ordinea ei, cu catalogul pus.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { jsonCaPython, pachetTrenulet, paginiPlanificator, reprPython, scripturi } from '../../scripts/construieste-trenulet.ts';
import { citestePachet } from '../../src/extensii/pachet.ts';

/** SHA-256 al lui `preview.html` din v18 (`Apps/Trenulet`), construit acolo de `build.py`. */
const V18 = '26ca18394b7a135f875a582a1ffc5bac4606b3f6bc323e4aa765bd86ae316eaa';

test('repr din Python: cel mai scurt text, .0 la întregi, exponentul sub 1e-4 și de la 1e16', () => {
  const cazuri: [number, string][] = [
    [40, '40.0'], [0, '0.0'], [-0, '-0.0'], [0.1, '0.1'], [-2.5, '-2.5'], [123.456, '123.456'], [1e-4, '0.0001'], [1e-5, '1e-05'],
    [1.5e-7, '1.5e-07'], [1e16, '1e+16'], [1234567890123456, '1234567890123456.0'], [1.2345678901234568e17, '1.2345678901234568e+17'],
    [0.30000000000000004, '0.30000000000000004'], [5e-324, '5e-324'],
  ];
  for (const [x, py] of cazuri) assert.equal(reprPython(x), py, String(x));
  assert.throws(() => reprPython(Number.NaN));
});

test('JSON-ul compact ca json.dumps: numerele își păstrează felul, textul rămâne UTF-8', () => {
  assert.equal(
    jsonCaPython('{ "a": 40.0, "b": [1, 2e3, -0.5, 1E-7, -12], "c": "ă\\"\\n\\u0041", "d": true, "e": null, "f": {} }'),
    '{"a":40.0,"b":[1,2000.0,-0.5,1e-07,-12],"c":"ă\\"\\nA","d":true,"e":null,"f":{}}',
  );
});

test('pagina de sine stătătoare: octet cu octet v18', () => {
  const { planificator, preview } = paginiPlanificator();
  assert.equal(createHash('sha256').update(preview).digest('hex'), V18);
  assert.ok(preview.endsWith(`<body>${planificator}</body></html>`));
});

test('pachetul: cvs2 îl citește ca la instalare; intrarea fără importuri, scripturile paginii în ordinea ei, catalogul pus', async () => {
  const r = await citestePachet(pachetTrenulet().octeti);
  assert.ok(r.ok, JSON.stringify(r));
  const { manifest, fisiere } = r.pachet;
  assert.deepEqual([manifest.id, manifest.intrare, manifest.stiluri, manifest.permisiuni], ['trenulet', 'index.js', ['trenulet.css'], ['stocare', 'descarcari', 'masina']]);
  const surse = scripturi();
  assert.deepEqual([...fisiere.keys()].sort(), ['body.html', 'index.js', 'trenulet.css', ...surse.map((s) => `js/${s.nume}`)].sort());
  const text = (c: string): string => new TextDecoder().decode(fisiere.get(c));
  const intrare = text('index.js');
  assert.doesNotMatch(intrare, /^\s*import\b|\bimport\s*\(/m);
  assert.match(intrare, /^export async function activeaza\(host\s*\)/m);
  const ordine = /const SCRIPTURI = \[([^\]]*)\]/.exec(intrare)?.[1]?.match(/'[^']+'/g)?.map((x) => x.slice(1, -1));
  assert.deepEqual(ordine, surse.map((s) => s.nume));
  for (const s of surse) assert.equal(text(`js/${s.nume}`), s.text, s.nume);
  assert.doesNotMatch(text('js/app.js'), /\/\*CATALOG\*\/null/);
  assert.match(text('trenulet.css'), /^\*,\*::before,\*::after\{box-sizing:border-box\}body\{margin:0\}\n/);
  assert.equal(text('body.html'), readFileSync('extensii/trenulet/sursa/planificator/body.html', 'utf8'));
});
