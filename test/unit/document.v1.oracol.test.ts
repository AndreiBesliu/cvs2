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
  migreazaV1V10O, migreazaV1V11O, migreazaV1V12O, migreazaV1V13O, migreazaV1V14O, migreazaV1V15O, migreazaV1V16O, migreazaV1V17O,
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
  type DocApp, V, PE_V17, PE_V16, PE_V15, PE_V10, PE_V11, PE_V5, PE_V6, PE_V7, PE_V8, PE_V9, DOAR_V5, DOAR_V6, DOAR_V7, DOAR_V8, DOAR_V9, verificaSchemaApp, v5PentruApp, v6PentruApp, v7PentruApp, v8PentruApp, ciocnesteLa7, accepta, ca, asteptatDinV4, lumeaAplicatiei, formeTaietura, type TaieturaApp, taieturileAplicatiei, aceleasiChei, aceeasiLume, type TaieturaAsteptata, aceleasiTaieturi, taieturileOracolului, aceeasiFoaie, mare, mareOperatii, text, faraCampuriNoi, incarcaVechi, unice, valideV4, valideV5, valideV6, PE_V12, PE_V13, PE_V14,
} from './ajutor-document-oracol.ts';

// Fișierul 2 din 11 (vezi antetul; felia 2.7b: împărțit ca fiecare fișier să ruleze în ~20 s): lipirea v1 (corpusul și
// documentul la plafon).
// Toate: `document.oracol.test.ts` (oracolul singur până la v6, migrările și cazurile pe hârtie),
// `document.v1.oracol.test.ts`, `document.v2.oracol.test.ts`, `document.v3.oracol.test.ts` (lipirea v1, v2, v3),
// `document.lipire.oracol.test.ts`, `document.lipire5.oracol.test.ts`, `document.lipire6.oracol.test.ts` (otrăvurile,
// documentele valide și refuzurile v2–v6), `document.v7.oracol.test.ts`, `document.v8.oracol.test.ts`,
// `document.v9.oracol.test.ts` și `document.v9.actiuni.oracol.test.ts`.

for (const { nume, doc } of CORPUS_V1) {
  test(`(a) v1 → v${V} păstrează geometria și dă tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV1(doc), [], 'oracolul: documentul v1 se migrează');
    const x = incarcaVechi(doc, migreazaV1V4O(doc));
    if (!x) return;
    assert.equal(ca(x.doc).schema, V);
    assert.deepEqual(verificaSchemaApp(x.doc), []);
    aceeasiLume(geometrieV2(ca(x.doc)), geometrieV1(doc));
    aceeasiFoaie(x.doc, x.asteptat);
  });

  test(`(a) v1 → v${V} dă exact documentul din contracte: ${nume}`, () => {
    const x = incarcaVechi(doc, migreazaV1V4O(doc));
    if (!x) return;
    assert.equal(diferenta(x.doc, x.asteptat), undefined);
    if (PE_V5) assert.equal(diferenta(x.doc, PE_V17 ? migreazaV1V17O(doc) : PE_V16 ? migreazaV1V16O(doc) : PE_V15 ? migreazaV1V15O(doc) : PE_V14 ? migreazaV1V14O(doc) : PE_V13 ? migreazaV1V13O(doc) : PE_V12 ? migreazaV1V12O(doc) : PE_V11 ? migreazaV1V11O(doc) : PE_V10 ? migreazaV1V10O(doc) : PE_V9 ? migreazaV1V9O(doc) : PE_V8 ? migreazaV1V8O(doc) : PE_V7 ? migreazaV1V7O(doc) : PE_V6 ? migreazaV1V6O(doc) : migreazaV1V5O(doc)), undefined);
  });

  test(`(b) câmpurile necunoscute trec prin migrarea v1 → v${V}: ${nume}`, () => {
    const v = ca(accepta(structuredClone(doc)));
    assert.equal(v.rev, doc.rev);
    for (const [cheie, val] of Object.entries(doc)) {
      if (['schema', 'rev', 'foaie', 'elemente'].includes(cheie)) continue;
      const d = diferenta(v[cheie], val);
      assert.ok(d === undefined, `primul nivel, ${cheie}: ${d}`);
    }
    const stoc = (v.foi[0] as DocV6O['foi'][number]).stoc;
    for (const [cheie, val] of Object.entries(doc.foaie)) {
      const d = diferenta(stoc[cheie], val);
      assert.ok(d === undefined, `foaia → stoc, ${cheie}: ${d}`);
    }
    doc.elemente.forEach((e, i) => {
      const p = v.piese[i] as DocV6O['piese'][number];
      assert.equal(p.id, e.id);
      assert.equal(p.nume, e.nume, `numele elementului ${e.id} stă pe piesă`);
      for (const o of p.operatii) {
        assert.equal(o.sens, 'urcare', `operația ${o.id} a piesei ${p.id}`);
        if (PE_V5) assert.equal(o.urechi, null, `operația ${o.id} a piesei ${p.id}: urechi`);
        if (PE_V6) assert.equal(o.rampa, null, `operația ${o.id} a piesei ${p.id}: rampa`);
        if (PE_V7) assert.equal(o.intrari, null, `operația ${o.id} a piesei ${p.id}: intrari`);
        if (PE_V8) assert.equal(o.colturi, null, `operația ${o.id} a piesei ${p.id}: colturi`);
      }
      for (const [cheie, val] of Object.entries(e)) {
        if (['id', 'nume', 'forma', 'matrice'].includes(cheie)) continue;
        const d = diferenta((p.radacina as Liber)[cheie], val);
        assert.ok(d === undefined, `elementul ${e.id} → rădăcina piesei, ${cheie}: ${d}`);
      }
      for (const [cheie, val] of Object.entries(e.matrice)) {
        if (['a', 'b', 'c', 'd', 'e', 'f'].includes(cheie)) continue;
        const d = diferenta((p.radacina.matrice as unknown as Liber)[cheie], val);
        assert.ok(d === undefined, `matricea elementului ${e.id} → matricea rădăcinii, ${cheie}: ${d}`);
      }
    });
  });

  test(`(c) migrarea v1 → v${V} și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, `v${V} încărcat din nou`);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, `v${V} încărcat din octeții canonici`);
  });
}

test(`(a) ${V1_LA_PLAFON.nume}: se migrează, cu exact 100 000 de elemente și de tăieturi în lume`, () => {
  const { doc } = V1_LA_PLAFON;
  assert.deepEqual(verificaV1(doc), [], 'oracolul');
  const v = accepta(structuredClone(doc));
  assert.deepEqual(verificaSchemaApp(v), []);
  aceeasiLume(lumeaAplicatiei(v), geometrieV1(doc));
  const taieturi = taieturileAplicatiei(v);
  assert.equal(taieturi.length, 100_000);
  aceleasiTaieturi(taieturi, PE_V9 ? taieturiV8O(migreazaV1V9O(doc)) : PE_V8 ? taieturiV8O(migreazaV1V8O(doc)) : PE_V7 ? taieturiV7O(migreazaV1V7O(doc)) : PE_V6 ? taieturiV6O(migreazaV1V6O(doc)) : PE_V5 ? taieturiV5O(migreazaV1V5O(doc)) : taieturiV4O(migreazaV1V4O(doc)));
});

test('raport: forma tăieturilor aplicației (cu sau fără sens, urechi, rampă, intrări și colțuri)', () => {
  // Rulează după celelalte (ordinea fișierului); doar spune ce a văzut.
  console.log(`tăieturile aplicației: ${[...formeTaietura].join(', ') || 'necitite'}`);
});
