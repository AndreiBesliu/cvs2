/**
 * Documentul v10 (ADR 0037 §2, sub-felia 2.3c-2): calea deschisă la ușă (n ≥ 2 vârfuri, n − 1 segmente, ultimul segment
 * „L”, verificările arcului doar pe segmentele reale), laturile `stanga` / `dreapta`, marcajul `despartire`, plafoanele
 * neschimbate și migrarea v9 → v10 (doar numărul; un v9 cu ce n-are v9 e refuzat). Apoi cele patru locuri care citesc
 * `inchis` („Ce am măsurat” 5): conturul elementului, piesa importului, imbricarea și cutia previzualizării.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as v from 'valibot';
import { numarSegmente } from '../../src/geom/contur.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { caleInchisa, cutieCai, piesaDinImport } from '../../src/io/piesa.ts';
import { PLAFON, VERSIUNE_SCHEMA, type Document, type FormaDoc, type VarfDoc } from '../../src/model/document.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { conturElement } from '../../src/model/forme.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { INIMA } from './ajutor-cale.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 18 };
const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' } as const;
const motiv = (r: ReturnType<typeof incarca>): string => (r.ok ? '' : r.motiv);
const prinUsa = (d: unknown) => incarca(JSON.parse(JSON.stringify(d)));

/** O cale deschisă din puncte, cu linii (ultimul vârf: segmentul `L`, neluat în seamă). */
const deschisa = (...pct: Array<readonly [number, number]>): FormaDoc => ({
  tip: 'cale', inchis: false, varfuri: pct.map(([x, y]): VarfDoc => ({ p: P(x, y), s: L })),
});
const LINIA = deschisa([0, 0], [100, 0]);
const cu = (forma: FormaDoc, x = 50, y = 50): Document => docDin(F, { id: 'c', forma, matrice: { ...ID, e: x, f: y } });

/** Documentul cu forma căii schimbată de `f` (pe o copie JSON). */
function stricat(d: Document, f: (forma: Record<string, any>) => void): unknown {
  const x = JSON.parse(JSON.stringify(d));
  f(x.piese[0].radacina.forma);
  return x;
}

test('v10: o cale deschisă trece prin ușă neschimbată, cu câmpurile necunoscute, și pe segmentul ultimului vârf', () => {
  // Felia 5.1↑ (ADR 0069): aplicația e pe v11, iar căile deschise rămân cum erau.
  assert.equal(VERSIUNE_SCHEMA, 13);
  for (const forma of [LINIA, deschisa([0, 0], [50, 0], [50, 50], [0, 50], [0, 0])]) {
    const d = cu(forma);
    const r = prinUsa(d);
    assert.ok(r.ok, motiv(r));
    if (r.ok) assert.deepEqual(r.doc, d);
  }
  // Un arc real, apoi linia de la capăt: trece; ultimul segment poartă un câmp necunoscut, păstrat.
  const cuArc: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge: 1 } }, { p: P(10, 0), s: L }, { p: P(20, 0), s: { tip: 'L', extra: 7 } }] };
  const r = prinUsa(cu(cuArc));
  assert.ok(r.ok, motiv(r));
  if (r.ok) assert.deepEqual(r.doc, cu(cuArc));
});

test('v10: ușa refuză calea deschisă cu ultimul segment care nu e L, sub 2 vârfuri, sau cu `inchis` care nu e boolean', () => {
  const d = cu(deschisa([0, 0], [50, 0], [50, 50]));
  const cazuri: Array<[string, (f: Record<string, any>) => void, RegExp]> = [
    ['ultimul segment arc', (f) => { f.varfuri[2].s = { tip: 'A', bulge: 0.5 }; }, /ultimul vârf al unei căi deschise are un segment care nu e „L”/],
    ['ultimul segment cubică', (f) => { f.varfuri[2].s = { tip: 'C', c1: P(1, 1), c2: P(2, 2) }; }, /nu e „L”/],
    ['un singur vârf', (f) => { f.varfuri = f.varfuri.slice(0, 1); }, /cel puțin 2 vârfuri/],
    ['inchis text', (f) => { f.inchis = 'false'; }, /inchis/],
    ['inchis 0', (f) => { f.inchis = 0; }, /inchis/],
  ];
  for (const [nume, strica, asteptat] of cazuri) {
    const r = incarca(stricat(d, strica));
    assert.equal(r.ok, false, nume);
    assert.match(motiv(r), asteptat, nume);
  }
  // Același ultim segment arc pe o cale ÎNCHISĂ e un segment real: trece.
  const inchisa = stricat(d, (f) => { f.inchis = true; f.varfuri[2].s = { tip: 'A', bulge: 0.5 }; });
  assert.ok(incarca(inchisa).ok, 'pe o cale închisă, segmentul ultimului vârf e real');
});

