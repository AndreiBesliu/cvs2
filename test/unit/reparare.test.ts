/**
 * Reparațiile verificării vectorilor (ADR 0124 §10–§16, felia 10.2↑), pe hârtie: ce se poate repara din fiecare rând;
 * copiile (rămâne prima, o copie cu altă operație rămâne și ea, o instanță întreagă de copii se șterge, o piesă pusă de mai
 * multe ori nu se schimbă); închiderea (lipită sub toleranță, cu linia de închidere peste, refuzată peste prag); nodurile
 * (șirul de segmente scurte devine un nod: la mijloc, la capăt, la început, peste capătul listei, cu mânerul cubicei mutat);
 * buclele („8”-ul despărțit în două triunghiuri de câte 100 mm², nodul de 1,5 mm² scos sub 2 % și despărțit peste 1 %,
 * „8”-ul care trece de două ori prin același nod, cubica care se taie singură în (0, 9/7), totul și printr-o instanță rotită
 * și scalată). După fiecare reparație, documentul trece de ușă, iar verificarea nu mai găsește problema.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Document, FormaDoc, Matrice, Piesa, VarfDoc } from '../../src/model/document.ts';
import { arieCuSemn } from '../../src/geom/contur.ts';
import { conturElement } from '../../src/model/forme.ts';
import { repara, reparabile, verificaPentruPanou, type CerereReparare, type OptiuniReparare, type RezultatReparare } from '../../src/model/reparare.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { verificaVectorii, TOLERANTA_VERIFICARE, type Problema } from '../../src/model/verificare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument, type ReparatieCalculata } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { cuOperatie, docDin, ID, lume } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x: number, y: number, latura = 10) => forma(id, { tip: 'dreptunghi', latime: latura, inaltime: latura, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r = 10) => forma(id, { tip: 'cerc', raza: r }, x, y);

const OPT: OptiuniReparare = { toleranta: TOLERANTA_VERIFICARE, alese: null, pragBucla: 1, pragInchidere: 1 };
const probleme = (d: Document): readonly Problema[] => {
  const r = verificaVectorii(d, OPT);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return r.probleme;
};
const felurile = (d: Document): string[] => probleme(d).map((p) => p.fel);

/** Documentul după reparație: piesele înlocuite, instanțele șterse (și piesele rămase fără ele); trebuie să treacă de ușă. */
function aplica(d: Document, r: RezultatReparare): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const noi = new Map(r.piese.map((p) => [p.id, p]));
  for (const p of r.piese) assert.ok(d.piese.some((x) => x.id === p.id), `piesa ${p.id} există`);
  const sterse = new Set(r.sterse);
  const foi = d.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => !sterse.has(i.id)) }));
  const folosite = new Set(foi.flatMap((f) => f.instante.map((i) => i.piesa)));
  const dupa = { ...d, rev: d.rev + 1, piese: d.piese.map((p) => noi.get(p.id) ?? p).filter((p) => folosite.has(p.id)), foi };
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const fa = (d: Document, c: CerereReparare, o: Partial<OptiuniReparare> = {}): Document => aplica(d, repara(d, c, { ...OPT, ...o }));
const piesa = (d: Document, id: string): Piesa => d.piese.find((p) => p.id === id) ?? assert.fail(`piesa ${id}`);
const varfuri = (f: FormaDoc | undefined): Array<[number, number]> => {
  if (f?.tip !== 'cale') return assert.fail('nu e o cale');
  return f.varfuri.map((v) => [v.p.x, v.p.y]);
};
const formaRadacinii = (d: Document, id: string): FormaDoc => {
  const r = piesa(d, id).radacina;
  return r.tip === 'element' ? r.forma : assert.fail('rădăcina e un grup');
};
const aproape = (a: ReadonlyArray<readonly [number, number]>, b: ReadonlyArray<readonly [number, number]>, eps: number, mesaj: string): void => {
  assert.equal(a.length, b.length, `${mesaj}: numărul vârfurilor (${JSON.stringify(a)})`);
  a.forEach(([x, y], k) => {
    const [u, w] = b[k] as readonly [number, number];
    assert.ok(Math.hypot(x - u, y - w) <= eps, `${mesaj}: vârful ${k}, (${x}, ${y}) ≠ (${u}, ${w})`);
  });
};
const cuInstanta = (d: Document, i: { id: string; piesa: string; x: number; y: number; rotire: number }): Document =>
  ({ ...d, foi: d.foi.map((f, k) => (k === 0 ? { ...f, instante: [...f.instante, i] } : f)) });

