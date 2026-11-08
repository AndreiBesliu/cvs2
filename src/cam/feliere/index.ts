/**
 * Felierea pieselor plate (ADR 0191), intrarea modulului: piesele (din `piese.ts`), setările (din `profil.ts`), apoi
 * șabloanele straturilor și brim-ul grupului (`straturi.ts`) și G-code-ul (`gcode.ts`). Pură și fără ceas: data antetului
 * vine de la cine cere. Modulul stă în directorul lui și se încarcă la cerere (din dialogul „Din desen…”), fără importuri din
 * nucleu spre el.
 *
 * Înainte de fișier, tot ce se extrudează (piesele, brim-ul) trebuie să stea în patul K1C cu marginea lui (linia de
 * curățare), iar ultimul strat sub înălțimea patului; altfel fișierul nu se face, iar avertismentul spune cât iese.
 */
import { cutieContur, uneste, CUTIE_GOALA } from '../../geom/cutie.ts';
import { felStrat, felStratTrepte } from './fel.ts';
import { scrieGcode, type IesireGcode, type Miniatura } from './gcode.ts';
import { MARGINE_PAT, type PiesaPlata } from './piese.ts';
import { K1C, type SetariFeliere } from './profil.ts';
import { brimGrup, fustaGrup, sablonPiesa, type Cale, type SablonPiesa } from './straturi.ts';
import { benziPiesa } from './trepte.ts';

export { pieseDinDocument, MARGINE_PAT, type OptiuniPiese, type PieseAlese, type PiesaPlata, type SursaFeliere } from './piese.ts';
export type { Treapta } from './trepte.ts';
export {
  CALITATI, K1C, MATERIALE, LIMITE, setariImplicite, setariValide, material, calitate, MODELE_RAR, MODELE_PLIN, CUSATURI, CALCARI,
  MODELE_CALCARE, FUSTE, GROSIMI_VERTICALE, type SetariFeliere, type Brim,
} from './profil.ts';
export { timpText, type Miniatura } from './gcode.ts';
export { citesteFel, puncte, type Cale, type Rol } from './straturi.ts';

