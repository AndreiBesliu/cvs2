import { expect, test, type Page } from '@playwright/test';
import { pornesteImprimanta, type ImprimantaFalsa, type OptiuniImprimantaFalsa } from './imprimantaFalsa.ts';

/**
 * Fereastra Imprimanta (ADR 0190, felia 3.6g), în Edge, cu imprimanta falsă (`imprimantaFalsa.ts`, protocolul K1 de pe 9999):
 * legarea după adresă (și refuzul unui nume pe care browserul nu l-ar lăsa), starea, temperaturile, codul și fișierele; bătăile
 * inimii ținute vii (fără `ok`, imprimanta falsă închide legătura); Pauză, Reia, Oprește cu confirmare; pornirea cu bifa „Patul
 * e gol”, după care imprimanta închide legătura și fereastra se leagă singură din nou; legătura căzută; căutarea în toată
 * rețeaua; pașii unui eșec. Singură, fereastra trimite doar citiri și `ok`: fiecare comandă `set` vine dintr-un clic.
 *
 * Imprimantele falșe ascultă pe 9999, pe rețeaua de loopback a probei (`CNCVS2_E2E_RETEA`, ca podul fals din 3.6f): probele
 * merg pe rând.
 */
const RETEA = process.env['CNCVS2_E2E_RETEA'] ?? '127.0.0';
if (!/^127\.\d{1,3}\.\d{1,3}$/.test(RETEA)) throw new Error(`CNCVS2_E2E_RETEA trebuie să fie 127.a.b, nu „${RETEA}”`);
const IP = `${RETEA}.5`;
const IP_GASIT = `${RETEA}.77`;
test.use({ locale: 'ro-RO' });
test.describe.configure({ mode: 'serial' });

const DIR = '/usr/data/printer_data/gcodes/';
const CITIRI = ['{"method":"get","params":{"ReqPrinterPara":1}}', '{"method":"get","params":{"reqGcodeFile":1}}'];
const FISIERE = [{ name: 'output_11031835.gcode', timeCost: 1140, material: 'PLA' }, { name: 'caramida-2x4.gcode', timeCost: 2460, material: 'PLA' }];

const pornite: ImprimantaFalsa[] = [];
const porneste = async (o: OptiuniImprimantaFalsa): Promise<ImprimantaFalsa> => {
  const i = await pornesteImprimanta({ port: 9999, gazda: IP, fisiere: FISIERE, inimaMs: 400, asteptareOkMs: 1200, pasMs: 300, ...o });
  pornite.push(i);
  return i;
};
test.afterEach(async () => { await Promise.all(pornite.splice(0).map((i) => i.inchide())); });

const deschide = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.locator('[data-actiune="vedere.imprimanta"]').click();
  await expect(page.getByTestId('imprimanta')).toBeVisible();
};
const leaga = async (page: Page, ip: string): Promise<void> => {
  await page.locator('[data-imprimanta="adresa"]').fill(ip);
  await page.locator('[data-imprimanta="conecteaza"]').click();
};
const stare = (page: Page) => page.getByTestId('imprimanta-stare');
const comenziSet = (i: ImprimantaFalsa): readonly string[] => i.comenzi().filter((c) => !CITIRI.includes(c));

