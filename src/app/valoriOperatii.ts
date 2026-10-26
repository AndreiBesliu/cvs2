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
  const { despartire: _vechi, pasLateral: _pas, tip: _tip, coborare: _cob, retragereCompleta: _retr, ...rest } = {
    ...o, ...(v ?? {}), urechi, rampa, intrari, colturi, scula: { ...o.scula, numar: scula.numar, diametru: scula.diametru },
  };
  void _vechi; void _pas; void _tip; void _cob; void _retr;
  // Buzunarul (ADR 0069 §1): latura interior, nimic din profil, cu pasul lateral (al rândului, al operației, sau 40 % din D).
  const tip = v === undefined ? o.tip : v.tip ?? 'profil';
  // Găurirea (ADR 0087 §1): latura interior, nimic din profil; ieșirea la al câtelea pas, a rândului sau a operației. Implicitul
  // (1) nu se scrie pe o operație care nu-l avea, ca un Exportă fără nicio schimbare să nu scrie o comandă.
  if (tip === 'gaurire') {
    const retragereCompleta = v === undefined ? o.retragereCompleta : v.retragereCompleta ?? o.retragereCompleta;
    const scrie = retragereCompleta !== undefined && (retragereCompleta !== 1 || o.retragereCompleta !== undefined);
    return { ...rest, tip, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null, ...(scrie ? { retragereCompleta } : {}) };
  }
  if (tip === 'buzunar') {
    const pasLateral = v?.pasLateral ?? o.pasLateral ?? Math.round(scula.diametru * 4) / 10;
    // Coborârea (ADR 0076): a rândului (lipsă = plonjarea, care nu se scrie), sau a operației fără valori din dialog; pe
    // același fel se ÎMBINĂ cu cea din document, ca restul (un câmp necunoscut rămâne, ordinea cheilor la fel).
    const coborare = v === undefined ? o.coborare
      : v.coborare && o.coborare?.fel === v.coborare.fel ? { ...o.coborare, ...v.coborare } : v.coborare;
    return { ...rest, tip, pasLateral, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null, ...(coborare ? { coborare } : {}) };
  }
  const despartire = v?.despartire ?? o.despartire;
  return despartire ? { ...rest, tip, despartire: true } : { ...rest, tip };
}
