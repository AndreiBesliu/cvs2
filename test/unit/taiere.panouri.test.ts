/**
 * Tăierea în panouri (ADR 0181 §7; felia 10.3↑k), pe hârtie:
 * - **grila:** firma de 2 400 × 1 000, cu panoul de 1 200 × 900: egale, liniile X = 1 200 și Y = 500 (patru de 1 200 × 500); din
 *   colț, X = 1 200 și Y = 900 (două de 1 200 × 900, două de 1 200 × 100); după număr, 3 × 2: X = 800, 1 600 și Y = 500; cu
 *   1 000 × 600, egale 800 × 500, din colț X = 1 000, 2 000 și Y = 600; cutia mutată, din colțul ei; o lățime cu zgomot de 1e-9
 *   peste un multiplu nu face un panou în plus; marginile cutiei nu sunt linii; peste 100 de panouri, `panouri` (fără să le
 *   numere pe rând: nici la 1e9); mărimile și numerele greșite, `valoare`;
 * - **firma tăiată:** patru panouri, „Panoul 1” … „Panoul 4”, rând cu rând, de jos (cutiile lor, ariile de câte 600 000 mm²; din
 *   colț, 1 080 000 de două ori și 120 000 de două ori, cu suma 2 400 000); fiecare bucată în celula ei (oracolul); anularea
 *   pune documentul exact; id-urile noi nu sunt ale documentului vechi; pe foaie, panourile vin în ordinea lor (și grupurile);
 * - **celulele goale nu primesc număr;** o formă întreagă, singură în celula ei, își păstrează id-ul și primește numele panoului;
 * - **literele pe firmă:** bucățile unei celule devin un grup cu numele panoului (placa și litera, netăiată);
 * - **o piesă cu contururi de ambele părți ale unei linii care nu le trece** (un text): despărțită pe laturi, fiecare literă în
 *   panoul ei (`desparte`; fără el, linia n-o taie; cu îmbinare, o linie care doar desparte nu cere dinți);
 * - **cu îmbinare** (zigzag 100 / 20 / 3): fiecare bucată în celula ei, cu dinții de peste linie (10 mm), ariile fac firma, dinții
 *   se văd; cu jocul 0,2, bucățile la 0,2 una de alta;
 * - **V-carve-urile care s-ar amesteca** (două litere lipite, cu același V-carve): panoul rămâne negrupat, cu numele lui pe
 *   fiecare bucată; **un id vechi eliberat de o tăietură** nu ajunge pe o bucată nouă; **cutia** e a tuturor contururilor
 *   unei piese (un text singur, în două panouri: câte o literă);
 * - **acțiunea `document.taie`:** un singur pas de anulare (tăierea și gruparea), alese rămân panourile; fără nicio tăietură,
 *   doar grupurile;
 * - **refuzurile:** peste plafon; nimic ales; o piesă pusă de două ori (și una netăiată, care ar intra într-un grup); un singur panou (`nimic-taiat`); valorile; spațiul fără
 *   închidere; dinții care ar ieși din fâșia de 100 mm a panourilor din colț (`imbinare-margine`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { operatieImplicita, type Document, type FormaDoc, type Piesa } from '../../src/model/document.ts';
import { grilaPanouri, type GrilaPanouri } from '../../src/model/grilaPanouri.ts';
import type { Imbinare } from '../../src/model/imbinare.ts';
import { anuleaza, executa, istoricNou, type Comanda, type Istoric } from '../../src/model/jurnal.ts';
import { taieInPanouri, type CererePanouri } from '../../src/model/panouri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type RezultatTaiere } from '../../src/model/taiere.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { ariePar, cutieForma, formeInstanta, judecaImbinarea, judecaPanourile, type FormaOracol } from '../oracles/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 3000, inaltime: 2000, grosime: 18 };
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const dreptunghi = (w: number, h: number): FormaDoc => ({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 });
const patrat = (id: string, x: number, y: number, w: number, h: number) => forma(id, dreptunghi(w, h), x, y);
const FIRMA = patrat('f', 0, 0, 2400, 1000);
const CUTIE = { minX: 0, minY: 0, maxX: 2400, maxY: 1000 };
const EGALE: GrilaPanouri = { fel: 'marime', latime: 1200, inaltime: 900, colt: false };
const COLT: GrilaPanouri = { ...EGALE, colt: true };
const ZIGZAG: Imbinare = { model: 'zigzag', pas: 100, inaltime: 20, raza: 3 };
const cerere = (alese: readonly string[], grila: GrilaPanouri, o: Partial<CererePanouri> = {}): CererePanouri => ({ alese, grila, inchide: true, nume: 'Panoul', ...o });
type Ok = Extract<RezultatTaiere, { ok: true }>;
type Celula = { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
const celula = (minX: number, minY: number, maxX: number, maxY: number): Celula => ({ minX, minY, maxX, maxY });
/** Celulele firmei: egale (1 200 × 500) și din colț (1 200 × 900, apoi 1 200 × 100), rând cu rând, de jos. */
const CELULE_EGALE = [celula(0, 0, 1200, 500), celula(1200, 0, 2400, 500), celula(0, 500, 1200, 1000), celula(1200, 500, 2400, 1000)];
const CELULE_COLT = [celula(0, 0, 1200, 900), celula(1200, 0, 2400, 900), celula(0, 900, 1200, 1000), celula(1200, 900, 2400, 1000)];

