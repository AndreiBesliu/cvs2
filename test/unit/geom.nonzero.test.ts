/**
 * Normalizarea nonzero → evenodd (felia 2.7d) pe hârtie: cazurile cu valori cunoscute (punctele de intersecție, aria
 * reuniunii, subcurbele blossom), cazurile decisive ale judecății 2.7d (cercul de 0,003 mm pe latura foii, lentila de
 * 1e-4 mm la 1e6 mm), refuzurile și intrarea invalidă. Regiunea se verifică aici cu o înfășurare EXACTĂ pe linii și arce
 * (raza orizontală, intersecția analitică cu cercul), scrisă în test, nu luată din modul: nonzero(intrare) trebuie să fie
 * evenodd(ieșire) în fiecare punct de probă. Cubicele se aplatizează doar unde probele stau departe de frontieră.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arc, arieCuSemn, cerculArcului, inverseaza, LINIE, type Punct, type Varf } from '../../src/geom/contur.ts';
import { normalizeaza, PLAFON_LUCRU, PLAFON_PERECHI, TAU_RELATIV, TAU_ULP, type BugetImport } from '../../src/geom/nonzero.ts';
import { offsetInchis } from '../../src/geom/offset.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';

type Cale = readonly Varf[];
const L = (x: number, y: number): Varf => ({ p: { x, y }, s: LINIE });
const A = (x: number, y: number, bulge: number): Varf => ({ p: { x, y }, s: arc(bulge) });
const C = (x: number, y: number, c1x: number, c1y: number, c2x: number, c2y: number): Varf =>
  ({ p: { x, y }, s: { tip: 'C', c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y } } });
const invers = (c: Cale): Varf[] => [...inverseaza({ inchis: true, varfuri: c }).varfuri];
const cerc = (cx: number, cy: number, r: number, trig = true): Varf[] => [A(cx + r, cy, trig ? 1 : -1), A(cx - r, cy, trig ? 1 : -1)];
const drept = (x: number, y: number, w: number, h: number, trig = true): Varf[] => {
  const v = [L(x, y), L(x + w, y), L(x + w, y + h), L(x, y + h)];
  return trig ? v : invers(v);
};
const muta = (cai: readonly Cale[], dx: number, dy: number): Varf[][] => cai.map((c) => c.map((v) => ({
  p: { x: v.p.x + dx, y: v.p.y + dy },
  s: v.s.tip === 'C' ? { tip: 'C', c1: { x: v.s.c1.x + dx, y: v.s.c1.y + dy }, c2: { x: v.s.c2.x + dx, y: v.s.c2.y + dy } } : v.s,
})));
const arie = (cai: readonly Cale[]): number => cai.reduce((a, c) => a + arieCuSemn({ inchis: true, varfuri: c }), 0);
const ingheata = <T>(o: T): T => {
  if (o && typeof o === 'object') { for (const v of Object.values(o)) ingheata(v); Object.freeze(o); }
  return o;
};

function reusit(cai: readonly Cale[], optiuni?: { readonly regula?: 'nonzero' | 'evenodd'; readonly buget?: BugetImport }) {
  const r = normalizeaza(cai, optiuni);
  if (!r.ok) assert.fail(`refuz neașteptat: ${r.motiv}`);
  return r;
}

// ---------------------------------------------------------------- oracolul: înfășurarea exactă pe linii și arce

/** Traversarea cu semn a razei orizontale din p spre +x de către segmentul [a, b] (regula semi-deschisă pe y). */
function laLinie(p: Punct, a: Punct, b: Punct): number {
  if ((a.y <= p.y) === (b.y <= p.y)) return 0;
  const x = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y);
  return x > p.x ? (b.y > a.y ? 1 : -1) : 0;
}

/**
 * Același lucru pentru un arc: arcul se taie în bucăți monotone pe y (la unghiurile ±π/2), iar fiecare bucată se judecă
 * cu aceeași regulă semi-deschisă ca linia, pe capetele ei (capetele arcului sunt chiar vârfurile, deci un vârf de pe raza
 * de probă se numără o singură dată); traversarea e punctul bucății de la înălțimea lui p, pe jumătatea ei de cerc.
 */
function laArc(p: Punct, a: Punct, b: Punct, bulge: number): number {
  const k = cerculArcului(a, b, bulge), c = k.centru, r = k.raza;
  const ung = [k.start];
  const lo = Math.min(k.start, k.start + k.baleiaj), hi = Math.max(k.start, k.start + k.baleiaj);
  const taieturi: number[] = [];
  for (let j = Math.ceil((lo - Math.PI / 2) / Math.PI); Math.PI / 2 + j * Math.PI < hi; j++) {
    const u = Math.PI / 2 + j * Math.PI;
    if (u > lo) taieturi.push(u);
  }
  ung.push(...(k.baleiaj > 0 ? taieturi : taieturi.reverse()), k.start + k.baleiaj);
  const pe = (i: number): Punct => (i === 0 ? a : i === ung.length - 1 ? b : { x: c.x, y: c.y + r * Math.sin(ung[i] as number) });
  let n = 0;
  for (let i = 0; i + 1 < ung.length; i++) {
    const u = pe(i), v = pe(i + 1);
    if ((u.y <= p.y) === (v.y <= p.y)) continue;
    const m = ((ung[i] as number) + (ung[i + 1] as number)) / 2, dy = p.y - c.y;
    const x = c.x + (Math.cos(m) > 0 ? 1 : -1) * Math.sqrt(Math.max(0, r * r - dy * dy));
    if (x > p.x) n += v.y > u.y ? 1 : -1;
  }
  return n;
}

function infasurare(p: Punct, cai: readonly Cale[]): number {
  let w = 0;
  for (const c of cai) {
    for (let i = 0; i < c.length; i++) {
      const v = c[i] as Varf, a = v.p, b = (c[(i + 1) % c.length] as Varf).p;
      if (v.s.tip === 'L') w += laLinie(p, a, b);
      else if (v.s.tip === 'A') w += laArc(p, a, b, v.s.bulge);
      else {
        // Cubica, aplatizată în 2 000 de bucăți: doar pentru probe departe de frontieră.
        const { c1, c2 } = v.s;
        let q = a;
        for (let j = 1; j <= 2000; j++) {
          const t = j / 2000, u = 1 - t;
          const r = { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y };
          w += laLinie(p, q, r);
          q = r;
        }
      }
    }
  }
  return w;
}

const plinNonzero = (p: Punct, cai: readonly Cale[]): boolean => infasurare(p, cai) !== 0;
const plinEvenodd = (p: Punct, cai: readonly Cale[]): boolean => (infasurare(p, cai) & 1) !== 0;

