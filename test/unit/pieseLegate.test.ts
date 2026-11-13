/**
 * Piesele puse de mai multe ori (ADR 0210 §2, felia 11.2↑): unde ajung copiile lui «Încă…» și «+1» (rândurile după cea
 * aleasă, vărsarea pe foaia următoare goală, apoi pe foi noi), «Desprinde» și „Duplică foaia cu aceleași piese”, fiecare
 * cu inversa exactă. Valorile pe hârtie: proba din prag (80 × 30 pe 300 × 200, marginea 10, distanța 5: 15 pe foaie, 25 =
 * 15 + 10, colțurile la x = 10 / 95 / 180 și y = 160 / 125 / 90 / 55 / 20).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, operatieImplicita, type Document, type Foaie, type Instanta, type Operatie, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { anuleaza, executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import {
  comandaDuplicareLegata, comenziCopii, comenziDesprinde, cutieInstanta, DISTANTA_COPII, distantaCopii, folosiri, gasesteInstanta,
  instantePiesei, MARGINE_COPII, planCopii,
} from '../../src/model/pieseLegate.ts';

/** Profilul implicit al dreptunghiului (o operație validă, cu freza ei), cu diametrul și latura cerute. */
const profil = (diametru: number, latura: Operatie['latura'] = 'exterior'): Operatie => {
  const o = operatieImplicita('p', { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 });
  return { ...o, latura, scula: { ...o.scula, diametru } };
};

/** Plăcuța de 80 × 30, cu colțul stânga-jos al dreptunghiului în originea piesei. */
const placuta = (operatii: Operatie[] = []): Piesa => ({
  id: 'p', radacina: { tip: 'element', id: 'p', forma: { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii,
});

const foaie = (id: string, instante: Instanta[] = [], latime = 300, inaltime = 200): Foaie => ({ id, stoc: { latime, inaltime, grosime: 18 }, instante });

function proiect(foi: Foaie[], piese: Piesa[] = [placuta()]): Document {
  return { ...documentNou({ latime: 300, inaltime: 200, grosime: 18 }), piese, foi };
}

/** Comenzile se aplică într-un pas; documentul trece de ușă; anularea dă exact documentul de dinainte. */
function aplica(doc: Document, comenzi: Comanda[]): Document {
  const h = executa(istoricNou(doc), comenzi.length === 1 && comenzi[0] ? comenzi[0] : { tip: 'lot', comenzi });
  assert.ok(incarca(JSON.parse(JSON.stringify(h.doc))).ok, 'documentul de după trece de ușă');
  assert.equal(jsonCanonic({ ...anuleaza(h).doc, rev: doc.rev }), jsonCanonic(doc), 'anularea dă documentul de dinainte');
  return h.doc;
}

test('pe hârtie: 24 de copii după plăcuța din colțul stânga-sus: 14 pe foaia ei (15 cu ea), 10 pe o foaie nouă', () => {
  assert.equal(MARGINE_COPII, 10);
  assert.equal(DISTANTA_COPII, 5);
  const d = proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 10, y: 160, rotire: 0 }])]);
  const plan = planCopii(d, 'a', 24);
  assert.ok(plan.ok);
  const pe = (f: string | number) => plan.locuri.filter((l) => l.foaie === f).map((l) => [l.x, l.y]);
  // Rândul ei, la dreapta: 95, 180 (265 + 80 trece de 290); apoi rândurile de dedesubt, din stânga.
  assert.deepEqual(pe('f1'), [[95, 160], [180, 160], ...[125, 90, 55, 20].flatMap((y) => [[10, y], [95, y], [180, y]])]);
  assert.equal(plan.foiNoi, 1);
  assert.deepEqual(pe(0), [...[160, 125, 90].flatMap((y) => [[10, y], [95, y], [180, y]]), [10, 55]]);
  assert.equal(plan.dupa, 'f1');
  // Comenzile: foaia nouă după f1, ca ea; instanțele legate de aceeași piesă, cu id-uri noi.
  const { comenzi, ids } = comenziCopii(d, 'a', plan);
  assert.equal(ids.length, 24);
  const dupa = aplica(d, comenzi);
  assert.deepEqual(dupa.foi.map((f) => [f.id, f.instante.length, f.stoc.latime, f.stoc.inaltime]), [['f1', 15, 300, 200], ['f2', 10, 300, 200]]);
  assert.equal(folosiri(dupa).get('p'), 25);
  assert.ok(dupa.foi.every((f) => f.instante.every((i) => i.piesa === 'p' && i.rotire === 0)));
  assert.equal(dupa.piese.length, 1, 'nicio piesă nouă: toate sunt legate');
});

