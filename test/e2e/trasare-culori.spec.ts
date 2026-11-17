import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ariePx } from '../../src/jobs/calculTrasare.ts';
import { traseazaCulori } from '../../src/trasare/culori.ts';
import { traseazaCuloriMediane } from '../../src/trasare/medianeCulori.ts';
import { citestePng } from '../unit/ajutor-png.ts';
import { esantioane } from '../unit/ajutor-trasare.ts';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Trasarea pe culori în aplicația construită (ADR 0221, felia 25.2↑): sursa „Culorile”, pastilele, legarea (prin tragere și de
 * la tastatură), bifele, „Importă” cu o piesă pe culoare, aliniate, într-un singur pas. Așteptările vin din nucleul rulat
 * aici, în Node, pe același PNG, cu curățarea implicită a ferestrei: drumul din browser (decodarea, workerul, ușa, documentul)
 * trebuie să dea aceeași paletă și aceleași piese, la aceleași locuri pe foaie.
 */

test.use({ locale: 'ro-RO' });

const MM = 25.4 / 96;
const zec = (x: number, z: number): string => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: z, maximumFractionDigits: z }).format(x);

/** Paleta și piesele în Node (cu legăturile date), cu colțul stânga-jos al fiecărei piese pe foaie, în mm (Y în sus). */
function inNode(nume: string, legaturi: readonly number[] = []) {
  const img = citestePng(readFileSync(`test/fixtures/trasare/${nume}.png`));
  const p = ariePx(0.3, MM);
  const r = traseazaCulori(img, { numar: null, legaturi, bifate: null, netezime: 'echilibrat', petePx: p, gauriPx: p });
  if (!r.ok) throw new Error(`${nume}: ${r.cod}`);
  const piese = r.piese.map((pc) => {
    const { puncte } = esantioane(pc.cai);
    let x0 = Infinity, y0 = Infinity;
    for (let i = 0; i < puncte.length; i += 2) { x0 = Math.min(x0, (puncte[i] ?? 0) * MM); y0 = Math.min(y0, (img.inaltime - (puncte[i + 1] ?? 0)) * MM); }
    return { culoare: pc.culoare, hex: pc.hex, x0, y0 };
  });
  return { paleta: r.raport.paleta.map((c) => c.hex), piese };
}

const pastila = (page: Page, hex: string) => page.locator(`.trasare-pastila[data-hex="${hex}"]`);

async function logoPeCulori(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/logo-cvs.png');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  // Pragul și Inversează nu au sens pe culori: se ascund.
  await expect(page.locator('[data-camp="trasare-prag"]')).toHaveCount(0);
  await expect(page.locator('[data-camp="trasare-inverseaza"]')).toHaveCount(0);
}

