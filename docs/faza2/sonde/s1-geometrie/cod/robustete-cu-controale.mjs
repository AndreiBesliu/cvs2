// Rulare completa T7 (bibliotecile in workeri cu termen de 20 s) + controale negative (sabotaje care TREBUIE prinse).
import fs from 'node:fs';
import { runCorpus, libsRobust } from './robustete.mjs';
import { LibInWorker } from './lucrator.mjs';
import * as AD from './adaptoare.mjs';
const seed = +(process.argv[2] || 12345), stride = +(process.argv[3] || 1);
const real = libsRobust().map((L, i) => Object.assign(new LibInWorker(i, L.nume, 20000), { nume: L.nume }));
const sabotaje = [
  { nume: 'CONTROL: intoarce A neschimbat', bool: (A) => A, offset: (A) => A },
  { nume: 'CONTROL: cavalier fara ultimul contur', bool: (A, B, op, o) => { const r = AD.cavalier.bool(A, B, op, o); return r.slice(0, Math.max(1, r.length - 1)); }, offset: (A, d, o) => { const r = AD.cavalier.offset(A, d, o); return r.length > 1 ? r.slice(0, -1) : r; } },
  { nume: 'CONTROL: offset cu d*1.02', bool: (A, B, op, o) => AD.cavalier.bool(A, B, op, o), offset: (A, d, o) => AD.cavalier.offset(A, d * 1.02, o) },
];
const t0 = performance.now();
const { n, res } = runCorpus({ libs: [...real, ...sabotaje], seed, stride });
for (const w of real) w.close();
const out = { n, seed, stride, secunde: (performance.now() - t0) / 1000, res };
fs.writeFileSync(stride === 1 ? 'rezultate-robustete.json' : `rezultate-robustete-pas${stride}.json`, JSON.stringify(out, null, 1));
console.log('cazuri', n, 'timp', out.secunde.toFixed(1), 's');
for (const [k, R] of Object.entries(res)) {
  console.log(k.slice(0, 52).padEnd(52), JSON.stringify({ total: R.total, ok: R.ok, topologie: R.topologie, exceptie: R.exceptie, blocaj: R.blocaj, nesuportat: R.nesuportat, ms: Math.round(R.ms) }));
  for (const [f, F] of Object.entries(R.peFam)) console.log('     ', f.padEnd(12), JSON.stringify(F));
  for (const e of R.exemple.slice(0, 8)) console.log('       ex:', e);
}
process.exit(0);