/** Comanda rezultatului (ca acțiunea `document.taie`): degruparea, apoi gruparea panourilor, într-un singur pas. */
function comanda(d: Document, r: Ok): Comanda {
  const foaie = d.foi[0];
  assert.ok(foaie);
  const comenzi: Comanda[] = [];
  if (r.degrupate.length > 0) comenzi.push({ tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate });
  if (r.grupuri && r.grupuri.length > 0) comenzi.push({ tip: 'regrupeaza', foaie: foaie.id, degrupate: r.grupuri });
  return { tip: 'lot', comenzi };
}
function taiat(d: Document, c: CererePanouri): { readonly r: Ok; readonly dupa: Document } {
  const r = taieInPanouri(d, c);
  if (!r.ok) return assert.fail(`refuzată: ${r.motiv}`);
  const h = executa(istoricNou(d), comanda(d, r));
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(h.doc))), 'documentul de după trece de ușă');
  assert.deepEqual({ ...anuleaza(h).doc, rev: d.rev }, d, 'anularea pune documentul exact (doar revizia crește)');
  return { r, dupa: h.doc };
}
const cutieForme = (f: readonly FormaOracol[]): Celula => f.map(cutieForma).reduce((a, b) => celula(Math.min(a.minX, b.minX), Math.min(a.minY, b.minY), Math.max(a.maxX, b.maxX), Math.max(a.maxY, b.maxY)));
/** Panourile, în ordinea lor: numele piesei, câte părți are grupul (1: o singură formă), formele în lume și cutia lor. */
function panouri(dupa: Document, ids: readonly string[]): Array<{ readonly nume: string | undefined; readonly parti: number; readonly forme: FormaOracol[]; readonly cutie: Celula }> {
  return ids.map((id) => {
    const i = dupa.foi[0]?.instante.find((x) => x.id === id);
    assert.ok(i, `panoul ${id} e pe foaie`);
    const p = dupa.piese.find((x) => x.id === i.piesa);
    assert.ok(p);
    const forme = formeInstanta(dupa, id);
    return { nume: p.nume, parti: p.radacina.tip === 'grup' ? p.radacina.copii.length : 1, forme, cutie: cutieForme(forme) };
  });
}
const aproape = (a: Celula, b: Celula, mesaj: string): void => {
  for (const k of ['minX', 'minY', 'maxX', 'maxY'] as const) assert.ok(Math.abs(a[k] - b[k]) < 1e-6, `${mesaj}: ${k} ${a[k]}, nu ${b[k]}`);
};
const NUME4 = ['Panoul 1', 'Panoul 2', 'Panoul 3', 'Panoul 4'];