test('ce se poate repara din fiecare rând: bucla, nodurile, închiderea; intersecțiile și linia, nimic', () => {
  const d = docDin(stoc,
    forma('d', cale(false, [0, 0], [40, 0], [40, 30], [0, 30], [0, 0.05])),
    forma('l', cale(false, [100, 0], [200, 0])),
    forma('f', cale(true, [0, 0], [20, 20], [20, 0], [0, 20]), 300, 0),
    forma('n', cale(true, [0, 0], [10, 0], [10, 0.005], [10, 10], [0, 10]), 500, 0),
    patrat('p', 700, 0), patrat('q', 705, 5));
  const r = verificaPentruPanou(d, OPT);
  if (!r.ok) return assert.fail('refuzată');
  assert.deepEqual(r.probleme.map((p) => p.fel), ['intersectie', 'intersectie', 'autointersectie', 'noduri', 'deschis', 'deschis']);
  assert.deepEqual(r.reparabile.map((x) => x.cum), ['nimic', 'nimic', 'bucla', 'noduri', 'inchide', 'nimic']);
  assert.equal(r.reparabile.length, r.probleme.length);
});

test('o piesă pusă de două ori (decizia 8a): rândurile ei spun de câte ori, iar reparația se refuză', () => {
  const d = cuInstanta(docDin(stoc, forma('f', cale(true, [0, 0], [20, 20], [20, 0], [0, 20]), 300, 0)), { id: 'f2', piesa: 'f', x: 300, y: 100, rotire: 0 });
  const r = verificaPentruPanou(d, OPT);
  if (!r.ok) return assert.fail('refuzată');
  assert.deepEqual(r.reparabile, [{ cum: 'impartita', ori: 2, ce: 'bucla' }, { cum: 'impartita', ori: 2, ce: 'bucla' }]);
  assert.deepEqual(repara(d, { fel: 'bucla', element: lume('f'), punct: { x: 310, y: 10 } }, OPT), { ok: false, motiv: 'impartita' });
  assert.deepEqual(repara(d, { fel: 'bucle' }, OPT), { ok: false, motiv: 'impartita' });
});

test('copiile: două cercuri identice; a doua instanță pleacă întreagă, iar verificarea nu mai găsește nimic', () => {
  const d = docDin(stoc, cercF('a', 50, 50), cercF('b', 50, 50));
  assert.deepEqual(reparabile(d, probleme(d), OPT.toleranta), [{ cum: 'copii', scoase: 1, operatie: 0, impartita: 0 }]);
  const r = repara(d, { fel: 'copii' }, OPT);
  assert.deepEqual(r, { ok: true, piese: [], sterse: ['b'], reparate: 1, ramase: 0 });
  const dupa = aplica(d, r);
  assert.deepEqual(dupa.piese.map((p) => p.id), ['a']);
  assert.deepEqual(felurile(dupa), []);
});

test('copiile: o copie cu altă operație decât prima rămâne; una fără operații pleacă; prima fără operații ține copia cu operație', () => {
  const d = docDin(stoc, cercF('a', 50, 50), cercF('b', 50, 50));
  const alta = cuOperatie(d, 'b', { adancime: 5 });
  assert.deepEqual(reparabile(alta, probleme(alta), OPT.toleranta), [{ cum: 'copii', scoase: 0, operatie: 1, impartita: 0 }]);
  assert.deepEqual(repara(alta, { fel: 'copii' }, OPT), { ok: false, motiv: 'operatie' });
  const faraOp = { ...d, piese: d.piese.map((p) => (p.id === 'b' ? { ...p, operatii: [] } : p)) };
  assert.deepEqual(repara(faraOp, { fel: 'copii' }, OPT), { ok: true, piese: [], sterse: ['b'], reparate: 1, ramase: 0 });
  const primaFara = { ...d, piese: d.piese.map((p) => (p.id === 'a' ? { ...p, operatii: [] } : p)) };
  assert.deepEqual(repara(primaFara, { fel: 'copii' }, OPT), { ok: false, motiv: 'operatie' });
});

