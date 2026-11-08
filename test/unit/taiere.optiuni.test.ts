/**
 * Opțiunile tăierii (ADR 0181 §2, §3; felia 10.3↑h), pe hârtie:
 * - **linia la orice unghi:** pătratul 100 × 100 tăiat de linia prin (20, 50) la 30°: tăieturile în (0; 50 − 20/√3) și
 *   (100; 50 + 80/√3), adică (0; 38,453) și (100; 96,188), bucățile de 6 732,051 mm² (dedesubt, partea A) și 3 267,949
 *   (deasupra, B); la 90°, linia x = 50, la bit ca X = 50;
 * - **Păstrează:** X = 30, stânga: 30 × 100 (3 000 mm²), dreapta: 7 000; Y = 20, stânga (deasupra): 8 000; la 30°, stânga:
 *   3 267,949; o formă netăiată rămâne; fără închidere, calea din stânga a lui X = 30 (160 mm); cuțitul închis (pătratul de la
 *   (−20, −20) la (40, 40)): înăuntru 1 600, în afară 8 400; cuțitul tras de la (−10, 20) la (110, 60): stânga 6 000
 *   (deasupra), dreapta 4 000; tras invers, stânga e dedesubt; fără închidere, calea de deasupra (220 mm); un „O” pus pe placă
 *   (felul Formă): stânga (înăuntru), litera (942,478); dreapta, placa cu golul (5 057,522);
 * - **Prelungește capetele:** cuțitul de la (−10, 50) la (80, 50), cu închidere: fără prelungire se refuză (`nu-trece`); până
 *   ies din formă, două bucăți de 5 000; la fel cu ambele capete înăuntru; cu un sfert de cerc la capăt (de la (30, 20) la
 *   (50, 40), centrul (30, 40)), pe tangenta lui, în sus, până la latura de sus: 3 800 + 100π − 200 = 3 914,159 și 6 085,841;
 *   două pătrate lipite: trece prin amândouă; unul departe rămâne, iar cu „linia întreagă” se taie și el; diagonala de la
 *   (40, 40) la (60, 60), întreagă: două triunghiuri de 5 000;
 * - **cuțitul-formă șters:** în aceeași tăiere (`sterse`), din panou și cu felul Formă; fără nimic tăiat, refuzul, iar cuțitul
 *   rămâne.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import type { Document, FormaDoc, Nod, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
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
const cercF = (id: string, x: number, y: number, r: number) => forma(id, { tip: 'cerc', raza: r }, x, y);
const cerere = (cutit: Cutit, alese: readonly string[], o: Partial<CerereTaiere> = {}): CerereTaiere => ({ cutit, alese, inchide: true, ...o });

/** Documentul după tăiere (degruparea și ștergerile, ca acțiunea `document.taie`), trecut prin ușă. */
function aplica(d: Document, r: RezultatTaiere): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
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
/** Conține conturul `x` primul vârf al lui `c`? (par-impar, pe poligonul des.) */
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
/** Aria regiunii par-impar a unei instanțe (contururile ei închise, cu semn după adâncime; arcele, exact). */
function ariePar(d: Document, inst: string): number {
  const cs = contururi(d, inst).filter((c) => c.inchis);
  return cs.reduce((s, c) => s + Math.abs(arieCuSemn(c)) * (cs.filter((x) => x !== c && contine(x, c)).length % 2 === 0 ? 1 : -1), 0);
}
/** Lungimea contururilor deschise ale unei instanțe (doar laturi drepte). */
function lungime(d: Document, inst: string): number {
  return contururi(d, inst).reduce((s, c) => {
    const p = poligon(c);
    let l = 0;
    for (let i = 1; i < p.length; i++) l += Math.hypot((p[i] as { x: number }).x - (p[i - 1] as { x: number }).x, (p[i] as { y: number }).y - (p[i - 1] as { y: number }).y);
    return s + l;
  }, 0);
}
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const areVarf = (c: Contur, x: number, y: number, tol = 1e-9): boolean => c.varfuri.some((v) => Math.hypot(v.p.x - x, v.p.y - y) <= tol);
const arii = (d: Document, ids: readonly string[]): number[] => ids.map((id) => ariePar(d, id)).sort((a, b) => a - b);

