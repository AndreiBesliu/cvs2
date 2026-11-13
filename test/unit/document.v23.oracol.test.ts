/**
 * Documentul v23 (ADR 0210 §4 și §7: literele plăcuțelor din CSV, `Instanta.texte`; ușa: ADR 0024, 0070; corpusul: ADR 0121)
 * judecat de oracolul lui independent: partea v23 de la capătul lui `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise de o sesiune separată doar din ADR-uri, fără ușa aplicației și fără codul nou al
 * plăcuțelor. Ca `document.v22.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie (nu cere aplicația): documentele v23 valide trec neschimbate, cele v22 și mai vechi
 *   urcă doar cu numărul, `texte` în afara instanței e un câmp necunoscut, frontierele, refuzurile (categoria și câmpul),
 *   ciocnirile, plafoanele cu literele plăcuțelor, documentele generate, amprenta pe hârtie;
 * - „(f) …”: amprenta contururilor a oracolului e chiar a aplicației (`blocText.ts`, pe care v23 nu-l schimbă);
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie (o copie), refuză ce e pe hârtie, cu
 *   motiv; ce nu hotărăște textul doar se raportează;
 * - „(c) …”: ușa aplicației față de oracol pe corpusul existent și pe documentele generate cu plăcuțe;
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): `null` pe o versiune întreagă 1 … 22, altfel exact ușa
 *   întreagă.
 * Cât timp aplicația e pe v22, probele (a), (c) și (u) cad (ușa ei refuză un document v23): e așteptat. Modulele aplicației
 * se aduc la cerere, doar în probele care le folosesc, ca (o) să ruleze și cu aplicația în lucru.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amprentaContururiO, amprentaSirO, CAMPURI_NOI_O, campurileO, categoriiO, ciocniriO, diferenta, jsonCanonicO, PE_INSTANTA_O,
  ridicaPanaLaO, ridicaV23O, SCHEMA_V23_O, textCuValorileO, usaCurentaV23O, verificaPanaLaO, verificaPanaLaV23O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import * as cazuri from '../oracles/document.cazuri.ts';
import {
  AMBIGUE_V18, AMBIGUE_V23, CORPUS_V23, cuSchema, docAna, docV18, FELURI_STRICARE_V23, FRONTIERE_V22, FRONTIERE_V23, LIPSA,
  MIGRARI_V23_HARTIE, NECIOCNIRI_V23, OTRAVURI_V23, plafoaneV23, REFUZATE_V23, VALIDE_V22, VALIDE_V23, VECHI_NOI, type FrontieraV23,
} from '../oracles/document.cazuri.ts';
import * as cazuriV9 from '../oracles/document.v9.cazuri.ts';
import * as cazuriV10 from '../oracles/document.v10.cazuri.ts';

// ── Ajutoarele ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Calea cu puncte (`copii.0.id`) în forma mesajelor oracolului (`copii[0].id`). */
const cuParanteze = (cale: string): string => cale.replace(/\.(\d+)(?=\.|$)/g, '[$1]');

/** Partea căii de la `operatii` încolo, în forma mesajelor (partea v1–v10 scrie piesa după id: „piesa p.operatii[0]”). */
const dinOperatii = (cale: string): string => {
  const c = cuParanteze(cale);
  return c.slice(Math.max(0, c.indexOf('operatii')));
};

/** O copie a valorii de la `cale` (cu `.`, indicii listelor ca numere), cu `valoare` pusă (sau ștearsă, `LIPSA`). */
function cuValoare(o: Liber, cale: string, valoare: unknown): Liber {
  const c = structuredClone(o);
  const pasi = cale.split('.');
  let x: Liber = c;
  for (const pas of pasi.slice(0, -1)) x = x[pas] as Liber;
  const ultim = pasi.at(-1) as string;
  if (valoare === LIPSA) delete x[ultim];
  else x[ultim] = structuredClone(valoare);
  return c;
}

/** O copie a documentului; unul mult prea adânc pentru `structuredClone` (otrăvurile de imbricare) trece așa cum e. */
function copie(d: unknown): unknown {
  try {
    return structuredClone(d);
  } catch (e) {
    if (e instanceof RangeError) return d;
    throw e;
  }
}

/** Eticheta unei valori de frontieră. */
const eticheta = (cale: string, valoare: unknown): string => `${cale} = ${valoare === LIPSA ? '(lipsă)' : String(JSON.stringify(valoare) ?? valoare).slice(0, 80)}`;

