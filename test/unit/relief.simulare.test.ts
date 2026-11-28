/**
 * Simularea salvată ca strat (ADR 0322 §5.4, felia 18.1↑g-3): suprafața tăiată, simulată (Z față de fața plăcii, rândul 0 jos,
 * pe blocuri de `bloc` celule), citită pe centrele celulelor reliefului, prin matricea lui pe foaie, și dusă în Z-ul reliefului:
 * z = z_simulat − dz, cu dz ca la lucrare (−planZero, ori −vârful compusului). Valorile așteptate sunt socotite aici, pe hârtie:
 * relieful drept, rotit cu 90°, mărit de două ori, simularea pe blocuri de 2, celulele din afara ferestrei (goale). Apoi cererea
 * workerului reliefului: dalele stratului, cu dz din planul zero dat sau din vârful compusului straturilor vizibile.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reliefInBazin } from '../../src/jobs/bazinRelief.ts';
import { dzRelief, valoriDinSimulare, type SimulareGrila } from '../../src/relief/dinSimulare.ts';
import { hartaDinText } from '../../src/relief/harta.ts';
import { daleDinHarta, grilaDinDale, stratDinGrila } from '../../src/relief/strat.ts';

/** Fereastra simulată cu z(px, py) dat, rândul 0 jos. */
function fereastra(x0: number, y0: number, celula: number, bloc: number, latime: number, inaltime: number, z: (px: number, py: number) => number): SimulareGrila {
  const v = new Float32Array(latime * inaltime);
  for (let py = 0; py < inaltime; py++) for (let px = 0; px < latime; px++) v[py * latime + px] = z(px, py);
  return { x0, y0, celula, bloc, latime, inaltime, z: v };
}
const Z = (px: number, py: number): number => -(px + 10 * py) / 8;

test('relieful drept, aliniat cu fereastra: fiecare celulă ia pixelul ei, minus dz', () => {
  // Relieful 4 × 3 de 0,5 mm în (10, 20); fereastra pornește acolo, cu celula 0,5 și blocul 1.
  const s = fereastra(10, 20, 0.5, 1, 4, 3, Z);
  const v = valoriDinSimulare({ nx: 4, ny: 3, celula: 0.5 }, { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }, -2, s);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) assert.equal(v[j * 4 + i], Math.fround(Math.fround(Z(i, j)) + 2), `(${i}, ${j})`);
});

test('decalat cu un sfert de milimetru față de pixeli: centrul celulei decide pixelul, nu colțul ei', () => {
  // Relieful 3 × 2 de 0,5 mm în (0,25, 0,25); fereastra de 0,5 mm în (0, 0). Colțul celulei (i, j) e la 0,25 + 0,5·i, în
  // pixelul i; centrul, la 0,5 + 0,5·i, în pixelul i + 1 (la fel pe y).
  const s = fereastra(0, 0, 0.5, 1, 4, 3, Z);
  const v = valoriDinSimulare({ nx: 3, ny: 2, celula: 0.5 }, { a: 1, b: 0, c: 0, d: 1, e: 0.25, f: 0.25 }, 0, s);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) assert.equal(v[j * 3 + i], Math.fround(Z(i + 1, j + 1)), `(${i}, ${j})`);
});

test('rotit cu 90° (în sens trigonometric): celula (i, j) e în lume la (e − (j + ½)c, f + (i + ½)c)', () => {
  // Matricea (a, b, c, d) = (0, 1, −1, 0): x' = −y + e, y' = x + f. Relieful 3 × 2, c = 1, în (10, 0): x' ∈ [8, 10], y' ∈ [0, 3].
  const s = fereastra(8, 0, 1, 1, 2, 3, Z);
  const v = valoriDinSimulare({ nx: 3, ny: 2, celula: 1 }, { a: 0, b: 1, c: -1, d: 0, e: 10, f: 0 }, 0, s);
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 3; i++) {
      const x = 10 - (j + 0.5), y = i + 0.5, px = Math.floor(x - 8), py = Math.floor(y);
      assert.equal(v[j * 3 + i], Math.fround(Z(px, py)), `(${i}, ${j}) → pixelul (${px}, ${py})`);
    }
  }
});

test('mărit de două ori și simulat pe blocuri de 2: celula de 0,5 a reliefului e de 1 mm pe foaie, iar pixelul e de 2 × 0,5 mm', () => {
  // Relieful 4 × 4 de 0,5 mm, cu matricea 2·I în (0, 0): pe foaie, 4 × 4 mm; fereastra de 0,5 mm pe blocuri de 2: pixelul de 1 mm.
  const s = fereastra(0, 0, 0.5, 2, 4, 4, Z);
  const v = valoriDinSimulare({ nx: 4, ny: 4, celula: 0.5 }, { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }, 1, s);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) assert.equal(v[j * 4 + i], Math.fround(Math.fround(Z(i, j)) - 1), `(${i}, ${j})`);
});

