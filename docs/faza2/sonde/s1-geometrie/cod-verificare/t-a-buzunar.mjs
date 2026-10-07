// (a) BUZUNAR: offseturi repetate spre interior pe glife din 3 fonturi Windows, la 30 si 200 mm.
// Pipeline testat (recomandarea s1): patratice -> biarce proprii (tol) -> Shape cavalier -> parallelOffset repetat.
// Oracol independent (oracol-v1): distanta exacta la frontiera ORIGINALA (patratice), nivelul adevarat {s = D}
// gasit pe grila + regula falsi, raza maxima inscrisa prin esantionare densa + cautare locala.
import fs from 'node:fs';
import { glyph, shapeFromRegion, shapeOut, fmt } from './comun.mjs';
import { distIndex, dist, flat, insideEO, rowCrossings, samplesOf, dSeg, maxGap } from './oracol-v1.mjs';

const TOOL_R = +(process.env.RAZA_SCULA || 3.175), STEP = +(process.env.PAS || 2.54);
const args = process.argv.slice(2);
const rapid = args.includes('--rapid');
const TOL = +(process.env.TOL_BIARC || 0.002);
const FONTS = [['Arial', 'C:/Windows/Fonts/arial.ttf'], ['Times New Roman', 'C:/Windows/Fonts/times.ttf'], ['Segoe Script', 'C:/Windows/Fonts/segoesc.ttf'], ['Gabriola', 'C:/Windows/Fonts/Gabriola.ttf']];
const CHARS = rapid ? ['B', '&'] : ['B', 'g', '&', 'S'];
const SIZES = (process.env.DIMENSIUNI || '30,200').split(',').map(Number);
const SAB = process.env.SABOTAJ || ''; // control negativ: 'd' = offset cu D*1.01 ; 'gol' = pierde ultimul inel

