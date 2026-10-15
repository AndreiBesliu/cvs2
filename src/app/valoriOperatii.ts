import type { Operatie } from '../model/document.ts';
import type { ValoriOperatie } from '../ui/DialogExport.tsx';

/**
 * Operația pe care o scrie Exportă: valorile din dialog peste cea din document, cu freza arătată. Urechile, rampa,
 * intrările, degajările și scula se
 * ÎMBINĂ, nu se înlocuiesc: un câmp necunoscut din ele rămâne (ADR 0016), iar ordinea cheilor din document (cea salvată,
 * canonică) nu se schimbă, ca un Exportă fără nicio schimbare să nu scrie o comandă (recenzia feliei 2.4).
 */
export function operatieDinDialog(o: Operatie, v: ValoriOperatie | undefined, scula: { readonly numar: number; readonly diametru: number }): Operatie {
  const urechi = v === undefined ? o.urechi : v.urechi && o.urechi ? { ...o.urechi, ...v.urechi } : v.urechi;
  const rampa = v === undefined ? o.rampa : v.rampa && o.rampa ? { ...o.rampa, ...v.rampa } : v.rampa;
  const intrari = v === undefined ? o.intrari : v.intrari && o.intrari ? { ...o.intrari, ...v.intrari } : v.intrari;
  const colturi = v === undefined ? o.colturi : v.colturi && o.colturi ? { ...o.colturi, ...v.colturi } : v.colturi;
  // Despărțirea (ADR 0037 §8): bifată, `true`; nebifată, câmpul pleacă (lipsă = false), ca un document fără marcaj să rămână
  // octet cu octet ce era.
  const { despartire: _vechi, ...rest } = { ...o, ...(v ?? {}), urechi, rampa, intrari, colturi, scula: { ...o.scula, numar: scula.numar, diametru: scula.diametru } };
  void _vechi;
  const despartire = v?.despartire ?? o.despartire;
  return despartire ? { ...rest, despartire: true } : rest;
}
