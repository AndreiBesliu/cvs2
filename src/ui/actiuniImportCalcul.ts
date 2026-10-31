import { citesteDxf } from '../io/dxf.ts';
import { citesteEps } from '../io/eps.ts';
import { citestePdf } from '../io/pdf.ts';
import { laturiDinImbricare } from '../io/imbricare.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { caleInchisa, cutieCai, numeDinFisier, pregateste, type CaleImport } from '../io/piesa.ts';
import { citesteSvg } from '../io/svg.ts';
import { PLAFON } from '../model/document.ts';
import { formatDupaAntet, formatImport } from '../io/formatImport.ts';
import type { FisierImport, PrevizualizareImport, UnitateDxf } from './actiuniImportTipuri.ts';

/** Ce cer ușile: px-ul (SVG), limba (`switch` din SVG), unitatea aleasă (DXF fără unități), pagina (PDF, de la 1). */
export type OptiuniPrevizualizare = {
  readonly pxPeTol: 96 | 72; readonly limba: string; readonly unitate?: UnitateDxf; readonly pagina?: number;
};

/** Imbricarea, mărimea desenului și numărătorile, comune ușilor; null dacă imbricarea trece de plafonul ei. */
function comune(f: FisierImport, cai: ReadonlyArray<CaleImport>, pagina: { readonly latime: number; readonly inaltime: number } | null, pozitie?: 'fisier') {
  const laturi = laturiDinImbricare(cai, PLAFON_IMPORT.includeri);
  if (!laturi) return null;
  const cutie = cutieCai(cai);
  return {
    ok: true as const,
    pregatit: pregateste({ nume: numeDinFisier(f.nume), cai, laturi, pagina, ...(pozitie ? { pozitie } : {}) }),
    latime: cutie.maxX - cutie.minX,
    inaltime: cutie.maxY - cutie.minY,
    exterioare: laturi.filter((l, k) => l === 'exterior' && caleInchisa(cai[k] ?? {})).length,
    interioare: laturi.filter((l, k) => l === 'interior' && caleInchisa(cai[k] ?? {})).length,
    deschise: cai.filter((c) => !caleInchisa(c)).length,
  };
}

/**
 * Previzualizarea SVG (ADR 0035 §9): ușa, imbricarea și mărimea desenului. Se încarcă la cerere. Fiecare cale se citește
 * cu `inchis` al ei (ADR 0037 §2): cutia, prin aceeași funcție ca piesa; laturile, din imbricare (o cale deschisă nu e
 * nici exterior, nici interior: se taie pe linie, ADR 0037 §11). Piesa o face tot modulul ăsta, la „Importă”
 * (`pregatit.piesa`): așa ea nu intră în pachetul de pornire (felia 2.3c-3).
 */
export function previzualizareSvg(f: FisierImport, pxPeTol: 96 | 72, limba: string): PrevizualizareImport {
  const r = citesteSvg(f.octeti, { pxPeTol, limba });
  if (!r.ok) return { ...r, format: 'svg' };
  const c = comune(f, r.cai, r.pagina);
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'svg', avertismente: r.avertismente };
  return { ...c, format: 'svg', px: r.px, illustrator: r.illustrator, avertismente: r.avertismente };
}

/**
 * Previzualizarea DXF (ADR 0101 §8): ușa DXF, apoi aceeași imbricare și aceeași piesă ca la SVG. Fiecare cale poartă
 * numele stratului ei; desenul stă unde e în fișier (originea DXF-ului e originea foii).
 */
export function previzualizareDxf(f: FisierImport, unitate?: UnitateDxf): PrevizualizareImport {
  const r = citesteDxf(f.octeti, unitate ? { unitate } : {});
  if (!r.ok) return { ...r, format: 'dxf' };
  const cai = r.cai.map((c) => ({ varfuri: c.varfuri, inchis: c.inchis, nume: c.strat.slice(0, PLAFON.numeLungime) }));
  const c = comune(f, cai, null, 'fisier');
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'dxf', avertismente: r.avertismente };
  return { ...c, format: 'dxf', unitati: { mmPeUnitate: r.unitati.mmPeUnitate, declarate: r.unitati.declarate, unitate: r.unitati.unitate }, avertismente: r.avertismente };
}

/**
 * Previzualizarea PDF și AI (ADR 0104 §7): pagina aleasă, prin aceeași imbricare și aceeași piesă ca la SVG. Căile sunt
 * în mm față de colțul stânga-jos al paginii afișate, deci desenul ajunge pe foaie unde era pe pagină; stratul (OCG) devine
 * numele elementului, ca la DXF.
 */
export async function previzualizarePdf(f: FisierImport, pagina?: number): Promise<PrevizualizareImport> {
  const r = await citestePdf(f.octeti, pagina ? { pagina } : {});
  if (!r.ok) return { ...r, format: 'pdf' };
  const cai = r.cai.map((c) => ({ varfuri: c.varfuri, inchis: c.inchis, ...(c.strat ? { nume: c.strat.slice(0, PLAFON.numeLungime) } : {}) }));
  const c = comune(f, cai, r.marime);
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'pdf', pagini: r.pagini, avertismente: r.avertismente };
  return { ...c, format: 'pdf', pagini: r.pagini, pagina: r.pagina, straturi: r.straturi, avertismente: r.avertismente };
}

/**
 * Previzualizarea EPS și AI ≤ 8 (ADR 0115 §7): ușa EPS, apoi aceeași imbricare și aceeași piesă ca la SVG. Căile sunt în
 * mm față de originea PostScript, deci desenul stă unde e în fișier (ca la DXF); stratul AI devine numele elementului.
 */
export function previzualizareEps(f: FisierImport): PrevizualizareImport {
  const r = citesteEps(f.octeti);
  if (!r.ok) return { ...r, format: 'eps' };
  const cai = r.cai.map((c) => ({ varfuri: c.varfuri, inchis: c.inchis, ...(c.strat ? { nume: c.strat.slice(0, PLAFON.numeLungime) } : {}) }));
  const c = comune(f, cai, null, 'fisier');
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'eps', avertismente: r.avertismente };
  return { ...c, format: 'eps', straturi: r.straturi, illustrator: r.illustrator, avertismente: r.avertismente };
}

/**
 * Ușa după formatul fișierului: SVG sau DXF după nume; PDF, AI și EPS după antet (ADR 0115 §1: un AI e PDF de la
 * Illustrator 9 și PostScript înainte), la fel un fișier fără extensie cunoscută; altul, refuzat (`tip`).
 */
export async function previzualizare(f: FisierImport, o: OptiuniPrevizualizare): Promise<PrevizualizareImport> {
  const format = formatImport(f.nume, '') ?? formatDupaAntet(f.octeti);
  if (format === 'pdf' || format === 'eps') return (formatDupaAntet(f.octeti) ?? format) === 'eps' ? previzualizareEps(f) : previzualizarePdf(f, o.pagina);
  if (format === 'dxf') return previzualizareDxf(f, o.unitate);
  if (format === 'svg') return previzualizareSvg(f, o.pxPeTol, o.limba);
  return { ok: false, cod: 'tip' };
}
