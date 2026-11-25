/**
 * Cama din atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe plasele reale ale motorului:
 * - un disc pe ax a cărui margine stă la o distanță de ax care se schimbă în timpul rotației: de la raza de bază
 *   (jumătate din diametrul cerut) la raza de bază plus cursa; un tachet sprijinit pe ea urcă și coboară cu cursa;
 * - trei forme: excentricul (un cerc cu axul mutat din mijloc cu jumătate din cursă), para (cercul de bază și un nas
 *   rotund, legate prin tangente) și melcul (raza crește liniar pe o tură întreagă, apoi cade);
 * - **raza se judecă pe plasă**, din 5 în 5 grade, față de formula de pe hârtie a fiecărei forme;
 * - gaura de ax sau de știft, prin grosimea camei; prinderile ei; marginile parametrilor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, dinMotor, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Cote = { forma: string; diam: number; cursa: number; grosime: number; razaMica: number; razaMare: number };
const Lc = L as typeof L & { camaCote(d: Record<string, unknown>): Cote; prinderi(d: Record<string, unknown>): { fel: string; p: number[]; d: number[]; lung: number }[] };
const cama = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'cama', ...d });
const E = L.efective();
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};

/** Raza de pe hârtie a camei, la unghiul u (de la brațul ei cel mai lung, în sens trigonometric). */
function hartie(forma: string, R0: number, c: number, u: number): number {
  if (forma === 'melc') { const t = ((u % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return R0 + c * t / (2 * Math.PI); }
  if (forma === 'excentric') { const e = c / 2, R = R0 + e; return e * Math.cos(u) + Math.sqrt(R * R - e * e * Math.sin(u) ** 2); }
  // para: înfășurătoarea convexă a cercului de bază și a nasului (raza rn, cu vârful la R0 + c): un punct e în ea dacă,
  // pentru un s din [0, 1], e la cel mult R0 + s·(rn − R0) de punctul s al segmentului dintre centre
  const rn = Math.max(2, R0 / 2), dn = R0 + c - rn;
  const inauntru = (r: number) => {
    const x = r * Math.cos(u), y = r * Math.sin(u);
    for (let k = 0; k <= 400; k++) { const s = k / 400; if (Math.hypot(x - s * dn, y) <= R0 + s * (rn - R0) + 1e-12) return true; }
    return false;
  };
  let a = R0 - 0.01, b = R0 + c + 0.01;
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (inauntru(m)) a = m; else b = m; }
  return a;
}
/** Raza camei măsurată pe plasă, la unghiul u și la înălțimea z: ultimul punct de lemn de pe raza care pleacă din ax. */
function masurata(p: Piesa, u: number, z: number, maxim: number): number {
  const la = (r: number) => plin(p, dinMotor(p, [r * Math.cos(u), r * Math.sin(u), z] as P3));
  let a = 4, b = maxim + 1;
  assert.equal(la(a), true, 'lângă gaură e lemn'); assert.equal(la(b), false, 'dincolo de camă e gol');
  for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (la(m)) a = m; else b = m; }
  return a;
}

