import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esteCapabilitate } from '../../shared/capabilitati.ts';
import { traduce } from '../../src/i18n/t.ts';
import { documentNou, type Operatie } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
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

test('plafoanele: Adaugă și Ctrl+D sunt inactive când documentul ar trece de ele (altfel n-ar mai putea fi redeschis)', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  // O piesă cu 60 000 de elemente: încă o copie ar trece de 100 000 de noduri și de elemente în lume.
  const radacina = { tip: 'grup' as const, id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, copii: Array.from({ length: 60_000 }, (_, k) => ({
    tip: 'element' as const, id: `n${k}`, forma: { tip: 'cerc' as const, raza: 1 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  })) };
  const doc = ctx.h().doc;
  ctx.scrie(istoricNou({ ...doc, piese: [{ id: 'p', radacina, operatii: [] }], foi: [{ id: 'f1', stoc: doc.foi[0]!.stoc, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }] }));
  ctx.selecteaza(['i']);
  assert.deepEqual(stare(r, 'document.duplica-selectia', ctx), { ok: false, motiv: 'motiv.plafon' });
  assert.deepEqual(stare(r, 'document.adauga-cerc', ctx), { ok: true }, 'un element în plus încă încape');
  // La 99 999 + 1 noduri, încă un cerc ar trece.
  const mare = { ...radacina, copii: radacina.copii.slice(0, 1).concat(Array.from({ length: 99_998 }, (_, k) => ({ ...radacina.copii[0]!, id: `m${k}` }))) };
  ctx.scrie(istoricNou({ ...ctx.h().doc, piese: [{ id: 'p', radacina: mare, operatii: [] }] }));
  assert.deepEqual(stare(r, 'document.adauga-cerc', ctx), { ok: false, motiv: 'motiv.plafon' });
});

test('anularea și refacerea scot din selecție instanțele care nu mai sunt pe foaie', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-cerc', ctx);
  ruleaza(r, 'document.duplica-selectia', ctx);
  assert.deepEqual(ctx.sel(), ['e2']);
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.deepEqual(ctx.sel(), [], 'copia anulată nu rămâne selectată');
  assert.deepEqual(stare(r, 'document.duplica-selectia', ctx), { ok: false, motiv: 'motiv.nicio-selectie' });
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

test('Aplică operațiile (ADR 0025): o singură comandă cu valorile noi; nimic când nu se schimbă nimic; refuzat peste margini, cu altă structură sau doar citind', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-cerc', ctx);
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  const inainte = ctx.h();
  const [cerc, dr] = inainte.doc.piese;
  assert.ok(cerc && dr);
  assert.deepEqual(cerc.operatii.map((o) => [o.latura, o.adancime, o.pas]), [['interior', 8, 4]], 'cercul nou vine cu operația implicită');
  const cu = (noi: Map<string, readonly Operatie[]>): ContextDocument => ({ ...ctx, operatiiNoi: () => noi });
  // Fără schimbare: nicio comandă, deci nimic de anulat în plus.
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[cerc.id, cerc.operatii], [dr.id, dr.operatii]]))), { ok: true });
  assert.equal(ctx.h(), inainte);
  // Două piese schimbate: un singur pas în istoric, anulat dintr-un Ctrl+Z.
  const noi = new Map<string, readonly Operatie[]>([
    [cerc.id, cerc.operatii.map((o) => ({ ...o, adancime: 5, scula: { ...o.scula, diametru: 3.175 } }))],
    [dr.id, dr.operatii.map((o) => ({ ...o, latura: 'pe-linie' as const, scula: { ...o.scula, diametru: 3.175 } }))],
  ]);
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(noi)), { ok: true });
  assert.equal(ctx.h().trecut.length, inainte.trecut.length + 1);
  assert.deepEqual(ctx.h().doc.piese.map((p) => p.operatii.map((o) => [o.latura, o.adancime, o.scula.diametru])), [[['interior', 5, 3.175]], [['pe-linie', 3, 3.175]]]);
  ruleaza(r, 'istoric.anuleaza', ctx);
  assert.deepEqual(ctx.h().doc.piese, inainte.doc.piese);
  // Peste marginile schemei (un proiect salvat așa nu s-ar mai deschide): inactivă, cu motiv, fără scriere.
  const doar = ctx.h();
  const op: Operatie | undefined = cerc.operatii[0];
  assert.ok(op);
  const rele: Array<Partial<Operatie>> = [{ adancime: 1000.5 }, { pas: 0 }, { scula: { ...op.scula, diametru: 150 } }, { adancime: Number.NaN }];
  for (const rau of rele) {
    const peste: Map<string, readonly Operatie[]> = new Map([[cerc.id, [{ ...op, ...rau }]]]);
    assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(peste)), { ok: false, motiv: 'motiv.operatie-invalida' }, JSON.stringify(rau));
  }
  // Altă structură (alt nod, altă operație, una în plus, o piesă necunoscută): dialogul schimbă doar valori.
  const structuri: Array<Map<string, readonly Operatie[]>> = [
    new Map([[cerc.id, [{ ...op, noduri: [dr.id] }]]]),
    new Map([[cerc.id, [{ ...op, id: 'alta' }]]]),
    new Map([[cerc.id, [op, { ...op, id: 'a-doua' }]]]),
    new Map([['nu-exista', [op]]]),
  ];
  for (const alta of structuri) {
    assert.deepEqual(stare(r, 'document.aplica-operatii', cu(alta)), { ok: false, motiv: 'motiv.operatie-invalida' });
  }
  assert.equal(ctx.h(), doar);
  // Fila care doar citește nu scrie; fără operații noi, acțiunea n-are pe ce lucra.
  assert.deepEqual(stare(r, 'document.aplica-operatii', { ...cu(noi), doarCitire: () => true }), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(r, 'document.aplica-operatii', ctx), { ok: false, motiv: 'motiv.nimic-ales' });
});

