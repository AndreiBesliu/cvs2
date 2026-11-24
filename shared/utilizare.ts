/**
 * Utilizarea aplicației (ADR 0262): contractul comun clientului și serverului. Un lot are sesiunea (un id aleator, nou la
 * fiecare încărcare), numărul lui în sesiune, ceasul sesiunii la trimitere, contextul și evenimentele. Fiecare eveniment are
 * doar câmpurile felului lui, din liste închise: **lista albă** (§1–§2). Serverul nu păstrează nimic din ce a trimis clientul
 * așa cum a venit: reface fiecare eveniment din câmpurile știute, iar unul cu un câmp în plus sau cu o valoare din afara listei
 * se aruncă, numărat (`aruncate`), fără să strice restul lotului. Nu intră niciodată: textul omului, geometria, numele
 * fișierelor, G-code-ul, adresele, parolele.
 *
 * Setările (§8) stau în `setari/utilizare`; le scrie doar owner-ul, prin callable-ul `utilizare`, pe versiunea văzută, cu
 * auditul în tranzacție. Editorul nu citește Firestore: află din răspunsul fiecărui lot ce-i schimbă purtarea
 * (`setariPublice`).
 */

export const COLECTIE_UTILIZARE = 'utilizare';
/** Contoarele plafonului de loturi, câte unul pe cont și pe oră; doar serverul le citește și le scrie. */
export const COLECTIE_LIMITE_UTILIZARE = 'limiteUtilizare';
export const CALE_SETARI_UTILIZARE = { colectie: 'setari', id: 'utilizare' } as const;

/** Câte evenimente are un lot, cel mult; la atâtea, clientul îl trimite fără să aștepte minutele lotului. */
export const EVENIMENTE_PE_LOT = 200;
/** Câte loturi primește serverul de la un cont într-o oră (un lot pe minut, plus cele pline). */
export const LOTURI_PE_ORA = 120;
/** Ceasul sesiunii (ms de la încărcare), cel mult: o filă lăsată deschisă 30 de zile. */
export const SESIUNE_MAX_MS = 30 * 86_400_000;
/** De câte ori, cel mult, un eveniment repetat la rând (aceeași acțiune, din același loc, cu același rezultat) e numărat într-unul. */
export const REPETARI_MAX = 10_000;

/** De unde a pornit o acțiune sau o unealtă. */
export const SURSE = ['bara', 'tasta', 'paleta', 'meniu', 'panou', 'panza', 'alt'] as const;
export type Sursa = (typeof SURSE)[number];
export const FERESTRE = ['proiectare', 'masina', 'imprimanta', 'extensie'] as const;
export type Fereastra = (typeof FERESTRE)[number];
/** Un dialog: deschis, închis cu rezultat sau închis fără (Renunță, Escape, ×). */
export const REZULTATE_DIALOG = ['deschis', 'gata', 'renuntat'] as const;
export type RezultatDialog = (typeof REZULTATE_DIALOG)[number];
export const LIMBI_UTILIZARE = ['ro', 'en'] as const;
export const TEME_UTILIZARE = ['deschisa', 'inchisa'] as const;
/** Ecranul, în trepte (lățimea ferestrei): sub 600, sub 1 024, sub 1 600 de pixeli CSS, restul. */
export const ECRANE = ['telefon', 'tableta', 'laptop', 'mare'] as const;
export const BROWSERE = ['chrome', 'edge', 'firefox', 'safari', 'altul'] as const;

