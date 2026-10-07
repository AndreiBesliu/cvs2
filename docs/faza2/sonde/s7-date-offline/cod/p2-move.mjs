// Sonda 2d: pasul care lipsea din S3 — fișier .tmp scris dintr-un worker, apoi FileSystemFileHandle.move() la numele
// final, apoi citire și hash față de Node. Plus: move() peste un nume care există deja (suprascrie sau refuză?).
import { chromium } from 'playwright-core';
import { rmSync, writeFileSync } from 'node:fs';
import { startServer, ORIGIN, LAUNCH } from './lib/server.mjs';
import { gen, sha } from './lib/gen-node.mjs';
const PROFILE = 'out/prof-move';
rmSync(PROFILE, { recursive: true, force: true });
const srv = await startServer('web');
const ctx = await chromium.launchPersistentContext(PROFILE, { ...LAUNCH, headless: true });
let r;
try {
  const pg = ctx.pages()[0] ?? (await ctx.newPage());
  await pg.goto(`${ORIGIN}/storage.html`); await pg.waitForFunction(() => window.__ready);
  r = await pg.evaluate(async () => {
    const a = window.gen(16 << 20, 31), b = window.gen(16 << 20, 32);
    await window.callW({ op: 'write', name: 'x.bin.tmp', buf: a.slice().buffer });
    const t = performance.now(); await window.callW({ op: 'rename', from: 'x.bin.tmp', to: 'x.bin' }); const moveMs = performance.now() - t;
    const after1 = await window.opfsList();
    const shaX = await window.sha(new Uint8Array((await window.callW({ op: 'read', name: 'x.bin' })).buf));
    await window.callW({ op: 'write', name: 'y.tmp', buf: b.slice().buffer });
    let over;
    try { await window.callW({ op: 'rename', from: 'y.tmp', to: 'x.bin' }); over = 'mutat peste fișierul existent'; } catch (e) { over = 'refuzat: ' + String(e.message).slice(0, 80); }
    const after2 = await window.opfsList();
    const shaX2 = await window.sha(new Uint8Array((await window.callW({ op: 'read', name: 'x.bin' })).buf));
    return { moveMs: +moveMs.toFixed(1), after1, shaX, over, after2, shaX2 };
  });
} finally { await ctx.close(); await srv.close(); }
const A = sha(gen(16 << 20, 31)), B = sha(gen(16 << 20, 32));
r.moveOk = r.shaX === A && r.after1.includes('x.bin:16777216') && !r.after1.some((f) => f.startsWith('x.bin.tmp'));
r.overwriteResult = r.shaX2 === B ? 'x.bin = conținutul nou (move suprascrie)' : r.shaX2 === A ? 'x.bin = conținutul vechi' : 'altceva';
console.log(JSON.stringify(r, null, 1));
writeFileSync('out/p2-move.json', JSON.stringify(r, null, 1));
