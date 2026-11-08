/**
 * Piesele plate ale unei felieri (ADR 0191 §A, §B): din foaia documentului, piesele alese (toate instanțele foii, cele
 * selectate sau una singură), fiecare cu formele ei închise, în lume (cubicele ca biarce, ca la CAM). Golurile vin din
 * cuprindere (par-impar), iar formele care se suprapun doar în parte se unesc întâi: o gaură apărută din unire scade ce o
 * suprapune mai târziu. Căile deschise nu se imprimă: se numără. Apoi grupul se centrează pe pat, iar ce nu încape (cu
 * marginea) se refuză, cu mărimea.
 *
 * „După CNC” (felia 3.6l, `dupaCnc.ts`): fiecare instanță, cum o lasă freza, din operațiile ei (marginea din profilele prin tot,
 * buzunarele, găuririle și profilele parțiale ca trepte), nu din formele desenate. Înălțimea poate fi a fiecărei piese.
 */
import { conturDeTaiat } from '../contur.ts';
import { formeDupaCnc } from './dupaCnc.ts';
import type { Treapta } from './trepte.ts';
import type { Contur } from '../../geom/conturBaza.ts';
import { cutieContur, uneste, CUTIE_GOALA, type Cutie } from '../../geom/cutie.ts';
import { arieCuSemn } from '../../geom/contur.ts';
import { inRegiune } from '../../geom/distanta.ts';
import { booleanContururi, intersectiiIntre, type RegiuneBoolean } from '../../geom/offset.ts';
import type { Document } from '../../model/document.ts';
import { elementeFoaie, taieturiFoaie, type ElementLume, type Taietura } from '../../model/lume.ts';

/** Ce se imprimă: piesele foii, cele selectate sau o singură instanță. */
export type SursaFeliere =
  | { readonly fel: 'foaie' }
  | { readonly fel: 'selectie'; readonly ids: readonly string[] }
  | { readonly fel: 'piesa'; readonly id: string };

/**
 * O piesă de imprimat: instanța, numele obiectului pentru imprimantă, formele (în coordonatele patului, par-impar), înălțimea
 * și, la o piesă „după CNC”, treptele (zonele care se opresc mai jos; golurile prin tot sunt deja în forme).
 */
export type PiesaPlata = {
  readonly id: string; readonly nume: string; readonly eticheta: string; readonly contururi: readonly Contur[]; readonly inaltime: number;
  readonly trepte?: readonly Treapta[];
};

/** Marginea patului lăsată liberă pe fiecare latură (mm), până se măsoară linia de curățare a imprimantei (ADR 0191). */
export const MARGINE_PAT = 5;

/** `fara-margine`: după CNC, niciun profil exterior prin tot nu decupează piesa; `cnc`: tăieturile ei nu se pot citi (detaliul). */
export type MotivPiesa = 'fara-forme' | 'unire' | 'prea-multe' | 'fara-margine' | 'cnc';

export type PieseAlese = {
  readonly piese: readonly PiesaPlata[];
  /** Căile deschise, lăsate deoparte. */
  readonly deschise: number;
  /** După CNC: tăieturile în V (V-carve, gravura cu freza în V), care nu se imprimă. */
  readonly vcarve: number;
  /** Piesele care nu se pot imprima, cu motivul. */
  readonly refuzate: readonly { readonly eticheta: string; readonly motiv: MotivPiesa; readonly detaliu?: string }[];
  /** Mărimea grupului (mm) și dacă încape pe pat, cu marginea. */
  readonly latime: number; readonly adancime: number; readonly incape: boolean;
};

/** Cele mai multe forme închise ale unei piese (perechile se judecă întâi după cutii, deci câteva mii trec repede). */
const PLAFON_FORME = 5_000;
const PREA_MULTE = 'prea multe forme';
/** Regiunile booleanului fără cele de arie (aproape) zero, ca latura comună a două forme lipite. */
const faraArieZero = (r: readonly RegiuneBoolean[]): RegiuneBoolean[] =>
  r.filter((g) => Math.abs(arieCuSemn(g.exterior)) > 1e-6).map((g) => ({ exterior: g.exterior, gauri: g.gauri.filter((h) => Math.abs(arieCuSemn(h)) > 1e-6) }));

