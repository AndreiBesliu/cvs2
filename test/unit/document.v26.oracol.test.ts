/**
 * Documentul v26 (felia 11.3↑d, ADR 0211: modul urechilor și locurile lor alese; ușa: ADR 0024, 0070) judecat de oracolul
 * documentului (partea v26 din `test/oracles/document.ts`, cu cazurile la capătul lui `test/oracles/document.cazuri.ts`,
 * scrise din ADR, înaintea codului). Ca `document.v25.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v26 valide trec neschimbate, cele v25 și mai vechi urcă doar cu numărul,
 *   `mod` și `locuri` în afara urechilor sunt câmpuri necunoscute, frontierele (modul, locurile, lista unui element, punctul,
 *   coordonatele), refuzurile (categoria și câmpul), ciocnirea la v25 → v26, ușa documentului curent;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie (o copie), refuză ce e pe hârtie, cu
 *   motiv (calea câmpului pe un document v26, textul ciocnirii);
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 25.
 * Ușa aplicației față de oracol pe tot corpusul (cu cazurile de aici) o judecă `document.v22.oracol.test.ts` (c), pe oracolul
 * curent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, ciocniriO, diferenta, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V26_O, usaCurentaO, usaCurentaV26O, verificaO,
  verificaPanaLaO, verificaPanaLaV25O, verificaPanaLaV26O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import {
  cuSchema, docV18, FRONTIERE_V22, FRONTIERE_V24, FRONTIERE_V25, FRONTIERE_V26, LIPSA, MIGRARI_V26_HARTIE, NECIOCNIRI_V26, REFUZATE_V26,
  VALIDE_V25, VALIDE_V26, VECHI_NOI,
} from '../oracles/document.cazuri.ts';

// ── Ajutoarele ────────────────────────────────────────────────────────────────────────────

/** Calea cu puncte (`urechi.locuri.e.0`) în forma mesajelor oracolului (indicii listelor între paranteze). */
const cuParanteze = (cale: string): string => cale.replace(/\.(\d+)(?=\.|$)/g, '[$1]');

/** Partea căii de la `operatii` încolo, în forma mesajelor. */
const dinOperatii = (cale: string): string => {
  const c = cuParanteze(cale);
  return c.slice(Math.max(0, c.indexOf('operatii')));
};

/**
 * Un motiv al oracolului numește câmpul: calea lui întreagă, sau, sub locurile urechilor (cheile și punctele, scrise de
 * oracol ca `locuri["e"][0]`), calea până la `urechi.locuri`.
 */
const numeste = (p: readonly string[], cale: string): boolean => p.some((m) => m.includes(`operatii[0].${cuParanteze(cale)}`)
  || (cale.startsWith('urechi.locuri.') && m.includes('operatii[0].urechi.locuri')));

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

const eticheta = (cale: string, valoare: unknown): string => `${cale} = ${valoare === LIPSA ? '(lipsă)' : String(JSON.stringify(valoare) ?? valoare)}`;

/** Ce dă ușa aplicației pentru un document primit, pe hârtie: oracolul îl ridică până la versiunea ei. */
const laApp = (d: unknown): unknown => ridicaPanaLaO(d, VERSIUNE_SCHEMA as number);
/** Ușa v26 a oracolului: contractul v26 și ciocnirile până la el. */
const usaV26 = (d: unknown): string[] => verificaPanaLaV26O(d);

/** Frontierele câmpurilor v26, apoi ale celor v25, ale punților (v24) și ale câmpurilor operației v20 … v22, pe un document v26. */
const FRONTIERE = [...FRONTIERE_V26, ...FRONTIERE_V25, ...FRONTIERE_V24, ...FRONTIERE_V22];

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────

test('(o) oracolul e pe v26 sau mai nou (ADR 0211)', () => {
  assert.ok(SCHEMA_CURENTA_O >= SCHEMA_V26_O);
  assert.equal(SCHEMA_V26_O, 26);
});

