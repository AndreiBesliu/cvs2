import { plineClosed, plineOpen, type Polyline } from './cavalier/index.ts';
import { LINIE, arc, inSensTrigonometric, type Contur, type Varf } from './contur.ts';

/**
 * Offsetul (T5, ADR 0005): cavalier_contours, adus în repo în `cavalier/`. Arcele rămân arce. Orice eșec iese ca motiv
 * scris, niciodată ca traseu tăcut. Gărzile de intrare și de ieșire vin în etapa 2; aici intră doar forme curate.
 */
export type RezultatOffset =
  | { readonly ok: true; readonly contururi: readonly Contur[] }
  | { readonly ok: false; readonly motiv: string };

function laCavalier(c: Contur): Polyline {
  const v: Array<[number, number, number]> = c.varfuri.map((varf) => {
    if (varf.s.tip === 'C') throw new Error('cubicele intră în offset doar ca biarce (T6, etapa 2)');
    return [varf.p.x, varf.p.y, varf.s.tip === 'A' ? varf.s.bulge : 0];
  });
  return c.inchis ? plineClosed(v) : plineOpen(v);
}

function dinCavalier(pl: Polyline): Contur {
  const varfuri: Varf[] = [];
  for (let i = 0; i < pl.vertexCount; i++) {
    const v = pl.at(i);
    varfuri.push({ p: { x: v.x, y: v.y }, s: v.bulge === 0 ? LINIE : arc(v.bulge) });
  }
  return { inchis: pl.isClosed, varfuri };
}

/**
 * Offsetul unui contur închis, spre exterior (`distanta` > 0) sau spre interior (`distanta` < 0). Conturul se aduce
 * întâi în sens trigonometric, ca semnul să însemne același lucru pentru orice intrare.
 */
export function offsetInchis(contur: Contur, distanta: number): RezultatOffset {
  if (!contur.inchis) return { ok: false, motiv: 'offsetul exterior / interior cere un contur închis' };
  if (!Number.isFinite(distanta)) return { ok: false, motiv: `distanța offsetului nu e un număr finit (${distanta})` };
  if (distanta === 0) return { ok: true, contururi: [contur] };
  let rezultat: Polyline[];
  try {
    // cavalier: pe un contur trigonometric, distanța pozitivă merge spre interior.
    rezultat = laCavalier(inSensTrigonometric(contur)).parallelOffset(-distanta);
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (rezultat.length === 0) {
    return { ok: false, motiv: distanta < 0 ? 'scula nu încape: offsetul interior dispare' : 'offsetul exterior n-a dat niciun contur' };
  }
  return { ok: true, contururi: rezultat.map(dinCavalier) };
}
