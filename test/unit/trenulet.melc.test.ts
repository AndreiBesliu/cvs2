/**
 * Șurubul melc din atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe plasele reale ale motorului:
 * - un cilindru pe ax, cu o spiră cu profilul cremalierei de referință a roților de aici (20°, capul m, piciorul 1,25·m,
 *   pasul π·m): în planul de mijloc al roții, spira e chiar cremaliera cu care motorul taie roțile, deci se prind;
 * - diametrul de divizare e 8 mm (ca la LEGO: axul roții la 4 + z / 2 mm) sau 16 mm (gros: 8 + z / 2 mm);
 * - **spira se judecă pe plasă**, față de profilul de pe hârtie, la mai multe raze, unghiuri și înălțimi (deci și sensul ei);
 * - **angrenarea, pe plase:** roata motorului, cu axul unde spune montajul, nu intră în melc la nicio fază, are jocul de
 *   pe hârtie și intră în el cu o jumătate de pas alături (spira e înclinată, dinții roții sunt drepți: spira e subțiată
 *   cât îi mănâncă înclinarea din joc).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, dinMotor, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Cote = { diam: number; lung: number; lungime: number; pas: number; spire: number; unghi: number; varf: number; fund: number; perete: number; subtiere: number; grosime: number };
type Montaj = { dinti: number; distanta: number; grila: string; raport: number };
const Lm = L as typeof L & {
  seteaza(s?: Record<string, unknown> | null): void;
  melcCote(d: Record<string, unknown>): Cote; melcMontaj(d: Record<string, unknown>, z: unknown): Montaj;
  prinderi(d: Record<string, unknown>): { fel: string; p: number[]; d: number[]; lung: number }[];
};
const melc = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'melc', ...d });
/** Cu alte valori de la calibrare (apoi, cele din fabrică). */
const cu = <T>(s: Record<string, unknown>, f: () => T): T => { Lm.seteaza(s); try { return f(); } finally { Lm.seteaza({}); } };
const E = L.efective();
const JOC = E.jocDinti!, TAN = Math.tan(20 * Math.PI / 180), PAS = Math.PI;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
/** Cotele de pe hârtie: razele, lungimea, subțierea spirei (0,1 mm la Ø8, 0,05 la Ø16) și jumătatea grosimii ei la raza r. */
function hartie(diam: number, lung: number, joc = JOC) {
  const rw = diam / 2, sub = 0.1 * 4 / rw, t = PAS / 2 - 2 * (joc + sub);
  return { rw, ra: rw + 1, rf: rw - 1.25, Lz: 8 * lung - 0.2, sub, t, T: (r: number) => t / 2 - (r - rw) * TAN };
}
/** În lemn sau în gol, la raza r și unghiul fi din jurul axului, la înălțimea w. */
const la = (p: Piesa, r: number, fi: number, w: number) => plin(p, dinMotor(p, [r * Math.cos(fi), r * Math.sin(fi), w] as P3));
/** Cât e punctul (unghiul fi, înălțimea w) de mijlocul celei mai apropiate spire, pe ax: spira urcă spre dreapta. */
const deSpira = (fi: number, w: number) => { const s = w - PAS * fi / (2 * Math.PI); return s - PAS * Math.round(s / PAS); };

test('motorul știe piesa, iar cea implicită e melcul Ø8 de 2 știfturi: Ø10 la vârf, 15,8 lung, cu pasul roților', () => {
  assert.ok(L.tipuri.includes('melc'));
  const p = melc(), q = Lm.melcCote({});
  assert.deepEqual(cote(p), [10, 10, 15.8]);
  assert.deepEqual(Array.from(p.baza, r3), [-5, -5, 0]);
  assert.deepEqual([q.diam, q.lung, q.lungime, r3(q.pas), r3(q.spire), r3(q.unghi), q.varf, q.fund, q.subtiere], [8, 2, 15.8, 3.142, r3(15.8 / Math.PI), r3(Math.atan(1 / 8) * 180 / Math.PI), 10, 5.5, 0.1]);
  // spira, pe linia de divizare: jumătate de pas fără jocul ei și al subțierii
  assert.equal(r3(q.grosime), r3(Math.PI / 2 - 2 * (JOC + 0.1)));
  // între colțul crucii și fundul spirei rămâne puțin: 2,75 − √(2,5² + 1²)
  assert.equal(r3(q.perete), r3(2.75 - Math.hypot(E.axGauraD! / 2, E.axGauraLat! / 2)));
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit');
  assert.equal(amprentaPlasei(melc({ diam: 8, lung: 2 })), amprentaPlasei(p));
});

