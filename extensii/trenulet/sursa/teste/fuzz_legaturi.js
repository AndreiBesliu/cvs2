const { motoare, plasa } = require('./incarca.js'); const { L } = motoare(); const check = t => { const c = plasa(t); return { open: c.deschise, neg: c.negative, nan: t.some(x => x.some(p => p.some(v => !Number.isFinite(v)))) }; };
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a => a[Math.floor(rnd() * a.length)];
let n = 0, bad = 0, t0 = Date.now();
function test(d) {
  n++;
  let r;
  try { r = L.construieste(d); } catch (e) { bad++; console.log('THROW', JSON.stringify(d), e.message); return; }
  const c = check(r.tri);
  if (c.open || c.neg || c.nan || !r.tri.length) { bad++; console.log('BAD', JSON.stringify(d), JSON.stringify(c)); }
}
for (let k = 0; k < 150; k++) {
  // forma aleatoare pe 5 x 5, cu gauri si stifturi goale
  const cel = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (rnd() < 0.6) cel.push([i, j]);
  if (!cel.length) continue;
  const gauri = []; for (let a = 1; a < 5; a++) for (let b = 1; b < 5; b++) if (rnd() < 0.5) gauri.push([a, b, pick(['r', 'x'])]);
  test({ tip: 'caramida', celule: cel, placi: pick([1, 2, 3]), stifturi: pick([true, false, 'mijloc']), fund: pick(['tuburi', 'locasuri']), gauri, goale: rnd() < 0.5 });
}
for (let k = 0; k < 120; k++) {
  const lung = 1 + Math.floor(rnd() * 12), lat = 1 + Math.floor(rnd() * 6), varf = Math.min(lat, Math.floor(rnd() * (lat + 1) * 2) / 2);
  const gauri = []; for (let a = 1; a < lung; a++) for (let b = 1; b < lat; b++) if (rnd() < 0.4) gauri.push([a, b, pick(['r', 'x'])]);
  test({ tip: 'pana', lung, lat, varf, inceput: Math.floor(rnd() * lung), parte: pick(['stanga', 'dreapta', 'ambele']), placi: pick([1, 2, 3]), stifturi: rnd() < 0.8, gauri });
}
for (let k = 0; k < 80; k++) {
  const cel = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) if (rnd() < 0.5) cel.push([i, j, pick(['r', 'x', 'p'])]);
  if (cel.length) test({ tip: 'grinda', celule: cel, groasa: rnd() < 0.6 });
}
for (let lung = 1; lung <= 8; lung++) for (let k = 0; k < 3; k++) {
  const laterale = Array.from({ length: lung === 1 ? 1 : lung - 1 }, () => pick(['r', 'x', 'p']));
  test({ tip: 'caramida', celule: Array.from({ length: lung }, (_, i) => rnd() < 0.5 ? [i, 0] : [0, i]).every(c => c[1] === 0) ? Array.from({ length: lung }, (_, i) => [i, 0]) : Array.from({ length: lung }, (_, i) => [3, i + 1]), placi: 3, laterale, goale: rnd() < 0.5, stifturi: rnd() < 0.8 });
}
for (const diam of [1, 2]) for (const placi of [1, 2, 3, 6]) for (const forma of ['cilindru', 'con']) for (const varf_d of [1, 3.6, 5.4, 7.8, 15.8]) for (const stifturi of ['toate', 'unul', 'niciunul']) for (const gaura of ['bara', 'stift', 'ax']) test({ tip: 'rotund', diam, placi, forma, varf_d, stifturi, gaura });
for (const lung of [2, 3]) for (const capat of ['stift', 'ax']) for (const fanta of [true, false]) test({ tip: 'stiftTechnic', lung, capat, fanta });
for (const lung of [0.5, 1, 2, 3]) for (const gaura of ['x', 'r', 'xr']) test({ tip: 'bucsa', lung, gaura });
for (let lung = 1; lung <= 4; lung++) for (const adanc of [1, 2, 3]) for (const inalt of [1, 2, 3]) for (const invers of [false, true]) test({ tip: 'suport', lung, adanc, inalt, invers });
for (const lung of [1, 2]) for (const axa of ['verticala', 'orizontala']) test({ tip: 'clema', lung, axa });
for (const lung of [1, 2, 3, 4]) for (const axa of ['verticala', 'orizontala']) test({ tip: 'maner', lung, axa });
for (const lung of [1, 2, 6, 12]) test({ tip: 'bara', lung });
for (const baza of [1, 2]) { test({ tip: 'bila', baza }); test({ tip: 'cupa', baza }); }
console.log('fuzz', n, 'bad', bad, 's', ((Date.now() - t0) / 1000).toFixed(1));
