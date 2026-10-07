// Reproduce cifrele cheie ale sondei s5-relief in sub 3 minute.
// cwd = folderul sondei (cu node_modules: `npm ci`), apoi: node masoara.mjs
// Deschide Edge HEADED (GPU real) pe portul 5175 si il inchide la final. --fara-browser sare partea de browser.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const t0 = Date.now();
const run = (args) => { const t = Date.now(); execFileSync(process.execPath, args, { stdio: 'inherit' }); console.log(`-- ${args.join(' ')}: ${((Date.now() - t) / 1000).toFixed(1)} s`); };
run(['oracole-hf.mjs', '--quick']);
run(['--max-old-space-size=8192', 'oracole-mesh.mjs', '--quick']);
run(['--max-old-space-size=8192', 'basrelief.mjs', '--n=2000', '--cicluri=6']);
if (!process.argv.includes('--fara-browser')) run(['run-browser.mjs', '--quick']);

const J = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const hf = J('rezultate/oracole-hf.json'), me = J('rezultate/oracole-mesh.json'), br = J('rezultate/browser-main.json'), mem = J('rezultate/browser-mem.json'), bas = J('rezultate/basrelief.json');
const worst = (v) => Math.max(...hf.cl.map((r) => r[v].scobitura_max_mm));
console.log('\n================ REZUMAT s5-relief ================');
console.log('scobitura maxima (corpus analitic): A nod =', worst('A_nod'), '| B nod+vecini =', worst('B_nod_vecini'), '| C celula+segment =', worst('C_celula_segment'), 'mm');
console.log('creasta bila (plan): ', hf.scallop.filter((s) => s.panta_transversala_grade === 0).map((s) => `R${s.R} s${s.pas_lateral_mm}: formula ${s.formula_mm} sim ${s.simulat_cu_CL_exact_mm}`).join(' | '));
console.log('volum semisfera R20, celula 0,1: eroare relativa', hf.volume.find((v) => v.celula_mm === 0.1).eroare_rel_noduri);
console.log('plasa: puncte in afara intervalului [CL(rho_min), CL(Rs)] =', me.hemi.map((h) => h.in_afara_intervalului).join('/'));
console.log('plasa scena:', me.scena.triunghiuri, 'triunghiuri; raster nod', me.scena.raster_nod_4000_ms, 'ms; conservativ', me.scena.raster_conservativ_4000_ms, 'ms; bila: plasa', me.scena['bila R3'].plasa_CL_pe_s, 'CL/s vs grila', me.scena['bila R3'].grila_CL_pe_s_1fir, 'CL/s (1 fir)');
console.log('bas-relief', bas.n, '^2: Poisson', bas.compresie.poisson_ms, 'ms; identitate eroare', bas.identitate.eroare_max_mm, 'mm; oracol', bas.oracol_poisson.eroare_max_mm, 'mm');
if (br) {
  console.log('GPU:', br.webgl?.renderer, '| software:', br.software_renderer);
  console.log('blur 4000^2: CPU 1 fir', br.blur_cpu_1fir_ms, 'ms | workeri', JSON.stringify(br.blur_workeri_ms), '| WebGPU', br.blur_webgpu_ms, 'ms');
  for (const [k, v] of Object.entries(br.dropcutter || {})) console.log('drop-cutter', k, ': WebGPU', v.webgpu_ms, 'ms | CPU 1 fir estimat', v.cpu_1fir_ms_estimat_tot, 'ms | workeri', v.workeri16_ms_tot ?? '-', 'ms | diferenta', v.webgpu_vs_cpu_maxdiff);
  console.log('afisare fps:', Object.entries(br.afisare || {}).map(([k, v]) => `${k}=${v.fps_median}`).join(' '));
}
if (mem) console.log('memorie: straturi 64 MB alocate', mem.straturi_alocate, '(plafon', mem.cap_straturi + ')', '| ArrayBuffer unic', JSON.stringify(mem.arraybuffer_unic), '| wasm32', mem.wasm32_octeti_dupa_grow, '| memory64', JSON.stringify(mem.memory64));
console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
