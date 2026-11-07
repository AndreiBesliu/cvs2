/**
 * Decuparea la ultima formă aleasă (ADR 0180 §4, §6; felia 10.3↑c), pe hârtie:
 * - zece linii paralele (y = ±5, ±15 … ±45 față de centru) decupate în cercul Ø100: capetele în x = ±√(2500 − y²) (±21,7945
 *   la y = ±45), la 1e-9;
 * - pătratul 100 × 100 decupat la cercul R30 din (100, 50): cu închidere, partea lor comună (semidiscul de 1 413,72 mm²) sau,
 *   păstrând în afară, restul (8 586,28); fără închidere, doar latura (100, 20)–(100, 80);
 * - formele care trec granița se taie, se șterg sau rămân întregi; o formă fără nimic de partea păstrată pleacă; o piesă cu
 *   un contur înăuntru și unul în afară își păstrează doar conturul dinăuntru; granița rămâne neschimbată;
 * - refuzurile: o graniță deschisă, doar granița aleasă, nimic de decupat, o piesă pusă de două ori care s-ar tăia;
 * - acțiunea `document.taie`, cu ștergerile și degruparea într-un singur pas de anulare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import type { Document, ElementNod, FormaDoc, Nod, Piesa, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { executa, istoricNou, type Comanda, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type Cutit, type RezultatTaiere } from '../../src/model/taiere.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, comenziStergere, type ContextDocument, type TaiereCalculata } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x: number, y: number, latura = 100) => forma(id, { tip: 'dreptunghi', latime: latura, inaltime: latura, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r = 50) => forma(id, { tip: 'cerc', raza: r }, x, y);

type Pastreaza = 'inauntru' | 'afara';
type Trec = 'taie' | 'sterge' | 'intregi';
const DECUPEAZA = (id: string, pastreaza: Pastreaza = 'inauntru', trec: Trec = 'taie'): Cutit => ({ fel: 'decupare', id, pastreaza, trec });
const cerere = (cutit: Cutit, alese: readonly string[], inchide = true): CerereTaiere => ({ cutit, alese, inchide });

/** Documentul de după decupare: ștergerile, apoi degruparea, într-un lot (ca acțiunea), trecut prin ușă. */
function aplica(d: Document, r: RezultatTaiere): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const comenzi: Comanda[] = [...comenziStergere(d, new Set(r.sterse)).comenzi];
  if (r.degrupate.length > 0) comenzi.push({ tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate });
  const dupa = executa(istoricNou(d), { tip: 'lot', comenzi }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const decupat = (d: Document, c: CerereTaiere): { readonly dupa: Document; readonly r: Extract<RezultatTaiere, { ok: true }> } => {
  const r = taie(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
const refuz = (d: Document, c: CerereTaiere): string => {
  const r = taie(d, c);
  return r.ok ? 'decupată' : r.motiv;
};
const contururi = (d: Document, inst: string): Contur[] => elementeFoaie(d).filter((e) => e.instanta === inst).map((e) => conturElement(e));
const unul = (d: Document, inst: string): Contur => {
  const c = contururi(d, inst);
  assert.equal(c.length, 1, `instanța ${inst} are un singur contur`);
  return c[0] as Contur;
};
const piesa = (d: Document, id: string): Piesa => d.piese.find((p) => p.id === id) ?? assert.fail(`piesa ${id}`);
const instante = (d: Document): string[] => (d.foi[0]?.instante ?? []).map((i) => i.id);
const puncte = (c: Contur): Array<[number, number]> => c.varfuri.map((v) => [v.p.x, v.p.y]);
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const arie = (c: Contur): number => Math.abs(arieCuSemn(c));

/** O piesă dintr-un grup de elemente, cu operația implicită a primului pe toate. */
function grup(d0: Document, id: string, copii: readonly Nod[]): Document {
  const p0 = d0.piese.find((p) => p.id === id) as Piesa;
  const radacina: Nod = { tip: 'grup', id, matrice: { ...ID }, copii: [...copii] };
  const op = { ...(p0.operatii[0] as Piesa['operatii'][number]), noduri: copii.map((c) => c.id) };
  return { ...d0, piese: d0.piese.map((p) => (p.id === id ? { ...p, radacina, operatii: [op] } : p)) };
}

test('zece linii paralele decupate în cercul Ø100: capetele în x = ±√(2500 − y²), la 1e-9 (±21,7945 la y = ±45)', () => {
  const dy = [-45, -35, -25, -15, -5, 5, 15, 25, 35, 45];
  const copii: Nod[] = dy.map((y, k): ElementNod => ({ tip: 'element', id: `h${k}`, forma: cale(false, [430, 500 + y], [570, 500 + y]), matrice: { ...ID } }));
  const d = grup(docDin(stoc, forma('h', cale(false, [0, 0], [1, 0])), cercF('k', 500, 500)), 'h', copii);
  const { dupa, r } = decupat(d, cerere(DECUPEAZA('k'), ['h', 'k']));
  assert.equal(r.forme, 10);
  assert.deepEqual(r.sterse, []);
  assert.equal(r.ids.length, 1, 'piesa liniilor, cu ce rămâne din ele');
  const c = contururi(dupa, r.ids[0] as string).sort((u, w) => (u.varfuri[0]?.p.y ?? 0) - (w.varfuri[0]?.p.y ?? 0));
  assert.equal(c.length, 10);
  c.forEach((x, k) => {
    const y = dy[k] as number, h = Math.sqrt(2500 - y * y);
    const xs = puncte(x).map(([px]) => px).sort((u, w) => u - w);
    assert.equal(x.varfuri.length, 2, 'o linie');
    aproape(xs[0] as number, 500 - h, 1e-9, `stânga la y = ${y}`);
    aproape(xs[1] as number, 500 + h, 1e-9, `dreapta la y = ${y}`);
  });
  aproape(Math.sqrt(2500 - 45 * 45), 21.794494717703369, 1e-12, 'pe hârtie');
  assert.deepEqual(piesa(dupa, 'k'), piesa(d, 'k'), 'granița rămâne neschimbată');
});

test('pătratul decupat la cercul R30 din (100, 50), cu închidere: semidiscul de 1 413,72 mm²; în afară, restul de 8 586,28', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('k', 100, 50, 30));
  const semidisc = (Math.PI * 900) / 2;
  const inauntru = decupat(d, cerere(DECUPEAZA('k'), ['a', 'k']));
  assert.equal(inauntru.r.ids.length, 1);
  aproape(arie(unul(inauntru.dupa, inauntru.r.ids[0] as string)), semidisc, 1e-9, 'partea comună');
  assert.deepEqual(instante(inauntru.dupa), [...inauntru.r.ids, 'k']);
  const afara = decupat(d, cerere(DECUPEAZA('k', 'afara'), ['a', 'k']));
  aproape(arie(unul(afara.dupa, afara.r.ids[0] as string)), 10000 - semidisc, 1e-9, 'restul pătratului');
  for (const x of [inauntru, afara]) assert.deepEqual(piesa(x.dupa, x.r.ids[0] as string).operatii.map((o) => [o.tip, o.latura, o.id]), [['profil', 'exterior', 'a']]);
});

test('fără închidere: din pătrat rămâne doar latura (100, 20)–(100, 80), o cale deschisă, tăiată pe partea din afară', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('k', 100, 50, 30));
  const { dupa, r } = decupat(d, cerere(DECUPEAZA('k'), ['a', 'k'], false));
  assert.deepEqual(puncte(unul(dupa, r.ids[0] as string)), [[100, 20], [100, 80]]);
  assert.deepEqual(piesa(dupa, r.ids[0] as string).operatii.map((o) => [o.tip, o.latura]), [['profil', 'dreapta']]);
});

