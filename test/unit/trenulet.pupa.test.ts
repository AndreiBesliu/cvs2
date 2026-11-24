/**
 * Înclinarea spre pupa a elicei de barcă din atelierul Easy 3Draw (ADR 0282, felia 3.Tt), pe plasele reale:
 * - fără ea (0°, lipsă sau ce nu e număr), elicea de barcă e cea de dinainte, la octet (amprenta a 24 de elice, luată din
 *   motorul lui 18.22.0, înaintea schimbării);
 * - cu ea, fiecare secțiune a paletei urcă cu max(0, r − rh) · tan θ, fără nicio altă schimbare: pe cerc rămâne aceeași (deci
 *   paletele nu se ating și acoperă tot atât din disc), doar ridicată; la butuc stă pe masă, la vârf urcă cu (R − rh) · tan θ;
 * - butucul crește cât cel mai înalt vârf al paletelor (la zecime în sus, cel puțin 8), iar capacul stă tot peste el;
 * - corpul rămâne închis pe plaja parametrilor; „stânga” e oglinda lui „dreapta”;
 * - marginile: 0–15°, aduse în plajă fără avertisment (ca înclinarea înapoi); ce nu e număr ia 0.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR, cu un script de o singură folosință).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
type Cote = { z: number; D: number; rh: number; Hh: number; acoperire: number; pupa: number; urca: number };
type Lego = {
  construieste(d: Record<string, unknown>): Piesa;
  eliceBarcaCote(d: Record<string, unknown>): Cote;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();
const barca = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'eliceBarca', ...d });
const simplu = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const tg = (grade: number) => Math.tan(grade * Math.PI / 180);

function muchiiRele(tri: readonly Tri[]): number {
  const k = (p: P3) => p.map((v) => v.toFixed(5)).join(',');
  const m = new Map<string, number>();
  for (const t of tri) for (let i = 0; i < 3; i++) { const e = k(t[i]!) + '>' + k(t[(i + 1) % 3]!); m.set(e, (m.get(e) ?? 0) + 1); }
  let rele = 0;
  for (const [e, n] of m) { const [a, b] = e.split('>'); if (n !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return rele;
}
type Polar = [r: number, th: number, z: number];
/** Vârfurile plasei, o singură dată fiecare, în coordonate polare față de butuc (`construieste` mută piesa cu −baza). */
function polare(p: Piesa): Polar[] {
  const c = [-p.baza[0]!, -p.baza[1]!], pe = new Map<string, Polar>();
  for (const [x, y, z] of p.tri.flat()) pe.set(`${x},${y},${z}`, [Math.hypot(x - c[0]!, y - c[1]!), Math.atan2(y - c[1]!, x - c[0]!), z]);
  return [...pe.values()];
}
/** Razele stațiilor paletei (secțiunile plasei), crescător: de la rădăcina din butuc (cu 0,4 mm în el) la vârf. */
function statii(v: readonly Polar[], rh: number): number[] {
  const pe = new Map<string, number>();
  for (const q of v) if (q[0] > rh - 0.5 && Math.abs(q[0] - rh) > 1e-3 && !pe.has(q[0].toFixed(4))) pe.set(q[0].toFixed(4), q[0]);
  return [...pe.values()].sort((a, b) => a - b);
}
/** Vârfurile unei stații: (θ, z), în ordine (pentru comparat două plase). */
const laRaza = (v: readonly Polar[], rr: number) => v.filter((q) => Math.abs(q[0] - rr) < 1e-4).map(([, th, z]) => [th, z] as const)
  .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

test('fără înclinarea spre pupa, elicea de barcă e cea de dinainte, la octet', () => {
  // amprenta a 24 de elice de barcă (toate paletele, diametrele, pașii, lățimile, înclinările înapoi, sensurile, găurile și
  // capacul), luată din motorul lui 18.22.0, înaintea feliei
  const C: Record<string, unknown>[] = [];
  for (let i = 0; i < 24; i++) {
    C.push({ palete: 3 + (i % 3), diametru: [20, 40, 56.3, 120][i % 4], pas: [0.5, 1, 1.6][(i >> 2) % 3], latime: [40, 100, 150][(i >> 1) % 3],
      inclinare: [0, 20, 40][(i >> 3) % 3], sens: i % 2 ? 'stanga' : 'dreapta', gaura: ['x', 'r', 'b', 'nu'][(i >> 2) % 4], capac: (i >> 1) % 2 ? 'da' : 'nu' });
  }
  const amprenta = (pupa: unknown) => {
    const h = createHash('sha256');
    for (const d of C) h.update(JSON.stringify(barca(pupa === undefined ? d : { ...d, pupa }).tri));
    return h.digest('hex');
  };
  assert.equal(amprenta(undefined), 'a83de9fd04b5a5a1463210298d563c4b2fc641497a4d1c207ea96862d11cf8e1');
  assert.equal(amprenta(0), 'a83de9fd04b5a5a1463210298d563c4b2fc641497a4d1c207ea96862d11cf8e1');
  // ce nu e număr ia 0
  for (const pupa of ['x', '', null]) assert.deepEqual(barca({ pupa }).tri, barca().tri, JSON.stringify(pupa));
});

