/**
 * Alipirea la prinderi în vederea „Modelul” a atelierului Easy 3Draw (ADR 0284, partea D; felia 3.Cf-1), pe funcțiile pure
 * ale motorului:
 * - fiecare piesă din model are o transformare (o matrice de rotație și o mutare, în mm): cea de pe grilă e chiar așezarea
 *   din ADR 0283;
 * - o piesă **prinsă** stă cu prinderea ei pe prinderea aleasă a bazei (`montaj`, felia 3.Ce) și **urmează baza**: oricum
 *   ar fi mutată sau rotită baza, prinderile rămân una peste alta; lanțurile (o roată pe un ax pe o grindă) se compun;
 * - rotirea în jurul prinderii, glisarea de-a lungul ei, altă prindere a piesei;
 * - o piesă **liberă** (desprinsă) își ține locul; un model stricat (baza lipsă, un cerc, un indice greșit) nu aruncă:
 *   piesa cade pe locul ei de pe grilă;
 * - o piesă desprinsă care stă drept pe grilă e din nou o piesă de pe grilă (`grilaDinTransf`, inversa așezării); una
 *   întoarsă rămâne liberă: se mută în mm și se rotește în jurul verticalei prin mijlocul cutiei ei (`rotitLiber`);
 * - o piesă schimbată în editor își ține legăturile cât prinderile ei rămân în același loc (`prindereaRamasa`).
 * Valorile sunt pe hârtie, din cotele pieselor: cărămida 2 × 4 (31,8 × 15,8 × 11,5; știfturile la 3,9 + 8·i), placa 2 × 2,
 * grinda de 3 (găurile la 3,6 + 8·k), axul de 3 (23,8 mm, axa la 2,375), roata de 24 (26 mm, groasă de 3,8).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, type Piesa } from './ajutor-plasa-lego.ts';

type P3 = [number, number, number];
type Def = Record<string, unknown> & { tip: string };
type Prindere = { fel: string; p: number[]; d: number[]; lung: number };
type Transf = { m: number[]; t: number[] };
type Asezare = { gw: number; gd: number; pivot: number[]; ax: boolean };
type Corp = Piesa & { ax: number[] | null; prinderi: Prindere[] };
type Prins = { de: string; a: number; b: number; unghi?: number; alunec?: number };
type PiesaModel = { id: string; grila: Transf; prinderi: readonly Prindere[]; prins?: Prins | null; liber?: Transf | null };
type Rezolvat = { T: Transf; fel: string };
const Lm = L as unknown as {
  construieste(d: Def): Corp;
  asezareModel(d: Def, corp?: Corp): Asezare;
  transfGrila(a: Asezare, x: number, y: number, z: number, rot: number): Transf;
  transfPrins(a: Prindere, b: Prindere, unghi?: number, alunec?: number): Transf;
  compuneTransf(A: Transf, B: Transf): Transf;
  aplicaTransf(T: Transf, p: readonly number[]): number[];
  potriviriPrindere(a: Prindere, lista: readonly Prindere[]): number[];
  seGliseaza(a: string, b: string): boolean;
  rezolvaModel(piese: readonly PiesaModel[]): Rezolvat[];
  grilaDinTransf(a: Asezare, T: Transf): { x: number; y: number; z: number; rot: number } | null;
  cutieTransf(T: Transf, dim: readonly number[]): [number[], number[]];
  rotitLiber(T: Transf, dim: readonly number[]): Transf;
  prindereaRamasa(veche: Prindere, noi: readonly Prindere[]): number;
};
const r3 = (v: number) => Math.round(v * 1000) / 1000 + 0;
const p3 = (v: readonly number[]) => [...v].map(r3);
const rand = (n: number, m = 1): [number, number][] => Array.from({ length: n * m }, (_, k): [number, number] => [k % n, Math.floor(k / n)]);

const CARAMIDA: Def = { tip: 'caramida', celule: rand(4, 2) }, PLACA: Def = { tip: 'caramida', celule: rand(2, 2), placi: 1 };
const GRINDA: Def = { tip: 'grinda' }, AX: Def = { tip: 'ax', lung: 3 }, ROATA: Def = { tip: 'rotita' };
const corpuri = new Map<string, Corp>();
const fa = (d: Def): Corp => { const k = JSON.stringify(d); let c = corpuri.get(k); if (!c) { c = Lm.construieste(d); corpuri.set(k, c); } return c; };
/** Prinderile piesei, într-un tablou al probei (cele ale motorului vin din alt tărâm, iar `map` l-ar păstra). */
const pr = (d: Def): Prindere[] => [...fa(d).prinderi];
/** Transformarea piesei puse pe grilă la x, y (știfturi), z (plăci), rotită. */
const grila = (d: Def, x: number, y: number, z = 0, rot = 0) => Lm.transfGrila(Lm.asezareModel(d, fa(d)), x, y, z, rot);
const la = (T: Transf, p: readonly number[]) => p3(Lm.aplicaTransf(T, p));
/** Cutia piesei în lume: colțurile cutiei ei, duse cu transformarea. */
function cutie(T: Transf, d: Def): [number[], number[]] {
  const [X, Y, Z] = fa(d).dim as [number, number, number], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const x of [0, X]) for (const y of [0, Y]) for (const z of [0, Z]) Lm.aplicaTransf(T, [x, y, z]).forEach((v, k) => { lo[k] = Math.min(lo[k]!, v); hi[k] = Math.max(hi[k]!, v); });
  return [p3(lo), p3(hi)];
}
const piesa = (id: string, d: Def, g: Transf, rest: Partial<PiesaModel> = {}): PiesaModel => ({ id, grila: g, prinderi: pr(d), ...rest });
const rezolva = (l: readonly PiesaModel[]) => [...Lm.rezolvaModel(l)].map((r) => ({ fel: r.fel, T: { m: [...r.T.m], t: [...r.T.t] } }));

