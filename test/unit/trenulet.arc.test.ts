/**
 * Arcul din atelierul Easy 3Draw (ADR 0284, felia 3.Cd), pe plasele reale ale motorului:
 * - o cărămidă 1 × n, înaltă de 1–4 cărămizi, cu știfturi pe toată lungimea și cu o boltă dedesubt: picioarele sunt
 *   primul și ultimul știft (două cărămizi 1 × 1, goale pe dedesubt, ca să stea pe știfturi), iar între ele e puntea;
 * - bolta e un arc de cerc prin cele două colțuri de jos ale deschiderii; urcă jumătate din deschidere (semicerc), dar nu
 *   mai mult decât înălțimea piesei fără 1,6 mm (cât rămâne deasupra); „joasă” urcă pe jumătate;
 * - un punct e judecat „în lemn” sau „în gol” după numărul de înfășurare al plasei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, type Piesa } from './ajutor-plasa-lego.ts';

type Cote = { lung: number; inalt: number; bolta: string; deschidere: number; sageata: number; raza: number; deasupra: number; inaltime: number };
const Lm = L as typeof L & { arcCote(d: Record<string, unknown>): Cote };
const arc = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'arc', ...d });
const P = L.parametri();
const S = P.pas!, G = P.grinda_groasa!, PLACA = P.placa!, STIFT = P.stift_h!, SUS = P.sus!;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
/** Cotele de pe hârtie: deschiderea (între picioare), săgeata bolții, raza ei, cât rămâne deasupra. */
function hartie(lung: number, inalt: number, joasa = false) {
  const Lx = S * lung - 0.2, H = 3 * PLACA * inalt, w = S * (lung - 2) + 0.2, maxim = Math.min(w / 2, H - 1.6), s = joasa ? maxim / 2 : maxim;
  return { Lx, H, w, s, R: (w * w / 4 + s * s) / (2 * s), xm: Lx / 2, xa: Lx / 2 - w / 2, xb: Lx / 2 + w / 2 };
}

