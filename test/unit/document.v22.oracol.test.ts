/**
 * Documentul v11–v22 (ADR 0069, 0076, 0087, 0090–0094, 0133, 0170, 0171, 0172; ușa: ADR 0024, 0025, 0070) judecat de oracolul lui
 * independent (felia 5.1↑c: secțiunea „Documentul v11–v22” de la finalul lui `test/oracles/document.ts`, cu cazurile la finalul
 * lui `test/oracles/document.cazuri.ts`, scrise doar din ADR-uri, fără ușa aplicației și fără partea v11–v18 de dinainte; v19,
 * rangul operației (felia 5.9↑), v20, incrustația (felia 12.1↑), v21, incrustația cu pereți drepți (felia 12.1↑b), și v22, banda dopului în V (felia 12.1↑c), adăugate
 * tot din textul ADR-urilor):
 * - „(o) …”: oracolul singur, pe hârtie: documentele v22 valide trec neschimbate, iar cele v18 … v21 valide urcă doar cu
 *   numărul;
 *   documentele vechi urcă exact ca pe hârtie,
 *   câmpurile noi în afara locului lor sunt câmpuri necunoscute, frontierele fiecărui câmp, refuzurile (categoria și
 *   câmpul), ușile v11 … v18 (fiecare primește versiunea ei și o refuză pe cea de după), migrarea pură;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie (o copie), refuză ce e pe hârtie,
 *   cu motivul (câmpul în motiv pe un document al versiunii curente, textul citat de ADR la o ciocnire);
 * - „(c) …”: ușa aplicației față de oracol pe corpusul existent (toate documentele din cazurile oracolului documentului și
 *   documentele corpusului CAM, cu buzunare, coborâri, strategii și freze de rest);
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): `null` pe o versiune întreagă 1 … 20, altfel exact ușa
 *   întreagă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, ciocniriO, diferenta, ridicaO, ridicaPanaLaO, SCHEMA_CURENTA_O, usaCurentaO, verificaO, verificaPanaLaO,
  verificaVnO, type Liber,
} from '../oracles/document.ts';
import * as cazuri from '../oracles/document.cazuri.ts';
import {
  AMBIGUE_V18, cuSchema, docV18, FRONTIERE_V22, LIPSA, MIGRARI_V22_HARTIE, NECIOCNIRI_V22, REFUZATE_V22, VALIDE_V18, VALIDE_V19,
  VALIDE_V20, VALIDE_V21, VALIDE_V22, VECHI_NOI,
} from '../oracles/document.cazuri.ts';
import * as cazuriV9 from '../oracles/document.v9.cazuri.ts';
import * as cazuriV10 from '../oracles/document.v10.cazuri.ts';

// ── Ajutoarele ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Calea cu puncte (`rest.0.pasLateral`) în forma mesajelor oracolului (`rest[0].pasLateral`). */
const cuParanteze = (cale: string): string => cale.replace(/\.(\d+)(?=\.|$)/g, '[$1]');

/** O copie a operației, cu `valoare` pusă (sau ștearsă, `LIPSA`) la calea dată. */
function cuValoare(op: Liber, cale: string, valoare: unknown): Liber {
  const c = structuredClone(op);
  const pasi = cale.split('.');
  let x: Liber = c;
  for (const pas of pasi.slice(0, -1)) x = x[pas] as Liber;
  const ultim = pasi.at(-1) as string;
  if (valoare === LIPSA) delete x[ultim];
  else x[ultim] = valoare;
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

/** Ce dă ușa aplicației: documentul primit, sau motivul refuzului. */
function usa(brut: unknown): { readonly ok: true; readonly doc: unknown } | { readonly ok: false; readonly motiv: string } {
  const r = incarca(copie(brut));
  return r.ok ? { ok: true, doc: r.doc } : { ok: false, motiv: String(r.motiv) };
}

/** Partea căii de la `operatii` încolo, în forma mesajelor (partea v1–v10 scrie piesa după id: „piesa p.operatii[0]”). */
const dinOperatii = (cale: string): string => {
  const c = cuParanteze(cale);
  return c.slice(Math.max(0, c.indexOf('operatii')));
};

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

/** Un document mare (peste 20 000 de noduri, instanțe sau operații): o singură trecere, fără încărcări repetate. */
function marime(d: unknown): number {
  let n = 0;
  const stiva: unknown[] = [d];
  for (let x = stiva.pop(); x !== undefined; x = stiva.pop()) {
    if (typeof x !== 'object' || x === null) continue;
    n++;
    if (n > 1_000_000) break;
    for (const v of Object.values(x)) if (typeof v === 'object' && v !== null) stiva.push(v);
  }
  return n;
}

const SCHEMA_APP = VERSIUNE_SCHEMA as number;

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────────────────────────────

test('(o) documentele v18 valide: contractul v18 și ușa le primesc, iar ușa v19 le urcă doar cu numărul; ușa v17 le refuză', () => {
  for (const { nume, doc } of VALIDE_V18) {
    assert.deepEqual(verificaVnO(doc, 18), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaO(doc), cuSchema(doc, SCHEMA_CURENTA_O)), undefined, nume);
    assert.deepEqual(categoriiO(verificaPanaLaO(doc, 17)), ['schema'], `${nume}: ușa v17`);
  }
  assert.ok(VALIDE_V18.length >= 36);
});

