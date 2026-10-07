// run.mjs - ruleaza psmini pe un EPS si scrie caile pictate ca JSON. ARUNCABIL.
// node src/run.mjs <fisier.eps> <full|body> <profil|none> <iesire.json>
import fs from 'node:fs';
import { runPS, psPart } from './psmini.mjs';

// Profilurile "body": definitiile procedurilor din CORPUL paginii, scrise dupa procset-ul din acelasi fisier
// (Illustrator CS6 / AGM_Core: liniile 779-786, 1809-1819, 1883-1933, 2357-2362, 2973-3012 din illuCS6_no_preview.eps).
export const PROFILES = {
  none: '',
  'ai-agm': `
/mo {moveto} def /li {lineto} def /cv {curveto} def /cp {closepath} def
/np {newpath} def /clp {clip newpath} def /eclp {eoclip newpath} def /nclp {newpath clip} def
/f {fill} def /ef {eofill} def /@ {stroke} def /ct {concat} def
/pgsv {/AGM_pg save def} def /pgrs {AGM_pg restore} def
/lw {setlinewidth} def /lc {setlinecap} def /lj {setlinejoin} def /ml {setmiterlimit} def /dsh {setdash} def /sadj {setstrokeadjust} def
/sop {pop} def /cmyk {setcmykcolor} def
/add_res {pop pop pop} def /get_res {pop pop null} def /get_csa_by_name {pop null} def /sepcs {pop} def /sep {pop} def
`,
};

const [file, mode = 'full', profile = 'none', out] = process.argv.slice(2);
const raw = fs.readFileSync(file);
const ps = psPart(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
const t0 = performance.now();
const r = runPS(ps, { mode, preamble: PROFILES[profile] ?? '', stopAtEOF: false });
const ms = performance.now() - t0;
let nseg = 0, ncurve = 0;
for (const p of r.paths) for (const sp of p.sub) for (const s of sp.pts) { nseg++; if (s.k === 'C') ncurve++; }
const kinds = {}; for (const p of r.paths) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
const summary = {
  file: file.split(/[\\/]/).pop(), mode, profile, ms: +ms.toFixed(1), fatal: r.fatal, reachedPct: +(100 * r.bytePos / r.total).toFixed(1),
  paths: r.paths.length, kinds, segments: nseg, curves: ncurve, clips: r.clips.length,
  unknownNames: [...r.stats.unknown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
  distinctOpsUsed: r.stats.opsUsed.size, steps: r.stats.steps, skipped: r.stats.skipped, errorsInStopped: r.stats.errors.length, firstErrors: r.stats.errors.slice(0, 3),
};
if (out) fs.writeFileSync(out, JSON.stringify({ summary, paths: r.paths, opsUsed: [...r.stats.opsUsed.keys()] }));
console.log(JSON.stringify(summary));