test('motorul știe piesa, iar cea implicită e excentricul Ø16 cu cursa de 8 mm: un disc de 24, gros de 7,8, cu gaură de ax', () => {
  assert.ok(L.tipuri.includes('cama'));
  const p = cama(), q = Lc.camaCote({});
  assert.deepEqual([q.forma, q.diam, q.cursa, q.grosime, q.razaMica, q.razaMare], ['excentric', 16, 8, 7.8, 8, 16]);
  // discul are raza 8 + 4 = 12 și e mutat cu 4 mm: de la −8 la +16 pe x, ±12 pe y
  assert.deepEqual(cote(p), [24, 24, 7.8]);
  assert.deepEqual(Array.from(p.baza, r3), [-8, -12, 0]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicită');
  assert.equal(amprentaPlasei(cama({ forma: 'excentric', diam: 16, cursa: 8, grosime: 7.8, gaura: 'x' })), amprentaPlasei(p));
});

test('raza, pe plasă: din 5 în 5 grade, cea de pe hârtie a fiecărei forme; cursa e diferența dintre cea mai mare și cea mai mică', () => {
  let n = 0;
  for (const forma of ['excentric', 'para', 'melc']) for (const [diam, cursa] of [[16, 8], [10, 1], [24, 12], [40, 24], [64, 5]] as const) {
    const p = cama({ forma, diam, cursa }), q = Lc.camaCote({ forma, diam, cursa }), R0 = diam / 2, ce = `${forma} Ø${diam} cursa ${cursa}`;
    inchisa(p, ce);
    assert.deepEqual([q.razaMica, q.razaMare], [R0, R0 + cursa], ce);
    let mic = Infinity, mare = 0;
    for (let g = 0; g < 360; g += 5) {
      // la melc, chiar pe treaptă (0°) raza sare de la mare la mică: se măsoară la jumătate de grad de ea
      const u = (forma === 'melc' && g === 0 ? 0.5 : g) * Math.PI / 180, r = masurata(p, u, 3.9, R0 + cursa), h = hartie(forma, R0, cursa, u);
      assert.ok(Math.abs(r - h) < 0.06, `${ce}: la ${g}°, raza ${r.toFixed(3)} (pe hârtie ${h.toFixed(3)})`);
      mic = Math.min(mic, r); mare = Math.max(mare, r); n++;
    }
    assert.ok(Math.abs(mic - R0) < 0.06, `${ce}: raza cea mai mică e raza de bază (${mic.toFixed(3)})`);
    // melcul își atinge vârful chiar înaintea treptei (la 359,5°)
    if (forma === 'melc') mare = Math.max(mare, masurata(p, 359.5 * Math.PI / 180, 3.9, R0 + cursa));
    assert.ok(Math.abs(mare - (R0 + cursa)) < (forma === 'melc' ? 0.06 + cursa / 720 : 0.06), `${ce}: raza cea mai mare e baza plus cursa (${mare.toFixed(3)})`);
  }
  assert.equal(n, 3 * 5 * 72);
});

test('forma: excentricul e un cerc; para stă pe cercul de bază mai mult de jumătate de tură; melcul urcă liniar și cade o dată', () => {
  const R0 = 8, c = 8, u = (g: number) => g * Math.PI / 180;
  const ex = cama({ forma: 'excentric' }), pa = cama({ forma: 'para' }), me = cama({ forma: 'melc' });
  // excentricul: toate punctele marginii sunt la 12 mm de mijlocul discului (4, 0)
  for (let g = 0; g < 360; g += 15) {
    const r = masurata(ex, u(g), 3.9, 16), x = r * Math.cos(u(g)) - 4, y = r * Math.sin(u(g));
    assert.ok(Math.abs(Math.hypot(x, y) - 12) < 0.06, `excentric: la ${g}°, la ${Math.hypot(x, y).toFixed(3)} de mijloc`);
  }
  // para: de la 90° la 270° (și puțin peste), raza e chiar cea de bază; nasul e doar spre 0°
  for (let g = 80; g <= 280; g += 10) assert.ok(Math.abs(masurata(pa, u(g), 3.9, 16) - R0) < 0.06, `para: la ${g}° e pe cercul de bază`);
  assert.ok(Math.abs(masurata(pa, 0, 3.9, 16) - (R0 + c)) < 0.06, 'para: vârful nasului');
  assert.ok(masurata(pa, u(40), 3.9, 16) > R0 + 0.5, 'para: flancul nasului e peste cercul de bază');
  // melcul: pas egal de rază la pas egal de unghi; treapta e între 359,5° și 0,5°
  const m90 = masurata(me, u(90), 3.9, 16), m180 = masurata(me, u(180), 3.9, 16), m270 = masurata(me, u(270), 3.9, 16);
  assert.ok(Math.abs(m180 - m90 - 2) < 0.08 && Math.abs(m270 - m180 - 2) < 0.08, `melcul urcă 2 mm la fiecare sfert de tură (${m90.toFixed(2)}, ${m180.toFixed(2)}, ${m270.toFixed(2)})`);
  assert.ok(masurata(me, u(359.5), 3.9, 16) - masurata(me, u(0.5), 3.9, 16) > c - 0.2, 'melcul cade cu cursa, o dată pe tură');
  // capetele perei sunt chiar vârfuri ale conturului: de la −8 (spatele cercului de bază) la +16 (vârful nasului)
  assert.deepEqual([cote(pa)[0], r3(pa.baza[0]!)], [24, -8]);
  assert.deepEqual([cote(cama({ forma: 'para', diam: 20, cursa: 10 }))[0], cote(cama({ forma: 'para', diam: 33, cursa: 7 }))[0]], [30, 40]);
  // la fel pe toată grosimea (marginea e dreaptă, nu teșită)
  for (const z of [0.2, 3.9, 7.6]) assert.ok(Math.abs(masurata(me, u(200), z, 16) - hartie('melc', R0, c, u(200))) < 0.06, `melcul, la z ${z}`);
});

test('gaura: de ax (crucea) sau rotundă, pe ax, prin toată grosimea; prinderile ei', () => {
  for (const forma of ['excentric', 'para', 'melc']) for (const [gaura, fel] of [['x', 'gauraAx'], ['r', 'gauraStift']] as const) for (const grosime of [3.8, 7.8]) {
    const p = cama({ forma, gaura, grosime }), ce = `${forma} ${gaura} ${grosime}`, ax = (x: number, y: number, z: number) => dinMotor(p, [x, y, z] as P3);
    inchisa(p, ce);
    assert.equal(r3(p.dim[2]!), grosime, ce);
    for (const z of [0.2, grosime / 2, grosime - 0.2]) {
      assert.equal(plin(p, ax(0, 0, z)), false, `${ce}: axa e goală la z ${z}`);
      // pe brațele crucii e gol până la 2,4; pe diagonală, la 2,2, e lemn la cruce și gol la gaura rotundă
      assert.equal(plin(p, ax(E.axGauraD! / 2 - 0.1, 0, z)), false, `${ce}: brațul / raza găurii`);
      assert.equal(plin(p, ax(1.6, 1.6, z)), gaura === 'x', `${ce}: diagonala`);
      assert.equal(plin(p, ax(E.gauraD! / 2 + 0.3, 0.3, z)), true, `${ce}: peretele găurii`);
    }
    const pr = Array.from(Lc.prinderi({ tip: 'cama', forma, gaura, grosime }), (c) => [c.fel, Array.from(c.p, r3), Array.from(c.d), r3(c.lung)]);
    const o = [r3(-p.baza[0]!), r3(-p.baza[1]!)];
    assert.deepEqual(pr, [[fel, [...o, grosime], [0, 0, 1], grosime], [fel, [...o, 0], [0, 0, -1], grosime]], ce);
  }
});

test('marginile: diametrul 10–64, cursa 1–24, grosimea 1–20; ce iese din ele e adus înapoi și spus; forma necunoscută e excentricul', () => {
  const q = (d: Record<string, unknown>) => { const c = Lc.camaCote(d); return [c.forma, c.diam, c.cursa, c.grosime]; };
  assert.deepEqual(q({ diam: 5 }), ['excentric', 10, 8, 7.8]);
  assert.deepEqual(q({ diam: 100, cursa: 0.2, grosime: 30 }), ['excentric', 64, 1, 20]);
  assert.deepEqual(q({ diam: '24', cursa: '6,5', grosime: 0.4 }), ['excentric', 24, 8, 1]);
  assert.deepEqual(q({ diam: 20.26, cursa: 40, forma: 'altceva' }), ['excentric', 20.3, 24, 7.8]);
  assert.deepEqual(q({ diam: null, cursa: '', grosime: true }), ['excentric', 16, 8, 7.8]);
  assert.deepEqual(q({ forma: 'para' })[0], 'para');
  assert.deepEqual(q({ forma: 'melc' })[0], 'melc');
  // în margini, nimic de spus; în afara lor, câte un avertisment pe câmp
  assert.equal(cama({ diam: 10, cursa: 1, grosime: 1 }).avert.length, 0);
  assert.equal(cama({ diam: 64, cursa: 24, grosime: 20 }).avert.length, 0);
  assert.equal(cama({ diam: 5 }).avert.length, 1);
  assert.equal(cama({ diam: 100, cursa: 30 }).avert.length, 2);
  assert.match(cama({ diam: 5 }).avert[0]!, /10/);
  assert.equal(amprentaPlasei(cama({ diam: 5 })), amprentaPlasei(cama({ diam: 10 })));
  // gaura necunoscută e cea de ax
  assert.equal(amprentaPlasei(cama({ gaura: 'altceva' })), amprentaPlasei(cama({ gaura: 'x' })));
  assert.notEqual(amprentaPlasei(cama({ gaura: 'r' })), amprentaPlasei(cama({ gaura: 'x' })));
});

test('peretele dintre gaură și margine: cel puțin 1,6 mm la cea mai mică camă, pe orice formă', () => {
  for (const forma of ['excentric', 'para', 'melc']) {
    const p = cama({ forma, diam: 10, cursa: 1 }), colt = Math.hypot(E.axGauraD! / 2, E.axGauraLat! / 2);
    for (let g = 0; g < 360; g += 5) {
      const r = masurata(p, (g + 0.5) * Math.PI / 180, 3.9, 6);
      assert.ok(r - colt >= 1.6, `${forma}: la ${g}°, peretele are ${(r - colt).toFixed(2)} mm`);
    }
  }
});
