/**
 * Freza din biblioteca omului (ADR 0300 §2, felia 16.A↑a): ce ține, marginile ei, conul, copia pentru document și lista.
 *
 * Marginile sunt ale ușii documentului (`PLAFON`, unghiul V): o freză bună aici dă o copie (`sculaDinFreza`) care trece de
 * schema operației, deci un proiect care o folosește se poate salva și redeschide. Valorile de lucru (turația, avansul,
 * plonjarea, pașii) stau în fiecare freză; în program intră abia cu felia 16.A↑b (documentul v27).
 *
 * Fără valibot: modulul vine la cerere, cu fereastra „Frezele mele”, iar validatorul documentului stă în bucata ușii.
 * Câmpurile necunoscute ale unei freze (ale unei versiuni mai noi a aplicației) se păstrează la citire și la schimbare.
 */
import { PLAFON, UNGHI_V_MAXIM, UNGHI_V_MINIM, type Scula } from './document.ts';

/**
 * Felurile: plata (dreaptă), V-ul (ascuțit) și freza de gravare (V cu vârf plat), pe care CAM-ul le taie; apoi bila, toroidala,
 * conica cu vârf rotund și burghiul (16.A↑h-4) și profilurile parametrice (16.A↑h-5): rotunjirea (roundover), ogee-ul,
 * ogee-ul roman și panoul ridicat. Canelura (veining, core box) are silueta bilei: nu e un fel separat.
 */
export const FELURI_FREZA = ['plata', 'v', 'gravare', 'bila', 'toroidala', 'conica', 'burghiu', 'rotunjire', 'ogee', 'ogee-roman', 'panou'] as const;
export type FelFreza = (typeof FELURI_FREZA)[number];
/**
 * Felurile pe care CAM-ul le taie azi (ADR 0302 §2): plata, V-ul, gravarea și, din documentul v29, bila (ADR 0312: pe
 * finisarea reliefului și, din 16.A↑e-3, pe linie; `motivFormaPeOperatie` o oprește în rest, iar listele care pun o freză pe
 * o operație cu rând în fereastra exportului cer și `formaPeRand`). Celelalte (toroidala, conica cu vârf rotund, burghiul,
 * profilurile) stau în bibliotecă și în catalog, „în curând”, dar nu se aleg în proiect până la CAM-ul lor.
 */
export const FELURI_CU_CAM = ['plata', 'v', 'gravare', 'bila'] as const;
export const areCam = (fel: FelFreza): boolean => (FELURI_CU_CAM as readonly FelFreza[]).includes(fel);

/** Câmpurile unei freze, fără nume (frezele de pornire își primesc numele de la fereastră, în limba omului). */
export type FrezaFaraNume = {
  readonly fel: FelFreza;
  /** Diametrul tăișului, în mm. */
  readonly diametru: number;
  /** Unghiul inclus al vârfului, în grade (V și gravare); la panou, unghiul teșiturii față de fața plăcii (sub 90°). */
  readonly unghi?: number | undefined;
  /** Diametrul vârfului plat, în mm (gravare; la panou, al fundului plat). */
  readonly varf?: number | undefined;
  /** Raza colțului (toroidala), a vârfului rotund (conica), a rotunjirii, a arcelor ogee-ului sau a scobiturii panoului, în mm. */
  readonly raza?: number | undefined;
  /** Treapta ogee-ului roman, în mm: jos (dreaptă, în sus) și sus (dreaptă, în afară). */
  readonly treapta?: number | undefined;
  /** Lungimea tăișului, în mm (la V și la gravare, cel puțin conul). */
  readonly tais?: number | undefined;
  /** Numărul de tăișuri (pentru calculatorul avansului, felia g). */
  readonly taisuri?: number | undefined;
  /** Numărul T preferat (de pe portscule sau din magazie). */
  readonly numar: number;
  /** Valorile de lucru: turația (rot/min), avansul și plonjarea (mm/min), pasul pe trecere (mm), pasul lateral (% din Ø). */
  readonly turatie: number;
  readonly avans: number;
  readonly plonjare: number;
  readonly pas: number;
  readonly pasLateral: number;
  readonly nota?: string | undefined;
  /** Grupul omului (ADR 0302 §4); lipsă, freza stă pe felul ei. */
  readonly grup?: string | undefined;
};

