import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formeScalate, transforma } from '../../src/model/transformare.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, FormaDoc } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { elementeFoaie, matriceInstanta } from '../../src/model/lume.ts';
import { aplica } from '../../src/geom/matrice.ts';
import { conturElement, cutieElement } from '../../src/model/forme.ts';
import { elipsa, parametri } from '../../src/model/formeParametrice.ts';

/** Transformările (ADR 0052), pure: rotirea, scalarea exactă a geometriei și refuzurile, cu valori pe hârtie. */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const doc1 = (forma: FormaDoc, e = 10, f = 20): Document => docDin(STOC, { id: 'p', forma, matrice: { ...ID, e, f } });
const R = { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 } as const;

test('rotirea: unghiul se adună, locul se rotește în jurul centrului', () => {
  const r = transforma(doc1(R), 0, ['p'], { fel: 'rotire', unghi: 90, centru: { x: 0, y: 0 } });
  assert.ok(r.ok);
  const i = r.ok ? r.instante[0] : undefined;
  assert.ok(Math.abs((i?.x ?? 0) + 20) < 1e-12 && Math.abs((i?.y ?? 0) - 10) < 1e-12);
  assert.equal(i?.rotire, 90);
  const r2 = transforma(doc1(R), 0, ['p'], { fel: 'rotire', unghi: -450, centru: { x: 10, y: 20 } });
  assert.equal(r2.ok ? r2.instante[0]?.rotire : -1, 270);
});

test('scalarea dreptunghiului: laturile, locul față de ancoră; neuniformă pe o instanță rotită cu 90° își schimbă axele', () => {
  const r = transforma(doc1(R), 0, ['p'], { fel: 'scalare', sx: 1.5, sy: 2, ancora: { x: 10, y: 20 } });
  assert.ok(r.ok);
  if (!r.ok) return;
  const f = r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : null;
  assert.deepEqual(f, { tip: 'dreptunghi', latime: 150, inaltime: 120, razaColt: 0 });
  assert.deepEqual([r.instante[0]?.x, r.instante[0]?.y], [10, 20], 'ancora în colț: colțul rămâne');
  // Rotită cu 90°: sx al foii scalează înălțimea piesei.
  const d = doc1(R);
  const i0 = d.foi[0]?.instante[0];
  if (i0) i0.rotire = 90;
  const q = transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } });
  const g = q.ok && q.piese[0]?.radacina.tip === 'element' ? q.piese[0].radacina.forma : null;
  assert.deepEqual(g, { tip: 'dreptunghi', latime: 100, inaltime: 120, razaColt: 0 });
  assert.deepEqual(q.ok ? [q.instante[0]?.x, q.instante[0]?.y] : [], [20, 20]);
});

test('cercul și calea: uniform exact; cubicele își scalează punctele de control; arcele trec doar uniform', () => {
  const c = transforma(doc1({ tip: 'cerc', raza: 10 }), 0, ['p'], { fel: 'scalare', sx: 3, sy: 3, ancora: { x: 0, y: 0 } });
  assert.deepEqual(c.ok && c.piese[0]?.radacina.tip === 'element' ? c.piese[0].radacina.forma : null, { tip: 'cerc', raza: 30 });
  const cale: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 1, y: 2 }, c2: { x: 3, y: 4 } } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 10 }, s: { tip: 'L' } },
  ] };
  const k = transforma(doc1(cale), 0, ['p'], { fel: 'scalare', sx: 2, sy: 0.5, ancora: { x: 10, y: 20 } });
  const fk = k.ok && k.piese[0]?.radacina.tip === 'element' ? k.piese[0].radacina.forma : null;
  assert.ok(fk && fk.tip === 'cale');
  if (fk?.tip === 'cale') {
    assert.deepEqual(fk.varfuri.map((v) => v.p), [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }]);
    assert.deepEqual(fk.varfuri[0]?.s, { tip: 'C', c1: { x: 2, y: 1 }, c2: { x: 6, y: 2 } });
  }
  const arc: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 10, y: 0 }, s: { tip: 'A', bulge: 1 } }] };
  // Scalat uniform, arcul rămâne arc (bulge-ul nu se schimbă); neuniform, devine curbe (ADR 0240 §F.27, mai jos).
  const uni = transforma(doc1(arc), 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } });
  const fu = uni.ok && uni.piese[0]?.radacina.tip === 'element' ? uni.piese[0].radacina.forma : null;
  assert.ok(fu?.tip === 'cale' && fu.varfuri.every((v) => v.s.tip === 'A'));
});

