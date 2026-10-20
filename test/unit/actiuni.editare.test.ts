/**
 * Acțiunile editării (ADR 0050), cu calculul încărcat: `foaie.ghidaje` (lista întreagă, judecată ca la ușă, un pas de
 * anulare) și `document.muta-instantele` (fiecare instanță cu deplasarea ei, un singur pas; refuzurile cu motivul).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, PLAFON, type Ghidaj } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

/** Un dreptunghi (e1, la 20, 20) și un cerc (e2), adăugate prin registru. */
function context(doarCitire = false, extra: Partial<ContextDocument> = {}): ContextDocument & { h: () => Istoric } {
  let h = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let s: readonly string[] = [];
  const baza: ContextDocument = { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; } };
  ruleaza(R, 'document.adauga-dreptunghi', baza);
  ruleaza(R, 'document.adauga-cerc', baza);
  return { ...baza, doarCitire: () => doarCitire, ...extra, h: () => h };
}

test('foaie.ghidaje: scrie lista, un pas de anulare; aceeași listă nu e o comandă; lista rea și doar-citirea sunt refuzate', () => {
  const g: Ghidaj[] = [{ id: 'g1', axa: 'x', poz: 100 }, { id: 'g2', axa: 'y', poz: 50 }];
  const c = context(false, { ghidajeNoi: () => g });
  const trecut = c.h().trecut.length;
  assert.deepEqual(ruleaza(R, 'foaie.ghidaje', c), { ok: true });
  assert.deepEqual(c.h().doc.foi[0]?.ghidaje, g);
  assert.equal(c.h().trecut.length, trecut + 1);
  assert.ok(incarca(JSON.parse(JSON.stringify(c.h().doc))).ok, 'ce scrie acțiunea se redeschide');
  ruleaza(R, 'foaie.ghidaje', c);
  assert.equal(c.h().trecut.length, trecut + 1, 'aceeași listă: nicio comandă');
  ruleaza(R, 'istoric.anuleaza', c);
  assert.deepEqual(c.h().doc.foi[0]?.ghidaje, []);
  for (const rea of [
    [{ id: 'g1', axa: 'x', poz: 1 }, { id: 'g1', axa: 'y', poz: 2 }],
    [{ id: 'g 1', axa: 'x', poz: 1 }],
    [{ id: 'g1', axa: 'x', poz: Number.POSITIVE_INFINITY }],
    [{ id: 'g1', axa: 'x', poz: PLAFON.translatie * 2 }],
    Array.from({ length: PLAFON.ghidaje + 1 }, (_, k) => ({ id: `g${k}`, axa: 'x' as const, poz: k })),
  ] as Ghidaj[][]) {
    assert.equal(stare(R, 'foaie.ghidaje', { ...c, ghidajeNoi: () => rea }).ok, false, JSON.stringify(rea).slice(0, 80));
  }
  assert.deepEqual(stare(R, 'foaie.ghidaje', context(true, { ghidajeNoi: () => g })), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(R, 'foaie.ghidaje', context()), { ok: false, motiv: 'motiv.nimic-ales' });
});

