/**
 * CAM-ul pe căi (ADR 0034 §6): fiecare cale se taie prin conturul ei fără cubice (biarcele, ADR 0033), o singură dată.
 * - Dreptunghiul rotunjit scris ca o cale (linii și arce) dă exact programul dreptunghiului parametric.
 * - Inima (patru cubice) pe exterior și pe interior: fiecare punct al traseului în plan stă la raza frezei de inima EXACTĂ
 *   (măsurată pe cubice, nu pe biarce), cu abaterea sub toleranța proiectului; arcele lui au raza sub garda postului.
 * - Calea intră în regiunea păstrată (o gaură-inimă într-o piesă) și primește degajări, ca orice contur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';
import { RAZA_MAXIMA_ARC, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, FormaDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { D, dreptunghiCaCale, INIMA } from './ajutor-cale.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 18 };
const R = 3;
const cu = (forma: FormaDoc, x: number, y: number): Document => docDin(F, { id: 'c', forma, matrice: { ...ID, e: x, f: y } });

function program(d: Document): Miscare[] {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  return j.ok ? [...j.program.miscari] : [];
}

/** Mișcările fără textul etichetelor (forma apare în etichetă: „dreptunghi”, „cale”). */
const faraTexte = (m: readonly Miscare[]): unknown[] => m.map((x) => (x.tip === 'eticheta' ? { ...x, text: '' } : x));

test('dreptunghiul rotunjit scris ca o cale dă exact programul dreptunghiului: aceleași mișcări, pe exterior și pe interior', () => {
  for (const latura of ['exterior', 'interior'] as const) {
    const v = { latura, adancime: 6, pas: 3 } as const;
    const param = cuOperatie(cu({ tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 5 }, 40, 30), 'c', v);
    const cale = cuOperatie(cu(dreptunghiCaCale(100, 60, 5), 40, 30), 'c', v);
    assert.deepEqual(faraTexte(program(cale)), faraTexte(program(param)), latura);
  }
});

/** Punctele traseului în plan, pe mișcările de tăiere din prima trecere (Z constant): capetele și puncte pe linii și arce. */
function puncteTraseu(m: readonly Miscare[]): Array<{ x: number; y: number }> {
  const rez: Array<{ x: number; y: number }> = [];
  let x = Number.NaN, y = Number.NaN, z = Number.NaN;
  let zPrima: number | null = null;
  for (const a of m) {
    if (!('la' in a)) continue;
    const nx = a.la.X ?? x, ny = a.la.Y ?? y, nz = a.la.Z ?? z;
    const inPlan = a.tip !== 'rapida' && nz === z && nz < 0;
    if (inPlan && zPrima === null) zPrima = nz;
    if (inPlan && nz === zPrima) {
      for (let k = 0; k <= 20; k++) {
        const f = k / 20;
        if (a.tip === 'arc') {
          const c = a.centru;
          const r = Math.hypot(x - c.x, y - c.y);
          const u0 = Math.atan2(y - c.y, x - c.x);
          let b = Math.atan2(ny - c.y, nx - c.x) - u0;
          if (a.sens === 'trigonometric') { while (b <= 1e-12) b += 2 * Math.PI; } else { while (b >= -1e-12) b -= 2 * Math.PI; }
          rez.push({ x: c.x + r * Math.cos(u0 + b * f), y: c.y + r * Math.sin(u0 + b * f) });
        } else {
          rez.push({ x: x + (nx - x) * f, y: y + (ny - y) * f });
        }
      }
    }
    x = nx; y = ny; z = nz;
  }
  return rez;
}

