import { enExport } from './export.en.ts';
import { roExport } from './export.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele dialogului de export intră în dicționare odată cu el (încărcat la cerere), ca ale importului. */
adaugaMesaje({ en: enExport, ro: roExport });
