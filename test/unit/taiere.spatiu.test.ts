/**
 * Spațiul și suprapunerea dintre bucăți (ADR 0181 §2; felia 10.3↑i), pe hârtie. Fiecare parte se taie cu cuțitul mutat
 * paralel cu w / 2, spre ea la spațiu, spre cealaltă la suprapunere:
 * - **pătratul 100 × 100 la X = 50:** cu spațiul 6, două dreptunghiuri 47 × 100 (4 700 mm²), tăiate la x = 47 și x = 53; cu
 *   suprapunerea 6, 53 × 100 (5 300); cu „Păstrează” o parte, doar ea; Y = 20, stânga (deasupra), spațiul 4: 7 800;
 * - **cercul R50 la X = 0 (al lui), spațiul 6:** două segmente de 3 627,171 mm² (R² acos(3 / R) − 3 √(R² − 9));
 * - **inelul R50 / R30 la Y = 0, spațiul 3:** două „U”-uri de 2 453,259 mm² (fără spațiu, 2 513,274);
 * - **linia prin (20, 50) la 30°, spațiul 4:** 5 000 + 2 600 / √3 dedesubt și 5 000 − 3 400 / √3 deasupra (fiecare parte pierde
 *   2 × 200 / √3, lungimea tăieturii);
 * - **cuțitul tras de la (−10, 20) la (110, 60), spațiul 4:** 6 000 − 200 √10 / 3 deasupra și 4 000 − 200 √10 / 3 dedesubt;
 *   cu suprapunerea 4, plus 200 √10 / 3; cu „Prelungește”, cel care se oprește înăuntru taie ca cel întreg;
 * - **cuțitul care iese printr-un colț pe sub 45°** (de la (40, −10) la (100,5; 50,5), la 0,5 mm după latură): cel mutat în
 *   stânga s-ar opri înăuntru și se prelungește pe tangentă; triunghiul (50 − 2√2)² / 2 și restul 10 000 − (50 + 2√2)² / 2;
 * - **acul de păr** (picioarele la 2 mm, întoarse printr-un semicerc R1): cu spațiul 6, partea dinăuntru nu încape
 *   (`spatiu-cutit`), dar cu „Păstrează” partea dinafară merge (10 000 − 400 − 8π); cu suprapunerea 0,5, fanta de
 *   125 + 25π / 32 și restul de 10 000 − 75 − 9π / 32;
 * - **cuțitul închis** (cercul R20 pe placă): cu spațiul 4, discul R18 (324π) și placa cu golul R22 (10 000 − 484π); cu
 *   suprapunerea 4, invers; pe marginea plăcii, jumătățile; un cerc R2 cu spațiul 6 e mâncat (`spatiu`), dar placa cu golul
 *   R5 rămâne cu „Păstrează” dreapta; cu suprapunerea 6, discul R5 și placa întreagă (cuțitul mutat înăuntru dispare); un „O”
 *   pus pe placă: inelul R18 / R12 și placa cu golul R22 / R8, cu insula R8; cuțitul șters, în același pas;
 * - **refuzurile:** spațiul care mănâncă o bucată întreagă (X = 98, spațiul 6: fâșia de 2 mm; X = 97: fâșia de 3, exact
 *   jumătatea; un pătrățel de 4 mm; o insulă în fâșie), dar nu o gaură în fâșie și nici partea care nu se păstrează; X = 96,9
 *   lasă fâșia de 0,1 mm; suprapunerea la X = 98: pătratul întreg și fâșia de 5 mm; fără închidere (`spatiu-inchide`); lățimea
 *   care nu e număr, sub 0,01 mm sau peste 1 000 mm (`valoare`);
 * - **cuțitul tras, la margini:** la y = 97 cu spațiul 6, cel mutat merge chiar pe latura de sus (bucata, mâncată); o insulă a
 *   piesei în fâșie, mâncată de spațiu, iar cu suprapunerea, o singură dată; cuțitul în buclă cu gura de 5 mm, mutat cu 3 spre
 *   stânga, se rupe în două (`spatiu-cutit`), iar spre dreapta merge (70 mm²).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import { DISTANTA_MINIMA } from '../../src/geom/offset.ts';
import { LATIME_MAXIMA, LATIME_MINIMA } from '../../src/model/intreBucati.ts';
import type { Document, FormaDoc, Nod, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import type { FormaCale } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type Cutit, type Intre, type RezultatTaiere } from '../../src/model/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const caleDoc = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaCale =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x = 0, y = 0, w = 100, h = 100) => forma(id, { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r: number) => forma(id, { tip: 'cerc', raza: r }, x, y);
const spatiu = (latime: number): Intre => ({ fel: 'spatiu', latime });
const suprapunere = (latime: number): Intre => ({ fel: 'suprapunere', latime });
const cerere = (cutit: Cutit, alese: readonly string[], o: Partial<CerereTaiere> = {}): CerereTaiere => ({ cutit, alese, inchide: true, ...o });
const linieCale = (x0: number, y0: number, x1: number, y1: number): Cutit => ({ fel: 'cale', cale: caleDoc(false, [x0, y0], [x1, y1]) });

/** Documentul după tăiere (degruparea și ștergerile, ca acțiunea `document.taie`), trecut prin ușă. */
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

