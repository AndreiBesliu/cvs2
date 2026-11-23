/**
 * Urechile după reguli, pe laturi (ADR 0211, varianta c; felia 11.3↑f), pe hârtie.
 *
 * - **Laturile unei bucle:** bucățile ei drepte (liniile care se continuă în aceeași direcție sunt o singură latură, și peste
 *   vârful 0); arcele nu sunt laturi. O latură numără doar dacă pe ea încape o ureche (W ≤ 0,9 · L).
 * - **Regulile:** „lungi” = laturile cele mai lungi (și cele cu cel mult 1 % mai scurte), „scurte” = cele mai scurte (și cele cu
 *   cel mult 1 % mai lungi), „mijloc” = toate, cu câte o ureche la mijloc. La „lungi” și „scurte”, numărul (pe buclă) se
 *   împarte pe laturile regulii: câte ⌊n / k⌋ pe fiecare, iar restul de e, pe laturile ⌊j · k / e⌋ (răspândite, în ordinea
 *   drumului); pe o latură cu m urechi, centrele la (j + ½) · L / m; cel mult câte încap (W ≤ 0,9 · L / m).
 * - **Exemplul din ADR:** dreptunghiul 80 × 30 tăiat pe dinafară cu Ø3,175 (R = 1,5875), cu urechi de 6 mm. Drumul frezei are
 *   laturile de 80 și 30 și colțuri rotunde de rază R. „Scurte”, două: palierele la x = −R și x = 80 + R, de la y = 12 la 18,
 *   adică exact programul locurilor alese în (0, 15) și (80, 15) (ADR 0211, „Proba”). „Lungi”, două: la y = −R și y = 30 + R,
 *   de la x = 37 la 43. „Mijloc”: toate patru. „Lungi”, patru: la x = 20 și x = 60, pe ambele laturi lungi.
 * - **Fără laturi drepte** (un cerc): programul modului „egale”, octet cu octet.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { centrePeLaturi, laturiBucla, urechiPeLaturi } from '../../src/cam/urechiLaturi.ts';
import { conturCerc, conturDreptunghi, LINIE, type Contur } from '../../src/geom/contur.ts';
import { aproape, citeste, documentCu, mijloace, R, VARF, X0, Y0, type Radacina } from './ajutor-urechi.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const poligon = (p: readonly (readonly [number, number])[]): Contur => ({ inchis: true, varfuri: p.map(([x, y]) => ({ p: { x, y }, s: LINIE })) });
/** Listele de numere egale la 1e-6 (pozițiile pe buclă, mijloacele palierelor). */
const egale = (a: readonly number[], b: readonly number[], ce = ''): void => {
  assert.ok(a.length === b.length && a.every((x, k) => aproape(x, b[k] as number, 1e-6)), `${ce}: ${JSON.stringify(a)} față de ${JSON.stringify(b)}`);
};
const tabele = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], ce = ''): void => {
  assert.equal(a.length, b.length, `${ce}: ${JSON.stringify(a)} față de ${JSON.stringify(b)}`);
  a.forEach((x, k) => { egale(x, b[k] as number[], ce); });
};
/** Fiecare rând din b se găsește în a (sub rampă, palierele apar și pe bucăți, la trecerile care coboară peste ele). */
const contine = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], ce = ''): void => {
  for (const y of b) assert.ok(a.some((x) => x.length === y.length && x.every((v, k) => aproape(v, y[k] as number, 1e-6))), `${ce}: ${JSON.stringify(y)} nu e în ${JSON.stringify(a)}`);
};

const DREPT = conturDreptunghi(0, 0, 80, 30);
/** Drumul frezei în jurul dreptunghiului 80 × 30: laturile de 80 și 30, colțurile sferturi de cerc de rază R. */
const DRUM = conturDreptunghi(-R, -R, 80 + 2 * R, 30 + 2 * R, R);
const SFERT = (Math.PI * R) / 2;

// ── Laturile ──────────────────────────────────────────────────────────────────────────────────

