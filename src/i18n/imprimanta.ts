import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele ferestrei Imprimanta (ADR 0190) vin cu modulul care le folosește, ca date (`mesaje/imprimanta.json`, ADR 0086): cine
 * îl încarcă așteaptă `mesajeGata()` înainte de randare. Textele se scriu în `imprimanta.en.ts` și `imprimanta.ro.ts`.
 */
export const gata = cereMesaje('imprimanta');
