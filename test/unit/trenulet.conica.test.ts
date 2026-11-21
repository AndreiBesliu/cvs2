/**
 * Roata conică din atelierul Easy 3Draw (ADR 0280, felia 3.Tl), pe hârtie:
 * - dinți drepți pe conul de divizare, tan δ = z / z2 (perechea la 90°, axele întâlnite în vârful comun); modulul 1 (LEGO);
 *   profilul Tredgold (roata dreaptă cu z / cos δ dinți pe conul din spate), cu jocul din calibrare, ca la rotițe;
 * - planul de divizare la 2·m de fața din spate, deci vârful la m·(2 + z2 / 2): la LEGO 20 (87407, din LDraw), 12 mm de
 *   gulerul din spate (1,5 pași); la 12, 8 mm (1 pas);
 * - conul din spate taie dinții între picioare (zp − 1,25·m·sin δ) și capete (zp + m·sin δ); sub picioare, corpul coboară drept
 *   (cilindrul cercului de picior din spate); lățimea dinților R / 4, deci capătul dinspre vârf la 3 / 4 din distanța spre el;
 * - o pereche montată la 90° nu se pătrunde în nicio fază, dar e prinsă: o rotire în plus de 0,2 mm pe cercul de divizare
 *   (sub joc) n-o atinge, una de 0,9 mm (peste joc) da.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Lego = {
  seteaza(s?: Record<string, unknown> | null): void;
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  conicaMontaj(d: Record<string, unknown>): { z: number; z2: number; fata: number; fataPereche: number };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const conica = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'conica', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const aproape = (a: number, b: number, tol = 0.002) => Math.abs(a - b) <= tol;

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
/**
 * „E material în punctul (x, y, z) al plasei?”: numărul de înfășurare pe o rază în sus (+z), din semnul normalelor tăiate
 * (corpurile se suprapun), cu un index pe grilă în xy, ca să meargă repede pe zeci de mii de triunghiuri.
 */
function inauntru(tri: readonly Tri[], c = 0.4): (x: number, y: number, z: number) => boolean {
  const g = new Map<number, number[]>();
  tri.forEach(([A, B, C], i) => {
    const x0 = Math.floor(Math.min(A[0], B[0], C[0]) / c), x1 = Math.floor(Math.max(A[0], B[0], C[0]) / c);
    const y0 = Math.floor(Math.min(A[1], B[1], C[1]) / c), y1 = Math.floor(Math.max(A[1], B[1], C[1]) / c);
    for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) { const k = a * 100003 + b; (g.get(k) ?? g.set(k, []).get(k)!).push(i); }
  });
  return (x, y, z) => {
    let w = 0;
    for (const i of g.get(Math.floor(x / c) * 100003 + Math.floor(y / c)) ?? []) {
      const [A, B, C] = tri[i]!, d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
      if (l1 < 0 || l2 < 0 || l1 + l2 > 1) continue;
      if (l1 * A[2] + l2 * B[2] + (1 - l1 - l2) * C[2] <= z) continue;
      w += (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) > 0 ? 1 : -1;
    }
    return w > 0;
  };
}
/** Materialul la raza r, unghiul u (grade) și înălțimea z, față de axa roții (baza dată de motor); mișcat puțin de pe muchii. */
function material(p: Piesa): (r: number, u: number, z: number) => boolean {
  const f = inauntru(p.tri);
  return (r, u, z) => { const a = (u * Math.PI) / 180 + 0.0011; return f((r + 1.1e-4) * Math.cos(a) - p.baza[0]!, (r + 1.1e-4) * Math.sin(a) - p.baza[1]!, z); };
}
function volum(tri: readonly Tri[]): number {
  let v = 0;
  for (const [a, b, c] of tri) v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  return v / 6;
}
const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
/**
 * Perechea z1 + z2 la 90°: roata 1 cu axa pe z și fața din spate la 0; roata 2 cu axa pe −x, vârful comun la (0, 0, zA1), un
 * gol al ei în dreptul dintelui 0 al roții 1; rotite împreună (φ și −φ·z1 / z2), plus `d` mm pe cercul de divizare al roții
 * 2. Întoarce câte vârfuri ale fiecăreia (din zona contactului, la cel mult 6 mm de el) sunt în cealaltă.
 */
