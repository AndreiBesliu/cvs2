/**
 * Calculul workerului reliefului (ADR 0310 §3, felia 18.1↑a): imaginea → relief (decodarea în browser, fără conversie de
 * culoare; grila, dalele cuantizate, harta) și desenul unui relief din dalele lui (compusul straturilor vizibile, redus și
 * umbrit). Fără stare între cereri (ADR 0015): primește octeții dalelor și întoarce octeți; ce se arată e citit din dalele
 * cuantizate, deci e exact ce se salvează și ce se taie (§2).
 */
import { compune, type Mod } from '../relief/compunere.ts';
import { CELULA_MAXIMA, CELULA_MINIMA, LATURA_MAXIMA, LATURA_MM_MAXIMA } from '../relief/grila.ts';
import { hartaDinText } from '../relief/harta.ts';
import { reliefDinPixeli, type OptiuniImagine } from '../relief/imagine.ts';
import { daleDinHarta, grilaDinDale, stratDinGrila } from '../relief/strat.ts';
import { factorReducere, intervalZ, reduce, umbreste, type Umbrit } from '../relief/umbrire.ts';

export type { Umbrit } from '../relief/umbrire.ts';
export type { OptiuniImagine } from '../relief/imagine.ts';

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
  }
  | {
    readonly tip: 'desen';
    readonly nx: number; readonly ny: number; readonly celula: number;
    readonly straturi: readonly StratDeDesenat[];
  };

/** De ce nu se face relieful: imaginea nu se decodează, are prea mulți pixeli, celula iese din margini, totul e transparent. */
export type CodRefuzRelief = 'imagine-citire' | 'prea-mare' | 'celula' | 'gol' | 'dale-lipsa' | 'harta';

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

export type RaspunsRelief = ReliefDinImagine | DesenRelief | RefuzRelief;

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
  const c = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true });
  if (!c) throw new Error('fără context 2D');
  c.drawImage(bmp, 0, 0);
  const d = c.getImageData(0, 0, bmp.width, bmp.height);
  bmp.close();
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
  const celula = celulaDinScara(c.scara, nx, ny);
  if (celula === 'celula') return { ok: false, cod: 'celula' };
  const valori = reliefDinPixeli(px.rgba, nx, ny, c.optiuni);
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
  return { ok: true, tip: 'din-imagine', nx, ny, celula, harta: st.text, amprenta: st.amprenta, octeti, z, umbrit: umbreste(r.valori, r.nx, r.ny, celula * k) };
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

/** Răspunsul unei cereri, cu tablourile de transferat (ADR 0014). */
export async function raspundeRelief(c: CerereRelief): Promise<{ readonly raspuns: RaspunsRelief; readonly transfer: ArrayBuffer[] }> {
  const raspuns = c.tip === 'din-imagine' ? await dinImagine(c) : desen(c);
  const transfer: ArrayBuffer[] = [];
  if (raspuns.ok) {
    transfer.push(raspuns.umbrit.rgba.buffer);
    if (raspuns.tip === 'din-imagine') for (const o of Object.values(raspuns.octeti)) transfer.push(o.buffer);
  }
  return { raspuns, transfer };
}
