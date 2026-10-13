/**
 * Căile deschise în CAM (ADR 0037, sub-felia 2.3c-2), pe valori scrise pe hârtie. Freza Ø6 (R = 3), Z sigur 5, F1000,
 * plonjarea F300, foaia 300 × 200 × 18, originea stânga-jos.
 * - §4 / §7: pe linie, freza merge pe cale din vârful 0 până la celălalt capăt, cu plonjarea verticală în vârful 0 la
 *   fiecare trecere și ridicarea la capăt; nicio coardă de închidere, niciun zig-zag, sensul nu schimbă nimic.
 * - §9: refuzurile (laturile nepotrivite, stânga / dreapta până la 2.3c-5, urechile, rampa, intrările și degajările pe o
 *   operație cu căi deschise, calea degenerată).
 * - §8: ordinea (despărțirile la urmă), judecata marcajului, refuzul tăieturii deschise nemarcate care ajunge la margine.
 * - §10: avertismentele (pe linie prin foaie într-o piesă, bucata liberă), cu programul neschimbat.
 * - „Ce am măsurat” 6: parcurgerea și rampa nu trec de la ultimul vârf la segmentul 0 pe o cale deschisă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seTaieSingura } from '../../src/cam/deschise.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { bucataBuclei, parcurge } from '../../src/cam/parcurgere.ts';
import { buclaCuRampa } from '../../src/cam/rampa.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { LINIE, type Contur } from '../../src/geom/contur.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { operatieImplicita, type Document, type FormaDoc, type Operatie, type VarfDoc } from '../../src/model/document.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { laturiOferite } from '../../src/ui/actiuniExportTipuri.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 18 };
const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' } as const;
const DREPTUNGHI: FormaDoc = { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 };

/** O cale deschisă din puncte, cu linii. */
const deschisa = (...pct: Array<readonly [number, number]>): FormaDoc => ({
  tip: 'cale', inchis: false, varfuri: pct.map(([x, y]): VarfDoc => ({ p: P(x, y), s: L })),
});
/** Un element pe foaie (piesă cu o instanță, id-ul în lume `<id>/<id>`), cu operația dată. */
const element = (id: string, forma: FormaDoc, x: number, y: number) => ({ id, forma, matrice: { ...ID, e: x, f: y } });
const peLinie = (d: Document, id: string, v: Partial<Omit<Operatie, 'id' | 'tip'>> = {}): Document =>
  cuOperatie(d, id, { latura: 'pe-linie', adancime: 3, pas: 3, ...v });

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
/** Mișcările tăieturii elementului `id` (de după eticheta lui, până la următoarea). */
function aleLui(m: readonly Miscare[], idLume: string): Miscare[] {
  const i = m.findIndex((x) => x.tip === 'eticheta' && x.element === idLume);
  assert.ok(i >= 0, `fără eticheta lui ${idLume}`);
  const j = m.findIndex((x, k) => k > i && x.tip === 'eticheta');
  return m.slice(i + 1, j < 0 ? undefined : j);
}
const etichete = (m: readonly Miscare[]): string[] => m.flatMap((x) => (x.tip === 'eticheta' ? [x.element ?? ''] : []));

const Z5: Miscare = { tip: 'rapida', la: { Z: 5 } };
const g0 = (X: number, Y: number): Miscare => ({ tip: 'rapida', la: { X, Y } });
const plonjare = (Z: number): Miscare => ({ tip: 'taiere', la: { Z }, avans: 300 });
const g1 = (X: number, Y: number): Miscare => ({ tip: 'taiere', la: { X, Y }, avans: 1000 });

