/**
 * Documentul v29 (felia 18.1↑c, ADR 0312: finisarea reliefului, felul `finisare` și câmpul lui, freza bilă; ușa: ADR 0024,
 * 0070) judecat de oracolul documentului (partea v29 de la capătul lui `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR). Ca `document.v28.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v29 valide trec neschimbate, cele v28 și mai vechi urcă doar cu numărul,
 *   un v28 cu felul, cu bila sau cu câmpul `finisare` e refuzat, refuzurile au categoria și câmpul lor;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie, refuză ce e pe hârtie, cu motiv;
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 28.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, diferenta, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V29_O, usaCurentaO, verificaO, verificaPanaLaO,
  verificaPanaLaV28O, verificaPanaLaV29O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import { cuSchema, REFUZATE_V29, VALIDE_V28, VALIDE_V29, VECHI_NOI } from '../oracles/document.cazuri.ts';

const cuParanteze = (cale: string): string => cale.replace(/\.(\d+)(?=\.|$)/g, '[$1]');

function copie(d: unknown): unknown {
  try {
    return structuredClone(d);
  } catch (e) {
    if (e instanceof RangeError) return d;
    throw e;
  }
}

function usa(brut: unknown): { readonly ok: true; readonly doc: unknown } | { readonly ok: false; readonly motiv: string } {
  const r = incarca(copie(brut));
  return r.ok ? { ok: true, doc: r.doc } : { ok: false, motiv: String(r.motiv) };
}

const laApp = (d: unknown): unknown => ridicaPanaLaO(d, VERSIUNE_SCHEMA as number);
const usaV29 = (d: unknown): string[] => verificaPanaLaV29O(d);
const esteNou = (nume: string): boolean => /^(R01|RY\d+) /.test(nume);

test('(o) versiunea: oracolul, aplicația și câmpul nou al operației (`finisare`, ciocnirea migrării)', () => {
  assert.equal(SCHEMA_CURENTA_O, 29);
  assert.equal(VERSIUNE_SCHEMA, 29);
  assert.equal(SCHEMA_V29_O, 29);
  assert.deepEqual(CAMPURI_NOI_O[29], ['finisare']);
});

test('(o) documentele v29 valide: contractul și ușa v29 le primesc neschimbate; ușa v28 le refuză (versiune mai nouă)', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V29) {
    const p = verificaVnO(doc, 29);
    if (p.length > 0) rele.push(`${nume}: contractul v29 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV29(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v29 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 29), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v29 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v28 = categoriiO(verificaPanaLaV28O(doc));
    if (JSON.stringify(v28) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v28 dă ${v28.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.equal(VALIDE_V29.length, VALIDE_V28.length + 12);
});

test('(o) documentele v28 valide și cele mai vechi urcă la v29 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V28) {
    assert.deepEqual(usaV29(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 29), cuSchema(doc, 29)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV29(doc), [], `un v${versiune} la ușa v29`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 29), cuSchema(doc, 29)), undefined, `un v${versiune} adus la v29: doar numărul`);
  }
});

test('(o) refuzurile v29: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V29) {
    const p = usaV29(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (!esteNou(r.nume) || r.camp === 'schema' || r.text !== undefined) continue;
    const loc = cuParanteze(r.camp).replace(/\.tip$/, '');
    if (!p.some((m) => m.includes(loc))) rele.push(`${r.nume}: niciun motiv nu numește ${loc} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
  assert.equal(REFUZATE_V29.filter((r) => /^RY\d+ /.test(r.nume)).length, 21);
});

test('(o) cele trei forme ale ciocnirii v28 → v29 (ADR 0312 §3): felul și bila le refuză contractul v28, câmpul e ciocnirea', () => {
  const dupa = (prefix: string): Liber => REFUZATE_V29.find((r) => r.nume.startsWith(prefix))!.doc as Liber;
  assert.deepEqual(categoriiO(verificaVnO(dupa('RY0 '), 28)), ['operatie']);
  assert.deepEqual(categoriiO(verificaVnO(dupa('RY1 '), 28)), ['scula']);
  // Câmpul `finisare` e necunoscut (deci permis) la v28: contractul v28 îl primește, iar migrarea îl refuză.
  assert.deepEqual(verificaVnO(dupa('RY2 '), 28), []);
  assert.deepEqual(categoriiO(verificaPanaLaO(dupa('RY2 '), 29)), ['ciocnire']);
  assert.deepEqual(verificaPanaLaO(dupa('RY2 '), 28), []);
});

test('(a) ușa aplicației primește documentele v29 valide exact ca pe hârtie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V29) {
    const r = usa(doc);
    if (!r.ok) { rele.push(`${nume}: refuzat (${r.motiv})`); continue; }
    const d = diferenta(r.doc, laApp(doc));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare finisare sau bilă stricată, cu motiv: calea câmpului, sau finisarea și relieful numite', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V29.filter((x) => esteNou(x.nume))) {
    const r = usa(c.doc);
    if (r.ok) { rele.push(`${c.nume}: primit (${c.motiv})`); continue; }
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      continue;
    }
    // Refuzurile pe un câmp numesc calea lui; cele ale reliefului (o operație întreagă), relieful sau finisarea; cele ale
    // migrării v28 (felul, bila, câmpul), versiunea.
    const s = (c.doc as Liber)['schema'];
    const bun = s === 28
      ? /v28/.test(r.motiv)
      : c.categorie === 'relief' ? /relief|finisare/.test(r.motiv) : r.motiv.includes(c.camp.replace(/\.tip$/, ''));
    if (!bun) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 240)}” nu ${s === 28 ? 'spune v28' : `numește ${c.camp}`}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză și restul documentelor stricate ale versiunilor de dinainte (cu motiv)', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V29.filter((x) => !esteNou(x.nume))) {
    const s = (c.doc as Liber | null)?.['schema'];
    if (c.categorie === 'schema' && typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= VERSIUNE_SCHEMA) continue;
    const r = usa(c.doc);
    if (r.ok) rele.push(`${c.nume}: primit (${c.motiv})`);
    else if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
  }
  assert.deepEqual(rele, []);
});

test('(u) ușa documentului curent: null pe o versiune întreagă de la 1 până sub a ei (migrările), altfel exact ce dă ușa întreagă', () => {
  const rele: string[] = [];
  const toate: unknown[] = [
    ...VALIDE_V29.map((c) => c.doc), ...REFUZATE_V29.map((c) => c.doc),
    { schema: 28, rev: 0 }, { schema: 29, rev: 0 }, { schema: 30, rev: 0 }, { schema: 28.5 }, { schema: '29' }, null, 'text',
  ];
  for (const [k, doc] of toate.entries()) {
    const curent = incarcaCurent(copie(doc));
    const e = `documentul ${k} (schema ${typeof doc === 'object' && doc !== null ? String((doc as Liber)['schema']) : JSON.stringify(doc)})`;
    if (usaCurentaO(doc) === 'migrari') {
      if (curent !== null) rele.push(`${e}: ușa curentă a răspuns (${curent.ok ? 'primit' : String(curent.motiv)}), nu null`);
    } else if (curent === null) {
      rele.push(`${e}: ușa curentă cere migrările`);
    } else {
      const intreaga = incarca(copie(doc));
      if (curent.ok !== intreaga.ok) rele.push(`${e}: ușa curentă ${curent.ok ? 'primește' : 'refuză'}, ușa întreagă nu`);
      else if (!curent.ok && !intreaga.ok && String(curent.motiv) !== String(intreaga.motiv)) rele.push(`${e}: alt motiv`);
      else if (curent.ok && intreaga.ok && diferenta(curent.doc, intreaga.doc) !== undefined) rele.push(`${e}: alt document`);
    }
  }
  assert.deepEqual(rele, []);
  // Un v28 cu felul, cu bila sau cu câmpul `finisare` e refuzat și de ușa întreagă, nu migrat pe tăcute.
  for (const p of ['RY0 ', 'RY1 ', 'RY2 ', 'RY20 ']) {
    const c = REFUZATE_V29.find((r) => r.nume.startsWith(p));
    assert.ok(c, p);
    assert.equal(usa(c.doc).ok, false, p);
  }
});
