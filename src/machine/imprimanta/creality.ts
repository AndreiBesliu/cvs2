/**
 * Protocolul imprimantelor Creality din familia K1 (K1, K1C, K1C 2025, K1 Max, K1 SE), pe WebSocket-ul de pe portul 9999
 * (ADR 0190 §A), fără rețea și fără timp. Sursele: gazda „CrealityPrint” din OrcaSlicer (04.11.2026) și integrarea Home
 * Assistant `ha_creality_ws`, cu capturi de pe o K1C (25.10.2026).
 *
 * Cadrele sunt text JSON: familia K1 nu primește cadre binare. Imprimanta trimite singură, periodic, o bătaie a inimii
 * (`{"ModeCode":"heart_beat",…}`), la care clientul răspunde `ok` (text simplu, nu JSON), altfel ea închide legătura; și starea,
 * pe bucăți: doar câmpurile schimbate, cu numerele adesea ca text („220.000000”). Cererile și comenzile sunt
 * `{"method":"get"|"set","params":{…}}`. Pe 9999 nu e nicio parolă: oricine din rețea poate comanda imprimanta.
 *
 * Din 3.6o, driverul `creality-k1` (ADR 0192): starea comună (`driver.ts`), capabilitățile și comenzile din timpul imprimării
 * (lumina, ventilatoarele, viteza, debitul, țintele, homing-ul), cu numele din integrarea Home Assistant.
 */
import {
  intregIn, RE_NUME_PIESA, VENTILATOARE, type Capabilitati, type ComandaImprimanta, type DriverText, type FisierImprimanta, type Imprimanta,
  type Interval, type IdVentilator, type Pas, type PiesaPlaca, type StareLucrare,
} from './driver.ts';

export const PORT_CREALITY = 9999;
/** Răspunsul la bătaia inimii: text simplu. */
export const RASPUNS_INIMA = 'ok';
/** Unde ține familia K1 fișierele G-code (OrcaSlicer: `/usr/data` la K1, `/mnt/UDISK` la K2). */
export const DIR_GCODE = '/usr/data/printer_data/gcodes/';

type CampNumeric = 'cod' | 'progres' | 'trecut' | 'ramas' | 'strat' | 'straturi' | 'duza' | 'duzaTinta' | 'duzaMax' | 'pat' | 'patTinta'
  | 'patMax' | 'carcasa' | 'viteza' | 'debit' | 'autotest';

/**
 * Câmpurile numerice ale stării, cu numele lor din protocol. `dProgress` e rezerva lui `printProgress`. `state`: 1 imprimă, 5
 * pauză, 4 oprită, 7 oprirea în curs, 9 pornirea, 0 pregătirea; `withSelfTest`: 1–99 cât își face verificările.
 */
const NUMERE: readonly (readonly [string, CampNumeric])[] = [
  ['state', 'cod'], ['printProgress', 'progres'], ['printJobTime', 'trecut'], ['printLeftTime', 'ramas'], ['layer', 'strat'],
  ['TotalLayer', 'straturi'], ['nozzleTemp', 'duza'], ['targetNozzleTemp', 'duzaTinta'], ['maxNozzleTemp', 'duzaMax'], ['bedTemp0', 'pat'],
  ['targetBedTemp0', 'patTinta'], ['maxBedTemp', 'patMax'], ['boxTemp', 'carcasa'], ['curFeedratePct', 'viteza'],
  ['curFlowratePct', 'debit'], ['withSelfTest', 'autotest'],
];

/** Ventilatoarele, în procente, cu canalul lor `M106` (integrarea Home Assistant): 0 al piesei, 1 al carcasei, 2 cel lateral. */
const VENTILATOARE_K1: Readonly<Record<IdVentilator, { readonly camp: string; readonly canal: number }>> = {
  piesa: { camp: 'modelFanPct', canal: 0 }, carcasa: { camp: 'caseFanPct', canal: 1 }, lateral: { camp: 'auxiliaryFanPct', canal: 2 },
};

