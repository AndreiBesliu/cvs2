/**
 * Placa reliefului (placa 18; `docs/etape/placa-18.md`, felia 18.1↑d-2, ADR 0310 §13, ADR 0312, ADR 0313): fiecare cotă a
 * fișei, prezisă de oracolul independent al simulării (`test/oracles/simulare.ts`) pe exportul de acum, față de valoarea pe
 * hârtie și toleranța ei. Relieful e cel din generator (`inaltime`), cu vârful calotei la fața plăcii; zmax e vârful lui pe
 * grila de 0,25 mm (o celulă lângă centrul calotei: 7,999), deci fundul e la −zmax. Pe hârtie:
 * - după T1 (degroșarea, freza plată Ø6, adaosul a = 0,5): pe fund și pe platou, exact a deasupra modelului; la mijlocul rampei
 *   (g = 0,3, liniile de-a lungul ei, la s = 2,5), între a · (1 + g) = 0,65 și 0,65 + g · (R − √(R² − (s / 2)²)) + 2 · h · g =
 *   0,769 (h = 0,0625, celula de calcul; ADR 0313 §3);
 * - după T2 (finisarea, bila Ø6, liniile la 1,5): pe model, cu creasta 3 − √(3² − 0,75²) = 0,0953 între linii;
 * - vârful calotei rămâne la fața plăcii; buzunarul are la față 79,88 × 50,00 (peretele păstrat: la capetele liniilor rămân
 *   cel mult 0,0625 pe perete; pe pereții paraleli cu liniile, muchia de sus e rotunjită de bilă);
 * - nicăieri sub model (pe toată placa, la 0,25 mm); pe material, nicio trecere mai adâncă de 3 (oracolul 3D, pe G-code); nicio
 *   mutare nu coboară mai repede decât avansul de plonjare (300).
 * Timpul fiecărui fișier, estimat pe GRBL 1.1h din fabrică, îl compară cronometrul (±10 %).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';
import { estimeazaTimp } from '../../src/sim/timp.ts';
import { judeca, type GrilaOracol, type RezultatOracol, type SculaOracol } from '../oracles/simulare.ts';
import { clExact, coborariRepeziO, IndexO, materialSecventaO, pasiDinGcodeO, triunghiuriModel } from '../oracles/relief3d.ts';
import './limbi.ts';
import { fisierePlaca18, grila, inaltime, RELIEF } from '../placi/placa-18/genereaza.ts';

// Pe exportul proaspăt, ca la placa 11: o schimbare în generator sau în CAM cade pe cote, nu doar pe octeți (fișierele de aur
// le judecă `placa18.aur.test.ts`).
const [T1, T2] = (await fisierePlaca18()).map((f) => f.text) as [string, string];
const PLATA: SculaOracol = { tip: 'plata', diametru: 6 };
const BILA: SculaOracol = { tip: 'bila', diametru: 6 };
const A = 0.5, R = 3, G = 0.3, S1 = 2.5, S2 = 1.5, H = 0.0625;
const CREASTA = R - Math.sqrt(R * R - (S2 / 2) ** 2);
const ZMAX = (() => { let m = -Infinity; for (const v of grila().valori) m = Math.max(m, v); return m; })();
/** Modelul în coordonatele foii: Z sub fața plăcii. */
const model = (x: number, y: number): number => inaltime(x - RELIEF.x, y - RELIEF.y) - ZMAX;

type Fereastra = { readonly g: GrilaOracol; readonly t1: RezultatOracol; readonly fin: Float64Array };
/** Lemnul după T1 și după T1 + T2 (minimul celor două) pe o fereastră, cu celula `c`. */
function fereastra(x0: number, y0: number, latime: number, inaltimeF: number, c: number, div = 4): Fereastra {
  const g: GrilaOracol = { x0, y0, latime, inaltime: inaltimeF, celula: c };
  const t1 = judeca(T1, g, PLATA, { div }), t2 = judeca(T2, g, BILA, { div });
  return { g, t1, fin: t1.z.map((v, i) => Math.min(v, t2.z[i]!)) };
}
const centru = (f: Fereastra, x: number, y: number): number => {
  const i = Math.floor((x - f.g.x0) / f.g.celula), j = Math.floor((y - f.g.y0) / f.g.celula);
  return j * f.t1.nx + i;
};
const xy = (f: Fereastra, k: number): [number, number] => [f.g.x0 + ((k % f.t1.nx) + 0.5) * f.g.celula, f.g.y0 + (Math.floor(k / f.t1.nx) + 0.5) * f.g.celula];
/** Lemnul de deasupra modelului, pe fereastră: cel mai puțin și cel mai mult. */
function peste(f: Fereastra, z: ArrayLike<number>): { readonly min: number; readonly max: number } {
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < z.length; k++) { const [x, y] = xy(f, k); const d = Number(z[k]) - model(x, y); min = Math.min(min, d); max = Math.max(max, d); }
  return { min, max };
}

