import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele panoului mașinii vin cu modulul care le folosește, ca date (`mesaje/masina.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `masina.en.ts` și `masina.ro.ts`.
 */
export const gata = cereMesaje('masina');
