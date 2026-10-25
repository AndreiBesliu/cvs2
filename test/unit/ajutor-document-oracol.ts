/**
 * Ajutoarele lipirii oracolului documentului (`document*.oracol.test.ts`): ușa aplicației față de oracol, tăieturile,
 * documentele valide pe versiuni. Mutate neschimbate din `document.oracol.test.ts` (sesiunile oracolului); împărțirea
 * e doar ca fișierele să ruleze în paralel (felia 2.6: fișierul ajunsese la ~180 s). Nu e un test.
 */
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
  migreazaV1V9O, migreazaV4V9O, migreazaV5V9O, migreazaV6V9O, migreazaV7V9O, migreazaV8V9O, ridicaV8O, verificaPanaLaV8O, verificaV8V9, verificaV9,
  type DocV9O,
  migreazaV4V10O, migreazaV5V10O, migreazaV6V10O, migreazaV7V10O, migreazaV8V10O, migreazaV9V10O, verificaV10, type DocV10O,
  migreazaV4V11O, migreazaV5V11O, migreazaV6V11O, migreazaV7V11O, migreazaV8V11O, migreazaV9V11O, migreazaV10V11O, verificaV11,
  type DocV11O,
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


export type DocApp = Parameters<typeof elementeFoaie>[0];

/** Schema aplicației: 4 (înainte de felia 2.4), 5 (înainte de 2.5a) sau 6. */
export const V = VERSIUNE_SCHEMA as number;
export const PE_V5 = V >= 5;
export const PE_V6 = V >= 6;
export const PE_V7 = V >= 7;
export const PE_V8 = V >= 8;
export const PE_V9 = V >= 9;
/** Felia 2.3c-2 (ADR 0037): documentul v10. */
export const PE_V10 = V >= 10;
/** Felia 5.1↑ (ADR 0069): documentul v11 (buzunarul). */
export const PE_V11 = V >= 11;
/** Motivul pentru care testele doar-v5 se sar. */
export const DOAR_V5 = PE_V5 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v5 (ADR 0028)`;
export const DOAR_V6 = PE_V6 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v6 (ADR 0029)`;
export const DOAR_V7 = PE_V7 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v7 (ADR 0030)`;
export const DOAR_V8 = PE_V8 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v8 (ADR 0032)`;
export const DOAR_V9 = PE_V9 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v9 (ADR 0034)`;
export const DOAR_V10 = PE_V10 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v10 (ADR 0037)`;
export const DOAR_V11 = PE_V11 ? false : `aplicația e încă pe schema ${V}; testul cere documentul v11 (ADR 0069)`;
/** Ce verifică ușa aplicației pe documentul schemei ei. */
export const verificaSchemaApp = (d: unknown): string[] => (PE_V11 ? verificaV11(d) : PE_V10 ? verificaV10(d) : PE_V9 ? verificaV9(d) : PE_V8 ? verificaV8(d) : PE_V7 ? verificaV7(d) : PE_V6 ? verificaV6(d) : PE_V5 ? verificaV5(d) : verificaV4(d));
/** Un v5 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 5, cu `rampa: null` pe 6, și `intrari: null` pe 7. */
export const v5PentruApp = (d: DocV5O): DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O => (PE_V11 ? migreazaV5V11O(d) : PE_V10 ? migreazaV5V10O(d) : PE_V9 ? migreazaV5V9O(d) : PE_V8 ? migreazaV5V8O(d) : PE_V7 ? migreazaV5V7O(d) : PE_V6 ? migreazaV5V6O(d) : d);
/** Un v6 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 6, cu `intrari: null` pe 7. */
export const v6PentruApp = (d: DocV6O): DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O => (PE_V11 ? migreazaV6V11O(d) : PE_V10 ? migreazaV6V10O(d) : PE_V9 ? migreazaV6V9O(d) : PE_V8 ? migreazaV6V8O(d) : PE_V7 ? migreazaV6V7O(d) : d);
/** Un v7 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 7, cu `colturi: null` pe 8. */
export const v7PentruApp = (d: DocV7O): DocV7O | DocV8O | DocV9O | DocV10O | DocV11O => (PE_V11 ? migreazaV7V11O(d) : PE_V10 ? migreazaV7V10O(d) : PE_V9 ? migreazaV7V9O(d) : PE_V8 ? migreazaV7V8O(d) : d);
/** Un v8 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 8, cu `schema: 9` pe 9 (ADR 0034 §3), 10 pe 10. */
export const v8PentruApp = (d: DocV8O): DocV8O | DocV9O | DocV10O | DocV11O => (PE_V11 ? migreazaV8V11O(d) : PE_V10 ? migreazaV8V10O(d) : PE_V9 ? migreazaV8V9O(d) : d);
/** Un v9 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 9, cu `schema: 10` pe 10 (ADR 0037 §2). */
export const v9PentruApp = (d: DocV9O): DocV9O | DocV10O | DocV11O => (PE_V11 ? migreazaV9V11O(d) : PE_V10 ? migreazaV9V10O(d) : d);
/** Un v10 al oracolului, cum trebuie să iasă din ușa aplicației: neschimbat pe 10, cu `schema: 11` pe 11 (ADR 0069 §2). */
export const v10PentruApp = (d: DocV10O): DocV10O | DocV11O => (PE_V11 ? migreazaV10V11O(d) : d);
/** Pe 7, un document cu un câmp `intrari` pe operații se ciocnește (ADR 0030 §1). */
export const ciocnesteLa7 = (d: unknown): boolean => (PE_V7 && areIntrariPeOperatii(d)) || (PE_V8 && areColturiPeOperatii(d));

