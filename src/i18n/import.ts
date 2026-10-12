import { enImport } from './import.en.ts';
import { roImport } from './import.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele importului intră în dicționare odată cu dialogul care le folosește (încărcat la cerere). */
adaugaMesaje({ en: enImport, ro: roImport });
