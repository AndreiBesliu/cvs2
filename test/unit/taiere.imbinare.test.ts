/**
 * Tăierea cu îmbinare (ADR 0181 §6; felia 10.3↑j), pe hârtie:
 * - **zigzagul pe pătratul 100 × 100 la X = 50** (pasul 20, înălțimea 10): patru dinți, câte 10 mm drepți la capete, bucățile de
 *   câte 5 000 mm², cu vârfurile drumului (45, 15), (55, 25) … (55, 85) în amândouă (lipite exact: ariile fac 10 000), cutiile de
 *   55 × 100; cu raza 3, tot 5 000 și 5 000, fără vârfuri ascuțite; cu jocul 0,2 (spațiul), la 0,2 una de alta peste tot; cu
 *   suprapunerea 0,4, mai mari decât jumătățile, egale;
 * - **fiecare model**, cu pasul, înălțimea și raza lui: 5 000 și 5 000 (drumul e simetric față de mijlocul coardei); valul de
 *   înălțime 20 ajunge la x = 60;
 * - **linia la 30° prin (20, 50)**, cu zigzag: aceleași arii ca tăietura dreaptă (5 000 ± 3 000 / √3);
 * - **o coardă prea scurtă rămâne dreaptă:** pătrățelul de 10 × 10 al aceleiași piese, tăiat drept (50 + 50);
 * - **cuțitul tras (Linie):** două fețe; cel oprit înăuntru, cu „Prelungește”, la fel;
 * - **„Păstrează” stânga:** doar partea A (5 000);
 * - **refuzurile:** niciun dinte întreg (pasul 60: `imbinare`); raza care nu încape (`imbinare-raza`); dinții care ar atinge o
 *   gaură (`imbinare-margine`; mai departe, nu); cuțitul care nu e o dreaptă (`imbinare-dreapta`: felul Formă, chiar și cu o
 *   linie dreaptă aleasă ultima, o cale frântă, mâna liberă); fără închidere (`imbinare-inchide`); valorile greșite (`valoare`);
 * - **cu suprapunerea, o insulă a piesei în fâșie** (pătrățelul 1 × 1 din (51, 150), lângă linia X = 50): o singură dată, la
 *   linia din panou, care grupează pe laturi; partea A (stânga) întâi, cu joc sau fără;
 * - **cuțitul tras din gaura unui inel** (200 × 100, cu gaura 20 × 20 în mijloc), spre dreapta: dinți doar pe coarda pe care o
 *   trece (110 … 200), nu și pe cea din spatele lui; inelul, deschis, rămâne o formă, de 19 600 mm².
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';
import type { Document, FormaDoc, Nod, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import type { Imbinare } from '../../src/model/imbinare.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type Cutit, type RezultatTaiere } from '../../src/model/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const caleDoc = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaCale =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x = 0, y = 0, w = 100, h = 100) => forma(id, { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 }, x, y);
const im = (model: Imbinare['model'], pas: number, inaltime: number, raza: number): Imbinare => ({ model, pas, inaltime, raza });
const ZIGZAG = im('zigzag', 20, 10, 0);
const cerere = (cutit: Cutit, alese: readonly string[], o: Partial<CerereTaiere> = {}): CerereTaiere => ({ cutit, alese, inchide: true, ...o });
const X50: Cutit = { fel: 'x', x: 50 };

function aplica(d: Document, r: Extract<RezultatTaiere, { ok: true }>): Document {
  const foaie = d.foi[0];
  assert.ok(foaie);
  let dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  if (r.sterse.length > 0) {
    const sterse = new Set(r.sterse);
    dupa = { ...dupa, foi: dupa.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => !sterse.has(i.id)) })) };
  }
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const taiat = (d: Document, c: CerereTaiere): { readonly dupa: Document; readonly r: Extract<RezultatTaiere, { ok: true }> } => {
  const r = taie(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
const refuz = (d: Document, c: CerereTaiere): string => {
  const r = taie(d, c);
  return r.ok ? `tăiată în ${r.ids.length}` : r.motiv;
};
const contururi = (d: Document, inst: string): Contur[] => elementeFoaie(d).filter((e) => e.instanta === inst).map((e) => conturElement(e));

/** Conturul ca poligon des (arcele prin 256 de coarde). */
function poligon(c: Contur): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const n = c.varfuri.length, m = c.inchis ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const a = c.varfuri[k] as Contur['varfuri'][number], b = c.varfuri[(k + 1) % n] as Contur['varfuri'][number];
    out.push({ x: a.p.x, y: a.p.y });
    if (a.s.tip === 'A' && Math.abs(a.s.bulge) > 1e-12) {
      const u = 4 * Math.atan(a.s.bulge), coarda = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y), r = coarda / (2 * Math.sin(Math.abs(u) / 2));
      const mx = (a.p.x + b.p.x) / 2, my = (a.p.y + b.p.y) / 2, h = r * Math.cos(Math.abs(u) / 2) * Math.sign(a.s.bulge);
      const cx = mx - ((b.p.y - a.p.y) / coarda) * h, cy = my + ((b.p.x - a.p.x) / coarda) * h;
      const u0 = Math.atan2(a.p.y - cy, a.p.x - cx);
      for (let i = 1; i < 256; i++) out.push({ x: cx + r * Math.cos(u0 + (u * i) / 256), y: cy + r * Math.sin(u0 + (u * i) / 256) });
    }
  }
  if (!c.inchis) { const z = c.varfuri[n - 1]; if (z) out.push({ x: z.p.x, y: z.p.y }); }
  return out;
}
function contine(x: Contur, c: Contur): boolean {
  const q = c.varfuri[0]?.p;
  if (!q) return false;
  const p = poligon(x);
  let in_ = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i] as { x: number; y: number }, b = p[j] as { x: number; y: number };
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
  }
  return in_;
}
function ariePar(d: Document, inst: string): number {
  const cs = contururi(d, inst).filter((c) => c.inchis);
  return cs.reduce((s, c) => s + Math.abs(arieCuSemn(c)) * (cs.filter((x) => x !== c && contine(x, c)).length % 2 === 0 ? 1 : -1), 0);
}
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const areVarf = (cs: readonly Contur[], x: number, y: number, tol = 1e-9): boolean => cs.some((c) => c.varfuri.some((v) => Math.hypot(v.p.x - x, v.p.y - y) <= tol));
const arii = (t: ReturnType<typeof taiat>): number[] => t.r.ids.map((id) => ariePar(t.dupa, id));
/** Cutia punctelor (dese) ale contururilor unei instanțe. */
function cutie(d: Document, inst: string): { minX: number; maxX: number; minY: number; maxY: number } {
  const p = contururi(d, inst).flatMap((c) => poligon(c));
  return { minX: Math.min(...p.map((q) => q.x)), maxX: Math.max(...p.map((q) => q.x)), minY: Math.min(...p.map((q) => q.y)), maxY: Math.max(...p.map((q) => q.y)) };
}
/** Cea mai mică distanță de la punctele (dese) ale instanței a la contururile instanței b. */
function departare(d: Document, a: string, b: string): number {
  const cb = contururi(d, b);
  return Math.min(...contururi(d, a).flatMap((c) => poligon(c)).map((q) => Math.min(...cb.map((c) => distantaLaContur(q, c)))));
}
function cuGrup(d: Document, id: string, x: number, y: number, copii: ReadonlyArray<{ readonly f: FormaDoc; readonly x: number; readonly y: number }>): Document {
  const radacina: Nod = {
    tip: 'grup', id, matrice: { ...ID },
    copii: copii.map((c, k): Nod => ({ tip: 'element', id: `${id}-${k}`, forma: c.f, matrice: { ...ID, e: c.x, f: c.y } })),
  };
  const foaie = d.foi[0];
  assert.ok(foaie);
  return { ...d, piese: [...d.piese, { id, radacina, operatii: [] }], foi: [{ ...foaie, instante: [...foaie.instante, { id, piesa: id, x, y, rotire: 0 }] }] };
}

