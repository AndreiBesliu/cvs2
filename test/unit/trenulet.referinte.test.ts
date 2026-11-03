/**
 * Ieșirile motoarelor planificatorului (ADR 0161 §E): `referinte.js --compara` construiește piesele, circuitele și fișierele
 * CNC pe setul fix al lui v18 și le compară cu amprentele din `referinte_v18.json`. Cât sursele se schimbă în repo (textele,
 * stilurile, butoanele mașinii), nimic din ce iese la frezare sau la printare nu se schimbă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('motoarele dau ieșirile de referință v18: cel puțin 622 comparate, 0 diferite', { timeout: 240_000 }, () => {
  const r = spawnSync(process.execPath, ['referinte.js', '--compara'], { cwd: 'extensii/trenulet/sursa/teste', encoding: 'utf8', timeout: 230_000 });
  assert.equal(r.status, 0, r.stderr);
  const m = /comparate (\d+), diferite (\d+)/.exec(r.stdout);
  assert.ok(m, r.stdout.slice(-500));
  assert.ok(Number(m[1]) >= 622, m[0]);
  assert.equal(m[2], '0', r.stdout.slice(-2000));
});
