/**
 * Probele țintite ale ușii WMF (ADR 0117), pe fișiere scrise de mână: antetul (placeable și standard), refuzurile (nu e
 * WMF, EMF-ul, înregistrările rupte), unitățile (antetul, modurile metrice, unitatea aleasă), maparea (modurile fixe,
 * extinderile ignorate, ISOTROPIC, SaveDC / RestoreDC cu poziția curentă), lanțul de LineTo, tabelul obiectelor, arcele
 * (sensul, capetele egale, arcul plat), dreptunghiul rotunjit, regula de umplere și ce se sare, numărat.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Varf } from '../../src/geom/contur.ts';
import { citesteWmf, type CaleWmf, type RezultatWmf } from '../../src/io/wmf.ts';

/* ── Scriitorul (ca în `test/oracles-py/wmf_import_corpus.py`) ──────────────────────────────────────────────────────── */

const cuvinte = (...w: number[]): number[] => w.map((x) => x & 0xffff);
/** O înregistrare din parametrii ei (un tablou: un PolyPolygon mare ar trece de stivă ca argumente împrăștiate). */
const recDin = (fn: number, w: readonly number[]): number[] => {
  const n = 3 + w.length;
  const out = [n & 0xffff, n >>> 16, fn];
  for (const x of w) out.push(x & 0xffff);
  return out;
};
const rec = (fn: number, ...w: number[]): number[] => recDin(fn, w);
const recOcteti = (fn: number, b: readonly number[]): number[] => {
  const o = b.length % 2 ? [...b, 0] : [...b];
  const w: number[] = [];
  for (let i = 0; i < o.length; i += 2) w.push((o[i] as number) | ((o[i + 1] as number) << 8));
  return rec(fn, ...w);
};
const le16 = (x: number): number[] => [x & 0xff, (x >> 8) & 0xff];
const le32 = (x: number): number[] => [...le16(x & 0xffff), ...le16((x >>> 16) & 0xffff)];

const SetMapMode = (m: number): number[] => rec(0x0103, m);
const SetPolyFillMode = (m: number): number[] => rec(0x0106, m);
const SetWindowOrg = (x: number, y: number): number[] => rec(0x020b, y, x);
const SetWindowExt = (x: number, y: number): number[] => rec(0x020c, y, x);
const SetViewportOrg = (x: number, y: number): number[] => rec(0x020d, y, x);
const SetViewportExt = (x: number, y: number): number[] => rec(0x020e, y, x);
const SaveDC = (): number[] => rec(0x001e);
const RestoreDC = (n: number): number[] => rec(0x0127, n);
const MoveTo = (x: number, y: number): number[] => rec(0x0214, y, x);
const LineTo = (x: number, y: number): number[] => rec(0x0213, y, x);
const Rectangle = (l: number, t: number, r: number, b: number): number[] => rec(0x041b, b, r, t, l);
const RoundRect = (l: number, t: number, r: number, b: number, w: number, h: number): number[] => rec(0x061c, h, w, b, r, t, l);
const Ellipse = (l: number, t: number, r: number, b: number): number[] => rec(0x0418, b, r, t, l);
const arcuri = (fn: number) => (l: number, t: number, r: number, b: number, xs: number, ys: number, xe: number, ye: number): number[] =>
  rec(fn, ye, xe, ys, xs, b, r, t, l);
const Arc = arcuri(0x0817), Chord = arcuri(0x0830), Pie = arcuri(0x081a);
const Polyline = (...p: Array<[number, number]>): number[] => rec(0x0325, p.length, ...p.flat());
const Polygon = (...p: Array<[number, number]>): number[] => rec(0x0324, p.length, ...p.flat());
const PolyPolygon = (...pp: Array<Array<[number, number]>>): number[] => recDin(0x0538, [pp.length, ...pp.map((p) => p.length), ...pp.flat(2)]);
const CreatePen = (stil: number): number[] => recOcteti(0x02fa, [...le16(stil), 0, 0, 0, 0, 0, 0, 0, 0]);
const CreateBrush = (stil: number): number[] => recOcteti(0x02fc, [...le16(stil), 0, 0, 0, 0, 0, 0]);
const SelectObject = (i: number): number[] => rec(0x012d, i);
const DeleteObject = (i: number): number[] => rec(0x01f0, i);

