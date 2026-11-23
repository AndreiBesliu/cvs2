/**
 * Capturile unei extensii din bibliotecă (ADR 0231 §B.1, răspunsul 4a): imagini adevărate ale extensiei, în română și în
 * engleză, făcute din aplicația de acum și comise în `extensii/<dosar>/biblioteca/<nume>.<limba>.webp`. Construcția
 * bibliotecii (`scripts/biblioteca.ts`) le copiază octet cu octet lângă catalog; build-ul nu pornește niciun browser.
 *
 *   node scripts/capturi-biblioteca.ts            # toate extensiile care au scene mai jos
 *   node scripts/capturi-biblioteca.ts trenulet   # doar una
 *
 * Cum: serverul de dezvoltare al aplicației (fără build), un browser fără fereastră, pachetul extensiei construit din repo și
 * instalat din fișier, extensia deschisă, cadrul ei adus la 1280 × 800, apoi fiecare scenă: pașii ei în cadru și captura
 * cadrului, micșorată la 960 × 600 și scrisă ca WebP. Tema e cea luminoasă.
 *
 * **Capturile se refac la cerere**, când se schimbă înfățișarea extensiei: nu sunt păzite de o probă (o imagine nu iese la fel
 * pe orice mașină). Numele scenelor sunt cele din `extensii/biblioteca.json` (`capturi`), unde stă și textul lor alternativ.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Frame, type Page } from 'playwright';
import { createServer } from 'vite';
import { MAX_OCTETI_CAPTURA } from '../shared/biblioteca.ts';
import { citesteLista, marimeWebp, pachetDinDosar } from './biblioteca.ts';

const CADRU = { lat: 1280, inalt: 800 } as const;
const CAPTURA = { lat: 960, inalt: 600 } as const;
const LIMBI = ['ro', 'en'] as const;

/** Scenele fiecărei extensii: numele capturii și pașii din cadrul ei, de la starea de după scena dinainte. */
const SCENE: Readonly<Record<string, ReadonlyArray<{ readonly nume: string; readonly pasi: (cadru: Frame, pagina: Page) => Promise<void> }>>> = {
  trenulet: [
    // Planul 2D, cu circuitul de exemplu.
    { nume: '1-circuit', pasi: async () => {} },
    // Atelierul 3D: cărămida de pornire, cu vederea ei (three.js vine din pachet la prima intrare).
    {
      nume: '2-atelier',
      pasi: async (cadru, pagina) => {
        await cadru.locator('[data-mod="3d"]').click();
        await cadru.locator('#mod-3d canvas').first().waitFor();
        await pagina.waitForTimeout(3000);
      },
    },
    // Fila Roți: roata dințată.
    {
      nume: '3-roti',
      pasi: async (cadru, pagina) => {
        await cadru.locator('#at-tipuri [data-fila="roti"]').click();
        await pagina.waitForTimeout(2500);
      },
    },
  ],
};

/** Edge, ca probele; altfel Chrome sau Chromium-ul lui Playwright. Vederile 3D cer WebGL și fără placă video. */
async function browserul(): Promise<Browser> {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  for (const channel of ['msedge', 'chrome'] as const) {
    try {
      return await chromium.launch({ channel, args });
    } catch {
      // următorul
    }
  }
  return chromium.launch({ args });
}