test('corpul e închis și are cotele de pe hârtie, la amândouă diametrele și la toate lungimile', () => {
  for (const diam of [8, 16]) for (const lung of [1, 2, 3, 4]) {
    const p = melc({ diam, lung }), h = hartie(diam, lung), q = Lm.melcCote({ diam, lung }), ce = `Ø${diam}, ${lung} știfturi`;
    inchisa(p, ce);
    assert.deepEqual(cote(p), [2 * h.ra, 2 * h.ra, r3(h.Lz)], ce);
    assert.deepEqual([q.varf, q.fund, q.lungime, r3(q.subtiere), r3(q.spire)], [2 * h.ra, 2 * h.rf, r3(h.Lz), r3(h.sub), r3(h.Lz / PAS)], ce);
    assert.equal(p.avert.length, 0, ce);
  }
  assert.deepEqual([r3(Lm.melcCote({ diam: 16 }).unghi), Lm.melcCote({ diam: 16 }).subtiere, r3(Lm.melcCote({ diam: 16 }).perete)], [r3(Math.atan(1 / 16) * 180 / Math.PI), 0.05, r3(6.75 - Math.hypot(E.axGauraD! / 2, E.axGauraLat! / 2))]);
});

test('spira, pe plasă: profilul de pe hârtie, la trei raze, opt unghiuri și trei înălțimi; urcă spre dreapta', () => {
  for (const diam of [8, 16]) {
    const p = melc({ diam, lung: 2 }), h = hartie(diam, 2), ce = `Ø${diam}`;
    for (const r of [h.rf + 0.3, h.rw, h.ra - 0.15]) for (let k = 0; k < 8; k++) for (const w0 of [3, 7.9, 12.5]) {
      const fi = 2 * Math.PI * (k + 0.37) / 8, T = h.T(r);
      // mijlocul spirei celei mai apropiate de w0, la unghiul ăsta
      const wc = w0 - deSpira(fi, w0);
      assert.equal(la(p, r, fi, wc), true, `${ce}: mijlocul spirei, raza ${r.toFixed(2)}, unghiul ${k}, w ${wc.toFixed(2)}`);
      for (const s of [-1, 1]) {
        assert.equal(la(p, r, fi, wc + s * (T - 0.07)), true, `${ce}: în spiră, la 0,07 de flanc (${s}), raza ${r.toFixed(2)}, unghiul ${k}`);
        assert.equal(la(p, r, fi, wc + s * (T + 0.07)), false, `${ce}: în gol, la 0,07 de flanc (${s}), raza ${r.toFixed(2)}, unghiul ${k}`);
      }
      // golul dintre spire, la jumătate de pas
      assert.equal(la(p, r, fi, wc + PAS / 2), false, `${ce}: golul dintre spire, raza ${r.toFixed(2)}, unghiul ${k}`);
    }
    // miezul e plin sub fundul spirei (între brațele crucii), iar dincolo de vârf nu e nimic
    for (let k = 0; k < 8; k++) for (const w of [0.3, 7.9, h.Lz - 0.3]) {
      const fi = Math.PI / 4 + Math.PI / 2 * k + 0.2;
      assert.equal(la(p, h.rf - 0.05, fi, w), true, `${ce}: miezul, unghiul ${k}, w ${w}`);
      assert.equal(la(p, h.ra + 0.05, fi, w), false, `${ce}: dincolo de vârf, unghiul ${k}, w ${w}`);
    }
    // capetele sunt drepte: nimic sub masă și nimic peste lungime
    assert.equal(la(p, h.rf - 0.5, 0.8, -0.1), false, `${ce}: sub masă`);
    assert.equal(la(p, h.rf - 0.5, 0.8, h.Lz + 0.1), false, `${ce}: peste capăt`);
  }
});

