/**
 * Degajările pe hârtie (ADR 0032). Gaura 40 × 30 cu colțul stânga-jos în (50, 50), freza Ø6 (R = 3): colțurile V sunt
 * (50, 50), (90, 50), (90, 80), (50, 80); vârfurile traseului Q, la R de ambele laturi, (53, 53) … (53, 77). Dog-bone: E pe
 * bisectoare, la R de V. T-bone: E = V + R·m, cu m normala spre deșeu a laturii scurte, deci crestătura în peretele lung.
 * Drumul Q → E → Q se caută în IR ca dus-întors; fără el, programul trebuie să fie exact cel fără degajări.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { colturiDeDegajat } from '../../src/cam/degajari.ts';
import { conturDreptunghi } from '../../src/geom/contur.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, Operatie } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 12 };
const R = 3;
const k = R / Math.SQRT2;
const near = (a: number, b: number, e = 1e-9): boolean => Math.abs(a - b) <= e;
const dr = (id: string, x: number, y: number, w = 40, h = 30) => ({ id, forma: { tip: 'dreptunghi' as const, latime: w, inaltime: h, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const gaura = (v: Partial<Operatie>): Document => cuOperatie(docDin(F, dr('g', 50, 50)), 'g', { latura: 'interior', adancime: 6, pas: 3, colturi: { tip: 'dog-bone' }, ...v });

/** Mișcările de după eticheta lui `id`, până la următoarea etichetă. */
function bloc(d: Document, idLume: string): { miscari: Miscare[]; avertismente: readonly string[] } {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return { miscari: [], avertismente: [] };
  const i = j.program.miscari.findIndex((m) => m.tip === 'eticheta' && m.element === idLume);
  const urm = j.program.miscari.findIndex((m, x) => x > i && m.tip === 'eticheta');
  return { miscari: j.program.miscari.slice(i + 1, urm < 0 ? undefined : urm), avertismente: j.avertismente };
}

type Drum = { readonly q: { x: number; y: number }; readonly e: { x: number; y: number }; readonly z: number; readonly indice: number };

/** Drumurile dus-întors: două tăieri în plan, a doua înapoi exact în punctul de dinaintea primei. */
function drumuri(m: readonly Miscare[]): Drum[] {
  const rez: Drum[] = [];
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < m.length; i++) {
    const a = m[i];
    if (!a || !('la' in a)) continue;
    const b = m[i + 1];
    if (a.tip === 'taiere' && b?.tip === 'taiere' && a.la.Z === undefined && b.la.Z === undefined
      && a.la.X !== undefined && a.la.Y !== undefined && b.la.X === x && b.la.Y === y && !(a.la.X === x && a.la.Y === y)) {
      rez.push({ q: { x, y }, e: { x: a.la.X, y: a.la.Y }, z, indice: i });
    }
    x = a.la.X ?? x; y = a.la.Y ?? y; z = a.la.Z ?? z;
  }
  return rez;
}

/** Programul fără drumurile dus-întors. */
function faraDrumuri(m: readonly Miscare[]): Miscare[] {
  const scoase = new Set(drumuri(m).flatMap((d) => [d.indice, d.indice + 1]));
  return m.filter((_, i) => !scoase.has(i));
}

const cheie = (p: { x: number; y: number }): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;

test('gaura 40 × 30 cu dog-bone: pe fiecare trecere, câte un drum din fiecare Q până la E = V + R·u, iar cercul trece prin V', () => {
  for (const sens of ['urcare', 'opozitie'] as const) {
    const { miscari, avertismente } = bloc(gaura({ sens }), 'g/g');
    assert.deepEqual(avertismente, []);
    const ds = drumuri(miscari);
    assert.equal(ds.length, 8, `${sens}: 4 colțuri × 2 treceri`);
    const asteptat = new Map([
      ['53.0000,53.0000', { x: 50 + k, y: 50 + k }], ['87.0000,53.0000', { x: 90 - k, y: 50 + k }],
      ['87.0000,77.0000', { x: 90 - k, y: 80 - k }], ['53.0000,77.0000', { x: 50 + k, y: 80 - k }],
    ]);
    for (const d of ds) {
      const e = asteptat.get(cheie(d.q));
      assert.ok(e, `${sens}: Q neașteptat ${cheie(d.q)}`);
      if (!e) continue;
      assert.ok(near(d.e.x, e.x) && near(d.e.y, e.y), `${sens}: E ${cheie(d.e)} față de ${cheie(e)}`);
      // Drumul are R√2 − R, iar E stă la R de colț: cercul frezei trece exact prin V.
      assert.ok(near(Math.hypot(d.e.x - d.q.x, d.e.y - d.q.y), R * Math.SQRT2 - R, 1e-9));
    }
    assert.deepEqual([...new Set(ds.map((d) => d.z))].sort((a, b) => b - a), [-3, -6], `${sens}: la cota fiecărei treceri`);
    const fara = bloc(gaura({ sens, colturi: null }), 'g/g');
    assert.deepEqual(faraDrumuri(miscari), fara.miscari, `${sens}: fără drumuri, programul de dinainte`);
  }
});

