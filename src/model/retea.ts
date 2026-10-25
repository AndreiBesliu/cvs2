/**
 * Copierea în rețea (ADR 0061), partea pură: unde stau copiile unei selecții. Două feluri:
 * - **grila**: `coloane` × `randuri` (cu originalul în colțul stânga-jos), la pasul cutiei selecției plus spațiul dintre
 *   copii, spre dreapta și în sus;
 * - **cercul**: `numar` de copii (cu originalul) în jurul unui centru, pe `unghi` grade (360: cercul întreg, pas egal; mai
 *   puțin: capetele incluse), cu sau fără rotirea copiilor (fără: fiecare copie doar se mută, cu centrul cutiei pe cerc).
 * - **curba** (ADR 0066): `numar` de copii la distanțe egale pe o curbă aleasă (`curba`, o instanță a selecției), cu sau fără
 *   rotirea după tangentă; originalele rămân. Locurile le dă `src/model/curba.ts` (au nevoie de document). Poziția față de
 *   curbă (ADR 0074 §3): centrul pe curbă (mutat cu `distanta` spre stânga mersului), sau formele lângă ea, la stânga ori la
 *   dreapta, cu marginea cea mai apropiată la `distanta` de tangentă (0: tangente).
 * O copie e o mișcare rigidă: rotirea cu `unghi` în jurul lui `centru`, apoi translația (`dx`, `dy`).
 */
import type { Cutie } from '../geom/cutie.ts';
import { rotatie } from '../geom/matrice.ts';

export type Punct = { readonly x: number; readonly y: number };

export type Retea =
  | { readonly fel: 'grila'; readonly coloane: number; readonly randuri: number; readonly spatiuX: number; readonly spatiuY: number }
  | { readonly fel: 'cerc'; readonly numar: number; readonly centru: Punct; readonly unghi: number; readonly roteste: boolean }
  | {
    readonly fel: 'curba'; readonly curba: string; readonly numar: number; readonly roteste: boolean;
    readonly pozitie?: PozitieCurba; readonly distanta?: number;
  };

/** Unde stau copiile față de curbă: cu centrul pe ea, sau lângă ea, la stânga ori la dreapta mersului ei. */
export type PozitieCurba = 'centru' | 'stanga' | 'dreapta';

export type CopieRetea = { readonly unghi: number; readonly centru: Punct; readonly dx: number; readonly dy: number };

/** Cel mult atâtea forme în rețea, cu originalul (plafonul documentului poate refuza și mai devreme). */
export const RETEA_MAXIM = 1000;
/** Latura și spațiile, în mm (cât foaia cea mai mare). */
const MAXIM_MM = 10_000;

export type MotivRetea = 'grila' | 'spatiu' | 'numar' | 'unghi' | 'centru' | 'copii' | 'curba' | 'distanta-curba';

const intreg = (n: number, de: number, la: number): boolean => Number.isInteger(n) && n >= de && n <= la;

/** De ce rețeaua nu se poate face (valorile ei), sau `null`. */
export function motivRetea(r: Retea): MotivRetea | null {
  if (r.fel === 'grila') {
    if (!intreg(r.coloane, 1, 100) || !intreg(r.randuri, 1, 100) || r.coloane * r.randuri < 2 || r.coloane * r.randuri > RETEA_MAXIM) return 'grila';
    if (![r.spatiuX, r.spatiuY].every((s) => Number.isFinite(s) && s >= 0 && s <= MAXIM_MM)) return 'spatiu';
    return null;
  }
  if (r.fel === 'curba') {
    if (r.curba === '') return 'curba';
    if (!intreg(r.numar, 1, RETEA_MAXIM)) return 'copii';
    return r.distanta === undefined || (Number.isFinite(r.distanta) && Math.abs(r.distanta) <= MAXIM_MM) ? null : 'distanta-curba';
  }
  if (!intreg(r.numar, 2, 360)) return 'numar';
  if (!(Number.isFinite(r.unghi) && r.unghi > 0 && r.unghi <= 360)) return 'unghi';
  if (![r.centru.x, r.centru.y].every((v) => Number.isFinite(v) && Math.abs(v) <= 1_000_000)) return 'centru';
  return null;
}

/**
 * Copiile rețelei (fără original), pentru o selecție cu cutia `c`; rețeaua trebuie să fie validă (`motivRetea`). Curba își are
 * copiile din document (`copiiPeCurba`), deci aici nu dă nimic.
 */
export function copiiRetea(c: Cutie, r: Retea): CopieRetea[] {
  const out: CopieRetea[] = [];
  if (r.fel === 'curba') return out;
  const zero = { x: 0, y: 0 };
  if (r.fel === 'grila') {
    const pasX = c.maxX - c.minX + r.spatiuX, pasY = c.maxY - c.minY + r.spatiuY;
    for (let j = 0; j < r.randuri; j++) {
      for (let i = 0; i < r.coloane; i++) if (i > 0 || j > 0) out.push({ unghi: 0, centru: zero, dx: i * pasX, dy: j * pasY });
    }
    return out;
  }
  const pas = r.unghi >= 360 ? 360 / r.numar : r.unghi / (r.numar - 1);
  const b = { x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2 };
  for (let k = 1; k < r.numar; k++) {
    const unghi = k * pas;
    if (r.roteste) out.push({ unghi, centru: r.centru, dx: 0, dy: 0 });
    else {
      const q = punctRotit(b, r.centru, unghi);
      out.push({ unghi: 0, centru: zero, dx: q.x - b.x, dy: q.y - b.y });
    }
  }
  return out;
}

/** Punctul `p` rotit cu `unghi` grade (trigonometric) în jurul lui `c` (exact la multiplii de 90°). */
function punctRotit(p: Punct, c: Punct, unghi: number): Punct {
  const m = rotatie(unghi), x = p.x - c.x, y = p.y - c.y;
  return { x: c.x + m.a * x + m.c * y, y: c.y + m.b * x + m.d * y };
}

/** Un punct al lumii, mutat de copie (pentru previzualizare: colțurile cutiei). */
export function punctulCopiei(p: Punct, k: CopieRetea): Punct {
  const q = k.unghi === 0 ? p : punctRotit(p, k.centru, k.unghi);
  return { x: q.x + k.dx, y: q.y + k.dy };
}

/** Poziția și rotirea instanței copiate: originea ei mutată ca orice punct, rotirea crescută cu unghiul copiei. */
export function instantaCopiei(i: { readonly x: number; readonly y: number; readonly rotire: number }, k: CopieRetea): { x: number; y: number; rotire: number } {
  const p = punctulCopiei(i, k);
  const r = (((i.rotire + k.unghi) % 360) + 360) % 360;
  return { x: p.x, y: p.y, rotire: r };
}
