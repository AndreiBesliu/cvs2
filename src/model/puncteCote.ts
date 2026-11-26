/**
 * Punctele de lipire ale cotelor (ADR 0330 §5), din lumea foii: pentru fiecare element, cutia lui (indexul lipirii) și,
 * cerute doar cu cursorul aproape, vârfurile, mijloacele segmentelor, centrele arcelor, cadranele de pe arce și cele nouă
 * puncte ale cutiei, fiecare cu legătura lui (`LegaturaCota`). Punctul fiecăruia e cel dat de `punctLoc` (`cote.ts`), deci un
 * capăt lipit e exact punctul în care cota îl citește după aceea. Plus punctele foii: colțurile, mijloacele laturilor, centrul.
 */
import { numarSegmente, segment, type Contur } from '../geom/conturBaza.ts';
import type { PunctTinta, SursaPuncte } from '../geom/lipirePuncte.ts';
import { transformaContur, translatie } from '../geom/matrice.ts';
import { punctLoc } from './cote.ts';
import type { Document, LegaturaCota, LocCota } from './document.ts';
import { locuriFoi } from './foi.ts';
import { chenarElement, cutieElement } from './forme.ts';
import { elementeFoaie, type ElementLume } from './lume.ts';

/**
 * Cheia unui centru sau a unui cadran, rotunjită la 1e-6 mm: două puncte cu aceeași cheie sunt unul (centrul cercului, din cele
 * două semicercuri). O mulțime, nu o căutare în listă: o formă cu mii de arce rămâne liniară.
 */
const cheie = (fel: string, p: { readonly x: number; readonly y: number }): string => `${fel}:${Math.round(p.x * 1e6)}:${Math.round(p.y * 1e6)}`;

function puncteElement(e: ElementLume, c: Contur): PunctTinta<LegaturaCota>[] {
  const n = numarSegmente(c);
  const rez: PunctTinta<LegaturaCota>[] = [];
  const vazute = new Set<string>();
  const pune = (loc: LocCota, fel: PunctTinta<LegaturaCota>['fel'], unic = false): void => {
    const p = punctLoc(e, loc, n, c);
    if (p === 'noduri') return;
    if (unic) {
      const k = cheie(fel, p);
      if (vazute.has(k)) return;
      vazute.add(k);
    }
    rez.push({ p, fel, date: { instanta: e.instanta, nod: e.nod, loc, n } });
  };
  for (let k = 0; k < c.varfuri.length; k++) pune({ fel: 'varf', k }, 'varf');
  for (let k = 0; k < n; k++) {
    pune({ fel: 'mijloc', k }, 'mijloc');
    const { a, s } = segment(c, k);
    if (s.tip !== 'A' || Math.abs(s.bulge) <= 1e-12) continue;
    pune({ fel: 'centru', k }, 'centru', true);
    // Cadranele de pe arc: unghiul fiecăruia, pe cercul arcului, trebuie să cadă în baleiaj (capetele incluse).
    const cx = punctLoc(e, { fel: 'centru', k }, n, c);
    if (cx === 'noduri') continue;
    const start = Math.atan2(a.y - cx.y, a.x - cx.x), baleiaj = 4 * Math.atan(s.bulge);
    for (let q = 0; q < 4; q++) {
      const p = punctLoc(e, { fel: 'cadran', k, q }, n, c);
      if (p === 'noduri') continue;
      const u = Math.atan2(p.y - cx.y, p.x - cx.x);
      let rel = baleiaj >= 0 ? u - start : start - u;
      rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const pe = rel <= Math.abs(baleiaj) + 1e-12 || rel >= 2 * Math.PI - 1e-12;
      if (pe) pune({ fel: 'cadran', k, q }, 'cadran', true);
    }
  }
  for (let i = 0; i < 9; i++) pune({ fel: 'cutie', i }, 'cutie');
  return rez;
}

/** Sursele de lipire ale foii `indexFoaie`: câte una pe element, cu punctele și conturul făcute o singură dată. */
export function surseCote(doc: Document, indexFoaie: number): SursaPuncte<LegaturaCota>[] {
  return elementeFoaie(doc, indexFoaie).map((e) => {
    let puncte: PunctTinta<LegaturaCota>[] | null = null;
    let contur: Contur | null = null;
    // Chenarul (ADR 0310 §1): la un relief, dreptunghiul grilei; la celelalte forme, conturul exact.
    const c = (): Contur => (contur ??= chenarElement(e));
    return { cutie: cutieElement(e), puncte: () => (puncte ??= puncteElement(e, c())), contur: c };
  });
}

/** Punctele foii: cele patru colțuri, mijloacele laturilor și centrul (în mm ai foii, originea în colțul stânga-jos). */
export function puncteFoaie(latime: number, inaltime: number): PunctTinta<LegaturaCota>[] {
  const rez: PunctTinta<LegaturaCota>[] = [];
  for (const y of [0, inaltime / 2, inaltime]) for (const x of [0, latime / 2, latime]) rez.push({ p: { x, y }, fel: 'foaie', date: null });
  return rez;
}

/** Un punct al altei foi, la Măsoară: doar foaia lui, nicio legătură. */
export type PunctVecin = { readonly foaie: string };

/**
 * Sursele de lipire ale celorlalte foi, pentru **Măsoară** cu „Toate foile pe pânză” (ADR 0330, întrebarea 13a, felia 10.4↑f):
 * elementele fiecărei foi și cele nouă puncte ale ei, mutate cu locul foii pe rândul pânzei față de foaia activă (`locuriFoi`:
 * doar pe X), **fără legătură**: fiecare punct poartă doar foaia lui (`PunctVecin`), iar unealta nu păstrează o măsură cu un
 * capăt pe altă foaie. Foile sunt plăci separate, iar așezarea lor pe pânză e doar o vedere, care se schimbă cu ordinea lor.
 * Punctele și conturul unei surse se fac doar cu cursorul lângă cutia ei.
 */
export function surseFoiVecine(doc: Document, indexFoaie: number): SursaPuncte<PunctVecin>[] {
  if (doc.foi.length < 2) return [];
  const locuri = locuriFoi(doc), x0 = locuri[indexFoaie] ?? 0;
  return doc.foi.flatMap((f, k) => {
    if (k === indexFoaie) return [];
    const dx = (locuri[k] ?? 0) - x0, m = translatie(dx, 0);
    const date: PunctVecin = { foaie: f.id };
    const muta = (t: PunctTinta<LegaturaCota>): PunctTinta<PunctVecin> => ({ p: { x: t.p.x + dx, y: t.p.y }, fel: t.fel, date });
    const foaie: SursaPuncte<PunctVecin> = {
      cutie: { minX: dx, minY: 0, maxX: dx + f.stoc.latime, maxY: f.stoc.inaltime },
      puncte: () => puncteFoaie(f.stoc.latime, f.stoc.inaltime).map(muta),
    };
    const elemente = surseCote(doc, k).map((s): SursaPuncte<PunctVecin> => {
      let puncte: PunctTinta<PunctVecin>[] | null = null;
      let contur: Contur | null = null;
      const b = s.cutie, cs = s.contur;
      return {
        cutie: { minX: b.minX + dx, minY: b.minY, maxX: b.maxX + dx, maxY: b.maxY },
        puncte: () => (puncte ??= s.puncte().map(muta)),
        ...(cs ? { contur: () => (contur ??= transformaContur(cs(), m)) } : {}),
      };
    });
    return [foaie, ...elemente];
  });
}
