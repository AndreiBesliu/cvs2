/**
 * Conectorul perpendicular din atelierul Easy 3Draw (ADR 0284, felia 3.Ca), pe plasele reale ale motorului:
 * - un bloc de 1 până la 5 pași, cu secțiunea pătrată cât grosimea grinzii groase; fiecare pas are o gaură (de știft, cu
 *   lamaj pe fețe; de ax, în cruce; sau niciuna) pe axa lui: în sus, de-a latul sau, doar la capete, în lung;
 * - corpul e închis pe toată plaja; cotele sunt cele de pe hârtie (8·n − 0,2 × 7,8 × 7,8, cu găurile în mijlocul pasului);
 * - găurile sunt cele ale grinzii (din calibrare): un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al
 *   plasei, deci proba nu știe cum a fost făcută piesa;
 * - ce nu se poate (o gaură în lung la mijloc, peste 5 pași, un cod necunoscut) se spune sau se îndreaptă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Lego = {
  efective(): Record<string, number>;
  parametri(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  tipuri: readonly string[];
};

const cere = createRequire(import.meta.url);
const { motoare, plasa } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as {
  motoare(): { L: Lego }; plasa(tri: readonly Tri[]): { deschise: number; corpuri: number; negative: number };
};
const { L } = motoare();
const conector = (gauri: readonly string[]) => L.construieste({ tip: 'conector', gauri });
const E = L.efective(), P = L.parametri();
const S = P.pas!, G = P.grinda_groasa!, RG = E.gauraD! / 2, RL = E.lamajD! / 2, HL = P.lamaj_h!, AXD = E.axGauraD!, AXL = E.axGauraLat!;

/** Numărul de înfășurare al plasei în jurul punctului: ≥ 1 înseamnă „în lemn” (corpurile se pot suprapune puțin). */
function infasurare(tri: readonly Tri[], p: P3): number {
  const d: P3 = [0.5399, 0.2931, 0.7889];
  let n = 0;
  for (const [a, b, c] of tri) {
    const e1: P3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2: P3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const h: P3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const s: P3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
    if (u < 0 || u > 1) continue;
    const q: P3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < 0 || u + v > 1) continue;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
    if (t <= 1e-9) continue;
    // det = −d·n: negativ când raza iese prin triunghi (normala lui, spre afară, e în sensul razei), pozitiv când intră
    n += det < 0 ? 1 : -1;
  }
  return n;
}
const plin = (p: Piesa, q: P3) => infasurare(p.tri, q) >= 1;
/** Cotele piesei, rotunjite la miimi, în tărâmul probei (tablourile motorului vin din alt tărâm, `vm`). */
const cote = (p: Piesa): number[] => Array.from(p.dim, (v) => Math.round(v * 1000) / 1000);

