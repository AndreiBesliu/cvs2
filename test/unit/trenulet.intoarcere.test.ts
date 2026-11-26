/**
 * Orientarea de mână pe trei axe și pozițiile la jumătate de pas în vederea „Modelul” a atelierului Easy 3Draw (ADR
 * 0284, partea D; felia 3.Cf-2), pe funcțiile pure ale motorului:
 * - `intorsLiber` răstoarnă o piesă un sfert de tură în jurul axei X (vârful ei cade spre −y) sau Y (vârful cade spre +x),
 *   prin mijlocul cutiei ei: mijlocul rămâne pe loc pe x și y, iar partea de jos a cutiei, la aceeași înălțime;
 * - cu rotirea în jurul verticalei (`rotitLiber`), răsturnările dau toate cele 24 de așezări drepte, cu matrice exacte;
 * - patru răsturnări la rând aduc piesa exact de unde a plecat, deci înapoi pe grilă;
 * - o piesă prinsă de una răsturnată o urmează (`rezolvaModel`);
 * - `loculDrept` e locul unei piese care stă drept, și între știfturi sau între plăci (jumătățile de pas); `susTransf`
 *   spune încotro e partea de sus a piesei;
 * - o piesă rotundă care stă drept se rotește în jurul axului ei, nu al cutiei (`rotitLiber`, cu pivotul).
 * Valorile sunt pe hârtie, din cotele pieselor: cărămida 2 × 4 (31,8 × 15,8 × 11,5; știfturile la 3,9 + 8·i; pe grilă la
 * 0, 0, cutia ei ține x 0,1 … 31,9, y 0,1 … 15,9, z 0 … 11,5, cu mijlocul la 16, 8), placa 2 × 2 (15,8 × 15,8 × 5,1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, type Piesa } from './ajutor-plasa-lego.ts';

type Def = Record<string, unknown> & { tip: string };
type Prindere = { fel: string; p: number[]; d: number[]; lung: number };
type Transf = { m: number[]; t: number[] };
type Asezare = { gw: number; gd: number; pivot: number[]; ax: boolean };
type Corp = Piesa & { ax: number[] | null; prinderi: Prindere[] };
type Prins = { de: string; a: number; b: number; unghi?: number; alunec?: number };
type PiesaModel = { id: string; grila: Transf; prinderi: readonly Prindere[]; prins?: Prins | null; liber?: Transf | null };
type Loc = { x: number; y: number; z: number; rot: number };
const Lm = L as unknown as {
  construieste(d: Def): Corp;
  asezareModel(d: Def, corp?: Corp): Asezare;
  transfGrila(a: Asezare, x: number, y: number, z: number, rot: number): Transf;
  aplicaTransf(T: Transf, p: readonly number[]): number[];
  rezolvaModel(piese: readonly PiesaModel[]): { T: Transf; fel: string }[];
  grilaDinTransf(a: Asezare, T: Transf): Loc | null;
  cutieTransf(T: Transf, dim: readonly number[]): [number[], number[]];
  rotitLiber(T: Transf, dim: readonly number[], pivot?: readonly number[] | null): Transf;
  intorsLiber(T: Transf, dim: readonly number[], axa: string): Transf;
  loculDrept(a: Asezare, T: Transf): Loc | null;
  susTransf(T: Transf): string | null;
};
const r3 = (v: number) => Math.round(v * 1000) / 1000 + 0;
const p3 = (v: readonly number[]) => [...v].map(r3);
const rand = (n: number, m = 1): [number, number][] => Array.from({ length: n * m }, (_, k): [number, number] => [k % n, Math.floor(k / n)]);

const CARAMIDA: Def = { tip: 'caramida', celule: rand(4, 2) }, PLACA: Def = { tip: 'caramida', celule: rand(2, 2), placi: 1 };
const GRINDA: Def = { tip: 'grinda' }, ROATA: Def = { tip: 'rotita' }, CAMA: Def = { tip: 'cama' };
const corpuri = new Map<string, Corp>();
const fa = (d: Def): Corp => { const k = JSON.stringify(d); let c = corpuri.get(k); if (!c) { c = Lm.construieste(d); corpuri.set(k, c); } return c; };
const as = (d: Def) => Lm.asezareModel(d, fa(d));
const grila = (d: Def, x: number, y: number, z = 0, rot = 0) => Lm.transfGrila(as(d), x, y, z, rot);
const la = (T: Transf, p: readonly number[]) => p3(Lm.aplicaTransf(T, p));
const cutie = (T: Transf, d: Def): [number[], number[]] => { const [lo, hi] = Lm.cutieTransf(T, fa(d).dim); return [p3(lo), p3(hi)]; };
/** Transformarea, într-un tablou al probei, fără −0 (așezarea de pe grilă îl are, de la −sin 0). */
const curat = (T: Transf): Transf => ({ m: [...T.m].map((v) => v + 0), t: [...T.t] });
const loc = (l: Loc | null) => (l ? { x: r3(l.x), y: r3(l.y), z: r3(l.z), rot: l.rot } : null);
const intors = (T: Transf, d: Def, axa: string) => curat(Lm.intorsLiber(T, fa(d).dim, axa));
const rotit = (T: Transf, d: Def) => curat(Lm.rotitLiber(T, fa(d).dim));

