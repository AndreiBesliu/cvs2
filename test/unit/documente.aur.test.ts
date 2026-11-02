/**
 * Corpusul de aur al documentului (ADR 0121; `PLAN.md` §5.3, etapa 4, punctul 1): proiectul de probă al unui atelier, salvat
 * de aplicația fiecărei versiuni a schemei (commit-ul ei, `scripts/corpus-documente.ts --istorie`), plus documentul gol
 * al lui v1. Probele: corpusul e întreg (fiecare versiune are intrarea ei, intrările sunt cele înghețate, scrise de commit-ul
 * din `ISTORIE`); ușa de azi le deschide exact ca în ieșirile așteptate; ieșirile sunt puncte fixe ale ușii întregi și ale
 * ușii documentului curent; migrările, luate pas cu pas, sunt pure și dau același document; migrarea de azi N − 1 → N, pe
 * salvarea versiunii N − 1, dă octet cu octet ce a deschis atunci aplicația versiunii N (codul ei, păstrat în `istorie/`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { incarca, jsonCanonic, MIGRARI } from '../../src/model/incarcare.ts';
import { incarcaCurent, type Brut } from '../../src/model/usaCurenta.ts';
import {
  citesteCorpus, citesteDeschise, DOSAR, iesireAsteptata, ISTORIE, migrareaDeAzi, numeDeschise, numeIntrari, sha256,
} from '../../scripts/corpus-documente.ts';

const corpus = citesteCorpus();
const intrare = (nume: string): string => readFileSync(join(DOSAR, 'intrari', nume), 'utf8');
const asteptat = (nume: string): string => readFileSync(join(DOSAR, 'asteptat', nume), 'utf8');

function ingheata<T>(x: T): T {
  if (typeof x === 'object' && x !== null) {
    for (const v of Object.values(x)) ingheata(v);
    Object.freeze(x);
  }
  return x;
}

test('corpusul e întreg: fiecare versiune, de la 1 la cea curentă, are intrarea scrisă de commit-ul ei; intrările sunt cele înghețate', () => {
  assert.deepEqual(ISTORIE.map((x) => x.versiune), Array.from({ length: VERSIUNE_SCHEMA }, (_, k) => k + 1), 'ISTORIE are câte un rând pe versiune, în ordine');
  assert.deepEqual(corpus.map((i) => i.nume), numeIntrari().map((x) => x.nume));
  for (const i of corpus) {
    const text = intrare(i.nume);
    assert.equal(sha256(text), i.sha256, `${i.nume}: intrarea s-a schimbat (se scrie doar cu --istorie)`);
    assert.equal((JSON.parse(text) as { schema: unknown }).schema, i.versiune, i.nume);
    assert.equal(i.commit, ISTORIE.find((x) => x.versiune === i.versiune)?.commit, `${i.nume}: commit-ul din ISTORIE`);
    // Salvarea e JSON-ul canonic al aplicației: aceiași octeți după încă o trecere.
    assert.equal(jsonCanonic(JSON.parse(text)), text, `${i.nume}: nu e JSON canonic`);
  }
});

test('ușa de azi deschide fiecare intrare exact ca în ieșirea ei așteptată', () => {
  for (const i of corpus) assert.equal(iesireAsteptata(intrare(i.nume)), asteptat(i.nume), i.nume);
  // Documentul versiunii curente nu are ce migra: ieșirea lui e chiar intrarea.
  const curent = corpus.filter((i) => i.versiune === VERSIUNE_SCHEMA);
  assert.ok(curent.length > 0);
  for (const i of curent) assert.equal(jsonCanonic(JSON.parse(asteptat(i.nume))), intrare(i.nume), i.nume);
});

test('ieșirile sunt puncte fixe: redeschise de ușa întreagă și de ușa documentului curent, rămân aceleași octeți', () => {
  for (const i of corpus) {
    const text = jsonCanonic(JSON.parse(asteptat(i.nume)));
    const r = incarca(JSON.parse(text));
    assert.ok(r.ok, i.nume);
    assert.equal(jsonCanonic(r.doc), text, i.nume);
    const c = incarcaCurent(JSON.parse(text));
    assert.ok(c?.ok, `${i.nume}: ușa documentului curent îl cere migrat`);
    assert.equal(jsonCanonic(c.doc), text, i.nume);
  }
});

test('migrarea de azi, pe salvarea versiunii dinainte, dă octet cu octet ce a deschis atunci aplicația fiecărei versiuni', () => {
  const deschise = citesteDeschise();
  assert.deepEqual(deschise.map((d) => [d.nume, d.versiune, d.din]), numeDeschise().map((d) => [d.nume, d.versiune, d.din]));
  for (const d of deschise) {
    const text = readFileSync(join(DOSAR, 'istorie', d.nume), 'utf8');
    assert.equal(sha256(text), d.sha256, `${d.nume}: s-a schimbat (se scrie doar cu --istorie)`);
    assert.equal(d.commit, ISTORIE.find((x) => x.versiune === d.versiune)?.commit, d.nume);
    assert.equal(migrareaDeAzi(intrare(d.din), d.versiune), text, `${d.nume}: migrarea ${d.versiune - 1} → ${d.versiune} s-a schimbat de atunci`);
  }
});

test('migrările, pas cu pas, sunt pure: intrarea înghețată nu se schimbă, iar documentul e cel al ușii', () => {
  for (const i of corpus) {
    let doc = ingheata(JSON.parse(intrare(i.nume)) as Brut);
    for (let n = i.versiune; n < VERSIUNE_SCHEMA; n++) {
      const pas = MIGRARI[n];
      assert.ok(pas, `lipsește migrarea ${n} → ${n + 1}`);
      const r = pas(doc);
      assert.ok(r.ok, `${i.nume}: ${n} → ${n + 1}: ${r.ok ? '' : r.motiv}`);
      assert.equal(r.doc['schema'], n + 1, `${i.nume}: ${n} → ${n + 1} scrie versiunea`);
      // Aceeași migrare pe aceeași intrare dă aceiași octeți (fără ceas, fără noroc, fără stare).
      const a = pas(doc);
      assert.equal(a.ok && jsonCanonic(a.doc), jsonCanonic(r.doc), `${i.nume}: ${n} → ${n + 1} nu e deterministă`);
      doc = ingheata(r.doc);
    }
    const final = incarca(doc);
    assert.ok(final.ok, i.nume);
    assert.equal(jsonCanonic(final.doc), jsonCanonic(JSON.parse(asteptat(i.nume))), i.nume);
    assert.equal(jsonCanonic(JSON.parse(intrare(i.nume))), intrare(i.nume), `${i.nume}: intrarea a rămas aceeași`);
  }
});
