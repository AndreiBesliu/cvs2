import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele simulării din dialogul exportului vin cu modulul care le folosește, ca date (`mesaje/simulare.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `simulare.en.ts` și `simulare.ro.ts`.
 */
export const gata = cereMesaje('simulare');
