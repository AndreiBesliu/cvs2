/**
 * Scriitorul SVG al exportului 2D (ADR 0088): foaia în mm (`width` / `height` în mm, `viewBox` de aceeași mărime, deci
 * o unitate = 1 mm), cu axa Y întoarsă (SVG-ul are Y în jos, foaia în sus): y′ = înălțimea − y. Un strat = un grup
 * Inkscape (`inkscape:groupmode="layer"`), doar pentru straturile folosite. Fiecare entitate e exactă: cercul e
 * `<circle>`, arcul e `A` cu raza lui, cubica e `C`. Sensul arcului: după întoarcerea axei, un arc trigonometric al foii
 * (bulge > 0) se vede tot trigonometric, adică în sensul unghiurilor negative ale SVG-ului, deci steagul `sweep` e 0.
 */
import { STRATURI, type Entitate, type Strat, type VectoriFoaie } from './vectori.ts';

/** Culoarea fiecărui strat (aceeași familie ca în DXF: exteriorul roșu, interiorul albastru…). */
export const CULORI_SVG: Readonly<Record<Strat, string>> = {
  EXTERIOR: '#d62728', INTERIOR: '#1f77b4', PE_LINIE: '#2ca02c', PE_O_PARTE: '#ff7f0e', BUZUNAR: '#9467bd', GAURIRE: '#17becf',
  FARA_OPERATIE: '#000000', FOAIE: '#7f7f7f',
};

/** Un număr cu cel mult 6 zecimale (1 nm), fără zerourile de la coadă și fără „-0”. */
export function nr(x: number): string {
  const s = x.toFixed(6).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
}

function cale(e: Extract<Entitate, { fel: 'polilinie' | 'spline' }>, H: number): string {
  const y = (v: number): number => H - v;
  if (e.fel === 'spline') {
    const p = e.puncte;
    const d = [`M${nr(p[0]!.x)} ${nr(y(p[0]!.y))}`];
    for (let k = 1; k + 2 < p.length; k += 3) {
      d.push(`C${nr(p[k]!.x)} ${nr(y(p[k]!.y))} ${nr(p[k + 1]!.x)} ${nr(y(p[k + 1]!.y))} ${nr(p[k + 2]!.x)} ${nr(y(p[k + 2]!.y))}`);
    }
    return d.join('');
  }
  const v = e.varfuri;
  const d = [`M${nr(v[0]!.x)} ${nr(y(v[0]!.y))}`];
  const n = e.inchis ? v.length : v.length - 1;
  for (let i = 0; i < n; i++) {
    const a = v[i]!, b = v[(i + 1) % v.length]!;
    if (a.bulge === 0) {
      d.push(`L${nr(b.x)} ${nr(y(b.y))}`);
    } else {
      const teta = 4 * Math.atan(Math.abs(a.bulge));
      const raza = Math.hypot(b.x - a.x, b.y - a.y) / (2 * Math.sin(teta / 2));
      d.push(`A${nr(raza)} ${nr(raza)} 0 ${teta > Math.PI ? 1 : 0} ${a.bulge > 0 ? 0 : 1} ${nr(b.x)} ${nr(y(b.y))}`);
    }
  }
  if (e.inchis) d.push('Z');
  return d.join('');
}

export function scrieSvg(v: VectoriFoaie): string {
  const H = v.inaltime;
  const linii = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${nr(v.latime)}mm" height="${nr(H)}mm" viewBox="0 0 ${nr(v.latime)} ${nr(H)}">`,
  ];
  for (const s of STRATURI) {
    const din = v.entitati.filter((e) => e.strat === s);
    if (din.length === 0) continue;
    linii.push(`<g id="${s}" inkscape:groupmode="layer" inkscape:label="${s}" fill="none" stroke="${CULORI_SVG[s]}" stroke-width="0.1">`);
    for (const e of din) {
      linii.push(e.fel === 'cerc'
        ? `<circle cx="${nr(e.centru.x)}" cy="${nr(H - e.centru.y)}" r="${nr(e.raza)}"/>`
        : `<path d="${cale(e, H)}"/>`);
    }
    linii.push('</g>');
  }
  linii.push('</svg>', '');
  return linii.join('\n');
}
