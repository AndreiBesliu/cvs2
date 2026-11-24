import { evenimentDin, type Eveniment } from './utilizare.ts';

/**
 * Sumele zilei ale utilizării aplicației (ADR 0262 §5, felia A.9a), comune jobului de noapte (care le scrie) și filei Utilizare
 * (care le citește și le adună pe o perioadă). Pure: loturile intră, numerele ies. Fără conturi: oamenii distincți se țin într-o
 * schiță HyperLogLog (registrele, din care nu se poate scoate niciun cont), care se unește pe zile și dă un număr aproximativ.
 * Două segmente, clienții și personalul, ca fila să arate clienții fără zgomotul echipei.
 */

export const COLECTIE_UTILIZARE_ZI = 'utilizareZi';
export const SCHEMA_ZI = 1;
/** Fusul zilelor: ziua sumelor e ziua din România, după ora primirii lotului. */
export const FUS_ZI = 'Europe/Bucharest';
/** Câte zile recalculează jobul la fiecare rulare (ieri și alaltăieri): o noapte căzută se acoperă la următoarea. */
export const ZILE_RECALCULATE = 2;
export const SEGMENTE = ['clienti', 'personal'] as const;
export type Segment = (typeof SEGMENTE)[number];
/** Durata unei sesiuni într-o zi, în trepte: marginea de sus, în minute; ultima ține tot ce trece de 8 ore. */
export const TREPTE_SESIUNE_MIN = [1, 5, 15, 30, 60, 120, 240, 480, 1_440] as const;
/** Precizia schițelor: 2^10 registre pentru oamenii zilei (~3 %), 2^6 pentru oamenii unei acțiuni (~13 %). */
export const P_OAMENI = 10;
export const P_ACTIUNE = 6;

/**
 * Fluxurile (ADR 0262 §6, felia A.10). Secvențele: 3 și 4 acțiuni reușite la rând ale unei sesiuni, păstrate pe zi cele mai
 * dese (din cele mai multe sesiuni), câte `SECVENTE_PE_LUNGIME` pe fiecare lungime; cheia e lanțul id-urilor, cu `>`.
 */
export const LUNGIMI_SECVENTA = [3, 4] as const;
export const SECVENTE_PE_LUNGIME = 150;
/** Ce nu e un pas al lucrului, ci selecția sau navigarea (panourile, tema, paleta, foaia arătată): nu intră în secvențe. */
const NAVIGARE = /^(?:selectie\.|vedere\.(?!traseu$|masina$|imprimanta$|freze$))/;
export const intraInSecventa = (id: string): boolean => !NAVIGARE.test(id);
/**
 * Pâlnia drumului principal: deschiderea, desenul sau importul, rolul de tăiere, exportul G-code, lucrarea pornită pe mașină.
 * O sesiune ajunge până la pasul cel mai departe pe care l-a făcut (deci una care exportă un proiect salvat trece și de
 * desen și de rol, făcute în altă zi).
 */
export const PASI_PALNIE = ['deschidere', 'continut', 'rol', 'export', 'masina'] as const;
export type PasPalnie = (typeof PASI_PALNIE)[number];
const CONTINUT: ReadonlySet<string> = new Set(['document.adauga-cerc', 'document.adauga-dreptunghi', 'document.deseneaza', 'document.importa', 'document.text']);
const ROL: ReadonlySet<string> = new Set(['document.rol', 'document.aplica-operatii']);

// HyperLogLog ------------------------------------------------------------------------------------------------------------

/** Pură: un hash de 32 de biți al unui șir (FNV-1a, apoi amestecul final al lui MurmurHash3, ca biții să fie uniformi). */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Registrele unei schițe: `2^p` valori, fiecare cel mult 33 − p. */
export type Schita = Uint8Array;
export const schitaNoua = (p: number): Schita => new Uint8Array(1 << p);

