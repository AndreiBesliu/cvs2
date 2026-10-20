import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, PLAFON, type Document, type Ghidaj } from '../../src/model/document.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, reface } from '../../src/model/jurnal.ts';

/**
 * Ghidajele foii (ADR 0050 §1): opționale în documentul v10, judecate de ușă (forma, plafonul, id-urile unice, poziția),
 * păstrate cu câmpurile lor necunoscute; comanda lor din jurnal, cu anularea și refacerea.
 */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const cuGhidaje = (ghidaje: unknown): unknown => {
  const d = documentNou(STOC) as unknown as { foi: Array<Record<string, unknown>> };
  const f = d.foi[0];
  if (f) f['ghidaje'] = ghidaje;
  return d;
};
const motiv = (r: ReturnType<typeof incarca>): string => (r.ok ? 'trece' : r.motiv);

test('ușa: un document fără ghidaje rămâne neatins (câmpul e opțional, fără schemă nouă)', () => {
  const d = documentNou(STOC);
  const r = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(r.ok);
  assert.equal(jsonCanonic(r.doc), jsonCanonic(d));
  assert.equal(r.doc.schema, 10);
});

test('ușa: ghidajele bune trec, cu câmpurile lor necunoscute păstrate', () => {
  const g = [{ id: 'g1', axa: 'x', poz: 150 }, { id: 'g2', axa: 'y', poz: -12.5, culoare: 'albastru' }];
  const r = incarca(cuGhidaje(g));
  assert.ok(r.ok, motiv(r));
  assert.deepEqual(r.doc.foi[0]?.ghidaje, g);
});

test('ușa: forma greșită, poziția în afara plafonului, id-uri duble și prea multe ghidaje sunt refuzate, cu motivul', () => {
  const rele: Array<[unknown, RegExp]> = [
    ['nu e listă', /ghidaje|foi/],
    [[{ id: 'g1', axa: 'z', poz: 1 }], /axa|ghidaje|foi/],
    [[{ id: 'g1', axa: 'x', poz: Number.NaN }], /poz|ghidaje|foi/],
    [[{ id: 'g1', axa: 'x', poz: PLAFON.translatie * 2 }], /poz|ghidaje|foi/],
    [[{ id: 'g 1', axa: 'x', poz: 1 }], /id|ghidaje|foi/],
    [[{ axa: 'x', poz: 1 }], /id|ghidaje|foi/],
  ];
  for (const [g, m] of rele) {
    const r = incarca(cuGhidaje(g));
    assert.equal(r.ok, false, JSON.stringify(g));
    assert.match(motiv(r), m, JSON.stringify(g));
  }
  assert.match(motiv(incarca(cuGhidaje([{ id: 'g1', axa: 'x', poz: 1 }, { id: 'g1', axa: 'y', poz: 2 }]))), /două ghidaje.*g1/);
  const multe = Array.from({ length: PLAFON.ghidaje + 1 }, (_, k) => ({ id: `g${k}`, axa: 'x', poz: k }));
  assert.match(motiv(incarca(cuGhidaje(multe))), new RegExp(`${PLAFON.ghidaje}`));
  assert.ok(incarca(cuGhidaje(multe.slice(0, PLAFON.ghidaje))).ok, 'exact plafonul trece');
});

test('jurnalul: inlocuieste-ghidaje schimbă lista foii, iar anularea și refacerea o aduc exact înapoi', () => {
  const d: Document = documentNou(STOC);
  const g1: Ghidaj[] = [{ id: 'g1', axa: 'x', poz: 100 }];
  const g2: Ghidaj[] = [...g1, { id: 'g2', axa: 'y', poz: 50 }];
  let h = istoricNou(d);
  h = executa(h, { tip: 'inlocuieste-ghidaje', foaie: 'f1', vechi: [], nou: g1 });
  h = executa(h, { tip: 'inlocuieste-ghidaje', foaie: 'f1', vechi: g1, nou: g2 });
  assert.deepEqual(h.doc.foi[0]?.ghidaje, g2);
  assert.equal(h.doc.rev, 2);
  h = anuleaza(h);
  assert.deepEqual(h.doc.foi[0]?.ghidaje, g1);
  h = anuleaza(h);
  assert.deepEqual(h.doc.foi[0]?.ghidaje, []);
  h = reface(reface(h));
  assert.deepEqual(h.doc.foi[0]?.ghidaje, g2);
  // Documentul rezultat trece de ușă (ce scrie interfața se poate redeschide).
  assert.ok(incarca(JSON.parse(JSON.stringify(h.doc))).ok);
  assert.throws(() => executa(h, { tip: 'inlocuieste-ghidaje', foaie: 'nu-exista', vechi: [], nou: g1 }), /foaia/);
});