test('legarea după adresă: starea, temperaturile, codul și fișierele; bătăile inimii ținute vii; ținută în listă; doar citiri', async ({ page }) => {
  const imp = await porneste({ imprima: { fisier: 'output_11031835.gcode', progres: 26 } });
  imp.eroare(5000, 0);
  await deschide(page);
  await expect(page.getByTestId('imprimanta-conectare')).toContainText('Nicio imprimantă ținută încă');
  // Un nume pe care browserul l-ar bloca (nu e un IP local și nici un nume `.local`): refuzat înainte de orice încercare.
  await leaga(page, 'imprimanta.exemplu.ro');
  await expect(page.getByTestId('imprimanta-refuz')).toContainText('Browserul ajunge doar la un IP local');
  expect(imp.conexiuni()).toBe(0);
  await leaga(page, IP);
  await expect(stare(page)).toHaveText('Imprimă');
  await expect(page.getByTestId('imprimanta-nume')).toHaveText('K1C-8578');
  await expect(page.getByTestId('imprimanta-banda')).toContainText(`${IP} · prin WiFi · firmware 1.3.3.5`);
  await expect(page.getByTestId('imprimanta-fisier')).toHaveText('output_11031835.gcode');
  await expect(page.getByTestId('imprimanta-temp-duza')).toHaveText('220 / 220 °C');
  await expect(page.getByTestId('imprimanta-temp-pat')).toHaveText('50 / 50 °C');
  await expect(page.getByTestId('imprimanta-cod')).toContainText('Cod 5000');
  await expect(page.getByTestId('imprimanta-fisiere')).toContainText('caramida-2x4.gcode');
  await expect(page.getByTestId('imprimanta-fisiere')).toContainText('PLA · 41 min');
  // Cât imprimă, fișierele nu se pot porni.
  await expect(page.locator('[data-imprimanta="porneste"]').first()).toBeDisabled();
  // Progresul curge, iar legătura ține peste multe bătăi ale inimii (fără `ok`, imprimanta falsă ar închide-o la 1,2 s).
  const inainte = await page.getByTestId('imprimanta-progres').textContent();
  await page.waitForTimeout(3000);
  await expect(stare(page)).toHaveText('Imprimă');
  expect(await page.getByTestId('imprimanta-progres').textContent()).not.toBe(inainte);
  expect(imp.conexiuni()).toBe(1);
  expect(imp.okuri()).toBeGreaterThanOrEqual(imp.inimi() - 1);
  expect(imp.okuri()).toBeGreaterThanOrEqual(5);
  // Singură, fereastra a trimis doar citirile.
  expect(imp.comenzi()).toEqual(CITIRI);
  // Ținută în browser, cu numele și modelul ei; „Deconectează” n-o atinge.
  const tinute = await page.evaluate(() => JSON.parse(localStorage.getItem('cncvs2.imprimanta.retea') ?? 'null') as { v: number; imprimante: { adresa: string; port: number; model: string; nume: string }[] });
  expect(tinute.v).toBe(1);
  expect(tinute.imprimante.map(({ adresa, port, model, nume }) => ({ adresa, port, model, nume }))).toEqual([{ adresa: IP, port: 9999, model: 'K1C', nume: 'K1C-8578' }]);
  await page.locator('[data-imprimanta="deconecteaza"]').click();
  await expect(page.getByTestId('imprimanta-conectare')).toContainText('K1C-8578');
  expect(comenziSet(imp)).toEqual([]);
});

test('Pauză și Reia pe loc; Oprește cere confirmarea, iar „Lasă-o să meargă” nu trimite nimic', async ({ page }) => {
  const imp = await porneste({ imprima: { fisier: 'output_11031835.gcode', progres: 40 } });
  await deschide(page);
  await leaga(page, IP);
  await expect(stare(page)).toHaveText('Imprimă');
  await page.locator('[data-imprimanta="pauza"]').click();
  await expect(stare(page)).toHaveText('Pauză');
  await page.locator('[data-imprimanta="reia"]').click();
  await expect(stare(page)).toHaveText('Imprimă');
  await page.locator('[data-imprimanta="opreste"]').click();
  await expect(page.getByTestId('imprimanta-oprire')).toContainText('nu se mai poate relua');
  // Focusul pe alegerea care nu strică nimic.
  await expect(page.locator('[data-imprimanta="oprire-renunta"]')).toBeFocused();
  await page.locator('[data-imprimanta="oprire-renunta"]').click();
  await expect(page.getByTestId('imprimanta-oprire')).toHaveCount(0);
  expect(comenziSet(imp)).toEqual(['{"method":"set","params":{"pause":1}}', '{"method":"set","params":{"pause":0}}']);
  // Escape închide confirmarea, tot fără nimic trimis.
  await page.locator('[data-imprimanta="opreste"]').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('imprimanta-oprire')).toHaveCount(0);
  await page.locator('[data-imprimanta="opreste"]').click();
  await page.locator('[data-imprimanta="oprire-confirma"]').click();
  await expect(stare(page)).toHaveText('Se oprește');
  await expect(stare(page)).toHaveText('Oprită');
  expect(comenziSet(imp)).toEqual(['{"method":"set","params":{"pause":1}}', '{"method":"set","params":{"pause":0}}', '{"method":"set","params":{"stop":1}}']);
  await expect(page.locator('[data-imprimanta="opreste"]')).toBeDisabled();
});