test('prinderile mostrelor, în ordinea motorului: locașurile, apoi știfturile; gurile găurilor, sus și jos', () => {
  assert.deepEqual(pr(CARAMIDA).map((c) => c.fel), [...Array<string>(8).fill('locas'), ...Array<string>(8).fill('stift')]);
  assert.deepEqual(p3(pr(CARAMIDA)[8]!.p), [3.9, 3.9, 9.6]);
  assert.deepEqual(p3(pr(CARAMIDA)[15]!.p), [27.9, 11.9, 9.6]);
  assert.deepEqual(pr(PLACA).map((c) => c.fel), ['locas', 'locas', 'locas', 'locas', 'stift', 'stift', 'stift', 'stift']);
  assert.deepEqual(pr(GRINDA).map((c) => [c.fel, ...p3(c.p)]), [['gauraStift', 3.6, 3.6, 7.8], ['gauraStift', 3.6, 3.6, 0], ['gauraStift', 11.6, 3.6, 7.8],
    ['gauraStift', 11.6, 3.6, 0], ['gauraStift', 19.6, 3.6, 7.8], ['gauraStift', 19.6, 3.6, 0]]);
  assert.deepEqual(pr(AX).map((c) => [c.fel, ...p3(c.p), ...p3(c.d)]), [['capatAx', 0, 2.375, 2.375, 1, 0, 0], ['capatAx', 23.8, 2.375, 2.375, -1, 0, 0]]);
  assert.deepEqual(pr(ROATA).map((c) => [c.fel, ...p3(c.p)]), [['gauraAx', 13, 13, 3.8], ['gauraAx', 13, 13, 0]]);
});

