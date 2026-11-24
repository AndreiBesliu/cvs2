/**
 * Documentul v27 (felia 16.A↑b, ADR 0300 §5: originea frezei, valorile ei de lucru și tăișul; ușa: ADR 0024, 0070) judecat
 * de oracolul documentului (partea v27 din `test/oracles/document.ts`, cu cazurile la capătul lui
 * `test/oracles/document.cazuri.ts`, scrise din ADR, înaintea codului). Ca `document.v26.oracol.test.ts`, pe care îl continuă:
 * - „(o) …”: oracolul singur, pe hârtie: documentele v27 valide trec neschimbate, cele v26 și mai vechi urcă doar cu numărul,
 *   `biblioteca`, `regim` și `tais` în afara unei freze sunt câmpuri necunoscute, frontierele (pe fiecare loc unde stă o
 *   freză), refuzurile (categoria și câmpul), ciocnirea la v26 → v27 (pe fiecare loc), ușa documentului curent;
 * - „(a) …”: ușa aplicației (`incarca`) pe aceleași cazuri: primește exact ce e pe hârtie (o copie), refuză ce e pe hârtie, cu
 *   motiv (calea câmpului pe un document v27, câmpul ciocnirii);
 * - „(u) …”: ușa documentului curent (ADR 0070 §2, `incarcaCurent`): migrările pe o versiune întreagă 1 … 26.
 * Ușa aplicației față de oracol pe tot corpusul (cu cazurile de aici) o judecă `document.v22.oracol.test.ts` (c), pe oracolul
 * curent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import {
  CAMPURI_NOI_O, categoriiO, ciocniriO, diferenta, FREZE_OPERATIE_O, ridicaPanaLaO, SCHEMA_CURENTA_O, SCHEMA_V27_O, usaCurentaO,
  usaCurentaV27O, verificaO, verificaPanaLaO, verificaPanaLaV26O, verificaPanaLaV27O, verificaVnO, type Liber,
} from '../oracles/document.ts';
import {
  cuSchema, docV18, FRONTIERE_V22, FRONTIERE_V24, FRONTIERE_V25, FRONTIERE_V26, FRONTIERE_V27, LIPSA, MIGRARI_V27_HARTIE,
  NECIOCNIRI_V27, REFUZATE_V27, VALIDE_V26, VALIDE_V27, VECHI_NOI,
} from '../oracles/document.cazuri.ts';

// ── Ajutoarele ────────────────────────────────────────────────────────────────────────────

/** Calea cu puncte (`rest.0.scula.regim`) în forma mesajelor oracolului (indicii listelor între paranteze). */
const cuParanteze = (cale: string): string => cale.replace(/\.(\d+)(?=\.|$)/g, '[$1]');

/** Partea căii de la `operatii` încolo, în forma mesajelor. */
const dinOperatii = (cale: string): string => {
  const c = cuParanteze(cale);
  return c.slice(Math.max(0, c.indexOf('operatii')));
};

/** Un motiv al oracolului numește câmpul: calea lui întreagă (sub locurile urechilor, calea până la `urechi.locuri`). */
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
/** Ușa v27 a oracolului: contractul v27 și ciocnirile până la el. */
const usaV27 = (d: unknown): string[] => verificaPanaLaV27O(d);

/** Frontierele câmpurilor v27, apoi ale celor v26, v25, ale punților (v24) și ale câmpurilor v20 … v22, pe un document v27. */
const FRONTIERE = [...FRONTIERE_V27, ...FRONTIERE_V26, ...FRONTIERE_V25, ...FRONTIERE_V24, ...FRONTIERE_V22];

// ── Oracolul singur ──────────────────────────────────────────────────────────────────────────

test('(o) oracolul e pe v27 sau mai nou (ADR 0300 §5)', () => {
  assert.ok(SCHEMA_CURENTA_O >= SCHEMA_V27_O);
  assert.equal(SCHEMA_V27_O, 27);
});

test('(o) documentele v27 valide: contractul și ușa v27 le primesc neschimbate, ușa curentă doar cu numărul; ușa v26 le refuză', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V27) {
    const p = verificaVnO(doc, 27);
    if (p.length > 0) rele.push(`${nume}: contractul v27 îl refuză (${p.slice(0, 3).join('; ')})`);
    const u = usaV27(doc);
    if (u.length > 0) rele.push(`${nume}: ușa v27 îl refuză (${u.slice(0, 3).join('; ')})`);
    const d = diferenta(ridicaPanaLaO(doc, 27), doc);
    if (d !== undefined) rele.push(`${nume}: ușa v27 îl schimbă (${d})`);
    const c = verificaO(doc);
    if (c.length > 0) rele.push(`${nume}: ușa curentă îl refuză (${c.slice(0, 3).join('; ')})`);
    const v26 = categoriiO(verificaPanaLaV26O(doc));
    if (JSON.stringify(v26) !== JSON.stringify(['schema'])) rele.push(`${nume}: ușa v26 dă ${v26.join(', ') || 'primit'}, nu [schema]`);
  }
  assert.deepEqual(rele, []);
  assert.ok(VALIDE_V27.length === VALIDE_V26.length + 13, `${VALIDE_V27.length} documente`);
});