/** Cât se abate o cale de cubice (în lume, după scalarea (sx, sy)) de arcul de cerc din care vine (centrul c, raza r, nescalat). */
function abatereArc(f: FormaDoc, c: { x: number; y: number }, r: number, sx: number, sy: number, m = 1): number {
  let max = 0;
  if (f.tip !== 'cale') return Infinity;
  const v = f.varfuri, n = v.length;
  for (let k = 0; k < n; k++) {
    const a = v[k], b = v[(k + 1) % n];
    if (!a || !b || a.s.tip !== 'C') continue;
    const s = a.s;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t;
      const q = {
        x: u * u * u * a.p.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * b.p.x,
        y: u * u * u * a.p.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * b.p.y,
      };
      // Înapoi pe cercul nescalat: abaterea radială de acolo, înmulțită cu cea mai mare scară (și cu scara grupului, `m`).
      const d = Math.abs(Math.hypot(q.x / sx - c.x, q.y / sy - c.y) - r);
      max = Math.max(max, d * Math.max(sx, sy) * m);
    }
  }
  return max;
}

test('arcele unei căi scalate neuniform devin curbe sub 0,001 mm (ADR 0240 §F.27), și într-un grup scalat', () => {
  // Semicercul R 10 de la (0, 0) la (20, 0) (bulge 1, centrul (10, 0)), închis cu o linie, scalat cu (2; 1).
  const semi: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }] };
  const r = transforma(doc1(semi), 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } });
  const f = r.ok && r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : null;
  assert.ok(f?.tip === 'cale' && f.varfuri.every((v) => v.s.tip !== 'A'), 'niciun arc nu rămâne');
  assert.ok(f && abatereArc(f, { x: 10, y: 0 }, 10, 2, 1) <= 0.001, 'sub toleranța proiectului');
  // Capetele rămân exact: (0, 0) și (40, 0).
  assert.deepEqual(f?.tip === 'cale' ? [f.varfuri[0]?.p, f.varfuri.at(-1)?.p] : [], [{ x: 0, y: 0 }, { x: 40, y: 0 }]);
  // Într-un grup scalat de 50 de ori (matricea nodului), abaterea în lume rămâne sub 0,001 mm.
  const d = docDin(STOC, { id: 'p', forma: semi, matrice: { ...ID, e: 10, f: 20 } });
  const pz = d.piese[0]!;
  const grup = { tip: 'grup' as const, id: 'g', matrice: { a: 50, b: 0, c: 0, d: 50, e: 0, f: 0 }, copii: [{ ...pz.radacina, id: 'e' }] };
  const dg: Document = { ...d, piese: [{ ...pz, radacina: grup }] };
  const rg = transforma(dg, 0, ['p'], { fel: 'scalare', sx: 3, sy: 1, ancora: { x: 0, y: 0 } });
  assert.ok(rg.ok);
  const eg = rg.ok && rg.piese[0]?.radacina.tip === 'grup' ? rg.piese[0].radacina.copii[0] : null;
  assert.ok(eg?.tip === 'element' && abatereArc(eg.forma, { x: 10, y: 0 }, 10, 3, 1, 50) <= 0.001);
});

