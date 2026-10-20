import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaDesenata } from '../../src/app/desenCalcul.ts';
import { arcEliptic } from '../../src/geom/elipsa.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import type { FormaDoc } from '../../src/model/document.ts';
import { dinParametri, elipsa, parametri, poligonRegulat, type Parametri } from '../../src/model/formeParametrice.ts';

/**
 * Formele cu parametri (ADR 0053): generatorii comuni cu uneltele de desen și recunoașterea pe forma salvată, cu valori pe
 * hârtie; ce nu e poligon regulat sau elipsa generatorului nu e recunoscut.
 */

const aproape = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const varfuri = (f: FormaDoc) => (f.tip === 'cale' ? f.varfuri.map((v) => v.p) : []);
/** Aceeași formă, cu punctele căii egale sub 1e-9 mm (refăcută din parametri, poartă zgomotul virgulei mobile). */
function aceeasiForma(a: FormaDoc, b: FormaDoc): void {
  if (a.tip !== 'cale' || b.tip !== 'cale') { assert.deepEqual(a, b); return; }
  assert.equal(a.varfuri.length, b.varfuri.length);
  const egal = (p: { x: number; y: number }, q: { x: number; y: number }): boolean => aproape(p.x, q.x) && aproape(p.y, q.y);
  a.varfuri.forEach((v, k) => {
    const w = b.varfuri[k];
    assert.ok(w && egal(v.p, w.p) && v.s.tip === w.s.tip, `vârful ${k}`);
    if (v.s.tip === 'C' && w?.s.tip === 'C') assert.ok(egal(v.s.c1, w.s.c1) && egal(v.s.c2, w.s.c2), `cubica ${k}`);
  });
}

test('poligonul regulat: pătratul înscris în cercul de rază 10, cu primul vârf pe axa x; recunoscut cu centrul, raza, unghiul, sensul', () => {
  const f = poligonRegulat({ x: 0, y: 0 }, 10, 4, 0);
  const p = varfuri(f);
  for (const [k, [x, y]] of [[10, 0], [0, 10], [-10, 0], [0, -10]].entries()) assert.ok(aproape(p[k]?.x ?? NaN, x ?? 0) && aproape(p[k]?.y ?? NaN, y ?? 0), `vârful ${k}`);
  const r = parametri(f);
  assert.ok(r && r.tip === 'poligon');
  if (r?.tip !== 'poligon') return;
  assert.equal(r.laturi, 4);
  assert.ok(aproape(r.raza, 10) && aproape(r.centru.x, 0) && aproape(r.centru.y, 0) && aproape(r.unghi, 0));
  assert.equal(r.sens, 1);
  // În sens orar, descentrat, rotit: recunoscut la fel, cu sensul lui.
  const o = parametri(poligonRegulat({ x: 30, y: -7 }, 4.5, 7, 0.3, -1));
  assert.ok(o?.tip === 'poligon' && o.laturi === 7 && o.sens === -1 && aproape(o.raza, 4.5) && aproape(o.centru.x, 30) && aproape(o.centru.y, -7) && aproape(o.unghi, 0.3));
});

test('nu e poligon regulat: un vârf mutat cu 0,01 mm, steaua (aceleași vârfuri, altă ordine), o cale deschisă, prea multe laturi', () => {
  const f = poligonRegulat({ x: 0, y: 0 }, 10, 6, 0);
  if (f.tip !== 'cale') throw new Error('nu e cale');
  const mutat: FormaDoc = { ...f, varfuri: f.varfuri.map((v, k) => (k === 2 ? { ...v, p: { x: v.p.x + 0.01, y: v.p.y } } : v)) };
  assert.equal(parametri(mutat), null);
  const p5 = poligonRegulat({ x: 0, y: 0 }, 10, 5, 0);
  if (p5.tip !== 'cale') throw new Error('nu e cale');
  const stea: FormaDoc = { ...p5, varfuri: [0, 2, 4, 1, 3].map((k) => p5.varfuri[k]!) };
  assert.equal(parametri(stea), null);
  assert.equal(parametri({ ...f, inchis: false }), null);
  const mare = poligonRegulat({ x: 0, y: 0 }, 10, 64, 0);
  if (mare.tip !== 'cale') throw new Error('nu e cale');
  assert.equal(parametri(mare)?.tip, 'poligon');
  const n = 65;
  const prea: FormaDoc = { tip: 'cale', inchis: true, varfuri: Array.from({ length: n }, (_, k) => ({ p: { x: 10 * Math.cos((2 * Math.PI * k) / n), y: 10 * Math.sin((2 * Math.PI * k) / n) }, s: { tip: 'L' as const } })) };
  assert.equal(parametri(prea), null);
});

