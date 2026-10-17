/**
 * Acțiunile panoului de proprietăți (ADR 0038 §4, felia 2.8c): poziția (colțul stânga-jos al cutiei selecției), rotirea
 * (în jurul centrului piesei) și materialul foii; fiecare un singur pas de anulare, cu refuzurile ei. Plus numărul cu semn
 * al câmpului unic (§5).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uneste, type Cutie } from '../../src/geom/cutie.ts';
import { documentNou } from '../../src/model/document.ts';
import { cutieElement } from '../../src/model/forme.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { rotireNormalizata } from '../../src/ui/actiuniDocumentCalcul.ts';
import { citesteNumar, textNumar } from '../../src/ui/numar.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

type Ctx = ContextDocument & {
  h: () => Istoric;
  pozitie: { x?: number; y?: number };
  rotire: number;
  stoc: { latime?: number; inaltime?: number; grosime?: number };
  doarCitesc: boolean;
};

/** Foaia de 140 × 100 × 18, cu un dreptunghi (100 × 60, e1) și un cerc (R15, e2). */
function context(): Ctx {
  let h = istoricNou(documentNou({ latime: 140, inaltime: 100, grosime: 18 }));
  let sel: readonly string[] = [];
  const ctx: Ctx = {
    istoric: () => h,
    scrie: (nou) => { h = nou; },
    selectie: () => sel,
    selecteaza: (ids) => { sel = ids; },
    doarCitire: () => ctx.doarCitesc,
    pozitieNoua: () => ctx.pozitie,
    rotireNoua: () => ctx.rotire,
    stocNou: () => ctx.stoc,
    h: () => h,
    pozitie: {},
    rotire: 0,
    stoc: {},
    doarCitesc: false,
  };
  assert.equal(ruleaza(R, 'document.adauga-dreptunghi', ctx).ok, true);
  assert.equal(ruleaza(R, 'document.adauga-cerc', ctx).ok, true);
  return ctx;
}

const instanta = (ctx: Ctx, id: string) => {
  const i = ctx.h().doc.foi[0]?.instante.find((x) => x.id === id);
  assert.ok(i, id);
  return i;
};
function cutie(ctx: Ctx, ...ids: string[]): Cutie {
  let k: Cutie | null = null;
  for (const e of elementeFoaie(ctx.h().doc, 0)) if (ids.includes(e.instanta)) k = k ? uneste(k, cutieElement(e)) : cutieElement(e);
  assert.ok(k);
  return k;
}
const pasi = (ctx: Ctx) => ctx.h().trecut.length;
const redeschis = (ctx: Ctx) => incarca(JSON.parse(jsonCanonic(ctx.h().doc)));

test('poziția: colțul stânga-jos al cutiei unei forme ajunge exact unde scrii; doar axa scrisă se mișcă; un pas de anulare', () => {
  const ctx = context();
  ctx.selecteaza(['e2']);
  const k0 = cutie(ctx, 'e2');
  const n = pasi(ctx);
  ctx.pozitie = { x: 0 };
  assert.equal(ruleaza(R, 'document.pozitioneaza', ctx).ok, true);
  const k = cutie(ctx, 'e2');
  assert.equal(k.minX, 0);
  assert.equal(k.minY, k0.minY);
  assert.equal(pasi(ctx), n + 1);
  // Cercul are originea instanței în centru: poziția din panou e locul formei, nu originea.
  assert.equal(instanta(ctx, 'e2').x, 15);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.deepEqual(cutie(ctx, 'e2'), k0);
});

test('poziția la mai multe forme: cutia comună se mută, toate cu aceeași deplasare, într-un singur pas', () => {
  const ctx = context();
  ctx.selecteaza(['e1', 'e2']);
  const k0 = cutie(ctx, 'e1', 'e2'), a0 = cutie(ctx, 'e1'), b0 = cutie(ctx, 'e2');
  const n = pasi(ctx);
  ctx.pozitie = { x: k0.minX - 7, y: k0.minY + 3 };
  assert.equal(ruleaza(R, 'document.pozitioneaza', ctx).ok, true);
  assert.equal(pasi(ctx), n + 1);
  assert.equal(cutie(ctx, 'e1').minX, a0.minX - 7);
  assert.equal(cutie(ctx, 'e2').minX, b0.minX - 7);
  assert.equal(cutie(ctx, 'e2').minY, b0.minY + 3);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.deepEqual(cutie(ctx, 'e1', 'e2'), k0);
});