test('(o) documentele v26 valide și cele mai vechi urcă la v27 doar cu numărul', () => {
  for (const { nume, doc } of VALIDE_V26) {
    assert.deepEqual(usaV27(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 27), cuSchema(doc, 27)), undefined, nume);
  }
  for (const { versiune, doc } of VECHI_NOI) {
    assert.deepEqual(usaV27(doc), [], `un v${versiune} la ușa v27`);
    assert.equal(diferenta(ridicaPanaLaO(doc, 27), cuSchema(doc, 27)), undefined, `un v${versiune} adus la v27: doar numărul`);
  }
});

test('(o) documentele vechi urcă la v27 exact ca pe hârtie; ușa nu-și schimbă intrarea', () => {
  for (const { nume, vechi, v27 } of MIGRARI_V27_HARTIE) {
    const inainte = JSON.stringify(vechi);
    assert.deepEqual(usaV27(vechi), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(vechi, 27), v27), undefined, nume);
    assert.equal(JSON.stringify(vechi), inainte, `${nume}: intrarea s-a schimbat`);
    assert.deepEqual(verificaVnO(v27, 27), [], `${nume}: rezultatul e un v27 valid`);
  }
  assert.ok(MIGRARI_V27_HARTIE.length >= 20, `${MIGRARI_V27_HARTIE.length} migrări`);
});

test('(o) `biblioteca`, `regim` și `tais` în afara unei freze (pe operație, pe fundul plat, pe bandă): primite și păstrate', () => {
  for (const { nume, doc, v27 } of NECIOCNIRI_V27) {
    assert.deepEqual(usaV27(doc), [], nume);
    assert.equal(diferenta(ridicaPanaLaO(doc, 27), v27), undefined, nume);
  }
});

test('(o) frontierele: fiecare valoare are verdictul de pe hârtie, iar un refuz e al câmpului, cu categoria lui', () => {
  const rele: string[] = [];
  let n = 0;
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of [...f.valori, ...(f.ambigue ?? []).map(([v, p]) => [v, p] as const)]) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 27);
      const p = usaV27(doc);
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
  assert.ok(n > 550, `${n} valori`);
});

test('(o) refuzurile v27: fiecare document stricat are exact categoria lui, iar motivul numește câmpul', () => {
  const rele: string[] = [];
  for (const r of REFUZATE_V27) {
    const p = usaV27(r.doc);
    if (JSON.stringify(categoriiO(p)) !== JSON.stringify([r.categorie])) {
      rele.push(`${r.nume}: ${p.length === 0 ? 'primit' : `categoriile ${categoriiO(p).join(', ')} (${p.slice(0, 3).join('; ')})`}, nu ${r.categorie}`);
      continue;
    }
    if (r.camp.startsWith('piese.') && !p.some((m) => m.includes(dinOperatii(r.camp)))) rele.push(`${r.nume}: niciun motiv nu numește ${r.camp} (${p.join('; ')})`);
  }
  assert.deepEqual(rele, []);
});

test('(o) ciocnirea v27: `biblioteca`, `regim` și `tais` pe o freză a unui v26 se ciocnesc doar la pasul v26 → v27, pe fiecare loc', () => {
  // ADR 0300 §5: câmpurile noi ale frezei, pe toate locurile unde stă una; un v26 care le are deja e o ciocnire (ADR 0024 §7).
  assert.deepEqual(FREZE_OPERATIE_O, ['scula', 'rest[].scula', 'fundPlat.scula', 'fundPlat.rest[].scula', 'incrustatie.frezeDop[].scula', 'incrustatie.banda.freza']);
  assert.deepEqual(CAMPURI_NOI_O[27], FREZE_OPERATIE_O.flatMap((f) => ['biblioteca', 'regim', 'tais'].map((c) => `${f}.${c}`)));
  const ciocniri = REFUZATE_V27.filter((r) => /^RF[0-5] /.test(r.nume));
  assert.equal(ciocniri.length, 6, 'câte una pe fiecare loc');
  for (const r of ciocniri) {
    const v26 = r.doc as Liber;
    assert.equal(v26['schema'], 26, r.nume);
    const c = ciocniriO(v26, 26);
    assert.equal(c.length, 1, `${r.nume}: ${c.join('; ')}`);
    assert.ok(c[0]?.startsWith('[ciocnire]') && c[0].includes(dinOperatii(r.camp)) && c[0].includes('nu e un document v26 valid'), c.join('; '));
    // Pașii de dinainte nu se ciocnesc pe ele (de la v20 la v26).
    for (const de of [20, 21, 22, 23, 24, 25]) {
      assert.deepEqual(ciocniriO(v26, de).filter((m) => /\.(biblioteca|regim|tais)\b/.test(m)), [], `${r.nume}v${de} → v${de + 1}`);
    }
    assert.deepEqual(categoriiO(usaV27(v26)), ['ciocnire'], r.nume);
  }
  // Pe un v26, un câmp necunoscut pe freză cu alt nume nu e o ciocnire (N27d).
  assert.deepEqual(ciocniriO(NECIOCNIRI_V27.at(-1)!.doc, 26), []);
});

