/**
 * Jurnalul local de erori (etapele 1–2): ultimele erori ale clientului, ținute în browser, cu un raport text pe care
 * owner-ul îl copiază și ni-l trimite. Din etapa 3, aceleași intrări pleacă și spre `errorLogs`, pe server.
 *
 * Depozitul e injectat (în browser `localStorage`, în teste un fals), iar orice eșec al lui trece în memorie: un jurnal
 * de erori care aruncă la rândul lui ar ascunde exact eroarea pe care trebuia s-o păstreze.
 */

export type TipEroare = 'randare' | 'fereastra' | 'promisiune' | 'config';

export interface IntrareEroare {
  readonly cand: string;
  readonly tip: TipEroare;
  readonly mesaj: string;
  readonly stiva: string;
  readonly adresa: string;
}

export interface Depozit {
  getItem(cheie: string): string | null;
  setItem(cheie: string, valoare: string): void;
  removeItem(cheie: string): void;
}

export interface Context {
  readonly aplicatia: string;
  readonly versiunea: string;
  readonly instanta: string;
  readonly limba: string;
  readonly browserul: string;
}

export const CHEIE_DEPOZIT = 'cncvs2.jurnalErori.v1';
/** Câte intrări se păstrează; cele mai vechi pleacă primele. */
export const PLAFON_INTRARI = 50;
export const PLAFON_MESAJ = 1_000;
export const PLAFON_STIVA = 4_000;

export interface Jurnal {
  adauga(tip: TipEroare, eroare: unknown, stivaComponentelor?: string): void;
  citeste(): readonly IntrareEroare[];
  raport(context: Context): string;
  goleste(): void;
  asculta(a: () => void): () => void;
}

function taie(text: string, plafon: number): string {
  return text.length <= plafon ? text : `${text.slice(0, plafon)}… (+${text.length - plafon})`;
}

function descrie(eroare: unknown): { mesaj: string; stiva: string } {
  if (eroare instanceof Error) return { mesaj: `${eroare.name}: ${eroare.message}`, stiva: eroare.stack ?? '' };
  if (typeof eroare === 'string') return { mesaj: eroare, stiva: '' };
  try {
    return { mesaj: JSON.stringify(eroare) ?? String(eroare), stiva: '' };
  } catch {
    return { mesaj: String(eroare), stiva: '' };
  }
}

function eIntrare(x: unknown): x is IntrareEroare {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return ['cand', 'tip', 'mesaj', 'stiva', 'adresa'].every((k) => typeof o[k] === 'string');
}

export function creeazaJurnal(depozit: Depozit | null, ceas: () => Date, adresa: () => string): Jurnal {
  let inMemorie: IntrareEroare[] = [];
  const ascultatori = new Set<() => void>();

  const citesteDepozit = (): IntrareEroare[] => {
    if (!depozit) return inMemorie;
    try {
      const brut = depozit.getItem(CHEIE_DEPOZIT);
      if (brut === null) return inMemorie;
      const lista: unknown = JSON.parse(brut);
      return Array.isArray(lista) ? lista.filter(eIntrare) : inMemorie;
    } catch {
      return inMemorie;
    }
  };

  const scrie = (lista: IntrareEroare[]): void => {
    inMemorie = lista;
    if (depozit) {
      try {
        depozit.setItem(CHEIE_DEPOZIT, JSON.stringify(lista));
      } catch {
        // Depozitul plin sau blocat: intrările rămân în memorie, pentru sesiunea asta.
      }
    }
    for (const a of ascultatori) a();
  };

  return {
    adauga(tip, eroare, stivaComponentelor = '') {
      const { mesaj, stiva } = descrie(eroare);
      const intrare: IntrareEroare = {
        cand: ceas().toISOString(),
        tip,
        mesaj: taie(mesaj, PLAFON_MESAJ),
        stiva: taie(stivaComponentelor ? `${stiva}\n--- componente ---${stivaComponentelor}` : stiva, PLAFON_STIVA),
        adresa: adresa(),
      };
      scrie([...citesteDepozit(), intrare].slice(-PLAFON_INTRARI));
    },
    citeste: citesteDepozit,
    raport(context) {
      const intrari = citesteDepozit();
      const antet = [
        `${context.aplicatia} — raportul jurnalului local`,
        `versiunea: ${context.versiunea}`,
        `instanța: ${context.instanta}`,
        `limba: ${context.limba}`,
        `browserul: ${context.browserul}`,
        `ora raportului: ${ceas().toISOString()}`,
        `intrări: ${intrari.length}`,
      ];
      const corp = intrari.map((e, i) => [
        `#${i + 1} ${e.cand} [${e.tip}] ${e.mesaj}`,
        `adresa: ${e.adresa}`,
        e.stiva,
      ].filter(Boolean).join('\n'));
      return [...antet, '', ...corp].join('\n');
    },
    goleste() {
      if (depozit) {
        try {
          depozit.removeItem(CHEIE_DEPOZIT);
        } catch {
          // Ignorat: golirea e o comoditate.
        }
      }
      inMemorie = [];
      for (const a of ascultatori) a();
    },
    asculta(a) {
      ascultatori.add(a);
      return () => { ascultatori.delete(a); };
    },
  };
}
