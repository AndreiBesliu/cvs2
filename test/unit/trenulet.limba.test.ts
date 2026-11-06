/**
 * Limba planificatorului (ADR 0165), fără browser: `planificator/limba.ts` rulat într-un context cu `cvs2` și `TexteEN`, ca
 * în cadru. În română (și pe pagina de sine stătătoare, fără cvs2), `tr` dă chiar textul, șir sau șablon, cu valorile puse
 * ca de JavaScript; în engleză, traducerea din dicționar (cheia unui șablon are {0}, {1}… în locul valorilor, iar traducerea
 * le poate muta), iar fără intrare rămâne românește. Zecimalele și data, după limbă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, Script } from 'node:vm';

type Tr = (s: TemplateStringsArray | string, ...v: unknown[]) => string;
type Limba = { readonly limba: 'ro' | 'en'; readonly tr: Tr; readonly zecimal: string; readonly locala: string };

const SURSA = stripTypeScriptTypes(readFileSync('extensii/trenulet/sursa/planificator/limba.ts', 'utf8'), { mode: 'strip' });

function pornita(cvs2: unknown, texte?: Record<string, string>): { Limba: Limba; tr: Tr } {
  const ctx = createContext({ ...(cvs2 === undefined ? {} : { cvs2 }), ...(texte ? { TexteEN: texte } : {}) });
  new Script(SURSA, { filename: 'limba.js' }).runInContext(ctx);
  return ctx as unknown as { Limba: Limba; tr: Tr };
}

const TEXTE = {
  'Circuit închis': 'Closed circuit',
  'Am pus: {0}.': 'Placed: {0}.',
  '{0} din {1} piese': '{1} pieces, {0} of them',
};

test('în română, tr e chiar textul: șirul și șablonul, cu valorile puse ca de JavaScript', () => {
  const { Limba, tr } = pornita({ gazda: 'cvs2', limba: 'ro' }, TEXTE);
  const n = 3, o = { toString: () => 'obiect' };
  assert.equal(Limba.limba, 'ro');
  assert.equal(tr('Circuit închis'), 'Circuit închis');
  assert.equal(tr`Am pus: ${'Dreaptă 216'}.`, 'Am pus: Dreaptă 216.');
  assert.equal(tr`${n} din ${o} piese, ${null}, ${undefined}, ${1.5}`, `${n} din ${o} piese, ${null}, ${undefined}, ${1.5}`);
  assert.equal(tr`fără valori`, 'fără valori');
});

test('în engleză, din dicționar: șirul și șablonul, cu valorile mutate; fără intrare, românește', () => {
  const { Limba, tr } = pornita({ gazda: 'cvs2', limba: 'en' }, TEXTE);
  assert.equal(Limba.limba, 'en');
  assert.equal(tr('Circuit închis'), 'Closed circuit');
  assert.equal(tr`Am pus: ${'Straight 216'}.`, 'Placed: Straight 216.');
  assert.equal(tr`${2} din ${12} piese`, '12 pieces, 2 of them');
  assert.equal(tr('Nimic tradus'), 'Nimic tradus');
  assert.equal(tr`Încă ${1} netradus`, 'Încă 1 netradus');
});

test('fără cvs2 (claude.ai, copia de pe calculator) sau fără dicționar: româna', () => {
  assert.equal(pornita(undefined, TEXTE).tr('Circuit închis'), 'Circuit închis');
  assert.equal(pornita(undefined, TEXTE).Limba.limba, 'ro');
  assert.equal(pornita({ gazda: 'cvs2', limba: 'en' }).tr('Circuit închis'), 'Circuit închis');
});

test('zecimalele și data, după limbă', () => {
  const ro = pornita({ gazda: 'cvs2', limba: 'ro' }).Limba, en = pornita({ gazda: 'cvs2', limba: 'en' }, TEXTE).Limba;
  assert.deepEqual([ro.zecimal, ro.locala, en.zecimal, en.locala], [',', 'ro-RO', '.', 'en-GB']);
});

test('un cuvânt cu două sensuri, cu context: în engleză „cuvânt@context” întâi, apoi cuvântul; în română, cuvântul', () => {
  const texte = { 'placă': 'board', 'placă@pat': 'bed' };
  const en = pornita({ gazda: 'cvs2', limba: 'en' }, texte).tr, ro = pornita({ gazda: 'cvs2', limba: 'ro' }, texte).tr;
  assert.deepEqual([en('placă', 'pat'), en('placă'), en('placă', 'altul'), ro('placă', 'pat')], ['bed', 'board', 'board', 'placă']);
});
