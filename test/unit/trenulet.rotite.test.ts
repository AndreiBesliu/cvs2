/**
 * Rotițele dințate din atelierul Easy 3Draw (ADR 0169, felia 3.Th), pe hârtie:
 * - profilul e generat de cremaliera de referință (20°, capul 1·m, piciorul 1,25·m): cercul de cap r + m, cel de picior
 *   r − 1,25·m, iar pe cercul de divizare dintele e gros cât jumătatea pasului minus jocul de pe ambele flancuri;
 * - două roți LEGO (modulul 1) puse la m·(z1 + z2)/2 nu se pătrund niciodată, iar jocul lor normal e 2 × joc × cos 20°;
 * - corpul e închis (fiecare muchie, o dată în fiecare sens) la dinți drepți, oblici și în V, cu același volum;
 * - gaura rămâne dreaptă, iar conturul se răsucește cu h · tan β / r radiani, în sensul ales; în V se întoarce sus;
 * - jocul vine din calibrare (varianta 3 = 0,15 mm pe flanc, câte 0,05 pe variantă), cu cinci roți de probă în set.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P2 = [number, number];
type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Profil = { z: number; m: number; r: number; ra: number; rf: number; raze: number[]; jum: number[] };
type Lego = {
  IMPLICIT: Record<string, unknown>;
  seteaza(s?: Record<string, unknown> | null): void;
  efective(): Record<string, number>;
  construieste(d: Record<string, unknown>): { tri: Tri[]; dim: number[]; avert: string[] };
  calibrare(): { nume: string; titlu: string; tri: Tri[] }[];
  distantaRoti(z1: number, z2: number, m?: number): number;
  _: { profilRoata(z: number, m: number, joc: number): Profil; conturRoata(R: Profil, fata?: number): P2[] };
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const cu = <T>(s: Record<string, unknown>, f: () => T): T => { L.seteaza(s); try { return f(); } finally { L.seteaza({}); } };
// obiectele motorului vin din contextul lui vm (alt tărâm): comparate după conținut
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const JOC = 0.15;

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
function volum(tri: readonly Tri[]): number {
  let v = 0;
  for (const [a, b, c] of tri) v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  return v / 6;
}
function inPoligon(p: P2, poli: readonly P2[]): boolean {
  let in_ = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i]!, [xj, yj] = poli[j]!;
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
}
function distSegment(p: P2, a: P2, b: P2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
/** Perechea pe distanța ei, pe un pas de dinte al primei: punctele uneia în cealaltă și jocul minim dintre flancuri. */
function angrenare(z1: number, z2: number, joc: number, pasi = 36): { patrunderi: number; jocMin: number } {
  const A = L._.profilRoata(z1, 1, joc), B = L._.profilRoata(z2, 1, joc), a = L.distantaRoti(z1, z2);
  let patrunderi = 0, jocMin = Infinity;
  for (let k = 0; k < pasi; k++) {
    const t1 = ((2 * Math.PI) / z1) * (k / pasi);
    const ca = L._.conturRoata(A, t1).map(([x, y]): P2 => [x, y]);
    const cb = L._.conturRoata(B, Math.PI + Math.PI / z2 - (t1 * z1) / z2).map(([x, y]): P2 => [x + a, y]);
    const zona = (p: P2) => Math.abs(p[1]) < 5 && p[0] > A.rf - 0.5 && p[0] < a - B.rf + 0.5;
    const pa = ca.filter(zona), pb = cb.filter(zona);
    for (const p of pa) if (inPoligon(p, cb)) patrunderi++;
    for (const p of pb) if (inPoligon(p, ca)) patrunderi++;
    const segB: [P2, P2][] = [];
    for (let i = 0; i < cb.length; i++) { const p = cb[i]!, q = cb[(i + 1) % cb.length]!; if (zona(p) || zona(q)) segB.push([p, q]); }
    for (const p of pa) for (const [s, e] of segB) jocMin = Math.min(jocMin, distSegment(p, s, e));
  }
  return { patrunderi, jocMin };
}

test('jocul dintre dinți vine din calibrare: 0,15 mm pe flanc la varianta 3, câte 0,05 pe variantă', () => {
  assert.equal(L.IMPLICIT['joc_dinti'], 0.15);
  assert.equal(L.IMPLICIT['varianta_dinti'], 3);
  assert.equal(L.IMPLICIT['pas_dinti'], 0.05);
  for (let v = 1; v <= 5; v++) {
    const joc = cu({ varianta_dinti: v }, () => L.efective()['jocDinti']!);
    assert.ok(Math.abs(joc - 0.05 * v) < 1e-12, `varianta ${v}: ${joc}`);
  }
});

