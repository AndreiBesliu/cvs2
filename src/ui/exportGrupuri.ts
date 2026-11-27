/**
 * Fișa fiecărei operații în fereastra exportului (ADR 0290, felia 28.8↑a): ce grupuri are, în ce ordine, în ce grup stă
 * fiecare câmp și unde se arată o valoare greșită. Pur: fereastra îl citește, iar o probă cere ca fiecare câmp al ei să aibă
 * grupul lui (un câmp nou fără grup cade acolo, înainte să ajungă fără desen și fără explicație).
 */

/** Un grup al ferestrei: răspunde la o singură întrebare și are, din 28.8↑b, desenul lui. */
export type GrupExport =
  | 'foi' | 'origine' | 'z0' | 'post' | 'unitati' | 'fisier' | 'schimbare' | 'aer' | 'setari'
  | 'taietura' | 'freza' | 'adancime' | 'sens' | 'rampa' | 'intrari' | 'colturi' | 'urechi'
  | 'golire' | 'coborare' | 'rest' | 'gaurire' | 'fund' | 'incrustatie' | 'banda' | 'locas' | 'treapta' | 'dop'
  // Operațiile reliefului (felia 18.1↑d-4, ADR 0315): freza, liniile, adaosul (la degroșare), marginea și înălțimea, adâncimea.
  | 'freza-relief' | 'linii' | 'adaos' | 'margine' | 'podea';

/** Grupurile foii și ale mașinii, în ordinea din fereastră (cele două fișe de dinaintea operațiilor). */
export const GRUPURI_FOAIE: readonly GrupExport[] = ['foi', 'origine', 'z0'];
export const GRUPURI_MASINA: readonly GrupExport[] = ['post', 'unitati', 'fisier', 'schimbare', 'aer', 'setari'];

/** Ce știe fișa despre operație ca să-și aleagă grupurile: felul ei și alegerile care aduc grupuri noi. */
export type FelFisa = {
  readonly tip: 'profil' | 'buzunar' | 'gaurire' | 'vcarve';
  /** O cale deschisă (ADR 0037 §12): pe linie sau pe o parte, fără rampă, intrări, degajări și urechi. */
  readonly deschis: boolean;
  /** Buzunarul pe inele (nu pe linii paralele): doar atunci are coborâre (ADR 0076, ADR 0094). */
  readonly inele: boolean;
  /** V-carve-ul cu fundul plat bifat, ca incrustație în V (ADR 0170) sau cu banda îngustă (ADR 0172). */
  readonly incrustatie: boolean;
  readonly banda: boolean;
  /** Buzunarul ca incrustație cu pereți drepți (ADR 0171). */
  readonly incrustatieDreapta: boolean;
};

/**
 * Grupurile fișei unei operații, în ordinea din fereastră: întâi ce tăiere, cu ce freză și cât de adânc (orice operație),
 * apoi ale felului ei. Ce nu se aplică nu apare (o notă spune de ce): pe un buzunar, o găurire sau un V-carve, rampa,
 * intrările, colțurile și urechile sunt ale profilului; pe o cale deschisă vin într-o versiune următoare.
 */
export function grupuriOperatie(f: FelFisa): readonly GrupExport[] {
  const comune: GrupExport[] = ['taietura', 'freza', 'adancime', 'sens'];
  if (f.tip === 'profil') return f.deschis ? comune : [...comune, 'rampa', 'intrari', 'colturi', 'urechi'];
  if (f.tip === 'gaurire') return [...comune, 'gaurire'];
  if (f.tip === 'vcarve') return [...comune, 'fund', ...(f.incrustatie ? ['incrustatie' as const] : []), ...(f.incrustatie && f.banda ? ['banda' as const] : [])];
  return [...comune, 'golire', ...(f.inele ? ['coborare' as const] : []), 'rest', ...(f.incrustatieDreapta ? ['locas' as const, 'treapta' as const, 'dop' as const] : [])];
}

/**
 * Grupurile fișei unei operații a reliefului (felia 18.1↑d-4, ADR 0315), în ordinea din fereastră: freza, liniile, adaosul (doar
 * la degroșare), marginea cu înălțimea, adâncimea.
 */