test('v10: verificările arcului se fac doar pe cele n − 1 segmente reale (vecinul nu se ia cu (i + 1) % n)', () => {
  // Ultimul vârf stă în primul și are un arc: închisă, arcul ar avea capetele în același punct. Deschisă, singura problemă
  // e regula ultimului segment: nicio verificare a arcului nu se uită la perechea ultim–prim.
  const d = cu({ tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(50, 0), s: L }, { p: P(0, 0), s: { tip: 'A', bulge: 1e-9 } }] });
  const r = v.safeParse(SchemaDocument, JSON.parse(JSON.stringify(d)));
  assert.equal(r.success, false);
  const mesaje = r.success ? [] : r.issues.map((x) => x.message);
  assert.deepEqual(mesaje.filter((m) => /arc al căii/.test(m)), [], mesaje.join(' | '));
  assert.ok(mesaje.some((m) => /nu e „L”/.test(m)), mesaje.join(' | '));
  // Închisă, aceeași cale e refuzată de verificarea arcului (capetele în același punct).
  const z = v.safeParse(SchemaDocument, JSON.parse(JSON.stringify(stricat(d, (f) => { f.inchis = true; }))));
  assert.ok(!z.success && z.issues.some((x) => /capetele în același punct/.test(x.message)));
});

test('v10: laturile stânga / dreapta și marcajul despartire trec de ușă; potrivirea cu `inchis` n-o judecă ușa (ADR 0037 §2)', () => {
  for (const latura of ['stanga', 'dreapta', 'pe-linie'] as const) {
    for (const forma of [LINIA, INIMA]) {
      const d = cuOperatie(cu(forma), 'c', { latura });
      const r = prinUsa(d);
      assert.ok(r.ok, `${latura}: ${motiv(r)}`);
      if (r.ok) assert.deepEqual(r.doc, d);
    }
  }
  // Exterior pe o cale deschisă: ușa o primește (un document cu o cale tocmai deschisă trebuie să se poată redeschide).
  assert.ok(prinUsa(cuOperatie(cu(LINIA), 'c', { latura: 'exterior' })).ok);
  for (const despartire of [true, false]) {
    const d = cuOperatie(cu(LINIA), 'c', { latura: 'pe-linie', despartire });
    const r = prinUsa(d);
    assert.ok(r.ok, motiv(r));
    if (r.ok) assert.deepEqual(r.doc, d);
  }
  assert.match(motiv(prinUsa(cuOperatie(cu(LINIA), 'c', { despartire: 'da' as unknown as boolean }))), /despartire/);
  assert.match(motiv(prinUsa(cuOperatie(cu(LINIA), 'c', { latura: 'sus' as unknown as 'stanga' }))), /latura/);
});

test('v10: plafoanele rămân aceleași; vârfurile căii deschise se numără cu tot cu vârful final', () => {
  const cale = (n: number): FormaDoc => ({
    tip: 'cale', inchis: false, varfuri: Array.from({ length: n }, (_, i): VarfDoc => ({ p: P(i * 0.01, (i % 2) * 0.01), s: L })),
  });
  assert.ok(prinUsa(cu(cale(PLAFON.varfuriCale))).ok, 'exact plafonul unei căi');
  assert.match(motiv(prinUsa(cu(cale(PLAFON.varfuriCale + 1)))), /cel mult 50000 de vârfuri/);
});