test('transformarea de pe grilă e așezarea din ADR 0283: știfturile cad pe centrele grilei, axul unei roți, pe un știft', () => {
  // cărămida 2 × 4 la 1, 2, cu 3 plăci mai sus: primul ei știft (3,9, 3,9, 9,6) e la (12, 20, 19,2)
  const T = grila(CARAMIDA, 1, 2, 3);
  assert.deepEqual(p3(T.m), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(p3(T.t), [8.1, 16.1, 9.6]);
  assert.deepEqual(la(T, pr(CARAMIDA)[8]!.p), [12, 20, 19.2]);
  // rotită un sfert de tură în jurul mijlocului ei (pus la (16, 32)): același știft e la (20, 20, 19,2); ultimul, la (12, 44, 19,2)
  const R = grila(CARAMIDA, 1, 2, 3, 1);
  assert.deepEqual(p3(R.m), [0, -1, 0, 1, 0, 0, 0, 0, 1]);
  assert.deepEqual(la(R, pr(CARAMIDA)[8]!.p), [20, 20, 19.2]);
  assert.deepEqual(la(R, pr(CARAMIDA)[15]!.p), [12, 44, 19.2]);
  assert.deepEqual(cutie(R, CARAMIDA), [[8.1, 16.1, 9.6], [23.9, 47.9, 21.1]]);
  // roata de 16 (axul la 9, 9 în plasa ei) la 2, 3, oricum ar fi rotită: axul la (28, 36)
  for (let rot = 0; rot < 4; rot++) assert.deepEqual(la(grila({ tip: 'rotita', dinti: 16 }, 2, 3, 0, rot), [9, 9, 0]), [28, 36, 0], `rotirea ${rot}`);
  // grinda de 3 la 0, 0: găurile ei pe centrele știfturilor
  assert.deepEqual([0, 2, 4].map((k) => la(grila(GRINDA, 0, 0), pr(GRINDA)[k]!.p)), [[4, 4, 7.8], [12, 4, 7.8], [20, 4, 7.8]]);
  // rotirile sunt exacte (fără 6e-17 în matrice), deci pozițiile de pe grilă n-au zgomot
  for (let rot = 0; rot < 8; rot++) for (const v of grila(CARAMIDA, 0, 0, 0, rot).m) assert.ok(v === 0 || v === 1 || v === -1, `rotirea ${rot}: ${v}`);
  // rotirea se numără în sferturi de tură, în orice sens: cinci sferturi sunt unul, iar unul înapoi, trei
  const egal = (A: Transf, B: Transf) => assert.deepEqual([p3(A.m), p3(A.t)], [p3(B.m), p3(B.t)]);
  egal(grila(CARAMIDA, 1, 2, 3, 5), grila(CARAMIDA, 1, 2, 3, 1));
  egal(grila(CARAMIDA, 1, 2, 3, -1), grila(CARAMIDA, 1, 2, 3, 3));
});

test('compunerea: A∘B duce un punct întâi cu B, apoi cu A', () => {
  const A = grila(CARAMIDA, 1, 2, 3, 1), B = grila(PLACA, -2, 5, 1, 3), p = [1.5, -2, 4];
  assert.deepEqual(la(Lm.compuneTransf(A, B), p), la(A, Lm.aplicaTransf(B, p)));
  const I: Transf = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
  assert.deepEqual(la(Lm.compuneTransf(I, A), p), la(A, p));
  assert.deepEqual(la(Lm.compuneTransf(A, I), p), la(A, p));
});

test('știftul în locaș: placa 2 × 2 prinsă cu locașul ei pe ultimul știft al cărămizii stă pe colțul ei, ca la LEGO', () => {
  const a = pr(CARAMIDA)[15]!, b = pr(PLACA)[0]!, M = Lm.transfPrins(a, b);
  // în coordonatele cărămizii: aceeași orientare, mutată cu (24, 8, 9,6)
  assert.deepEqual(p3(M.m), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(p3(M.t), [24, 8, 9.6]);
  const baza = grila(CARAMIDA, 0, 0), T = Lm.compuneTransf(baza, M);
  // în lume: știftul la (28, 12, 9,6), locașul plăcii pe el; placa ține x 24,1…39,9, y 8,1…23,9, z 9,6…14,7
  assert.deepEqual(la(baza, a.p), [28, 12, 9.6]);
  assert.deepEqual(la(T, b.p), [28, 12, 9.6]);
  assert.deepEqual(cutie(T, PLACA), [[24.1, 8.1, 9.6], [39.9, 23.9, 14.7]]);
  // rotită un sfert de tură în jurul știftului: x 16,1…31,9, y 8,1…23,9
  const R = Lm.compuneTransf(baza, Lm.transfPrins(a, b, 90));
  assert.deepEqual(la(R, b.p), [28, 12, 9.6]);
  assert.deepEqual(cutie(R, PLACA), [[16.1, 8.1, 9.6], [31.9, 23.9, 14.7]]);
  // altă prindere a plăcii (locașul 3, colțul opus): placa se mută cu un știft pe fiecare axă
  assert.deepEqual(cutie(Lm.compuneTransf(baza, Lm.transfPrins(a, pr(PLACA)[3]!)), PLACA), [[16.1, 0.1, 9.6], [31.9, 15.9, 14.7]]);
});

test('piesa prinsă urmează baza: oricum e mutată și rotită baza, prinderile rămân una peste alta', () => {
  const a = pr(CARAMIDA)[15]!, b = pr(PLACA)[0]!;
  // baza la 2, −1, cu 3 plăci mai sus, rotită un sfert: știftul 15 e la (20, 20, 19,2); placa ține x 8,1…23,9, y 16,1…31,9
  const model = (x: number, y: number, z: number, rot: number) => rezolva([piesa('b', CARAMIDA, grila(CARAMIDA, x, y, z, rot)),
    piesa('p', PLACA, grila(PLACA, 9, 9), { prins: { de: 'b', a: 15, b: 0 } })]);
  const [B, P] = model(2, -1, 3, 1) as [Rezolvat, Rezolvat];
  assert.deepEqual([B.fel, P.fel], ['grila', 'prins']);
  assert.deepEqual(la(B.T, a.p), [20, 20, 19.2]);
  assert.deepEqual(la(P.T, b.p), [20, 20, 19.2]);
  assert.deepEqual(cutie(P.T, PLACA), [[8.1, 16.1, 19.2], [23.9, 31.9, 24.3]]);
  // pe toate locurile și rotirile: locașul plăcii e pe știftul bazei, iar placa nu se deformează (distanțele rămân)
  for (const x of [-3, 0, 4]) for (const y of [-2, 1]) for (const z of [0, 5]) for (let rot = 0; rot < 4; rot++) {
    const [b0, p0] = model(x, y, z, rot) as [Rezolvat, Rezolvat];
    assert.deepEqual(la(p0.T, b.p), la(b0.T, a.p), `baza la ${x}, ${y}, ${z}, rotită ${rot}`);
    const [lo, hi] = cutie(p0.T, PLACA);
    assert.deepEqual([r3(hi[0]! - lo[0]!), r3(hi[1]! - lo[1]!), r3(hi[2]! - lo[2]!)], [15.8, 15.8, 5.1]);
  }
  // mutarea bazei cu un știft mută placa cu exact 8 mm
  const [, p1] = model(0, 0, 0, 0) as [Rezolvat, Rezolvat], [, p2] = model(1, 0, 0, 0) as [Rezolvat, Rezolvat];
  assert.deepEqual(p3(p2.T.t.map((v, k) => v - p1.T.t[k]!)), [8, 0, 0]);
});

test('lanțul: un ax prin gaura din mijloc a unei grinzi și o roată pe capătul lui de jos; glisarea pe ax', () => {
  // axul (capătul 1, rădăcina la 23,8) intră de sus în gaura din mijloc: axa lui la (12, 4), de la z −16 la z 7,8
  const g = piesa('g', GRINDA, grila(GRINDA, 0, 0)), ax = piesa('a', AX, grila(AX, 5, 5), { prins: { de: 'g', a: 2, b: 1 } });
  // roata, cu gura ei pe capătul de jos al axului (capătul 0): axa ei tot la (12, 4), între z −16 și z −12,2
  const roata = (alunec = 0): PiesaModel => piesa('r', ROATA, grila(ROATA, -4, -4), { prins: { de: 'a', a: 0, b: Lm.potriviriPrindere(pr(AX)[0]!, pr(ROATA))[0]!, alunec } });
  const [, A, R] = rezolva([g, ax, roata()]) as [Rezolvat, Rezolvat, Rezolvat];
  assert.deepEqual([A.fel, R.fel], ['prins', 'prins']);
  assert.deepEqual([la(A.T, [0, 2.375, 2.375]), la(A.T, [23.8, 2.375, 2.375])], [[12, 4, -16], [12, 4, 7.8]]);
  const capete = (T: Transf) => [la(T, [13, 13, 0]), la(T, [13, 13, 3.8])].sort((u, v) => u[2]! - v[2]!);
  assert.deepEqual(capete(R.T), [[12, 4, -16], [12, 4, -12.2]]);
  // ordinea din listă nu contează: roata înaintea axului, axul înaintea grinzii
  const [R2, A2] = rezolva([roata(), ax, g]) as [Rezolvat, Rezolvat];
  assert.deepEqual(capete(R2.T), [[12, 4, -16], [12, 4, -12.2]]);
  assert.deepEqual(p3(A2.T.t), p3(A.T.t));
  // glisată cu un știft pe ax (în sensul capătului lui): între z −8 și z −4,2
  assert.deepEqual(capete((rezolva([g, ax, roata(8)]) as Rezolvat[])[2]!.T), [[12, 4, -8], [12, 4, -4.2]]);
  // grinda mutată la 1, 0, cu 5 plăci mai sus: axul și roata vin cu ea, cu (8, 0, 16)
  const [, , R3] = rezolva([piesa('g', GRINDA, grila(GRINDA, 1, 0, 5)), ax, roata()]) as [Rezolvat, Rezolvat, Rezolvat];
  assert.deepEqual(capete(R3.T), [[20, 4, 0], [20, 4, 3.8]]);
  // grinda rotită un sfert (găurile pe y, la x 4): axul rămâne în gaura din mijloc, la (4, 12)
  const [, A4] = rezolva([piesa('g', GRINDA, grila(GRINDA, 0, 0, 0, 1)), ax]) as [Rezolvat, Rezolvat];
  assert.deepEqual([la(A4.T, [0, 2.375, 2.375]), la(A4.T, [23.8, 2.375, 2.375])], [[4, 12, -16], [4, 12, 7.8]]);
});

test('glisarea are sens doar pe o tijă: axul, știftul Technic și bara, nu știftul în locaș și nu bila în cupă', () => {
  for (const [a, b, da] of [['capatAx', 'gauraAx', true], ['gauraStift', 'capatAx', true], ['stiftTechnic', 'gauraStift', true], ['bara', 'clema', true],
    ['gauraBara', 'bara', true], ['stift', 'locas', false], ['locas', 'stift', false], ['bila', 'cupa', false], ['cupa', 'bila', false]] as const)
    assert.equal(Lm.seGliseaza(a, b), da, `${a} cu ${b}`);
  // două prinderi care nu se prind nu se glisează
  assert.equal(Lm.seGliseaza('stift', 'gauraAx'), false);
  // glisarea mută piesa pe direcția prinderii bazei: placa urcă de pe știft cu 5 mm
  const a = pr(CARAMIDA)[15]!, b = pr(PLACA)[0]!;
  assert.deepEqual(p3(Lm.transfPrins(a, b, 0, 5).t), [24, 8, 14.6]);
});

test('prinderile piesei noi care se potrivesc, în ordinea încercării: întâi cele care o întorc cel mai puțin', () => {
  // pe un știft (în sus) se potrivesc locașurile plăcii (în jos): toate fără nicio rotire, în ordinea lor
  assert.deepEqual([...Lm.potriviriPrindere(pr(CARAMIDA)[15]!, pr(PLACA))], [0, 1, 2, 3]);
  // într-un locaș (de dedesubt) se potrivesc știfturile plăcii
  assert.deepEqual([...Lm.potriviriPrindere(pr(CARAMIDA)[0]!, pr(PLACA))], [4, 5, 6, 7]);
  // pe gura de sus a unei găuri de știft intră un ax (în ea se rotește liber): amândouă capetele, la fel de întoarse
  assert.deepEqual([...Lm.potriviriPrindere(pr(GRINDA)[2]!, pr(AX))], [0, 1]);
  // roata pe capătul 0 al axului (care arată spre +x): gura de jos a roții (−z) se întoarce cu un sfert, ca și cea de sus
  assert.deepEqual([...Lm.potriviriPrindere(pr(AX)[0]!, pr(ROATA))].sort(), [0, 1]);
  // o cărămidă n-are ce prinde de un capăt de ax; o listă goală
  assert.deepEqual([...Lm.potriviriPrindere(pr(AX)[0]!, pr(CARAMIDA))], []);
  assert.deepEqual([...Lm.potriviriPrindere(pr(AX)[0]!, [])], []);
  // o piesă întoarsă: pe un știft în sus, locașul unei plăci stă drept (0°), deci înaintea oricărei prinderi care ar cere o rotire
  const amestec: Prindere[] = [{ fel: 'locas', p: [0, 0, 0], d: [1, 0, 0], lung: 2 }, { fel: 'locas', p: [0, 0, 0], d: [0, 0, -1], lung: 2 }, { fel: 'locas', p: [0, 0, 0], d: [0, 0, 1], lung: 2 }];
  assert.deepEqual([...Lm.potriviriPrindere(pr(CARAMIDA)[15]!, amestec)], [1, 0, 2]);
});

test('o piesă liberă își ține locul; desprinsă, nu mai urmează baza', () => {
  const b = (x: number) => piesa('b', CARAMIDA, grila(CARAMIDA, x, 0));
  const [, P] = rezolva([b(0), piesa('p', PLACA, grila(PLACA, 9, 9), { prins: { de: 'b', a: 15, b: 0 } })]) as [Rezolvat, Rezolvat];
  // desprinsă: transformarea ei de acum, ținută ca atare
  const liber = { m: [...P.T.m], t: [...P.T.t] };
  const [, L1] = rezolva([b(3), piesa('p', PLACA, grila(PLACA, 9, 9), { liber })]) as [Rezolvat, Rezolvat];
  assert.equal(L1.fel, 'liber');
  assert.deepEqual(cutie(L1.T, PLACA), [[24.1, 8.1, 9.6], [39.9, 23.9, 14.7]]);
  // o transformare stricată (numere lipsă) nu se folosește: piesa cade pe grilă
  for (const rau of [{ m: [1, 0, 0], t: [0, 0, 0] }, { m: [1, 0, 0, 0, 1, 0, 0, 0, NaN], t: [0, 0, 0] }, { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0] }]) {
    const [r] = rezolva([piesa('p', PLACA, grila(PLACA, 9, 9), { liber: rau as Transf })]) as [Rezolvat];
    assert.equal(r.fel, 'grila');
    assert.deepEqual(p3(r.T.t), p3(grila(PLACA, 9, 9).t));
  }
});

test('un model stricat nu aruncă: baza lipsă, un cerc, un indice greșit sau prinderi care nu se potrivesc dau locul de pe grilă', () => {
  const g = grila(PLACA, 9, 9), baza = piesa('b', CARAMIDA, grila(CARAMIDA, 0, 0));
  const peGrila = (l: PiesaModel[], k: number, ce: string) => { const r = rezolva(l)[k]!; assert.equal(r.fel, 'grila', ce); assert.deepEqual(p3(r.T.t), p3(l[k]!.grila.t), ce); };
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'lipsa', a: 15, b: 0 } })], 1, 'baza lipsește');
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'p', a: 4, b: 0 } })], 1, 'prinsă de ea însăși');
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'b', a: 99, b: 0 } })], 1, 'prinderea bazei nu există');
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'b', a: 15, b: 99 } })], 1, 'prinderea piesei nu există');
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'b', a: 15, b: 4 } })], 1, 'știft pe știft: nu se prind');
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'b', a: -1, b: 0 } })], 1, 'indice negativ');
  peGrila([baza, piesa('p', PLACA, g, { prins: { de: 'b', a: 1.5, b: 0 } })], 1, 'indice neîntreg');
  // un cerc (p de q, q de p): amândouă pe grilă; o piesă prinsă de una din cerc, tot pe grilă
  const cerc = [piesa('p', PLACA, g, { prins: { de: 'q', a: 4, b: 0 } }), piesa('q', PLACA, grila(PLACA, 2, 2), { prins: { de: 'p', a: 4, b: 0 } }),
    piesa('s', PLACA, grila(PLACA, 5, 5), { prins: { de: 'p', a: 5, b: 0 } })];
  peGrila(cerc, 0, 'cercul, prima'); peGrila(cerc, 1, 'cercul, a doua');
  assert.equal(rezolva(cerc)[2]!.fel, 'prins', 'piesa prinsă de una din cerc rămâne prinsă de ea, unde a căzut');
  // unghiul și glisarea care nu sunt numere se iau drept 0
  const [, P] = rezolva([baza, piesa('p', PLACA, g, { prins: { de: 'b', a: 15, b: 0, unghi: NaN, alunec: 'x' as unknown as number } })]) as [Rezolvat, Rezolvat];
  assert.equal(P.fel, 'prins');
  assert.deepEqual(cutie(P.T, PLACA), [[24.1, 8.1, 9.6], [39.9, 23.9, 14.7]]);
  // un model gol
  assert.deepEqual(rezolva([]), []);
});