/** Documentele din cazurile oracolului: fiecare valoare `doc`, plus orice document găsit direct (cu `schema` și piese / elemente / foi). */
function documenteDin(module: readonly object[]): unknown[] {
  const rez: unknown[] = [];
  const vazute = new Set<unknown>();
  const esteDocument = (v: object): boolean =>
    !Array.isArray(v) && Object.hasOwn(v, 'schema') && ['piese', 'elemente', 'foi', 'foaie'].some((k) => Object.hasOwn(v, k));
  const umbla = (v: unknown, adancime: number): void => {
    if (typeof v !== 'object' || v === null || vazute.has(v) || adancime > 5) return;
    vazute.add(v);
    if (esteDocument(v)) {
      rez.push(v);
      return;
    }
    if (!Array.isArray(v) && Object.hasOwn(v, 'doc')) {
      const d = (v as Liber)['doc'];
      if (!vazute.has(d)) {
        if (typeof d === 'object' && d !== null) vazute.add(d);
        rez.push(d);
      }
    }
    for (const x of Object.values(v)) umbla(x, adancime + 1);
  };
  for (const m of module) for (const v of Object.values(m)) umbla(v, 0);
  return rez;
}

/** Câte obiecte are un document (până la 1 000 001): peste 20 000, o singură trecere, fără încărcări repetate. */
function marime(d: unknown): number {
  let n = 0;
  const stiva: unknown[] = [d];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (typeof x !== 'object' || x === null) continue;
    n++;
    if (n > 1_000_000) break;
    for (const v of Object.values(x)) if (typeof v === 'object' && v !== null) stiva.push(v);
  }
  return n;
}

// ── Aplicația, adusă la cerere ───────────────────────────────────────────────────────────────────────────────────────

type Rezultat = { readonly ok: true; readonly doc: unknown } | { readonly ok: false; readonly motiv: unknown };
type Aplicatia = {
  readonly incarca: (brut: unknown) => Rezultat;
  readonly incarcaCurent: (brut: unknown) => Rezultat | null;
  readonly amprentaContururi: (copii: never) => string;
  readonly jsonCanonic: (v: never) => unknown;
  readonly versiune: number;
};
let aplicatia: Aplicatia | undefined;
async function app(): Promise<Aplicatia> {
  if (aplicatia === undefined) {
    const [incarcare, usaCurenta, blocText, document] = await Promise.all([
      import('../../src/model/incarcare.ts'), import('../../src/model/usaCurenta.ts'), import('../../src/model/blocText.ts'), import('../../src/model/document.ts'),
    ]);
    aplicatia = {
      incarca: incarcare.incarca as (brut: unknown) => Rezultat,
      incarcaCurent: usaCurenta.incarcaCurent as (brut: unknown) => Rezultat | null,
      amprentaContururi: blocText.amprentaContururi as (copii: never) => string,
      jsonCanonic: incarcare.jsonCanonic as (v: never) => unknown,
      versiune: document.VERSIUNE_SCHEMA as number,
    };
  }
  return aplicatia;
}

/** Ce dă ușa aplicației: documentul primit, sau motivul refuzului. */
async function usa(brut: unknown): Promise<{ readonly ok: true; readonly doc: unknown } | { readonly ok: false; readonly motiv: string }> {
  const r = (await app()).incarca(copie(brut));
  return r.ok ? { ok: true, doc: r.doc } : { ok: false, motiv: String(r.motiv) };
}

/** Documentul unei frontiere v23 cu valoarea dată. */
const docFrontiera = (f: FrontieraV23, valoare: unknown): Liber => cuValoare(f.baza(), f.cale, valoare);

/**
 * Motivul unui refuz pe o instanță (`foi.N.instante.M…`) spune locul: instanța (id-ul ei) sau `texte`. ADR 0210 §7 cere doar
 * „cu motiv”, deci nepotrivirea se raportează (diagnostic), nu pică proba.
 */
function motivFaraLoc(doc: unknown, cale: string, motiv: string): boolean {
  const m = /^foi\.(\d+)\.instante\.(\d+)/.exec(cale);
  if (m === null) return false;
  const inst = (((doc as Liber)['foi'] as Liber[] | undefined)?.[Number(m[1])]?.['instante'] as Liber[] | undefined)?.[Number(m[2])];
  const id = inst?.['id'];
  return !motiv.includes('texte') && !(typeof id === 'string' && motiv.includes(id));
}

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────────────────────────────

