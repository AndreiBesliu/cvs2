/**
 * ORACOLUL PÂNZEI (din s6, rescris), cu ZERO importuri din `src/`: judecă linia desenată față de cercul calculat pe
 * hârtie din vederea pânzei.
 *
 * Linia are un pixel fizic, cu antialiasing, deci nu se judecă pixel cu pixel peste un prag: pe unele direcții ea se
 * împarte între doi-trei pixeli palizi. Pe fiecare din 720 de direcții, oracolul citește „cerneala” de-a lungul normalei
 * la cerc și ia centrul ei ponderat: acolo e linia. Bugetul s6: linia stă la cel mult 0,5 px de cercul exact.
 */
export type Cerc = { readonly cx: number; readonly cy: number; readonly r: number };

/** Cerneala unui decupaj: o pondere 0…1 pe pixel (cât diferă de foaie), rând după rând, cu colțul în (x0, y0). */
export type Cerneala = { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number; readonly p: readonly number[] };

export type Verdict = {
  /** Cea mai mare distanță dintre centrul liniei și cercul exact, pe toate direcțiile, în pixeli. */
  readonly abatereMaxima: number;
  /** Direcțiile pe care normala n-are cerneala unei linii (mai puțin de 0,3 dintr-un pixel plin): goluri. */
  readonly goluri: number;
  readonly directii: number;
};

function pondere(c: Cerneala, x: number, y: number): number {
  // Interpolare biliniară între centrele pixelilor.
  const fx = x - c.x0 - 0.5, fy = y - c.y0 - 0.5;
  const i = Math.floor(fx), j = Math.floor(fy);
  const tx = fx - i, ty = fy - j;
  const v = (ii: number, jj: number): number => (ii < 0 || jj < 0 || ii >= c.w || jj >= c.h ? 0 : c.p[jj * c.w + ii] ?? 0);
  return (1 - tx) * (1 - ty) * v(i, j) + tx * (1 - ty) * v(i + 1, j) + (1 - tx) * ty * v(i, j + 1) + tx * ty * v(i + 1, j + 1);
}

export function judecaCerc(c: Cerneala, cerc: Cerc): Verdict {
  const directii = 720;
  const pas = 0.125;
  let abatere = 0;
  let goluri = 0;
  for (let k = 0; k < directii; k++) {
    const u = (2 * Math.PI * k) / directii;
    const cos = Math.cos(u), sin = Math.sin(u);
    let suma = 0, moment = 0;
    for (let d = -3; d <= 3 + 1e-9; d += pas) {
      const w = pondere(c, cerc.cx + (cerc.r + d) * cos, cerc.cy + (cerc.r + d) * sin);
      suma += w * pas;
      moment += w * d * pas;
    }
    if (suma < 0.3) { goluri++; continue; }
    abatere = Math.max(abatere, Math.abs(moment / suma));
  }
  return { abatereMaxima: abatere, goluri, directii };
}
