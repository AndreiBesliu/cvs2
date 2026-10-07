// Sonda s10: verifică prototipul de planșe (variantele A și D, cele 8 scenarii din LECTII.md §5.7)
// cu gesturi reale (mouse, tastatură) în Microsoft Edge, fără motor CAM.
// Oracolele sunt valori calculate pe hârtie (scrise ca numere în test), nu valori citite din aplicație.
// Rulare: node test-planse.mjs   (PROTO_DIR=... pentru altă copie a prototipului; HEADED=1 ca să vezi fereastra)
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.PROTO_DIR || 'C:/Users/besli/Desktop/MyWork/Apps/cncvs2/docs/faza2/prototip-planse';
const SHOTS = process.env.SHOTS_DIR || path.join(HERE, 'capturi'); // capturile pentru repo se fac cu SHOTS_DIR=<repo>/capturi
const PORT = 5180;
const T0 = Date.now();

/* ---------- server static minimal, doar pe 127.0.0.1:5180 ---------- */
const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const p = path.join(ROOT, rel);
  if (!p.startsWith(path.normalize(ROOT))) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(b); });
});
await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/index.html`;

const browser = await chromium.launch({ channel: 'msedge', headless: !process.env.HEADED });
const BVER = browser.version();
const consoleErrors = [];
const results = [];
const metrics = {};
let G = 0; // gesturi în scenariul curent

function check(s, v, name, ok, got) { results.push({ s, v, check: name, ok: !!ok, got: ok ? undefined : got }); }
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;
const S = page => page.evaluate(() => window.__proto.summary());
const node = (page, p) => page.evaluate(q => window.__proto.node(q), p);
const cOf = (page, p, x, y, kind) => page.evaluate(([q, a, b, k]) => window.__proto.clientOf(q, a, b, k), [p, x, y, kind || 'top']);
const cSheet = (page, sid, x, y) => page.evaluate(([s, a, b]) => window.__proto.clientOfSheet(s, a, b, 'top'), [sid, x, y]);
// lume din client, calculată în test din atributul viewBox (nu din codul aplicației)
const worldBox = (page, sel, i = 0) => page.evaluate(([q, idx]) => {
  const el = document.querySelectorAll(q)[idx]; if (!el) return null; const svg = document.getElementById('cv');
  const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number); const R = svg.getBoundingClientRect(); const r = el.getBoundingClientRect();
  const sx = vb[2] / R.width, sy = vb[3] / R.height;
  return { x: vb[0] + (r.left - R.left) * sx, y: vb[1] + (r.top - R.top) * sy, w: r.width * sx, h: r.height * sy };
}, [sel, i]);
async function click(page, pt, mods) { G++; if (mods) for (const m of mods) await page.keyboard.down(m); await page.mouse.click(pt[0], pt[1]); if (mods) for (const m of mods) await page.keyboard.up(m); }
async function dbl(page, pt) { G++; await page.mouse.dblclick(pt[0], pt[1]); }
async function drag(page, a, b) { G++; await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 5 }); await page.mouse.move(b[0], b[1], { steps: 5 }); await page.mouse.up(); }
async function key(page, k) { G++; await page.keyboard.press(k); }
async function btn(page, sel) { G++; await page.click(sel); }
async function fillEnter(page, sel, val) { G++; await page.fill(sel, String(val)); await page.press(sel, 'Enter'); }
async function choose(page, sel, val) { G++; await page.selectOption(sel, val); }
const geom = n => JSON.stringify(n, (k, v) => (k === 'id' ? undefined : v));

async function openScenario(page, v, n) {
  await page.click(v === 'A' ? '#vA' : '#vD');
  await page.click(`[data-scen="${n}"]`);
  await page.click('[data-act="reset"]');
  G = 0;
}

/* ---------- scenariile ---------- */
async function s1(page, v) {
  const s = 1;
  await click(page, await cOf(page, ['p1_1'], 40, 170));
  let st = await S(page);
  check(s, v, 'clic alege rama întreagă (un singur obiect)', st.sel.join() === 'p1_1' && !st.ctx.length, st.sel);
  await page.fill('#insp [data-f="w"]', '400');
  st = await S(page);
  check(s, v, 'previzualizare înainte de Enter: fantoma 400×200', st.ghost && st.ghost.w === 400 && st.ghost.h === 200, st.ghost);
  const ghosts = await page.locator('#cv .ghost').count();
  check(s, v, 'conturul fantomă e desenat (contur + inel + 2 elemente)', ghosts === 4, ghosts);
  await page.press('#insp [data-f="w"]', 'Escape');
  st = await S(page); let n = await node(page, ['p1_1']);
  check(s, v, 'Escape în câmp renunță: fără fantomă, rama tot 300', !st.ghost && n.w === 300, { ghost: st.ghost, w: n.w });
  const hb = await page.locator('#cv [data-handle="e"]').boundingBox();
  await drag(page, [hb.x + hb.width / 2, hb.y + hb.height / 2], await cSheet(page, 's1', 440, 140));
  n = await node(page, ['p1_1']);
  const text = n.children.find(c => c.id === 'text'), hole = n.children.find(c => c.id === 'gaura');
  check(s, v, 'rama: 400×200 (oracol: mânerul dus la x=440, stânga fixă la 40)', n.w === 400 && n.h === 200, [n.w, n.h]);
  const ring = await page.locator('#cv .v-top rect.ring').first().evaluate(e => ({ x: +e.getAttribute('x'), y: +e.getAttribute('y'), w: +e.getAttribute('width'), h: +e.getAttribute('height') }));
  check(s, v, 'canelura desenată: 380×180 la 10 mm (oracol 400−2·10, 200−2·10)', ring.x === 10 && ring.y === 10 && ring.w === 380 && ring.h === 180, ring);
  check(s, v, 'textul: centrul la x=200 (oracol 400/2), mărimea 24 neschimbată', near(text.x + text.w / 2, 200) && text.size === 24, text);
  check(s, v, 'gaura: Ø8, centru (200, 28): rămâne sus, nu crește', near(hole.x + hole.w / 2, 200) && near(hole.y + hole.h / 2, 28) && hole.w === 8 && hole.h === 8, hole);
  st = await S(page);
  check(s, v, 'plăcuța rămâne la (40, 40) pe ' + (v === 'A' ? 'planșă' : 'foaie'), st.sheets[0].items[0].x === 40 && st.sheets[0].items[0].y === 40, st.sheets[0].items[0]);
  check(s, v, 'fără avertismente', st.warnings.length === 0, st.warnings);
  if (v === 'D') check(s, v, 'D: nivelul 2 rămâne ascuns (fără listă de piese)', !st.showInst && !st.lib, st.chip);
}
async function s2(page, v) {
  const s = 2;
  await dbl(page, await cOf(page, ['p1_1'], 150, 108));
  let st = await S(page);
  check(s, v, 'dublu-clic intră în ramă și alege textul', st.ctx.join('/') === 'p1_1' && st.sel.join() === 'text', { ctx: st.ctx, sel: st.sel });
  check(s, v, 'firul arată «… › Plăcuță»', /›\s*Plăcuță$/.test(st.crumbs) || /Plăcuță$/.test(st.crumbs), st.crumbs);
  const tA = await node(page, ['p1_1', 'text']);
  await drag(page, await cOf(page, ['p1_1'], 150, 108), await cOf(page, ['p1_1'], 150, 128));
  const tB = await node(page, ['p1_1', 'text']); const fr = await node(page, ['p1_1']);
  check(s, v, 'doar textul s-a mutat, 20 mm în jos', near(tB.y - tA.y, 20) && near(tB.x, tA.x), { before: [tA.x, tA.y], after: [tB.x, tB.y] });
  check(s, v, 'rama a rămas 300×200 la (40, 40)', fr.w === 300 && fr.h === 200 && (await S(page)).sheets[0].items[0].x === 40, [fr.w, fr.h]);
  await key(page, 'Escape');
  st = await S(page);
  check(s, v, 'Escape iese și alege rama', !st.ctx.length && st.sel.join() === 'p1_1', { ctx: st.ctx, sel: st.sel });
  await key(page, 'Control+d');
  st = await S(page); const it = st.sheets[0].items;
  const a = await node(page, [it[0].id]), b = it[1] ? await node(page, [it[1].id]) : null;
  check(s, v, 'Ctrl+D: o ramă nouă, cu tot conținutul (2 elemente, aceleași locuri)', it.length === 2 && b && geom(a.children) === geom(b.children) && b.children.length === 2, it.map(x => x.texts));
  check(s, v, 'copia e la +20 mm și e aleasă', it[1] && it[1].x === 60 && it[1].y === 60 && st.sel.join() === it[1].id, it[1]);
  await click(page, await cOf(page, ['p1_1'], 8, 100)); // doar în original, departe de mânerele copiei
  st = await S(page);
  check(s, v, 'clic pe marginea originalului (în afara copiei) alege originalul', st.sel.join() === 'p1_1', st.sel);
  await key(page, 'Delete');
  st = await S(page);
  const left = st.sheets[0].items; const rest = left[0] ? await node(page, [left[0].id]) : null;
  check(s, v, 'Delete: dispare rama cu tot ce e în ea; nimic nu rămâne pe ' + (v === 'A' ? 'planșă' : 'foaie'), left.length === 1 && left[0].id !== 'p1_1' && rest.children.length === 2 && st.nodes === 3, { items: left.length, nodes: st.nodes });
  if (v === 'D') check(s, v, 'D: nivelul 2 rămâne ascuns după Ctrl+D și Delete', !st.showInst && !st.lib, st.chip);
}
async function s3(page, v) {
  const s = 3; const cerc = [130, 58];
  await dbl(page, await cOf(page, ['p1_1'], ...cerc));
  let st = await S(page);
  check(s, v, 'primul dublu-clic: în ramă, alege logo-ul', st.ctx.join('/') === 'p1_1' && st.sel.join() === 'logo', { ctx: st.ctx, sel: st.sel });
  await dbl(page, await cOf(page, ['p1_1'], ...cerc));
  st = await S(page);
  check(s, v, 'al doilea dublu-clic: în logo, alege cercul; firul arată «… › Plăcuță › Logo»', st.ctx.join('/') === 'p1_1/logo' && st.sel.join() === 'cerc' && /Plăcuță\s*›\s*Logo$/.test(st.crumbs), { ctx: st.ctx, sel: st.sel, crumbs: st.crumbs });
  const c0 = await node(page, ['p1_1', 'logo', 'cerc']), f0 = await node(page, ['p1_1', 'logo', 'frunze']);
  await drag(page, await cOf(page, ['p1_1'], ...cerc), await cOf(page, ['p1_1'], cerc[0] + 10, cerc[1]));
  const c1 = await node(page, ['p1_1', 'logo', 'cerc']), f1 = await node(page, ['p1_1', 'logo', 'frunze']), lg = await node(page, ['p1_1', 'logo']);
  check(s, v, 'cercul s-a mutat +10 mm; frunzele și logo-ul nu', near(c1.x - c0.x, 10) && near(c1.y, c0.y) && geom(f0) === geom(f1) && lg.x === 110 && lg.y === 28, { c0: [c0.x, c0.y], c1: [c1.x, c1.y] });
  await key(page, 'Escape'); st = await S(page);
  check(s, v, 'Escape 1: înapoi în ramă, logo ales', st.ctx.join('/') === 'p1_1' && st.sel.join() === 'logo', { ctx: st.ctx, sel: st.sel });
  await key(page, 'Escape'); st = await S(page);
  check(s, v, 'Escape 2: sus, rama aleasă', !st.ctx.length && st.sel.join() === 'p1_1', { ctx: st.ctx, sel: st.sel });
  await key(page, 'Escape'); st = await S(page);
  check(s, v, 'Escape 3: nimic ales', !st.ctx.length && !st.sel.length, st.sel);
  const fr1 = [110 + 46 + 17, 28 + 9];
  await dbl(page, await cOf(page, ['p1_1'], ...fr1)); await dbl(page, await cOf(page, ['p1_1'], ...fr1)); await dbl(page, await cOf(page, ['p1_1'], ...fr1));
  st = await S(page);
  check(s, v, 'trei niveluri: Plăcuță › Logo › Frunze, frunza 1 aleasă', st.ctx.join('/') === 'p1_1/logo/frunze' && st.sel.join() === 'frunza1' && st.crumbs.split('›').length === 4, { ctx: st.ctx, crumbs: st.crumbs });
  await btn(page, '#crumbs [data-lvl="1"]'); st = await S(page);
  check(s, v, 'clic pe fir sare direct în ramă', st.ctx.join('/') === 'p1_1' && st.sel.join() === 'logo', { ctx: st.ctx, sel: st.sel });
  await click(page, await cOf(page, ['p1_1'], 150, 148), ['Shift']);
  await key(page, 'Control+g'); st = await S(page);
  const pl = await node(page, ['p1_1']); const g = pl.children[0];
  check(s, v, 'Ctrl+G pe logo + text: grup nou, cu logo-ul (grup în grup în grup) înăuntru', pl.children.length === 1 && g.type === 'group' && g.children.some(c => c.id === 'logo' && c.children.some(d => d.id === 'frunze')), pl.children.map(c => c.id));
  await key(page, 'Control+z'); const pl2 = await node(page, ['p1_1']);
  check(s, v, 'Ctrl+Z desface gruparea', pl2.children.length === 2, pl2.children.map(c => c.id));
  await key(page, 'Escape'); await key(page, 'Escape');
  if (v === 'D') { st = await S(page); check(s, v, 'D: nivelul 2 rămâne ascuns', !st.showInst && !st.lib, st.chip); }
}
const GRID9 = [[10, 10], [170, 10], [330, 10], [10, 120], [170, 120], [330, 120], [10, 230], [170, 230], [330, 230]];
async function s4(page, v) {
  const s = 4;
  await click(page, await cOf(page, ['p1_1'], 12, 12));
  await btn(page, '#toolbar [data-act="more"]');
  G++; await page.fill('#dN', '12');
  await btn(page, '#dOk');
  let st = await S(page);
  const [a, b] = st.sheets;
  // oracol pe hârtie: pe rând încap floor((600−2·10+10)/(150+10)) = 3; rânduri floor((400−2·10+10)/(100+10)) = 3 → 9 pe foaie; 12 = 9 + 3
  check(s, v, 'rânduri: 9 pe prima, 3 pe a doua (oracol 3×3 + 3)', st.sheets.length === 2 && a.items.length === 9 && b && b.items.length === 3, st.sheets.map(x => x.items.length));
  const posOk = a.items.every((it, i) => it.bbox.x === GRID9[i][0] && it.bbox.y === GRID9[i][1] && it.bbox.w === 150 && it.bbox.h === 100) && b.items.every((it, i) => it.bbox.x === GRID9[i][0] && it.bbox.y === GRID9[i][1]);
  check(s, v, 'pozițiile = grila pe hârtie (x 10/170/330, y 10/120/230), nimic rotit sau micșorat', posOk, a.items.map(i => i.bbox));
  if (v === 'A') check(s, v, 'A: 12 copii separate (24 de noduri stocate)', st.placements === 12 && st.nodes === 24, { pl: st.placements, nodes: st.nodes });
  else check(s, v, 'D: o piesă cu 12 instanțe (2 noduri stocate), nivelul 2 apare la cerere', st.parts.length === 1 && st.parts[0].count === 12 && st.nodes === 2 && st.showInst && /×12/.test(st.why) && /Suport/.test(st.lib), { parts: st.parts, nodes: st.nodes, why: st.why });
  const last = b.items[2];
  const s2id = st.sheets[1].id;
  await click(page, await cSheet(page, s2id, last.bbox.x + 75, last.bbox.y + 50));
  await key(page, 'r');
  st = await S(page); let it = st.sheets[1].items.find(x => x.id === last.id);
  check(s, v, 'R: rotit 90°, cutia 100×150 în jurul aceluiași centru (405, 60)', it.rot === 90 && it.bbox.w === 100 && it.bbox.h === 150 && it.bbox.x === 355 && it.bbox.y === -15, it);
  await drag(page, await cSheet(page, s2id, it.bbox.x + 50, it.bbox.y + 75), await cSheet(page, 's1', 490 + 50, 10 + 75));
  st = await S(page); it = st.sheets[0].items.find(x => x.id === last.id);
  check(s, v, 'mutat înapoi pe prima, în fâșia din dreapta: cutia (490, 10, 100, 150)', it && it.bbox.x === 490 && it.bbox.y === 10 && it.bbox.w === 100 && it.bbox.h === 150, it || st.sheets.map(x => x.items.length));
  check(s, v, 'acum 10 + 2, fără suprapuneri și fără nimic ieșit din ' + (v === 'A' ? 'planșă' : 'foaie'), st.sheets[0].items.length === 10 && st.sheets[1].items.length === 2 && st.warnings.length === 0, { n: st.sheets.map(x => x.items.length), w: st.warnings });
}
async function s5(page, v) {
  const s = 5; let st = await S(page);
  const ids = st.sheets.flatMap(x => x.items.map(i => i.id));
  check(s, v, 'pornește cu 12 suporturi «CAFÉ» (9 + 3)', ids.length === 12 && st.sheets.every(x => x.items.every(i => i.texts[0] === 'CAFÉ')), ids.length);
  const texts = s2 => s2.sheets.flatMap(x => x.items.map(i => i.texts[0]));
  await dbl(page, await cOf(page, ['p2_1'], 75, 50));
  st = await S(page);
  check(s, v, 'dublu-clic pe un suport intră în el și alege textul', st.ctx.join('/') === 'p2_1' && st.sel.join() === 'text', { ctx: st.ctx, sel: st.sel });
  if (v === 'D') check(s, v, 'D: banda spune clar că editezi piesa, cu toate cele 12 instanțe', /toate cele 12 instanțe/.test(st.banner), st.banner);
  else check(s, v, 'A: nicio bandă (nu există piesă-sursă)', !st.banner, st.banner);
  await fillEnter(page, '#insp [data-f="text"]', 'CEAI');
  st = await S(page); let t = texts(st);
  if (v === 'D') {
    check(s, v, 'D: un singur gest a schimbat toate 12 în «CEAI»', t.filter(x => x === 'CEAI').length === 12, t);
    await key(page, 'Escape');
    await btn(page, '#insp [data-act="detach"]');
    st = await S(page);
    check(s, v, 'D: «Desprinde» face o piesă separată (11 + 1)', st.parts.length === 2 && st.parts.map(p => p.count).sort((x, y) => x - y).join() === '1,11', st.parts);
    await dbl(page, await cOf(page, ['p2_1'], 75, 50));
    st = await S(page);
    check(s, v, 'D: în piesa desprinsă nu mai apare banda «toate»', !st.banner, st.banner);
    await fillEnter(page, '#insp [data-f="text"]', 'ZAHĂR');
  } else {
    check(s, v, 'A: s-a schimbat doar copia editată (1 «CEAI», 11 «CAFÉ»)', t.filter(x => x === 'CEAI').length === 1 && t.filter(x => x === 'CAFÉ').length === 11, t);
    for (const id of ids.filter(x => x !== 'p2_1')) { await dbl(page, await cOf(page, [id], 75, 50)); await fillEnter(page, '#insp [data-f="text"]', 'CEAI'); }
    st = await S(page); t = texts(st);
    check(s, v, 'A: după încă 11 editări, toate 12 «CEAI»', t.filter(x => x === 'CEAI').length === 12, t);
    await dbl(page, await cOf(page, ['p2_1'], 75, 50)); await fillEnter(page, '#insp [data-f="text"]', 'ZAHĂR');
  }
  st = await S(page); t = texts(st);
  check(s, v, 'rezultat: 11 «CEAI» și 1 «ZAHĂR»', t.filter(x => x === 'CEAI').length === 11 && t.filter(x => x === 'ZAHĂR').length === 1, t);
}
const NAMES = ['Ana', 'Andrei', 'Bianca', 'Cristian', 'Diana', 'Elena', 'Florin', 'Gabriela', 'Horia', 'Ioana', 'Ionuț', 'Larisa', 'Mihai', 'Mara', 'Nicoleta', 'Ovidiu', 'Paula', 'Radu', 'Sorina', 'Tudor', 'Ștefan', 'Teodora', 'Vlad', 'Valentina', 'Adrian', 'Carmen', 'Dan', 'Irina', 'Marius', 'Oana'];
async function s6(page, v) {
  const s = 6;
  await click(page, await cOf(page, ['p1_1'], 8, 8));
  await btn(page, '#toolbar [data-act="csv"]');
  await btn(page, '#dOk');
  let st = await S(page); const all = s2 => s2.sheets.flatMap(x => x.items);
  // oracol: plăcuța 180×60 → 3 pe rând (3·180+2·10=560 ≤ 580), 5 rânduri (5·60+4·10=340 ≤ 380) → 15 pe foaie → 30 = 15 + 15
  check(s, v, '30 de plăcuțe: 15 + 15 (oracol 3×5 pe foaie)', st.sheets.length === 2 && st.sheets[0].items.length === 15 && st.sheets[1].items.length === 15, st.sheets.map(x => x.items.length));
  check(s, v, 'numele în ordinea din CSV', all(st).map(i => i.texts[0]).join() === NAMES.join(), all(st).map(i => i.texts[0]));
  if (v === 'A') check(s, v, 'A: 30 de copii, 60 de noduri stocate, numele scris în copie', st.placements === 30 && st.nodes === 60 && all(st).every(i => i.fields === null), { pl: st.placements, nodes: st.nodes });
  else check(s, v, 'D: o piesă, 30 de instanțe, numele stă pe instanță', st.parts.length === 1 && st.parts[0].count === 30 && st.nodes === 2 && all(st).every((i, k) => i.fields && i.fields.nume === NAMES[k]) && st.showInst, { parts: st.parts, nodes: st.nodes });
  const first = all(st)[0].id;
  await dbl(page, await cOf(page, [first], 90, 30));
  st = await S(page);
  if (v === 'D') check(s, v, 'D: banda arată că mărimea se schimbă pe toate 30', /toate cele 30 de instanțe/.test(st.banner), st.banner);
  await fillEnter(page, '#insp [data-f="size"]', '26');
  const sizes = await page.evaluate(() => [...document.querySelectorAll('#cv .v-top text.sh')].map(e => +e.getAttribute('font-size')));
  if (v === 'D') check(s, v, 'D: un gest → textul are 26 pe toate 30', sizes.length === 30 && sizes.every(x => x === 26), sizes);
  else check(s, v, 'A: s-a mărit doar copia editată (1 × 26, 29 × 20)', sizes.filter(x => x === 26).length === 1 && sizes.filter(x => x === 20).length === 29, sizes);
  await key(page, 'Escape'); await key(page, 'Escape');
  st = await S(page); const fifth = all(st)[4];
  if (v === 'D') {
    await click(page, await cSheet(page, 's1', fifth.bbox.x + 8, fifth.bbox.y + 8));
    await fillEnter(page, '#insp [data-f="field:nume"]', 'Mihaela');
  } else {
    await dbl(page, await cOf(page, [fifth.id], 90, 30));
    await fillEnter(page, '#insp [data-f="text"]', 'Mihaela');
  }
  st = await S(page); const names2 = all(st).map(i => i.texts[0]);
  check(s, v, 'un singur nume corectat (Diana → Mihaela), restul neatinse', names2[4] === 'Mihaela' && names2.filter((x, i) => i !== 4).join() === NAMES.filter((x, i) => i !== 4).join(), names2);
}
async function s7(page, v) {
  const s = 7; let st;
  if (v === 'D') {
    await btn(page, '#toolbar [data-act="face-spate"]');
    st = await S(page);
    check(s, v, 'D: «Fața: Jos» dă foii fața de jos, cu 2 știfturi pe axa x=300', st.sheets[0].flip && st.sheets[0].pins.length === 2 && st.sheets[0].pins.every(p => p.x === 300), st.sheets[0]);
    check(s, v, 'D: apare doar fața (instanțele rămân ascunse)', !st.showInst && /fața de jos/.test(st.chip), st.chip);
    await dbl(page, await cOf(page, ['p1_1'], 20, 20));
    await btn(page, '#toolbar [data-act="ins-rect"]');
    await fillEnter(page, '#insp [data-f="w"]', 120); await fillEnter(page, '#insp [data-f="h"]', 80);
    await fillEnter(page, '#insp [data-f="x"]', 90); await fillEnter(page, '#insp [data-f="y"]', 60);
    st = await S(page); const door = await node(page, ['p1_1']); const pk = door.children.find(c => c.type === 'rect');
    check(s, v, 'D: buzunarul 120×80 e în ușiță, pe spate, cu rolul «buzunar»', pk && pk.face === 'spate' && pk.role === 'pocket' && pk.w === 120 && pk.h === 80 && pk.x === 90 && pk.y === 60, pk);
    // oracol: ușița la x=80 → buzunarul pe foaie la x 170..290; întors stânga↔dreapta pe 600: x 310..430; vederea de jos e la oy = 400 + 110
    let wb = await worldBox(page, '#cv .v-bottom rect.role-pocket');
    check(s, v, 'D: pe fața de jos buzunarul apare oglindit la x 310..430, y 670..750', wb && near(wb.x, 310, 1) && near(wb.x + wb.w, 430, 1) && near(wb.y, 670, 1) && near(wb.y + wb.h, 750, 1), wb);
    await key(page, 'Escape');
    await drag(page, await cOf(page, ['p1_1'], 20, 20), await cOf(page, ['p1_1'], 70, 20));
    st = await S(page); wb = await worldBox(page, '#cv .v-bottom rect.role-pocket');
    check(s, v, 'D: muți ușița +50 mm sus → spatele o urmează: buzunarul la x 260..380', st.sheets[0].items[0].x === 130 && wb && near(wb.x, 260, 1) && near(wb.x + wb.w, 380, 1), { x: st.sheets[0].items[0].x, wb });
    check(s, v, 'D: fără avertismente', st.warnings.length === 0, st.warnings);
  } else {
    await click(page, await cOf(page, ['p1_1'], 20, 20));
    await btn(page, '#toolbar [data-act="mirror-sheet"]');
    st = await S(page); const copy = st.sheets[1] && st.sheets[1].items[0];
    // oracol: ușița la x 80..380 pe 600 → oglinda la x 220..520
    check(s, v, 'A: planșa 2 e o copie oglindită: ușița la x 220..520', st.sheets.length === 2 && copy && copy.mx && copy.bbox.x === 220 && copy.bbox.w === 300, copy);
    await dbl(page, await cOf(page, [copy.id], 150, 100));
    st = await S(page);
    check(s, v, 'A: în copie, dublu-clic alege relieful', st.ctx.join() === copy.id && st.sel.join() === 'relief', { ctx: st.ctx, sel: st.sel });
    await key(page, 'Delete');
    await btn(page, '#toolbar [data-act="ins-rect"]');
    await choose(page, '#insp [data-f="role"]', 'pocket');
    await fillEnter(page, '#insp [data-f="w"]', 120); await fillEnter(page, '#insp [data-f="h"]', 80);
    await fillEnter(page, '#insp [data-f="x"]', 90); await fillEnter(page, '#insp [data-f="y"]', 60);
    const cnode = await node(page, [copy.id]); const onode = await node(page, ['p1_1']);
    check(s, v, 'A: copia are buzunarul, originalul își păstrează relieful', cnode.children.length === 1 && cnode.children[0].role === 'pocket' && onode.children.length === 1 && onode.children[0].role === 'relief', { c: cnode.children.map(c => c.role), o: onode.children.map(c => c.role) });
    await key(page, 'Escape'); await key(page, 'Escape');
    // știfturile, de mână: câte două pe fiecare planșă, în aceleași locuri (300,25) și (300,375)
    for (const sid of ['s1', st.sheets[1].id]) {
      await btn(page, `#cv [data-sheet-label="${sid}"]`);
      for (const y of [25, 375]) {
        await btn(page, '#toolbar [data-act="ins-ellipse"]');
        await choose(page, '#insp [data-f="role"]', 'pin');
        await fillEnter(page, '#insp [data-f="w"]', 8); await fillEnter(page, '#insp [data-f="h"]', 8);
        await fillEnter(page, '#insp [data-f="x"]', 296); await fillEnter(page, '#insp [data-f="y"]', y - 4);
      }
    }
    st = await S(page);
    check(s, v, 'A: 2 știfturi pe fiecare planșă, puse de mână', st.sheets[0].items.length === 3 && st.sheets[1].items.length === 3, st.sheets.map(x => x.items.length));
    await drag(page, await cOf(page, ['p1_1'], 20, 20), await cOf(page, ['p1_1'], 70, 20)); // tragerea alege singură ușița
    st = await S(page); const o = st.sheets[0].items.find(x => x.id === 'p1_1'); const c2 = st.sheets[1].items.find(x => x.id === copy.id);
    const expected = 600 - (o.bbox.x + o.bbox.w);
    check(s, v, 'A: muți ușița pe planșa 1 (+50) → spatele NU o urmează (nealiniere 50 mm)', o.bbox.x === 130 && c2.bbox.x === 220 && expected === 170, { o: o.bbox.x, copy: c2.bbox.x, expected });
    check(s, v, 'A: nealinierea nu dă niciun avertisment (A nu știe că sunt aceeași piesă)', !st.warnings.some(w => /spate|aliniere/.test(w)), st.warnings);
  }
}
async function s8(page, v) {
  const s = 8;
  await btn(page, '#cv [data-sheet-label="s1"]');
  await fillEnter(page, '#insp [data-f="w"]', 1200);
  let st = await S(page);
  check(s, v, (v === 'A' ? 'planșa' : 'foaia') + ' are 1200×400', st.sheets[0].w === 1200 && st.sheets[0].h === 400, [st.sheets[0].w, st.sheets[0].h]);
  await btn(page, '#toolbar [data-act="ins-text"]');
  await fillEnter(page, '#insp [data-f="text"]', 'ATELIER'); await fillEnter(page, '#insp [data-f="size"]', 150);
  await btn(page, '#toolbar [data-act="ins-rect"]');
  await choose(page, '#insp [data-f="role"]', 'groove');
  await fillEnter(page, '#insp [data-f="x"]', 20); await fillEnter(page, '#insp [data-f="y"]', 20);
  await fillEnter(page, '#insp [data-f="w"]', 1160); await fillEnter(page, '#insp [data-f="h"]', 360);
  st = await S(page); const it = st.sheets[0].items;
  const rect = it.find(x => x.texts.length === 0), txt = it.find(x => x.texts[0] === 'ATELIER');
  check(s, v, 'canelura de chenar la 20 mm: cutia (20, 20, 1160, 360) (oracol 1200−2·20, 400−2·20)', rect && rect.bbox.x === 20 && rect.bbox.y === 20 && rect.bbox.w === 1160 && rect.bbox.h === 360, rect);
  check(s, v, 'textul «ATELIER» e pe ' + (v === 'A' ? 'planșă' : 'foaie') + ', fără avertismente', txt && st.warnings.length === 0, st.warnings);
  if (v === 'D') check(s, v, 'D: al doilea nivel NU a apărut (fără piese/instanțe vizibile)', !st.showInst && !st.lib && /ascuns/.test(st.chip) && !/piesă|instanț/i.test(st.crumbs), { chip: st.chip, crumbs: st.crumbs });
}
const SC = [s1, s2, s3, s4, s5, s6, s7, s8];