/** O freză: câmpurile, numele și ce mai ține o versiune mai nouă a aplicației (câmpurile necunoscute rămân). */
export type Freza = FrezaFaraNume & { readonly nume: string; readonly [cheie: string]: unknown };

/** O freză ținută în bibliotecă: cu id, versiunea ei (crește la fiecare schimbare) și data schimbării (ms). */
export type FrezaSalvata = Freza & { readonly id: string; readonly rev: number; readonly schimbatLa: number };

export const MARGINI_FREZA = {
  nume: 40,
  nota: 200,
  /** Lungimea numelui unui grup (ADR 0302 §4). */
  grup: 40,
  numar: PLAFON.numarScula,
  diametru: PLAFON.diametruScula,
  unghiMinim: UNGHI_V_MINIM,
  unghiMaxim: UNGHI_V_MAXIM,
  /** Unghiul teșiturii panoului, față de fața plăcii: sub 90°. */
  unghiPanou: 89,
  tais: PLAFON.adancimeOperatie,
  taisuri: 12,
  turatie: PLAFON.regimFreza,
  avans: PLAFON.regimFreza,
  plonjare: PLAFON.regimFreza,
  pas: PLAFON.adancimeOperatie,
  /** Pasul lateral, în procente din diametru: cel mult jumătate (buzunarul, ADR 0069). */
  pasLateral: 50,
  /** Câte freze ține o bibliotecă (ADR 0300 §7). */
  freze: 500,
} as const;

export type CampFreza = 'nume' | 'diametru' | 'unghi' | 'varf' | 'tais' | 'taisuri' | 'numar' | 'turatie' | 'avans' | 'plonjare'
  | 'pas' | 'pasLateral' | 'nota' | 'grup' | 'raza' | 'treapta';
export type MotivFreza = 'lipsa' | 'margini' | 'intreg' | 'varf' | 'con' | 'nume-gol' | 'nume-lung' | 'nume-caractere'
  | 'nume-folosit' | 'nota-lunga' | 'grup-lung' | 'grup-caractere';
export type ProblemeFreza = Readonly<Partial<Record<CampFreza, MotivFreza>>>;

const finit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
/**
 * Felurile cu unghi: V-ul și gravarea (unghiul inclus), conica (unghiul inclus al flancurilor), burghiul (al vârfului), panoul
 * (al teșiturii, față de fața plăcii).
 */
export const areUnghi = (fel: FelFreza): boolean => fel === 'v' || fel === 'gravare' || fel === 'conica' || fel === 'burghiu' || fel === 'panou';
/** Felurile cu vârf plat: gravarea și panoul (fundul plat). */
export const areVarf = (fel: FelFreza): boolean => fel === 'gravare' || fel === 'panou';
/** Felurile cu rază: toroidala, conica, rotunjirea, ogee-urile; la panou, raza scobiturii e opțională. */
export const areRaza = (fel: FelFreza): boolean => fel === 'toroidala' || fel === 'conica' || fel === 'rotunjire' || fel === 'ogee'
  || fel === 'ogee-roman' || fel === 'panou';
/** Felurile cu treaptă: ogee-ul roman. */
export const areTreapta = (fel: FelFreza): boolean => fel === 'ogee-roman';

/** Numele, pentru unicitate: fără spațiile de la capete și dublate, cu literele compuse unite, fără deosebire de majuscule. */
export function cheieNume(nume: string): string {
  return nume.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('ro');
}

/**
 * Înălțimea capătului, în mm (ADR 0302, felia 16.A↑h-4), măsurată de la vârf până unde freza ajunge la diametrul ei: plata
 * 0; V-ul și gravarea (R − a)·cot(θ/2), cu a raza vârfului plat; bila R; toroidala r (raza colțului); conica
 * r(1 − sin α) + (R − r cos α) / tan α, cu α = θ/2 și r raza vârfului rotund; burghiul R / tan(θ/2); profilurile (16.A↑h-5):
 * rotunjirea r, ogee-ul 2r, ogee-ul roman 2r + t (treapta), panoul (R − a)·tan β (a raza fundului plat, β teșitura față de
 * fața plăcii), iar cu scobitura de rază r, r(1 − cos β) + (R − a − r sin β)·tan β. Tăișul nu poate fi mai scurt.
 */
