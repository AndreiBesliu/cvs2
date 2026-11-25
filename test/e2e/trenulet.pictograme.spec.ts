/**
 * Pictogramele pieselor atelierului Easy 3Draw (ADR 0281, felia 3.Tp↑b), pe pagina de sine stătătoare a planificatorului
 * (din aceleași surse ca pachetul), servită de pe o origine a probei și cu three.js din pachet:
 * - pe fiecare buton al fiecărei galerii, înaintea numelui, o pictogramă: un SVG de 18 × 18 (desenul în 24 × 24), ascuns
 *   cititoarelor de ecran (butonul se numește tot ca piesa), centrat pe înălțimea butonului;
 * - desenul e doar din linii (fără umplere), de culoarea textului: pe piesa apăsată și pe celelalte, în tema luminoasă și în
 *   cea întunecată; desenul stă în pătratul lui și nu e un punct;
 * - desenele diferă de la o piesă la alta (27 de piese, 27 de desene), iar o piesă găsită la căutare are același desen ca în
 *   galeria familiei ei.
 * Pe telefon, pictograma rămâne pe rândul numelui: o cere proba telefonului din `trenulet.file.spec.ts` (fiecare buton pe un
 * singur rând, cu tot ce are în el).
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
/** Familiile și piesele lor, în ordinea galeriilor (ca în `trenulet.file.spec.ts`). */
const FAMILII: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ['caramizi', [['caramida', 'Cărămidă / placă'], ['panta', 'Pantă'], ['pantaInversa', 'Pantă inversă'], ['pana', 'Pană / aripă'], ['rotund', 'Rotund / con'], ['arc', 'Arc'],
    ['lateral', 'Știfturi pe lateral'], ['suport', 'Suport (bracket)'], ['grinda', 'Grindă'], ['caramidaTechnic', 'Cărămidă Technic'], ['placaTechnic', 'Placă cu găuri']]],
  ['legaturi', [['stiftTechnic', 'Știft'], ['ax', 'Ax'], ['bucsa', 'Bucșă / conector'], ['conector', 'Conector perpendicular'], ['conectorUnghi', 'Conector în unghi'], ['clema', 'Clemă'], ['bara', 'Bară'], ['maner', 'Mâner'], ['bila', 'Bilă'],
    ['cupa', 'Cupă']]],
  ['roti', [['rotita', 'Roată dințată'], ['cremaliera', 'Cremalieră'], ['conica', 'Roată conică'], ['coroana', 'Roată coroană'], ['conicaDubla', 'Conică dublă'], ['fulie', 'Fulie'],
    ['roata', 'Roată cu anvelopă'], ['senila', 'Șenilă']]],
  ['propulsie', [['elice', 'Elice'], ['eliceBarca', 'Elice de barcă'], ['ventilator', 'Ventilator cu carcasă']]],
];

async function deschide(page: Page): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(PAGINA);
  await intraIn3D(page);
  // atelierul pornit: galeria familiei piesei de acum (cărămida)
  await expect(page.locator('#at-galerie [data-piesa="caramida"]')).toHaveAttribute('aria-pressed', 'true');
}
const fila = (page: Page, f: string) => page.locator(`#at-tipuri [data-fila="${f}"]`);
const butoane = (page: Page) => page.locator('#at-galerie [data-piesa]');

/** Pictograma fiecărui buton din galerie, măsurată: unde stă, cât e, cum e desenată, ce desen are. */
type Masura = {
  piesa: string; apasat: boolean; intai: boolean; clasa: string; ascunsa: string | null; cutie: string | null;
  w: number; h: number; dy: number; fill: string; stroke: string; culoare: string; desen: string; bbox: readonly [number, number, number, number];
};
async function masoara(page: Page): Promise<Masura[]> {
  return butoane(page).evaluateAll((bs) => bs.map((b) => {
    const s = b.querySelector('svg')!, rs = s.getBoundingClientRect(), rb = b.getBoundingClientRect(), cs = getComputedStyle(s), bb = s.getBBox();
    return {
      piesa: (b as HTMLElement).dataset['piesa'] ?? '', apasat: b.getAttribute('aria-pressed') === 'true', intai: b.firstChild === s,
      clasa: s.getAttribute('class') ?? '', ascunsa: s.getAttribute('aria-hidden'), cutie: s.getAttribute('viewBox'),
      w: rs.width, h: rs.height, dy: Math.abs(rs.top + rs.height / 2 - (rb.top + rb.height / 2)),
      fill: cs.fill, stroke: cs.stroke, culoare: getComputedStyle(b).color, desen: s.innerHTML, bbox: [bb.x, bb.y, bb.width, bb.height] as const,
    };
  }));
}
/** Pictograma unui buton e pusă și desenată cum trebuie (aceleași reguli pe orice galerie). */
function judeca(m: Masura): void {
  expect([m.intai, m.clasa, m.ascunsa, m.cutie], `${m.piesa}: întâi în buton, ascunsă cititoarelor`).toEqual([true, 'at-pict', 'true', '0 0 24 24']);
  expect([m.w, m.h], `${m.piesa}: mărimea`).toEqual([18, 18]);
  expect(m.dy, `${m.piesa}: centrată pe înălțimea butonului`).toBeLessThanOrEqual(0.5);
  expect([m.fill, m.stroke], `${m.piesa}: doar linii, de culoarea textului`).toEqual(['none', m.culoare]);
  const [x, y, w, h] = m.bbox;
  expect(x >= -0.01 && y >= -0.01 && x + w <= 24.01 && y + h <= 24.01, `${m.piesa}: desenul în pătratul lui (${m.bbox.join(', ')})`).toBe(true);
  expect(Math.max(w, h), `${m.piesa}: desenul nu e un punct`).toBeGreaterThanOrEqual(12);
}