test('T-bone: crestătura în peretele lung (40), E = V + R·m cu m normala laturii scurte spre deșeu', () => {
  const { miscari } = bloc(gaura({ colturi: { tip: 't-bone' } }), 'g/g');
  const ds = drumuri(miscari);
  assert.equal(ds.length, 8);
  const asteptat = new Map([
    ['53.0000,53.0000', { x: 53, y: 50 }], ['87.0000,53.0000', { x: 87, y: 50 }],
    ['87.0000,77.0000', { x: 87, y: 80 }], ['53.0000,77.0000', { x: 53, y: 80 }],
  ]);
  for (const d of ds) {
    const e = asteptat.get(cheie(d.q));
    assert.ok(e && near(d.e.x, e.x) && near(d.e.y, e.y), `Q ${cheie(d.q)}: E ${cheie(d.e)}`);
    assert.ok(near(Math.hypot(d.e.x - d.q.x, d.e.y - d.q.y), R, 1e-9), 'la 90°, drumul are R');
  }
});

test('T-bone pe pătrat (laturi egale): crestătura în peretele laturii de după V, în sensul de mers', () => {
  // Pătratul 30 × 30 din (50, 50). La urcare, pe interior, mersul e trigonometric: în colțul stânga-jos se sosește pe
  // peretele stâng (în jos) și se pleacă pe cel de jos, deci crestătura e în peretele de jos: E = (53, 50).
  const p = (sens: 'urcare' | 'opozitie') => cuOperatie(docDin(F, dr('g', 50, 50, 30, 30)), 'g', { latura: 'interior', sens, adancime: 3, pas: 3, colturi: { tip: 't-bone' } });
  const urcare = new Map(drumuri(bloc(p('urcare'), 'g/g').miscari).map((d) => [cheie(d.q), cheie(d.e)]));
  assert.deepEqual(Object.fromEntries(urcare), {
    '53.0000,53.0000': '53.0000,50.0000', '77.0000,53.0000': '80.0000,53.0000',
    '77.0000,77.0000': '77.0000,80.0000', '53.0000,77.0000': '50.0000,77.0000',
  });
  // La opoziție, mersul e orar: în stânga-jos se sosește pe peretele de jos și se pleacă pe cel stâng: E = (50, 53).
  const opozitie = new Map(drumuri(bloc(p('opozitie'), 'g/g').miscari).map((d) => [cheie(d.q), cheie(d.e)]));
  assert.deepEqual(Object.fromEntries(opozitie), {
    '53.0000,53.0000': '50.0000,53.0000', '77.0000,53.0000': '77.0000,50.0000',
    '77.0000,77.0000': '80.0000,77.0000', '53.0000,77.0000': '53.0000,80.0000',
  });
});

test('pe exterior, colțurile dreptunghiului sunt convexe pentru piesă: niciun drum, programul de dinainte', () => {
  const d = cuOperatie(docDin(F, dr('g', 50, 50)), 'g', { latura: 'exterior', adancime: 6, pas: 3, colturi: { tip: 'dog-bone' } });
  const f = cuOperatie(docDin(F, dr('g', 50, 50)), 'g', { latura: 'exterior', adancime: 6, pas: 3, colturi: null });
  assert.deepEqual(bloc(d, 'g/g').miscari, bloc(f, 'g/g').miscari);
  // Și cercul, și dreptunghiul cu colțuri rotunjite: niciun colț de degajat.
  assert.deepEqual(colturiDeDegajat(conturDreptunghi(0, 0, 40, 30, 5), 'interior', 'urcare', R, 'dog-bone'), []);
});

test('cu urechi, rampă și intrări: drumurile se adaugă, iar restul programului rămâne exact cel fără degajări', () => {
  const variante: Array<Partial<Operatie>> = [
    { adancime: 12, pas: 4, urechi: { numar: 2, latime: 8, grosime: 2 } },
    { rampa: { lungime: 10 } },
    { intrari: { raza: 3 } },
    { rampa: { lungime: 10 }, intrari: { raza: 3 } },
    { adancime: 12, pas: 4, urechi: { numar: 2, latime: 8, grosime: 2 }, rampa: { lungime: 10 } },
  ];
  for (const v of variante) {
    const cu = bloc(gaura(v), 'g/g');
    const fara = bloc(gaura({ ...v, colturi: null }), 'g/g');
    assert.ok(drumuri(cu.miscari).length >= 4, JSON.stringify(v));
    assert.deepEqual(faraDrumuri(cu.miscari), fara.miscari, JSON.stringify(v));
  }
});

