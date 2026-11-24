/**
 * Fereastra exportului pe listă și fișă (ADR 0290, felia 28.8↑a): nimic nu iese din fereastră la 1280 și la 1024 px (azi,
 * tabelul are 1 270 px într-o cutie de 894); în stânga, foaia, mașina și operațiile în ordinea tăierii, iar un clic aduce fișa
 * aleasă sus; explicația câmpului activ stă la vedere în grupul lui; o valoare greșită se spune în grupul câmpului de reparat,
 * cu punctul roșu în listă și „du-mă acolo” lângă Exportă; după export, Rezultatul e în listă.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

/** Dreptunghiul (e1/e1) și cercul din el (e2/e2), apoi fereastra exportului. */
async function deschide(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
}

/** Cât iese conținutul peste cutia lui, în px (0 = nimic). */
const iese = (page: Page, sel: string): Promise<number> => page.locator(sel).first().evaluate((e) => e.scrollWidth - e.clientWidth);

for (const [latime, inaltime] of [[1280, 800], [1024, 768]] as const) {
  test(`la ${latime} px nimic nu iese din fereastră, nici cu urechile, rampa, V-carve-ul și treapta incrustației`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: inaltime });
    await deschide(page);
    const e1 = fisa(page, 'e1/e1');
    await e1.locator('[data-camp="urechi"]').check();
    await e1.locator('[data-camp="rampa"]').check();
    await e1.locator('[data-camp="intrari"]').check();
    const e2 = fisa(page, 'e2/e2');
    await e2.locator('input[data-camp="latura"][value="incrustatie-drept"]').check();
    await alege(e2, 'inc-treapta', 'interior');
    await expect(e2.locator('[data-camp="inc-treapta-latime"]')).toBeVisible();
    for (const sel of ['.dialog-cutie', '[data-fise]', '[data-lista]']) expect(await iese(page, sel), sel).toBeLessThanOrEqual(0);
    await e1.locator('input[data-camp="latura"][value="vcarve"]').check();
    await e1.locator('[data-camp="forma-scula"]').selectOption('v');
    for (const sel of ['.dialog-cutie', '[data-fise]']) expect(await iese(page, sel), sel).toBeLessThanOrEqual(0);
    // Niciun câmp al fișelor nu iese din fișa lui.
    const late = await page.locator('[data-fisa]').evaluateAll((s) => s.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.getAttribute('data-fisa')));
    expect(late).toEqual([]);
  });
}

test('lista: foaia, mașina, apoi operațiile în ordinea tăierii; clicul aduce fișa aleasă sus', async ({ page }) => {
  await deschide(page);
  const lista = page.locator('[data-lista] [data-nav]');
  // Interiorul (cercul) se taie înaintea exteriorului (ordinea automată, ADR 0133).
  await expect(lista).toHaveCount(4);
  expect(await lista.evaluateAll((b) => b.map((x) => x.getAttribute('data-nav')))).toEqual(['foaia', 'masina', 'e2/e2', 'e1/e1']);
  // Fiecare fișă își spune locul în ordinea tăierii (din 28.8↑f-3, fișa e o componentă a ei, cu totalul din context).
  await expect(fisa(page, 'e2/e2').locator('.dx-loc')).toHaveText('locul 1 din 2 în ordinea tăierii');
  await expect(fisa(page, 'e1/e1').locator('.dx-loc')).toHaveText('locul 2 din 2 în ordinea tăierii');
  await page.locator('[data-nav="e1/e1"]').click();
  await expect(page.locator('[data-nav="e1/e1"]')).toHaveAttribute('aria-current', 'true');
  await expect.poll(async () => {
    const [p, f] = await Promise.all([page.locator('[data-fise]').boundingBox(), fisa(page, 'e1/e1').boundingBox()]);
    return p && f ? Math.abs(f.y - p.y) : 999;
  }).toBeLessThan(24);
  // Derulat de mână, panoul marchează în listă fișa ajunsă sus.
  await page.locator('[data-fise]').evaluate((p) => {
    const f = p.querySelector<HTMLElement>('[data-fisa="op"][data-operatie="e2/e2"]');
    if (f) p.scrollTop += f.getBoundingClientRect().top - p.getBoundingClientRect().top;
  });
  await expect(page.locator('[data-nav="e2/e2"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-nav="e1/e1"]')).toHaveAttribute('aria-current', 'false');
  // Fișa foii are colțul, Z0 și supracursa; a mașinii, postul și unitățile.
  await page.locator('[data-nav="foaia"]').click();
  for (const c of ['origine', 'z0', 'supracursa']) await expect(page.locator(`[data-fisa="foaia"] [data-camp="${c}"]`)).toBeVisible();
  await expect(page.locator('[data-fisa="masina"] [data-camp="post"]')).toBeVisible();
  await expect(page.locator('[data-fisa="masina"] [data-alegere="unitati"]')).toBeVisible();
});

test('explicația câmpului activ stă la vedere în grupul lui; sub pas, trecerile', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="rampa"]').check();
  const rampa = e1.locator('[data-grup="rampa"]');
  await rampa.locator('[data-camp="rampa-lungime"]').focus();
  await expect(rampa.locator('[data-explicatie]')).toContainText('Distanța în plan pe care coboară o trecere');
  // Trecerile ies egale: 10 mm cu pasul 4 = 3 treceri de 3,33 mm (adancimiTreceri).
  await e1.locator('[data-camp="adancime"]').fill('10');
  await e1.locator('[data-camp="pas"]').fill('4');
  await expect(e1.locator('[data-grup="adancime"] [data-treceri]')).toHaveText('3 treceri de 3,33 mm');
});