/** O piesă-import: un grup cu două pătrate identice și un cerc, cu o singură operație pe toate trei. */
function piesaImport(id: string): Piesa {
  const p = (nod: string, x: number): { tip: 'element'; id: string; forma: FormaDoc; matrice: Matrice } =>
    ({ tip: 'element', id: nod, forma: { tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 }, matrice: { ...ID, e: x } });
  const d0 = docDin(stoc, patrat(id, 0, 0));
  const op = (d0.piese[0] as Piesa).operatii[0] as Piesa['operatii'][number];
  return {
    id,
    radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [p('s1', 0), p('s2', 0), { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 3 }, matrice: { ...ID, e: 40, f: 5 } }] },
    operatii: [{ ...op, id: 'o1', noduri: ['s1', 's2', 'c'] }],
  };
}

test('copiile din aceeași piesă: copia pleacă din grup și din operație; piesa pusă de două ori nu se schimbă', () => {
  const d0 = docDin(stoc, patrat('x', 500, 500));
  const d: Document = { ...d0, piese: [piesaImport('imp')], foi: [{ ...(d0.foi[0] as Document['foi'][number]), instante: [{ id: 'i1', piesa: 'imp', x: 0, y: 0, rotire: 0 }] }] };
  assert.deepEqual(felurile(d), ['duplicat']);
  const dupa = fa(d, { fel: 'copii' });
  const p = piesa(dupa, 'imp');
  assert.equal(p.radacina.tip, 'grup');
  assert.deepEqual(p.radacina.tip === 'grup' ? p.radacina.copii.map((c) => c.id) : [], ['s1', 'c']);
  assert.deepEqual(p.operatii.map((o) => o.noduri), [['s1', 'c']]);
  assert.deepEqual(felurile(dupa), []);
  // Pusă de două ori: fiecare instanță are copia ei, dar piesa e comună (decizia 8a).
  const doua = cuInstanta(d, { id: 'i2', piesa: 'imp', x: 300, y: 0, rotire: 0 });
  assert.deepEqual(reparabile(doua, probleme(doua), OPT.toleranta), [
    { cum: 'copii', scoase: 0, operatie: 0, impartita: 1 }, { cum: 'copii', scoase: 0, operatie: 0, impartita: 1 },
  ]);
  assert.deepEqual(repara(doua, { fel: 'copii' }, OPT), { ok: false, motiv: 'impartita' });
});

test('copiile: o a doua instanță a aceleiași piese, în același loc, se șterge (piesa rămâne, cu prima instanță)', () => {
  const d = cuInstanta(docDin(stoc, patrat('a', 100, 100)), { id: 'a2', piesa: 'a', x: 100, y: 100, rotire: 0 });
  const r = repara(d, { fel: 'copii' }, OPT);
  assert.deepEqual(r, { ok: true, piese: [], sterse: ['a2'], reparate: 1, ramase: 0 });
  const dupa = aplica(d, r);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), ['a']);
  assert.deepEqual(felurile(dupa), []);
});

test('închiderea: golul de 0,05 mm primește linia de închidere; cel de 0,005 mm se lipește (ultimul vârf pleacă)', () => {
  const d = docDin(stoc, forma('a', cale(false, [0, 0], [40, 0], [40, 30], [0, 30], [0, 0.05])));
  const dupa = fa(d, { fel: 'inchide', element: lume('a') });
  const f = formaRadacinii(dupa, 'a');
  assert.ok(f.tip === 'cale' && f.inchis);
  assert.deepEqual(varfuri(f), [[0, 0], [40, 0], [40, 30], [0, 30], [0, 0.05]]);
  assert.deepEqual(felurile(dupa), []);
  // Operația rămâne cea de dinainte.
  assert.deepEqual(piesa(dupa, 'a').operatii, piesa(d, 'a').operatii);
  const lipit = fa(docDin(stoc, forma('b', cale(false, [0, 0], [40, 0], [40, 30], [0, 30], [0, 0.005]))), { fel: 'inchide', element: lume('b') });
  assert.deepEqual(varfuri(formaRadacinii(lipit, 'b')), [[0, 0], [40, 0], [40, 30], [0, 30]]);
  assert.deepEqual(felurile(lipit), []);
});

