/**
 * Roata coroană din atelierul Easy 3Draw (ADR 0280, felia 3.Tm), pe hârtie:
 * - dinții pe fața de sus, tăiați de pinion: o roată dreaptă (rotițele, modulul 1, dinții de 20°) cu axul la 90°, culcat peste
 *   raza coroanei, cu axele întâlnite; planul de divizare la 4·m de fața de jos, ca la LEGO 3650 (din LDraw), deci axul
 *   pinionului la m·(4 + z1 / 2): 8, 12, 16 mm la pinioanele LEGO de 8, 16, 24;
 * - la raza de rostogolire r2 = m·z2 / 2, pe planul de divizare, dintele coroanei e golul cremalierei pinionului: jumătatea lui,
 *   (π·m / 2 − 2·joc) / 2 în lungul cercului (pinionul-cuțit e îngroșat cu jocul din calibrare pe fiecare flanc);
 * - picioarele dinților la zp − 1,25·m (discul), capetele la zp + m; butucul lung până la 8·m (ca 3650), cel scurt până la capete;
 * - o pereche montată (pinionul: roata dreaptă de la rotițe) nu se pătrunde în nicio fază, dar e prinsă: jocul pe cercul de
 *   divizare al pinionului e 2·joc (0,3 mm), deci 0,25 mm în plus n-o atinge, 0,4 mm da.
 * Razele dinților (de la subtăiere la ascuțire) ies din tăiere, nu din hârtie: proba lor e perechea, plus coroana LEGO (dinții
 * nu ies în afara lui 3650, de cel mult 13,19 mm din LDraw, și îi acoperă un pinion LEGO de 8, gros de 3,8, cu mijlocul la 12
 * mm, pe jumătatea de pas).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Montaj = {
  z2: number; z1: number; m: number; prinde: boolean; axa: number; rIn: number; rOut: number; mijloc: number; grosime: number;
  butucLung: number; inCale: boolean;
};
type Lego = {
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  coroanaMontaj(d: Record<string, unknown>): Montaj;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const coroana = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'coroana', ...d });
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
  return (r, u, z) => { const a = (u * Math.PI) / 180 + 1e-5; return f((r + 1.1e-4) * Math.cos(a) - p.baza[0]!, (r + 1.1e-4) * Math.sin(a) - p.baza[1]!, z); };
}
function volum(tri: readonly Tri[]): number {
  let v = 0;
  for (const [a, b, c] of tri) v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  return v / 6;
}
const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
/**
 * Coroana z2 (axa pe z, fața de jos la 0) și pinionul ei z1 (roata dreaptă de la rotițe, grosimea din montaj) cu axa pe x, la
 * înălțimea axului, cu mijlocul la raza `mijloc` și un gol al lui în dreptul dintelui 0 al coroanei; rotite împreună (pinionul
 * φ, coroana φ·z1 / z2), plus `d` mm pe cercul de divizare al pinionului. Câte vârfuri ale fiecăruia (din zona contactului, la
 * cel mult 14 mm de el) sunt în celălalt, pentru fiecare fază.
 */
function pereche(z2: number, z1: number): (faze: number[], d?: number) => number[] {
  const M = L.coroanaMontaj({ dinti: z2, pinion: z1 });
  const co = coroana({ dinti: z2, pinion: z1, gaura: 'nu', butuc: 'scurt' });
  const pi = L.construieste({ tip: 'rotita', dinti: z1, fel: 'drepti', grosime: M.grosime, gaura: 'nu' });
  const inC = inauntru(co.tri), inP = inauntru(pi.tri), bc = co.baza, bp = pi.baza, r1 = z1 / 2, x0 = M.mijloc - M.grosime / 2;
  const psi = -Math.PI / 2 - Math.PI / z1, C = [M.mijloc, 0, 4];
  return (faze, d = 0) => faze.map((phi) => {
    const aP = psi + phi + d / r1, aC = (phi * z1) / z2;
    let n = 0;
    for (const t of pi.tri) for (const p of t) {
      const [y, zz] = rot(p[0] + bp[0]!, p[1] + bp[1]!, aP), x = x0 + p[2] + bp[2]!, z = zz + M.axa;
      if (Math.hypot(x - C[0]!, y - C[1]!, z - C[2]!) > 14) continue;
      const [xc, yc] = rot(x, y, -aC);
      if (inC(xc - bc[0]!, yc - bc[1]!, z - bc[2]!)) n++;
    }
    for (let i = 0; i < co.tri.length; i += 2) for (const p of co.tri[i]!) {
      const [x, y] = rot(p[0] + bc[0]!, p[1] + bc[1]!, aC), z = p[2] + bc[2]!;
      if (Math.hypot(x - C[0]!, y - C[1]!, z - C[2]!) > 14) continue;
      const [u, v] = rot(y, z - M.axa, -aP);
      if (inP(u - bp[0]!, v - bp[1]!, x - x0 - bp[2]!)) n++;
    }
    return n;
  });
}
const suma = (v: number[]) => v.reduce((s, x) => s + x, 0);