test('document.muta-instantele: fiecare cu deplasarea ei, un singur pas; necunoscute, dubluri, prea departe = refuz', () => {
  const c = context(false, { deplasari: () => [{ id: 'e1', dx: 10, dy: 0 }, { id: 'e2', dx: 0, dy: -5 }] });
  const inainte = c.h().doc.foi[0]?.instante.map((i) => [i.id, i.x, i.y]);
  assert.deepEqual(ruleaza(R, 'document.muta-instantele', c), { ok: true });
  const dupa = c.h().doc.foi[0]?.instante.map((i) => [i.id, i.x, i.y]);
  assert.deepEqual(dupa, inainte?.map(([id, x, y]) => (id === 'e1' ? [id, Number(x) + 10, y] : [id, x, Number(y) - 5])));
  ruleaza(R, 'istoric.anuleaza', c);
  assert.deepEqual(c.h().doc.foi[0]?.instante.map((i) => [i.id, i.x, i.y]), inainte, 'un singur pas de anulare');
  const m = (d: Array<{ id: string; dx: number; dy: number }>) => stare(R, 'document.muta-instantele', { ...c, deplasari: () => d });
  assert.deepEqual(m([{ id: 'nu-exista', dx: 1, dy: 0 }]), { ok: false, motiv: 'motiv.nimic-ales' });
  assert.deepEqual(m([{ id: 'e1', dx: 1, dy: 0 }, { id: 'e1', dx: 1, dy: 0 }]), { ok: false, motiv: 'motiv.nimic-ales' });
  assert.deepEqual(m([{ id: 'e1', dx: Number.NaN, dy: 0 }]), { ok: false, motiv: 'motiv.nimic-ales' });
  assert.deepEqual(m([{ id: 'e1', dx: PLAFON.translatie * 2, dy: 0 }]), { ok: false, motiv: 'motiv.prea-departe' });
  assert.deepEqual(stare(R, 'document.muta-instantele', context(true, { deplasari: () => [] })), { ok: false, motiv: 'motiv.doar-citire' });
  // Deplasări nule: activă, dar nicio comandă.
  const trecut = c.h().trecut.length;
  ruleaza(R, 'document.muta-instantele', { ...c, deplasari: () => [{ id: 'e1', dx: 0, dy: 0 }] });
  assert.equal(c.h().trecut.length, trecut);
});

test('document.deseneaza: o piesă nouă cu instanța ei, un pas de anulare, aleasă; linia deschisă e pe linie, la 1 mm', () => {
  const c = context(false, { formaNoua: () => ({ forma: { tip: 'dreptunghi', latime: 30, inaltime: 10, razaColt: 0 }, x: 5, y: 6 }) });
  const n = c.h().doc.foi[0]?.instante.length ?? 0;
  assert.deepEqual(ruleaza(R, 'document.deseneaza', c), { ok: true });
  const doc = c.h().doc;
  const noua = doc.foi[0]?.instante.at(-1);
  assert.equal(doc.foi[0]?.instante.length, n + 1);
  assert.deepEqual([noua?.x, noua?.y, noua?.rotire], [5, 6, 0]);
  assert.deepEqual(c.selectie(), [noua?.id], 'forma desenată rămâne aleasă');
  assert.equal(doc.piese.find((p) => p.id === noua?.piesa)?.operatii[0]?.latura, 'exterior');
  assert.ok(incarca(JSON.parse(JSON.stringify(doc))).ok);
  ruleaza(R, 'istoric.anuleaza', c);
  assert.equal(c.h().doc.foi[0]?.instante.length, n, 'un singur pas');

  const l = context(false, { formaNoua: () => ({ forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 30, y: 40 }, s: { tip: 'L' } }] }, x: 1, y: 2 }) });
  ruleaza(R, 'document.deseneaza', l);
  const op = l.h().doc.piese.at(-1)?.operatii[0];
  assert.deepEqual([op?.latura, op?.adancime, op?.pas], ['pe-linie', 1, 1]);
  assert.deepEqual(stare(R, 'document.deseneaza', context(true, { formaNoua: () => ({ forma: { tip: 'cerc', raza: 3 }, x: 0, y: 0 }) })), { ok: false, motiv: 'motiv.doar-citire' });
  // O formă pe care ușa n-o primește (raza zero) e refuzată, fără nicio comandă.
  const r = context(false, { formaNoua: () => ({ forma: { tip: 'cerc', raza: 0 }, x: 0, y: 0 }) });
  const t = r.h().trecut.length;
  assert.equal(stare(R, 'document.deseneaza', r).ok, false);
  ruleaza(R, 'document.deseneaza', r);
  assert.equal(r.h().trecut.length, t);
});
