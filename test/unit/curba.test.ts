import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/conturBaza.ts';
import { copiiPeCurba, locuriPeCurba, lungimeCurba, suport } from '../../src/model/curba.ts';
import { istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { cutieElement } from '../../src/model/forme.ts';
import { instantaCopiei, motivRetea, type Retea } from '../../src/model/retea.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { motivCopiereRetea } from '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Copierea de-a lungul unei curbe (ADR 0066): pe hârtie, 5 locuri pe linia de 100 mm cad la 0, 25, 50, 75, 100; semicercul de
 * rază 10 dă (10, 0) / 90°, (0, 10) / 180°, (−10, 0) / 270°; pe dreptunghiul 100 × 60 (perimetrul 320), 4 locuri la pas de 80,
 * cu tangenta segmentului care pleacă din vârf; pe o cubică, distanțele dintre locuri (pe curbă) sunt egale; copiile pun
 * centrul cutiei formelor în fiecare loc, rotite cu tangenta; curba nu se copiază; motivele; un singur pas de anulare.
 */

const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const aproape = (a: number, b: number, mesaj: string, eps = 1e-9): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const unghiAproape = (a: number, b: number, mesaj: string): void => { const d = (((a - b) % 360) + 540) % 360 - 180; assert.ok(Math.abs(d) < 1e-9, `${mesaj}: ${a} ≠ ${b}`); };

test('linia de 100 mm: 5 locuri la pas de 25, cu tangenta 0°; un loc = începutul', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(100, 0), s: L }] };
  const l = locuriPeCurba(c, 5);
  assert.deepEqual(l.map((x) => x.p.x), [0, 25, 50, 75, 100]);
  for (const x of l) { aproape(x.p.y, 0, 'y'); unghiAproape(x.unghi, 0, 'tangenta'); }
  assert.deepEqual(locuriPeCurba(c, 1).map((x) => x.p), [P(0, 0)]);
  assert.deepEqual(locuriPeCurba({ inchis: false, varfuri: [{ p: P(3, 3), s: L }, { p: P(3, 3), s: L }] }, 4), [], 'fără lungime');
});

test('semicercul de rază 10: (10, 0) / 90°, (0, 10) / 180°, (−10, 0) / 270°; lungimea 10π', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: P(10, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-10, 0), s: L }] };
  aproape(lungimeCurba(c), 10 * Math.PI, 'lungimea');
  const l = locuriPeCurba(c, 3);
  for (const [k, [x, y, u]] of [[10, 0, 90], [0, 10, 180], [-10, 0, 270]].entries()) {
    aproape(l[k]!.p.x, x!, `x ${k}`); aproape(l[k]!.p.y, y!, `y ${k}`); unghiAproape(l[k]!.unghi, u!, `unghi ${k}`);
  }
  // Același arc, parcurs invers (bulge negativ): tangenta se întoarce.
  const invers = locuriPeCurba({ inchis: false, varfuri: [{ p: P(-10, 0), s: { tip: 'A', bulge: -1 } }, { p: P(10, 0), s: L }] }, 3);
  unghiAproape(invers[1]!.unghi, 0, 'mijlocul, spre dreapta');
  aproape(invers[1]!.p.y, 10, 'tot sus');
});

