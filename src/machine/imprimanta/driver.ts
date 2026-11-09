/**
 * Contractul driverelor de imprimantă (ADR 0192 §A), fără rețea și fără timp: starea comună, comenzile, capabilitățile și pașii
 * unei comenzi. Un driver citește cadrele imprimantei lui în starea comună și scrie fiecare comandă comună în protocolul ei;
 * legătura (`sesiune.ts`) e comună driverelor de același transport (azi WebSocket cu cadre text). Fereastra arată doar ce
 * poate imprimanta legată (`capabilitati`). Azi, un singur driver: familia Creality K1 (`creality.ts`).
 */

/** Un fișier din imprimantă, din lista ei: numele, calea și ce mai știe ea despre el. */
export type FisierImprimanta = {
  readonly nume: string;
  readonly cale: string;
  /** Timpul estimat de feliator, în secunde. */
  readonly timp: number | null;
  readonly material: string | null;
  /** Mărimea, în octeți (lista K1C 2025 o are). */
  readonly marime: number | null;
};

/** Ventilatoarele știute: al piesei, al carcasei și cel lateral (auxiliar). Un driver nou poate aduce altele (ADR 0192 §A.2). */
export const VENTILATOARE = ['piesa', 'carcasa', 'lateral'] as const;
export type IdVentilator = (typeof VENTILATOARE)[number];

/** Încălzitoarele cu o țintă de comandat. Camera încălzită intră odată cu primul driver care o are. */
export type Incalzitor = 'duza' | 'pat';

/**
 * O piesă de pe placă, cum o spune imprimanta (`EXCLUDE_OBJECT_DEFINE` al fișierului, felia 3.6q, ADR 0193 §B.9): numele (Klipper
 * îl scrie cu majuscule), centrul și conturul, în mm (null / gol: nespuse).
 */
export type PiesaPlaca = {
  readonly nume: string;
  readonly centru: readonly [number, number] | null;
  readonly contur: readonly (readonly [number, number])[];
};

/** Ce se știe despre imprimantă: ultima valoare primită a fiecărui câmp (null: încă necunoscut, sau nespus de ea). */
export type Imprimanta = {
  readonly model: string | null;
  readonly nume: string | null;
  readonly firmware: string | null;
  /** Codul stării, cum îl trimite protocolul (K1: `state`); îl citește doar driverul lui (`lucrare`). */
  readonly cod: number | null;
  /** Fișierul lucrării: calea întreagă (pe K1C) sau doar numele. */
  readonly fisier: string | null;
  readonly progres: number | null;
  /** Timpul trecut și cel rămas, în secunde. */
  readonly trecut: number | null;
  readonly ramas: number | null;
  readonly strat: number | null;
  readonly straturi: number | null;
  /** Temperaturile, în °C: duza și patul cu țintele și maximele lor, aerul din carcasă. */
  readonly duza: number | null;
  readonly duzaTinta: number | null;
  readonly duzaMax: number | null;
  readonly pat: number | null;
  readonly patTinta: number | null;
  readonly patMax: number | null;
  readonly carcasa: number | null;
  /** Lumina: aprinsă sau stinsă. */
  readonly lumina: boolean | null;
  /** Ventilatoarele, în procente: doar cele pe care imprimanta le spune. */
  readonly ventilatoare: Readonly<Partial<Record<IdVentilator, number>>>;
  /** Viteza și debitul, în procente din cele ale fișierului. */
  readonly viteza: number | null;
  readonly debit: number | null;
  /** Axele știute, după homing, ca „XYZ”, „XY” sau „” (niciuna). */
  readonly axe: string | null;
  /** Imprimanta lucrează la o comandă a ei (homing-ul, de exemplu). */
  readonly ocupata: boolean | null;
  /** Codul unei erori semnalate (null: niciuna) și cheia ei. */
  readonly eroare: number | null;
  readonly cheieEroare: number | null;
  /** 1–99 cât își face verificările. */
  readonly autotest: number | null;
  /** Piesele de pe placă, cele anulate (după nume) și piesa la care lucrează acum (null: niciuna sau nespusă), felia 3.6q. */
  readonly piese: readonly PiesaPlaca[] | null;
  readonly anulate: readonly string[] | null;
  readonly piesaAcum: string | null;
  /**
   * Poziția duzei pe X și Y, în mm, cum o spune imprimanta (fără înălțime: K1C trimite Z „00” cât imprimă, ADR 0193); cât se
   * pregătește, poate ieși din pat, deci fereastra o arată doar cât imprimă și doar în pat.
   */
  readonly pozitie: { readonly x: number; readonly y: number } | null;
  /** Filamentul folosit de lucrarea de acum, în mm: mișcarea extruderului cerută de fișier (nu se schimbă cu debitul). */
  readonly filament: number | null;
};