test('închiderea: pragul (0,5 mm sub 1 mm se închide, 2 mm nu, decât cu pragul de 5 mm); calea dus-întors nu are arie', () => {
  const gol = (g: number): Document => docDin(stoc, forma('a', cale(false, [0, 0], [40, 0], [40, 30], [0, 30], [0, g])));
  assert.equal(repara(gol(0.5), { fel: 'inchide', element: lume('a') }, OPT).ok, true);
  assert.deepEqual(repara(gol(2), { fel: 'inchide', element: lume('a') }, OPT), { ok: false, motiv: 'prea-departe' });
  assert.equal(repara(gol(2), { fel: 'inchide', element: lume('a') }, { ...OPT, pragInchidere: 5 }).ok, true);
  const dusIntors = docDin(stoc, forma('z', cale(false, [0, 0], [10, 0], [0, 0])));
  assert.deepEqual(repara(dusIntors, { fel: 'inchide', element: lume('z') }, OPT), { ok: false, motiv: 'degenerata' });
  assert.deepEqual(repara(dusIntors, { fel: 'inchide', element: lume('nu-e') }, OPT), { ok: false, motiv: 'disparuta' });
});

test('închiderea lipită: cubica care venea în ultimul vârf vine în primul, cu mânerul mutat la fel (−0,004, −0,003)', () => {
  const f: FormaDoc = {
    tip: 'cale', inchis: false, varfuri: [
      { p: { x: 0, y: 0 }, s: L }, { p: { x: 40, y: 0 }, s: L },
      { p: { x: 40, y: 30 }, s: { tip: 'C', c1: { x: 40, y: 40 }, c2: { x: 0.004, y: 40 } } },
      { p: { x: 0.004, y: 0.003 }, s: L },
    ],
  };
  const dupa = fa(docDin(stoc, forma('a', f)), { fel: 'inchide', element: lume('a') });
  const g = formaRadacinii(dupa, 'a');
  assert.ok(g.tip === 'cale' && g.inchis && g.varfuri.length === 3);
  const s = g.varfuri[2]?.s;
  assert.ok(s?.tip === 'C');
  assert.deepEqual(s.c1, { x: 40, y: 40 });
  assert.ok(Math.abs(s.c2.x) < 1e-15 && Math.abs(s.c2.y - 39.997) < 1e-12, JSON.stringify(s.c2));
});