/** Calculele lungi (felia A.8d): cele ale bazinului CAM (`src/jobs/protocolCam.ts`) și citirea unui fișier la import. */
export const CALCULE = [
  'export', 'traseu', 'simulare', 'potrivire', 'timp', 'verificare', 'reparare', 'taiere', 'panouri', 'conversie', 'legare', 'import',
] as const;
export type Calcul = (typeof CALCULE)[number];
/** Cum s-a încheiat un calcul: cu rezultat, cu o eroare (și un refuz cu motiv), sau anulat (un calcul mai nou, fereastra închisă). */
export const REZULTATE_CALCUL = ['ok', 'eroare', 'anulat'] as const;
export type RezultatCalcul = (typeof REZULTATE_CALCUL)[number];
/** Durata unui calcul, în trepte: valoarea e marginea de sus, în ms (100: sub 0,1 s); ultima ține tot ce trece de 5 minute. */
export const TREPTE_MS = [100, 300, 1_000, 3_000, 10_000, 30_000, 100_000, 300_000, 1_000_000] as const;
/** O mărime (formele documentului, octeții fișierului), în trepte: valoarea e marginea de sus (10: sub 10); ultima ține restul. */
export const TREPTE_MARIME = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000] as const;
/** Formatul unui fișier importat (`src/io/formatImport.ts`). */
export const FORMATE_IMPORT = ['svg', 'dxf', 'pdf', 'eps', 'wmf', 'imagine'] as const;
/** Mașina (felia A.8d): legătura, lucrarea, codurile controlerului; fără G-code și fără adrese. */
export const EVENIMENTE_MASINA = [
  'legata', 'deconectata', 'pornita', 'pauza', 'reluata', 'oprita', 'anulata', 'terminata', 'intrerupta', 'eroare', 'alarma', 'blocare',
] as const;
export type EvenimentMasina = (typeof EVENIMENTE_MASINA)[number];
/** Cum e legată mașina. */
export const CAI_MASINA = ['serial', 'retea', 'simulat'] as const;
/** Imprimanta (felia A.8d): legătura, lucrarea și evenimentele ei (ADR 0194 §A); fără fișiere și fără adrese. */
export const EVENIMENTE_IMPRIMANTA = [
  'legata', 'deconectata', 'pornita', 'gata', 'oprita', 'pauza-fisier', 'pauza', 'fara-filament', 'eroare', 'pana', 'pierduta', 'primul-strat',
] as const;
export type EvenimentImprimanta = (typeof EVENIMENTE_IMPRIMANTA)[number];
/** Codul unei erori a controlerului (`error:N`, `ALARM:N`) sau al imprimantei (cheia ei, altfel `errcode`). */
export const COD_MAX = 99_999;

/** Pură: treapta unei durate (ms), cea mai mică margine care o cuprinde. */
export function treaptaMs(ms: number): number {
  return TREPTE_MS.find((x) => ms < x) ?? TREPTE_MS[TREPTE_MS.length - 1] ?? 0;
}
/** Pură: treapta unei mărimi (câte forme, câți octeți). */
export function treaptaMarime(n: number): number {
  return TREPTE_MARIME.find((x) => n < x) ?? TREPTE_MARIME[TREPTE_MARIME.length - 1] ?? 0;
}

/** O acțiune a registrului (`document.roteste`), o unealtă (`dreptunghi`), un dialog (`export`): litere mici, cifre, cratimă, puncte. */
const RE_ID = /^[a-z][a-z0-9-]{0,39}(?:\.[a-z0-9-]{1,40}){0,3}$/;
/** Rezultatul unei acțiuni: `ok`, sau cheia motivului refuzului (`motiv.nimic-ales`). */
const RE_REZULTAT = /^(?:ok|motiv\.[a-z0-9-]{1,60}(?:\.[a-z0-9-]{1,40}){0,2})$/;
const RE_SESIUNE = /^[a-z0-9]{16}$/;
/** Forma id-ului unei sesiuni de utilizare (raportarea îl ține, cronologia filtrează după el; felia A.11d). */
export const esteSesiune = (x: unknown): x is string => typeof x === 'string' && RE_SESIUNE.test(x);
/** Id-ul unei acțiuni, unelte sau al unui dialog e din lista albă (clientul nu trimite altceva). */
export const idBun = (x: string): boolean => RE_ID.test(x);
/** Rezultatul unei acțiuni e din lista albă: `ok` sau cheia unui motiv. */
export const rezultatBun = (x: string): boolean => RE_REZULTAT.test(x);
const RE_VERSIUNE = /^[A-Za-z0-9._-]{1,40}$/;
const RE_ARANJAMENT = /^[a-z][a-z0-9-]{0,31}$/;

