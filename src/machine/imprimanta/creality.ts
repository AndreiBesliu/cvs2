/**
 * Protocolul imprimantelor Creality din familia K1 (K1, K1C, K1C 2025, K1 Max, K1 SE), pe WebSocket-ul de pe portul 9999
 * (ADR 0190 §A), fără rețea și fără timp. Sursele: gazda „CrealityPrint” din OrcaSlicer (04.11.2026) și integrarea Home
 * Assistant `ha_creality_ws`, cu capturi de pe o K1C (25.10.2026).
 *
 * Cadrele sunt text JSON: familia K1 nu primește cadre binare. Imprimanta trimite singură, periodic, o bătaie a inimii
 * (`{"ModeCode":"heart_beat",…}`), la care clientul răspunde `ok` (text simplu, nu JSON), altfel ea închide legătura; și starea,
 * pe bucăți: doar câmpurile schimbate, cu numerele adesea ca text („220.000000”). Cererile și comenzile sunt
 * `{"method":"get"|"set","params":{…}}`. Pe 9999 nu e nicio parolă: oricine din rețea poate comanda imprimanta.
 */

export const PORT_CREALITY = 9999;
/** Răspunsul la bătaia inimii: text simplu. */
export const RASPUNS_INIMA = 'ok';
/** Unde ține familia K1 fișierele G-code (OrcaSlicer: `/usr/data` la K1, `/mnt/UDISK` la K2). */
export const DIR_GCODE = '/usr/data/printer_data/gcodes/';

/** Ce se știe despre imprimantă: ultima valoare primită a fiecărui câmp (null: încă necunoscut). */
export type Imprimanta = {
  readonly model: string | null;
  readonly nume: string | null;
  /** Versiunea firmware-ului, din `modelVersion` („printer sw ver:…”). */
  readonly firmware: string | null;
  /** `state`, cum îl trimite imprimanta: 1 imprimă, 5 pauză, 4 oprită, 7 oprirea în curs, 9 pornirea, 0 pregătirea. */
  readonly cod: number | null;
  /** `printFileName`: calea întreagă (pe K1C) sau doar numele. */
  readonly fisier: string | null;
  readonly progres: number | null;
  /** Timpul trecut și cel rămas, în secunde. */
  readonly trecut: number | null;
  readonly ramas: number | null;
  readonly strat: number | null;
  readonly straturi: number | null;
  /** Temperaturile, în °C: duza și patul cu țintele lor, aerul din carcasă. */
  readonly duza: number | null;
  readonly duzaTinta: number | null;
  readonly pat: number | null;
  readonly patTinta: number | null;
  readonly carcasa: number | null;
  /** `err.errcode` (0 = fără eroare, deci null) și `err.key`. */
  readonly eroare: number | null;
  readonly cheieEroare: number | null;
  /** `withSelfTest`: 1–99 cât își face verificările. */
  readonly autotest: number | null;
};

export const IMPRIMANTA_NECUNOSCUTA: Imprimanta = {
  model: null, nume: null, firmware: null, cod: null, fisier: null, progres: null, trecut: null, ramas: null, strat: null,
  straturi: null, duza: null, duzaTinta: null, pat: null, patTinta: null, carcasa: null, eroare: null, cheieEroare: null,
  autotest: null,
};

type CampNumeric = 'cod' | 'progres' | 'trecut' | 'ramas' | 'strat' | 'straturi' | 'duza' | 'duzaTinta' | 'pat' | 'patTinta' | 'carcasa' | 'autotest';

/** Câmpurile numerice ale stării, cu numele lor din protocol. `dProgress` e rezerva lui `printProgress`. */
const NUMERE: readonly (readonly [string, CampNumeric])[] = [
  ['state', 'cod'], ['printProgress', 'progres'], ['printJobTime', 'trecut'], ['printLeftTime', 'ramas'], ['layer', 'strat'],
  ['TotalLayer', 'straturi'], ['nozzleTemp', 'duza'], ['targetNozzleTemp', 'duzaTinta'], ['bedTemp0', 'pat'],
  ['targetBedTemp0', 'patTinta'], ['boxTemp', 'carcasa'], ['withSelfTest', 'autotest'],
];
const TEXTE: readonly (readonly [string, 'model' | 'nume' | 'fisier'])[] = [['model', 'model'], ['hostname', 'nume'], ['printFileName', 'fisier']];

/**
 * Un număr, cum îl scrie imprimanta: număr JSON sau text („31.030000”, „0”, „-2.5”). Nu „007” sau „ 42”: un zero în față sau
 * spații înseamnă un identificator care doar arată a număr (aceeași regulă ca integrarea Home Assistant).
 */
export function numar(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v)) return Number(v);
  return null;
}

/**
 * Versiunea firmware-ului, din `modelVersion` („printer hw ver:…;printer sw ver:1.3.3.5;DWIN hw ver:…”). K1C 2025 (V1.0.0.26,
 * transcrierea owner-ului din 07.11) lasă `printer sw ver` gol și o pune în `DWIN sw ver` („V1.0.0.26.20251024S”).
 */