/** Axele unui pas: `a` e axa găurii, `u` și `w` sunt cele două perpendiculare. */
const AXE: Record<string, [P3, P3, P3]> = {
  v: [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
  o: [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  l: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
};
/** Centrul pasului k, pe hârtie: blocul începe la 0 (capetele sunt trase cu 0,1), deci primul centru e la 3,9. */
const centru = (k: number): P3 => [S * k + S / 2 - 0.1, G / 2, G / 2];
/** Punctul din pasul k la `t` pe axa găurii (0 = mijlocul) și la (`pu`, `pw`) pe perpendiculare. */
function punct(k: number, axa: string, t: number, pu: number, pw: number): P3 {
  const [a, u, w] = AXE[axa]!, c = centru(k);
  return [c[0] + a[0] * t + u[0] * pu + w[0] * pw, c[1] + a[1] * t + u[1] * pu + w[1] * pw, c[2] + a[2] * t + u[2] * pu + w[2] * pw];
}

test('motorul știe piesa, iar cea implicită e crucea 1 × 2: ax în sus, știft de-a latul', () => {
  assert.ok(L.tipuri.includes('conector'));
  const p = L.construieste({ tip: 'conector' });
  assert.deepEqual(cote(p), [2 * S - 0.2, G, G]);
  assert.equal(p.avert.length, 0);
  // pasul 0: gaură de ax în sus (golul crucii pe brațe, lemn între ele)
  assert.equal(plin(p, punct(0, 'v', 0, 0, 0)), false);
  assert.equal(plin(p, punct(0, 'v', 0, AXD / 2 - 0.2, 0)), false);
  assert.equal(plin(p, punct(0, 'v', 0, AXL / 2 + 0.4, AXL / 2 + 0.4)), true);
  // pasul 1: gaură de știft de-a latul
  assert.equal(plin(p, punct(1, 'o', 0, 0, 0)), false);
  assert.equal(plin(p, punct(1, 'o', 0, RG + 0.15, 0)), true);
});

test('corpul e închis și are cotele de pe hârtie pe toată plaja (1–5 pași, cele trei găuri, cele trei axe)', () => {
  const coduri = ['rv', 'xv', 'ro', 'xo', 'p'];
  const cazuri: string[][] = [];
  for (let n = 1; n <= 5; n++) for (let r = 0; r < 12; r++) cazuri.push(Array.from({ length: n }, (_, k) => coduri[(r * 7 + k * 3 + n) % coduri.length]!));
  // capetele în lung, pe fiecare lungime, cu amândouă felurile de gaură
  for (let n = 1; n <= 5; n++) for (const cap of ['rl', 'xl']) {
    cazuri.push([cap, ...Array.from({ length: n - 1 }, () => 'rv')]);
    if (n > 1) cazuri.push([...Array.from({ length: n - 1 }, () => 'xo'), cap]);
    if (n > 2) cazuri.push([cap, ...Array.from({ length: n - 2 }, () => 'ro'), cap]);
  }
  assert.ok(cazuri.length >= 80);
  for (const g of cazuri) {
    const p = conector(g), m = plasa(p.tri);
    assert.equal(m.deschise, 0, g.join(' '));
    assert.equal(m.negative, 0, g.join(' '));
    assert.deepEqual(cote(p), [Math.round((g.length * S - 0.2) * 1000) / 1000, G, G], g.join(' '));
    if (g.some((c) => c !== 'p')) assert.equal(p.avert.length, 0, g.join(' '));
    // stă pe masă pe toată lungimea: colțurile de jos sunt lemn, iar în afara cutiei nu e nimic
    assert.equal(plin(p, [0.3, 0.3, 0.3]), true, g.join(' '));
    assert.equal(plin(p, [g.length * S - 0.5, G - 0.3, 0.3]), true, g.join(' '));
    assert.equal(plin(p, [g.length * S + 0.4, G / 2, G / 2]), false, g.join(' '));
    assert.equal(plin(p, [1, 1, G + 0.4]), false, g.join(' '));
    // o singură bucată: la granița dintre pași (și de o parte, și de alta) e lemn, lângă muchie, departe de găuri
    for (let k = 1; k < g.length; k++) for (const dx of [-0.3, -0.15, 0, 0.15, 0.3]) {
      assert.equal(plin(p, [S * k - 0.1 + dx, 0.3, 0.3]), true, g.join(' ') + ' granița ' + k);
      assert.equal(plin(p, [S * k - 0.1 + dx, G - 0.3, G - 0.3]), true, g.join(' ') + ' granița ' + k);
    }
  }
});

test('gaura de știft e a grinzii, pe fiecare axă: Ø din calibrare prin tot blocul, cu lamaj pe amândouă fețele', () => {
  for (const axa of ['v', 'o']) {
    const p = conector(['p', 'r' + axa, 'p']), nume = 'axa ' + axa;
    for (const t of [0, G / 2 - HL - 0.3, -(G / 2 - HL - 0.3)]) {
      assert.equal(plin(p, punct(1, axa, t, 0, 0)), false, nume);
      assert.equal(plin(p, punct(1, axa, t, RG - 0.15, 0)), false, nume);
      assert.equal(plin(p, punct(1, axa, t, 0, RG - 0.15)), false, nume);
      // în toate cele patru direcții: o gaură mutată din mijlocul pasului iese la una dintre ele
      for (const [u, w] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        assert.equal(plin(p, punct(1, axa, t, u * (RG - 0.15), w * (RG - 0.15))), false, nume);
        assert.equal(plin(p, punct(1, axa, t, u * (RG + 0.15), w * (RG + 0.15))), true, nume);
      }
    }
    // lamajul: la jumătatea adâncimii lui e gol până la raza lui; dincolo de el, lemn
    for (const t of [G / 2 - HL / 2, -(G / 2 - HL / 2)]) {
      assert.equal(plin(p, punct(1, axa, t, (RG + RL) / 2, 0)), false, nume);
      assert.equal(plin(p, punct(1, axa, t, RL + 0.15, 0)), true, nume);
    }
    // gaura iese prin amândouă fețele
    assert.equal(plin(p, punct(1, axa, G / 2 - 0.05, 0, 0)), false, nume);
    assert.equal(plin(p, punct(1, axa, -(G / 2 - 0.05), 0, 0)), false, nume);
    // pașii plini de lângă ea rămân plini
    assert.equal(plin(p, punct(0, axa, 0, 0, 0)), true, nume);
    assert.equal(plin(p, punct(2, axa, 0, 0, 0)), true, nume);
  }
});

test('gaura de ax e crucea din calibrare, prin tot blocul, fără lamaj', () => {
  for (const axa of ['v', 'o']) {
    const p = conector(['x' + axa, 'p']), nume = 'axa ' + axa;
    for (const t of [0, G / 2 - 0.1, -(G / 2 - 0.1)]) {
      assert.equal(plin(p, punct(0, axa, t, 0, 0)), false, nume);
      // brațele crucii, pe amândouă perpendicularele
      assert.equal(plin(p, punct(0, axa, t, AXD / 2 - 0.15, 0)), false, nume);
      assert.equal(plin(p, punct(0, axa, t, 0, -(AXD / 2 - 0.15))), false, nume);
      assert.equal(plin(p, punct(0, axa, t, AXD / 2 + 0.15, 0)), true, nume);
      // între brațe e lemn (o gaură rotundă de aceeași mărime ar fi goală aici)
      assert.equal(plin(p, punct(0, axa, t, AXL / 2 + 0.3, AXL / 2 + 0.3)), true, nume);
      assert.equal(plin(p, punct(0, axa, t, AXL / 2 - 0.15, AXL / 2 - 0.15)), false, nume);
    }
  }
});

test('gaura în lung, la capăt: intră din capăt cât un pas și se oprește în pasul vecin; singură, trece prin tot', () => {
  // la stânga (pasul 0) și la dreapta (ultimul pas), cu vecinul plin
  for (const [g, k, spreAfara] of [[['rl', 'p', 'p'], 0, -1], [['p', 'p', 'rl'], 2, 1]] as const) {
    const p = conector(g), nume = g.join(' ');
    assert.equal(p.avert.length, 0, nume);
    assert.equal(plin(p, punct(k, 'l', 0, 0, 0)), false, nume);
    assert.equal(plin(p, punct(k, 'l', 0, 0, RG - 0.15)), false, nume);
    assert.equal(plin(p, punct(k, 'l', 0, 0, RG + 0.15)), true, nume);
    // iese prin capăt, cu lamaj doar acolo
    assert.equal(plin(p, punct(k, 'l', spreAfara * (S / 2 - 0.15), 0, 0)), false, nume);
    assert.equal(plin(p, punct(k, 'l', spreAfara * (S / 2 - 0.1 - HL / 2), (RG + RL) / 2, 0)), false, nume);
    // spre vecin: gaura ține până la marginea pasului, fără lamaj, iar vecinul e lemn
    assert.equal(plin(p, punct(k, 'l', -spreAfara * (S / 2 - 0.3), 0, 0)), false, nume);
    assert.equal(plin(p, punct(k, 'l', -spreAfara * (S / 2 - 0.3), (RG + RL) / 2, 0)), true, nume);
    assert.equal(plin(p, punct(k, 'l', -spreAfara * (S / 2 + 0.4), 0, 0)), true, nume);
  }
  // un singur pas: gaura în lung trece prin tot, cu lamaj la amândouă capetele
  const unu = conector(['rl']);
  for (const t of [0, S / 2 - 0.15, -(S / 2 - 0.15)]) assert.equal(plin(unu, punct(0, 'l', t, 0, 0)), false);
  for (const t of [S / 2 - 0.1 - HL / 2, -(S / 2 - 0.1 - HL / 2)]) assert.equal(plin(unu, punct(0, 'l', t, 0, (RG + RL) / 2)), false);
  assert.equal(plin(unu, punct(0, 'l', 0, 0, (RG + RL) / 2)), true);
  // gaura de ax în lung: crucea
  const ax = conector(['xl', 'rv']);
  assert.equal(plin(ax, punct(0, 'l', 0, AXD / 2 - 0.15, 0)), false);
  assert.equal(plin(ax, punct(0, 'l', 0, AXL / 2 + 0.3, AXL / 2 + 0.3)), true);
});

test('colțul pe trei axe: găurile celor trei pași stau pe trei axe diferite și nu se ating', () => {
  const p = conector(['xl', 'rv', 'ro']);
  assert.equal(p.avert.length, 0);
  assert.equal(plin(p, punct(0, 'l', 0, 0, 0)), false);
  assert.equal(plin(p, punct(1, 'v', 0, 0, 0)), false);
  assert.equal(plin(p, punct(2, 'o', 0, 0, 0)), false);
  // pe axa greșită, la marginea pasului, e lemn: gaura în sus a pasului 1 nu iese prin laterale
  assert.equal(plin(p, punct(1, 'o', G / 2 - 0.3, 0, 0)), true);
  assert.equal(plin(p, punct(2, 'v', G / 2 - 0.3, 0, 0)), true);
  // între găurile vecine rămâne perete (la granița dintre pași)
  assert.equal(plin(p, [S - 0.1, G / 2, G / 2 + RL + 0.4]), true);
  assert.equal(plin(p, [2 * S - 0.1, G / 2 + RL + 0.4, G / 2]), true);
});

test('ce nu se poate se spune sau se îndreaptă: gaura în lung la mijloc, peste 5 pași, coduri necunoscute', () => {
  const mijloc = conector(['rv', 'xl', 'rv']);
  assert.equal(mijloc.avert.length, 1);
  assert.match(mijloc.avert[0]!, /în lung/);
  assert.equal(plin(mijloc, punct(1, 'l', 0, 0, 0)), true, 'pasul din mijloc rămâne plin');
  assert.equal(plasa(mijloc.tri).deschise, 0);
  // peste 5 pași: doar primii cinci
  const lung = conector(['rv', 'rv', 'rv', 'rv', 'rv', 'rv', 'rv']);
  assert.equal(Math.round(lung.dim[0]! * 1000) / 1000, 5 * S - 0.2);
  // fără pași, sau cu altceva decât o listă: piesa implicită
  for (const g of [[], null, 'rv']) assert.deepEqual(cote(L.construieste({ tip: 'conector', gauri: g })), cote(L.construieste({ tip: 'conector' })));
  // un cod necunoscut e o gaură de știft în sus; un fel necunoscut, la fel; o axă necunoscută, în sus
  const ciudat = conector(['zz', 'x?', 7 as unknown as string]);
  assert.equal(ciudat.avert.length, 0);
  assert.equal(plin(ciudat, punct(0, 'v', 0, RG - 0.15, 0)), false);
  assert.equal(plin(ciudat, punct(0, 'v', 0, RG + 0.15, 0)), true);
  assert.equal(plin(ciudat, punct(1, 'v', 0, AXD / 2 - 0.15, 0)), false);
  assert.equal(plin(ciudat, punct(2, 'v', 0, 0, 0)), false);
  // toți pașii plini: un bloc întreg, spus
  const bloc = conector(['p', 'p']);
  assert.equal(bloc.avert.length, 1);
  assert.match(bloc.avert[0]!, /nicio gaură/);
});

test('aceeași piesă iese la fel de fiecare dată', () => {
  const a = conector(['xl', 'rv', 'ro', 'xv', 'rl']), b = conector(['xl', 'rv', 'ro', 'xv', 'rl']);
  assert.deepEqual(a.tri, b.tri);
});
