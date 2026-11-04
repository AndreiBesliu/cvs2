/**
 * Repornirea cerută de o extensie (`host.reporneste`, ADR 0165), pe un ceas fals: cel mult una la 2 s; una cerută mai
 * devreme așteaptă până trec cele 2 s de la ultima, iar cererile de până atunci se adună în ea, cu un singur temporizator
 * (o extensie care s-ar reporni în buclă); închiderea extensiei o oprește, iar cererile de după merg ca la început.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTERVAL_REPORNIRE_MS, repornireRara, type Ceas } from '../../src/extensii/repornire.ts';

function ceasFals() {
  let t = 50_000, nr = 0;
  const asteapta = new Map<number, { readonly la: number; readonly f: () => void }>();
  const ceas: Ceas = {
    acum: () => t,
    dupa: (ms, f) => { asteapta.set(++nr, { la: t + ms, f }); return nr; },
    anuleaza: (id) => { asteapta.delete(id as number); },
  };
  /** Trec `ms` milisecunde: temporizatoarele ajunse la termen pornesc, în ordine. */
  const treci = (ms: number): void => {
    const pana = t + ms;
    for (;;) {
      const urm = [...asteapta].filter(([, x]) => x.la <= pana).sort((a, b) => a[1].la - b[1].la)[0];
      if (!urm) break;
      asteapta.delete(urm[0]);
      t = urm[1].la;
      urm[1].f();
    }
    t = pana;
  };
  return { ceas, treci, temporizatoare: () => nr, inAsteptare: () => asteapta.size };
}

function cuNumarator() {
  const c = ceasFals();
  const r = { n: 0 };
  return { ...c, r, rep: repornireRara(() => { r.n++; }, INTERVAL_REPORNIRE_MS, c.ceas) };
}

test('intervalul e de 2 s', () => {
  assert.equal(INTERVAL_REPORNIRE_MS, 2000);
});

test('prima cerere repornește pe loc; una la mai puțin de 2 s așteaptă până trec cele 2 s de la ultima repornire', () => {
  const { rep, r, treci } = cuNumarator();
  rep.cere();
  assert.equal(r.n, 1);
  treci(500);
  rep.cere();
  assert.equal(r.n, 1);
  treci(1499);
  assert.equal(r.n, 1);
  treci(1);
  assert.equal(r.n, 2);
  // după cea amânată, următoarea așteaptă iar 2 s, de la ea
  rep.cere();
  treci(1999);
  assert.equal(r.n, 2);
  treci(1);
  assert.equal(r.n, 3);
  // după 2 s fără cereri, una nouă repornește pe loc
  treci(2000);
  rep.cere();
  assert.equal(r.n, 4);
});

test('cererile dese se adună într-o singură repornire, cu un singur temporizator (o extensie care se repornește în buclă)', () => {
  const { rep, r, treci, temporizatoare, inAsteptare } = cuNumarator();
  rep.cere();
  for (let i = 0; i < 1000; i++) { treci(1); rep.cere(); }
  assert.deepEqual([r.n, temporizatoare(), inAsteptare()], [1, 1, 1]);
  treci(1000);
  assert.deepEqual([r.n, inAsteptare()], [2, 0]);
});

test('închiderea (sau altă extensie) oprește repornirea amânată; cererile de după merg ca înainte', () => {
  const { rep, r, treci, inAsteptare } = cuNumarator();
  rep.cere();
  treci(100);
  rep.cere();
  rep.opreste();
  assert.equal(inAsteptare(), 0);
  // o cerere nouă, tot la mai puțin de 2 s, se amână din nou (oprirea nu blochează cererile de după)
  rep.cere();
  assert.equal(inAsteptare(), 1);
  rep.opreste();
  treci(5000);
  assert.equal(r.n, 1);
  rep.cere();
  assert.equal(r.n, 2);
  // fără nimic amânat, oprirea nu schimbă nimic
  rep.opreste();
  rep.cere();
  treci(2000);
  assert.equal(r.n, 3);
});
