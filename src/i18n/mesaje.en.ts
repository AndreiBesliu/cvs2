import type { Mesaj } from './tipuri.ts';

/**
 * Mesajele în engleză. Dicționarul ăsta DEFINEȘTE cheile: `mesaje.ro.ts` trebuie să aibă exact aceleași chei, cu
 * aceeași formă (un plural aici e plural și acolo), iar compilatorul refuză orice altceva.
 */
export const en = {
  'app.titlu': 'CNC Vector Studio',
  'app.schelet': 'Stage 1 skeleton: drawing and G-code come next.',
  'app.instanta': 'Instance: {nume}',
  'app.instanta.necunoscuta': 'unknown',
  'app.limba': 'Language',
  'jurnal.intrari': { one: '{n} error in the local log', other: '{n} errors in the local log' },
  'eroare.titlu': 'Something went wrong',
  'eroare.explicatie': 'The error was saved in this browser’s local log. Copy the report and send it to us.',
  'eroare.copiaza': 'Copy the report',
  'eroare.copiat': 'Copied',
  'eroare.copiere.esuata': 'Copying failed. Select the report below and copy it by hand.',
  'eroare.reincarca': 'Reload',
  'eroare.config': 'The instance configuration could not be read: {motiv}',
  'actiune.adauga-dreptunghi': 'Add rectangle',
  'actiune.adauga-cerc': 'Add circle',
  'actiune.muta-selectia': 'Move selection',
  'actiune.sterge-selectia': 'Delete selection',
  'actiune.anuleaza': 'Undo',
  'actiune.reface': 'Redo',
  'motiv.actiune-necunoscuta': 'This action does not exist.',
  'motiv.fara-capabilitate': 'Your plan does not include this function.',
  'motiv.nicio-selectie': 'Select something first.',
  'motiv.nicio-deplasare': 'No move was given.',
  'motiv.nimic-de-anulat': 'Nothing to undo.',
  'motiv.nimic-de-refacut': 'Nothing to redo.',
} as const satisfies Readonly<Record<string, Mesaj>>;
