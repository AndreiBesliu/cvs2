/**
 * Desenele ferestrei exportului spun ce face programul (ADR 0290, „Probele”: „Desenele spun adevărul”; feliile 28.8↑b–c):
 * trecerile din desenul adâncimii sunt cele ale lucrării (`adancimiTreceri`), urechile desenate stau unde le pune lucrarea, la
 * distanțe egale (`geometrieUrechi`) și după reguli (`urechiPeLaturi`, pe un dreptunghi cu laturile desenului); în buzunar,
 * trecerile laterale sunt inelele lucrării (`ineleBuzunar`), iar rampa, zigzagul și elicea coboară cât spune desenul
 * (`intrareRampa`, `intrareZigzag`, `intrareElice`, măsurate pe mișcări); ciocănirea găuririi e pas cu pas a lucrării
 * (`traseuGaurire`). Din 28.8↑d: peretele V-carve-ului de la adâncimea maximă stă unde îl pune lucrarea (`traseuVcarve`), iar
 * valorile incrustației în V sunt cele pe hârtie ale panoului și ale dopului (`valoriIncrustatie`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adancimiTreceri } from '../../src/cam/profil.ts';
import { geometrieUrechi } from '../../src/cam/urechi.ts';
import { urechiPeLaturi } from '../../src/cam/urechiLaturi.ts';
import { ineleBuzunar, type InelBuzunar } from '../../src/cam/buzunar.ts';
import { intrareElice, intrareRampa, intrareZigzag, rampeZigzag } from '../../src/cam/coborare.ts';
import { traseuGaurire } from '../../src/cam/gaurire.ts';
import { traseuVcarve } from '../../src/cam/vcarve.ts';
import type { Operatie } from '../../src/model/document.ts';
import { valoriBanda, valoriIncrustatie } from '../../src/model/incrustatie.ts';
import { conturDreptunghi } from '../../src/geom/contur.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import {
  bandaDesen, centreUrechiDesen, ciocanire, coborareDesen, incrustatieDesen, treceriEgale, treceriLaterale, vcarveDesen,
} from '../../src/ui/exportDeseneCalcul.ts';

const aproape = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

test('trecerile din desen sunt ale lucrării: același număr, fiecare de A / n, ultima la A', () => {
  const cazuri: Array<readonly [number, number]> = [[10, 4], [18, 6], [18, 6.0000001], [6, 3], [3, 6], [1, 1], [0.3, 0.1], [12.5, 2.5], [25, 3.175],
    [19.05, 1.5875], [5, 0.001]];
  for (const [a, p] of cazuri) {
    const lucrare = adancimiTreceri(a, p), desen = treceriEgale(a, p);
    if (typeof lucrare === 'string') { assert.equal(desen, null, `${a} / ${p}: lucrarea refuză (${lucrare})`); continue; }
    assert.ok(desen, `${a} / ${p}`);
    assert.equal(desen.n, lucrare.length, `${a} / ${p}: numărul trecerilor`);
    lucrare.forEach((z, i) => assert.ok(aproape(z, (i + 1) * desen.d), `${a} / ${p}: trecerea ${i + 1} la ${z}, desenul ${(i + 1) * desen.d}`));
  }
  // Pe hârtie: 10 mm cu pasul 4 = 3 treceri de 3,33 mm (nu două de 5, mai adânci decât pasul).
  assert.deepEqual(treceriEgale(10, 4), { n: 3, d: 10 / 3 });
  for (const [a, p] of [[0, 3], [5, 0], [-1, 1], [null, 3], [5, null], [Number.NaN, 1], [Number.POSITIVE_INFINITY, 1]] as const) assert.equal(treceriEgale(a, p), null);
});

test('urechile desenate stau unde le pune lucrarea, la distanțe egale și pe laturi', () => {
  // Laturile desenului (lată și înaltă) și ale unui pătrat, unde toate laturile sunt „cele mai lungi”.
  for (const [w, h] of [[116, 78], [80, 30], [30, 80], [50, 50]] as const) {
    const laturi = [w, h, w, h], P = 2 * (w + h);
    for (let n = 1; n <= 7; n++) {
      const g = geometrieUrechi(P, { numar: n, latime: 0.5, varf: 0 });
      assert.ok(typeof g !== 'string');
      assert.deepEqual(centreUrechiDesen('egale', n, laturi).map((x) => +x.toFixed(9)), g.centre.map((x) => +x.toFixed(9)), `egale ${w}×${h}, ${n}`);
      for (const regula of ['lungi', 'scurte', 'mijloc'] as const) {
        const l = urechiPeLaturi(conturDreptunghi(0, 0, w, h), regula, 0.5, n);
        assert.ok(l, `${regula} ${w}×${h}`);
        const desen = centreUrechiDesen(regula, n, laturi).map((x) => +x.toFixed(9)).sort((a, b) => a - b);
        assert.deepEqual(desen, l.centre.map((x) => +x.toFixed(9)), `${regula} ${w}×${h}, ${n}`);
      }
    }
  }
  // Pe hârtie (ca `urechi.laturi.test.ts`): 80 × 30, două pe laturile lungi, la mijlocul lor; patru la mijloc, oricare număr.
  assert.deepEqual(centreUrechiDesen('lungi', 2, [80, 30, 80, 30]), [40, 150]);
  assert.deepEqual(centreUrechiDesen('mijloc', 7, [80, 30, 80, 30]), [40, 95, 150, 205]);
  assert.deepEqual(centreUrechiDesen('egale', 0, [80, 30, 80, 30]), []);
});

test('pasul lateral desenat e al inelelor lucrării: R, R + s, R + 2s de perete; două treceri vecine se suprapun D − s', () => {
  for (const [D, s] of [[6, 2.4], [6, 3], [12, 4.8], [3.175, 1.27], [6, 0.5]] as const) {
    const desen = treceriLaterale(D, s);
    assert.ok(desen, `Ø${D}, s ${s}`);
    const r = ineleBuzunar(conturDreptunghi(0, 0, 100, 60), D / 2, s);
    assert.ok(r.ok, `Ø${D}, s ${s}`);
    // Primele trei niveluri ale arborelui (dreptunghiul are câte un inel pe nivel, până la mijloc).
    const d: number[] = [];
    for (let x: InelBuzunar | undefined = r.radacini[0]; x && d.length < 3; x = x.copii[0]) d.push(x.d);
    assert.equal(d.length, 3);
    d.forEach((x, i) => assert.ok(aproape(x, desen.centre[i] ?? Number.NaN), `Ø${D}, s ${s}: inelul ${i + 1} la ${x}, desenul ${desen.centre[i]}`));
    assert.ok(aproape(desen.suprapunere, D - s));
    assert.ok(aproape(desen.procent, ((D - s) / D) * 100));
  }
  // Pe hârtie: Ø6 cu pasul 2,4 = 3,6 mm de suprapunere, 60 %; peste jumătate din freză (ca fereastra), nimic.
  assert.deepEqual(treceriLaterale(6, 2.4), { centre: [3, 5.4, 7.8], suprapunere: 6 - 2.4, procent: ((6 - 2.4) / 6) * 100 });
  for (const [D, s] of [[6, 3.01], [6, 0], [0, 1], [null, 1], [6, null], [6, Number.NaN]] as const) assert.equal(treceriLaterale(D, s), null);
});

/** Lungimea în plan (XY) a mișcărilor care coboară, de la poziția `de`: liniile drepte și arcele (elicea). */
function coboara(m: readonly Miscare[], de: { x: number; y: number; z: number }): { lungime: number; bucati: number } {
  let { x, y, z } = de, lungime = 0, bucati = 0;
  for (const u of m) {
    if (u.tip !== 'rapida' && u.tip !== 'taiere' && u.tip !== 'arc') continue;
    const X = u.la.X ?? x, Y = u.la.Y ?? y, Z = u.la.Z ?? z;
    let l = Math.hypot(X - x, Y - y);
    if (u.tip === 'arc') {
      const R = Math.hypot(x - u.centru.x, y - u.centru.y);
      let a = Math.atan2(Y - u.centru.y, X - u.centru.x) - Math.atan2(y - u.centru.y, x - u.centru.x);
      if (u.sens === 'orar') a = -a;
      a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      l = R * (a < 1e-12 ? 2 * Math.PI : a);
    }
    if (Z < z - 1e-12 && l > 1e-9) { lungime += l; bucati++; }
    x = X; y = Y; z = Z;
  }
  return { lungime, bucati };
}

