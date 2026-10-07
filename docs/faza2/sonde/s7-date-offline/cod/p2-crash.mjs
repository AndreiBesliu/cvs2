// Sonda 2b: salvare sigură la cădere. Procesul browserului e omorât brutal (TerminateProcess) la mijlocul scrierii
// versiunii v2 (64 MiB, câte 1 MiB la 60 ms). La repornire verificăm ce a supraviețuit, cu hash-urile calculate
// independent în Node (OpenSSL), întreg și pe bucăți de 1 MiB.
//   S1 = OPFS SyncAccessHandle, suprascriere pe loc (MARTORUL: trebuie să iasă stricat, altfel proba e oarbă)
//   S2 = OPFS createWritable (fișier swap, înlocuit la close)
//   S3 = fișier nou + pointer în IndexedDB, mutat abia după ce fișierul nou e complet
//   S4 = o singură tranzacție IndexedDB peste 64 de înregistrări
// Rulare: node p2-crash.mjs
import { chromium } from 'playwright-core';
import { rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { startServer, ORIGIN, LAUNCH, killProfile } from './lib/server.mjs';
import { gen, sha, chunkShas } from './lib/gen-node.mjs';

const PROFILE = resolve('out/prof-crash');
const KILL_AT = 20, SEED1 = 21, SEED2 = 22, BYTES = 64 << 20;
rmSync(PROFILE, { recursive: true, force: true });
const v1 = gen(BYTES, SEED1), v2 = gen(BYTES, SEED2);
const O = { v1: sha(v1), v2: sha(v2), c1: chunkShas(v1), c2: chunkShas(v2) };
const srv = await startServer('web');
const open = async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, { ...LAUNCH, headless: true });
  const pg = ctx.pages()[0] ?? (await ctx.newPage());
  await pg.goto(`${ORIGIN}/storage.html`); await pg.waitForFunction(() => window.__ready);
  return { ctx, pg };
};
function mainPid() {
  const ps = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*prof-crash*' -and $_.CommandLine -notlike '*--type=*' } | ForEach-Object { $_.ProcessId }`;
  return execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).split(/\s+/).filter(Boolean).map(Number);
}
const result = { oracle: { v1: O.v1.slice(0, 16), v2: O.v2.slice(0, 16) }, runs: {}, inspect: {} };
try {
  { const { ctx, pg } = await open(); const r = await pg.evaluate((s) => window.crashSetup(s), SEED1); result.setupOk = r.sha === O.v1; await ctx.close(); }
  for (const S of ['S1', 'S2', 'S3', 'S4']) {
    const { ctx, pg } = await open();
    const pids = mainPid();
    let killedAt = null, finished = false, lastProgress = -1;
    pg.on('console', (m) => {
      const t = m.text();
      if (t === 'GATA') finished = true;
      const mm = /^PROGRES (\d+)$/.exec(t);
      if (mm) { lastProgress = +mm[1]; if (lastProgress >= KILL_AT && killedAt === null) { killedAt = lastProgress; for (const p of pids) { try { process.kill(p, 'SIGKILL'); } catch {} } } }
    });
    await pg.evaluate(([s, seed]) => window.crashWrite(s, seed, 60), [S, SEED2]).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    const swept = killProfile(PROFILE);
    await ctx.close().catch(() => {});
    result.runs[S] = { mainPids: pids.length, killedAtChunk: killedAt, lastProgressSeen: lastProgress, finishedBeforeKill: finished, leftoverProcsKilled: swept };
    console.log(S, JSON.stringify(result.runs[S]));
  }
  const { ctx, pg } = await open();
  const ins = await pg.evaluate(() => window.crashInspect());
  await ctx.close();
  result.files = ins.files;
  const verdict = (x) => {
    if (!x?.chunks) return { state: 'LIPSĂ' };
    const n1 = x.chunks.filter((c, i) => c === O.c1[i]).length, n2 = x.chunks.filter((c, i) => c === O.c2[i]).length;
    const state = x.sha === O.v1 ? 'v1 INTACT' : x.sha === O.v2 ? 'v2 complet' : 'STRICAT (amestec)';
    return { state, chunksV1: n1, chunksV2: n2, size: x.size };
  };
  for (const S of ['S1', 'S2', 'S3', 'S4']) result.inspect[S] = { ...verdict(ins[S]), ...(S === 'S3' ? { head: ins.S3.head?.name } : {}) };
} finally { await srv.close(); killProfile(PROFILE); }
console.table(result.inspect);
console.log('fișiere OPFS după repornire:', result.files);
writeFileSync('out/p2-crash.json', JSON.stringify(result, null, 1));