test('profilul: cercurile de cap și de picior, dintele pe cercul de divizare, conturul închis și simetric', () => {
  for (const z of [8, 16, 24, 40]) {
    const R = L._.profilRoata(z, 1, JOC), r = z / 2;
    assert.equal(R.ra, r + 1);
    assert.equal(R.rf, r - 1.25);
    const c = L._.conturRoata(R, 0), raze = c.map(([x, y]) => Math.hypot(x, y));
    assert.ok(Math.abs(Math.max(...raze) - R.ra) < 1e-9, `z ${z}: capul`);
    assert.ok(Math.min(...raze) >= R.rf, `z ${z}: piciorul`);
    // grosimea dintelui pe cercul de divizare: (π/2 − 2 · joc) pe arc, deci jumătatea unghiului π/(2z) − joc/r
    const i = R.raze.findIndex((x) => x >= r), f = (r - R.raze[i - 1]!) / (R.raze[i]! - R.raze[i - 1]!);
    const jum = R.jum[i - 1]! + f * (R.jum[i]! - R.jum[i - 1]!);
    assert.ok(Math.abs((jum - (Math.PI / (2 * z) - JOC / r)) * r) < 0.005, `z ${z}: grosimea pe divizare, abaterea ${((jum - (Math.PI / (2 * z) - JOC / r)) * r).toFixed(4)} mm`);
    // același număr de puncte pe fiecare dinte (conturul se repetă la fiecare pas)
    assert.equal(c.length % z, 0, `z ${z}: puncte pe dinte`);
  }
});

test('perechile LEGO pe grilă: distanța m · (z1 + z2) / 2, fără pătrunderi; jocul minim, al flancului sau al piciorului', () => {
  // jocul minim e cel mai mic dintre jocul pe flanc (2 × joc × cos 20°) și cel de la picior (0,25 · m, între capul unei roți
  // și piciorul celeilalte): la 0,10 pe flanc hotărăște flancul (0,188), la 0,15 piciorul (0,25). Niciodată mai aproape
  // decât teoria; puțin mai larg se poate, la picior: golul se închide cu o coardă, iar pașii pot rata apropierea cea mai mare.
  for (const joc of [0.1, JOC]) {
    const asteptat = Math.min(2 * joc * Math.cos((20 * Math.PI) / 180), 0.25);
    for (const [z1, z2] of [[8, 24], [16, 16], [12, 20], [8, 40], [24, 24]] as const) {
      const a = L.distantaRoti(z1, z2);
      assert.equal(a % 8, 0, `${z1} + ${z2}: pe grila de 8 mm (${a})`);
      const g = angrenare(z1, z2, joc);
      assert.equal(g.patrunderi, 0, `${z1} + ${z2}, joc ${joc}: pătrunderi`);
      assert.ok(g.jocMin > asteptat - 0.005 && g.jocMin < asteptat + 0.04, `${z1} + ${z2}, joc ${joc}: jocul ${g.jocMin.toFixed(4)} mm, așteptat ${asteptat.toFixed(4)}`);
    }
  }
});

test('corpul e închis la dinți drepți, oblici și în V, cu aceeași cutie și același volum, la toate găurile', () => {
  for (const gaura of ['x', 'r', 'nu']) {
    const drept = L.construieste({ tip: 'rotita', dinti: 24, fel: 'drepti', gaura });
    const v0 = volum(drept.tri);
    for (const fel of ['drepti', 'oblici', 'inv']) {
      const r = L.construieste({ tip: 'rotita', dinti: 24, fel, gaura });
      assert.equal(muchiiRele(r.tri), 0, `${fel}, gaura ${gaura}: muchii fără pereche`);
      assert.deepEqual(simplu(r.dim.map((d) => Math.round(d * 1000) / 1000)), [26, 26, 3.8], `${fel}, gaura ${gaura}: cutia`);
      assert.ok(Math.abs(volum(r.tri) / v0 - 1) < 0.001, `${fel}, gaura ${gaura}: volumul ${volum(r.tri).toFixed(2)} față de ${v0.toFixed(2)}`);
    }
  }
});

/** Unghiurile vârfurilor (pe cercul de cap) de la o înălțime, aduse în jurul dintelui 0 (−pas/2 … pas/2). */
function unghiuriCap(tri: readonly Tri[], z: number, zh: number, ra: number, centru: P2): number[] {
  const pas = (2 * Math.PI) / z, u: number[] = [];
  for (const t of tri) for (const p of t) {
    if (Math.abs(p[2] - zh) > 1e-6 || Math.abs(Math.hypot(p[0] - centru[0], p[1] - centru[1]) - ra) > 1e-3) continue;
    let a = Math.atan2(p[1] - centru[1], p[0] - centru[0]) % pas;
    if (a > pas / 2) a -= pas;
    if (a < -pas / 2) a += pas;
    u.push(a);
  }
  return u;
}
const medie = (v: readonly number[]) => v.reduce((s, x) => s + x, 0) / v.length;

