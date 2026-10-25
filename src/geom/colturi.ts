/**
 * Colțurile offsetului din desen (ADR 0074 §2), peste ieșirea exactă a motorului (`offsetInchis`, unde fiecare colț ocolit e
 * un arc de rază |d| în jurul vârfului): **ca originalul** (implicit) prelungește vecinii arcului până se întâlnesc, deci
 * colțul ascuțit rămâne ascuțit; **rotunjite** lasă arcele motorului și racordează, cu raza |d|, orice colț rămas ascuțit (pe
 * offsetul spre interior, colțurile drepte ale dreptunghiului; spre exterior, cele intrânde). Fiecare schimbare se judecă: un
 * colț prelungit nu vine mai aproape de |d| de original și nimic nu se atinge; altfel colțul rămâne cum l-a dat motorul.
 * Pur, fără excepții: ce nu se poate face lasă ieșirea motorului, care e deja verificată.
 */
import { apropiereContururi } from './apropiere.ts';
import { arc, cerculArcului, LINIE, numarSegmente, segment, type Contur, type Punct, type Segment, type Varf } from './contur.ts';
import { seAutointersecteaza } from './offset.ts';

/** Cum ies colțurile offsetului din desen. */
export type Colturi = 'ca-originalul' | 'rotunjite';

/** Sub atâtea radiane între tangente, o joncțiune e netedă (biarcele, ADR 0033, sunt tangente pe ~1e-9). */
const PRAG_COLT = 1e-3;
/**
 * Cât de departe de vârf poate ajunge un colț prelungit (în |d|): 1 / sin(θ / 2) ≤ 10, deci colțurile mai ascuțite de ~11,5°
 * rămân rotunjite (ca limita implicită a prelungirii din desenul vectorial); altfel vârful fuge departe de formă.
 */
export const LIMITA_PRELUNGIRE = 10;
/** Cât poate diferi raza arcului de colț de |d|: a doua încercare a motorului ia |d| + 1e-4 (`PAS_REINCERCARE`). */
const TOL_RAZA = 2e-4;
/** Toleranța distanței la original (mm): sub rezoluția declarată. */
const TOL_DISTANTA = 1e-6;
/** O racordare care nu încape cu raza cerută se încearcă de atâtea ori cu jumătate din rază; apoi colțul rămâne. */
const INJUMATATIRI_RAZA = 2;

type P = Punct;
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
const dot = (a: P, b: P): number => a.x * b.x + a.y * b.y;
const cross = (a: P, b: P): number => a.x * b.y - a.y * b.x;
const len = (a: P): number => Math.hypot(a.x, a.y);
const doiPi = 2 * Math.PI;
/** Unghiul adus în [0, 2π). */
const norm = (u: number): number => ((u % doiPi) + doiPi) % doiPi;

/** Purtătorul unui segment: dreapta lui (punct și direcție unitară) sau cercul lui (cu sensul de parcurgere). */
type Purtator = { readonly tip: 'L'; readonly a: P; readonly u: P } | { readonly tip: 'A'; readonly c: P; readonly r: number; readonly trig: boolean };

function purtator(a: P, b: P, s: Segment): Purtator | null {
  if (s.tip === 'C') return null;
  if (s.tip === 'L') {
    const l = len(sub(b, a));
    return l > 1e-12 ? { tip: 'L', a, u: mul(sub(b, a), 1 / l) } : null;
  }
  const k = cerculArcului(a, b, s.bulge);
  return Number.isFinite(k.raza) && k.raza > 0 ? { tip: 'A', c: k.centru, r: k.raza, trig: s.bulge > 0 } : null;
}

/** Tangenta unitară a purtătorului în punctul p (de pe el), în sensul de parcurgere. */
function tangenta(t: Purtator, p: P): P {
  if (t.tip === 'L') return t.u;
  const r = mul(sub(p, t.c), 1 / t.r);
  return t.trig ? { x: -r.y, y: r.x } : { x: r.y, y: -r.x };
}

