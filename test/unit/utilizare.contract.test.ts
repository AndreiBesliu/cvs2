import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aceleasiSetariUtilizare, EVENIMENTE_PE_LOT, expiraUtilizareLa, idLot, lotDin, MARGINI_UTILIZARE, REPETARI_MAX, SESIUNE_MAX_MS,
  SETARI_UTILIZARE_IMPLICITE, setariPublice, setariUtilizareCerute, setariUtilizareDin, type SetariUtilizare,
} from '../../shared/utilizare.ts';

/**
 * Utilizarea aplicației (ADR 0262), contractul comun clientului și serverului: lotul și evenimentele lui după lista albă (un
 * eveniment cu un câmp în plus sau cu o valoare din afara listei se aruncă, numărat; restul lotului rămâne), marginile lotului,
 * setările din admin (cerute întregi și în margini; citite cu implicitele pe ce lipsește), ce află editorul din ele.
 */

const CONTEXT = { versiune: 'ed4c30c777de', limba: 'ro', aranjament: 'insule', tema: 'deschisa', ecran: 'laptop', browser: 'edge', atingere: false, online: true };
const lot = (extra: Record<string, unknown> = {}) => ({ sesiune: 'k3j9x0a1b2c3d4e5', nr: 1, acum: 60_000, context: CONTEXT, evenimente: [], ...extra });
const ev = {
  actiune: { fel: 'actiune', t: 1000, id: 'document.roteste', de: 'bara', rez: 'ok' },
  refuz: { fel: 'actiune', t: 1200, id: 'export.gcode', de: 'tasta', rez: 'motiv.nimic-ales', n: 3 },
  fereastra: { fel: 'fereastra', t: 2000, id: 'masina' },
  unealta: { fel: 'unealta', t: 3000, id: 'dreptunghi', de: 'tasta' },
  dialog: { fel: 'dialog', t: 4000, id: 'export', rez: 'renuntat' },
  clic: { fel: 'clic', t: 4500, id: 'testid.export-gcode', de: 'bara', n: 2 },
  derulare: { fel: 'derulare', t: 5000, de: 'panou', n: 7 },
  zoom: { fel: 'zoom', t: 5500, de: 'panza', n: 3 },
} as const;

test('lotul bun: evenimentele refăcute doar din câmpurile contractului, nimic aruncat', () => {
  const r = lotDin(lot({ evenimente: Object.values(ev) }));
  assert.ok(r);
  assert.equal(r.aruncate, 0);
  assert.deepEqual(r.lot.evenimente, Object.values(ev));
  assert.deepEqual(r.lot.context, CONTEXT);
  assert.equal(r.lot.sesiune, 'k3j9x0a1b2c3d4e5');
});

test('un câmp în plus, un fel necunoscut sau o valoare din afara listei aruncă doar evenimentul, numărat', () => {
  const rele = [
    { ...ev.actiune, text: 'Bună ziua' },
    { ...ev.actiune, de: 'mouse' },
    { ...ev.actiune, id: 'Document.Roteste' },
    { ...ev.actiune, rez: 'refuzat' },
    { ...ev.actiune, n: 0 },
    { ...ev.actiune, n: REPETARI_MAX + 1 },
    { ...ev.actiune, t: 1.5 },
    { ...ev.actiune, t: 60_001 },
    { ...ev.fereastra, id: 'birou' },
    { ...ev.unealta, id: 'a'.repeat(42) },
    { ...ev.dialog, rez: 'inchis' },
    { ...ev.clic, id: 'Buton Salvează' },
    { ...ev.clic, de: 'mouse' },
    { ...ev.clic, n: 0 },
    { ...ev.clic, text: 'Salvează' },
    { fel: 'derulare', t: 5000, de: 'panou' },
    { ...ev.derulare, n: 0 },
    { ...ev.derulare, id: 'lista' },
    { ...ev.zoom, de: 'roata' },
    { fel: 'tastare', t: 1, tasta: 'a' },
    { ...ev.fereastra, de: 'bara' },
    'document.roteste',
    null,
    [ev.actiune],
  ];
  const r = lotDin(lot({ evenimente: [ev.actiune, ...rele, ev.dialog] }));
  assert.ok(r);
  assert.equal(r.aruncate, rele.length);
  assert.deepEqual(r.lot.evenimente, [ev.actiune, ev.dialog]);
});