test('o formă nouă ia freza foii când e una singură; cu freze amestecate, cea implicită (Ø6)', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-cerc', ctx);
  const [cerc] = ctx.h().doc.piese;
  assert.ok(cerc);
  const fina = { numar: 2, nume: 'freza fina', diametru: 3.175 };
  ruleaza(r, 'document.aplica-operatii', { ...ctx, operatiiNoi: () => new Map([[cerc.id, cerc.operatii.map((o) => ({ ...o, scula: fina }))]]) });
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  const dr = ctx.h().doc.piese[1];
  assert.deepEqual(dr?.operatii.map((o) => o.scula), [fina], 'dreptunghiul nou are freza cercului');
  assert.notEqual(dr?.operatii[0]?.scula, fina, 'o copie, nu același obiect');
  // Același număr și diametru, alt nume: pentru mașină e aceeași freză (cum compară și exportul), deci se păstrează.
  ruleaza(r, 'document.aplica-operatii', { ...ctx, operatiiNoi: () => new Map([[dr!.id, dr!.operatii.map((o) => ({ ...o, scula: { ...fina, nume: 'alt nume' } }))]]) });
  ruleaza(r, 'document.adauga-cerc', ctx);
  assert.deepEqual(ctx.h().doc.piese[2]?.operatii.map((o) => [o.scula.numar, o.scula.diametru]), [[2, 3.175]]);
  ruleaza(r, 'istoric.anuleaza', ctx);
  // Două freze pe foaie: nu se ghicește una, forma nouă vine cu implicita.
  ruleaza(r, 'document.aplica-operatii', { ...ctx, operatiiNoi: () => new Map([[dr!.id, dr!.operatii.map((o) => ({ ...o, scula: { ...fina, diametru: 8 } }))]]) });
  ruleaza(r, 'document.adauga-cerc', ctx);
  assert.deepEqual(ctx.h().doc.piese[2]?.operatii.map((o) => o.scula), [{ numar: 1, nume: 'freza plata', diametru: 6 }]);
});

