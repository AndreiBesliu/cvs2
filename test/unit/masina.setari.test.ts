import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profilDinSetari } from '../../src/ir/masina.ts';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';

/** Răspunsul unei mașini la `$$` (GRBL 1.1h, formatul `$N=valoare`), cu valori schimbate față de implicite. */
const RASPUNS = [
  '$0=10', '$1=25', '$2=0', '$3=0', '$4=0', '$5=0', '$6=0', '$10=1', '$11=0.020', '$12=0.005', '$13=0', '$20=0', '$21=0',
  '$22=1', '$23=0', '$24=25.000', '$25=500.000', '$26=250', '$27=1.000', '$30=24000', '$31=0', '$32=0',
  '$100=320.000', '$101=320.000', '$102=400.000', '$110=8000.000', '$111=6000.000', '$112=1500.000',
  '$120=200.000', '$121=150.000', '$122=100.000', '$130=800.000', '$131=600.000', '$132=100.000', 'ok',
].join('\r\n');

test('`$$`: setările planificatorului înlocuiesc implicitele; restul se ignoră', () => {
  const r = profilDinSetari(RASPUNS, PROFIL_GRBL_11H);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.citite, 11);
  assert.equal(r.profil.sursa, 'setari');
  assert.deepEqual(r.profil.axe.X, { pasiPeMm: 320, vitezaMaxima: 8000, acceleratie: 200 });
  assert.deepEqual(r.profil.axe.Y, { pasiPeMm: 320, vitezaMaxima: 6000, acceleratie: 150 });
  assert.deepEqual(r.profil.axe.Z, { pasiPeMm: 400, vitezaMaxima: 1500, acceleratie: 100 });
  assert.equal(r.profil.deviatieJonctiune, 0.02);
  assert.equal(r.profil.toleranteArc, 0.005);
  // Ce nu vine din `$$` (constantele firmware-ului) rămâne al bazei.
  assert.deepEqual(r.profil.firmware, PROFIL_GRBL_11H.firmware);
  // Baza nu se atinge.
  assert.equal(PROFIL_GRBL_11H.axe.X?.vitezaMaxima, 500);
});

test('`$$` parțial: doar ce e scris se schimbă; formatul vechi (0.9, cu comentariu) și spațiile trec', () => {
  const r = profilDinSetari('  $110=2500.000 (x max rate, mm/min)\n$121 = 40\n[MSG:ceva]\n', PROFIL_GRBL_11H);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.citite, 2);
  assert.equal(r.profil.axe.X?.vitezaMaxima, 2500);
  assert.equal(r.profil.axe.Y?.acceleratie, 40);
  assert.equal(r.profil.axe.Y?.vitezaMaxima, 500);
  assert.equal(r.profil.axe.Z?.acceleratie, 10);
});

test('axa A ($103, $113, $123 pe grblHAL) se citește, dar numai dacă e scrisă întreagă', () => {
  const r = profilDinSetari('$103=100\n$113=3600\n$123=50\n', PROFIL_GRBL_11H);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.profil.axe.A, { pasiPeMm: 100, vitezaMaxima: 3600, acceleratie: 50 });
  const jumatate = profilDinSetari('$113=3600\n', PROFIL_GRBL_11H);
  assert.equal(jumatate.ok, false);
  if (!jumatate.ok) assert.equal(jumatate.linie, 1);
});

test('`$$` greșit: refuzat cu linia (valoare nenumerică, ≤ 0, nefinită, dublată), sau nimic de citit', () => {
  const cazuri: ReadonlyArray<readonly [string, number]> = [
    ['$110=abc', 1], ['$11=0.01\n$120=0', 2], ['$120=-5', 1], ['$110=1e999', 1], ['$112=', 1],
    ['$110=500\n$110=600', 2], ['$100=0.5.1', 1], ['$12=0', 1],
  ];
  for (const [text, linie] of cazuri) {
    const r = profilDinSetari(text, PROFIL_GRBL_11H);
    assert.equal(r.ok, false, text);
    if (!r.ok) assert.equal(r.linie, linie, `${text}: ${r.motiv}`);
  }
  for (const text of ['', 'ok\n', '$0=10\n$1=25\n', 'Grbl 1.1h [\'$\' for help]']) {
    const r = profilDinSetari(text, PROFIL_GRBL_11H);
    assert.equal(r.ok, false, JSON.stringify(text));
    if (!r.ok) assert.equal(r.linie, 0);
  }
});

test('`$11 = 0` e valid (oprire exactă în fiecare colț, ca G61.1), dar nu și `$12 = 0` (arcul n-ar avea segmente)', () => {
  const r = profilDinSetari('$11=0.000', PROFIL_GRBL_11H);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.profil.deviatieJonctiune, 0);
});
