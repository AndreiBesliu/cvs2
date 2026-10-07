// Sabotaje țintite: testul trebuie să devină ROȘU pe fiecare. Controlul (copia nemodificată) trebuie să fie verde.
// Fiecare sabotaj e o înlocuire de text într-o copie a prototipului; dacă înlocuirea nu se aplică, sabotajul e VOID (nu „prins”).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.PROTO_DIR || 'C:/Users/besli/Desktop/MyWork/Apps/cncvs2/docs/faza2/prototip-planse';
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const M = [
  { id: 'control', what: 'copia nemodificată', from: null, to: null },
  { id: 'M1-micsorare', what: 'rama mărită scalează și conținutul (defectul vechi „mărime schimbată în tăcere”)',
    from: 'for (const c of n.children) { const f = anchorF(c.anchor); c.x = r2(c.x + dw * f.fx); c.y = r2(c.y + dh * f.fy); }',
    to: 'for (const c of n.children) { const sx = nw / n.w, sy = nh / n.h; c.x = r2(c.x * sx); c.y = r2(c.y * sy); scaleNode(c, Math.min(sx, sy)); }' },
  { id: 'M2-rama-goala', what: 'Ctrl+D pe ramă copiază doar conturul (defectul vechi P1)',
    from: "np = { id: nid(doc, 'p'), x: f.pl.x + 20, y: f.pl.y + 20, rot: f.pl.rot, mx: f.pl.mx, node: clone(f.pl.node) };",
    to: "np = { id: nid(doc, 'p'), x: f.pl.x + 20, y: f.pl.y + 20, rot: f.pl.rot, mx: f.pl.mx, node: Object.assign(clone(f.pl.node), { children: [] }) };",
    alsoFrom: "const k = addPart(doc, clone(part.root), copyName(doc, part.name)); np = {", alsoTo: "const k = addPart(doc, Object.assign(clone(part.root), { children: [] }), copyName(doc, part.name)); np = {" },
  { id: 'M3-instante-copii', what: 'D: fiecare instanță primește propria copie a piesei (instanțe care sunt de fapt copii)',
    from: "let partId = it.ref ? refs[it.ref] : null;", to: "let partId = null;",
    alsoFrom: ": { id: nid(doc, 'p'), x: f.pl.x + i * (b.w + 10), y: f.pl.y, rot: f.pl.rot, partId: f.pl.partId, fields: clone(f.pl.fields || {}) };",
    alsoTo: ": { id: nid(doc, 'p'), x: f.pl.x + i * (b.w + 10), y: f.pl.y, rot: f.pl.rot, partId: addPart(doc, clone(doc.parts[f.pl.partId].root)), fields: clone(f.pl.fields || {}) };" },
  { id: 'M4-fara-varsare', what: 'așezarea nu varsă pe foaia următoare (defectul vechi P6)',
    from: "    if (y + b.h > sh.h - m) {\n      si++;", to: "    if (false) {\n      si++;" },
  { id: 'M5-spate-neoglindit', what: 'D: fața de jos nu e oglindită',
    from: "m: Mx.mul(Mx.t(ox + sh.w, oy), Mx.s(-1, 1)) });", to: "m: Mx.t(ox, oy) });" },
  { id: 'M6-escape-sare', what: 'Escape iese direct sus, din orice nivel',
    from: "const last = st.ctx[st.ctx.length - 1]; st.ctx = st.ctx.slice(0, -1); st.sel = [last];", to: "const first = st.ctx[0]; st.ctx = []; st.sel = [first];" },
];
const rows = [];
for (const m of M) {
  let h = html; let applied = true;
  for (const [a, b] of [[m.from, m.to], [m.alsoFrom, m.alsoTo]]) { if (!a) continue; const c = h.split(a).length - 1; if (c !== 1) applied = false; else h = h.replace(a, b); }
  if (!applied) { rows.push({ id: m.id, verdict: 'VOID (înlocuirea nu s-a aplicat)' }); continue; }
  const dir = path.join(HERE, 'sabotaje', m.id); fs.mkdirSync(path.join(dir, 'capturi'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), h);
  const res = path.join(dir, 'rezultate.json');
  const r = spawnSync(process.execPath, [path.join(HERE, 'test-planse.mjs')], { env: { ...process.env, PROTO_DIR: dir, SHOTS_DIR: path.join(dir, 'capturi'), RESULTS: res }, encoding: 'utf8', timeout: 170000 });
  let fails = []; try { fails = JSON.parse(fs.readFileSync(res, 'utf8')).picate; } catch (e) { fails = [{ s: '?', v: '?', check: 'fără rezultate: ' + (r.stderr || '').slice(0, 200) }]; }
  const caught = m.id === 'control' ? (r.status === 0 && fails.length === 0) : (r.status !== 0 && fails.length > 0);
  rows.push({ id: m.id, what: m.what, exit: r.status, picate: fails.length, verdict: m.id === 'control' ? (caught ? 'VERDE (corect)' : 'ROȘU (greșit!)') : (caught ? 'PRINS' : 'SCĂPAT'), exemple: fails.slice(0, 3).map(f => `${f.s}${f.v}: ${f.check}`) });
}
fs.writeFileSync(path.join(HERE, 'sabotaje.json'), JSON.stringify(rows, null, 2));
for (const r of rows) console.log(`${r.id.padEnd(20)} ${String(r.verdict).padEnd(16)} picate=${r.picate ?? '-'}  ${(r.exemple || []).join(' | ')}`);
const bad = rows.filter(r => r.verdict !== 'PRINS' && r.verdict !== 'VERDE (corect)');
process.exit(bad.length ? 1 : 0);
