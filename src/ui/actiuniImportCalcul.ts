import { cutieContur, CUTIE_GOALA, uneste } from '../geom/cutie.ts';
import { laturiDinImbricare } from '../io/imbricare.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { numeDinFisier } from '../io/piesa.ts';
import { citesteSvg } from '../io/svg.ts';
import type { FisierImport, PrevizualizareImport } from './actiuniImportTipuri.ts';

/** Previzualizarea SVG (ADR 0035 §9): ușa, imbricarea și mărimea desenului. Se încarcă la cerere. */
export function previzualizareSvg(f: FisierImport, pxPeTol: 96 | 72, limba: string): PrevizualizareImport {
  const r = citesteSvg(f.octeti, { pxPeTol, limba });
  if (!r.ok) return r;
  const laturi = laturiDinImbricare(r.cai, PLAFON_IMPORT.includeri);
  if (!laturi) return { ok: false, cod: 'plafon', detaliu: 'includeri', avertismente: r.avertismente };
  let cutie = CUTIE_GOALA;
  for (const c of r.cai) cutie = uneste(cutie, cutieContur({ inchis: true, varfuri: c.varfuri }));
  const interioare = laturi.filter((l) => l === 'interior').length;
  return {
    ok: true,
    pregatit: { nume: numeDinFisier(f.nume), cai: r.cai, laturi, pagina: r.pagina },
    latime: cutie.maxX - cutie.minX,
    inaltime: cutie.maxY - cutie.minY,
    exterioare: laturi.length - interioare,
    interioare,
    px: r.px,
    illustrator: r.illustrator,
    avertismente: r.avertismente,
  };
}