/** Adaugă un element (după hash): primii `p` biți aleg registrul, rangul e poziția primului 1 din rest. */
export function adaugaInSchita(s: Schita, p: number, h: number): void {
  const j = h >>> (32 - p);
  const rest = (h << p) >>> 0;
  const rang = rest === 0 ? 33 - p : Math.clz32(rest) + 1;
  if (rang > (s[j] ?? 0)) s[j] = rang;
}

/** Estimarea (Flajolet et al., cu numărarea liniară pe intervalul mic, unde e aproape exactă). */
export function estimeaza(s: Schita): number {
  const m = s.length;
  let suma = 0;
  let zero = 0;
  for (const r of s) {
    suma += 2 ** -r;
    if (r === 0) zero++;
  }
  const alfa = m === 16 ? 0.673 : m === 32 ? 0.697 : m === 64 ? 0.709 : 0.7213 / (1 + 1.079 / m);
  const e = (alfa * m * m) / suma;
  return e <= 2.5 * m && zero > 0 ? m * Math.log(m / zero) : e;
}

/** Unirea a două schițe de aceeași mărime: maximul pe registru (oamenii lui A sau ai lui B). */
export function uneste(a: Schita, b: Schita): Schita {
  const r = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) r[i] = Math.max(a[i] ?? 0, b[i] ?? 0);
  return r;
}

const CIFRE = '0123456789abcdefghijklmnopqrstuvwxyz';
/** Schița ca text: o cifră în baza 36 pe registru (rangurile sunt sub 34). */
export const textSchita = (s: Schita): string => Array.from(s, (r) => CIFRE[r] ?? '0').join('');
/** Pură: schița din text, dacă are exact `2^p` cifre valide; altfel null. */
export function schitaDin(x: unknown, p: number): Schita | null {
  if (typeof x !== 'string' || x.length !== 1 << p) return null;
  const s = schitaNoua(p);
  for (let i = 0; i < x.length; i++) {
    const r = CIFRE.indexOf(x[i] ?? '');
    if (r < 0 || r > 33 - p) return null;
    s[i] = r;
  }
  return s;
}

// Zilele ----------------------------------------------------------------------------------------------------------------

function offsetMs(ms: number, fus: string): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: fus, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const local = Date.UTC(Number(p['year']), Number(p['month']) - 1, Number(p['day']), Number(p['hour']), Number(p['minute']), Number(p['second']));
  return local - Math.floor(ms / 1000) * 1000;
}

/** Pură: ziua (`AAAA-LL-ZZ`) în care cade un moment, în fusul dat. */
export function ziuaLocala(ms: number, fus: string = FUS_ZI): string {
  return new Date(ms + offsetMs(ms, fus)).toISOString().slice(0, 10);
}

/** Pură: ziua de după (sau de dinainte, cu `n` negativ), în calendar. */
export function adaugaZile(zi: string, n: number): string {
  const [a, l, z] = zi.split('-').map(Number);
  return new Date(Date.UTC(a ?? 0, (l ?? 1) - 1, (z ?? 1) + n)).toISOString().slice(0, 10);
}

/** Pură: momentul în care începe ziua în fusul dat (o zi de schimbare a orei are 23 sau 25 de ore). */
export function inceputulZilei(zi: string, fus: string = FUS_ZI): number {
  const [a, l, z] = zi.split('-').map(Number);
  const utc = Date.UTC(a ?? 0, (l ?? 1) - 1, z ?? 1);
  const t = utc - offsetMs(utc, fus);
  return utc - offsetMs(t, fus);
}

export const RE_ZI = /^\d{4}-\d{2}-\d{2}$/;

// Sumele -----------------------------------------------------------------------------------------------------------------

