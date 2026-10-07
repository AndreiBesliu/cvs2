// tabele-v3.mjs — v3-panza-igpu (ARUNCABIL). Generează tabelele din raport direct din fișierele de rezultate (nu de mână).
//   node tabele-v3.mjs > tabele-v3.md
import fs from 'node:fs';
const J = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const f1 = (x) => (x == null || Number.isNaN(x) ? '—' : (+x).toFixed(1).replace('.', ','));
const f3 = (x) => (x == null ? '—' : (+x).toFixed(3).replace('.', ','));
const out = []; const P = (s = '') => out.push(s);
const key = (q) => `${q.r}|${q.n}|${q.tp || 0}|${q.mode}|${q.lw || 'css'}|${q.sync ?? 1}|${q.hf || 0}|${q.rep || 1}`;

const NAMES = {
  'c2d|0|0|pan|css|1|0|1': 'martor: pânză goală (citire 1 px)',
  'c2d|10000|0|pan|dev|1|0|1': 'Canvas2D 10 k, redesen exact, cu citire (metoda s6)',
  'c2d|10000|0|pan|dev|0|0|1': 'Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală)',
  'c2dcull|50000|0|pan|dev|1|0|1': 'Canvas2D 50 k pe găleți, cu citire (metoda s6)',
  'c2dcull|50000|0|pan|dev|0|0|1': 'Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală)',
  'c2d|10000|0|pan|css|1|0|1': 'Canvas2D 10 k, linie 1 px CSS, cu citire',
  'c2d|10000|0|pan|css|0|0|1': 'Canvas2D 10 k, linie 1 px CSS, fără citire',
  'gl|0|1000000|pan|css|1|0|1': 'WebGL2 1 M segmente instanțiate',
  'gl|0|2000000|pan|css|1|0|1': 'WebGL2 2 M segmente instanțiate',
  'gl|0|5000000|pan|css|1|0|1': 'WebGL2 5 M segmente instanțiate',
  'glstrip|0|5000000|pan|css|1|0|1': 'WebGL2 5 M ca LINE_STRIP (1 px)',
  'gl|0|0|pan|css|1|1|1': 'WebGL2 hartă 4096×2048 + dală/cadru',
  'hybrid|50000|5000000|pan|css|1|1|1': 'Hibrid 50 k (bitmap) + 5 M + hartă, pan',
  'hybrid|50000|5000000|zoom|css|1|1|1': 'Hibrid 50 k (bitmap) + 5 M + hartă, zoom',
};
const VNAMES = {
  'c2d|10000|0|pan|dev|0|0|1': 'martor pozitiv: Canvas2D 10 k exact la fiecare cadru',
  'c2d|0|0|pan|css|0|0|1': 'martor negativ: pânză goală',
  'hybrid|50000|5000000|pan|css|0|1|1': 'hibrid 50 k + **5 M** + hartă, pan',
  'hybrid|50000|5000000|zoom|css|0|1|1': 'hibrid 50 k + **5 M** + hartă, zoom',
  'hybrid|50000|1000000|pan|css|0|1|1': 'hibrid 50 k + **1 M** + hartă, pan',
  'hybrid|50000|2000000|pan|css|0|1|1': 'hibrid 50 k + **2 M** + hartă, pan',
  'c2dcull|50000|0|pan|dev|0|0|1': 'Canvas2D 50 k exact la fiecare cadru (fără citire)',
  'gl|0|5000000|pan|css|0|0|8': 'martor pozitiv GPU: 5 M segmente × 8 desene',
};

