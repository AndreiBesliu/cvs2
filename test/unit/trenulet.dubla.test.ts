/**
 * Conica dublă din atelierul Easy 3Draw (ADR 0280, felia 3.Tn), pe hârtie:
 * - roata dreaptă de la rotițe (profilul, modulul, jocul din calibrare), lată de 8·m, cu piciorul dinților la r_p − 2·m (ca LEGO
 *   32270 și 32269, din LDraw) și discul cu 0,2 mm mai mic: în banda de mijloc (±2·m) dinții sunt exact ai rotiței;
 * - spre fiecare față, dintele se micșorează spre vârful unui con de 45°, la 2·m + r_p de mijloc: pe față, la scara
 *   (r_p − 2·m) / r_p; și se subțiază încă, liniar, până la 0,1·m pe flanc la față;
 * - montajul: pe axe paralele, axele la m·(z1 + z2) / 2, ca la rotițe; la 90°, planul de mijloc al fiecăreia la r_p(perechii) +
 *   2·m de axul perechii (12 → 8 mm, 20 → 12, 36 → 20);
 * - o pereche nu se pătrunde în nicio fază, dar e prinsă: la 90°, perechile egale și 12 cu 20 au jocul 2·joc (0,25 mm în plus n-o
 *   ating, 0,5 da), 12 cu 36 mai puțin (0,1 mm nu, 0,5 da); pe axe paralele, ca rotițele (0,25 nu, 0,4 da).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Lego = {
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  dublaMontaj(d: Record<string, unknown>, z2: unknown): { z: number; z2: number; m: number; paralel: number; acesta: number; perechea: number };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const dubla = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'conicaDubla', ...d });
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
/** Materialul la raza r, unghiul u (grade) și înălțimea z (de la fața de jos), față de axa roții; mișcat puțin de pe muchii. */
function material(p: Piesa): (r: number, u: number, z: number) => boolean {
  const f = inauntru(p.tri);
  return (r, u, z) => { const a = (u * Math.PI) / 180 + 1e-5; return f((r + 1.1e-4) * Math.cos(a) - p.baza[0]!, (r + 1.1e-4) * Math.sin(a) - p.baza[1]!, z - p.baza[2]!); };
}
const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
/** O roată în coordonatele ei (axa pe z, mijlocul la 0): vârfurile și „e material aici?”. */
function roata(z: number, m = 1) {
  const p = dubla({ dinti: z, modul: m, gaura: 'nu' }), b = p.baza, w = 8 * m, f = inauntru(p.tri), vf: P3[] = [];
  for (const t of p.tri) for (const q of t) vf.push([q[0] + b[0]!, q[1] + b[1]!, q[2] + b[2]! - w / 2]);
  return { vf, in: (x: number, y: number, zz: number) => f(x - b[0]!, y - b[1]!, zz + w / 2 - b[2]!), rp: (m * z) / 2 };
}
/**
 * La 90°: A cu axa pe z, mijlocul la 0; B cu axa pe x, la z H = r_pB + 2m, mijlocul la x X0 = r_pA + 2m; un gol al lui B în
 * dreptul dintelui 0 al lui A; rotite împreună (A cu φ, B cu φ·zA / zB), plus d mm pe cercul de divizare al lui A. Câte vârfuri
 * ale fiecăreia, din zona contactului, sunt în cealaltă, pe faze.
 */
