import type { Eveniment, Fereastra, Lot, SetariPublice } from '../../shared/utilizare.ts';

/**
 * Tipurile comune ale utilizării aplicației (ADR 0262, felia A.8b): partea din pornire (`utilizare.ts`), înregistratorul
 * (`utilizareLot.ts`) și trimiterea (`utilizareTrimitere.ts`, bucata contului) le iau de aici, fără să se importe una pe alta.
 */

/** Un lot care așteaptă, cu contul care l-a strâns: altul, intrat după el în același browser, nu-l trimite în numele lui. */
export interface LotTinut {
  readonly uid: string;
  readonly lot: Lot;
}

export interface Inregistrator {
  /** Un eveniment gata făcut (cu timpul și sursa lui), de la pornire. */
  primeste(ev: Eveniment): void;
  actiune(id: string, rez: string): void;
  fereastra(id: Fereastra): void;
  unealta(id: string): void;
  /** Lotul de acum, la coada din browser (nimic dacă e gol). */
  inchideLotul(): void;
  /** Un lot gol, doar ca serverul să spună setările (cât colectarea e oprită). */
  intreabaSetarile(): void;
  /** Loturile care așteaptă, cele mai vechi întâi (citite din browser: și ale altor file). */
  loturi(): readonly LotTinut[];
  /** Un lot trimis (sau aruncat) pleacă din coadă. */
  scoate(sesiune: string, nr: number): void;
  /** Setările aflate de la server; colectarea oprită golește lotul și coada. */
  primesteSetari(s: SetariPublice): void;
  /** Nimic nu mai așteaptă (contul a plecat, serverul a refuzat). */
  golesteTot(): void;
  setari(): SetariPublice;
  /** Pașii dinaintea unei erori: ultimele evenimente, cel mult cât cer setările. */
  pasi(): readonly Eveniment[];
  /** Câte evenimente are lotul de acum. */
  inLot(): number;
  /** Câte acțiuni ale registrului au reușit în sesiune (și cele numărate într-una): un dialog închis după una a mers până la capăt. */
  reusite(): number;
}

/** Rezultatul unei trimiteri a cozii: toată trimisă; rețeaua (mai târziu); refuzată (nimic nu mai pleacă în sesiunea asta). */
export type RezultatPompa = 'gata' | 'retea' | 'stins';