test('corpul e închis la toate perechile care se prind, găurile, butucii și modulele; celelalte se refuză', () => {
  for (const [dinti, pinion, modul] of [[24, 8, 1], [24, 24, 1], [12, 8, 1], [16, 16, 1], [40, 40, 1], [80, 8, 1], [28, 16, 2.5]]) {
    for (const gaura of ['x', 'r', 'nu']) for (const butuc of ['lung', 'scurt']) {
      const p = coroana({ dinti, pinion, gaura, butuc, modul });
      assert.equal(muchiiRele(p.tri), 0, `${dinti} pentru ${pinion}, ${gaura}, ${butuc}, modulul ${modul}: muchii fără pereche`);
    }
  }
  for (const [dinti, pinion] of [[12, 12], [16, 20], [24, 40]]) {
    assert.equal(L.coroanaMontaj({ dinti, pinion }).prinde, false, `${dinti} pentru ${pinion}`);
    assert.throws(() => coroana({ dinti, pinion }), { message: `Pinionul de ${pinion} nu se prinde cu o coroană de ${dinti}: alege o coroană mai mare.` });
  }
  const lego = coroana();
  assert.deepEqual(simplu(lego.dim.map((v) => Math.round(v * 1000) / 1000)), [25.8, 25.8, 8], 'implicit: ca LEGO 3650');
  assert.deepEqual(simplu(lego.avert), []);
});

test('montajul: axul pinionului la m·(4 + z1 / 2) de fața de jos; pinionul peste dinți; butucul lung în calea pinioanelor mici', () => {
  for (const [pinion, axa] of [[8, 8], [16, 12], [24, 16]]) assert.equal(L.coroanaMontaj({ pinion }).axa, axa, `pinionul de ${pinion}`);
  assert.equal(L.coroanaMontaj({ modul: 2 }).axa, 16, 'modulul 2: 2·(4 + 4)');
  for (const [dinti, pinion] of [[24, 8], [24, 24], [40, 8], [80, 40], [12, 8]]) {
    const M = L.coroanaMontaj({ dinti, pinion });
    const r2 = dinti / 2;
    assert.ok(M.prinde && M.rIn <= r2 && r2 <= M.rOut, `${dinti} pentru ${pinion}: dinții cuprind raza de rostogolire (${M.rIn}–${M.rOut})`);
    assert.ok(M.rIn >= r2 - 2.5 - 1e-9 && M.rOut <= r2 + 2 + 1e-9, `${dinti} pentru ${pinion}: cel mult 2,5·m înăuntru și 2·m în afară`);
    assert.ok(aproape(M.mijloc, (M.rIn + M.rOut) / 2, 1e-9));
    // pinionul acoperă dinții cu 0,3 mm de fiecare parte, cel puțin cât LEGO (3,8)
    assert.ok(M.grosime >= 3.8 && M.grosime >= M.rOut - M.rIn + 0.6 - 1e-9 && M.grosime < Math.max(3.8, M.rOut - M.rIn + 0.6) + 0.1, `${dinti} pentru ${pinion}: grosimea ${M.grosime}`);
  }
  // LEGO 24 / 8: dinții nu ies în afara lui 3650 (13,19, din LDraw), au cel puțin 1,5·m și îi acoperă pinionul LEGO de 8 (3,8
  // mm), cu mijlocul la 12 (jumătatea de pas)
  const lego = L.coroanaMontaj({});
  assert.ok(lego.rOut <= 13.19 && lego.rOut - lego.rIn >= 1.5 && lego.rIn >= 12 - 1.9 && lego.rOut <= 12 + 1.9, `${lego.rIn}–${lego.rOut}`);
  // butucul lung urcă la 8·m: axul LEGO (4,8 mm, plus 0,2 loc) al pinionului de 8 (la 8 mm) îl atinge, al celui de 16 (la 12) nu
  assert.equal(lego.butucLung, 8);
  assert.equal(lego.inCale, true);
  assert.equal(L.coroanaMontaj({ pinion: 16 }).inCale, false);
});

