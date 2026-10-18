import { defineConfig } from '@playwright/test';

/**
 * E2e-ul rulează pe `dist/`, servit de `vite preview`, în Edge (Chromium-ul Playwright nu pornește pe mașina owner-ului).
 *
 * Workerul PWA (ADR 0045 §9) e BLOCAT în suita obișnuită (`serviceWorkers: 'block'`): o pagină controlată de el nu mai
 * trece prin `page.route` (bucățile oprite sau întârziate de probe ar veni din precache), iar o reîncărcare ar servi
 * build-ul din cache. Probele lui sunt în proiectul `edge-pwa`, cu workerul permis, fiecare pe serverul ei (o copie a
 * `dist/` pe un port liber, `test/e2e/server-pwa.ts`), deci nu ating `vite preview` de pe 4173.
 */
export default defineConfig({
  testDir: 'test/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'edge', testIgnore: /pwa\.spec\.ts$/, use: { channel: 'msedge', serviceWorkers: 'block' } },
    { name: 'edge-pwa', testMatch: /pwa\.spec\.ts$/, timeout: 60_000, use: { channel: 'msedge', serviceWorkers: 'allow' } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
