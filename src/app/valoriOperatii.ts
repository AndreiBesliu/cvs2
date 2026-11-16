import type { BandaDop, FrezaRest, FundPlat, Incrustatie, IncrustatieDreapta, IncrustatieV, Operatie, Urechi } from '../model/document.ts';
import { PUNTI_DOP_DREPT } from '../model/incrustatie.ts';
import type {
  BandaOperatie, FrezaRestOperatie, FundPlatOperatie, IncrustatieDreaptaOperatie, IncrustatieOperatie, SculaOperatie, ValoriOperatie,
} from '../ui/DialogExport.tsx';

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
 * Incrustația cu pereți drepți scrisă de Exportă (ADR 0171): valorile rândului peste cea din document, dacă și ea are pereți
 * drepți (ÎMBINATĂ: un câmp necunoscut rămâne); frezele dopului peste ale ei, pe poziție, ca frezele de rest (fără ele, câmpul
 * pleacă: dopul se taie cu frezele locașului). Punțile dopului decupat (ADR 0174) se îmbină ca urechile, dar cele implicite nu
 * se scriu peste un dop care nu le are (un Exportă fără schimbare nu scrie o comandă); pe dopul ridicat, câmpul pleacă.
 */
function incrustatieDreaptaScrisa(o: Incrustatie | undefined, i: IncrustatieDreaptaOperatie): IncrustatieDreapta {
  const vechi = o?.fel === 'drept' ? o : undefined;
  const { frezeDop: _vechi, punti: puntiVechi, ...fara } = vechi ?? {};
  void _vechi;
  const { frezeDop: noi, punti: puntiNoi, ...valori } = i;
  const frezeDop = restScris(vechi?.frezeDop, noi ?? [], 'freza plata');
  const implicite = (p: Urechi): boolean => p.numar === PUNTI_DOP_DREPT.numar && p.latime === PUNTI_DOP_DREPT.latime && p.grosime === PUNTI_DOP_DREPT.grosime;
  const punti = puntiNoi && (puntiVechi || !implicite(puntiNoi)) ? { ...(puntiVechi ?? {}), ...puntiNoi } : undefined;
  return { ...fara, ...valori, fel: 'drept', ...(frezeDop.length > 0 ? { frezeDop } : {}), ...(punti ? { punti } : {}) };
}

/**
 * Banda dopului scrisă de Exportă (ADR 0172): valorile rândului peste cea din document (ÎMBINATĂ: un câmp necunoscut rămâne, la
 * locul lui); lățimea și freza lipsă pleacă (cea mai mică, a fundului plat); freza e dreaptă (o `forma` veche pleacă), una nouă
 * se cheamă „freza dreapta”; punțile se îmbină ca urechile.
 */
function bandaScrisa(o: BandaDop | undefined, b: BandaOperatie): BandaDop {
  const vechi: Record<string, unknown> = { ...(o ?? {}) };
  if (b.latime === undefined) delete vechi['latime'];
  if (!b.freza) delete vechi['freza'];
  let freza: BandaDop['freza'];
  if (b.freza) {
    const { forma: _forma, ...baza } = o?.freza ?? { numar: b.freza.numar, nume: 'freza dreapta', diametru: b.freza.diametru };
    void _forma;
    freza = { ...baza, numar: b.freza.numar, diametru: b.freza.diametru };
  }
  return {
    ...vechi, ...(b.latime !== undefined ? { latime: b.latime } : {}), decupare: b.decupare, grosimePlaca: b.grosimePlaca,
    ...(freza ? { freza } : {}), punti: { ...(o?.punti ?? {}), ...b.punti },
  } as BandaDop;
}

/**
 * Incrustația în V scrisă de Exportă (ADR 0170, ADR 0172): valorile rândului peste cea din document, dacă și ea e în V
 * (ÎMBINATĂ: un câmp necunoscut rămâne); banda, doar cu `jurDop: 'banda'` (altfel câmpul pleacă).
 */
