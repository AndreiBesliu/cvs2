import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aliniaza, minimAliniere, type Ales } from '../../src/geom/aliniere.ts';
import { lipeste, tinteCutie, tinteDin, tintePunct, type TintaLipire } from '../../src/geom/lipire.ts';

/** Lipirea și alinierea (ADR 0050 §2–§3), cu centrarea pe foaie (ADR 0110), pure, cu valori pe hârtie. */

const C = (minX: number, minY: number, maxX: number, maxY: number) => ({ minX, minY, maxX, maxY });
const FOAIE = C(0, 0, 300, 200);
const fara = { toleranta: 1, grila: null };
const ghidajX = (poz: number): TintaLipire => ({ axa: 'x', poz, de: -Infinity, la: Infinity, fel: 'ghidaj' });
const ghidajY = (poz: number): TintaLipire => ({ axa: 'y', poz, de: -Infinity, la: Infinity, fel: 'ghidaj' });

test('o margine a cutiei se lipește de un ghidaj din toleranță; din afara ei, nu', () => {
  const t = tinteDin([ghidajX(100)]);
  const cutie = C(10, 10, 30, 20);
  // Marginea din dreapta ajunge la 99,4 (dx = 69,4): se lipește la 100.
  assert.deepEqual(lipeste(t, cutie, 69.4, 0, fara).dx, 70);
  // La 1,2 mm de ghidaj: prea departe pentru toleranța de 1 mm.
  assert.equal(lipeste(t, cutie, 68.8, 0, fara).dx, 68.8);
  // Mijlocul (20 + dx) se lipește și el: dx = 79,7 → mijlocul la 99,7 → 100.
  assert.equal(lipeste(t, cutie, 79.7, 0, fara).dx, 80);
  // Axa y nu e atinsă de un ghidaj vertical.
  assert.equal(lipeste(t, cutie, 69.4, 3.3, fara).dy, 3.3);
});

test('pe fiecare axă separat, cu liniile de aliniere până la cutia mutată', () => {
  const t = tinteDin([ghidajX(100), ghidajY(50)]);
  const r = lipeste(t, C(0, 0, 10, 10), 89.5, 39.6, fara);
  assert.deepEqual([r.dx, r.dy], [90, 40]);
  assert.deepEqual(r.linii.map((l) => [l.axa, l.poz, l.fel]), [['x', 100, 'ghidaj'], ['y', 50, 'ghidaj']]);
  // Linia unui ghidaj e întinsă pe toată pânza (infinit), indiferent de cutie.
  assert.deepEqual([r.linii[0]?.de, r.linii[0]?.la], [-Infinity, Infinity]);
});

test('cea mai apropiată țintă câștigă; linia unei forme se întinde de la formă până la cutia mutată', () => {
  const alta = C(200, 100, 260, 150);
  const t = tinteDin([...tinteCutie(alta, 'forma'), ...tinteCutie(FOAIE, 'foaie')]);
  // Marginea stângă a cutiei mutate (0 + dx) la 199,6: forma (200) e mai aproape decât nimic altceva.
  const r = lipeste(t, C(0, 0, 20, 10), 199.6, 0, fara);
  assert.equal(r.dx, 200);
  const l = r.linii.find((x) => x.axa === 'x');
  assert.deepEqual([l?.poz, l?.fel, l?.de, l?.la], [200, 'forma', 0, 150], 'de la cutia mutată (y 0–10) până la formă (y 100–150)');
  // Două ținte atinse deodată (marginea pe formă, mijlocul pe mijlocul foii): se arată amândouă.
  const t2 = tinteDin([...tinteCutie(FOAIE, 'foaie'), ghidajX(200)]);
  const r2 = lipeste(t2, C(0, 0, 100, 10), 100.4, 0, fara);
  assert.equal(r2.dx, 100);
  assert.deepEqual(r2.linii.filter((x) => x.axa === 'x').map((x) => [x.poz, x.fel]).sort(), [[150, 'foaie'], [200, 'ghidaj']]);
  // Mijlocul foii (150) prinde mijlocul cutiei.
  assert.equal(lipeste(t, C(0, 0, 20, 10), 139.5, 0, fara).dx, 140);
});

