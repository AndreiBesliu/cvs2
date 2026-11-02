import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programDinDocument } from '../../src/cam/job.ts';
import { compune } from '../../src/geom/matrice.ts';
import { piesaDinImport } from '../../src/io/piesa.ts';
import { blocText } from '../../src/model/blocText.ts';
import { documentNou, operatieImplicita, PLAFON, type Document, type FormaDoc, type Instanta, type Matrice, type Nod, type Operatie, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { anuleaza, executa, istoricNou, reface, type Comanda } from '../../src/model/jurnal.ts';
import { elementeFoaie, matriceInstanta, taieturiFoaie } from '../../src/model/lume.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { aseazaText } from '../../src/text/asezare.ts';
import { citesteFont } from '../../src/text/font.ts';
import { piesaText } from '../../src/text/piesaText.ts';
import { comandaDegrupare, comandaGrupare } from '../../src/ui/actiuniDocumentCalcul.ts';

/**
 * Gruparea (ADR 0130), inversul degrupării: formele alese devin o piesă, cu un grup nou pe rădăcină, într-un singur pas al
 * istoricului; lumea rămâne la bit, G-code-ul (fără comentarii) același, iar anularea pune totul exact unde era.
 */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const ID: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
type Pusa = { readonly piesa: Piesa; readonly instanta: Instanta };

/** O formă desenată (ADR 0051): elementul cu id-ul piesei, operația implicită, instanța în (x, y), rotită. */
function forma(id: string, f: FormaDoc, x: number, y: number, rotire = 0): Pusa {
  return { piesa: { id, radacina: { tip: 'element', id, forma: f, matrice: ID }, operatii: [operatieImplicita(id, f)] }, instanta: { id, piesa: id, x, y, rotire } };
}
const dreptunghi = (latime: number, inaltime: number): FormaDoc => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
const cerc = (raza: number): FormaDoc => ({ tip: 'cerc', raza });

/** O formă cu gaură, ca după boolean (ADR 0067): grupul `g`, dreptunghiul `c1` pe exterior, gaura `c2` (R5, în mijloc) pe interior. */
function cuGaura(id: string, x: number, y: number): Pusa {
  const baza = operatieImplicita('c1', dreptunghi(40, 30));
  return {
    piesa: {
      id,
      radacina: {
        tip: 'grup', id: 'g', matrice: ID, copii: [
          { tip: 'element', id: 'c1', forma: dreptunghi(40, 30), matrice: ID },
          { tip: 'element', id: 'c2', forma: cerc(5), matrice: { ...ID, e: 20, f: 15 } },
        ],
      },
      operatii: [{ ...baza, id: 'exterior', noduri: ['c1'], latura: 'exterior' }, { ...baza, id: 'interior', noduri: ['c2'], latura: 'interior' }],
    },
    instanta: { id, piesa: id, x, y, rotire: 0 },
  };
}

function doc(...x: readonly Pusa[]): Document {
  const d = documentNou(STOC);
  return { ...d, piese: x.map((p) => p.piesa), foi: [{ ...d.foi[0]!, instante: x.map((p) => p.instanta) }] };
}

/** G-code-ul GRBL al foii, fără comentarii (ele poartă id-urile, care se schimbă): ce se taie. */
function taiat(d: Document): string {
  const j = programDinDocument(d);
  if (!j.ok) throw new Error(j.motiv);
  const r = posteaza(j.program, { foaie: STOC, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
  if (!r.ok) throw new Error('postul a refuzat programul');
  return r.text.split('\n').filter((l) => !l.startsWith('(')).join('\n');
}
const miscariDeTaiere = (g: string): number => g.split('\n').filter((l) => /^G[123] /.test(l)).length;
/** Fiecare element în lume, ca (formă, matrice), în ordinea foii. */
const lume = (d: Document) => elementeFoaie(d).map((e) => ({ forma: e.forma, matrice: e.matrice }));

function grupeaza(d: Document, alese: readonly string[]) {
  const r = comandaGrupare(d, alese);
  if (!r.ok) throw new Error(r.motiv);
  const h = executa(istoricNou(d), r.comanda);
  return { r, h, dupa: h.doc };
}
const grupul = (n: Nod): Extract<Nod, { tip: 'grup' }> => {
  if (n.tip !== 'grup') throw new Error(`${n.id} nu e un grup`);
  return n;
};
/** Documentul, cu id-ul grupului pus deoparte (instanța și piesa lui), fără revizie: comparat pe tot restul. */
const faraId = (d: Document, id: string): string => jsonCanonic({
  ...d, rev: 0,
  piese: d.piese.map((p) => (p.id === id ? { ...p, id: '*' } : p)),
  foi: d.foi.map((f) => ({ ...f, instante: f.instante.map((i) => (i.id === id ? { ...i, id: '*', piesa: '*' } : i)) })),
});

test('formele desenate, în locuri diferite (una rotită cu 30° și oglindită): grupul stă în origine, rădăcinile poartă locul, lumea la bit, același G-code', () => {
  const A = forma('e1', dreptunghi(60, 40), 20, 20);
  const B = forma('e2', cerc(6), 140, 50);
  // Oglinda stă în matricea rădăcinii (ADR 0054), deci ordinea compunerii cu locul instanței contează.
  const C0 = forma('e3', dreptunghi(40, 20), 200, 120, 30);
  const C: Pusa = { ...C0, piesa: { ...C0.piesa, radacina: { ...C0.piesa.radacina, matrice: { a: -1, b: 0, c: 0, d: 1, e: 40, f: 0 } } } };
  const d = doc(A, B, C);
  // Alese în altă ordine decât a foii: copiii vin tot în ordinea foii.
  const { r, dupa } = grupeaza(d, ['e3', 'e1', 'e2']);
  assert.equal(r.id, 'e4');
  assert.deepEqual(dupa.foi[0]?.instante, [{ id: 'e4', piesa: 'e4', x: 0, y: 0, rotire: 0 }]);
  assert.equal(dupa.piese.length, 1);
  const p = dupa.piese[0]!;
  assert.deepEqual(p.radacina, {
    tip: 'grup', id: 'g', matrice: ID,
    copii: [A, B, C].map((x) => ({ ...x.piesa.radacina, matrice: compune(matriceInstanta(x.instanta), x.piesa.radacina.matrice) })),
  });
  // Operațiile: ale primei părți, apoi ale celorlalte, în ordinea foii, neschimbate.
  assert.deepEqual(p.operatii, [A, B, C].flatMap((x) => x.piesa.operatii));
  assert.deepEqual(lume(dupa), lume(d));
  const g = taiat(d);
  assert.equal(taiat(dupa), g);
  // Ce se taie nu e gol: gaura în două treceri, apoi cele două dreptunghiuri.
  assert.ok(miscariDeTaiere(g) > 10);
});

test('același x și y, altă rotire: locul nu e comun, deci grupul stă în origine; numele piesei, doar cel comun', () => {
  const A = forma('e1', dreptunghi(10, 10), 150, 100);
  const B = forma('e2', dreptunghi(10, 10), 150, 100, 90);
  const d = doc({ ...A, piesa: { ...A.piesa, nume: 'stânga' } }, { ...B, piesa: { ...B.piesa, nume: 'dreapta' } });
  const { dupa } = grupeaza(d, ['e1', 'e2']);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => [i.x, i.y, i.rotire]), [[0, 0, 0]]);
  assert.deepEqual(lume(dupa), lume(d));
  assert.equal('nume' in dupa.piese[0]!, false);
  // Cu același nume pe amândouă, grupul îl primește.
  const numite = doc({ ...A, piesa: { ...A.piesa, nume: 'raft' } }, { ...B, piesa: { ...B.piesa, nume: 'raft' } });
  assert.equal(grupeaza(numite, ['e1', 'e2']).dupa.piese[0]?.nume, 'raft');
});

const L = { tip: 'L' } as const;
/** Piesa unui import (ca în `degrupare.test.ts`): dreptunghiul 60 × 40 (exterior), gaura R5 (interior), linia de gravat. */
const importul = (): Piesa => piesaDinImport({
  nume: 'raft',
  cai: [
    { varfuri: [{ p: { x: 0, y: 0 }, s: L }, { p: { x: 60, y: 0 }, s: L }, { p: { x: 60, y: 40 }, s: L }, { p: { x: 0, y: 40 }, s: L }], nume: 'TAIERE' },
    { varfuri: [{ p: { x: 35, y: 20 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 25, y: 20 }, s: { tip: 'A', bulge: 1 } }], nume: 'TAIERE' },
    { varfuri: [{ p: { x: 10, y: 35 }, s: L }, { p: { x: 50, y: 35 }, s: L }], inchis: false, nume: 'GRAVARE' },
  ],
  laturi: ['exterior', 'interior', 'pe-linie'],
  pagina: null,
  pozitie: 'fisier',
}, 'raft').piesa;

test('părțile unei degrupări: grupul le ia locul, cu locul lor, iar piesa e cea de dinainte (alt id)', () => {
  const imp = importul();
  const cercul = forma('e4', cerc(4), 250, 150);
  const d = doc({ piesa: imp, instanta: { id: 'i1', piesa: 'raft', x: 100, y: 50, rotire: 30 } }, cercul);
  const dg = comandaDegrupare(d, ['i1']);
  if (!dg.ok) throw new Error(dg.motiv);
  const degrupat = executa(istoricNou(d), dg.comanda).doc;
  assert.deepEqual(dg.ids, ['e3', 'e5', 'e6']);
  // Doar părțile: grupul ia locul lor comun. Cu cercul ales și el, locurile diferă, iar grupul stă în origine.
  const { r: r2, dupa: d2 } = grupeaza(degrupat, ['e6', 'e3', 'e5']);
  const { dupa } = grupeaza(degrupat, ['e6', 'e3', 'e5', 'e4']);
  assert.deepEqual(d2.foi[0]?.instante.map((i) => [i.id, i.piesa, i.x, i.y, i.rotire]), [[r2.id, r2.id, 100, 50, 30], ['e4', 'e4', 250, 150, 0]]);
  assert.deepEqual(d2.piese.map((p) => p.id), [r2.id, 'e4']);
  // Piesa grupului e piesa importului, cu alt id: același nume, aceeași rădăcină (grupul `g`), aceleași operații.
  assert.deepEqual({ ...d2.piese[0], id: 'raft' }, imp);
  assert.deepEqual(lume(d2), lume(d));
  assert.equal(taiat(d2), taiat(d));
  // Cu cercul: grupul în origine, iar lumea tot la bit.
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => [i.x, i.y, i.rotire]), [[0, 0, 0]]);
  assert.deepEqual(lume(dupa), lume(d));
  assert.equal(taiat(dupa), taiat(d));
});