export type Numere = Record<string, number>;
export interface SumaActiune { n: number; ok: number; de: Numere; motive: Numere; oameni: string }
export interface SumaUnealta { n: number; de: Numere; oameni: string }
export interface SumaDialog { deschis: number; gata: number; renuntat: number }
export interface SumaCalcul { ok: number; eroare: number; anulat: number; ms: Numere }
/** O secvență: de câte ori a apărut și în câte sesiuni. */
export interface SumaSecventa { n: number; s: number }
/** Un pas al pâlniei: câte sesiuni au ajuns la el și schița oamenilor lor (`P_OAMENI`). */
export interface SumaPas { sesiuni: number; oameni: string }

export interface SumeSegment {
  loturi: number;
  evenimente: number;
  aruncate: number;
  sesiuni: number;
  /** Schița oamenilor zilei (`P_OAMENI`). */
  oameni: string;
  /** Câte sesiuni, pe treapta duratei lor în zi (`TREPTE_SESIUNE_MIN`, în minute). */
  durataSesiune: Numere;
  actiuni: Record<string, SumaActiune>;
  unelte: Record<string, SumaUnealta>;
  ferestre: Numere;
  dialoguri: Record<string, SumaDialog>;
  clicuri: Numere;
  derulare: Numere;
  zoom: Numere;
  calcule: Record<string, SumaCalcul>;
  masina: Numere;
  /** Codurile controlerului: `eroare:22`, `alarma:9`. */
  coduriMasina: Numere;
  imprimanta: Numere;
  coduriImprimanta: Numere;
  /** Secvențele cele mai dese (A.10), cheia `a>b>c`. */
  secvente: Record<string, SumaSecventa>;
  palnie: Record<PasPalnie, SumaPas>;
}

export interface SumeZi {
  schema: typeof SCHEMA_ZI;
  zi: string;
  segmente: Record<Segment, SumeSegment>;
}

/** Un lot, cum îl dă jobul: contul, sesiunea, dacă e din personal și evenimentele lui (încă o dată prin lista albă). */
export interface LotZi {
  readonly uid: string;
  readonly sesiune: string;
  readonly personal: boolean;
  readonly evenimente: readonly unknown[];
  readonly aruncate: number;
}

const creste = (x: Numere, k: string, n = 1): void => { x[k] = (x[k] ?? 0) + n; };

/** Pură: pasul pâlniei pe care îl dovedește un eveniment (0: niciunul în afara deschiderii). */
export function pasPalnie(e: Eveniment): number {
  if (e.fel === 'actiune') return e.rez !== 'ok' ? 0 : CONTINUT.has(e.id) ? 1 : ROL.has(e.id) ? 2 : 0;
  if (e.fel === 'calcul') return e.id === 'export' && e.rez === 'ok' ? 3 : 0;
  if (e.fel === 'masina') return e.id === 'pornita' ? 4 : 0;
  return 0;
}

/** Pură: treapta duratei unei sesiuni (ms). */
export function treaptaSesiune(ms: number): number {
  const min = ms / 60_000;
  return TREPTE_SESIUNE_MIN.find((x) => min < x) ?? TREPTE_SESIUNE_MIN[TREPTE_SESIUNE_MIN.length - 1] ?? 0;
}

/**
 * Sumele unei zile, adunate lot cu lot (jobul citește loturile pe pagini, fără să le țină pe toate). Un eveniment care nu
 * mai trece de lista albă de azi (o schemă veche) se numără la aruncate.
 */
/** O sesiune în lucru: timpul primului și ultimului eveniment, contul (doar hash-ul), pașii secvențelor, pasul pâlniei. */
interface InSesiune { min: number; max: number; h: number; pasi: [number, number, string][]; pas: number }

interface InLucru {
  loturi: number; evenimente: number; aruncate: number; oameni: Schita;
  sesiuni: Map<string, InSesiune>;
  actiuni: Map<string, { n: number; ok: number; de: Numere; motive: Numere; oameni: Schita }>;
  unelte: Map<string, { n: number; de: Numere; oameni: Schita }>;
  ferestre: Numere; dialoguri: Record<string, SumaDialog>; clicuri: Numere; derulare: Numere; zoom: Numere;
  calcule: Record<string, SumaCalcul>; masina: Numere; coduriMasina: Numere; imprimanta: Numere; coduriImprimanta: Numere;
}