/** Conține conturul închis `x` primul vârf al lui `c`? (par-impar, pe un poligon des: arcele prin 256 de coarde.) */
function contine(x: Contur, c: Contur): boolean {
  const q = c.varfuri[0]?.p;
  if (!q) return false;
  const p: Array<{ x: number; y: number }> = [];
  const n = x.varfuri.length;
  for (let k = 0; k < n; k++) {
    const a = x.varfuri[k] as Contur['varfuri'][number], b = x.varfuri[(k + 1) % n] as Contur['varfuri'][number];
    p.push(a.p);
    if (a.s.tip === 'A' && Math.abs(a.s.bulge) > 1e-12) {
      const u = 4 * Math.atan(a.s.bulge), coarda = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y), r = coarda / (2 * Math.sin(Math.abs(u) / 2));
      const mx = (a.p.x + b.p.x) / 2, my = (a.p.y + b.p.y) / 2, h = r * Math.cos(Math.abs(u) / 2) * Math.sign(a.s.bulge);
      const cx = mx - ((b.p.y - a.p.y) / coarda) * h, cy = my + ((b.p.x - a.p.x) / coarda) * h;
      const u0 = Math.atan2(a.p.y - cy, a.p.x - cx);
      for (let i = 1; i < 256; i++) p.push({ x: cx + r * Math.cos(u0 + (u * i) / 256), y: cy + r * Math.sin(u0 + (u * i) / 256) });
    }
  }
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
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const areVarf = (c: Contur, x: number, y: number, tol = 1e-9): boolean => c.varfuri.some((v) => Math.hypot(v.p.x - x, v.p.y - y) <= tol);
/** Ariile părților, în ordinea lor. */
const arii = (t: ReturnType<typeof taiat>): number[] => t.r.ids.map((id) => ariePar(t.dupa, id));
/** Segmentul de cerc de rază R tăiat la distanța h de centru: R² acos(h / R) − h √(R² − h²). */
const segment = (R: number, h: number): number => R * R * Math.acos(h / R) - h * Math.sqrt(R * R - h * h);

/** O piesă cu un grup de contururi (cercuri sau dreptunghiuri, cu poziția lor), pusă în (x, y). */
function cuGrup(d: Document, id: string, x: number, y: number, copii: ReadonlyArray<{ readonly f: FormaDoc; readonly x: number; readonly y: number }>): Document {
  const radacina: Nod = {
    tip: 'grup', id, matrice: { ...ID },
    copii: copii.map((c, k): Nod => ({ tip: 'element', id: `${id}-${k}`, forma: c.f, matrice: { ...ID, e: c.x, f: c.y } })),
  };
  const foaie = d.foi[0];
  assert.ok(foaie);
  return { ...d, piese: [...d.piese, { id, radacina, operatii: [] }], foi: [{ ...foaie, instante: [...foaie.instante, { id, piesa: id, x, y, rotire: 0 }] }] };
}
const dr = (w: number, h: number): FormaDoc => ({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 });
const cerc = (raza: number): FormaDoc => ({ tip: 'cerc', raza });

