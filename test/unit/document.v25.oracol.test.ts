/**
 * Documentul v25 (felia 12.1↑f, ADR 0175: gaura și treapta incrustației cu pereți drepți, sprijinul pe umăr; ușa: ADR 0024,
 * 0070) judecat de oracolul documentului (partea v25 din `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR, înaintea codului). Ca `document.v24.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v25 valide trec neschimbate, cele v24 și mai vechi urcă doar cu numărul,
 *   `locas` și `treapta` în afara incrustației sunt câmpuri necunoscute, frontierele (locașul, sprijinul, treapta), refuzurile
 *   (categoria și câmpul), ciocnirea la v24 → v25 (pe orice fel de incrustație) și sprijinul „umar” pe un v24, ușa documentului
 *   curent;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie (o copie), refuză ce e pe hârtie, cu
 *   motiv (câmpul pe un document v25, textul ciocnirii);
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 24.
 * Ușa aplicației față de oracol pe tot corpusul (cu cazurile de aici) o judecă `document.v22.oracol.test.ts` (c), pe oracolul
 * curent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, ciocniriO, diferenta, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V25_O, usaCurentaO, usaCurentaV25O, verificaO,
  verificaPanaLaO, verificaPanaLaV24O, verificaPanaLaV25O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import {
  cuSchema, docV18, FRONTIERE_V22, FRONTIERE_V24, FRONTIERE_V25, LIPSA, MIGRARI_V25_HARTIE, NECIOCNIRI_V25, REFUZATE_V25, VALIDE_V24,
  VALIDE_V25, VECHI_NOI,
} from '../oracles/document.cazuri.ts';

// ── Ajutoarele ────────────────────────────────────────────────────────────────────────────

/** Calea cu puncte (`treapta.adancime`) în forma mesajelor oracolului (indicii listelor între paranteze). */
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

/** Ce dă ușa aplicației pentru un document primit, pe hârtie: oracolul îl ridică până la versiunea ei. */
const laApp = (d: unknown): unknown => ridicaPanaLaO(d, VERSIUNE_SCHEMA as number);
/** Ușa v25 a oracolului: contractul v25 și ciocnirile până la el. */
const usaV25 = (d: unknown): string[] => verificaPanaLaV25O(d);

/** Frontierele câmpurilor v25, apoi ale punților (v24) și ale câmpurilor operației v20 … v22, pe un document v25. */
const FRONTIERE = [...FRONTIERE_V25, ...FRONTIERE_V24, ...FRONTIERE_V22];

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────

test('(o) oracolul e pe v25 sau mai nou (ADR 0175 §1)', () => {
  assert.ok(SCHEMA_CURENTA_O >= SCHEMA_V25_O);
  assert.equal(SCHEMA_V25_O, 25);
});

test('(o) documentele v25 valide: contractul și ușa v25 le primesc neschimbate, ușa curentă doar cu numărul; ușa v24 le refuză', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V25) {
    const p = verificaVnO(doc, 25);
    if (p.length > 0) rele.push(`${nume}: contractul v25 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV25(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v25 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 25), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v25 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v24 = categoriiO(verificaPanaLaV24O(doc));
    if (JSON.stringify(v24) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v24 dă ${v24.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.ok(VALIDE_V25.length === VALIDE_V24.length + 8, `${VALIDE_V25.length} documente`);
});

test('(o) documentele v24 valide și cele mai vechi urcă la v25 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V24) {
    assert.deepEqual(usaV25(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 25), cuSchema(doc, 25)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV25(doc), [], `un v${versiune} la ușa v25`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 25), cuSchema(doc, 25)), undefined, `un v${versiune} adus la v25: doar numărul`);
  }
});

test('(o) documentele vechi urcă la v25 exact ca pe hârtie; ușa nu-și schimbă intrarea', () => {
  for (const { nume, vechi, v25 } of MIGRARI_V25_HARTIE) {
    const inainte = JSON.stringify(vechi);
    assert.deepEqual(usaV25(vechi), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(vechi, 25), v25), undefined, nume);
    assert.equal(JSON.stringify(vechi), inainte, `${nume}: intrarea s-a schimbat`);
    assert.deepEqual(verificaVnO(v25, 25), [], `${nume}: rezultatul e un v25 valid`);
  }
  assert.ok(MIGRARI_V25_HARTIE.length >= 16, `${MIGRARI_V25_HARTIE.length} migrări`);
});

test('(o) `locas` și `treapta` în afara incrustației (pe operație, pe fundul plat, în bandă, în punți): primite și păstrate', () => {
  for (const { nume, doc, v25 } of NECIOCNIRI_V25) {
    assert.deepEqual(usaV25(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 25), v25), undefined, nume);
  }
});

test('(o) frontierele: fiecare valoare are verdictul de pe hârtie, iar un refuz e al câmpului, cu categoria lui', () => {
  const rele: string[] = [];
  let n = 0;
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 25);
      const p = usaV25(doc);
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
  assert.ok(n > 400, `${n} valori`);
});

test('(o) refuzurile v25: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V25) {
    const p = usaV25(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (r.camp.startsWith('piese.') && !p.some((m) => m.includes(dinOperatii(r.camp)))) rele.push(`${r.nume}: niciun motiv nu numește ${r.camp} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
});

