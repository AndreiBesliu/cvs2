/**
 * Grila tăierii în panouri (ADR 0181 §7, felia 10.3↑k), pură, comună workerului (`panouri.ts`) și previzualizării din panoul
 * Taie: liniile verticale (`xs`) și orizontale (`ys`) peste cutia formelor, crescătoare, fără marginile ei.
 * - **după mărime** (L × Î): panourile **egale** sunt cel mai mic număr care încape pe fiecare axă, toate de aceeași mărime
 *   (firma de 2 400 × 1 000 pe 1 200 × 900: X = 1 200, Y = 500); **din colț**, panouri pline de la colțul din stânga-jos, plus
 *   restul (X = 1 200, Y = 900);
 * - **după număr** (coloane × rânduri): egale.
 *
 * O lățime care trece de un multiplu al panoului cu mai puțin de `TOLERANTA` (zgomotul cutiei) nu face un panou în plus. Peste
 * `PLAFON_PANOURI` celule: `panouri`, socotit înainte de linii (o mărime de 1e-9 nu le numără pe rând); o mărime care nu e un număr
 * pozitiv sau un număr de panouri care nu e întreg, cel puțin 1: `valoare`.
 */
import type { Cutie } from '../geom/cutie.ts';

export type GrilaPanouri =
  | { readonly fel: 'marime'; readonly latime: number; readonly inaltime: number; readonly colt: boolean }
  | { readonly fel: 'numar'; readonly coloane: number; readonly randuri: number };

export const PLAFON_PANOURI = 100;
const TOLERANTA = 1e-6;

/** Câte panouri pe o axă de lungime w, cu panoul de lungime l (cel puțin unul). */
const cate = (w: number, l: number): number => Math.max(1, Math.ceil((w - TOLERANTA) / l));
const pozitiv = (x: number): boolean => Number.isFinite(x) && x > 0;
const intreg = (x: number): boolean => Number.isInteger(x) && x >= 1;

export function grilaPanouri(k: Cutie, g: GrilaPanouri): { readonly xs: number[]; readonly ys: number[] } | 'valoare' | 'panouri' {
  const W = k.maxX - k.minX, H = k.maxY - k.minY;
  if (g.fel === 'marime' ? !pozitiv(g.latime) || !pozitiv(g.inaltime) : !intreg(g.coloane) || !intreg(g.randuri)) return 'valoare';
  const nx = g.fel === 'marime' ? cate(W, g.latime) : g.coloane, ny = g.fel === 'marime' ? cate(H, g.inaltime) : g.randuri;
  if (nx * ny > PLAFON_PANOURI) return 'panouri';
  // Din colț, linia k e la k · L de colț; egale, la k / n din lungime (aceleași numere de panouri).
  const linii = (a: number, w: number, n: number, l: number | null): number[] => Array.from({ length: n - 1 }, (_, i) => a + (l === null ? (w * (i + 1)) / n : l * (i + 1)));
  const colt = g.fel === 'marime' && g.colt;
  return { xs: linii(k.minX, W, nx, colt ? g.latime : null), ys: linii(k.minY, H, ny, colt ? g.inaltime : null) };
}
