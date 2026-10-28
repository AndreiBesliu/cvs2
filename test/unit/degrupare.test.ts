import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplica, compune } from '../../src/geom/matrice.ts';
import { piesaDinImport } from '../../src/io/piesa.ts';
import { partiDegrupare } from '../../src/model/degrupare.ts';
import { elementeFoaie, elementeInstanta, matriceInstanta } from '../../src/model/lume.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { documentNou, operatieImplicita, PLAFON, type Document, type Matrice, type Nod, type Operatie, type Piesa } from '../../src/model/document.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { anuleaza, executa, istoricNou, reface, type Comanda } from '../../src/model/jurnal.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { comandaDegrupare } from '../../src/ui/actiuniDocumentCalcul.ts';

/** Degruparea, partea pură (ADR 0103): părțile unei piese-grup, operațiile lor și locul lor în lume, cu valori pe hârtie. */

const L = { tip: 'L' } as const;
/** Piesa unui import: dreptunghiul 60 × 40 (exterior), gaura R5 din mijloc (interior) și o linie de gravat (pe linie). */
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

const INSTANTA = { id: 'i1', piesa: 'raft', x: 100, y: 50, rotire: 30 };

/** Fiecare element în lume, ca (formă, matrice): aceeași geometrie pe foaie înseamnă aceleași perechi, în aceeași ordine. */
const inLume = (radacini: readonly Nod[]): Array<{ forma: unknown; matrice: Matrice }> =>
  radacini.flatMap((r) => elementeInstanta(r, INSTANTA, matriceInstanta(INSTANTA)).map((e) => ({ forma: e.forma, matrice: e.matrice })));

test('piesa importului se desface pe contururi: fiecare cu operația lui, în lume la bit unde era', () => {
  const p = importul();
  const parti = partiDegrupare(p);
  if (typeof parti === 'string') throw new Error(`refuzată: ${parti}`);
  assert.equal(parti.length, 3);
  // Rădăcina fiecărei părți e chiar copilul grupului (grupul importului n-are transformare).
  const g = p.radacina;
  assert.ok(g.tip === 'grup');
  if (g.tip !== 'grup') return;
  parti.forEach((x, k) => { assert.equal(x.radacina, g.copii[k]); });
  // Operațiile: exteriorul pe c1, interiorul pe c2, linia pe c3, fiecare cu id-ul, latura și adâncimea lui.
  const op = (o: Operatie): [string, readonly string[], string, number] => [o.id, o.noduri, o.latura, o.adancime];
  assert.deepEqual(parti.map((x) => x.operatii.map(op)), [
    [['exterior', ['c1'], 'exterior', 3]],
    [['interior', ['c2'], 'interior', 3]],
    [['deschise', ['c3'], 'pe-linie', 1]],
  ]);
  assert.deepEqual(inLume(parti.map((x) => x.radacina)), inLume([p.radacina]));
});

test('grupul oglindit (matricea rădăcinii): partea primește matricea compusă, în lume aceeași, sub 1e-12 mm', () => {
  const p = importul();
  const g = p.radacina;
  if (g.tip !== 'grup') throw new Error('importul n-a dat un grup');
  // Oglinda față de x = 30 (ADR 0054: reflexia stă în rădăcina piesei), cu o translație pe y; dreptunghiul are și el o
  // translație (5, 0) în grup, ca ordinea compunerii să conteze.
  const G: Matrice = { a: -1, b: 0, c: 0, d: 1, e: 60, f: 7.5 };
  const [c1, ...rest] = g.copii;
  if (!c1) throw new Error('importul n-are contururi');
  const copii = [{ ...c1, matrice: { a: 1, b: 0, c: 0, d: 1, e: 5, f: 0 } }, ...rest];
  const oglindita: Piesa = { ...p, radacina: { ...g, matrice: G, copii } };
  const parti = partiDegrupare(oglindita);
  if (typeof parti === 'string') throw new Error(`refuzată: ${parti}`);
  parti.forEach((x, k) => { assert.deepEqual(x.radacina.matrice, compune(G, copii[k]?.matrice ?? G)); });
  // Colțul (60, 40) al dreptunghiului: mutat în (65, 40) în grup, oglindit în (−5, 47,5) în piesă, apoi rotit cu 30° și mutat
  // în (100, 50).
  const M = matriceInstanta(INSTANTA);
  const inainte = aplica(compune(compune(M, G), copii[0]?.matrice ?? G), { x: 60, y: 40 });
  const dupa = inLume([parti[0]?.radacina ?? g])[0];
  if (!dupa) throw new Error('partea n-are elemente');
  const q = aplica(dupa.matrice, { x: 60, y: 40 });
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  assert.ok(Math.hypot(q.x - (100 - 5 * c - 47.5 * s), q.y - (50 - 5 * s + 47.5 * c)) < 1e-12);
  assert.ok(Math.hypot(q.x - inainte.x, q.y - inainte.y) < 1e-12);
});

