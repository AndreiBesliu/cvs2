/**
 * Documentul unui caz al incrustației în V (`test/oracles/incrustatie.cazuri.ts`), comun probelor potrivirii (ADR 0170) și
 * benzii cu decupare (ADR 0172), ca o probă să nu importe alta (node:test ar rula și testele ei). Și Z-urile unui program, comune
 * probelor supracursei pe dopuri (ADR 0176). Și documentul unui caz cu pereți drepți (`incrustatieDreapta.cazuri.ts`), comun
 * probei potrivirii lui (ADR 0171) și celei a secțiunii (ADR 0179). Și documentul unui caz în trepte, cu măsurarea lui pe
 * oracol (`incrustatieDreapta.trepte.cazuri.ts`), comune probei treptelor (ADR 0175) și celei a secțiunii lor (12.1↑e-4).
 */
import type { CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';
import type { CazDreapta, FrezaPlataCaz } from '../oracles/incrustatieDreapta.cazuri.ts';
import type { CazTrepte } from '../oracles/incrustatieDreapta.trepte.cazuri.ts';
import { masoaraPotrivireaTrepte, type MasuraTrepte } from '../oracles/incrustatieDreapta.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const sculaPlata = (f: FrezaPlataCaz) => ({ numar: f.numar, nume: 'freza plata', diametru: f.diametru });

/** Documentul v21 al unui caz cu pereți drepți: o piesă cu desenul și buzunarul cu incrustația, pe o foaie de 200 × 150 × 18. */
export function documentDrept(c: CazDreapta): unknown {
  const noduri = c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const [prima, ...rest] = c.locas;
  const operatie = {
    id: 'inc', tip: 'buzunar', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.D, pas: c.pas,
    scula: sculaPlata(prima!), pasLateral: prima!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
    ...(rest.length > 0 ? { rest: rest.map((r) => ({ scula: sculaPlata(r), pasLateral: r.pasLateral })) } : {}),
    incrustatie: {
      fel: 'drept', jocLateral: c.c, dop: c.dop, sprijin: c.sprijin, joc: c.g, fierastrau: c.H, margine: c.margine,
      ...(c.frezeDop ? { frezeDop: c.frezeDop.map((f) => ({ scula: sculaPlata(f), pasLateral: f.pasLateral })) } : {}),
    },
  };
  return {
    schema: 21, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii: [operatie] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

/**
 * Z-urile scrise în mutările unui program G-code (fără comentarii), rotunjite la micron: cel mai mic e fundul celei mai adânci
 * treceri, iar vârful punților (palierul lor) e unul dintre ele.
 */
export function zuriProgram(text: string): Set<number> {
  const z = new Set<number>();
  for (const linie of text.split('\n')) {
    if (linie.startsWith('(') || linie.startsWith(';')) continue;
    for (const m of linie.matchAll(/Z(-?\d*\.?\d+)/g)) z.add(Math.round(Number(m[1]) * 1000) / 1000);
  }
  return z;
}

/** Fundul celei mai adânci treceri a unui program (Z-ul cel mai mic), în mm. */
export const zMinim = (text: string): number => Math.min(...zuriProgram(text));

/** Forma „cale” închisă a unui poligon, în coordonatele foii (matricea identitate). */
const cale = (pol: readonly (readonly [number, number])[]) => ({
  tip: 'cale', inchis: true, varfuri: pol.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })),
});

/**
 * Documentul v20 al unui caz: o piesă cu desenul și operația de incrustație, pe o foaie de 200 × 150 × 18. Fără
 * incrustație (`cuIncrustatie: false`), operația e un V-carve obișnuit al desenului: controlul negativ.
 */
