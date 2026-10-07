// v2-vcarve: reproduce cifrele-cheie ale verificarii in sub 3 minute (masina incarcata: ~2-3 min).
// cwd = dosarul de lucru (codul sondei s3 in src/, oracle/, corpus.mjs, fonts/ + fisierele v2). Rulare: node masoara-v2.mjs
import { execFileSync } from 'node:child_process';
const t0 = Date.now();
const run = (args, label, filter = /./, env = {}) => {
  const t = Date.now(); console.log(`\n##### ${label}`);
  let out = ''; try { out = execFileSync(process.execPath, ['--max-old-space-size=8192', ...args], { encoding: 'utf8', maxBuffer: 64 << 20, timeout: 170000, env: { ...process.env, ...env } }); } catch (e) { out = String(e.stdout || '') + '\nEROARE ' + e.message.slice(0, 200); }
  console.log(out.split('\n').filter((l) => filter.test(l)).map((l) => l.slice(0, 330)).join('\n'));
  console.log(`(${((Date.now() - t) / 1000).toFixed(1)} s)`);
};
const rows = /esant|hartie/;
// 1. (a) „C” cu fanta de 0,01 si (b) muchia aproape comuna; controlul negativ „circ” (raza algoritmului) trebuie sa sape
run(['verif.mjs', '--names=C_rotund_fanta0.01', '--variants=probe,circ'], '(a) h=0,05: sonda vs control negativ circ (raza algoritmului)', rows);
run(['verif.mjs', '--names=cerc_taiat_S', '--variants=probe'], '(b) muchie comuna exacta vs copie poliliniara (~0,9 um)', rows);
// 1b. C1 pe placuta sondei: h=0,05 (recomandat) vs h=0,02 (cu care s-au obtinut cifrele din raportul s3), runner-ul si oracolul SONDEI
run(['run.mjs', '--shapes=placuta', '--cands=voronoi', '--reps=1', '--gscale=2', '--h=0.05'], 'placuta 6 mm, h=0,05 (runner + oracol sonda)', /voronoi/);
run(['run.mjs', '--shapes=placuta', '--cands=voronoi', '--reps=1', '--gscale=2', '--h=0.02'], 'placuta 6 mm, h=0,02', /voronoi/);
// 2. (c) trasaturi subtiri la h=0,05 si h=0,02
run(['verif.mjs', '--names=linie_w0.02_L3.0137,linie_w0.03_L3.0137,text_tulpina', '--variants=probe'], '(c) h=0,05', /esant/);
run(['verif.mjs', '--names=linie_w0.02_L3.0137,linie_w0.03_L3.0137,text_tulpina', '--variants=probe', '--h=0.02'], '(c) h=0,02', /esant/);
// 3. (f) Kunstler: oracolul sondei (fals „peste” 0,0045) vs oracolul reparat
run(['verif.mjs', '--names=kunstler', '--variants=probe'], '(f) Kunstler, oracolul SONDEI', /esant/, { ORACOL: 'probe' });
run(['verif.mjs', '--names=kunstler', '--variants=probe'], '(f) Kunstler, oracolul REPARAT', /esant/, { ORACOL: 'fix' });
// 4. (d) firma 1200x400: legalizarea sondei (treceri complete, plafon 200) vs legalizarea cu stiva
run(['scale.mjs', '--variant=instr', '--check=1'], '(d) legalizarea sondei', /variant/);
run(['scale.mjs', '--variant=stack', '--check=1'], '(d) legalizarea cu stiva', /variant/);
// 5. (h) incrustatia cu adancime de start
run(['inlay.mjs', '--Ds=1.5', '--Df=3', '--Fm=2.5', '--g=0.02'], '(h) incrustatie, h=0,05', /joc|abatere/);
// 6. C3: flo-mat dupa conversia arcelor
run(['flomat2.mjs'], 'C3 flo-mat: cubice de 30 grd / o cubica pe sfert / patratice de 15 grd', /ok/);
console.log(`\nTOTAL ${((Date.now() - t0) / 1000).toFixed(1)} s`);
