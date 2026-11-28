/**
 * Calculul workerului reliefului (ADR 0310 §3, felia 18.1↑a): imaginea → relief (decodarea în browser, fără conversie de
 * culoare; grila, dalele cuantizate, harta) și desenul unui relief din dalele lui (compusul straturilor vizibile, redus și
 * umbrit). Fără stare între cereri (ADR 0015): primește octeții dalelor și întoarce octeți; ce se arată e citit din dalele
 * cuantizate, deci e exact ce se salvează și ce se taie (§2).
 */
import { compune, type Mod } from '../relief/compunere.ts';
import { asezaPeGrila } from '../relief/asezare.ts';
import { CELULA_MAXIMA, CELULA_MINIMA, LATURA_MAXIMA, LATURA_MM_MAXIMA, type Grila } from '../relief/grila.ts';
import { dalaDinOcteti, type Dala } from '../relief/dala.ts';
import { dale as numarDale, LATURA_DALA } from '../relief/grila.ts';
import { hartaDinText, type Harta } from '../relief/harta.ts';
import { gri, netezeste, reliefDinPixeli, type OptiuniImagine } from '../relief/imagine.ts';
import { imagineLumina, litofanieDinGri, luminaDinGrosimi } from '../relief/litofanie.ts';
import { dalaModel, FACTORI_MODEL, type DalaModel, type TampoaneModel } from '../relief/model.ts';
import { daleDinHarta, grilaDinDale, stratDinGrila } from '../relief/strat.ts';
import { factorReducere, intervalZ, reduce, umbreste, type Umbrit } from '../relief/umbrire.ts';

export type { Umbrit } from '../relief/umbrire.ts';
export type { OptiuniImagine } from '../relief/imagine.ts';
export type { DalaModel } from '../relief/model.ts';

/** Pixelii unei imagini, rând cu rând de sus în jos, RGBA (testele și imaginile deja decodate). */
export type PixeliRelief = { readonly latime: number; readonly inaltime: number; readonly rgba: Uint8ClampedArray<ArrayBuffer> | Uint8Array<ArrayBuffer> };

/** Un strat de desenat: modul, vizibilitatea, textul hărții și octeții dalelor ei (după amprentă). */
export type StratDeDesenat = {
  readonly mod: Mod; readonly vizibil: boolean; readonly harta: string;
  readonly octeti: Readonly<Record<string, Uint8Array<ArrayBuffer>>>;
};

export type CerereRelief =
  | {
    readonly tip: 'din-imagine';
    /** Fișierul (decodat aici, de browser) sau pixelii gata decodați. */
    readonly imagine: Blob | PixeliRelief;
    readonly optiuni: OptiuniImagine;
    /**
     * Scara (o celulă = un pixel, ADR 0310 §5): lățimea reliefului pe foaie, în mm (celula = lățimea / pixelii pe
     * orizontală), sau pixelii pe țol (celula = 25,4 / dpi), cât lățimea nu e scrisă.
     */
    readonly scara: { readonly latimeMm: number } | { readonly dpi: number };
    /**
     * Stratul nou pe un relief ales (ADR 0320, felia 18.1↑j): grila lui. Imaginea, la scara ei (un pixel = lățimea / pixelii,
     * ori 25,4 / dpi), se așază centrat pe ea (`asezaPeGrila`): golul în afara imaginii, ce iese din relief tăiat. Lipsă: un
     * relief nou, cu o celulă pe pixel.
     */
    readonly pe?: Grila;
    /**
     * Litofania (ADR 0321, felia 18.1↑f): în locul înălțimilor, grosimile rămase (t_min … t_max, mm; lumina liniară), cu rama
     * (mm, rotunjită la celule) și fața tăiată; previzualizarea arată lumina din spate. Nu se combină cu `pe`.
     */
    readonly litofanie?: { readonly tmin: number; readonly tmax: number; readonly ramaMm: number; readonly spate: boolean };
  }
  | {
    readonly tip: 'desen';
    readonly nx: number; readonly ny: number; readonly celula: number;
    readonly straturi: readonly StratDeDesenat[];
  }
  | {
    /**
     * Modelul pentru vederea 3D (ADR 0310 §7, felia 18.1↑b): dalele cu indicii dați (din hartă), compuse și reduse cu `k`
     * (din `FACTORI_MODEL`); straturile aduc octeții doar ai dalelor cerute.
     */
    readonly tip: 'model';
    readonly nx: number; readonly ny: number; readonly k: number;
    readonly straturi: readonly StratDeDesenat[];
    readonly dale: readonly number[];
  };

