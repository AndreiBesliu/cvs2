/**
 * Modul urechilor alese (ADR 0211, felia 11.3↑d), partea pură: conturul fiecărui element al operației în fiecare instanță a
 * piesei de pe foaie (în lume, cubicele trecute în arce), urechea sau conturul de sub maus, punerea, mutarea și scoaterea
 * unui loc. Locurile se țin pe piesă, ca puncte ale formei (coordonatele elementului, ADR 0211, precizarea de la
 * implementare), deci toate copiile le au; distanțele dintre urechi se măsoară pe contur, în lume, ca regula lucrării:
 * cel puțin W / 0,9 între centre (6a). Lucrarea le judecă din nou pe drumul frezei, la export.
 */
import { lungimeBucla, punctLa } from '../cam/parcurgere.ts';
import { proiectiePeBucla } from '../cam/urechi.ts';
import { conturFaraCubice } from '../geom/biarce.ts';
import type { Contur, Punct } from '../geom/contur.ts';
import { inversa } from '../geom/inversa.ts';
import { aplica, type Matrice } from '../geom/matrice.ts';
import { PLAFON, type Document, type LocUreche } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';

/** Un element al operației, într-o instanță: conturul lui în lume (închis, fără cubice), lungimea, matricea și inversa ei. */
export type ConturUrechi = {
  readonly instanta: string;
  readonly nod: string;
  readonly contur: Contur;
  readonly lungime: number;
  readonly matrice: Matrice;
  readonly inversa: Matrice;
};

/** Locurile alese ale unei operații: pe fiecare element (id-ul lui), punctele formei. */
export type Locuri = Readonly<Record<string, readonly LocUreche[]>>;

/** De ce nu se pune sau nu se mută o ureche: prea aproape de alta, contur prea scurt, plafonul de 100 pe element. */
export type MotivUreche = 'aproape' | 'scurt' | 'plafon';

export type Schimbare = { readonly ok: true; readonly locuri: Locuri } | { readonly ok: false; readonly motiv: MotivUreche };

/** Distanța cea mai mică dintre centrele a două urechi, pe drum (ADR 0211, 6a; lucrarea refuză sub ea). */
export const distantaMinima = (latime: number): number => latime / 0.9;

/** Toleranța trecerii cubicelor în arce (mm): pozițiile pe contur, nu tăietura. */
const TOLERANTA_ARCE = 0.01;

/** Coordonatele unui loc ales, la 0,001 mm (ca nodurile desenate). */
const rotunjit = (v: number): number => Math.round(v * 1000) / 1000;

/** Lista elementului `nod` din locuri (doar cheile proprii: un id poate fi „__proto__”). */
export function listaLocuri(locuri: Locuri | undefined, nod: string): readonly LocUreche[] {
  return locuri && Object.hasOwn(locuri, nod) ? (locuri[nod] ?? []) : [];
}

/** Locurile, cu lista elementului `nod` înlocuită (pusă, nu atribuită: cheia poate fi „__proto__”). */
function cuLista(locuri: Locuri, nod: string, lista: readonly LocUreche[]): Locuri {
  const rez: Record<string, readonly LocUreche[]> = {};
  for (const k of Object.keys(locuri)) Object.defineProperty(rez, k, { value: locuri[k], enumerable: true, writable: true, configurable: true });
  Object.defineProperty(rez, nod, { value: lista, enumerable: true, writable: true, configurable: true });
  return rez;
}

/** Locurile operației din document, doar pe elementele ei (o cheie străină nu ajunge la pânză). */
export function locuriOperatiei(doc: Document, piesa: string, operatie: string): Locuri {
  const o = doc.piese.find((x) => x.id === piesa)?.operatii.find((x) => x.id === operatie);
  const l = o?.urechi?.mod === 'alese' ? o.urechi.locuri : undefined;
  let rez: Locuri = {};
  for (const n of o?.noduri ?? []) {
    const lista = listaLocuri(l, n);
    if (lista.length > 0) rez = cuLista(rez, n, lista.map((q) => ({ x: q.x, y: q.y })));
  }
  return rez;
}

/** Câte urechi alese are operația (pe toate elementele ei), pentru rândul ferestrei și panou. */
export function numarLocuri(locuri: Locuri): number {
  return Object.keys(locuri).reduce((s, k) => s + (locuri[k]?.length ?? 0), 0);
}

/**
 * Contururile operației `operatie` a piesei `piesa`, în fiecare instanță de pe foaia `indexFoaie`: elementele ei închise (o
 * cale deschisă n-are urechi, ADR 0037 §9).
 */
export function contururiUrechi(doc: Document, indexFoaie: number, piesa: string, operatie: string): ConturUrechi[] {
  const o = doc.piese.find((x) => x.id === piesa)?.operatii.find((x) => x.id === operatie);
  if (!o) return [];
  const noduri = new Set(o.noduri);
  const rez: ConturUrechi[] = [];
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (e.piesa !== piesa || !noduri.has(e.nod)) continue;
    const brut = conturElement(e);
    if (!brut.inchis) continue;
    const c = conturFaraCubice(brut, TOLERANTA_ARCE);
    const inv = inversa(e.matrice);
    if (!c.ok || !inv) continue;
    rez.push({ instanta: e.instanta, nod: e.nod, contur: c.contur, lungime: lungimeBucla(c.contur), matrice: e.matrice, inversa: inv });
  }
  return rez;
}