/** Un WMF: antetul standard și, cu `cadru`, antetul placeable (l, t, r, b, inch); `extra` se pune după EOF. */
function wmf(recs: ReadonlyArray<readonly number[]>, cadru?: readonly [number, number, number, number, number]): Uint8Array {
  const corp = [...recs.flat(), ...cuvinte(3, 0, 0)];
  // Tipul 1, 9 cuvinte, versiunea 0x300, mărimea în cuvinte, 16 obiecte, cea mai mare înregistrare (3), 0 membri.
  const n = 9 + corp.length;
  const octeti = [...cuvinte(1, 9, 0x300, n & 0xffff, n >>> 16, 16, 3, 0, 0), ...corp].flatMap((x) => le16(x));
  if (!cadru) return Uint8Array.from(octeti);
  const [l, t, r, b, inch] = cadru;
  const p = [...le32(0x9ac6cdd7), 0, 0, ...le16(l), ...le16(t), ...le16(r), ...le16(b), ...le16(inch), 0, 0, 0, 0];
  let suma = 0;
  for (let i = 0; i < 20; i += 2) suma ^= (p[i] as number) | ((p[i + 1] as number) << 8);
  return Uint8Array.from([...p, ...le16(suma), ...octeti]);
}

/** Un fișier cu cadrul de 1000 × 1000 unități la 1000 pe țol (25,4 × 25,4 mm), fereastra pe cadru. */
const placeable = (...recs: Array<readonly number[]>): Uint8Array =>
  wmf([SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(1000, 1000), ...recs], [0, 0, 1000, 1000, 1000]);
const S = 25.4 / 1000;
/** Punctul logic al fișierului de mai sus, în mm, cu Y în sus. */
const mm = (x: number, y: number): [number, number] => [x * S, (1000 - y) * S];

const citit = (b: Uint8Array, o: Parameters<typeof citesteWmf>[1] = {}): Extract<RezultatWmf, { ok: true }> => {
  const r = citesteWmf(b, o);
  if (!r.ok) assert.fail(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
  return r;
};
const refuz = (b: Uint8Array): readonly [string, string | undefined] => {
  const r = citesteWmf(b);
  if (r.ok) assert.fail('citit, nu refuzat');
  return [r.cod, r.detaliu];
};
const aproape = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
const varfuri = (c: CaleWmf): number[][] => c.varfuri.map((v) => [v.p.x, v.p.y].map((x) => Math.round(x * 1e9) / 1e9));
const rotunjit = (p: readonly number[]): number[] => p.map((x) => Math.round(x * 1e9) / 1e9);

/* ── Antetul și refuzurile ─────────────────────────────────────────────────────────────────────────────────────────── */

test('antetul: placeable (cadrul, inch → mm exact) și standard; ce nu e WMF, EMF-ul și cadrele greșite sunt refuzate', () => {
  const p = citit(placeable(Rectangle(100, 100, 400, 300)));
  assert.deepEqual([p.unitati.sursa, p.unitati.inch, p.unitati.mmPeUnitate], ['antet', 1000, S]);
  assert.ok(p.cadru && aproape(p.cadru.latime, 25.4) && aproape(p.cadru.inaltime, 25.4));
  const s = citit(wmf([Rectangle(0, 0, 96, 48)]));
  assert.deepEqual([s.unitati.sursa, s.unitati.unitate, s.cadru], ['aleasa', 'px', null]);
  assert.deepEqual(refuz(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])), ['nu-e-wmf', undefined]);
  // EMF: `EMR_HEADER` (tipul 1) cu „ EMF” la octetul 40.
  const emf = new Uint8Array(88);
  emf.set([1, 0, 0, 0, 88], 0);
  emf.set([0x20, 0x45, 0x4d, 0x46], 40);
  assert.deepEqual(refuz(emf), ['emf', undefined]);
  // Cadrul placeable gol, sau cu inch = 0: refuz la octetul 0.
  assert.deepEqual(refuz(wmf([Rectangle(0, 0, 10, 10)], [0, 0, 0, 100, 1000])), ['wmf', '0']);
  assert.deepEqual(refuz(wmf([Rectangle(0, 0, 10, 10)], [0, 0, 100, 100, 0])), ['wmf', '0']);
  // Antetul placeable urmat de un antet standard greșit: refuz la octetul 22.
  const b = placeable(Rectangle(0, 0, 10, 10));
  b[24] = 7;
  assert.deepEqual(refuz(b), ['wmf', '22']);
});