/** Distanța de la p la frontieră: linii și arce exact, cubicele aplatizate în 400 de bucăți. */
function laFrontiera(p: Punct, cai: readonly Cale[]): number {
  let d = Infinity;
  for (const c of cai) {
    for (let i = 0; i < c.length; i++) {
      const v = c[i] as Varf, a = v.p, b = (c[(i + 1) % c.length] as Varf).p;
      if (v.s.tip === 'A') {
        const k = cerculArcului(a, b, v.s.bulge), th = Math.atan2(p.y - k.centru.y, p.x - k.centru.x);
        const dd = k.baleiaj > 0 ? th - k.start : k.start - th, m = ((dd % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (m < Math.abs(k.baleiaj)) d = Math.min(d, Math.abs(Math.hypot(p.x - k.centru.x, p.y - k.centru.y) - k.raza));
        d = Math.min(d, Math.hypot(p.x - a.x, p.y - a.y), Math.hypot(p.x - b.x, p.y - b.y));
      } else if (v.s.tip === 'C') {
        const { c1, c2 } = v.s;
        let q = a;
        for (let j = 1; j <= 400; j++) {
          const t = j / 400, u = 1 - t;
          const r = { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y };
          const dx = r.x - q.x, dy = r.y - q.y, l2 = dx * dx + dy * dy;
          const tt = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - q.x) * dx + (p.y - q.y) * dy) / l2)) : 0;
          d = Math.min(d, Math.hypot(p.x - q.x - tt * dx, p.y - q.y - tt * dy));
          q = r;
        }
      } else {
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
        d = Math.min(d, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
      }
    }
  }
  return d;
}

function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Câte probe (mai departe de `marja` de frontiera intrării) dau nonzero(intrare) ≠ evenodd(ieșire). */
function dezacorduri(intrare: readonly Cale[], iesire: readonly Cale[], probe: readonly Punct[], marja: number): number {
  let n = 0;
  for (const p of probe) if (laFrontiera(p, intrare) > marja && plinNonzero(p, intrare) !== plinEvenodd(p, iesire)) n++;
  return n;
}

function probeIn(cai: readonly Cale[], n: number, rnd: () => number): Punct[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cai) for (const v of c) { x0 = Math.min(x0, v.p.x); y0 = Math.min(y0, v.p.y); x1 = Math.max(x1, v.p.x); y1 = Math.max(y1, v.p.y); }
  const mx = 0.2 * (x1 - x0 || 1), my = 0.2 * (y1 - y0 || 1);
  return Array.from({ length: n }, () => ({ x: x0 - mx + rnd() * (x1 - x0 + 2 * mx), y: y0 - my + rnd() * (y1 - y0 + 2 * my) }));
}

/** Regulile ieșirii normalizate: ≥ 2 vârfuri, fără segmente nule, valori finite, bulge ≠ 0. */
function verificaForma(iesire: readonly Cale[]): void {
  for (const c of iesire) {
    assert.ok(c.length >= 2, `un contur are ${c.length} vârfuri`);
    for (let i = 0; i < c.length; i++) {
      const v = c[i] as Varf, b = (c[(i + 1) % c.length] as Varf).p;
      assert.ok(Number.isFinite(v.p.x) && Number.isFinite(v.p.y));
      if (v.s.tip !== 'C') assert.ok(v.p.x !== b.x || v.p.y !== b.y, `segment ${v.s.tip} de lungime zero în ${v.p.x}, ${v.p.y}`);
      if (v.s.tip === 'A') assert.ok(Number.isFinite(v.s.bulge) && v.s.bulge !== 0);
    }
  }
}

/** Fiecare arc ieșit stă pe cercul unuia dintre arcele intrării (centrul și raza, la `tol`). */
function arcePeSurse(intrare: readonly Cale[], iesire: readonly Cale[], tol: number): number {
  const cercuri: Array<{ centru: Punct; raza: number }> = [];
  for (const c of intrare) {
    c.forEach((v, i) => { if (v.s.tip === 'A') cercuri.push(cerculArcului(v.p, (c[(i + 1) % c.length] as Varf).p, v.s.bulge)); });
  }
  let arce = 0;
  for (const c of iesire) {
    c.forEach((v, i) => {
      if (v.s.tip !== 'A') return;
      arce++;
      const k = cerculArcului(v.p, (c[(i + 1) % c.length] as Varf).p, v.s.bulge);
      const e = Math.min(...cercuri.map((q) => Math.max(Math.hypot(q.centru.x - k.centru.x, q.centru.y - k.centru.y), Math.abs(q.raza - k.raza))));
      assert.ok(e <= tol, `arcul din (${v.p.x}, ${v.p.y}) e la ${e} de cel mai apropiat cerc-sursă`);
    });
  }
  return arce;
}

// ---------------------------------------------------------------- cazurile pe hârtie

test('două cercuri suprapuse, același sens: reuniunea, un contur din arce pe cercurile-sursă, vârfurile (6, ±8)', () => {
  const intrare = [cerc(0, 0, 10), cerc(12, 0, 10)];
  const r = reusit(intrare);
  assert.equal(r.info.neschimbat, false);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  const c = r.cai[0] as Cale;
  assert.ok(c.every((v) => v.s.tip === 'A'), 'doar arce');
  assert.equal(arcePeSurse(intrare, r.cai, 1e-12), c.length);
  // Cercurile de rază 10 la distanța 12 se taie în x = 6, y = ±8: valori exacte în double.
  for (const y of [8, -8]) assert.ok(c.some((v) => v.p.x === 6 && v.p.y === y), `lipsește vârful (6, ${y})`);
  // Aria reuniunii: 2πr² minus lentila 2r²·acos(d / 2r) − (d / 2)·√(4r² − d²).
  const lentila = 2 * 100 * Math.acos(0.6) - 6 * 16;
  assert.ok(Math.abs(arie(r.cai) - (2 * Math.PI * 100 - lentila)) < 1e-9, `aria ${arie(r.cai)}`);
  assert.equal(dezacorduri(intrare, r.cai, probeIn(intrare, 400, aleator(1)), 1e-9), 0);
  // Info: τ = 1e-10 × diagonala cutiei [−10, 22] × [−10, 10] + 64 ulp(22).
  assert.equal(r.info.grupuri, 1);
  assert.equal(r.info.contururiIntrare, 2);
  assert.equal(r.info.contururiIesire, 1);
  assert.equal(r.info.tau, TAU_RELATIV * Math.hypot(32, 20) + TAU_ULP * 2 ** (4 - 52));
  assert.ok(r.info.intersectii >= 2 && r.info.muchiiScoase >= 2);
});

test('pătrate imbricate în același sens: rămâne doar exteriorul, cu vârfurile lui bit cu bit', () => {
  const exterior = drept(0, 0, 10, 10);
  const r = reusit([exterior, drept(2, 2, 6, 6)]);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  assert.deepEqual(r.cai[0], exterior);
  assert.ok((r.cai[0] as Cale).every((v, i) => v.p === (exterior[i] as Varf).p), 'vârfurile sunt chiar punctele intrării');
  assert.equal(arie(r.cai), 100);
});

test('pătrate imbricate în sens opus: nonzero e deja evenodd, se întoarce chiar obiectul de intrare', () => {
  const intrare = ingheata([drept(0, 0, 10, 10), drept(2, 2, 6, 6, false)]);
  const r = reusit(intrare);
  assert.equal(r.cai, intrare);
  assert.equal(r.info.neschimbat, true);
  assert.equal(r.info.muchiiScoase, 0);
  assert.equal(r.info.contururiIesire, 2);
});

