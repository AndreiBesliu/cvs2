// adancimea maxima taiata STRICT in fanta (celulele cu |y - yc| < w/2 si x intre peretii inelului), grila 0,0005
import { cases } from './verif.mjs';
import { generate, evaluate } from './harness.mjs';
for (const name of ['C_rotund_fanta0.01', 'C_rotund_fanta0.001', 'C_patrat_fanta0.01', 'C_rotund_fanta0.01_90grd_fundplat']) {
  const S = cases().find((c) => c.name === name); const w = name.includes('0.001') ? 0.001 : 0.01; const yc = name.includes('patrat') ? 10 : 12; const xr = name.includes('patrat') ? [16, 20] : [18, 22];
  for (const v of ['probe', 'circ']) {
    const G = generate(S, { h: 0.05, variant: v });
    const E = evaluate(S, G.gc.text, { bbox: [xr[0] - 0.01, yc - w, xr[1] + 0.01, yc + w], g: Math.min(0.0005, w / 4), m: 0 });
    const { nx, x0, y0, g } = E.grid; let mx = 0, at = null;
    for (let id = 0; id < E.H.length; id++) { const x = x0 + ((id % nx) + 0.5) * g, y = y0 + (Math.floor(id / nx) + 0.5) * g; if (Math.abs(y - yc) < w / 2 && !E.ideal.IN[id]) { const c = -Math.min(0, E.H[id]); if (c > mx) { mx = c; at = [x.toFixed(4), y.toFixed(4)]; } } }
    console.log(name.padEnd(36), v.padEnd(6), 'max taiat in fanta', mx.toFixed(5), at ? 'la ' + at : '');
  }
}
