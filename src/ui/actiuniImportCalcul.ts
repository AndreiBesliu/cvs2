import { laturiDinImbricare } from '../io/imbricare.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { caleInchisa, cutieCai, numeDinFisier, pregateste } from '../io/piesa.ts';
import { citesteSvg } from '../io/svg.ts';
import type { FisierImport, PrevizualizareImport } from './actiuniImportTipuri.ts';

/**
 * Previzualizarea SVG (ADR 0035 §9): ușa, imbricarea și mărimea desenului. Se încarcă la cerere. Fiecare cale se citește
 * cu `inchis` al ei (ADR 0037 §2): cutia, prin aceeași funcție ca piesa; laturile, din imbricare (o cale deschisă nu e
 * nici exterior, nici interior: se taie pe linie, ADR 0037 §11). Piesa o face tot modulul ăsta, la „Importă”
 * (`pregatit.piesa`): așa ea nu intră în pachetul de pornire (felia 2.3c-3).
 */
export function previzualizareSvg(f: FisierImport, pxPeTol: 96 | 72, limba: string): PrevizualizareImport {
  const r = citesteSvg(f.octeti, { pxPeTol, limba });
  if (!r.ok) return r;
  const laturi = laturiDinImbricare(r.cai, PLAFON_IMPORT.includeri);
  if (!laturi) return { ok: false, cod: 'plafon', detaliu: 'includeri', avertismente: r.avertismente };
  const cutie = cutieCai(r.cai);
  return {
    ok: true,
    pregatit: pregateste({ nume: numeDinFisier(f.nume), cai: r.cai, laturi, pagina: r.pagina }),
    latime: cutie.maxX - cutie.minX,
    inaltime: cutie.maxY - cutie.minY,
    exterioare: laturi.filter((l, k) => l === 'exterior' && caleInchisa(r.cai[k] ?? {})).length,
    interioare: laturi.filter((l, k) => l === 'interior' && caleInchisa(r.cai[k] ?? {})).length,
    deschise: r.cai.filter((c) => !caleInchisa(c)).length,
    px: r.px,
    illustrator: r.illustrator,
    avertismente: r.avertismente,
  };
}
