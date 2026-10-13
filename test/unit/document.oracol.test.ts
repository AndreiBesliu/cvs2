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
  migreazaV1V10O, migreazaV4V10O, ridicaV9O, verificaPanaLaV9O,
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

// Fișierul 1 din 11 (vezi antetul; felia 2.7b: împărțit ca fiecare fișier să ruleze în ~20 s): oracolul singur până la
// v6 (fără ciocnirile „urechi”), versiunea aplicației, migrările și cazurile pe hârtie.
// Toate: `document.oracol.test.ts` (oracolul singur până la v6, migrările și cazurile pe hârtie),
// `document.v1.oracol.test.ts`, `document.v2.oracol.test.ts`, `document.v3.oracol.test.ts` (lipirea v1, v2, v3),
// `document.lipire.oracol.test.ts`, `document.lipire5.oracol.test.ts`, `document.lipire6.oracol.test.ts` (otrăvurile,
// documentele valide și refuzurile v2–v6), `document.v7.oracol.test.ts`, `document.v8.oracol.test.ts`,
// `document.v9.oracol.test.ts` și `document.v9.actiuni.oracol.test.ts`.

// ── Oracolul singur, pe hârtie ──────────────────────────────────────────────────────────────────────────────────────

test('(o) versiunea curentă a oracolului e 10 (căile: 2–50 000 de vârfuri, 200 000 în piese, 1 000 000 în lume); sensurile sunt urcare și opozitie; urechile: implicit null, dialogul 4 × 8 × 2, cel mult 100; rampa: implicit null, dialogul 10 mm; intrările: implicit null, dialogul 3 mm, exportul cere ≥ 0,5; colțurile: implicit null, dog-bone sau t-bone', () => {
  assert.equal(SCHEMA_CURENTA_O, 10);
  assert.deepEqual([PLAFOANE_O.varfuriCaleMin, PLAFOANE_O.varfuriCale, PLAFOANE_O.varfuri, PLAFOANE_O.varfuriLume], [2, 50_000, 200_000, 1_000_000]);
  assert.equal(COLTURI_IMPLICITE_O, null);
  assert.deepEqual([...TIPURI_COLTURI_O], ['dog-bone', 't-bone']);
  assert.equal(INTRARI_IMPLICITE_O, null);
  assert.deepEqual({ ...INTRARI_DIALOG_O }, { raza: 3 });
  assert.equal(RAZA_MINIMA_INTRARI_O, 0.5);
  assert.equal(RAMPA_IMPLICITA_O, null);
  assert.deepEqual({ ...RAMPA_DIALOG_O }, { lungime: 10 });
  assert.deepEqual([...SENSURI_O], ['urcare', 'opozitie']);
  assert.equal(SENS_IMPLICIT_O, 'urcare');
  assert.equal(URECHI_IMPLICITE_O, null);
  assert.deepEqual({ ...URECHI_DIALOG_O }, { numar: 4, latime: 8, grosime: 2 });
  assert.equal(PLAFOANE_O.urechi, 100);
  assert.equal(PLAFOANE_O.latura, 10_000);
  assert.equal(PLAFOANE_O.grosime, 1_000);
});