test('colțurile rotunjite la o scalare neuniformă (ADR 0240 §F.28): raza rămâne, rămâne mereu, sau se scalează (curbe)', () => {
  const RC = { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 10 } as const;
  const forma = (t: Parameters<typeof transforma>[3]) => { const r = transforma(doc1(RC), 0, ['p'], t); return r.ok && r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : r; };
  const sc = (sx: number, sy: number, colturi?: 'pastreaza' | 'scaleaza') => ({ fel: 'scalare' as const, sx, sy, ancora: { x: 0, y: 0 }, ...(colturi ? { colturi } : {}) });
  // Felul a (implicit): neuniform, raza rămâne 10 (dreptunghi exact, editabil); uniform, crește cu forma, ca înainte.
  assert.deepEqual(forma(sc(1.5, 1)), { tip: 'dreptunghi', latime: 150, inaltime: 60, razaColt: 10 });
  assert.deepEqual(forma(sc(2, 2)), { tip: 'dreptunghi', latime: 200, inaltime: 120, razaColt: 20 });
  // Un colț care nu mai încape (15 < 2 · 10) se refuză, cu motiv.
  assert.deepEqual(forma(sc(0.15, 1)), { ok: false, motiv: 'colturi-nu-incap' });
  // Felul b: raza rămâne mereu, și la scalarea uniformă.
  assert.deepEqual(forma(sc(2, 2, 'pastreaza')), { tip: 'dreptunghi', latime: 200, inaltime: 120, razaColt: 10 });
  assert.deepEqual(forma(sc(1.5, 1, 'pastreaza')), { tip: 'dreptunghi', latime: 150, inaltime: 60, razaColt: 10 });
  // Felul c: uniform, raza crește; neuniform, o cale: liniile laturilor și colțurile sferturi de elipsă (15 / 10), din curbe,
  // fiecare la cel mult 0,001 mm de elipsa exactă.
  assert.deepEqual(forma(sc(2, 2, 'scaleaza')), { tip: 'dreptunghi', latime: 200, inaltime: 120, razaColt: 20 });
  const c = forma(sc(1.5, 1, 'scaleaza'));
  assert.ok(c && 'tip' in c && c.tip === 'cale' && c.varfuri.every((v) => v.s.tip !== 'A'));
  if (!c || !('tip' in c) || c.tip !== 'cale') return;
  assert.equal(c.varfuri.filter((v) => v.s.tip === 'L').length, 4, 'cele patru laturi');
  // Fiecare colț (centrul lui nescalat, de exemplu (90, 50) în dreapta-sus) are curbele lui, pe sfertul de elipsă 15 / 10.
  const varfuri = c.varfuri;
  for (const centru of [{ x: 90, y: 50 }, { x: 10, y: 50 }, { x: 10, y: 10 }, { x: 90, y: 10 }]) {
    const curbe = varfuri.filter((v) => v.s.tip === 'C' && Math.hypot(v.p.x / 1.5 - centru.x, v.p.y - centru.y) <= 10 + 1e-6);
    assert.ok(curbe.length >= 1);
  }
  assert.ok(abatereColturi(c) <= 0.001);
});

test('ce spune eticheta mânerelor (ADR 0240 §F, `formeScalate`): cercul, arcele unei căi, colțurile rotunjite, pe instanțele alese', () => {
  const semi: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }] };
  // Arcul ultimului vârf al unei căi deschise nu se desenează: nu e un arc.
  const deschisa: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 20, y: 0 }, s: { tip: 'A', bulge: 1 } }] };
  const d = docDin(STOC,
    { id: 'c', forma: { tip: 'cerc', raza: 10 }, matrice: ID }, { id: 'a', forma: semi, matrice: ID },
    { id: 'rc', forma: { ...R, razaColt: 10 }, matrice: ID }, { id: 'r', forma: R, matrice: ID }, { id: 'o', forma: deschisa, matrice: ID });
  const nimic = { cerc: false, arce: false, colturi: false, text: false, rotite: false };
  assert.deepEqual(formeScalate(d, 0, ['r', 'o']), nimic);
  assert.deepEqual(formeScalate(d, 0, ['c']), { ...nimic, cerc: true });
  assert.deepEqual(formeScalate(d, 0, ['a', 'r']), { ...nimic, arce: true });
  assert.deepEqual(formeScalate(d, 0, ['rc']), { ...nimic, colturi: true });
  assert.deepEqual(formeScalate(d, 0, ['c', 'a', 'rc']), { cerc: true, arce: true, colturi: true, text: false, rotite: false });
  assert.deepEqual(formeScalate(d, 0, []), nimic);
  // O instanță rotită oblic (6.V↑d, §F.30): pe o axă, trece prin geometrie (devine o cale); la 90°, nu.
  d.foi[0]!.instante.find((i) => i.id === 'r')!.rotire = 30;
  d.foi[0]!.instante.find((i) => i.id === 'o')!.rotire = 90;
  assert.deepEqual(formeScalate(d, 0, ['r']), { ...nimic, rotite: true });
  assert.deepEqual(formeScalate(d, 0, ['o']), nimic);
  // Și un nod rotit oblic în piesă, într-o instanță dreaptă.
  const u45 = Math.SQRT1_2;
  const pr = d.piese.find((p) => p.id === 'c')!;
  const dg: Document = { ...d, piese: d.piese.map((p) => (p === pr ? { ...p, radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [{ ...pr.radacina, id: 'e', matrice: { a: u45, b: u45, c: -u45, d: u45, e: 0, f: 0 } }] } } : p)) };
  assert.deepEqual(formeScalate(dg, 0, ['c']), { ...nimic, cerc: true, rotite: true });
});

