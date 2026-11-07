/**
 * Foile proiectului (ADR 0210 §1, felia 11.1↑): comenzile jurnalului (adaugă, șterge, mută foaia, eticheta ei), mutarea
 * instanțelor între foi și funcțiile pure din spatele lor. Fiecare comandă are inversa exactă: anularea dă documentul de
 * dinainte, câmp cu câmp. Valorile pe hârtie: locurile din liste, piesele care pleacă odată cu foaia.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, type Document, type Foaie, type Piesa } from '../../src/model/document.ts';
import { doarFoaia, indexFoaieActiva, materialFoaie, numeFoaie } from '../../src/model/foi.ts';
import {
  comandaEticheta, comandaFoaieNoua, comandaMutaFoaie, comandaStergeFoaie, comenziMutaPeFoaie, idFoaieNoua, pieseNumaiPe,
} from '../../src/model/foiComenzi.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, reface, type Comanda } from '../../src/model/jurnal.ts';

const piesa = (id: string, latime = 50): Piesa => ({
  id, radacina: { tip: 'element', id, forma: { tip: 'dreptunghi', latime, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [],
});

/** Trei foi: f1 cu a și b, f2 cu c și o a doua instanță a lui a (piesa a stă pe două foi), f3 goală. */
function treiFoi(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  return {
    ...d,
    piese: [piesa('a'), piesa('b'), piesa('c')],
    foi: [
      { id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, material: 'MDF 18', instante: [
        { id: 'a', piesa: 'a', x: 10, y: 10, rotire: 0 }, { id: 'b', piesa: 'b', x: 70, y: 10, rotire: 90 },
      ] },
      { id: 'f2', stoc: { latime: 600, inaltime: 400, grosime: 10 }, instante: [
        { id: 'c', piesa: 'c', x: 5, y: 5, rotire: 0 }, { id: 'a2', piesa: 'a', x: 100, y: 100, rotire: 0 },
      ] },
      { id: 'f3', nume: 'Resturi', stoc: { latime: 100, inaltime: 100, grosime: 18 }, instante: [] },
    ],
  };
}

/** Comanda se aplică, iar anularea ei dă exact documentul de dinainte (și refacerea, cel de după). */
function inversaExacta(doc: Document, c: Comanda): Document {
  const dupa = executa(istoricNou(doc), c);
  const inapoi = anuleaza(dupa);
  assert.deepEqual({ ...inapoi.doc, rev: doc.rev }, doc, 'anularea dă documentul de dinainte');
  assert.deepEqual({ ...reface(inapoi).doc, rev: dupa.doc.rev }, dupa.doc, 'refacerea dă documentul de după');
  return dupa.doc;
}

test('foaia activă: id-ul ei, cu prima foaie când lipsește sau nu mai există', () => {
  const d = treiFoi();
  assert.equal(indexFoaieActiva(d, 'f2'), 1);
  assert.equal(indexFoaieActiva(d, 'f3'), 2);
  assert.equal(indexFoaieActiva(d, null), 0);
  assert.equal(indexFoaieActiva(d, undefined), 0);
  assert.equal(indexFoaieActiva(d, 'f9'), 0);
});

test('documentul văzut dintr-o foaie: aceleași piese, doar foaia ei; cu o singură foaie, documentul însuși', () => {
  const d = treiFoi();
  const v = doarFoaia(d, 'f2');
  assert.equal(v.piese, d.piese);
  assert.deepEqual(v.foi.map((f) => f.id), ['f2']);
  assert.equal(v.foi[0], d.foi[1]);
  assert.equal(v.rev, d.rev);
  const unu = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  assert.equal(doarFoaia(unu, 'f1'), unu);
  assert.equal(doarFoaia(unu, 'f9'), unu);
});

