// run.mjs — sonda s6-panza (ARUNCABIL). Rulează paginile într-un Chromium CU FEREASTRĂ (GPU real), port 5176.
// node run.mjs --quick      (masoara: < 3 min)      node run.mjs --full      node run.mjs --only fid
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { startServer, PORT } from './server.mjs';

const EXE = process.env.S6_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'; // Edge instalat (Chromium-ul Playwright nu pornește din sandbox)
const QUICK = process.argv.includes('--quick'), ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const OUT = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? process.argv[i + 1] : (QUICK ? 'rezultate-quick.json' : 'rezultate.json'); })();
const BASE = `http://127.0.0.1:${PORT}/bench.html`;
const VSYNC = process.argv.includes('--vsync'); // ecranul real: 60 Hz, fără ocolirea sincronizării verticale
const ARGS = (dpr) => [...(VSYNC ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']), '--disable-features=CalculateNativeWinOcclusion,AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,BlockOriginHeaderModificationOnRedirect,Translate,AutoDeElevate,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion', // lista Playwright + ocluzia ferestrei,
  '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  `--force-device-scale-factor=${dpr}`, '--window-position=0,0', '--window-size=1400,860', '--enable-precise-memory-info'];

const F = QUICK ? 60 : 120;
const bench = (q) => ({ page: 'bench', frames: F, ...q });
const FID = (r, extra = {}) => ({ page: 'fid', r, zoom: 1000, cx: 150, cy: 150, theta: 37, ...extra });
const PLAN = {
  1: [
    { page: 'info' },
    bench({ r: 'c2d', n: 0, mode: 'pan' }), // martor: pânză goală
    bench({ r: 'c2d', n: 10000, mode: 'pan' }), bench({ r: 'c2d', n: 50000, mode: 'pan' }), bench({ r: 'c2d', n: 50000, mode: 'pan', sync: 0 }),
    bench({ r: 'c2d', n: 10000, mode: 'zoom' }), bench({ r: 'c2dcull', n: 50000, mode: 'pan' }), bench({ r: 'c2dcull', n: 50000, mode: 'zoom' }),
    bench({ r: 'c2dbmp', n: 50000, mode: 'pan' }), bench({ r: 'c2dbmp', n: 50000, mode: 'zoom' }),
    bench({ r: 'pixi', n: 10000, mode: 'pan' }), bench({ r: 'pixi', n: 50000, mode: 'pan' }), bench({ r: 'pixi', n: 50000, mode: 'zoom' }),
    bench({ r: 'pixium', n: 50000, mode: 'pan' }),
    bench({ r: 'ck', n: 10000, mode: 'pan' }), bench({ r: 'ck', n: 50000, mode: 'pan' }), bench({ r: 'ck', n: 50000, mode: 'zoom' }),
    bench({ r: 'gl', n: 0, tp: 1000000, mode: 'pan' }), bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan' }), bench({ r: 'gl', n: 0, tp: 5000000, mode: 'zoom' }),
    bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan', sync: 0 }),
    bench({ r: 'glstrip', n: 0, tp: 5000000, mode: 'pan' }),
    bench({ r: 'gl', n: 0, tp: 0, hf: 1, hfup: 1, mode: 'pan' }),
    bench({ r: 'hybrid', n: 10000, tp: 1000000, hf: 1, hfup: 1, mode: 'pan' }),
    bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, mode: 'pan' }),
    bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, mode: 'pan' }), bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, mode: 'zoom' }),
    ...['c2d', 'pixi', 'pixiarc', 'pixium', 'ck', 'gl01', 'gl001'].flatMap((r) => [FID(r), FID(r, { theta: 90 }), FID(r, { cx: 2390, cy: 1170, theta: 0 })]),
    FID('c2d', { zoom: 10000, cx: 2390, cy: 1170 }), FID('ck', { zoom: 10000, cx: 2390, cy: 1170 }), FID('pixium', { zoom: 10000, cx: 2390, cy: 1170 }),
    { page: 'fill' }, { page: 'click', n: 20000 },
  ],
  1.25: [{ page: 'info' }, bench({ r: 'c2d', n: 50000, mode: 'pan' }), bench({ r: 'pixi', n: 50000, mode: 'pan' }), bench({ r: 'ck', n: 50000, mode: 'pan' }),
    bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan' }), bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, mode: 'pan' }),
    FID('c2d'), FID('pixi'), { page: 'fill' }, { page: 'click', n: 20000 }],
  1.5: [{ page: 'info' }, bench({ r: 'c2d', n: 50000, mode: 'pan' }), bench({ r: 'pixi', n: 50000, mode: 'pan' }), bench({ r: 'ck', n: 50000, mode: 'pan' }),
    bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan' }), bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, mode: 'pan' }),
    FID('c2d'), FID('pixi'), { page: 'fill' }, { page: 'click', n: 20000 }],
};
const DPR_SET = (d) => [
  ...(d === 1 ? [] : [bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'css' }), bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev' })]),
  bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'css' }), bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev' }),
  bench({ r: 'ck', n: 50000, mode: 'pan', lw: 'dev' }), bench({ r: 'c2dbmp', n: 50000, mode: 'pan' }),
  bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, mode: 'pan' }),
  FID('pixi'), { page: 'click', n: 20000 }];
