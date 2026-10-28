/**
 * Ușa DXF (ADR 0101), pe fișiere scrise de mână, grup cu grup: refuzurile, citirea perechilor, unitățile, fiecare entitate
 * (cu OCS-ul oglindit), spline-urile (prinse, neprinse, raționale, de grad mare, doar cu puncte de trecere), blocurile
 * (punctul de bază, matricea, stratul 0, lipsa, ciclul, scara nulă, xref), ce se ascunde și ce se sare, legarea capetelor pe
 * același strat, cercurile normalizate, codificările, plafoanele. Valorile pe hârtie sunt în fiecare probă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteDxf, type CaleDxf, type RezultatDxf } from '../../src/io/dxf.ts';
import { CODURI_AVERTISMENT_DXF, MM_PE_UNITATE, UNITATI_DXF } from '../../src/io/dxfCoduri.ts';
import { PLAFON_IMPORT } from '../../src/io/svgCoduri.ts';
import { PLAFON } from '../../src/model/document.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import {
  abatereElipsa, aproape, arcDxf, arie, cerc, cercArc, distantaLaCale, dxf, elipsa, esantioane, grupuri, inMm, insert, linie, lwpolilinie,
  octeti, polilinie, segmente, spline,
} from './ajutor-dxf.ts';

const ok = (r: RezultatDxf): Extract<RezultatDxf, { ok: true }> => {
  if (!r.ok) assert.fail(`refuzat: ${r.cod}${r.detaliu ? ` (${r.detaliu})` : ''}`);
  return r;
};
const citeste = (entitati: string, alte: Parameters<typeof inMm>[1] = {}) => ok(citesteDxf(inMm(entitati, alte)));
const varfuri = (c: CaleDxf | undefined) => (c ?? assert.fail('lipsește calea')).varfuri.map((v) => [v.p.x, v.p.y, v.s.tip === 'A' ? v.s.bulge : v.s.tip]);
const deg = Math.PI / 180;

/* ── Refuzurile și citirea perechilor ──────────────────────────────────────────────────────────────────────────────── */

test('refuzurile: peste 16 MiB, DXF-ul binar, ce nu e DXF, perechile rupte (cu linia), un fișier fără nimic de importat', () => {
  assert.deepEqual(citesteDxf(new Uint8Array(PLAFON_IMPORT.octeti + 1)), { ok: false, cod: 'octeti', detaliu: String(PLAFON_IMPORT.octeti + 1) });
  const binar = new Uint8Array([...new TextEncoder().encode('AutoCAD Binary DXF\r\n'), 0x1a, 0x00, 0, 1, 2]);
  assert.equal((citesteDxf(binar) as { cod: string }).cod, 'binar');
  assert.equal((citesteDxf(octeti('<svg xmlns="http://www.w3.org/2000/svg"></svg>')) as { cod: string }).cod, 'tip');
  assert.equal((citesteDxf(octeti('nu e un desen')) as { cod: string }).cod, 'tip');
  // Perechi de cod / valoare care nu încep cu o secțiune nu sunt un DXF (mutația „orice text e DXF” trecea de cele de sus).
  assert.equal((citesteDxf(octeti('12\nhello\n')) as { cod: string }).cod, 'tip');
  assert.equal((citesteDxf(octeti(linie(0, 0, 1, 0))) as { cod: string }).cod, 'tip');
  // Linia 5 e un cod fără valoare; linia 3 nu e un număr întreg.
  assert.deepEqual(citesteDxf(octeti('0\nSECTION\n2\nENTITIES\n0')), { ok: false, cod: 'dxf', detaliu: '5' });
  assert.deepEqual(citesteDxf(octeti('0\nSECTION\nX\nENTITIES\n0\nENDSEC\n0\nEOF\n')), { ok: false, cod: 'dxf', detaliu: '3' });
  const gol = citesteDxf(inMm(''));
  assert.equal(gol.ok, false);
  assert.equal((gol as { cod: string }).cod, 'gol');
});

test('citirea perechilor: CRLF ca LF, codurile cu spații în față, comentariile 999, BOM-ul UTF-8; versiunea din $ACADVER', () => {
  const ent = linie(1, 2, 3, 4) + grupuri([999, 'un comentariu']) + cerc(10, 10, 2);
  const f = { antet: [['$ACADVER', 1, 'AC1032'], ['$INSUNITS', 70, 4]] as const, entitati: ent };
  const lf = ok(citesteDxf(octeti(dxf(f))));
  const crlf = ok(citesteDxf(octeti(dxf(f, '\r\n'))));
  assert.deepEqual(crlf.cai, lf.cai);
  assert.equal(lf.versiune, 'AC1032');
  const spatii = dxf(f).split('\n').map((l, i) => (i % 2 === 0 && l !== '' ? `  ${l}` : l)).join('\n');
  assert.deepEqual(ok(citesteDxf(octeti(spatii))).cai, lf.cai);
  assert.deepEqual(ok(citesteDxf(new Uint8Array([0xef, 0xbb, 0xbf, ...octeti(dxf(f))]))).cai, lf.cai);
  assert.equal(lf.cai.length, 2);
});

