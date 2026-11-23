import { test, expect, type Page } from '@playwright/test';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Fereastra trasării, refăcută (ADR 0273, felia 25.9↑): cât ecranul, fără derularea ei, cu butoanele și previzualizarea la
 * vedere pe cele cinci ecrane măsurate în ADR, în ambele limbi și cu fontul lat; mărimea desenului scrisă (legată, ținută
 * după alte setări, sau doar scara); grupurile strânse la prima deschidere, cu rezumatul lor, ținute în browser, și Simplu;
 * sugestia raportului ca buton; „Desenul” cu virgula în română și cu punctul în engleză.
 */

const ECRANE = [[1024, 768], [1280, 720], [1366, 768], [1400, 900], [1920, 1080]] as const;

/** Fontul lat al probelor de așezare (13.A↑c): Verdana aici, DejaVu Sans pe Linux, unde `system-ui` e oricum lat. */
async function fontLat(page: Page): Promise<void> {
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
}

/** Logoul din corpus (1288 × 325 px, la 96 px pe țol), cu fereastra trasării deschisă și prima trasare gata. */
async function logo(page: Page): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/logo-cvs.png');
  await expect(page.getByTestId('trasare-scurt-abatere')).toBeVisible({ timeout: 30_000 });
}

/** Unde stau fereastra, butoanele și previzualizarea, în pixelii ecranului. */
async function asezare(page: Page): Promise<{
  readonly derulare: number; readonly derulareOrizontala: number; readonly importa: DOMRectReadOnly; readonly renunta: DOMRectReadOnly;
  readonly panza: DOMRectReadOnly; readonly laImporta: boolean; readonly laPanza: boolean;
}> {
  return page.evaluate(() => {
    const cutie = document.querySelector<HTMLElement>('.dialog-trasare');
    const importa = document.querySelector<HTMLElement>('[data-buton="importa"]');
    const renunta = document.querySelector<HTMLElement>('[data-buton="renunta"]');
    const panza = document.querySelector<HTMLElement>('[data-testid="trasare-previzualizare"]');
    if (!cutie || !importa || !renunta || !panza) throw new Error('lipsește fereastra, un buton sau previzualizarea');
    const ri = importa.getBoundingClientRect(), rp = panza.getBoundingClientRect();
    const sus = (r: DOMRectReadOnly, e: Element): boolean => {
      const x = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return x !== null && (x === e || e.contains(x));
    };
    return {
      derulare: cutie.scrollHeight - cutie.clientHeight, derulareOrizontala: cutie.scrollWidth - cutie.clientWidth,
      importa: ri, renunta: renunta.getBoundingClientRect(), panza: rp, laImporta: sus(ri, importa), laPanza: sus(rp, panza),
    };
  });
}

