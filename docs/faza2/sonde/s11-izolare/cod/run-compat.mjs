// Compatibilitatea izolarii, in Edge CU FEREASTRA: pagina de proba sub fiecare set de antete (serverul pe 5187),
// emulatorul Firebase Auth pe un proiect demo-* (fara cloud, fara chei), apoi: popup simplu, signInWithPopup,
// signInWithRedirect (widgetul emulatorului, apasat de Playwright), navigare pe checkout.stripe.com si inapoi.
// Modurile ruleaza in paralel, fiecare in contextul lui. La final opreste emulatorul, browserul si serverul.
// node run-compat.mjs [--moduri=none,coep-rc,coep-cl,dip-rc,dip-cl]
import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startServer, PORT } from './serve.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MODURI = arg('moduri', 'none,coep-rc,coep-cl,dip-rc,dip-cl').split(',');
const EMU = 19987;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (u) => { try { const x = new URL(u); return x.origin + x.pathname; } catch { return String(u).slice(0, 100); } };

const emu = spawn(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--only', 'auth', '--project', 'demo-s11izolare'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let emuLog = ''; emu.stdout.on('data', (d) => (emuLog += d)); emu.stderr.on('data', (d) => (emuLog += d));
let srv = null, browser = null;
const stopEmu = () => { try { execSync(`taskkill /PID ${emu.pid} /T /F`, { stdio: 'ignore' }); } catch {} };

async function driveWidget(p, isRedirect) {
  if (!p) return { fereastra: 'nu s-a deschis nicio fereastra' };
  const r = {};
  try {
    await p.waitForLoadState('domcontentloaded', { timeout: 15000 });
    r.url = short(p.url());
    await p.click('#add-account-button', { timeout: 10000 });
    await p.click('#autogen-button', { timeout: 5000 });
    await p.click('#sign-in', { timeout: 5000 });
    r.clic = 'ok';
    if (!isRedirect) { await sleep(2500); r.dupa = p.isClosed() ? 'fereastra s-a inchis singura' : (await p.evaluate(() => document.body.innerText.slice(0, 160)).catch((e) => 'eroare: ' + e)); }
  } catch (e) { r.err = String(e).split('\n')[0].slice(0, 200); }
  return r;
}

async function runMode(mod) {
  const out = { mod, cereri_esuate: [], consola: [] };
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  ctx.on('requestfailed', (r) => out.cereri_esuate.push({ url: short(r.url()), err: r.failure() && r.failure().errorText }));
  ctx.on('console', (m) => { const t = m.text(); if (/cross-origin|coep|embedder|opener|isolation|blocked|refused/i.test(t)) out.consola.push(t.slice(0, 260)); });
  const page = await ctx.newPage();
  const base = `http://127.0.0.1:${PORT}/m/${mod}/web/compat.html?emu=${EMU}`;
  try {
    await page.goto(base);
    await page.waitForFunction(() => window.__autoDone === true, null, { timeout: 150000 });
    out.start = await page.evaluate(() => window.R);
    out.cadre = page.frames().map((f) => short(f.url()));
    // popup simplu, cu alta origine
    await page.click('#bPopup');
    await page.waitForFunction(() => window.__popupDone === true, null, { timeout: 15000 }).catch(() => {});
    out.popup_simplu = await page.evaluate(() => window.R.popup_simplu);
    for (const p of ctx.pages()) if (p !== page) await p.close().catch(() => {});
    // signInWithPopup cu widgetul emulatorului
    const popupP = ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await page.click('#bAuthPopup');
    out.auth_popup_fereastra = await driveWidget(await popupP, false);
    await page.waitForFunction(() => window.__authPopupDone === true, null, { timeout: 45000 }).catch(() => {});
    out.auth_signInWithPopup = await page.evaluate(() => window.R.auth_signInWithPopup);
    for (const p of ctx.pages()) if (p !== page) await p.close().catch(() => {});
    // signInWithRedirect: pagina pleaca la emulator si se intoarce
    await page.click('#bAuthRedirect');
    await page.waitForURL(/\/emulator\/auth\/handler/, { timeout: 20000 }).catch((e) => (out.redirect_plecare_err = String(e).split('\n')[0]));
    out.auth_redirect_widget = await driveWidget(page, true);
    await page.waitForURL(/phase=redirect/, { timeout: 20000 }).catch((e) => (out.redirect_intoarcere_err = String(e).split('\n')[0]));
    await page.waitForFunction(() => window.__redirDone === true, null, { timeout: 60000 }).catch(() => {});
    out.auth_redirect = await page.evaluate(() => ({ coi: self.crossOriginIsolated, marker: window.R.marker_sessionStorage, rezultat: window.R.auth_signInWithRedirect_getRedirectResult })).catch((e) => ({ err: String(e) }));
    // Stripe Checkout: navigare de nivel inalt si intoarcere (fara sesiune; doar navigarea conteaza)
    await page.evaluate(() => sessionStorage.setItem('s11-marker', 'stripe-' + window.R.mode));
    await page.evaluate(() => { location.href = 'https://checkout.stripe.com/'; });
    await page.waitForURL((u) => /stripe\.com/.test(String(u)), { timeout: 30000 }).catch((e) => (out.stripe_err = String(e).split('\n')[0]));
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    out.stripe_ajuns = { url: short(page.url()), titlu: await page.title().catch(() => null) };
    // intoarcerea pornita din pagina Stripe (ca redirectul success_url), apoi varianta "inapoi" din istoric
    await page.evaluate((u) => { location.href = u; }, `${base}&phase=stripe`);
    await page.waitForFunction(() => window.__stripeDone === true, null, { timeout: 30000 }).catch(() => {});
    out.stripe_intoarcere = await page.evaluate(() => ({ coi: self.crossOriginIsolated, marker: window.R.marker_sessionStorage, sab: window.R.sab_merge_la_revenire })).catch((e) => ({ err: String(e) }));
    await page.evaluate(() => { location.href = 'https://checkout.stripe.com/'; });
    await page.waitForURL((u) => /stripe\.com/.test(String(u)), { timeout: 30000 }).catch(() => {});
    await page.goBack({ waitUntil: 'load', timeout: 30000 }).catch((e) => (out.stripe_inapoi_err = String(e).split('\n')[0]));
    out.stripe_inapoi = { url: short(page.url()), ...(await page.evaluate(() => ({ coi: self.crossOriginIsolated, marker: sessionStorage.getItem('s11-marker'), sab: typeof SharedArrayBuffer !== 'undefined' })).catch((e) => ({ err: String(e) }))) };
  } catch (e) { out.eroare = String(e).split('\n')[0]; }
  await ctx.close().catch(() => {});
  return out;
}

try {
  for (let k = 0; k < 90; k++) { try { const r = await fetch(`http://127.0.0.1:${EMU}/`); if (r.ok) break; } catch {} await sleep(1000); }
  console.log('emulator Auth gata pe', EMU);
  srv = await startServer(PORT);
  browser = await chromium.launch({ channel: 'msedge', headless: false });
  console.log('browser', browser.version());
  const res = await Promise.all(MODURI.map(runMode));
  const rez = { data: new Date().toISOString(), browser: browser.version(), moduri: res };
  await writeFile(new URL('./rezultate/compat.json', import.meta.url), JSON.stringify(rez, null, 1));
  // rezumat: OK / motivul, pe fiecare test si mod
  const tests = ['fb_sdk_pachet_aceeasi_origine', 'fb_sdk_cdn_gstatic', 'auth_email_parola_emulator', 'gapi_script_auth', 'recaptcha_enterprise_script', 'fonturi_google_fara_crossorigin', 'fonturi_google_crossorigin', 'stripe_js_script', 'stripe_js_script_crossorigin', 'iframe_alta_origine_fara_antete', 'iframe_alta_origine_cu_CORP_COEP', 'iframe_aceeasi_origine_fara_antete'];
  for (const m of res) {
    console.log(`\n=== ${m.mod}: crossOriginIsolated=${m.start && m.start.crossOriginIsolated} SAB=${m.start && m.start.sab}${m.eroare ? ' EROARE ' + m.eroare : ''}`);
    for (const t of tests) { const v = m.start && m.start[t]; console.log(`  ${t}: ${v ? (v.ok ? 'OK ' + JSON.stringify(v) : 'ESEC ' + v.err) : '-'}`); }
    console.log('  popup_simplu:', JSON.stringify(m.popup_simplu));
    console.log('  auth_signInWithPopup:', JSON.stringify(m.auth_signInWithPopup), '| fereastra:', JSON.stringify(m.auth_popup_fereastra));
    console.log('  auth_signInWithRedirect:', JSON.stringify(m.auth_redirect), m.redirect_plecare_err || '', m.redirect_intoarcere_err || '');
    console.log('  stripe:', JSON.stringify(m.stripe_ajuns), '| intoarcere:', JSON.stringify(m.stripe_intoarcere), '| inapoi:', JSON.stringify(m.stripe_inapoi));
    console.log('  cereri esuate:', JSON.stringify(m.cereri_esuate.slice(0, 12)));
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) srv.close();
  stopEmu();
}
