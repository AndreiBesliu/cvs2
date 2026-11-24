/**
 * Baza reliefurilor (ADR 0310 §2, felia 18.1↑a), partea pură: amprentele dalelor din textul unei hărți, hărțile folosite de
 * document și de versiunile păstrate (citite din textul lor, fără ușă) și ce se șterge la curățare (hărțile nefolosite, apoi
 * dalele fără hartă, puse de cel puțin o zi). Baza însăși (IndexedDB) se încearcă în e2e.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daleDinText, deSters, hartiDinTexte, hartiFolosite, type HartaPastrata } from '../../src/app/reliefStocare.ts';
import { VERSIUNE_SCHEMA, type Document, type Nod } from '../../src/model/document.ts';

const A = 'a'.repeat(64), B = 'b'.repeat(64), C = 'c'.repeat(64), D = 'd'.repeat(64), E = 'e'.repeat(64);
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const relief = (id: string, harti: string[]): Nod => ({
  tip: 'element', id, matrice: I,
  forma: { tip: 'relief', nx: 2, ny: 2, celula: 1, straturi: harti.map((dale, k) => ({ id: `s${k}`, mod: 'aduna', vizibil: true, dale })) },
});
const doc = (copii: Nod[]): Document => ({
  schema: VERSIUNE_SCHEMA, rev: 1,
  piese: [{ id: 'p1', nume: 'p', radacina: { tip: 'grup', id: 'g', matrice: I, copii }, operatii: [] }],
  foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [] }],
});

test('dalele unei hărți: doar intrările care arată ca o amprentă; un text stricat nu are niciuna', () => {
  assert.deepEqual(daleDinText(JSON.stringify({ v: 1, nx: 300, ny: 1, dale: [A, 1.5, null, B, A] })), [A, B, A]);
  assert.deepEqual(daleDinText('{nu e json'), []);
  assert.deepEqual(daleDinText(JSON.stringify({ dale: ['scurt', 3] })), []);
});

test('hărțile folosite: toate straturile tuturor reliefurilor, și în grupuri; un document fără relief n-are niciuna', () => {
  const d = doc([relief('r1', [A, B]), { tip: 'grup', id: 'g2', matrice: I, copii: [relief('r2', [C])] }]);
  assert.deepEqual([...hartiFolosite([d])].sort(), [A, B, C]);
  assert.equal(hartiFolosite([doc([])]).size, 0);
});

test('hărțile din textele versiunilor: citite fără ușă; un text stricat, străin ori fără relief nu adaugă nimic', () => {
  const t = JSON.stringify(doc([relief('r1', [A]), relief('r2', [B, C])]));
  assert.deepEqual([...hartiDinTexte([t])].sort(), [A, B, C]);
  assert.equal(hartiDinTexte(['{stricat "relief"', 42, null, JSON.stringify(doc([]))]).size, 0);
});

test('ce se șterge: hărțile nefolosite și vechi, apoi dalele pe care nu le mai cere nicio hartă rămasă și vechi', () => {
  const zi = 86_400_000, acum = 10 * zi, pana = acum - zi;
  const h = (amprenta: string, dale: string[], la: number): HartaPastrata => ({ amprenta, text: JSON.stringify({ v: 1, nx: 1, ny: 1, dale }), la });
  const harti = [
    h(A, [C], 0), // folosită: rămâne, cu dala ei
    h(B, [D], 0), // nefolosită și veche: se șterge; dala ei la fel
    h(E, [D], acum), // nefolosită, dar nouă: rămâne, deci și D rămâne
  ];
  const dale = [{ amprenta: C, la: 0 }, { amprenta: D, la: 0 }, { amprenta: B, la: 0 }, { amprenta: A, la: acum }];
  assert.deepEqual(deSters(harti, dale, new Set([A]), pana), { harti: [B], dale: [B] });
  // Fără E: D rămâne fără hartă și se șterge; A e o dală nouă, deci rămâne.
  assert.deepEqual(deSters(harti.slice(0, 2), dale, new Set([A]), pana), { harti: [B], dale: [D, B] });
});
