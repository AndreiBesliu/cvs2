import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Recenzia adversarială a feliilor 2.8c (panoul editabil) și 2.8d (traseul pe WebGL2), ADR 0038. Fiecare test arată o
 * constatare: pică pe codul de azi și trece când defectul e reparat. Sesiune independentă (2.8e), fără reparații în `src/`.
 */
test.use({ locale: 'ro-RO' });

async function panouDeschis(page: Page): Promise<void> {
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toHaveAttribute('data-deschis', 'true');
}
const camp = (page: Page, nume: string) => page.locator(`[data-camp="${nume}"]`);
const strat = (page: Page) => page.getByTestId('strat-traseu');
const cip = (page: Page) => page.getByTestId('traseu-stare');
const butonTraseu = (page: Page) => page.locator('[data-actiune="vedere.traseu"]');

/** Punctul (x, y) al foii, în mm, în coordonatele paginii (vederea pânzei din `data-*`). */
async function punctPagina(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(([x, y]) => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    if (!p) throw new Error('fără pânză');
    const r = p.getBoundingClientRect();
    const scara = Number(p.dataset.scara), tx = Number(p.dataset.tx), ty = Number(p.dataset.ty);
    return { x: r.left + x * scara + tx, y: r.top + ty - y * scara };
  }, [x, y] as const);
}

/** Selectează instanța din lista de vectori și citește colțul X din panou. */
async function coltX(page: Page, id: string): Promise<string> {
  await page.locator(`button[data-instanta="${id}"]`).click();
  return camp(page, 'pozitie-x').inputValue();
}

test('C1 panoul: X scris și „ieșirea din câmp” printr-un clic pe altă formă de pe pânză aplică valoarea formei de atunci (ADR 0038 §5)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi'); // e1: 100 × 60 din (20, 20)
  await adauga(page, 'cerc'); // e2: R15 în (70, 50), ales
  await panouDeschis(page);
  const x = camp(page, 'pozitie-x');
  await expect(x).toHaveValue('55');
  await x.fill('150');
  // Omul iese din câmp cu un clic pe dreptunghi, pe pânză (în el, dar în afara cercului).
  const p = await punctPagina(page, 30, 30);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('button[data-instanta="e1"]')).toHaveAttribute('aria-pressed', 'true');
  // Cercul trebuia mutat (valoarea scrisă pentru el), dreptunghiul nu.
  expect(await coltX(page, 'e1'), 'dreptunghiul nu e forma pentru care s-a scris 150').toBe('20');
  expect(await coltX(page, 'e2'), 'cercul: ieșirea din câmp aplică 150').toBe('150');
});

test('C2 traseul: după ce CAM-ul refuză, „Arată traseul” nu se mai poate opri, iar motivul vechi rămâne după ce documentul e reparat', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi'); // două în același loc: refuz
  await butonTraseu(page).click();
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.refuz');
  // Documentul se repară: al doilea dreptunghi pleacă la x = 150 (foaia are 300 mm).
  await panouDeschis(page);
  await camp(page, 'pozitie-x').fill('150');
  await camp(page, 'pozitie-x').press('Enter');
  await expect(camp(page, 'pozitie-x')).toHaveValue('150');
  // Motivul refuzului e al documentului de dinainte: nu mai e adevărat, deci nu se mai arată ca motiv de acum.
  await expect(cip(page), 'refuzul vechi e spus ca fiind al documentului de acum').not.toHaveAttribute('data-stare', 'traseu.refuz');
});

test('C2b traseul: cu refuzul pe ecran, butonul apăsat nu se mai poate dezapăsa (T doar recalculează același refuz)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi');
  await butonTraseu(page).click();
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.refuz');
  await expect(butonTraseu(page)).toHaveAttribute('aria-pressed', 'true');
  await butonTraseu(page).click();
  await expect(butonTraseu(page), 'al doilea clic pe un buton comutator apăsat îl oprește').toHaveAttribute('aria-pressed', 'false');
});

