/**
 * Căile deschise în poartă (ADR 0037 §7, §8, §9, §13; felia 2.3c-2, sesiune independentă, scrisă doar din ADR), pe
 * documente și programe scrise de mână, fără aplicație (cazurile în `test/oracles/deschise.cazuri.ts`):
 * - (a) documentele de pe hârtie, tăiate corect, trec toată poarta, iar etichetele lor deschise chiar sunt judecate;
 *   valorile de pe hârtie (D1, D2, D6) sunt chiar în program;
 * - (b) regiunea pe v10: calea deschisă rămâne deschisă (n − 1 primitive, fără coardă, cu capetele în lume), nu e inel,
 *   iar regiunea de dinainte (pentru modul vechi) o închide; ordinea de la §8 pe D5;
 * - (c) martorii negativi: fiecare prins de invarianta cerută, la linia cerută, cu mesajul cerut;
 * - (d) modul `inainteDe0037`: poarta de dinainte pică orice tăietură deschisă corectă („Ce am măsurat”, punctul 1),
 *   nu vede coarda de închidere și nu spune nimic nou; e exact poarta cu regiunea construită ca înainte;
 * - (e) echivalența: pe documentele fără căi deschise, un v9 și același document migrat la v10 au aceeași regiune și
 *   aceleași verdicte, în ambele moduri (și cu etichetele în altă ordine: 14 (iii) nu rulează acolo).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, type ContextPoarta, type Incalcare } from '../oracles/poarta.ts';
import { citeste } from '../oracles/gcode.ts';
import { citesteEticheta, regiuneDinDocument, type Regiune } from '../oracles/regiune.ts';
import { etichetaDeschisa } from '../oracles/deschise.ts';
import { migreazaV9V10O, ridicaV10O, type DocV10O } from '../oracles/document.v10.ts';
import { ridicaV9O, type DocV9O } from '../oracles/document.ts';
import {
  corecte, ctxD, D1, D2, D4, D5, D6, martoriDeschise, programD5, liniaLui, type MartorDeschis,
} from '../oracles/deschise.cazuri.ts';
import { ctx14, docMartor, douaTreceri, martori14, PROGRAM_ED5CD65, PROGRAM_REPARAT } from '../oracles/pe-linie.cazuri.ts';
import { corpus } from '../oracles/regiune.cazuri.ts';
import { corpusUrechi } from '../oracles/urechi.cazuri.ts';
import { corpusRampa } from '../oracles/rampa.cazuri.ts';

const arata = (v: readonly Incalcare[]): string => v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`).join('\n') || '(nimic)';
/** Mesajele aduse de ADR 0037 în afară de 14 (i) (`deschise.ts`). */
const NOI = /^(căile deschise|ordinea \(§8\)|trecerea pe calea deschisă)/;

/** Etichetele valide ale unui program care sunt ale unor căi deschise (cum le vede poarta). */
function etichetiDeschise(text: string, reg: Regiune): number {
  return citeste(text).comentarii.filter((c) => { const e = citesteEticheta(c.text); return e !== null && e !== 'stricata' && etichetaDeschisa(e, reg); }).length;
}

// ── (a) Hârtia ───────────────────────────────────────────────────────────────────────────────────────────────────────

