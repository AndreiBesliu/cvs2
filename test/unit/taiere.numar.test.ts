/**
 * Locul numărului gravat pe un panou (ADR 0181, felia 10.3↑n), pe hârtie. Cifrele au cutia 7 × 10 (o cifră de 10 mm), deci
 * jocul e 2,5 și probele marginii cer 2,5 + 2,5 / 4 = 3,125 de orice contur; pasul căutării e jumătate din cifre (3,5 pe X, 5
 * pe Y):
 * - **pătratul de 100 × 100:** primul loc, (3,125; 3,125); cu cutia cifrelor mutată față de origine (−1 pe X), originea se mută
 *   cu ea (4,125);
 * - **o gaură** de 20 × 20 la (5, 5): locul cel mai apropiat de colț e deasupra ei, la (3,125; 28,125) (primul pas după 25 +
 *   3,125 pe Y; alături, la (31,125; 3,125), e mai departe);
 * - **un L** (fără colțul de 40 × 40 din stânga-jos): deasupra decupăturii, la (3,125; 43,125) (lângă ea, la (45,125; 3,125), e
 *   mai departe);
 * - **o linie deschisă** (o gravură) la Y = 10, de-a lungul panoului: cifrele urcă peste ea, la Y = 13,125;
 * - **un cerc mic** (r 0,2) înăuntrul cutiei a două cifre (14 × 10), departe de probele ei: îl prinde regula „niciun contur întreg
 *   înăuntru”, deci cifrele trec la următorul loc (10,125);
 * - **un panou mare** (1 200 × 600) cu o gaură îngustă lângă colț (5..15 × 2..300): grila fină de lângă colț (pasul 3,5) dă
 *   20,625 (3,125 + 5 · 3,5, primul pas după 15 + 3,125); grila rară (pasul 1 200 / 60 = 20) ar da 23,125;
 * - **un panou de 12 × 12:** 7 + 2 · 3,125 > 12 pe lățime, deci null; fără contururi închise, null;
 * - **jocul și înălțimea:** max(2, h / 4); înălțimile bune, de la 3 la 100.
 * - **acțiunea `document.taie` cu numere:** firma de 2 400 × 1 000, în patru panouri de 1 200 × 500 (cu litera „a” pe panoul 1):
 *   workerul dă bucățile fiecărui panou (`perPanou`); fiecare număr (aici o piesă de 7 × 10, pusă unde zice `locNumar`) intră în
 *   grupul panoului lui, cu un id nou (nici al documentului de dinainte), la locul dat: panoul 1, grupul de trei (placa, litera,
 *   numărul), celelalte, grupuri de două (o singură bucată devine grup); totul, un pas de anulare, exact; documentul de după
 *   trece de ușă; alese rămân cele patru panouri.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Contur, Punct } from '../../src/geom/contur.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { is } from 'valibot';
import type { Document, FormaDoc, Piesa } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { anuleaza, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeInstanta, matriceInstanta } from '../../src/model/lume.ts';
import { inaltimeNumarBuna } from '../../src/model/inaltimeNumar.ts';
import { jocNumar, locNumar } from '../../src/model/numarPanou.ts';
import { taieInPanouri } from '../../src/model/panouri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument, type NumarPanouCalculat } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

const CIFRA = { minX: 0, minY: 0, maxX: 7, maxY: 10 };
const JOC = jocNumar(10);
const poligon = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): Contur =>
  ({ inchis, varfuri: p.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' as const } })) });
const PATRAT = conturDreptunghi(0, 0, 100, 100);
const egal = (a: Punct | null, b: readonly [number, number], mesaj: string): void => {
  assert.ok(a, `${mesaj}: niciun loc`);
  assert.ok(Math.abs(a.x - b[0]) < 1e-9 && Math.abs(a.y - b[1]) < 1e-9, `${mesaj}: (${a.x}, ${a.y}), nu (${b[0]}, ${b[1]})`);
};

test('jocul și înălțimea cifrelor', () => {
  assert.equal(JOC, 2.5);
  assert.equal(jocNumar(4), 2, 'cel puțin 2');
  assert.equal(jocNumar(40), 10);
  for (const h of [3, 10, 100]) assert.ok(inaltimeNumarBuna(h), `${h}`);
  for (const h of [2.9, 100.1, 0, -5, Number.NaN, Infinity]) assert.ok(!inaltimeNumarBuna(h), `${h}`);
});

test('pătratul: primul loc din colțul din stânga-jos; cutia cifrelor mutată față de origine mută și originea', () => {
  egal(locNumar([PATRAT], CIFRA, JOC), [3.125, 3.125], 'pătratul');
  egal(locNumar([PATRAT], { ...CIFRA, minX: -1, maxX: 6 }, JOC), [4.125, 3.125], 'cutia mutată');
});

test('o gaură, un L, o linie deschisă: cifrele le ocolesc, la locurile de pe hârtie', () => {
  egal(locNumar([PATRAT, conturDreptunghi(5, 5, 20, 20)], CIFRA, JOC), [3.125, 28.125], 'gaura');
  const L = poligon(true, [40, 0], [100, 0], [100, 100], [0, 100], [0, 40], [40, 40]);
  egal(locNumar([L], CIFRA, JOC), [3.125, 43.125], 'L-ul');
  egal(locNumar([PATRAT, poligon(false, [0, 10], [100, 10])], CIFRA, JOC), [3.125, 13.125], 'linia deschisă');
});

test('un cerc mic înăuntrul cutiei a două cifre, departe de probele ei: regula „niciun contur întreg înăuntru”', () => {
  const DOUA = { minX: 0, minY: 0, maxX: 14, maxY: 10 };
  egal(locNumar([PATRAT], DOUA, JOC), [3.125, 3.125], 'fără cerc');
  egal(locNumar([PATRAT, conturCerc(6.625, 6.625, 0.2)], DOUA, JOC), [10.125, 3.125], 'cu cercul');
});

test('un panou mare, cu o gaură îngustă lângă colț: grila fină de lângă colț, nu cea rară', () => {
  egal(locNumar([conturDreptunghi(0, 0, 1200, 600), conturDreptunghi(5, 2, 10, 298)], CIFRA, JOC), [20.625, 3.125], 'grila fină');
});

test('fără loc: un panou de 12 × 12; fără contururi închise', () => {
  assert.equal(locNumar([conturDreptunghi(0, 0, 12, 12)], CIFRA, JOC), null);
  assert.equal(locNumar([poligon(false, [0, 0], [100, 0])], CIFRA, JOC), null);
  assert.equal(locNumar([], CIFRA, JOC), null);
});

test('document.taie cu numere: fiecare număr în grupul panoului lui, cu id nou, la locul dat; un pas de anulare', () => {
  const dr = (w: number, h: number): FormaDoc => ({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 });
  const d = docDin({ latime: 3000, inaltime: 2000, grosime: 18 }, { id: 'f', forma: dr(2400, 1000), matrice: { ...ID, e: 0, f: 0 } },
    { id: 'a', forma: dr(100, 200), matrice: { ...ID, e: 100, f: 100 } });
  const r = taieInPanouri(d, { alese: ['f', 'a'], grila: { fel: 'marime', latime: 1200, inaltime: 900, colt: false }, inchide: true, nume: 'Panoul' });
  if (!r.ok) return assert.fail(r.motiv);
  assert.equal(r.perPanou?.length, 4);
  assert.deepEqual(r.perPanou?.map((x) => x.length), [2, 1, 1, 1], 'panoul 1 are placa și litera');
  // Bucățile, pentru locuri: cele noi din degrupare, litera de pe foaie.
  const bucati = new Map<string, { instanta: Document['foi'][number]['instante'][number]; piesa: Piesa }>();
  for (const x of r.degrupate) for (const y of x.parti) bucati.set(y.instanta.id, y);
  const a = d.foi[0]?.instante.find((i) => i.id === 'a');
  assert.ok(a);
  bucati.set('a', { instanta: a, piesa: d.piese.find((q) => q.id === 'a') as Piesa });
  const cifra: Piesa = { id: 'numar', radacina: { tip: 'element', id: 't', forma: dr(7, 10), matrice: { ...ID } }, operatii: [] };
  const numere: NumarPanouCalculat[] = (r.perPanou ?? []).map((ids, k) => {
    const contururi = ids.flatMap((id) => { const b = bucati.get(id); return b ? elementeInstanta(b.piesa.radacina, b.instanta, matriceInstanta(b.instanta)).map(conturElement) : []; });
    const loc = locNumar(contururi, CIFRA, JOC);
    assert.ok(loc, `panoul ${k + 1} are loc`);
    return { nume: `Panoul ${k + 1}`, ids, piesa: cifra, x: loc.x, y: loc.y };
  });
  // Panoul 1 (placa 0..1 200 × 0..500, litera la 100..200 × 100..300): primul rând trece pe sub literă, la (3,125; 3,125).
  assert.deepEqual([numere[0]?.x, numere[0]?.y], [3.125, 3.125]);
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  let h: Istoric = istoricNou(d);
  let sel: readonly string[] = [];
  const ctx: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false };
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx, taiere: () => ({ doc: d, degrupate: r.degrupate, ids: r.ids, grupuri: r.grupuri ?? [], numere }) }), { ok: true });
  const dupa = h.doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  assert.deepEqual({ ...anuleaza(h).doc, rev: d.rev }, d, 'anularea pune documentul exact');
  const f = dupa.foi[0]?.instante ?? [];
  assert.equal(f.length, 4, 'patru grupuri');
  assert.deepEqual(sel, f.map((i) => i.id), 'alese, cele patru panouri');
  const vechi = new Set([...d.piese.map((q) => q.id), ...(d.foi[0]?.instante ?? []).map((i) => i.id)]);
  for (const [k, i] of f.entries()) {
    const p = dupa.piese.find((q) => q.id === i.piesa);
    assert.ok(p && p.radacina.tip === 'grup', `panoul ${k + 1} e un grup`);
    assert.equal(p.nume, `Panoul ${k + 1}`);
    assert.equal(p.radacina.copii.length, k === 0 ? 3 : 2, `panoul ${k + 1}: bucățile și numărul`);
    // Numărul: copilul cu cutia de 7 × 10, la locul dat (în lume).
    const n = numere[k];
    assert.ok(n);
    const e = elementeInstanta(p.radacina, i, matriceInstanta(i)).find((x) => x.forma.tip === 'dreptunghi' && x.forma.latime === 7);
    assert.ok(e, `panoul ${k + 1} are numărul`);
    assert.ok(Math.abs(e.matrice.e - n.x) < 1e-9 && Math.abs(e.matrice.f - n.y) < 1e-9, `panoul ${k + 1}: numărul la (${n.x}, ${n.y}), nu (${e.matrice.e}, ${e.matrice.f})`);
    assert.ok(!vechi.has(i.id), `panoul ${k + 1}: id nou`);
  }
});