test('răsturnarea în jurul axei X: vârful cărămizii cade spre −y; mijlocul rămâne pe loc, partea de jos la aceeași înălțime', () => {
  const T = intors(grila(CARAMIDA, 0, 0), CARAMIDA, 'x');
  // matricea exactă a sfertului de tură în jurul lui X: (x, y, z) → (x, −z, y)
  assert.deepEqual(T.m, [1, 0, 0, 0, 0, -1, 0, 1, 0]);
  // pe hârtie: x neschimbat; înălțimea de 11,5 trece pe y, în jurul mijlocului 8 (8 ± 5,75); lățimea de 15,8, pe z, de la 0
  assert.deepEqual(cutie(T, CARAMIDA), [[0.1, 2.25, 0], [31.9, 13.75, 15.8]]);
  // vârful primului știft, (3,9, 3,9, 11,5) în piesă: față de mijlocul ei, (−12, −4, 5,75) → (−12, −5,75, −4)
  assert.deepEqual(la(T, [3.9, 3.9, 11.5]), [4, 2.25, 3.9]);
  // fundul cărămizii privește spre +y
  assert.deepEqual(la(T, [0, 0, 0]), [0.1, 13.75, 0]);
});

test('răsturnarea în jurul axei Y: vârful cărămizii cade spre +x', () => {
  const T = intors(grila(CARAMIDA, 0, 0), CARAMIDA, 'y');
  // (x, y, z) → (z, y, −x)
  assert.deepEqual(T.m, [0, 0, 1, 0, 1, 0, -1, 0, 0]);
  // înălțimea de 11,5 trece pe x, în jurul mijlocului 16 (16 ± 5,75); lungimea de 31,8, pe z, de la 0; y neschimbat
  assert.deepEqual(cutie(T, CARAMIDA), [[10.25, 0.1, 0], [21.75, 15.9, 31.8]]);
  // vârful primului știft: (−12, −4, 5,75) → (5,75, −4, 12), față de mijlocul nou (16, 8, 15,9)
  assert.deepEqual(la(T, [3.9, 3.9, 11.5]), [21.75, 4, 27.9]);
});

