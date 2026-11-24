import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteSetariCote, optiuniLipireCote, SETARI_IMPLICITE, textSetariCote, type SetariCote } from '../../src/app/setariCote.ts';

/**
 * Setările cotelor (ADR 0330 §6), grupurile feliei a-2: implicitele din tabelul ADR-ului, citirea înapoi, fiecare câmp greșit
 * adus la implicitul lui (fără să le atingă pe celelalte), și opțiunile lipirii din setări și din taste (Alt, Ctrl).
 */

test('implicitele, din tabelul ADR 0330 §6', () => {
  assert.deepEqual(SETARI_IMPLICITE, {
    comportament: { legate: true, pornire: 'automata', dupa: 'ramane' },
    lipire: { felurile: { varf: true, mijloc: true, centru: true, cadran: true, cutie: true, foaie: true, grila: true }, toleranta: 8, contur: 'ctrl' },
    masurare: { distanta: true, delta: true, unghi: true, cursor: true, bara: true },
  });
  assert.deepEqual(citesteSetariCote(null), SETARI_IMPLICITE);
  assert.deepEqual(citesteSetariCote('nu e JSON'), SETARI_IMPLICITE);
  assert.deepEqual(citesteSetariCote('[1,2]'), SETARI_IMPLICITE);
});

test('citite înapoi exact, cu versiunea în text', () => {
  const s: SetariCote = {
    comportament: { legate: false, pornire: 'ultimul', dupa: 'selectie' },
    lipire: { felurile: { varf: true, mijloc: false, centru: true, cadran: false, cutie: true, foaie: false, grila: true }, toleranta: 12.5, contur: 'mereu' },
    masurare: { distanta: true, delta: false, unghi: true, cursor: false, bara: true },
  };
  const text = textSetariCote(s);
  assert.equal((JSON.parse(text) as { v: number }).v, 1);
  assert.deepEqual(citesteSetariCote(text), s);
});

test('un câmp greșit ia implicitul lui; celelalte rămân', () => {
  const r = citesteSetariCote(JSON.stringify({
    v: 1,
    comportament: { legate: 'da', pornire: 'altceva', dupa: 'selectie' },
    lipire: { felurile: { varf: false, mijloc: 1 }, toleranta: 3, contur: 'uneori' },
    masurare: { distanta: false, cursor: null },
  }));
  assert.deepEqual(r.comportament, { legate: true, pornire: 'automata', dupa: 'selectie' });
  assert.equal(r.lipire.felurile.varf, false);
  assert.equal(r.lipire.felurile.mijloc, true);
  assert.equal(r.lipire.toleranta, 8, 'sub 4 px: implicitul');
  assert.equal(citesteSetariCote(JSON.stringify({ lipire: { toleranta: 21 } })).lipire.toleranta, 8, 'peste 20 px');
  assert.equal(citesteSetariCote(JSON.stringify({ lipire: { toleranta: 20 } })).lipire.toleranta, 20, '20 e bun');
  assert.equal(r.lipire.contur, 'ctrl');
  assert.deepEqual(r.masurare, { distanta: false, delta: true, unghi: true, cursor: true, bara: true });
});

test('lipirea: butonul Lipire și Alt (inversează), Ctrl pentru conturul cel mai apropiat, toleranța în mm la scara pânzei', () => {
  const s = SETARI_IMPLICITE;
  const fara = { alt: false, ctrl: false };
  const o = optiuniLipireCote(s, fara, true, 10, 4);
  assert.ok(o);
  assert.equal(o.toleranta, 2, '8 px la 4 px/mm');
  assert.equal(o.grila, 10);
  assert.equal(o.peContur, false);
  assert.deepEqual([...o.felurile].sort(), ['cadran', 'centru', 'cutie', 'foaie', 'grila', 'mijloc', 'varf']);
  assert.equal(optiuniLipireCote(s, { alt: true, ctrl: false }, true, null, 4), null, 'Alt oprește lipirea pornită');
  assert.ok(optiuniLipireCote(s, { alt: true, ctrl: false }, false, null, 4), 'și o pornește pe cea oprită');
  assert.equal(optiuniLipireCote(s, fara, false, null, 4), null);
  assert.equal(optiuniLipireCote(s, { alt: false, ctrl: true }, true, null, 4)?.peContur, true, 'Ctrl: conturul');
  const mereu = { ...s, lipire: { ...s.lipire, contur: 'mereu' as const } };
  assert.equal(optiuniLipireCote(mereu, fara, true, null, 4)?.peContur, true);
  const niciodata = { ...s, lipire: { ...s.lipire, contur: 'niciodata' as const } };
  assert.equal(optiuniLipireCote(niciodata, { alt: false, ctrl: true }, true, null, 4)?.peContur, false);
  const faraMijloc = { ...s, lipire: { ...s.lipire, felurile: { ...s.lipire.felurile, mijloc: false } } };
  assert.ok(!optiuniLipireCote(faraMijloc, fara, true, null, 4)?.felurile.has('mijloc'));
});
