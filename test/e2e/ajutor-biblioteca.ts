import { createHash } from 'node:crypto';
import { expect, type Locator, type Page } from '@playwright/test';
import { pachetTrenulet } from '../../scripts/construieste-trenulet.ts';
import { scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';

/**
 * Drumurile ferestrei „Biblioteca extensiilor” (ADR 0231, felia 3.Xh-3), comune probelor: meniul Extensii, fereastra, rândul
 * unei extensii din listă, pagina ei.
 */
export const meniu = (page: Page): Locator => page.getByTestId('meniu-extensii');
export const biblioteca = (page: Page): Locator => page.getByTestId('fereastra-biblioteca');
export const pagina = (page: Page): Locator => page.getByTestId('biblioteca-pagina');
export const randLista = (page: Page, id: string): Locator =>
  page.getByTestId('biblioteca-lista').locator(`[data-extensii="rand-biblioteca"][data-id="${id}"]`);

/** Meniul extensiilor, deschis (un fișier ales direct în câmpul lui îl poate lăsa deschis: butonul l-ar închide). */
export async function deschideMeniul(page: Page): Promise<Locator> {
  if (!await meniu(page).isVisible()) await page.locator('[data-extensii="buton"]').click();
  await expect(meniu(page)).toBeVisible();
  return meniu(page);
}

/** Fereastra bibliotecii, deschisă din meniu (sau deja deschisă). */
export async function deschideBiblioteca(page: Page): Promise<Locator> {
  if (await biblioteca(page).isVisible()) return biblioteca(page);
  await (await deschideMeniul(page)).locator('[data-extensii="biblioteca"]').click();
  await expect(biblioteca(page)).toBeVisible();
  return biblioteca(page);
}

/** Pagina unei extensii din catalog, în fila „Toate”. */
export async function paginaDinCatalog(page: Page, id: string): Promise<Locator> {
  const b = await deschideBiblioteca(page);
  await b.locator('[data-extensii="fila-toate"]').click();
  await randLista(page, id).click();
  await expect(pagina(page)).toHaveAttribute('data-id', id);
  return pagina(page);
}

/** Pagina unei extensii instalate, în fila „Instalate”. */
export async function paginaInstalatei(page: Page, id: string): Promise<Locator> {
  const b = await deschideBiblioteca(page);
  await b.locator('[data-extensii="fila-instalate"]').click();
  await randLista(page, id).click();
  await expect(pagina(page)).toHaveAttribute('data-id', id);
  return pagina(page);
}

/** Fereastra bibliotecii, închisă cu × (dacă e deschisă). */
export async function inchideBiblioteca(page: Page): Promise<void> {
  if (!await biblioteca(page).isVisible()) return;
  await biblioteca(page).locator('[data-extensii="inchide-biblioteca"]').click();
  await expect(biblioteca(page)).toHaveCount(0);
}

/** Semnul unei extensii (ADR 0231 §B.2): o imagine, încărcată cu adevărat (nu doar pusă în pagină). */
export const semn = (unde: Locator): Locator => unde.locator('img[data-semn]');
export const incarcata = (img: Locator): Promise<void> =>
  expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);

/** Pachetul de acum, cu alt manifest (aceleași fișiere): o versiune mai veche, eventual cu mai puține permisiuni. */
export async function pachetVechi(versiune: string, faraPermisiuni: readonly string[] = [], nume?: string): Promise<Buffer> {
  const z = await citesteZip(pachetTrenulet().octeti, { fisiere: 256, octetiFisier: 8 * 1024 * 1024, octetiTotal: 16 * 1024 * 1024 });
  if (!z.ok) throw new Error(z.motiv);
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown> & { permisiuni: string[] };
    const nou = { ...m, versiune, permisiuni: m.permisiuni.filter((p) => !faraPermisiuni.includes(p)), ...(nume ? { nume } : {}) };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(nou)) };
  })));
}

