import type { en } from './mesaje.en.ts';

type DictionarEn = typeof en;

/** Aceeași formă ca mesajul în engleză: textul rămâne text, iar pluralul are toate cele trei forme românești. */
type FormaRo<M> = M extends string ? string : { readonly one: string; readonly few: string; readonly other: string };

/** Exact cheile din engleză, nici mai multe, nici mai puține: `satisfies` refuză și cheia lipsă, și pe cea în plus. */
export type DictionarRo = { readonly [K in keyof DictionarEn]: FormaRo<DictionarEn[K]> };

export const ro = {
  'app.titlu': 'CNC Vector Studio',
  'app.schelet': 'Scheletul etapei 1: urmează desenul și G-code-ul.',
  'app.instanta': 'Instanța: {nume}',
  'app.instanta.necunoscuta': 'necunoscută',
  'app.limba': 'Limba',
  'jurnal.intrari': {
    one: '{n} eroare în jurnalul local',
    few: '{n} erori în jurnalul local',
    other: '{n} de erori în jurnalul local',
  },
  'eroare.titlu': 'Ceva n-a mers',
  'eroare.explicatie': 'Eroarea s-a salvat în jurnalul local al acestui browser. Copiază raportul și trimite-ni-l.',
  'eroare.copiaza': 'Copiază raportul',
  'eroare.copiat': 'Copiat',
  'eroare.copiere.esuata': 'Copierea n-a mers. Selectează raportul de mai jos și copiază-l de mână.',
  'eroare.reincarca': 'Reîncarcă',
  'eroare.config': 'Configurația instanței nu s-a putut citi: {motiv}',
} as const satisfies DictionarRo;