/** Purtătorul mutat cu `dist` spre stânga mersului (negativ: spre dreapta); null dacă cercul dispare. */
function decalat(t: Purtator, dist: number): Purtator | null {
  if (t.tip === 'L') return { tip: 'L', a: add(t.a, mul({ x: -t.u.y, y: t.u.x }, dist)), u: t.u };
  // Pe un arc trigonometric, stânga e spre centru.
  const r = t.trig ? t.r - dist : t.r + dist;
  return r > 1e-9 ? { tip: 'A', c: t.c, r, trig: t.trig } : null;
}

/** Intersecțiile purtătorilor (dreptele și cercurile întregi). */
function intersectii(p: Purtator, q: Purtator): P[] {
  if (p.tip === 'L' && q.tip === 'L') {
    const den = cross(p.u, q.u);
    if (Math.abs(den) < 1e-12) return [];
    const t = cross(sub(q.a, p.a), q.u) / den;
    return [add(p.a, mul(p.u, t))];
  }
  if (p.tip === 'A' && q.tip === 'L') return intersectii(q, p);
  if (p.tip === 'L' && q.tip === 'A') {
    const f = sub(p.a, q.c);
    const b = dot(f, p.u), c = dot(f, f) - q.r * q.r;
    const disc = b * b - c;
    if (disc < 0) return [];
    const s = Math.sqrt(disc);
    return [add(p.a, mul(p.u, -b - s)), add(p.a, mul(p.u, -b + s))];
  }
  if (p.tip !== 'A' || q.tip !== 'A') return [];
  const dv = sub(q.c, p.c), d = len(dv);
  if (d < 1e-12 || d > p.r + q.r || d < Math.abs(p.r - q.r)) return [];
  const a = (p.r * p.r - q.r * q.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, p.r * p.r - a * a));
  const m = add(p.c, mul(dv, a / d)), n = { x: -dv.y / d, y: dv.x / d };
  return [add(m, mul(n, h)), add(m, mul(n, -h))];
}

/** Proiecția lui p pe purtător (piciorul pe dreaptă, punctul cercului spre p). */
function proiectie(t: Purtator, p: P): P {
  if (t.tip === 'L') return add(t.a, mul(t.u, dot(sub(p, t.a), t.u)));
  const v = sub(p, t.c), l = len(v);
  return l < 1e-12 ? add(t.c, { x: t.r, y: 0 }) : add(t.c, mul(v, t.r / l));
}

/** Cât se merge pe purtător de la a la b, în sensul lui: mm pe dreaptă (cu semn), radiani pe cerc (în [0, 2π)). */
function mers(t: Purtator, a: P, b: P): number {
  if (t.tip === 'L') return dot(sub(b, a), t.u);
  const ua = Math.atan2(a.y - t.c.y, a.x - t.c.x), ub = Math.atan2(b.y - t.c.y, b.x - t.c.x);
  return t.trig ? norm(ub - ua) : norm(ua - ub);
}

/** Segmentul de la a la b pe purtător, în sensul lui (pe cerc, arcul care pleacă din a în sensul lui). */
function segmentPe(t: Purtator, a: P, b: P): Segment {
  if (t.tip === 'L') return LINIE;
  const baleiaj = mers(t, a, b) * (t.trig ? 1 : -1);
  return arc(Math.tan(baleiaj / 4));
}

/** Lungimea pe purtător a segmentului a → b (pe cerc, raza ori unghiul). */
function lungimePe(t: Purtator, a: P, b: P): number {
  return t.tip === 'L' ? mers(t, a, b) : mers(t, a, b) * t.r;
}

const bucata = (t: Purtator, a: P, b: P): Contur => ({ inchis: false, varfuri: [{ p: a, s: segmentPe(t, a, b) }, { p: b, s: LINIE }] });

/** Conturul rotit ca vârful k să fie primul. */
const rotit = (c: Contur, k: number): Varf[] => [...c.varfuri.slice(k), ...c.varfuri.slice(0, k)];

/** Bucățile noi stau la cel puțin |d| de original (cu toleranța). */
function departeDeOriginal(bucati: readonly Contur[], original: Contur, d: number): boolean {
  return bucati.every((b) => apropiereContururi(b, original, d).distanta >= d - TOL_DISTANTA * Math.max(1, d));
}

