import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele cipului traseului vin cu modulul care le folosește, ca date (`mesaje/traseu.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `traseu.en.ts` și `traseu.ro.ts`.
 */
export const gata = cereMesaje('traseu');