test('zigzagul pe pătrat la X = 50 (pasul 20, înălțimea 10): două forme de 5 000, lipite exact pe drumul (45, 15), (55, 25) …, cutiile 55 × 100', () => {
  const d = docDin(stoc, patrat('a'));
  const t = taiat(d, cerere(X50, ['a'], { imbinare: ZIGZAG }));
  assert.equal(t.r.ids.length, 2);
  const [a, b] = t.r.ids as [string, string];
  const [ia, ib] = arii(t) as [number, number];
  aproape(ia, 5000, 1e-9, 'partea A');
  aproape(ib, 5000, 1e-9, 'partea B');
  // Vârfurile drumului, în amândouă: dinții lui A ajung la x = 55, ai lui B la x = 45.
  for (const [x, y] of [[50, 10], [45, 15], [55, 25], [45, 35], [55, 45], [45, 55], [55, 65], [45, 75], [55, 85], [50, 90]] as const) {
    assert.ok(areVarf(contururi(t.dupa, a), x, y) && areVarf(contururi(t.dupa, b), x, y), `(${x}, ${y}) în ambele`);
  }
  const ka = cutie(t.dupa, a), kb = cutie(t.dupa, b);
  aproape(ka.maxX - ka.minX, 55, 1e-9, 'lățimea lui A');
  aproape(kb.maxX - kb.minX, 55, 1e-9, 'lățimea lui B');
});