test('nodurile: segmentul de 0,005 mm din mijloc dispare (rămâne pătratul exact); la capăt rămâne capătul, la început începutul', () => {
  const mijloc = docDin(stoc, forma('a', cale(true, [0, 0], [10, 0], [10, 0.005], [10, 10], [0, 10])));
  const p = probleme(mijloc)[0] as Extract<Problema, { fel: 'noduri' }>;
  assert.deepEqual(p.puncte[0], { x: 10, y: 0 });
  const dupa = fa(mijloc, { fel: 'noduri', element: lume('a'), punct: p.puncte[0] });
  assert.deepEqual(varfuri(formaRadacinii(dupa, 'a')), [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.deepEqual(felurile(dupa), []);
  const capat = docDin(stoc, forma('b', cale(false, [0, 0], [10, 0], [10, 10], [10, 10.004])));
  const c = fa(capat, { fel: 'noduri', element: lume('b'), punct: { x: 10, y: 10 } });
  assert.deepEqual(varfuri(formaRadacinii(c, 'b')), [[0, 0], [10, 0], [10, 10.004]]);
  const inceput = docDin(stoc, forma('c', cale(false, [0, 0], [0.004, 0], [10, 0], [10, 10])));
  const i = fa(inceput, { fel: 'noduri', element: lume('c'), punct: { x: 0, y: 0 } });
  assert.deepEqual(varfuri(formaRadacinii(i, 'c')), [[0, 0], [10, 0], [10, 10]]);
});

test('nodurile: cubica de după șir își mută mânerul cu nodul; șirul peste capătul listei; „toate” pe două forme; praful nu', () => {
  const f: FormaDoc = {
    tip: 'cale', inchis: true, varfuri: [
      { p: { x: 0, y: 0 }, s: L }, { p: { x: 10, y: 0 }, s: L },
      { p: { x: 10, y: 0.006 }, s: { tip: 'C', c1: { x: 10, y: 5 }, c2: { x: 5, y: 10 } } }, { p: { x: 0, y: 10 }, s: L },
    ],
  };
  const g = formaRadacinii(fa(docDin(stoc, forma('a', f)), { fel: 'noduri', element: lume('a'), punct: { x: 10, y: 0 } }), 'a');
  assert.ok(g.tip === 'cale' && g.varfuri.length === 3);
  const s = g.varfuri[1]?.s;
  assert.ok(s?.tip === 'C');
  assert.ok(Math.abs(s.c1.x - 10) < 1e-15 && Math.abs(s.c1.y - 4.994) < 1e-12, JSON.stringify(s.c1));
  assert.deepEqual(s.c2, { x: 5, y: 10 });
  // Segmentul de închidere, scurt: rămâne vârful dinaintea lui, iar primul pleacă.
  const peste = docDin(stoc, forma('b', cale(true, [0, 0], [10, 0], [10, 10], [0, 10], [0, 0.005])));
  const pb = probleme(peste)[0] as Extract<Problema, { fel: 'noduri' }>;
  const b = fa(peste, { fel: 'noduri', element: lume('b'), punct: pb.puncte[0] });
  assert.deepEqual(varfuri(formaRadacinii(b, 'b')), [[10, 0], [10, 10], [0, 10], [0, 0.005]]);
  const doua = docDin(stoc, forma('a', cale(true, [0, 0], [10, 0], [10, 0.005], [10, 10], [0, 10])), forma('b', cale(true, [0, 0], [10, 0], [10, 10], [0, 10], [0, 0.005]), 100, 0));
  const r = repara(doua, { fel: 'toate-nodurile' }, OPT);
  assert.ok(r.ok && r.reparate === 2 && r.ramase === 0, JSON.stringify(r));
  assert.deepEqual(felurile(aplica(doua, r)), []);
  const praf = docDin(stoc, forma('p', cale(true, [0, 0], [0.004, 0], [0.004, 0.004])));
  assert.deepEqual(reparabile(praf, probleme(praf), OPT.toleranta).map((x) => x.cum), ['nimic']);
  assert.deepEqual(repara(praf, { fel: 'noduri', element: lume('p'), punct: { x: 0, y: 0 } }, OPT), { ok: false, motiv: 'degenerata' });
});

test('„8”-ul (fundița) se desparte: triunghiurile (0,0)(10,10)(0,20) și (10,10)(20,20)(20,0), în aceeași piesă și operație', () => {
  const d = docDin(stoc, forma('a', cale(true, [0, 0], [20, 20], [20, 0], [0, 20])));
  const dupa = fa(d, { fel: 'bucla', element: lume('a'), punct: { x: 10, y: 10 } });
  const p = piesa(dupa, 'a');
  assert.ok(p.radacina.tip === 'grup');
  const [e, nou] = p.radacina.copii;
  assert.ok(e?.tip === 'element' && nou?.tip === 'element');
  assert.equal(e.id, 'a');
  assert.equal(nou.id, 'a-1');
  aproape(varfuri(e.forma), [[0, 0], [10, 10], [0, 20]], 1e-12, 'elementul');
  aproape(varfuri(nou.forma), [[10, 10], [20, 20], [20, 0]], 1e-12, 'bucla despărțită');
  for (const x of [e, nou]) assert.ok(Math.abs(Math.abs(arieCuSemn(conturElement(x))) - 100) < 1e-9, 'aria 100');
  assert.deepEqual(p.operatii.map((o) => o.noduri), [['a', 'a-1']]);
  // Cele două triunghiuri se ating în (10, 10): rămâne o intersecție, nu o autointersecție.
  assert.deepEqual(felurile(dupa), ['intersectie']);
});

test('nodul de 1,5 mm² din 101,5: sub pragul de 2 % se scoate (rămâne triunghiul de 100 mm²), peste 1 % se desparte', () => {
  const s = Math.sqrt(1.5);
  const d = docDin(stoc, forma('a', cale(true, [-10, -10], [s, s], [s, -s], [-10, 10]), 300, 300));
  const X = { x: 300, y: 300 };
  const scos = fa(d, { fel: 'bucla', element: lume('a'), punct: X }, { pragBucla: 2 });
  aproape(varfuri(formaRadacinii(scos, 'a')), [[-10, -10], [0, 0], [-10, 10]], 1e-12, 'triunghiul rămas');
  assert.deepEqual(felurile(scos), []);
  const despartit = fa(d, { fel: 'bucla', element: lume('a'), punct: X }, { pragBucla: 1 });
  const r = piesa(despartit, 'a').radacina;
  assert.ok(r.tip === 'grup' && r.copii.length === 2);
  aproape(varfuri(r.copii[0]?.tip === 'element' ? r.copii[0].forma : undefined), [[-10, -10], [0, 0], [-10, 10]], 1e-12, 'partea mare');
  aproape(varfuri(r.copii[1]?.tip === 'element' ? r.copii[1].forma : undefined), [[0, 0], [s, s], [s, -s]], 1e-12, 'bucla');
});

test('„8”-ul care trece de două ori prin același nod: se desparte în vârfurile lui, fără noduri noi', () => {
  const d = docDin(stoc, forma('a', cale(true, [0, 0], [10, 10], [20, 20], [20, 0], [10, 10], [0, 20])));
  const p = piesa(fa(d, { fel: 'bucla', element: lume('a'), punct: { x: 10, y: 10 } }), 'a');
  assert.ok(p.radacina.tip === 'grup');
  const [e, nou] = p.radacina.copii;
  assert.deepEqual(varfuri(e?.tip === 'element' ? e.forma : undefined), [[0, 0], [10, 10], [0, 20]]);
  assert.deepEqual(varfuri(nou?.tip === 'element' ? nou.forma : undefined), [[10, 10], [20, 20], [20, 0]]);
});

test('cubica închisă care se taie singură: tăiată în punctul ei dublu (0, 9/7), parametrii (1 ∓ √(3/7)) / 2', () => {
  const f: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: { x: -1, y: 0 }, s: { tip: 'C', c1: { x: 2, y: 3 }, c2: { x: -2, y: 3 } } }, { p: { x: 1, y: 0 }, s: L }] };
  const d = docDin(stoc, forma('a', f, 500, 500));
  const p = probleme(d).find((x) => x.fel === 'autointersectie');
  assert.ok(p);
  const dupa = fa(d, { fel: 'bucla', element: lume('a'), punct: p.puncte[0] });
  const r = piesa(dupa, 'a').radacina;
  assert.ok(r.tip === 'grup' && r.copii.length === 2);
  const [mare, bucla] = r.copii.map((c) => (c.tip === 'element' && c.forma.tip === 'cale' ? c.forma : assert.fail('nu e o cale')));
  const X = { x: 0, y: 9 / 7 };
  // Partea mare: cubica pe [0, s], cea pe [t, 1] și linia; bucla: cubica pe [s, t], tăiată la jumătate (două vârfuri).
  assert.equal(mare?.varfuri.length, 3);
  assert.equal(bucla?.varfuri.length, 2);
  assert.ok(Math.hypot((mare?.varfuri[1]?.p.x ?? 9) - X.x, (mare?.varfuri[1]?.p.y ?? 9) - X.y) < 1e-12, 'nodul de încrucișare al părții mari');
  assert.ok(Math.hypot((bucla?.varfuri[0]?.p.x ?? 9) - X.x, (bucla?.varfuri[0]?.p.y ?? 9) - X.y) < 1e-12, 'nodul de încrucișare al buclei');
  // Oracolul ariilor: poligonul a 4000 de puncte de pe cubică, pe intervalele parametrilor.
  const B = (t: number): [number, number] => {
    const u = 1 - t;
    return [-(u ** 3) + 6 * u * u * t - 6 * u * t * t + t ** 3, 9 * u * u * t + 9 * u * t * t];
  };
  const s = (1 - Math.sqrt(3 / 7)) / 2, t = (1 + Math.sqrt(3 / 7)) / 2;
  const arie = (pts: Array<[number, number]>): number => Math.abs(pts.reduce((a, [x, y], k) => { const [u, w] = pts[(k + 1) % pts.length] as [number, number]; return a + x * w - u * y; }, 0)) / 2;
  const pe = (a: number, b: number): Array<[number, number]> => Array.from({ length: 4001 }, (_, k) => B(a + ((b - a) * k) / 4000));
  const aBucla = arie(pe(s, t)), aMare = arie([...pe(0, s), ...pe(t, 1)]);
  for (const [x, asteptat, nume] of [[bucla, aBucla, 'bucla'], [mare, aMare, 'partea mare']] as const) {
    const a = Math.abs(arieCuSemn(conturElement({ forma: x as FormaDoc, matrice: ID })));
    assert.ok(Math.abs(a - asteptat) < 1e-5, `${nume}: ${a} ≠ ${asteptat}`);
  }
  assert.ok(!felurile(dupa).includes('autointersectie'));
});