test('răsucirea: h · tan β / r radiani, în sensul ales; în V, sus la fel ca jos; gaura rămâne dreaptă', () => {
  const z = 24, h = 3.8, r = 12, ra = 13, delta = (h * Math.tan((20 * Math.PI) / 180)) / r;
  for (const [sens, semn] of [['dreapta', 1], ['stanga', -1]] as const) {
    const p = L.construieste({ tip: 'rotita', dinti: z, fel: 'oblici', unghi: 20, sens, grosime: h, gaura: 'x' });
    // după construire, piesa e mutată în colțul cutiei: centrul roții e la (ra, ra)
    const c: P2 = [ra, ra], jos = medie(unghiuriCap(p.tri, z, 0, ra, c)), sus = medie(unghiuriCap(p.tri, z, h, ra, c));
    assert.ok(Math.abs(sus - jos - semn * delta) < 0.002, `${sens}: răsucirea ${(sus - jos).toFixed(4)} față de ${(semn * delta).toFixed(4)}`);
    // gaura: aceleași puncte jos și sus (cele din cruce, la cel mult 2,6 mm de centru)
    const gaura = (zh: number) => new Set(p.tri.flatMap((t) => t.filter((q) => Math.abs(q[2] - zh) < 1e-6 && Math.hypot(q[0] - c[0], q[1] - c[1]) < 2.6)
      .map((q) => q[0].toFixed(5) + ',' + q[1].toFixed(5))));
    assert.deepEqual([...gaura(0)].sort(), [...gaura(h)].sort(), `${sens}: gaura dreaptă`);
  }
  const v = L.construieste({ tip: 'rotita', dinti: z, fel: 'inv', unghi: 20, grosime: h, gaura: 'x' });
  const c: P2 = [ra, ra];
  assert.ok(Math.abs(medie(unghiuriCap(v.tri, z, h, ra, c)) - medie(unghiuriCap(v.tri, z, 0, ra, c))) < 1e-6, 'în V: sus ca jos');
});

test('marginile: dinții (8–80), modulul (0,5–3), grosimea; peretele prea subțire dintre gaură și dinți e spus', () => {
  const putini = L.construieste({ tip: 'rotita', dinti: 5, gaura: 'nu' });
  assert.equal(Math.round(putini.dim[0]! * 1000) / 1000, 10, 'cel puțin 8 dinți');
  assert.ok(putini.avert.some((a) => a.includes('8')), putini.avert.join(' | '));
  assert.equal(Math.round(L.construieste({ tip: 'rotita', dinti: 120, gaura: 'nu' }).dim[0]! * 1000) / 1000, 82, 'cel mult 80 de dinți');
  assert.equal(Math.round(L.construieste({ tip: 'rotita', dinti: 20, modul: 0.2, gaura: 'nu' }).dim[0]! * 1000) / 1000, 11, 'modulul cel puțin 0,5');
  assert.equal(Math.round(L.construieste({ tip: 'rotita', dinti: 20, modul: 2, gaura: 'x' }).dim[0]! * 1000) / 1000, 44, 'modulul 2: Ø cap 2 · (20 + 2)');
  assert.ok(L.construieste({ tip: 'rotita', dinti: 8, gaura: 'x' }).avert.some((a) => a.includes('0,25 mm')), 'roata de 8 cu gaură de ax: 0,25 mm de perete');
  assert.deepEqual(simplu(L.construieste({ tip: 'rotita', dinti: 16, gaura: 'x' }).avert), [], 'roata de 16: fără avertisment');
  assert.equal(Math.round(L.construieste({ tip: 'rotita', dinti: 16, grosime: 8, gaura: 'x' }).dim[2]! * 1000) / 1000, 8, 'grosimea');
});

test('setul de calibrare: cinci roți de 16 dinți, cu jocul de 0,05 … 0,25 mm, închise, cu semnul pe față', () => {
  const roti = L.calibrare().filter((p) => p.nume.startsWith('calibrare_rotita_'));
  assert.deepEqual(simplu(roti.map((p) => p.nume)), [1, 2, 3, 4, 5].map((v) => `calibrare_rotita_${v}`));
  for (const [i, p] of roti.entries()) {
    assert.ok(p.titlu.includes(`joc ${String(Math.round(0.05 * (i + 1) * 100) / 100).replace('.', ',')} mm`), p.titlu);
    assert.equal(muchiiRele(p.tri), 0, `${p.nume}: închisă`);
    // semnul: i + 1 cubulețe de 1,2 mm deasupra feței de sus (3,8 mm)
    const varf = Math.max(...p.tri.flatMap((t) => t.map((q) => q[2])));
    assert.ok(Math.abs(varf - (3.79 + 1.2)) < 1e-9, `${p.nume}: semnul deasupra (${varf})`);
  }
});
