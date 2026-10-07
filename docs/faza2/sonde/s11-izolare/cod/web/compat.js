// compat.js - sonda s11 (aruncabila): ce merge sub fiecare set de antete de izolare.
// Faza "start": teste automate (SDK Firebase, Auth cu e-mail pe emulator, scripturile terte, fonturi, iframe-uri).
// Butoanele (apasate de Playwright, cu gest de utilizator): popup simplu, signInWithPopup, signInWithRedirect.
// Faza "redirect" (intoarcerea de la emulator) si faza "stripe" (intoarcerea de pe checkout.stripe.com) inregistreaza starea la revenire.
const P = new URLSearchParams(location.search);
const mode = location.pathname.split('/')[2] || '?';
const EMU = P.get('emu') || '19987';
const phase = P.get('phase') || 'start';
const R = (window.R = { mode, phase, url: location.href, crossOriginIsolated: self.crossOriginIsolated, sab: typeof SharedArrayBuffer !== 'undefined', ua: navigator.userAgent });
const logEl = document.getElementById('log');
const log = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); console.log(s); logEl.textContent += '\n' + s; };
const post = (name, obj) => fetch('/rezultat?nume=' + name, { method: 'POST', body: JSON.stringify(obj, null, 1) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + ' ms')), ms))]);
async function test(name, fn, ms = 15000) {
  const t0 = performance.now();
  try { R[name] = { ok: true, ...((await withTimeout(fn(), ms)) || {}) }; } catch (e) { R[name] = { ok: false, err: String((e && (e.code || e.message)) || e) }; }
  R[name].ms = Math.round(performance.now() - t0); log(name, R[name]);
}
const loadScript = (src, attrs = {}) => new Promise((ok, ko) => {
  const s = document.createElement('script'); s.src = src; Object.assign(s, attrs);
  s.onload = () => ok({ incarcat: true }); s.onerror = () => ko(new Error('script blocat sau eroare de retea'));
  document.head.appendChild(s);
});
const loadCss = (href, cors) => new Promise((ok, ko) => {
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; if (cors) l.crossOrigin = 'anonymous';
  l.onload = () => ok(); l.onerror = () => ko(new Error('foaia de stil blocata'));
  document.head.appendChild(l);
});
const frameMsgs = [];
addEventListener('message', (e) => { if (e.data && e.data.s11) frameMsgs.push({ ...e.data, from: e.origin }); });
async function iframeTest(src) {
  const before = frameMsgs.length, f = document.createElement('iframe'); f.src = src; f.style.cssText = 'width:200px;height:60px';
  document.body.appendChild(f);
  for (let k = 0; k < 40; k++) { await sleep(100); const m = frameMsgs.slice(before).find((x) => src.includes(x.path) && src.startsWith(x.from)); if (m) return { a_raspuns: true, coi_in_cadru: m.coi }; }
  throw new Error('cadrul nu a raspuns in 4 s (blocat?)');
}

let fb = null, auth = null;
async function initFb() {
  fb = await import('./fb.bundle.js');
  const app = fb.initializeApp({ apiKey: 'demo-api-key', authDomain: 'demo-s11izolare.firebaseapp.com', projectId: 'demo-s11izolare', appId: '1:000000000000:web:s11izolare' });
  auth = fb.getAuth(app);
  fb.connectAuthEmulator(auth, `http://127.0.0.1:${EMU}`, { disableWarnings: true });
  return { sdk: 'firebase ' + (fb.initializeApp ? 'ok' : '?') };
}

