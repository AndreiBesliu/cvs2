/**
 * Documentul unui caz al incrustației în V (`test/oracles/incrustatie.cazuri.ts`), comun probelor potrivirii (ADR 0170) și
 * benzii cu decupare (ADR 0172), ca o probă să nu importe alta (node:test ar rula și testele ei).
 */
import type { CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Forma „cale” închisă a unui poligon, în coordonatele foii (matricea identitate). */
const cale = (pol: readonly (readonly [number, number])[]) => ({
  tip: 'cale', inchis: true, varfuri: pol.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })),
});

/**
 * Documentul v20 al unui caz: o piesă cu desenul și operația de incrustație, pe o foaie de 200 × 150 × 18. Fără
 * incrustație (`cuIncrustatie: false`), operația e un V-carve obișnuit al desenului: controlul negativ.
 */
export function documentCaz(c: CazIncrustatie, cuIncrustatie = true): unknown {
  const noduri = c.cerc
    ? [{ tip: 'element', id: 'a', matrice: { ...I, e: c.cerc.cx, f: c.cerc.cy }, forma: { tip: 'cerc', raza: c.cerc.r } }]
    : c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const operatie = {
    id: 'inc', tip: 'vcarve', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.D, pas: c.pas,
    scula: { numar: 2, nume: `freza V${c.v.unghi}`, diametru: c.v.diametru, forma: { tip: 'v', unghi: c.v.unghi } },
    urechi: null, rampa: null, intrari: null, colturi: null,
    fundPlat: { scula: { numar: 1, nume: 'freza dreapta', diametru: c.dreapta.diametru }, pasLateral: c.dreapta.pasLateral },
    ...(cuIncrustatie ? { incrustatie: { fel: 'v', joc: c.g, fierastrau: c.H, margine: c.margine, jurDop: 'fata' } } : {}),
  };
  return {
    schema: 20, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii: [operatie] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}
