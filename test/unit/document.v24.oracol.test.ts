/**
 * Documentul v24 (felia 12.1↑b-2, ADR 0174: punțile dopului drept decupat, alese în fereastră; ușa: ADR 0024, 0070) judecat
 * de oracolul documentului (partea v24 din `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR, înaintea codului). Ca `document.v22.oracol.test.ts` (banda, tot pe
 * incrustație), pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v24 valide trec neschimbate, cele v23 și mai vechi urcă doar cu numărul,
 *   `punti` în afara incrustației e un câmp necunoscut (ori al benzii), frontierele punților, refuzurile (categoria și câmpul),
 *   ciocnirea la v23 → v24 (pe orice fel de incrustație), ușa documentului curent;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie (o copie), refuză ce e pe hârtie, cu
 *   motiv (câmpul pe un document v24, textul ciocnirii);
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 23.
 * Ușa aplicației față de oracol pe tot corpusul (cu cazurile de aici) o judecă deja `document.v22.oracol.test.ts` (c), pe
 * oracolul curent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, ciocniriO, diferenta, ridicaO, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V24_O, usaCurentaO, verificaO,
  verificaPanaLaO, verificaPanaLaV23O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import {
  cuSchema, docV18, FRONTIERE_V22, FRONTIERE_V24, LIPSA, MIGRARI_V24_HARTIE, NECIOCNIRI_V24, REFUZATE_V24, VALIDE_V23, VALIDE_V24,
  VECHI_NOI,
} from '../oracles/document.cazuri.ts';

// ── Ajutoarele ────────────────────────────────────────────────────────────────────────────

/** Calea cu puncte (`punti.numar`) în forma mesajelor oracolului (`punti.numar`; indicii listelor între paranteze). */
const cuParanteze = (cale: string): string => cale.replace(/\.(\d+)(?=\.|$)/g, '[$1]');

/** Partea căii de la `operatii` încolo, în forma mesajelor. */
const dinOperatii = (cale: string): string => {
  const c = cuParanteze(cale);
  return c.slice(Math.max(0, c.indexOf('operatii')));
};

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

/** Frontierele punților, apoi cele ale câmpurilor operației v20 … v22 (aceleași pe un v24), pe un document al versiunii curente. */
const FRONTIERE = [...FRONTIERE_V24, ...FRONTIERE_V22];

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────

test('(o) oracolul e pe v24 (ADR 0174 §2)', () => {
  assert.equal(SCHEMA_CURENTA_O, SCHEMA_V24_O);
  assert.equal(SCHEMA_V24_O, 24);
});

