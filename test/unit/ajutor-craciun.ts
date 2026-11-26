/**
 * Uneltele comune ale probelor decorațiunilor de Crăciun din atelierul Easy 3Draw (ADR 0285): formele „de pe hârtie”
 * (poligoane, tije, inelul de agățat), compararea plasei cu hârtia punct cu punct (`caPeHartie`), măsurarea bucăților de
 * lemn pe o dreaptă (`bucati`) și verificările plasei (închisă, plată).
 */
import assert from 'node:assert/strict';
import { plasa, plin, muchiiFaraPereche, dinMotor, type P3, type Piesa } from './ajutor-plasa-lego.ts';

export type P2 = [number, number];
export type Def = Record<string, unknown>;
export type Vf = [number, number, number];
export const RAD = Math.PI / 180;
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const num = (v: unknown, implicit: number): number => (typeof v === 'number' ? v : implicit);

// ---------------------------------------------------------------------------------------------- uneltele de pe hârtie
export const inPoli = (poli: readonly P2[], [x, y]: P2): boolean => {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i]!, b = poli[j]!;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
};
export const distSeg = ([x, y]: P2, a: P2, b: P2): number => {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
};
export const distMargine = (poli: readonly P2[], p: P2): number => Math.min(...poli.map((a, i) => distSeg(p, a, poli[(i + 1) % poli.length]!)));
/** Poligonul regulat cu n vârfuri pe cercul de rază r, primul la unghiul u0. */
export const regulat = (n: number, r: number, u0: number): P2[] => Array.from({ length: n }, (_, k): P2 => [r * Math.cos(u0 + 2 * Math.PI * k / n), r * Math.sin(u0 + 2 * Math.PI * k / n)]);
/** Steaua cu n colțuri pe raza R (primul la unghiul u0) și cu vârfurile dinăuntru pe raza ri, la jumătatea dintre colțuri. */
export const steaPoli = (n: number, R: number, ri: number, u0: number): P2[] => Array.from({ length: 2 * n }, (_, k): P2 => { const r = k % 2 ? ri : R, u = u0 + Math.PI * k / n; return [r * Math.cos(u), r * Math.sin(u)]; });
/** Tija cu capăt rotund: pleacă drept din A, pe direcția u, lungă de lg (până la vârful capătului), lată de w. */
export const inTija = (A: P2, u: number, lg: number, w: number, [x, y]: P2): boolean => {
  const dx = Math.cos(u), dy = Math.sin(u), s = (x - A[0]) * dx + (y - A[1]) * dy, t = -(x - A[0]) * dy + (y - A[1]) * dx, c = lg - w / 2;
  return s >= 0 && (s <= c ? Math.abs(t) <= w / 2 : Math.hypot(s - c, t) <= w / 2);
};
/** Inelul de agățat (ADR 0285): golul de 3 mm, peretele de 1,6, cu vârful piesei intrat 0,4 mm în perete (centrul, la 1,9). */
export const INEL = { gol: 1.5, afara: 3.1, sus: 1.9, tot: 5 };
export const inInel = (varf: number, [x, y]: P2): boolean => { const r = Math.hypot(x, y - (varf + INEL.sus)); return r >= INEL.gol && r <= INEL.afara; };
/** Tija inelului pe un vârf ascuțit: lată de 2,4, de la 0,2 peste vârf până unde forma e mai lată decât ea. */
export const TIJA = 2.4;
export function inTijaInel(poli: readonly P2[], varf: number, [x, y]: P2): boolean {
  let k = 1;
  while (!inPoli(poli, [TIJA / 2 + 0.2, varf - k / 10]) && k < 2000) k++;
  return Math.abs(x) <= TIJA / 2 && y <= varf + 0.2 && y >= varf - k / 10;
}
/** Numere la întâmplare, mereu aceleași. */
export function sir(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/**
 * Plasa față de hârtie, în `puncte` locuri la întâmplare din cutia dată, la înălțimea z: lemnul plasei e lemnul de pe
 * hârtie. Punctele de lângă o margine (la mai puțin de 0,04 mm) nu se judecă: arcele plasei sunt din laturi.
 */
export function caPeHartie(p: Piesa, pe: (q: P2) => boolean, cutie: readonly [number, number, number, number], z: number, ce: string, puncte = 3000, samanta = 7): { judecate: number; lemn: number } {
  const u = sir(samanta), [x0, y0, x1, y1] = cutie, e = 0.04;
  let judecate = 0, lemn = 0;
  for (let i = 0; i < puncte; i++) {
    const q: P2 = [x0 + (x1 - x0) * u(), y0 + (y1 - y0) * u()], a = pe(q);
    if ([[e, 0], [-e, 0], [0, e], [0, -e], [e, e], [-e, -e], [e, -e], [-e, e]].some(([dx, dy]) => pe([q[0] + dx!, q[1] + dy!]) !== a)) continue;
    judecate++; if (a) lemn++;
    assert.equal(plin(p, dinMotor(p, [q[0], q[1], z] as P3)), a, `${ce}: la (${q[0].toFixed(2)}, ${q[1].toFixed(2)}) plasa are ${a ? 'gol' : 'lemn'}, iar hârtia ${a ? 'lemn' : 'gol'}`);
  }
  return { judecate, lemn };
}
/** Bucățile de lemn de pe segmentul A → B (la înălțimea z), cu pasul de 0,01 mm: [de unde, până unde], în mm de la A. */
export function bucati(p: Piesa, A: P2, B: P2, z: number): [number, number][] {
  const lg = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.round(lg / 0.01), out: [number, number][] = [];
  let de = -1;
  for (let k = 0; k <= n; k++) {
    const t = k / n, a = plin(p, dinMotor(p, [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]), z] as P3));
    if (a && de < 0) de = k;
    if ((!a || k === n) && de >= 0) { out.push([de * lg / n, (a ? k : k - 1) * lg / n]); de = -1; }
  }
  return out;
}
export const inchisa = (p: Piesa, ce: string, corpuri = 1) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(m.corpuri, corpuri, `${ce}: câte bucăți`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
/** Piesa plată, cu pereții drepți: fiecare triunghi e orizontal (jos sau sus) sau vertical; nimic nu stă în aer. */
export function plata(p: Piesa, ce: string): void {
  for (const [a, b, c] of p.tri) {
    const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const lg = Math.hypot(n[0]!, n[1]!, n[2]!);
    if (lg < 1e-12) continue;
    const nz = Math.abs(n[2]! / lg);
    assert.ok(nz < 1e-9 || nz > 1 - 1e-9, `${ce}: un triunghi înclinat (nz = ${nz})`);
  }
}
