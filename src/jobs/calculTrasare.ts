/**
 * Calculul trasării din imagine (ADR 0220 §2): decodarea (în workerul trasării, cu `createImageBitmap`, peste 16 Mpx redusă),
 * scara (lățimea aleasă, altfel DPI-ul fișierului, altfel 96 px / țol), pragurile curățării din mm în px și nucleul
 * (`src/trasare/trasare.ts`), sau liniile mediane (ADR 0222, `src/trasare/mediana.ts`), sau, pe culori (ADR 0221), nucleul
 * culorilor (`src/trasare/culori.ts`), cu imaginea pictată în culorile ei pentru previzualizare. Rulează în
 * `lucratorTrasare.ts`; în Node (testele), în proces, cu pixelii dați direct.
 */
import { traseazaCulori, type OptiuniCulori, type PiesaCuloare, type RaportCulori } from '../trasare/culori.ts';
import { traseazaMediana, type OptiuniMediana, type RaportMediana } from '../trasare/mediana.ts';
import { traseaza, type CaiTrasate, type ImagineRGBA, type OptiuniTrasare, type RaportTrasare } from '../trasare/trasare.ts';
import { deTransferat } from './protocolCam.ts';

/** Cea mai mare imagine trasată (ADR 0220 §9): peste ea, decodarea o reduce, cu proporțiile păstrate. */
export const PIXELI_MAXIM = 16_000_000;

/** DPI-ul presupus când fișierul nu și-l spune (ADR 0220, răspunsul 2a): cât un px CSS, ca la un SVG. */
export const DPI_PRESUPUS = 96;

/** Imaginea pictată a previzualizării pe culori: cel mult atâția pixeli (fereastra n-are nevoie de mai mult). */
export const PIXELI_POSTER = 1_000_000;

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
  /** Trasarea pe culori (ADR 0221): numărul, legăturile și bifele; lipsă sau null: alb-negru, după `optiuni`. */
  readonly culori?: Pick<OptiuniCulori, 'numar' | 'legaturi' | 'bifate'> | null;
  /** Alb-negru: contururile (lipsă) sau liniile mediane (ADR 0222); pe culori nu contează. */
  readonly rezultat?: 'contururi' | 'mediane';
  /** Opțiunile liniei mediane (ADR 0223), cu pragul părților late în mm (null: automat); lipsă: ca în ADR 0222. */
  readonly mediane?: Omit<OptiuniMediana, 'pragLatPx'> & { readonly pragLatMm: number | null };
};

/** Culoarea fiecărui pixel al imaginii pictate (indicele din paletă; 255: transparent), redusă sub `PIXELI_POSTER`. */
export type Posterizare = { readonly latime: number; readonly inaltime: number; readonly etichete: Uint8Array };

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
  | (Scara & { readonly ok: true; readonly fel: 'alb-negru'; readonly cai: CaiTrasate; readonly raport: RaportTrasare })
  | (Scara & { readonly ok: false; readonly fel: 'alb-negru'; readonly cod: 'prea-multe'; readonly raport: RaportTrasare })
  | (Scara & {
    readonly ok: true; readonly fel: 'culori'; readonly piese: readonly PiesaCuloare[]; readonly raport: RaportCulori;
    readonly posterizare: Posterizare;
  })
  | (Scara & { readonly ok: false; readonly fel: 'culori'; readonly cod: 'prea-multe'; readonly raport: RaportCulori })
  | (Scara & {
    readonly ok: true; readonly fel: 'mediane'; readonly cai: CaiTrasate; readonly raport: RaportMediana;
    /** Contururile părților late, dacă s-au căutat (ADR 0223): previzualizarea le semnalează. */
    readonly late?: CaiTrasate;
  })
  | (Scara & { readonly ok: false; readonly fel: 'mediane'; readonly cod: 'prea-multe'; readonly raport: RaportMediana })
  | { readonly ok: false; readonly cod: 'citire'; readonly detaliu: string };

/** Etichetele imaginii, reduse prin cel mai apropiat pixel sub `PIXELI_POSTER` (aceleași, dacă încap). */
export function posterizeaza(et: Uint8Array, W: number, H: number, max = PIXELI_POSTER): Posterizare {
  if (W * H <= max) return { latime: W, inaltime: H, etichete: et };
  const s = Math.sqrt(max / (W * H));
  const w = Math.max(1, Math.floor(W * s)), h = Math.max(1, Math.floor(H * s));
  const e = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(H - 1, Math.floor(((y + 0.5) * H) / h));
    for (let x = 0; x < w; x++) e[y * w + x] = et[sy * W + Math.min(W - 1, Math.floor(((x + 0.5) * W) / w))] ?? 255;
  }
  return { latime: w, inaltime: h, etichete: e };
}

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
  const petePx = ariePx(c.peteMm, mmPePx), gauriPx = ariePx(c.gauriMm, mmPePx);
  if (c.culori) {
    const r = traseazaCulori(img, { ...c.culori, netezime: c.optiuni.netezime, petePx, gauriPx });
    if (!r.ok) return { raspuns: { ...r, fel: 'culori', mmPePx, scara, dpi, redusDin }, transfer: [] };
    const posterizare = posterizeaza(r.etichete, img.latime, img.inaltime);
    const vederi = r.piese.flatMap((p) => [p.cai.inceput, p.cai.tip, p.cai.xy, p.cai.exterior]);
    return {
      raspuns: { ok: true, fel: 'culori', piese: r.piese, raport: r.raport, posterizare, mmPePx, scara, dpi, redusDin },
      transfer: deTransferat([...vederi, posterizare.etichete]),
    };
  }
  if (c.rezultat === 'mediane') {
    const m = c.mediane;
    const om: OptiuniMediana | undefined = m
      ? { capete: m.capete, late: m.late, semnaleaza: m.semnaleaza, bucle: m.bucle, pragLatPx: m.pragLatMm !== null && m.pragLatMm > 0 ? m.pragLatMm / mmPePx : null }
      : undefined;
    const r = traseazaMediana(img, { ...c.optiuni, petePx, gauriPx }, om);
    if (!r.ok) return { raspuns: { ...r, fel: 'mediane', mmPePx, scara, dpi, redusDin }, transfer: [] };
    const late = r.late ? [r.late.inceput, r.late.tip, r.late.xy, r.late.exterior] : [];
    return {
      raspuns: { ...r, fel: 'mediane', mmPePx, scara, dpi, redusDin },
      transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior, r.cai.deschisa, r.cai.peLinie, ...late]),
    };
  }
  const r = traseaza(img, { ...c.optiuni, petePx, gauriPx });
  if (!r.ok) return { raspuns: { ...r, fel: 'alb-negru', mmPePx, scara, dpi, redusDin }, transfer: [] };
  return { raspuns: { ...r, fel: 'alb-negru', mmPePx, scara, dpi, redusDin }, transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior]) };
}
