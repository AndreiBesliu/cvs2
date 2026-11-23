/**
 * Uneltele comune ale potrivirii simulate (ADR 0179, feliile 12.1↑e-3 și 12.1↑e-4), pe grile mici scrise de mână, cu valorile
 * pe hârtie: situațiile pe care corpusul cazurilor nu le atinge (otrăvurile N02 și N03 ale lui 12.1↑e-3 au scăpat acolo).
 * - `lemnDop`: lemnul unei bucăți legate de desenul dopului doar pe o coloană (o latură îngustă, verticală) e tot al dopului;
 * - `perete`: o pereche de celule pe care grila grosieră le dă tăiată / netăiată, dar funcția exactă nu (amândouă netăiate),
 *   se sare, ca la oracol: punctul bisecției ar cădea în centrul celulei, cu o jumătate de celulă de joc în plus.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lemnDop, perete, type GrilePotrivire } from '../../src/sim/potrivireDreapta.ts';

/** O grilă nx × ny cu celula de 1 mm din (0, 0); M (adâncimea dopului) și F (a locașului) date pe rânduri, de jos în sus. */
function grila(nx: number, ny: number, M: readonly number[], F: readonly number[] = M): GrilePotrivire {
  return {
    c: 1, nx, ny, n: nx * ny, gx0: 0, gy0: 0, F: Float32Array.from(F), M: Float32Array.from(M),
    centru: (k) => [(k % nx) + 0.5, Math.floor(k / nx) + 0.5],
    spreDop: (x, y) => [x, y],
  };
}

test('lemnDop: o bucată legată de desenul dopului doar prin coloană e a dopului; una despărțită de tăietură, nu', () => {
  // 3 × 3, pragul 1: lemn (0) și tăiat (5). Desenul dopului e doar celula (0, 0). Coloana din stânga e lemn, legată de ea doar
  // vertical; celula (2, 2), lemn, e despărțită de tăieturi (ca miezul golului sau rama).
  const M = [
    0, 5, 5,
    0, 5, 5,
    0, 5, 0,
  ];
  const inDop = Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(Array.from(lemnDop(grila(3, 3, M), 1, inDop)), [1, 0, 0, 1, 0, 0, 1, 0, 0]);
});

test('perete: punctul exact între o celulă tăiată și una de lemn; perechea fără schimbare de semn se sare', () => {
  // Un rând de două celule, centrele la x = 0,5 și 1,5: grila grosieră spune stânga tăiată, dreapta lemn.
  const g = grila(2, 1, [5, 0]);
  const taiat = (k: number): boolean => k === 0, lemn = (k: number): boolean => k === 1;
  // Peretele exact la x = 1,2: punctul bisecției acolo.
  const p = perete(g, taiat, lemn, (x) => x - 1.2);
  assert.equal(p.length, 1);
  assert.ok(Math.abs(p[0]![0] - 1.2) < 1e-6 && Math.abs(p[0]![1] - 0.5) < 1e-9, `peretele la x = 1,2: ${JSON.stringify(p)}`);
  // Funcția exactă spune netăiat în ambele centre (peretele la x = 0,4, în stânga primului centru): perechea se sare, nu dă
  // un punct în centrul celulei din stânga.
  assert.deepEqual(perete(g, taiat, lemn, (x) => x - 0.4), []);
  // La fel, tăiat în ambele centre (peretele la x = 1,7).
  assert.deepEqual(perete(g, taiat, lemn, (x) => x - 1.7), []);
});
