import { test, expect, type Page } from '@playwright/test';
import { omografie } from '../../src/trasare/colturi.ts';
import { colturiFoaie, FOAIE_A4, FORME_FOAIE, type CumFoaie } from '../unit/ajutor-poze.ts';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Foaia pozată oblic (ADR 0225, felia 25.5↑) în aplicația construită: sugestia raportului, „Îndreaptă foaia” cu A4 (pagina e
 * foaia, formele au mărimea lor), butonul Colțurile cu mânerele trase cu mausul și „Găsește singur”, formatele („Din poză”,
 * „Alt format”, Letter, cu avertismentul proporțiilor), un scan (foaia negăsită) și o imagine transparentă (fără grup). Poza
 * e desenată în pagină: o foaie A4 cu un pătrat de 60 mm, un disc de 50, un dreptunghi de 120 × 25 și un inel de 70 / 50,
 * pusă pe o masă și pozată cu o cameră pinhole (colțurile din generatorul probelor unitare), luminată dintr-o parte.
 */

test.use({ locale: 'ro-RO' });

const CAMERA: CumFoaie = { W: 1200, H: 900, focala: 1050, inclinare: 25, rotire: 8, laterala: 5, dist: 440 };
const COLTURI = colturiFoaie(CAMERA);
const CINCI = '5 contururi închise: 4 tăiate pe exterior, 1 pe interior (după sensul fiecărui contur)';

async function alegePoza(page: Page, fel: 'oblica' | 'scan' | 'transparenta'): Promise<void> {
  const inv = omografie(COLTURI, [[0, 0], [FOAIE_A4.w, 0], [FOAIE_A4.w, FOAIE_A4.h], [0, FOAIE_A4.h]]);
  if (!inv) throw new Error('fără omografie');
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  await page.evaluate(async ([fel, W, H, inv, forme, fw, fh]) => {
    const c = new OffscreenCanvas(W, H);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    if (fel === 'transparenta') {
      g.fillStyle = '#000000';
      g.beginPath();
      g.arc(W / 2, H / 2, 150, 0, 2 * Math.PI);
      g.fill();
    } else {
      const dist = (f: (typeof forme)[number], x: number, y: number): number => {
        const dx = x - f.cx, dy = y - f.cy;
        if (f.fel === 'disc') return Math.hypot(dx, dy) - f.a;
        if (f.fel === 'inel') { const r = Math.hypot(dx, dy); return Math.max(r - f.a, f.b - r); }
        const qx = Math.abs(dx) - f.a / 2, qy = Math.abs(dy) - f.b / 2;
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
      };
      const d = g.createImageData(W, H);
      const [h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0, h7 = 0, h8 = 1] = inv;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let t = 0;
          for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 2; i++) {
              const px = x + 0.25 + 0.5 * i, py = y + 0.25 + 0.5 * j, w = h6 * px + h7 * py + h8;
              const u = (h0 * px + h1 * py + h2) / w, v = (h3 * px + h4 * py + h5) / w;
              const peFoaie = fel === 'scan' || (u >= 0 && v >= 0 && u <= fw && v <= fh);
              t += peFoaie ? (forme.some((f) => dist(f, u, v) <= 0) ? 0.12 : 0.93) : 0.2 + 0.05 * Math.sin(x * 0.07 + y * 0.013);
            }
          }
          const b = Math.round(255 * Math.min(1, ((1 - 0.35 * (x / W) - 0.15 * (y / H)) * t) / 4));
          d.data[4 * (y * W + x)] = b; d.data[4 * (y * W + x) + 1] = b; d.data[4 * (y * W + x) + 2] = b; d.data[4 * (y * W + x) + 3] = 255;
        }
      }
      g.putImageData(d, 0, 0);
    }
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], `${fel}.png`, { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  }, [fel, CAMERA.W, CAMERA.H, [...inv], FORME_FOAIE, FOAIE_A4.w, FOAIE_A4.h] as const);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
}

/** Punctul (x, y) al pozei, pe ecran, în previzualizarea încadrată (cu butonul Colțurile apăsat, previzualizarea e poza). */
async function peEcran(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const b = await page.getByTestId('trasare-previzualizare').boundingBox();
  if (!b) throw new Error('fără previzualizare');
  const s = Math.min(b.width / CAMERA.W, b.height / CAMERA.H) * 0.95;
  return { x: b.x + b.width / 2 + (x - CAMERA.W / 2) * s, y: b.y + b.height / 2 + (y - CAMERA.H / 2) * s };
}

/** Luminozitatea medie (0–255) a previzualizării în punctul (fx, fy) al imaginii încadrate, ca fracțiuni din lățimea și
 *  înălțimea ei (cu proporțiile `latime` / `inaltime`), pe 3 × 3 pixeli. */