/** Inelul R20 / R10 (un „O”), centrat în (cx, cy): o piesă cu un grup de două cercuri, ca literele unui text. */
function cuLitera(d: Document, id: string, cx: number, cy: number): Document {
  const radacina: Nod = {
    tip: 'grup', id, matrice: { ...ID }, copii: [
      { tip: 'element', id: `${id}-o`, forma: { tip: 'cerc', raza: 20 }, matrice: { ...ID } },
      { tip: 'element', id: `${id}-g`, forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID } },
    ],
  };
  const foaie = d.foi[0];
  assert.ok(foaie);
  return {
    ...d,
    piese: [...d.piese, { id, radacina, operatii: [] }],
    foi: [{ ...foaie, instante: [...foaie.instante, { id, piesa: id, x: cx, y: cy, rotire: 0 }] }],
  };
}
const linieCale = (x0: number, y0: number, x1: number, y1: number): Cutit => ({ fel: 'cale', cale: caleDoc(false, [x0, y0], [x1, y1]) });

// ——— Linia la orice unghi (§3) ———

test('linia prin (20, 50) la 30°: tăieturile în (0; 38,453) și (100; 96,188), bucățile de 6 732,051 (A, dedesubt) și 3 267,949 mm²', () => {
  const d = docDin(stoc, patrat('a'));
  const { dupa, r } = taiat(d, cerere({ fel: 'unghi', x: 20, y: 50, unghi: 30 }, ['a']));
  assert.equal(r.ids.length, 2);
  const [a, b] = r.ids as [string, string];
  // Trapezul de dedesubt: (y0 + y1) / 2 · 100 = 5 000 + 3 000/√3.
  aproape(ariePar(dupa, a), 5000 + 3000 / Math.sqrt(3), 1e-6, 'partea A, dedesubt');
  aproape(ariePar(dupa, b), 5000 - 3000 / Math.sqrt(3), 1e-6, 'partea B, deasupra');
  const y0 = 50 - 20 / Math.sqrt(3), y1 = 50 + 80 / Math.sqrt(3);
  for (const id of [a, b]) {
    const [c] = contururi(dupa, id);
    assert.ok(c && areVarf(c, 0, y0, 1e-9) && areVarf(c, 100, y1, 1e-9), `tăieturile pe ${id}`);
  }
});

test('linia la 90° prin (50, 0) e verticala x = 50: aceleași bucăți ca X = 50, la bit', () => {
  const d = docDin(stoc, patrat('a'), cercF('c', 50, 150, 30));
  const pe90 = taiat(d, cerere({ fel: 'unghi', x: 50, y: 0, unghi: 90 }, ['a', 'c']));
  const peX = taiat(d, cerere({ fel: 'x', x: 50 }, ['a', 'c']));
  // La 90°, normala e (−1, 0): părțile vin în ordinea inversă (B e stânga, x mai mic); contururile sunt aceleași, la bit.
  const geometrie = (t: typeof pe90): string[] => t.r.ids.map((id) => JSON.stringify(contururi(t.dupa, id).map((c) => [c.inchis, c.varfuri]))).sort();
  assert.equal(pe90.r.ids.length, 4);
  assert.deepEqual(geometrie(pe90), geometrie(peX));
});

test('linia la orice unghi: o valoare care nu e număr se refuză (`valoare`)', () => {
  const d = docDin(stoc, patrat('a'));
  for (const c of [{ fel: 'unghi', x: Number.NaN, y: 0, unghi: 30 }, { fel: 'unghi', x: 0, y: 0, unghi: Infinity }] as const) {
    const r = taie(d, cerere(c, ['a']));
    assert.deepEqual(r, { ok: false, motiv: 'valoare' });
  }
});

// ——— Păstrează (§2) ———

test('Păstrează, cu linia: X = 30 stânga 3 000 și dreapta 7 000; Y = 20 stânga (deasupra) 8 000; la 30°, stânga 3 267,949', () => {
  const d = docDin(stoc, patrat('a'));
  const caz = (c: Cutit, p: 'stanga' | 'dreapta', asteptat: number): void => {
    const { dupa, r } = taiat(d, cerere(c, ['a'], { pastreaza: p }));
    assert.equal(r.ids.length, 1, `${c.fel} ${p}: o singură parte`);
    assert.deepEqual(r.sterse, []);
    aproape(ariePar(dupa, r.ids[0] as string), asteptat, 1e-6, `${c.fel} ${p}`);
  };
  caz({ fel: 'x', x: 30 }, 'stanga', 3000);
  caz({ fel: 'x', x: 30 }, 'dreapta', 7000);
  caz({ fel: 'y', y: 20 }, 'stanga', 8000);
  caz({ fel: 'y', y: 20 }, 'dreapta', 2000);
  caz({ fel: 'unghi', x: 20, y: 50, unghi: 30 }, 'stanga', 3267.949192431123);
  caz({ fel: 'unghi', x: 20, y: 50, unghi: 30 }, 'dreapta', 6732.050807568878);
  // La 210°, linia e aceeași, cu sensul întors: stânga e dedesubt.
  caz({ fel: 'unghi', x: 20, y: 50, unghi: 210 }, 'stanga', 6732.050807568878);
});

