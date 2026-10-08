import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esteCapabilitate } from '../../shared/capabilitati.ts';
import { traduce } from '../../src/i18n/t.ts';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';

const lume = (h: Istoric) => elementeFoaie(h.doc, 0);
const instante = (h: Istoric) => h.doc.foi[0]?.instante ?? [];

function context(deplasare?: { dx: number; dy: number }): ContextDocument & { h: () => Istoric; sel: () => readonly string[] } {
  let h = istoricNou(documentNou({ latime: 140, inaltime: 100, grosime: 18 }));
  let sel: readonly string[] = [];
  return {
    istoric: () => h,
    scrie: (nou) => { h = nou; },
    selectie: () => sel,
    selecteaza: (ids) => { sel = ids; },
    ...(deplasare ? { deplasare: () => deplasare } : {}),
    h: () => h,
    sel: () => sel,
  };
}

test('fiecare acțiune declară o capabilitate din catalog și o etichetă în ambele limbi', () => {
  assert.ok(ACTIUNI_DOCUMENT.length > 0);
  for (const a of ACTIUNI_DOCUMENT) {
    assert.ok(a.id.length > 0, 'id gol');
    assert.ok(esteCapabilitate(a.capabilitate), `${a.id}: capabilitatea „${a.capabilitate}” nu e în catalog`);
    assert.ok(traduce('ro', a.eticheta).length > 0 && traduce('en', a.eticheta).length > 0, a.id);
  }
});

test('registrul refuză un id înregistrat de două ori', () => {
  const [prima] = ACTIUNI_DOCUMENT;
  assert.ok(prima);
  assert.throws(() => creeazaRegistru([prima, prima], () => true), /de două ori/);
});

test('fără capabilitate, acțiunea nu rulează și nu schimbă nimic', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => false);
  const ctx = context();
  assert.deepEqual(ruleaza(r, 'document.adauga-cerc', ctx), { ok: false, motiv: 'motiv.fara-capabilitate' });
  assert.equal(lume(ctx.h()).length, 0);
});

test('o acțiune necunoscută dă motivul ei', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  assert.deepEqual(stare(r, 'nu.exista', context()), { ok: false, motiv: 'motiv.actiune-necunoscuta' });
});

test('adaugă, anulează, reface: prin registru, cu motivele acțiunilor inactive', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  assert.deepEqual(stare(r, 'istoric.anuleaza', ctx), { ok: false, motiv: 'motiv.nimic-de-anulat' });
  assert.deepEqual(ruleaza(r, 'document.adauga-dreptunghi', ctx), { ok: true });
  assert.deepEqual(ruleaza(r, 'document.adauga-cerc', ctx), { ok: true });
  assert.deepEqual(lume(ctx.h()).map((e) => e.forma.tip), ['dreptunghi', 'cerc']);
  assert.deepEqual(ctx.sel(), ['e2'], 'instanța nouă rămâne selectată');
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.equal(lume(ctx.h()).length, 1);
  ruleaza(r, 'istoric.reface', ctx);
  assert.equal(lume(ctx.h()).length, 2);
  assert.deepEqual(stare(r, 'istoric.reface', ctx), { ok: false, motiv: 'motiv.nimic-de-refacut' });
});

test('mută și șterge selecția; fără selecție, motivul', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context({ dx: 5, dy: -2.5 });
  assert.deepEqual(stare(r, 'document.muta-selectia', ctx), { ok: false, motiv: 'motiv.nicio-selectie' });
  ruleaza(r, 'document.adauga-cerc', ctx);
  ruleaza(r, 'document.muta-selectia', ctx);
  assert.deepEqual([lume(ctx.h())[0]?.matrice.e, lume(ctx.h())[0]?.matrice.f], [75, 47.5]);
  assert.deepEqual([instante(ctx.h())[0]?.x, instante(ctx.h())[0]?.y], [75, 47.5], 'mutarea e a instanței');
  ruleaza(r, 'document.sterge-selectia', ctx);
  assert.equal(lume(ctx.h()).length, 0);
  assert.deepEqual(ctx.h().doc.piese, [], 'ultima instanță ia și piesa');
  assert.deepEqual(ctx.sel(), []);
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.equal(lume(ctx.h())[0]?.matrice.e, 75, 'ștergerea anulată readuce elementul mutat');
  assert.equal(ctx.h().doc.piese.length, 1, 'și piesa lui');
});

test('Ctrl+D: o copie SEPARATĂ (piesă nouă, același arbore), imediat după original, decalată 20 / −20; un singur pas de anulare', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  ruleaza(r, 'document.adauga-cerc', ctx);
  ctx.selecteaza(['e1', 'e2']);
  assert.deepEqual(ruleaza(r, 'document.duplica-selectia', ctx), { ok: true });
  assert.deepEqual(instante(ctx.h()).map((i) => [i.id, i.piesa, i.x, i.y]), [
    ['e1', 'e1', 20, 20], ['e3', 'e3', 40, 0], ['e2', 'e2', 70, 50], ['e4', 'e4', 90, 30],
  ]);
  assert.deepEqual(ctx.h().doc.piese.map((p) => p.id), ['e1', 'e3', 'e2', 'e4']);
  assert.deepEqual(ctx.sel(), ['e3', 'e4'], 'copiile rămân selectate');
  // Copia e separată: are piesa ei, cu arborele egal, dar nu același obiect.
  const [p1, p3] = ctx.h().doc.piese;
  assert.deepEqual(p3?.radacina, p1?.radacina);
  assert.notEqual(p3?.radacina, p1?.radacina);
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.deepEqual(instante(ctx.h()).map((i) => i.id), ['e1', 'e2'], 'o singură anulare scoate ambele copii');
  assert.deepEqual(ctx.h().doc.piese.map((p) => p.id), ['e1', 'e2']);
});

test('ștergerea a două instanțe e un singur pas: anularea le pune înapoi pe pozițiile lor, cu piesele', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  ruleaza(r, 'document.adauga-cerc', ctx);
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  const inainte = ctx.h().doc;
  ctx.selecteaza(['e1', 'e3']);
  ruleaza(r, 'document.sterge-selectia', ctx);
  assert.deepEqual(instante(ctx.h()).map((i) => i.id), ['e2']);
  assert.deepEqual(ctx.h().doc.piese.map((p) => p.id), ['e2']);
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.deepEqual(ctx.h().doc.foi, inainte.foi);
  assert.deepEqual(ctx.h().doc.piese, inainte.piese);
});

test('o filă care doar citește: nicio acțiune care schimbă documentul nu rulează; selecția merge', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-cerc', ctx);
  const citire: ContextDocument = { ...ctx, doarCitire: () => true };
  for (const id of ['document.adauga-dreptunghi', 'document.adauga-cerc', 'document.sterge-selectia', 'document.duplica-selectia', 'istoric.anuleaza']) {
    assert.deepEqual(ruleaza(r, id, citire), { ok: false, motiv: 'motiv.doar-citire' }, id);
  }
  assert.equal(lume(ctx.h()).length, 1);
  assert.deepEqual(ruleaza(r, 'selectie.din-lista', { ...citire, alese: () => ['e1', 'nu-exista'] }), { ok: true });
  assert.deepEqual(ctx.sel(), ['e1'], 'din listă se aleg doar instanțe care există');
});
