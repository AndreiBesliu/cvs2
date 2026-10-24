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
 * rigla din stânga în stânga marginii din stânga, de la Y 0 la înălțimea ei; amândouă se mută cu foaia. Când marginea foii
 * iese din zona liberă, rigla se oprește pe marginea zonei (nu trece pe sub panouri și bare); întinderea ei se taie la zonă.
 * `null`: rigla n-are nimic de arătat (foaia e în afara zonei pe axa ei).
 */
export function pozitiaRiglelor(v: Vedere, z: Zona, foaie: { readonly latime: number; readonly inaltime: number }, grosime: number): {
  readonly sus: { readonly x0: number; readonly x1: number; readonly y: number } | null;
  readonly stanga: { readonly y0: number; readonly y1: number; readonly x: number } | null;
} {
  const limiteaza = (a: number, de: number, la: number): number => Math.min(Math.max(a, de), Math.max(de, la));
  const sx0 = v.tx, sx1 = v.tx + foaie.latime * v.scara, sySus = v.ty - foaie.inaltime * v.scara, syJos = v.ty;
  const y = limiteaza(sySus - grosime, z.y, z.y + z.h - grosime);
  const x = limiteaza(sx0 - grosime, z.x, z.x + z.w - grosime);
  // Rigla de sus începe după colțul riglei din stânga, ca să nu se suprapună.
  const x0 = Math.max(sx0, x + grosime), x1 = Math.min(sx1, z.x + z.w);
  const y0 = Math.max(sySus, y + grosime), y1 = Math.min(syJos, z.y + z.h);
  return { sus: x1 > x0 ? { x0, x1, y } : null, stanga: y1 > y0 ? { y0, y1, x } : null };
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