test('inima (patru cubice): traseul stă la raza frezei de inima exactă, cu abaterea sub toleranța proiectului, pe exterior și pe interior', () => {
  const exacta = conturElement({ forma: INIMA, matrice: { ...ID, e: 100, f: 50 } });
  for (const latura of ['exterior', 'interior'] as const) {
    const m = program(cuOperatie(cu(INIMA, 100, 50), 'c', { latura, adancime: 3, pas: 3 }));
    const puncte = puncteTraseu(m);
    assert.ok(puncte.length > 500, `${latura}: ${puncte.length} de puncte`);
    let abatere = 0;
    for (const p of puncte) abatere = Math.max(abatere, Math.abs(distantaLaContur(p, exacta) - R));
    // Biarcele (0,99 × tol) plus offsetul exact pe linii și arce: sub toleranța proiectului.
    assert.ok(abatere <= TOLERANTA_PROIECT, `${latura}: abaterea ${abatere} mm`);
    // Arcele traseului: sub garda postului, chiar decalate cu raza frezei (ADR 0034 §6).
    let x = Number.NaN, y = Number.NaN;
    for (const a of m) {
      if (a.tip === 'arc') assert.ok(Math.hypot(x - a.centru.x, y - a.centru.y) <= RAZA_MAXIMA_ARC + R + 1e-6, `${latura}: un arc cu raza peste gardă`);
      if ('la' in a) { x = a.la.X ?? x; y = a.la.Y ?? y; }
    }
  }
});

test('o inimă-gaură într-o piesă: regiunea păstrată o vede (invarianta 2 trece), iar exteriorul piesei se taie după ea', () => {
  const d = docDin(F,
    { id: 'p', forma: { tip: 'dreptunghi', latime: 160, inaltime: 160, razaColt: 0 }, matrice: { ...ID, e: 70, f: 20 } },
    { id: 'g', forma: INIMA, matrice: { ...ID, e: 100, f: 50 } });
  const cuGaura = cuOperatie(d, 'g', { latura: 'interior', adancime: 6, pas: 3 });
  const j = programDinDocument(cuGaura);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return;
  const etichete = j.program.miscari.filter((m) => m.tip === 'eticheta' && m.element !== undefined).map((m) => (m.tip === 'eticheta' ? m.text : ''));
  assert.deepEqual(etichete, ['g/g: cale, interior, 6 mm', 'p/p: dreptunghi, exterior, 3 mm']);
  // O inimă care atinge piesa: refuzul regiunii, cu ambele id-uri.
  const atinge = docDin(F,
    { id: 'p', forma: { tip: 'dreptunghi', latime: 80, inaltime: 160, razaColt: 0 }, matrice: { ...ID, e: 70, f: 20 } },
    { id: 'g', forma: INIMA, matrice: { ...ID, e: 100, f: 50 } });
  const r = programDinDocument(cuOperatie(atinge, 'g', { latura: 'interior', adancime: 6, pas: 3 }));
  assert.match(r.ok ? '' : r.motiv, /regiunea păstrată: .*(g\/g|p\/p).*(g\/g|p\/p).*se ating sau se intersectează/);
});

test('degajările pe o cale de linii: „D”-ul are două colțuri drepte între linie și arc, deci niciunul de degajat; un L de linii are', () => {
  // „D”-ul: colțurile sunt între linie și arc, iar degajările cer două linii (ADR 0032 §1): niciun drum dus-întors.
  const dPlin = programDinDocument(cuOperatie(cu(D, 100, 50), 'c', { latura: 'interior', adancime: 3, pas: 3, colturi: { tip: 'dog-bone' } }));
  assert.ok(dPlin.ok, dPlin.ok ? '' : dPlin.motiv);
  // Un L (șase linii) ca gaură: un singur colț concav al materialului păstrat? Nu: într-o gaură, colțurile convexe ale
  // golului sunt concave pentru piesă. L-ul are 5 colțuri convexe ale golului și unul concav.
  const L: FormaDoc = {
    tip: 'cale',
    inchis: true,
    varfuri: [[0, 0], [60, 0], [60, 20], [20, 20], [20, 50], [0, 50]].map(([x, y]) => ({ p: { x: x as number, y: y as number }, s: { tip: 'L' as const } })),
  };
  const cuDegajari = program(cuOperatie(cu(L, 100, 50), 'c', { latura: 'interior', adancime: 3, pas: 3, colturi: { tip: 'dog-bone' } }));
  const fara = program(cuOperatie(cu(L, 100, 50), 'c', { latura: 'interior', adancime: 3, pas: 3 }));
  // Cinci colțuri ale golului sunt concave pentru piesă: cinci drumuri dus-întors în plus pe trecere, adică 10 mișcări.
  assert.equal(cuDegajari.length - fara.length, 10);
});