test('laturile: dreptunghiul are patru; pe drumul cu colțuri rotunde, tot patru, cu arcele între ele', () => {
  const d = laturiBucla(DREPT);
  assert.equal(d.P, 220);
  assert.deepEqual(d.laturi, [{ s0: 0, lungime: 80 }, { s0: 80, lungime: 30 }, { s0: 110, lungime: 80 }, { s0: 190, lungime: 30 }]);
  const r = laturiBucla(DRUM);
  assert.ok(aproape(r.P, 220 + 4 * SFERT, 1e-9), String(r.P));
  egale(r.laturi.map((x) => x.s0), [0, 80 + SFERT, 110 + 2 * SFERT, 190 + 3 * SFERT], 'pornirile');
  egale(r.laturi.map((x) => x.lungime), [80, 30, 80, 30], 'lungimile');
});

test('laturile: liniile în aceeași direcție sunt o latură, și peste vârful 0; o frântură mică nu o desparte, una mare da', () => {
  // Latura de jos cu un nod la x = 30: tot o latură de 80.
  assert.deepEqual(laturiBucla(poligon([[0, 0], [30, 0], [80, 0], [80, 30], [0, 30]])).laturi,
    [{ s0: 0, lungime: 80 }, { s0: 80, lungime: 30 }, { s0: 110, lungime: 80 }, { s0: 190, lungime: 30 }]);
  // Bucla pornită din mijlocul laturii de jos: latura ei trece peste vârful 0 (pornește la 180, lungă de 40 + 40), la urmă.
  assert.deepEqual(laturiBucla(poligon([[40, 0], [80, 0], [80, 30], [0, 30], [0, 0]])).laturi,
    [{ s0: 40, lungime: 30 }, { s0: 70, lungime: 80 }, { s0: 150, lungime: 30 }, { s0: 180, lungime: 80 }]);
  // O frântură de 0,007° (nodul din mijloc ridicat cu 0,005 mm) rămâne o latură; una de 0,5° (ridicat cu 0,35 mm) face două.
  const fina = laturiBucla(poligon([[0, 0], [40, 0.005], [80, 0], [80, 30], [0, 30]])).laturi;
  assert.equal(fina.length, 4);
  assert.ok(aproape(fina[0]?.lungime ?? 0, 2 * Math.hypot(40, 0.005), 1e-9));
  assert.equal(laturiBucla(poligon([[0, 0], [40, 0.35], [80, 0], [80, 30], [0, 30]])).laturi.length, 5);
  // Un cerc n-are laturi.
  assert.deepEqual(laturiBucla(conturCerc(50, 50, 20)).laturi, []);
});

test('laturile: un arc desparte două linii din aceeași direcție, oriunde ar porni bucla; o linie dus-întors sunt două laturi', () => {
  // Dreptunghiul 80 × 30 cu o scobitură semicirculară de rază 5 la mijlocul laturii de sus: sus rămân două laturi de 35.
  const L = LINIE, jos = { tip: 'A', bulge: -1 } as const;
  const varfuri = [
    { p: { x: 0, y: 0 }, s: L }, { p: { x: 80, y: 0 }, s: L }, { p: { x: 80, y: 30 }, s: L }, { p: { x: 45, y: 30 }, s: jos },
    { p: { x: 35, y: 30 }, s: L }, { p: { x: 0, y: 30 }, s: L },
  ];
  const A = 5 * Math.PI;
  const de = (k: number): Contur => ({ inchis: true, varfuri: [...varfuri.slice(k), ...varfuri.slice(0, k)] });
  const scobit = laturiBucla(de(0));
  assert.ok(aproape(scobit.P, 210 + A, 1e-9));
  egale(scobit.laturi.map((x) => x.s0), [0, 80, 110, 145 + A, 180 + A], 'pornirile');
  egale(scobit.laturi.map((x) => x.lungime), [80, 30, 35, 35, 30], 'lungimile');
  // Pornită imediat după arc (prima și ultima linie au aceeași direcție, dar între ele e arcul, la capătul buclei).
  egale(laturiBucla(de(4)).laturi.map((x) => x.lungime), [35, 30, 80, 30, 35], 'după arc');
  egale(laturiBucla(de(4)).laturi.map((x) => x.s0), [0, 35, 65, 145, 175], 'după arc, pornirile');
  // Pornită chiar cu arcul (prima linie nu pleacă din vârful 0).
  egale(laturiBucla(de(3)).laturi.map((x) => x.lungime), [35, 30, 80, 30, 35], 'cu arcul');
  egale(laturiBucla(de(3)).laturi.map((x) => x.s0), [A, 35 + A, 65 + A, 145 + A, 175 + A], 'cu arcul, pornirile');
  // Un ghimpe de 10 mm pe latura de sus (linia urcă și se întoarce pe ea însăși): urcușul și coborâșul sunt laturi diferite.
  const ghimpe = laturiBucla(poligon([[0, 0], [80, 0], [80, 30], [40, 30], [40, 40], [40, 30], [0, 30]]));
  assert.deepEqual(ghimpe.laturi.map((x) => x.lungime), [80, 30, 40, 10, 10, 40, 30]);
});

