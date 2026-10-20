/** Editarea pe pânză (ADR 0050), partea pură: țintele lipirii, cutiile instanțelor alese, id-ul unui ghidaj nou. */
import type { Cutie } from '../geom/cutie.ts';
import { tinteCutie, tinteDin, tintePunct, type Tinte, type TintaLipire } from '../geom/lipire.ts';
import { aplica } from '../geom/matrice.ts';
import type { Document, Ghidaj } from '../model/document.ts';
import { cutieElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { Transformare } from '../model/transformare.ts';
import { FOAIA } from '../ui/actiuniDocument.ts';

type Punct = { readonly x: number; readonly y: number };

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

export type Maner = 'nv' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sv' | 'v';
export const MANERE: readonly Maner[] = ['nv', 'n', 'ne', 'e', 'se', 's', 'sv', 'v'];
const OPUS: Record<Maner, Maner> = { nv: 'se', n: 's', ne: 'sv', e: 'v', se: 'nv', s: 'n', sv: 'ne', v: 'e' };

/** Pură: punctul mânerului `m` pe cutie (colțurile, mijloacele laturilor). */
export function punctManer(c: Cutie, m: Maner): Punct {
  const x = m === 'nv' || m === 'sv' || m === 'v' ? c.minX : m === 'n' || m === 's' ? (c.minX + c.maxX) / 2 : c.maxX;
  const y = m === 'nv' || m === 'n' || m === 'ne' ? c.maxY : m === 'v' || m === 'e' ? (c.minY + c.maxY) / 2 : c.minY;
  return { x, y };
}

/**
 * Pură: transformarea gestului pe un mâner. Scalarea: ancora e mânerul opus; colțurile scalează proporțional (după axa
 * care s-a schimbat mai mult), Shift liber; laturile, pe o singură axă; mânerul urmează DEPLASAREA cursorului față de
 * apăsare (un clic pe mâner, oriunde în pătratul lui, nu schimbă nimic). Rotirea: unghiul dintre apăsare și cursor, în
 * jurul centrului cutiei, Shift în pași de 15°. Scările și unghiul se rotunjesc (1e-4, 0,001°), ca pixelii mausului să nu
 * ajungă în geometrie.
 */
export function transformareManer(c: Cutie, m: Maner | 'rotire', start: Punct, q: Punct, shift: boolean): Transformare {
  const cx = (c.minX + c.maxX) / 2, cy = (c.minY + c.maxY) / 2;
  if (m === 'rotire') {
    let u = ((Math.atan2(q.y - cy, q.x - cx) - Math.atan2(start.y - cy, start.x - cx)) * 180) / Math.PI;
    if (u > 180) u -= 360;
    if (u < -180) u += 360;
    u = shift ? Math.round(u / 15) * 15 : Math.round(u * 1000) / 1000;
    return { fel: 'rotire', unghi: u, centru: { x: cx, y: cy } };
  }
  const a = punctManer(c, OPUS[m]), h = punctManer(c, m);
  const rot = (v: number): number => Math.round(v * 10000) / 10000;
  const hx = h.x + q.x - start.x, hy = h.y + q.y - start.y;
  let fx = h.x === a.x ? 1 : rot((hx - a.x) / (h.x - a.x));
  let fy = h.y === a.y ? 1 : rot((hy - a.y) / (h.y - a.y));
  if (m.length === 2 && !shift) {
    const f = Math.abs(fx - 1) >= Math.abs(fy - 1) ? fx : fy;
    fx = f;
    fy = f;
  }
  return { fel: 'scalare', sx: fx, sy: fy, ancora: a };
}

/** Cât de departe deasupra cutiei stă mânerul de rotire (pixeli). */
export const ROTIRE_PX = 26;
/** Sub atâția pixeli pe o axă, mânerele care o scalează nu apar: forma (mică pe ecran) trebuie să rămână de apucat și mutat. */
export const MANER_MINIM_PX = 24;
/** Jumătatea pătratului în care un mâner e lovit (pixeli). */
const LOVIRE_PX = 6;

/** Pură: mânerele de scalare arătate pe o cutie de `w` × `h` pixeli: laturile unei axe doar de la 24 px, colțurile cu ambele. */
export function manereVazute(w: number, h: number): readonly Maner[] {
  const x = w >= MANER_MINIM_PX, y = h >= MANER_MINIM_PX;
  return MANERE.filter((m) => (m === 'e' || m === 'v' ? x : m === 'n' || m === 's' ? y : x && y));
}

/**
 * Pură: mânerul de sub punctul (px, py) al pânzei (pixeli din colțul ei), sau null: întâi rotirea, apoi colțurile, apoi
 * laturile (pe o cutie strâmtă, colțul câștigă).
 */
export function manerLovit(c: Cutie, v: { readonly tx: number; readonly ty: number; readonly scara: number }, px: number, py: number): Maner | 'rotire' | null {
  const ex = (x: number): number => v.tx + x * v.scara;
  const ey = (y: number): number => v.ty - y * v.scara;
  if (Math.hypot(px - ex((c.minX + c.maxX) / 2), py - (ey(c.maxY) - ROTIRE_PX)) <= LOVIRE_PX + 1) return 'rotire';
  const vazute = manereVazute((c.maxX - c.minX) * v.scara, (c.maxY - c.minY) * v.scara);
  for (const m of [...vazute.filter((n) => n.length === 2), ...vazute.filter((n) => n.length === 1)]) {
    const q = punctManer(c, m);
    if (Math.abs(px - ex(q.x)) <= LOVIRE_PX && Math.abs(py - ey(q.y)) <= LOVIRE_PX) return m;
  }
  return null;
}
