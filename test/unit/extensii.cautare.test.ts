/**
 * Căutarea și categoriile din fereastra bibliotecii (ADR 0233, felia 3.Xj), partea pură (`src/extensii/cautare.ts`):
 * - textul căutat se compară fără diacritice și fără majuscule; fiecare cuvânt căutat trebuie găsit: oriunde în nume, sau la
 *   începutul unui cuvânt din descrieri, autor și numele categoriilor;
 * - o potrivire în nume stă înaintea uneia doar în descriere; în rest, ordinea listei;
 * - categoria aleasă ține doar extensiile ei, iar ce ar fi găsit căutarea în celelalte categorii se numără;
 * - rândul categoriilor are doar categoriile prezente, în ordinea catalogului lor, fiecare cu numărul ei.
 * Plus catalogul bibliotecii (`shared/biblioteca.ts`): `categorii`, o dată de prezentare citită cu îngăduință.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORII_BIBLIOTECA, citesteCatalog, FORMAT_CATALOG, MAX_CATEGORII, numePachet, SCHEMA_CATALOG, type CategorieBiblioteca,
} from '../../shared/biblioteca.ts';
import { categoriiPrezente, cauta, cuvinteCautate, simplu, type DeCautat } from '../../src/extensii/cautare.ts';

const e = (id: string, nume: string, texte: readonly string[] = [], categorii: readonly CategorieBiblioteca[] = []): DeCautat =>
  ({ id, nume, texte, categorii });

const RAFT: readonly DeCautat[] = [
  e('trenulet', 'Easy 3Draw', ['Planifici circuite de trenuleț din lemn și faci piese de printat 3D: cărămizi LEGO.', 'CNC Vector Studio', 'Jucării și modele', 'Imprimare 3D'], ['modele', 'imprimare', 'cnc']),
  e('cutii', 'Cutii cu îmbinări', ['Desenezi o cutie cu dinți, pe grosimea plăcii.', 'Desen și forme'], ['desen', 'cnc']),
  e('sonda', 'Sonda de colț', ['Găsești colțul piesei cu un palpator 3D.', 'Mașina'], ['masina']),
  e('ceas', 'Cadran de ceas', ['Un cadran cu cifre și minutar, gata de gravat.', 'Desen și forme'], ['desen']),
  e('local', 'Proba mea', []),
];
const ids = (x: readonly DeCautat[]): string[] => x.map((y) => y.id);

test('textul se compară fără diacritice și fără majuscule; căutarea se împarte în cuvinte', () => {
  assert.equal(simplu('Îmbinări și Țesături'), 'imbinari si tesaturi');
  assert.deepEqual(cuvinteCautate('  Cutii   ÎMBINĂRI '), ['cutii', 'imbinari']);
  assert.deepEqual(cuvinteCautate('   '), []);
  // Semnele dintre cuvinte despart: „3d,lego” sunt două cuvinte.
  assert.deepEqual(cuvinteCautate('3D,LEGO'), ['3d', 'lego']);
});

test('fără text căutat și fără categorie, lista rămâne întreagă, în ordinea ei', () => {
  const r = cauta(RAFT, '', null);
  assert.deepEqual(ids(r.vizibile), ['trenulet', 'cutii', 'sonda', 'ceas', 'local']);
  assert.equal(r.inAlteCategorii, 0);
});

test('în nume, un cuvânt căutat se găsește oriunde; în descriere, doar la începutul unui cuvânt', () => {
  // „draw” e în mijlocul lui „3Draw”: numele îl găsește.
  assert.deepEqual(ids(cauta(RAFT, 'draw', null).vizibile), ['trenulet']);
  // „ifici” e în mijlocul lui „Planifici”, din descriere: nu se potrivește.
  assert.deepEqual(ids(cauta(RAFT, 'ifici', null).vizibile), []);
  assert.deepEqual(ids(cauta(RAFT, 'planif', null).vizibile), ['trenulet']);
  // Fără diacritice, de ambele părți.
  assert.deepEqual(ids(cauta(RAFT, 'caramizi', null).vizibile), ['trenulet']);
  assert.deepEqual(ids(cauta(RAFT, 'ÎMBINĂRI', null).vizibile), ['cutii']);
  // Id-ul extensiei se caută ca numele.
  assert.deepEqual(ids(cauta(RAFT, 'trenu', null).vizibile), ['trenulet']);
});

test('fiecare cuvânt căutat trebuie găsit, fiecare unde poate: unul în nume, altul în descriere', () => {
  assert.deepEqual(ids(cauta(RAFT, 'easy lego', null).vizibile), ['trenulet']);
  assert.deepEqual(ids(cauta(RAFT, 'easy palpator', null).vizibile), []);
  // Un cuvânt se poate găsi și în numele unei categorii a extensiei.
  assert.deepEqual(ids(cauta(RAFT, 'jucarii', null).vizibile), ['trenulet']);
  // Autorul.
  assert.deepEqual(ids(cauta(RAFT, 'vector studio', null).vizibile), ['trenulet']);
});

test('o potrivire în nume stă înaintea uneia doar în descriere; în rest, ordinea listei', () => {
  // „3d”: numele „Easy 3Draw” îl are; „Sonda de colț” îl are doar în descriere („palpator 3D”).
  assert.deepEqual(ids(cauta(RAFT, '3d', null).vizibile), ['trenulet', 'sonda']);
  // „cu”: „Cutii cu îmbinări” îl are în nume; „Sonda de colț” și „Cadran de ceas”, doar în descriere, în ordinea listei.
  assert.deepEqual(ids(cauta(RAFT, 'cu', null).vizibile), ['cutii', 'sonda', 'ceas']);
  // „de”: în nume la „Sonda de colț” și „Cadran de ceas”; doar în descriere la primele două din listă („de printat”,
  // „Desenezi”), care trec astfel după ele.
  assert.deepEqual(ids(cauta(RAFT, 'de', null).vizibile), ['sonda', 'ceas', 'trenulet', 'cutii']);
});

test('categoria aleasă ține doar extensiile ei; ce găsește căutarea în celelalte categorii se numără', () => {
  assert.deepEqual(ids(cauta(RAFT, '', 'desen').vizibile), ['cutii', 'ceas']);
  assert.deepEqual(ids(cauta(RAFT, '', 'cnc').vizibile), ['trenulet', 'cutii']);
  // O extensie fără categorii (din afara bibliotecii) nu stă pe niciun raft.
  assert.deepEqual(ids(cauta(RAFT, '', 'masina').vizibile), ['sonda']);
  const r = cauta(RAFT, '3d', 'masina');
  assert.deepEqual(ids(r.vizibile), ['sonda']);
  assert.equal(r.inAlteCategorii, 1);
  // Fără text căutat, „în alte categorii” nu înseamnă nimic.
  assert.equal(cauta(RAFT, '', 'masina').inAlteCategorii, 0);
  assert.equal(cauta(RAFT, 'cadran', 'masina').vizibile.length, 0);
  assert.equal(cauta(RAFT, 'cadran', 'masina').inAlteCategorii, 1);
});

test('rândul categoriilor: doar cele prezente, în ordinea catalogului lor, fiecare cu numărul ei', () => {
  assert.deepEqual(categoriiPrezente(RAFT), [
    { id: 'desen', cate: 2 }, { id: 'cnc', cate: 2 }, { id: 'imprimare', cate: 1 }, { id: 'masina', cate: 1 }, { id: 'modele', cate: 1 },
  ]);
  assert.deepEqual(categoriiPrezente([e('local', 'Proba mea')]), []);
  // Ordinea e a catalogului categoriilor, nu a extensiilor.
  assert.deepEqual(categoriiPrezente(RAFT).map((c) => c.id), CATEGORII_BIBLIOTECA.filter((c) => RAFT.some((x) => x.categorii.includes(c))));
});

const H = 'a'.repeat(64);
const rand = (extra: Record<string, unknown>): unknown => ({
  id: 'salut', nume: 'Salut', versiune: '1.0.0', api: 1, permisiuni: [], descriere: { ro: 'Proba.', en: 'The test.' },
  pachet: numePachet('salut', '1.0.0', H), octeti: 10, sha256: H, ...extra,
});
const catalog = (extra: Record<string, unknown>): ReturnType<typeof citesteCatalog> =>
  citesteCatalog({ format: FORMAT_CATALOG, schema: SCHEMA_CATALOG, extensii: [rand(extra)] });

test('catalogul: categoriile unui rând se citesc, în ordinea scrisă (prima e cea principală)', () => {
  const c = catalog({ categorii: ['modele', 'imprimare', 'cnc'] });
  assert.ok(c.ok);
  assert.deepEqual(c.catalog.extensii[0]?.categorii, ['modele', 'imprimare', 'cnc']);
  assert.deepEqual(c.sarite, []);
  // Fără câmp, rândul rămâne bun, fără categorii.
  const fara = catalog({});
  assert.ok(fara.ok);
  assert.equal(fara.catalog.extensii[0]?.categorii, undefined);
});

test('catalogul: o categorie pe care fila n-o știe se sare singură, cu numele câmpului; celelalte rămân', () => {
  const c = catalog({ categorii: ['imprimare', 'holograme'] });
  assert.ok(c.ok);
  assert.deepEqual(c.catalog.extensii[0]?.categorii, ['imprimare']);
  assert.deepEqual(c.sarite, ['salut: categorii']);
  // Doar necunoscute: rândul rămâne fără categorii.
  const toate = catalog({ categorii: ['holograme'] });
  assert.ok(toate.ok);
  assert.equal(toate.catalog.extensii[0]?.categorii, undefined);
  assert.deepEqual(toate.sarite, ['salut: categorii']);
});

test('catalogul: o formă greșită a categoriilor se sare cu totul; rândul rămâne', () => {
  const gresite: ReadonlyArray<readonly [string, unknown]> = [
    ['un text, nu o listă', 'imprimare'],
    ['prea multe', CATEGORII_BIBLIOTECA.slice(0, MAX_CATEGORII + 1)],
    ['una de două ori', ['cnc', 'cnc']],
    ['un număr în listă', ['cnc', 3]],
  ];
  assert.ok(CATEGORII_BIBLIOTECA.length > MAX_CATEGORII, 'proba „prea multe” are nevoie de mai multe categorii decât plafonul');
  for (const [ce, v] of gresite) {
    const c = catalog({ categorii: v });
    assert.ok(c.ok, ce);
    assert.equal(c.catalog.extensii[0]?.categorii, undefined, ce);
    assert.deepEqual(c.sarite, ['salut: categorii'], ce);
  }
  // Exact la plafon trece.
  const plin = catalog({ categorii: CATEGORII_BIBLIOTECA.slice(0, MAX_CATEGORII) });
  assert.ok(plin.ok);
  assert.equal(plin.catalog.extensii[0]?.categorii?.length, MAX_CATEGORII);
});
