/**
 * Tăietura exactă a frezelor plate la un nivel (ADR 0179, felia 12.1↑e-3, `src/sim/taiereExacta.ts`), pe hârtie: mutări scrise
 * de mână, cu distanțele socotite din geometrie.
 * - linia: distanța la segment minus raza: negativă în urma frezei, 0 pe perete, discul de la capete;
 * - cea mai apropiată mutare câștigă, și când cutia ei e mai departe decât rezultatul de până atunci (dar nu cu raza);
 * - nivelul: o mutare deasupra lui z (și o rampă care trece prin el) nu taie la z, dar taie la un nivel mai sus;
 * - arcul trigonometric și cel orar (același sfert, parcurs invers), cu capetele lui; cercul întreg;
 * - freza în V n-are perete vertical: mutările ei nu intră; fără nicio mutare, +∞;
 * - bisecția găsește trecerea prin zero la sub un micron.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARC_ORAR, ARC_TRIG, LINIE, STRIDE } from '../../src/sim/nucleu.ts';
import { bisectie, functieTaiere, type ProgramMutari } from '../../src/sim/taiereExacta.ts';

/** O mutare a nucleului: felul, A (x, y, z), B (x, y, z) și, la arc, centrul și baleiajul. */
type Mutare = readonly number[];
const mutari = (...m: Mutare[]): Float64Array => {
  const v = new Float64Array(m.length * STRIDE);
  m.forEach((x, k) => x.forEach((q, i) => { v[k * STRIDE + i] = q; }));
  return v;
};
const plata = (diametru: number) => ({ forma: { tip: 'plata' as const }, diametru });
const aproape = (a: number, b: number, ce: string): void => assert.ok(Math.abs(a - b) <= 1e-9, `${ce}: ${a} / ${b}`);

test('linia: distanța la segment minus raza, negativă în urma frezei, 0 pe perete, discul de la capete', () => {
  const f = functieTaiere({ scula: plata(4), mutari: mutari([LINIE, 0, 0, -3, 10, 0, -3]) }, -2);
  aproape(f(5, 3), 1, 'la 3 mm de linie, 1 mm dincolo de perete');
  aproape(f(5, -1), -1, 'la 1 mm de linie, 1 mm în tăietură');
  aproape(f(5, 2), 0, 'pe perete');
  aproape(f(12, 0), 0, 'pe discul de la capăt');
  aproape(f(13, 4), 5 - 2, 'după capăt, distanța la capăt (3, 4, 5)');
});

test('cea mai apropiată mutare câștigă, și când cutia ei e mai departe decât rezultatul de până atunci', () => {
  // Din (5, 5): linia de la y = 0 dă 5 − 2 = 3; cutia liniei de la y = 9 e la 4 (≥ 3), dar linia ei dă 4 − 2 = 2.
  const f = functieTaiere({ scula: plata(4), mutari: mutari([LINIE, 0, 0, -3, 10, 0, -3], [LINIE, 0, 9, -3, 10, 9, -3]) }, -2);
  aproape(f(5, 5), 2, 'linia de la y = 9');
});

test('nivelul: mutarea de deasupra lui z (și rampa care trece prin el) nu taie la z, dar taie mai sus; fără mutări, +∞', () => {
  const p: ProgramMutari = { scula: plata(4), mutari: mutari([LINIE, 0, 0, -3, 10, 0, -3], [LINIE, 0, 10, -1, 10, 10, -1]) };
  aproape(functieTaiere(p, -2)(5, 10), 10 - 2, 'la −2, doar linia de la −3');
  aproape(functieTaiere(p, -0.5)(5, 10), -2, 'la −0,5, și linia de la −1');
  const rampa = functieTaiere({ scula: plata(4), mutari: mutari([LINIE, 0, 0, -1, 10, 0, -3]) }, -2);
  assert.equal(rampa(5, 0), Number.POSITIVE_INFINITY, 'rampa de la −1 la −3 nu e în întregime sub −2');
});

test('arcul: trigonometric și orar (același sfert, parcurs invers), cu capetele lui; cercul întreg', () => {
  // Sfertul de cerc de rază 5 în jurul originii, între (5, 0) și (0, 5), cu freza Ø2.
  const trig = functieTaiere({ scula: plata(2), mutari: mutari([ARC_TRIG, 5, 0, -3, 0, 5, -3, 0, 0, Math.PI / 2]) }, -2);
  const orar = functieTaiere({ scula: plata(2), mutari: mutari([ARC_ORAR, 0, 5, -3, 5, 0, -3, 0, 0, Math.PI / 2]) }, -2);
  for (const [f, ce] of [[trig, 'trigonometric'], [orar, 'orar']] as const) {
    aproape(f(8 * Math.SQRT1_2, 8 * Math.SQRT1_2), 3 - 1, `${ce}: pe bisectoarea sfertului, la 3 mm în afara cercului`);
    aproape(f(0, 0), 5 - 1, `${ce}: în centru`);
    aproape(f(-5, 0), Math.hypot(5, 5) - 1, `${ce}: în afara sfertului, lângă capătul (0, 5)`);
    aproape(f(0, -5), Math.hypot(5, 5) - 1, `${ce}: în afara sfertului, lângă capătul (5, 0)`);
  }
  const cerc = functieTaiere({ scula: plata(2), mutari: mutari([ARC_TRIG, 5, 0, -3, 5, 0, -3, 0, 0, 2 * Math.PI]) }, -2);
  aproape(cerc(-5, 0), -1, 'cercul întreg trece și prin (−5, 0)');
  aproape(cerc(0, -7), 1, 'și la 2 mm sub el');
});

test('freza în V n-are perete vertical: mutările ei nu intră, iar după schimbare intră cele ale frezei plate', () => {
  const v = { forma: { tip: 'v' as const, unghi: 90 }, diametru: 6 };
  const doarV = functieTaiere({ scula: v, mutari: mutari([LINIE, 0, 0, -3, 10, 0, -3]) }, -2);
  assert.equal(doarV(5, 0), Number.POSITIVE_INFINITY);
  const p: ProgramMutari = { scula: v, mutari: mutari([LINIE, 0, 0, -3, 10, 0, -3]), apoi: [{ scula: plata(4), mutari: mutari([LINIE, 0, 10, -3, 10, 10, -3]) }] };
  aproape(functieTaiere(p, -2)(5, 0), 10 - 2, 'doar linia frezei plate, de după schimbare');
});

test('bisecția: trecerea prin zero pe segment, la sub un micron', () => {
  // Cercul de rază 2 taie segmentul de la (0, 0) la (3, 4) în (1,2; 1,6).
  const q = bisectie((x, y) => Math.hypot(x, y) - 2, 0, 0, 3, 4);
  assert.ok(Math.hypot(q[0] - 1.2, q[1] - 1.6) <= 1e-6, `${q.join(', ')}`);
});