/** Axele știute, din `autohome` („X:1 Y:1 Z:0”: X și Y, nu Z), ca „XY”; null pentru un text de altă formă. */
export function axeDin(t: string): string | null {
  const m = /^\s*X:([01])\s+Y:([01])\s+Z:([01])\s*$/.exec(t);
  return m === null ? null : ['X', 'Y', 'Z'].filter((_, k) => m[k + 1] === '1').join('');
}
const TEXTE: readonly (readonly [string, 'model' | 'nume' | 'fisier'])[] = [['model', 'model'], ['hostname', 'nume'], ['printFileName', 'fisier']];

/** Cel mult atâtea piese și puncte pe un contur: un cadru stricat sau uriaș nu umple fereastra (felia 3.6q). */
export const MAX_PIESE = 64;
export const MAX_PUNCTE_CONTUR = 256;

/** O listă venită ca text JSON în JSON („[{…}]”, cum trimite K1C cadrul `exclude_object`) sau ca listă; null: altceva. */
function listaJson(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return null;
  try {
    const x = JSON.parse(v) as unknown;
    return Array.isArray(x) ? x : null;
  } catch {
    return null;
  }
}

/** Un punct `[x, y]`, în mm, dacă amândouă sunt numere finite, rezonabile. */
function punctDin(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const [x, y] = v as unknown[];
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) < 1e5 && Math.abs(y) < 1e5
    ? [x, y] : null;
}

/** O piesă din `objects`: un nume (fără caractere de control, cel mult 200), centrul și conturul, cât sunt bune. */
function piesaDin(o: unknown): PiesaPlaca | null {
  if (typeof o !== 'object' || o === null) return null;
  const r = o as Record<string, unknown>;
  const nume = r['name'];
  if (typeof nume !== 'string' || nume.trim() === '' || nume.length > 200 || /[\x00-\x1f\x7f]/.test(nume)) return null;
  const poligon = r['polygon'];
  const contur = Array.isArray(poligon) ? poligon.slice(0, MAX_PUNCTE_CONTUR).map(punctDin).filter((p): p is [number, number] => p !== null) : [];
  return { nume, centru: punctDin(r['center']), contur };
}

/** Poziția din `curPosition` („X:102 Y:104 Z:00”; „X:-124 Y:10 Z:05” cât se pregătește): X și Y; null pentru alt text. */
export function pozitieDin(t: string): { readonly x: number; readonly y: number } | null {
  const m = /^\s*X:(-?\d+(?:\.\d+)?)\s+Y:(-?\d+(?:\.\d+)?)(?:\s+Z:-?\d+(?:\.\d+)?)?\s*$/.exec(t);
  return m === null ? null : { x: Number(m[1]), y: Number(m[2]) };
}

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

