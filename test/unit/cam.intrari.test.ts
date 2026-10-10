/**
 * Intrările și ieșirile pe hârtie (ADR 0030). Geometria se calculează aici din formă: bucla decalată cu raza sculei,
 * direcția de mers din regula sensului (ADR 0027), partea deșeului opusă piesei; apoi se compară cu IR-ul lucrării.
 * Oracolul independent (`test/oracles/intrari.ts`) face aceleași măsurători pe textul G-code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { incepeLa, lungimeBucla, punctLa } from '../../src/cam/parcurgere.ts';
import { arc, conturDreptunghi, LINIE, numarSegmente } from '../../src/geom/contur.ts';
import { baleiajArc, type Miscare } from '../../src/ir/ir.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 12 };
const near = (a: number, b: number, e = 1e-9): boolean => Math.abs(a - b) <= e;
const dr = (id: string, x: number, y: number, w = 100, h = 60) => ({ id, forma: { tip: 'dreptunghi' as const, latime: w, inaltime: h, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, r: number) => ({ id, forma: { tip: 'cerc' as const, raza: r }, matrice: { ...ID, e: 100, f: 100 } });
const cu = (d: Document, id: string, v: Partial<Operatie>): Document => cuOperatie(d, id, { adancime: 6, pas: 3, intrari: { raza: 3 }, ...v });

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

test('exterior în urcare: semicercul pe partea deșeului (stânga mersului), tangent în vârful 0, pe fiecare trecere', () => {
  // Dreptunghiul 100 × 60 la (50, 50), freza Ø6: bucla centrului e decalată cu 3, orar (urcare pe exterior). Vârful 0 e
  // (50, 47), începutul arcului de colț din stânga-jos; acolo mersul e spre −X, deci deșeul (stânga mersului) e −Y.
  const { miscari } = bloc(cu(docDin(F, dr('a', 50, 50)), 'a', {}), 'a/a');
  const t = treceri(miscari);
  assert.equal(t.length, 2, 'două treceri (6 mm în pași de 3)');
  for (const [k, x] of t.entries()) {
    const [rapid, plonjare, intrare] = x;
    assert.deepEqual(rapid, { tip: 'rapida', la: { X: 53, Y: 44 } }, `trecerea ${k}: plonjarea în A = p₀ + ρ(n − t)`);
    assert.deepEqual(plonjare, { tip: 'taiere', la: { Z: -3 * (k + 1) }, avans: 300 });
    assert.deepEqual(intrare, { tip: 'arc', la: { X: 50, Y: 47 }, centru: { x: 50, y: 44 }, sens: 'trigonometric', avans: 1000 });
    const iesire = x[x.length - 1];
    assert.deepEqual(iesire, { tip: 'arc', la: { X: 47, Y: 44 }, centru: { x: 50, y: 44 }, sens: 'trigonometric', avans: 1000 });
    // Bucla e cea de azi: de la p₀ la p₀, orar.
    const penultima = x[x.length - 2];
    assert.ok(penultima?.tip === 'taiere' && penultima.la.X === 50 && penultima.la.Y === 47, 'bucla se întoarce în p₀');
  }
});

test('exterior în opoziție: deșeul e în dreapta mersului, arcele orare, oglindite', () => {
  const { miscari } = bloc(cu(docDin(F, dr('a', 50, 50)), 'a', { sens: 'opozitie' }), 'a/a');
  const [x] = treceri(miscari);
  assert.ok(x);
  if (!x) return;
  assert.deepEqual(x[0], { tip: 'rapida', la: { X: 47, Y: 44 } });
  assert.deepEqual(x[2], { tip: 'arc', la: { X: 50, Y: 47 }, centru: { x: 50, y: 44 }, sens: 'orar', avans: 1000 });
  assert.deepEqual(x[x.length - 1], { tip: 'arc', la: { X: 53, Y: 44 }, centru: { x: 50, y: 44 }, sens: 'orar', avans: 1000 });
});

test('gaura R5: raza 3 nu încape, jumătatea da, spre centrul găurii; gaura R3,6: intrarea omisă, cu avertisment, ca azi', () => {
  // Bucla centrului are raza 2 în jurul lui (100, 100); vârful 0 e (102, 100), mersul în sus (urcare pe interior =
  // trigonometric), deșeul în stânga = spre centru. Cu ρ = 1,5: C = (100,5; 100), A = (100,5; 98,5).
  const { miscari } = bloc(cu(docDin(F, cerc('g', 5)), 'g', { latura: 'interior' }), 'g/g');
  const [x] = treceri(miscari);
  assert.ok(x);
  if (!x) return;
  assert.deepEqual(x[0], { tip: 'rapida', la: { X: 100.5, Y: 98.5 } });
  assert.deepEqual(x[2], { tip: 'arc', la: { X: 102, Y: 100 }, centru: { x: 100.5, y: 100 }, sens: 'trigonometric', avans: 1000 });
  const omisa = bloc(cu(docDin(F, cerc('g', 3.6)), 'g', { latura: 'interior' }), 'g/g');
  assert.deepEqual(omisa.avertismente, ['g/g: intrarea omisă pe bucla 1 (nu încape nicăieri cu raza de 3 mm, 1.5 mm)']);
  const fara = bloc(cuOperatie(docDin(F, cerc('g', 3.6)), 'g', { latura: 'interior', adancime: 6, pas: 3 }), 'g/g');
  assert.deepEqual(omisa.miscari, fara.miscari, 'fără intrare, programul e cel de azi');
});

test('două piese la 7 mm: intrarea din vârful 0 ar mușca din vecina, deci p₀ trece pe mijlocul celei mai lungi laturi', () => {
  // Piesa b (100 × 60 la y = 117) are vârful 0 jos, la 7 mm de piesa a: semicercul de 3 mm (cu discul de 3) ar intra în a.
  // Primul candidat care încape e mijlocul primei laturi de 100 mm, în ordinea buclei: sus, la (100, 180).
  let d = docDin(F, dr('a', 50, 50), dr('b', 50, 117));
  d = cu(cu(d, 'a', {}), 'b', {});
  const { miscari, avertismente } = bloc(d, 'b/b');
  assert.deepEqual(avertismente, []);
  const [x] = treceri(miscari);
  assert.ok(x);
  if (!x) return;
  assert.deepEqual(x[0], { tip: 'rapida', la: { X: 97, Y: 183 } });
  assert.deepEqual(x[2], { tip: 'arc', la: { X: 100, Y: 180 }, centru: { x: 100, y: 183 }, sens: 'trigonometric', avans: 1000 });
  // Discul frezei (R 3) pe semicerc: cel mai jos punct e la y = 180, deci departe de a (sus la 110).
});

test('cu urechi: pozițiile lor se numără de la p₀, care e mereu la adâncime plină', () => {
  let d = docDin({ ...F, grosime: 6 }, dr('a', 50, 50), dr('b', 50, 117));
  d = cu(d, 'a', {});
  d = cu(d, 'b', { urechi: { numar: 2, latime: 8, grosime: 2 } });
  const { miscari } = bloc(d, 'b/b');
  const t = treceri(miscari);
  const ultima = t[t.length - 1];
  assert.ok(ultima);
  if (!ultima) return;
  // Pe ultima trecere (−6, vârful urechii la −4): drumul pe buclă se numără de la capătul intrării, p₀ = (100, 180), până
  // la ieșire; palierele (Z = −4) au centrele la (k + ½)·S, S = P / 2.
  const P = 2 * 100 + 2 * 60 + 2 * Math.PI * 3;
  const S = P / 2;
  const intrare = ultima.findIndex((m) => m.tip === 'arc' && m.la.X === 100 && m.la.Y === 180);
  assert.ok(intrare > 0, 'intrarea se termină în p₀');
  let x = 100, y = 180, z = -6, s = 0;
  const centre: number[] = [];
  let inceputPalier: number | null = null;
  for (const m of ultima.slice(intrare + 1, -1)) {
    if (m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const x1 = m.la.X ?? x, y1 = m.la.Y ?? y, z1 = m.la.Z ?? z;
    const L = m.tip === 'arc'
      ? Math.hypot(x - m.centru.x, y - m.centru.y) * Math.abs(baleiajArc({ x, y }, { x: x1, y: y1 }, m.centru, m.sens === 'trigonometric'))
      : Math.hypot(x1 - x, y1 - y);
    if (z1 === -4 && z === -4 && inceputPalier === null) inceputPalier = s;
    if (inceputPalier !== null && !(z1 === -4 && z === -4)) { centre.push((inceputPalier + s) / 2); inceputPalier = null; }
    s += L;
    x = x1; y = y1; z = z1;
  }
  assert.ok(near(s, P, 1e-6), `bucla are lungimea ${s}, nu ${P}`);
  assert.equal(centre.length, 2, `două paliere: ${centre.join(', ')}`);
  centre.forEach((c, k) => assert.ok(near(c, (k + 0.5) * S, 1e-6), `centrul ${k} la ${c}, nu la ${(k + 0.5) * S}`));
});

test('refuzurile (ADR 0030 §6): pe linie, cu rampă, raza sub 0,5 mm', () => {
  const d = docDin(F, dr('a', 50, 50));
  const motiv = (v: Partial<Operatie>): string => { const r = programDinDocument(cu(d, 'a', v)); return r.ok ? '' : r.motiv; };
  assert.match(motiv({ latura: 'pe-linie' }), /a\/a: intrările cer o parte de deșeu/);
  assert.match(motiv({ rampa: { lungime: 10 } }), /a\/a: intrările nu se compun încă cu rampa \(felia 2\.5c\)/);
  assert.match(motiv({ intrari: { raza: 0.4 } }), /a\/a: raza intrării de 0\.4 mm e sub 0\.5 mm/);
  assert.equal(motiv({ intrari: { raza: 0.5 } }), '');
});

test('bucla pornită dintr-un punct: segmentul se taie (linie în linii, arc în arce pe același cerc), lungimea rămâne', () => {
  const c = conturDreptunghi(0, 0, 100, 50, 10);
  const P = lungimeBucla(c);
  for (const s of [0, 1e-7, 30, 80 + Math.PI * 5 / 2, 95, P - 1e-7, 200]) {
    const r = incepeLa(c, s);
    assert.ok(near(lungimeBucla(r), P, 1e-9), `s = ${s}: lungimea ${lungimeBucla(r)} față de ${P}`);
    const p = punctLa(c, s);
    // Lângă un vârf (sub 1e-6 mm), pornirea e chiar vârful.
    assert.ok(p && near(r.varfuri[0]!.p.x, p.p.x, 1e-6) && near(r.varfuri[0]!.p.y, p.p.y, 1e-6), `s = ${s}: pornirea e punctul de la s`);
  }
  assert.equal(numarSegmente(incepeLa(c, 30)), numarSegmente(c) + 1, 'o linie tăiată în două');
  assert.equal(numarSegmente(incepeLa(c, 1e-7)), numarSegmente(c), 'lângă un vârf, doar rotire');
  const pe = incepeLa({ inchis: true, varfuri: [{ p: { x: 1, y: 0 }, s: arc(1) }, { p: { x: -1, y: 0 }, s: arc(1) }] }, Math.PI / 2);
  assert.ok(near(pe.varfuri[0]!.p.x, 0, 1e-12) && near(pe.varfuri[0]!.p.y, 1, 1e-12), 'pe cerc, mijlocul arcului de sus');
  assert.ok(pe.varfuri.every((v) => v.s.tip === 'A' || v.s === LINIE));
});

test('foaia (condiția b): la 7 mm de marginea de jos, intrarea din vârful 0 ar ieși din foaie, deci p₀ trece pe mijlocul laturii de sus', async () => {
  // Dreptunghiul 100 × 60 la (7, 7): bucla centrului stă în foaie (discul ajunge la y = 1). Intrarea din vârful 0, (7, 4),
  // ar coborî discul la y = −2. Primul candidat care rămâne în foaie: mijlocul primei laturi lungi în ordinea buclei, sus.
  const d = cu(docDin(F, dr('a', 7, 7)), 'a', {});
  const { miscari, avertismente } = bloc(d, 'a/a');
  assert.deepEqual(avertismente, []);
  const [x] = treceri(miscari);
  assert.ok(x);
  if (!x) return;
  assert.deepEqual(x[2], { tip: 'arc', la: { X: 57, Y: 70 }, centru: { x: 57, y: 73 }, sens: 'trigonometric', avans: 1000 });
  // Exportul nu mai cere confirmarea ieșirii din foaie.
  const { iesireDinFoaie } = await import('../../src/cam/iesire.ts');
  const j = programDinDocument(d);
  assert.ok(j.ok && iesireDinFoaie(j.program, F) === null);
});

test('urechile altei bucle (condiția c): intrarea vecinei nu trece la mai puțin de D + 1 mm de bucla cu urechi', async () => {
  // A: 100 × 60 la (50, 50), tăiat prin, cu 2 urechi; B: deasupra, la 13 mm, cu vârful 0 în dreptul unei urechi a lui A.
  // Traseele stau la 7 mm (y 113 și 120). Semicercul din vârful 0 al lui B (ρ = 3, deșeul în jos) coboară până la y = 114,
  // adică la 1 mm de traseul lui A, sub D + 1 = 7 mm: ar tăia legătura urechii. Deci p₀ al lui B se mută.
  const { apropiereContururi } = await import('../../src/geom/apropiere.ts');
  const { profil } = await import('../../src/cam/profil.ts');
  const { conturDreptunghi: drept } = await import('../../src/geom/contur.ts');
  let d = docDin(F, dr('a', 50, 50), dr('b', 65.288, 123));
  d = cuOperatie(d, 'a', { adancime: 12, pas: 4, urechi: { numar: 2, latime: 8, grosime: 2 } });
  d = cu(d, 'b', { adancime: 12, pas: 4 });
  const { miscari, avertismente } = bloc(d, 'b/b');
  assert.deepEqual(avertismente, []);
  const [x] = treceri(miscari);
  assert.ok(x);
  if (!x) return;
  const intrare = x[2];
  assert.ok(intrare?.tip === 'arc');
  if (intrare?.tip !== 'arc') return;
  // p₀ nu mai e vârful 0 al lui B (65,288; 120), iar semicercul ales stă la cel puțin 7 mm de traseul lui A.
  assert.ok(!(near(intrare.la.X ?? 0, 65.288, 1e-6) && near(intrare.la.Y ?? 0, 120, 1e-6)), 'p₀ s-a mutat de pe vârful 0');
  const pa = profil(drept(50, 50, 100, 60), { latura: 'exterior', sens: 'urcare', diametruScula: 6, adancime: 12, pas: 4 });
  assert.ok(pa.ok);
  if (!pa.ok) return;
  const a0 = x[0];
  assert.ok(a0?.tip === 'rapida');
  if (a0?.tip !== 'rapida') return;
  const iesire = x[x.length - 1];
  assert.ok(iesire?.tip === 'arc');
  if (iesire?.tip !== 'arc') return;
  const semi = { inchis: false, varfuri: [{ p: { x: a0.la.X ?? 0, y: a0.la.Y ?? 0 }, s: arc(1) }, { p: { x: iesire.la.X ?? 0, y: iesire.la.Y ?? 0 }, s: LINIE }] };
  assert.ok(apropiereContururi(semi, pa.treceri[0]!.contururi[0]!).distanta >= 7 - 1e-9);
});
