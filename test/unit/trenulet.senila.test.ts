/**
 * Șenila din atelierul Easy 3Draw (ADR 0280, felia 3.To), pe plasele reale:
 * - zala ca LEGO 57518 (din LDraw): lată de 38,4, pasul de 12; bolțul Ø3,2 la (y 0, z 5,6), între obrajii de la |x| 5,75;
 *   clema (inelul clemei din atelier, `clemaD` din calibrare) la (y −12, z 5,6), cu fălcile la |x| 3,2…5,45; între fălci,
 *   loc pentru discul pinionului; găurile de știft la (±8, −6,8); limba ±5,45 intră în crestătura ±5,75 a zalei următoare;
 * - două zale legate nu se ating, drepte și îndoite spre pinion până la 60° (pinionul de 6), nici îndoite înapoi cu 8°; la 12°
 *   înapoi, aripile se opresc una în alta (ca la LEGO);
 * - pinionul: scobiturile, cercuri de rază 1,6 + jocul dinților pe raza R = 6 / sin(π / z) (57519: 10, R 19,42); vârful la
 *   R + 1, dar cel mult la 0,3 mm sub placa zalei (la 6 dinți); șenila întinsă pe pinioanele de 6, 10, 14 nu atinge nimic;
 * - montajul pe două pinioane: lungimea liniei bolțurilor, zalele, jocul, distanța la care stă întinsă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Montaj = { z1: number; z2: number; R1: number; R2: number; d: number; L: number; zale: number; joc: number; intins: number; aproape: boolean };
type Lego = {
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  senilaMontaj(z1: unknown, z2: unknown, distanta: unknown): Montaj;
  seteaza(s: Record<string, unknown> | null): void;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const zala = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'senila', piesa: 'zala', ...d });
const pinion = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'senila', piesa: 'pinion', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
/** „E material în (x, y, z)?”: numărul de înfășurare pe o rază în sus (+z), cu un index pe grilă în xy (corpurile se suprapun). */
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
/** O piesă în coordonatele ei de lucru (cele dinaintea mutării în origine): vârfurile și „e material aici?”. */
function inCadru(p: Piesa) {
  const b = p.baza, f = inauntru(p.tri), vf: P3[] = [];
  for (const t of p.tri) for (const q of t) vf.push([q[0] + b[0]!, q[1] + b[1]!, q[2] + b[2]!]);
  // mișcat puțin de pe muchii și fețe, ca un punct de probă să nu cadă exact pe ele
  return { vf, in: (x: number, y: number, z: number) => f(x + 1.3e-4 - b[0]!, y + 1.7e-4 - b[1]!, z + 1.1e-4 - b[2]!) };
}
const rot = (y: number, z: number, u: number): [number, number] => [y * Math.cos(u) - z * Math.sin(u), y * Math.sin(u) + z * Math.cos(u)];

test('corpul e închis la zală și la pinioane (dinții, găurile, calibrarea); cotele: zala 38,4 × 17,2, pinionul de 10 ca 57519', () => {
  for (const d of [{}, { gauriStift: 'nu' }]) assert.equal(muchiiRele(zala(d).tri), 0, `zala ${JSON.stringify(d)}`);
  for (const dinti of [6, 7, 8, 10, 13, 14, 24, 40]) for (const gaura of ['x', 'r', 'nu']) {
    assert.equal(muchiiRele(pinion({ dinti, gaura }).tri), 0, `pinionul de ${dinti}, ${gaura}`);
  }
  for (const v of [1, 5]) {
    L.seteaza({ varianta_bara: v, varianta_dinti: v });
    try {
      assert.equal(muchiiRele(zala().tri), 0, `zala, varianta ${v}`);
      assert.equal(muchiiRele(pinion().tri), 0, `pinionul, varianta ${v}`);
    } finally { L.seteaza(null); }
  }
  const z = zala();
  assert.deepEqual(simplu(z.dim.slice(0, 2).map((v) => Math.round(v * 1000) / 1000)), [38.4, 17.2]);
  assert.ok(Math.abs(z.dim[2]! - 8.05) < 0.01, `înălțimea zalei: ${z.dim[2]}`);
  assert.deepEqual(simplu(z.avert), []);
  // pinionul de 10: vârfurile la R + 1 = 20,42 (57519: 20,4), gros de 8 cu butucul
  const p = pinion();
  assert.ok(Math.abs(Math.max(p.dim[0]!, p.dim[1]!) - 2 * (6 / Math.sin(Math.PI / 10) + 1)) < 0.01, `Ø ${p.dim}`);
  assert.equal(Math.round(p.dim[2]! * 1000) / 1000, 8);
});