const text =(v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

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
  // Lumina (`lightSw`, doar 0 / 1), ventilatoarele (%), „ocupată” (`deviceState` 7: homing-ul în curs) și axele știute.
  const lumina = numar(r['lightSw']);
  if (lumina !== null) stare.lumina = lumina > 0;
  const vent: { -readonly [K in IdVentilator]?: number } = {};
  for (const id of VENTILATOARE) {
    const v = numar(r[VENTILATOARE_K1[id].camp]);
    if (v !== null) vent[id] = v;
  }
  if (Object.keys(vent).length > 0) stare.ventilatoare = vent;
  const ocupata = numar(r['deviceState']);
  if (ocupata !== null) stare.ocupata = ocupata === 7;
  if (typeof r['autohome'] === 'string') {
    const axe = axeDin(r['autohome']);
    if (axe !== null) stare.axe = axe;
  }
  const err = r['err'];
  const cod = typeof err === 'object' && err !== null ? numar((err as Record<string, unknown>)['errcode']) : numar(err);
  if (cod !== null) {
    stare.eroare = cod === 0 ? null : cod;
    stare.cheieEroare = cod === 0 || typeof err !== 'object' || err === null ? null : numar((err as Record<string, unknown>)['key']);
  }
  // Piesele de pe placă (cadrul `exclude_object` al lui Klipper, felia 3.6q): listele, ca text JSON în JSON; piesa de acum, „”
  // fiind niciuna. Poziția duzei și filamentul folosit vin cu starea, la ~3 s cât imprimă (transcrierea din 07.11).
  const piese = listaJson(r['objects']);
  if (piese !== null) stare.piese = piese.slice(0, MAX_PIESE).map(piesaDin).filter((p): p is PiesaPlaca => p !== null);
  const anulate = listaJson(r['excluded_objects']);
  if (anulate !== null) stare.anulate = anulate.slice(0, MAX_PIESE).filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  const acum = r['current_object'];
  if (typeof acum === 'string') stare.piesaAcum = acum.trim() === '' ? null : acum;
  else if (acum === null) stare.piesaAcum = null;
  if (typeof r['curPosition'] === 'string') {
    const p = pozitieDin(r['curPosition']);
    if (p !== null) stare.pozitie = p;
  }
  const filament = numar(r['usedMaterialLength']);
  if (filament !== null) stare.filament = filament;
  const lista = r['retGcodeFileInfo2'];
  const textLista = (r['retGcodeFileInfo'] as { fileInfo?: unknown } | null | undefined)?.fileInfo;
  const fisiere = Array.isArray(lista) ? lista.map(fisierDin).filter((f): f is FisierImprimanta => f !== null)
    : typeof textLista === 'string' ? fisiereDinText(textLista) : null;
  return { json: true, inima: r['ModeCode'] === 'heart_beat', stare, fisiere };
}

/** Cadrul arată ca al unei imprimante Creality: bătaia inimii sau măcar un câmp știut al stării. */
export const esteCreality = (c: Cadru): boolean => c.inima || Object.keys(c.stare).length > 0;

/**
 * Starea lucrării (fără eroare: codul ei are cardul lui, și uneori rămâne pus după ce a trecut), ca integrarea Home Assistant (capturile K1C): cu un fișier, 100 % e „gata”, afară de K1C care arată 100 cu timp rămas
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

const cerere =(method: 'get' | 'set', params: Readonly<Record<string, unknown>>): string => JSON.stringify({ method, params });

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

/** Viteza și debitul pe K1: întregi 1–200 % (integrarea Home Assistant). */
export const PROCENTE_K1: Interval = { min: 1, max: 200 };
const PROCENT_VENTILATOR: Interval = { min: 0, max: 100 };
/** Maximul țintelor, cât imprimanta nu-l spune (ca integrarea Home Assistant). */
export const MAX_DUZA_K1 = 300;
export const MAX_PAT_K1 = 100;
/** Homing-ul: între X Y și Z, cel puțin o secundă, apoi cât imprimanta e ocupată, cel mult 15 s (integrarea Home Assistant). */
export const HOMING_MIN_MS = 1000;
export const HOMING_MAX_MS = 15_000;

const maxim = (v: number | null, implicit: number): number => (v !== null && v > 0 ? v : implicit);

/**
 * Ce poate o imprimantă K1, după ce a spus ea: lumina și fiecare ventilator doar dacă le raportează (o K1 SE n-are ventilatorul
 * lateral), viteza și debitul la fel; țintele duzei și patului cu maximul ei. Nicio K1 n-are încălzitor al carcasei, deși K1C
 * trimite uneori `targetBoxTemp` (integrarea Home Assistant și-a scos comanda, care nu făcea nimic).
 */
