// inventar.mjs - ce operatori PostScript standard cere un EPS real, fata de ce stie psmini. ARUNCABIL.
// "Standard" = cheile din systemdict-ul Ghostscript (listate de testonly/gs2pdf.cjs --systemdict), fara cele interne
// (cu punct, procent, majuscule de configurare). Numararea e pe numele EXECUTABILE din fisier, nu pe executie.
import fs from 'node:fs';
import { Scanner, psPart, implementedOps } from './psmini.mjs';

export function inventar(file, gsList) {
  const raw = fs.readFileSync(file);
  let ps = psPart(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
  // partea tiparibila se termina la %AI9_PrintingDataEnd (Illustrator) sau la sfarsitul fisierului
  const txt = Buffer.from(ps).toString('latin1'); const cut = txt.indexOf('%AI9_PrintingDataEnd'); if (cut > 0) ps = ps.subarray(0, cut);
  const std = new Set(gsList.filter((n) => n && /^[a-z=\[\]<>]/.test(n) && !/^[.%]/.test(n)));
  const sc = new Scanner(ps); const used = new Map(); let bodyStart = -1; let inBody = false; const bodyUsed = new Map();
  const onComment = (line) => { if (/^%%EndPageSetup/.test(line)) inBody = true; if (/^%%PageTrailer/.test(line)) inBody = false; };
  for (;;) {
    let t; try { t = sc.next(onComment); } catch { continue; }
    if (!t) break; if (t.k !== 'obj' || !t.v || t.v.t !== 'name' || !t.v.x) continue;
    used.set(t.v.v, (used.get(t.v.v) || 0) + 1); if (inBody) bodyUsed.set(t.v.v, (bodyUsed.get(t.v.v) || 0) + 1);
  }
  const impl = new Set(implementedOps());
  const stdUsed = [...used.keys()].filter((n) => std.has(n));
  const missing = stdUsed.filter((n) => !impl.has(n)).sort();
  const nonStd = [...used.keys()].filter((n) => !std.has(n));
  return {
    file: file.split(/[\\/]/).pop(), bytesPrintable: ps.length, distinctNames: used.size,
    standardOpsUsed: stdUsed.length, implementedByPsmini: stdUsed.length - missing.length, missing,
    producerProcNames: nonStd.length, bodyDistinctNames: bodyUsed.size, gsStandardOpsTotal: std.size, psminiOpsTotal: impl.size,
  };
}

if (process.argv[1] && process.argv[1].endsWith('inventar.mjs')) {
  const gsList = fs.readFileSync(process.argv[3], 'latin1').split(/\r?\n/);
  console.log(JSON.stringify(inventar(process.argv[2], gsList)));
}
