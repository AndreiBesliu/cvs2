import {
  COD_MAX, evenimentDin, EVENIMENTE_PE_LOT, idBun, REPETARI_MAX, rezultatBun, setariPublice, setariUtilizareDin, treaptaMarime,
  treaptaMs, type ContextLot, type Eveniment, type Fereastra, type Lot, type SetariPublice, type Sursa,
} from '../../shared/utilizare.ts';
import type { Config } from './config.ts';
import { contTinut } from './dreptCont.ts';
import type { Depozit } from './jurnalErori.ts';
import type { Inregistrator, LotTinut, RezultatPompa } from './utilizareTipuri.ts';
import { preiaUtilizarea, trimiterea } from './utilizare.ts';
import { urmaresteControalele } from './utilizareDom.ts';

export type { Inregistrator, LotTinut, RezultatPompa } from './utilizareTipuri.ts';

/**
 * Înregistratorul utilizării aplicației (ADR 0262, felia A.8b), bucata adusă imediat după pornire (în precache: merge și
 * offline), fără Firebase. Pornirea îi dă evenimentele, cu timpul și sursa prinse când s-au întâmplat (`utilizare.ts`).
 * Fiecare intră în inelul pașilor dinaintea unei erori (ținut doar în memorie) și, cu colectarea pornită și un cont deschis,
 * în lotul de acum. Lotul se închide la minutele din setări, la 200 de evenimente și la ascunderea paginii, și așteaptă în
 * browser, cu contul lui, până îl trimite bucata contului (`trimiteUtilizarea` din `PanouCont.tsx`, adusă de editare): un
 * lot ținut supraviețuiește închiderii filei și lipsei rețelei. Doar id-urile din lista albă (`shared/utilizare.ts`) intră;
 * un motiv din afara ei devine „motiv.altul”.
 */

export const CHEIE_SETARI_UTILIZARE = 'cncvs2.utilizare.setari';
export const CHEIE_LOTURI_UTILIZARE = 'cncvs2.utilizare.loturi';
/** Câte evenimente așteaptă în browser, cel mult: peste ele, loturile cele mai vechi pleacă întâi. */
export const EVENIMENTE_IN_ASTEPTARE = 2_000;
/** O acțiune repetată la rând (același id, aceeași sursă, același rezultat) se numără în aceeași, până la o pauză atât de lungă. */
export const PAUZA_REPETARE_MS = 2_000;

export interface DepsInregistrator {
  /** Ceasul sesiunii: ms de la încărcarea paginii. */
  readonly ceas: () => number;
  readonly sesiune: string;
  readonly depozit: Depozit | null;
  readonly context: () => ContextLot;
  /** Contul deschis acum (cel ținut de aplicație), sau null. */
  readonly cont: () => string | null;
  /** De unde a pornit gestul de acum (pentru `actiune` și `unealta`; pornirea le dă gata făcute, prin `primeste`). */
  readonly sursa: () => Sursa;
  /** Lotul s-a umplut și s-a închis singur: e de trimis. */
  readonly laLotPlin?: () => void;
}

/** O acțiune ținută ca să-i numărăm repetările (în lot și în inel e același obiect). */
type Numarabil = Eveniment & { n?: number };

/**
 * Calculele, mașina și imprimanta (felia A.8d) vin cu valorile brute: durata și mărimile se fac trepte aici, iar un cod din
 * afara marginilor se lasă deoparte (evenimentul rămâne). Apoi trec prin lista albă, ca pe server.
 */
export function inTrepte(ev: Eveniment): Eveniment {
  if (ev.fel === 'calcul') {
    return {
      ...ev, ms: treaptaMs(ev.ms), ...(ev.forme === undefined ? {} : { forme: treaptaMarime(ev.forme) }),
      ...(ev.octeti === undefined ? {} : { octeti: treaptaMarime(ev.octeti) }),
    };
  }
  if ((ev.fel === 'masina' || ev.fel === 'imprimanta') && ev.cod !== undefined && !(Number.isSafeInteger(ev.cod) && ev.cod >= 0 && ev.cod <= COD_MAX)) {
    const { cod: _cod, ...fara } = ev;
    return fara;
  }
  return ev;
}