/** Captura cadrului, micșorată la `CAPTURA` și scrisă ca WebP (în pagină, pe o pânză). */
async function webp(pagina: Page, png: Buffer): Promise<Uint8Array> {
  const b64 = await pagina.evaluate(async ([src, lat, inalt]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = new OffscreenCanvas(lat, inalt);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără pânză 2D');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, lat, inalt);
    const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.82 });
    let s = '';
    for (const x of new Uint8Array(await blob.arrayBuffer())) s += String.fromCharCode(x);
    return btoa(s);
  }, [`data:image/png;base64,${png.toString('base64')}`, CAPTURA.lat, CAPTURA.inalt] as const);
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function capturi(browser: Browser, adresa: string, dosar: string): Promise<void> {
  const scene = SCENE[dosar];
  if (!scene) throw new Error(`${dosar}: n-are scene în scripts/capturi-biblioteca.ts`);
  const { manifest, octeti } = pachetDinDosar(dosar);
  const id = String(manifest.id);
  const iesire = join('extensii', dosar, 'biblioteca');
  mkdirSync(iesire, { recursive: true });
  for (const limba of LIMBI) {
    const context = await browser.newContext({
      viewport: { width: CADRU.lat, height: CADRU.inalt + 100 }, deviceScaleFactor: 1, serviceWorkers: 'block', locale: limba === 'ro' ? 'ro-RO' : 'en-GB',
    });
    await context.addInitScript((l) => {
      try {
        localStorage.setItem('cncvs2.tema', 'luminoasa');
        localStorage.setItem('cncvs2.limba', l);
      } catch {
        // fără stocare: tema și limba sistemului
      }
    }, limba);
    const pagina = await context.newPage();
    await pagina.goto(adresa);
    // Pachetul de acum, instalat din fișier (biblioteca poate să nu aibă încă aceste capturi).
    const fisier = pagina.locator('[data-extensii="fisier-ales"]');
    await fisier.waitFor({ state: 'attached', timeout: 60_000 });
    await fisier.setInputFiles({ name: `${id}.zip`, mimeType: 'application/zip', buffer: Buffer.from(octeti) });
    await pagina.locator('[data-testid="extensii-instalare"] [data-extensii="instaleaza"]').click();
    await pagina.locator('[data-testid="extensii-instalare"]').waitFor({ state: 'detached' });
    await pagina.locator('[data-extensii="buton"]').click();
    await pagina.locator(`[data-extensii="deschide"][data-id="${id}"]`).click();
    await pagina.locator('[data-testid="spatiu-extensie"][data-stare="pornit"]').waitFor({ timeout: 60_000 });
    // Cadrul extensiei, adus la mărimea capturii: fereastra crește cu cât îi lipsește.
    const cadruEl = pagina.locator('iframe.cadru-extensie');
    const cutie = await cadruEl.boundingBox();
    if (!cutie) throw new Error('cadrul extensiei nu se vede');
    await pagina.setViewportSize({ width: Math.round(CADRU.lat + (CADRU.lat - cutie.width)), height: Math.round(CADRU.inalt + 100 + (CADRU.inalt - cutie.height)) });
    const dupa = await cadruEl.boundingBox();
    if (!dupa || Math.round(dupa.width) !== CADRU.lat || Math.round(dupa.height) !== CADRU.inalt) throw new Error(`cadrul are ${dupa?.width} × ${dupa?.height}, nu ${CADRU.lat} × ${CADRU.inalt}`);
    const cadru = await (await cadruEl.elementHandle())?.contentFrame();
    if (!cadru) throw new Error('cadrul extensiei n-are pagină');
    await pagina.waitForTimeout(1500);
    for (const scena of scene) {
      await scena.pasi(cadru, pagina);
      const o = await webp(pagina, await cadruEl.screenshot());
      const m = marimeWebp(o);
      if (!m || m.lat !== CAPTURA.lat || m.inalt !== CAPTURA.inalt) throw new Error(`${scena.nume}: captura n-are ${CAPTURA.lat} × ${CAPTURA.inalt}`);
      const cale = join(iesire, `${scena.nume}.${limba}.webp`);
      writeFileSync(cale, o);
      console.log(`${cale}: ${o.length} octeți${o.length > MAX_OCTETI_CAPTURA ? ` (PESTE plafonul de ${MAX_OCTETI_CAPTURA})` : ''}`);
    }
    await context.close();
  }
}

if (import.meta.main) {
  const cerut = process.argv[2];
  const dosare = citesteLista().map((x) => x.dosar).filter((d) => (cerut ? d === cerut : d in SCENE));
  if (dosare.length === 0) {
    console.error(cerut ? `${cerut}: nu e în extensii/biblioteca.json` : 'nicio extensie din bibliotecă n-are scene');
    process.exit(2);
  }
  // Fără fereastra de eroare a lui Vite peste pagină: la prima rulare catalogul nu se poate construi (capturile lipsesc încă),
  // iar cererea lui, făcută de meniul Extensii, ar acoperi aplicația.
  const server = await createServer({ server: { host: '127.0.0.1', port: 4190, strictPort: false, hmr: { overlay: false } }, logLevel: 'silent' });
  await server.listen();
  const adresa = server.resolvedUrls?.local[0];
  if (!adresa) throw new Error('serverul de dezvoltare n-a pornit');
  const browser = await browserul();
  try {
    for (const d of dosare) await capturi(browser, adresa, d);
  } finally {
    await browser.close();
    await server.close();
  }
}
