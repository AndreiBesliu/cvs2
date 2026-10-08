/**
 * Documentul v3 (ADR 0024 + ADR 0025) judecat de oracolul lui independent (`test/oracles/document.ts`, scris doar din
 * contracte). Înlocuiește `document.v2.oracol.test.ts`:
 * - (a) fiecare document v1 și v2 al corpusurilor se migrează în exact v3-ul cerut de contracte (v1 → v2 → v3, în
 *   lanț), cu aceeași geometrie; `elementeFoaie` și `taieturiFoaie` dau exact elementele și tăieturile oracolului;
 * - (b) câmpurile necunoscute trec prin migrare, la locul lor; din v2 rămâne tot, în afară de `schema` și `operatii`;
 * - (c) migrarea și încărcarea sunt idempotente la octet (`jsonCanonic`);
 * - (d) cazurile de pe hârtie: punctele ajung exact unde au fost calculate de mână, în ordinea de acolo;
 * - (t) tăieturile de pe hârtie: lista scrisă de mână, câmp cu câmp (ordinea claselor, a instanțelor, a operațiilor
 *   și a nodurilor; matricele `===`), pentru aplicație și pentru oracol;
 * - (e) otrăvurile sunt refuzate la ușă, iar documentele v3 valide dificile și corpusul v3 trec, cu aceleași elemente
 *   și tăieturi ca oracolul (precizarea 3 fixează parantezele și formula rotirii, deci biții sunt aceiași);
 * - (f) o schemă mai nouă (4) e refuzată;
 * - (g) un v3 valid trece neschimbat prin ușă (câmpuri necunoscute, chei capcană), iar octeții lui canonici nu depind
 *   de drumul pe care a venit (precizarea 10);
 * - (h) documentele vechi de nemigrat (v1: margini, formă, ciocniri, adâncime, schema 1; v2: o piesă care are deja
 *   `operatii`) sunt refuzate, cu motiv.
 * Numerele se compară cu `===` (−0 = 0), nu cu `deepStrictEqual`, care le deosebește. `idLume` nu e unic între
 * tăieturi (un element în două operații dă două), deci tăieturile se compară pe poziție, nu după id.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { elementeFoaie, taieturiFoaie } from '../../src/model/lume.ts';
import {
  aplicaO, CAMPURI_TAIETURA_O, diferenta, geometrieV1, geometrieV2, migreazaV1V3O, migreazaV2V3O, ridicaO,
  taieturiV3O, verificaO, verificaV1, verificaV2V3, verificaV3,
  type DocV2O, type DocV3O, type ElementLumeO, type Liber, type TaieturaO,
} from '../oracles/document.ts';
import {
  CAZURI_HARTIE, CAZURI_TAIETURI, CORPUS_V1, CORPUS_V2, CORPUS_V3, MIGRARI_HARTIE, MIGRARI_V2_HARTIE, OTRAVURI_V2,
  OTRAVURI_V3, REFUZATE_V1, REFUZATE_V2, V1_LA_PLAFON, VALIDE_DIFICILE, VALIDE_DIFICILE_V3,
} from '../oracles/document.cazuri.ts';

type DocApp = Parameters<typeof elementeFoaie>[0];

/** Documentul primit de `incarca`; un refuz pică testul, cu motivul. */
function accepta(brut: unknown): DocApp {
  const r = incarca(brut);
  if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
  return r.doc;
}

/** Documentul aplicației, citit de oracol ca date. */
const ca = (d: DocApp): DocV3O => d as unknown as DocV3O;

/** Lista aplicației, în forma oracolului; `idLume` trebuie să fie `<instanță>/<nod>`. */
function lumeaAplicatiei(doc: DocApp, indexFoaie = 0): ElementLumeO[] {
  return elementeFoaie(doc, indexFoaie).map((e) => {
    assert.equal(e.idLume, `${e.instanta}/${e.nod}`, `idLume ${e.idLume} nu e instanța/nodul`);
    return { idLume: e.idLume, forma: e.forma, matrice: e.matrice };
  });
}

