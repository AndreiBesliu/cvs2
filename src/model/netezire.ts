/**
 * Netezirea (ADR 0180 §9; felia 10.3↑e), pură: șirurile de linii scurte ale unei căi devin cubice netede, potrivite direct pe
 * punctele lor (Schneider: cele mai mici pătrate cu tangentele capetelor date, reparametrizarea Newton, împărțirea în punctul
 * cel mai depărtat, cu tangenta lui comună), nu simplificate întâi. Fiecare cubică se primește doar dacă abaterea Hausdorff
 * față de bucata ei de șir (laturile și nodurile, în ambele sensuri) încape în toleranță; o latură singură care nu încape
 * rămâne linie.
 * - **Ce rămâne:** liniile mai lungi de „Păstrează”, arcele, curbele și colțurile. Un colț e un vârf în care drumul se
 *   întoarce cu peste 60°, măsurat pe 4 × toleranța de fiecare parte: treptele unei trasări, mai mici decât atât, nu sunt
 *   colțuri (o curbă netedă le poate urma doar cu o toleranță cât ele), un colț adevărat rămâne vârf. La mai puțin de atât
 *   de capătul unui șir, întoarcerea nu se judecă (coarda ar fi trunchiată).
 * - **Un șir drept** (toate punctele pe coarda lui) rămâne linii: n-are ce netezi.
 * - **Legăturile:** cu o linie lungă, un arc sau o curbă păstrate, curba nouă le ia tangenta (netedă), dacă legătura nu e colț.
 *   Pe o cale închisă, vârful 0 rămâne vârf (de el ține intrarea frezei), cu tangenta netedă.
 * - **În lume:** colțurile, lungimile și abaterea se măsoară pe foaie (matricea elementului), iar mânerele se duc înapoi cu
 *   inversa: o cubică rămâne cubică sub orice matrice afină. Capetele bucăților rămân vârfurile vechi, la bit.
 */
import type { Contur, Punct } from '../geom/contur.ts';
import { inversa } from '../geom/inversa.ts';
import { aplica, type Matrice } from '../geom/matrice.ts';
import { dinspre } from './abatereContur.ts';
import type { FormaDoc, VarfDoc } from './document.ts';

/**
 * Un vârf în care drumul se întoarce cu mai mult de atât e un colț ascuțit și rămâne. Pragul e mai mare decât la Arce (30°):
 * acolo un arc nu trebuie să treacă peste nicio îndoitură, aici netezirea chiar le scoate pe cele mici (la capătul unui
 * platou, treptele unei trasări se întorc cu 37–45° pe scara toleranței); pătratul și triunghiul își păstrează colțurile.
 */
export const COLT_NETEZIRE = Math.PI / 3;
/** Colțurile și tangentele se măsoară pe atâtea toleranțe de fiecare parte a vârfului. */
export const SCARA_NETEZIRE = 4;

export type StareNetezire = { abatere: number; curbe: number; linii: number };

type P = Punct;
type Bez = readonly [P, P, P, P];
type Piesa = { readonly de: number; readonly la: number; readonly bez: Bez | null; readonly dev: number };

const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
const dot = (a: P, b: P): number => a.x * b.x + a.y * b.y;
const dist = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y);
function norm(v: P): P | null {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-15 ? { x: v.x / l, y: v.y / l } : null;
}
function unghi(u: P, v: P): number {
  return Math.atan2(Math.abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y);
}
const rot = (v: P, a: number): P => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

/** Tangentele unui segment (sensul de mers), la început și la capăt, în coordonatele elementului. */
function tangente(a: P, b: P, s: VarfDoc['s']): { readonly t0: P; readonly t1: P } {
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const th = 4 * Math.atan(s.bulge), c = sub(b, a);
    return { t0: rot(c, -th / 2), t1: rot(c, th / 2) };
  }
  if (s.tip === 'C') {
    const t0 = dist(s.c1, a) > 1e-15 ? sub(s.c1, a) : dist(s.c2, a) > 1e-15 ? sub(s.c2, a) : sub(b, a);
    const t1 = dist(b, s.c2) > 1e-15 ? sub(b, s.c2) : dist(b, s.c1) > 1e-15 ? sub(b, s.c1) : sub(b, a);
    return { t0, t1 };
  }
  return { t0: sub(b, a), t1: sub(b, a) };
}