/** Pură: secvențele (cele mai dese, pe fiecare lungime) și pâlnia, din sesiunile zilei. */
function fluxuri(sesiuni: Iterable<InSesiune>): { secvente: Record<string, SumaSecventa>; palnie: Record<PasPalnie, SumaPas> } {
  const toate = new Map<string, SumaSecventa>();
  const pasi = PASI_PALNIE.map(() => ({ sesiuni: 0, oameni: schitaNoua(P_OAMENI) }));
  for (const ses of sesiuni) {
    for (let k = 0; k <= ses.pas; k++) {
      const p = pasi[k];
      if (!p) continue;
      p.sesiuni++;
      adaugaInSchita(p.oameni, P_OAMENI, ses.h);
    }
    // În ordinea timpului (loturile pot sosi în altă ordine), cu repetările la rând lipite.
    const ordonati = [...ses.pasi].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const ids = ordonati.map((p) => p[2]).filter((id, i, a) => i === 0 || id !== a[i - 1]);
    const vazute = new Set<string>();
    for (const L of LUNGIMI_SECVENTA) {
      for (let i = 0; i + L <= ids.length; i++) {
        const k = ids.slice(i, i + L).join('>');
        const v = toate.get(k) ?? { n: 0, s: 0 };
        v.n++;
        if (!vazute.has(k)) {
          vazute.add(k);
          v.s++;
        }
        toate.set(k, v);
      }
    }
  }
  const secvente: Record<string, SumaSecventa> = {};
  for (const L of LUNGIMI_SECVENTA) {
    const pastrate = [...toate].filter(([k]) => k.split('>').length === L)
      .sort(([ka, a], [kb, b]) => b.s - a.s || b.n - a.n || (ka < kb ? -1 : ka > kb ? 1 : 0)).slice(0, SECVENTE_PE_LUNGIME);
    for (const [k, v] of pastrate) secvente[k] = v;
  }
  const palnie = Object.fromEntries(PASI_PALNIE.map((p, i) => {
    const x = pasi[i] ?? { sesiuni: 0, oameni: schitaNoua(P_OAMENI) };
    return [p, { sesiuni: x.sesiuni, oameni: textSchita(x.oameni) }];
  })) as Record<PasPalnie, SumaPas>;
  return { secvente, palnie };
}

export class SumatorZi {
  private readonly s: Record<Segment, InLucru>;
  private readonly zi: string;
  /** Ordinea sosirii, ca pașii cu același timp să rămână în ordinea lor. */
  private ord = 0;

  constructor(zi: string) {
    this.zi = zi;
    const gol = (): InLucru => ({
      loturi: 0, evenimente: 0, aruncate: 0, oameni: schitaNoua(P_OAMENI), sesiuni: new Map(), actiuni: new Map(), unelte: new Map(),
      ferestre: {}, dialoguri: {}, clicuri: {}, derulare: {}, zoom: {}, calcule: {}, masina: {}, coduriMasina: {}, imprimanta: {},
      coduriImprimanta: {},
    });
    this.s = { clienti: gol(), personal: gol() };
  }

