/**
 * Cazurile recenziei feliei 2.7a (ADR 0033), judecate cu măsura oracolului independent (`test/oracles/biarce.ts`):
 * fiecare a ieșit peste toleranță, tăcut, sau cu o formă pe care §4 o interzice, înaintea reparației.
 * - mânerul întors pe o cubică aproape dreaptă: 18–35 × tol (tăieturile la extremele pe axe);
 * - vârful ratat din rotunjire (D < 0): până la 2,63 × tol;
 * - vârful abaterii între eșantioane, pe un singur biarc: 1,13 × tol (rafinarea maximelor locale);
 * - razele de 1e7–1e12 mm, peste garda postului (`RAZA_MAXIMA_ARC`), bucățile nule, începutul la 1e-9 de a, refuzul cu
 *   motivul greșit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubicaInArce } from '../../src/geom/biarce.ts';
import { RAZA_MAXIMA_ARC, TINTA_APROXIMARE, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { judecaAbaterea, judecaLantul, lant, type CubicaO } from '../oracles/biarce.ts';

type Q = readonly [number, number, number, number, number, number, number, number];
const cub = (q: Q): CubicaO => ({ a: { x: q[0], y: q[1] }, c1: { x: q[2], y: q[3] }, c2: { x: q[4], y: q[5] }, b: { x: q[6], y: q[7] } });
const scalat = (q: Q, k: number): Q => q.map((v) => v * k) as unknown as Q;

/** Lanțul aplicației, judecat de oracol: nicio problemă, iar abaterea în ambele sensuri ≤ tol. Întoarce lanțul. */
function judeca(nume: string, q: Q, tol: number) {
  const c = cub(q);
  const r = cubicaInArce(c.a, c.c1, c.c2, c.b, tol);
  assert.ok(r.ok, `${nume}: ${r.ok ? '' : r.motiv}`);
  const j = judecaLantul(c, tol, r);
  assert.deepEqual(j.probleme.map((p) => `${p.cod}: ${p.text}`), [], nume);
  assert.ok(j.masura && Math.max(j.masura.curbaLant, j.masura.lantCurba) <= tol, `${nume}: ${JSON.stringify(j.masura)}`);
  return r.ok ? r : assert.fail(nume);
}

/**
 * Doar Hausdorff-ul oracolului, pentru o cubică a cărei inflexiune e prost condiționată: aplicația și oracolul o găsesc
 * fiecare la ~3,1e-6 mm de rădăcina exactă (calculată cu 60 de cifre), în sensuri opuse, peste pragul oracolului pentru
 * „tăietura e un vârf al lanțului” (2,7e-6). Tăietura rămâne pe curbă; abaterea e ce contează aici.
 */
function judecaAbaterile(nume: string, q: Q, tol: number): void {
  const c = cub(q);
  const r = cubicaInArce(c.a, c.c1, c.c2, c.b, tol);
  assert.ok(r.ok, `${nume}: ${r.ok ? '' : r.motiv}`);
  if (!r.ok) return;
  const j = judecaAbaterea(c, lant(c.a, r.varfuri, c.b), tol);
  assert.deepEqual(j.probleme.map((p) => `${p.cod}: ${p.text}`), [], nume);
  assert.ok(Math.max(j.curbaLant, j.lantCurba) <= tol, `${nume}: ${j.curbaLant}, ${j.lantCurba}`);
}

