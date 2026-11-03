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
const D = './leg_ui/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|ERR_FAILED/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
  await p.goto('file://' + PAGINA + '#3d'); await p.waitForTimeout(1500);
  if (await p.isVisible('#mod-3d') === false) { await p.click('[data-mod="3d"]').catch(() => {}); await p.waitForTimeout(800); }
  const info = async () => [await p.textContent('#at-nume-piesa'), (await p.textContent('#at-cote')).replace(/\s+/g, ' '), await p.evaluate(() => { const a = document.querySelector('#at-avert'); return a.hidden ? '' : a.textContent; })].join(' | ');
  const pas = async (t, f) => { await p.waitForTimeout(450); console.log(t.padEnd(26), await info()); if (f) await p.screenshot({ path: D + f + '.png' }); };
  await p.click('#at-tipuri [data-tip="legaturi"]'); await pas('legaturi (grinda)', 'grinda');
  console.log(' galerie:', await p.$$eval('#at-leg button', x => x.map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(', ')));
  console.log(' tab apasat:', await p.$$eval('#at-tipuri [aria-pressed="true"]', x => x.map(b => b.textContent)));
  for (const s of ['L35', 'cruce', 'H', 'rama57']) { await p.click(`[data-gr="${s}"]`); await pas(' sablon ' + s, 'grinda_' + s); }
  // desen: uneltele
  await p.click('[data-gr="5"]'); await p.waitForTimeout(300);
  await p.click('[data-u="x"]'); await p.click('#at-gr-grila rect[data-i="2"][data-j="0"]');
  await p.click('[data-u="r"]'); await p.click('#at-gr-grila rect[data-i="2"][data-j="1"]'); await p.click('#at-gr-grila rect[data-i="2"][data-j="2"]');
  await p.click('[data-u="sterge"]'); await p.click('#at-gr-grila rect[data-i="4"][data-j="0"]');
  await p.click('#at-grosime [data-g="0"]'); await pas(' T desenat, subtire', 'grinda_desen');
  await p.click('#at-adauga');
  // caramida Technic
  await p.click('[data-leg="caramidaTechnic"]'); await pas('caramida technic');
  await p.fill('#at-t-lung', '6'); await p.dispatchEvent('#at-t-lung', 'change'); await p.waitForTimeout(300);
  await p.click('#at-t-gauri [data-k="1"]'); await p.click('#at-t-gauri [data-k="3"]'); await p.click('#at-t-gauri [data-k="3"]');
  await p.check('#at-t-goale'); await pas(' 1x6 r x r p r, goale', 'technic_1x6'); await p.click('#at-adauga');
  // stift, bucsa
  await p.click('[data-leg="stiftTechnic"]'); await p.click('#at-s-lung [data-v="3"]'); await p.click('#at-s-capat [data-v="ax"]'); await pas('stift 3 cu ax', 'stift'); await p.click('#at-adauga');
  await p.click('[data-leg="bucsa"]'); await pas('bucsa'); await p.click('#at-b-lung [data-v="2"]'); await p.click('#at-b-gaura [data-v="xr"]'); await pas(' conector 2 ax+stift', 'bucsa'); await p.click('#at-adauga');
  await p.click('#at-b-lung [data-v="0.5"]'); await pas(' bucsa 1/2 (xr -> x)');
  // suport
  await p.click('[data-leg="suport"]'); await pas('suport', 'suport');
  await p.fill('#at-su-inalt', '2'); await p.dispatchEvent('#at-su-inalt', 'change'); await p.check('#at-su-invers'); await pas(' 1x2 - 2x2 intors', 'suport_intors'); await p.click('#at-adauga');
  // clema, maner, balama
  await p.click('[data-leg="clema"]'); await pas('clema', 'clema');
  await p.click('#at-cm-axa [data-v="orizontala"]'); await pas(' culcata', 'clema_o');
  await p.click('#at-balama');
  await p.click('[data-leg="maner"]'); await pas('maner', 'maner'); await p.click('#at-cm-axa [data-v="orizontala"]'); await pas(' culcat', 'maner_o');
  await p.click('[data-leg="bara"]'); await pas('bara'); await p.click('#at-adauga');
  await p.click('[data-leg="bila"]'); await p.click('#at-bc-baza [data-v="2"]'); await pas('bila 2x2', 'bila'); await p.click('#at-articulatie');
  await p.click('[data-leg="cupa"]'); await pas('cupa', 'cupa');
  // placa cu gauri -> editorul de caramizi
  await p.click('[data-leg="placaTechnic"]'); await pas('placa technic', 'placa_technic');
  console.log(' tab apasat:', await p.$$eval('#at-tipuri [aria-pressed="true"]', x => x.map(b => b.textContent)), 'puncte', await p.$$eval('#at-grila [data-a]', x => x.length));
  await p.click('#at-grila [data-a="2"][data-b="1"]'); await pas(' gaura 2 -> ax');
  await p.click('#at-grila [data-a="3"][data-b="1"]'); await p.click('#at-grila [data-a="3"][data-b="1"]'); await pas(' gaura 3 -> fara', 'placa_technic_2');
  await p.check('#at-goale'); await pas(' + stifturi goale'); await p.click('#at-adauga');
  await p.click('#at-gauri-toate [data-toate="x"]'); await pas(' toate de ax');
  // caramida 1x4 cu gauri laterale
  await p.click('#at-mod-grila [data-mod="forma"]'); await p.click('[data-sablon="1x4"]'); await p.click('#at-inaltime [data-placi="3"]'); await p.waitForTimeout(300);
  console.log(' laterale:', await p.$$eval('#at-laterale button', x => x.length));
  await p.click('#at-laterale [data-lk="0"]'); await p.click('#at-laterale [data-lk="2"]'); await p.click('#at-laterale [data-lk="2"]'); await pas(' 1x4 cu gauri laterale', 'laterale');
  await p.click('#at-adauga');
  // pana cu gauri
  await p.click('#at-tipuri [data-tip="pana"]'); await p.click('[data-pana="12,6,1,2,stanga"]'); await p.waitForTimeout(500);
  console.log('pana 12x6 puncte:', await p.$$eval('#at-pana-plan [data-a]', x => x.length));
  await p.click('#at-pana-plan [data-a="2"][data-b="2"]'); await p.click('#at-pana-plan [data-a="4"][data-b="2"]'); await p.click('#at-pana-plan [data-a="4"][data-b="2"]');
  await pas(' 2 gauri', 'pana_gauri'); console.log(' ', await p.textContent('#at-pana-info'));
  await p.click('#at-pereche');
  // rotund cu gaura
  await p.click('#at-tipuri [data-tip="rotund"]'); await p.click('[data-rot="1,3,con,5.4,toate"]'); await p.click('#at-rot-gaura [data-g="bara"]'); await pas('con 1x1 cu bara', 'con_bara'); await p.click('#at-adauga');
  await p.click('#at-rot-diam [data-diam="2"]'); await p.click('#at-rot-gaura [data-g="ax"]'); await pas(' 2x2 cu ax', 'rot2_ax'); await p.click('#at-adauga');
  // in model: clema si bila
  await p.click('#at-tipuri [data-tip="legaturi"]'); await p.waitForTimeout(300);
  console.log('legaturi revine la:', await p.$eval('#at-leg [aria-pressed="true"]', x => x.textContent));
  await p.click('[data-leg="clema"]'); await p.waitForTimeout(300); await p.click('#at-in-model'); await p.waitForTimeout(600);
  await p.click('[data-v="piesa"]'); await p.waitForTimeout(300); await p.click('#at-tipuri [data-tip="legaturi"]'); await p.click('[data-leg="suport"]'); await p.waitForTimeout(300); await p.click('#at-in-model'); await p.waitForTimeout(700);
  console.log('model:', (await p.textContent('#at-cote')).replace(/\s+/g, ' ')); await p.screenshot({ path: D + 'model.png' });
  // lista
  await p.$eval('#at-sectiune-lista', el => el.scrollIntoView()).catch(() => {});
  console.log('lista:', await p.textContent('#at-rez-lista'));
  console.log('randuri:', await p.$$eval('#at-lista tr', t => t.map(r => r.cells[0].textContent + ' x' + (r.querySelector('.pas .num') || {}).textContent)));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#at-zip')]);
  await dl.saveAs(D + 'leg.zip');
  await p.click('[data-v="piesa"]'); await p.click('#at-tipuri [data-tip="legaturi"]'); await p.click('[data-leg="maner"]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(2000);
  console.log('dupa reincarcare:', await info(), '| tab', await p.$$eval('#at-tipuri [aria-pressed="true"]', x => x.map(b => b.textContent)), '| galerie', await p.$eval('#at-leg [aria-pressed="true"]', x => x.textContent).catch(() => 'LIPSA'));
  // telefon
  const t = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const q = await t.newPage(); await q.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  q.on('pageerror', e => errs.push('TEL: ' + e.message));
  await q.goto('file://' + PAGINA + '#3d'); await q.waitForTimeout(1500);
  await q.tap('#at-tipuri [data-tip="legaturi"]'); await q.waitForTimeout(600);
  await q.tap('[data-leg="grinda"]'); await q.waitForTimeout(500);
  console.log('telefon: latime', await q.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await q.screenshot({ path: D + 'tel_grinda.png', fullPage: false });
  await q.tap('[data-leg="placaTechnic"]'); await q.waitForTimeout(600);
  await q.tap('#at-grila [data-a="2"][data-b="1"]'); await q.waitForTimeout(500);
  console.log('telefon placa:', await q.textContent('#at-nume-piesa'), await q.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await q.$eval('#at-grila', el => el.scrollIntoView()); await q.screenshot({ path: D + 'tel_placa.png' });
  console.log('erori:', errs.length ? errs : 'niciuna');
  await b.close();
})();
