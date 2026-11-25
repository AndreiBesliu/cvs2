/**
 * Felia 28.8↑i (ADR 0291 §1, constatarea 4 a auditului ferestrei exportului): viteza pe un proiect mare. Auditul a măsurat, pe
 * 150 de piese, deschiderea în 7,6–8,8 s, 37 487 de noduri în fereastră și 90–112 ms la fiecare tastă, fiindcă toate fișele stau
 * randate una sub alta. Proba: 150 de piese, fiecare cu profilul ei, pe o grilă de 16 mm.
 * - Fereastra se deschide sub 1 s, cu puține noduri: doar fișele văzute și vecinele lor sunt randate.
 * - O tastă într-un câmp ține sub 30 ms (mediana, pe runner).
 * - Restul fișelor se pot ajunge: derulate până jos, din listă, cu „Du-mă la …”, fiecare cu câmpurile ei.
 * Până la pragul fișelor (12), toate rămân randate, cum erau; peste el, doar cele din jurul panoului: o probă le numără.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'ro-RO', viewport: { width: 1280, height: 720 } });

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * Un proiect cu `n` piese de 10 × 10, fiecare cu profilul ei, pe o grilă de 16 mm. Piesa `rea` e un cerc de Ø14 găurit cu Ø3:
 * prea mare pentru freză, deci greșeala fișei ei stă lângă diametrul frezei (28.8↑h).
 */
function proiect(n: number, rea?: number): Record<string, unknown> {
  const piese = Array.from({ length: n }, (_, k) => ({
    id: `p${k}`,
    radacina: {
      tip: 'element', id: `r${k}`, matrice: I,
      forma: k === rea ? { tip: 'cerc', raza: 7 } : { tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 },
    },
    operatii: [{
      id: 'o', tip: k === rea ? 'gaurire' : 'profil', noduri: [`r${k}`], scula: { numar: 1, nume: 'freza plata', diametru: 3 },
      latura: k === rea ? 'interior' : 'exterior', sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
      ...(k === rea ? { retragereCompleta: 1 } : {}),
    }],
  }));
  const pe = Math.ceil(Math.sqrt(n));
  return {
    schema: 28, rev: 1, piese,
    foi: [{
      id: 'f1', stoc: { latime: 20 + pe * 16, inaltime: 20 + pe * 16, grosime: 18 },
      instante: piese.map((p, k) => ({ id: `i${k}`, piesa: p.id, x: 10 + (k % pe) * 16, y: 10 + Math.floor(k / pe) * 16, rotire: 0 })),
    }],
  };
}

async function deschideCu(page: Page, doc: Record<string, unknown>): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('lista-vectori')).toBeVisible();
  await page.evaluate(async (d) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    await new Promise<void>((ok, eroare) => {
      const tx = db.transaction('versiuni', 'readwrite');
      tx.objectStore('versiuni').put(JSON.stringify(d), ['proiect', 1]);
      tx.oncomplete = () => { ok(); };
      tx.onerror = () => { eroare(tx.error); };
    });
    db.close();
  }, doc);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(doc['piese'] instanceof Array ? doc['piese'].length : 0);
}

/** Fișele randate întreg (cu grupurile lor), nu doar locul lor. */
const randate = (page: Page) => page.locator('[data-fisa="op"]:has([data-grup])');
const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

/** Mediana timpului unei taste într-un câmp: evenimentul, randarea și așezarea, până la următoarea sarcină. */
async function tasta(page: Page, cheie: string, camp: string): Promise<number> {
  return page.locator(`[data-fisa="op"][data-operatie="${cheie}"] [data-camp="${camp}"]`).evaluate(async (el) => {
    const input = el as HTMLInputElement;
    const pune = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const urmatoarea = (): Promise<void> => new Promise((ok) => { const c = new MessageChannel(); c.port1.onmessage = () => { ok(); }; c.port2.postMessage(0); });
    const d: number[] = [];
    for (let k = 0; k < 11; k++) {
      await urmatoarea();
      const t0 = performance.now();
      pune?.call(input, k % 2 === 0 ? '6.5' : '6');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      void document.body.offsetHeight;
      await urmatoarea();
      d.push(performance.now() - t0);
    }
    d.sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)] ?? Infinity;
  });
}

test('150 de operații: fereastra se deschide sub 1 s, cu doar fișele văzute randate, iar o tastă ține sub 30 ms', async ({ page }) => {
  await deschideCu(page, proiect(150));
  const t0 = Date.now();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav-op]')).toHaveCount(150);
  await expect(fisa(page, 'p0/o').locator('[data-camp="adancime"]')).toBeVisible();
  const deschidere = Date.now() - t0;
  // Toate fișele au locul lor (lista și derularea le găsesc), dar doar câteva sunt randate.
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(150);
  const nRandate = await randate(page).count();
  expect(nRandate, 'fișele randate la deschidere').toBeLessThanOrEqual(6);
  const noduri = await page.locator('.dialog-export').evaluate((e) => e.querySelectorAll('*').length);
  expect(noduri, 'nodurile ferestrei').toBeLessThan(6000);
  const ms = await tasta(page, 'p0/o', 'adancime');
  expect(ms, 'o tastă (mediana)').toBeLessThan(30);
  expect(deschidere, 'deschiderea').toBeLessThan(1000);
});

