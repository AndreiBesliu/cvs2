// Verifica: PathKit (Skia PathOps, 146 KB gzip) pastreaza arcele ca conice exacte prin boolean, ca si CanvasKit.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PathKitInit = require('pathkit-wasm/bin/pathkit.js');
const PK = await PathKitInit({ wasmBinary: fs.readFileSync(new URL('./node_modules/pathkit-wasm/bin/pathkit.wasm', import.meta.url)) });
const circ = (cx, cy, r) => { const p = PK.NewPath(); const w = Math.SQRT1_2; p.moveTo(cx + r, cy); p.conicTo(cx + r, cy + r, cx, cy + r, w); p.conicTo(cx - r, cy + r, cx - r, cy, w); p.conicTo(cx - r, cy - r, cx, cy - r, w); p.conicTo(cx + r, cy - r, cx + r, cy, w); p.closePath(); return p; };
const a = circ(0, 0, 30), b = circ(30, 0, 30);
const u = PK.MakeFromOp(a, b, PK.PathOp.UNION);
const cmds = u.toCmds();
const verbs = {}; for (const c of cmds) verbs[c[0]] = (verbs[c[0]] || 0) + 1;
console.log('verbe (0 move, 1 line, 2 quad, 3 conic, 4 cubic, 5 close):', JSON.stringify(verbs));
console.log('prima conica [verb, x1, y1, x2, y2, w]:', JSON.stringify(cmds.find((c) => c[0] === 3)), ' cos(15°) =', Math.cos(Math.PI / 12));
a.delete(); b.delete(); u.delete();