test('celulele din afara ferestrei sunt goale (NaN), nu marginea întinsă și nici pixelul din rândul vecin', () => {
  // Relieful 4 × 2 de 1 mm în (0, 0); fereastra acoperă doar x ∈ [1, 3), pe ambele rânduri (un index fără margini ar lua, în
  // dreapta rândului de jos, primul pixel al rândului de sus).
  const s = fereastra(1, 0, 1, 1, 2, 2, (px, py) => -1 - px - 2 * py);
  const v = Array.from(valoriDinSimulare({ nx: 4, ny: 2, celula: 1 }, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, 0, s));
  for (const k of [0, 3, 4, 7]) assert.ok(Number.isNaN(v[k]), `[${k}] ${v[k]}`);
  assert.deepEqual([v[1], v[2], v[5], v[6]], [-1, -2, -3, -4]);
});

test('dz ca la lucrare: −planZero, ori −vârful compusului (planul zero lipsă); un compus gol, 0', () => {
  assert.equal(dzRelief(3, Float32Array.of(1, 7, 2)), -3);
  assert.equal(dzRelief(undefined, Float32Array.of(1, 7, NaN, 2)), -7);
  assert.equal(dzRelief(undefined, Float32Array.of(NaN, NaN)), 0);
});

/** Straturile de desenat ale unui relief făcut din valori (ca în panou). */
async function strat(valori: ArrayLike<number>, nx: number, ny: number): Promise<{ mod: 'aduna'; vizibil: true; harta: string; octeti: Record<string, Uint8Array<ArrayBuffer>> }> {
  const st = await stratDinGrila(valori, nx, ny), octeti: Record<string, Uint8Array<ArrayBuffer>> = {};
  for (const [h, o] of st.octeti) octeti[h] = o;
  return { mod: 'aduna', vizibil: true, harta: st.text, octeti };
}

test('cererea workerului: stratul din simulare, cu dz din vârful compusului sau din planul zero dat', async () => {
  // Relieful 4 × 2 de 1 mm, cu vârful la 5: simularea, „tăiată” la −1 … −4 (față de fața plăcii).
  const model = await strat(Float32Array.of(5, 4, 3, 2, 1, 1, 1, 1), 4, 2);
  const s = fereastra(0, 0, 1, 1, 4, 2, (px, py) => -1 - px - 0 * py);
  const cere = (planZero?: number): ReturnType<typeof reliefInBazin> => reliefInBazin({
    tip: 'din-simulare', nx: 4, ny: 2, celula: 1, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, straturi: [model], simulare: s,
    ...(planZero !== undefined ? { planZero } : {}),
  });
  const citeste = async (r: Awaited<ReturnType<typeof reliefInBazin>>): Promise<number[]> => {
    if (!r.ok || r.tip !== 'din-imagine') assert.fail(JSON.stringify(r));
    assert.deepEqual([r.nx, r.ny, r.celula], [4, 2, 1]);
    const d = daleDinHarta(hartaDinText(r.harta)!, (a) => r.octeti[a]);
    if (!d.ok) assert.fail('dale');
    return Array.from(grilaDinDale(4, 2, d.dale));
  };
  // Fără plan zero: vârful compusului (5) la față, deci z = z_sim + 5.
  const fara = await citeste(await cere());
  [4, 3, 2, 1, 4, 3, 2, 1].forEach((x, k) => { assert.ok(Math.abs((fara[k] ?? 0) - x) < 1e-3, `[${k}] ${fara[k]} față de ${x}`); });
  // Cu planul zero la 6 sub față: z = z_sim + 6.
  const cu = await citeste(await cere(6));
  [5, 4, 3, 2, 5, 4, 3, 2].forEach((x, k) => { assert.ok(Math.abs((cu[k] ?? 0) - x) < 1e-3, `[${k}] ${cu[k]} față de ${x}`); });
  // Un strat ascuns nu intră în vârful compusului (ca la lucrare): cu el ascuns, compusul e gol, deci dz = 0.
  const ascuns = await reliefInBazin({
    tip: 'din-simulare', nx: 4, ny: 2, celula: 1, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, straturi: [{ ...model, vizibil: false }], simulare: s,
  });
  const z0 = await citeste(ascuns);
  [-1, -2, -3, -4].forEach((x, k) => { assert.ok(Math.abs((z0[k] ?? 0) - x) < 1e-3, `[${k}] ${z0[k]} față de ${x}`); });
});