test('(o) documentele v19 valide: contractul v19 și ușa le primesc, iar ușa v20 le urcă doar cu numărul; ușa v18 le refuză', () => {
  for (const { nume, doc } of VALIDE_V19) {
    assert.deepEqual(verificaVnO(doc, 19), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaO(doc), cuSchema(doc, SCHEMA_CURENTA_O)), undefined, nume);
    assert.deepEqual(categoriiO(verificaPanaLaO(doc, 18)), ['schema'], `${nume}: ușa v18`);
  }
  assert.ok(VALIDE_V19.length >= VALIDE_V18.length + 6);
});

test('(o) documentele v20 valide: contractul v20 și ușa le primesc, iar ușa v21 le urcă doar cu numărul; ușa v19 le refuză', () => {
  for (const { nume, doc } of VALIDE_V20) {
    assert.deepEqual(verificaVnO(doc, 20), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaO(doc), cuSchema(doc, SCHEMA_CURENTA_O)), undefined, nume);
    assert.deepEqual(categoriiO(verificaPanaLaO(doc, 19)), ['schema'], `${nume}: ușa v19`);
  }
  assert.ok(VALIDE_V20.length >= VALIDE_V19.length + 6);
});

test('(o) documentele v21 valide: contractul v21 și ușa le primesc, iar ușa v22 le urcă doar cu numărul; ușa v20 le refuză', () => {
  for (const { nume, doc } of VALIDE_V21) {
    assert.deepEqual(verificaVnO(doc, 21), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaO(doc), cuSchema(doc, SCHEMA_CURENTA_O)), undefined, nume);
    assert.deepEqual(categoriiO(verificaPanaLaO(doc, 20)), ['schema'], `${nume}: ușa v20`);
  }
  assert.ok(VALIDE_V21.length >= VALIDE_V20.length + 6);
});

test('(o) documentele v22 valide: contractul v22 și ușa le primesc, ușa v22 le dă neschimbate, ușa v23 le urcă doar cu numărul; ușa v21 le refuză', () => {
  for (const { nume, doc } of VALIDE_V22) {
    assert.deepEqual(verificaVnO(doc, 22), [], nume);
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 22), doc), undefined, nume);
    // Felia 11.4↑ (ADR 0210 §7): v22 → v23 schimbă doar numărul.
    assert.equal(diferenta(ridicaO(doc), { ...(doc as Liber), schema: 23 }), undefined, `${nume}: ușa v23`);
    assert.deepEqual(categoriiO(verificaPanaLaO(doc, 21)), ['schema'], `${nume}: ușa v21`);
  }
  assert.ok(VALIDE_V22.length >= VALIDE_V21.length + 6);
});

test('(o) documentele vechi urcă la v22 exact ca pe hârtie; ușa nu-și schimbă intrarea', () => {
  for (const { nume, vechi, v22 } of MIGRARI_V22_HARTIE) {
    const inainte = JSON.stringify(vechi);
    assert.deepEqual(verificaO(vechi), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(vechi, 22), v22), undefined, nume);
    assert.equal(diferenta(ridicaO(vechi), { ...(v22 as Liber), schema: 23 }), undefined, `${nume}: la v23, doar numărul`);
    assert.equal(JSON.stringify(vechi), inainte, `${nume}: intrarea s-a schimbat`);
    assert.deepEqual(verificaVnO(v22, 22), [], `${nume}: rezultatul e un v22 valid`);
  }
});