// ── Regulile, pe o buclă ──────────────────────────────────────────────────────────────────────

test('regulile pe dreptunghiul 80 × 30 (P = 220, W = 6): lungi, scurte, mijloc; numărul împărțit pe laturile regulii', () => {
  assert.deepEqual(urechiPeLaturi(DREPT, 'lungi', 6, 2), { cate: 2, cerute: 2, centre: [40, 150] });
  assert.deepEqual(urechiPeLaturi(DREPT, 'scurte', 6, 2), { cate: 2, cerute: 2, centre: [95, 205] });
  // La mijlocul fiecărei laturi: patru, oricât ar spune numărul.
  assert.deepEqual(urechiPeLaturi(DREPT, 'mijloc', 6, 2), { cate: 4, cerute: 4, centre: [40, 95, 150, 205] });
  assert.deepEqual(urechiPeLaturi(DREPT, 'mijloc', 6, 7), { cate: 4, cerute: 4, centre: [40, 95, 150, 205] });
  // Patru pe laturile lungi: câte două, la un sfert și la trei sferturi din latură.
  assert.deepEqual(urechiPeLaturi(DREPT, 'lungi', 6, 4), { cate: 4, cerute: 4, centre: [20, 60, 130, 170] });
  // Trei: una pe fiecare, iar restul de una, pe prima latură lungă a drumului (două pe ea, la 20 și 60).
  assert.deepEqual(urechiPeLaturi(DREPT, 'lungi', 6, 3), { cate: 3, cerute: 3, centre: [20, 60, 150] });
  // Una singură: pe prima latură lungă.
  assert.deepEqual(urechiPeLaturi(DREPT, 'lungi', 6, 1), { cate: 1, cerute: 1, centre: [40] });
  // Bucla pornită din mijlocul laturii de jos: urechea ei cade chiar în vârful 0 (180 + 40 = P), iar centrele ies crescătoare.
  assert.deepEqual(urechiPeLaturi(poligon([[40, 0], [80, 0], [80, 30], [0, 30], [0, 0]]), 'lungi', 6, 2), { cate: 2, cerute: 2, centre: [0, 110] });
  // Pe drumul cu colțuri rotunde, aceleași locuri, mutate cu arcele de dinainte.
  egale(urechiPeLaturi(DRUM, 'scurte', 6, 2)?.centre ?? [], [80 + SFERT + 15, 190 + 3 * SFERT + 15], 'scurte pe drum');
  egale(urechiPeLaturi(DRUM, 'lungi', 6, 2)?.centre ?? [], [40, 110 + 2 * SFERT + 40], 'lungi pe drum');
});

test('cât încap: zece urechi de 6 mm pe laturile scurte de 30 dau opt (patru pe fiecare: 6 ≤ 0,9 · 30 / 4, dar 6 > 0,9 · 30 / 5)', () => {
  assert.deepEqual(urechiPeLaturi(DREPT, 'scurte', 6, 10), { cate: 8, cerute: 10, centre: [83.75, 91.25, 98.75, 106.25, 193.75, 201.25, 208.75, 216.25] });
  // Pe laturile lungi, 0,9 · 80 / 6 = 12 e chiar la limită: cu rezerva de rotunjire (ca lucrarea să nu refuze la egalitate)
  // încap unsprezece pe fiecare, deci treizeci cerute dau douăzeci și două.
  const r = urechiPeLaturi(DREPT, 'lungi', 6, 30);
  assert.equal(r?.cate, 22);
  assert.equal(r?.cerute, 30);
  egale((r?.centre ?? []).slice(0, 2), [40 / 11, 120 / 11], 'primele două, la (j + ½) · 80 / 11');
});