test('regula evenodd: pătratele imbricate în același sens rămân neschimbate (golul e gol)', () => {
  const intrare = [drept(0, 0, 10, 10), drept(2, 2, 6, 6)];
  const r = reusit(intrare, { regula: 'evenodd' });
  assert.equal(r.cai, intrare);
});

test('opt-ul din două cubice (lobii +1 și −1): neschimbat', () => {
  // Fiecare cubică e simetrică față de origine (P(1 − t) = −P(t)), deci ambele trec prin (0, 0) la t = 1/2.
  const opt = [C(-10, 0, -10, 10, 10, -10), C(10, 0, 10, 10, -10, -10)];
  const intrare = [opt];
  const r = reusit(intrare);
  assert.equal(r.cai, intrare);
  assert.equal(r.info.neschimbat, true);
  assert.ok(plinEvenodd({ x: -6, y: 0 }, intrare) && plinEvenodd({ x: 6, y: 0 }, intrare));
  assert.equal(infasurare({ x: -6, y: 0 }, intrare), -1);
  assert.equal(infasurare({ x: 6, y: 0 }, intrare), 1);
});

test('bucla unei singure cubice, dublată: o buclă, tăiată la t = 1/2 în subcurbele blossom exacte', () => {
  // De la (0, 0) la (0, 0), cu mânerele (30, 30) și (−30, 30): picătura P(t) = (90t(1−t)(1−2t), 90t(1−t)), trigonometric.
  // Scrisă cu un singur vârf, calea e refuzată (ADR 0034 §2; oracolul 2.7d, K1): ușa o taie la t = 1/2 (ADR 0035 §7).
  const r1 = normalizeaza([[C(0, 0, 30, 30, -30, 30)]]);
  assert.ok(!r1.ok && r1.motiv === 'intrare: subcalea 0 are sub 2 vârfuri', r1.ok ? 'ok' : r1.motiv);
  // De Casteljau la 1/2: (0, 0), (15, 15), (7.5, 22.5), (0, 22.5) și (0, 22.5), (−7.5, 22.5), (−15, 15), (0, 0).
  const bucla = (): Varf[] => [C(0, 0, 15, 15, 7.5, 22.5), C(0, 22.5, -7.5, 22.5, -15, 15)];
  const r = reusit([bucla(), bucla()]);
  assert.equal(r.info.neschimbat, false);
  assert.deepEqual(r.cai, [[
    C(0, 0, 15, 15, 7.5, 22.5),
    C(0, 22.5, -7.5, 22.5, -15, 15),
  ]]);
  // Și un singur vârf lângă o cale bună refuză tot (nu „neschimbat”).
  const r2 = normalizeaza([drept(0, 0, 10, 10), [{ p: { x: 1, y: 1 }, s: { tip: 'L' } }]]);
  assert.ok(!r2.ok && r2.motiv === 'intrare: subcalea 1 are sub 2 vârfuri', r2.ok ? 'ok' : r2.motiv);
});

test('dreptunghiuri cu o latură comună: reuniunea, 200 mm², fără latura comună', () => {
  const intrare = [drept(0, 0, 10, 10), drept(10, 0, 10, 10)];
  const r = reusit(intrare);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  assert.equal(arie(r.cai), 200);
  assert.ok(!(r.cai[0] as Cale).some((v, i, c) => v.p.x === 10 && (c[(i + 1) % c.length] as Varf).p.x === 10), 'latura comună a rămas');
  assert.equal(dezacorduri(intrare, r.cai, probeIn(intrare, 300, aleator(2)), 1e-9), 0);
});

test('aceeași latură în sensuri opuse se anulează; același dreptunghi de două ori dă dreptunghiul', () => {
  const d = drept(0, 0, 10, 10);
  const dublu = reusit([d, d]);
  assert.equal(dublu.cai.length, 1);
  assert.equal(arie(dublu.cai), 100);
  const anulat = reusit([d, drept(0, 0, 10, 10, false)]);
  assert.deepEqual(anulat.cai, []);
  assert.equal(anulat.info.contururiIesire, 0);
});

test('cercuri tangente: exterior neschimbat; interior, în același sens, rămâne cercul mare', () => {
  const exterior = [cerc(0, 0, 10), cerc(20, 0, 10)];
  assert.equal(reusit(exterior).cai, exterior);
  const interior = [cerc(0, 0, 10), cerc(5, 0, 5)];
  const r = reusit(interior);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  assert.equal(arcePeSurse([cerc(0, 0, 10)], r.cai, 1e-12), (r.cai[0] as Cale).length);
  assert.ok(Math.abs(arie(r.cai) - 100 * Math.PI) < 1e-9);
  assert.equal(dezacorduri(interior, r.cai, probeIn(interior, 300, aleator(3)), 1e-9), 0);
});

test('cerc de 2e-4 mm pe cercul de 100 mm: intersecțiile, rafinate cu Newton, stau pe ambele cercuri la 1e-13', () => {
  // Forma închisă singură e la 1,8e-9 mm de cercuri aici (judecata 2.7d: 3,5e-9 la prototipul B).
  const intrare = [cerc(0, 0, 100), cerc(100, 0, 2e-4)];
  const r = reusit(intrare);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  const surse = [{ c: { x: 0, y: 0 }, r: 100 }, { c: { x: 100, y: 0 }, r: 2e-4 }];
  const noi = (r.cai[0] as Cale).filter((v) => !intrare.some((c) => c.some((q) => q.p === v.p)));
  assert.equal(noi.length, 2, 'două vârfuri noi: intersecțiile');
  for (const v of noi) for (const k of surse) assert.ok(Math.abs(Math.hypot(v.p.x - k.c.x, v.p.y - k.c.y) - k.r) < 1e-13, `(${v.p.x}, ${v.p.y})`);
  assert.equal(dezacorduri(intrare, r.cai, [{ x: 100, y: 1e-4 }, { x: 100.00015, y: 0.00001 }, { x: 99.9999, y: 0 }], 1e-6), 0);
  assert.ok(plinEvenodd({ x: 100.00015, y: 0.00001 }, r.cai), 'jumătatea din afară a cercului mic');
});