test('(o) documentele v26 valide: contractul și ușa v26 le primesc neschimbate, ușa curentă doar cu numărul; ușa v25 le refuză', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V26) {
    const p = verificaVnO(doc, 26);
    if (p.length > 0) rele.push(`${nume}: contractul v26 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV26(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v26 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 26), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v26 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v25 = categoriiO(verificaPanaLaV25O(doc));
    if (JSON.stringify(v25) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v25 dă ${v25.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.ok(VALIDE_V26.length === VALIDE_V25.length + 10, `${VALIDE_V26.length} documente`);
});

test('(o) documentele v25 valide și cele mai vechi urcă la v26 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V25) {
    assert.deepEqual(usaV26(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 26), cuSchema(doc, 26)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV26(doc), [], `un v${versiune} la ușa v26`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 26), cuSchema(doc, 26)), undefined, `un v${versiune} adus la v26: doar numărul`);
  }
});

test('(o) documentele vechi urcă la v26 exact ca pe hârtie; ușa nu-și schimbă intrarea', () => {
  for (const { nume, vechi, v26 } of MIGRARI_V26_HARTIE) {
    const inainte = JSON.stringify(vechi);
    assert.deepEqual(usaV26(vechi), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(vechi, 26), v26), undefined, nume);
    assert.equal(JSON.stringify(vechi), inainte, `${nume}: intrarea s-a schimbat`);
    assert.deepEqual(verificaVnO(v26, 26), [], `${nume}: rezultatul e un v26 valid`);
  }
  assert.ok(MIGRARI_V26_HARTIE.length >= 18, `${MIGRARI_V26_HARTIE.length} migrări`);
});

test('(o) `mod` și `locuri` în afara urechilor (pe operație, în rampă, în intrări, în punți): primite și păstrate', () => {
  for (const { nume, doc, v26 } of NECIOCNIRI_V26) {
    assert.deepEqual(usaV26(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 26), v26), undefined, nume);
  }
});

test('(o) frontierele: fiecare valoare are verdictul de pe hârtie, iar un refuz e al câmpului, cu categoria lui', () => {
  const rele: string[] = [];
  let n = 0;
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 26);
      const p = usaV26(doc);
      const e = eticheta(f.cale, valoare);
      n++;
      if ((p.length === 0) !== primit) {
        rele.push(`${e}: oracolul ${p.length === 0 ? 'primește' : `refuză (${p.join('; ')})`}, pe hârtie ${primit ? 'primit' : 'refuzat'}`);
        continue;
      }
      if (primit) continue;
      if (JSON.stringify(categoriiO(p)) !== JSON.stringify([f.categorie])) rele.push(`${e}: categoriile ${categoriiO(p).join(', ')}, nu ${f.categorie}`);
      if (!numeste(p, f.cale)) rele.push(`${e}: niciun motiv nu numește câmpul (${p.join('; ')})`);
    }
  }
  assert.deepEqual(rele, []);
  assert.ok(n > 450, `${n} valori`);
});

test('(o) refuzurile v26: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V26) {
    const p = usaV26(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (r.camp.startsWith('piese.') && !p.some((m) => m.includes(dinOperatii(r.camp)))) rele.push(`${r.nume}: niciun motiv nu numește ${r.camp} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
});