async function luminaLa(page: Page, fx: number, fy: number, latime: number, inaltime: number): Promise<number> {
  return page.evaluate(([fx, fy, W, H]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="trasare-previzualizare"]');
    const g = c?.getContext('2d');
    if (!c || !g) throw new Error('fără previzualizare');
    const k = window.devicePixelRatio || 1, s = Math.min(c.clientWidth / W, c.clientHeight / H) * 0.95;
    const px = Math.round((c.clientWidth / 2 + (fx - 0.5) * W * s) * k), py = Math.round((c.clientHeight / 2 + (fy - 0.5) * H * s) * k);
    const d = g.getImageData(px - 1, py - 1, 3, 3).data;
    let t = 0;
    for (let i = 0; i < d.length; i += 4) t += 0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0);
    return t / 9;
  }, [fx, fy, latime, inaltime] as const);
}

/** Mărimea piesei din fereastră, în mm. */
async function marime(page: Page): Promise<[number, number]> {
  const t = (await page.getByTestId('import-marime').textContent()) ?? '';
  const m = /([\d.,]+) × ([\d.,]+) mm/.exec(t);
  if (!m) throw new Error(`mărimea: ${t}`);
  return [Number((m[1] ?? '').replace(',', '.')), Number((m[2] ?? '').replace(',', '.'))];
}

