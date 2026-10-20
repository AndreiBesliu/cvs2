/** Editarea pe pânză (ADR 0050), partea pură: țintele lipirii, cutiile instanțelor alese, id-ul unui ghidaj nou. */
import type { Cutie } from '../geom/cutie.ts';
import { tinteCutie, tinteDin, tintePunct, type Tinte, type TintaLipire } from '../geom/lipire.ts';
import { aplica } from '../geom/matrice.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { cutieElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import { FOAIA } from '../ui/actiuniDocument.ts';

/**
 * Pură: țintele lipirii pe foaia curentă: foaia (marginile, mijlocul), ghidajele (dacă le cer), marginile și mijlocul
 * cutiei fiecărui element al instanțelor NEalese și capetele căilor deschise ale lor.
 */
export function tinteFoaie(doc: Document, alese: ReadonlySet<string>, cuGhidaje: boolean): Tinte {
  const foaie = doc.foi[FOAIA];
  if (!foaie) return tinteDin([]);
  const lista: TintaLipire[] = tinteCutie({ minX: 0, minY: 0, maxX: foaie.stoc.latime, maxY: foaie.stoc.inaltime }, 'foaie');
  if (cuGhidaje) for (const g of foaie.ghidaje ?? []) lista.push({ axa: g.axa, poz: g.poz, de: -Infinity, la: Infinity, fel: 'ghidaj' });
  for (const e of elementeFoaie(doc, FOAIA)) {
    if (alese.has(e.instanta)) continue;
    for (const x of tinteCutie(cutieElement(e), 'forma')) lista.push(x);
    if (e.forma.tip === 'cale' && !e.forma.inchis) {
      const v = e.forma.varfuri;
      for (const q of [v[0], v[v.length - 1]]) {
        if (!q) continue;
        const w = aplica(e.matrice, q.p);
        for (const x of tintePunct(w.x, w.y, 'forma')) lista.push(x);
      }
    }
  }
  return tinteDin(lista);
}

/** Pură: cutia fiecărei instanțe alese a foii curente (unirea cutiilor elementelor ei). */
export function cutiiAlese(doc: Document, alese: ReadonlySet<string>): Array<{ readonly id: string; readonly cutie: Cutie }> {
  const cutii = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
  for (const e of elementeFoaie(doc, FOAIA)) {
    if (!alese.has(e.instanta)) continue;
    const c = cutieElement(e);
    const v = cutii.get(e.instanta);
    cutii.set(e.instanta, v
      ? { minX: Math.min(v.minX, c.minX), minY: Math.min(v.minY, c.minY), maxX: Math.max(v.maxX, c.maxX), maxY: Math.max(v.maxY, c.maxY) }
      : { ...c });
  }
  return [...cutii].map(([id, cutie]) => ({ id, cutie }));
}

/** Pură: un id liber de ghidaj (`g<n>`). */
export function idGhidaj(ghidaje: readonly Ghidaj[]): string {
  const folosite = new Set(ghidaje.map((g) => g.id));
  let n = ghidaje.length + 1;
  while (folosite.has(`g${n}`)) n++;
  return `g${n}`;
}