/** Documentul primit de `incarca`; un refuz pică testul, cu motivul. */
export function accepta(brut: unknown): DocApp {
  const r = incarca(brut);
  if (!r.ok) return assert.fail(`incarca a refuzat: ${String(r.motiv)}`);
  return r.doc;
}

/** Documentul aplicației, citit de oracol ca date. */
export const ca = (d: DocApp): DocV8O => d as unknown as DocV8O;

/**
 * Ce trebuie să dea ușa aplicației pentru un document vechi, adus de oracol la v4: v4-ul însuși (aplicația pe 4) sau
 * v5-ul migrării (pe 5); `null` = refuz (pe 5: o operație care are deja un câmp `urechi`, ciocnire).
 */
export function asteptatDinV4(v4: DocV4O): DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O | null {
  if (!PE_V5) return v4;
  if (areUrechiPeOperatii(v4)) return null;
  if (!PE_V6) return migreazaV4V5O(v4);
  if (areRampaPeOperatii(v4)) return null;
  if (!PE_V7) return migreazaV4V6O(v4);
  if (areIntrariPeOperatii(v4)) return null;
  if (!PE_V8) return migreazaV4V7O(v4);
  if (areColturiPeOperatii(v4)) return null;
  return PE_V11 ? migreazaV4V11O(v4) : PE_V10 ? migreazaV4V10O(v4) : PE_V9 ? migreazaV4V9O(v4) : migreazaV4V8O(v4);
}

/** Lista aplicației, în forma oracolului; `idLume` trebuie să fie `<instanță>/<nod>`. */
export function lumeaAplicatiei(doc: DocApp, indexFoaie = 0): ElementLumeO[] {
  return elementeFoaie(doc, indexFoaie).map((e) => {
    assert.equal(e.idLume, `${e.instanta}/${e.nod}`, `idLume ${e.idLume} nu e instanța/nodul`);
    return { idLume: e.idLume, forma: e.forma, matrice: e.matrice };
  });
}

/** Cum își scrie aplicația tăieturile: fără, cu `sens`, cu `sens` și `urechi` (ALEGERE din antet); se raportează o dată. */
export const formeTaietura = new Set<string>();

export type TaieturaApp = TaieturaO & { sens?: unknown; urechi?: unknown; rampa?: unknown; intrari?: unknown; colturi?: unknown };

/**
 * Tăieturile aplicației, citite ca date: fiecare are exact câmpurile contractului (cele 11, eventual și `sens`, eventual
 * și `urechi`), iar `idLume` e instanța/nodul.
 */
export function taieturileAplicatiei(doc: DocApp, indexFoaie = 0): TaieturaApp[] {
  const forme = new Map<string, string>([
    [JSON.stringify([...CAMPURI_TAIETURA_O].sort()), 'fără sens'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens'].sort()), 'cu sens'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi'].sort()), 'cu sens și urechi'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi', 'rampa'].sort()), 'cu sens, urechi și rampă'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi', 'rampa', 'intrari'].sort()), 'cu sens, urechi, rampă și intrări'],
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi', 'rampa', 'intrari', 'colturi'].sort()), 'cu sens, urechi, rampă, intrări și colțuri'],
    // Felia 5.1↑ (ADR 0069): pe v11, și felul operației (`tip`); `pasLateral` doar pe un buzunar (nu în documentele vechi).
    [JSON.stringify([...CAMPURI_TAIETURA_O, 'sens', 'urechi', 'rampa', 'intrari', 'colturi', 'tip'].sort()), 'cu sens, urechi, rampă, intrări, colțuri și tip'],
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
export function aceleasiChei(real: readonly string[], asteptat: readonly string[], mesaj: string): void {
  const n = Math.max(real.length, asteptat.length);
  for (let k = 0; k < n; k++) {
    if (real[k] !== asteptat[k]) {
      assert.fail(`${mesaj}: la poziția ${k}, ${JSON.stringify(real[k])} ≠ ${JSON.stringify(asteptat[k])} (lungimi ${real.length} și ${asteptat.length})`);
    }
  }
}