export const IMPRIMANTA_NECUNOSCUTA: Imprimanta = {
  model: null, nume: null, firmware: null, cod: null, fisier: null, progres: null, trecut: null, ramas: null, strat: null,
  straturi: null, duza: null, duzaTinta: null, duzaMax: null, pat: null, patTinta: null, patMax: null, carcasa: null, lumina: null,
  ventilatoare: {}, viteza: null, debit: null, axe: null, ocupata: null, eroare: null, cheieEroare: null, autotest: null,
  piese: null, anulate: null, piesaAcum: null, pozitie: null, filament: null,
};

/** Bucățile de stare intră peste cea știută; ventilatoarele, fiecare la locul lui (un cadru poate aduce doar unul). */
export const aplica = (i: Imprimanta, s: Partial<Imprimanta>): Imprimanta => (s.ventilatoare === undefined
  ? { ...i, ...s }
  : { ...i, ...s, ventilatoare: { ...i.ventilatoare, ...s.ventilatoare } });

/** Starea lucrării, ca s-o arate fereastra (eroarea are cardul ei). */
export type StareLucrare = 'necunoscuta' | 'libera' | 'pregatire' | 'imprima' | 'pauza' | 'oprita' | 'gata' | 'autotest';

/** Imprimanta e liberă: fără lucrare, sau după una încheiată sau oprită. Atunci se poate porni un fișier, preîncălzi, face homing. */
export const esteLibera = (s: StareLucrare): boolean => s === 'libera' || s === 'gata' || s === 'oprita';

/** Ce comenzi au rost acum. Pornirea, doar cu imprimanta liberă. */
export const sePoatePauza = (s: StareLucrare): boolean => s === 'imprima';
export const sePoateRelua = (s: StareLucrare): boolean => s === 'pauza';
export const sePoateOpri = (s: StareLucrare): boolean => s === 'imprima' || s === 'pauza' || s === 'pregatire';
export const sePoatePorni = esteLibera;
/** Viteza și debitul țin de lucrarea de acum: doar cât imprimă sau stă în pauză. */
export const sePoateRegla = (s: StareLucrare): boolean => s === 'imprima' || s === 'pauza';

/** Comenzile comune (ADR 0192 §A.3): fiecare driver le scrie în protocolul imprimantei lui, sau le refuză. */
export type ComandaImprimanta =
  | { readonly fel: 'pauza' }
  | { readonly fel: 'reia' }
  | { readonly fel: 'opreste' }
  | { readonly fel: 'porneste'; readonly cale: string }
  | { readonly fel: 'lumina'; readonly aprinsa: boolean }
  | { readonly fel: 'ventilator'; readonly id: IdVentilator; readonly procent: number }
  | { readonly fel: 'viteza'; readonly procent: number }
  | { readonly fel: 'debit'; readonly procent: number }
  | { readonly fel: 'tinta'; readonly incalzitor: Incalzitor; readonly grade: number }
  | { readonly fel: 'homing' }
  /** Felia 3.6r (ADR 0193 §C): o singură piesă de pe placă nu se mai imprimă, iar restul merg mai departe. */
  | { readonly fel: 'anuleazaPiesa'; readonly nume: string };

/**
 * Ce comenzi noi au rost în starea lucrării (sesiunea le refuză pe celelalte): homing-ul, doar cu imprimanta liberă (ADR 0192
 * §D.17); viteza, debitul și anularea unei piese, doar cât imprimă sau stă în pauză. Pauza, reluarea, oprirea și pornirea le
 * judecă fereastra, ca în 3.6g; lumina, ventilatoarele și țintele se pot schimba oricând (ca de pe ecranul imprimantei).
 */
export function comandaPermisa(c: ComandaImprimanta, s: StareLucrare): boolean {
  if (c.fel === 'homing') return esteLibera(s);
  if (c.fel === 'viteza' || c.fel === 'debit' || c.fel === 'anuleazaPiesa') return sePoateRegla(s);
  return true;
}

/** De ce nu se poate anula o piesă (felia 3.6r): nu e pe placă, e deja anulată, e ultima rămasă, numele ei nu se poate trimite. */
export type MotivAnulare = 'necunoscuta' | 'anulata' | 'ultima' | 'nume';

/** Numele unei piese care poate pleca într-o comandă: litere, cifre, `_`, `.` și `-` (ca OrcaSlicer și cvs2), cel mult 100. */
export const RE_NUME_PIESA = /^[A-Za-z0-9_.-]{1,100}$/;

