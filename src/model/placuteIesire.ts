/**
 * Textul care iese din plăcuță (ADR 0210 §4, răspunsul 5; felia 11.4↑c). Plăcuța e conturul închis cel mai mare al piesei
 * din afara textelor ei (rama, marginea plăcii); o piesă fără el (doar text) n-are din ce ieși. Textul unei plăcuțe iese când
 * o literă trece de acest contur cu mai mult decât toleranța proiectului: una care doar îl atinge rămâne înăuntru.
 *
 * Modulul vine la cerere (aplicația îl aduce când documentul are plăcuțe) și își înregistrează avertismentele
 * (`avertismente.ts`): în bara de jos și, cu roșu, în listă; niciodată pe pânză. Exportul cere confirmarea, dacă omul a ales-o
 * în fereastra CSV. Judecata e ținută pe obiecte (piesa, literele plăcuței): o editare reface doar plăcuțele atinse.
 */
import { cutieContur, type Cutie } from '../geom/cutie.ts';
import { arieCuSemn } from '../geom/contur.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import { compune, IDENTITATE } from '../geom/matrice.ts';
import { TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import { inregistreazaPlacute, type Avertisment } from './avertismente.ts';
import { blocText } from './blocText.ts';
import type { Document, Instanta, Matrice, Nod, Piesa, TextePlacuta } from './document.ts';
import { conturElement } from './forme.ts';
import { cuLitere } from './lume.ts';

/** Conturul plăcuței, în coordonatele piesei, cu cutia lui și dacă e chiar cutia (un dreptunghi drept: ajunge cutia literelor). */
type Placa = { readonly contur: Contur; readonly cutie: Cutie; readonly dreptunghi: boolean };

/**
 * Contururile elementelor din arbore, în coordonatele piesei: ale textelor (grupurile cu un bloc valid, ADR 0105 §4; sub ele
 * nu se mai caută) și restul. `litere`: grupurile ale căror litere se măsoară (ale plăcuței); celelalte texte nu intră nicăieri.
 */
function contururi(radacina: Nod, litere: ReadonlySet<string> | null): { readonly placa: Contur[]; readonly litere: Contur[] } {
  const rez = { placa: [] as Contur[], litere: [] as Contur[] };
  const stiva: Array<{ readonly nod: Nod; readonly m: Matrice; readonly text: 'nu' | 'masurat' | 'altul' }> = [
    { nod: radacina, m: IDENTITATE, text: 'nu' },
  ];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (!x) break;
    const m = compune(x.m, x.nod.matrice);
    if (x.nod.tip === 'element') {
      if (x.text === 'nu') rez.placa.push(conturElement({ forma: x.nod.forma, matrice: m }));
      else if (x.text === 'masurat') rez.litere.push(conturElement({ forma: x.nod.forma, matrice: m }));
      continue;
    }
    const text = x.text !== 'nu' ? x.text : litere?.has(x.nod.id) ? 'masurat' : blocText(x.nod) ? 'altul' : 'nu';
    for (const c of x.nod.copii) stiva.push({ nod: c, m, text });
  }
  return rez;
}

const placi = new WeakMap<Piesa, Placa | null>();

/** Plăcuța piesei: conturul ei închis cel mai mare, din afara textelor; null dacă n-are niciunul (o piesă doar cu text). */
export function placaPiesei(p: Piesa): Placa | null {
  const tinuta = placi.get(p);
  if (tinuta !== undefined) return tinuta;
  let rez: Placa | null = null, arie = 0;
  for (const c of contururi(p.radacina, null).placa) {
    if (!c.inchis || c.varfuri.length < 2) continue;
    const a = Math.abs(arieCuSemn(c));
    if (a <= arie) continue;
    const cutie = cutieContur(c);
    arie = a;
    rez = { contur: c, cutie, dreptunghi: a >= (cutie.maxX - cutie.minX) * (cutie.maxY - cutie.minY) * (1 - 1e-9) };
  }
  placi.set(p, rez);
  return rez;
}

/** Punctele unei litere de judecat: vârfurile și, pe arce și curbe, trei puncte între capete (la un sfert, la jumătate, la trei sferturi). */
function puncte(c: Contur): Punct[] {
  const rez: Punct[] = c.varfuri.map((v) => v.p);
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L') continue;
    for (const t of [0.25, 0.5, 0.75]) {
      if (s.tip === 'A') {
        const k = cerculArcului(a, b, s.bulge);
        const u = k.start + k.baleiaj * t;
        rez.push({ x: k.centru.x + k.raza * Math.cos(u), y: k.centru.y + k.raza * Math.sin(u) });
      } else {
        const v = 1 - t;
        rez.push({
          x: v * v * v * a.x + 3 * v * v * t * s.c1.x + 3 * v * t * t * s.c2.x + t * t * t * b.x,
          y: v * v * v * a.y + 3 * v * v * t * s.c1.y + 3 * v * t * t * s.c2.y + t * t * t * b.y,
        });
      }
    }
  }
  return rez;
}

/** O literă trece de plăcuță: întâi cutia ei (exactă), apoi, pe o plăcuță care nu e un dreptunghi drept, punctele ei. */
function iese(l: Contur, placa: Placa): boolean {
  const c = cutieContur(l), t = TOLERANTA_PROIECT, p = placa.cutie;
  if (c.minX < p.minX - t || c.minY < p.minY - t || c.maxX > p.maxX + t || c.maxY > p.maxY + t) return true;
  if (placa.dreptunghi) return false;
  return puncte(l).some((q) => !inRegiune(q, [placa.contur]) && distantaLaContur(q, placa.contur) > t);
}

const judecate = new WeakMap<object, WeakMap<Piesa, boolean>>();

/** Textul plăcuței (literele ei, `texte`) iese din plăcuța piesei `p`. */
export function textIese(p: Piesa, texte: Readonly<Record<string, TextePlacuta>>): boolean {
  let peTexte = judecate.get(texte);
  const tinut = peTexte?.get(p);
  if (tinut !== undefined) return tinut;
  const placa = placaPiesei(p);
  const rez = placa !== null && contururi(cuLitere(p.radacina, texte), new Set(Object.keys(texte))).litere.some((l) => iese(l, placa));
  if (!peTexte) {
    peTexte = new WeakMap();
    judecate.set(texte, peTexte);
  }
  peTexte.set(p, rez);
  return rez;
}

/** Plăcuțele foii `indexFoaie` (toate foile, fără el) al căror text iese din plăcuță, în ordinea listei. */
export function placuteCuTextIesit(doc: Document, indexFoaie?: number): Instanta[] {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const foi = indexFoaie === undefined ? doc.foi : doc.foi.slice(indexFoaie, indexFoaie + 1);
  return foi.flatMap((f) => f.instante.filter((i) => {
    const p = i.texte ? piese.get(i.piesa) : undefined;
    return p !== undefined && i.texte !== undefined && textIese(p, i.texte);
  }));
}

/** Numele unei plăcuțe, ca în listă: primul rând al textului ei, altfel numele piesei. */
export function numePlacutei(i: Instanta, p: Piesa | undefined): string {
  return (i.texte && Object.values(i.texte)[0]?.continut.split('\n')[0]?.trim()) || p?.nume || i.id;
}

inregistreazaPlacute((doc, k): Avertisment[] => placuteCuTextIesit(doc, k).map((i) => ({ tip: 'text-iese-din-placuta', id: i.id, instanta: i.id })));
