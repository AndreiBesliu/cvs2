// Reproduce cifrele-cheie ale sondei s3-vcarve in mai putin de 3 minute (pe o masina libera, ~1-2 min).
// cwd = dosarul sondei (cu node_modules instalat: npm ci). Rulare: node masoara.mjs
import { execFileSync } from 'node:child_process';
const t0 = Date.now();
const run = (args, label) => {
  const t = Date.now(); console.log(`\n##### ${label}`);
  const out = execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 << 20, timeout: 170000 });
  console.log(out.split('\n').filter((l) => /==|voronoi|flomat|voron8|grid|hartie|ok |AGATAT|EROARE|cel mai rau/.test(l)).join('\n'));
  console.log(`(${((Date.now() - t) / 1000).toFixed(1)} s)`);
};
// 1. valorile pe hartie + formele simple, candidatii (a) si (d), grila 2x mai rara decat in raport
run(['run.mjs', '--shapes=dreptunghi_12x6,cerc,triunghi,stea,inel,dinte,perete', '--cands=voronoi,flomat', '--reps=5', '--gscale=2'], 'forme simple (hartie, abateri, timp median din 5)');
// 2. placuta de 6 mm (reperul vechi: 161 842 de linii), grila 0,02 mm
run(['run.mjs', '--shapes=placuta', '--cands=voronoi,flomat', '--reps=5', '--gscale=2'], 'placuta 6 mm, 3 randuri');
// 3. fund plat: firma 300x100 si incrustatia mascul, grila mai rara
run(['run.mjs', '--shapes=firma,incrustatie', '--cands=flomat,voronoi', '--reps=1', '--gscale=2'], 'fund plat cu freza dreapta');
// 4. referinta exacta (CGAL, doar unealta de proba) pe litere
run(['run.mjs', '--shapes=litere_roboto_B', '--cands=voron8', '--reps=1', '--gscale=2'], 'voron8 (CGAL SDG2) pe litere');
// 5. robustetea flo-mat pe dreptunghiul rotunjit
run(['robust-flomat.mjs', '--limit=8000'], 'flo-mat: robustete (fiecare caz in worker, 8 s limita)');
console.log(`\nTOTAL ${((Date.now() - t0) / 1000).toFixed(1)} s`);