test('C3 traseul: contextul WebGL pierdut și nerefăcut; T după o schimbare șterge cipul și nu desenează nimic (eșec tăcut, ADR 0038 §3)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await butonTraseu(page).click();
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
  await page.evaluate(() => {
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    s?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.context');
  // Documentul se schimbă, omul cere traseul din nou; placa nu revine (restoreContext nu se cheamă).
  await adauga(page, 'cerc');
  await page.keyboard.press('t');
  await expect(butonTraseu(page)).toHaveAttribute('aria-pressed', 'true');
  // Ori stratul desenează traseul nou, ori un cip spune că nu se poate: nu amândouă lipsă. (Adaptat la integrare: după
  // reparație, T montează un strat nou, cu un context nou, deci traseul nou se desenează.)
  await page.waitForTimeout(1500);
  const stare = await page.evaluate(() => {
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    return { pierdut: s?.getContext('webgl2')?.isContextLost() ?? null, varfuri: Number(s?.dataset['varfuri'] ?? '0') };
  });
  const desenat = stare.pierdut === false && stare.varfuri > 0;
  expect(desenat || (await cip(page).count()) === 1, `nimic desenat (${JSON.stringify(stare)}) și niciun cip care s-o spună`).toBe(true);
});

/** O foaie de 2 440 × 1 220 cu 800 de cercuri importate (CAM-ul durează ~0,6 s în Edge pe mașina asta). */
async function documentMare(page: Page): Promise<void> {
  let c = '';
  for (let i = 0; i < 40; i++) for (let j = 0; j < 20; j++) c += `<circle cx="${20 + i * 25}" cy="${20 + j * 25}" r="8"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100mm" height="560mm" viewBox="0 0 1100 560">${c}</svg>`;
  await panouDeschis(page);
  await camp(page, 'foaie-latime').fill('2440');
  await camp(page, 'foaie-latime').press('Enter');
  await camp(page, 'foaie-inaltime').fill('1220');
  await camp(page, 'foaie-inaltime').press('Enter');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'mare.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await page.locator('[data-buton="importa"]').click();
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
}

test('C4 traseul: recalculat pe un document mare, cipul „Se calculează” nu apare, iar traseul vechi trebuie să rămână stins cât se calculează (ADR 0038 §2)', async ({ page }) => {
  await page.goto('/');
  await documentMare(page);
  await butonTraseu(page).click();
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/, { timeout: 20_000 });
  // Documentul se schimbă (tot importul, 30 mm la dreapta): traseul e vechi, stins.
  await camp(page, 'pozitie-x').fill('30');
  await camp(page, 'pozitie-x').press('Enter');
  await expect(strat(page)).toHaveAttribute('data-stins', 'true');
  await page.evaluate(() => {
    const w = window as unknown as { jurnal28: string[] };
    w.jurnal28 = [];
    const noteaza = (): void => {
      const s = document.querySelector('[data-testid="strat-traseu"]');
      const c = document.querySelector('[data-testid="traseu-stare"]');
      w.jurnal28.push(`${s?.getAttribute('data-stins') ?? '-'}|${c?.getAttribute('data-stare') ?? '-'}`);
    };
    new MutationObserver(noteaza).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-stins', 'data-stare'] });
  });
  await butonTraseu(page).click();
  await expect(strat(page)).toHaveAttribute('data-stins', 'false', { timeout: 20_000 });
  const jurnal = await page.evaluate(() => (window as unknown as { jurnal28: string[] }).jurnal28);
  // Cât CAM-ul ține firul principal, pe ecran trebuie să fie cipul „se calculează”, cu programul VECHI stins sub el.
  expect(jurnal, 'stările stratului|cipului până la traseul nou').toContain('true|traseu.calcul');
});

test('C7 traseul: după schimbarea temei, traseul rămâne în culorile temei vechi până la următorul pan / zoom', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await butonTraseu(page).click();
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
  /** Culoarea celui mai opac pixel al stratului lângă (70, 17) mm: latura de jos a ramei. */
  const culoare = (): Promise<string> => page.evaluate(() => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    if (!p || !s) return '';
    const scara = Number(p.dataset.scara), tx = Number(p.dataset.tx), ty = Number(p.dataset.ty), dpr = Number(p.dataset.dpr);
    const c = document.createElement('canvas');
    c.width = s.width;
    c.height = s.height;
    const g = c.getContext('2d');
    if (!g) return '';
    g.drawImage(s, 0, 0);
    const px = Math.floor((70 * scara + tx) * dpr), py = Math.floor((ty - 17 * scara) * dpr);
    const d = g.getImageData(px - 1, py - 1, 3, 3).data;
    let k = 0;
    for (let i = 0; i < d.length; i += 4) if ((d[i + 3] ?? 0) > (d[k + 3] ?? 0)) k = i;
    return `${d[k]},${d[k + 1]},${d[k + 2]}`;
  });
  await expect.poll(culoare).not.toBe('');
  const luminoasa = await culoare();
  const tema = page.locator('[data-actiune="vedere.tema"]');
  await tema.click(); // după sistem → luminoasă
  await tema.click(); // → întunecată
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'intunecata');
  await page.waitForTimeout(500);
  // --traseu-taiere: #0a7d53 → #3ccf91 (ADR 0038 §1: culoarea deosebește tăierile de rapide, deci urmează tema).
  expect({ inainte: luminoasa, dupa: await culoare() }).not.toEqual({ inainte: luminoasa, dupa: luminoasa });
});