test('logoul pe culori: pastilele ca în Node; portocaliul tras peste albastru se leagă; Importă pune două piese aliniate, într-un pas', async ({ page }) => {
  const n = inNode('logo-cvs');
  await logoPeCulori(page);
  const pastile = page.getByTestId('trasare-pastile').locator('li');
  await expect(pastile).toHaveCount(n.paleta.length);
  expect(n.paleta.length, n.paleta.join(', ')).toBe(3);
  for (const [k, hex] of n.paleta.entries()) await expect(pastile.nth(k)).toHaveAttribute('data-hex', hex);
  await expect(page.getByTestId('trasare-culori-valoare')).toHaveText('3');
  await expect(page.getByTestId('import-piese')).toHaveText('„Importă” adaugă 3 piese, câte una pe culoare, aliniate ca în imagine.');
  // Culorile, după nuanță: portocaliul (roșul cel mai mare) și albastrul (albastrul cel mai mare).
  const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const port = n.paleta.reduce((a, b) => ((rgb(b)[0] ?? 0) > (rgb(a)[0] ?? 0) ? b : a));
  const alb = n.paleta.reduce((a, b) => ((rgb(b)[2] ?? 0) - (rgb(b)[0] ?? 0) > (rgb(a)[2] ?? 0) - (rgb(a)[0] ?? 0) ? b : a));
  await pastila(page, port).dragTo(pastila(page, alb));
  await expect(pastila(page, port).getByTestId('trasare-legata')).toHaveText(`legată de ${alb}`);
  await expect(page.getByTestId('import-piese')).toHaveText('„Importă” adaugă 2 piese, câte una pe culoare, aliniate ca în imagine.');
  const leg = n.paleta.map((h) => (h === port ? n.paleta.indexOf(alb) : -1));
  const m = inNode('logo-cvs', leg);
  expect(m.piese.length).toBe(2);
  await expect(page.locator('[data-buton="importa"]')).toBeEnabled();
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(2);
  const doc = JSON.parse(await documentSalvat(page, 1)) as {
    piese: Array<{ id: string; nume: string }>; foi: Array<{ instante: Array<{ piesa: string; x: number; y: number }> }>;
  };
  // Un singur pas: revizia 1 are ambele piese; fiecare la colțul ei din pagina imaginii, ca în Node.
  const inst = doc.foi[0]?.instante ?? [];
  expect(inst.length).toBe(2);
  for (const q of m.piese) {
    const piesa = doc.piese.find((p) => p.nume === `logo-cvs ${q.hex}`);
    expect(piesa, `${q.hex}: ${doc.piese.map((p) => p.nume).join(', ')}`).toBeTruthy();
    const i = inst.find((x) => x.piesa === piesa?.id);
    expect(i).toBeTruthy();
    expect(Math.abs((i?.x ?? Number.NaN) - q.x0), `${q.hex} x`).toBeLessThan(0.01);
    expect(Math.abs((i?.y ?? Number.NaN) - q.y0), `${q.hex} y`).toBeLessThan(0.01);
  }
  // Un Ctrl+Z le scoate pe amândouă.
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('de la tastatură: „Leagă de…” leagă, „Dezleagă” desface; fără nicio culoare bifată, refuzul spune ce să bifezi', async ({ page }) => {
  const n = inNode('logo-cvs');
  await logoPeCulori(page);
  const [a, b, c] = n.paleta as [string, string, string];
  await pastila(page, c).locator('[data-camp="trasare-leaga"]').selectOption(String(n.paleta.indexOf(a)));
  await expect(pastila(page, c).getByTestId('trasare-legata')).toHaveText(`legată de ${a}`);
  await expect(page.getByTestId('import-piese')).toContainText('2 piese');
  await pastila(page, c).locator('[data-buton="trasare-dezleaga"]').click();
  await expect(pastila(page, c).getByTestId('trasare-legata')).toHaveCount(0);
  await expect(page.getByTestId('import-piese')).toContainText('3 piese');
  // Bifele: fără prima, două piese; fără niciuna, refuzul, cu pastilele încă pe ecran (ca să bifezi din nou).
  await pastila(page, a).locator('[data-camp="trasare-culoare-bifata"]').uncheck();
  await expect(page.getByTestId('import-piese')).toContainText('2 piese');
  await pastila(page, b).locator('[data-camp="trasare-culoare-bifata"]').uncheck();
  await expect(page.getByTestId('import-piese')).toHaveText('„Importă” adaugă 1 piesă, din culoarea bifată.');
  await pastila(page, c).locator('[data-camp="trasare-culoare-bifata"]').uncheck();
  await expect(page.getByTestId('import-refuz')).toHaveText('Nicio culoare de trasat: bifează „Se trasează” la cel puțin o culoare.');
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await expect(page.getByTestId('trasare-pastile').locator('li')).toHaveCount(3);
  await pastila(page, b).locator('[data-camp="trasare-culoare-bifata"]').check();
  await expect(page.getByTestId('import-piese')).toHaveText('„Importă” adaugă 1 piesă, din culoarea bifată.');
  // Alt număr: o reducere nouă, fără legături și cu bifele implicite.
  await page.locator('[data-camp="trasare-culori-automat"]').uncheck();
  await page.locator('[data-camp="trasare-culori-numar"]').fill('4');
  await expect(page.getByTestId('trasare-pastile').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('import-piese')).toContainText('4 piese');
  // Încă o dată, după o bifă scoasă: numărul nou nu păstrează bifa veche.
  await page.getByTestId('trasare-pastile').locator('li').first().locator('[data-camp="trasare-culoare-bifata"]').uncheck();
  await expect(page.getByTestId('import-piese')).toContainText('3 piese');
  await page.locator('[data-camp="trasare-culori-numar"]').fill('5');
  await expect(page.getByTestId('trasare-pastile').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('import-piese')).toContainText('5 piese');
});

test('un cerc alb pe transparent (lecția D7), pe culori: o pastilă, transparentul nu e culoare; cercul e o piesă', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/cerc-alb-transparent.png');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  await expect(page.getByTestId('trasare-pastile').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('trasare-pastile').locator('li')).toHaveAttribute('data-hex', '#ffffff');
  await expect(page.getByTestId('import-piese')).toHaveText('„Importă” adaugă 1 piesă, din culoarea bifată.');
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  // Pe o imagine opacă, culoarea marginii e fundalul, nebifată: cercul negru pe alb e singura piesă.
  await page.locator('[data-buton="renunta"]').click();
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/cerc-opac-alb.png');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  const fundal = page.getByTestId('trasare-pastile').locator('li', { hasText: 'fundalul' });
  await expect(fundal).toHaveCount(1);
  await expect(fundal.locator('[data-camp="trasare-culoare-bifata"]')).not.toBeChecked();
  await expect(page.getByTestId('import-piese')).toHaveText('„Importă” adaugă 1 piesă, din culoarea bifată.');
});

test('pe culori, alt număr în timpul trasării unei poze: calculul vechi se oprește fără răspuns, cel nou răspunde', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const w = window as unknown as { workere: Array<{ nume: string; pornit: number; raspuns: number; oprit: number }> };
    w.workere = [];
    const W = window.Worker;
    window.Worker = class extends W {
      readonly ceas: { nume: string; pornit: number; raspuns: number; oprit: number };
      constructor(u: string | URL, o?: WorkerOptions) {
        super(u, o);
        this.ceas = { nume: o?.name ?? '', pornit: performance.now(), raspuns: Number.NaN, oprit: Number.NaN };
        w.workere.push(this.ceas);
        this.addEventListener('message', () => { if (Number.isNaN(this.ceas.raspuns)) this.ceas.raspuns = performance.now(); });
      }
      override terminate(): void {
        if (Number.isNaN(this.ceas.oprit)) this.ceas.oprit = performance.now();
        super.terminate();
      }
    };
  });
  const trasari = async (): Promise<Array<{ pornit: number; raspuns: number; oprit: number }>> => page.evaluate(() =>
    (window as unknown as { workere: Array<{ nume: string; pornit: number; raspuns: number; oprit: number }> }).workere.filter((x) => x.nume === 'trasare'));
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  // O poză color de 2400 × 1600 (trei nuanțe care se amestecă lin, cu zgomot), generată în pagină.
  await page.evaluate(async () => {
    const W = 2400, H = 1600, c = new OffscreenCanvas(W, H), g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    const img = g.createImageData(W, H);
    let s = 777;
    const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = 0.5 + 0.5 * Math.sin(x / 41 + 2 * Math.sin(y / 53)), v = 0.5 + 0.5 * Math.cos(y / 37 + 2 * Math.sin(x / 59));
        const i = 4 * (y * W + x), z = 12 * (r() - 0.5);
        img.data[i] = 30 + 200 * u + z; img.data[i + 1] = 60 + 120 * v + z; img.data[i + 2] = 200 - 150 * u * v + z; img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'poza.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  // Întâi trasarea alb-negru (workerul ei pornit), apoi sursa „Culorile”: a doua trasare, pe culori.
  await expect.poll(async () => (await trasari()).length, { timeout: 30_000 }).toBe(1);
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  await expect.poll(async () => (await trasari()).length).toBe(2);
  await page.locator('[data-camp="trasare-culori-automat"]').uncheck();
  await expect.poll(async () => (await trasari()).length, { timeout: 30_000 }).toBe(3);
  await expect(page.getByTestId('trasare-trasez')).toHaveCount(0, { timeout: 90_000 });
  const t = await trasari();
  const [, vechi, nou] = t as [unknown, { pornit: number; raspuns: number; oprit: number }, { pornit: number; raspuns: number; oprit: number }];
  expect(Number.isNaN(vechi.raspuns), 'calculul vechi pe culori s-a oprit fără răspuns').toBe(true);
  expect(vechi.oprit - nou.pornit, 'oprit chiar la schimbare').toBeLessThan(100);
  expect(Number.isNaN(nou.raspuns), 'calculul nou a răspuns').toBe(false);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

/**
 * Desenul cu linii colorate (ADR 0227), făcut în pagină (canvas, 600 × 400, trăsături de 6 px): o linie roșie tăiată de o
 * linie albastră și de două ori de un cerc verde, desenate peste ea; un pătrat galben plin cu marginea neagră. Octeții PNG-ului,
 * pentru nucleul din Node și pentru fereastră.
 */
async function desenLiniiColorate(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = new OffscreenCanvas(600, 400);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    g.fillStyle = 'rgb(242, 240, 234)';
    g.fillRect(0, 0, 600, 400);
    g.lineWidth = 6;
    g.lineCap = 'round';
    const linie = (culoare: string, f: () => void): void => { g.strokeStyle = culoare; g.beginPath(); f(); g.stroke(); };
    linie('rgb(196, 38, 42)', () => { g.moveTo(50, 200); g.lineTo(550, 200); });
    linie('rgb(38, 72, 186)', () => { g.moveTo(300, 50); g.lineTo(300, 350); });
    linie('rgb(44, 146, 70)', () => { g.arc(150, 200, 80, 0, 2 * Math.PI); });
    g.fillStyle = 'rgb(236, 196, 36)';
    g.fillRect(390, 240, 120, 120);
    linie('rgb(28, 26, 30)', () => { g.rect(390, 240, 120, 120); });
    const u = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
    let t = '';
    for (const x of u) t += String.fromCharCode(x);
    return btoa(t);
  });
  return Buffer.from(b64, 'base64');
}

