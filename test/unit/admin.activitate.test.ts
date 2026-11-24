import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginaDin, sesiuniDin, textClipa } from '../../src/admin/utilizatori/activitate.ts';

/** Activitatea unui om în admin (ADR 0262 §6, felia A.11c), partea pură: pagina citită, sesiunile strânse, clipele. */

const CONTEXT = { versiune: 'ed4c30c777de', limba: 'ro', aranjament: 'insule', tema: 'deschisa', ecran: 'laptop', browser: 'edge', atingere: false, online: true };
const A = (t: number, id: string) => ({ fel: 'actiune', t, id, de: 'bara', rez: 'ok' });
const lot = (id: string, sesiune: string, nr: number, primit: number, evenimente: unknown[], extra: Record<string, unknown> = {}) =>
  ({ id, sesiune, nr, primit, inceput: primit - 600_000, context: CONTEXT, evenimente, aruncate: 0, ...extra });

test('pagina: loturile cu forma lor; evenimentele încă o dată prin lista albă (cele stricate numărate la aruncate); o formă greșită, goală', () => {
  const p = paginaDin({ ok: true, maiVechi: true, loturi: [
    lot('s2-1', 's2', 1, 2_000_000, [A(5_000, 'document.roteste'), { fel: 'actiune', t: 1, id: 'Foaia mea', de: 'bara', rez: 'ok' }]),
    { id: 'x', sesiune: 's3' }, 'stricat',
  ] });
  assert.equal(p.maiVechi, true);
  assert.equal(p.loturi.length, 1);
  assert.deepEqual(p.loturi[0]?.evenimente, [A(5_000, 'document.roteste')]);
  assert.equal(p.loturi[0]?.aruncate, 1);
  assert.deepEqual(p.loturi[0]?.context, CONTEXT);
  assert.deepEqual(paginaDin(null), { loturi: [], maiVechi: false });
  assert.deepEqual(paginaDin({ loturi: 'nu' }), { loturi: [], maiVechi: false });
});

test('sesiunile: cele mai noi întâi; loturile unei sesiuni unite (și din pagini diferite), evenimentele în ordinea timpului, cât a ținut', () => {
  const { loturi } = paginaDin({ loturi: [
    lot('s2-2', 's2', 2, 3_000_000, [A(70_000, 'export.gcode')]),
    lot('s2-1', 's2', 1, 2_000_000, [A(5_000, 'document.importa'), A(20_000, 'document.rol')], { aruncate: 2 }),
    lot('s1-1', 's1', 1, 1_000_000, [A(1_000, 'document.roteste')]),
  ] });
  const s = sesiuniDin(loturi);
  assert.deepEqual(s.map((x) => x.sesiune), ['s2', 's1']);
  assert.deepEqual(s[0]?.evenimente.map((e) => (e.fel === 'actiune' ? e.id : '')), ['document.importa', 'document.rol', 'export.gcode']);
  assert.equal(s[0]?.durata, 65_000);
  assert.equal(s[0]?.aruncate, 2);
  assert.equal(s[0]?.inceput, 2_000_000 - 600_000);
  assert.equal(s[1]?.durata, 0);
});

test('clipa: față de pornirea paginii', () => {
  assert.deepEqual([textClipa(0), textClipa(65_400), textClipa(3_725_000), textClipa(-5)], ['+0:00', '+1:05', '+1:02:05', '+0:00']);
});