export const GRUPURI_RELIEF: Readonly<Record<'finisare' | 'degrosare', readonly GrupExport[]>> = {
  finisare: ['freza-relief', 'linii', 'margine', 'podea'],
  degrosare: ['freza-relief', 'linii', 'adaos', 'margine', 'podea'],
};

/**
 * Grupul fiecărui câmp al ferestrei, după `data-camp`. `strategie` are două: schimbarea frezei (fișa mașinii) și traseul
 * buzunarului (pe linii paralele), cum au rămas din feliile lor (ADR 0084, ADR 0094). Frezele de rest au trei liste: ale
 * buzunarului, ale fundului plat (`fund-`) și ale dopului drept (`dop-`).
 */
export const GRUP_CAMP: Readonly<Record<string, readonly GrupExport[]>> = {
  origine: ['origine'], z0: ['z0'], supracursa: ['z0'], 'supracursa-prin-foaie': ['z0'],
  post: ['post'], unitati: ['unitati'], 'nume-fisier': ['fisier'], strategie: ['schimbare', 'golire'], 'setari-masina': ['setari'],
  // Z-ul sigur și parcarea (ADR 0291 §3, felia 28.8↑p): mișcările prin aer, ale mașinii.
  'z-sigur': ['aer'], parcare: ['aer'], 'parcare-x': ['aer'], 'parcare-y': ['aer'],
  latura: ['taietura'], directie: ['taietura'], despartire: ['taietura'],
  scula: ['freza'], diametru: ['freza'], 'freza-biblioteca': ['freza'], 'forma-scula': ['freza'], 'unghi-v': ['freza'], 'varf-v': ['freza'], 'raza-colt': ['freza'],
  // Valorile de lucru ale unei freze scrise de mână (felia 28.8↑p).
  turatie: ['freza'], avans: ['freza'], plonjare: ['freza'],
  adancime: ['adancime'], pas: ['adancime'],
  sens: ['sens'],
  rampa: ['rampa'], 'rampa-lungime': ['rampa'],
  intrari: ['intrari'], 'intrari-raza': ['intrari'],
  colturi: ['colturi'],
  urechi: ['urechi'], 'urechi-numar': ['urechi'], 'urechi-latime': ['urechi'], 'urechi-grosime': ['urechi'], 'urechi-egale': ['urechi'],
  'urechi-alese': ['urechi'], 'urechi-lemn': ['urechi'], 'urechi-lungi': ['urechi'], 'urechi-scurte': ['urechi'], 'urechi-mijloc': ['urechi'],
  'pas-lateral': ['golire'], 'unghi-paralel': ['golire'],
  coborare: ['coborare'], 'unghi-coborare': ['coborare'], 'lungime-zigzag': ['coborare'], 'raza-elice': ['coborare'], 'rampe-zigzag': ['coborare'],
  'rest-adauga': ['rest'], 'rest-biblioteca': ['rest'], 'rest-scula': ['rest'], 'rest-diametru': ['rest'], 'rest-pas': ['rest'], 'rest-scoate': ['rest'],
  retragere: ['gaurire'],
  'fund-plat': ['fund'], 'fund-biblioteca': ['fund'], 'fund-rest-biblioteca': ['fund'], 'fund-scula': ['fund'], 'fund-diametru': ['fund'], 'fund-pas': ['fund'],
  'fund-rest-adauga': ['fund'], 'fund-rest-scula': ['fund'], 'fund-rest-diametru': ['fund'], 'fund-rest-pas': ['fund'], 'fund-rest-scoate': ['fund'],
  'inc-joc': ['incrustatie', 'dop'], 'inc-acelasi': ['incrustatie'], 'inc-fierastrau': ['incrustatie', 'dop'], 'inc-margine': ['incrustatie', 'dop'],
  'inc-jur': ['incrustatie'],
  'banda-latime': ['banda'], 'banda-minima': ['banda'], 'banda-decupare': ['banda'], 'banda-placa': ['banda'], 'banda-placa-minima': ['banda'],
  'banda-punti-numar': ['banda'], 'banda-punti-latime': ['banda'], 'banda-punti-grosime': ['banda'], 'banda-freza': ['banda'],
  'banda-scula': ['banda'], 'banda-biblioteca': ['banda'], 'banda-diametru': ['banda'],
  'inc-lateral': ['locas'], 'inc-locas': ['locas'],
  'inc-treapta': ['treapta'], 'inc-treapta-adancime': ['treapta'], 'inc-treapta-latime': ['treapta'],
  'inc-dop': ['dop'], 'inc-sprijin': ['dop'], 'dop-punti-numar': ['dop'], 'dop-punti-latime': ['dop'], 'dop-punti-grosime': ['dop'],
  'inc-freza-dop': ['dop'], 'dop-biblioteca': ['dop'], 'dop-rest-biblioteca': ['dop'], 'dop-scula': ['dop'], 'dop-diametru': ['dop'], 'dop-pas': ['dop'],
  'dop-rest-adauga': ['dop'], 'dop-rest-scula': ['dop'], 'dop-rest-diametru': ['dop'], 'dop-rest-pas': ['dop'], 'dop-rest-scoate': ['dop'],
  // Operațiile reliefului (felia 18.1↑d-4): câmpurile lor, cu prefixul `relief-`.
  'relief-biblioteca': ['freza-relief'], 'relief-scula': ['freza-relief'], 'relief-diametru': ['freza-relief'], 'relief-forma': ['freza-relief'], 'relief-unghi-v': ['freza-relief'],
  'relief-varf-v': ['freza-relief'], 'relief-pas-lateral': ['linii'], 'relief-unghi': ['linii'], 'relief-aliniat': ['linii'], 'relief-adaos': ['adaos'],
  'relief-margine': ['margine'], 'relief-z': ['margine'], 'relief-plan-zero': ['margine'], 'relief-adancime': ['podea'], 'relief-pas': ['podea'],
  'confirma-iesire': [], 'confirma-placute': [], 'confirma-ordine': [],
};