/** Aceleași id-uri în aceeași ordine, aceeași formă, aceeași matrice (fiecare componentă `===`). */
export function aceeasiLume(real: readonly ElementLumeO[], asteptat: readonly ElementLumeO[]): void {
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
export type TaieturaAsteptata = TaieturaV4O & { urechi?: UrechiO | null; rampa?: RampaO | null; intrari?: IntrariO | null; colturi?: ColturiO | null };

export function aceleasiTaieturi(real: readonly TaieturaApp[], asteptat: ReadonlyArray<TaieturaAsteptata>, cine = 'aplicația'): void {
  const chei = (l: ReadonlyArray<TaieturaO>): string[] => l.map((x) => `${x.idLume}#${x.operatie}`);
  aceleasiChei(chei(real), chei(asteptat), `${cine}: tăieturile (idLume#operație) și ordinea lor`);
  real.forEach((x, k) => {
    const o = asteptat[k] as TaieturaAsteptata;
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
    if (Object.hasOwn(x, 'colturi')) {
      assert.ok(Object.hasOwn(o, 'colturi'), `${unde}: colturi pe tăietura unui document mai vechi de v8`);
      const dc = diferenta(x.colturi, o.colturi);
      assert.ok(dc === undefined, `${unde}: colțurile diferă (${dc})`);
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

/**
 * Tăieturile oracolului pentru un document v4, …, v10. Un v10 de aici e un document vechi migrat (fără căi deschise, fără
 * laturile noi, fără `despartire`), deci ordinea de la §8 (ADR 0037) e chiar cea a lui ADR 0025 (`taieturiV8O`).
 */
export const taieturileOracolului = (d: DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O, k: number): ReadonlyArray<TaieturaAsteptata> =>
  // Felia 5.1↑: un v11 de aici e tot un document vechi migrat (fără buzunare), deci tot ordinea lui ADR 0025.
  (d.schema === 11 || d.schema === 10 ? taieturiV8O(d as unknown as DocV9O, k) : d.schema === 9 || d.schema === 8 ? taieturiV8O(d, k) : d.schema === 7 ? taieturiV7O(d, k) : d.schema === 6 ? taieturiV6O(d, k) : d.schema === 5 ? taieturiV5O(d, k) : taieturiV4O(d, k));

/** Elementele și tăieturile fiecărei foi, aplicația față de oracol. */
export function aceeasiFoaie(doc: DocApp, asteptat: DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O): void {
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
export function mare(d: { readonly piese: ReadonlyArray<{ readonly radacina: unknown }>; readonly foi: ReadonlyArray<{ readonly instante: readonly unknown[] }> }): boolean {
  let n = d.foi.reduce((s, f) => s + f.instante.length, 0);
  const stiva: unknown[] = d.piese.map((p) => p.radacina);
  for (let x = stiva.pop(); x !== undefined; x = stiva.pop()) {
    n++;
    const copii = (x as Liber)['copii'];
    if (Array.isArray(copii)) stiva.push(...(copii as unknown[]));
  }
  return n > 20_000;
}

/**
 * Felia 2.7b: un document cu peste 20 000 de operații (W06: 100 000 pe un singur element, deci nu e `mare` după noduri)
 * trece prin (a), (c) și (e) ale versiunii lui și printr-o singură probă de puritate (v3 → v4), nu prin fiecare încărcare
 * repetată (g) / (g5) … (g8) și nici prin celelalte probe de puritate: costau ~5 s fiecare, de 15 ori, pe aceeași
 * proprietate, care nu depinde de mărime.
 */
export function mareOperatii(d: { readonly piese: ReadonlyArray<object> }): boolean {
  let n = 0;
  for (const p of d.piese) {
    const o = (p as Liber)['operatii'];
    if (Array.isArray(o)) n += o.length;
  }
  return n > 20_000;
}

/** Octeții canonici, ca text (dacă `jsonCanonic` dă octeți, se decodează). */
export const text = (b: ReturnType<typeof jsonCanonic>): string =>
  typeof b === 'string' ? b : new TextDecoder().decode(b as unknown as Uint8Array);

/** Un document fără câmpurile noi de pe operații: schema dată, `sens` scos și (dacă `urechi`) `urechi` și `rampa` scoase. */
export function faraCampuriNoi(d: unknown, schema: number, urechi = PE_V5): Liber {
  const c = structuredClone(d) as Liber;
  c['schema'] = schema;
  for (const p of c['piese'] as Liber[]) {
    for (const o of p['operatii'] as Liber[]) {
      delete o['sens'];
      if (urechi) delete o['urechi'];
      if (urechi && PE_V6) delete o['rampa'];
      if (urechi && PE_V7) delete o['intrari'];
      if (urechi && PE_V8) delete o['colturi'];
    }
  }
  return c;
}

/**
 * Încărcarea unui document vechi (`brut`) pe care oracolul îl duce în `v4` (lanțul până la 4): ce dă ușa trebuie să fie
 * exact `asteptatDinV4(v4)`, sau un refuz cu motiv când acela e `null`. Întoarce documentul aplicației (sau null).
 */
export function incarcaVechi(brut: unknown, v4: DocV4O): { readonly doc: DocApp; readonly asteptat: DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O } | null {
  const asteptat = asteptatDinV4(v4);
  if (asteptat === null) {
    const r = incarca(structuredClone(brut));
    if (r.ok) assert.fail(`aplicația (pe ${V}) a migrat o operație care avea deja un câmp „urechi”, „rampa”, „intrari” sau „colturi” (ADR 0028 / 0029 / 0030 / 0032 §1: ciocnire)`);
    assert.ok(String(r.motiv ?? '').length > 0, 'refuzul n-are motiv');
    return null;
  }
  return { doc: accepta(structuredClone(brut)), asteptat };
}

/** Fiecare document o singură dată (H08 / H08b, H13 / H14, T05 / T05b, T07a–c au același document). */
export function unice<C extends { readonly doc: object }>(lista: readonly C[]): C[] {
  const vazute = new Set<string>();
  return lista.filter((c) => {
    const cheie = JSON.stringify(c.doc);
    if (vazute.has(cheie)) return false;
    vazute.add(cheie);
    return true;
  });
}

type Valide<D> = ReadonlyArray<{ readonly nume: string; readonly doc: D }>;
let v4Valide: Valide<DocV4O> | null = null;
let v5Valide: Valide<DocV5O> | null = null;
let v6Valide: Valide<DocV6O> | null = null;

/**
 * Documente v4 valide: cele scrise ca v4 și v4-urile oracolului din v3-urile, v2-urile de pe hârtie și dificile.
 * Felia 2.7b: listele valide v4–v6 se construiesc la prima cerere (doar fișierele lipirii le cer), nu la import.
 */
export const valideV4 = (): Valide<DocV4O> => (v4Valide ??= [
  ...VALIDE_DIFICILE_V4.filter((c) => !mare(c.doc) && !mareOperatii(c.doc)),
  ...CORPUS_V4,
  ...unice(CAZURI_TAIETURI.filter((c) => c.doc.schema === 4)).map((c) => ({ nume: c.nume, doc: c.doc as DocV4O })),
  ...unice(CAZURI_TAIETURI.filter((c) => c.doc.schema === 3)).map((c) => ({ nume: `${c.nume} (migrat de oracol)`, doc: migreazaV3V4O(c.doc as DocV3O) })),
  ...unice<{ readonly nume: string; readonly doc: DocV2O }>([...CAZURI_HARTIE, ...VALIDE_DIFICILE].filter((c) => !mare(c.doc)))
    .map((c) => ({ nume: `${c.nume} (migrat de oracol)`, doc: migreazaV2V4O(c.doc) })),
]);


/** Documente v5 valide: cele scrise ca v5, corpusul și v5-urile oracolului din v4-urile valide (fără ciocniri). */
export const valideV5 = (): Valide<DocV5O> => (v5Valide ??= [
  ...VALIDE_DIFICILE_V5.filter((c) => !mare(c.doc) && !mareOperatii(c.doc)),
  ...CORPUS_V5.filter((c) => !mare(c.doc) && !mareOperatii(c.doc)),
  ...MIGRARI_V4_HARTIE.map((c) => ({ nume: `${c.nume} (v5 de pe hârtie)`, doc: c.v5 as DocV5O })),
  ...valideV4().filter((c) => !mare(c.doc) && !areUrechiPeOperatii(c.doc)).map((c) => ({ nume: `${c.nume} (v5, migrat de oracol)`, doc: migreazaV4V5O(c.doc) })),
]);


/** Documente v6 valide: cele scrise ca v6, corpusul, cele de pe hârtie și v6-urile oracolului din v5-urile valide. */
export const valideV6 = (): Valide<DocV6O> => (v6Valide ??= [
  ...VALIDE_DIFICILE_V6.filter((c) => !mare(c.doc) && !mareOperatii(c.doc)),
  ...CORPUS_V6.filter((c) => !mare(c.doc) && !mareOperatii(c.doc)),
  ...MIGRARI_V5_HARTIE.map((c) => ({ nume: `${c.nume} (v6 de pe hârtie)`, doc: c.v6 as DocV6O })),
  ...valideV5().filter((c) => !mare(c.doc)).map((c) => ({ nume: `${c.nume} (v6, migrat de oracol)`, doc: migreazaV5V6O(c.doc) })),
]);