test('o foaie pozată oblic: raportul sugerează îndreptarea; îndreptată, are mărimea A4 și formele mărimea lor; Importă', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'oblica');
  await expect(page.getByTestId('trasare-sugestie-foaie')).toHaveText('Pare o foaie pozată oblic: bifează „Îndreaptă foaia” ca s-o îndrepți și să ia mărimea adevărată.');
  await expect(page.locator('[data-camp="trasare-format"]')).toHaveCount(0);
  await expect(page.locator('[data-buton="trasare-colturi"]')).toHaveCount(0);
  await expect(page.getByTestId('trasare-scara')).toContainText('presupus');
  await page.locator('[data-camp="trasare-foaie"]').check();
  await expect(page.locator('[data-camp="trasare-format"]')).toHaveValue('a4');
  await expect(page.getByTestId('trasare-foaie')).toContainText('Foaia: A4, 210 × 297 mm; colțurile găsite singure; proporțiile din poză 0,70');
  await expect(page.getByTestId('trasare-foaie')).toContainText('(ale formatului: 0,707).');
  await expect(page.getByTestId('trasare-sugestie-foaie')).toHaveCount(0);
  await expect(page.getByTestId('trasare-foaie-nu-pare')).toHaveCount(0);
  await expect(page.getByTestId('trasare-scara')).toContainText('din formatul foii');
  await expect(page.getByTestId('trasare-imagine')).toHaveText('Imaginea: 1200 × 900 px');
  await expect(page.getByTestId('import-cai')).toHaveText(CINCI);
  // Sub vectori, foaia îndreptată: lângă colțul ei stânga-sus e hârtie (în poză, acolo e masa).
  await page.locator('[data-camp="trasare-vedere-imagine"]').check();
  await expect.poll(() => luminaLa(page, 0.03, 0.03, FOAIE_A4.w, FOAIE_A4.h)).toBeGreaterThan(150);
  // Formele, de la pătratul din stânga-sus (30, 40 mm) la discul din dreapta (175 mm) și inelul de jos (265 mm): 145 × 225 mm.
  const [l, h] = await marime(page);
  expect(Math.abs(l - 145)).toBeLessThan(1);
  expect(Math.abs(h - 225)).toBeLessThan(1);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = await documentSalvat(page, 1);
  expect(doc.split('"tip":"element"').length - 1).toBe(5);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('Colțurile: poza cu marginea foii și mânerele; un colț tras e al omului, „Găsește singur” îl caută din nou', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'oblica');
  await page.locator('[data-camp="trasare-foaie"]').check();
  await expect(page.getByTestId('import-cai')).toHaveText(CINCI);
  await expect(page.locator('[data-buton="trasare-colturi-singur"]')).toBeDisabled();
  await page.locator('[data-buton="trasare-colturi"]').click();
  await expect(page.locator('[data-buton="trasare-colturi"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('trasare-previzualizare')).toHaveClass(/colturi/);
  // Mânerele se desenează pe colțurile găsite: albe la mijloc.
  const [x0, y0] = COLTURI[0];
  await expect.poll(() => luminaLa(page, x0 / CAMERA.W, y0 / CAMERA.H, CAMERA.W, CAMERA.H)).toBeGreaterThan(240);
  // Colțul din dreapta-jos al foii, tras cu 60 px spre interiorul ei: foaia se îndreaptă din colțurile mutate.
  const [x, y] = COLTURI[2];
  const p = await peEcran(page, x, y), q = await peEcran(page, x - 60, y - 60);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile mutate de tine');
  await expect(page.locator('[data-buton="trasare-colturi-singur"]')).toBeEnabled();
  // Tragerea din afara mânerelor mută vederea, nu un colț.
  const a = await peEcran(page, 100, 100), b = await peEcran(page, 160, 130);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile mutate de tine');
  await page.locator('[data-buton="trasare-incadreaza"]').click();
  await page.locator('[data-buton="trasare-colturi-singur"]').click();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile găsite singure');
  await expect(page.getByTestId('import-cai')).toHaveText(CINCI);
  // Colțul stânga-sus tras dincolo de cel din dreapta-jos: mânerul se oprește unde patrulaterul încă e convex, deci colțurile
  // trimise sunt bune (altfel, foaia s-ar căuta singură din nou).
  const s0 = await peEcran(page, x0, y0), s1 = await peEcran(page, (COLTURI[2]?.[0] ?? 0) + 100, (COLTURI[2]?.[1] ?? 0) + 60);
  await page.mouse.move(s0.x, s0.y);
  await page.mouse.down();
  await page.mouse.move(s1.x, s1.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile mutate de tine');
  await page.locator('[data-buton="trasare-colturi-singur"]').click();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile găsite singure');
  // Micșorată sub încadrare (doar cu Colțurile), un colț se trage și în afara pozei.
  for (let i = 0; i < 3; i++) await page.locator('[data-buton="trasare-micsoreaza"]').click();
  const k = 0.8 ** 3, b0 = await page.getByTestId('trasare-previzualizare').boundingBox();
  if (!b0) throw new Error('fără previzualizare');
  const sk = Math.min(b0.width / CAMERA.W, b0.height / CAMERA.H) * 0.95 * k;
  const laK = (x: number, y: number): { x: number; y: number } => ({ x: b0.x + b0.width / 2 + (x - CAMERA.W / 2) * sk, y: b0.y + b0.height / 2 + (y - CAMERA.H / 2) * sk });
  const [x1, y1] = COLTURI[1], t0 = laK(x1, y1), t1 = laK(CAMERA.W + 40, y1);
  await page.mouse.move(t0.x, t0.y);
  await page.mouse.down();
  await page.mouse.move(t1.x, t1.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile mutate de tine');
  await page.locator('[data-buton="trasare-colturi-singur"]').click();
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile găsite singure');
  await page.locator('[data-buton="trasare-incadreaza"]').click();
  // Zona și Colțurile se exclud: Zona scoate previzualizarea pozei.
  await page.locator('[data-buton="trasare-zona"]').click();
  await expect(page.locator('[data-buton="trasare-colturi"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('trasare-previzualizare')).toHaveClass(/zona/);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('formatele: „Din poză” (proporțiile estimate, scara de dinainte), „Alt format” și Letter (proporțiile nu se potrivesc)', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'oblica');
  await page.locator('[data-camp="trasare-foaie"]').check();
  await expect(page.getByTestId('trasare-foaie')).toContainText('Foaia: A4');
  await page.locator('[data-camp="trasare-format"]').selectOption('poza');
  await expect(page.getByTestId('trasare-foaie')).toContainText('Foaia: din poză, proporțiile 0,70');
  await expect(page.getByTestId('trasare-scara')).toContainText('presupus');
  // Pe o poză de 1200 × 900 px, colțurile mișcate cu un pixel mută proporțiile cu peste 2 %: raportul spune că sunt nesigure.
  await expect(page.getByTestId('trasare-foaie-nesigure')).toContainText('alege formatul, dacă îl știi.');
  await page.locator('[data-camp="trasare-format"]').selectOption('letter');
  await expect(page.getByTestId('trasare-foaie')).toContainText('Foaia: Letter, 215,9 × 279,4 mm');
  await expect(page.getByTestId('trasare-foaie-nu-pare')).toContainText('nu se potrivesc cu Letter (0,773)');
  await expect(page.getByTestId('trasare-foaie-nesigure')).toHaveCount(0);
  await page.locator('[data-camp="trasare-format"]').selectOption('alt');
  await expect(page.locator('[data-camp="trasare-format-l"]')).toHaveValue('210');
  await page.locator('[data-camp="trasare-format-l"]').fill('100');
  await page.locator('[data-camp="trasare-format-i"]').fill('150');
  await expect(page.getByTestId('trasare-foaie')).toContainText('Foaia: formatul scris, 100 × 150 mm');
  await expect(page.getByTestId('trasare-foaie-nu-pare')).toContainText('nu se potrivesc cu formatul scris (0,667)');
  await page.locator('[data-camp="trasare-format"]').selectOption('a4');
  await expect(page.getByTestId('trasare-foaie-nu-pare')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un scan (foaia umple poza): nicio sugestie; îndreptată, foaia nu se găsește și colțurile stau lângă margini; pe transparență, fără grup', async ({ page }) => {
  await page.goto('/');
  await alegePoza(page, 'scan');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await expect(page.getByTestId('trasare-sugestie-foaie')).toHaveCount(0);
  await page.locator('[data-camp="trasare-foaie"]').check();
  await expect(page.getByTestId('trasare-foaie-negasita')).toContainText('Foaia nu s-a găsit în poză');
  await expect(page.getByTestId('trasare-foaie')).toContainText('colțurile puse lângă marginile pozei');
  await page.locator('[data-buton="renunta"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await alegePoza(page, 'transparenta');
  await expect(page.getByTestId('trasare-sursa-aleasa')).toHaveText('Transparența: imaginea are fundal transparent.');
  await expect(page.getByTestId('trasare-grup-foaie')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