test('printr-o instanță rotită cu 90° și un element scalat de 2 ori și oglindit: parametrii sunt aceiași, despărțirea exactă', () => {
  const d0 = docDin(stoc, forma('a', cale(true, [0, 0], [20, 20], [20, 0], [0, 20])));
  const d: Document = {
    ...d0,
    piese: d0.piese.map((p) => ({ ...p, radacina: p.radacina.tip === 'element' ? { ...p.radacina, matrice: { a: -2, b: 0, c: 0, d: 2, e: 5, f: 7 } } : p.radacina })),
    foi: d0.foi.map((f) => ({ ...f, instante: f.instante.map((i) => ({ ...i, x: 400, y: 300, rotire: 90 })) })),
  };
  const p = probleme(d)[0];
  assert.equal(p?.fel, 'autointersectie');
  const dupa = fa(d, { fel: 'bucla', element: lume('a'), punct: p?.puncte[0] ?? { x: 0, y: 0 } });
  const r = piesa(dupa, 'a').radacina;
  assert.ok(r.tip === 'grup');
  aproape(varfuri(r.copii[0]?.tip === 'element' ? r.copii[0].forma : undefined), [[0, 0], [10, 10], [0, 20]], 1e-12, 'coordonatele elementului');
  assert.deepEqual(felurile(dupa), ['intersectie']);
});

