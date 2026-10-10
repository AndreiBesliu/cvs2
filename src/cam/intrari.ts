import { arc, LINIE, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';
import { RAZA_INTRARE_MINIMA } from './intrariMinima.ts';
import { EPS_RUPTURA, incepeLa, lungimeBucla, punctLa } from './parcurgere.ts';
import type { Sens } from './profil.ts';

/**
 * Intrările și ieșirile (ADR 0030): un sfert de cerc care aduce freza pe buclă în p₀ și sfertul următor, care o scoate,
 * pe partea deșeului. Punctul și raza se aleg dintr-o ordine fixă de candidați, verificați exact pe regiunea păstrată de
 * apelant; dacă nu încape niciunul, bucla se taie fără intrări, iar exportul o spune.
 */
export type ParametriIntrari = { readonly raza: number };

export { RAZA_INTRARE_MINIMA };

/** Intrarea aleasă pe o buclă: bucla pornită din p₀ și cercul intrării. */
export type IntrareAleasa = {
  /** Bucla, cu vârful 0 în p₀ (ADR 0030 §4). */
  readonly bucla: Contur;
  readonly p0: Punct;
  /** Centrul cercului intrării și raza lui. */
  readonly centru: Punct;
  readonly raza: number;
  /** A: începutul intrării; B: capătul ieșirii. */
  readonly a: Punct;
  readonly b: Punct;
  readonly trigonometric: boolean;
};

/**
 * Partea deșeului (ADR 0030 §2): opusă materialului păstrat, care e în dreapta sensului de mers la urcare și în stânga la
 * opoziție (ADR 0027 §1). Normala unitară spre deșeu, din direcția de mers t.
 */
function normalaDeseu(t: Punct, sens: Sens): Punct {
  const stanga = { x: -t.y, y: t.x };
  return sens === 'urcare' ? stanga : { x: -stanga.x, y: -stanga.y };
}

/** Cercul intrării în p₀: C = p₀ + ρ·n, A = p₀ + ρ(n − t), B = p₀ + ρ(n + t); sensul, trigonometric când n e în stânga. */
function cercul(p0: Punct, t: Punct, sens: Sens, rho: number): { centru: Punct; a: Punct; b: Punct; trigonometric: boolean } {
  const n = normalaDeseu(t, sens);
  return {
    centru: { x: p0.x + rho * n.x, y: p0.y + rho * n.y },
    a: { x: p0.x + rho * (n.x - t.x), y: p0.y + rho * (n.y - t.y) },
    b: { x: p0.x + rho * (n.x + t.x), y: p0.y + rho * (n.y + t.y) },
    trigonometric: sens === 'urcare',
  };
}

/** Semicercul intrării (intrarea și ieșirea), ca un contur deschis de un arc: de la A la B, prin p₀. */
function semicerc(c: { a: Punct; b: Punct; trigonometric: boolean }): Contur {
  return { inchis: false, varfuri: [{ p: c.a, s: arc(c.trigonometric ? 1 : -1) }, { p: c.b, s: LINIE }] };
}

/**
 * Pozițiile candidate pentru p₀ (ADR 0030 §3): vârful 0, apoi mijloacele celor mai lungi 12 segmente, după lungime
 * descrescătoare (la egalitate, indicele mai mic întâi); un mijloc identic cu un candidat de dinainte se sare.
 */
export function candidati(c: Contur): number[] {
  const n = numarSegmente(c);
  const segmente: { i: number; inceput: number; L: number }[] = [];
  let s0 = 0;
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    const L = s.tip === 'A' ? lungimeBucla({ inchis: false, varfuri: [{ p: a, s }, { p: b, s: LINIE }] }) : Math.hypot(b.x - a.x, b.y - a.y);
    segmente.push({ i, inceput: s0, L });
    s0 += L;
  }
  const rez = [0];
  for (const x of [...segmente].sort((u, v) => v.L - u.L || u.i - v.i).slice(0, 12)) {
    const s = x.inceput + x.L / 2;
    if (rez.every((r) => Math.abs(r - s) > EPS_RUPTURA)) rez.push(s);
  }
  return rez;
}

/**
 * Alegerea (ADR 0030 §3): pentru raza cerută, apoi pentru jumătatea ei (dacă e cel puțin 0,5 mm), primul candidat al
 * cărui semicerc trece de `incape` (verificarea exactă a invariantei 2, făcută de apelant pe regiunea păstrată).
 */
export function alegeIntrarea(c: Contur, sens: Sens, raza: number, incape: (semicerc: Contur) => boolean): IntrareAleasa | null {
  const raze = [raza, ...(raza / 2 >= RAZA_INTRARE_MINIMA ? [raza / 2] : [])];
  const poz = candidati(c);
  for (const rho of raze) {
    for (const s of poz) {
      const x = punctLa(c, s);
      if (!x) continue;
      const g = cercul(x.p, x.t, sens, rho);
      if (!incape(semicerc(g))) continue;
      const bucla = incepeLa(c, s);
      const p0 = bucla.varfuri[0]?.p ?? x.p;
      return { bucla, p0, centru: g.centru, raza: rho, a: g.a, b: g.b, trigonometric: g.trigonometric };
    }
  }
  return null;
}

/** Intrarea, de la A la p₀, și ieșirea, de la p₀ la B: arce în IR, pe cercul intrării, cu avansul de tăiere. */
export function arcIntrare(i: IntrareAleasa, avans: number): Miscare {
  return { tip: 'arc', la: { X: i.p0.x, Y: i.p0.y }, centru: i.centru, sens: i.trigonometric ? 'trigonometric' : 'orar', avans };
}

export function arcIesire(i: IntrareAleasa, avans: number): Miscare {
  return { tip: 'arc', la: { X: i.b.x, Y: i.b.y }, centru: i.centru, sens: i.trigonometric ? 'trigonometric' : 'orar', avans };
}
