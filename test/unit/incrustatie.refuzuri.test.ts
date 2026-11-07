/**
 * Refuzurile incrustației în V (ADR 0170 §4), judecate de lucrare înainte de traseu, cu motivul: jocul sub 0,1 mm sau cel puțin
 * cât adâncimea, dopul săpat (D − g + H) peste conul frezei, o freză cu vârf plat, banda (12.1↑c), dopul fără freza dreaptă
 * (12.1↑d), incrustația pe altceva decât un V-carve (12.1↑b). Pe hârtie: V60 Ø6 are conul 3 / tan 30° = 5,196 mm. Plus
 * gruparea: două incrustații ale aceleiași piese, cu alt joc, sunt două dopuri (cheia V-carve-ului cuprinde incrustația).
 * Găsite prin otrăvurile 12.1 (R01–R08, G01, G02): niciun test nu le cerea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { refuzIncrustatie } from '../../src/cam/incrustatie.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { suprafataPeScule } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const INC = { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata' } as const;

/** Operația de incrustație de bază: V60 Ø6 (T2), adâncimea 3, fundul plat cu freza dreaptă Ø3 (T1). */
function operatie(p: Record<string, unknown> = {}, id = 'o', noduri = ['a']): Record<string, unknown> {
  return {
    id, tip: 'vcarve', noduri, latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5,
    scula: { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } },
    urechi: null, rampa: null, intrari: null, colturi: null,
    fundPlat: { scula: { numar: 1, nume: 'freza dreapta', diametru: 3 }, pasLateral: 1.2 },
    incrustatie: { ...INC }, ...p,
  };
}

/** Un document cu dreptunghiurile date (x, y, lățime, înălțime), câte un element, și operațiile date. */
function documentCu(dreptunghiuri: readonly (readonly [number, number, number, number])[], operatii: readonly unknown[]): Document {
  const copii = dreptunghiuri.map(([x, y, w, h], k) => ({
    tip: 'element', id: String.fromCharCode(97 + k), matrice: { ...I, e: x, f: y }, forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 },
  }));
  const r = incarca({
    schema: 20, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: I, copii }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

const refuz = (p: Record<string, unknown>): string | null => refuzIncrustatie(operatie(p) as unknown as Operatie, 'e1/a');

test('pe hârtie: incrustația de bază (V60 Ø6, D 3, g 0,5, H 2: dopul la 4,5 din conul de 5,196) nu e refuzată', () => {
  assert.equal(refuz({}), null);
});

test('jocul pentru clei: sub 0,1 mm (crestele colțurilor ar ține dopul) și cel puțin cât adâncimea sunt refuzate, cu motivul', () => {
  assert.match(refuz({ incrustatie: { ...INC, joc: 0.05 } }) ?? '', /jocul pentru clei, de 0\.05 mm, trebuie să fie cel puțin 0\.1 mm/);
  assert.equal(refuz({ incrustatie: { ...INC, joc: 0.1, fierastrau: 2 } }), null);
  assert.match(refuz({ incrustatie: { ...INC, joc: 3 } }) ?? '', /trebuie să fie sub adâncimea locașului \(3 mm\)/);
});

test('dopul săpat peste con: D − g + H = 3 − 0,5 + 2,7 = 5,2 > 5,196 e refuzat; 2,69 (5,19) trece', () => {
  assert.match(refuz({ incrustatie: { ...INC, fierastrau: 2.7 } }) ?? '', /dopul se sapă până la 5\.2 mm .* conul frezei în V \(Ø6, 60°\) are 5\.196 mm/);
  assert.equal(refuz({ incrustatie: { ...INC, fierastrau: 2.69 } }), null);
});

test('freza cu vârf plat, banda, dopul fără freză dreaptă și incrustația pe un profil: refuzate, cu felia care le aduce sau cu rolul potrivit', () => {
  assert.match(refuz({ scula: { numar: 2, nume: 'freza V60 varf 0.2', diametru: 6, forma: { tip: 'v', unghi: 60, varf: 0.2 } } }) ?? '', /vârf plat/);
  assert.match(refuz({ incrustatie: { ...INC, jurDop: 'banda' } }) ?? '', /12\.1↑c/);
  const { fundPlat: _f, ...faraFund } = operatie();
  void _f;
  assert.match(refuzIncrustatie(faraFund as unknown as Operatie, 'e1/a') ?? '', /freza dreaptă: alege-o în coloana Fund plat .*12\.1↑d/);
  assert.match(refuz({ tip: 'profil', latura: 'interior', scula: { numar: 2, nume: 'freza plata', diametru: 6 } }) ?? '',
    /incrustația în V e a unui V-carve \(pe un buzunar, alege incrustația cu pereți drepți\)/);
});

test('lucrarea refuză incrustația înaintea traseului: programul foii nu iese, cu motivul și elementul', () => {
  const r = programDinDocument(documentCu([[20, 20, 20, 10]], [operatie({ incrustatie: { ...INC, joc: 0.05 } })]));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motiv, /^i\/a: jocul pentru clei, de 0\.05 mm/);
});

test('două incrustații ale aceleiași piese, cu alt joc, sunt două dopuri; cu același joc, un singur dop', async () => {
  const doua = documentCu([[20, 20, 20, 10], [60, 20, 20, 10]], [operatie({}, 'o1', ['a']), operatie({ incrustatie: { ...INC, joc: 0.3 } }, 'o2', ['b'])]);
  const r = await calculeazaExport(doua, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.dopuri.length, 2);
  const unul = documentCu([[20, 20, 20, 10], [60, 20, 20, 10]], [operatie({}, 'o1', ['a']), operatie({}, 'o2', ['b'])]);
  const u = await calculeazaExport(unul, { origine: 'stanga-jos', z0: 'sus' });
  if (!u.ok) assert.fail(u.motiv);
  assert.equal(u.dopuri.length, 1);
});

test('locașul se grupează după aceeași cheie ca dopul: două incrustații cu alt joc, una în alta, nu fac un inel cu o creastă', async () => {
  // Pătratul 20 × 20 din (20, 20), cu jocul 0,5, și pătratul 6 × 6 din (27, 27) în el, cu jocul 0,3: două dopuri, deci două
  // regiuni și în programul foii. Pe hârtie, în (30, 27), pe latura pătratului mic, locașul mare e la −min(3, 7 / tan 30°) = −3;
  // grupate (cheia fără incrustație), cele două ar face un inel par-impar plus un buzunar, cu o creastă la suprafață acolo.
  const doc = documentCu([[20, 20, 20, 20], [27, 27, 6, 6]], [operatie({}, 'o1', ['a']), operatie({ incrustatie: { ...INC, joc: 0.3 } }, 'o2', ['b'])]);
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.dopuri.length, 2);
  const text = r.program.text;
  // Sculele bucăților, în ordine: cea de la pornire, apoi fiecare `T… M6` (T1 freza dreaptă Ø3, T2 V60 Ø6; regiunile își
  // schimbă freza fiecare, deci T1, T2, T1, T2).
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  const scule: SculaOracol[] = [m6[0] === 2 ? 1 : 2, ...m6].map((n) => (n === 1 ? { tip: 'plata', diametru: 3 } : { tip: 'v', diametru: 6, unghi: 60 }));
  const o = suprafataPeScule(text, { x0: 29.95, y0: 26.95, latime: 0.1, inaltime: 0.1, celula: 0.1 }, scule);
  assert.ok(Math.abs(o.z[0]! + 3) <= 0.05, `pe latura pătratului mic, locașul mare: ${o.z[0]} (−3 pe hârtie)`);
});
