/**
 * Oracolul incrustației cu pereți drepți (ADR 0171), independent: zero importuri din `src/`. Citește textul celor două
 * programe (locașul, din programul foii, și dopul, din fișierul lui), cu frezele plate ale fiecărei bucăți (textul tăiat la
 * `T… M6`), și măsoară pe G-code, nu pe structura lui:
 *
 * - **jocul lateral**, exact: o freză plată taie, la un nivel z, discurile ei de-a lungul mutărilor aflate în întregime sub z,
 *   deci funcția „distanța în plan la cea mai apropiată mutare − raza frezei ei” e negativă în ce s-a tăiat și 0 pe perete.
 *   Pe peretele locașului (punctele lui le găsește o grilă grosieră a simulării, apoi bisecția pe funcția exactă), jocul e cât
 *   intră punctul, întors pe semifabricatul dopului după contract, în zona tăiată din jurul dopului: −funcția dopului acolo;
 *   pe tot conturul, și în colțuri;
 * - **interferența**: punctele de pe peretele dopului (găsite la fel, aduse înapoi pe foaie) care cad în afara locașului;
 * - **oprirea și spațiul rămas**, pe simularea grosieră: adâncimea locașului D (mediana fundului) și înălțimea dopului h
 *   (mediana feței coborâte, sau a șanțului la dopul decupat); pe fund, H = h − D; pe față, g = D − h; decupat, H = h − D;
 * - **razele, pe hârtie**, prin `margineaPeRaza`: unde întâlnește peretele locașului o rază dată (vârful retras, unghiul
 *   rotunjit).
 *
 * Contractul semifabricatului (ADR 0171, ca la V): cutia desenului cu `margine` pe fiecare parte, originea în colțul lui
 * stânga-jos, Z0 pe fața lui. Dopul ridicat e oglindit pe X: (x, y) → (x1 + m − x, y − y0 + m); cel decupat nu: (x, y) →
 * (x − x0 + m, y − y0 + m).
 */
import { citesteGcode, type GrilaOracol, type MutareOracol, type SculaOracol } from './simulare.ts';
import { cutieDesen, suprafataPeScule, type Banda, type DesenO, type PunctO } from './incrustatie.ts';

export type ParametriDreapta = {
  /** Adâncimea locașului (mm), cea cerută: nivelul la care se citesc pereții e jumătatea ei. */
  readonly D: number;
  /** Înălțimea dopului pe semifabricat (mm), cea cerută: pereții dopului se citesc la jumătatea ei. */
  readonly h: number;
  readonly dop: 'ridicat' | 'decupat';
  /** Marginea semifabricatului în jurul cutiei desenului (mm). */
  readonly margine: number;
  /** Latura celulei grilei grosiere (mm): ea găsește punctele pereților, iar bisecția le face exacte. */
  readonly celula: number;
};

