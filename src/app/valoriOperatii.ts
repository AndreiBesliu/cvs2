import type { Operatie } from '../model/document.ts';
import type { SculaOperatie, ValoriOperatie } from '../ui/DialogExport.tsx';

/**
 * Scula scrisă de Exportă (ADR 0084, ADR 0090): numărul și diametrul rândului, forma lui (în V cu unghiul, sau plată: câmpul
 * pleacă); forma de pe același fel se ÎMBINĂ cu cea din document (un câmp necunoscut rămâne). Numele urmează forma doar
 * când ea se schimbă („freza V60”, „freza plata”), ca un Exportă fără schimbare să nu scrie o comandă.
 */
function sculaScrisa(o: Operatie['scula'], s: SculaOperatie): Operatie['scula'] {
  const { forma: _vechi, ...baza } = o;
  void _vechi;
  if (s.forma) {
    const nume = o.forma && o.forma.unghi === s.forma.unghi ? o.nume : `freza V${s.forma.unghi}`;
    return { ...baza, numar: s.numar, diametru: s.diametru, nume, forma: { ...(o.forma ?? {}), tip: 'v', unghi: s.forma.unghi } };
  }
  return { ...baza, numar: s.numar, diametru: s.diametru, nume: o.forma ? 'freza plata' : o.nume };
}

/**
 * Operația pe care o scrie Exportă: valorile din dialog peste cea din document, cu freza arătată. Urechile, rampa,
 * intrările, degajările și scula se
 * ÎMBINĂ, nu se înlocuiesc: un câmp necunoscut din ele rămâne (ADR 0016), iar ordinea cheilor din document (cea salvată,
 * canonică) nu se schimbă, ca un Exportă fără nicio schimbare să nu scrie o comandă (recenzia feliei 2.4).
 */
export function operatieDinDialog(o: Operatie, v: ValoriOperatie | undefined, scula: SculaOperatie): Operatie {
  const urechi = v === undefined ? o.urechi : v.urechi && o.urechi ? { ...o.urechi, ...v.urechi } : v.urechi;
  const rampa = v === undefined ? o.rampa : v.rampa && o.rampa ? { ...o.rampa, ...v.rampa } : v.rampa;
  const intrari = v === undefined ? o.intrari : v.intrari && o.intrari ? { ...o.intrari, ...v.intrari } : v.intrari;
  const colturi = v === undefined ? o.colturi : v.colturi && o.colturi ? { ...o.colturi, ...v.colturi } : v.colturi;
  // Despărțirea (ADR 0037 §8): bifată, `true`; nebifată, câmpul pleacă (lipsă = false), ca un document fără marcaj să rămână
  // octet cu octet ce era.
  const { despartire: _vechi, pasLateral: _pas, tip: _tip, coborare: _cob, retragereCompleta: _retr, ...rest } = {
    ...o, ...(v ?? {}), urechi, rampa, intrari, colturi, scula: sculaScrisa(o.scula, scula),
  };
  void _vechi; void _pas; void _tip; void _cob; void _retr;
  // Buzunarul (ADR 0069 §1): latura interior, nimic din profil, cu pasul lateral (al rândului, al operației, sau 40 % din D).
  const tip = v === undefined ? o.tip : v.tip ?? 'profil';
  // Găurirea (ADR 0087 §1): latura interior, nimic din profil; ieșirea la al câtelea pas, a rândului sau a operației. Implicitul
  // (1) nu se scrie pe o operație care nu-l avea, ca un Exportă fără nicio schimbare să nu scrie o comandă.
  // V-carve-ul (ADR 0090): latura interior, nimic din profil (freza în V o cere CAM-ul, cu motiv).
  if (tip === 'vcarve') return { ...rest, tip, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null };
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
