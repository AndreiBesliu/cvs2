/**
 * Mesajele modulelor la cerere, ca date (ADR 0086): modulul își cere mesajele la evaluare (ambele limbi, un fișier, o singură
 * dată), `cuMesaje` dă modulul abia după ele; un fișier care nu vine (404) sau are altă formă respinge
 * încărcarea, iar cererea următoare încearcă din nou; generatorul scrie fiecare modul în ambele limbi, cu aceleași chei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genereazaMesajele } from '../../scripts/mesaje.ts';
import { esteDictionarMesaje, esteFisierMesaje, fisierMesaje, MODULE_MESAJE } from '../../shared/mesaje.ts';
import { cereMesaje, mesajeGata } from '../../src/i18n/laCerere.ts';
import { cuMesaje, traduce } from '../../src/i18n/t.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';

test('generatorul: un fișier pe modul, cu ambele limbi și aceleași chei, în forma citită de aplicație', () => {
  const f = genereazaMesajele();
  assert.deepEqual([...f.keys()], MODULE_MESAJE.map((m) => `mesaje/${m}.json`));
  for (const m of MODULE_MESAJE) {
    const x: unknown = JSON.parse(f.get(fisierMesaje(m)) ?? 'null');
    assert.ok(esteFisierMesaje(x), m);
    assert.deepEqual(Object.keys(x.ro).sort(), Object.keys(x.en).sort(), m);
  }
});

test('forma: gol, o valoare număr, un plural fără „other” sau cu o formă necunoscută nu trec', () => {
  assert.equal(esteDictionarMesaje({}), false);
  assert.equal(esteDictionarMesaje([]), false);
  assert.equal(esteDictionarMesaje({ a: 1 }), false);
  assert.equal(esteDictionarMesaje({ a: { one: 'x' } }), false);
  assert.equal(esteDictionarMesaje({ a: { one: 'x', other: 'y', many: 'z' } }), false);
  assert.equal(esteDictionarMesaje({ a: 'x', b: { one: 'x', few: 'y', other: 'z' } }), true);
  // Fișierul: exact ro și en, cu aceleași chei.
  assert.equal(esteFisierMesaje({ ro: { a: 'x' }, en: { a: 'y' } }), true);
  assert.equal(esteFisierMesaje({ ro: { a: 'x' } }), false);
  assert.equal(esteFisierMesaje({ ro: { a: 'x' }, en: { b: 'y' } }), false);
  assert.equal(esteFisierMesaje({ ro: { a: 'x' }, en: { a: 'y' }, fr: { a: 'z' } }), false);
});

test('modulul își cere mesajele la evaluare: ambele limbi, o dată; cuMesaje dă modulul abia după ele', async () => {
  const f = servesteMesajele();
  try {
    assert.throws(() => traduce('ro', 'masina.cod.ascunde'), /nu e încărcat/);
    const modul = await import('../../src/i18n/masina.ts').then((m) => cuMesaje({ mesaje: m.gata, m }));
    assert.ok(modul.m.gata);
    assert.equal(traduce('ro', 'masina.cod.ascunde'), 'Am înțeles');
    assert.equal(traduce('en', 'masina.cod.ascunde'), 'Got it');
    assert.deepEqual(f.cereri, ['mesaje/masina.json']);
    await cereMesaje('masina');
    await mesajeGata();
    assert.equal(f.cereri.length, 1);
  } finally {
    f.restaureaza();
  }
});

test('un fișier care nu vine (404) respinge încărcarea și mesajeGata; cererea următoare încearcă din nou', async () => {
  const stricat = servesteMesajele({ [fisierMesaje('export')]: 404 });
  try {
    await assert.rejects(cereMesaje('export'), /HTTP 404/);
    await assert.rejects(mesajeGata(), /HTTP 404/);
    await assert.rejects(cuMesaje({ mesaje: mesajeGata() }), /HTTP 404/);
  } finally {
    stricat.restaureaza();
  }
  const bun = servesteMesajele();
  try {
    await cereMesaje('export');
    await mesajeGata();
    assert.equal(traduce('en', 'export.post'), 'Post');
    assert.equal(bun.cereri.length, 1);
  } finally {
    bun.restaureaza();
  }
});

test('un fișier cu altă formă (o versiune veche, trunchiată) respinge încărcarea', async () => {
  const f = servesteMesajele({ [fisierMesaje('carcasa')]: '{"ro": {"paleta.titlu": 3}, "en": {"paleta.titlu": "x"}}' });
  try {
    await assert.rejects(cereMesaje('carcasa'), /forma așteptată/);
  } finally {
    f.restaureaza();
  }
});
