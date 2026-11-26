/**
 * „Cotează selecția” (ADR 0330 §4, felia 10.4↑d-1), pură: pentru fiecare piesă aleasă de pe foaie, lățimea și înălțimea cutiei
 * ei în lume, ca două cote noi, legate de colțurile cutiei elementelor de la margini (deci urmează piesa la mutare, rotire,
 * scalare). Lățimea stă sub piesă, înălțimea la dreapta ei, la distanța setată pentru cotele noi. O piesă dintr-un singur
 * element își dă colțurile ei; una din mai multe ia, pentru fiecare capăt, elementul cu marginea de acolo.
 *
 * O cotă care ar măsura zero (o linie dreaptă are o singură dimensiune) nu se pune; o instanță care nu e pe foaie, nici ea.
 */
import { numarSegmente } from '../geom/conturBaza.ts';
import type { Punct } from '../geom/conturBaza.ts';
import { punctLoc } from './cote.ts';
import { distantaDinCursor } from './desenCota.ts';
import type { AncoraCota, Cota, Document } from './document.ts';
import { chenarElement, cutieElement } from './forme.ts';
import { elementeFoaie, type ElementLume } from './lume.ts';
import { idCotaNou } from './serieCote.ts';

/** Capătul legat de colțul `i` al cutiei elementului (0 stânga-jos, 2 dreapta-jos, 8 dreapta-sus), sau liber în același punct. */
function capat(e: ElementLume, i: number, legate: boolean): { readonly p: Punct; readonly a: AncoraCota } {
  const n = numarSegmente(chenarElement(e));
  const p = punctLoc(e, { fel: 'cutie', i }, n);
  if (p === 'noduri') throw new Error('cutia are mereu punct');
  return { p, a: legate ? { x: p.x, y: p.y, legatura: { instanta: e.instanta, nod: e.nod, loc: { fel: 'cutie', i }, n } } : { x: p.x, y: p.y } };
}

/** Elementul cu cea mai mică (sau mare) valoare a lui `f`; la egalitate, primul. */
function extrem(el: readonly ElementLume[], f: (e: ElementLume) => number, mare: boolean): ElementLume {
  let cel = el[0]!;
  for (const e of el) if (mare ? f(e) > f(cel) : f(e) < f(cel)) cel = e;
  return cel;
}

/**
 * Cotele noi pentru instanțele `alese` (în ordinea lor) de pe foaia `indexFoaie`, cu id-uri după cele din `cote`. `distanta`
 * e depărtarea liniilor de cutia piesei (mm); `legate`, setarea „Cotele noi sunt legate”.
 */
export function coteSelectie(doc: Document, indexFoaie: number, alese: readonly string[], distanta: number, cote: readonly Cota[], legate: boolean): Cota[] {
  const toate = elementeFoaie(doc, indexFoaie);
  const noi: Cota[] = [];
  const pune = (fel: 'orizontala' | 'verticala', a: ReturnType<typeof capat>, b: ReturnType<typeof capat>, linie: Punct): void => {
    const d = distantaDinCursor(fel, a.p, b.p, linie);
    noi.push({ id: idCotaNou([...cote, ...noi]), fel, puncte: [a.a, b.a], linie: { d } });
  };
  for (const id of alese) {
    const el = toate.filter((e) => e.instanta === id);
    if (el.length === 0) continue;
    const minX = (e: ElementLume): number => cutieElement(e).minX, maxX = (e: ElementLume): number => cutieElement(e).maxX;
    const minY = (e: ElementLume): number => cutieElement(e).minY, maxY = (e: ElementLume): number => cutieElement(e).maxY;
    const st = extrem(el, minX, false), dr = extrem(el, maxX, true), jos = extrem(el, minY, false), sus = extrem(el, maxY, true);
    const x0 = minX(st), x1 = maxX(dr), y0 = minY(jos), y1 = maxY(sus);
    if (x1 - x0 > 1e-9) pune('orizontala', capat(st, 0, legate), capat(dr, 2, legate), { x: x0, y: y0 - distanta });
    if (y1 - y0 > 1e-9) pune('verticala', capat(jos, 2, legate), capat(sus, 8, legate), { x: x1 + distanta, y: y0 });
  }
  return noi;
}