test('grila: multiplii pasului; la egalitate, o țintă scrisă bate grila', () => {
  const g = { toleranta: 1, grila: 10 };
  assert.equal(lipeste(tinteDin([]), C(0, 0, 0, 0), 23.4, 0, g).dx, 23.4, 'un punct la 3,4 mm de grilă: prea departe');
  assert.equal(lipeste(tinteDin([]), C(0, 0, 0, 0), 29.3, 0, g).dx, 30);
  const r = lipeste(tinteDin([ghidajX(30)]), C(0, 0, 0, 0), 29.3, 0, g);
  assert.equal(r.dx, 30);
  assert.equal(r.linii[0]?.fel, 'ghidaj');
  assert.equal(lipeste(tinteDin([]), C(0, 0, 0, 0), 29.3, 0, fara).dx, 29.3, 'grila oprită');
});

test('un punct (min = max) se lipește singur; capetele căilor deschise sunt ținte pe ambele axe', () => {
  const t = tinteDin(tintePunct(42, 17, 'forma'));
  const r = lipeste(t, C(5, 5, 5, 5), 36.7, 12.4, fara);
  assert.deepEqual([r.dx, r.dy], [37, 12]);
});

test('ținte multe: căutarea binară găsește vecinul corect (și pe marginile listei)', () => {
  const t = tinteDin(Array.from({ length: 10_001 }, (_, k) => ghidajX(k * 0.5)));
  assert.equal(lipeste(t, C(0, 0, 0, 0), 1234.46, 0, { toleranta: 0.1, grila: null }).dx, 1234.5);
  assert.equal(lipeste(t, C(0, 0, 0, 0), 1234.26, 0, { toleranta: 0.1, grila: null }).dx, 1234.26, 'la 0,24 de ambii vecini: nimic');
  assert.equal(lipeste(t, C(0, 0, 0, 0), -0.05, 0, { toleranta: 0.1, grila: null }).dx, 0);
  assert.equal(lipeste(t, C(0, 0, 0, 0), 5000.04, 0, { toleranta: 0.1, grila: null }).dx, 5000);
  assert.equal(lipeste(tinteDin([]), C(0, 0, 1, 1), 3, 4, fara).dx, 3, 'fără ținte, nimic');
});

const a = (id: string, minX: number, minY: number, maxX: number, maxY: number): Ales => ({ id, cutie: C(minX, minY, maxX, maxY) });

test('alinierea față de cutia comună: stânga, centrul, dreapta, jos, mijlocul, sus', () => {
  const alese = [a('p', 10, 10, 30, 20), a('q', 50, 40, 60, 80)];
  assert.deepEqual(aliniaza(alese, 'stanga', FOAIE), [{ id: 'q', dx: -40, dy: 0 }]);
  assert.deepEqual(aliniaza(alese, 'dreapta', FOAIE), [{ id: 'p', dx: 30, dy: 0 }]);
  assert.deepEqual(aliniaza(alese, 'centru-x', FOAIE), [{ id: 'p', dx: 15, dy: 0 }, { id: 'q', dx: -20, dy: 0 }]);
  assert.deepEqual(aliniaza(alese, 'jos', FOAIE), [{ id: 'q', dx: 0, dy: -30 }]);
  assert.deepEqual(aliniaza(alese, 'sus', FOAIE), [{ id: 'p', dx: 0, dy: 60 }]);
  assert.deepEqual(aliniaza(alese, 'centru-y', FOAIE), [{ id: 'p', dx: 0, dy: 30 }, { id: 'q', dx: 0, dy: -15 }]);
});