export function documentCaz(c: CazIncrustatie, cuIncrustatie = true): unknown {
  const noduri = c.cerc
    ? [{ tip: 'element', id: 'a', matrice: { ...I, e: c.cerc.cx, f: c.cerc.cy }, forma: { tip: 'cerc', raza: c.cerc.r } }]
    : c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const operatie = {
    id: 'inc', tip: 'vcarve', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.D, pas: c.pas,
    scula: { numar: 2, nume: `freza V${c.v.unghi}`, diametru: c.v.diametru, forma: { tip: 'v', unghi: c.v.unghi } },
    urechi: null, rampa: null, intrari: null, colturi: null,
    fundPlat: { scula: { numar: 1, nume: 'freza dreapta', diametru: c.dreapta.diametru }, pasLateral: c.dreapta.pasLateral },
    ...(cuIncrustatie ? { incrustatie: { fel: 'v', joc: c.g, fierastrau: c.H, margine: c.margine, jurDop: 'fata' } } : {}),
  };
  return {
    schema: 20, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii: [operatie] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

/**
 * Documentul v26 al unui caz în trepte: o piesă cu desenul și buzunarul cu incrustația în trepte, pe o foaie de 200 × 150 × 18
 * (la gaură, groasă cât D, iar operația scrie adâncimea 3, pe care gaura o ignoră); `peste`: câmpuri ale incrustației schimbate
 * (unul dat `undefined` pleacă), `operatie`: ale operației.
 */
export function documentTrepte(c: CazTrepte, peste: Record<string, unknown> = {}, operatie: Record<string, unknown> = {}): unknown {
  const noduri = c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const [prima, ...rest] = c.locas;
  const incrustatie: Record<string, unknown> = {
    fel: 'drept', jocLateral: c.c, dop: c.dop, sprijin: c.sprijin, joc: c.g, fierastrau: c.H, margine: c.margine,
    treapta: { adancime: c.d, latime: c.s, ...(c.spre === 'exterior' ? { spre: 'exterior' } : {}) },
    ...(c.gaura ? { locas: 'gaura' } : {}),
  };
  for (const [k, v] of Object.entries(peste)) {
    if (v === undefined) delete incrustatie[k];
    else incrustatie[k] = v;
  }
  return {
    schema: 26, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri },
      operatii: [{
        id: 'inc', tip: 'buzunar', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.gaura ? 3 : c.D, pas: c.pas,
        scula: sculaPlata(prima!), pasLateral: prima!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
        ...(rest.length > 0 ? { rest: rest.map((r) => ({ scula: sculaPlata(r), pasLateral: r.pasLateral })) } : {}),
        incrustatie,
        ...operatie,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: c.gaura ? c.D : 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

/** Sculele bucăților unui program, în ordine: cea de la pornire, apoi fiecare `T… M6`, după numărul lor. */
export function sculeProgram(text: string, freze: readonly FrezaPlataCaz[]): SculaOracol[] {
  const dupaNumar = new Map(freze.map((f) => [f.numar, f.diametru]));
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  const ramase = freze.map((f) => f.numar).filter((n) => n !== m6[0]);
  const pornire = m6.length === 0 ? freze[0]!.numar : (ramase[0] ?? freze[0]!.numar);
  return [pornire, ...m6].map((n) => ({ tip: 'plata', diametru: dupaNumar.get(n) ?? NaN }));
}

/**
 * Potrivirea unui caz în trepte pe oracol, din textul celor două programe. Celula grilei grosiere: 0,1 mm la Ø6 (desene mari),
 * 0,05 la frezele mici; bisecția face punctele pereților exacte.
 */
export const masoaraTrepte = (c: CazTrepte, locas: string, dop: string): MasuraTrepte => masoaraPotrivireaTrepte(
  { text: locas, scule: sculeProgram(locas, c.locas) }, { text: dop, scule: sculeProgram(dop, c.locas) }, c.desen,
  {
    d: c.d, D: c.D, tija: c.tija, h: c.h, dop: c.dop, margine: c.margine, latire: c.spre === 'exterior' ? c.s : 0,
    celula: c.locas[0]!.diametru >= 6 ? 0.1 : 0.05,
  },
);