test('grupează → degrupează → grupează dă același document (în afară de id-ul grupului), cu același G-code', () => {
  const A = forma('e1', dreptunghi(60, 40), 20, 20);
  const H1 = cuGaura('e2', 100, 20);
  const H2 = cuGaura('e3', 160, 20);
  const C = forma('e4', dreptunghi(40, 20), 200, 120, 30);
  const d0 = doc(A, H1, H2, C);
  const g0 = taiat(d0);
  const { r: r1, dupa: d1 } = grupeaza(d0, ['e1', 'e2', 'e3', 'e4']);
  const dg = comandaDegrupare(d1, [r1.id]);
  if (!dg.ok) throw new Error(dg.motiv);
  const d2 = executa(istoricNou(d1), dg.comanda).doc;
  const { r: r3, dupa: d3 } = grupeaza(d2, dg.ids);
  assert.equal(faraId(d3, r3.id), faraId(d1, r1.id));
  for (const d of [d1, d2, d3]) {
    assert.deepEqual(lume(d), lume(d0));
    assert.equal(taiat(d), g0);
  }
});

test('id-urile care s-ar repeta: a doua formă cu gaură primește `_2`, operațiile o urmează; rădăcina ia primul `g` liber', () => {
  const H1 = cuGaura('e1', 20, 20);
  const H2 = cuGaura('e2', 100, 20);
  const d = doc(H1, H2);
  const { dupa } = grupeaza(d, ['e1', 'e2']);
  const p = dupa.piese[0]!;
  const rad = grupul(p.radacina);
  assert.equal(rad.id, 'g_3');
  assert.deepEqual(rad.copii.map((c) => [c.id, grupul(c).copii.map((e) => e.id)]), [['g', ['c1', 'c2']], ['g_2', ['c1_2', 'c2_2']]]);
  assert.deepEqual(p.operatii.map((o) => [o.id, o.noduri, o.latura]), [
    ['exterior', ['c1'], 'exterior'], ['interior', ['c2'], 'interior'], ['exterior_2', ['c1_2'], 'exterior'], ['interior_2', ['c2_2'], 'interior'],
  ]);
  assert.deepEqual(lume(dupa), lume(d));
  assert.equal(taiat(dupa), taiat(d));
});