test('mânerul întors pe o cubică aproape dreaptă: tăiată la extremele pe axe, nu mai iese din toleranță', () => {
  const cazuri: Array<[string, Q]> = [
    ['înapoi la a', [0, 0, -1, 0, 40, 0, 50, 0]],
    ['dincolo de b', [0, 0, 10, 0, 51, 0, 50, 0]],
    ['înclinată, înapoi la a', [0, 0, -1.5459, -0.1418, 53.4156, 4.9011, 69.852, 6.4092]],
    ['1000 mm, înapoi cu 16 (362,8 × tol înainte)', [0, 0, -16, 0, 500, 0, 1000, 0]],
  ];
  for (const [nume, q] of cazuri) judeca(nume, q, TOLERANTA_PROIECT);
  judecaAbaterile('2,4 m, mânerul dincolo de b (256 × tol înainte)', [78.889, 7.649, -103.209, 47.312, 2492.535, -518.071, 2462.991, -511.636], TOLERANTA_PROIECT);
  // Pe dreapta exactă, întoarcerea e un vârf al lanțului: lanțul merge întâi înapoi până la x = −0,017982.
  const r = judeca('înapoi, vârful', [0, 0, -1, 0, 40, 0, 50, 0], TOLERANTA_PROIECT);
  assert.ok(r.varfuri.some((v) => Math.abs(v.p.x + 0.017982) < 1e-6), JSON.stringify(r.varfuri));
});

test('vârfurile exacte cu coordonate oarecare (D rotunjit sub 0) și bucla minusculă de lângă un vârf', () => {
  const q0: Q = [117.40430196121473, 98.1124958294299, 174.78785150110005, 162.7644756203918, -102.85739196281824, -151.67223156753403, -66.15101545941863, -79.1060929568474];
  const cazuri: Array<[string, Q]> = [
    ['vârf, 25 mm', [4.79980349125729, 12.249421487953235, -18.10314736242403, -1.3186210573296702, 18.655791894120785, 21.340242969462068, 7.598275977733781, 9.4042605391192]],
    ['vârf, 1,2 m', scalat(q0, 10)],
    ['aproape-vârf, 550 mm', [177.8391647733072, 143.8190746647097, 525.94826517736, 298.6413519111187, -435.6086454799504, -134.48545922208658, -251.41297334490028, 6.831723728673467]],
    ['vârf deplasat, 4,4 m', [4410.813061262508, 4339.092869410047, 4516.451444299329, 4346.310568830136, 3738.270086355682, 4292.951634888942, 3624.8593314258637, 4290.8292595744015]],
  ];
  for (const [nume, q] of cazuri) judeca(nume, q, TOLERANTA_PROIECT);
  for (const [nume, q] of cazuri) judeca(`${nume} la 1e-4`, q, 1e-4);
});

test('vârful abaterii între eșantioane, pe un singur biarc: maximele locale se rafinează', () => {
  const a: Q = [56.62638258913084, 92.79311068427265, 78.49125098736287, 2.8565286603443325, 10.889276491046695, 92.4084531930849, 53.214604817947006, 55.56575573865025];
  const b: Q = [51.2837, 58.714, 72.0971, 27.5982, 45.6934, 92.7977, 39.3504, 32.8898];
  judeca('A, la toleranța lui', a, 10.671023297107523);
  judeca('A, scalat la 0,001 mm', scalat(a, 9.371e-5), TOLERANTA_PROIECT);
  judeca('B', b, 7.8051);
});

test('razele: niciun arc peste RAZA_MAXIMA_ARC (postul nu-l mai aproximează); arcele prea plate devin linii, în toleranță', () => {
  const cazuri: Array<[string, Q]> = [
    ['1000 mm, ±0,01', [0, 0, 333, 0.01, 666, -0.01, 1000, 0]],
    ['500 mm', [0, 0, 166, 0.3, 333, 0.1, 500, 0]],
    ['2,4 m aproape dreaptă', [0.02058, 0.00706, 884.017, -2576.128, 248.191, -723.174, 768.993, -2240.88]],
    ['uriașa (9,7e4 mm înainte)', [0, 0, 800, 1600, 1700, -900, 2440, 300]],
  ];
  for (const [nume, q] of cazuri) {
    const r = judeca(nume, q, TOLERANTA_PROIECT);
    const lant = [...r.varfuri.map((v) => v.p), { x: q[6], y: q[7] }];
    r.varfuri.forEach((v, i) => {
      if (v.s.tip !== 'A') return;
      const u = lant[i + 1] as { x: number; y: number };
      const raza = (Math.hypot(u.x - v.p.x, u.y - v.p.y) * (1 + v.s.bulge ** 2)) / (4 * Math.abs(v.s.bulge));
      assert.ok(raza <= RAZA_MAXIMA_ARC, `${nume}: arcul ${i} are raza ${raza}`);
    });
  }
});

