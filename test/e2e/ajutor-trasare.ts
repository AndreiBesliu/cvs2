import type { Page } from '@playwright/test';

/**
 * Fereastra trasării cu toate grupurile setărilor deschise (ADR 0273 §2): la prima deschidere, Imaginea și Curățarea stau
 * strânse, iar câmpurile lor nu se văd. Probele care lucrează cu ele (lumina, foaia, scanarea, petele) pornesc așa, prin
 * alegerile ținute ale ferestrei, puse înaintea încărcării paginii; strângerea la prima deschidere o probează
 * `trasare-fereastra.spec.ts`.
 */
export async function grupuriDeschise(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cncvs2.trasare.fereastra', JSON.stringify({ v: 1, deschise: { imagine: true, trasare: true, curatare: true, marime: true } }));
    } catch { /* fără stocare: proba cade singură, la câmpul ascuns */ }
  });
}