function grid(files, names, metric, title) {
  const runs = files.map(([lab, f]) => [lab, J(f)]).filter(([, j]) => j);
  const cols = []; for (const [lab, j] of runs) for (const d of [...new Set(j.rulari.map((r) => r.dpr_cerut))]) cols.push({ lab: `${lab} DPR ${String(d).replace('.', ',')}`, j, d });
  P(`##### ${title}`); P(); P(`| Ce | ${cols.map((c) => c.lab).join(' | ')} |`); P(`|---|${cols.map(() => '---:').join('|')}|`);
  for (const [k, name] of Object.entries(names)) {
    const cells = cols.map((c) => { const r = c.j.rulari.find((x) => x.q.page === 'bench' && x.dpr_cerut === c.d && key(x.q) === k); return r ? metric(r) : '—'; });
    if (cells.every((x) => x === '—')) continue; P(`| ${name} | ${cells.join(' | ')} |`);
  }
  P();
}
const timedMetric = (r) => { const s = (r.q.sync ?? 1) !== 0; const m = s ? r.cadru_ms : r.interval_ms; return `${f1(m?.med)} / ${f1(m?.p95)}${s ? '' : ' ⁱ'}`; };
const vsMetric = (r) => `${f1(r.interval_ms?.med)} / ${f1(r.interval_ms?.p95)} / ${f1(r.interval_ms?.max)}`;

P('###### A. Cadre, timp până la terminare (median / p95, ms), sincronizarea verticală oprită'); P();
P('ⁱ = fără citire: intervalul dintre cadre (debitul conductei), fiindcă apelul de desen în sine durează ~0,1 ms.'); P();
grid([['RTX', 'v3-timed-rtx.json'], ['iGPU', 'v3-timed-igpu.json']], NAMES, timedMetric, 'Bancurile-cheie s6, pe ambele adaptoare');
P('###### B. Ritmul real la 60 Hz (interval rAF median / p95 / max, ms; 16,7 = niciun cadru pierdut)'); P();
grid([['RTX', 'v3-vsync-rtx.json'], ['iGPU', 'v3-vsync-igpu.json']], VNAMES, vsMetric, 'Sincronizarea verticală pornită, fără citiri');

P('###### B2. iGPU: hibridul cu traseele ca LINE_STRIP (5 M segmente, linie de 1 px), sincronizarea verticală pornită'); P();
P('| DPR | Ce | Interval rAF med / p95 / max ms | Cadru cu citire med / p95 ms |'); P('|---:|---|---|---|');
{ const j = J('v3-vsstrip-igpu.json'); if (j) for (const r of j.rulari.filter((x) => x.q.page === 'bench')) P(`| ${String(r.dpr_cerut).replace('.', ',')} | ${r.q.r === 'c2d' ? 'martor negativ: pânză goală' : 'hibrid 50 k + 5 M LINE_STRIP + hartă, ' + r.q.mode + ((r.q.sync ?? 1) !== 0 ? ' (cu citire)' : '')} | ${f1(r.interval_ms?.med)} / ${f1(r.interval_ms?.p95)} / ${f1(r.interval_ms?.max)} | ${(r.q.sync ?? 1) !== 0 ? f1(r.cadru_ms?.med) + ' / ' + f1(r.cadru_ms?.p95) : '—'} |`); }
P();
P('###### C. Fidelitatea la zoom (cerc plin R = 50 mm, 1000 px/mm dacă nu scrie altfel)'); P();
P('| Adaptor | DPR | Randator | Centru mm | Unghi | Zoom | Puncte | Abatere max px | p95 px | > 0,1 px | > 0,25 px | Prezis px |'); P('|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const [lab, f] of [['RTX', 'v3-timed-rtx.json'], ['iGPU', 'v3-timed-igpu.json'], ['RTX', 'v3-fidgrid-rtx.json'], ['iGPU', 'v3-fidgrid-igpu.json'], ['iGPU', 'v3-fidsw-igpu.json']]) {
  const j = J(f); if (!j) continue;
  for (const r of j.rulari.filter((x) => x.q.page === 'fid')) P(`| ${lab} | ${String(r.dpr_cerut).replace('.', ',')} | ${r.r}${f.includes('timed') ? ' (rularea A)' : ''} | ${r.centru_mm?.join(', ')} | ${r.theta_grade}° | ${r.zoom_px_per_mm} | ${r.puncte} | ${f3(r.abatere_max_px)} | ${f3(r.abatere_p95_px)} | ${r.n_peste_0_1px ?? '—'} | ${r.n_peste_0_25px ?? '—'} | ${f3(r.prezis_max_px)} |`);
}
P();