/* ── Unitățile ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('unitățile: $INSUNITS după tabel (inch 25,4, ft 304,8, mm, cm, m, dm 100); lipsă sau 0: mm, nedeclarate, cu alegerea omului', () => {
  for (const [cod, k] of [[1, 25.4], [2, 304.8], [4, 1], [5, 10], [6, 1000], [14, 100], [9, 0.0254], [10, 914.4]] as const) {
    const r = ok(citesteDxf(octeti(dxf({ antet: [['$INSUNITS', 70, cod]], entitati: linie(0, 0, 1, 0) }))));
    assert.equal(r.unitati.mmPeUnitate, k, `$INSUNITS ${cod}`);
    assert.equal(r.unitati.declarate, true);
    assert.deepEqual(varfuri(r.cai[0]), [[0, 0, 'L'], [k, 0, 'L']]);
    assert.equal(r.avertismente['unitati-nedeclarate'] + r.avertismente['unitati-necunoscute'], 0);
  }
  assert.deepEqual(UNITATI_DXF, ['mm', 'cm', 'm', 'inch', 'ft']);
  assert.deepEqual(MM_PE_UNITATE, { mm: 1, cm: 10, m: 1000, inch: 25.4, ft: 304.8 });
  for (const antet of [[], [['$INSUNITS', 70, 0]]] as const) {
    const r = ok(citesteDxf(octeti(dxf({ antet, entitati: linie(0, 0, 1, 0) }))));
    assert.deepEqual(r.unitati, { mmPeUnitate: 1, declarate: false, cod: antet.length ? 0 : null, unitate: 'mm' });
    assert.equal(r.avertismente['unitati-nedeclarate'], 1);
    const inch = ok(citesteDxf(octeti(dxf({ antet, entitati: linie(0, 0, 1, 0) })), { unitate: 'inch' }));
    assert.deepEqual(inch.unitati, { mmPeUnitate: 25.4, declarate: false, cod: antet.length ? 0 : null, unitate: 'inch' });
    assert.deepEqual(varfuri(inch.cai[0]), [[0, 0, 'L'], [25.4, 0, 'L']]);
  }
  // Declarate: alegerea omului nu schimbă nimic.
  assert.equal(ok(citesteDxf(inMm(linie(0, 0, 1, 0)), { unitate: 'inch' })).unitati.mmPeUnitate, 1);
  // Un cod fără loc în tabel: mm, cu avertismentul, ca nedeclarate (omul alege).
  const necunoscut = ok(citesteDxf(octeti(dxf({ antet: [['$INSUNITS', 70, 99]], entitati: linie(0, 0, 1, 0) }))));
  assert.deepEqual(necunoscut.unitati, { mmPeUnitate: 1, declarate: false, cod: 99, unitate: 'mm' });
  assert.equal(necunoscut.avertismente['unitati-necunoscute'], 1);
  assert.equal(necunoscut.avertismente['unitati-nedeclarate'], 0);
});

/* ── Entitățile ────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('LINE: deschisă, cu stratul ei; Z diferit la capete: proiectată, numărată', () => {
  const r = citeste(linie(1, 2, 3, 4, { strat: 'TAIERE' }));
  assert.deepEqual(r.cai.map((c) => [c.strat, c.inchis]), [['TAIERE', false]]);
  assert.deepEqual(varfuri(r.cai[0]), [[1, 2, 'L'], [3, 4, 'L']]);
  const z = citeste(linie(1, 2, 3, 4, { z: [0, 5] }));
  assert.equal(z.avertismente.proiectate, 1);
  assert.deepEqual(varfuri(z.cai[0]), [[1, 2, 'L'], [3, 4, 'L']]);
  assert.equal(citeste(linie(1, 2, 3, 4, { z: [7, 7] })).avertismente.proiectate, 0);
});

test('CIRCLE: două semicercuri trigonometrice din punctul cel mai din dreapta; în OCS (0, 0, −1), centrul oglindit', () => {
  assert.deepEqual(varfuri(citeste(cerc(10, 20, 5)).cai[0]), [[15, 20, 1], [5, 20, 1]]);
  assert.deepEqual(varfuri(citeste(cerc(10, 20, 5, { extruziune: [0, 0, -1] })).cai[0]), [[-5, 20, 1], [-15, 20, 1]]);
  const r = citesteDxf(inMm(cerc(0, 0, 0)));
  assert.equal((r as { cod: string }).cod, 'gol');
  assert.equal((r as { avertismente: Record<string, number> }).avertismente.degenerate, 1);
  // Un cerc mai mic decât rezoluția (0,01 mm): sărit, numărat.
  const praf = citesteDxf(inMm(cerc(0, 0, 0.001) + linie(0, 0, 1, 0)));
  assert.equal(ok(praf).avertismente['sub-rezolutie'], 1);
});

test('ARC: grade, trigonometric de la start la sfârșit (350° → 10° = 20°); peste 180°, două jumătăți; 0° → 360°, cercul', () => {
  const r = citeste(arcDxf(0, 0, 10, 350, 10));
  const c = r.cai[0];
  assert.ok(c && !c.inchis && c.varfuri.length === 2);
  assert.ok(aproape(c.varfuri[0]!.p, [10 * Math.cos(350 * deg), 10 * Math.sin(350 * deg)], 1e-12));
  assert.ok(aproape(c.varfuri[1]!.p, [10 * Math.cos(10 * deg), 10 * Math.sin(10 * deg)], 1e-12));
  assert.ok(Math.abs((c.varfuri[0]!.s as { bulge: number }).bulge - Math.tan(5 * deg)) <= 1e-15);
  const mare = citeste(arcDxf(0, 0, 10, 0, 270)).cai[0];
  assert.equal(mare?.varfuri.length, 3);
  assert.ok(aproape(mare!.varfuri[1]!.p, [10 * Math.cos(135 * deg), 10 * Math.sin(135 * deg)], 1e-12));
  assert.ok(aproape(mare!.varfuri[2]!.p, [0, -10], 1e-12));
  for (const v of mare!.varfuri.slice(0, 2)) assert.ok(Math.abs((v.s as { bulge: number }).bulge - Math.tan(33.75 * deg)) <= 1e-15);
  // Capetele unui arc de 360° coincid: calea se închide singură, iar arcul întreg e un cerc.
  const tot = citeste(arcDxf(5, 5, 2, 0, 360));
  assert.deepEqual(varfuri(tot.cai[0]), [[7, 5, 1], [3, 5, 1]]);
  assert.equal(tot.cai[0]?.inchis, true);
});

test('ELLIPSE: întreagă, închisă, din cubice pe elipsă; sfertul 0 → π/2; axa mare rotită; în OCS (0, 0, −1), parcursă invers', () => {
  const e = { c: [0, 0] as const, a: 20, b: 10, rot_grade: 0 };
  const intreaga = citeste(elipsa(0, 0, 20, 0, 0.5)).cai[0]!;
  assert.ok(intreaga.inchis && segmente(intreaga).every((s) => s.s.tip === 'C'));
  assert.ok(esantioane(intreaga).every((p) => abatereElipsa(p, e) * e.b <= TOLERANTA_IMPORT * 1.01));
  assert.ok(Math.abs(Math.abs(arie(intreaga)) - Math.PI * 200) <= 1e-5 * Math.PI * 200);
  const sfert = citeste(elipsa(0, 0, 20, 0, 0.5, 0, Math.PI / 2)).cai[0]!;
  assert.ok(!sfert.inchis && aproape(sfert.varfuri[0]!.p, [20, 0], 1e-12) && aproape(sfert.varfuri[sfert.varfuri.length - 1]!.p, [0, 10], 1e-12));
  assert.ok(distantaLaCale({ x: 20 * Math.cos(Math.PI / 4), y: 10 * Math.sin(Math.PI / 4) }, sfert) <= TOLERANTA_IMPORT);
  // Axa mare (0, 20): axa mică e N × axa mare · raport = (−10, 0); la π/2, punctul (−10, 0).
  const rotita = citeste(elipsa(0, 0, 0, 20, 0.5, 0, Math.PI / 2)).cai[0]!;
  assert.ok(aproape(rotita.varfuri[0]!.p, [0, 20], 1e-12) && aproape(rotita.varfuri[rotita.varfuri.length - 1]!.p, [-10, 0], 1e-12));
  // N = (0, 0, −1): axa mică e (0, −10); sfertul merge de la (20, 0) la (0, −10), pe sub axa mare.
  const ocs = citeste(elipsa(0, 0, 20, 0, 0.5, 0, Math.PI / 2, { extruziune: [0, 0, -1] })).cai[0]!;
  assert.ok(aproape(ocs.varfuri[0]!.p, [20, 0], 1e-12) && aproape(ocs.varfuri[ocs.varfuri.length - 1]!.p, [0, -10], 1e-12));
  assert.ok(distantaLaCale({ x: 20 * Math.cos(Math.PI / 4), y: -10 * Math.sin(Math.PI / 4) }, ocs) <= TOLERANTA_IMPORT);
  assert.equal(citeste(elipsa(0, 0, 20, 0, 0.5)).avertismente['arce-eliptice'], 1);
});

test('LWPOLYLINE: închisă (steagul 1), cu bulge; ultimul vârf peste primul nu dă un segment nul; semicercul în OCS (0, 0, −1)', () => {
  const r = citeste(lwpolilinie([[0, 0], [10, 0, Math.tan(Math.PI / 8)], [20, 10], [20, 20], [0, 0]], true));
  assert.deepEqual(varfuri(r.cai[0]), [[0, 0, 'L'], [10, 0, Math.tan(Math.PI / 8)], [20, 10, 'L'], [20, 20, 'L']]);
  assert.equal(r.cai[0]?.inchis, true);
  const ocs = citeste(lwpolilinie([[10, 0, 1], [20, 0]], false, { extruziune: [0, 0, -1] })).cai[0]!;
  assert.deepEqual(varfuri(ocs), [[-10, 0, -1], [-20, 0, 'L']]);
  // Semicercul oglindit merge pe sub coardă: prin (−15, −5).
  assert.ok(distantaLaCale({ x: -15, y: -5 }, ocs) <= 1e-12);
  // Lățimile (43, 40, 41) nu sunt geometrie.
  const lata = citeste(grupuri([0, 'LWPOLYLINE'], [8, '0'], [90, 2], [70, 0], [43, 2.5], [10, 0], [20, 0], [40, 1], [41, 1], [10, 5], [20, 0]));
  assert.deepEqual(varfuri(lata.cai[0]), [[0, 0, 'L'], [5, 0, 'L']]);
});

test('POLYLINE (R12): 2D cu bulge, închisă; 3D (steagul 8) proiectată; plasele 3D sărite; din spline (4), fără cadrul de control (16)', () => {
  const semidisc = citeste(polilinie([[600, 0], [640, 0, 1]], 1)).cai[0]!;
  assert.deepEqual(varfuri(semidisc), [[600, 0, 'L'], [640, 0, 1]]);
  assert.ok(semidisc.inchis && Math.abs(Math.abs(arie(semidisc)) - Math.PI * 200) <= 1e-9);
  const p3 = citeste(polilinie([[0, 0, 0, 0, 32], [10, 0, 0, 5, 32], [10, 10, 0, 9, 32]], 8));
  assert.equal(p3.avertismente.proiectate, 1);
  assert.deepEqual(varfuri(p3.cai[0]), [[0, 0, 'L'], [10, 0, 'L'], [10, 10, 'L']]);
  for (const steag of [16, 64]) {
    const r = citesteDxf(inMm(polilinie([[0, 0], [1, 0], [1, 1]], steag) + linie(0, 0, 1, 1)));
    assert.equal(ok(r).avertismente['sarit-3d'], 1, `steagul ${steag}`);
    assert.equal(ok(r).cai.length, 1);
  }
  const fit = citeste(polilinie([[0, 0, 0, 0, 16], [10, 10, 0, 0, 16], [20, 0, 0, 0, 16], [0, 0, 0, 0, 8], [5, 4, 0, 0, 8], [10, 5, 0, 0, 8],
    [15, 4, 0, 0, 8], [20, 0, 0, 0, 8]], 4));
  assert.deepEqual(varfuri(fit.cai[0]), [[0, 0, 'L'], [5, 4, 'L'], [10, 5, 'L'], [15, 4, 'L'], [20, 0, 'L']]);
});

/** De Boor (aici, nu din aplicație): punctul spline-ului rațional la t, cu nodurile, ponderile și gradul lui. */
function deBoor(p: number, U: readonly number[], P: ReadonlyArray<readonly [number, number]>, w: readonly number[], t: number): { x: number; y: number } {
  let k = p;
  while (k + 1 < U.length - p - 1 && t >= (U[k + 1] as number)) k++;
  const d = Array.from({ length: p + 1 }, (_, j) => {
    const q = P[j + k - p] as readonly [number, number], wj = w[j + k - p] as number;
    return [q[0] * wj, q[1] * wj, wj];
  });
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = j + k - p;
      const den = (U[i + p - r + 1] as number) - (U[i] as number);
      const al = den === 0 ? 0 : (t - (U[i] as number)) / den;
      d[j] = (d[j] as number[]).map((v, s) => (1 - al) * ((d[j - 1] as number[])[s] as number) + al * v);
    }
  }
  const h = d[p] as number[];
  return { x: (h[0] as number) / (h[2] as number), y: (h[1] as number) / (h[2] as number) };
}

