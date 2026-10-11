/**
 * Biarcele pe hârtie (ADR 0033): pe fiecare cubică, abaterea Hausdorff în ambele sensuri, măsurată aici cu o eșantionare
 * deasă și distanța la cubică rafinată prin secțiunea de aur (nu cu proiecția fitter-ului), capetele exacte și tangenta
 * continuă la îmbinări. Oracolul independent (`test/oracles/`) face aceleași măsurători cu codul lui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturFaraCubice, cubicaInArce, PLAFON_BUCATI } from '../../src/geom/biarce.ts';
import { cerculArcului, LINIE, numarSegmente, segment, type Contur, type Punct, type Varf } from '../../src/geom/contur.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';
import { TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';

type Q = readonly [Punct, Punct, Punct, Punct];
const P = (x: number, y: number): Punct => ({ x, y });
const bez = (q: Q, t: number): Punct => {
  const u = 1 - t;
  return {
    x: u * u * u * q[0].x + 3 * u * u * t * q[1].x + 3 * u * t * t * q[2].x + t * t * t * q[3].x,
    y: u * u * u * q[0].y + 3 * u * u * t * q[1].y + 3 * u * t * t * q[2].y + t * t * t * q[3].y,
  };
};

/** Distanța de la p la cubică: 2000 de eșantioane, apoi secțiunea de aur în jurul celui mai apropiat. */
function laCubica(q: Q, p: Punct): number {
  const N = 2000;
  let ti = 0, dmin = Infinity;
  for (let i = 0; i <= N; i++) {
    const r = bez(q, i / N);
    const d = Math.hypot(r.x - p.x, r.y - p.y);
    if (d < dmin) { dmin = d; ti = i; }
  }
  let lo = Math.max(0, (ti - 1) / N), hi = Math.min(1, (ti + 1) / N);
  const f = (t: number): number => { const r = bez(q, t); return Math.hypot(r.x - p.x, r.y - p.y); };
  for (let k = 0; k < 60; k++) {
    const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618;
    if (f(m1) < f(m2)) hi = m2; else lo = m1;
  }
  return Math.min(dmin, f((lo + hi) / 2));
}