test('zigzagul cu raza 3: tot 5 000 și 5 000, colțurile rotunjite (vârful din (45, 15) nu mai e)', () => {
  const d = docDin(stoc, patrat('a'));
  const t = taiat(d, cerere(X50, ['a'], { imbinare: im('zigzag', 20, 10, 3) }));
  const [ia, ib] = arii(t) as [number, number];
  aproape(ia, 5000, 1e-9, 'A');
  aproape(ib, 5000, 1e-9, 'B');
  assert.ok(!t.r.ids.some((id) => areVarf(contururi(t.dupa, id), 45, 15, 1e-6)), 'niciun vârf ascuțit');
  // Dinții rotunjiți ajung la 5 − 3(√2 − 1) de linie.
  aproape(cutie(t.dupa, t.r.ids[0] as string).maxX, 55 - 3 * (Math.SQRT2 - 1), 1e-3, 'vârful dintelui lui A');
});

test('cu jocul 0,2 (spațiul), bucățile stau la 0,2 una de alta peste tot; cu suprapunerea 0,4, se suprapun, egale', () => {
  const d = docDin(stoc, patrat('a'));
  // Partea A (cea din stânga liniei, x mai mic) vine întâi, cu joc sau fără.
  const stangaIntai = (t: ReturnType<typeof taiat>): boolean => cutie(t.dupa, t.r.ids[0] ?? '').minX < 25;
  assert.ok(stangaIntai(taiat(d, cerere(X50, ['a'], { imbinare: im('zigzag', 20, 10, 3) }))), 'fără joc, A întâi');
  const sp = taiat(d, cerere(X50, ['a'], { imbinare: im('zigzag', 20, 10, 3), intre: { fel: 'spatiu', latime: 0.2 } }));
  assert.ok(stangaIntai(sp), 'cu spațiul, A întâi');
  const [a, b] = sp.r.ids as [string, string];
  aproape(departare(sp.dupa, a, b), 0.2, 1e-6, 'între bucăți');
  const [ia, ib] = arii(sp) as [number, number];
  aproape(ia, ib, 1e-9, 'aceeași arie');
  assert.ok(ia < 5000, 'fiecare pierde jumătate din joc');
  const su = taiat(d, cerere(X50, ['a'], { imbinare: im('zigzag', 20, 10, 3), intre: { fel: 'suprapunere', latime: 0.4 } }));
  assert.ok(stangaIntai(su), 'cu suprapunerea, A întâi');
  const [ja, jb] = arii(su) as [number, number];
  aproape(ja, jb, 1e-9, 'aceeași arie');
  assert.ok(ja > 5000, 'fiecare trece de drum');
});

test('fiecare model, cu pasul, înălțimea și raza lui: 5 000 și 5 000; valul de înălțime 20 ajunge la x = 60', () => {
  const d = docDin(stoc, patrat('a'));
  for (const i of [im('val', 40, 20, 3), im('dinti', 20, 10, 2), im('coada', 40, 20, 3), im('puzzle', 40, 24, 3), im('zigzag', 40, 20, 3)]) {
    const t = taiat(d, cerere(X50, ['a'], { imbinare: i }));
    const [ia, ib] = arii(t) as [number, number];
    aproape(ia, 5000, 1e-6, `${i.model}: A`);
    aproape(ib, 5000, 1e-6, `${i.model}: B`);
    if (i.model === 'val') aproape(cutie(t.dupa, t.r.ids[0] as string).maxX, 60, 1e-6, 'valul');
  }
});

