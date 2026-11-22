import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, PLAFON, type ImagineFoaie } from '../../src/model/document.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, reface, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { imaginiBune } from '../../src/ui/actiuniDocumentCalcul.ts';

/**
 * Imaginile foii în document (ADR 0272): opționale, fără schemă nouă; ușa le judecă (forma, amprenta, plafoanele, id-urile
 * unice) și le păstrează câmpurile necunoscute; comanda lor din jurnal, cu anularea și refacerea; acțiunea `foaie.imagini`
 * (lista întreagă, un pas de anulare). Garda acțiunii și ușa spun același lucru pe aceeași listă, în ambele direcții.
 */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const SURSA = 'ab'.repeat(32);
const imagine = (o: Record<string, unknown> = {}): ImagineFoaie => ({
  id: 'i1', sursa: SURSA, nume: 'plan.png', x: 150, y: 100, latime: 300, inaltime: 200, rotire: 0, opacitate: 0.4,
  vizibila: true, fixata: true, ...o,
} as ImagineFoaie);
const fara = (camp: string, o: Record<string, unknown> = {}): ImagineFoaie => {
  const x: Record<string, unknown> = { ...imagine(o) };
  delete x[camp];
  return x as ImagineFoaie;
};
const cuImagini = (imagini: unknown): unknown => {
  const d = documentNou(STOC) as unknown as { foi: Array<Record<string, unknown>> };
  const f = d.foi[0];
  if (f) f['imagini'] = imagini;
  return d;
};
const motiv = (r: ReturnType<typeof incarca>): string => (r.ok ? 'trece' : r.motiv);

/** Imaginile bune: fără nume, la marginile plafoanelor, cu un câmp necunoscut. */
const BUNE: ImagineFoaie[] = [
  imagine(),
  fara('nume', { id: 'i2' }),
  imagine({ id: 'i3', rotire: 359.99, opacitate: 1, vizibila: false, fixata: false }),
  imagine({ id: 'i4', x: -PLAFON.translatie, y: PLAFON.translatie, latime: PLAFON.latura, inaltime: 1e-6 }),
  imagine({ id: 'i5', nume: 'n'.repeat(PLAFON.numeLungime), viitor: { strat: 2 } }),
  imagine({ id: 'a'.repeat(PLAFON.idLungime), opacitate: Number.MIN_VALUE }),
];

/** Imaginile rele, fiecare cu un singur câmp greșit (și cele scrise ca șiruri: ușa nu le convertește). */
const RELE: Array<[string, ImagineFoaie]> = [
  ['sursa cu majuscule', imagine({ sursa: 'AB'.repeat(32) })],
  ['sursa scurtă', imagine({ sursa: 'ab'.repeat(31) })],
  ['sursa lipsă', fara('sursa')],
  ['opacitatea 0', imagine({ opacitate: 0 })],
  ['opacitatea peste 1', imagine({ opacitate: 1.01 })],
  ['opacitatea NaN', imagine({ opacitate: Number.NaN })],
  ['opacitatea ca șir', imagine({ opacitate: '0.5' })],
  ['rotirea 360', imagine({ rotire: 360 })],
  ['rotirea negativă', imagine({ rotire: -1 })],
  ['lățimea 0', imagine({ latime: 0 })],
  ['lățimea peste plafon', imagine({ latime: PLAFON.latura + 1 })],
  ['lățimea ca șir', imagine({ latime: '5' })],
  ['înălțimea negativă', imagine({ inaltime: -5 })],
  ['x peste plafon', imagine({ x: PLAFON.translatie * 2 })],
  ['y infinit', imagine({ y: Number.POSITIVE_INFINITY })],
  ['vizibila ca șir', imagine({ vizibila: 'da' })],
  ['fixata lipsă', fara('fixata')],
  // Fiecare câmp cerut, lipsă (o ușă care l-ar face opțional ar primi imaginea).
  ...(['vizibila', 'opacitate', 'rotire', 'latime', 'inaltime', 'x', 'y'] as const).map((c): [string, ImagineFoaie] => [`${c} lipsă`, fara(c)]),
  ['id cu spațiu', imagine({ id: 'i 1' })],
  ['id prea lung', imagine({ id: 'a'.repeat(PLAFON.idLungime + 1) })],
  ['id lipsă', fara('id')],
  ['numele prea lung', imagine({ nume: 'n'.repeat(PLAFON.numeLungime + 1) })],
  ['numele null', imagine({ nume: null })],
];

test('ușa: imaginile bune trec, cu câmpurile lor necunoscute păstrate; un document fără imagini rămâne neatins', () => {
  const r = incarca(cuImagini(BUNE));
  assert.ok(r.ok, motiv(r));
  assert.deepEqual(r.doc.foi[0]?.imagini, BUNE);
  assert.equal(r.doc.schema, 25, 'fără schemă nouă');
  const d = documentNou(STOC);
  const g = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(g.ok);
  assert.equal(jsonCanonic(g.doc), jsonCanonic(d));
  assert.equal('imagini' in (g.doc.foi[0] ?? {}), false);
});

