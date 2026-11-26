/**
 * Toleranțele cotelor (ADR 0330, felia 10.4↑e-1), pe hârtie: abaterea de sus și cea de jos ale unei cote, scrise după cifră
 * („100 ±0,1”, „100 +0,2 -0,1”), în unitatea cotei (mm, cm, inch, fracții; la unghi, grade), cu unitatea după toleranță și
 * prefixul razei înaintea cifrei; în locul lui `<>` din textul omului; judecata ușii; comanda; programul neatins.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './limbi.ts';
import { entitatiCote, geometrieCota } from '../../src/io/coteExport.ts';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import { cotaCuToleranta, tolerantaCota } from '../../src/model/cote.ts';
import { cifraCuToleranta, formatImplicit, scrieToleranta, STIL_IMPLICIT, textCota, type FormatCifre } from '../../src/model/desenCota.ts';
import type { Cota, Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { cifreDinFont } from '../../src/text/cifreCote.ts';
import { citesteFont } from '../../src/text/font.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';

const F: FormatCifre = formatImplicit(true);
const COTA: Cota = { id: 'c1', fel: 'orizontala', puncte: [{ x: 20, y: 20 }, { x: 120, y: 20 }], linie: { d: -10 } };

test('simetrică: „±” și abaterea; cu abateri: întâi cea de sus, apoi cea de jos, cu semnele lor; zero fără semn', () => {
  assert.equal(scrieToleranta('orizontala', { sus: 0.1, jos: -0.1 }, F), ' ±0,1');
  assert.equal(scrieToleranta('orizontala', { sus: 0.2, jos: -0.1 }, F), ' +0,2 -0,1');
  assert.equal(scrieToleranta('orizontala', { sus: 0, jos: -0.2 }, F), ' 0 -0,2');
  assert.equal(scrieToleranta('orizontala', { sus: 0.3, jos: 0.1 }, F), ' +0,3 +0,1');
  assert.equal(scrieToleranta('orizontala', { sus: -0.1, jos: -0.3 }, F), ' -0,1 -0,3');
  // Cu punctul și cu zerourile păstrate (2 zecimale).
  assert.equal(scrieToleranta('orizontala', { sus: 0.05, jos: -0.05 }, { ...F, virgula: false, zerouri: 'pastrate' }), ' ±0.05');
  // Pasul de rotunjire al cifrei nu atinge toleranța (0,1 cu pasul 0,5 rămâne 0,1).
  assert.equal(scrieToleranta('orizontala', { sus: 0.1, jos: -0.1 }, { ...F, pas: 0.5 }), ' ±0,1');
});

test('în unitatea cotei: cm, inch, fracții; la unghi, în grade (zecimale sau grade-minute-secunde)', () => {
  assert.equal(scrieToleranta('aliniata', { sus: 0.5, jos: -0.5 }, { ...F, unitate: 'cm' }), ' ±0,05');
  assert.equal(scrieToleranta('aliniata', { sus: 0.254, jos: -0.254 }, { ...F, unitate: 'inch', zecimale: 3 }), ' ±0,01');
  assert.equal(scrieToleranta('aliniata', { sus: 25.4 / 64, jos: -25.4 / 32 }, { ...F, unitate: 'fractii', fractie: 64 }), ' +1/64 -1/32');
  assert.equal(scrieToleranta('unghi', { sus: 0.5, jos: -0.5 }, F), ' ±0,5°');
  assert.equal(scrieToleranta('unghi', { sus: 0.5, jos: -0.25 }, { ...F, unghi: 'gms', zecimaleUnghi: 0 }), ' +0°30′0″ -0°15′0″');
});

test('cifra cotei cu toleranța: după cifră și înaintea unității; prefixul razei rămâne în față; fără toleranță, cifra de azi', () => {
  const tol = (c: Cota): Cota => ({ ...c, toleranta: { sus: 0.1, jos: -0.1 } });
  assert.equal(cifraCuToleranta(COTA, 100, F), '100');
  assert.equal(cifraCuToleranta(tol(COTA), 100, F), '100 ±0,1');
  assert.equal(cifraCuToleranta(tol(COTA), 100, { ...F, cuUnitate: true }), '100 ±0,1 mm');
  assert.equal(cifraCuToleranta(tol({ ...COTA, fel: 'raza' }), 10, F), 'R10 ±0,1');
  assert.equal(cifraCuToleranta(tol({ ...COTA, fel: 'diametru' }), 20, { ...F, cuUnitate: true, unitate: 'cm' }), 'Ø2 ±0,01 cm');
  assert.equal(cifraCuToleranta(tol({ ...COTA, fel: 'unghi' }), 30, F), '30° ±0,1°');
  // În textul omului, toleranța stă cu cifra, în locul lui `<>`.
  assert.equal(textCota({ ...tol(COTA), text: 'L = <>' }, cifraCuToleranta(tol(COTA), 100, F)), 'L = 100 ±0,1');
  // O toleranță stricată (a unei versiuni mai noi, sau scrisă de mână) nu se desenează.
  assert.equal(cifraCuToleranta({ ...COTA, toleranta: { sus: -1, jos: 1 } }, 100, F), '100');
  assert.equal(cifraCuToleranta({ ...COTA, toleranta: 'mult' }, 100, F), '100');
});

test('citită și pusă: valori finite, în ±100, cea de sus nu sub cea de jos; nulă, scoasă din cotă', () => {
  assert.deepEqual(tolerantaCota({ ...COTA, toleranta: { sus: 0.2, jos: -0.1 } }), { sus: 0.2, jos: -0.1 });
  for (const t of [{ sus: -0.1, jos: 0.1 }, { sus: 101, jos: 0 }, { sus: 0, jos: -100.5 }, { sus: Number.NaN, jos: 0 }, { sus: 1 }, null, 3]) {
    assert.equal(tolerantaCota({ ...COTA, toleranta: t }), null, JSON.stringify(t));
  }
  assert.equal(tolerantaCota({ ...COTA, toleranta: { sus: 0, jos: 0 } }), null, 'zero și zero: fără toleranță');
  const pusa = cotaCuToleranta(COTA, { sus: 0.1, jos: -0.1 });
  assert.deepEqual(pusa.toleranta, { sus: 0.1, jos: -0.1 });
  assert.deepEqual(COTA.toleranta, undefined, 'cota dată rămâne neatinsă');
  assert.equal(Object.hasOwn(cotaCuToleranta(pusa, null), 'toleranta'), false);
  assert.equal(Object.hasOwn(cotaCuToleranta(pusa, { sus: 0, jos: 0 }), 'toleranta'), false);
});

const caz = CORPUS_CAM.find((c) => c.id === 'placa-01');
if (!caz) throw new Error('placa 1');
function cuCote(doc: Document, cote: readonly unknown[]): ReturnType<typeof incarca> {
  const brut = JSON.parse(JSON.stringify(doc)) as { foi: Record<string, unknown>[] };
  brut.foi = brut.foi.map((f, k) => (k === 0 ? { ...f, cote } : f));
  return incarca(brut);
}

test('ușa: o toleranță bună trece; una stricată pe un fel cunoscut oprește documentul, cu motivul; pe un fel necunoscut, neatinsă', () => {
  assert.ok(cuCote(caz.doc, [{ ...COTA, toleranta: { sus: 0.2, jos: -0.1 } }]).ok);
  for (const [t, motiv] of [
    [{ sus: -0.1, jos: 0.1 }, /toleranta/],
    [{ sus: 0.1 }, /toleranta/],
    [{ sus: 1000, jos: 0 }, /toleranta/],
    ['±0,1', /toleranta/],
  ] as const) {
    const u = cuCote(caz.doc, [{ ...COTA, toleranta: t }]);
    assert.ok(!u.ok, JSON.stringify(t));
    assert.match(u.ok ? '' : u.motiv, motiv);
  }
  assert.ok(cuCote(caz.doc, [{ id: 'c9', fel: 'altceva', toleranta: 'oricum' }]).ok);
});

test('programul: o cotă cu toleranță nu se taie (aceiași octeți ca fără cote)', async () => {
  const p = caz.parametri[0]!;
  const e0 = await calculeazaExportul(caz.doc, p);
  const u = cuCote(caz.doc, [{ ...COTA, toleranta: { sus: 0.2, jos: -0.1 }, text: 'L = <>' }]);
  assert.ok(u.ok && e0.ok);
  const e1 = await calculeazaExportul(u.doc, p);
  assert.ok(e1.ok);
  assert.equal(e1.program.text, e0.program.text);
  assert.deepEqual(e1.fisiere.map((x) => x.sha256), e0.fisiere.map((x) => x.sha256));
});

test('exportul și desenul cotei: cifra cu toleranța, ca text și ca trăsături; fontul cifrelor are toate semnele ei', () => {
  const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/relief-singleline.ttf', import.meta.url))));
  if (!r.ok) throw new Error('fontul cifrelor');
  const cifre = cifreDinFont(r.font);
  for (const [t, asteptat] of [[{ sus: 0.1, jos: -0.1 }, '100 ±0,1'], [{ sus: 0.2, jos: -0.1 }, '100 +0,2 -0,1']] as const) {
    const u = cuCote(caz.doc, [{ ...COTA, toleranta: t }]);
    assert.ok(u.ok);
    const ca = entitatiCote(u.doc, 0, { stil: STIL_IMPLICIT, format: F, ca: 'text' });
    assert.deepEqual(ca.entitati.filter((e) => e.fel === 'text').map((e) => e.fel === 'text' ? e.text : ''), [asteptat]);
    assert.equal(ca.definitii[0]?.text, asteptat, 'textul scris al cotei DIMENSION');
    const texte: string[] = [];
    const g = geometrieCota(u.doc, 0, 'c1', { stil: STIL_IMPLICIT, format: F, cifre: (s, h) => { texte.push(s); return cifre(s, h); } });
    assert.ok(g);
    assert.deepEqual(texte, [asteptat], '„Fă desen din cotă” desenează cifra cu toleranța');
    assert.deepEqual(g.lipsa, [], `semnele lui „${asteptat}”`);
  }
});