const DPR_PLAN = { 1: DPR_SET(1), 1.25: [{ page: 'info' }, ...DPR_SET(1.25)], 1.5: [{ page: 'info' }, ...DPR_SET(1.5)] };
const BMP_SET = () => [bench({ r: 'c2dbmp', n: 50000, mode: 'pan', ib: 1 }), bench({ r: 'c2dbmp', n: 50000, mode: 'zoom', ib: 1 }),
  bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, ib: 1, mode: 'pan' }), bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, ib: 1, mode: 'zoom' })];
const BMP_PLAN = { 1: BMP_SET(), 1.25: BMP_SET(), 1.5: BMP_SET() };
const NOSYNC_SET = () => [bench({ r: 'c2dbmp', n: 50000, mode: 'pan', ib: 1, sync: 0 }), bench({ r: 'c2dbmp', n: 50000, mode: 'pan', ib: 1 }),
  bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, ib: 1, mode: 'pan', sync: 0 })];
const NOSYNC_PLAN = { 1.5: NOSYNC_SET() };
const VSYNC_SET = () => [bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0 }), // martor pozitiv: ~28 ms/cadru trebuie să apară ca ~33 ms
  bench({ r: 'c2d', n: 0, mode: 'pan', sync: 0 }), // martor negativ: pânza goală trebuie să apară ca ~16,7 ms
  bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, ib: 1, mode: 'pan', sync: 0 }),
  bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, ib: 1, mode: 'zoom', sync: 0 })];
const VSYNC_PLAN = { 1: VSYNC_SET(), 1.5: [...VSYNC_SET(),
  bench({ r: 'gl', n: 0, tp: 5000000, rep: 8, mode: 'pan' }), // martor pozitiv GPU: același lucru, măsurat cu sincronizare
  bench({ r: 'gl', n: 0, tp: 5000000, rep: 8, mode: 'pan', sync: 0 })] }; // ... și văzut prin ritmul real de 60 Hz
const QUICK_PLAN = { 1: [{ page: 'info' }, bench({ r: 'c2d', n: 0, mode: 'pan' }), bench({ r: 'c2dcull', n: 50000, mode: 'pan' }), bench({ r: 'c2dbmp', n: 50000, mode: 'pan' }),
  bench({ r: 'pixi', n: 50000, mode: 'pan' }), bench({ r: 'ck', n: 50000, mode: 'pan' }), bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan' }),
  bench({ r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, mode: 'pan' }),
  FID('c2d'), FID('pixi'), FID('ck'), { page: 'fill' }, { page: 'click', n: 20000 }] };

