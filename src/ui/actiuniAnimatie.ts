/**
 * Playerul animației traseului (ADR 0099): ține momentul animației, îl mută cu ceasul (cadrele browserului) înmulțit cu
 * viteza aleasă, sare la un moment și merge pas cu pas, pe cronologia programului (`src/sim/animatie.ts`). Un singur player
 * în aplicație (`animatie`): panoul din cipul timpului îl comandă, iar stratul traseului de pe pânză îl desenează.
 *
 * Starea citită (`citeste`) e același obiect până la o schimbare, ca s-o poată citi `useSyncExternalStore`.
 */
import { cronologie, inainte, inapoi, stareLa, type Cronologie, type StareAnimatie } from '../sim/animatie.ts';
import type { Program } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import { secundePeMiscare } from './actiuniExportCalcul.ts';

// Panoul și stratul frezei le citesc prin player: interfața ajunge la simulare doar prin modulele `actiuni*`.
export { parcursIntre, type Cronologie, type LinieParcursa, type StareAnimatie } from '../sim/animatie.ts';

/** Vitezele din panou, față de timpul mașinii. */
export const VITEZE = [1, 2, 5, 10, 20, 50, 100, 200, 500] as const;
/** Cât ține toată animația, cel mult, cu viteza implicită (secunde). */
const DURATA_TINTA = 60;

/** Viteza implicită: cea mai mică din listă cu care toată animația ține cel mult un minut. */
export function vitezaPentru(durata: number): number {
  return VITEZE.find((v) => durata / v <= DURATA_TINTA) ?? (VITEZE.at(-1) as number);
}

export type StarePlayer = {
  readonly activa: boolean;
  readonly ruleaza: boolean;
  /** Momentul animației, în secunde de mașină, între 0 și `durata`. */
  readonly t: number;
  readonly durata: number;
  readonly viteza: number;
  readonly cronologie: Cronologie | null;
  /** Freza la momentul `t`: poziția, pasul, felul mișcării, scula; `null` când nu e nimic încărcat. */
  readonly acum: StareAnimatie | null;
};

export type Ceas = {
  readonly acum: () => number;
  readonly cadru: (f: () => void) => number;
  readonly anuleaza: (id: number) => void;
};

const CEAS_BROWSER: Ceas = {
  acum: () => performance.now(),
  cadru: (f) => requestAnimationFrame(f),
  anuleaza: (id) => { cancelAnimationFrame(id); },
};

const INACTIVA: StarePlayer = { activa: false, ruleaza: false, t: 0, durata: 0, viteza: 1, cronologie: null, acum: null };

export type Animatie = ReturnType<typeof creeazaAnimatie>;

export function creeazaAnimatie(ceas: Ceas = CEAS_BROWSER) {
  let stare: StarePlayer = INACTIVA;
  let cerere: number | null = null;
  let ultim = 0;
  const ascultatori = new Set<() => void>();
  /** Starea nouă, cu freza la momentul ei (o căutare binară pe pași). */
  const scrie = (s: Omit<StarePlayer, 'acum'>): void => {
    stare = { ...s, acum: s.cronologie ? stareLa(s.cronologie, s.t) : null };
    for (const a of ascultatori) a();
  };
  const opresteCadrul = (): void => {
    if (cerere !== null) ceas.anuleaza(cerere);
    cerere = null;
  };
  const cadru = (): void => {
    cerere = null;
    if (!stare.ruleaza) return;
    const acum = ceas.acum();
    const t = Math.min(stare.durata, stare.t + ((acum - ultim) / 1000) * stare.viteza);
    ultim = acum;
    if (t >= stare.durata) {
      scrie({ ...stare, t: stare.durata, ruleaza: false });
      return;
    }
    scrie({ ...stare, t });
    cerere = ceas.cadru(cadru);
  };
  /** Momentul de acum, cu timpul scurs de la ultimul cadru adăugat (o schimbare din mers nu pierde nimic). */
  const prinde = (): number => {
    if (!stare.ruleaza) return stare.t;
    const acum = ceas.acum();
    const t = Math.min(stare.durata, stare.t + ((acum - ultim) / 1000) * stare.viteza);
    ultim = acum;
    return t;
  };
  const opreste = (t: number): void => {
    opresteCadrul();
    if (stare.activa) scrie({ ...stare, t: Math.min(stare.durata, Math.max(0, t)), ruleaza: false });
  };
  return {
    incarca(c: Cronologie): void {
      opresteCadrul();
      scrie({ activa: true, ruleaza: false, t: 0, durata: c.durata, viteza: vitezaPentru(c.durata), cronologie: c });
    },
    /**
     * Cronologia programului, cu timpii planificatorului: același post și aceeași mașină ca timpul jobului de lângă traseu,
     * deci animația pornește doar de unde cipul are timpul (fără el, nici „Animează” nu apare). Fără timpi, nimic încărcat.
     */
    incarcaProgram(program: Program, foaie: Montaj['foaie'], setari: string | undefined): boolean {
      const estimati = secundePeMiscare(program, foaie, setari);
      if (estimati === null) {
        this.inchide();
        return false;
      }
      this.incarca(cronologie(program, estimati));
      return true;
    },
    inchide(): void {
      opresteCadrul();
      scrie(INACTIVA);
    },
    reda(): void {
      if (!stare.activa || stare.ruleaza) return;
      opresteCadrul();
      ultim = ceas.acum();
      scrie({ ...stare, t: stare.t >= stare.durata ? 0 : stare.t, ruleaza: true });
      cerere = ceas.cadru(cadru);
    },
    pauza(): void {
      if (stare.ruleaza) opreste(prinde());
    },
    viteza(v: number): void {
      if (!stare.activa || !(v > 0)) return;
      scrie({ ...stare, t: prinde(), viteza: v });
    },
    sari(t: number): void {
      opreste(t);
    },
    inainte(): void {
      if (stare.cronologie) opreste(inainte(stare.cronologie, prinde()));
    },
    inapoi(): void {
      if (stare.cronologie) opreste(inapoi(stare.cronologie, prinde()));
    },
    asculta(a: () => void): () => void {
      ascultatori.add(a);
      return () => { ascultatori.delete(a); };
    },
    citeste: (): StarePlayer => stare,
  };
}

/** Playerul aplicației. */
export const animatie = creeazaAnimatie();
