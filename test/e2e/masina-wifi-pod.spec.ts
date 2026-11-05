import { expect, test, type Page } from '@playwright/test';
import { pornesteControler, type ControlerWebSocket } from './controlerWebSocket.ts';

/**
 * Conectarea prin WiFi, mai ușoară (ADR 0136, felia 3.6f), în Edge, cu podul ESP3D 3.0.2 simulat (`controlerWebSocket.ts`, cu
 * `pod`): asistentul (podul verificat în rețeaua lui, rețeaua atelierului cu parolele trimise doar lui, apoi găsit după nume și
 * ținut cu ambele drumuri), „Caută mașina” (după nume; ultimul IP ca rezervă; pașii unui eșec) și „Caută în toată rețeaua”.
 *
 * Browserul rezolvă `esp3d.local` la 127.0.0.1 și refuză pe loc celelalte nume `.local` (regulile lui de rezolvare), iar podul
 * din rețeaua atelierului ascultă pe 8282, portul lui de date: de aceea probele merg pe rând. Căutarea în toată rețeaua merge pe
 * 127.0.0.x, rețeaua conexiunii ținute, cu podul la 127.0.0.47. După multe încercări fără răspuns, browserul întârzie fiecare
 * WebSocket nou cu 1–5 s (pe proces): legarea de după căutare are timp pe măsură.
 */
test.use({ locale: 'ro-RO', launchOptions: { args: ['--host-resolver-rules=MAP esp3d.local 127.0.0.1, MAP *.local ~NOTFOUND'] } });
test.describe.configure({ mode: 'serial' });

const pornite: ControlerWebSocket[] = [];
const porneste = async (o: Parameters<typeof pornesteControler>[0]): Promise<ControlerWebSocket> => {
  const c = await pornesteControler(o);
  pornite.push(c);
  return c;
};
test.afterEach(async () => { await Promise.all(pornite.splice(0).map((c) => c.inchide())); });

type Tinuta = { readonly profil: string; readonly adresa: string; readonly port: number; readonly drum: string; readonly retea: string | null; readonly ultimIp: string | null };
const tinute = async (page: Page): Promise<{ readonly v: number; readonly conexiuni: readonly Tinuta[] }> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('cncvs2.masina.retea') ?? 'null') as { v: number; conexiuni: Tinuta[] });
const fara = ({ adresa, port, drum, retea, ultimIp }: Tinuta): Omit<Tinuta, 'profil'> => ({ adresa, port, drum, retea, ultimIp });
const deschideAlegerea = async (page: Page): Promise<void> => {
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="conecteaza-wifi"]').click();
};
const tine = (page: Page, conexiuni: readonly Tinuta[]): Promise<void> => page.evaluate((c) => {
  localStorage.setItem('cncvs2.masina.retea', JSON.stringify({ v: 2, conexiuni: c.map((x, k) => ({ ...x, folosita: c.length - k })), formular: null }));
}, conexiuni);

