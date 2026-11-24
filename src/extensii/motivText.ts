/**
 * Motivul unui refuz, pe înțeles (ADR 0232 §A.4): propoziția lui și, în paranteză, detaliul (fișierul, răspunsul
 * serverului). La lipsa rețelei, detaliul e textul browserului („Failed to fetch”): rămâne doar în jurnal. Folosit de gazdă
 * (meniul) și de ferestrele aduse la cerere.
 */
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { RefuzBiblioteca } from './biblioteca.ts';

export const motivText = (m: RefuzBiblioteca['motiv'], detaliu?: string): string =>
  `${t(`extensii.motiv.${m}` as CheieSimpla)}${detaliu && m !== 'retea' ? ` (${detaliu})` : ''}`;