/** De ce nu se face relieful: imaginea nu se decodează, are prea mulți pixeli, celula iese din margini, totul e transparent. */
export type CodRefuzRelief = 'imagine-citire' | 'prea-mare' | 'celula' | 'gol' | 'dale-lipsa' | 'harta' | 'grosimi';

export type RefuzRelief = { readonly ok: false; readonly cod: CodRefuzRelief; readonly detaliu?: string };

/** Relieful din imagine: grila, celula, stratul (harta, amprenta, octeții dalelor cu coduri), Z-ul și desenul lui. */
export type ReliefDinImagine = {
  readonly ok: true; readonly tip: 'din-imagine';
  readonly nx: number; readonly ny: number; readonly celula: number;
  readonly harta: string; readonly amprenta: string;
  readonly octeti: Readonly<Record<string, Uint8Array<ArrayBuffer>>>;
  readonly z: { readonly min: number; readonly max: number } | null;
  readonly umbrit: Umbrit;
};

/** Desenul unui relief: Z-ul compusului și imaginea umbrită (redusă cu `k`). */
export type DesenRelief = {
  readonly ok: true; readonly tip: 'desen';
  readonly z: { readonly min: number; readonly max: number } | null;
  readonly umbrit: Umbrit; readonly k: number;
};

/** Modelul unui relief: dalele cerute, compuse și reduse cu `k`, fiecare cu Z-ul ei. */
export type ModelRelief = { readonly ok: true; readonly tip: 'model'; readonly k: number; readonly dale: readonly DalaModel[] };

export type RaspunsRelief = ReliefDinImagine | DesenRelief | ModelRelief | RefuzRelief;

/** Imaginea decodată de browser exact (fără conversie de culoare și fără alfa premultiplicat, ADR 0310 §3). */
async function decodeaza(b: Blob): Promise<PixeliRelief | RefuzRelief> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  } catch (e) {
    return { ok: false, cod: 'imagine-citire', detaliu: e instanceof Error ? e.message : String(e) };
  }
  if (bmp.width > LATURA_MAXIMA || bmp.height > LATURA_MAXIMA) {
    const detaliu = `${bmp.width} × ${bmp.height}`;
    bmp.close();
    return { ok: false, cod: 'prea-mare', detaliu };
  }
  const px = pixeliExacti(bmp) ?? pixeliPrinPanza(bmp);
  bmp.close();
  return px;
}

/**
 * Pixelii exacți ai imaginii, printr-o textură WebGL2 încărcată fără premultiplicare și fără conversie de culoare, citită
 * înapoi (`readPixels`): pânza 2D ține culorile premultiplicate cu alfa, deci un pixel semitransparent s-ar întoarce rotunjit.
 * Nu e un calcul pe placa video (ADR 0011): doar despachetarea pixelilor. Null fără WebGL2 (ori peste textura maximă).
 */
function pixeliExacti(bmp: ImageBitmap): PixeliRelief | null {
  const gl = new OffscreenCanvas(1, 1).getContext('webgl2', { premultipliedAlpha: false, antialias: false });
  if (!gl) return null;
  const w = bmp.width, h = bmp.height;
  if (w > gl.getParameter(gl.MAX_TEXTURE_SIZE) || h > gl.getParameter(gl.MAX_TEXTURE_SIZE)) return null;
  const tex = gl.createTexture(), fb = gl.createFramebuffer();
  try {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
    const rgba = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    if (gl.getError() !== gl.NO_ERROR) return null;
    return { latime: w, inaltime: h, rgba };
  } finally {
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/** Rezerva: pixelii prin pânza 2D (exacți pe pixelii opaci; un pixel semitransparent poate ieși rotunjit). */
function pixeliPrinPanza(bmp: ImageBitmap): PixeliRelief {
  const c = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true });
  if (!c) throw new Error('fără context 2D');
  c.drawImage(bmp, 0, 0);
  const d = c.getImageData(0, 0, bmp.width, bmp.height);
  return { latime: d.width, inaltime: d.height, rgba: d.data };
}

