/**
 * Reliefurile foii pe planșă (ADR 0310 §7, felia 18.1↑a): pentru fiecare element `relief` din lume, locul imaginii umbrite
 * (centrul, mărimea, rotirea, oglindirea) și cheia desenului (grila și straturile: aceleași straturi, același desen, oricâte
 * instanțe). Ușor, în pornire: verificarea „documentul are relief?” e doar o trecere prin elementele foii; desenul (baza,
 * workerul) vine la cerere, prin `useDesenReliefuri`, doar când foaia are un relief.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ImaginePeFoaie } from '../canvas/protocol.ts';
import type { Matrice } from '../geom/matrice.ts';
import type { Document, FormaRelief } from '../model/document.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { DesenFacut } from './reliefDesenCalcul.ts';

export type { DesenFacut } from './reliefDesenCalcul.ts';

/** Un relief pe foaie: id-ul lui în lume, forma, cheia desenului și locul imaginii umbrite. */
export type ReliefPeFoaie = {
  readonly id: string; readonly forma: FormaRelief; readonly cheie: string;
  readonly x: number; readonly y: number; readonly latime: number; readonly inaltime: number; readonly rotire: number;
  readonly oglindita: boolean;
};

/** Cheia desenului unui relief: grila și straturile (modul, vizibilitatea, harta), în ordine. */
export function cheieDesen(f: FormaRelief): string {
  return JSON.stringify([f.nx, f.ny, f.celula, f.straturi.map((s) => [s.mod, s.vizibil, s.dale])]);
}

/**
 * Locul imaginii umbrite a unui relief cu matricea `m` (o asemănare, ADR 0310 §1): centrul dreptunghiului lui, mărimea,
 * rotirea (grade, trigonometric) și oglindirea (determinantul negativ: întâi oglinda pe orizontala imaginii, apoi rotirea).
 */
export function asezareRelief(f: FormaRelief, m: Matrice): Pick<ReliefPeFoaie, 'x' | 'y' | 'latime' | 'inaltime' | 'rotire' | 'oglindita'> {
  const L = f.nx * f.celula, H = f.ny * f.celula, s = Math.hypot(m.a, m.b), oglindita = m.a * m.d - m.b * m.c < 0;
  const teta = oglindita ? Math.atan2(-m.b, -m.a) : Math.atan2(m.b, m.a);
  return {
    x: m.a * (L / 2) + m.c * (H / 2) + m.e, y: m.b * (L / 2) + m.d * (H / 2) + m.f,
    latime: s * L, inaltime: s * H, rotire: (teta * 180) / Math.PI, oglindita,
  };
}

/** Reliefurile foii `indexFoaie`, în ordinea elementelor (fără niciunul: lista goală, fără alt calcul). */
export function reliefuriFoaie(doc: Document, indexFoaie: number): ReliefPeFoaie[] {
  const r: ReliefPeFoaie[] = [];
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (e.forma.tip !== 'relief') continue;
    r.push({ id: e.idLume, forma: e.forma, cheie: cheieDesen(e.forma), ...asezareRelief(e.forma, e.matrice) });
  }
  return r;
}

const FARA: readonly ImaginePeFoaie[] = [];

/** Pură: imaginile reliefurilor pentru pânză, peste imaginile foii; un desen care lipsește încă arată doar locul, punctat. */
export function imaginiReliefuri(reliefuri: readonly ReliefPeFoaie[], desene: ReadonlyMap<string, DesenFacut | null>): readonly ImaginePeFoaie[] {
  if (reliefuri.length === 0) return FARA;
  return reliefuri.map((r) => {
    const u = desene.get(r.cheie)?.umbrit ?? null;
    return {
      id: r.id, sursa: `relief:${r.cheie}`, x: r.x, y: r.y, latime: r.latime, inaltime: r.inaltime, rotire: r.rotire, opacitate: 1, octeti: null,
      ...(u ? { pixeli: { latime: u.latime, inaltime: u.inaltime, rgba: u.rgba } } : {}),
      ...(r.oglindita ? { oglindita: true } : {}), cuSelectia: true,
    };
  });
}

const GOALA: ReadonlyMap<string, DesenFacut | null> = new Map();

/**
 * Desenele reliefurilor date, după cheie: imaginea umbrită și Z-ul, ori null dacă straturile lipsesc din browser (ori desenul a căzut);
 * ce încă se calculează nu e în hartă. Calculul vine la cerere (`reliefDesenCalcul.ts`: baza și workerul), doar cu un relief
 * pe foaie; un desen făcut rămâne cât stă aplicația deschisă (Ctrl+Z îl poate aduce înapoi), cu un plafon.
 */
export function useDesenReliefuri(reliefuri: readonly ReliefPeFoaie[], jurnal: (e: unknown) => void): ReadonlyMap<string, DesenFacut | null> {
  const [harta, setHarta] = useState(GOALA);
  const lipsa = useMemo(() => {
    const m = new Map<string, FormaRelief>();
    for (const r of reliefuri) if (!harta.has(r.cheie)) m.set(r.cheie, r.forma);
    return m;
  }, [reliefuri, harta]);
  const cheie = [...lipsa.keys()].sort().join('\n');
  const folosite = new Set(reliefuri.map((r) => r.cheie));
  useEffect(() => {
    if (lipsa.size === 0) return undefined;
    let viu = true;
    import('./reliefDesenCalcul.ts').then(async (m) => {
      const facute = await Promise.all([...lipsa].map(async ([k, f]) => [k, await m.deseneazaRelief(f).catch((e: unknown) => { jurnal(e); return null; })] as const));
      if (viu) setHarta((h) => m.cuPlafon(h, facute, folosite));
    }).catch((e: unknown) => { jurnal(e); });
    return () => { viu = false; };
  }, [cheie]);
  return harta;
}
