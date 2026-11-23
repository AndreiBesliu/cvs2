// Doar local: capturile din .tmp/captura, rulate pe canalul `trasare` (fără server local).
import { defineConfig } from '@playwright/test';
import baza from '../playwright.config.ts';
import { resolve } from 'node:path';
export default defineConfig({ ...baza, testDir: resolve('.tmp/captura'), use: { ...baza.use, baseURL: 'https://cncvectorstudio-test--trasare-icw58h57.web.app' }, webServer: undefined });