test('hârtia 1 (§4): linia (10,50)→(110,50) pe linie: G0 X10 Y50 · G1 Z-3 F300 · G1 X110 Y50 · ridicarea; la fel în opoziție', () => {
  for (const sens of ['urcare', 'opozitie'] as const) {
    const d = peLinie(docDin(F, element('l', deschisa([0, 0], [100, 0]), 10, 50)), 'l', { sens });
    const { miscari, avertismente } = program(d);
    assert.deepEqual(aleLui(miscari, 'l/l'), [Z5, g0(10, 50), plonjare(-3), g1(110, 50), Z5], sens);
    assert.deepEqual(avertismente, []);
    const j = programDinDocument(d);
    if (!j.ok) return;
    const r = posteaza(j.program, { foaie: F, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
    assert.ok(r.ok);
    if (r.ok) assert.match(r.text, /\(l\/l: cale, pe-linie, 3 mm\)\nG0 X10\.000 Y50\.000\nG1 Z-3\.000 F300\.0\nG1 X110\.000 Y50\.000 F1000\.0\nG0 Z5\.000\n/);
  }
});

/** Cota frezei plate în (x, y): cea mai mică cotă a unei tăieri (G1) al cărei disc de rază R acoperă punctul; 0 dacă niciuna. */
function cotaLa(m: readonly Miscare[], R: number, x: number, y: number): number {
  let z = 0;
  let px = Number.NaN, py = Number.NaN, pz = Number.NaN;
  for (const a of m) {
    if (!('la' in a)) continue;
    const nx = a.la.X ?? px, ny = a.la.Y ?? py, nz = a.la.Z ?? pz;
    if (a.tip === 'taiere' && Math.min(pz, nz) < 0) {
      const dx = nx - px, dy = ny - py, l2 = dx * dx + dy * dy;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - px) * dx + (y - py) * dy) / l2));
      if (Math.hypot(x - (px + t * dx), y - (py + t * dy)) <= R) z = Math.min(z, pz, nz);
    }
    px = nx; py = ny; pz = nz;
  }
  return z;
}

test('hârtia 2 (§7): linia (0,0)→(100,0), 6 mm cu pasul 3: două treceri din (0,0), cu ridicare și întoarcere; canalul x ∈ [−3; 103], lat 6, fundul −6', () => {
  const { miscari } = program(peLinie(docDin(F, element('l', deschisa([0, 0], [100, 0]), 0, 0)), 'l', { adancime: 6, pas: 3 }));
  const m = aleLui(miscari, 'l/l');
  assert.deepEqual(m, [Z5, g0(0, 0), plonjare(-3), g1(100, 0), Z5, Z5, g0(0, 0), plonjare(-6), g1(100, 0), Z5]);
  // Canalul, pe câmpul de înălțimi al discului: capetele sunt semicercuri de rază R în capetele liniei.
  const cazuri: Array<[number, number, number]> = [
    [-2.999, 0, -6], [-3.001, 0, 0], [102.999, 0, -6], [103.001, 0, 0], [50, 2.999, -6], [50, 3.001, 0], [50, -2.999, -6], [50, -3.001, 0],
  ];
  for (const [x, y, z] of cazuri) assert.equal(cotaLa(m, 3, x, y), z, `(${x}, ${y})`);
});

test('fără coarda de închidere: L-ul (20,20)→(120,20)→(120,120) pe linie se oprește la capăt (pică dacă forme.ts închide calea)', () => {
  const { miscari } = program(peLinie(docDin(F, element('l', deschisa([0, 0], [100, 0], [100, 100]), 20, 20)), 'l', { adancime: 6, pas: 3 }));
  const m = aleLui(miscari, 'l/l');
  assert.deepEqual(m, [
    Z5, g0(20, 20), plonjare(-3), g1(120, 20), g1(120, 120), Z5,
    Z5, g0(20, 20), plonjare(-6), g1(120, 20), g1(120, 120), Z5,
  ]);
  // Niciun G1 înapoi în (20, 20) la adâncime: acolo freza ajunge doar prin aer, deasupra plonjării.
  assert.equal(m.filter((x) => x.tip === 'taiere' && x.la.X === 20 && x.la.Y === 20).length, 0);
});

test('semicercul R50, deschis, pe linie: G0 în (150,100), G3 până în (50,100) cu centrul (100,100), fără întoarcere', () => {
  const semicerc: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: P(50, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-50, 0), s: L }] };
  const { miscari } = program(peLinie(docDin(F, element('s', semicerc, 100, 100)), 's'));
  assert.deepEqual(aleLui(miscari, 's/s'), [
    Z5, g0(150, 100), plonjare(-3), { tip: 'arc', la: { X: 50, Y: 100 }, centru: P(100, 100), sens: 'trigonometric', avans: 1000 }, Z5,
  ]);
});

test('hârtia 15, deschisă: un arc cu coarda 1e-11 mm (bulge 1e-13) pe o cale deschisă iese linie, nu cercul întreg', () => {
  const forma: FormaDoc = {
    tip: 'cale', inchis: false,
    varfuri: [{ p: P(10, 10), s: L }, { p: P(60, 10), s: { tip: 'A', bulge: 1e-13 } }, { p: P(60, 10 + 1e-11), s: L }, { p: P(60, 60), s: L }],
  };
  const { miscari } = program(peLinie(docDin(F, element('t', forma, 0, 0)), 't'));
  const m = aleLui(miscari, 't/t');
  assert.equal(m.filter((x) => x.tip === 'arc').length, 0);
  for (const x of m) if ('la' in x && x.la.X !== undefined) assert.ok(x.la.X >= 10 && x.la.X <= 60, JSON.stringify(x));
});