// ——— Linia: X, Y, la unghi ———

test('pătratul la X = 50: spațiul 6 lasă două dreptunghiuri 47 × 100, tăiate la x = 47 și 53; suprapunerea 6, 53 × 100', () => {
  const d = docDin(stoc, patrat('a'));
  const sp = taiat(d, cerere({ fel: 'x', x: 50 }, ['a'], { intre: spatiu(6) }));
  assert.equal(sp.r.forme, 1);
  assert.deepEqual(arii(sp), [4700, 4700]);
  const [a, b] = sp.r.ids as [string, string];
  const [ca] = contururi(sp.dupa, a), [cb] = contururi(sp.dupa, b);
  assert.ok(ca && areVarf(ca, 47, 0) && areVarf(ca, 47, 100), 'partea A se oprește la x = 47');
  assert.ok(cb && areVarf(cb, 53, 0) && areVarf(cb, 53, 100), 'partea B pornește la x = 53');
  const su = taiat(d, cerere({ fel: 'x', x: 50 }, ['a'], { intre: suprapunere(6) }));
  assert.deepEqual(arii(su), [5300, 5300]);
  const [a2, b2] = su.r.ids as [string, string];
  const [ca2] = contururi(su.dupa, a2), [cb2] = contururi(su.dupa, b2);
  assert.ok(ca2 && areVarf(ca2, 53, 0) && areVarf(ca2, 53, 100), 'cu suprapunerea, A ajunge la x = 53');
  assert.ok(cb2 && areVarf(cb2, 47, 0) && areVarf(cb2, 47, 100), 'cu suprapunerea, B pornește de la x = 47');
});

test('cu „Păstrează”, doar partea ei, mutată: X = 50 stânga, spațiul 6: 4 700; dreapta, suprapunerea 6: 5 300; Y = 20 stânga, spațiul 4: 7 800', () => {
  const d = docDin(stoc, patrat('a'));
  const caz = (c: Cutit, p: 'stanga' | 'dreapta', intre: Intre, asteptat: number): void => {
    const t = taiat(d, cerere(c, ['a'], { pastreaza: p, intre }));
    assert.equal(t.r.ids.length, 1, `${c.fel} ${p}`);
    assert.deepEqual(t.r.sterse, []);
    aproape(ariePar(t.dupa, t.r.ids[0] as string), asteptat, 1e-9, `${c.fel} ${p} ${intre.fel}`);
  };
  caz({ fel: 'x', x: 50 }, 'stanga', spatiu(6), 4700);
  caz({ fel: 'x', x: 50 }, 'dreapta', suprapunere(6), 5300);
  caz({ fel: 'y', y: 20 }, 'stanga', spatiu(4), 7800);
  caz({ fel: 'y', y: 20 }, 'dreapta', spatiu(4), 1800);
});

test('cercul R50 tăiat prin centru, cu spațiul 6: două segmente de 3 627,171 mm²', () => {
  aproape(segment(50, 3), 3627.171, 5e-4, 'valoarea de pe hârtie');
  const d = docDin(stoc, cercF('c', 200, 200, 50));
  const t = taiat(d, cerere({ fel: 'x', x: 200 }, ['c'], { intre: spatiu(6) }));
  const [a, b] = arii(t) as [number, number];
  aproape(a, segment(50, 3), 1e-9, 'stânga');
  aproape(b, segment(50, 3), 1e-9, 'dreapta');
});