test('plafonul operațiilor la Adaugă și Ctrl+D: o piesă fără instanțe le ține aproape de 100 000, fără tăieturi', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-cerc', ctx);
  const doc = ctx.h().doc;
  const [cerc] = doc.piese;
  assert.ok(cerc);
  const op = cerc.operatii[0];
  assert.ok(op);
  // Piesa „orfana” n-are instanțe: 99 999 de operații numărate la plafon, dar nicio tăietură în lume. Cu cercul, exact 100 000.
  const orfana = { id: 'orfana', radacina: { ...cerc.radacina, id: 'n' }, operatii: Array.from({ length: 99_999 }, (_, k) => ({ ...op, id: `o${k}`, noduri: ['n'] })) };
  ctx.scrie(istoricNou({ ...doc, piese: [...doc.piese, orfana] }));
  ctx.selecteaza([cerc.id]);
  assert.deepEqual(stare(r, 'document.duplica-selectia', ctx), { ok: false, motiv: 'motiv.plafon' }, 'copia ar avea 100 001 de operații');
  assert.deepEqual(stare(r, 'document.adauga-dreptunghi', ctx), { ok: false, motiv: 'motiv.plafon' }, 'și forma nouă');
  // Cu o operație mai puțin la orfană, încape exact.
  ctx.scrie(istoricNou({ ...doc, piese: [...doc.piese, { ...orfana, operatii: orfana.operatii.slice(1) }] }));
  assert.deepEqual(stare(r, 'document.duplica-selectia', ctx), { ok: true });
});

test('plafonul tăieturilor la Ctrl+D: un element cu două operații, pus de 50 000 de ori, e exact la 100 000', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-cerc', ctx);
  const doc = ctx.h().doc;
  const [cerc] = doc.piese;
  const op = cerc?.operatii[0];
  assert.ok(cerc && op);
  const piesa = { ...cerc, operatii: [op, { ...op, id: 'a-doua', latura: 'pe-linie' as const }] };
  const foaie = doc.foi[0]!;
  const cu = (n: number) => istoricNou({
    ...doc, piese: [piesa], foi: [{ ...foaie, instante: Array.from({ length: n }, (_, k) => ({ id: `i${k}`, piesa: cerc.id, x: 0, y: 0, rotire: 0 })) }],
  });
  // 50 000 de instanțe × 2 tăieturi = 100 000; elementele în lume, instanțele și operațiile sunt departe de plafon.
  ctx.scrie(cu(50_000));
  ctx.selecteaza(['i0']);
  assert.deepEqual(stare(r, 'document.duplica-selectia', ctx), { ok: false, motiv: 'motiv.plafon' }, 'copia ar aduce încă 2 tăieturi');
  assert.deepEqual(stare(r, 'document.adauga-cerc', ctx), { ok: false, motiv: 'motiv.plafon' }, 'și forma nouă, încă una');
  ctx.scrie(cu(49_999));
  ctx.selecteaza(['i0']);
  assert.deepEqual(stare(r, 'document.duplica-selectia', ctx), { ok: true }, '99 998 + 2 încape');
});

test('Exportă fără nicio schimbare, pe un proiect redeschis cu urechi: nicio comandă; un câmp necunoscut din urechi rămâne (recenzia 2.4)', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  const d0 = ctx.h().doc;
  // Urechile, cu un câmp necunoscut, salvate și redeschise ca în `proiectLocal`: `jsonCanonic` (cheile sortate), apoi ușa.
  const salvat = jsonCanonic({ ...d0, piese: d0.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, urechi: { numar: 4, latime: 8, grosime: 2, pozitii: [0.1, 0.4] } })) })) });
  const re = incarca(JSON.parse(salvat));
  assert.ok(re.ok, re.ok ? '' : re.motiv);
  if (!re.ok) return;
  let h = istoricNou(re.doc);
  const p = re.doc.piese[0];
  const o = p?.operatii[0];
  assert.ok(p && o);
  assert.deepEqual(Object.keys(o.urechi ?? {}), ['grosime', 'latime', 'numar', 'pozitii'], 'redeschis, cu cheile sortate');
  const cu = (noi: Map<string, readonly Operatie[]>): ContextDocument => ({ ...ctx, istoric: () => h, scrie: (n) => { h = n; }, operatiiNoi: () => noi });
  // Ce trimite dialogul: valorile reconstruite din câmpurile lui, fără câmpul necunoscut, în ordinea lui.
  const v = { latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas, urechi: { numar: 4, latime: 8, grosime: 2 }, rampa: null, intrari: null };
  const scula = { numar: o.scula.numar, diametru: o.scula.diametru };
  const inainte = h;
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [operatieDinDialog(o, v, scula)]]]))), { ok: true });
  assert.equal(h, inainte, 'nicio comandă: nimic de anulat după un Exportă fără schimbare');
  // Aceeași operație cu cheile în altă ordine (oricum ar construi-o dialogul): tot nicio comandă, comparația e canonică.
  const invers = Object.fromEntries(Object.entries(o).reverse()) as Operatie;
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [invers]]]))), { ok: true });
  assert.equal(h, inainte, 'aceleași valori în altă ordine nu sunt o schimbare');
  // O schimbare reală: un singur pas, iar câmpul necunoscut rămâne.
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [operatieDinDialog(o, { ...v, urechi: { numar: 6, latime: 8, grosime: 2 } }, scula)]]]))), { ok: true });
  assert.equal(h.trecut.length, inainte.trecut.length + 1);
  assert.deepEqual(h.doc.piese[0]?.operatii[0]?.urechi, { grosime: 2, latime: 8, numar: 6, pozitii: [0.1, 0.4] });
  // Bifa scoasă: fără urechi.
  assert.equal(operatieDinDialog(o, { ...v, urechi: null }, scula).urechi, null);
  // Rândul pe care dialogul nu-l are rămâne cum e.
  assert.equal(operatieDinDialog(o, undefined, scula).urechi, o.urechi);
});

