/**
 * Profilul frezei pentru siluetă (ADR 0302, felia 16.A↑h-4), pe hârtie: o linie frântă de la vârf, pe axă, până la diametru,
 * cu înălțimea și raza care nu scad; capătul e cel din `inaltimeCon`; punctele bilei, ale colțului toroidalei și ale vârfului
 * conicei stau pe cercurile lor, la pași egali până la capătul arcului, iar flancul conicei urmează unghiul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inaltimeCon, type Freza } from '../../src/model/freza.ts';
import { profilFreza } from '../../src/model/profilFreza.ts';

const BAZA: Freza = { nume: 'F', fel: 'plata', diametru: 6, numar: 1, turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40 };
const FREZE: readonly Freza[] = [
  BAZA, { ...BAZA, fel: 'v', unghi: 60 }, { ...BAZA, fel: 'gravare', diametru: 3.175, unghi: 30, varf: 0.2 },
  { ...BAZA, fel: 'bila' }, { ...BAZA, fel: 'toroidala', raza: 1 }, { ...BAZA, fel: 'conica', unghi: 15, raza: 0.5, diametru: 6.35 },
  { ...BAZA, fel: 'burghiu', unghi: 118 },
];
const aproape = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
/** Pașii unui arc sunt egali: coardele dintre punctele lui la rând au aceeași lungime (un arc oprit mai devreme și legat apoi
 *  cu o coardă lungă de capătul lui ar avea un pas mai mare la urmă). */
function pasiEgali(p: readonly (readonly [number, number])[], cine: string): void {
  const c = p.slice(1).map(([r, h], i) => Math.hypot(r - p[i]![0], h - p[i]![1]));
  for (const x of c) assert.ok(aproape(x, c[0]!, 1e-9), `${cine}: ${c.join(', ')}`);
}

test('de la vârf la diametru: începe pe axă la h = 0, se termină la (R, capătul), fără să scadă', () => {
  for (const f of FREZE) {
    const p = profilFreza(f);
    const R = f.diametru / 2;
    assert.deepEqual(p[0], [0, 0], f.fel);
    const [r1, h1] = p[p.length - 1]!;
    assert.ok(aproape(r1, R) && aproape(h1, inaltimeCon(f)), `${f.fel}: ${r1}, ${h1}`);
    for (let i = 1; i < p.length; i++) {
      assert.ok(p[i]![0] >= p[i - 1]![0] - 1e-12 && p[i]![1] >= p[i - 1]![1] - 1e-12, `${f.fel} la ${i}`);
      assert.ok(p[i]![0] <= R + 1e-12);
    }
  }
});

test('cercurile și flancul, pe hârtie', () => {
  const R = 3;
  const bila = profilFreza(FREZE[3]!);
  assert.ok(bila.length >= 9);
  for (const [r, h] of bila) assert.ok(aproape(r * r + (R - h) ** 2, R * R, 1e-9));
  pasiEgali(bila, 'bila');
  // Toroidala: fundul plat până la R − r, apoi sfertul de cerc cu centrul în (R − r, r).
  const tor = profilFreza(FREZE[4]!);
  assert.deepEqual(tor[1], [2, 0]);
  for (const [r, h] of tor.slice(1)) assert.ok(aproape((r - 2) ** 2 + (1 - h) ** 2, 1, 1e-9));
  pasiEgali(tor.slice(1), 'toroidala');
  // Conica: arcul vârfului, cu centrul în (0, r), până la r·cos α, apoi flancul cu panta cot α.
  const f = FREZE[5]!;
  const a = (7.5 * Math.PI) / 180;
  const con = profilFreza(f);
  const k = con.findIndex(([r]) => aproape(r, 0.5 * Math.cos(a)));
  assert.ok(k > 0);
  for (const [r, h] of con.slice(0, k + 1)) assert.ok(aproape(r * r + (h - 0.5) ** 2, 0.25, 1e-9));
  assert.equal(k, 12);
  pasiEgali(con.slice(0, k + 1), 'conica');
  const [rk, hk] = con[k]!;
  const [rn, hn] = con[con.length - 1]!;
  assert.ok(aproape((hn - hk) / (rn - rk), 1 / Math.tan(a), 1e-9));
  // Burghiul: o singură linie, de la vârf la diametru.
  assert.deepEqual(profilFreza(FREZE[6]!).length, 2);
  // Plata: fundul plat; gravarea: vârful plat, apoi conul.
  assert.deepEqual(profilFreza(BAZA), [[0, 0], [3, 0]]);
  assert.deepEqual(profilFreza(FREZE[2]!).slice(0, 2), [[0, 0], [0.1, 0]]);
});
