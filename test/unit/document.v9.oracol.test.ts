/**
 * Documentul v9 (ADR 0034, forma „cale”; felia 2.7b, sesiune independentă) judecat de oracolul lui independent
 * (`test/oracles/document.ts`, cazurile în `test/oracles/document.v9.cazuri.ts`, scrise doar din ADR):
 * - „(o) …”: oracolul singur, pe hârtie: migrarea v8 → v9 (doar numărul), puritatea ei, otrăvurile căii (§1–§2, câte o
 *   categorie) și ale plafoanelor (50 000 pe cale, 200 000 în piese, 1 000 000 în lume), corpusul valid (și la
 *   plafoane), un v8 cu o cale (refuzat ca v8), regiunea (`regiuneDinDocument`) pe v9: primește calea și păstrează
 *   parametrii operațiilor (urechile, rampa, intrările, degajările; bugul din addendumul 2, unde un v9 trecea prin
 *   `ridicaO` ca document vechi);
 * - lipirea cu aplicația (`incarca`, `elementeFoaie`, `taieturiFoaie`): (a9) migrarea pe hârtie; (e9) fiecare otravă e
 *   refuzată cu motiv, fiecare document valid trece cu exact elementele și tăieturile oracolului; (g9) un v9 valid trece
 *   neschimbat, cu octeții canonici independenți de drum; (p9) documentele la plafoane trec, cele peste sunt refuzate;
 *   (h9) un v8 cu o cale e refuzat.
 * Plafoanele numărate după acțiuni (Ctrl+D) sunt în `document.v9.actiuni.oracol.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import {
  categoriiO, diferenta, migreazaV8V9O, ridicaO, taieturiV8O, verificaO, verificaPanaLaV8O, verificaV8, verificaV8V9, verificaV9,
  type DocV9O, type Liber,
} from '../oracles/document.ts';
import { CORPUS_V8, VALIDE_DIFICILE_V8, OTRAVURI_V8 } from '../oracles/document.cazuri.ts';
import {
  CORPUS_V9, MIGRARI_V8_HARTIE, OTRAVURI_CALE, OTRAVURI_PLAFOANE_CALE, OTRAVURI_V9, REFUZATE_V8, VALIDE_DIFICILE_V9, VALIDE_PLAFOANE_CALE,
  mareV9, varfuriDeCale,
} from '../oracles/document.v9.cazuri.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { accepta, aceeasiFoaie, DOAR_V9, mare, mareOperatii, text } from './ajutor-document-oracol.ts';

/** Formele `cale` ale unui document (toate piesele), cu vârfurile lor. */
function caiDin(d: unknown): Liber[] {
  const rez: Liber[] = [];
  const stiva: unknown[] = ((d as Liber)['piese'] as Liber[]).map((p) => p['radacina']);
  for (let x = stiva.pop(); x !== undefined; x = stiva.pop()) {
    const n = x as Liber;
    if (Array.isArray(n['copii'])) stiva.push(...(n['copii'] as unknown[]));
    const f = n['forma'] as Liber | undefined;
    if (f && f['tip'] === 'cale') rez.push(f);
  }
  return rez;
}

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────────────────────────────

for (const { nume, v8, v9 } of MIGRARI_V8_HARTIE) {
  test(`(o) oracolul migrează v8 → v9 exact ca pe hârtie (doar numărul): ${nume}`, () => {
    assert.deepEqual(verificaV8(v8), []);
    assert.deepEqual(verificaV8V9(v8), []);
    assert.deepEqual(verificaO(v8), []);
    assert.equal(diferenta(migreazaV8V9O(v8), v9), undefined);
    assert.equal(diferenta(ridicaO(v8), v9), undefined);
    assert.deepEqual(verificaV9(v9), []);
    assert.deepEqual(verificaO(v9), []);
    assert.deepEqual(verificaPanaLaV8O(v8), [], 'ușa unei aplicații pe 8');
    assert.deepEqual(categoriiO(verificaPanaLaV8O(v9)), ['schema'], 'ușa unei aplicații pe 8 refuză un v9 (scris de o versiune mai nouă)');
  });
}

test('(o) migrarea v8 → v9 e pură și deterministă; din v8 rămâne tot, în afară de schema', () => {
  let n = 0;
  for (const { nume, doc } of [...CORPUS_V8, ...VALIDE_DIFICILE_V8].filter((c) => !mare(c.doc) && !mareOperatii(c.doc))) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV8V9O(doc);
    assert.equal(JSON.stringify(doc), inainte, `${nume}: intrarea s-a schimbat`);
    assert.equal(diferenta(a, migreazaV8V9O(doc)), undefined);
    assert.equal(a.schema, 9);
    assert.equal(JSON.stringify({ ...a, schema: 8 }), inainte, `${nume}: altceva decât numărul (sau ordinea cheilor)`);
    assert.deepEqual(verificaV9(a), [], nume);
    n++;
  }
  assert.ok(n > 30, `${n} documente`);
});