async function runPage(ctx, q) {
  const page = await ctx.newPage(); const url = BASE + '?' + new URLSearchParams(q).toString();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now(); await page.goto(url, { timeout: 60000 });
  let res = await page.evaluate(() => window.__result, null);
  if (q.page === 'click' && res && res.targets) { // clicuri reale de mouse -> Pointer Events, câte unul, cu potrivire explicită
    const vw = res.viewport[0], vh = res.viewport[1];
    let ok = 0, bad = 0, nelivrate = 0, inafara = 0, maxErrPx = 0; const lat = [], hitMs = [], wrong = [];
    for (const t of res.targets) {
      if (t.x < 0 || t.y < 0 || t.x >= vw || t.y >= vh) { inafara++; continue; } // ținta nu e în fereastră
      const n0 = await page.evaluate(() => window.__events.length);
      await page.mouse.click(t.x, t.y);
      const e = await page.evaluate((k) => window.__events[k] || null, n0);
      if (!e) { nelivrate++; continue; }
      const errPx = Math.hypot(e.wx - t.wx, e.wy - t.wy) * res.cam_s; // eroarea coordonatei, în px CSS
      maxErrPx = Math.max(maxErrPx, errPx);
      if (e.id === t.want) ok++; else { bad++; if (wrong.length < 5) wrong.push({ t, e }); }
      lat.push(e.dispatchToHandledMs); hitMs.push(e.hitMs);
    }
    const s = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return { med: +b[Math.floor(b.length / 2)].toFixed(3), p95: +b[Math.floor(b.length * 0.95)].toFixed(3), max: +b[b.length - 1].toFixed(3) }; };
    res = { n: res.n, dpr: res.dpr, canvas: res.canvas, viewport: res.viewport, clicuri: res.targets.length, in_afara_ferestrei: inafara, nelivrate, corecte: ok, gresite: bad,
      eroare_coordonata_max_px_css: +maxErrPx.toFixed(6), hit_ms: s(hitMs), eveniment_la_rezultat_ms: s(lat), exemple_gresite: wrong };
  }
  res = { q, durata_s: (Date.now() - t0) / 1000, ...res }; if (errs.length) res.erori_pagina = errs.slice(0, 5);
  await page.close(); return res;
}

const srv = await startServer(); const all = { masina: {}, rulari: [] }; const T0 = Date.now();
try {
  const plan = QUICK ? QUICK_PLAN : process.argv.includes('--dpr') ? DPR_PLAN : process.argv.includes('--bmp') ? BMP_PLAN : process.argv.includes('--nosync') ? NOSYNC_PLAN : VSYNC ? VSYNC_PLAN : PLAN;
  for (const dpr of Object.keys(plan)) {
    const browser = await chromium.launch({ headless: false, executablePath: EXE, args: ARGS(dpr) });
    try {
      const ctx = await browser.newContext({ viewport: null });
      if (!all.masina.chrome_gpu) { // starea accelerării, citită din chrome://gpu
        const p = await ctx.newPage(); await p.goto('chrome://gpu'); await p.waitForTimeout(1500);
        const txt = await p.evaluate(() => { const h = document.querySelector('info-view'); const r = h && h.shadowRoot; return (r ? r.textContent : document.body.innerText) || ''; });
        all.masina.chrome_gpu = (txt.match(/(Canvas|Compositing|Rasterization|WebGL2?|WebGPU|Video Decode)\s*:\s*[A-Za-z ,]+/g) || []).slice(0, 12).map((s) => s.replace(/\s+/g, ' ').trim());
        all.masina.browser = browser.version(); await p.close();
      }
      for (const q of plan[dpr]) {
        if (ONLY && q.page !== ONLY) continue;
        const r = await runPage(ctx, q); r.dpr_cerut = +dpr; all.rulari.push(r);
        const brief = q.page === 'bench' ? `${q.r} n=${q.n} tp=${q.tp || 0} ${q.mode}: cadru med ${r.cadru_ms?.med} p95 ${r.cadru_ms?.p95} (n=${r.cadru_ms?.n}) | interval med ${r.interval_ms?.med} | build ${r.buildMs} ms${r.exactMs ? ' exact ' + r.exactMs : ''} sync=${r.sync} lw=${q.lw || 'css'}`
          : q.page === 'fid' ? `fid ${q.r} z=${q.zoom} c=(${q.cx},${q.cy}) th=${q.theta}: max ${r.abatere_max_px}px prezis ${r.prezis_max_px} rez ${r.rezidual_fata_de_prezis_max_px} (n=${r.puncte})`
          : q.page === 'info' ? `info ${JSON.stringify(r).slice(0, 400)}` : `${q.page} ${JSON.stringify(r).slice(0, 600)}`;
        console.log(`[dpr ${dpr}] ${brief}${r.eroare ? ' EROARE ' + r.eroare.slice(0, 300) : ''}${r.erori_pagina ? ' ERR ' + r.erori_pagina.join(' | ').slice(0, 300) : ''}`);
      }
    } finally { await browser.close(); }
  }
} finally { srv.close(); }
all.durata_totala_s = (Date.now() - T0) / 1000;
fs.writeFileSync(OUT, JSON.stringify(all, null, 1)); console.log('scris', OUT, 'în', all.durata_totala_s, 's');
