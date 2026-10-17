/**
 * Dicționarele de bază la cerere (loc în pachetul de pornire, 17.10; `src/i18n/t.ts`). Fișierul NU importă `limbi.ts`:
 * fiecare fișier `node --test` are procesul lui, deci aici nicio limbă nu e încărcată la început, ca în aplicație înainte
 * de pornire.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../src/i18n/mesaje.en.ts';
import { incarcaLimba, limba, limbaIncarcata, schimbaLimba, traduce } from '../../src/i18n/t.ts';

test('înaintea dicționarului: niciun text, iar limba nu se poate alege (primul t() ar arunca)', () => {
  assert.equal(limbaIncarcata('ro'), false);
  assert.equal(limbaIncarcata('en'), false);
  assert.throws(() => traduce('ro', 'eroare.reincarca'), /mesajul nu e încărcat/);
  assert.throws(() => { schimbaLimba('en'); }, /dicționarul limbii nu e încărcat/);
  assert.throws(() => { schimbaLimba('ro'); }, /dicționarul limbii nu e încărcat/, 'nici limba curentă, fără dicționar');
  assert.equal(limba(), 'ro');
});

test('un eșec nu rămâne ținut minte: cererea următoare aduce dicționarul din nou; apoi o singură dată', async () => {
  let cereri = 0;
  const pica = (): Promise<never> => { cereri++; return Promise.reject(new Error('rețeaua')); };
  await assert.rejects(incarcaLimba('en', pica), /rețeaua/);
  assert.equal(limbaIncarcata('en'), false);
  assert.throws(() => { schimbaLimba('en'); }, /nu e încărcat/);
  assert.equal(limba(), 'ro');

  const vine = (): Promise<typeof en> => { cereri++; return Promise.resolve(en); };
  const p = incarcaLimba('en', vine);
  // Aceeași cerere, cât timp e în drum și după: dicționarul nu se aduce de două ori.
  assert.equal(incarcaLimba('en', vine), p);
  await p;
  assert.equal(incarcaLimba('en', pica), p);
  await incarcaLimba('en');
  assert.equal(cereri, 2, 'o cerere eșuată și una reușită, nimic în plus');
  assert.equal(limbaIncarcata('en'), true);
  assert.equal(traduce('en', 'eroare.reincarca'), 'Reload');
  assert.equal(en['eroare.reincarca'], 'Reload');
  // Doar limba încărcată se poate alege; cealaltă rămâne refuzată.
  schimbaLimba('en');
  assert.equal(limba(), 'en');
  assert.equal(limbaIncarcata('ro'), false);
  assert.throws(() => { schimbaLimba('ro'); }, /nu e încărcat/);
  assert.equal(limba(), 'en');
});

test('dicționarul adevărat (importul la cerere din t.ts): româna vine, se alege și traduce', async () => {
  await incarcaLimba('ro');
  assert.equal(limbaIncarcata('ro'), true);
  schimbaLimba('ro');
  assert.equal(limba(), 'ro');
  assert.equal(traduce('ro', 'eroare.reincarca'), 'Reîncarcă');
  assert.equal(traduce('ro', 'jurnal.intrari', { n: 0 }), '0 erori în jurnalul local');
});

test('o limbă încărcată nu se mai aduce, nici cu alt text: textele ei rămân cele venite prima dată', async () => {
  // Româna e deja încărcată; o încercare nouă cu alt text nu mai pleacă (o singură dată).
  await incarcaLimba('ro', () => Promise.resolve({ 'eroare.reincarca': 'altul' }));
  assert.equal(traduce('ro', 'eroare.reincarca'), 'Reîncarcă');
});
