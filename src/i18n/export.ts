import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele dialogului de export vin cu modulul care le folosește, ca date (`mesaje/export.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `export.en.ts` și `export.ro.ts`.
 */
export const gata = cereMesaje('export');
