import { citesteDxf } from '../io/dxf.ts';
import { citesteEps } from '../io/eps.ts';
import { citestePdf, imagineaPaginiiPdf } from '../io/pdf.ts';
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
import { dpiImagine, formatFoaie, TRASARE_IMPLICITA, type AlegeriTrasare } from '../io/imagine.ts';
import { trasareInBazin, TrasareAnulata, TrasareCazuta } from '../jobs/bazinTrasare.ts';
import type { CerereTrasare, RaspunsTrasare } from '../jobs/calculTrasare.ts';
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
  /** Oprirea citirii (o citire nouă, Renunță, Escape): trasarea în curs își oprește workerul. */
  readonly semnal?: AbortSignal | undefined;
  /** Trasarea imaginii paginii unui PDF care are și vectori (ADR 0270), cerută în dialog. */
  readonly imaginePdf?: boolean;
};

/** Așezarea imaginii unei pagini PDF (ADR 0270): DPI-ul pe lățimea ei și orientarea (1–8, ca eticheta TIFF). */
type AsezarePdf = { readonly dpi: number; readonly orientare: number };

/**
 * Imbricarea, mărimea desenului și numărătorile, comune ușilor; null dacă imbricarea trece de plafonul ei. O imagine trasată
 * își dă laturile (`date`): orientarea fiecărui contur le spune, fără imbricare (ADR 0220; pe 2 162 de contururi ale unei
 * poze, imbricarea ținea firul principal 553 ms).
 */