/** Contururile nu se ating singure și nici între ele. */
function curate(cs: readonly Contur[]): boolean {
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    if (!a || seAutointersecteaza(a)) return false;
    for (let j = i + 1; j < cs.length; j++) {
      const b = cs[j];
      if (b && apropiereContururi(a, b, 1e-6).distanta < 1e-6) return false;
    }
  }
  return true;
}

/** Vârfurile ascuțite ale originalului (curățat, în sensul trigonometric). */
function varfuriAscutite(original: Contur): P[] {
  const n = numarSegmente(original);
  const rez: P[] = [];
  for (let i = 0; i < n; i++) {
    const intra = segment(original, (i - 1 + n) % n), iese = segment(original, i);
    const ti = purtator(intra.a, intra.b, intra.s), te = purtator(iese.a, iese.b, iese.s);
    if (!ti || !te) continue;
    const a = tangenta(ti, iese.a), b = tangenta(te, iese.a);
    if (Math.abs(Math.atan2(cross(a, b), dot(a, b))) > PRAG_COLT) rez.push(iese.a);
  }
  return rez;
}

/**
 * Colțul prelungit al arcului k (de la A la B, în jurul vârfului V): vecinii, prelungiți pe purtătorii lor, se întâlnesc în M,
 * cel mai apropiat de V dintre punctele de după A și de dinainte de B (pe un cerc, cel mult un sfert de tură). Null dacă nu
 * se întâlnesc, dacă M e prea departe (`LIMITA_PRELUNGIRE`) sau dacă prelungirile vin mai aproape de |d| de original.
 */
function prelungit(c: Contur, k: number, V: P, d: number, original: Contur): Contur | null {
  const n = c.varfuri.length;
  if (n < 3) return null;
  // Cu trei vârfuri, segmentul de după arc se închide chiar în primul (v[3 % 3] = v[0]).
  const v = rotit(c, (k - 1 + n) % n);
  const [v0, vA, vB, v3] = [v[0], v[1], v[2], v[3 % n]];
  if (!v0 || !vA || !vB || !v3) return null;
  const P0 = purtator(v0.p, vA.p, v0.s), N0 = purtator(vB.p, v3.p, vB.s);
  if (!P0 || !N0) return null;
  let M: P | null = null;
  for (const x of intersectii(P0, N0)) {
    const inainte = mers(P0, vA.p, x), inapoi = mers(N0, x, vB.p);
    const bun = (t: Purtator, m: number): boolean => (t.tip === 'L' ? m >= -1e-9 : m < Math.PI / 2 || m > doiPi - 1e-9);
    if (!bun(P0, inainte) || !bun(N0, inapoi)) continue;
    if (!M || len(sub(x, V)) < len(sub(M, V))) M = x;
  }
  if (!M || len(sub(M, V)) > LIMITA_PRELUNGIRE * d) return null;
  if (!departeDeOriginal([bucata(P0, vA.p, M), bucata(N0, M, vB.p)], original, d)) return null;
  return { inchis: true, varfuri: [{ p: v0.p, s: segmentPe(P0, v0.p, M) }, { p: M, s: segmentPe(N0, M, v3.p) }, ...v.slice(3)] };
}

const cheie = (p: P | undefined): string => (p ? `${p.x},${p.y}` : '');

/** Vârfurile ascuțite pe o grilă de 1 µm, ca să fie găsite după centrul unui arc fără să fie parcurse toate. */
type GrilaVarfuri = { readonly gaseste: (q: P) => P | undefined };
const PAS_GRILA = 1e-3;

function grilaVarfuri(varfuri: readonly P[]): GrilaVarfuri {
  const m = new Map<string, P[]>();
  const loc = (q: P): [number, number] => [Math.round(q.x / PAS_GRILA), Math.round(q.y / PAS_GRILA)];
  for (const v of varfuri) {
    const [i, j] = loc(v);
    const k = `${i},${j}`;
    m.set(k, [...(m.get(k) ?? []), v]);
  }
  return {
    gaseste: (q) => {
      const [i, j] = loc(q);
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const v = m.get(`${i + a},${j + b}`)?.find((x) => len(sub(x, q)) <= 1e-6 * Math.max(1, len(x)));
          if (v) return v;
        }
      }
      return undefined;
    },
  };
}