test('V-carve-ul pe contururi din copii diferiți e refuzat; pe un copil-grup, rămâne întreg în partea lui', () => {
  const p = importul();
  const g = p.radacina;
  if (g.tip !== 'grup') throw new Error('importul n-a dat un grup');
  const vcarve = (noduri: string[]): Operatie => ({ ...(p.operatii[0] as Operatie), id: 'v', tip: 'vcarve', noduri });
  assert.equal(partiDegrupare({ ...p, operatii: [vcarve(['c1', 'c2'])] }), 'vcarve');
  // Dreptunghiul și gaura, într-un subgrup (litera cu golul ei), plus linia: două părți, V-carve-ul întreg în prima.
  const [c1, c2, c3] = g.copii;
  if (!c1 || !c2 || !c3) throw new Error('importul n-are trei contururi');
  const imbricat: Piesa = { ...p, radacina: { ...g, copii: [{ tip: 'grup', id: 'litera', matrice: g.matrice, copii: [c1, c2] }, c3] }, operatii: [vcarve(['c1', 'c2'])] };
  const parti = partiDegrupare(imbricat);
  if (typeof parti === 'string') throw new Error(`refuzată: ${parti}`);
  assert.deepEqual(parti.map((x) => [x.radacina.id, x.operatii.map((o) => o.noduri)]), [['litera', [['c1', 'c2']]], ['c3', []]]);
});