// ——— Potrivirea unei cubice (Schneider) ———

const punctBez = (b: Bez, u: number): P => {
  const v = 1 - u, k0 = v * v * v, k1 = 3 * v * v * u, k2 = 3 * v * u * u, k3 = u * u * u;
  return { x: k0 * b[0].x + k1 * b[1].x + k2 * b[2].x + k3 * b[3].x, y: k0 * b[0].y + k1 * b[1].y + k2 * b[2].y + k3 * b[3].y };
};
const derivata1 = (b: Bez, u: number): P => {
  const v = 1 - u;
  return add(add(mul(sub(b[1], b[0]), 3 * v * v), mul(sub(b[2], b[1]), 6 * v * u)), mul(sub(b[3], b[2]), 3 * u * u));
};
const derivata2 = (b: Bez, u: number): P =>
  add(mul(add(sub(b[2], mul(b[1], 2)), b[0]), 6 * (1 - u)), mul(add(sub(b[3], mul(b[2], 2)), b[1]), 6 * u));

/** Parametrii punctelor i0…i1, după lungimea coardelor. */
function parametri(R: readonly P[], i0: number, i1: number): number[] {
  const u = [0];
  for (let j = i0 + 1; j <= i1; j++) u.push((u[u.length - 1] as number) + dist(R[j] as P, R[j - 1] as P));
  const L = u[u.length - 1] as number;
  return u.map((x) => (L > 0 ? x / L : 0));
}

/** Cubica celor mai mici pătrate prin capete, cu mânerele pe tangentele date (t2 arată înapoi, din capăt spre curbă). */
function genereaza(R: readonly P[], i0: number, i1: number, u: readonly number[], t1: P, t2: P): Bez {
  const a = R[i0] as P, b = R[i1] as P;
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let j = i0; j <= i1; j++) {
    const t = u[j - i0] as number, v = 1 - t;
    const b0 = v * v * v, b1 = 3 * v * v * t, b2 = 3 * v * t * t, b3 = t * t * t;
    const A0 = mul(t1, b1), A1 = mul(t2, b2);
    c00 += dot(A0, A0); c01 += dot(A0, A1); c11 += dot(A1, A1);
    const r = sub(R[j] as P, add(mul(a, b0 + b1), mul(b, b2 + b3)));
    x0 += dot(A0, r); x1 += dot(A1, r);
  }
  const det = c00 * c11 - c01 * c01;
  let al = det !== 0 ? (x0 * c11 - x1 * c01) / det : 0;
  let ar = det !== 0 ? (c00 * x1 - c01 * x0) / det : 0;
  const lung = dist(a, b);
  if (!(al > 1e-6 * lung) || !(ar > 1e-6 * lung)) al = ar = lung / 3;
  return [a, add(a, mul(t1, al)), add(b, mul(t2, ar)), b];
}

/** Un pas Newton pentru parametrul punctului p pe cubică, prins în [0, 1]. */
function newton(b: Bez, p: P, u: number): number {
  const q = sub(punctBez(b, u), p), d1 = derivata1(b, u), d2 = derivata2(b, u);
  const den = dot(d1, d1) + dot(q, d2);
  if (!(Math.abs(den) > 0)) return u;
  return Math.max(0, Math.min(1, u - dot(q, d1) / den));
}

/** Abaterea Hausdorff dintre cubică și bucata de șir: întâi sensul ieftin (cubica spre linii), cu ieșire devreme. */
function verifica(R: readonly P[], i0: number, i1: number, b: Bez, tol: number): number {
  const poli: Contur = { inchis: false, varfuri: R.slice(i0, i1 + 1).map((p) => ({ p, s: { tip: 'L' as const } })) };
  const cub: Contur = { inchis: false, varfuri: [{ p: b[0], s: { tip: 'C', c1: b[1], c2: b[2] } }, { p: b[3], s: { tip: 'L' } }] };
  const a = dinspre(cub, poli, Math.max(24, 4 * (i1 - i0)));
  return a > tol ? a : Math.max(a, dinspre(poli, cub, 24));
}

