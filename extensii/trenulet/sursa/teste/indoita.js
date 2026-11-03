const { motoare, plasa } = require('./incarca.js'), fs = require('fs'); const { L } = motoare(); const check = t => { const c = plasa(t); return { open: c.deschise, neg: c.negative, nan: false }; };
const D = process.argv[2] ? process.argv[2] + '/' : null;
let bad = 0;
for (const [n, ind, gauri, groasa] of [['ind_6_4', { brate: [6, 4], unghiuri: [53.13] }, ['x', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'x'], true],
  ['ind_4_4', { brate: [4, 4], unghiuri: [53.13] }, [], true], ['ind_3_3_90', { brate: [3, 3], unghiuri: [90] }, ['r', 'x', 'r', 'x', 'r'], false],
  ['ind_dubla', { brate: [4, 4, 4], unghiuri: [45, 45] }, [], true], ['ind_zig', { brate: [3, 4, 3], unghiuri: [53.13, -53.13] }, ['x', 'r', 'p'], true],
  ['ind_120', { brate: [5, 5], unghiuri: [120] }, [], true], ['ind_0', { brate: [3, 3], unghiuri: [0] }, [], true], ['ind_neg', { brate: [7, 3], unghiuri: [-30] }, [], false]]) {
  const r = L.construieste({ tip: 'grinda', indoita: ind, gauri, groasa }), c = check(r.tri);
  if (c.open || c.neg) bad++;
  console.log(n.padEnd(12), JSON.stringify(c), r.dim.map(v => v.toFixed(1)).join('x'), r.avert.join(' '));
  if (D) fs.writeFileSync(D + n + '.stl', Buffer.from(L.stl(r.tri).date));
}
let seed = 3; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
for (let k = 0; k < 120; k++) {
  const nb = 2 + Math.floor(rnd() * 2), brate = Array.from({ length: nb }, () => 2 + Math.floor(rnd() * 8)), unghiuri = Array.from({ length: nb - 1 }, () => Math.round((rnd() * 240 - 120) * 100) / 100);
  const n = brate.reduce((a, b) => a + b, 0) - nb + 1, gauri = Array.from({ length: n }, () => ['r', 'x', 'p'][Math.floor(rnd() * 3)]);
  try { const c = check(L.construieste({ tip: 'grinda', indoita: { brate, unghiuri }, gauri, groasa: rnd() < 0.5 }).tri); if (c.open || c.neg || c.nan) { bad++; console.log('BAD', JSON.stringify({ brate, unghiuri }), JSON.stringify(c)); } }
  catch (e) { bad++; console.log('THROW', JSON.stringify({ brate, unghiuri }), e.message); }
}
console.log('bad', bad);