/** Abaterea colțurilor curbe ale dreptunghiului 100 × 60 cu R 10, scalat cu (1,5; 1): fiecare cubică, față de cercul colțului ei. */
function abatereColturi(f: FormaDoc): number {
  if (f.tip !== 'cale') return Infinity;
  const centre = [{ x: 90, y: 50 }, { x: 10, y: 50 }, { x: 10, y: 10 }, { x: 90, y: 10 }];
  let max = 0;
  const v = f.varfuri, n = v.length;
  for (let k = 0; k < n; k++) {
    const a = v[k], b = v[(k + 1) % n];
    if (!a || !b || a.s.tip !== 'C') continue;
    const m = { x: (a.p.x + b.p.x) / 2 / 1.5, y: (a.p.y + b.p.y) / 2 };
    const centru = centre.reduce((x, y) => (Math.hypot(m.x - y.x, m.y - y.y) < Math.hypot(m.x - x.x, m.y - x.y) ? y : x));
    const una: FormaDoc = { tip: 'cale', inchis: false, varfuri: [a, { p: b.p, s: { tip: 'L' } }] };
    max = Math.max(max, abatereArc({ ...una, inchis: true }, centru, 10, 1.5, 1));
  }
  return max;
}

test('cercul scalat neuniform devine elipsa generatorului, recunoscută de panou; elipsa se reface din generator (ADR 0240 §F)', () => {
  const forma = (r: ReturnType<typeof transforma>) => (r.ok && r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : null);
  // Cercul R 20 în (10, 20), scalat cu (1,5; 1) față de (0, 0): exact elipsa uneltei, cu razele 30 și 20; locul (15, 20).
  const r = transforma(doc1({ tip: 'cerc', raza: 20 }), 0, ['p'], { fel: 'scalare', sx: 1.5, sy: 1, ancora: { x: 0, y: 0 } });
  assert.deepEqual(forma(r), elipsa({ x: 0, y: 0 }, 30, 20));
  assert.deepEqual(r.ok ? [r.instante[0]?.x, r.instante[0]?.y] : [], [15, 20]);
  const f = forma(r);
  const pf = f ? parametri(f) : null;
  assert.ok(pf?.tip === 'elipsa' && Math.abs(pf.centru.x) < 1e-9 && Math.abs(pf.centru.y) < 1e-9 && Math.abs(pf.rx - 30) < 1e-9 && Math.abs(pf.ry - 20) < 1e-9, 'panoul o recunoaște ca elipsă');
  // Pe o instanță rotită cu 90°, sx al foii scalează axa y a piesei: razele 20 și 30.
  const d = doc1({ tip: 'cerc', raza: 20 });
  const i0 = d.foi[0]?.instante[0];
  if (i0) i0.rotire = 90;
  assert.deepEqual(forma(transforma(d, 0, ['p'], { fel: 'scalare', sx: 1.5, sy: 1, ancora: { x: 0, y: 0 } })), elipsa({ x: 0, y: 0 }, 20, 30));
  // Elipsa 30 / 20 (recunoscută), scalată cu (2/3; 1): din nou generatorul, cu razele egale, deci un cerc R 20.
  const cerc = forma(transforma(doc1(elipsa({ x: 0, y: 0 }, 30, 20)), 0, ['p'], { fel: 'scalare', sx: 2 / 3, sy: 1, ancora: { x: 0, y: 0 } }));
  assert.ok(cerc?.tip === 'cerc' && Math.abs(cerc.raza - 20) < 1e-9);
  // O elipsă descentrată în piesă își scalează și centrul: (5, −4) cu (2; 0,5) → (10, −2), razele 60 și 10; tot o elipsă a
  // generatorului (recunoscută cu aceiași parametri, sub 1e-9).
  const desc = forma(transforma(doc1(elipsa({ x: 5, y: -4 }, 30, 20)), 0, ['p'], { fel: 'scalare', sx: 2, sy: 0.5, ancora: { x: 0, y: 0 } }));
  const pd = desc ? parametri(desc) : null;
  assert.ok(pd?.tip === 'elipsa' && Math.abs(pd.centru.x - 10) < 1e-9 && Math.abs(pd.centru.y + 2) < 1e-9 && Math.abs(pd.rx - 60) < 1e-9 && Math.abs(pd.ry - 10) < 1e-9);
  // Scalată uniform, elipsa își scalează punctele de control, ca înainte (G-code-ul formelor de azi nu se schimbă).
  const u = forma(transforma(doc1(elipsa({ x: 0, y: 0 }, 30, 20)), 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } }));
  const e0 = elipsa({ x: 0, y: 0 }, 30, 20);
  assert.ok(u?.tip === 'cale' && e0.tip === 'cale' && u.varfuri.length === e0.varfuri.length);
  // Documentul de după trece de ușă.
  assert.ok(r.ok);
  if (r.ok) {
    const doc = doc1({ tip: 'cerc', raza: 20 });
    const dupa = { ...doc, piese: r.piese, foi: [{ ...doc.foi[0]!, instante: r.instante }] };
    assert.ok(incarca(JSON.parse(JSON.stringify(dupa))).ok);
  }
});

