/**
 * Documentele de referință ale bancului vizual (felia 2.9, `PLAN.md` §4.5), fiecare cu martorul lui negativ: aceeași
 * formă cu o singură greșeală, care trebuie să arate greșit și în poză, și în cifră. Documentele sunt v10, întregi, ca
 * cele salvate de aplicație.
 */
import type { Document } from '../../src/model/document.ts';
import { documentPlaca02 } from '../placi/placa-02/genereaza.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 } as const;
const op = (id: string, latura: string, adancime: number, pas: number, extra: object = {}) => ({
  id, tip: 'profil', noduri: [id], scula: { ...SCULA }, latura, sens: 'urcare', adancime, pas, urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});

/** Placa 1 (ADR 0024): insula 100 × 60 pe exterior, 3 mm; gaura Ø30 pe interior, 8 mm; foaia 140 × 100 × 18. */
function placa01(laturaInsulei: 'exterior' | 'interior'): Document {
  return {
    schema: 10, rev: 1,
    piese: [
      { id: 'e1', radacina: { tip: 'element', id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...I } }, operatii: [op('e1', laturaInsulei, 3, 3)] },
      { id: 'e2', radacina: { tip: 'element', id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...I } }, operatii: [op('e2', 'interior', 8, 4)] },
    ],
    foi: [{ id: 'f1', stoc: { latime: 140, inaltime: 100, grosime: 18 }, instante: [
      { id: 'e1', piesa: 'e1', x: 20, y: 20, rotire: 0 }, { id: 'e2', piesa: 'e2', x: 70, y: 50, rotire: 0 },
    ] }],
  } as unknown as Document;
}

/** O linie de 100 mm, deschisă, tăiată pe o parte (ADR 0037 §3): pe stânga, scula stă deasupra ei (Y 53). */
function liniePeOParte(latura: 'stanga' | 'dreapta'): Document {
  return {
    schema: 10, rev: 1,
    piese: [{
      id: 'l',
      radacina: { tip: 'element', id: 'l', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 100, y: 0 }, s: { tip: 'L' } }] }, matrice: { ...I } },
      operatii: [op('l', latura, 3, 3)],
    }],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'l', piesa: 'l', x: 50, y: 50, rotire: 0 }] }],
  } as unknown as Document;
}

/** Placa 2 (`docs/etape/placa-02.md`); martorul: gaura fără dog-bone. */
function placa02(cuDogBone: boolean): Document {
  const d = documentPlaca02();
  if (cuDogBone) return { ...d, rev: 1 };
  return {
    ...d, rev: 1,
    piese: d.piese.map((p) => (p.id !== 'piesa' ? p : { ...p, operatii: p.operatii.map((o) => (o.id === 'gaura' ? { ...o, colturi: null } : o)) })),
  };
}

export type Caz = {
  readonly id: string;
  readonly titlu: string;
  readonly doc: Document;
  readonly martor: Document;
  /** Ce schimbă martorul (o singură greșeală). */
  readonly greseala: string;
  /** Cifra, din G-code-ul exportat de aplicație, și valoarea ei pe hârtie. */
  readonly cifra: (gcode: string) => string;
  readonly hartie: string;
  /** Punctele foii (mm) pe care traseul trebuie să cadă în poză; la martor, pe primul nu. */
  readonly puncte: ReadonlyArray<readonly [number, number]>;
  /** Fereastra foii (mm) arătată mărit, unde se vede greșeala martorului: x0, y0, x1, y1. */
  readonly detaliu: readonly [number, number, number, number];
};

/** Capetele mișcărilor de tăiere (G1, G2, G3) ale secțiunii care începe cu `prefix` (comentariul etichetei). */
function sectiune(gcode: string, prefix: string): { minX: number; maxX: number; minY: number; maxY: number; puncte: Array<[number, number]> } {
  let in_ = false, x = Number.NaN, y = Number.NaN;
  const k = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, puncte: [] as Array<[number, number]> };
  for (const l of gcode.split('\n')) {
    if (l.startsWith('(')) { in_ = l.startsWith(prefix); continue; }
    const mx = /X(-?\d+\.\d+)/.exec(l), my = /Y(-?\d+\.\d+)/.exec(l);
    if (mx) x = Number(mx[1]);
    if (my) y = Number(my[1]);
    if (!in_ || !/^G[123] /.test(l) || (!mx && !my)) continue;
    k.minX = Math.min(k.minX, x); k.maxX = Math.max(k.maxX, x); k.minY = Math.min(k.minY, y); k.maxY = Math.max(k.maxY, y);
    k.puncte.push([x, y]);
  }
  return k;
}

const mm = (x: number): string => (Number.isFinite(x) ? x.toFixed(3) : '—');

export const CAZURI: readonly Caz[] = [
  {
    id: 'placa-01',
    titlu: 'Placa 1: insula 100 × 60 pe exterior, gaura Ø30 pe interior (Ø6)',
    doc: placa01('exterior'),
    martor: placa01('interior'),
    greseala: 'insula tăiată pe interior',
    cifra: (g) => {
      const k = sectiune(g, '(e1/e1:');
      return `traseul insulei: ${mm(k.maxX - k.minX)} × ${mm(k.maxY - k.minY)} mm`;
    },
    hartie: 'traseul insulei: 106.000 × 66.000 mm',
    puncte: [[70, 17], [17, 50], [123, 50]],
    detaliu: [8, 8, 48, 38],
  },
  {
    id: 'linie-stanga',
    titlu: 'O linie deschisă de 100 mm, tăiată pe stânga (scula deasupra, la R)',
    doc: liniePeOParte('stanga'),
    martor: liniePeOParte('dreapta'),
    greseala: 'linia tăiată pe dreapta',
    cifra: (g) => {
      const k = sectiune(g, '(l/l:');
      return `traseul: Y de la ${mm(k.minY)} la ${mm(k.maxY)} mm`;
    },
    hartie: 'traseul: Y de la 53.000 la 53.000 mm',
    puncte: [[100, 53], [60, 53]],
    detaliu: [36, 38, 76, 62],
  },
  {
    id: 'placa-02',
    titlu: 'Placa 2: piesa R10 cu urechi, gaura 40 × 30 cu dog-bone, cepul, logoul SVG de 80 mm',
    doc: placa02(true),
    martor: placa02(false),
    greseala: 'gaura fără dog-bone',
    cifra: (g) => {
      const gaura = sectiune(g, '(piesa/gaura:');
      const colturi = gaura.puncte.filter(([x, y]) => (x === 62.121 || x === 97.879) && (y === 47.121 || y === 72.879)).length;
      const logo = sectiune(g, '(logo/c1:');
      return `dog-bone: ${colturi} treceri prin colțuri; logoul: ${mm(logo.maxX - logo.minX)} mm pe centrul frezei`;
    },
    hartie: 'dog-bone: 12 treceri prin colțuri; logoul: 86.000 mm pe centrul frezei',
    puncte: [[62.121, 47.121], [97.879, 72.879]],
    detaliu: [54, 40, 78, 58],
  },
];
