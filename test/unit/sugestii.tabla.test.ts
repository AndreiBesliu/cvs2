import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOANE, cuMutarea, dupaDecizie, lipsesteNota, notaCeruta, sugestieDin, tabla, tintePentru, type Sugestie,
} from '../../src/admin/sugestii/date.ts';
import { STARI_SUGESTIE } from '../../shared/sugestii.ts';

/**
 * Tabla Sugestiilor (ADR 0260 §4, felia A.4), partea pură: coloanele și ordinea din ele, unde se mută un card, nota cerută,
 * mutarea arătată cât cererea e în drum și lista după răspunsul serverului (fără recitire).
 */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const s = (id: string, d: Record<string, unknown>): Sugestie => sugestieDin(id, { versiune: 1, ...d });
const ids = (l: readonly Sugestie[]): string[] => l.map((x) => x.id);

test('coloanele în ordinea schiței; „Mută în…” dă celelalte coloane, apoi Respinsă, fără starea de acum', () => {
  assert.deepEqual(COLOANE, ['noua', 'acceptata', 'in-lucru', 'amanata', 'facuta']);
  assert.deepEqual(tintePentru(s('a', { stare: 'noua' })), ['acceptata', 'in-lucru', 'amanata', 'facuta', 'respinsa']);
  assert.deepEqual(tintePentru(s('a', { stare: 'amanata' })), ['noua', 'acceptata', 'in-lucru', 'facuta', 'respinsa']);
  assert.deepEqual(tintePentru(s('a', { stare: 'respinsa' })), [...COLOANE], 'o respinsă se poate întoarce în orice coloană');
  assert.deepEqual(tintePentru(s('a', { stare: 'gata' })), [...COLOANE, 'respinsa'], 'o stare necunoscută: toate');
});

test('nota se cere doar la Respinsă și la Amânată; spațiile singure nu sunt o notă', () => {
  assert.deepEqual(STARI_SUGESTIE.filter(notaCeruta), ['amanata', 'respinsa']);
  for (const nota of ['', ' ', '\n\t  \r\n']) {
    assert.equal(lipsesteNota('respinsa', nota), true, JSON.stringify(nota));
    assert.equal(lipsesteNota('amanata', nota), true, JSON.stringify(nota));
    assert.equal(lipsesteNota('acceptata', nota), false, JSON.stringify(nota));
    assert.equal(lipsesteNota('noua', nota), false, JSON.stringify(nota));
  }
  assert.equal(lipsesteNota('respinsa', 'Nu acum.'), false);
  assert.equal(lipsesteNota('amanata', '  după etapa 6  '), false);
});

test('tabla: fiecare card o dată, în coloana stării lui; „Fără decizie” după cele mai noi, restul după ultima decizie', () => {
  const lista = [
    s('n1', { stare: 'noua', creataLa: ts('2026-11-01T10:00:00Z'), decisaLa: ts('2026-11-20T10:00:00Z') }),
    s('n2', { stare: 'noua', creataLa: ts('2026-11-03T10:00:00Z') }),
    s('n3', { stare: 'noua' }),
    s('a1', { stare: 'acceptata', creataLa: ts('2026-11-05T10:00:00Z'), decisaLa: ts('2026-11-06T10:00:00Z') }),
    s('a2', { stare: 'acceptata', creataLa: ts('2026-11-02T10:00:00Z'), decisaLa: ts('2026-11-10T10:00:00Z') }),
    s('a3', { stare: 'acceptata', creataLa: ts('2026-11-09T10:00:00Z') }),
    s('a4', { stare: 'acceptata', creataLa: ts('2026-11-04T10:00:00Z') }),
    s('r1', { stare: 'respinsa', creataLa: ts('2026-11-01T10:00:00Z'), decisaLa: ts('2026-11-02T10:00:00Z') }),
    s('f1', { stare: 'facuta', decisaLa: ts('2026-11-07T10:00:00Z') }),
    s('x1', { stare: 'gata', creataLa: ts('2026-11-08T10:00:00Z') }),
    s('x2', { stare: null }),
  ];
  const { coloane, necunoscute } = tabla(lista);
  // „Fără decizie”: cele mai noi întâi, chiar dacă una a fost mutată înapoi aici (decizia nu o urcă); fără dată, la coadă.
  assert.deepEqual(ids(coloane.noua), ['n2', 'n1', 'n3']);
  // Celelalte: ultima decizie întâi; fără decizie la egalitate, ordinea celor mai noi (a3 înaintea lui a4).
  assert.deepEqual(ids(coloane.acceptata), ['a2', 'a1', 'a3', 'a4']);
  assert.deepEqual(ids(coloane.respinsa), ['r1']);
  assert.deepEqual(ids(coloane.facuta), ['f1']);
  assert.deepEqual(ids(coloane['in-lucru']), []);
  assert.deepEqual(ids(coloane.amanata), []);
  assert.deepEqual(ids(necunoscute), ['x1', 'x2']);
  const toate = [...STARI_SUGESTIE.flatMap((st) => ids(coloane[st])), ...ids(necunoscute)].sort();
  assert.deepEqual(toate, ids(lista).sort(), 'nimic pierdut, nimic de două ori');
});