test('(o) documentele v23 valide: contractul v23 și ușa v23 le primesc neschimbate; ușa v22 le refuză', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V23) {
    const p = verificaVnO(doc, SCHEMA_V23_O);
    if (p.length > 0) rele.push(`${nume}: contractul v23 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = verificaPanaLaV23O(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v23 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaV23O(doc), doc);
    if (d !== undefined) rele.push(`${nume}: ușa îl schimbă (${d})`);
    const v22 = categoriiO(verificaPanaLaO(doc, 22));
    if (JSON.stringify(v22) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v22 dă ${v22.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.ok(VALIDE_V23.length >= VALIDE_V22.length + 35, `${VALIDE_V23.length} documente`);
});

test('(o) documentele v22 valide și cele mai vechi urcă la v23 doar cu numărul; ușile v11 … v23 le primesc', () => {
  for (const { nume, doc } of VALIDE_V22) {
    assert.deepEqual(verificaPanaLaV23O(doc), [], nume);
    assert.equal(diferenta(ridicaV23O(doc), cuSchema(doc, SCHEMA_V23_O)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(verificaPanaLaV23O(doc), [], `un v${versiune} la ușa v23`);
    assert.equal(diferenta(ridicaPanaLaO(doc, SCHEMA_V23_O), cuSchema(doc, SCHEMA_V23_O)), undefined, `un v${versiune} adus la v23: doar numărul`);
  }
});

test('(o) documentele vechi urcă la v23 exact ca pe hârtie; ușa nu-și schimbă intrarea', () => {
  for (const { nume, vechi, v23 } of MIGRARI_V23_HARTIE) {
    const inainte = JSON.stringify(vechi);
    assert.deepEqual(verificaPanaLaV23O(vechi), [], nume);
    assert.equal(diferenta(ridicaV23O(vechi), v23), undefined, nume);
    assert.equal(JSON.stringify(vechi), inainte, `${nume}: intrarea s-a schimbat`);
    assert.deepEqual(verificaVnO(v23, SCHEMA_V23_O), [], `${nume}: rezultatul e un v23 valid`);
  }
  assert.ok(MIGRARI_V23_HARTIE.length >= 12);
});

test('(o) `texte` în afara instanței e un câmp necunoscut oarecare: primit și păstrat', () => {
  for (const { nume, doc, v23 } of NECIOCNIRI_V23) {
    assert.deepEqual(verificaPanaLaV23O(doc), [], nume);
    assert.equal(diferenta(ridicaV23O(doc), v23), undefined, nume);
  }
  assert.ok(NECIOCNIRI_V23.some((c) => c.nume.startsWith('N23')));
});

test('(o) frontierele v23: fiecare valoare are verdictul de pe hârtie, iar un refuz are categoria lui și numește câmpul', () => {
  const rele: string[] = [];
  let n = 0;
  for (const f of FRONTIERE_V23) {
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      const p = verificaPanaLaV23O(docFrontiera(f, valoare));
      const e = eticheta(f.cale, valoare);
      n++;
      if ((p.length === 0) !== primit) {
        rele.push(`${e}: oracolul ${p.length === 0 ? 'primește' : `refuză (${p.slice(0, 3).join('; ')})`}, pe hârtie ${primit ? 'primit' : 'refuzat'}`);
        continue;
      }
      if (primit) continue;
      if (JSON.stringify(categoriiO(p)) !== JSON.stringify([f.categorie])) rele.push(`${e}: categoriile ${categoriiO(p).join(', ')}, nu ${f.categorie} (${p.slice(0, 3).join('; ')})`);
      if (!p.some((m) => m.includes(f.mesaj))) rele.push(`${e}: niciun motiv nu numește ${f.mesaj} (${p.slice(0, 3).join('; ')})`);
    }
  }
  assert.deepEqual(rele, []);
  assert.ok(n >= 250, `${n} valori`);
});

test('(o) frontierele câmpurilor operației (v20 … v22) rămân aceleași pe un document v23', () => {
  const rele: string[] = [];
  for (const f of FRONTIERE_V22) {
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      const p = verificaPanaLaV23O(docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], SCHEMA_V23_O));
      if ((p.length === 0) !== primit) rele.push(`${eticheta(f.cale, valoare)}: oracolul ${p.length === 0 ? 'primește' : `refuză (${p.join('; ')})`}, pe hârtie ${primit ? 'primit' : 'refuzat'}`);
      else if (!primit && JSON.stringify(categoriiO(p)) !== JSON.stringify([f.categorie])) rele.push(`${eticheta(f.cale, valoare)}: categoriile ${categoriiO(p).join(', ')}, nu ${f.categorie}`);
    }
  }
  assert.deepEqual(rele, []);
});

test('(o) refuzurile v23: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V23) {
    const p = verificaPanaLaV23O(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 4).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    // Calea, în forma mesajelor oracolului: a operației de la `operatii` încolo, a lui `texte` întreagă.
    const asteptat = r.camp.includes('.operatii.') && r.camp.startsWith('piese.') ? dinOperatii(r.camp) : r.camp.includes('.texte') ? cuParanteze(r.camp) : undefined;
    if (asteptat !== undefined && !p.some((m) => m.includes(asteptat))) rele.push(`${r.nume}: niciun motiv nu numește ${asteptat} (${p.slice(0, 4).join('; ')})`);
  }
  assert.deepEqual(rele, []);
  assert.ok(REFUZATE_V23.filter((r) => /^T[A-H]/.test(r.nume)).length >= 60);
});

test('(o) ce nu hotărăște textul: oracolul ține ALEGEREA scrisă lângă fiecare caz (și la ușa v23)', () => {
  for (const { nume, doc, alegere } of [...AMBIGUE_V18, ...AMBIGUE_V23]) assert.equal(verificaPanaLaV23O(doc).length === 0, alegere, nume);
  // Pe un document v23, același verdict ca la contractul v23 (nicio ciocnire nu-l schimbă).
  for (const { nume, doc, alegere } of AMBIGUE_V23) assert.equal(verificaVnO(doc, SCHEMA_V23_O).length === 0, alegere, nume);
});

test('(o) ciocnirile v23: rândul lui CAMPURI_NOI_O, pe orice instanță a oricărei foi, doar pe instanță', () => {
  // ADR 0069 §2, 0076 §7, 0087 §6, 0090 §5, 0091 §1, 0092 §1, 0093 §1, 0094 §1, 0133 §1, 0170 §1, 0171 §1, 0172: ce aduce fiecare
  // versiune pe operație; ADR 0210 §7: „o instanță care are deja un câmp necunoscut `texte` e refuzată, cu motiv (ciocnire, ca
  // la ADR 0024 §7)”.
  assert.deepEqual({ ...CAMPURI_NOI_O }, {
    11: ['pasLateral'], 12: ['coborare'], 13: ['retragereCompleta'], 14: ['scula.forma'], 15: ['fundPlat'],
    16: ['directie', 'scula.forma.varf', 'fundPlat.scula.forma.varf'], 17: ['rest', 'fundPlat.rest'], 18: ['strategie'], 19: ['rang'],
    20: ['incrustatie'], 21: ['incrustatie.jocLateral', 'incrustatie.dop', 'incrustatie.sprijin', 'incrustatie.frezeDop'],
    22: ['incrustatie.banda'], 23: ['instanta:texte'],
  });
  assert.equal(PE_INSTANTA_O, 'instanta:');
  // Fiecare câmp nou, pe un document al versiunii dinainte, se ciocnește exact la pasul lui (cu `texte` pe instanță).
  const toate = docV18({ tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 }, [{ id: 'o', scula: { forma: { varf: 1 } }, fundPlat: { scula: { forma: { varf: 1 } }, rest: [] }, pasLateral: 1, coborare: 1, retragereCompleta: 1, directie: 1, rest: 1, strategie: 1, rang: 1, incrustatie: { jocLateral: 1, dop: 1, sprijin: 1, frezeDop: 1, banda: 1 } }]);
  (((toate['foi'] as Liber[])[0] as Liber)['instante'] as Liber[]).forEach((i) => { i['texte'] = 1; });
  for (let de = 10; de < SCHEMA_V23_O; de++) {
    const c = ciocniriO(toate, de);
    assert.equal(c.length, (CAMPURI_NOI_O[de + 1] ?? []).length, `v${de} → v${de + 1}: ${c.join('; ')}`);
    assert.ok(c.every((m) => m.startsWith('[ciocnire]') && m.includes(`nu e un document v${de} valid`)), c.join('; '));
  }
  const doua = { ...docAna(22), foi: [
    { id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i1', piesa: 'pl', x: 0, y: 0, rotire: 0, texte: null }] },
    { id: 'f2', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i2', piesa: 'pl', x: 0, y: 0, rotire: 0 }, { id: 'i3', piesa: 'pl', x: 0, y: 0, rotire: 0, texte: {} }] },
  ] };
  const c = ciocniriO(doua, 22);
  assert.equal(c.length, 2, c.join('; '));
  assert.ok(c[0]?.includes('foi[0].instante[0].texte') && c[1]?.includes('foi[1].instante[1].texte'), c.join('; '));
  assert.ok(c.every((m) => m.startsWith('[ciocnire]') && m.includes('nu e un document v22 valid')), c.join('; '));
  // Pasul de dinainte (v21 → v22) nu se ciocnește pe `texte`, iar `texte` în altă parte nu se ciocnește deloc.
  assert.deepEqual(ciocniriO(doua, 21), []);
  for (const { nume, doc } of NECIOCNIRI_V23) assert.deepEqual(ciocniriO(doc as Liber, 22), [], nume);
  // Un v22 cu plăcuțele e valid la ușa v22 (un câmp necunoscut) și se ciocnește doar la ușa v23.
  assert.deepEqual(verificaPanaLaO(docAna(22), 22), []);
  assert.deepEqual(categoriiO(verificaPanaLaV23O(docAna(22))), ['ciocnire']);
});

test('(o) plafoanele cu literele plăcuțelor: la margine primite, peste ea refuzate cu categoria lor (documente mari)', () => {
  const { valide, refuzate, ambigue } = plafoaneV23();
  for (const { nume, doc } of valide) assert.deepEqual(verificaPanaLaV23O(doc), [], nume);
  for (const { nume, doc, categorie } of refuzate) assert.deepEqual(categoriiO(verificaPanaLaV23O(doc)), [categorie], nume);
  for (const { nume, doc, alegere } of ambigue) assert.equal(verificaPanaLaV23O(doc).length === 0, alegere, nume);
  // Pe hârtie, fără literele plăcuțelor documentul L02 ar avea 99 000 de elemente în lume: plafonul e al literelor.
  const l02 = refuzate.find((c) => c.nume.startsWith('L02'));
  assert.ok(l02 !== undefined);
  const p = verificaPanaLaV23O(l02.doc);
  assert.ok(p.some((m) => m.includes('100001 elemente în lume')), p.join('; '));
});

test('(o) documentele generate cu plăcuțe: cele valide trec neschimbate, fiecare defect are exact categoria lui', () => {
  const rele: string[] = [];
  for (const { nume, doc } of CORPUS_V23) {
    const p = verificaPanaLaV23O(doc);
    if (p.length > 0) rele.push(`${nume}: ${p.slice(0, 3).join('; ')}`);
    else if (diferenta(ridicaV23O(doc), doc) !== undefined) rele.push(`${nume}: schimbat`);
  }
  for (const { nume, doc, categorie } of OTRAVURI_V23) {
    const p = verificaPanaLaV23O(doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([categorie])) rele.push(`${nume}: ${p.length === 0 ? 'primit' : categoriiO(p).join(', ')}, nu ${categorie} (${p.slice(0, 3).join('; ')})`);
  }
  assert.deepEqual(rele, []);
  // Generatorul acoperă ce trebuie: plăcuțe pe mai multe foi, litere cu goluri, operații pe litere, fiecare fel de defect.
  const cuTexte = CORPUS_V23.filter((c) => JSON.stringify(c.doc).includes('"texte"')).length;
  assert.ok(cuTexte >= 25, `${cuTexte} documente generate cu plăcuțe`);
  for (const fel of FELURI_STRICARE_V23) assert.ok(OTRAVURI_V23.some((o) => o.nume.endsWith(`stricat: ${fel}`)), `niciun document stricat „${fel}”`);
  assert.ok(OTRAVURI_V23.length >= 100, `${OTRAVURI_V23.length} documente stricate`);
});

test('(o) câmpurile textului și textul plăcuței, pe hârtie (ADR 0210 §4, §7)', () => {
  assert.deepEqual(campurileO('{nume}'), ['nume']);
  assert.deepEqual(campurileO('Masa {nr}, {nume} și iar {nr}'), ['nr', 'nume', 'nr']);
  assert.deepEqual(campurileO('LEMN'), []);
  assert.deepEqual(campurileO('}nume{'), []);
  assert.deepEqual(textCuValorileO('Masa {nr}', { nr: '12' }), { text: 'Masa 12' });
  assert.deepEqual(textCuValorileO('{a}', { a: "$& $1 $$ $' $`" }), { text: "$& $1 $$ $' $`" });
  assert.deepEqual(textCuValorileO('{a}', { a: '{b}', b: 'X' }), { text: '{b}' });
  assert.deepEqual(textCuValorileO('{nume} {x}', { nume: 'Ana' }), { lipsa: 'x' });
  assert.deepEqual(textCuValorileO('{toString}', {}), { lipsa: 'toString' });
  assert.deepEqual(textCuValorileO('{__proto__}', JSON.parse('{"__proto__": "Ana"}')), { text: 'Ana' });
  assert.deepEqual(textCuValorileO('{nume}', undefined), { lipsa: 'nume' });
});

