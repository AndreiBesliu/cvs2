import { enTraseu } from './traseu.en.ts';
import { roTraseu } from './traseu.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele cipului traseului intră în dicționare odată cu calculul lui (la cerere). */
adaugaMesaje({ en: enTraseu, ro: roTraseu });
