import type { enTraseu } from './traseu.en.ts';
import type { DictionarRoPentru } from './tipuri.ts';

/** Mesajele traseului de pe pânză, în română: exact cheile din engleză (`traseu.en.ts`). */
export const roTraseu = {
  'traseu.calcul': 'Se calculează traseul…',
  'traseu.vechi': 'Traseul e vechi: T îl calculează din nou',
  'traseu.refuz': 'Traseul nu se poate calcula: {motiv}',
  'traseu.fara-webgl': 'Traseul nu se poate afișa: WebGL2 indisponibil în browser',
  'traseu.context': 'Placa video a pierdut traseul; revine singur',
  'traseu.rarit': 'Traseu mare: arcele sunt desenate mai rar',
  'traseu.timp': 'Timpul jobului: {timp}',
  'traseu.timp.implicit': 'Estimat pentru {nume} cu setările din fabrică. Pentru timpii mașinii tale, lipește răspunsul ei la $$ în dialogul exportului.',
  'traseu.timp.setari': 'Estimat pentru {nume} cu setările $$ lipite.',
  'traseu.timp.fara': 'Fără timpul jobului: {motiv}',
  'traseu.timp.fara-setari': 'Fără timpul jobului: setările $$ lipite, linia {linie}: {motiv}',
  'traseu.timp.fara-setari-tot': 'Fără timpul jobului: setările $$ lipite: {motiv}',
  'durata.s': '{s} s',
  'durata.min': '{m} min {s} s',
  'durata.h': '{h} h {m} min',
} as const satisfies DictionarRoPentru<typeof enTraseu>;
