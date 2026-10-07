import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esteCapabilitate } from '../../shared/capabilitati.ts';
import { traduce } from '../../src/i18n/t.ts';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';

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
  assert.equal(ctx.h().doc.elemente.length, 0);
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
  assert.deepEqual(ctx.h().doc.elemente.map((e) => e.forma.tip), ['dreptunghi', 'cerc']);
  assert.deepEqual(ctx.sel(), ['e2'], 'elementul nou rămâne selectat');
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.equal(ctx.h().doc.elemente.length, 1);
  ruleaza(r, 'istoric.reface', ctx);
  assert.equal(ctx.h().doc.elemente.length, 2);
  assert.deepEqual(stare(r, 'istoric.reface', ctx), { ok: false, motiv: 'motiv.nimic-de-refacut' });
});

test('mută și șterge selecția; fără selecție, motivul', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context({ dx: 5, dy: -2.5 });
  assert.deepEqual(stare(r, 'document.muta-selectia', ctx), { ok: false, motiv: 'motiv.nicio-selectie' });
  ruleaza(r, 'document.adauga-cerc', ctx);
  ruleaza(r, 'document.muta-selectia', ctx);
  assert.deepEqual([ctx.h().doc.elemente[0]?.matrice.e, ctx.h().doc.elemente[0]?.matrice.f], [75, 47.5]);
  ruleaza(r, 'document.sterge-selectia', ctx);
  assert.equal(ctx.h().doc.elemente.length, 0);
  assert.deepEqual(ctx.sel(), []);
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.equal(ctx.h().doc.elemente[0]?.matrice.e, 75, 'ștergerea anulată readuce elementul mutat');
});
