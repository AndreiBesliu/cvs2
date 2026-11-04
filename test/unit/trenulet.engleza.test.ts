/**
 * Dicționarul englez al planificatorului (ADR 0165), față de surse (`scripts/texte-trenulet.ts`):
 * - fiecare text cerut (cheile lui `tr`, marcajul din `body.html`, textele fixe din surse care ajung pe pagină) are traducere;
 * - nicio intrare fără folos (o cheie e cerută sau e un șir din surse, ca un cuvânt fără diacritice, „Pod”);
 * - traducerea păstrează {0}, {1}…, n-are litere românești (în afară de numele „Trenuleț”), nici ghilimele drepte (ar strica
 *   un atribut) sau etichete pe care cheia nu le are;
 * - fișierul e exact cum îl scrie unealta (sortat, cu cheile cerute).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { citesteDictionar, DICTIONAR, textePlanificator } from '../../scripts/texte-trenulet.ts';

const { cerute, permise } = textePlanificator();
const d = citesteDictionar();

test('fiecare text cerut de surse are traducere', () => {
  const lipsa = [...cerute.keys()].filter((k) => !d[k]);
  assert.deepEqual(lipsa.map((k) => `${k} (${cerute.get(k)![0]})`), []);
  assert.ok(cerute.size > 900, `prea puține texte cerute: ${cerute.size}`);
});

test('nicio intrare fără folos: cheia e cerută sau e un șir din surse', () => {
  const inPlus = Object.keys(d).filter((k) => !cerute.has(k) && !permise.has(k.replace(/@[^@]*$/, '')));
  assert.deepEqual(inPlus, []);
});

test('traducerile: aceleași {0}, {1}…; fără litere românești, ghilimele drepte sau etichete noi', () => {
  const rele: string[] = [];
  const acolade = (s: string): string => (s.match(/\{\d+\}/g) ?? []).sort().join();
  for (const [k, v] of Object.entries(d)) {
    if (acolade(k) !== acolade(v)) rele.push(`acolade: ${k}`);
    if (/[ăâîșțĂÂÎȘȚ]/.test(v.replace(/Trenuleț|TRENULEȚ/g, ''))) rele.push(`românește: ${v}`);
    if (v.includes('"')) rele.push(`ghilimele: ${v}`);
    if (/<\/?[a-z]/i.test(v) && !/<\/?[a-z]/i.test(k)) rele.push(`etichetă: ${v}`);
  }
  assert.deepEqual(rele, []);
});

test('texte.en.json e cum îl scrie scripts/texte-trenulet.ts: sortat, cu spațiile cheilor păstrate', () => {
  const chei = Object.keys(d);
  const cerut = chei.filter((k) => cerute.has(k));
  assert.deepEqual(cerut, [...cerut].sort((a, b) => a.localeCompare(b, 'ro')));
  for (const [k, v] of Object.entries(d)) {
    assert.equal(v.length - v.trimStart().length > 0, k.length - k.trimStart().length > 0, `spațiul de la început: ${k}`);
    assert.equal(v.length - v.trimEnd().length > 0, k.length - k.trimEnd().length > 0, `spațiul de la sfârșit: ${k}`);
  }
  assert.ok(readFileSync(DICTIONAR, 'utf8').endsWith('}\n'));
});