test('o latură pe care nu încape o ureche nu numără: teșiturile mici, laturile scurte sub W / 0,9', () => {
  // Dreptunghiul 80 × 30 cu colțurile teșite la 4 mm: laturile de 72 și 22, teșiturile de 4√2 = 5,657 (0,9 · 5,657 < 6).
  const c = 4 * Math.SQRT2;
  const tesit = poligon([[4, 0], [76, 0], [80, 4], [80, 26], [76, 30], [4, 30], [0, 26], [0, 4]]);
  egale(urechiPeLaturi(tesit, 'scurte', 6, 2)?.centre ?? [], [72 + c + 11, 166 + 3 * c + 11], 'scurte, fără teșituri');
  egale(urechiPeLaturi(tesit, 'mijloc', 6, 1)?.centre ?? [], [36, 72 + c + 11, 94 + 2 * c + 36, 166 + 3 * c + 11], 'mijloc, fără teșituri');
  // Cu urechi de 5 mm, teșiturile țin o ureche (5 ≤ 0,9 · 5,657): ele sunt laturile scurte; două, pe teșituri opuse.
  egale(urechiPeLaturi(tesit, 'scurte', 5, 2)?.centre ?? [], [72 + c / 2, 166 + 2 * c + c / 2], 'scurte, pe teșituri');
  // O ureche de 28 mm nu încape pe laturile de 30 (0,9 · 30 = 27): cele mai scurte laturi pe care încape sunt cele de 80.
  assert.deepEqual(urechiPeLaturi(DREPT, 'scurte', 28, 2), { cate: 2, cerute: 2, centre: [40, 150] });
  // Chiar la limită (27 = 0,9 · 30), latura nu numără: cu rezerva de rotunjire, lucrarea n-ar primi nicio ureche pe ea.
  assert.deepEqual(urechiPeLaturi(DREPT, 'scurte', 27, 2), { cate: 2, cerute: 2, centre: [40, 150] });
  // Nicio latură pe care să încapă: fără laturi (bucla rămâne la distanțe egale).
  assert.equal(urechiPeLaturi(DREPT, 'lungi', 80, 2), null);
  assert.equal(urechiPeLaturi(conturCerc(50, 50, 20), 'lungi', 6, 2), null);
  // Un cerc din 720 de linii de 0,17 mm: nicio latură.
  const multe = poligon(Array.from({ length: 720 }, (_, k): [number, number] => [50 + 20 * Math.cos((2 * Math.PI * k) / 720), 50 + 20 * Math.sin((2 * Math.PI * k) / 720)]));
  assert.equal(urechiPeLaturi(multe, 'mijloc', 6, 2), null);
});

test('laturile egale: pe un pătrat, două urechi stau pe laturi opuse; la mai puțin de 1 % diferență, laturile sunt la fel de lungi', () => {
  const patrat = conturDreptunghi(0, 0, 40, 40);
  assert.deepEqual(urechiPeLaturi(patrat, 'lungi', 6, 2), { cate: 2, cerute: 2, centre: [20, 100] });
  assert.deepEqual(urechiPeLaturi(patrat, 'scurte', 6, 2), { cate: 2, cerute: 2, centre: [20, 100] });
  assert.deepEqual(urechiPeLaturi(patrat, 'lungi', 6, 3), { cate: 3, cerute: 3, centre: [20, 60, 100] });
  assert.deepEqual(urechiPeLaturi(patrat, 'lungi', 6, 6), { cate: 6, cerute: 6, centre: [10, 30, 60, 90, 110, 140] });
  // 80 × 79,5 (0,6 % diferență): toate patru sunt „lungi”; 80 × 79 (1,25 %): doar cele de 80.
  assert.deepEqual(urechiPeLaturi(conturDreptunghi(0, 0, 80, 79.5), 'lungi', 6, 4)?.centre, [40, 119.75, 199.5, 279.25]);
  assert.deepEqual(urechiPeLaturi(conturDreptunghi(0, 0, 80, 79), 'lungi', 6, 2)?.centre, [40, 199]);
  assert.deepEqual(urechiPeLaturi(conturDreptunghi(0, 0, 80, 79), 'scurte', 6, 2)?.centre, [119.5, 278.5]);
  // Și la „scurte”: laturile de 30 și 30,2 (0,7 % diferență) sunt amândouă cele scurte, câte o ureche pe fiecare.
  const sus = Math.hypot(80, 0.2);
  egale(urechiPeLaturi(poligon([[0, 0], [80, 0], [80, 30], [0, 30.2]]), 'scurte', 6, 2)?.centre ?? [], [95, 110 + sus + 15.1], 'scurte, aproape egale');
});

