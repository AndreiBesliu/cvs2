import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele ferestrei „Frezele mele” (ADR 0300) vin cu modulul care le folosește, ca date (`mesaje/freze.json`, ADR 0086): cine
 * îl încarcă așteaptă `mesajeGata()` înainte de randare. Textele se scriu în `freze.en.ts` și `freze.ro.ts`.
 */
export const gata = cereMesaje('freze');