test('(o) un câmp nou în afara locului lui e un câmp necunoscut oarecare: primit și păstrat', () => {
  for (const { nume, doc, v22 } of NECIOCNIRI_V22) {
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 22), v22), undefined, nume);
  }
});

test('(o) frontierele: fiecare valoare are verdictul de pe hârtie, iar un refuz e al câmpului, cu categoria lui', () => {
  const rele: string[] = [];
  let n = 0;
  for (const f of FRONTIERE_V22) {
    // Valorile ambigue au verdictul ALEGERII (oracolul trebuie să-l țină; aplicația doar se raportează, mai jos).
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      // Pe un document al versiunii curente: altfel un câmp nou (rangul, pe un v18) s-ar ciocni în migrare, nu s-ar judeca.
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], SCHEMA_CURENTA_O);
      const p = verificaO(doc);
      const eticheta = `${f.cale} = ${valoare === LIPSA ? '(lipsă)' : String(JSON.stringify(valoare) ?? valoare)}`;
      n++;
      if ((p.length === 0) !== primit) {
        rele.push(`${eticheta}: oracolul ${p.length === 0 ? 'primește' : `refuză (${p.join('; ')})`}, pe hârtie ${primit ? 'primit' : 'refuzat'}`);
        continue;
      }
      if (primit) continue;
      if (JSON.stringify(categoriiO(p)) !== JSON.stringify([f.categorie])) rele.push(`${eticheta}: categoriile ${categoriiO(p).join(', ')}, nu ${f.categorie}`);
      if (!p.some((m) => m.includes(`operatii[0].${cuParanteze(f.cale)}`))) rele.push(`${eticheta}: niciun motiv nu numește câmpul (${p.join('; ')})`);
    }
  }
  assert.deepEqual(rele, []);
  assert.ok(n > 310, `${n} valori`);
});

test('(o) refuzurile: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  // Refuzurile ușii v22 (R01: un v23 e, pentru ea, o versiune mai nouă).
  for (const r of REFUZATE_V22) {
    const p = verificaPanaLaO(r.doc, 22);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (r.camp !== '' && r.camp !== 'schema' && !p.some((m) => m.includes(dinOperatii(r.camp)))) {
      rele.push(`${r.nume}: niciun motiv nu numește ${r.camp} (${p.join('; ')})`);
    }
  }
  assert.deepEqual(rele, []);
});

test('(o) ce nu hotărăște textul: oracolul ține ALEGEREA scrisă lângă fiecare caz', () => {
  for (const { nume, doc, alegere } of AMBIGUE_V18) assert.equal(verificaO(doc).length === 0, alegere, nume);
});

test('(o) ușile v11 … v18: fiecare primește documentul versiunii ei și pe cele dinainte, refuză versiunea de după', () => {
  for (const { versiune, doc } of VECHI_NOI) {
    for (let usaV = Math.max(versiune, 11); usaV <= SCHEMA_CURENTA_O; usaV++) {
      assert.deepEqual(verificaPanaLaO(doc, usaV), [], `un v${versiune} la ușa v${usaV}`);
      assert.equal(diferenta(ridicaPanaLaO(doc, usaV), cuSchema(doc, usaV)), undefined, `un v${versiune} adus la v${usaV}: doar numărul`);
    }
    if (versiune >= 12) assert.deepEqual(categoriiO(verificaPanaLaO(doc, versiune - 1)), ['schema'], `un v${versiune} la ușa v${versiune - 1}`);
  }
});