test('dreptunghiul 100 × 60 (închis): 4 locuri la pas de 80, în vârf tangenta segmentului care pleacă; cercul: 4 locuri la 90°', () => {
  const l = locuriPeCurba(conturDreptunghi(0, 0, 100, 60, 0), 4);
  const asteptat = [[0, 0, 0], [80, 0, 0], [100, 60, 180], [20, 60, 180]];
  for (const [k, [x, y, u]] of asteptat.entries()) {
    aproape(l[k]!.p.x, x!, `x ${k}`); aproape(l[k]!.p.y, y!, `y ${k}`); unghiAproape(l[k]!.unghi, u!, `unghi ${k}`);
  }
  const cerc = locuriPeCurba(conturCerc(0, 0, 10), 4);
  aproape(lungimeCurba(conturCerc(0, 0, 10)), 20 * Math.PI, 'circumferința');
  for (const x of cerc) {
    aproape(Math.hypot(x.p.x, x.p.y), 10, 'pe cerc');
    // Tangenta e perpendiculară pe rază: unghiul razei + 90° (trigonometric) sau − 90°.
    const r = (Math.atan2(x.p.y, x.p.x) * 180) / Math.PI;
    const d = Math.abs((((x.unghi - r) % 360) + 360) % 360 - 90);
    assert.ok(d < 1e-9 || Math.abs(d - 180) < 1e-9, `perpendiculară: ${x.unghi} față de ${r}`);
  }
  const pas = Math.hypot(cerc[1]!.p.x - cerc[0]!.p.x, cerc[1]!.p.y - cerc[0]!.p.y);
  aproape(pas, 10 * Math.SQRT2, 'coarda unui sfert');
});

test('pe o cubică, locurile sunt la distanțe egale pe curbă (măsurate independent, pe 200 000 de bucăți)', () => {
  const c: Contur = { inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(10, 40), c2: P(90, -30), } }, { p: P(100, 20), s: L }] };
  const l = locuriPeCurba(c, 6);
  // Lungimea pe o linie frântă foarte deasă, și pozițiile pe ea, fără nimic din modul.
  const b = (t: number) => { const m = 1 - t; return P(3 * m * m * t * 10 + 3 * m * t * t * 90 + t * t * t * 100, 3 * m * m * t * 40 + 3 * m * t * t * -30 + t * t * t * 20); };
  const N = 200_000;
  let total = 0, prev = b(0);
  const cumul: { s: number; p: { x: number; y: number } }[] = [{ s: 0, p: prev }];
  for (let k = 1; k <= N; k++) { const q = b(k / N); total += Math.hypot(q.x - prev.x, q.y - prev.y); cumul.push({ s: total, p: q }); prev = q; }
  aproape(lungimeCurba(c), total, 'lungimea', 1e-6);
  const laS = (s: number) => cumul.find((x) => x.s >= s)!.p;
  l.forEach((x, k) => {
    const q = laS((total * k) / 5);
    assert.ok(Math.hypot(q.x - x.p.x, q.y - x.p.y) < 1e-3, `locul ${k}: ${JSON.stringify(x.p)} față de ${JSON.stringify(q)}`);
  });
  aproape(l[5]!.p.x, 100, 'capătul x'); aproape(l[5]!.p.y, 20, 'capătul y');
});

test('copiile: centrul cutiei formelor în fiecare loc, rotite cu tangenta (sau nu); curba nu se copiază; motivele', () => {
  const stoc = { latime: 300, inaltime: 200, grosime: 18 };
  const doc = docDin(stoc,
    { id: 'p', forma: { tip: 'dreptunghi', latime: 10, inaltime: 4, razaColt: 0 }, matrice: { ...ID, e: 10, f: 150 } },
    { id: 'k', forma: { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-100, 0), s: L }] }, matrice: { ...ID, e: 200, f: 50 } });
  const r = { curba: 'k', numar: 3, roteste: true };
  const c = copiiPeCurba(doc, 0, ['p', 'k'], r);
  assert.ok(typeof c !== 'string');
  assert.deepEqual(c.instante.map((i) => i.id), ['p'], 'doar forma, fără curbă');
  // Semicercul de rază 50 cu centrul (150, 50): locurile (200, 50) / 90°, (150, 100) / 180°, (100, 50) / 270°.
  const p = doc.foi[0]!.instante.find((i) => i.id === 'p')!;
  const centrulCopiei = (k: number) => { const i = instantaCopiei(p, c.copii[k]!); const e = elementeFoaie({ ...doc, foi: [{ ...doc.foi[0]!, instante: [{ ...p, ...i }] }] }, 0)[0]!; const b = cutieElement(e); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, rotire: i.rotire }; };
  for (const [k, [x, y, u]] of [[200, 50, 90], [150, 100, 180], [100, 50, 270]].entries()) {
    const q = centrulCopiei(k);
    aproape(q.x, x!, `x ${k}`, 1e-9); aproape(q.y, y!, `y ${k}`, 1e-9); unghiAproape(q.rotire, u!, `rotirea ${k}`);
  }
  const fara = copiiPeCurba(doc, 0, ['p', 'k'], { ...r, roteste: false });
  assert.ok(typeof fara !== 'string' && fara.copii.every((k) => k.unghi === 0), 'fără rotire');
  assert.equal(copiiPeCurba(doc, 0, ['k'], r), 'fara-forme');
  assert.equal(copiiPeCurba(doc, 0, ['p'], r), 'curba', 'curba nu e în selecție');
  const comp = { ...doc, piese: doc.piese.map((x) => (x.id === 'k' ? { ...x, radacina: { tip: 'grup' as const, id: 'k', matrice: ID, copii: [x.radacina, { ...x.radacina, id: 'k2' }] } } : x)) };
  assert.equal(copiiPeCurba(comp, 0, ['p', 'k'], r), 'curba-compusa');
  assert.equal(motivRetea({ fel: 'curba', curba: 'k', numar: 0, roteste: true }), 'copii');
  assert.equal(motivRetea({ fel: 'curba', curba: '', numar: 3, roteste: true }), 'curba');
  assert.equal(motivRetea({ fel: 'curba', curba: 'k', numar: 1000, roteste: true }), null);
});

