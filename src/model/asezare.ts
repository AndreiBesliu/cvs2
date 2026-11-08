import type { Document, Foaie, Instanta, Piesa } from './document.ts';
import { materialFoaie } from './foi.ts';
import { idFoaieNoua } from './foiComenzi.ts';
import type { Comanda } from './jurnal.ts';
import { cutieInstanta } from './pieseLegate.ts';

/**
 * „Așază pe foi” (ADR 0210 §3, felia 11.3↑): piesele alese (sau toate de pe foaie) se așază după cutia fiecăreia (cu rotirea
 * ei), din colțul ales, rând cu rând, cu marginea foii și distanța dintre piese pe X și pe Y. Ce nu mai încape trece pe foaia
 * următoare dacă e goală, apoi pe foi noi, ca foaia pe care se așază; o piesă mai mare decât foaia rămâne pe loc. Nicio
 * mărime nu se schimbă. Distanța e cel puțin cea mai mare freză a profilelor exterioare (altfel tăietura unei piese intră în
 * vecina ei): sub ea, refuz. Ordinea (a listei, sau cele mai mari întâi) și rotirea (fără, sau cu 90° când încap mai multe)
 * sunt ale omului (răspunsul 3, „Da, toate”). „Mută și așază la capăt” e aceeași așezare pe altă foaie, după piesele ei.
 * Funcții pure: dau comenzi ale jurnalului, fiecare cu inversa exactă. Vin cu calculul acțiunilor și cu dialogul, la cerere.
 */

export type ColtAsezare = 'stanga-sus' | 'dreapta-sus' | 'stanga-jos' | 'dreapta-jos';

export const COLTURI_ASEZARE: readonly ColtAsezare[] = ['stanga-sus', 'dreapta-sus', 'stanga-jos', 'dreapta-jos'];

export type OptiuniAsezare = {
  readonly colt: ColtAsezare;
  /** Marginea foii, pe X și pe Y (mm). */
  readonly margineX: number;
  readonly margineY: number;
  /** Distanța dintre piese, pe X și pe Y (mm); cel puțin `distantaMinima`. */
  readonly distantaX: number;
  readonly distantaY: number;
  /** `lista`: ordinea listei; `mari`: cele mai mari (după arie) întâi. */
  readonly ordinea: 'lista' | 'mari';
  /** `fara`: rotirea fiecăreia rămâne; `90`: cu 90° în plus, culcate, când așa încap mai multe. */
  readonly rotirea: 'fara' | '90';
};

/** Implicitele (schița, planșa 3): din stânga-sus, marginea 10, distanța 5, ordinea listei, fără rotire. */
export const ASEZARE_IMPLICITA: OptiuniAsezare = {
  colt: 'stanga-sus', margineX: 10, margineY: 10, distantaX: 5, distantaY: 5, ordinea: 'lista', rotirea: 'fara',
};

/** Cel mult atât (mm), la margini și la distanțe: mai mult e o greșeală de tastare. */
export const ASEZARE_MAXIM = 1000;

const EPS = 1e-9;

/** Un număr cu 6 zecimale (micrometrul nu e o unitate a mașinii): fără resturile rotirii (6e-17). */
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6 + 0;

/** Cea mai mare freză a profilelor exterioare ale unei piese (mm), sau 0. */
export function frezaExterioara(p: Piesa): number {
  let d = 0;
  for (const o of p.operatii) if (o.tip === 'profil' && o.latura === 'exterior') d = Math.max(d, o.scula.diametru);
  return d;
}

/** Distanța minimă dintre piesele așezate: cea mai mare freză a profilelor lor exterioare (0 fără profile exterioare). */
export function distantaMinima(doc: Document, ids: readonly string[], idFoaie: string): number {
  const alese = new Set(ids);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  let d = 0;
  for (const i of doc.foi.find((f) => f.id === idFoaie)?.instante ?? []) {
    const p = alese.has(i.id) ? piese.get(i.piesa) : undefined;
    if (p) d = Math.max(d, frezaExterioara(p));
  }
  return d;
}

