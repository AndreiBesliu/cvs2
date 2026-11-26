/**
 * Setările cotelor în cont (ADR 0330, întrebarea 14a, felia 10.4↑g), pe modelul bibliotecii de freze: setările din browser
 * sunt mereu cele de lucru; o trecere citește ce e în cont și, după îmbinarea câmp cu câmp față de ultima versiune comună
 * (`preferinteSincron.ts`), pune aici ce a venit și trimite ce s-a schimbat aici, cu versiunea văzută. Un câmp schimbat
 * altfel aici și în cont e o ciocnire: rămâne ca aici și nu pleacă nimic până nu alege omul („Păstrează-le pe ale mele” /
 * „Ia-le pe cele din cont”, în Setări › Cotele) sau până nu pune el însuși aceeași valoare ca în cont. Fără capabilitatea `cloud`, fără rețea sau fără cont, setările rămân aici.
 *
 * Bucata aceasta vine la cerere: la deschiderea ferestrei Setări și la alegerea uneltei Cote, cu contul deschis. Se trece
 * atunci, după fiecare schimbare (2 s fără alta) cât e adusă, și la revenirea rețelei; niciodată la pornirea aplicației.
 * Cererile pleacă prin bucata contului (`PanouCont.tsx`): modulul ăsta n-are Firebase.
 */
import { useSyncExternalStore } from 'react';
import type { CheiePreferinte, CererePreferinte, RaspunsCitestePreferinte, RaspunsScriePreferinte } from '../../shared/preferinte.ts';
import { cuValorileDinCont, imbinaPreferinte, type Cale } from '../model/preferinteSincron.ts';
import type { Config } from './config.ts';
import { ascultaSetariCote, citesteSetariCote, schimbaSetariCote, setariCote, SETARI_IMPLICITE, textSetariCote } from './setariCote.ts';

/** O cerere către callable-ul `preferinte`; aruncă erorile clientului Firebase (cu `code`). */
export type ChemarePreferinte = (c: CererePreferinte) => Promise<RaspunsCitestePreferinte | RaspunsScriePreferinte>;

/**
 * Cum s-a încheiat trecerea: la zi; o ciocnire, de ales de om; doar citire (planul fără `cloud`); fără rețea; contul (altul
 * logat, ieșit, neconfirmat); altă eroare.
 */
export type FelSetari = 'la-zi' | 'ciocnire' | 'citire' | 'fara-retea' | 'cont' | 'eroare';

/** Ce ține browserul despre cont: versiunea și textul văzute ultima oară (baza îmbinării) și ciocnirea neîmpăcată. */
export type StarePreferinte = {
  readonly uid: string;
  readonly versiune: number;
  readonly baza: string;
  readonly ciocnire: { readonly versiune: number; readonly json: string; readonly cai: readonly Cale[] } | null;
};

/** Ce îi trebuie unei treceri (în aplicație, setările cotelor; în probe, un server și un browser închipuite). */
export type DepPreferinte = {
  readonly uid: string;
  readonly cheie: CheiePreferinte;
  readonly cheama: ChemarePreferinte;
  /** Setările de aici, ca text normalizat. */
  readonly aici: () => string;
  /** Pune aici un text (normalizat). */
  readonly pune: (text: string) => void;
  /** Textul normalizat al unui JSON (null: implicitele). */
  readonly normal: (json: string | null) => string;
  readonly stare: () => StarePreferinte | null;
  readonly tine: (s: StarePreferinte) => void;
};

/** Felul unei erori a cererii (ca la biblioteca de freze). */
export function felEroareSetari(e: unknown): FelSetari {
  const cod = (e as { code?: unknown } | null)?.code;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'fara-retea';
  switch (cod) {
    case 'functions/unavailable': case 'functions/deadline-exceeded': case 'functions/cancelled': return 'fara-retea';
    case 'functions/permission-denied': return 'citire';
    case 'functions/unauthenticated': case 'functions/failed-precondition': case 'cont/altul': case 'cont/indisponibil': return 'cont';
    default:
      // Bucata contului n-a venit (fără rețea): importul cade cu o eroare de tip, fără cod.
      return cod === undefined && e instanceof TypeError ? 'fara-retea' : 'eroare';
  }
}

const obiectDin = (text: string): Record<string, unknown> => JSON.parse(text) as Record<string, unknown>;

