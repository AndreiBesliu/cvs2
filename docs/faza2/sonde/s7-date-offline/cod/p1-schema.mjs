// Sonda 1: biblioteci de schemă. Oracol: defecte injectate cu calea scrisă din locul injecției (lib/doc.mjs),
// păstrarea necunoscutelor verificată cu JSON canonic (fără cod comun cu bibliotecile), viteza ca mediană.
// Rulare: node p1-schema.mjs [N=50000] [REPS=7]
import { makeDoc, addUnknownFields, faults, canonical, countNodes } from './lib/doc.mjs';
import { writeFileSync } from 'node:fs';

const N = Number(process.argv[2] ?? 50000);
const REPS = Number(process.argv[3] ?? 7);
const NAMES = (process.env.LIBS ?? 'zod,valibot,typebox,arktype').split(',');
const libs = [];
for (const n of NAMES) libs.push(await import(`./schemas/${n}.ts`));

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const samePath = (a, b) => a.length === b.length && a.every((x, i) => String(x) === String(b[i]));
const isPrefix = (p, full) => p.length < full.length && p.every((x, i) => String(x) === String(full[i]));

// t() de probă: mesajul se construiește din (cale, cod, limită), nu din textul bibliotecii.
const T = {
  ro: { max: (l) => `trebuie să fie cel mult ${l}`, min: (l) => `trebuie să fie cel puțin ${l}`, finite: () => 'trebuie să fie un număr finit', type: () => 'are tipul greșit', integer: () => 'trebuie să fie număr întreg', format: () => 'are formatul greșit', variant: () => 'are un tip necunoscut', value: () => 'are o valoare nepermisă' },
  en: { max: (l) => `must be at most ${l}`, min: (l) => `must be at least ${l}`, finite: () => 'must be a finite number', type: () => 'has the wrong type', integer: () => 'must be an integer', format: () => 'has the wrong format', variant: () => 'has an unknown kind', value: () => 'has a value that is not allowed' },
};
const FIELD = {
  ro: { x: 'Coordonata X', 4: 'Deplasarea X a plasării', t: 'Grosimea plăcii', diameter: 'Diametrul frezei', tolerance: 'Toleranța', k: 'Tipul segmentului', order: 'Ordinea operației', font: 'Fontul', cw: 'Sensul arcului', bytes: 'Mărimea resursei' },
  en: { x: 'X coordinate', 4: 'Placement X offset', t: 'Stock thickness', diameter: 'Tool diameter', tolerance: 'Tolerance', k: 'Segment kind', order: 'Operation order', font: 'Font', cw: 'Arc direction', bytes: 'Asset size' },
};
const msg = (lang, issue) => {
  const last = issue.path[issue.path.length - 1];
  const f = FIELD[lang][last] ?? String(last);
  const m = T[lang][issue.code];
  return m ? `${f}: ${m(issue.limit)}` : `${f}: ?(${issue.code})`;
};

const t0 = performance.now();
const doc = addUnknownFields(makeDoc(N));
const genMs = performance.now() - t0;
const inputCanon = canonical(doc);
const inputJson = JSON.stringify(doc);
const report = { N: countNodes(doc), jsonMB: +(Buffer.byteLength(inputJson) / 1e6).toFixed(1), genMs: Math.round(genMs), node: process.version, libs: {} };
console.log(`document: ${report.N} noduri, ${report.jsonMB} MB JSON`);

const F = faults(doc);
const faulty = F.map((f) => { const d = structuredClone(doc); f.apply(d); return d; });
const all = structuredClone(doc); F.forEach((f) => f.apply(all));

for (const L of libs) {
  const r0 = performance.now(); const first = L.validate(doc); const cold = performance.now() - r0;
  const res = { coldMs: +cold.toFixed(1) };
  res.validOk = first.ok;
  res.unknownPreserved = first.ok && canonical(first.value) === inputCanon;
  res.keyOrderPreserved = first.ok && JSON.stringify(first.value) === inputJson;
  res.returnsSameObject = first.value === doc;
  const times = [];
  for (let i = 0; i < 2; i++) L.validate(doc);
  for (let i = 0; i < REPS; i++) { const a = performance.now(); L.validate(doc); times.push(performance.now() - a); }
  res.validMedianMs = +median(times).toFixed(1);
  res.validAllMs = times.map((x) => +x.toFixed(1));
  res.faults = F.map((f, i) => {
    const a = performance.now(); const r = L.validate(faulty[i]); const ms = performance.now() - a;
    const exact = r.issues.find((x) => samePath(x.path, f.path));
    const parent = !exact && r.issues.find((x) => isPrefix(x.path, f.path));
    const hit = exact ?? parent;
    return {
      fault: f.name, rejected: !r.ok, exactPath: !!exact, parentOnly: !!parent, nIssues: r.issues.length,
      code: hit?.code, limit: hit?.limit, ms: +ms.toFixed(1),
      ro: hit ? msg('ro', { ...hit, path: f.path }) : null, en: hit ? msg('en', { ...hit, path: f.path }) : null,
      reportedPaths: exact ? undefined : r.issues.slice(0, 3).map((x) => x.path.join('.')),
    };
  });
  const ra = L.validate(all);
  res.allFaults = { rejected: !ra.ok, nIssues: ra.issues.length, exactFound: F.filter((f) => ra.issues.some((x) => samePath(x.path, f.path))).length, of: F.length };
  report.libs[L.name] = res;
  const fx = res.faults.filter((x) => x.exactPath).length, fp = res.faults.filter((x) => x.parentOnly).length, fr = res.faults.filter((x) => x.rejected).length;
  console.log(`${L.name.padEnd(8)} valid=${res.validOk} necunoscute=${res.unknownPreserved} ordine=${res.keyOrderPreserved} acelasiObiect=${res.returnsSameObject} rece=${res.coldMs}ms mediana=${res.validMedianMs}ms respinse=${fr}/10 caleExacta=${fx}/10 doarParinte=${fp} toateOdata=${res.allFaults.exactFound}/10 (issues ${res.allFaults.nIssues})`);
}
writeFileSync(new URL('./out/p1-schema.json', import.meta.url), JSON.stringify(report, null, 1));
