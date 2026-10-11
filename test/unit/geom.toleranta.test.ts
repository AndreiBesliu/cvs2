/**
 * Bugetul de toleranță (ADR 0033 §1 și §4) leagă geometria de post, care n-o poate importa (regula `post-doar-ir`):
 * aceeași toleranță declarată, iar arcele biarcelor, chiar umflate de offset cu raza frezei, rămân sub garda de rază a
 * fiecărui contract. Altfel postul le-ar scrie ca segmente G1, o a doua aproximare peste prima.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAZA_MAXIMA_ARC, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { TOLERANTA_APROXIMARE } from '../../src/post/post.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';

/** Raza frezei pe care offsetul o poate adăuga unui arc (Ø 200 mm). */
const REZERVA_OFFSET = 100;

test('toleranța postului e toleranța proiectului', () => {
  assert.equal(TOLERANTA_APROXIMARE, TOLERANTA_PROIECT);
});

test('arcele biarcelor, plus offsetul, stau sub garda de rază a fiecărui contract', () => {
  for (const k of [GRBL_11]) {
    assert.ok(RAZA_MAXIMA_ARC + REZERVA_OFFSET <= k.arc.razaMaxima, `${k.nume}: ${RAZA_MAXIMA_ARC} + ${REZERVA_OFFSET} > ${k.arc.razaMaxima}`);
  }
});