/**
 * Se poate anula piesa (ADR 0193 §C.11–12)? Doar una din lista imprimantei, încă neanulată, nu ultima rămasă (pentru ea:
 * Oprește) și doar cu un nume sigur; null: da. Numele se compară fără majuscule (Klipper le scrie cu).
 */
export function piesaAnulabila(i: Imprimanta, nume: string): MotivAnulare | null {
  const sus = nume.toUpperCase();
  const piese = i.piese ?? [];
  if (!piese.some((p) => p.nume.toUpperCase() === sus)) return 'necunoscuta';
  const anulate = new Set((i.anulate ?? []).map((x) => x.toUpperCase()));
  if (anulate.has(sus)) return 'anulata';
  if (piese.filter((p) => !anulate.has(p.nume.toUpperCase())).length <= 1) return 'ultima';
  return RE_NUME_PIESA.test(nume) ? null : 'nume';
}

/** Un interval de întregi, cu capetele. */
export type Interval = { readonly min: number; readonly max: number };

/** Un întreg din interval; altfel null (o comandă cu el se refuză: nu pleacă nimic). */
export const intregIn = (v: number, iv: Interval): number | null => (Number.isInteger(v) && v >= iv.min && v <= iv.max ? v : null);

/** Ce poate imprimanta legată (ADR 0192 §A.4): din driver și din ce a spus ea. Fereastra arată doar comenzile de aici. */
export type Capabilitati = {
  readonly lumina: boolean;
  readonly ventilatoare: readonly IdVentilator[];
  /** Viteza și debitul, în procente (null: imprimanta nu le are). */
  readonly viteza: Interval | null;
  readonly debit: Interval | null;
  /** Încălzitoarele cu țintă de comandat, cu maximul lor (°C). */
  readonly tinte: readonly { readonly incalzitor: Incalzitor; readonly max: number }[];
  readonly homing: boolean;
  /** Lista fișierelor din imprimantă și trimiterea unui fișier în ea. */
  readonly fisiere: boolean;
  readonly trimitere: boolean;
  /** Anularea unei singure piese de pe placă, cât imprimă (felia 3.6r). */
  readonly anulare: boolean;
};

/** Ținta raportată a unui încălzitor. */
export const tintaDe = (i: Imprimanta, inc: Incalzitor): number | null => (inc === 'duza' ? i.duzaTinta : i.patTinta);

/**
 * Un pas al unei comenzi: un text de trimis, sau o așteptare: cel puțin `minMs`, apoi până când `gata(starea)`, cel mult `maxMs`
 * (atunci pasul următor pleacă oricum). Homing-ul K1 are trei: X și Y, așteptarea, Z.
 */
export type Pas =
  | { readonly trimite: string }
  | { readonly gata: (i: Imprimanta) => boolean; readonly minMs: number; readonly maxMs: number };

/** Un cadru citit de driver. */
export type CadruCitit = {
  /** Arată ca imprimanta driverului (un câmp știut al ei): primul cadru așa leagă legătura. */
  readonly recunoscut: boolean;
  readonly stare: Partial<Imprimanta>;
  /** Lista fișierelor, dacă a adus-o (null: nu). */
  readonly fisiere: readonly FisierImprimanta[] | null;
  /** De trimis pe loc, ca legătura să rămână vie (K1: `ok` la bătaia inimii); null: nimic. */
  readonly raspuns: string | null;
};

/** Un driver pe un transport cu cadre text (WebSocket): familia K1 azi; Moonraker și Elegoo SDCP mai târziu (ADR 0192 §E). */
export interface DriverText {
  /** Id-ul din lista driverelor (`drivere.ts`), ținut cu imprimanta. */
  readonly id: string;
  /** Portul din fabrică al protocolului. */
  readonly port: number;
  /** Citirile trimise la fiecare deschidere și la „Reîmprospătează”: singurele, cu răspunsurile de menținere, fără un clic. */
  readonly citiri: readonly string[];
  citeste(text: string): CadruCitit;
  lucrare(i: Imprimanta): StareLucrare;
  capabilitati(i: Imprimanta): Capabilitati;
  /** Comanda, ca pași în protocolul imprimantei; null: refuzată (necunoscută driverului, în afara intervalului). */
  codifica(c: ComandaImprimanta, i: Imprimanta): readonly Pas[] | null;
  /** Imprimanta închide legătura imediat după o pornire (K1): închiderea de atunci e așteptată. */
  readonly inchideDupaPornire: boolean;
}