test('două texte (aceleași id-uri): după grupare sunt vectori, după degrupare se editează din nou (amprenta contururilor redenumite)', () => {
  const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/roboto.ttf', import.meta.url))));
  if (!r.ok) throw new Error(r.cod);
  const text = (id: string, continut: string, x: number): Pusa => {
    const p = { continut, inaltime: 50, spatiere: 0, interlinie: 1, aliniere: 'stanga' as const };
    const t = piesaText(aseazaText(r.font, p), { ...p, font: 'roboto' }, id);
    if (!t.ok) throw new Error(t.motiv);
    return { piesa: t.piesa, instanta: { id, piesa: id, x, y: 100, rotire: 0 } };
  };
  const d = doc(text('p1', 'O', 20), text('p2', 'D', 150));
  assert.ok(d.piese.every((p) => blocText(p.radacina)));
  const { r: g, dupa } = grupeaza(d, ['p1', 'p2']);
  const p = dupa.piese[0]!;
  // În grup, rădăcina nu mai e a unui text: vectori.
  assert.equal(blocText(p.radacina), null);
  const ids = (n: Nod): string[] => (n.tip === 'grup' ? [n.id, ...n.copii.flatMap(ids)] : [n.id]);
  assert.equal(new Set(ids(p.radacina)).size, ids(p.radacina).length);
  assert.deepEqual(lume(dupa), lume(d));
  assert.equal(taiat(dupa), taiat(d));
  const dg = comandaDegrupare(dupa, [g.id]);
  if (!dg.ok) throw new Error(dg.motiv);
  const desfacut = executa(istoricNou(dupa), dg.comanda).doc;
  assert.equal(desfacut.piese.length, 2);
  for (const q of desfacut.piese) assert.ok(blocText(q.radacina), `textul ${q.id} a rămas vectori`);
  assert.deepEqual(desfacut.piese.map((q) => blocText(q.radacina)?.continut), ['O', 'D']);
});

