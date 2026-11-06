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
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  await p.goto('file://' + PAGINA + ''); await p.waitForTimeout(800);
  await p.screenshot({ path: 'cm_tel_2d.png' });
  await p.evaluate(() => {
    setariCNC = curataSetari({ ...setariCNC, limbi: true, doua_fete: false, stalpi_printati: true });
    document.querySelector('#c-nou').click();
    adaugaPiesa('macaz_stanga'); adaugaPiesa('dreapta_144'); adaugaPiesa('macaz_dreapta'); adaugaPiesa('ramificatie_y');
  });
  console.log('piese', await p.evaluate(() => JSON.stringify(numara())));
  await p.click('[data-mod="3d"]'); await p.waitForTimeout(1500);
  console.log('tren:', (await p.textContent('#at-lista-tren')).replace(/\s+/g, ' '));
  console.log('rez:', await p.textContent('#at-rez-lista'));
  await p.click('#at-lista-tren [data-op="vezi"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: 'cm_tel_limba.png' });
  await p.click('#btn-la-lista'); await p.waitForTimeout(800);
  await p.screenshot({ path: 'cm_tel_lista.png' });
  // la doua fete: cate doua limbi
  await p.evaluate(() => { setariCNC = curataSetari({ ...setariCNC, doua_fete: true }); });
  await p.click('[data-mod="2d"]'); await p.click('[data-mod="3d"]'); await p.waitForTimeout(1200);
  console.log('doua fete:', (await p.textContent('#at-lista-tren')).replace(/\s+/g, ' '));
  console.log('erori', errs);
  await b.close();
})();