test('pod nou: verificat în rețeaua lui, rețeaua atelierului cu parolele trimise doar lui, găsit la esp3d.local și ținut cu ambele drumuri', async ({ page }) => {
  test.setTimeout(90_000);
  // Ținut într-un obiect: atribuirea vine dintr-o chemare a podului, pe care analiza tipurilor n-o vede.
  const pornit: { atelier: Promise<ControlerWebSocket> | null } = { atelier: null };
  const ap = await porneste({
    pod: {
      mod: 'AP', ip: '192.168.0.1',
      retele: [{ ssid: 'Vecin-5G', semnal: 40, protejata: true }, { ssid: 'Atelier COSTEL', semnal: 87, protejata: true }, { ssid: 'Musafiri', semnal: 20, protejata: false }],
      // Podul trece în rețeaua atelierului: acolo răspunde la esp3d.local, pe portul de date, după o repornire de ~1,5 s.
      laAtelier: () => {
        pornit.atelier ??= new Promise((r) => { setTimeout(() => { void porneste({ port: 8282, pod: { mod: 'STA', ip: '192.168.1.47' } }).then(r); }, 1500); });
      },
    },
  });
  await page.goto('/');
  await deschideAlegerea(page);
  await expect(page.getByTestId('masina-wifi')).toContainText('Nicio mașină ținută încă');
  await page.locator('[data-masina="wifi-pod"]').click();
  await expect(page.getByTestId('masina-pod-pas')).toHaveText('Pod nou · pasul 1 din 3');
  await expect(page.locator('[data-masina="pod-adresa"]')).toHaveValue('192.168.0.1:8282');
  await page.locator('[data-masina="pod-adresa"]').fill(`127.0.0.1:${ap.port}`);
  await page.locator('[data-masina="pod-verifica"]').click();
  await expect(page.getByTestId('masina-pod-raspunde')).toHaveText(`Podul răspunde la 127.0.0.1:${ap.port}: ESP3D 3.0.2, ținta grbl. Drumul direct, prin rețeaua lui, rămâne ținut.`);
  await page.locator('[data-masina="pod-continua"]').click();
  // Rețelele văzute de pod, cele puternice întâi (prima, aleasă), apoi una ascunsă.
  await expect(page.locator('.masina-pod-retea')).toHaveText([/^Atelier COSTELsemnal 87 %cu parolă$/, /^Vecin-5G/, /^Musafirisemnal 20 %liberă$/, /^Altă rețea/]);
  await expect(page.locator('[data-masina="pod-retea"][value="Atelier COSTEL"]')).toBeChecked();
  // O valoare pe care podul ar refuza-o nu pleacă: nimic trimis după lista rețelelor.
  await page.locator('[data-masina="pod-parola"]').fill('parola atelier 1');
  await page.locator('[data-masina="pod-parola-pod"]').fill('scurt');
  await page.locator('[data-masina="pod-trimite"]').click();
  await expect(page.getByTestId('masina-pod-refuz')).toHaveText('Parola nouă a podului are sub 8 caractere.');
  expect(ap.comenziEsp()).toEqual(['[ESP800] json\n', '[ESP105] json\n', '[ESP410]\n']);
  await page.locator('[data-masina="pod-parola-pod"]').fill('pod\\nou 123');
  await page.locator('[data-masina="pod-trimite"]').click();
  await expect(page.getByTestId('masina-pod-pas')).toHaveText('Pod nou · pasul 3 din 3');
  await expect(page.locator('.masina-wifi h4')).toHaveText('Leagă calculatorul înapoi la rețeaua „Atelier COSTEL”');
  // Comenzile, octet cu octet: spațiul și `\` scrise cu `\` în față, trecerea la urmă.
  expect(ap.comenziEsp()).toEqual([
    '[ESP800] json\n', '[ESP105] json\n', '[ESP410]\n', '[ESP106]pod\\\\nou\\ 123 json\n', '[ESP100]Atelier\\ COSTEL json\n',
    '[ESP101]parola\\ atelier\\ 1 json\n', '[ESP110]WIFI-STA json\n',
  ]);
  await expect(page.getByTestId('masina-pod-gasit')).toContainText('Găsit: podul, la esp3d.local · IP 192.168.1.47', { timeout: 30_000 });
  const s = await tinute(page);
  expect(s.v).toBe(2);
  expect(s.conexiuni.map(fara)).toEqual([
    { adresa: 'esp3d.local', port: 8282, drum: 'atelier', retea: 'Atelier COSTEL', ultimIp: '192.168.1.47' },
    { adresa: '127.0.0.1', port: ap.port, drum: 'proprie', retea: 'ESP3D', ultimIp: null },
  ]);
  // Parolele nu rămân în pagină: nici în stocare, nici în câmpuri.
  const urme = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage }, c: [...document.querySelectorAll('input')].map((i) => i.value) }));
  for (const p of ['parola atelier', 'nou 123']) expect(urme).not.toContain(p);

  await page.locator('[data-masina="pod-conecteaza"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Conectat prin WiFi (esp3d.local:8282)', { timeout: 20_000 });
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.getByTestId('masina-jurnal')).not.toContainText('currentID');
  await expect(page.getByTestId('masina-jurnal')).not.toContainText('"cmd"');
  const b = await pornit.atelier;
  // Podul din rețeaua atelierului: proba lui ([ESP800]) și sesiunea (care trimite doar G-code și timpul real, nicio comandă a podului).
  expect(b?.comenziEsp()).toEqual(['[ESP800] json\n', '[ESP800] json\n']);
  // Lista arată ambele drumuri, cu rețelele lor; cel folosit, primul.
  await page.locator('[data-masina="deconecteaza"]').click();
  await page.locator('[data-masina="conecteaza-wifi"]').click();
  await expect(page.getByTestId('masina-wifi-tinute').locator('strong')).toHaveText(['Prin rețeaua „Atelier COSTEL”', 'Direct, prin rețeaua „ESP3D” a mașinii']);
  await expect(page.getByTestId('masina-wifi-tinute').locator('li').first()).toContainText('Pod ESP3D (GRBL) · esp3d.local:8282 · ultimul IP 192.168.1.47');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('Caută mașina: podul găsit după nume, legat și ținut; ultimul IP, rezerva unui nume care nu se rezolvă; un eșec își spune pașii', async ({ page }) => {
  test.setTimeout(90_000);
  const b = await porneste({ port: 8282, pod: { mod: 'STA', ip: '192.168.1.47' } });
  await page.goto('/');
  await deschideAlegerea(page);
  await page.locator('[data-masina="wifi-cauta"]').click();
  const rand = page.locator('[data-gazda="esp3d.local"]');
  await expect(rand).toHaveAttribute('data-stare', 'gasit', { timeout: 20_000 });
  await expect(rand).toContainText('Răspunde: pod ESP3D 3.0.2, ținta grbl · IP 192.168.1.47');
  await expect(page.locator('[data-gazda="fluidnc.local"]')).toHaveAttribute('data-stare', 'nu');
  await rand.locator('[data-masina="wifi-gasita"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Conectat prin WiFi (esp3d.local:8282)', { timeout: 20_000 });
  // Podului i s-a trimis doar [ESP800] (căutarea, apoi proba legăturii).
  expect(new Set(b.comenziEsp())).toEqual(new Set(['[ESP800] json\n']));
  expect((await tinute(page)).conexiuni.map(fara)).toEqual([{ adresa: 'esp3d.local', port: 8282, drum: 'atelier', retea: null, ultimIp: '192.168.1.47' }]);
  await page.locator('[data-masina="deconecteaza"]').click();

  // Numele nu se rezolvă: ultimul IP răspunde; adresa arată pe unde s-a legat.
  await tine(page, [
    { profil: 'esp3d', adresa: 'pod-absent.local', port: 8282, drum: 'atelier', retea: 'Atelier', ultimIp: '127.0.0.1' },
    { profil: 'esp3d', adresa: 'nimeni.local', port: 8282, drum: 'atelier', retea: 'Atelier', ultimIp: null },
  ]);
  await page.locator('[data-masina="conecteaza-wifi"]').click();
  await page.getByTestId('masina-wifi-tinute').locator('li').first().locator('[data-masina="wifi-tinuta"]').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Conectat prin WiFi (127.0.0.1:8282)', { timeout: 30_000 });
  await page.locator('[data-masina="deconecteaza"]').click();

  // Nici numele, nici un IP: ce s-a încercat și ce verifici, cu pagina controlerului.
  await page.locator('[data-masina="conecteaza-wifi"]').click();
  await page.getByTestId('masina-wifi-tinute').locator('li').nth(1).locator('[data-masina="wifi-tinuta"]').click();
  const d = page.getByTestId('masina-wifi-diagnoza');
  await expect(d).toHaveAttribute('data-motiv', /^retea-(?:nedeschis|timp)$/, { timeout: 30_000 });
  await expect(d).toContainText('Nu m-am conectat: Prin rețeaua „Atelier”');
  await expect(d).toContainText('Am încercat nimeni.local:8282.');
  await expect(d).toContainText('Calculatorul e în rețeaua „Atelier”?');
  await expect(d.locator('a')).toHaveAttribute('href', 'http://nimeni.local');
  // Uită: conexiunea iese din listă (și din stocare).
  await page.getByTestId('masina-wifi-tinute').locator('li').nth(1).locator('[data-masina="wifi-uita"]').click();
  await expect(page.getByTestId('masina-wifi-tinute').locator('li')).toHaveCount(1);
  expect((await tinute(page)).conexiuni.map((c) => c.adresa)).toEqual(['pod-absent.local']);
});

