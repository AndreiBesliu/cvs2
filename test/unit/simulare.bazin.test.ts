import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { firePentru, simuleazaInBazin } from '../../src/jobs/bazin.ts';
import { amprentaCamp } from '../../src/sim/banda.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { parametriGrila, programCaz, simuleazaCaz } from './ajutor-simulare.ts';

/**
 * Bazinul simulării (ADR 0015, ADR 0047 §4): fără stare între joburi; în browser, câte un worker pe bandă; în Node (fără
 * `Worker`), aceleași benzi rulate pe rând, prin aceeași funcție. Workerele adevărate și amprenta lor în Edge: e2e.
 */

test('câte fire: unul mai puțin decât nucleele, între 1 și 8', () => {
  assert.equal(firePentru(1), 1);
  assert.equal(firePentru(2), 1);
  assert.equal(firePentru(5), 4);
  assert.equal(firePentru(32), 8);
  assert.equal(firePentru(Number.NaN), 1);
  assert.equal(firePentru(0), 1);
});

test('în Node, bazinul rulează benzile pe rând: 1 și 4 fire, același rezumat, aceeași amprentă ca nucleul direct', async () => {
  const c = cazul('gravura-v60');
  const p = pregatesteProgram(programCaz(c), 0);
  assert.ok(p.ok);
  const camp = parametriGrila(c.grila);
  const unu = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18 }, 1);
  const patru = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, fund: -18 }, 4);
  assert.equal(unu.fire, 1);
  assert.equal(patru.fire, 4);
  assert.equal(unu.amprenta, amprentaCamp(simuleazaCaz(c)));
  assert.equal(patru.amprenta, unu.amprenta);
  assert.ok(Object.is(patru.volum, unu.volum));
  assert.deepEqual(patru.previzualizare, unu.previzualizare);
  assert.ok(unu.ms >= 0 && Number.isFinite(unu.ms));
});

test('mutările cererii nu se schimbă (fiecare bandă primește copia ei)', async () => {
  const c = cazul('tangent');
  const p = pregatesteProgram(programCaz(c), 0);
  assert.ok(p.ok);
  const inainte = p.mutari.slice();
  await simuleazaInBazin({ camp: parametriGrila(c.grila), scula: p.scula, mutari: p.mutari, fund: -18 }, 3);
  assert.deepEqual(p.mutari, inainte);
});