test('poziția: aceeași valoare nu e o comandă; refuzurile au motivul lor', () => {
  const ctx = context();
  ctx.selecteaza([]);
  assert.deepEqual(stare(R, 'document.pozitioneaza', ctx), { ok: false, motiv: 'motiv.nicio-selectie' });
  ctx.selecteaza(['e1']);
  const k0 = cutie(ctx, 'e1');
  const n = pasi(ctx);
  ctx.pozitie = { x: k0.minX, y: k0.minY };
  assert.equal(ruleaza(R, 'document.pozitioneaza', ctx).ok, true);
  assert.equal(pasi(ctx), n, 'fără schimbare, fără pas de anulare');
  ctx.pozitie = { x: Number.NaN };
  assert.deepEqual(stare(R, 'document.pozitioneaza', ctx), { ok: false, motiv: 'motiv.valoare-invalida' });
  ctx.pozitie = { x: 2e7 };
  assert.deepEqual(stare(R, 'document.pozitioneaza', ctx), { ok: false, motiv: 'motiv.prea-departe' });
  ctx.pozitie = { x: 1 };
  ctx.doarCitesc = true;
  assert.deepEqual(ruleaza(R, 'document.pozitioneaza', ctx), { ok: false, motiv: 'motiv.doar-citire' });
  assert.equal(pasi(ctx), n);
});

test('rotirea ține pe loc centrul cutiei piesei: dreptunghiul de 100 × 60 rotit cu 90° are cutia 60 × 100, cu același centru', () => {
  const ctx = context();
  ctx.selecteaza(['e1']);
  const k0 = cutie(ctx, 'e1');
  const i0 = instanta(ctx, 'e1');
  ctx.rotire = 90;
  assert.equal(ruleaza(R, 'document.roteste', ctx).ok, true);
  const k = cutie(ctx, 'e1');
  assert.equal(instanta(ctx, 'e1').rotire, 90);
  assert.equal((k.minX + k.maxX) / 2, (k0.minX + k0.maxX) / 2);
  assert.equal((k.minY + k.maxY) / 2, (k0.minY + k0.maxY) / 2);
  assert.equal(k.maxX - k.minX, k0.maxY - k0.minY);
  assert.equal(k.maxY - k.minY, k0.maxX - k0.minX);
  // Un unghi oarecare: centrul tot pe loc (la rotunjirea dublei); înapoi la 0, originea revine exact.
  ctx.rotire = 33.3;
  assert.equal(ruleaza(R, 'document.roteste', ctx).ok, true);
  const k2 = cutie(ctx, 'e1');
  assert.ok(Math.abs((k2.minX + k2.maxX) / 2 - (k0.minX + k0.maxX) / 2) < 1e-9);
  assert.ok(Math.abs((k2.minY + k2.maxY) / 2 - (k0.minY + k0.maxY) / 2) < 1e-9);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.deepEqual(instanta(ctx, 'e1'), i0);
  assert.equal(redeschis(ctx).ok, true);
});

test('rotirea: unghiul se normalizează în [0, 360); o singură formă; aceeași valoare nu e o comandă', () => {
  for (const [r, v] of [[0, 0], [-0, 0], [90, 90], [359.5, 359.5], [360, 0], [-90, 270], [720.5, 0.5], [-1e-300, 0], [0.1, 0.1]] as const) {
    assert.ok(Object.is(rotireNormalizata(r), v), `${r} → ${rotireNormalizata(r)}`);
  }
  const ctx = context();
  ctx.selecteaza(['e1', 'e2']);
  ctx.rotire = 45;
  assert.deepEqual(stare(R, 'document.roteste', ctx), { ok: false, motiv: 'motiv.o-singura-selectie' });
  ctx.selecteaza(['e2']);
  ctx.rotire = Number.POSITIVE_INFINITY;
  assert.deepEqual(stare(R, 'document.roteste', ctx), { ok: false, motiv: 'motiv.valoare-invalida' });
  ctx.rotire = -90;
  assert.equal(ruleaza(R, 'document.roteste', ctx).ok, true);
  assert.equal(instanta(ctx, 'e2').rotire, 270);
  const n = pasi(ctx);
  ctx.rotire = 270;
  assert.equal(ruleaza(R, 'document.roteste', ctx).ok, true);
  assert.equal(pasi(ctx), n);
  ctx.doarCitesc = true;
  ctx.rotire = 10;
  assert.deepEqual(stare(R, 'document.roteste', ctx), { ok: false, motiv: 'motiv.doar-citire' });
});

