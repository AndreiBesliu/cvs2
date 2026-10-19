import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAZURI_SIMULARE, cazul } from '../oracles/simulare.cazuri.ts';
import { amprentaCamp } from '../../src/sim/banda.ts';
import { bucatiCaz, FARA_NUCLEU, PIESE_1, PIESE_2, simuleazaCaz, verificariNucleu } from './ajutor-simulare.ts';

/**
 * Nucleul de simulare (ADR 0047) pe corpusul oracolului (ADR 0010, `PLAN.md` §4.1): pe fiecare piesă, câmpul nucleului
 * trece toate verificările cu care oracolul își prinde cele 7 otrăvuri din s4 — hârtia pe fiecare celulă, „nucleul nu e
 * niciodată mai sus decât oracolul cu peste 10 nm”, „mai jos” doar în marja de eșantionare, adâncimea programată,
 * secțiunea bilei, unghiul V, lățimea radială. A doua jumătate a pieselor: `simulare.corpus2.test.ts`.
 */
for (const id of PIESE_1) {
  const c = cazul(id);
  test(`nucleul pe ${id}: ${c.descriere}`, () => {
    assert.deepEqual(verificariNucleu(c, bucatiCaz(c)), []);
  });
}

test('corpusul e acoperit: fiecare piesă e într-un fișier sau scoasă cu motiv (scula de profil)', () => {
  const toate = [...PIESE_1, ...PIESE_2, ...FARA_NUCLEU].sort();
  assert.deepEqual(toate, CAZURI_SIMULARE.map((c) => c.id).sort());
  assert.equal(new Set(toate).size, toate.length, 'o piesă e de două ori');
  // Toate piesele scoase sunt cu sculă de profil: o piesă cu altă sculă nu poate fi scoasă în tăcere.
  for (const id of FARA_NUCLEU) assert.equal(cazul(id).scula.tip, 'profil', id);
  // Pe hârtie: toate piesele cu valoare pe hârtie, în afară de profil, trec prin nucleu (17 din 18).
  assert.equal(CAZURI_SIMULARE.filter((c) => c.hartie && !FARA_NUCLEU.includes(c.id)).length, 17);
});

test('aceeași materie pe programe diferite: amprenta nucleului e aceeași (dublat = simplu, G2 cu R = G3 cu I/J)', () => {
  const perechi = CAZURI_SIMULARE.filter((x) => x.identicCu && !FARA_NUCLEU.includes(x.id));
  assert.ok(perechi.length >= 2, 'perechile corpusului au dispărut');
  for (const c of perechi) {
    const altul = cazul(c.identicCu ?? '');
    assert.equal(amprentaCamp(simuleazaCaz(c)), amprentaCamp(simuleazaCaz(altul)), `${c.id} față de ${altul.id}`);
  }
});
