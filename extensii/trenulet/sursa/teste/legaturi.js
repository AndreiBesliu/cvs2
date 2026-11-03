const { motoare, plasa: check } = require('./incarca.js'); const { L } = motoare();
const fs = require('fs');
const dir = process.argv[2];
const R = (n, m = 1) => { const c = []; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) c.push([i, j]); return c; };
const defs = {
  placa_technic_2x6: { tip: 'caramida', celule: R(6, 2), placi: 1, gauri: [1,2,3,4,5].map(a => [a, 1, a % 2 ? 'r' : 'x']) },
  caramida_2x4_gauri: { tip: 'caramida', celule: R(4, 2), placi: 3, gauri: [[1,1,'r'],[2,1,'x'],[3,1,'r']] },
  placa_goale_2x2: { tip: 'caramida', celule: R(2, 2), placi: 1, goale: true },
  placa_goale_gauri_3x3: { tip: 'caramida', celule: R(3, 3), placi: 1, goale: true, gauri: [[1,1,'r'],[2,2,'x'],[1,2,'r'],[2,1,'x']] },
  plina_gauri_3x2: { tip: 'caramida', celule: R(3, 2), placi: 3, fund: 'locasuri', gauri: [[1,1,'r'],[2,1,'x']], goale: true },
  inel_gauri: { tip: 'caramida', celule: [[0,0],[1,0],[2,0],[3,0],[0,1],[3,1],[0,2],[3,2],[0,3],[1,3],[2,3],[3,3],[1,1]], placi: 1, gauri: [[1,1,'r'],[2,1,'x']] },
  laterala_1x6: { tip: 'caramida', celule: R(6, 1), placi: 3, laterale: ['r','x','p','r','x'] },
  laterala_1x3_y: { tip: 'caramida', celule: [[2,0],[2,1],[2,2]], placi: 3, laterale: ['x','r'], goale: true },
  laterala_1x1: { tip: 'caramida', celule: [[0,0]], placi: 3, laterale: ['r'] },
  technic_1x4: { tip: 'caramidaTechnic', lung: 4 },
  technic_1x1_x: { tip: 'caramidaTechnic', lung: 1, gauri: ['x'] },
  rot1_bara: { tip: 'rotund', diam: 1, placi: 1, gaura: 'bara' },
  rot1_con_bara: { tip: 'rotund', diam: 1, placi: 3, forma: 'con', varf_d: 5.4, gaura: 'bara' },
  rot2_ax: { tip: 'rotund', diam: 2, placi: 3, gaura: 'ax' },
  rot2_stift_con: { tip: 'rotund', diam: 2, placi: 6, forma: 'con', varf_d: 7.8, gaura: 'stift' },
  rot2_bara_con: { tip: 'rotund', diam: 2, placi: 3, forma: 'con', varf_d: 5.4, gaura: 'bara' },
  rot2_con_ingust_ax: { tip: 'rotund', diam: 2, placi: 3, forma: 'con', varf_d: 2, gaura: 'ax' },
  pana_6x3_gauri: { tip: 'pana', lung: 6, lat: 3, varf: 1, parte: 'stanga', placi: 1, gauri: [[1,1,'r'],[2,1,'x'],[1,2,'r'],[4,2,'r'],[5,1,'x']] },
  pana_12x6_gauri: { tip: 'pana', lung: 12, lat: 6, varf: 2, parte: 'ambele', placi: 1, gauri: [[2,3,'r'],[4,3,'x'],[6,3,'r'],[8,3,'r'],[10,3,'x'],[3,1,'r']] },
  grinda_L: { tip: 'grinda', celule: [[0,0,'r'],[1,0,'r'],[2,0,'x'],[0,1,'r'],[0,2,'r']], groasa: true },
  grinda_T_subtire: { tip: 'grinda', celule: [[0,0,'r'],[1,0,'x'],[2,0,'r'],[1,1,'p'],[1,2,'r']], groasa: false },
  grinda_cruce: { tip: 'grinda', celule: [[1,1,'x'],[0,1,'r'],[2,1,'r'],[1,0,'r'],[1,2,'r']], groasa: true },
  grinda_patrat: { tip: 'grinda', celule: [[0,0,'r'],[1,0,'r'],[0,1,'r'],[1,1,'r']], groasa: true },
  grinda_1: { tip: 'grinda', celule: [[0,0,'r']], groasa: true },
  stift_3: { tip: 'stiftTechnic', lung: 3, fanta: true },
  stift_ax_2: { tip: 'stiftTechnic', lung: 2, capat: 'ax' },
  stift_ax_3: { tip: 'stiftTechnic', lung: 3, capat: 'ax', fanta: false },
  bucsa_half: { tip: 'bucsa', lung: 0.5, gaura: 'x' },
  conector_2: { tip: 'bucsa', lung: 2, gaura: 'x' },
  conector_xr: { tip: 'bucsa', lung: 2, gaura: 'xr' },
  bucsa_r: { tip: 'bucsa', lung: 1, gaura: 'r' },
  suport_1x2: { tip: 'suport', lung: 2, adanc: 1, inalt: 1 },
  suport_2x2_2: { tip: 'suport', lung: 2, adanc: 2, inalt: 2 },
  suport_invers: { tip: 'suport', lung: 2, adanc: 1, inalt: 1, invers: true },
  clema_v: { tip: 'clema', lung: 1, axa: 'verticala' },
  clema_o: { tip: 'clema', lung: 2, axa: 'orizontala' },
  maner_o: { tip: 'maner', lung: 2, axa: 'orizontala' },
  maner_v: { tip: 'maner', lung: 1, axa: 'verticala' },
  bara_4: { tip: 'bara', lung: 4 },
  bila_1: { tip: 'bila', baza: 1 },
  bila_2: { tip: 'bila', baza: 2 },
  cupa_1: { tip: 'cupa', baza: 1 },
};
let bad = 0;
for (const [n, d] of Object.entries(defs)) {
  let r;
  try { r = L.construieste(d); } catch (e) { console.log('THROW', n, e.stack.split('\n').slice(0, 3).join(' | ')); bad++; continue; }
  const c0 = check(r.tri), c = { open: c0.deschise, neg: c0.negative, comps: c0.corpuri }, s = L.stl(r.tri);
  const ok = !c.open && !c.neg && !c.nan && r.tri.length;
  if (!ok) bad++;
  console.log(ok ? 'ok ' : 'BAD', n.padEnd(22), 'tri', String(r.tri.length).padStart(6), 'dim', r.dim.map(v => v.toFixed(2)).join('x'), 'vol', (s.volum / 1000).toFixed(3), JSON.stringify(c), r.avert.join(' / '));
  if (dir) fs.writeFileSync(`${dir}/${n}.stl`, Buffer.from(s.date));
}
console.log('bad', bad);