test('o piesă desprinsă care stă drept pe grilă își regăsește locul: inversa așezării, pentru orice loc și rotire', () => {
  const ROTUNDA: Def = { tip: 'rotita', dinti: 16 };
  for (const d of [CARAMIDA, PLACA, GRINDA, ROATA, ROTUNDA]) {
    const a = Lm.asezareModel(d, fa(d));
    for (const rot of [0, 1, 2, 3]) for (const [x, y, z] of [[0, 0, 0], [3, 1, 3], [-2, 5, -4], [7, -3, 11]] as const) {
      const g = Lm.grilaDinTransf(a, Lm.transfGrila(a, x, y, z, rot));
      assert.deepEqual(g && { ...g }, { x, y, z, rot }, `${d.tip} la ${x}, ${y}, ${z}, rotită ${rot}`);
    }
  }
  // pe hârtie: cărămida 2 × 4 cu colțul cutiei la (24,1, 8,1, 9,6), nerotită, e la 3, 1, pe a treia placă
  const a = Lm.asezareModel(CARAMIDA, fa(CARAMIDA));
  assert.deepEqual({ ...Lm.grilaDinTransf(a, { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [24.1, 8.1, 9.6] })! }, { x: 3, y: 1, z: 3, rot: 0 });
  // rotită un sfert de tură (cutia x 24,1 … 39,9, y 8,1 … 39,9: colțul plasei, la x 39,9), e tot la 3, 1, cu amprenta 2 × 4
  assert.deepEqual({ ...Lm.grilaDinTransf(a, { m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [39.9, 8.1, 9.6] })! }, { x: 3, y: 1, z: 3, rot: 1 });
  // zgomotul de virgulă mobilă al unui lanț de compuneri nu o scoate de pe grilă
  assert.deepEqual({ ...Lm.grilaDinTransf(a, { m: [1, 1e-12, 0, -1e-12, 1, 0, 0, 0, 1], t: [24.1 + 3e-9, 8.1 - 2e-9, 9.6 + 1e-9] })! }, { x: 3, y: 1, z: 3, rot: 0 });
});

