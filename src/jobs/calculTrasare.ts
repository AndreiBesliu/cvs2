/**
 * Calculul trasării din imagine (ADR 0220 §2): decodarea (în workerul trasării, cu `createImageBitmap`, peste 16 Mpx redusă),
 * scara (lățimea aleasă, altfel DPI-ul fișierului, altfel 96 px / țol), pragurile curățării din mm în px și nucleul
 * (`src/trasare/trasare.ts`), sau liniile mediane (ADR 0222, `src/trasare/mediana.ts`), sau, pe culori (ADR 0221), nucleul
 * culorilor (`src/trasare/culori.ts`), cu imaginea pictată în culorile ei pentru previzualizare. Foaia pozată oblic (ADR
 * 0225, `src/trasare/foaia.ts`): îndreptată la cerere, înaintea zonei (pagina e foaia, cu mărimea formatului), altfel doar
 * căutată, pentru sugestia raportului. Zona aleasă (ADR 0224) e un decupaj: se trasează doar ea, iar pagina e ea. Rulează
 * în `lucratorTrasare.ts`; în Node (testele), în proces, cu pixelii dați direct.
 */
import { traseazaCulori, type OptiuniCulori, type PiesaCuloare, type RaportCulori } from '../trasare/culori.ts';
import {
  colturiBune, colturiImplicite, formatOrientat, gasesteFoaia, indreaptaFoaia, pareOblica, potrivesteFormatul, proportiiDinPoza,
  type Colturi, type ProportiiFoaie,
} from '../trasare/foaia.ts';
import { traseazaMediana, type OptiuniMediana, type RaportMediana } from '../trasare/mediana.ts';
import { traseaza, type CaiTrasate, type ImagineRGBA, type OptiuniTrasare, type RaportTrasare } from '../trasare/trasare.ts';
import { deTransferat } from './protocolCam.ts';

/** Cea mai mare imagine trasată (ADR 0220 §9): peste ea, decodarea o reduce, cu proporțiile păstrate. */
export const PIXELI_MAXIM = 16_000_000;

/** DPI-ul presupus când fișierul nu și-l spune (ADR 0220, răspunsul 2a): cât un px CSS, ca la un SVG. */
export const DPI_PRESUPUS = 96;

/** Imaginea pictată a previzualizării pe culori: cel mult atâția pixeli (fereastra n-are nevoie de mai mult). */
export const PIXELI_POSTER = 1_000_000;

/** Un dreptunghi în pixelii imaginii decodate (după reducere), y în jos: zona aleasă (ADR 0224). */
export type ZonaTrasare = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

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
  /**
   * Zona aleasă (ADR 0224, răspunsul 2a): un decupaj, trasat singur; lățimea scrisă e a ei. Lipsă sau null: toată imaginea.
   * Cu foaia îndreptată, în pixelii ei.
   */
  readonly zona?: ZonaTrasare | null;
  /**
   * Îndreaptă foaia (ADR 0225): colțurile date (mutate cu mausul, în pixelii pozei decodate) sau null (găsite singure) și
   * formatul în mm (orientat apoi după poză), sau null („Din poză”: proporțiile estimate). Lipsă sau null: neîndreptată.
   */
  readonly foaie?: { readonly colturi: Colturi | null; readonly format: { readonly w: number; readonly h: number } | null } | null;
};

/** Foaia din poză (ADR 0225): îndreptată, sau doar găsită (pentru sugestie). */
export type FoaieTrasata = {
  readonly indreptata: boolean;
  /** Mărimea pozei decodate (după reducere), în px: colțurile sunt în pixelii ei. */
  readonly poza: { readonly latime: number; readonly inaltime: number };
  /** Colțurile folosite (sau găsite) și de unde vin: găsite singure, date (mutate) sau implicite (foaia negăsită). */
  readonly colturi: Colturi;
  readonly sursa: 'gasite' | 'date' | 'implicite';
  /** Proporțiile foii din poză (lățime / înălțime), cu intervalul lor. */
  readonly proportii: ProportiiFoaie;
  /** Formatul folosit, orientat după poză (mm), sau null: „Din poză” (ori foaia doar găsită). */
  readonly format: { readonly w: number; readonly h: number } | null;
  /** Proporțiile din poză se potrivesc cu formatul; null: fără format. */
  readonly potrivit: boolean | null;
  /** Sugestia raportului: îndreptarea oprită și o foaie oblică găsită. */
  readonly sugestie: boolean;
  /** Foaia îndreptată, redusă sub `PIXELI_POSTER` (previzualizarea), sau null (foaia doar găsită). */
  readonly previzualizare: ImagineRGBA | null;
};

/** Culoarea fiecărui pixel al imaginii pictate (indicele din paletă; 255: transparent), redusă sub `PIXELI_POSTER`. */
export type Posterizare = { readonly latime: number; readonly inaltime: number; readonly etichete: Uint8Array };