function comune(f: FisierImport, cai: ReadonlyArray<CaleImport>, pagina: { readonly latime: number; readonly inaltime: number } | null,
  pozitie?: 'fisier', date?: readonly Latura[], nume = numeDinFisier(f.nume)) {
  const laturi = date ?? laturiDinImbricare(cai, PLAFON_IMPORT.includeri);
  if (!laturi) return null;
  const cutie = cutieCai(cai);
  return {
    ok: true as const,
    pregatit: pregateste({ nume, cai, laturi, pagina, ...(pozitie ? { pozitie } : {}) }),
    latime: cutie.maxX - cutie.minX,
    inaltime: cutie.maxY - cutie.minY,
    exterioare: laturi.filter((l, k) => l === 'exterior' && caleInchisa(cai[k] ?? {})).length,
    interioare: laturi.filter((l, k) => l === 'interior' && caleInchisa(cai[k] ?? {})).length,
    // Tăiate pe linie: căile deschise și buclele cu latura „pe-linie” (liniile mediane, ADR 0222 §7).
    deschise: cai.filter((c, k) => !caleInchisa(c) || laturi[k] === 'pe-linie').length,
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
 * Imaginea paginii unui PDF (ADR 0270): cerută (`imagine`, o pagină care are și vectori), cu alegerile trasării și oprirea
 * citirii, ca la o imagine.
 */
export type OptiuniImaginePdf = {
  readonly imagine?: boolean; readonly trasare?: AlegeriTrasare | undefined; readonly semnal?: AbortSignal | undefined;
};

/**
 * Previzualizarea PDF și AI (ADR 0104 §7): pagina aleasă, prin aceeași imbricare și aceeași piesă ca la SVG. Căile sunt
 * în mm față de colțul stânga-jos al paginii afișate, deci desenul ajunge pe foaie unde era pe pagină; stratul (OCG) devine
 * numele elementului, ca la DXF. O pagină scanată (ADR 0270), fără vectori dar cu o imagine, se trasează singură; una cu
 * vectori și cu imagine arată vectorii, cu numărul imaginilor, iar imaginea se trasează la cerere (`o.imagine`).
 */
export async function previzualizarePdf(f: FisierImport, pagina?: number, o: OptiuniImaginePdf = {}): Promise<PrevizualizareImport> {
  const r = await citestePdf(f.octeti, pagina ? { pagina } : {});
  // Vectorii paginii, dacă citirea lor a dat ceva în afară de „gol”: trasarea oferă întoarcerea la ei.
  const vectori = r.ok || r.cod !== 'gol';
  if ((r.imagini ?? 0) > 0 && (o.imagine === true || !vectori)) return imagineaPaginii(f, pagina, o, vectori);
  if (!r.ok) return { ...r, format: 'pdf' };
  const cai = r.cai.map((c) => ({ varfuri: c.varfuri, inchis: c.inchis, ...(c.strat ? { nume: c.strat.slice(0, PLAFON.numeLungime) } : {}) }));
  const c = comune(f, cai, r.marime);
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'pdf', pagini: r.pagini, avertismente: r.avertismente, imagini: r.imagini };
  return { ...c, format: 'pdf', pagini: r.pagini, pagina: r.pagina, straturi: r.straturi, avertismente: r.avertismente, imagini: r.imagini };
}

/**
 * Trasarea imaginii paginii (ADR 0270): fișierul ei (JPEG, sau TIFF) trece prin ușa imaginilor, cu DPI-ul și orientarea
 * așezării; paginile sunt ale PDF-ului (alegerea paginii), iar un refuz al cititorului TIFF e al imaginii paginii.
 */
async function imagineaPaginii(f: FisierImport, pagina: number | undefined, o: OptiuniImaginePdf, vectoriPdf: boolean): Promise<PrevizualizareImport> {
  const im = await imagineaPaginiiPdf(f.octeti, pagina ? { pagina } : {});
  if (!im.ok) {
    const cod = im.cod === 'nesprijinit' ? 'pdf-imagine' : im.cod === 'stricat' || im.cod === 'fara-imagine' ? 'pdf-imagine-stricata' : im.cod;
    return { ok: false, cod, format: 'pdf', vectoriPdf, ...(im.detaliu !== undefined ? { detaliu: im.detaliu } : {}), ...(im.pagini ? { pagini: im.pagini } : {}) };
  }
  const p = await previzualizareImagine({ nume: f.nume, octeti: im.fisier.octeti }, o.trasare, o.semnal, undefined, { dpi: im.dpi, orientare: im.orientare });
  if (p.ok) return p.format === 'imagine' ? { ...p, trasare: { ...p.trasare, pagini: im.pagini }, vectoriPdf } : p;
  if (p.cod === 'tiff' || p.cod === 'tiff-stricat') {
    return { ok: false, cod: p.cod === 'tiff' ? 'pdf-imagine' : 'pdf-imagine-stricata', format: 'pdf', vectoriPdf, pagini: im.pagini, ...(p.detaliu !== undefined ? { detaliu: p.detaliu } : {}) };
  }
  return { ...p, pagini: im.pagini, vectoriPdf, ...(p.trasare ? { trasare: { ...p.trasare, pagini: im.pagini } } : {}) };
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
/** Raportul imaginii din răspunsul workerului: pixelii, scara și ce a făcut trasarea (pe culori, și paleta, ADR 0221). */
function raportImagine(r: Exclude<RaspunsTrasare, { cod: 'citire' } | { cod: 'tiff' }>): RaportImagine {
  const t = r.raport;
  const baza = {
    latimePx: t.latime, inaltimePx: t.inaltime, redusDin: r.redusDin, latimeMm: t.latime * r.mmPePx, inaltimeMm: t.inaltime * r.mmPePx,
    intreg: { latimePx: r.intreg.latime, inaltimePx: r.intreg.inaltime }, zona: r.zona,
    mmPePx: r.mmPePx, scara: r.scara, dpi: r.dpi, foaie: r.foaie, transparenta: t.transparenta, automat: t.automat,
    margini: t.margini, pete: t.pete, gauri: t.gauri, margine: t.margine, contururi: t.contururi, varfuri: t.varfuri, abaterePx: t.abatere,
    lumina: r.raport.lumina, inegala: r.raport.inegala, ...(r.pagini !== undefined ? { pagini: r.pagini } : {}),
    ...(r.poza ? { poza: r.poza } : {}),
  } as const;
  if (r.fel === 'culori') {
    // Cu liniile mediane (ADR 0227): grosimea fiecărei culori, în pastila ei, și raportul lor.
    const piese = r.ok ? r.piese.map((p) => ({ culoare: p.culoare, hex: p.hex, contur: p.cai, ...(p.grosime !== undefined ? { grosimePx: p.grosime } : {}) })) : [];
    const m = r.ok ? r.raport.mediane : undefined;
    return {
      ...baza, sursa: 'culori', prag: 0, histograma: [], culori: { paleta: r.raport.paleta, posterizare: r.ok ? r.posterizare : null, piese },
      ...(m ? { mediane: { grosimePx: m.grosime, bucle: m.bucle, jonctiuni: m.jonctiuni, puncte: m.puncte, legaturi: m.legaturi, ...(m.parti ? { parti: m.parti } : {}) } } : {}),
    };
  }
  if (r.fel === 'mediane') {
    const { grosime, bucle, jonctiuni, puncte, parti } = r.raport;
    return {
      ...baza, sursa: r.raport.sursa, prag: r.raport.prag, histograma: r.raport.histograma,
      mediane: { grosimePx: grosime, bucle, jonctiuni, puncte, ...(parti ? { parti } : {}) },
    };
  }
  return { ...baza, sursa: r.raport.sursa, prag: r.raport.prag, histograma: r.raport.histograma };
}

/**
 * Căile mai multor trasări, una după alta (contururile tuturor culorilor, pentru desenul previzualizării), cu căile deschise
 * și laturile liniilor mediane (ADR 0227), dacă le au.
 */
function laolalta(lista: readonly CaiTrasate[]): CaiTrasate {
  let nc = 0, nv = 0;
  for (const c of lista) { nc += c.inceput.length - 1; nv += c.tip.length; }
  const inceput = new Uint32Array(nc + 1), tip = new Uint8Array(nv), xy = new Float64Array(6 * nv), exterior = new Uint8Array(nc);
  const deschisa = lista.some((c) => c.deschisa) ? new Uint8Array(nc) : null;
  // `peLinie`, dacă îl are o piesă, sau dacă liniile mediane stau lângă contururi (ADR 0228): buclele contururilor, nu pe linie.
  const peLinie = lista.some((c) => c.peLinie) || (deschisa && lista.some((c) => !c.deschisa)) ? new Uint8Array(nc) : null;
  let k = 0, v = 0;
  for (const c of lista) {
    for (let j = 0; j + 1 < c.inceput.length; j++) {
      inceput[k + j + 1] = v + (c.inceput[j + 1] ?? 0); exterior[k + j] = c.exterior[j] ?? 0;
      if (deschisa) deschisa[k + j] = c.deschisa?.[j] ?? 0;
      // Fără `peLinie`: toate pe linie la o piesă de linii mediane, niciuna la una de contururi (ADR 0228: alături).
      if (peLinie) peLinie[k + j] = c.peLinie?.[j] ?? (c.deschisa ? 1 : 0);
    }
    tip.set(c.tip, v); xy.set(c.xy, 6 * v);
    k += c.inceput.length - 1; v += c.tip.length;
  }
  return { inceput, tip, xy, exterior, ...(deschisa ? { deschisa } : {}), ...(peLinie ? { peLinie } : {}) };
}

/**
 * Previzualizarea pe culori (ADR 0221 §6): câte o piesă pe culoare bifată, toate din aceeași pagină (imaginea), deci
 * aliniate; numele, al fișierului și al culorii. „Importă” le adaugă împreună (`impreuna`), într-un singur pas de anulare.
 */
function previzualizareCulori(f: FisierImport, r: Extract<RaspunsTrasare, { fel: 'culori'; ok: true }>, trasare: RaportImagine): PrevizualizareImport {
  const pagina = { latime: trasare.latimeMm, inaltime: trasare.inaltimeMm };
  const baza = numeDinFisier(f.nume);
  const piese: Array<NonNullable<ReturnType<typeof comune>>> = [];
  let sub = 0, mari = 0;
  for (const pc of r.piese) {
    const { cai, laturi, avertismente: a } = caiDinTrasare(pc.cai, r.mmPePx, r.raport.inaltime);
    sub += a['sub-rezolutie']; mari += a['prea-mari'];
    if (cai.length === 0) continue;
    const c = comune(f, cai, pagina, undefined, laturi, `${baza.slice(0, PLAFON.numeLungime - pc.hex.length - 1)} ${pc.hex}`);
    if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'imagine', avertismente: { 'sub-rezolutie': sub, 'prea-mari': mari }, trasare };
    piese.push(c);
  }
  const avertismente = { 'sub-rezolutie': sub, 'prea-mari': mari };
  const [prima, ...rest] = piese;
  if (!prima) return { ok: false, cod: 'gol', format: 'imagine', avertismente, trasare };
  const toate = piese.flatMap((p) => p.pregatit.cai.map((c) => ({ varfuri: c.varfuri, inchis: true })));
  if (preaDeparte(toate)) return { ok: false, cod: 'departe', format: 'imagine', trasare };
  const cutie = cutieCai(toate);
  return {
    ok: true, format: 'imagine', trasare, avertismente, contur: laolalta(r.piese.map((p) => p.cai)), ...(r.late ? { late: r.late } : {}),
    pregatit: rest.length > 0 ? { ...prima.pregatit, impreuna: rest.map((p) => p.pregatit) } : prima.pregatit,
    latime: cutie.maxX - cutie.minX, inaltime: cutie.maxY - cutie.minY,
    exterioare: piese.reduce((s, p) => s + p.exterioare, 0), interioare: piese.reduce((s, p) => s + p.interioare, 0),
    deschise: piese.reduce((s, p) => s + p.deschise, 0),
  };
}

/**
 * Căile trasate (pixeli, Y în jos) ca ale unui import: în mm, cu Y în sus, imaginea fiind o pagină (colțul ei stânga-jos e
 * colțul foii). O cale sub rezoluție (praful) sau peste plafonul unei căi se sare, numărată. Liniile mediane (cu `deschisa`,
 * ADR 0222) se taie pe linie: cele deschise se termină în ultimul vârf, iar buclele rămân închise, cu latura „pe-linie”; cu
 * opțiunile din ADR 0223, o cale cu `peLinie` 0 (conturul unei părți late, o buclă ca vector închis) ia latura din `exterior`.
 */
type CaleTrasata = { readonly varfuri: Varf[]; readonly inchis: boolean };

export function caiDinTrasare(c: CaiTrasate, mmPePx: number, inaltimePx: number): { cai: CaleTrasata[]; laturi: Latura[]; avertismente: AvertismenteImagine } {
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
    if (c.deschisa) {
      cai.push({ varfuri, inchis: c.deschisa[k] !== 1 });
      laturi.push(c.deschisa[k] === 1 || c.peLinie?.[k] !== 0 ? 'pe-linie' : c.exterior[k] === 1 ? 'exterior' : 'interior');
      continue;
    }
    cai.push({ varfuri, inchis: true });
    laturi.push(c.exterior[k] === 1 ? 'exterior' : 'interior');
  }
  return { cai, laturi, avertismente: { 'sub-rezolutie': sub, 'prea-mari': mari } };
}

