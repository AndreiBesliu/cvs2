/**
 * Calculul trasării din imagine (ADR 0220 §2): decodarea (în workerul trasării, cu `createImageBitmap`, peste 16 Mpx redusă),
 * scara (lățimea aleasă, altfel DPI-ul fișierului, altfel 96 px / țol), pragurile curățării din mm în px și nucleul
 * (`src/trasare/trasare.ts`). Rulează în `lucratorTrasare.ts`; în Node (testele), în proces, cu pixelii dați direct.
 */
import { traseaza, type CaiTrasate, type ImagineRGBA, type OptiuniTrasare, type RaportTrasare } from '../trasare/trasare.ts';
import { deTransferat } from './protocolCam.ts';

/** Cea mai mare imagine trasată (ADR 0220 §9): peste ea, decodarea o reduce, cu proporțiile păstrate. */
export const PIXELI_MAXIM = 16_000_000;

/** DPI-ul presupus când fișierul nu și-l spune (ADR 0220, răspunsul 2a): cât un px CSS, ca la un SVG. */
export const DPI_PRESUPUS = 96;

export type CerereTrasare = {
  /** Fișierul (decodat în worker) sau pixelii (în probe). */
  readonly imagine: Blob | ImagineRGBA;
  readonly optiuni: Omit<OptiuniTrasare, 'petePx' | 'gauriPx'>;
  /** Pragurile curățării, în mm: diametrul cercului cu aceeași arie (0: fără). */
  readonly peteMm: number;
  readonly gauriMm: number;
  /** Lățimea imaginii pe foaie, în mm; null: din DPI. */
  readonly latimeMm: number | null;
  /** DPI-ul citit din fișier (pe x), sau null. */
  readonly dpi: number | null;
  readonly maxPixeli?: number;
};

/** Ce se întoarce pe lângă trasare: scara folosită și reducerea imaginii. */
type Scara = {
  readonly mmPePx: number;
  /** De unde vine scara: lățimea aleasă, DPI-ul fișierului sau cel presupus; și DPI-ul care rezultă. */
  readonly scara: 'latime' | 'fisier' | 'presupus';
  readonly dpi: number;
  /** Mărimea imaginii din fișier, dacă decodarea a redus-o. */
  readonly redusDin: { readonly latime: number; readonly inaltime: number } | null;
};

export type RaspunsTrasare =
  | (Scara & { readonly ok: true; readonly cai: CaiTrasate; readonly raport: RaportTrasare })
  | (Scara & { readonly ok: false; readonly cod: 'prea-multe'; readonly raport: RaportTrasare })
  | { readonly ok: false; readonly cod: 'citire'; readonly detaliu: string };

/** Imaginea decodată de browser (orientarea EXIF aplicată), redusă sub `maxPixeli`, în pixeli RGBA. */
async function decodeaza(b: Blob, maxPixeli: number): Promise<{ img: ImagineRGBA; redusDin: Scara['redusDin'] }> {
  let bmp = await createImageBitmap(b);
  let redusDin: Scara['redusDin'] = null;
  if (bmp.width * bmp.height > maxPixeli) {
    const s = Math.sqrt(maxPixeli / (bmp.width * bmp.height));
    redusDin = { latime: bmp.width, inaltime: bmp.height };
    const latime = Math.max(1, Math.floor(bmp.width * s)), inaltime = Math.max(1, Math.floor(bmp.height * s));
    bmp.close();
    bmp = await createImageBitmap(b, { resizeWidth: latime, resizeHeight: inaltime, resizeQuality: 'high' });
  }
  const c = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true });
  if (!c) throw new Error('fără context 2D');
  c.drawImage(bmp, 0, 0);
  const d = c.getImageData(0, 0, bmp.width, bmp.height);
  bmp.close();
  return { img: { latime: d.width, inaltime: d.height, date: d.data }, redusDin };
}

/** Aria în px² a cercului cu diametrul d mm, la scara dată: cel puțin 4 px (2 × 2), dacă pragul nu e 0. */
export function ariePx(dMm: number, mmPePx: number): number {
  if (!(dMm > 0)) return 0;
  return Math.max(4, (Math.PI * (dMm / 2) ** 2) / (mmPePx * mmPePx));
}

export async function raspundeTrasare(c: CerereTrasare): Promise<{ raspuns: RaspunsTrasare; transfer: ArrayBuffer[] }> {
  let img: ImagineRGBA, redusDin: Scara['redusDin'] = null;
  if (c.imagine instanceof Blob) {
    try {
      ({ img, redusDin } = await decodeaza(c.imagine, c.maxPixeli ?? PIXELI_MAXIM));
    } catch (e) {
      return { raspuns: { ok: false, cod: 'citire', detaliu: e instanceof Error ? e.message : String(e) }, transfer: [] };
    }
  } else img = c.imagine;
  // Scara: lățimea aleasă e a imaginii întregi; fără ea, mărimea fizică din DPI (a fișierului, nu a imaginii reduse).
  const latimeFisier = redusDin?.latime ?? img.latime;
  const latimeMm = c.latimeMm ?? (latimeFisier / (c.dpi ?? DPI_PRESUPUS)) * 25.4;
  const mmPePx = latimeMm / img.latime;
  const scara = c.latimeMm !== null ? 'latime' : c.dpi !== null ? 'fisier' : 'presupus';
  const dpi = (latimeFisier / latimeMm) * 25.4;
  const r = traseaza(img, { ...c.optiuni, petePx: ariePx(c.peteMm, mmPePx), gauriPx: ariePx(c.gauriMm, mmPePx) });
  if (!r.ok) return { raspuns: { ...r, mmPePx, scara, dpi, redusDin }, transfer: [] };
  return { raspuns: { ...r, mmPePx, scara, dpi, redusDin }, transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior]) };
}