/* ---------- rularea ---------- */
const ctx = await browser.newContext({ viewport: { width: 1280, height: 780 }, colorScheme: 'light' });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${PORT}` });
const page = await ctx.newPage();
page.setDefaultTimeout(4000);
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
await page.goto(URL);
fs.mkdirSync(SHOTS, { recursive: true });
for (const v of ['A', 'D']) {
  for (let n = 1; n <= 8; n++) {
    await openScenario(page, v, n);
    const t = Date.now();
    try { await SC[n - 1](page, v); } catch (e) { check(n, v, 'scenariul a rulat fără excepție', false, String(e && e.stack || e).slice(0, 400)); }
    const st = await S(page);
    metrics[n + v] = { gesturi: G, concepte: st.concepts.length, lista: st.concepts, noduri: st.nodes, plasari: st.placements, ms: Date.now() - t };
    await page.screenshot({ path: path.join(SHOTS, `s${n}-${v}.png`) });
  }
}
// notițele: se salvează, rămân după reîncărcare, se copiază
await page.click('[data-scen="1"]'); await page.click('#vA');
await page.fill('#note', 'Notiță de test: A pare mai simplu aici.');
await page.reload();
await page.click('[data-scen="1"]'); await page.click('#vA');
const kept = await page.inputValue('#note');
check(0, '-', 'notița rămâne după reîncărcare (localStorage)', kept === 'Notiță de test: A pare mai simplu aici.', kept);
await page.click('#bCopy');
await page.waitForTimeout(150);
let copied = '';
try { copied = await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { copied = await page.evaluate(() => window.__proto.lastCopy()); }
check(0, '-', '«Copiază notițele» pune tot textul în clipboard (8 scenarii, A și D)', /Notiță de test/.test(copied) && /== 8\. Semnul unic ==/.test(copied) && (copied.match(/^\[D\]/gm) || []).length === 8, copied.slice(0, 300));
await page.fill('#note', '');
// tema întunecată
const dark = await browser.newContext({ viewport: { width: 1280, height: 780 }, colorScheme: 'dark' });
const dp = await dark.newPage(); dp.on('pageerror', e => consoleErrors.push('pageerror (dark): ' + e.message)); dp.on('console', m => { if (m.type() === 'error') consoleErrors.push('dark: ' + m.text()); });
await dp.goto(URL);
const bgDark = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check(0, '-', 'tema întunecată schimbă fundalul (body are fundal explicit)', bgDark !== bgLight && bgDark === 'rgb(21, 20, 16)', { bgDark, bgLight });
await dp.click('#vD'); await dp.click('[data-scen="7"]'); await dp.click('[data-act="face-spate"]');
await dp.screenshot({ path: path.join(SHOTS, 'intunecat-s7-D.png') });
await dark.close();
// lățime de telefon
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: false });
const pp = await phone.newPage(); pp.on('pageerror', e => consoleErrors.push('pageerror (telefon): ' + e.message));
await pp.goto(URL);
const ph = await pp.evaluate(() => { const sw = document.documentElement.scrollWidth; const vA = document.getElementById('vA').getBoundingClientRect(); const vD = document.getElementById('vD').getBoundingClientRect(); const cv = document.getElementById('cv').getBoundingClientRect(); return { sw, iw: window.innerWidth, vA: [vA.left, vA.right, vA.top], vD: [vD.left, vD.right], cvW: cv.width, cvH: cv.height }; });
check(0, '-', 'telefon (390 px): fără derulare orizontală, comutatorul A/D vizibil, pânza are loc', ph.sw <= ph.iw && ph.vA[0] >= 0 && ph.vD[1] <= ph.iw && ph.cvW > 300 && ph.cvH > 250, ph);
await pp.evaluate(() => window.scrollTo(0, 0));
await pp.screenshot({ path: path.join(SHOTS, 'telefon.png') });
await pp.evaluate(() => window.scrollBy(0, 2000));
await pp.waitForTimeout(100);
const ph2 = await pp.evaluate(() => { const r = document.getElementById('vA').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
check(0, '-', 'telefon: comutatorul A/D rămâne vizibil și după derulare (antet lipit)', ph2.top >= 0 && ph2.bottom < 200, ph2);
await phone.close();
check(0, '-', 'fără erori sau avertismente în consolă', consoleErrors.length === 0, consoleErrors);

await browser.close(); srv.close();
const ok = results.filter(r => r.ok).length;
const out = { data: new Date().toISOString(), browser: 'msedge (headless) ' + BVER, durata_s: +((Date.now() - T0) / 1000).toFixed(1), verificari: results.length, trecute: ok, picate: results.filter(r => !r.ok), metrici: metrics };
fs.writeFileSync(process.env.RESULTS || path.join(HERE, 'rezultate.json'), JSON.stringify({ ...out, toate: results }, null, 2));
console.log('\nScenariu | Var | gesturi | concepte | noduri stocate | plasări | concepte numite');
for (let n = 1; n <= 8; n++) for (const v of ['A', 'D']) { const m = metrics[n + v]; if (m) console.log(`${n} | ${v} | ${m.gesturi} | ${m.concepte} | ${m.noduri} | ${m.plasari} | ${m.lista.join(', ')}`); }
console.log(`\nVerificări: ${ok}/${results.length} trecute, în ${out.durata_s} s.`);
for (const r of out.picate) console.log('PICAT', r.s, r.v, r.check, String(JSON.stringify(r.got)).slice(0, 400));
process.exit(out.picate.length ? 1 : 0);
