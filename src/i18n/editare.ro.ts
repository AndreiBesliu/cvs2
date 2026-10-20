import type { enEditare } from './editare.en.ts';
import type { DictionarRoPentru } from './tipuri.ts';

/** Riglele, ghidajele, lipirea și alinierea (ADR 0050), în română: exact cheile din engleză (`editare.en.ts`). */
export const roEditare = {
  'editare.bara': 'Lipirea și alinierea',
  'editare.lipire': 'Lipire',
  'editare.lipire-sfat': 'Lipire de ghidaje, foaie, celelalte forme și grilă (ține Alt ca să muți liber)',
  'editare.grila': 'Grilă',
  'editare.grila-pas': 'Pasul grilei, mm',
  'editare.aliniaza.stanga': 'Aliniază la stânga',
  'editare.aliniaza.centru-x': 'Aliniază centrele pe orizontală',
  'editare.aliniaza.dreapta': 'Aliniază la dreapta',
  'editare.aliniaza.sus': 'Aliniază sus',
  'editare.aliniaza.centru-y': 'Aliniază centrele pe verticală',
  'editare.aliniaza.jos': 'Aliniază jos',
  'editare.aliniaza.distribuie-x': 'Distribuie pe orizontală (goluri egale)',
  'editare.aliniaza.distribuie-y': 'Distribuie pe verticală (goluri egale)',
  'editare.aliniaza.fata-de-foaie': '(o singură formă: față de foaie)',
  'editare.rigla-sus': 'Rigla orizontală, mm: trage în jos pentru un ghidaj orizontal',
  'editare.rigla-stanga': 'Rigla verticală, mm: trage spre dreapta pentru un ghidaj vertical',
  'editare.ghidaj': 'Ghidaj la {poz} mm: trage-l ca să-l muți, lasă-l pe riglă ca să-l ștergi, dublu clic pentru poziția exactă',
  'editare.ghidaj-poz': 'Poziția ghidajului, mm',
  'editare.unealta.selectie': 'Selecție (V)',
  'editare.unealta.dreptunghi': 'Dreptunghi (R): din colț în colț; Shift: pătrat',
  'editare.unealta.cerc': 'Cerc (O): din centru',
  'editare.unealta.elipsa': 'Elipsă (E): din colț în colț; Shift: cerc',
  'editare.unealta.linie': 'Linie (L): din capăt în capăt; Shift: pași de 15°',
  'editare.unealta.poligon': 'Poligon (P): din centru; Shift: pași de 15°',
  'editare.laturi': 'Laturile poligonului (3–64)',
} as const satisfies DictionarRoPentru<typeof enEditare>;