export type Eveniment =
  | { readonly fel: 'actiune'; readonly t: number; readonly id: string; readonly de: Sursa; readonly rez: string; readonly n?: number }
  | { readonly fel: 'fereastra'; readonly t: number; readonly id: Fereastra }
  | { readonly fel: 'unealta'; readonly t: number; readonly id: string; readonly de: Sursa }
  | { readonly fel: 'dialog'; readonly t: number; readonly id: string; readonly rez: RezultatDialog }
  /** Un clic pe un control, după numele lui din cod (`testid.export-gcode`), din catalogul scos din sursă (felia A.8c). */
  | { readonly fel: 'clic'; readonly t: number; readonly id: string; readonly de: Sursa; readonly n?: number }
  /** Derularea sau zoom-ul unui gest (rotița, pe rând), cu câte trepte a avut. */
  | { readonly fel: 'derulare' | 'zoom'; readonly t: number; readonly de: Sursa; readonly n: number }
  /**
   * Un calcul lung (felia A.8d), cu durata și mărimea în trepte (`TREPTE_MS`, `TREPTE_MARIME`): formele documentului la
   * calculele CAM, octeții și formatul fișierului la import. Înregistratorul face treptele din valorile brute, înaintea lotului.
   */
  | {
    readonly fel: 'calcul'; readonly t: number; readonly id: Calcul; readonly ms: number; readonly rez: RezultatCalcul;
    readonly forme?: number; readonly octeti?: number; readonly format?: (typeof FORMATE_IMPORT)[number];
  }
  /** Mașina: legarea (cu felul legăturii), lucrarea, codurile controlerului (cu numărul lor). */
  | { readonly fel: 'masina'; readonly t: number; readonly id: EvenimentMasina; readonly cod?: number; readonly cale?: (typeof CAI_MASINA)[number] }
  /** Imprimanta: legarea, lucrarea, evenimentele ei (cu codul erorii). */
  | { readonly fel: 'imprimanta'; readonly t: number; readonly id: EvenimentImprimanta; readonly cod?: number };

export interface ContextLot {
  /** Versiunea build-ului (primele caractere ale commit-ului); `necunoscuta` fără ea. */
  readonly versiune: string;
  readonly limba: (typeof LIMBI_UTILIZARE)[number];
  readonly aranjament: string;
  readonly tema: (typeof TEME_UTILIZARE)[number];
  readonly ecran: (typeof ECRANE)[number];
  readonly browser: (typeof BROWSERE)[number];
  readonly atingere: boolean;
  readonly online: boolean;
}

export interface Lot {
  readonly sesiune: string;
  /** Al câtelea lot al sesiunii, de la 1. */
  readonly nr: number;
  /** Ceasul sesiunii la trimitere (ms de la încărcare): cu ora primirii, serverul pune evenimentele în timp. */
  readonly acum: number;
  readonly context: ContextLot;
  readonly evenimente: readonly Eveniment[];
}

export interface SetariUtilizare {
  /** Pornită: serverul scrie loturile. Oprită: nu scrie nimic, iar clientul își golește coada (§8). */
  readonly colectare: boolean;
  /** Clicurile fine, derularea și zoom-ul (§1, felia A.8c). */
  readonly clicuri: boolean;
  /** La câte minute pleacă un lot. */
  readonly lotMinute: number;
  /** Câte zile se păstrează loturile scrise de acum înainte. */
  readonly zileEvenimente: number;
  /** Câte zile se păstrează sumele zilei (felia A.9). */
  readonly zileSume: number;
  /** Câte evenimente dinaintea unei erori intră în raportul ei (felia A.11); 0 = niciunul. */
  readonly pasiEroare: number;
}

export const SETARI_UTILIZARE_IMPLICITE: SetariUtilizare = {
  colectare: true, clicuri: true, lotMinute: 5, zileEvenimente: 90, zileSume: 730, pasiEroare: 30,
};

type CampNumeric = 'lotMinute' | 'zileEvenimente' | 'zileSume' | 'pasiEroare';
export const MARGINI_UTILIZARE: { readonly [K in CampNumeric]: readonly [number, number] } = {
  lotMinute: [1, 60], zileEvenimente: [7, 365], zileSume: [90, 1095], pasiEroare: [0, 100],
};
const CAMPURI_NUMERICE = Object.keys(MARGINI_UTILIZARE) as CampNumeric[];
const CAMPURI_SETARI = ['colectare', 'clicuri', ...CAMPURI_NUMERICE] as const;

