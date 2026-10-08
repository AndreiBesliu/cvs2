/**
 * Documentul v2 (ADR 0024) judecat de oracolul lui independent (`test/oracles/document.ts`, scris doar din contract):
 * - (a) fiecare document v1 al corpusului se migrează într-un v2 valid, cu aceeași geometrie, iar `elementeFoaie` dă
 *   exact elementele în lume ale oracolului; migrarea dă exact documentul cerut de contract;
 * - (b) câmpurile necunoscute trec prin migrare, la locul lor;
 * - (c) migrarea și încărcarea sunt idempotente la octet (`jsonCanonic`);
 * - (d) cazurile de pe hârtie: punctele ajung exact unde au fost calculate de mână, în ordinea de acolo;
 * - (e) otrăvurile sunt refuzate la ușă, iar documentele valide dificile trec, cu aceiași biți ca oracolul (precizarea 3
 *   fixează parantezele și formula rotirii);
 * - (f) o schemă mai nouă (3) e refuzată;
 * - (g) un v2 valid trece neschimbat prin ușă (câmpurile necunoscute, `campuri` cu chei capcană), iar octeții lui
 *   canonici nu depind de drumul pe care a venit (precizarea 10);
 * - (h) documentele v1 de nemigrat (margini, formă, ciocniri, adâncime, schema 1) sunt refuzate, cu motiv.
 * Numerele se compară cu `===` (−0 = 0), nu cu `deepStrictEqual`, care le deosebește.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import {
  aplicaO, diferenta, geometrieV1, geometrieV2, migreazaV1O, verificaV1, verificaV2, type DocV2O, type ElementLumeO, type Liber,
} from '../oracles/document.ts';
import {
  CAZURI_HARTIE, CORPUS_V1, MIGRARI_HARTIE, OTRAVURI_V2, REFUZATE_V1, V1_LA_PLAFON, VALIDE_DIFICILE,
} from '../oracles/document.cazuri.ts';

type DocApp = Parameters<typeof elementeFoaie>[0];

/** Documentul primit de `incarca`; un refuz pică testul, cu motivul. */
function accepta(brut: unknown): DocApp {
  const r = incarca(brut);
  if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
  return r.doc;
}

/** Documentul aplicației, citit de oracol ca date. */
const ca = (d: DocApp): DocV2O => d as unknown as DocV2O;

/** Lista aplicației, în forma oracolului; `idLume` trebuie să fie `<instanță>/<nod>`. */
function lumeaAplicatiei(doc: DocApp, indexFoaie = 0): ElementLumeO[] {
  return elementeFoaie(doc, indexFoaie).map((e) => {
    assert.equal(e.idLume, `${e.instanta}/${e.nod}`, `idLume ${e.idLume} nu e instanța/nodul`);
    return { idLume: e.idLume, forma: e.forma, matrice: e.matrice };
  });
}

/** Aceleași id-uri în aceeași ordine, aceeași formă, aceeași matrice (fiecare componentă `===`). */
function aceeasiLume(real: readonly ElementLumeO[], asteptat: readonly ElementLumeO[]): void {
  assert.deepEqual(real.map((e) => e.idLume), asteptat.map((e) => e.idLume), 'id-urile în lume și ordinea lor');
  real.forEach((e, k) => {
    const o = asteptat[k] as ElementLumeO;
    const df = diferenta(e.forma, o.forma);
    assert.ok(df === undefined, `${e.idLume}: forma diferă (${df})`);
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f'] as const) {
      const x = e.matrice[c];
      const y = o.matrice[c];
      assert.ok(x === y, `${e.idLume}: matrice.${c} = ${x}, aștept ${y}`);
    }
  });
}

/** Octeții canonici, ca text (dacă `jsonCanonic` dă octeți, se decodează). */
const text = (b: ReturnType<typeof jsonCanonic>): string =>
  typeof b === 'string' ? b : new TextDecoder().decode(b as unknown as Uint8Array);

test('VERSIUNE_SCHEMA e 2', () => {
  assert.equal(VERSIUNE_SCHEMA, 2);
});