export function inaltimeCon(f: Pick<Freza, 'fel' | 'diametru' | 'unghi' | 'varf' | 'raza' | 'treapta'>): number {
  const R = f.diametru / 2;
  switch (f.fel) {
    case 'plata': return 0;
    case 'bila': return R;
    case 'toroidala': case 'rotunjire': return finit(f.raza) ? f.raza : 0;
    case 'ogee': return finit(f.raza) ? 2 * f.raza : 0;
    case 'ogee-roman': return finit(f.raza) && finit(f.treapta) ? 2 * f.raza + f.treapta : 0;
    case 'panou': {
      if (!finit(f.unghi) || !finit(f.varf)) return 0;
      const b = (f.unghi * Math.PI) / 180;
      const a = f.varf / 2;
      const r = finit(f.raza) ? f.raza : 0;
      return r * (1 - Math.cos(b)) + (R - a - r * Math.sin(b)) * Math.tan(b);
    }
    case 'conica': {
      if (!finit(f.unghi) || !finit(f.raza)) return 0;
      const a = (f.unghi * Math.PI) / 360;
      return f.raza * (1 - Math.sin(a)) + (R - f.raza * Math.cos(a)) / Math.tan(a);
    }
    default: {
      if (!finit(f.unghi)) return 0;
      const a = f.fel === 'gravare' && finit(f.varf) ? f.varf / 2 : 0;
      return (R - a) / Math.tan((f.unghi * Math.PI) / 360);
    }
  }
}

function interval(x: unknown, max: number, intreg = false): MotivFreza | null {
  if (!finit(x)) return 'lipsa';
  if (!(x > 0 && x <= max)) return 'margini';
  if (intreg && !Number.isInteger(x)) return 'intreg';
  return null;
}

function problemaNume(nume: unknown, alte: readonly FrezaSalvata[], id: string | null, rezervate: readonly string[]): MotivFreza | null {
  if (typeof nume !== 'string' || nume.trim() === '') return 'nume-gol';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(nume)) return 'nume-caractere';
  if ([...nume.normalize('NFC').trim()].length > MARGINI_FREZA.nume) return 'nume-lung';
  const k = cheieNume(nume);
  return alte.some((f) => f.id !== id && cheieNume(f.nume) === k) || rezervate.some((r) => cheieNume(r) === k) ? 'nume-folosit' : null;
}

/**
 * Ce nu e bine la o freză, câmp cu câmp (gol: e bună). `alte` sunt frezele bibliotecii (numele unic), iar `id` e al frezei
 * schimbate (numele ei nu se ciocnește cu el însuși); `rezervate` sunt numele frezelor pe care versiunea de azi nu le poate
 * citi (rămân în bibliotecă). Unghiul și vârful se judecă doar unde țin de fel.
 */
export function problemeFreza(f: Freza, alte: readonly FrezaSalvata[] = [], id: string | null = null, rezervate: readonly string[] = []): ProblemeFreza {
  const p: Partial<Record<CampFreza, MotivFreza>> = {};
  const pune = (c: CampFreza, m: MotivFreza | null): void => { if (m) p[c] = m; };
  pune('nume', problemaNume(f.nume, alte, id, rezervate));
  pune('diametru', interval(f.diametru, MARGINI_FREZA.diametru));
  pune('numar', interval(f.numar, MARGINI_FREZA.numar, true));
  if (areUnghi(f.fel)) {
    const max = f.fel === 'panou' ? MARGINI_FREZA.unghiPanou : MARGINI_FREZA.unghiMaxim;
    if (!finit(f.unghi)) p.unghi = 'lipsa';
    else if (f.unghi < MARGINI_FREZA.unghiMinim || f.unghi > max) p.unghi = 'margini';
  }
  if (areVarf(f.fel)) {
    if (!finit(f.varf)) p.varf = 'lipsa';
    else if (!(f.varf > 0)) p.varf = 'margini';
    else if (!p.diametru && f.varf >= f.diametru) p.varf = 'varf';
  }
  if (areRaza(f.fel)) {
    const R = f.diametru / 2;
    if (f.fel === 'panou') {
      // Scobitura, opțională: încape între fundul plat și diametru (a + r·sin β < R).
      if (f.raza !== undefined && (!finit(f.raza) || !(f.raza > 0)
        || (!p.diametru && !p.unghi && !p.varf && !(f.varf! / 2 + f.raza * Math.sin((f.unghi! * Math.PI) / 180) < R)))) p.raza = 'margini';
    } else if (!finit(f.raza)) p.raza = 'lipsa';
    // Rotunjirea, toroidala și conica lasă vârful (r < R); ogee-urile au două arce (r < R / 2).
    else if (!(f.raza > 0) || (!p.diametru && !(f.raza < (f.fel === 'ogee' || f.fel === 'ogee-roman' ? R / 2 : R)))) p.raza = 'margini';
  }
  if (areTreapta(f.fel)) {
    if (!finit(f.treapta)) p.treapta = 'lipsa';
    else if (!(f.treapta > 0) || (!p.diametru && !p.raza && !(2 * f.raza! + f.treapta < f.diametru / 2))) p.treapta = 'margini';
  }
  if (f.tais !== undefined) {
    const m = interval(f.tais, MARGINI_FREZA.tais);
    if (m) p.tais = m;
    else if (!p.diametru && !p.unghi && !p.varf && !p.raza && !p.treapta && f.tais! < inaltimeCon(f) - 1e-9) p.tais = 'con';
  }
  if (f.taisuri !== undefined) pune('taisuri', interval(f.taisuri, MARGINI_FREZA.taisuri, true));
  pune('turatie', interval(f.turatie, MARGINI_FREZA.turatie, true));
  pune('avans', interval(f.avans, MARGINI_FREZA.avans));
  pune('plonjare', interval(f.plonjare, MARGINI_FREZA.plonjare));
  pune('pas', interval(f.pas, MARGINI_FREZA.pas));
  pune('pasLateral', interval(f.pasLateral, MARGINI_FREZA.pasLateral));
  if (f.nota !== undefined && (typeof f.nota !== 'string' || [...f.nota].length > MARGINI_FREZA.nota)) p.nota = 'nota-lunga';
  if (f.grup !== undefined) pune('grup', problemaGrup(f.grup));
  return p;
}

