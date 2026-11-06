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
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|ERR_FAILED/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await p.goto('file://' + PAGINA + '#3d'); await p.waitForTimeout(1500);
  const info = async () => [await p.textContent('#at-nume-piesa'), (await p.textContent('#at-cote')).replace(/\s+/g, ' '), await p.evaluate(() => { const a = document.querySelector('#at-avert'); return a.hidden ? '' : a.textContent; })].join(' | ');
  // pana
  await p.click('#at-tipuri [data-tip="pana"]'); await p.waitForTimeout(500);
  console.log('pana implicit:', await info(), '|', await p.textContent('#at-pana-info'));
  await p.screenshot({ path: 'av_pana.png' });
  for (const s of ['12,6,1,2,stanga', '4,4,2,2,stanga', '6,4,1,2,ambele']) {
    await p.click(`[data-pana="${s}"]`); await p.waitForTimeout(700);
    console.log(' sablon', s, ':', await info(), '|', await p.textContent('#at-pana-info'));
    await p.screenshot({ path: `av_pana_${s.replace(/,/g, '_')}.png` });
  }
  await p.click('[data-pana="12,6,1,2,stanga"]'); await p.waitForTimeout(600);
  await p.click('#at-pereche'); await p.waitForTimeout(800);
  await p.click('[data-parte="dreapta"]'); await p.waitForTimeout(600);
  console.log(' dreapta:', await info());
  await p.fill('#at-n-varf', '1.5'); await p.dispatchEvent('#at-n-varf', 'change'); await p.waitForTimeout(600);
  console.log(' varf 1,5:', await info());
  // panta curba si inversa
  await p.click('#at-tipuri [data-tip="panta"]'); await p.waitForTimeout(400);
  await p.click('[data-profil="curb"]'); await p.waitForTimeout(500);
  console.log('panta curba:', await info(), '|', await p.textContent('#at-p-unghi'));
  await p.screenshot({ path: 'av_curba.png' });
  await p.fill('#at-p-sus', '0'); await p.dispatchEvent('#at-p-sus', 'change'); await p.waitForTimeout(500);
  console.log(' fara stifturi:', await info());
  await p.click('#at-adauga'); await p.waitForTimeout(400);
  await p.click('#at-tipuri [data-tip="pantaInversa"]'); await p.waitForTimeout(500);
  console.log('inversa:', await info(), '|', await p.textContent('#at-p-unghi'));
  await p.screenshot({ path: 'av_inversa.png' });
  await p.click('#at-adauga'); await p.waitForTimeout(400);
  // rotund
  await p.click('#at-tipuri [data-tip="rotund"]'); await p.waitForTimeout(500);
  console.log('rotund:', await info());
  for (const s of ['1,3,con,1.2,niciunul', '2,6,con,5.4,unul', '2,1,cilindru,5.4,toate']) {
    await p.click(`[data-rot="${s}"]`); await p.waitForTimeout(600);
    console.log(' sablon', s, ':', await info());
    await p.screenshot({ path: `av_rot_${s.replace(/[,.]/g, '_')}.png` });
    await p.click('#at-adauga'); await p.waitForTimeout(400);
  }
  await p.click('[data-st="unul"]'); await p.waitForTimeout(400);
  console.log(' 2x2 un stift:', await info());
  await p.$eval('#at-sectiune-lista', el => el.scrollIntoView());
  console.log('lista:', await p.textContent('#at-rez-lista'));
  console.log('randuri:', await p.$$eval('#at-lista tr', t => t.map(r => r.cells[0].textContent + ' x' + (r.querySelector('.pas .num') || {}).textContent)));
  await p.screenshot({ path: 'av_lista.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#at-zip')]);
  await dl.saveAs('./avion/avion.zip');
  // reincarcare: tipul si campurile raman
  await p.click('#at-tipuri [data-tip="pana"]'); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(1800);
  console.log('dupa reincarcare:', await info());
  console.log('erori:', errs.length ? errs : 'niciuna');
  await b.close();
})();