export function firmwareDin(text: string): string | null {
  const v: Record<string, string> = {};
  for (const bucata of text.split(';')) {
    const k = bucata.indexOf(':');
    if (k >= 0) v[bucata.slice(0, k).trim().toLowerCase()] = bucata.slice(k + 1).trim();
  }
  return v['printer sw ver'] || v['dwin sw ver'] || null;
}

/** Un fișier din imprimantă, din lista ei (`retGcodeFileInfo2` sau `retGcodeFileInfo`): numele, calea și ce mai știe ea despre el. */
export type FisierImprimanta = {
  readonly nume: string;
  readonly cale: string;
  /** Timpul estimat de feliator (`timeCost`), în secunde. */
  readonly timp: number | null;
  readonly material: string | null;
  /** Mărimea, în octeți (lista K1C 2025 o are). */
  readonly marime: number | null;
};

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

/** Calea unui fișier din directorul G-code al imprimantei, fără `..` și fără caractere de control; altfel null. */
function caleSigura(cale: string): string | null {
  if (!cale.startsWith(DIR_GCODE)) return null;
  const rest = cale.slice(DIR_GCODE.length);
  // Caracterele de control (sub 0x20 și 0x7f) n-au ce căuta într-o cale.
  if (rest === '' || /[\u0000-\u001f\u007f]/.test(rest)) return null;
  if (rest.split('/').some((s) => s === '' || s === '.' || s === '..')) return null;
  return cale;
}

/** Numele simplu al unui fișier (fără `/`, `\`, `..` și caractere de control); altfel null. */
export function numeSigur(nume: string): string | null {
  if (nume === '' || nume === '.' || nume === '..' || /[/\\\u0000-\u001f\u007f]/.test(nume) || nume.length > 255) return null;
  return nume;
}

/** Numele unui fișier, din calea lui (sau numele, dacă e doar el). */
export const numeDin = (cale: string): string => cale.slice(cale.lastIndexOf('/') + 1);

/** O intrare a listei; null dacă n-are un nume bun (atunci rândul nu se arată și nu se poate porni). */
function fisierDin(o: unknown): FisierImprimanta | null {
  if (typeof o !== 'object' || o === null) return null;
  const r = o as Record<string, unknown>;
  const cale = text(r['path']);
  const nume = text(r['name']) ?? (cale ? numeDin(cale) : null);
  if (nume === null || numeSigur(nume) === null) return null;
  const caleBuna = cale !== null ? caleSigura(cale) : null;
  return { nume, cale: caleBuna ?? `${DIR_GCODE}${nume}`, timp: numar(r['timeCost']), material: text(r['material']), marime: numar(r['size']) };
}

/**
 * Lista ca text, din firmware-ul K1C 2025 (V1.0.0.26, transcrierea owner-ului din 07.11): `retGcodeFileInfo.fileInfo`, intrările
 * despărțite de `;`, fiecare `director:nume:mărime:strat:dată:filament:miniatură`. Câmpurile se citesc din dreapta, ca un nume
 * cu `:` să rămână întreg (numele au și spații: „Delta filament barrel base_Hyper PLA_49m.gcode”).
 */
function fisiereDinText(t: string): FisierImprimanta[] {
  const out: FisierImprimanta[] = [];
  for (const rand of t.split(';')) {
    // O intrare scurtă (sau golul de după ultimul `;`) dă un nume gol, deci se sare mai jos.
    const p = rand.split(':');
    const nume = p.slice(1, -5).join(':');
    const cale = `${p[0]}/${nume}`;
    // Directorul e scris pe fiecare intrare: una din afara directorului G-code se sare (nu se mută după nume, ca la lista veche).
    const f = caleSigura(cale) === null ? null : fisierDin({ name: nume, path: cale, size: p[p.length - 5] });
    if (f !== null) out.push(f);
  }
  return out;
}

/** Ce aduce un cadru: bătaia inimii (cere `ok`), câmpurile stării, lista fișierelor; `json` fals: text care nu e un obiect JSON. */
export type Cadru = {
  readonly json: boolean;
  readonly inima: boolean;
  readonly stare: Partial<Imprimanta>;
  readonly fisiere: readonly FisierImprimanta[] | null;
};

const NIMIC: Cadru = { json: false, inima: false, stare: {}, fisiere: null };

