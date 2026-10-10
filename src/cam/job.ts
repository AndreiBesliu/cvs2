import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { taieturiFoaie } from '../model/lume.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../ir/ir.ts';
import { profil } from './profil.ts';
import { regiunePastrata, verificaTaietura } from './regiune.ts';
import { traseuProfil } from './traseu.ts';
import { EPS_VARF, type ParametriUrechi } from './urechi.ts';

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

/** Cât poate trece o tăietură de fața de jos a foii, în masa de sacrificiu (ADR 0028 §2), în mm. */
export const SUPRACURSA_MAXIMA = 2;

export type RezultatJob = { readonly ok: true; readonly program: Program } | { readonly ok: false; readonly motiv: string };

/**
 * `supracursa`: cât are voie o operație sub fața de jos a foii (mm, 0 … `SUPRACURSA_MAXIMA`). Dialogul nu-l arată încă
 * (vine cu profilul mașinii), deci din interfață e 0.
 */
export function programDinDocument(doc: Document, regim: Regim = REGIM_IMPLICIT, supracursa = 0): RezultatJob {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  if (!(supracursa >= 0 && supracursa <= SUPRACURSA_MAXIMA)) {
    return { ok: false, motiv: `supracursa trebuie să fie între 0 și ${SUPRACURSA_MAXIMA} mm (${supracursa})` };
  }
  const grosime = foaie.stoc.grosime;
  const taieturi = taieturiFoaie(doc, 0);
  if (taieturi.length === 0) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const prima = taieturi[0];
  if (!prima) return { ok: false, motiv: 'nicio formă n-are o operație de tăiere' };
  const scula: Scula = { numar: prima.scula.numar, nume: prima.scula.nume, diametru: prima.scula.diametru };
  const alta = taieturi.find((t) => t.scula.numar !== scula.numar || t.scula.diametru !== scula.diametru);
  if (alta) {
    return { ok: false, motiv: `${alta.idLume}: altă sculă (T${alta.scula.numar}, Ø${alta.scula.diametru}) decât T${scula.numar}, Ø${scula.diametru}; schimbarea sculei vine în etapa 3` };
  }
  // Regiunea păstrată (ADR 0026): inelele și includerea lor, înaintea oricărui traseu.
  const regiune = regiunePastrata(taieturi);
  if (!regiune.ok) return { ok: false, motiv: regiune.motiv };
  const miscari: Miscare[] = [];
  for (const t of taieturi) {
    // Mai adânc decât foaia înseamnă în masa de sacrificiu (sau în masa mașinii): cel mult supracursa.
    if (t.adancime > grosime + supracursa + 1e-9) {
      return {
        ok: false,
        motiv: supracursa > 0
          ? `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm) plus supracursa (${supracursa} mm)`
          : `${t.idLume}: adâncimea ${t.adancime} mm trece de grosimea foii (${grosime} mm)`,
      };
    }
    // Urechile (ADR 0028 §2): vârful lor se măsoară de la fața de jos a foii, deci puntea are grosimea cerută oricât de
    // adânc merge tăietura.
    let urechi: ParametriUrechi | undefined;
    if (t.urechi) {
      const g = t.urechi.grosime;
      if (g >= grosime - EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: urechile de ${g} mm nu încap în foaia de ${grosime} mm` };
      }
      const varf = grosime - g;
      if (t.adancime <= varf + EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: tăietura de ${t.adancime} mm nu ajunge la vârful urechilor (la ${varf} mm de fața de sus), deci urechile n-ar exista` };
      }
      // Pe axa tăieturii, puntea ține grosimea doar pe W − D (ADR 0028, precizarea din 09.10): mai îngustă decât freza,
      // ar fi mai subțire sau n-ar exista.
      if (t.urechi.latime < scula.diametru - EPS_VARF) {
        return { ok: false, motiv: `${t.idLume}: urechile de ${t.urechi.latime} mm sunt mai scurte decât diametrul frezei (Ø${scula.diametru}), deci puntea de peste tăietură ar fi mai subțire de ${g} mm sau n-ar exista` };
      }
      urechi = { numar: t.urechi.numar, latime: t.urechi.latime, varf };
    }
    const pr = profil(conturElement(t), { latura: t.latura, sens: t.sens, diametruScula: scula.diametru, adancime: t.adancime, pas: t.pas });
    if (!pr.ok) return { ok: false, motiv: `${t.idLume}: ${pr.motiv}` };
    // Invarianta 2: trecerile au același traseu în plan, deci se judecă o dată, pe prima.
    const incalcare = verificaTaietura(regiune.regiune, t.idLume, t.latura, pr.treceri[0]?.contururi ?? [], scula.diametru / 2);
    if (incalcare) return { ok: false, motiv: incalcare };
    const tr = traseuProfil(pr.treceri, regim, urechi, t.rampa ? { lungime: t.rampa.lungime } : undefined);
    if (!tr.ok) return { ok: false, motiv: `${t.idLume}: ${tr.motiv}` };
    miscari.push({ tip: 'eticheta', text: `${t.idLume}: ${t.forma.tip}, ${t.latura}, ${t.adancime} mm`, element: t.idLume });
    // Fără `push(...listă)`: o listă foarte lungă depășește stiva de argumente.
    for (const m of tr.miscari) miscari.push(m);
  }
  return { ok: true, program: { axe: AXE_XYZ, scula, turatie: regim.turatie, zSigur: regim.zSigur, miscari } };
}
