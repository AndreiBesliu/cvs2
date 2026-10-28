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

/**
 * Calea reală a raportorului de erori (ADR 0043 §8), sub CSP-ul din build: scriptul `enterprise.js`, cadrul reCAPTCHA,
 * cererile reCAPTCHA, schimbul de token App Check și apelul funcției, pe ambele proiecte. Toate cererile externe sunt
 * oprite de `route` (nimic nu iese din mașină), iar încălcările se adună din `securitypolicyviolation`: CSP-ul refuză
 * înaintea rețelei, deci o cerere refuzată nu ajunge la `route`. Martorul: o origine străină e refuzată.
 */
test('sub CSP-ul din build, calea App Check / reCAPTCHA / funcții e permisă, iar o origine străină nu', async ({ page }) => {
  const externe: string[] = [];
  await page.route(/^https:\/\//, (r) => {
    externe.push(new URL(r.request().url()).origin);
    return r.fulfill({ status: 200, contentType: r.request().resourceType() === 'script' ? 'text/javascript' : 'text/html', body: '' });
  });
  await page.route('**/proba-csp-cale.html', (r) => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${cspDinBuild()}"><script src="/proba-csp-cale.js"></script></head><body></body></html>`,
  }));
  await page.route('**/proba-csp-cale.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: `
      const incalcari = [];
      document.addEventListener('securitypolicyviolation', (e) => { incalcari.push(e.effectiveDirective + ' ' + e.blockedURI); });
      const cere = (u) => fetch(u, { method: 'POST', mode: 'no-cors', body: '{}' }).then(() => 'ok', () => 'refuzat');
      const script = (u) => new Promise((ok) => {
        const s = document.createElement('script'); s.src = u; s.onload = () => ok('ok'); s.onerror = () => ok('refuzat');
        document.head.append(s);
      });
      const cadru = (u) => new Promise((ok) => {
        const f = document.createElement('iframe'); f.src = u; f.onload = () => ok('incarcat'); document.body.append(f);
        setTimeout(() => ok('termen'), 3000);
      });
      window.addEventListener('DOMContentLoaded', async () => {
        const rez = {
          enterprise: await script('https://www.google.com/recaptcha/enterprise.js?render=cheie-proba'),
          gstatic: await script('https://www.gstatic.com/recaptcha/releases/x/recaptcha__ro.js'),
          appcheck: await cere('https://content-firebaseappcheck.googleapis.com/v1/projects/p/apps/1:1:web:1:exchangeRecaptchaEnterpriseToken'),
          recaptcha: await cere('https://www.google.com/recaptcha/enterprise/clr?k=cheie-proba'),
          functiiTest: await cere('https://europe-central2-cncvectorstudio-test.cloudfunctions.net/logClientError'),
          functiiLive: await cere('https://europe-central2-cncvectorstudio.cloudfunctions.net/logClientError'),
          strain: await cere('https://example.com/colecteaza'),
        };
        await cadru('https://www.google.com/recaptcha/enterprise/anchor?k=cheie-proba');
        await cadru('https://recaptcha.google.com/recaptcha/enterprise/anchor?k=cheie-proba');
        await new Promise((ok) => setTimeout(ok, 200));
        document.title = 'gata ' + JSON.stringify({ rez, incalcari });
      });
    `,
  }));
  await page.goto('/proba-csp-cale.html');
  await expect(page).toHaveTitle(/^gata /, { timeout: 15_000 });
  const { rez, incalcari } = JSON.parse((await page.title()).slice(5)) as { rez: Record<string, string>; incalcari: string[] };
  expect(rez).toEqual({
    enterprise: 'ok', gstatic: 'ok', appcheck: 'ok', recaptcha: 'ok', functiiTest: 'ok', functiiLive: 'ok', strain: 'refuzat',
  });
  // Singura încălcare e martorul; cadrele reCAPTCHA au trecut de `frame-src`.
  expect(incalcari).toEqual(['connect-src https://example.com/colecteaza']);
  expect(externe).not.toContain('https://example.com');
});

test('aplicația merge sub CSP-ul ei, fără nicio încălcare raportată, cu bucățile la cerere aduse prin harta importurilor', async ({ page }) => {
  // Harta importurilor (ADR 0098) e un script inline: fără amprenta ei în CSP, nicio bucată nu s-ar mai rezolva.
  expect(readFileSync('dist/index.html', 'utf8')).toMatch(/<script type="importmap">\{"imports":\{"\/assets\//);
  const incalcari: string[] = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) incalcari.push(m.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // O bucată la cerere (manualul), adusă prin hartă.
  await page.locator('[data-editare="manual"]').click();
  await expect(page.getByTestId('manual')).toHaveAttribute('data-stare', 'gata');
  expect(incalcari).toEqual([]);
});

test('sub CSP-ul din build, doar harta are amprentă: alt script inline e refuzat', async ({ page }) => {
  await page.route('**/proba-csp-inline.html', (r) => r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${cspDinBuild()}"><script>document.title = 'inline-mers';</script><script src="/proba-csp-inline.js"></script></head><body></body></html>`,
  }));
  await page.route('**/proba-csp-inline.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: "if (document.title !== 'inline-mers') document.title = 'inline-refuzat';",
  }));
  await page.goto('/proba-csp-inline.html');
  await expect(page).toHaveTitle('inline-refuzat');
});
