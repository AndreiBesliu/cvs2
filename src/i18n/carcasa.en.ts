import type { Mesaj } from './tipuri.ts';

/**
 * Mesajele carcasei care vin la cerere (prototipul B): paleta de comenzi, panoul de proprietăți și nivelul piesei din
 * arborele proiectului, în engleză. Se încarcă odată cu ele (`carcasa.ts`), nu la pornire: pachetul de pornire are un
 * plafon (`PLAN.md` §4.4).
 */
export const enCarcasa = {
  'paleta.titlu': 'Command palette',
  'paleta.cauta': 'Type to filter the commands',
  'paleta.niciuna': 'No command matches “{text}”.',
  'paleta.ajutor': '↑ ↓ choose · Enter runs · Esc closes',
  'paleta.grup.fisier': 'File',
  'paleta.grup.document': 'Drawing',
  'paleta.grup.istoric': 'History',
  'paleta.grup.selectie': 'Selection',
  'paleta.grup.vedere': 'View',
  'paleta.gest.selectie.la-punct': 'Click a shape on the canvas.',
  'paleta.gest.selectie.din-lista': 'Click a row in the sheet list.',
  'paleta.gest.document.muta-selectia': 'Drag the selection on the canvas.',
  'paleta.gest.document.importa': 'From the Import SVG window.',
  'paleta.gest.document.aplica-operatii': 'With Export, from its window.',
  'prop.titlu': 'Properties',
  'prop.nota': 'Read only: editing comes with slice 2.8. Until then, the operation values change in the Export G-code window.',
  'prop.foaia': 'Sheet',
  'prop.marime': 'Size',
  'prop.mm3': '{latime} × {inaltime} × {grosime} mm',
  'prop.forme': 'Shapes on the sheet',
  'prop.pozitia': 'Position',
  'prop.xy': 'X {x}, Y {y} mm',
  'prop.rotirea': 'Rotation',
  'prop.cutia': 'Bounding box',
  'prop.mm2': '{latime} × {inaltime} mm',
  'prop.elemente': 'Shapes in the selection',
  'prop.operatia': 'Operation {n}: profile',
  'prop.freza': 'Cutter',
  'prop.freza.valoare': 'T{numar}, Ø{diametru} mm',
  'prop.urechi.valoare': '{numar} × {latime} mm, bridge {grosime} mm',
  'prop.rampa.valoare': '{mm} mm long',
  'prop.intrari.valoare': 'radius {mm} mm',
  'prop.fara': 'no',
  'prop.selectate': { one: '{n} part selected', other: '{n} parts selected' },
  'arbore.piesa': { one: 'Part: {n} shape', other: 'Part: {n} shapes' },
  'arbore.operatie': {
    one: 'Profile ({latura}) on {n} contour: {adancime} mm in passes of {pas} mm, T{t} Ø{d}',
    other: 'Profile ({latura}) on {n} contours: {adancime} mm in passes of {pas} mm, T{t} Ø{d}',
  },
  'arbore.fara-operatii': 'No cutting operation',
} as const satisfies Readonly<Record<string, Mesaj>>;