test('150 de operații: derulată până jos, din listă și cu „Du-mă la …”, fiecare fișă vine cu câmpurile ei, fără să le randeze pe toate', async ({ page }) => {
  await deschideCu(page, proiect(150, 120));
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav-op]')).toHaveCount(150);
  const chei = await page.locator('[data-nav-op]').evaluateAll((els) => els.map((e) => e.getAttribute('data-nav-op') ?? ''));
  const [ultima, mijloc, sus] = [chei[149] ?? '', chei[75] ?? '', chei[5] ?? ''];
  const panou = page.locator('[data-fise]');
  // Derulată până jos: ultima fișă e randată, cu câmpurile ei.
  await panou.evaluate((p) => { p.scrollTop = p.scrollHeight; });
  await expect(fisa(page, ultima).locator('[data-camp="adancime"]')).toBeVisible();
  expect(await randate(page).count()).toBeLessThanOrEqual(8);
  // Din listă, o fișă din mijloc: vine sus, cu câmpurile ei, iar rândul ei e cel curent.
  await page.locator(`[data-nav="${mijloc}"]`).click();
  await expect(fisa(page, mijloc).locator('h3')).toBeInViewport();
  await expect(fisa(page, mijloc).locator('[data-camp="adancime"]')).toBeVisible();
  await expect(page.locator(`[data-nav="${mijloc}"]`)).toHaveAttribute('aria-current', 'true');
  expect(await randate(page).count()).toBeLessThanOrEqual(8);
  // Ce s-a scris în ea rămâne după ce fișa iese din vedere și se întoarce.
  await fisa(page, mijloc).locator('[data-camp="adancime"]').fill('7');
  // Cu focusul în ea, fișa rămâne randată și când omul derulează departe: focusul nu se pierde.
  await panou.evaluate((p) => { p.scrollTop = p.scrollHeight; });
  await expect(fisa(page, ultima).locator('[data-camp="adancime"]')).toBeVisible();
  await expect(fisa(page, mijloc).locator('[data-camp="adancime"]')).toBeFocused();
  // Cu focusul plecat din panou (pe listă), fișa departe își ține doar locul.
  await page.locator(`[data-nav="${sus}"]`).click();
  await expect(fisa(page, sus).locator('h3')).toBeInViewport();
  await expect(fisa(page, mijloc).locator('[data-grup]')).toHaveCount(0);
  await page.locator(`[data-nav="${mijloc}"]`).click();
  await expect(fisa(page, mijloc).locator('[data-camp="adancime"]')).toHaveValue('7');
  // „Du-mă la …” la greșeala fișei 120 (cercul prea mare pentru freză), de departe: greșeala vine în vedere și focusul pe diametru.
  await page.locator(`[data-nav="${chei[0] ?? ''}"]`).click();
  await page.locator('[data-du="p120/o"]').click();
  const camp = fisa(page, 'p120/o').locator('[data-camp="diametru"]');
  await expect(camp).toBeFocused();
  await expect(camp).toBeInViewport();
});

test('până la prag (12 operații), toate fișele rămân randate, ca înainte; peste el, doar cele din jurul panoului', async ({ page }) => {
  await deschideCu(page, proiect(12));
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav-op]')).toHaveCount(12);
  await expect(randate(page)).toHaveCount(12);
  await deschideCu(page, proiect(13));
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav-op]')).toHaveCount(13);
  await expect(fisa(page, 'p0/o').locator('[data-camp="adancime"]')).toBeVisible();
  expect(await randate(page).count()).toBeLessThan(13);
});

test('la 1280 × 2400, fișele randate sunt exact cele care ating panoul sau stau la cel mult o înălțime de panou de el, plus vecinele celei curente', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 2400 });
  await deschideCu(page, proiect(150));
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav-op]')).toHaveCount(150);
  const chei = await page.locator('[data-nav-op]').evaluateAll((els) => els.map((e) => e.getAttribute('data-nav-op') ?? ''));
  await page.locator(`[data-nav="${chei[60] ?? ''}"]`).click();
  await expect(page.locator(`[data-nav="${chei[60] ?? ''}"]`)).toHaveAttribute('aria-current', 'true');
  /** Randatele și cele cerute de regulă, din dreptunghiurile de acum (fișele au înălțimea lor, locurile pe a lor). */
  const verdict = () => page.evaluate((c) => {
    const p = document.querySelector('[data-fise]')?.getBoundingClientRect();
    if (!p) return 'fără panou';
    const curent = c.findIndex((k) => document.querySelector(`[data-nav="${k}"]`)?.getAttribute('aria-current') === 'true');
    const fise = [...document.querySelectorAll<HTMLElement>('[data-fisa="op"]')];
    const randate = fise.filter((f) => !f.hasAttribute('data-gol')).map((f) => f.dataset['operatie'] ?? '');
    const cerute = fise.filter((f) => {
      const b = f.getBoundingClientRect(), loc = c.indexOf(f.dataset['operatie'] ?? '');
      return (b.bottom >= p.top - p.height && b.top <= p.bottom + p.height) || Math.abs(loc - curent) <= 1;
    }).map((f) => f.dataset['operatie'] ?? '');
    return `randate ${randate.join(' ')} | cerute ${cerute.join(' ')}`;
  }, chei);
  await expect.poll(async () => { const v = await verdict(); const [a, b] = v.split(' | cerute '); return a === `randate ${b ?? ''}` ? 'la fel' : v; }).toBe('la fel');
  // Marginea ajunge dincolo de vecine: e o fișă randată care nu e vecina celei curente.
  const randate = await page.locator('[data-fisa="op"]:not([data-gol])').evaluateAll((els) => els.map((e) => e.getAttribute('data-operatie') ?? ''));
  expect(randate.some((k) => Math.abs(chei.indexOf(k) - 60) > 1), randate.join(' ')).toBe(true);
});