type MutareCuRaza = { readonly m: MutareOracol; readonly raza: number; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/** Mutările unui program, fiecare cu raza frezei bucății ei (textul tăiat la `T… M6`, ca la `suprafataPeScule`). */
export function mutariPeScule(text: string, scule: readonly SculaOracol[]): MutareCuRaza[] {
  const bucati = text.split(/^T\d+ M6$/m);
  if (bucati.length !== scule.length) throw new Error(`programul are ${bucati.length} bucăți între schimbări de sculă, iar sculele date sunt ${scule.length}`);
  const rez: MutareCuRaza[] = [];
  for (const [k, bucata] of bucati.entries()) {
    const s = scule[k]!;
    if (s.tip !== 'plata') throw new Error(`oracolul pereților drepți cere freze plate (bucata ${k}: ${s.tip})`);
    for (const m of citesteGcode(k === 0 ? bucata : `G90 G21\n${bucata}`)) {
      const r = s.diametru / 2;
      let x0 = Math.min(m.a[0], m.b[0]), y0 = Math.min(m.a[1], m.b[1]), x1 = Math.max(m.a[0], m.b[0]), y1 = Math.max(m.a[1], m.b[1]);
      if (m.tip === 'arc') {
        // Cutia arcului: tot cercul (larg, dar sigur).
        const ra = Math.hypot(m.a[0] - m.centru[0], m.a[1] - m.centru[1]);
        x0 = Math.min(x0, m.centru[0] - ra); y0 = Math.min(y0, m.centru[1] - ra); x1 = Math.max(x1, m.centru[0] + ra); y1 = Math.max(y1, m.centru[1] + ra);
      }
      rez.push({ m, raza: r, x0, y0, x1, y1 });
    }
  }
  return rez;
}

/** Distanța în plan de la (x, y) la o mutare (segment sau arc de cerc). */
function distantaLaMutare(m: MutareOracol, x: number, y: number): number {
  const [ax, ay] = m.a, [bx, by] = m.b;
  if (m.tip === 'linie') {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    return Math.hypot(x - (ax + u * dx), y - (ay + u * dy));
  }
  const [cx, cy] = m.centru;
  const r = Math.hypot(ax - cx, ay - cy);
  const ua = Math.atan2(ay - cy, ax - cx), ub = Math.atan2(by - cy, bx - cx), up = Math.atan2(y - cy, x - cx);
  // Unghiul parcurs de la a la b în sensul arcului, și cel până la p; un arc cu capetele egale e un cerc întreg.
  const pozitiv = (u: number): number => ((u % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const trig = m.sens === 'trigonometric';
  let sweep = pozitiv(trig ? ub - ua : ua - ub);
  if (sweep < 1e-12) sweep = 2 * Math.PI;
  const pana = pozitiv(trig ? up - ua : ua - up);
  if (pana <= sweep) return Math.abs(Math.hypot(x - cx, y - cy) - r);
  return Math.min(Math.hypot(x - ax, y - ay), Math.hypot(x - bx, y - by));
}

/**
 * Funcția de tăiere a unui program la nivelul z: min pe mutările aflate în întregime sub z ale (distanța în plan − raza
 * frezei). Negativă unde freza a trecut la nivelul acela, 0 pe perete. Mutările stau într-un index pe găleți de 1 mm.
 */
export function functieTaiere(mutari: readonly MutareCuRaza[], z: number): (x: number, y: number) => number {
  const sub = mutari.filter((u) => Math.max(u.m.a[2], u.m.b[2]) <= z);
  const G = 1;
  const galeti = new Map<string, MutareCuRaza[]>();
  const cheie = (i: number, j: number): string => `${i},${j}`;
  for (const u of sub) {
    for (let i = Math.floor((u.x0 - u.raza) / G); i <= Math.floor((u.x1 + u.raza) / G); i++) {
      for (let j = Math.floor((u.y0 - u.raza) / G); j <= Math.floor((u.y1 + u.raza) / G); j++) {
        const k = cheie(i, j);
        const l = galeti.get(k);
        if (l) l.push(u); else galeti.set(k, [u]);
      }
    }
  }
  const departe = 1e6;
  return (x: number, y: number): number => {
    const l = galeti.get(cheie(Math.floor(x / G), Math.floor(y / G)));
    if (!l) return departe;
    let f = departe;
    for (const u of l) f = Math.min(f, distantaLaMutare(u.m, x, y) - u.raza);
    // Un punct mai departe decât o găleată de orice mutare: departe (pozitiv), adică netăiat.
    return f;
  };
}

/** Punctul exact de pe perete între a (tăiat, f < 0) și b (netăiat, f > 0), prin bisecție. */
function bisectie(f: (x: number, y: number) => number, a: PunctO, b: PunctO): PunctO {
  let [ax, ay] = a, [bx, by] = b;
  for (let k = 0; k < 40; k++) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    if (f(mx, my) < 0) { ax = mx; ay = my; } else { bx = mx; by = my; }
  }
  return [(ax + bx) / 2, (ay + by) / 2];
}

/**
 * Punctele exacte ale pereților unei zone tăiate: perechile de celule vecine tăiat / netăiat ale grilei, rafinate. `alNostru`
 * alege pereții după celula netăiată (la dopul decupat, rama semifabricatului nu e dopul).
 */
function puncteDePerete(
  z: Float64Array, nx: number, ny: number, g: GrilaOracol, prag: number, f: (x: number, y: number) => number,
  alNostru: (i: number, j: number) => boolean = () => true,
): PunctO[] {
  const taiat = (i: number, j: number): boolean => (z[j * nx + i] ?? 0) < prag;
  const centru = (i: number, j: number): PunctO => [g.x0 + (i + 0.5) * g.celula, g.y0 + (j + 0.5) * g.celula];
  const rez: PunctO[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!taiat(i, j)) continue;
    for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || taiat(ii, jj) || !alNostru(ii, jj)) continue;
      const a = centru(i, j), b = centru(ii, jj);
      // Grila grosieră și funcția exactă pot să nu fie de acord chiar la o celulă de perete: perechea se sare.
      if (f(a[0], a[1]) < 0 && f(b[0], b[1]) > 0) rez.push(bisectie(f, a, b));
    }
  }
  return rez;
}

