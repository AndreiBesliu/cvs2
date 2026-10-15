/**
 * Tăietura pe o parte a unei căi deschise (ADR 0037 §3, §5–§7, §10; felia 2.3c-5), pe valorile scrise pe hârtie. Freza Ø6
 * (R = 3), o trecere de 3 mm, Z sigur 5, F1000, plonjarea F300, foaia 300 × 200 × 18, originea stânga-jos.
 * - Hârtia 1: linia, pe stânga și pe dreapta, la urcare și în opoziție (tabelul sensului, §6).
 * - Hârtia 3: semicercul; hârtia 4: L-ul (colțul convex cu arcul R3, colțul concav); hârtia 9: oglindirea (XOR).
 * - Hârtiile 10–12: regiunea cu pereții (§10).
 * - Peretele neatins (§10, precizarea 2.3c-5): un singur avertisment, doar peste D.
 * - Sensul pe modelul așchiei (§6): la urcare, τ × v > 0, cu v de la perete la centrul frezei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, FormaDoc, Operatie, VarfDoc } from '../../src/model/document.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 18 };
const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' } as const;

const deschisa = (...pct: Array<readonly [number, number]>): FormaDoc => ({
  tip: 'cale', inchis: false, varfuri: pct.map(([x, y]): VarfDoc => ({ p: P(x, y), s: L })),
});
const element = (id: string, forma: FormaDoc, x: number, y: number, m: { readonly a?: number; readonly d?: number } = {}) =>
  ({ id, forma, matrice: { ...ID, ...m, e: x, f: y } });
const peParte = (d: Document, id: string, latura: 'stanga' | 'dreapta', v: Partial<Omit<Operatie, 'id' | 'tip'>> = {}): Document =>
  cuOperatie(d, id, { latura, adancime: 3, pas: 3, ...v });

function program(d: Document): { miscari: Miscare[]; avertismente: readonly string[] } {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  return j.ok ? { miscari: [...j.program.miscari], avertismente: j.avertismente } : { miscari: [], avertismente: [] };
}
function refuz(d: Document): string {
  const j = programDinDocument(d);
  assert.equal(j.ok, false, 'trebuia refuzat');
  return j.ok ? '' : j.motiv;
}
function aleLui(m: readonly Miscare[], idLume: string): Miscare[] {
  const i = m.findIndex((x) => x.tip === 'eticheta' && x.element === idLume);
  assert.ok(i >= 0, `fără eticheta lui ${idLume}`);
  const j = m.findIndex((x, k) => k > i && x.tip === 'eticheta');
  return m.slice(i + 1, j < 0 ? undefined : j);
}

const Z5: Miscare = { tip: 'rapida', la: { Z: 5 } };
const g0 = (X: number, Y: number): Miscare => ({ tip: 'rapida', la: { X, Y } });
const plonjare = (Z: number): Miscare => ({ tip: 'taiere', la: { Z }, avans: 300 });
const g1 = (X: number, Y: number): Miscare => ({ tip: 'taiere', la: { X, Y }, avans: 1000 });

/** Coordonatele mișcărilor rotunjite la 1e-9, ca să se compare cu valorile de pe hârtie. */
function rotunjite(m: readonly Miscare[]): Miscare[] {
  const r = (x: number): number => Math.round(x * 1e9) / 1e9 + 0;
  return m.map((x) => {
    if (!('la' in x)) return x;
    const la = Object.fromEntries(Object.entries(x.la).map(([k, v]) => [k, r(v as number)]));
    return x.tip === 'arc' ? { ...x, la, centru: { x: r(x.centru.x), y: r(x.centru.y) } } : { ...x, la } as Miscare;
  });
}

