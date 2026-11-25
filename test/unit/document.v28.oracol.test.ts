/**
 * Documentul v28 (felia 18.1↑a, ADR 0310 §1, ADR 0311 §1: relieful, o formă nouă a elementului; ușa: ADR 0024, 0070) judecat
 * de oracolul documentului (partea v28 de la capătul lui `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR-uri). Ca `document.v27.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v28 valide trec neschimbate, cele v27 și mai vechi urcă doar cu numărul,
 *   un v27 cu relief e refuzat (forma necunoscută), refuzurile au categoria și câmpul lor;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie, refuză ce e pe hârtie, cu motiv;
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 27.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, diferenta, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V28_O, usaCurentaO, verificaO, verificaPanaLaO,
  verificaPanaLaV27O, verificaPanaLaV28O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import { cuSchema, REFUZATE_V28, VALIDE_V27, VALIDE_V28, VECHI_NOI } from '../oracles/document.cazuri.ts';

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
const usaV28 = (d: unknown): string[] => verificaPanaLaV28O(d);
const esteRelief = (nume: string): boolean => /^(R01|RX\d+) /.test(nume);
/** Un refuz „scris de o versiune mai nouă” al ușii v28 (R01, un v29) pe care o aplicație mai nouă l-ar primi. */
const primitDeApp = (s: unknown): boolean => typeof s === 'number' && Number.isInteger(s) && s > 28 && s <= (VERSIUNE_SCHEMA as number);

test('(o) versiunea: oracolul și aplicația sunt pe v28 sau mai nou; câmpurile noi (niciunul pe operație: relieful e o formă)', () => {
  assert.ok(SCHEMA_CURENTA_O >= 28);
  assert.ok((VERSIUNE_SCHEMA as number) >= 28);
  assert.equal(SCHEMA_V28_O, 28);
  assert.deepEqual(CAMPURI_NOI_O[28], []);
});

test('(o) documentele v28 valide: contractul și ușa v28 le primesc neschimbate; ușa v27 le refuză (versiune mai nouă)', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V28) {
    const p = verificaVnO(doc, 28);
    if (p.length > 0) rele.push(`${nume}: contractul v28 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV28(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v28 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 28), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v28 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v27 = categoriiO(verificaPanaLaV27O(doc));
    if (JSON.stringify(v27) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v27 dă ${v27.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.equal(VALIDE_V28.length, VALIDE_V27.length + 9);
});

test('(o) documentele v27 valide și cele mai vechi urcă la v28 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V27) {
    assert.deepEqual(usaV28(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 28), cuSchema(doc, 28)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV28(doc), [], `un v${versiune} la ușa v28`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 28), cuSchema(doc, 28)), undefined, `un v${versiune} adus la v28: doar numărul`);
  }
});

test('(o) refuzurile v28: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V28) {
    const p = usaV28(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (!esteRelief(r.nume) || r.camp === 'schema' || r.text !== undefined) continue;
    const loc = cuParanteze(r.camp).replace(/\.tip$/, '');
    if (!p.some((m) => m.includes(loc))) rele.push(`${r.nume}: niciun motiv nu numește ${loc} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
  assert.equal(REFUZATE_V28.filter((r) => /^RX\d+ /.test(r.nume)).length, 22);
});

test('(a) ușa aplicației primește documentele v28 valide exact ca pe hârtie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V28) {
    const r = usa(doc);
    if (!r.ok) { rele.push(`${nume}: refuzat (${r.motiv})`); continue; }
    const d = diferenta(r.doc, laApp(doc));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare relief stricat, cu motiv: calea formei, sau relieful numit', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V28.filter((x) => esteRelief(x.nume) && !primitDeApp((x.doc as Liber)['schema']))) {
    const r = usa(c.doc);
    if (r.ok) { rele.push(`${c.nume}: primit (${c.motiv})`); continue; }
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      continue;
    }
    const peForma = c.camp.startsWith('piese.0.radacina.copii.1.forma');
    const bun = peForma ? r.motiv.includes('piese.0.radacina.copii.1.forma') : /relief/.test(r.motiv);
    if (!bun) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu ${peForma ? 'numește forma' : 'spune relieful'}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză și restul documentelor stricate ale versiunilor de dinainte (cu motiv)', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V28.filter((x) => !esteRelief(x.nume))) {
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
    ...VALIDE_V28.map((c) => c.doc), ...REFUZATE_V28.map((c) => c.doc),
    { schema: 27, rev: 0 }, { schema: 28, rev: 0 }, { schema: 29, rev: 0 }, { schema: 27.5 }, { schema: '28' }, null, 'text',
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
  // Un v27 cu relief e refuzat și de ușa întreagă (forma necunoscută la v27), nu migrat.
  const v27 = REFUZATE_V28.find((r) => r.nume.startsWith('RX0 '));
  assert.ok(v27);
  assert.equal(usa(v27.doc).ok, false);
  assert.deepEqual(verificaPanaLaO(v27.doc, 28).length > 0, true);
});
