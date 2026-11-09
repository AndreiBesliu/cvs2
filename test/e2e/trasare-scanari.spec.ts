import { test, expect, type Page } from '@playwright/test';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Scanările și pozele (ADR 0224, felia 25.4↑) în aplicația construită: Lumina (ascunsă pe transparență și pe culori),
 * sugestia raportului, „Ignoră ce atinge marginea”, Zona trasă pe previzualizare (cu butonul și cu Shift), „Toată imaginea”
 * și piesa fără masa din jurul foii. Pozele sunt desenate în pagină (canvas): o foaie luminată dintr-o parte (de la 95 % la
 * 35 %), cu un zigzag, un cerc și o linie, întinsă pe toată imaginea sau pusă pe o masă închisă.
 */

test.use({ locale: 'ro-RO' });

const W = 600, H = 400;

async function alegePoza(page: Page, fel: 'laterala' | 'masa' | 'transparenta'): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  await page.evaluate(async ([fel, W, H]) => {
    const c = new OffscreenCanvas(W, H);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    if (fel !== 'transparenta') {
      const foaie: [number, number, number, number] = fel === 'masa' ? [30, 24, W - 60, H - 48] : [0, 0, W, H];
      if (fel === 'masa') { g.fillStyle = '#2e2e2e'; g.fillRect(0, 0, W, H); }
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, '#f2f2f2');
      gr.addColorStop(1, '#5a5a5a');
      g.fillStyle = gr;
      g.fillRect(...foaie);
    }
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
    dt.items.add(new File([b], `${fel}.png`, { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  }, [fel, W, H] as const);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
}

/** Punctul (x, y) al imaginii, pe ecran, în previzualizarea încadrată (cum o arată „Încadrează”). */
async function peEcran(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const b = await page.getByTestId('trasare-previzualizare').boundingBox();
  if (!b) throw new Error('fără previzualizare');
  const s = Math.min(b.width / W, b.height / H) * 0.95;
  return { x: b.x + b.width / 2 + (x - W / 2) * s, y: b.y + b.height / 2 + (y - H / 2) * s };
}

async function trage(page: Page, a: readonly [number, number], b: readonly [number, number], shift = false): Promise<void> {
  const p = await peEcran(page, ...a), q = await peEcran(page, ...b);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 8 });
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

const PATRU = '4 contururi închise: 3 tăiate pe exterior, 1 pe interior (după sensul fiecărui contur)';

/** Câți pixeli verzi (culoarea vectorilor) are previzualizarea în jurul punctului (x, y) al imaginii, într-un pătrat de 13 px. */
async function verziLa(page: Page, x: number, y: number): Promise<number> {
  return page.evaluate(([x, y, W, H]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="trasare-previzualizare"]');
    const g = c?.getContext('2d');
    if (!c || !g) throw new Error('fără previzualizare');
    const k = window.devicePixelRatio || 1, s = Math.min(c.clientWidth / W, c.clientHeight / H) * 0.95;
    const px = Math.round(((x - W / 2) * s + c.clientWidth / 2) * k), py = Math.round(((y - H / 2) * s + c.clientHeight / 2) * k);
    const d = g.getImageData(px - 6, py - 6, 13, 13).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if ((d[i + 1] ?? 0) > (d[i] ?? 0) + 40 && (d[i + 1] ?? 0) > (d[i + 2] ?? 0)) n++;
    return n;
  }, [x, y, W, H] as const);
}

test('lumina dintr-o parte: „Uniformă” ia umbra foii drept desen și raportul sugerează „Neuniformă”; cu ea, doar desenul', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'laterala');
  await expect(page.locator('[data-camp="trasare-lumina"]')).toHaveValue('uniforma');
  await expect(page.getByTestId('trasare-lumina-sfat')).toHaveText('Un singur prag pe toată imaginea: o scanare curată, un logo.');
  await expect(page.getByTestId('trasare-sugestie')).toContainText('Hârtia pare luminată inegal (variază cu');
  await expect(page.getByTestId('trasare-sugestie')).toContainText('încearcă Lumina: Neuniformă.');
  await expect(page.getByTestId('import-cai')).not.toHaveText(PATRU);
  await page.locator('[data-camp="trasare-lumina"]').selectOption('neuniforma');
  await expect(page.getByTestId('import-cai')).toHaveText(PATRU);
  await expect(page.getByTestId('trasare-sugestie')).toHaveCount(0);
  await expect(page.getByTestId('trasare-lumina-sfat')).toContainText('lumina dintr-o parte');
  // Cu umbre: același desen.
  await page.locator('[data-camp="trasare-lumina"]').selectOption('umbre');
  await expect(page.getByTestId('import-cai')).toHaveText(PATRU);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('foaia pe masă: „Ignoră ce atinge marginea” scoate masa; Importă pune doar desenul pe foaie', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'masa');
  await page.locator('[data-camp="trasare-lumina"]').selectOption('neuniforma');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await expect(page.getByTestId('import-cai')).not.toHaveText(PATRU);
  await page.locator('[data-camp="trasare-margine"]').check();
  await expect(page.getByTestId('import-cai')).toHaveText(PATRU);
  await expect(page.getByTestId('trasare-margine')).toHaveText('1 bucată lipită de margine, ștearsă');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = await documentSalvat(page, 1);
  expect(doc.split('"tip":"element"').length - 1).toBe(4);
});