test('coborârea desenată e a lucrării: lungimea rampei și a elicei, rampele zigzagului, pe o trecere egală', () => {
  const par = { zSigur: 5, avans: 1000, avansPlonjare: 300 };
  const b = conturDreptunghi(0, 0, 400, 300);
  // Trecerea fiecărui caz e cea egală a lucrării (adâncimea, pasul), nu pasul scris: 10 cu pasul 6 = două treceri de 5.
  for (const [A, pas, u, Lz, R] of [[10, 6, 3, 20, 3], [18, 3, 3, 20, 3], [6, 4, 10, 15, 2], [12, 5, 1, 40, 6], [3, 3, 45, 1, 0.5]] as const) {
    const tr = treceriEgale(A, pas);
    assert.ok(tr);
    const d = tr.d, de = { x: 0, y: 0, z: 5 };
    const rampa = coborareDesen('rampa', d, u, Lz, R), zig = coborareDesen('zigzag', d, u, Lz, R), el = coborareDesen('elice', d, u, Lz, R);
    assert.ok(rampa?.fel === 'rampa' && zig?.fel === 'zigzag' && el?.fel === 'elice');
    const ir = intrareRampa(b, 0, d, u, par);
    assert.ok(typeof ir !== 'string');
    assert.ok(aproape(coboara(ir.miscari, de).lungime, rampa.lungime, 1e-9), `${A}/${pas} ${u}°: rampa ${coboara(ir.miscari, de).lungime}, desenul ${rampa.lungime}`);
    const iz = intrareZigzag(b, 0, d, u, Lz, par);
    assert.ok(typeof iz !== 'string');
    assert.equal(zig.rampe, rampeZigzag(d, Lz, u));
    assert.equal(coboara(iz.miscari, de).bucati, zig.rampe, `${A}/${pas} ${u}°: rampele zigzagului`);
    assert.ok(aproape(coboara(iz.miscari, de).lungime, zig.rampe * Lz, 1e-9));
    const ie = intrareElice({ x: 200, y: 150 }, R, { x: 0, y: 150 }, 0, d, u, true, par);
    assert.ok(typeof ie !== 'string');
    const start = ie.miscari.find((x) => x.tip === 'rapida' && x.la.X !== undefined);
    assert.ok(start && start.tip === 'rapida');
    const e = coboara(ie.miscari, { x: start.la.X ?? 0, y: start.la.Y ?? 0, z: 5 });
    assert.ok(aproape(e.lungime, el.lungime, 1e-9), `${A}/${pas} ${u}°: elicea ${e.lungime}, desenul ${el.lungime}`);
    assert.ok(aproape(el.ture, el.lungime / (2 * Math.PI * R)));
  }
  // Pe hârtie: o trecere de 3 mm la 3° = o rampă de 3 / tan 3° = 57,24 mm; zigzagul de 20 mm, 3 rampe; elicea de R 3, ~3 ture.
  const r3 = coborareDesen('rampa', 3, 3, 20, 3);
  assert.ok(r3?.fel === 'rampa' && Math.abs(r3.lungime - 57.243) < 1e-3);
  assert.deepEqual(coborareDesen('zigzag', 3, 3, 20, 3), { fel: 'zigzag', rampe: 3, lungime: 20 });
  assert.deepEqual(coborareDesen('plonjare', 3, null, null, null), { fel: 'plonjare' });
  for (const x of [coborareDesen('rampa', 3, 0, 20, 3), coborareDesen('rampa', null, 3, 20, 3), coborareDesen('zigzag', 3, 3, 0, 3),
    coborareDesen('elice', 3, 3, 20, 0), coborareDesen('rampa', 3, 90, 20, 3)]) assert.equal(x, null);
});