/**
 * O bibliotecă de probă, în locul celei construite de build: catalogul cu un singur rând (pachetul dat, cu amprenta lui
 * adevărată) și pachetul lângă el. `pachetul` hotărăște cum răspunde descărcarea: `'ok'`, `'cade'` (fără rețea) sau o
 * promisiune de așteptat întâi (descărcarea ținută). Întoarce o funcție care schimbă felul răspunsului.
 */
export async function bibliotecaDeProba(page: Page, rand: {
  readonly id: string; readonly nume: string; readonly versiune: string; readonly permisiuni: readonly string[]; readonly octeti: Buffer;
  /** „Ce e nou”, de la versiunea cea mai nouă în jos (cu data, la alegere). */
  readonly noutati?: ReadonlyArray<{ readonly versiune: string; readonly ro: string; readonly en: string; readonly data?: string }>;
}): Promise<(cum: 'ok' | 'cade' | Promise<void>) => void> {
  const sha256 = createHash('sha256').update(rand.octeti).digest('hex');
  const pachet = `${rand.id}-${rand.versiune}-${sha256.slice(0, 8)}.zip`;
  const catalog = {
    format: 'cvs2-biblioteca', schema: 1,
    extensii: [{
      id: rand.id, nume: rand.nume, versiune: rand.versiune, api: 1, permisiuni: rand.permisiuni,
      descriere: { ro: 'O extensie de probă.', en: 'A test extension.' }, pachet, octeti: rand.octeti.length, sha256,
      ...(rand.noutati ? { noutati: rand.noutati } : {}),
    }],
  };
  let cum: 'ok' | 'cade' | Promise<void> = 'ok';
  await page.route('**/extensii/catalog.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  await page.route(`**/extensii/${pachet}`, async (r) => {
    if (cum === 'cade') { await r.abort('failed'); return; }
    if (cum !== 'ok') await cum;
    await r.fulfill({ status: 200, contentType: 'application/zip', body: rand.octeti });
  });
  return (nou) => { cum = nou; };
}

/** Un rând al raftului de probă: doar ce se vede în listă și pe pagină (nimic nu se instalează de pe el). */
export type RandDeProba = {
  readonly id: string; readonly nume: string;
  readonly descriere?: { readonly ro: string; readonly en: string };
  readonly despre?: { readonly ro: string; readonly en: string };
  readonly categorii?: readonly string[];
  readonly autor?: string;
};

/**
 * O bibliotecă de probă cu mai multe rânduri (căutarea și categoriile, ADR 0233): doar catalogul. Pachetele nu există, deci
 * probele ei caută și filtrează, nu instalează; numele pachetului și amprenta au forma cerută de cititorul catalogului.
 */
export async function raftDeProba(page: Page, randuri: readonly RandDeProba[]): Promise<void> {
  const extensii = randuri.map((r) => {
    const sha256 = createHash('sha256').update(r.id).digest('hex');
    return {
      id: r.id, nume: r.nume, versiune: '1.0.0', api: 1, permisiuni: [],
      descriere: r.descriere ?? { ro: 'O extensie de probă.', en: 'A test extension.' },
      pachet: `${r.id}-1.0.0-${sha256.slice(0, 8)}.zip`, octeti: 1000, sha256,
      ...(r.despre ? { despre: r.despre } : {}), ...(r.categorii ? { categorii: r.categorii } : {}), ...(r.autor ? { autor: r.autor } : {}),
    };
  });
  await page.route('**/extensii/catalog.json', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ format: 'cvs2-biblioteca', schema: 1, extensii }),
  }));
}

/** Câmpul de căutare al bibliotecii, rândul categoriilor și id-urile rândurilor la vedere, în ordinea lor. */
export const cautare = (page: Page): Locator => biblioteca(page).locator('[data-extensii="cauta-extensie"]');
export const categorii = (page: Page): Locator => biblioteca(page).getByTestId('biblioteca-categorii');
export const categoria = (page: Page, id: string): Locator => categorii(page).locator(`[data-extensii="categorie"][data-categorie="${id}"]`);
export const randuriVazute = (page: Page): Promise<string[]> =>
  page.getByTestId('biblioteca-lista').locator('[data-extensii="rand-biblioteca"]').evaluateAll((e) => e.map((x) => x.getAttribute('data-id') ?? ''));
