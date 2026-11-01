/**
 * Acțiunea rolului de tăiere din panou (ADR 0112): piesele instanțelor alese primesc operațiile rolului într-un singur pas
 * de anulare; refuzurile (fără selecție, rolul care nu se potrivește uneia dintre piese, fila care doar citește) și același
 * rol, care nu e o comandă. Rolul personalizat (ADR 0114): aceleași reguli, cu valorile și numerele frezelor lui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, type Piesa } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import type { Rol } from '../../src/model/rol.ts';
import { cuRolNou, sablonDinPiese, type RolPersonal } from '../../src/model/rolPersonal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

type Ctx = ContextDocument & { h: () => Istoric; rol: Rol | RolPersonal; doarCitesc: boolean };

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

/** Piesa unei instanțe. */
function piesa(ctx: Ctx, instanta: string): Piesa {
  const i = ctx.h().doc.foi[0]!.instante.find((x) => x.id === instanta);
  return ctx.h().doc.piese.find((x) => x.id === i?.piesa)!;
}

/** Rolul personalizat salvat din piesă, cu operațiile ei schimbate de `f`. */
function rolDin(p: Piesa, f: (o: Piesa['operatii'][number]) => Piesa['operatii'][number], nume: string): RolPersonal {
  const s = sablonDinPiese([{ ...p, operatii: p.operatii.map(f) }]);
  assert.ok(s.ok);
  const r = cuRolNou([], nume, s.sablon, 'r1');
  assert.ok(r.ok);
  return r.roluri[0]!;
}

test('rolul personalizat: valorile lui pe toate piesele alese, într-un pas, cu aceleași numere de freză; refuzat unde nu se potrivește', () => {
  const ctx = context();
  const [d, c] = instante(ctx);
  // O a treia piesă, nealeasă, ține T1 (Ø6): rolul (T1 Ø8) ia cel mai mic liber, T2, pe ambele piese alese.
  assert.equal(ruleaza(R, 'document.adauga-dreptunghi', ctx).ok, true);
  ctx.rol = rolDin(piesa(ctx, d!), (o) => ({ ...o, adancime: 6.5, pas: 2, scula: { numar: 1, nume: 'freza 8', diametru: 8 } }), 'Decupare');
  ctx.selecteaza([d!, c!]);
  const pasi = ctx.h().trecut.length;
  assert.equal(ruleaza(R, 'document.rol', ctx).ok, true);
  assert.equal(ctx.h().trecut.length, pasi + 1);
  for (const i of [d!, c!]) {
    assert.deepEqual(piesa(ctx, i).operatii.map((o) => [o.tip, o.latura, o.adancime, o.pas, o.scula.numar, o.scula.diametru]), [['profil', 'exterior', 6.5, 2, 2, 8]]);
  }
  // Același rol din nou nu e o comandă; o anulare pune ambele piese la loc.
  assert.deepEqual(stare(R, 'document.rol', ctx), { ok: false, motiv: 'motiv.nimic-ales' });
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.deepEqual([operatii(ctx, d!), operatii(ctx, c!)], [['profil exterior'], ['profil interior']]);
  // Găurirea (doar cercuri) nu se potrivește dreptunghiului: refuzul are motivul lui.
  ctx.rol = rolDin(piesa(ctx, c!), (o) => ({ ...o, tip: 'gaurire', latura: 'interior' }), 'Găuri');
  ctx.selecteaza([d!]);
  assert.deepEqual(stare(R, 'document.rol', ctx), { ok: false, motiv: 'motiv.rol-nepotrivit' });
  ctx.selecteaza([c!]);
  assert.equal(ruleaza(R, 'document.rol', ctx).ok, true);
  assert.deepEqual(operatii(ctx, c!), ['gaurire interior']);
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