test('mutarea în drum: cardul trece în coloana nouă, în capul ei; restul rămân aceleași obiecte', () => {
  const lista = [
    s('a', { stare: 'noua', creataLa: ts('2026-11-01T10:00:00Z') }),
    s('b', { stare: 'acceptata', decisaLa: ts('2026-11-21T10:00:00Z') }),
  ];
  assert.equal(cuMutarea(lista, null), lista);
  const la = new Date('2026-11-22T10:00:00Z');
  const dupa = cuMutarea(lista, { id: 'a', spre: 'acceptata', la });
  assert.equal(dupa[1], lista[1]);
  assert.deepEqual([dupa[0]?.stare, dupa[0]?.decisaLa], ['acceptata', la]);
  assert.equal(lista[0]?.stare, 'noua', 'lista citită nu se schimbă');
  assert.deepEqual(ids(tabla(dupa).coloane.acceptata), ['a', 'b']);
  assert.deepEqual(ids(tabla(dupa).coloane.noua), []);
});

test('după răspuns: starea, nota curățată ca pe server, ora și versiunea întoarsă, doar pe versiunea trimisă', () => {
  const lista = [
    s('a', { stare: 'noua', titlu: 'Grila', autor: 'ana', nota: '', versiune: 3 }),
    s('b', { stare: 'noua', versiune: 3 }),
  ];
  const acum = new Date('2026-11-22T10:00:00Z');
  const d = { id: 'a', versiune: 3, stare: 'amanata' as const, nota: '  După etapa 6,\r\nnu acum.  ' };
  const dupa = dupaDecizie(lista, d, { ok: true, id: 'a', schimbat: true, versiune: 4 }, acum);
  assert.deepEqual([dupa[0]?.stare, dupa[0]?.nota, dupa[0]?.decisaLa, dupa[0]?.versiune], ['amanata', 'După etapa 6,\nnu acum.', acum, 4]);
  assert.deepEqual([dupa[0]?.titlu, dupa[0]?.autor], ['Grila', 'ana']);
  assert.equal(dupa[1], lista[1], 'celelalte rânduri rămân');
  // Nimic schimbat pe server: lista rămâne cea citită.
  assert.equal(dupaDecizie(lista, d, { ok: true, id: 'a', schimbat: false, versiune: 3 }, acum), lista);
  // Rândul reîncărcat între timp (altă versiune) rămâne cum l-a adus citirea.
  const reincarcat = [s('a', { stare: 'facuta', versiune: 5 })];
  assert.deepEqual(dupaDecizie(reincarcat, d, { ok: true, id: 'a', schimbat: true, versiune: 4 }, acum), reincarcat);
});
