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

/** Felurile de azi: plata (dreaptă), V-ul (ascuțit) și freza de gravare (V cu vârf plat). Bila, toroidala, profilul: feliile e, f. */
export const FELURI_FREZA = ['plata', 'v', 'gravare'] as const;
export type FelFreza = (typeof FELURI_FREZA)[number];

/** Câmpurile unei freze, fără nume (frezele de pornire își primesc numele de la fereastră, în limba omului). */
export type FrezaFaraNume = {
  readonly fel: FelFreza;
  /** Diametrul tăișului, în mm. */
  readonly diametru: number;
  /** Unghiul inclus al vârfului, în grade (V și gravare). */
  readonly unghi?: number | undefined;
  /** Diametrul vârfului plat, în mm (gravare). */
  readonly varf?: number | undefined;
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
};

/** O freză: câmpurile, numele și ce mai ține o versiune mai nouă a aplicației (câmpurile necunoscute rămân). */
export type Freza = FrezaFaraNume & { readonly nume: string; readonly [cheie: string]: unknown };

/** O freză ținută în bibliotecă: cu id, versiunea ei (crește la fiecare schimbare) și data schimbării (ms). */
export type FrezaSalvata = Freza & { readonly id: string; readonly rev: number; readonly schimbatLa: number };

export const MARGINI_FREZA = {
  nume: 40,
  nota: 200,
  numar: PLAFON.numarScula,
  diametru: PLAFON.diametruScula,
  unghiMinim: UNGHI_V_MINIM,
  unghiMaxim: UNGHI_V_MAXIM,
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
  | 'pas' | 'pasLateral' | 'nota';
export type MotivFreza = 'lipsa' | 'margini' | 'intreg' | 'varf' | 'con' | 'nume-gol' | 'nume-lung' | 'nume-caractere'
  | 'nume-folosit' | 'nota-lunga';
export type ProblemeFreza = Readonly<Partial<Record<CampFreza, MotivFreza>>>;

const finit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const areUnghi = (fel: FelFreza): boolean => fel !== 'plata';

/** Numele, pentru unicitate: fără spațiile de la capete și dublate, cu literele compuse unite, fără deosebire de majuscule. */
export function cheieNume(nume: string): string {
  return nume.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('ro');
}

/**
 * Înălțimea conului, în mm: (R − a)·cot(θ/2), cu R raza, a raza vârfului plat (gravarea) și θ unghiul inclus; 0 la freza
 * plată. Tăișul unei freze în V nu poate fi mai scurt.
 */
export function inaltimeCon(f: Pick<Freza, 'fel' | 'diametru' | 'unghi' | 'varf'>): number {
  if (f.fel === 'plata' || !finit(f.unghi)) return 0;
  const a = f.fel === 'gravare' && finit(f.varf) ? f.varf / 2 : 0;
  return (f.diametru / 2 - a) / Math.tan((f.unghi * Math.PI) / 360);
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
    if (!finit(f.unghi)) p.unghi = 'lipsa';
    else if (f.unghi < MARGINI_FREZA.unghiMinim || f.unghi > MARGINI_FREZA.unghiMaxim) p.unghi = 'margini';
  }
  if (f.fel === 'gravare') {
    if (!finit(f.varf)) p.varf = 'lipsa';
    else if (!(f.varf > 0)) p.varf = 'margini';
    else if (!p.diametru && f.varf >= f.diametru) p.varf = 'varf';
  }
  if (f.tais !== undefined) {
    const m = interval(f.tais, MARGINI_FREZA.tais);
    if (m) p.tais = m;
    else if (!p.diametru && !p.unghi && !p.varf && f.tais! < inaltimeCon(f) - 1e-9) p.tais = 'con';
  }
  if (f.taisuri !== undefined) pune('taisuri', interval(f.taisuri, MARGINI_FREZA.taisuri, true));
  pune('turatie', interval(f.turatie, MARGINI_FREZA.turatie, true));
  pune('avans', interval(f.avans, MARGINI_FREZA.avans));
  pune('plonjare', interval(f.plonjare, MARGINI_FREZA.plonjare));
  pune('pas', interval(f.pas, MARGINI_FREZA.pas));
  pune('pasLateral', interval(f.pasLateral, MARGINI_FREZA.pasLateral));
  if (f.nota !== undefined && (typeof f.nota !== 'string' || [...f.nota].length > MARGINI_FREZA.nota)) p.nota = 'nota-lunga';
  return p;
}

/** Freza cu doar câmpurile felului ei (plata fără unghi și vârf, V-ul fără vârf), cu numele curățat la capete. */
function curata<F extends Freza>(f: F): F {
  const { unghi: _u, varf: _v, ...rest } = f;
  void _u; void _v;
  const c: Record<string, unknown> = {
    ...rest,
    nume: f.nume.normalize('NFC').trim(),
    ...(areUnghi(f.fel) ? { unghi: f.unghi } : {}),
    ...(f.fel === 'gravare' ? { varf: f.varf } : {}),
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
  if (f.fel === 'plata' || !finit(f.unghi)) return baza;
  return { ...baza, forma: f.fel === 'gravare' && finit(f.varf) ? { tip: 'v', unghi: f.unghi, varf: f.varf } : { tip: 'v', unghi: f.unghi } };
}

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const opt = (x: unknown): boolean => x === undefined || finit(x);

/** Forma unei freze (fără judecata marginilor), din date necunoscute. */
function formaFreza(x: Record<string, unknown>): boolean {
  return typeof x['nume'] === 'string' && (FELURI_FREZA as readonly unknown[]).includes(x['fel'])
    && ['diametru', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pasLateral'].every((k) => finit(x[k]))
    && ['unghi', 'varf', 'tais', 'taisuri'].every((k) => opt(x[k]))
    && (x['nota'] === undefined || typeof x['nota'] === 'string');
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
