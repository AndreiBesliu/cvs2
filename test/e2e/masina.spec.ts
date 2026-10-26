import { test, expect } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Panoul mașinii (ADR 0081, felia 3.6b), în Edge: cu mașina simulată (doar în afara instanței live), ultimul export se
 * încarcă exact (același SHA-256 ca în fereastra exportului), se trimite până la „gata”, iar o comandă manuală își primește
 * răspunsul în jurnal; un fișier străin cu diacritice se refuză, cu linia; portul Web Serial (un port fals, injectat) se
 * deschide la 115 200 baud, scrie liniile și citește răspunsurile. Poziționarea (ADR 0082, felia 3.7a): jog-ul pe diagonală,
 * zero-ul XY în WCS-ul programului, palparea Z pe placa simulată (Z −25), refuzurile în alarmă, nepotrivirea WCS-ului.
 */
test.use({ locale: 'ro-RO' });

test('mașina simulată: ultimul export, același SHA-256, pornește și ajunge la gata; $G în jurnal; deconectarea', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  const sha = /[0-9a-f]{64}/.exec((await page.getByTestId('export-stare').textContent()) ?? '')?.[0];
  expect(sha).toBeTruthy();
  await page.getByRole('button', { name: 'Închide' }).click();

  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat');
  await page.locator('[data-masina="viteza"]').selectOption('100');
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Conectat la mașina simulată');
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.getByTestId('masina-jurnal')).toContainText("Grbl 1.1h ['$' for help]");

  await page.locator('[data-masina="export"]').click();
  await expect(page.locator('.masina-sha')).toHaveAttribute('data-sha', sha ?? '');
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pregatit');
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'terminat', { timeout: 60_000 });
  await expect(page.getByTestId('masina-erori')).toHaveCount(0);
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');

  await page.locator('[data-masina="comanda"]').fill('$G');
  await page.locator('[data-masina="trimite"]').click();
  await expect(page.getByTestId('masina-jurnal')).toContainText('[GC:');
  await page.locator('[data-masina="deconecteaza"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un fișier străin cu diacritice se refuză, cu linia; unul bun se încarcă, cu numele și amprenta lui', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="vedere.masina"]').click();
  const fisier = page.locator('[data-masina="fisier-ales"]');
  await fisier.setInputFiles({ name: 'strain.nc', mimeType: 'text/plain', buffer: Buffer.from('G90\nG54\n(gaură)\nG0 X1\n', 'utf8') });
  await expect(page.getByTestId('masina-refuz')).toContainText('Linia 3 are un caracter în afara ASCII');
  await fisier.setInputFiles({ name: 'bun.nc', mimeType: 'text/plain', buffer: Buffer.from('G90\nG54\nG0 X1\n', 'ascii') });
  await expect(page.getByTestId('masina-refuz')).toHaveCount(0);
  await expect(page.getByTestId('masina-program')).toContainText('bun.nc');
  await expect(page.getByTestId('masina-program')).toContainText('3 linii');
});

test('portul Web Serial (fals): se deschide la 115 200 baud, bannerul și rapoartele vin, o comandă pleacă și primește ok', async ({ page }) => {
  await page.addInitScript(() => {
    const enc = new TextEncoder();
    let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
    const w = window as unknown as { scrise: string[]; baud: number };
    w.scrise = [];
    const readable = new ReadableStream<Uint8Array>({ start(c) { ctrl = c; } });
    const writable = new WritableStream<Uint8Array>({
      write(bucata) {
        const t = new TextDecoder().decode(bucata);
        w.scrise.push(t);
        for (const c of t) if (c === '?') ctrl?.enqueue(enc.encode('<Idle|MPos:1.000,2.000,3.000|FS:0,0>\r\n'));
        for (let k = 0; k < t.split('\n').length - 1; k++) ctrl?.enqueue(enc.encode('ok\r\n'));
      },
    });
    const port = {
      open: (o: { baudRate: number }) => { w.baud = o.baudRate; setTimeout(() => { ctrl?.enqueue(enc.encode("\r\nGrbl 1.1h ['$' for help]\r\n")); }, 0); return Promise.resolve(); },
      close: () => Promise.resolve(),
      readable, writable,
    };
    Object.defineProperty(navigator, 'serial', { configurable: true, value: { requestPort: () => Promise.resolve(port) } });
  });
  await page.goto('/');
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="conecteaza"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Conectat la portul serial');
  expect(await page.evaluate(() => (window as unknown as { baud: number }).baud)).toBe(115200);
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.getByTestId('masina-pozitie')).toContainText('X 1.000  Y 2.000  Z 3.000');
  await page.locator('[data-masina="comanda"]').fill('G0 X5');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('masina-jurnal')).toContainText('> G0 X5');
  await expect(page.locator('[data-testid="masina-jurnal"] li').last()).toHaveText('ok');
  expect(await page.evaluate(() => (window as unknown as { scrise: string[] }).scrise.join(''))).toContain('G0 X5\n');
  await page.locator('[data-masina="deconecteaza"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat');
});