/** Arcele de colț ale unui contur al ieșirii: indicii arcelor de rază |d| centrate într-un vârf ascuțit (cu vârful). */
function arceDeColt(c: Contur, d: number, ascutite: GrilaVarfuri): Array<{ readonly k: number; readonly V: P }> {
  const rez: Array<{ k: number; V: P }> = [];
  for (let k = 0; k < c.varfuri.length; k++) {
    const s = segment(c, k);
    if (s.s.tip !== 'A') continue;
    const cerc = cerculArcului(s.a, s.b, s.s.bulge);
    if (Math.abs(cerc.raza - d) > TOL_RAZA) continue;
    const V = ascutite.gaseste(cerc.centru);
    if (V) rez.push({ k, V });
  }
  return rez;
}

/** Toate colțurile prelungite pe rând, fiecare peste conturul de până la el (indicii se caută din nou după fiecare). */
function prelungesteToate(c: Contur, d: number, original: Contur, ascutite: GrilaVarfuri, incearca: (x: Contur) => boolean): Contur {
  let cur = c;
  const facute = new Set<string>();
  for (let pas = 0; pas < 4 * c.varfuri.length + 4; pas++) {
    const urm = arceDeColt(cur, d, ascutite).find((x) => !facute.has(cheie(x.V)));
    if (!urm) break;
    facute.add(cheie(urm.V));
    const nou = prelungit(cur, urm.k, urm.V, d, original);
    if (nou && incearca(nou)) cur = nou;
  }
  return cur;
}

/**
 * Ca originalul: fiecare arc de colț al ieșirii (`iesire`, offsetul exact al lui `original` cu `d`), înlocuit de colțul
 * prelungit. Întâi toate deodată; dacă rezultatul se atinge undeva, colț cu colț, fiecare păstrat doar dacă nu atinge nimic.
 */
export function colturiCaOriginalul(original: Contur, d: number, iesire: readonly Contur[]): Contur[] {
  const ad = Math.abs(d);
  const varfuri = varfuriAscutite(original);
  if (varfuri.length === 0) return [...iesire];
  const ascutite = grilaVarfuri(varfuri);
  const toate = iesire.map((c) => prelungesteToate(c, ad, original, ascutite, () => true));
  if (curate(toate)) return toate;
  const rez = [...iesire];
  for (let i = 0; i < rez.length; i++) {
    const c = rez[i];
    if (!c) continue;
    rez[i] = prelungesteToate(c, ad, original, ascutite, (x) => curate(rez.map((y, j) => (j === i ? x : y))));
  }
  return rez;
}

/**
 * Racordarea colțului k (între segmentul care intră în vârful k și cel care iese) cu raza r: cercul tangent la amândouă, de
 * partea spre care cotește conturul; punctele de tangență pe segmentele lor. Null dacă nu încape sau dacă arcul ar veni mai
 * aproape de |d| de original (nu se întâmplă: racordarea mută conturul spre partea dinspre care nu e originalul).
 */
