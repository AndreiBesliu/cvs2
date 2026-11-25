/**
 * „Se prinde cu” în atelierul Easy 3Draw (ADR 0284, felia 3.Ce), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - sub piesa de pe ecran, ce prinderi are (numărate ca un om: o gaură care trece e una) și, la deschidere, piesele
 *   atelierului care se potrivesc cu ele, pe feluri, fiecare cu pictograma ei;
 * - un clic deschide piesa; axul și știftul vin cu lungimea potrivită piesei de pe ecran (și o spun);
 * - de la piesa deschisă, drumul înapoi e în același panou (potrivirea e în amândouă sensurile);
 * - roata dințată își spune și grinda pe care stă perechea, când axele cad pe grilă;
 * - panoul nu apare unde n-are ce spune: la o piesă fără prinderi, la setul de calibrare, în vederea „Modelul”.
 * Engleza panoului se judecă în pachet, în proba limbii (`trenulet.spec.ts`).
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelier(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
}
async function piesa(page: Page, fila: string, tip: string): Promise<void> {
  await page.locator(`#at-tipuri [data-fila="${fila}"]`).click();
  await page.locator(`#at-galerie [data-piesa="${tip}"]`).click();
}
const panou = (page: Page) => page.locator('#at-prinde');
const are = (page: Page) => page.locator('#at-prinde-are');
const rand = (page: Page, fel: string) => page.locator(`#at-prinde-lista [data-rand="${fel}"]`);
const nume = (page: Page) => page.locator('#at-nume-piesa');

const PE_STIFTURI = ['Pantă', 'Pantă inversă', 'Pană / aripă', 'Rotund / con', 'Arc', 'Cadru / fereastră', 'Știfturi pe lateral', 'Suport (bracket)', 'Cărămidă Technic', 'Clemă', 'Mâner', 'Bilă', 'Cupă', 'Cremalieră'];
const IN_LOCASURI = ['Pantă', 'Pantă inversă', 'Pană / aripă', 'Rotund / con', 'Arc', 'Cadru / fereastră', 'Știfturi pe lateral', 'Suport (bracket)', 'Cărămidă Technic', 'Clemă', 'Mâner'];
const PE_AX = ['Grindă', 'Cărămidă Technic', 'Bucșă / conector', 'Conector perpendicular', 'Conector în unghi', 'Roată dințată', 'Șurub melc', 'Camă', 'Roată conică', 'Roată coroană', 'Conică dublă', 'Fulie',
  'Roată cu anvelopă', 'Șenilă', 'Elice', 'Elice de barcă', 'Ventilator cu carcasă', 'Roată cu palete'];

test('cărămida 2 × 4: opt știfturi și opt locașuri; la deschidere, piesele care stau pe ea și cele pe care stă', async ({ page }) => {
  await atelier(page);
  await expect(nume(page)).toHaveText('Cărămidă 2×4');
  await expect(panou(page)).toBeVisible();
  await expect(panou(page).locator('summary')).toContainText('Se prinde cu');
  await expect(are(page)).toHaveText('8 știfturi · 8 locașuri');
  // închis, panoul nu socotește nimic și nu pune nimic pe pagină
  await expect(panou(page)).not.toHaveAttribute('open', '');
  await expect(page.locator('#at-prinde-lista > *')).toHaveCount(0);
  await panou(page).locator('summary').click();
  await expect(rand(page, 'stift').locator('.at-prinde-unde')).toHaveText('Pe știfturi');
  await expect(rand(page, 'stift').locator('button')).toHaveText(PE_STIFTURI);
  await expect(rand(page, 'locas').locator('.at-prinde-unde')).toHaveText('În locașuri (dedesubt)');
  await expect(rand(page, 'locas').locator('button')).toHaveText(IN_LOCASURI);
  await expect(page.locator('#at-prinde-lista [data-rand]')).toHaveCount(2);
  // fiecare buton are pictograma piesei lui, ca în galerie
  const pict = await rand(page, 'stift').locator('button svg.at-pict').count();
  expect(pict).toBe(PE_STIFTURI.length);
  // piesa de pe ecran nu se propune pe ea însăși
  await expect(page.locator('#at-prinde-lista [data-prinde="caramida"]')).toHaveCount(0);
});

test('roata dințată: axul vine de lungimea bună, iar de la ax drumul înapoi e în același panou', async ({ page }) => {
  await atelier(page);
  await piesa(page, 'roti', 'rotita');
  await expect(nume(page)).toHaveText('Roată dințată 24');
  await expect(are(page)).toHaveText('1 gaură de ax');
  await panou(page).locator('summary').click();
  await expect(rand(page, 'gauraAx').locator('.at-prinde-unde')).toHaveText('În gaura de ax');
  await expect(rand(page, 'gauraAx').locator('button')).toHaveText(['Ax']);
  // axul din editor e de 4; pentru roata de 3,8 mm ajunge cel de 2 (trece prin ea și mai iese un pas)
  await rand(page, 'gauraAx').locator('[data-prinde="ax"]').click();
  await expect(nume(page)).toHaveText('Ax 2');
  await expect(page.locator('#at-a-lung')).toHaveValue('2');
  await expect(page.locator('#at-toast')).toHaveText('Ax de 2: trece prin piesă și mai iese un pas.');
  await expect(page.locator('#at-tipuri [data-fila="legaturi"]')).toHaveAttribute('aria-pressed', 'true');
  // panoul a rămas deschis și e acum al axului
  await expect(are(page)).toHaveText('1 ax');
  await expect(rand(page, 'capatAx').locator('.at-prinde-unde')).toHaveText('Pe ax');
  await expect(rand(page, 'capatAx').locator('button')).toHaveText(PE_AX);
  // axul are un singur rând; grinda perechii e doar a roții dințate
  await expect(page.locator('#at-prinde-lista [data-rand]')).toHaveCount(1);
  await expect(rand(page, 'pereche')).toHaveCount(0);
  await rand(page, 'capatAx').locator('[data-prinde="rotita"]').click();
  await expect(rand(page, 'pereche')).toHaveCount(1);
  await expect(nume(page)).toHaveText('Roată dințată 24');
  await expect(page.locator('#at-tipuri [data-fila="roti"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(are(page)).toHaveText('1 gaură de ax');
});

test('roata dințată: grinda pe care stă perechea, când axele cad pe grilă', async ({ page }) => {
  await atelier(page);
  await piesa(page, 'roti', 'rotita');
  await panou(page).locator('summary').click();
  // 24 cu 24: axele la 24 mm, deci o grindă de 4 (găurile de la capete, la trei pași)
  await expect(rand(page, 'pereche')).toHaveText('Cu perechea de 24 dinți, axele stau la 24 mm: pe o grindă de 4, în găurile de la capete.Pune grinda în listă');
  await rand(page, 'pereche').locator('button').click();
  await expect(page.locator('#at-toast')).toHaveText('1 × Grindă 4 în listă.');
  await expect(page.locator('#at-lista')).toContainText('Grindă 4');
  // 24 cu 8: 16 mm, grinda de 3
  await page.locator('#at-r-pereche').fill('8');
  await page.locator('#at-r-pereche').press('Tab');
  await expect(rand(page, 'pereche')).toContainText('Cu perechea de 8 dinți, axele stau la 16 mm: pe o grindă de 3');
  // 24 cu 12: 18 mm nu cade pe grilă; panoul o spune și nu propune nicio grindă
  await page.locator('#at-r-pereche').fill('12');
  await page.locator('#at-r-pereche').press('Tab');
  await expect(rand(page, 'pereche')).toHaveText('Cu perechea de 12 dinți, axele stau la 18 mm: nu cad pe grila de 8 mm.');
  await expect(rand(page, 'pereche').locator('button')).toHaveCount(0);
});

test('grinda și bucșa: știftul vine de 2 sau de 3, după cât de adâncă e gaura', async ({ page }) => {
  await atelier(page);
  await piesa(page, 'caramizi', 'grinda');
  await expect(are(page)).toHaveText('5 găuri de știft');
  await panou(page).locator('summary').click();
  await expect(rand(page, 'gauraStift').locator('.at-prinde-unde')).toHaveText('În găurile de știft');
  await expect(rand(page, 'gauraStift').locator('button')).toHaveText(['Știft', 'Ax']);
  // bucșa rotundă de 2 (15,8 mm): știftul de 3
  await piesa(page, 'legaturi', 'bucsa');
  await page.locator('#at-b-lung [data-v="2"]').click();
  await page.locator('#at-b-gaura [data-v="r"]').click();
  await expect(are(page)).toHaveText('1 gaură de știft');
  await expect(rand(page, 'gauraStift').locator('.at-prinde-unde')).toHaveText('În gaura de știft');
  await rand(page, 'gauraStift').locator('[data-prinde="stiftTechnic"]').click();
  await expect(nume(page)).toHaveText('Știft Technic 3');
  await expect(page.locator('#at-toast')).toHaveText('Știft de 3, cât gaura piesei.');
  await expect(are(page)).toHaveText('1 știft Technic');
  await expect(rand(page, 'stiftTechnic').locator('.at-prinde-unde')).toHaveText('Pe știftul Technic');
  // înapoi la grindă (7,8 mm): știftul de 2
  await rand(page, 'stiftTechnic').locator('[data-prinde="grinda"]').click();
  await expect(nume(page)).toHaveText('Grindă 5');
  await rand(page, 'gauraStift').locator('[data-prinde="stiftTechnic"]').click();
  await expect(nume(page)).toHaveText('Știft Technic');
  await expect(page.locator('#at-toast')).toHaveText('Știft de 2, cât gaura piesei.');
});

test('felurile se numără ca un om: mânerul are o bară, clema o clemă, conectorul în unghi o gaură de știft și două de ax', async ({ page }) => {
  await atelier(page);
  await piesa(page, 'legaturi', 'conectorUnghi');
  await expect(are(page)).toHaveText('1 gaură de știft · 2 găuri de ax');
  await piesa(page, 'legaturi', 'clema');
  await expect(are(page)).toHaveText('1 știft · 1 locaș · 1 clemă');
  await panou(page).locator('summary').click();
  await expect(rand(page, 'clema').locator('.at-prinde-unde')).toHaveText('În clemă');
  await expect(rand(page, 'clema').locator('button')).toHaveText(['Bară', 'Mâner', 'Șenilă']);
  await expect(rand(page, 'stift').locator('.at-prinde-unde')).toHaveText('Pe știft');
  await expect(rand(page, 'locas').locator('.at-prinde-unde')).toHaveText('În locaș (dedesubt)');
  await piesa(page, 'legaturi', 'bila');
  await expect(are(page)).toHaveText('1 locaș · 1 bilă');
  await expect(rand(page, 'bila').locator('button')).toHaveText(['Cupă']);
  await rand(page, 'bila').locator('button').click();
  await expect(nume(page)).toHaveText('Placă 1×1 cu cupă');
  await expect(rand(page, 'cupa').locator('.at-prinde-unde')).toHaveText('În cupă');
  await expect(rand(page, 'cupa').locator('button')).toHaveText(['Bilă']);
});

test('piesele celelalte se judecă așa cum sunt acum în editoarele lor: o roată fără butuc nu mai stă pe ax', async ({ page }) => {
  await atelier(page);
  await piesa(page, 'legaturi', 'ax');
  await panou(page).locator('summary').click();
  await expect(rand(page, 'capatAx').locator('button')).toHaveText(PE_AX);
  // roata cu anvelopă devine doar anvelopă (fără gaură): iese din rândul axului; pusă la loc, se întoarce
  await piesa(page, 'roti', 'roata');
  await page.locator('#at-ro-fel [data-v="anvelopa"]').click();
  await piesa(page, 'legaturi', 'ax');
  await expect(rand(page, 'capatAx').locator('button')).toHaveText(PE_AX.filter((n) => n !== 'Roată cu anvelopă'));
  await piesa(page, 'roti', 'roata');
  await page.locator('#at-ro-fel [data-v="plina"]').click();
  // roata dințată fără gaură iese și ea; cu gaură rotundă, rămâne (axul se rotește în ea)
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-gaura [data-v="nu"]').click();
  await expect(panou(page)).toBeHidden();
  await piesa(page, 'legaturi', 'ax');
  await expect(rand(page, 'capatAx').locator('button')).toHaveText(PE_AX.filter((n) => n !== 'Roată dințată'));
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-gaura [data-v="r"]').click();
  await expect(are(page)).toHaveText('1 gaură de știft');
  await expect(rand(page, 'gauraStift').locator('button')).toHaveText(['Știft', 'Ax']);
  await piesa(page, 'legaturi', 'ax');
  await expect(rand(page, 'capatAx').locator('button')).toHaveText(PE_AX);
});

test('panoul nu apare unde n-are ce spune: anvelopa, setul de calibrare, vederea „Modelul”', async ({ page }) => {
  await atelier(page);
  await expect(panou(page)).toBeVisible();
  await piesa(page, 'roti', 'roata');
  await expect(are(page)).toHaveText('1 gaură de ax');
  await page.locator('#at-ro-fel [data-v="anvelopa"]').click();
  await expect(nume(page)).toContainText('Anvelopă');
  await expect(panou(page)).toBeHidden();
  await page.locator('#at-ro-fel [data-v="plina"]').click();
  await expect(panou(page)).toBeVisible();
  await page.locator('#at-tipuri [data-fila="calibrare"]').click();
  await expect(panou(page)).toBeHidden();
  await page.locator('#at-tipuri [data-fila="caramizi"]').click();
  await expect(panou(page)).toBeVisible();
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(panou(page)).toBeHidden();
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await expect(panou(page)).toBeVisible();
});