test('(o) amprenta, pe hârtie: vectorii publicați ai FNV-1a pe 32 de biți și JSON-ul canonic (ADR 0024 §10, ADR 0121)', () => {
  // FNV-1a pe 32 de biți: „” → 811c9dc5, „a” → e40c292c, „foobar” → bf9cf968 (vectorii autorilor); a doua jumătate pornește
  // de la 0x01000193 ^ lungimea, deci la „” e chiar 01000193.
  assert.equal(amprentaSirO(''), '811c9dc501000193');
  assert.equal(amprentaSirO('a').slice(0, 8), 'e40c292c');
  assert.equal(amprentaSirO('foobar').slice(0, 8), 'bf9cf968');
  assert.match(amprentaSirO('[{"x":1}]'), /^[0-9a-f]{16}$/);
  assert.equal(jsonCanonicO({ b: 1, a: [-0, 1e21, 'ș'], __proto__: null }), '{"a":[0,1e+21,"ș"],"b":1}');
  assert.equal(jsonCanonicO(JSON.parse('{"b":1,"__proto__":2,"10":3,"9":4}')), '{"10":3,"9":4,"__proto__":2,"b":1}');
  assert.equal(amprentaContururiO([]), amprentaSirO('[]'));
});

test('(o) ușa v23 întoarce o copie: nimic din rezultat nu e un obiect al intrării', () => {
  for (const { nume, doc } of VALIDE_V23.slice(-12)) {
    const r = ridicaV23O(doc);
    const intrare = new Set<unknown>();
    const strange = (x: unknown): void => {
      if (typeof x !== 'object' || x === null) return;
      intrare.add(x);
      for (const v of Object.values(x)) strange(v);
    };
    strange(doc);
    const comun = (x: unknown): boolean => typeof x === 'object' && x !== null && (intrare.has(x) || Object.values(x).some(comun));
    assert.equal(comun(r), false, nume);
  }
});

