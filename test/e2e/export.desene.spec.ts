/**
 * Desenele întrebărilor din fereastra exportului (ADR 0290, felia 28.8↑b-1): colțul XY0, Z0 cu supracursa, freza, adâncimea cu
 * trecerile, sensul, rampa, intrările și urechile au fiecare desenul lui, lângă câmpuri, desenat din valorile omului. Cota
 * câmpului pe care stai se aprinde, colțul XY0 se alege și din desen, iar desenul spune ce face programul (trecerile egale, partea
 * piesei, urechile după regula lucrării). Din 28.8↑c, și buzunarul (traseul și coborârea pe cartonașe; trecerile laterale, coborârea
 * și frezele de rest desenate) și găurirea (ciocănirea pas cu pas).
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege, aleasa } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const desen = (page: Page, loc: string, grup: string) =>
  page.locator(`${loc === 'foaia' ? '[data-fisa="foaia"]' : `[data-fisa="op"][data-operatie="${loc}"]`} [data-grup="${grup}"] [data-desen] svg`);

/** Dreptunghiul (e1/e1, exterior) și cercul din el (e2/e2, interior), apoi fereastra exportului. */
async function deschide(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
}

test('fiecare întrebare a foii și a profilului are desenul ei, în ambele teme', async ({ page }) => {
  await deschide(page);
  await fisa(page, 'e1/e1').locator('[data-camp="rampa"]').check();
  await fisa(page, 'e1/e1').locator('[data-camp="intrari"]').check();
  await fisa(page, 'e1/e1').locator('[data-camp="urechi"]').check();
  for (const g of ['origine', 'z0']) await expect(desen(page, 'foaia', g), g).toBeVisible();
  for (const g of ['freza', 'adancime', 'sens', 'rampa', 'intrari', 'urechi']) await expect(desen(page, 'e1/e1', g), g).toBeVisible();
  // Desenul stă deasupra explicației, în stânga grupului; explicația rămâne la vedere.
  const g = fisa(page, 'e1/e1').locator('[data-grup="adancime"]');
  const [d, e] = await Promise.all([g.locator('[data-desen]').boundingBox(), g.locator('[data-explicatie]').boundingBox()]);
  expect(d && e && d.y + d.height <= e.y + 1).toBe(true);
  // Lemnul și masa se văd și pe tema întunecată (tokenurile desenelor au ambele teme).
  for (const tema of ['luminoasa', 'intunecata']) {
    await page.evaluate((x) => { document.documentElement.dataset['tema'] = x; }, tema);
    const lemn = await desen(page, 'e1/e1', 'adancime').locator('[data-lemn]').first().evaluate((x) => getComputedStyle(x).fill);
    const panou = await page.locator('.dialog-cutie').evaluate((x) => getComputedStyle(x).backgroundColor);
    expect(lemn, tema).not.toBe(panou);
    expect(lemn, tema).not.toBe('none');
  }
});

test('adâncimea: trecerile egale ale lucrării, iar cota câmpului activ se aprinde', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="adancime"]').fill('10');
  await e1.locator('[data-camp="pas"]').fill('4');
  const d = desen(page, 'e1/e1', 'adancime');
  // 10 cu pasul 4: trei treceri de 3,33 mm, nu două de 5 (adancimiTreceri).
  await expect(d.locator('[data-trecere]')).toHaveCount(3);
  await expect(d).toContainText('3 treceri egale de 3,33 mm');
  await expect(d.locator('[data-cota="adancime"]')).toContainText('10');
  // Focusul a rămas pe pas, după ce l-ai scris: cota lui e aprinsă, a adâncimii nu.
  await expect(d.locator('[data-cota="pas"]')).toHaveAttribute('data-aprinsa', '');
  await expect(d.locator('[data-cota="adancime"]')).not.toHaveAttribute('data-aprinsa', /.*/);
  await e1.locator('[data-camp="adancime"]').focus();
  await expect(d.locator('[data-cota="adancime"]')).toHaveAttribute('data-aprinsa', '');
  await expect(d.locator('[data-cota="pas"]')).not.toHaveAttribute('data-aprinsa', /.*/);
  // Sub maus, cota se aprinde și ea, dar explicația grupului rămâne (fișa nu se mută sub cursor).
  const g = e1.locator('[data-grup="adancime"]');
  const inainte = await g.locator('[data-explicatie]').textContent();
  await e1.locator('[data-camp="pas"]').hover();
  await expect(d.locator('[data-cota="pas"]')).toHaveAttribute('data-aprinsa', '');
  await expect(g.locator('[data-explicatie]')).toHaveText(inainte ?? '');
  // O valoare greșită nu desenează trecerile.
  await e1.locator('[data-camp="pas"]').fill('0');
  await expect(d.locator('[data-trecere]')).toHaveCount(0);
});