const banda = (v: number[]): Banda => {
  if (v.length === 0) return { n: 0, min: NaN, med: NaN, max: NaN };
  v.sort((a, b) => a - b);
  return { n: v.length, min: v[0]!, med: v[Math.floor((v.length - 1) / 2)]!, max: v[v.length - 1]! };
};

const mediana = (v: number[]): number => {
  if (v.length === 0) return NaN;
  v.sort((a, b) => a - b);
  return v[Math.floor((v.length - 1) / 2)]!;
};

export type MasuraDreapta = {
  /** Jocul lateral în fiecare punct al peretelui locașului: cât intră el în zona tăiată din jurul dopului (mm). */
  readonly joc: Banda;
  /** Punctele peretelui dopului care cad în afara locașului (sau pe perete), din câte. */
  readonly interferenta: number; readonly nDop: number;
  /**
   * Adâncimea locașului (mediana) și înălțimea dopului, mm: la cel ridicat, mediana feței coborâte; la cel decupat, cea mai mare
   * adâncime a șanțului (tăietura trece prin placă, iar punțile doar ridică fundul șanțului în dreptul lor; mediana ar urma
   * lungimea lor).
   */
  readonly adancime: number; readonly inaltime: number;
  /** Unde întâlnește peretele locașului raza din p pe direcția d (prima trecere din tăiat în netăiat, sau invers), mm de la p. */
  readonly margineaPeRaza: (p: PunctO, d: PunctO, lungime: number) => number;
};

/**
 * Potrivirea: locașul (pe foaie) și dopul (pe semifabricatul lui), fiecare cu sculele lui. Grilele grosiere acoperă cutia
 * desenului lărgită cu 1 mm (locașul) și semifabricatul întreg (dopul).
 */
