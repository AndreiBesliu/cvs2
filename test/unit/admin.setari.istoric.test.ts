import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istoricSetari, schimbariConturi, schimbariRapide } from '../../src/admin/setari/istoric.ts';

/** Istoricul filei Setări (ADR 0260 §9, felia A.6), partea pură: ce s-a schimbat la fiecare salvare, din rândurile de audit. */

const r = (eticheta: string, ro: string, en = '') => ({ eticheta, ro, en });

test('setările conturilor: de la cât la cât, în ordinea câmpurilor; prima salvare pornește de la implicite (7 și 365)', () => {
  assert.deepEqual(schimbariConturi({ zileOffline: 10, zilePastrareTichete: 365 }, { zileOffline: 7, zilePastrareTichete: 180 }), [
    { fel: 'offline', inainte: 10, dupa: 7 }, { fel: 'tichete', inainte: 365, dupa: 180 },
  ]);
  assert.deepEqual(schimbariConturi(null, { zileOffline: 10, zilePastrareTichete: 365 }), [{ fel: 'offline', inainte: 7, dupa: 10 }]);
  assert.deepEqual(schimbariConturi({ zileOffline: 7, zilePastrareTichete: 30 }, { zileOffline: 7, zilePastrareTichete: 90 }), [
    { fel: 'tichete', inainte: 30, dupa: 90 },
  ]);
  // Prima salvare care ține implicitele are totuși ce spune; o salvare fără nicio schimbare (serverul n-o scrie), nimic.
  assert.deepEqual(schimbariConturi(null, { zileOffline: 7, zilePastrareTichete: 365 }), [{ fel: 'implicite' }]);
  assert.deepEqual(schimbariConturi(undefined, { zileOffline: 7, zilePastrareTichete: 365 }), [{ fel: 'implicite' }]);
  assert.deepEqual(schimbariConturi({ zileOffline: 9, zilePastrareTichete: 90 }, { zileOffline: 9, zilePastrareTichete: 90 }), []);
});

test('răspunsurile rapide, după etichetă: schimbate și adăugate în ordinea listei noi, apoi cele scoase; doar ordinea, altfel', () => {
  const inainte = [r('Mulțumim', 'Mulțumim.'), r('Pașii', 'Ne trimiți pașii?'), r('Gata', 'E gata.')];
  const dupa = [r('Gata', 'E gata.'), r('Mulțumim', 'Mulțumim pentru raportare.'), r('Versiunea', 'Ce versiune ai?')];
  assert.deepEqual(schimbariRapide(inainte, dupa), [
    { fel: 'schimbat', eticheta: 'Mulțumim' }, { fel: 'adaugat', eticheta: 'Versiunea' }, { fel: 'scos', eticheta: 'Pașii' },
  ]);
  // Textul în engleză schimbat e tot o schimbare; o listă mutată, doar ordinea; aceeași listă, nimic.
  assert.deepEqual(schimbariRapide([r('A', 'a')], [r('A', 'a', 'an')]), [{ fel: 'schimbat', eticheta: 'A' }]);
  assert.deepEqual(schimbariRapide([r('A', 'a'), r('B', 'b')], [r('B', 'b'), r('A', 'a')]), [{ fel: 'ordinea' }]);
  assert.deepEqual(schimbariRapide([r('A', 'a'), r('B', 'b')], [r('A', 'a'), r('B', 'b')]), []);
  // Prima salvare (fără document înainte): toate adăugate; lista golită: toate scoase.
  assert.deepEqual(schimbariRapide(null, [r('A', 'a'), r('B', 'b')]), [{ fel: 'adaugat', eticheta: 'A' }, { fel: 'adaugat', eticheta: 'B' }]);
  assert.deepEqual(schimbariRapide([r('A', 'a')], []), [{ fel: 'scos', eticheta: 'A' }]);
  // Un rând stricat din audit (fără text) nu se numără; ce nu e listă, o listă goală.
  assert.deepEqual(schimbariRapide({ lista: 1 }, [{ eticheta: 'X' }, r('A', 'a')]), [{ fel: 'adaugat', eticheta: 'A' }]);
});

test('istoricul: doar acțiunile setărilor, cea mai nouă întâi (fără dată, la urmă), cu cine; o acțiune cu nume de proprietate nu e una', () => {
  const ts = (iso: string) => ({ toDate: () => new Date(iso) });
  const rand = (id: string, actiune: string, cand: unknown, cine: string, inainte: unknown, dupa: unknown) => ({
    id, d: { actiune, cand, cine, rol: 'owner', tinta: 'setari/conturi', inainte, dupa },
  });
  const pasi = istoricSetari([
    rand('vechi', 'setari.conturi', ts('2026-11-01T10:00:00Z'), 'eu', null, { zileOffline: 10, zilePastrareTichete: 365 }),
    rand('fara-data', 'setari.conturi', null, 'alt', { zileOffline: 10, zilePastrareTichete: 365 }, { zileOffline: 10, zilePastrareTichete: 90 }),
    rand('nou', 'setari.conturi', ts('2026-11-07T10:00:00Z'), 'alt', { zileOffline: 10, zilePastrareTichete: 365 }, { zileOffline: 7, zilePastrareTichete: 365 }),
    rand('rapide', 'setari.raspunsuriRapide', ts('2026-11-05T10:00:00Z'), 'eu', null, [r('A', 'a')]),
    rand('alta', 'erori.marcheaza', ts('2026-11-08T10:00:00Z'), 'eu', null, { rezolvat: true }),
    rand('proto', 'constructor', ts('2026-11-09T10:00:00Z'), 'eu', null, null),
    rand('proto2', '__proto__', ts('2026-11-09T10:00:00Z'), 'eu', null, null),
  ], 'eu');
  assert.deepEqual(pasi.map((p) => [p.id, p.cand?.toISOString() ?? null, p.cine, p.schimbari]), [
    ['nou', '2026-11-07T10:00:00.000Z', 'personal', [{ fel: 'offline', inainte: 10, dupa: 7 }]],
    ['rapide', '2026-11-05T10:00:00.000Z', 'eu', [{ fel: 'adaugat', eticheta: 'A' }]],
    ['vechi', '2026-11-01T10:00:00.000Z', 'eu', [{ fel: 'offline', inainte: 7, dupa: 10 }]],
    ['fara-data', null, 'personal', [{ fel: 'tichete', inainte: 365, dupa: 90 }]],
  ]);
});
