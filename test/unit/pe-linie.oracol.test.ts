/**
 * Invarianta 14 (i) (ADR 0037 §13; felia 2.3c, sesiune independentă), pe programe scrise de mână, fără aplicație (deci
 * verde și înainte, și după reparația de la §1):
 * - (a) martorul: programul aplicației de la `ed5cd65` (cercul Ø50 ascuns în două semicercuri cu capetele pe cale) e
 *   prins pe ambele semicercuri, înainte; poarta de dinainte (`inainteDe0037`) nu vedea nimic;
 * - (b) același program cu cercul înlocuit de un G1 trece toată poarta, iar lanțul chiar e judecat;
 * - (c) martorii negativi: fiecare prins, în sensul cerut, la linia cerută; poarta de dinainte nu-i vede;
 * - (d) cazul cel mai rău legal (biarcele la limită + rotunjirea postului pe arc) trece de 0,001 + 0,002 și rămâne sub
 *   `TOL_14`: trece (fără marja declarată ar fi refuzat);
 * - (e) două treceri complete trec, cu două lanțuri; (f) granița toleranței: mutat cu 0,003 trece, cu 0,004 nu;
 * - (g) modul: pe toate programele de aici, poarta de dinainte = poarta de acum fără 14.
 * Cazurile în `test/oracles/pe-linie.cazuri.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, parteaDeTaiere, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { citeste } from '../oracles/gcode.ts';
import { citesteEticheta, verificaEticheta } from '../oracles/regiune.ts';
import { lanturiPeLinie, TOL_14, TOL_BIARCE_14, TOL_POST_14 } from '../oracles/pe-linie.ts';
import {
  celMaiRauArc, ctx14, docMartor, douaTreceri, LINII_CERC, martori14, PROGRAM_ED5CD65, PROGRAM_REPARAT,
} from '../oracles/pe-linie.cazuri.ts';

const fara14 = (v: readonly Incalcare[]): Incalcare[] => v.filter((i) => i.invarianta !== 14);
const doar14 = (v: readonly Incalcare[]): Incalcare[] => v.filter((i) => i.invarianta === 14);
const arata = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n');

/** Lanțurile judecate de 14 (i) pe un program (etichetele valide, ca în poartă). */
function lanturi(text: string, ctx: ContextPoarta): ReturnType<typeof lanturiPeLinie> {
  const reg = ctx.regiune!;
  const { evenimente, comentarii } = citeste(text);
  const etichete = comentarii.flatMap((c) => {
    const e = citesteEticheta(c.text);
    if (e === null) return [];
    return [{ linia: c.linia, eticheta: e !== 'stricata' && c.singur && verificaEticheta(reg, e) === null ? e : null }];
  });
  return lanturiPeLinie(evenimente, etichete, (m) => parteaDeTaiere(m, ctx));
}

test('(a) martorul ed5cd65: cercul Ø50 de pe linie e prins pe ambele semicercuri (înainte, ~25 mm); poarta de dinainte nu vedea nimic', () => {
  const ctx = ctx14(docMartor(1));
  const v = poarta(PROGRAM_ED5CD65, ctx);
  assert.deepEqual(fara14(v), [], arata(v));
  const v14 = doar14(v);
  assert.deepEqual(v14.map((i) => i.linia), [...LINII_CERC], arata(v14));
  for (const i of v14) {
    assert.match(i.mesaj, /^pe linie: mișcarea iese de pe calea lui p\/k: punctul .* e la (\d+\.\d+) mm de ea/);
    const d = Number(/e la (\d+\.\d+) mm/.exec(i.mesaj)![1]);
    assert.ok(d > 24.9 && d < 25.1, `${d}`);
  }
  // „De ce nu se vede”: poarta de dinainte (și orice mod mai vechi) nu judecă nimic pe linie.
  assert.deepEqual(poarta(PROGRAM_ED5CD65, ctx, { inainteDe0037: true }), []);
  assert.deepEqual(poarta(PROGRAM_ED5CD65, ctx, { inainteDe0032: true }), []);
});