/** Tăieturile aplicației, citite ca date: fiecare are exact câmpurile contractului, iar `idLume` e instanța/nodul. */
function taieturileAplicatiei(doc: DocApp, indexFoaie = 0): TaieturaO[] {
  return (taieturiFoaie(doc, indexFoaie) as readonly object[]).map((x) => {
    assert.deepEqual(Object.keys(x).sort(), [...CAMPURI_TAIETURA_O].sort(), 'câmpurile unei tăieturi');
    const t = x as unknown as TaieturaO;
    assert.equal(t.idLume, `${t.instanta}/${t.nod}`, `idLume ${t.idLume} nu e instanța/nodul`);
    return t;
  });
}

/**
 * Două liste de chei egale, element cu element; la prima diferență, poziția și cele două valori. (Pe 100 000 de
 * elemente, `assert.deepEqual` calculează un diff care durează minute: un test roșu ar arăta ca unul blocat.)
 */
function aceleasiChei(real: readonly string[], asteptat: readonly string[], mesaj: string): void {
  const n = Math.max(real.length, asteptat.length);
  for (let k = 0; k < n; k++) {
    if (real[k] !== asteptat[k]) {
      assert.fail(`${mesaj}: la poziția ${k}, ${JSON.stringify(real[k])} ≠ ${JSON.stringify(asteptat[k])} (lungimi ${real.length} și ${asteptat.length})`);
    }
  }
}

/** Aceleași id-uri în aceeași ordine, aceeași formă, aceeași matrice (fiecare componentă `===`). */
function aceeasiLume(real: readonly ElementLumeO[], asteptat: readonly ElementLumeO[]): void {
  aceleasiChei(real.map((e) => e.idLume), asteptat.map((e) => e.idLume), 'id-urile în lume și ordinea lor');
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

/** Aceleași tăieturi în aceeași ordine: scalarii `===`, scula și forma prin `diferenta`, matricea `===`. */
function aceleasiTaieturi(real: readonly TaieturaO[], asteptat: readonly TaieturaO[], cine = 'aplicația'): void {
  const chei = (l: readonly TaieturaO[]): string[] => l.map((x) => `${x.idLume}#${x.operatie}`);
  aceleasiChei(chei(real), chei(asteptat), `${cine}: tăieturile (idLume#operație) și ordinea lor`);
  real.forEach((x, k) => {
    const o = asteptat[k] as TaieturaO;
    const unde = `${cine}, tăietura ${k} (${x.idLume}#${x.operatie})`;
    for (const c of ['idLume', 'instanta', 'piesa', 'operatie', 'nod', 'latura', 'adancime', 'pas'] as const) {
      assert.ok(x[c] === o[c], `${unde}: ${c} = ${String(x[c])}, aștept ${String(o[c])}`);
    }
    const ds = diferenta(x.scula, o.scula);
    assert.ok(ds === undefined, `${unde}: scula diferă (${ds})`);
    const df = diferenta(x.forma, o.forma);
    assert.ok(df === undefined, `${unde}: forma diferă (${df})`);
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f'] as const) {
      assert.ok(x.matrice[c] === o.matrice[c], `${unde}: matrice.${c} = ${x.matrice[c]}, aștept ${o.matrice[c]}`);
    }
  });
}

/** Elementele și tăieturile fiecărei foi, aplicația față de oracol. */
function aceeasiFoaie(doc: DocApp, asteptat: DocV3O): void {
  assert.equal(ca(doc).foi.length, asteptat.foi.length, 'numărul de foi');
  for (let k = 0; k < asteptat.foi.length; k++) {
    aceeasiLume(lumeaAplicatiei(doc, k), geometrieV2(asteptat, k));
    aceleasiTaieturi(taieturileAplicatiei(doc, k), taieturiV3O(asteptat, k));
  }
}

/**
 * Un document mare (peste 20 000 de noduri și instanțe): trece o dată prin (a) și prin (e), cu tot cu documentul exact,
 * dar nu și prin încărcările repetate din (b), (c) și (g), care nu depind de mărime și ar costa zeci de secunde.
 */
function mare(d: { readonly piese: ReadonlyArray<{ readonly radacina: unknown }>; readonly foi: ReadonlyArray<{ readonly instante: readonly unknown[] }> }): boolean {
  let n = d.foi.reduce((s, f) => s + f.instante.length, 0);
  const stiva: unknown[] = d.piese.map((p) => p.radacina);
  for (let x = stiva.pop(); x !== undefined; x = stiva.pop()) {
    n++;
    const copii = (x as Liber)['copii'];
    if (Array.isArray(copii)) stiva.push(...(copii as unknown[]));
  }
  return n > 20_000;
}