test('ușa: forma greșită, plafoanele, id-urile duble și prea multe imagini sunt refuzate, cu motivul', () => {
  assert.match(motiv(incarca(cuImagini('nu e listă'))), /imagini|foi/);
  for (const [nume, im] of RELE) assert.match(motiv(incarca(cuImagini([im]))), /imagini|foi/, nume);
  assert.match(motiv(incarca(cuImagini([imagine(), imagine({ x: 5 })]))), /două imagini.*i1/);
  const multe = Array.from({ length: PLAFON.imagini + 1 }, (_, k) => imagine({ id: `i${k}` }));
  assert.match(motiv(incarca(cuImagini(multe))), new RegExp(`${PLAFON.imagini}`));
  assert.ok(incarca(cuImagini(multe.slice(0, PLAFON.imagini))).ok, 'exact plafonul trece');
});

test('garda acțiunii și ușa spun același lucru pe aceeași listă (ambele direcții)', () => {
  const liste: Array<[string, ImagineFoaie[]]> = [
    ['lista goală', []],
    ['toate bune', BUNE],
    ...BUNE.map((im, k): [string, ImagineFoaie[]] => [`bună ${k}`, [im]]),
    ...RELE.map(([n, im]): [string, ImagineFoaie[]] => [n, [im]]),
    ['id dublu', [imagine(), imagine({ y: 1 })]],
    ['peste plafon', Array.from({ length: PLAFON.imagini + 1 }, (_, k) => imagine({ id: `i${k}` }))],
    ['exact plafonul', Array.from({ length: PLAFON.imagini }, (_, k) => imagine({ id: `i${k}` }))],
  ];
  let bune = 0;
  for (const [n, l] of liste) {
    const usa = incarca(cuImagini(l)).ok;
    assert.equal(imaginiBune(l), usa, n);
    if (usa) bune++;
  }
  assert.equal(bune, BUNE.length + 3, 'matricea are și liste bune, și rele');
});

test('jurnalul: inlocuieste-imagini schimbă lista foii, iar anularea și refacerea o aduc exact înapoi', () => {
  const i1 = [imagine()];
  const i2 = [...i1, imagine({ id: 'i2', fixata: false, rotire: 30 })];
  let h = istoricNou(documentNou(STOC));
  h = executa(h, { tip: 'inlocuieste-imagini', foaie: 'f1', vechi: [], nou: i1 });
  h = executa(h, { tip: 'inlocuieste-imagini', foaie: 'f1', vechi: i1, nou: i2 });
  assert.deepEqual(h.doc.foi[0]?.imagini, i2);
  assert.equal(h.doc.rev, 2);
  h = anuleaza(h);
  assert.deepEqual(h.doc.foi[0]?.imagini, i1);
  h = anuleaza(h);
  assert.deepEqual(h.doc.foi[0]?.imagini, []);
  h = reface(reface(h));
  assert.deepEqual(h.doc.foi[0]?.imagini, i2);
  assert.ok(incarca(JSON.parse(JSON.stringify(h.doc))).ok, 'ce scrie jurnalul se redeschide');
  assert.throws(() => executa(h, { tip: 'inlocuieste-imagini', foaie: 'nu-exista', vechi: [], nou: i1 }), /foaia/);
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

function context(doarCitire = false, extra: Partial<ContextDocument> = {}): ContextDocument & { h: () => Istoric } {
  let h = istoricNou(documentNou(STOC));
  let s: readonly string[] = [];
  const baza: ContextDocument = { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; } };
  return { ...baza, doarCitire: () => doarCitire, ...extra, h: () => h };
}

test('foaie.imagini: scrie lista, un pas de anulare; aceeași listă nu e o comandă; lista rea și doar-citirea sunt refuzate', () => {
  const l = [imagine(), imagine({ id: 'i2', fixata: false })];
  const c = context(false, { imaginiNoi: () => l });
  const trecut = c.h().trecut.length;
  assert.deepEqual(ruleaza(R, 'foaie.imagini', c), { ok: true });
  assert.deepEqual(c.h().doc.foi[0]?.imagini, l);
  assert.equal(c.h().trecut.length, trecut + 1);
  assert.ok(incarca(JSON.parse(JSON.stringify(c.h().doc))).ok, 'ce scrie acțiunea se redeschide');
  ruleaza(R, 'foaie.imagini', c);
  assert.equal(c.h().trecut.length, trecut + 1, 'aceeași listă: nicio comandă');
  ruleaza(R, 'istoric.anuleaza', c);
  assert.deepEqual(c.h().doc.foi[0]?.imagini, []);
  for (const [n, im] of RELE) assert.equal(stare(R, 'foaie.imagini', { ...c, imaginiNoi: () => [im] }).ok, false, n);
  assert.deepEqual(stare(R, 'foaie.imagini', context(true, { imaginiNoi: () => l })), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(R, 'foaie.imagini', context()), { ok: false, motiv: 'motiv.nimic-ales' });
});
