// Iesirile de referinta ale planificatorului (v18): amprenta SHA-256 a fiecarui fisier facut de motoare, pe un set fix de
// piese si circuite. Portul (TypeScript, in cvs2) trebuie sa dea aceleasi amprente; unde nu le da, diferenta se
// explica (si atunci comparatia toleranta de mai jos spune cat de mare e: numar de triunghiuri, volum, cutie).
//   node referinte.js            scrie referinte_v18.json
//   node referinte.js --compara  compara motoarele de acum cu referinte_v18.json
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { motoare, plasa } = require('./incarca.js');
const { CNC, L } = motoare();
const sha = b => crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : Buffer.from(b)).digest('hex');
const R = (n, m = 1) => { const c = []; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) c.push([i, j]); return c; };

// ------------------------------------------------------------------ piesele LEGO
const lego = [];
for (const parte of ['stanga', 'dreapta', 'ambele']) for (const [lung, lat] of [[1, 1], [2, 2], [4, 2], [6, 3], [12, 6], [3, 5]]) for (const varf of [0, 1, lat]) for (const inceput of [0, 1]) for (const placi of [1, 3]) {
  if (varf > lat || inceput > lung - 1) continue;
  lego.push({ tip: 'pana', lung, lat, varf, inceput, parte, placi, stifturi: true });
}
for (const diam of [1, 2]) for (const placi of [1, 3, 6]) for (const forma of ['cilindru', 'con']) for (const varf_d of [1.2, 5.4, 15.8]) for (const stifturi of ['toate', 'unul', 'niciunul']) lego.push({ tip: 'rotund', diam, placi, forma, varf_d, stifturi });
for (const cel of [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], [[0, 0], [1, 1]]]) for (const st of [true, false, 'mijloc']) for (const fund of ['tuburi', 'locasuri']) for (const placi of [1, 3]) lego.push({ tip: 'caramida', celule: cel, placi, stifturi: st, fund });
for (const lung of [1, 2, 3, 6, 20]) lego.push({ tip: 'caramidaTechnic', lung });
lego.push({ tip: 'grinda', gauri: ['r', 'x', 'r', 'p'], groasa: true }, { tip: 'grinda', gauri: ['r', 'r'], groasa: false }, { tip: 'stiftTechnic', fanta: true }, { tip: 'stiftTechnic', fanta: false }, { tip: 'ax', lung: 4 });
for (const profil of ['drept', 'curb']) for (const [lung, adanc, sus, placi, buza] of [[2, 3, 1, 3, 1.6], [1, 2, 0, 2, 1], [3, 8, 0, 6, 6]]) lego.push({ tip: 'panta', lung, adanc, sus, placi, buza, profil });
lego.push({ tip: 'pantaInversa', lung: 2, adanc: 2, sus: 1, placi: 3 }, { tip: 'pantaInversa', lung: 2, adanc: 3, sus: 1, placi: 3 }, { tip: 'lateral', lung: 2, fete: 'doua' }, { tip: 'lateral', lung: 1, fete: 'una' });
// v17-v18: gauri, legaturi
lego.push(
  { tip: 'caramida', celule: R(6, 2), placi: 1, gauri: [1, 2, 3, 4, 5].map(a => [a, 1, a % 2 ? 'r' : 'x']) },
  { tip: 'caramida', celule: R(4, 2), placi: 3, gauri: [[1, 1, 'r'], [2, 1, 'x'], [3, 1, 'r']] },
  { tip: 'caramida', celule: R(2, 2), placi: 1, goale: true },
  { tip: 'caramida', celule: R(3, 3), placi: 1, goale: true, gauri: [[1, 1, 'r'], [2, 2, 'x'], [1, 2, 'r'], [2, 1, 'x']] },
  { tip: 'caramida', celule: R(3, 2), placi: 3, fund: 'locasuri', gauri: [[1, 1, 'r'], [2, 1, 'x']], goale: true },
  { tip: 'caramida', celule: R(2, 2), placi: 1, stifturi: 'mijloc', gauri: [[1, 1, 'r']] },
  { tip: 'caramida', celule: R(6, 1), placi: 3, laterale: ['r', 'x', 'p', 'r', 'x'] },
  { tip: 'caramida', celule: [[2, 0], [2, 1], [2, 2]], placi: 3, laterale: ['x', 'r'], goale: true },
  { tip: 'caramida', celule: R(4, 1), placi: 3, stifturi: 'mijloc', laterale: ['r', 'r', 'r'] },
  { tip: 'caramidaTechnic', lung: 1, gauri: ['x'] }, { tip: 'caramidaTechnic', lung: 6, gauri: ['r', 'x', 'r', 'p', 'r'], goale: true },
  { tip: 'rotund', diam: 1, placi: 1, gaura: 'bara' }, { tip: 'rotund', diam: 1, placi: 3, forma: 'con', varf_d: 5.4, gaura: 'bara' },
  { tip: 'rotund', diam: 2, placi: 3, gaura: 'ax' }, { tip: 'rotund', diam: 2, placi: 6, forma: 'con', varf_d: 7.8, gaura: 'stift' }, { tip: 'rotund', diam: 2, placi: 3, forma: 'con', varf_d: 2, gaura: 'ax' },
  { tip: 'pana', lung: 6, lat: 3, varf: 1, parte: 'stanga', placi: 1, gauri: [[1, 1, 'r'], [2, 1, 'x'], [1, 2, 'r']] },
  { tip: 'pana', lung: 12, lat: 6, varf: 2, parte: 'ambele', placi: 1, gauri: [[2, 3, 'r'], [4, 3, 'x'], [6, 3, 'r'], [8, 3, 'r'], [10, 3, 'x'], [3, 1, 'r']] },
  { tip: 'grinda', celule: [[0, 0, 'r'], [1, 0, 'r'], [2, 0, 'x'], [0, 1, 'r'], [0, 2, 'r']], groasa: true },
  { tip: 'grinda', celule: [[0, 0, 'r'], [1, 0, 'x'], [2, 0, 'r'], [1, 1, 'p'], [1, 2, 'r']], groasa: false },
  { tip: 'grinda', celule: [[0, 0, 'r'], [1, 0, 'r'], [0, 1, 'r'], [1, 1, 'r']], groasa: true },
  { tip: 'grinda', indoita: { brate: [6, 4], unghiuri: [53.13] }, gauri: ['x', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'x'], groasa: true },
  { tip: 'grinda', indoita: { brate: [3, 4, 3], unghiuri: [53.13, -53.13] }, gauri: [], groasa: false },
  { tip: 'stiftTechnic', lung: 3, fanta: true }, { tip: 'stiftTechnic', lung: 2, capat: 'ax' }, { tip: 'stiftTechnic', lung: 3, capat: 'ax', fanta: false },
  ...[0.5, 1, 2, 3].flatMap(lung => ['x', 'r', 'xr'].map(gaura => ({ tip: 'bucsa', lung, gaura }))),
  { tip: 'suport', lung: 2, adanc: 1, inalt: 1 }, { tip: 'suport', lung: 2, adanc: 2, inalt: 2 }, { tip: 'suport', lung: 2, adanc: 1, inalt: 1, invers: true },
  { tip: 'clema', lung: 1, axa: 'verticala' }, { tip: 'clema', lung: 2, axa: 'orizontala' }, { tip: 'clema', lung: 1, axa: 'verticala', goale: true },
  { tip: 'maner', lung: 2, axa: 'orizontala' }, { tip: 'maner', lung: 3, axa: 'orizontala' }, { tip: 'maner', lung: 1, axa: 'verticala' },
  { tip: 'bara', lung: 4 }, { tip: 'bila', baza: 1 }, { tip: 'bila', baza: 2 }, { tip: 'cupa', baza: 1 });
