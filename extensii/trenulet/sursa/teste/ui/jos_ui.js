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
const D = './jos/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + PAGINA + '#2d'); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelector('#c-nou').click(); adaugaPiesa('curba_mare_stanga'); adaugaPiesa('macaz_stanga'); adaugaPiesa('dreapta_144'); adaugaPiesa('dreapta_216'); });
  await p.click('#btn-export'); await p.waitForTimeout(2500);
  const sus = await p.$eval('#cnc-placi svg', s => s.outerHTML.length);
  await p.$eval('#cnc-placi', el => el.scrollIntoView()); await p.screenshot({ path: D + 'placa_sus.png' });
  await p.click('#cnc-fata [data-f="jos"]'); await p.waitForTimeout(400);
  console.log('o fata, de jos:', await p.$eval('#cnc-placi figcaption', x => x.textContent.slice(0, 120)), '| svg', sus, '->', await p.$eval('#cnc-placi svg', s => s.outerHTML.length));
  await p.screenshot({ path: D + 'placa_jos_1fata.png' });
  // doua fete
  await p.evaluate(() => { const c = document.querySelector('#s-doua_fete'); if (c) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); } });
  await p.waitForTimeout(2500);
  console.log('doua fete:', await p.evaluate(() => rezCNC && rezCNC.setari.doua_fete), '|', await p.$eval('#cnc-placi figcaption', x => x.textContent.slice(0, 120)));
  await p.screenshot({ path: D + 'placa_jos_2fete.png' });
  await p.reload(); await p.waitForTimeout(800); await p.click('#btn-export'); await p.waitForTimeout(2500);
  console.log('dupa reincarcare:', await p.$eval('#cnc-fata [aria-pressed="true"]', x => x.textContent));
  await p.click('#cnc-fata [data-f="sus"]'); await p.evaluate(() => { const c = document.querySelector('#s-doua_fete'); if (c && c.checked) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); } }); await p.keyboard.press('Escape');
  // 3D de dedesubt
  await p.click('[data-mod="3d"]'); await p.waitForTimeout(2500);
  await p.click('#at-tipuri [data-tip="caramida"]'); await p.click('[data-sablon="2x4"]'); await p.waitForTimeout(500);
  await p.click('#at-unghi [data-u="jos"]'); await p.waitForTimeout(400);
  console.log('3D jos:', await p.$$eval('#at-unghi [aria-pressed="true"]', x => x.map(e => e.textContent)), 'fi<0', await p.evaluate(() => 1));
  await p.screenshot({ path: D + 'caramida_jos.png' });
  // tragere in jos (rotire continua sub masa)
  await p.click('#at-unghi [data-u="sus"]'); await p.waitForTimeout(200);
  const r = await (await p.$('#at-vedere')).boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down();
  for (let k = 1; k <= 20; k++) await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - k * 10);
  await p.mouse.up(); await p.waitForTimeout(300);
  console.log('dupa tragere:', await p.$$eval('#at-unghi [aria-pressed="true"]', x => x.map(e => e.textContent)));
  await p.screenshot({ path: D + 'caramida_tras.png' });
  await p.click('#at-tipuri [data-tip="legaturi"]'); await p.click('[data-leg="placaTechnic"]'); await p.waitForTimeout(500);
  await p.click('#at-unghi [data-u="jos"]'); await p.waitForTimeout(300); await p.screenshot({ path: D + 'placa_technic_jos.png' });
  // modelul de dedesubt
  await p.click('#at-in-model'); await p.waitForTimeout(600); await p.click('#at-unghi [data-u="jos"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'model_jos.png' });
  console.log('erori', errs);
  await b.close();
})();