test('anularea și refacerea la bit, și cu o formă între cele grupate: locurile pun fiecare parte înapoi unde era', () => {
  const A = forma('e1', dreptunghi(60, 40), 20, 20);
  const X = forma('e2', cerc(8), 140, 50);
  const B = forma('e3', dreptunghi(40, 20), 200, 120);
  const d = doc(A, X, B);
  const { r, h, dupa } = grupeaza(d, ['e3', 'e1']);
  // Grupul ia locul lui e1 (primul, în ordinea foii), pe foaie și în piese; e2 rămâne după el.
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), [r.id, 'e2']);
  assert.deepEqual(dupa.piese.map((p) => p.id), [r.id, 'e2']);
  const inapoi = anuleaza(h);
  assert.equal(jsonCanonic({ ...inapoi.doc, rev: d.rev }), jsonCanonic(d));
  assert.equal(jsonCanonic({ ...reface(inapoi).doc, rev: dupa.rev }), jsonCanonic(dupa));
  // Aceleași tăieturi (formă, loc, operație); grupul se taie, în clasa lui, unde se tăia e1.
  const taieturi = (x: Document) => taieturiFoaie(x).map((t) => jsonCanonic({ forma: t.forma, matrice: t.matrice, latura: t.latura, adancime: t.adancime, scula: t.scula })).sort();
  assert.deepEqual(taieturi(dupa), taieturi(d));
  assert.deepEqual(lume(dupa).map((x) => x.forma), [A, B, X].map((x) => (x.piesa.radacina as { forma: FormaDoc }).forma));
});