/** Valorile sunt numere finite, de la 0 la `ASEZARE_MAXIM`, iar alegerile sunt cele cunoscute. */
export function optiuniValide(o: OptiuniAsezare): boolean {
  const n = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= ASEZARE_MAXIM;
  return COLTURI_ASEZARE.includes(o.colt) && n(o.margineX) && n(o.margineY) && n(o.distantaX) && n(o.distantaY)
    && (o.ordinea === 'lista' || o.ordinea === 'mari') && (o.rotirea === 'fara' || o.rotirea === '90');
}

/** Locul unei instanțe așezate: foaia (id-ul unei foi existente, sau a câta foaie nouă, de la 0), locul și rotirea. */
export type LocAsezat = { readonly id: string; readonly foaie: string | number; readonly x: number; readonly y: number; readonly rotire: number };

/**
 * Planul: locurile, în ordinea așezării; piesele mai mari decât foaia (rămân pe loc); câte foi noi, după `dupa`; foaia pe
 * care s-a așezat (`spre`). Refuzurile: nimic de așezat, valori greșite (sau margini care nu lasă loc), distanța sub freză.
 */
export type PlanAsezare =
  | {
    readonly ok: true;
    readonly locuri: readonly LocAsezat[];
    readonly preaMari: readonly string[];
    readonly foiNoi: number;
    readonly dupa: string;
    readonly spre: string;
    readonly rotite: number;
  }
  | { readonly ok: false; readonly motiv: 'nimic' | 'valori' | 'distanta' };

/** O instanță cu orientarea aleasă: mărimea cutiei ei și colțul cutiei față de originea instanței. */
type Bucata = { readonly instanta: Instanta; readonly rotire: number; readonly w: number; readonly h: number; readonly ox: number; readonly oy: number };

/** O piesă rămasă pe foaie, în coordonatele colțului (u spre interior, pe orizontală; v spre interior, pe verticală). */
type Obstacol = { readonly u0: number; readonly v0: number; readonly u1: number; readonly v1: number; readonly gx: number; readonly gy: number };

type FoaieDeUmplut = { readonly id: string | number; readonly W: number; readonly H: number; readonly obstacole: readonly Obstacol[] };

function bucata(piesa: Piesa, i: Instanta, rotire: number): Bucata | null {
  const c = cutieInstanta(piesa, { ...i, x: 0, y: 0, rotire });
  return c ? { instanta: i, rotire, w: c.maxX - c.minX, h: c.maxY - c.minY, ox: c.minX, oy: c.minY } : null;
}

/**
 * Unde ajung instanțele `ids` ale foii `din` (ADR 0210 §3), așezate pe foaia `spre` (implicit chiar `din`): pe ea ocolesc
 * piesele care rămân (la distanța aleasă, și cel puțin cât freza profilului lor exterior), apoi trec pe foile următoare
 * goale, apoi pe foi noi, ca ea. Cu rotirea „90”, varianta cu piesele culcate se alege doar când pune mai multe pe foi
 * (mai puține rămase pe loc, mai puține foi, mai multe pe prima); altfel rămâne cea fără rotire.
 */