test('linia la 30° prin (20, 50), cu zigzag: aceleași arii ca tăietura dreaptă (5 000 ± 3 000 / √3)', () => {
  const d = docDin(stoc, patrat('a'));
  const t = taiat(d, cerere({ fel: 'unghi', x: 20, y: 50, unghi: 30 }, ['a'], { imbinare: im('zigzag', 20, 10, 3) }));
  const [ia, ib] = arii(t) as [number, number];
  aproape(ia, 5000 + 3000 / Math.sqrt(3), 1e-6, 'A, dedesubt');
  aproape(ib, 5000 - 3000 / Math.sqrt(3), 1e-6, 'B, deasupra');
});

test('o coardă prea scurtă rămâne dreaptă: pătrățelul de 10 × 10 al aceleiași piese se taie drept, pătratul cu dinți', () => {
  const d = cuGrup(docDin(stoc), 'p', 0, 0, [{ f: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, x: 0, y: 0 }, { f: { tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 }, x: 45, y: 150 }]);
  const t = taiat(d, cerere(X50, ['p'], { imbinare: ZIGZAG }));
  assert.equal(t.r.ids.length, 2);
  for (const id of t.r.ids) {
    aproape(ariePar(t.dupa, id), 5050, 1e-9, 'jumătatea pătratului și jumătatea pătrățelului');
    assert.ok(areVarf(contururi(t.dupa, id), 50, 150) && areVarf(contururi(t.dupa, id), 50, 160), 'pătrățelul, tăiat drept');
  }
});

test('cuțitul tras (Linie) cu îmbinare: două fețe; cel oprit înăuntru, cu „Prelungește”, la fel; „Păstrează” stânga, doar A', () => {
  const d = docDin(stoc, patrat('a'));
  const k = (y0: number, y1: number): Cutit => ({ fel: 'cale', cale: caleDoc(false, [50, y0], [50, y1]) });
  for (const o of [{ c: k(-10, 110), p: {} }, { c: k(20, 80), p: { prelungeste: 'forma' as const } }]) {
    const t = taiat(d, cerere(o.c, ['a'], { imbinare: ZIGZAG, ...o.p }));
    assert.equal(t.r.ids.length, 2);
    for (const a of arii(t)) aproape(a, 5000, 1e-9, 'o față');
    assert.ok(t.r.ids.every((id) => areVarf(contururi(t.dupa, id), 55, 25)), 'cu dinți');
  }
  const st = taiat(d, cerere(X50, ['a'], { imbinare: ZIGZAG, pastreaza: 'stanga' }));
  assert.equal(st.r.ids.length, 1);
  aproape(ariePar(st.dupa, st.r.ids[0] as string), 5000, 1e-9, 'stânga');
  assert.ok(areVarf(contururi(st.dupa, st.r.ids[0] as string), 55, 25), 'cu dinții ei');
});