test('o piesă întoarsă, între știfturi sau între plăci nu e pe grilă: rămâne liberă', () => {
  const a = Lm.asezareModel(CARAMIDA, fa(CARAMIDA)), I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // în picioare (pe știftul lateral al altei piese)
  assert.equal(Lm.grilaDinTransf(a, { m: [1, 0, 0, 0, 0, -1, 0, 1, 0], t: [24.1, 8.1, 9.6] }), null);
  // răsturnată (cu știfturile în jos)
  assert.equal(Lm.grilaDinTransf(a, { m: [1, 0, 0, 0, -1, 0, 0, 0, -1], t: [24.1, 8.1, 9.6] }), null);
  // rotită cu 45° în jurul verticalei
  const c = Math.SQRT1_2;
  assert.equal(Lm.grilaDinTransf(a, { m: [c, -c, 0, c, c, 0, 0, 0, 1], t: [24.1, 8.1, 9.6] }), null);
  // cu 1 mm pe lângă știft, pe fiecare axă; cu o jumătate de placă mai sus
  assert.equal(Lm.grilaDinTransf(a, { m: I, t: [25.1, 8.1, 9.6] }), null);
  assert.equal(Lm.grilaDinTransf(a, { m: I, t: [24.1, 9.1, 9.6] }), null);
  assert.equal(Lm.grilaDinTransf(a, { m: I, t: [24.1, 8.1, 11.2] }), null);
  // o transformare stricată nu aruncă
  assert.equal(Lm.grilaDinTransf(a, { m: [1, 0, 0], t: [0, 0, 0] }), null);
  assert.equal(Lm.grilaDinTransf(a, { m: I, t: [NaN, 0, 0] }), null);
});