test('poziția față de curbă (ADR 0074 §3): pe ea mutată cu distanța; la stânga / la dreapta, tangente sau la distanță, exact', () => {
  const stoc = { latime: 300, inaltime: 200, grosime: 18 };
  // Dreptunghiul 10 × 4 și linia de la (50, 100) la (150, 100), spre dreapta: stânga mersului e +y.
  const doc = docDin(stoc,
    { id: 'p', forma: { tip: 'dreptunghi', latime: 10, inaltime: 4, razaColt: 0 }, matrice: { ...ID, e: 10, f: 150 } },
    { id: 'k', forma: { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(100, 0), s: L }] }, matrice: { ...ID, e: 50, f: 100 } });
  const p = doc.foi[0]!.instante.find((i) => i.id === 'p')!;
  const cutii = (r: Retea & { fel: 'curba' }) => {
    const c = copiiPeCurba(doc, 0, ['p', 'k'], r);
    assert.ok(typeof c !== 'string', String(c));
    return c.copii.map((k) => cutieElement(elementeFoaie({ ...doc, foi: [{ ...doc.foi[0]!, instante: [{ ...p, ...instantaCopiei(p, k) }] }] }, 0)[0]!));
  };
  const r = { fel: 'curba' as const, curba: 'k', numar: 3, roteste: true };
  // Pe ea: centrul pe linie (y 98…102); mutată cu 3: y 101…105.
  for (const b of cutii(r)) { aproape(b.minY, 98, 'centru'); aproape(b.maxY, 102, 'centru'); }
  for (const b of cutii({ ...r, pozitie: 'centru', distanta: 3 })) aproape(b.minY, 101, 'centru + 3');
  // La stânga, tangente: marginea de jos pe linie; la 2 mm: y 102…106. La dreapta: marginea de sus pe linie (y 96…100).
  for (const b of cutii({ ...r, pozitie: 'stanga', distanta: 0 })) { aproape(b.minY, 100, 'stânga'); aproape(b.maxY, 104, 'stânga'); }
  for (const b of cutii({ ...r, pozitie: 'stanga', distanta: 2 })) aproape(b.minY, 102, 'stânga + 2');
  for (const b of cutii({ ...r, pozitie: 'dreapta', distanta: 0 })) { aproape(b.maxY, 100, 'dreapta'); aproape(b.minY, 96, 'dreapta'); }
  // Pe semicercul de rază 50 (spre stânga, trigonometric: stânga = spre centru), rotite cu tangenta: la stânga, tangente,
  // centrul fiecărei copii la 50 − 2 de centrul cercului (jumătatea înălțimii, 2, spre interior).
  const sc = docDin(stoc,
    { id: 'p', forma: { tip: 'dreptunghi', latime: 10, inaltime: 4, razaColt: 0 }, matrice: { ...ID, e: 10, f: 150 } },
    { id: 'k', forma: { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-100, 0), s: L }] }, matrice: { ...ID, e: 200, f: 50 } });
  const c = copiiPeCurba(sc, 0, ['p', 'k'], { curba: 'k', numar: 3, roteste: true, pozitie: 'stanga', distanta: 0 });
  assert.ok(typeof c !== 'string');
  for (const k of c.copii) aproape(Math.hypot(k.centru.x + k.dx - 150, k.centru.y + k.dy - 50), 48, 'raza centrului');
  // Un cerc R5 nerotit, pe o linie la 45°, la dreapta: tangent exact (suportul cercului), nu după cutie (care ar da 5√2).
  const diag = docDin(stoc,
    { id: 'o', forma: { tip: 'cerc', raza: 5 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'k', forma: { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(100, 100), s: L }] }, matrice: { ...ID, e: 50, f: 50 } });
  const d = copiiPeCurba(diag, 0, ['o', 'k'], { curba: 'k', numar: 2, roteste: false, pozitie: 'dreapta', distanta: 0 });
  assert.ok(typeof d !== 'string');
  for (const k of d.copii) {
    const cx = k.centru.x + k.dx, cy = k.centru.y + k.dy;
    // Distanța de la centrul cercului la dreapta y = x (cu semn: dreapta mersului e sub ea): −5.
    aproape((cy - cx) / Math.SQRT2, -5, 'cercul tangent la dreapta');
  }
  // Suportul pe o cubică: cocoașa (0, 0) → (20, 0) cu punctele de control (0, 10), (20, 10) urcă până la 30·t(1 − t) = 7,5 la
  // t = ½ (capetele stau pe 0, deci fără rădăcinile lui ⟨B′(t), v⟩ ar ieși 0).
  const cocoasa: Contur = { inchis: true, varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(0, 10), c2: P(20, 10) } }, { p: P(20, 0), s: L }] };
  aproape(suport([cocoasa], P(0, 0), P(0, 1)), 7.5, 'suportul cubicei în sus');
  aproape(suport([cocoasa], P(0, 0), P(0, -1)), 0, 'în jos, capetele');
  assert.equal(motivRetea({ fel: 'curba', curba: 'k', numar: 3, roteste: true, distanta: Number.NaN }), 'distanta-curba');
  assert.equal(motivRetea({ fel: 'curba', curba: 'k', numar: 3, roteste: true, pozitie: 'stanga', distanta: -2 }), null);
});