test('§9: exterior / interior pe o cale deschisă se refuză (nu se degradează pe linie); stânga / dreapta pe un contur închis, la fel', () => {
  const linie = docDin(F, element('l', deschisa([50, 50], [150, 50]), 0, 0));
  for (const latura of ['exterior', 'interior'] as const) {
    assert.match(refuz(cuOperatie(linie, 'l', { latura })), new RegExp(`^l/l: profilul ${latura} cere un contur închis: pe o cale deschisă alege pe linie`));
  }
  const dr = docDin(F, element('r', DREPTUNGHI, 50, 50));
  for (const latura of ['stanga', 'dreapta'] as const) {
    assert.match(refuz(cuOperatie(dr, 'r', { latura })), /^r\/r: stânga \/ dreapta cer o cale deschisă: pe un contur închis alege exterior sau interior$/);
  }
});

test('§9: stânga / dreapta pe o cale deschisă vin cu 2.3c-5; amândouă pe același element: nu se știe ce parte se păstrează', () => {
  const linie = docDin(F, element('l', deschisa([50, 50], [150, 50]), 0, 0));
  for (const latura of ['stanga', 'dreapta'] as const) {
    assert.match(refuz(cuOperatie(linie, 'l', { latura })), /^l\/l: tăietura pe o parte \(stânga \/ dreapta\) a unei căi deschise vine într-o felie următoare \(2\.3c-5\)/);
  }
  const doua: Document = {
    ...linie,
    piese: linie.piese.map((p) => ({ ...p, operatii: [
      { ...operatieImplicita('o1', p.radacina.tip === 'element' ? p.radacina.forma : DREPTUNGHI), noduri: ['l'], latura: 'stanga' },
      { ...operatieImplicita('o2', DREPTUNGHI), noduri: ['l'], latura: 'dreapta' },
    ] })),
  };
  assert.match(refuz(doua), /^l\/l: are operații și pe stânga, și pe dreapta: nu se știe ce parte se păstrează$/);
});

test('§9: urechile, rampa, intrările și degajările pe o operație cu o cale deschisă vin mai târziu (și pe nodurile ei închise)', () => {
  const linie = docDin(F, element('l', deschisa([50, 50], [150, 50]), 0, 0));
  const cazuri: Array<[Partial<Operatie>, RegExp]> = [
    [{ urechi: { numar: 2, latime: 8, grosime: 2 }, adancime: 18, pas: 6 }, /^l\/l: urechile pe o cale deschisă vin mai târziu$/],
    [{ rampa: { lungime: 10 } }, /^l\/l: rampa pe o cale deschisă vine mai târziu$/],
    [{ intrari: { raza: 3 } }, /^l\/l: intrările pe o cale deschisă vin mai târziu$/],
    [{ colturi: { tip: 'dog-bone' } }, /^l\/l: degajările colțurilor pe o cale deschisă vin mai târziu$/],
  ];
  for (const [v, re] of cazuri) assert.match(refuz(peLinie(linie, 'l', v)), re);
  // O operație pe un grup cu un dreptunghi (închis) și o linie (deschisă): primul nod tăiat e dreptunghiul.
  const piesa = {
    id: 'p',
    radacina: { tip: 'grup' as const, id: 'g', matrice: { ...ID }, copii: [
      { tip: 'element' as const, id: 'r', forma: DREPTUNGHI, matrice: { ...ID, e: 50, f: 50 } },
      { tip: 'element' as const, id: 'l', forma: deschisa([20, 20], [250, 20]), matrice: { ...ID } },
    ] },
    operatii: [{ ...operatieImplicita('o', DREPTUNGHI), noduri: ['r', 'l'], latura: 'pe-linie' as const, rampa: { lungime: 10 } }],
  };
  const amestec: Document = { ...linie, piese: [piesa], foi: [{ id: 'f1', stoc: F, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }] };
  assert.match(refuz(amestec), /^i\/r: operația o are și căi deschise; rampa pe o cale deschisă vine mai târziu$/);
});

