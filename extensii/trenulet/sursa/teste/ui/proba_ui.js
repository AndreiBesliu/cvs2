// Scenariu de interfata (Playwright, Chromium cu swiftshader). PAGINA = documentul construit (iesire/preview.html),
// THREE = three.min.js r128 (previzualizarea 3D); capturile si descarcarile merg in IESIRE (implicit ./capturi).
const __cale = require('path'), __fs = require('fs');
const PAGINA = process.env.PAGINA || __cale.join(__dirname, '..', '..', 'iesire', 'preview.html');
const THREE_CALE = process.env.THREE || require.resolve('three/build/three.min.js');
const IESIRE = process.env.IESIRE || __cale.join(process.cwd(), 'capturi');
for (const d of ['', 'avion', 'cale', 'leg_ui', 'jos']) __fs.mkdirSync(__cale.join(IESIRE, d), { recursive: true });
process.chdir(IESIRE);
const { chromium } = require('playwright');
const fs = require('fs');
const THREE_JS = fs.readFileSync(THREE_CALE);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + PAGINA + '#2d'); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelector('#c-nou').click(); adaugaPiesa('dreapta_54'); adaugaPiesa('adaptor_tata_tata'); });
  await p.click('#btn-export'); await p.waitForTimeout(2000);
  await p.$eval('#sec-printate', el => el.closest('details').open = true);
  await p.check('#s-proba_cuplaje'); await p.waitForTimeout(300);
  await p.fill('#s-print_tata', '2'); await p.dispatchEvent('#s-print_tata', 'input'); await p.waitForTimeout(300);
  await p.check('[data-cale-printata="adaptor_tata_tata"]'); await p.waitForTimeout(3000);
  console.log('setari:', await p.evaluate(() => JSON.stringify([setariCNC.print_tata, setariCNC.print_mama, setariCNC.proba_cuplaje, setariCNC.cale_printata])));
  console.log('printate:', await p.evaluate(() => JSON.stringify(rezCNC.printate.map(x => [x.titlu, x.bucati, Math.round(x.grame)]))));
  await p.$eval('#sec-printate', el => el.closest('details').scrollIntoView());
  await p.screenshot({ path: 'proba_export.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#e-dxf')]);
  await dl.saveAs('./cale/arhiva_proba.zip');
  await p.click('#e-la-3d'); await p.waitForTimeout(2500);
  console.log('3D:', (await p.textContent('#at-lista-tren')).replace(/\s+/g, ' ').slice(0, 300), '|', await p.textContent('#at-rez-lista'));
  await p.click('#at-lista-tren tr:nth-child(3) [data-op="vezi"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: 'proba_3d.png' });
  console.log('erori:', errs.length ? errs : 'niciuna');
  await b.close();
})();