test('hârtia 1: linia (10,50)→(110,50), pe stânga la Y53 și pe dreapta la Y47; sensul după tabel (§6)', () => {
  const d = docDin(F, element('l', deschisa([0, 0], [100, 0]), 10, 50));
  const caz = (latura: 'stanga' | 'dreapta', sens: 'urcare' | 'opozitie'): Miscare[] =>
    rotunjite(aleLui(program(peParte(d, 'l', latura, { sens })).miscari, 'l/l'));
  assert.deepEqual(caz('stanga', 'urcare'), [Z5, g0(10, 53), plonjare(-3), g1(110, 53), Z5]);
  assert.deepEqual(caz('stanga', 'opozitie'), [Z5, g0(110, 53), plonjare(-3), g1(10, 53), Z5]);
  assert.deepEqual(caz('dreapta', 'urcare'), [Z5, g0(110, 47), plonjare(-3), g1(10, 47), Z5]);
  assert.deepEqual(caz('dreapta', 'opozitie'), [Z5, g0(10, 47), plonjare(-3), g1(110, 47), Z5]);
  // Eticheta poartă latura din document (ADR 0037 §13).
  const j = programDinDocument(peParte(d, 'l', 'stanga'));
  assert.ok(j.ok);
  if (!j.ok) return;
  const r = posteaza(j.program, { foaie: F, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
  assert.ok(r.ok);
  if (r.ok) assert.match(r.text, /\(l\/l: cale, stanga, 3 mm\)\nG0 X10\.000 Y53\.000\nG1 Z-3\.000 F300\.0\nG1 X110\.000 Y53\.000 F1000\.0\nG0 Z5\.000\n/);
});

test('sensul pe modelul așchiei: la urcare τ × v > 0 (v = de la perete la centrul frezei), în opoziție < 0, pe ambele părți', () => {
  const d = docDin(F, element('l', deschisa([0, 0], [100, 0]), 10, 50));
  for (const latura of ['stanga', 'dreapta'] as const) {
    for (const sens of ['urcare', 'opozitie'] as const) {
      const m = aleLui(program(peParte(d, 'l', latura, { sens })).miscari, 'l/l');
      const start = m[1], cap = m[3];
      assert.ok(start && cap && 'la' in start && 'la' in cap);
      if (!('la' in start) || !('la' in cap)) continue;
      const tau = { x: (cap.la.X ?? 0) - (start.la.X ?? 0), y: (cap.la.Y ?? 0) - (start.la.Y ?? 0) };
      const v = { x: 0, y: (start.la.Y ?? 0) - 50 };
      const cruce = tau.x * v.y - tau.y * v.x;
      assert.ok(sens === 'urcare' ? cruce > 0 : cruce < 0, `${latura}, ${sens}: τ × v = ${cruce}`);
    }
  }
});

test('hârtia 3: semicercul R50 trigonometric, în (100,100): stânga = R47 în sensul desenului (G3), dreapta = R53 invers (G2)', () => {
  const semicerc: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: P(50, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-50, 0), s: L }] };
  const d = docDin(F, element('s', semicerc, 100, 100));
  assert.deepEqual(rotunjite(aleLui(program(peParte(d, 's', 'stanga')).miscari, 's/s')), [
    Z5, g0(147, 100), plonjare(-3), { tip: 'arc', la: { X: 53, Y: 100 }, centru: P(100, 100), sens: 'trigonometric', avans: 1000 }, Z5,
  ]);
  assert.deepEqual(rotunjite(aleLui(program(peParte(d, 's', 'dreapta')).miscari, 's/s')), [
    Z5, g0(47, 100), plonjare(-3), { tip: 'arc', la: { X: 153, Y: 100 }, centru: P(100, 100), sens: 'orar', avans: 1000 }, Z5,
  ]);
});

test('hârtia 4: L-ul în (20,20): dreapta + opoziție ocolește colțul convex cu arcul R3; stânga lasă colțul concav, fără avertisment', () => {
  const d = docDin(F, element('l', deschisa([0, 0], [100, 0], [100, 100]), 20, 20));
  assert.deepEqual(rotunjite(aleLui(program(peParte(d, 'l', 'dreapta', { sens: 'opozitie' })).miscari, 'l/l')), [
    Z5, g0(20, 17), plonjare(-3), g1(120, 17), { tip: 'arc', la: { X: 123, Y: 20 }, centru: P(120, 20), sens: 'trigonometric', avans: 1000 }, g1(123, 120), Z5,
  ]);
  const st = program(peParte(d, 'l', 'stanga'));
  assert.deepEqual(rotunjite(aleLui(st.miscari, 'l/l')), [Z5, g0(20, 23), plonjare(-3), g1(117, 23), g1(117, 120), Z5]);
  // Colțul concav de 90° lasă câte R pe fiecare latură (6 mm = D): rotunjirea colțului, ca la un profil închis, nespusă.
  assert.deepEqual(st.avertismente, []);
});

test('hârtia 9: oglindirea (a = −1, e = 150, f = 50), linia (0,0)→(100,0), stânga + urcare: G0 X50 Y53 · G1 X150 Y53 (XOR)', () => {
  const d = docDin(F, element('l', deschisa([0, 0], [100, 0]), 150, 50, { a: -1 }));
  assert.deepEqual(rotunjite(aleLui(program(peParte(d, 'l', 'stanga')).miscari, 'l/l')), [Z5, g0(50, 53), plonjare(-3), g1(150, 53), Z5]);
});