test('o formă în L: cea mai lungă latură e una singură (două urechi pe ea, la 25 și 75), cea mai scurtă la fel', () => {
  // Laturile, în ordinea drumului: 100, 40, 40, 30, 60, 70.
  const l = poligon([[0, 0], [100, 0], [100, 40], [60, 40], [60, 70], [0, 70]]);
  assert.deepEqual(urechiPeLaturi(l, 'lungi', 6, 2), { cate: 2, cerute: 2, centre: [25, 75] });
  assert.deepEqual(urechiPeLaturi(l, 'scurte', 6, 1), { cate: 1, cerute: 1, centre: [195] });
  assert.deepEqual(urechiPeLaturi(l, 'mijloc', 6, 1)?.centre, [50, 120, 160, 195, 240, 305]);
});

// ── Buclele unei tăieturi ─────────────────────────────────────────────────────────────────────

test('buclele unei tăieturi: fără nicio latură, nimic (rămân „egale”); lângă o buclă cu laturi, una fără rămâne la distanțe egale', () => {
  const cerc = conturCerc(50, 50, 20), P = 40 * Math.PI;
  assert.equal(centrePeLaturi([cerc], 'lungi', 6, 2), null);
  const r = centrePeLaturi([DREPT, cerc], 'lungi', 6, 2);
  assert.ok(r !== null && typeof r !== 'string');
  tabele(r.centre, [[40, 150], [P / 4, (3 * P) / 4]], 'centrele');
  // Semnele sunt doar ale urechilor puse după regulă; nicio buclă cu mai puține.
  assert.deepEqual(r.semne, [{ j: 0, s: 40 }, { j: 0, s: 150 }]);
  assert.deepEqual(r.putine, []);
  // Mai puține decât numărul: bucla, câte au încăput, câte se cer.
  const p = centrePeLaturi([cerc, DREPT], 'scurte', 6, 10);
  assert.ok(p !== null && typeof p !== 'string');
  assert.deepEqual(p.putine, [{ j: 1, k: 8, n: 10 }]);
  assert.equal(p.centre[0]?.length, 10);
  // „Mijloc” n-are mai puține: numărul lui e câte laturi sunt.
  const m = centrePeLaturi([DREPT], 'mijloc', 6, 9);
  assert.ok(m !== null && typeof m !== 'string');
  assert.deepEqual(m.putine, []);
  // Bucla fără laturi pe care nu încap urechile la distanțe egale: refuzul modului „egale” (ADR 0028), cu bucla.
  const mic = centrePeLaturi([DREPT, conturCerc(50, 50, 1)], 'lungi', 6, 2);
  assert.ok(typeof mic === 'string' && mic.includes('urechile nu încap') && mic.includes('bucla 2'), String(mic));
});

// ── Lucrarea întreagă, pe exemplul din ADR ────────────────────────────────────────────────────

const cuRegula = (mod: 'lungi' | 'scurte' | 'mijloc', numar = 2, op: Parameters<typeof documentCu>[0] = {}, forma?: Radacina) =>
  programDinDocument(documentCu({ urechi: { numar, latime: 6, grosime: 2, mod }, ...op }, forma));

