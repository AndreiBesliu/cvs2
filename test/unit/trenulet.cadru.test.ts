/**
 * Cadrul (fereastra) din atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe plasele reale ale motorului:
 * - o cărămidă 1 × n, înaltă de 2–6 cărămizi, cu un gol prin ea: jos pragul (o placă, cu locașurile ei, ca piesa să stea
 *   pe știfturi), pe margini doi stâlpi groși cât rama, sus buiandrugul (o placă plină) cu știfturi pe toată lungimea;
 * - golul e dreptunghiul dintre ele, pe toată adâncimea piesei; cu colțurile de sus teșite la 45°, puntea de sus (ce se
 *   tipărește în aer) se scurtează până la un știft, cât îi lasă înălțimea golului;
 * - un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al plasei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Cote = { lung: number; inalt: number; rama: number; colturi: string; golLat: number; golInalt: number; tesitura: number; punte: number; inaltime: number };
const Lc = L as typeof L & { cadruCote(d: Record<string, unknown>): Cote; prinderi(d: Record<string, unknown>): { fel: string; p: number[]; d: number[]; lung: number; orb?: boolean }[] };
const cadru = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'cadru', ...d });
const P = L.parametri();
const S = P.pas!, PLACA = P.placa!, STIFT = P.stift_h!;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
/** Cotele de pe hârtie (piesa are colțul în origine): lungimea, înălțimea, golul, teșitura și puntea de sus. */
function hartie(lung: number, inalt: number, rama = 1.6, tesit = false) {
  const Lx = S * lung - 0.2, H = 3 * PLACA * inalt, w = Lx - 2 * rama, zj = PLACA, zs = H - PLACA, h = zs - zj;
  const k = tesit ? Math.max(0, Math.min((w - S) / 2, h - 2)) : 0;
  return { Lx, H, w, h, zj, zs, k, punte: w - 2 * k, xa: rama, xb: Lx - rama };
}
const la = (p: Piesa, x: number, y: number, z: number) => plin(p, [x, y, z] as P3);