/** Citește un cadru text al imprimantei. Câmpurile necunoscute rămân pe dinafară; un câmp cu altă formă nu schimbă nimic. */
export function citesteCadru(t: string): Cadru {
  let o: unknown;
  try {
    o = JSON.parse(t);
  } catch {
    return NIMIC;
  }
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return NIMIC;
  const r = o as Record<string, unknown>;
  const stare: { -readonly [K in keyof Imprimanta]?: Imprimanta[K] } = {};
  for (const [cheie, camp] of NUMERE) {
    const v = numar(r[cheie]);
    if (v !== null) stare[camp] = v;
  }
  if (stare.progres === undefined) {
    const v = numar(r['dProgress']);
    if (v !== null) stare.progres = v;
  }
  for (const [cheie, camp] of TEXTE) {
    const v = r[cheie];
    // `printFileName` gol: nicio lucrare.
    if (typeof v === 'string') stare[camp] = v.trim() === '' ? null : v;
  }
  if (typeof r['modelVersion'] === 'string') stare.firmware = firmwareDin(r['modelVersion']);
  const err = r['err'];
  const cod = typeof err === 'object' && err !== null ? numar((err as Record<string, unknown>)['errcode']) : numar(err);
  if (cod !== null) {
    stare.eroare = cod === 0 ? null : cod;
    stare.cheieEroare = cod === 0 || typeof err !== 'object' || err === null ? null : numar((err as Record<string, unknown>)['key']);
  }
  const lista = r['retGcodeFileInfo2'];
  const textLista = (r['retGcodeFileInfo'] as { fileInfo?: unknown } | null | undefined)?.fileInfo;
  const fisiere = Array.isArray(lista) ? lista.map(fisierDin).filter((f): f is FisierImprimanta => f !== null)
    : typeof textLista === 'string' ? fisiereDinText(textLista) : null;
  return { json: true, inima: r['ModeCode'] === 'heart_beat', stare, fisiere };
}

/** Cadrul arată ca al unei imprimante Creality: bătaia inimii sau măcar un câmp știut al stării. */
export const esteCreality = (c: Cadru): boolean => c.inima || Object.keys(c.stare).length > 0;

export const aplica = (i: Imprimanta, s: Partial<Imprimanta>): Imprimanta => ({ ...i, ...s });

/** Starea lucrării, ca s-o arate panoul (fără eroare: codul ei are cardul lui, și uneori rămâne pus după ce a trecut). */
export type StareLucrare = 'necunoscuta' | 'libera' | 'pregatire' | 'imprima' | 'pauza' | 'oprita' | 'gata' | 'autotest';

/**
 * Starea, ca integrarea Home Assistant (capturile K1C): cu un fișier, 100 % e „gata”, afară de K1C care arată 100 cu timp rămas
 * (apoi 99, abia apoi încheie); 5 pauză, 4 oprită, 1 imprimă, iar 0, 7 (oprirea în curs) și 9 (pornirea, sub o secundă)
 * pregătire. Numele ultimului fișier și 100 % rămân după final: „gata” până la lucrarea următoare.
 */
export function stareLucrare(i: Imprimanta): StareLucrare {
  if (i.cod === null && i.fisier === null && i.progres === null) return 'necunoscuta';
  if (i.autotest !== null && i.autotest >= 1 && i.autotest <= 99) return 'autotest';
  if (i.fisier !== null) {
    const finalizare = (i.cod === 1 || i.cod === 5) && i.ramas !== null && i.ramas > 0;
    if ((i.progres ?? -1) >= 100 && !finalizare) return 'gata';
    if (i.cod === 5) return 'pauza';
    if (i.cod === 4) return 'oprita';
    if (i.cod === 1) return 'imprima';
    if (i.cod === 0 || i.cod === 7 || i.cod === 9) return 'pregatire';
  }
  return 'libera';
}

/** Ce comenzi au rost acum. Pornirea, doar cu imprimanta liberă (sau după o lucrare încheiată sau oprită). */
export const sePoatePauza = (s: StareLucrare): boolean => s === 'imprima';
export const sePoateRelua = (s: StareLucrare): boolean => s === 'pauza';
export const sePoateOpri = (s: StareLucrare): boolean => s === 'imprima' || s === 'pauza' || s === 'pregatire';
export const sePoatePorni = (s: StareLucrare): boolean => s === 'libera' || s === 'gata' || s === 'oprita';

const cerere = (method: 'get' | 'set', params: Readonly<Record<string, unknown>>): string => JSON.stringify({ method, params });

/** Toată starea (`ReqPrinterPara`) și lista fișierelor: doar citiri. */
export const CERERE_STARE = cerere('get', { ReqPrinterPara: 1 });
export const CERERE_FISIERE = cerere('get', { reqGcodeFile: 1 });
export const COMANDA_PAUZA = cerere('set', { pause: 1 });
export const COMANDA_REIA = cerere('set', { pause: 0 });
export const COMANDA_OPRESTE = cerere('set', { stop: 1 });

/** Pornirea unui fișier din imprimantă (`opGcodeFile`, cu `printprt:` în față); null pentru o cale în afara directorului G-code. */
export function comandaPornire(cale: string): string | null {
  const c = caleSigura(cale);
  return c === null ? null : cerere('set', { opGcodeFile: `printprt:${c}` });
}

/** Cererile de citire: singurele pe care legătura le trimite fără un clic al omului (pe lângă `ok`). */
export const CITIRI: ReadonlySet<string> = new Set([CERERE_STARE, CERERE_FISIERE]);
