import { test, expect, type Page } from '@playwright/test';

/**
 * Codurile controlerului în panoul mașinii (ADR 0085, felia 3.6c), în Edge: pe mașina simulată, `error:22` la o comandă a
 * omului și `error:5` la `$H`, explicate și ascunse cu „Am înțeles”; palparea fără atingere (ALARM:5), deblocată fără
 * confirmare; Oprește în timpul unei mișcări (ALARM:3), deblocată abia după confirmare. Pe un port Web Serial fals: limita
 * hard (ALARM:1) cu „Reset to continue” (întâi repornirea, apoi deblocarea cu confirmare) și tabelul grblHAL (ALARM:10 e
 * oprirea de urgență, nu axa dublă). În engleză, aceeași explicație.
 */
test.use({ locale: 'ro-RO' });

async function simulata(page: Page, viteza = '100'): Promise<void> {
  await page.goto('/');
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="viteza"]').selectOption(viteza);
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.locator('[data-masina="wcs"]')).toHaveValue('G54');
}

async function comanda(page: Page, text: string): Promise<void> {
  await page.locator('[data-masina="comanda"]').fill(text);
  await page.locator('[data-masina="trimite"]').click();
}

test('o comandă refuzată (error:22) și $H fără homing (error:5): explicația, locul, tabelul; „Am înțeles” o ascunde', async ({ page }) => {
  await simulata(page);
  await comanda(page, 'G1 X10');
  const card = page.getByTestId('masina-cod');
  await expect(card).toHaveAttribute('data-cod', 'error:22');
  await expect(card.locator('.masina-cap').first()).toHaveText('error:22 — Avansul nu e dat');
  await expect(page.getByTestId('masina-cod-loc')).toHaveText('La comanda „G1 X10”.');
  await expect(page.getByTestId('masina-cod-faci')).toContainText('Ce faci: Adaugă un F');
  await expect(card).toContainText('Doar linia asta a fost refuzată');
  await expect(card).toContainText('Explicat după tabelul GRBL 1.1.');
  await expect(page.getByTestId('masina-jurnal')).toContainText('error:22 — Avansul nu e dat');
  await page.locator('[data-masina="cod-ascunde"]').click();
  await expect(card).toHaveCount(0);

  await comanda(page, '$H');
  await expect(card).toHaveAttribute('data-cod', 'error:5');
  await expect(card).toContainText('Homing-ul nu e configurat');
  await expect(page.getByTestId('masina-cod-faci')).toContainText('fă zero-ul de mână');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('palparea fără atingere (ALARM:5): explicația cu Deblochează și Mergi la palpare; deblocarea fără confirmare', async ({ page }) => {
  await simulata(page);
  await page.locator('[data-masina="palpare-distanta"]').fill('10');
  await page.locator('[data-masina="palpeaza"]').click();
  const card = page.getByTestId('masina-cod');
  await expect(card).toHaveAttribute('data-cod', 'ALARM:5', { timeout: 30_000 });
  await expect(card).toContainText('Palparea: nicio atingere');
  await expect(page.getByTestId('masina-cod-loc')).toHaveCount(0);
  await expect(page.getByTestId('masina-jurnal')).toContainText('ALARM:5 — Palparea: nicio atingere');
  await page.locator('[data-masina="cod-deblocare"]').click();
  await expect(page.getByTestId('masina-confirmare-deblocare')).toHaveCount(0);
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  // În Idle, deblocarea nu mai are rost; palparea, da.
  await expect(page.locator('[data-masina="cod-deblocare"]')).toHaveCount(0);
  await page.locator('[data-masina="cod-palpare"]').click();
  await expect(page.locator('[data-masina="palpeaza"]')).toBeFocused();
});

test('Oprește în timpul unei mișcări (ALARM:3): poziția pierdută, deblocarea cere confirmarea; Renunță nu trimite nimic', async ({ page }) => {
  await simulata(page, '1');
  await page.locator('[data-masina="fisier-ales"]').setInputFiles({ name: 'lung.nc', mimeType: 'text/plain', buffer: Buffer.from('G54\nG21 G90\nG1 X200 F300\nM30\n', 'ascii') });
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Run');
  await page.locator('[data-masina="opreste"]').click();
  const card = page.getByTestId('masina-cod');
  await expect(card).toHaveAttribute('data-cod', 'ALARM:3');
  await expect(card).toContainText('Repornit în timpul unei mișcări');
  await expect(page.getByTestId('masina-stare')).toHaveText('Alarm');
  // Motivul întreruperii, în cuvinte (nu codul intern al fluxului).
  await expect(page.getByTestId('masina-faza')).toHaveText('întreruptă (ai apăsat Oprește): se pornește din nou de la început');

  await page.locator('[data-masina="deblocheaza"]').click();
  const confirmare = page.getByTestId('masina-confirmare-deblocare');
  await expect(confirmare).toContainText('poziția mașinii nu mai e sigură');
  // Confirmarea stă în card, unde e explicația.
  await expect(card.getByTestId('masina-confirmare-deblocare')).toHaveCount(1);
  await page.locator('[data-masina="deblocare-renunta"]').click();
  await expect(confirmare).toHaveCount(0);
  await expect(page.getByTestId('masina-jurnal')).not.toContainText('> $X');
  await expect(page.getByTestId('masina-stare')).toHaveText('Alarm');

  await page.locator('[data-masina="cod-deblocare"]').click();
  await page.locator('[data-masina="deblocheaza-oricum"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.getByTestId('masina-jurnal')).toContainText('> $X');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

/** Un port Web Serial fals, condus de probă (`window.linie`), cu bannerul dat; `?` primește raportul stării `window.stare`. */
async function portFals(page: Page, banner: string): Promise<void> {
  await page.addInitScript((b: string) => {
    const enc = new TextEncoder();
    let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
    const w = window as unknown as { scrise: string[]; stare: string; linie: (s: string) => void };
    w.scrise = [];
    w.stare = 'Idle';
    w.linie = (s) => { ctrl?.enqueue(enc.encode(`${s}\r\n`)); };
    const readable = new ReadableStream<Uint8Array>({ start(c) { ctrl = c; } });
    const writable = new WritableStream<Uint8Array>({
      write(bucata) {
        const t = new TextDecoder().decode(bucata);
        w.scrise.push(t);
        for (const c of t) {
          if (c === '?') w.linie(`<${w.stare}|MPos:0.000,0.000,0.000|FS:0,0>`);
          // Ctrl-X: repornirea, cu blocarea de după alarmă.
          if (c === '\x18') setTimeout(() => { w.linie(b); w.linie("[MSG:'$H'|'$X' to unlock]"); }, 0);
        }
        for (const l of t.split('\n').slice(0, -1)) {
          if (l === '$X') { w.stare = 'Idle'; w.linie('[MSG:Caution: Unlocked]'); }
          if (l === '$G') w.linie('[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]');
          w.linie('ok');
        }
      },
    });
    const port = {
      open: () => { setTimeout(() => { w.linie(''); w.linie(b); }, 0); return Promise.resolve(); },
      close: () => Promise.resolve(),
      readable, writable,
    };
    Object.defineProperty(navigator, 'serial', { configurable: true, value: { requestPort: () => Promise.resolve(port) } });
  }, banner);
  await page.goto('/');
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="conecteaza"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
}

test('port fals, GRBL 1.1: limita hard (ALARM:1) cere întâi repornirea, apoi deblocarea cu confirmare', async ({ page }) => {
  await portFals(page, "Grbl 1.1h ['$' for help]");
  await page.evaluate(() => {
    const w = window as unknown as { stare: string; linie: (s: string) => void };
    w.stare = 'Alarm';
    w.linie('ALARM:1');
    w.linie('[MSG:Reset to continue]');
  });
  const card = page.getByTestId('masina-cod');
  await expect(card).toHaveAttribute('data-cod', 'ALARM:1');
  await expect(card).toContainText('Limitator atins (limită hard)');
  await expect(page.getByTestId('masina-cod-repornire')).toContainText('apasă întâi Oprește');
  await expect(page.locator('[data-masina="cod-deblocare"]')).toBeDisabled();
  await expect(page.locator('[data-masina="cod-deblocare"]')).toHaveAttribute('title', 'Întâi repornirea (Oprește).');
  await page.locator('[data-masina="cod-repornire"]').click();
  // După repornire, blocarea: explicația rămâne a limitei hard, iar deblocarea se poate (cu confirmare).
  await expect(page.getByTestId('masina-cod-repornire')).toHaveCount(0);
  await expect(card).toHaveAttribute('data-cod', 'ALARM:1');
  await expect(page.locator('[data-masina="cod-deblocare"]')).toBeEnabled();
  await page.locator('[data-masina="cod-deblocare"]').click();
  await page.locator('[data-masina="deblocheaza-oricum"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  expect(await page.evaluate(() => (window as unknown as { scrise: string[] }).scrise.join(''))).toContain('$X\n');
});

test('port fals, grblHAL: bannerul îl recunoaște, iar ALARM:10 se explică după tabelul lui (oprirea de urgență)', async ({ page }) => {
  await portFals(page, "GrblHAL 1.1f ['$' or '$HELP' for help]");
  await page.evaluate(() => {
    const w = window as unknown as { stare: string; linie: (s: string) => void };
    w.stare = 'Alarm';
    w.linie('ALARM:10');
  });
  const card = page.getByTestId('masina-cod');
  await expect(card).toHaveAttribute('data-cod', 'ALARM:10');
  await expect(card).toContainText('Oprire de urgență');
  await expect(card).toContainText('Explicat după tabelul grblHAL.');
  // Un cod pe care tabelul nu-l are: linia, fără explicație ghicită.
  await page.evaluate(() => { (window as unknown as { linie: (s: string) => void }).linie('error:59'); });
  await expect(card).toHaveAttribute('data-cod', 'error:59');
  await expect(card).toContainText('Nu e în tabelul grblHAL');
  await expect(page.getByTestId('masina-cod-ce')).toHaveText('Controlerul a trimis error:59, pe care tabelul grblHAL nu-l are. Nu ghicim o explicație.');
  // Mașina e încă ținută de oprirea de urgență.
  await expect(page.getByTestId('masina-cod-alarma')).toHaveText('Mașina e ținută de ALARM:10: Oprire de urgență.');
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-US' });
  test('the same explanation, in English', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-actiune="vedere.masina"]').click();
    await page.locator('[data-masina="viteza"]').selectOption('100');
    await page.locator('[data-masina="simulata"]').click();
    await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
    await comanda(page, 'G1 X10');
    const card = page.getByTestId('masina-cod');
    await expect(card.locator('.masina-cap').first()).toHaveText('error:22 — No feed rate given');
    await expect(page.getByTestId('masina-cod-loc')).toHaveText('At the command “G1 X10”.');
    await expect(page.getByTestId('masina-cod-faci')).toContainText('What to do: Add an F');
    await expect(card).toContainText('Explained from the GRBL 1.1 table.');
  });
});