test('(o) ciocnirea v26: `mod` și `locuri` în urechi, pe un v25, se ciocnesc doar la pasul v25 → v26', () => {
  // ADR 0211: câmpurile noi ale urechilor; un v25 care le are deja (necunoscute atunci) e o ciocnire, ca la ADR 0024 §7.
  assert.deepEqual(CAMPURI_NOI_O[26], ['urechi.mod', 'urechi.locuri']);
  for (const [nume, laV26] of [['RU0 ', [] as string[]], ['RU1 ', ['urechi']]] as const) {
    const v25 = REFUZATE_V26.find((r) => r.nume.startsWith(nume))?.doc as Liber;
    assert.equal(v25['schema'], 25, nume);
    const c = ciocniriO(v25, 25);
    assert.equal(c.length, 1, `${nume}${c.join('; ')}`);
    assert.ok(c[0]?.startsWith('[ciocnire]') && c[0].includes('urechi') && c[0].includes('nu e un document v25 valid'), c.join('; '));
    // Pașii de dinainte nu se ciocnesc pe ele (de la v20 la v25).
    for (const de of [20, 21, 22, 23, 24]) assert.deepEqual(ciocniriO(v25, de).filter((m) => m.includes('urechi.mod') || m.includes('urechi.locuri')), [], `${nume}v${de} → v${de + 1}`);
    assert.deepEqual(categoriiO(usaV26(v25)), ['ciocnire'], nume);
    // Ca v26, „alese” fără locuri e bun; locurile fără „alese”, nu.
    assert.deepEqual(categoriiO(usaV26(cuSchema(v25, 26))), laV26, nume);
  }
});

test('(o) ușa documentului curent v26 (ADR 0070 §2): migrările doar pe o versiune întreagă 1 … 25', () => {
  for (const s of [1, 2, 10, 24, 25]) assert.equal(usaCurentaV26O({ schema: s }), 'migrari', String(s));
  for (const s of [26, 27, 25.5, 0, -1, '25', null]) assert.equal(usaCurentaV26O({ schema: s }), 'usa', String(s));
  assert.deepEqual(categoriiO(verificaPanaLaO(VALIDE_V26.at(-2)!.doc, 25)), ['schema']);
});

// ── Ușa aplicației, pe cazurile de pe hârtie ──────────────────────────────────────────────────

test('(a) ușa aplicației e pe v26 sau mai nouă', () => {
  assert.ok((VERSIUNE_SCHEMA as number) >= 26);
});

/** Un refuz „scris de o versiune mai nouă” al ușii v26 (R01, un v27) pe care o aplicație mai nouă l-ar primi. */
const primitDeApp = (s: unknown): boolean => typeof s === 'number' && Number.isInteger(s) && s > 26 && s <= (VERSIUNE_SCHEMA as number);

