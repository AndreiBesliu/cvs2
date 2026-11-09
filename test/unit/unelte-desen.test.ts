import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capatConstrans, formaDesenata, TASTA_UNELTEI, TASTE_UNELTE, tasteUneltei, UNELTE, type Unealta } from '../../src/app/desenCalcul.ts';
import { TOLERANTA_IMPORT } from '../../src/geom/toleranta.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { documentNou, operatieImplicita, type FormaDoc } from '../../src/model/document.ts';
import { elipsa, parametri } from '../../src/model/formeParametrice.ts';

/** Uneltele de desen (ADR 0051), pure: fiecare unealtă cu valori pe hârtie, Shift, tragerea prea scurtă, ușa. */

const A = { x: 10, y: 20 };
/** Tastele ținute la desen (ADR 0240): „S” Shift, „C” Ctrl (⌘ pe Mac), „A” Alt. */
const K = (s = '') => ({ shift: s.includes('S'), ctrl: s.includes('C'), alt: s.includes('A') });

test('dreptunghiul: din colț în colț, în orice direcție; Shift = pătrat în direcția tragerii', () => {
  assert.deepEqual(formaDesenata('dreptunghi', A, { x: 110, y: 80 }, 6, 0.1), { forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, x: 10, y: 20 });
  assert.deepEqual(formaDesenata('dreptunghi', { x: 110, y: 80 }, A, 6, 0.1)?.x, 10, 'tras înapoi: colțul stânga-jos e tot (10, 20)');
  assert.deepEqual(capatConstrans('dreptunghi', A, { x: 50, y: -10 }, K('S')), { x: 50, y: -20 });
  assert.equal(formaDesenata('dreptunghi', A, { x: 110, y: 20.05 }, 6, 0.1), null, 'o latură sub minim: nimic');
});

test('cercul: din centru, raza = distanța; elipsa din colț în colț, cu razele egale = cerc exact', () => {
  assert.deepEqual(formaDesenata('cerc', A, { x: 13, y: 24 }, 6, 0.1), { forma: { tip: 'cerc', raza: 5 }, x: 10, y: 20 });
  assert.deepEqual(formaDesenata('elipsa', A, capatConstrans('elipsa', A, { x: 50, y: 70 }, K('S')), 6, 0.1), { forma: { tip: 'cerc', raza: 25 }, x: 35, y: 45 });
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
  const c = capatConstrans('linie', A, { x: 60, y: 22 }, K('S'));
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

test('tastele la desen (ADR 0240), pe hârtie: apăsat în (10, 10), lăsat în (40, 30)', () => {
  const P = { x: 10, y: 10 }, Q = { x: 40, y: 30 };
  const des = (u: 'dreptunghi' | 'elipsa' | 'cerc' | 'linie' | 'poligon', taste: string) => formaDesenata(u, P, capatConstrans(u, P, Q, K(taste)), 6, 0.1, K(taste));
  const R = (latime: number, inaltime: number): FormaDoc => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
  // Dreptunghiul: din colț (30 × 20); Shift pătrat (30 × 30); Ctrl ca fără tastă; Alt din centru (60 × 40, colțul în
  // (−20, −10)); Alt + Shift, pătratul 60 × 60 din centru; Alt + Ctrl ca Alt; Shift + Ctrl, câștigă Shift.
  assert.deepEqual(des('dreptunghi', ''), { forma: R(30, 20), x: 10, y: 10 });
  assert.deepEqual(des('dreptunghi', 'S'), { forma: R(30, 30), x: 10, y: 10 });
  assert.deepEqual(des('dreptunghi', 'C'), des('dreptunghi', ''));
  assert.deepEqual(des('dreptunghi', 'A'), { forma: R(60, 40), x: -20, y: -10 });
  assert.deepEqual(des('dreptunghi', 'AS'), { forma: R(60, 60), x: -20, y: -20 });
  assert.deepEqual(des('dreptunghi', 'AC'), des('dreptunghi', 'A'));
  assert.deepEqual(des('dreptunghi', 'SC'), des('dreptunghi', 'S'));
  // Elipsa: razele 15 și 10 în (25, 20); Shift, cercul R 15 în (25, 25); Alt, razele 30 și 20 în (10, 10); Alt + Shift, R 30.
  assert.deepEqual(des('elipsa', ''), { forma: elipsa({ x: 0, y: 0 }, 15, 10), x: 25, y: 20 });
  assert.deepEqual(des('elipsa', 'S'), { forma: { tip: 'cerc', raza: 15 }, x: 25, y: 25 });
  assert.deepEqual(des('elipsa', 'A'), { forma: elipsa({ x: 0, y: 0 }, 30, 20), x: 10, y: 10 });
  assert.deepEqual(des('elipsa', 'AS'), { forma: { tip: 'cerc', raza: 30 }, x: 10, y: 10 });
  assert.deepEqual(des('elipsa', 'SC'), des('elipsa', 'S'));
  // Cercul: din centru, prin cursor (R √1300); Alt și Shift n-au ce schimba; Ctrl, elipsa din centru cu cursorul în colțul
  // cutiei ei (razele 30 și 20); Shift + Ctrl, câștigă Shift (cercul).
  assert.deepEqual(des('cerc', ''), { forma: { tip: 'cerc', raza: Math.hypot(30, 20) }, x: 10, y: 10 });
  for (const k of ['A', 'S', 'AS', 'SC']) assert.deepEqual(des('cerc', k), des('cerc', ''), k);
  assert.deepEqual(des('cerc', 'C'), { forma: elipsa({ x: 0, y: 0 }, 30, 20), x: 10, y: 10 });
  assert.deepEqual(des('cerc', 'AC'), des('cerc', 'C'));
  // Linia: cu Alt, din mijloc: de la (−20, −10) la (40, 30); cu Alt + Shift, în pași de 15° (33,7° → 30°), tot din mijloc.
  assert.deepEqual(des('linie', 'A'), {
    forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 60, y: 40 }, s: { tip: 'L' } }] }, x: -20, y: -10,
  });
  const ls = des('linie', 'AS');
  const r = Math.hypot(30, 20), cx = r * Math.cos(Math.PI / 6), cy = r * Math.sin(Math.PI / 6);
  assert.ok(ls && ls.forma.tip === 'cale' && Math.abs(ls.x - (10 - cx)) < 1e-12 && Math.abs(ls.y - (10 - cy)) < 1e-12);
  const b = ls?.forma.tip === 'cale' ? ls.forma.varfuri[1]?.p : undefined;
  assert.ok(b && Math.abs(b.x - 2 * cx) < 1e-12 && Math.abs(b.y - 2 * cy) < 1e-12);
  // Poligonul pornește oricum din centru: Alt nu-l schimbă; Ctrl îl întinde (6.V↑d, proba de mai jos).
  assert.deepEqual(des('poligon', 'A'), des('poligon', ''));
  assert.notDeepEqual(des('poligon', 'C'), des('poligon', ''));
  // Din centru, o tragere sub minim pe o axă nu face nimic (lățimea 2 · 0,04 = 0,08 < 0,1).
  assert.equal(formaDesenata('dreptunghi', P, { x: 10.04, y: 30 }, 6, 0.1, K('A')), null);
});

