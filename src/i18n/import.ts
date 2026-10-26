import { cereMesaje } from './laCerere.ts';

/**
 * Mesajele importului vin cu modulul care le folosește, ca date (`mesaje/import.<limba>.json`, ADR 0086): cine îl încarcă
 * așteaptă `mesajeGata()` înainte de randare (`gata`: doar mesajele modulului ăstuia). Textele se scriu în `import.en.ts` și `import.ro.ts`.
 */
export const gata = cereMesaje('import');
