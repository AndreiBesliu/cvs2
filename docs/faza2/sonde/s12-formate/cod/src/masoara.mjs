// masoara.mjs - reproduce cifrele-cheie ale sondei s12-formate (EPS). ARUNCABIL.
// Ruleaza: psmini (al nostru) vs Ghostscript (arbitru, AGPL, doar test) + PyMuPDF (citeste PDF-ul arbitrului)
// + valori pe hartie; apoi otravurile, care TREBUIE sa iasa rosii; apoi inventarul operatorilor si duratele.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { inventar } from './inventar.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PY = path.join(ROOT, '.venv', 'Scripts', 'python.exe');
const E = path.join(ROOT, 'samples', 'pillow-12.3.0', 'Tests', 'images', 'eps');
const OUT = path.join(ROOT, 'out'); fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(PY)) { console.error('lipseste .venv/Scripts/python.exe (vezi RAPORT §7)'); process.exit(2); }

const node = (args, env = {}) => spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8' });
const runOurs = (file, mode, profile, out, poison) => JSON.parse(node([path.join('src', 'run.mjs'), file, mode, profile, out], poison ? { POISON: poison } : {}).stdout.trim());
const gsPdf = (file, out) => { if (!fs.existsSync(out)) { const r = node([path.join('testonly', 'gs2pdf.cjs'), file, out]); if (r.status) throw new Error('gs: ' + r.stderr); } };
const compare = (ours, pdf, paper) => { const r = spawnSync(PY, [path.join('oracle', 'compare.py'), ours, pdf, '0', '0', paper], { cwd: ROOT, encoding: 'utf8' }); return JSON.parse(r.stdout.trim()); };

const CASES = [
  { id: 'propriu (s2, scriitorul nostru)', file: path.join(ROOT, 'samples', 'own', 'corpus.eps'), mode: 'full', profile: 'none', paper: 'own-corpus' },
  { id: 'gnuplot 4.6', file: path.join(E, 'zero_bb.eps'), mode: 'full', profile: 'none', paper: 'gnuplot' },
  { id: 'PS simplu (reqd_showpage)', file: path.join(E, 'reqd_showpage.eps'), mode: 'full', profile: 'none', paper: 'none' },
  { id: 'Illustrator CS6 (16.0), corp + profil AGM', file: path.join(E, 'illuCS6_no_preview.eps'), mode: 'body', profile: 'ai-agm', paper: 'ai-cs6' },
];
const POISONS = [
  { id: 'Illustrator, scale ignorat', base: 3, poison: 'no-scale' },
  { id: 'Illustrator, curba citita ca linie', base: 3, poison: 'cv-as-li' },
  { id: 'propriu, curba citita ca linie', base: 0, poison: 'cv-as-li' },
  { id: 'gnuplot, scale ignorat', base: 1, poison: 'no-scale' },
];