test('opțiunile desenului (ADR 0240 §C.19–§C.20, 6.V↑d): cercul din colț, ca elipsa cu Shift; poligonul întins cu Ctrl', () => {
  const P = { x: 10, y: 10 }, Q = { x: 40, y: 30 };
  const colt = (taste: string, b = Q) => formaDesenata('cerc', P, capatConstrans('cerc', P, b, K(taste)), 6, 0.1, K(taste), 'colt');
  // Din colț: cercul din cutia pătrată (latura cea mai mare, 30), deci R 15 în (25, 25); Shift, la fel; Alt, din centru, cu
  // cursorul în colțul cutiei (R 30 în (10, 10)); Ctrl, elipsa din colț în colț (razele 15 și 10, în (25, 20)); Alt + Ctrl,
  // elipsa din centru (30 și 20); Shift + Ctrl, câștigă Shift.
  assert.deepEqual(colt(''), { forma: { tip: 'cerc', raza: 15 }, x: 25, y: 25 });
  assert.deepEqual(colt('S'), colt(''));
  assert.deepEqual(colt('A'), { forma: { tip: 'cerc', raza: 30 }, x: 10, y: 10 });
  assert.deepEqual(colt('AS'), colt('A'));
  assert.deepEqual(colt('C'), { forma: elipsa({ x: 0, y: 0 }, 15, 10), x: 25, y: 20 });
  assert.deepEqual(colt('AC'), { forma: elipsa({ x: 0, y: 0 }, 30, 20), x: 10, y: 10 });
  assert.deepEqual(colt('SC'), colt('S'));
  // Tras spre stânga-jos: cutia pătrată merge în direcția tragerii, de la (10, 10) la (−20, −20).
  assert.deepEqual(colt('', { x: -20, y: -5 }), { forma: { tip: 'cerc', raza: 15 }, x: -5, y: -5 });
  // Din centru (implicit), ca înainte.
  assert.deepEqual(formaDesenata('cerc', P, Q, 6, 0.1, K(''), 'centru'), formaDesenata('cerc', P, Q, 6, 0.1, K('')));

  // Poligonul întins (Ctrl): vârfurile pe elipsa cu semiaxele |dx| = 30 și |dy| = 20, primul sus, în sens trigonometric; nu
  // mai e regulat, deci panoul nu-l editează ca poligon. Shift + Ctrl: câștigă Shift (regulat, primul vârf în pași de 15°).
  const intins = formaDesenata('poligon', P, Q, 5, 0.1, K('C'));
  assert.ok(intins && intins.forma.tip === 'cale' && intins.forma.inchis);
  assert.deepEqual([intins.x, intins.y], [10, 10]);
  if (intins.forma.tip !== 'cale') return;
  assert.equal(intins.forma.varfuri.length, 5);
  intins.forma.varfuri.forEach((v, k) => {
    const u = Math.PI / 2 + (2 * Math.PI * k) / 5;
    assert.ok(Math.abs(v.p.x - 30 * Math.cos(u)) < 1e-12 && Math.abs(v.p.y - 20 * Math.sin(u)) < 1e-12 && v.s.tip === 'L', `vârful ${k}`);
  });
  assert.notEqual(parametri(intins.forma)?.tip, 'poligon');
  assert.deepEqual(formaDesenata('poligon', P, Q, 5, 0.1, K('AC')), intins);
  const regulat = (taste: string) => formaDesenata('poligon', P, capatConstrans('poligon', P, Q, K(taste)), 5, 0.1, K(taste));
  assert.deepEqual(regulat('SC'), regulat('S'));
  // Întins pe o axă fără înălțime (sub minim): nimic.
  assert.equal(formaDesenata('poligon', P, { x: 40, y: 10.04 }, 5, 0.1, K('C')), null);
});

