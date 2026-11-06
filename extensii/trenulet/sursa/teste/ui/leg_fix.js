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
  const errs = [];
  for (const [nume, opt] of [['pc', { viewport: { width: 1360, height: 900 } }], ['tel', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const p = await (await b.newContext(opt)).newPage();
    await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
    p.on('pageerror', e => errs.push(nume + ': ' + e.message));
    await p.goto('file://' + PAGINA + '#3d'); await p.waitForTimeout(1500);
    const centru = async sel => { const r = await (await p.$(sel)).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
    const trage = async (a, z) => { await p.mouse.move(...a); await p.mouse.down(); for (let k = 1; k <= 12; k++) await p.mouse.move(a[0] + (z[0] - a[0]) * k / 12, a[1] + (z[1] - a[1]) * k / 12); await p.mouse.up(); await p.waitForTimeout(300); };
    // caramida: trag pe un rand intreg
    await p.click('#at-tipuri [data-tip="caramida"]'); await p.click('[data-sablon="1x1"]'); await p.waitForTimeout(300);
    if (nume === 'pc') {
      await p.$eval('#at-grila', el => el.scrollIntoView({ block: 'center' }));
      await trage(await centru('#at-grila rect[data-i="1"][data-j="0"]'), await centru('#at-grila rect[data-i="7"][data-j="0"]'));
      console.log(nume, 'caramida dupa tragere:', await p.textContent('#at-nume-piesa'));
    }
    // 1x4 + caramida: randul lateral apare fara alt clic; 2x4 il scoate
    await p.click('#at-inaltime [data-placi="3"]'); await p.click('[data-sablon="1x4"]'); await p.waitForTimeout(300);
    console.log(nume, '1x4: laterale', await p.$$eval('#at-laterale button', x => x.length));
    await p.click('[data-sablon="2x4"]'); await p.waitForTimeout(300);
    console.log(nume, '2x4: laterale', await p.$$eval('#at-laterale button', x => x.length));
    await p.click('#at-mod-grila [data-mod="gauri"]'); await p.click('[data-sablon="1x4"]'); await p.waitForTimeout(300);
    console.log(nume, 'gauri 1x4 nota:', (await p.textContent('#at-car-nota')).length > 0, '| 2x4:', await (async () => { await p.click('[data-sablon="2x4"]'); await p.waitForTimeout(300); return (await p.textContent('#at-car-nota')).length > 0; })(), 'puncte', await p.$$eval('#at-grila [data-a]', x => x.length));
    // mijloc + gaura sub stift: punctul din mijloc nu mai poate avea gaura in definitie
    await p.click('[data-sablon="2x2"]'); await p.click('#at-stifturi [data-st="mijloc"]'); await p.waitForTimeout(300);
    await p.waitForTimeout(400);
    console.log(nume, 'mijloc + gaura:', await p.textContent('#at-nume-piesa'), 'puncte', await p.$$eval('#at-grila [data-a]', x => x.length));
    await p.click('#at-mod-grila [data-mod="forma"]'); await p.click('#at-stifturi [data-st="da"]');
    // grinda: trag cu „Rotunda” pe un rand
    await p.click('#at-tipuri [data-tip="legaturi"]'); await p.click('[data-leg="grinda"]'); await p.click('[data-gr="3"]'); await p.waitForTimeout(300);
    if (nume === 'pc') {
      await p.$eval('#at-gr-grila', el => el.scrollIntoView({ block: 'center' }));
      await trage(await centru('#at-gr-grila rect[data-i="0"][data-j="2"]'), await centru('#at-gr-grila rect[data-i="6"][data-j="2"]'));
      console.log(nume, 'grinda dupa tragere:', await p.textContent('#at-nume-piesa'));
    }
    // placa cu gauri: goale nu ramane
    await p.click('[data-leg="placaTechnic"]'); await p.waitForTimeout(400);
    console.log(nume, 'placa technic:', await p.textContent('#at-nume-piesa'));
  }
  console.log('erori', errs);
  await b.close();
})();
