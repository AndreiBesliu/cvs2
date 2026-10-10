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
} from '../oracles/document.ts';
import {
  areRampaPeOperatii, areUrechiPeOperatii, CAZURI_HARTIE, CAZURI_TAIETURI, CORPUS_V1, CORPUS_V2, CORPUS_V3, CORPUS_V4,
  CORPUS_V5, CORPUS_V6, faraUrechiPeOperatii, MIGRARI_HARTIE, MIGRARI_V2_HARTIE, MIGRARI_V3_HARTIE, MIGRARI_V4_HARTIE,
  MIGRARI_V5_HARTIE, OTRAVURI_RAMPA, OTRAVURI_URECHI, OTRAVURI_V2, OTRAVURI_V3, OTRAVURI_V4, OTRAVURI_V5, OTRAVURI_V6,
  REFUZATE_V1, REFUZATE_V2, REFUZATE_V3, REFUZATE_V4, REFUZATE_V5, V1_LA_PLAFON, VALIDE_DIFICILE, VALIDE_DIFICILE_V3,
  VALIDE_DIFICILE_V4, VALIDE_DIFICILE_V5, VALIDE_DIFICILE_V6,
  areIntrariPeOperatii, CORPUS_V7, faraIntrariPeOperatii, MIGRARI_V6_HARTIE, OTRAVURI_INTRARI, OTRAVURI_V7, REFUZATE_V6,
  VALIDE_DIFICILE_V7,
} from '../oracles/document.cazuri.ts';

type DocApp = Parameters<typeof elementeFoaie>[0];