test('(o) ciocnirile: fiecare câmp nou, pe un document al versiunii dinainte, se ciocnește exact la pasul lui', () => {
  // ADR 0069 §2, 0076 §7, 0087 §6, 0090 §5, 0091 §1, 0092 §1, 0093 §1, 0094 §1, 0133 §1, 0170 §1, 0171 §1, 0172: ce aduce fiecare
  // versiune pe operație.
  assert.deepEqual({ ...CAMPURI_NOI_O }, {
    11: ['pasLateral'], 12: ['coborare'], 13: ['retragereCompleta'], 14: ['scula.forma'], 15: ['fundPlat'],
    16: ['directie', 'scula.forma.varf', 'fundPlat.scula.forma.varf'], 17: ['rest', 'fundPlat.rest'], 18: ['strategie'], 19: ['rang'],
    20: ['incrustatie'], 21: ['incrustatie.jocLateral', 'incrustatie.dop', 'incrustatie.sprijin', 'incrustatie.frezeDop'],
    22: ['incrustatie.banda'], 23: ['instanta:texte'],
  });
  const op = docV18({ tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 }, [{ id: 'o', scula: { forma: { varf: 1 } }, fundPlat: { scula: { forma: { varf: 1 } }, rest: [] }, pasLateral: 1, coborare: 1, retragereCompleta: 1, directie: 1, rest: 1, strategie: 1, rang: 1, incrustatie: { jocLateral: 1, dop: 1, sprijin: 1, frezeDop: 1, banda: 1 } }]);
  // Rândul 23 e al instanței (`texte`, ADR 0210 §7): îl judecă proba v23; aici, pașii pe operație, până la v22.
  for (let de = 10; de < 22; de++) {
    const c = ciocniriO(op, de);
    assert.equal(c.length, (CAMPURI_NOI_O[de + 1] ?? []).length, `v${de} → v${de + 1}: ${c.join('; ')}`);
    assert.ok(c.every((m) => m.startsWith('[ciocnire]') && m.includes(`nu e un document v${de} valid`)), c.join('; '));
  }
});

test('(o) ușa întoarce o copie: nimic din rezultat nu e un obiect al intrării', () => {
  for (const { nume, doc } of VALIDE_V22.slice(0, 5)) {
    const r = ridicaO(doc);
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

// ── Ușa aplicației, pe cazurile de pe hârtie ─────────────────────────────────────────────────────────────────────────

const DOAR_CURENTA = SCHEMA_APP === SCHEMA_CURENTA_O ? false : `aplicația e pe schema ${SCHEMA_APP}; cazurile sunt ale ușii v${SCHEMA_CURENTA_O}`;

test('(a) ușa aplicației primește documentele v22 valide, urcate la v23 doar cu numărul, ca o copie', { skip: DOAR_CURENTA }, () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V22) {
    const brut = structuredClone(doc);
    const r = incarca(brut);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${String(r.motiv)})`);
      continue;
    }
    const d = diferenta(r.doc, { ...(doc as Liber), schema: SCHEMA_CURENTA_O });
    if (d !== undefined) rele.push(`${nume}: ${d}`);
    if ((r.doc as unknown) === brut) rele.push(`${nume}: ușa a întors chiar intrarea, nu o copie`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației urcă documentele vechi exact ca pe hârtie și păstrează câmpurile noi din afara locului lor', { skip: DOAR_CURENTA }, () => {
  const rele: string[] = [];
  for (const { nume, vechi: doc, v22 } of [...MIGRARI_V22_HARTIE, ...NECIOCNIRI_V22.map((c) => ({ nume: c.nume, vechi: c.doc, v22: c.v22 }))]) {
    const r = usa(doc);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${r.motiv})`);
      continue;
    }
    const d = diferenta(r.doc, { ...(v22 as Liber), schema: SCHEMA_CURENTA_O });
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe frontiere: fiecare valoare are verdictul de pe hârtie; un refuz numește operația și câmpul', { skip: DOAR_CURENTA }, (t) => {
  const rele: string[] = [];
  for (const f of FRONTIERE_V22) {
    for (const [valoare, alegere, de] of f.ambigue ?? []) {
      const r = usa(docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], SCHEMA_CURENTA_O));
      t.diagnostic(`AMBIGUU ${f.cale} = ${String(valoare)}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv}”)`}, ALEGEREA oracolului ${alegere ? 'primește' : 'refuză'} (${de})`);
    }
    for (const [valoare, primit] of f.valori) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], SCHEMA_CURENTA_O);
      const r = usa(doc);
      const eticheta = `${f.cale} = ${valoare === LIPSA ? '(lipsă)' : String(JSON.stringify(valoare) ?? valoare)}`;
      if (r.ok !== primit) {
        rele.push(`${eticheta}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv}”)`}, pe hârtie ${primit ? 'primit' : 'refuzat'} (${f.adr})`);
        continue;
      }
      if (r.ok) {
        const d = diferenta(r.doc, doc);
        if (d !== undefined) rele.push(`${eticheta}: primit, dar schimbat (${d})`);
      } else if (!r.motiv.includes(`operatii.0.${f.cale.split('.')[0] as string}`)) {
        rele.push(`${eticheta}: motivul nu numește câmpul („${r.motiv}”)`);
      }
    }
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare document stricat, cu motiv: câmpul pe un document curent, textul citat de ADR la o ciocnire', { skip: DOAR_CURENTA }, () => {
  const rele: string[] = [];
  // R01 (un v23, „mai nou” pentru ușa v22) e chiar versiunea aplicației: el nu se mai cere refuzat.
  for (const c of REFUZATE_V22.filter((x) => !(x.categorie === 'schema' && (x.doc as Liber)['schema'] === SCHEMA_APP))) {
    const r = usa(c.doc);
    if (r.ok) {
      rele.push(`${c.nume}: primit (${c.motiv})`);
      continue;
    }
    if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv}” nu spune „${c.text}”`);
    } else if (typeof c.doc === 'object' && c.doc !== null && (c.doc as Liber)['schema'] === SCHEMA_CURENTA_O && c.camp.startsWith('piese.')) {
      const prefix = c.camp.split('.').slice(0, 5).join('.');
      if (!r.motiv.includes(prefix)) rele.push(`${c.nume}: motivul „${r.motiv}” nu numește ${prefix}`);
    }
  }
  assert.deepEqual(rele, []);
});

test('(a) ce nu hotărăște textul: ce face aplicația, doar raportat (lista ambiguităților din raportul feliei)', { skip: DOAR_CURENTA }, (t) => {
  for (const { nume, doc, alegere, adr } of AMBIGUE_V18) {
    const r = usa(doc);
    t.diagnostic(`AMBIGUU ${nume}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv}”)`}, ALEGEREA oracolului ${alegere ? 'primește' : 'refuză'} (${adr})`);
  }
});