/** Octeții canonici, ca text (dacă `jsonCanonic` dă octeți, se decodează). */
const text = (b: ReturnType<typeof jsonCanonic>): string =>
  typeof b === 'string' ? b : new TextDecoder().decode(b as unknown as Uint8Array);

test('VERSIUNE_SCHEMA e 3', () => {
  assert.equal(VERSIUNE_SCHEMA, 3);
});

for (const { nume, doc } of CORPUS_V1) {
  test(`(a) v1 → v3 păstrează geometria și dă tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV1(doc), [], 'oracolul: documentul v1 se migrează');
    const v3 = accepta(structuredClone(doc));
    assert.equal(ca(v3).schema, 3);
    assert.deepEqual(verificaV3(v3), []);
    aceeasiLume(geometrieV2(ca(v3)), geometrieV1(doc));
    aceeasiFoaie(v3, migreazaV1V3O(doc));
  });

  test(`(a) v1 → v3 dă exact documentul din contracte: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(doc)), migreazaV1V3O(doc));
    assert.equal(d, undefined);
  });

  test(`(b) câmpurile necunoscute trec prin migrarea v1 → v3: ${nume}`, () => {
    const v3 = ca(accepta(structuredClone(doc)));
    assert.equal(v3.rev, doc.rev);
    for (const [cheie, v] of Object.entries(doc)) {
      if (['schema', 'rev', 'foaie', 'elemente'].includes(cheie)) continue;
      const d = diferenta(v3[cheie], v);
      assert.ok(d === undefined, `primul nivel, ${cheie}: ${d}`);
    }
    const stoc = (v3.foi[0] as DocV3O['foi'][number]).stoc;
    for (const [cheie, v] of Object.entries(doc.foaie)) {
      const d = diferenta(stoc[cheie], v);
      assert.ok(d === undefined, `foaia → stoc, ${cheie}: ${d}`);
    }
    doc.elemente.forEach((e, i) => {
      const p = v3.piese[i] as DocV3O['piese'][number];
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

  test(`(c) migrarea v1 → v3 și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, 'v3 încărcat din nou');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'v3 încărcat din octeții canonici');
  });
}

test(`(a) ${V1_LA_PLAFON.nume}: se migrează, cu exact 100 000 de elemente și de tăieturi în lume`, () => {
  const { doc } = V1_LA_PLAFON;
  assert.deepEqual(verificaV1(doc), [], 'oracolul');
  const v3 = accepta(structuredClone(doc));
  assert.deepEqual(verificaV3(v3), []);
  aceeasiLume(lumeaAplicatiei(v3), geometrieV1(doc));
  const taieturi = taieturileAplicatiei(v3);
  assert.equal(taieturi.length, 100_000);
  aceleasiTaieturi(taieturi, taieturiV3O(migreazaV1V3O(doc)));
});

for (const { nume, doc } of [...CORPUS_V2, ...VALIDE_DIFICILE]) {
  test(`(a) v2 → v3 dă exact documentul din contract, cu elementele și tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV2V3(doc), [], 'oracolul: documentul v2 se migrează');
    const v3 = accepta(structuredClone(doc));
    assert.equal(ca(v3).schema, 3);
    const asteptat = migreazaV2V3O(doc);
    const d = diferenta(v3, asteptat);
    assert.equal(d, undefined);
    for (let k = 0; k < doc.foi.length; k++) aceeasiLume(geometrieV2(ca(v3), k), geometrieV2(doc, k));
    aceeasiFoaie(v3, asteptat);
  });

  if (mare(doc)) continue;

  test(`(b) din v2 rămâne tot, în afară de schema și de operatii: ${nume}`, () => {
    const c = structuredClone(ca(accepta(structuredClone(doc)))) as Liber;
    assert.equal(c['schema'], 3);
    c['schema'] = 2;
    for (const p of c['piese'] as Liber[]) {
      assert.ok(Array.isArray(p['operatii']), `piesa ${String(p['id'])} n-are lista operatii`);
      delete p['operatii'];
    }
    assert.equal(diferenta(c, doc), undefined);
  });

  test(`(c) migrarea v2 → v3 și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, 'v3 încărcat din nou');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'v3 încărcat din octeții canonici');
  });
}

for (const { nume, v1, v3 } of MIGRARI_HARTIE) {
  test(`(a) migrarea v1 → v3 pe hârtie: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(v1)), v3);
    assert.equal(d, undefined);
  });
}