for (const { nume, doc } of CORPUS_V1) {
  test(`(a) v1 → v2 păstrează geometria: ${nume}`, () => {
    assert.deepEqual(verificaV1(doc), [], 'oracolul: documentul v1 se migrează');
    const v2 = accepta(structuredClone(doc));
    assert.equal(ca(v2).schema, 2);
    assert.deepEqual(verificaV2(v2), []);
    aceeasiLume(geometrieV2(ca(v2)), geometrieV1(doc));
    aceeasiLume(lumeaAplicatiei(v2), geometrieV2(ca(v2)));
  });

  test(`(a) v1 → v2 dă exact documentul din contract: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(doc)), migreazaV1O(doc));
    assert.equal(d, undefined);
  });

  test(`(b) câmpurile necunoscute trec prin migrare: ${nume}`, () => {
    const v2 = ca(accepta(structuredClone(doc)));
    assert.equal(v2.rev, doc.rev);
    for (const [cheie, v] of Object.entries(doc)) {
      if (['schema', 'rev', 'foaie', 'elemente'].includes(cheie)) continue;
      const d = diferenta(v2[cheie], v);
      assert.ok(d === undefined, `primul nivel, ${cheie}: ${d}`);
    }
    const stoc = (v2.foi[0] as DocV2O['foi'][number]).stoc;
    for (const [cheie, v] of Object.entries(doc.foaie)) {
      const d = diferenta(stoc[cheie], v);
      assert.ok(d === undefined, `foaia → stoc, ${cheie}: ${d}`);
    }
    doc.elemente.forEach((e, i) => {
      const p = v2.piese[i] as DocV2O['piese'][number];
      assert.equal(p.id, e.id);
      assert.equal(p.nume, e.nume, `numele elementului ${e.id} stă pe piesă`);
      for (const [cheie, v] of Object.entries(e)) {
        if (['id', 'nume', 'forma', 'matrice'].includes(cheie)) continue;
        const d = diferenta((p.radacina as Liber)[cheie], v);
        assert.ok(d === undefined, `elementul ${e.id} → rădăcina piesei, ${cheie}: ${d}`);
      }
      for (const [cheie, v] of Object.entries(e.matrice)) {
        if (['a', 'b', 'c', 'd', 'e', 'f'].includes(cheie)) continue;
        const d = diferenta((p.radacina.matrice as unknown as Liber)[cheie], v);
        assert.ok(d === undefined, `matricea elementului ${e.id} → matricea rădăcinii, ${cheie}: ${d}`);
      }
    });
  });

  test(`(c) migrarea și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, 'v2 încărcat din nou');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'v2 încărcat din octeții canonici');
  });
}

test(`(a) ${V1_LA_PLAFON.nume}: se migrează și are exact 100 000 de elemente în lume`, () => {
  const { doc } = V1_LA_PLAFON;
  assert.deepEqual(verificaV1(doc), [], 'oracolul');
  const v2 = accepta(structuredClone(doc));
  assert.deepEqual(verificaV2(v2), []);
  aceeasiLume(lumeaAplicatiei(v2), geometrieV1(doc));
});

for (const { nume, v1, v2 } of MIGRARI_HARTIE) {
  test(`(a) migrarea pe hârtie: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(v1)), v2);
    assert.equal(d, undefined);
  });
}

for (const caz of CAZURI_HARTIE) {
  test(`(d) pe hârtie: ${caz.nume}`, () => {
    assert.deepEqual(verificaV2(caz.doc), [], 'oracolul: documentul cazului e valid');
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

for (const o of OTRAVURI_V2) {
  test(`(e) otrava [${o.categorie}] e refuzată: ${o.nume}`, () => {
    const probleme = verificaV2(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    assert.equal(incarca(o.doc).ok, false, 'aplicația a primit otrava');
  });
}

for (const v of VALIDE_DIFICILE) {
  test(`(e) valid, deși seamănă cu o otravă: ${v.nume}`, () => {
    assert.deepEqual(verificaV2(v.doc), [], 'oracolul');
    const doc = accepta(structuredClone(v.doc));
    for (let k = 0; k < v.doc.foi.length; k++) aceeasiLume(lumeaAplicatiei(doc, k), geometrieV2(v.doc, k));
  });
}

test('(f) schema 3 e refuzată', () => {
  const d = structuredClone((CAZURI_HARTIE[0] as (typeof CAZURI_HARTIE)[number]).doc) as Liber;
  d['schema'] = 3;
  assert.ok(verificaV2(d).some((p) => p.startsWith('[schema]')));
  assert.equal(incarca(d).ok, false);
});

for (const { nume, doc } of [...VALIDE_DIFICILE, ...CAZURI_HARTIE]) {
  test(`(g) un v2 valid trece neschimbat prin ușă: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, doc), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

for (const r of REFUZATE_V1) {
  test(`(h) v1 de nemigrat e refuzat [${r.motiv}]: ${r.nume}`, () => {
    const probleme = verificaV1(r.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${r.motiv}]`)), `oracolul nu vede [${r.motiv}]: ${probleme.slice(0, 5).join('; ')}`);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}