/** Ce se întoarce pe lângă trasare: scara folosită și reducerea imaginii. */
type Scara = {
  readonly mmPePx: number;
  /**
   * De unde vine scara: lățimea aleasă, formatul foii îndreptate (ADR 0225), DPI-ul fișierului sau cel presupus; și DPI-ul
   * care rezultă (pe pixelii fișierului; pe foaia îndreptată, un pixel al ei ține cât unul al pozei).
   */
  readonly scara: 'latime' | 'foaie' | 'fisier' | 'presupus';
  readonly dpi: number;
  /** Mărimea imaginii din fișier, dacă decodarea a redus-o. */
  readonly redusDin: { readonly latime: number; readonly inaltime: number } | null;
  /**
   * Imaginea decodată întreagă (cu foaia îndreptată: foaia), în px, și zona trasată din ea (tăiată la imagine), sau null:
   * toată.
   */
  readonly intreg: { readonly latime: number; readonly inaltime: number };
  readonly zona: ZonaTrasare | null;
  /** Foaia din poză (ADR 0225), sau null: negăsită și neîndreptată (ori o imagine cu transparență). */
  readonly foaie: FoaieTrasata | null;
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

/** Imaginea redusă sub `max` pixeli prin media blocurilor (de latură întreagă), pentru previzualizare; aceeași, dacă încape. */
export function reduceImaginea(img: ImagineRGBA, max = PIXELI_POSTER): ImagineRGBA {
  const { latime: W, inaltime: H, date: d } = img;
  if (W * H <= max) return img;
  const k = Math.ceil(Math.sqrt((W * H) / max)), w = Math.max(1, Math.floor(W / k)), h = Math.max(1, Math.floor(H / k));
  const o = new Uint8ClampedArray(w * h * 4), n = k * k;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < k; j++) {
        for (let i = 0, q = 4 * ((y * k + j) * W + x * k); i < k; i++, q += 4) {
          r += d[q] ?? 0; g += d[q + 1] ?? 0; b += d[q + 2] ?? 0; a += d[q + 3] ?? 0;
        }
      }
      const q = 4 * (y * w + x);
      o[q] = r / n; o[q + 1] = g / n; o[q + 2] = b / n; o[q + 3] = a / n;
    }
  }
  return { latime: w, inaltime: h, date: o };
}

/**
 * Foaia (ADR 0225): cu `cerere` (îndreptarea pornită), colțurile date (dacă sunt bune), altfel găsite, altfel implicite;
 * formatul orientat după proporțiile din poză (ori proporțiile, „Din poză”); foaia îndreptată. Fără `cerere`, foaia doar
 * căutată: dacă se găsește, raportul o poate sugera. Întoarce imaginea de trasat de aici încolo.
 */
