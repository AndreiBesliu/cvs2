// Motoarele planificatorului in Node (fara pagina): Cavalier, earcut, cnc, gcode, lego, in acelasi context, ca in
// planificator.html. Sursele sunt TypeScript (ADR 0162): intra fara tipuri, ca in pagina (stripTypeScriptTypes). Data e fixa (1.11.2026, 12:00), ca fisierele cu ora in ele (zip-ul) sa iasa la fel de fiecare data.
const vm = require('vm'), fs = require('fs'), path = require('path'), { stripTypeScriptTypes } = require('module');
const R = path.join(__dirname, '..');
const FIX = Date.UTC(2026, 10, 1, 12, 0, 0);
class DataFixa extends Date { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
function motoare({ dataFixa = true } = {}) {
  const ctx = { console, TextEncoder, TextDecoder, Date: dataFixa ? DataFixa : Date }; vm.createContext(ctx);
  const citeste = f => fs.readFileSync(path.join(R, f), 'utf8');
  const sursa = f => stripTypeScriptTypes(citeste(f), { mode: 'strip' });
  vm.runInContext(citeste('vendor/cavalier.min.js') + ';this.Cavalier=Cavalier;', ctx);
  vm.runInContext(citeste('vendor/earcut.min.js'), ctx);
  vm.runInContext(sursa('planificator/cnc.ts'), ctx);
  vm.runInContext(sursa('planificator/gcode.ts'), ctx);
  vm.runInContext(sursa('lego/lego.ts'), ctx);
  return { ctx, CNC: ctx.TrenCNC, GC: ctx.TrenGCode, L: ctx.Lego, catalog: JSON.parse(citeste('planificator/catalog.json')) };
}
// corp inchis: fiecare muchie orientata are perechea ei intoarsa; fara corpuri cu volum negativ
const q = p => p.map(v => Math.round(v * 1e5)).join(',');
function plasa(tri) {
  const E = new Map();
  for (const t of tri) { const k = t.map(q); if (k[0] === k[1] || k[1] === k[2] || k[0] === k[2]) continue; for (let i = 0; i < 3; i++) { const key = k[i] + '|' + k[(i + 1) % 3]; E.set(key, (E.get(key) || 0) + 1); } }
  let deschise = 0;
  for (const [key, n] of E) { const [a, b] = key.split('|'); if ((E.get(b + '|' + a) || 0) !== n) deschise++; }
  const par = new Map(), f = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (const t of tri) for (const p of t) { const k = q(p); if (!par.has(k)) par.set(k, k); }
  for (const t of tri) { const a = f(q(t[0])), b = f(q(t[1])), c = f(q(t[2])); if (a !== b) par.set(a, b); const b2 = f(b); if (f(c) !== b2) par.set(f(c), b2); }
  const vol = new Map();
  for (const [a, b, c] of tri) { const r = f(q(a)); vol.set(r, (vol.get(r) || 0) + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6); }
  return { deschise, corpuri: vol.size, negative: [...vol.values()].filter(v => v < -1e-6).length };
}
module.exports = { motoare, plasa, R };