test('fără Web Serial (Firefox, Safari): panoul spune ce browser trebuie, în loc de butonul de conectare', async ({ page }) => {
  await page.addInitScript(() => { delete (Navigator.prototype as unknown as { serial?: unknown }).serial; });
  await page.goto('/');
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.locator('[data-masina="conecteaza"]')).toHaveCount(0);
  await expect(page.locator('.masina')).toContainText('folosește Chrome sau Edge');
});

async function simulata(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="viteza"]').selectOption('100');
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.locator('[data-masina="wcs"]')).toHaveValue('G54');
}

test('poziționarea: Z0 declarat de export, jog pe diagonală, zero XY în G54, palparea Z pe placă (Z0 scris, freza la +25)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  await page.getByRole('button', { name: 'Închide' }).click();
  await simulata(page);
  await page.locator('[data-masina="export"]').click();
  await expect(page.getByTestId('masina-z0')).toContainText('Z0 al programului: fața de sus a materialului');
  await expect(page.getByTestId('masina-z0')).toContainText('Originea XY a programului: colțul stânga-jos al foii.');

  await page.locator('[data-masina="pas-jog"]').selectOption('10');
  await page.locator('[data-jog="X+Y+"]').click();
  await expect(page.getByTestId('masina-pozitie')).toContainText('X 10.000 Y 10.000 Z 0.000');
  await expect(page.getByTestId('masina-jurnal')).toContainText('> $J=G91 G21 X10.000 Y10.000 F1000');
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.locator('[data-masina="zero-xy"]')).toHaveText('Zero XY (G54)');
  await page.locator('[data-masina="zero-xy"]').click();
  await expect(page.getByTestId('masina-procedura')).toHaveText('Zero XY scris în G54.');
  await expect(page.getByTestId('masina-pozitie')).toContainText('X 0.000 Y 0.000 Z 0.000');
  await expect(page.locator('.masina-rand', { has: page.getByTestId('masina-pozitie') })).toContainText('poziția de lucru');

  await page.locator('[data-masina="palpeaza"]').click();
  await expect(page.getByTestId('masina-procedura')).toHaveText('Z0 scris în G54: placa atinsă la Z -25.000 al mașinii, grosimea 20 mm.', { timeout: 30_000 });
  await expect(page.getByTestId('masina-pozitie')).toContainText('Z 25.000');
  await expect(page.getByTestId('masina-jurnal')).toContainText('> G0 G21 G90');
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'terminat', { timeout: 60_000 });
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('în alarmă (palparea fără atingere): jog-ul și zero-ul refuzate, cu motivul; după $X, iar; un program în G55 se spune lângă WCS', async ({ page }) => {
  await page.goto('/');
  await simulata(page);
  await page.locator('[data-masina="palpare-distanta"]').fill('10');
  await page.locator('[data-masina="palpeaza"]').click();
  await expect(page.getByTestId('masina-procedura')).toContainText('Nicio atingere pe distanța de căutare (ALARM:5)', { timeout: 30_000 });
  await expect(page.getByTestId('masina-stare')).toHaveText('Alarm');
  await expect(page.getByTestId('masina-motiv-jog')).toHaveText('Nu acum: mașina e în alarmă: deblochează ($X).');
  await expect(page.locator('[data-jog="X+"]')).toBeDisabled();
  await expect(page.locator('[data-masina="zero-xy"]')).toBeDisabled();
  await expect(page.locator('[data-masina="palpeaza"]')).toBeDisabled();
  await page.locator('[data-masina="deblocheaza"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.locator('[data-masina="zero-xy"]')).toBeEnabled();
  await expect(page.getByTestId('masina-jurnal')).toContainText('> G0 G21 G90');

  await page.locator('[data-masina="fisier-ales"]').setInputFiles({ name: 'g55.nc', mimeType: 'text/plain', buffer: Buffer.from('G90\nG55\nG0 X1\n', 'ascii') });
  await expect(page.getByTestId('masina-wcs-nepotrivit')).toContainText('Programul taie în G55, mașina e în G54: zero-ul și palparea se scriu în G55.');
  await expect(page.locator('[data-masina="zero-xy"]')).toHaveText('Zero XY (G55)');
  await expect(page.getByTestId('masina-z0')).toHaveText('Programul nu spune unde e Z0: verifică-l înainte de zero.');
  await page.locator('[data-masina="wcs-program"]').click();
  await expect(page.locator('[data-masina="wcs"]')).toHaveValue('G55');
  await expect(page.getByTestId('masina-wcs-nepotrivit')).toHaveCount(0);
});

/** Exportul cu două freze (ADR 0084): cercul (gaura, se taie întâi) cu T2 Ø3, dreptunghiul cu T1 Ø6. */
async function exportDouaFreze(page: import('@playwright/test').Page, strategie?: string): Promise<string[]> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e2/e2"]');
  await rand.locator('[data-camp="scula"]').fill('2');
  await rand.locator('[data-camp="diametru"]').fill('3');
  await expect(page.locator('[data-camp="strategie"]')).toHaveValue('bariera-sender');
  if (strategie) await page.locator('[data-camp="strategie"]').selectOption(strategie);
  const nume: string[] = [];
  page.on('download', (d) => { nume.push(d.suggestedFilename()); });
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('Descărcat');
  await page.getByRole('button', { name: 'Închide' }).click();
  return nume;
}