test('ciocănirea desenată e a lucrării, pas cu pas: coborârile, ridicarea de 1 mm, ieșirea la al N-lea și apropierea', () => {
  for (const [A, pas, N] of [[10, 4, 1], [18, 4, 2], [18, 3, 3], [9, 3, 5], [5, 6, 1], [25, 2.5, 4]] as const) {
    const r = traseuGaurire({ centru: { x: 10, y: 10 }, diametru: 6, diametruScula: 6, adancime: A, pas, retragereCompleta: N,
      trigonometric: true, zSigur: 5, avans: 1000, avansPlonjare: 300 });
    assert.ok(r.ok && r.fel === 'ciocanire');
    // Z-urile lucrării, după rapida la Z-ul sigur și cea deasupra găurii, fără ieșirea de la capăt.
    const z = r.miscari.flatMap((m) => ((m.tip === 'rapida' || m.tip === 'taiere') && m.la.Z !== undefined
      ? [{ z: m.la.Z === 5 ? 'sus' : m.la.Z, taie: m.tip === 'taiere' }] : [])).slice(1, -1);
    const desen = ciocanire(A, pas, N);
    assert.ok(desen, `${A}/${pas}, ${N}`);
    assert.equal(desen.length, z.length, `${A}/${pas}, ${N}: pașii`);
    desen.forEach((x, i) => {
      const l = z[i];
      assert.ok(l && x.taie === l.taie && (x.z === 'sus' ? l.z === 'sus' : typeof l.z === 'number' && aproape(x.z, l.z)), `${A}/${pas}, ${N}: pasul ${i}`);
    });
  }
  // Pe hârtie: 10 cu pasul 4, ieșirea după fiecare al doilea: 3 pași de 3,33; după primul se ridică 1 mm, după al doilea iese.
  const h = ciocanire(10, 4, 2);
  assert.ok(h);
  assert.deepEqual(h.map((x) => (x.z === 'sus' ? 'sus' : +x.z.toFixed(4))), [-3.3333, -2.3333, -6.6667, 'sus', -6.1667, -10]);
  for (const x of [ciocanire(10, 4, 0), ciocanire(10, 4, 1.5), ciocanire(0, 4, 1), ciocanire(10, null, 1), ciocanire(10, 4, null)]) assert.equal(x, null);
});