test('nicio bucată nulă pe dreptele cu mânere oarecare; lanțul începe exact în a', () => {
  const y = 1.4157771260437444;
  const r = judeca('orizontală', [1.9479686488362429, y, 1.5037796395951288, y, 2.427553598496641, y, 2.6898935165002564, y], TOLERANTA_PROIECT);
  const lant = [...r.varfuri.map((v) => v.p), { x: 2.6898935165002564, y }];
  for (let i = 0; i + 1 < lant.length; i++) {
    const u = lant[i] as { x: number; y: number }, v = lant[i + 1] as { x: number; y: number };
    assert.ok(Math.hypot(v.x - u.x, v.y - u.y) >= 1e-9, `bucata ${i} e nulă`);
  }
  const q: Q = [53.18006729066486, 42.20408884969117, 53.18006728992862, 42.20408884765708, 55.91844850386557, 61.769599281152246, 27.838901009122242, 53.82537656317423];
  const s = judeca('mâner aproape retras', q, TOLERANTA_PROIECT);
  assert.deepEqual(s.varfuri[0]?.p, { x: q[0], y: q[1] });
});

test('ținta de 0,99 (ADR 0033 §1, §6): abaterea reală, măsurată de oracol, nu trece de ținta fitter-ului', () => {
  // Cazuri găsite prin căutare adversarială (urcare pe pante) pe variantele slăbite ale măsurătorii (otrăvurile 2.7a):
  // fără rafinarea maximelor locale, primul ajunge la 0,9914 × tol; aplicația îl taie altfel (0,78). Al doilea e maximul
  // aplicației (0,9900 × tol). Cu ținta egală cu toleranța, al treilea urcă la 1,0000 × tol.
  const cazuri: Array<[string, Q]> = [
    ['maximul fără rafinare', [-2.8818999946004284, 0.8581621760990146, -1.1889785904427577, 1.5104379719115573, -3.0005894484201794, 1.6096294927378234, 3.4980094175814855, -2.9165910194909017]],
    ['maximul aplicației', [1.3524279628400144, -8.563404037917653, -10.657237479084984, 4.3600097907741695, -8.490339725205192, 7.457497101400448, 0.8279418010808324, -5.636255753220051]],
    ['maximul cu ținta = tol (1,0000 × tol)', [-1.340055472916619, 15.927944190413394, 8.026085580617814, -0.4678553143300024, 18.372346604491472, -1.211802706212896, -0.6001467348907161, -17.435355156679595]],
  ];
  for (const [nume, q] of cazuri) {
    const c = cub(q);
    const r = cubicaInArce(c.a, c.c1, c.c2, c.b, TOLERANTA_PROIECT);
    assert.ok(r.ok, nume);
    if (!r.ok) continue;
    const j = judecaAbaterea(c, lant(c.a, r.varfuri, c.b), TOLERANTA_PROIECT);
    const e = Math.max(j.curbaLant, j.lantCurba) / TOLERANTA_PROIECT;
    assert.ok(e <= TINTA_APROXIMARE * 1.001, `${nume}: ${e} × tol`);
  }
});

test('toleranța sub rezoluția numerică a coordonatelor are motivul ei, nu pe cel al plafonului', () => {
  const o = 1e6;
  const r = cubicaInArce({ x: o, y: o }, { x: o + 3, y: o + 4 }, { x: o + 7, y: o - 4 }, { x: o + 10, y: o }, 1e-10);
  assert.match(r.ok ? '' : r.motiv, /sub rezoluția numerică a coordonatelor/);
});
