// poisons.mjs — otrăvuri țintite în nucleu: fiecare trebuie să înroșească cel puțin o verificare.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const src = readFileSync('src/core.mjs', 'utf8');
const P = {
  'arc-baleiaj-sau': ['return c0 >= 0 && c1 >= 0;', 'return c0 >= 0 || c1 >= 0;'],
  'v-tan-in-loc-de-cot': ['t.k = 1 / Math.tan((spec.angle * Math.PI) / 360);', 't.k = Math.tan((spec.angle * Math.PI) / 360);'],
  'rampa-capat-gresit': ['zs = az + dz * (dz > 0 ? ta : tb);', 'zs = az + dz * (dz > 0 ? tb : ta);'],
  'bila-fara-patrat': ['case 1: { const q = t.R2 - d * d;', 'case 1: { const q = t.R2 - d;'],
  'centrul-celulei': ['const px = F.x0 + (i + 0.5) * cell;\n      const ex = px - ax, ey = py - ay;', 'const px = F.x0 + i * cell;\n      const ex = px - ax, ey = py - ay;'],
  'span-fara-ax': ['lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }\n      else if (ea * dy', 'lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q)); }\n      else if (ea * dy'],
  'elice-z-invers': ['const cand = dz < 0 ? hi : lo;', 'const cand = dz < 0 ? lo : hi;'],
};
mkdirSync('out/otravuri', { recursive: true });
const rez = {};
for (const [name, [a, b]] of Object.entries(P)) {
  if (!src.includes(a)) { rez[name] = 'VOID (textul nu există)'; continue; }
  const f = `out/otravuri/core-${name}.mjs`;
  writeFileSync(f, src.replace(a, b));
  let out = '';
  try { out = execFileSync(process.execPath, ['test/run-corpus.mjs', '--poison=' + name], { env: { ...process.env, CORE: f }, encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch (e) { out = String(e.stdout || '') + ' EROARE ' + String(e.message).slice(0, 200); }
  rez[name] = out.trim().split('\n').pop();
  console.log(name, '=>', rez[name]);
}
writeFileSync('out/otravuri.json', JSON.stringify(rez, null, 1));