// ── Ușa aplicației față de oracol, pe corpusul existent ──────────────────────────────────────────────────────────────

/**
 * Corpusul: toate documentele din cazurile oracolului documentului și ale corpusului CAM (`ajutor-corpus-cam.ts`), fără
 * ambiguități și fără cele mari (peste 20 000 de obiecte: 99 de documente la plafoanele v1–v10, ~69 s aici; le trec deja,
 * o dată fiecare, testele lipirii, `document*.oracol.test.ts`, prin aceeași ușă a oracolului, `verificaO` / `ridicaO`).
 * Corpusul CAM vine la cerere: modulul lui își trece documentele prin ușa aplicației când se încarcă și aruncă la un refuz,
 * deci, importat sus, o ușă stricată ar opri tot fișierul înaintea probelor de aici (o plasă care nu e a lor).
 */
const AMBIGUE = new Set<unknown>(AMBIGUE_V18.map((c) => c.doc));
let corpusul: { readonly tot: number; readonly mici: unknown[] } | undefined;
async function corpus(): Promise<{ readonly tot: number; readonly mici: unknown[] }> {
  if (corpusul === undefined) {
    const { CORPUS_CAM } = await import('./ajutor-corpus-cam.ts');
    const tot = [...documenteDin([cazuri, cazuriV9, cazuriV10]), ...CORPUS_CAM.map((c) => c.doc)].filter((d) => !AMBIGUE.has(d));
    corpusul = { tot: tot.length, mici: tot.filter((d) => marime(d) <= 20_000) };
  }
  return corpusul;
}