test('judecata 2.7d, cazul decisiv 3: lentila de 1e-4 mm dintre două cercuri la (1e6, 1e6) se reproduce exact', () => {
  const O = 1e6, d = 20 - 1e-4;
  const intrare = muta([cerc(0, 0, 10), cerc(d, 0, 10)], O, O);
  const r = reusit(intrare);
  // Prototipul C, cu τ legat de |coordonată| (1e-4 mm aici), întorcea intrarea: sub evenodd lentila devenea gol.
  assert.equal(r.info.neschimbat, false);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  assert.ok(r.info.tau < 2e-8, `τ = ${r.info.tau}`);
  assert.equal(arcePeSurse(intrare, r.cai, 1e-9), (r.cai[0] as Cale).length);
  // Vârfurile lentilei stau pe ambele cercuri-sursă (cele rotunjite în double la 1e6, nu cele de pe hârtie) la ~ulp; față
  // de hârtie, la x = O + d/2, y = O ± √((10 − d/2)(10 + d/2)), cât mută rotunjirea intrării (ulp(1e6) ≈ 1,2e-10)
  // împărțit la unghiul de încrucișare al cercurilor (~0,0063 rad): ~2e-8 mm.
  const surse = intrare.map((c) => cerculArcului((c[0] as Varf).p, (c[1] as Varf).p, 1));
  const h = Math.sqrt((10 - d / 2) * (10 + d / 2));
  for (const s of [1, -1]) {
    const v = (r.cai[0] as Cale).map((q) => q.p).sort((a, b) => Math.hypot(a.x - O - d / 2, a.y - O - s * h) - Math.hypot(b.x - O - d / 2, b.y - O - s * h))[0] as Punct;
    assert.ok(Math.hypot(v.x - O - d / 2, v.y - O - s * h) < 5e-8, `vârful lentilei e la ${Math.hypot(v.x - O - d / 2, v.y - O - s * h)} mm de hârtie`);
    for (const k of surse) {
      const e = Math.abs(Math.hypot(v.x - k.centru.x, v.y - k.centru.y) - k.raza);
      assert.ok(e < 1e-9, `vârful lentilei e la ${e} mm de un cerc-sursă`);
    }
  }
  const inapoi = muta(r.cai, -O, -O), sursa = [cerc(0, 0, 10), cerc(d, 0, 10)];
  // Mijlocul lentilei (înfășurarea 2) e plin; la fel, puncte din ambele cercuri; în afara lor, nu.
  for (const p of [{ x: d / 2, y: 0 }, { x: d / 2, y: 0.02 }, { x: 0, y: 0 }, { x: d, y: 0 }]) assert.ok(plinEvenodd(p, inapoi), `(${p.x}, ${p.y}) gol`);
  for (const p of [{ x: d / 2, y: 0.04 }, { x: -11, y: 0 }]) assert.ok(!plinEvenodd(p, inapoi), `(${p.x}, ${p.y}) plin`);
  assert.equal(dezacorduri(sursa, inapoi, probeIn(sursa, 400, aleator(4)), 1e-8), 0);
});

test('judecata 2.7d, cazul decisiv 2: cercul de 0,003 mm de pe latura foii de 2 400 × 1 200 nu dispare', () => {
  const foaie = drept(0, 0, 2400, 1200), mic = cerc(1200, 1200, 0.003);
  const intrare = [foaie, mic, drept(1000, 1100, 400, 50)];
  const r = reusit(intrare);
  assert.equal(r.cai.length, 1);
  verificaForma(r.cai);
  // Semicercul de sus iese întreg: chiar vârful (1200,003, 1200) al intrării, cu bulge-ul 1 al sursei.
  const c = r.cai[0] as Cale, k = c.findIndex((v) => v.p === (mic[0] as Varf).p);
  assert.ok(k >= 0, 'vârful cercului mic lipsește');
  assert.deepEqual((c[k] as Varf).s, arc(1));
  assert.equal((c[(k + 1) % c.length] as Varf).p, (mic[1] as Varf).p);
  for (const p of [{ x: 1200, y: 1200.002 }, { x: 1200.001, y: 1200.0025 }, { x: 1200, y: 1199.998 }, { x: 1200, y: 1125 }]) {
    assert.ok(plinEvenodd(p, r.cai), `(${p.x}, ${p.y}) gol`);
  }
  for (const p of [{ x: 1200, y: 1200.0035 }, { x: 1200.0029, y: 1200.002 }]) assert.ok(!plinEvenodd(p, r.cai), `(${p.x}, ${p.y}) plin`);
  assert.ok(Math.abs(arie(r.cai) - (2400 * 1200 + (Math.PI * 0.003 * 0.003) / 2)) < 1e-6);
});

test('grupurile: cutiile disjuncte se normalizează separat, fiecare cu τ-ul lui, în ordinea primei subcăi', () => {
  // Inelul de 1e-7 mm (exteriorul orar, interiorul trigonometric) e departe de foaie. Cu τ-ul foii (2,7e-7 mm) cele două
  // cercuri ar fi „același cerc” și inelul ar dispărea; cu τ-ul lui (2,8e-9 mm) rămâne.
  const inel = [cerc(3000, 0, 10 + 1e-7, false), cerc(3000, 0, 10)];
  const foaie = [drept(0, 0, 2400, 1200), drept(100, 100, 50, 50)];
  const r = reusit([inel[0] as Cale, ...foaie, inel[1] as Cale]);
  assert.equal(r.info.grupuri, 2);
  assert.equal(r.cai.length, 3);
  verificaForma(r.cai);
  // Primul grup (al primei subcăi) e inelul: ieșit normalizat, cu plinul în stânga: exteriorul trigonometric, golul orar.
  const [ext, int, f] = [r.cai[0] as Cale, r.cai[1] as Cale, r.cai[2] as Cale];
  assert.ok(arie([ext]) > 0 && arie([int]) < 0, `ariile ${arie([ext])} și ${arie([int])}`);
  assert.ok(Math.abs(arie([ext, int]) - Math.PI * ((10 + 1e-7) ** 2 - 100)) < 1e-9);
  assert.equal(arcePeSurse(inel, [ext, int], 1e-12), ext.length + int.length);
  assert.deepEqual(f, foaie[0]);
  assert.ok(r.info.tau > 2e-7 && r.info.tau < 3e-7, `τ maxim ${r.info.tau}`);
});

test('grupurile exacte: patru dreptunghiuri în morișcă (proiecțiile legate pe ambele axe, cutiile disjuncte) sunt patru grupuri', () => {
  const morisca = [drept(0, 0, 6, 2), drept(8, 0, 2, 6), drept(4, 8, 6, 2), drept(0, 4, 2, 6)];
  const r = reusit(morisca);
  assert.equal(r.cai, morisca);
  assert.equal(r.info.grupuri, 4);
});

test('nonzero e același oriunde: figura mutată la (2 440, 1 220) și la (1e6, 1e6) dă aceeași topologie și regiune', () => {
  const forma = [cerc(0, 0, 10), cerc(12, 0, 10), drept(-5, -3, 30, 6), drept(1, -1, 2, 2, false)];
  const baza = reusit(forma);
  for (const [dx, dy] of [[2440, 1220], [1e6, 1e6]] as const) {
    const r = reusit(muta(forma, dx, dy));
    assert.equal(r.cai.length, baza.cai.length);
    assert.deepEqual(r.cai.map((c) => c.length), baza.cai.map((c) => c.length));
    assert.equal(dezacorduri(forma, muta(r.cai, -dx, -dy), probeIn(forma, 300, aleator(5)), 1e-8), 0);
  }
});

