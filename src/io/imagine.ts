/**
 * Ușa imaginilor (ADR 0220 §1, §7): felul imaginii după semnătură (PNG, JPEG, GIF, BMP, WebP; TIFF, refuzat deocamdată) și
 * DPI-ul scris în antet (PNG `pHYs`, JPEG JFIF sau EXIF, BMP). Fără dependențe; decodarea o face browserul, în workerul
 * trasării (`src/jobs/calculTrasare.ts`).
 */

export type FelImagine = 'png' | 'jpeg' | 'gif' | 'bmp' | 'webp' | 'tiff';

/** Alegerile trasării pe culori (ADR 0221 §2–§3), după indicele culorii din reducere. */
export type AlegeriCulori = {
  /** Câte culori (2–16); null: automat. */
  readonly numar: number | null;
  /** Pentru fiecare culoare, culoarea de care e legată, sau -1; o reducere nouă (alt număr) le șterge. */
  readonly legaturi: readonly number[];
  /** Ce culori se trasează; null: toate, afară de fundal. */
  readonly bifate: readonly boolean[] | null;
};

/**
 * Opțiunile liniei mediane din fereastră (ADR 0223): capetele, părțile late (cu pragul în mm; null: automat, de două ori
 * grosimea obișnuită), semnalarea lor și buclele.
 */
export type AlegeriMediane = {
  readonly capete: 'centru' | 'varf';
  readonly late: 'mediane' | 'contur';
  readonly pragLatMm: number | null;
  readonly semnaleaza: boolean;
  readonly bucle: 'linie' | 'inchise';
};

/** Alegerile trasării din fereastra importului (ADR 0220 §10); pragurile curățării și lățimea, în mm. */
export type AlegeriTrasare = {
  /** Sursa cernelii (alb-negru), sau culorile (ADR 0221 §1): pragul și inversarea nu se folosesc atunci. */
  readonly sursa: 'auto' | 'alfa' | 'lum' | 'culori';
  /** Ce iese din cerneala alb-negru (ADR 0222 §2): contururile ei, sau liniile mediane ale trăsăturilor (tăiate pe linie). */
  readonly rezultat: 'contururi' | 'mediane';
  /** Pragul, din 255; null: automat. */
  readonly prag: number | null;
  readonly inverseaza: boolean;
  readonly netezime: 'fidel' | 'echilibrat' | 'neted';
  readonly peteMm: number;
  readonly gauriMm: number;
  /** Lățimea imaginii pe foaie; null: din DPI-ul fișierului (sau 96 px / țol). */
  readonly latimeMm: number | null;
  readonly culori: AlegeriCulori;
  /** Opțiunile liniei mediane (ADR 0223), folosite doar cu rezultatul „Linii mediane”. */
  readonly mediane: AlegeriMediane;
  /** Lumina (ADR 0224), doar pe sursa luminozității: implicit „Uniformă”, pragul de azi (răspunsul 1a). */
  readonly lumina: 'uniforma' | 'neuniforma' | 'umbre';
  /** „Ignoră ce atinge marginea” (ADR 0224): implicit oprită. */
  readonly margine: boolean;
  /** Zona trasă pe previzualizare, în pixelii imaginii trasate (ADR 0224, răspunsul 2a: un decupaj), sau null: toată. */
  readonly zona: { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
};

/** Culorile implicite (ADR 0221, răspunsul 1a): numărul automat, fără legături, toate afară de fundal. */
export const CULORI_IMPLICITE: AlegeriCulori = { numar: null, legaturi: [], bifate: null };

/** Opțiunile implicite ale liniei mediane (ADR 0223, răspunsurile 1a–3a): recomandările din ADR 0222, cu semnalarea pornită. */
export const MEDIANE_IMPLICITE: AlegeriMediane = { capete: 'centru', late: 'mediane', pragLatMm: null, semnaleaza: true, bucle: 'linie' };

/**
 * Implicitele (ADR 0220 §3–§7, ADR 0222 §2, ADR 0224): sursa aleasă singură, contururile, pragul automat, Echilibrat, petele
 * și golurile sub 0,3 mm, lumina uniformă, fără zonă și fără ștergerea marginii.
 */
export const TRASARE_IMPLICITA: AlegeriTrasare = {
  sursa: 'auto', rezultat: 'contururi', prag: null, inverseaza: false, netezime: 'echilibrat', peteMm: 0.3, gauriMm: 0.3, latimeMm: null,
  culori: CULORI_IMPLICITE, mediane: MEDIANE_IMPLICITE, lumina: 'uniforma', margine: false, zona: null,
};

/**
 * Sugestia raportului (ADR 0224 §1): la „Uniformă”, pe luminozitate, când fundalul neted al hârtiei variază cu mai mult
 * de atât ((max − min) / max), raportul propune „Neuniformă”.
 */
export const SUGESTIE_INEGALA = 0.25;

/** Felul imaginii după primii octeți, sau null (nu e o imagine pe care o știe ușa). */
export function felImagine(b: Uint8Array): FelImagine | null {
  const s = (i: number, t: string): boolean => [...t].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b[0] === 0x89 && s(1, 'PNG')) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (s(0, 'GIF8')) return 'gif';
  if (s(0, 'BM') && b.length >= 26) return 'bmp';
  if (s(0, 'RIFF') && s(8, 'WEBP')) return 'webp';
  if ((s(0, 'II') && b[2] === 42 && b[3] === 0) || (s(0, 'MM') && b[2] === 0 && b[3] === 42)) return 'tiff';
  return null;
}