test('copiile ocolesc ce e pe foaie (la distanță), merg pe foaia următoare doar dacă e goală, apoi pe foi noi după ea', () => {
  const alta: Piesa = { ...placuta(), id: 'q', radacina: { ...placuta().radacina, id: 'q' } };
  // O piesă în calea rândului: x 95..175 pe y 160 e ocupat.
  const d = proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 10, y: 160, rotire: 0 }, { id: 'b', piesa: 'q', x: 95, y: 160, rotire: 0 }]), foaie('f2'), foaie('f3', [{ id: 'c', piesa: 'q', x: 10, y: 10, rotire: 0 }])], [placuta(), alta]);
  const plan = planCopii(d, 'a', 30);
  assert.ok(plan.ok);
  assert.deepEqual(plan.locuri.slice(0, 2).map((l) => [l.foaie, l.x, l.y]), [['f1', 180, 160], ['f1', 10, 125]]);
  // f1: 1 + 12 = 13; f2 e goală: 15; f3 nu e goală, deci o foaie nouă, după f2: 2.
  assert.equal(plan.locuri.filter((l) => l.foaie === 'f1').length, 13);
  assert.equal(plan.locuri.filter((l) => l.foaie === 'f2').length, 15);
  assert.equal(plan.locuri.filter((l) => l.foaie === 0).length, 2);
  assert.equal(plan.dupa, 'f2');
  const dupa = aplica(d, comenziCopii(d, 'a', plan).comenzi);
  assert.deepEqual(dupa.foi.map((f) => f.id), ['f1', 'f2', 'f4', 'f3']);
});

test('distanța crește la cea mai mare freză a profilelor exterioare; rotirea întoarce cutia; prea mare = refuz', () => {
  assert.equal(distantaCopii(placuta([profil(8)])), 8);
  assert.equal(distantaCopii(placuta([profil(8, 'interior')])), 5);
  assert.equal(distantaCopii(placuta([profil(3)])), 5);
  const d8 = proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 10, y: 160, rotire: 0 }])], [placuta([profil(8)])]);
  const p8 = planCopii(d8, 'a', 2);
  assert.ok(p8.ok);
  assert.deepEqual(p8.locuri.map((l) => [l.x, l.y]), [[98, 160], [186, 160]]);
  // Rotită cu 90°, cutia e 30 × 80; colțul ei stânga-jos e în (x − 30, y).
  const r = proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 40, y: 110, rotire: 90 }])]);
  const c = cutieInstanta(placuta(), { id: 'a', piesa: 'p', x: 40, y: 110, rotire: 90 });
  assert.ok(c && Math.abs(c.minX - 10) < 1e-9 && Math.abs(c.maxX - 40) < 1e-9 && Math.abs(c.minY - 110) < 1e-9 && Math.abs(c.maxY - 190) < 1e-9);
  const pr = planCopii(r, 'a', 1);
  assert.ok(pr.ok);
  assert.ok(Math.abs((pr.locuri[0]?.x ?? 0) - 75) < 1e-9 && Math.abs((pr.locuri[0]?.y ?? 0) - 110) < 1e-9, JSON.stringify(pr.locuri));
  // 290 × 30 nu încape între margini pe 300: refuz.
  const mare: Piesa = { ...placuta(), radacina: { ...placuta().radacina, forma: { tip: 'dreptunghi', latime: 290, inaltime: 30, razaColt: 0 } } } as Piesa;
  assert.deepEqual(planCopii(proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 5, y: 5, rotire: 0 }])], [mare]), 'a', 1), { ok: false, motiv: 'prea-mare' });
  assert.deepEqual(planCopii(proiect([foaie('f1')]), 'x', 1), { ok: false, motiv: 'nimic' });
});