for (const { nume, v1, v4 } of MIGRARI_HARTIE) {
  test(`(o) oracolul migrează v1 → v4 exact ca pe hârtie (și v1 → v5 = v4 → v5): ${nume}`, () => {
    assert.deepEqual(verificaV1(v1), []);
    assert.equal(diferenta(migreazaV1V4O(v1), v4), undefined);
    assert.deepEqual(verificaV4(v4), []);
    assert.equal(diferenta(migreazaV1V5O(v1), migreazaV4V5O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV1V6O(v1), migreazaV4V6O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(ridicaV6O(v1), migreazaV4V6O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(ridicaV7O(v1), migreazaV4V7O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV1V7O(v1), migreazaV4V7O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(ridicaV8O(v1), migreazaV4V8O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(ridicaV9O(v1), migreazaV4V9O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(ridicaO(v1), migreazaV4V10O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV1V9O(v1), migreazaV4V9O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV1V10O(v1), migreazaV4V10O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV1V8O(v1), migreazaV4V8O(v4 as DocV4O)), undefined);
  });
}

for (const { nume, v2, v4 } of MIGRARI_V2_HARTIE) {
  test(`(o) oracolul migrează v2 → v4 exact ca pe hârtie (și v2 → v5 = v4 → v5): ${nume}`, () => {
    assert.deepEqual(verificaV2V4(v2), []);
    assert.equal(diferenta(migreazaV2V4O(v2), v4), undefined);
    assert.deepEqual(verificaV4(v4), []);
    assert.equal(diferenta(migreazaV2V5O(v2), migreazaV4V5O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV2V6O(v2), migreazaV4V6O(v4 as DocV4O)), undefined);
  });
}

for (const { nume, v3, v4 } of MIGRARI_V3_HARTIE) {
  test(`(o) oracolul migrează v3 → v4 exact ca pe hârtie; la v5, doar fără „urechi” pe operații: ${nume}`, () => {
    assert.deepEqual(verificaV3(v3), []);
    assert.deepEqual(verificaV3V4(v3), []);
    assert.equal(diferenta(migreazaV3V4O(v3), v4), undefined);
    assert.equal(diferenta(ridicaV4O(v3), v4), undefined);
    assert.deepEqual(verificaV4(v4), []);
    // ADR 0028 §1: un câmp „urechi” pe o operație (capcana MV3-01) se ciocnește la v4 → v5, în lanț.
    if (areUrechiPeOperatii(v3) || areIntrariPeOperatii(v3)) {
      assert.deepEqual(categoriiO(verificaO(v3)), ['ciocnire']);
    } else {
      assert.deepEqual(verificaO(v3), []);
      assert.equal(diferenta(migreazaV3V5O(v3), migreazaV4V5O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(ridicaV5O(v3), migreazaV4V5O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(migreazaV3V6O(v3), migreazaV4V6O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(ridicaV6O(v3), migreazaV4V6O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(ridicaV7O(v3), migreazaV4V7O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(ridicaV8O(v3), migreazaV4V8O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(ridicaV9O(v3), migreazaV4V9O(v4 as DocV4O)), undefined);
      assert.equal(diferenta(ridicaO(v3), migreazaV4V10O(v4 as DocV4O)), undefined);
    }
  });
}

for (const { nume, v4, v5 } of MIGRARI_V4_HARTIE) {
  test(`(o) oracolul migrează v4 → v5 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV4(v4), []);
    assert.deepEqual(verificaV4V5(v4), []);
    assert.deepEqual(categoriiO(verificaO(v4)), areIntrariPeOperatii(v4) ? ['ciocnire'] : []);
    assert.equal(diferenta(migreazaV4V5O(v4), v5), undefined);
    assert.equal(diferenta(ridicaV5O(v4), v5), undefined);
    assert.deepEqual(verificaV5(v5), []);
    assert.deepEqual(categoriiO(verificaO(v5)), areIntrariPeOperatii(v5) ? ['ciocnire'] : []);
    assert.deepEqual(verificaV4V6(v4), []);
    assert.equal(diferenta(ridicaV6O(v4), migreazaV5V6O(v5 as DocV5O)), undefined);
  });
}

for (const { nume, v5, v6 } of MIGRARI_V5_HARTIE) {
  test(`(o) oracolul migrează v5 → v6 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV5(v5), []);
    assert.deepEqual(verificaV5V6(v5), []);
    // ADR 0030 §1: capcana `intrari` de pe o operație (MV5-01) se ciocnește acum la v6 → v7.
    assert.deepEqual(categoriiO(verificaO(v5)), areIntrariPeOperatii(v5) ? ['ciocnire'] : []);
    assert.equal(diferenta(migreazaV5V6O(v5), v6), undefined);
    assert.equal(diferenta(ridicaV6O(v5), v6), undefined);
    assert.deepEqual(verificaV6(v6), []);
    assert.deepEqual(categoriiO(verificaO(v6)), areIntrariPeOperatii(v6) ? ['ciocnire'] : []);
    assert.deepEqual(verificaPanaLaV6O(v6), [], 'ușa unei aplicații pe 6');
    // Ușa unei aplicații pe 5 primește v5-ul (câmpurile `rampa` din afara operațiilor sunt necunoscute oarecare).
    assert.deepEqual(verificaPanaLaV5O(v5), []);
  });
}

test('(o) migrarea v3 → v4 e pură și deterministă: intrarea rămâne neschimbată, două migrări dau același document', () => {
  for (const { doc } of [...CORPUS_V3, ...VALIDE_DIFICILE_V3].filter((c) => !mare(c.doc))) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV3V4O(doc);
    assert.equal(JSON.stringify(doc), inainte, 'intrarea s-a schimbat');
    assert.equal(diferenta(a, migreazaV3V4O(doc)), undefined);
    assert.equal(a.schema, 4);
    for (const p of a.piese) for (const o of p.operatii) assert.equal(o.sens, 'urcare');
    // Din v3 rămâne tot, în afară de schema și de sensul de pe operații.
    assert.equal(diferenta(faraCampuriNoi(a, 3, false), doc), undefined);
  }
});

test('(o) migrarea v4 → v5 e pură și deterministă; din v4 rămâne tot, în afară de schema și de urechi: null pe operații', () => {
  let operatii = 0;
  for (const { doc } of [...CORPUS_V4, ...VALIDE_DIFICILE_V4].filter((c) => !mare(c.doc) && !mareOperatii(c.doc) && !areUrechiPeOperatii(c.doc))) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV4V5O(doc);
    assert.equal(JSON.stringify(doc), inainte, 'intrarea s-a schimbat');
    assert.equal(diferenta(a, migreazaV4V5O(doc)), undefined);
    assert.equal(a.schema, 5);
    for (const p of a.piese) for (const o of p.operatii) { assert.equal(o.urechi, null); operatii++; }
    const c = structuredClone(a) as Liber;
    c['schema'] = 4;
    for (const p of c['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['urechi'];
    assert.equal(diferenta(c, doc), undefined);
    assert.deepEqual(verificaV5(a), []);
  }
  // Felia 2.7b: fără W06 (`mareOperatii`), corpusul v4 are ~60 de operații de migrat.
  assert.ok(operatii > 50, `${operatii} operații migrate`);
});

test('(o) migrarea v5 → v6 e pură și deterministă; din v5 rămâne tot, în afară de schema și de rampa: null pe operații', () => {
  let operatii = 0;
  for (const { doc } of [...CORPUS_V5, ...VALIDE_DIFICILE_V5].filter((c) => !mare(c.doc) && !mareOperatii(c.doc))) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV5V6O(doc);
    assert.equal(JSON.stringify(doc), inainte, 'intrarea s-a schimbat');
    assert.equal(diferenta(a, migreazaV5V6O(doc)), undefined);
    assert.equal(a.schema, 6);
    for (const p of a.piese) for (const o of p.operatii) { assert.equal(o.rampa, null); operatii++; }
    const c = structuredClone(a) as Liber;
    c['schema'] = 5;
    for (const p of c['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['rampa'];
    assert.equal(diferenta(c, doc), undefined);
    assert.deepEqual(verificaV6(a), []);
  }
  assert.ok(operatii > 100, `${operatii} operații migrate`);
});

for (const caz of CAZURI_TAIETURI) {
  test(`(o) tăieturile oracolului pe hârtie, cu sensul (și urechile null, la v5): ${caz.nume}`, () => {
    assert.deepEqual(verificaO(caz.doc), []);
    // Felia 2.3c-2: `ridicaO` dă v10; tăieturile ADR 0025 se citesc pe lanțul până la 9 (aceleași, fără căi deschise).
    assert.equal(ridicaO(caz.doc).schema, 10);
    const v8 = ridicaV9O(caz.doc);
    assert.equal(v8.schema, 9);
    aceleasiTaieturi(taieturiV4O(v8, caz.indexFoaie), caz.taieturi, 'oracolul');
    for (const t of taieturiV8O(v8, caz.indexFoaie)) { assert.equal(t.urechi, null); assert.equal(t.rampa, null); assert.equal(t.intrari, null); assert.equal(t.colturi, null); }
  });
}

test('(o) otrăvurile v4: fiecare raportează exact categoria ei; ale sensului doar [sens]', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V4) {
    const c = categoriiO(verificaV4(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
  }
  assert.deepEqual(rele, []);
  assert.ok(OTRAVURI_V4.filter((o) => o.categorie === 'sens').length >= 19);
  assert.equal(OTRAVURI_V4.length, OTRAVURI_V3.length + OTRAVURI_V4.filter((o) => o.categorie === 'sens').length);
});

test('(o) otrăvurile v5: fiecare raportează exact categoria ei (cele v4 aduse la v5, plus cele ale urechilor, doar [urechi])', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V5) {
    const c = categoriiO(verificaV5(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
    if (verificaO(o.doc).length === 0) rele.push(`${o.nume}: ușa oracolului (verificaO) o primește`);
  }
  assert.deepEqual(rele, []);
  assert.ok(OTRAVURI_URECHI.length >= 32);
  assert.equal(OTRAVURI_V5.length, OTRAVURI_V4.length + OTRAVURI_URECHI.length);
});

test('(o) otrăvurile v6: fiecare raportează exact categoria ei (cele v5 aduse la v6, plus cele ale rampei, doar [rampa])', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V6) {
    const c = categoriiO(verificaV6(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
    if (verificaO(o.doc).length === 0) rele.push(`${o.nume}: ușa oracolului (verificaO) o primește`);
  }
  assert.deepEqual(rele, []);
  assert.ok(OTRAVURI_RAMPA.length >= 24);
  assert.equal(OTRAVURI_V6.length, OTRAVURI_V5.length + OTRAVURI_RAMPA.length);
});

test('(o) v5 (sau v4, v3) cu „rampa” pe o operație, oricare i-ar fi valoarea: valid în schema lui, de nemigrat la v6 ([ciocnire]); ușa unei aplicații pe 5 îl primește', () => {
  for (const r of REFUZATE_V5) {
    const d = r.doc as Liber;
    if (d['schema'] === 5) {
      assert.deepEqual(verificaV5(r.doc), [], r.nume);
      assert.deepEqual(categoriiO(verificaV5V6(r.doc)), ['ciocnire'], r.nume);
    }
    assert.deepEqual(verificaPanaLaV5O(r.doc), [], `${r.nume}: până la v5, rampa e un câmp necunoscut`);
    assert.deepEqual(categoriiO(verificaO(r.doc)), ['ciocnire'], r.nume);
  }
  // Niciun corpus mai vechi nu are rampa pe operații.
  for (const { doc } of [...CORPUS_V3, ...CORPUS_V4, ...CORPUS_V5, ...VALIDE_DIFICILE_V3, ...VALIDE_DIFICILE_V4, ...VALIDE_DIFICILE_V5]) assert.equal(areRampaPeOperatii(doc), false);
});

test('(o) corpusul v6: valid, cu rampa null și cu lungimi de pe tot intervalul (și de la margini), cu capcanele „rampa” în afara operației', () => {
  let nule = 0, cu = 0, laMargini = 0, capcane = 0, necunoscute = 0;
  for (const { nume, doc } of [...CORPUS_V6, ...VALIDE_DIFICILE_V6]) {
    assert.deepEqual(verificaV6(doc), [], nume);
    assert.deepEqual(categoriiO(verificaO(doc)), areIntrariPeOperatii(doc) ? ['ciocnire'] : [], nume);
    if (Object.hasOwn(doc, 'rampa')) capcane++;
    for (const p of doc.piese) {
      if (Object.hasOwn(p, 'rampa')) capcane++;
      for (const o of p.operatii) {
        if (Object.hasOwn(o.scula, 'rampa') || (o.urechi !== null && Object.hasOwn(o.urechi, 'rampa'))) capcane++;
        if (o.rampa === null) { nule++; continue; }
        cu++;
        if (o.rampa.lungime === 10_000 || o.rampa.lungime === 5e-324) laMargini++;
        if (Object.keys(o.rampa).length > 1) necunoscute++;
      }
    }
  }
  assert.ok(nule > 50 && cu > 100 && laMargini > 20 && capcane >= 5 && necunoscute >= 3, JSON.stringify({ nule, cu, laMargini, capcane, necunoscute }));
});

test('(o) otrăvurile v3 rămân otrăvuri pentru ușa v5 (verificaO), cu categoria lor', () => {
  for (const o of OTRAVURI_V3) {
    assert.ok(categoriiO(verificaO(o.doc)).length > 0, o.nume);
    assert.ok(verificaV3(o.doc).some((p) => p.startsWith(`[${o.categorie}]`)), o.nume);
  }
});

test('(o) v3 cu „sens” pe o operație: valid ca v3, de nemigrat ([ciocnire]); „sens” în alt loc nu e ciocnire', () => {
  for (const r of REFUZATE_V3) {
    assert.deepEqual(verificaV3(r.doc), [], r.nume);
    assert.deepEqual(categoriiO(verificaV3V4(r.doc)), ['ciocnire'], r.nume);
    assert.deepEqual(categoriiO(verificaO(r.doc)), ['ciocnire'], r.nume);
  }
  assert.deepEqual(verificaV3V4(MIGRARI_V3_HARTIE[0]!.v3), []);
});


test('(o) corpusurile: v3 se migrează la v4, v4 e valid și are ambele sensuri și capcanele „sens” în afara operației', () => {
  for (const { nume, doc } of CORPUS_V3) assert.deepEqual(verificaV3V4(doc), [], nume);
  const sensuri = new Map<string, number>();
  let capcane = 0;
  for (const { nume, doc } of [...CORPUS_V4, ...VALIDE_DIFICILE_V4]) {
    assert.deepEqual(verificaV4(doc), [], nume);
    if (Object.hasOwn(doc, 'sens')) capcane++;
    for (const p of doc.piese) {
      if (Object.hasOwn(p, 'sens')) capcane++;
      for (const o of p.operatii) {
        sensuri.set(o.sens, (sensuri.get(o.sens) ?? 0) + 1);
        if (Object.hasOwn(o.scula, 'sens')) capcane++;
      }
    }
  }
  assert.ok((sensuri.get('urcare') ?? 0) > 100 && (sensuri.get('opozitie') ?? 0) > 100, JSON.stringify([...sensuri]));
  assert.ok(capcane >= 5, `${capcane} capcane`);
});

test('(o) corpusul v5: valid, cu urechi null și cu valori de pe tot intervalul (și de la margini), cu capcanele „urechi” în afara operației', () => {
  let nule = 0, cu = 0, laMargini = 0, capcane = 0, necunoscute = 0;
  for (const { nume, doc } of [...CORPUS_V5, ...VALIDE_DIFICILE_V5]) {
    assert.deepEqual(verificaV5(doc), [], nume);
    assert.deepEqual(categoriiO(verificaO(doc)), areIntrariPeOperatii(doc) ? ['ciocnire'] : [], nume);
    if (Object.hasOwn(doc, 'urechi')) capcane++;
    for (const p of doc.piese) {
      if (Object.hasOwn(p, 'urechi')) capcane++;
      for (const o of p.operatii) {
        if (o.urechi === null) { nule++; continue; }
        cu++;
        if (o.urechi.numar === 1 || o.urechi.numar === 100 || o.urechi.latime === 10_000 || o.urechi.grosime === 1_000) laMargini++;
        if (Object.keys(o.urechi).length > 3) necunoscute++;
        if (Object.hasOwn(o.scula, 'urechi')) capcane++;
      }
    }
  }
  assert.ok(nule > 50 && cu > 100 && laMargini > 20 && capcane >= 5 && necunoscute >= 3, JSON.stringify({ nule, cu, laMargini, capcane, necunoscute }));
});

test('(o) schema 11, „10” ca text și 9.5 sunt refuzate de oracol (schema 10, de ușa v9); v1, …, v8 ajung la v10 prin lanț (și la v9 prin `ridicaV9O`, la v8 prin `ridicaV8O`, la v7 prin `ridicaV7O`)', () => {
  const d = structuredClone(VALIDE_DIFICILE_V8[1]!.doc) as Liber;
  for (const s of [11, '10', '9', 9.5, 8.5, 0, null]) {
    d['schema'] = s;
    assert.deepEqual(categoriiO(verificaO(d)), ['schema'], String(s));
  }
  // Felia 2.3c-2: ușa unei aplicații rămase pe 9 refuză un v10 („scris de o versiune mai nouă”).
  d['schema'] = 10;
  assert.deepEqual(categoriiO(verificaPanaLaV9O(d)), ['schema']);
  assert.deepEqual(verificaO(d), [], 'pentru ușa v10, un v8 valid etichetat 10 e un v10 valid');
  // Un v5 etichetat 6 (fără rampă) nu e un v6: [rampa].
  const v5ca6 = structuredClone(VALIDE_DIFICILE_V5[1]!.doc) as Liber;
  v5ca6['schema'] = 6;
  assert.deepEqual(categoriiO(verificaO(v5ca6)), ['rampa']);
  // Un v6 etichetat 7 (fără intrări) nu e un v7: [intrari].
  const v6ca7 = structuredClone(faraIntrariPeOperatii(VALIDE_DIFICILE_V6[1]!.doc)) as Liber;
  v6ca7['schema'] = 7;
  assert.deepEqual(categoriiO(verificaO(v6ca7)), ['intrari']);
  // Un v7 etichetat 8 (fără colțuri) nu e un v8: [colturi].
  const v7ca8 = structuredClone(VALIDE_DIFICILE_V7[1]!.doc) as Liber;
  v7ca8['schema'] = 8;
  assert.deepEqual(categoriiO(verificaO(v7ca8)), ['colturi']);
  assert.equal(ridicaO(CORPUS_V1[0]!.doc).schema, 10);
  assert.equal(ridicaV9O(CORPUS_V1[0]!.doc).schema, 9);
  assert.equal(ridicaV8O(CORPUS_V1[0]!.doc).schema, 8);
  assert.equal(ridicaO(CORPUS_V2[0]!.doc).schema, 10);
  assert.equal(ridicaV9O(CORPUS_V2[0]!.doc).schema, 9);
  assert.equal(ridicaV8O(CORPUS_V2[0]!.doc).schema, 8);
  assert.equal(ridicaO(faraUrechiPeOperatii(CORPUS_V3[0]!.doc)).schema, 10);
  assert.equal(ridicaV9O(faraUrechiPeOperatii(CORPUS_V3[0]!.doc)).schema, 9);
  assert.equal(ridicaV8O(faraUrechiPeOperatii(CORPUS_V3[0]!.doc)).schema, 8);
  assert.equal(ridicaO(faraUrechiPeOperatii(CORPUS_V4[0]!.doc)).schema, 10);
  assert.equal(ridicaV9O(faraUrechiPeOperatii(CORPUS_V4[0]!.doc)).schema, 9);
  assert.equal(ridicaV8O(faraUrechiPeOperatii(CORPUS_V4[0]!.doc)).schema, 8);
  assert.equal(ridicaO(CORPUS_V5[0]!.doc).schema, 10);
  assert.equal(ridicaV9O(CORPUS_V5[0]!.doc).schema, 9);
  assert.equal(ridicaV8O(CORPUS_V5[0]!.doc).schema, 8);
  assert.equal(ridicaO(CORPUS_V6[0]!.doc).schema, 10);
  assert.equal(ridicaV9O(CORPUS_V6[0]!.doc).schema, 9);
  assert.equal(ridicaV8O(CORPUS_V6[0]!.doc).schema, 8);
  assert.equal(ridicaO(CORPUS_V7[0]!.doc).schema, 10);
  assert.equal(ridicaV9O(CORPUS_V7[0]!.doc).schema, 9);
  assert.equal(ridicaV8O(CORPUS_V7[0]!.doc).schema, 8);
  assert.equal(ridicaV7O(CORPUS_V6[0]!.doc).schema, 7);
  assert.equal(ridicaV6O(CORPUS_V5[0]!.doc).schema, 6);
  assert.equal(ridicaV5O(CORPUS_V1[0]!.doc).schema, 5);
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('VERSIUNE_SCHEMA e 4–10 (raport: sub 9, testele doar-v9 se sar)', () => {
  assert.ok(V >= 4 && V <= 10, `VERSIUNE_SCHEMA = ${V}`);
  console.log(`schema aplicației: ${V}${PE_V9 ? '' : ' (testele doar-v9 se sar)'}`);
});

// Felia 2.5b: fără `skip`. Poarta de dinainte („e 6”, sărit sub 6) ar fi PICAT pe 7, dar una scrisă `=== 6` ar fi sărit
// în tăcere; acum versiunea oracolului și a aplicației trebuie să fie aceeași, altfel testul e roșu. Felia 2.6: la fel, 8.
test('VERSIUNE_SCHEMA e 10 (felia 2.3c-2, ADR 0037), aceeași cu a oracolului', () => {
  assert.equal(V, SCHEMA_CURENTA_O);
});

for (const { nume, v1, v4 } of MIGRARI_HARTIE) {
  test(`(a) migrarea v1 → v${V} pe hârtie: ${nume}`, () => {
    const asteptat = asteptatDinV4(v4 as DocV4O);
    assert.ok(asteptat, 'v1 nu are cum avea urechi pe operații');
    assert.equal(diferenta(accepta(structuredClone(v1)), asteptat), undefined);
  });
}

for (const { nume, v2, v4 } of MIGRARI_V2_HARTIE) {
  test(`(a) migrarea v2 → v${V} pe hârtie: ${nume}`, () => {
    const asteptat = asteptatDinV4(v4 as DocV4O);
    assert.ok(asteptat, 'operațiile migrării v2 → v3 n-au urechi');
    assert.equal(diferenta(accepta(structuredClone(v2)), asteptat), undefined);
  });
}

for (const { nume, v3, v4 } of MIGRARI_V3_HARTIE) {
  test(`(a) migrarea v3 → v${V} pe hârtie: ${nume}`, () => {
    const x = incarcaVechi(v3, v4 as DocV4O);
    if (!x) return;
    assert.equal(diferenta(x.doc, x.asteptat), undefined);
  });
}

for (const { nume, v4, v5 } of MIGRARI_V4_HARTIE) {
  test(`(a5) migrarea v4 → v${V} pe hârtie: ${nume}`, { skip: DOAR_V5 }, () => {
    assert.equal(diferenta(accepta(structuredClone(v4)), v5PentruApp(v5 as DocV5O)), undefined);
    const b1 = jsonCanonic(accepta(structuredClone(v4)));
    assert.deepEqual(jsonCanonic(accepta(structuredClone(v5))), b1, 'v5 de pe hârtie încărcat direct');
  });
}

for (const { nume, v5, v6 } of MIGRARI_V5_HARTIE) {
  test(`(a6) migrarea v5 → v${V} pe hârtie${ciocnesteLa7(v5) ? ' (pe 7: ciocnirea intrărilor, refuz)' : ''}: ${nume}`, { skip: DOAR_V6 }, () => {
    if (ciocnesteLa7(v5)) {
      assert.equal(incarca(structuredClone(v5)).ok, false, 'pe 7, un câmp „intrari” pe operație e o ciocnire');
      return;
    }
    assert.equal(diferenta(accepta(structuredClone(v5)), v6PentruApp(v6 as DocV6O)), undefined);
    const b1 = jsonCanonic(accepta(structuredClone(v5)));
    assert.deepEqual(jsonCanonic(accepta(structuredClone(v6))), b1, 'v6 de pe hârtie încărcat direct');
  });
}

for (const caz of CAZURI_HARTIE) {
  test(`(d) pe hârtie: ${caz.nume}`, () => {
    assert.deepEqual(verificaV2V4(caz.doc), [], 'oracolul: documentul cazului e valid');
    const doc = accepta(structuredClone(caz.doc));
    const surse: ReadonlyArray<readonly [string, ElementLumeO[]]> = [
      ['aplicația', lumeaAplicatiei(doc, caz.indexFoaie)],
      ['oracolul', geometrieV2(caz.doc, caz.indexFoaie)],
    ];
    for (const [cine, lume] of surse) {
      assert.deepEqual(lume.map((e) => e.idLume), caz.ordine, `${cine}: ordinea elementelor în lume`);
      for (const p of caz.puncte) {
        const e = lume.find((x) => x.idLume === p.idLume);
        assert.ok(e, `${cine}: lipsește ${p.idLume}`);
        const q = aplicaO(e.matrice, p.punctLocal);
        assert.ok(
          q.x === p.punctLume.x && q.y === p.punctLume.y,
          `${cine}: ${p.idLume} duce (${p.punctLocal.x}, ${p.punctLocal.y}) în (${q.x}, ${q.y}), nu în (${p.punctLume.x}, ${p.punctLume.y})`,
        );
      }
    }
  });
}

test('raport: forma tăieturilor aplicației (cu sau fără sens, urechi, rampă, intrări și colțuri)', () => {
  // Rulează după celelalte (ordinea fișierului); doar spune ce a văzut.
  console.log(`tăieturile aplicației: ${[...formeTaietura].join(', ') || 'necitite'}`);
});