for (const limba of ['ro-RO', 'en-GB'] as const) {
  test.describe(limba, () => {
    test.use({ locale: limba });
    test(`${limba}: pe cinci ecrane și trei feluri, butoanele și previzualizarea stau în ecran, fără derularea ferestrei`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/');
      await fontLat(page);
      await logo(page);
      // Previzualizarea, cel puțin atât de înaltă; cu toate grupurile și Detaliile deschise, mai puțin (piciorul crește).
      const masoara = async (fel: string, inaltaMinim = 300): Promise<void> => {
        for (const [w, h] of ECRANE) {
          await page.setViewportSize({ width: w, height: h });
          await expect.poll(async () => (await asezare(page)).derulare, `${fel} ${w}×${h}: derularea ferestrei`).toBeLessThanOrEqual(1);
          const a = await asezare(page);
          const unde = `${fel}, ${w} × ${h}`;
          expect(a.derulareOrizontala, unde).toBeLessThanOrEqual(1);
          expect(a.importa.bottom, `${unde}: Importă`).toBeLessThanOrEqual(h);
          expect(a.renunta.bottom, `${unde}: Renunță`).toBeLessThanOrEqual(h);
          expect(a.renunta.right, `${unde}: Renunță`).toBeLessThanOrEqual(w);
          expect(a.laImporta, `${unde}: nimic nu acoperă Importă`).toBe(true);
          expect(a.panza.top, `${unde}: previzualizarea`).toBeGreaterThanOrEqual(0);
          expect(a.panza.bottom, `${unde}: previzualizarea`).toBeLessThanOrEqual(h);
          expect(a.panza.height, `${unde}: previzualizarea, înaltă`).toBeGreaterThanOrEqual(inaltaMinim);
          expect(a.laPanza, `${unde}: nimic nu acoperă previzualizarea`).toBe(true);
        }
      };
      await masoara('contururi');
      // Pe ecranul mare, previzualizarea crește cu fereastra (înainte stătea la 800 × 418).
      expect((await asezare(page)).panza.width).toBeGreaterThan(1000);
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
      await expect(page.getByTestId('trasare-pastile').locator('li').first()).toBeVisible({ timeout: 30_000 });
      await masoara('culori');
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.locator('[data-camp="trasare-sursa"]').selectOption('auto');
      await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
      await expect(page.getByTestId('trasare-optiuni-mediane')).toBeVisible();
      await expect(page.getByTestId('trasare-scurt-mediane')).toBeVisible({ timeout: 30_000 });
      await masoara('linii mediane');
      // Cu toate grupurile și Detaliile deschise, tot așa: se derulează doar coloana setărilor și Detaliile.
      for (const g of ['imagine', 'curatare']) await page.locator(`[data-buton="trasare-grup-${g}"]`).click();
      await page.locator('[data-buton="trasare-detalii"]').click();
      await masoara('toate deschise', 240);
    });
  });
}

