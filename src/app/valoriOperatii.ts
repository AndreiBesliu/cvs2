import type { Operatie } from '../model/document.ts';
import type { ValoriOperatie } from '../ui/DialogExport.tsx';

/**
 * Operația pe care o scrie Exportă: valorile din dialog peste cea din document, cu freza arătată. Urechile, rampa și scula se
 * ÎMBINĂ, nu se înlocuiesc: un câmp necunoscut din ele rămâne (ADR 0016), iar ordinea cheilor din document (cea salvată,
 * canonică) nu se schimbă, ca un Exportă fără nicio schimbare să nu scrie o comandă (recenzia feliei 2.4).
 */
export function operatieDinDialog(o: Operatie, v: ValoriOperatie | undefined, scula: { readonly numar: number; readonly diametru: number }): Operatie {
  const urechi = v === undefined ? o.urechi : v.urechi && o.urechi ? { ...o.urechi, ...v.urechi } : v.urechi;
  const rampa = v === undefined ? o.rampa : v.rampa && o.rampa ? { ...o.rampa, ...v.rampa } : v.rampa;
  return { ...o, ...(v ?? {}), urechi, rampa, scula: { ...o.scula, numar: scula.numar, diametru: scula.diametru } };
}
