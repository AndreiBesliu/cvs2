/**
 * Documentul v30 (felia 18.1↑d-1, ADR 0313: degroșarea reliefului, felul `degrosare` și câmpul lui; ușa: ADR 0024, 0070)
 * judecat de oracolul documentului (partea v30 de la capătul lui `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR). Ca `document.v29.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v30 valide trec neschimbate, cele v29 și mai vechi urcă doar cu numărul,
 *   un v29 cu felul sau cu câmpul `degrosare` e refuzat, refuzurile au categoria și câmpul lor;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie, refuză ce e pe hârtie, cu motiv;
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 29.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, diferenta, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V30_O, usaCurentaO, verificaO, verificaPanaLaO,
  verificaPanaLaV29O, verificaPanaLaV30O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import { cuSchema, REFUZATE_V30, VALIDE_V29, VALIDE_V30, VECHI_NOI } from '../oracles/document.cazuri.ts';

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
const usaV30 = (d: unknown): string[] => verificaPanaLaV30O(d);
const esteNou = (nume: string): boolean => /^(R01|RZ\d+) /.test(nume);
/** Un refuz „scris de o versiune mai nouă” al ușii v30 (R01, un v31) pe care o aplicație mai nouă l-ar primi. */
const primitDeApp = (s: unknown): boolean => typeof s === 'number' && Number.isInteger(s) && s > 30 && s <= (VERSIUNE_SCHEMA as number);

test('(o) versiunea: oracolul, aplicația și câmpul nou al operației (`degrosare`, ciocnirea migrării)', () => {
  assert.ok(SCHEMA_CURENTA_O >= 30);
  assert.ok((VERSIUNE_SCHEMA as number) >= 30);
  assert.equal(SCHEMA_V30_O, 30);
  assert.deepEqual(CAMPURI_NOI_O[30], ['degrosare']);
});

test('(o) documentele v30 valide: contractul și ușa v30 le primesc neschimbate; ușa v29 le refuză (versiune mai nouă)', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V30) {
    const p = verificaVnO(doc, 30);
    if (p.length > 0) rele.push(`${nume}: contractul v30 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV30(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v30 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 30), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v30 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v29 = categoriiO(verificaPanaLaV29O(doc));
    if (JSON.stringify(v29) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v29 dă ${v29.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.equal(VALIDE_V30.length, VALIDE_V29.length + 11);
});

test('(o) documentele v29 valide și cele mai vechi urcă la v30 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V29) {
    assert.deepEqual(usaV30(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 30), cuSchema(doc, 30)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV30(doc), [], `un v${versiune} la ușa v30`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 30), cuSchema(doc, 30)), undefined, `un v${versiune} adus la v30: doar numărul`);
  }
});

test('(o) refuzurile v30: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V30) {
    const p = usaV30(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (!esteNou(r.nume) || r.camp === 'schema' || r.text !== undefined) continue;
    const loc = cuParanteze(r.camp).replace(/\.tip$/, '');
    if (!p.some((m) => m.includes(loc))) rele.push(`${r.nume}: niciun motiv nu numește ${loc} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
  assert.equal(REFUZATE_V30.filter((r) => /^RZ\d+ /.test(r.nume)).length, 20);
});

test('(o) cele două forme ale ciocnirii v29 → v30 (ADR 0313 §3): felul îl refuză contractul v29, câmpul e ciocnirea', () => {
  const dupa = (prefix: string): Liber => REFUZATE_V30.find((r) => r.nume.startsWith(prefix))!.doc as Liber;
  assert.deepEqual(categoriiO(verificaVnO(dupa('RZ0 '), 29)), ['operatie']);
  // Câmpul `degrosare` e necunoscut (deci permis) la v29: contractul v29 îl primește, iar migrarea îl refuză.
  for (const p of ['RZ1 ', 'RZ19 ']) {
    assert.deepEqual(verificaVnO(dupa(p), 29), [], p);
    assert.deepEqual(categoriiO(verificaPanaLaO(dupa(p), 30)), ['ciocnire'], p);
    assert.deepEqual(verificaPanaLaO(dupa(p), 29), [], p);
  }
});

test('(a) ușa aplicației primește documentele v30 valide exact ca pe hârtie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V30) {
    const r = usa(doc);
    if (!r.ok) { rele.push(`${nume}: refuzat (${r.motiv})`); continue; }
    const d = diferenta(r.doc, laApp(doc));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare degroșare stricată, cu motiv: calea câmpului, sau degroșarea și relieful numite', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V30.filter((x) => esteNou(x.nume) && !primitDeApp((x.doc as Liber)['schema']))) {
    const r = usa(c.doc);
    if (r.ok) { rele.push(`${c.nume}: primit (${c.motiv})`); continue; }
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      continue;
    }
    // Refuzurile pe un câmp numesc calea lui; cele ale reliefului (o operație întreagă), relieful sau degroșarea; cele ale
    // migrării v29 (felul, câmpul), versiunea.
    const s = (c.doc as Liber)['schema'];
    const bun = s === 29
      ? /v29/.test(r.motiv)
      : c.categorie === 'relief' ? /relief|degroșare/.test(r.motiv) : r.motiv.includes(c.camp.replace(/\.tip$/, ''));
    if (!bun) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 240)}” nu ${s === 29 ? 'spune v29' : `numește ${c.camp}`}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză și restul documentelor stricate ale versiunilor de dinainte (cu motiv)', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V30.filter((x) => !esteNou(x.nume))) {
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
    ...VALIDE_V30.map((c) => c.doc), ...REFUZATE_V30.map((c) => c.doc),
    { schema: 29, rev: 0 }, { schema: 30, rev: 0 }, { schema: 31, rev: 0 }, { schema: 29.5 }, { schema: '30' }, null, 'text',
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
  // Un v29 cu felul sau cu câmpul `degrosare` e refuzat și de ușa întreagă, nu migrat pe tăcute.
  for (const p of ['RZ0 ', 'RZ1 ', 'RZ19 ']) {
    const c = REFUZATE_V30.find((r) => r.nume.startsWith(p));
    assert.ok(c, p);
    assert.equal(usa(c.doc).ok, false, p);
  }
});
