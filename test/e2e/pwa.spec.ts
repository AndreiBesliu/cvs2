/**
 * Workerul PWA pe build-ul real (ADR 0045 §9), în proiectul `edge-pwa` (`playwright.config.ts`: workerii sunt PERMIȘI
 * doar aici; restul suitei îi blochează). Fiecare probă are serverul ei (`server-pwa.ts`, o copie a `dist/`, port liber,
 * `no-store` pe tot) și un context nou, deci nicio înregistrare nu trece dintr-o probă în alta sau dintr-o rulare în alta.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { copieDist, PAGINA_HANDLER, pornesteServer, publicareSimulata, type Redenumire, type ServerPwa } from './server-pwa.ts';

test.use({ locale: 'ro-RO' });

/** Copia `dist/` a acestui worker Playwright (un dosar pe worker: două rulări în paralel nu-și calcă copia). */
let dosar = '';
const CONFIG_TEST = '{ "instanta": "test" }';
const LOGO = 'test/placi/placa-02/logo-80mm.svg';

test.beforeAll(() => { dosar = copieDist(`.tmp/pwa-dist-${test.info().workerIndex}`); });

/** Un context nou, cu workerii permiși sau blocați, și serverul lui. */
async function deschide(browser: Browser, blocat = false): Promise<{ page: Page; server: ServerPwa; inchide: () => Promise<void> }> {
  const server = await pornesteServer(dosar);
  server.config(CONFIG_TEST);
  const context = await browser.newContext({ baseURL: server.origine, locale: 'ro-RO', serviceWorkers: blocat ? 'block' : 'allow' });
  const page = await context.newPage();
  return { page, server, inchide: async () => { await context.close(); await server.opreste(); } };
}

/** Workerul înregistrat de aplicație (după prima randare) a ajuns activ. */
async function workerActiv(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state ?? 'niciunul'), { timeout: 20_000 })
    .toBe('activated');
}

const controlata = (page: Page): Promise<boolean> => page.evaluate(() => navigator.serviceWorker.controller !== null);
const cacheuri = (page: Page): Promise<string[]> => page.evaluate(async () => (await caches.keys()).sort());

test('offline, de la a doua încărcare: pornește, schimbă limba, deschide importul, exportul și manualul, config.json din cache', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await expect(page.getByTestId('instanta')).toContainText('test');
    await workerActiv(page);
    // Fără clients.claim(): prima încărcare nu e a workerului (ADR 0045 §6).
    expect(await controlata(page)).toBe(false);
    await page.reload();
    await expect(page.getByTestId('instanta')).toContainText('test');
    expect(await controlata(page)).toBe(true);

    await page.context().setOffline(true);
    const inainte = server.cereri.length;
    await page.reload();
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    // Configurația instanței vine din cache-ul ei (altfel: „necunoscută” și cipul de eroare).
    await expect(page.getByTestId('instanta')).toContainText('test');
    await expect(page.getByText('Configurația instanței nu s-a putut citi', { exact: false })).toHaveCount(0);
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');

    // Ambele limbi, offline.
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByTestId('jurnal')).toHaveText('0 errors in the local log');
    await page.getByRole('button', { name: 'RO', exact: true }).click();
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');

    // Importul (dialogul și citirea), apoi exportul (dialogul și calculul), offline.
    await page.locator('[data-camp="fisier-svg"]').setInputFiles(LOGO);
    await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 80.00 × 40.00 mm');
    await page.locator('[data-buton="importa"]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('[data-actiune="export.gcode"]').click();
    await expect(page.locator('[data-camp="origine"]')).toBeVisible();
    await page.locator('[data-buton="exporta"]').click();
    await expect(page.getByTestId('iesire-foaie')).toContainText('Freza iese din foaie:');
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
    // Manualul (ADR 0058), offline, în ambele limbi: fereastra și fișierele lui vin din precache.
    await page.getByRole('button', { name: 'Închide' }).click();
    for (const [limba, titlu] of [['RO', 'Manualul CNC Vector Studio'], ['EN', 'CNC Vector Studio manual']] as const) {
      await page.getByRole('button', { name: limba, exact: true }).click();
      await page.locator('[data-editare="manual"]').click();
      await expect(page.getByTestId('manual')).toHaveAttribute('data-stare', 'gata');
      await expect(page.locator('#manual-titlu')).toHaveText(titlu);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('manual')).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'RO', exact: true }).click();
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
    // Modul offline a oprit tot ce cer pagina și workerul: serverul n-a văzut nicio cerere a lor (nici `config.json`).
    // Doar verificarea de actualizare a lui `/sw.js` o face browserul însuși, pe lângă emularea rețelei a lui Playwright
    // (văzută într-una din rulări); ea nu servește nimic paginii.
    expect(server.cereri.slice(inainte).filter((c) => c !== '/sw.js')).toEqual([]);
  } finally {
    await inchide();
  }
});