test('salvarea și redeschiderea: ușa documentului deschide grupul la fel', () => {
  const { dupa } = grupeaza(doc(cuGaura('e1', 20, 20), cuGaura('e2', 100, 20), forma('e3', cerc(6), 200, 50, 45)), ['e1', 'e2', 'e3']);
  const u = incarca(JSON.parse(JSON.stringify(dupa)));
  assert.ok(u.ok, JSON.stringify(u));
  assert.equal(jsonCanonic(u.doc), jsonCanonic(dupa));
  assert.deepEqual(lume(u.doc), lume(dupa));
});

test('refuzurile, cu motiv: o singură formă, V-carve-urile cu aceleași valori în părți diferite, piesa împărțită, nivelurile', () => {
  const A = forma('e1', dreptunghi(60, 40), 20, 20);
  const B = forma('e2', cerc(6), 140, 50);
  const d = doc(A, B);
  for (const alese of [['e1'], [], ['e1', 'nu-e']]) assert.deepEqual(comandaGrupare(d, alese), { ok: false, motiv: 'motiv.grupare-doua' });
  // V-carve-urile cu aceleași valori (freza, adâncimea, pasul, sensul) s-ar săpa ca o singură regiune; cu altă adâncime (doar
  // ea), rămân două.
  const V60: Operatie['scula'] = { numar: 2, nume: 'V60', diametru: 12, forma: { tip: 'v', unghi: 60 } };
  const cuV = (x: Pusa, adancime: number): Pusa => ({
    ...x, piesa: { ...x.piesa, operatii: x.piesa.operatii.map((o) => ({ ...o, tip: 'vcarve', latura: 'interior', scula: V60, adancime, pas: 1 })) },
  });
  assert.deepEqual(comandaGrupare(doc(cuV(A, 3), cuV(B, 3)), ['e1', 'e2']), { ok: false, motiv: 'motiv.grupare-vcarve' });
  assert.equal(comandaGrupare(doc(cuV(A, 3), cuV(B, 2)), ['e1', 'e2']).ok, true);
  assert.equal(comandaGrupare(doc(cuV(A, 3), B), ['e1', 'e2']).ok, true);
  // Piesa lui e1 are și instanța i2: gruparea ar lua-o și pe a ei; la fel, alese amândouă.
  const imp: Document = { ...d, foi: d.foi.map((f) => ({ ...f, instante: [...f.instante, { ...A.instanta, id: 'i2', x: 200 }] })) };
  assert.deepEqual(comandaGrupare(imp, ['e1', 'e2']), { ok: false, motiv: 'motiv.grupare-impartita' });
  assert.deepEqual(comandaGrupare(imp, ['e1', 'i2']), { ok: false, motiv: 'motiv.grupare-impartita' });
  // O singură formă aleasă, chiar împărțită: întâi motivul numărului.
  assert.deepEqual(comandaGrupare(imp, ['i2']), { ok: false, motiv: 'motiv.grupare-doua' });
  // O piesă cu toate nivelurile arborelui (PLAFON.adancime): grupul i-ar adăuga unul. Cu unul mai puțin, încape.
  const lant = (niveluri: number): Pusa => {
    let n: Nod = { tip: 'element', id: 'x', forma: cerc(4), matrice: ID };
    for (let k = 1; k < niveluri; k++) n = { tip: 'grup', id: `n${k}`, matrice: ID, copii: [n] };
    return { piesa: { id: 'a', radacina: n, operatii: [] }, instanta: { id: 'a', piesa: 'a', x: 250, y: 150, rotire: 0 } };
  };
  assert.equal(incarca(JSON.parse(JSON.stringify(doc(lant(PLAFON.adancime), B)))).ok, true);
  assert.deepEqual(comandaGrupare(doc(lant(PLAFON.adancime), B), ['a', 'e2']), { ok: false, motiv: 'motiv.plafon' });
  assert.equal(comandaGrupare(doc(lant(PLAFON.adancime - 1), B), ['a', 'e2']).ok, true);
});