test('lotul: sesiunea, numărul, ceasul sesiunii și contextul sunt cerute; prea multe evenimente refuză lotul', () => {
  assert.equal(lotDin(null), null);
  assert.equal(lotDin(lot({ sesiune: 'scurt' })), null);
  assert.equal(lotDin(lot({ sesiune: 'K3J9X0A1B2C3D4E5' })), null);
  assert.equal(lotDin(lot({ nr: 0 })), null);
  assert.equal(lotDin(lot({ nr: 2.5 })), null);
  assert.equal(lotDin(lot({ acum: -1 })), null);
  assert.equal(lotDin(lot({ acum: SESIUNE_MAX_MS + 1 })), null);
  assert.equal(lotDin(lot({ evenimente: 'nimic' })), null);
  assert.equal(lotDin(lot({ evenimente: Array.from({ length: EVENIMENTE_PE_LOT + 1 }, () => ev.actiune) })), null);
  assert.ok(lotDin(lot({ evenimente: Array.from({ length: EVENIMENTE_PE_LOT }, () => ev.actiune) })));
  assert.equal(lotDin(lot({ altceva: 1 })), null, 'un câmp în plus al lotului');
  for (const [k, v] of [
    ['versiune', 'necunoscută'], ['limba', 'de'], ['aranjament', 'Insule!'], ['tema', 'albastra'], ['ecran', '1920x1080'],
    ['browser', 'Mozilla/5.0'], ['atingere', 'da'], ['online', 1],
  ] as const) {
    assert.equal(lotDin(lot({ context: { ...CONTEXT, [k]: v } })), null, `contextul: ${k}`);
  }
  assert.equal(lotDin(lot({ context: { ...CONTEXT, email: 'ana@exemplu.ro' } })), null, 'un câmp în plus al contextului');
  const { aranjament: _, ...faraAranjament } = CONTEXT;
  assert.equal(lotDin(lot({ context: faraAranjament })), null, 'un câmp lipsă al contextului');
});

test('id-ul lotului: sesiunea și numărul (o reîncercare cade pe același document)', () => {
  assert.equal(idLot('k3j9x0a1b2c3d4e5', 7), 'k3j9x0a1b2c3d4e5-7');
});

test('setările: implicitele din ADR 0262 §8, marginile, cerute întregi', () => {
  assert.deepEqual(SETARI_UTILIZARE_IMPLICITE, { colectare: true, clicuri: true, lotMinute: 5, zileEvenimente: 90, zileSume: 730, pasiEroare: 30 });
  assert.deepEqual(MARGINI_UTILIZARE, { lotMinute: [1, 60], zileEvenimente: [7, 365], zileSume: [90, 1095], pasiEroare: [0, 100] });
  const bune: SetariUtilizare = { colectare: false, clicuri: false, lotMinute: 1, zileEvenimente: 365, zileSume: 90, pasiEroare: 0 };
  assert.deepEqual(setariUtilizareCerute(bune), bune);
  assert.deepEqual(setariUtilizareCerute({ ...SETARI_UTILIZARE_IMPLICITE }), SETARI_UTILIZARE_IMPLICITE);
  for (const [k, v] of [
    ['colectare', 'da'], ['clicuri', 1], ['lotMinute', 0], ['lotMinute', 61], ['lotMinute', 2.5], ['zileEvenimente', 6],
    ['zileEvenimente', 366], ['zileSume', 89], ['zileSume', 1096], ['pasiEroare', -1], ['pasiEroare', 101], ['pasiEroare', '30'],
  ] as const) {
    assert.equal(setariUtilizareCerute({ ...SETARI_UTILIZARE_IMPLICITE, [k]: v }), null, `${k} = ${String(v)}`);
  }
  const { clicuri: _, ...faraClicuri } = SETARI_UTILIZARE_IMPLICITE;
  assert.equal(setariUtilizareCerute(faraClicuri), null);
  assert.equal(setariUtilizareCerute({ ...SETARI_UTILIZARE_IMPLICITE, altceva: 1 }), null);
  assert.equal(setariUtilizareCerute(null), null);
});

test('setările citite: implicitele pe ce lipsește sau e stricat, versiunea 0 fără document', () => {
  assert.deepEqual(setariUtilizareDin(undefined), { setari: SETARI_UTILIZARE_IMPLICITE, versiune: 0 });
  assert.deepEqual(setariUtilizareDin({ colectare: false, lotMinute: 999, versiune: 4 }), {
    setari: { ...SETARI_UTILIZARE_IMPLICITE, colectare: false }, versiune: 4,
  });
  assert.deepEqual(setariUtilizareDin({ versiune: 'x' }).versiune, 0);
  assert.ok(aceleasiSetariUtilizare(SETARI_UTILIZARE_IMPLICITE, { ...SETARI_UTILIZARE_IMPLICITE }));
  assert.ok(!aceleasiSetariUtilizare(SETARI_UTILIZARE_IMPLICITE, { ...SETARI_UTILIZARE_IMPLICITE, pasiEroare: 29 }));
});

test('ce află editorul: doar ce-i schimbă purtarea, nu păstrările', () => {
  assert.deepEqual(setariPublice({ ...SETARI_UTILIZARE_IMPLICITE, zileEvenimente: 30, zileSume: 365 }), {
    colectare: true, clicuri: true, lotMinute: 5, pasiEroare: 30,
  });
});

test('ștergerea singură: după zilele din setări, de la scriere', () => {
  assert.equal(expiraUtilizareLa(Date.UTC(2026, 10, 23), 90), Date.UTC(2027, 1, 21));
});
