import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { copieArbore, idNou } from './copii.ts';
import type { Document, Foaie, Instanta, Piesa } from './document.ts';
import { materialFoaie } from './foi.ts';
import { idFoaieNoua } from './foiComenzi.ts';
import { cutieElement } from './forme.ts';
import type { Comanda } from './jurnal.ts';
import { elementeInstanta, matriceInstanta } from './lume.ts';

/**
 * Piesele puse de mai multe ori (ADR 0210 §2, felia 11.2↑): instanțele legate ale aceleiași piese. «Încă…» și «+1» pun
 * instanțe noi ale piesei, pe rânduri după una aleasă, cu vărsarea pe foaia următoare dacă e goală, apoi pe foi noi, ca foaia
 * ei (§3); «Desprinde» dă unei instanțe o piesă a ei; „Duplică foaia cu aceleași piese” face o foaie cu instanțe ale acelorași
 * piese. Funcții pure: dau comenzi ale jurnalului, fiecare cu inversa exactă. Vin cu calculul acțiunilor, la cerere.
 */

/** Marginea foii la «Încă…» și «+1», în mm (ca în proba din prag, §3). */
export const MARGINE_COPII = 10;
/** Distanța dintre copii, în mm: cel puțin atât, și cel puțin cea mai mare freză a profilelor exterioare ale piesei. */
export const DISTANTA_COPII = 5;
/** Cât poate cere «Încă…» în total (o piesă de mii de ori se face cu „Așază pe foi” și cu plăcuțele din CSV). */
export const INCA_MAXIM = 1000;

const EPS = 1e-9;

/** Câte instanțe are fiecare piesă, în tot proiectul. */
export function folosiri(doc: Document): Map<string, number> {
  const n = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) n.set(i.piesa, (n.get(i.piesa) ?? 0) + 1);
  return n;
}

/** Locul unei instanțe în proiect: foaia (indicele ei) și instanța. */
export type LocInstanta = { readonly foaie: number; readonly instanta: Instanta };

/** Instanța cu id-ul dat, oriunde ar fi. */
export function gasesteInstanta(doc: Document, id: string): LocInstanta | null {
  for (const [k, f] of doc.foi.entries()) {
    const i = f.instante.find((x) => x.id === id);
    if (i) return { foaie: k, instanta: i };
  }
  return null;
}

/** Instanțele unei piese, în ordinea proiectului: foile în ordinea listei, apoi instanțele fiecăreia. */
export function instantePiesei(doc: Document, idPiesa: string): LocInstanta[] {
  return doc.foi.flatMap((f, k) => f.instante.filter((i) => i.piesa === idPiesa).map((instanta) => ({ foaie: k, instanta })));
}

/** Cutia unei instanțe (cu rotirea ei), în mm ai foii ei; null pentru o piesă fără elemente. */
export function cutieInstanta(piesa: Piesa, i: Instanta): Cutie | null {
  let c = CUTIE_GOALA;
  for (const e of elementeInstanta(piesa.radacina, i, matriceInstanta(i))) c = uneste(c, cutieElement(e));
  return Number.isFinite(c.minX) ? c : null;
}

/** Distanța dintre copii (mm): `DISTANTA_COPII`, sau cea mai mare freză a profilelor exterioare (altfel una ar tăia în vecina ei). */
export function distantaCopii(piesa: Piesa): number {
  let d = DISTANTA_COPII;
  for (const o of piesa.operatii) if (o.tip === 'profil' && o.latura === 'exterior') d = Math.max(d, o.scula.diametru);
  return d;
}

/**
 * Locurile copiilor: foaia (id-ul unei foi existente, sau a câta foaie nouă, de la 0) și locul instanței (x, y, ca al
 * celei alese, cu aceeași rotire). `dupa`: foaia după care vin foile noi.
 */
export type PlanCopii =
  | {
    readonly ok: true;
    readonly locuri: ReadonlyArray<{ readonly foaie: string | number; readonly x: number; readonly y: number }>;
    readonly foiNoi: number;
    readonly dupa: string;
  }
  | { readonly ok: false; readonly motiv: 'prea-mare' | 'nimic' };