test('formele care trec granița se șterg: pătratul pleacă, cercul mic dinăuntru rămâne, cel din afară pleacă', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('b', 110, 50, 5), cercF('c', 300, 300, 5), cercF('k', 100, 50, 30));
  const { dupa, r } = decupat(d, cerere(DECUPEAZA('k', 'inauntru', 'sterge'), ['a', 'b', 'c', 'k']));
  assert.deepEqual([...r.sterse].sort(), ['a', 'c']);
  assert.deepEqual(r.ids, []);
  assert.deepEqual(instante(dupa), ['b', 'k']);
  assert.ok(!dupa.piese.some((p) => p.id === 'a' || p.id === 'c'), 'piesele lor pleacă și ele');
});

test('formele care trec granița rămân întregi: pătratul rămâne cum e; cercul din afară tot pleacă', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('c', 300, 300, 5), cercF('k', 100, 50, 30));
  const { dupa, r } = decupat(d, cerere(DECUPEAZA('k', 'inauntru', 'intregi'), ['a', 'c', 'k']));
  assert.deepEqual(r.sterse, ['c']);
  assert.deepEqual(r.degrupate, []);
  assert.deepEqual(instante(dupa), ['a', 'k']);
  assert.deepEqual(piesa(dupa, 'a'), piesa(d, 'a'));
});

