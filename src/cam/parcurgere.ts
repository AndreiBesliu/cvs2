import { arc, cerculArcului, LINIE, numarSegmente, segment, type Contur, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';

/**
 * Parcurgerea unei bucle închise cu un profil Z(s): drumul pe care îl folosesc urechile (ADR 0028) și rampa (ADR 0029).
 * Pozițiile s se numără de la vârful 0, în sensul de mers, DESFĂȘURAT: s și s + P sunt același punct, iar un drum poate
 * porni oriunde și trece peste vârful 0, de câte ori e nevoie.
 */

/** Un nod al profilului: poziția desfășurată pe buclă și cota. Între două noduri, Z e liniar. */
export type Nod = { readonly s: number; readonly z: number };

/** O ruptură mai aproape de atât de un vârf e chiar vârful; o bucată mai scurtă e o linie (ADR 0028 §4). */
export const EPS_RUPTURA = 1e-6;

/** Lungimea exactă a unui segment: linia, sau arcul ca r·|θ|. */
function lungimeSegment(a: Punct, b: Punct, s: Segment): number {
  if (s.tip === 'A') {
    const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
    return raza * Math.abs(baleiaj);
  }
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Lungimea exactă a unei bucle închise: suma segmentelor, în ordine (aceeași sumă ca în `parcurge`). */
export function lungimeBucla(c: Contur): number {
  let p = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    p += lungimeSegment(a, b, s);
  }
  return p;
}

/** Z la poziția s, liniar între noduri. Pe o porțiune plată, exact cota ei. */
export function zLa(noduri: readonly Nod[], s: number): number {
  for (let i = 1; i < noduri.length; i++) {
    const a = noduri[i - 1] as Nod, b = noduri[i] as Nod;
    if (s <= b.s) {
      if (a.z === b.z || b.s - a.s <= 0) return b.z;
      const t = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s)));
      return a.z + (b.z - a.z) * t;
    }
  }
  return (noduri[noduri.length - 1] as Nod).z;
}

/** Punctul la fracțiunea f din lungimea segmentului: pe linie liniar, pe arc în unghi. */
function punctPeSegment(a: Punct, b: Punct, cerc: ReturnType<typeof cerculArcului> | undefined, f: number): Punct {
  if (!cerc) return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  const u = cerc.start + cerc.baleiaj * f;
  return { x: cerc.centru.x + cerc.raza * Math.cos(u), y: cerc.centru.y + cerc.raza * Math.sin(u) };
}

export type RezultatParcurgere = { readonly ok: true; readonly miscari: readonly Miscare[] } | { readonly ok: false; readonly motiv: string };

/**
 * Mișcările de-a lungul buclei, de la primul nod la ultimul (pozițiile desfășurate, crescătoare). Freza e deja în
 * punctul primului nod, la cota lui.
 * - Fiecare segment se taie exact în nodurile din interiorul lui. Un nod la cel mult 1e-6 mm de un vârf e chiar vârful,
 *   cu cota nodului.
 * - O bucată de arc rămâne arc pe același cerc (elice unde Z se schimbă), afară de cele sub 1e-6 mm, care sunt linii: un
 *   arc cu startul în capăt ar fi cercul întreg (`baleiajArc`).
 * - O mișcare poartă Z doar dacă Z-ul se schimbă pe ea.
 * - O bucată care coboară merge pe verticală cel mult cu avansul de plonjare: F = min(avans, avansPlonjare·L₃ / |ΔZ|).
 */