test('(o) ușa documentului curent v23 (ADR 0070 §2): migrările doar pe o versiune întreagă 1 … 22', () => {
  for (const s of [1, 2, 10, 21, 22]) assert.equal(usaCurentaV23O({ schema: s }), 'migrari', String(s));
  for (const s of [23, 24, 22.5, 0, -1, '22', null]) assert.equal(usaCurentaV23O({ schema: s }), 'usa', String(s));
  for (const d of [null, [], 'text', 7, {}]) assert.equal(usaCurentaV23O(d), 'usa', JSON.stringify(d));
});

// ── Amprenta, față de aplicație (blocText.ts nu se schimbă la v23) ───────────────────────────────────────────────────

test('(f) amprenta contururilor: oracolul dă exact ce dă aplicația, pe literele șabloanelor și ale plăcuțelor', async () => {
  const { amprentaContururi, jsonCanonic } = await app();
  const liste: unknown[] = [[], [{ x: -0, y: 1e21, z: 5e-324 }], JSON.parse('[{"__proto__": {"a": "ș😀"}, "constructor": 1, "10": 2, "9": 3}]')];
  const strange = (x: unknown): void => {
    if (typeof x !== 'object' || x === null) return;
    if (!Array.isArray(x) && Object.hasOwn(x, 'copii') && Array.isArray((x as Liber)['copii'])) liste.push((x as Liber)['copii']);
    for (const v of Object.values(x)) strange(v);
  };
  for (const { doc } of [...VALIDE_V23.slice(VALIDE_V22.length), ...CORPUS_V23]) strange(doc);
  const rele: string[] = [];
  for (const [k, l] of liste.entries()) {
    const a = amprentaContururi(structuredClone(l) as never);
    const o = amprentaContururiO(l);
    if (a !== o) rele.push(`lista ${k}: aplicația ${a}, oracolul ${o}`);
    const j = jsonCanonic(structuredClone(l) as never);
    const t = typeof j === 'string' ? j : new TextDecoder().decode(j as Uint8Array);
    if (t !== jsonCanonicO(l)) rele.push(`lista ${k}: JSON-ul canonic diferă`);
  }
  assert.deepEqual(rele, []);
  assert.ok(liste.length > 200, `${liste.length} liste`);
});