/**
 * Previzualizarea unei imagini (ADR 0220): trasarea în workerul ei, cu alegerile din fereastră, apoi aceeași piesă ca la
 * SVG. Un TIFF îl citește cititorul propriu (ADR 0229), cu `pagina` aleasă; un TIFF cu ce nu știe încă, unul stricat, o
 * imagine pe care browserul n-o decodează, prea multe contururi sau trasarea peste termen se refuză, cu motivul lor.
 * `semnal`: al citirii (o citire nouă, Renunță sau Escape o opresc, cu workerul ei, din mijlocul calculului). `pdf`: imaginea
 * unei pagini PDF (ADR 0270), cu DPI-ul și orientarea așezării ei.
 */
export async function previzualizareImagine(f: FisierImport, t: AlegeriTrasare | undefined, semnal?: AbortSignal, pagina?: number,
  pdf?: AsezarePdf): Promise<PrevizualizareImport> {
  let r: RaspunsTrasare;
  try {
    r = await trasareInBazin(cerereTrasare(f, t ?? TRASARE_IMPLICITA, pagina, pdf), semnal ? { semnal } : {});
  } catch (e) {
    if (e instanceof TrasareAnulata) return { ok: false, cod: 'anulat', format: 'imagine' };
    if (e instanceof TrasareCazuta) return { ok: false, cod: 'imagine-timp', format: 'imagine', detaliu: e.message };
    throw e;
  }
  return previzualizareDinRaspuns(f, r);
}

