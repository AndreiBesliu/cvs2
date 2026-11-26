/**
 * Punerea unei cote de lungime (ADR 0330, felia 10.4↑e-2), pură: „Cotează lungimea laturii” și „Cotează lungimea conturului”
 * din meniul de clic dreapta, pe forma de sub cursor. Latura e cea mai apropiată de punct, la cel mult `tol` mm, a unui element
 * al foii (un relief n-are laturi de măsurat); capătul cotei e legat la mijlocul ei (lungimea se citește din formă, deci e mereu
 * legată la punere, oricare ar fi setarea), cu ultima lungime văzută scrisă, iar eticheta pleacă spre afara formei: pe direcția
 * din centrul cutiei ei spre capăt, la cel mai apropiat multiplu de 45°.
 */
import { apropiat } from '../geom/apropiat.ts';
import { numarSegmente, type Punct } from '../geom/conturBaza.ts';
import { cotaVazuta, indexLume, punctLoc } from './cote.ts';
import type { Cota, Document } from './document.ts';
import { chenarElement, cutieElement } from './forme.ts';
import { elementeFoaie } from './lume.ts';

/** Lungimea liniei etichetei la punere, în mm (de mutat apoi trăgând eticheta). */
export const DISTANTA_ETICHETA = 8;

/**
 * Cota de lungime pentru latura de lângă `w` (sau conturul ei, cu `pe: 'contur'`), cu id-ul dat, ori null: nicio latură la cel
 * mult `tol` mm.
 */
export function cotaLungimeLa(doc: Document, indexFoaie: number, w: Punct, tol: number, pe: 'latura' | 'contur', id: string): Cota | null {
  let cel: { readonly e: ReturnType<typeof elementeFoaie>[number]; readonly k: number; readonly n: number; readonly d: number } | null = null;
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (e.forma.tip === 'relief') continue;
    const b = cutieElement(e);
    if (w.x < b.minX - tol || w.x > b.maxX + tol || w.y < b.minY - tol || w.y > b.maxY + tol) continue;
    const c = chenarElement(e), n = numarSegmente(c);
    for (let k = 0; k < n; k++) {
      const d = apropiat(c, k, w).d;
      if (d <= tol && (!cel || d < cel.d)) cel = { e, k, n, d };
    }
  }
  if (!cel) return null;
  const { e, k, n } = cel;
  const p = punctLoc(e, { fel: 'mijloc', k }, n);
  if (p === 'noduri') return null;
  const b = cutieElement(e), centru = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const dx = p.x - centru.x, dy = p.y - centru.y;
  const u = Math.hypot(dx, dy) > 1e-9 ? Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * 45 : 45;
  const cota: Cota = {
    id, fel: 'lungime',
    puncte: [{ x: p.x, y: p.y, legatura: { instanta: e.instanta, nod: e.nod, loc: { fel: 'mijloc', k }, n } }],
    linie: { d: DISTANTA_ETICHETA, u: (u === -180 ? 180 : u) || 0 },
    ...(pe === 'contur' ? { pe: 'contur' } : {}),
  };
  return cotaVazuta(cota, indexLume(doc, indexFoaie));
}
