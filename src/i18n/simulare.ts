import { enSimulare } from './simulare.en.ts';
import { roSimulare } from './simulare.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele simulării intră în dicționare odată cu dialogul exportului (încărcat la cerere). */
adaugaMesaje({ en: enSimulare, ro: roSimulare });