// ── Ușa aplicației, pe cazurile de pe hârtie (cad cât aplicația e pe v22) ────────────────────────────────────────────

test('(a) ușa aplicației e pe v23', async () => {
  assert.equal((await app()).versiune, SCHEMA_V23_O);
});

test('(a) ușa aplicației primește documentele v23 valide neschimbate, ca o copie', async () => {
  const { incarca } = await app();
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V23) {
    const brut = structuredClone(doc);
    const r = incarca(brut);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${String(r.motiv)})`);
      continue;
    }
    const d = diferenta(r.doc, doc);
    if (d !== undefined) rele.push(`${nume}: ${d}`);
    if ((r.doc as unknown) === brut) rele.push(`${nume}: ușa a întors chiar intrarea, nu o copie`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației urcă documentele vechi exact ca pe hârtie și păstrează `texte` din afara instanței', async () => {
  const rele: string[] = [];
  for (const { nume, vechi, v23 } of [...MIGRARI_V23_HARTIE, ...NECIOCNIRI_V23.map((c) => ({ nume: c.nume, vechi: c.doc, v23: c.v23 }))]) {
    const r = await usa(vechi);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${r.motiv})`);
      continue;
    }
    const d = diferenta(r.doc, v23);
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe frontierele v23: fiecare valoare are verdictul de pe hârtie, cu motiv la refuz', async (t) => {
  const rele: string[] = [];
  for (const f of FRONTIERE_V23) {
    for (const [valoare, primit] of f.valori) {
      const doc = docFrontiera(f, valoare);
      const r = await usa(doc);
      const e = eticheta(f.cale, valoare);
      if (r.ok !== primit) {
        rele.push(`${e}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv.slice(0, 200)}”)`}, pe hârtie ${primit ? 'primit' : 'refuzat'} (${f.adr})`);
        continue;
      }
      if (r.ok) {
        const d = diferenta(r.doc, doc);
        if (d !== undefined) rele.push(`${e}: primit, dar schimbat (${d})`);
      } else if (r.motiv.trim() === '') {
        rele.push(`${e}: refuzat fără motiv`);
      } else if (motivFaraLoc(doc, f.cale, r.motiv)) {
        t.diagnostic(`MOTIV ${e}: nu spune instanța sau texte („${r.motiv.slice(0, 160)}”)`);
      }
    }
  }
  for (const f of FRONTIERE_V22) {
    for (const [valoare, primit] of f.valori) {
      const r = await usa(docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], SCHEMA_V23_O));
      if (r.ok !== primit) rele.push(`${eticheta(f.cale, valoare)} (v23): aplicația ${r.ok ? 'primește' : `refuză („${r.motiv.slice(0, 200)}”)`}, pe hârtie ${primit ? 'primit' : 'refuzat'}`);
    }
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare document stricat, cu motiv (textul citat de ADR, câmpul operației, la ciocnire `texte`)', async (t) => {
  const rele: string[] = [];
  for (const c of REFUZATE_V23) {
    const r = await usa(c.doc);
    if (r.ok) {
      rele.push(`${c.nume}: primit (${c.motiv})`);
      continue;
    }
    if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
    } else if (c.categorie === 'ciocnire' && c.camp.includes('.texte')) {
      // ADR 0210 §7: ciocnirea „ca la ADR 0024 §7”, unde motivul numește câmpul care s-ar pierde.
      if (!r.motiv.includes('texte')) rele.push(`${c.nume}: motivul ciocnirii „${r.motiv.slice(0, 200)}” nu numește câmpul texte`);
    } else if (c.camp.startsWith('foi.')) {
      if (motivFaraLoc(c.doc, c.camp, r.motiv)) t.diagnostic(`MOTIV ${c.nume}: nu spune instanța sau texte („${r.motiv.slice(0, 160)}”)`);
    } else if (typeof c.doc === 'object' && c.doc !== null && (c.doc as Liber)['schema'] === SCHEMA_V23_O && c.camp.startsWith('piese.')) {
      const prefix = c.camp.split('.').slice(0, 5).join('.');
      if (!r.motiv.includes(prefix)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu numește ${prefix}`);
    }
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe plafoanele cu literele plăcuțelor (documente mari): verdictul de pe hârtie', async () => {
  const { valide, refuzate } = plafoaneV23();
  const rele: string[] = [];
  for (const { nume, doc } of valide) {
    const r = await usa(doc);
    if (!r.ok) rele.push(`${nume}: refuzat („${r.motiv.slice(0, 200)}”)`);
    else if (diferenta(r.doc, doc) !== undefined) rele.push(`${nume}: primit, dar schimbat`);
  }
  for (const { nume, doc } of refuzate) {
    const r = await usa(doc);
    if (r.ok) rele.push(`${nume}: primit`);
    else if (r.motiv.trim() === '') rele.push(`${nume}: refuzat fără motiv`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ce nu hotărăște textul: ce face aplicația, doar raportat (lista punctelor DESCHISE)', async (t) => {
  const ambigue = [
    ...AMBIGUE_V23.map((c) => ({ nume: c.nume, doc: c.doc as unknown, alegere: c.alegere, adr: c.adr })),
    ...plafoaneV23().ambigue.map((c) => ({ nume: c.nume, doc: c.doc as unknown, alegere: c.alegere, adr: c.adr })),
    ...FRONTIERE_V23.flatMap((f) => (f.ambigue ?? []).map(([v, alegere, adr]) => ({ nume: eticheta(f.cale, v), doc: docFrontiera(f, v) as unknown, alegere, adr }))),
  ];
  for (const { nume, doc, alegere, adr } of ambigue) {
    const r = await usa(doc);
    t.diagnostic(`DESCHIS ${nume}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv.slice(0, 160)}”)`}, ALEGEREA oracolului ${alegere ? 'primește' : 'refuză'} (${adr})`);
  }
});

// ── Ușa aplicației față de oracol, pe corpusul existent și pe plăcuțele generate ─────────────────────────────────────

/**
 * Corpusul: toate documentele din cazurile oracolului documentului (și ale v23) și ale corpusului CAM, fără ambiguități și fără
 * cele mari (peste 20 000 de obiecte); plus documente generate din alte sămânțe, cu plăcuțe, valide și stricate. Corpusul CAM
 * vine la cerere (își trece documentele prin ușa aplicației când se încarcă), ca în `document.v22.oracol.test.ts`.
 */
const AMBIGUE = new Set<unknown>([...AMBIGUE_V18, ...AMBIGUE_V23].map((c) => c.doc));
async function corpus(): Promise<{ readonly tot: number; readonly mici: unknown[] }> {
  const { CORPUS_CAM } = await import('./ajutor-corpus-cam.ts');
  const generate = Array.from({ length: 40 }, (_, k) => cazuri.genereazaV23(23_500 + k));
  const stricate = generate.flatMap((d) => FELURI_STRICARE_V23.map((fel) => cazuri.stricaV23(d, fel)?.doc).filter((x): x is Liber => x !== undefined));
  const tot = [...documenteDin([cazuri, cazuriV9, cazuriV10]), ...CORPUS_CAM.map((c) => c.doc), ...generate, ...stricate].filter((d) => !AMBIGUE.has(d));
  return { tot: tot.length, mici: tot.filter((d) => marime(d) <= 20_000) };
}

test('(c) pe corpusul oracolului documentului și pe plăcuțele generate, ușa aplicației dă verdictul oracolului v23', async (t) => {
  const { tot, mici: CORPUS } = await corpus();
  const rele: string[] = [];
  let primite = 0;
  let refuzate = 0;
  for (const [k, doc] of CORPUS.entries()) {
    const p = verificaPanaLaV23O(doc);
    const r = await usa(doc);
    const e = `documentul ${k} (schema ${String((doc as Liber | null)?.['schema'])}, ${marime(doc)} obiecte)`;
    if (r.ok !== (p.length === 0)) {
      rele.push(`${e}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv.slice(0, 200)}”)`}, oracolul ${p.length === 0 ? 'primește' : `refuză (${p.slice(0, 3).join('; ').slice(0, 300)})`}`);
      continue;
    }
    if (r.ok) {
      primite++;
      const d = diferenta(r.doc, ridicaV23O(doc));
      if (d !== undefined) rele.push(`${e}: primit, dar altfel decât oracolul (${d.slice(0, 300)})`);
    } else {
      refuzate++;
      if (r.motiv.trim() === '') rele.push(`${e}: refuzat fără motiv`);
    }
  }
  t.diagnostic(`${CORPUS.length} documente (${tot - CORPUS.length} mari, sărite aici): ${primite} primite, ${refuzate} refuzate`);
  assert.deepEqual(rele.slice(0, 40), [], `${rele.length} diferențe`);
  assert.ok(CORPUS.length > 2000, `${CORPUS.length} documente`);
  assert.ok(primite > 100 && refuzate > 100, `${primite} primite, ${refuzate} refuzate`);
});