test('Păstrează: o formă pe care linia n-o atinge rămâne, chiar de partea ștearsă; fără închidere, calea din stânga (160 mm)', () => {
  const d = docDin(stoc, patrat('a'), patrat('b', 200, 0));
  const { dupa, r } = taiat(d, cerere({ fel: 'x', x: 30 }, ['a', 'b'], { pastreaza: 'stanga' }));
  assert.equal(r.degrupate.length, 1);
  assert.deepEqual(r.sterse, []);
  assert.ok(dupa.foi[0]?.instante.some((i) => i.id === 'b'), 'pătratul din dreapta, netăiat, rămâne');
  const fara = taiat(d, cerere({ fel: 'x', x: 30 }, ['a'], { pastreaza: 'stanga', inchide: false }));
  assert.equal(fara.r.ids.length, 1);
  aproape(lungime(fara.dupa, fara.r.ids[0] as string), 160, 1e-9, 'calea din stânga');
});

test('Păstrează, cu cuțitul închis (pătratul de la (−20, −20) la (40, 40)): stânga e înăuntru (1 600), dreapta în afară (8 400)', () => {
  const d = docDin(stoc, patrat('a'));
  const k: Cutit = { fel: 'cale', cale: caleDoc(true, [-20, -20], [40, -20], [40, 40], [-20, 40]) };
  for (const [p, asteptat] of [['stanga', 1600], ['dreapta', 8400]] as const) {
    const { dupa, r } = taiat(d, cerere(k, ['a'], { pastreaza: p }));
    assert.equal(r.ids.length, 1);
    aproape(ariePar(dupa, r.ids[0] as string), asteptat, 1e-6, p);
  }
  // Același cuțit, tras în sensul acelor de ceasornic: tot înăuntru.
  const invers: Cutit = { fel: 'cale', cale: caleDoc(true, [-20, -20], [-20, 40], [40, 40], [40, -20]) };
  const { dupa, r } = taiat(d, cerere(invers, ['a'], { pastreaza: 'stanga' }));
  aproape(ariePar(dupa, r.ids[0] as string), 1600, 1e-6, 'înăuntru, tras invers');
});

test('Păstrează, cu cuțitul deschis de la (−10, 20) la (110, 60): stânga 6 000 (deasupra), dreapta 4 000; tras invers, stânga e dedesubt', () => {
  const d = docDin(stoc, patrat('a'));
  const caz = (c: Cutit, p: 'stanga' | 'dreapta', asteptat: number): void => {
    const { dupa, r } = taiat(d, cerere(c, ['a'], { pastreaza: p }));
    assert.equal(r.ids.length, 1, p);
    aproape(ariePar(dupa, r.ids[0] as string), asteptat, 1e-6, p);
  };
  caz(linieCale(-10, 20, 110, 60), 'stanga', 6000);
  caz(linieCale(-10, 20, 110, 60), 'dreapta', 4000);
  caz(linieCale(110, 60, -10, 20), 'stanga', 4000);
  // Fără închidere: calea de deasupra, de la (100; 170/3) prin colțurile de sus la (0; 70/3): 130/3 + 100 + 230/3 = 220 mm.
  const fara = taiat(d, cerere(linieCale(-10, 20, 110, 60), ['a'], { pastreaza: 'stanga', inchide: false }));
  assert.equal(fara.r.ids.length, 1);
  aproape(lungime(fara.dupa, fara.r.ids[0] as string), 220, 1e-9, 'calea de deasupra');
});

test('Păstrează, cu un „O” pus pe placă (felul Formă): stânga (înăuntru), litera; dreapta, placa cu golul și mijlocul literei', () => {
  let d = docDin(stoc, patrat('p', 0, 0, 100, 60));
  d = cuLitera(d, 'o', 50, 30);
  const lit = Math.PI * (400 - 100);
  for (const [p, asteptat] of [['stanga', lit], ['dreapta', 6000 - lit]] as const) {
    const { dupa, r } = taiat(d, cerere({ fel: 'forme', ids: ['o'] }, ['p'], { pastreaza: p }));
    assert.equal(r.ids.length, 1, p);
    aproape(ariePar(dupa, r.ids[0] as string), asteptat, 1e-6, p);
    assert.ok(dupa.foi[0]?.instante.some((i) => i.id === 'o'), 'cuțitul rămâne');
  }
});