test('cotele zalei, ca 57518: bolțul, clema cu fălcile, locul discului, găurile, limba și crestătura', () => {
  const z = inCadru(zala()), e = L.efective(), ri = e.clemaD! / 2, ro = ri + 1.1;
  // bolțul Ø3,2 la (y 0, z 5,6), de la un obraz la altul (|x| < 5,75), și obrajii până la |x| 7,2
  for (const x of [-5.5, -3, 0, 3, 5.5]) for (const [dy, dz] of [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]] as [number, number][]) {
    assert.equal(z.in(x, dy, 5.6 + dz), true, `bolțul la x ${x}, (${dy}, ${dz})`);
  }
  assert.equal(z.in(0, 0, 5.6 + 1.7), false, 'deasupra bolțului');
  assert.equal(z.in(0, 0, 5.6 - 1.7), false, 'sub bolț, la mijloc');
  for (const x of [5.9, 7.1, -5.9, -7.1]) assert.equal(z.in(x, 0, 7.5), true, `obrazul la x ${x}`);
  assert.equal(z.in(7.4, 0, 7.5), false);
  // clema la (y −12, z 5,6): golul de rază ri e liber; fălcile, inelul de la ri la ro, la |x| 3,2…5,45; gura în sus
  for (const x of [-4.3, 4.3]) {
    for (let u = 0; u < 360; u += 15) {
      const a = (u * Math.PI) / 180, gol = [-12 + (ri - 0.05) * Math.cos(a), 5.6 + (ri - 0.05) * Math.sin(a)];
      assert.equal(z.in(x, gol[0]!, gol[1]!), false, `golul clemei la ${u}°`);
      const inel = [-12 + ((ri + ro) / 2) * Math.cos(a), 5.6 + ((ri + ro) / 2) * Math.sin(a)];
      assert.equal(z.in(x, inel[0]!, inel[1]!), u < 60 || u > 120, `inelul clemei la ${u}° (gura în sus)`);
    }
  }
  for (const x of [3.1, 5.55, -3.1, -5.55]) assert.equal(z.in(x, -12, 5.6 - (ri + ro) / 2), false, `în afara fălcilor, x ${x}`);
  // între fălci și sub bolțuri (|x| < 3,2), deasupra plăcii, e liber de la un bolț la altul: acolo intră dintele pinionului
  for (const y of [-1.8, -6, -10.2]) for (const zz of [3.3, 5, 7, 8]) assert.equal(z.in(0, y, zz), false, `locul dintelui, y ${y}, z ${zz}`);
  // placa groasă de 3,2, aripile până la |x| 19,2; găurile de știft la (±8, −6,8)
  assert.equal(z.in(19.1, -6, 1.6), true);
  assert.equal(z.in(19.3, -6, 1.6), false);
  assert.equal(z.in(12, -6, 3.15), true);
  assert.equal(z.in(12, -6, 3.25), false);
  for (const x of [-8, 8]) {
    assert.equal(z.in(x, -6.8, 1.6), false, `gaura de știft la x ${x}`);
    assert.equal(z.in(x + e.gauraD! / 2 + 0.1, -6.8, 1.6), true, `peretele găurii la x ${x}`);
  }
  // limba (|x| < 5,45) până la y −14,8, aripile până la −12,4; crestătura (|x| < 5,75) de la −1,2 la −4,4
  assert.equal(z.in(5.3, -14.6, 1.6), true);
  assert.equal(z.in(5.6, -14.6, 1.6), false);
  assert.equal(z.in(8, -12.3, 1.6), true);
  assert.equal(z.in(8, -12.5, 1.6), false);
  assert.equal(z.in(5.6, -3, 1.6), false, 'crestătura e mai lată decât limba');
  assert.equal(z.in(5.9, -3, 1.6), true);
});

