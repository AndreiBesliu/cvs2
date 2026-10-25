import { enTutorial } from './tutorial.en.ts';
import { roTutorial } from './tutorial.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele testului pas cu pas (ADR 0072) intră în dicționare odată cu panoul lui (adus la cerere, doar pe test). */
adaugaMesaje({ en: enTutorial, ro: roTutorial });
