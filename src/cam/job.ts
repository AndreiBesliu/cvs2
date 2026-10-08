import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { taieturiFoaie } from '../model/lume.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { profil } from './profil.ts';
import { traseuProfil } from './traseu.ts';

/**
 * Lucrarea: tăieturile primei foi (`taieturiFoaie`, ADR 0025), adică operațiile pieselor pe elementele lor, în fiecare
 * instanță, în ordinea de tăiere a contractului (întâi interioarele, la urmă exterioarele), într-un singur program în IR.
 * Parametrii și scula vin din operații, nu din dialog. O singură sculă pe program până la schimbarea sculei (etapa 3).
 */
export type Regim = {
  readonly turatie: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  readonly zSigur: number;
};

export const REGIM_IMPLICIT: Regim = { turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5 };

export type RezultatJob = { readonly ok: true; readonly program: Program } | { readonly ok: false; readonly motiv: string };

export function programDinDocument(doc: Document, regim: Regim = REGIM_IMPLICIT): RezultatJob {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const taieturi = taieturiFoaie(doc, 0);
  if (taieturi.length === 0) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const prima = taieturi[0];
  if (!prima) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const scula: Scula = { numar: prima.scula.numar, nume: prima.scula.nume, diametru: prima.scula.diametru };
  const alta = taieturi.find((t) => t.scula.numar !== scula.numar || t.scula.diametru !== scula.diametru);
  if (alta) {
    return { ok: false, motiv: `${alta.idLume}: altă sculă (T${alta.scula.numar}, Ø${alta.scula.diametru}) decât T${scula.numar}, Ø${scula.diametru}; schimbarea sculei vine în etapa 3` };
  }
  const miscari: Miscare[] = [];
  for (const t of taieturi) {
    // Mai adânc decât foaia înseamnă în masa de sacrificiu (sau în masa mașinii). Supracursa unei tăieri prin material
    // vine cu profilul complet; până atunci, cel mult grosimea foii.
    if (t.adancime > foaie.stoc.grosime + 1e-9) {
      return { ok: false, motiv: `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${foaie.stoc.grosime} mm)` };
    }
    const pr = profil(conturElement(t), { latura: t.latura, diametruScula: scula.diametru, adancime: t.adancime, pas: t.pas });
    if (!pr.ok) return { ok: false, motiv: `${t.idLume}: ${pr.motiv}` };
    const tr = traseuProfil(pr.treceri, regim);
    if (!tr.ok) return { ok: false, motiv: `${t.idLume}: ${tr.motiv}` };
    miscari.push({ tip: 'eticheta', text: `${t.idLume}: ${t.forma.tip}, ${t.latura}, ${t.adancime} mm`, element: t.idLume });
    // Fără `push(...listă)`: o listă foarte lungă depășește stiva de argumente.
    for (const m of tr.miscari) miscari.push(m);
  }
  return { ok: true, program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari } };
}