test('serverul oprit de tot (offline adevărat): aplicația pornește la fel, cu configurația din cache', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await workerActiv(page);
    await page.reload();
    expect(await controlata(page)).toBe(true);
    await server.opreste();
    await page.reload();
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    await expect(page.getByTestId('instanta')).toContainText('test');
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  } finally {
    await inchide();
  }
});

test('martor: cu workerul blocat, aceeași pornire offline pică (proba de mai sus nu e oarbă)', async ({ browser }) => {
  const { page, inchide } = await deschide(browser, true);
  try {
    await page.goto('/');
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    await page.reload();
    await page.context().setOffline(true);
    await expect(page.reload()).rejects.toThrow(/ERR_INTERNET_DISCONNECTED/);
  } finally {
    await inchide();
  }
});

test('navigările: offline, doar ruta aplicației vine din precache; /admin cere rețea; /assets/* nu cade niciodată pe index.html', async ({ browser }) => {
  const { page, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await workerActiv(page);
    await page.reload();
    expect(await controlata(page)).toBe(true);
    // Online, cu workerul la control: o bucată inexistentă e 404 (navigare sau cerere), nu aplicația.
    const nav = await page.goto('/assets/nu-exista-12345678.js');
    expect(nav?.status()).toBe(404);
    expect(await nav?.text()).not.toContain('id="root"');
    await page.goto('/');
    expect(await page.evaluate(async () => (await fetch('/assets/nu-exista-12345678.js')).status)).toBe(404);

    await page.context().setOffline(true);
    // O adresă cu query nu e în precache ca atare: o servește tot navigarea, cu index.html.
    await page.goto('/?proba=1');
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    await page.goto('/index.html');
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    // `/admin` e doar online (ADR 0045 §4): workerul nu-l servește, deci fără rețea pică navigarea, ca fără worker.
    await expect(page.goto('/admin')).rejects.toThrow(/ERR_INTERNET_DISCONNECTED/);
    // Offline, o bucată care nu e în precache nu devine aplicația: navigarea pică, ca fără worker.
    await expect(page.goto('/assets/nu-exista-12345678.js')).rejects.toThrow(/ERR_INTERNET_DISCONNECTED/);
  } finally {
    await inchide();
  }
});

test('navigările pe listă albă: /__/auth/* (și popup-ul login-ului), rutele necunoscute, /banc/ și /index ajung la server', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await workerActiv(page);
    await page.reload();
    expect(await controlata(page)).toBe(true);
    // Paginile rezervate Firebase: authDomain e chiar originea instanței de test, deci login-ul Google de pe /admin
    // deschide `/__/auth/handler` pe aceeași origine. Răspunde serverul, nu workerul.
    for (const cale of ['/__/auth/handler?apiKey=k&authType=signInViaPopup', '/__/auth/iframe']) {
      const nav = await page.goto(cale);
      expect(nav?.status(), cale).toBe(200);
      expect(nav?.fromServiceWorker(), cale).toBe(false);
      await expect(page.locator('#handler')).toHaveText(PAGINA_HANDLER);
      expect(server.cereri).toContain(cale.replace(/\?.*$/, ''));
    }
    // Popup-ul lui `signInWithPopup`: o fereastră nouă, pe aceeași origine, cu workerul activ.
    await page.goto('/');
    expect(await controlata(page)).toBe(true);
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.evaluate(() => { window.open('/__/auth/handler?apiKey=k'); })]);
    await expect(popup.locator('#handler')).toHaveText(PAGINA_HANDLER);
    await expect(popup.locator('#root')).toHaveCount(0);
    await popup.close();
    // O rută necunoscută rămâne 404-ul serverului, nu aplicația (la fel `/index`, `/banc/`: copia n-are banc).
    for (const cale of ['/ceva/necunoscut', '/index', '/banc/', '/banc/index.html']) {
      const nav = await page.goto(cale);
      expect(nav?.status(), cale).toBe(404);
      expect(nav?.fromServiceWorker(), cale).toBe(false);
      expect(await nav?.text(), cale).not.toContain('id="root"');
    }
  } finally {
    await inchide();
  }
});