// ── Ușa documentului curent (ADR 0070 §2) ────────────────────────────────────────────────────────────────────────────

test('(u) ușa documentului curent: null pe o versiune întreagă 1 … 22 (migrările), altfel exact ce dă ușa întreagă', async () => {
  const { incarca, incarcaCurent } = await app();
  const rele: string[] = [];
  const toate: unknown[] = [
    ...(await corpus()).mici, null, [], 'text', 7, { schema: 21, rev: 0 }, { schema: 22, rev: 0 }, { schema: 23, rev: 0 }, { schema: 24, rev: 0 },
    { schema: 0.5 }, { schema: 22.5 }, { schema: '22' }, { schema: -1 }, { rev: 0 },
  ];
  for (const [k, doc] of toate.entries()) {
    const curent = incarcaCurent(copie(doc));
    const e = `documentul ${k} (schema ${typeof doc === 'object' && doc !== null ? String((doc as Liber)['schema']) : JSON.stringify(doc)})`;
    if (usaCurentaV23O(doc) === 'migrari') {
      if (curent !== null) rele.push(`${e}: ușa curentă a răspuns (${curent.ok ? 'primit' : String(curent.motiv)}), nu null`);
    } else if (curent === null) {
      rele.push(`${e}: ușa curentă cere migrările`);
    } else {
      const intreaga = incarca(copie(doc));
      if (curent.ok !== intreaga.ok) rele.push(`${e}: ușa curentă ${curent.ok ? 'primește' : 'refuză'}, ușa întreagă nu`);
      else if (!curent.ok && !intreaga.ok && String(curent.motiv) !== String(intreaga.motiv)) rele.push(`${e}: alt motiv („${String(curent.motiv)}” față de „${String(intreaga.motiv)}”)`);
      else if (curent.ok && intreaga.ok && diferenta(curent.doc, intreaga.doc) !== undefined) rele.push(`${e}: alt document`);
    }
  }
  assert.deepEqual(rele.slice(0, 40), [], `${rele.length} diferențe`);
});

test('(u) ușa documentului curent refuză singură o versiune neîntreagă, fără migrări (ADR 0070 §2)', async () => {
  const { incarca, incarcaCurent } = await app();
  for (const schema of [1.5, 10.5, 21.5, 22.5]) {
    const doc = { schema, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [] }] };
    assert.equal(usaCurentaV23O(doc), 'usa', String(schema));
    const curent = incarcaCurent(structuredClone(doc));
    assert.ok(curent !== null, `schema ${schema}: ușa curentă cere migrările`);
    assert.deepEqual(curent, incarca(structuredClone(doc)), String(schema));
  }
});
