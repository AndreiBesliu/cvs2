/**
 * Biblioteca de freze din browser (ADR 0300 §7, felia 16.A↑a): IndexedDB `cncvs2-freze`, o înregistrare pe bibliotecă
 * (`{ v, freze }`), cu cheia `local` (fără cont) și, din felia 16.A↑c, `cont:<uid>` pentru fiecare cont, cu starea
 * sincronizării lângă freze (`sincron`). Fiecare schimbare citește, schimbă și scrie într-o singură tranzacție, deci două
 * file nu-și pierd schimbările; celelalte file află printr-un `BroadcastChannel`. Câmpurile înregistrării pe care o schimbare
 * nu le atinge (starea sincronizării, ale unei versiuni mai noi) rămân.
 *
 * Frezele pe care versiunea de azi nu le poate citi (ale unei versiuni mai noi) rămân neatinse la scriere, iar numele lor
 * rămân luate. O listă scrisă de o versiune mai nouă doar se citește. Fără stocare (fereastră privată, date blocate), sau
 * după o scriere căzută, biblioteca ține cât fila, iar starea o spune (ca Rolurile mele, ADR 0114 §3).
 */
import { useSyncExternalStore } from 'react';
import {
  cuFreza, cuGrupRedenumit, cuImport, cuStandard, faraFreza, frezaDinDate, type Freza, type FrezaSalvata, type FrezaStandard, type PoliticaImport,
  type ProblemeFreza,
} from '../model/freza.ts';
import { sincronDate, sincronDin, type BibliotecaCont, type StareSincron } from '../model/frezeSincron.ts';

export const BAZA_FREZE = 'cncvs2-freze';
const BIBLIOTECI = 'biblioteci';
/** Cheia bibliotecii fără cont. */
export const CHEIE_LOCALA = 'local';
/** Cheia bibliotecii unui cont (ADR 0300 §7): copia lui din browser, sincronizată cu contul. */
export const cheieCont = (uid: string): string => `cont:${uid}`;
/** Cheia bibliotecii folosite acum (ADR 0300 §7): a contului cu dreptul primit (adresa confirmată), altfel cea fără cont. */
export const cheieBibliotecii = (cont: { readonly uid: string; readonly drept: unknown } | null): string => (cont?.drept ? cheieCont(cont.uid) : CHEIE_LOCALA);
export const VERSIUNE_FREZE = 1;

/** Ce citește și scrie stocarea: în browser IndexedDB, în teste un fals. */
export type DepozitFreze = {
  citeste(cheie: string): Promise<unknown>;
  /** Citește valoarea cheii, o schimbă cu `schimba` și o scrie, totul într-o tranzacție; dacă `schimba` aruncă, nu scrie nimic. */
  actualizeaza(cheie: string, schimba: (acum: unknown) => unknown): Promise<void>;
};

export type StareFreze = {
  readonly incarcata: boolean;
  readonly freze: readonly FrezaSalvata[];
  /** Biblioteca e în stocarea browserului; altfel ține doar cât fila. */
  readonly pastrate: boolean;
  /** Biblioteca se poate schimba: nu e a unei versiuni mai noi a aplicației. */
  readonly scriere: boolean;
  /** Câte freze din bibliotecă nu le poate citi versiunea de azi (rămân neatinse). */
  readonly necitite: number;
  /** Starea sincronizării cu contul (la biblioteca fără cont, goală). */
  readonly sincron: StareSincron;
  /**
   * Biblioteca a primit (sau a refuzat, fiind deja plină) frezele standard (ADR 0300 §3, precizarea din 24.11): ele se pun o
   * singură dată, deci una ștearsă nu revine singură.
   */
  readonly standard: boolean;
};

export type ProblemeLista = ProblemeFreza | { readonly id: 'lipsa' } | { readonly lista: 'plina' | 'versiune' };
export type RezultatSalvare = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly probleme: ProblemeLista };
export type RezultatStergere = { readonly ok: true } | { readonly ok: false; readonly probleme: ProblemeLista };
export type RezultatMaiMulte =
  | { readonly ok: true; readonly adaugate: number; readonly inlocuite: number; readonly sarite: number }
  | { readonly ok: false; readonly probleme: ProblemeLista };

