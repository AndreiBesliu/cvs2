// SONDA s1-geometrie: reproduce masuratorile cheie.
//   node masoara.mjs            -> T1..T6 (oracole pe hartie) + T7 (corpus complet) + T8 (viteza, 5 repetari)
//   node masoara.mjs --rapid    -> T7 pe fiecare al 5-lea caz (102 cazuri), T8 cu 3 repetari
// Iesire: tabele in consola + rezultate.json
import fs from 'node:fs';
import os from 'node:os';
import * as T from './teste-hartie.mjs';
import { runCorpus, libsRobust } from './robustete.mjs';
import { runSpeed } from './viteza.mjs';

const rapid = process.argv.includes('--rapid');
const t0 = performance.now();
const all = { masina: { cpu: os.cpus()[0].model, nuclee: os.cpus().length, node: process.version }, mod: rapid ? 'rapid' : 'complet' };

function print(rows) {
  for (const r of rows) {
    const parts = [(r.lib || '').slice(0, 46).padEnd(46), (r.caz || '').padEnd(28)];
    if (r.eroare) parts.push('EROARE ' + r.eroare);
    else {
      if (r.entitati) parts.push(r.entitati.padEnd(16));
      for (const k of ['errArieRel', 'errArieAbs', 'errPerimRel', 'abatereMax', 'gol', 'corect', 'lungime', 'lungimeHartie', 'nota'])
        if (r[k] !== undefined) parts.push(k + '=' + (typeof r[k] === 'number' ? T.fmt(r[k], 4) : r[k]));
    }
    console.log('  ' + parts.join(' | '));
  }
}
for (const name of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) {
  const rows = T[name]();
  all[name] = rows;
  console.log(`\n== ${name}: ${rows[0] && rows[0].test}`);
  print(rows);
}

// T7: corpus de robustete (bibliotecile ruleaza in workeri cu termen de 20 s; un apel blocat = 'blocaj')
const { LibInWorker } = await import('./lucrator.mjs');
const libs = libsRobust().map((L, i) => Object.assign(new LibInWorker(i, L.nume, 20000), { nume: L.nume }));
const res7 = runCorpus({ libs, seed: 12345, stride: rapid ? 5 : 1 });
for (const w of libs) w.close();
all.T7 = res7;
console.log(`\n== T7: robustete pe ${res7.n} cazuri (exceptii / topologie gresita / nesuportat)`);
for (const [k, R] of Object.entries(res7.res)) {
  const sup = R.total - R.nesuportat;
  console.log('  ' + k.slice(0, 50).padEnd(50), `ok ${R.ok}/${sup}`, `| exceptii ${R.exceptie} (${(100 * R.exceptie / Math.max(1, sup)).toFixed(1)}%)`, `| blocaje ${R.blocaj}`, `| topologie gresita ${R.topologie} (${(100 * R.topologie / Math.max(1, sup)).toFixed(1)}%)`, `| nesuportat ${R.nesuportat}`, `| ${Math.round(R.ms)} ms`);
}

// T8: viteza relativa
const sp = runSpeed({ reps: rapid ? 3 : 5 });
all.T8 = sp;
console.log('\n== T8: document cu 1 000 de forme (mediana ms; relativ, masina incarcata = zgomot)');
const base = sp.find((r) => r.lib.startsWith('cavalier'));
for (const r of sp) console.log('  ' + r.lib.slice(0, 50).padEnd(50), `offset x1000: ${r.offset1000_ms.toFixed(0)} ms (x${(r.offset1000_ms / base.offset1000_ms).toFixed(1)})`, `| unire x975: ${r.unire975_ms.toFixed(0)} ms (x${(r.unire975_ms / base.unire975_ms).toFixed(1)})`, `| entitati offset ${r.entitatiOffset}`, `| erori ${r.erori}`, `| arie reuniuni ${r.ariaReuniunilor.toFixed(3)}`, `| rep ${r.repetari}`);

all.secunde = (performance.now() - t0) / 1000;
fs.writeFileSync('rezultate.json', JSON.stringify(all, null, 1));
console.log(`\nGata in ${all.secunde.toFixed(1)} s. Rezultate: rezultate.json`);
process.exit(0);
