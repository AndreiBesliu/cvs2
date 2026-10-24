import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteRetea, FORMULAR_RETEA } from '../../src/app/editareCalcul.ts';
import { documentNou } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { copiiRetea, instantaCopiei, motivRetea, punctulCopiei, RETEA_MAXIM, type Retea } from '../../src/model/retea.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { motivCopiereRetea } from '../../src/ui/actiuniDocumentCalcul.ts';

/**
 * Copierea în rețea (ADR 0061): grila (rânduri × coloane, la pasul cutiei plus spațiul) și cercul (în jurul unui centru,
 * cu sau fără rotirea copiilor); copiile sunt piese independente, într-un singur pas de anulare.
 */

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
const cutie = { minX: 20, minY: 20, maxX: 120, maxY: 80 };
const grila = (coloane: number, randuri: number, spatiuX = 10, spatiuY = 10): Retea => ({ fel: 'grila', coloane, randuri, spatiuX, spatiuY });
const cerc = (numar: number, unghi = 360, roteste = true, centru = { x: 150, y: 100 }): Retea => ({ fel: 'cerc', numar, centru, unghi, roteste });

test('grila: copiile la pasul cutiei plus spațiul, spre dreapta și în sus, fără original', () => {
  assert.deepEqual(copiiRetea(cutie, grila(3, 2)).map((k) => [k.dx, k.dy, k.unghi]), [[110, 0, 0], [220, 0, 0], [0, 70, 0], [110, 70, 0], [220, 70, 0]]);
  assert.deepEqual(copiiRetea(cutie, grila(1, 3, 0, 5)).map((k) => [k.dx, k.dy]), [[0, 65], [0, 130]]);
});

test('cercul: pas egal pe 360°, capetele incluse pe mai puțin; cu rotire, rotația în jurul centrului; fără, doar mutarea', () => {
  assert.deepEqual(copiiRetea(cutie, cerc(4)).map((k) => k.unghi), [90, 180, 270]);
  assert.deepEqual(copiiRetea(cutie, cerc(3, 180)).map((k) => k.unghi), [90, 180]);
  // Originea instanței (20, 20) rotită cu 90° în jurul lui (150, 100): (230, -30); rotirea crește cu 90.
  const k = copiiRetea(cutie, cerc(4))[0]!;
  assert.deepEqual(instantaCopiei({ x: 20, y: 20, rotire: 0 }, k), { x: 230, y: -30, rotire: 90 });
  assert.deepEqual(instantaCopiei({ x: 20, y: 20, rotire: 300 }, k), { x: 230, y: -30, rotire: 30 }, 'rotirea rămâne în [0, 360)');
  // Fără rotire: centrul cutiei (70, 50) ajunge în (200, 20), iar copia doar se mută.
  const m = copiiRetea(cutie, cerc(4, 360, false))[0]!;
  assert.equal(m.unghi, 0);
  assert.deepEqual(punctulCopiei({ x: 70, y: 50 }, m), { x: 200, y: 20 });
  assert.deepEqual(instantaCopiei({ x: 20, y: 20, rotire: 0 }, m), { x: 150, y: -10, rotire: 0 });
});

test('valorile: întregi, cel puțin două forme și cel mult 1000, spații nenegative, unghi în (0, 360], centru finit', () => {
  assert.equal(motivRetea(grila(3, 2)), null);
  assert.equal(motivRetea(grila(1, 1)), 'grila', 'doar originalul');
  assert.equal(motivRetea(grila(2.5, 2)), 'grila');
  assert.equal(motivRetea(grila(0, 3)), 'grila');
  assert.equal(motivRetea(grila(101, 1)), 'grila');
  assert.equal(motivRetea(grila(40, 30)), 'grila', `peste ${RETEA_MAXIM}`);
  assert.equal(motivRetea(grila(2, 2, -1)), 'spatiu');
  assert.equal(motivRetea(grila(2, 2, 0, Number.NaN)), 'spatiu');
  assert.equal(motivRetea(cerc(1)), 'numar');
  assert.equal(motivRetea(cerc(4, 0)), 'unghi');
  assert.equal(motivRetea(cerc(4, 400)), 'unghi');
  assert.equal(motivRetea(cerc(4, 360, true, { x: Number.POSITIVE_INFINITY, y: 0 })), 'centru');
  assert.equal(motivRetea(cerc(6, 90, false)), null);
});

/** Dreptunghiul e1 (100 × 60 din 20, 20) și cercul e2 (R15 în 70, 50), adăugate prin registru; e1 ales. */
function context(retea?: Retea, doarCitire = false): ContextDocument & { h: () => Istoric } {
  let h = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let s: readonly string[] = [];
  const baza: ContextDocument = { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; } };
  ruleaza(R, 'document.adauga-dreptunghi', baza);
  ruleaza(R, 'document.adauga-cerc', baza);
  s = ['e1'];
  return { ...baza, doarCitire: () => doarCitire, ...(retea ? { retea: () => retea } : {}), h: () => h };
}