test('o piesă ridicată sau mutată: partea de jos rămâne la înălțimea ei, mijlocul pe x și y, pe loc', () => {
  // cărămida la 3, −2, pe 5 plăci (z 16), rotită un sfert: cutia x 24,1 … 39,9, y −15,9 … 15,9; mijlocul 32, 0
  const G = grila(CARAMIDA, 3, -2, 5, 1);
  assert.deepEqual(cutie(G, CARAMIDA), [[24.1, -15.9, 16], [39.9, 15.9, 27.5]]);
  const X = intors(G, CARAMIDA, 'x');
  // în jurul lui X: y ține acum înălțimea (0 ± 5,75), z ține lungimea de 31,8, de la 16
  assert.deepEqual(cutie(X, CARAMIDA), [[24.1, -5.75, 16], [39.9, 5.75, 47.8]]);
  const Y = intors(G, CARAMIDA, 'y');
  // în jurul lui Y: x ține înălțimea (32 ± 5,75), z ține lățimea de 15,8
  assert.deepEqual(cutie(Y, CARAMIDA), [[26.25, -15.9, 16], [37.75, 15.9, 31.8]]);
});

test('patru răsturnări la rând aduc piesa exact de unde a plecat: e din nou pe grilă, la locul ei', () => {
  for (const d of [CARAMIDA, PLACA, GRINDA, ROATA, CAMA]) {
    for (const [x, y, z, rot] of [[0, 0, 0, 0], [3, -2, 5, 1], [-4, 7, 12, 2], [1, 1, -3, 3]] as const) {
      for (const axa of ['x', 'y']) {
        const G = curat(grila(d, x, y, z, rot));
        let T = G;
        for (let k = 0; k < 4; k++) {
          T = intors(T, d, axa);
          // pe drum nu e pe grilă: stă pe o parte sau cu fața în jos
          if (k < 3) assert.equal(Lm.grilaDinTransf(as(d), T), null, `${d.tip} ${axa} ${k}`);
        }
        assert.deepEqual(T.m, G.m, `${d.tip} ${axa}`);
        assert.deepEqual(loc(Lm.grilaDinTransf(as(d), T)), { x, y, z, rot }, `${d.tip} ${axa}`);
      }
    }
  }
  // două răsturnări: cu fața în jos, pe același loc (cutia e aceeași)
  const J = intors(intors(grila(CARAMIDA, 0, 0), CARAMIDA, 'x'), CARAMIDA, 'x');
  assert.deepEqual(J.m, [1, 0, 0, 0, -1, 0, 0, 0, -1]);
  assert.deepEqual(cutie(J, CARAMIDA), [[0.1, 0.1, 0], [31.9, 15.9, 11.5]]);
  // vârful primului știft e acum jos, pe masă
  assert.deepEqual(la(J, [3.9, 3.9, 11.5]), [4, 12, 0]);
});

test('răsturnările și rotirea dau toate cele 24 de așezări drepte, cu matrice exacte; mijlocul și partea de jos nu se mișcă', () => {
  const cheie = (T: Transf) => T.m.join(','), vazute = new Map<string, Transf>();
  const coada: Transf[] = [curat(grila(CARAMIDA, 0, 0))];
  vazute.set(cheie(coada[0]!), coada[0]!);
  while (coada.length) {
    const T = coada.shift()!;
    for (const N of [intors(T, CARAMIDA, 'x'), intors(T, CARAMIDA, 'y'), rotit(T, CARAMIDA)]) {
      if (vazute.has(cheie(N))) continue;
      vazute.set(cheie(N), N); coada.push(N);
    }
  }
  assert.equal(vazute.size, 24);
  for (const T of vazute.values()) {
    // matrice de rotație exactă: doar 0, 1 și −1 (fără 6e−17), cu determinantul 1
    assert.ok(T.m.every((v) => v === 0 || v === 1 || v === -1), cheie(T));
    const [a, b, c, d, e, f, g, h, i] = T.m as [number, number, number, number, number, number, number, number, number];
    assert.equal(a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g), 1, cheie(T));
    const [lo, hi] = cutie(T, CARAMIDA);
    assert.deepEqual([r3((lo[0]! + hi[0]!) / 2), r3((lo[1]! + hi[1]!) / 2), lo[2]], [16, 8, 0], cheie(T));
  }
  // cele trei mărimi ale cutiei, în toate cele șase ordini, fiecare de patru ori
  const marimi = new Map<string, number>();
  for (const T of vazute.values()) { const [lo, hi] = cutie(T, CARAMIDA), k = [0, 1, 2].map((j) => r3(hi[j]! - lo[j]!)).join(' × '); marimi.set(k, (marimi.get(k) ?? 0) + 1); }
  assert.deepEqual([...marimi].sort(), [['11.5 × 15.8 × 31.8', 4], ['11.5 × 31.8 × 15.8', 4], ['15.8 × 11.5 × 31.8', 4], ['15.8 × 31.8 × 11.5', 4], ['31.8 × 11.5 × 15.8', 4], ['31.8 × 15.8 × 11.5', 4]]);
});