test('instanțele unei piese în ordinea proiectului; locul unei instanțe', () => {
  const d = proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 0, y: 0, rotire: 0 }]), foaie('f2', [{ id: 'b', piesa: 'p', x: 0, y: 0, rotire: 0 }, { id: 'c', piesa: 'p', x: 0, y: 0, rotire: 0 }])]);
  assert.deepEqual(instantePiesei(d, 'p').map((l) => [l.foaie, l.instanta.id]), [[0, 'a'], [1, 'b'], [1, 'c']]);
  assert.deepEqual(gasesteInstanta(d, 'c')?.foaie, 1);
  assert.equal(gasesteInstanta(d, 'z'), null);
});

test('«Desprinde»: instanța primește o piesă a ei, în același loc; ultima rămâne cu piesa; un pas, inversa exactă', () => {
  const d = proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 10, y: 10, rotire: 0 }, { id: 'b', piesa: 'p', x: 100, y: 10, rotire: 30 }])], [placuta([profil(6)])]);
  const c = comenziDesprinde(d, new Set(['b']), 'f1');
  const dupa = aplica(d, c);
  const b = dupa.foi[0]?.instante[1];
  assert.ok(b);
  assert.deepEqual([b.id, b.x, b.y, b.rotire], ['b', 100, 10, 30]);
  assert.notEqual(b.piesa, 'p');
  const noua = dupa.piese.find((p) => p.id === b.piesa);
  assert.ok(noua);
  assert.deepEqual(noua.operatii, d.piese[0]?.operatii);
  assert.notEqual(noua.radacina, d.piese[0]?.radacina);
  // Amândouă alese: ultima rămasă păstrează piesa (nu rămâne o piesă fără instanțe).
  const ambele = aplica(d, comenziDesprinde(d, new Set(['a', 'b']), 'f1'));
  assert.notEqual(ambele.foi[0]?.instante[0]?.piesa, 'p');
  assert.equal(ambele.foi[0]?.instante[1]?.piesa, 'p');
  assert.equal(ambele.piese.length, 2);
  assert.deepEqual(comenziDesprinde(proiect([foaie('f1', [{ id: 'a', piesa: 'p', x: 0, y: 0, rotire: 0 }])]), new Set(['a']), 'f1'), []);
});

test('„Duplică foaia cu aceleași piese”: instanțe noi ale acelorași piese, la aceleași locuri; numele nu vine', () => {
  const d = proiect([{ ...foaie('f1', [{ id: 'a', piesa: 'p', x: 10, y: 10, rotire: 15 }]), nume: 'Sus', material: 'MDF' }]);
  const r = comandaDuplicareLegata(d, 'f1');
  assert.ok(r);
  const dupa = aplica(d, [r.comanda]);
  const copia = dupa.foi[1];
  assert.ok(copia);
  assert.equal(copia.id, r.id);
  assert.equal(copia.nume, undefined);
  assert.equal(copia.material, 'MDF');
  assert.deepEqual(copia.instante.map((i) => [i.piesa, i.x, i.y, i.rotire]), [['p', 10, 10, 15]]);
  assert.notEqual(copia.instante[0]?.id, 'a');
  assert.equal(dupa.piese.length, 1);
  assert.equal(comandaDuplicareLegata(d, 'f9'), null);
});