test('grila: egale, din colț și după număr; cutia mutată; zgomotul nu face un panou în plus; plafonul și valorile', () => {
  assert.deepEqual(grilaPanouri(CUTIE, EGALE), { xs: [1200], ys: [500] });
  assert.deepEqual(grilaPanouri(CUTIE, COLT), { xs: [1200], ys: [900] });
  assert.deepEqual(grilaPanouri(CUTIE, { fel: 'numar', coloane: 3, randuri: 2 }), { xs: [800, 1600], ys: [500] });
  assert.deepEqual(grilaPanouri(CUTIE, { fel: 'marime', latime: 1000, inaltime: 600, colt: false }), { xs: [800, 1600], ys: [500] });
  assert.deepEqual(grilaPanouri(CUTIE, { fel: 'marime', latime: 1000, inaltime: 600, colt: true }), { xs: [1000, 2000], ys: [600] });
  assert.deepEqual(grilaPanouri(celula(100, -50, 2500, 950), COLT), { xs: [1300], ys: [850] });
  // Marginile cutiei nu sunt linii: panoul cât firma, nicio linie.
  assert.deepEqual(grilaPanouri(CUTIE, { fel: 'marime', latime: 2400, inaltime: 1000, colt: false }), { xs: [], ys: [] });
  assert.deepEqual(grilaPanouri(CUTIE, { fel: 'marime', latime: 2400, inaltime: 1000, colt: true }), { xs: [], ys: [] });
  // Zgomotul cutiei (1e-9 peste un multiplu) nu face un panou de 1e-9 în plus.
  for (const colt of [false, true]) {
    const g = grilaPanouri({ ...CUTIE, maxX: 2400 + 1e-9 }, { ...EGALE, colt });
    assert.ok(typeof g === 'object' && g.xs.length === 1, `zgomotul, ${colt ? 'din colț' : 'egale'}`);
  }
  // O cutie fără lățime (o linie verticală): o singură coloană.
  assert.deepEqual(grilaPanouri(celula(5, 0, 5, 1000), EGALE), { xs: [], ys: [500] });
  // Plafonul: 100 de panouri trec, 101 nu; fără să le numere pe rând.
  assert.equal(typeof grilaPanouri(CUTIE, { fel: 'numar', coloane: 100, randuri: 1 }), 'object');
  assert.equal(grilaPanouri(CUTIE, { fel: 'numar', coloane: 101, randuri: 1 }), 'panouri');
  assert.equal(grilaPanouri(CUTIE, { fel: 'numar', coloane: 10, randuri: 11 }), 'panouri');
  assert.equal(grilaPanouri(CUTIE, { fel: 'numar', coloane: 1e9, randuri: 1 }), 'panouri');
  assert.equal(grilaPanouri(CUTIE, { fel: 'marime', latime: 100, inaltime: 100, colt: false }), 'panouri', '24 × 10');
  assert.equal(grilaPanouri(CUTIE, { fel: 'marime', latime: 1e-9, inaltime: 1000, colt: true }), 'panouri');
  for (const v of [0, -1, Number.NaN, Infinity]) {
    assert.equal(grilaPanouri(CUTIE, { ...EGALE, latime: v }), 'valoare', `lățimea ${v}`);
    assert.equal(grilaPanouri(CUTIE, { ...COLT, inaltime: v }), 'valoare', `înălțimea ${v}`);
  }
  for (const v of [0, -2, 2.5, Number.NaN, Infinity]) {
    assert.equal(grilaPanouri(CUTIE, { fel: 'numar', coloane: v, randuri: 1 }), 'valoare', `coloanele ${v}`);
    assert.equal(grilaPanouri(CUTIE, { fel: 'numar', coloane: 1, randuri: v }), 'valoare', `rândurile ${v}`);
  }
});

