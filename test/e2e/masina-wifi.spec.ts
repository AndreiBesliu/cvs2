import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { pornesteControler, type ControlerWebSocket } from './controlerWebSocket.ts';

/**
 * Senderul prin WiFi (ADR 0119, felia 3.6d), în Edge, cu un controler în rețea simulat: emulatorul GRBL în spatele unui server
 * WebSocket local (`controlerWebSocket.ts`, pe 127.0.0.1; pagina e pe localhost, deci fără permisiunea rețelei locale). Adresa
 * pe care browserul n-ar lăsa-o se refuză înainte de conectare; mesajul de control al controlerului nu ajunge în jurnal;
 * programul ajunge la controler octet cu octet (aceeași amprentă ca exportul), după avertismentul căderii WiFi-ului, arătat o
 * singură dată; legătura tăiată în timpul programului lasă lucrarea pierdută, cu motivul; adresa și portul rămân pentru data
 * viitoare.
 */
test.use({ locale: 'ro-RO' });

let ctl: ControlerWebSocket | null = null;
test.afterEach(async () => {
  await ctl?.inchide();
  ctl = null;
});

test('prin WiFi: adresa refuzată înainte de conectare; programul ajunge octet cu octet, după avertisment; legătura căzută; alegerile rămân', async ({ page }) => {
  const c = await pornesteControler();
  ctl = c;
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
  await page.locator('[data-masina="conecteaza-wifi"]').click();
  await expect(page.locator('[data-masina="wifi-port"]')).toHaveValue('81');
  // Un nume obișnuit și un IP public pe ws:// se refuză înainte de conectare: browserul le-ar bloca.
  await page.locator('[data-masina="wifi-adresa"]').fill('controler.atelier.ro');
  await page.locator('[data-masina="wifi-conecteaza"]').click();
  await expect(page.getByTestId('masina-wifi-refuz')).toHaveText('Browserul ajunge doar la un IP local sau la un nume care se termină în .local: scrie IP-ul controlerului (de pe ecranul lui sau din router).');
  await page.locator('[data-masina="wifi-adresa"]').fill('8.8.8.8');
  await page.locator('[data-masina="wifi-conecteaza"]').click();
  await expect(page.getByTestId('masina-wifi-refuz')).toHaveText('IP-ul acesta nu e în rețeaua locală: browserul blochează un ws:// spre el.');
  // Profilul își aduce portul: podul ESP3D are WebSocket-ul de date pe 8282.
  await page.locator('[data-masina="wifi-profil"]').selectOption('esp3d');
  await expect(page.locator('[data-masina="wifi-port"]')).toHaveValue('8282');
  await page.locator('[data-masina="wifi-profil"]').selectOption('fluidnc');
  expect(c.conexiuni()).toBe(0);

  await page.locator('[data-masina="wifi-adresa"]').fill('127.0.0.1');
  await page.locator('[data-masina="wifi-port"]').fill(String(c.port));
  await page.locator('[data-masina="wifi-conecteaza"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText(`Conectat prin WiFi (127.0.0.1:${c.port})`);
  await expect(page.getByTestId('masina-wifi')).toHaveCount(0);
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.getByTestId('masina-jurnal')).toContainText('conectat prin WiFi');
  await expect(page.getByTestId('masina-jurnal')).toContainText("Grbl 1.1h ['$' for help]");
  await expect(page.getByTestId('masina-jurnal')).not.toContainText('CURRENT_ID');

  await page.locator('[data-masina="export"]').click();
  await expect(page.locator('.masina-sha')).toHaveAttribute('data-sha', sha ?? '');
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-avertisment-wifi')).toContainText('Prin WiFi, dacă legătura cade în timpul programului');
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pregatit');
  await page.locator('[data-masina="start-wifi"]').click();
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'terminat', { timeout: 60_000 });
  await expect(page.getByTestId('masina-erori')).toHaveCount(0);
  // La controler a ajuns exact exportul (fără timpul real și fără citirile `$G` ale sesiunii).
  expect(createHash('sha256').update(c.program()).digest('hex')).toBe(sha);

  // A doua pornire, încet: fără avertisment; legătura tăiată în timpul programului lasă lucrarea pierdută, cu motivul.
  c.viteza = 1;
  await page.locator('[data-masina="start"]').click();
  await expect(page.getByTestId('masina-avertisment-wifi')).toHaveCount(0);
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', /^(?:trimite|golire)$/);
  c.taie();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat');
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pierdut');
  await expect(page.locator('.masina-nota[role="status"]')).toHaveText('Legătura s-a închis: legătura WiFi a căzut');

  // Alegerile rămân: formularul se redeschide cu adresa și portul de data trecută.
  await page.locator('[data-masina="conecteaza-wifi"]').click();
  await expect(page.locator('[data-masina="wifi-adresa"]')).toHaveValue('127.0.0.1');
  await expect(page.locator('[data-masina="wifi-port"]')).toHaveValue(String(c.port));
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
