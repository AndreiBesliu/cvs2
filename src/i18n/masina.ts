import { enMasina } from './masina.en.ts';
import { roMasina } from './masina.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele panoului mașinii intră în dicționare odată cu el (încărcat la cerere), ca ale dialogurilor. */
adaugaMesaje({ en: enMasina, ro: roMasina });