test('lucrarea, „scurte”: exact programul locurilor alese în (0, 15) și (80, 15); semnele, pe drum, la mijlocul laturilor scurte', () => {
  const r = cuRegula('scurte');
  const alese = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri: { e: [{ x: 0, y: 15 }, { x: 80, y: 15 }] } } }));
  assert.ok(r.ok && alese.ok, r.ok ? (alese.ok ? '' : alese.motiv) : r.motiv);
  assert.deepEqual(r.program, alese.program);
  tabele(mijloace(citeste(r.program.miscari, VARF).paliere), [[-R, 15, 6], [80 + R, 15, 6]], 'palierele');
  const semne = (r.urechiLemn ?? []).map((q) => [q.x - X0, q.y - Y0]).sort((a, b) => (a[0] as number) - (b[0] as number));
  tabele(semne, [[-R, 15], [80 + R, 15]], 'semnele');
  assert.deepEqual(r.avertismente, []);
});

test('lucrarea, „lungi”: palierele la y = −R și y = 30 + R, de la x = 37 la 43; fiecare trecere pornește la mijlocul unei laturi scurte', () => {
  const r = cuRegula('lungi');
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const { paliere, porniri } = citeste(r.program.miscari, VARF);
  tabele(mijloace(paliere), [[40, -R, 6], [40, 30 + R, 6]], 'palierele');
  assert.ok(paliere.every((p) => aproape(Math.min(p.x0, p.x1), X0 + 37, 1e-6) && aproape(Math.max(p.x0, p.x1), X0 + 43, 1e-6)), JSON.stringify(paliere));
  // Trei treceri (6, 12, 18); pornirea în mijlocul celui mai lung gol dintre urechi: la mijlocul unei laturi scurte.
  assert.equal(porniri.length, 3);
  for (const s of porniri) {
    assert.ok(aproape(s.y, Y0 + 15, 1e-6) && (aproape(s.x, X0 - R, 1e-6) || aproape(s.x, X0 + 80 + R, 1e-6)), JSON.stringify(s));
  }
  // Patru: la x = 20 și x = 60, pe ambele laturi lungi.
  const patru = cuRegula('lungi', 4);
  assert.ok(patru.ok, patru.ok ? '' : patru.motiv);
  tabele(mijloace(citeste(patru.program.miscari, VARF).paliere), [[20, -R, 6], [20, 30 + R, 6], [60, -R, 6], [60, 30 + R, 6]], 'patru');
});

test('lucrarea, „mijloc”: câte o ureche la mijlocul fiecărei laturi, oricare ar fi numărul', () => {
  for (const numar of [1, 2, 9]) {
    const r = cuRegula('mijloc', numar);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    tabele(mijloace(citeste(r.program.miscari, VARF).paliere), [[-R, 15, 6], [40, -R, 6], [40, 30 + R, 6], [80 + R, 15, 6]], `numărul ${numar}`);
    assert.deepEqual(r.avertismente, []);
    assert.equal(r.urechiLemn?.length, 4);
  }
});

test('lucrarea: fără laturi drepte (un cerc), regula dă programul modului „egale”, octet cu octet, fără semne', () => {
  const cerc: Radacina = { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 20 }, matrice: { ...I, e: 30, f: 30 } };
  const fara = programDinDocument(documentCu({ urechi: { numar: 3, latime: 6, grosime: 2 } }, cerc));
  const gol = programDinDocument(documentCu({ urechi: null }, cerc));
  assert.ok(fara.ok && gol.ok, fara.ok ? '' : fara.motiv);
  // Programul modului „egale” are urechi (altfel egalitatea de mai jos n-ar spune nimic).
  assert.notDeepEqual(fara.program, gol.program);
  for (const mod of ['lungi', 'scurte', 'mijloc'] as const) {
    const r = cuRegula(mod, 3, {}, cerc);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    assert.deepEqual(r.program, fara.program, mod);
    assert.equal(r.urechiLemn, undefined, mod);
  }
  // Și refuzul lui: 21 de urechi de 6 mm nu încap pe cercul frezei, de 2π · 21,5875 = 135,6 mm (6 > 0,9 · 6,46).
  const multe = cuRegula('lungi', 21, {}, cerc);
  assert.ok(!multe.ok && multe.motiv.includes('urechile nu încap'), multe.ok ? '' : multe.motiv);
});

