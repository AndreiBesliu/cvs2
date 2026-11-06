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
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })).newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + PAGINA + '#3d'); await p.waitForTimeout(1800);
  const info = async () => [await p.textContent('#at-nume-piesa'), (await p.textContent('#at-cote')).replace(/\s+/g, ' '), await p.evaluate(() => { const a = document.querySelector('#at-avert'); return a.hidden ? '' : a.textContent; })].join(' | ');
  await p.click('#at-tipuri [data-tip="legaturi"]'); await p.click('[data-leg="grinda"]'); await p.waitForTimeout(300);
  await p.click('#at-gr-fel [data-v="indoita"]'); await p.waitForTimeout(500);
  console.log('indoita:', await info(), '| gauri', await p.$$eval('#at-gi-gauri button', x => x.length));
  await p.screenshot({ path: 'ind_6_4.png' });
  await p.click('#at-gi-gauri [data-k="0"]'); await p.click('#at-gi-gauri [data-k="8"]'); await p.waitForTimeout(400);
  console.log(' capete de ax:', await info());
  await p.click('#at-adauga');
  await p.click('[data-gi="4"]'); await p.waitForTimeout(500); console.log(' dubla:', await info()); await p.screenshot({ path: 'ind_dubla.png' });
  await p.check('#at-gi-trei').catch(() => {}); await p.uncheck('#at-gi-trei'); await p.waitForTimeout(400); console.log(' fara al treilea brat:', await info());
  await p.fill('#at-gi-u0', '-90'); await p.dispatchEvent('#at-gi-u0', 'change'); await p.waitForTimeout(500); console.log(' -90:', await info());
  await p.fill('#at-gi-b1', '9'); await p.dispatchEvent('#at-gi-b1', 'change'); await p.fill('#at-gi-u0', '150'); await p.dispatchEvent('#at-gi-u0', 'change'); await p.waitForTimeout(400);
  console.log(' unghi 150 refuzat:', await p.inputValue('#at-gi-u0'));
  await p.click('#at-in-model'); await p.waitForTimeout(700); console.log('model:', (await p.textContent('#at-cote')).replace(/\s+/g, ' '));
  await p.click('#at-m-editeaza'); await p.waitForTimeout(600); console.log('din model in editor:', await info(), await p.$eval('#at-gr-fel [aria-pressed="true"]', x => x.textContent));
  await p.click('#at-gr-fel [data-v="grila"]'); await p.waitForTimeout(400); console.log('inapoi pe grila:', await info());
  // calibrarea
  await p.click('#at-tipuri [data-tip="calibrare"]'); await p.waitForTimeout(1500);
  console.log('calibrare:', await info(), '| campuri', await p.$$eval('#at-calib-campuri input', x => x.map(i => i.dataset.setare).join(',')));
  await p.click('#at-adauga'); await p.waitForTimeout(800);
  console.log('lista:', await p.textContent('#at-rez-lista'));
  await p.reload(); await p.waitForTimeout(2500); console.log('reincarcat:', await info());
  console.log('erori', errs);
  await b.close();
})();
