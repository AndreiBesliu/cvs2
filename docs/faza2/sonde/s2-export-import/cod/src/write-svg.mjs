// write-svg.mjs - scriitor SVG propriu: 1 unitate = 1 mm (width/height in mm + viewBox), Y intors explicit
// in coordonate (fara transform pe radacina), cerc -> <circle>, arc -> comanda A, Bezier -> C,
// straturi -> <g> cu inkscape:groupmode="layer".
import { segStart, segEnd, TAU } from './geom.mjs';

const f = (v) => { const r = Math.round(v * 1e6) / 1e6; return (Object.is(r, -0) ? 0 : r).toString(); };

export function writeSvg(doc) {
  const [W, H] = doc.page;
  const Y = (y) => H - y;
  const P = (p) => `${f(p[0])},${f(Y(p[1]))}`;
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" width="${f(W)}mm" height="${f(H)}mm" viewBox="0 0 ${f(W)} ${f(H)}">`);
  for (const [layer] of doc.layers) {
    out.push(`  <g id="${layer}" inkscape:groupmode="layer" inkscape:label="${layer}" fill="none" stroke="#000" stroke-width="0.2">`);
    for (const sh of doc.shapes.filter((s) => s.layer === layer)) {
      const sp0 = sh.subpaths[0];
      // cerc singur -> <circle>
      if (sh.subpaths.length === 1 && sp0.segs.length === 1 && sp0.segs[0].k === 'arc' && Math.abs(Math.abs(sp0.segs[0].da) - TAU) < 1e-12) {
        const a = sp0.segs[0];
        out.push(`    <circle cx="${f(a.c[0])}" cy="${f(Y(a.c[1]))}" r="${f(a.r)}"/>`);
        continue;
      }
      let d = '';
      for (const sp of sh.subpaths) {
        d += `M${P(segStart(sp.segs[0]))}`;
        for (const s of sp.segs) d += seg(s, P);
        if (sp.closed) d += 'Z';
      }
      out.push(`    <path d="${d}"/>`);
    }
    out.push('  </g>');
  }
  out.push('</svg>');
  return out.join('\n') + '\n';
}

function seg(s, P) {
  switch (s.k) {
    case 'line': return `L${P(s.b)}`;
    case 'cubic': return `C${P(s.p[1])} ${P(s.p[2])} ${P(s.p[3])}`;
    case 'arc':
    case 'earc': {
      const sweep = s.k === 'arc' ? s.da : s.dt;
      const rx = s.k === 'arc' ? s.r : s.rx, ry = s.k === 'arc' ? s.r : s.ry;
      const rotDeg = s.k === 'arc' ? 0 : (-s.rot * 180) / Math.PI; // Y intors -> unghiul se neaga
      // Comanda A e definita prin capete; centrul se recalculeaza cu o radacina patrata care e ~0 la 180 de grade,
      // deci rotunjirea capetelor la 1e-6 mm muta centrul cu ~sqrt(R*1e-6) (masurat: 0,0016 mm pe elipsa 60x30).
      // Regula: nicio comanda A peste 90 de grade (cercul complet ar cere oricum minim doua).
      const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
      let d = '';
      for (let i = 1; i <= n; i++) {
        const end = pointOn(s, i / n);
        const part = Math.abs(sweep) / n;
        // Y se intoarce la scriere, deci un arc CCW in model (Y in sus) devine unghi DESCRESCATOR in SVG (Y in jos):
        // sweep-flag = 0. (Prima versiune avea semnul invers; oracolul svgelements a prins-o: colturi concave.)
        d += `A${f(rx)},${f(ry)} ${f(rotDeg)} ${part > Math.PI ? 1 : 0},${sweep > 0 ? 0 : 1} ${P(end)}`;
      }
      return d;
    }
  }
  throw new Error(s.k);
}
function pointOn(s, u) {
  if (s.k === 'arc') { const a = s.a0 + s.da * u; return [s.c[0] + s.r * Math.cos(a), s.c[1] + s.r * Math.sin(a)]; }
  const t = s.t0 + s.dt * u, c = Math.cos(s.rot), sn = Math.sin(s.rot), x = s.rx * Math.cos(t), y = s.ry * Math.sin(t);
  return [s.c[0] + c * x - sn * y, s.c[1] + sn * x + c * y];
}
export { segEnd };
