import { defineConfig } from '@playwright/test';

// E2e-ul rulează pe `dist/`, servit de `vite preview`, în Edge (Chromium-ul Playwright nu pornește pe mașina owner-ului).
export default defineConfig({
  testDir: 'test/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'edge', use: { channel: 'msedge' } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