test('înregistrările rupte se refuză cu octetul lor: mărimea, sfârșitul fișierului, parametrii, numărul punctelor', () => {
  // Prima înregistrare a probei stă după cele două antete (22 + 18), SetMapMode (8) și cele două ale ferestrei (10 + 10).
  const cu = (...r: number[][]): Uint8Array => placeable(...r);
  const off = String(22 + 18 + 8 + 10 + 10);
  // Mărimea sub 3 cuvinte; o înregistrare care trece de sfârșitul fișierului.
  const mica = cu(Rectangle(0, 0, 10, 10));
  mica[Number(off)] = 2;
  assert.deepEqual(refuz(mica), ['wmf', off]);
  const lunga = cu(Rectangle(0, 0, 10, 10));
  lunga[Number(off)] = 200;
  assert.deepEqual(refuz(lunga), ['wmf', off]);
  // Parametri prea puțini (un dreptunghi cu 3), un poligon care cere mai multe puncte decât are, un PolyPolygon la fel.
  assert.deepEqual(refuz(cu(rec(0x041b, 10, 10, 0))), ['wmf', off]);
  assert.deepEqual(refuz(cu(rec(0x0324, 3, 0, 0, 10, 0))), ['wmf', off]);
  assert.deepEqual(refuz(cu(rec(0x0538, 2, 3, 3, 0, 0, 10, 0, 10, 10, 0, 0, 10, 0))), ['wmf', off]);
  // Un fișier fără EOF, terminat la granița unei înregistrări, se citește.
  const fara = placeable(Rectangle(0, 0, 10, 10));
  assert.ok(citesteWmf(fara.subarray(0, fara.length - 6)).ok);
});

/* ── Unitățile și Y ────────────────────────────────────────────────────────────────────────────────────────────────── */

test('Y se întoarce: cu antet, față de marginea de jos a cadrului; fără, față de origine; unitatea aleasă scalează', () => {
  const p = citit(placeable(Polyline([100, 100], [400, 300])));
  assert.deepEqual(varfuri(p.cai[0] as CaleWmf), [rotunjit(mm(100, 100)), rotunjit(mm(400, 300))]);
  const fara = wmf([Polyline([96, 0], [96, 96])]);
  const px = citit(fara);
  assert.deepEqual(varfuri(px.cai[0] as CaleWmf), [[25.4, 0], [25.4, -25.4]]);
  assert.equal(px.avertismente['unitati-nedeclarate'], 1);
  const inMm = citit(fara, { unitate: 'mm' });
  assert.deepEqual(varfuri(inMm.cai[0] as CaleWmf), [[96, 0], [96, -96]]);
  assert.deepEqual([inMm.unitati.unitate, inMm.unitati.mmPeUnitate], ['mm', 1]);
  // Fereastra fără antet: vizorul cât ea (o unitate logică = o unitate aleasă), orice extindere ar avea.
  const fereastra = citit(wmf([SetMapMode(8), SetWindowExt(9600, 9600), Polyline([0, 0], [96, 0])]));
  assert.deepEqual(varfuri(fereastra.cai[0] as CaleWmf), [[0, 0], [25.4, 0]]);
});