test('„Repară toate buclele”: fundița se desparte, nodul de 1,5 mm² se scoate (pragul 2 %); bucla căii deschise rămâne', () => {
  const s = Math.sqrt(1.5);
  const deschisa: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: -1, y: 0 }, s: { tip: 'C', c1: { x: 2, y: 3 }, c2: { x: -2, y: 3 } } }, { p: { x: 1, y: 0 }, s: L }] };
  const d = docDin(stoc, forma('a', cale(true, [0, 0], [20, 20], [20, 0], [0, 20])), forma('b', cale(true, [-10, -10], [s, s], [s, -s], [-10, 10]), 300, 300), forma('c', deschisa, 600, 600));
  const rep = reparabile(d, probleme(d), OPT.toleranta);
  assert.deepEqual(probleme(d).map((p, k) => `${p.fel}:${rep[k]?.cum}`), ['autointersectie:bucla', 'autointersectie:bucla', 'autointersectie:nimic', 'deschis:inchide']);
  const r = repara(d, { fel: 'bucle' }, { ...OPT, pragBucla: 2 });
  assert.ok(r.ok && r.reparate === 2 && r.ramase === 0, JSON.stringify(r));
  const dupa = aplica(d, r);
  assert.equal(piesa(dupa, 'a').radacina.tip, 'grup');
  assert.equal(piesa(dupa, 'b').radacina.tip, 'element');
  assert.deepEqual(felurile(dupa), ['intersectie', 'autointersectie', 'deschis']);
});