test('o formă rotită oblic, scalată pe o axă (ADR 0240 §F.30, 6.V↑d): scalarea în axele foii intră în geometrie, ca înclinarea', () => {
  // Dreptunghiul 100 × 60 din (10, 20), rotit cu 30°, scalat cu (2; 1) față de (0, 0): instanța (locul, rotirea) rămâne, iar
  // geometria devine o cale cu fiecare vârf, în lume, egal cu vârful de dinainte, scalat.
  const d = doc1(R);
  const i0 = d.foi[0]!.instante[0]!;
  i0.rotire = 30;
  const W = matriceInstanta(i0);
  const r = transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.instante, [], 'instanța rămâne');
  const f = r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : null;
  assert.ok(f?.tip === 'cale' && f.inchis && f.varfuri.length === 4);
  if (f?.tip !== 'cale') return;
  const scalate = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }].map((p) => { const w = aplica(W, p); return { x: 2 * w.x, y: w.y }; });
  for (const v of f.varfuri) {
    const w = aplica(W, v.p);
    assert.ok(scalate.some((s) => Math.abs(s.x - w.x) < 1e-9 && Math.abs(s.y - w.y) < 1e-9), JSON.stringify(w));
  }
  // Uniform, ca înainte: exact, prin instanță.
  assert.ok(transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } }).ok, 'uniform merge și oblic');
  // Un cerc R 10 în (50, 50), rotit cu 30°, scalat cu (2; 1) față de centrul lui: curbe la cel mult 0,001 mm de elipsa 20 / 10
  // din lume; documentul de după trece de ușă.
  const dc = doc1({ tip: 'cerc', raza: 10 }, 50, 50);
  dc.foi[0]!.instante[0]!.rotire = 30;
  const Wc = matriceInstanta(dc.foi[0]!.instante[0]!);
  const rc = transforma(dc, 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 50, y: 50 } });
  assert.ok(rc.ok);
  if (!rc.ok) return;
  const fc = rc.piese[0]?.radacina.tip === 'element' ? rc.piese[0].radacina.forma : null;
  assert.ok(fc?.tip === 'cale' && fc.varfuri.every((v) => v.s.tip === 'C'));
  if (fc?.tip !== 'cale') return;
  let max = 0;
  fc.varfuri.forEach((a, k) => {
    const b = fc.varfuri[(k + 1) % fc.varfuri.length]!;
    if (a.s.tip !== 'C') return;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t, s = a.s;
      const q = aplica(Wc, {
        x: u * u * u * a.p.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * b.p.x,
        y: u * u * u * a.p.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * b.p.y,
      });
      max = Math.max(max, Math.abs(Math.hypot((q.x - 50) / 2, q.y - 50) - 10) * 2);
    }
  });
  assert.ok(max <= 0.001, String(max));
  assert.ok(incarca(JSON.parse(JSON.stringify({ ...dc, piese: rc.piese }))).ok);
  // Un nod rotit oblic într-un grup (instanța la 0°): la fel, prin geometrie, fără refuz.
  const dg = docDin(STOC, { id: 'p', forma: R, matrice: { ...ID, e: 10, f: 20 } });
  const pz = dg.piese[0]!;
  const u45 = Math.SQRT1_2;
  const grup = { tip: 'grup' as const, id: 'g', matrice: { ...ID }, copii: [{ ...pz.radacina, id: 'e', matrice: { a: u45, b: u45, c: -u45, d: u45, e: 0, f: 0 } }] };
  const rg = transforma({ ...dg, piese: [{ ...pz, radacina: grup }] }, 0, ['p'], { fel: 'scalare', sx: 1, sy: 3, ancora: { x: 0, y: 0 } });
  assert.ok(rg.ok);
  const eg = rg.ok && rg.piese[0]?.radacina.tip === 'grup' ? rg.piese[0].radacina.copii[0] : null;
  assert.ok(eg?.tip === 'element' && eg.forma.tip === 'cale');
});

