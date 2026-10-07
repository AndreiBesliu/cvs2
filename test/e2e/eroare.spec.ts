import { test, expect } from '@playwright/test';

test.describe('ErrorBoundary și jurnalul local', () => {
  test.use({ locale: 'ro-RO' });

  test('o eroare de randare arată ecranul, intră în jurnal, iar raportul se copiază', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?diagnostic=eroare-de-randare');

    const alerta = page.getByRole('alert');
    await expect(alerta.getByRole('heading')).toHaveText('Ceva n-a mers');
    await expect(alerta.locator('textarea')).toHaveValue(/\[randare\] Error: Eroare de randare provocată \(diagnostic\)/);

    await alerta.getByRole('button', { name: 'Copiază raportul' }).click();
    await expect(alerta.getByRole('status')).toHaveText('Copiat');
    const copiat = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiat).toContain('instanța: local');
    expect(copiat).toContain('[randare] Error: Eroare de randare provocată (diagnostic)');

    // Jurnalul supraviețuiește reîncărcării: eroarea e acolo și când aplicația merge din nou.
    await page.goto('/');
    await expect(page.getByTestId('jurnal')).toHaveText('1 eroare în jurnalul local');
  });
});