test('firma de 2 400 × 1 000, în panouri egale de cel mult 1 200 × 900: patru de 1 200 × 500, rând cu rând, de jos', () => {
  const d = docDin(stoc, FIRMA);
  const { r, dupa } = taiat(d, cerere(['f'], EGALE));
  const p = panouri(dupa, r.ids);
  assert.deepEqual(p.map((x) => x.nume), NUME4);
  assert.deepEqual(p.map((x) => x.parti), [1, 1, 1, 1], 'o singură bucată pe panou: fără grup');
  assert.equal(r.grupuri?.length ?? 0, 0);
  for (const [k, x] of p.entries()) {
    aproape(x.cutie, CELULE_EGALE[k] as Celula, `panoul ${k + 1}`);
    assert.ok(Math.abs(ariePar(x.forme) - 600_000) < 1, `panoul ${k + 1}: ${ariePar(x.forme)} mm²`);
  }
  assert.equal(r.forme, 3, 'X = 1 200 taie firma, Y = 500 cele două jumătăți');
  const inainte = formeInstanta(d, 'f');
  assert.deepEqual(judecaPanourile({ inainte, panouri: p.map((x, k) => ({ celula: CELULE_EGALE[k] as Celula, forme: x.forme })), toleranta: 0, joc: 0 }), []);
  const vechi = new Set([...d.piese.map((x) => x.id), ...d.foi.flatMap((f) => f.instante.map((i) => i.id))]);
  assert.ok(r.ids.every((id) => !vechi.has(id)), `id-urile noi: ${r.ids.join(', ')}`);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), r.ids, 'pe foaie, în ordinea panourilor');
});

test('din colț: două de 1 200 × 900 și două de 1 200 × 100, cu suma 2 400 000 mm²', () => {
  const d = docDin(stoc, FIRMA);
  const { r, dupa } = taiat(d, cerere(['f'], COLT));
  const p = panouri(dupa, r.ids);
  assert.deepEqual(p.map((x) => x.nume), NUME4);
  const arii = p.map((x) => ariePar(x.forme));
  for (const [k, a] of [1_080_000, 1_080_000, 120_000, 120_000].entries()) assert.ok(Math.abs((arii[k] as number) - a) < 1, `panoul ${k + 1}: ${arii[k]}, nu ${a}`);
  assert.ok(Math.abs(arii.reduce((a, b) => a + b, 0) - 2_400_000) < 1);
  for (const [k, x] of p.entries()) aproape(x.cutie, CELULE_COLT[k] as Celula, `panoul ${k + 1}`);
  assert.deepEqual(judecaPanourile({ inainte: formeInstanta(d, 'f'), panouri: p.map((x, k) => ({ celula: CELULE_COLT[k] as Celula, forme: x.forme })), toleranta: 0, joc: 0 }), []);
});

test('celulele goale nu primesc număr; o formă întreagă, singură în celula ei, își păstrează id-ul și primește numele', () => {
  // Cutia lor e 2 400 × 1 000: „a” stă în celula de jos, din stânga; „b”, în cea de sus, din dreapta; celelalte două, goale.
  const d = docDin(stoc, patrat('a', 0, 0, 1000, 400), patrat('b', 1400, 600, 1000, 400));
  const { r, dupa } = taiat(d, cerere(['a', 'b'], EGALE));
  assert.deepEqual(r.ids, ['a', 'b']);
  assert.equal(r.forme, 0);
  assert.deepEqual(panouri(dupa, r.ids).map((x) => x.nume), ['Panoul 1', 'Panoul 2']);
  assert.deepEqual(dupa.foi[0]?.instante, d.foi[0]?.instante, 'instanțele rămân aceleași (doar numele pieselor)');
});