test('două freze pe mașina simulată (ADR 0084): lucrarea se oprește la schimbare, spune freza de montat; palparea, Continuă, gata', async ({ page }) => {
  const nume = await exportDouaFreze(page);
  expect(nume).toEqual(['cncvs2-stanga-jos.nc']);
  await simulata(page);
  await page.locator('[data-masina="export"]').click();
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'bariera', { timeout: 60_000 });
  // Gaura (T2) s-a tăiat; urmează dreptunghiul, cu T1.
  await expect(page.getByTestId('masina-faza')).toContainText('montează T1 freza plata D6.000');
  // La oprire, freza e la Z sigur (5), peste placa simulată (Z −25): palparea o găsește la 30 mm.
  await page.locator('[data-masina="palpeaza"]').click();
  await expect(page.getByTestId('masina-procedura')).toContainText('Z0 scris în G54', { timeout: 30_000 });
  await page.locator('[data-masina="continua"]').click();
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'terminat', { timeout: 60_000 });
  await expect(page.getByTestId('masina-erori')).toHaveCount(0);
  await expect(page.getByTestId('masina-jurnal')).not.toContainText('T1 M6');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('câte un fișier pe freză (ADR 0084): două descărcări, în ordine; panoul mașinii alege fișierul de încărcat', async ({ page }) => {
  const nume = await exportDouaFreze(page, 'fisiere-separate');
  await expect.poll(() => nume.length).toBe(2);
  expect(nume).toEqual(['cncvs2-stanga-jos-1-T2.nc', 'cncvs2-stanga-jos-2-T1.nc']);
  await expect(page.getByTestId('export-stare')).toHaveCount(0);
  await simulata(page);
  const alege = page.locator('[data-masina="export-fisier"]');
  await expect(alege.locator('option')).toHaveText(nume);
  await alege.selectOption({ label: 'cncvs2-stanga-jos-2-T1.nc' });
  await page.locator('[data-masina="export"]').click();
  await expect(page.getByTestId('masina-program')).toContainText('cncvs2-stanga-jos-2-T1.nc');
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'terminat', { timeout: 60_000 });
  await expect(page.getByTestId('masina-erori')).toHaveCount(0);
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-US' });
  test('jurnalul sesiunii e în limba omului: „connected to the simulated machine”, „disconnected”', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-actiune="vedere.masina"]').click();
    await page.locator('[data-masina="simulata"]').click();
    await expect(page.getByTestId('masina-conexiune')).toHaveText('Connected to the simulated machine');
    await expect(page.getByTestId('masina-jurnal')).toContainText('connected to the simulated machine');
    await page.locator('[data-masina="deconecteaza"]').click();
    await expect(page.getByTestId('masina-jurnal')).toContainText('disconnected');
    await expect(page.getByTestId('masina-jurnal')).not.toContainText('conectat');
  });
  test('poziționarea în engleză: butoanele, zero-ul scris, motivul refuzului', async ({ page }) => {
    await page.goto('/');
    await simulata(page);
    await expect(page.locator('[data-masina="palpeaza"]')).toHaveText('Probe Z (G54)');
    await page.locator('[data-masina="zero-z"]').click();
    await expect(page.getByTestId('masina-procedura')).toHaveText('Zero Z written in G54.');
    await page.locator('[data-masina="palpare-distanta"]').fill('5');
    await page.locator('[data-masina="palpeaza"]').click();
    await expect(page.getByTestId('masina-procedura')).toContainText('No touch within the search distance (ALARM:5)', { timeout: 30_000 });
    await expect(page.getByTestId('masina-motiv-jog')).toHaveText('Not now: the machine is in alarm: unlock ($X).');
    await expect(page.getByTestId('masina-jurnal')).toContainText('ALARM:5');
  });
});
