import { citesteDxf } from '../io/dxf.ts';
import { citesteEps } from '../io/eps.ts';
import { citestePdf } from '../io/pdf.ts';
import { laturiDinImbricare } from '../io/imbricare.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { caleInchisa, cutieCai, numeDinFisier, pregateste, type CaleImport } from '../io/piesa.ts';
import { citesteSvg } from '../io/svg.ts';
import { citesteWmf } from '../io/wmf.ts';
import { PLAFON, type Latura } from '../model/document.ts';
import { formatDupaAntet, formatImport } from '../io/formatImport.ts';
import { LINIE, type Punct, type Varf } from '../geom/contur.ts';
import { REZOLUTIE } from '../geom/toleranta.ts';
import { praf, preaDeparte } from '../io/caleImport.ts';
import { dpiImagine, felImagine, TRASARE_IMPLICITA, type AlegeriTrasare } from '../io/imagine.ts';
import { trasareInBazin, TrasareAnulata, TrasareCazuta } from '../jobs/bazinTrasare.ts';
import type { RaspunsTrasare } from '../jobs/calculTrasare.ts';
import type { CaiTrasate } from '../trasare/trasare.ts';
import type { AvertismenteImagine, FisierImport, PrevizualizareImport, RaportImagine, UnitateDxf, UnitateWmf } from './actiuniImportTipuri.ts';

/**
 * Ce cer ușile: px-ul (SVG), limba (`switch` din SVG), unitatea aleasă (un DXF fără unități, un WMF fără antet), pagina (PDF,
 * de la 1), alegerile trasării (o imagine, ADR 0220). Unitatea WMF și trasarea vin din context așa cum sunt, și nedefinite:
 * fiecare octet al acțiunii stă în pachetul de pornire.
 */
export type OptiuniPrevizualizare = {
  readonly pxPeTol: 96 | 72; readonly limba: string; readonly unitate?: UnitateDxf; readonly unitateWmf?: UnitateWmf | undefined; readonly pagina?: number;
  readonly trasare?: AlegeriTrasare | undefined;
};

/**
 * Imbricarea, mărimea desenului și numărătorile, comune ușilor; null dacă imbricarea trece de plafonul ei. O imagine trasată
 * își dă laturile (`date`): orientarea fiecărui contur le spune, fără imbricare (ADR 0220; pe 2 162 de contururi ale unei
 * poze, imbricarea ținea firul principal 553 ms).
 */
function comune(f: FisierImport, cai: ReadonlyArray<CaleImport>, pagina: { readonly latime: number; readonly inaltime: number } | null,
  pozitie?: 'fisier', date?: readonly Latura[]) {
  const laturi = date ?? laturiDinImbricare(cai, PLAFON_IMPORT.includeri);
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
 * Previzualizarea WMF (ADR 0117 §9): ușa WMF, apoi aceeași imbricare și aceeași piesă ca la SVG. Cu antetul placeable, cadrul
 * lui e pagina (desenul stă pe foaie unde e în cadru, ca la PDF); fără el, desenul vine în colțul foii, ca un SVG fără
 * mărime, iar unitatea e cea aleasă în dialog.
 */
export function previzualizareWmf(f: FisierImport, unitate?: UnitateWmf): PrevizualizareImport {
  const r = citesteWmf(f.octeti, unitate ? { unitate } : {});
  if (!r.ok) return { ...r, format: 'wmf' };
  const c = comune(f, r.cai, r.cadru);
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'wmf', avertismente: r.avertismente };
  return { ...c, format: 'wmf', unitati: r.unitati, avertismente: r.avertismente };
}

/**
 * Ușa după formatul fișierului: SVG, DXF și WMF (cu EMF-ul, refuzat de ea) după nume; PDF, AI și EPS după antet (ADR 0115
 * §1: un AI e PDF de la Illustrator 9 și PostScript înainte); un fișier fără extensie cunoscută, după antet; altul,
 * refuzat (`tip`).
 */
/** Raportul imaginii din răspunsul workerului: pixelii, scara și ce a făcut trasarea. */
function raportImagine(r: Exclude<RaspunsTrasare, { cod: 'citire' }>): RaportImagine {
  const { raport: t } = r;
  return {
    latimePx: t.latime, inaltimePx: t.inaltime, redusDin: r.redusDin, latimeMm: t.latime * r.mmPePx, inaltimeMm: t.inaltime * r.mmPePx,
    mmPePx: r.mmPePx, scara: r.scara, dpi: r.dpi, sursa: t.sursa, transparenta: t.transparenta, prag: t.prag, automat: t.automat,
    margini: t.margini, pete: t.pete, gauri: t.gauri, contururi: t.contururi, varfuri: t.varfuri, abaterePx: t.abatere,
  };
}

/**
 * Căile trasate (pixeli, Y în jos) ca ale unui import: în mm, cu Y în sus, imaginea fiind o pagină (colțul ei stânga-jos e
 * colțul foii). O cale sub rezoluție (praful) sau peste plafonul unei căi se sare, numărată.
 */
type CaleTrasata = { readonly varfuri: Varf[]; readonly inchis: true };