export function planAsezare(doc: Document, ids: readonly string[], din: string, opt: OptiuniAsezare, spre: string = din): PlanAsezare {
  if (!optiuniValide(opt)) return { ok: false, motiv: 'valori' };
  const sursa = doc.foi.find((f) => f.id === din);
  const kTinta = doc.foi.findIndex((f) => f.id === spre);
  const tinta = doc.foi[kTinta];
  if (!sursa || !tinta) return { ok: false, motiv: 'nimic' };
  const alese = new Set(ids);
  const instante = sursa.instante.filter((i) => alese.has(i.id));
  if (instante.length === 0) return { ok: false, motiv: 'nimic' };
  const mx = opt.margineX, my = opt.margineY, dx = opt.distantaX, dy = opt.distantaY;
  if (2 * mx >= tinta.stoc.latime || 2 * my >= tinta.stoc.inaltime) return { ok: false, motiv: 'valori' };
  if (Math.min(dx, dy) < distantaMinima(doc, ids, din) - EPS) return { ok: false, motiv: 'distanta' };
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const stanga = opt.colt.startsWith('stanga'), sus = opt.colt.endsWith('sus');

  // Piesele care rămân pe foaia pe care se așază: ocolite, fiecare cu distanța ei (cel puțin freza ei).
  const obstacole = (f: Foaie): Obstacol[] => f.instante.flatMap((i) => {
    if (alese.has(i.id) && f.id === din) return [];
    const p = piese.get(i.piesa);
    const c = p ? cutieInstanta(p, i) : null;
    if (!p || !c) return [];
    const d = frezaExterioara(p), W = f.stoc.latime, H = f.stoc.inaltime;
    return [{
      u0: stanga ? c.minX : W - c.maxX, u1: stanga ? c.maxX : W - c.minX,
      v0: sus ? H - c.maxY : c.minY, v1: sus ? H - c.minY : c.maxY, gx: Math.max(dx, d), gy: Math.max(dy, d),
    }];
  });
  const incape = (b: Bucata | null, W: number, H: number): b is Bucata => b !== null && b.w <= W - 2 * mx + EPS && b.h <= H - 2 * my + EPS;

  const varianta = (roteste: boolean): Extract<PlanAsezare, { ok: true }> => {
    const coada: Bucata[] = [];
    const preaMari: string[] = [];
    const W0 = tinta.stoc.latime, H0 = tinta.stoc.inaltime;
    for (const i of instante) {
      const p = piese.get(i.piesa);
      const b0 = p ? bucata(p, i, i.rotire) : null;
      const b90 = p && roteste ? bucata(p, i, (i.rotire + 90) % 360) : null;
      const a0 = incape(b0, W0, H0), a90 = incape(b90, W0, H0);
      // Culcată (lățimea cel puțin cât înălțimea), când încap amândouă orientările; altfel cea care încape.
      const ales = a0 && a90 ? (b0.h > b0.w + EPS ? b90 : b0) : a0 ? b0 : a90 ? b90 : null;
      if (ales) coada.push(ales);
      else preaMari.push(i.id);
    }
    if (opt.ordinea === 'mari') coada.sort((a, b) => b.w * b.h - a.w * a.h);

    const locuri: LocAsezat[] = [];
    let k = 0;
    // Pe o foaie: rând cu rând, din colț; o piesă care atinge una rămasă sare după ea; un rând fără loc trece sub piesa care
    // l-a oprit. Întoarce prima bucată neașezată.
    const umple = (f: FoaieDeUmplut): void => {
      let u = mx, v = my, rand = 0;
      while (k < coada.length) {
        const b = coada[k];
        if (!b || !incape(b, f.W, f.H)) return;
        if (u + b.w > f.W - mx + EPS) {
          if (rand > 0) v += rand + dy;
          else {
            const oprite = f.obstacole.filter((o) => v < o.v1 + o.gy - EPS && v + b.h > o.v0 - o.gy + EPS).map((o) => o.v1 + o.gy);
            v = oprite.length > 0 ? Math.min(...oprite) : v + Math.max(b.h + dy, 1);
          }
          u = mx;
          rand = 0;
        }
        if (v + b.h > f.H - my + EPS) return;
        const o = f.obstacole.find((x) => u < x.u1 + x.gx - EPS && u + b.w > x.u0 - x.gx + EPS && v < x.v1 + x.gy - EPS && v + b.h > x.v0 - x.gy + EPS);
        if (o) {
          u = o.u1 + o.gx;
          continue;
        }
        const X = stanga ? u : f.W - u - b.w, Y = sus ? f.H - v - b.h : v;
        locuri.push({ id: b.instanta.id, foaie: f.id, x: r6(X - b.ox), y: r6(Y - b.oy), rotire: b.rotire });
        u += b.w + dx;
        rand = Math.max(rand, b.h);
        k++;
      }
    };
    umple({ id: tinta.id, W: tinta.stoc.latime, H: tinta.stoc.inaltime, obstacole: obstacole(tinta) });
    let dupa = tinta.id;
    for (let j = kTinta + 1; j < doc.foi.length && k < coada.length; j++) {
      const f = doc.foi[j];
      if (!f || f.instante.length > 0) break;
      umple({ id: f.id, W: f.stoc.latime, H: f.stoc.inaltime, obstacole: [] });
      dupa = f.id;
    }
    let foiNoi = 0;
    // Pe foi noi, ca foaia țintă: fiecare bucată rămasă încape pe una (cele prea mari au ieșit), deci fiecare foaie ia una.
    for (; k < coada.length; foiNoi++) umple({ id: foiNoi, W: W0, H: H0, obstacole: [] });
    const rotite = locuri.filter((l) => l.rotire !== instante.find((i) => i.id === l.id)?.rotire).length;
    return { ok: true, locuri, preaMari, foiNoi, dupa, spre: tinta.id, rotite };
  };

  const fara = varianta(false);
  if (opt.rotirea === 'fara') return fara;
  const cu = varianta(true);
  const scor = (p: Extract<PlanAsezare, { ok: true }>): number[] => {
    const foi = new Set(p.locuri.map((l) => String(l.foaie))).size;
    return [p.preaMari.length, foi, -p.locuri.filter((l) => l.foaie === tinta.id).length];
  };
  const a = scor(cu), b = scor(fara);
  const k = a.findIndex((x, j) => x !== b[j]);
  return k >= 0 && (a[k] ?? 0) < (b[k] ?? 0) ? cu : fara;
}