test('prin `document.copiaza-in-retea`: copiile intră într-un pas, sunt alese cu originalele (fără curbă); verdictul comun', () => {
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const doc = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'p', forma: { tip: 'cerc', raza: 3 }, matrice: { ...ID, e: 10, f: 150 } },
    { id: 'k', forma: { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(200, 0), s: L }] }, matrice: { ...ID, e: 50, f: 50 } });
  let h = istoricNou(doc);
  let s: readonly string[] = ['p', 'k'];
  const retea: Retea = { fel: 'curba', curba: 'k', numar: 5, roteste: false };
  const c: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => s, selecteaza: (ids) => { s = ids; }, retea: () => retea };
  assert.equal(motivCopiereRetea(doc, s, retea, false), null);
  assert.deepEqual(ruleaza(R, 'document.copiaza-in-retea', c), { ok: true });
  const noi = h.doc.foi[0]!.instante.filter((i) => i.id !== 'p' && i.id !== 'k');
  assert.equal(noi.length, 5);
  assert.deepEqual(noi.map((i) => [i.x, i.y]), [[50, 50], [100, 50], [150, 50], [200, 50], [250, 50]], 'cercurile pe linie, la pas de 50');
  assert.ok(!s.includes('k') && s.includes('p') && s.length === 6, 'alese: originalul și copiile, fără curbă');
  assert.equal(h.trecut.length, 1);
  assert.equal(motivCopiereRetea(doc, ['k'], retea, false), 'motiv.nicio-selectie', 'doar curba: nimic de copiat');
});
