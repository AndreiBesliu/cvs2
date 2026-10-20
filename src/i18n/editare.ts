import { enEditare } from './editare.en.ts';
import { roEditare } from './editare.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele riglelor, ghidajelor, lipirii și alinierii intră în dicționare odată cu modulul editării (la cerere). */
adaugaMesaje({ en: enEditare, ro: roEditare });
