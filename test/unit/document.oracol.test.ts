/**
 * Documentul v4 (ADR 0024 + ADR 0025 + ADR 0027) judecat de oracolul lui independent (`test/oracles/document.ts`,
 * scris doar din contracte). Două feluri de teste:
 * - „(o) …”: oracolul singur, pe hârtie (fără aplicație): migrările scrise de mână, tăieturile scrise de mână,
 *   otrăvurile cu categoria lor, corpusurile valide, puritatea migrării. Prind o greșeală a oracolului însuși;
 * - lipirea cu aplicația (`incarca`, `elementeFoaie`, `taieturiFoaie`), ca până acum, adusă la v4:
 *   - (a) fiecare document v1, v2 și v3 al corpusurilor se migrează în exact v4-ul cerut de contracte (v1 → v2 → v3 →
 *     v4, în lanț), cu aceeași geometrie; `elementeFoaie` și `taieturiFoaie` dau exact elementele și tăieturile
 *     oracolului;
 *   - (b) câmpurile necunoscute trec prin migrare, la locul lor; din v2 rămâne tot, în afară de `schema` și
 *     `operatii`; din v3 rămâne tot, în afară de `schema` și de `sens` pe operații;
 *   - (c) migrarea și încărcarea sunt idempotente la octet (`jsonCanonic`);
 *   - (d) cazurile de pe hârtie: punctele ajung exact unde au fost calculate de mână, în ordinea de acolo;
 *   - (t) tăieturile de pe hârtie: lista scrisă de mână, câmp cu câmp (ordinea claselor, a instanțelor, a operațiilor
 *     și a nodurilor; matricele `===`; sensul, dacă aplicația îl pune pe tăietură), pentru aplicație și pentru oracol;
 *   - (e) otrăvurile (v2, v3 și v4, cu ale sensului) sunt refuzate la ușă, iar documentele v4 valide dificile și
 *     corpusul v4 trec, cu aceleași elemente și tăieturi ca oracolul;
 *   - (f) o schemă mai nouă (5) e refuzată;
 *   - (g) un v4 valid trece neschimbat prin ușă (câmpuri necunoscute, chei capcană), iar octeții lui canonici nu depind
 *     de drumul pe care a venit (precizarea 10);
 *   - (h) documentele vechi de nemigrat (v1: margini, formă, ciocniri, adâncime, schema 1; v2: o piesă care are deja
 *     `operatii`; v3: o operație care are deja `sens`) sunt refuzate, cu motiv.
 * Numerele se compară cu `===` (−0 = 0), nu cu `deepStrictEqual`, care le deosebește. `idLume` nu e unic între
 * tăieturi (un element în două operații dă două), deci tăieturile se compară pe poziție, nu după id.
 *
 * ALEGERE (ADR 0027 tace): tăietura aplicației (`taieturiFoaie`) poate avea exact cele 11 câmpuri din 2.2, sau acestea
 * plus `sens`; dacă îl are, trebuie să fie sensul operației ei. Sensul programului îl judecă invarianta 9.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { elementeFoaie, taieturiFoaie } from '../../src/model/lume.ts';
import {
  aplicaO, CAMPURI_TAIETURA_O, categoriiO, diferenta, geometrieV1, geometrieV2, migreazaV1V4O, migreazaV2V4O,
  migreazaV3V4O, ridicaO, SCHEMA_CURENTA_O, SENS_IMPLICIT_O, SENSURI_O, taieturiV4O, verificaO, verificaV1, verificaV2V3, verificaV2V4, verificaV3,
  verificaV3V4, verificaV4,
  type DocV2O, type DocV3O, type DocV4O, type ElementLumeO, type Liber, type TaieturaO, type TaieturaV4O,
} from '../oracles/document.ts';
import {
  CAZURI_HARTIE, CAZURI_TAIETURI, CORPUS_V1, CORPUS_V2, CORPUS_V3, CORPUS_V4, MIGRARI_HARTIE, MIGRARI_V2_HARTIE,
  MIGRARI_V3_HARTIE, OTRAVURI_V2, OTRAVURI_V3, OTRAVURI_V4, REFUZATE_V1, REFUZATE_V2, REFUZATE_V3, V1_LA_PLAFON,
  VALIDE_DIFICILE, VALIDE_DIFICILE_V3, VALIDE_DIFICILE_V4,
} from '../oracles/document.cazuri.ts';

type DocApp = Parameters<typeof elementeFoaie>[0];

/** Documentul primit de `incarca`; un refuz pică testul, cu motivul. */
function accepta(brut: unknown): DocApp {
  const r = incarca(brut);
  if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
  return r.doc;
}