/**
 * Cererea trasării din alegerile ferestrei: opțiunile nucleului (lumina și marginea doar când nu sunt implicite), curățarea,
 * scara, zona, culorile (cu felul fiecăreia, ADR 0228) sau liniile mediane, cu opțiunile lor cât măcar o culoare e pe linii,
 * și foaia (ADR 0225: doar cu „Îndreaptă foaia”, cu formatul și colțurile mutate). Imaginea unei pagini PDF (ADR 0270) își
 * ia DPI-ul și orientarea din așezarea pe pagină.
 */
export function cerereTrasare(f: FisierImport, a: AlegeriTrasare, pagina?: number, pdf?: AsezarePdf): CerereTrasare {
  const peCulori = a.sursa === 'culori';
  const peLinii = a.rezultat === 'mediane' || (peCulori && (a.culori.rezultate ?? []).includes('mediane'));
  return {
    imagine: new Blob([new Uint8Array(f.octeti)]),
    optiuni: {
      sursa: peCulori ? 'auto' : a.sursa, prag: a.prag, inverseaza: a.inverseaza, netezime: a.netezime,
      ...(a.lumina !== 'uniforma' ? { lumina: a.lumina } : {}), ...(a.margine ? { margine: true } : {}),
    },
    peteMm: a.peteMm, gauriMm: a.gauriMm, latimeMm: a.latimeMm, dpi: pdf ? pdf.dpi : dpiImagine(f.octeti), ...(a.zona ? { zona: a.zona } : {}),
    ...(pdf ? { orientare: pdf.orientare } : {}),
    ...(peCulori ? { culori: a.culori } : {}), ...(a.rezultat === 'mediane' ? { rezultat: 'mediane' } : {}),
    ...(peLinii ? { mediane: a.mediane } : {}),
    ...(a.foaie.indreapta ? { foaie: { colturi: a.foaie.colturi, format: formatFoaie(a.foaie) } } : {}),
    ...(pagina !== undefined && pagina > 1 ? { pagina } : {}),
  };
}

