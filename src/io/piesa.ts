/**
 * Piesa unui import (ADR 0035 §8): căile, ca elemente ale unui grup, cu operațiile alese din imbricare. Ușoară: intră în
 * pachetul de pornire prin acțiunea documentului; imbricarea (cu indexul de cutii) se calculează la previzualizare.
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

/** Ce a pregătit previzualizarea: căile în mm pe pagină, latura fiecăreia, numele piesei și dacă pagina are mărime. */
export type ImportPregatit = {
  readonly nume: string;
  readonly cai: ReadonlyArray<CaleImport>;
  readonly laturi: readonly Latura[];
  readonly pagina: { readonly latime: number; readonly inaltime: number } | null;
};

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
 * Piesa și locul instanței ei. Coordonatele elementelor sunt ale paginii minus colțul stânga-jos al cutiei exacte a
 * desenului; instanța stă în acel colț (pagina fără mărime: în origine). Pe foaie, desenul ajunge unde era pe pagină.
 */
export function piesaDinImport(p: ImportPregatit, id: string, scula?: Operatie['scula']): { readonly piesa: Piesa; readonly x: number; readonly y: number } {
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
  // Operația implicită a unei căi (cea a dreptunghiului, ADR 0034 §7), cu latura din imbricare. Căile deschise n-au latură
  // de la imbricare (ADR 0037 §11): operația lor vine cu ușa care le aduce (2.3c-3).
  const prima = elemente[0];
  for (const latura of ['exterior', 'interior'] as const) {
    const noduri = elemente.filter((_, k) => p.laturi[k] === latura).map((e) => e.id);
    for (let i = 0; prima && i < noduri.length; i += PLAFON.noduriOperatie) {
      const idOp = i === 0 ? latura : `${latura}-${i / PLAFON.noduriOperatie + 1}`;
      operatii.push({ ...operatieImplicita(idOp, prima.forma, scula), noduri: noduri.slice(i, i + PLAFON.noduriOperatie), latura });
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