test('acțiunea: 3 × 2 copii, piese independente, alese originalul și copiile, un singur pas; se redeschide', () => {
  const c = context(grila(3, 2));
  const trecut = c.h().trecut.length;
  assert.deepEqual(ruleaza(R, 'document.copiaza-in-retea', c), { ok: true });
  const doc = c.h().doc, foaie = doc.foi[0]!;
  assert.equal(foaie.instante.length, 2 + 5);
  const noi = foaie.instante.slice(2);
  assert.deepEqual(noi.map((i) => [i.x, i.y]), [[130, 20], [240, 20], [20, 90], [130, 90], [240, 90]]);
  assert.equal(new Set(noi.map((i) => i.piesa)).size, 5, 'fiecare copie cu piesa ei');
  assert.ok(noi.every((i) => i.piesa === i.id && doc.piese.some((p) => p.id === i.id)));
  assert.deepEqual(c.selectie(), ['e1', ...noi.map((i) => i.id)]);
  assert.equal(c.h().trecut.length, trecut + 1);
  assert.ok(incarca(JSON.parse(JSON.stringify(doc))).ok, 'ce scrie acțiunea se redeschide');
  ruleaza(R, 'istoric.anuleaza', c);
  assert.equal(c.h().doc.foi[0]!.instante.length, 2, 'un singur pas de anulare');
});

test('acțiunea pe cerc, cu rotire: copiile cercului e2 în jurul lui (150, 100), rotite', () => {
  const c = context(cerc(4));
  c.selecteaza(['e2']);
  assert.deepEqual(ruleaza(R, 'document.copiaza-in-retea', c), { ok: true });
  const noi = c.h().doc.foi[0]!.instante.slice(2);
  // Centrul cercului (70, 50) e originea instanței: (70, 50) → 90°: (200, 20); 180°: (230, 150); 270°: (100, 180).
  assert.deepEqual(noi.map((i) => [Math.round(i.x * 1e9) / 1e9, Math.round(i.y * 1e9) / 1e9, i.rotire]), [[200, 20, 90], [230, 150, 180], [100, 180, 270]]);
});

test('refuzurile: fără selecție, doar citire, valori greșite, plafonul, prea departe', () => {
  assert.deepEqual(stare(R, 'document.copiaza-in-retea', context()), { ok: false, motiv: 'motiv.nimic-ales' });
  const fara = context(grila(2, 1));
  fara.selecteaza([]);
  assert.deepEqual(stare(R, 'document.copiaza-in-retea', fara), { ok: false, motiv: 'motiv.nicio-selectie' });
  assert.deepEqual(stare(R, 'document.copiaza-in-retea', context(grila(2, 1), true)), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(R, 'document.copiaza-in-retea', context(grila(0, 1))), { ok: false, motiv: 'motiv.nimic-ales' });
  // Prea departe: e1 mutat aproape de plafonul translației (10 km); o copie la 10,1 m în dreapta ar trece de el.
  const departe = context(grila(2, 1, 10_000, 0));
  assert.deepEqual(ruleaza(R, 'document.pozitioneaza', { ...departe, pozitieNoua: () => ({ x: 9_990_000 }) }), { ok: true });
  assert.equal(motivCopiereRetea(departe.h().doc, ['e1'], grila(2, 1, 10_000, 0), false), 'motiv.prea-departe');
  assert.equal(motivCopiereRetea(departe.h().doc, ['e1'], grila(2, 1, 1_000, 0), false), null, 'una mai aproape încape');
  // Plafonul instanțelor: o rețea de 1000 de forme, de multe ori la rând, ajunge la el.
  const mult = context(grila(40, 25, 0, 0));
  let ultim: string | null = null;
  for (let k = 0; k < 40 && ultim === null; k++) {
    ultim = motivCopiereRetea(mult.h().doc, mult.selectie(), grila(40, 25, 0, 0), false);
    if (ultim === null) ruleaza(R, 'document.copiaza-in-retea', mult);
  }
  assert.equal(ultim, 'motiv.plafon');
});

test('formularul: textul cu virgulă, centrul gol înseamnă centrul foii, câmpul greșit dă motivul lui', () => {
  const foaie = { latime: 300, inaltime: 200 };
  assert.deepEqual(citesteRetea({ ...FORMULAR_RETEA, spatiuX: '2,5' }, foaie), { fel: 'grila', coloane: 3, randuri: 2, spatiuX: 2.5, spatiuY: 10 });
  assert.equal(citesteRetea({ ...FORMULAR_RETEA, coloane: 'trei' }, foaie), 'grila');
  assert.equal(citesteRetea({ ...FORMULAR_RETEA, spatiuY: '-1' }, foaie), 'spatiu');
  assert.deepEqual(citesteRetea({ ...FORMULAR_RETEA, fel: 'cerc' }, foaie), { fel: 'cerc', numar: 6, unghi: 360, roteste: true, centru: { x: 150, y: 100 } });
  assert.deepEqual(citesteRetea({ ...FORMULAR_RETEA, fel: 'cerc', centruX: '-20', centruY: '5,5', roteste: false }, foaie),
    { fel: 'cerc', numar: 6, unghi: 360, roteste: false, centru: { x: -20, y: 5.5 } });
  assert.equal(citesteRetea({ ...FORMULAR_RETEA, fel: 'cerc', centruX: 'x' }, foaie), 'centru');
  assert.equal(citesteRetea({ ...FORMULAR_RETEA, fel: 'cerc', unghi: '0' }, foaie), 'unghi');
});