function pereche(z1: number, z2: number, faze: number[], d = 0): number[] {
  const g1 = conica({ dinti: z1, pereche: z2, gaura: 'nu', butuc: 'scurt' }), g2 = conica({ dinti: z2, pereche: z1, gaura: 'nu', butuc: 'scurt' });
  const in1 = inauntru(g1.tri), in2 = inauntru(g2.tri), mt = L.conicaMontaj({ dinti: z1, pereche: z2 }), zA1 = mt.fata, zA2 = mt.fataPereche;
  const b1 = g1.baza, b2 = g2.baza, psi = Math.PI / 2 - Math.PI / z2, C = [z1 / 2, 0, zA1 - z2 / 2];
  return faze.map((phi) => {
    const a2 = psi - (phi * z1) / z2 + d / (z2 / 2);
    let n = 0;
    for (let i = 0; i < g2.tri.length; i += 2) for (const p of g2.tri[i]!) {
      const [u, v] = rot(p[0] + b2[0]!, p[1] + b2[1]!, a2), x = zA2 - (p[2] + b2[2]!), y = u, z = zA1 - v;
      if (Math.hypot(x - C[0]!, y - C[1]!, z - C[2]!) > 6) continue;
      const [xr, yr] = rot(x, y, -phi);
      if (in1(xr - b1[0]!, yr - b1[1]!, z - b1[2]!)) n++;
    }
    for (let i = 0; i < g1.tri.length; i += 2) for (const p of g1.tri[i]!) {
      const [x, y] = rot(p[0] + b1[0]!, p[1] + b1[1]!, phi), z = p[2] + b1[2]!;
      if (Math.hypot(x - C[0]!, y - C[1]!, z - C[2]!) > 6) continue;
      const [u0, v0] = rot(y, zA1 - z, -a2);
      if (in2(u0 - b2[0]!, v0 - b2[1]!, zA2 - x - b2[2]!)) n++;
    }
    return n;
  });
}

test('corpul e închis la toate perechile, găurile, butucii și modulele', () => {
  for (const [dinti, pereche, modul] of [[8, 60, 1], [60, 8, 1], [12, 12, 1], [12, 36, 1], [36, 12, 1], [20, 28, 2.5], [8, 8, 1]]) for (const gaura of ['x', 'r', 'nu']) for (const butuc of ['lung', 'scurt']) {
    const p = conica({ dinti, pereche, gaura, butuc, modul });
    assert.equal(muchiiRele(p.tri), 0, `${dinti} pentru ${pereche}, ${gaura}, ${butuc}: muchii fără pereche`);
  }
  const lego = conica();
  assert.deepEqual(simplu(lego.dim.map((v) => Math.round(v * 1000) / 1000)), [21.414, 21.414, 7.707], 'implicit: ca LEGO 87407');
  assert.deepEqual(simplu(lego.avert), []);
});

test('montajul: vârful conurilor la m·(2 + z2 / 2) de fața din spate, pe grila de jumătate de pas la perechile LEGO', () => {
  for (const [z, z2, fata, pereche] of [[20, 20, 12, 12], [12, 12, 8, 8], [12, 36, 20, 8], [20, 28, 16, 12], [36, 12, 8, 20]]) {
    const m = L.conicaMontaj({ dinti: z, pereche: z2 });
    assert.ok(aproape(m.fata, fata!, 1e-9) && aproape(m.fataPereche, pereche!, 1e-9), `${z} + ${z2}: ${m.fata} / ${m.fataPereche}`);
  }
  assert.ok(aproape(L.conicaMontaj({ dinti: 20, pereche: 20, modul: 2 }).fata, 24, 1e-9), 'modulul 2: 2·(2 + 10)');
});