test('cutia unei piese în lume: colțurile cutiei ei, duse cu transformarea', () => {
  // cărămida 2 × 4 (31,8 × 15,8 × 11,5) în picioare, cu fundul spre +y: x rămâne, y ține înălțimea (spre −y), z ține lățimea
  const T = { m: [1, 0, 0, 0, 0, -1, 0, 1, 0], t: [0.1, 0.1, 1.7] };
  const [lo, hi] = Lm.cutieTransf(T, fa(CARAMIDA).dim);
  assert.deepEqual([p3(lo), p3(hi)], [[0.1, -11.4, 1.7], [31.9, 0.1, 17.5]]);
  // nemutată: de la origine la mărimea ei
  const [l0, h0] = Lm.cutieTransf({ m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }, [31.8, 15.8, 11.5]);
  assert.deepEqual([p3(l0), p3(h0)], [[0, 0, 0], [31.8, 15.8, 11.5]]);
});

test('rotirea unei piese libere: un sfert de tură în jurul verticalei prin mijlocul cutiei ei; mijlocul rămâne pe loc', () => {
  // cărămida în picioare: cutia x 0,1 … 31,9 (mijlocul 16), y −11,4 … 0,1 (mijlocul −5,65), z 1,7 … 17,5
  const dim = fa(CARAMIDA).dim, T = { m: [1, 0, 0, 0, 0, -1, 0, 1, 0], t: [0.1, 0.1, 1.7] };
  const R = Lm.rotitLiber(T, dim), [lo, hi] = Lm.cutieTransf(R, dim);
  // pe hârtie: lățimea de 31,8 trece pe y (−5,65 ± 15,9), grosimea de 11,5, pe x (16 ± 5,75); z neschimbat
  assert.deepEqual([p3(lo), p3(hi)], [[10.25, -21.55, 1.7], [21.75, 10.25, 17.5]]);
  // un punct al piesei, pe hârtie: colțul plasei (0, 0, 0) era la (0,1, 0,1, 1,7); față de mijloc, (−15,9, 5,75) → (−5,75, −15,9)
  assert.deepEqual(la(R, [0, 0, 0]), [10.25, -21.55, 1.7]);
  // sensul: trigonometric, privit de sus (ca rotirea de pe grilă): axa x a piesei ajunge pe +y
  assert.deepEqual(p3(R.m), [0, 0, 1, 1, 0, 0, 0, 1, 0]);
  // patru sferturi: înapoi de unde a plecat
  let Q: Transf = T;
  for (let k = 0; k < 4; k++) Q = Lm.rotitLiber(Q, dim);
  assert.deepEqual([p3(Q.m), p3(Q.t)], [T.m, T.t]);
});

