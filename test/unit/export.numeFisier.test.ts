/**
 * Numele fișierului ales de om (ADR 0291 §5, felia 28.8↑n): propunerea din numele foii, verificarea și baza înlocuită în
 * toate numele exportului (fișierul, cele pe sculă, dopurile, arhiva foilor și numele din ea). Octeții nu se schimbă: doar
 * baza `cncvs2-<colț>` din fața numelui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bazaFisier, cuBaza, motivNume, propunereNume, LUNGIME_NUME } from '../../src/post/numeFisier.ts';
import { numeFisier } from '../../src/post/export.ts';
import { numeInArhiva } from '../../src/post/foi.ts';
import { numeFisierDop } from '../../src/jobs/calculCam.ts';
import { CONTRACTE } from '../../src/post/contracte/index.ts';

const contractDupaId = (id: keyof typeof CONTRACTE) => CONTRACTE[id];

test('baza de azi: cncvs2-<colț>, aceeași cu a numelor din export', () => {
  for (const o of ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus']) assert.equal(bazaFisier(o), `cncvs2-${o}`);
  const grbl = contractDupaId('grbl-11');
  assert.equal(numeFisier(grbl, 'dreapta-sus', 0, null), `${bazaFisier('dreapta-sus')}.nc`);
});

test('propunerea: din numele scris al foii, fără diacritice, cu liniuțe; fără nume, baza de azi', () => {
  assert.equal(propunereNume(undefined, 'stanga-jos'), 'cncvs2-stanga-jos');
  assert.equal(propunereNume('', 'dreapta-sus'), 'cncvs2-dreapta-sus');
  assert.equal(propunereNume('  \t ', 'stanga-jos'), 'cncvs2-stanga-jos');
  assert.equal(propunereNume('Raft lateral', 'stanga-jos'), 'raft-lateral');
  assert.equal(propunereNume('Ușă Țarc, ȘIȚĂ 2', 'stanga-jos'), 'usa-tarc-sita-2');
  assert.equal(propunereNume('  --Ușă/: *?--  ', 'stanga-jos'), 'usa');
  assert.equal(propunereNume('/*?', 'stanga-sus'), 'cncvs2-stanga-sus');
  const lung = propunereNume(`${'ab '.repeat(40)}`, 'stanga-jos');
  assert.ok(lung.length <= 60, String(lung.length));
  assert.ok(!lung.endsWith('-'), lung);
  assert.equal(motivNume(propunereNume('Raft lateral', 'stanga-jos')), null);
});

test('verificarea: gol, prea lung, caractere oprite de sisteme, margini, nume rezervate', () => {
  assert.equal(motivNume('raft'), null);
  assert.equal(motivNume('Raft lateral 2'), null);
  assert.equal(motivNume('ușa_1.v2'), null);
  assert.equal(motivNume(''), 'gol');
  assert.equal(motivNume('   '), 'gol');
  assert.equal(motivNume('a'.repeat(LUNGIME_NUME)), null);
  assert.equal(motivNume('a'.repeat(LUNGIME_NUME + 1)), 'lung');
  for (const c of ['a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b', 'a\u0007b']) assert.equal(motivNume(c), 'caractere', JSON.stringify(c));
  for (const c of [' raft', 'raft ', 'raft.', '.raft']) assert.equal(motivNume(c), 'margini', JSON.stringify(c));
  for (const c of ['CON', 'prn', 'Aux', 'nul', 'COM1', 'lpt9']) assert.equal(motivNume(c), 'rezervat', c);
  assert.equal(motivNume('console'), null);
});

test('baza înlocuită în toate numele exportului; numele scurte și cele fără bază rămân', () => {
  const o = 'stanga-jos', grbl = contractDupaId('grbl-11'), scula = { numar: 3, nume: 'freza plata', diametru: 6 };
  const unul = numeFisier(grbl, o, 0, null), peScula = numeFisier(grbl, o, 1, scula);
  assert.equal(cuBaza(unul, o, 'raft'), 'raft.nc');
  assert.equal(cuBaza(peScula, o, 'raft'), 'raft-2-T3.nc');
  assert.equal(cuBaza(numeFisierDop(unul, 0, false), o, 'raft'), 'raft-dop-1.nc');
  assert.equal(cuBaza(numeFisierDop(peScula, 1, false), o, 'raft'), 'raft-dop-2-2-T3.nc');
  assert.equal(cuBaza(numeInArhiva(peScula, 2, 3, o, false), o, 'raft'), 'raft-foaia-2-x3-2-T3.nc');
  assert.equal(cuBaza(`${bazaFisier(o)}-foile.zip`, o, 'Raft lateral'), 'Raft lateral-foile.zip');
  // Fără nume ales, sau cu baza de azi: neschimbat.
  assert.equal(cuBaza(peScula, o, undefined), peScula);
  assert.equal(cuBaza(peScula, o, bazaFisier(o)), peScula);
  // Numele scurte (RichAuto, FAT 8.3) și un nume fără bază rămân.
  const scurt = numeFisier(contractDupaId('richauto'), o, 0, null);
  assert.equal(cuBaza(scurt, o, 'raft'), scurt);
  assert.equal(cuBaza('F2X3/CV1T2.NC', o, 'raft'), 'F2X3/CV1T2.NC');
  assert.equal(cuBaza('altceva.nc', o, 'raft'), 'altceva.nc');
  // Baza altui colț nu se atinge (numele vin mereu din colțul exportului).
  assert.equal(cuBaza(numeFisier(grbl, 'dreapta-jos', 0, null), o, 'raft'), 'cncvs2-dreapta-jos.nc');
  // Doar baza întreagă: `cncvs2-stanga-josx` nu e baza lui `stanga-jos`.
  assert.equal(cuBaza('cncvs2-stanga-josx.nc', o, 'raft'), 'cncvs2-stanga-josx.nc');
});