/** O latură singură: cubica cu tangentele date (mânerele de o treime, apoi de o șesime), sau linia, dacă nu încape. */
function unSegment(R: readonly P[], i0: number, t1: P, t2: P, tol: number): Piesa {
  const a = R[i0] as P, b = R[i0 + 1] as P, L = dist(a, b);
  for (const k of [1 / 3, 1 / 6]) {
    const bez: Bez = [a, add(a, mul(t1, L * k)), add(b, mul(t2, L * k)), b];
    const dev = verifica(R, i0, i0 + 1, bez, tol);
    if (dev <= tol) return { de: i0, la: i0 + 1, bez, dev };
  }
  return { de: i0, la: i0 + 1, bez: null, dev: 0 };
}

/** Potrivirea recursivă pe punctele i0…i1, cu tangenta de pornire t1 și cea de sosire t2 (înapoi). */
function potriveste(R: readonly P[], i0: number, i1: number, t1: P, t2: P, tol: number, tan: (j: number) => P, out: Piesa[]): void {
  if (i1 - i0 === 1) {
    out.push(unSegment(R, i0, t1, t2, tol));
    return;
  }
  let u = parametri(R, i0, i1);
  let b = genereaza(R, i0, i1, u, t1, t2);
  let max = 0, split = Math.floor((i0 + i1) / 2);
  const masoara = (): void => {
    max = 0;
    for (let j = i0 + 1; j < i1; j++) {
      const d = dist(punctBez(b, u[j - i0] as number), R[j] as P);
      if (d > max) { max = d; split = j; }
    }
  };
  masoara();
  for (let it = 0; it <= 8 && max <= 4 * tol; it++) {
    if (max <= tol) {
      const dev = verifica(R, i0, i1, b, tol);
      if (dev <= tol) {
        out.push({ de: i0, la: i1, bez: b, dev });
        return;
      }
      break;
    }
    u = u.map((x, k) => newton(b, R[i0 + k] as P, x));
    b = genereaza(R, i0, i1, u, t1, t2);
    masoara();
  }
  const s = Math.min(i1 - 1, Math.max(i0 + 1, split));
  const tc = tan(s);
  potriveste(R, i0, s, t1, mul(tc, -1), tol, tan, out);
  potriveste(R, s, i1, tc, t2, tol, tan, out);
}

// ——— Lanțurile, colțurile, bucățile ———

/** Un drum prin puncte (în lume), cu lungimea parcursă; închis: se înfășoară. */
class Drum {
  readonly S: number[] = [0];
  readonly R: readonly P[];
  readonly inchis: boolean;
  constructor(R: readonly P[], inchis: boolean) {
    this.R = R;
    this.inchis = inchis;
    for (let j = 1; j < R.length; j++) this.S.push((this.S[j - 1] as number) + dist(R[j] as P, R[j - 1] as P));
  }
  get lungime(): number { return this.S[this.S.length - 1] as number; }
  /** Punctul de la lungimea s, prins în capete (deschis) sau înfășurat (închis). */
  la(s: number): P {
    const L = this.lungime;
    if (this.inchis && L > 0) s = ((s % L) + L) % L;
    else s = Math.max(0, Math.min(L, s));
    let lo = 0, hi = this.S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if ((this.S[m] as number) <= s) lo = m; else hi = m; }
    const a = this.R[lo] as P, b = this.R[hi] as P, s0 = this.S[lo] as number, s1 = this.S[hi] as number;
    return s1 > s0 ? add(a, mul(sub(b, a), (s - s0) / (s1 - s0))) : a;
  }
}

/**
 * Netezirea unei căi: vârfurile noi (în coordonatele elementului), sau null dacă nimic nu s-a schimbat. `M` e matricea
 * elementului în lume; toleranța și „Păstrează” sunt în mm ai foii.
 */