/** Ce află editorul (din răspunsul fiecărui lot): doar ce-i schimbă purtarea. */
export type SetariPublice = Pick<SetariUtilizare, 'colectare' | 'clicuri' | 'lotMinute' | 'pasiEroare'>;

export interface CerereLot {
  readonly actiune: 'lot';
  readonly lot: Lot;
}
export interface RaspunsLot {
  readonly ok: true;
  /** Fals: colectarea e oprită, sau lotul era deja scris (o reîncercare). */
  readonly scris: boolean;
  readonly setari: SetariPublice;
}
export interface CerereSetariUtilizare {
  readonly actiune: 'setari';
  readonly setari: SetariUtilizare;
  /** Versiunea văzută: 0 dacă nu era niciun document. */
  readonly versiune: number;
}
export interface RaspunsSetariUtilizare {
  readonly ok: true;
  readonly schimbat: boolean;
  readonly versiune: number;
}

/** Cronologia unui om (ADR 0262 §6, felia A.11c): câte loturi pe pagină, cele mai noi întâi. */
export const PAGINA_CRONOLOGIE = 20;
export interface CerereCronologie {
  readonly actiune: 'cronologie';
  /** Contul al cărui lucru se citește. */
  readonly uid: string;
  /** Doar loturile primite înainte de clipa asta (ms): pagina următoare, mai veche. */
  readonly pana?: number;
  /** Doar loturile unei sesiuni (sesiunea unei raportări, felia A.11d). */
  readonly sesiune?: string;
}
/** Un lot în cronologie: sesiunea, numărul, clipele (ms), contextul și evenimentele, așa cum le-a scris serverul. */
export interface LotCronologie {
  readonly id: string;
  readonly sesiune: string;
  readonly nr: number;
  readonly primit: number;
  readonly inceput: number;
  readonly context: ContextLot | null;
  readonly evenimente: readonly Eveniment[];
  readonly aruncate: number;
}
export interface RaspunsCronologie {
  readonly ok: true;
  readonly loturi: readonly LotCronologie[];
  /** Mai sunt loturi, mai vechi decât ultimul din pagină. */
  readonly maiVechi: boolean;
}

const obiect = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : null);
const intreg = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max;
const din = <T extends string>(lista: readonly T[], x: unknown): x is T => typeof x === 'string' && (lista as readonly string[]).includes(x);
const id = (x: unknown): x is string => typeof x === 'string' && RE_ID.test(x);
const treapta = (trepte: readonly number[], x: unknown): x is number => typeof x === 'number' && trepte.includes(x);
/** Cheile obiectului sunt exact cele cerute, plus cele opționale prezente. */
function cheiExact(o: Record<string, unknown>, cerute: readonly string[], optionale: readonly string[] = []): boolean {
  const chei = Object.keys(o);
  return cerute.every((k) => k in o) && chei.every((k) => cerute.includes(k) || optionale.includes(k));
}