test('(c) pe corpusul oracolului documentului, ușa aplicației dă verdictul oracolului, iar ce primește e exact v22-ul oracolului', { skip: DOAR_CURENTA }, async (t) => {
  const { tot, mici: CORPUS } = await corpus();
  const rele: string[] = [];
  let primite = 0;
  let refuzate = 0;
  for (const [k, doc] of CORPUS.entries()) {
    const p = verificaO(doc);
    const r = usa(doc);
    const eticheta = `documentul ${k} (schema ${String((doc as Liber | null)?.['schema'])}, ${marime(doc)} obiecte)`;
    if (r.ok !== (p.length === 0)) {
      rele.push(`${eticheta}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv.slice(0, 200)}”)`}, oracolul ${p.length === 0 ? 'primește' : `refuză (${p.slice(0, 3).join('; ').slice(0, 300)})`}`);
      continue;
    }
    if (r.ok) {
      primite++;
      const d = diferenta(r.doc, ridicaO(doc));
      if (d !== undefined) rele.push(`${eticheta}: primit, dar altfel decât oracolul (${d.slice(0, 300)})`);
    } else {
      refuzate++;
      if (r.motiv.trim() === '') rele.push(`${eticheta}: refuzat fără motiv`);
    }
  }
  t.diagnostic(`${CORPUS.length} documente (${tot - CORPUS.length} mari, sărite aici): ${primite} primite, ${refuzate} refuzate`);
  assert.deepEqual(rele, []);
  assert.ok(CORPUS.length > 2000, `${CORPUS.length} documente`);
  assert.ok(primite > 100 && refuzate > 100, `${primite} primite, ${refuzate} refuzate`);
});

// ── Ușa documentului curent (ADR 0070) ───────────────────────────────────────────────────────────────────────────────

test('(u) ușa documentului curent: null pe o versiune întreagă 1 … 18 (migrările), altfel exact ce dă ușa întreagă', { skip: DOAR_CURENTA }, async () => {
  const rele: string[] = [];
  const toate: unknown[] = [...(await corpus()).mici, null, [], 'text', 7, { schema: 19, rev: 0 }, { schema: 20, rev: 0 }, { schema: 21, rev: 0 }, { schema: 22, rev: 0 }, { schema: 23, rev: 0 }, { schema: 0.5 }, { schema: 18.5 }, { schema: '18' }, { schema: -1 }, { rev: 0 }];
  for (const [k, doc] of toate.entries()) {
    const curent = incarcaCurent(copie(doc));
    const eticheta = `documentul ${k} (schema ${typeof doc === 'object' && doc !== null ? String((doc as Liber)['schema']) : JSON.stringify(doc)})`;
    if (usaCurentaO(doc) === 'migrari') {
      if (curent !== null) rele.push(`${eticheta}: ușa curentă a răspuns (${curent.ok ? 'primit' : curent.motiv}), nu null`);
    } else if (curent === null) {
      rele.push(`${eticheta}: ușa curentă cere migrările`);
    } else {
      const intreaga = incarca(copie(doc));
      if (curent.ok !== intreaga.ok) rele.push(`${eticheta}: ușa curentă ${curent.ok ? 'primește' : 'refuză'}, ușa întreagă nu`);
      else if (!curent.ok && !intreaga.ok && curent.motiv !== intreaga.motiv) rele.push(`${eticheta}: alt motiv („${curent.motiv}” față de „${intreaga.motiv}”)`);
      else if (curent.ok && intreaga.ok && diferenta(curent.doc, intreaga.doc) !== undefined) rele.push(`${eticheta}: alt document`);
    }
  }
  assert.deepEqual(rele, []);
});

/**
 * Divergența găsită de felia 5.1↑c și reparată la cererea owner-ului („Da, repar-o aici”): ADR 0070 §2 cere migrările doar
 * pentru „un document mai vechi (o versiune întreagă între 1 și cea curentă, exclusiv)”, iar un document „fără versiune sau
 * stricat se refuză în ușa curentă (refuzul nu cere migrări)”. Aplicația cerea migrările și pentru o versiune neîntreagă din
 * (1, 18), apoi (1, 19), (1, 20), (1, 21), azi (1, 22): ușa întreagă o refuza apoi, cu același verdict, dar pornirea aducea degeaba bucata migrărilor.
 */
test('(u) ușa documentului curent refuză singură o versiune neîntreagă între 1 și versiunea curentă, fără migrări (ADR 0070 §2)', { skip: DOAR_CURENTA }, () => {
  for (const schema of [1.5, 10.5, 17.5, 17.000001, 18.5, 19.5, 20.5, 21.5]) {
    const doc = { schema, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [] }] };
    assert.equal(usaCurentaO(doc), 'usa', String(schema));
    const curent = incarcaCurent(structuredClone(doc));
    assert.ok(curent !== null, `schema ${schema}: ușa curentă cere migrările`);
    assert.deepEqual(curent, incarca(structuredClone(doc)), String(schema));
  }
});