export function capabilitatiK1(i: Imprimanta): Capabilitati {
  return {
    lumina: i.lumina !== null,
    ventilatoare: VENTILATOARE.filter((id) => i.ventilatoare[id] !== undefined),
    viteza: i.viteza === null ? null : PROCENTE_K1,
    debit: i.debit === null ? null : PROCENTE_K1,
    tinte: [{ incalzitor: 'duza', max: maxim(i.duzaMax, MAX_DUZA_K1) }, { incalzitor: 'pat', max: maxim(i.patMax, MAX_PAT_K1) }],
    homing: true,
    fisiere: true,
    trimitere: true,
    // Anularea unei piese (felia 3.6r): `EXCLUDE_OBJECT` al lui Klipper, prin `gcodeCmd`, cu numele din lista imprimantei.
    anulare: true,
  };
}

const set = (params: Readonly<Record<string, unknown>>): readonly Pas[] => [{ trimite: cerere('set', params) }];

/**
 * O comandă comună în protocolul K1, ca pași; null: refuzată (un număr care nu e întreg sau iese din interval, un ventilator
 * necunoscut, o cale în afara directorului G-code). Ventilatoarele trec prin `gcodeCmd`, dar textul îl face doar driverul, dintr-un
 * canal și un procent verificate (ADR 0192 §B.8): nimic scris de om nu ajunge acolo. La fel anularea unei piese (felia 3.6r, ADR
 * 0193 §C.12, răspunsul 2a): `EXCLUDE_OBJECT NAME=` și un nume doar din litere, cifre, `_`, `.` și `-`; altul se refuză.
 */
export function comandaK1(c: ComandaImprimanta, i: Imprimanta): readonly Pas[] | null {
  switch (c.fel) {
    case 'pauza': return [{ trimite: COMANDA_PAUZA }];
    case 'reia': return [{ trimite: COMANDA_REIA }];
    case 'opreste': return [{ trimite: COMANDA_OPRESTE }];
    case 'porneste': {
      const t = comandaPornire(c.cale);
      return t === null ? null : [{ trimite: t }];
    }
    case 'lumina': return set({ lightSw: c.aprinsa ? 1 : 0 });
    case 'ventilator': {
      const v = Object.hasOwn(VENTILATOARE_K1, c.id) ? VENTILATOARE_K1[c.id] : undefined;
      const p = intregIn(c.procent, PROCENT_VENTILATOR);
      return v === undefined || p === null ? null : set({ gcodeCmd: `M106 P${v.canal} S${Math.round((255 * p) / 100)}` });
    }
    case 'viteza':
    case 'debit': {
      const p = intregIn(c.procent, PROCENTE_K1);
      return p === null ? null : set(c.fel === 'viteza' ? { setFeedratePct: p } : { setFlowratePct: p });
    }
    case 'tinta': {
      const t = capabilitatiK1(i).tinte.find((x) => x.incalzitor === c.incalzitor);
      const g = t === undefined ? null : intregIn(c.grade, { min: 0, max: t.max });
      if (g === null) return null;
      return set(c.incalzitor === 'duza' ? { nozzleTempControl: g } : { bedTempControl: { num: 0, val: g } });
    }
    case 'homing': return [
      { trimite: cerere('set', { autohome: 'X Y' }) },
      { gata: (x) => x.ocupata !== true, minMs: HOMING_MIN_MS, maxMs: HOMING_MAX_MS },
      { trimite: cerere('set', { autohome: 'Z' }) },
    ];
    case 'anuleazaPiesa': return RE_NUME_PIESA.test(c.nume) ? set({ gcodeCmd: `EXCLUDE_OBJECT NAME=${c.nume}` }) : null;
    default: return null;
  }
}

/** Driverul familiei K1 (ADR 0192 §A.5): `creality-k1`, pe 9999. */
export const CREALITY_K1: DriverText = {
  id: 'creality-k1',
  port: PORT_CREALITY,
  citiri: [...CITIRI],
  citeste: (t) => {
    const c = citesteCadru(t);
    return { recunoscut: esteCreality(c), stare: c.stare, fisiere: c.fisiere, raspuns: c.inima ? RASPUNS_INIMA : null };
  },
  lucrare: stareLucrare,
  capabilitati: capabilitatiK1,
  codifica: comandaK1,
  inchideDupaPornire: true,
};