function la90(zA: number, zB: number, m = 1): (faze: number[], d?: number) => number[] {
  const A = roata(zA, m), B = roata(zB, m), H = B.rp + 2 * m, X0 = A.rp + 2 * m, a0 = -Math.PI / 2 - Math.PI / zB, P = [A.rp, 0, H - B.rp];
  return (faze, d = 0) => faze.map((phi) => {
    const aA = phi + d / A.rp, aB = a0 + (phi * zA) / zB;
    let n = 0;
    for (const [x0, y0, z0] of A.vf) {
      const [x, y] = rot(x0, y0, aA);
      if (Math.hypot(x - P[0]!, y - P[1]!, z0 - P[2]!) > 9 * m) continue;
      const [u, v] = rot(y, z0 - H, -aB);
      if (B.in(u, v, x - X0)) n++;
    }
    for (const [x0, y0, z0] of B.vf) {
      const [y, zz] = rot(x0, y0, aB), x = X0 + z0, z = H + zz;
      if (Math.hypot(x - P[0]!, y - P[1]!, z - P[2]!) > 9 * m) continue;
      const [xa, ya] = rot(x, y, -aA);
      if (A.in(xa, ya, z)) n++;
    }
    return n;
  });
}
/** Pe axe paralele, la m·(zA + zB) / 2, cu un gol al lui B în dreptul dintelui 0 al lui A; ca mai sus. */
function paralel(zA: number, zB: number, m = 1): (faze: number[], d?: number) => number[] {
  const A = roata(zA, m), B = roata(zB, m), D = A.rp + B.rp, a0 = Math.PI - Math.PI / zB, P = [A.rp, 0];
  return (faze, d = 0) => faze.map((phi) => {
    const aA = phi + d / A.rp, aB = a0 - (phi * zA) / zB;
    let n = 0;
    for (const [x0, y0, z0] of A.vf) {
      const [x, y] = rot(x0, y0, aA);
      if (Math.hypot(x - P[0]!, y - P[1]!) > 4 * m) continue;
      const [u, v] = rot(x - D, y, -aB);
      if (B.in(u, v, z0)) n++;
    }
    for (const [x0, y0, z0] of B.vf) {
      const [u, v] = rot(x0, y0, aB), x = u + D, y = v;
      if (Math.hypot(x - P[0]!, y - P[1]!) > 4 * m) continue;
      const [xa, ya] = rot(x, y, -aA);
      if (A.in(xa, ya, z0)) n++;
    }
    return n;
  });
}
const suma = (v: number[]) => v.reduce((s, x) => s + x, 0);
const faze = (z: number) => Array.from({ length: 8 }, (_, i) => ((2 * Math.PI) / z) * (i / 8));

test('corpul e închis la toți dinții, găurile și modulele; ca LEGO 12 (32270), 14 × 14 × 8', () => {
  for (const [dinti, modul] of [[12, 1], [20, 1], [28, 1], [36, 1], [60, 1], [13, 1], [10, 1], [8, 1], [20, 2], [16, 0.7]]) {
    for (const gaura of ['x', 'r', 'nu']) {
      const p = dubla({ dinti, modul, gaura });
      assert.equal(muchiiRele(p.tri), 0, `${dinti} dinți, modulul ${modul}, ${gaura}: muchii fără pereche`);
    }
  }
  const lego = dubla();
  assert.deepEqual(simplu(lego.dim.map((v) => Math.round(v * 1000) / 1000)), [14, 14, 8]);
  assert.deepEqual(simplu(lego.avert), []);
  assert.deepEqual(simplu(dubla({ dinti: 20 }).dim.map((v) => Math.round(v * 1000) / 1000)), [22, 22, 8], 'ca LEGO 20 (32269)');
  assert.deepEqual(simplu(dubla({ dinti: 20, modul: 2 }).dim.map((v) => Math.round(v * 1000) / 1000)), [44, 44, 16], 'modulul 2');
});

test('montajul: pe axe paralele la m·(z1 + z2) / 2; la 90°, planul de mijloc al fiecăreia la r_p(perechii) + 2·m de axul ei', () => {
  for (const [z, z2, paralel_, acesta, perechea] of [[12, 12, 12, 8, 8], [12, 20, 16, 12, 8], [20, 36, 28, 20, 12], [28, 28, 28, 16, 16]]) {
    const M = L.dublaMontaj({ dinti: z }, z2);
    assert.deepEqual(simplu([M.paralel, M.acesta, M.perechea]), [paralel_, acesta, perechea], `${z} cu ${z2}`);
  }
  const M2 = L.dublaMontaj({ dinti: 12, modul: 2 }, 20);
  assert.deepEqual(simplu([M2.paralel, M2.acesta, M2.perechea]), [32, 24, 16], 'modulul 2: totul de două ori');
});

test('cotele LEGO 12: în banda de mijloc dinții rotiței; discul la r_p − 2·m − 0,2; pe față, capul la scara (r_p − 2·m) / r_p', () => {
  const f = material(dubla({ gaura: 'nu' })), r = material(L.construieste({ tip: 'rotita', dinti: 12, fel: 'drepti', grosime: 8, gaura: 'nu' }));
  // în bandă (z 2,5 … 5,5), punct cu punct ca rotița, între picior (4,75) și cap (7), pe un dinte și jumătate
  let diferite = 0, total = 0;
  for (const z of [2.5, 4, 5.5]) for (let rr = 4.8; rr <= 6.95; rr += 0.13) for (let u = -15; u <= 30; u += 0.7) {
    total++;
    if (f(rr, u, z) !== r(rr, u, z)) diferite++;
  }
  assert.equal(diferite, 0, `${diferite} din ${total} puncte altfel decât la rotiță`);
  // discul: în dreptul golului (15°), material până la 3,8, nu și peste; dintele 0 merge până la cap (7), în bandă
  assert.equal(f(3.75, 15, 4), true);
  assert.equal(f(3.85, 15, 4), false);
  assert.equal(f(6.95, 0, 4), true);
  assert.equal(f(7.05, 0, 4), false);
  // pe fețe (z 0,02 și 7,98), capul la 7·(4 / 6) = 4,667 (plus ce crește pe 0,02 mm: 7 / 6 / 50)
  for (const z of [0.02, 7.98]) {
    const cap = 7 * (4 / 6) + 7 / 6 / 50;
    assert.equal(f(cap - 0.05, 0, z), true, `capul pe față, z ${z}`);
    assert.equal(f(cap + 0.05, 0, z), false, `peste cap, pe față, z ${z}`);
  }
  // la jumătatea zonei de capăt (z 1), capul la 7·(5 / 6) = 5,833
  assert.equal(f(5.78, 0, 1), true);
  assert.equal(f(5.89, 0, 1), false);
});