/** Documentul aplicației, citit de oracol ca date. */
const ca = (d: DocApp): DocV4O => d as unknown as DocV4O;

/** Lista aplicației, în forma oracolului; `idLume` trebuie să fie `<instanță>/<nod>`. */
function lumeaAplicatiei(doc: DocApp, indexFoaie = 0): ElementLumeO[] {
  return elementeFoaie(doc, indexFoaie).map((e) => {
    assert.equal(e.idLume, `${e.instanta}/${e.nod}`, `idLume ${e.idLume} nu e instanța/nodul`);
    return { idLume: e.idLume, forma: e.forma, matrice: e.matrice };
  });
}

/** Cum își scrie aplicația tăieturile: cu `sens` pe ele sau fără (ALEGERE din antet); se raportează o dată. */
const formeTaietura = new Set<string>();

/**
 * Tăieturile aplicației, citite ca date: fiecare are exact câmpurile contractului (cele 11, eventual și `sens`), iar
 * `idLume` e instanța/nodul.
 */
function taieturileAplicatiei(doc: DocApp, indexFoaie = 0): Array<TaieturaO & { sens?: unknown }> {
  const fara = [...CAMPURI_TAIETURA_O].sort();
  const cu = [...CAMPURI_TAIETURA_O, 'sens'].sort();
  return (taieturiFoaie(doc, indexFoaie) as readonly object[]).map((x) => {
    const chei = Object.keys(x).sort();
    const potrivite = JSON.stringify(chei) === JSON.stringify(fara) ? 'fără sens' : JSON.stringify(chei) === JSON.stringify(cu) ? 'cu sens' : null;
    assert.ok(potrivite, `câmpurile unei tăieturi: ${chei.join(', ')}`);
    formeTaietura.add(potrivite);
    const t = x as unknown as TaieturaO & { sens?: unknown };
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

/**
 * Aceleași tăieturi în aceeași ordine: scalarii `===`, scula și forma prin `diferenta`, matricea `===`; sensul, când
 * lista reală îl are (oracolul îl are mereu).
 */
function aceleasiTaieturi(real: ReadonlyArray<TaieturaO & { sens?: unknown }>, asteptat: readonly TaieturaV4O[], cine = 'aplicația'): void {
  const chei = (l: ReadonlyArray<TaieturaO>): string[] => l.map((x) => `${x.idLume}#${x.operatie}`);
  aceleasiChei(chei(real), chei(asteptat), `${cine}: tăieturile (idLume#operație) și ordinea lor`);
  real.forEach((x, k) => {
    const o = asteptat[k] as TaieturaV4O;
    const unde = `${cine}, tăietura ${k} (${x.idLume}#${x.operatie})`;
    for (const c of ['idLume', 'instanta', 'piesa', 'operatie', 'nod', 'latura', 'adancime', 'pas'] as const) {
      assert.ok(x[c] === o[c], `${unde}: ${c} = ${String(x[c])}, aștept ${String(o[c])}`);
    }
    if (Object.hasOwn(x, 'sens')) assert.ok(x.sens === o.sens, `${unde}: sens = ${String(x.sens)}, aștept ${o.sens}`);
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
function aceeasiFoaie(doc: DocApp, asteptat: DocV4O): void {
  assert.equal(ca(doc).foi.length, asteptat.foi.length, 'numărul de foi');
  for (let k = 0; k < asteptat.foi.length; k++) {
    aceeasiLume(lumeaAplicatiei(doc, k), geometrieV2(asteptat, k));
    aceleasiTaieturi(taieturileAplicatiei(doc, k), taieturiV4O(asteptat, k));
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

/** Un document fără operațiile lui de sens: schema dată, `sens` scos de pe fiecare operație. */
function faraSens(d: unknown, schema: number): Liber {
  const c = structuredClone(d) as Liber;
  c['schema'] = schema;
  for (const p of c['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['sens'];
  return c;
}

// ── Oracolul singur, pe hârtie ──────────────────────────────────────────────────────────────────────────────────────

test('(o) versiunea curentă a oracolului e 4; sensurile primite sunt exact urcare și opozitie; implicitul e urcare', () => {
  assert.equal(SCHEMA_CURENTA_O, 4);
  assert.deepEqual([...SENSURI_O], ['urcare', 'opozitie']);
  assert.equal(SENS_IMPLICIT_O, 'urcare');
});

for (const { nume, v1, v4 } of MIGRARI_HARTIE) {
  test(`(o) oracolul migrează v1 → v4 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV1(v1), []);
    assert.equal(diferenta(migreazaV1V4O(v1), v4), undefined);
    assert.deepEqual(verificaV4(v4), []);
  });
}

for (const { nume, v2, v4 } of MIGRARI_V2_HARTIE) {
  test(`(o) oracolul migrează v2 → v4 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV2V4(v2), []);
    assert.equal(diferenta(migreazaV2V4O(v2), v4), undefined);
    assert.deepEqual(verificaV4(v4), []);
  });
}

for (const { nume, v3, v4 } of MIGRARI_V3_HARTIE) {
  test(`(o) oracolul migrează v3 → v4 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV3(v3), []);
    assert.deepEqual(verificaV3V4(v3), []);
    assert.deepEqual(verificaO(v3), []);
    assert.equal(diferenta(migreazaV3V4O(v3), v4), undefined);
    assert.equal(diferenta(ridicaO(v3), v4), undefined);
    assert.deepEqual(verificaV4(v4), []);
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
    assert.equal(diferenta(faraSens(a, 3), doc), undefined);
  }
});

for (const caz of CAZURI_TAIETURI) {
  test(`(o) tăieturile oracolului pe hârtie, cu sensul: ${caz.nume}`, () => {
    assert.deepEqual(verificaO(caz.doc), []);
    aceleasiTaieturi(taieturiV4O(ridicaO(caz.doc), caz.indexFoaie), caz.taieturi, 'oracolul');
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

test('(o) otrăvurile v3 rămân otrăvuri pentru ușa v4 (verificaO), cu categoria lor', () => {
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

test('(o) corpusurile: v3 se migrează, v4 e valid și are ambele sensuri și capcanele „sens” în afara operației', () => {
  for (const { nume, doc } of CORPUS_V3) assert.deepEqual(verificaV3V4(doc), [], nume);
  const sensuri = new Map<string, number>();
  let capcane = 0;
  for (const { nume, doc } of [...CORPUS_V4, ...VALIDE_DIFICILE_V4]) {
    assert.deepEqual(verificaV4(doc), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
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

test('(o) schema 5, „4” ca text și 3.5 sunt refuzate de oracol; v2 și v1 ajung la v4 prin lanț', () => {
  const d = structuredClone(VALIDE_DIFICILE_V4[1]!.doc) as Liber;
  for (const s of [5, '4', 3.5, 0, null]) {
    d['schema'] = s;
    assert.deepEqual(categoriiO(verificaO(d)), ['schema'], String(s));
  }
  assert.equal(ridicaO(CORPUS_V2[0]!.doc).schema, 4);
  assert.equal(ridicaO(CORPUS_V1[0]!.doc).schema, 4);
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('VERSIUNE_SCHEMA e 4', () => {
  assert.equal(VERSIUNE_SCHEMA, 4);
});

for (const { nume, doc } of CORPUS_V1) {
  test(`(a) v1 → v4 păstrează geometria și dă tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV1(doc), [], 'oracolul: documentul v1 se migrează');
    const v4 = accepta(structuredClone(doc));
    assert.equal(ca(v4).schema, 4);
    assert.deepEqual(verificaV4(v4), []);
    aceeasiLume(geometrieV2(ca(v4)), geometrieV1(doc));
    aceeasiFoaie(v4, migreazaV1V4O(doc));
  });

  test(`(a) v1 → v4 dă exact documentul din contracte: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(doc)), migreazaV1V4O(doc));
    assert.equal(d, undefined);
  });

  test(`(b) câmpurile necunoscute trec prin migrarea v1 → v4: ${nume}`, () => {
    const v4 = ca(accepta(structuredClone(doc)));
    assert.equal(v4.rev, doc.rev);
    for (const [cheie, v] of Object.entries(doc)) {
      if (['schema', 'rev', 'foaie', 'elemente'].includes(cheie)) continue;
      const d = diferenta(v4[cheie], v);
      assert.ok(d === undefined, `primul nivel, ${cheie}: ${d}`);
    }
    const stoc = (v4.foi[0] as DocV4O['foi'][number]).stoc;
    for (const [cheie, v] of Object.entries(doc.foaie)) {
      const d = diferenta(stoc[cheie], v);
      assert.ok(d === undefined, `foaia → stoc, ${cheie}: ${d}`);
    }
    doc.elemente.forEach((e, i) => {
      const p = v4.piese[i] as DocV4O['piese'][number];
      assert.equal(p.id, e.id);
      assert.equal(p.nume, e.nume, `numele elementului ${e.id} stă pe piesă`);
      for (const o of p.operatii) assert.equal(o.sens, 'urcare', `operația ${o.id} a piesei ${p.id}`);
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

  test(`(c) migrarea v1 → v4 și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, 'v4 încărcat din nou');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'v4 încărcat din octeții canonici');
  });
}

test(`(a) ${V1_LA_PLAFON.nume}: se migrează, cu exact 100 000 de elemente și de tăieturi în lume`, () => {
  const { doc } = V1_LA_PLAFON;
  assert.deepEqual(verificaV1(doc), [], 'oracolul');
  const v4 = accepta(structuredClone(doc));
  assert.deepEqual(verificaV4(v4), []);
  aceeasiLume(lumeaAplicatiei(v4), geometrieV1(doc));
  const taieturi = taieturileAplicatiei(v4);
  assert.equal(taieturi.length, 100_000);
  aceleasiTaieturi(taieturi, taieturiV4O(migreazaV1V4O(doc)));
});

for (const { nume, doc } of [...CORPUS_V2, ...VALIDE_DIFICILE]) {
  test(`(a) v2 → v4 dă exact documentul din contracte, cu elementele și tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV2V4(doc), [], 'oracolul: documentul v2 se migrează');
    const v4 = accepta(structuredClone(doc));
    assert.equal(ca(v4).schema, 4);
    const asteptat = migreazaV2V4O(doc);
    const d = diferenta(v4, asteptat);
    assert.equal(d, undefined);
    for (let k = 0; k < doc.foi.length; k++) aceeasiLume(geometrieV2(ca(v4), k), geometrieV2(doc, k));
    aceeasiFoaie(v4, asteptat);
  });

  if (mare(doc)) continue;

  test(`(b) din v2 rămâne tot, în afară de schema și de operatii: ${nume}`, () => {
    const c = structuredClone(ca(accepta(structuredClone(doc)))) as Liber;
    assert.equal(c['schema'], 4);
    c['schema'] = 2;
    for (const p of c['piese'] as Liber[]) {
      assert.ok(Array.isArray(p['operatii']), `piesa ${String(p['id'])} n-are lista operatii`);
      delete p['operatii'];
    }
    assert.equal(diferenta(c, doc), undefined);
  });

  test(`(c) migrarea v2 → v4 și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, 'v4 încărcat din nou');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'v4 încărcat din octeții canonici');
  });
}

