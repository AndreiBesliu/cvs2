/**
 * Alegerea aranjamentului și a densității (ADR 0250 §4, §5, felia 28.1↑a): citită înaintea primei randări din
 * `localStorage` (`cncvs2.aranjament`, JSON `{ v: 1, aranjament, densitate }`). Valorile așteptate sunt scrise de mână,
 * din ADR: o valoare necunoscută sau stricată dă Insule (`modern`) cu densitatea normală; un aranjament pe care build-ul
 * nu-l are încă dă tot Insule, fără să se piardă densitatea aleasă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALEGERE_IMPLICITA,
  CHEIE_ARANJAMENT,
  citesteAlegerea,
  DENSITATI,
  IDURI_ARANJAMENT,
  scrieAlegerea,
  type IdAranjament,
} from '../../src/ui/alegereAranjament.ts';

const TOATE: readonly IdAranjament[] = ['modern', 'clasic', 'atelier', 'pasi'];
const DOAR_MODERN: readonly IdAranjament[] = ['modern'];
const IMPLICIT = { aranjament: 'modern', densitate: 'normala' };

test('cheia, id-urile și densitățile sunt cele din ADR 0250', () => {
  assert.equal(CHEIE_ARANJAMENT, 'cncvs2.aranjament');
  assert.deepEqual([...IDURI_ARANJAMENT], ['modern', 'clasic', 'atelier', 'pasi']);
  assert.deepEqual([...DENSITATI], ['normala', 'mare']);
  assert.deepEqual(ALEGERE_IMPLICITA, IMPLICIT);
});

test('nimic ținut: Insule, densitatea normală', () => {
  assert.deepEqual(citesteAlegerea(null, TOATE), IMPLICIT);
});

test('o alegere bună se citește întocmai', () => {
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"atelier","densitate":"mare"}', TOATE), { aranjament: 'atelier', densitate: 'mare' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"clasic","densitate":"normala"}', TOATE), { aranjament: 'clasic', densitate: 'normala' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"pasi","densitate":"normala"}', TOATE), { aranjament: 'pasi', densitate: 'normala' });
  assert.deepEqual(citesteAlegerea('{"densitate":"mare","aranjament":"modern","v":1}', TOATE), { aranjament: 'modern', densitate: 'mare' });
});

test('textul stricat sau altă formă dau Insule, densitatea normală', () => {
  for (const text of ['', 'atelier', '{', '{"v":1,', 'null', 'true', '1', '"atelier"', '[]', '[1,"atelier","mare"]', '{}']) {
    assert.deepEqual(citesteAlegerea(text, TOATE), IMPLICIT, text);
  }
});

test('altă versiune decât 1 dă Insule: o formă viitoare nu se ghicește', () => {
  for (const v of ['0', '2', '"1"', '1.5', 'null', 'true']) {
    assert.deepEqual(citesteAlegerea(`{"v":${v},"aranjament":"atelier","densitate":"mare"}`, TOATE), IMPLICIT, `v=${v}`);
  }
  assert.deepEqual(citesteAlegerea('{"aranjament":"atelier","densitate":"mare"}', TOATE), IMPLICIT, 'fără v');
});

test('un aranjament necunoscut dă Insule, iar densitatea bună rămâne', () => {
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"ArtCAM","densitate":"mare"}', TOATE), { aranjament: 'modern', densitate: 'mare' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"Atelier","densitate":"mare"}', TOATE), { aranjament: 'modern', densitate: 'mare' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":3,"densitate":"mare"}', TOATE), { aranjament: 'modern', densitate: 'mare' });
  assert.deepEqual(citesteAlegerea('{"v":1,"densitate":"mare"}', TOATE), { aranjament: 'modern', densitate: 'mare' });
});

test('o densitate necunoscută dă normala, iar aranjamentul bun rămâne', () => {
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"atelier","densitate":"uriasa"}', TOATE), { aranjament: 'atelier', densitate: 'normala' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"atelier","densitate":48}', TOATE), { aranjament: 'atelier', densitate: 'normala' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"atelier"}', TOATE), { aranjament: 'atelier', densitate: 'normala' });
});

test('un aranjament pe care build-ul nu-l are încă dă Insule, cu densitatea aleasă', () => {
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"atelier","densitate":"mare"}', DOAR_MODERN), { aranjament: 'modern', densitate: 'mare' });
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"modern","densitate":"mare"}', DOAR_MODERN), { aranjament: 'modern', densitate: 'mare' });
});

test('doar proprietățile proprii ale obiectului contează (nici prototipul, nici __proto__)', () => {
  assert.deepEqual(citesteAlegerea('{"__proto__":{"v":1,"aranjament":"atelier","densitate":"mare"}}', TOATE), IMPLICIT);
  assert.deepEqual(citesteAlegerea('{"v":1,"__proto__":{"aranjament":"atelier","densitate":"mare"}}', TOATE), IMPLICIT);
  assert.deepEqual(citesteAlegerea('{"v":1,"aranjament":"constructor","densitate":"toString"}', TOATE), IMPLICIT);
  assert.equal(({} as Record<string, unknown>)['aranjament'], undefined, 'prototipul global a rămas curat');
});

test('scrierea dă exact forma din ADR, iar citirea ei întoarce alegerea', () => {
  assert.equal(scrieAlegerea({ aranjament: 'atelier', densitate: 'mare' }), '{"v":1,"aranjament":"atelier","densitate":"mare"}');
  for (const aranjament of TOATE) {
    for (const densitate of ['normala', 'mare'] as const) {
      assert.deepEqual(citesteAlegerea(scrieAlegerea({ aranjament, densitate }), TOATE), { aranjament, densitate });
    }
  }
});