/** Verdictul fiecărei verificări a unui rând (`randBun` din fereastră): `false` = valoarea e greșită. */
export type VerdictRand = {
  readonly scula: boolean; readonly adancime: boolean; readonly pas: boolean; readonly numar: boolean; readonly latime: boolean;
  readonly grosime: boolean; readonly rampa: boolean; readonly intrari: boolean; readonly pasLateral: boolean; readonly coborare: boolean;
  readonly retragere: boolean; readonly vcarve: boolean; readonly fund: boolean; readonly varf: boolean; readonly vPeLinie: boolean; readonly rotunda: boolean;
  readonly rest: boolean; readonly strategie: boolean; readonly incrustatie: boolean; readonly dreapta: boolean; readonly frezaDop: boolean;
  readonly banda: boolean; readonly puntiDop: boolean;
};

/**
 * Unde se spune fiecare verdict greșit: în grupul câmpului care trebuie schimbat. „V-carve-ul cere o freză în V” stă la
 * Freza, nu la tăietură: acolo se repară (captura din 23.11, cu motivul sub tabel, departe de cauză).
 */
export const GRUP_VERDICT: Readonly<Record<keyof VerdictRand, GrupExport>> = {
  scula: 'freza', vcarve: 'freza', varf: 'freza', vPeLinie: 'freza', rotunda: 'freza',
  adancime: 'adancime', pas: 'adancime',
  numar: 'urechi', latime: 'urechi', grosime: 'urechi',
  rampa: 'rampa', intrari: 'intrari',
  pasLateral: 'golire', strategie: 'golire', coborare: 'coborare', rest: 'rest',
  retragere: 'gaurire', fund: 'fund',
  incrustatie: 'incrustatie', banda: 'banda',
  dreapta: 'dop', frezaDop: 'dop', puntiDop: 'dop',
};

/** Grupurile unui rând cu valori greșite, fără repetări, în ordinea verificărilor. */
export function grupuriGresite(v: VerdictRand): readonly GrupExport[] {
  const out: GrupExport[] = [];
  for (const [k, g] of Object.entries(GRUP_VERDICT) as Array<[keyof VerdictRand, GrupExport]>) if (!v[k] && !out.includes(g)) out.push(g);
  return out;
}

/** Verdictele greșite ale unui rând, cu grupul fiecăruia (fereastra scrie motivul fiecăruia în grupul lui). */
export function verdicteGresite(v: VerdictRand): ReadonlyArray<readonly [keyof VerdictRand, GrupExport]> {
  return (Object.entries(GRUP_VERDICT) as Array<[keyof VerdictRand, GrupExport]>).filter(([k]) => !v[k]);
}