/** Schema aplicației: 4 (înainte de felia 2.4), 5 (înainte de 2.5a) sau 6. */
const V = VERSIUNE_SCHEMA as number;
const PE_V5 = V >= 5;
const PE_V6 = V >= 6;
const PE_V7 = V >= 7;
/** Motivul pentru care testele doar-v5 se sar. */
const DOAR_V5 = PE_V5 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v5 (ADR 0028)`;
const DOAR_V6 = PE_V6 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v6 (ADR 0029)`;
const DOAR_V7 = PE_V7 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v7 (ADR 0030)`;
/** Ce verifică ușa aplicației pe documentul schemei ei. */
const verificaSchemaApp = (d: unknown): string[] => (PE_V7 ? verificaV7(d) : PE_V6 ? verificaV6(d) : PE_V5 ? verificaV5(d) : verificaV4(d));
/** Un v5 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 5, cu `rampa: null` pe 6, și `intrari: null` pe 7. */
const v5PentruApp = (d: DocV5O): DocV5O | DocV6O | DocV7O => (PE_V7 ? migreazaV5V7O(d) : PE_V6 ? migreazaV5V6O(d) : d);
/** Un v6 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 6, cu `intrari: null` pe 7. */
const v6PentruApp = (d: DocV6O): DocV6O | DocV7O => (PE_V7 ? migreazaV6V7O(d) : d);
/** Pe 7, un document cu un câmp `intrari` pe operații se ciocnește (ADR 0030 §1). */
const ciocnesteLa7 = (d: unknown): boolean => PE_V7 && areIntrariPeOperatii(d);

/** Documentul primit de `incarca`; un refuz pică testul, cu motivul. */
function accepta(brut: unknown): DocApp {
  const r = incarca(brut);
  if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
  return r.doc;
}

/** Documentul aplicației, citit de oracol ca date. */
const ca = (d: DocApp): DocV7O => d as unknown as DocV7O;

/**
 * Ce trebuie să dea ușa aplicației pentru un document vechi, adus de oracol la v4: v4-ul însuși (aplicația pe 4) sau
 * v5-ul migrării (pe 5); `null` = refuz (pe 5: o operație care are deja un câmp `urechi`, ciocnire).
 */
function asteptatDinV4(v4: DocV4O): DocV4O | DocV5O | DocV6O | DocV7O | null {
  if (!PE_V5) return v4;
  if (areUrechiPeOperatii(v4)) return null;
  if (!PE_V6) return migreazaV4V5O(v4);
  if (areRampaPeOperatii(v4)) return null;
  if (!PE_V7) return migreazaV4V6O(v4);
  return areIntrariPeOperatii(v4) ? null : migreazaV4V7O(v4);
}

/** Lista aplicației, în forma oracolului; `idLume` trebuie să fie `<instanță>/<nod>`. */
function lumeaAplicatiei(doc: DocApp, indexFoaie = 0): ElementLumeO[] {
  return elementeFoaie(doc, indexFoaie).map((e) => {
    assert.equal(e.idLume, `${e.instanta}/${e.nod}`, `idLume ${e.idLume} nu e instanța/nodul`);
    return { idLume: e.idLume, forma: e.forma, matrice: e.matrice };
  });
}

/** Cum își scrie aplicația tăieturile: fără, cu `sens`, cu `sens` și `urechi` (ALEGERE din antet); se raportează o dată. */
const formeTaietura = new Set<string>();

type TaieturaApp = TaieturaO & { sens?: unknown; urechi?: unknown; rampa?: unknown; intrari?: unknown };

/**
 * Tăieturile aplicației, citite ca date: fiecare are exact câmpurile contractului (cele 11, eventual și `sens`, eventual
 * și `urechi`), iar `idLume` e instanța/nodul.
 */
function taieturileAplicatiei(doc: DocApp, indexFoaie = 0): TaieturaApp[] {
  const forme = new Map<string, string>([
    [JSON.stringify([...CAMPURI_TAIETURA_O].sort()), 'fără sens'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens'].sort()), 'cu sens'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi'].sort()), 'cu sens și urechi'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi', 'rampa'].sort()), 'cu sens, urechi și rampă'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi', 'rampa', 'intrari'].sort()), 'cu sens, urechi, rampă și intrări'],
  ]);
  return (taieturiFoaie(doc, indexFoaie) as readonly object[]).map((x) => {
    const chei = Object.keys(x).sort();
    const potrivite = forme.get(JSON.stringify(chei));
    assert.ok(potrivite, `câmpurile unei tăieturi: ${chei.join(', ')}`);
    formeTaietura.add(potrivite);
    const t = x as unknown as TaieturaApp;
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
 * Aceleași tăieturi în aceeași ordine: scalarii `===`, scula și forma prin `diferenta`, matricea `===`; sensul și
 * urechile, când lista reală le are (oracolul are mereu sensul; urechile, pe v5).
 */
function aceleasiTaieturi(real: readonly TaieturaApp[], asteptat: ReadonlyArray<TaieturaV4O & { urechi?: UrechiO | null; rampa?: RampaO | null; intrari?: IntrariO | null }>, cine = 'aplicația'): void {
  const chei = (l: ReadonlyArray<TaieturaO>): string[] => l.map((x) => `${x.idLume}#${x.operatie}`);
  aceleasiChei(chei(real), chei(asteptat), `${cine}: tăieturile (idLume#operație) și ordinea lor`);
  real.forEach((x, k) => {
    const o = asteptat[k] as TaieturaV4O & { urechi?: UrechiO | null; rampa?: RampaO | null; intrari?: IntrariO | null };
    const unde = `${cine}, tăietura ${k} (${x.idLume}#${x.operatie})`;
    for (const c of ['idLume', 'instanta', 'piesa', 'operatie', 'nod', 'latura', 'adancime', 'pas'] as const) {
      assert.ok(x[c] === o[c], `${unde}: ${c} = ${String(x[c])}, aștept ${String(o[c])}`);
    }
    if (Object.hasOwn(x, 'sens')) assert.ok(x.sens === o.sens, `${unde}: sens = ${String(x.sens)}, aștept ${o.sens}`);
    if (Object.hasOwn(x, 'urechi')) {
      assert.ok(Object.hasOwn(o, 'urechi'), `${unde}: urechi pe tăietura unui document v4`);
      const du = diferenta(x.urechi, o.urechi);
      assert.ok(du === undefined, `${unde}: urechile diferă (${du})`);
    }
    if (Object.hasOwn(x, 'rampa')) {
      assert.ok(Object.hasOwn(o, 'rampa'), `${unde}: rampa pe tăietura unui document mai vechi de v6`);
      const dr = diferenta(x.rampa, o.rampa);
      assert.ok(dr === undefined, `${unde}: rampele diferă (${dr})`);
    }
    if (Object.hasOwn(x, 'intrari')) {
      assert.ok(Object.hasOwn(o, 'intrari'), `${unde}: intrari pe tăietura unui document mai vechi de v7`);
      const di = diferenta(x.intrari, o.intrari);
      assert.ok(di === undefined, `${unde}: intrările diferă (${di})`);
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

/** Tăieturile oracolului pentru un document v4, v5, v6 sau v7. */
const taieturileOracolului = (d: DocV4O | DocV5O | DocV6O | DocV7O, k: number): ReadonlyArray<TaieturaV4O & { urechi?: UrechiO | null; rampa?: RampaO | null; intrari?: IntrariO | null }> =>
  (d.schema === 7 ? taieturiV7O(d, k) : d.schema === 6 ? taieturiV6O(d, k) : d.schema === 5 ? taieturiV5O(d, k) : taieturiV4O(d, k));

/** Elementele și tăieturile fiecărei foi, aplicația față de oracol. */
function aceeasiFoaie(doc: DocApp, asteptat: DocV4O | DocV5O | DocV6O | DocV7O): void {
  assert.equal(ca(doc).foi.length, asteptat.foi.length, 'numărul de foi');
  for (let k = 0; k < asteptat.foi.length; k++) {
    aceeasiLume(lumeaAplicatiei(doc, k), geometrieV2(asteptat, k));
    aceleasiTaieturi(taieturileAplicatiei(doc, k), taieturileOracolului(asteptat, k));
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

/** Un document fără câmpurile noi de pe operații: schema dată, `sens` scos și (dacă `urechi`) `urechi` și `rampa` scoase. */
function faraCampuriNoi(d: unknown, schema: number, urechi = PE_V5): Liber {
  const c = structuredClone(d) as Liber;
  c['schema'] = schema;
  for (const p of c['piese'] as Liber[]) {
    for (const o of p['operatii'] as Liber[]) {
      delete o['sens'];
      if (urechi) delete o['urechi'];
      if (urechi && PE_V6) delete o['rampa'];
      if (urechi && PE_V7) delete o['intrari'];
    }
  }
  return c;
}

/**
 * Încărcarea unui document vechi (`brut`) pe care oracolul îl duce în `v4` (lanțul până la 4): ce dă ușa trebuie să fie
 * exact `asteptatDinV4(v4)`, sau un refuz cu motiv când acela e `null`. Întoarce documentul aplicației (sau null).
 */
function incarcaVechi(brut: unknown, v4: DocV4O): { readonly doc: DocApp; readonly asteptat: DocV4O | DocV5O | DocV6O | DocV7O } | null {
  const asteptat = asteptatDinV4(v4);
  if (asteptat === null) {
    const r = incarca(structuredClone(brut));
    if (r.ok) assert.fail(`aplicația (pe ${V}) a migrat o operație care avea deja un câmp „urechi”, „rampa” sau „intrari” (ADR 0028 / 0029 / 0030 §1: ciocnire)`);
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
    return null;
  }
  return { doc: accepta(structuredClone(brut)), asteptat };
}

// ── Oracolul singur, pe hârtie ──────────────────────────────────────────────────────────────────────────────────────

test('(o) versiunea curentă a oracolului e 7; sensurile sunt urcare și opozitie; urechile: implicit null, dialogul 4 × 8 × 2, cel mult 100; rampa: implicit null, dialogul 10 mm; intrările: implicit null, dialogul 3 mm, exportul cere ≥ 0,5', () => {
  assert.equal(SCHEMA_CURENTA_O, 7);
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
    assert.equal(diferenta(ridicaO(v1), migreazaV4V7O(v4 as DocV4O)), undefined);
    assert.equal(diferenta(migreazaV1V7O(v1), migreazaV4V7O(v4 as DocV4O)), undefined);
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
      assert.equal(diferenta(ridicaO(v3), migreazaV4V7O(v4 as DocV4O)), undefined);
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
  for (const { doc } of [...CORPUS_V4, ...VALIDE_DIFICILE_V4].filter((c) => !mare(c.doc) && !areUrechiPeOperatii(c.doc))) {
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
  assert.ok(operatii > 100, `${operatii} operații migrate`);
});

test('(o) migrarea v5 → v6 e pură și deterministă; din v5 rămâne tot, în afară de schema și de rampa: null pe operații', () => {
  let operatii = 0;
  for (const { doc } of [...CORPUS_V5, ...VALIDE_DIFICILE_V5].filter((c) => !mare(c.doc))) {
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
    const v7 = ridicaO(caz.doc);
    aceleasiTaieturi(taieturiV4O(v7, caz.indexFoaie), caz.taieturi, 'oracolul');
    for (const t of taieturiV7O(v7, caz.indexFoaie)) { assert.equal(t.urechi, null); assert.equal(t.rampa, null); assert.equal(t.intrari, null); }
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

test('(o) v4 (sau v3) cu „urechi” pe o operație, oricare i-ar fi valoarea: valid în schema lui, de nemigrat la v5 ([ciocnire])', () => {
  for (const r of REFUZATE_V4) {
    const d = r.doc as Liber;
    if (d['schema'] === 4) {
      assert.deepEqual(verificaV4(r.doc), [], r.nume);
      assert.deepEqual(categoriiO(verificaV4V5(r.doc)), ['ciocnire'], r.nume);
    } else {
      assert.deepEqual(verificaV3V4(r.doc), [], `${r.nume}: v3 → v4 trece (câmp necunoscut)`);
    }
    assert.deepEqual(categoriiO(verificaO(r.doc)), ['ciocnire'], r.nume);
  }
  // Capcanele mai vechi: corpusurile v3 / v4 cu `urechi: []` pe operații sunt acum ciocniri, și doar ele.
  let ciocniri = 0;
  for (const { nume, doc } of [...CORPUS_V3, ...VALIDE_DIFICILE_V3, ...CORPUS_V4, ...VALIDE_DIFICILE_V4]) {
    const c = categoriiO(verificaO(doc));
    if (areUrechiPeOperatii(doc)) { ciocniri++; assert.deepEqual(c, ['ciocnire'], nume); } else assert.deepEqual(c, areIntrariPeOperatii(doc) ? ['ciocnire'] : [], nume);
    assert.deepEqual(verificaO(faraIntrariPeOperatii(faraUrechiPeOperatii(doc))), [], `${nume}, fără urechi și intrări pe operații`);
  }
  assert.ok(ciocniri >= 10, `${ciocniri} ciocniri în corpusurile vechi`);
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

test('(o) schema 8, „7” ca text și 6.5 sunt refuzate de oracol; v1, …, v6 ajung la v7 prin lanț (și la v6 prin `ridicaV6O`)', () => {
  const d = structuredClone(VALIDE_DIFICILE_V7[1]!.doc) as Liber;
  for (const s of [8, '7', 6.5, 0, null]) {
    d['schema'] = s;
    assert.deepEqual(categoriiO(verificaO(d)), ['schema'], String(s));
  }
  // Un v5 etichetat 6 (fără rampă) nu e un v6: [rampa].
  const v5ca6 = structuredClone(VALIDE_DIFICILE_V5[1]!.doc) as Liber;
  v5ca6['schema'] = 6;
  assert.deepEqual(categoriiO(verificaO(v5ca6)), ['rampa']);
  // Un v6 etichetat 7 (fără intrări) nu e un v7: [intrari].
  const v6ca7 = structuredClone(faraIntrariPeOperatii(VALIDE_DIFICILE_V6[1]!.doc)) as Liber;
  v6ca7['schema'] = 7;
  assert.deepEqual(categoriiO(verificaO(v6ca7)), ['intrari']);
  assert.equal(ridicaO(CORPUS_V1[0]!.doc).schema, 7);
  assert.equal(ridicaO(CORPUS_V2[0]!.doc).schema, 7);
  assert.equal(ridicaO(faraUrechiPeOperatii(CORPUS_V3[0]!.doc)).schema, 7);
  assert.equal(ridicaO(faraUrechiPeOperatii(CORPUS_V4[0]!.doc)).schema, 7);
  assert.equal(ridicaO(CORPUS_V5[0]!.doc).schema, 7);
  assert.equal(ridicaO(CORPUS_V6[0]!.doc).schema, 7);
  assert.equal(ridicaV6O(CORPUS_V5[0]!.doc).schema, 6);
  assert.equal(ridicaV5O(CORPUS_V1[0]!.doc).schema, 5);
});

// ── Lipirea cu aplicația ────────────────────────────────────────────────────────────────────────────────────────────

test('VERSIUNE_SCHEMA e 4–7 (raport: sub 7, testele doar-v7 se sar)', () => {
  assert.ok(V >= 4 && V <= 7, `VERSIUNE_SCHEMA = ${V}`);
  console.log(`schema aplicației: ${V}${PE_V7 ? '' : ' (testele doar-v7 se sar)'}`);
});

// Felia 2.5b: fără `skip`. Poarta de dinainte („e 6”, sărit sub 6) ar fi PICAT pe 7, dar una scrisă `=== 6` ar fi sărit
// în tăcere; acum versiunea oracolului și a aplicației trebuie să fie aceeași, altfel testul e roșu.
test('VERSIUNE_SCHEMA e 7 (felia 2.5b, ADR 0030), aceeași cu a oracolului', () => {
  assert.equal(V, SCHEMA_CURENTA_O);
});

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
    if (PE_V5) assert.equal(diferenta(x.doc, PE_V7 ? migreazaV1V7O(doc) : PE_V6 ? migreazaV1V6O(doc) : migreazaV1V5O(doc)), undefined);
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
  aceleasiTaieturi(taieturi, PE_V7 ? taieturiV7O(migreazaV1V7O(doc)) : PE_V6 ? taieturiV6O(migreazaV1V6O(doc)) : PE_V5 ? taieturiV5O(migreazaV1V5O(doc)) : taieturiV4O(migreazaV1V4O(doc)));
});

for (const { nume, doc } of [...CORPUS_V2, ...VALIDE_DIFICILE]) {
  test(`(a) v2 → v${V} dă exact documentul din contracte, cu elementele și tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV2V4(doc), [], 'oracolul: documentul v2 se migrează');
    const x = incarcaVechi(doc, migreazaV2V4O(doc));
    if (!x) return;
    assert.equal(ca(x.doc).schema, V);
    assert.equal(diferenta(x.doc, x.asteptat), undefined);
    for (let k = 0; k < doc.foi.length; k++) aceeasiLume(geometrieV2(ca(x.doc), k), geometrieV2(doc, k));
    aceeasiFoaie(x.doc, x.asteptat);
  });

  if (mare(doc)) continue;

  test(`(b) din v2 rămâne tot, în afară de schema și de operatii: ${nume}`, () => {
    const c = structuredClone(ca(accepta(structuredClone(doc)))) as Liber;
    assert.equal(c['schema'], V);
    c['schema'] = 2;
    for (const p of c['piese'] as Liber[]) {
      assert.ok(Array.isArray(p['operatii']), `piesa ${String(p['id'])} n-are lista operatii`);
      delete p['operatii'];
    }
    assert.equal(diferenta(c, doc), undefined);
  });

  test(`(c) migrarea v2 → v${V} și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, `v${V} încărcat din nou`);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, `v${V} încărcat din octeții canonici`);
  });
}

for (const { nume, doc } of [...CORPUS_V3, ...VALIDE_DIFICILE_V3]) {
  const ciocnire = (PE_V5 && areUrechiPeOperatii(doc)) || ciocnesteLa7(doc);
  test(`(a) v3 → v${V} dă exact documentul din contract${ciocnire ? ' (pe 5: ciocnirea urechilor, refuz)' : ''}, cu elementele și tăieturile oracolului: ${nume}`, () => {
    assert.deepEqual(verificaV3V4(doc), [], 'oracolul: documentul v3 se migrează la v4');
    const x = incarcaVechi(doc, migreazaV3V4O(doc));
    if (!x) return;
    assert.equal(ca(x.doc).schema, V);
    assert.equal(diferenta(x.doc, x.asteptat), undefined);
    aceeasiFoaie(x.doc, x.asteptat);
  });

  if (mare(doc) || ciocnire) continue;

  test(`(b) din v3 rămâne tot, în afară de schema și de câmpurile noi ale operațiilor: ${nume}`, () => {
    const c = ca(accepta(structuredClone(doc)));
    assert.equal(c.schema, V);
    for (const p of c.piese) {
      for (const o of p.operatii) {
        assert.equal(o.sens, 'urcare', `${p.id}/${o.id}`);
        if (PE_V5) assert.equal(o.urechi, null, `${p.id}/${o.id}: urechi`);
        if (PE_V6) assert.equal(o.rampa, null, `${p.id}/${o.id}: rampa`);
        if (PE_V7) assert.equal(o.intrari, null, `${p.id}/${o.id}: intrari`);
      }
    }
    assert.equal(diferenta(faraCampuriNoi(c, 3), doc), undefined);
  });

  test(`(c) migrarea v3 → v${V} și încărcarea sunt idempotente la octet: ${nume}`, () => {
    const o1 = accepta(structuredClone(doc));
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(structuredClone(doc))), b1, 'a doua migrare');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(o1)))), b1, `v${V} încărcat din nou`);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, `v${V} încărcat din octeții canonici`);
  });
}

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