test.describe('în română', () => {
  test.use({ locale: 'ro-RO' });

  test('mărimea desenului: lățimea sau înălțimea scrisă, legate; ținută după alte setări; „Scara” ține doar scara', async ({ page }) => {
    test.slow();
    await page.goto('/');
    await logo(page);
    await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 327,06 × 72,42 mm');
    // Implicit (răspunsul 2a): mărimea desenului, cu mărimea de acum în câmpuri, ca sugestie.
    await expect(page.locator('[data-camp="trasare-marime-fel"]')).toHaveValue('desen');
    await expect(page.locator('[data-camp="trasare-desen-l"]')).toHaveAttribute('placeholder', '327,06');
    await expect(page.locator('[data-camp="trasare-desen-i"]')).toHaveAttribute('placeholder', '72,42');
    await page.locator('[data-camp="trasare-desen-l"]').fill('300');
    await expect(page.getByTestId('import-marime')).toContainText('Desenul: 300,00 × ');
    await expect(page.getByTestId('trasare-scara')).toContainText('din lățime');
    // Legate: înălțimea urmează (pe hârtie, 300 · 72,42 / 327,06 ≈ 66,4), în câmpul ei, ca sugestie.
    const i = Number((await page.locator('[data-camp="trasare-desen-i"]').getAttribute('placeholder'))?.replace(',', '.'));
    expect(Math.abs(i - (300 * 72.4151) / 327.0649)).toBeLessThan(0.02);
    // Înălțimea scrisă: lățimea se golește și urmează.
    await page.locator('[data-camp="trasare-desen-i"]').fill('50,5');
    await expect(page.locator('[data-camp="trasare-desen-l"]')).toHaveValue('');
    await expect(page.getByTestId('import-marime')).toContainText(' × 50,50 mm');
    // Răspunsul 3a: altă curățare (petele în mm) nu mută mărimea scrisă.
    await page.locator('[data-buton="trasare-grup-curatare"]').click();
    await page.locator('[data-camp="trasare-pete"]').fill('2');
    await expect(page.getByTestId('trasare-rezumat-curatare')).toHaveText('Echilibrat · pete sub 2 mm · goluri sub 0,3 mm');
    await expect(page.getByTestId('trasare-trasez')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId('import-marime')).toContainText(' × 50,50 mm');
    // Importat, desenul are mărimea scrisă: cutia piesei din document, în mm, la 0,01.
    await page.locator('[data-buton="importa"]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const doc = JSON.parse(await documentSalvat(page, 1)) as unknown;
    const y = cutieY(doc);
    expect(Math.abs(y - 50.5), `înălțimea desenului importat: ${y}`).toBeLessThan(0.01);
  });

  test('„Scara” rămâne fixă după ce desenul a ajuns la mărimea scrisă; lățimea imaginii se scrie ca până acum', async ({ page }) => {
    test.slow();
    await page.goto('/');
    await logo(page);
    await page.locator('[data-camp="trasare-fix"]').selectOption('scara');
    await page.locator('[data-camp="trasare-desen-l"]').fill('200');
    await expect(page.getByTestId('import-marime')).toContainText('Desenul: 200,00 × ');
    // Ajuns la ea, câmpul se golește și arată mărimea, ca sugestie; scara rămâne: „din lățime”.
    await expect(page.locator('[data-camp="trasare-desen-l"]')).toHaveValue('');
    await expect(page.locator('[data-camp="trasare-desen-l"]')).toHaveAttribute('placeholder', '200');
    const scara = await page.getByTestId('trasare-scara').textContent();
    expect(scara).toContain('din lățime');
    // Altă curățare (un câmp cu valori, ca lățimea imaginii de altădată) nu scoate scara.
    await page.locator('[data-buton="trasare-grup-curatare"]').click();
    await page.locator('[data-camp="trasare-pete"]').fill('0,5');
    await expect(page.getByTestId('trasare-rezumat-curatare')).toHaveText('Echilibrat · pete sub 0,5 mm · goluri sub 0,3 mm');
    await expect(page.getByTestId('trasare-trasez')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId('trasare-scara')).toHaveText(scara ?? '');
    await page.locator('[data-camp="trasare-prag-auto"]').uncheck();
    await expect(page.getByTestId('trasare-trasez')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId('trasare-scara')).toHaveText(scara ?? '');
    // Lățimea imaginii (răspunsul 2b, ca opțiune): ținută, la deschiderea următoare.
    await page.locator('[data-camp="trasare-marime-fel"]').selectOption('imagine');
    await page.locator('[data-camp="trasare-latime"]').fill('100');
    await expect(page.getByTestId('trasare-scara')).toContainText('Înălțimea 25,2 mm');
    await expect(page.getByTestId('trasare-rezumat-marime')).toHaveCount(1);
    await page.locator('[data-buton="renunta"]').click();
    await logo(page);
    await expect(page.locator('[data-camp="trasare-marime-fel"]')).toHaveValue('imagine');
    await expect(page.locator('[data-camp="trasare-fix"]')).toHaveCount(0);
  });

  test('grupurile: Imaginea și Curățarea strânse la prima deschidere, cu rezumatul; ținute în browser; Simplu le ascunde', async ({ page }) => {
    await page.goto('/');
    await logo(page);
    const grup = (g: string) => page.locator(`details[data-grup="${g}"]`);
    await expect(grup('imagine')).not.toHaveAttribute('open');
    await expect(grup('curatare')).not.toHaveAttribute('open');
    await expect(grup('trasare')).toHaveAttribute('open', '');
    await expect(grup('marime')).toHaveAttribute('open', '');
    await expect(page.locator('[data-camp="trasare-netezime"]')).toBeHidden();
    await expect(page.getByTestId('trasare-rezumat-imagine')).toHaveText('ca în fișier');
    await expect(page.getByTestId('trasare-rezumat-curatare')).toHaveText('Echilibrat · pete sub 0,3 mm · goluri sub 0,3 mm');
    await expect(page.getByTestId('trasare-rezumat-curatare')).toBeVisible();
    // Un grup deschis își ascunde rezumatul; schimbat și strâns, rezumatul urmează valoarea.
    await page.locator('[data-buton="trasare-grup-curatare"]').click();
    await expect(page.getByTestId('trasare-rezumat-curatare')).toBeHidden();
    await page.locator('[data-camp="trasare-netezime"]').selectOption('neted');
    await page.locator('[data-buton="trasare-grup-curatare"]').click();
    await expect(page.getByTestId('trasare-rezumat-curatare')).toHaveText('Neted · pete sub 0,3 mm · goluri sub 0,3 mm');
    await page.locator('[data-buton="trasare-grup-imagine"]').click();
    await page.locator('[data-camp="trasare-margine"]').check();
    await expect(page.getByTestId('trasare-rezumat-imagine')).toHaveText('fără ce atinge marginea');
    await page.locator('[data-buton="trasare-grup-trasare"]').click();
    await expect(page.getByTestId('trasare-rezumat-trasare')).toHaveText('pragul automat (128)');
    // Deschiderile se țin: la imaginea următoare, Imaginea deschisă, Trasarea strânsă.
    await page.locator('[data-buton="renunta"]').click();
    await logo(page);
    await expect(grup('imagine')).toHaveAttribute('open', '');
    await expect(grup('trasare')).not.toHaveAttribute('open');
    // Simplu (răspunsul 1b, ca opțiune): Imaginea și Curățarea dispar, și rămâne așa.
    await page.locator('[data-camp="trasare-simplu"]').check();
    await expect(grup('imagine')).toHaveCount(0);
    await expect(grup('curatare')).toHaveCount(0);
    await expect(grup('trasare')).toHaveCount(1);
    await page.locator('[data-buton="renunta"]').click();
    await logo(page);
    await expect(grup('imagine')).toHaveCount(0);
    await expect(page.locator('[data-camp="trasare-simplu"]')).toBeChecked();
  });

  test('sugestia raportului: butonul ei schimbă lumina și deschide Imaginea; grupul are semnul cât e o sugestie', async ({ page }) => {
    await page.goto('/');
    await pozaLaterala(page);
    await expect(page.getByTestId('trasare-sugestie')).toContainText('Hârtia pare luminată inegal (variază cu');
    await expect(page.getByTestId('trasare-sugestie')).toBeVisible();
    await expect(page.getByTestId('trasare-semn-imagine')).toBeVisible();
    await expect(page.locator('details[data-grup="imagine"]')).not.toHaveAttribute('open');
    await page.locator('[data-buton="trasare-aplica-lumina"]').click();
    await expect(page.locator('details[data-grup="imagine"]')).toHaveAttribute('open', '');
    await expect(page.locator('[data-camp="trasare-lumina"]')).toHaveValue('neuniforma');
    await expect(page.getByTestId('trasare-sugestie')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId('trasare-semn-imagine')).toHaveCount(0);
  });

  test('raportul scurt la vedere, restul sub „Detalii”, ținute deschise în browser', async ({ page }) => {
    await page.goto('/');
    await logo(page);
    await expect(page.getByTestId('trasare-scurt-cai')).toHaveText('48 de contururi');
    await expect(page.getByTestId('trasare-scurt-abatere')).toHaveText(/^abaterea 0,\d\d mm$/);
    await expect(page.getByTestId('trasare-abatere')).toBeHidden();
    await expect(page.getByTestId('import-cai')).toBeHidden();
    await page.locator('[data-buton="trasare-detalii"]').click();
    await expect(page.getByTestId('trasare-abatere')).toBeVisible();
    await expect(page.getByTestId('import-cai')).toBeVisible();
    await page.locator('[data-buton="renunta"]').click();
    await logo(page);
    await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  });
});

test.describe('pe telefon', () => {
  test.use({ locale: 'ro-RO', viewport: { width: 390, height: 844 } });

  test('o coloană derulată în corp: titlurile grupurilor nu stau sub previzualizare, butoanele rămân jos', async ({ page }) => {
    await page.goto('/');
    await logo(page);
    for (const g of ['imagine', 'trasare', 'curatare', 'marime']) {
      const titlu = page.locator(`[data-buton="trasare-grup-${g}"]`);
      await titlu.scrollIntoViewIfNeeded();
      const liber = await titlu.evaluate((e) => {
        const r = e.getBoundingClientRect(), x = document.elementFromPoint(r.x + 12, r.y + r.height / 2);
        return x !== null && (x === e || e.contains(x));
      });
      expect(liber, `titlul grupului ${g}`).toBe(true);
    }
    await page.locator('[data-buton="trasare-grup-curatare"]').click();
    await expect(page.locator('[data-camp="trasare-netezime"]')).toBeVisible();
    const a = await asezare(page);
    expect(a.derulare).toBeLessThanOrEqual(1);
    expect(a.importa.bottom).toBeLessThanOrEqual(844);
    expect(a.laImporta).toBe(true);
  });
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-GB' });

  test('„Drawing” cu punctul, la o imagine și la un SVG', async ({ page }) => {
    await page.goto('/');
    await logo(page);
    await expect(page.getByTestId('import-marime')).toHaveText('Drawing: 327.06 × 72.42 mm');
    await page.locator('[data-buton="renunta"]').click();
    await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
    await expect(page.getByTestId('import-marime')).toHaveText(/^Drawing: \d+\.\d\d × \d+\.\d\d mm$/);
  });
});

type M = readonly [number, number, number, number, number, number];
const compune = (p: M, m: Readonly<Record<string, number>>): M => [
  p[0] * (m.a ?? 1) + p[2] * (m.b ?? 0), p[1] * (m.a ?? 1) + p[3] * (m.b ?? 0), p[0] * (m.c ?? 0) + p[2] * (m.d ?? 1), p[1] * (m.c ?? 0) + p[3] * (m.d ?? 1),
  p[0] * (m.e ?? 0) + p[2] * (m.f ?? 0) + p[4], p[1] * (m.e ?? 0) + p[3] * (m.f ?? 0) + p[5],
];

/**
 * Înălțimea desenului din documentul salvat: toate căile pieselor, în sistemul piesei (matricele grupurilor și ale
 * elementelor compuse), cu extremele exacte ale cubicelor (pe hârtie: rădăcinile derivatei), nu cu mânerele lor.
 */
function cutieY(doc: unknown): number {
  let y0 = Infinity, y1 = -Infinity;
  const pune = (y: number): void => { y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  const umbla = (x: unknown, m: M): void => {
    if (Array.isArray(x)) { for (const v of x) umbla(v, m); return; }
    if (typeof x !== 'object' || x === null) return;
    const o = x as Record<string, unknown>;
    const mm = (o.tip === 'grup' || o.tip === 'element') && typeof o.matrice === 'object' && o.matrice !== null
      ? compune(m, o.matrice as Record<string, number>) : m;
    const yDe = (q: Readonly<Record<string, number>>): number => mm[1] * (q.x ?? 0) + mm[3] * (q.y ?? 0) + mm[5];
    const forma = o.tip === 'element' ? o.forma as Record<string, unknown> | undefined : undefined;
    if (forma?.tip === 'cale' && Array.isArray(forma.varfuri)) {
      const v = forma.varfuri as Array<{ p: Record<string, number>; s: { tip: string; c1?: Record<string, number>; c2?: Record<string, number> } }>;
      v.forEach((w, k) => {
        pune(yDe(w.p));
        const urm = v[(k + 1) % v.length];
        if (w.s.tip !== 'C' || !w.s.c1 || !w.s.c2 || !urm || (forma.inchis !== true && k === v.length - 1)) return;
        const a = yDe(w.p), b = yDe(w.s.c1), c = yDe(w.s.c2), d = yDe(urm.p);
        const A = -a + 3 * b - 3 * c + d, B = 2 * (a - 2 * b + c), C = b - a;
        const ts = Math.abs(A) < 1e-12 ? (Math.abs(B) > 1e-12 ? [-C / B] : []) : B * B - 4 * A * C < 0 ? [] : [(-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A), (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A)];
        for (const t of ts) if (t > 0 && t < 1) pune((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d);
      });
      return;
    }
    for (const w of Object.values(o)) umbla(w, mm);
  };
  umbla(doc, [1, 0, 0, 1, 0, 0]);
  return y1 - y0;
}

/** Poza unei foi luminate dintr-o parte (ca în `trasare-scanari.spec.ts`): un zigzag, un cerc și o linie, pe un gradient. */
async function pozaLaterala(page: Page): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  await page.evaluate(async () => {
    const W = 600, H = 400, c = new OffscreenCanvas(W, H), g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#f2f2f2');
    gr.addColorStop(1, '#5a5a5a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#191919';
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= 8; i++) g.lineTo(100 + 25 * i, 100 + (i % 2 === 0 ? -25 : 25));
    g.stroke();
    g.beginPath();
    g.arc(450, 200, 55, 0, 2 * Math.PI);
    g.stroke();
    g.beginPath();
    g.moveTo(100, 300);
    g.lineTo(350, 320);
    g.stroke();
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'laterala.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
}
