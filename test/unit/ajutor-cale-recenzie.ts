/**
 * Ajutoarele recenziei feliei 2.7b (ADR 0034), comune lui `cale.recenzie.test.ts` și părților probei căilor netede din
 * multe cubice (`cale.recenzie.cubice.<n>.test.ts`).
 *
 * Proba aceea (24 de cazuri: bule de 32 și de 128 de cubice, pe exterior și pe interior, câte patru semințe) era un singur
 * test, de 3–4 minute; ajuns în aceeași felie a rapidului cu alte oracole grele, o ținea la peste 9 minute. Din 24.11.2026 e
 * împărțită pe părți (`ajutor-parti.ts`): fiecare caz se judecă la fel ca înainte, singur, iar partea 1 păzește împărțirea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Dicționarele de bază vin la cerere (`t.ts`): un refuz al lucrării își spune motivul în cuvinte.
import './limbi.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';
import { TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import type { Document, FormaDoc, Operatie, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';
import { cazurilePartii, cereImpartirea } from './ajutor-parti.ts';

export const P = (x: number, y: number) => ({ x, y });
export const F = { latime: 2440, inaltime: 1220, grosime: 18 };

/** O piesă cu un singur element, pusă cu rotirea dată (matricea elementului dată). */
export function piesa(forma: FormaDoc, matrice: Document['piese'][number]['radacina']['matrice'], x: number, y: number, rotire: number, op?: Partial<Operatie>): Document {
  const d = docDin(F, { id: 'c', forma, matrice: { ...ID } });
  const p = d.piese[0];
  if (!p || p.radacina.tip !== 'element') throw new Error('piesa');
  p.radacina.matrice = matrice;
  const foaie = d.foi[0];
  if (!foaie) throw new Error('foaie');
  foaie.instante = [{ id: 'c', piesa: 'c', x, y, rotire }];
  return op ? cuOperatie(d, 'c', op) : d;
}

/** Bulă netedă: Catmull-Rom închis, ca cubice, pe raze aleatoare (sămânța dată). */
export function bula(n: number, r0: number, samanta: number): FormaDoc {
  let s = samanta;
  const rnd = (): number => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const pts = Array.from({ length: n }, (_, i) => {
    const u = (2 * Math.PI * i) / n, r = r0 * (0.75 + 0.5 * rnd());
    return P(r * Math.cos(u), r * Math.sin(u));
  });
  return {
    tip: 'cale',
    inchis: true,
    varfuri: pts.map((p, i): VarfDoc => {
      const p0 = pts[(i - 1 + n) % n] as { x: number; y: number }, p2 = pts[(i + 1) % n] as { x: number; y: number }, p3 = pts[(i + 2) % n] as { x: number; y: number };
      return { p, s: { tip: 'C', c1: P(p.x + (p2.x - p0.x) / 6, p.y + (p2.y - p0.y) / 6), c2: P(p2.x - (p3.x - p.x) / 6, p2.y - (p3.y - p.y) / 6) } };
    }),
  };
}

/** Punctele în plan ale mișcărilor de tăiere din prima trecere, pe linii și arce. */
export function puncte(d: Document): Array<{ x: number; y: number }> {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return [];
  const rez: Array<{ x: number; y: number }> = [];
  let x = Number.NaN, y = Number.NaN, z = Number.NaN, z0: number | null = null;
  for (const a of j.program.miscari) {
    if (!('la' in a)) continue;
    const nx = a.la.X ?? x, ny = a.la.Y ?? y, nz = a.la.Z ?? z;
    if (a.tip !== 'rapida' && nz === z && nz < 0 && (z0 === null || nz === z0)) {
      z0 = nz;
      for (let k = 0; k <= 8; k++) {
        const f = k / 8;
        if (a.tip === 'arc') {
          const c = a.centru, r = Math.hypot(x - c.x, y - c.y), u0 = Math.atan2(y - c.y, x - c.x);
          let b = Math.atan2(ny - c.y, nx - c.x) - u0;
          if (a.sens === 'trigonometric') { while (b <= 1e-12) b += 2 * Math.PI; } else { while (b >= -1e-12) b -= 2 * Math.PI; }
          rez.push(P(c.x + r * Math.cos(u0 + b * f), c.y + r * Math.sin(u0 + b * f)));
        } else {
          rez.push(P(x + (nx - x) * f, y + (ny - y) * f));
        }
      }
    }
    x = nx; y = ny; z = nz;
  }
  return rez;
}

/** În câte părți se împarte proba căilor netede: tot atâtea fișiere. */
export const PARTI_CUBICE = 4;

/** Un caz al probei: o bulă netedă din `n` cubice, cu sămânța ei, tăiată pe latura dată. */
export type CazCubice = { readonly n: number; readonly samanta: number; readonly latura: 'exterior' | 'interior' };

/** Cele 24 de cazuri, în ordinea probei întregi de dinainte. */
export function cazurileCubicelor(): CazCubice[] {
  const rez: CazCubice[] = [];
  for (const [n, samanta] of [[32, 5], [128, 5], [128, 77]] as const) {
    for (const latura of ['exterior', 'interior'] as const) {
      for (let k = 0; k < 4; k++) rez.push({ n, samanta: samanta + k, latura });
    }
  }
  return rez;
}

/** Cât se abate tăietura unui caz de la raza frezei (3 mm) față de cubica exactă: judecata probei întregi, pe un caz. */
export function abatereaCubicelor(caz: CazCubice): number {
  const forma = bula(caz.n, 40, caz.samanta);
  const d = piesa(forma, { ...ID }, 600, 300, 0, { latura: caz.latura });
  const exacta = conturElement({ forma, matrice: { a: 1, b: 0, c: 0, d: 1, e: 600, f: 300 } });
  let abatere = 0;
  for (const p of puncte(d)) abatere = Math.max(abatere, Math.abs(distantaLaContur(p, exacta) - 3));
  return abatere;
}

const numeCaz = (c: CazCubice): string => `${c.n} cubice, ${c.latura}, ${c.samanta}`;

/** Înregistrează proba unei părți (apelată din fișierul ei). */
export function probaCubicelor(parte: number): void {
  if (parte === 1) {
    test('căile netede din multe cubice, împărțirea: exact câte un fișier pe parte, cele 24 de cazuri acoperite, fiecare o dată', () => {
      const cazuri = cazurileCubicelor();
      assert.equal(cazuri.length, 24);
      cereImpartirea(import.meta.dirname, /^cale\.recenzie\.cubice\..*\.test\.ts$/, (n) => `cale.recenzie.cubice.${n}.test.ts`, PARTI_CUBICE, cazuri.map(numeCaz));
    });
  }
  test(`căile netede din multe cubice se taie (buclele minuscule ale offsetului scoase), la raza frezei de cubica exactă: partea ${parte} din ${PARTI_CUBICE}`, () => {
    const cazuri = cazurilePartii(cazurileCubicelor(), parte, PARTI_CUBICE);
    assert.equal(cazuri.length, 24 / PARTI_CUBICE);
    for (const caz of cazuri) {
      const abatere = abatereaCubicelor(caz);
      assert.ok(abatere <= TOLERANTA_PROIECT + 1e-6, `${numeCaz(caz)}: ${abatere}`);
    }
  });
}