for (const caz of CAZURI_TAIETURI) {
  test(`(t) tăieturile pe hârtie: ${caz.nume}`, () => {
    assert.deepEqual(verificaO(caz.doc), [], 'oracolul: documentul cazului e primit');
    const doc = accepta(structuredClone(caz.doc));
    aceleasiTaieturi(taieturileAplicatiei(doc, caz.indexFoaie), caz.taieturi.map((t) => (PE_V7 ? { ...t, urechi: null, rampa: null, intrari: null } : PE_V6 ? { ...t, urechi: null, rampa: null } : PE_V5 ? { ...t, urechi: null } : t)), 'aplicația');
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

for (const o of OTRAVURI_V5) {
  test(`(e5) otrava v5 [${o.categorie}] e refuzată: ${o.nume}`, { skip: DOAR_V5 }, () => {
    const probleme = verificaV5(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    const r = incarca(o.doc);
    if (r.ok) assert.fail('aplicația a primit otrava');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const o of OTRAVURI_V6) {
  test(`(e6) otrava v6 [${o.categorie}] e refuzată: ${o.nume}`, { skip: DOAR_V6 }, () => {
    const probleme = verificaV6(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    const r = incarca(o.doc);
    if (r.ok) assert.fail('aplicația a primit otrava');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const o of OTRAVURI_V3) {
  test(`(e) otrava v3 [${o.categorie}] e refuzată (nu se migrează): ${o.nume}`, () => {
    const probleme = verificaV3(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    assert.ok(verificaO(o.doc).length > 0, 'oracolul (ușa v5) ar primi otrava');
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
  test(`(e) v4 valid, deși seamănă cu o otravă${PE_V5 && areUrechiPeOperatii(v.doc) ? ' (pe 5: ciocnirea urechilor, refuz)' : ''}: ${v.nume}`, () => {
    assert.deepEqual(verificaV4(v.doc), [], 'oracolul');
    const x = incarcaVechi(v.doc, v.doc);
    if (!x) return;
    aceeasiFoaie(x.doc, x.asteptat);
  });
}

for (const v of [...VALIDE_DIFICILE_V5, ...CORPUS_V5]) {
  test(`(e5) v5 valid, deși seamănă cu o otravă: ${v.nume}`, { skip: DOAR_V5 }, () => {
    assert.deepEqual(verificaV5(v.doc), [], 'oracolul');
    if (ciocnesteLa7(v.doc)) { assert.equal(incarca(structuredClone(v.doc)).ok, false, 'pe 7: ciocnirea intrărilor'); return; }
    aceeasiFoaie(accepta(structuredClone(v.doc)), v5PentruApp(v.doc));
  });
}

for (const v of [...VALIDE_DIFICILE_V6, ...CORPUS_V6]) {
  test(`(e6) v6 valid, deși seamănă cu o otravă: ${v.nume}`, { skip: DOAR_V6 }, () => {
    assert.deepEqual(verificaV6(v.doc), [], 'oracolul');
    if (ciocnesteLa7(v.doc)) { assert.equal(incarca(structuredClone(v.doc)).ok, false, 'pe 7: ciocnirea intrărilor'); return; }
    aceeasiFoaie(accepta(structuredClone(v.doc)), v6PentruApp(v.doc));
  });
}

test(`(f) schema ${V + 1} (mai nouă decât a aplicației) e refuzată; schema 8 e refuzată și de oracol`, () => {
  const d = structuredClone((VALIDE_DIFICILE_V7[1] as (typeof VALIDE_DIFICILE_V7)[number]).doc) as Liber;
  d['schema'] = V + 1;
  assert.equal(incarca(d).ok, false);
  d['schema'] = 8;
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
  test(`(g) un v4 valid trece prin ușă ${PE_V5 ? 'ca v5-ul migrării (urechi: null)' : 'neschimbat'}: ${nume}`, () => {
    assert.deepEqual(verificaV4(doc), [], 'oracolul');
    const x = incarcaVechi(doc, doc);
    if (!x) return;
    assert.equal(diferenta(x.doc, x.asteptat), undefined);
    const b1 = jsonCanonic(x.doc);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

/** Documente v5 valide: cele scrise ca v5, corpusul și v5-urile oracolului din v4-urile valide (fără ciocniri). */
const V5_VALIDE: ReadonlyArray<{ readonly nume: string; readonly doc: DocV5O }> = [
  ...VALIDE_DIFICILE_V5.filter((c) => !mare(c.doc)),
  ...CORPUS_V5.filter((c) => !mare(c.doc)),
  ...MIGRARI_V4_HARTIE.map((c) => ({ nume: `${c.nume} (v5 de pe hârtie)`, doc: c.v5 as DocV5O })),
  ...V4_VALIDE.filter((c) => !mare(c.doc) && !areUrechiPeOperatii(c.doc)).map((c) => ({ nume: `${c.nume} (v5, migrat de oracol)`, doc: migreazaV4V5O(c.doc) })),
];

for (const { nume, doc } of V5_VALIDE) {
  test(`(g5) un v5 valid trece prin ușă ${PE_V7 ? 'ca v7-ul migrării' : PE_V6 ? 'ca v6-ul migrării (rampa: null)' : 'neschimbat'}: ${nume}`, { skip: DOAR_V5 }, () => {
    assert.deepEqual(verificaV5(doc), [], 'oracolul');
    if (ciocnesteLa7(doc)) { assert.equal(incarca(structuredClone(doc)).ok, false, 'pe 7: ciocnirea intrărilor'); return; }
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, v5PentruApp(doc)), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

/** Documente v6 valide: cele scrise ca v6, corpusul, cele de pe hârtie și v6-urile oracolului din v5-urile valide. */
const V6_VALIDE: ReadonlyArray<{ readonly nume: string; readonly doc: DocV6O }> = [
  ...VALIDE_DIFICILE_V6.filter((c) => !mare(c.doc)),
  ...CORPUS_V6.filter((c) => !mare(c.doc)),
  ...MIGRARI_V5_HARTIE.map((c) => ({ nume: `${c.nume} (v6 de pe hârtie)`, doc: c.v6 as DocV6O })),
  ...V5_VALIDE.filter((c) => !mare(c.doc)).map((c) => ({ nume: `${c.nume} (v6, migrat de oracol)`, doc: migreazaV5V6O(c.doc) })),
];

for (const { nume, doc } of V6_VALIDE) {
  test(`(g6) un v6 valid trece prin ușă ${PE_V7 ? 'ca v7-ul migrării (intrari: null)' : 'neschimbat'}: ${nume}`, { skip: DOAR_V6 }, () => {
    assert.deepEqual(verificaV6(doc), [], 'oracolul');
    if (ciocnesteLa7(doc)) { assert.equal(incarca(structuredClone(doc)).ok, false, 'pe 7: ciocnirea intrărilor'); return; }
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, v6PentruApp(doc)), undefined);
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

for (const r of REFUZATE_V4) {
  test(`(h5) o operație veche cu „urechi” e refuzată la migrarea în v5 [${r.motiv}]: ${r.nume}`, { skip: DOAR_V5 }, () => {
    assert.deepEqual(categoriiO(verificaO(r.doc)), [r.motiv]);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const r of REFUZATE_V5) {
  test(`(h6) o operație veche cu „rampa” e refuzată la migrarea în v6 [${r.motiv}]: ${r.nume}`, { skip: DOAR_V6 }, () => {
    assert.deepEqual(categoriiO(verificaO(r.doc)), [r.motiv]);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

// ── v7 (ADR 0030): oracolul singur ───────────────────────────────────────────────────────────────────────────────────

for (const { nume, v6, v7 } of MIGRARI_V6_HARTIE) {
  test(`(o) oracolul migrează v6 → v7 exact ca pe hârtie: ${nume}`, () => {
    assert.deepEqual(verificaV6(v6), []);
    assert.deepEqual(verificaV6V7(v6), []);
    assert.deepEqual(verificaO(v6), []);
    assert.equal(diferenta(migreazaV6V7O(v6), v7), undefined);
    assert.equal(diferenta(ridicaO(v6), v7), undefined);
    assert.deepEqual(verificaV7(v7), []);
    assert.deepEqual(verificaO(v7), []);
    assert.deepEqual(verificaPanaLaV6O(v6), [], 'ușa unei aplicații pe 6: `intrari` în afara operațiilor e necunoscut oarecare');
  });
}

test('(o) migrarea v6 → v7 e pură și deterministă; din v6 rămâne tot, în afară de schema și de intrari: null pe operații', () => {
  let operatii = 0;
  for (const { doc } of [...CORPUS_V6, ...VALIDE_DIFICILE_V6].filter((c) => !mare(c.doc) && !areIntrariPeOperatii(c.doc))) {
    const inainte = JSON.stringify(doc);
    const a = migreazaV6V7O(doc);
    assert.equal(JSON.stringify(doc), inainte, 'intrarea s-a schimbat');
    assert.equal(diferenta(a, migreazaV6V7O(doc)), undefined);
    assert.equal(a.schema, 7);
    for (const p of a.piese) for (const o of p.operatii) { assert.equal(o.intrari, null); operatii++; }
    const c = structuredClone(a) as Liber;
    c['schema'] = 6;
    for (const p of c['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['intrari'];
    assert.equal(diferenta(c, doc), undefined);
    assert.deepEqual(verificaV7(a), []);
  }
  assert.ok(operatii > 100, `${operatii} operații migrate`);
});

test('(o) otrăvurile v7: fiecare raportează exact categoria ei (cele v6 aduse la v7, plus cele ale intrărilor, doar [intrari])', () => {
  const rele: string[] = [];
  for (const o of OTRAVURI_V7) {
    const c = categoriiO(verificaV7(o.doc));
    if (!c.includes(o.categorie)) rele.push(`${o.nume}: nu vede [${o.categorie}] (${c.join(', ')})`);
    else if (c.length !== 1) rele.push(`${o.nume}: și alte categorii (${c.join(', ')})`);
    if (verificaO(o.doc).length === 0) rele.push(`${o.nume}: ușa oracolului (verificaO) o primește`);
  }
  assert.deepEqual(rele, []);
  assert.ok(OTRAVURI_INTRARI.length >= 24);
  assert.equal(OTRAVURI_V7.length, OTRAVURI_V6.length + OTRAVURI_INTRARI.length);
});

test('(o) v6 (sau v5, v4, v3) cu „intrari” pe o operație, oricare i-ar fi valoarea: valid în schema lui, de nemigrat la v7 ([ciocnire]); ușa unei aplicații pe 6 îl primește', () => {
  for (const r of REFUZATE_V6) {
    const d = r.doc as Liber;
    if (d['schema'] === 6) {
      assert.deepEqual(verificaV6(r.doc), [], r.nume);
      assert.deepEqual(categoriiO(verificaV6V7(r.doc)), ['ciocnire'], r.nume);
    }
    assert.deepEqual(verificaPanaLaV6O(r.doc), [], `${r.nume}: până la v6, intrari e un câmp necunoscut`);
    assert.deepEqual(categoriiO(verificaO(r.doc)), ['ciocnire'], r.nume);
  }
  // Capcanele de dinainte de ADR 0030: exact documentele cu `intrari` pe operații se ciocnesc (W10, MV5-01).
  let vechi = 0;
  for (const { doc } of [...CORPUS_V3, ...CORPUS_V4, ...CORPUS_V5, ...CORPUS_V6, ...VALIDE_DIFICILE_V3, ...VALIDE_DIFICILE_V4, ...VALIDE_DIFICILE_V5, ...VALIDE_DIFICILE_V6]) {
    if (areIntrariPeOperatii(doc)) vechi++;
  }
  assert.ok(vechi >= 1, `${vechi} capcane „intrari” vechi`);
});

test('(o) corpusul v7: valid, cu intrari null și cu raze de pe tot intervalul (și de la margini, și sub minimul exportului), cu capcanele „intrari” în afara operației', () => {
  let nule = 0, cu = 0, laMargini = 0, capcane = 0, necunoscute = 0;
  for (const { nume, doc } of [...CORPUS_V7, ...VALIDE_DIFICILE_V7]) {
    assert.deepEqual(verificaV7(doc), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    if (Object.hasOwn(doc, 'intrari')) capcane++;
    for (const p of doc.piese) {
      if (Object.hasOwn(p, 'intrari')) capcane++;
      for (const o of p.operatii) {
        if (Object.hasOwn(o.scula, 'intrari') || (o.urechi !== null && Object.hasOwn(o.urechi, 'intrari')) || (o.rampa !== null && Object.hasOwn(o.rampa, 'intrari'))) capcane++;
        if (o.intrari === null) { nule++; continue; }
        cu++;
        if (o.intrari.raza === 10_000 || o.intrari.raza === 5e-324 || o.intrari.raza < RAZA_MINIMA_INTRARI_O) laMargini++;
        if (Object.keys(o.intrari).length > 1) necunoscute++;
      }
    }
  }
  assert.ok(nule > 50 && cu > 100 && laMargini > 20 && capcane >= 5 && necunoscute >= 3, JSON.stringify({ nule, cu, laMargini, capcane, necunoscute }));
});

// ── v7 (ADR 0030): lipirea ───────────────────────────────────────────────────────────────────────────────────────────

for (const { nume, v6, v7 } of MIGRARI_V6_HARTIE) {
  test(`(a7) migrarea v6 → v7 pe hârtie: ${nume}`, { skip: DOAR_V7 }, () => {
    assert.equal(diferenta(accepta(structuredClone(v6)), v7), undefined);
    const b1 = jsonCanonic(accepta(structuredClone(v6)));
    assert.deepEqual(jsonCanonic(accepta(structuredClone(v7))), b1, 'v7 de pe hârtie încărcat direct');
  });
}

for (const o of OTRAVURI_V7) {
  test(`(e7) otrava v7 [${o.categorie}] e refuzată: ${o.nume}`, { skip: DOAR_V7 }, () => {
    const probleme = verificaV7(o.doc);
    assert.ok(probleme.some((p) => p.startsWith(`[${o.categorie}]`)), `oracolul nu vede [${o.categorie}]: ${probleme.slice(0, 5).join('; ')}`);
    const r = incarca(o.doc);
    if (r.ok) assert.fail('aplicația a primit otrava');
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

for (const v of [...VALIDE_DIFICILE_V7, ...CORPUS_V7]) {
  test(`(e7) v7 valid, deși seamănă cu o otravă: ${v.nume}`, { skip: DOAR_V7 }, () => {
    assert.deepEqual(verificaV7(v.doc), [], 'oracolul');
    aceeasiFoaie(accepta(structuredClone(v.doc)), v.doc);
  });
}

for (const { nume, doc } of [...VALIDE_DIFICILE_V7, ...CORPUS_V7].filter((c) => !mare(c.doc))) {
  test(`(g7) un v7 valid trece neschimbat prin ușă: ${nume}`, { skip: DOAR_V7 }, () => {
    const o1 = accepta(structuredClone(doc));
    assert.equal(diferenta(o1, doc), undefined);
    const b1 = jsonCanonic(o1);
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(JSON.stringify(doc)))), b1, 'încărcat din JSON (−0 devine 0)');
    assert.deepEqual(jsonCanonic(accepta(JSON.parse(text(b1)))), b1, 'încărcat din octeții canonici');
  });
}

for (const r of REFUZATE_V6) {
  test(`(h7) o operație veche cu „intrari” e refuzată la migrarea în v7 [${r.motiv}]: ${r.nume}`, { skip: DOAR_V7 }, () => {
    assert.deepEqual(categoriiO(verificaO(r.doc)), [r.motiv]);
    const rez = incarca(structuredClone(r.doc));
    if (rez.ok) return assert.fail('aplicația a migrat un document de nemigrat');
    assert.ok(String(rez.motiv ?? '').length > 0, 'refuzul n-are motiv');
  });
}

test('raport: forma tăieturilor aplicației (cu sau fără sens, urechi, rampă și intrări)', () => {
  // Rulează după celelalte (ordinea fișierului); doar spune ce a văzut.
  console.log(`tăieturile aplicației: ${[...formeTaietura].join(', ') || 'necitite'}`);
});
