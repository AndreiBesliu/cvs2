import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

/** CSP-ul exact din `dist/index.html`, adică din artefactul servit, nu din sursă. */
function cspDinBuild(): string {
  const html = readFileSync('dist/index.html', 'utf8');
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1];
  if (!csp) throw new Error('dist/index.html nu are CSP');
  return csp;
}

/**
 * O pagină de probă pe aceeași origine, cu un script propriu (deci permis de `'self'`) care încearcă `eval`.
 * `page.evaluate` și `addScriptTag` ocolesc CSP-ul, deci proba trebuie să fie chiar un fișier servit.
 */
async function incearcaEval(page: Page, csp: string | null): Promise<string> {
  const meta = csp === null ? '' : `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  await page.route('**/proba-csp.html', (r) => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head>${meta}<script src="/proba-csp.js"></script></head><body></body></html>`,
  }));
  await page.route('**/proba-csp.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: "try { eval('1'); document.title = 'eval-mers'; } catch (e) { document.title = 'eval-refuzat'; }",
  }));
  await page.goto('/proba-csp.html');
  await expect(page).toHaveTitle(/eval-/);
  return page.title();
}

test('CSP-ul din build nu permite unsafe-eval și nici unsafe-inline', () => {
  const csp = cspDinBuild();
  expect(csp).not.toContain('unsafe-eval');
  expect(csp).not.toContain('unsafe-inline');
});

test('martorul: fără CSP, eval-ul merge (proba chiar vede diferența)', async ({ page }) => {
  expect(await incearcaEval(page, null)).toBe('eval-mers');
});

test('sub CSP-ul din build, Edge refuză eval-ul', async ({ page }) => {
  expect(await incearcaEval(page, cspDinBuild())).toBe('eval-refuzat');
});

test('aplicația merge sub CSP-ul ei, fără nicio încălcare raportată', async ({ page }) => {
  const incalcari: string[] = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) incalcari.push(m.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(incalcari).toEqual([]);
});
