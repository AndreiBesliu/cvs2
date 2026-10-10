/**
 * Intrările cu rampă pe hârtie (ADR 0031): pe o buclă cu intrare, fiecare trecere coboară prin aer în A până la fața de
 * sus, apoi pe sfertul intrării, ca elice, până la adâncimea ei; bucla și ieșirea sunt cele din ADR 0030. Geometria (A, p₀,
 * C) e cea socotită pe hârtie în `cam.intrari.test.ts`; aici se compară forma trecerilor și avansul elicei, scris din
 * formulă, nu din cod.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { razeIncercate } from '../../src/cam/intrari.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 12 };
const dr = (id: string, x: number, y: number, w = 100, h = 60) => ({ id, forma: { tip: 'dreptunghi' as const, latime: w, inaltime: h, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, r: number) => ({ id, forma: { tip: 'cerc' as const, raza: r }, matrice: { ...ID, e: 100, f: 100 } });
const cu = (d: Document, id: string, v: Partial<Operatie>): Document =>
  cuOperatie(d, id, { adancime: 6, pas: 3, intrari: { raza: 3 }, rampa: { lungime: 10 }, ...v });

/** Mișcările de după eticheta lui `id`, până la următoarea etichetă. */
function bloc(d: Document, idLume: string): { miscari: Miscare[]; avertismente: readonly string[] } {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return { miscari: [], avertismente: [] };
  const i = j.program.miscari.findIndex((m) => m.tip === 'eticheta' && m.element === idLume);
  const urm = j.program.miscari.findIndex((m, k) => k > i && m.tip === 'eticheta');
  return { miscari: j.program.miscari.slice(i + 1, urm < 0 ? undefined : urm), avertismente: j.avertismente };
}

/** Trecerile unui bloc: de la rapidul XY până la ridicarea de după tăiere. */
function treceri(m: readonly Miscare[]): Miscare[][] {
  const rez: Miscare[][] = [];
  for (const x of m) {
    if (x.tip === 'rapida' && x.la.X !== undefined) rez.push([x]);
    else if (rez.length && !(x.tip === 'rapida' && x.la.Z !== undefined && x.la.Z > 0)) (rez[rez.length - 1] as Miscare[]).push(x);
  }
  return rez;
}

/** Avansul elicei, pe hârtie: pe verticală cel mult avansul de plonjare (300), din regimul implicit (1000 / 300). */
const avansElice = (rho: number, d: number): number => Math.min(1000, (300 * Math.hypot((Math.PI * rho) / 2, d)) / d);

test('exterior în urcare: fiecare trecere coboară prin aer în A până la Z0, apoi pe intrare, ca elice, până la −d_k', () => {
  // Dreptunghiul 100 × 60 la (50, 50), Ø6: A = (53, 44), p₀ = (50, 47), C = (50, 44), B = (47, 44), trigonometric.
  const d = cu(docDin(F, dr('a', 50, 50)), 'a', {});
  const { miscari, avertismente } = bloc(d, 'a/a');
  assert.deepEqual(avertismente, []);
  const t = treceri(miscari);
  assert.equal(t.length, 2, 'două treceri (6 mm în pași de 3), fiecare cu ridicarea ei');
  for (const [k, x] of t.entries()) {
    const z = -3 * (k + 1);
    assert.deepEqual(x[0], { tip: 'rapida', la: { X: 53, Y: 44 } }, `trecerea ${k}: deasupra lui A`);
    assert.deepEqual(x[1], { tip: 'taiere', la: { Z: 0 }, avans: 300 }, `trecerea ${k}: prin aer, până la fața de sus`);
    const intrare = x[2];
    assert.ok(intrare?.tip === 'arc');
    if (intrare?.tip !== 'arc') return;
    assert.deepEqual({ ...intrare, avans: 0 }, { tip: 'arc', la: { X: 50, Y: 47, Z: z }, centru: { x: 50, y: 44 }, sens: 'trigonometric', avans: 0 });
    assert.ok(Math.abs(intrare.avans - avansElice(3, -z)) < 1e-9, `trecerea ${k}: avansul elicei ${intrare.avans}, nu ${avansElice(3, -z)}`);
    assert.deepEqual(x[x.length - 1], { tip: 'arc', la: { X: 47, Y: 44 }, centru: { x: 50, y: 44 }, sens: 'trigonometric', avans: 1000 });
  }
  // Pe hârtie: 558,6 și 381,5 mm/min.
  assert.ok(Math.abs(avansElice(3, 3) - 558.6) < 0.1 && Math.abs(avansElice(3, 6) - 381.5) < 0.1);
});

