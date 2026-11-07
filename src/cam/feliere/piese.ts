/**
 * Piesele plate ale unei felieri (ADR 0191 §A, §B): din foaia documentului, piesele alese (toate instanțele foii, cele
 * selectate sau una singură), fiecare cu formele ei închise, în lume (cubicele ca biarce, ca la CAM). Golurile vin din
 * cuprindere (par-impar), iar formele care se suprapun doar în parte se unesc întâi: o gaură apărută din unire scade ce o
 * suprapune mai târziu. Căile deschise nu se imprimă: se numără. Apoi grupul se centrează pe pat, iar ce nu încape (cu
 * marginea) se refuză, cu mărimea.
 */
import { conturDeTaiat } from '../contur.ts';
import type { Contur } from '../../geom/conturBaza.ts';
import { cutieContur, uneste, CUTIE_GOALA, type Cutie } from '../../geom/cutie.ts';
import { booleanContururi, intersectiiIntre } from '../../geom/offset.ts';
import type { Document } from '../../model/document.ts';
import { elementeFoaie, type ElementLume } from '../../model/lume.ts';

/** Ce se imprimă: piesele foii, cele selectate sau o singură instanță. */
export type SursaFeliere =
  | { readonly fel: 'foaie' }
  | { readonly fel: 'selectie'; readonly ids: readonly string[] }
  | { readonly fel: 'piesa'; readonly id: string };

/** O piesă de imprimat: instanța, numele obiectului pentru imprimantă, formele (în coordonatele patului) și înălțimea. */
export type PiesaPlata = { readonly id: string; readonly nume: string; readonly eticheta: string; readonly contururi: readonly Contur[]; readonly inaltime: number };

/** Marginea patului lăsată liberă pe fiecare latură (mm), până se măsoară linia de curățare a imprimantei (ADR 0191). */
export const MARGINE_PAT = 5;

export type MotivPiesa = 'fara-forme' | 'unire';

export type PieseAlese = {
  readonly piese: readonly PiesaPlata[];
  /** Căile deschise, lăsate deoparte. */
  readonly deschise: number;
  /** Piesele care nu se pot imprima, cu motivul. */
  readonly refuzate: readonly { readonly eticheta: string; readonly motiv: MotivPiesa; readonly detaliu?: string }[];
  /** Mărimea grupului (mm) și dacă încape pe pat, cu marginea. */
  readonly latime: number; readonly adancime: number; readonly incape: boolean;
};

/** Plafonul pașilor de unire ai unei piese: dincolo, refuz cu motiv, nu o buclă lungă. */
/** Cele mai multe forme închise ale unei piese (perechile se judecă întâi după cutii, deci câteva mii trec repede). */
const PLAFON_FORME = 5_000;

const atingere = (a: Cutie, b: Cutie): boolean => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

/**
 * Contururile închise ale unei piese, cu suprapunerile unite. Formele care se ating (direct sau printr-un lanț de alte forme)
 * fac o componentă; în ea, formele se adaugă pe rând, în ordinea lanțului, la o regiune (un exterior cu golurile lui): o
 * formă care atinge exteriorul se unește cu el (golurile închise de unire se adaugă), iar una care intră într-un gol îl
 * micșorează (golul minus forma). O formă care nu atinge nici exteriorul, nici vreun gol, stă în material: nu schimbă nimic.
 * Componentele rămân unele lângă altele, citite par-impar (o componentă cuprinsă în alta e gol). Sau motivul.
 */
export function unesteSuprapuse(intrare: readonly Contur[]): { readonly ok: true; readonly contururi: Contur[] } | { readonly ok: false; readonly motiv: string } {
  const n = intrare.length;
  if (n > PLAFON_FORME) return { ok: false, motiv: 'prea multe forme' };
  const cutii = intrare.map((c) => cutieContur(c));
  const ating = (a: Contur, b: Contur): boolean => atingere(cutieContur(a), cutieContur(b)) && intersectiiIntre(a, b).length > 0;
  const vecini: number[][] = intrare.map(() => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (atingere(cutii[i]!, cutii[j]!) && intersectiiIntre(intrare[i]!, intrare[j]!).length > 0) { vecini[i]!.push(j); vecini[j]!.push(i); }
    }
  }
  const vazut = new Array<boolean>(n).fill(false);
  const rez: Contur[] = [];
  for (let s = 0; s < n; s++) {
    if (vazut[s]) continue;
    const ordine = [s];
    vazut[s] = true;
    for (let k = 0; k < ordine.length; k++) for (const v of vecini[ordine[k]!]!) if (!vazut[v]) { vazut[v] = true; ordine.push(v); }
    let ext = intrare[ordine[0]!]!, gauri: Contur[] = [];
    for (const k of ordine.slice(1)) {
      const c = intrare[k]!;
      const noi: Contur[] = [];
      for (const h of gauri) {
        if (!ating(h, c)) { noi.push(h); continue; }
        const r = booleanContururi(h, c, 'diferenta');
        if (!r.ok) return { ok: false, motiv: r.motiv };
        for (const g of r.regiuni) {
          if (g.gauri.length > 0) return { ok: false, motiv: 'o formă stă întreagă într-un gol' };
          noi.push(g.exterior);
        }
      }
      if (ating(ext, c)) {
        const r = booleanContururi(ext, c, 'reuniune');
        if (!r.ok) return { ok: false, motiv: r.motiv };
        if (r.regiuni.length !== 1) return { ok: false, motiv: `unirea a dat ${r.regiuni.length} regiuni` };
        ext = r.regiuni[0]!.exterior;
        noi.push(...r.regiuni[0]!.gauri);
      }
      gauri = noi;
    }
    rez.push(ext, ...gauri);
  }
  return { ok: true, contururi: rez };
}