test('§4: calea deschisă degenerată se refuză (sub 2 vârfuri distincte, sau mai scurtă de 0,01 mm, măsurat în lume)', () => {
  type M = { a: number; b: number; c: number; d: number; e: number; f: number };
  const cu = (forma: FormaDoc, matrice: M = { ...ID, e: 0, f: 100 }): Document => peLinie(docDin(F, { id: 'd', forma, matrice }), 'd');
  assert.match(refuz(cu(deschisa([10, 0], [10, 0], [10, 0]))), /^d\/d: calea deschisă are mai puțin de 2 vârfuri distincte: ar fi o găurire, nu o linie$/);
  assert.match(refuz(cu(deschisa([0, 0], [0.0099, 0]))), /^d\/d: calea deschisă are lungimea 0\.0099 mm, sub rezoluția de 0\.01 mm: ar fi o găurire/);
  // Exact 0,01 mm trece (pragul e „sub”).
  assert.ok(programDinDocument(cu(deschisa([0, 0], [0.01, 0]))).ok);
  // Scalată la jumătate în piesă, o linie de 0,015 mm are 0,0075 mm în lume.
  assert.match(refuz(cu(deschisa([0, 0], [0.015, 0]), { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 100 })), /lungimea 0\.0075 mm/);
});

/** Foaia cu piesa (dreptunghiul 100 × 100 în (100, 50), exterior prin foaie), o gaură în ea și linia dată. */
function cuPiesa(linie: FormaDoc, v: Partial<Omit<Operatie, 'id' | 'tip'>>): Document {
  const d = docDin(F, element('r', DREPTUNGHI, 100, 50), element('o', { tip: 'cerc', raza: 10 }, 150, 100), element('l', linie, 0, 0));
  return peLinie(cuOperatie(d, 'r', { adancime: 18, pas: 6 }), 'l', v);
}

test('§8: o despărțire marcată, de la o margine a foii la cealaltă, în afara pieselor, se taie la urmă (după exterioare)', () => {
  const { miscari, avertismente } = program(cuPiesa(deschisa([0, 20], [300, 20]), { adancime: 18, pas: 6, despartire: true }));
  assert.deepEqual(etichete(miscari), ['o/o', 'r/r', 'l/l']);
  assert.deepEqual(avertismente, []);
  // Aceeași linie, nemarcată: ajunge la marginea foii, deci poate despărți foaia; exportul cere omului să hotărască.
  assert.equal(refuz(cuPiesa(deschisa([0, 20], [300, 20]), { adancime: 18, pas: 6 })),
    'l/l: tăietura deschisă prin foaie ajunge la marginea foii și o poate despărți; marcheaz-o «despărțire» (se taie la urmă) sau micșorează adâncimea');
  // Nemarcată, dar nu prin foaie: o canelură, în clasa ei (pe linie, înaintea exterioarelor).
  assert.deepEqual(etichete(program(cuPiesa(deschisa([0, 20], [300, 20]), { adancime: 10, pas: 5 })).miscari), ['o/o', 'l/l', 'r/r']);
});