test('refuzurile: scara zero sau negativă, piesa împărțită', () => {
  for (const s of [0, -1, Number.NaN]) assert.deepEqual(transforma(doc1(R), 0, ['p'], { fel: 'scalare', sx: s, sy: 1, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'scara-invalida' });
  const imp = doc1(R);
  imp.foi[0]?.instante.push({ id: 'q', piesa: 'p', x: 0, y: 0, rotire: 0 });
  assert.deepEqual(transforma(imp, 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'piesa-impartita' });
});

test('un arc mărit peste latura documentului devine cubice, pe cercul lui, sub toleranța importului; documentul trece de ușă (ADR 0102)', () => {
  /** Calea mărită de 10 ori din origine, cu arcul (coarda `c` pe axa X, bulge `k`) devenit cubice: vârfurile ei. */
  const marita = (c: number, k: number): FormaDoc & { tip: 'cale' } => {
    const cale: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: k } }, { p: { x: c, y: 0 }, s: { tip: 'L' } }] };
    const r = transforma(doc1(cale, 0, 0), 0, ['p'], { fel: 'scalare', sx: 10, sy: 10, ancora: { x: 0, y: 0 } });
    const f = r.ok && r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : null;
    if (f?.tip !== 'cale') throw new Error('scalarea n-a dat o cale');
    assert.deepEqual([f.varfuri[0]?.p, f.varfuri[f.varfuri.length - 1]?.p], [{ x: 0, y: 0 }, { x: 10 * c, y: 0 }]);
    assert.ok(f.varfuri.slice(0, -1).every((v) => v.s.tip === 'C'));
    return f;
  };
  /**
   * Cât de departe de cercul arcului mărit ajunge cea mai rea cubică (21 de puncte pe fiecare, cu mijlocul, unde stă eroarea).
   * Pe hârtie: săgeata s = β·C / 2, raza R = (C / 4)·(β + 1/β) pe coarda mărită C; bulge pozitiv = trigonometric, deci centrul
   * stă la stânga coardei (în sus), în (C / 2, R − s), iar arcul coboară la (C / 2, −s).
   */
  const departe = (f: FormaDoc & { tip: 'cale' }, c: number, k: number): number => {
    const C = 10 * c, s = (k * C) / 2, raza = (C / 4) * (k + 1 / k);
    let max = 0;
    for (const [i, v] of f.varfuri.slice(0, -1).entries()) {
      if (v.s.tip !== 'C') continue;
      const a: { x: number; y: number } = v.p;
      const b: { x: number; y: number } = (f.varfuri[i + 1] ?? v).p;
      const { c1, c2 } = v.s;
      for (let j = 0; j <= 20; j++) {
        const t = j / 20, u = 1 - t;
        const x = u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x;
        const y = u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y;
        max = Math.max(max, Math.abs(Math.hypot(x - C / 2, y - (raza - s)) - raza));
      }
    }
    return max;
  };
  // Coarda 10 mm, bulge 1/800: raza (c / 4)·(β + 1/β) ≈ 2 000 mm, sub latură. Mărit de 10 ori: coarda 100, raza ≈ 20 000 mm,
  // peste latura documentului (10 000), deci schema l-ar refuza (DXF-ul owner-ului, 28.10: piesa nu se mai mărea).
  const k = 1 / 800;
  const f = marita(10, k);
  assert.ok(departe(f, 10, k) <= 1.01e-6);
  // Un arc larg: baleiajul 0,3 rad (bulge tan 0,075), coarda 360 mm, raza ≈ 1 204 mm; mărit, raza ≈ 12 045 mm. Pe hârtie,
  // eroarea a n cubice e R·2·sin⁶(φ / 4n) / (27·cos²(φ / 4n)): 0,00016 mm cu una, 0,0000025 cu două, 0,0000002 cu trei:
  // trei cubice, sub toleranța importului (0,000001).
  const larg = Math.tan(0.075);
  const g = marita(360, larg);
  assert.equal(g.varfuri.length, 4);
  assert.ok(departe(g, 360, larg) <= 1.01e-6, `${departe(g, 360, larg)} mm de cerc`);
  const d = doc1({ tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: k } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }] }, 0, 0);
  const r = transforma(d, 0, ['p'], { fel: 'scalare', sx: 10, sy: 10, ancora: { x: 0, y: 0 } });
  assert.ok(r.ok);
  if (!r.ok) return;
  const nou: Document = { ...d, piese: r.piese.slice(), foi: [{ ...d.foi[0], id: 'f1', stoc: STOC, instante: r.instante.slice() }] };
  const u = incarca(JSON.parse(JSON.stringify(nou)));
  assert.ok(u.ok, u.ok ? '' : u.motiv);
  // Un arc care rămâne sub latură își păstrează bulge-ul (doar se mărește).
  const mic = transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } });
  const fm = mic.ok && mic.piese[0]?.radacina.tip === 'element' ? mic.piese[0].radacina.forma : null;
  assert.deepEqual(fm?.tip === 'cale' ? fm.varfuri : null, [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: k } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }]);
});