test('modurile metrice: unitatea fizică, cu Y în sus, declarată fără antet; extinderile nu le schimbă', () => {
  const cazuri: Array<readonly [number, number]> = [[2, 0.1], [3, 0.01], [4, 0.254], [5, 0.0254], [6, 25.4 / 1440]];
  for (const [mod, q] of cazuri) {
    const r = citit(wmf([SetMapMode(mod), SetWindowExt(5, 5), SetViewportExt(7, 7), Polyline([0, 0], [100, 100])]));
    assert.deepEqual([r.unitati.sursa, r.unitati.mmPeUnitateMapare], ['mapare', q], `modul ${mod}`);
    assert.equal(r.avertismente['unitati-nedeclarate'], 0);
    assert.deepEqual(varfuri(r.cai[0] as CaleWmf), [[0, 0], rotunjit([100 * q, 100 * q])], `modul ${mod}`);
  }
  // Un desen metric și unul în MM_TEXT: unitatea aleasă contează, deci nedeclarată.
  const amestec = citit(wmf([SetMapMode(3), Polyline([0, 0], [100, 0]), SetMapMode(1), Polyline([0, 0], [96, 0])]));
  assert.deepEqual([amestec.unitati.sursa, amestec.avertismente['unitati-nedeclarate']], ['aleasa', 1]);
  // Extinderile nule se ignoră; modul necunoscut, la fel.
  const nule = citit(placeable(SetWindowExt(0, 500), SetMapMode(9), Polyline([0, 0], [1000, 0])));
  assert.deepEqual(varfuri(nule.cai[0] as CaleWmf), [rotunjit(mm(0, 0)), rotunjit(mm(1000, 0))]);
});

test('vizorul fișierului și ISOTROPIC: vizorul se strânge pe axa cu scara mai mare', () => {
  // Fereastra 100 × 100, vizorul 1000 × 500: în ISOTROPIC, 500 × 500 (scara 5 pe ambele axe).
  const iso = citit(placeable(SetMapMode(7), SetWindowExt(100, 100), SetViewportExt(1000, 500), Polyline([0, 0], [100, 0], [100, 100])));
  assert.deepEqual(varfuri(iso.cai[0] as CaleWmf), [rotunjit(mm(0, 0)), rotunjit(mm(500, 0)), rotunjit(mm(500, 500))]);
  // În ANISOTROPIC, aceleași extinderi: scara 10 pe X, 5 pe Y.
  const aniso = citit(placeable(SetWindowExt(100, 100), SetViewportExt(1000, 500), Polyline([0, 0], [100, 0], [100, 100])));
  assert.deepEqual(varfuri(aniso.cai[0] as CaleWmf), [rotunjit(mm(0, 0)), rotunjit(mm(1000, 0)), rotunjit(mm(1000, 500))]);
  // ISOTROPIC doar cu fereastra: pornește din LOMETRIC (Y în sus) pe dispozitivul cadrului, deci fereastra intră în cadru.
  const doarFereastra = citit(placeable(SetMapMode(7), SetWindowExt(100, 100), Polyline([0, 0], [100, -100])));
  assert.deepEqual(varfuri(doarFereastra.cai[0] as CaleWmf), [rotunjit(mm(0, 0)), rotunjit(mm(1000, 1000))]);
});

test('SaveDC / RestoreDC: maparea și poziția curentă; relativ, absolut, și o stare care nu există (nimic)', () => {
  const r = citit(placeable(
    MoveTo(100, 100), SaveDC(), SetWindowOrg(-500, 0), SaveDC(), SetWindowOrg(-200, 0), MoveTo(0, 900),
    RestoreDC(1), LineTo(300, 100), // starea 1: fereastra (0, 0), poziția (100, 100)
    RestoreDC(-5), Polyline([0, 500], [100, 500]),
  ));
  assert.deepEqual(r.cai.map(varfuri), [
    [rotunjit(mm(100, 100)), rotunjit(mm(300, 100))],
    [rotunjit(mm(0, 500)), rotunjit(mm(100, 500))],
  ]);
  const relativ = citit(placeable(SaveDC(), SetWindowOrg(-500, 0), SaveDC(), SetWindowOrg(-200, 0), RestoreDC(-2), Polyline([0, 0], [100, 0])));
  assert.deepEqual(varfuri(relativ.cai[0] as CaleWmf), [rotunjit(mm(0, 0)), rotunjit(mm(100, 0))]);
  // O stivă de stări care doar crește e un fișier greșit.
  assert.equal(refuz(placeable(...Array.from({ length: 10_001 }, () => SaveDC())))[0], 'wmf');
});