// variantele de calibrare schimba masurile: o piesa construita cu variante, pe langa cele implicite
const variante = { varianta_stift: 4, varianta_locas: 2, varianta_gaura: 5, varianta_ax: 1, varianta_bara: 4, varianta_cupa: 2 };

function iesireLego() {
  const out = {};
  const una = (cheie, tri) => { const s = L.stl(tri); out[cheie] = { sha: sha(s.date), tri: tri.length, vol: +s.volum.toFixed(4), plasa: plasa(tri) }; };
  L.seteaza({});
  for (const d of lego) una(JSON.stringify(d), L.construieste(d).tri);
  for (const c of L.calibrare()) una('calibrare:' + c.nume, c.tri);
  L.seteaza(variante);
  for (const d of [lego[0], ...lego.filter(d => ['caramida', 'rotund', 'clema', 'cupa', 'caramidaTechnic'].includes(d.tip)).slice(-12)]) una('variante:' + JSON.stringify(d), L.construieste(d).tri);
  L.seteaza({});
  // asezarea pe pat (aceleasi piese, aceeasi ordine)
  const piese = lego.slice(-20).map((d, k) => { const r = L.construieste(d); return { nume: 'p' + k, tri: r.tri, dim: r.dim }; });
  L.seteaza({ pat: [220, 220] });
  L.aseaza(piese).forEach((pl, i) => una(`pat220:${i + 1}`, pl.tri));
  L.seteaza({});
  return out;
}