test('SPLINE prinsă: Bézier-ul cubic exact, cel pătratic ridicat la cubic (exact), gradul 1 ca linii', () => {
  const cub = citeste(spline(3, [0, 0, 0, 0, 1, 1, 1, 1], [[0, 0], [1, 2], [3, 2], [4, 0]])).cai[0]!;
  assert.deepEqual(cub.varfuri, [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 1, y: 2 }, c2: { x: 3, y: 2 } } }, { p: { x: 4, y: 0 }, s: { tip: 'L' } }]);
  const patr = citeste(spline(2, [0, 0, 0, 1, 1, 1], [[0, 0], [2, 4], [4, 0]])).cai[0]!;
  const s0 = patr.varfuri[0]!.s as { c1: { x: number; y: number }; c2: { x: number; y: number } };
  assert.ok(aproape(s0.c1, [4 / 3, 8 / 3], 1e-15) && aproape(s0.c2, [8 / 3, 8 / 3], 1e-15));
  assert.deepEqual(varfuri(citeste(spline(1, [0, 0, 1, 2, 2], [[0, 0], [10, 0], [10, 10]])).cai[0]), [[0, 0, 'L'], [10, 0, 'L'], [10, 10, 'L']]);
});

test('SPLINE neprinsă: uniformă deschisă (domeniul [U_p, U_{m−p}]) și închisă periodică, exacte pe de Boor', () => {
  const P = [[0, 0], [40, 0], [40, 30], [0, 30]] as const;
  const deschisa = citeste(spline(3, [0, 1, 2, 3, 4, 5, 6, 7], P)).cai[0]!;
  assert.equal(deschisa.inchis, false);
  for (let i = 0; i <= 50; i++) {
    const q = deBoor(3, [0, 1, 2, 3, 4, 5, 6, 7], P, [1, 1, 1, 1], 3 + i / 50);
    assert.ok(distantaLaCale(q, deschisa) <= 1e-9, `t = ${3 + i / 50}`);
  }
  assert.ok(aproape(deschisa.varfuri[0]!.p, deBoor(3, [0, 1, 2, 3, 4, 5, 6, 7], P, [1, 1, 1, 1], 3), 1e-12));
  const Pp = [...P, P[0], P[1], P[2]];
  const U = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const per = citeste(spline(3, U, Pp, { steaguri: 3 })).cai[0]!;
  assert.equal(per.inchis, true);
  assert.ok(segmente(per).every((s) => s.s.tip === 'C'));
  for (let i = 0; i <= 80; i++) assert.ok(distantaLaCale(deBoor(3, U, Pp, Pp.map(() => 1), 3 + (4 * i) / 80), per) <= 1e-9);
});