function incrustatieVScrisa(o: Incrustatie | undefined, i: IncrustatieOperatie): IncrustatieV {
  const vechi: Record<string, unknown> = { ...(o?.fel === 'v' ? o : {}) };
  const { banda: noua, ...valori } = i;
  if (!noua) delete vechi['banda'];
  const banda = noua ? bandaScrisa(o?.fel === 'v' ? o.banda : undefined, noua) : undefined;
  return { ...vechi, ...valori, fel: 'v', ...(banda ? { banda } : {}) } as IncrustatieV;
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
  const {
    despartire: _vechi, pasLateral: _pas, tip: _tip, coborare: _cob, retragereCompleta: _retr, fundPlat: _fund, directie: _dir, rest: _rest, strategie: _str,
    incrustatie: _inc, incrustatieDreapta: _incDreapta, ...rest
  } = {
    ...o, ...(v ?? {}), urechi, rampa, intrari, colturi, scula: sculaScrisa(o.scula, scula),
  };
  void _vechi; void _pas; void _tip; void _cob; void _retr; void _fund; void _dir; void _rest; void _str; void _inc; void _incDreapta;
  // Buzunarul (ADR 0069 §1): latura interior, nimic din profil, cu pasul lateral (al rândului, al operației, sau 40 % din D).
  const tip = v === undefined ? o.tip : v.tip ?? 'profil';
  // Găurirea (ADR 0087 §1): latura interior, nimic din profil; ieșirea la al câtelea pas, a rândului sau a operației. Implicitul
  // (1) nu se scrie pe o operație care nu-l avea, ca un Exportă fără nicio schimbare să nu scrie o comandă.
  // V-carve-ul (ADR 0090): latura interior, nimic din profil (freza în V o cere CAM-ul, cu motiv). Fundul plat (ADR 0091): al
  // rândului (bifa scoasă: câmpul pleacă), sau al operației fără valori din dialog.
  if (tip === 'vcarve') {
    const fundPlat = v === undefined ? o.fundPlat : v.fundPlat ? fundScris(o.fundPlat, v.fundPlat) : undefined;
    // Incrustația (ADR 0170): a rândului (fără ea, câmpul pleacă), ÎMBINATĂ cu cea din document (un câmp necunoscut rămâne), sau
    // a operației fără valori din dialog.
    const incrustatie = v === undefined ? o.incrustatie : v.incrustatie ? incrustatieVScrisa(o.incrustatie, v.incrustatie) : undefined;
    return {
      ...rest, tip, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null, ...(fundPlat ? { fundPlat } : {}),
      ...(incrustatie ? { incrustatie } : {}),
    };
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
    // Strategia (ADR 0094): a rândului (inelele: câmpul pleacă), îmbinată cu cea din document; sau a operației.
    const strategie = v === undefined ? o.strategie : v.strategie ? { ...(o.strategie ?? {}), ...v.strategie } : undefined;
    // Incrustația cu pereți drepți (ADR 0171): a rândului (fără ea, câmpul pleacă), sau a operației fără valori din dialog.
    const incrustatie = v === undefined ? o.incrustatie : v.incrustatieDreapta ? incrustatieDreaptaScrisa(o.incrustatie, v.incrustatieDreapta) : undefined;
    return {
      ...rest, tip, pasLateral, latura: 'interior', urechi: null, rampa: null, intrari: null, colturi: null, ...(coborare ? { coborare } : {}),
      ...(frezeRest && frezeRest.length > 0 ? { rest: frezeRest } : {}), ...(strategie ? { strategie } : {}), ...(incrustatie ? { incrustatie } : {}),
    };
  }
  const despartire = v?.despartire ?? o.despartire;
  // Direcția pe linie (ADR 0092 §4): a rândului (ca desenul: câmpul pleacă), sau a operației fără valori din dialog; pe altă
  // latură pleacă.
  const directie = rest.latura !== 'pe-linie' ? undefined : v === undefined ? o.directie : v.directie;
  return { ...rest, tip, ...(despartire ? { despartire: true } : {}), ...(directie ? { directie } : {}) };
}