// ------------------------------------------------------------------ circuitele (CNC si piesele printate)
const fix = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixturi', f), 'utf8'));
const lc = fix('lc.json');
const cazuri = [
  ['andy', 'e2e_andy.json', {}, {}],
  ['andy_doua_fete_v', 'e2e_andy.json', { doua_fete: true, tesire: { tip: 'v', unghi: 90, latime: 1.5, santuri: true } }, { controler: 'grblhal', strategieScula: 'm0-comentariu' }],
  ['andy_la_comanda', 'e2e_andy.json', { freza: 5.8 }, { controler: 'fluidnc', urechi: { numar: 2 } }, lc],
  ['pod', 'e2e_pod.json', { tesire: { tip: 'rotunjire', raza: 2, varf: 4 } }, { controler: 'mach3', strategieScula: 'fisiere-separate', coborareDirecta: true }],
  ['macaz', 'e2e_macaz.json', { limbi: true }, { controler: 'grbl-11' }],
  ['macaz_doua_fete', 'e2e_macaz.json', { limbi: true, doua_fete: true }, { controler: 'syntec', strategieScula: 'm6-controler' }],
  ['rampa', 'e2e_rampa.json', {}, { controler: 'grbl-11' }],
];
function iesireCNC() {
  const out = {};
  for (const [nume, f, setari, gcode, laComanda] of cazuri) {
    const e = fix(f);
    const r = CNC.genereaza(e.piese, laComanda || e.la_comanda || [], setari, { continut: { gcode: true, dxfPlaci: true, dxfPiese: true, svg: true, rampa: true, calibrare: true, limbi: true, printate: true }, umplere: nume === 'andy' ? ['dreapta_54'] : [], gcode });
    const fis = {};
    for (const x of r.fisiere) fis[x.nume] = sha(x.text);
    out[nume] = { placi: r.placi.length, bucati: r.bucati, fisiere: fis, avertismente: r.gcode ? r.gcode.avertismente : [] };
  }
  // piesele printate ale circuitului (lista din 3D)
  const e = fix('e2e_macaz.json');
  const pp = CNC.piesePrintate({ ...e.piese, adaptor_tata_tata: 1, stalp_2: 2, opritor_bloc: 1 }, [], { limbi: true, doua_fete: true, tunel: 1, peron: 1, stalpi_printati: true, opritor_printat: true, cale_printata: ['adaptor_tata_tata'], print_tata: 4, print_mama: 2, proba_cuplaje: true });
  out.printate = Object.fromEntries(pp.map(p => [p.nume, { sha: sha(L.stl(p.tri).date), tri: p.tri.length, bucati: p.bucati }]));
  return out;
}

const acum = { versiune: 'v18', motoare: { lego: iesireLego(), cnc: iesireCNC() } };
const fisier = path.join(__dirname, 'referinte_v18.json');
if (process.argv.includes('--compara')) {
  const ref = JSON.parse(fs.readFileSync(fisier, 'utf8'));
  let dif = 0, tot = 0;
  for (const [k, v] of Object.entries(ref.motoare.lego)) { tot++; const a = acum.motoare.lego[k]; if (!a || a.sha !== v.sha) { dif++; console.log('LEGO diferit:', k.slice(0, 120), a ? `tri ${v.tri} -> ${a.tri}, vol ${v.vol} -> ${a.vol}` : 'lipseste'); } }
  for (const [c, v] of Object.entries(ref.motoare.cnc)) {
    const a = acum.motoare.cnc[c];
    if (c === 'printate') { for (const [k, x] of Object.entries(v)) { tot++; if (!a[k] || a[k].sha !== x.sha) { dif++; console.log('PRINTAT diferit:', k); } } continue; }
    for (const [fn, s] of Object.entries(v.fisiere)) { tot++; if (!a || a.fisiere[fn] !== s) { dif++; console.log('CNC diferit:', c, fn); } }
    if (a) for (const fn of Object.keys(a.fisiere)) if (!(fn in v.fisiere)) { dif++; console.log('CNC fisier nou:', c, fn); }
  }
  console.log(`comparate ${tot}, diferite ${dif}`);
  process.exit(dif ? 1 : 0);
} else {
  fs.writeFileSync(fisier, JSON.stringify(acum, null, 1));
  const n = Object.keys(acum.motoare.lego).length, f = Object.values(acum.motoare.cnc).reduce((t, x) => t + (x.fisiere ? Object.keys(x.fisiere).length : Object.keys(x).length), 0);
  const deschise = Object.entries(acum.motoare.lego).filter(([, x]) => x.plasa.deschise || x.plasa.negative);
  console.log(`scris ${fisier}: ${n} piese LEGO, ${f} fisiere din circuite; plase deschise: ${deschise.length}`);
}