// ——— Prelungește capetele (§2) ———

test('Prelungește: cuțitul de la (−10, 50) la (80, 50), cu închidere: fără prelungire, `nu-trece`; până ies din formă, două de 5 000', () => {
  const d = docDin(stoc, patrat('a'));
  assert.deepEqual(taie(d, cerere(linieCale(-10, 50, 80, 50), ['a'])), { ok: false, motiv: 'nu-trece' });
  for (const k of [linieCale(-10, 50, 80, 50), linieCale(20, 50, 80, 50), linieCale(80, 50, 20, 50)]) {
    const { dupa, r } = taiat(d, cerere(k, ['a'], { prelungeste: 'forma' }));
    assert.deepEqual(arii(dupa, r.ids), [5000, 5000]);
    for (const id of r.ids) {
      const [c] = contururi(dupa, id);
      assert.ok(c && areVarf(c, 0, 50) && areVarf(c, 100, 50), 'tăietura merge de la o latură la cealaltă');
    }
  }
});

test('Prelungește: un sfert de cerc la capăt (de la (30, 20) la (50, 40)) merge pe tangenta lui, în sus: 3 914,159 și 6 085,841', () => {
  const d = docDin(stoc, patrat('a'));
  const bulge = Math.tan(Math.PI / 8);
  const k: Cutit = { fel: 'cale', cale: { tip: 'cale', inchis: false, varfuri: [{ p: { x: -10, y: 20 }, s: L }, { p: { x: 30, y: 20 }, s: { tip: 'A', bulge } }, { p: { x: 50, y: 40 }, s: L }] } };
  const { dupa, r } = taiat(d, cerere(k, ['a'], { prelungeste: 'forma' }));
  // Poligonul (0, 20), (30, 20), (50, 40), (50, 100), (0, 100): 3 800, plus segmentul de cerc dintre coardă și arc (R20, 90°):
  // r²/2 · (θ − sin θ) = 200 · (π/2 − 1) = 100π − 200.
  const stanga = 3800 + 100 * Math.PI - 200;
  const [mic, mare] = arii(dupa, r.ids) as [number, number];
  aproape(mic, stanga, 1e-6, 'stânga sensului');
  aproape(mare, 10000 - stanga, 1e-6, 'dreapta sensului');
  const sus = r.ids.some((id) => contururi(dupa, id).some((c) => areVarf(c, 50, 100, 1e-9)));
  assert.ok(sus, 'tăietura ajunge la latura de sus în (50, 100)');
  // Cu „Păstrează stânga”: rămâne bucata din stânga sensului (deasupra și la stânga cuțitului).
  const p = taiat(d, cerere(k, ['a'], { prelungeste: 'forma', pastreaza: 'stanga' }));
  aproape(ariePar(p.dupa, p.r.ids[0] as string), stanga, 1e-6, 'stânga');
});

test('Prelungește până ies din formă: prin două pătrate lipite trece; un pătrat departe rămâne, iar cu „linia întreagă” se taie și el', () => {
  const lipite = docDin(stoc, patrat('a'), patrat('c', 100, 0));
  const l = taiat(lipite, cerere(linieCale(20, 50, 80, 50), ['a', 'c'], { prelungeste: 'forma' }));
  assert.equal(l.r.degrupate.length, 2, 'amândouă tăiate');
  assert.deepEqual(arii(l.dupa, l.r.ids), [5000, 5000, 5000, 5000]);
  const departe = docDin(stoc, patrat('a'), patrat('b', 200, 0));
  const f = taiat(departe, cerere(linieCale(20, 50, 80, 50), ['a', 'b'], { prelungeste: 'forma' }));
  assert.deepEqual(f.r.degrupate.map((g) => g.instanta.id), ['a']);
  const i = taiat(departe, cerere(linieCale(20, 50, 80, 50), ['a', 'b'], { prelungeste: 'intreaga' }));
  assert.deepEqual(i.r.degrupate.map((g) => g.instanta.id), ['a', 'b']);
  assert.deepEqual(arii(i.dupa, i.r.ids), [5000, 5000, 5000, 5000]);
});