/** Numele unui obiect pentru Klipper (`EXCLUDE_OBJECT`): fără diacritice și fără spații, ca la OrcaSlicer (`<nume>_id_<k>_copy_0`). */
export function numeObiect(nume: string, k: number): string {
  const curat = nume.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return `${curat || 'piesa'}_id_${k}_copy_0`;
}

const muta = (c: Contur, dx: number, dy: number): Contur => ({
  inchis: c.inchis,
  varfuri: c.varfuri.map((v) => ({ p: { x: v.p.x + dx, y: v.p.y + dy }, s: v.s.tip === 'C' ? { tip: 'C', c1: { x: v.s.c1.x + dx, y: v.s.c1.y + dy }, c2: { x: v.s.c2.x + dx, y: v.s.c2.y + dy } } : v.s })),
});

/**
 * Piesele alese din foaia 0, cu înălțimea dată, centrate ca grup pe pat (`pat`: lățimea și adâncimea, mm). Instanțele își
 * păstrează așezarea de pe foaie, unele față de altele.
 */
export function pieseDinDocument(doc: Document, sursa: SursaFeliere, inaltime: number, pat: readonly [number, number]): PieseAlese {
  const foaie = doc.foi[0];
  const instante = (foaie?.instante ?? []).filter((i) => sursa.fel === 'foaie' || (sursa.fel === 'selectie' ? sursa.ids.includes(i.id) : i.id === sursa.id));
  const peInstanta = new Map<string, ElementLume[]>();
  for (const e of elementeFoaie(doc, 0)) {
    const x = peInstanta.get(e.instanta);
    if (x) x.push(e); else peInstanta.set(e.instanta, [e]);
  }
  const numePiesa = new Map(doc.piese.map((p) => [p.id, p.nume]));
  let deschise = 0;
  const refuzate: { eticheta: string; motiv: MotivPiesa; detaliu?: string }[] = [];
  const brute: { id: string; eticheta: string; contururi: Contur[] }[] = [];
  instante.forEach((inst, k) => {
    const eticheta = numePiesa.get(inst.piesa) ?? `#${k + 1}`;
    const inchise: Contur[] = [];
    for (const e of peInstanta.get(inst.id) ?? []) {
      const r = conturDeTaiat(e);
      if (!r.ok) continue;
      if (r.contur.inchis) inchise.push(r.contur); else deschise++;
    }
    if (inchise.length === 0) { refuzate.push({ eticheta, motiv: 'fara-forme' }); return; }
    const u = unesteSuprapuse(inchise);
    if (!u.ok) { refuzate.push({ eticheta, motiv: 'unire', detaliu: u.motiv }); return; }
    brute.push({ id: inst.id, eticheta, contururi: u.contururi });
  });
  let cutie = CUTIE_GOALA;
  for (const b of brute) for (const c of b.contururi) cutie = uneste(cutie, cutieContur(c));
  const latime = brute.length === 0 ? 0 : cutie.maxX - cutie.minX, adancime = brute.length === 0 ? 0 : cutie.maxY - cutie.minY;
  const incape = latime <= pat[0] - 2 * MARGINE_PAT && adancime <= pat[1] - 2 * MARGINE_PAT;
  const dx = pat[0] / 2 - (cutie.minX + cutie.maxX) / 2, dy = pat[1] / 2 - (cutie.minY + cutie.maxY) / 2;
  const piese = brute.length === 0 ? [] : brute.map((b, k) => ({
    id: b.id, eticheta: b.eticheta, nume: numeObiect(b.eticheta, k), inaltime, contururi: b.contururi.map((c) => muta(c, dx, dy)),
  }));
  return { piese, deschise, refuzate, latime, adancime, incape };
}