test('fiecare piesă, în fiecare galerie, are pictograma ei înaintea numelui, ascunsă cititoarelor de ecran; desenele diferă', async ({ page }) => {
  await deschide(page);
  const desene = new Map<string, string>();
  for (const [f, piese] of FAMILII) {
    await fila(page, f).click();
    await expect(butoane(page)).toHaveCount(piese.length);
    const m = await masoara(page);
    expect(m.map((x) => x.piesa)).toEqual(piese.map(([k]) => k));
    for (const x of m) {
      judeca(x);
      desene.set(x.piesa, x.desen);
    }
    // butonul se numește tot ca piesa: pictograma nu se citește
    for (const [k, n] of piese) await expect(page.locator('#at-galerie').getByRole('button', { name: n, exact: true }), k).toHaveAttribute('data-piesa', k);
  }
  expect(desene.size).toBe(32);
  const dupa = new Map<string, string>();
  for (const [k, d] of desene) {
    expect(dupa.get(d), `${k} are același desen ca ${dupa.get(d)}`).toBeUndefined();
    dupa.set(d, k);
  }
});

test('pe piesa apăsată, pictograma ia culoarea ei (alta decât a celorlalte); la altă piesă, o ia cea nouă', async ({ page }) => {
  await deschide(page);
  for (const [f, piese] of FAMILII) {
    await fila(page, f).click();
    const alta = piese[Math.min(2, piese.length - 1)]![0];
    await page.locator(`#at-galerie [data-piesa="${alta}"]`).click();
    await expect(page.locator(`#at-galerie [data-piesa="${alta}"]`)).toHaveAttribute('aria-pressed', 'true');
    const m = await masoara(page);
    for (const x of m) judeca(x);
    const apasata = m.filter((x) => x.apasat), celelalte = m.filter((x) => !x.apasat);
    expect(apasata.map((x) => x.piesa)).toEqual([alta]);
    expect(new Set(celelalte.map((x) => x.stroke)).size).toBe(1);
    expect(apasata[0]!.stroke).not.toBe(celelalte[0]!.stroke);
  }
});

test('la căutare, fiecare piesă găsită are pictograma și același desen ca în galeria familiei ei', async ({ page }) => {
  await deschide(page);
  const desene = new Map<string, string>();
  for (const [f] of FAMILII) {
    await fila(page, f).click();
    for (const x of await masoara(page)) desene.set(x.piesa, x.desen);
  }
  for (const [text, gasite] of [['con', ['rotund', 'bucsa', 'conector', 'conectorUnghi', 'conica', 'conicaDubla']], ['ro', ['rotund', 'rotita', 'conica', 'coroana', 'roata']]] as const) {
    await page.locator('#at-cauta').fill(text);
    await expect(butoane(page)).toHaveCount(gasite.length);
    const m = await masoara(page);
    expect(m.map((x) => x.piesa), text).toEqual([...gasite]);
    for (const x of m) {
      judeca(x);
      expect(x.desen, `${text}: ${x.piesa}`).toBe(desene.get(x.piesa));
    }
  }
});

test.describe('în tema întunecată', () => {
  test.use({ colorScheme: 'dark' });
  test('pictogramele urmează tot textul: doar linii, de culoarea lui, și pe piesa apăsată', async ({ page }) => {
    await deschide(page);
    for (const [f] of FAMILII) {
      await fila(page, f).click();
      const m = await masoara(page);
      for (const x of m) judeca(x);
      expect(m.filter((x) => x.apasat)).toHaveLength(1);
      expect(new Set(m.map((x) => x.stroke)).size).toBe(2);
    }
  });
});
