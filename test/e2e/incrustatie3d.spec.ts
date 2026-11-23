import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Dopul în vederea 3D (ADR 0178, felia 12.1↑e), în Edge, cu WebGL2. Pe dreptunghiul de 30 × 20 din (20, 20), cu rolul
 * „incrustație cu pereți drepți” ales din panou (implicitele: dopul ridicat, pe fund, D 3, g 0,5, H 2, marginea 5, Ø6),
 * vederea 3D are „Foaia / Dopul 1”. Dopul, pe semifabricatul lui de 40 × 30 × 6 (pe fund, h = D + H = 3 + 2 = 5, plus 1):
 * fața coborâtă la 5 în jur, dopul în picioare la mijloc. Înapoi la foaie, placa de 300 × 200. Fără incrustații, fără butoane.
 * Titlul dopului numește incrustația ca bara de jos (forma, mărimea, locul), nu prin id-ul ei intern (precizarea din 21.11).
 * Un fișier al lui, ca otrăvurile vederii (`test/otravuri/12.1e.py`) să ruleze doar proba asta.
 */
test.use({ locale: 'ro-RO' });

const buton = (page: Page) => page.locator('[data-editare="vedere-3d"]');
const panza3d = (page: Page) => page.getByTestId('panza-3d');
const taierea = (page: Page) => page.getByTestId('prop-taierea');

/** Dreptunghiul de 30 × 20 din (20, 20): „Adaugă dreptunghi” (100 × 60), cu lățimea și înălțimea scrise în panou. */
async function dreptunghiMic(page: Page): Promise<void> {
  await adauga(page, 'dreptunghi');
  const forma = page.getByTestId('prop-forma');
  for (const [camp, v] of [['forma-latime', '30'], ['forma-inaltime', '20']] as const) {
    const c = forma.locator(`[data-camp="${camp}"]`);
    await c.fill(v);
    await c.press('Enter');
  }
}

/** Culoarea (RGB) pixelului de sub punctul (x, y, z) al lumii, în mm, după matricea ultimului cadru. */
async function culoareLa(page: Page, x: number, y: number, z: number): Promise<readonly [number, number, number]> {
  return page.evaluate(([x, y, z]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="panza-3d"]');
    if (!c?.dataset.pv) throw new Error('fără cadru');
    const m = c.dataset.pv.split(',').map(Number);
    const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, cy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
    const px = Math.floor(((cx / cw + 1) / 2) * c.width), py = Math.floor(((1 - cy / cw) / 2) * c.height);
    const d = document.createElement('canvas');
    d.width = c.width;
    d.height = c.height;
    const g = d.getContext('2d');
    if (!g) throw new Error('fără 2D');
    g.drawImage(c, 0, 0);
    const p = g.getImageData(px, py, 1, 1).data;
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0] as const;
  }, [x, y, z] as const);
}

const lumina = (c: readonly [number, number, number]): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

async function deschide(page: Page): Promise<void> {
  await buton(page).click();
  await expect(panza3d(page)).toHaveAttribute('data-stare', 'gata', { timeout: 30_000 });
  await expect(panza3d(page)).toHaveAttribute('data-cadre', /^[1-9]/);
}

