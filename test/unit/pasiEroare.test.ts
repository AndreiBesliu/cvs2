import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MS_MAX_PAS, PLAFON_PASI, pasDin } from '../../shared/pasiEroare.ts';
import { pasBun, pasiDin } from '../../shared/pasiEroareVerificare.ts';
import type { Eveniment } from '../../shared/utilizare.ts';

/**
 * Pașii dinaintea unei erori (ADR 0262 §4, felia A.11a), pe hârtie: un pas din fiecare fel de eveniment (doar felul, id-ul,
 * rezultatul și cât înainte de eroare), apoi verificarea serverului: câmpurile exacte, felul, id-ul (zona la derulare și
 * zoom), rezultatul, timpul; ultimii 100 dintr-o listă mai lungă, cei stricați aruncați.
 */

test('un pas din fiecare fel: felul, id-ul (zona la derulare și zoom), rezultatul sau codul, cât înainte de eroare; nimic altceva', () => {
  const T = 100_000;
  const ev: Eveniment[] = [
    { fel: 'actiune', t: 96_800, id: 'document.roteste', de: 'tasta', rez: 'ok', n: 3 },
    { fel: 'actiune', t: 97_000, id: 'document.taie', de: 'bara', rez: 'motiv.nimic-ales' },
    { fel: 'fereastra', t: 98_000, id: 'masina' },
    { fel: 'unealta', t: 98_500, id: 'noduri', de: 'tasta' },
    { fel: 'dialog', t: 99_000, id: 'eticheta.export-titlu', rez: 'renuntat' },
    { fel: 'clic', t: 99_100, id: 'testid.export-gcode', de: 'bara', n: 2 },
    { fel: 'derulare', t: 99_200, de: 'panou', n: 4 },
    { fel: 'zoom', t: 99_300, de: 'panza', n: 2 },
    { fel: 'calcul', t: 99_400, id: 'export', ms: 3_000, rez: 'eroare', forme: 1_000 },
    { fel: 'masina', t: 99_500, id: 'alarma', cod: 9, cale: 'serial' },
    { fel: 'imprimanta', t: 99_600, id: 'legata' },
  ];
  assert.deepEqual(ev.map((e) => pasDin(e, T)), [
    { fel: 'actiune', id: 'document.roteste', rez: 'ok', ms: 3_200 },
    { fel: 'actiune', id: 'document.taie', rez: 'motiv.nimic-ales', ms: 3_000 },
    { fel: 'fereastra', id: 'masina', ms: 2_000 },
    { fel: 'unealta', id: 'noduri', ms: 1_500 },
    { fel: 'dialog', id: 'eticheta.export-titlu', rez: 'renuntat', ms: 1_000 },
    { fel: 'clic', id: 'testid.export-gcode', ms: 900 },
    { fel: 'derulare', id: 'panou', ms: 800 },
    { fel: 'zoom', id: 'panza', ms: 700 },
    { fel: 'calcul', id: 'export', rez: 'eroare', ms: 600 },
    { fel: 'masina', id: 'alarma', rez: 'cod:9', ms: 500 },
    { fel: 'imprimanta', id: 'legata', ms: 400 },
  ]);
  // Ceasul nu merge înapoi: un pas „de după” eroare e la 0; unul de acum două zile, la o zi.
  assert.equal(pasDin({ fel: 'fereastra', t: 10, id: 'proiectare' }, 5).ms, 0);
  assert.equal(pasDin({ fel: 'fereastra', t: 0, id: 'proiectare' }, 2 * MS_MAX_PAS).ms, MS_MAX_PAS);
});

test('verificarea serverului: câmpurile exacte, felul, id-ul, zona, rezultatul, timpul întreg; ce nu e un pas se aruncă', () => {
  const bun = { fel: 'actiune', id: 'document.roteste', rez: 'ok', ms: 1_200 };
  assert.deepEqual(pasBun(bun), bun);
  assert.deepEqual(pasBun({ fel: 'zoom', id: 'panza', ms: 0 }), { fel: 'zoom', id: 'panza', ms: 0 });
  for (const rau of [
    null, 'actiune', [bun], { ...bun, geometrie: [1, 2] }, { ...bun, fel: 'tasta' }, { ...bun, id: 'Document.Roteste' },
    { ...bun, id: 'un nume de foaie' }, { fel: 'zoom', id: 'document.roteste', ms: 0 }, { ...bun, rez: 'N-ai ales nimic.' },
    { ...bun, rez: 7 }, { ...bun, ms: -1 }, { ...bun, ms: 1.5 }, { ...bun, ms: MS_MAX_PAS + 1 }, { fel: 'actiune', rez: 'ok', ms: 0 },
  ]) {
    assert.equal(pasBun(rau), null, JSON.stringify(rau));
  }
  assert.deepEqual(pasiDin('nu'), []);
  const lung = Array.from({ length: PLAFON_PASI + 20 }, (_, i) => ({ fel: 'fereastra', id: 'proiectare', ms: i }));
  const p = pasiDin([...lung.slice(0, -1), { fel: 'fereastra', id: 'X', ms: 0 }]);
  assert.equal(p.length, PLAFON_PASI - 1, 'ultimii 100, fără cel stricat');
  assert.equal(p[0]?.ms, 20);
});

test('pasiAcum: fără înregistrator, niciun pas; cu el, o copie a inelului (o repetare numărată după eroare nu schimbă pașii luați)', async () => {
  const { pasiAcum, preiaUtilizarea } = await import('../../src/app/utilizare.ts');
  assert.deepEqual(pasiAcum().pasi, []);
  const inel: Array<Eveniment & { n?: number }> = [{ fel: 'actiune', t: 1, id: 'document.roteste', de: 'bara', rez: 'ok' }];
  preiaUtilizarea(() => undefined, () => inel);
  const luati = pasiAcum();
  (inel[0] as { n?: number }).n = 5;
  assert.deepEqual(luati.pasi, [{ fel: 'actiune', t: 1, id: 'document.roteste', de: 'bara', rez: 'ok' }]);
  assert.ok(luati.t >= 0);
});
