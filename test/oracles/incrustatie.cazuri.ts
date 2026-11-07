/**
 * Cazurile pe hârtie ale oracolului potrivirii (ADR 0170): desenul (poligoane pe foaie, în mm), frezele și valorile, cu ce
 * trebuie să iasă, socotit aici din model, nu din cod: S = D − g; banda de contact S·t de la contur; fundul plat unde
 * d ≥ D·t; spațiul dintre plăci H. t = tan(θ/2). Un caz nou = rândul lui aici (desenul, valorile) și, dacă are ceva deosebit,
 * cifra lui pe hârtie în `hartie`.
 */
import type { DesenO, PunctO } from './incrustatie.ts';

export type FrezaV = { readonly diametru: number; readonly unghi: number };
export type CazIncrustatie = {
  readonly id: string;
  /** Desenul pe foaie (regiunea par-impar); pentru documentul aplicației, aceleași poligoane ca forme „cale”, sau cercul. */
  readonly desen: DesenO;
  /** Un cerc (documentul îl ține ca formă „cerc”; oracolul îl citește ca poligonul de mai sus, cu 720 de laturi). */
  readonly cerc?: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly v: FrezaV;
  /** Freza dreaptă (fundul plat și fața dopului) și pasul ei lateral. */
  readonly dreapta: { readonly diametru: number; readonly pasLateral: number };
  readonly D: number; readonly g: number; readonly H: number; readonly margine: number; readonly pas: number;
  /** Ce spune hârtia pe lângă S = D − g (de ce e cazul aici). */
  readonly hartie: string;
  /** Are fundul locașului plat (undeva d ≥ D·t)? */
  readonly fundPlat: boolean;
};

const dreptunghi = (x: number, y: number, w: number, h: number): PunctO[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const poligonCerc = (cx: number, cy: number, r: number, n = 720): PunctO[] =>
  Array.from({ length: n }, (_, k): PunctO => [cx + r * Math.cos((2 * Math.PI * k) / n), cy + r * Math.sin((2 * Math.PI * k) / n)]);
function stea(cx: number, cy: number, R: number, r: number): PunctO[] {
  const p: PunctO[] = [];
  for (let k = 0; k < 10; k++) {
    const u = Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 === 0 ? R : r;
    p.push([cx + q * Math.cos(u), cy + q * Math.sin(u)]);
  }
  return p;
}

const V60 = { diametru: 6, unghi: 60 } as const;
const DREAPTA = { diametru: 3, pasLateral: 1.2 } as const;

export const CAZURI_INCRUSTATIE: readonly CazIncrustatie[] = [
  {
    id: 'dreptunghi', desen: [dreptunghi(20, 20, 12, 6)], v: V60, dreapta: DREAPTA, D: 3, g: 0.5, H: 2, margine: 5, pas: 1.5,
    fundPlat: true,
    hartie: 'exemplul din ADR: t = 0,5774; S = 2,5; contactul pe S·t = 1,443 mm; fundul plat de la D·t = 1,732 (lățimea 6 > 3,464); dopul săpat la 4,5 sub conul de 5,196',
  },
  {
    id: 'deskproto-cerc', desen: [poligonCerc(60, 30, 5)], cerc: { cx: 60, cy: 30, r: 5 },
    v: { diametru: 8, unghi: 90 }, dreapta: DREAPTA, D: 4, g: 1, H: 1, margine: 5, pas: 2, fundPlat: true,
    hartie: 'criteriul din prag (DeskProto): V90, adâncimea 4, spațiul 1 → desenul dopului coborât cu 3, suprapunerea 3,0, câte 1,0 mm pentru clei și fierăstrău; conul V90 Ø8 are exact 4',
  },
  {
    id: 'stea', desen: [stea(100, 30, 9, 4)], v: V60, dreapta: { diametru: 2, pasLateral: 0.8 }, D: 2, g: 0.4, H: 1.5, margine: 5,
    pas: 1, fundPlat: true,
    hartie: 'S = 1,6; vârfurile convexe: d → 0, deci pereții se ating până în vârf; colțurile concave dau axa medială ramificată',
  },
  {
    id: 'inel', desen: [dreptunghi(130, 20, 14, 14), dreptunghi(134, 24, 6, 6)], v: V60, dreapta: DREAPTA, D: 3, g: 0.5, H: 2,
    margine: 5, pas: 1.5, fundPlat: true,
    hartie: 'o literă cu gol (pătratul în pătrat): insula de lemn a locașului intră în golul dopului; banda are 4 mm (d ≤ 2 pe laturi, 2,343 în colțuri), deci fundul plat (d ≥ 1,732) e o fâșie de 0,536 mm, unde freza dreaptă Ø3 nu încape: o fac inelele frezei V',
  },
  {
    id: 'ingust', desen: [dreptunghi(20, 60, 30, 2.4)], v: V60, dreapta: DREAPTA, D: 3, g: 0.5, H: 2, margine: 5, pas: 1.5,
    fundPlat: false,
    hartie: 'trăsătura îngustă: d ≤ 1,2, deci șanțul are cel mult 1,2·1,732 = 2,078 < S = 2,5: dopul umple șanțul fără joc, pereții se ating peste tot; locașul n-are fund plat (fără freza dreaptă)',
  },
];