/** Hausdorff în ambele sensuri, eșantionat des. */
function hausdorff(q: Q, varfuri: readonly Varf[]): number {
  const lant: Contur = { inchis: false, varfuri: [...varfuri, { p: q[3], s: LINIE }] };
  let e = 0;
  for (let i = 0; i <= 600; i++) e = Math.max(e, distantaLaContur(bez(q, i / 600), lant));
  for (let k = 0; k < numarSegmente(lant); k++) {
    const { a, b, s } = segment(lant, k);
    for (let i = 0; i <= 60; i++) {
      const f = i / 60;
      let p: Punct;
      if (s.tip === 'A') {
        const c = cerculArcului(a, b, s.bulge);
        const u = c.start + c.baleiaj * f;
        p = P(c.centru.x + c.raza * Math.cos(u), c.centru.y + c.raza * Math.sin(u));
      } else {
        p = P(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      }
      e = Math.max(e, laCubica(q, p));
    }
  }
  return e;
}

/** Direcția de mers la capătul (f = 1) sau la începutul (f = 0) segmentului k al lanțului. */
function directie(lant: Contur, k: number, f: 0 | 1): Punct {
  const { a, b, s } = segment(lant, k);
  if (s.tip !== 'A') { const l = Math.hypot(b.x - a.x, b.y - a.y); return P((b.x - a.x) / l, (b.y - a.y) / l); }
  const c = cerculArcului(a, b, s.bulge);
  const u = c.start + c.baleiaj * f, sg = c.baleiaj > 0 ? 1 : -1;
  return P(-Math.sin(u) * sg, Math.cos(u) * sg);
}

function verifica(nume: string, q: Q, tol: number): { bucati: number } {
  const r = cubicaInArce(q[0], q[1], q[2], q[3], tol);
  assert.ok(r.ok, `${nume}: ${r.ok ? '' : r.motiv}`);
  if (!r.ok) return { bucati: 0 };
  assert.ok(r.varfuri.length > 0, `${nume}: lanț gol`);
  assert.deepEqual(r.varfuri[0]?.p, q[0], `${nume}: începe exact în a`);
  const h = hausdorff(q, r.varfuri);
  assert.ok(h <= tol, `${nume}: abaterea ${h} > ${tol}`);
  const lant: Contur = { inchis: false, varfuri: [...r.varfuri, { p: q[3], s: LINIE }] };
  for (let k = 0; k + 1 < numarSegmente(lant); k++) {
    // Lângă o linie (bucată plată) direcția e coarda: continuitatea se cere doar între două arce (ADR 0033 §4).
    if (segment(lant, k).s.tip !== 'A' || segment(lant, k + 1).s.tip !== 'A') continue;
    const u = directie(lant, k, 1), v = directie(lant, k + 1, 0);
    // La un vârf al cubicei tangenta se întoarce: acolo îmbinarea e un colț (unghiul de 180°), nu o frântură oarecare.
    const cos = u.x * v.x + u.y * v.y;
    assert.ok(cos > 1 - 1e-6 || cos < -1 + 1e-6, `${nume}: frântură la îmbinarea ${k} (cos ${cos})`);
  }
  return { bucati: r.bucati };
}

const k = 0.5522847498;

test('sfertul de cerc ca o cubică (κ = 0,5523): lanțul stă sub toleranță, cu capetele exacte și tangenta continuă', () => {
  for (const R of [1, 10, 100, 1220]) {
    verifica(`R ${R}`, [P(R, 0), P(R, k * R), P(k * R, R), P(0, R)], TOLERANTA_PROIECT);
  }
});

test('cubicele grele: S cu inflexiune, vârf, buclă, mâner retras, dublă inflexiune, minusculă, uriașă', () => {
  const cazuri: Array<[string, Q]> = [
    ['S', [P(0, 0), P(30, 40), P(70, -40), P(100, 0)]],
    ['varf', [P(0, 0), P(10, 10), P(0, 10), P(10, 0)]],
    ['bucla', [P(0, 0), P(20, 20), P(-10, 20), P(10, 0)]],
    ['maner retras', [P(0, 0), P(0, 0), P(50, 80), P(100, 0)]],
    ['dubla inflexiune', [P(0, 0), P(100, 60), P(-50, 60), P(50, 0)]],
    ['minuscula', [P(0, 0), P(0.004, 0.008), P(0.008, -0.003), P(0.01, 0.002)]],
    ['uriasa', [P(0, 0), P(800, 1600), P(1700, -900), P(2440, 300)]],
  ];
  for (const [nume, q] of cazuri) verifica(nume, q, TOLERANTA_PROIECT);
});

test('cubica dreaptă e o linie; cea degenerată nu dă nimic', () => {
  const r = cubicaInArce(P(0, 0), P(10, 0), P(20, 0), P(30, 0), TOLERANTA_PROIECT);
  assert.ok(r.ok && r.varfuri.length === 1 && r.varfuri[0]?.s.tip === 'L' && r.bucati === 1);
  const z = cubicaInArce(P(5, 5), P(5, 5), P(5, 5), P(5, 5), TOLERANTA_PROIECT);
  assert.ok(z.ok && z.varfuri.length === 0 && z.bucati === 0);
});

test('cubica dreaptă care se întoarce: tăiată exact în vârfuri (B′ = 0, t = (5 ∓ √5)/10), fără bucăți de lungime nulă', () => {
  // Toate punctele pe Ox: cross(B′, B″) e identic zero, deci vârfurile se găsesc doar din B′ = 0.
  const q: Q = [P(0, 0), P(20, 0), P(-10, 0), P(10, 0)];
  const r = cubicaInArce(q[0], q[1], q[2], q[3], TOLERANTA_PROIECT);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.varfuri.map((v) => v.s.tip), ['L', 'L', 'L']);
  assert.ok(Math.abs((r.varfuri[1]?.p.x ?? 0) - (5 + Math.sqrt(5))) < 1e-9, 'întoarcerea din dreapta');
  assert.ok(Math.abs((r.varfuri[2]?.p.x ?? 0) - (5 - Math.sqrt(5))) < 1e-9, 'întoarcerea din stânga');
  verifica('dreapta care se intoarce', q, TOLERANTA_PROIECT);
  // Aceeași întoarcere, rotită: vârfurile se caută pe componenta mai mare, iar cealaltă trebuie să se anuleze și ea.
  const c = Math.cos(0.7), s = Math.sin(0.7), rot = (p: Punct): Punct => P(p.x * c - p.y * s, p.x * s + p.y * c);
  const qr: Q = [rot(q[0]), rot(q[1]), rot(q[2]), rot(q[3])];
  const rr = cubicaInArce(qr[0], qr[1], qr[2], qr[3], TOLERANTA_PROIECT);
  assert.ok(rr.ok && rr.varfuri.length === 3);
  verifica('dreapta rotita', qr, TOLERANTA_PROIECT);
  for (const [nume, x] of [['S', [P(0, 0), P(30, 40), P(70, -40), P(100, 0)]], ['varf', [P(0, 0), P(10, 10), P(0, 10), P(10, 0)]], ['dreapta', q]] as Array<[string, Q]>) {
    const t = cubicaInArce(x[0], x[1], x[2], x[3], TOLERANTA_PROIECT);
    assert.ok(t.ok);
    if (!t.ok) continue;
    const lant = [...t.varfuri.map((v) => v.p), x[3]];
    for (let i = 0; i + 1 < lant.length; i++) {
      const u = lant[i] as Punct, v = lant[i + 1] as Punct;
      assert.ok(Math.hypot(v.x - u.x, v.y - u.y) >= 1e-9, `${nume}: bucata ${i} are lungimea nulă`);
    }
  }
});

