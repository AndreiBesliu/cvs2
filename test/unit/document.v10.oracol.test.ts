/**
 * Documentul v10 (ADR 0037 §2 și §8, contururile deschise; felia 2.3c-2, sesiune independentă) judecat de oracolul lui
 * independent (`test/oracles/document.v10.ts`, contractul ușii în `document.ts`, cazurile în
 * `test/oracles/document.v10.cazuri.ts`, scrise doar din ADR):
 * - „(o) …”: oracolul singur, pe hârtie: migrarea v9 → v10 (doar numărul), puritatea ei, corpusul valid (și la plafon),
 *   otrăvurile (câte o categorie), arcele judecate doar pe cele n − 1 segmente reale, documentele marcate v9 cu conținut
 *   v10 (refuzate) și cu `despartire` în afara operației (primite), ușa v9 care refuză un v10, lanțul ușii de la v1, și
 *   tăieturile foii în ordinea de la §8 (pe un v9 migrat: exact ordinea ADR 0025; pe hârtie: clasele, instanțele,
 *   operațiile, nodurile);
 * - lipirea cu aplicația (`incarca`, `taieturiFoaie`), doar când aplicația e pe schema 10 (altfel sărită, cu motivul):
 *   (a10) un v10 valid trece neschimbat; (e10) fiecare otravă e refuzată cu motiv; (h10) un v9 cu conținut v10 e refuzat;
 *   (m10) un v9 valid iese exact cu numărul schimbat; (t10) tăieturile aplicației sunt în ordinea de la §8.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import {
  categoriiO, diferenta, migreazaV10V11O, ridicaO, SCHEMA_CURENTA_O, taieturiV8O, verificaO, verificaPanaLaV9O, verificaV10, verificaV9, type DocV8O, type DocV9O,
  type Liber, migreazaV10V12O, migreazaV11V12O, migreazaV10V13O, migreazaV12V13O,
} from '../oracles/document.ts';
import { migreazaV9V10O, ridicaV10O, taieturiV10O, verificaO10, verificaV9V10, type DocV10O } from '../oracles/document.v10.ts';
import {
  DOC_ORDINE, MIGRARI_V9_HARTIE, ORDINE_HARTIE, OTRAVURI_V10, PRIMITE_V9, REFUZATE_V9, VALIDE_PLAFON_V10, VALIDE_V10,
} from '../oracles/document.v10.cazuri.ts';
import { CORPUS_V9, VALIDE_DIFICILE_V9, mareV9 } from '../oracles/document.v9.cazuri.ts';
import { CORPUS_V8, VALIDE_DIFICILE_V8 } from '../oracles/document.cazuri.ts';
import { mare, mareOperatii, PE_V11, PE_V12, PE_V13 } from './ajutor-document-oracol.ts';

const SCHEMA_APP = VERSIUNE_SCHEMA as number;
const DOAR_V10 = SCHEMA_APP >= 10 ? false : `aplicația e încă pe schema ${SCHEMA_APP}; documentul v10 (ADR 0037 §2) vine cu felia 2.3c-2`;

const v9Mici = (): Array<{ readonly nume: string; readonly doc: DocV9O }> =>
  [...CORPUS_V9, ...VALIDE_DIFICILE_V9].filter((c) => !mare(c.doc) && !mareOperatii(c.doc) && !mareV9(c.doc));

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────────────────────────────

for (const { nume, v9, v10 } of MIGRARI_V9_HARTIE) {
  test(`(o) oracolul migrează v9 → v10 exact ca pe hârtie (doar numărul): ${nume}`, () => {
    assert.deepEqual(verificaV9(v9), []);
    assert.deepEqual(verificaV9V10(v9), []);
    assert.deepEqual(verificaO10(v9), []);
    assert.equal(diferenta(migreazaV9V10O(v9 as DocV9O), v10), undefined);
    assert.equal(diferenta(ridicaV10O(v9 as DocV9O), v10), undefined);
    assert.deepEqual(verificaV10(v10), []);
    assert.deepEqual(categoriiO(verificaPanaLaV9O(v10)), ['schema'], 'ușa v9 refuză un v10 (scris de o versiune mai nouă)');
    assert.deepEqual(verificaO(v10), [], 'ușa curentă a oracolului e v10');
  });
}

test('(o) migrarea v9 → v10 e pură și deterministă; din v9 rămâne tot, în afară de schema; un v9 e un v10 valid', () => {
  let n = 0;
  for (const { nume, doc } of v9Mici()) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV9V10O(doc);
    assert.equal(JSON.stringify(doc), inainte, `${nume}: intrarea s-a schimbat`);
    assert.equal(diferenta(a, migreazaV9V10O(doc)), undefined);
    assert.equal(a.schema, 10);
    assert.equal(JSON.stringify({ ...a, schema: 9 }), inainte, `${nume}: altceva decât numărul (sau ordinea cheilor)`);
    assert.deepEqual(verificaV10(a), [], nume);
    assert.deepEqual(verificaO10(doc), [], nume);
    n++;
  }
  assert.ok(n > 30, `${n} documente`);
});

test('(o) corpusul v10: valid (căi deschise cu L, A și C, câmpuri necunoscute, stanga / dreapta, despartire, ce nu judecă ușa); ușa v9 îl refuză', () => {
  for (const { nume, doc } of [...VALIDE_V10, ...VALIDE_PLAFON_V10]) {
    assert.deepEqual(verificaV10(doc), [], nume);
    assert.deepEqual(verificaO10(doc), [], nume);
    assert.deepEqual(categoriiO(verificaPanaLaV9O(doc)), ['schema'], `${nume}: ușa v9`);
    assert.deepEqual(verificaO(doc), [], `${nume}: ușa curentă`);
  }
  assert.ok(VALIDE_V10.length >= 19);
});

test('(o) otrăvurile v10: fiecare raportează exact categoria ei, iar ușa v10 le refuză', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V10) {
    const c = categoriiO(verificaV10(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
    if (verificaO10(o.doc).length === 0) rele.push(`${o.nume}: ușa v10 o primește`);
  }
  assert.deepEqual(rele, []);
  const categorii = new Set(OTRAVURI_V10.map((o) => o.categorie));
  for (const c of ['cale', 'operatie', 'despartire', 'plafon', 'finit', 'schema', 'forma']) assert.ok(categorii.has(c as never), `nicio otravă [${c}]`);
});

test('(o) §2: arcele se judecă doar pe cele n − 1 segmente reale; pe ultimul vârf, doar regula „L”, o singură problemă', () => {
  for (const nume of ['X23', 'X24', 'X05']) {
    const o = OTRAVURI_V10.find((x) => x.nume.startsWith(nume))!;
    const p = verificaV10(o.doc);
    assert.equal(p.length, 1, `${o.nume}: ${p.join(' | ')}`);
    assert.match(p[0]!, /^\[cale\] .*segmentul ultimului vârf al unei căi deschise trebuie să fie L$/);
  }
  // Citită închisă (v9), aceeași formă X23 ar fi refuzată și pentru arcul spre vârful 0 (raza peste plafon).
  const x23 = structuredClone(OTRAVURI_V10.find((x) => x.nume.startsWith('X23'))!.doc) as Liber;
  const forma = ((x23['piese'] as Liber[])[0]!['radacina'] as Liber)['forma'] as Liber;
  forma['inchis'] = true;
  assert.ok(categoriiO(verificaV10(x23)).includes('plafon'), 'citită închisă, coarda e un arc real');
});

test('(o) un document marcat v9 cu conținut v10 e refuzat („nu e un document v9 valid”), cu categoria lui', () => {
  for (const r of REFUZATE_V9) {
    assert.deepEqual(categoriiO(verificaO10(r.doc)), [r.categorie], r.nume);
    assert.ok(verificaV9V10(r.doc).length > 0, r.nume);
  }
});

test('(o) `despartire` în afara operației, într-un v9, e un câmp necunoscut oarecare: primit și păstrat de migrare', () => {
  for (const { nume, doc } of PRIMITE_V9) {
    assert.deepEqual(verificaO10(doc), [], nume);
    const a = ridicaV10O(doc as unknown as DocV9O);
    assert.equal(JSON.stringify({ ...a, schema: 9 }), JSON.stringify(doc), nume);
  }
});

// Felia 5.1↑ (ADR 0069): oracolul e pe v11; pe un v9 (fără `pasLateral` pe operații), ușa curentă dă tot ce dă pasul v9 → v10.
test('(o) oracolul e pe v13: SCHEMA_CURENTA_O = 13, `ridicaO` dă v13 (lanțul până la 9, apoi doar numărul), iar ușa curentă pe un v9 dă exact ce dă pasul întreg v9 → v10 (contractul v10 îl cuprinde pe cel v9)', () => {
  assert.equal(SCHEMA_CURENTA_O, 13);
  let n = 0;
  for (const { nume, doc } of [...v9Mici(), ...REFUZATE_V9.map((r) => ({ nume: r.nume, doc: r.doc as DocV9O })), ...PRIMITE_V9.map((c) => ({ nume: c.nume, doc: c.doc as unknown as DocV9O }))]) {
    assert.deepEqual(verificaO(doc), verificaV9V10(doc), nume);
    if (verificaO(doc).length === 0) {
      assert.equal(diferenta(ridicaO(doc), migreazaV12V13O(migreazaV11V12O(migreazaV10V11O(migreazaV9V10O(doc))))), undefined, nume);
      n++;
    }
  }
  assert.ok(n > 30, `${n}`);
});

test('(o) ușa v10 de la versiunile vechi: un v8 valid trece (prin v9); un v8 cu `despartire` pe o operație se ciocnește la v9 → v10', () => {
  let n = 0;
  for (const { nume, doc } of [...CORPUS_V8, ...VALIDE_DIFICILE_V8].filter((c) => !mare(c.doc) && !mareOperatii(c.doc))) {
    assert.deepEqual(verificaO10(doc), verificaPanaLaV9O(doc), nume);
    n++;
  }
  assert.ok(n > 20);
  const v8 = structuredClone(CORPUS_V8[0]!.doc) as DocV8O;
  const op = v8.piese.find((p) => p.operatii.length > 0)!.operatii[0]! as Liber;
  op['despartire'] = true;
  assert.deepEqual(verificaPanaLaV9O(v8), [], 'pe v9, câmpul e necunoscut');
  assert.deepEqual(categoriiO(verificaO10(v8)), ['ciocnire']);
  assert.deepEqual(categoriiO(verificaO10({ ...structuredClone(VALIDE_V10[0]!.doc), schema: 11 })), ['schema']);
});

test('(o) §8 pe un v9 migrat: tăieturile v10 sunt exact cele v8, în aceeași ordine, cu clasa laturii, nemarcate și închise', () => {
  let n = 0;
  for (const { nume, doc } of v9Mici()) {
    const d10 = migreazaV9V10O(doc);
    for (let f = 0; f < doc.foi.length; f++) {
      const v8 = taieturiV8O(doc, f), v10 = taieturiV10O(d10, f);
      assert.equal(v10.length, v8.length, nume);
      v10.forEach((t, k) => {
        const { despartire, deschisa, operatieDeschisa, clasa, ...rest } = t;
        assert.equal(diferenta(rest, v8[k]), undefined, `${nume}, foaia ${f}, tăietura ${k}`);
        assert.equal(clasa, t.latura === 'interior' ? 0 : t.latura === 'pe-linie' ? 1 : 2);
        assert.ok(!despartire && !deschisa && !operatieDeschisa);
        n++;
      });
    }
  }
  assert.ok(n > 200, `${n}`);
});

test('(o) §8 pe hârtie: clasele (0 interioarele, 1 pe linie și deschisele nemarcate, 2 exterioarele, 3 despărțirile), apoi instanța, operația, nodul', () => {
  assert.deepEqual(verificaV10(DOC_ORDINE), []);
  assert.deepEqual(taieturiV10O(DOC_ORDINE).map((t) => [t.idLume, t.latura, t.operatie, t.clasa]), ORDINE_HARTIE.map((x) => [...x]));
});

// ── Lipirea cu aplicația ─────────────────────────────────────────────────────────────────────────────────────────────

for (const { nume, doc } of [...VALIDE_V10, ...VALIDE_PLAFON_V10]) {
  test(`(a10) un v10 valid trece prin ușa aplicației neschimbat${PE_V11 ? ' (pe 11, doar cu numărul)' : ''}: ${nume}`, { skip: DOAR_V10 }, () => {
    const r = incarca(structuredClone(doc));
    if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
    // Felia 5.1↑ (ADR 0069 §2): pe 11, ușa îl duce la v11, doar cu numărul.
    assert.equal(diferenta(r.doc, PE_V13 ? migreazaV10V13O(doc) : PE_V12 ? migreazaV10V12O(doc) : PE_V11 ? migreazaV10V11O(doc) : doc), undefined);
  });
}

for (const o of OTRAVURI_V10) {
  test(`(e10) otrava v10 [${o.categorie}] e refuzată cu motiv: ${o.nume}`, { skip: DOAR_V10 }, () => {
    const r = incarca(o.doc);
    if (r.ok) return assert.fail('aplicația a primit otrava');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const x of REFUZATE_V9) {
  test(`(h10) un document marcat v9 cu conținut v10 e refuzat: ${x.nume}`, { skip: DOAR_V10 }, () => {
    const r = incarca(structuredClone(x.doc));
    if (r.ok) return assert.fail('aplicația l-a primit (și l-ar migra, schimbându-i sensul)');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

test('(m10) un v9 valid iese din ușa aplicației exact cu numărul schimbat (pe hârtie și pe corpus)', { skip: DOAR_V10 }, () => {
  for (const { nume, v9, v10 } of MIGRARI_V9_HARTIE) {
    const r = incarca(structuredClone(v9));
    if (!r.ok) return assert.fail(`${nume}: ${String(r.motiv)}`);
    assert.equal(diferenta(r.doc, PE_V13 ? migreazaV10V13O(v10 as DocV10O) : PE_V12 ? migreazaV10V12O(v10 as DocV10O) : PE_V11 ? migreazaV10V11O(v10 as DocV10O) : v10), undefined, nume);
  }
  for (const { nume, doc } of [...v9Mici().slice(0, 20), ...PRIMITE_V9.map((c) => ({ nume: c.nume, doc: c.doc as unknown as DocV9O }))]) {
    const r = incarca(structuredClone(doc));
    if (!r.ok) return assert.fail(`${nume}: ${String(r.motiv)}`);
    assert.equal(diferenta(r.doc, PE_V13 ? migreazaV12V13O(migreazaV11V12O(migreazaV10V11O(migreazaV9V10O(doc)))) : PE_V12 ? migreazaV11V12O(migreazaV10V11O(migreazaV9V10O(doc))) : PE_V11 ? migreazaV10V11O(migreazaV9V10O(doc)) : migreazaV9V10O(doc)), undefined, nume);
  }
});

test('(t10) tăieturile aplicației pe o foaie v10 sunt în ordinea de la §8 (clasa, instanța, operația, nodul)', { skip: DOAR_V10 }, () => {
  const r = incarca(structuredClone(DOC_ORDINE));
  if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
  const app = (taieturiFoaie(r.doc, 0) as unknown as ReadonlyArray<{ idLume: string; latura: string; operatie: string }>).map((t) => [t.idLume, t.latura, t.operatie]);
  assert.deepEqual(app, ORDINE_HARTIE.map(([id, l, op]) => [id, l, op]));
});