test('fiecare secțiune a paletei urcă cu max(0, r − rh) · tan θ, fără altă schimbare (pe cerc rămâne aceeași)', () => {
  for (const d of [{ pupa: 10 }, { pupa: 15, diametru: 120, pas: 0.5, latime: 40, palete: 5 }, { pupa: 7, inclinare: 40, palete: 5, latime: 150, sens: 'stanga' },
    { pupa: 15, diametru: 20, pas: 1.6, palete: 4 }] as Record<string, unknown>[]) {
    const fara = { ...d, pupa: 0, gaura: 'nu' }, q = L.eliceBarcaCote(d), v0 = polare(barca(fara)), v = polare(barca({ ...d, gaura: 'nu' }));
    const raze = statii(v0, q.rh);
    assert.equal(raze.length, 29, JSON.stringify(d));
    assert.deepEqual(statii(v, q.rh).map((r) => r.toFixed(6)), raze.map((r) => r.toFixed(6)), `${JSON.stringify(d)}: aceleași stații`);
    for (const rr of raze) {
      const urca = Math.max(0, rr - q.rh) * tg(d['pupa'] as number), a = laRaza(v0, rr), b = laRaza(v, rr);
      assert.equal(b.length, a.length, `${JSON.stringify(d)}: la r ${rr}`);
      for (let i = 0; i < a.length; i++) {
        assert.ok(Math.abs(b[i]![0] - a[i]![0]) < 1e-9 && Math.abs(b[i]![1] - a[i]![1] - urca) < 1e-9,
          `${JSON.stringify(d)}: la r ${rr}, ${b[i]} față de ${a[i]} ridicat cu ${urca}`);
      }
    }
    // pe cerc nu se schimbă nimic: paletele acoperă tot atât din disc
    assert.equal(q.acoperire, L.eliceBarcaCote(fara).acoperire, JSON.stringify(d));
  }
});

test('muchia de jos: pe masă la butuc, urcă spre vârf cu (R − rh) · tan θ; pe hârtie, Ø40 la 10° și 15°, Ø120 la 15°', () => {
  // pe hârtie: Ø40, butucul de raza 4: 16 · tan 10° = 2,8212; 16 · tan 15° = 4,2872; Ø120, butucul de 10,8: 49,2 · tan 15° = 13,1831
  for (const [d, urca] of [[{ pupa: 10 }, 2.8212], [{ pupa: 15 }, 4.2872], [{ pupa: 15, diametru: 120 }, 13.1831], [{}, 0], [{ pupa: 0 }, 0]] as const) {
    const q = L.eliceBarcaCote(d);
    assert.ok(Math.abs(q.urca - urca) < 5e-5, `${JSON.stringify(d)}: ${q.urca} față de ${urca} pe hârtie`);
    assert.equal(q.pupa, (d as { pupa?: number }).pupa ?? 0);
    // pe plasă: piesa stă pe masă (butucul), cea mai joasă stație a paletei la butuc e pe masă, iar vârful, ridicat cât spune
    const p = barca({ ...d, gaura: 'nu' }), v = polare(p), raze = statii(v, q.rh);
    assert.equal(Math.min(...p.tri.flat().map((w) => w[2])), 0, JSON.stringify(d));
    const zmin = (rr: number) => Math.min(...v.filter((w) => Math.abs(w[0] - rr) < 1e-4).map((w) => w[2]));
    assert.ok(Math.abs(zmin(raze[0]!)) < 1e-9, `${JSON.stringify(d)}: rădăcina, la z ${zmin(raze[0]!)}`);
    assert.ok(Math.abs(zmin(raze.at(-1)!) - q.urca) < 1e-9, `${JSON.stringify(d)}: vârful, la z ${zmin(raze.at(-1)!)}`);
  }
});

