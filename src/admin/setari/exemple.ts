import type { RaspunsRapid } from '../../../shared/raspunsuriRapide.ts';

/**
 * Cele trei texte ale schiței Tichete (ADR 0261 §7): doar o pornire, puse în câmpurile secțiunii din Setări la cerere, cât
 * lista e goală; nimic nu se salvează fără „Salvează”.
 */
export const EXEMPLE_RAPIDE: readonly RaspunsRapid[] = [
  {
    eticheta: 'Am primit, ne uităm',
    ro: 'Mulțumim pentru raportare! Am primit-o și ne uităm la ea. Revenim aici cu un răspuns.',
    en: 'Thank you for the report! We received it and are looking into it. We will reply here.',
  },
  {
    eticheta: 'Reparat în versiunea nouă',
    ro: 'Am reparat problema în versiunea nouă a aplicației. Reîncarcă pagina ca s-o primești, apoi spune-ne dacă mai apare.',
    en: 'We fixed this in the new version of the app. Reload the page to get it, then tell us if it happens again.',
  },
  {
    eticheta: 'Ne trebuie pașii',
    ro: 'Ca s-o putem reproduce, ne trebuie pașii: ce ai deschis, ce ai apăsat și ce te așteptai să se întâmple. Trimite-i într-o '
      + 'raportare nouă, din „Raportează o problemă…”, cu proiectul atașat dacă poți.',
    en: 'To reproduce it, we need the steps: what you opened, what you clicked and what you expected to happen. Send them in a new '
      + 'report, from “Report a problem…”, with the project attached if you can.',
  },
];
