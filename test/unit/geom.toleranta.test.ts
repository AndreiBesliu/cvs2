/**
 * Bugetul de toleranță (ADR 0033 §1 și §4) leagă geometria de post, care n-o poate importa (regula `post-doar-ir`):
 * aceeași toleranță declarată, iar arcele biarcelor, chiar umflate de offset cu raza frezei, rămân sub garda de rază a
 * fiecărui contract. Altfel postul le-ar scrie ca segmente G1, o a doua aproximare peste prima.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAZA_MAXIMA_ARC, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { PLAFON } from '../../src/model/document.ts';
import { TOLERANTA_APROXIMARE } from '../../src/post/post.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';

/**
 * Cât poate adăuga offsetul unui arc: raza celei mai mari freze pe care o primește documentul (ADR 0034 §6). Rezerva din
 * buget (100 mm sub garda postului) o acoperă.
 */
const REZERVA_OFFSET = PLAFON.diametruScula / 2;

test('toleranța postului e toleranța proiectului', () => {
  assert.equal(TOLERANTA_APROXIMARE, TOLERANTA_PROIECT);
});

test('arcele biarcelor, plus offsetul, stau sub garda de rază a fiecărui contract', () => {
  for (const k of [GRBL_11]) {
    assert.ok(RAZA_MAXIMA_ARC + REZERVA_OFFSET <= k.arc.razaMaxima, `${k.nume}: ${RAZA_MAXIMA_ARC} + ${REZERVA_OFFSET} > ${k.arc.razaMaxima}`);
  }
});