test('gaura de ax: crucea din calibrare, prin toată lungimea; prinderile ei', () => {
  for (const [diam, lung] of [[8, 2], [16, 1], [8, 4]] as const) {
    const p = melc({ diam, lung }), h = hartie(diam, lung), ce = `Ø${diam}, ${lung}`, ax = (x: number, y: number, z: number) => plin(p, dinMotor(p, [x, y, z] as P3));
    for (const z of [0.3, h.Lz / 2, h.Lz - 0.3]) {
      assert.equal(ax(0, 0, z), false, `${ce}: axa, la z ${z}`);
      for (const [x, y] of [[E.axGauraD! / 2 - 0.1, 0], [-(E.axGauraD! / 2 - 0.1), 0], [0, E.axGauraD! / 2 - 0.1], [0, -(E.axGauraD! / 2 - 0.1)]] as const) assert.equal(ax(x, y, z), false, `${ce}: brațul crucii, la ${x}, ${y}, z ${z}`);
      // pe diagonală, între brațe, e lemn (nu o gaură rotundă)
      assert.equal(ax(1.6, 1.6, z), true, `${ce}: diagonala, la z ${z}`);
    }
    const pr = Array.from(Lm.prinderi({ tip: 'melc', diam, lung }), (c) => [c.fel, Array.from(c.p, r3), Array.from(c.d), r3(c.lung)]);
    assert.deepEqual(pr, [['gauraAx', [h.ra, h.ra, r3(h.Lz)], [0, 0, 1], r3(h.Lz)], ['gauraAx', [h.ra, h.ra, 0], [0, 0, -1], r3(h.Lz)]], ce);
  }
});

/** Roata motorului și punctele conturului ei (fața de jos), față de axul ei. */
function roataCuContur(z: number, b: number) {
  const roata = L.construieste({ tip: 'rotita', dinti: z, grosime: b, gaura: 'nu' }), c: [number, number] = [-roata.baza[0]!, -roata.baza[1]!];
  const vazute = new Set<string>(), pt: [number, number][] = [], rf = z / 2 - 1.25;
  for (const t of roata.tri) for (const q of t) {
    if (Math.abs(q[2]) > 1e-9) continue;
    const x = q[0] - c[0], y = q[1] - c[1], k = x.toFixed(5) + ',' + y.toFixed(5);
    if (vazute.has(k) || Math.hypot(x, y) < rf - 0.05) continue;
    vazute.add(k); pt.push([x, y]);
  }
  return { roata, c, pt, rg: z / 2 };
}
/**
 * Cât intră roata în melc (și invers): numărul de puncte ale uneia găsite în cealaltă. Roata stă cu axul pe Z, în origine,
 * cu planul de mijloc la z = b / 2; axul melcului e paralel cu Y, la distanța `a` de axul roții, în planul de mijloc al
 * roții. `y0`: unde cade pe axul melcului planul axului roții (faza); `decalaj`: cât e mutată roata, pe linia de divizare,
 * față de locul în care golul ei stă pe mijlocul spirei.
 */
function patrundere(m: Piesa, h: ReturnType<typeof hartie>, g: ReturnType<typeof roataCuContur>, b: number, a: number, y0: number, decalaj = 0): number {
  // mijlocul spirei dinspre roată (unghiul π în jurul axului melcului) cel mai aproape de y0
  const wc = y0 - deSpira(Math.PI, y0), psi = (wc - y0 + decalaj) / g.rg - Math.PI / (2 * g.rg), co = Math.cos(psi), si = Math.sin(psi);
  let n = 0;
  // punctele roții (conturul, pe 7 înălțimi), în melc: lumea (x, y, z) → melcul (u, v, w) = (x − a, z − b / 2, y + y0)
  for (const [gx, gy] of g.pt) {
    const x = gx * co - gy * si, y = gx * si + gy * co;
    if (x < g.rg - 2) continue;
    for (let k = 0; k <= 6; k++) { const z = b * k / 6; if (plin(m, dinMotor(m, [x - a, z - b / 2, y + y0] as P3))) n++; }
  }
  // punctele spirei (profilul de pe hârtie, tras înăuntru cu 0,03), pe partea dinspre roată, în roată
  for (let fi = Math.PI - 1.1; fi <= Math.PI + 1.1; fi += 0.1) for (let k = -2; k <= 2; k++) for (let j = 0; j <= 8; j++) for (const s of [-1, 1]) {
    const r = h.rf + (h.ra - h.rf) * j / 8, w = wc + PAS * (fi - Math.PI) / (2 * Math.PI) + k * PAS + s * (h.T(r) - 0.03);
    const x = a + (r - 0.03) * Math.cos(fi), z = b / 2 + (r - 0.03) * Math.sin(fi), y = w - y0;
    if (z < 0.02 || z > b - 0.02) continue;
    if (plin(g.roata, [g.c[0] + x * co + y * si, g.c[1] - x * si + y * co, z] as P3)) n++;
  }
  return n;
}