test('/admin înregistrează și el workerul (după pauza de 2 s), deci primește și actualizările', async ({ browser }) => {
  const { page, inchide } = await deschide(browser);
  try {
    await page.goto('/admin');
    await expect(page.locator('[data-admin="neconfigurat"]')).toBeVisible();
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()) !== undefined), { timeout: 10_000 })
      .toBe(true);
  } finally {
    await inchide();
  }
});

test('/admin fără bucata paginii (rețeaua căzută între timp): mesajul care cere rețea, cu role="alert", nu o pagină albă', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    server.lipsa(/^\/assets\/PaginaAdmin-/);
    await page.goto('/admin');
    await expect(page.getByRole('alert')).toHaveText('Pagina de administrare cere rețea: reîncarcă pagina când ai rețea.');
    await expect(page.locator('.aplicatie')).toHaveCount(0);
  } finally {
    await inchide();
  }
});

test('config.json după O SINGURĂ vizită online (fără reîncărcare controlată): offline, aplicația pornește cu configurația instanței', async ({ browser }) => {
  const { page, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await expect(page.getByTestId('instanta')).toContainText('test');
    await workerActiv(page);
    // Prima încărcare nu e a workerului: cererea ei pentru config.json nu l-a atins; copia vine de la instalare.
    expect(await controlata(page)).toBe(false);
    expect(await cacheuri(page)).toContain('cncvs2-config');
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    await expect(page.getByTestId('instanta')).toContainText('test');
    await expect(page.getByText('Instanța: necunoscută', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Configurația instanței nu s-a putut citi', { exact: false })).toHaveCount(0);
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  } finally {
    await inchide();
  }
});

test('după o publicare: /admin vine din rețea (versiunea nouă), iar fila rămasă pe versiunea veche își are raportorul', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await workerActiv(page);
    await page.reload();
    expect(await controlata(page)).toBe(true);
    await page.goto('/admin');
    await expect(page.locator('[data-admin="neconfigurat"]')).toBeVisible();

    // Publicarea: pornirea, pagina /admin, raportorul și baza conexiunii primesc nume noi; cele vechi dispar de pe server.
    const dosarB = `${dosar}-publicat`;
    const redenumite = publicareSimulata(dosar, dosarB, /^(?:index|PaginaAdmin|raportor|conexiuneBaza)-[A-Za-z0-9_-]{8}\.js$/);
    const numit = (prefix: string): Redenumire => {
      const r = redenumite.find((x) => x.vechi.startsWith(`${prefix}-`));
      if (!r) throw new Error(`nicio bucată ${prefix}`);
      return r;
    };
    server.dosar(dosarB);
    // Martorul: bucățile vechi chiar lipsesc de pe server (cererea directă, fără worker).
    for (const p of ['PaginaAdmin', 'raportor', 'conexiuneBaza']) {
      expect((await page.request.get(`/assets/${numit(p).vechi}`)).status(), p).toBe(404);
    }

    await page.goto('/admin');
    await expect(page.locator('[data-admin="neconfigurat"]')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(server.cereri).toContain(`/assets/${numit('PaginaAdmin').nou}`);

    // Aplicația rămâne pe versiunea ei până la clic (index.html și pornirea din precache), deci și raportorul ei:
    // bucata veche, dispărută de pe server, vine din precache.
    await page.goto('/');
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    for (const p of ['raportor', 'conexiuneBaza']) {
      expect(await page.evaluate(async (u) => (await fetch(u)).status, `/assets/${numit(p).vechi}`), p).toBe(200);
    }
  } finally {
    await inchide();
  }
});

/** Un worker „al aplicației vechi” (ediția întâi): cache-uri `cncvs-…`, preia fila, servește din rețea. */
const SW_VECHI = (cuCacheuri: boolean): string => `
self.addEventListener('install', (e) => {
  e.waitUntil(${cuCacheuri ? "caches.open('cncvs-shell-v41').then((c) => c.put('/vechi', new Response('aplicatia veche')))" : 'Promise.resolve()'});
  self.skipWaiting();
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', () => {});
`;

/** Fila „aplicației vechi”: workerul vechi înregistrat și la control, plus un cache străin, care trebuie să rămână. */
async function filaVeche(page: Page, server: ServerPwa, cuCacheuri: boolean): Promise<void> {
  server.sw(SW_VECHI(cuCacheuri));
  await page.goto('/gol.html');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await (await caches.open('alt-cache')).put('/x', new Response('x'));
    window.__marcaj = 'fila veche';
  });
  await expect.poll(() => controlata(page)).toBe(true);
  // De aici, hosting-ul servește aplicația nouă.
  server.sw(null);
}