test('id-ul și numele unei foi noi: f<n> liber; numele din id, ca să nu se schimbe la mutare', () => {
  const d = treiFoi();
  assert.equal(idFoaieNoua(d), 'f4');
  assert.equal(idFoaieNoua({ ...d, foi: [d.foi[0] as Foaie, { ...(d.foi[2] as Foaie), id: 'f2' }] }), 'f3');
  const sablon = (n: number): string => `Foaia ${n}`;
  assert.equal(numeFoaie(d.foi[0] as Foaie, 0, sablon), 'Foaia 1');
  assert.equal(numeFoaie(d.foi[2] as Foaie, 2, sablon), 'Resturi');
  assert.equal(numeFoaie({ ...(d.foi[1] as Foaie) }, 0, sablon), 'Foaia 2', 'mutată pe primul loc, f2 rămâne „Foaia 2”');
  assert.equal(numeFoaie({ ...(d.foi[1] as Foaie), id: 'placa-x' }, 4, sablon), 'Foaia 5', 'un id altfel: după loc');
  assert.equal(numeFoaie({ ...(d.foi[1] as Foaie), nume: '   ' }, 1, sablon), 'Foaia 2', 'un nume gol nu e un nume');
  assert.equal(materialFoaie(d.foi[0] as Foaie), 'MDF 18');
  assert.equal(materialFoaie(d.foi[1] as Foaie), null);
});

test('foaia nouă vine după cea activă, goală, cu mărimea și materialul ei; anularea o scoate', () => {
  const d = treiFoi();
  const { comanda, id } = comandaFoaieNoua(d, 'f1');
  assert.equal(id, 'f4');
  const dupa = inversaExacta(d, comanda);
  assert.deepEqual(dupa.foi.map((f) => f.id), ['f1', 'f4', 'f2', 'f3']);
  assert.deepEqual(dupa.foi[1], { id: 'f4', stoc: { latime: 300, inaltime: 200, grosime: 18 }, material: 'MDF 18', instante: [] });
  assert.deepEqual(dupa.piese, d.piese, 'piesele rămân cum erau');
  assert.ok(incarca(JSON.parse(JSON.stringify(dupa))).ok, 'documentul cu foaia nouă se redeschide');
  const dinF2 = comandaFoaieNoua(d, 'f2');
  assert.deepEqual(executa(istoricNou(d), dinF2.comanda).doc.foi[2], { id: 'f4', stoc: { latime: 600, inaltime: 400, grosime: 10 }, instante: [] });
});

test('ștergerea foii ia piesele care stau doar pe ea; piesa pusă și pe altă foaie rămâne', () => {
  const d = treiFoi();
  const c = comandaStergeFoaie(d, 'f2');
  assert.ok(c && c.tip === 'sterge-foaie');
  // c e doar pe f2; a are o instanță și pe f1.
  assert.deepEqual(c.piese.map((x) => [x.piesa.id, x.pozitie]), [['c', 2]]);
  const dupa = inversaExacta(d, c);
  assert.deepEqual(dupa.foi.map((f) => f.id), ['f1', 'f3']);
  assert.deepEqual(dupa.piese.map((p) => p.id), ['a', 'b']);
  const f1 = comandaStergeFoaie(d, 'f1');
  assert.ok(f1 && f1.tip === 'sterge-foaie');
  assert.deepEqual(f1.piese.map((x) => [x.piesa.id, x.pozitie]), [['b', 1]], 'a rămâne: are instanța a2 pe f2');
  const fara = inversaExacta(d, f1);
  assert.deepEqual(fara.piese.map((p) => p.id), ['a', 'c']);
  assert.ok(incarca(JSON.parse(JSON.stringify(fara))).ok);
  assert.equal(comandaStergeFoaie(d, 'f9'), null);
  assert.equal(comandaStergeFoaie(documentNou({ latime: 300, inaltime: 200, grosime: 18 }), 'f1'), null, 'singura foaie nu se șterge');
});

test('ștergerea a două foi la rând se anulează în ordine, cu piesele la locurile lor', () => {
  const d = treiFoi();
  let h = istoricNou(d);
  for (const id of ['f1', 'f2']) {
    const c = comandaStergeFoaie(h.doc, id);
    assert.ok(c);
    h = executa(h, c);
  }
  assert.deepEqual(h.doc.foi.map((f) => f.id), ['f3']);
  assert.deepEqual(h.doc.piese, []);
  h = anuleaza(anuleaza(h));
  assert.deepEqual({ ...h.doc, rev: d.rev }, d);
});

test('mutarea foii în listă: un loc sus sau jos; la capăt, nimic', () => {
  const d = treiFoi();
  const jos = comandaMutaFoaie(d, 'f1', 1);
  assert.ok(jos);
  assert.deepEqual(inversaExacta(d, jos).foi.map((f) => f.id), ['f2', 'f1', 'f3']);
  const sus = comandaMutaFoaie(d, 'f3', -1);
  assert.ok(sus);
  assert.deepEqual(inversaExacta(d, sus).foi.map((f) => f.id), ['f1', 'f3', 'f2']);
  assert.equal(comandaMutaFoaie(d, 'f1', -1), null);
  assert.equal(comandaMutaFoaie(d, 'f3', 1), null);
  assert.equal(comandaMutaFoaie(d, 'f9', 1), null);
});

