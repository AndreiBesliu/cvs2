/** Gradațiile riglelor (ADR 0050 §4), pure. */

/** Pasul gradațiilor mari: 1, 2 sau 5 × 10ⁿ mm, cel mai mic care lasă cel puțin `minPx` între etichete. */
export function pasRigla(scara: number, minPx = 64): { readonly mare: number; readonly mic: number } {
  const brut = minPx / scara;
  const p = 10 ** Math.floor(Math.log10(brut));
  for (const m of [1, 2, 5, 10]) {
    if (m * p >= brut) {
      const mare = m * p;
      const diviziuni = m === 2 ? 4 : m === 5 ? 5 : 10;
      return { mare, mic: mare / diviziuni };
    }
  }
  return { mare: 10 * p, mic: p };
}

type Vedere = { readonly scara: number; readonly tx: number; readonly ty: number };
type Zona = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Cutie = { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };

/**
 * Unde stau riglele (ADR 0060), în pixelii pânzei: rigla de sus deasupra marginii de sus a foii, de la X 0 la lățimea ei,
 * rigla din stânga în stânga marginii din stânga, de la Y 0 la înălțimea ei; amândouă urmează foaia oriunde, și pe sub bare
 * și panouri (care plutesc deasupra pânzei). Întinderea se taie doar la marginile pânzei (`pana`), ca o riglă la un zoom mare
 * să nu fie un desen de kilometri. `null`: rigla e cu totul în afara pânzei.
 */
export function pozitiaRiglelor(v: Vedere, pana: Zona, foaie: { readonly latime: number; readonly inaltime: number }, grosime: number): {
  readonly sus: { readonly x0: number; readonly x1: number; readonly y: number } | null;
  readonly stanga: { readonly y0: number; readonly y1: number; readonly x: number } | null;
} {
  const sx0 = v.tx, sx1 = v.tx + foaie.latime * v.scara, sySus = v.ty - foaie.inaltime * v.scara, syJos = v.ty;
  const y = sySus - grosime, x = sx0 - grosime;
  const x0 = Math.max(sx0, pana.x), x1 = Math.min(sx1, pana.x + pana.w);
  const y0 = Math.max(sySus, pana.y), y1 = Math.min(syJos, pana.y + pana.h);
  const susVizibila = x1 > x0 && y + grosime > pana.y && y < pana.y + pana.h;
  const stangaVizibila = y1 > y0 && x + grosime > pana.x && x < pana.x + pana.w;
  return { sus: susVizibila ? { x0, x1, y } : null, stanga: stangaVizibila ? { y0, y1, x } : null };
}

/** Sub atât (mm), o formă nu iese din foaie (zgomotul de calcul al unei forme lipite de margine). */
export const EPS_COTA = 1e-6;

/**
 * Cotele formelor care ies din foaie (ADR 0060): cât ies peste fiecare margine, în mm, sau `null` pe partea pe care nu ies.
 * `forme`: cutia tuturor formelor foii (`null`: nicio formă).
 */
export function cotePeste(forme: Cutie | null, foaie: { readonly latime: number; readonly inaltime: number }): {
  readonly stanga: number | null; readonly dreapta: number | null; readonly jos: number | null; readonly sus: number | null;
} {
  const peste = (v: number): number | null => (v > EPS_COTA ? v : null);
  if (!forme) return { stanga: null, dreapta: null, jos: null, sus: null };
  return {
    stanga: peste(-forme.minX), dreapta: peste(forme.maxX - foaie.latime), jos: peste(-forme.minY), sus: peste(forme.maxY - foaie.inaltime),
  };
}