test('piesa schimbată în editor: o prindere rămâne dacă are același fel, aceeași direcție și același loc de-a latul direcției', () => {
  const ramasa = (veche: Def, noua: Def) => pr(veche).map((v) => Lm.prindereaRamasa(v, pr(noua)));
  // cărămida devenită placă: știfturile coboară cu 6,4 mm (de-a lungul lor), locașurile rămân; toate își țin numărul
  assert.deepEqual(ramasa(CARAMIDA, { tip: 'caramida', celule: rand(4, 2), placi: 1 }), Array.from({ length: 16 }, (_, k) => k));
  // cărămida fără pătrățelul din colțul de departe (3, 1), ultimul al ei: locașul 7 și știftul 15 nu mai sunt; restul își
  // țin locul, cu numerele de după: știftul de la (19,9, 11,9) trece de pe 14 pe 13
  const faraColt: Def = { tip: 'caramida', celule: rand(4, 2).filter(([i, j]) => !(i === 3 && j === 1)) };
  assert.deepEqual(pr(CARAMIDA).map((v) => p3(v.p)).slice(14), [[19.9, 11.9, 9.6], [27.9, 11.9, 9.6]]);
  assert.deepEqual(ramasa(CARAMIDA, faraColt), [0, 1, 2, 3, 4, 5, 6, -1, 7, 8, 9, 10, 11, 12, 13, -1]);
  // fără primul pătrățel (0, 0): cutia piesei e aceeași (pătrățelul (0, 1) ține colțul), deci restul își țin locul, cu
  // numărul cu unu mai mic
  const faraPrimul: Def = { tip: 'caramida', celule: rand(4, 2).filter(([i, j]) => !(i === 0 && j === 0)) };
  assert.deepEqual(ramasa(CARAMIDA, faraPrimul), [-1, 0, 1, 2, 3, 4, 5, 6, -1, 7, 8, 9, 10, 11, 12, 13]);
  // axul lungit: capătul de la origine rămâne; celălalt se mută de-a lungul axului, deci rămâne și el
  assert.deepEqual(ramasa(AX, { tip: 'ax', lung: 5 }), [0, 1]);
  // altă piesă: niciun știft al cărămizii nu e gaură de știft, deși gurile grinzii sunt și ele pe verticală
  assert.deepEqual(ramasa(CARAMIDA, GRINDA), Array.from({ length: 16 }, () => -1));
  // aceeași axă, sens opus: gura de jos a unei găuri nu ține locul celei de sus
  const sus: Prindere = { fel: 'gauraStift', p: [3.6, 3.6, 7.8], d: [0, 0, 1], lung: 7.8 }, jos: Prindere = { fel: 'gauraStift', p: [3.6, 3.6, 0], d: [0, 0, -1], lung: 7.8 };
  assert.equal(Lm.prindereaRamasa(sus, [jos]), -1);
  assert.equal(Lm.prindereaRamasa(sus, [jos, sus]), 1);
  // la 0,5 mm pe lângă: alt loc
  assert.equal(Lm.prindereaRamasa(sus, [{ ...sus, p: [4.1, 3.6, 7.8] }]), -1);
  // două pe aceeași axă: cea mai apropiată de-a lungul direcției
  assert.equal(Lm.prindereaRamasa(sus, [{ ...sus, p: [3.6, 3.6, 20] }, { ...sus, p: [3.6, 3.6, 9] }, { ...sus, p: [3.6, 3.6, 2] }]), 1);
  assert.equal(Lm.prindereaRamasa(sus, []), -1);
});