for (const { nume, v2, v3 } of MIGRARI_V2_HARTIE) {
  test(`(a) migrarea v2 → v3 pe hârtie: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(v2)), v3);
    assert.equal(d, undefined);
  });
}

for (const caz of CAZURI_HARTIE) {
  test(`(d) pe hârtie: ${caz.nume}`, () => {
    assert.deepEqual(verificaV2V3(caz.doc), [], 'oracolul: documentul cazului e valid');
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

for (const caz of CAZURI_TAIETURI) {
  test(`(t) tăieturile pe hârtie: ${caz.nume}`, () => {
    assert.deepEqual(verificaO(caz.doc), [], 'oracolul: documentul cazului e primit');
    const doc = accepta(structuredClone(caz.doc));
    aceleasiTaieturi(taieturileAplicatiei(doc, caz.indexFoaie), caz.taieturi, 'aplicația');
    aceleasiTaieturi(taieturiV3O(ridicaO(caz.doc), caz.indexFoaie), caz.taieturi, 'oracolul');
  });
}

for (const o of OTRAVURI_V3) {
  test(`(e) otrava v3 [${o.categorie}] e refuzată: ${o.nume}`, () => {
    const probleme = verificaV3(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    assert.equal(incarca(o.doc).ok, false, 'aplicația a primit otrava');
  });
}

for (const o of OTRAVURI_V2) {
  test(`(e) otrava v2 [${o.categorie}] e refuzată (nu se migrează): ${o.nume}`, () => {
    const probleme = verificaV2V3(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    assert.equal(incarca(o.doc).ok, false, 'aplicația a primit otrava');
  });
}

for (const v of [...VALIDE_DIFICILE_V3, ...CORPUS_V3]) {
  test(`(e) v3 valid, deși seamănă cu o otravă: ${v.nume}`, () => {
    assert.deepEqual(verificaV3(v.doc), [], 'oracolul');
    aceeasiFoaie(accepta(structuredClone(v.doc)), v.doc);
  });
}

test('(f) schema 4 e refuzată', () => {
  const d = structuredClone((VALIDE_DIFICILE_V3[1] as (typeof VALIDE_DIFICILE_V3)[number]).doc) as Liber;
  d['schema'] = 4;
  assert.ok(verificaO(d).some((p) => p.startsWith('[schema]')));
  assert.equal(incarca(d).ok, false);
});

/** Fiecare document o singură dată (H08 / H08b, H13 / H14, T05 / T05b, T07a–c au același document). */
function unice<C extends { readonly doc: object }>(lista: readonly C[]): C[] {
  const vazute = new Set<string>();
  return lista.filter((c) => {
    const cheie = JSON.stringify(c.doc);
    if (vazute.has(cheie)) return false;
    vazute.add(cheie);
    return true;
  });
}

/** Documente v3 valide: cele scrise ca v3 și v3-urile oracolului din v2-urile de pe hârtie și dificile. */
const V3_VALIDE: ReadonlyArray<{ readonly nume: string; readonly doc: DocV3O }> = [
  ...VALIDE_DIFICILE_V3,
  ...CORPUS_V3,
  ...unice(CAZURI_TAIETURI.filter((c) => c.doc.schema === 3)).map((c) => ({ nume: c.nume, doc: c.doc as DocV3O })),
  ...unice<{ readonly nume: string; readonly doc: DocV2O }>([...CAZURI_HARTIE, ...VALIDE_DIFICILE].filter((c) => !mare(c.doc)))
    .map((c) => ({ nume: `${c.nume} (migrat de oracol)`, doc: migreazaV2V3O(c.doc) })),
];

for (const { nume, doc } of V3_VALIDE) {
  test(`(g) un v3 valid trece neschimbat prin ușă: ${nume}`, () => {
    assert.deepEqual(verificaV3(doc), [], 'oracolul');
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, doc), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

for (const r of [...REFUZATE_V1, ...REFUZATE_V2]) {
  test(`(h) un document vechi de nemigrat e refuzat [${r.motiv}]: ${r.nume}`, () => {
    const probleme = verificaO(r.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${r.motiv}]`)), `oracolul nu vede [${r.motiv}]: ${probleme.slice(0, 5).join('; ')}`);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}
