/**
 * Acțiunea rolului de tăiere din panou (ADR 0112): piesele instanțelor alese primesc operațiile rolului într-un singur pas
 * de anulare; refuzurile (fără selecție, rolul care nu se potrivește uneia dintre piese, fila care doar citește) și același
 * rol, care nu e o comandă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import type { Rol } from '../../src/model/rol.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

type Ctx = ContextDocument & { h: () => Istoric; rol: Rol; doarCitesc: boolean };

/** Foaia de 140 × 100 × 18, cu un dreptunghi (instanța i1) și un cerc (i2), fiecare cu operația implicită. */
function context(): Ctx {
  let h = istoricNou(documentNou({ latime: 140, inaltime: 100, grosime: 18 }));
  let sel: readonly string[] = [];
  const ctx: Ctx = {
    istoric: () => h,
    scrie: (nou) => { h = nou; },
    selectie: () => sel,
    selecteaza: (ids) => { sel = ids; },
    doarCitire: () => ctx.doarCitesc,
    rolNou: () => ctx.rol,
    h: () => h,
    rol: 'exterior',
    doarCitesc: false,
  };
  assert.equal(ruleaza(R, 'document.adauga-dreptunghi', ctx).ok, true);
  assert.equal(ruleaza(R, 'document.adauga-cerc', ctx).ok, true);
  return ctx;
}

/** Instanțele foii, în ordine (dreptunghiul, apoi cercul). */
const instante = (ctx: Ctx): string[] => ctx.h().doc.foi[0]!.instante.map((i) => i.id);
/** Felul și latura operațiilor piesei unei instanțe. */
function operatii(ctx: Ctx, instanta: string): string[] {
  const i = ctx.h().doc.foi[0]!.instante.find((x) => x.id === instanta);
  const p = ctx.h().doc.piese.find((x) => x.id === i?.piesa);
  return (p?.operatii ?? []).map((o) => `${o.tip} ${o.latura}`);
}

test('rolul ales înlocuiește operațiile piesei într-un singur pas, iar anularea le pune la loc', () => {
  const ctx = context();
  const [d] = instante(ctx);
  ctx.selecteaza([d!]);
  const pasi = ctx.h().trecut.length;
  ctx.rol = 'buzunar';
  assert.equal(ruleaza(R, 'document.rol', ctx).ok, true);
  assert.deepEqual(operatii(ctx, d!), ['buzunar interior']);
  assert.equal(ctx.h().trecut.length, pasi + 1);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.deepEqual(operatii(ctx, d!), ['profil exterior']);
});

test('mai multe forme: un singur pas; un rol care nu se potrivește uneia dintre ele e refuzat, cu motivul', () => {
  const ctx = context();
  const [d, c] = instante(ctx);
  ctx.selecteaza([d!, c!]);
  // Găurirea e doar a cercurilor: dreptunghiul o refuză, deci nu se schimbă nimic.
  ctx.rol = 'gaurire';
  assert.deepEqual(stare(R, 'document.rol', ctx), { ok: false, motiv: 'motiv.rol-nepotrivit' });
  const pasi = ctx.h().trecut.length;
  ctx.rol = 'pe-linie';
  assert.equal(ruleaza(R, 'document.rol', ctx).ok, true);
  assert.deepEqual([operatii(ctx, d!), operatii(ctx, c!)], [['profil pe-linie'], ['profil pe-linie']]);
  assert.equal(ctx.h().trecut.length, pasi + 1);
});

test('același rol nu e o comandă; fără selecție și în fila care doar citește, refuzul are motivul lui', () => {
  const ctx = context();
  const [d] = instante(ctx);
  // Adăugarea lasă aleasă forma nouă: întâi nimic ales.
  ctx.selecteaza([]);
  assert.deepEqual(stare(R, 'document.rol', ctx), { ok: false, motiv: 'motiv.nicio-selectie' });
  ctx.selecteaza([d!]);
  // Dreptunghiul nou e deja pe exterior.
  ctx.rol = 'exterior';
  assert.deepEqual(stare(R, 'document.rol', ctx), { ok: false, motiv: 'motiv.nimic-ales' });
  ctx.rol = 'interior';
  assert.equal(stare(R, 'document.rol', ctx).ok, true);
  ctx.doarCitesc = true;
  const s = stare(R, 'document.rol', ctx);
  assert.equal(s.ok, false);
  assert.notEqual(s.ok ? '' : s.motiv, 'motiv.rol-nepotrivit');
  assert.equal(ruleaza(R, 'document.rol', ctx).ok, false);
  assert.deepEqual(operatii(ctx, d!), ['profil exterior']);
});