test('(o) otrăvurile v9: fiecare raportează exact categoria ei (cele v8 aduse la v9, plus cele ale căii), iar ușa oracolului le refuză', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V9) {
    const c = categoriiO(verificaV9(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
    if (verificaO(o.doc).length === 0) rele.push(`${o.nume}: ușa oracolului (verificaO) o primește`);
  }
  assert.deepEqual(rele, []);
  // Toate otrăvurile v8 au trecut în v9 (inclusiv „schema mai nouă”, care devine 10), plus cele ale căii.
  assert.equal(OTRAVURI_V9.length, OTRAVURI_V8.length + OTRAVURI_CALE.length);
  assert.ok(OTRAVURI_CALE.length >= 30);
  const categorii = new Set(OTRAVURI_CALE.map((o) => o.categorie));
  for (const c of ['cale', 'schema', 'finit', 'margini', 'forma']) assert.ok(categorii.has(c as never), `nicio otravă [${c}] a căii`);
});

test('(o) otrăvurile plafoanelor, fiecare cu unu peste: 50 001 pe o cale, 200 001 în piese (și cu piese nepuse), 1 000 001 în lume, fiecare cu categoria ei', () => {
  for (const o of OTRAVURI_PLAFOANE_CALE) assert.deepEqual(categoriiO(verificaV9(o.doc)), [o.categorie], o.nume);
});

test('(o) un v8 cu o formă `cale` e refuzat ca v8 ([schema]): forma nu există acolo', () => {
  for (const r of REFUZATE_V8) {
    assert.deepEqual(categoriiO(verificaO(r.doc)), [r.motiv], r.nume);
    assert.deepEqual(categoriiO(verificaPanaLaV8O(r.doc)), [r.motiv], r.nume);
  }
});

test('(o) corpusul v9: valid; căi cu linii, arce și cubice, sub similitudini și (fără arce) sub matrici afine, cu câmpuri necunoscute pe formă, vârf, segment și punct', () => {
  let cai = 0, arce = 0, cubice = 0, linii = 0, pePunct = 0, peVarf = 0, peSegment = 0, peForma = 0;
  for (const { nume, doc } of [...CORPUS_V9, ...VALIDE_DIFICILE_V9]) {
    assert.deepEqual(verificaV9(doc), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    for (const f of caiDin(doc)) {
      cai++;
      if (Object.keys(f).some((k) => !['tip', 'inchis', 'varfuri'].includes(k))) peForma++;
      for (const v of f['varfuri'] as Liber[]) {
        if (Object.keys(v).some((k) => !['p', 's'].includes(k))) peVarf++;
        const s = v['s'] as Liber;
        if (Object.keys(v['p'] as Liber).some((k) => !['x', 'y'].includes(k))) pePunct++;
        if (s['tip'] === 'A') { arce++; if (Object.keys(s).length > 2) peSegment++; }
        else if (s['tip'] === 'C') { cubice++; if (Object.keys(s).length > 3) peSegment++; }
        else { linii++; if (Object.keys(s).length > 1) peSegment++; }
      }
    }
  }
  assert.ok(cai > 60 && arce > 30 && cubice > 60 && linii > 60 && pePunct >= 5 && peVarf >= 5 && peSegment >= 5 && peForma >= 5,
    JSON.stringify({ cai, arce, cubice, linii, pePunct, peVarf, peSegment, peForma }));
});

test('(o) documentele la plafoane sunt valide: exact 50 000 pe o cale, 200 000 în piese, 1 000 000 în lume', () => {
  for (const { nume, doc } of VALIDE_PLAFOANE_CALE) assert.deepEqual(verificaV9(doc), [], nume);
  assert.deepEqual(VALIDE_PLAFOANE_CALE.map((c) => varfuriDeCale(c.doc)), [50_000, 200_000, 50_000]);
});

test('(o) regiunea pe v9 (addendumul 2): primește căile și păstrează pe tăieturi urechile, rampa, intrările și degajările operațiilor', () => {
  let tăieturi = 0, cuParametri = 0, cai = 0;
  for (const { nume, doc } of [...CORPUS_V9, ...VALIDE_DIFICILE_V9.filter((c) => !mare(c.doc) && !mareOperatii(c.doc) && !mareV9(c.doc))]) {
    const reg = regiuneDinDocument(doc);
    const asteptat = new Map<string, Array<{ latura: string; u: unknown; r: unknown; i: unknown; c: unknown }>>();
    for (const t of taieturiV8O(doc, 0)) {
      const l = asteptat.get(t.idLume) ?? [];
      l.push({ latura: t.latura, u: t.urechi, r: t.rampa, i: t.intrari, c: t.colturi });
      asteptat.set(t.idLume, l);
    }
    for (const [id, lista] of asteptat) {
      const t = reg.taieturi.get(id);
      assert.ok(t, `${nume}: ${id} lipsește din regiune`);
      if (t.tip === 'cale') cai++;
      for (const latura of new Set(lista.map((x) => x.latura))) {
        const ale = lista.filter((x) => x.latura === latura);
        const L = latura as 'exterior' | 'interior' | 'pe-linie';
        assert.equal(diferenta(t.urechi?.get(L), ale.map((x) => x.u)), undefined, `${nume}: ${id} ${latura} urechi`);
        assert.equal(diferenta(t.rampe?.get(L), ale.map((x) => x.r)), undefined, `${nume}: ${id} ${latura} rampa`);
        assert.equal(diferenta(t.intrari?.get(L), ale.map((x) => x.i)), undefined, `${nume}: ${id} ${latura} intrari`);
        assert.equal(diferenta(t.colturi?.get(L), ale.map((x) => x.c)), undefined, `${nume}: ${id} ${latura} colturi`);
        tăieturi += ale.length;
        cuParametri += ale.filter((x) => x.u !== null || x.r !== null || x.i !== null || x.c !== null).length;
      }
    }
  }
  assert.ok(tăieturi > 200 && cuParametri > 50 && cai > 20, JSON.stringify({ tăieturi, cuParametri, cai }));
});

// ── Lipirea cu aplicația ─────────────────────────────────────────────────────────────────────────────────────────────

for (const { nume, v8, v9 } of MIGRARI_V8_HARTIE) {
  test(`(a9) migrarea v8 → v9 pe hârtie: ${nume}`, { skip: DOAR_V9 }, () => {
    assert.equal(diferenta(accepta(structuredClone(v8)), v9), undefined);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(v9))), jsonCanonic(accepta(structuredClone(v8))), 'v9 de pe hârtie încărcat direct');
  });
}