test('(o) documentele v24 valide: contractul v24 și ușa le primesc neschimbate; ușa v23 le refuză', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V24) {
    const p = verificaVnO(doc, 24);
    if (p.length > 0) rele.push(`${nume}: contractul v24 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = verificaO(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v24 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaO(doc), doc);
    if (d !== undefined) rele.push(`${nume}: ușa îl schimbă (${d})`);
    const v23 = categoriiO(verificaPanaLaV23O(doc));
    if (JSON.stringify(v23) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v23 dă ${v23.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.ok(VALIDE_V24.length === VALIDE_V23.length + 7, `${VALIDE_V24.length} documente`);
});

test('(o) documentele v23 valide și cele mai vechi urcă la v24 doar cu numărul; ușile v11 … v24 le primesc', () => {
  for (const { nume, doc } of VALIDE_V23) {
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaO(doc), cuSchema(doc, 24)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(verificaO(doc), [], `un v${versiune} la ușa v24`);
    assert.equal(diferenta(ridicaO(doc), cuSchema(doc, 24)), undefined, `un v${versiune} adus la v24: doar numărul`);
  }
});

test('(o) documentele vechi urcă la v24 exact ca pe hârtie; ușa nu-și schimbă intrarea', () => {
  for (const { nume, vechi, v24 } of MIGRARI_V24_HARTIE) {
    const inainte = JSON.stringify(vechi);
    assert.deepEqual(verificaO(vechi), [], nume);
    assert.equal(diferenta(ridicaO(vechi), v24), undefined, nume);
    assert.equal(JSON.stringify(vechi), inainte, `${nume}: intrarea s-a schimbat`);
    assert.deepEqual(verificaVnO(v24, 24), [], `${nume}: rezultatul e un v24 valid`);
  }
  assert.ok(MIGRARI_V24_HARTIE.length >= 14, `${MIGRARI_V24_HARTIE.length} migrări`);
});

test('(o) `punti` în afara incrustației (pe operație, pe fundul plat, pe o freză a dopului) și punțile benzii: primite și păstrate', () => {
  for (const { nume, doc, v24 } of NECIOCNIRI_V24) {
    assert.deepEqual(verificaO(doc), [], nume);
    assert.equal(diferenta(ridicaO(doc), v24), undefined, nume);
  }
});

test('(o) frontierele: fiecare valoare are verdictul de pe hârtie, iar un refuz e al câmpului, cu categoria lui', () => {
  const rele: string[] = [];
  let n = 0;
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 24);
      const p = verificaO(doc);
      const e = eticheta(f.cale, valoare);
      n++;
      if ((p.length === 0) !== primit) {
        rele.push(`${e}: oracolul ${p.length === 0 ? 'primește' : `refuză (${p.join('; ')})`}, pe hârtie ${primit ? 'primit' : 'refuzat'}`);
        continue;
      }
      if (primit) continue;
      if (JSON.stringify(categoriiO(p)) !== JSON.stringify([f.categorie])) rele.push(`${e}: categoriile ${categoriiO(p).join(', ')}, nu ${f.categorie}`);
      if (!p.some((m) => m.includes(`operatii[0].${cuParanteze(f.cale)}`))) rele.push(`${e}: niciun motiv nu numește câmpul (${p.join('; ')})`);
    }
  }
  assert.deepEqual(rele, []);
  assert.ok(n > 350, `${n} valori`);
});

test('(o) refuzurile v24: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V24) {
    const p = verificaO(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (r.camp.startsWith('piese.') && !p.some((m) => m.includes(dinOperatii(r.camp)))) rele.push(`${r.nume}: niciun motiv nu numește ${r.camp} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
});

test('(o) ciocnirea v24: `punti` în incrustație (pe orice fel), pe un v23, se ciocnește doar la pasul v23 → v24', () => {
  // ADR 0174 §2: „un document v23 care are deja `punti` în `incrustatie` (un câmp necunoscut) e refuzat, ca ciocnire”.
  assert.deepEqual(CAMPURI_NOI_O[24], ['incrustatie.punti']);
  for (const nume of ['RP0 ', 'RP1 ']) {
    const v23 = REFUZATE_V24.find((r) => r.nume.startsWith(nume))?.doc as Liber;
    assert.equal(v23['schema'], 23, nume);
    const c = ciocniriO(v23, 23);
    assert.equal(c.length, 1, `${nume}${c.join('; ')}`);
    assert.ok(c[0]?.startsWith('[ciocnire]') && c[0].includes('incrustatie') && c[0].includes('punti') && c[0].includes('nu e un document v23 valid'), c.join('; '));
    // Pașii de dinainte nu se ciocnesc pe `punti` (v20 → v21, unde vine incrustația dreaptă, v21 → v22, v22 → v23).
    for (const de of [20, 21, 22]) assert.deepEqual(ciocniriO(v23, de).filter((m) => m.includes('punti')), [], `${nume}v${de} → v${de + 1}`);
    // Refuzul ușii: o ciocnire; același document, scris v24, e valid.
    assert.deepEqual(categoriiO(verificaO(v23)), ['ciocnire'], nume);
    assert.deepEqual(verificaO(cuSchema(v23, 24)), [], nume);
  }
});