test('(a) ușa aplicației primește documentele v26 valide (urcate doar cu numărul, dacă e mai nouă), ca o copie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V26) {
    const brut = structuredClone(doc);
    const r = incarca(brut);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${String(r.motiv)})`);
      continue;
    }
    const d = diferenta(r.doc, laApp(doc));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
    if ((r.doc as unknown) === brut) rele.push(`${nume}: ușa a întors chiar intrarea, nu o copie`);
  }
  assert.deepEqual(rele, []);
});

test('(a) cheia „__proto__” a locurilor rămâne o cheie proprie, cu lista ei, iar prototipul locurilor e cel obișnuit', () => {
  const c = VALIDE_V26.find((x) => x.nume.startsWith('U10 '));
  assert.ok(c);
  const r = incarca(structuredClone(c.doc));
  assert.ok(r.ok, r.ok ? '' : String(r.motiv));
  const op = (r.doc.piese[0]?.operatii[0]);
  const locuri = op?.urechi?.locuri as object;
  assert.ok(Object.hasOwn(locuri, '__proto__'));
  assert.deepEqual(Object.getOwnPropertyDescriptor(locuri, '__proto__')?.value, [{ x: 0, y: 15 }, { x: 80, y: 15 }]);
  assert.equal(Object.getPrototypeOf(locuri), Object.prototype);
});

test('(a) ușa aplicației urcă documentele vechi exact ca pe hârtie și păstrează `mod` și `locuri` din afara urechilor', () => {
  const rele: string[] = [];
  for (const { nume, vechi, v26 } of [...MIGRARI_V26_HARTIE, ...NECIOCNIRI_V26.map((c) => ({ nume: c.nume, vechi: c.doc, v26: c.v26 }))]) {
    const r = usa(vechi);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${r.motiv})`);
      continue;
    }
    const d = diferenta(r.doc, laApp(v26));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe frontiere: fiecare valoare are verdictul de pe hârtie; un refuz numește operația și câmpul', () => {
  const rele: string[] = [];
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of f.valori) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 26);
      const r = usa(doc);
      const e = eticheta(f.cale, valoare);
      if (r.ok !== primit) {
        rele.push(`${e}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv}”)`}, pe hârtie ${primit ? 'primit' : 'refuzat'} (${f.adr})`);
        continue;
      }
      if (r.ok) {
        const d = diferenta(r.doc, laApp(doc));
        if (d !== undefined) rele.push(`${e}: primit, dar schimbat (${d})`);
      } else if (!r.motiv.includes(`operatii.0.${f.cale.split('.')[0] as string}`)) {
        rele.push(`${e}: motivul nu numește câmpul („${r.motiv}”)`);
      }
    }
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare document stricat, cu motiv: câmpul pe un document v26, textul citat de ADR la o ciocnire', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V26) {
    if (c.categorie === 'schema' && primitDeApp((c.doc as Liber | null)?.['schema'])) continue;
    const r = usa(c.doc);
    if (r.ok) {
      rele.push(`${c.nume}: primit (${c.motiv})`);
      continue;
    }
    if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      if (c.categorie === 'ciocnire' && /^RU[01] /.test(c.nume) && !/„(mod|locuri)”/.test(r.motiv)) rele.push(`${c.nume}: motivul ciocnirii „${r.motiv.slice(0, 200)}” nu numește câmpul`);
    } else if (typeof c.doc === 'object' && c.doc !== null && (c.doc as Liber)['schema'] === 26 && c.camp.startsWith('piese.')) {
      const prefix = c.camp.split('.').slice(0, 5).join('.');
      if (!r.motiv.includes(prefix)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu numește ${prefix}`);
    }
  }
  assert.deepEqual(rele, []);
});

// ── Ușa documentului curent (ADR 0070 §2) ──────────────────────────────────────────────

test('(u) ușa documentului curent: null pe o versiune întreagă de la 1 până sub a ei (migrările), altfel exact ce dă ușa întreagă', () => {
  const rele: string[] = [];
  const toate: unknown[] = [
    ...VALIDE_V26.map((c) => c.doc), ...MIGRARI_V26_HARTIE.map((c) => c.vechi), ...REFUZATE_V26.map((c) => c.doc),
    { schema: 25, rev: 0 }, { schema: 26, rev: 0 }, { schema: 27, rev: 0 }, { schema: 25.5 }, { schema: '26' }, null, 'text',
  ];
  for (const [k, doc] of toate.entries()) {
    const curent = incarcaCurent(copie(doc));
    const e = `documentul ${k} (schema ${typeof doc === 'object' && doc !== null ? String((doc as Liber)['schema']) : JSON.stringify(doc)})`;
    if (usaCurentaO(doc) === 'migrari') {
      if (curent !== null) rele.push(`${e}: ușa curentă a răspuns (${curent.ok ? 'primit' : String(curent.motiv)}), nu null`);
    } else if (curent === null) {
      rele.push(`${e}: ușa curentă cere migrările`);
    } else {
      const intreaga = incarca(copie(doc));
      if (curent.ok !== intreaga.ok) rele.push(`${e}: ușa curentă ${curent.ok ? 'primește' : 'refuză'}, ușa întreagă nu`);
      else if (!curent.ok && !intreaga.ok && String(curent.motiv) !== String(intreaga.motiv)) rele.push(`${e}: alt motiv`);
      else if (curent.ok && intreaga.ok && diferenta(curent.doc, intreaga.doc) !== undefined) rele.push(`${e}: alt document`);
    }
  }
  assert.deepEqual(rele, []);
});