test('inelul R50 / R30 la Y = 0 (al lui), cu spațiul 3: două „U”-uri de 2 453,259 mm² (fără spațiu, 2 513,274)', () => {
  const u = segment(50, 1.5) - segment(30, 1.5);
  aproape(u, 2453.259, 5e-4, 'valoarea de pe hârtie');
  const d = cuGrup(docDin(stoc), 'o', 200, 200, [{ f: cerc(50), x: 0, y: 0 }, { f: cerc(30), x: 0, y: 0 }]);
  const fara = taiat(d, cerere({ fel: 'y', y: 200 }, ['o']));
  for (const a of arii(fara)) aproape(a, 800 * Math.PI, 1e-9, 'fără spațiu');
  aproape(800 * Math.PI, 2513.274, 5e-4, 'fără spațiu, pe hârtie');
  const t = taiat(d, cerere({ fel: 'y', y: 200 }, ['o'], { intre: spatiu(3) }));
  assert.equal(t.r.forme, 2, 'ambele cercuri tăiate');
  for (const a of arii(t)) aproape(a, u, 1e-9, 'un „U”');
});

test('linia prin (20, 50) la 30°, cu spațiul 4: 5 000 + 2 600 / √3 dedesubt și 5 000 − 3 400 / √3 deasupra', () => {
  const d = docDin(stoc, patrat('a'));
  const t = taiat(d, cerere({ fel: 'unghi', x: 20, y: 50, unghi: 30 }, ['a'], { intre: spatiu(4) }));
  const [a, b] = arii(t) as [number, number];
  aproape(a, 5000 + 2600 / Math.sqrt(3), 1e-6, 'partea A, dedesubt');
  aproape(b, 5000 - 3400 / Math.sqrt(3), 1e-6, 'partea B, deasupra');
});

// ——— Cuțitul tras (Linie, Pen, Liber) ———

test('cuțitul tras de la (−10, 20) la (110, 60): spațiul 4 scoate 200 √10 / 3 din fiecare parte, suprapunerea 4 adaugă tot atât', () => {
  const d = docDin(stoc, patrat('a'));
  const f = (200 * Math.sqrt(10)) / 3;
  const sp = taiat(d, cerere(linieCale(-10, 20, 110, 60), ['a'], { intre: spatiu(4) }));
  const [s1, s2] = arii(sp).sort((x, y) => x - y) as [number, number];
  aproape(s1, 4000 - f, 1e-6, 'spațiul, dedesubt');
  aproape(s2, 6000 - f, 1e-6, 'spațiul, deasupra');
  const su = taiat(d, cerere(linieCale(-10, 20, 110, 60), ['a'], { intre: suprapunere(4) }));
  const [u1, u2] = arii(su).sort((x, y) => x - y) as [number, number];
  aproape(u1, 4000 + f, 1e-6, 'suprapunerea, dedesubt');
  aproape(u2, 6000 + f, 1e-6, 'suprapunerea, deasupra');
  // Stânga sensului e deasupra: cu spațiul, doar partea de deasupra, mutată.
  const st = taiat(d, cerere(linieCale(-10, 20, 110, 60), ['a'], { intre: spatiu(4), pastreaza: 'stanga' }));
  assert.equal(st.r.ids.length, 1);
  aproape(ariePar(st.dupa, st.r.ids[0] as string), 6000 - f, 1e-6, 'stânga, deasupra');
});

test('cu „Prelungește”, cuțitul de la (−10, 50) la (80, 50), cu spațiul 4: două părți de 4 800', () => {
  const d = docDin(stoc, patrat('a'));
  assert.equal(refuz(d, cerere(linieCale(-10, 50, 80, 50), ['a'], { intre: spatiu(4) })), 'nu-trece');
  const t = taiat(d, cerere(linieCale(-10, 50, 80, 50), ['a'], { intre: spatiu(4), prelungeste: 'forma' }));
  for (const a of arii(t)) aproape(a, 4800, 1e-9, 'o parte');
});