test('V-carve-ul desenat: peretele de la adâncimea maximă stă la D·tan(θ/2) de contur, ca în lucrare; fundul plat, de la 2·D·tan(θ/2)', () => {
  for (const [D, u] of [[2, 60], [3, 90], [1.5, 30], [4, 120], [2.5, 45]] as const) {
    const desen = vcarveDesen(D, u);
    assert.ok(desen, `D ${D}, ${u}°`);
    const t = Math.tan((u * Math.PI) / 360);
    // Un dreptunghi lat (fundul plat rămâne, fără freza dreaptă): inelul peretelui, la −D, cel mai aproape de latura x = 0.
    const r = traseuVcarve({ contururi: [conturDreptunghi(0, 0, 60, 40)], unghi: u, diametruScula: 2 * D * t * 3 + 6, adancime: D, pas: D,
      avans: 1000, avansPlonjare: 300, zSigur: 5 });
    assert.ok(r.ok, `D ${D}, ${u}°: ${r.ok ? '' : r.motiv}`);
    let z = 5, xMin = Number.POSITIVE_INFINITY;
    for (const m of r.miscari) {
      if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
      z = m.la.Z ?? z;
      if (Math.abs(z + D) < 1e-9 && m.la.X !== undefined) xMin = Math.min(xMin, m.la.X);
    }
    assert.ok(aproape(xMin, desen.perete, 1e-6), `D ${D}, ${u}°: peretele lucrării la ${xMin}, desenul la ${desen.perete}`);
    assert.ok(aproape(desen.prag, 2 * D * t) && aproape(desen.t, t));
  }
  // Pe hârtie (ADR 0170): V60 la 3 mm, peretele la 1,732 de contur, fundul plat de la 3,464 mm lățime.
  const p = vcarveDesen(3, 60);
  assert.ok(p && Math.abs(p.perete - 1.7321) < 1e-4 && Math.abs(p.prag - 3.4641) < 1e-4);
  for (const x of [vcarveDesen(0, 60), vcarveDesen(3, 0), vcarveDesen(3, 180), vcarveDesen(null, 60), vcarveDesen(3, null)]) assert.equal(x, null);
});

test('incrustația în V desenată are valorile pe hârtie ale panoului și ale dopului (S, H, t, fața, contactul, placa)', () => {
  for (const [D, u, g, H] of [[3, 60, 0.5, 2], [4, 90, 1, 1], [2, 30, 0.2, 0.5], [5, 60, 1.5, 3], [3, 120, 0.5, 0]] as const) {
    const op = { adancime: D, scula: { numar: 1, nume: 'V', diametru: 12, forma: { tip: 'v', unghi: u } },
      incrustatie: { fel: 'v', joc: g, fierastrau: H, margine: 5, jurDop: 'fata' } } as unknown as Pick<Operatie, 'adancime' | 'scula' | 'incrustatie'>;
    const v = valoriIncrustatie(op), d = incrustatieDesen(D, u, g, H);
    assert.ok(v && d, `D ${D}, ${u}°, g ${g}, H ${H}`);
    for (const k of ['S', 'H', 't', 'fata', 'contact', 'grosimeMinima'] as const) {
      assert.ok(aproape(d[k], v[k]), `D ${D}, ${u}°, g ${g}, H ${H}: ${k} ${d[k]}, pe hârtie ${v[k]}`);
    }
    assert.ok(aproape(d.perete, D * v.t), 'fundul plat al locașului, de la D·t de contur');
  }
  // Exemplul de lucru din ADR 0170: V60, D = 3, g = 0,5, H = 2: S = 2,5, contactul 1,443, fața 4,5.
  const e = incrustatieDesen(3, 60, 0.5, 2);
  assert.ok(e && e.S === 2.5 && Math.abs(e.contact - 1.4434) < 1e-4 && e.fata === 4.5);
  for (const x of [incrustatieDesen(3, 60, 3, 2), incrustatieDesen(3, 60, 0, 2), incrustatieDesen(3, 60, 0.5, -1), incrustatieDesen(null, 60, 0.5, 2)]) {
    assert.equal(x, null);
  }
});

