/**
 * Planificatorul Trenuleț ca extensie (ADR 0129, 0161), construit din `extensii/trenulet/sursa/` fără Python: `repr` din
 * Python pe numerele catalogului și JSON-ul compact al lui `build.py`; pagina de sine stătătoare din sursele de acum
 * (marcajul, foaia, scripturile în ordinea paginii), aceeași la fiecare construcție; sursele fără atribute `style` (CSP-ul
 * moștenit în cvs2 le-ar refuza); pachetul, citit de cvs2 ca la instalare: manifestul, permisiunile, intrarea fără importuri,
 * scripturile paginii în ordinea ei, cu catalogul pus.
 *
 * Până la 3.Tb, pagina era octet cu octet `preview.html` din v18 (amprenta `26ca1839…`, probată pe `754319b`). De atunci
 * sursele se schimbă în repo, iar ieșirile motoarelor le apără `trenulet.referinte.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { jsonCaPython, pachetTrenulet, paginiPlanificator, reprPython, scripturi } from '../../scripts/construieste-trenulet.ts';
import { citestePachet } from '../../src/extensii/pachet.ts';

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

test('pagina de sine stătătoare: marcajul, foaia și scripturile surselor, în ordinea paginii; aceeași la fiecare construcție', () => {
  const { planificator, preview } = paginiPlanificator();
  assert.equal(createHash('sha256').update(preview).digest('hex'), createHash('sha256').update(paginiPlanificator().preview).digest('hex'));
  assert.ok(preview.endsWith(`<body>${planificator}</body></html>`));
  const sursa = (f: string): string => readFileSync(`extensii/trenulet/sursa/planificator/${f}`, 'utf8');
  assert.ok(planificator.startsWith(`${sursa('head.html')}\n${sursa('body.html')}\n`));
  let poz = 0;
  for (const s of scripturi()) {
    const k = planificator.indexOf(`<script>\n${s.text}\n</script>\n`, poz);
    assert.ok(k >= poz, s.nume);
    poz = k + 1;
  }
});

test('scripturile paginii sunt JavaScript: sursele TypeScript intră fără tipuri, ca scripturi clasice (ADR 0162)', () => {
  for (const s of scripturi()) {
    assert.doesNotThrow(() => new Script(s.text, { filename: s.nume }), s.nume);
    assert.ok(s.text.trim().length > 1000, s.nume);
  }
});

test('sursele paginii n-au atribute style: în cvs2, CSP-ul moștenit le-ar refuza (ADR 0161 §C)', () => {
  const surse = [
    ['body.html', readFileSync('extensii/trenulet/sursa/planificator/body.html', 'utf8')],
    ['head.html', readFileSync('extensii/trenulet/sursa/planificator/head.html', 'utf8')],
    ...scripturi().map((s) => [s.nume, s.text]),
  ] as const;
  for (const [nume, text] of surse) {
    assert.doesNotMatch(text, /\sstyle\s*=/, nume);
    assert.doesNotMatch(text, /setAttribute\(\s*["'`]style["'`]/, nume);
  }
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