test('nimic de desfăcut: rădăcina element, grupul cu un singur copil; o operație pe mai mulți copii se împarte, nodul lipsă cade', () => {
  const p = importul();
  const g = p.radacina;
  if (g.tip !== 'grup') throw new Error('importul n-a dat un grup');
  const [c1] = g.copii;
  if (!c1) throw new Error('importul n-are contururi');
  assert.equal(partiDegrupare({ ...p, radacina: c1 }), 'o-singura-forma');
  assert.equal(partiDegrupare({ ...p, radacina: { ...g, copii: [c1] } }), 'o-singura-forma');
  const peDoi: Operatie = { ...(p.operatii[0] as Operatie), id: 'x', noduri: ['c3', 'zz', 'c1'] };
  const parti = partiDegrupare({ ...p, operatii: [peDoi] });
  if (typeof parti === 'string') throw new Error(`refuzată: ${parti}`);
  assert.deepEqual(parti.map((x) => x.operatii.map((o) => [o.id, o.noduri])), [[['x', ['c1']]], [], [['x', ['c3']]]]);
});

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** Foaia cu piesa importului (instanța i1, în (100, 50), rotită cu 30°) și, după ea, un cerc simplu (e4), care n-are ce desface; id-urile noi îl ocolesc (e3, apoi e5). */
function docImport(p: Piesa = importul()): Document {
  const d = documentNou(STOC);
  const foaie = d.foi[0];
  if (!foaie) throw new Error('documentul nou n-are foaie');
  const cerc: Piesa = { id: 'e4', radacina: { tip: 'element', id: 'e4', forma: { tip: 'cerc', raza: 4 }, matrice: ID }, operatii: [operatieImplicita('e4', { tip: 'cerc', raza: 4 })] };
  return { ...d, piese: [p, cerc], foi: [{ ...foaie, instante: [INSTANTA, { id: 'e4', piesa: 'e4', x: 250, y: 150, rotire: 0 }] }] };
}
/** G-code-ul GRBL al foii, fără comentarii (ele poartă id-urile în lume, care se schimbă): ce se taie. */
function taiat(d: Document): string {
  const j = programDinDocument(d);
  if (!j.ok) throw new Error(j.motiv);
  const r = posteaza(j.program, { foaie: STOC, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
  if (!r.ok) throw new Error('postul a refuzat programul');
  return r.text.split('\n').filter((l) => !l.startsWith('(')).join('\n');
}

test('acțiunea: părțile iau locul instanței, alese rămân părțile și cercul; ce se taie e același G-code; anularea întoarce documentul la bit', () => {
  const d = docImport();
  const r = comandaDegrupare(d, ['e4', 'i1']);
  if (!r.ok) throw new Error(r.motiv);
  assert.deepEqual(r.ids, ['e3', 'e5', 'e6', 'e4']);
  const h = executa(istoricNou(d), r.comanda);
  const dupa = h.doc;
  // Pe foaie: cele trei părți în locul lui i1, apoi cercul; piesele, la fel, în locul piesei vechi.
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => [i.id, i.piesa, i.x, i.y, i.rotire]), [
    ['e3', 'e3', 100, 50, 30], ['e5', 'e5', 100, 50, 30], ['e6', 'e6', 100, 50, 30], ['e4', 'e4', 250, 150, 0],
  ]);
  assert.deepEqual(dupa.piese.map((p) => [p.id, p.nume, p.radacina.id, p.operatii.map((o) => o.id)]), [
    ['e3', 'raft', 'c1', ['exterior']], ['e5', 'raft', 'c2', ['interior']], ['e6', 'raft', 'c3', ['deschise']], ['e4', undefined, 'e4', ['e4']],
  ]);
  // Lumea: aceleași forme, cu aceleași matrice, în aceeași ordine.
  const lume = (x: Document) => elementeFoaie(x).map((e) => ({ forma: e.forma, matrice: e.matrice }));
  assert.deepEqual(lume(dupa), lume(d));
  assert.equal(taiat(dupa), taiat(d));
  // Un singur pas: anularea dă exact documentul de dinainte (în afară de revizie), refacerea pe cel de după.
  const inapoi = anuleaza(h);
  assert.equal(jsonCanonic({ ...inapoi.doc, rev: d.rev }), jsonCanonic(d));
  assert.equal(jsonCanonic({ ...reface(inapoi).doc, rev: dupa.rev }), jsonCanonic(dupa));
  // Ce se taie nu e gol: cercul (în două treceri), gaura, linia și dreptunghiul, 20 de mișcări de tăiere.
  assert.equal(taiat(d).split('\n').filter((l) => /^G[123] /.test(l)).length, 20);
});

test('acțiunea refuză cu motiv: V-carve-ul peste părți, piesa împărțită, nimic de desfăcut; selecția goală nu e a ei', () => {
  const p = importul();
  const vcarve: Operatie = { ...(p.operatii[0] as Operatie), id: 'v', tip: 'vcarve', noduri: ['c1', 'c2'] };
  const cuV = docImport({ ...p, operatii: [vcarve] });
  assert.deepEqual(comandaDegrupare(cuV, ['i1']), { ok: false, motiv: 'motiv.degrupare-vcarve' });
  const d = docImport();
  const imp: Document = { ...d, foi: d.foi.map((f) => ({ ...f, instante: [...f.instante, { ...INSTANTA, id: 'i2', x: 10 }] })) };
  assert.deepEqual(comandaDegrupare(imp, ['i1']), { ok: false, motiv: 'motiv.degrupare-impartita' });
  assert.deepEqual(comandaDegrupare(d, ['e4']), { ok: false, motiv: 'motiv.nimic-de-degrupat' });
  assert.deepEqual(comandaDegrupare(d, []), { ok: false, motiv: 'motiv.nimic-de-degrupat' });
});