test('SPLINE rațională: cercul NURBS e cerc; o conică necirculară și gradul 4 se aproximează cu cubice sub toleranța importului', () => {
  const w = Math.SQRT1_2;
  const cps = [[25, 0], [25, 25], [0, 25], [-25, 25], [-25, 0], [-25, -25], [0, -25], [25, -25], [25, 0]] as const;
  const cercN = citeste(spline(2, [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4], cps, { ponderi: [1, w, 1, w, 1, w, 1, w, 1] }));
  // `+ 0`: o rotunjire a lui −1e-15 dă −0, pe care deepEqual îl deosebește de 0.
  assert.deepEqual(varfuri(cercN.cai[0]).map((v) => v.map((x) => (typeof x === 'number' ? Math.round(x * 1e9) / 1e9 + 0 : x))), [[25, 0, 1], [-25, 0, 1]]);
  assert.equal(cercN.avertismente['spline-aproximate'], 0);
  const P = [[0, 0], [10, 10], [20, 0]] as const;
  const conica = citeste(spline(2, [0, 0, 0, 1, 1, 1], P, { ponderi: [1, 2, 1] }));
  assert.equal(conica.avertismente['spline-aproximate'], 1);
  const c = conica.cai[0]!;
  for (let i = 0; i <= 97; i++) assert.ok(distantaLaCale(deBoor(2, [0, 0, 0, 1, 1, 1], P, [1, 2, 1], i / 97), c) <= TOLERANTA_IMPORT, `t = ${i / 97}`);
  assert.ok(aproape(c.varfuri[0]!.p, [0, 0], 0) && aproape(c.varfuri[c.varfuri.length - 1]!.p, [20, 0], 1e-12));
  const P4 = [[0, 0], [10, 20], [20, -20], [30, 20], [40, 0]] as const;
  const U4 = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
  const g4 = citeste(spline(4, U4, P4));
  assert.equal(g4.avertismente['spline-aproximate'], 1);
  for (let i = 0; i <= 97; i++) assert.ok(distantaLaCale(deBoor(4, U4, P4, [1, 1, 1, 1, 1], i / 97), g4.cai[0]!) <= TOLERANTA_IMPORT, `t = ${i / 97}`);
});