function truthField(G, H) {
  const ix = distIndex(G), polys = flat(G, H / 4000);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const Pl of polys) for (const q of Pl) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const g = H / (rapid ? 220 : 320);
  const nx = Math.ceil((x1 - x0) / g) + 3, ny = Math.ceil((y1 - y0) / g) + 3;
  const X = (i) => x0 - g + i * g, Y = (j) => y0 - g + j * g;
  const s = new Float64Array(nx * ny).fill(-1);
  for (let j = 0; j < ny; j++) {
    const xs = rowCrossings(polys, Y(j));
    for (let i = 0; i < nx; i++) {
      const x = X(i); let c = 0; for (const v of xs) if (v > x) c++;
      if (c & 1) s[j * nx + i] = dist(ix, x, Y(j));
    }
  }
  // raza maxima inscrisa: maximul pe grila + cautare locala (pas care se injumatateste) din cele mai bune 12 noduri
  const idx = Array.from(s.keys()).sort((a, b) => s[b] - s[a]).slice(0, 12);
  let Rmax = 0, at = null;
  for (const k of idx) {
    let px = X(k % nx), py = Y(Math.floor(k / nx)), v = s[k], h = g;
    while (h > 1e-7) {
      let moved = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]]) {
        const qx = px + dx * h, qy = py + dy * h; if (!insideEO(polys, qx, qy)) continue; const w = dist(ix, qx, qy); if (w > v) { v = w; px = qx; py = qy; moved = true; }
      }
      if (!moved) h /= 2;
    }
    if (v > Rmax) { Rmax = v; at = [px, py]; }
  }
  return { ix, polys, s, nx, ny, X, Y, g, Rmax, at };
}
// puncte pe nivelul adevarat {dist = D} (in interior): treceri pe muchiile grilei, regula falsi (Illinois)
function truthLevel(T, D) {
  const pts = [];
  const solve = (ax, ay, bx, by, fa, fb) => {
    let lo = 0, hi = 1, flo = fa, fhi = fb, side = 0;
    for (let it = 0; it < 60; it++) {
      const t = (lo * fhi - hi * flo) / (fhi - flo);
      const f = dist(T.ix, ax + (bx - ax) * t, ay + (by - ay) * t) - D;
      if (Math.abs(f) < 1e-12 || hi - lo < 1e-14) { lo = hi = t; break; }
      if ((f < 0) === (flo < 0)) { lo = t; flo = f; if (side === -1) fhi /= 2; side = -1; } else { hi = t; fhi = f; if (side === 1) flo /= 2; side = 1; }
    }
    const t = (lo + hi) / 2; return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };
  for (let j = 0; j < T.ny; j++) for (let i = 0; i < T.nx; i++) {
    const a = T.s[j * T.nx + i]; if (a < 0) continue;
    if (i + 1 < T.nx) { const b = T.s[j * T.nx + i + 1]; if (b >= 0 && (a - D < 0) !== (b - D < 0)) pts.push(solve(T.X(i), T.Y(j), T.X(i + 1), T.Y(j), a - D, b - D)); }
    if (j + 1 < T.ny) { const b = T.s[(j + 1) * T.nx + i]; if (b >= 0 && (a - D < 0) !== (b - D < 0)) pts.push(solve(T.X(i), T.Y(j), T.X(i), T.Y(j + 1), a - D, b - D)); }
  }
  return pts;
}
// componente conexe pe grila ale {s > D} (4-vecini): numarul ASTEPTAT de bucle exterioare (informativ)
function gridComponents(T, D) {
  const seen = new Uint8Array(T.nx * T.ny); let n = 0;
  for (let k = 0; k < T.s.length; k++) {
    if (seen[k] || !(T.s[k] > D)) continue; n++;
    const st = [k]; seen[k] = 1;
    while (st.length) { const q = st.pop(); const i = q % T.nx, j = Math.floor(q / T.nx); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= T.nx || b >= T.ny) continue; const r = b * T.nx + a; if (!seen[r] && T.s[r] > D) { seen[r] = 1; st.push(r); } } }
  }
  return n;
}
function checkLevel(T, out, D, hS) {
  const loops = [...out.ccw, ...out.cw];
  const r = { D, nCcw: out.ccw.length, nCw: out.cw.length, seg: loops.reduce((a, c) => a + c.segs.length, 0), arce: loops.reduce((a, c) => a + c.segs.filter((s) => s.k === 'A').length, 0) };
  // 1) iesire -> adevar: fiecare punct la distanta D de frontiera originala, si in interior
  let e = 0, afara = 0;
  for (const p of samplesOf(loops, hS)) { const d = dist(T.ix, p[0], p[1]); e = Math.max(e, Math.abs(d - D)); if (!insideEO(T.polys, p[0], p[1])) afara++; }
  r.iesireAdevar = loops.length ? e : 0; r.puncteAfara = afara;
  r.gol = maxGap(loops);
  // 2) adevar -> iesire: fiecare punct al nivelului adevarat trebuie sa aiba un punct al iesirii aproape
  const tp = truthLevel(T, D); r.puncteAdevar = tp.length;
  let h = 0; const segs = loops.flatMap((c) => c.segs);
  for (const q of tp) { let b = Infinity; for (const s of segs) { const v = dSeg(s, q[0], q[1]); if (v < b) b = v; if (b < 1e-9) break; } h = Math.max(h, b); }
  r.adevarIesire = tp.length ? h : 0;
  // 3) orientare: plinul e la stanga fiecarei bucle (CCW exterior, CW gaura); delta = 0.02 mm
  let rau = 0, neconcl = 0, tot = 0; const del = 0.02;
  for (const c of loops) for (const s of c.segs) for (const t of [0.25, 0.75]) {
    let p, tx, ty;
    if (s.k === 'L') { p = [s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t]; tx = s.x1 - s.x0; ty = s.y1 - s.y0; }
    else { const a = s.a0 + s.da * t; p = [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)]; tx = -Math.sin(a) * Math.sign(s.da); ty = Math.cos(a) * Math.sign(s.da); }
    const l = Math.hypot(tx, ty); if (!(l > 0)) continue; const nx = -ty / l, ny = tx / l;
    const L = dist(T.ix, p[0] + nx * del, p[1] + ny * del), R = dist(T.ix, p[0] - nx * del, p[1] - ny * del);
    tot++; if (L < D && R > D) rau++; else if (!(L > D && R < D)) neconcl++;
  }
  // inversata = plinul e clar de partea gresita; neconcludent = felie mai subtire decat sonda de 0,02 mm
  r.orientareInversata = rau; r.orientareNeconcludenta = neconcl; r.orientareTotal = tot;
  r.componenteGrila = gridComponents(T, D);
  return r;
}

