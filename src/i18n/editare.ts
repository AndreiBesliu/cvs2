import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele riglelor, ghidajelor, lipirii și alinierii (modulul editării) vin cu modulul care le folosește, ca date (`mesaje/editare.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `editare.en.ts` și `editare.ro.ts`.
 */
export const gata = cereMesaje('editare');