test('o piesă cu un pătrat înăuntru și unul în afară: decupată, își păstrează doar pătratul dinăuntru, cu id-ul lui; ștearsă sau întreagă, după alegere', () => {
  const copii: Nod[] = [
    { tip: 'element', id: 'p', forma: { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: 490, f: 490 } },
    { tip: 'element', id: 'q', forma: { tip: 'dreptunghi', latime: 20, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: 700, f: 490 } },
  ];
  const d = grup(docDin(stoc, forma('g', cale(false, [0, 0], [1, 0])), cercF('k', 500, 500)), 'g', copii);
  const { dupa, r } = decupat(d, cerere(DECUPEAZA('k'), ['g', 'k']));
  assert.equal(r.forme, 0, 'niciun contur tăiat');
  assert.equal(r.ids.length, 1);
  const rad = piesa(dupa, r.ids[0] as string).radacina as ElementNod;
  assert.equal(rad.tip, 'element');
  assert.equal(rad.id, 'p');
  assert.deepEqual(piesa(dupa, r.ids[0] as string).operatii.map((o) => o.noduri), [['p']]);
  assert.deepEqual(decupat(d, cerere(DECUPEAZA('k', 'inauntru', 'sterge'), ['g', 'k'])).r.sterse, ['g']);
  assert.equal(refuz(d, cerere(DECUPEAZA('k', 'inauntru', 'intregi'), ['g', 'k'])), 'nimic-taiat');
});

test('refuzurile decupării: o graniță deschisă, doar granița aleasă, nimic de decupat, o piesă pusă de două ori care s-ar tăia', () => {
  const deschisa = docDin(stoc, patrat('a', 0, 0), forma('k', cale(false, [-10, 50], [110, 50])));
  assert.equal(refuz(deschisa, cerere(DECUPEAZA('k'), ['a', 'k'])), 'granita');
  const d = docDin(stoc, patrat('a', 0, 0), cercF('b', 500, 500, 5), cercF('k', 100, 50, 30));
  assert.equal(refuz(d, cerere(DECUPEAZA('k'), ['k'])), 'nimic-ales');
  assert.equal(refuz(d, cerere(DECUPEAZA('k', 'afara'), ['b', 'k'])), 'nimic-taiat', 'cercul e deja în afară');
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dublu: Document = { ...d, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'a2', piesa: 'a', x: 0, y: 500, rotire: 0 }] }] };
  assert.equal(refuz(dublu, cerere(DECUPEAZA('k'), ['a', 'k'])), 'impartita');
  // Ștergerea unei instanțe a unei piese puse de două ori e voie: cealaltă instanță rămâne, cu piesa ei.
  const { dupa, r } = decupat(dublu, cerere(DECUPEAZA('k', 'inauntru', 'sterge'), ['a', 'k']));
  assert.deepEqual(r.sterse, ['a']);
  assert.deepEqual(instante(dupa), ['b', 'k', 'a2']);
  assert.ok(dupa.piese.some((p) => p.id === 'a'));
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
function context(d: Document, selectie: readonly string[]): ContextDocument & { readonly h: () => Istoric; readonly s: () => readonly string[] } {
  let h = istoricNou(d);
  let sel: readonly string[] = selectie;
  return { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false, h: () => h, s: () => sel };
}

test('document.taie, cu ștergeri: ștergerile și degruparea într-un singur pas de anulare; anularea pune documentul exact', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('c', 300, 300, 5), cercF('k', 100, 50, 30));
  const r = taie(d, cerere(DECUPEAZA('k'), ['a', 'c', 'k']));
  if (!r.ok) assert.fail(r.motiv);
  assert.deepEqual(r.sterse, ['c']);
  const t: TaiereCalculata = { doc: d, degrupate: r.degrupate, ids: r.ids, sterse: r.sterse };
  const ctx = context(d, ['a', 'c', 'k']);
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx, taiere: () => t }), { ok: true });
  assert.equal(ctx.h().trecut.length, 1, 'un singur pas');
  assert.deepEqual(instante(ctx.h().doc), [...r.ids, 'k']);
  assert.deepEqual(ctx.s(), r.ids);
  ruleaza(R, 'istoric.anuleaza', ctx);
  assert.deepEqual({ ...ctx.h().doc, rev: d.rev }, d, 'anularea pune documentul de dinainte (doar revizia crește)');
  ruleaza(R, 'istoric.reface', ctx);
  assert.deepEqual(instante(ctx.h().doc), [...r.ids, 'k']);
  // Doar ștergeri, fără nicio parte nouă: tot un pas, fără nimic ales după.
  const s2 = taie(d, cerere(DECUPEAZA('k', 'inauntru', 'sterge'), ['a', 'c', 'k']));
  if (!s2.ok) assert.fail(s2.motiv);
  const ctx2 = context(d, ['a', 'c', 'k']);
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx2, taiere: () => ({ doc: d, degrupate: s2.degrupate, ids: s2.ids, sterse: s2.sterse }) }), { ok: true });
  assert.deepEqual(instante(ctx2.h().doc), ['k']);
  assert.deepEqual(ctx2.s(), []);
});