test('literele pe firmă: bucățile unei celule devin un grup cu numele panoului, cu litera netăiată în el', () => {
  const d = docDin(stoc, FIRMA, patrat('a', 100, 100, 100, 200), patrat('b', 1300, 600, 100, 200));
  const { r, dupa } = taiat(d, cerere(['f', 'a', 'b'], EGALE));
  const p = panouri(dupa, r.ids);
  assert.deepEqual(p.map((x) => x.nume), NUME4);
  assert.deepEqual(p.map((x) => x.parti), [2, 1, 1, 2], 'placa și litera, în panourile 1 și 4');
  assert.equal(r.grupuri?.length, 2);
  const inainte = ['f', 'a', 'b'].flatMap((id) => formeInstanta(d, id));
  assert.deepEqual(judecaPanourile({ inainte, panouri: p.map((x, k) => ({ celula: CELULE_EGALE[k] as Celula, forme: x.forme })), toleranta: 0, joc: 0 }), []);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), r.ids, 'patru panouri pe foaie, în ordinea lor, nimic altceva');
});

test('o piesă cu contururi de ambele părți ale unei linii care nu le trece (un text) se desparte pe laturi', () => {
  const l = dreptunghi(100, 200);
  const text: Piesa = {
    id: 't',
    radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'l1', forma: l, matrice: { ...ID, e: 100, f: 100 } },
      { tip: 'element', id: 'l2', forma: l, matrice: { ...ID, e: 1300, f: 100 } },
    ] },
    operatii: [operatieImplicita('l1', l), operatieImplicita('l2', l)],
  };
  const baza = docDin(stoc, FIRMA);
  const foaie = baza.foi[0];
  assert.ok(foaie);
  const d: Document = { ...baza, piese: [...baza.piese, text], foi: [{ ...foaie, instante: [...foaie.instante, { id: 't', piesa: 't', x: 0, y: 0, rotire: 0 }] }] };
  const X = { fel: 'x', x: 1200 } as const;
  assert.deepEqual(taie(d, { cutit: X, alese: ['t'], inchide: true }), { ok: false, motiv: 'nimic-taiat' }, 'fără `desparte`, linia n-o taie');
  const s = taie(d, { cutit: X, alese: ['t'], inchide: true, desparte: true });
  if (!s.ok) return assert.fail(s.motiv);
  assert.equal(s.forme, 0);
  assert.equal(s.degrupate.length, 1);
  const parti = s.degrupate[0]?.parti ?? [];
  assert.equal(parti.length, 2, 'litera din stânga, apoi cea din dreapta');
  const dupaS = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: s.degrupate }).doc;
  const [A, B] = parti.map((x) => cutieForme(formeInstanta(dupaS, x.instanta.id)));
  aproape(A as Celula, celula(100, 100, 200, 300), 'partea A');
  aproape(B as Celula, celula(1300, 100, 1400, 300), 'partea B');
  assert.ok(taie(d, { cutit: X, alese: ['t'], inchide: true, desparte: true, imbinare: ZIGZAG }).ok, 'o linie care doar desparte nu cere dinți');
  // Textul singur, în două panouri: cutia e a ambelor litere (100 … 1 400), deci X = 750 le desparte, câte una pe panou.
  const singur = taiat(d, cerere(['t'], { fel: 'numar', coloane: 2, randuri: 1 }));
  const ps = panouri(singur.dupa, singur.r.ids);
  assert.deepEqual(ps.map((x) => x.nume), ['Panoul 1', 'Panoul 2']);
  aproape(ps[0]?.cutie as Celula, celula(100, 100, 200, 300), 'litera din stânga');
  aproape(ps[1]?.cutie as Celula, celula(1300, 100, 1400, 300), 'litera din dreapta');
  const { r, dupa } = taiat(d, cerere(['f', 't'], EGALE));
  const p = panouri(dupa, r.ids);
  assert.deepEqual(p.map((x) => x.parti), [2, 2, 1, 1]);
  const inainte = ['f', 't'].flatMap((id) => formeInstanta(d, id));
  assert.deepEqual(judecaPanourile({ inainte, panouri: p.map((x, k) => ({ celula: CELULE_EGALE[k] as Celula, forme: x.forme })), toleranta: 0, joc: 0 }), []);
});