test('cotele LEGO 24 / 8: dintele la raza de rostogolire, pe planul de divizare; discul, capetele, butucul', () => {
  const f = material(coroana()), e = L.efective();
  // la r 12, pe planul de divizare (z 4): dintele k centrat la 15·k grade; jumătatea lui, (π / 2 − 2·joc) / 2 / 12 rad
  const jum = ((Math.PI / 2 - 2 * e.jocDinti!) / 2 / 12) * (180 / Math.PI);
  for (let k = 0; k < 24; k++) {
    assert.equal(f(12, 15 * k, 4), true, `dintele ${k}`);
    assert.equal(f(12, 15 * k + 7.5, 4), false, `golul ${k}`);
    assert.equal(f(12, 15 * k + jum - 0.1, 4), true, `flancul ${k}, înăuntru (${jum.toFixed(3)}°)`);
    assert.equal(f(12, 15 * k + jum + 0.1, 4), false, `flancul ${k}, afară (${jum.toFixed(3)}°)`);
    assert.equal(f(12, 15 * k - jum + 0.1, 4), true, `flancul celălalt ${k}, înăuntru`);
    assert.equal(f(12, 15 * k - jum - 0.1, 4), false, `flancul celălalt ${k}, afară`);
  }
  // dinții țin de la rIn la rOut, cât spune montajul (atelierul i le arată omului)
  const M = L.coroanaMontaj({});
  for (const k of [0, 9, 20]) {
    assert.equal(f(M.rIn + 0.05, 15 * k, 4), true, `dintele ${k}, la capătul dinăuntru`);
    assert.equal(f(M.rIn - 0.1, 15 * k, 4), false, `dintele ${k}, înainte de capătul dinăuntru`);
    assert.equal(f(M.rOut - 0.05, 15 * k, 4), true, `dintele ${k}, la capătul dinafară`);
    assert.equal(f(M.rOut + 0.1, 15 * k, 4), false, `dintele ${k}, după capătul dinafară`);
  }
  // discul până la piciorul dinților (zp − 1,25 = 2,75), în dreptul golului; capetele la zp + 1 = 5
  assert.equal(f(12, 7.5, 2.7), true);
  assert.equal(f(12, 7.5, 2.8), false);
  assert.equal(f(12, 0, 4.95), true);
  assert.equal(f(12, 0, 5.05), false);
  // butucul lung: r 3,89 (ca la rotițe), până la 8 mm, cu gaura de ax
  assert.equal(f(3.8, 45, 7.9), true);
  assert.equal(f(4.0, 45, 7.9), false);
  assert.equal(f(3.8, 45, 8.1), false);
  assert.equal(f(2.3, 0, 4), false, 'brațul crucii');
  assert.equal(f(2.5, 45, 4), true, 'între brațe');
  // butucul scurt: până la capetele dinților
  const s = material(coroana({ butuc: 'scurt' }));
  assert.equal(s(3.8, 45, 4.9), true);
  assert.equal(s(3.8, 45, 5.1), false);
});

test('dinții n-au consolă (se printează cu ei în sus): jumătatea dintelui nu crește în sus cu mai mult de 0,05 mm', () => {
  // în mm, în lungul cercului, față de cel mai îngust loc de dedesubt. Spre capătul dinăuntru, vârful dintelui umple subtăierea
  // pinionului de 8 (golul lui e mai larg la picior): se lărgește în sus cu 0,017 mm la 24 / 8 și cu 0,038 mm la 40 / 8, sub
  // orice imprimantă. Fără plafonul golului de sub capul real, crestătura de chiar sub el face 0,13 … 0,21 mm. Departe de
  // capetele dinților: capacul lor, un poligon pe cilindru, triunghiulat, intră spre axă cu până la ~0,06 mm.
  for (const dinti of [24, 40]) {
    const f = material(coroana({ dinti })), M = L.coroanaMontaj({ dinti }), pas = 180 / dinti;
    const jum = (r: number, z: number) => { let a = 0, b = pas; for (let i = 0; i < 30; i++) { const c = (a + b) / 2; if (f(r, c, z)) a = c; else b = c; } return (a * Math.PI * r) / 180; };
    for (const r of [M.rIn + 0.15, (M.rIn + M.mijloc) / 2, dinti / 2, M.rOut - 0.15]) {
      let minJos = Infinity;
      for (let z = 2.8; z <= 4.96; z += 0.08) {
        const w = jum(r, z);
        assert.ok(w <= minJos + 0.05, `${dinti} pentru 8, r ${r.toFixed(2)}, z ${z.toFixed(2)}: ${w.toFixed(4)} mm, dedesubt ${minJos.toFixed(4)} mm`);
        minJos = Math.min(minJos, w);
      }
    }
  }
});

