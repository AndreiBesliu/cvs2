// Scenariu de interfata (Playwright, Chromium cu swiftshader). PAGINA = documentul construit (iesire/preview.html),
// THREE = three.min.js r128 (previzualizarea 3D); capturile si descarcarile merg in IESIRE (implicit ./capturi).
const __cale = require('path'), __fs = require('fs');
const PAGINA = process.env.PAGINA || __cale.join(__dirname, '..', '..', 'iesire', 'preview.html');
const THREE_CALE = process.env.THREE || require.resolve('three/build/three.min.js');
const IESIRE = process.env.IESIRE || __cale.join(process.cwd(), 'capturi');
for (const d of ['', 'avion', 'cale', 'leg_ui', 'jos']) __fs.mkdirSync(__cale.join(IESIRE, d), { recursive: true });
process.chdir(IESIRE);
const { chromium, devices } = require('playwright');
const fs = require('fs');
const THREE_JS = fs.readFileSync(THREE_CALE);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + PAGINA + '#3d'); await p.waitForTimeout(1500);
  await p.click('#at-tipuri [data-tip="lateral"]'); await p.waitForTimeout(500);
  await p.click('[data-fete="doua"]'); await p.waitForTimeout(500);
  console.log('lateral:', await p.textContent('#at-nume-piesa'), '|', await p.textContent('#at-cote'));
  await p.click('#at-in-model'); await p.waitForTimeout(700);
  await p.click('#at-tipuri [data-tip="caramida"]'); await p.waitForTimeout(400);
  await p.click('[data-sablon="1x2"]'); await p.waitForTimeout(300);
  await p.click('#at-stifturi [data-st="mijloc"]'); await p.waitForTimeout(500);
  console.log('jumper:', await p.textContent('#at-nume-piesa'));
  await p.click('#at-in-model'); await p.waitForTimeout(700);
  await p.screenshot({ path: 'model_tel_1.png' });
  await p.$eval('#at-editor', el => el.scrollIntoView());
  await p.screenshot({ path: 'model_tel_2.png' });
  console.log('latime', await p.evaluate(() => document.querySelector('#mod-3d').scrollWidth), 'erori', errs);
  await b.close();
})();