test('cuțitul care iese printr-un colț pe sub 45°, la 0,5 mm după latură: cel mutat se prelungește până iese și el', () => {
  const d = docDin(stoc, patrat('a'));
  const s2 = 2 * Math.SQRT2;
  const t = taiat(d, cerere(linieCale(40, -10, 100.5, 50.5), ['a'], { intre: spatiu(4) }));
  const [mare, mic] = arii(t).sort((x, y) => y - x) as [number, number];
  aproape(mic, ((50 - s2) ** 2) / 2, 1e-6, 'triunghiul din dreapta sensului');
  aproape(mare, 10000 - ((50 + s2) ** 2) / 2, 1e-6, 'restul, din stânga');
  assert.ok(t.r.ids.some((id) => contururi(t.dupa, id).some((c) => areVarf(c, 100, 50 + s2, 1e-6))), 'tăietura din stânga ajunge pe latura din dreapta');
});

test('acul de păr (picioarele la 2 mm): spațiul 6 nu încape înăuntru, dar „Păstrează” partea dinafară; suprapunerea 0,5 merge', () => {
  const d = docDin(stoc, patrat('a'));
  const ac: Cutit = {
    fel: 'cale', cale: {
      tip: 'cale', inchis: false, varfuri: [
        { p: { x: 150, y: 40 }, s: L }, { p: { x: 50, y: 40 }, s: { tip: 'A', bulge: -1 } }, { p: { x: 50, y: 42 }, s: L }, { p: { x: 150, y: 42 }, s: L },
      ],
    },
  };
  // Fără spațiu: fanta dintre picioare (100 + π / 2), în dreapta sensului, și restul plăcii, în stânga.
  const fara = taiat(d, cerere(ac, ['a']));
  const [f1, f2] = arii(fara).sort((x, y) => x - y) as [number, number];
  aproape(f1, 100 + Math.PI / 2, 1e-6, 'fanta');
  aproape(f2, 10000 - 100 - Math.PI / 2, 1e-6, 'restul plăcii');
  assert.equal(refuz(d, cerere(ac, ['a'], { intre: spatiu(6) })), 'spatiu-cutit');
  assert.equal(refuz(d, cerere(ac, ['a'], { intre: spatiu(6), pastreaza: 'dreapta' })), 'spatiu-cutit');
  // Stânga: placa fără „U”-ul mutat cu 3 în afară (dreptunghiul 50 × 8 și semicercul R4).
  const st = taiat(d, cerere(ac, ['a'], { intre: spatiu(6), pastreaza: 'stanga' }));
  assert.equal(st.r.ids.length, 1);
  aproape(ariePar(st.dupa, st.r.ids[0] as string), 10000 - 400 - 8 * Math.PI, 1e-6, 'stânga, fără „U”-ul de 6');
  // Suprapunerea 0,5: fanta crește cu 0,25 de fiecare parte (125 + 25π / 32), restul pierde fanta strânsă (75 + 9π / 32).
  const su = taiat(d, cerere(ac, ['a'], { intre: suprapunere(0.5) }));
  const [mic, mare] = arii(su).sort((x, y) => x - y) as [number, number];
  aproape(mic, 125 + (25 * Math.PI) / 32, 1e-6, 'fanta, crescută');
  aproape(mare, 10000 - 75 - (9 * Math.PI) / 32, 1e-6, 'restul, cu fanta strânsă');
});

// ——— Cuțitul închis (felul Formă, ultima formă aleasă) ———

test('cuțitul-cerc R20 pe placă: spațiul 4, discul R18 și placa cu golul R22; suprapunerea 4, invers; cuțitul șters, odată', () => {
  const d = docDin(stoc, patrat('p'), cercF('k', 50, 50, 20));
  const sp = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: spatiu(4) }));
  const [i1, a1] = arii(sp) as [number, number];
  aproape(i1, 324 * Math.PI, 1e-9, 'înăuntru, R18');
  aproape(a1, 10000 - 484 * Math.PI, 1e-9, 'în afară, golul R22');
  const su = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: suprapunere(4) }));
  const [i2, a2] = arii(su) as [number, number];
  aproape(i2, 484 * Math.PI, 1e-9, 'înăuntru, R22');
  aproape(a2, 10000 - 324 * Math.PI, 1e-9, 'în afară, golul R18');
  const st = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: spatiu(4), stergeCutitul: true }));
  assert.deepEqual(st.r.sterse, ['k']);
  assert.ok(!st.dupa.foi[0]?.instante.some((i) => i.id === 'k'), 'cuțitul a plecat');
});