test('stres: 40 de forme aleatoare din cercuri, dreptunghiuri și poligoane care se taie; regiunea, arcele, sensul', () => {
  const rnd = aleator(2027);
  for (let k = 0; k < 40; k++) {
    const forma: Varf[][] = [];
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const tip = rnd(), sens = rnd() < 0.7;
      if (tip < 0.4) forma.push(cerc(rnd() * 30, rnd() * 30, 3 + rnd() * 12, sens));
      else if (tip < 0.7) forma.push(drept(rnd() * 25, rnd() * 25, 3 + rnd() * 15, 3 + rnd() * 15, sens));
      else forma.push(Array.from({ length: 3 + Math.floor(rnd() * 4) }, () => L(rnd() * 40, rnd() * 40)));
    }
    if (rnd() < 0.2) forma.push(forma[0] as Varf[]);
    const r = normalizeaza(forma);
    if (!r.ok) assert.fail(`forma ${k}: ${r.motiv}`);
    if (r.info.neschimbat) assert.equal(r.cai, forma);
    else {
      verificaForma(r.cai);
      arcePeSurse(forma, r.cai, 1e-10);
      // Plinul în stânga: lângă mijlocul celui mai lung segment al fiecărui contur, stânga plină și dreapta goală.
      for (const c of r.cai) {
        let best = 0, lung = -1;
        c.forEach((v, i) => { const b = (c[(i + 1) % c.length] as Varf).p, l = Math.hypot(b.x - v.p.x, b.y - v.p.y); if (v.s.tip === 'L' && l > lung) { lung = l; best = i; } });
        if (lung < 1e-3) continue;
        const a = (c[best] as Varf).p, b = (c[(best + 1) % c.length] as Varf).p, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const nx = -(b.y - a.y) / lung, ny = (b.x - a.x) / lung, e = 1e-6;
        if (laFrontiera(m, r.cai.filter((q) => q !== c)) < 1e-4) continue;
        assert.ok(plinEvenodd({ x: m.x + e * nx, y: m.y + e * ny }, r.cai) && !plinEvenodd({ x: m.x - e * nx, y: m.y - e * ny }, r.cai), `forma ${k}: un contur n-are plinul în stânga`);
      }
    }
    assert.equal(dezacorduri(forma, r.cai, probeIn(forma, 250, rnd), 1e-7), 0, `forma ${k}`);
    // Aceeași formă la (2 440, 1 220): același număr de contururi și aceeași regiune.
    const m = normalizeaza(muta(forma, 2440, 1220));
    if (!m.ok) assert.fail(`forma ${k} mutată: ${m.motiv}`);
    assert.equal(m.cai.length, r.cai.length, `forma ${k} mutată`);
    assert.equal(dezacorduri(forma, muta(m.cai, -2440, -1220), probeIn(forma, 100, rnd), 1e-7), 0, `forma ${k} mutată`);
  }
});

// ---------------------------------------------------------------- refuzurile

test('refuz: curbe aproape suprapuse care nu sunt identice (trei încrucișări în 1e-6 mm) → motiv „nedecis”, nu geometrie', () => {
  // Cazul „cubice-paralele-3x-1e-6” al judecății: două cubice la 1e-7 mm, care se taie de trei ori.
  const eps = 1e-6, d = eps / 10;
  const P = [C(0, 0, 30, 40, 70, 40), L(100, 0), L(100, -20), L(0, -20)];
  const Q = [C(100, d, 70, 40 - eps, 30, 40 + eps), L(0, -d), L(0, 60), L(100, 60)];
  for (const [dx, dy] of [[0, 0], [2440, 1220]] as const) {
    const r = normalizeaza(muta([P, Q], dx, dy));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.motiv, /^nedecis: muchia de lângă \(/);
  }
});

test('refuz: un grup cu τ peste toleranța importului (diagonala de 20 000 mm)', () => {
  const r = normalizeaza([drept(0, 0, 20_000, 10), drept(5, 5, 1, 1)]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motiv, new RegExp(`^toleranta: .*${TOLERANTA_IMPORT}`));
});

test('refuz: bugetul de lucru (un poligon aleator de 800 de vârfuri, ~70 000 de încrucișări) → „plafon”, nu blocaj', () => {
  const rnd = aleator(7);
  const r = normalizeaza([Array.from({ length: 800 }, () => L(rnd() * 100, rnd() * 100))]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motiv, `plafon: forma cere peste ${PLAFON_LUCRU} de unități de lucru (prea densă pentru firul principal)`);
});

test('refuz devreme: un zigzag de 700 de vârfuri cu toate cutiile suprapuse trece de plafonul perechilor', () => {
  const z: Varf[] = [];
  for (let i = 0; i < 350; i++) z.push(L(0, i * 0.05), L(100, i * 0.05 + 50));
  const t0 = performance.now(), r = normalizeaza([z]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motiv, `plafon: peste ${PLAFON_PERECHI} de perechi de segmente cu cutiile suprapuse (forma e prea densă)`);
  assert.ok(performance.now() - t0 < 2000);
});

test('fâșii stivuite: 4 000 de dreptunghiuri disjuncte de aceeași lățime sunt 4 000 de grupuri, fără perechi', () => {
  const fasii = Array.from({ length: 4000 }, (_, i) => drept(0, 2 * i, 100, 1));
  const r = reusit(fasii);
  assert.equal(r.cai, fasii);
  assert.equal(r.info.grupuri, 4000);
  assert.ok(r.info.lucru < PLAFON_LUCRU / 10, `lucru ${r.info.lucru}`);
});

test('intrarea invalidă: refuz cu motiv, niciodată excepție', () => {
  const p0 = { x: 0, y: 0 };
  const rele: ReadonlyArray<readonly [string, unknown]> = [
    ['nu e listă', 42],
    ['subcale goală', [[]]],
    ['vârf null', [[null]]],
    ['fără segment', [[{ p: p0 }]]],
    ['coordonată NaN', [[L(0, 0), L(NaN, 1), L(1, 1)]]],
    ['coordonată infinită', [[L(0, 0), L(Infinity, 1), L(1, 1)]]],
    ['bulge zero', [[A(0, 0, 0), L(1, 1)]]],
    ['arc cu capetele egale', [[A(0, 0, 0.5), L(0, 0)]]],
    ['tip necunoscut', [[{ p: p0, s: { tip: 'Q' } }, L(1, 1)]]],
    ['punct de control invalid', [[{ p: p0, s: { tip: 'C', c1: { x: 1 }, c2: p0 } }, L(1, 1)]]],
  ];
  for (const [nume, cai] of rele) {
    const r = normalizeaza(cai as readonly Cale[]);
    assert.equal(r.ok, false, nume);
    if (!r.ok) assert.match(r.motiv, /^intrare: /, nume);
  }
  const regula = normalizeaza([drept(0, 0, 1, 1)], { regula: 'pare' as 'nonzero' });
  assert.equal(regula.ok, false);
  if (!regula.ok) assert.match(regula.motiv, /^intrare: regula/);
});

test('intrarea nu se modifică (înghețată adânc) și ieșirea e determinată', () => {
  const intrare = ingheata([cerc(0, 0, 10), cerc(12, 0, 10), [C(0, 0, 15, 15, 7.5, 22.5), C(0, 22.5, -7.5, 22.5, -15, 15)], drept(-3, -3, 6, 6)]);
  const a = reusit(intrare), b = reusit(intrare);
  assert.deepEqual(a.cai, b.cai);
  assert.deepEqual(a.info, b.info);
});

