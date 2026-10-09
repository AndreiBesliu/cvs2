/**
 * Placa 1, ca fișiere de aur: programele generate acum trebuie să fie identice, octet cu octet, cu cele din
 * `test/placi/placa-01/`, pe care le taie owner-ul. O schimbare a postului care le-ar atinge pică aici, iar fișierele
 * se regenerează doar cu o decizie scrisă (`node test/placi/placa-01/genereaza.ts`). Ambele trec poarta invariantelor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta } from '../oracles/poarta.ts';
import { FOAIA, programePlaca01, REGIM, SCULA } from '../placi/placa-01/genereaza.ts';

const AUR = {
  A: readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url)),
  B: readFileSync(new URL('../placi/placa-01/placa-01-B.nc', import.meta.url)),
};

test('programele generate acum sunt fișierele de aur, octet cu octet, cu același SHA-256', async () => {
  const { A, B } = await programePlaca01();
  assert.ok(Buffer.from(A.octeti).equals(AUR.A), 'placa-01-A.nc diferă de ce generează postul acum');
  assert.ok(Buffer.from(B.octeti).equals(AUR.B), 'placa-01-B.nc diferă de ce generează postul acum');
  assert.equal(A.sha256, createHash('sha256').update(AUR.A).digest('hex'));
  assert.equal(B.sha256, createHash('sha256').update(AUR.B).digest('hex'));
});

test('fișa plăcii poartă hash-urile fișierelor de aur', () => {
  const fisa = readFileSync(new URL('../../docs/etape/placa-01.md', import.meta.url), 'utf8');
  for (const aur of [AUR.A, AUR.B]) {
    const hash = createHash('sha256').update(aur).digest('hex');
    assert.ok(fisa.includes(hash), `fișa nu are hash-ul ${hash}`);
  }
});

test('ambele fișiere trec poarta, cu insula și gaura la cotele de pe hârtie', () => {
  for (const [nume, origine] of [['A', 'stanga-jos'], ['B', 'dreapta-sus']] as const) {
    const incalcari = poarta(AUR[nume].toString('ascii'), {
      foaie: FOAIA, origine, z0: 'sus', diametruScula: SCULA.diametru, pas: 4, supracursa: 0,
      asteptareAx: REGIM.asteptareAx,
      // Centrul sculei: gaura pe cercul de rază 12 în jurul (70, 50); insula decalată cu 3 în jurul (20…120, 20…80).
      cadru: { minX: 17, maxX: 123, minY: 17, maxY: 83 },
    });
    assert.deepEqual(incalcari, [], nume);
  }
});

test('cotele de mașină pe hârtie: gaura pornește din (82, 50) la A și din (−58, −50) la B', () => {
  assert.ok(AUR.A.toString('ascii').includes('\nG0 X82.000 Y50.000\n'));
  assert.ok(AUR.B.toString('ascii').includes('\nG0 X-58.000 Y-50.000\n'));
  // Insula, în urcare (ADR 0027), merge orar: din (20, 17) întâi colțul spre (17, 20); la B, față de colțul dreapta-sus
  // al foii 140 × 100: (17 − 140, 20 − 100) = (−123, −80).
  assert.ok(AUR.A.toString('ascii').includes('\nG2 X17.000 Y20.000 I0.000 J3.000 F1000.0\n'));
  assert.ok(AUR.B.toString('ascii').includes('\nG2 X-123.000 Y-80.000 I0.000 J3.000 F1000.0\n'));
});