test('cuțitul-cerc R20 pe marginea plăcii, cu spațiul 4: jumătatea discului R18 și placa fără jumătatea R22', () => {
  const d = docDin(stoc, patrat('p'), cercF('k', 100, 50, 20));
  const t = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: spatiu(4) }));
  const [i, a] = arii(t) as [number, number];
  aproape(i, 162 * Math.PI, 1e-9, 'jumătatea R18');
  aproape(a, 10000 - 242 * Math.PI, 1e-9, 'placa fără jumătatea R22');
});

test('cuțitul-cerc R2: spațiul 6 îl mănâncă (`spatiu`), dar „Păstrează” dreapta lasă golul R5; suprapunerea 6, discul R5 și placa întreagă', () => {
  const d = docDin(stoc, patrat('p'), cercF('k', 50, 50, 2));
  assert.equal(refuz(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: spatiu(6) })), 'spatiu');
  assert.equal(refuz(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: spatiu(6), pastreaza: 'stanga' })), 'spatiu');
  const dr5 = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: spatiu(6), pastreaza: 'dreapta' }));
  assert.equal(dr5.r.ids.length, 1);
  aproape(ariePar(dr5.dupa, dr5.r.ids[0] as string), 10000 - 25 * Math.PI, 1e-9, 'placa cu golul R5');
  const su = taiat(d, cerere({ fel: 'forma', id: 'k' }, ['p'], { intre: suprapunere(6) }));
  const [i, a] = arii(su) as [number, number];
  aproape(i, 25 * Math.PI, 1e-9, 'discul R5');
  aproape(a, 10000, 1e-9, 'placa întreagă: cuțitul mutat înăuntru dispare');
});

test('un „O” (R20 / R10) pus pe placă (felul Formă), cu spațiul 4: inelul R18 / R12 și placa cu golul R22 / R8, cu insula R8', () => {
  let d = docDin(stoc, patrat('p', 0, 0, 100, 60));
  d = cuGrup(d, 'o', 50, 30, [{ f: cerc(20), x: 0, y: 0 }, { f: cerc(10), x: 0, y: 0 }]);
  const sp = taiat(d, cerere({ fel: 'forme', ids: ['o'] }, ['p'], { intre: spatiu(4) }));
  const [i, a] = arii(sp) as [number, number];
  aproape(i, 180 * Math.PI, 1e-9, 'inelul R18 / R12');
  aproape(a, 6000 - 420 * Math.PI, 1e-9, 'placa cu golul R22 / R8 (insula R8, plină)');
  const su = taiat(d, cerere({ fel: 'forme', ids: ['o'] }, ['p'], { intre: suprapunere(4) }));
  const [i2, a2] = arii(su) as [number, number];
  aproape(i2, 420 * Math.PI, 1e-9, 'inelul R22 / R8');
  aproape(a2, 6000 - 180 * Math.PI, 1e-9, 'placa cu golul R18 / R12');
});

// ——— Refuzurile și marginile lor ———

test('spațiul care ar mânca o bucată întreagă se refuză (`spatiu`): fâșia de 2 mm, fâșia de exact jumătate, un pătrățel de 4 mm', () => {
  const d = docDin(stoc, patrat('a'), patrat('m', 248, 48, 4, 4));
  assert.equal(refuz(d, cerere({ fel: 'x', x: 98 }, ['a'], { intre: spatiu(6) })), 'spatiu');
  assert.equal(refuz(d, cerere({ fel: 'x', x: 97 }, ['a'], { intre: spatiu(6) })), 'spatiu');
  assert.equal(refuz(d, cerere({ fel: 'x', x: 250 }, ['m'], { intre: spatiu(6) })), 'spatiu');
  // Cu 0,1 mm dincolo de jumătate, fâșia rămâne: 0,1 × 100.
  const t = taiat(d, cerere({ fel: 'x', x: 96.9 }, ['a'], { intre: spatiu(6) }));
  const [a, b] = arii(t) as [number, number];
  aproape(a, 9390, 1e-6, 'stânga');
  aproape(b, 10, 1e-6, 'fâșia de 0,1 mm');
});