test('două zale legate: drepte și îndoite spre pinion până la 60° nu se ating; înapoi, se opresc între 8° și 12°', () => {
  const z = inCadru(zala());
  // a doua, cu un pas mai încolo (y − 12), rotită cu u în jurul bolțului ei (x, la y −12, z 5,6); u < 0: spre pinion
  const atingeri = (u: number) => {
    let n = 0;
    for (const [x, y, zz] of z.vf) { const [yy, zq] = rot(y, zz - 5.6, u); if (z.in(x, yy - 12, zq + 5.6)) n++; }
    for (const [x, y, zz] of z.vf) { const [yy, zq] = rot(y + 12, zz - 5.6, -u); if (z.in(x, yy, zq + 5.6)) n++; }
    return n;
  };
  for (const g of [0, -12, -24, -36, -48, -60, 4, 8]) assert.equal(atingeri((g * Math.PI) / 180), 0, `îndoite cu ${g}°`);
  assert.ok(atingeri((12 * Math.PI) / 180) > 0, 'înapoi cu 12°, aripile trebuie să se oprească');
});

test('pinionul: bolțurile în scobituri, cu jocul dinților; vârful la R + 1, la 6 dinți sub placa zalei', () => {
  const e = L.efective(), j = e.jocDinti!;
  for (const zz of [6, 10, 14, 40]) {
    const p = inCadru(pinion({ dinti: zz, gaura: 'nu' })), R = 6 / Math.sin(Math.PI / zz);
    for (const k of [0, 1, Math.floor(zz / 2)]) {
      const u = (2 * Math.PI * k) / zz, cx = R * Math.cos(u), cy = R * Math.sin(u);
      for (let a = 0; a < 360; a += 10) {
        const t = (a * Math.PI) / 180;
        assert.equal(p.in(cx + (1.6 + j - 0.05) * Math.cos(t), cy + (1.6 + j - 0.05) * Math.sin(t), 2), false, `${zz}: scobitura ${k}, la ${a}°`);
      }
      // fundul scobiturii, la R − 1,6 − joc
      assert.equal(p.in((R - 1.6 - j - 0.1) * Math.cos(u), (R - 1.6 - j - 0.1) * Math.sin(u), 2), true, `${zz}: fundul scobiturii ${k}`);
    }
    // vârful, la mijloc între două scobituri
    const ra = Math.min(R + 1, R * Math.cos(Math.PI / zz) + 2.1), um = Math.PI / zz;
    assert.equal(p.in((ra - 0.05) * Math.cos(um), (ra - 0.05) * Math.sin(um), 2), true, `${zz}: vârful`);
    assert.equal(p.in((ra + 0.05) * Math.cos(um), (ra + 0.05) * Math.sin(um), 2), false, `${zz}: peste vârf`);
    if (zz === 10) assert.ok(Math.abs(ra - 20.416) < 0.001, 'la 10 dinți, vârful la R + 1 (57519: 20,4)');
    if (zz === 6) assert.ok(ra < R + 1 - 0.5, 'la 6 dinți, vârful coborât sub placa zalei');
  }
});