test('o piesă prinsă de una răsturnată o urmează: placa de pe ultimul știft stă acum în fața cărămizii', () => {
  const baza = intors(grila(CARAMIDA, 0, 0), CARAMIDA, 'x');
  const r = [...Lm.rezolvaModel([
    { id: 'a', grila: grila(CARAMIDA, 0, 0), prinderi: [...fa(CARAMIDA).prinderi], liber: baza },
    { id: 'b', grila: grila(PLACA, 0, 0), prinderi: [...fa(PLACA).prinderi], prins: { de: 'a', a: 15, b: 0 } },
  ])];
  assert.deepEqual(r.map((x) => x.fel), ['liber', 'prins']);
  // în cărămidă, placa ține x 24 … 39,8, y 8 … 23,8, z 9,6 … 14,7 (proba alipirii). Răsturnată în jurul lui X, față de
  // mijlocul cărămizii (15,9, 7,9, 5,75): x rămâne (+0,1), z-ul piesei trece pe −y (8 − 3,85 … 8 − 8,95), y-ul, pe z
  assert.deepEqual(cutie(curat(r[1]!.T), PLACA), [[24.1, -0.95, 8], [39.9, 4.15, 23.8]]);
  // știftul cărămizii și locașul plăcii, unul peste altul
  assert.deepEqual(la(r[1]!.T, fa(PLACA).prinderi[0]!.p), la(baza, fa(CARAMIDA).prinderi[15]!.p));
});

test('locul unei piese care stă drept, și între știfturi sau între plăci; una răsturnată n-are', () => {
  const a = as(CARAMIDA), G = curat(grila(CARAMIDA, 2, -1, 3, 1));
  assert.deepEqual(loc(Lm.loculDrept(a, G)), { x: 2, y: -1, z: 3, rot: 1 });
  // cu o jumătate de știft pe x (4 mm) și o jumătate de placă pe z (1,6 mm): nu e pe grilă, dar își știe locul
  const H: Transf = { m: G.m, t: [G.t[0]! + 4, G.t[1]!, G.t[2]! + 1.6] };
  assert.equal(Lm.grilaDinTransf(a, H), null);
  assert.deepEqual(loc(Lm.loculDrept(a, H)), { x: 2.5, y: -1, z: 3.5, rot: 1 });
  // cu o jumătate de știft pe y, în jos
  assert.deepEqual(loc(Lm.loculDrept(a, { m: G.m, t: [G.t[0]!, G.t[1]! - 4, G.t[2]!] })), { x: 2, y: -1.5, z: 3, rot: 1 });
  // răsturnată, rotită cu 45° sau stricată: fără loc
  assert.equal(Lm.loculDrept(a, intors(G, CARAMIDA, 'x')), null);
  const c = Math.SQRT1_2;
  assert.equal(Lm.loculDrept(a, { m: [c, -c, 0, c, c, 0, 0, 0, 1], t: [0, 0, 0] }), null);
  assert.equal(Lm.loculDrept(a, { m: [1, 0, 0], t: [0, 0, 0] }), null);
});

