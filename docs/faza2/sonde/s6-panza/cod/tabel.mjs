// tabel.mjs — sonda s6-panza (ARUNCABIL). Generează tabelele Markdown ale raportului din fișierele de rezultate
// (cifrele din raport sunt generate, nu transcrise de mână). node tabel.mjs [rezultate.json]
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(process.argv[2] || 'rezultate.json', 'utf8'));
const f = (x, d = 1) => (x === undefined || x === null || Number.isNaN(x) ? '—' : typeof x === 'number' ? x.toFixed(d).replace('.', ',') : String(x));
const NUME = { c2d: 'Canvas2D, un Path2D mare', c2dcull: 'Canvas2D, Path2D pe 512 găleți + culling', c2dbmp: 'Canvas2D, bitmap de interacțiune', pixi: 'PixiJS v8 (mm)', pixium: 'PixiJS v8 (µm, teselare fină)', ck: 'CanvasKit (Skia WASM)', gl: 'WebGL2, segmente instanțiate', glstrip: 'WebGL2, LINE_STRIP', hybrid: 'Hibrid: WebGL2 jos + Canvas2D sus' };
console.log('### Cadre (timp până la terminarea pe GPU)\n');
console.log('| DPR | Randator | Forme | Segmente traseu | Hartă înălțime | Mișcare | Cadru median ms | Cadru p95 ms | Cadre > 16,7 ms | Construcție ms | Notă |');
console.log('|---|---|---:|---:|---|---|---:|---:|---:|---:|---|');
for (const r of R.rulari.filter((x) => x.q.page === 'bench')) {
  const q = r.q; const nota = [q.sync === 0 ? 'fără sincronizare: interval rAF ' + f(r.interval_ms?.med) + ' ms' : '', q.bmp ? 'vectori din bitmap' : '', r.exactMs ? 'redesen exact ' + f(r.exactMs, 0) + ' ms' : '', r.hfUploadMs ? 'urcare hartă ' + f(r.hfUploadMs, 0) + ' ms' : '', r.eroare ? 'EROARE' : ''].filter(Boolean).join('; ');
  const cad = q.sync === 0 ? r.interval_ms : r.cadru_ms;
  let nume = NUME[q.r] || q.r; if (q.r === 'c2d' && !q.n) nume = 'martor: pânză goală (doar sincronizarea)'; if (q.r === 'gl' && !q.tp && q.hf) nume = 'WebGL2: doar harta de înălțime';
  if (q.lw === 'dev') nume += ', linie 1 px fizic'; else if ((q.r === 'c2d' || q.r === 'c2dcull' || q.r === 'ck') && q.n && r.dpr !== 1) nume += ', linie 1 px CSS';
  console.log(`| ${f(r.dpr, 2)} | ${nume} | ${q.n ? (r.scena?.shapes ?? q.n) : 0} | ${q.tp ? (q.tp / 1e6).toString().replace('.', ',') + ' M' : '0'} | ${q.hf ? 'da' + (q.hfup ? ' (+dală/cadru)' : '') : 'nu'} | ${q.mode} | ${f(cad?.med)} | ${f(cad?.p95)} | ${q.sync === 0 ? '—' : r.cadre_peste_16_7ms} / ${cad?.n} | ${f(r.buildMs, 0)} | ${nota} |`);
}
console.log('\n### Fidelitatea la zoom (cerc plin R = 50 mm)\n');
console.log('| DPR | Randator | Zoom px/mm | Centru mm | Unghi | Puncte de muchie | Vârfuri poligon | Abatere max px | Prezis pe hârtie px | Rezidual px |');
console.log('|---|---|---:|---|---:|---:|---:|---:|---:|---:|');
for (const r of R.rulari.filter((x) => x.q.page === 'fid')) {
  console.log(`| ${f(r.dpr, 2)} | ${r.r} | ${r.zoom_px_per_mm} | ${r.centru_mm?.join(', ')} | ${r.theta_grade}° | ${r.puncte} | ${r.nVarfuri} | ${f(r.abatere_max_px, 3)} | ${f(r.prezis_max_px, 3)} | ${f(r.rezidual_fata_de_prezis_max_px, 3)} |`);
}
console.log('\n### Regula de umplere: ecran vs nucleu vs isPointInPath\n');
console.log('| DPR | Regula | Puncte | ecran≠nucleu | ecran≠isPointInPath | nucleu≠isPointInPath | pline: gogoașă aceeași orientare | gogoașă opuse | pentagramă | două cercuri | glife |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of R.rulari.filter((x) => x.q.page === 'fill')) for (const [rule, s] of Object.entries(r.reguli || {})) {
  const p = (k) => s.pe_forma[k] ? `${s.pe_forma[k].pline}/${s.pe_forma[k].n}` : '—';
  console.log(`| ${f(r.dpr, 2)} | ${rule} | ${s.puncte} | ${s.ecran_vs_nucleu} | ${s.ecran_vs_isPointInPath} | ${s.nucleu_vs_isPointInPath} | ${p('gogoasa-aceeasi-orientare')} | ${p('gogoasa-orientari-opuse')} | ${p('pentagrama')} | ${p('doua-cercuri-suprapuse')} | ${p('glifa')} |`);
}
console.log('\n### Clic real (mouse -> Pointer Events -> hit-test)\n');
console.log('| DPR | Pânza: dimensiune naivă | Pânza: device-pixel-content-box | Ținte | În afara ferestrei | Nelivrate | Corecte | Greșite | Eroare coordonată max (px CSS) | Hit-test ms med / p95 / max | Eveniment→rezultat ms med / p95 / max |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|---|---|');
for (const r of R.rulari.filter((x) => x.q.page === 'click')) {
  console.log(`| ${f(r.dpr, 2)} | ${r.canvas?.naive?.join('×')} | ${r.canvas?.exact?.join('×')} | ${r.clicuri} | ${r.in_afara_ferestrei ?? '—'} | ${r.nelivrate ?? '—'} | ${r.corecte} | ${r.gresite} | ${f(r.eroare_coordonata_max_px_css, 6)} | ${f(r.hit_ms?.med, 2)} / ${f(r.hit_ms?.p95, 2)} / ${f(r.hit_ms?.max, 2)} | ${f(r.eveniment_la_rezultat_ms?.med, 2)} / ${f(r.eveniment_la_rezultat_ms?.p95, 2)} / ${f(r.eveniment_la_rezultat_ms?.max, 2)} |`);
}
const info = R.rulari.filter((x) => x.q.page === 'info');
console.log('\n### Mașina\n');
if (R.masina && R.masina.browser) console.log('- Browser: Edge ' + R.masina.browser + '; chrome://gpu: ' + (R.masina.chrome_gpu || []).join('; '));
for (const i of info) console.log(`- DPR ${i.dpr}: WebGL ${i.renderer}; WebGPU ${JSON.stringify(i.webgpu)}`);
console.log('- Durata totală: ' + R.durata_totala_s + ' s');