test('partea care nu se păstrează poate fi mâncată: X = 98, spațiul 6, „Păstrează” stânga: 9 500; suprapunerea la X = 98: 10 000 și 500', () => {
  const d = docDin(stoc, patrat('a'));
  const st = taiat(d, cerere({ fel: 'x', x: 98 }, ['a'], { intre: spatiu(6), pastreaza: 'stanga' }));
  assert.equal(st.r.ids.length, 1);
  aproape(ariePar(st.dupa, st.r.ids[0] as string), 9500, 1e-9, 'stânga');
  assert.equal(refuz(d, cerere({ fel: 'x', x: 98 }, ['a'], { intre: spatiu(6), pastreaza: 'dreapta' })), 'spatiu');
  const su = taiat(d, cerere({ fel: 'x', x: 98 }, ['a'], { intre: suprapunere(6) }));
  assert.deepEqual(arii(su), [10000, 500]);
});

test('o insulă în fâșie se refuză; o gaură în fâșie pleacă odată cu fâșia', () => {
  // Pătratul 100 × 100 și un pătrățel 1 × 1 la (51, 150): o insulă a aceleiași piese, în fâșia 47 … 53, netăiată de linie.
  const insula = cuGrup(docDin(stoc), 'p', 0, 0, [{ f: dr(100, 100), x: 0, y: 0 }, { f: dr(1, 1), x: 51, y: 150 }]);
  assert.equal(refuz(insula, cerere({ fel: 'x', x: 50 }, ['p'], { intre: spatiu(6) })), 'spatiu');
  // Același pătrățel la (51, 40), în pătrat: o gaură; fâșia o ia cu ea, iar părțile au 4 700 fiecare.
  const gaura = cuGrup(docDin(stoc), 'p', 0, 0, [{ f: dr(100, 100), x: 0, y: 0 }, { f: dr(1, 1), x: 51, y: 40 }]);
  const t = taiat(gaura, cerere({ fel: 'x', x: 50 }, ['p'], { intre: spatiu(6) }));
  assert.deepEqual(arii(t), [4700, 4700]);
  for (const id of t.r.ids) assert.equal(contururi(t.dupa, id).length, 1, 'nicio gaură rămasă');
});

test('spațiul cere închiderea (`spatiu-inchide`), iar lățimea, un număr între 0,01 și 1 000 mm (`valoare`)', () => {
  // Minimul e dublul celei mai mici distanțe a offsetului: cuțitul se mută cu jumătate din lățime.
  assert.equal(LATIME_MINIMA, 2 * DISTANTA_MINIMA);
  assert.deepEqual([LATIME_MINIMA, LATIME_MAXIMA], [0.01, 1000]);
  const d = docDin(stoc, patrat('a'));
  assert.equal(refuz(d, cerere({ fel: 'x', x: 50 }, ['a'], { intre: spatiu(6), inchide: false })), 'spatiu-inchide');
  assert.equal(refuz(d, cerere(linieCale(-10, 50, 110, 50), ['a'], { intre: suprapunere(2), inchide: false })), 'spatiu-inchide');
  for (const latime of [0, -1, 0.009, Number.NaN, Infinity, 1000.5]) {
    assert.equal(refuz(d, cerere({ fel: 'x', x: 50 }, ['a'], { intre: spatiu(latime) })), 'valoare', `lățimea ${latime}`);
  }
  // Marginile: 0,01 și 1 000 trec (la 1 000, totul e mâncat).
  for (const a of arii(taiat(d, cerere({ fel: 'x', x: 50 }, ['a'], { intre: spatiu(0.01) })))) aproape(a, 4999.5, 1e-9, 'spațiul de 0,01');
  assert.equal(refuz(d, cerere({ fel: 'x', x: 50 }, ['a'], { intre: spatiu(1000) })), 'spatiu');
});

