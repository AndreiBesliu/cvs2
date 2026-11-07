/**
 * Felierea pieselor plate (ADR 0191), intrarea modulului: piesele (din `piese.ts`), setările (din `profil.ts`), apoi
 * șabloanele straturilor (`straturi.ts`) și G-code-ul (`gcode.ts`). Pură și fără ceas: data antetului vine de la cine
 * cere. Modulul stă în directorul lui și se încarcă la cerere (din dialogul „Din desen…”), fără importuri din nucleu spre el.
 */
import { cutieContur, uneste, CUTIE_GOALA } from '../../geom/cutie.ts';
import { felStrat, numarStraturi, scrieGcode, type IesireGcode, type Miniatura } from './gcode.ts';
import type { PiesaPlata } from './piese.ts';
import type { SetariFeliere } from './profil.ts';
import { sablonPiesa, type Cale, type FelStrat, type SablonPiesa } from './straturi.ts';

export { pieseDinDocument, MARGINE_PAT, type PieseAlese, type PiesaPlata, type SursaFeliere } from './piese.ts';
export { CALITATI, K1C, MATERIALE, LIMITE, setariImplicite, setariValide, material, calitate, type SetariFeliere, type Brim } from './profil.ts';
export { timpText, type Miniatura } from './gcode.ts';
export { puncte, type Cale, type Rol } from './straturi.ts';

export type AvertismentFeliere =
  | { readonly fel: 'subtire'; readonly piesa: string; readonly arie: number }
  | { readonly fel: 'nimic'; readonly piesa: string }
  | { readonly fel: 'eroare'; readonly piesa: string; readonly motiv: string };

export type RezultatFeliere = {
  /** Fișierul, sau null dacă nicio piesă nu iese. */
  readonly gcode: IesireGcode | null;
  /** Piesele care ies, cu brim-ul ales pentru fiecare. */
  readonly piese: readonly PiesaPlata[];
  readonly brim: readonly boolean[];
  readonly avertismente: readonly AvertismentFeliere[];
  /** Căile stratului k (de la 1), în ordinea imprimării pe piesă, pentru previzualizare. */
  readonly cai: (k: number) => readonly Cale[];
};

/** Brim-ul automat: pentru o piesă îngustă (sub 10 mm pe o latură) sau înaltă față de lățimea ei (peste 1,5 ori). */
export function brimAutomat(p: PiesaPlata): boolean {
  let c = CUTIE_GOALA;
  for (const x of p.contururi) c = uneste(c, cutieContur(x));
  const ingust = Math.min(c.maxX - c.minX, c.maxY - c.minY);
  return ingust < 10 || p.inaltime > 1.5 * ingust;
}

export function feliaza(piese: readonly PiesaPlata[], s: SetariFeliere, opt: { readonly data: string; readonly miniaturi?: readonly Miniatura[] }): RezultatFeliere {
  const avertismente: AvertismentFeliere[] = [];
  const bune: PiesaPlata[] = [], sabloane: SablonPiesa[] = [], brim: boolean[] = [];
  for (const p of piese) {
    const n = numarStraturi(p.inaltime, s);
    const feluri = new Set<FelStrat>();
    for (let k = 1; k <= n; k++) feluri.add(felStrat(k, n, s));
    const b = s.brim === 'da' || (s.brim === 'automat' && brimAutomat(p));
    const r = sablonPiesa(p.contururi, s, feluri, b);
    if (typeof r === 'string') { avertismente.push({ fel: 'eroare', piesa: p.eticheta, motiv: r }); continue; }
    if ([...r.fel.values()].every((c) => c.length === 0)) { avertismente.push({ fel: 'nimic', piesa: p.eticheta }); continue; }
    if (r.subtire > 0) avertismente.push({ fel: 'subtire', piesa: p.eticheta, arie: r.subtire });
    bune.push(p); sabloane.push(r); brim.push(b);
  }
  const gcode = bune.length === 0 ? null : scrieGcode({ piese: bune, sabloane, brim, setari: s, data: opt.data, ...(opt.miniaturi ? { miniaturi: opt.miniaturi } : {}) });
  const cai = (k: number): readonly Cale[] => {
    const st = gcode?.plan[k - 1];
    if (!st) return [];
    const rez: Cale[] = [];
    if (k === 1) sabloane.forEach((x, i) => { if (brim[i]) rez.push(...x.brim); });
    for (const { i, fel } of st.piese) rez.push(...(sabloane[i]?.fel.get(fel) ?? []));
    return rez;
  };
  return { gcode, piese: bune, brim, avertismente, cai };
}
