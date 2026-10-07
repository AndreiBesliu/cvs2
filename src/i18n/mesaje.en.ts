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
} as const satisfies Readonly<Record<string, Mesaj>>;