for (const { nume, doc } of [...CORPUS_V3, ...VALIDE_DIFICILE_V3]) {
  test(`(a) v3 → v4 dă exact documentul din contract (sens: urcare), cu elementele și tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV3V4(doc), [], 'oracolul: documentul v3 se migrează');
    const v4 = accepta(structuredClone(doc));
    assert.equal(ca(v4).schema, 4);
    const asteptat = migreazaV3V4O(doc);
    assert.equal(diferenta(v4, asteptat), undefined);
    aceeasiFoaie(v4, asteptat);
  });

  if (mare(doc)) continue;

  test(`(b) din v3 rămâne tot, în afară de schema și de sensul operațiilor: ${nume}`, () => {
    const c = ca(accepta(structuredClone(doc)));
    assert.equal(c.schema, 4);
    for (const p of c.piese) for (const o of p.operatii) assert.equal(o.sens, 'urcare', `${p.id}/${o.id}`);
    assert.equal(diferenta(faraSens(c, 3), doc), undefined);
  });

  test(`(c) migrarea v3 → v4 și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, 'v4 încărcat din nou');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'v4 încărcat din octeții canonici');
  });
}

for (const { nume, v1, v4 } of MIGRARI_HARTIE) {
  test(`(a) migrarea v1 → v4 pe hârtie: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(v1)), v4);
    assert.equal(d, undefined);
  });
}

for (const { nume, v2, v4 } of MIGRARI_V2_HARTIE) {
  test(`(a) migrarea v2 → v4 pe hârtie: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(v2)), v4);
    assert.equal(d, undefined);
  });
}

