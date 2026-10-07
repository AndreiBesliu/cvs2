// v3run.mjs — v3-panza-igpu (ARUNCABIL). Reface bancurile-cheie din s6 pe RTX 3060 și pe iGPU-ul AMD, fără nicio setare
// Windows: adaptorul se alege din linia de comandă a Edge și se VERIFICĂ la fiecare rulare (UNMASKED_RENDERER + chrome://gpu).
//   node v3run.mjs --gpu rtx|igpu|luid --plan timed|vsync|throttle|deaccel|masoara [--dpr 1,1.5] [--rate 1,4,6] [--out f.json]
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { startServer, PORT } from './server.mjs';

const EXE = process.env.S6_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const GPU = arg('gpu', 'rtx'), PLAN_NAME = arg('plan', 'timed');
const DPRS = arg('dpr', PLAN_NAME === 'throttle' || PLAN_NAME === 'masoara' ? '1' : '1,1.5').split(',').map(Number);
const RATES = arg('rate', PLAN_NAME === 'throttle' ? '1,4,6' : '1').split(',').map(Number);
const OUT = arg('out', `v3-${PLAN_NAME}-${GPU}.json`);
const VSYNC = PLAN_NAME === 'vsync' || PLAN_NAME === 'masoaravs' || PLAN_NAME === 'vsstrip';
const BASE = `http://127.0.0.1:${PORT}/bench.html`;

async function discoverLuid() { // LUID-ul iGPU-ului AMD, citit din chrome://gpu (se schimbă la repornirea Windows)
  const b = await chromium.launch({ headless: false, executablePath: EXE, args: ['--window-position=0,0', '--window-size=800,600'] });
  try { const p = await (await b.newContext({ viewport: null })).newPage(); await p.goto('chrome://gpu'); await p.waitForTimeout(1500);
    const txt = await p.evaluate(() => { const h = document.querySelector('info-view'); const r = h && h.shadowRoot; return (r ? r.textContent : document.body.innerText) || ''; });
    const m = txt.match(/VENDOR= 0x1002[^\n]*?LUID=\{(\d+),(\d+)\}/); return m ? `${m[1]},${m[2]}` : null;
  } finally { await b.close(); }
}
const GPU_ARGS = GPU === 'igpu' ? ['--force_low_power_gpu'] : GPU === 'luid' ? ['--use-adapter-luid=' + (await discoverLuid())] : [];
const ARGS = (dpr) => [...(VSYNC ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']), ...GPU_ARGS,
  '--disable-features=CalculateNativeWinOcclusion,AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,BlockOriginHeaderModificationOnRedirect,Translate,AutoDeElevate,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion',
  '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  `--force-device-scale-factor=${dpr}`, '--window-position=0,0', '--window-size=1400,860', '--enable-precise-memory-info'];

const F = 60;
const bench = (q) => ({ page: 'bench', frames: F, ...q });
const FID = (r, extra = {}) => ({ page: 'fid', r, zoom: 1000, cx: 150, cy: 150, theta: 37, ...extra });
const H50 = { r: 'hybrid', n: 50000, tp: 5000000, hf: 1, hfup: 1, bmp: 1, ib: 1 };
const PLANS = {
  timed: (d) => [
    bench({ r: 'c2d', n: 0, mode: 'pan' }),                                   // martor: pânză goală (doar citirea de 1 px)
    bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev' }), bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0 }),
    bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev' }), bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev', sync: 0 }),
    ...(d !== 1 ? [bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'css' }), bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'css', sync: 0 })] : []),
    bench({ r: 'gl', n: 0, tp: 1000000, mode: 'pan' }), bench({ r: 'gl', n: 0, tp: 2000000, mode: 'pan' }), bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan' }),
    bench({ r: 'glstrip', n: 0, tp: 5000000, mode: 'pan' }),
    bench({ r: 'gl', n: 0, tp: 0, hf: 1, hfup: 1, mode: 'pan' }),
    bench({ ...H50, mode: 'pan' }), bench({ ...H50, mode: 'zoom' }),
    FID('c2d'), FID('c2d', { theta: 90 }), FID('c2d', { cx: 2390, cy: 1170, theta: 0 }), FID('pixi'), // pixi = martor negativ (prezis 29,15 px)
  ],
  vsync: (d) => [
    bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0, frames: 120 }),  // martor pozitiv
    bench({ r: 'c2d', n: 0, mode: 'pan', sync: 0, frames: 120 }),                  // martor negativ
    bench({ ...H50, mode: 'pan', sync: 0, frames: 120 }), bench({ ...H50, mode: 'zoom', sync: 0, frames: 120 }),
    bench({ ...H50, tp: 1000000, mode: 'pan', sync: 0, frames: 120 }), bench({ ...H50, tp: 2000000, mode: 'pan', sync: 0, frames: 120 }),
    bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev', sync: 0, frames: 40 }), // redesen exact la fiecare cadru, fără citire
    bench({ r: 'gl', n: 0, tp: 5000000, rep: 8, mode: 'pan', sync: 0, frames: 60 }), // martor pozitiv GPU
  ],
  throttle: () => [
    bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev' }), bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0 }),
    bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev' }), bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev', sync: 0 }),
    { page: 'click', n: 20000 }, { page: 'click', n: 50000 },
  ],
  // fidelitatea pe o grilă: 3 centre (lângă origine, mijloc, colțul plăcii) x 3 unghiuri, la 1000 px/mm, + 100 px/mm la colț;
  // martorul negativ (PixiJS, abatere prezisă pe hârtie) la fiecare centru
  fidgrid: () => [[150, 150], [1220, 610], [2390, 1170]].flatMap(([cx, cy]) => [
    ...[0, 37, 90].flatMap((theta) => [FID('c2d', { cx, cy, theta }), FID('c2drtc', { cx, cy, theta })]), FID('c2d', { cx, cy, theta: 37, zoom: 100 }), FID('pixi', { cx, cy, theta: 37 })]),
  deaccel: () => [{ page: 'deaccel' }, { page: 'info' }],
  gpucpu: () => [bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0 }), bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev', sync: 0 }), bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev' }), bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan', sync: 0 })],
  info: () => [{ page: 'info' }],
  fidsw: () => [[150, 150], [2390, 1170]].flatMap(([cx, cy]) => [0, 37, 90].flatMap((theta) => [FID('c2dsw', { cx, cy, theta }), FID('c2d', { cx, cy, theta })])).concat([FID('pixi')]),
  vsstrip: () => [bench({ r: 'c2d', n: 0, mode: 'pan', sync: 0, frames: 120 }), bench({ ...H50, strip: 1, mode: 'pan', sync: 0, frames: 120 }), bench({ ...H50, strip: 1, mode: 'zoom', sync: 0, frames: 120 }), bench({ ...H50, strip: 1, mode: 'pan', frames: 60 })],
  masoaravs: () => [bench({ r: 'c2d', n: 0, mode: 'pan', sync: 0, frames: 120 }), bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0, frames: 120 }),
    bench({ ...H50, mode: 'pan', sync: 0, frames: 120 }), bench({ ...H50, strip: 1, mode: 'pan', sync: 0, frames: 120 })],
  masoara: () => [ // reproducerea scurtă (< 3 min): cifrele-cheie pe un adaptor
    bench({ r: 'c2d', n: 0, mode: 'pan' }), bench({ r: 'c2d', n: 10000, mode: 'pan', lw: 'dev', sync: 0 }), bench({ r: 'c2dcull', n: 50000, mode: 'pan', lw: 'dev', sync: 0 }),
    bench({ r: 'gl', n: 0, tp: 1000000, mode: 'pan' }), bench({ r: 'gl', n: 0, tp: 5000000, mode: 'pan' }), bench({ ...H50, mode: 'pan' }),
    FID('c2d'), FID('pixi'), { page: 'deaccel' },
  ],
};