test('SPLINE rațională: arcul de 120° (ponderea cos 60°) e un arc exact, trigonometric, prin (10, 0); fără aproximare', () => {
  // Centrul (0, 0), R10, de la −60° la 60°: capetele (5, ∓5√3), mijlocul de control la R / cos 60° = 20 pe axa x.
  const r = citeste(spline(2, [0, 0, 0, 1, 1, 1], [[5, -5 * Math.sqrt(3)], [20, 0], [5, 5 * Math.sqrt(3)]], { ponderi: [1, 0.5, 1] }));
  assert.equal(r.avertismente['spline-aproximate'], 0);
  const c = r.cai[0]!;
  assert.equal(c.varfuri.length, 2);
  const b = (c.varfuri[0]!.s as { tip: string; bulge: number });
  assert.equal(b.tip, 'A');
  assert.ok(Math.abs(b.bulge - Math.tan(Math.PI / 6)) <= 1e-12, String(b.bulge));
  assert.ok(distantaLaCale({ x: 10, y: 0 }, c) <= 1e-12);
  const k = cercArc(c.varfuri[0]!.p, c.varfuri[1]!.p, b.bulge);
  assert.ok(aproape(k.c, [0, 0], 1e-12) && Math.abs(k.r - 10) <= 1e-12);
});

test('arcele vecine pe același cerc, în sensuri opuse (90° dus, 45° întors), nu se unesc', () => {
  const q = Math.tan(Math.PI / 8), w = -Math.tan(Math.PI / 16), m = 10 * Math.cos(Math.PI / 4);
  const c = citeste(lwpolilinie([[10, 0, q], [0, 10, w], [m, m]], false)).cai[0]!;
  assert.deepEqual(varfuri(c), [[10, 0, q], [0, 10, w], [m, m, 'L']]);
});

test('SPLINE fără puncte de control (doar de trecere), cu nodurile sau ponderile greșite: sărite, numărate', () => {
  const fit = citesteDxf(inMm(spline(3, [], [], { potrivire: [[0, 0], [5, 5], [10, 0]] }) + linie(0, 0, 1, 0)));
  assert.equal(ok(fit).avertismente['spline-fara-control'], 1);
  const noduri = citesteDxf(inMm(spline(3, [0, 0, 0, 1, 1, 1], [[0, 0], [1, 2], [3, 2], [4, 0]]) + linie(0, 0, 1, 0)));
  assert.equal(ok(noduri).avertismente['spline-invalide'], 1);
  // Un nod în plus (9 pentru 4 puncte de grad 3), cu domeniul [0, 1] valid: tot invalid, nu citit pe alături.
  const inPlus = citesteDxf(inMm(spline(3, [0, 0, 0, 0, 0.5, 1, 1, 1, 1], [[0, 0], [1, 2], [3, 2], [4, 0]]) + linie(0, 0, 1, 0)));
  assert.equal(ok(inPlus).avertismente['spline-invalide'], 1);
  const ponderi = citesteDxf(inMm(spline(3, [0, 0, 0, 0, 1, 1, 1, 1], [[0, 0], [1, 2], [3, 2], [4, 0]], { ponderi: [1, 1] }) + linie(0, 0, 1, 0)));
  assert.equal(ok(ponderi).avertismente['spline-invalide'], 1);
  assert.equal(ok(ponderi).cai.length, 1);
});