test('documentul după o scalare trece de ușă', () => {
  const d = doc1(R);
  const r = transforma(d, 0, ['p'], { fel: 'scalare', sx: 1.25, sy: 0.75, ancora: { x: 60, y: 50 } });
  assert.ok(r.ok);
  if (!r.ok) return;
  const nou: Document = { ...d, piese: r.piese.slice(), foi: [{ ...d.foi[0], id: 'f1', stoc: STOC, instante: r.instante.slice() }] };
  const u = incarca(JSON.parse(JSON.stringify(nou)));
  assert.ok(u.ok, u.ok ? '' : u.motiv);
});

// ── Oglindirea (ADR 0054) ────────────────────────────────────────────────────────────────────────────────────────────

/** Documentul cu piesele și instanțele întoarse de `transforma` puse în locul celor vechi. */
function cuRezultat(d: Document, t: Parameters<typeof transforma>[3], ids: readonly string[]): Document {
  const r = transforma(d, 0, ids, t);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return d;
  const piese = new Map(r.piese.map((p) => [p.id, p]));
  const inst = new Map(r.instante.map((i) => [i.id, i]));
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return { ...d, piese: d.piese.map((p) => piese.get(p.id) ?? p), foi: [{ ...f, instante: f.instante.map((i) => inst.get(i.id) ?? i) }] };
}

test('oglindirea: locul în oglindă, reflexia în rădăcina piesei, rotirea rămâne; de două ori = documentul de la început', () => {
  const d = doc1(R, 10, 20);
  const o = cuRezultat(d, { fel: 'oglindire', directie: 'orizontal', centru: { x: 0, y: 0 } }, ['p']);
  assert.deepEqual([o.foi[0]?.instante[0]?.x, o.foi[0]?.instante[0]?.y, o.foi[0]?.instante[0]?.rotire], [-10, 20, 0]);
  assert.deepEqual(o.piese[0]?.radacina.matrice, { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  // Cutia în lume: 10…110 × 20…80 oglindită față de x = 0.
  const e = elementeFoaie(o, 0)[0];
  assert.ok(e);
  if (e) assert.deepEqual(cutieElement(e), { minX: -110, minY: 20, maxX: -10, maxY: 80 });
  // De două ori, pe aceeași axă: exact documentul de la început.
  assert.deepEqual(cuRezultat(o, { fel: 'oglindire', directie: 'orizontal', centru: { x: 0, y: 0 } }, ['p']), d);
  const v = cuRezultat(d, { fel: 'oglindire', directie: 'vertical', centru: { x: 0, y: 50 } }, ['p']);
  assert.deepEqual([v.foi[0]?.instante[0]?.x, v.foi[0]?.instante[0]?.y], [10, 80]);
  assert.deepEqual(v.piese[0]?.radacina.matrice, { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 });
});

test('oglindirea în lume, la 0°, 90° și 30°: fiecare vârf și punct de control e oglinda lui (sub 1e-9), arcele își schimbă semnul', () => {
  const cale: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 40, y: 0 }, s: { tip: 'A', bulge: 0.4 } },
    { p: { x: 40, y: 30 }, s: { tip: 'C', c1: { x: 30, y: 45 }, c2: { x: 10, y: 40 } } }, { p: { x: 5, y: 25 }, s: { tip: 'L' } },
  ] };
  const aproape = (p: { x: number; y: number }, q: { x: number; y: number }): boolean => Math.abs(p.x - q.x) <= 1e-9 && Math.abs(p.y - q.y) <= 1e-9;
  for (const rotire of [0, 90, 30]) {
    for (const directie of ['orizontal', 'vertical'] as const) {
      const d = doc1(cale, 60, 70);
      const i0 = d.foi[0]?.instante[0];
      if (i0) i0.rotire = rotire;
      const centru = { x: 123.4, y: 56.7 };
      const o = cuRezultat(d, { fel: 'oglindire', directie, centru }, ['p']);
      const oglinda = (q: { x: number; y: number }) => (directie === 'orizontal' ? { x: 2 * centru.x - q.x, y: q.y } : { x: q.x, y: 2 * centru.y - q.y });
      const ea = elementeFoaie(d, 0)[0];
      const eb = elementeFoaie(o, 0)[0];
      if (!ea || !eb) throw new Error('fără element');
      const a = conturElement(ea);
      const b = conturElement(eb);
      assert.equal(b.varfuri.length, a.varfuri.length);
      a.varfuri.forEach((va, k) => {
        const vb = b.varfuri[k];
        const unde = `${rotire}°, ${directie}, vârful ${k}`;
        assert.ok(vb && aproape(oglinda(va.p), vb.p), unde);
        if (va.s.tip === 'A') assert.ok(vb?.s.tip === 'A' && Math.abs(vb.s.bulge + va.s.bulge) <= 1e-12, unde);
        if (va.s.tip === 'C') assert.ok(vb?.s.tip === 'C' && aproape(oglinda(va.s.c1), vb.s.c1) && aproape(oglinda(va.s.c2), vb.s.c2), unde);
      });
      assert.equal(o.foi[0]?.instante[0]?.rotire, rotire, 'rotirea instanței rămâne');
    }
  }
});

