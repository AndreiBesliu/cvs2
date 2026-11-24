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
  // Profilurile (16.A↑h-5): rotunjirea R3 pe Ø12, ogee-ul R3 pe Ø18, ogee-ul roman R3 cu treapta 1,5 pe Ø21, panoul 12° pe
  // 2" cu fundul plat 1/4", fără și cu scobitura R6,35.
  { ...BAZA, fel: 'rotunjire', diametru: 12, raza: 3 }, { ...BAZA, fel: 'ogee', diametru: 18, raza: 3 },
  { ...BAZA, fel: 'ogee-roman', diametru: 21, raza: 3, treapta: 1.5 },
  { ...BAZA, fel: 'panou', diametru: 50.8, unghi: 12, varf: 6.35 }, { ...BAZA, fel: 'panou', diametru: 50.8, unghi: 12, varf: 6.35, raza: 6.35 },
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

test('profilurile (16.A↑h-5), pe hârtie: arcele pe cercurile lor, la pași egali, treptele și teșitura panoului', () => {
  const pe = (c: readonly [number, number], r: number, p: readonly (readonly [number, number])[], cine: string): void => {
    for (const [x, y] of p) assert.ok(aproape((x - c[0]) ** 2 + (y - c[1]) ** 2, r * r, 1e-9), `${cine}: ${x}, ${y}`);
  };
  // Rotunjirea R3 pe Ø12: fundul până la R − r = 3, apoi sfertul de cerc cu centrul în (R, 0), tangent vertical jos și
  // orizontal sus, până la (6, 3).
  const rot = profilFreza(FREZE[7]!);
  assert.deepEqual(rot.slice(0, 2), [[0, 0], [3, 0]]);
  pe([6, 0], 3, rot.slice(1), 'rotunjirea');
  pasiEgali(rot.slice(1), 'rotunjirea');
  assert.ok(rot[2]![0] - 3 < 0.15 * rot[2]![1], 'tangenta verticală jos: urcă mult mai repede decât iese');
  // Ogee-ul R3 pe Ø18: fundul până la 3, arcul de jos cu centrul în (6, 0) până la (6, 3), arcul de sus cu centrul în (6, 6)
  // până la (9, 6).
  const og = profilFreza(FREZE[8]!);
  assert.deepEqual(og.slice(0, 2), [[0, 0], [3, 0]]);
  const k = og.findIndex(([x, y]) => aproape(x, 6) && aproape(y, 3));
  assert.ok(k > 1);
  pe([6, 0], 3, og.slice(1, k + 1), 'ogee jos');
  pe([6, 6], 3, og.slice(k), 'ogee sus');
  pasiEgali(og.slice(1, k + 1), 'ogee jos');
  pasiEgali(og.slice(k), 'ogee sus');
  assert.ok(aproape(og[og.length - 1]![0], 9) && aproape(og[og.length - 1]![1], 6));
  // Ogee-ul roman: ρ0 = 10,5 − 6 − 1,5 = 3; treapta în sus până la (3, 1,5), arcele (centrele (6, 1,5) și (6, 7,5)), apoi
  // treapta în afară de la (9, 7,5) la (10,5, 7,5).
  const ogr = profilFreza(FREZE[9]!);
  assert.deepEqual(ogr.slice(0, 3), [[0, 0], [3, 0], [3, 1.5]]);
  const n = ogr.length;
  assert.ok(aproape(ogr[n - 2]![0], 9) && aproape(ogr[n - 2]![1], 7.5));
  assert.deepEqual(ogr[n - 1], [10.5, 7.5]);
  const m = ogr.findIndex(([x, y]) => aproape(x, 6) && aproape(y, 4.5));
  pe([6, 1.5], 3, ogr.slice(2, m + 1), 'roman jos');
  pe([6, 7.5], 3, ogr.slice(m, n - 1), 'roman sus');
  // Panoul fără scobitură: fundul plat până la 3,175, apoi teșitura cu panta tan 12°.
  const b = (12 * Math.PI) / 180;
  const pan = profilFreza(FREZE[10]!);
  assert.equal(pan.length, 3);
  assert.deepEqual(pan[1], [3.175, 0]);
  assert.ok(aproape((pan[2]![1] - pan[1]![1]) / (pan[2]![0] - pan[1]![0]), Math.tan(b)));
  // Cu scobitura R6,35: arcul cu centrul în (a, r), de la fund până unde tangenta lui e teșitura, apoi teșitura.
  const panr = profilFreza(FREZE[11]!);
  assert.deepEqual(panr[1], [3.175, 0]);
  const capArc = [3.175 + 6.35 * Math.sin(b), 6.35 * (1 - Math.cos(b))] as const;
  const j = panr.findIndex(([x, y]) => aproape(x, capArc[0]) && aproape(y, capArc[1]));
  assert.ok(j > 1, 'capătul scobiturii');
  pe([3.175, 6.35], 6.35, panr.slice(1, j + 1), 'scobitura');
  pasiEgali(panr.slice(1, j + 1), 'scobitura');
  const [xn, yn] = panr[panr.length - 1]!;
  assert.ok(aproape((yn - capArc[1]) / (xn - capArc[0]), Math.tan(b)));
});