/** Documentul `d` marcat v9 (o copie JSON). */
const caV9 = (d: Document): Record<string, any> => ({ ...JSON.parse(JSON.stringify(d)), schema: 9 });

test('migrarea v9 → v10 schimbă doar numărul: același document, cu câmpurile necunoscute', () => {
  const d = docDin(F,
    { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 5 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'h', forma: INIMA, matrice: { ...ID, e: 150, f: 20 } },
    { id: 'o', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 60, f: 50 } });
  const v9 = caV9(d);
  v9['extra'] = { a: 1 };
  v9.piese[0].operatii[0].alt = 3;
  const r = incarca(v9);
  assert.ok(r.ok, motiv(r));
  if (!r.ok) return;
  // Din felia 5.1↑ (ADR 0069), ușa merge mai departe, la v11, din 5.3↑ (ADR 0076) la v12, din 5.4↑ (ADR 0087) la v13, tot
  // doar cu numărul.
  assert.equal(r.doc.schema, 13);
  assert.deepEqual(r.doc, { ...v9, schema: 13 });
  // Fără piese: nimic de verificat, doar numărul.
  const gol = incarca({ schema: 9, rev: 2, piese: [], foi: [{ id: 'f1', stoc: F, instante: [] }] });
  assert.ok(gol.ok && gol.doc.schema === 13);
});

test('migrarea v9 → v10 refuză un v9 cu o cale deschisă, cu stânga / dreapta sau cu câmpul despartire: nu e un v9 valid', () => {
  const deschis = caV9(cu(LINIA));
  assert.match(motiv(incarca(deschis)), /elementul v9 c are o cale care nu e închisă, pe care v9 n-o cunoaște: nu e un document v9 valid/);
  // Și într-un grup, și cu `inchis` lipsă.
  const inGrup = caV9(cu(LINIA));
  inGrup.piese[0].radacina = { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [inGrup.piese[0].radacina] };
  assert.match(motiv(incarca(inGrup)), /elementul v9 c are o cale care nu e închisă/);
  const faraInchis = caV9(cu(INIMA));
  delete faraInchis.piese[0].radacina.forma.inchis;
  assert.match(motiv(incarca(faraInchis)), /nu e un document v9 valid/);
  for (const latura of ['stanga', 'dreapta'] as const) {
    const v9 = caV9(cu(INIMA));
    v9.piese[0].operatii[0].latura = latura;
    assert.match(motiv(incarca(v9)), new RegExp(`operația v9 c din piesa c are latura „${latura}”, pe care v9 n-o cunoaște: nu e un document v9 valid`));
  }
  for (const despartire of [true, false, null]) {
    const v9 = caV9(cu(INIMA));
    v9.piese[0].operatii[0].despartire = despartire;
    assert.match(motiv(incarca(v9)), /operația v9 c din piesa c are câmpul „despartire”, pe care v10 îl folosește: nu e un document v9 valid/);
  }
  // Un document v10 cu aceleași lucruri trece: refuzul e al migrării, nu al schemei.
  assert.ok(prinUsa(cuOperatie(cu(LINIA), 'c', { latura: 'stanga', despartire: true })).ok);
  // Un v8 cu stânga ajunge la aceeași judecată (lanțul trece prin v9).
  const v8: Record<string, any> = { ...caV9(cu({ tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 })), schema: 8 };
  v8.piese[0].operatii[0].latura = 'stanga';
  assert.match(motiv(incarca(v8)), /nu e un document v9 valid/);
});

test('`inchis` citit (1/4): conturElement păstrează calea deschisă, cu n − 1 segmente, fără coarda de închidere', () => {
  const c = conturElement({ forma: deschisa([0, 0], [100, 0], [100, 100]), matrice: { ...ID, e: 10, f: 20 } });
  assert.equal(c.inchis, false);
  assert.equal(numarSegmente(c), 2);
  assert.deepEqual(c.varfuri.map((x) => x.p), [P(10, 20), P(110, 20), P(110, 120)]);
  assert.equal(conturElement({ forma: INIMA, matrice: { ...ID } }).inchis, true);
});

