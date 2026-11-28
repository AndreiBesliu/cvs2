/**
 * Straturile reliefului, prin registru (ADR 0320, felia 18.1↑j): panoul trimite forma nouă a elementului-relief al singurei
 * instanțe alese prin `document.forma`, cu `nodEditat` (relieful din imagine e un element într-un grup). Fiecare schimbare e
 * un pas de anulare, iar anularea pune la loc forma veche întreagă, cu hărțile ei (amprentele: dalele rămân în browser).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { anuleaza, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { VERSIUNE_SCHEMA, type Document, type FormaRelief, type Matrice, type Nod } from '../../src/model/document.ts';
import { cuStrat, cuStratNou, mutaStrat, stergeStrat } from '../../src/model/straturiRelief.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';

const A = 'a'.repeat(64), B = 'b'.repeat(64), C = 'c'.repeat(64);
const I: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const RELIEF: FormaRelief = {
  tip: 'relief', nx: 200, ny: 100, celula: 0.2,
  straturi: [{ id: 's1', nume: 'fundul', mod: 'aduna', vizibil: true, dale: A }, { id: 's2', mod: 'inalt', vizibil: true, dale: B }],
};

function document(): Document {
  const r: Nod = { tip: 'element', id: 'r1', matrice: I, forma: RELIEF };
  return {
    schema: VERSIUNE_SCHEMA, rev: 1,
    piese: [{ id: 'p1', nume: 'medalion', operatii: [], radacina: { tip: 'grup', id: 'g', matrice: I, copii: [r] } }],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0 }] }],
  };
}

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
const reliefDin = (h: Istoric): FormaRelief => {
  const g = h.doc.piese[0]!.radacina;
  assert.ok(g.tip === 'grup');
  const r = g.copii[0];
  assert.ok(r?.tip === 'element' && r.forma.tip === 'relief');
  return r.forma;
};

test('ochiul, modul, ordinea, ștergerea și stratul nou trec prin document.forma, fiecare un pas, cu documentul trecut de ușă', () => {
  assert.ok(incarca(JSON.parse(JSON.stringify(document()))).ok);
  let h = istoricNou(document());
  const ctx = (f: FormaRelief | null): ContextDocument => ({
    istoric: () => h, scrie: (n) => { h = n; }, selectie: () => ['i1'], selecteaza: () => undefined,
    formaEditata: () => f!, nodEditat: () => 'r1',
  });
  const pasi: Array<[string, FormaRelief | null]> = [
    ['ochiul', cuStrat(RELIEF, 's2', { vizibil: false })],
    ['modul', cuStrat(RELIEF, 's1', { mod: 'scade' })],
    ['ordinea', mutaStrat(RELIEF, 's1', 'sus')],
    ['ștergerea', stergeStrat(RELIEF, 's2')],
    ['stratul nou', cuStratNou(RELIEF, { dale: C, nume: 'logo' })],
  ];
  for (const [nume, f] of pasi) {
    assert.ok(f, nume);
    const inainte = h;
    assert.deepEqual(ruleaza(R, 'document.forma', ctx(f)), { ok: true }, nume);
    assert.deepEqual(reliefDin(h), f, nume);
    assert.ok(incarca(JSON.parse(JSON.stringify(h.doc))).ok, `${nume}: ușa`);
    // Anularea pune la loc relieful de dinainte, cu hărțile lui, într-un singur pas.
    h = anuleaza(h);
    assert.deepEqual(reliefDin(h), reliefDin(inainte), `${nume}: anularea`);
  }
});

test('fără elementul relief (nodEditat greșit) sau cu două instanțe alese: refuzat; aceeași formă nu e un pas', () => {
  let h = istoricNou(document());
  const nou = cuStrat(RELIEF, 's1', { vizibil: false })!;
  const baza: ContextDocument = {
    istoric: () => h, scrie: (n) => { h = n; }, selectie: () => ['i1'], selecteaza: () => undefined, formaEditata: () => nou, nodEditat: () => 'r1',
  };
  assert.equal(stare(R, 'document.forma', { ...baza, nodEditat: () => 'nu-exista' }).ok, false);
  assert.equal(stare(R, 'document.forma', { ...baza, selectie: () => ['i1', 'i2'] }).ok, false);
  const inainte = h;
  ruleaza(R, 'document.forma', { ...baza, formaEditata: () => RELIEF });
  assert.equal(h, inainte, 'aceeași formă nu scrie nimic în jurnal');
});