test('condiția a: o degajare care s-ar apropia la sub D + 1 mm de o altă buclă se omite, cu avertisment', () => {
  // A doua gaură la 1 mm în dreapta (de la x = 91): traseul ei e la x = 94, iar drumul colțurilor din dreapta ale primei
  // găuri ajunge la x = 87,88 (dog-bone): 6,12 mm, sub D + 1 = 7, deci colțurile din dreapta se omit. Cele din stânga rămân.
  let d = docDin(F, dr('g', 50, 50), dr('h', 91, 50));
  d = cuOperatie(cuOperatie(d, 'g', { latura: 'interior', adancime: 6, pas: 3, colturi: { tip: 'dog-bone' } }), 'h', { latura: 'interior', adancime: 6, pas: 3 });
  const { miscari, avertismente } = bloc(d, 'g/g');
  assert.deepEqual([...avertismente].sort(), [
    'g/g: degajarea omisă la colțul (90.000, 50.000): prea aproape de altă buclă',
    'g/g: degajarea omisă la colțul (90.000, 80.000): prea aproape de altă buclă',
  ]);
  assert.equal(drumuri(miscari).length, 4, 'doar colțurile din stânga, pe 2 treceri');
});

test('refuzul: degajări pe linie (nu există parte de deșeu)', () => {
  const r = programDinDocument(gaura({ latura: 'pe-linie' }));
  assert.match(r.ok ? '' : r.motiv, /g\/g: degajările cer o parte de deșeu/);
});

test('condiția b: cu 2 urechi pe gaura 40 × 30, colțurile la 4 mm de coloana unei punți se omit, cu avertisment', () => {
  // Bucla pornește din Q = (53, 53) și merge trigonometric: laturile 34, 24, 34, 24, P = 116; Q-urile la s = 0, 34, 58, 92.
  // Urechile la (k + ½)·58 = 29 și 87, cu h = 4, R = 3: coloanele [28; 30] și [86; 88]. Colțul din s = 34 e la 4 mm de
  // prima coloană, cel din s = 92 la 4 mm de a doua: sub D = 6, deci se omit; celelalte două sunt la 28 mm.
  const d = gaura({ adancime: 12, pas: 4, urechi: { numar: 2, latime: 8, grosime: 2 } });
  const { miscari, avertismente } = bloc(d, 'g/g');
  assert.deepEqual([...avertismente].sort(), [
    'g/g: degajarea omisă la colțul (50.000, 80.000): ar tăia puntea unei urechi',
    'g/g: degajarea omisă la colțul (90.000, 50.000): ar tăia puntea unei urechi',
  ]);
  const ds = drumuri(miscari);
  assert.deepEqual([...new Set(ds.map((x) => cheie(x.q)))].sort(), ['53.0000,53.0000', '87.0000,77.0000']);
  assert.equal(ds.length, 6, '2 colțuri × 3 treceri');
});

test('restul minim (ADR 0032 §2): un vârf aproape drept (rest sub 0,01 mm) nu primește degajare; unul de 11° da', () => {
  const contur = (y: number) => ({
    inchis: true,
    varfuri: [{ x: 0, y: 0 }, { x: 20, y }, { x: 40, y: 0 }, { x: 40, y: 30 }, { x: 0, y: 30 }].map((p) => ({ p, s: { tip: 'L' as const } })),
  });
  // Cotul de 2·atan(0,3/20) = 1,7°: restul 3·(1/cos 0,86° − 1) = 0,0003 mm. Cotul de 2·atan(2/20) = 11,4°: 0,0149 mm.
  assert.equal(colturiDeDegajat(contur(-0.3), 'interior', 'urcare', R, 'dog-bone').length, 4);
  const cinci = colturiDeDegajat(contur(-2), 'interior', 'urcare', R, 'dog-bone');
  assert.equal(cinci.length, 5);
  const cot = cinci.find((x) => near(x.v.x, 20) && near(x.v.y, -2));
  assert.ok(cot && near(Math.hypot(cot.q.x - cot.v.x, cot.q.y - cot.v.y) - R, R / Math.cos(Math.atan(0.1)) - R, 1e-12));
});