test('comanda din jurnal e liniară și se păzește: instanța lipsă, piesa care ar rămâne fără instanțe, id-ul repetat aruncă', () => {
  const d = docImport();
  const r = comandaDegrupare(d, ['i1']);
  if (!r.ok || r.comanda.tip !== 'degrupeaza') throw new Error('degruparea a fost refuzată');
  const [x] = r.comanda.degrupate;
  if (!x) throw new Error('nicio instanță degrupată');
  const cu = (c: Partial<typeof x>): Comanda => ({ tip: 'degrupeaza', foaie: d.foi[0]?.id ?? '', degrupate: [{ ...x, ...c }] });
  assert.throws(() => executa(istoricNou(d), cu({ instanta: { ...x.instanta, id: 'nu-e' } })), /instanțe lipsesc/);
  assert.throws(() => executa(istoricNou(d), cu({ piesa: { ...x.piesa, id: 'nu-e' } })), /piese lipsesc/);
  assert.throws(() => executa(istoricNou(d), cu({ parti: x.parti.map((q) => ({ instanta: { ...q.instanta, piesa: 'e4' }, piesa: { ...q.piesa, id: 'e4' } })) })), /un id de piesă s-ar repeta/);
  assert.throws(() => executa(istoricNou(d), cu({ parti: x.parti.map((q) => ({ ...q, instanta: { ...q.instanta, id: 'e4' } })) })), /s-ar repeta/);
  // O altă instanță a piesei vechi ar trimite la o piesă scoasă.
  const imp: Document = { ...d, foi: d.foi.map((f) => ({ ...f, instante: [...f.instante, { ...INSTANTA, id: 'i2' }] })) };
  assert.throws(() => executa(istoricNou(imp), r.comanda), /piesa lipsă raft/);
  // Inversa, pe documentul de după, întoarce instanța veche pe locul primei părți.
  const dupa = executa(istoricNou(d), r.comanda).doc;
  const regrupat = executa(istoricNou(dupa), { ...r.comanda, tip: 'regrupeaza' }).doc;
  assert.deepEqual(regrupat.foi[0]?.instante.map((i) => i.id), ['i1', 'e4']);
  assert.deepEqual(regrupat.piese.map((p) => p.id), ['raft', 'e4']);
});

test('plafonul operațiilor: o operație pe trei contururi devine trei; peste plafon, degruparea se refuză, documentul rămâne', () => {
  const op = operatieImplicita('o', { tip: 'cerc', raza: 2 });
  // O piesă fără instanțe cu PLAFON.operatii − 5 operații (nu se taie, deci nu umple tăieturile) și grupul cu două operații pe
  // toate trei contururile: înainte, PLAFON − 3; după, PLAFON − 5 + 6 = PLAFON + 1.
  const multe: Piesa = { id: 'm', radacina: { tip: 'element', id: 'm', forma: { tip: 'cerc', raza: 2 }, matrice: ID }, operatii: Array.from({ length: PLAFON.operatii - 5 }, (_, k) => ({ ...op, id: `o${k}`, noduri: ['m'] })) };
  const copii = [1, 2, 3].map((k) => ({ tip: 'element' as const, id: `c${k}`, forma: { tip: 'cerc' as const, raza: 2 }, matrice: { ...ID, e: k * 10 } }));
  const grup: Piesa = { id: 'g', radacina: { tip: 'grup', id: 'r', matrice: ID, copii }, operatii: [{ ...op, id: 'a', noduri: ['c1', 'c2', 'c3'] }, { ...op, id: 'b', noduri: ['c1', 'c2', 'c3'] }] };
  const d0 = documentNou(STOC);
  const d: Document = { ...d0, piese: [multe, grup], foi: d0.foi.map((f) => ({ ...f, instante: [{ id: 'i', piesa: 'g', x: 0, y: 0, rotire: 0 }] })) };
  assert.deepEqual(comandaDegrupare(d, ['i']), { ok: false, motiv: 'motiv.plafon' });
  // Cu o operație mai puțin în piesa fără instanțe, încape exact.
  const una: Document = { ...d, piese: [{ ...multe, operatii: multe.operatii.slice(1) }, grup] };
  assert.equal(comandaDegrupare(una, ['i']).ok, true);
});