test('colțul XY0 se alege și din desen; Z0 și supracursa se văd pe secțiune', async ({ page }) => {
  await deschide(page);
  const xy = desen(page, 'foaia', 'origine');
  await expect(xy.locator('[data-colt][data-ales]')).toHaveAttribute('data-colt', 'stanga-jos');
  await xy.locator('[data-colt="dreapta-sus"]').click();
  await expect(page.locator('[data-camp="origine"]')).toHaveValue('dreapta-sus');
  await expect(xy.locator('[data-colt][data-ales]')).toHaveAttribute('data-colt', 'dreapta-sus');
  await page.locator('[data-camp="origine"]').selectOption('dreapta-jos');
  await expect(xy.locator('[data-colt][data-ales]')).toHaveAttribute('data-colt', 'dreapta-jos');
  const z = desen(page, 'foaia', 'z0');
  await expect(z).toHaveAttribute('data-z0', 'sus');
  await page.locator('[data-camp="z0"]').selectOption('jos');
  await expect(z).toHaveAttribute('data-z0', 'jos');
  await page.locator('[data-camp="supracursa"]').fill('1,5');
  await expect(z.locator('[data-cota="supracursa"]')).toContainText('1,5');
  await page.locator('[data-camp="supracursa"]').focus();
  await expect(z.locator('[data-cota="supracursa"]')).toHaveAttribute('data-aprinsa', '');
  await page.locator('[data-camp="supracursa"]').fill('0');
  await expect(z.locator('[data-cota="supracursa"]')).toHaveCount(0);
  await expect(z).toContainText('exact prin placă');
});

test('sensul: partea piesei după tăietură și sens; freza, rampa și intrările cu valorile lor', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  // Cu M3, la urcare piesa stă în dreapta mersului: exteriorul merge orar, gaura trigonometric (ADR 0027).
  await expect(desen(page, 'e1/e1', 'sens')).toHaveAttribute('data-orar', 'true');
  await expect(desen(page, 'e2/e2', 'sens')).toHaveAttribute('data-orar', 'false');
  await e1.locator('[data-camp="sens"]').selectOption('opozitie');
  await expect(desen(page, 'e1/e1', 'sens')).toHaveAttribute('data-orar', 'false');
  await expect(desen(page, 'e1/e1', 'sens')).toContainText('stânga');
  await e1.locator('[data-camp="diametru"]').fill('6');
  await expect(desen(page, 'e1/e1', 'freza').locator('[data-cota="diametru"]')).toContainText('Ø 6 mm');
  await e1.locator('[data-camp="forma-scula"]').selectOption('v');
  await expect(desen(page, 'e1/e1', 'freza').locator('[data-cota="unghi-v"]')).toContainText('°');
  await e1.locator('[data-camp="forma-scula"]').selectOption('plata');
  await e1.locator('[data-camp="rampa"]').check();
  await e1.locator('[data-camp="rampa-lungime"]').fill('12');
  await expect(desen(page, 'e1/e1', 'rampa').locator('[data-cota="rampa-lungime"]')).toContainText('12 mm');
  await e1.locator('[data-camp="rampa"]').uncheck();
  await expect(desen(page, 'e1/e1', 'rampa').locator('[data-cota="rampa-lungime"]')).toHaveCount(0);
  await e1.locator('[data-camp="intrari"]').check();
  await e1.locator('[data-camp="intrari-raza"]').fill('2');
  await expect(desen(page, 'e1/e1', 'intrari').locator('[data-cota="intrari-raza"]')).toContainText('R 2');
  void e2;
});

test('urechile: câte și unde, după regula aleasă', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  const u = desen(page, 'e1/e1', 'urechi');
  await expect(u.locator('[data-ureche]')).toHaveCount(0);
  await e1.locator('[data-camp="urechi"]').check();
  await e1.locator('[data-camp="urechi-numar"]').fill('3');
  await expect(u.locator('[data-ureche]')).toHaveCount(3);
  await e1.locator('[data-camp="urechi-lungi"]').check();
  await e1.locator('[data-camp="urechi-numar"]').fill('4');
  await expect(u.locator('[data-ureche]')).toHaveCount(4);
  // Pe laturile lungi (sus și jos): toate urechile stau pe laturi orizontale.
  expect(await u.locator('[data-ureche]').evaluateAll((x) => x.map((e) => e.getAttribute('data-latura')))).toEqual(['o', 'o', 'o', 'o']);
  await e1.locator('[data-camp="urechi-mijloc"]').check();
  await expect(u.locator('[data-ureche]')).toHaveCount(4);
  await e1.locator('[data-camp="urechi-latime"]').focus();
  await expect(u.locator('[data-cota="urechi-latime"]')).toHaveAttribute('data-aprinsa', '');
  await e1.locator('[data-camp="urechi"]').uncheck();
  await expect(u.locator('[data-ureche]')).toHaveCount(0);
});