test('angrenarea, pe plase: roata motorului, cu axul unde spune montajul, nu intră în melc la nicio fază și are jocul de pe hârtie', () => {
  for (const [diam, z, b] of [[8, 8, 3.8], [8, 24, 7.8], [16, 16, 3.8], [16, 40, 7.8]] as const) {
    const m = melc({ diam, lung: 3 }), h = hartie(diam, 3), g = roataCuContur(z, b), mont = Lm.melcMontaj({ diam }, z), a = mont.distanta, ce = `Ø${diam} cu roata de ${z}, lată de ${b}`;
    assert.equal(a, diam / 2 + z / 2, `${ce}: distanța dintre axe`);
    for (let i = 0; i < 8; i++) {
      const y0 = h.Lz / 2 - PAS / 2 + PAS * i / 8;
      assert.equal(patrundere(m, h, g, b, a, y0), 0, `${ce}: faza ${i}`);
      // jocul pe linia de divizare: 2 · jocul din calibrare (al roții și al spirei), în amândouă sensurile
      for (const s of [-1, 1]) {
        assert.equal(patrundere(m, h, g, b, a, y0, s * (2 * JOC - 0.07)), 0, `${ce}: faza ${i}, în joc (${s})`);
        assert.ok(patrundere(m, h, g, b, a, y0, s * (2 * JOC + 0.13)) > 0, `${ce}: faza ${i}, dincolo de joc (${s})`);
      }
    }
    // martorii: cu o jumătate de pas alături (dinte pe spiră) și cu axele apropiate peste jocul de la fund, intră
    assert.ok(patrundere(m, h, g, b, a, h.Lz / 2, PAS / 2) > 0, `${ce}: cu o jumătate de pas alături`);
    assert.ok(patrundere(m, h, g, b, a - 0.45, h.Lz / 2) > 0, `${ce}: cu axele apropiate cu 0,45 mm`);
    assert.equal(patrundere(m, h, g, b, a + 0.5, h.Lz / 2), 0, `${ce}: cu axele depărtate, liberă`);
  }
});

test('la marginile calibrării (jocul dinților de 0,05 și de 0,25): spira urmează jocul, tot nu intră, iar jocul angrenării e 2 · jocul', () => {
  for (const [varianta, asteptat] of [[1, 0.05], [5, 0.25]] as const) cu({ varianta_dinti: varianta }, () => {
    const joc = L.efective().jocDinti!;
    assert.equal(r3(joc), asteptat);
    for (const [diam, z, b] of [[8, 24, 7.8], [16, 8, 3.8]] as const) {
      const m = melc({ diam, lung: 3 }), h = hartie(diam, 3, joc), g = roataCuContur(z, b), a = Lm.melcMontaj({ diam }, z).distanta, ce = `jocul ${asteptat}, Ø${diam} cu roata de ${z}`;
      assert.equal(r3(Lm.melcCote({ diam }).grosime), r3(h.t), ce);
      for (let i = 0; i < 4; i++) {
        const y0 = h.Lz / 2 - PAS / 2 + PAS * i / 4;
        assert.equal(patrundere(m, h, g, b, a, y0), 0, `${ce}: faza ${i}`);
        for (const s of [-1, 1]) {
          assert.equal(patrundere(m, h, g, b, a, y0, s * (2 * joc - 0.07)), 0, `${ce}: faza ${i}, în joc (${s})`);
          assert.ok(patrundere(m, h, g, b, a, y0, s * (2 * joc + 0.13)) > 0, `${ce}: faza ${i}, dincolo de joc (${s})`);
        }
      }
    }
  });
  // înapoi la valorile din fabrică
  assert.equal(L.efective().jocDinti, JOC);
});