/** Liniile mediane pe culori în Node, cu opțiunile implicite ale ferestrei: piesele și câte căi se taie pe linie. */
function medianeInNode(png: Buffer, leaga: boolean) {
  const p = ariePx(0.3, MM);
  const r = traseazaCuloriMediane(citestePng(new Uint8Array(png)), { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: p, gauriPx: p },
    { capete: 'centru', late: 'mediane', pragLatPx: null, semnaleaza: true, bucle: 'linie', leaga });
  if (!r.ok) throw new Error(r.cod);
  let peLinie = 0;
  for (const pc of r.piese) for (let k = 0; k + 1 < pc.cai.inceput.length; k++) if (pc.cai.deschisa?.[k] === 1 || pc.cai.peLinie?.[k] !== 0) peLinie++;
  return { r, peLinie };
}

test('liniile mediane pe culori (ADR 0227): Rezultatul și pe Culori; legarea peste alte culori, bifată; grosimea în pastile; Importă pune piesele pe linie', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  const png = await desenLiniiColorate(page);
  const cu = medianeInNode(png, true), fara = medianeInNode(png, false);
  // În Node, pe același PNG: roșul, rupt de albastru și de două ori de verde, legat peste ele într-o singură cale.
  expect(cu.r.raport.mediane.legaturi).toBe(3);
  expect(fara.peLinie - cu.peLinie).toBe(3);
  const linii = (n: number): string => (n === 1 ? '1 linie mediană' : `${n} linii mediane`);
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'linii.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  await expect(page.locator('[data-camp="trasare-leaga-culori"]')).toHaveCount(0);
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  await expect(page.locator('[data-camp="trasare-leaga-culori"]')).toBeChecked();
  await expect(page.getByTestId('trasare-legaturi')).toHaveText('3 legături peste alte culori');
  await expect(page.getByTestId('import-deschise')).toContainText(linii(cu.peLinie));
  await expect(page.getByTestId('import-piese')).toHaveText(`„Importă” adaugă ${cu.r.piese.length} piese, câte una pe culoare, aliniate ca în imagine.`);
  // Grosimea fiecărei culori, în pastila ei (fără freză pe foaie, doar grosimea); grosimea desenului întreg nu mai e în raport.
  for (const pc of cu.r.piese) {
    if (!('grosime' in pc)) throw new Error(`${pc.hex}: piesa nu e pe linii mediane`);
    await expect(pastila(page, pc.hex).getByTestId('trasare-pastila-grosime')).toHaveText(`trăsătura: ${zec(pc.grosime * MM, 2)} mm`);
  }
  await expect(page.getByTestId('trasare-grosime')).toHaveCount(0);
  // Fără legare, roșul iese în patru bucăți; înapoi, o singură cale.
  await page.locator('[data-camp="trasare-leaga-culori"]').uncheck();
  await expect(page.getByTestId('import-deschise')).toContainText(linii(fara.peLinie));
  await expect(page.getByTestId('trasare-legaturi')).toHaveCount(0);
  await page.locator('[data-camp="trasare-leaga-culori"]').check();
  await expect(page.getByTestId('import-deschise')).toContainText(linii(cu.peLinie));
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = JSON.parse(await documentSalvat(page, 1)) as { piese: Array<{ nume: string; operatii: Array<{ id: string; latura: string }> }> };
  expect(doc.piese.length).toBe(cu.r.piese.length);
  // Fiecare piesă, cu numele culorii, tăiată pe linie.
  for (const pc of cu.r.piese) {
    const piesa = doc.piese.find((x) => x.nume === `linii ${pc.hex}`);
    expect(piesa?.operatii.map((o) => [o.id, o.latura]), `${pc.hex}: ${doc.piese.map((x) => x.nume).join(', ')}`).toEqual([['deschise', 'pe-linie']]);
  }
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

/** Amestecul în Node (ADR 0228): culorile alese pe linii mediane, celelalte pe contururi, cu opțiunile implicite ale ferestrei. */
function amestecInNode(png: Buffer, peLinie: (hex: string) => boolean) {
  const img = citestePng(new Uint8Array(png));
  const p = ariePx(0.3, MM);
  const oc = { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: p, gauriPx: p } as const;
  const e = traseazaCulori(img, { ...oc, doarEtichete: true });
  if (!e.ok) throw new Error(e.cod);
  const r = traseazaCuloriMediane(img, { ...oc, peLinii: e.raport.paleta.map((c) => !c.fundal && peLinie(c.hex)) },
    { capete: 'centru', late: 'mediane', pragLatPx: null, semnaleaza: true, bucle: 'linie', leaga: true });
  if (!r.ok) throw new Error(r.cod);
  return { paleta: e.raport.paleta.map((c) => c.hex), r };
}
/** Culoarea din paletă cea mai apropiată de `rgb`. */
function celMaiAproape(paleta: readonly string[], rgb: readonly number[]): string {
  let bun = '', d = Infinity;
  for (const h of paleta) {
    const e = [1, 3, 5].reduce((s, i, j) => s + (parseInt(h.slice(i, i + 2), 16) - (rgb[j] ?? 0)) ** 2, 0);
    if (e < d) { d = e; bun = h; }
  }
  return bun;
}

test('rezultatul pe fiecare culoare (ADR 0228): în pastilă, galbenul pe Contururi, roșul pe Linii mediane; un număr nou le șterge; Importă, fiecare piesă cu felul ei', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  const png = await desenLiniiColorate(page);
  const toate = amestecInNode(png, () => true);
  const galben = celMaiAproape(toate.paleta, [236, 196, 36]), rosu = celMaiAproape(toate.paleta, [196, 38, 42]);
  const a = amestecInNode(png, (h) => h !== galben), b = amestecInNode(png, (h) => h === rosu);
  // În Node: galbenul pe contururi e o piesă (pe linii, un punct); roșul singur pe linii, legat peste culorile pe contururi.
  expect([toate.r.piese.length, a.r.piese.length, b.r.piese.length]).toEqual([4, 5, 5]);
  expect(b.r.raport.mediane.legaturi).toBe(3);
  const piese = (n: number): string => `„Importă” adaugă ${n} piese, câte una pe culoare, aliniate ca în imagine.`;
  const liste = page.locator('[data-camp="trasare-culoare-rezultat"]');
  const fel = (hex: string) => pastila(page, hex).locator('[data-camp="trasare-culoare-rezultat"]');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'linii.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  await expect(page.getByTestId('import-piese')).toHaveText(piese(4));
  // Lista din pastila fiecărei culori (răspunsul 2a), implicit „Ca Rezultatul” (răspunsul 1a).
  await expect(liste).toHaveCount(toate.paleta.length);
  await expect(fel(galben)).toHaveValue('ca');
  await fel(galben).selectOption('contururi');
  await expect(fel(galben)).toHaveValue('contururi');
  await expect(page.getByTestId('import-piese')).toHaveText(piese(5));
  await expect(pastila(page, galben).getByTestId('trasare-pastila-grosime')).toHaveCount(0);
  await expect(pastila(page, rosu).getByTestId('trasare-pastila-grosime')).toBeVisible();
  // Un număr nou de culori șterge felurile, ca bifele și legăturile: din „Automat”, apoi din glisor.
  const valori = () => liste.evaluateAll((e) => e.map((x) => (x as HTMLSelectElement).value).join(' '));
  await page.locator('[data-camp="trasare-culori-automat"]').uncheck();
  await expect.poll(valori).toBe(toate.paleta.map(() => 'ca').join(' '));
  await expect(page.getByTestId('import-piese')).toHaveText(piese(4));
  await liste.first().selectOption('contururi');
  await expect(liste.first()).toHaveValue('contururi');
  await page.locator('[data-camp="trasare-culori-numar"]').fill('5');
  await expect.poll(valori).toBe('ca ca ca ca ca');
  await page.locator('[data-camp="trasare-culori-automat"]').check();
  await expect(liste).toHaveCount(toate.paleta.length);
  // Rezultatul: Contururi: opțiunile liniilor dispar.
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('contururi');
  await expect(page.getByTestId('trasare-optiuni-mediane')).toHaveCount(0);
  // O culoare legată ia felul primei: verdele pe Linii mediane, legat de roșu, își pierde alegerea (opțiunile liniilor dispar).
  const verde = celMaiAproape(toate.paleta, [44, 146, 70]);
  await fel(verde).selectOption('mediane');
  await expect(page.getByTestId('trasare-optiuni-mediane')).toBeVisible();
  await pastila(page, verde).locator('[data-camp="trasare-leaga"]').selectOption({ label: rosu });
  await expect(pastila(page, verde).getByTestId('trasare-legata')).toHaveText(`legată de ${rosu}`);
  await expect(page.getByTestId('trasare-optiuni-mediane')).toHaveCount(0);
  await pastila(page, verde).locator('[data-buton="trasare-dezleaga"]').click();
  await expect(fel(verde)).toHaveValue('ca');
  // Roșul pe Linii mediane: opțiunile liniilor apar (cu legarea), grosimea doar la roșu.
  await fel(rosu).selectOption('mediane');
  await expect(page.getByTestId('trasare-optiuni-mediane')).toBeVisible();
  await expect(page.getByTestId('trasare-legaturi')).toHaveText('3 legături peste alte culori');
  await expect(page.getByTestId('import-piese')).toHaveText(piese(5));
  await expect(pastila(page, rosu).getByTestId('trasare-pastila-grosime')).toBeVisible();
  await expect(pastila(page, galben).getByTestId('trasare-pastila-grosime')).toHaveCount(0);
  // Și galbenul pe Linii mediane: pragul vine din grosimea liniei roșii, deci pătratul e o parte lată, semnalată pe
  // previzualizare; „Arată părțile late” o scoate. Desenul, comparat după ce s-a liniștit (aceiași pixeli la 400 ms).
  await fel(galben).selectOption('mediane');
  await expect(page.getByTestId('trasare-parti')).toContainText('1 parte lată');
  const panza = page.getByTestId('trasare-previzualizare');
  const linistit = async (): Promise<string> => {
    await expect(page.getByTestId('trasare-trasez')).toHaveCount(0);
    let x = await panza.evaluate((c) => (c as HTMLCanvasElement).toDataURL());
    for (;;) {
      await page.waitForTimeout(400);
      const y = await panza.evaluate((c) => (c as HTMLCanvasElement).toDataURL());
      if (y === x) return y;
      x = y;
    }
  };
  const cuLate = await linistit();
  await page.locator('[data-camp="trasare-arata-late"]').uncheck();
  await expect(page.getByTestId('trasare-parti')).toHaveCount(0);
  expect(await linistit()).not.toBe(cuLate);
  await page.locator('[data-camp="trasare-arata-late"]').check();
  await fel(galben).selectOption('ca');
  await expect(page.getByTestId('import-piese')).toHaveText(piese(5));
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = JSON.parse(await documentSalvat(page, 1)) as { piese: Array<{ nume: string; operatii: Array<{ id: string; latura: string }> }> };
  expect(doc.piese.length).toBe(5);
  // Fiecare piesă cu felul culorii ei: roșul pe linie; celelalte, contururi pe exterior (și pe interior, la inele).
  for (const pc of b.r.piese) {
    const piesa = doc.piese.find((x) => x.nume === `linii ${pc.hex}`);
    const ext = Array.from(pc.cai.exterior);
    const asteptat = pc.cai.deschisa ? [['deschise', 'pe-linie']]
      : [...(ext.includes(1) ? [['exterior', 'exterior']] : []), ...(ext.includes(0) ? [['interior', 'interior']] : [])];
    expect(piesa?.operatii.map((o) => [o.id, o.latura]), `${pc.hex}: ${doc.piese.map((x) => x.nume).join(', ')}`).toEqual(asteptat);
  }
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