export type FrezeMele = {
  readonly stare: () => StareFreze;
  readonly aboneaza: (f: () => void) => () => void;
  /** Citește biblioteca din depozit (o dată, la deschiderea ferestrei). */
  readonly incarca: () => Promise<void>;
  /** Citește din nou (altă filă a schimbat-o); biblioteca ținută doar în memorie rămâne. */
  readonly reincarca: () => Promise<void>;
  readonly salveaza: (id: string | null, f: Freza) => Promise<RezultatSalvare>;
  readonly sterge: (id: string) => Promise<RezultatStergere>;
  /** Mai multe deodată (frezele de pornire): fiecare cu un nume liber. */
  readonly adaugaToate: (freze: readonly Freza[]) => Promise<RezultatMaiMulte>;
  readonly importa: (freze: readonly Freza[], politica: PoliticaImport) => Promise<RezultatMaiMulte>;
  /**
   * O schimbare a sincronizării (frezele, cele brute și starea, deodată), pe ce e în depozit acum; `f` întoarce null când nu
   * schimbă nimic. Fals: n-a schimbat (nimic de schimbat, sau lista e a unei versiuni mai noi).
   */
  readonly schimbaCont: (f: (b: BibliotecaCont) => BibliotecaCont | null) => Promise<boolean>;
  /**
   * Frezele standard (ADR 0300 §3): cu `primaData`, doar dacă biblioteca nu le-a primit încă și e goală (una cu freze doar ține
   * minte că s-a hotărât); fără (butonul „Adaugă frezele standard”), cele care lipsesc. Le pune pe ce e în depozit acum.
   */
  readonly puneStandard: (standard: readonly FrezaStandard[], primaData: boolean) => Promise<RezultatMaiMulte>;
  /** Redenumirea unui grup al omului (ADR 0302 §4): toate frezele lui, într-o singură scriere; gol, înapoi pe feluri. */
  readonly redenumesteGrup: (vechi: string, nou: string) => Promise<RezultatStergere>;
};

type Citita = {
  readonly freze: readonly FrezaSalvata[];
  readonly brute: readonly unknown[];
  readonly scriere: boolean;
  /** Restul înregistrării (starea sincronizării, câmpurile unei versiuni mai noi), păstrat la scriere. */
  readonly extra: Readonly<Record<string, unknown>>;
};

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Biblioteca dintr-o valoare a depozitului: frezele bune, cele necitite (păstrate) și dacă se poate scrie. */
function citesteDate(x: unknown): Citita {
  if (!obiect(x) || !Array.isArray(x['freze']) || typeof x['v'] !== 'number') return { freze: [], brute: [], scriere: true, extra: {} };
  const freze: FrezaSalvata[] = [], brute: unknown[] = [];
  const iduri = new Set<string>();
  for (const f of x['freze'] as unknown[]) {
    const b = frezaDinDate(f);
    if (b && !iduri.has(b.id)) { freze.push(b); iduri.add(b.id); } else brute.push(f);
  }
  const { v: _v, freze: _f, ...extra } = x;
  void _v; void _f;
  return { freze, brute, scriere: x['v'] <= VERSIUNE_FREZE, extra };
}

/** Înregistrarea de scris: frezele (citite, apoi cele brute) și restul ei. */
const deScris = (c: Citita): Record<string, unknown> => ({ ...c.extra, v: VERSIUNE_FREZE, freze: [...c.freze, ...c.brute] });

/** Numele frezelor necitite: rămân luate. */
const numeBrute = (brute: readonly unknown[]): string[] =>
  brute.flatMap((b) => (obiect(b) && typeof b['nume'] === 'string' ? [b['nume']] : []));

/** Nimic de scris (frezele standard au fost deja hotărâte): tranzacția se oprește fără scriere. */
class Nimic extends Error {}

class RefuzLista extends Error {
  readonly probleme: ProblemeLista;
  constructor(probleme: ProblemeLista) {
    super('refuz');
    this.probleme = probleme;
  }
}

/**
 * Biblioteca peste un depozit (`null`: fără stocare). Fiecare schimbare trece printr-o funcție pură a listei (`model/freza.ts`),
 * aplicată pe ce e în depozit în clipa scrierii.
 */
