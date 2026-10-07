// Verificarea v1-geometrie: reproduce cifrele-cheie din VERIFICARE.md in < 3 minute (masina libera).
// Ruleaza fiecare test ca proces separat si afiseaza liniile-cheie. Rezultatele complete raman in rez-*.json.
import { spawnSync } from 'node:child_process';
const steps = [
  ['oracolul pe hartie + control', ['t0-oracol.mjs'], {}, /ORACOL|PICA/],
  ['in/afara (infasurare)', ['t0-interior.mjs'], {}, /IN\/AFARA|nepotriviri/],
  ['(a) buzunar Arial B 200 mm', ['t-a-buzunar.mjs', '--rapid', '--doar=Arial:B:200'], {}, /Arial|glife/],
  ['(a) control: offset x1.01', ['t-a-buzunar.mjs', '--rapid', '--doar=Arial:B:200'], { SABOTAJ: 'd' }, /Arial/],
  ['(a) zig-zag pe toate inelele', ['t-a-zigzag.mjs'], {}, /zigzag"|micro1um|bucle"/],
  ['(b) topologie', ['t-b-topologie.mjs', '--rapid'], {}, /DIFERIT|EROARE|OK$|\/\d+ OK/],
  ['(c) polilinii dense: baleiaj d', ['t-c2-dens.mjs', '--rapid'], {}, /N=/],
  ['(c) epsilon de paralel (cerc teselat, zimti)', ['t-c3-eps-scara.mjs', '--rapid'], {}, /cerc|pas|control/],
  ['(c) intrari murdare', ['t-c-murdar.mjs', '--rapid'], {}, /elipsa 5000|timp|ondulata 5000|r=0,001|cerc r=|optul/],
  ['(d) deschis, o parte', ['t-d-deschis.mjs'], {}, /^OK \d|PICA/],
  ['(d) control: partea opusa', ['t-d-deschis.mjs'], { SABOTAJ: 'parte' }, /^OK \d/],
  ['(e) deriva PathKit + remedii', ['t-e-deriva.mjs'], {}, /^placa|^detaliu|dupa 100|R1|R3 \(potrivire pe 3 puncte, eps 0.001\)|CONTROL/],
  ['(e) re-ancorare dupa fiecare op.', ['t-e2-reancorare-continua.mjs'], {}, /R3/],
  ['(f) coincidente + gauri', ['t-f-coincidente.mjs', '--rapid'], {}, /XOR|CONTROL|Arial B/],
  ['C3 lant: fitter + GRBL', ['t-c3-lant.mjs', '--rapid'], {}, /fitter|P1 = P0|G-code buzunar|bulge 1e-08|CONTROL/],
];
const t0 = performance.now();
for (const [name, args, env, re] of steps) {
  const t = performance.now();
  const r = spawnSync(process.execPath, args, { cwd: new URL('.', import.meta.url), env: { ...process.env, ...env }, encoding: 'utf8', timeout: 240000, maxBuffer: 64 << 20 });
  const lines = ((r.stdout || '') + (r.stderr || '')).split('\n').filter((l) => re.test(l));
  console.log(`\n== ${name} (${((performance.now() - t) / 1000).toFixed(1)} s${r.status !== 0 ? ', iesire ' + r.status : ''}${r.error ? ', ' + r.error.message : ''})`);
  for (const l of lines.slice(0, 14)) console.log('  ' + l.slice(0, 210));
}
console.log(`\nGata in ${((performance.now() - t0) / 1000).toFixed(1)} s.`);