test('refuzurile: niciun dinte întreg; raza care nu încape; dinții care ar atinge o gaură; cuțitul care nu e o dreaptă; fără închidere; valorile', () => {
  const d = docDin(stoc, patrat('a'), forma('k', { tip: 'cerc', raza: 20 }, 50, 50));
  assert.equal(refuz(d, cerere(X50, ['a'], { imbinare: im('zigzag', 60, 10, 0) })), 'imbinare');
  assert.equal(refuz(d, cerere(X50, ['a'], { imbinare: im('dinti', 20, 10, 3) })), 'imbinare-raza');
  assert.equal(refuz(d, cerere(X50, ['a'], { imbinare: im('val', 20, 10, 3) })), 'imbinare-raza');
  assert.equal(refuz(d, cerere(X50, ['a'], { imbinare: im('puzzle', 20, 10, 3) })), 'imbinare-raza');
  // Gaura R6 din (57, 50) nu e trecută de linie, dar dinții ar atinge-o; mai departe, în (75, 50), nu.
  const cuGaura = (cx: number): Document => cuGrup(docDin(stoc), 'p', 0, 0, [{ f: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, x: 0, y: 0 }, { f: { tip: 'cerc', raza: 6 }, x: cx, y: 50 }]);
  assert.equal(refuz(cuGaura(57), cerere(X50, ['p'], { imbinare: im('zigzag', 20, 10, 3) })), 'imbinare-margine');
  assert.equal(refuz(cuGaura(75), cerere(X50, ['p'], { imbinare: im('zigzag', 20, 10, 3) })), 'tăiată în 2');
  assert.equal(refuz(d, cerere({ fel: 'forma', id: 'k' }, ['a'], { imbinare: ZIGZAG })), 'imbinare-dreapta');
  // Și un cuțit-formă drept (o linie aleasă ultima): îmbinarea e a liniilor din panou și a Cuțitului, nu a formelor.
  const cuLinie = docDin(stoc, patrat('a'), forma('l', caleDoc(false, [50, -10], [50, 110])));
  assert.equal(refuz(cuLinie, cerere({ fel: 'forma', id: 'l' }, ['a'], { imbinare: ZIGZAG })), 'imbinare-dreapta');
  assert.equal(refuz(d, cerere({ fel: 'cale', cale: caleDoc(false, [50, -10], [50, 50], [60, 110]) }, ['a'], { imbinare: ZIGZAG })), 'imbinare-dreapta');
  // Un arc între două puncte: capetele stau pe o dreaptă, dar tăietura e curbă.
  const arc: FormaCale = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 50, y: -10 }, s: { tip: 'A', bulge: 0.1 } }, { p: { x: 50, y: 110 }, s: L }] };
  assert.equal(refuz(d, cerere({ fel: 'cale', cale: arc }, ['a'], { imbinare: ZIGZAG })), 'imbinare-dreapta');
  assert.equal(refuz(d, cerere({ fel: 'cale', cale: caleDoc(false, [50, -10], [50, 110]), netezire: 0.1 }, ['a'], { imbinare: ZIGZAG })), 'imbinare-dreapta');
  assert.equal(refuz(d, cerere(X50, ['a'], { imbinare: ZIGZAG, inchide: false })), 'imbinare-inchide');
  for (const i of [im('zigzag', 0, 10, 0), im('zigzag', 20, Number.NaN, 0), im('zigzag', 20, 10, -1)]) {
    assert.equal(refuz(d, cerere(X50, ['a'], { imbinare: i })), 'valoare', JSON.stringify(i));
  }
});

test('cuțitul tras din gaura unui inel: dinți doar pe coarda pe care o trece, nu și pe cea din spatele lui; inelul, deschis, rămâne o formă', () => {
  const d = cuGrup(docDin(stoc), 'p', 0, 0, [{ f: { tip: 'dreptunghi', latime: 200, inaltime: 100, razaColt: 0 }, x: 0, y: 0 }, { f: { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 }, x: 90, y: 40 }]);
  const t = taiat(d, cerere({ fel: 'cale', cale: caleDoc(false, [100, 50], [250, 50]) }, ['p'], { imbinare: ZIGZAG }));
  assert.equal(t.r.ids.length, 1, 'inelul, deschis');
  const [id] = t.r.ids;
  assert.ok(id);
  aproape(ariePar(t.dupa, id), 19600, 1e-6, 'aria inelului');
  const cs = contururi(t.dupa, id);
  // Coarda din dreapta (110 … 200, trei dinți, câte 15 drepți la capete): primul vârf de sus în (130, 55).
  assert.ok(areVarf(cs, 130, 55), 'dinții pe coarda trecută');
  // Coarda din stânga (0 … 90), în spatele cuțitului: dreaptă, fără dinți (ar fi avut primul vârf în (20, 55)).
  assert.ok(!areVarf(cs, 20, 55, 1e-6), 'fără dinți în spatele cuțitului');
});

test('cu suprapunerea, o insulă a piesei în fâșie rămâne o singură dată (linia din panou grupează pe laturi)', () => {
  const d = cuGrup(docDin(stoc), 'p', 0, 0, [{ f: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, x: 0, y: 0 }, { f: { tip: 'dreptunghi', latime: 1, inaltime: 1, razaColt: 0 }, x: 51, y: 150 }]);
  const t = taiat(d, cerere(X50, ['p'], { imbinare: ZIGZAG, intre: { fel: 'suprapunere', latime: 6 } }));
  assert.equal(t.r.ids.length, 2, 'o parte de fiecare latură');
  const unu = t.r.ids.flatMap((id) => contururi(t.dupa, id).map((c) => Math.abs(arieCuSemn(c)))).filter((a) => Math.abs(a - 1) < 1e-9);
  assert.equal(unu.length, 1, 'pătrățelul, o dată');
});
