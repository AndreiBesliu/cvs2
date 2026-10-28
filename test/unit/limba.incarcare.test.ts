/**
 * Dicționarele de bază la cerere (loc în pachetul de pornire, 17.10; ca date din 28.10, ADR 0095: `mesaje/<limbă>.json`;
 * `src/i18n/t.ts`), aduse pe drumul aplicației de un `fetch` care servește fișierele generate. Fișierul NU importă `limbi.ts`:
 * fiecare fișier `node --test` are procesul lui, deci aici nicio limbă nu e încărcată la început, ca în aplicație înainte
 * de pornire.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genereazaMesajele } from '../../scripts/mesaje.ts';
import { en } from '../../src/i18n/mesaje.en.ts';
import { ro } from '../../src/i18n/mesaje.ro.ts';
import { incarcaLimba, limba, limbaIncarcata, schimbaLimba, traduce } from '../../src/i18n/t.ts';
import { servesteMesajele } from './ajutor-mesaje.ts';

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

test('drumul adevărat (ADR 0095): un 404 și un fișier cu altă formă resping, cu calea în motiv; apoi `mesaje/ro.json` vine o dată', async () => {
  const lipsa = servesteMesajele({ 'mesaje/ro.json': 404 });
  try {
    await assert.rejects(incarcaLimba('ro'), /dicționarul ro \(\/mesaje\/ro\.json\): HTTP 404/);
    assert.equal(limbaIncarcata('ro'), false);
  } finally {
    lipsa.restaureaza();
  }
  // O versiune veche sau trunchiată: un mesaj număr nu trece de formă, deci limba rămâne neîncărcată.
  const altaForma = servesteMesajele({ 'mesaje/ro.json': '{"eroare.reincarca": 3}' });
  try {
    await assert.rejects(incarcaLimba('ro'), /dicționarul ro \(\/mesaje\/ro\.json\): fișierul nu are forma așteptată/);
    assert.equal(limbaIncarcata('ro'), false);
    assert.throws(() => traduce('ro', 'eroare.reincarca'), /nu e încărcat/);
  } finally {
    altaForma.restaureaza();
  }
  const bun = servesteMesajele();
  try {
    await incarcaLimba('ro');
    await incarcaLimba('ro');
    assert.deepEqual(bun.cereri, ['mesaje/ro.json'], 'doar limba cerută, o singură dată');
  } finally {
    bun.restaureaza();
  }
  assert.equal(limbaIncarcata('ro'), true);
  schimbaLimba('ro');
  assert.equal(limba(), 'ro');
  assert.equal(traduce('ro', 'eroare.reincarca'), 'Reîncarcă');
  assert.equal(traduce('ro', 'jurnal.intrari', { n: 0 }), '0 erori în jurnalul local');
});

test('fișierul generat e exact dicționarul din sursă, în fiecare limbă (cheile și textele, pluralele întregi)', () => {
  const f = genereazaMesajele();
  assert.deepEqual(JSON.parse(f.get('mesaje/ro.json') ?? 'null'), ro);
  assert.deepEqual(JSON.parse(f.get('mesaje/en.json') ?? 'null'), en);
  assert.deepEqual(Object.keys(ro).sort(), Object.keys(en).sort());
});

test('generatorul refuză un dicționar de bază gol, cu altă formă sau cu alte chei decât româna (build-ul se oprește)', () => {
  assert.throws(() => genereazaMesajele({ ro, en: {} }), /Dicționarul de bază en nu are forma/);
  assert.throws(() => genereazaMesajele({ ro: { ...ro, 'eroare.reincarca': { one: 'x' } } as never, en }), /Dicționarul de bază ro nu are forma/);
  const { ['eroare.reincarca']: _scos, ...faraUna } = en;
  assert.throws(() => genereazaMesajele({ ro, en: faraUna }), /Dicționarul de bază en are alte chei decât româna/);
  assert.throws(() => genereazaMesajele({ ro, en: { ...en, 'cheie.noua': 'x' } }), /Dicționarul de bază en are alte chei decât româna/);
});

test('o limbă încărcată nu se mai aduce, nici cu alt text: textele ei rămân cele venite prima dată', async () => {
  // Româna e deja încărcată; o încercare nouă cu alt text nu mai pleacă (o singură dată).
  await incarcaLimba('ro', () => Promise.resolve({ 'eroare.reincarca': 'altul' }));
  assert.equal(traduce('ro', 'eroare.reincarca'), 'Reîncarcă');
});
