import { defineConfig } from '@playwright/test';

// Bancul vizual (felia 2.9, `PLAN.md` §4.5): aceeași aplicație din `dist/`, în Edge, ca e2e-ul; scrie `dist/banc/`.
export default defineConfig({
  testDir: 'test/banc',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: '.tmp/banc-rezultate',
  use: { baseURL: 'http://localhost:4173' },
  // Workerul PWA blocat, ca în suita e2e (`playwright.config.ts`): pozele vin din build-ul servit, nu dintr-un precache.
  projects: [{ name: 'edge', use: { channel: 'msedge', serviceWorkers: 'block' } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