test('pe față, dintele e subțiat cu 0,1·m pe flanc față de dintele micșorat al rotiței', () => {
  // la 4 mm de fața de sus: dintele rotiței micșorat cu scara 2 / 3 (7,98 ≈ fața) față de cel al conicei duble, pe cercul de r 4
  // (divizarea, micșorată): jumătatea rotiței e (π / 2 − 2·joc) / 2 / 6 rad; la conica dublă, cu 0,1 / 6 rad mai puțin
  const f = material(dubla({ gaura: 'nu' })), e = L.efective(), z = 7.995;
  const jum = ((Math.PI / 2 - 2 * e.jocDinti!) / 2 / 6) * (180 / Math.PI), sub = (0.1 / 6) * (180 / Math.PI), s = (4 + 7 / 6 / 200) / 6;
  assert.equal(f(6 * s, jum - sub - 0.15, z), true, `înăuntru: ${(jum - sub).toFixed(3)}°`);
  assert.equal(f(6 * s, jum - sub + 0.15, z), false, `afară: ${(jum - sub).toFixed(3)}°`);
});

test('perechea la 90° nu se pătrunde în nicio fază, dar e prinsă: egalele și 12 cu 20 au jocul 2·joc, 12 cu 36 mai puțin', () => {
  for (const [zA, zB, jos] of [[12, 12, 0.25], [20, 20, 0.25], [12, 20, 0.25], [12, 36, 0.1]] as [number, number, number][]) {
    const p = la90(zA, zB), f = faze(zA);
    assert.deepEqual(p(f), f.map(() => 0), `${zA} cu ${zB}: fazele`);
    assert.deepEqual([suma(p(f, jos)), suma(p(f, -jos))], [0, 0], `${zA} cu ${zB}: ±${jos} mm`);
    const prea = [suma(p(f, 0.5)), suma(p(f, -0.5))];
    assert.ok(prea.every((n) => n > 100), `${zA} cu ${zB}: ±0,5 mm trebuie să atingă (${prea})`);
  }
});

test('pe axe paralele, ca rotițele: 0,25 mm în plus n-o atinge, 0,4 mm da', () => {
  for (const [zA, zB] of [[12, 20], [20, 20]] as [number, number][]) {
    const p = paralel(zA, zB), f = faze(zA);
    assert.deepEqual(p(f), f.map(() => 0), `${zA} cu ${zB}: fazele`);
    assert.deepEqual([suma(p(f, 0.25)), suma(p(f, -0.25))], [0, 0], `${zA} cu ${zB}: ±0,25 mm`);
    const prea = [suma(p(f, 0.4)), suma(p(f, -0.4))];
    assert.ok(prea.every((n) => n > 100), `${zA} cu ${zB}: ±0,4 mm trebuie să atingă (${prea})`);
  }
});

test('marginile: dinții în afara plajei, gaura care nu încape sau iese slabă', () => {
  assert.deepEqual(simplu(dubla({ dinti: 100 }).avert), ['O conică dublă are între 8 și 60 de dinți: am făcut-o cu 60.']);
  assert.deepEqual(simplu(dubla({ dinti: 8 }).avert), ['Gaura nu încape în conica asta dublă: am făcut-o fără gaură. Alege mai mulți dinți sau un modul mai mare.']);
  // la 10 dinți, discul de r 5 − 2 − 0,2 = 2,8, iar colțul crucii la √(2,5² + 1²) = 2,693: 0,107 mm
  assert.deepEqual(simplu(dubla({ dinti: 10 }).avert), ['Între gaură și marginea discului rămân doar 0,11 mm: roata iese slabă. Alege mai mulți dinți sau un modul mai mare.']);
  assert.ok(aproape(dubla({ dinti: 8, gaura: 'r' }).dim[2]!, 8, 1e-6));
});