export function creeazaFrezeMele(depozit: DepozitFreze | null, idNou: () => string, acum: () => number, cheie: string = CHEIE_LOCALA): FrezeMele {
  let stare: StareFreze = {
    incarcata: false, freze: [], pastrate: depozit !== null, scriere: true, necitite: 0, sincron: sincronDin(undefined), standard: false,
  };
  let brute: readonly unknown[] = [];
  let extra: Readonly<Record<string, unknown>> = {};
  const ascultatori = new Set<() => void>();
  const pune = (s: StareFreze): void => {
    stare = s;
    for (const f of ascultatori) f();
  };
  const puneCitita = (c: Citita, pastrate: boolean): void => {
    brute = c.brute;
    extra = c.extra;
    pune({
      incarcata: true, freze: c.freze, pastrate, scriere: c.scriere, necitite: c.brute.length, sincron: sincronDin(c.extra['sincron']),
      standard: c.extra['standard'] === true,
    });
  };
  const citeste = async (): Promise<void> => {
    if (!depozit) { pune({ ...stare, incarcata: true, pastrate: false }); return; }
    try {
      puneCitita(citesteDate(await depozit.citeste(cheie)), true);
    } catch {
      pune({ ...stare, incarcata: true, pastrate: false });
    }
  };

  /**
   * O schimbare a listei: în depozit, pe ce e acolo acum (refuzul ei nu scrie nimic); fără depozit sau după o scriere căzută,
   * pe lista din memorie. `f` întoarce lista nouă și ce spune apelantului.
   */
  const schimba = async <R>(f: (lista: readonly FrezaSalvata[], rezervate: readonly string[]) =>
    { readonly ok: true; readonly lista: readonly FrezaSalvata[]; readonly rez: R } | { readonly ok: false; readonly probleme: ProblemeLista }):
    Promise<({ readonly ok: true } & R) | { readonly ok: false; readonly probleme: ProblemeLista }> => {
    if (stare.pastrate && depozit) {
      let rezultat: R | null = null;
      let citita: Citita | null = null;
      try {
        await depozit.actualizeaza(cheie, (acum) => {
          const c = citesteDate(acum);
          if (!c.scriere) throw new RefuzLista({ lista: 'versiune' });
          const r = f(c.freze, numeBrute(c.brute));
          if (!r.ok) throw new RefuzLista(r.probleme);
          rezultat = r.rez;
          citita = { freze: r.lista, brute: c.brute, scriere: true, extra: c.extra };
          return deScris(citita);
        });
        puneCitita(citita!, true);
        return { ok: true, ...(rezultat as R) };
      } catch (e) {
        if (e instanceof RefuzLista) {
          if (e.probleme && 'lista' in e.probleme && e.probleme.lista === 'versiune') pune({ ...stare, scriere: false });
          return { ok: false, probleme: e.probleme };
        }
        // Stocarea a căzut (spațiul plin, date blocate): de acum, biblioteca ține cât fila.
      }
    }
    if (!stare.scriere) return { ok: false, probleme: { lista: 'versiune' } };
    const r = f(stare.freze, numeBrute(brute));
    if (!r.ok) return r;
    pune({ ...stare, incarcata: true, freze: r.lista, pastrate: false });
    return { ok: true, ...r.rez };
  };

  return {
    stare: () => stare,
    aboneaza: (f) => {
      ascultatori.add(f);
      return () => { ascultatori.delete(f); };
    },
    schimbaCont: async (f) => {
      const din = (c: Citita): BibliotecaCont => ({ freze: c.freze, brute: c.brute, sincron: sincronDin(c.extra['sincron']) });
      const in_ = (c: Citita, b: BibliotecaCont): Citita =>
        ({ freze: b.freze, brute: b.brute, scriere: true, extra: { ...c.extra, sincron: sincronDate(b.sincron) } });
      if (stare.pastrate && depozit) {
        let citita: Citita | null = null;
        try {
          await depozit.actualizeaza(cheie, (acum) => {
            const c = citesteDate(acum);
            if (!c.scriere) throw new RefuzLista({ lista: 'versiune' });
            const b = f(din(c));
            if (b === null) throw new RefuzLista({ lista: 'versiune' });
            citita = in_(c, b);
            return deScris(citita);
          });
          puneCitita(citita!, true);
          return true;
        } catch (e) {
          if (e instanceof RefuzLista) return false;
          // Stocarea a căzut: de acum, biblioteca ține cât fila.
        }
      }
      if (!stare.scriere) return false;
      const c: Citita = { freze: stare.freze, brute, scriere: true, extra };
      const b = f(din(c));
      if (b === null) return false;
      puneCitita(in_(c, b), false);
      return true;
    },
    incarca: citeste,
    reincarca: async () => {
      if (stare.pastrate) await citeste();
    },
    salveaza: (id, freza) => schimba((lista, rezervate) => {
      const r = cuFreza(lista, id, freza, idNou, acum(), rezervate);
      return r.ok ? { ok: true, lista: r.lista, rez: { id: r.id } } : r;
    }),
    sterge: (id) => schimba((lista) => {
      const r = faraFreza(lista, id);
      return r.ok ? { ok: true, lista: r.lista, rez: {} } : { ok: false, probleme: { id: 'lipsa' } };
    }),
    redenumesteGrup: (vechi, nou) => schimba((lista) => {
      const r = cuGrupRedenumit(lista, vechi, nou, acum());
      if (r.ok) return { ok: true, lista: r.lista, rez: {} };
      return { ok: false, probleme: r.motiv === 'lipsa' ? { id: 'lipsa' } : { grup: r.motiv } };
    }),
    adaugaToate: (freze) => schimba((lista, rezervate) => {
      const r = cuImport(lista, freze, 'amandoua', idNou, acum(), rezervate);
      return r.ok ? { ok: true, lista: r.lista, rez: { adaugate: r.adaugate, inlocuite: r.inlocuite, sarite: r.sarite } } : r;
    }),
    importa: (freze, politica) => schimba((lista, rezervate) => {
      const r = cuImport(lista, freze, politica, idNou, acum(), rezervate);
      return r.ok ? { ok: true, lista: r.lista, rez: { adaugate: r.adaugate, inlocuite: r.inlocuite, sarite: r.sarite } } : r;
    }),
    puneStandard: async (standard, primaData) => {
      // Biblioteca cu setul pus: doar cele care lipsesc, cu numele libere; null dacă a fost deja hotărât (prima dată).
      const cu = (c: Citita): { readonly citita: Citita; readonly adaugate: number } | null => {
        if (primaData && c.extra['standard'] === true) return null;
        const pune = !primaData || (c.freze.length === 0 && c.brute.length === 0);
        const r = pune ? cuStandard(c.freze, standard, acum(), numeBrute(c.brute)) : { lista: c.freze, adaugate: 0 };
        return { citita: { ...c, freze: r.lista, extra: { ...c.extra, standard: true } }, adaugate: r.adaugate };
      };
      const gata = (adaugate: number): RezultatMaiMulte => ({ ok: true, adaugate, inlocuite: 0, sarite: 0 });
      if (stare.pastrate && depozit) {
        let rez: { readonly citita: Citita; readonly adaugate: number } | null = null;
        try {
          await depozit.actualizeaza(cheie, (acum_) => {
            const c = citesteDate(acum_);
            if (!c.scriere) throw new RefuzLista({ lista: 'versiune' });
            rez = cu(c);
            if (rez === null) throw new Nimic();
            return deScris(rez.citita);
          });
          const r = rez as { readonly citita: Citita; readonly adaugate: number } | null;
          if (r) puneCitita(r.citita, true);
          return gata(r?.adaugate ?? 0);
        } catch (e) {
          if (e instanceof Nimic) return gata(0);
          if (e instanceof RefuzLista) {
            pune({ ...stare, scriere: false });
            return { ok: false, probleme: e.probleme };
          }
          // Stocarea a căzut: de acum, biblioteca ține cât fila.
        }
      }
      if (!stare.scriere) return { ok: false, probleme: { lista: 'versiune' } };
      const r = cu({ freze: stare.freze, brute, scriere: true, extra });
      if (r) puneCitita(r.citita, false);
      return gata(r?.adaugate ?? 0);
    },
  };
}