test('cuțitul tras la y = 97, cu spațiul 6: bucata de sus ajunge exact până la cuțitul mutat, pe latura de sus, deci e mâncată', () => {
  const d = docDin(stoc, patrat('a'));
  assert.equal(refuz(d, cerere(linieCale(-10, 97, 110, 97), ['a'], { intre: spatiu(6) })), 'spatiu');
  // Cu „Păstrează” dreapta (dedesubt, față de sensul spre dreapta), bucata de sus nu contează: 0 … 94.
  const t = taiat(d, cerere(linieCale(-10, 97, 110, 97), ['a'], { intre: spatiu(6), pastreaza: 'dreapta' }));
  aproape(ariePar(t.dupa, t.r.ids[0] as string), 9400, 1e-9, 'dedesubt');
});

test('cuțitul tras, cu o insulă a piesei în fâșie: spațiul o mănâncă (`spatiu`); suprapunerea o lasă o singură dată', () => {
  // Pătratul și pătrățelul 1 × 1 de la (51, 150), o piesă; cuțitul vertical, de jos în sus, la x = 50, nu atinge pătrățelul.
  const d = cuGrup(docDin(stoc), 'p', 0, 0, [{ f: dr(100, 100), x: 0, y: 0 }, { f: dr(1, 1), x: 51, y: 150 }]);
  const k = linieCale(50, -10, 50, 300);
  assert.equal(refuz(d, cerere(k, ['p'], { intre: spatiu(6) })), 'spatiu');
  const t = taiat(d, cerere(k, ['p'], { intre: suprapunere(6) }));
  const toate = t.r.ids.flatMap((id) => contururi(t.dupa, id).map((c) => Math.abs(arieCuSemn(c))));
  assert.deepEqual(toate.filter((a) => Math.abs(a - 1) < 1e-9).length, 1, 'pătrățelul, o dată');
  assert.deepEqual(toate.filter((a) => Math.abs(a - 5300) < 1e-9).length, 2, 'cele două jumătăți, cu suprapunerea');
});

test('cuțitul în buclă, cu gura de 5 mm: mutat cu 3 spre stânga se rupe în două (`spatiu-cutit`); spre dreapta merge', () => {
  // Placa de 10 × 20 de la (−40, −10), trecută de prima latură a cuțitului; restul buclei e departe de ea.
  const d = docDin(stoc, patrat('p', -40, -10, 10, 20));
  const k: Cutit = { fel: 'cale', cale: caleDoc(false, [-50, 0], [50, 0], [50, 20], [-20, 20], [-20, 5]) };
  assert.equal(refuz(d, cerere(k, ['p'], { intre: spatiu(6) })), 'spatiu-cutit');
  assert.equal(refuz(d, cerere(k, ['p'], { intre: spatiu(6), pastreaza: 'stanga' })), 'spatiu-cutit');
  const t = taiat(d, cerere(k, ['p'], { intre: spatiu(6), pastreaza: 'dreapta' }));
  assert.equal(t.r.ids.length, 1);
  aproape(ariePar(t.dupa, t.r.ids[0] as string), 70, 1e-9, 'dedesubt, de la −10 la −3');
});

test('o formă pe care linia n-o atinge rămâne neschimbată, chiar dacă linia mutată ar atinge-o', () => {
  // Pătratul de la x = 52: linia X = 50 nu-l atinge, dar cea mutată la 53 l-ar tăia.
  const d = docDin(stoc, patrat('a'), patrat('b', 52, 200, 30, 30));
  const t = taiat(d, cerere({ fel: 'x', x: 50 }, ['a', 'b'], { intre: spatiu(6) }));
  assert.equal(t.r.degrupate.length, 1, 'doar pătratul tăiat de linie');
  assert.ok(t.dupa.foi[0]?.instante.some((i) => i.id === 'b'), 'pătratul neatins rămâne');
});