function racordat(c: Contur, k: number, r: number, original: Contur, d: number): Contur | null {
  const n = c.varfuri.length;
  if (n < 2) return null;
  const v = rotit(c, (k - 1 + n) % n);
  const [v0, vQ, v2] = [v[0], v[1], v[2 % n]];
  if (!v0 || !vQ || !v2) return null;
  const T0 = purtator(v0.p, vQ.p, v0.s), T1 = purtator(vQ.p, v2.p, vQ.s);
  if (!T0 || !T1) return null;
  const ti = tangenta(T0, vQ.p), te = tangenta(T1, vQ.p);
  const unghi = Math.atan2(cross(ti, te), dot(ti, te));
  if (Math.abs(unghi) <= PRAG_COLT) return null;
  const stanga = unghi > 0;
  const D0 = decalat(T0, stanga ? r : -r), D1 = decalat(T1, stanga ? r : -r);
  if (!D0 || !D1) return null;
  const L0 = lungimePe(T0, v0.p, vQ.p), L1 = lungimePe(T1, vQ.p, v2.p);
  let best: { C: P; a: P; b: P } | null = null;
  for (const C of intersectii(D0, D1)) {
    const a = proiectie(T0, C), b = proiectie(T1, C);
    // a pe segmentul care intră (între capătul lui și Q), b pe cel care iese (între Q și capătul lui); un segment poate fi
    // consumat întreg (două racordări pe o latură cât suma lor: capătul rotund al unui braț).
    const la = lungimePe(T0, v0.p, a), lb = lungimePe(T1, vQ.p, b);
    const pe = (x: number, l: number): boolean => x > -1e-9 && x < l + 1e-9;
    if (!pe(la, L0) || !pe(lb, L1) || len(sub(a, vQ.p)) < 1e-9) continue;
    if (!best || len(sub(C, vQ.p)) < len(sub(best.C, vQ.p))) best = { C, a, b };
  }
  if (!best) return null;
  const R: Purtator = { tip: 'A', c: best.C, r, trig: stanga };
  if (!departeDeOriginal([bucata(R, best.a, best.b)], original, d)) return null;
  // Segmentele consumate întreg (sub 1 nm) dispar: arcul pornește din capătul lor.
  const varfuri: Varf[] = [];
  if (len(sub(best.a, v0.p)) > 1e-9) varfuri.push({ p: v0.p, s: segmentPe(T0, v0.p, best.a) });
  const pana = len(sub(best.b, v2.p)) > 1e-9;
  varfuri.push({ p: best.a, s: segmentPe(R, best.a, pana ? best.b : v2.p) });
  if (pana) varfuri.push({ p: best.b, s: segmentPe(T1, best.b, v2.p) });
  return { inchis: true, varfuri: [...varfuri, ...v.slice(2)] };
}

/** Indicii colțurilor ascuțite ale unui contur (tangentele care intră și ies din vârf diferă). */
function colturiAscutite(c: Contur): number[] {
  const n = c.varfuri.length, rez: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = segment(c, (k - 1 + n) % n), b = segment(c, k);
    const ta = purtator(a.a, a.b, a.s), tb = purtator(b.a, b.b, b.s);
    if (!ta || !tb) continue;
    const x = tangenta(ta, b.a), y = tangenta(tb, b.a);
    if (Math.abs(Math.atan2(cross(x, y), dot(x, y))) > PRAG_COLT) rez.push(k);
  }
  return rez;
}

/**
 * Rotunjite: ieșirea motorului (colțurile ocolite, deja arce de rază |d|), cu fiecare colț rămas ascuțit racordat cu raza |d|
 * (sau jumătate, sau un sfert, dacă nu încape; altfel rămâne ascuțit). Racordarea mută conturul doar mai departe de original.
 */
export function colturiRotunjite(original: Contur, d: number, iesire: readonly Contur[]): Contur[] {
  const ad = Math.abs(d);
  const rez = iesire.map((c0) => {
    let cur = c0;
    // Fiecare colț o singură dată (după vârful lui): unul care nu se poate racorda rămâne și nu se mai încearcă.
    const incercate = new Set<string>();
    for (;;) {
      const k = colturiAscutite(cur).find((i) => !incercate.has(cheie(cur.varfuri[i]?.p)));
      if (k === undefined) break;
      incercate.add(cheie(cur.varfuri[k]?.p));
      let nou: Contur | null = null;
      for (let j = 0, r = ad; j <= INJUMATATIRI_RAZA && !nou; j++, r /= 2) nou = racordat(cur, k, r, original, ad);
      if (nou) cur = nou;
    }
    return cur;
  });
  return curate(rez) ? rez : [...iesire];
}

/** Colțurile cerute peste ieșirea motorului. */
export function aplicaColturi(original: Contur, d: number, iesire: readonly Contur[], colturi: Colturi): Contur[] {
  return colturi === 'rotunjite' ? colturiRotunjite(original, d, iesire) : colturiCaOriginalul(original, d, iesire);
}