test('pe hârtie: vârful reliefului pe grila de 0,25 (zmax 7,999) și creasta 0,0953', () => {
  assert.ok(ZMAX > 7.998 && ZMAX < 8, `zmax ${ZMAX}`);
  assert.ok(Math.abs(CREASTA - 0.0953) < 1e-4);
});

for (const [nume, x, y, h] of [['fundul', 38, 33, 0], ['platoul', 100, 50, 6]] as const) {
  test(`${nume} (${x}, ${y}): după T1 la ${(ZMAX - h - A).toFixed(2)} sub față (adaosul 0,5), după T2 pe model, cu creasta între linii`, () => {
    const f = fereastra(x - 2, y - 2, 4, 4, 0.05);
    // T1: freza plată pe un plan, exact a deasupra (oracolul, cu marja lui).
    const d1 = peste(f, f.t1.z);
    assert.ok(Math.abs(d1.min - A) < 0.002 && Math.abs(d1.max - A) < 0.002, `${nume}, după T1: ${d1.min} … ${d1.max}`);
    assert.ok(Math.abs(f.t1.z[centru(f, x, y)]! - (h - ZMAX + A)) < 0.002);
    // T2: pe model sub fiecare linie, cu creasta între ele (liniile la 1,5 pe Y, deci pe 4 mm cel puțin două creste).
    const d2 = peste(f, f.fin);
    assert.ok(d2.min > -0.002 && d2.min < 0.002, `${nume}, după T2, cel mai jos: ${d2.min}`);
    assert.ok(d2.max > CREASTA - 0.01 && d2.max < CREASTA + 0.005, `${nume}, după T2, creasta: ${d2.max}`);
  });
}

test('lângă pereți, după T1: pe fund, aproape de perete, tot adaosul (și pe pereții paraleli cu liniile)', () => {
  // Liniile degroșării stau pe zona în care freza are voie (ADR 0313 §3): la R + a = 3,5 de perete, pe prima celulă (3,625),
  // deci freza scoate lemnul până la 0,625 de pereții paraleli cu liniile: coloana x = 70 (pe fund), de la y 25,75 la 27 și de
  // la 73 la 74,25. La capetele liniilor, între două linii, capătul rotund al frezei lasă o scobitură de cel mult
  // R − √(R² − (s / 2)²) = 0,273 peste a (plus o celulă de calcul): rândul y = 30, de la x 31 la 32.
  const scobitura = R - Math.sqrt(R * R - (S1 / 2) ** 2);
  assert.ok(Math.abs(scobitura - 0.273) < 1e-3 && 30 + A + scobitura + H < 31);
  for (const [x0, y0, l, h] of [[69.9, 25.75, 0.2, 1.25], [69.9, 73, 0.2, 1.25], [31, 29.9, 1, 0.2]] as const) {
    const f = fereastra(x0, y0, l, h, 0.05);
    const d = peste(f, f.t1.z);
    assert.ok(Math.abs(d.min - A) < 0.002 && Math.abs(d.max - A) < 0.002, `lângă perete, la (${x0}, ${y0}): ${d.min} … ${d.max}`);
  }
});

test('rampa, la mijloc (85, 50): după T1 între a · (1 + g) și marginea de sus, după T2 pe model cu creasta', () => {
  const f = fereastra(83, 48, 4, 4, 0.05);
  const sus = A * (1 + G) + G * (R - Math.sqrt(R * R - (S1 / 2) ** 2)) + 2 * H * G;
  const k = centru(f, 85, 50), d1 = f.t1.z[k]! - model(85, 50);
  assert.ok(d1 >= A * (1 + G) - 0.002 && d1 <= sus + 0.002, `rampa după T1: ${d1} (între ${A * (1 + G)} și ${sus})`);
  // Adâncimea de măsurat, față de fața plăcii: cu ce prezice oracolul aici.
  assert.ok(Math.abs(-f.t1.z[k]! - 4.25) < 0.02, `adâncimea după T1: ${-f.t1.z[k]!}`);
  const d2 = peste(f, f.fin);
  assert.ok(d2.min > -0.002 && d2.max < CREASTA + 2 * H * G + 0.005, `rampa după T2: ${d2.min} … ${d2.max}`);
});

test('vârful calotei (52, 50) rămâne la fața plăcii, după amândouă', () => {
  const f = fereastra(51, 49, 2, 2, 0.05);
  let max = -Infinity;
  for (const v of f.fin) max = Math.max(max, v);
  assert.ok(max === 0, `cel mai sus pe vârf: ${max}`);
  assert.ok(f.fin[centru(f, 52.125, 50.125)]! > -0.01);
});