test('lucrarea: regula ține și cu rampă, cu intrări și pe linie; pe laturile scurte, zece urechi dau opt, cu avertisment', () => {
  const scurte = [[-R, 15, 6], [80 + R, 15, 6]];
  const cuRampa = cuRegula('scurte', 2, { rampa: { lungime: 20 } });
  assert.ok(cuRampa.ok, cuRampa.ok ? '' : cuRampa.motiv);
  contine(mijloace(citeste(cuRampa.program.miscari, VARF).paliere), scurte, 'cu rampă');
  const cuIntrari = cuRegula('scurte', 2, { intrari: { raza: 3 } });
  assert.ok(cuIntrari.ok, cuIntrari.ok ? '' : cuIntrari.motiv);
  tabele(mijloace(citeste(cuIntrari.program.miscari, VARF).paliere), scurte, 'cu intrări');
  // Pe linie, drumul e chiar conturul: palierele la x = 0 și x = 80.
  const peLinie = cuRegula('scurte', 2, { latura: 'pe-linie' });
  assert.ok(peLinie.ok, peLinie.ok ? '' : peLinie.motiv);
  tabele(mijloace(citeste(peLinie.program.miscari, VARF).paliere), [[0, 15, 6], [80, 15, 6]], 'pe linie');
  // Pe dinăuntru (o gaură 80 × 30), drumul are laturile de 80 − 2R și 30 − 2R: palierele la x = R și x = 80 − R.
  const interior = cuRegula('scurte', 2, { latura: 'interior' });
  assert.ok(interior.ok, interior.ok ? '' : interior.motiv);
  tabele(mijloace(citeste(interior.program.miscari, VARF).paliere), [[R, 15, 6], [80 - R, 15, 6]], 'pe dinăuntru');
  // Zece cerute, opt încap (patru pe fiecare latură scurtă): nimic nu se micșorează pe tăcute.
  const zece = cuRegula('scurte', 10);
  assert.ok(zece.ok, zece.ok ? '' : zece.motiv);
  assert.equal(citeste(zece.program.miscari, VARF).paliere.length, 8);
  assert.deepEqual(zece.avertismente, ['urechile pe laturile scurte: o buclă are mai puține urechi decât cere numărul, fiindcă pe laturile ei nu încap mai multe: i1/e: 8 din 10']);
  const treizeci = cuRegula('lungi', 30);
  assert.ok(treizeci.ok, treizeci.ok ? '' : treizeci.motiv);
  assert.deepEqual(treizeci.avertismente, ['urechile pe laturile lungi: o buclă are mai puține urechi decât cere numărul, fiindcă pe laturile ei nu încap mai multe: i1/e: 22 din 30']);
});

test('lucrarea: refuzurile urechilor rămân (puntea cât foaia, urechea mai scurtă decât freza); „egale” scris dă programul fără mod', () => {
  const groasa = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 18, mod: 'lungi' } }));
  assert.ok(!groasa.ok && groasa.motiv.includes('nu încap în foaia'), groasa.ok ? '' : groasa.motiv);
  const scurta = programDinDocument(documentCu({ urechi: { numar: 2, latime: 3, grosime: 2, mod: 'mijloc' } }));
  assert.ok(!scurta.ok && scurta.motiv.includes('mai scurte decât diametrul frezei'), scurta.ok ? '' : scurta.motiv);
  const scris = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2, mod: 'egale' } }));
  const fara = programDinDocument(documentCu({ urechi: { numar: 2, latime: 6, grosime: 2 } }));
  assert.ok(scris.ok && fara.ok);
  assert.deepEqual(scris.program, fara.program);
  // Regula schimbă programul față de „egale” (altfel proba de mai sus n-ar spune nimic).
  const lungi = cuRegula('lungi');
  assert.ok(lungi.ok);
  assert.notDeepEqual(lungi.program, fara.program);
});

// ── Două bucle: una cu laturi, una fără ───────────────────────────────────────────────────────

/**
 * Un dreptunghi 40 × 20 și un disc de rază 15 (centrul în (59, 10)), legate printr-un gât de 2 mm (sub diametrul frezei), tăiate
 * pe dinăuntru cu Ø3,175: drumul frezei are două bucle. Cea din dreptunghi are laturile de jos și de sus de 40 − 2R = 36,825, pe
 * cea din stânga de 20 − 2R = 16,825 și, în dreapta, două jumătăți de 9 − R = 7,4125 (gura gâtului le desparte cu două arce).
 * Cea din disc are doar arce.
 */