test('motorul știe piesa, iar cea implicită e cadrul 1 × 4 × 3: un gol de 28,6 × 22,4 mm, cu rama de 1,6', () => {
  assert.ok(L.tipuri.includes('cadru'));
  const p = cadru(), h = hartie(4, 3);
  assert.deepEqual(cote(p), [31.8, 7.8, r3(28.8 + STIFT)]);
  assert.deepEqual([r3(h.w), r3(h.h), r3(h.punte)], [28.6, 22.4, 28.6]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit');
  assert.equal(amprentaPlasei(cadru({ lung: 4, inalt: 3, rama: 1.6, colturi: 'drepte' })), amprentaPlasei(p));
  const q = Lc.cadruCote({});
  assert.deepEqual([q.lung, q.inalt, q.rama, q.colturi, r3(q.golLat), r3(q.golInalt), r3(q.tesitura), r3(q.punte), r3(q.inaltime)], [4, 3, 1.6, 'drepte', 28.6, 22.4, 0, 28.6, 28.8]);
});

test('corpul e închis și are cotele de pe hârtie, pe toată plaja de lungimi, înălțimi, rame și colțuri', () => {
  let n = 0;
  for (const lung of [2, 3, 4, 6, 8]) for (const inalt of [2, 3, 4, 6]) for (const rama of [1.2, 1.6, 4]) for (const colturi of ['drepte', 'tesite']) {
    const p = cadru({ lung, inalt, rama, colturi }), h = hartie(lung, inalt, rama, colturi === 'tesite'), ce = `1×${lung}×${inalt}, rama ${rama}, ${colturi}`;
    inchisa(p, ce);
    assert.deepEqual(cote(p), [r3(h.Lx), 7.8, r3(h.H + STIFT)], ce);
    assert.equal(p.avert.length, 0, ce);
    const q = Lc.cadruCote({ lung, inalt, rama, colturi });
    assert.deepEqual([r3(q.golLat), r3(q.golInalt), r3(q.tesitura), r3(q.punte)], [r3(h.w), r3(h.h), r3(h.k), r3(h.punte)], ce);
    n++;
  }
  assert.equal(n, 120);
  // pe hârtie: teșitura scurtează puntea până la un știft, cât îi lasă înălțimea golului (fără 2 mm, cât rămâne stâlpul drept)
  assert.deepEqual([r3(hartie(4, 3, 1.6, true).k), r3(hartie(4, 3, 1.6, true).punte)], [10.3, 8]);
  assert.deepEqual([r3(hartie(2, 2, 1.6, true).k), r3(hartie(2, 2, 1.6, true).punte)], [2.3, 8]);
  assert.deepEqual([r3(hartie(8, 3, 1.6, true).k), r3(hartie(8, 3, 1.6, true).punte)], [20.4, 19.8]);
  assert.deepEqual([r3(hartie(8, 2, 1.6, true).k), r3(hartie(8, 2, 1.6, true).punte)], [10.8, 39]);
  // un gol de cel mult un știft n-are ce teși
  assert.deepEqual([r3(hartie(2, 2, 4, true).w), r3(hartie(2, 2, 4, true).k)], [7.8, 0]);
});

test('golul, pe plasă: gol între stâlpi, prag și buiandrug, pe toată adâncimea; lemn în ele, la 0,15 mm de marginea golului', () => {
  for (const [lung, inalt, rama] of [[4, 3, 1.6], [2, 2, 1.2], [8, 6, 4], [3, 4, 2.5]] as const) {
    const p = cadru({ lung, inalt, rama }), h = hartie(lung, inalt, rama), ce = `1×${lung}×${inalt}, rama ${rama}`, xm = h.Lx / 2, zm = (h.zj + h.zs) / 2, e = 0.15;
    for (const y of [0.3, 3.9, 7.5]) {
      // stâlpii: lemn până la ramă, gol după ea
      for (const z of [h.zj + 0.5, zm, h.zs - 0.5]) {
        assert.equal(la(p, h.xa - e, y, z), true, `${ce}: stâlpul din stânga, y ${y}, z ${z}`);
        assert.equal(la(p, h.xa + e, y, z), false, `${ce}: golul lângă stâlpul din stânga, y ${y}, z ${z}`);
        assert.equal(la(p, h.xb + e, y, z), true, `${ce}: stâlpul din dreapta, y ${y}, z ${z}`);
        assert.equal(la(p, h.xb - e, y, z), false, `${ce}: golul lângă stâlpul din dreapta, y ${y}, z ${z}`);
        assert.equal(la(p, 0.3, y, z), true, `${ce}: stâlpul e plin până la fața piesei`);
      }
      // pragul (capacul plăcii de jos) și buiandrugul (placa plină de sus)
      for (const x of [h.xa + 0.5, xm, h.xb - 0.5]) {
        assert.equal(la(p, x, y, h.zj - e), true, `${ce}: pragul, x ${x}, y ${y}`);
        assert.equal(la(p, x, y, h.zj + e), false, `${ce}: golul peste prag, x ${x}, y ${y}`);
        assert.equal(la(p, x, y, h.zs + e), true, `${ce}: buiandrugul, x ${x}, y ${y}`);
        assert.equal(la(p, x, y, h.zs - e), false, `${ce}: golul sub buiandrug, x ${x}, y ${y}`);
        assert.equal(la(p, x, y, h.H - e), true, `${ce}: buiandrugul e plin până sus, x ${x}, y ${y}`);
      }
      assert.equal(la(p, xm, y, zm), false, `${ce}: mijlocul golului, y ${y}`);
    }
    // în afara piesei, în dreptul golului, nimic
    assert.equal(la(p, xm, -0.3, zm), false); assert.equal(la(p, xm, 8.1, zm), false);
    // pragul e o placă obișnuită: goală pe dedesubt (sub capacul de 1 mm), cu pereții ei
    assert.equal(la(p, xm, 3.9, PLACA - 0.5), true, `${ce}: capacul pragului`);
    assert.equal(la(p, 0.5, 3.9, 1), true, `${ce}: peretele pragului`);
  }
});

test('colțurile de sus teșite la 45°: lemn în colț până la teșitură, gol sub ea; puntea rămasă e la mijloc', () => {
  for (const [lung, inalt, rama] of [[4, 3, 1.6], [8, 3, 1.6], [6, 4, 2], [2, 2, 1.2]] as const) {
    const t = cadru({ lung, inalt, rama, colturi: 'tesite' }), d = cadru({ lung, inalt, rama }), h = hartie(lung, inalt, rama, true), ce = `1×${lung}×${inalt}, rama ${rama}`;
    assert.ok(h.k > 1, ce);
    for (const y of [0.3, 3.9, 7.5]) for (const f of [0.25, 0.5, 0.75]) {
      // pe teșitură, punctul la f din ea: (xa + f·k, zs − (1 − f)·k); la 0,2 mm spre colț e lemn, la 0,2 mm spre gol e gol
      const x = h.xa + f * h.k, z = h.zs - (1 - f) * h.k, c = 0.2 * Math.SQRT1_2;
      assert.equal(la(t, x - c, y, z + c), true, `${ce}: colțul din stânga, la ${f}, y ${y}`);
      assert.equal(la(t, x + c, y, z - c), false, `${ce}: sub teșitura din stânga, la ${f}, y ${y}`);
      assert.equal(la(t, h.Lx - x + c, y, z + c), true, `${ce}: colțul din dreapta, la ${f}, y ${y}`);
      assert.equal(la(t, h.Lx - x - c, y, z - c), false, `${ce}: sub teșitura din dreapta, la ${f}, y ${y}`);
      // la cadrul drept, același colț e gol
      assert.equal(la(d, x - c, y, z + c), false, `${ce}: la cadrul drept, colțul e gol`);
    }
    // sub teșitură stâlpul rămâne drept (cel puțin 2 mm), iar puntea de la mijloc e la înălțimea buiandrugului
    assert.equal(la(t, h.xa + 0.15, 3.9, h.zs - h.k - 0.3), false, `${ce}: sub teșitură, lângă stâlp`);
    assert.equal(la(t, h.Lx / 2, 3.9, h.zs - 0.15), false, `${ce}: sub punte`);
    assert.equal(la(t, h.Lx / 2, 3.9, h.zs + 0.15), true, `${ce}: puntea`);
    if (h.punte > 0.6) {
      assert.equal(la(t, h.xa + h.k + 0.2, 3.9, h.zs - 0.15), false, `${ce}: capătul punții, dinspre gol`);
      assert.equal(la(t, h.xa + h.k - 0.3, 3.9, h.zs - 0.1), true, `${ce}: capătul punții, dinspre colț`);
    }
  }
});

test('știfturile pe toată lungimea și locașurile pragului: prinderile, la locul lor de pe hârtie', () => {
  for (const [lung, inalt] of [[4, 3], [2, 2], [8, 6]] as const) {
    const p = cadru({ lung, inalt }), h = hartie(lung, inalt), ce = `1×${lung}×${inalt}`;
    const pr = Array.from(Lc.prinderi({ tip: 'cadru', lung, inalt }), (c) => ({ fel: c.fel, p: Array.from(c.p, r3), d: Array.from(c.d), lung: r3(c.lung), orb: c.orb === true }));
    assert.deepEqual(pr.filter((c) => c.fel === 'stift'), Array.from({ length: lung }, (_, k) => ({ fel: 'stift', p: [r3(S * k + S / 2 - 0.1), 3.9, r3(h.H)], d: [0, 0, 1], lung: STIFT, orb: false })), ce);
    assert.deepEqual(pr.filter((c) => c.fel === 'locas'), Array.from({ length: lung }, (_, k) => ({ fel: 'locas', p: [r3(S * k + S / 2 - 0.1), 3.9, 0], d: [0, 0, -1], lung: r3(PLACA - P.sus!), orb: true })), ce);
    assert.equal(pr.length, 2 * lung, ce);
    // pe plasă: știftul e lemn până la marginea lui (în cele patru părți), între știfturi e gol; sub prag, în dreptul
    // unui știft, e gol până sub capac (stâlpii și buiandrugul nu coboară în locașuri)
    const r = L.efective().stiftD! / 2;
    for (let k = 0; k < lung; k++) {
      const x = S * k + S / 2 - 0.1, zm = h.H + STIFT / 2;
      assert.equal(la(p, x, 3.9, h.H + STIFT - 0.3), true, `${ce}: știftul ${k}`);
      assert.equal(la(p, x, 3.9, h.H + STIFT + 0.2), false, `${ce}: peste știftul ${k}`);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        assert.equal(la(p, x + dx * (r - 0.2), 3.9 + dy * (r - 0.2), zm), true, `${ce}: marginea știftului ${k}, spre ${dx}, ${dy}`);
        assert.equal(la(p, x + dx * (r + 0.2), 3.9 + dy * (r + 0.2), zm), false, `${ce}: lângă știftul ${k}, spre ${dx}, ${dy}`);
      }
      if (k) assert.equal(la(p, x - S / 2, 3.9, h.H + 0.5), false, `${ce}: între știfturile ${k - 1} și ${k}`);
      for (const z of [0.5, 1, 2]) assert.equal(la(p, x, 3.9, z), false, `${ce}: locașul ${k}, la z ${z}`);
    }
  }
});