/** Un gest de derulare sau de zoom: treptele rotiței care vin una după alta, fără o pauză atât de lungă. */
export const PAUZA_GEST_MS = 600;

/**
 * Ce se numără într-un singur eveniment: aceeași cheie, fără o pauză mai lungă decât a ei. O acțiune sau un clic repetat
 * (același id, aceeași sursă, același rezultat), până la 2 s între ele; treptele unui gest de derulare sau de zoom.
 */
function repetare(ev: Eveniment): { readonly cheie: string; readonly pauza: number; readonly pas: number } | null {
  switch (ev.fel) {
    case 'actiune': return { cheie: `a ${ev.id} ${ev.de} ${ev.rez}`, pauza: PAUZA_REPETARE_MS, pas: 1 };
    case 'clic': return { cheie: `c ${ev.id} ${ev.de}`, pauza: PAUZA_REPETARE_MS, pas: 1 };
    case 'derulare':
    case 'zoom': return { cheie: `${ev.fel} ${ev.de}`, pauza: PAUZA_GEST_MS, pas: ev.n };
    default: return null;
  }
}

const obiect = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : null);

/** Pură: textul stocării, citit (lipsă sau stricat: null). */
function json(text: string | null): unknown {
  try {
    return JSON.parse(text ?? 'null');
  } catch {
    return null;
  }
}

/** Pură: coada din textul stocării (lipsă, stricată: goală); serverul judecă oricum fiecare lot. */
function loturiDin(text: string | null): LotTinut[] {
  const l = obiect(json(text))?.['loturi'];
  return Array.isArray(l) ? l.filter((x): x is LotTinut => typeof obiect(x)?.['uid'] === 'string' && obiect(obiect(x)?.['lot']) !== null) : [];
}