test('comanda din jurnal se păzește: o parte mutată de la locul ei, un loc în afara listei sau repetat, locurile doar la unele aruncă', () => {
  const A = forma('e1', dreptunghi(60, 40), 20, 20);
  const X = forma('e2', cerc(8), 140, 50);
  const B = forma('e3', dreptunghi(40, 20), 200, 120);
  const d = doc(A, X, B);
  const r = comandaGrupare(d, ['e1', 'e3']);
  if (!r.ok || r.comanda.tip !== 'regrupeaza') throw new Error('gruparea a fost refuzată');
  const [g] = r.comanda.degrupate;
  if (!g?.locuri) throw new Error('gruparea n-are locurile părților');
  assert.deepEqual(g.locuri, { instante: [0, 2], piese: [0, 2] });
  // Pe un document cu e3 mutat înaintea lui e2, anularea n-ar mai pune părțile unde erau: comanda aruncă.
  const mutat: Document = { ...d, foi: [{ ...d.foi[0]!, instante: [A.instanta, B.instanta, X.instanta] }] };
  assert.throws(() => executa(istoricNou(mutat), r.comanda), /nu stă la locul/);
  const dupa = executa(istoricNou(d), r.comanda).doc;
  const foaie = d.foi[0]!.id;
  const inversa = (locuri: { instante: number[]; piese: number[] }): Comanda => ({ tip: 'degrupeaza', foaie, degrupate: [{ ...g, locuri }] });
  assert.throws(() => executa(istoricNou(dupa), inversa({ instante: [0, 3], piese: [0, 2] })), /în afara listei/);
  assert.throws(() => executa(istoricNou(dupa), inversa({ instante: [1, 1], piese: [0, 2] })), /se repetă/);
  assert.throws(() => executa(istoricNou(dupa), inversa({ instante: [0], piese: [0, 2] })), /câte un loc/);
  const { locuri: _l, ...fara } = g;
  assert.throws(() => executa(istoricNou(dupa), { tip: 'degrupeaza', foaie, degrupate: [g, fara] }), /doar la unele/);
  // Inversa cu locurile: exact documentul de dinainte; fără ele, părțile vin una după alta, în locul grupului (ca la degrupare).
  assert.equal(jsonCanonic({ ...executa(istoricNou(dupa), { tip: 'degrupeaza', foaie, degrupate: [g] }).doc, rev: 0 }), jsonCanonic(d));
  const unaDupaAlta = executa(istoricNou(dupa), { tip: 'degrupeaza', foaie, degrupate: [fara] }).doc;
  assert.deepEqual(unaDupaAlta.foi[0]?.instante.map((i) => i.id), ['e1', 'e3', 'e2']);
});