/**
 * Previzualizarea din răspunsul workerului trasării (alb-negru, linii mediane sau pe culori): refuzurile, căile în mm, piesa
 * sau piesele.
 */
export function previzualizareDinRaspuns(f: FisierImport, r: RaspunsTrasare): PrevizualizareImport {
  if (!r.ok && r.cod === 'citire') return { ok: false, cod: 'imagine-citire', format: 'imagine', detaliu: r.detaliu };
  if (!r.ok && r.cod === 'tiff') {
    return { ok: false, cod: r.motiv === 'stricat' ? 'tiff-stricat' : 'tiff', format: 'imagine', detaliu: r.detaliu, ...(r.pagini ? { pagini: r.pagini } : {}) };
  }
  const trasare = raportImagine(r);
  if (!r.ok) return { ok: false, cod: 'prea-multe', format: 'imagine', detaliu: String(r.raport.contururi), trasare };
  if (r.fel === 'culori') return previzualizareCulori(f, r, trasare);
  const { cai, laturi, avertismente } = caiDinTrasare(r.cai, r.mmPePx, r.raport.inaltime);
  if (cai.length === 0) return { ok: false, cod: 'gol', format: 'imagine', avertismente, trasare };
  if (preaDeparte(cai)) return { ok: false, cod: 'departe', format: 'imagine', trasare };
  const c = comune(f, cai, { latime: trasare.latimeMm, inaltime: trasare.inaltimeMm }, undefined, laturi);
  if (!c) return { ok: false, cod: 'plafon', detaliu: 'includeri', format: 'imagine', avertismente, trasare };
  return { ...c, format: 'imagine', trasare, avertismente, contur: r.cai, ...(r.fel === 'mediane' && r.late ? { late: r.late } : {}) };
}

export async function previzualizare(f: FisierImport, o: OptiuniPrevizualizare): Promise<PrevizualizareImport> {
  const format = formatImport(f.nume, '') ?? formatDupaAntet(f.octeti);
  if (format === 'imagine') return previzualizareImagine(f, o.trasare, o.semnal, o.pagina);
  if (format === 'pdf' || format === 'eps') {
    return (formatDupaAntet(f.octeti) ?? format) === 'eps' ? previzualizareEps(f)
      : previzualizarePdf(f, o.pagina, { imagine: o.imaginePdf === true, trasare: o.trasare, semnal: o.semnal });
  }
  if (format === 'wmf') return previzualizareWmf(f, o.unitateWmf);
  if (format === 'dxf') return previzualizareDxf(f, o.unitate);
  if (format === 'svg') return previzualizareSvg(f, o.pxPeTol, o.limba);
  return { ok: false, cod: 'tip' };
}
