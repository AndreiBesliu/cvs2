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
} as const satisfies DictionarRoPentru<typeof enTraseu>;