test('zona: cu butonul, tragerea alege cercul (decupajul e pagina); „Toată imaginea” o scoate; cu Shift, și fără buton', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'laterala');
  await page.locator('[data-camp="trasare-lumina"]').selectOption('neuniforma');
  await expect(page.getByTestId('import-cai')).toHaveText(PATRU);
  await expect(page.locator('[data-buton="trasare-toata"]')).toBeDisabled();
  await page.locator('[data-buton="trasare-zona"]').click();
  await expect(page.locator('[data-buton="trasare-zona"]')).toHaveAttribute('aria-pressed', 'true');
  await trage(page, [370, 120], [530, 280]);
  await expect(page.getByTestId('import-cai')).toHaveText('2 contururi închise: 1 tăiate pe exterior, 1 pe interior (după sensul fiecărui contur)');
  await expect(page.getByTestId('trasare-zona')).toContainText('din imaginea de 600 × 400 px');
  await expect(page.getByTestId('trasare-zona')).toContainText(/^Zona: 1[56]\d × 1[56]\d px/);
  // Vectorii zonei se desenează la locul ei: pe marginea de sus a cercului (raza 58 cu trăsătura), nu în colțul imaginii.
  await expect.poll(() => verziLa(page, 450, 142)).toBeGreaterThan(0);
  expect(await verziLa(page, 80, 22)).toBe(0);
  // Un clic fără tragere (în zonă sau în afara ei) nu schimbă zona.
  const inainte = await page.getByTestId('trasare-zona').textContent();
  await trage(page, [100, 330], [100, 330]);
  await expect(page.getByTestId('trasare-zona')).toHaveText(inainte ?? '');
  // Mutată din interior (cu 300 px la stânga și 100 în sus), zona prinde doar o bucată din zigzag: aceeași mărime.
  await trage(page, [450, 200], [150, 100]);
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  await expect(page.getByTestId('trasare-zona')).toContainText(/^Zona: 1[56]\d × 1[56]\d px/);
  // Întinsă de latura din dreapta până la 330 px, prinde tot zigzagul (dinții, de la 100 la 300 px).
  await trage(page, [230, 100], [330, 100]);
  await expect(page.getByTestId('trasare-zona')).toContainText(/^Zona: 26\d × 1[56]\d px/);
  // Imaginea rămâne întreagă în raport; lățimea propusă e a zonei.
  await expect(page.getByTestId('trasare-imagine')).toHaveText('Imaginea: 600 × 400 px');
  await page.locator('[data-buton="trasare-toata"]').click();
  await expect(page.getByTestId('import-cai')).toHaveText(PATRU);
  await expect(page.getByTestId('trasare-zona')).toHaveCount(0);
  // Fără buton, tragerea mută imaginea; cu Shift, desenează zona (aici, linia de jos).
  await page.locator('[data-buton="trasare-zona"]').click();
  await expect(page.locator('[data-buton="trasare-zona"]')).toHaveAttribute('aria-pressed', 'false');
  await trage(page, [70, 260], [380, 360], true);
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  await expect(page.getByTestId('trasare-zona')).toBeVisible();
});

test('pe transparență și pe culori, Lumina nu apare; „Ignoră ce atinge marginea” rămâne', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'transparenta');
  await expect(page.getByTestId('trasare-sursa-aleasa')).toHaveText('Transparența: imaginea are fundal transparent.');
  await expect(page.locator('[data-camp="trasare-lumina"]')).toHaveCount(0);
  await expect(page.locator('[data-camp="trasare-margine"]')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('lum');
  await expect(page.locator('[data-camp="trasare-lumina"]')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  await expect(page.getByTestId('trasare-culori')).toBeVisible();
  await expect(page.locator('[data-camp="trasare-lumina"]')).toHaveCount(0);
  await expect(page.locator('[data-camp="trasare-margine"]')).toBeVisible();
});