test('bucla și ieșirea de la fiecare trecere sunt cele din ADR 0030 (fără rampă), și cu urechi', () => {
  for (const v of [{}, { adancime: 12, pas: 4, urechi: { numar: 2, latime: 8, grosime: 2 } }] as const) {
    const cuR = treceri(bloc(cu(docDin(F, dr('a', 50, 50)), 'a', v), 'a/a').miscari);
    const faraR = treceri(bloc(cu(docDin(F, dr('a', 50, 50)), 'a', { ...v, rampa: null }), 'a/a').miscari);
    assert.equal(cuR.length, faraR.length);
    for (const [k, x] of cuR.entries()) {
      assert.deepEqual(x.slice(3), faraR[k]?.slice(3), `trecerea ${k}: de la p₀ la B`);
      assert.deepEqual(x[0], faraR[k]?.[0], `trecerea ${k}: același A`);
    }
  }
});

test('gaura R5: raza 3 nu încape, jumătatea (sfertul de 2,36 mm) da; elicea pe cercul de 1,5', () => {
  const { miscari } = bloc(cu(docDin(F, cerc('g', 5)), 'g', { latura: 'interior' }), 'g/g');
  const [x] = treceri(miscari);
  assert.ok(x);
  if (!x) return;
  assert.deepEqual(x[0], { tip: 'rapida', la: { X: 100.5, Y: 98.5 } });
  const intrare = x[2];
  assert.ok(intrare?.tip === 'arc');
  if (intrare?.tip !== 'arc') return;
  assert.deepEqual(intrare.la, { X: 102, Y: 100, Z: -3 });
  assert.deepEqual(intrare.centru, { x: 100.5, y: 100 });
  assert.ok(Math.abs(intrare.avans - avansElice(1.5, 3)) < 1e-9);
});

test('intrarea omisă: bucla se taie cu rampa din ADR 0029, de la vârful 0, iar avertismentul pomenește razele încercate', () => {
  const omisa = bloc(cu(docDin(F, cerc('g', 3.6)), 'g', { latura: 'interior' }), 'g/g');
  assert.deepEqual(omisa.avertismente, ['g/g: intrarea omisă pe bucla 1 (nu încape nicăieri cu raza de 3 mm, 1.5 mm)']);
  const rampa = bloc(cu(docDin(F, cerc('g', 3.6)), 'g', { latura: 'interior', intrari: null }), 'g/g');
  assert.deepEqual(omisa.miscari, rampa.miscari);
  // Raza 1: jumătatea (0,5) are sfertul de 0,785 mm, sub rampa minimă, deci nu se încearcă.
  const r1 = bloc(cu(docDin(F, cerc('g', 3.6)), 'g', { latura: 'interior', intrari: { raza: 1 } }), 'g/g');
  assert.deepEqual(r1.avertismente, ['g/g: intrarea omisă pe bucla 1 (nu încape nicăieri cu raza de 1 mm)']);
});

test('razele sub rampă (ADR 0031 §2): jumătatea doar cu sfertul de cel puțin 1 mm; fără rampă, ca în ADR 0030', () => {
  assert.deepEqual(razeIncercate(3, true), [3, 1.5]);
  assert.deepEqual(razeIncercate(1, true), [1]);
  assert.deepEqual(razeIncercate(1), [1, 0.5]);
  // Pragul: sfertul jumătății are exact 1 mm la raza 4/π.
  assert.deepEqual(razeIncercate(4 / Math.PI, true), [4 / Math.PI, 2 / Math.PI]);
  assert.deepEqual(razeIncercate(1.27, true), [1.27]);
});

test('refuzurile: raza prea mică pentru rampă, rampa sub 1 mm (și când toate buclele au intrare), pe linie', () => {
  const d = docDin(F, dr('a', 50, 50));
  const motiv = (v: Partial<Operatie>): string => { const r = programDinDocument(cu(d, 'a', v)); return r.ok ? '' : r.motiv; };
  assert.equal(motiv({ intrari: { raza: 0.6 } }),
    'a/a: raza intrării de 0.6 mm e prea mică pentru rampă: sfertul ei de cerc are 0.942 mm, sub 1 mm');
  assert.equal(motiv({ intrari: { raza: 0.6 }, rampa: null }), '', 'fără rampă, 0,6 mm e o rază bună');
  assert.equal(motiv({ intrari: { raza: 0.64 } }), '', 'sfertul de 1,005 mm');
  assert.equal(motiv({ rampa: { lungime: 0.5 } }), 'a/a: rampa de 0.5 mm e sub 1 mm: ar fi o plonjare');
  assert.match(motiv({ latura: 'pe-linie' }), /a\/a: intrările cer o parte de deșeu/);
  assert.match(motiv({ intrari: { raza: 0.4 } }), /a\/a: raza intrării de 0\.4 mm e sub 0\.5 mm/);
});
