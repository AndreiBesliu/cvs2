/**
 * Stocarea extensiilor (ADR 0128 §B), fără IndexedDB: valorile primite (JSON sau octeți, ce se refuză), mărimea lor, cheile,
 * plafoanele (o valoare, o extensie, numărul cheilor) și serviciul `stocare.*`, cu și fără permisiune, pe un depozit în
 * memorie care ține aceeași formă ca cel din browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cheieBuna, LIMITE_STOCARE, masoaraValoare, servesteStocarea, type DepozitDate } from '../../src/extensii/stocare.ts';

function depozit(): DepozitDate & { readonly date: Map<string, { valoare: unknown; octeti: number }> } {
  const date = new Map<string, { valoare: unknown; octeti: number }>();
  const k = (id: string, cheie: string): string => `${id}\u0000${cheie}`;
  return {
    date,
    citeste: async (id, cheie) => date.get(k(id, cheie))?.valoare,
    scrie: async (id, cheie, valoare, octeti) => { date.set(k(id, cheie), { valoare, octeti }); },
    sterge: async (id, cheie) => { date.delete(k(id, cheie)); },
    marimi: async (id) => new Map([...date].filter(([c]) => c.startsWith(`${id}\u0000`)).map(([c, v]) => [c.slice(id.length + 1), v.octeti])),
  };
}
const CU = ['stocare'];

test('mărimea unei valori: octeții UTF-8 ai JSON-ului ei, sau byteLength; restul se refuză (null)', () => {
  assert.equal(masoaraValoare('ăâ'), new TextEncoder().encode('"ăâ"').length);
  assert.equal(masoaraValoare({ a: [1, 2, null, true], b: { c: 'x' } }), JSON.stringify({ a: [1, 2, null, true], b: { c: 'x' } }).length);
  assert.equal(masoaraValoare(null), 4);
  assert.equal(masoaraValoare(new Uint8Array(10)), 10);
  assert.equal(masoaraValoare(new ArrayBuffer(7)), 7);
  for (const rau of [undefined, Number.NaN, Infinity, () => 1, new Date(0), new Map(), new Set(), { a: undefined }, [undefined],
    { a: new Uint8Array(1) }, Object.create({ mostenit: 1 }), Symbol('s'), 10n]) {
    assert.equal(masoaraValoare(rau), null, String(rau));
  }
  let adanc: unknown = 1;
  for (let i = 0; i < LIMITE_STOCARE.adancime; i++) adanc = [adanc];
  assert.notEqual(masoaraValoare(adanc), null);
  assert.equal(masoaraValoare([adanc]), null);
});

test('cheile: șiruri de 1–200 de caractere', () => {
  for (const c of ['a', 'circuit/oval', 'ș'.repeat(200)]) assert.equal(cheieBuna(c), true, c);
  for (const c of ['', 'x'.repeat(201), 5, null, undefined, ['a']]) assert.equal(cheieBuna(c), false, String(c));
});

test('serviciul: scrie, citește, cheile, șterge; o cheie lipsă se citește null; datele unei extensii nu sunt ale alteia', async () => {
  const d = depozit();
  assert.deepEqual(await servesteStocarea('salut', CU, 'scrie', ['k', { n: 1 }], d), { ok: true, rezultat: null });
  assert.deepEqual(await servesteStocarea('salut', CU, 'scrie', ['b', 'x'], d), { ok: true, rezultat: null });
  assert.deepEqual(await servesteStocarea('salut', CU, 'citeste', ['k'], d), { ok: true, rezultat: { n: 1 } });
  assert.deepEqual(await servesteStocarea('salut', CU, 'chei', [], d), { ok: true, rezultat: ['b', 'k'] });
  assert.deepEqual(await servesteStocarea('alta', CU, 'citeste', ['k'], d), { ok: true, rezultat: null });
  assert.deepEqual(await servesteStocarea('alta', CU, 'chei', [], d), { ok: true, rezultat: [] });
  assert.deepEqual(await servesteStocarea('salut', CU, 'sterge', ['k'], d), { ok: true, rezultat: null });
  assert.deepEqual(await servesteStocarea('salut', CU, 'citeste', ['k'], d), { ok: true, rezultat: null });
  assert.deepEqual(await servesteStocarea('salut', CU, 'citeste', ['lipsa'], d), { ok: true, rezultat: null });
});

test('refuzuri: fără permisiune, cheie sau valoare greșită, metodă necunoscută; nimic scris', async () => {
  const d = depozit();
  assert.deepEqual(await servesteStocarea('salut', [], 'scrie', ['k', 1], d), { ok: false, eroare: 'stocare:permisiune' });
  assert.deepEqual(await servesteStocarea('salut', [], 'citeste', ['k'], d), { ok: false, eroare: 'stocare:permisiune' });
  assert.deepEqual(await servesteStocarea('salut', CU, 'scrie', ['', 1], d), { ok: false, eroare: 'stocare:cheie' });
  assert.deepEqual(await servesteStocarea('salut', CU, 'citeste', [7], d), { ok: false, eroare: 'stocare:cheie' });
  assert.deepEqual(await servesteStocarea('salut', CU, 'sterge', [null], d), { ok: false, eroare: 'stocare:cheie' });
  assert.deepEqual(await servesteStocarea('salut', CU, 'scrie', ['k', new Date(0)], d), { ok: false, eroare: 'stocare:valoare' });
  assert.deepEqual(await servesteStocarea('salut', CU, 'scrie', ['k'], d), { ok: false, eroare: 'stocare:valoare' });
  assert.deepEqual(await servesteStocarea('salut', CU, 'goleste', [], d), { ok: false, eroare: 'stocare:necunoscut' });
  assert.equal(d.date.size, 0);
});

test('plafoanele: o valoare de 4 MB, 16 MB pe extensie (o valoare înlocuită nu se numără de două ori), 1 000 de chei', async () => {
  const d = depozit();
  const sir = (n: number): string => 'x'.repeat(n - 2); // cu ghilimelele JSON-ului: n octeți
  assert.equal(masoaraValoare(sir(LIMITE_STOCARE.valoare)), LIMITE_STOCARE.valoare);
  assert.deepEqual(await servesteStocarea('s', CU, 'scrie', ['mare', sir(LIMITE_STOCARE.valoare + 1)], d), { ok: false, eroare: 'stocare:plin' });
  for (let i = 0; i < 4; i++) assert.equal((await servesteStocarea('s', CU, 'scrie', [`v${i}`, sir(LIMITE_STOCARE.valoare)], d)).ok, true);
  assert.deepEqual(await servesteStocarea('s', CU, 'scrie', ['inca', 1], d), { ok: false, eroare: 'stocare:plin' });
  assert.equal((await servesteStocarea('s', CU, 'scrie', ['v0', sir(LIMITE_STOCARE.valoare)], d)).ok, true);
  assert.equal((await servesteStocarea('s', CU, 'scrie', ['v0', 1], d)).ok, true);
  assert.equal((await servesteStocarea('s', CU, 'scrie', ['inca', 1], d)).ok, true);

  const c = depozit();
  for (let i = 0; i < LIMITE_STOCARE.chei; i++) assert.equal((await servesteStocarea('s', CU, 'scrie', [`k${i}`, 1], c)).ok, true);
  assert.deepEqual(await servesteStocarea('s', CU, 'scrie', ['k-noua', 1], c), { ok: false, eroare: 'stocare:plin' });
  assert.equal((await servesteStocarea('s', CU, 'scrie', ['k0', 2], c)).ok, true);
});
