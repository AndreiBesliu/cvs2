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
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|ERR_FAILED/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await p.goto('file://' + PAGINA + '#3d'); await p.waitForTimeout(1500);
  const clic = async (sel, t = 350) => { await p.click(sel); await p.waitForTimeout(t); };
  const muta = async (op, n = 1) => { for (let i = 0; i < n; i++) await clic(`#at-m-mutari [data-m="${op}"]`, 120); };
  // fuselajul: caramida 2x8, de doua ori una peste alta
  await clic('#at-tipuri [data-tip="caramida"]');
  await clic('[data-sablon="2x8"]', 500);
  await clic('#at-in-model', 700);
  console.log('dupa prima piesa:', await p.textContent('#at-cote'), '|', await p.textContent('#at-vedere-mod [data-v="model"]'));
  // aripile: pana 12x6, pusa peste fuselaj, mutata in lateral
  await clic('#at-tipuri [data-tip="pana"]');
  await clic('[data-pana="12,6,1,2,stanga"]', 600);
  await clic('#at-vedere-mod [data-v="model"]', 500);
  await clic('#at-m-lista [data-mid]', 300);          // aleg fuselajul
  await clic('#at-vedere-mod [data-v="piesa"]', 500);
  await clic('#at-in-model', 900);
  await muta('y+', 2); await muta('x-', 0);
  console.log('aripa stanga:', (await p.textContent('.model-ales')).replace(/\s+/g, ' ').slice(0, 120));
  await clic('#at-m-dubla', 600);
  // a doua aripa: o fac dreapta in editor si o inlocuiesc
  await clic('#at-m-editeaza', 900);
  await clic('[data-parte="dreapta"]', 700);
  console.log('buton:', await p.textContent('#at-in-model'));
  await clic('#at-in-model', 900);
  await muta('y-', 8); await muta('x-', 1);
  // nasul: con 2x2 culcat? pus in fata, la nivelul fuselajului
  await clic('#at-tipuri [data-tip="rotund"]');
  await clic('[data-rot="2,6,con,5.4,unul"]', 600);
  await clic('#at-vedere-mod [data-v="model"]', 400);
  await clic('#at-m-lista li:first-child [data-mid]', 300);
  await clic('#at-vedere-mod [data-v="piesa"]', 400);
  await clic('#at-in-model', 900);
  await muta('z-', 3); await muta('x+', 8);
  await clic('#at-m-culori [data-mc="#2b2b2b"]', 400);
  await clic('#at-m-mutari [data-m="r"]', 400);
  console.log('lista model:', await p.$$eval('#at-m-lista button', bs => bs.map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  console.log('cote:', await p.textContent('#at-cote'));
  await p.screenshot({ path: 'model_1.png' });
  // clic in vedere: aleg piesa de sub cursor (mijlocul vederii)
  const r = await p.$eval('#at-vedere canvas', c => { const b = c.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  await p.mouse.click(r[0], r[1]); await p.waitForTimeout(500);
  console.log('dupa clic in vedere, aleasa:', await p.evaluate(() => { const b = document.querySelector('#at-m-lista [aria-pressed="true"]'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : 'niciuna'; }));
  // tastele
  await p.focus('#at-vedere'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('PageUp'); await p.waitForTimeout(400);
  console.log('dupa taste:', await p.evaluate(() => { const b = document.querySelector('#at-m-lista [aria-pressed="true"]'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : 'niciuna'; }));
  // modelul in lista de printat
  await clic('#at-model-lista', 1200);
  console.log('lista de printat:', await p.textContent('#at-rez-lista'));
  // reincarcare
  await p.reload(); await p.waitForTimeout(2000);
  await clic('#at-vedere-mod [data-v="model"]', 800);
  console.log('dupa reincarcare:', await p.textContent('#at-vedere-mod [data-v="model"]'), '|', await p.textContent('#at-cote'));
  await p.screenshot({ path: 'model_2.png' });
  // golire
  await clic('#at-model-goleste'); await clic('#at-model-goleste-da', 600);
  console.log('golit:', await p.textContent('#at-cote'), '| editor:', (await p.textContent('#at-editor')).slice(0, 80));
  console.log('erori:', errs.length ? errs : 'niciuna');
  await b.close();
})();