export type AvertismentFeliere =
  | { readonly fel: 'subtire'; readonly piesa: string; readonly arie: number }
  | { readonly fel: 'nimic'; readonly piesa: string }
  | { readonly fel: 'eroare'; readonly piesa: string; readonly motiv: string }
  | { readonly fel: 'brim'; readonly motiv: string }
  | { readonly fel: 'fusta'; readonly motiv: string }
  | { readonly fel: 'iese'; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
  | { readonly fel: 'prea-inalta'; readonly z: number };

export type RezultatFeliere = {
  /** Fișierul, sau null dacă nicio piesă nu iese ori ceva iese din pat. */
  readonly gcode: IesireGcode | null;
  /** Piesele care ies, cu brim-ul ales pentru fiecare. */
  readonly piese: readonly PiesaPlata[];
  readonly brim: readonly boolean[];
  readonly avertismente: readonly AvertismentFeliere[];
  /** Căile stratului k (de la 1), în ordinea imprimării, pentru previzualizare. */
  readonly cai: (k: number) => readonly Cale[];
};

/** Brim-ul automat: pentru o piesă îngustă (sub 10 mm pe o latură) sau înaltă față de lățimea ei (peste 1,5 ori). */
export function brimAutomat(p: PiesaPlata): boolean {
  let c = CUTIE_GOALA;
  for (const x of p.contururi) c = uneste(c, cutieContur(x));
  const ingust = Math.min(c.maxX - c.minX, c.maxY - c.minY);
  return ingust < 10 || p.inaltime > 1.5 * ingust;
}

/** Numele fișierului, ca `filename_format` din OrcaSlicer: `<nume>_<material>_<timp>.gcode`, fără spații și diacritice. */
export function numeFisier(nume: string, tip: string, timp: string): string {
  const curat = (x: string): string => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${curat(nume) || 'cvs2'}_${curat(tip)}_${timp.replace(/\s+/g, '')}.gcode`;
}

export function feliaza(piese: readonly PiesaPlata[], s: SetariFeliere, opt: { readonly data: string; readonly miniaturi?: readonly Miniatura[] }): RezultatFeliere {
  const avertismente: AvertismentFeliere[] = [];
  const bune: PiesaPlata[] = [], sabloane: SablonPiesa[] = [], brim: boolean[] = [];
  for (const p of piese) {
    // Benzile (o singură bandă fără trepte), apoi felul fiecărui strat și șablonul.
    const b = benziPiesa(p.contururi, p.trepte ?? [], p.inaltime, s);
    if (typeof b === 'string') { avertismente.push({ fel: 'eroare', piesa: p.eticheta, motiv: b }); continue; }
    const ordine = Array.from({ length: b.n }, (_, i) => (b.regiuni.length === 1 ? felStrat(i + 1, b.n, s) : felStratTrepte(i + 1, b.n, b.inceput, s)));
    const r = sablonPiesa(b.regiuni, s, ordine);
    if (typeof r === 'string') { avertismente.push({ fel: 'eroare', piesa: p.eticheta, motiv: r }); continue; }
    if ([...r.fel.values()].every((c) => c.length === 0)) { avertismente.push({ fel: 'nimic', piesa: p.eticheta }); continue; }
    if (r.subtire > 0) avertismente.push({ fel: 'subtire', piesa: p.eticheta, arie: r.subtire });
    bune.push(p); sabloane.push(r); brim.push(s.brim === 'da' || (s.brim === 'automat' && brimAutomat(p)));
  }
  let caiBrim: Cale[] = [];
  const rb = brimGrup(bune.map((p, i) => ({ contururi: p.contururi, brim: brim[i]! })), s);
  if (typeof rb === 'string') avertismente.push({ fel: 'brim', motiv: rb });
  else caiBrim = rb;
  let caiFusta: Cale[] = [];
  const rf = fustaGrup(sabloane.map((sab) => ({ contur: sab.contur })), caiBrim, s);
  if (typeof rf === 'string') avertismente.push({ fel: 'fusta', motiv: rf });
  else caiFusta = rf;
  // Patul: tot ce se extrudează (piesele, brim-ul, fusta), cu marginea lui; ultimul strat, sub înălțimea lui.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const intinde = (c: Cale): void => { for (let i = 0; i < c.p.length; i += 2) { x0 = Math.min(x0, c.p[i]!); x1 = Math.max(x1, c.p[i]!); y0 = Math.min(y0, c.p[i + 1]!); y1 = Math.max(y1, c.p[i + 1]!); } };
  caiBrim.forEach(intinde);
  caiFusta.forEach(intinde);
  for (const sab of sabloane) for (const cai of sab.fel.values()) cai.forEach(intinde);
  let inPat = true;
  if (bune.length > 0 && (x0 < MARGINE_PAT - 1e-6 || y0 < MARGINE_PAT - 1e-6 || x1 > K1C.pat[0] - MARGINE_PAT + 1e-6 || y1 > K1C.pat[1] - MARGINE_PAT + 1e-6)) {
    avertismente.push({ fel: 'iese', x0, y0, x1, y1 });
    inPat = false;
  }
  const zSus = bune.length === 0 ? 0 : s.strat1 + (Math.max(...sabloane.map((x) => x.ordine.length)) - 1) * s.strat;
  if (zSus > K1C.pat[2] + 1e-9) { avertismente.push({ fel: 'prea-inalta', z: zSus }); inPat = false; }
  const gcode = bune.length === 0 || !inPat ? null
    : scrieGcode({ piese: bune, sabloane, brim: caiBrim, fusta: caiFusta, setari: s, data: opt.data, ...(opt.miniaturi ? { miniaturi: opt.miniaturi } : {}) });
  const plan = gcode?.plan;
  const cai = (k: number): readonly Cale[] => {
    const st = plan?.[k - 1];
    if (!st) return [];
    const fusta = caiFusta.length > 0 && (s.scut || k <= s.inaltimeFusta) ? (k === 1 || !s.oBuclaDupa ? caiFusta : caiFusta.slice(-1)) : [];
    const rez: Cale[] = [...fusta, ...(k === 1 ? caiBrim : [])];
    for (const { i, fel } of st.piese) rez.push(...(sabloane[i]?.fel.get(fel) ?? []));
    return rez;
  };
  return { gcode, piese: bune, brim, avertismente, cai };
}