const rezultate = [];
const t0 = performance.now();
const DOAR = (args.find((a) => a.startsWith('--doar=')) || '').slice(7); // ex. --doar=Arial:B:200
for (const [fname, file] of FONTS) for (const ch of CHARS) for (const H of SIZES) {
  if (DOAR && DOAR !== `${fname}:${ch}:${H}`) continue;
  const G = glyph(file, ch, H);
  const T = truthField(G, H);
  const hS = Math.min(0.05, H / 1500);
  // nivelele asteptate: D_k = 3.175 + 2.54 k < Rmax
  const nAsteptat = T.Rmax > TOOL_R ? Math.floor((T.Rmax - TOOL_R) / STEP) + 1 : 0;
  const ambiguu = [...Array(nAsteptat + 2).keys()].some((k) => Math.abs(TOOL_R + STEP * k - T.Rmax) < 0.01);
  const rec = { font: fname, ch, H, Rmax: T.Rmax, nAsteptat, ambiguu, niveluri: [], timpiMs: [] };
  let sh0;
  const tA = performance.now();
  try { sh0 = shapeFromRegion(G, TOL); } catch (e) { rec.eroare = 'intrare: ' + e.message; rezultate.push(rec); continue; }
  rec.msIntrare = performance.now() - tA;
  // (i) direct: fiecare inel din forma ORIGINALA cu D_k ; (ii) iterativ: inelul k+1 din inelul k cu pasul 2.54
  let prevIter = null, k = 0, golDirect = false, golIter = false;
  while (k < 200) {
    const D = TOOL_R + STEP * k;
    const Dsab = SAB === 'd' ? D * 1.01 : D;
    const t1 = performance.now();
    const dirSh = golDirect ? null : sh0.parallelOffset(Dsab);
    const t2 = performance.now();
    const itSh = golIter ? null : (k === 0 ? sh0.parallelOffset(Dsab) : prevIter.parallelOffset(SAB === 'd' ? STEP * 1.01 : STEP));
    const t3 = performance.now();
    rec.timpiMs.push([t2 - t1, t3 - t2]);
    const dir = dirSh ? shapeOut(dirSh) : { ccw: [], cw: [] }, it = itSh ? shapeOut(itSh) : { ccw: [], cw: [] };
    if (SAB === 'gol' && k === nAsteptat - 1) { dir.ccw = []; dir.cw = []; }
    const eDir = !dir.ccw.length && !dir.cw.length, eIt = !it.ccw.length && !it.cw.length;
    if (eDir && eIt) { rec.nDirect = rec.nDirect ?? k; rec.nIterativ = rec.nIterativ ?? k; break; }
    if (eDir && rec.nDirect === undefined) { rec.nDirect = k; golDirect = true; }
    if (eIt && rec.nIterativ === undefined) { rec.nIterativ = k; golIter = true; }
    rec.niveluri.push({ k, D, direct: eDir ? null : checkLevel(T, dir, D, hS), iterativ: eIt ? null : checkLevel(T, it, D, hS) });
    prevIter = itSh; k++;
  }
  // rezumat pe glifa
  const all = rec.niveluri.flatMap((n) => [n.direct, n.iterativ].filter(Boolean));
  rec.maxIesireAdevar = Math.max(0, ...all.map((r) => r.iesireAdevar));
  rec.maxAdevarIesire = Math.max(0, ...all.map((r) => r.adevarIesire));
  rec.puncteAfara = all.reduce((a, r) => a + r.puncteAfara, 0);
  rec.orientareInversata = all.reduce((a, r) => a + r.orientareInversata, 0);
  rec.orientareNeconcludenta = all.reduce((a, r) => a + r.orientareNeconcludenta, 0);
  rec.golMax = Math.max(0, ...all.map((r) => r.gol));
  rec.componenteDiferite = rec.niveluri.filter((n) => n.direct && n.direct.nCcw !== n.direct.componenteGrila).map((n) => `k=${n.k}: cavalier ${n.direct.nCcw}, grila ${n.direct.componenteGrila}`);
  rec.numarOk = rec.nDirect === nAsteptat && rec.nIterativ === nAsteptat;
  rezultate.push(rec);
  console.log(`${fname.padEnd(16)} ${ch} H=${String(H).padStart(3)} Rmax=${fmt(T.Rmax, 4)} inele asteptate=${nAsteptat}${ambiguu ? ' (AMBIGUU)' : ''} direct=${rec.nDirect} iterativ=${rec.nIterativ} | iesire->adevar max ${fmt(rec.maxIesireAdevar)} | adevar->iesire max ${fmt(rec.maxAdevarIesire)} | afara ${rec.puncteAfara} | orientare inversata ${rec.orientareInversata} (neconcludent ${rec.orientareNeconcludenta}) | gol ${fmt(rec.golMax)} | comp. diferite: ${rec.componenteDiferite.length ? rec.componenteDiferite.join('; ') : '-'}`);
}
const sec = (performance.now() - t0) / 1000;
const rez = { tolBiarc: TOL, sabotaj: SAB || null, secunde: sec, rezultate };
fs.writeFileSync(`rez-a-buzunar${process.env.RAZA_SCULA ? '-r' + process.env.RAZA_SCULA : ''}${SAB ? '-sabotaj-' + SAB : ''}${rapid ? '-rapid' : ''}.json`, JSON.stringify(rez, null, 1));
const bad = rezultate.filter((r) => !r.numarOk || r.maxIesireAdevar > TOL * 1.5 || r.puncteAfara || r.orientareInversata);
console.log(`\n${rezultate.length} glife, ${sec.toFixed(1)} s. Abateri peste 1.5 x tol / numar gresit / afara / orientare: ${bad.length}`);