/** Pură: un eveniment, refăcut doar din câmpurile felului lui; null dacă are altceva sau o valoare din afara listei. */
export function evenimentDin(x: unknown, acum: number): Eveniment | null {
  const o = obiect(x);
  if (!o || !intreg(o['t'], 0, acum)) return null;
  const t = o['t'];
  switch (o['fel']) {
    case 'actiune': {
      if (!cheiExact(o, ['fel', 't', 'id', 'de', 'rez'], ['n'])) return null;
      const { id: i, de, rez, n } = o;
      if (!id(i) || !din(SURSE, de) || typeof rez !== 'string' || !RE_REZULTAT.test(rez)) return null;
      if (n === undefined) return { fel: 'actiune', t, id: i, de, rez };
      return intreg(n, 1, REPETARI_MAX) ? { fel: 'actiune', t, id: i, de, rez, n } : null;
    }
    case 'fereastra':
      return cheiExact(o, ['fel', 't', 'id']) && din(FERESTRE, o['id']) ? { fel: 'fereastra', t, id: o['id'] } : null;
    case 'unealta': {
      const { id: i, de } = o;
      return cheiExact(o, ['fel', 't', 'id', 'de']) && id(i) && din(SURSE, de) ? { fel: 'unealta', t, id: i, de } : null;
    }
    case 'dialog': {
      const { id: i, rez } = o;
      return cheiExact(o, ['fel', 't', 'id', 'rez']) && id(i) && din(REZULTATE_DIALOG, rez) ? { fel: 'dialog', t, id: i, rez } : null;
    }
    case 'clic': {
      if (!cheiExact(o, ['fel', 't', 'id', 'de'], ['n'])) return null;
      const { id: i, de, n } = o;
      if (!id(i) || !din(SURSE, de)) return null;
      if (n === undefined) return { fel: 'clic', t, id: i, de };
      return intreg(n, 1, REPETARI_MAX) ? { fel: 'clic', t, id: i, de, n } : null;
    }
    case 'derulare':
    case 'zoom': {
      const { fel, de, n } = o;
      return cheiExact(o, ['fel', 't', 'de', 'n']) && din(SURSE, de) && intreg(n, 1, REPETARI_MAX) ? { fel, t, de, n } : null;
    }
    case 'calcul': {
      if (!cheiExact(o, ['fel', 't', 'id', 'ms', 'rez'], ['forme', 'octeti', 'format'])) return null;
      const { id: i, ms, rez, forme, octeti, format } = o;
      if (!din(CALCULE, i) || !treapta(TREPTE_MS, ms) || !din(REZULTATE_CALCUL, rez)) return null;
      // Formele doar la calculele CAM; octeții și formatul doar la import.
      if (forme !== undefined && (i === 'import' || !treapta(TREPTE_MARIME, forme))) return null;
      if (octeti !== undefined && (i !== 'import' || !treapta(TREPTE_MARIME, octeti))) return null;
      if (format !== undefined && (i !== 'import' || !din(FORMATE_IMPORT, format))) return null;
      return {
        fel: 'calcul', t, id: i, ms, rez, ...(forme === undefined ? {} : { forme }), ...(octeti === undefined ? {} : { octeti }),
        ...(format === undefined ? {} : { format }),
      };
    }
    case 'masina': {
      if (!cheiExact(o, ['fel', 't', 'id'], ['cod', 'cale'])) return null;
      const { id: i, cod, cale } = o;
      if (!din(EVENIMENTE_MASINA, i)) return null;
      // Codul doar la eroare și la alarmă; felul legăturii doar la legare.
      if (cod !== undefined && ((i !== 'eroare' && i !== 'alarma') || !intreg(cod, 0, COD_MAX))) return null;
      if (cale !== undefined && (i !== 'legata' || !din(CAI_MASINA, cale))) return null;
      return { fel: 'masina', t, id: i, ...(cod === undefined ? {} : { cod }), ...(cale === undefined ? {} : { cale }) };
    }
    case 'imprimanta': {
      if (!cheiExact(o, ['fel', 't', 'id'], ['cod'])) return null;
      const { id: i, cod } = o;
      if (!din(EVENIMENTE_IMPRIMANTA, i)) return null;
      if (cod !== undefined && (i !== 'eroare' || !intreg(cod, 0, COD_MAX))) return null;
      return { fel: 'imprimanta', t, id: i, ...(cod === undefined ? {} : { cod }) };
    }
    default: return null;
  }
}

/** Pură: contextul, cu toate câmpurile, din listele lor; null altfel. */
export function contextDin(x: unknown): ContextLot | null {
  const o = obiect(x);
  if (!o || !cheiExact(o, ['versiune', 'limba', 'aranjament', 'tema', 'ecran', 'browser', 'atingere', 'online'])) return null;
  const { versiune, limba, aranjament, tema, ecran, browser, atingere, online } = o;
  if (typeof versiune !== 'string' || !RE_VERSIUNE.test(versiune)) return null;
  if (typeof aranjament !== 'string' || !RE_ARANJAMENT.test(aranjament)) return null;
  if (!din(LIMBI_UTILIZARE, limba) || !din(TEME_UTILIZARE, tema) || !din(ECRANE, ecran) || !din(BROWSERE, browser)) return null;
  if (typeof atingere !== 'boolean' || typeof online !== 'boolean') return null;
  return { versiune, limba, aranjament, tema, ecran, browser, atingere, online };
}