console.log('=== 1. Cititorul nostru (psmini) fata de Ghostscript + hartie (toleranta 0,01 pt = 0,0035 mm; hartia la 1e-6 pt)');
const rows = [];
let red = 0;
CASES.forEach((c, i) => {
  const ours = path.join(OUT, `m-${i}.json`); const pdf = path.join(OUT, `m-${i}-gs.pdf`);
  const s = runOurs(c.file, c.mode, c.profile, ours); gsPdf(c.file, pdf); const k = compare(ours, pdf, c.paper);
  if (!k.VERDE) red++;
  rows.push(c);
  console.log(`${k.VERDE ? 'VERDE' : 'ROSU '} | ${c.id} | mod ${c.mode} | pictari noi ${JSON.stringify(s.kinds)} / gs ${JSON.stringify(k.gs_paint)} | curbe ${s.curves} | Hausdorff ancore ${k.H_anchors_ours_to_gs}/${k.H_anchors_gs_to_ours} pt, control ${k.H_ctrls_ours_to_gs}/${k.H_ctrls_gs_to_ours} pt | hartie ${k.paper_points - k.paper_bad.length}/${k.paper_points} | eroare: ${s.fatal || '-'}`);
});
console.log('\n=== 2. Fara profil / interpretare completa a procset-urilor (se asteapta oprire)');
for (const [id, file, mode] of [['Illustrator CS6, corp FARA profil', path.join(E, 'illuCS6_no_preview.eps'), 'body'], ['Illustrator CS6, tot fisierul (procset-uri AGM + CoolType)', path.join(E, 'illuCS6_no_preview.eps'), 'full'], ['Photoshop (EPS raster)', path.join(E, '1.eps'), 'full']]) {
  const s = runOurs(file, mode, 'none', path.join(OUT, 'tmp.json'));
  console.log(`${id}: cai ${s.paths}, ajuns la ${s.reachedPct}% din fisier, oprit la: ${s.fatal || '-'}`);
}
console.log('\n=== 3. Otravuri (control negativ): TREBUIE sa iasa ROSU');
let poisonOk = 0;
POISONS.forEach((p, j) => {
  const c = CASES[p.base]; const ours = path.join(OUT, `p-${j}.json`); const pdf = path.join(OUT, `m-${p.base}-gs.pdf`);
  runOurs(c.file, c.mode, c.profile, ours, p.poison); const k = compare(ours, pdf, c.paper);
  if (!k.VERDE) poisonOk++;
  console.log(`${k.VERDE ? 'VERDE (RAU: otrava nevazuta)' : 'ROSU (bine)'} | ${p.id} | ancore in afara tol ${JSON.stringify(k.anchors_off_tol)}, control ${JSON.stringify(k.ctrls_off_tol)}, hartie gresita ${k.paper_bad.length}`);
});
console.log('\n=== 4. Inventarul operatorilor (nume executabile din fisier; "standard" = systemdict Ghostscript)');
const gsList = fs.readFileSync(path.join(OUT, 'gs-systemdict.txt'), 'latin1').split(/\r?\n/);
for (const c of CASES) { const v = inventar(c.file, gsList); console.log(`${c.id}: ${v.bytesPrintable} B; nume distincte ${v.distinctNames}; operatori standard folositi ${v.standardOpsUsed} (psmini are numele pentru ${v.implementedByPsmini}); proceduri ale producatorului ${v.producerProcNames}; nume in corpul paginii ${v.bodyDistinctNames}`); }
console.log('\n=== 5. Durate (mediana din 5; masina impartita cu alti agenti, doar orientativ)');
const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
const tOurs = [], tGs = [];
for (let r = 0; r < 5; r++) {
  tOurs.push(runOurs(CASES[3].file, 'body', 'ai-agm', path.join(OUT, 'tmp.json')).ms);
  const g = JSON.parse(node([path.join('testonly', 'gs2pdf.cjs'), CASES[3].file, path.join(OUT, 'tmp-gs.pdf')]).stdout.trim()); tGs.push(g.gs_ms);
}
console.log(`Illustrator CS6: psmini (corp) ${med(tOurs)} ms; Ghostscript-WASM EPS->PDF ${med(tGs)} ms (fara pornirea modulului)`);
console.log('\n=== 6. WMF / EMF (acelasi desen, din testele Pillow): lister propriu din [MS-WMF]/[MS-EMF] + SheetJS wmf');
const I = path.join(ROOT, 'samples', 'pillow-12.3.0', 'Tests', 'images');
for (const f of ['drawing.wmf', 'drawing.emf']) { const r = spawnSync(PY, [path.join('oracle', 'wmf_list.py'), path.join(I, f)], { cwd: ROOT, encoding: 'utf8' }); console.log(f + ': ' + r.stdout.trim().slice(0, 420)); }
try {
  const { createRequire } = await import('node:module'); const WMFJS = createRequire(import.meta.url)('wmf'); const d = fs.readFileSync(path.join(I, 'drawing.wmf'));
  for (const [lbl, buf] of [['fisierul intreg', d], ['fara antetul placeable de 22 B', d.subarray(22)]]) { try { const a = WMFJS.get_actions(buf); console.log(`SheetJS wmf, ${lbl}: OK, ${a.length} actiuni`); } catch (e) { console.log(`SheetJS wmf, ${lbl}: EROARE ${String(e).slice(0, 80)}`); } }
} catch (e) { console.log('SheetJS wmf neinstalat (npm ci): ' + e.message); }
console.log(`\nREZULTAT: cazuri verzi ${CASES.length - red}/${CASES.length}; otravuri prinse ${poisonOk}/${POISONS.length}`);
process.exit(red === 0 && poisonOk === POISONS.length ? 0 : 1);