P('###### D. Latența intrării în timpul redesenului exact de 50 k forme (mouse prin CDP Input, 60 Hz, DPR 1)'); P();
P('| Adaptor | CPU × | Mod | Redesene exacte: interval (sau complet) med / p95 ms | pointerdown: întârziere med / p95 / max ms | Event Timing: durata până la pictură med / p95 / max ms (≥16 ms / total) | pointermove: întârziere med / p95 ms | Sarcini lungi: total / max ms | Calibrare fir principal / worker ms |'); P('|---|---:|---|---|---|---|---|---|---|');
for (const f of ['v3-lat-rtx.json', 'v3-lat-sw-rtx.json', 'v3-lat-igpu.json', 'v3-lat-sw-igpu.json', 'v3-lat-rtx-throttle.json']) {
  const j = J(f); if (!j) continue;
  for (const r of j.rulari) {
    if (!r.pointerdown) { P(`| ${j.gpu} | ${r.rate} | ${r.mode} | EROARE | | | | | |`); continue; }
    const red = r.redesen_complet_ms ? `complet ${f1(r.redesen_complet_ms.med)} / ${f1(r.redesen_complet_ms.p95)} (cadre ${f1(r.interval_ms.med)} / ${f1(r.interval_ms.p95)})` : r.interval_ms ? `${f1(r.interval_ms.med)} / ${f1(r.interval_ms.p95)}` : '—';
    const pd = r.pointerdown.delay_ms, et = r.event_timing, mv = r.pointermove_delay_ms;
    const cw = r.ready?.worker_init ? `${f1(r.ready.calib_main_ms)} / ${f1(r.ready.worker_init.calib_ms)}` : `${f1(r.ready?.calib_main_ms)} / —`;
    P(`| ${j.gpu} | ${r.rate} | ${r.mode} | ${red} | ${f1(pd.med)} / ${f1(pd.p95)} / ${f1(pd.max)} | ${f1(et.duration_ms.med)} / ${f1(et.duration_ms.p95)} / ${f1(et.duration_ms.max)} (${et.n_peste_16ms} / ${et.din_total}) | ${f1(mv.med)} / ${f1(mv.p95)} | ${r.longtask.total_ms} / ${r.longtask.max_ms} | ${cw} |`);
  }
}
P();
P('Costul transferului (modurile workerbmp și workersw):'); P();
P('| Adaptor | CPU × | Mod | transferToImageBitmap în worker med / p95 ms | postMessage worker→principal med / p95 ms | transferFromImageBitmap med ms | de la postMessage la rAF med / p95 ms |'); P('|---|---:|---|---|---|---:|---|');
for (const f of ['v3-lat-rtx.json', 'v3-lat-sw-rtx.json', 'v3-lat-igpu.json', 'v3-lat-sw-igpu.json']) { const j = J(f); if (!j) continue; for (const r of j.rulari.filter((x) => (x.mode === 'workerbmp' || x.mode === 'workersw') && x.transfer)) P(`| ${j.gpu} | ${r.rate} | ${r.mode} | ${f1(r.tib_ms.med)} / ${f1(r.tib_ms.p95)} | ${f1(r.transfer.msg_ms.med)} / ${f1(r.transfer.msg_ms.p95)} | ${f1(r.transfer.tfib_ms.med)} | ${f1(r.transfer.post_to_raf_ms.med)} / ${f1(r.transfer.post_to_raf_ms.p95)} |`); }
P();

