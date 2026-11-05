/**
 * Dicționarul englez al planificatorului (ADR 0165), față de surse (`scripts/texte-trenulet.ts`):
 * - fiecare text cerut (cheile lui `tr`, marcajul din `body.html`, textele fixe din surse care ajung pe pagină) are traducere;
 * - nicio intrare fără folos (o cheie e cerută sau e un șir din surse, ca un cuvânt fără diacritice, „Pod”);
 * - traducerea păstrează {0}, {1}…, n-are litere românești (în afară de numele „Trenuleț”), nici ghilimele drepte (ar strica
 *   un atribut) sau etichete pe care cheia nu le are;
 * - fișierul e exact cum îl scrie unealta (sortat, cu cheile cerute);
 * - a doua plasă, fără parser: fiecare `tr("cuvânt", "context")` din surse cere și are cheia lui, „cuvânt@context” (un
 *   context uitat de unealtă ar lăsa în engleză cuvântul fără context, cu celălalt sens);
 * - niciun text românesc lipit de valori fără `tr` (`${n} ${n === 1 ? "piesă" : "piese"}`, `n + " capete libere"`): pe
 *   pagină, traducerea potrivește doar noduri de text întregi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { citesteDictionar, compuseNetraduse, DICTIONAR, SURSA, SURSE, textePlanificator } from '../../scripts/texte-trenulet.ts';

const { cerute, permise } = textePlanificator();
const d = citesteDictionar();

test('fiecare text cerut de surse are traducere', () => {
  const lipsa = [...cerute.keys()].filter((k) => !d[k]);
  assert.deepEqual(lipsa.map((k) => `${k} (${cerute.get(k)![0]})`), []);
  assert.ok(cerute.size > 900, `prea puține texte cerute: ${cerute.size}`);
});

test('cuvintele singure, cu majusculă, sunt cerute: etichetele din cod („Drepte”, „Pod”, „Gol”) și din marcaj („Deschide”, „Grila:”)', () => {
  assert.deepEqual(['Drepte', 'Curbe', 'Pod', 'Gol', 'Deschide', 'Vezi', 'Grila:', 'Dedesubt:'].filter((k) => !cerute.has(k)), []);
});

test('niciun text românesc lipit de valori fără tr: în șabloane, în nodurile de text și atributele din marcaj, în concatenări', () => {
  assert.deepEqual(compuseNetraduse(), []);
});

test('detectorul textelor compuse, pe un eșantion: prinde fiecare fel; lasă ce se traduce pe pagină, ce e tradus, G-code-ul și perechile', () => {
  const cod = [
    'function f(n, x, el) {',
    '  el.textContent = `Am pus ${n} piese`;',
    '  el.textContent = `${n} ${n === 1 ? "piesă" : "piese"}`;',
    '  el.innerHTML = `<span>Piese: ${n}</span>`;',
    '  el.innerHTML = `<span>${n} ${n === 1 ? "placă" : "plăci"}</span>`;',
    '  el.innerHTML = `<button title="Mută ${x}">x</button>`;',
    '  el.textContent = n + " capete libere";',
    // nu: literalul umple singur nodul; valoarea stă într-un atribut netradus; textul e tradus; G-code-ul rămâne românesc
    '  el.innerHTML = `<h2>${n ? "Pantă" : "Pantă inversă"}</h2>`;',
    '  el.innerHTML = `<b data-x="${x}">Gata</b>`;',
    '  el.textContent = tr`Am pus ${n} piese`;',
    '  el.textContent = `${n} ${n === 1 ? tr("piesă") : tr("piese")}`;',
    '  comentariu(`scula T${n} pe placă`);',
    '  av.push("Forma are bucăți care nu se ating");',
    '  el.textContent = ["Primul rând", "al doilea rând"].join(" ");',
    // nu: adăugat tradus; G-code; un tabel de perechi
    '  av.push(tr("Tradus deja"), "G1 X0");',
    '  const b = [["toate", "Toate"], ["nu", "Fără"]];',
    // da: un cuvânt mic lipit de o valoare; nu: o clasă CSS compusă, o listă de chei
    '  el.textContent = `${n} linii`;',
    '  el.className = "mic" + (n ? " eroare" : "");',
    '  const k = ["dreapta", "curba"];',
    '}',
  ].join('\n');
  const r = compuseNetraduse([['planificator/proba.ts', cod]]).map((s) => s.replace('planificator/proba.ts:', ''));
  assert.deepEqual(r, ['2 Am pus {0} piese', '3 {0} {1}', '4 Piese: {…}', '5 {…}', '6 Mută {…}', '7 capete libere',
    '13 Forma are bucăți care nu se ating', '14 Primul rând', '14 al doilea rând', '17 {0} linii']);
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

test('fiecare tr cu context, tr("placă", "pat"), cere și are cheia lui, „placă@pat” (a doua plasă, fără parser)', () => {
  const RE = /\btr\(\s*(?:"([^"\\]*)"|'([^'\\]*)')\s*,\s*(?:"([^"\\]*)"|'([^'\\]*)')\s*\)/g;
  const cu = SURSE.flatMap((f) => [...readFileSync(join(SURSA, f), 'utf8').matchAll(RE)].map((m) => `${m[1] ?? m[2]}@${m[3] ?? m[4]}`));
  assert.ok(cu.length >= 5, `prea puține: ${cu.join(', ')}`);
  assert.deepEqual(cu.filter((k) => !cerute.has(k) || !d[k]), []);
});