/** Celula din scară (lățimea scrisă, ori DPI-ul), sau motivul pentru care nu se poate (marginile grilei, ADR 0311 §1). */
export function celulaDinScara(scara: { readonly latimeMm: number } | { readonly dpi: number }, nx: number, ny: number): number | 'celula' {
  const c = 'latimeMm' in scara ? scara.latimeMm / nx : 25.4 / scara.dpi;
  if (!Number.isFinite(c) || c < CELULA_MINIMA || c > CELULA_MAXIMA) return 'celula';
  if (nx * c > LATURA_MM_MAXIMA || ny * c > LATURA_MM_MAXIMA) return 'celula';
  return c;
}

async function dinImagine(c: Extract<CerereRelief, { tip: 'din-imagine' }>): Promise<ReliefDinImagine | RefuzRelief> {
  const px = c.imagine instanceof Blob ? await decodeaza(c.imagine) : c.imagine;
  if ('ok' in px) return px;
  const nx = px.latime, ny = px.inaltime;
  if (nx > LATURA_MAXIMA || ny > LATURA_MAXIMA) return { ok: false, cod: 'prea-mare', detaliu: `${nx} × ${ny}` };
  const pixel = celulaDinScara(c.scara, nx, ny);
  if (pixel === 'celula') return { ok: false, cod: 'celula' };
  if (c.litofanie) {
    const L = c.litofanie;
    if (!(L.tmin >= 0 && L.tmax > L.tmin && Number.isFinite(L.tmax) && L.ramaMm >= 0)) return { ok: false, cod: 'grosimi' };
    const lit = litofanieDinGri(netezeste(gri(px.rgba, nx, ny, c.optiuni.sursa), nx, ny, c.optiuni.sigma), nx, ny,
      { tmin: L.tmin, tmax: L.tmax, rama: L.ramaMm / pixel, spate: L.spate });
    if (lit.nx > LATURA_MAXIMA || lit.ny > LATURA_MAXIMA) return { ok: false, cod: 'prea-mare', detaliu: `${lit.nx} × ${lit.ny}` };
    if (lit.nx * pixel > LATURA_MM_MAXIMA || lit.ny * pixel > LATURA_MM_MAXIMA) return { ok: false, cod: 'celula' };
    return dinValori(lit.valori, { nx: lit.nx, ny: lit.ny, celula: pixel }, { tmin: L.tmin, tmax: L.tmax });
  }
  const valori = reliefDinPixeli(px.rgba, nx, ny, c.optiuni);
  // Pe un relief ales, grila e a lui, iar imaginea se așază pe ea; altfel, grila e a imaginii.
  const g: Grila = c.pe ?? { nx, ny, celula: pixel };
  return dinValori(c.pe ? asezaPeGrila(valori, nx, ny, pixel, g) : valori, g);
}

/** Stratul din valorile pe grila `g`, citit înapoi din dalele cuantizate: harta, octeții, Z-ul și desenul. */
async function dinValori(
  valori: ArrayLike<number>, { nx, ny, celula }: Grila, lumina?: { readonly tmin: number; readonly tmax: number },
): Promise<ReliefDinImagine | RefuzRelief> {
  const st = await stratDinGrila(valori, nx, ny);
  // Ce se arată e citit din dalele cuantizate (ADR 0310 §2), ca un relief cu acest singur strat: compusul pornește de la 0,
  // deci celulele goale ale stratului (pixelii transparenți) sunt planul zero (ADR 0311 §7), cum se vor tăia.
  const citit = grilaDinDale(nx, ny, st.dale);
  if (intervalZ(citit) === null) return { ok: false, cod: 'gol' };
  const compus = compune(nx * ny, [{ mod: 'aduna', vizibil: true, valori: citit }]);
  const z = intervalZ(compus);
  const k = factorReducere(nx, ny), r = reduce(compus, nx, ny, k);
  const octeti: Record<string, Uint8Array<ArrayBuffer>> = {};
  for (const [h, o] of st.octeti) octeti[h] = o;
  // Litofania (ADR 0321 §6): lumina din spate, citită tot din dalele cuantizate; altfel relieful umbrit.
  const umbrit = lumina ? imagineLumina(luminaDinGrosimi(r.valori, lumina.tmin, lumina.tmax), r.nx, r.ny) : umbreste(r.valori, r.nx, r.ny, celula * k);
  return { ok: true, tip: 'din-imagine', nx, ny, celula, harta: st.text, amprenta: st.amprenta, octeti, z, umbrit };
}