test('oglindirea selecției față de centrul ei comun; piesa împărțită e refuzată', () => {
  const d = docDin(STOC,
    { id: 'a', forma: R, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'b', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 250, f: 100 } });
  const o = cuRezultat(d, { fel: 'oglindire', directie: 'orizontal', centru: { x: 140, y: 0 } }, ['a', 'b']);
  assert.deepEqual(o.foi[0]?.instante.map((i) => [i.id, i.x, i.y]), [['a', 260, 20], ['b', 30, 100]]);
  const imp = doc1(R);
  imp.foi[0]?.instante.push({ id: 'q', piesa: 'p', x: 0, y: 0, rotire: 0 });
  assert.deepEqual(transforma(imp, 0, ['p'], { fel: 'oglindire', directie: 'vertical', centru: { x: 0, y: 0 } }), { ok: false, motiv: 'piesa-impartita' });
});

/**
 * Tăieturile în plan ale unui program, ca mulțime: fiecare linie sau arc cu capetele neordonate, centrul și sensul arcului, la
 * 1e-6 mm. Coborârile și ridicările (doar pe Z) rămân pe dinafară: oglinda inversează sensul de rotire, iar ca tăierea să
 * rămână în urcare bucla se parcurge invers, deci freza intră la celălalt capăt al ei. Sensul arcelor e același după oglindire
 * (oglinda îl întoarce, parcurgerea inversă îl întoarce la loc): așa se vede că urcarea s-a păstrat.
 */
function taieturi(d: Document, oglinda?: (x: number) => number): string[] {
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  if (!job.ok) return [];
  const r = (v: number): string => (Math.round(v * 1e6) / 1e6 + 0).toFixed(6);
  const X = (x: number): number => (oglinda ? oglinda(x) : x);
  let poz = { x: Number.NaN, y: Number.NaN, z: Number.NaN };
  const rez: string[] = [];
  for (const m of job.program.miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const nou = { x: m.la.X ?? poz.x, y: m.la.Y ?? poz.y, z: m.la.Z ?? poz.z };
    if (m.tip !== 'rapida' && Number.isFinite(poz.x) && (nou.x !== poz.x || nou.y !== poz.y)) {
      const capete = [`${r(X(poz.x))},${r(poz.y)},${r(poz.z)}`, `${r(X(nou.x))},${r(nou.y)},${r(nou.z)}`].sort().join(' ');
      rez.push(m.tip === 'arc' ? `A ${capete} c ${r(X(m.centru.x))},${r(m.centru.y)} ${m.sens}` : `L ${capete}`);
    }
    poz = nou;
  }
  return rez.sort();
}

test('ce se taie după oglindire e oglinda a ce se tăia: exteriorul, gaura și linia tăiată pe o parte (partea se inversează)', () => {
  const linie: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 50, y: 20 }, s: { tip: 'L' } }] };
  let d = docDin(STOC,
    { id: 'e1', forma: R, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
    { id: 'e3', forma: linie, matrice: { ...ID, e: 160, f: 120 } });
  d = cuOperatie(d, 'e3', { latura: 'stanga', adancime: 1, pas: 1 });
  const o = cuRezultat(d, { fel: 'oglindire', directie: 'orizontal', centru: { x: 150, y: 0 } }, ['e1', 'e2', 'e3']);
  const inainte = taieturi(d, (x) => 300 - x);
  assert.ok(inainte.length > 10, `${inainte.length} tăieturi`);
  assert.deepEqual(taieturi(o), inainte);
  // Martorul: cu partea liniei schimbată în document, tăieturile nu mai sunt oglinda.
  assert.notDeepEqual(taieturi(cuOperatie(o, 'e3', { latura: 'dreapta' })), inainte);
});