/* ── Blocurile ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('INSERT: punctul de bază, scara și rotirea (T·R·S·T(−bază)); stratul 0 ia stratul INSERT-ului, celelalte rămân', () => {
  const blocuri = [{ nume: 'B', baza: [5, 0] as const, entitati: linie(0, 0, 10, 0) + linie(0, 0, 0, 1, { strat: 'Y' }) }];
  const r = citeste(insert('B', 100, 100, { scara: [2, 2], rotire: 90, strat: 'X' }), { blocuri });
  // (0, 0) → (−5, 0)·2 → R90 → (0, −10) → (100, 90); (10, 0) → (10, 0) → (0, 10) → (100, 110).
  const [a, b] = r.cai;
  assert.ok(aproape(a!.varfuri[0]!.p, [100, 90], 1e-12) && aproape(a!.varfuri[1]!.p, [100, 110], 1e-12));
  assert.deepEqual(r.cai.map((c) => c.strat), ['X', 'Y']);
  assert.ok(aproape(b!.varfuri[0]!.p, [100, 90], 1e-12) && aproape(b!.varfuri[1]!.p, [98, 90], 1e-12));
  // Numele blocurilor și ale straturilor nu țin de majuscule (ca în AutoCAD).
  assert.equal(citeste(insert('b', 0, 0), { blocuri }).cai.length, 2);
});

test('INSERT: blocul lipsă, ciclul (un bloc care se inserează pe sine), scara nulă, xref-ul: sărite, numărate, fără agățare', () => {
  assert.equal(ok(citesteDxf(inMm(insert('NU', 0, 0) + linie(0, 0, 1, 0)))).avertismente['blocuri-lipsa'], 1);
  const ciclu = ok(citesteDxf(inMm(insert('C', 0, 0), { blocuri: [{ nume: 'C', entitati: linie(0, 0, 1, 0) + insert('C', 10, 0) }] })));
  assert.ok(ciclu.avertismente['blocuri-adanci'] >= 1);
  assert.equal(ciclu.cai.length, 16);
  assert.equal(ok(citesteDxf(inMm(insert('B', 0, 0, { scara: [0, 1] }) + linie(0, 0, 1, 0), { blocuri: [{ nume: 'B', entitati: linie(0, 0, 1, 0) }] }))).avertismente.singulare, 1);
  assert.equal(ok(citesteDxf(inMm(insert('X', 0, 0) + linie(0, 0, 1, 0), { blocuri: [{ nume: 'X', steaguri: 4, entitati: '' }] }))).avertismente.xref, 1);
});

test('INSERT în matrice (MINSERT): fiecare celulă, cu distanțele rotite odată cu inserarea; atributele (ATTRIB … SEQEND) sărite ca text', () => {
  const blocuri = [{ nume: 'B', entitati: cerc(0, 0, 1) }];
  const r = citeste(insert('B', 0, 0, { matrice: { coloane: 3, randuri: 2, dx: 50, dy: 30 }, rotire: 90 }), { blocuri });
  const centre = r.cai.map((c) => [Math.round(c.varfuri[0]!.p.x - 1), Math.round(c.varfuri[0]!.p.y)]);
  assert.deepEqual(centre, [[0, 0], [0, 50], [0, 100], [-30, 0], [-30, 50], [-30, 100]]);
  const atr = grupuri([0, 'INSERT'], [8, '0'], [66, 1], [2, 'B'], [10, 0], [20, 0], [30, 0])
    + grupuri([0, 'ATTRIB'], [8, '0'], [10, 0], [20, 0], [30, 0], [40, 2.5], [1, 'P-12'], [2, 'COD'])
    + grupuri([0, 'SEQEND'], [8, '0']) + linie(5, 5, 6, 6);
  const ra = citeste(atr, { blocuri });
  assert.equal(ra.avertismente['sarit-text'], 1);
  assert.equal(ra.cai.length, 2);
});

test('INSERT cu scară neuniformă: cercul blocului e elipsă (cubice, numărate), linia rămâne linie', () => {
  const r = citeste(insert('B', 0, 0, { scara: [2, 1] }), { blocuri: [{ nume: 'B', entitati: cerc(0, 0, 10) + linie(0, 0, 10, 0) }] });
  const el = r.cai.find((c) => c.inchis)!;
  assert.ok(segmente(el).every((s) => s.s.tip === 'C'));
  assert.ok(esantioane(el).every((p) => abatereElipsa(p, { c: [0, 0], a: 20, b: 10, rot_grade: 0 }) * 10 <= TOLERANTA_IMPORT * 1.01));
  assert.equal(r.avertismente['arce-eliptice'], 1);
  assert.equal(r.avertismente['cubice-din-arce'], segmente(el).length);
  assert.deepEqual(varfuri(r.cai.find((c) => !c.inchis)), [[0, 0, 'L'], [20, 0, 'L']]);
});

/* ── Ce se ascunde, ce se sare ─────────────────────────────────────────────────────────────────────────────────────── */

test('ascunse: stratul oprit (culoare negativă) sau înghețat, entitatea invizibilă (60 = 1); INSERT pe strat înghețat, întreg', () => {
  const straturi = [{ nume: 'OPRIT', culoare: -7 }, { nume: 'INGHETAT', steaguri: 1 }];
  const r = citeste(cerc(0, 0, 5, { strat: 'oprit' }) + linie(0, 0, 9, 0, { strat: 'INGHETAT' }) + cerc(20, 0, 5, { alte: [[60, 1]] }) + linie(0, 5, 9, 5), { straturi });
  assert.equal(r.avertismente.ascunse, 3);
  assert.equal(r.cai.length, 1);
  const blocuri = [{ nume: 'B', entitati: cerc(0, 0, 5) + cerc(0, 0, 3, { strat: 'V' }) }];
  const inghetat = ok(citesteDxf(inMm(insert('B', 0, 0, { strat: 'INGHETAT' }) + linie(0, 5, 9, 5), { straturi, blocuri })));
  assert.equal(inghetat.avertismente.ascunse, 1);
  assert.equal(inghetat.cai.length, 1);
  // Pe un strat oprit (nu înghețat), INSERT-ul ascunde doar ce stă pe stratul 0; restul se vede (ca în AutoCAD).
  const oprit = citeste(insert('B', 0, 0, { strat: 'OPRIT' }), { straturi, blocuri });
  assert.equal(oprit.avertismente.ascunse, 1);
  assert.deepEqual(oprit.cai.map((c) => c.strat), ['V']);
});