test('modulul 2: totul de două ori (axul, discul, butucul), jocul rămâne cel din calibrare', () => {
  const p = coroana({ modul: 2 }), f = material(p), e = L.efective();
  assert.ok(aproape(p.dim[2]!, 16, 1e-6), 'butucul lung, 8·m');
  const jum = ((Math.PI - 2 * e.jocDinti!) / 2 / 24) * (180 / Math.PI);
  for (const k of [0, 5, 17]) {
    assert.equal(f(24, 15 * k + jum - 0.1, 8), true, `flancul ${k}, înăuntru (${jum.toFixed(3)}°)`);
    assert.equal(f(24, 15 * k + jum + 0.1, 8), false, `flancul ${k}, afară`);
  }
  assert.equal(f(24, 7.5, 5.4), true, 'discul, până la 5,5');
  assert.equal(f(24, 7.5, 5.6), false);
});

test('perechea la 90° nu se pătrunde în nicio fază, dar e prinsă: 0,25 mm în plus n-o atinge, 0,4 mm da', () => {
  for (const [z2, z1] of [[24, 8], [24, 24], [40, 40]] as [number, number][]) {
    const p = pereche(z2, z1), faze = Array.from({ length: 8 }, (_, i) => ((2 * Math.PI) / z1) * (i / 8));
    assert.deepEqual(p(faze), faze.map(() => 0), `${z2} pentru ${z1}: fazele`);
    assert.deepEqual([suma(p(faze, 0.25)), suma(p(faze, -0.25))], [0, 0], `${z2} pentru ${z1}: ±0,25 mm`);
    const prea = [suma(p(faze, 0.4)), suma(p(faze, -0.4))];
    assert.ok(prea.every((n) => n > 100), `${z2} pentru ${z1}: ±0,4 mm trebuie să atingă (${prea})`);
  }
});

test('găurile: crucea și știftul în butuc; discul se oprește la un cerc cu 0,05 mm peste alezaj', () => {
  const e = L.efective(), nu = volum(coroana({ gaura: 'nu', butuc: 'scurt' }).tri);
  const cerc = (r: number) => (48 / 2) * Math.sin((2 * Math.PI) / 48) * r * r;
  const cruce = e.axGauraD! * e.axGauraLat! * 2 - e.axGauraLat! * e.axGauraLat!;
  const rx = Math.hypot(e.axGauraD! / 2, e.axGauraLat! / 2), rr = e.gauraD! / 2;
  // discul (până la 2,75) are cercul de lângă alezaj; butucul scurt (până la 5), alezajul
  assert.ok(aproape(nu - volum(coroana({ gaura: 'x', butuc: 'scurt' }).tri), cerc(rx + 0.05) * 2.75 + cruce * 5, 0.02), 'crucea');
  assert.ok(aproape(nu - volum(coroana({ gaura: 'r', butuc: 'scurt' }).tri), cerc(rr + 0.05) * 2.75 + cerc(rr) * 5, 0.02), 'știftul');
});

test('marginile: dinții și pinionul în afara plajelor, dinții scurți', () => {
  assert.deepEqual(simplu(coroana({ dinti: 100 }).avert), ['O roată coroană are între 12 și 80 de dinți, pinionul între 8 și 40: am făcut-o de 80, pentru unul de 8.']);
  assert.deepEqual(simplu(coroana({ pinion: 4 }).avert), ['O roată coroană are între 12 și 80 de dinți, pinionul între 8 și 40: am făcut-o de 24, pentru unul de 8.']);
  const M = L.coroanaMontaj({ dinti: 12 }), scurt = coroana({ dinti: 12 });
  const lung = String(Math.round((M.rOut - M.rIn) * 10) / 10).replace('.', ',');
  assert.ok(M.rOut - M.rIn < 1, `12 pentru 8: ${M.rIn}–${M.rOut}`);
  // 24 / 16 (o pereche LEGO obișnuită) are dinții mai lungi de un modul: fără avertisment
  const M16 = L.coroanaMontaj({ pinion: 16 });
  assert.ok(M16.rOut - M16.rIn >= 1, `24 pentru 16: ${M16.rIn}–${M16.rOut}`);
  assert.deepEqual(simplu(coroana({ pinion: 16 }).avert), []);
  assert.deepEqual(simplu(scurt.avert), [`Dinții coroanei ies scurți pentru pinionul de 8 (${lung} mm în lungul razei): țin mai bine pe o coroană mai mare.`]);
  assert.equal(muchiiRele(scurt.tri), 0);
});