declare global {
  interface Window { __marcaj?: string }
}

test('preluarea: cu aplicația veche aici, workerul nou se activează singur, șterge cache-urile cncvs- și nu reîncarcă fila', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await filaVeche(page, server, true);
    expect(await cacheuri(page)).toEqual(['alt-cache', 'cncvs-shell-v41']);
    let navigari = 0;
    page.on('framenavigated', () => { navigari++; });
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    await expect.poll(() => cacheuri(page), { timeout: 20_000 }).not.toContain('cncvs-shell-v41');
    const dupa = await cacheuri(page);
    expect(dupa).toContain('alt-cache');
    expect(dupa.filter((n) => n.startsWith('cncvs-'))).toEqual([]);
    expect(dupa.filter((n) => n.startsWith('cncvs2-precache-'))).toHaveLength(1);
    expect(await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return { asteapta: r?.waiting !== null, activ: r?.active?.state };
    })).toEqual({ asteapta: false, activ: 'activated' });
    expect(await page.evaluate(() => window.__marcaj)).toBe('fila veche');
    expect(navigari).toBe(0);
  } finally {
    await inchide();
  }
});

test('contraproba preluării: fără cache-uri cncvs-, workerul nou așteaptă (clicul din aplicație)', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await filaVeche(page, server, false);
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state ?? 'niciunul'), { timeout: 20_000 })
      .toBe('installed');
    expect(await page.evaluate(() => window.__marcaj)).toBe('fila veche');
  } finally {
    await inchide();
  }
});

/** A doua versiune a workerului, pe aceeași adresă: build-ul plus un răspuns care o deosebește (doar în probă). */
const V2 = "\n;self.addEventListener('message', (e) => { if (e.data === 'versiune?') e.source.postMessage('v2'); });\n";

/** Ce răspunde workerul care controlează pagina la „versiune?” (`—` dacă nu răspunde în 1 s). */
const versiuneaControlorului = (page: Page): Promise<string> => page.evaluate(() => new Promise<string>((ok) => {
  const c = navigator.serviceWorker.controller;
  if (!c) { ok('fără controlor'); return; }
  navigator.serviceWorker.addEventListener('message', (e) => { ok(String(e.data)); }, { once: true });
  c.postMessage('versiune?');
  setTimeout(() => { ok('—'); }, 1000);
}));

