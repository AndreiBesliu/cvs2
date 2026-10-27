/**
 * Documentul v6 (ADR 0024 + ADR 0025 + ADR 0027 + ADR 0028 + ADR 0029) judecat de oracolul lui independent
 * (`test/oracles/document.ts`, scris doar din contracte). Două feluri de teste:
 * - „(o) …”: oracolul singur, pe hârtie (fără aplicație): migrările scrise de mână (până la v4 și v4 → v5), tăieturile
 *   scrise de mână, otrăvurile cu categoria lor (și ale urechilor), corpusurile valide, puritatea migrărilor, ciocnirile.
 *   Prind o greșeală a oracolului însuși;
 * - lipirea cu aplicația (`incarca`, `elementeFoaie`, `taieturiFoaie`), adusă la schema aplicației: pe 4 (înainte de
 *   felia 2.4), ușa trebuie să dea v4-ul cerut de ADR 0027; pe 5, v5-ul cerut de ADR 0028 (urechi: null pe fiecare
 *   operație; o operație veche care are deja un câmp `urechi` e refuzată, ca ciocnire). Testele doar-v5 („(a5)”, „(e5)”,
 *   „(g5)”, „(h5)”) se sar cât aplicația e pe 4, cu motivul spus:
 *   - (a) fiecare document v1, v2 și v3 al corpusurilor se migrează în exact documentul cerut de contracte (lanțul), cu
 *     aceeași geometrie; `elementeFoaie` și `taieturiFoaie` dau exact elementele și tăieturile oracolului;
 *   - (b) câmpurile necunoscute trec prin migrare, la locul lor; din v2 rămâne tot, în afară de `schema` și `operatii`;
 *     din v3 tot, în afară de `schema` și de câmpurile noi de pe operații (`sens`; pe 5 și `urechi`);
 *   - (c) migrarea și încărcarea sunt idempotente la octet (`jsonCanonic`);
 *   - (d) cazurile de pe hârtie: punctele ajung exact unde au fost calculate de mână, în ordinea de acolo;
 *   - (t) tăieturile de pe hârtie: lista scrisă de mână, câmp cu câmp (și sensul / urechile, dacă aplicația le pune pe
 *     tăietură), pentru aplicație și pentru oracol;
 *   - (e) otrăvurile (v2, v3, v4; pe 5 și v5, cu ale urechilor) sunt refuzate la ușă, iar documentele valide dificile și
 *     corpusurile trec, cu aceleași elemente și tăieturi ca oracolul;
 *   - (f) o schemă mai nouă decât a aplicației e refuzată;
 *   - (g) un document valid al schemei aplicației trece neschimbat prin ușă, iar octeții lui canonici nu depind de drumul
 *     pe care a venit (precizarea 10); pe 5, un v4 valid devine exact v5-ul migrării;
 *   - (h) documentele vechi de nemigrat (v1: margini, formă, ciocniri, adâncime, schema 1; v2: o piesă care are deja
 *     `operatii`; v3: o operație care are deja `sens`; pe 5 și v4 / v3: o operație care are deja `urechi`) sunt
 *     refuzate, cu motiv.
 * Numerele se compară cu `===` (−0 = 0), nu cu `deepStrictEqual`, care le deosebește. `idLume` nu e unic între
 * tăieturi (un element în două operații dă două), deci tăieturile se compară pe poziție, nu după id.
 *
 * ALEGERE (ADR 0027 și 0028 tac): tăietura aplicației (`taieturiFoaie`) poate avea exact cele 11 câmpuri din 2.2, sau
 * acestea plus `sens`, sau plus `sens` și `urechi`; dacă le are, trebuie să fie ale operației ei. Sensul și urechile
 * programului le judecă invariantele 9 și 10.
 *
 * Felia 2.5a (ADR 0029, sesiune independentă): oracolul e pe v6 (`rampa` pe fiecare operație). Lipirea merge pe
 * schema aplicației, 4, 5 sau 6: pe 6, ușa trebuie să dea v6-ul migrării (`rampa: null`; o operație veche cu un câmp
 * `rampa` e refuzată, ca ciocnire), iar testele doar-v6 („(a6)”, „(e6)”, „(g6)”, „(h6)”) se sar pe 4 și 5. Tăietura
 * aplicației poate purta și `rampa` (ALEGERE, ca la urechi): dacă o are, e a operației ei.
 *
 * Felia 2.5b (ADR 0030, sesiune independentă): oracolul e pe v7 (`intrari` pe fiecare operație; `ridicaO` dă v7,
 * `ridicaV6O` păstrează lanțul vechi până la 6). Pe 7, ușa trebuie să dea v7-ul migrării (`intrari: null`; o operație
 * veche cu un câmp `intrari` e refuzată, ca ciocnire: capcanele W10 din v3 și MV5-01 din v5 / v6 sunt acum ciocniri);
 * testele doar-v7 („(a7)”, „(e7)”, „(g7)”, „(h7)”) se sar doar sub 7, iar testul „VERSIUNE_SCHEMA e 7” nu se sare
 * (o aplicație rămasă în urmă îl înroșește, nu-l ascunde). Tăietura aplicației poate purta și `intrari` (ALEGERE, ca la
 * rampă): dacă o are, e a operației ei.
 *
 * Felia 2.6 (ADR 0032, sesiune independentă): oracolul e pe v8 (`colturi` pe fiecare operație; `ridicaO` dă v8,
 * `ridicaV7O` păstrează lanțul vechi până la 7). Pe 8, ușa trebuie să dea v8-ul migrării (`colturi: null`; o operație
 * veche cu un câmp `colturi` e refuzată, ca ciocnire); testele doar-v8 („(a8)”, „(e8)”, „(g8)”, „(h8)”) rulează pe ≥ 8
 * și se sar doar sub 8, iar testul „VERSIUNE_SCHEMA e 8” nu se sare (o aplicație rămasă în urmă îl înroșește). Testele
 * v7 rulează și pe 8: un v7 valid trece prin ușă ca v8-ul migrării. Tăietura aplicației poate purta și `colturi`
 * (ALEGERE, ca la intrări): dacă o are, e a operației ei.
 *
 * Felia 2.7b (ADR 0034, sesiune independentă): oracolul e pe v9 (forma `cale`; migrarea v8 → v9 schimbă doar numărul,
 * deci fiecare test de mai sus primește pe 9 documentul migrării cu `schema: 9`); testele v9 sunt în
 * `document.v9.oracol.test.ts` și `document.v9.actiuni.oracol.test.ts`, iar „VERSIUNE_SCHEMA e 9” nu se sare. Ca fiecare
 * fișier să ruleze în ~20 s, cele 3 fișiere au devenit 9 (fiecare cu antetul și importurile întregi), W06 (100 000 de
 * operații pe un element) nu mai trece prin încărcările repetate (g*) și prin probele de puritate de după v3 → v4
 * (`mareOperatii`), copiile pe versiuni ale documentelor mari se fac la prima citire (`lenes`, în cazuri), iar lanțurile
 * lungi ale oracolului (ușa și ridicarea) au o singură copie (`verificaLantO`, `ridicaLaO`): comparate cu cele de
 * dinainte pe 2 361 de documente (corpusuri, otrăvuri, generate și mari), 23 464 de rezultate, nicio diferență.
 *
 * Felia 2.3c-2 (ADR 0037, sesiune independentă): oracolul e pe v10 (căile deschise, laturile `stanga` / `dreapta`,
 * `despartire`; migrarea v9 → v10 schimbă doar numărul). `SCHEMA_CURENTA_O` = 10, `ridicaO` dă v10 (`ridicaV9O`
 * păstrează lanțul până la 9), `verificaO` e ușa v10 (`verificaPanaLaV9O`, a unei aplicații pe 9), iar fiecare test de
 * mai sus primește pe 10 documentul migrării cu `schema: 10` (`v9PentruApp`, lanțurile `migreazaVkV10O`); „mai nouă”
 * e de acum 11. Testele v10 sunt în `document.v10.oracol.test.ts`; „VERSIUNE_SCHEMA e 10” nu se sare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { elementeFoaie, taieturiFoaie } from '../../src/model/lume.ts';
import {
  aplicaO, CAMPURI_TAIETURA_O, categoriiO, diferenta, geometrieV1, geometrieV2, migreazaV1V4O, migreazaV1V5O, migreazaV1V6O,
  migreazaV1V7O, migreazaV4V7O, migreazaV5V7O, migreazaV6V7O, ridicaV6O, INTRARI_DIALOG_O, INTRARI_IMPLICITE_O, RAZA_MINIMA_INTRARI_O,
  taieturiV7O, verificaV6V7, verificaV7, verificaPanaLaV6O, type DocV7O, type IntrariO,
  migreazaV2V4O, migreazaV2V5O, migreazaV2V6O, migreazaV3V4O, migreazaV3V5O, migreazaV3V6O, migreazaV4V5O, migreazaV4V6O,
  migreazaV5V6O, PLAFOANE_O, RAMPA_DIALOG_O, RAMPA_IMPLICITA_O, ridicaO, ridicaV4O, ridicaV5O, SCHEMA_CURENTA_O,
  SENS_IMPLICIT_O, SENSURI_O, taieturiV4O, taieturiV5O, taieturiV6O, URECHI_DIALOG_O, URECHI_IMPLICITE_O, verificaO,
  verificaPanaLaV5O, verificaV1, verificaV2V3, verificaV2V4, verificaV3, verificaV3V4, verificaV4, verificaV4V5, verificaV4V6,
  verificaV5, verificaV5V6, verificaV6,
  type DocV2O, type DocV3O, type DocV4O, type DocV5O, type DocV6O, type ElementLumeO, type Liber, type RampaO, type TaieturaO,
  type TaieturaV4O, type UrechiO,
  COLTURI_IMPLICITE_O, migreazaV1V8O, migreazaV4V8O, migreazaV5V8O, migreazaV6V8O, migreazaV7V8O, ridicaV7O, taieturiV8O, TIPURI_COLTURI_O,
  verificaPanaLaV7O, verificaV7V8, verificaV8, type ColturiO, type DocV8O,
  migreazaV1V9O, migreazaV4V9O, migreazaV8V9O, ridicaV8O, verificaPanaLaV8O, verificaV8V9, verificaV9, type DocV9O,
  migreazaV9V10O, ridicaV9O, migreazaV10V11O, migreazaV11V12O, migreazaV12V13O, migreazaV13V14O,
} from '../oracles/document.ts';
import {
  areRampaPeOperatii, areUrechiPeOperatii, CAZURI_HARTIE, CAZURI_TAIETURI, CORPUS_V1, CORPUS_V2, CORPUS_V3, CORPUS_V4,
  CORPUS_V5, CORPUS_V6, faraUrechiPeOperatii, MIGRARI_HARTIE, MIGRARI_V2_HARTIE, MIGRARI_V3_HARTIE, MIGRARI_V4_HARTIE,
  MIGRARI_V5_HARTIE, OTRAVURI_RAMPA, OTRAVURI_URECHI, OTRAVURI_V2, OTRAVURI_V3, OTRAVURI_V4, OTRAVURI_V5, OTRAVURI_V6,
  REFUZATE_V1, REFUZATE_V2, REFUZATE_V3, REFUZATE_V4, REFUZATE_V5, V1_LA_PLAFON, VALIDE_DIFICILE, VALIDE_DIFICILE_V3,
  VALIDE_DIFICILE_V4, VALIDE_DIFICILE_V5, VALIDE_DIFICILE_V6,
  areIntrariPeOperatii, CORPUS_V7, faraIntrariPeOperatii, MIGRARI_V6_HARTIE, OTRAVURI_INTRARI, OTRAVURI_V7, REFUZATE_V6,
  VALIDE_DIFICILE_V7,
  areColturiPeOperatii, CORPUS_V8, MIGRARI_V7_HARTIE, OTRAVURI_COLTURI, OTRAVURI_V8, REFUZATE_V7, VALIDE_DIFICILE_V8,
} from '../oracles/document.cazuri.ts';

import {
  type DocApp, V, PE_V5, PE_V6, PE_V7, PE_V8, PE_V9, DOAR_V5, DOAR_V6, DOAR_V7, DOAR_V8, DOAR_V9, verificaSchemaApp, v5PentruApp, v6PentruApp, v7PentruApp, v8PentruApp, ciocnesteLa7, accepta, ca, asteptatDinV4, lumeaAplicatiei, formeTaietura, type TaieturaApp, taieturileAplicatiei, aceleasiChei, aceeasiLume, type TaieturaAsteptata, aceleasiTaieturi, taieturileOracolului, aceeasiFoaie, mare, mareOperatii, text, faraCampuriNoi, incarcaVechi, unice, valideV4, valideV5, valideV6,
} from './ajutor-document-oracol.ts';

// Fișierul 9 din 11 (vezi antetul; felia 2.7b: împărțit ca fiecare fișier să ruleze în ~20 s): v8 (ADR 0032), oracolul
// singur și lipirea.
// Toate: `document.oracol.test.ts` (oracolul singur până la v6, migrările și cazurile pe hârtie),
// `document.v1.oracol.test.ts`, `document.v2.oracol.test.ts`, `document.v3.oracol.test.ts` (lipirea v1, v2, v3),
// `document.lipire.oracol.test.ts`, `document.lipire5.oracol.test.ts`, `document.lipire6.oracol.test.ts` (otrăvurile,
// documentele valide și refuzurile v2–v6), `document.v7.oracol.test.ts`, `document.v8.oracol.test.ts`,
// `document.v9.oracol.test.ts` și `document.v9.actiuni.oracol.test.ts`.

// ── v8 (ADR 0032): oracolul singur ───────────────────────────────────────────────────────────────────────────────────

for (const { nume, v7, v8 } of MIGRARI_V7_HARTIE) {
  test(`(o) oracolul migrează v7 → v8 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV7(v7), []);
    assert.deepEqual(verificaV7V8(v7), []);
    assert.deepEqual(verificaO(v7), []);
    assert.equal(diferenta(migreazaV7V8O(v7), v8), undefined);
    assert.equal(diferenta(ridicaV8O(v7), v8), undefined);
    assert.equal(diferenta(ridicaV9O(v7), migreazaV8V9O(v8 as DocV8O)), undefined);
    assert.equal(diferenta(ridicaO(v7), migreazaV13V14O(migreazaV12V13O(migreazaV11V12O(migreazaV10V11O(migreazaV9V10O(migreazaV8V9O(v8 as DocV8O))))))), undefined);
    assert.deepEqual(verificaV8(v8), []);
    assert.deepEqual(verificaO(v8), []);
    assert.deepEqual(verificaPanaLaV7O(v7), [], 'ușa unei aplicații pe 7: `colturi` în afara operațiilor e necunoscut oarecare');
  });
}

test('(o) migrarea v7 → v8 e pură și deterministă; din v7 rămâne tot, în afară de schema și de colturi: null pe operații', () => {
  let operatii = 0;
  for (const { doc } of [...CORPUS_V7, ...VALIDE_DIFICILE_V7].filter((c) => !mare(c.doc) && !mareOperatii(c.doc) && !areColturiPeOperatii(c.doc))) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV7V8O(doc);
    assert.equal(JSON.stringify(doc), inainte, 'intrarea s-a schimbat');
    assert.equal(diferenta(a, migreazaV7V8O(doc)), undefined);
    assert.equal(a.schema, 8);
    for (const p of a.piese) for (const o of p.operatii) { assert.equal(o.colturi, null); operatii++; }
    const c = structuredClone(a) as Liber;
    c['schema'] = 7;
    for (const p of c['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['colturi'];
    assert.equal(diferenta(c, doc), undefined);
    assert.deepEqual(verificaV8(a), []);
  }
  assert.ok(operatii > 100, `${operatii} operații migrate`);
});

test('(o) otrăvurile v8: fiecare raportează exact categoria ei (cele v7 aduse la v8, plus cele ale colțurilor, doar [colturi])', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V8) {
    const c = categoriiO(verificaV8(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
    // Felia 2.7b: otrava v8 „schema mai nouă” (schema 9, conținut v8) e un v9 valid: singura pe care ușa v9 o primește.
    if (verificaO(o.doc).length === 0 && !(o.categorie === 'schema' && (o.doc as Liber)['schema'] === 9)) rele.push(`${o.nume}: ușa oracolului (verificaO) o primește`);
  }
  assert.deepEqual(rele, []);
  assert.ok(OTRAVURI_COLTURI.length >= 24);
  assert.equal(OTRAVURI_V8.length, OTRAVURI_V7.length + OTRAVURI_COLTURI.length);
});

test('(o) v7 (sau v6, v5, v4, v3) cu „colturi” pe o operație, oricare i-ar fi valoarea: valid în schema lui, de nemigrat la v8 ([ciocnire]); ușa unei aplicații pe 7 îl primește; niciun corpus mai vechi n-are colturi pe operații', () => {
  for (const r of REFUZATE_V7) {
    const d = r.doc as Liber;
    if (d['schema'] === 7) {
      assert.deepEqual(verificaV7(r.doc), [], r.nume);
      assert.deepEqual(categoriiO(verificaV7V8(r.doc)), ['ciocnire'], r.nume);
    }
    assert.deepEqual(verificaPanaLaV7O(r.doc), [], `${r.nume}: până la v7, colturi e un câmp necunoscut`);
    assert.deepEqual(categoriiO(verificaO(r.doc)), ['ciocnire'], r.nume);
  }
  for (const { nume, doc } of [...CORPUS_V3, ...CORPUS_V4, ...CORPUS_V5, ...CORPUS_V6, ...CORPUS_V7, ...VALIDE_DIFICILE_V3, ...VALIDE_DIFICILE_V4, ...VALIDE_DIFICILE_V5, ...VALIDE_DIFICILE_V6, ...VALIDE_DIFICILE_V7]) {
    assert.equal(areColturiPeOperatii(doc), false, nume);
  }
});

test('(o) corpusul v8: valid, cu colturi null, dog-bone și T-bone (și cu câmpuri necunoscute în obiect), cu capcanele „colturi” în afara operației', () => {
  let nule = 0, dog = 0, tee = 0, capcane = 0, necunoscute = 0;
  for (const { nume, doc } of [...CORPUS_V8, ...VALIDE_DIFICILE_V8]) {
    assert.deepEqual(verificaV8(doc), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    if (Object.hasOwn(doc, 'colturi')) capcane++;
    for (const p of doc.piese) {
      if (Object.hasOwn(p, 'colturi')) capcane++;
      for (const o of p.operatii) {
        if (Object.hasOwn(o.scula, 'colturi') || (o.urechi !== null && Object.hasOwn(o.urechi, 'colturi')) || (o.rampa !== null && Object.hasOwn(o.rampa, 'colturi')) || (o.intrari !== null && Object.hasOwn(o.intrari, 'colturi'))) capcane++;
        if (o.colturi === null) { nule++; continue; }
        if (o.colturi.tip === 'dog-bone') dog++; else tee++;
        if (Object.keys(o.colturi).length > 1) necunoscute++;
      }
    }
  }
  assert.ok(nule > 50 && dog > 50 && tee > 50 && capcane >= 5 && necunoscute >= 3, JSON.stringify({ nule, dog, tee, capcane, necunoscute }));
});

// ── v8 (ADR 0032): lipirea ───────────────────────────────────────────────────────────────────────────────────────────

for (const { nume, v7, v8 } of MIGRARI_V7_HARTIE) {
  test(`(a8) migrarea v7 → v${V} pe hârtie: ${nume}`, { skip: DOAR_V8 }, () => {
    assert.equal(diferenta(accepta(structuredClone(v7)), v8PentruApp(v8 as DocV8O)), undefined);
    const b1 = jsonCanonic(accepta(structuredClone(v7)));
    assert.deepEqual(jsonCanonic(accepta(structuredClone(v8))), b1, 'v8 de pe hârtie încărcat direct');
  });
}

for (const o of OTRAVURI_V8) {
  test(`(e8) otrava v8 [${o.categorie}] e refuzată (sau, dacă ușa v9 a oracolului o primește, primită și de aplicație): ${o.nume}`, { skip: DOAR_V8 }, () => {
    const probleme = verificaV8(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    if (verificaO(o.doc).length === 0) {
      // Pe 9: „schema mai nouă” a lui v8 e chiar v9 (ADR 0034 §3: doar numărul), deci ușa trebuie s-o primească.
      assert.equal(incarca(structuredClone(o.doc)).ok, true, 'ușa oracolului o primește, aplicația nu');
      return;
    }
    const r = incarca(o.doc);
    if (r.ok) assert.fail('aplicația a primit otrava');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const v of [...VALIDE_DIFICILE_V8, ...CORPUS_V8]) {
  test(`(e8) v8 valid, deși seamănă cu o otravă: ${v.nume}`, { skip: DOAR_V8 }, () => {
    assert.deepEqual(verificaV8(v.doc), [], 'oracolul');
    aceeasiFoaie(accepta(structuredClone(v.doc)), v8PentruApp(v.doc));
  });
}

for (const { nume, doc } of [...VALIDE_DIFICILE_V8, ...CORPUS_V8].filter((c) => !mare(c.doc) && !mareOperatii(c.doc))) {
  test(`(g8) un v8 valid trece prin ușă ${PE_V9 ? 'ca v9-ul migrării (doar numărul)' : 'neschimbat'}: ${nume}`, { skip: DOAR_V8 }, () => {
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, v8PentruApp(doc)), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

for (const r of REFUZATE_V7) {
  test(`(h8) o operație veche cu „colturi” e refuzată la migrarea în v8 [${r.motiv}]: ${r.nume}`, { skip: DOAR_V8 }, () => {
    assert.deepEqual(categoriiO(verificaO(r.doc)), [r.motiv]);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

test('raport: forma tăieturilor aplicației (cu sau fără sens, urechi, rampă, intrări și colțuri)', () => {
  // Rulează după celelalte (ordinea fișierului); doar spune ce a văzut.
  console.log(`tăieturile aplicației: ${[...formeTaietura].join(', ') || 'necitite'}`);
});
