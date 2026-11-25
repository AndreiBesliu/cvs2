/**
 * Scriitorul EPS al exportului 2D (ADR 0089): PostScript încapsulat (EPSF-3.0, nivelul 2), cutia (BoundingBox în puncte
 * întregi, HiResBoundingBox exactă) cât cutia foii, conținutul în mm (`scale` cu 72 / 25,4). EPS-ul n-are straturi: fiecare
 * rol își păstrează culoarea și un comentariu cu numele lui. Căile, ca în PDF (`drumuri.ts`); numai ASCII. Cotele (ADR 0330
 * §7) au culoarea și grosimea din setări; capetele pline se umplu, iar punctele sunt discuri (calea trasă cu lățimea lor).
 */
import { CULORI_SVG, nr } from './svgExport.ts';
import { drumEntitate, rgb, type Comanda } from './drumuri.ts';
import { PT_PE_MM } from './pdfExport.ts';
import { STRATURI, type VectoriFoaie } from './vectori.ts';

function cale(d: readonly Comanda[]): string {
  return d.map((c) => (c.op === 'h' ? 'closepath'
    : c.op === 'c' ? `${nr(c.x1)} ${nr(c.y1)} ${nr(c.x2)} ${nr(c.y2)} ${nr(c.x)} ${nr(c.y)} curveto`
      : `${nr(c.x)} ${nr(c.y)} ${c.op === 'm' ? 'moveto' : 'lineto'}`)).join('\n');
}

export function scrieEps(v: VectoriFoaie, titlu: string): string {
  const c = v.cutie;
  const pt = [c.minX, c.minY, c.maxX, c.maxY].map((x) => x * PT_PE_MM);
  const linii = [
    '%!PS-Adobe-3.0 EPSF-3.0',
    '%%Creator: CNC Vector Studio',
    `%%Title: ${titlu}`,
    `%%BoundingBox: ${Math.floor(pt[0]!)} ${Math.floor(pt[1]!)} ${Math.ceil(pt[2]!)} ${Math.ceil(pt[3]!)}`,
    `%%HiResBoundingBox: ${pt.map((x) => nr(x)).join(' ')}`,
    '%%LanguageLevel: 2',
    '%%DocumentData: Clean7Bit',
    '%%EndComments',
    'gsave',
    `${PT_PE_MM} ${PT_PE_MM} scale`,
    '0.1 setlinewidth 1 setlinecap 1 setlinejoin',
  ];
  for (const s of STRATURI) {
    const din = v.entitati.filter((e) => e.strat === s);
    if (din.length === 0) continue;
    const cote = s === 'COTE' ? v.stratCote : undefined;
    linii.push(`% Stratul ${cote?.nume ?? s}`, `${rgb(cote?.culoare ?? CULORI_SVG[s])} setrgbcolor`);
    if (cote) linii.push('gsave', `${nr(cote.grosime)} setlinewidth`);
    for (const e of din) {
      if (e.fel === 'plin') linii.push('newpath', cale(drumEntitate(e)), 'fill');
      else if (e.fel === 'polilinie' && e.latime) linii.push('gsave', `${nr(e.latime)} setlinewidth`, 'newpath', cale(drumEntitate(e)), 'stroke', 'grestore');
      else linii.push('newpath', cale(drumEntitate(e)), 'stroke');
    }
    if (cote) linii.push('grestore');
  }
  linii.push('grestore', 'showpage', '%%EOF', '');
  return linii.join('\n');
}
