/**
 * Documentul v31 (felia 16.A↑e-1, ADR 0303 §1: freza toroidală, `{ tip: 'toroidala', raza }`; ușa: ADR 0024, 0070) judecat de
 * oracolul documentului (partea v31 de la capătul lui `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR). Ca `document.v30.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v31 valide trec neschimbate, cele v30 și mai vechi urcă doar cu numărul,
 *   un v30 cu o freză toroidală e refuzat de contractul v30, refuzurile au categoria și câmpul lor;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie, refuză ce e pe hârtie, cu motiv;
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 30.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, diferenta, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V31_O, usaCurentaO, verificaO, verificaPanaLaO,
  verificaPanaLaV30O, verificaPanaLaV31O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import { cuSchema, REFUZATE_V31, VALIDE_V30, VALIDE_V31, VECHI_NOI } from '../oracles/document.cazuri.ts';

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
const usaV31 = (d: unknown): string[] => verificaPanaLaV31O(d);
const esteNou = (nume: string): boolean => /^(R01|RT\d+) /.test(nume);
/** Un refuz „scris de o versiune mai nouă” al ușii v31 (R01, un v32) pe care o aplicație mai nouă l-ar primi. */
const primitDeApp = (s: unknown): boolean => typeof s === 'number' && Number.isInteger(s) && s > 31 && s <= (VERSIUNE_SCHEMA as number);

test('(o) versiunea: oracolul și aplicația sunt la v31; toroidala nu cere o ciocnire de câmp nou (o refuză contractul v30)', () => {
  assert.ok(SCHEMA_CURENTA_O >= 31);
  assert.ok((VERSIUNE_SCHEMA as number) >= 31);
  assert.equal(SCHEMA_V31_O, 31);
  assert.equal(CAMPURI_NOI_O[31], undefined);
});

test('(o) documentele v31 valide: contractul și ușa v31 le primesc neschimbate; ușa v30 le refuză (versiune mai nouă)', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V31) {
    const p = verificaVnO(doc, 31);
    if (p.length > 0) rele.push(`${nume}: contractul v31 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV31(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v31 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 31), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v31 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v30 = categoriiO(verificaPanaLaV30O(doc));
    if (JSON.stringify(v30) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v30 dă ${v30.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.equal(VALIDE_V31.length, VALIDE_V30.length + 7);
});

test('(o) documentele v30 valide și cele mai vechi urcă la v31 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V30) {
    assert.deepEqual(usaV31(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 31), cuSchema(doc, 31)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV31(doc), [], `un v${versiune} la ușa v31`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 31), cuSchema(doc, 31)), undefined, `un v${versiune} adus la v31: doar numărul`);
  }
});

test('(o) refuzurile v31: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V31) {
    const p = usaV31(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (!esteNou(r.nume) || r.camp === 'schema' || r.text !== undefined) continue;
    const loc = cuParanteze(r.camp).replace(/\.tip$/, '');
    if (!p.some((m) => m.includes(loc))) rele.push(`${r.nume}: niciun motiv nu numește ${loc} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
  assert.equal(REFUZATE_V31.filter((r) => /^RT\d+ /.test(r.nume)).length, 11);
});

test('(o) un v30 cu o freză toroidală (ADR 0303 §1): îl refuză chiar contractul v30, pe forma frezei', () => {
  const dupa = (prefix: string): Liber => REFUZATE_V31.find((r) => r.nume.startsWith(prefix))!.doc as Liber;
  assert.deepEqual(categoriiO(verificaVnO(dupa('RT0 '), 30)), ['scula']);
  assert.deepEqual(categoriiO(verificaVnO(dupa('RT7 '), 30)), ['fund-plat']);
  // Aceeași freză într-un v31 e primită: doar versiunea o face nevalidă.
  assert.deepEqual(verificaPanaLaO({ ...dupa('RT0 '), schema: 31 }, 31), []);
});

test('(a) ușa aplicației primește documentele v31 valide exact ca pe hârtie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V31) {
    const r = usa(doc);
    if (!r.ok) { rele.push(`${nume}: refuzat (${r.motiv})`); continue; }
    const d = diferenta(r.doc, laApp(doc));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare toroidală stricată, cu motiv: calea câmpului, sau versiunea v30', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V31.filter((x) => esteNou(x.nume) && !primitDeApp((x.doc as Liber)['schema']))) {
    const r = usa(c.doc);
    if (r.ok) { rele.push(`${c.nume}: primit (${c.motiv})`); continue; }
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      continue;
    }
    // Refuzurile pe un câmp numesc calea lui; cele ale migrării v30 (freza toroidală într-un v30), versiunea.
    const s = (c.doc as Liber)['schema'];
    const bun = s === 30 ? /v30/.test(r.motiv) : r.motiv.includes(c.camp.replace(/\.tip$/, ''));
    if (!bun) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 240)}” nu ${s === 30 ? 'spune v30' : `numește ${c.camp}`}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză și restul documentelor stricate ale versiunilor de dinainte (cu motiv)', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V31.filter((x) => !esteNou(x.nume))) {
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
    ...VALIDE_V31.map((c) => c.doc), ...REFUZATE_V31.map((c) => c.doc),
    { schema: 30, rev: 0 }, { schema: 31, rev: 0 }, { schema: 32, rev: 0 }, { schema: 30.5 }, { schema: '31' }, null, 'text',
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
  // Un v30 cu o freză toroidală e refuzat și de ușa întreagă, nu migrat pe tăcute, cu motivul migrării.
  for (const p of ['RT0 ', 'RT7 ']) {
    const c = REFUZATE_V31.find((r) => r.nume.startsWith(p));
    assert.ok(c, p);
    const r = usa(c.doc);
    assert.ok(!r.ok && /are o freză toroidală \(.+\), pe care v31 o aduce: nu e un document v30 valid/.test(String(r.motiv)), `${p}: ${r.ok ? 'primit' : String(r.motiv)}`);
  }
});
