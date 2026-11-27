/**
 * Finisarea reliefului cu freza toroidală (felia 18.1↑e-1, ADR 0319; ADR 0303 răspunsul 4a: a liniei reliefului), judecată de
 * oracolul 3D independent (`test/oracles/relief3d.ts`, toroidala din 18.1↑e-0):
 * - fără scobituri (invarianta 4: vârful nu coboară nicăieri sub CL-ul exact al modelului), podeaua, pasul pe trecere pe
 *   material, nicio rapidă în lemn, pe calotă (aici) și pe celelalte forme (`reliefFinisare.toroidala.forme.test.ts`);
 * - pe un plan înclinat, vârful la CL-ul de pe hârtie, z0 + g · a + ρ · (√(1 + g²) − 1), deasupra lui doar cu surplusul câmpului;
 * - creasta pe un plan: ρ − √(ρ² − ((s − 2a) / 2)²) peste 2a.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finisareRelief, type FrezaFinisare } from '../../src/cam/reliefFinisare.ts';
import { clPlan, creastaPlanFreza, creastaSimulataFreza, type PunctO } from '../oracles/relief3d.ts';
import { frezaO, grila, judeca, pasi, relief, T, Z_SIGUR } from './ajutor-relief-finisare.ts';

const toroidala = (raza: number, colt: number): FrezaFinisare => ({ fel: 'toroidala', raza, colt });

// Calota cu colțul mijlociu și aproape cât raza (celelalte forme, în `reliefFinisare.toroidala.forme.test.ts`: un fișier ar trece
// de un minut).
const c = 0.5, n = 40, Rs = 8;
const calota = grila(n, n, c, (x, y) => { const d2 = (x - 10) ** 2 + (y - 10) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; });
for (const f of [toroidala(3, 1), toroidala(3, 2.5)]) {
  test(`calota cu toroidala Ø6 r${f.fel === 'toroidala' ? f.colt : ''}: fără scobituri, podeaua, pasul pe material, nicio rapidă în lemn`, () => {
    judeca({ nume: `calota r${f.fel === 'toroidala' ? f.colt : ''}`, reliefuri: [relief(calota, n, n, c, T(30, 40), -Rs)], freza: f, pasLateral: 1, pas: 3, adancime: 20 });
  });
}

test('toroidala pe un plan înclinat: vârful stă la CL-ul de pe hârtie, z0 + g · a + ρ · (√(1 + g²) − 1)', () => {
  const c = 0.5, n = 40, g = Math.tan((20 * Math.PI) / 180);
  const v = grila(n, n, c, (x) => g * x);
  const f = toroidala(3, 1);
  const o = finisareRelief({
    reliefuri: [relief(v, n, n, c, T(0, 0), -20)], freza: f, unghi: 90, nealiniat: false, margine: 'trece', pasLateral: 1, pas: 30, adancime: 30,
    zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  });
  assert.ok(o.ok);
  // Punctele de tăiere departe de margini: deasupra CL-ului de pe hârtie cel mult cât surplusul câmpului conservativ (o celulă de
  // calcul pe pantă), niciodată sub el. Pe o linie de-a lungul pantei constante, mișcarea e un singur segment drept, deci se
  // judecă pe segmente (interpolate, cum le face mașina), nu doar la capetele lor.
  const hartie = (x: number): number => clPlan(frezaO(f), g, 0, -20, x, 0);
  let jos = Infinity, sus = -Infinity, puncte = 0;
  const p = pasi(o.miscari, 0, 0);
  for (let k = 1; k < p.length; k++) {
    const a = p[k - 1]!, b = p[k]!;
    if (b.rapida) continue;
    for (let t = 0; t <= 64; t++) {
      const x = a.x + ((b.x - a.x) * t) / 64, y = a.y + ((b.y - a.y) * t) / 64, z = a.z + ((b.z - a.z) * t) / 64;
      if (x < 6 || x > 14 || y < 6 || y > 14) continue;
      puncte++;
      jos = Math.min(jos, z - hartie(x)); sus = Math.max(sus, z - hartie(x));
    }
  }
  assert.ok(puncte > 100, `puncte judecate: ${puncte}`);
  assert.ok(jos >= -1e-6, `sub CL: ${jos}`);
  assert.ok(sus < 0.0625 * 2 * g + 1e-6, `surplusul: ${sus}`);
});

test('creasta pe un plan, cu toroidala: cât spune formula pe hârtie, ρ − √(ρ² − ((s − 2a) / 2)²) peste 2a', () => {
  const c = 0.5, n = 60;
  for (const [R, rho, s] of [[3, 1, 5], [3, 2, 3], [3, 1, 3.5], [2, 0.5, 3.5]] as const) {
    const v = grila(n, n, c, () => 2);
    const f = toroidala(R, rho);
    const o = finisareRelief({
      reliefuri: [relief(v, n, n, c, T(0, 0), -4)], freza: f, unghi: 0, nealiniat: false, margine: 'trece', pasLateral: s, pas: 10, adancime: 10,
      zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
    });
    assert.ok(o.ok);
    const treceri: PunctO[][] = [];
    let cur: PunctO[] = [];
    let x = 0, y = 0, z = Z_SIGUR;
    for (const m of o.miscari) {
      if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
      x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
      if (m.tip === 'rapida' || Math.abs(z + 2) > 1e-9) { if (cur.length > 1) treceri.push(cur); cur = []; continue; }
      cur.push({ x, y, z });
    }
    if (cur.length > 1) treceri.push(cur);
    // Creasta toroidalei e un vârf (două arce care se taie), deci se măsoară exact la mijlocul dintre două linii: 0,01 mm alături
    // înseamnă ~0,006 mm mai jos.
    const ys = [...new Set(treceri.map((t) => t[0]!.y))].sort((a, b) => a - b);
    const puncte: Array<readonly [number, number]> = [];
    for (let k = 0; k + 1 < ys.length; k++) {
      const ym = (ys[k]! + ys[k + 1]!) / 2;
      if (ym > 10 && ym < 20) for (const xm of [15, 15.37, 15.74]) puncte.push([xm, ym]);
    }
    assert.ok(puncte.length >= 6, `R ${R}, ρ ${rho}, s ${s}: ${puncte.length} puncte`);
    const masurata = creastaSimulataFreza(treceri, frezaO(f), puncte, () => -2, 0.02);
    const hartie = creastaPlanFreza(frezaO(f), o.pasLateral);
    assert.ok(Math.abs(masurata - hartie) < 2e-3, `R ${R}, ρ ${rho}, s ${s}: creasta ${masurata}, pe hârtie ${hartie}`);
  }
});
