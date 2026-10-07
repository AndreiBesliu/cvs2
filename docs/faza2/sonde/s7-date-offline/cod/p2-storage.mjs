// Sonda 2a: debitul OPFS vs IndexedDB în Edge (Chromium), pe profil PERSISTENT (pe disc; un context incognito
// ține IndexedDB/OPFS în memorie și ar minți). Oracol: SHA-256 din Node (OpenSSL) pe aceleași date generate.
// Rulare: node p2-storage.mjs [REPS=5]
import { chromium } from 'playwright-core';
import { rmSync, writeFileSync } from 'node:fs';
import { startServer, ORIGIN, LAUNCH } from './lib/server.mjs';
import { gen, sha } from './lib/gen-node.mjs';
const REPS = Number(process.argv[2] ?? 5);
const PROFILE = 'out/prof-bench';
rmSync(PROFILE, { recursive: true, force: true });
const srv = await startServer('web');
const ctx = await chromium.launchPersistentContext(PROFILE, { ...LAUNCH, headless: true });
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const rows = []; let info0, info1, ver;
try {
  ver = ctx.browser()?.version() ?? 'persistent';
  const pg = await ctx.newPage();
  await pg.goto(`${ORIGIN}/storage.html`); await pg.waitForFunction(() => window.__ready);
  ver = await pg.evaluate(() => navigator.userAgent);
  info0 = await pg.evaluate(() => window.storageInfo());
  const sizes = [[64 * 1048576, 'relief Float32 64 MiB', 11], [100 * 1048576, 'STL 100 MiB', 12]];
  const oracle = Object.fromEntries(sizes.map(([b, , s]) => [s, sha(gen(b, s))]));
  for (const [bytes, label, seed] of sizes) {
    for (const kind of ['idb', 'idb-blob', 'opfs-writable', 'opfs-sync']) {
      const r = await pg.evaluate(([k, b, s, n]) => window.bench(k, b, s, n), [kind, bytes, seed, REPS]);
      const mbps = (ms) => +((bytes / 1048576) / (ms / 1000)).toFixed(0);
      rows.push({ payload: label, kind, writeMs: +median(r.write).toFixed(0), readMs: +median(r.read).toFixed(0), writeMBs: mbps(median(r.write)), readMBs: mbps(median(r.read)), hashOk: r.hashOk.every(Boolean) && r.sha === oracle[seed], hashMs: +r.hashMs.toFixed(0), allW: r.write.map((x) => +x.toFixed(0)).join('/') });
      console.log(JSON.stringify(rows.at(-1)));
    }
  }
  info1 = await pg.evaluate(() => window.storageInfo());
} finally { await ctx.close(); await srv.close(); }
console.table(rows.map(({ allW, ...r }) => r));
console.log('estimate înainte', info0, '\nestimate după', info1);
writeFileSync('out/p2-storage.json', JSON.stringify({ ua: ver, reps: REPS, rows, info0, info1 }, null, 1));