function foaia(img: ImagineRGBA, cerere: CerereTrasare['foaie'], maxPixeli: number): { img: ImagineRGBA; foaie: FoaieTrasata | null } {
  const poza = { latime: img.latime, inaltime: img.inaltime };
  if (!cerere) {
    const c = gasesteFoaia(img);
    if (!c) return { img, foaie: null };
    return {
      img,
      foaie: {
        indreptata: false, poza, colturi: c, sursa: 'gasite', proportii: proportiiDinPoza(c, img.latime, img.inaltime), format: null,
        potrivit: null, sugestie: pareOblica(c), previzualizare: null,
      },
    };
  }
  const date = cerere.colturi && colturiBune(cerere.colturi) ? cerere.colturi : null;
  const gasite = date ? null : gasesteFoaia(img);
  const colturi = date ?? gasite ?? colturiImplicite(img.latime, img.inaltime);
  const proportii = proportiiDinPoza(colturi, img.latime, img.inaltime);
  const format = cerere.format ? formatOrientat(cerere.format, proportii.raport) : null;
  const ind = indreaptaFoaia(img, colturi, format ? format.w / format.h : proportii.raport, maxPixeli);
  if (!ind) return { img, foaie: null };
  return {
    img: ind,
    foaie: {
      indreptata: true, poza, colturi, sursa: date ? 'date' : gasite ? 'gasite' : 'implicite', proportii, format,
      potrivit: format ? potrivesteFormatul(proportii, format) : null, sugestie: false, previzualizare: reduceImaginea(ind),
    },
  };
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

/** Zona în pixelii imaginii: rotunjită la pixeli întregi și tăiată la imagine; null dacă nu prinde niciun pixel. */
export function zonaIn(z: ZonaTrasare, W: number, H: number): ZonaTrasare | null {
  const x0 = Math.max(0, Math.round(z.x)), y0 = Math.max(0, Math.round(z.y));
  const x1 = Math.min(W, Math.round(z.x + z.w)), y1 = Math.min(H, Math.round(z.y + z.h));
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/** Pixelii zonei, rând cu rând, ca o imagine a ei. */
function decupeaza(img: ImagineRGBA, z: ZonaTrasare): ImagineRGBA {
  const d = new Uint8ClampedArray(z.w * z.h * 4), s = img.date;
  for (let y = 0; y < z.h; y++) {
    const a = ((z.y + y) * img.latime + z.x) * 4, o = y * z.w * 4;
    if (s instanceof Uint8ClampedArray) d.set(s.subarray(a, a + z.w * 4), o);
    else for (let i = 0; i < z.w * 4; i++) d[o + i] = s[a + i] ?? 0;
  }
  return { latime: z.w, inaltime: z.h, date: d };
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
  // Pixelii fișierului pe un pixel decodat (decodarea poate reduce imaginea); un pixel al foii îndreptate ține cât unul al pozei.
  const pxFisier = (redusDin?.latime ?? img.latime) / img.latime;
  // Foaia (ADR 0225): îndreptată, ea e imaginea de aici încolo; altfel doar căutată, pentru sugestie.
  const f = foaia(img, c.foaie, c.maxPixeli ?? PIXELI_MAXIM);
  img = f.img;
  const foaie = f.foaie, mmFoaie = foaie?.indreptata && foaie.format ? foaie.format.w / img.latime : null;
  // Zona (ADR 0224, răspunsul 2a): un decupaj; de aici încolo, imaginea trasată e ea.
  const intreg = { latime: img.latime, inaltime: img.inaltime };
  const zona = c.zona ? zonaIn(c.zona, img.latime, img.inaltime) : null;
  if (zona) img = decupeaza(img, zona);
  // Scara: lățimea aleasă e a imaginii trasate (a zonei, dacă e una); fără ea, formatul foii îndreptate, apoi mărimea fizică
  // din DPI (a fișierului, nu a imaginii reduse), deci pixelul are aceeași mărime cu sau fără zonă.
  const mmPePx = c.latimeMm !== null ? c.latimeMm / img.latime : mmFoaie ?? (25.4 / (c.dpi ?? DPI_PRESUPUS)) * pxFisier;
  const scara = c.latimeMm !== null ? 'latime' : mmFoaie !== null ? 'foaie' : c.dpi !== null ? 'fisier' : 'presupus';
  const dpi = (25.4 * pxFisier) / mmPePx;
  const petePx = ariePx(c.peteMm, mmPePx), gauriPx = ariePx(c.gauriMm, mmPePx);
  const sc = { mmPePx, scara, dpi, redusDin, intreg, zona, foaie } as const;
  const pz = foaie?.previzualizare?.date, deFoaie = pz instanceof Uint8ClampedArray ? [pz] : [];
  if (c.culori) {
    const r = traseazaCulori(img, {
      ...c.culori, netezime: c.optiuni.netezime, petePx, gauriPx, ...(c.optiuni.margine === true ? { margine: true } : {}),
      ...(c.optiuni.lumina !== undefined && c.optiuni.lumina !== 'uniforma' ? { lumina: c.optiuni.lumina } : {}),
    });
    if (!r.ok) return { raspuns: { ...r, fel: 'culori', ...sc }, transfer: deTransferat(deFoaie) };
    const posterizare = posterizeaza(r.etichete, img.latime, img.inaltime);
    const vederi = r.piese.flatMap((p) => [p.cai.inceput, p.cai.tip, p.cai.xy, p.cai.exterior]);
    return {
      raspuns: { ok: true, fel: 'culori', piese: r.piese, raport: r.raport, posterizare, ...sc },
      transfer: deTransferat([...vederi, posterizare.etichete, ...deFoaie]),
    };
  }
  if (c.rezultat === 'mediane') {
    const m = c.mediane;
    const om: OptiuniMediana | undefined = m
      ? { capete: m.capete, late: m.late, semnaleaza: m.semnaleaza, bucle: m.bucle, pragLatPx: m.pragLatMm !== null && m.pragLatMm > 0 ? m.pragLatMm / mmPePx : null }
      : undefined;
    const r = traseazaMediana(img, { ...c.optiuni, petePx, gauriPx }, om);
    if (!r.ok) return { raspuns: { ...r, fel: 'mediane', ...sc }, transfer: deTransferat(deFoaie) };
    const late = r.late ? [r.late.inceput, r.late.tip, r.late.xy, r.late.exterior] : [];
    return {
      raspuns: { ...r, fel: 'mediane', ...sc },
      transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior, r.cai.deschisa, r.cai.peLinie, ...late, ...deFoaie]),
    };
  }
  const r = traseaza(img, { ...c.optiuni, petePx, gauriPx });
  if (!r.ok) return { raspuns: { ...r, fel: 'alb-negru', ...sc }, transfer: deTransferat(deFoaie) };
  return { raspuns: { ...r, fel: 'alb-negru', ...sc }, transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior, ...deFoaie]) };
}