/** Două cutii la mai puțin de `d` una de alta (se ating, se suprapun sau stau prea aproape). */
const preaAproape = (a: Cutie, b: Cutie, d: number): boolean =>
  a.minX < b.maxX + d - EPS && a.maxX > b.minX - d + EPS && a.minY < b.maxY + d - EPS && a.maxY > b.minY - d + EPS;

/**
 * Unde ajung `cate` copii ale instanței `id` (ADR 0210 §2, §3): întâi pe rândul ei, la dreapta ei, apoi pe rândurile de
 * dedesubt, de la marginea din stânga; fiecare rând coboară cu înălțimea cutiei plus distanța. Un loc care ar atinge o piesă
 * de pe foaie (la mai puțin de distanță) se sare. Ce nu încape trece pe foaia următoare dacă e goală (de sus, din stânga),
 * apoi pe foi noi, ca foaia ei. Cutia copiei e cea a instanței, cu rotirea ei; marginea foii, `MARGINE_COPII`.
 */
export function planCopii(doc: Document, id: string, cate: number): PlanCopii {
  const loc = gasesteInstanta(doc, id);
  const sursa = loc ? doc.foi[loc.foaie] : undefined;
  const piesa = loc ? doc.piese.find((p) => p.id === loc.instanta.piesa) : undefined;
  const c0 = piesa && loc ? cutieInstanta(piesa, loc.instanta) : null;
  if (!loc || !sursa || !piesa || !c0 || !(cate > 0)) return { ok: false, motiv: 'nimic' };
  const w = c0.maxX - c0.minX, h = c0.maxY - c0.minY;
  const ox = c0.minX - loc.instanta.x, oy = c0.minY - loc.instanta.y;
  const d = distantaCopii(piesa), m = MARGINE_COPII;
  const incape = (f: Foaie): boolean => w <= f.stoc.latime - 2 * m + EPS && h <= f.stoc.inaltime - 2 * m + EPS;
  if (!incape(sursa)) return { ok: false, motiv: 'prea-mare' };
  const locuri: Array<{ foaie: string | number; x: number; y: number }> = [];
  const umple = (f: Foaie, idF: string | number, dupa: Cutie | null, ocupate: Cutie[]): void => {
    const W = f.stoc.latime, H = f.stoc.inaltime;
    let y = dupa ? dupa.minY : H - m - h;
    let x = dupa ? dupa.maxX + d : m;
    while (locuri.length < cate && y >= m - EPS) {
      if (y + h <= H - m + EPS) {
        for (; locuri.length < cate && x + w <= W - m + EPS; x += w + d) {
          const c = { minX: x, minY: y, maxX: x + w, maxY: y + h };
          if (x < m - EPS || ocupate.some((b) => preaAproape(b, c, d))) continue;
          locuri.push({ foaie: idF, x: x - ox, y: y - oy });
          ocupate.push(c);
        }
      }
      y -= h + d;
      x = m;
    }
  };
  const cutiiFoii = (f: Foaie): Cutie[] => f.instante.flatMap((i) => {
    const p = doc.piese.find((q) => q.id === i.piesa);
    const c = p ? cutieInstanta(p, i) : null;
    return c ? [c] : [];
  });
  umple(sursa, sursa.id, c0, cutiiFoii(sursa));
  let dupa = sursa.id;
  for (let k = loc.foaie + 1; k < doc.foi.length && locuri.length < cate; k++) {
    const f = doc.foi[k];
    if (!f || f.instante.length > 0 || !incape(f)) break;
    umple(f, f.id, null, []);
    dupa = f.id;
  }
  let foiNoi = 0;
  for (; locuri.length < cate; foiNoi++) umple(sursa, foiNoi, null, []);
  return { ok: true, locuri, foiNoi, dupa };
}

/**
 * Comenzile planului: întâi foile noi (după `dupa`, ca foaia instanței: mărimea și materialul ei), apoi instanțele noi, la
 * capătul foilor lor, fiecare copia instanței alese (rotirea, câmpurile), cu id nou și locul din plan. Întoarce și id-urile
 * instanțelor noi (în ordinea planului).
 */