test('§8: marcajul se judecă: pe o cale închisă, pe o adâncime sub grosimea foii, sau cu discul frezei intrând într-o piesă', () => {
  const dr = docDin(F, element('r', DREPTUNGHI, 100, 50));
  assert.match(refuz(cuOperatie(dr, 'r', { despartire: true })), /^r\/r: despărțirea foii se marchează doar pe o cale deschisă$/);
  assert.match(refuz(cuPiesa(deschisa([0, 20], [300, 20]), { adancime: 17, pas: 6, despartire: true })),
    /^l\/l: o despărțire taie prin toată foaia, iar adâncimea de 17 mm e sub grosimea foii \(18 mm\)$/);
  // La y = 48, discul ajunge la y = 51: intră 1 mm în piesa de jos (y = 50).
  assert.match(refuz(cuPiesa(deschisa([0, 48], [300, 48]), { adancime: 18, pas: 6, despartire: true })),
    /^l\/l: despărțirea intră în piesa r\/r \(cu 1\.000 mm, lângă X 100\.0, Y 50\.0\): o despărțire trece doar prin schelet/);
  // Prin piesă: trece marginea, deci intră cel puțin cu R.
  assert.match(refuz(cuPiesa(deschisa([0, 120], [300, 120]), { adancime: 18, pas: 6, despartire: true })), /intră în piesa r\/r \(cu cel puțin 3\.000 mm/);
  // La y = 47, discul atinge doar marginea (distanța R): trece.
  assert.ok(programDinDocument(cuPiesa(deschisa([0, 47], [300, 47]), { adancime: 18, pas: 6, despartire: true })).ok);
});

test('§8: o tăietură deschisă nemarcată prin foaie ajunge la margine dacă un capăt stă la cel mult R + 1 mm de conturul foii', () => {
  const linie = (a: number): Document => peLinie(docDin(F, element('l', deschisa([a, 100], [300 - a, 100]), 0, 0)), 'l', { adancime: 18, pas: 6 });
  assert.match(refuz(linie(4)), /ajunge la marginea foii/);
  assert.match(refuz(linie(-5)), /ajunge la marginea foii/);
  const r = programDinDocument(linie(4.01));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (r.ok) assert.deepEqual(r.avertismente, []);
});

test('§10 (hârtia 13): pe linie, prin foaie, peste o piesă: avertismentul, programul neschimbat, clasa 1 în ordine', () => {
  const peste = (linie: FormaDoc, adancime: number): ReturnType<typeof program> => program(cuPiesa(linie, { adancime, pas: 6 }));
  const prin = peste(deschisa([150, 120], [150, 180]), 18);
  assert.deepEqual(prin.avertismente, [
    'l/l: tăietura pe linie trece prin toată grosimea piesei r/r (lângă X 150.0, Y 120.0): o despică sau o crestează; bucățile care se desprind n-au urechi',
  ]);
  assert.deepEqual(etichete(prin.miscari), ['o/o', 'l/l', 'r/r']);
  assert.deepEqual(aleLui(prin.miscari, 'l/l'), [
    Z5, g0(150, 120), plonjare(-6), g1(150, 180), Z5, Z5, g0(150, 120), plonjare(-12), g1(150, 180), Z5, Z5, g0(150, 120), plonjare(-18), g1(150, 180), Z5,
  ]);
  // O crestătură din afară: discul intră 1 mm în latura de jos.
  assert.match(peste(deschisa([120, 48], [180, 48]), 18).avertismente.join('\n'), /piesei r\/r \(cu 1\.000 mm, lângă X 120\.0, Y 50\.0\)/);
  // Nu prin foaie: nimic; departe de piese: nimic.
  assert.deepEqual(peste(deschisa([150, 120], [150, 180]), 12).avertismente, []);
  assert.deepEqual(peste(deschisa([20, 180], [80, 180]), 18).avertismente, []);
});

test('§10: bucata liberă: capetele unei tăieturi deschise prin foaie la mai puțin de D + 1 mm, sau calea pe linie care se taie singură', () => {
  const c = (gol: number): ReturnType<typeof program> =>
    program(peLinie(docDin(F, element('l', deschisa([50, 50], [150, 50], [150, 150], [50, 150], [50, 50 + gol]), 0, 0)), 'l', { adancime: 18, pas: 6 }));
  assert.deepEqual(c(6.9).avertismente, ['l/l: bucata închisă de tăietură iese liberă, fără urechi (capetele la 6.900 mm unul de altul)']);
  assert.deepEqual(c(7).avertismente, []);
  const alfa = program(peLinie(docDin(F, element('l', deschisa([50, 50], [150, 150], [150, 50], [50, 150]), 0, 0)), 'l', { adancime: 18, pas: 6 }));
  assert.deepEqual(alfa.avertismente, ['l/l: bucata închisă de tăietură iese liberă, fără urechi (calea se taie singură)']);
  // Nu prin foaie: o canelură nu eliberează nimic.
  const alfa3 = program(peLinie(docDin(F, element('l', deschisa([50, 50], [150, 150], [150, 50], [50, 150]), 0, 0)), 'l'));
  assert.deepEqual(alfa3.avertismente, []);
});

test('seTaieSingura: încrucișarea și capetele care se ating da; zig-zag-ul și un vârf repetat nu', () => {
  const c = (...pct: Array<readonly [number, number]>): Contur => ({ inchis: false, varfuri: pct.map(([x, y]) => ({ p: P(x, y), s: LINIE })) });
  assert.equal(seTaieSingura(c([0, 0], [10, 10], [20, 0], [30, 10])), false);
  assert.equal(seTaieSingura(c([0, 0], [10, 10], [10, 10], [20, 0])), false);
  assert.equal(seTaieSingura(c([0, 0], [10, 0], [10, 10], [0, 0])), true);
  assert.equal(seTaieSingura(c([0, 0], [10, 10], [10, 0], [0, 10])), true);
  // O cale cu un arc la mijloc (semicercul de sub (10..20, 0)), a cărei ultimă linie, (10,0)→(10,10), taie prima, la (10, 5).
  const arc: Contur = { inchis: false, varfuri: [{ p: P(0, 5), s: LINIE }, { p: P(20, 5), s: LINIE }, { p: P(20, 0), s: { tip: 'A', bulge: -1 } }, { p: P(10, 0), s: LINIE }, { p: P(10, 10), s: LINIE }] };
  assert.equal(seTaieSingura(arc), true);
});

test('„Ce am măsurat” 6: pe o cale deschisă, parcurgerea nu trece de capăt și rampa se refuză (niciun G1 de la capăt spre segmentul 0)', () => {
  const deschis: Contur = { inchis: false, varfuri: [{ p: P(0, 0), s: LINIE }, { p: P(10, 0), s: LINIE }, { p: P(10, 10), s: LINIE }] };
  const bun = parcurge(deschis, [{ s: 0, z: -1 }, { s: 20, z: -1 }], 1000, 300);
  assert.ok(bun.ok);
  if (bun.ok) assert.deepEqual(bun.miscari, [{ tip: 'taiere', la: { X: 10, Y: 0 }, avans: 1000 }, { tip: 'taiere', la: { X: 10, Y: 10 }, avans: 1000 }]);
  for (const noduri of [[{ s: 0, z: -1 }, { s: 25, z: -1 }], [{ s: -1, z: -1 }, { s: 10, z: -1 }]]) {
    const r = parcurge(deschis, noduri, 1000, 300);
    assert.ok(!r.ok && /pe o cale deschisă, drumul .* trece de capetele ei/.test(r.motiv), JSON.stringify(r));
  }
  // Controlul: închisă, aceeași cerere desfășoară bucla și trece prin vârful 0.
  const inchis = parcurge({ ...deschis, inchis: true }, [{ s: 0, z: -1 }, { s: 40, z: -1 }], 1000, 300);
  assert.ok(inchis.ok && inchis.miscari.some((x) => 'la' in x && x.la.X === 0 && x.la.Y === 0));
  const rampa = buclaCuRampa(deschis, [1, 2], { lungime: 5 }, undefined, 1000, 300);
  assert.ok(!rampa.ok && /^rampa pe o cale deschisă vine mai târziu/.test(rampa.motiv));
  const tr = traseuProfil([{ adancime: 1, contururi: [deschis] }], { zSigur: 5, avans: 1000, avansPlonjare: 300 }, undefined, { lungime: 5 });
  assert.ok(!tr.ok && /rampa pe o cale deschisă/.test(tr.motiv));
  assert.throws(() => bucataBuclei(deschis, 2, 5), RangeError);
});

test('ordinea (§8): interioarele, apoi pe linie și deschisele nemarcate (și stânga / dreapta), exterioarele, la urmă despărțirile', () => {
  const d = docDin(F,
    element('r', DREPTUNGHI, 100, 50), element('d', deschisa([0, 20], [300, 20]), 0, 0),
    element('s', deschisa([10, 190], [60, 190]), 0, 0), element('o', { tip: 'cerc', raza: 10 }, 150, 100));
  const doc = cuOperatie(cuOperatie(d, 'd', { latura: 'pe-linie', despartire: true }), 's', { latura: 'stanga' });
  const t = taieturiFoaie(doc, 0);
  assert.deepEqual(t.map((x) => x.idLume), ['o/o', 's/s', 'r/r', 'd/d']);
  // Marcajul apare pe tăietură doar când e pus: tăieturile de azi au aceleași câmpuri ca înainte.
  assert.deepEqual(t.map((x) => Object.hasOwn(x, 'despartire')), [false, false, false, true]);
  assert.equal(t[3]?.despartire, true);
  const fals = taieturiFoaie(cuOperatie(d, 'd', { latura: 'pe-linie', despartire: false }), 0);
  assert.equal(fals.some((x) => Object.hasOwn(x, 'despartire')), false);
});

test('dialogul (§12): rândul cu căi deschise oferă doar pe linie; latura scrisă deja în document rămâne în listă', () => {
  assert.deepEqual(laturiOferite(0, 'exterior'), ['exterior', 'interior', 'pe-linie']);
  assert.deepEqual(laturiOferite(1, 'pe-linie'), ['pe-linie']);
  assert.deepEqual(laturiOferite(2, 'exterior'), ['pe-linie', 'exterior']);
  assert.deepEqual(laturiOferite(0, 'stanga'), ['exterior', 'interior', 'pe-linie', 'stanga']);
});
