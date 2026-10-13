import { laturiDinImbricare } from '../io/imbricare.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { cutieCai, numeDinFisier } from '../io/piesa.ts';
import { citesteSvg } from '../io/svg.ts';
import type { FisierImport, PrevizualizareImport } from './actiuniImportTipuri.ts';

/**
 * Previzualizarea SVG (ADR 0035 §9): ușa, imbricarea și mărimea desenului. Se încarcă la cerere. Fiecare cale se citește
 * cu `inchis` al ei (ADR 0037 §2): cutia, prin aceeași funcție ca piesa; laturile, din imbricare (o cale deschisă nu e
 * nici exterior, nici interior).
 */
export function previzualizareSvg(f: FisierImport, pxPeTol: 96 | 72, limba: string): PrevizualizareImport {
  const r = citesteSvg(f.octeti, { pxPeTol, limba });
  if (!r.ok) return r;
  const laturi = laturiDinImbricare(r.cai, PLAFON_IMPORT.includeri);
  if (!laturi) return { ok: false, cod: 'plafon', detaliu: 'includeri', avertismente: r.avertismente };
  const cutie = cutieCai(r.cai);
  return {
    ok: true,
    pregatit: { nume: numeDinFisier(f.nume), cai: r.cai, laturi, pagina: r.pagina },
    latime: cutie.maxX - cutie.minX,
    inaltime: cutie.maxY - cutie.minY,
    exterioare: laturi.filter((l) => l === 'exterior').length,
    interioare: laturi.filter((l) => l === 'interior').length,
    px: r.px,
    illustrator: r.illustrator,
    avertismente: r.avertismente,
  };
}