test('bucla care nu mai e acolo (desenul s-a schimbat): refuzată cu motivul ei, nimic schimbat', () => {
  const d = docDin(stoc, forma('a', cale(true, [0, 0], [20, 20], [20, 0], [0, 20])));
  assert.deepEqual(repara(d, { fel: 'bucla', element: lume('a'), punct: { x: 15, y: 15 } }, OPT), { ok: false, motiv: 'disparuta' });
  assert.deepEqual(repara(d, { fel: 'bucla', element: lume('a'), punct: { x: 10, y: 10 } }, { ...OPT, toleranta: 0 }), { ok: false, motiv: 'toleranta' });
  assert.deepEqual(repara(docDin(stoc, patrat('p', 0, 0)), { fel: 'bucle' }, OPT), { ok: false, motiv: 'nimic' });
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

/** Un context cu istoricul pornit din `d` și selecția dată; `reparatie` vine la rulare. */
function context(d: Document, selectie: readonly string[], doarCitire = false): ContextDocument & { readonly h: () => Istoric; readonly s: () => readonly string[] } {
  let h = istoricNou(d);
  let s: readonly string[] = selectie;
  return { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => s, selecteaza: (ids) => { s = ids; }, doarCitire: () => doarCitire, h: () => h, s: () => s };
}
const calculata = (d: Document, c: CerereReparare, o: Partial<OptiuniReparare> = {}): ReparatieCalculata => {
  const r = repara(d, c, { ...OPT, ...o });
  if (!r.ok) return assert.fail(`refuzată: ${r.motiv}`);
  return { doc: d, piese: r.piese, sterse: r.sterse };
};

test('document.repara: copiile și închiderea, fiecare un singur pas de anulare; selecția pierde instanța ștearsă', () => {
  const d = docDin(stoc, cercF('a', 50, 50), cercF('b', 50, 50), forma('c', cale(false, [0, 0], [40, 0], [40, 30], [0, 30], [0, 0.05]), 200, 200));
  const ctx = context(d, ['a', 'b']);
  const copii = calculata(d, { fel: 'copii' });
  assert.deepEqual(ruleaza(R, 'document.repara', { ...ctx, reparatie: () => copii }), { ok: true });
  assert.deepEqual(ctx.h().doc.foi[0]?.instante.map((i) => i.id), ['a', 'c']);
  assert.deepEqual(ctx.h().doc.piese.map((p) => p.id), ['a', 'c']);
  assert.deepEqual(ctx.s(), ['a']);
  assert.equal(ctx.h().trecut.length, 1);
  const dupaCopii = ctx.h().doc;
  const inchide = calculata(dupaCopii, { fel: 'inchide', element: lume('c') });
  assert.deepEqual(ruleaza(R, 'document.repara', { ...ctx, reparatie: () => inchide }), { ok: true });
  assert.equal(ctx.h().trecut.length, 2);
  assert.deepEqual(felurile(ctx.h().doc), []);
  ruleaza(R, 'istoric.anuleaza', ctx);
  const fc = formaRadacinii(ctx.h().doc, 'c');
  assert.ok(fc.tip === 'cale' && !fc.inchis, 'anularea redeschide calea');
  ruleaza(R, 'istoric.anuleaza', ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.h().doc.piese)), JSON.parse(JSON.stringify(d.piese)), 'două anulări: documentul de la început');
  assert.deepEqual(ctx.h().doc.foi[0]?.instante.map((i) => i.id), ['a', 'b', 'c']);
});

test('document.repara: refuzată cu motiv pe un document schimbat între timp, la doar-citire și fără reparație', () => {
  const d = docDin(stoc, cercF('a', 50, 50), cercF('b', 50, 50));
  const copii = calculata(d, { fel: 'copii' });
  const ctx = context({ ...d, rev: d.rev + 1 }, []);
  assert.deepEqual(stare(R, 'document.repara', { ...ctx, reparatie: () => copii }), { ok: false, motiv: 'editare.verificare.motiv.veche' });
  assert.deepEqual(ruleaza(R, 'document.repara', { ...ctx, reparatie: () => copii }), { ok: false, motiv: 'editare.verificare.motiv.veche' });
  assert.equal(ctx.h().trecut.length, 0, 'nimic schimbat');
  assert.deepEqual(stare(R, 'document.repara', { ...context(d, [], true), reparatie: () => copii }), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(R, 'document.repara', context(d, [])), { ok: false, motiv: 'motiv.nimic-ales' });
  assert.deepEqual(stare(R, 'document.repara', { ...context(d, []), reparatie: () => ({ doc: d, piese: [], sterse: [] }) }), { ok: false, motiv: 'motiv.nimic-ales' });
});

test('document.repara: o reparație care ar strica ușa documentului (un arc cu capetele în același punct) se refuză', () => {
  const d = docDin(stoc, forma('a', cale(true, [0, 0], [20, 20], [20, 0], [0, 20])));
  const p = d.piese[0] as Piesa;
  const stricata: Piesa = { ...p, radacina: { tip: 'element', id: 'a', matrice: { ...ID }, forma: { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 0, y: 0 }, s: L }] } } };
  assert.deepEqual(stare(R, 'document.repara', { ...context(d, []), reparatie: () => ({ doc: d, piese: [stricata], sterse: [] }) }), { ok: false, motiv: 'editare.verificare.motiv.schema' });
});
