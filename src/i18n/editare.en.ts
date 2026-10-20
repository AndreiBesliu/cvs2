import type { Mesaj } from './tipuri.ts';

/** The rulers, guides, snapping and alignment (ADR 0050), in English. They come with the editing module, on demand. */
export const enEditare = {
  'editare.bara': 'Snapping and alignment',
  'editare.lipire': 'Snap',
  'editare.lipire-sfat': 'Snap to guides, the sheet, other shapes and the grid (hold Alt to move freely)',
  'editare.grila': 'Grid',
  'editare.grila-pas': 'Grid step, mm',
  'editare.aliniaza.stanga': 'Align left',
  'editare.aliniaza.centru-x': 'Align centres horizontally',
  'editare.aliniaza.dreapta': 'Align right',
  'editare.aliniaza.sus': 'Align top',
  'editare.aliniaza.centru-y': 'Align centres vertically',
  'editare.aliniaza.jos': 'Align bottom',
  'editare.aliniaza.distribuie-x': 'Distribute horizontally (equal gaps)',
  'editare.aliniaza.distribuie-y': 'Distribute vertically (equal gaps)',
  'editare.aliniaza.fata-de-foaie': '(one shape: against the sheet)',
  'editare.rigla-sus': 'Horizontal ruler, mm: drag down for a horizontal guide',
  'editare.rigla-stanga': 'Vertical ruler, mm: drag right for a vertical guide',
  'editare.ghidaj': 'Guide at {poz} mm: drag to move, drop on the ruler to delete, double-click for the exact position',
  'editare.ghidaj-poz': 'Guide position, mm',
} as const satisfies Readonly<Record<string, Mesaj>>;