test('Exportă fără nicio schimbare, pe un proiect redeschis cu rampă: nicio comandă; un câmp necunoscut din rampă rămâne (felia 2.5a)', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  const d0 = ctx.h().doc;
  const salvat = jsonCanonic({ ...d0, piese: d0.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, rampa: { lungime: 10, unghi: 3 } })) })) });
  const re = incarca(JSON.parse(salvat));
  assert.ok(re.ok, re.ok ? '' : re.motiv);
  if (!re.ok) return;
  let h = istoricNou(re.doc);
  const p = re.doc.piese[0];
  const o = p?.operatii[0];
  assert.ok(p && o);
  const cu = (noi: Map<string, readonly Operatie[]>): ContextDocument => ({ ...ctx, istoric: () => h, scrie: (n) => { h = n; }, operatiiNoi: () => noi });
  const v = { latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas, urechi: null, rampa: { lungime: 10 }, intrari: null };
  const scula = { numar: o.scula.numar, diametru: o.scula.diametru };
  const inainte = h;
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [operatieDinDialog(o, v, scula)]]]))), { ok: true });
  assert.equal(h, inainte, 'nicio comandă după un Exportă fără schimbare');
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [operatieDinDialog(o, { ...v, rampa: { lungime: 25 } }, scula)]]]))), { ok: true });
  assert.deepEqual(h.doc.piese[0]?.operatii[0]?.rampa, { lungime: 25, unghi: 3 });
  assert.equal(operatieDinDialog(o, { ...v, rampa: null }, scula).rampa, null);
});

test('Exportă fără nicio schimbare, pe un proiect redeschis cu intrări: nicio comandă; un câmp necunoscut din intrări rămâne (felia 2.5b)', () => {
  const r = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const ctx = context();
  ruleaza(r, 'document.adauga-dreptunghi', ctx);
  const d0 = ctx.h().doc;
  const salvat = jsonCanonic({ ...d0, piese: d0.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, intrari: { raza: 3, forma: 'arc' } })) })) });
  const re = incarca(JSON.parse(salvat));
  assert.ok(re.ok, re.ok ? '' : re.motiv);
  if (!re.ok) return;
  let h = istoricNou(re.doc);
  const p = re.doc.piese[0];
  const o = p?.operatii[0];
  assert.ok(p && o);
  const cu = (noi: Map<string, readonly Operatie[]>): ContextDocument => ({ ...ctx, istoric: () => h, scrie: (n) => { h = n; }, operatiiNoi: () => noi });
  const v = { latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas, urechi: null, rampa: null, intrari: { raza: 3 } };
  const scula = { numar: o.scula.numar, diametru: o.scula.diametru };
  const inainte = h;
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [operatieDinDialog(o, v, scula)]]]))), { ok: true });
  assert.equal(h, inainte, 'nicio comandă după un Exportă fără schimbare');
  assert.deepEqual(ruleaza(r, 'document.aplica-operatii', cu(new Map([[p.id, [operatieDinDialog(o, { ...v, intrari: { raza: 5 } }, scula)]]]))), { ok: true });
  assert.deepEqual(h.doc.piese[0]?.operatii[0]?.intrari, { forma: 'arc', raza: 5 });
  assert.equal(operatieDinDialog(o, { ...v, intrari: null }, scula).intrari, null);
});