export function masoaraPotrivireaDreapta(
  locas: { readonly text: string; readonly scule: readonly SculaOracol[] },
  dop: { readonly text: string; readonly scule: readonly SculaOracol[] },
  desen: DesenO,
  p: ParametriDreapta,
): MasuraDreapta {
  const { x0, y0, x1, y1 } = cutieDesen(desen);
  const m = p.margine;
  // Foaie → semifabricatul dopului, după contract; și înapoi.
  const spreDop = (x: number, y: number): PunctO => (p.dop === 'ridicat' ? [x1 + m - x, y - y0 + m] : [x - x0 + m, y - y0 + m]);
  const dinDop = (u: number, v: number): PunctO => (p.dop === 'ridicat' ? [x1 + m - u, v + y0 - m] : [u + x0 - m, v + y0 - m]);
  const fL = functieTaiere(mutariPeScule(locas.text, locas.scule), -p.D / 2);
  const fD = functieTaiere(mutariPeScule(dop.text, dop.scule), -p.h / 2);
  const c = p.celula;
  const gL: GrilaOracol = { x0: x0 - 1, y0: y0 - 1, latime: x1 - x0 + 2, inaltime: y1 - y0 + 2, celula: c };
  const L = suprafataPeScule(locas.text, gL, locas.scule);
  const W = x1 - x0 + 2 * m, H = y1 - y0 + 2 * m;
  const gD: GrilaOracol = { x0: 0, y0: 0, latime: W, inaltime: H, celula: c };
  const M = suprafataPeScule(dop.text, gD, dop.scule);
  // Pereții locașului: jocul în fiecare punct.
  const joc: number[] = [];
  for (const [x, y] of puncteDePerete(L.z, L.nx, L.ny, gL, -p.D / 2, fL)) {
    const [u, v] = spreDop(x, y);
    joc.push(-fD(u, v));
  }
  // Pereții dopului: ai lemnului netăiat care nu atinge marginea grilei (dopul; la cel decupat, rama din jurul șanțului atinge
  // marginea). Un dop decupat cu goluri ar lăsa miezurile lor drept dop: cazurile oracolului nu-l au. Punctul, adus pe foaie,
  // trebuie să fie în locaș (fL < 0).
  const rama = new Uint8Array(M.nx * M.ny);
  const coada: number[] = [];
  const netaiat = (k: number): boolean => (M.z[k] ?? 0) >= -p.h / 2;
  for (let i = 0; i < M.nx; i++) for (const j of [0, M.ny - 1]) { const k = j * M.nx + i; if (netaiat(k) && !rama[k]) { rama[k] = 1; coada.push(k); } }
  for (let j = 0; j < M.ny; j++) for (const i of [0, M.nx - 1]) { const k = j * M.nx + i; if (netaiat(k) && !rama[k]) { rama[k] = 1; coada.push(k); } }
  while (coada.length > 0) {
    const k = coada.pop()!, i = k % M.nx, j = (k - i) / M.nx;
    for (const [ii, jj] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as const) {
      if (ii < 0 || jj < 0 || ii >= M.nx || jj >= M.ny) continue;
      const kk = jj * M.nx + ii;
      if (!rama[kk] && netaiat(kk)) { rama[kk] = 1; coada.push(kk); }
    }
  }
  let interferenta = 0, nDop = 0;
  for (const [u, v] of puncteDePerete(M.z, M.nx, M.ny, gD, -p.h / 2, fD, (i, j) => !rama[j * M.nx + i])) {
    const [x, y] = dinDop(u, v);
    nDop++;
    if (!(fL(x, y) < 0)) interferenta++;
  }
  const adanci: number[] = [], inalte: number[] = [];
  for (let k = 0; k < L.z.length; k++) if (L.z[k]! < -p.D / 2) adanci.push(-L.z[k]!);
  for (let k = 0; k < M.z.length; k++) if (M.z[k]! < -p.h / 2) inalte.push(-M.z[k]!);
  const margineaPeRaza = (q: PunctO, d: PunctO, lungime: number): number => {
    const n = Math.hypot(d[0], d[1]), ux = d[0] / n, uy = d[1] / n;
    const pas = 0.002;
    const s0 = fL(q[0], q[1]) < 0;
    for (let t = pas; t <= lungime; t += pas) {
      if ((fL(q[0] + t * ux, q[1] + t * uy) < 0) !== s0) {
        const a: PunctO = [q[0] + (t - pas) * ux, q[1] + (t - pas) * uy], b: PunctO = [q[0] + t * ux, q[1] + t * uy];
        const x = s0 ? bisectie(fL, a, b) : bisectie(fL, b, a);
        return Math.hypot(x[0] - q[0], x[1] - q[1]);
      }
    }
    return NaN;
  };
  const inaltime = p.dop !== 'decupat' ? mediana(inalte) : inalte.length === 0 ? Number.NaN : inalte.reduce((a, b) => Math.max(a, b), -Infinity);
  return { joc: banda(joc), interferenta, nDop, adancime: mediana(adanci), inaltime, margineaPeRaza };
}