// ---------------------------------------------------------------- recenzia 2.7d (constatările 0–3, 7 și bugetul ușii)

/** Fiecare contur ieșit trece o singură dată prin fiecare vârf și se poate decala (offsetul refuză contururile care se taie). */
function contururiSimple(cai: readonly Cale[]): void {
  for (const c of cai) {
    assert.equal(new Set(c.map((v) => `${v.p.x},${v.p.y}`)).size, c.length, 'un contur trece de două ori prin același vârf');
    const o = offsetInchis({ inchis: true, varfuri: c }, 0.01);
    assert.ok(o.ok, `offsetul refuză un contur: ${o.ok ? '' : o.motiv}`);
  }
}

test('recenzia 2.7d #0: două încrucișări la ~6e-3 rad între o cubică plată și una aproape dreaptă nu se pierd; lentila cu w = 2 rămâne plină', () => {
  // Forma 1: sub cubica A (mânerele la 0,5); forma 2: deasupra cubicei B, aproape dreaptă la y = 0,315. Se taie la x ≈ 30 și 70.
  const c = 0.315;
  const f1 = [L(0, -20), L(100, -20), C(100, 0, 200 / 3, 0.5, 100 / 3, 0.5), L(0, 0)];
  for (const f2 of [
    [L(100, c), L(100, 20), L(0, 20), C(0, c, 100 / 3, c + 1e-4, 200 / 3, c + 1e-4)],
    [L(100, c), L(100, 20), L(0, 20), A(0, c, -1e-5)],
  ]) {
    const intrare = [f1, f2];
    const r = reusit(intrare);
    assert.equal(r.info.neschimbat, false, 'v1 întorcea intrarea: lentila devenea gol sub evenodd');
    assert.ok(r.info.intersectii >= 2);
    verificaForma(r.cai);
    for (const p of [{ x: 50, y: 0.34 }, { x: 40, y: 0.32 }, { x: 60, y: 0.32 }]) {
      assert.equal(infasurare(p, intrare), 2);
      assert.ok(plinEvenodd(p, r.cai), `(${p.x}, ${p.y}) gol`);
    }
    assert.equal(dezacorduri(intrare, r.cai, probeIn(intrare, 300, aleator(11)), 1e-3), 0);
  }
});

test('recenzia 2.7d #0, cazul natural: un blob și copia lui scalată anizotrop cu ~1,3 % (patru încrucișări sub unghiuri mici)', () => {
  // fuzz4.mjs al recenziei, sămânța 1, cazul 140 (rau4-1-140.json): v1 găsea 2 din 4 încrucișări.
  const rnd = aleator(1 * 104729 + 140);
  const n = 4 + Math.floor(rnd() * 7), pts: Array<readonly [number, number]> = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI + rnd() * 0.3, rr = 40 * (0.55 + 0.6 * rnd()); pts.push([50 + rr * Math.cos(a), 50 + rr * Math.sin(a)]); }
  const pk = (i: number): readonly [number, number] => pts[((i % n) + n) % n] as readonly [number, number];
  const blob: Varf[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pk(i - 1), pk(i), pk(i + 1), pk(i + 2)];
    blob.push(C(p1[0], p1[1], p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6));
  }
  const e = 0.001 + rnd() * 0.014, kx = 1 + e, ky = 1 - e * rnd(), sens = rnd() < 0.5 ? 1 : -1;
  const ox = 50 + (rnd() - 0.5) * 20, oy = 50 + (rnd() - 0.5) * 20, rot = (rnd() - 0.5) * 0.01, co = Math.cos(rot), si = Math.sin(rot);
  const f = (q: Punct): Punct => { const x = ox + (q.x - ox) * kx, y = oy + (q.y - oy) * ky; return { x: 50 + (x - 50) * co - (y - 50) * si, y: 50 + (x - 50) * si + (y - 50) * co }; };
  const copie = blob.map((v) => ({ p: f(v.p), s: v.s.tip === 'C' ? { tip: 'C' as const, c1: f(v.s.c1), c2: f(v.s.c2) } : v.s }));
  const intrare = [blob, sens > 0 ? copie : invers(copie)];
  const r = reusit(intrare);
  assert.ok(r.info.intersectii >= 4, `intersecții: ${r.info.intersectii}`);
  verificaForma(r.cai);
  assert.equal(plinEvenodd({ x: 42.5609, y: 8.5801 }, r.cai), plinNonzero({ x: 42.5609, y: 8.5801 }, intrare));
  assert.equal(dezacorduri(intrare, r.cai, probeIn(intrare, 400, aleator(12)), 5e-4), 0);
});

test('recenzia 2.7d #1: un „soare” de 150 de clepsidre (toate intersecțiile în centru) se contopește liniar; 300 se refuză repede', () => {
  const soare = (N: number): Varf[][] => Array.from({ length: N }, (_, i) => {
    const t = (i * Math.PI) / N, dl = Math.PI / (4 * N), P = [90 * Math.cos(t), 90 * Math.sin(t)] as const, Q = [90 * Math.cos(t + dl), 90 * Math.sin(t + dl)] as const;
    return [L(100 + P[0], 100 + P[1]), L(100 - P[0], 100 - P[1]), L(100 - Q[0], 100 - Q[1]), L(100 + Q[0], 100 + Q[1])];
  });
  let t0 = performance.now();
  const r = reusit(soare(150));
  assert.equal(r.info.neschimbat, true);
  assert.ok(r.info.lucru < PLAFON_LUCRU && performance.now() - t0 < 5000, `${performance.now() - t0} ms`);
  t0 = performance.now();
  const q = normalizeaza(soare(300));
  assert.equal(q.ok, false);
  if (!q.ok) assert.match(q.motiv, /^plafon: /);
  assert.ok(performance.now() - t0 < 8000, `${performance.now() - t0} ms până la refuz`);
});

test('recenzia 2.7d #2: o gaură tangentă sau care atinge exteriorul într-un vârf iese contur separat, simplu, decalabil, la orice scară', () => {
  const departe = (x: number): Varf[][] => [cerc(x, 0, 5), cerc(x, 0, 5)];
  for (const [R, r] of [[1000, 1], [50, 10], [3, 1], [5, 1], [500, 3], [20, 19]] as const) {
    const x = reusit([cerc(0, 0, R), cerc(R - r, 0, r, false), ...departe(-3 * R)]);
    assert.equal(x.cai.length, 3, `R=${R} r=${r}: ${x.cai.length} contururi`);
    contururiSimple(x.cai);
  }
  const romb = [L(5, 10), L(7, 8), L(5, 6), L(3, 8)];
  for (const patrat of [[L(0, 0), L(10, 0), L(10, 10), L(5, 10), L(0, 10)], drept(0, 0, 10, 10)]) {
    const intrare = [patrat, romb, ...departe(-100)];
    const x = reusit(intrare);
    assert.equal(x.cai.length, 3);
    contururiSimple(x.cai);
    assert.equal(dezacorduri(intrare, x.cai, probeIn(intrare, 300, aleator(13)), 1e-9), 0);
  }
  // Trei frontiere tangente în (10, 0): fără încrucișări în vârf (v1 lega exteriorul de insulă și tăia conturul găurii).
  const tripla = [cerc(0, 0, 10), cerc(9, 0, 1, false), cerc(9.5, 0, 0.5, false), ...departe(-30)];
  const t = reusit(tripla);
  assert.equal(t.cai.length, 4);
  contururiSimple(t.cai);
  assert.equal(dezacorduri(tripla, t.cai, probeIn(tripla, 300, aleator(14)), 1e-9), 0);
});