const atingere = (a: Cutie, b: Cutie): boolean => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

/**
 * Contururile închise ale unei piese, cu suprapunerile unite. Formele care se ating (direct sau printr-un lanț de alte forme)
 * fac o componentă; în ea, formele se adaugă pe rând, în ordinea lanțului, la o regiune (un exterior cu golurile lui): o
 * formă care atinge exteriorul se unește cu el (golurile închise de unire se adaugă), iar una care intră într-un gol îl
 * micșorează (golul minus forma). Fără atingere, contează cuprinderea: un gol cuprins întreg de formă dispare, o formă care
 * cuprinde tot exteriorul devine exteriorul, o formă dintr-un gol rămâne insulă, iar una din material nu schimbă nimic. Așa,
 * ordinea în care s-au desenat formele nu schimbă rezultatul. Regiunile de arie zero (latura comună a două forme lipite) se
 * lasă deoparte. Componentele rămân unele lângă altele, citite par-impar (o componentă cuprinsă în alta e gol). Sau motivul.
 */
export function unesteSuprapuse(intrare: readonly Contur[]): { readonly ok: true; readonly contururi: Contur[] } | { readonly ok: false; readonly motiv: string } {
  const n = intrare.length;
  if (n > PLAFON_FORME) return { ok: false, motiv: PREA_MULTE };
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
    let ext = intrare[ordine[0]!]!, gauri: Contur[] = [], insule: Contur[] = [];
    const inC = (a: Contur, b: Contur): boolean => inRegiune(a.varfuri[0]!.p, [b]);
    for (const k of ordine.slice(1)) {
      const c = intrare[k]!;
      let noi: Contur[] = [];
      let atinsGol = false;
      for (const h of gauri) {
        if (ating(h, c)) {
          atinsGol = true;
          const r = booleanContururi(h, c, 'diferenta');
          if (!r.ok) return { ok: false, motiv: r.motiv };
          for (const g of faraArieZero(r.regiuni)) {
            if (g.gauri.length > 0) return { ok: false, motiv: 'o formă stă întreagă într-un gol' };
            noi.push(g.exterior);
          }
        } else if (inC(h, c)) atinsGol = true; // golul, acoperit întreg de formă: dispare
        else noi.push(h);
      }
      if (ating(ext, c)) {
        const r = booleanContururi(ext, c, 'reuniune');
        if (!r.ok) return { ok: false, motiv: r.motiv };
        const g = faraArieZero(r.regiuni);
        if (g.length !== 1) return { ok: false, motiv: `unirea a dat ${g.length} regiuni` };
        ext = g[0]!.exterior;
        noi.push(...g[0]!.gauri);
      } else if (inC(ext, c)) {
        // Forma cuprinde tot exteriorul: ea e acum exteriorul, iar golurile și insulele de dinăuntru sunt acoperite.
        ext = c; noi = []; insule = [];
      } else if (!atinsGol && gauri.some((h) => inC(c, h))) insule.push(c);
      gauri = noi;
    }
    rez.push(ext, ...gauri, ...insule);
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

/** Cum se citesc piesele: după CNC (din operații) și înălțimea fiecărei piese a documentului (după id; lipsa: cea dată). */
export type OptiuniPiese = { readonly dupaCnc?: boolean; readonly inaltimi?: ReadonlyMap<string, number> };

/**
 * Piesele alese din foaia 0, cu înălțimea dată, centrate ca grup pe pat (`pat`: lățimea și adâncimea, mm). Instanțele își
 * păstrează așezarea de pe foaie, unele față de altele.
 */
export function pieseDinDocument(doc: Document, sursa: SursaFeliere, inaltime: number, pat: readonly [number, number], opt: OptiuniPiese = {}): PieseAlese {
  const foaie = doc.foi[0];
  const instante = (foaie?.instante ?? []).filter((i) => sursa.fel === 'foaie' || (sursa.fel === 'selectie' ? sursa.ids.includes(i.id) : i.id === sursa.id));
  const peInstanta = new Map<string, ElementLume[]>();
  for (const e of elementeFoaie(doc, 0)) {
    const x = peInstanta.get(e.instanta);
    if (x) x.push(e); else peInstanta.set(e.instanta, [e]);
  }
  const numePiesa = new Map(doc.piese.map((p) => [p.id, p.nume]));
  // După CNC: tăieturile foii, o singură dată, pe instanțe.
  const taieturi = new Map<string, Taietura[]>();
  if (opt.dupaCnc) for (const t of taieturiFoaie(doc, 0)) { const x = taieturi.get(t.instanta); if (x) x.push(t); else taieturi.set(t.instanta, [t]); }
  const G = foaie?.stoc.grosime ?? inaltime;
  let deschise = 0, vcarve = 0;
  const refuzate: { eticheta: string; motiv: MotivPiesa; detaliu?: string }[] = [];
  const brute: { id: string; eticheta: string; contururi: Contur[]; inaltime: number; trepte?: readonly Treapta[] }[] = [];
  // Eticheta unei piese fără nume: numărul instanței pe foaie (ca în lista dialogului), nu în alegere.
  const toateInst = foaie?.instante ?? [];
  instante.forEach((inst) => {
    const eticheta = numePiesa.get(inst.piesa) ?? `#${toateInst.indexOf(inst) + 1}`;
    const H = opt.inaltimi?.get(inst.piesa) ?? inaltime;
    if (opt.dupaCnc) {
      const f = formeDupaCnc(taieturi.get(inst.id) ?? [], G, H);
      if (!f.ok) { refuzate.push({ eticheta, motiv: f.motiv, ...(f.detaliu === undefined ? {} : { detaliu: f.detaliu }) }); return; }
      vcarve += f.vcarve;
      brute.push({ id: inst.id, eticheta, contururi: [...f.contururi], inaltime: H, ...(f.trepte.length > 0 ? { trepte: f.trepte } : {}) });
      return;
    }
    const inchise: Contur[] = [];
    for (const e of peInstanta.get(inst.id) ?? []) {
      const r = conturDeTaiat(e);
      if (!r.ok) continue;
      if (r.contur.inchis) inchise.push(r.contur); else deschise++;
    }
    if (inchise.length === 0) { refuzate.push({ eticheta, motiv: 'fara-forme' }); return; }
    const u = unesteSuprapuse(inchise);
    if (!u.ok) { refuzate.push(u.motiv === PREA_MULTE ? { eticheta, motiv: 'prea-multe' } : { eticheta, motiv: 'unire', detaliu: u.motiv }); return; }
    brute.push({ id: inst.id, eticheta, contururi: u.contururi, inaltime: H });
  });
  let cutie = CUTIE_GOALA;
  for (const b of brute) for (const c of b.contururi) cutie = uneste(cutie, cutieContur(c));
  const latime = brute.length === 0 ? 0 : cutie.maxX - cutie.minX, adancime = brute.length === 0 ? 0 : cutie.maxY - cutie.minY;
  const incape = latime <= pat[0] - 2 * MARGINE_PAT && adancime <= pat[1] - 2 * MARGINE_PAT;
  const dx = pat[0] / 2 - (cutie.minX + cutie.maxX) / 2, dy = pat[1] / 2 - (cutie.minY + cutie.maxY) / 2;
  const piese = brute.length === 0 ? [] : brute.map((b, k): PiesaPlata => ({
    id: b.id, eticheta: b.eticheta, nume: numeObiect(b.eticheta, k), inaltime: b.inaltime, contururi: b.contururi.map((c) => muta(c, dx, dy)),
    ...(b.trepte ? { trepte: b.trepte.map((t) => ({ inaltime: t.inaltime, contururi: t.contururi.map((c) => muta(c, dx, dy)) })) } : {}),
  }));
  return { piese, deschise, vcarve, refuzate, latime, adancime, incape };
}