/** Câte piese ajung pe fiecare foaie, în ordinea foilor (existente, apoi cele noi): rezumatul dialogului („15 + 10”). */
export function peFoi(plan: Extract<PlanAsezare, { ok: true }>): Array<readonly [string | number, number]> {
  const n = new Map<string | number, number>();
  for (const l of plan.locuri) n.set(l.foaie, (n.get(l.foaie) ?? 0) + 1);
  return [...n.entries()];
}

/**
 * Comenzile planului, într-un pas: întâi foile noi (după `dupa`, ca foaia țintă: mărimea și materialul ei, fără ghidaje),
 * apoi instanțele care rămân pe foaia lor (locul și rotirea), apoi cele care pleacă: scoase de pe foaia lor, în ordinea
 * listei, și puse la capătul foii noi, în ordinea așezării. Piesele nu se ating (o instanță pleacă și vine cu piesa ei).
 */
export function comenziAsezare(doc: Document, din: string, plan: Extract<PlanAsezare, { ok: true }>): Comanda[] {
  const sursa = doc.foi.find((f) => f.id === din);
  const tinta = doc.foi.find((f) => f.id === plan.spre);
  if (!sursa || !tinta) return [];
  const comenzi: Comanda[] = [];
  const foi = [...doc.foi];
  const idsFoi: string[] = [];
  const material = materialFoaie(tinta);
  const pozDupa = foi.findIndex((f) => f.id === plan.dupa);
  for (let k = 0; k < plan.foiNoi; k++) {
    const idF = idFoaieNoua({ ...doc, foi });
    const foaie: Foaie = { id: idF, stoc: { ...tinta.stoc }, instante: [], ...(material === null ? {} : { material }) };
    comenzi.push({ tip: 'adauga-foaie', foaie, pozitie: pozDupa + 1 + k, piese: [] });
    foi.splice(pozDupa + 1 + k, 0, foaie);
    idsFoi.push(idF);
  }
  const vechi = new Map(sursa.instante.map((i) => [i.id, i]));
  const raman = plan.locuri.filter((l) => l.foaie === din);
  for (const l of raman) {
    const i = vechi.get(l.id);
    if (i && (i.x !== l.x || i.y !== l.y || i.rotire !== l.rotire)) comenzi.push({ tip: 'inlocuieste-instanta', foaie: din, vechi: i, nou: { ...i, x: l.x, y: l.y, rotire: l.rotire } });
  }
  const pleaca = plan.locuri.filter((l) => l.foaie !== din);
  const ramase = [...sursa.instante];
  const pleacaIds = new Set(pleaca.map((l) => l.id));
  for (const i of sursa.instante) {
    if (!pleacaIds.has(i.id)) continue;
    const pozitie = ramase.findIndex((x) => x.id === i.id);
    ramase.splice(pozitie, 1);
    comenzi.push({ tip: 'sterge', foaie: din, instanta: i, pozitie });
  }
  const pePas = new Map<string, number>();
  for (const l of pleaca) {
    const idF = typeof l.foaie === 'string' ? l.foaie : idsFoi[l.foaie];
    const f = foi.find((x) => x.id === idF);
    const i = vechi.get(l.id);
    if (!idF || !f || !i) continue;
    const pozitie = f.instante.length + (pePas.get(idF) ?? 0);
    pePas.set(idF, (pePas.get(idF) ?? 0) + 1);
    comenzi.push({ tip: 'adauga', foaie: idF, instanta: { ...i, x: l.x, y: l.y, rotire: l.rotire }, pozitie });
  }
  return comenzi;
}