test('actualizarea: oferită în bara de jos, nicio reîncărcare până la clic, apoi una singură, sub workerul nou', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    await page.goto('/');
    await workerActiv(page);
    await page.reload();
    expect(await controlata(page)).toBe(true);
    await expect(page.getByTestId('actualizare')).toHaveCount(0);

    // O publicare nouă: aceeași adresă, alt worker. Navigarea îl găsește, îl instalează, iar el așteaptă.
    server.sw(`${(await (await page.request.get('/sw.js')).text())}${V2}`);
    await page.reload();
    const anunt = page.getByTestId('actualizare');
    await expect(anunt).toBeVisible({ timeout: 20_000 });
    await expect(anunt).toContainText('Versiune nouă gata');
    await page.evaluate(() => { window.__marcaj = 'înainte de clic'; });
    let navigari = 0;
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigari++; });
    // Fără clic, nimic: pagina rămâne a workerului vechi, cel nou așteaptă.
    await page.waitForTimeout(3000);
    expect(navigari).toBe(0);
    expect(await page.evaluate(() => window.__marcaj)).toBe('înainte de clic');
    expect(await versiuneaControlorului(page)).toBe('—');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');

    await anunt.getByRole('button', { name: 'Reîncarcă' }).click();
    await expect.poll(() => navigari, { timeout: 20_000 }).toBe(1);
    await expect(page.getByTestId('lista-vectori')).toBeVisible();
    await page.waitForTimeout(3000);
    expect(navigari).toBe(1);
    expect(await page.evaluate(() => window.__marcaj)).toBeUndefined();
    expect(await versiuneaControlorului(page)).toBe('v2');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting === null)).toBe(true);
    await expect(page.getByTestId('actualizare')).toHaveCount(0);
  } finally {
    await inchide();
  }
});

test('verificarea orară: o publicare nouă, cu fila lăsată deschisă, ajunge la ofertă după o oră, fără nicio navigare', async ({ browser }) => {
  const { page, server, inchide } = await deschide(browser);
  try {
    // Ceasul paginii e al lui Playwright (curge normal până la `fastForward`); workerul și browserul au ceasul real.
    await page.clock.install();
    await page.goto('/');
    await workerActiv(page);
    // Înregistrarea paginii reîncărcate a rulat (bucata ei a venit, din precache, după pauza de 2 s): verificarea orară e
    // armată. (Ceasul fals golește și `performance`, deci semnalul e răspunsul văzut de Playwright.)
    const bucata = page.waitForResponse(/\/assets\/inregistrare-[A-Za-z0-9_-]{8}\.js$/, { timeout: 20_000 });
    await page.reload();
    expect(await controlata(page)).toBe(true);
    expect((await bucata).fromServiceWorker()).toBe(true);
    await page.waitForTimeout(1000);
    await page.evaluate(() => { window.__marcaj = 'fila lăsată deschisă'; });
    let navigari = 0;
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigari++; });

    // O publicare nouă pe aceeași adresă (pornirea redenumită, deci alt `sw.js`), cât fila stă deschisă.
    const dosarB = `${dosar}-orar`;
    publicareSimulata(dosar, dosarB, /^index-[A-Za-z0-9_-]{8}\.js$/);
    server.dosar(dosarB);
    // Martorul: fără ceasul avansat, nimic nu vine singur (nici de la browser), deci oferta de mai jos e a verificării.
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('actualizare')).toHaveCount(0);
    const inainte = server.cereri.length;

    // O oră mai târziu (capacul laptopului închis și deschis): verificarea găsește workerul nou, care se instalează și așteaptă.
    await page.clock.fastForward('01:00:00');
    const anunt = page.getByTestId('actualizare');
    await expect(anunt).toBeVisible({ timeout: 20_000 });
    await expect(anunt).toContainText('Versiune nouă gata');
    expect(server.cereri.slice(inainte)).toContain('/sw.js');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    // Oferta, nu actualizarea: aceeași pagină, fără reîncărcare, până la clic (proba de mai sus).
    await page.waitForTimeout(2000);
    expect(navigari).toBe(0);
    expect(await page.evaluate(() => window.__marcaj)).toBe('fila lăsată deschisă');
    await expect(anunt).toHaveCount(1);
  } finally {
    await inchide();
  }
});