function caiDinTrasare(c: CaiTrasate, mmPePx: number, inaltimePx: number): { cai: CaleTrasata[]; laturi: Latura[]; avertismente: AvertismenteImagine } {
  const P = (x: number, y: number): Punct => ({ x: x * mmPePx, y: (inaltimePx - y) * mmPePx });
  const cai: CaleTrasata[] = [];
  const laturi: Latura[] = [];
  let sub = 0, mari = 0;
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
    if (b - a > PLAFON.varfuriCale) { mari++; continue; }
    const varfuri: Varf[] = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let v = a; v < b; v++) {
      const q = (i: number): number => c.xy[6 * v + i] ?? 0;
      x0 = Math.min(x0, q(0)); x1 = Math.max(x1, q(0)); y0 = Math.min(y0, q(1)); y1 = Math.max(y1, q(1));
      varfuri.push({ p: P(q(0), q(1)), s: c.tip[v] === 1 ? { tip: 'C', c1: P(q(2), q(3)), c2: P(q(4), q(5)) } : LINIE });
    }
    // Praful îl judecă `praf` (cutia exactă, cu extremele cubicelor), dar doar unde poate fi: vârfurile stau pe curbă, deci în
    // cutia ei, iar o cutie a vârfurilor peste rezoluție e deja destul. Pe o poză cu 6 000 de contururi, cutia exactă a
    // fiecăruia ținea firul principal 0,14 s din 0,22.
    const varfuriPeste = Math.hypot(x1 - x0, y1 - y0) * mmPePx >= REZOLUTIE;
    if (varfuri.length < 2 || (!varfuriPeste && praf(varfuri))) { sub++; continue; }
    cai.push({ varfuri, inchis: true });
    laturi.push(c.exterior[k] === 1 ? 'exterior' : 'interior');
  }
  return { cai, laturi, avertismente: { 'sub-rezolutie': sub, 'prea-mari': mari } };
}

/** Trasarea în curs: o previzualizare nouă o oprește pe cea veche (workerul ei se oprește din mijlocul calculului). */
let trasareAnterioara: AbortController | null = null;

/**
 * Previzualizarea unei imagini (ADR 0220): trasarea în workerul ei, cu alegerile din fereastră, apoi aceeași imbricare și
 * aceeași piesă ca la SVG. TIFF-ul se refuză deocamdată (răspunsul 5a); o imagine pe care browserul n-o decodează, prea
 * multe contururi sau trasarea peste termen, la fel, cu motivul lor.
 */
export async function previzualizareImagine(f: FisierImport, t: AlegeriTrasare | undefined): Promise<PrevizualizareImport> {
  if (felImagine(f.octeti) === 'tiff' || (/\.tiff?$/i.test(f.nume) && !felImagine(f.octeti))) return { ok: false, cod: 'tiff', format: 'imagine' };
  const a = t ?? TRASARE_IMPLICITA;
  trasareAnterioara?.abort();
  const ctrl = new AbortController();
  trasareAnterioara = ctrl;
  let r: RaspunsTrasare;
  try {
    r = await trasareInBazin({
      imagine: new Blob([new Uint8Array(f.octeti)]),
      optiuni: { sursa: a.sursa, prag: a.prag, inverseaza: a.inverseaza, netezime: a.netezime },
      peteMm: a.peteMm, gauriMm: a.gauriMm, latimeMm: a.latimeMm, dpi: dpiImagine(f.octeti),
    }, { semnal: ctrl.signal });
  } catch (e) {
    if (e instanceof TrasareAnulata) return { ok: false, cod: 'anulat', format: 'imagine' };
    if (e instanceof TrasareCazuta) return { ok: false, cod: 'imagine-timp', format: 'imagine', detaliu: e.message };
    throw e;
  } finally {
    if (trasareAnterioara === ctrl) trasareAnterioara = null;
  }
  if (!r.ok && r.cod === 'citire') return { ok: false, cod: 'imagine-citire', format: 'imagine', detaliu: r.detaliu };
  const trasare = raportImagine(r);
  if (!r.ok) return { ok: false, cod: 'prea-multe', format: 'imagine', detaliu: String(r.raport.contururi), trasare };
  const { cai, laturi, avertismente } = caiDinTrasare(r.cai, r.mmPePx, r.raport.inaltime);
  if (cai.length === 0) return { ok: false, cod: 'gol', format: 'imagine', avertismente, trasare };
  if (preaDeparte(cai)) return { ok: false, cod: 'departe', format: 'imagine', trasare };
  const c = comune(f, cai, { latime: trasare.latimeMm, inaltime: trasare.inaltimeMm }, undefined, laturi);
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'imagine', avertismente, trasare };
  return { ...c, format: 'imagine', trasare, avertismente, contur: r.cai };
}

export async function previzualizare(f: FisierImport, o: OptiuniPrevizualizare): Promise<PrevizualizareImport> {
  const format = formatImport(f.nume, '') ?? formatDupaAntet(f.octeti);
  if (format === 'imagine') return previzualizareImagine(f, o.trasare);
  if (format === 'pdf' || format === 'eps') return (formatDupaAntet(f.octeti) ?? format) === 'eps' ? previzualizareEps(f) : previzualizarePdf(f, o.pagina);
  if (format === 'wmf') return previzualizareWmf(f, o.unitateWmf);
  if (format === 'dxf') return previzualizareDxf(f, o.unitate);
  if (format === 'svg') return previzualizareSvg(f, o.pxPeTol, o.limba);
  return { ok: false, cod: 'tip' };
}
