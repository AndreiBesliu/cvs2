// Sonda 1b: validatorii rulați în Chromium sub CSP strict (script-src 'self', fără 'unsafe-eval') vs fără CSP.
// Arată cine are nevoie de eval (JIT) și cât costă pierderea lui. Rulare: node p1-csp.mjs [N=50000]
import { chromium } from 'playwright-core';
import { startServer, ORIGIN, CHROME, LAUNCH } from './lib/server.mjs';
import { writeFileSync } from 'node:fs';
const N = Number(process.argv[2] ?? 50000);
const REPS = Number(process.argv[3] ?? 7);
const NF = Number(process.argv[4] ?? 10);
const srv = await startServer('web', { csp: (p) => (p.endsWith('/csp.html') ? "default-src 'self'; script-src 'self'; object-src 'none'" : null) });
const browser = await chromium.launch({ ...LAUNCH, headless: true });
const rows = []; const ver = browser.version();
try {
  for (const lib of ['zod', 'valibot', 'typebox', 'arktype']) {
    for (const page of ['open', 'csp']) {
      const ctx = await browser.newContext(); const pg = await ctx.newPage();
      await pg.goto(`${ORIGIN}/${page}.html?lib=${lib}&n=${N}&reps=${REPS}&nf=${NF}`, { waitUntil: 'commit' });
      const r = await pg.waitForFunction(() => window.__done, null, { timeout: 300000, polling: 500 }).then((h) => h.jsonValue());
      rows.push({ lib, page, ok: r.ok, coldMs: r.coldMs, medianMs: r.medianMs, rejected: `${r.faultRejected}/${NF}`, exactPath: `${r.faultExact}/${NF}`, miss: (r.miss ?? []).join(' | ').slice(0, 140), error: r.error ?? '', violations: r.violations.join(';').slice(0, 60) });
      await ctx.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
console.table(rows);
writeFileSync('out/p1-csp.json', JSON.stringify({ N, browser: CHROME, version: ver, rows }, null, 1));