test('cârligul (stânga): o bucată până la x = 45 − 2√2 și un singur avertisment de perete neatins, de 14,828 mm', () => {
  const d = docDin(F, element('c', deschisa([0, 0], [50, 0], [50, 2], [45, 2]), 50, 50));
  const r = program(peParte(d, 'c', 'stanga'));
  const m = rotunjite(aleLui(r.miscari, 'c/c'));
  assert.deepEqual(m.slice(0, 3), [Z5, g0(50, 53), plonjare(-3)]);
  const capat = m[3];
  assert.ok(capat && 'la' in capat);
  if (capat && 'la' in capat) assert.ok(Math.abs((capat.la.X ?? 0) - (95 - 2 * Math.SQRT2)) < 1e-6);
  assert.equal(r.avertismente.length, 1);
  assert.match(r.avertismente[0] ?? '', /^c\/c: freza nu ajunge la o porțiune a peretelui, de 14\.828 mm, lângă X 99\.586, Y 50\.000: acolo rămâne material lipit de perete$/);
});

test('U-ul de 5 mm cu scula înăuntru: refuz „scula nu încape pe partea cerută”', () => {
  const d = docDin(F, element('u', deschisa([0, 50], [0, 0], [5, 0], [5, 50]), 50, 50));
  assert.equal(refuz(peParte(d, 'u', 'stanga')), 'u/u: scula nu încape pe partea cerută');
});

/** O piesă 100 × 100 în (100, 50), tăiată pe exterior, și o linie. */
const cuPiesa = (linie: FormaDoc, x: number, y: number): Document =>
  cuOperatie(docDin(F, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 50 } }, element('l', linie, x, y)), 'r', { latura: 'exterior', adancime: 3, pas: 3 });

test('hârtia 10: linia paralelă cu latura piesei, la 5 mm: spre piesă intră cu 1,000 mm; pe partea cealaltă o atinge profilul piesei', () => {
  const d = cuPiesa(deschisa([0, 0], [80, 0]), 110, 45);
  assert.match(refuz(peParte(d, 'l', 'stanga')), /^regiunea păstrată: tăietura lui l\/l intră în piesa r\/r cu 1\.000 mm/);
  // Precizarea 2.3c-5: cu freza pe partea cealaltă, linia trece, dar fâșia de 5 mm e mai îngustă decât D, deci profilul
  // exterior al piesei (la R de latura ei) vine la 2 mm de perete: refuz, pe peretele promis.
  assert.match(refuz(peParte(d, 'l', 'dreapta')), /^regiunea păstrată: tăietura lui r\/r atinge peretele lui l\/l cu 1\.000 mm/);
  // La 9 mm (D + 3), ambele trec: pe stânga discul se oprește la 3 mm de piesă.
  const departe = cuPiesa(deschisa([0, 0], [80, 0]), 110, 41);
  program(peParte(departe, 'l', 'stanga'));
  program(peParte(departe, 'l', 'dreapta'));
});

test('hârtia 11: linia perpendiculară pe latura piesei, oprită la 1 mm de ea, pe o parte: discul de la capăt intră cu 2,000 mm', () => {
  const d = cuPiesa(deschisa([0, 0], [49, 0]), 50, 100);
  for (const latura of ['stanga', 'dreapta'] as const) {
    assert.match(refuz(peParte(d, 'l', latura)), /^regiunea păstrată: tăietura lui l\/l intră în piesa r\/r cu 2\.000 mm/);
  }
});

test('hârtia 12: două linii pe o parte: X-ul se refuză; lanțul convex trece (capătul la exact R de vârful comun); cel concav, refuz', () => {
  const doua = (a: FormaDoc, b: FormaDoc, la: 'stanga' | 'dreapta'): Document =>
    peParte(peParte(docDin(F, element('a', a, 50, 50), element('b', b, 50, 50)), 'a', la), 'b', la);
  assert.match(refuz(doua(deschisa([0, 50], [100, 50]), deschisa([50, 0], [50, 100]), 'stanga')), /^regiunea păstrată: tăietura lui a\/a atinge peretele lui b\/b/);
  // Lanțul (0,0)→(50,0) apoi (50,0)→(50,50): cotitura e spre stânga, deci colțul convex e în dreapta.
  program(doua(deschisa([0, 0], [50, 0]), deschisa([50, 0], [50, 50]), 'dreapta'));
  assert.match(refuz(doua(deschisa([0, 0], [50, 0]), deschisa([50, 0], [50, 50]), 'stanga')), /^regiunea păstrată: tăietura lui a\/a atinge peretele lui b\/b cu cel puțin 3\.000 mm/);
});

test('despărțirea marcată pe o parte: prin foaie, de la o margine la alta, în afara pieselor, se taie la urmă', () => {
  const d = peParte(docDin(F, element('s', deschisa([0, 0], [300, 0]), 0, 100)), 's', 'stanga', { adancime: 18, pas: 6, despartire: true });
  program(d);
  // Nemarcată, ajunge la marginea foii: refuz (decizia owner-ului, 13.10).
  assert.match(refuz(peParte(d, 's', 'stanga', { adancime: 18, pas: 6, despartire: false })), /^s\/s: tăietura deschisă prin foaie ajunge la marginea foii/);
});
