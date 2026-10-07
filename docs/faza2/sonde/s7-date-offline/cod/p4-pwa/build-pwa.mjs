// Construiește două versiuni reale (v1, v2) ale aplicației-jucărie cu Vite + vite-plugin-pwa (Workbox generateSW).
import { build } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const times = {};
mkdirSync(`${here}app/public`, { recursive: true });
for (const ver of ['v1', 'v2']) {
  writeFileSync(`${here}app/ver.css`, `:root { --ver: "${ver}"; }\nbody { font-family: system-ui; }\n`);
  writeFileSync(`${here}app/public/data.json`, JSON.stringify({ ver }));
  const t = performance.now();
  await build({
    root: `${here}app`, logLevel: 'warn', define: { __VER__: JSON.stringify(ver) },
    build: { outDir: `${here}dist-${ver}`, emptyOutDir: true },
    plugins: [VitePWA({
      registerType: 'prompt', injectRegister: false,
      manifest: { name: 'S7 offline', short_name: 'S7', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#333333', icons: [] },
      workbox: { globPatterns: ['**/*.{js,css,html,json}'], navigateFallback: '/index.html', cleanupOutdatedCaches: true },
    })],
  });
  times[ver] = Math.round(performance.now() - t);
}
console.log(JSON.stringify({ buildMs: times }));
