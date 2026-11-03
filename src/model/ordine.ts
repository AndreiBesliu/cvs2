/**
 * Ordinea de mână a operațiilor (ADR 0133), partea care nu e a lucrării: cum își păstrează o piesă locul când comenzile îi
 * înlocuiesc operațiile și ce stă în interiorul unei operații (riscul din fereastra exportului). Ordinea programului însăși e
 * `ordineTaieturi` (`lume.ts`).
 */
import type { Contur, Punct } from '../geom/conturBaza.ts';
import { cutieContur } from '../geom/cutie.ts';
import { inRegiune } from '../geom/distanta.ts';
import type { Operatie } from './document.ts';

/**
 * Operațiile noi ale unei piese, cu locul ei în ordinea de mână (ADR 0133 §4): fiecare primește rangul operației vechi cu
 * același id, iar una nouă, cel mai mic rang al piesei. O piesă fără rang le lasă fără (ordinea automată).
 */
export function cuRangulPiesei(vechi: readonly Operatie[], noi: readonly Operatie[]): Operatie[] {
  const ranguri = vechi.flatMap((o) => (o.rang !== undefined ? [o.rang] : []));
  if (ranguri.length === 0) return [...noi];
  const minim = ranguri.reduce((a, b) => Math.min(a, b));
  const dupaId = new Map(vechi.map((o) => [o.id, o.rang]));
  return noi.map((o) => ({ ...o, rang: dupaId.get(o.id) ?? minim }));
}

/** Formele unei operații, în lume, cu cheia ei (`<piesă>/<operație>`): contururile ei și primul ei punct (null fără forme). */
export type FormeRand = { readonly cheie: string; readonly piesa: string; readonly contururi: readonly Contur[]; readonly punct: Punct | null };

/**
 * Operațiile altor piese din interiorul fiecărei operații (ADR 0133 §3): cele al căror prim punct stă într-un contur închis al
 * ei, oricare, deci și într-o gaură a ei (tăiată, gaura eliberează ce stă în ea). Un dreptunghi și cercul desenat în el sunt
 * piese separate, dar cercul e tot pe placa decupată de dreptunghi. Punctele stau sortate după x, deci un contur vede doar
 * punctele din fâșia cutiei lui. Bugetul (vârfurile contururilor măsurate) oprește cazurile patologice: peste el, cuprinderile
 * rămase nu se mai caută, iar riscul rămâne doar cel al aceleiași piese.
 */
export function cuprinse(randuri: readonly FormeRand[], buget = 5_000_000): Map<string, string[]> {
  const puncte = randuri.flatMap((r) => (r.punct ? [{ cheie: r.cheie, piesa: r.piesa, p: r.punct }] : [])).sort((a, b) => a.p.x - b.p.x);
  const rez = new Map<string, string[]>();
  let ramas = buget;
  for (const r of randuri) {
    const gasite = new Set<string>();
    for (const c of r.contururi) {
      if (!c.inchis) continue;
      const k = cutieContur(c);
      let jos = 0, sus = puncte.length;
      while (jos < sus) {
        const m = (jos + sus) >> 1;
        if ((puncte[m]?.p.x ?? Infinity) < k.minX) jos = m + 1;
        else sus = m;
      }
      for (let i = jos; i < puncte.length; i++) {
        const x = puncte[i];
        if (!x || x.p.x > k.maxX) break;
        if (x.piesa === r.piesa || gasite.has(x.cheie) || x.p.y < k.minY || x.p.y > k.maxY) continue;
        ramas -= c.varfuri.length;
        if (ramas < 0) return rez;
        if (inRegiune(x.p, [c])) gasite.add(x.cheie);
      }
    }
    if (gasite.size > 0) rez.set(r.cheie, [...gasite]);
  }
  return rez;
}
