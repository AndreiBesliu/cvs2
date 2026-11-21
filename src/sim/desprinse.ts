import { campNou, dimensiuni, valoare, type ParametriCamp } from './camp.ts';
import { ruleaza, STRIDE, type GrupSimulare } from './nucleu.ts';

/**
 * Proba urechilor la export (ADR 0210, felia 11.3↑c): ce rămâne pe fundul foii la capătul programului și ce mai ține de
 * marginea ei. Nucleul simulării taie câmpul foii doar cu mutările care ajung la fața de jos (celelalte nu desprind nimic):
 * o celulă la cel mult `PRAG_FUND` deasupra feței de jos e tăiată prin foaie; restul e lemn pe fund (și urechile, care se
 * opresc deasupra ei). Lemnul atins de umplerea din marginea foii (vecinii pe laturi, nu pe colțuri) ține de foaie. O parte
 * (un poligon închis) e desprinsă când are lemn înăuntru, dar niciun pic din el nu e atins: tăietura din jurul ei e
 * închisă, deci urechile ei n-au de ce să se țină (pe placa 11, la 5 mm, tăieturile vecine se unesc). Proba e a programului:
 * prinde orice așezare, și pe cea mutată de mână.
 */

/** Celula probei (mm), dublată până când foaia încape sub `PLAFON_DESPRINSE` celule (o placă de 2 440 × 1 220: 1 mm). */
export const CELULA_DESPRINSE = 0.25;
export const PLAFON_DESPRINSE = 1 << 22;
/** O celulă e tăiată prin foaie când scula a coborât la cel mult atât deasupra feței de jos (mm). */
export const PRAG_FUND = 1e-3;

export type CerereDesprinse = {
  readonly foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number };
  /** Grupurile programului (scula și mutările nucleului, cu fața plăcii la Z 0), în ordine. */
  readonly grupuri: readonly GrupSimulare[];
  /** Părțile de judecat: poligoane închise, x0, y0, x1, y1, …, în coordonatele documentului. */
  readonly parti: readonly Float64Array[];
};

/** Celula probei pe o foaie: `CELULA_DESPRINSE`, sau cea mai mică dublare a ei sub plafon. */
export function celulaDesprinse(latime: number, inaltime: number): number {
  let c = CELULA_DESPRINSE;
  for (;;) {
    const { nx, ny } = dimensiuni(c, latime, inaltime);
    if (nx * ny <= PLAFON_DESPRINSE) return c;
    c *= 2;
  }
}

/** Mutările care ajung la `prag` (Z-ul cel mai jos al capetelor; pe o elice, Z-ul e liniar în unghi): o copie. */
function panaLaFund(m: Float64Array, prag: number): Float64Array {
  const pastrate: number[] = [];
  for (let o = 0; o < m.length; o += STRIDE) if (Math.min(m[o + 3]!, m[o + 6]!) <= prag) pastrate.push(o);
  const out = new Float64Array(pastrate.length * STRIDE);
  pastrate.forEach((o, k) => { out.set(m.subarray(o, o + STRIDE), k * STRIDE); });
  return out;
}

/**
 * Indicii părților desprinse, crescător, și celula probei. 0: lemn, 1: tăiat prin foaie, 2: lemn legat de marginea foii. O
 * parte se judecă pe celulele cu centrul înăuntrul ei (regula par-impar, pe rândurile câmpului); una fără lemn înăuntru
 * (toată scoasă, sau mai mică decât o celulă) nu se judecă.
 */
export function partiDesprinse(c: CerereDesprinse): { readonly desprinse: readonly number[]; readonly celula: number } {
  const { latime, inaltime, grosime } = c.foaie;
  const celula = celulaDesprinse(latime, inaltime);
  const p: ParametriCamp = { x0: 0, y0: 0, latime, inaltime, celula, sus: 0 };
  const F = campNou(p);
  const prag = -grosime + PRAG_FUND;
  for (const g of c.grupuri) ruleaza(F, g.scula, panaLaFund(g.mutari, prag));
  const { nx, ny } = F;
  const s = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (valoare(F, i, j) <= prag) s[j * nx + i] = 1;
  // Umplerea din marginea foii, prin lemn.
  const coada = new Int32Array(nx * ny);
  let cap = 0, capat = 0;
  const pune = (k: number): void => {
    if (s[k] === 0) { s[k] = 2; coada[capat++] = k; }
  };
  for (let i = 0; i < nx; i++) { pune(i); pune((ny - 1) * nx + i); }
  for (let j = 0; j < ny; j++) { pune(j * nx); pune(j * nx + nx - 1); }
  while (cap < capat) {
    const k = coada[cap++]!, i = k % nx;
    if (i > 0) pune(k - 1);
    if (i < nx - 1) pune(k + 1);
    if (k >= nx) pune(k - nx);
    if (k < (ny - 1) * nx) pune(k + nx);
  }
  const desprinse: number[] = [];
  const xs: number[] = [];
  c.parti.forEach((pol, idx) => {
    const n = pol.length >> 1;
    if (n < 3) return;
    let ymin = Infinity, ymax = -Infinity;
    for (let k = 0; k < n; k++) { const y = pol[2 * k + 1]!; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
    const j0 = Math.max(0, Math.ceil(ymin / celula - 0.5)), j1 = Math.min(ny - 1, Math.floor(ymax / celula - 0.5));
    let lemn = 0, legata = false;
    for (let j = j0; j <= j1 && !legata; j++) {
      const y = (j + 0.5) * celula;
      xs.length = 0;
      for (let k = 0; k < n; k++) {
        const ax = pol[2 * k]!, ay = pol[2 * k + 1]!, q = (k + 1) % n, bx = pol[2 * q]!, by = pol[2 * q + 1]!;
        if ((ay <= y && y < by) || (by <= y && y < ay)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length && !legata; q += 2) {
        const i0 = Math.max(0, Math.ceil(xs[q]! / celula - 0.5)), i1 = Math.min(nx - 1, Math.floor(xs[q + 1]! / celula - 0.5));
        for (let i = i0; i <= i1; i++) {
          const v = s[j * nx + i];
          if (v === 1) continue;
          lemn++;
          if (v === 2) { legata = true; break; }
        }
      }
    }
    if (lemn > 0 && !legata) desprinse.push(idx);
  });
  return { desprinse, celula };
}