/** Ce nu e bine la numele unui grup (gol e bine: freza stă pe felul ei). */
function problemaGrup(g: unknown): MotivFreza | null {
  if (typeof g !== 'string') return 'grup-caractere';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(g)) return 'grup-caractere';
  return [...g.normalize('NFC').trim()].length > MARGINI_FREZA.grup ? 'grup-lung' : null;
}

/** Freza cu doar câmpurile felului ei (plata fără unghi și vârf, V-ul fără vârf), cu numele curățat la capete. */
function curata<F extends Freza>(f: F): F {
  const { unghi: _u, varf: _v, raza: _r, treapta: _t, ...rest } = f;
  void _u; void _v; void _r; void _t;
  const c: Record<string, unknown> = {
    ...rest,
    nume: f.nume.normalize('NFC').trim(),
    grup: typeof f.grup === 'string' && f.grup.trim() !== '' ? f.grup.normalize('NFC').trim() : undefined,
    ...(areUnghi(f.fel) ? { unghi: f.unghi } : {}),
    ...(areVarf(f.fel) ? { varf: f.varf } : {}),
    ...(areRaza(f.fel) ? { raza: f.raza } : {}),
    ...(areTreapta(f.fel) ? { treapta: f.treapta } : {}),
  };
  // Un câmp opțional golit (tăișul, nota) pleacă de tot, nu rămâne ca `undefined`.
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  return c as F;
}

/**
 * Copia frezei pentru document (ADR 0300 §5): numărul T, numele, diametrul și forma (ADR 0090, 0092). Ce pune felia 16.A↑b
 * în plus (originea, valorile de lucru, tăișul) intră cu documentul v27.
 */
export function sculaDinFreza(f: Freza, numar: number = f.numar): Scula {
  const baza = { numar, nume: f.nume, diametru: f.diametru };
  if (!areCam(f.fel)) throw new Error(`felul ${f.fel} n-are încă CAM: nu se copiază în proiect`);
  // Bila (ADR 0312): în proiect doar forma ei; lucrarea o primește doar pe o finisare a reliefului.
  if (f.fel === 'bila') return { ...baza, forma: { tip: 'bila' } };
  if (f.fel === 'plata' || !finit(f.unghi)) return baza;
  return { ...baza, forma: f.fel === 'gravare' && finit(f.varf) ? { tip: 'v', unghi: f.unghi, varf: f.varf } : { tip: 'v', unghi: f.unghi } };
}

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const opt = (x: unknown): boolean => x === undefined || finit(x);