test('Prelungește, linia întreagă: diagonala de la (40, 40) la (60, 60) taie pătratul în două triunghiuri de 5 000', () => {
  const d = docDin(stoc, patrat('a'));
  const { dupa, r } = taiat(d, cerere(linieCale(40, 40, 60, 60), ['a'], { prelungeste: 'intreaga' }));
  assert.deepEqual(arii(dupa, r.ids), [5000, 5000]);
  for (const id of r.ids) {
    const [c] = contururi(dupa, id);
    assert.ok(c && areVarf(c, 0, 0) && areVarf(c, 100, 100), 'tăietura pe diagonală, de la colț la colț');
  }
});

test('Prelungește: un cuțit închis n-are capete (neschimbat); un capăt în afara formelor nu se mută', () => {
  const d = docDin(stoc, patrat('a'));
  const k: Cutit = { fel: 'cale', cale: caleDoc(true, [-20, -20], [40, -20], [40, 40], [-20, 40]) };
  const fara = taie(d, cerere(k, ['a'])), cu = taie(d, cerere(k, ['a'], { prelungeste: 'forma' }));
  assert.ok(fara.ok && cu.ok);
  assert.deepEqual(cu, fara);
  const lung = linieCale(-10, 20, 110, 60);
  assert.deepEqual(taie(d, cerere(lung, ['a'], { prelungeste: 'forma' })), taie(d, cerere(lung, ['a'])));
});

test('Prelungește, cu cuțitul-formă deschis (o linie de la (30, 50) la (70, 50), din document): taie ca linia ei întreagă și rămâne', () => {
  const d = docDin(stoc, patrat('a'), forma('k', caleDoc(false, [30, 50], [70, 50])));
  assert.deepEqual(taie(d, cerere({ fel: 'forma', id: 'k' }, ['a', 'k'])), { ok: false, motiv: 'nimic-taiat' });
  const din = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['a', 'k'], { prelungeste: 'forma' }));
  assert.deepEqual(arii(din.dupa, din.r.ids), [5000, 5000]);
  assert.deepEqual(din.r.sterse, []);
  assert.ok(din.dupa.foi[0]?.instante.some((i) => i.id === 'k'), 'cuțitul rămâne');
  // Felul Formă al uneltei, la fel.
  const f = taiat(d, cerere({ fel: 'forme', ids: ['k'] }, ['a'], { prelungeste: 'forma' }));
  assert.deepEqual(arii(f.dupa, f.r.ids), [5000, 5000]);
});

// ——— Cuțitul-formă șters după tăiere (§2) ———

test('cuțitul-formă din panou, cu „șterge-o după tăiere”: pleacă în același pas; fără bifă rămâne; fără nimic tăiat, refuzul', () => {
  const d = docDin(stoc, patrat('a'), forma('k', caleDoc(false, [-10, 50], [110, 50])));
  const cu = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['a', 'k'], { stergeCutitul: true }));
  assert.deepEqual(cu.r.sterse, ['k']);
  assert.equal(cu.r.ids.length, 2);
  assert.ok(!cu.dupa.foi[0]?.instante.some((i) => i.id === 'k'), 'cuțitul a plecat');
  const fara = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['a', 'k']));
  assert.deepEqual(fara.r.sterse, []);
  const nimic = docDin(stoc, patrat('a'), forma('k', caleDoc(false, [-10, 500], [110, 500])));
  assert.deepEqual(taie(nimic, cerere({ fel: 'forma', id: 'k' }, ['a', 'k'], { stergeCutitul: true })), { ok: false, motiv: 'nimic-taiat' });
});

test('felul Formă, cu cuțitul șters: cercul R10 pus pe placă o decupează și pleacă (felul Formă și Păstrează în afară: placa cu gol)', () => {
  const d = docDin(stoc, patrat('p', 0, 0, 100, 60), cercF('k', 50, 30, 10));
  const { dupa, r } = taiat(d, cerere({ fel: 'forme', ids: ['k'] }, ['p'], { stergeCutitul: true }));
  assert.deepEqual(r.sterse, ['k']);
  const [disc, placa] = arii(dupa, r.ids) as [number, number];
  aproape(disc, 100 * Math.PI, 1e-6, 'discul');
  aproape(placa, 6000 - 100 * Math.PI, 1e-6, 'placa cu gol');
  const p = taiat(d, cerere({ fel: 'forme', ids: ['k'] }, ['p'], { stergeCutitul: true, pastreaza: 'dreapta' }));
  assert.equal(p.r.ids.length, 1);
  assert.deepEqual(p.r.sterse, ['k']);
  aproape(ariePar(p.dupa, p.r.ids[0] as string), 6000 - 100 * Math.PI, 1e-6, 'placa cu golul');
});