test('cotele LEGO 20: dintele pe cercul de divizare, conul din spate, cilindrul de sub picioare, capătul dinspre vârf', () => {
  const f = material(conica()), e = L.efective();
  // pe planul de divizare (2 mm deasupra feței), la r 9,9: dintele 0 la 0°, golul la 9°; jumătatea dintelui, ca la rotițe:
  // (π / 2 − 2·joc) / 2 pe cercul de divizare al roții echivalente, deci (π / 2 − 2·joc) / 2 / 10 rad aici
  const jum = ((Math.PI / 2 - 2 * e.jocDinti!) / 2 / 10) * (180 / Math.PI);
  for (let k = 0; k < 20; k++) {
    assert.equal(f(9.9, 18 * k, 2), true, `dintele ${k}`);
    assert.equal(f(9.9, 18 * k + 9, 2), false, `golul ${k}`);
    assert.equal(f(9.98, 18 * k + jum - 0.4, 2), true, `flancul ${k}, înăuntru`);
    assert.equal(f(9.98, 18 * k + jum + 0.4, 2), false, `flancul ${k}, afară`);
  }
  // conul din spate (45°): la z 1,5, r 10 − 0,5 = 9,5; sub picioare (z 1,116), cilindrul de r 9,116, peste tot
  assert.equal(f(9.45, 0, 1.5), true);
  assert.equal(f(9.55, 0, 1.5), false);
  for (const u of [0, 4.5, 9, 13.5]) { assert.equal(f(9.05, u, 0.5), true, `cilindrul la ${u}°`); assert.equal(f(9.2, u, 0.5), false); }
  // capul, la conul din față: 10,707 la z 2,707 (capătul din spate), 3 / 4 din el la capătul dinspre vârf (z 4,5)
  assert.equal(f(10.65, 0, 2.7), true);
  assert.equal(f(10.75, 0, 2.7), false);
  assert.equal(f(8.6, 0, 4.45), true);
  assert.equal(f(8.8, 0, 4.45), false);
  assert.equal(f(5, 0, 4.55), false, 'peste capătul dinspre vârf, doar butucul');
  // butucul lung: r 3,89 până la 4,29 mm de vârf (7,71), cu gaura de știft (Ø5, varianta 3)
  assert.equal(f(3.8, 45, 7.6), true);
  assert.equal(f(4.0, 45, 7.6), false);
  assert.equal(f(2.45, 45, 3), false, 'gaura de știft');
  assert.equal(f(2.6, 45, 3), true);
});

test('perechea la 90° nu se pătrunde în nicio fază, dar e prinsă: 0,2 mm în plus n-o atinge, 0,9 mm da', () => {
  for (const [z1, z2] of [[20, 20], [12, 36]] as [number, number][]) {
    assert.deepEqual(pereche(z1, z2, [0, Math.PI / z1, (2 * Math.PI) / z1 / 3]), [0, 0, 0], `${z1} + ${z2}: fazele`);
    assert.deepEqual([pereche(z1, z2, [0], 0.2)[0], pereche(z1, z2, [0], -0.2)[0]], [0, 0], `${z1} + ${z2}: ±0,2 mm`);
    const prea = [pereche(z1, z2, [0], 0.9)[0]!, pereche(z1, z2, [0], -0.9)[0]!];
    assert.ok(prea.every((n) => n > 100), `${z1} + ${z2}: ±0,9 mm trebuie să atingă (${prea})`);
  }
});

test('găurile: crucea și știftul în butuc; corpul dinților se oprește la un cerc cu 0,05 mm peste alezaj', () => {
  const e = L.efective(), nu = volum(conica({ gaura: 'nu', butuc: 'scurt' }).tri), zIn = 4.5;
  const cerc = (r: number) => (48 / 2) * Math.sin((2 * Math.PI) / 48) * r * r;
  const cruce = e.axGauraD! * e.axGauraLat! * 2 - e.axGauraLat! * e.axGauraLat!;
  const rx = Math.hypot(e.axGauraD! / 2, e.axGauraLat! / 2), rr = e.gauraD! / 2;
  // butucul scurt are înălțimea dinților (4,5): diferența = cercul corpului dinților + alezajul butucului, pe 4,5
  assert.ok(aproape(nu - volum(conica({ gaura: 'x', butuc: 'scurt' }).tri), (cerc(rx + 0.05) + cruce) * zIn, 0.02), 'crucea');
  assert.ok(aproape(nu - volum(conica({ gaura: 'r', butuc: 'scurt' }).tri), (cerc(rr + 0.05) + cerc(rr)) * zIn, 0.02), 'știftul');
});

test('marginile: dinții, gaura care nu încape, modulul', () => {
  assert.deepEqual(simplu(conica({ dinti: 100 }).avert), ['O roată conică are între 8 și 60 de dinți: am făcut-o de 60, pentru una de 20.']);
  const mic = conica({ dinti: 8, pereche: 60, gaura: 'x' });
  assert.deepEqual(simplu(mic.avert), ['Gaura nu încape în roata asta conică: am făcut-o fără gaură. Alege mai mulți dinți sau un modul mai mare.']);
  assert.equal(muchiiRele(mic.tri), 0);
  // modulul 2: totul de două ori (Ø 42,83, butucul lung până la 24 − 4,29)
  const m2 = conica({ modul: 2 });
  assert.ok(aproape(m2.dim[0]!, 42.828, 0.01) && aproape(m2.dim[2]!, 24 - 3.893 - 0.4, 0.01), simplu(m2.dim).join(' × '));
});
