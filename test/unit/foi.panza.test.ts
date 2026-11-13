/**
 * Foile pe pânză (ADR 0210 §1, felia 11.1↑b): locul fiecărei foi pe rând (în ordinea listei, la 100 mm una de alta),
 * încadrarea unei cutii oarecare (toate foile) și comutatorul „Toate foile pe pânză”, ținut în browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_TOATE_FOILE, tineToateFoile, toateFoileTinute, type StocareFoaie } from '../../src/app/foaiaActiva.ts';
import { vedereaPotrivita } from '../../src/canvas/potrivire.ts';
import { documentNou, type Document, type Foaie } from '../../src/model/document.ts';
import { locuriFoi, SPATIU_FOI } from '../../src/model/foi.ts';

const foaie = (id: string, latime: number, inaltime = 200): Foaie => ({ id, stoc: { latime, inaltime, grosime: 18 }, instante: [] });

test('locul foilor pe rând: în ordinea listei, fiecare la 100 mm după cea dinainte (pe hârtie)', () => {
  const d: Document = { ...documentNou({ latime: 300, inaltime: 200, grosime: 18 }), foi: [foaie('f1', 300), foaie('f2', 600, 400), foaie('f3', 100)] };
  assert.equal(SPATIU_FOI, 100);
  // 0; 300 + 100 = 400; 400 + 600 + 100 = 1 100.
  assert.deepEqual(locuriFoi(d), [0, 400, 1100]);
  assert.deepEqual(locuriFoi({ ...d, foi: [foaie('f9', 250)] }), [0]);
  // Ordinea e a listei: mutată, foaia își schimbă locul.
  assert.deepEqual(locuriFoi({ ...d, foi: [d.foi[2] as Foaie, d.foi[0] as Foaie, d.foi[1] as Foaie] }), [0, 200, 600]);
});

test('încadrarea: foaia la origine ca înainte; o cutie cu colțul în x, y se așază în mijlocul zonei', () => {
  const z = { x: 10, y: 20, w: 1000, h: 500 };
  // Fără colț: aceeași vedere ca până acum (formula de dinainte, scrisă din nou).
  const v0 = vedereaPotrivita(1200, 700, { latime: 300, inaltime: 200 }, z);
  const s0 = Math.min((1000 - 48) / 300, (500 - 48) / 200);
  assert.deepEqual(v0, { scara: s0, tx: 10 + (1000 - 300 * s0) / 2, ty: 20 + 500 - (500 - 200 * s0) / 2 });
  // Toate foile, văzute din foaia a doua: de la x = −400, 1 100 mm lățime, 200 înălțime.
  const v = vedereaPotrivita(1200, 700, { x: -400, y: 0, latime: 1100, inaltime: 200 }, z);
  const s = (1000 - 48) / 1100;
  assert.ok(Math.abs(v.scara - s) < 1e-12);
  const stanga = v.tx + -400 * v.scara, dreapta = v.tx + 700 * v.scara;
  assert.ok(Math.abs(stanga - (10 + 24)) < 1e-9, `marginea stângă la 24 px de zonă: ${stanga}`);
  assert.ok(Math.abs(dreapta - (10 + 1000 - 24)) < 1e-9, `marginea dreaptă la 24 px de zonă: ${dreapta}`);
  // Pe verticală, centrată: jos la (500 + 200 s) / 2 de sus.
  assert.ok(Math.abs(v.ty - (20 + (500 + 200 * s) / 2)) < 1e-9);
  // Un colț cu y: cutia urcă exact cât y.
  const vy = vedereaPotrivita(1200, 700, { x: 0, y: 50, latime: 300, inaltime: 200 }, z);
  assert.ok(Math.abs(vy.ty - 50 * vy.scara - v0.ty) < 1e-9);
});

test('„Toate foile pe pânză” ținut în browser: implicit da; „0” = doar foaia activă; stocarea care aruncă nu oprește nimic', () => {
  const mem = new Map<string, string>();
  const st: StocareFoaie = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); } };
  assert.equal(toateFoileTinute(st), true);
  tineToateFoile(false, st);
  assert.equal(mem.get(CHEIE_TOATE_FOILE), '0');
  assert.equal(toateFoileTinute(st), false);
  tineToateFoile(true, st);
  assert.equal(toateFoileTinute(st), true);
  const arunca: StocareFoaie = { getItem: () => { throw new Error('refuzat'); }, setItem: () => { throw new Error('plin'); } };
  assert.equal(toateFoileTinute(arunca), true);
  assert.doesNotThrow(() => { tineToateFoile(false, arunca); });
  assert.equal(toateFoileTinute(null), true);
});