test('dopul în 3D: „Foaia / Dopul 1”; dopul pe semifabricatul de 40 × 30 × 6, fața coborâtă la 5; înapoi la foaie', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await taierea(page).locator('[data-camp="rol"]').selectOption('incrustatie-drept');
  // Pe hârtie: dreptunghiul de 30 × 20 din (20, 20), cum îl spune și bara de jos.
  const forma = 'dreptunghi 30.00 × 20.00 la X 20.00, Y 20.00';
  await expect(page.getByTestId('selectie')).toHaveText(`Selectat: ${forma}`);
  await deschide(page);
  const p = panza3d(page), grup = page.getByTestId('alegere-3d');
  await expect(p).toHaveAttribute('data-alegere', 'foaie');
  await expect(p).toHaveAttribute('data-relief', '1200x800');
  // Lângă dopuri, comutatorul secțiunii (ADR 0179 §1), oprit pe foaie.
  await expect(grup.locator('button')).toHaveText(['Foaia', 'Dopul 1', 'Împreună (secțiunea)']);
  await expect(grup.locator('[data-3d-alege="foaie"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(grup.locator('[data-3d-alege="dop-1"]')).toHaveAttribute('title', `Incrustația: ${forma}. Semifabricatul dopului: 40 × 30 × 6 mm`);
  await expect(page.getByTestId('stare-3d-dopuri')).toHaveCount(0);

  await grup.locator('[data-3d-alege="dop-1"]').click();
  await expect(p).toHaveAttribute('data-alegere', 'dop-1');
  await expect(grup.locator('[data-3d-alege="dop-1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('stare-3d-text')).toHaveText(/^Dopul 1 simulat la [\d,]+ mm, pe semifabricatul de 40 × 30 × 6 mm$/, { timeout: 30_000 });
  await expect(p).toHaveAttribute('data-stare', 'gata');
  await expect(p).toHaveAttribute('data-adancime', '5');
  const celula = Number(await p.getAttribute('data-celula'));
  await expect(p).toHaveAttribute('data-relief', `${Math.round(40 / celula)}x${Math.round(30 / celula)}`);
  await expect(page.locator('[data-3d="incadreaza"]')).toHaveText('Încadrează dopul');
  await expect(p).toHaveAttribute('data-cadre', /^[1-9]/);
  // Camera încadrează semifabricatul: ținta e mijlocul lui.
  await expect(p).toHaveAttribute('data-tinta', '20,15');
  // Dopul ridicat, în picioare la mijlocul semifabricatului (fața lui la 0); în colț, fața coborâtă la 5 (mai închisă).
  const dop = await culoareLa(page, 20, 15, 0), fata = await culoareLa(page, 2, 2, -5);
  expect(lumina(dop) - lumina(fata), `dopul (${dop.join(' ')}) e mai luminos decât fața coborâtă (${fata.join(' ')})`).toBeGreaterThan(20);

  await grup.locator('[data-3d-alege="foaie"]').click();
  await expect(p).toHaveAttribute('data-alegere', 'foaie');
  await expect(page.getByTestId('stare-3d-text')).toHaveText('Placa simulată la 0,25 mm', { timeout: 30_000 });
  await expect(p).toHaveAttribute('data-relief', '1200x800');
  await expect(p).toHaveAttribute('data-adancime', '3');
  await expect(p).toHaveAttribute('data-tinta', '150,100');
});

test('fără incrustații, vederea 3D n-are butoanele dopurilor', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await deschide(page);
  await expect(page.getByTestId('alegere-3d')).toHaveCount(0);
  await expect(page.getByTestId('stare-3d-dopuri')).toHaveCount(0);
  await expect(panza3d(page)).toHaveAttribute('data-alegere', 'foaie');
});

/** Scrie o valoare într-un câmp al secțiunii Tăierea și o aplică (Enter). */
async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  const c = taierea(page).locator(`[data-camp="${camp}"]`);
  await c.fill(valoare);
  await c.press('Enter');
}

/**
 * „Împreună (secțiunea)” (ADR 0179, felia 12.1↑e-2), pe cercul R15 din (70, 50) cu incrustația în V (V60 Ø6, adâncimea 3,
 * fierăstrăul 2; pe hârtie, ca `incrustatie.spec.ts`: S = 2,5, g = 0,5, H = 2). Comutatorul e oprit pe foaie și pornit pe
 * „Dopul 1”; apăsat, arată secțiunea prin mijlocul cercului și tabelul, cu hârtia lângă simulare și niciun rând roșu.
 * „Foaia” îl oprește și ascunde secțiunea.
 */
test('„Împreună (secțiunea)”: dopul în V întors în locaș, hârtia lângă simulare, secțiunea prin mijloc', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await taierea(page).locator('[data-camp="rol"]').selectOption('incrustatie');
  await scrie(page, 'adancime', '3');
  await scrie(page, 'inc-fierastrau', '2');
  await deschide(page);
  const grup = page.getByTestId('alegere-3d'), impreuna = page.locator('[data-3d="impreuna"]');
  await expect(impreuna).toBeDisabled();
  await expect(impreuna).toHaveAttribute('title', 'Alege întâi un dop: secțiunea îl arată întors în locașul lui');
  await grup.locator('[data-3d-alege="dop-1"]').click();
  await expect(panza3d(page)).toHaveAttribute('data-alegere', 'dop-1');
  await expect(impreuna).toBeEnabled();
  await expect(impreuna).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('sectiune-3d')).toHaveCount(0);

  await impreuna.click();
  await expect(impreuna).toHaveAttribute('aria-pressed', 'true');
  const sectiune = page.getByTestId('sectiune-3d'), tabel = sectiune.getByTestId('sectiune-tabel');
  await expect(tabel).toBeVisible({ timeout: 30_000 });
  // Secțiunea pe orizontală, prin mijlocul cercului (y = 50, cât o celulă de 0,1 mm).
  await expect(sectiune.locator('h3')).toHaveText(/^Dopul 1, întors în locaș: secțiunea la Y 50\.\d\d mm$/);
  const rand = (r: string) => tabel.locator(`tr[data-rand="${r}"] td`);
  await expect(rand('intra')).toHaveText(['2.50 mm', /^2\.(4[5-9]|5\d) mm$/]);
  await expect(rand('contact')).toHaveText(['100 % din bandă', /^(9[5-9]|100) %$/]);
  await expect(rand('sub')).toHaveText(['0.50 mm', /^0\.(4[5-9]|5[0-5]) mm$/]);
  await expect(rand('intre')).toHaveText(['2.00 mm', /^(1\.9[5-9]|2\.0[0-5]) mm$/]);
  await expect(tabel.locator('tr.diferit')).toHaveCount(0);
  const svg = sectiune.getByTestId('sectiune-svg');
  for (const strat of ['placa', 'dop', 'fierastrau']) await expect(svg.locator(`[data-strat="${strat}"]`)).toHaveCount(1);
  await expect(svg.locator('[data-strat="contact"]')).not.toHaveCount(0);
  await expect(svg.locator('[data-strat="marcaj"]')).toHaveCount(0);

  await grup.locator('[data-3d-alege="foaie"]').click();
  await expect(page.getByTestId('sectiune-3d')).toHaveCount(0);
  await expect(impreuna).toHaveAttribute('aria-pressed', 'false');
  await expect(impreuna).toBeDisabled();
});

test('„Împreună (secțiunea)” rămâne oprită la dopul cu pereți drepți, cu motivul pe titlu (felia 12.1↑e-3)', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await taierea(page).locator('[data-camp="rol"]').selectOption('incrustatie-drept');
  await deschide(page);
  await page.getByTestId('alegere-3d').locator('[data-3d-alege="dop-1"]').click();
  await expect(panza3d(page)).toHaveAttribute('data-alegere', 'dop-1');
  const impreuna = page.locator('[data-3d="impreuna"]');
  await expect(impreuna).toBeDisabled();
  await expect(impreuna).toHaveAttribute('title', 'Secțiunea cu dopul în locaș e doar la incrustația în V, deocamdată');
});