test('explicația își ține locul: focusul și mausul nu mută fișa (clicul nu fuge de sub cursor)', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="rampa"]').check();
  await e1.locator('[data-camp="intrari"]').check();
  const tinta = e1.locator('[data-camp="urechi"]');
  // Locul bifei în conținutul panoului (focusul poate derula panoul ca să aducă un câmp în vedere: asta nu e o mutare).
  const y = (): Promise<number> => tinta.evaluate((e) => {
    const p = e.closest<HTMLElement>('[data-fise]');
    return p ? e.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop : Number.NaN;
  });
  const inainte = await y();
  // Textele cele mai lungi ale grupurilor de deasupra (rampa, intrările, sensul): caseta lor are deja înălțimea lor.
  for (const c of ['rampa-lungime', 'rampa', 'intrari-raza', 'intrari', 'sens', 'diametru']) {
    await e1.locator(`[data-camp="${c}"]`).focus();
    expect(await y(), c).toBe(inainte);
    await e1.locator(`[data-camp="${c}"]`).hover();
    expect(await y(), `${c} sub maus`).toBe(inainte);
  }
  await tinta.check();
  await expect(tinta).toBeChecked();
});

/** O formă (dreptunghiul sau cercul, e1/e1), apoi fereastra exportului. */
async function deschideCu(page: Page, forma: 'dreptunghi' | 'cerc'): Promise<void> {
  await page.goto('/');
  await adauga(page, forma);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
}