/** Unde stă locul `q` (al formei) pe conturul k: poziția pe contur, în lume. */
function pozitie(k: ConturUrechi, q: LocUreche): number | null {
  return proiectiePeBucla(k.contur, aplica(k.matrice, { x: q.x, y: q.y }))?.s ?? null;
}

/** Locul `s` e la mai puțin de W / 0,9 de alt loc al elementului (fără cel de la `fara`), de jur împrejurul conturului. */
function preaAproape(k: ConturUrechi, lista: readonly LocUreche[], s: number, latime: number, fara: number): boolean {
  const min = distantaMinima(latime);
  return lista.some((q, j) => {
    if (j === fara) return false;
    const x = pozitie(k, q);
    if (x === null) return false;
    const d = Math.abs(x - s) % k.lungime;
    return Math.min(d, k.lungime - d) < min - 1e-9;
  });
}

/** Punctul conturului k cel mai apropiat de `w` (în lume), dacă e la cel mult `toleranta` de el: poziția și punctul. */
function peContur(k: ConturUrechi, w: Punct, toleranta: number): { readonly s: number; readonly punct: Punct } | null {
  const x = proiectiePeBucla(k.contur, w);
  if (!x || x.d > toleranta) return null;
  const q = punctLa(k.contur, x.s)?.p;
  return q ? { s: x.s, punct: q } : null;
}

/** Locul formei pentru punctul `q` al conturului k (în lume), la 0,001 mm. */
const locDin = (k: ConturUrechi, q: Punct): LocUreche => {
  const p = aplica(k.inversa, q);
  return { x: rotunjit(p.x), y: rotunjit(p.y) };
};

/** Conturul de sub punctul `w` (în lume), cel mai apropiat, la cel mult `toleranta`. */
export function conturLovit(contururi: readonly ConturUrechi[], w: Punct, toleranta: number): ConturUrechi | null {
  let rez: ConturUrechi | null = null, d0 = toleranta;
  for (const k of contururi) {
    const x = proiectiePeBucla(k.contur, w);
    if (x && x.d <= d0) { d0 = x.d; rez = k; }
  }
  return rez;
}

/** O ureche aleasă, pe una din instanțe: conturul ei și indicele în lista elementului. */
export type UrecheLovita = { readonly k: ConturUrechi; readonly index: number };

/** Urechea de sub punctul `w` (în lume), cea mai apropiată, la cel mult `raza`, pe oricare instanță. */
export function urecheLovita(contururi: readonly ConturUrechi[], locuri: Locuri, w: Punct, raza: number): UrecheLovita | null {
  let rez: UrecheLovita | null = null, d0 = raza;
  for (const k of contururi) {
    for (const [index, q] of listaLocuri(locuri, k.nod).entries()) {
      const p = aplica(k.matrice, { x: q.x, y: q.y });
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d <= d0) { d0 = d; rez = { k, index }; }
    }
  }
  return rez;
}

/** Pune o ureche pe conturul k, în punctul cel mai apropiat de `w`; null dacă `w` nu e pe contur (la `toleranta`). */
export function puneUreche(locuri: Locuri, k: ConturUrechi, w: Punct, latime: number, toleranta: number): Schimbare | null {
  const x = peContur(k, w, toleranta);
  if (!x) return null;
  const lista = listaLocuri(locuri, k.nod);
  if (lista.length >= PLAFON.urechi) return { ok: false, motiv: 'plafon' };
  if (k.lungime < distantaMinima(latime)) return { ok: false, motiv: 'scurt' };
  if (preaAproape(k, lista, x.s, latime, -1)) return { ok: false, motiv: 'aproape' };
  return { ok: true, locuri: cuLista(locuri, k.nod, [...lista, locDin(k, x.punct)]) };
}

/** Mută urechea `index` a conturului k în punctul conturului cel mai apropiat de `w` (oricât de departe ar fi mausul). */
export function mutaUreche(locuri: Locuri, k: ConturUrechi, index: number, w: Punct, latime: number): Schimbare | null {
  const x = peContur(k, w, Infinity);
  const lista = listaLocuri(locuri, k.nod);
  if (!x || index < 0 || index >= lista.length) return null;
  if (preaAproape(k, lista, x.s, latime, index)) return { ok: false, motiv: 'aproape' };
  return { ok: true, locuri: cuLista(locuri, k.nod, lista.map((q, j) => (j === index ? locDin(k, x.punct) : q))) };
}

/** Scoate urechea `index` a elementului `nod` (lista goală pleacă). */
export function scoateUreche(locuri: Locuri, nod: string, index: number): Locuri {
  const lista = listaLocuri(locuri, nod).filter((_, j) => j !== index);
  if (lista.length > 0) return cuLista(locuri, nod, lista);
  const rez: Record<string, readonly LocUreche[]> = {};
  for (const k of Object.keys(locuri)) if (k !== nod) Object.defineProperty(rez, k, { value: locuri[k], enumerable: true, writable: true, configurable: true });
  return rez;
}