test('(b) același program, cu cercul înlocuit de un G1: trece toată poarta, iar lanțul (6 mișcări) chiar e judecat', () => {
  assert.notEqual(PROGRAM_REPARAT, PROGRAM_ED5CD65);
  assert.ok(!/G3/.test(PROGRAM_REPARAT));
  const ctx = ctx14(docMartor(1));
  assert.deepEqual(poarta(PROGRAM_REPARAT, ctx), []);
  const l = lanturi(PROGRAM_REPARAT, ctx);
  assert.deepEqual(l.fara, []);
  assert.deepEqual(l.lanturi.map((x) => [x.idLume, x.liniaEtichetei, x.mutari.map((m) => m.linia)]), [['p/k', 11, [13, 14, 15, 16, 17, 18]]]);
});

for (const m of martori14()) {
  test(`(c) martorul negativ ${m.nume}: prins de 14 (i), ${m.sens}, la linia ${m.linia}; poarta de dinainte nu-l vede`, () => {
    const ctx = ctx14(m.doc);
    const v14 = doar14(poarta(m.text, ctx));
    const tipar = m.sens === 'inainte' ? /^pe linie: mișcarea iese de pe calea lui p\/k/ : m.sens === 'acoperire' ? /^pe linie: calea lui p\/k nu e acoperită/ : /^pe linie: eticheta lui p\/k n-are nicio mișcare de tăiere/;
    assert.ok(v14.some((i) => i.linia === m.linia && tipar.test(i.mesaj)), `${m.nume}:\n${arata(v14) || '(nimic)'}`);
    assert.deepEqual(doar14(poarta(m.text, ctx, { inainteDe0037: true })), []);
  });
}

test('(d) cazul cel mai rău legal: biarcele la 0,99 × 0,001 + rotunjirea postului pe arc trec de 0,001 + 0,002, sub TOL_14; poarta îl lasă să treacă', () => {
  const c = celMaiRauArc();
  console.log(`cel mai rău arc: ${c.descriere}; abaterea ${c.abatere.toFixed(6)} mm (0,003 + marja: ${TOL_14})`);
  const ctx = ctx14(c.doc, { latime: 250, inaltime: 250, grosime: 18 });
  assert.deepEqual(poarta(c.text, ctx), []);
  assert.equal(lanturi(c.text, ctx).lanturi.length, 1);
  // Fără marjă, acest program legal ar fi refuzat: abaterea (remăsurată des) trece de cele două toleranțe din contract.
  assert.ok(c.abatere > TOL_BIARCE_14 + TOL_POST_14, `${c.abatere}`);
  assert.ok(c.abatere < TOL_14, `${c.abatere}`);
});

test('(e) două treceri complete (adâncimea 2, pasul 1) trec, cu două lanțuri judecate', () => {
  const ctx = ctx14(docMartor(2));
  const t = douaTreceri(false);
  assert.deepEqual(poarta(t, ctx), []);
  assert.equal(lanturi(t, ctx).lanturi.length, 2);
});

test('(f) granița toleranței: programul mutat cu 0,003 mm trece 14 (i), cel mutat cu 0,004 mm nu', () => {
  const ctx = ctx14(docMartor(1));
  const mutat = (dx: number): string => PROGRAM_REPARAT.split('\n').map((l, k) => (k + 1 > 11 && /^G[0-3] .*X\d/.test(l) ? l.replace(/X(\d+\.\d+)/, (_, x: string) => `X${(Number(x) + dx).toFixed(3)}`) : l)).join('\n');
  assert.deepEqual(doar14(poarta(mutat(0.003), ctx)), []);
  assert.ok(doar14(poarta(mutat(0.004), ctx)).length > 0);
});

test('(g) modul inainteDe0037: pe toate programele de aici, poarta de dinainte dă exact verdictele de acum fără 14', () => {
  const programe: Array<readonly [string, string, ContextPoarta]> = [
    ['ed5cd65', PROGRAM_ED5CD65, ctx14(docMartor(1))],
    ['reparat', PROGRAM_REPARAT, ctx14(docMartor(1))],
    ['două treceri', douaTreceri(false), ctx14(docMartor(2))],
    ...martori14().map((m) => [m.nume, m.text, ctx14(m.doc)] as const),
  ];
  let cu14 = 0;
  for (const [nume, text, ctx] of programe) {
    const nou = poarta(text, ctx), vechi = poarta(text, ctx, { inainteDe0037: true });
    if (doar14(nou).length) cu14++;
    assert.deepEqual(vechi, fara14(nou), nume);
  }
  assert.equal(cu14, 8);
});