test('valoarea greșită se spune în grupul câmpului, cu punctul în listă și „du-mă acolo” lângă Exportă', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  // Incrustația în V pornește cu freza plată (captura din 23.11): motivul stă la Freza.
  await e1.locator('input[data-camp="latura"][value="incrustatie"]').check();
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).toContainText('V-carve-ul cere o freză în V');
  await expect(page.locator('[data-nav="e1/e1"][data-gresit]')).toHaveCount(1);
  await expect(page.locator('[data-nav="e2/e2"][data-gresit]')).toHaveCount(0);
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await page.locator('[data-nav="foaia"]').click();
  await page.locator('[data-du="e1/e1"]').click();
  await expect(e1.locator('[data-grup="freza"]')).toBeInViewport();
  await e1.locator('[data-camp="forma-scula"]').selectOption('v');
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).not.toContainText('V-carve-ul cere');
  // Cercul taie tot cu T1, freza plată: același T cu două freze se spune la Freza ambelor fișe, cu punctul în listă.
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).toContainText('T1 are două freze');
  await expect(fisa(page, 'e2/e2').locator('[data-grup="freza"] [data-greseala]')).toContainText('T1 are două freze');
  await expect(page.locator('[data-nav="e2/e2"][data-gresit]')).toHaveCount(1);
  // T2 e freza dreaptă a fundului plat: V-ul ia T3.
  await e1.locator('[data-camp="scula"]').fill('3');
  await expect(page.locator('[data-greseala]')).toHaveCount(0);
  await expect(page.locator('[data-nav][data-gresit]')).toHaveCount(0);
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
});

test('după export, Rezultatul e în listă, cu fișierul', async ({ page }) => {
  await deschide(page);
  await expect(page.locator('[data-nav="rezultatul"]')).toHaveCount(0);
  const desc = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await desc;
  await expect(page.locator('[data-nav="rezultatul"]')).toBeVisible();
  await expect(page.locator('[data-fisa="rezultatul"] [data-testid="export-stare"]')).toContainText('Descărcat');
  await expect(page.locator('[data-nav="rezultatul"]')).toHaveAttribute('aria-current', 'true');
  // Omul se întoarce la foaie cât simularea încă se calculează: când sosește, panoul nu-l mai duce la Rezultat.
  await page.locator('[data-nav="foaia"]').click();
  await expect(page.locator('[data-simulare="volum"]')).toBeAttached();
  await expect(page.locator('[data-nav="foaia"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-fisa="foaia"]')).toBeInViewport();
});

test('Rezultatul pe grupuri: întâi ce e de văzut, apoi fișierele, timpul și simularea; în listă, timpul și avertismentele (28.8↑f-2)', async ({ page }) => {
  await deschide(page);
  const rez = page.locator('[data-fisa="rezultatul"]');
  const grupuri = (): Promise<Array<string | null>> => rez.locator('[data-rezultat]').evaluateAll((x) => x.map((e) => e.getAttribute('data-rezultat')));
  // Fără nimic de văzut: fișierele, timpul, simularea; fiecare cu titlul lui, sub titlul fișei.
  let desc = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await desc;
  await expect(rez.locator('[data-simulare="volum"]')).toBeAttached();
  expect(await grupuri()).toEqual(['fisiere', 'timp', 'simulare']);
  await expect(rez.locator('[data-rezultat="fisiere"] [data-testid="export-stare"]')).toContainText('Descărcat');
  await expect(rez.locator('[data-rezultat="timp"] [data-rezumat="timp"]')).toBeVisible();
  await expect(rez.locator('[data-rezultat="simulare"] [data-testid="export-simulare"]')).toBeVisible();
  await expect(rez.locator('h3')).toHaveCount(1);
  await expect(rez.locator('[data-rezultat] > h4, [data-rezultat] > section > h4')).toHaveCount(3);
  const timp = /: (.+)$/.exec(await rez.locator('[data-rezumat="timp"]').innerText())?.[1] ?? '?';
  const meta = page.locator('[data-nav="rezultatul"] .dx-meta');
  await expect(meta).toHaveText(timp);
  // Cu o intrare care nu încape (R30 pe gaura de R15): avertismentul vine primul, iar lista îl numără.
  await fisa(page, 'e2/e2').locator('[data-camp="intrari"]').check();
  await fisa(page, 'e2/e2').locator('[data-camp="intrari-raza"]').fill('30');
  desc = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await desc;
  await expect(rez.locator('[data-rezultat="avertismente"]')).toContainText('intrarea omisă');
  expect(await grupuri()).toEqual(['avertismente', 'fisiere', 'timp', 'simulare']);
  await expect(meta).toHaveText(`${(/: (.+)$/.exec(await rez.locator('[data-rezumat="timp"]').innerText())?.[1] ?? '?')} · 1 avertisment`);
  await expect(page.locator('[data-nav="rezultatul"]')).toHaveAttribute('data-avertisment', '');
  // Și pe dreptunghi (R200): două avertismente, numărate.
  await fisa(page, 'e1/e1').locator('[data-camp="intrari"]').check();
  await fisa(page, 'e1/e1').locator('[data-camp="intrari-raza"]').fill('200');
  desc = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await desc;
  await expect(rez.locator('[data-testid="export-avertismente"] li')).toHaveCount(2);
  await expect(meta).toContainText('2 avertismente');
});