test('butucul, cât cel mai înalt vârf al paletelor (la zecime în sus, cel puțin 8); capacul, tot peste el; pe hârtie', () => {
  // pe hârtie (scriptul separat): implicita, 11,5 fără înclinare; la 10°, cel mai înalt vârf 12,157 → 12,2; la 15°, 12,549 →
  // 12,6; Ø120, 5 palete, pasul 0,5, lățimea 40 %: 10,2 → 15,2 (vârful, 15,172); Ø20 culcată la 15°: 2,604, deci tot 8
  for (const [d, Hh] of [[{ pupa: 10 }, 12.2], [{ pupa: 15 }, 12.6], [{ pupa: 15, diametru: 120, pas: 0.5, latime: 40, palete: 5 }, 15.2],
    [{ diametru: 120, pas: 0.5, latime: 40, palete: 5 }, 10.2], [{ pupa: 15, diametru: 20, palete: 5, pas: 0.5, latime: 40 }, 8]] as const) {
    assert.ok(Math.abs(L.eliceBarcaCote(d).Hh - Hh) < 1e-9, `${JSON.stringify(d)}: butucul ${L.eliceBarcaCote(d).Hh} față de ${Hh}`);
    const p = barca({ ...d, gaura: 'nu' }), zmax = Math.max(...p.tri.flat().map((w) => w[2]));
    assert.ok(Math.abs(p.dim[2]! - Hh) < 1e-9 && zmax <= Hh + 1e-9, `${JSON.stringify(d)}: înălțimea ${p.dim[2]}, vârful ${zmax}`);
  }
  // capacul: 1,2 · 4 = 4,8 peste butucul de 12,2
  assert.ok(Math.abs(barca({ pupa: 10, capac: 'da' }).dim[2]! - 17) < 1e-9, `cu capac: ${barca({ pupa: 10, capac: 'da' }).dim[2]}`);
});

test('corpul e închis cu înclinarea spre pupa, pe plaja parametrilor; „stânga” e oglinda lui „dreapta”', () => {
  const cazuri: Record<string, unknown>[] = [];
  for (const pupa of [1, 8, 15]) for (const palete of [3, 4, 5]) for (const diametru of [20, 56.3, 120]) cazuri.push({ pupa, palete, diametru, capac: palete === 4 ? 'da' : 'nu' });
  for (const gaura of ['x', 'r', 'b', 'nu']) cazuri.push({ pupa: 12, gaura, sens: 'stanga' });
  cazuri.push({ pupa: 15, pas: 1.6, latime: 150, inclinare: 40 }, { pupa: 15, pas: 0.5, latime: 40, inclinare: 0 });
  for (const d of cazuri) {
    const p = barca(d);
    assert.equal(muchiiRele(p.tri), 0, JSON.stringify(d));
    assert.ok(p.tri.flat(2).every(Number.isFinite), JSON.stringify(d));
  }
  // oglinda: doar paletele (dincolo de r 4,05: vârfurile butucului sunt mișcate deterministic cu cel mult 0,0001 mm)
  const vd = polare(barca({ pupa: 12, gaura: 'nu' })).filter((q) => q[0] > 4.05).map(([r, th, z]): P3 => [r * Math.cos(th), r * Math.sin(th), z]);
  const vs = polare(barca({ pupa: 12, gaura: 'nu', sens: 'stanga' })).filter((q) => q[0] > 4.05).map(([r, th, z]): P3 => [r * Math.cos(th), -r * Math.sin(th), z]);
  const grila = new Map<string, P3[]>(), cel = (q: P3, d = [0, 0, 0]) => q.map((x, i) => Math.floor(x / 0.01) + d[i]!).join(',');
  for (const q of vd) { const k = cel(q); (grila.get(k) ?? grila.set(k, []).get(k)!).push(q); }
  let lipsa = 0;
  for (const q of vs) {
    let gasit = false;
    for (let a = -1; a <= 1 && !gasit; a++) for (let b = -1; b <= 1 && !gasit; b++) for (let c = -1; c <= 1 && !gasit; c++)
      gasit = (grila.get(cel(q, [a, b, c])) ?? []).some((w) => Math.hypot(w[0] - q[0], w[1] - q[1], w[2] - q[2]) < 1e-6);
    if (!gasit) lipsa++;
  }
  assert.ok(lipsa === 0 && vs.length === vd.length && vd.length > 1000, `vârfuri fără pereche în oglindă: ${lipsa} din ${vs.length}`);
});

test('marginile: înclinarea spre pupa e între 0 și 15°, adusă în plajă fără avertisment; ce nu e număr ia 0', () => {
  const c = (d: Record<string, unknown>) => L.eliceBarcaCote(d);
  assert.deepEqual([c({ pupa: 30 }).pupa, c({ pupa: -5 }).pupa, c({ pupa: 15 }).pupa, c({ pupa: 7.5 }).pupa], [15, 0, 15, 7.5]);
  assert.deepEqual([c({}).pupa, c({ pupa: 'mult' }).pupa, c({ pupa: null }).pupa, c({ pupa: '' }).pupa], [0, 0, 0, 0]);
  assert.deepEqual([c({ pupa: 30 }).urca, c({ pupa: -5 }).urca], [c({ pupa: 15 }).urca, 0]);
  assert.deepEqual(simplu(barca({ pupa: 30 }).avert), []);
  assert.deepEqual(barca({ pupa: 30 }).tri, barca({ pupa: 15 }).tri);
});
