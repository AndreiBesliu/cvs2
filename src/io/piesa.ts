/**
 * Piesa unui import (ADR 0035 §8, ADR 0037 §11): căile, ca elemente ale unui grup, cu operațiile alese din imbricare
 * (exterior / interior) plus operația căilor deschise (pe linie). Vine la cerere, cu previzualizarea (felia 2.3c-3): nu
 * intră în pachetul de pornire. Acțiunea documentului primește constructorul piesei odată cu importul pregătit
 * (`ImportPregatit.piesa`), fără să importe modulul.
 */
import type { Varf } from '../geom/contur.ts';
import { cutieContur, CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { operatieImplicita, PLAFON, type ElementNod, type Latura, type Operatie, type Piesa, type VarfDoc } from '../model/document.ts';

/**
 * O cale a importului, cum o dă ușa SVG: `inchis` e al ei (ADR 0037 §2). Lipsa câmpului înseamnă o cale închisă: ușa îl
 * scrie mereu (`CaleSvg`); doar căile scrise de mână în teste, de dinaintea căilor deschise, nu-l au.
 */
export type CaleImport = { readonly varfuri: readonly Varf[]; readonly inchis?: boolean; readonly nume?: string };

/** Calea e închisă: doar un `inchis: false` explicit o deschide. */
export const caleInchisa = (c: { readonly inchis?: boolean }): boolean => c.inchis !== false;

/** Ce a citit previzualizarea: căile în mm pe pagină, latura fiecăreia, numele piesei și dacă pagina are mărime. */
export type DateImport = {
  readonly nume: string;
  readonly cai: ReadonlyArray<CaleImport>;
  readonly laturi: readonly Latura[];
  readonly pagina: { readonly latime: number; readonly inaltime: number } | null;
};

/** Ce știe foaia la import: freza ei (dacă are una singură) și grosimea (adâncimea căilor deschise, ADR 0037 §11). */
export type FoaieImport = { readonly scula?: Operatie['scula']; readonly grosime?: number };

/** Piesa importului și locul instanței ei pe foaie. */
export type PiesaImport = { readonly piesa: Piesa; readonly x: number; readonly y: number };

/**
 * Importul pregătit de previzualizare: datele, plus constructorul piesei, adus odată cu ele din modulul încărcat la
 * cerere. Piesa se face abia la „Importă”, cu id-ul liber și cu foaia documentului de atunci.
 */
export type ImportPregatit = DateImport & { readonly piesa: (id: string, foaie: FoaieImport) => PiesaImport };

/** Importul pregătit din datele lui: constructorul e `piesaDinImport`, pe aceleași date. */
export function pregateste(d: DateImport): ImportPregatit {
  return { ...d, piesa: (id, foaie) => piesaDinImport(d, id, foaie.scula, foaie.grosime) };
}

/**
 * Cutia exactă a căilor unui import, fiecare citită cu `inchis` al ei: o cale deschisă n-are segmentul de după ultimul
 * vârf. Una pentru previzualizare (mărimea desenului) și pentru piesă (colțul ei).
 */
export function cutieCai(cai: ReadonlyArray<CaleImport>): Cutie {
  let cutie = CUTIE_GOALA;
  for (const c of cai) cutie = uneste(cutie, cutieContur({ inchis: caleInchisa(c), varfuri: c.varfuri }));
  return cutie;
}

/** Numele piesei din numele fișierului: fără extensie, tăiat la plafonul numelor. */
export function numeDinFisier(fisier: string): string {
  const fara = fisier.replace(/\.svg$/i, '');
  return (fara || fisier).slice(0, PLAFON.numeLungime);
}

/**
 * Adâncimea căilor deschise importate (ADR 0037 §11, decizia owner-ului din 13.10): min(1 mm, grosimea foii / 2), într-o
 * singură trecere. O linie uitată în fișier lasă doar o urmă și nu desparte niciodată foaia din oficiu. Fără grosime
 * (apelurile din teste, de dinaintea căilor deschise): 1 mm.
 */
export function adancimeDeschise(grosime?: number): number {
  return grosime === undefined ? 1 : Math.min(1, grosime / 2);
}

/**
 * Piesa și locul instanței ei. Coordonatele elementelor sunt ale paginii minus colțul stânga-jos al cutiei exacte a
 * desenului; instanța stă în acel colț (pagina fără mărime: în origine). Pe foaie, desenul ajunge unde era pe pagină.
 *
 * Operațiile, în ordinea asta (ordinea tăierii o hotărăște CAM-ul, ADR 0037 §8): `exterior` și `interior` (cele din
 * imbricare, operația implicită a dreptunghiului cu latura ei), apoi `deschise` (ADR 0037 §11): pe linie, adâncimea
 * `adancimeDeschise(grosime)` într-o trecere, urcare, freza foii, fără urechi, rampă, intrări și degajări. Fiecare se
 * împarte la `PLAFON.noduriOperatie` noduri (`exterior-2`, `deschise-2` …).
 */
export function piesaDinImport(p: DateImport, id: string, scula?: Operatie['scula'], grosime?: number): PiesaImport {
  const cutie = cutieCai(p.cai);
  const dx = cutie.minX;
  const dy = cutie.minY;
  const muta = (q: { readonly x: number; readonly y: number }): { x: number; y: number } => ({ x: q.x - dx, y: q.y - dy });
  const elemente: ElementNod[] = p.cai.map((c, k) => ({
    tip: 'element',
    id: `c${k + 1}`,
    ...(c.nume ? { nume: c.nume } : {}),
    forma: {
      tip: 'cale',
      inchis: caleInchisa(c),
      varfuri: c.varfuri.map((v): VarfDoc => ({
        p: muta(v.p),
        s: v.s.tip === 'C' ? { tip: 'C', c1: muta(v.s.c1), c2: muta(v.s.c2) } : v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : { tip: 'L' },
      })),
    },
    matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  }));
  const operatii: Operatie[] = [];
  const prima = elemente[0];
  const adancime = adancimeDeschise(grosime);
  // Latura din imbricare pentru căile închise; căile deschise (latura „pe-linie” din imbricare) intră în `deschise`.
  const grupe = [
    { id: 'exterior', latura: 'exterior', ale: (k: number) => caleInchisa(p.cai[k] ?? {}) && p.laturi[k] === 'exterior' },
    { id: 'interior', latura: 'interior', ale: (k: number) => caleInchisa(p.cai[k] ?? {}) && p.laturi[k] === 'interior' },
    { id: 'deschise', latura: 'pe-linie', ale: (k: number) => !caleInchisa(p.cai[k] ?? {}) },
  ] as const;
  for (const g of grupe) {
    const noduri = elemente.filter((_, k) => g.ale(k)).map((e) => e.id);
    for (let i = 0; prima && i < noduri.length; i += PLAFON.noduriOperatie) {
      const idOp = i === 0 ? g.id : `${g.id}-${i / PLAFON.noduriOperatie + 1}`;
      const baza = { ...operatieImplicita(idOp, prima.forma, scula), noduri: noduri.slice(i, i + PLAFON.noduriOperatie) };
      operatii.push(g.id === 'deschise' ? { ...baza, latura: g.latura, adancime, pas: adancime } : { ...baza, latura: g.latura });
    }
  }
  const piesa: Piesa = {
    id,
    nume: p.nume,
    radacina: { tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, copii: elemente },
    operatii,
  };
  return p.pagina ? { piesa, x: dx, y: dy } : { piesa, x: 0, y: 0 };
}
