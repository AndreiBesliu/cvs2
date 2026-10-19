import type { Mesaj } from './tipuri.ts';

/**
 * Mesajele simulării din dialogul exportului (ADR 0047 §5), în engleză: harta adâncimilor și cifrele. Vin cu dialogul
 * (`simulare.ts`), nu la pornire.
 */
export const enSimulare = {
  'simulare.titlu': 'Simulation',
  'simulare.calcul': 'Simulating the program… (the G-code is already downloaded)',
  'simulare.harta': 'Depth map of the sheet, seen from above: white is the untouched surface, darker is deeper, black reaches the bottom face.',
  'simulare.legenda': 'White: surface (0 mm) · darkest grey: {adancime} mm deep · black: through the sheet',
  'simulare.volum': 'Material removed: {cm3} cm³',
  'simulare.adancime': 'Deepest cut: {mm} mm',
  'simulare.prin-foaie': 'The tool reaches the bottom face of the sheet ({grosime} mm): the cut goes through.',
  'simulare.grila': {
    one: 'Grid of {celula} mm ({nx} × {ny} cells), computed on {n} thread in {ms} ms.',
    other: 'Grid of {celula} mm ({nx} × {ny} cells), computed on {n} threads in {ms} ms.',
  },
  'simulare.amprenta': 'Fingerprint {amprenta}: the same in every browser and on any number of threads.',
  'simulare.eroare': 'The simulation could not be done: {motiv}',
} as const satisfies Readonly<Record<string, Mesaj>>;