/** O trecere: citește contul, îmbină, pune aici, scrie (de cel mult trei ori, cât contul se mai schimbă între timp). */
export async function treceSetarile(d: DepPreferinte): Promise<FelSetari> {
  try {
    const tinuta = d.stare();
    const st = tinuta?.uid === d.uid ? tinuta : null;
    let vb = st?.versiune ?? 0, baza = st?.baza ?? d.normal(null);
    let r = await d.cheama({ actiune: 'citeste', cheie: d.cheie }) as RaspunsCitestePreferinte;
    for (let runda = 0; runda < 3; runda++) {
      // O ciocnire ținută se socotește din nou: dacă omul a pus între timp, de mână, valoarea din cont, nu mai e ciocnire.
      const aici = d.aici();
      let deScris: string;
      if (r.versiune === vb) {
        if (aici === baza) return 'la-zi';
        deScris = aici;
      } else {
        const cont = d.normal(r.versiune === 0 ? null : r.json);
        const m = imbinaPreferinte(obiectDin(baza), obiectDin(aici), obiectDin(cont));
        const rez = d.normal(JSON.stringify(m.rezultat));
        if (rez !== aici) d.pune(rez);
        if (m.ciocniri.length > 0) {
          d.tine({ uid: d.uid, versiune: vb, baza, ciocnire: { versiune: r.versiune, json: cont, cai: m.ciocniri } });
          return 'ciocnire';
        }
        d.tine({ uid: d.uid, versiune: r.versiune, baza: cont, ciocnire: null });
        vb = r.versiune;
        baza = cont;
        if (rez === cont) return 'la-zi';
        deScris = rez;
      }
      if (!r.poateScrie) return 'citire';
      const w = await d.cheama({ actiune: 'scrie', cheie: d.cheie, vazuta: r.versiune, json: deScris }) as RaspunsScriePreferinte;
      if (w.stare === 'scrisa') {
        d.tine({ uid: d.uid, versiune: w.versiune, baza: deScris, ciocnire: null });
        return 'la-zi';
      }
      r = { ok: true, versiune: w.versiune, json: w.json, poateScrie: true };
    }
    return 'eroare';
  } catch (e) {
    return felEroareSetari(e);
  }
}

/**
 * Ciocnirea, la alegerea omului: „aici” păstrează setările de acum, „cont” ia valorile din cont pe câmpurile ciocnite. Baza
 * devine textul din cont, deci trecerea următoare trimite ce a rămas diferit.
 */
export function rezolvaCiocnireaSetarilor(d: Pick<DepPreferinte, 'uid' | 'aici' | 'pune' | 'normal' | 'stare' | 'tine'>, alegere: 'aici' | 'cont'): boolean {
  const st = d.stare();
  if (!st || st.uid !== d.uid || !st.ciocnire) return false;
  const aici = d.aici(), c = st.ciocnire;
  const rez = alegere === 'cont' ? d.normal(JSON.stringify(cuValorileDinCont(obiectDin(aici), obiectDin(c.json), c.cai))) : aici;
  if (rez !== aici) d.pune(rez);
  d.tine({ uid: d.uid, versiune: c.versiune, baza: c.json, ciocnire: null });
  return true;
}

/* ── Setările cotelor, în aplicație ─────────────────────────────────────────────────────────────────────────────── */

/** Ce ține browserul despre setările cotelor din cont. */
export const CHEIE_STARE_COTE_CONT = 'cncvs2.cote.cont';

function stareCote(): StarePreferinte | null {
  try {
    const x: unknown = JSON.parse(localStorage.getItem(CHEIE_STARE_COTE_CONT) ?? 'null');
    if (typeof x !== 'object' || x === null) return null;
    const s = x as Record<string, unknown>;
    const c = s['ciocnire'] as Record<string, unknown> | null | undefined;
    const ciocnire = c && typeof c['versiune'] === 'number' && typeof c['json'] === 'string' && Array.isArray(c['cai'])
      ? { versiune: c['versiune'], json: c['json'], cai: (c['cai'] as unknown[]).filter((k): k is string[] => Array.isArray(k) && k.every((p) => typeof p === 'string')) }
      : null;
    return typeof s['uid'] === 'string' && typeof s['versiune'] === 'number' && typeof s['baza'] === 'string'
      ? { uid: s['uid'], versiune: s['versiune'], baza: s['baza'], ciocnire }
      : null;
  } catch {
    return null;
  }
}