const HALTERA: Radacina = (() => {
  const xg = 59 - Math.sqrt(224);
  const ocol = Math.tan((2 * Math.PI - 2 * Math.atan2(1, Math.sqrt(224))) / 4);
  const L = { tip: 'L' } as const;
  return {
    tip: 'element', id: 'e', matrice: { ...I },
    forma: {
      tip: 'cale', inchis: true,
      varfuri: [
        { p: { x: 0, y: 0 }, s: L }, { p: { x: 40, y: 0 }, s: L }, { p: { x: 40, y: 9 }, s: L }, { p: { x: xg, y: 9 }, s: { tip: 'A', bulge: ocol } },
        { p: { x: xg, y: 11 }, s: L }, { p: { x: 40, y: 11 }, s: L }, { p: { x: 40, y: 20 }, s: L }, { p: { x: 0, y: 20 }, s: L },
      ],
    },
  };
})();
/** Câte urechi are bucla discului: mișcările pe arc la Z = −vârf (palierul unei urechi e un singur arc). */
const peArce = (r: ReturnType<typeof cuRegula>): number => (r.ok ? r.program.miscari.filter((m) => m.tip === 'arc' && aproape(m.la.Z ?? 0, -VARF)).length : -1);

test('lucrarea, două bucle: regula pe bucla cu laturi, distanțe egale pe cea fără; refuzul și avertismentul spun bucla', () => {
  const lungi = cuRegula('lungi', 2, { latura: 'interior' }, HALTERA);
  assert.ok(lungi.ok, lungi.ok ? '' : lungi.motiv);
  tabele(mijloace(citeste(lungi.program.miscari, VARF).paliere), [[20, R, 6], [20, 20 - R, 6]], 'lungi');
  assert.equal(peArce(lungi), 2);
  // Semnele sunt doar ale urechilor puse după regulă (cele două de pe laturile lungi).
  assert.equal(lungi.urechiLemn?.length, 2);
  const scurte = cuRegula('scurte', 2, { latura: 'interior' }, HALTERA);
  assert.ok(scurte.ok, scurte.ok ? '' : scurte.motiv);
  tabele(mijloace(citeste(scurte.program.miscari, VARF).paliere), [[40 - R, (R + 9) / 2, 6], [40 - R, (11 + 20 - R) / 2, 6]], 'scurte');
  const mijloc = cuRegula('mijloc', 2, { latura: 'interior' }, HALTERA);
  assert.ok(mijloc.ok, mijloc.ok ? '' : mijloc.motiv);
  tabele(mijloace(citeste(mijloc.program.miscari, VARF).paliere),
    [[R, 10, 6], [20, R, 6], [20, 20 - R, 6], [40 - R, (R + 9) / 2, 6], [40 - R, (11 + 20 - R) / 2, 6]], 'mijloc');
  assert.equal(peArce(mijloc), 2);
  // Pe bucla discului (84,4 mm), 14 urechi de 6 mm nu încap la distanțe egale: refuzul modului „egale”, cu bucla.
  const multe = cuRegula('lungi', 14, { latura: 'interior' }, HALTERA);
  assert.ok(!multe.ok && /^i1\/e: bucla 1, fără laturi drepte: urechile nu încap: 14 urechi de 6 mm pe o buclă de 84\.4\d mm/.test(multe.motiv), multe.ok ? '' : multe.motiv);
  // 12 încap pe disc; pe laturile lungi ale dreptunghiului, doar cinci pe fiecare (6 ≤ 0,9 · 36,825 / 5): avertismentul numește bucla.
  const zece = cuRegula('lungi', 12, { latura: 'interior' }, HALTERA);
  assert.ok(zece.ok, zece.ok ? '' : zece.motiv);
  assert.equal(citeste(zece.program.miscari, VARF).paliere.length, 10);
  assert.equal(peArce(zece), 12);
  assert.deepEqual(zece.avertismente, ['urechile pe laturile lungi: o buclă are mai puține urechi decât cere numărul, fiindcă pe laturile ei nu încap mai multe: i1/e (bucla 2): 10 din 12']);
});