for (const o of OTRAVURI_V9) {
  test(`(e9) otrava v9 [${o.categorie}] e refuzată: ${o.nume}`, { skip: DOAR_V9 }, () => {
    // Fără copie: unele otrăvuri sunt prea adânci pentru `structuredClone` (ușa nu le schimbă).
    const r = incarca(o.doc);
    if (r.ok) assert.fail('aplicația a primit otrava');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const o of OTRAVURI_PLAFOANE_CALE) {
  test(`(p9) peste plafon [${o.categorie}], refuzat: ${o.nume}`, { skip: DOAR_V9 }, () => {
    const r = incarca(o.doc);
    if (r.ok) assert.fail('aplicația a primit un document peste plafon');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const { nume, doc } of VALIDE_PLAFOANE_CALE) {
  test(`(p9) la plafon, primit neschimbat: ${nume}`, { skip: DOAR_V9 }, () => {
    const d = accepta(doc);
    assert.equal(varfuriDeCale(d), varfuriDeCale(doc));
    assert.equal(diferenta(d, doc), undefined);
  });
}

for (const v of [...VALIDE_DIFICILE_V9, ...CORPUS_V9]) {
  test(`(e9) v9 valid, deși seamănă cu o otravă: ${v.nume}`, { skip: DOAR_V9 }, () => {
    assert.deepEqual(verificaV9(v.doc), [], 'oracolul');
    aceeasiFoaie(accepta(structuredClone(v.doc)), v.doc);
  });
}

for (const { nume, doc } of [...VALIDE_DIFICILE_V9, ...CORPUS_V9].filter((c) => !mare(c.doc) && !mareOperatii(c.doc) && !mareV9(c.doc))) {
  test(`(g9) un v9 valid trece prin ușă neschimbat; octeții canonici nu depind de drum: ${nume}`, { skip: DOAR_V9 }, () => {
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, doc), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

/**
 * Un v8 care conține o cale nu e un v8 valid (forma nu există acolo), iar oracolul îl refuză (ALEGERE: contractul
 * versiunii întâi, ca în tot lanțul). ADR 0034 §3 tace însă despre ce face ușa v9 cu el: migrat (doar numărul), e un v9
 * valid. Se primește oricare: refuzul cu motiv, sau primirea ca v9-ul migrării (nimic schimbat în afară de număr); ce
 * face aplicația se raportează.
 */
for (const r of REFUZATE_V8) {
  test(`(h9) un v8 cu o cale (ADR 0034 tace): refuzat cu motiv, sau primit exact ca migrarea v8 → v9: ${r.nume}`, { skip: DOAR_V9 }, () => {
    const rez = incarca(structuredClone(r.doc));
    if (!rez.ok) {
      assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
      console.log(`(h9) ${r.nume}: aplicația îl refuză (${String(rez.motiv)})`);
      return;
    }
    assert.equal(diferenta(rez.doc, { ...(r.doc as Liber), schema: 9 }), undefined, 'primit, dar nu ca migrarea v8 → v9 (doar numărul)');
    console.log(`(h9) ${r.nume}: aplicația îl primește ca v9-ul migrării (oracolul îl refuză; ADR 0034 tace)`);
  });
}

test('(f9) un document v9 cu o cale, rescris ca schema 10, e refuzat (scris de o versiune mai nouă)', { skip: DOAR_V9 }, () => {
  const d = { ...structuredClone(VALIDE_DIFICILE_V9.find((c) => caiDin(c.doc).length > 0)!.doc), schema: 10 } as unknown as DocV9O;
  assert.deepEqual(categoriiO(verificaO(d)), ['schema']);
  assert.equal(incarca(d).ok, false);
});