test('cu îmbinare (zigzag 100 / 20 / 3): fiecare bucată în celula ei, cu dinții de peste linie; cu jocul 0,2, la 0,2 una de alta', () => {
  const d = docDin(stoc, FIRMA);
  const inainte = formeInstanta(d, 'f');
  for (const joc of [0, 0.2]) {
    const { r, dupa } = taiat(d, cerere(['f'], EGALE, { imbinare: ZIGZAG, ...(joc > 0 ? { intre: { fel: 'spatiu', latime: joc } as const } : {}) }));
    const p = panouri(dupa, r.ids);
    assert.deepEqual(p.map((x) => x.nume), NUME4);
    const pe = p.map((x, k) => ({ celula: CELULE_EGALE[k] as Celula, forme: x.forme }));
    assert.deepEqual(judecaPanourile({ inainte, panouri: pe, toleranta: 10 + joc / 2, joc }), [], `jocul ${joc}`);
    assert.deepEqual(judecaImbinarea({ inainte, parti: p.map((x) => x.forme), joc, dinte: { n: { x: 1, y: 0 }, v: 1200, cat: 8 } }), [], `jocul ${joc}`);
    // Dinții chiar trec peste linie: panoul 1 iese din celula lui strictă.
    assert.ok((p[0] as { readonly cutie: Celula }).cutie.maxX > 1200 + 5, 'dinții panoului 1 trec de X = 1 200');
  }
});

test('V-carve-urile care s-ar amesteca: panoul rămâne negrupat, cu numele lui pe fiecare bucată', () => {
  const V90 = { numar: 2, nume: 'V90', diametru: 20, forma: { tip: 'v' as const, unghi: 90 } };
  const baza = docDin(stoc, FIRMA, patrat('v1', 100, 100, 100, 200), patrat('v2', 200, 100, 100, 200));
  const d: Document = { ...baza, piese: baza.piese.map((p) => (p.id === 'f' ? p : { ...p, operatii: p.operatii.map((o) => ({ ...o, tip: 'vcarve' as const, latura: 'interior' as const, scula: V90, adancime: 10, pas: 10 })) })) };
  const { r, dupa } = taiat(d, cerere(['f', 'v1', 'v2'], EGALE));
  assert.equal(r.panouri, 4);
  assert.equal(r.grupuri?.length, 0);
  const p = panouri(dupa, r.ids);
  assert.deepEqual(p.map((x) => x.nume), ['Panoul 1', 'Panoul 1', 'Panoul 1', 'Panoul 2', 'Panoul 3', 'Panoul 4']);
  assert.deepEqual(r.ids.slice(1, 3), ['v1', 'v2'], 'literele, netăiate, își păstrează id-urile');
});

test('un id vechi, eliberat de o tăietură, nu ajunge pe o bucată nouă', () => {
  // Firma „e3”: X = 1 200 o face e2 și e4, iar Y = 500 ar lua întâi id-ul liber e3 (tăierea numără de la numărul pieselor).
  const d = docDin(stoc, patrat('e3', 0, 0, 2400, 1000));
  const { r } = taiat(d, cerere(['e3'], EGALE));
  assert.equal(r.ids.length, 4);
  assert.ok(!r.ids.includes('e3'), r.ids.join(', '));
});

test('fără nicio tăietură, doar grupurile: două pătrate în fiecare panou', () => {
  const d = docDin(stoc, patrat('s1', 0, 0, 100, 100), patrat('s2', 150, 0, 100, 100), patrat('s3', 1000, 0, 100, 100), patrat('s4', 1150, 0, 100, 100));
  const { r, dupa } = taiat(d, cerere(['s1', 's2', 's3', 's4'], { fel: 'numar', coloane: 2, randuri: 1 }));
  assert.equal(r.degrupate.length, 0);
  assert.equal(r.grupuri?.length, 2);
  assert.deepEqual(panouri(dupa, r.ids).map((x) => [x.nume, x.parti]), [['Panoul 1', 2], ['Panoul 2', 2]]);
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  let h: Istoric = istoricNou(d);
  let sel: readonly string[] = [];
  const ctx: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false };
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx, taiere: () => ({ doc: d, degrupate: r.degrupate, ids: r.ids, grupuri: r.grupuri ?? [] }) }), { ok: true });
  assert.equal(h.doc.foi[0]?.instante.length, 2);
});