test('eticheta foii: numele și materialul, cu spațiile scoase; textul gol scoate eticheta', () => {
  const d = treiFoi();
  const nume = comandaEticheta(d, 'f2', 'nume', '  Fag 10 mm, comanda 12 ');
  assert.ok(nume);
  assert.equal(inversaExacta(d, nume).foi[1]?.nume, 'Fag 10 mm, comanda 12');
  const scos = comandaEticheta(d, 'f1', 'material', '   ');
  assert.ok(scos);
  const fara = inversaExacta(d, scos);
  assert.equal(Object.hasOwn(fara.foi[0] as Foaie, 'material'), false, 'câmpul lipsește, nu e gol');
  assert.equal(comandaEticheta(d, 'f1', 'material', 'MDF 18'), null, 'aceeași valoare nu e o comandă');
  assert.equal(comandaEticheta(d, 'f3', 'nume', 'Resturi '), null);
  assert.equal(comandaEticheta(d, 'f9', 'nume', 'x'), null);
});

test('mutarea instanțelor pe altă foaie: își păstrează locul și piesa, vin la capăt, într-un pas', () => {
  const d = treiFoi();
  const comenzi = comenziMutaPeFoaie(d, new Set(['b', 'a']), 'f1', 'f3');
  assert.equal(comenzi.length, 4);
  const dupa = inversaExacta(d, { tip: 'lot', comenzi });
  assert.deepEqual(dupa.foi[0]?.instante, []);
  assert.deepEqual(dupa.foi[2]?.instante, d.foi[0]?.instante, 'aceleași instanțe, în ordinea foii de unde pleacă');
  assert.equal(dupa.piese, d.piese, 'piesele nu se ating');
  const peF2 = inversaExacta(d, { tip: 'lot', comenzi: comenziMutaPeFoaie(d, new Set(['b']), 'f1', 'f2') });
  assert.deepEqual(peF2.foi[1]?.instante.map((i) => i.id), ['c', 'a2', 'b']);
  assert.deepEqual(comenziMutaPeFoaie(d, new Set(['b']), 'f1', 'f1'), []);
  assert.deepEqual(comenziMutaPeFoaie(d, new Set(['c']), 'f1', 'f2'), [], 'c nu e pe f1');
  assert.ok(incarca(JSON.parse(JSON.stringify(peF2))).ok);
});

test('piesele care pleacă odată cu foaia: doar cele cu toate instanțele pe ea', () => {
  const d = treiFoi();
  assert.deepEqual(pieseNumaiPe(d, 'f1').map((x) => x.piesa.id), ['b']);
  assert.deepEqual(pieseNumaiPe(d, 'f2').map((x) => x.piesa.id), ['c']);
  assert.deepEqual(pieseNumaiPe(d, 'f3'), []);
});