test('recenzia 2.7d #3: o lentilă de ~11τ între două curbe cu aceleași capete nu mai dispare (arce prin aranjament, cubice)', () => {
  // Arcele (0,0) → (100,0) cu bulge 0,3 + 2,2e-9 și înapoi cu −0,3: lentila de 1,1e-7 mm la x = 50. Pătratul de la capăt
  // trimite grupul la aranjament (singură, subcalea e o curbă simplă și calea rapidă exactă o întoarce neschimbată).
  const lentila = [A(0, 0, 0.3 + 2.2e-9), A(100, 0, -0.3)], q = { x: 50, y: -50 * (0.3 + 0.3 + 2.2e-9) / 2 };
  const intrare = [lentila, drept(-1, -1, 1.5, 2)];
  const r = reusit(intrare);
  assert.equal(r.info.neschimbat, false);
  assert.ok(r.info.tau > 0 && 1.1e-7 > 8 * r.info.tau, `τ = ${r.info.tau}`);
  assert.ok(plinNonzero(q, intrare) && plinEvenodd(q, r.cai), 'lentila a dispărut');
  assert.equal(reusit([lentila]).info.tau, 0, 'singură, subcalea trece pe calea rapidă exactă');
  // Cubicele cu aceleași capete, mânerele mutate cu 12τ: lentila iese.
  const d = 12 * 1.0112e-8, cc = [[C(0, 0, 30, 20, 70, 20), C(100, 0, 70, 20 + d, 30, 20 + d)]], q2 = { x: 50, y: 15 + (0.75 * d) / 2 };
  const r2 = reusit(cc);
  assert.equal(r2.cai.length, 1);
  assert.ok(plinNonzero(q2, cc) && plinEvenodd(q2, r2.cai), 'lentila cubicelor a dispărut');
});

test('recenzia 2.7d #7: calea rapidă exactă (curbe simple, disjuncte) întoarce intrarea fără aranjament, și la text', () => {
  // O „glifă”: un inel de 16 cubice (trigonometric) cu o contra-formă de 12 cubice (orar), plus o bară separată.
  const inel = (cx: number, cy: number, r: number, m: number, trig: boolean): Varf[] => {
    const pts = Array.from({ length: m }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / m), cy + 1.1 * r * Math.sin((2 * Math.PI * i) / m)] as const);
    const mij = (i: number): readonly [number, number] => { const p = pts[i % m] as readonly [number, number], q = pts[(i + 1) % m] as readonly [number, number]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    const v: Varf[] = [];
    for (let i = 0; i < m; i++) {
      const a = mij(i), c = pts[(i + 1) % m] as readonly [number, number], b = mij(i + 1);
      v.push(C(a[0], a[1], a[0] + (2 / 3) * (c[0] - a[0]), a[1] + (2 / 3) * (c[1] - a[1]), b[0] + (2 / 3) * (c[0] - b[0]), b[1] + (2 / 3) * (c[1] - b[1])));
    }
    return trig ? v : invers(v);
  };
  const glifa = [inel(0, 0, 2, 16, true), inel(0, 0, 1.2, 12, false), drept(3, -2, 0.6, 4)];
  const r = reusit(glifa);
  assert.equal(r.cai, glifa);
  assert.equal(r.info.tau, 0, 'niciun grup n-a trecut prin aranjament');
  assert.ok(r.info.lucru < 2000, `lucru ${r.info.lucru}`);
  // O placă cu 2 500 de găuri (orare): un singur grup, neschimbat pe calea rapidă, cu incluziunile găsite prin măturare.
  const placa = [drept(0, 0, 1000, 1000), ...Array.from({ length: 2500 }, (_, i) => cerc(10 + 20 * (i % 50), 10 + 20 * Math.floor(i / 50), 5, false))];
  const pl = reusit(placa);
  assert.equal(pl.cai, placa);
  assert.equal(pl.info.grupuri, 1);
  assert.equal(pl.info.tau, 0);
  assert.ok(pl.info.lucru < 500_000, `lucru ${pl.info.lucru}`);
  // Aceeași placă cu găurile în același sens cu marginea (înfășurarea 2 în ele): nu se poate dovedi, merge la aranjament.
  const placa2 = [drept(0, 0, 1000, 1000), ...Array.from({ length: 100 }, (_, i) => cerc(10 + 20 * (i % 10), 10 + 20 * Math.floor(i / 10), 5))];
  const p2 = reusit(placa2);
  assert.equal(p2.cai.length, 1);
  assert.ok(p2.info.tau > 0);
  // Un poligon fin de 45 000 de vârfuri: neschimbat, liniar.
  const fin = [Array.from({ length: 45_000 }, (_, i) => L(500 + 400 * Math.cos((2 * Math.PI * i) / 45_000), 500 + 400 * Math.sin((2 * Math.PI * i) / 45_000)))];
  const f = reusit(fin);
  assert.equal(f.cai, fin);
  assert.ok(f.info.lucru < 1_000_000, `lucru ${f.info.lucru}`);
  // Ce nu se poate dovedi merge la aranjament: imbricate în același sens (w = 2), un poligon care se atinge într-un vârf.
  const imbricate = [cerc(0, 0, 10), cerc(0, 0, 5)];
  const i = reusit(imbricate);
  assert.equal(i.cai.length, 1);
  assert.ok(i.info.tau > 0);
  const atins = [[L(0, 0), L(10, 0), L(5, 5), L(10, 10), L(0, 10), L(5, 5)]];
  const a = reusit(atins);
  assert.ok(a.info.tau > 0);
  assert.equal(dezacorduri(atins, a.cai, probeIn(atins, 300, aleator(15)), 1e-9), 0);
  // Trei segmente, toate vecine, dar arcul se întoarce peste linie: o buclă cu w = 2. Doar conurile din vârfuri o opresc.
  const bucla = [[L(0, 0), A(10, 0, 3.5), A(13, -9, 1)]], q = { x: 8.79232, y: 0.6767488 };
  const b = reusit(bucla);
  assert.equal(infasurare(q, bucla), 2);
  assert.ok(b.info.tau > 0, 'bucla a trecut pe calea rapidă');
  assert.ok(plinEvenodd(q, b.cai));
  assert.equal(dezacorduri(bucla, b.cai, probeIn(bucla, 400, aleator(16)), 1e-9), 0);
});