test('elipsa: a generatorului e recunoscută cu razele și centrul ei (și descentrată); razele egale în origine dau un cerc exact', () => {
  const e = elipsa({ x: 0, y: 0 }, 20, 10);
  assert.equal(e.tip, 'cale');
  const r = parametri(e);
  assert.ok(r?.tip === 'elipsa' && aproape(r.rx, 20) && aproape(r.ry, 10) && aproape(r.centru.x, 0) && aproape(r.centru.y, 0));
  const d = parametri(elipsa({ x: 5, y: 7 }, 3, 9));
  assert.ok(d?.tip === 'elipsa' && aproape(d.rx, 3) && aproape(d.ry, 9) && aproape(d.centru.x, 5) && aproape(d.centru.y, 7));
  assert.deepEqual(elipsa({ x: 0, y: 0 }, 12, 12), { tip: 'cerc', raza: 12 });
  // Tăiată pe sferturi: cele patru extreme sunt vârfuri exacte (cutia formei e exact centrul ± razele).
  const p = varfuri(elipsa({ x: 0, y: 0 }, 30, 15));
  for (const q of [{ x: 30, y: 0 }, { x: 0, y: 15 }, { x: -30, y: 0 }, { x: 0, y: -15 }]) assert.ok(p.some((w) => w.x === q.x && w.y === q.y), JSON.stringify(q));
  // Elipsa uneltei de desen de dinainte (o singură bucată de 2π, 6.B↑) e recunoscută și ea.
  const start = { x: 30, y: 0 };
  const veche: FormaDoc = { tip: 'cale', inchis: true, varfuri: [] };
  let p0 = start;
  for (const c of arcEliptic({ a: 30, b: 0, c: 0, d: 15, e: 0, f: 0 }, 0, 2 * Math.PI, start, start, TOLERANTA_IMPORT)) {
    veche.varfuri.push({ p: p0, s: { tip: 'C', c1: c.c1, c2: c.c2 } });
    p0 = c.b;
  }
  assert.equal(veche.varfuri.length % 4 === 0, false, 'o bucată: extremele nu sunt toate vârfuri');
  const rv = parametri(veche);
  assert.ok(rv?.tip === 'elipsa' && aproape(rv.rx, 30) && aproape(rv.ry, 15));
  // O cale din cubice care nu e elipsa generatorului (inima ADR 0034) nu e recunoscută.
  const P = (x: number, y: number) => ({ x, y });
  const inima: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: P(50, 10), s: { tip: 'C', c1: P(80, 40), c2: P(95, 75) } }, { p: P(75, 85), s: { tip: 'C', c1: P(60, 95), c2: P(50, 80) } },
    { p: P(50, 70), s: { tip: 'C', c1: P(50, 80), c2: P(40, 95) } }, { p: P(25, 85), s: { tip: 'C', c1: P(5, 75), c2: P(20, 40) } },
  ] };
  assert.equal(parametri(inima), null);
  // Elipsa cu un punct de control mișcat: nu mai e a generatorului.
  if (e.tip !== 'cale') return;
  const strambata: FormaDoc = { ...e, varfuri: e.varfuri.map((v, k) => (k === 1 && v.s.tip === 'C' ? { ...v, s: { ...v.s, c1: { x: v.s.c1.x, y: v.s.c1.y + 0.001 } } } : v)) };
  assert.equal(parametri(strambata), null);
});

test('formele desenate se recunosc, iar dinParametri le reface (sub 1e-9 mm); editarea laturilor păstrează centrul, raza și primul vârf', () => {
  const pol = formaDesenata('poligon', { x: 50, y: 50 }, { x: 50 + 12 * Math.cos(0.5), y: 50 + 12 * Math.sin(0.5) }, 6, 0.1);
  const el = formaDesenata('elipsa', { x: 10, y: 10 }, { x: 70, y: 40 }, 6, 0.1);
  for (const f of [pol?.forma, el?.forma, { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 3 } as FormaDoc, { tip: 'cerc', raza: 7 } as FormaDoc]) {
    if (!f) throw new Error('fără formă');
    const p = parametri(f);
    assert.ok(p, f.tip);
    aceeasiForma(dinParametri(p as Parametri), f);
  }
  const p = pol ? parametri(pol.forma) : null;
  assert.ok(p?.tip === 'poligon' && p.laturi === 6 && aproape(p.raza, 12) && aproape(p.unghi, 0.5));
  if (p?.tip !== 'poligon') return;
  const opt = dinParametri({ ...p, laturi: 8 });
  const q = parametri(opt);
  assert.ok(q?.tip === 'poligon' && q.laturi === 8 && aproape(q.raza, 12) && aproape(q.unghi, 0.5) && aproape(q.centru.x, 0) && aproape(q.centru.y, 0));
  const e = el ? parametri(el.forma) : null;
  assert.ok(e?.tip === 'elipsa' && aproape(e.rx, 30) && aproape(e.ry, 15));
});