test('Caută în toată rețeaua: rețeaua conexiunii ținute, gazdă cu gazdă, până la prima mașină găsită', async ({ page }) => {
  test.setTimeout(120_000);
  const b = await porneste({ port: 8282, gazda: '127.0.0.47', pod: { mod: 'STA', ip: '127.0.0.47' } });
  await page.goto('/');
  await tine(page, [{ profil: 'esp3d', adresa: '127.0.0.1', port: 8282, drum: 'adresa', retea: null, ultimIp: null }]);
  await deschideAlegerea(page);
  await page.locator('[data-masina="wifi-cauta"]').click();
  await page.locator('[data-masina="wifi-scaneaza"]').click();
  const s = page.getByTestId('masina-wifi-scanare');
  await expect(s).toHaveAttribute('data-gata', 'da', { timeout: 90_000 });
  const rand = s.locator('[data-gazda="127.0.0.47"]');
  await expect(rand).toContainText('Răspunde: pod ESP3D 3.0.2, ținta grbl · IP 127.0.0.47');
  expect(b.comenziEsp()).toEqual(['[ESP800] json\n']);
  await rand.locator('[data-masina="wifi-gasita"]').click();
  // Proba și transportul, fiecare cu întârzierea browserului (până la 5 s) după încercările căutării.
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Conectat prin WiFi (127.0.0.47:8282)', { timeout: 30_000 });
  expect((await tinute(page)).conexiuni.map((c) => [c.adresa, c.drum])).toEqual([['127.0.0.47', 'atelier'], ['127.0.0.1', 'adresa']]);
});
