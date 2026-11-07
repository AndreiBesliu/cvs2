/**
 * Generatorii corpusurilor tăierii (ADR 0180): formele din sămânță ale oracolelor (linia dreaptă, felia 10.3↑; cuțitul-formă și
 * „Taie la intersecții”, felia 10.3↑b), aceleași la fiecare rulare.
 */
import type { FormaDoc, Nod, Operatie, VarfDoc } from '../../src/model/document.ts';
import { ID } from './ajutor-document.ts';

/** Generatorul din sămânță (mulberry32): același corpus la fiecare rulare. */
export function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const L = { tip: 'L' } as const;
export type Gen = (r: () => number) => FormaDoc;
export const intre = (r: () => number, a: number, b: number): number => a + (b - a) * r();

export const GENERATORI: Record<string, Gen> = {
  dreptunghi: (r) => {
    const w = intre(r, 20, 120), h = intre(r, 20, 120);
    return { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: r() < 0.5 ? 0 : intre(r, 0, 0.4 * Math.min(w, h)) };
  },
  cerc: (r) => ({ tip: 'cerc', raza: intre(r, 10, 60) }),
  poligon: (r) => {
    const n = 5 + Math.floor(r() * 36);
    const varfuri: VarfDoc[] = [];
    for (let k = 0; k < n; k++) {
      const u = (2 * Math.PI * k) / n, rz = intre(r, 30, 60);
      varfuri.push({ p: { x: rz * Math.cos(u), y: rz * Math.sin(u) }, s: L });
    }
    return { tip: 'cale', inchis: true, varfuri };
  },
  cubice: (r) => {
    const n = 4 + Math.floor(r() * 4);
    const p = Array.from({ length: n }, (_, k) => {
      const u = (2 * Math.PI * k) / n, rz = intre(r, 30, 55);
      return { x: rz * Math.cos(u), y: rz * Math.sin(u) };
    });
    // Catmull-Rom închis, în cubice: mânerele din vecini.
    const varfuri: VarfDoc[] = p.map((q, k) => {
      const prev = p[(k - 1 + n) % n] as { x: number; y: number }, urm = p[(k + 1) % n] as { x: number; y: number }, urm2 = p[(k + 2) % n] as { x: number; y: number };
      return {
        p: { x: q.x, y: q.y },
        s: { tip: 'C', c1: { x: q.x + (urm.x - prev.x) / 6, y: q.y + (urm.y - prev.y) / 6 }, c2: { x: urm.x - (urm2.x - q.x) / 6, y: urm.y - (urm2.y - q.y) / 6 } },
      };
    });
    return { tip: 'cale', inchis: true, varfuri };
  },
  arce: (r) => {
    const n = 4 + Math.floor(r() * 5);
    const varfuri: VarfDoc[] = [];
    for (let k = 0; k < n; k++) {
      const u = (2 * Math.PI * k) / n;
      varfuri.push({ p: { x: 50 * Math.cos(u), y: 50 * Math.sin(u) }, s: { tip: 'A', bulge: (r() < 0.5 ? -1 : 1) * intre(r, 0.1, 0.5) } });
    }
    return { tip: 'cale', inchis: true, varfuri };
  },
  linii: (r) => {
    const n = 3 + Math.floor(r() * 6);
    return { tip: 'cale', inchis: false, varfuri: Array.from({ length: n }, (_, k): VarfDoc => ({ p: { x: k * intre(r, 10, 30) - 60, y: intre(r, -50, 50) }, s: L })) };
  },
  curba: (r) => {
    const n = 3 + Math.floor(r() * 3);
    const varfuri: VarfDoc[] = Array.from({ length: n }, (_, k): VarfDoc => {
      const x = k * 40 - 60, y = intre(r, -40, 40);
      return { p: { x, y }, s: { tip: 'C', c1: { x: x + 13, y: y + intre(r, -40, 40) }, c2: { x: x + 27, y: y + intre(r, -40, 40) } } };
    });
    const ultim = varfuri[n - 1] as VarfDoc;
    varfuri[n - 1] = { ...ultim, s: L };
    return { tip: 'cale', inchis: false, varfuri };
  },
};

/** Un inel: exteriorul (cerc sau dreptunghi) și o gaură, cu rolul exterior (golul pe interior). */
export function inel(r: () => number, id: string, scula: Operatie['scula']): { readonly radacina: Nod; readonly operatii: Operatie[] } {
  const R = intre(r, 40, 60), g = intre(r, 8, R - 15);
  const exterior: FormaDoc = r() < 0.5 ? { tip: 'cerc', raza: R } : { tip: 'dreptunghi', latime: 2 * R, inaltime: 2 * R, razaColt: 0 };
  const mExt = exterior.tip === 'cerc' ? { ...ID } : { ...ID, e: -R, f: -R };
  const op = (oid: string, latura: 'exterior' | 'interior', noduri: string[]): Operatie => ({
    id: oid, tip: 'profil', noduri, scula, latura, sens: 'urcare', adancime: 5, pas: 2.5, urechi: null, rampa: null, intrari: null, colturi: null,
  });
  return {
    radacina: {
      tip: 'grup', id, matrice: { ...ID }, copii: [
        { tip: 'element', id: `${id}o`, forma: exterior, matrice: mExt },
        { tip: 'element', id: `${id}g`, forma: { tip: 'cerc', raza: g }, matrice: { ...ID, e: intre(r, -3, 3), f: intre(r, -3, 3) } },
      ],
    },
    operatii: [op('exterior', 'exterior', [`${id}o`]), op('interior', 'interior', [`${id}g`])],
  };
}

export const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
export const NUME = Object.keys(GENERATORI);
