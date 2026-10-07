// adaptoare.mjs — v3-panza-igpu (ARUNCABIL). Ce metodă de la nivelul browserului mută randarea pe iGPU?
// Nu schimbă nimic în Windows: doar comutatoare de linie de comandă ale Edge și powerPreference din pagină.
// node adaptoare.mjs [--luid 0x...]    -> adaptoare.json
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { startServer, PORT } from './server.mjs';

const EXE = process.env.S6_CHROME || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE_ARGS = ['--window-position=0,0', '--window-size=1000,700', '--disable-features=CalculateNativeWinOcclusion,Translate,msForceBrowserSignIn'];

async function gpuPage(ctx) { // chrome://gpu: liniile GPU0/GPU1 (cu LUID), starea accelerării, GL_RENDERER
  const p = await ctx.newPage(); await p.goto('chrome://gpu'); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => { const h = document.querySelector('info-view'); const r = h && h.shadowRoot; return (r ? r.textContent : document.body.innerText) || ''; });
  await p.close();
  const grab = (re) => (txt.match(re) || []).map((s) => s.replace(/\s+/g, ' ').trim());
  return {
    gpu_lines: grab(/GPU\d\s*VENDOR[^\n]{0,260}?(?=GPU\d|Optimus|AMD switchable|Driver D3D12|Desktop|Pixel shader|$)/g).slice(0, 4),
    luid_mentions: grab(/LUID[^,\n]{0,40}/g).slice(0, 8),
    gl_renderer: grab(/GL_RENDERER\s*ANGLE[^\n]{0,160}?D3D1[12]\)?/g).slice(0, 2),
    feature_status: grab(/(Canvas|Compositing|Rasterization|WebGL2?|WebGPU)\s*:\s*[A-Za-z ,]+?(?=Canvas|Compositing|Rasterization|WebGL|WebGPU|Video|Direct|Skia|Multiple|OpenGL|Vulkan|$)/g).slice(0, 8),
    raw_len: txt.length, raw_head: txt.slice(0, 0),
    raw_gpu_section: (() => { const i = txt.indexOf('GPU0'); return i >= 0 ? txt.slice(i, i + 900).replace(/\s+/g, ' ') : null; })(),
  };
}

async function probe(label, extraArgs) {
  const browser = await chromium.launch({ headless: false, executablePath: EXE, args: [...BASE_ARGS, ...extraArgs] });
  try {
    const ctx = await browser.newContext({ viewport: null });
    const g = await gpuPage(ctx);
    const p = await ctx.newPage(); await p.goto(`http://127.0.0.1:${PORT}/adaptor.html`);
    const r = await p.evaluate(() => window.__result); await p.close();
    return { label, args: extraArgs, browser: browser.version(), chrome_gpu: g, pagina: r };
  } catch (e) { return { label, args: extraArgs, eroare: String(e) }; } finally { await browser.close(); }
}

// adaptorul marcat *ACTIVE* în chrome://gpu (cel pe care rulează procesul GPU)
function activ(r) {
  const s = (r.chrome_gpu && r.chrome_gpu.raw_gpu_section) || '';
  for (const part of s.split(/(?=GPU\d :)/)) if (part.includes('*ACTIVE*')) { const m = part.match(/\[([^\]]+)\]/g); return m ? m[m.length > 1 ? 1 : 0] || m[0] : part.slice(0, 80); }
  return '?';
}
const ALL = !process.argv.includes('--doar-luid'); const srv = await startServer(); const out = [];
try {
  const luidArg = (() => { const i = process.argv.indexOf('--luid'); return i > 0 ? process.argv[i + 1] : null; })();
  const sets = !ALL ? [] : [['M0 implicit', []], ['M4 --force_low_power_gpu', ['--force_low_power_gpu']], ['M5 --use-angle=d3d11', ['--use-angle=d3d11']],
    ['M6 --use-webgpu-power-preference=force-low-power', ['--use-webgpu-power-preference=force-low-power']], ['M4b --force_low_power_gpu --use-angle=d3d11', ['--force_low_power_gpu', '--use-angle=d3d11']]];
  if (luidArg) for (const v of luidArg.split(';')) sets.push(['M3 --use-adapter-luid=' + v, ['--use-adapter-luid=' + v]]);
  for (const [label, args] of sets) { const r = await probe(label, args); out.push(r); const act = activ(r); r.activ = act; console.log(label, '| activ:', act, '| webgl:', r.pagina && r.pagina.webgl_implicit, '| webgpu:', JSON.stringify(r.pagina && r.pagina.webgpu_implicit), r.eroare || ''); }
} finally { srv.close(); }
fs.writeFileSync(ALL ? 'adaptoare.json' : 'adaptoare-luid.json', JSON.stringify(out, null, 1)); console.log('scris adaptoare.json');