/**
 * Pură: lotul primit, refăcut (serverul) sau judecat (proba clientului). Null dacă lotul nu se poate primi (sesiunea,
 * numărul, ceasul, contextul, prea multe evenimente, un câmp în plus); altfel lotul curat și câte evenimente s-au aruncat.
 */
export function lotDin(x: unknown): { readonly lot: Lot; readonly aruncate: number } | null {
  const o = obiect(x);
  if (!o || !cheiExact(o, ['sesiune', 'nr', 'acum', 'context', 'evenimente'])) return null;
  const { sesiune, nr, acum, evenimente } = o;
  if (typeof sesiune !== 'string' || !RE_SESIUNE.test(sesiune)) return null;
  if (!intreg(nr, 1, Number.MAX_SAFE_INTEGER) || !intreg(acum, 0, SESIUNE_MAX_MS)) return null;
  const context = contextDin(o['context']);
  if (!context || !Array.isArray(evenimente) || evenimente.length > EVENIMENTE_PE_LOT) return null;
  const curate = evenimente.map((e) => evenimentDin(e, acum)).filter((e): e is Eveniment => e !== null);
  return { lot: { sesiune, nr, acum, context, evenimente: curate }, aruncate: evenimente.length - curate.length };
}

/** Id-ul documentului unui lot: o reîncercare a aceluiași lot cade pe același document (care există deja). */
export const idLot = (sesiune: string, nr: number): string => `${sesiune}-${nr}`;

/** Pură: setările cerute (butonul „Salvează”, serverul): toate câmpurile, nimic în plus, în margini; null altfel. */
export function setariUtilizareCerute(x: unknown): SetariUtilizare | null {
  const o = obiect(x);
  if (!o || !cheiExact(o, CAMPURI_SETARI)) return null;
  const { colectare, clicuri } = o;
  if (typeof colectare !== 'boolean' || typeof clicuri !== 'boolean') return null;
  const n: Partial<Record<CampNumeric, number>> = {};
  for (const k of CAMPURI_NUMERICE) {
    const v = o[k];
    const [min, max] = MARGINI_UTILIZARE[k];
    if (!intreg(v, min, max)) return null;
    n[k] = v;
  }
  return { colectare, clicuri, lotMinute: n.lotMinute ?? 0, zileEvenimente: n.zileEvenimente ?? 0, zileSume: n.zileSume ?? 0, pasiEroare: n.pasiEroare ?? 0 };
}

/**
 * Pură: documentul citit (sau lipsă): fiecare câmp bun, sau implicitul lui (o stricăciune nu oprește colectarea); versiunea
 * (0 = fără document sau fără versiune bună).
 */
export function setariUtilizareDin(x: unknown): { readonly setari: SetariUtilizare; readonly versiune: number } {
  const o = obiect(x) ?? {};
  const bool = (k: 'colectare' | 'clicuri'): boolean => (typeof o[k] === 'boolean' ? o[k] : SETARI_UTILIZARE_IMPLICITE[k]);
  const nr = (k: CampNumeric): number => {
    const v = o[k];
    const [min, max] = MARGINI_UTILIZARE[k];
    return intreg(v, min, max) ? v : SETARI_UTILIZARE_IMPLICITE[k];
  };
  const v = o['versiune'];
  return {
    setari: {
      colectare: bool('colectare'), clicuri: bool('clicuri'), lotMinute: nr('lotMinute'), zileEvenimente: nr('zileEvenimente'),
      zileSume: nr('zileSume'), pasiEroare: nr('pasiEroare'),
    },
    versiune: intreg(v, 1, Number.MAX_SAFE_INTEGER) ? v : 0,
  };
}

export const aceleasiSetariUtilizare = (a: SetariUtilizare, b: SetariUtilizare): boolean => CAMPURI_SETARI.every((k) => a[k] === b[k]);

export const setariPublice = (s: SetariUtilizare): SetariPublice => ({
  colectare: s.colectare, clicuri: s.clicuri, lotMinute: s.lotMinute, pasiEroare: s.pasiEroare,
});

/** Momentul ștergerii singure (TTL) al unui lot scris acum: zilele din setări, de la scriere. */
export const expiraUtilizareLa = (acumMs: number, zile: number): number => acumMs + zile * 86_400_000;