/* ── Liniile, obiectele, ce se sare ────────────────────────────────────────────────────────────────────────────────── */

test('lanțul de LineTo: o cale până la MoveTo sau alt desen; peste o peniță schimbată; o linie nevăzută îl rupe', () => {
  const r = citit(placeable(
    MoveTo(0, 0), LineTo(100, 0), CreatePen(0), SelectObject(0), LineTo(100, 100), MoveTo(200, 0), LineTo(300, 0),
    Rectangle(500, 500, 600, 600), LineTo(400, 0),
    CreatePen(5), SelectObject(1), LineTo(500, 0), SelectObject(0), LineTo(600, 0),
  ));
  assert.deepEqual(r.cai.map(varfuri), [
    [rotunjit(mm(0, 0)), rotunjit(mm(100, 0)), rotunjit(mm(100, 100))],
    [rotunjit(mm(200, 0)), rotunjit(mm(300, 0))],
    [rotunjit(mm(600, 500)), rotunjit(mm(500, 500)), rotunjit(mm(500, 600)), rotunjit(mm(600, 600))],
    [rotunjit(mm(300, 0)), rotunjit(mm(400, 0))],
    [rotunjit(mm(500, 0)), rotunjit(mm(600, 0))],
  ]);
  assert.equal(r.avertismente.nepictate, 1);
});

test('tabelul obiectelor: locul cel mai mic liber; un loc gol nu schimbă nimic; regiunea aleasă e un decupaj', () => {
  const r = citit(placeable(
    CreatePen(5), CreateBrush(1), DeleteObject(0), CreateBrush(0), // pensula plină ia locul 0
    SelectObject(1), SelectObject(0), CreatePen(5), SelectObject(2), // penița nulă în locul 2; pensula plină din 0
    Polygon([0, 0], [100, 0], [50, 100]), // doar umplut: se vede
    SelectObject(9), DeleteObject(9), // locuri goale: nimic
    SelectObject(1), Polygon([200, 0], [300, 0], [250, 100]), // pensula nulă și penița nulă: nevăzut
    rec(0x06ff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), SelectObject(3), // o regiune, aleasă: decupajul
    recOcteti(0x0142, [0, 0, 0, 0]), SelectObject(4), Polygon([400, 0], [500, 0], [450, 100]), // pensula cu model umple
  ));
  assert.equal(r.cai.length, 2);
  assert.deepEqual([r.avertismente.nepictate, r.avertismente.decupaje], [1, 1]);
});

test('ce se sare, numărat: textul, imaginile și PatBlt, regiunile pictate, umplerile, pixelii, decupajele, înregistrările necunoscute', () => {
  const r = citit(placeable(
    recOcteti(0x0521, [3, 0, 67, 78, 67, 0, 10, 0, 10, 0]), rec(0x0a32, 10, 10, 0, 0), // TextOut, ExtTextOut
    rec(0x0922, 0, 0, 0, 0, 0, 0, 0, 0, 0), rec(0x0b41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), rec(0x061d, 0, 0, 10, 10, 0, 0), // raster
    rec(0x0228, 0, 0), rec(0x0419, 0, 0, 0, 0), rec(0x041f, 0, 0, 0, 0), // FillRegion, FloodFill, SetPixel
    rec(0x0416, 1000, 1000, 0, 0), rec(0x0415, 10, 10, 0, 0), rec(0x012c, 0), // decupajele
    rec(0x0fff, 1, 2), rec(0x0626, 15, 0), rec(0x0201, 0, 0), // necunoscută; escape-ul și culoarea fundalului: fără număr
    Polyline([0, 0], [100, 0]),
  ));
  assert.deepEqual(
    [r.avertismente['sarit-text'], r.avertismente['sarit-imagine'], r.avertismente['sarit-altele'], r.avertismente.decupaje, r.avertismente.necunoscute],
    [2, 3, 3, 3, 1],
  );
  assert.deepEqual(refuz(placeable(recOcteti(0x0521, [3, 0, 67, 78, 67, 0, 10, 0, 10, 0]))), ['gol', undefined]);
});