test('comenzile foilor refuză un document pe care nu-l pot lăsa întreg', () => {
  const d = treiFoi();
  const h = istoricNou(d);
  const f2 = d.foi[1] as Foaie;
  assert.throws(() => executa(h, { tip: 'adauga-foaie', foaie: { ...f2, instante: [] }, pozitie: 0, piese: [] }), /f2 există deja/);
  assert.throws(() => executa(h, { tip: 'adauga-foaie', foaie: { id: 'f9', stoc: f2.stoc, instante: [{ id: 'c', piesa: 'c', x: 0, y: 0, rotire: 0 }] }, pozitie: 3, piese: [] }), /instanța c există deja/);
  assert.throws(() => executa(h, { tip: 'adauga-foaie', foaie: { id: 'f9', stoc: f2.stoc, instante: [{ id: 'z', piesa: 'z', x: 0, y: 0, rotire: 0 }] }, pozitie: 3, piese: [] }), /piesa lipsă z/);
  assert.throws(() => executa(h, { tip: 'adauga-foaie', foaie: { id: 'f9', stoc: f2.stoc, instante: [] }, pozitie: 9, piese: [] }), /în afara listei foilor/);
  assert.throws(() => executa(h, { tip: 'sterge-foaie', foaie: f2, pozitie: 0, piese: [] }), /nu stă la locul 0/);
  // Piesa a pleacă odată cu f1, dar instanța a2 de pe f2 o folosește încă.
  assert.throws(() => executa(h, { tip: 'sterge-foaie', foaie: d.foi[0] as Foaie, pozitie: 0, piese: [{ piesa: d.piese[0] as Piesa, pozitie: 0 }] }), /a2 ar trimite la piesa ștearsă a/);
  assert.throws(() => executa(h, { tip: 'sterge-foaie', foaie: f2, pozitie: 1, piese: [{ piesa: d.piese[2] as Piesa, pozitie: 1 }] }), /c nu stă la locul 1/);
  const unu = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  assert.throws(() => executa(istoricNou(unu), { tip: 'sterge-foaie', foaie: unu.foi[0] as Foaie, pozitie: 0, piese: [] }), /fără foi/);
  assert.throws(() => executa(h, { tip: 'muta-foaie', foaie: 'f1', de: 1, la: 0 }), /nu stă la locul 1/);
  assert.throws(() => executa(h, { tip: 'muta-foaie', foaie: 'f1', de: 0, la: 3 }), /în afara listei/);
  assert.throws(() => executa(h, { tip: 'eticheta-foaie', foaie: 'f1', camp: 'material', vechi: { valoare: 'altul' }, nou: { valoare: 'MDF' } }), /nu e cel din comandă/);
  assert.throws(() => executa(h, { tip: 'eticheta-foaie', foaie: 'f2', camp: 'material', vechi: { valoare: 'MDF' }, nou: null }), /nu e cel din comandă/);
  assert.throws(() => executa(h, { tip: 'eticheta-foaie', foaie: 'f1', camp: 'material', vechi: null, nou: { valoare: 'MDF' } }), /nu e cel din comandă/);
});

test('un material străin (câmp necunoscut din documentele vechi, cu orice valoare) trece de ușă neatins; eticheta e doar textul', () => {
  const d = treiFoi();
  assert.ok(incarca(JSON.parse(JSON.stringify(d))).ok);
  const cu = (material: unknown): unknown => ({ ...JSON.parse(JSON.stringify(d)), foi: [{ ...JSON.parse(JSON.stringify(d.foi[0])), material }, ...JSON.parse(JSON.stringify(d.foi.slice(1)))] });
  // Un document valid ieri rămâne valid: schema nu judecă materialul, iar ușa îl păstrează exact.
  for (const m of [18, { esenta: 'fag', note: [1, 2] }, null, 'x'.repeat(201), 'x'.repeat(200)]) {
    const r = incarca(cu(m));
    assert.ok(r.ok, JSON.stringify(m));
    assert.deepEqual(r.ok && r.doc.foi[0]?.material, m);
  }
  assert.equal(materialFoaie({ material: { esenta: 'fag' } }), null);
  assert.equal(materialFoaie({ material: 18 }), null);
  assert.equal(materialFoaie({ material: '  ' }), null);
  assert.equal(materialFoaie({}), null);
  // Scris peste unul străin, materialul devine text; anularea pune înapoi exact obiectul de dinainte, la locul lui.
  const strain = { esenta: 'fag', note: [1, 2] };
  const ds: Document = { ...d, foi: [{ ...(d.foi[0] as Foaie), material: strain }, ...d.foi.slice(1)] };
  const c = comandaEticheta(ds, 'f1', 'material', 'MDF alb 18');
  assert.ok(c);
  assert.deepEqual(c, { tip: 'eticheta-foaie', foaie: 'f1', camp: 'material', vechi: { valoare: strain }, nou: { valoare: 'MDF alb 18' } });
  const dupa = inversaExacta(ds, c);
  assert.equal(dupa.foi[0]?.material, 'MDF alb 18');
  assert.deepEqual(Object.keys(dupa.foi[0] as Foaie), Object.keys(ds.foi[0] as Foaie), 'câmpul își păstrează locul');
  const inapoi = anuleaza(executa(istoricNou(ds), c));
  assert.equal(inapoi.doc.foi[0]?.material, strain, 'același obiect');
  // Golul scoate și un material străin; anularea îl întoarce.
  const gol = comandaEticheta(ds, 'f1', 'material', '');
  assert.ok(gol);
  assert.equal(Object.hasOwn(inversaExacta(ds, gol).foi[0] as Foaie, 'material'), false);
});