test('buzunarul, la fața plăcii: 79,88 pe X (rândul y = 30) și 50,00 pe Y (coloana x = 70); 0,06 de lemn pe pereții capetelor', () => {
  // Peretele păstrat (ADR 0312 §2): bila nu atinge fața din jur, deci la capetele liniilor centrul ei stă la peste R de perete,
  // pe celula de calcul: rămân cel mult h = 0,0625 pe fiecare perete (80 − 2 · 0,0625 = 79,875). Pe pereții paraleli cu liniile,
  // linia de la 1,625 de perete rotunjește muchia de sus, deci la față măsura e 50.
  const lat = (f: Fereastra, peX: boolean): number => {
    let n = 0;
    for (let k = 0; k < f.fin.length; k++) if (f.fin[k]! < -0.005) n++;
    return (n * f.g.celula) / (peX ? f.t1.ny : f.t1.nx);
  };
  const rand = fereastra(26, 29.99, 88, 0.02, 0.02, 2), coloana = fereastra(69.99, 21, 0.02, 58, 0.02, 2);
  assert.ok(Math.abs(lat(rand, true) - 79.88) <= 0.03, `pe X: ${lat(rand, true)}`);
  assert.ok(Math.abs(lat(coloana, false) - 50) <= 0.03, `pe Y: ${lat(coloana, false)}`);
});

test('nicăieri sub model, pe tot relieful (la 0,25 mm), după amândouă; și nimic tăiat în afara buzunarului', () => {
  // Modelul exact (ADR 0310 §4): triunghiurile prin centrele celulelor grilei, cu vârful la fața plăcii, în locul lui pe foaie.
  const { valori, nx, ny } = grila();
  const T = triunghiuriModel(Float64Array.from(valori, (v) => v - ZMAX), nx, ny, RELIEF.celula);
  for (let k = 0; k < T.length; k += 3) { T[k] = T[k]! + RELIEF.x; T[k + 1] = T[k + 1]! + RELIEF.y; }
  const ix = new IndexO(T, 2), punct = { fel: 'plata' as const, R: 1e-6 };
  const f = fereastra(28, 23, 84, 54, 0.25, 2);
  const tol = Math.max(f.t1.marja, 0.002) + 1e-3;
  let sub = 0, unde: [number, number] | null = null, afara = 0, cel = Infinity;
  for (let k = 0; k < f.fin.length; k++) {
    const [x, y] = xy(f, k);
    const inauntru = x > RELIEF.x && x < RELIEF.x + RELIEF.latime && y > RELIEF.y && y < RELIEF.y + RELIEF.inaltime;
    if (!inauntru) { if (f.fin[k]! < -1e-3) afara++; continue; }
    const d = f.fin[k]! - clExact(ix, punct, x, y);
    cel = Math.min(cel, d);
    if (d < -tol) { sub++; unde ??= [x, y]; }
  }
  assert.equal(sub, 0, `sub model, prima la ${unde?.join(', ')} (cel mai jos: ${cel})`);
  assert.equal(afara, 0);
});

test('pasul pe material: T1, apoi T2, pe lemnul lăsat de cel dinainte, nu intră nicăieri mai adânc de 3; nicio rapidă în lemn', () => {
  const zona = { x0: 27, y0: 22, x1: 113, y1: 78 };
  const m = materialSecventaO([
    { pasi: pasiDinGcodeO(T1), f: { fel: 'plata', R } }, { pasi: pasiDinGcodeO(T2), f: { fel: 'bila', R } },
  ], zona, 0.25, 0, 0.05);
  for (const [k, b] of m.blocuri.entries()) {
    assert.ok(b.taiere <= 3 + 0.06, `T${k + 1}: ${b.taiere} în lemn, la ${b.unde?.x}, ${b.unde?.y}`);
    assert.equal(b.rapida, 0, `T${k + 1}: o rapidă în lemn`);
  }
});

test('coborârea: nicio mutare a celor două fișiere nu coboară mai repede decât avansul de plonjare (300)', () => {
  for (const t of [T1, T2]) assert.deepEqual(coborariRepeziO(pasiDinGcodeO(t), 300, 0.01, 0.001).slice(0, 3), []);
});

test('timpul fiecărui fișier, estimat pe GRBL 1.1h din fabrică: îl compară cronometrul (±10 %)', () => {
  const s = [T1, T2].map((t) => { const e = estimeazaTimp(t, PROFIL_GRBL_11H); assert.ok(e.ok); return e.ok ? e.total.secunde : 0; });
  assert.ok(s.every((x) => x > 60), `${s}`);
});