test('șenila întinsă pe pinioanele de 6, 10, 14: zalele nu ating pinionul, nici una pe alta', () => {
  const z = inCadru(zala());
  for (const zz of [6, 10, 14]) {
    const p = inCadru(pinion({ dinti: zz, gaura: 'nu' })), R = 6 / Math.sin(Math.PI / zz), zm = 2;
    // zala k: bolțul pe raza R la unghiul θk; y spre bolțul de dinainte; z spre centru
    const cadre = Array.from({ length: zz }, (_, k) => {
      const t0 = (2 * Math.PI * k) / zz, t1 = (2 * Math.PI * (k + 1)) / zz;
      const P0 = [R * Math.cos(t0), R * Math.sin(t0)] as const, ey = [(P0[0] - R * Math.cos(t1)) / 12, (P0[1] - R * Math.sin(t1)) / 12] as const;
      const m = [(P0[0] + R * Math.cos(t1)) / 2, (P0[1] + R * Math.sin(t1)) / 2], s = -ey[1] * -m[0]! + ey[0] * -m[1]! < 0 ? -1 : 1;
      return { P0, ey, ez: [-ey[1] * s, ey[0] * s] as const };
    });
    type Cadru = (typeof cadre)[number];
    const inLume = (c: Cadru, [x, y, q]: P3): P3 => [c.P0[0] + y * c.ey[0] + (q - 5.6) * c.ez[0], c.P0[1] + y * c.ey[1] + (q - 5.6) * c.ez[1], zm + x];
    const inZala = (c: Cadru, [X, Y, Zs]: P3): P3 => { const dx = X - c.P0[0], dy = Y - c.P0[1]; return [Zs - zm, dx * c.ey[0] + dy * c.ey[1], dx * c.ez[0] + dy * c.ez[1] + 5.6]; };
    let pInZ = 0, zInP = 0, zInZ = 0;
    for (const [k, c] of cadre.entries()) {
      for (const v of p.vf) { const q = inZala(c, v); if (Math.abs(q[1] + 6) < 12 && z.in(...q)) pInZ++; }
      for (const v of z.vf) if (p.in(...inLume(c, v))) zInP++;
      const urm = cadre[(k + 1) % zz]!;
      for (const v of z.vf) if (z.in(...inZala(c, inLume(urm, v)))) zInZ++;
    }
    assert.deepEqual([pInZ, zInP, zInZ], [0, 0, 0], `pinionul de ${zz}: pinion în zale, zale în pinion, zale vecine`);
  }
});

test('montajul: zalele pe două pinioane, jocul, distanța la care stă întinsă; pinioanele care s-ar atinge', () => {
  const R10 = 6 / Math.sin(Math.PI / 10), R14 = 6 / Math.sin(Math.PI / 14);
  const m = L.senilaMontaj(10, 10, 64);
  // pinioane egale: 2·d + 2π·R = 128 + 120 = 248; 21 de zale (252 mm), 4 mm de joc; întinsă la d + 2
  assert.ok(Math.abs(m.L - (128 + 2 * Math.PI * R10)) < 1e-9);
  assert.equal(m.zale, 21);
  assert.ok(Math.abs(m.joc - (252 - m.L)) < 1e-9);
  assert.ok(Math.abs(m.intins - (64 + (252 - m.L) / 2)) < 1e-6, `întinsă la ${m.intins}`);
  // inegale: curea deschisă
  const d = 80, al = Math.asin((R14 - R10) / d), Lp = 2 * Math.sqrt(d * d - (R14 - R10) ** 2) + R10 * (Math.PI - 2 * al) + R14 * (Math.PI + 2 * al);
  const n = L.senilaMontaj(10, 14, d);
  assert.ok(Math.abs(n.L - Lp) < 1e-9);
  assert.equal(n.zale, Math.ceil(Lp / 12));
  // vârfurile s-ar atinge sub R1 + R2 + 2 + 1
  assert.equal(L.senilaMontaj(10, 10, 40).aproape, true);
  assert.equal(L.senilaMontaj(10, 10, 42).aproape, false);
});

test('marginile: dinții în afara plajei', () => {
  assert.deepEqual(simplu(pinion({ dinti: 4 }).avert), ['Un pinion de șenilă are între 6 și 40 de dinți: l-am făcut cu 6.']);
  assert.deepEqual(simplu(pinion({ dinti: 50 }).avert), ['Un pinion de șenilă are între 6 și 40 de dinți: l-am făcut cu 40.']);
  assert.deepEqual(simplu(pinion({ dinti: 14 }).avert), []);
});