test('(o) ușa documentului curent v24 (ADR 0070 §2): migrările doar pe o versiune întreagă 1 … 23', () => {
  for (const s of [1, 2, 10, 22, 23]) assert.equal(usaCurentaO({ schema: s }), 'migrari', String(s));
  for (const s of [24, 25, 23.5, 0, -1, '23', null]) assert.equal(usaCurentaO({ schema: s }), 'usa', String(s));
  // Ușa unei aplicații rămase pe 23: un v24 e „scris de o versiune mai nouă”.
  assert.deepEqual(categoriiO(verificaPanaLaO(VALIDE_V24.at(-1)!.doc, 23)), ['schema']);
  assert.equal(diferenta(ridicaPanaLaO(VALIDE_V24.at(-1)!.doc, 24), VALIDE_V24.at(-1)!.doc), undefined);
});

// ── Ușa aplicației, pe cazurile de pe hârtie ──────────────────────────────────────────────────────────

test('(a) ușa aplicației e pe v24', () => {
  assert.equal(VERSIUNE_SCHEMA as number, 24);
});

test('(a) ușa aplicației primește documentele v24 valide neschimbate, ca o copie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V24) {
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

test('(a) ușa aplicației urcă documentele vechi exact ca pe hârtie și păstrează `punti` din afara incrustației', () => {
  const rele: string[] = [];
  for (const { nume, vechi, v24 } of [...MIGRARI_V24_HARTIE, ...NECIOCNIRI_V24.map((c) => ({ nume: c.nume, vechi: c.doc, v24: c.v24 }))]) {
    const r = usa(vechi);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${r.motiv})`);
      continue;
    }
    const d = diferenta(r.doc, v24);
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe frontiere: fiecare valoare are verdictul de pe hârtie; un refuz numește operația și câmpul', () => {
  const rele: string[] = [];
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of f.valori) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 24);
      const r = usa(doc);
      const e = eticheta(f.cale, valoare);
      if (r.ok !== primit) {
        rele.push(`${e}: aplicația ${r.ok ? 'primește' : `refuză („${r.motiv}”)`}, pe hârtie ${primit ? 'primit' : 'refuzat'} (${f.adr})`);
        continue;
      }
      if (r.ok) {
        const d = diferenta(r.doc, doc);
        if (d !== undefined) rele.push(`${e}: primit, dar schimbat (${d})`);
      } else if (!r.motiv.includes(`operatii.0.${f.cale.split('.')[0] as string}`)) {
        rele.push(`${e}: motivul nu numește câmpul („${r.motiv}”)`);
      }
    }
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației refuză fiecare document stricat, cu motiv: câmpul pe un document v24, textul citat de ADR la o ciocnire', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V24) {
    const r = usa(c.doc);
    if (r.ok) {
      rele.push(`${c.nume}: primit (${c.motiv})`);
      continue;
    }
    if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      if (c.categorie === 'ciocnire' && c.camp.endsWith('.punti') && !r.motiv.includes('„punti”')) rele.push(`${c.nume}: motivul ciocnirii „${r.motiv.slice(0, 200)}” nu numește câmpul punti`);
    } else if (typeof c.doc === 'object' && c.doc !== null && (c.doc as Liber)['schema'] === 24 && c.camp.startsWith('piese.')) {
      const prefix = c.camp.split('.').slice(0, 5).join('.');
      if (!r.motiv.includes(prefix)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu numește ${prefix}`);
    }
  }
  assert.deepEqual(rele, []);
});

// ── Ușa documentului curent (ADR 0070 §2) ──────────────────────────────────────────────────────────────

test('(u) ușa documentului curent: null pe o versiune întreagă 1 … 23 (migrările), altfel exact ce dă ușa întreagă', () => {
  const rele: string[] = [];
  const toate: unknown[] = [
    ...VALIDE_V24.map((c) => c.doc), ...MIGRARI_V24_HARTIE.map((c) => c.vechi), ...REFUZATE_V24.map((c) => c.doc),
    { schema: 23, rev: 0 }, { schema: 24, rev: 0 }, { schema: 25, rev: 0 }, { schema: 23.5 }, { schema: '24' }, null, 'text',
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