test('degajările față în față (precizarea din 11.10): cu peretele de 5 mm, T-bone-urile care s-ar întâlni se omit amândouă; cu 7 mm rămân, cu 1 mm între ele', () => {
  // Gaura A din (50, 50) și gaura B deasupra ei. T-bone: crestăturile colțurilor de sus ale lui A urcă până la y = 83 (E la
  // y = 80), iar ale colțurilor de jos ale lui B coboară până la y_B − 3. Cu peretele de 5 mm (B din y = 85), drumurile
  // [Q, E] sunt la 5 mm unul de altul, sub D + 1 = 7, deși fiecare e la 8 mm de traseul celeilalte bucle.
  const doua = (yB: number): Document => {
    let d = docDin(F, dr('a', 50, 50), dr('b', 50, yB));
    for (const id of ['a', 'b']) d = cuOperatie(d, id, { latura: 'interior', adancime: 6, pas: 3, colturi: { tip: 't-bone' } });
    return d;
  };
  const j5 = programDinDocument(doua(85));
  assert.ok(j5.ok);
  if (!j5.ok) return;
  assert.deepEqual([...j5.avertismente].sort(), [
    'a/a: degajarea omisă la colțul (50.000, 80.000): prea aproape de degajarea altei bucle',
    'a/a: degajarea omisă la colțul (90.000, 80.000): prea aproape de degajarea altei bucle',
    'b/b: degajarea omisă la colțul (50.000, 85.000): prea aproape de degajarea altei bucle',
    'b/b: degajarea omisă la colțul (90.000, 85.000): prea aproape de degajarea altei bucle',
  ]);
  const j7 = programDinDocument(doua(87));
  assert.ok(j7.ok && j7.avertismente.length === 0);
  const sus = drumuri(bloc(doua(87), 'a/a').miscari).filter((x) => x.e.y > 79);
  const jos = drumuri(bloc(doua(87), 'b/b').miscari).filter((x) => x.e.y < 88);
  assert.ok(sus.length > 0 && jos.length > 0);
  // Între crestături: (87 − 3) − (80 + 3) = 1 mm.
  assert.ok(near(Math.min(...jos.map((x) => x.e.y)) - R - (Math.max(...sus.map((x) => x.e.y)) + R), 1, 1e-9));
});

test('condiția c (marginea foii): T-bone-ul care ar lăsa sub 1 mm până la marginea foii se omite; bucla însăși stă la 3,5 mm', () => {
  // Gaura din (50; 3,5): traseul de jos e la y = 6,5, discul lui la 3,5 de margine. T-bone-urile de jos ar coborî discul
  // până la y = 0,5.
  const d = cuOperatie(docDin(F, dr('g', 50, 3.5)), 'g', { latura: 'interior', adancime: 6, pas: 3, colturi: { tip: 't-bone' } });
  const { miscari, avertismente } = bloc(d, 'g/g');
  assert.deepEqual([...avertismente].sort(), [
    'g/g: degajarea omisă la colțul (50.000, 3.500): prea aproape de marginea foii',
    'g/g: degajarea omisă la colțul (90.000, 3.500): prea aproape de marginea foii',
  ]);
  assert.equal(drumuri(miscari).length, 4, 'colțurile de sus, pe 2 treceri');
});

test('colțurile rotunjite: sub raza frezei, avertisment și fără degajare; un arc pe care curățarea îl scoate e un colț ascuțit', () => {
  const rot = (raza: number) => cuOperatie(docDin(F, { ...dr('g', 50, 50), forma: { tip: 'dreptunghi' as const, latime: 40, inaltime: 30, razaColt: raza } }), 'g',
    { latura: 'interior', adancime: 6, pas: 3, colturi: { tip: 'dog-bone' } });
  const r2 = bloc(rot(2), 'g/g');
  assert.equal(drumuri(r2.miscari).length, 0);
  assert.deepEqual(r2.avertismente, Array.from({ length: 4 }, () => 'g/g: colțul rotunjit cu raza 2.000 mm (sub raza frezei, 3.000 mm) rămâne cu raza frezei; degajarea pe arce vine cu importul SVG'));
  // Cu raza peste a frezei, freza încape: nimic de spus.
  assert.deepEqual(bloc(rot(5), 'g/g').avertismente, []);
  // Un arc de 1e-7 mm dispare la curățare: colțurile sunt ascuțite, deci 4 degajări pe fiecare trecere.
  const mic = bloc(rot(1e-7), 'g/g');
  assert.deepEqual(mic.avertismente, []);
  assert.equal(drumuri(mic.miscari).length, 8);
});
