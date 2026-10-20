import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capatConstrans, formaDesenata } from '../../src/app/desenCalcul.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { documentNou, operatieImplicita, type FormaDoc } from '../../src/model/document.ts';

/** Uneltele de desen (ADR 0051), pure: fiecare unealtă cu valori pe hârtie, Shift, tragerea prea scurtă, ușa. */

const A = { x: 10, y: 20 };

test('dreptunghiul: din colț în colț, în orice direcție; Shift = pătrat în direcția tragerii', () => {
  assert.deepEqual(formaDesenata('dreptunghi', A, { x: 110, y: 80 }, 6, 0.1), { forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, x: 10, y: 20 });
  assert.deepEqual(formaDesenata('dreptunghi', { x: 110, y: 80 }, A, 6, 0.1)?.x, 10, 'tras înapoi: colțul stânga-jos e tot (10, 20)');
  assert.deepEqual(capatConstrans('dreptunghi', A, { x: 50, y: -10 }, true), { x: 50, y: -20 });
  assert.equal(formaDesenata('dreptunghi', A, { x: 110, y: 20.05 }, 6, 0.1), null, 'o latură sub minim: nimic');
});

test('cercul: din centru, raza = distanța; elipsa din colț în colț, cu razele egale = cerc exact', () => {
  assert.deepEqual(formaDesenata('cerc', A, { x: 13, y: 24 }, 6, 0.1), { forma: { tip: 'cerc', raza: 5 }, x: 10, y: 20 });
  assert.deepEqual(formaDesenata('elipsa', A, capatConstrans('elipsa', A, { x: 50, y: 70 }, true), 6, 0.1), { forma: { tip: 'cerc', raza: 25 }, x: 35, y: 45 });
});

test('elipsa: cale închisă din cubice, centrată pe instanță, cu punctele pe elipsă sub toleranța importului', () => {
  const f = formaDesenata('elipsa', A, { x: 110, y: 60 }, 6, 0.1);
  assert.ok(f && f.forma.tip === 'cale' && f.forma.inchis);
  assert.deepEqual([f.x, f.y], [60, 40]);
  if (f.forma.tip !== 'cale') return;
  const v = f.forma.varfuri;
  assert.ok(v.length >= 4 && v.every((x) => x.s.tip === 'C'));
  assert.deepEqual(v[0]?.p, { x: 50, y: 0 }, 'pornește din (rx, 0)');
  // Mijlocul fiecărei cubice e pe elipsa (x/50)² + (y/20)² = 1, sub toleranță.
  for (let k = 0; k < v.length; k++) {
    const a = v[k], b = v[(k + 1) % v.length];
    if (!a || !b || a.s.tip !== 'C') continue;
    const m = { x: (a.p.x + 3 * a.s.c1.x + 3 * a.s.c2.x + b.p.x) / 8, y: (a.p.y + 3 * a.s.c1.y + 3 * a.s.c2.y + b.p.y) / 8 };
    const u = Math.atan2(m.y / 20, m.x / 50);
    const pe = { x: 50 * Math.cos(u), y: 20 * Math.sin(u) };
    assert.ok(Math.hypot(m.x - pe.x, m.y - pe.y) <= TOLERANTA_IMPORT * 1.01, `cubica ${k}`);
  }
});

test('linia: cale deschisă din capăt în capăt; Shift = pași de 15°', () => {
  assert.deepEqual(formaDesenata('linie', A, { x: 40, y: 60 }, 6, 0.1), {
    forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 30, y: 40 }, s: { tip: 'L' } }] }, x: 10, y: 20,
  });
  const c = capatConstrans('linie', A, { x: 60, y: 22 }, true);
  assert.ok(Math.abs(c.y - 20) < 1e-12, 'aproape orizontală → orizontală');
  assert.ok(Math.abs(c.x - (10 + Math.hypot(50, 2))) < 1e-12, 'lungimea se păstrează');
  assert.equal(formaDesenata('linie', A, { x: 10.05, y: 20 }, 6, 0.1), null);
});

test('poligonul: din centru, n laturi egale, primul vârf în direcția tragerii; laturile între 3 și 64', () => {
  const f = formaDesenata('poligon', A, { x: 10, y: 30 }, 6, 0.1);
  assert.ok(f && f.forma.tip === 'cale' && f.forma.inchis);
  if (f.forma.tip !== 'cale') return;
  assert.equal(f.forma.varfuri.length, 6);
  assert.ok(Math.abs((f.forma.varfuri[0]?.p.x ?? 1)) < 1e-12 && Math.abs((f.forma.varfuri[0]?.p.y ?? 0) - 10) < 1e-12, 'primul vârf în sus');
  for (const x of f.forma.varfuri) assert.ok(Math.abs(Math.hypot(x.p.x, x.p.y) - 10) < 1e-12);
  const g = formaDesenata('poligon', A, { x: 20, y: 20 }, 1, 0.1);
  assert.equal(g?.forma.tip === 'cale' ? g.forma.varfuri.length : 0, 3, 'cel puțin 3');
  const h = formaDesenata('poligon', A, { x: 20, y: 20 }, 1000, 0.1);
  assert.equal(h?.forma.tip === 'cale' ? h.forma.varfuri.length : 0, 64, 'cel mult 64');
});

test('fiecare formă desenată, pusă într-un document, trece de ușă', () => {
  const forme: FormaDoc[] = [];
  for (const u of ['dreptunghi', 'cerc', 'elipsa', 'linie', 'poligon'] as const) {
    const f = formaDesenata(u, A, { x: 87.3, y: 61.9 }, 7, 0.1);
    assert.ok(f, u);
    if (f) forme.push(f.forma);
  }
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const doc = {
    ...d,
    piese: forme.map((forma, k) => ({ id: `p${k}`, radacina: { tip: 'element' as const, id: `p${k}`, forma, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [operatieImplicita(`p${k}`, forma)] })),
    foi: [{ ...d.foi[0], id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: forme.map((_, k) => ({ id: `p${k}`, piesa: `p${k}`, x: 50, y: 50, rotire: 0 })) }],
  };
  const r = incarca(JSON.parse(JSON.stringify(doc)));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
});