/* ── Arcele, elipsele, dreptunghiurile ─────────────────────────────────────────────────────────────────────────────── */

/** Baleiajul total al arcelor unei căi, în grade (pozitiv: trigonometric). */
const baleiaj = (c: CaleWmf): number => c.varfuri.reduce((s, v) => s + (v.s.tip === 'A' ? (4 * Math.atan(v.s.bulge) * 180) / Math.PI : 0), 0);

test('arcul: trigonometric pe dispozitiv; orar doar cu X oglindit singur; capetele egale dau cercul (și la Pie, fără rază)', () => {
  const arc = Arc(0, 0, 1000, 1000, 1000, 0, 0, 0); // de la 45° la 135°, văzute
  const normal = citit(placeable(arc));
  assert.ok(aproape(baleiaj(normal.cai[0] as CaleWmf), 90));
  const oglindit = citit(placeable(SetWindowOrg(1000, 0), SetWindowExt(-1000, 1000), arc));
  assert.ok(aproape(baleiaj(oglindit.cai[0] as CaleWmf), -90), String(baleiaj(oglindit.cai[0] as CaleWmf)));
  const intors = citit(placeable(SetWindowOrg(0, 1000), SetWindowExt(1000, -1000), arc));
  assert.ok(aproape(baleiaj(intors.cai[0] as CaleWmf), 270));
  const ambele = citit(placeable(SetWindowOrg(1000, 1000), SetWindowExt(-1000, -1000), arc));
  assert.ok(aproape(baleiaj(ambele.cai[0] as CaleWmf), 90));
  // Capetele pe aceeași rază: cercul întreg, închis; la Pie și Chord, tot cercul, fără raza dusă și întoarsă.
  for (const f of [Arc, Chord, Pie]) {
    const r = citit(placeable(f(0, 0, 1000, 1000, 900, 100, 1800, -800)));
    const c = r.cai[0] as CaleWmf;
    assert.deepEqual([c.inchis, c.varfuri.length, c.varfuri.every((v) => v.s.tip === 'A')], [true, 2, true]);
    assert.ok(aproape(baleiaj(c), 360));
  }
  // Pie: arcul, apoi raza la centru și înapoi (închiderea); Chord: arcul și coarda.
  const pie = citit(placeable(Pie(0, 0, 1000, 1000, 1000, 0, 0, 0))).cai[0] as CaleWmf;
  assert.deepEqual(pie.varfuri.map((v) => v.s.tip), ['A', 'L', 'L']);
  assert.deepEqual(rotunjit([pie.varfuri[2]?.p.x ?? 0, pie.varfuri[2]?.p.y ?? 0]), rotunjit(mm(500, 500)));
  const chord = citit(placeable(Chord(0, 0, 1000, 1000, 1000, 0, 0, 0))).cai[0] as CaleWmf;
  assert.deepEqual(chord.varfuri.map((v) => v.s.tip), ['A', 'L']);
});

test('elipsa și arcul ei în cubice (numărate); arcul peste latura documentului, tot în cubice (plat)', () => {
  const e = citit(placeable(Ellipse(0, 0, 1000, 500), Arc(0, 500, 1000, 1000, 1000, 500, 0, 500)));
  // Segmentele: o cale deschisă are în plus punctul final (fără segment).
  assert.ok(e.cai.every((c) => c.varfuri.slice(0, c.inchis ? undefined : -1).every((v) => v.s.tip === 'C')));
  assert.equal(e.avertismente['arce-eliptice'], 2);
  // Un cerc cu raza de 12,7 m (1 unitate = 1 țol): peste latura de 10 m, deci cubice.
  const plat = citit(wmf([SetMapMode(8), SetWindowExt(2000, 2000), Ellipse(0, 0, 1000, 1000)], [0, 0, 2000, 2000, 1]), {});
  assert.ok(plat.cai[0]?.varfuri.every((v) => v.s.tip === 'C'));
  assert.deepEqual([plat.avertismente['arce-plate'], plat.avertismente['arce-eliptice']], [1, 0]);
});

