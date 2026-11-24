import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogActiuni } from '../../scripts/catalogActiuni.ts';
import { esteCatalogActiuni, type CatalogActiuni } from '../../shared/documentatie.ts';
import { SumatorZi, type LotZi } from '../../shared/utilizareZi.ts';
import {
  celeMaiFolosite, cifre, cuantila, dialoguriParasite, durate, nefolosite, primaZi, refuzuri, sumePerioada,
} from '../../src/admin/utilizare/date.ts';

/**
 * Fila Utilizare (ADR 0262 §6, felia A.9b), partea pură: două zile scrise de sumatorul jobului, apoi perioada pe segmente,
 * cifrele, cele mai folosite, ce nu se folosește (din catalog), frecările, duratele; plus catalogul generat la build.
 */

const lot = (uid: string, sesiune: string, personal: boolean, evenimente: Record<string, unknown>[]): LotZi =>
  ({ uid, sesiune, personal, aruncate: 0, evenimente });
function zi(z: string, loturi: LotZi[]): unknown {
  const s = new SumatorZi(z);
  for (const l of loturi) s.adauga(l);
  return JSON.parse(JSON.stringify(s.rezultat()));
}
const ROTESTE = (t: number, de: string, rez = 'ok', n?: number) => ({ fel: 'actiune', t, id: 'document.roteste', de, rez, ...(n ? { n } : {}) });
const z1 = zi('2026-11-22', [
  lot('ana', 'aaaaaaaaaaaaaaa1', false, [
    ROTESTE(1_000, 'bara', 'ok', 3), ROTESTE(2_000, 'tasta'), ROTESTE(3_000, 'bara', 'motiv.nimic-ales'),
    { fel: 'actiune', t: 4_000, id: 'export.gcode', de: 'paleta', rez: 'ok' },
    { fel: 'dialog', t: 5_000, id: 'eticheta.export-titlu', rez: 'deschis' }, { fel: 'dialog', t: 6_000, id: 'eticheta.export-titlu', rez: 'renuntat' },
    { fel: 'calcul', t: 7_000, id: 'export', ms: 1_000, rez: 'ok', forme: 100 },
    { fel: 'calcul', t: 8_000, id: 'export', ms: 3_000, rez: 'ok', forme: 100 },
  ]),
  lot('owner', 'ooooooooooooooo1', true, [ROTESTE(1, 'bara', 'ok', 5)]),
]);
const z2 = zi('2026-11-23', [
  lot('ana', 'aaaaaaaaaaaaaaa2', false, [ROTESTE(1_000, 'meniu'), { fel: 'calcul', t: 2_000, id: 'export', ms: 30_000, rez: 'eroare', forme: 10 }]),
  lot('ion', 'iiiiiiiiiiiiiii1', false, [
    ROTESTE(1_000, 'tasta', 'motiv.nimic-ales'), { fel: 'actiune', t: 2_000, id: 'export.gcode', de: 'bara', rez: 'motiv.fara-forme' },
    { fel: 'unealta', t: 3_000, id: 'noduri', de: 'tasta' },
    // Un dialog dus până la capăt nu e o frecare.
    { fel: 'dialog', t: 4_000, id: 'testid.raport', rez: 'deschis' }, { fel: 'dialog', t: 5_000, id: 'testid.raport', rez: 'gata' },
  ]),
]);

test('perioada pe segmente: numerele adunate, oamenii uniți (Ana în ambele zile, o dată), personalul deoparte; o zi stricată, sărită', () => {
  const c = sumePerioada([z1, z2, { zi: 'ieri', segmente: {} }, null, { zi: '2026-11-24', segmente: 'nu' }], 'clienti');
  assert.equal(c.zile, 2);
  assert.deepEqual(cifre(c), { oameni: 2, sesiuni: 3, exporturi: 2, refuzate: 3 });
  const r = c.actiuni.get('document.roteste');
  assert.deepEqual([r?.n, r?.ok, r?.de, r?.motive], [7, 5, { bara: 4, tasta: 2, meniu: 1 }, { 'motiv.nimic-ales': 2 }]);
  const p = sumePerioada([z1, z2], 'personal');
  assert.deepEqual(cifre(p), { oameni: 1, sesiuni: 1, exporturi: 0, refuzate: 0 });
  assert.deepEqual(cifre(sumePerioada([z1, z2], 'toti')), { oameni: 3, sesiuni: 4, exporturi: 2, refuzate: 3 });
});

