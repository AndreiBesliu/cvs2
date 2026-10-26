import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele paletei, ale panoului de proprietăți și ale nivelului piesei din arbore vin cu modulul care le folosește, ca date (`mesaje/carcasa.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `carcasa.en.ts` și `carcasa.ro.ts`.
 */
export const gata = cereMesaje('carcasa');