test('un singur lucru se aliniază față de foaie; prea puține pentru distribuire = nimic; deja aliniate = nimic', () => {
  assert.deepEqual(aliniaza([a('p', 10, 10, 30, 20)], 'centru-x', FOAIE), [{ id: 'p', dx: 130, dy: 0 }]);
  assert.deepEqual(aliniaza([a('p', 10, 10, 30, 20)], 'sus', FOAIE), [{ id: 'p', dx: 0, dy: 180 }]);
  assert.deepEqual(aliniaza([a('p', 0, 10, 30, 20)], 'stanga', FOAIE), []);
  assert.deepEqual(aliniaza([a('p', 0, 0, 1, 1), a('q', 5, 0, 6, 1)], 'distribuie-x', FOAIE), []);
  assert.equal(minimAliniere('distribuie-y'), 3);
  assert.equal(minimAliniere('stanga'), 1);
});

test('centrarea pe foaie (ADR 0110): o formă, pe ambele axe dintr-o dată; mai multe, ca un bloc (aceeași deplasare)', () => {
  // Foaia 300 × 200, centrul (150, 100). O formă 20 × 10 din (10, 10): centrul (20, 15) → (150, 100).
  assert.deepEqual(aliniaza([a('p', 10, 10, 30, 20)], 'centru-foaie', FOAIE), [{ id: 'p', dx: 130, dy: 85 }]);
  // Două forme: cutia comună (0, 0)–(60, 40), centrul (30, 20) → amândouă cu (120, 80); așezarea dintre ele rămâne.
  assert.deepEqual(aliniaza([a('p', 0, 0, 10, 10), a('q', 40, 20, 60, 40)], 'centru-foaie', FOAIE),
    [{ id: 'p', dx: 120, dy: 80 }, { id: 'q', dx: 120, dy: 80 }]);
  // Un bloc deja centrat nu se mișcă, deși formele lui nu sunt fiecare în centru.
  assert.deepEqual(aliniaza([a('p', 100, 80, 120, 90), a('q', 180, 110, 200, 120)], 'centru-foaie', FOAIE), []);
  // Pe o singură axă deja centrat: doar cealaltă se schimbă; ieșit din foaie: tot în centru.
  assert.deepEqual(aliniaza([a('p', 140, 0, 160, 10)], 'centru-foaie', FOAIE), [{ id: 'p', dx: 0, dy: 95 }]);
  assert.deepEqual(aliniaza([a('p', -500, 300, -400, 400)], 'centru-foaie', FOAIE), [{ id: 'p', dx: 600, dy: -250 }]);
  // Pe o foaie care nu pleacă din origine, centrul ei.
  assert.deepEqual(aliniaza([a('p', 0, 0, 10, 10)], 'centru-foaie', C(100, 50, 200, 150)), [{ id: 'p', dx: 145, dy: 95 }]);
  assert.equal(minimAliniere('centru-foaie'), 1);
  assert.deepEqual(aliniaza([], 'centru-foaie', FOAIE), []);
});

test('distribuirea: golurile egale, primul și ultimul pe loc, după poziție (nu după ordinea alegerii)', () => {
  // Lățimi 10, 20, 10; de la 0 la 100: golurile (100 − 40) / 2 = 30.
  const alese = [a('ultim', 90, 0, 100, 5), a('mijloc', 20, 0, 40, 5), a('prim', 0, 0, 10, 5)];
  assert.deepEqual(aliniaza(alese, 'distribuie-x', FOAIE), [{ id: 'mijloc', dx: 20, dy: 0 }]);
  const v = [a('a', 0, 0, 5, 10), a('b', 0, 12, 5, 14), a('c', 0, 30, 5, 40), a('d', 0, 90, 5, 100)];
  // Înălțimi 10 + 2 + 10 + 10 = 32; de la 0 la 100: goluri (100 − 32) / 3 = 22,67.
  const r = aliniaza(v, 'distribuie-y', FOAIE);
  const g = 68 / 3;
  assert.deepEqual(r.map((x) => x.id), ['b', 'c']);
  assert.ok(Math.abs((r[0]?.dy ?? 0) - (10 + g - 12)) < 1e-12);
  assert.ok(Math.abs((r[1]?.dy ?? 0) - (10 + g + 2 + g - 30)) < 1e-12);
});