async function chromeGpu(ctx) {
  const p = await ctx.newPage(); await p.goto('chrome://gpu'); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => { const h = document.querySelector('info-view'); const r = h && h.shadowRoot; return (r ? r.textContent : document.body.innerText) || ''; });
  await p.close();
  const status = (txt.match(/(Canvas|Compositing|Rasterization|WebGL2?|WebGPU)\s*:\s*[A-Za-z ,]+/g) || []).slice(0, 8).map((s) => s.replace(/\s+/g, ' ').trim());
  // Reparat: textul brut nu are „GPU0 :” cu spațiu, deci împărțirea pe adaptoare eșua și se citea al doilea nume din TOATĂ secțiunea.
  let active = '?'; const norm = txt.replace(/\s+/g, ' '); const i = norm.indexOf('GPU0'); const sec = i >= 0 ? norm.slice(i, i + 900) : '';
  for (const part of sec.split(/(?=GPU\d ?:)/)) if (part.includes('*ACTIVE*')) { const m = part.match(/DEVICE=0x[0-9a-f]+ \[([^\]]+)\]/i); active = m ? m[1] : part.slice(0, 80); }
  return { status, active };
}

// Timpul de procesor pe tip de proces (browser / renderer / GPU), din CDP SystemInfo.getProcessInfo, citit la începutul și la
// sfârșitul buclei de cadre (pagina cheamă window.__mark). Arată UNDE se duce costul redesenului: firul paginii sau procesul GPU.
let BCDP = null;
async function procCpu() { const r = await BCDP.send('SystemInfo.getProcessInfo'); const by = {}; for (const p of r.processInfo) by[p.type] = (by[p.type] || 0) + p.cpuTime; return { t: Date.now(), by }; }
async function runPage(ctx, q, rate) {
  const page = await ctx.newPage(); let cdp = null; const marks = {};
  await page.exposeBinding('__mark', async (_src, name) => { marks[name] = await procCpu(); });
  if (rate > 1) { cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); }
  const url = (q.page === 'lat' ? `http://127.0.0.1:${PORT}/lat.html` : BASE) + '?' + new URLSearchParams(q).toString();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now(); await page.goto(url, { timeout: 90000 });
  let res = await page.evaluate(() => window.__result, null);
  if (q.page === 'click' && res && res.targets) { // clicuri reale (CDP Input) -> Pointer Events -> hit-test, ca în s6
    const vw = res.viewport[0], vh = res.viewport[1]; let ok = 0, bad = 0, nel = 0, out = 0; const lat = [], hitMs = [];
    for (const t of res.targets) {
      if (t.x < 0 || t.y < 0 || t.x >= vw || t.y >= vh) { out++; continue; }
      const n0 = await page.evaluate(() => window.__events.length); await page.mouse.click(t.x, t.y);
      const e = await page.evaluate((k) => window.__events[k] || null, n0); if (!e) { nel++; continue; }
      if (e.id === t.want) ok++; else bad++; lat.push(e.dispatchToHandledMs); hitMs.push(e.hitMs);
    }
    const s = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return { med: +b[Math.floor(b.length / 2)].toFixed(3), p95: +b[Math.floor(b.length * 0.95)].toFixed(3), max: +b[b.length - 1].toFixed(3) }; };
    res = { n: res.n, dpr: res.dpr, calib_ms: res.calib_ms, gl_renderer: res.gl_renderer, clicuri: res.targets.length, in_afara: out, nelivrate: nel, corecte: ok, gresite: bad, hit_ms: s(hitMs), eveniment_la_rezultat_ms: s(lat) };
  }
  if (marks.start && marks.end) { // utilizarea medie a unui nucleu, pe tip de proces, în bucla de cadre (1,0 = un nucleu plin)
    const wall = (marks.end.t - marks.start.t) / 1000, u = {};
    for (const k of Object.keys(marks.end.by)) u[k] = +(((marks.end.by[k] - (marks.start.by[k] || 0)) / wall)).toFixed(3);
    res.cpu_nuclee = { wall_s: +wall.toFixed(2), ...u };
  }
  res = { q, rate, durata_s: (Date.now() - t0) / 1000, ...res }; if (errs.length) res.erori_pagina = errs.slice(0, 5);
  if (cdp) await cdp.detach().catch(() => {}); await page.close(); return res;
}

