/**
 * Lanțul și linia de bază (ADR 0330 §4, felia 10.4↑d-1), pure: cote liniare puse una după alta, din aceeași unealtă.
 *
 * - **Lanțul** pleacă din capătul ultimei cote, iar linia fiecărei cote noi stă pe dreapta liniei celei dinainte (la orizontală
 *   și verticală); la aliniată, fiecare cotă nouă ține distanța primei, pe drumul ei.
 * - **Linia de bază** pleacă mereu din primul punct al primei cote, iar fiecare linie nouă stă mai departe de formă cu un pas,
 *   spre partea pe care a fost pusă prima (la d = 0, în sus sau spre stânga, ca normala).
 *
 * Fiecare cotă rămâne o cotă orizontală, verticală sau aliniată obișnuită: nimic nou în document.
 */
import type { Punct } from '../geom/conturBaza.ts';
import { directii, distantaDinCursor, type FelLiniar } from './desenCota.ts';
import type { Cota } from './document.ts';

export type ModSerie = 'lant' | 'baza';

export type StareSerie = {
  readonly mod: ModSerie;
  readonly fel: FelLiniar;
  /** Capătul din care pleacă cota următoare: în lanț, al doilea capăt al ultimei; la bază, primul capăt al primei. */
  readonly din: Punct;
  /** Un punct pe linia de cotă de referință: a ultimei (lanț), a primei (bază). */
  readonly pe: Punct;
  /** Distanța liniei de referință (la aliniată, singura care se poate păstra: drumul se schimbă). */
  readonly d: number;
  /** Partea liniilor de bază: a primei linii (d ≥ 0: +1). */
  readonly semn: 1 | -1;
  /** Câte cote s-au pus după prima (linia de bază). */
  readonly k: number;
};

/** Punctul liniei de cotă din mijlocul punctelor, pe normală (inversa lui `distantaDinCursor`), sau null. */
function peLinie(fel: FelLiniar, a: Punct, b: Punct, d: number): Punct | null {
  const dir = directii(fel, a, b);
  return dir ? { x: (a.x + b.x) / 2 + dir.n.x * d, y: (a.y + b.y) / 2 + dir.n.y * d } : null;
}

/** Seria care urmează după cota (fel, a → b, d), sau null (o aliniată între două puncte identice). */
export function pornesteSerie(mod: ModSerie, fel: FelLiniar, a: Punct, b: Punct, d: number): StareSerie | null {
  const pe = peLinie(fel, a, b, d);
  if (!pe) return null;
  return { mod, fel, din: mod === 'lant' ? b : a, pe, d, semn: d < 0 ? -1 : 1, k: 0 };
}

/** Lungimea măsurată de felul seriei între două puncte: pe X, pe Y sau dreaptă. */
function masura(fel: FelLiniar, a: Punct, b: Punct): number {
  if (fel === 'orizontala') return Math.abs(b.x - a.x);
  if (fel === 'verticala') return Math.abs(b.y - a.y);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Cota următoare a seriei, până în punctul `c`: distanța liniei ei și starea de după. `pas` e depărtarea dintre liniile de bază
 * (mm). Null: cota ar măsura zero (un punct cu același X la orizontală, același Y la verticală, același punct la aliniată).
 */
export function cotaUrmatoare(s: StareSerie, c: Punct, pas: number): { readonly d: number; readonly stare: StareSerie } | null {
  const a = s.din;
  if (!(masura(s.fel, a, c) > 1e-9)) return null;
  if (s.mod === 'lant') {
    const d = s.fel === 'aliniata' ? s.d : distantaDinCursor(s.fel, a, c, s.pe);
    const pe = s.fel === 'aliniata' ? peLinie(s.fel, a, c, d) ?? s.pe : s.pe;
    return { d, stare: { ...s, din: c, pe, d } };
  }
  const k = s.k + 1, dd = s.semn * k * pas;
  if (s.fel === 'aliniata') return { d: s.d + dd, stare: { ...s, k } };
  const n = directii(s.fel, a, c)?.n;
  if (!n) return null;
  return { d: distantaDinCursor(s.fel, a, c, { x: s.pe.x + n.x * dd, y: s.pe.y + n.y * dd }), stare: { ...s, k } };
}

/** Un id nou pe foaie: „c” și primul număr după cele folosite. */
export function idCotaNou(cote: readonly Cota[]): string {
  let n = 0;
  for (const c of cote) {
    const m = /^c(\d+)$/.exec(c.id);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `c${n + 1}`;
}