export function creeazaInregistrator(d: DepsInregistrator): Inregistrator {
  const citeste = (k: string): string | null => {
    try {
      return d.depozit?.getItem(k) ?? null;
    } catch {
      return null;
    }
  };
  const scrie = (k: string, v: unknown): void => {
    try {
      d.depozit?.setItem(k, JSON.stringify(v));
    } catch {
      // Depozitul plin sau blocat: rămâne ce e în memorie, pentru fila asta.
    }
  };
  let setari = setariPublice(setariUtilizareDin(json(citeste(CHEIE_SETARI_UTILIZARE))).setari);
  let inMemorie: LotTinut[] = [];
  const coadaAcum = (): LotTinut[] => (d.depozit ? loturiDin(citeste(CHEIE_LOTURI_UTILIZARE)) : inMemorie);
  const puneCoada = (l: LotTinut[]): void => {
    inMemorie = l;
    scrie(CHEIE_LOTURI_UTILIZARE, { v: 1, loturi: l });
  };
  let inel: Eveniment[] = [];
  let lot: Eveniment[] = [];
  let nr = 0;
  let ultima: { readonly ev: Numarabil; readonly cheie: string; cand: number } | null = null;

  const inchide = (evenimente: Eveniment[]): void => {
    const uid = d.cont();
    if (!uid) return;
    const l: LotTinut = { uid, lot: { sesiune: d.sesiune, nr: ++nr, acum: d.ceas(), context: d.context(), evenimente } };
    const toate = [...coadaAcum(), l];
    let n = toate.reduce((s, x) => s + x.lot.evenimente.length, 0);
    while (n > EVENIMENTE_IN_ASTEPTARE && toate.length > 1) n -= toate.shift()?.lot.evenimente.length ?? 0;
    puneCoada(toate);
  };

  let reusite = 0;
  const pune = (ev: Eveniment): void => {
    if (ev.fel === 'actiune' && ev.rez === 'ok') reusite++;
    const acum = d.ceas();
    const u = ultima;
    const r = repetare(ev);
    if (r && u && u.cheie === r.cheie && acum - u.cand <= r.pauza && (u.ev.n ?? 1) + r.pas <= REPETARI_MAX) {
      u.ev.n = (u.ev.n ?? 1) + r.pas;
      u.cand = acum;
      return;
    }
    ultima = r ? { ev: ev as Numarabil, cheie: r.cheie, cand: acum } : null;
    if (setari.pasiEroare > 0) inel = [...inel, ev].slice(-setari.pasiEroare);
    if (!setari.colectare || !d.cont()) return;
    lot.push(ev);
    if (lot.length >= EVENIMENTE_PE_LOT) {
      inchideLotul();
      d.laLotPlin?.();
    }
  };

  function inchideLotul(): void {
    ultima = null;
    if (lot.length === 0) return;
    const l = lot;
    lot = [];
    inchide(l);
  }

  /**
   * Lista albă și în client: un id din afara ei nu intră; un motiv din afara ei devine „motiv.altul”. Clicurile fine, derularea
   * și zoom-ul intră doar cu ele pornite din Setări.
   */
  const primeste = (ev: Eveniment): void => {
    if ((ev.fel === 'clic' || ev.fel === 'derulare' || ev.fel === 'zoom') && !setari.clicuri) return;
    if (ev.fel === 'calcul' || ev.fel === 'masina' || ev.fel === 'imprimanta') {
      const x = evenimentDin(inTrepte(ev), Number.MAX_SAFE_INTEGER);
      if (x) pune(x);
      return;
    }
    if (!('id' in ev) || ev.fel === 'fereastra') pune(ev);
    else if (idBun(ev.id)) pune(ev.fel === 'actiune' && !rezultatBun(ev.rez) ? { ...ev, rez: 'motiv.altul' } : ev);
  };

  return {
    primeste,
    actiune(id, rez) {
      primeste({ fel: 'actiune', t: d.ceas(), id, de: d.sursa(), rez });
    },
    fereastra(id) {
      primeste({ fel: 'fereastra', t: d.ceas(), id });
    },
    unealta(id) {
      primeste({ fel: 'unealta', t: d.ceas(), id, de: d.sursa() });
    },
    inchideLotul,
    intreabaSetarile() {
      inchide([]);
    },
    loturi: coadaAcum,
    scoate(sesiune, n) {
      puneCoada(coadaAcum().filter((x) => x.lot.sesiune !== sesiune || x.lot.nr !== n));
    },
    primesteSetari(s) {
      setari = s;
      scrie(CHEIE_SETARI_UTILIZARE, s);
      if (!s.colectare) {
        lot = [];
        puneCoada([]);
      }
    },
    golesteTot() {
      lot = [];
      puneCoada([]);
    },
    setari: () => setari,
    pasi: () => inel,
    inLot: () => lot.length,
    reusite: () => reusite,
  };
}

export interface DepsPompa {
  readonly ins: Inregistrator;
  readonly cont: () => string | null;
  /** Trimite coada (bucata contului, la cerere). */
  readonly trimite: () => Promise<RezultatPompa>;
  readonly amana: (f: () => void, ms: number) => void;
}

/**
 * Pompa: la pornire (cu colectarea oprită, întâi întrebarea setărilor), apoi la minutele lotului, la un lot plin și la
 * ascunderea paginii (`impinge`). O singură trimitere odată; un refuz („stins”) oprește sesiunea (ce rămâne în coadă,
 * hotărăște trimiterea: `trimiteCoada`).
 */
export function creeazaPompa(d: DepsPompa): { porneste(): void; impinge(): void } {
  let inLucru = false;
  let stins = false;
  const impinge = (): void => {
    if (stins || inLucru || !d.cont() || d.ins.loturi().length === 0) return;
    inLucru = true;
    d.trimite().then((r) => {
      inLucru = false;
      if (r === 'stins') stins = true;
    }, () => {
      // Bucata contului n-a venit (rețeaua, o publicare nouă): loturile așteaptă sesiunea următoare.
      stins = true;
    });
  };
  const ceas = (): void => {
    d.amana(() => {
      d.ins.inchideLotul();
      impinge();
      ceas();
    }, d.ins.setari().lotMinute * 60_000);
  };
  return {
    porneste() {
      if (!d.ins.setari().colectare && d.cont()) d.ins.intreabaSetarile();
      impinge();
      ceas();
    },
    impinge,
  };
}

