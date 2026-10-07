// latrun.mjs — v3-panza-igpu (ARUNCABIL). Conduce mouse-ul real (CDP Input, prin Playwright) peste pagina lat.html în timpul
// unei „furtuni” de redesene exacte și strânge latențele. Fereastră reală (headed), sincronizare verticală pornită (60 Hz).
//   node latrun.mjs --gpu rtx|igpu --modes idle,busy,main,worker,workerbmp --rate 1,4 --dur 6000 [--out f.json]
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { startServer, PORT } from './server.mjs';

const EXE = process.env.S6_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const GPU = arg('gpu', 'rtx'), MODES = arg('modes', 'idle,busy,main,worker,workerbmp').split(','), RATES = arg('rate', '1').split(',').map(Number);
const DUR = +arg('dur', '6000'), DPR = +arg('dpr', '1'), N = +arg('n', '50000'), SEG = +arg('seg', '25000'), OUT = arg('out', `v3-lat-${GPU}.json`);
const ARGS = [...(GPU === 'igpu' ? ['--force_low_power_gpu'] : []),
  '--disable-features=CalculateNativeWinOcclusion,Translate,msForceBrowserSignIn,PaintHolding', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows', `--force-device-scale-factor=${DPR}`, '--window-position=0,0', '--window-size=1400,860'];
function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

const srv = await startServer(); const all = { gpu: GPU, args: ARGS, dur: DUR, dpr: DPR, rulari: [] };
const browser = await chromium.launch({ headless: false, executablePath: EXE, args: ARGS });
try {
  const ctx = await browser.newContext({ viewport: null }); all.browser = browser.version();
  for (const rate of RATES) for (const mode of MODES) {
    const page = await ctx.newPage(); let cdp = null; const errs = [];
    page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    if (rate > 1) { cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); }
    await page.goto(`http://127.0.0.1:${PORT}/lat.html?mode=${mode}&n=${N}&busyMs=100&seg=${SEG}`, { timeout: 120000 });
    const ready = await page.evaluate(() => window.__ready);
    if (ready.eroare) { console.log(mode, 'EROARE', ready.eroare); all.rulari.push({ mode, rate, ready }); await page.close(); continue; }
    await page.mouse.move(700, 400); await sleep(300);
    await page.evaluate((d) => { window.__stormP = window.__startStorm(d); }, DUR);
    const r = rng(1234 + rate), t0 = Date.now(); let clicks = 0, movesSent = 0;
    while (Date.now() - t0 < DUR - 400) { // mișcări și clicuri la momente aleatoare față de faza redesenului
      const x = 37 + 30 + r() * (1281 - 60), y = 23 + 30 + r() * (721 - 60);
      await page.mouse.move(x, y, { steps: 3 }); movesSent += 3; await sleep(25 + r() * 90);
      if (r() < 0.6) { await page.mouse.down(); await page.mouse.up(); clicks++; await sleep(25 + r() * 90); }
    }
    const res = await page.evaluate(() => window.__stormP);
    const row = { mode, rate, gpu: GPU, ready, clicks_trimise: clicks, miscari_trimise: movesSent, ...res }; if (errs.length) row.erori = errs.slice(0, 5);
    all.rulari.push(row);
    const ren = (ready.gl_renderer || '').replace(/ANGLE \(|Direct3D11.*$/g, '').slice(0, 36);
    console.log(`[${GPU} rate ${rate}] ${mode}: frames ${res.frames ?? '-'} rec ${JSON.stringify(res.rec_ms || {})} iv ${JSON.stringify(res.interval_ms || {})}${res.redesen_complet_ms ? ' complet ' + JSON.stringify(res.redesen_complet_ms) : ''} | down delay ${JSON.stringify(res.pointerdown.delay_ms)} to_raf ${JSON.stringify(res.pointerdown.to_raf_ms)} | ET ${res.event_timing.n_peste_16ms}/${res.event_timing.din_total} dur ${JSON.stringify(res.event_timing.duration_ms)} | move ${JSON.stringify(res.pointermove_delay_ms)} | longtask ${JSON.stringify(res.longtask)} | calib main ${ready.calib_main_ms?.toFixed(1)} worker ${ready.worker_init?.calib_ms?.toFixed?.(1) ?? '-'}/${res.calib_ms?.toFixed?.(1) ?? '-'}${res.transfer ? ' | transfer ' + JSON.stringify(res.transfer) : ''}${res.tib_ms ? ' tib ' + JSON.stringify(res.tib_ms) : ''} | ${ren}${errs.length ? ' ERR ' + errs.join(' | ').slice(0, 300) : ''}`);
    if (cdp) await cdp.detach().catch(() => {}); await page.close();
  }
} finally { await browser.close(); srv.close(); }
fs.writeFileSync(OUT, JSON.stringify(all, null, 1)); console.log('scris', OUT);
