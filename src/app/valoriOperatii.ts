import type { FrezaRest, FundPlat, Operatie } from '../model/document.ts';
import type { FrezaRestOperatie, FundPlatOperatie, SculaOperatie, ValoriOperatie } from '../ui/DialogExport.tsx';

/**
 * Scula scrisă de Exportă (ADR 0084, ADR 0090): numărul și diametrul rândului, forma lui (în V cu unghiul și vârful, sau
 * plată: câmpul pleacă); forma de pe același fel se ÎMBINĂ cu cea din document (un câmp necunoscut rămâne), iar vârful 0
 * (ascuțit) nu se scrie (ADR 0092). Numele urmează forma doar când ea se schimbă („freza V60”, „freza V30 varf 0.25”,
 * „freza plata”), ca un Exportă fără schimbare să nu scrie o comandă.
 */
function sculaScrisa(o: Operatie['scula'], s: SculaOperatie): Operatie['scula'] {
  const { forma: _vechi, ...baza } = o;
  void _vechi;
  if (s.forma) {
    const varf = s.forma.varf ?? 0;
    const nume = o.forma && o.forma.unghi === s.forma.unghi && (o.forma.varf ?? 0) === varf ? o.nume
      : `freza V${s.forma.unghi}${varf > 0 ? ` varf ${varf}` : ''}`;
    const { varf: _v, ...formaVeche } = o.forma ?? {};
    void _v;
    return { ...baza, numar: s.numar, diametru: s.diametru, nume, forma: { ...formaVeche, tip: 'v', unghi: s.forma.unghi, ...(varf > 0 ? { varf } : {}) } };
  }
  return { ...baza, numar: s.numar, diametru: s.diametru, nume: o.forma ? 'freza plata' : o.nume };
}

/**
 * Fundul plat scris de Exportă (ADR 0091): freza dreaptă și pasul rândului peste cel din document (ÎMBINAT: un câmp
 * necunoscut rămâne, ordinea cheilor la fel); freza e plată, deci o `forma` veche pleacă; numele nou, „freza dreapta”.
 */
function fundScris(o: FundPlat | undefined, f: FundPlatOperatie): FundPlat {
  const { forma: _forma, ...baza } = o?.scula ?? { numar: f.numar, nume: 'freza dreapta', diametru: f.diametru };
  void _forma;
  const { rest: _rest, ...fara } = o ?? {};
  void _rest;
  const rest = restScris(o?.rest, f.rest ?? [], 'freza dreapta');
  return { ...fara, scula: { ...baza, numar: f.numar, diametru: f.diametru }, pasLateral: f.pasLateral, ...(rest.length > 0 ? { rest } : {}) };
}

/**
 * Frezele de rest scrise de Exportă (ADR 0093), pe poziție peste cele din document (ÎMBINATE: un câmp necunoscut rămâne);
 * fiecare e plată, deci o `forma` veche pleacă; una nouă se cheamă `nume`.
 */
function restScris(vechi: readonly FrezaRest[] | undefined, noi: readonly FrezaRestOperatie[], nume: string): FrezaRest[] {
  return noi.map((r, i) => {
    const o = vechi?.[i];
    const { forma: _forma, ...baza } = o?.scula ?? { numar: r.numar, nume, diametru: r.diametru };
    void _forma;
    return { ...(o ?? {}), scula: { ...baza, numar: r.numar, diametru: r.diametru }, pasLateral: r.pasLateral };
  });
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
  const { despartire: _vechi, pasLateral: _pas, tip: _tip, coborare: _cob, retragereCompleta: _retr, fundPlat: _fund, directie: _dir, rest: _rest, ...rest } = {
    ...o, ...(v ?? {}), urechi, rampa, intrari, colturi, scula: sculaScrisa(o.scula, scula),
  };
  void _vechi; void _pas; void _tip; void _cob; void _retr; void _fund; void _dir; void _rest;
  // Buzunarul (ADR 0069 §1): latura interior, nimic din profil, cu pasul lateral (al rândului, al operației, sau 40 % din D).
  const tip = v === undefined ? o.tip : v.tip ?? 'profil';
  // Găurirea (ADR 0087 §1): latura interior, nimic din profil; ieșirea la al câtelea pas, a rândului sau a operației. Implicitul
  // (1) nu se scrie pe o operație care nu-l avea, ca un Exportă fără nicio schimbare să nu scrie o comandă.
  // V-carve-ul (ADR 0090): latura interior, nimic din profil (freza în V o cere CAM-ul, cu motiv). Fundul plat (ADR 0091): al
  // rândului (bifa scoasă: câmpul pleacă), sau al operației fără valori din dialog.
  if (tip === 'vcarve') {
    const fundPlat = v === undefined ? o.fundPlat : v.fundPlat ? fundScris(o.fundPlat, v.fundPlat) : undefined;
    return { ...rest, tip, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null, ...(fundPlat ? { fundPlat } : {}) };
  }
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
    // Frezele de rest (ADR 0093): ale rândului (goală: câmpul pleacă), sau ale operației fără valori din dialog.
    const frezeRest = v === undefined ? o.rest : restScris(o.rest, v.rest ?? [], 'freza plata');
    return {
      ...rest, tip, pasLateral, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null, ...(coborare ? { coborare } : {}),
      ...(frezeRest && frezeRest.length > 0 ? { rest: frezeRest } : {}),
    };
  }
  const despartire = v?.despartire ?? o.despartire;
  // Direcția pe linie (ADR 0092 §4): a rândului (ca desenul: câmpul pleacă), sau a operației fără valori din dialog; pe altă
  // latură pleacă.
  const directie = rest.latura !== 'pe-linie' ? undefined : v === undefined ? o.directie : v.directie;
  return { ...rest, tip, ...(despartire ? { despartire: true } : {}), ...(directie ? { directie } : {}) };
}