for (const { nume, v3, v4 } of MIGRARI_V3_HARTIE) {
  test(`(a) migrarea v3 → v4 pe hârtie: ${nume}`, () => {
    const d = diferenta(accepta(structuredClone(v3)), v4);
    assert.equal(d, undefined);
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

for (const caz of CAZURI_TAIETURI) {
  test(`(t) tăieturile pe hârtie: ${caz.nume}`, () => {
    assert.deepEqual(verificaO(caz.doc), [], 'oracolul: documentul cazului e primit');
    const doc = accepta(structuredClone(caz.doc));
    aceleasiTaieturi(taieturileAplicatiei(doc, caz.indexFoaie), caz.taieturi, 'aplicația');
    aceleasiTaieturi(taieturiV4O(ridicaO(caz.doc), caz.indexFoaie), caz.taieturi, 'oracolul');
  });
}

for (const o of OTRAVURI_V4) {
  test(`(e) otrava v4 [${o.categorie}] e refuzată: ${o.nume}`, () => {
    const probleme = verificaV4(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    assert.equal(incarca(o.doc).ok, false, 'aplicația a primit otrava');
  });
}

for (const o of OTRAVURI_V3) {
  test(`(e) otrava v3 [${o.categorie}] e refuzată (nu se migrează): ${o.nume}`, () => {
    const probleme = verificaV3(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    assert.ok(verificaO(o.doc).length > 0, 'oracolul (ușa v4) ar primi otrava');
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

for (const v of [...VALIDE_DIFICILE_V4, ...CORPUS_V4]) {
  test(`(e) v4 valid, deși seamănă cu o otravă: ${v.nume}`, () => {
    assert.deepEqual(verificaV4(v.doc), [], 'oracolul');
    aceeasiFoaie(accepta(structuredClone(v.doc)), v.doc);
  });
}

test('(f) schema 5 e refuzată', () => {
  const d = structuredClone((VALIDE_DIFICILE_V4[1] as (typeof VALIDE_DIFICILE_V4)[number]).doc) as Liber;
  d['schema'] = 5;
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

/** Documente v4 valide: cele scrise ca v4 și v4-urile oracolului din v3-urile, v2-urile de pe hârtie și dificile. */
const V4_VALIDE: ReadonlyArray<{ readonly nume: string; readonly doc: DocV4O }> = [
  ...VALIDE_DIFICILE_V4.filter((c) => !mare(c.doc)),
  ...CORPUS_V4,
  ...unice(CAZURI_TAIETURI.filter((c) => c.doc.schema === 4)).map((c) => ({ nume: c.nume, doc: c.doc as DocV4O })),
  ...unice(CAZURI_TAIETURI.filter((c) => c.doc.schema === 3)).map((c) => ({ nume: `${c.nume} (migrat de oracol)`, doc: migreazaV3V4O(c.doc as DocV3O) })),
  ...unice<{ readonly nume: string; readonly doc: DocV2O }>([...CAZURI_HARTIE, ...VALIDE_DIFICILE].filter((c) => !mare(c.doc)))
    .map((c) => ({ nume: `${c.nume} (migrat de oracol)`, doc: migreazaV2V4O(c.doc) })),
];

for (const { nume, doc } of V4_VALIDE) {
  test(`(g) un v4 valid trece neschimbat prin ușă: ${nume}`, () => {
    assert.deepEqual(verificaV4(doc), [], 'oracolul');
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, doc), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

for (const r of [...REFUZATE_V1, ...REFUZATE_V2, ...REFUZATE_V3]) {
  test(`(h) un document vechi de nemigrat e refuzat [${r.motiv}]: ${r.nume}`, () => {
    const probleme = verificaO(r.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${r.motiv}]`)), `oracolul nu vede [${r.motiv}]: ${probleme.slice(0, 5).join('; ')}`);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

test('raport: forma tăieturilor aplicației (cu sau fără sens)', () => {
  // Rulează după celelalte (ordinea fișierului); doar spune ce a văzut.
  console.log(`tăieturile aplicației: ${[...formeTaietura].join(', ') || 'necitite'}`);
});