// --- În browser: IndexedDB și celelalte file ---

let deschisa: Promise<IDBDatabase> | null = null;

function deschide(): Promise<IDBDatabase> {
  deschisa ??= new Promise<IDBDatabase>((rezolva, respinge) => {
    const r = indexedDB.open(BAZA_FREZE, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(BIBLIOTECI); };
    r.onsuccess = () => {
      const db = r.result;
      // O altă filă cu o versiune nouă a bazei: aici se închide, ca acolo să se poată deschide.
      db.onversionchange = () => { db.close(); deschisa = null; };
      rezolva(db);
    };
    r.onerror = () => { respinge(r.error ?? new Error('IndexedDB')); };
    r.onblocked = () => { respinge(new Error('baza frezelor e blocată de altă filă')); };
  });
  void deschisa.catch(() => { deschisa = null; });
  return deschisa;
}

/** Depozitul din IndexedDB; null dacă browserul nu-l are (sau îl refuză la deschidere: se vede la prima citire). */
function depozitBrowser(): DepozitFreze | null {
  if (typeof indexedDB === 'undefined') return null;
  return {
    citeste: async (cheie) => {
      const db = await deschide();
      return new Promise((rezolva, respinge) => {
        const r = db.transaction(BIBLIOTECI).objectStore(BIBLIOTECI).get(cheie);
        r.onsuccess = () => { rezolva(r.result); };
        r.onerror = () => { respinge(r.error ?? new Error('IndexedDB')); };
      });
    },
    actualizeaza: async (cheie, schimba) => {
      const db = await deschide();
      await new Promise<void>((rezolva, respinge) => {
        const t = db.transaction(BIBLIOTECI, 'readwrite');
        const s = t.objectStore(BIBLIOTECI);
        let eroare: unknown = null;
        const r = s.get(cheie);
        r.onsuccess = () => {
          try {
            s.put(schimba(r.result), cheie);
          } catch (e) {
            eroare = e;
            t.abort();
          }
        };
        t.oncomplete = () => { rezolva(); };
        t.onabort = () => { respinge(eroare ?? t.error ?? new Error('tranzacție oprită')); };
        t.onerror = () => { respinge(eroare ?? t.error ?? new Error('IndexedDB')); };
      });
    },
  };
}

