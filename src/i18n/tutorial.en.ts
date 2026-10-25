import type { Mesaj } from './tipuri.ts';

/**
 * The owner's step-by-step test panel (ADR 0072), in English. It comes with the panel (`tutorial.ts`), only on the test
 * instance; the steps themselves are a document (`docs/tutorial/`), in Romanian.
 */
export const enTutorial = {
  'tutorial.titlu': 'Step-by-step test',
  'tutorial.pas': 'Step {n} of {total}',
  'tutorial.faci': 'What you do',
  'tutorial.vezi': 'What you should see',
  'tutorial.bine': 'OK',
  'tutorial.nu': 'No',
  'tutorial.sarit': 'Skipped',
  'tutorial.nota': 'What you saw, briefly',
  'tutorial.poza': 'Snapshot',
  'tutorial.poza.titlu': 'Saves the image of the board at this step (it stays in the browser and goes into the report)',
  'tutorial.poze': 'Snapshots at this step: {n}',
  'tutorial.poza.gata': 'Snapshot saved ({n} at this step).',
  'tutorial.poza.esec': 'The snapshot did not work: {motiv}',
  'tutorial.inapoi': 'Back',
  'tutorial.inainte': 'Next',
  'tutorial.progres': '{bine} OK · {nu} no · {sarit} skipped · {ramas} left',
  'tutorial.raport': 'Download the report',
  'tutorial.raport.gata': 'The report is downloaded ({fisier}): send me the file.',
  'tutorial.raport.esec': 'The report could not be made: {motiv}',
  'tutorial.reia': 'Start over',
  'tutorial.reia.sigur': 'Yes, delete the results and snapshots',
  'tutorial.strange': 'Collapse',
  'tutorial.deschide': 'Expand',
  'tutorial.inchide': 'Close (the results stay)',
  'tutorial.incarca': 'Loading the test…',
  'tutorial.eroare': 'The test could not be loaded: {motiv}',
  'tutorial.fara-memorie': 'Without local storage, the results only last while this tab is open.',
} as const satisfies Readonly<Record<string, Mesaj>>;
