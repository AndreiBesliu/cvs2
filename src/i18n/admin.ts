import { enAdmin } from './admin.en.ts';
import { roAdmin } from './admin.ro.ts';
import { adaugaMesaje } from './t.ts';

/** Mesajele adminului intră în dicționare odată cu pagina `/admin` (la cerere). */
adaugaMesaje({ en: enAdmin, ro: roAdmin });