  adauga(l: LotZi): void {
    const s = this.s[l.personal ? 'personal' : 'clienti'];
    const h = hash32(l.uid);
    s.loturi++;
    s.aruncate += l.aruncate;
    adaugaInSchita(s.oameni, P_OAMENI, h);
    const ses = s.sesiuni.get(l.sesiune) ?? { min: Infinity, max: -Infinity, h, pasi: [], pas: 0 };
    s.sesiuni.set(l.sesiune, ses);
    for (const x of l.evenimente) {
      const e: Eveniment | null = evenimentDin(x, Number.MAX_SAFE_INTEGER);
      if (!e) {
        s.aruncate++;
        continue;
      }
      s.evenimente++;
      ses.min = Math.min(ses.min, e.t);
      ses.max = Math.max(ses.max, e.t);
      ses.pas = Math.max(ses.pas, pasPalnie(e));
      if (e.fel === 'actiune' && e.rez === 'ok' && intraInSecventa(e.id)) ses.pasi.push([e.t, this.ord++, e.id]);
      switch (e.fel) {
        case 'actiune': {
          const a = s.actiuni.get(e.id) ?? { n: 0, ok: 0, de: {}, motive: {}, oameni: schitaNoua(P_ACTIUNE) };
          s.actiuni.set(e.id, a);
          const n = e.n ?? 1;
          a.n += n;
          if (e.rez === 'ok') a.ok += n;
          else creste(a.motive, e.rez, n);
          creste(a.de, e.de, n);
          adaugaInSchita(a.oameni, P_ACTIUNE, h);
          break;
        }
        case 'unealta': {
          const u = s.unelte.get(e.id) ?? { n: 0, de: {}, oameni: schitaNoua(P_ACTIUNE) };
          s.unelte.set(e.id, u);
          u.n++;
          creste(u.de, e.de);
          adaugaInSchita(u.oameni, P_ACTIUNE, h);
          break;
        }
        case 'fereastra': creste(s.ferestre, e.id); break;
        case 'dialog': {
          const d = s.dialoguri[e.id] ?? { deschis: 0, gata: 0, renuntat: 0 };
          s.dialoguri[e.id] = d;
          d[e.rez]++;
          break;
        }
        case 'clic': creste(s.clicuri, e.id, e.n ?? 1); break;
        case 'derulare': creste(s.derulare, e.de, e.n); break;
        case 'zoom': creste(s.zoom, e.de, e.n); break;
        case 'calcul': {
          const c = s.calcule[e.id] ?? { ok: 0, eroare: 0, anulat: 0, ms: {} };
          s.calcule[e.id] = c;
          c[e.rez]++;
          creste(c.ms, String(e.ms));
          break;
        }
        case 'masina':
          creste(s.masina, e.id);
          if (e.cod !== undefined) creste(s.coduriMasina, `${e.id}:${e.cod}`);
          break;
        case 'imprimanta':
          creste(s.imprimanta, e.id);
          if (e.cod !== undefined) creste(s.coduriImprimanta, `${e.id}:${e.cod}`);
          break;
      }
    }
  }

  rezultat(): SumeZi {
    const segment = (x: InLucru): SumeSegment => {
      const durataSesiune: Numere = {};
      for (const { min, max } of x.sesiuni.values()) creste(durataSesiune, String(treaptaSesiune(max >= min ? max - min : 0)));
      const { secvente, palnie } = fluxuri(x.sesiuni.values());
      return {
        loturi: x.loturi, evenimente: x.evenimente, aruncate: x.aruncate, sesiuni: x.sesiuni.size, oameni: textSchita(x.oameni), durataSesiune,
        actiuni: Object.fromEntries([...x.actiuni].map(([k, a]) => [k, { n: a.n, ok: a.ok, de: a.de, motive: a.motive, oameni: textSchita(a.oameni) }])),
        unelte: Object.fromEntries([...x.unelte].map(([k, u]) => [k, { n: u.n, de: u.de, oameni: textSchita(u.oameni) }])),
        ferestre: x.ferestre, dialoguri: x.dialoguri, clicuri: x.clicuri, derulare: x.derulare, zoom: x.zoom, calcule: x.calcule,
        masina: x.masina, coduriMasina: x.coduriMasina, imprimanta: x.imprimanta, coduriImprimanta: x.coduriImprimanta,
        secvente, palnie,
      };
    };
    return { schema: SCHEMA_ZI, zi: this.zi, segmente: { clienti: segment(this.s.clienti), personal: segment(this.s.personal) } };
  }
}
