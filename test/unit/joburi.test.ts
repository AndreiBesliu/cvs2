import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOBURI, judecaMarcaj, limitaOre, marcajDin, type Marcaj } from '../../shared/joburi.ts';

/** Judecata marcajului de rulare (ADR 0041 §3), pe hârtie: jobul zilnic, timeout 300 s, limita 1,1 × 24 + 2 = 28,4 h. */

const H = 3_600_000;
const ACUM = Date.UTC(2026, 9, 17, 9, 0);
const BACKUP = JOBURI[0];
const m = (x: Partial<Marcaj>): Marcaj => ({ ultimaPornire: null, ultimulFinal: null, ultimulSucces: null, esecuriLaRand: 0, ultimaEroare: null, ...x });
const ok = (ore: number) => m({ ultimaPornire: ACUM - ore * H - 5_000, ultimulFinal: ACUM - ore * H, ultimulSucces: ACUM - ore * H });

test('limita de vechime: 1,1 × intervalul + 2 h', () => {
  assert.equal(limitaOre(BACKUP), 28.4);
  assert.deepEqual(JOBURI.map((j) => j.nume), ['backupZilnic', 'verificaBackup']);
});

test('fără marcaj: atenție (n-a rulat niciodată); marcaj nevalid: eșec', () => {
  assert.deepEqual(judecaMarcaj(null, BACKUP, ACUM), { stare: 'atentie', motiv: 'niciodata', oreDeLaSucces: null });
  assert.deepEqual(judecaMarcaj('nevalid', BACKUP, ACUM), { stare: 'esec', motiv: 'nevalid', oreDeLaSucces: null });
});

test('succesul proaspăt e bine; peste 28,4 h e vechi (programarea nu mai pornește)', () => {
  assert.deepEqual(judecaMarcaj(ok(6), BACKUP, ACUM), { stare: 'bine', motiv: 'bine', oreDeLaSucces: 6 });
  assert.equal(judecaMarcaj(ok(28.4), BACKUP, ACUM).motiv, 'bine');
  assert.deepEqual(judecaMarcaj(ok(28.5), BACKUP, ACUM), { stare: 'esec', motiv: 'vechi', oreDeLaSucces: 28.5 });
});

test('pornit fără final: rulează în timeout + 1 min, apoi eșec', () => {
  const pornit = (s: number) => m({ ...ok(30), ultimaPornire: ACUM - s * 1000 });
  assert.equal(judecaMarcaj(pornit(10), BACKUP, ACUM).motiv, 'ruleaza');
  assert.equal(judecaMarcaj(pornit(360), BACKUP, ACUM).motiv, 'ruleaza');
  assert.deepEqual([judecaMarcaj(pornit(361), BACKUP, ACUM).stare, judecaMarcaj(pornit(361), BACKUP, ACUM).motiv], ['esec', 'fara-final']);
  assert.equal(judecaMarcaj(m({ ultimaPornire: ACUM - 3 * H }), BACKUP, ACUM).motiv, 'fara-final', 'pornit, fără niciun final');
});

test('eșecurile: unul e atenție, două la rând sunt eșec; a rulat fără succes vreodată e eșec', () => {
  assert.deepEqual(judecaMarcaj(m({ ...ok(6), esecuriLaRand: 1 }), BACKUP, ACUM), { stare: 'atentie', motiv: 'un-esec', oreDeLaSucces: 6 });
  assert.equal(judecaMarcaj(m({ ...ok(6), esecuriLaRand: 2 }), BACKUP, ACUM).motiv, 'esecuri');
  assert.equal(judecaMarcaj(m({ ultimaPornire: ACUM - H, ultimulFinal: ACUM - H + 1000, esecuriLaRand: 1 }), BACKUP, ACUM).motiv, 'fara-succes');
  // Două eșecuri câștigă în fața vechimii: motivul arătat e cel mai util (eroarea), nu doar „vechi”.
  assert.equal(judecaMarcaj(m({ ...ok(50), esecuriLaRand: 2 }), BACKUP, ACUM).motiv, 'esecuri');
});

test('marcajul din document: momentele cu toMillis; un șir sau un număr în câmpul de timp îl face nevalid', () => {
  const t = (ms: number) => ({ toMillis: () => ms });
  assert.deepEqual(marcajDin({ ultimaPornire: t(1), ultimulFinal: t(2), ultimulSucces: t(2), esecuriLaRand: 0, ultimaEroare: null }),
    { ultimaPornire: 1, ultimulFinal: 2, ultimulSucces: 2, esecuriLaRand: 0, ultimaEroare: null });
  assert.deepEqual(marcajDin({ ultimaPornire: t(1) }), { ultimaPornire: 1, ultimulFinal: null, ultimulSucces: null, esecuriLaRand: 0, ultimaEroare: null });
  assert.equal(marcajDin({ ultimaPornire: '2026-10-17T03:00:00Z' }), 'nevalid');
  assert.equal(marcajDin({ ultimulSucces: 1760670000000 }), 'nevalid');
  assert.equal(marcajDin({ ultimulSucces: t(Number.NaN) }), 'nevalid');
  assert.equal(marcajDin({ esecuriLaRand: -1 }), 'nevalid');
  assert.equal(marcajDin({ esecuriLaRand: '2' }), 'nevalid');
});
