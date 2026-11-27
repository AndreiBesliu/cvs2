/**
 * Finisarea reliefului cu freza toroidală pe forme grele (felia 18.1↑e-1, ADR 0319), judecată de oracolul 3D: calota cu colțul
 * mic, pana la 30° cu freza trecând de margine, peretele subțire de o celulă (ADR 0310 §11) și valurile rotite, la un unghi
 * nealiniat. Fără scobituri, podeaua, pasul pe trecere pe material, nicio rapidă în lemn. (Calota cu celelalte colțuri, planul
 * și creasta: `reliefFinisare.toroidala.test.ts`.)
 */
import { test } from 'node:test';
import type { FrezaFinisare } from '../../src/cam/reliefFinisare.ts';
import { grila, judeca, relief, rot, T } from './ajutor-relief-finisare.ts';

const toroidala = (raza: number, colt: number): FrezaFinisare => ({ fel: 'toroidala', raza, colt });
const c = 0.5;

test('calota cu toroidala Ø4 r0,25 (aproape plată)', () => {
  const n = 40, Rs = 8;
  const calota = grila(n, n, c, (x, y) => { const d2 = (x - 10) ** 2 + (y - 10) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; });
  judeca({ nume: 'calota r0,25', reliefuri: [relief(calota, n, n, c, T(30, 40), -Rs)], freza: toroidala(2, 0.25), pasLateral: 1, pas: 3, adancime: 20 });
});

test('pana 0 → 5 mm, la 30°, cu freza trecând de margine', () => {
  judeca({ nume: 'pana', reliefuri: [relief(grila(40, 30, c, (x) => (x / 20) * 5), 40, 30, c, T(10, 10), -5)], freza: toroidala(2, 0.5), unghi: 30, margine: 'trece', pasLateral: 1, pas: 2, adancime: 8 });
});

test('un perete subțire de o celulă, rotit și oglindit', () => {
  const perete = grila(30, 30, c, (x) => (Math.abs(x - 7.75) < 0.01 ? 6 : 1));
  judeca({ nume: 'perete subțire', reliefuri: [relief(perete, 30, 30, c, rot(25, 20, 5, true), -6)], freza: toroidala(1.5, 0.5), unghi: 90, pasLateral: 0.5, pas: 2.5, adancime: 10 });
});

test('valuri rotite, la 70°, nealiniate', () => {
  const valuri = grila(30, 30, c, (x, y) => 2 + Math.sin(x * 1.3) * Math.cos(y * 0.9) + 0.5 * Math.sin(x * 3.1 + y * 2.3));
  judeca({ nume: 'valuri', reliefuri: [relief(valuri, 30, 30, c, rot(-40, 15, 12), -3.6)], freza: toroidala(2, 1), unghi: 70, nealiniat: true, pasLateral: 0.4, pas: 1.5, adancime: 10 });
});
