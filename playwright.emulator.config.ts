import { defineConfig } from '@playwright/test';

/**
 * E2e-ul paginii `/admin` pe emulatoarele Auth, Firestore și Functions (ADR 0040 §9), pornit de `npm run test:emulator`
 * în interiorul lui `firebase emulators:exec`. `bypassCSP`: CSP-ul de producție nu permite `http://127.0.0.1` (adresele
 * emulatoarelor); CSP-ul însuși e probat în `test/e2e/csp.spec.ts` și pe instanța de test.
 */
export default defineConfig({
  testDir: 'test/e2e-emulator',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', bypassCSP: true },
  projects: [{ name: 'edge', use: { channel: 'msedge' } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