test('pornirea unui fișier din imprimantă cere bifa „Patul e gol”; după pornire, imprimanta închide legătura, iar fereastra se leagă singură din nou', async ({ page }) => {
  const imp = await porneste({});
  await deschide(page);
  await leaga(page, IP);
  await expect(stare(page)).toHaveText('Liberă');
  await expect(page.getByTestId('imprimanta-lucrarea')).toContainText('Nicio lucrare pe imprimantă.');
  const rand = page.getByTestId('imprimanta-fisiere').locator('li', { hasText: 'caramida-2x4.gcode' });
  await rand.locator('[data-imprimanta="porneste"]').click();
  const dialog = page.getByTestId('imprimanta-pornire');
  await expect(page.getByTestId('imprimanta-pornire-fisier')).toHaveText('caramida-2x4.gcode');
  await expect(dialog).toContainText('PLA');
  await expect(dialog).toContainText('41 min');
  await expect(page.locator('[data-imprimanta="pat-gol"]')).toBeFocused();
  await expect(page.locator('[data-imprimanta="pornire-confirma"]')).toBeDisabled();
  await page.locator('[data-imprimanta="pornire-renunta"]').click();
  await expect(dialog).toHaveCount(0);
  expect(comenziSet(imp)).toEqual([]);
  await rand.locator('[data-imprimanta="porneste"]').click();
  await page.locator('[data-imprimanta="pat-gol"]').check();
  await page.locator('[data-imprimanta="pornire-confirma"]').click();
  await expect(stare(page)).toHaveText('Imprimă');
  await expect(page.getByTestId('imprimanta-fisier')).toHaveText('caramida-2x4.gcode');
  expect(comenziSet(imp)).toEqual([`{"method":"set","params":{"opGcodeFile":"printprt:${DIR}caramida-2x4.gcode"}}`]);
  // Imprimanta a închis legătura după pornire; fereastra s-a legat din nou, cu citirile, fără vreo comandă.
  expect(imp.conexiuni()).toBe(2);
  expect(imp.comenzi().filter((c) => c === CITIRI[0])).toHaveLength(2);
  await expect(page.getByTestId('imprimanta-pierduta')).toHaveCount(0);
});

test('legătura căzută: imprimanta merge mai departe, butoanele sunt oprite, apoi fereastra se leagă singură din nou', async ({ page }) => {
  const imp = await porneste({ imprima: { fisier: 'output_11031835.gcode', progres: 10 } });
  await deschide(page);
  await leaga(page, IP);
  await expect(stare(page)).toHaveText('Imprimă');
  imp.taie();
  await expect(stare(page)).toHaveText('Legătura s-a pierdut');
  await expect(page.getByTestId('imprimanta-pierduta')).toContainText('Imprimanta merge mai departe singură');
  await expect(page.locator('[data-imprimanta="pauza"]')).toBeDisabled();
  await expect(page.locator('[data-imprimanta="opreste"]')).toBeDisabled();
  // Prima încercare pleacă după 1 s: imprimanta falsă ascultă încă, deci legătura revine.
  await expect(stare(page)).toHaveText('Imprimă', { timeout: 15_000 });
  await expect(page.getByTestId('imprimanta-pierduta')).toHaveCount(0);
  expect(imp.conexiuni()).toBe(2);
  expect(comenziSet(imp)).toEqual([]);
});

test('nimic nu răspunde la adresă: motivul și pașii; „Caută în toată rețeaua” găsește imprimanta pe R.x:9999 și o ține', async ({ page }) => {
  test.setTimeout(120_000);
  await deschide(page);
  await leaga(page, `${RETEA}.9`);
  await expect(page.getByTestId('imprimanta-motiv')).toHaveText(`Nu răspunde nimic la ${RETEA}.9.`, { timeout: 15_000 });
  await expect(page.getByTestId('imprimanta')).toContainText('Calculatorul e în aceeași rețea cu imprimanta');
  // Rețeaua căutată e a adreselor știute: ținem una pe R.x, la care nu răspunde nimic.
  await page.evaluate((ip) => {
    localStorage.setItem('cncvs2.imprimanta.retea', JSON.stringify({ v: 1, imprimante: [{ adresa: ip, port: 9999, model: null, nume: null, folosita: 1 }] }));
  }, `${RETEA}.9`);
  const imp = await porneste({ gazda: IP_GASIT });
  await deschide(page);
  await page.locator('[data-imprimanta="cauta"]').click();
  await expect(page.getByTestId('imprimanta-cauta')).toContainText('din 254 adrese');
  await expect(stare(page)).toHaveText('Liberă', { timeout: 100_000 });
  await expect(page.getByTestId('imprimanta-banda')).toContainText(`${IP_GASIT} · prin WiFi`);
  const tinute = await page.evaluate(() => JSON.parse(localStorage.getItem('cncvs2.imprimanta.retea') ?? 'null') as { imprimante: { adresa: string }[] });
  expect(tinute.imprimante.map((x) => x.adresa)).toEqual([IP_GASIT, `${RETEA}.9`]);
  expect(comenziSet(imp)).toEqual([]);
});