test('sărite, numărate pe feluri: textul, hașurile, cotele, punctele, 3D-ul, imaginile, restul; spațiul hârtiei (67 = 1); planul înclinat', () => {
  const ent = (tip: string, ...g: ReadonlyArray<readonly [number, string | number]>) => grupuri([0, tip], [8, '0'], ...g);
  const r = citeste(ent('TEXT', [10, 0], [20, 0], [40, 2], [1, 'A']) + ent('MTEXT', [10, 0], [20, 0], [1, 'B']) + ent('ATTDEF', [1, 'C'])
    + ent('HATCH') + ent('SOLID') + ent('DIMENSION') + ent('LEADER') + ent('POINT', [10, 0], [20, 0]) + ent('3DFACE') + ent('3DSOLID')
    + ent('REGION') + ent('MESH') + ent('IMAGE') + ent('XLINE') + ent('RAY') + linie(0, 0, 0, 1, { alte: [[67, 1]] })
    + cerc(0, 0, 5, { extruziune: [1, 0, 0] }) + linie(0, 0, 1, 0));
  assert.deepEqual(
    Object.fromEntries((['sarit-text', 'sarit-hasura', 'sarit-cota', 'sarit-punct', 'sarit-3d', 'sarit-imagine', 'sarit-altele', 'hartie', 'inclinate'] as const).map((k) => [k, r.avertismente[k]])),
    { 'sarit-text': 3, 'sarit-hasura': 2, 'sarit-cota': 2, 'sarit-punct': 1, 'sarit-3d': 4, 'sarit-imagine': 1, 'sarit-altele': 2, hartie: 1, inclinate: 1 },
  );
  assert.equal(r.cai.length, 1);
});

test('o entitate cu un număr invalid e sărită și numărată; celelalte se citesc', () => {
  const r = citeste(grupuri([0, 'LINE'], [8, '0'], [10, 'abc'], [20, 0], [11, 1], [21, 1]) + linie(0, 0, 1, 0));
  assert.equal(r.avertismente['eroare-date'], 1);
  assert.equal(r.cai.length, 1);
});

/* ── Legarea capetelor ─────────────────────────────────────────────────────────────────────────────────────────────── */

test('legarea: 4 linii amestecate fac dreptunghiul închis; în T nu se leagă; pe straturi diferite nu se leagă', () => {
  const d = citeste(linie(60, 0, 60, 40) + linie(0, 40, 0, 0) + linie(0, 0, 60, 0) + linie(0, 40, 60, 40));
  assert.equal(d.cai.length, 1);
  assert.ok(d.cai[0]!.inchis && segmente(d.cai[0]!).length === 4);
  assert.ok(Math.abs(Math.abs(arie(d.cai[0]!)) - 2400) <= 1e-9);
  assert.equal(d.avertismente.unite, 4);
  const t = citeste(linie(0, 0, 10, 0) + linie(10, 0, 20, 0) + linie(10, 0, 10, 10));
  assert.equal(t.cai.length, 3);
  assert.equal(t.avertismente.unite, 0);
  const s = citeste(linie(0, 0, 10, 0, { strat: 'A' }) + linie(10, 0, 20, 0, { strat: 'B' }));
  assert.deepEqual(s.cai.map((c) => [c.strat, c.varfuri.length]), [['A', 2], ['B', 2]]);
});

test('legarea: două linii una după alta fac o cale; un gol de 0,005 mm se închide cu o linie (numărată); sub 1e-6 mm, capetele se lipesc; peste 0,01 mm, nu', () => {
  assert.deepEqual(varfuri(citeste(linie(0, 0, 10, 0) + linie(10, 0, 20, 0)).cai[0]), [[0, 0, 'L'], [10, 0, 'L'], [20, 0, 'L']]);
  const gol = citeste(linie(0, 0, 10, 0) + linie(10.005, 0, 20, 0));
  assert.deepEqual(varfuri(gol.cai[0]), [[0, 0, 'L'], [10, 0, 'L'], [10.005, 0, 'L'], [20, 0, 'L']]);
  assert.equal(gol.avertismente.goluri, 1);
  const lipit = citeste(linie(0, 0, 10, 0) + linie(10 + 1e-7, 0, 20, 0));
  assert.deepEqual(varfuri(lipit.cai[0]), [[0, 0, 'L'], [10 + 1e-7, 0, 'L'], [20, 0, 'L']]);
  assert.equal(lipit.avertismente.goluri, 0);
  assert.equal(citeste(linie(0, 0, 10, 0) + linie(10.02, 0, 20, 0)).cai.length, 2);
  // Sensul celei de-a doua bucăți se întoarce după nevoie: capăt la capăt.
  assert.deepEqual(varfuri(citeste(linie(0, 0, 10, 0) + linie(20, 0, 10, 0)).cai[0]), [[0, 0, 'L'], [10, 0, 'L'], [20, 0, 'L']]);
});