test('montajul: axul roții la jumătatea diametrului melcului plus jumătate din dinți; pe grila de știfturi, la jumătate de știft sau în afara ei', () => {
  const q = (diam: number, z: unknown) => { const c = Lm.melcMontaj({ diam }, z); return [c.dinti, c.distanta, c.grila, c.raport]; };
  // ca la LEGO: melcul Ø8 cu roțile de 8, 24 și 40 de dinți, la 1, 2 și 3 știfturi; cu cea de 16, la un știft și jumătate
  assert.deepEqual(q(8, 8), [8, 8, 'intreg', 8]);
  assert.deepEqual(q(8, 16), [16, 12, 'jumatate', 16]);
  assert.deepEqual(q(8, 24), [24, 16, 'intreg', 24]);
  assert.deepEqual(q(8, 40), [40, 24, 'intreg', 40]);
  assert.deepEqual(q(16, 8), [8, 12, 'jumatate', 8]);
  assert.deepEqual(q(16, 16), [16, 16, 'intreg', 16]);
  assert.deepEqual(q(16, 24), [24, 20, 'jumatate', 24]);
  assert.deepEqual(q(8, 12), [12, 10, 'nu', 12]);
  assert.deepEqual(q(8, 20), [20, 14, 'nu', 20]);
  assert.deepEqual(q(8, 9), [9, 8.5, 'nu', 9]);
  // roata, în marginile roților dințate (8–80); ce nu e număr, roata de 24
  assert.deepEqual(q(8, 3), [8, 8, 'intreg', 8]);
  assert.deepEqual(q(8, 200), [80, 44, 'jumatate', 80]);
  assert.deepEqual(q(8, 'x'), [24, 16, 'intreg', 24]);
  assert.deepEqual(q(8, 24.4), [24, 16, 'intreg', 24]);
  assert.deepEqual(q(8, 24.6), [25, 16.5, 'nu', 25]);
});

test('marginile: diametrul 8 sau 16, lungimea 1–4 știfturi; ce iese din ele e adus înapoi și spus', () => {
  const q = (d: Record<string, unknown>) => { const c = Lm.melcCote(d); return [c.diam, c.lung]; };
  assert.deepEqual(q({ diam: 16, lung: 4 }), [16, 4]);
  assert.deepEqual(q({ diam: '16', lung: '3' }), [16, 3]);
  assert.deepEqual(q({ diam: 12, lung: 0 }), [8, 1]);
  assert.deepEqual(q({ diam: null, lung: 9 }), [8, 4]);
  assert.deepEqual(q({ lung: 2.4 }), [8, 2]);
  assert.deepEqual(q({ lung: 2.6 }), [8, 3]);
  assert.equal(melc({ lung: 1 }).avert.length, 0);
  assert.equal(melc({ lung: 4 }).avert.length, 0);
  assert.equal(melc({ lung: 2.4 }).avert.length, 0);
  assert.equal(melc({ lung: 0 }).avert.length, 1);
  // avertismentul spune marginile și lungimea făcută, nu pe cea cerută
  assert.match(melc({ lung: 0 }).avert[0]!, /1 și 4 știfturi.*de 1\.$/);
  assert.match(melc({ lung: 9 }).avert[0]!, /1 și 4 știfturi.*de 4\.$/);
  assert.equal(amprentaPlasei(melc({ diam: 12 })), amprentaPlasei(melc()));
  assert.notEqual(amprentaPlasei(melc({ diam: 16 })), amprentaPlasei(melc()));
  assert.equal(amprentaPlasei(melc({ lung: 9 })), amprentaPlasei(melc({ lung: 4 })));
});