test('recenzia 2.7d #7: în ieșirea normalizată, un grup simplu (pe calea rapidă) iese cu plinul în stânga, vârfurile bit cu bit', () => {
  const patratOrar = drept(100, 0, 10, 10, false);
  const r = reusit([patratOrar, cerc(0, 0, 10), cerc(12, 0, 10)]);
  assert.equal(r.cai.length, 2);
  const p = r.cai[0] as Cale;
  assert.ok(arie([p]) > 0, 'exteriorul a ieșit orar');
  assert.ok(p.every((v) => patratOrar.some((q) => q.p === v.p)), 'vârfurile pătratului nu sunt chiar ale intrării');
});

test('bugetul importului: comun mai multor apeluri, scăzut și de cele refuzate; terminat, refuză imediat cu „plafon”', () => {
  const buget: BugetImport = { ramas: 1_000_000 };
  const a = reusit([cerc(0, 0, 10), cerc(12, 0, 10)], { buget });
  assert.equal(buget.ramas, 1_000_000 - a.info.lucru);
  const inainte = buget.ramas;
  const b = normalizeaza([drept(0, 0, 20_000, 10), drept(5, 5, 1, 1)], { buget });
  assert.equal(b.ok, false);
  assert.ok(buget.ramas < inainte, 'un apel refuzat a lucrat și el');
  const mic: BugetImport = { ramas: 50 };
  const c = normalizeaza([cerc(0, 0, 10), cerc(12, 0, 10)], { buget: mic });
  assert.equal(c.ok, false);
  if (!c.ok) assert.equal(c.motiv, 'plafon: bugetul de lucru al importului s-a terminat');
  const d = normalizeaza([drept(0, 0, 1, 1)], { buget: mic });
  assert.equal(d.ok, false);
  if (!d.ok) assert.match(d.motiv, /^plafon: bugetul/);
  for (const rau of [null, {}, { ramas: 'mult' }, { ramas: Number.NaN }]) {
    const e = normalizeaza([drept(0, 0, 1, 1)], { buget: rau as unknown as BugetImport });
    assert.equal(e.ok, false);
    if (!e.ok) assert.match(e.motiv, /^intrare: bugetul/);
  }
});

// ---------------------------------------------------------------- otrăvurile 2.7d (13.10): goluri închise cu teste

test('otrava 2.7d: un grup simplu pe un desen de 20 m (τ peste toleranța importului) trece pe calea rapidă, neschimbat', () => {
  // τ = 1e-10 · 28 284 + 64 ulp ≈ 2,8e-6 mm > 1e-6: aranjamentul ar refuza („toleranta”), dar calea rapidă nu folosește τ.
  const intrare = [drept(0, 0, 20_000, 20_000)];
  const r = reusit(intrare);
  assert.equal(r.info.neschimbat, true);
  assert.equal(r.cai, intrare);
});

test('otrava 2.7d: un arc-sursă întreg, întors în ieșire, are exact −bulge, bit cu bit (ADR 0036 §5)', () => {
  // Un cerc din 4 arce, orar; două, suprapuse doar pe o parte: arcele din partea îndepărtată rămân întregi, iar ieșirea
  // (plinul în stânga) le întoarce. Bulge-urile sunt alese ca tan(atan(b)) ≠ b în double (0,3077, 0,4084, 0,4445): un
  // bulge recalculat din baleiaj ar ieși la 1 ulp de −b (otrava „arcul întreg întors cu bulge recalculat” trecea pe
  // 100° / 120° / 80° / 60°, unde drumul dus-întors e exact).
  const bulge = [0.3077, 0.4084, 0.4445];
  const rest = 2 * Math.PI - bulge.reduce((s, b) => s + 4 * Math.atan(b), 0);
  const toate = [...bulge, Math.tan(rest / 4)];
  const cerc4 = (cx: number, cy: number, r: number): Varf[] => {
    let u = 0;
    return toate.map((b) => {
      const v = A(cx + r * Math.cos(u), cy + r * Math.sin(u), b);
      u += 4 * Math.atan(b);
      return v;
    });
  };
  const a = invers(cerc4(0, 0, 10));
  const b = invers(cerc4(17, 0, 10));
  const r = reusit([a, b]);
  assert.equal(r.info.neschimbat, false);
  const surse = [a, b].flatMap((c) => c.map((v, i) => ({ v, urm: (c[(i + 1) % c.length] as Varf).p })));
  let intoarse = 0;
  for (const c of r.cai) {
    c.forEach((v, i) => {
      if (v.s.tip !== 'A') return;
      const capat = (c[(i + 1) % c.length] as Varf).p;
      const sursa = surse.find((x) => x.v.s.tip === 'A' && x.urm.x === v.p.x && x.urm.y === v.p.y && x.v.p.x === capat.x && x.v.p.y === capat.y);
      if (!sursa || sursa.v.s.tip !== 'A') return;
      intoarse++;
      assert.ok(Object.is(v.s.bulge, -sursa.v.s.bulge), `${v.s.bulge} ≠ −${sursa.v.s.bulge}`);
    });
  }
  assert.ok(intoarse >= 2, `doar ${intoarse} arce întregi întoarse`);
});

test('otrava 2.7d: o cubică cu buclă (în același sens ca restul căii, înfășurarea 2) nu e simplă pe calea rapidă', () => {
  // Latura de jos a unui hexagon e o cubică ce se încolăcește în sus, în interior: bucla e parcursă trigonometric, ca
  // hexagonul, deci înfășurarea în ea e 2 (plină sub nonzero, gaură sub evenodd). Laturile vecine pleacă din capete la
  // 60° și 120°, în afara conurilor cubicei ([0°, 108°] și [72°, 180°]), iar celelalte perechi au cutiile disjuncte: doar
  // hodograful cubicei o trimite la aranjament (cu un pătrat, conul din capăt o trimitea oricum).
  const r = reusit([[C(0, 0, 30, 30, -10, 30), L(20, 0), L(35, 26), L(35, 60), L(-15, 60), L(-15, 26)]]);
  assert.equal(r.info.neschimbat, false);
  assert.equal(r.info.intersectii, 1);
  // Ieșirea e un singur contur, fără buclă: bucla se contopește în regiune.
  assert.equal(r.cai.length, 1);
});

test('otrava 2.7d: incluziunea de pe calea rapidă numără raza pe bucăți monotone pe y (arcul monoton pe x, cu capetele sub rază)', () => {
  // Arcul de sus al exteriorului merge de la dreapta la stânga, monoton pe x, cu vârful la y ≈ 32,5 și capetele la y = 10;
  // tangenta lui se rotește 143°, deci trece de testul hodografului. Raza din (18, 20) îl taie o singură dată, în dreapta.
  // Pe bucăți monotone pe x (o singură bucată, capetele sub rază), traversarea se pierdea: pătratul interior, în același
  // sens, părea afară, iar calea rapidă îl lăsa gaură (sub nonzero e plin).
  const ext = [L(0, 0), L(40, 0), C(40, 10, 28, 40, 12, 40), L(0, 10)];
  const int = [L(18, 20), L(22, 20), L(22, 24), L(18, 24)];
  const r = reusit([ext, int]);
  assert.equal(r.info.neschimbat, false);
  assert.equal(r.cai.length, 1);
});