test('banda dopului desenată are valorile pe hârtie ale panoului și ale dopului (lățimea, tăietura decupării, placa)', () => {
  const sc = (diametru: number) => ({ numar: 2, nume: 'D', diametru });
  type Caz = { D: number; u: number; g: number; H: number; latime?: number; decupare: boolean; placa?: number; pg: number; fund: number; freza?: number };
  const cazuri: Caz[] = [
    { D: 3, u: 60, g: 0.5, H: 2, decupare: true, pg: 1, fund: 3.175 },
    { D: 3, u: 60, g: 0.5, H: 2, latime: 12, decupare: true, placa: 6, pg: 1.5, fund: 3.175, freza: 6 },
    { D: 4, u: 90, g: 1, H: 1, decupare: false, pg: 1, fund: 6 },
    { D: 2, u: 60, g: 0.5, H: 2, decupare: true, pg: 1, fund: 0, freza: 6 },
    { D: 2, u: 30, g: 0.3, H: 0.8, decupare: false, pg: 1, fund: 0 },
    // Fără decupare, freza ei (scrisă) nu lărgește banda.
    { D: 3, u: 60, g: 0.5, H: 2, decupare: false, pg: 1, fund: 3.175, freza: 6 },
  ];
  for (const k of cazuri) {
    const banda = k.latime === undefined && k.placa === undefined && k.freza === undefined && k.pg === 1 ? undefined : {
      ...(k.latime !== undefined ? { latime: k.latime } : {}), decupare: k.decupare, grosimePlaca: k.placa ?? k.D - k.g + k.H + 1,
      ...(k.freza !== undefined ? { freza: sc(k.freza) } : {}), punti: { numar: 4, latime: 4, grosime: k.pg },
    };
    const op = { adancime: k.D, scula: { numar: 1, nume: 'V', diametru: 12, forma: { tip: 'v', unghi: k.u } },
      incrustatie: { fel: 'v', joc: k.g, fierastrau: k.H, margine: 5, jurDop: 'banda', ...(banda ? { banda } : {}) },
      ...(k.fund > 0 ? { fundPlat: { scula: sc(k.fund), pasLateral: 1 } } : {}) } as unknown as Parameters<typeof valoriBanda>[0];
    const v = valoriBanda(op);
    // Fără câmpul benzii, lucrarea ia banda implicită: cu decuparea, freza fundului plat.
    const decupare = banda ? k.decupare : true;
    const d = bandaDesen(k.D, k.u, k.g, k.H, { latime: k.latime ?? null, decupare, placa: k.placa ?? null, puntiGrosime: k.pg, fund: k.fund,
      frezaDecupare: k.freza ?? null });
    assert.ok(v && d, JSON.stringify(k));
    for (const c of ['minima', 'latime', 'e', 'placa', 'placaMinima'] as const) assert.ok(aproape(d[c], v[c]), `${JSON.stringify(k)}: ${c} ${d[c]}, pe hârtie ${v[c]}`);
  }
  // Pe hârtie (ADR 0172): V60, H = 2, fundul Ø3,175: M = 2·2·tan 30° + 3,175 + 1 = 6,484; tăietura la 2·tan 30° + 0,5 = 1,655.
  const h = bandaDesen(3, 60, 0.5, 2, { latime: null, decupare: true, placa: null, puntiGrosime: 1, fund: 3.175, frezaDecupare: null });
  assert.ok(h && Math.abs(h.minima - 6.4844) < 1e-4 && Math.abs(h.e - 1.6547) < 1e-4 && h.placa === 5.5);
  assert.equal(bandaDesen(3, 60, 3, 2, { latime: null, decupare: true, placa: null, puntiGrosime: 1, fund: 3.175, frezaDecupare: null }), null);
});