const plauzibil = (dpi: number): number | null => (Number.isFinite(dpi) && dpi >= 10 && dpi <= 10_000 ? dpi : null);

/** DPI-ul pe orizontală scris în fișier, sau null (nespus, sau neplauzibil: sub 10 ori peste 10 000). */
export function dpiImagine(b: Uint8Array): number | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const fel = felImagine(b);
  try {
    if (fel === 'png') {
      for (let i = 8; i + 12 <= b.length;) {
        const n = v.getUint32(i), tip = String.fromCharCode(b[i + 4] ?? 0, b[i + 5] ?? 0, b[i + 6] ?? 0, b[i + 7] ?? 0);
        if (tip === 'pHYs' && n >= 9) return b[i + 16] === 1 ? plauzibil(v.getUint32(i + 8) * 0.0254) : null;
        if (tip === 'IDAT' || tip === 'IEND') return null;
        i += 12 + n;
      }
      return null;
    }
    if (fel === 'bmp') {
      if (v.getUint32(14, true) < 40) return null;
      const ppm = v.getInt32(38, true);
      return ppm > 0 ? plauzibil(ppm * 0.0254) : null;
    }
    if (fel === 'jpeg') return dpiJpeg(b, v);
  } catch {
    return null;
  }
  return null;
}

/** JPEG: JFIF (unitățile 1 = pe țol, 2 = pe cm), altfel EXIF (XResolution cu ResolutionUnit 2 = țol, 3 = cm). */
function dpiJpeg(b: Uint8Array, v: DataView): number | null {
  let exif: number | null = null;
  for (let i = 2; i + 4 <= b.length;) {
    if (b[i] !== 0xff) return exif;
    const m = b[i + 1] ?? 0;
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    if (m === 0xda || m === 0xd9) return exif;
    const n = v.getUint16(i + 2), d = i + 4;
    const s = (k: number, t: string): boolean => [...t].every((c, j) => b[d + k + j] === c.charCodeAt(0));
    if (m === 0xe0 && s(0, 'JFIF\0')) {
      const u = b[d + 7], x = v.getUint16(d + 8);
      if (u === 1) return plauzibil(x);
      if (u === 2) return plauzibil(x * 2.54);
    }
    if (m === 0xe1 && s(0, 'Exif\0\0') && exif === null) exif = dpiExif(v, d + 6);
    i += 2 + n;
  }
  return exif;
}

function dpiExif(v: DataView, t: number): number | null {
  const le = v.getUint8(t) === 0x49;
  const u16 = (o: number): number => v.getUint16(t + o, le), u32 = (o: number): number => v.getUint32(t + o, le);
  const ifd = u32(4), n = u16(ifd);
  let rez: number | null = null, unitate = 2;
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + 12 * k, tag = u16(e);
    if (tag === 0x011a) { const o = u32(e + 8), den = u32(o + 4); rez = den ? u32(o) / den : null; }
    if (tag === 0x0128) unitate = u16(e + 8);
  }
  if (rez === null) return null;
  return unitate === 3 ? plauzibil(rez * 2.54) : unitate === 2 ? plauzibil(rez) : null;
}
