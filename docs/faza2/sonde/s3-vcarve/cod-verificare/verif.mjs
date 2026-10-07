// v2-vcarve: ruleaza cazurile adversariale (a, b, c, e, f, g) + corpusul sondei la h = 0,05 FIX, cu variantele cerute.
// node verif.mjs [--grp=a,b] [--names=prefix,prefix] [--variants=probe,circ,nolegal] [--h=0.05] [--out=rez.json] [--corpus=1]
import { writeFileSync } from 'node:fs';
import { generate, evaluate, budget, cotOf, fmt } from './harness.mjs';
import { rect, poly, circle, textLoops, cSlotRound, cSlotSquare, splitCircle, annulusSector, stadium, curvedSlot, font } from './cazuri.mjs';
import { corpus } from './corpus.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const H = +arg('h', 0.05); const variants = arg('variants', 'probe').split(','); const grpSel = arg('grp', ''); const nameSel = arg('names', '');
const FLAT = { R: 1.5875, step: 0.4 };
const C30 = cotOf(60);

export function cases() {
  const C = [];
  // ---------- (a) contur care aproape se atinge pe el insusi ----------
  for (const w of [0.01, 0.001]) {
    C.push({ grp: 'a', name: `C_rotund_fanta${w}`, loops: cSlotRound(12, 12, 10, 6, w), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01,
      paper: [{ p: [4, 12], z: -2 * C30, ce: 'axa (r=8): 2*cot30' }, { p: [20, 12], z: 0, ce: 'centrul fantei: 0' }, { p: [20, 12 + w / 2 + 0.3], z: -0.3 * C30, ce: 'la 0,3 de peretele fantei' }],
      windows: [{ bbox: [15.8, 11.8, 22.2, 12.2], g: 0.001 }] });
  }
  C.push({ grp: 'a', name: 'C_patrat_fanta0.01', loops: cSlotSquare(0.01), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01,
    paper: [{ p: [2, 10], z: -2 * C30, ce: 'axa benzii: 2*cot30' }, { p: [18, 10], z: 0, ce: 'centrul fantei: 0' }, { p: [18, 10.305], z: -0.3 * C30, ce: 'la 0,3 de peretele fantei' }],
    windows: [{ bbox: [15.8, 9.8, 20.2, 10.2], g: 0.001 }] });
  C.push({ grp: 'a', name: 'C_rotund_fanta0.01_90grd_fundplat', loops: cSlotRound(12, 12, 10, 6, 0.01), fill: 'nonzero', theta: 90, D: 1.5, dpp: 1, flat: FLAT, g: 0.01,
    paper: [{ p: [4, 12], z: -1.5, ce: 'fund plat D=1,5' }, { p: [20, 12], z: 0, ce: 'centrul fantei: 0' }],
    windows: [{ bbox: [15.8, 11.8, 22.2, 12.2], g: 0.001 }] });
  // ---------- (b) doua forme cu o muchie EXACT comuna, in aceeasi operatie ----------
  C.push({ grp: 'b', name: 'doua_drept_muchie_comuna', loops: [rect(0, 0, 6, 6), rect(6, 0, 8, 6)], fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01,
    paper: [{ p: [6, 3], z: -3 * C30, ce: 'pe muchia comuna (unite): 3*cot30' }, { p: [3, 3], z: -3 * C30, ce: 'creasta' }] });
  { const S = (t) => { const u = 1 - t, A = [5, 1], P1 = [8, 3.5], P2 = [2, 6.5], B = [5, 9]; return [u * u * u * A[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * B[0], u * u * u * A[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * B[1]]; };
    const q = S(0.25), dq = 4 - Math.hypot(q[0] - 5, q[1] - 5);
    for (const mode of ['exact', 'polyline']) C.push({ grp: 'b', name: `cerc_taiat_S_${mode}`, loops: splitCircle(5, 5, 4, mode), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.005,
      paper: [{ p: [5, 5], z: -4 * C30, ce: 'centru (pe muchia S): 4*cot30' }, { p: q, z: -dq * C30, ce: 'pe S la t=0,25' }] }); }
  // ---------- (c) trasaturi foarte subtiri ----------
  for (const w of [0.02, 0.03, 0.05, 0.08, 0.1, 0.2]) for (const L of [3.0137, 3]) {
    C.push({ grp: 'c', name: `linie_w${w}_L${L}`, loops: [rect(0, 0, L, w)], fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: Math.max(0.0005, w / 40), margin: 0.05,
      paper: [{ p: [L / 2, w / 2], z: -w / 2 * C30, ce: 'mediana: w/2*cot30' }] });
  }
  for (const w of [0.05, 0.2]) C.push({ grp: 'c', name: `arc_subtire_w${w}`, loops: annulusSector(0, 0, 3, 3 + w, 0, 180), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: Math.max(0.001, w / 40), margin: 0.05,
    paper: [{ p: [0, 3 + w / 2], z: -w / 2 * C30, ce: 'mediana: w/2*cot30' }] });
  { // litera cu trasatura de 0,2 mm: Roboto v2, „l” are latimea de 0,2 mm
    const F = font('robotoV2'); const bb = F.charToGlyph('l').getBoundingBox(); const capU = F.tables.os2.sCapHeight; const cap = 0.2 * capU / (bb.x2 - bb.x1);
    C.push({ grp: 'c', name: `text_tulpina0.2_cap${cap.toFixed(2)}`, loops: textLoops('robotoV2', 'Mill&8', cap, 0, 0), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.002, margin: 0.05, paper: [] }); }
  // ---------- (e) forme doar din arce (axa are bucati circulare) ----------
  C.push({ grp: 'e', name: 'sector_inel_20_26', loops: annulusSector(0, 0, 20, 26, 20, 160), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.02,
    paper: [{ p: [0, 23], z: -3 * C30, ce: 'axa R=23: 3*cot30' }] });
  C.push({ grp: 'e', name: 'stadion_30x6', loops: stadium(0, 0, 30, 6), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01,
    paper: [{ p: [15, 0], z: -3 * C30, ce: 'mijloc: 3*cot30' }, { p: [0, 0], z: -3 * C30, ce: 'centrul capului' }] });
  C.push({ grp: 'e', name: 'fanta_curba_R20_w6', loops: curvedSlot(0, 0, 20, 6, 30, 150), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.02,
    paper: [{ p: [0, 20], z: -3 * C30, ce: 'axa R=20: 3*cot30' }, { p: [20 * Math.cos(Math.PI / 6), 20 * Math.sin(Math.PI / 6)], z: -3 * C30, ce: 'centrul capului' }] });
  C.push({ grp: 'e', name: 'sector_inel_fund_plat_D3', loops: annulusSector(0, 0, 20, 26, 20, 160), fill: 'nonzero', theta: 60, D: 3, dpp: 1, flat: FLAT, g: 0.02,
    paper: [{ p: [0, 23], z: -3, ce: 'fund plat' }, { p: [0, 21], z: -1 * C30, ce: 'perete d=1' }] });
  // ---------- (f) font decorativ / script din Windows (contururi suprapuse, curbe stranse) ----------
  C.push({ grp: 'f', name: 'segoe_script_Lemn', loops: textLoops('segoeScript', 'Lemn & Atelier', 12, 0, 0), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [] });
  C.push({ grp: 'f', name: 'vivaldi_Andrei', loops: textLoops('vivaldi', 'Andrei Gq', 15, 0, 0), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [] });
  C.push({ grp: 'f', name: 'kunstler_Manole', loops: textLoops('kunstler', 'Manole', 15, 0, 0), fill: 'nonzero', theta: 60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [] });
  // ---------- (g) unghiuri de freza + fund plat cu limita chiar peste / sub adancimea maxima ----------
  for (const th of [30, 60, 90, 120]) C.push({ grp: 'g', name: `litere_R&8_${th}grd`, loops: textLoops('robotoV2', 'R&8', 20, 0, 0), fill: 'nonzero', theta: th, D: 50, dpp: 1, flat: null, g: 0.02, paper: [] });
  for (const th of [30, 60, 90, 120]) { const cot = cotOf(th), mx = 3 * cot;
    for (const [lab, D] of [['peste', mx * 1.002], ['sub0.5um', mx - 0.0005], ['sub0.01', mx - 0.01], ['sub0.3', mx - 0.3]]) {
      C.push({ grp: 'g', name: `drept12x6_${th}grd_D_${lab}`, loops: [rect(0, 0, 12, 6)], fill: 'nonzero', theta: th, D, dpp: 1, flat: FLAT, g: 0.005,
        paper: [{ p: [6, 3], z: -Math.min(D, mx), ce: 'creasta / fund: -min(D, 3cot)' }, { p: [3, 3], z: -Math.min(D, mx), ce: 'creasta la x=3' }] });
    } }
  { const mx = 2.5 * C30; for (const [lab, D] of [['sub0.01', mx - 0.01], ['sub0.3', mx - 0.3]]) C.push({ grp: 'g', name: `cerc2.5_60grd_D_${lab}`, loops: [circle(5, 5, 2.5)], fill: 'nonzero', theta: 60, D, dpp: 1, flat: FLAT, g: 0.005,
    paper: [{ p: [5, 5], z: -D, ce: 'centru: -D' }] }); }
  return C;
}

if (process.argv[1] && process.argv[1].endsWith('verif.mjs')) {
  let list = cases();
  if (arg('corpus', '0') === '1') list = corpus().map((S) => ({ ...S, grp: 'corpus' }));
  if (grpSel) list = list.filter((S) => grpSel.split(',').includes(S.grp));
  if (nameSel) list = list.filter((S) => nameSel.split(',').some((n) => S.name.startsWith(n)));
  const rows = [];
  for (const S of list) {
    const B = budget(S.theta, !!S.flat);
    let ev0 = null;
    for (const v of variants) {
      let r;
      try {
        const G = generate(S, { h: H, variant: v });
        const E = evaluate(S, G.gc.text, { g: +arg('g', 0) || S.g * +arg('gscale', 1), oracle: ev0?.oracle, ideal: ev0?.ideal });
        if (!ev0) ev0 = E;
        const W = (S.windows || []).map((w) => { const e = evaluate(S, G.gc.text, { bbox: w.bbox, g: w.g, m: 0, oracle: E.oracle }); return { bbox: w.bbox, g: w.g, maxUnder: e.maxUnder, maxOverIn: e.maxOverIn, maxCutOut: e.maxCutOut, atOut: e.atOut, atOver: e.atOver }; });
        const under = Math.max(E.maxUnder, ...W.map((w) => w.maxUnder)), over = Math.max(E.maxOver, ...W.map((w) => Math.max(w.maxOverIn, w.maxCutOut)));
        r = { grp: S.grp, name: S.name, variant: v, h: H, theta: S.theta, D: S.D, flat: !!S.flat, samples: G.graph.stats.samples, flips: G.graph.stats.flips,
          ms: Object.fromEntries(Object.entries(G.ms).map(([k, x]) => [k, +x.toFixed(1)])), lines: G.gc.stats.totalLines, arcs: G.gc.stats.arcs,
          under: +under.toFixed(4), overIn: +Math.max(E.maxOverIn, ...W.map((w) => w.maxOverIn)).toFixed(4), cutOut: +Math.max(E.maxCutOut, ...W.map((w) => w.maxCutOut)).toFixed(4),
          rms: +E.rms.toFixed(5), atUnder: E.atUnder, atOver: E.atOver, atOut: E.atOut, windows: W, rapidsInMaterial: E.rapidsInMaterial, paper: E.paper, g: E.g, cells: E.cells,
          budgetUnder: +B.under.toFixed(4), budgetOver: +B.over.toFixed(4), okUnder: under <= B.under + 1e-9, okOver: over <= B.over + 1e-9 };
      } catch (e) { r = { grp: S.grp, name: S.name, variant: v, error: String(e && e.stack || e).slice(0, 300) }; }
      rows.push(r);
      if (r.error) { console.log(`${S.name.padEnd(34)} ${v.padEnd(8)} EROARE ${r.error}`); continue; }
      console.log(`${S.name.padEnd(34)} ${v.padEnd(8)} esant ${String(r.samples).padStart(6)} | sub ${fmt(r.under)} (buget ${fmt(r.budgetUnder)})${r.okUnder ? '' : ' !!'} | peste ${fmt(r.overIn)} / afara ${fmt(r.cutOut)} (buget ${fmt(r.budgetOver)})${r.okOver ? '' : ' !!'} | RMS ${fmt(r.rms, 5)} | linii ${r.lines} | G0 in mat ${r.rapidsInMaterial} | ${r.ms.total} ms`);
      if (r.paper.length) console.log('      hartie: ' + r.paper.map((p) => `${p.ce}: ${p.hartie} vs ${p.sim}`).join(' | '));
      if (!r.okUnder || !r.okOver) console.log(`      unde: sub ${JSON.stringify(r.atUnder)} peste ${JSON.stringify(r.atOver)} afara ${JSON.stringify(r.atOut)} ${r.windows.length ? 'ferestre ' + JSON.stringify(r.windows.map((w) => [fmt(w.maxUnder), fmt(w.maxOverIn), fmt(w.maxCutOut), w.atOut])) : ''}`);
    }
  }
  const out = arg('out', ''); if (out) writeFileSync(out, JSON.stringify(rows, null, 1));
}