export function netezesteCale(f: Extract<FormaDoc, { tip: 'cale' }>, M: Matrice, tol: number, pastreaza: number, st: StareNetezire): VarfDoc[] | null {
  const v = f.varfuri, n = v.length;
  const inv = inversa(M);
  if (n < 3 || !inv) return null;
  const m = f.inchis ? n : n - 1;
  const W = v.map((x) => aplica(M, x.p));
  const vec = (t: P): P => ({ x: M.a * t.x + M.c * t.y, y: M.b * t.x + M.d * t.y });
  const D = SCARA_NETEZIRE * tol;
  const urm = (k: number): number => (k + 1) % n;
  const scurt = Array.from({ length: m }, (_, k) => {
    const s = (v[k] as VarfDoc).s;
    const linie = s.tip === 'L' || (s.tip === 'A' && Math.abs(s.bulge) <= 1e-12);
    return linie && dist(W[k] as P, W[urm(k)] as P) <= pastreaza;
  });
  if (!scurt.some((x, k) => x && scurt[(k + 1) % m] && (f.inchis || k + 1 < m))) return null;
  // Tangenta (în lume, sensul de mers) unui segment păstrat, la începutul sau la capătul lui.
  const tanSeg = (k: number, capat: boolean): P | null => {
    const t = tangente((v[k] as VarfDoc).p, (v[urm(k)] as VarfDoc).p, (v[k] as VarfDoc).s);
    return norm(vec(capat ? t.t1 : t.t0));
  };

  // Lanțurile: șiruri maximale de segmente scurte (indicii vârfurilor). Unul închis, doar din segmente scurte, e ciclic.
  const lanturi: { readonly idx: number[]; readonly ciclic: boolean }[] = [];
  if (f.inchis && scurt.every(Boolean)) {
    lanturi.push({ idx: Array.from({ length: n + 1 }, (_, j) => j % n), ciclic: true });
  } else {
    const start = f.inchis ? scurt.findIndex((x, k) => !x && scurt[(k + 1) % m]) + 1 : 0;
    let cur: number[] | null = null;
    for (let t = 0; t < m; t++) {
      const k = (start + t) % m;
      if (scurt[k]) { (cur ??= [k]).push(urm(k)); continue; }
      if (cur) lanturi.push({ idx: cur, ciclic: false });
      cur = null;
    }
    if (cur) lanturi.push({ idx: cur, ciclic: false });
  }

  const piese = new Map<number, { readonly la: number; readonly bez: Bez | null }>();
  for (const lant of lanturi) {
    const q = lant.idx.length - 1;
    const drum = new Drum(lant.idx.map((i) => W[i] as P), lant.ciclic);
    const dirLa = (j: number, inainte: boolean): P | null => {
      const s = drum.S[j] as number, p = drum.R[j] as P;
      return norm(inainte ? sub(drum.la(s + D), p) : sub(p, drum.la(s - D)));
    };
    const centrat = (j: number): P | null => norm(sub(drum.la((drum.S[j] as number) + D), drum.la((drum.S[j] as number) - D)));
    // Despărțirile: colțurile (pe scara D) și, pe o cale închisă, vârful 0 (neted).
    const rupturi: { readonly j: number; readonly colt: boolean }[] = [];
    for (let j = lant.ciclic ? 0 : 1; j < q; j++) {
      // La mai puțin de D de capătul unui lanț deschis, coarda e trunchiată și ar măsura treapta, nu drumul: nu se judecă.
      const sj = drum.S[j] as number;
      const margine = !lant.ciclic && (sj < D || drum.lungime - sj < D);
      const a = dirLa(j, false), b = dirLa(j, true);
      const colt = !margine && (!a || !b || unghi(a, b) > COLT_NETEZIRE);
      if (colt || (f.inchis && lant.idx[j] === 0)) rupturi.push({ j, colt });
    }
    // Capetele unui lanț deschis: legătura cu segmentul păstrat de dinainte / de după, netedă dacă nu e colț.
    let t0: P | null = null, tq: P | null = null;
    if (!lant.ciclic) {
      const i0 = lant.idx[0] as number, iq = lant.idx[q] as number;
      const inainte = f.inchis || i0 > 0 ? tanSeg((i0 - 1 + n) % n, true) : null;
      const dupa = f.inchis || iq < n - 1 ? tanSeg(iq % m, false) : null;
      const d0 = dirLa(0, true), dq = dirLa(q, false);
      if (inainte && d0 && unghi(inainte, d0) <= COLT_NETEZIRE) t0 = inainte;
      if (dupa && dq && unghi(dupa, dq) <= COLT_NETEZIRE) tq = dupa;
    }
    // Bucățile dintre despărțiri (un lanț ciclic fără colțuri: o singură bucată, de la vârful 0 înapoi la el).
    const capete = lant.ciclic ? rupturi.map((r) => r.j) : [0, ...rupturi.map((r) => r.j), q];
    if (lant.ciclic && capete.length === 0) capete.push(0);
    const colturi = new Set(rupturi.filter((r) => r.colt).map((r) => r.j));
    const nb = lant.ciclic ? capete.length : capete.length - 1;
    for (let k = 0; k < nb; k++) {
      const ja = capete[k] as number;
      let jb = lant.ciclic ? (capete[(k + 1) % capete.length] as number) : (capete[k + 1] as number);
      if (lant.ciclic && jb <= ja) jb += q;
      if (jb - ja < 2) continue;
      // Punctele bucății, în ordinea drumului (desfăcute peste capăt, la lanțul ciclic).
      const R: P[] = [], glob: number[] = [];
      const pe = (j: number): number => (lant.ciclic ? j % q : j);
      for (let j = ja; j <= jb; j++) { R.push(drum.R[pe(j)] as P); glob.push(lant.idx[pe(j)] as number); }
      // Un șir drept (toate punctele pe coarda lui) n-are ce netezi: rămâne linii.
      const a = R[0] as P, z = R[R.length - 1] as P, c = sub(z, a), lc = Math.hypot(c.x, c.y);
      if (lc > 1e-12 && R.every((x) => Math.abs((x.x - a.x) * c.y - (x.y - a.y) * c.x) <= 1e-9 * Math.max(1, lc) * Math.max(1, lc))) continue;
      const bucata = new Drum(R, false);
      const tanBucata = (j: number): P => {
        const s = bucata.S[j] as number;
        return norm(sub(bucata.la(s + D), bucata.la(s - D))) ?? norm(sub(R[j + 1] as P, R[j - 1] as P)) ?? { x: 1, y: 0 };
      };
      // Tangenta la un capăt de bucată: la un colț sau un capăt liber, din partea bucății; altfel, cea netedă.
      const capatA = ((): P => {
        if (!lant.ciclic && ja === 0 && t0) return t0;
        if ((lant.ciclic || ja > 0) && !colturi.has(pe(ja))) return centrat(pe(ja)) ?? tanBucata(0);
        return norm(sub(bucata.la(D), R[0] as P)) ?? tanBucata(0);
      })();
      const capatB = ((): P => {
        if (!lant.ciclic && jb === q && tq) return tq;
        if ((lant.ciclic || jb < q) && !colturi.has(pe(jb))) return centrat(pe(jb)) ?? tanBucata(R.length - 1);
        return norm(sub(R[R.length - 1] as P, bucata.la(bucata.lungime - D))) ?? tanBucata(R.length - 1);
      })();
      const out: Piesa[] = [];
      potriveste(R, 0, R.length - 1, capatA, mul(capatB, -1), tol, tanBucata, out);
      for (const p of out) {
        piese.set(glob[p.de] as number, { la: glob[p.la] as number, bez: p.bez });
        if (p.bez) {
          st.curbe++;
          st.linii += p.la - p.de;
          st.abatere = Math.max(st.abatere, p.dev);
        }
      }
    }
  }
  if (![...piese.values()].some((p) => p.bez)) return null;

  // Calea nouă: fiecare bucată cu cubica ei (mânerele duse înapoi în coordonatele elementului), restul vârfurilor neatinse.
  const rez: VarfDoc[] = [];
  for (let k = 0; k < m;) {
    const p = piese.get(k);
    const x = v[k] as VarfDoc;
    if (!p) { rez.push(x); k++; continue; }
    rez.push(p.bez ? { ...x, s: { tip: 'C', c1: aplica(inv, p.bez[1]), c2: aplica(inv, p.bez[2]) } } : { ...x, s: { tip: 'L' } });
    if (p.la === 0) break;
    k = p.la;
  }
  if (!f.inchis) rez.push(v[n - 1] as VarfDoc);
  return rez;
}