for (const c of corecte()) {
  test(`(a) ${c.nume}: tăiat corect, trece toată poarta; etichetele căilor deschise chiar sunt judecate`, () => {
    const ctx = ctxD(c.doc);
    assert.deepEqual(poarta(c.text, ctx).map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`), []);
    assert.ok(etichetiDeschise(c.text, ctx.regiune!) >= 1, 'nicio etichetă de cale deschisă');
  });
}

/** Liniile programului, de la eticheta dată, fără antet. */
const dupaEticheta = (text: string, eticheta: string): string[] => text.split('\n').slice(liniaLui(text, eticheta));

test('(a) valorile de pe hârtie 1, 2 și 9 sunt chiar în programe (vârful 0, plonjarea la F300, capătul; ridicarea între treceri)', () => {
  const [d1, d2, , , , , d6] = corecte();
  assert.deepEqual(dupaEticheta(d1!.text, '(a/l: cale, pe-linie, 3 mm)').slice(0, 4), ['G0 X10.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y50.000 F1000.0', 'G0 Z5.000']);
  assert.deepEqual(dupaEticheta(d2!.text, '(b/l: cale, pe-linie, 6 mm)').slice(0, 8), [
    'G0 X20.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y50.000 F1000.0', 'G0 Z5.000', 'G0 X20.000 Y50.000', 'G1 Z-6.000 F300.0', 'G1 X120.000 Y50.000 F1000.0', 'G0 Z5.000',
  ]);
  assert.deepEqual(dupaEticheta(d6!.text, '(m/l: cale, pe-linie, 3 mm)').slice(0, 3), ['G0 X150.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X50.000 Y50.000 F1000.0']);
});

// ── (b) Regiunea pe v10 ─────────────────────────────────────────────────────────────────────────────────────────────

test('(b) regiunea pe v10: L-ul deschis are 2 primitive (fără coardă), capetele în lume, inchis = false și nu e inel; regiunea de dinainte îl închide', () => {
  const reg = regiuneDinDocument(D4());
  const t = reg.taieturi.get('e/l')!;
  assert.equal(t.inchis, false);
  assert.equal(t.contur?.deschis, true);
  assert.equal(t.contur?.primitive.length, 2);
  assert.deepEqual(t.contur?.capete, [{ x: 20, y: 10 }, { x: 120, y: 110 }]);
  assert.equal(t.contur?.contine({ x: 100, y: 30 }), false);
  assert.equal(reg.inele.length, 0);
  const vechi = reg.inainteDe0037!;
  const tv = vechi.taieturi.get('e/l')!;
  assert.equal(tv.inchis, undefined);
  assert.equal(tv.contur?.primitive.length, 3, 'regiunea de dinainte închide calea (cu coarda)');
  assert.equal(tv.contur?.deschis, undefined);
});

test('(b) exteriorul pe o cale deschisă nu e inel (K nu se schimbă); în regiunea de dinainte era (închis cu coarda)', () => {
  const reg = regiuneDinDocument(D1({ latura: 'exterior' }));
  assert.equal(reg.inele.length, 0);
  assert.equal(reg.inainteDe0037!.inele.length, 1);
});

test('(b) ordinea de la §8 pe D5: interiorul, pe linie (închis, apoi fanta), exteriorul, despărțirea; nemarcată, linia trece în clasa 1', () => {
  const ord = regiuneDinDocument(D5()).ordine!;
  assert.deepEqual(ord.map((t) => [t.idLume, t.clasa, t.deschisa, t.despartire]), [
    ['p/g', 0, false, false], ['q/k', 1, false, false], ['s/f', 1, true, false], ['p/r', 2, false, false], ['d/l', 3, true, true],
  ]);
  assert.deepEqual(regiuneDinDocument(D5({ marcata: false })).ordine!.map((t) => [t.idLume, t.clasa]), [['p/g', 0], ['q/k', 1], ['s/f', 1], ['d/l', 1], ['p/r', 2]]);
});

// ── (c) Martorii negativi ───────────────────────────────────────────────────────────────────────────────────────────

const martori = martoriDeschise();
for (const m of martori) {
  test(`(c) martorul ${m.nume}: prins`, () => {
    const v = poarta(m.text, ctxD(m.doc));
    for (const c of m.cere) {
      assert.ok(v.some((i) => i.invarianta === c.invarianta && i.linia === c.linia && c.tipar.test(i.mesaj)), `${m.nume}: lipsește [${c.invarianta}] ${c.linia} ${c.tipar}\n${arata(v)}`);
    }
  });
}

test('(c) martorii ceruți de ADR 0037 sunt toți aici (coarda, rampa, zig-zag-ul, exteriorul pe linie, despărțirea înainte, nemarcata în clasa despărțirilor)', () => {
  const nume = martori.map((m: MartorDeschis) => m.nume).join('\n');
  for (const x of [/coarda de închidere/, /rampa pe o cale deschisă/, /zig-zag/, /exteriorul pe o cale deschisă/, /despărțirea tăiată înaintea/, /nemarcată, tăiată după exterior/]) assert.match(nume, x);
  assert.ok(martori.length >= 18, `${martori.length}`);
});

// ── (d) Modul inainteDe0037 ─────────────────────────────────────────────────────────────────────────────────────────

test('(d) poarta de dinainte pică orice tăietură deschisă corectă pe linie („Ce am măsurat”, punctul 1: 11 cere întoarcerea în punctul plonjării)', () => {
  let rosii = 0;
  for (const c of corecte()) {
    const vechi = poarta(c.text, ctxD(c.doc), { inainteDe0037: true });
    // D8 se întoarce singură în vârful 0, deci forma buclei o primește și poarta de dinainte.
    if (c.nume.startsWith('D8')) { assert.deepEqual(vechi.filter((i) => i.invarianta === 11), [], arata(vechi)); continue; }
    assert.ok(vechi.some((i) => i.invarianta === 11 && /nu se întoarce în punctul plonjării/.test(i.mesaj)), `${c.nume}:\n${arata(vechi)}`);
    rosii++;
  }
  assert.ok(rosii >= 8, `${rosii}`);
});

test('(d) poarta de dinainte nu vede coarda de închidere pe L (bucla se întoarce în plonjare), iar cea de acum o vede', () => {
  const m = martori.find((x) => x.nume.startsWith('M1 '))!;
  const ctx = ctxD(m.doc);
  assert.deepEqual(poarta(m.text, ctx, { inainteDe0037: true }), []);
  assert.ok(poarta(m.text, ctx).length > 0);
});

test('(d) modul vechi = poarta de dinainte pe regiunea construită ca înainte (documentul citit ca v9), fără nimic din ADR 0037', () => {
  const programe: Array<readonly [string, string, DocV10O]> = [
    ...corecte().map((c) => [c.nume, c.text, c.doc] as const), ...martori.map((m) => [m.nume, m.text, m.doc] as const),
  ];
  for (const [nume, text, doc] of programe) {
    const ctx = ctxD(doc);
    const vechi = poarta(text, ctx, { inainteDe0037: true });
    // Regiunea „de dinainte”, construită direct: documentul v10 citit de constructorul de dinainte (schema 9 pe etichetă).
    const ctx9: ContextPoarta = { ...ctx, regiune: regiuneDinDocument({ ...doc, schema: 9 } as unknown as DocV9O) };
    assert.deepEqual(vechi, poarta(text, ctx9, { inainteDe0037: true }), nume);
    // Orice mod mai vechi citește și el regiunea de dinainte.
    assert.deepEqual(poarta(text, ctx, { inainteDe0032: true }), poarta(text, ctx9, { inainteDe0032: true }), nume);
    assert.equal(vechi.filter((i) => i.invarianta === 14 || NOI.test(i.mesaj)).length, 0, `${nume}: ${arata(vechi)}`);
  }
});

// ── (e) Echivalența pe documentele fără căi deschise ────────────────────────────────────────────────────────────────

/** Regiunea, fără câmpurile noi (`ordine`, `inainteDe0037`, `inchis`), cu hărțile ca liste: pentru comparare. */
function fara37(reg: Regiune): unknown {
  return JSON.parse(JSON.stringify({
    inele: reg.inele.map((x) => [x.idLume, x.rol, x.contur.primitive, x.contur.arie]), parinte: reg.parinte, margineK: reg.margineK,
    probleme: reg.probleme, grosimeFoaie: reg.grosimeFoaie ?? null,
    taieturi: [...reg.taieturi].map(([id, t]) => [id, t.tip, [...t.laturi], [...t.sensuri], [...(t.urechi ?? [])], [...(t.rampe ?? [])], [...(t.intrari ?? [])], [...(t.colturi ?? [])], t.contur?.primitive ?? null]),
  }));
}

test('(e) regiunea unui document fără căi deschise e aceeași pe v4 … v9 și pe același document migrat la v10 (corpusurile regiunii, urechilor, rampei)', () => {
  const docs = [...corpus().map((c) => c.doc), ...corpusUrechi().map((c) => c.doc), ...corpusRampa().map((c) => c.doc), docMartor(1), docMartor(2)] as unknown as DocV9O[];
  for (const d of docs) {
    const r9 = regiuneDinDocument(d), r10 = regiuneDinDocument(ridicaV10O(d));
    assert.deepEqual(fara37(r10), fara37(r9));
    assert.deepEqual(fara37(r10.inainteDe0037!), fara37(r9));
    assert.ok([...r10.taieturi.values()].every((t) => t.inchis === true));
    assert.ok(r10.ordine!.every((t) => !t.deschisa && !t.despartire));
  }
  assert.ok(docs.length > 100, `${docs.length}`);
});

test('(e) programele scrise de mână ale lui 14 (i), pe documentul v9 și pe același document v10: aceleași verdicte, în ambele moduri', () => {
  const programe: Array<readonly [string, string, DocV9O]> = [
    ['ed5cd65', PROGRAM_ED5CD65, docMartor(1)], ['reparat', PROGRAM_REPARAT, docMartor(1)], ['două treceri', douaTreceri(false), docMartor(2)],
    ['două treceri, una scurtă', douaTreceri(true), docMartor(2)], ...martori14().map((m) => [m.nume, m.text, m.doc] as const),
  ];
  for (const [nume, text, d9] of programe) {
    const c9 = ctx14(d9), c10 = { ...c9, regiune: regiuneDinDocument(migreazaV9V10O(d9)) };
    assert.deepEqual(poarta(text, c10), poarta(text, c9), nume);
    assert.deepEqual(poarta(text, c10, { inainteDe0037: true }), poarta(text, c9, { inainteDe0037: true }), nume);
  }
});

test('(e) un document v10 fără căi deschise: etichetele în altă ordine decât §8 nu sunt judecate de 14 (iii) (ordinea ADR 0025 e a oracolului documentului)', () => {
  // D5 fără fantă și fără linie: doar piesa cu gaura și pătratul gravat, toate închise.
  const d = D5();
  const inchis: DocV10O = { ...d, piese: d.piese.filter((p) => p.id === 'p' || p.id === 'q'), foi: d.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => i.piesa === 'p' || i.piesa === 'q') })) };
  const ctx = ctxD(inchis);
  const v9 = { ...ctx, regiune: regiuneDinDocument(ridicaV9O({ ...inchis, schema: 9 } as unknown as DocV9O)) };
  for (const ordine of ['gkr', 'rkg', 'kgr']) {
    const text = programD5(inchis, ordine);
    assert.deepEqual(poarta(text, ctx), poarta(text, v9), ordine);
    assert.deepEqual(poarta(text, ctx, { inainteDe0037: true }), poarta(text, v9, { inainteDe0037: true }), ordine);
    assert.equal(poarta(text, ctx).filter((i) => /ordinea \(§8\)/.test(i.mesaj)).length, 0, ordine);
  }
  assert.deepEqual(poarta(programD5(inchis, 'gkr'), ctx), []);
});
