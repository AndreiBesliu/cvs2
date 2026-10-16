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
  projects: [{ name: 'edge', use: { channel: 'msedge' } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
