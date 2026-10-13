import { enCarcasa } from './carcasa.en.ts';
import { roCarcasa } from './carcasa.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele paletei, ale panoului de proprietăți și ale nivelului piesei din arbore intră în dicționare odată cu ele (la cerere). */
adaugaMesaje({ en: enCarcasa, ro: roCarcasa });
