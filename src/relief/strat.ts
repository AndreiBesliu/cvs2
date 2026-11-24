/**
 * Un strat întreg (ADR 0310 §2, ADR 0311 §5–§6): grila de valori Float32 se taie în dale, fiecare se cuantizează, iar dalele cu
 * coduri primesc octeții și amprenta lor; harta le înșiră, cu amprenta ei. Înapoi, din hartă și din dale, grila citită (cea
 * cuantizată: ce se vede, ce se salvează și ce se taie).
 */
import { sha256 } from './amprenta.ts';
import { citeste, cuantizeaza, dalaDinOcteti, octetiDala, valoriDala, type Dala } from './dala.ts';
import { CELULE_DALA, dale as numarDale, LATURA_DALA } from './grila.ts';
import { textHarta, type Harta, type IntrareDala } from './harta.ts';

export type StratConstruit = {
  readonly harta: Harta;
  /** Textul canonic al hărții și amprenta lui (`dale` din stratul documentului). */
  readonly text: string;
  readonly amprenta: string;
  /** Octeții dalelor cu coduri, după amprentă (pentru bază). */
  readonly octeti: ReadonlyMap<string, Uint8Array<ArrayBuffer>>;
  /** Dalele cuantizate, în ordinea hărții (pentru citire, fără să le decodăm din octeți). */
  readonly dale: readonly Dala[];
};

/** Construiește stratul unei grile nx × ny (j în sus). */
export async function stratDinGrila(valori: ArrayLike<number>, nx: number, ny: number): Promise<StratConstruit> {
  const { tx, ty } = numarDale(nx, ny);
  const intrari: IntrareDala[] = [], dale: Dala[] = [], octeti = new Map<string, Uint8Array<ArrayBuffer>>();
  for (let tj = 0; tj < ty; tj++) {
    for (let ti = 0; ti < tx; ti++) {
      const d = cuantizeaza(valoriDala(valori, nx, ny, ti, tj));
      dale.push(d);
      if (d.fel === 'gol') intrari.push(null);
      else if (d.fel === 'constanta') intrari.push(d.m);
      else {
        const o = octetiDala(d), h = await sha256(o);
        octeti.set(h, o);
        intrari.push(h);
      }
    }
  }
  const harta: Harta = { v: 1, nx, ny, dale: intrari };
  const text = textHarta(harta);
  return { harta, text, amprenta: await sha256(text), octeti, dale };
}

/** Grila citită (nx · ny, j în sus) din dalele unui strat, în ordinea hărții. */
export function grilaDinDale(nx: number, ny: number, dale: readonly Dala[]): Float32Array {
  const { tx } = numarDale(nx, ny), out = new Float32Array(nx * ny), tampon = new Float32Array(CELULE_DALA);
  dale.forEach((d, k) => {
    const ti = k % tx, tj = (k - ti) / tx, i0 = ti * LATURA_DALA, j0 = tj * LATURA_DALA;
    const la = Math.min(LATURA_DALA, nx - i0), lb = Math.min(LATURA_DALA, ny - j0);
    citeste(d, tampon);
    for (let b = 0; b < lb; b++) out.set(tampon.subarray(b * LATURA_DALA, b * LATURA_DALA + la), (j0 + b) * nx + i0);
  });
  return out;
}

/**
 * Dalele unui strat, în ordinea hărții, din octeții lor (după amprentă): o intrare goală e dala goală, un număr e constanta, o
 * amprentă e dala citită din octeții ei. Octeții care lipsesc ori nu sunt o dală (sau nu au amprenta cerută: verificarea e a
 * celui care îi aduce) dau lista amprentelor lipsă, nu o dală inventată.
 */
export function daleDinHarta(
  harta: Harta, octeti: (amprenta: string) => Uint8Array | undefined,
): { readonly ok: true; readonly dale: readonly Dala[] } | { readonly ok: false; readonly lipsa: readonly string[] } {
  const dale: Dala[] = [], lipsa: string[] = [];
  for (const e of harta.dale) {
    if (e === null) dale.push({ fel: 'gol' });
    else if (typeof e === 'number') dale.push({ fel: 'constanta', m: e });
    else {
      const o = octeti(e), d = o ? dalaDinOcteti(o) : null;
      if (d) dale.push(d);
      else lipsa.push(e);
    }
  }
  return lipsa.length === 0 ? { ok: true, dale } : { ok: false, lipsa };
}
