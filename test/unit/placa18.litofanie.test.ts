/**
 * Litofania plăcii 18 (felia 18.1↑i, ADR 0321; `docs/etape/placa-18.md`, partea a doua): fiecare grosime a fișei, prezisă de
 * oracolul independent al simulării (`test/oracles/simulare.ts`) pe exportul de acum, față de hârtie. Placa are 6 mm, iar
 * planul zero e la grosimea ei, deci suprafața e la −6 + t și sub ea rămân t mm. Pe hârtie, în mijlocul fiecărui pătrat:
 * - după T1 (freza plată Ø3, adaosul a = 0,3): pe un plan, exact t + a;
 * - după T2 (bila Ø3, liniile la 0,5): t sub fiecare linie, cu creasta 1,5 − √(1,5² − 0,25²) = 0,021 între ele;
 * - rama (placa din jur) rămâne netăiată; nicăieri sub model; pe material, nicio trecere mai adâncă de 2; nicio mutare nu
 *   coboară mai repede decât avansul de plonjare (300).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';
import { clExact, coborariRepeziO, IndexO, materialSecventaO, pasiDinGcodeO, triunghiuriModel } from '../oracles/relief3d.ts';
import './limbi.ts';
import { FOAIA_LIT, fisiereLitofanie, grilaLitofanie, grosime, LITOFANIE } from '../placi/placa-18/genereaza-litofanie.ts';

const [T1, T2] = (await fisiereLitofanie()).map((f) => f.text) as [string, string];
const PLATA: SculaOracol = { tip: 'plata', diametru: 3 };
const BILA: SculaOracol = { tip: 'bila', diametru: 3 };
const T = FOAIA_LIT.grosime, A = 0.3, R = 1.5, S2 = 0.5;
const CREASTA = R - Math.sqrt(R * R - (S2 / 2) ** 2);

function fereastra(x0: number, y0: number, latime: number, inaltime: number, c: number, div = 4): { g: GrilaOracol; t1: Float64Array; fin: Float64Array; marja: number } {
  const g: GrilaOracol = { x0, y0, latime, inaltime, celula: c };
  const t1 = judeca(T1, g, PLATA, { div }), t2 = judeca(T2, g, BILA, { div });
  return { g, t1: Float64Array.from(t1.z), fin: Float64Array.from(t1.z, (v, i) => Math.min(v, t2.z[i]!)), marja: t1.marja };
}

test('pe hârtie: grosimile pătratelor (0,8, 1,8957, 3) și creasta finisării (0,021)', () => {
  assert.deepEqual([grosime(0), grosime(1), grosime(2)].map((x) => Number(x.toFixed(4))), [0.8, 1.8957, 3]);
  assert.ok(Math.abs(CREASTA - 0.0209) < 1e-4);
});

for (const k of [0, 1, 2]) {
  const x = LITOFANIE.x + 10 + 20 * k, y = LITOFANIE.y + 10, t = grosime(k);
  test(`pătratul ${k + 1} (${x}, ${y}): după T1 grosimea ${(t + A).toFixed(4)}, după T2 ${t.toFixed(4)} sub linii, cu creasta`, () => {
    const f = fereastra(x - 2, y - 2, 4, 4, 0.05);
    let min1 = Infinity, max1 = -Infinity, min2 = Infinity, max2 = -Infinity;
    for (let i = 0; i < f.t1.length; i++) {
      min1 = Math.min(min1, T + f.t1[i]!); max1 = Math.max(max1, T + f.t1[i]!);
      min2 = Math.min(min2, T + f.fin[i]!); max2 = Math.max(max2, T + f.fin[i]!);
    }
    // Cuantizarea dalelor (16 biți pe 2,2 mm) e sub 0,0001; marja oracolului, 0,002.
    assert.ok(Math.abs(min1 - (t + A)) < 0.002 && Math.abs(max1 - (t + A)) < 0.002, `după T1: ${min1} … ${max1}`);
    assert.ok(Math.abs(min2 - t) < 0.002, `după T2, cel mai subțire: ${min2}`);
    assert.ok(max2 > t + CREASTA - 0.005 && max2 < t + CREASTA + 0.005, `după T2, creasta: ${max2}`);
  });
}

test('rama: placa din jurul litofaniei rămâne netăiată (la față), după amândouă', () => {
  for (const [x0, y0, l, h] of [[2, 2, 16, 46], [82, 2, 16, 46], [20, 2, 60, 11], [20, 37, 60, 11]] as const) {
    const f = fereastra(x0, y0, l, h, 0.25, 2);
    let min = Infinity;
    for (const v of f.fin) min = Math.min(min, v);
    assert.equal(min, 0, `la (${x0}, ${y0}): ${min}`);
  }
});

test('nicăieri sub model (la 0,25 mm), după amândouă', () => {
  const { valori, nx, ny } = grilaLitofanie();
  const M = triunghiuriModel(Float64Array.from(valori, (v) => v - T), nx, ny, LITOFANIE.celula);
  for (let k = 0; k < M.length; k += 3) { M[k] = M[k]! + LITOFANIE.x; M[k + 1] = M[k + 1]! + LITOFANIE.y; }
  const ix = new IndexO(M, 2), punct = { fel: 'plata' as const, R: 1e-6 };
  const f = fereastra(LITOFANIE.x, LITOFANIE.y, LITOFANIE.latime, LITOFANIE.inaltime, 0.25, 2);
  const tol = Math.max(f.marja, 0.002) + 1e-3;
  let sub = 0, cel = Infinity;
  for (let k = 0; k < f.fin.length; k++) {
    const nxg = Math.round(LITOFANIE.latime / 0.25), x = LITOFANIE.x + ((k % nxg) + 0.5) * 0.25, y = LITOFANIE.y + (Math.floor(k / nxg) + 0.5) * 0.25;
    const d = f.fin[k]! - clExact(ix, punct, x, y);
    cel = Math.min(cel, d);
    if (d < -tol) sub++;
  }
  assert.equal(sub, 0, `sub model (cel mai jos: ${cel})`);
});

test('pasul pe material: T1, apoi T2, nu intră nicăieri mai adânc de 2; nicio rapidă în placă; coborârea cu avansul de plonjare', () => {
  // Grila de judecată, deplasată cu 0,01 mm: pe grila de 0,25 aliniată, coloana de la y = 15,125 stă fix la raza bilei (1,5)
  // de linia de la y = 16,625, pe ecuator. Bila o atinge acolo doar într-un punct, iar oracolul o ia sau nu după rotunjirea
  // fiecărei mutări (o ratează la trecerile de sus și o prinde la cea de jos: 3,38 mm „tăiați” într-o coloană de lățime zero).
  // Ramura frezei plate a oracolului are deja paza (coloana la 1 µm înăuntru).
  const zona = { x0: 17.01, y0: 12.01, x1: 83.01, y1: 38.01 };
  const m = materialSecventaO([
    { pasi: pasiDinGcodeO(T1), f: { fel: 'plata', R } }, { pasi: pasiDinGcodeO(T2), f: { fel: 'bila', R } },
  ], zona, 0.25, 0, 0.05);
  for (const [k, b] of m.blocuri.entries()) {
    assert.ok(b.taiere <= 2 + 0.06, `T${k + 1}: ${b.taiere} în placă, la ${b.unde?.x}, ${b.unde?.y}`);
    assert.equal(b.rapida, 0, `T${k + 1}: o rapidă în placă`);
  }
  for (const t of [T1, T2]) assert.deepEqual(coborariRepeziO(pasiDinGcodeO(t), 300, 0.01, 0.001).slice(0, 3), []);
});
