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
  for (const [nume, opt] of [['pc', { viewport: { width: 1360, height: 900 } }], ['tel', devices['iPhone 13']], ['pc_dark', { viewport: { width: 1360, height: 900 }, colorScheme: 'dark' }]]) {
    const ctx = await b.newContext({ ...opt, acceptDownloads: true });
    const p = await ctx.newPage();
    await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
    const errs = [];
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|ERR_FAILED/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
    await p.goto('file://' + PAGINA + '');
    await p.waitForTimeout(800);
    console.log(nume, 'mod initial:', await p.evaluate(() => document.querySelector('.app').className), 'THREE incarcat:', await p.evaluate(() => !!window.THREE));
    await p.screenshot({ path: `comb_${nume}_2d.png` });
    // pun limba mobila, un tunel, un peron in setari, ca circuitul sa aiba piese de printat
    await p.evaluate(() => { setariCNC = curataSetari({ ...setariCNC, limbi: true, tunel: 1, peron: 1, opritor_printat: true }); });
    await p.click('[data-mod="3d"]');
    await p.waitForTimeout(1500);
    console.log(' 3D:', await p.evaluate(() => document.querySelector('.app').className), 'hash', await p.evaluate(() => location.hash), 'THREE', await p.evaluate(() => !!window.THREE));
    console.log(' chip:', await p.textContent('#chip-3d'), '| nume piesa:', await p.textContent('#at-nume-piesa'), '| cote:', await p.textContent('#at-cote'));
    console.log(' rez lista:', await p.textContent('#at-rez-lista'));
    console.log(' tren:', (await p.textContent('#at-lista-tren')).replace(/\s+/g, ' ').slice(0, 400));
    await p.screenshot({ path: `comb_${nume}_3d.png`, fullPage: false });
    if (nume === 'pc') {
      await p.click('#at-adauga'); await p.waitForTimeout(400);
      await p.click('#at-tipuri [data-tip="legaturi"]'); await p.waitForTimeout(300); await p.click('[data-leg="grinda"]'); await p.waitForTimeout(300);
      await p.click('#at-adauga'); await p.waitForTimeout(500);
      console.log(' dupa adaugare:', await p.textContent('#at-rez-lista'), '| chip', await p.textContent('#chip-3d'));
      await p.click('#at-lista-tren [data-op="vezi"]'); await p.waitForTimeout(500);
      console.log(' vezi:', await p.textContent('#at-nume-piesa'), '|', await p.textContent('#at-cote'), '| adauga ascuns', await p.evaluate(() => document.querySelector('#at-adauga').hidden));
      await p.screenshot({ path: 'comb_pc_vezi.png' });
      await p.$eval('#at-sectiune-lista', el => el.scrollIntoView());
      await p.screenshot({ path: 'comb_pc_lista.png' });
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#at-zip')]);
      await dl.saveAs('./comb_test.zip');
      // debifez piesele circuitului
      await p.click('#at-cu-tren'); await p.waitForTimeout(400);
      console.log(' fara tren:', await p.textContent('#at-rez-lista'));
      await p.click('#at-cu-tren'); await p.waitForTimeout(400);
      // la setari in 2D
      await p.click('#at-la-setari'); await p.waitForTimeout(800);
      console.log(' la setari:', await p.evaluate(() => [document.querySelector('.app').className, document.querySelector('#foaie-export').hidden, document.querySelector('#sec-printate').closest('details').open]));
      await p.screenshot({ path: 'comb_pc_setari.png' });
      // din export, inapoi in 3D
      await p.click('#e-la-3d'); await p.waitForTimeout(800);
      console.log(' inapoi 3D:', await p.evaluate(() => [document.querySelector('.app').className, document.querySelector('#foaie-export').hidden]));
      // tasta Backspace in 3D nu sterge piese din 2D
      const nInainte = await p.evaluate(() => stare.piese.length);
      await p.evaluate(() => { selPiesa = stare.piese[0].uid; });
      await p.keyboard.press('Backspace');
      console.log(' backspace in 3D, piese:', nInainte, '->', await p.evaluate(() => stare.piese.length));
      await p.click('[data-mod="2d"]'); await p.waitForTimeout(500);
      await p.screenshot({ path: 'comb_pc_2d_inapoi.png' });
      // reincarc: tine minte 3D
      await p.click('[data-mod="3d"]'); await p.waitForTimeout(300);
      await p.reload(); await p.waitForTimeout(1500);
      console.log(' dupa reincarcare:', await p.evaluate(() => document.querySelector('.app').className), '| lista:', await p.textContent('#at-rez-lista'));
    }
    console.log(' erori:', errs.length ? errs : 'niciuna');
    await ctx.close();
  }
  await b.close();
})();