test('(o) ușa documentului curent v27 (ADR 0070 §2): migrările doar pe o versiune întreagă 1 … 26', () => {
  for (const s of [1, 2, 10, 25, 26]) assert.equal(usaCurentaV27O({ schema: s }), 'migrari', String(s));
  for (const s of [27, 28, 26.5, 0, -1, '26', null]) assert.equal(usaCurentaV27O({ schema: s }), 'usa', String(s));
  assert.deepEqual(categoriiO(verificaPanaLaO(VALIDE_V27.at(-1)!.doc, 26)), ['schema']);
});

// ── Ușa aplicației, pe cazurile de pe hârtie ──────────────────────────────────────────────────

test('(a) ușa aplicației e pe v27 sau mai nouă', () => {
  assert.ok((VERSIUNE_SCHEMA as number) >= 27);
});

/** Un refuz „scris de o versiune mai nouă” al ușii v27 (R01, un v28) pe care o aplicație mai nouă l-ar primi. */
const primitDeApp = (s: unknown): boolean => typeof s === 'number' && Number.isInteger(s) && s > 27 && s <= (VERSIUNE_SCHEMA as number);

test('(a) ușa aplicației primește documentele v27 valide (urcate doar cu numărul, dacă e mai nouă), ca o copie', () => {
  const rele: string[] = [];
  for (const { nume, doc } of VALIDE_V27) {
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

test('(a) ușa aplicației păstrează originea, valorile și tăișul frezei, cu câmpurile lor necunoscute', () => {
  const c = VALIDE_V27.find((x) => x.nume.startsWith('W11 '));
  assert.ok(c);
  const r = incarca(structuredClone(c.doc));
  assert.ok(r.ok, r.ok ? '' : String(r.motiv));
  const s = r.doc.piese[0]?.operatii[0]?.scula;
  assert.deepEqual(s?.biblioteca, { id: 'f1', rev: 1, nume: 'Plată Ø6' });
  assert.deepEqual(s?.regim, { turatie: 18_000, avans: 1_000, plonjare: 300, nota: 'x' });
  assert.equal(s?.tais, 22);
});

test('(a) ușa aplicației urcă documentele vechi exact ca pe hârtie și păstrează câmpurile din afara frezelor', () => {
  const rele: string[] = [];
  for (const { nume, vechi, v27 } of [...MIGRARI_V27_HARTIE, ...NECIOCNIRI_V27.map((c) => ({ nume: c.nume, vechi: c.doc, v27: c.v27 }))]) {
    const r = usa(vechi);
    if (!r.ok) {
      rele.push(`${nume}: refuzat (${r.motiv})`);
      continue;
    }
    const d = diferenta(r.doc, laApp(v27));
    if (d !== undefined) rele.push(`${nume}: ${d}`);
  }
  assert.deepEqual(rele, []);
});

test('(a) ușa aplicației pe frontiere: fiecare valoare are verdictul de pe hârtie; un refuz numește operația și câmpul', () => {
  const rele: string[] = [];
  for (const f of FRONTIERE) {
    for (const [valoare, primit] of f.valori) {
      const doc = docV18(f.forma, [cuValoare(f.operatie, f.cale, valoare)], 27);
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

test('(a) ușa aplicației refuză fiecare document stricat, cu motiv: câmpul pe un document v27, câmpul ciocnirii', () => {
  const rele: string[] = [];
  for (const c of REFUZATE_V27) {
    if (c.categorie === 'schema' && primitDeApp((c.doc as Liber | null)?.['schema'])) continue;
    const r = usa(c.doc);
    if (r.ok) {
      rele.push(`${c.nume}: primit (${c.motiv})`);
      continue;
    }
    if (r.motiv.trim() === '') rele.push(`${c.nume}: refuzat fără motiv`);
    if (c.text !== undefined) {
      if (!r.motiv.includes(c.text)) rele.push(`${c.nume}: motivul „${r.motiv.slice(0, 200)}” nu spune „${c.text}”`);
      if (c.categorie === 'ciocnire' && /^RF\d /.test(c.nume) && !/„(biblioteca|regim|tais)”/.test(r.motiv)) rele.push(`${c.nume}: motivul ciocnirii „${r.motiv.slice(0, 200)}” nu numește câmpul`);
    } else if (typeof c.doc === 'object' && c.doc !== null && (c.doc as Liber)['schema'] === 27 && c.camp.startsWith('piese.')) {
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
    ...VALIDE_V27.map((c) => c.doc), ...MIGRARI_V27_HARTIE.map((c) => c.vechi), ...REFUZATE_V27.map((c) => c.doc),
    { schema: 26, rev: 0 }, { schema: 27, rev: 0 }, { schema: 28, rev: 0 }, { schema: 26.5 }, { schema: '27' }, null, 'text',
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
