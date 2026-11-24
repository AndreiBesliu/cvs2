/**
 * Relieful din imagine ca import (ADR 0310 §7, felia 18.1↑a): piesa are un singur element, forma `relief` cu un strat
 * („adună”, vizibil, harta dată), fără operații; pagina e cât relieful; documentul cu piesa pusă trece de ușă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pregatitRelief } from '../../src/app/reliefImport.ts';
import { VERSIUNE_SCHEMA, type Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';

const H = '0123456789abcdef'.repeat(4);

test('piesa reliefului: un element relief, un strat, fără operații; pagina cât relieful; ușa o primește', () => {
  const p = pregatitRelief({ nx: 400, ny: 300, celula: 0.25, amprenta: H }, 'medalion.png');
  assert.equal(p.nume, 'medalion');
  assert.deepEqual(p.pagina, { latime: 100, inaltime: 75 });
  assert.deepEqual(p.cai, []);
  const pus = p.piesa('p1', {});
  assert.deepEqual([pus.x, pus.y, pus.latime, pus.inaltime], [0, 0, 100, 75]);
  assert.deepEqual(pus.piesa.operatii, []);
  const el = pus.piesa.radacina.tip === 'grup' ? pus.piesa.radacina.copii[0] : undefined;
  assert.ok(el && el.tip === 'element' && el.forma.tip === 'relief');
  assert.deepEqual(el.forma, { tip: 'relief', nx: 400, ny: 300, celula: 0.25, straturi: [{ id: 's1', nume: 'medalion.png', mod: 'aduna', vizibil: true, dale: H }] });
  const doc: Document = {
    schema: VERSIUNE_SCHEMA, rev: 1, piese: [pus.piesa],
    foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [{ id: 'p1', piesa: 'p1', x: 10, y: 20, rotire: 0 }] }],
  };
  assert.ok(p.treceDeUsa(doc));
  assert.ok(incarca(structuredClone(doc)).ok);
});

test('piesa reliefului: un nume lung de fișier se taie la plafonul numelor', () => {
  const lung = `${'x'.repeat(300)}.png`;
  const pus = pregatitRelief({ nx: 1, ny: 1, celula: 1, amprenta: H }, lung).piesa('p1', {});
  const el = pus.piesa.radacina.tip === 'grup' ? pus.piesa.radacina.copii[0] : undefined;
  assert.ok(el && el.tip === 'element' && el.forma.tip === 'relief');
  assert.ok((el.forma.straturi[0]?.nume?.length ?? 0) <= 200);
  assert.ok((pus.piesa.nume ?? '').length <= 200);
});
