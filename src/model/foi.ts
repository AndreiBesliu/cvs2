import type { Document, Foaie } from './document.ts';

/**
 * Foile proiectului (ADR 0210 §1, felia 11.1↑), cum le vede fereastra: foaia activă, documentul văzut din ea, numele și
 * materialul unei foi. Foaia activă e a ferestrei, nu a documentului: aici e doar un id dat de cine întreabă. Comenzile
 * foilor stau în `foiComenzi.ts`, cu calculul acțiunilor, la cerere: nu intră în pachetul de pornire.
 */

/** Locul foii cu id-ul dat; fără id, sau fără o foaie cu el (ștearsă, anulată), prima: documentul are mereu cel puțin una. */
export function indexFoaieActiva(doc: Document, id: string | null | undefined): number {
  if (id === null || id === undefined) return 0;
  const k = doc.foi.findIndex((f) => f.id === id);
  return k < 0 ? 0 : k;
}

/**
 * Documentul văzut dintr-o foaie (ADR 0210 §5): aceleași piese, doar foaia aceea. CAM-ul, traseul, simularea, verificarea și
 * exportul lucrează pe prima foaie a documentului primit, deci programul unei foi e, octet cu octet, cel al documentului care
 * ar avea doar foaia ei. Cu o singură foaie, documentul însuși.
 */
export function doarFoaia(doc: Document, id: string | null | undefined): Document {
  const k = indexFoaieActiva(doc, id);
  const f = doc.foi[k];
  if (!f || (k === 0 && doc.foi.length === 1)) return doc;
  return { ...doc, foi: [f] };
}

/**
 * Numele arătat al foii: cel scris de om; altfel, din id (`f3` → „Foaia 3”), ca să nu se schimbe când foaia se mută în listă;
 * altfel, după locul ei. `sablon` e textul în limba omului („Foaia {n}”).
 */
export function numeFoaie(foaie: Pick<Foaie, 'id' | 'nume'>, index: number, sablon: (n: number) => string): string {
  if (typeof foaie.nume === 'string' && foaie.nume.trim() !== '') return foaie.nume;
  const m = /^f([1-9][0-9]{0,5})$/.exec(foaie.id);
  return sablon(m ? Number(m[1]) : index + 1);
}

/** Distanța dintre foile de pe pânză, în mm (ADR 0210 §1). */
export const SPATIU_FOI = 100;

/**
 * Locul fiecărei foi pe rândul pânzei (ADR 0210 §1, felia 11.1↑b): colțul ei stânga-jos pe X, în ordinea listei, la
 * `SPATIU_FOI` una de alta, cu fețele de jos la Y 0. Pânza le arată față de foaia activă (originea ei).
 */
export function locuriFoi(doc: Document): number[] {
  let x = 0;
  return doc.foi.map((f) => {
    const aici = x;
    x += f.stoc.latime + SPATIU_FOI;
    return aici;
  });
}

/** Materialul foii, dacă e scris (o etichetă, ADR 0210 §1). */
export function materialFoaie(foaie: Pick<Foaie, 'material'>): string | null {
  return typeof foaie.material === 'string' && foaie.material.trim() !== '' ? foaie.material : null;
}
