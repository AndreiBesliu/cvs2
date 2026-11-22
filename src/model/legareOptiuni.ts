import { PRAG_INCHIDERE, TOLERANTA_MAXIMA, TOLERANTA_MINIMA, TOLERANTA_VERIFICARE } from './verificareLimite.ts';

/**
 * Opțiunile legării căilor (ADR 0182 §7, felia 10.3↑o), partea ușoară: depozitul din browser și panoul lor le citesc pe firul
 * principal; legarea însăși (`legareCai.ts`) stă în worker. Implicitele sunt răspunsurile owner-ului (1a, 2a, 3a).
 */

/** Golul de peste toleranță: o linie oricât de lungă, o linie până la `pragGol` mm, sau deloc. */
export type GolLegare = 'linie' | 'prag' | 'lipire';
export type OptiuniLegare = {
  /** Lipirea: capetele la cel mult atât, în mm, devin un nod (ca toleranța verificării). */
  readonly toleranta: number;
  readonly gol: GolLegare;
  readonly pragGol: number;
  /** Unde se întâlnesc capetele lipite: pe capătul căii mai devreme în document, sau la mijloc. */
  readonly capete: 'prima' | 'mijloc';
  /** Căile cu operații diferite: nu se leagă, sau calea legată ia operațiile primei. */
  readonly operatii: 'refuza' | 'prima';
};

export const OPTIUNI_LEGARE: OptiuniLegare = { toleranta: TOLERANTA_VERIFICARE, gol: 'linie', pragGol: PRAG_INCHIDERE, capete: 'prima', operatii: 'refuza' };
/** Pragul golului primit: de la 0,001 la 1 000 mm. */
export const PRAG_GOL = { minim: 0.001, maxim: 1000 } as const;

/** O toleranță a lipirii bună: ca a verificării, de la 0,001 la 1 mm. */
export const tolerantaLegareBuna = (x: number): boolean => x >= TOLERANTA_MINIMA && x <= TOLERANTA_MAXIMA;
/** Un prag al golului bun: de la 0,001 la 1 000 mm. */
export const pragGolBun = (x: number): boolean => x >= PRAG_GOL.minim && x <= PRAG_GOL.maxim;
