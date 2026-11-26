/**
 * Greșelile ferestrei exportului pe înțeles (ADR 0291, felia 28.8↑j; constatările 5, 6, 7 și 15 ale auditului):
 * - un T cu două freze are lângă greșeală „Dă-i T{n}”, cu numărul după regula rolurilor, iar roșu sunt doar frezele cu numărul
 *   ciocnit (azi, și freza fundului plat, deși stă pe alt T);
 * - o valoare greșită își spune câmpul și marginile lui, iar roșu e doar câmpul ei (azi, o frază generală, aceeași la orice
 *   câmp); în listă, un număr lipsă e „—” (azi, „· mm”);
 * - avansul peste viteza maximă: cu setările GRBL din fabrică, o notă (azi, avertismentul, la orice program); față de `$$`-ul
 *   lipit, avertismentul;
 * - un refuz al calculului vorbește cu numele elementelor, nu cu id-urile din lume, cu numerele scrise cu virgula, și are
 *   „Du-mă la …” la operația primului element numit.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/** `$$` al unei mașini lente: F1000 trece de $110 = 400. */
const LENT = '$110=400.000\n$111=400.000\n$112=300.000\n$120=50.000\n$121=50.000\n$122=50.000\nok\n';

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

test('un T cu două freze: „Dă-i T3” lângă greșeală, pe ambele fișe; roșu doar pe frezele cu T1; un clic o repară', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  // Incrustația în V pe dreptunghi, cu freza în V pe T1 și fundul plat pe T2 (Ø3,175); cercul taie tot cu T1, freza plată Ø6.
  await e1.locator('input[data-camp="latura"][value="incrustatie"]').check();
  await e1.locator('[data-camp="forma-scula"]').selectOption('v');
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).toContainText('T1 are două freze');
  await expect(e2.locator('[data-grup="freza"] [data-greseala]')).toContainText('T1 are două freze');
  // Roșu doar unde e T1: freza fundului plat (T2) nu se ciocnește cu nimic.
  await expect(e1.locator('[data-camp="scula"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(e2.locator('[data-camp="scula"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(e1.locator('[data-camp="fund-scula"]')).toHaveAttribute('aria-invalid', 'false');
  await expect(e1.locator('[data-camp="fund-diametru"]')).toHaveAttribute('aria-invalid', 'false');
  // Numărul nou: cel mai mic liber (T2 e al fundului plat), pe ambele fișe; doar unde e conflictul, nu și la fundul plat.
  await expect(e1.locator('[data-grup="freza"] [data-da-t]')).toHaveText('Dă-i T3');
  await expect(e2.locator('[data-grup="freza"] [data-da-t]')).toHaveText('Dă-i T3');
  await expect(page.locator('[data-da-t]')).toHaveCount(2);
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  // Un clic: V-ul ia T3, conflictul pleacă, exportul merge.
  await e1.locator('[data-grup="freza"] [data-da-t]').click();
  await expect(e1.locator('[data-camp="scula"]')).toHaveValue('3');
  await expect(page.locator('[data-greseala]')).toHaveCount(0);
  await expect(page.locator('[data-da-t]')).toHaveCount(0);
  await expect(e2.locator('[data-camp="scula"]')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
});

test('greșeala pe câmp: pasul, adâncimea, numărul sculei, diametrul și unghiul V, fiecare cu marginile lui; „—” în listă', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  // Pasul 0 pe dreptunghi: doar pasul e roșu, cu greșeala lui.
  await e1.locator('[data-camp="pas"]').fill('0');
  await expect(e1.locator('[data-grup="adancime"] [data-greseala]')).toHaveText(['Pasul: scrie un număr mai mare ca 0, cel mult 1000 mm.']);
  await expect(e1.locator('[data-camp="pas"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(e1.locator('[data-camp="adancime"]')).toHaveAttribute('aria-invalid', 'false');
  // Adâncimea goală pe cerc: greșeala ei, iar rândul din listă spune „—”, nu „ mm”.
  await e2.locator('[data-camp="adancime"]').fill('');
  await expect(e2.locator('[data-grup="adancime"] [data-greseala]')).toHaveText(['Adâncimea: scrie un număr mai mare ca 0, cel mult 1000 mm.']);
  const meta = page.locator('[data-nav="e2/e2"] .dx-meta');
  await expect(meta).toHaveText(/· T1 Ø6 · —$/);
  // Numărul sculei 0 și diametrul 200: amândouă, fiecare cu greșeala lui; reparat numărul, rămâne doar diametrul.
  await e1.locator('[data-camp="scula"]').fill('0');
  await e1.locator('[data-camp="diametru"]').fill('200');
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).toHaveText([
    'Numărul sculei: scrie un număr întreg de la 1 la 999.', 'Diametrul frezei: scrie un număr mai mare ca 0, cel mult 100 mm.',
  ]);
  await expect(page.locator('[data-nav="e1/e1"] .dx-meta')).toHaveText(/· T0 Ø200 ·/);
  // Un număr gol e „—” și la freză.
  await e1.locator('[data-camp="scula"]').fill('');
  await expect(page.locator('[data-nav="e1/e1"] .dx-meta')).toHaveText(/· T— Ø200 ·/);
  // T2: cu T1, Ø200 s-ar ciocni și cu freza cercului.
  await e1.locator('[data-camp="scula"]').fill('2');
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).toHaveText(['Diametrul frezei: scrie un număr mai mare ca 0, cel mult 100 mm.']);
  await expect(e1.locator('[data-camp="scula"]')).toHaveAttribute('aria-invalid', 'false');
  await expect(e1.locator('[data-camp="diametru"]')).toHaveAttribute('aria-invalid', 'true');
  // Unghiul V: doar el.
  await e1.locator('[data-camp="diametru"]').fill('6');
  await e1.locator('input[data-camp="latura"][value="vcarve"]').check();
  await e1.locator('[data-camp="forma-scula"]').selectOption('v');
  await e1.locator('[data-camp="unghi-v"]').fill('200');
  await expect(e1.locator('[data-grup="freza"] [data-greseala]')).toContainText(['Unghiul V: scrie un număr de la 1° la 179°.']);
  await expect(e1.locator('[data-camp="unghi-v"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(e1.locator('[data-camp="diametru"]')).toHaveAttribute('aria-invalid', 'false');
});

test('avansul peste viteza maximă: notă cu setările din fabrică, avertisment cu `$$`-ul lipit', async ({ page }) => {
  await deschide(page);
  const exporta = async (): Promise<void> => {
    const d = page.waitForEvent('download');
    await page.locator('[data-buton="exporta"]').click();
    await d;
  };
  await exporta();
  const limitat = page.getByTestId('export-rezumat').locator('[data-rezumat="limitat"]');
  await expect(limitat).toHaveClass('nota');
  await expect(limitat).toHaveAttribute('data-sursa', 'implicit');
  await expect(limitat).toContainText('Lipește $$ pentru timpul mașinii tale.');
  await expect(page.locator('.rezumat .avertisment')).toHaveCount(0);
  // Cu `$$`-ul unei mașini lente, lipit de om: avertismentul.
  await page.locator('.setari-masina summary').click();
  await page.locator('[data-camp="setari-masina"]').fill(LENT);
  await exporta();
  await expect(limitat).toHaveClass('avertisment');
  await expect(limitat).toHaveAttribute('data-sursa', 'setari');
  await expect(limitat).toContainText('avansul trece de viteza maximă a mașinii');
});

/** Două pătrate de 20 mm, fiecare cu profilul pe exterior, unul peste altul (de la X 10 și de la X 20): regiunea le refuză. */
const SUPRAPUSE = {
  schema: 29, rev: 1,
  piese: [0, 1].map((k) => ({
    id: `p${String(k)}`,
    radacina: { tip: 'element', id: `r${String(k)}`, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, forma: { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 } },
    operatii: [{
      id: 'o', tip: 'profil', noduri: [`r${String(k)}`], scula: { numar: 1, nume: 'freza plata', diametru: 3 },
      latura: 'exterior', sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
    }],
  })),
  foi: [{
    id: 'f1', stoc: { latime: 100, inaltime: 60, grosime: 18 },
    instante: [{ id: 'i0', piesa: 'p0', x: 10, y: 10, rotire: 0 }, { id: 'i1', piesa: 'p1', x: 20, y: 10, rotire: 0 }],
  }],
};

test('un refuz al calculului: numele elementelor, numerele cu virgula și „Du-mă la …” la operația numită', async ({ page }) => {
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
  }, SUPRAPUSE);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(2);
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  const stare = page.getByTestId('export-stare');
  await expect(stare).toContainText('Exportul n-a mers: regiunea păstrată:');
  // Numele elementelor, ca în listă, nu id-urile din lume; numerele lucrării, cu virgula.
  const text = (await stare.textContent()) ?? '';
  expect(text).not.toMatch(/\bi[01]\/r[01]\b/);
  expect(text).toContain('dreptunghi 20');
  expect(text).toMatch(/X \d+,\d, Y \d+,\d/);
  // „Du-mă la …” aduce fișa operației primului element numit.
  const du = page.locator('[data-du-calcul]');
  await expect(du).toHaveText(/^Du-mă la dreptunghi 20/);
  const cheie = (await du.getAttribute('data-du-calcul')) ?? '';
  expect(['p0/o', 'p1/o']).toContain(cheie);
  await page.locator('[data-nav="foaia"]').click();
  await du.click();
  await expect(page.locator(`[data-fisa="op"][data-operatie="${cheie}"] h3`)).toBeInViewport();
  await expect(page.locator(`[data-nav="${cheie}"]`)).toHaveAttribute('aria-current', 'true');
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-GB' });
  test('„Make it T3”, greșeala pe câmp și nota vitezei au textele lor', async ({ page }) => {
    await deschide(page);
    const e1 = fisa(page, 'e1/e1');
    await e1.locator('input[data-camp="latura"][value="incrustatie"]').check();
    await e1.locator('[data-camp="forma-scula"]').selectOption('v');
    await expect(e1.locator('[data-grup="freza"] [data-da-t]')).toHaveText('Make it T3');
    await e1.locator('[data-grup="freza"] [data-da-t]').click();
    await e1.locator('[data-camp="pas"]').fill('0');
    await expect(e1.locator('[data-grup="adancime"] [data-greseala]')).toHaveText(['Step down: enter a number above 0, up to 1000 mm.']);
    await e1.locator('[data-camp="pas"]').fill('3');
    const d = page.waitForEvent('download');
    await page.locator('[data-buton="exporta"]').click();
    await d;
    await expect(page.getByTestId('export-rezumat').locator('[data-rezumat="limitat"]')).toContainText('Paste $$ for your machine’s own time.');
  });
});