test('`inchis` citit (2/4): piesa importului păstrează calea deschisă; ea nu primește exterior / interior, ci `deschise` pe linie', () => {
  const U = [P(0, 100), P(0, 0), P(100, 0), P(100, 100)].map((p) => ({ p, s: L }));
  const patrat = [P(40, 40), P(60, 40), P(60, 60), P(40, 60)].map((p) => ({ p, s: L }));
  const cai = [{ varfuri: U, inchis: false }, { varfuri: patrat, inchis: true }];
  const laturi = laturiDinImbricare(cai);
  const { piesa, x, y } = piesaDinImport({ nume: 'u', cai, laturi, pagina: { latime: 200, inaltime: 200 } }, 'p1');
  const copii = piesa.radacina.tip === 'grup' ? piesa.radacina.copii : [];
  assert.deepEqual(copii.map((e) => (e.tip === 'element' && e.forma.tip === 'cale' ? e.forma.inchis : null)), [false, true]);
  assert.deepEqual([x, y], [0, 0]);
  // Din 2.3c-3 (ADR 0037 §11), calea deschisă are operația ei: pe linie, 1 mm într-o trecere (fără grosimea foii).
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.latura, o.noduri, o.adancime, o.pas]), [['exterior', 'exterior', ['c2'], 3, 3], ['deschise', 'pe-linie', ['c1'], 1, 1]]);
  // Piesa trece de ușa documentului: calea deschisă, cu operația ei.
  const r = incarca({ schema: 10, rev: 0, piese: [piesa], foi: [{ id: 'f1', stoc: F, instante: [{ id: 'i1', piesa: 'p1', x, y, rotire: 0 }] }] });
  assert.ok(r.ok, motiv(r));
});

test('`inchis` citit (3/4): imbricarea sare căile deschise (nu conțin nimic, latura lor e pe linie)', () => {
  const U = [P(0, 100), P(0, 0), P(100, 0), P(100, 100)].map((p) => ({ p, s: L }));
  const patrat = [P(40, 40), P(60, 40), P(60, 60), P(40, 60)].map((p) => ({ p, s: L }));
  assert.deepEqual(laturiDinImbricare([{ varfuri: U, inchis: false }, { varfuri: patrat, inchis: true }]), ['pe-linie', 'exterior']);
  // Citit închis, U-ul ar fi un pătrat care conține pătratul mic: acela ar ieși interior.
  assert.deepEqual(laturiDinImbricare([{ varfuri: U, inchis: true }, { varfuri: patrat }]), ['exterior', 'interior']);
  // Bugetul nu numără căile deschise vizitate: doar includerile măsurate.
  assert.deepEqual(laturiDinImbricare([{ varfuri: U, inchis: false }, { varfuri: patrat, inchis: true }], 0), ['pe-linie', 'exterior']);
});

test('`inchis` citit (4/4): cutia previzualizării și a piesei (`cutieCai`) n-are segmentul de după ultimul vârf al unei căi deschise', () => {
  // Două semicercuri: (0,0)→(10,0) pe jos, apoi (10,0)→(0,0) pe sus. Deschisă, doar primul (y ∈ [−5; 0]); închisă, cercul.
  const varfuri = [{ p: P(0, 0), s: { tip: 'A', bulge: 1 } as const }, { p: P(10, 0), s: { tip: 'A', bulge: 1 } as const }];
  const deschisaC = cutieCai([{ varfuri, inchis: false }]);
  assert.deepEqual([deschisaC.minY, deschisaC.maxY].map((x) => Math.round(x * 1e9) / 1e9), [-5, 0]);
  const inchisaC = cutieCai([{ varfuri }]);
  assert.deepEqual([inchisaC.minY, inchisaC.maxY].map((x) => Math.round(x * 1e9) / 1e9), [-5, 5]);
  assert.equal(caleInchisa({}), true, 'fără câmp: căile ușii de până la 2.3c-3, toate închise');
  assert.equal(caleInchisa({ inchis: false }), false);
});