function desen(c: Extract<CerereRelief, { tip: 'desen' }>): DesenRelief | RefuzRelief {
  const n = c.nx * c.ny, straturi = [];
  for (const s of c.straturi) {
    if (!s.vizibil) continue;
    const h = hartaDinText(s.harta);
    if (!h || h.nx !== c.nx || h.ny !== c.ny) return { ok: false, cod: 'harta' };
    const d = daleDinHarta(h, (a) => s.octeti[a]);
    if (!d.ok) return { ok: false, cod: 'dale-lipsa', detaliu: d.lipsa.join(',') };
    straturi.push({ mod: s.mod, vizibil: true, valori: grilaDinDale(c.nx, c.ny, d.dale) });
  }
  const compus = compune(n, straturi);
  const k = factorReducere(c.nx, c.ny), r = reduce(compus, c.nx, c.ny, k);
  return { ok: true, tip: 'desen', z: intervalZ(compus), umbrit: umbreste(r.valori, r.nx, r.ny, c.celula * k), k };
}

/**
 * Dalele modelului (felia 18.1↑b): fiecare dală cerută, compusă din dalele straturilor vizibile ale aceleiași poziții; o
 * intrare goală a hărții nu atinge compusul, o constantă e o dală constantă. Un k sau un indice în afara grilei e o greșeală
 * a celui care cere (excepție); octeții lipsă și o hartă a altei grile, un refuz.
 */
function model(c: Extract<CerereRelief, { tip: 'model' }>): ModelRelief | RefuzRelief {
  if (!FACTORI_MODEL.includes(c.k)) throw new Error(`factorul modelului ${c.k} nu e o putere a lui 2 până la 256`);
  const { tx, ty } = numarDale(c.nx, c.ny), harti: Array<{ readonly mod: Mod; readonly h: Harta; readonly octeti: StratDeDesenat['octeti'] }> = [];
  for (const s of c.straturi) {
    if (!s.vizibil) continue;
    const h = hartaDinText(s.harta);
    if (!h || h.nx !== c.nx || h.ny !== c.ny) return { ok: false, cod: 'harta' };
    harti.push({ mod: s.mod, h, octeti: s.octeti });
  }
  const lipsa = new Set<string>(), dale: DalaModel[] = [], t: TampoaneModel = { straturi: [], compus: new Float32Array(LATURA_DALA * LATURA_DALA) };
  for (const index of c.dale) {
    if (!Number.isInteger(index) || index < 0 || index >= tx * ty) throw new Error(`dala ${index} nu e în grila de ${tx} × ${ty}`);
    const ti = index % tx, tj = (index - ti) / tx, straturi: Array<{ readonly mod: Mod; readonly dala: Dala }> = [];
    for (const s of harti) {
      const e = s.h.dale[index] ?? null;
      if (e === null) continue;
      if (typeof e === 'number') { straturi.push({ mod: s.mod, dala: { fel: 'constanta', m: e } }); continue; }
      const o = s.octeti[e], d = o ? dalaDinOcteti(o) : null;
      if (d) straturi.push({ mod: s.mod, dala: d });
      else lipsa.add(e);
    }
    if (lipsa.size === 0) {
      dale.push(dalaModel(index, straturi, Math.min(LATURA_DALA, c.nx - ti * LATURA_DALA), Math.min(LATURA_DALA, c.ny - tj * LATURA_DALA), c.k, t));
    }
  }
  if (lipsa.size > 0) return { ok: false, cod: 'dale-lipsa', detaliu: [...lipsa].join(',') };
  return { ok: true, tip: 'model', k: c.k, dale };
}

/** Răspunsul unei cereri, cu tablourile de transferat (ADR 0014). */
export async function raspundeRelief(c: CerereRelief): Promise<{ readonly raspuns: RaspunsRelief; readonly transfer: ArrayBuffer[] }> {
  const raspuns = c.tip === 'din-imagine' ? await dinImagine(c) : c.tip === 'desen' ? desen(c) : model(c);
  const transfer: ArrayBuffer[] = [];
  if (raspuns.ok) {
    if (raspuns.tip === 'model') for (const d of raspuns.dale) transfer.push(d.z.buffer);
    else transfer.push(raspuns.umbrit.rgba.buffer);
    if (raspuns.tip === 'din-imagine') for (const o of Object.values(raspuns.octeti)) transfer.push(o.buffer);
  }
  return { raspuns, transfer };
}
