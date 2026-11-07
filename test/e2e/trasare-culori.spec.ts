import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ariePx } from '../../src/jobs/calculTrasare.ts';
import { traseazaCulori } from '../../src/trasare/culori.ts';
import { citestePng } from '../unit/ajutor-png.ts';
import { esantioane } from '../unit/ajutor-trasare.ts';

/**
 * Trasarea pe culori în aplicația construită (ADR 0221, felia 25.2↑): sursa „Culorile”, pastilele, legarea (prin tragere și de
 * la tastatură), bifele, „Importă” cu o piesă pe culoare, aliniate, într-un singur pas. Așteptările vin din nucleul rulat
 * aici, în Node, pe același PNG, cu curățarea implicită a ferestrei: drumul din browser (decodarea, workerul, ușa, documentul)
 * trebuie să dea aceeași paletă și aceleași piese, la aceleași locuri pe foaie.
 */

test.use({ locale: 'ro-RO' });

const MM = 25.4 / 96;

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

/** Ultima versiune salvată în IndexedDB, așteptată până la revizia dată (ca în `trasare.spec.ts`). */
async function documentSalvat(page: Page, rev: number): Promise<{ piese: Array<{ id: string; nume: string }>; foi: Array<{ instante: Array<{ piesa: string; x: number; y: number }> }> }> {
  let text: string | null = null;
  await expect.poll(async () => {
    text = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok, eroare) => {
        const r = indexedDB.open('cncvs2-proiecte', 1);
        r.onsuccess = () => { ok(r.result); };
        r.onerror = () => { eroare(r.error); };
      });
      const v = await new Promise<unknown>((ok, eroare) => {
        const r = db.transaction('versiuni').objectStore('versiuni').openCursor(null, 'prev');
        r.onsuccess = () => { ok(r.result?.value ?? null); };
        r.onerror = () => { eroare(r.error); };
      });
      db.close();
      return typeof v === 'string' ? v : null;
    });
    return text === null ? -1 : (JSON.parse(text) as { rev: number }).rev;
  }).toBeGreaterThanOrEqual(rev);
  return JSON.parse(text ?? '{}') as never;
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
  const doc = await documentSalvat(page, 1);
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
