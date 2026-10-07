// masoara.mjs — reproduce cifrele-cheie ale sondei s4 în ~2–3 minute pe o mașină liberă.
// cwd = folderul sondei; `npm install` o dată; apoi: node masoara.mjs   (fără browser: node masoara.mjs --fara-browser)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const node = process.execPath, t0 = Date.now();
const run = (args, label) => {
  const t = Date.now();
  const out = execFileSync(node, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  console.log(`\n## ${label} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  return out;
};
// 1) corectitudine: nucleu vs hârtie vs oracol (verdict așteptat: 1 = aproximarea declarată de la profil-rampa)
let o = run(['test/run-corpus.mjs'], 'corpus: nucleu vs hartie vs oracol');
console.log(o.trim().split('\n').pop());
// 2) debit și memorie în Node (variantă scurtă: 3 repetări, subset 3D de 1 M mutări, 1 vs 8 fire)
o = run(['bench/bench-node.mjs', '--quick'], 'debit Node');
console.log(o.trim());
// 3) JS vs WASM (AssemblyScript), același cod
if (!existsSync('out/kernel.wasm')) execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['asc', 'as/kernel.ts', '-O3', '--runtime', 'stub', '--noAssert', '--initialMemory', '1200', '-o', 'out/kernel.wasm'], { stdio: 'inherit', shell: true });
o = run(['bench/js-vs-wasm.mjs', '100'], 'JS vs WASM (250 k mutari, bila)');
console.log(o.trim());
// 4) browser: Edge cu fereastră — determinism față de Node + WebGPU
if (!process.argv.includes('--fara-browser')) {
  o = run(['web/run-browser.mjs', 'msedge', '--quick'], 'Edge: acelasi nucleu + WebGPU');
  console.log(o.trim());
  const b = JSON.parse(readFileSync('out/browser-msedge-quick.json', 'utf8'));
  const n = JSON.parse(readFileSync('out/bench-node-quick.json', 'utf8'));
  console.log('\nDETERMINISM Node = Edge:',
    '2d@0.25', n.rez['2d@0.25'].hash === b.cpu2d_025.hash ? 'IDENTIC' : 'DIFERIT',
    '| 3d-subset@0.1', n.rez['3d-subset@0.1'].hash === b.cpu3d_subset.hash ? 'IDENTIC' : 'DIFERIT');
}
console.log(`\nTotal ${((Date.now() - t0) / 1000).toFixed(0)} s`);