test('foaia: lățimea, înălțimea și grosimea, doar cele scrise, în plafoane; un pas de anulare; proiectul se redeschide', () => {
  const ctx = context();
  const n = pasi(ctx);
  ctx.stoc = { latime: 2440 };
  assert.equal(ruleaza(R, 'foaie.stoc', ctx).ok, true);
  assert.deepEqual(ctx.h().doc.foi[0]?.stoc, { latime: 2440, inaltime: 100, grosime: 18 });
  assert.equal(pasi(ctx), n + 1);
  assert.equal(redeschis(ctx).ok, true);
  ctx.stoc = { inaltime: 1220, grosime: 12 };
  assert.equal(ruleaza(R, 'foaie.stoc', ctx).ok, true);
  assert.deepEqual(ctx.h().doc.foi[0]?.stoc, { latime: 2440, inaltime: 1220, grosime: 12 });
  // Aceleași valori: nicio comandă.
  ctx.stoc = { latime: 2440, grosime: 12 };
  assert.equal(ruleaza(R, 'foaie.stoc', ctx).ok, true);
  assert.equal(pasi(ctx), n + 2);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.equal(ruleaza(R, 'istoric.anuleaza', ctx).ok, true);
  assert.deepEqual(ctx.h().doc.foi[0]?.stoc, { latime: 140, inaltime: 100, grosime: 18 });
  assert.equal(ruleaza(R, 'istoric.reface', ctx).ok, true);
  assert.deepEqual(ctx.h().doc.foi[0]?.stoc, { latime: 2440, inaltime: 100, grosime: 18 });
});

test('foaia: zero, negativ, peste plafon (10 000 / 1 000 mm), NaN și fila care doar citește sunt refuzate, fără comandă', () => {
  const ctx = context();
  const n = pasi(ctx);
  for (const stoc of [{ latime: 0 }, { inaltime: -5 }, { latime: 10_000.001 }, { grosime: 1_000.5 }, { grosime: Number.NaN }, { latime: Number.POSITIVE_INFINITY }]) {
    ctx.stoc = stoc;
    assert.deepEqual(ruleaza(R, 'foaie.stoc', ctx), { ok: false, motiv: 'motiv.foaie-invalida' }, JSON.stringify(stoc));
  }
  ctx.stoc = { latime: 10_000, grosime: 1_000 };
  assert.equal(stare(R, 'foaie.stoc', ctx).ok, true, 'plafonul însuși e primit');
  ctx.doarCitesc = true;
  assert.deepEqual(ruleaza(R, 'foaie.stoc', ctx), { ok: false, motiv: 'motiv.doar-citire' });
  assert.equal(pasi(ctx), n);
});

test('câmpul unic: semnul doar unde e cerut; „-0” e 0; textul unei valori negative se citește înapoi exact', () => {
  for (const [s, v] of [['-12,5', -12.5], ['−3', -3], ['+4', 4], [' - 7 ', -7], ['-.5', -0.5], ['12', 12]] as const) assert.equal(citesteNumar(s, true), v, s);
  assert.ok(Object.is(citesteNumar('-0', true), 0));
  for (const s of ['-', '--1', '+-1', '1-', '-1e3', '- ']) assert.equal(citesteNumar(s, true), null, s);
  for (const s of ['-1', '+1', '−1']) assert.equal(citesteNumar(s), null, `fără semn: ${s}`);
  for (const x of [-1e-7, -1.2345e-7, -0.1 - 0.2, -2440, -5e-324]) {
    for (const virgula of [false, true]) assert.equal(citesteNumar(textNumar(x, virgula), true), x, `${x} / ${virgula}`);
  }
});