export function comenziCopii(doc: Document, id: string, plan: Extract<PlanCopii, { ok: true }>): { readonly comenzi: Comanda[]; readonly ids: string[] } {
  const loc = gasesteInstanta(doc, id);
  const sursa = loc ? doc.foi[loc.foaie] : undefined;
  if (!loc || !sursa) return { comenzi: [], ids: [] };
  const comenzi: Comanda[] = [];
  const material = materialFoaie(sursa);
  const foi = [...doc.foi];
  const idsFoi: string[] = [];
  const pozDupa = foi.findIndex((f) => f.id === plan.dupa);
  for (let k = 0; k < plan.foiNoi; k++) {
    const idF = idFoaieNoua({ ...doc, foi });
    const foaie: Foaie = { id: idF, stoc: { ...sursa.stoc }, instante: [], ...(material === null ? {} : { material }) };
    comenzi.push({ tip: 'adauga-foaie', foaie, pozitie: pozDupa + 1 + k, piese: [] });
    foi.splice(pozDupa + 1 + k, 0, foaie);
    idsFoi.push(idF);
  }
  const ocupate = new Set<string>();
  const pePas = new Map<string, number>();
  const ids: string[] = [];
  for (const l of plan.locuri) {
    const idF = typeof l.foaie === 'string' ? l.foaie : idsFoi[l.foaie];
    const f = foi.find((x) => x.id === idF);
    if (!idF || !f) continue;
    const nid = idNou(doc, ocupate);
    ocupate.add(nid);
    const pozitie = f.instante.length + (pePas.get(idF) ?? 0);
    pePas.set(idF, (pePas.get(idF) ?? 0) + 1);
    comenzi.push({ tip: 'adauga', foaie: idF, instanta: { ...structuredClone(loc.instanta), id: nid, x: l.x, y: l.y }, pozitie });
    ids.push(nid);
  }
  return { comenzi, ids };
}

/**
 * «Desprinde» (ADR 0210 §2): fiecare instanță aleasă de pe foaia `idFoaie` care are surori primește o piesă a ei (copia
 * arborelui și a operațiilor, cu id nou), în același loc al listei. Ultima instanță rămasă a unei piese o păstrează (nu rămâne
 * o piesă fără instanțe). Goală dacă nu e nimic de desprins.
 */
export function comenziDesprinde(doc: Document, ids: ReadonlySet<string>, idFoaie: string): Comanda[] {
  const foaie = doc.foi.find((f) => f.id === idFoaie);
  if (!foaie) return [];
  const n = folosiri(doc);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const ocupate = new Set<string>();
  const comenzi: Comanda[] = [];
  let pozPiesa = doc.piese.length;
  for (const [k, i] of foaie.instante.entries()) {
    const p = piese.get(i.piesa);
    const cate = n.get(i.piesa) ?? 0;
    if (!ids.has(i.id) || !p || cate < 2) continue;
    n.set(i.piesa, cate - 1);
    const nid = idNou(doc, ocupate);
    ocupate.add(nid);
    const { radacina, ...rest } = p;
    const copie: Piesa = { ...structuredClone(rest), radacina: copieArbore(radacina), id: nid };
    comenzi.push({ tip: 'sterge', foaie: foaie.id, instanta: i, pozitie: k });
    comenzi.push({ tip: 'adauga', foaie: foaie.id, instanta: { ...i, piesa: nid }, pozitie: k, piesa: { piesa: copie, pozitie: pozPiesa++ } });
  }
  return comenzi;
}

/**
 * „Duplică foaia cu aceleași piese” (ADR 0210 §2, opțiunea owner-ului): o foaie nouă după foaia `id`, cu instanțe noi ale
 * acelorași piese (legate), la aceleași locuri; mărimea, materialul și ghidajele vin, numele nu. Null fără foaie.
 */
export function comandaDuplicareLegata(doc: Document, id: string): { readonly comanda: Comanda; readonly id: string } | null {
  const k = doc.foi.findIndex((f) => f.id === id);
  const sursa = doc.foi[k];
  if (!sursa) return null;
  const ocupate = new Set<string>();
  const instante = sursa.instante.map((i) => {
    const nid = idNou(doc, ocupate);
    ocupate.add(nid);
    return { ...structuredClone(i), id: nid };
  });
  const { instante: _instante, nume: _nume, ...rest } = sursa;
  const idCopie = idFoaieNoua(doc);
  return { comanda: { tip: 'adauga-foaie', foaie: { ...structuredClone(rest), id: idCopie, instante }, pozitie: k + 1, piese: [] }, id: idCopie };
}
