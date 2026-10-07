// Reface cifrele-cheie ale sondei s7. Trei șiruri în paralel: browser (port 5177, secvențial), schema (Node) și
// undo + fișierul de proiect (Node).
// Rulare: npm run masoara   (sau: node masoara.mjs). Rezultatele: out/*.json + tabelul de la final.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
const run = (args) => new Promise((ok) => {
  const t = performance.now();
  const p = spawn(process.execPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  p.on('exit', (code) => { console.log(`${args.join(' ').padEnd(60)} exit=${code} ${Math.round((performance.now() - t) / 1000)}s`); ok(code); });
});
const t0 = performance.now();
mkdirSync('out', { recursive: true });
if (!existsSync('web/b-zod.js')) await run(['bundle.mjs']); // bundle-urile pentru pagina CSP
await Promise.all([
  (async () => { await run(['p1-csp.mjs', '50000', '3', '2']); await run(['p2-storage.mjs', '3']); await run(['p2-crash.mjs']); await run(['p2-move.mjs']); await run(['p4-pwa.mjs']); })(),
  (async () => { await run(['--max-old-space-size=8192', 'p1-schema.mjs', '50000', '3']); })(),
  (async () => { await run(['--expose-gc', 'p3-undo.mjs', '50000']); await run(['--max-old-space-size=8192', 'p2-zip.mjs', '5000']); })(),
]);
const j = (f) => JSON.parse(readFileSync(`out/${f}.json`, 'utf8'));
const mv = j('p2-move'), p1 = j('p1-schema'), csp = j('p1-csp'), st = j('p2-storage'), cr = j('p2-crash'), z = j('p2-zip'), u = j('p3-undo'), pw = j('p4-pwa');
console.log('\n== schema, Node, 50k noduri (mediana ms; căi exacte; toate defectele odată)');
for (const [n, l] of Object.entries(p1.libs)) console.log(n.padEnd(8), l.validMedianMs, `${l.faults.filter((f) => f.exactPath).length}/10`, `${l.allFaults.exactFound}/10`, 'necunoscute', l.unknownPreserved);
console.log('== schema, Edge, cu/fără CSP (mediana ms, căi exacte)');
for (const r of csp.rows) console.log(r.lib.padEnd(8), r.page.padEnd(5), r.medianMs, r.exactPath);
console.log('== stocare (ms scriere/citire)');
for (const r of st.rows) console.log(r.payload.padEnd(22), r.kind.padEnd(14), r.writeMs, r.readMs, r.hashOk);
console.log('quota GB', st.info1.quotaGB, 'persist()', st.info1.persistResult);
console.log('== cădere la mijlocul salvării');
for (const [s, v] of Object.entries(cr.inspect)) console.log(s, v.state, `v1=${v.chunksV1} v2=${v.chunksV2}`);
console.log('== OPFS move()', { moveOk: mv.moveOk, suprascriere: mv.overwriteResult, moveMs: mv.moveMs });
console.log('== fișier de proiect', { byteExact: z.roundTripByteExact, python: z.python.crc_ok && z.python.assets_ok && z.python.doc_sha_ok, tz: z.tzIndependent, zipMB: z.zipMB, packMs: z.packMs, unpackMs: z.unpackMs });
console.log('== undo', { copieMB: u.fullCopy.perStepMB, immerKB: u.immerNoFreeze.perStepKB, jurnalB: u.journal.perSmallCmdBytes, rotireInversaNeexacta: u.inverseMath.rotate30.pct + '%' });
console.log('== PWA', pw.result);
console.log(`total ${Math.round((performance.now() - t0) / 1000)} s`);