/** Ce citește contextul din mediu (în browser, din pagină; în probe, scris de mână). */
export interface Mediu {
  readonly versiune: string;
  readonly limba: string;
  readonly aranjament: string | undefined;
  /** Tema aleasă (`auto`, `luminoasa`, `intunecata`). */
  readonly tema: string | undefined;
  /** Sistemul cere tema întunecată. */
  readonly intunecat: boolean;
  readonly latime: number;
  readonly ua: string;
  readonly atingere: boolean;
  readonly online: boolean;
}

/** Pură: contextul lotului, în trepte și din listele contractului. */
export function contextDinMediu(m: Mediu): ContextLot {
  const ua = m.ua;
  return {
    versiune: /^[A-Za-z0-9._-]{1,40}$/.test(m.versiune) ? m.versiune : 'necunoscuta',
    limba: m.limba === 'en' ? 'en' : 'ro',
    aranjament: m.aranjament !== undefined && /^[a-z][a-z0-9-]{0,31}$/.test(m.aranjament) ? m.aranjament : 'necunoscut',
    tema: m.tema === 'intunecata' || (m.tema !== 'luminoasa' && m.intunecat) ? 'inchisa' : 'deschisa',
    ecran: m.latime < 600 ? 'telefon' : m.latime < 1024 ? 'tableta' : m.latime < 1600 ? 'laptop' : 'mare',
    browser: ua.includes('Edg/') ? 'edge' : ua.includes('Firefox/') ? 'firefox' : ua.includes('Chrome/') ? 'chrome' : ua.includes('Safari/') ? 'safari' : 'altul',
    atingere: m.atingere,
    online: m.online,
  };
}

/** Id-ul sesiunii: 16 litere mici și cifre, aleatoare, altul la fiecare încărcare. */
export function idSesiune(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => (b % 36).toString(36)).join('');
}

/** Cât așteaptă pompa după pornire, ca bucata contului să nu concureze cu prima randare. */
const AMANARE_POMPA_MS = 5_000;

/**
 * Colectarea paginii (o pornește `main.tsx`, doar în editor): înregistratorul preia evenimentele pornirii (și pe cele de
 * dinaintea lui) și, cu Firebase, pompa: lotul la minutele din setări, la un lot plin și la ascunderea paginii, trimis prin
 * bucata contului, pe care o aduce editarea (`seteazaTrimiterea`).
 */
export function pornesteColectarea(o: { readonly config: Config | null; readonly depozit: Depozit | null; readonly versiune: string; readonly limba: () => string }): void {
  const html = document.documentElement;
  const cont = (): string | null => contTinut()?.uid ?? null;
  let pompa: { impinge(): void } | null = null;
  const ins = creeazaInregistrator({
    ceas: () => Math.round(performance.now()),
    sesiune: idSesiune(),
    depozit: o.depozit,
    context: () => contextDinMediu({
      versiune: o.versiune, limba: o.limba(), aranjament: html.dataset['aranjament'], tema: html.dataset['tema'],
      intunecat: matchMedia('(prefers-color-scheme: dark)').matches, latime: innerWidth, ua: navigator.userAgent,
      atingere: matchMedia('(pointer: coarse)').matches, online: navigator.onLine,
    }),
    cont,
    sursa: () => 'alt',
    laLotPlin: () => { pompa?.impinge(); },
  });
  preiaUtilizarea(ins.primeste);
  urmaresteControalele({ doc: document, win: window, ceas: () => Math.round(performance.now()), primeste: ins.primeste, reusite: ins.reusite });
  const config = o.config;
  if (!config?.firebase) return;
  const p = creeazaPompa({
    ins, cont, amana: (f, ms) => { setTimeout(f, ms); },
    // Bucata contului vine prin editare; până atunci, loturile așteaptă (ca fără rețea).
    trimite: () => trimiterea()?.(config, ins) ?? Promise.resolve('retea'),
  });
  pompa = p;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    ins.inchideLotul();
    p.impinge();
  });
  setTimeout(() => { p.porneste(); }, AMANARE_POMPA_MS);
}