test('rândul tastelor din bara de jos (ADR 0240 §E.25, 6.V↑d): ce face fiecare tastă, pe unealtă și pe opțiuni', () => {
  const r = (u: Unealta, o: { altFix?: 'ancora' | 'centru'; cerc?: 'centru' | 'colt' } = {}) =>
    tasteUneltei(u, { altFix: o.altFix ?? 'ancora', cerc: o.cerc ?? 'centru' }).map((x) => `${x.tasta} ${x.cheie}`);
  assert.deepEqual(r('transformare'), ['shift editare.mod.proportional', 'ctrl editare.mod.liber', 'alt editare.mod.fix.ancora']);
  assert.deepEqual(r('transformare', { altFix: 'centru' }), ['shift editare.mod.proportional', 'ctrl editare.mod.liber', 'alt editare.mod.fix.centru']);
  assert.deepEqual(r('dreptunghi'), ['shift editare.desen.patrat', 'ctrl editare.mod.liber', 'alt editare.desen.din-centru']);
  assert.deepEqual(r('elipsa'), ['shift editare.desen.cerc', 'ctrl editare.mod.liber', 'alt editare.desen.din-centru']);
  assert.deepEqual(r('cerc'), ['ctrl editare.desen.elipsa']);
  assert.deepEqual(r('cerc', { cerc: 'colt' }), ['ctrl editare.desen.elipsa', 'alt editare.desen.din-centru']);
  assert.deepEqual(r('linie'), ['shift editare.desen.pas15', 'alt editare.desen.din-mijloc']);
  assert.deepEqual(r('poligon'), ['shift editare.desen.pas15', 'ctrl editare.desen.intins']);
  for (const u of ['selectie', 'noduri', 'pen', 'text'] as const) assert.deepEqual(r(u), [], u);
});

test('fiecare formă desenată, pusă într-un document, trece de ușă', () => {
  const forme: FormaDoc[] = [];
  for (const u of ['dreptunghi', 'cerc', 'elipsa', 'linie', 'poligon'] as const) {
    const f = formaDesenata(u, A, { x: 87.3, y: 61.9 }, 7, 0.1);
    assert.ok(f, u);
    if (f) forme.push(f.forma);
  }
  // Și opțiunile din 6.V↑d: cercul din colț (cu Ctrl, elipsa), poligonul întins.
  for (const [u, taste] of [['cerc', ''], ['cerc', 'C'], ['poligon', 'C']] as const) {
    const f = formaDesenata(u, A, { x: 87.3, y: 61.9 }, 7, 0.1, K(taste), 'colt');
    assert.ok(f, `${u} ${taste}`);
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

test('eticheta tastei pe buton (cererea owner-ului din 25.10): fiecare unealtă are o literă, exact inversul hărții tastelor', () => {
  assert.deepEqual(Object.keys(TASTA_UNELTEI).sort(), [...UNELTE].sort());
  for (const u of UNELTE) {
    const k = TASTA_UNELTEI[u];
    assert.match(k, /^[A-Z]$/, u);
    assert.equal(TASTE_UNELTE[k.toLowerCase()], u, u);
  }
  assert.equal(TASTA_UNELTEI.dreptunghi, 'R');
  assert.equal(TASTA_UNELTEI.pen, 'B');
});