test('(o) ciocnirea v25: `locas` și `treapta` în incrustație (pe orice fel), pe un v24, se ciocnesc doar la pasul v24 → v25', () => {
  // ADR 0175 §1: „un v24 cu `locas` sau `treapta` în `incrustatie` (câmpuri necunoscute atunci) e refuzat, ca ciocnire”.
  assert.deepEqual(CAMPURI_NOI_O[25], ['incrustatie.locas', 'incrustatie.treapta']);
  for (const nume of ['RG0 ', 'RG1 ']) {
    const v24 = REFUZATE_V25.find((r) => r.nume.startsWith(nume))?.doc as Liber;
    assert.equal(v24['schema'], 24, nume);
    const c = ciocniriO(v24, 24);
    assert.equal(c.length, 1, `${nume}${c.join('; ')}`);
    assert.ok(c[0]?.startsWith('[ciocnire]') && c[0].includes('incrustatie') && c[0].includes('nu e un document v24 valid'), c.join('; '));
    // Pașii de dinainte nu se ciocnesc pe ele (v20 → v21, v21 → v22, v22 → v23, v23 → v24).
    for (const de of [20, 21, 22, 23]) assert.deepEqual(ciocniriO(v24, de).filter((m) => m.includes('locas') || m.includes('treapta')), [], `${nume}v${de} → v${de + 1}`);
    assert.deepEqual(categoriiO(usaV25(v24)), ['ciocnire'], nume);
    assert.deepEqual(usaV25(cuSchema(v24, 25)), [], nume);
  }
  // Sprijinul „umar” nu e o valoare v24: refuzat de contractul v24 (nu e o ciocnire de câmp), primit la v25.
  const umar = REFUZATE_V25.find((r) => r.nume.startsWith('RG2 '))?.doc as Liber;
  assert.deepEqual(categoriiO(usaV25(umar)), ['incrustatie']);
  assert.deepEqual(usaV25(cuSchema(umar, 25)), []);
});

test('(o) ușa documentului curent v25 (ADR 0070 §2): migrările doar pe o versiune întreagă 1 … 24', () => {
  for (const s of [1, 2, 10, 23, 24]) assert.equal(usaCurentaV25O({ schema: s }), 'migrari', String(s));
  for (const s of [25, 26, 24.5, 0, -1, '24', null]) assert.equal(usaCurentaV25O({ schema: s }), 'usa', String(s));
  assert.deepEqual(categoriiO(verificaPanaLaO(VALIDE_V25.at(-1)!.doc, 24)), ['schema']);
});

// ── Ușa aplicației, pe cazurile de pe hârtie ──────────────────────────────────────────────────

test('(a) ușa aplicației e pe v25 sau mai nouă', () => {
  assert.ok((VERSIUNE_SCHEMA as number) >= 25);
});

/** Un refuz „scris de o versiune mai nouă” al ușii v25 (R01, un v26) pe care o aplicație mai nouă l-ar primi. */
const primitDeApp = (s: unknown): boolean => typeof s === 'number' && Number.isInteger(s) && s > 25 && s <= (VERSIUNE_SCHEMA as number);

test('(a) ușa aplicației primește documentele v25 valide (urcate doar cu numărul, dacă e mai nouă), ca o copie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V25) {
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

test('(a) ușa aplicației urcă documentele vechi exact ca pe hârtie și păstrează `locas` și `treapta` din afara incrustației', () => {
  const rele: string[] = [];
  for (const { nume, vechi, v25 } of [...MIGRARI_V25_HARTIE, ...NECIOCNIRI_V25.map((c) => ({ nume: c.nume, vechi: c.doc, v25: c.v25 }))]) {
    const r = usa(vechi);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${r.motiv})`);
      continue;
    }
    const d = diferenta(r.doc, laApp(v25));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe frontiere: fiecare valoare are verdictul de pe hârtie; un refuz numește operația și câmpul', () => {
  const rele: string[] = [];
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of f.valori) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 25);
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

test('(a) ușa aplicației refuză fiecare document stricat, cu motiv: câmpul pe un document v25, textul citat de ADR la o ciocnire', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V25) {
    if (c.categorie === 'schema' && primitDeApp((c.doc as Liber | null)?.['schema'])) continue;
    const r = usa(c.doc);
    if (r.ok) {
      rele.push(`${c.nume}: primit (${c.motiv})`);
      continue;
    }
    if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      if (c.categorie === 'ciocnire' && /^RG[01] /.test(c.nume) && !/„(locas|treapta)”/.test(r.motiv)) rele.push(`${c.nume}: motivul ciocnirii „${r.motiv.slice(0, 200)}” nu numește câmpul`);
      if (c.nume.startsWith('RG2 ') && !r.motiv.includes('„umar”')) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu numește sprijinul „umar”`);
    } else if (typeof c.doc === 'object' && c.doc !== null && (c.doc as Liber)['schema'] === 25 && c.camp.startsWith('piese.')) {
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
    ...VALIDE_V25.map((c) => c.doc), ...MIGRARI_V25_HARTIE.map((c) => c.vechi), ...REFUZATE_V25.map((c) => c.doc),
    { schema: 24, rev: 0 }, { schema: 25, rev: 0 }, { schema: 26, rev: 0 }, { schema: 24.5 }, { schema: '25' }, null, 'text',
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