/** Starea legăturii: se trece acum, cum s-a încheiat ultima trecere, câte câmpuri sunt în ciocnire. */
export type StareSetariCont = { readonly ruleaza: boolean; readonly ultima: FelSetari | null; readonly ciocniri: number };

let legat: { readonly uid: string; readonly config: Config } | null = null;
let stare: StareSetariCont = { ruleaza: false, ultima: null, ciocniri: 0 };
let dinNou = false, aplic = false, ceas: ReturnType<typeof setTimeout> | null = null, ascultat = false;
const ascultatori = new Set<() => void>();

function puneStare(s: StareSetariCont): void {
  stare = s;
  for (const f of ascultatori) f();
}

const ciocniriTinute = (uid: string): number => {
  const s = stareCote();
  return s?.uid === uid ? s.ciocnire?.cai.length ?? 0 : 0;
};

function dep(uid: string, config: Config): DepPreferinte {
  return {
    uid,
    cheie: 'cote',
    cheama: (c) => import('./PanouCont.tsx').then((m) => m.cheamaPreferintele(config, uid, c)),
    aici: () => textSetariCote(setariCote()),
    pune: (text) => {
      aplic = true;
      try {
        schimbaSetariCote(citesteSetariCote(text));
      } finally {
        aplic = false;
      }
    },
    normal: (json) => textSetariCote(json === null ? SETARI_IMPLICITE : citesteSetariCote(json)),
    stare: stareCote,
    tine: (s) => {
      try {
        localStorage.setItem(CHEIE_STARE_COTE_CONT, JSON.stringify(s));
      } catch {
        // Fără stocare: baza ține doar cât pagina (trecerea următoare îmbină din nou față de implicite).
      }
    },
  };
}

/** Pornește o trecere acum (sau după cea care rulează). */
function porneste(): void {
  const l = legat;
  if (!l) return;
  if (stare.ruleaza) { dinNou = true; return; }
  puneStare({ ...stare, ruleaza: true });
  void treceSetarile(dep(l.uid, l.config)).then((fel) => {
    if (legat !== l) return;
    puneStare({ ruleaza: false, ultima: fel, ciocniri: ciocniriTinute(l.uid) });
    if (dinNou) { dinNou = false; porneste(); }
  });
}

/** După o schimbare a setărilor (nu una venită din cont): o trecere la 2 s fără alta. */
function programeaza(): void {
  if (aplic || !legat) return;
  if (ceas !== null) clearTimeout(ceas);
  ceas = setTimeout(() => { ceas = null; porneste(); }, 2000);
}

/**
 * Leagă setările cotelor de contul deschis (`uid`, cu configurația aplicației) și pornește o trecere; fără cont sau fără
 * configurație, le dezleagă (rămân în browser). Chemată de fereastra Setări și de unealta Cote.
 */
export function legaSetarileCotelor(uid: string | null, config: Config | null): void {
  if (!ascultat && typeof window !== 'undefined') {
    ascultat = true;
    ascultaSetariCote(programeaza);
    window.addEventListener('online', () => { porneste(); });
  }
  if (uid === null || config === null) {
    if (legat !== null) {
      legat = null;
      puneStare({ ruleaza: false, ultima: null, ciocniri: 0 });
    }
    return;
  }
  if (legat?.uid === uid && legat.config === config) return;
  legat = { uid, config };
  puneStare({ ruleaza: false, ultima: null, ciocniri: ciocniriTinute(uid) });
  porneste();
}

/** Ciocnirea setărilor cotelor, la alegerea omului; apoi o trecere (pleacă ce a rămas diferit). */
export function alegeLaCiocnire(alegere: 'aici' | 'cont'): void {
  const l = legat;
  if (!l) return;
  if (rezolvaCiocnireaSetarilor(dep(l.uid, l.config), alegere)) {
    puneStare({ ...stare, ciocniri: 0 });
    porneste();
  }
}

/** Starea legăturii, ca stare React. */
export function useStareSetariCont(): StareSetariCont {
  return useSyncExternalStore((f) => { ascultatori.add(f); return () => { ascultatori.delete(f); }; }, () => stare, () => stare);
}