test('motorul știe piesa, iar cea implicită e arcul 1 × 4: boltă de 8 mm peste două știfturi, 1,6 mm deasupra', () => {
  assert.ok(L.tipuri.includes('arc'));
  const p = arc(), h = hartie(4, 1);
  assert.deepEqual(cote(p), [31.8, 7.8, r3(9.6 + STIFT)]);
  assert.deepEqual([r3(h.w), r3(h.s), r3(h.H - h.s)], [16.2, 8, 1.6]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicit');
  assert.equal(amprentaPlasei(arc({ lung: 4, inalt: 1, bolta: 'inalta' })), amprentaPlasei(p));
  const q = Lm.arcCote({});
  assert.deepEqual([q.lung, q.inalt, q.bolta, r3(q.deschidere), r3(q.sageata), r3(q.deasupra), r3(q.inaltime)], [4, 1, 'inalta', 16.2, 8, 1.6, 9.6]);
});

test('corpul e închis și are cotele de pe hârtie, pe toată plaja de lungimi, înălțimi și bolți', () => {
  let n = 0;
  for (const lung of [3, 4, 5, 6, 8, 12, 16]) for (const inalt of [1, 2, 3, 4]) for (const bolta of ['inalta', 'joasa']) {
    const p = arc({ lung, inalt, bolta }), h = hartie(lung, inalt, bolta === 'joasa'), ce = `1×${lung}×${inalt} ${bolta}`;
    inchisa(p, ce);
    assert.deepEqual(cote(p), [r3(h.Lx), G, r3(h.H + STIFT)], ce);
    assert.equal(p.avert.length, 0, ce);
    const q = Lm.arcCote({ lung, inalt, bolta });
    assert.deepEqual([r3(q.deschidere), r3(q.sageata), r3(q.raza), r3(q.deasupra)], [r3(h.w), r3(h.s), r3(h.R), r3(h.H - h.s)], ce);
    n++;
  }
  assert.equal(n, 56);
  // pe hârtie: arcul 1 × 6 × 2 e un semicerc de 16,1 mm; arcul 1 × 6 urcă doar cât îl lasă înălțimea; cel 1 × 3 e mic și rotund
  assert.deepEqual([r3(hartie(6, 2).s), r3(hartie(6, 2).R)], [16.1, 16.1]);
  assert.deepEqual([r3(hartie(6, 1).s), r3(hartie(6, 1).R)], [8, r3((32.2 * 32.2 / 4 + 64) / 16)]);
  assert.deepEqual([r3(hartie(3, 1).s), r3(hartie(3, 1).R)], [4.1, 4.1]);
  assert.equal(r3(hartie(6, 2, true).s), 8.05);
});

test('bolta: un arc de cerc prin colțurile de jos ale deschiderii, pe toată lățimea; deasupra, lemn până sus', () => {
  for (const [lung, inalt, bolta] of [[4, 1, 'inalta'], [6, 1, 'inalta'], [6, 2, 'inalta'], [8, 2, 'joasa'], [3, 1, 'inalta'], [12, 3, 'inalta'], [5, 4, 'joasa']] as const) {
    const p = arc({ lung, inalt, bolta }), h = hartie(lung, inalt, bolta === 'joasa'), ce = `1×${lung}×${inalt} ${bolta}`;
    const zc = h.s - h.R, a0 = Math.asin(Math.min(1, h.w / 2 / h.R));
    for (const y of [0.3, G / 2, G - 0.3]) {
      for (const f of [-0.97, -0.8, -0.5, -0.2, 0, 0.3, 0.6, 0.9, 0.97]) {
        const a = a0 * f, sn = Math.sin(a), cs = Math.cos(a);
        const inGol: [number, number, number] = [h.xm + (h.R - 0.12) * sn, y, zc + (h.R - 0.12) * cs], inLemn: [number, number, number] = [h.xm + (h.R + 0.12) * sn, y, zc + (h.R + 0.12) * cs];
        if (inGol[2] > 0.02) assert.equal(plin(p, inGol), false, `${ce}, y ${y}, ${f}: sub boltă`);
        // deasupra bolții e lemn (cât punctul e încă între picioare și sub fața de sus)
        if (inLemn[2] > 0.02 && inLemn[2] < h.H - 0.05) assert.equal(plin(p, inLemn), true, `${ce}, y ${y}, ${f}: în boltă`);
      }
      // vârful bolții și lemnul de deasupra lui
      assert.equal(plin(p, [h.xm, y, h.s - 0.1]), false, `${ce}, y ${y}: sub vârf`);
      assert.equal(plin(p, [h.xm, y, h.s + 0.1]), true, `${ce}, y ${y}: deasupra vârfului`);
      assert.equal(plin(p, [h.xm, y, h.H - 0.1]), true, `${ce}, y ${y}: sub fața de sus`);
      // deschiderea, jos: gol până lângă picioare, pe toată lățimea ei
      for (const x of [h.xa + 0.25, h.xm, h.xb - 0.25]) assert.equal(plin(p, [x, y, 0.05]), false, `${ce}, y ${y}: deschiderea la x ${x.toFixed(1)}`);
    }
    // puntea e plină între boltă și fața de sus, de la un picior la altul (nu doar pe margini)
    for (let x = h.xa + 0.4; x < h.xb - 0.3; x += 1.3) {
      const zb = zc + Math.sqrt(Math.max(0, h.R * h.R - (x - h.xm) * (x - h.xm)));
      for (const z of [zb + 0.15, (zb + h.H) / 2, h.H - 0.15]) if (z > zb + 0.1 && z < h.H) assert.equal(plin(p, [x, G / 2, z]), true, `${ce}: puntea la x ${x.toFixed(1)}, z ${z.toFixed(1)}`);
    }
  }
});

test('picioarele sunt cărămizi 1 × 1, punct cu punct (goale dedesubt, ca să stea pe știfturi); puntea se ține de ele', () => {
  for (const [lung, inalt] of [[4, 1], [6, 2], [3, 1], [8, 3]] as const) {
    const p = arc({ lung, inalt }), h = hartie(lung, inalt), ce = `1×${lung}×${inalt}`;
    const picior = L.construieste({ tip: 'caramida', celule: [[0, 0]], placi: 3 * inalt });
    assert.deepEqual(cote(picior), [G, G, r3(h.H + STIFT)]);
    let goluri = 0, lemn = 0;
    for (const x of [0.3, 1.1, 2.2, 3.9, 5.6, 6.2]) for (const y of [0.3, 1.1, 3.9, 6.7, 7.5]) for (const z of [0.3, h.H / 2, h.H - SUS - 0.3, h.H - 0.3, h.H + 1]) {
      const a = plin(picior, [x, y, z]);
      assert.equal(plin(p, [x, y, z]), a, `${ce}: piciorul din stânga la (${x}, ${y}, ${z.toFixed(1)})`);
      assert.equal(plin(p, [h.Lx - x, y, z]), a, `${ce}: piciorul din dreapta la (${x}, ${y}, ${z.toFixed(1)})`);
      if (a) lemn++; else goluri++;
    }
    assert.ok(goluri > 20 && lemn > 40, `${ce}: piciorul are și gol, și pereți`);
    // legătura: de la peretele piciorului la punte, lemn fără întrerupere, pe toată înălțimea de deasupra bolții
    for (const z of [h.H - 1.2, h.H - 0.2]) for (let x = h.xa - 1.2; x < h.xa + 1; x += 0.2) {
      assert.equal(plin(p, [x, G / 2, z]), true, `${ce}: legătura din stânga la x ${x.toFixed(1)}, z ${z.toFixed(1)}`);
      assert.equal(plin(p, [h.Lx - x, G / 2, z]), true, `${ce}: legătura din dreapta la x ${x.toFixed(1)}, z ${z.toFixed(1)}`);
    }
  }
});

test('știfturile: câte unul pe fiecare pas, de la un capăt la altul, și deasupra bolții', () => {
  for (const [lung, inalt] of [[3, 1], [4, 1], [7, 2], [16, 1]] as const) {
    const p = arc({ lung, inalt }), h = hartie(lung, inalt);
    for (let k = 0; k < lung; k++) {
      const cx = S * k + S / 2 - 0.1;
      assert.equal(plin(p, [cx, G / 2, h.H + STIFT - 0.2]), true, `1×${lung}: știftul ${k}`);
      assert.equal(plin(p, [cx, G / 2, h.H + STIFT + 0.2]), false, `1×${lung}: deasupra știftului ${k}`);
      assert.equal(plin(p, [cx + 2.0, G / 2, h.H + 0.5]), true, `1×${lung}: știftul ${k}, spre margine`);
      assert.equal(plin(p, [cx + 2.8, G / 2, h.H + 0.5]), false, `1×${lung}: lângă știftul ${k}`);
      if (k + 1 < lung) assert.equal(plin(p, [cx + S / 2, G / 2, h.H + 0.5]), false, `1×${lung}: între știfturile ${k} și ${k + 1}`);
    }
  }
});

test('ce nu se poate se îndreaptă și se spune: lungimea (3–16), înălțimea (1–4); o boltă necunoscută e cea înaltă', () => {
  const scurt = arc({ lung: 2 });
  assert.deepEqual(cote(scurt), [S * 3 - 0.2, G, r3(9.6 + STIFT)]);
  assert.equal(scurt.avert.length, 1);
  assert.match(scurt.avert[0]!, /3/);
  const lung = arc({ lung: 30 });
  assert.deepEqual(cote(lung), [S * 16 - 0.2, G, r3(9.6 + STIFT)]);
  assert.equal(lung.avert.length, 1);
  const inalt = arc({ inalt: 9 });
  assert.deepEqual(cote(inalt), [31.8, G, r3(4 * 9.6 + STIFT)]);
  assert.equal(inalt.avert.length, 1);
  assert.match(inalt.avert[0]!, /4/);
  assert.equal(arc({ inalt: 0 }).avert.length, 1);
  assert.equal(amprentaPlasei(arc({ inalt: 0 })), amprentaPlasei(arc({ inalt: 1 })));
  assert.equal(amprentaPlasei(arc({ bolta: 'altceva' })), amprentaPlasei(arc({ bolta: 'inalta' })));
  assert.notEqual(amprentaPlasei(arc({ bolta: 'joasa' })), amprentaPlasei(arc({ bolta: 'inalta' })));
  assert.equal(Lm.arcCote({ bolta: 'altceva' }).bolta, 'inalta');
  assert.equal(Lm.arcCote({ bolta: 'joasa' }).bolta, 'joasa');
  // numerele scrise ca text se citesc; ce nu e număr dă implicitul, fără avertisment; jumătățile se rotunjesc
  assert.equal(amprentaPlasei(arc({ lung: '4', inalt: '1' })), amprentaPlasei(arc()));
  assert.equal(arc({ lung: 'x', inalt: null }).avert.length, 0);
  assert.equal(amprentaPlasei(arc({ lung: 'x', inalt: null })), amprentaPlasei(arc()));
  assert.equal(Lm.arcCote({ lung: 5.6 }).lung, 6);
});

test('aceeași cerere dă aceeași plasă', () => {
  const a = arc({ lung: 7, inalt: 2, bolta: 'joasa' }), b = arc({ lung: 7, inalt: 2, bolta: 'joasa' });
  assert.equal(amprentaPlasei(a), amprentaPlasei(b));
  assert.deepEqual(cote(a), cote(b));
});