test('cercurile din bucăți: două semicercuri ARC, LWPOLYLINE-ul cu 2 vârfuri și bulge 1, sferturile pe același cerc, unite', () => {
  assert.deepEqual(varfuri(citeste(arcDxf(0, 0, 10, 0, 180) + arcDxf(0, 0, 10, 180, 360)).cai[0]), [[10, 0, 1], [-10, 0, 1]]);
  assert.deepEqual(varfuri(citeste(lwpolilinie([[3, 0, -1], [-3, 0, -1]], true)).cai[0]), [[3, 0, 1], [-3, 0, 1]]);
  const sferturi = citeste(lwpolilinie([[10, 0, Math.tan(Math.PI / 8)], [0, 10, Math.tan(Math.PI / 8)], [-10, 0]], false)).cai[0]!;
  assert.equal(sferturi.varfuri.length, 2);
  assert.ok(Math.abs((sferturi.varfuri[0]!.s as { bulge: number }).bulge - 1) <= 1e-12);
  const k = cercArc(sferturi.varfuri[0]!.p, sferturi.varfuri[1]!.p, 1);
  assert.ok(aproape(k.c, [0, 0], 1e-12) && Math.abs(k.r - 10) <= 1e-12);
});

test('arcul plat (R 20 000 mm, peste latura documentului) se scrie cu cubice, numărate', () => {
  const r = citeste(arcDxf(0, -20_000, 20_000, 89.9, 90.1));
  assert.equal(r.avertismente['arce-plate'], 1);
  assert.ok(segmente(r.cai[0]!).every((s) => s.s.tip === 'C'));
  assert.ok(distantaLaCale({ x: 0, y: 0 }, r.cai[0]!) <= TOLERANTA_IMPORT);
});

/* ── Codificările ──────────────────────────────────────────────────────────────────────────────────────────────────── */

test('codificările: UTF-8 de la R2007 (AC1021); pagina de cod a antetului înainte (ANSI_1250: 0xC3 = Ă); \\U+0102', () => {
  const r = ok(citesteDxf(octeti(dxf({ antet: [['$ACADVER', 1, 'AC1032'], ['$INSUNITS', 70, 4]], entitati: linie(0, 0, 1, 0, { strat: 'GRAVURĂ' }) }))));
  assert.equal(r.cai[0]?.strat, 'GRAVURĂ');
  // R2007 (AC1021) e primul UTF-8, chiar cu o pagină de cod în antet.
  const r2007 = ok(citesteDxf(octeti(dxf({ antet: [['$ACADVER', 1, 'AC1021'], ['$DWGCODEPAGE', 3, 'ANSI_1252'], ['$INSUNITS', 70, 4]], entitati: linie(0, 0, 1, 0, { strat: 'GRAVURĂ' }) }))));
  assert.equal(r2007.cai[0]?.strat, 'GRAVURĂ');
  const text = dxf({ antet: [['$ACADVER', 1, 'AC1015'], ['$DWGCODEPAGE', 3, 'ANSI_1250'], ['$INSUNITS', 70, 4]], entitati: linie(0, 0, 1, 0, { strat: 'GRAVUR@' }) });
  const b = octeti(text).map((x) => (x === 0x40 ? 0xc3 : x));
  assert.equal(ok(citesteDxf(b)).cai[0]?.strat, 'GRAVURĂ');
  assert.equal(citeste(linie(0, 0, 1, 0, { strat: 'GRAVUR\\U+0102' })).cai[0]?.strat, 'GRAVURĂ');
});

/* ── Plafoanele ────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('plafoanele: departe de origine (peste 10 000 km) refuzat; o cale peste 50 000 de vârfuri sărită; o bombă de blocuri oprită repede', () => {
  assert.equal((citesteDxf(inMm(linie(0, 0, 2e10, 0))) as { cod: string }).cod, 'departe');
  // Calea prea mare e sărită înainte de legare (linia de alături nu se leagă de ea).
  const v = Array.from({ length: PLAFON.varfuriCale + 1 }, (_, i) => [i, i % 2] as const);
  const mare = ok(citesteDxf(inMm(lwpolilinie(v, false) + linie(0, 0, 0, -1))));
  assert.equal(mare.avertismente['prea-mari'], 1);
  assert.deepEqual(varfuri(mare.cai[0]), [[0, 0, 'L'], [0, -1, 'L']]);
  const o = Array.from({ length: 1000 }, (_, i) => linie(i, 0, i, 1)).join('');
  const bomba = { blocuri: [{ nume: 'O', entitati: o }, { nume: 'M', entitati: Array.from({ length: 1000 }, (_, i) => insert('O', 0, i * 2)).join('') }] };
  const t0 = performance.now();
  const r = citesteDxf(inMm(insert('M', 0, 0), bomba));
  assert.equal((r as { cod: string }).cod, 'plafon');
  assert.ok(performance.now() - t0 < 5_000, `${(performance.now() - t0).toFixed(0)} ms`);
});

test('raportul: aceleași coduri, în ordinea dialogului, fiecare numărat de la 0', () => {
  const r = citeste(linie(0, 0, 1, 0));
  assert.deepEqual(Object.keys(r.avertismente), [...CODURI_AVERTISMENT_DXF]);
  assert.ok(Object.values(r.avertismente).every((n) => n === 0 || n === 1));
  assert.equal(r.avertismente.deschise, 1);
});