test('marginile: 2–8 știfturi, 2–6 cărămizi, rama 1,2–4 mm; ce iese din ele e adus înapoi și spus', () => {
  const q = (d: Record<string, unknown>) => { const c = Lc.cadruCote(d); return [c.lung, c.inalt, c.rama, c.colturi]; };
  assert.deepEqual(q({ lung: 1, inalt: 1, rama: 0.5 }), [2, 2, 1.2, 'drepte']);
  assert.deepEqual(q({ lung: 20, inalt: 9, rama: 9 }), [8, 6, 4, 'drepte']);
  assert.deepEqual(q({ lung: 4.4, inalt: '3', rama: 2.04, colturi: 'altceva' }), [4, 3, 2, 'drepte']);
  assert.deepEqual(q({ lung: 4.6, inalt: 2.6, rama: 2.06, colturi: 'tesite' }), [5, 3, 2.1, 'tesite']);
  assert.deepEqual(q({ lung: null, inalt: '', rama: true }), [4, 3, 1.6, 'drepte']);
  assert.equal(cadru({ lung: 2, inalt: 2, rama: 1.2 }).avert.length, 0);
  assert.equal(cadru({ lung: 8, inalt: 6, rama: 4 }).avert.length, 0);
  assert.equal(cadru({ lung: 4.4 }).avert.length, 0);
  // rama cu sutimi, în margini: rotunjită la zecimi, fără mesaj
  assert.equal(cadru({ rama: 2.06 }).avert.length, 0);
  assert.equal(Lc.cadruCote({ rama: 2.06 }).rama, 2.1);
  assert.equal(cadru({ lung: 1 }).avert.length, 1);
  assert.match(cadru({ lung: 1 }).avert[0]!, /2 și 8/);
  assert.match(cadru({ inalt: 9 }).avert[0]!, /2 și 6/);
  assert.match(cadru({ rama: 9 }).avert[0]!, /1,2 și 4/);
  assert.equal(cadru({ lung: 20, inalt: 9, rama: 9 }).avert.length, 3);
  assert.equal(amprentaPlasei(cadru({ lung: 1 })), amprentaPlasei(cadru({ lung: 2 })));
  assert.notEqual(amprentaPlasei(cadru({ colturi: 'tesite' })), amprentaPlasei(cadru()));
  assert.equal(amprentaPlasei(cadru({ colturi: 'altceva' })), amprentaPlasei(cadru()));
});
