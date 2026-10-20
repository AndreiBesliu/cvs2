/**
 * Alinierea și distribuirea (ADR 0050 §3), pure, pe cutiile lucrurilor alese: deplasarea fiecăruia (doar cele care se
 * mișcă). Referința alinierii e cutia lor comună, sau foaia când e unul singur; distribuirea egalizează golurile dintre
 * ele, de la trei în sus, cu primul și ultimul pe loc.
 */
import type { Cutie } from './cutie.ts';

export type FelAliniere = 'stanga' | 'centru-x' | 'dreapta' | 'jos' | 'centru-y' | 'sus' | 'distribuie-x' | 'distribuie-y';

export const FELURI_ALINIERE: readonly FelAliniere[] = ['stanga', 'centru-x', 'dreapta', 'sus', 'centru-y', 'jos', 'distribuie-x', 'distribuie-y'];

export interface Ales {
  readonly id: string;
  readonly cutie: Cutie;
}

export interface Deplasare {
  readonly id: string;
  readonly dx: number;
  readonly dy: number;
}

/** De câte lucruri are nevoie fiecare fel: alinierea de unul (față de foaie), distribuirea de trei. */
export function minimAliniere(fel: FelAliniere): number {
  return fel.startsWith('distribuie') ? 3 : 1;
}

function uniune(a: readonly Ales[]): Cutie {
  return a.reduce((c, x) => ({
    minX: Math.min(c.minX, x.cutie.minX), minY: Math.min(c.minY, x.cutie.minY),
    maxX: Math.max(c.maxX, x.cutie.maxX), maxY: Math.max(c.maxY, x.cutie.maxY),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function distribuie(alese: readonly Ales[], axa: 'x' | 'y'): Deplasare[] {
  const min = (c: Cutie): number => (axa === 'x' ? c.minX : c.minY);
  const max = (c: Cutie): number => (axa === 'x' ? c.maxX : c.maxY);
  // În ordinea pe axă (la egalitate, după id, ca rezultatul să nu depindă de ordinea selecției).
  const ord = [...alese].sort((a, b) => min(a.cutie) - min(b.cutie) || max(a.cutie) - max(b.cutie) || (a.id < b.id ? -1 : 1));
  const prim = ord[0], ultim = ord[ord.length - 1];
  if (!prim || !ultim) return [];
  const lungimi = ord.reduce((s, x) => s + (max(x.cutie) - min(x.cutie)), 0);
  const gol = (max(ultim.cutie) - min(prim.cutie) - lungimi) / (ord.length - 1);
  const rez: Deplasare[] = [];
  let pos = max(prim.cutie) + gol;
  for (const x of ord.slice(1, -1)) {
    const d = pos - min(x.cutie);
    rez.push({ id: x.id, dx: axa === 'x' ? d : 0, dy: axa === 'y' ? d : 0 });
    pos += max(x.cutie) - min(x.cutie) + gol;
  }
  return rez;
}

/**
 * Pură: deplasările care aliniază sau distribuie `alese`; `foaie` e referința unui singur lucru aliniat. Lucrurile deja la
 * locul lor (sub 1e-9 mm) nu apar. Prea puține pentru fel = nicio deplasare.
 */
export function aliniaza(alese: readonly Ales[], fel: FelAliniere, foaie: Cutie): Deplasare[] {
  if (alese.length < minimAliniere(fel)) return [];
  let rez: Deplasare[];
  if (fel === 'distribuie-x' || fel === 'distribuie-y') rez = distribuie(alese, fel === 'distribuie-x' ? 'x' : 'y');
  else {
    const r = alese.length === 1 ? foaie : uniune(alese);
    rez = alese.map(({ id, cutie: c }) => {
      switch (fel) {
        case 'stanga': return { id, dx: r.minX - c.minX, dy: 0 };
        case 'dreapta': return { id, dx: r.maxX - c.maxX, dy: 0 };
        case 'centru-x': return { id, dx: (r.minX + r.maxX) / 2 - (c.minX + c.maxX) / 2, dy: 0 };
        case 'jos': return { id, dx: 0, dy: r.minY - c.minY };
        case 'sus': return { id, dx: 0, dy: r.maxY - c.maxY };
        case 'centru-y': return { id, dx: 0, dy: (r.minY + r.maxY) / 2 - (c.minY + c.maxY) / 2 };
      }
    });
  }
  return rez.filter((d) => Math.abs(d.dx) > 1e-9 || Math.abs(d.dy) > 1e-9);
}
