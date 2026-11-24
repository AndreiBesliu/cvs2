/**
 * Desenele ferestrei exportului spun ce face programul (ADR 0290, „Probele”: „Desenele spun adevărul”; feliile 28.8↑b–c):
 * trecerile din desenul adâncimii sunt cele ale lucrării (`adancimiTreceri`), urechile desenate stau unde le pune lucrarea, la
 * distanțe egale (`geometrieUrechi`) și după reguli (`urechiPeLaturi`, pe un dreptunghi cu laturile desenului); în buzunar,
 * trecerile laterale sunt inelele lucrării (`ineleBuzunar`), iar rampa, zigzagul și elicea coboară cât spune desenul
 * (`intrareRampa`, `intrareZigzag`, `intrareElice`, măsurate pe mișcări); ciocănirea găuririi e pas cu pas a lucrării
 * (`traseuGaurire`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adancimiTreceri } from '../../src/cam/profil.ts';
import { geometrieUrechi } from '../../src/cam/urechi.ts';
import { urechiPeLaturi } from '../../src/cam/urechiLaturi.ts';
import { ineleBuzunar, type InelBuzunar } from '../../src/cam/buzunar.ts';
import { intrareElice, intrareRampa, intrareZigzag, rampeZigzag } from '../../src/cam/coborare.ts';
import { traseuGaurire } from '../../src/cam/gaurire.ts';
import { conturDreptunghi } from '../../src/geom/contur.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { centreUrechiDesen, ciocanire, coborareDesen, treceriEgale, treceriLaterale } from '../../src/ui/exportDeseneCalcul.ts';

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