test('cele mai folosite: de câte ori, câți oameni, câte din taste și paletă', () => {
  const c = sumePerioada([z1, z2], 'clienti');
  assert.deepEqual(celeMaiFolosite(c), [
    { id: 'document.roteste', n: 7, oameni: 2, taste: 2 }, { id: 'export.gcode', n: 2, oameni: 2, taste: 1 },
  ]);
  assert.deepEqual(celeMaiFolosite(c, 1).map((r) => r.id), ['document.roteste']);
});

test('ce nu se folosește: tot catalogul, cei mai puțini oameni întâi, și ce n-a folosit nimeni', () => {
  const catalog: CatalogActiuni = {
    schema: 1,
    actiuni: [{ id: 'document.roteste', ro: 'Rotește', en: 'Rotate' }, { id: 'export.gcode', ro: 'Exportă', en: 'Export' }, { id: 'document.taie', ro: 'Taie', en: 'Cut' }],
    unelte: [{ id: 'noduri', ro: 'Noduri', en: 'Nodes' }, { id: 'pen', ro: 'Pen', en: 'Pen' }],
  };
  const c = sumePerioada([z1, z2], 'clienti');
  assert.deepEqual(nefolosite(catalog, c).map((r) => [r.fel, r.id, r.oameni, r.n]), [
    ['actiune', 'document.taie', 0, 0], ['unealta', 'pen', 0, 0], ['unealta', 'noduri', 1, 1], ['actiune', 'export.gcode', 2, 2],
    ['actiune', 'document.roteste', 2, 7],
  ]);
});

test('frecările: refuzurile pe acțiune și motiv, dialogurile părăsite (nu și cele duse până la capăt)', () => {
  const c = sumePerioada([z1, z2], 'clienti');
  assert.deepEqual(refuzuri(c), [
    { id: 'document.roteste', motiv: 'motiv.nimic-ales', n: 2 }, { id: 'export.gcode', motiv: 'motiv.fara-forme', n: 1 },
  ]);
  assert.deepEqual(dialoguriParasite(c), [{ id: 'eticheta.export-titlu', deschis: 1, renuntat: 1, gata: 0 }]);
});

test('duratele: mediana și cele mai lente 5 %, ca trepte; erorile și anulările', () => {
  assert.equal(cuantila({}, 0.5), null);
  assert.equal(cuantila({ 300: 1 }, 0.5), 300);
  // 10 la 0,1 s, 9 la 1 s, 1 la 30 s: mediana 0,1 s (a zecea), cele mai lente 5 % la 30 s (a douăzecea).
  assert.equal(cuantila({ 100: 10, 1000: 9, 30000: 1 }, 0.5), 100);
  assert.equal(cuantila({ 100: 10, 1000: 9, 30000: 1 }, 0.95), 1000);
  assert.equal(cuantila({ 100: 10, 1000: 8, 30000: 2 }, 0.95), 30000);
  assert.equal(cuantila({ '1000': 1, '100': 3 }, 0.5), 100, 'cheile se ordonează ca numere');
  const c = sumePerioada([z1, z2], 'clienti');
  assert.deepEqual(durate(c), [{ id: 'export', n: 3, mediana: 3000, lente: 30000, erori: 1, anulate: 0 }]);
});

test('perioada: ziua de început, după calendar', () => {
  assert.equal(primaZi('2026-11-24', 7), '2026-11-17');
  assert.equal(primaZi('2026-03-01', 1), '2026-02-28');
  assert.equal(primaZi('2027-01-05', 30), '2026-12-06');
});

test('catalogul generat la build: acțiunile registrului și uneltele, cu numele scurte în ambele limbi, fără dubluri', () => {
  const c = catalogActiuni();
  assert.ok(esteCatalogActiuni(c));
  const ids = c.actiuni.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), ids, 'în ordinea id-urilor');
  for (const id of ['export.gcode', 'document.roteste', 'vedere.masina']) assert.ok(ids.includes(id), id);
  assert.ok(c.unelte.some((u) => u.id === 'noduri' && u.ro === 'Noduri'));
  for (const a of [...c.actiuni, ...c.unelte]) {
    assert.ok(a.ro.length > 0 && a.en.length > 0, a.id);
    assert.ok(!/[(:]/.test(a.ro) && !/[(:]/.test(a.en), `${a.id}: numele scurt, fără explicație`);
  }
  assert.equal(esteCatalogActiuni({ ...c, actiuni: [{ id: 'x', ro: 1, en: 'y' }] }), false);
});
