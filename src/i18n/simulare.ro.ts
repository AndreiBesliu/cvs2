import type { enSimulare } from './simulare.en.ts';
import type { DictionarRoPentru } from './tipuri.ts';

/** Mesajele simulării din dialogul exportului, în română: exact cheile din engleză (`simulare.en.ts`). */
export const roSimulare = {
  'simulare.titlu': 'Simularea',
  'simulare.harta': 'Harta adâncimilor pe foaie, văzută de sus: alb = fața neatinsă, mai închis = mai adânc, negru = până la fața de jos.',
  'simulare.legenda': 'Alb: fața (0 mm) · gri cel mai închis: {adancime} mm adâncime · negru: prin foaie',
  'simulare.volum': 'Material scos: {cm3} cm³',
  'simulare.adancime': 'Cea mai adâncă tăietură: {mm} mm',
  'simulare.prin-foaie': 'Scula ajunge la fața de jos a foii ({grosime} mm): tăietura trece prin foaie.',
  'simulare.grila': {
    one: 'Grila de {celula} mm ({nx} × {ny} celule), calculată pe {n} fir în {ms} ms.',
    few: 'Grila de {celula} mm ({nx} × {ny} celule), calculată pe {n} fire în {ms} ms.',
    other: 'Grila de {celula} mm ({nx} × {ny} celule), calculată pe {n} de fire în {ms} ms.',
  },
  'simulare.amprenta': 'Amprenta {amprenta}: aceeași în orice browser, pe oricâte fire.',
  'simulare.eroare': 'Simularea nu s-a putut face: {motiv}',
} as const satisfies DictionarRoPentru<typeof enSimulare>;
