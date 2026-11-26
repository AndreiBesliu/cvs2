/**
 * Ajutoarele probelor urechilor pe lucrarea întreagă (ADR 0211): documentul exemplului din ADR (dreptunghiul 80 × 30 tăiat cu
 * Ø3,175 pe foaia de 18 mm, cu urechi de 6 × 2) și citirea palierelor și a pornirilor din mișcările programului. Aici, ca o
 * probă să nu importe alta (node:test ar rula și testele ei).
 */
import type { Document, Operatie } from '../../src/model/document.ts';
import type { Miscare } from '../../src/ir/ir.ts';

export const aproape = (a: number, b: number, e = 1e-9): boolean => Math.abs(a - b) <= e;

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** Colțul stânga-jos al piesei pe foaie și raza frezei. */
export const X0 = 50, Y0 = 50;
export const R = 3.175 / 2;
/** Adâncimea vârfului urechilor: foaia de 18 minus puntea de 2. */
export const VARF = 16;

export type Radacina = Document['piese'][number]['radacina'];
export const DREPTUNGHI: Radacina = { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { ...I } };

/** Documentul v26 cu o piesă (implicit, dreptunghiul 80 × 30) la (X0, Y0), tăiată pe dinafară cu Ø3,175, în trei treceri. */
export function documentCu(op: Partial<Operatie>, forma: Radacina = DREPTUNGHI): Document {
  return {
    schema: 31, rev: 0,
    piese: [{
      id: 'p', radacina: forma,
      operatii: [{
        id: 'x1', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza 1/8', diametru: 3.175 }, latura: 'exterior', sens: 'urcare',
        adancime: 18, pas: 6, urechi: { numar: 2, latime: 6, grosime: 2 }, rampa: null, intrari: null, colturi: null, ...op,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p', x: X0, y: Y0, rotire: 0 }] }],
  };
}

export type Palier = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly lungime: number };

/** Palierele (mișcările la Z = −vârf, în plan) și pornirile (XY-ul și Z-ul fiecărei plonjări). */
export function citeste(miscari: readonly Miscare[], varf: number): { readonly paliere: Palier[]; readonly porniri: { x: number; y: number; z: number }[] } {
  let x = 0, y = 0, z = 5;
  const paliere: Palier[] = [];
  const porniri: { x: number; y: number; z: number }[] = [];
  let curent: { x0: number; y0: number; x1: number; y1: number; lungime: number } | null = null;
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const x1 = m.la.X ?? x, y1 = m.la.Y ?? y, z1 = m.la.Z ?? z;
    if (m.tip === 'taiere' && x1 === x && y1 === y && z1 < z && z1 < 0) porniri.push({ x, y, z: z1 });
    const pePalier = m.tip === 'taiere' && aproape(z, -varf) && aproape(z1, -varf) && Math.hypot(x1 - x, y1 - y) > 1e-9;
    if (pePalier) {
      const L = Math.hypot(x1 - x, y1 - y);
      if (curent && aproape(curent.x1, x) && aproape(curent.y1, y)) Object.assign(curent, { x1, y1, lungime: curent.lungime + L });
      else { curent = { x0: x, y0: y, x1, y1, lungime: L }; paliere.push(curent); }
    } else if (m.tip !== 'taiere' || !aproape(z1, -varf)) {
      curent = null;
    }
    x = x1; y = y1; z = z1;
  }
  return { paliere, porniri };
}

/** Palierele, ca [mijlocul pe X, mijlocul pe Y, lungimea], față de colțul piesei, sortate după X, apoi după Y (la micron). */
export function mijloace(p: readonly Palier[]): number[][] {
  const r = (v: number): number => Math.round(v * 1000);
  return p.map((q) => [(q.x0 + q.x1) / 2 - X0, (q.y0 + q.y1) / 2 - Y0, q.lungime])
    .sort((a, b) => r(a[0] as number) - r(b[0] as number) || r(a[1] as number) - r(b[1] as number));
}