test('buzunarul: traseul și coborârea pe cartonașe; trecerile laterale, coborârea și frezele de rest desenate din valori', async ({ page }) => {
  await deschideCu(page, 'dreptunghi');
  const e1 = fisa(page, 'e1/e1');
  await alege(e1, 'latura', 'buzunar');
  await e1.locator('[data-camp="adancime"]').fill('10');
  await e1.locator('[data-camp="pas"]').fill('6');
  // Traseul: inelele implicit; fiecare variantă cu poza ei.
  await expect(aleasa(e1, 'strategie')).toHaveValue('inele');
  await expect(e1.locator('[data-alegere="strategie"] .dx-poza')).toHaveCount(2);
  // Ø6 cu pasul lateral 2,4 (40 %): trei urme, două vecine se suprapun 3,6 mm (60 %).
  const g = desen(page, 'e1/e1', 'golire');
  await expect(g.locator('[data-trecere-laterala]')).toHaveCount(3);
  await expect(g).toHaveAttribute('data-paralel', 'false');
  await expect(g.locator('[data-cota="pas-lateral"]')).toContainText('2,4');
  await expect(g).toContainText('se suprapun 3,6 mm (60 %)');
  const pasLateral = e1.locator('[data-camp="pas-lateral"]');
  await pasLateral.fill('3');
  await expect(g).toContainText('se suprapun 3 mm (50 %)');
  await expect(g.locator('[data-cota="pas-lateral"]')).toHaveAttribute('data-aprinsa', '');
  // Peste jumătate din freză (cum judecă fereastra), fără urme.
  await pasLateral.fill('3,5');
  await expect(g.locator('[data-trecere-laterala]')).toHaveCount(0);
  await expect(g).toContainText('cel mult jumătate din freză');
  await pasLateral.fill('2,4');
  // Liniile paralele: aceleași urme, rotite la unghi; coborârea nu mai e (liniile coboară prin plonjare).
  await alege(e1, 'strategie', 'paralel');
  await expect(g).toHaveAttribute('data-paralel', 'true');
  await expect(g.locator('[data-trecere-laterala]')).toHaveCount(3);
  await e1.locator('[data-camp="unghi-paralel"]').fill('30');
  await expect(g.locator('[data-cota="unghi-paralel"]')).toContainText('30°');
  // Drumul unei treceri e înclinat cât unghiul liniilor: cutia lui are înălțimea / lățimea = tan 30°.
  const panta = await g.locator('[data-linie-laterala]').first().evaluate((e) => {
    const b = e.getBoundingClientRect();
    return (Math.atan2(b.height, b.width) * 180) / Math.PI;
  });
  expect(Math.abs(panta - 30)).toBeLessThan(2);
  await expect(e1.locator('[data-grup="coborare"]')).toHaveCount(0);
  await alege(e1, 'strategie', 'inele');

  // Coborârea: plonjarea implicit, cu poza fiecărui fel.
  const cob = desen(page, 'e1/e1', 'coborare');
  await expect(aleasa(e1, 'coborare')).toHaveValue('plonjare');
  await expect(e1.locator('[data-alegere="coborare"] .dx-poza')).toHaveCount(4);
  await expect(cob).toHaveAttribute('data-coborare', 'plonjare');
  // 10 cu pasul 6 = două treceri de 5: la 3° și 20 mm, ⌈5 / (20 · tan 3°)⌉ = 5 rampe (nu 6, cât ar da pasul scris).
  await alege(e1, 'coborare', 'zigzag');
  await expect(cob).toHaveAttribute('data-coborare', 'zigzag');
  await expect(cob.locator('[data-rampa]')).toHaveCount(5);
  await expect(cob).toContainText('5 rampe de 20 mm');
  await expect(e1.locator('[data-camp="rampe-zigzag"]')).toHaveText('5 rampe pe trecere');
  await expect(cob.locator('[data-cota="lungime-zigzag"]')).toContainText('20 mm');
  await e1.locator('[data-camp="unghi-coborare"]').focus();
  await expect(cob.locator('[data-cota="unghi-coborare"]')).toHaveAttribute('data-aprinsa', '');
  // Rampa: 5 / tan 3° = 95,4 mm; elicea de R 3: 95,4 / (2π · 3) = 5,1 ture.
  await alege(e1, 'coborare', 'rampa');
  await expect(cob).toContainText('rampa de 95,4 mm');
  await alege(e1, 'coborare', 'elice');
  await expect(cob.locator('[data-elice]')).toHaveCount(1);
  await expect(cob.locator('[data-cota="raza-elice"]')).toContainText('R 3');
  await expect(cob).toContainText('5,1 ture pe R 3');
  // Un unghi peste 45° (refuzat de fereastră): desenul nu inventează o coborâre.
  await e1.locator('[data-camp="unghi-coborare"]').fill('60');
  await expect(cob).toHaveAttribute('data-coborare', 'lipsa');

  // Frezele de rest: fără ele, în colț rămâne raza frezei; cu Ø3 adăugată, raza ei.
  const rest = desen(page, 'e1/e1', 'rest');
  await expect(rest).toContainText('în colț rămâne raza frezei, R 3');
  await e1.locator('[data-camp="rest-adauga"]').click();
  await expect(rest).toContainText('Ø6 lasă R 3 în colț; Ø3, doar R 1,5');
  await expect(rest.locator('[data-ramas]')).toHaveCount(1);
});

test('găurirea: ciocănirea pas cu pas, ca lucrarea: coborârile, ridicarea de 1 mm, ieșirea la al N-lea pas', async ({ page }) => {
  await deschideCu(page, 'cerc');
  const e1 = fisa(page, 'e1/e1');
  await alege(e1, 'latura', 'gaurire');
  await e1.locator('[data-camp="adancime"]').fill('10');
  await e1.locator('[data-camp="pas"]').fill('4');
  await e1.locator('[data-camp="retragere"]').fill('2');
  const d = desen(page, 'e1/e1', 'gaurire');
  // 10 cu pasul 4: trei pași de 3,33; după primul se ridică 1 mm, după al doilea iese din gaură.
  await expect(d.locator('[data-coboara]')).toHaveCount(3);
  await expect(d.locator('[data-iese]')).toHaveCount(1);
  await expect(d).toContainText('3 pași de 3,33 mm; se ridică 1 mm');
  await expect(d.locator('[data-cota="retragere"]')).toContainText('o dată la 2 pași');
  // Clicul în câmp îl aprinde (mausul rămas pe cartonașul tăieturii ar aprinde, după derulare, câmpul de sub el).
  await e1.locator('[data-camp="retragere"]').click();
  await expect(d.locator('[data-cota="retragere"]')).toHaveAttribute('data-aprinsa', '');
  await e1.locator('[data-camp="retragere"]').fill('1');
  await expect(d.locator('[data-iese]')).toHaveCount(2);
  await expect(d.locator('[data-cota="retragere"]')).toContainText('după fiecare pas');
  await e1.locator('[data-camp="retragere"]').fill('0');
  await expect(d.locator('[data-coboara]')).toHaveCount(0);
  await expect(d).toContainText('scrie adâncimea, pasul și ieșirea');
});
