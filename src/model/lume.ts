import { compune, rotatie, type Matrice } from '../geom/matrice.ts';
import type { Document, FormaDoc, Instanta, Nod } from './document.ts';

/**
 * Elementele în lume ale unei foi (ADR 0024): singurul loc care desface piesele și instanțele în forme așezate pe foaie.
 * Pânza, CAM-ul, avertismentele și selecția citesc toate de aici, deci nu există două păreri despre unde e o formă.
 *
 * - ordinea: instanțele în ordinea foii; în fiecare piesă, elementele în preordine (grupurile nu desenează nimic);
 * - matricea: instanța ∘ grupurile de pe drum, de la rădăcină în jos ∘ elementul;
 * - id-ul în lume: `<id instanță>/<id element>`.
 */
export type ElementLume = {
  readonly idLume: string;
  readonly instanta: string;
  readonly piesa: string;
  readonly nod: string;
  readonly forma: FormaDoc;
  readonly matrice: Matrice;
};

/** Matricea instanței: întâi rotirea (exactă la multiplii de 90°), apoi translația. Scrisă direct, fără înmulțiri. */
export function matriceInstanta(i: Pick<Instanta, 'x' | 'y' | 'rotire'>): Matrice {
  return { ...rotatie(i.rotire), e: i.x, f: i.y };
}

export function idLume(instanta: string, nod: string): string {
  return `${instanta}/${nod}`;
}

/** Elementele în lume ale unei instanțe, cu matricea ei dată (pentru o previzualizare se poate da alta). */
export function elementeInstanta(radacina: Nod, i: Pick<Instanta, 'id' | 'piesa'>, mInstanta: Matrice): ElementLume[] {
  const rez: ElementLume[] = [];
  const stiva: Array<{ readonly nod: Nod; readonly m: Matrice }> = [{ nod: radacina, m: mInstanta }];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (!x) break;
    const m = compune(x.m, x.nod.matrice);
    if (x.nod.tip === 'element') {
      rez.push({ idLume: idLume(i.id, x.nod.id), instanta: i.id, piesa: i.piesa, nod: x.nod.id, forma: x.nod.forma, matrice: m });
    } else {
      for (let k = x.nod.copii.length - 1; k >= 0; k--) {
        const c = x.nod.copii[k];
        if (c) stiva.push({ nod: c, m });
      }
    }
  }
  return rez;
}

export function elementeFoaie(doc: Document, indexFoaie = 0): ElementLume[] {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return [];
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const rez: ElementLume[] = [];
  for (const i of foaie.instante) {
    const p = piese.get(i.piesa);
    if (!p) continue;
    for (const e of elementeInstanta(p.radacina, i, matriceInstanta(i))) rez.push(e);
  }
  return rez;
}