/** Un id nou pentru o freză: UUID-ul browserului, sau 32 de cifre hexa aleatoare unde lipsește. */
function idFreza(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

const CANAL = 'cncvs2-freze';
const biblioteci = new Map<string, FrezeMele>();
let canal: BroadcastChannel | null | undefined;

/** Canalul filelor: mesajul e cheia bibliotecii schimbate (vechiul „schimbat” e al bibliotecii fără cont). */
function canalFile(): BroadcastChannel | null {
  if (canal !== undefined) return canal;
  try {
    canal = new BroadcastChannel(CANAL);
    canal.onmessage = (e: MessageEvent) => {
      const cheie = typeof e.data === 'string' && e.data !== 'schimbat' ? e.data : CHEIE_LOCALA;
      void biblioteci.get(cheie)?.reincarca();
    };
  } catch {
    // Fără canal (browser vechi): fiecare filă vede schimbările celorlalte la următoarea deschidere a ferestrei.
    canal = null;
  }
  return canal;
}

/** Biblioteca de freze a browserului cu cheia dată (fără cont, sau a unui cont): una pe filă, la zi cu celelalte file. */
export function frezeMele(cheie: string = CHEIE_LOCALA): FrezeMele {
  const gasita = biblioteci.get(cheie);
  if (gasita) return gasita;
  const b = creeazaFrezeMele(depozitBrowser(), idFreza, () => Date.now(), cheie);
  const c = canalFile();
  const anunta = <T>(p: Promise<T>): Promise<T> => p.then((r) => { c?.postMessage(cheie); return r; });
  const noua: FrezeMele = {
    ...b,
    salveaza: (id, f) => anunta(b.salveaza(id, f)),
    sterge: (id) => anunta(b.sterge(id)),
    redenumesteGrup: (vechi, nou) => anunta(b.redenumesteGrup(vechi, nou)),
    adaugaToate: (freze) => anunta(b.adaugaToate(freze)),
    importa: (freze, politica) => anunta(b.importa(freze, politica)),
    schimbaCont: (f) => anunta(b.schimbaCont(f)),
  };
  biblioteci.set(cheie, noua);
  return noua;
}

/** Starea bibliotecii cu cheia dată, pentru React; se schimbă doar când biblioteca se schimbă. */
export function useFrezeMele(cheie: string = CHEIE_LOCALA): StareFreze {
  const b = frezeMele(cheie);
  return useSyncExternalStore(b.aboneaza, b.stare);
}

/** Un id nou de freză (pentru copia din „Păstrează-le pe amândouă”). */
export { idFreza };