test('document.taie: tăierea și gruparea panourilor, un singur pas de anulare; alese rămân panourile', () => {
  const d = docDin(stoc, FIRMA, patrat('a', 100, 100, 100, 200));
  const r = taieInPanouri(d, cerere(['f', 'a'], EGALE));
  if (!r.ok) return assert.fail(r.motiv);
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  let h: Istoric = istoricNou(d);
  let sel: readonly string[] = ['f', 'a'];
  const ctx: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false };
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx, taiere: () => ({ doc: d, degrupate: r.degrupate, ids: r.ids, ...(r.grupuri ? { grupuri: r.grupuri } : {}) }) }), { ok: true });
  assert.equal(h.trecut.length, 1);
  assert.deepEqual(sel, r.ids);
  assert.equal(h.doc.foi[0]?.instante.length, 4);
  assert.equal(h.doc.piese.find((p) => p.id === h.doc.foi[0]?.instante[0]?.piesa)?.nume, 'Panoul 1');
  ruleaza(R, 'istoric.anuleaza', ctx);
  assert.deepEqual({ ...h.doc, rev: d.rev }, d, 'anularea pune documentul de dinainte');
});

test('refuzurile: plafonul, nimic ales, piesa pusă de două ori, un singur panou, valorile, spațiul fără închidere, dinții prea înalți', () => {
  const d = docDin(stoc, FIRMA);
  assert.deepEqual(taieInPanouri(d, cerere(['f'], { fel: 'marime', latime: 100, inaltime: 100, colt: false })), { ok: false, motiv: 'panouri' });
  assert.deepEqual(taieInPanouri(d, cerere([], EGALE)), { ok: false, motiv: 'nimic-ales' });
  assert.deepEqual(taieInPanouri(d, cerere(['lipsa'], EGALE)), { ok: false, motiv: 'nimic-ales' });
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dublu: Document = { ...d, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'f2', piesa: 'f', x: 0, y: 1200, rotire: 0 }] }] };
  assert.deepEqual(taieInPanouri(dublu, cerere(['f'], EGALE)), { ok: false, motiv: 'impartita' });
  // O literă netăiată, cu piesa pusă și în altă parte, ar intra în grupul panoului ei (și ar lua piesa cu ea).
  const cuLitera = docDin(stoc, FIRMA, patrat('a', 100, 100, 100, 200));
  const f0 = cuLitera.foi[0];
  assert.ok(f0);
  const litereImpartite: Document = { ...cuLitera, foi: [{ ...f0, instante: [...f0.instante, { id: 'a2', piesa: 'a', x: 2600, y: 0, rotire: 0 }] }] };
  assert.deepEqual(taieInPanouri(litereImpartite, cerere(['f', 'a'], EGALE)), { ok: false, motiv: 'impartita' });
  assert.deepEqual(taieInPanouri(d, cerere(['f'], { fel: 'numar', coloane: 1, randuri: 1 })), { ok: false, motiv: 'nimic-taiat' });
  assert.deepEqual(taieInPanouri(d, cerere(['f'], { ...EGALE, latime: 0 })), { ok: false, motiv: 'valoare' });
  assert.deepEqual(taieInPanouri(d, cerere(['f'], EGALE, { inchide: false, intre: { fel: 'spatiu', latime: 1 } })), { ok: false, motiv: 'spatiu-inchide' });
  // Din colț, rândul de sus are 100 mm: dinții de 300 (± 150 față de Y = 900) ar ieși din firmă.
  assert.deepEqual(taieInPanouri(d, cerere(['f'], COLT, { imbinare: { model: 'zigzag', pas: 40, inaltime: 300, raza: 0 } })), { ok: false, motiv: 'imbinare-margine' });
});