async function start() {
  await test('fb_sdk_pachet_aceeasi_origine', initFb);
  await test('fb_sdk_cdn_gstatic', async () => { const m = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'); return { initializeApp: typeof m.initializeApp }; });
  await test('auth_email_parola_emulator', async () => { const c = await fb.createUserWithEmailAndPassword(auth, `u${Date.now()}@s11.test`, 'parola-test-123'); return { uid: !!c.user.uid }; });
  await test('gapi_script_auth', () => loadScript('https://apis.google.com/js/api.js'));
  await test('recaptcha_enterprise_script', async () => {
    await loadScript('https://www.google.com/recaptcha/enterprise.js?render=explicit');
    const ready = await withTimeout(new Promise((ok) => window.grecaptcha.enterprise.ready(() => ok(true))), 10000);
    await sleep(1500);
    return { enterprise: !!(window.grecaptcha && window.grecaptcha.enterprise), ready, iframe_uri: [...document.querySelectorAll('iframe')].filter((f) => /recaptcha/.test(f.src)).length };
  });
  await test('fonturi_google_fara_crossorigin', async () => { await loadCss('https://fonts.googleapis.com/css2?family=Lobster&display=swap', false); await document.fonts.load('20px Lobster'); return { font_incarcat: document.fonts.check('20px Lobster') }; });
  await test('fonturi_google_crossorigin', async () => { await loadCss('https://fonts.googleapis.com/css2?family=Pacifico&display=swap', true); await document.fonts.load('20px Pacifico'); return { font_incarcat: document.fonts.check('20px Pacifico') }; });
  await test('stripe_js_script', async () => { await loadScript('https://js.stripe.com/v3/'); await sleep(2000); return { Stripe: typeof window.Stripe, iframe_uri: document.querySelectorAll('iframe').length }; });
  await test('stripe_js_script_crossorigin', async () => { delete window.Stripe; await loadScript('https://js.stripe.com/v3/?v=co', { crossOrigin: 'anonymous' }); return { Stripe: typeof window.Stripe }; });
  await test('iframe_alta_origine_fara_antete', () => iframeTest(`http://localhost:5187/plain/web/frame.html`));
  await test('iframe_alta_origine_cu_CORP_COEP', () => iframeTest(`http://localhost:5187/corp/web/frame.html`));
  await test('iframe_aceeasi_origine_fara_antete', () => iframeTest(`http://127.0.0.1:5187/plain/web/frame.html`));
  await post(`compat-${mode}-start`, R);
  window.__autoDone = true;
}

// ---------- butoane (gest de utilizator dat de Playwright) ----------
document.getElementById('bPopup').onclick = async () => {
  const before = frameMsgs.length;
  const w = window.open(`http://localhost:5187/plain/web/popup.html?mod=${mode}`, 's11popup', 'width=420,height=300');
  const r = { handle_null: !w, closed_imediat: w ? w.closed : null };
  await sleep(2500);
  r.closed_dupa_2_5s = w ? w.closed : null;
  r.mesaj_de_la_popup = frameMsgs.slice(before).some((m) => m.s11 === 'popup-ok');
  try { if (w && !w.closed) w.close(); } catch (e) { r.close_err = String(e); }
  R.popup_simplu = r; log('popup_simplu', r); await post(`compat-${mode}-popup`, { popup_simplu: r }); window.__popupDone = true;
};
document.getElementById('bAuthPopup').onclick = async () => {
  const t0 = performance.now();
  try { const c = await fb.signInWithPopup(auth, new fb.GoogleAuthProvider()); R.auth_signInWithPopup = { ok: true, email: !!c.user.email, provider: c.providerId }; }
  catch (e) { R.auth_signInWithPopup = { ok: false, err: String((e && (e.code || e.message)) || e) }; }
  R.auth_signInWithPopup.ms = Math.round(performance.now() - t0);
  log('auth_signInWithPopup', R.auth_signInWithPopup); await post(`compat-${mode}-authpopup`, { auth_signInWithPopup: R.auth_signInWithPopup }); window.__authPopupDone = true;
};
document.getElementById('bAuthRedirect').onclick = async () => {
  sessionStorage.setItem('s11-marker', 'redirect-' + mode);
  history.replaceState(null, '', location.pathname + `?emu=${EMU}&phase=redirect`); // redirectUrl-ul SDK-ului = adresa curenta
  try { await fb.signInWithRedirect(auth, new fb.GoogleAuthProvider()); } catch (e) { R.auth_signInWithRedirect_plecare = String((e && (e.code || e.message)) || e); log('redirect plecare', R.auth_signInWithRedirect_plecare); }
};

async function afterRedirect() {
  R.marker_sessionStorage = sessionStorage.getItem('s11-marker');
  await test('fb_sdk_pachet_aceeasi_origine', initFb);
  await test('auth_signInWithRedirect_getRedirectResult', async () => {
    const c = await fb.getRedirectResult(auth);
    return { user: !!(c && c.user), email: !!(c && c.user && c.user.email), provider: c && c.providerId };
  }, 30000);
  await post(`compat-${mode}-redirect`, R); window.__redirDone = true;
}
async function afterStripe() {
  R.marker_sessionStorage = sessionStorage.getItem('s11-marker');
  try { const b = new SharedArrayBuffer(8); new Int32Array(b)[0] = 1; R.sab_merge_la_revenire = true; } catch (e) { R.sab_merge_la_revenire = String(e); }
  await post(`compat-${mode}-stripe`, R); window.__stripeDone = true;
}
log('mod', mode, 'faza', phase, 'crossOriginIsolated', self.crossOriginIsolated, 'SAB', R.sab);
(phase === 'redirect' ? afterRedirect() : phase === 'stripe' ? afterStripe() : start()).catch(async (e) => { R.eroare = String((e && e.stack) || e); log('EROARE', R.eroare); await post(`compat-${mode}-${phase}-eroare`, R); window.__autoDone = window.__redirDone = window.__stripeDone = true; });