test('încotro e partea de sus a piesei: în sus, în jos sau spre una dintre cele patru laturi', () => {
  const G = curat(grila(CARAMIDA, 0, 0));
  assert.equal(Lm.susTransf(G), 'sus');
  assert.equal(Lm.susTransf(curat(grila(CARAMIDA, 0, 0, 0, 3))), 'sus');
  const X = intors(G, CARAMIDA, 'x'), Y = intors(G, CARAMIDA, 'y');
  assert.equal(Lm.susTransf(X), 'y-');
  assert.equal(Lm.susTransf(intors(X, CARAMIDA, 'x')), 'jos');
  assert.equal(Lm.susTransf(intors(intors(X, CARAMIDA, 'x'), CARAMIDA, 'x')), 'y+');
  assert.equal(Lm.susTransf(Y), 'x+');
  assert.equal(Lm.susTransf(intors(intors(Y, CARAMIDA, 'y'), CARAMIDA, 'y')), 'x-');
  // rotită în jurul verticalei, partea de sus merge cu ea: de la −y la +x
  assert.equal(Lm.susTransf(rotit(X, CARAMIDA)), 'x+');
  // înclinată altfel (desprinsă dintr-o prindere oblică) sau stricată: nu se spune
  const c = Math.SQRT1_2;
  assert.equal(Lm.susTransf({ m: [1, 0, 0, 0, c, -c, 0, c, c], t: [0, 0, 0] }), null);
  assert.equal(Lm.susTransf({ m: [1, 0, 0], t: [0, 0, 0] }), null);
});

test('o piesă rotundă care stă drept se rotește în jurul axului ei, nu al cutiei; una răsturnată, în jurul cutiei', () => {
  // cama: axul nu e în mijlocul cutiei (altfel proba n-ar deosebi nimic)
  const a = as(CAMA), dim = fa(CAMA).dim, ax = [a.pivot[0]!, a.pivot[1]!, 0];
  assert.ok(Math.hypot(a.pivot[0]! - dim[0]! / 2, a.pivot[1]! - dim[1]! / 2) > 1, 'axul camei e în mijlocul cutiei');
  // la o jumătate de pas de grilă
  const G = grila(CAMA, 2, 3), T: Transf = { m: [...G.m], t: [G.t[0]! + 4, G.t[1]!, G.t[2]!] };
  const R = curat(Lm.rotitLiber(T, dim, a.pivot));
  assert.deepEqual(R.m, [0, -1, 0, 1, 0, 0, 0, 0, 1]);
  assert.deepEqual(la(R, ax), la(T, ax));
  // fără pivot: în jurul mijlocului cutiei, deci axul se mută
  const F = curat(Lm.rotitLiber(T, dim));
  assert.notDeepEqual(la(F, ax), la(T, ax));
  const mij = (Q: Transf) => { const [lo, hi] = Lm.cutieTransf(Q, dim); return [r3((lo[0]! + hi[0]!) / 2), r3((lo[1]! + hi[1]!) / 2)]; };
  assert.deepEqual(mij(F), mij(T));
  // răsturnată, cama se rotește în jurul verticalei prin mijlocul cutiei, cu sau fără pivot
  const X = intors(T, CAMA, 'x');
  assert.deepEqual(curat(Lm.rotitLiber(X, dim, a.pivot)), curat(Lm.rotitLiber(X, dim)));
});

test('o transformare stricată nu aruncă: răsturnarea o lasă cum e', () => {
  const rea: Transf = { m: [1, 0, 0], t: [0, 0, 0] };
  assert.deepEqual(curat(Lm.intorsLiber(rea, [10, 10, 10], 'x')), rea);
  // o axă necunoscută e luată drept X
  assert.deepEqual(intors(grila(CARAMIDA, 0, 0), CARAMIDA, 'z').m, [1, 0, 0, 0, 0, -1, 0, 1, 0]);
});