test('dreptunghiul rotunjit: colțurile cât elipsa (w, h), cel mult cât dreptunghiul; cu w = 0, dreptunghiul simplu', () => {
  const rotund = citit(placeable(RoundRect(0, 0, 1000, 500, 200, 200))).cai[0] as CaleWmf;
  assert.deepEqual(rotund.varfuri.map((v) => v.s.tip).join(''), 'ALALALAL');
  assert.ok(aproape(baleiaj(rotund), 360));
  const capsula = citit(placeable(RoundRect(0, 0, 1000, 500, 5000, 5000))).cai[0] as CaleWmf;
  // Elipsa colțului e cât tot dreptunghiul: liniile de lungime nulă dispar, rămân cele 4 sferturi (eliptice).
  assert.deepEqual(capsula.varfuri.map((v) => v.s.tip).filter((t) => t === 'L').length, 0);
  const simplu = citit(placeable(RoundRect(0, 0, 1000, 500, 0, 300))).cai[0] as CaleWmf;
  assert.deepEqual(varfuri(simplu), [mm(1000, 0), mm(0, 0), mm(0, 500), mm(1000, 500)].map(rotunjit));
  // Colțurile inversate se ordonează; o cutie fără arie e degenerată.
  const invers = citit(placeable(Rectangle(1000, 500, 0, 0), Rectangle(0, 0, 0, 100), Ellipse(0, 0, 100, 0)));
  assert.deepEqual(varfuri(invers.cai[0] as CaleWmf), varfuri(simplu));
  assert.equal(invers.avertismente.degenerate, 2);
});

test('regula de umplere: WINDING umplut se normalizează nonzero; ALTERNATE, sau WINDING doar tras, rămân', () => {
  const doua = [[[0, 0], [400, 0], [400, 400], [0, 400]], [[200, 200], [600, 200], [600, 600], [200, 600]]] as Array<Array<[number, number]>>;
  const nonzero = citit(placeable(SetPolyFillMode(2), PolyPolygon(...doua)));
  assert.deepEqual([nonzero.cai.length, nonzero.avertismente['nonzero-normalizate']], [1, 1]);
  assert.equal(nonzero.cai[0]?.varfuri.length, 8);
  const parImpar = citit(placeable(PolyPolygon(...doua)));
  assert.deepEqual([parImpar.cai.length, parImpar.avertismente['nonzero-normalizate']], [2, 0]);
  const tras = citit(placeable(SetPolyFillMode(2), CreateBrush(1), SelectObject(0), PolyPolygon(...doua)));
  assert.deepEqual([tras.cai.length, tras.avertismente['nonzero-normalizate']], [2, 0]);
});

test('plafoanele: o cale peste 50 000 de puncte se sare (prea mare); praful și căile fără lungime, numărate', () => {
  const multe = Array.from({ length: 50_001 }, (_, i): [number, number] => [i % 1000, Math.floor(i / 1000)]);
  const r = citesteWmf(wmf([SetMapMode(8), SetWindowExt(1000, 1000), PolyPolygon(multe), Polyline([0, 0], [500, 0])], [0, 0, 1000, 1000, 1000]));
  assert.ok(r.ok);
  assert.equal(r.avertismente['prea-mari'], 1);
  const mici = citit(placeable(Polygon([0, 0], [0, 0], [0, 0]), Polyline([0, 0]), Polygon([500, 500], [500, 500]), Polyline([0, 0], [100, 0])));
  assert.equal(mici.avertismente.degenerate, 3);
  const v: Varf[] = [...(mici.cai[0] as CaleWmf).varfuri];
  assert.equal(v.length, 2);
});
