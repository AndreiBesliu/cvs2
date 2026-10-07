import type { Document, ElementDoc } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { profil, type Latura } from './profil.ts';
import { traseuProfil } from './traseu.ts';

/**
 * Lucrarea v0: elementele documentului, fiecare cu profilul lui, într-un singur program în IR. Operațiile ca obiecte ale
 * documentului vin cu arborele (după alegerea A / D); până atunci, parametrii stau în dialogul de export.
 */
export type ParametriElement = { readonly latura: Latura; readonly adancime: number; readonly pas: number };

export type Regim = {
  readonly turatie: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  readonly zSigur: number;
};

export const REGIM_IMPLICIT: Regim = { turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5 };

/** Parametrii impliciți, ca pe placa 1: dreptunghiul e o insulă (exterior, 3 mm), cercul o gaură (interior, 8 mm în 2). */
export function parametriImpliciti(e: ElementDoc): ParametriElement {
  return e.forma.tip === 'cerc' ? { latura: 'interior', adancime: 8, pas: 4 } : { latura: 'exterior', adancime: 3, pas: 3 };
}

/** Ordinea de tăiere: întâi interioarele, apoi cele pe linie, la urmă exterioarele, ca piesa să nu se miște sub sculă. */
const ORDINE: Readonly<Record<Latura, number>> = { interior: 0, 'pe-linie': 1, exterior: 2 };

export type RezultatJob = { readonly ok: true; readonly program: Program } | { readonly ok: false; readonly motiv: string };

export function programDinDocument(
  doc: Document,
  parametri: ReadonlyMap<string, ParametriElement>,
  scula: Scula,
  regim: Regim = REGIM_IMPLICIT,
): RezultatJob {
  if (doc.elemente.length === 0) return { ok: false, motiv: 'documentul n-are nicio formă de tăiat' };
  const elemente = doc.elemente
    .map((e, i) => ({ e, i, p: parametri.get(e.id) ?? parametriImpliciti(e) }))
    .sort((a, b) => ORDINE[a.p.latura] - ORDINE[b.p.latura] || a.i - b.i);
  const miscari: Miscare[] = [];
  for (const { e, p } of elemente) {
    const pr = profil(conturElement(e), { latura: p.latura, diametruScula: scula.diametru, adancime: p.adancime, pas: p.pas });
    if (!pr.ok) return { ok: false, motiv: `${e.id}: ${pr.motiv}` };
    const tr = traseuProfil(pr.treceri, regim);
    if (!tr.ok) return { ok: false, motiv: `${e.id}: ${tr.motiv}` };
    miscari.push({ tip: 'eticheta', text: `${e.id}: ${e.forma.tip}, ${p.latura}, ${p.adancime} mm` }, ...tr.miscari);
  }
  return { ok: true, program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari } };
}
