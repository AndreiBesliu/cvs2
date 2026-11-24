import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aceleasiSetariUtilizare, EVENIMENTE_PE_LOT, expiraUtilizareLa, idLot, lotDin, MARGINI_UTILIZARE, REPETARI_MAX, SESIUNE_MAX_MS,
  SETARI_UTILIZARE_IMPLICITE, setariPublice, setariUtilizareCerute, setariUtilizareDin, treaptaMarime, treaptaMs, TREPTE_MARIME, TREPTE_MS,
  type SetariUtilizare,
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
  calcul: { fel: 'calcul', t: 6000, id: 'export', ms: 3_000, rez: 'ok', forme: 1_000 },
  importul: { fel: 'calcul', t: 6100, id: 'import', ms: 300, rez: 'eroare', octeti: 1_000_000, format: 'dxf' },
  anulat: { fel: 'calcul', t: 6200, id: 'traseu', ms: 100, rez: 'anulat' },
  legata: { fel: 'masina', t: 7000, id: 'legata', cale: 'retea' },
  alarma: { fel: 'masina', t: 7100, id: 'alarma', cod: 9 },
  terminata: { fel: 'masina', t: 7200, id: 'terminata' },
  imprimanta: { fel: 'imprimanta', t: 8000, id: 'eroare', cod: 2_029 },
  pauzaFisier: { fel: 'imprimanta', t: 8100, id: 'pauza-fisier' },
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
    // Calculele: durata și mărimea doar în trepte; formele doar la CAM, octeții și formatul doar la import.
    { ...ev.calcul, ms: 2_999 },
    { ...ev.calcul, forme: 1_234 },
    { ...ev.calcul, id: 'trasare' },
    { ...ev.calcul, rez: 'gata' },
    { ...ev.calcul, octeti: 1_000 },
    { ...ev.calcul, format: 'svg' },
    { ...ev.importul, forme: 10 },
    { ...ev.importul, format: 'docx' },
    { ...ev.importul, nume: 'bucatarie.dxf' },
    { fel: 'calcul', t: 6000, id: 'export', rez: 'ok' },
    // Mașina: codul doar la eroare și la alarmă, felul legăturii doar la legare; nicio adresă.
    { ...ev.alarma, cod: 100_000 },
    { ...ev.terminata, cod: 9 },
    { ...ev.legata, cale: 'usb' },
    { ...ev.terminata, cale: 'serial' },
    { ...ev.legata, adresa: '192.168.1.10' },
    { ...ev.terminata, id: 'explodata' },
    // Imprimanta: codul doar la eroare; nici fișierul.
    { ...ev.pauzaFisier, cod: 1 },
    { ...ev.imprimanta, cod: -1 },
    { ...ev.pauzaFisier, fisier: 'piesa.gcode' },
    { ...ev.imprimanta, id: 'pauzaFisier' },
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

test('treptele: cea mai mică margine care cuprinde valoarea, ultima pentru tot ce trece', () => {
  assert.deepEqual([0, 99, 100, 299, 2_500, 299_999, 300_000, 5e9].map(treaptaMs), [100, 100, 300, 300, 3_000, 300_000, 1_000_000, 1_000_000]);
  assert.deepEqual([0, 9, 10, 999, 1_000, 123_456, 2e9].map(treaptaMarime), [10, 10, 100, 1_000, 10_000, 1_000_000, 1_000_000_000]);
  for (const x of [0, 1, 5, 77, 1e4, 3e5, 1e7, 1e12]) {
    assert.ok((TREPTE_MS as readonly number[]).includes(treaptaMs(x)));
    assert.ok((TREPTE_MARIME as readonly number[]).includes(treaptaMarime(x)));
  }
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