export function parcurge(c: Contur, noduri: readonly Nod[], avans: number, avansPlonjare: number): RezultatParcurgere {
  const n = numarSegmente(c);
  const primul = noduri[0], ultimul = noduri[noduri.length - 1];
  if (n === 0 || !primul || !ultimul || noduri.length < 2) return { ok: true, miscari: [] };
  const sDe = primul.s, sLa = ultimul.s;
  // Segmentele, cu începuturile lor pe o tură, adunate în ordine: aceeași sumă ca `lungimeBucla`.
  const seg: { a: Punct; b: Punct; s: Segment; L: number; inceput: number }[] = [];
  let P = 0;
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'C') return { ok: false, motiv: 'cubicele ajung la post doar ca biarce (T6, etapa 2)' };
    const L = lungimeSegment(a, b, s);
    seg.push({ a, b, s, L, inceput: P });
    P += L;
  }
  if (!(P > 0)) return { ok: true, miscari: [] };
  const m: Miscare[] = [];
  let zCur = primul.z;
  let urm = 1; // primul nod încă neemis
  // Primul segment desfășurat care se termină după pornire (mai mult de EPS).
  let k = Math.max(0, Math.floor(sDe / P) * n - n);
  const capatul = (kk: number): number => {
    const x = seg[kk % n] as (typeof seg)[number];
    const baza = Math.floor(kk / n) * P;
    return (baza === 0 ? x.inceput : baza + x.inceput) + x.L;
  };
  while (capatul(k) <= sDe + EPS_RUPTURA) k++;
  for (; ; k++) {
    const x = seg[k % n] as (typeof seg)[number];
    const baza = Math.floor(k / n) * P;
    const s0 = baza === 0 ? x.inceput : baza + x.inceput;
    const s1 = s0 + x.L;
    if (s0 >= sLa - EPS_RUPTURA) break;
    const sA = Math.max(s0, sDe);
    const cerc = x.s.tip === 'A' ? cerculArcului(x.a, x.b, x.s.bulge) : undefined;
    // Capătul bucății finale: vârful segmentului, sau un punct din interiorul lui, la sLa.
    const peVarf = s1 <= sLa + EPS_RUPTURA;
    const sCapat = peVarf ? s1 : sLa;
    const tinte: { s: number; z: number; capat: boolean }[] = [];
    while (urm < noduri.length - 1 && (noduri[urm] as Nod).s < sCapat - EPS_RUPTURA) {
      const nod = noduri[urm] as Nod;
      if (nod.s > sA + EPS_RUPTURA) tinte.push({ s: nod.s, z: nod.z, capat: false });
      // Un nod lipit de pornire, cu altă cotă, n-are unde să se emită: sărit, ar întinde coborârea pe tot segmentul
      // (recenzia feliei 2.5a). Cine construiește nodurile nu trebuie să ajungă aici.
      else if (nod.z !== zCur) return { ok: false, motiv: `nod de profil la sub ${EPS_RUPTURA} mm de pornire, cu altă cotă (${nod.z} față de ${zCur})` };
      urm++;
    }
    let zCapat: number;
    if (peVarf && Math.abs(sLa - s1) > EPS_RUPTURA) {
      zCapat = zLa(noduri, s1);
      while (urm < noduri.length - 1 && (noduri[urm] as Nod).s <= s1 + EPS_RUPTURA) {
        zCapat = (noduri[urm] as Nod).z;
        urm++;
      }
    } else {
      // Capătul drumului: cota ultimului nod, exact.
      zCapat = ultimul.z;
      urm = noduri.length - 1;
    }
    tinte.push({ s: sCapat, z: zCapat, capat: peVarf });
    let sPrec = sA;
    for (const t of tinte) {
      const p = t.capat ? x.b : punctPeSegment(x.a, x.b, cerc, (t.s - s0) / x.L);
      const la = t.z === zCur ? { X: p.x, Y: p.y } : { X: p.x, Y: p.y, Z: t.z };
      const lung = t.s - sPrec;
      const dz = t.z - zCur;
      const f = dz < 0 ? Math.min(avans, (avansPlonjare * Math.hypot(lung, dz)) / -dz) : avans;
      if (cerc && lung >= EPS_RUPTURA) {
        m.push({ tip: 'arc', la, centru: cerc.centru, sens: cerc.baleiaj > 0 ? 'trigonometric' : 'orar', avans: f });
      } else {
        m.push({ tip: 'taiere', la, avans: f });
      }
      zCur = t.z;
      sPrec = t.s;
    }
    if (!peVarf || s1 >= sLa - EPS_RUPTURA) break;
  }
  return { ok: true, miscari: m };
}

/** Punctul și direcția de mers (unitară) la poziția s, cu 0 ≤ s ≤ P, plus segmentul și fracțiunea din el. */
export function punctLa(c: Contur, s: number): { readonly p: Punct; readonly t: Punct; readonly i: number; readonly f: number } | null {
  const n = numarSegmente(c);
  let s0 = 0;
  for (let i = 0; i < n; i++) {
    const { a, b, s: seg } = segment(c, i);
    if (seg.tip === 'C') return null;
    const L = lungimeSegment(a, b, seg);
    if (s <= s0 + L || i === n - 1) {
      const f = L > 0 ? Math.min(1, Math.max(0, (s - s0) / L)) : 0;
      if (seg.tip === 'A') {
        const cerc = cerculArcului(a, b, seg.bulge);
        const u = cerc.start + cerc.baleiaj * f;
        const semn = cerc.baleiaj > 0 ? 1 : -1;
        return { p: punctPeSegment(a, b, cerc, f), t: { x: -Math.sin(u) * semn, y: Math.cos(u) * semn }, i, f };
      }
      const L2 = Math.hypot(b.x - a.x, b.y - a.y);
      if (!(L2 > 0)) return null;
      return { p: punctPeSegment(a, b, undefined, f), t: { x: (b.x - a.x) / L2, y: (b.y - a.y) / L2 }, i, f };
    }
    s0 += L;
  }
  return null;
}

/**
 * Bucla închisă pornită din poziția s (ADR 0030 §4): un vârf la cel mult 1e-6 mm de s devine vârful 0; altfel segmentul
 * din s se taie acolo, o linie în două linii, un arc în două arce pe același cerc (baleiajele f·θ și (1 − f)·θ).
 */
export function incepeLa(c: Contur, s: number): Contur {
  const n = c.varfuri.length;
  const x = punctLa(c, s);
  if (!x || !c.inchis) return c;
  const { i, f } = x;
  const va = c.varfuri[i] as Varf;
  const vb = c.varfuri[(i + 1) % n] as Varf;
  const L = lungimeSegment(va.p, vb.p, va.s);
  const roteste = (k: number): Contur => ({ inchis: true, varfuri: [...c.varfuri.slice(k), ...c.varfuri.slice(0, k)] });
  if (f * L <= EPS_RUPTURA) return roteste(i);
  if ((1 - f) * L <= EPS_RUPTURA) return roteste((i + 1) % n);
  let inainte: Segment = LINIE, dupa: Segment = LINIE;
  if (va.s.tip === 'A') {
    const theta = 4 * Math.atan(va.s.bulge);
    inainte = arc(Math.tan((f * theta) / 4));
    dupa = arc(Math.tan(((1 - f) * theta) / 4));
  }
  const varfuri: Varf[] = [{ p: x.p, s: dupa }];
  for (let k = 1; k < n; k++) varfuri.push(c.varfuri[(i + k) % n] as Varf);
  varfuri.push({ p: va.p, s: inainte });
  return { inchis: true, varfuri };
}