/** Forma unei freze (fără judecata marginilor), din date necunoscute. */
function formaFreza(x: Record<string, unknown>): boolean {
  return typeof x['nume'] === 'string' && (FELURI_FREZA as readonly unknown[]).includes(x['fel'])
    && ['diametru', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pasLateral'].every((k) => finit(x[k]))
    && ['unghi', 'varf', 'raza', 'treapta', 'tais', 'taisuri'].every((k) => opt(x[k]))
    && (x['nota'] === undefined || typeof x['nota'] === 'string')
    && (x['grup'] === undefined || typeof x['grup'] === 'string');
}

/** O freză ținută (cu id, versiune și dată), din datele bibliotecii; null dacă nu are forma sau marginile ei. */
export function frezaDinDate(x: unknown): FrezaSalvata | null {
  if (!obiect(x) || !formaFreza(x)) return null;
  const { id, rev, schimbatLa } = x;
  if (typeof id !== 'string' || id === '' || id.length > 64) return null;
  if (!finit(rev) || !Number.isInteger(rev) || rev < 1 || !finit(schimbatLa)) return null;
  const f = x as FrezaSalvata;
  return Object.keys(problemeFreza(f)).length === 0 ? f : null;
}

/** O freză adusă dintr-un fișier: fără id, versiune și dată (le primește la adăugare); null dacă nu e bună. */
export function frezaImportata(x: unknown): Freza | null {
  if (!obiect(x) || !formaFreza(x)) return null;
  const { id: _i, rev: _r, schimbatLa: _s, ...f } = x;
  void _i; void _r; void _s;
  return Object.keys(problemeFreza(f as Freza)).length === 0 ? (f as Freza) : null;
}

/** Frezele de pornire (ADR 0300 §3), fără nume (îl propune fereastra, în limba omului); valorile de lucru de azi. */
const LUCRU = { turatie: 18000, avans: 1000, plonjare: 300, pasLateral: 40 } as const;
export const FREZE_PORNIRE: readonly FrezaFaraNume[] = [
  { fel: 'plata', diametru: 3.175, tais: 12, taisuri: 2, numar: 1, pas: 1.5, ...LUCRU },
  { fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2, pas: 3, ...LUCRU },
  { fel: 'v', diametru: 6, unghi: 60, taisuri: 2, numar: 3, pas: 1.5, ...LUCRU },
  { fel: 'v', diametru: 12, unghi: 90, taisuri: 2, numar: 4, pas: 2, ...LUCRU },
  { fel: 'gravare', diametru: 3.175, unghi: 30, varf: 0.2, taisuri: 1, numar: 5, pas: 1, ...LUCRU },
  { fel: 'plata', diametru: 12, tais: 30, taisuri: 2, numar: 6, pas: 4, ...LUCRU },
];

/**
 * Id-urile fixe ale frezelor standard (ADR 0300 §3, precizarea owner-ului din 24.11: biblioteca vine populată cu ele), în
 * ordinea lui `FREZE_PORNIRE`: aceeași freză pe orice calculator și în orice cont, deci două seturi puse în același cont
 * (de pe două calculatoare) nu se dublează, iar o freză standard ștearsă și pusă la loc e tot ea.
 */
export const ID_PORNIRE: readonly string[] = ['std-plata-3175', 'std-plata-6', 'std-v60-6', 'std-v90-12', 'std-gravare-30-3175', 'std-plata-12'];

/** O freză standard gata de pus în bibliotecă: câmpurile, numele (în limba omului) și id-ul ei fix. */
export type FrezaStandard = Freza & { readonly id: string };

/**
 * Lista cu frezele standard care lipsesc (după id), fiecare cu un nume liber (unul luat de altă freză primește „(2)”),
 * versiunea 1 și data `acum`; peste plafonul bibliotecii, câte încap. Una care nu e o freză bună se sare.
 */
export function cuStandard(
  lista: readonly FrezaSalvata[], standard: readonly FrezaStandard[], acum: number, rezervate: readonly string[] = [],
): { readonly lista: readonly FrezaSalvata[]; readonly adaugate: number } {
  let rez = lista;
  for (const s of standard) {
    if (rez.some((f) => f.id === s.id)) continue;
    const r = cuFreza(rez, null, { ...s, nume: numeLiber(s.nume, rez, rezervate) }, () => s.id, acum, rezervate);
    if (r.ok) rez = r.lista;
  }
  return { lista: rez, adaugate: rez.length - lista.length };
}

export type RezultatLista =
  | { readonly ok: true; readonly lista: readonly FrezaSalvata[]; readonly id: string }
  | { readonly ok: false; readonly probleme: ProblemeFreza | { readonly id: 'lipsa' } | { readonly lista: 'plina' } };

/**
 * Lista cu o freză nouă (`id` null) sau schimbată: versiunea crește, data e `acum`, câmpurile necunoscute ale celei vechi
 * rămân, iar cele care nu țin de fel pleacă.
 */
export function cuFreza(
  lista: readonly FrezaSalvata[], id: string | null, f: Freza, idNou: () => string, acum: number, rezervate: readonly string[] = [],
): RezultatLista {
  const veche = id === null ? null : lista.find((x) => x.id === id);
  if (id !== null && !veche) return { ok: false, probleme: { id: 'lipsa' } };
  if (!veche && lista.length >= MARGINI_FREZA.freze) return { ok: false, probleme: { lista: 'plina' } };
  const probleme = problemeFreza(f, lista, id, rezervate);
  if (Object.keys(probleme).length > 0) return { ok: false, probleme };
  if (veche) {
    const noua = curata({ ...veche, ...f, id: veche.id, rev: veche.rev + 1, schimbatLa: acum });
    return { ok: true, lista: lista.map((x) => (x.id === veche.id ? noua : x)), id: veche.id };
  }
  const noua = curata({ ...f, id: idNou(), rev: 1, schimbatLa: acum });
  return { ok: true, lista: [...lista, noua], id: noua.id };
}

export function faraFreza(lista: readonly FrezaSalvata[], id: string): { readonly ok: true; readonly lista: readonly FrezaSalvata[] } | { readonly ok: false } {
  return lista.some((f) => f.id === id) ? { ok: true, lista: lista.filter((f) => f.id !== id) } : { ok: false };
}

/** Un grup al listei (ADR 0302 §4): al omului (`grup`) sau, pentru frezele fără grup, felul lor (`fel`). */
export type GrupFreze = { readonly grup: string | null; readonly fel: FelFreza | null; readonly freze: readonly FrezaSalvata[] };

/**
 * Grupurile listei: întâi ale omului, după nume (fără deosebire de majuscule; numele unui grup e al primei lui freze din
 * listă), apoi felurile, în ordinea lor, pentru frezele fără grup. Frezele rămân în ordinea listei.
 */
export function grupurileListei(lista: readonly FrezaSalvata[]): readonly GrupFreze[] {
  const ale = new Map<string, { nume: string; freze: FrezaSalvata[] }>();
  const pe = new Map<FelFreza, FrezaSalvata[]>();
  for (const f of lista) {
    if (typeof f.grup === 'string' && f.grup.trim() !== '') {
      const k = cheieNume(f.grup);
      const g = ale.get(k) ?? { nume: f.grup.normalize('NFC').trim(), freze: [] };
      g.freze.push(f);
      ale.set(k, g);
    } else {
      const l = pe.get(f.fel) ?? [];
      l.push(f);
      pe.set(f.fel, l);
    }
  }
  const omului = [...ale.values()].sort((a, b) => a.nume.localeCompare(b.nume, 'ro', { sensitivity: 'base' }))
    .map((g): GrupFreze => ({ grup: g.nume, fel: null, freze: g.freze }));
  const felurile = FELURI_FREZA.filter((x) => pe.has(x)).map((x): GrupFreze => ({ grup: null, fel: x, freze: pe.get(x)! }));
  return [...omului, ...felurile];
}

/**
 * Redenumirea unui grup al omului (`vechi`, fără deosebire de majuscule): toate frezele lui primesc `nou`, cu versiunea
 * crescută. Un nume care e deja al altui grup le unește, cu numele acelui grup; gol, frezele se întorc pe felurile lor.
 */
export function cuGrupRedenumit(lista: readonly FrezaSalvata[], vechi: string, nou: string, acum: number):
  { readonly ok: true; readonly lista: readonly FrezaSalvata[] } | { readonly ok: false; readonly motiv: MotivFreza | 'lipsa' } {
  const motiv = problemaGrup(nou);
  if (motiv) return { ok: false, motiv };
  const kv = cheieNume(vechi);
  const ale = (f: FrezaSalvata): boolean => typeof f.grup === 'string' && f.grup.trim() !== '' && cheieNume(f.grup) === kv;
  if (!lista.some(ale)) return { ok: false, motiv: 'lipsa' };
  const curat = nou.normalize('NFC').trim();
  const kn = cheieNume(curat);
  const existent = kn === kv ? undefined : lista.find((f) => !ale(f) && typeof f.grup === 'string' && cheieNume(f.grup) === kn)?.grup;
  const grup = curat === '' ? undefined : (existent ?? curat);
  return { ok: true, lista: lista.map((f) => (ale(f) ? curata({ ...f, grup, rev: f.rev + 1, schimbatLa: acum }) : f)) };
}

/** Un nume liber în listă: el însuși, sau cu „(2)”, „(3)”…, scurtat ca sufixul să încapă în 40 de caractere. */
export function numeLiber(nume: string, lista: readonly Pick<Freza, 'nume'>[], rezervate: readonly string[] = []): string {
  const luate = new Set([...lista.map((f) => f.nume), ...rezervate].map(cheieNume));
  const curat = nume.normalize('NFC').trim();
  if (!luate.has(cheieNume(curat))) return curat;
  for (let k = 2; ; k++) {
    const sufix = ` (${k})`;
    const baza = [...curat].slice(0, MARGINI_FREZA.nume - sufix.length).join('').trimEnd();
    if (!luate.has(cheieNume(baza + sufix))) return baza + sufix;
  }
}

/**
 * Mai multe freze deodată (pornirea, importul cu „Păstrează-le pe amândouă”): fiecare bună intră, cu un nume liber; una
 * greșită se sare și se numără. Peste plafonul bibliotecii, nimic.
 */
export function cuFreze(lista: readonly FrezaSalvata[], noi: readonly Freza[], idNou: () => string, acum: number):
  | { readonly ok: true; readonly lista: readonly FrezaSalvata[]; readonly adaugate: number; readonly sarite: number }
  | { readonly ok: false; readonly probleme: { readonly lista: 'plina' } } {
  let rez = lista, sarite = 0;
  const bune: Freza[] = [];
  for (const f of noi) {
    const cuNume = { ...f, nume: typeof f.nume === 'string' && f.nume.trim() !== '' ? f.nume : 'x' };
    if (Object.keys(problemeFreza(cuNume)).length > 0) sarite++;
    else bune.push(f);
  }
  if (lista.length + bune.length > MARGINI_FREZA.freze) return { ok: false, probleme: { lista: 'plina' } };
  for (const f of bune) {
    const r = cuFreza(rez, null, { ...f, nume: numeLiber(f.nume, rez) }, idNou, acum);
    if (r.ok) rez = r.lista;
    else sarite++;
  }
  return { ok: true, lista: rez, adaugate: rez.length - lista.length, sarite };
}

/** Ce face importul cu o freză al cărei nume e deja în bibliotecă (ADR 0300 §8). */
export type PoliticaImport = 'inlocuieste' | 'amandoua' | 'sari';

/**
 * Frezele unui fișier, în bibliotecă: una bună cu un nume nou intră; cu un nume care există (și unul adus mai devreme din
 * același fișier) o înlocuiește pe aceea (id-ul rămâne, versiunea crește), intră cu un nume liber („(2)”) sau se sare.
 * Una greșită se sare. Dacă lista ar trece de plafon, nimic.
 */
export function cuImport(
  lista: readonly FrezaSalvata[], noi: readonly Freza[], politica: PoliticaImport, idNou: () => string, acum: number,
  rezervate: readonly string[] = [],
):
  | { readonly ok: true; readonly lista: readonly FrezaSalvata[]; readonly adaugate: number; readonly inlocuite: number; readonly sarite: number }
  | { readonly ok: false; readonly probleme: { readonly lista: 'plina' } } {
  let rez = lista, adaugate = 0, inlocuite = 0, sarite = 0;
  for (const f of noi) {
    const existenta = rez.find((x) => typeof f.nume === 'string' && cheieNume(x.nume) === cheieNume(f.nume));
    // O freză necitită (a unei versiuni mai noi) nu se poate înlocui: numele ei se ocolește, ca la „amândouă”.
    const rezervat = typeof f.nume === 'string' && rezervate.some((r) => cheieNume(r) === cheieNume(f.nume));
    if ((existenta || rezervat) && politica === 'sari') { sarite++; continue; }
    const id = existenta && politica === 'inlocuieste' ? existenta.id : null;
    const nume = (existenta && politica === 'amandoua') || rezervat ? numeLiber(f.nume, rez, rezervate) : f.nume;
    if (id === null && rez.length >= MARGINI_FREZA.freze) return { ok: false, probleme: { lista: 'plina' } };
    const r = cuFreza(rez, id, { ...f, nume }, idNou, acum, rezervate);
    if (!r.ok) { sarite++; continue; }
    rez = r.lista;
    if (id === null) adaugate++; else inlocuite++;
  }
  return { ok: true, lista: rez, adaugate, inlocuite, sarite };
}

/**
 * Ce știe proiectul despre o freză din bibliotecă (ADR 0300 §5, felia 16.A↑b-6): copia de pe operație (numele, T-ul,
 * diametrul, forma, valorile de lucru, tăișul) și pașii rândului ei (pasul pe trecere și pasul lateral, în mm; null =
 * necunoscut). Nu ține numărul de tăișuri, nota sau grupul: acelea erau doar ale bibliotecii.
 */
export type CopieProiect = {
  readonly nume: string; readonly numar: number; readonly diametru: number;
  /** Forma în V a copiei (unghiul și vârful plat); lipsă = plată. */
  readonly forma?: { readonly tip?: 'v'; readonly unghi: number; readonly varf?: number };
  readonly regim?: { readonly turatie: number; readonly avans: number; readonly plonjare: number };
  readonly tais?: number;
  readonly pas: number | null; readonly pasLateral: number | null;
};

/**
 * Freza bibliotecii din copia proiectului („Pune-o înapoi în bibliotecă”, ADR 0300 §5): felul din formă (fără formă plată; cu
 * vârful plat, de gravare; altfel V), valorile de lucru ale copiei (fără ele, ale frezelor de pornire), pasul pe trecere al
 * rândului (necunoscut, jumătate din diametru) și pasul lateral din mm în procente din diametru, cel mult 50 % (necunoscut,
 * al frezelor de pornire).
 */
export function frezaDinCopie(c: CopieProiect): Freza {
  const forma = c.forma;
  const fel: FelFreza = !forma ? 'plata' : forma.varf !== undefined && forma.varf > 0 ? 'gravare' : 'v';
  const regim = c.regim ?? { turatie: LUCRU.turatie, avans: LUCRU.avans, plonjare: LUCRU.plonjare };
  const pas = c.pas !== null && c.pas > 0 ? c.pas : Math.min(MARGINI_FREZA.pas, c.diametru / 2);
  const pasLateral = c.pasLateral !== null && c.pasLateral > 0 && c.diametru > 0
    ? Math.min(MARGINI_FREZA.pasLateral, Math.round((c.pasLateral / c.diametru) * 1000) / 10) : LUCRU.pasLateral;
  return {
    nume: c.nume, fel, diametru: c.diametru,
    ...(forma ? { unghi: forma.unghi } : {}), ...(fel === 'gravare' ? { varf: forma!.varf } : {}),
    ...(c.tais !== undefined ? { tais: c.tais } : {}),
    numar: c.numar, turatie: regim.turatie, avans: regim.avans, plonjare: regim.plonjare, pas, pasLateral,
  };
}

/**
 * Lista cu o freză ștearsă pusă înapoi (ADR 0300 §5, felia 16.A↑b-6): cu id-ul ei de dinainte (originea din proiect; în cont,
 * semnul ștergerii o reînvie), versiunea `rev`, data `acum` și un nume liber („(2)” dacă altă freză îl are acum). Cu id-ul
 * încă în listă (pusă înapoi între timp), nimic: freza de acolo nu se suprascrie.
 */
export function cuFrezaReadusa(
  lista: readonly FrezaSalvata[], id: string, rev: number, f: Freza, acum: number, rezervate: readonly string[] = [],
):
  | { readonly ok: true; readonly lista: readonly FrezaSalvata[]; readonly freza: FrezaSalvata }
  | { readonly ok: false; readonly probleme: ProblemeFreza | { readonly id: 'exista' } | { readonly lista: 'plina' } } {
  if (lista.some((x) => x.id === id)) return { ok: false, probleme: { id: 'exista' } };
  const r = cuFreza(lista, null, { ...f, nume: numeLiber(f.nume, lista, rezervate) }, () => id, acum, rezervate);
  if (!r.ok) return 'id' in r.probleme ? { ok: false, probleme: { id: 'exista' } } : { ok: false, probleme: r.probleme };
  const freza: FrezaSalvata = { ...r.lista[r.lista.length - 1]!, rev };
  return { ok: true, lista: [...lista, freza], freza };
}