const SOFT = /SwiftShader|WARP|Basic Render|llvmpipe/i;
const srv = await startServer(); const all = { gpu: GPU, gpu_args: GPU_ARGS, plan: PLAN_NAME, vsync: VSYNC, browsere: [], rulari: [] }; const T0 = Date.now();
try {
  for (const dpr of DPRS) for (const rate of RATES) {
    const browser = await chromium.launch({ headless: false, executablePath: EXE, args: ARGS(dpr) });
    try {
      const ctx = await browser.newContext({ viewport: null }); const cg = await chromeGpu(ctx); BCDP = await browser.newBrowserCDPSession();
      all.browsere.push({ dpr, rate, version: browser.version(), ...cg }); console.log(`[${GPU} dpr ${dpr} rate ${rate}] chrome://gpu activ: ${cg.active} | ${cg.status.join('; ')}`);
      for (const q of PLANS[PLAN_NAME](dpr)) {
        const r = await runPage(ctx, q, rate); r.dpr_cerut = dpr; r.gpu = GPU; all.rulari.push(r);
        if (r.gl_renderer && SOFT.test(r.gl_renderer)) r.INVALID_software = true;
        const ren = (r.gl_renderer || '').replace(/ANGLE \(|Direct3D11.*$/g, '').slice(0, 40);
        const brief = q.page === 'bench' ? `${q.r} n=${q.n} tp=${q.tp || 0} ${q.mode} lw=${q.lw || 'css'} sync=${q.sync ?? 1}: cadru med ${r.cadru_ms?.med} p95 ${r.cadru_ms?.p95} | interval med ${r.interval_ms?.med} p95 ${r.interval_ms?.p95} max ${r.interval_ms?.max} (n=${r.cadru_ms?.n}) | build ${r.buildMs}${r.exactMs ? ' exact ' + r.exactMs : ''} | calib ${r.calib_ms}${r.cpu_nuclee ? ' | nuclee ' + JSON.stringify(r.cpu_nuclee) : ''}`
          : q.page === 'fid' ? `fid ${q.r} c=(${q.cx},${q.cy}) th=${q.theta}: max ${r.abatere_max_px}px prezis ${r.prezis_max_px} rez ${r.rezidual_fata_de_prezis_max_px} (n=${r.puncte})`
          : `${q.page} ${JSON.stringify(r).slice(0, 700)}`;
        console.log(`[${GPU} dpr ${dpr} rate ${rate}] ${brief} | ${ren}${r.INVALID_software ? ' !!SOFTWARE' : ''}${r.eroare ? ' EROARE ' + r.eroare.slice(0, 300) : ''}${r.erori_pagina ? ' ERR ' + r.erori_pagina.join(' | ').slice(0, 300) : ''}`);
      }
    } finally { await browser.close(); }
  }
} finally { srv.close(); }
all.durata_totala_s = (Date.now() - T0) / 1000;
fs.writeFileSync(OUT, JSON.stringify(all, null, 1)); console.log('scris', OUT, 'în', all.durata_totala_s, 's');