test('regula liniei la pragul ei (ADR 0033 §4): mânerele la 0,989 × tol de coardă dau o linie, la 0,991 × tol nu', () => {
  const cu = (k: number) => cubicaInArce(P(0, 0), P(10, k * TOLERANTA_PROIECT), P(20, k * TOLERANTA_PROIECT), P(30, 0), TOLERANTA_PROIECT);
  const sub = cu(0.989), peste = cu(0.991);
  assert.ok(sub.ok && sub.varfuri.length === 1 && sub.varfuri[0]?.s.tip === 'L', JSON.stringify(sub));
  assert.ok(peste.ok && !(peste.varfuri.length === 1 && peste.varfuri[0]?.s.tip === 'L'), JSON.stringify(peste));
});

test('la un vârf, bucățile vecine sunt arce: tangenta de sosire e −B″, cea de plecare +B″', () => {
  // Cu semnul greșit pe una dintre părți, biarcul de lângă vârf nu încape și bucata se înjumătățește până devine linie.
  const r = cubicaInArce(P(0, 0), P(10, 10), P(0, 10), P(10, 0), TOLERANTA_PROIECT);
  assert.ok(r.ok && r.varfuri.every((v) => v.s.tip === 'A'), JSON.stringify(r.ok ? r.varfuri.map((v) => v.s.tip) : r));
});

test('refuzurile (ADR 0033 §5): toleranța care nu e pozitivă și finită, punctele neterminate, plafonul de bucăți', () => {
  for (const tol of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const r = cubicaInArce(P(0, 0), P(1, 1), P(2, 1), P(3, 0), tol);
    assert.match(r.ok ? '' : r.motiv, /toleranța biarcelor trebuie să fie un număr pozitiv/, String(tol));
  }
  const nan = cubicaInArce(P(0, 0), P(Number.NaN, 1), P(2, 1), P(3, 0), 0.001);
  assert.match(nan.ok ? '' : nan.motiv, /nu e un număr finit/);
  const prea = cubicaInArce(P(0, 0), P(800, 1600), P(1700, -900), P(2440, 300), 1e-12);
  assert.match(prea.ok ? '' : prea.motiv, new RegExp(`în ${PLAFON_BUCATI} de bucăți`));
});

test('conturul: doar cubicele se înlocuiesc; liniile și arcele rămân, conturul rămâne închis', () => {
  // Un dreptunghi cu latura din dreapta o cubică și cea de sus un arc.
  const cu: Contur = {
    inchis: true,
    varfuri: [
      { p: P(0, 0), s: LINIE },
      { p: P(100, 0), s: { tip: 'C', c1: P(130, 20), c2: P(130, 60) } },
      { p: P(100, 80), s: { tip: 'A', bulge: 0.4 } },
      { p: P(0, 80), s: LINIE },
    ],
  };
  const r = conturFaraCubice(cu, TOLERANTA_PROIECT);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.contur.inchis, true);
  assert.ok(r.contur.varfuri.every((v) => v.s.tip !== 'C'));
  assert.deepEqual(r.contur.varfuri[0], cu.varfuri[0]);
  assert.deepEqual(r.contur.varfuri.slice(-2), cu.varfuri.slice(-2), 'arcul și ultima linie, neschimbate');
  assert.equal(r.contur.varfuri.length, 3 + r.bucati);
  const fara = conturFaraCubice({ inchis: true, varfuri: [cu.varfuri[0] as Varf, { p: P(100, 0), s: LINIE }, cu.varfuri[2] as Varf, cu.varfuri[3] as Varf] }, 0.001);
  assert.ok(fara.ok && fara.bucati === 0);
});