P('###### E. Procesorul încetinit prin CDP (Emulation.setCPUThrottlingRate), RTX, DPR 1'); P();
P('| CPU × | Calibrare fir principal ms | Ce | Cadru (cu citire) sau interval (fără citire) med / p95 ms | Nuclee folosite: renderer / GPU / browser |'); P('|---:|---:|---|---|---|');
{ const j = J('v3-throttle-rtx.json'); if (j) for (const r of j.rulari) {
  if (r.q.page === 'bench') { const s = (r.q.sync ?? 1) !== 0; const m = s ? r.cadru_ms : r.interval_ms; const cn = r.cpu_nuclee || {}; P(`| ${r.rate} | ${f1(r.calib_ms)} | ${NAMES[key(r.q)] || key(r.q)} | ${f1(m?.med)} / ${f1(m?.p95)} | ${f1(cn.renderer)} / ${f1(cn.GPU)} / ${f1(cn.browser)} |`); }
  else if (r.q.page === 'click') P(`| ${r.rate} | ${f1(r.calib_ms)} | clic real pe ${r.n} forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | ${f3(r.hit_ms?.med)} / ${f3(r.hit_ms?.p95)} / ${f3(r.hit_ms?.max)}; ${f3(r.eveniment_la_rezultat_ms?.med)} / ${f3(r.eveniment_la_rezultat_ms?.p95)} / ${f3(r.eveniment_la_rezultat_ms?.max)}; ${r.corecte}/${r.clicuri - r.in_afara} | — |`);
} }
P();
P('###### F. Unde se duce costul: nuclee de procesor pe tip de proces, în bucla de cadre (1,0 = un nucleu plin)'); P();
P('| Adaptor | Ce | Interval sau cadru med ms | renderer | GPU | browser |'); P('|---|---|---:|---:|---:|---:|');
for (const [lab, f, rate] of [['RTX', 'v3-throttle-rtx.json', 1], ['iGPU', 'v3-gpucpu-igpu.json', 1]]) { const j = J(f); if (!j) continue; for (const r of j.rulari.filter((x) => x.q.page === 'bench' && x.rate === rate && x.cpu_nuclee && x.cpu_nuclee.wall_s >= 0.5)) { const s = (r.q.sync ?? 1) !== 0; const m = s ? r.cadru_ms : r.interval_ms; P(`| ${lab} | ${NAMES[key(r.q)] || key(r.q)} | ${f1(m?.med)} | ${f1(r.cpu_nuclee.renderer)} | ${f1(r.cpu_nuclee.GPU)} | ${f1(r.cpu_nuclee.browser)} |`); } }
P();
P('###### G. Martorul de instrument: getImageData mută pânza pe procesor? (ms pe iterație, 12 iterații)'); P();
for (const [lab, f] of [['RTX', 'v3-deaccel-rtx.json'], ['iGPU', 'v3-deaccel-igpu.json']]) { const j = J(f); const r = j && j.rulari.find((x) => x.q.page === 'deaccel'); if (!r) continue;
  P(`- ${lab}: blur, pânză implicită: ${r.implicit.join(' · ')}; cu willReadFrequently: ${r.willReadFrequently.join(' · ')}`);
  if (r.implicit_umpleri) P(`- ${lab}: 40 de umpleri cu gradient, implicită: ${r.implicit_umpleri.join(' · ')}; cu willReadFrequently: ${r.willReadFrequently_umpleri.join(' · ')}`); }
P();
P('###### H. Mașina și adaptoarele verificate la fiecare rulare'); P();
for (const f of ['v3-timed-rtx.json', 'v3-timed-igpu.json', 'v3-vsync-rtx.json', 'v3-vsync-igpu.json', 'v3-throttle-rtx.json', 'v3-gpucpu-igpu.json', 'v3-fidgrid-rtx.json', 'v3-fidgrid-igpu.json', 'v3-fidsw-igpu.json', 'v3-vsstrip-igpu.json']) {
  const j = J(f); if (!j) continue; const ren = [...new Set(j.rulari.map((r) => r.gl_renderer).filter(Boolean))]; const soft = j.rulari.filter((r) => r.INVALID_software).length;
  P(`- \`${f}\`: argumente ${JSON.stringify(j.gpu_args)}; chrome://gpu activ: ${[...new Set(j.browsere.map((b) => b.active))].join(', ')}; UNMASKED_RENDERER pe ${j.rulari.filter((r) => r.gl_renderer).length} rulări: ${ren.join(' | ')}; software: ${soft}; ${j.durata_totala_s} s`);
}
for (const f of ['v3-lat-rtx.json', 'v3-lat-sw-rtx.json', 'v3-lat-igpu.json', 'v3-lat-sw-igpu.json', 'v3-lat-rtx-throttle.json']) { const j = J(f); if (!j) continue; P(`- \`${f}\`: argumente ${JSON.stringify(j.args.filter((a) => a.includes('gpu')))}; UNMASKED_RENDERER: ${[...new Set(j.rulari.map((r) => r.ready?.gl_renderer))].join(' | ')}; browser ${j.browser}`); }
console.log(out.join('\n'));
