import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { acosD, atan2D, cosD, sinD, tanD } from '../../src/sim/unghi.ts';

/**
 * Trigonometria nucleului (ADR 0047 §6): scrisă doar cu + − × ÷ √, ca rezultatul să fie același pe orice motor JavaScript
 * (operațiile de bază sunt rotunjite corect de IEEE 754; `Math.sin`, `Math.atan2`, `Math.hypot` nu sunt obligate să fie).
 * Aici: aceleași valori ca `Math` la câteva ulp-uri. Prima plasă e amprenta Node = Edge din e2e; a doua, mai jos, e
 * căutarea în sursă a funcțiilor `Math` nedeterministe.
 */

const ULP = 2 ** -52;

test('atan2D = Math.atan2 la cel mult 4 ulp-uri din π, pe cadrane, axe, valori mici și mari', () => {
  const v = [0, 1e-300, 1e-12, 1e-6, 0.1, 0.5, 0.999999, 1, 1.000001, 2, 10, 1e6, 1e12, 1e300];
  let max = 0;
  for (const a of v) for (const b of v) for (const sx of [1, -1]) for (const sy of [1, -1]) {
    const y = sy * a, x = sx * b;
    if (x === 0 && y === 0) continue;
    max = Math.max(max, Math.abs(atan2D(y, x) - Math.atan2(y, x)));
  }
  for (let k = 0; k < 20000; k++) {
    const u = (k / 20000) * 2 * Math.PI - Math.PI, r = 0.1 + (k % 97);
    const y = r * Math.sin(u), x = r * Math.cos(u);
    max = Math.max(max, Math.abs(atan2D(y, x) - Math.atan2(y, x)));
  }
  assert.ok(max <= 4 * ULP * Math.PI, `abaterea maximă ${max}`);
  assert.equal(atan2D(0, 1), 0);
  assert.equal(atan2D(0, -1), Math.PI);
  assert.equal(atan2D(1, 0), Math.PI / 2);
  assert.equal(atan2D(-1, 0), -Math.PI / 2);
});

test('acosD = Math.acos la cel mult 4 ulp-uri din π, pe [−1, 1], cu capetele', () => {
  let max = 0;
  for (let k = 0; k <= 20000; k++) {
    const c = -1 + (2 * k) / 20000;
    max = Math.max(max, Math.abs(acosD(c) - Math.acos(c)));
  }
  for (const c of [1 - 1e-15, -1 + 1e-15, 1e-17, -1e-17]) max = Math.max(max, Math.abs(acosD(c) - Math.acos(c)));
  assert.ok(max <= 4 * ULP * Math.PI, `abaterea maximă ${max}`);
  assert.equal(acosD(1), 0);
  assert.equal(acosD(-1), Math.PI);
});

test('sinD, cosD, tanD = Math pe [−8π, 8π] la cel mult 4 ulp-uri; tan(30°)·√3 = 1', () => {
  let max = 0;
  for (let k = 0; k <= 40000; k++) {
    const x = -8 * Math.PI + (16 * Math.PI * k) / 40000;
    max = Math.max(max, Math.abs(sinD(x) - Math.sin(x)), Math.abs(cosD(x) - Math.cos(x)));
  }
  assert.ok(max <= 4 * ULP, `sin / cos: ${max}`);
  for (let g = 1; g < 90; g += 0.5) {
    const x = (g * Math.PI) / 180, t = Math.tan(x);
    assert.ok(Math.abs(tanD(x) - t) <= 8 * ULP * Math.max(1, Math.abs(t)), `tan(${g}°)`);
  }
  assert.ok(Math.abs(tanD(Math.PI / 6) * Math.sqrt(3) - 1) <= 4 * ULP);
});

test('a doua plasă, pe sursă: nucleul nu cheamă funcții Math care pot diferi între motoare (sin, cos, atan2, hypot, pow…)', () => {
  const dosar = new URL('../../src/sim/', import.meta.url);
  // `timp.ts` (estimarea, ADR 0046) nu scrie celule; restul dosarului e nucleul.
  const fisiere = readdirSync(dosar).filter((f) => f.endsWith('.ts') && f !== 'timp.ts');
  assert.ok(fisiere.includes('nucleu.ts') && fisiere.includes('unghi.ts'), fisiere.join(', '));
  // `**` e `Math.pow`; în comentarii nu contează (se scot întâi, păstrând liniile).
  const interzise = /Math\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log1p|log2|log10|pow|cbrt|hypot)\b|[\w)\]]\s*\*\*\s*[\w(.-]/;
  for (const f of fisiere) {
    const fara = readFileSync(new URL(f, dosar), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, '');
    fara.split('\n').forEach((l, k) => assert.ok(!interzise.test(l), `${f}:${k + 1}: ${l.trim()}`));
  }
  // Plasa are dinți: o linie cu `Math.hypot` sau cu `**` e prinsă.
  assert.ok(interzise.test('const r = Math.hypot(x, y);') && interzise.test('const q = x ** 2;') && !interzise.test(' * Math'));
});

test('din IR, nucleul importă doar tipuri: o funcție de acolo (baleiajArc, cu Math.atan2) ar ocoli trigonometria lui', () => {
  // Parserul regulilor de import (swc) nu deosebește `import type` de un import de valoare, deci plasa e aici, pe sursă.
  const dosar = new URL('../../src/sim/', import.meta.url);
  const importuri = /^\s*import\s+(type\s+)?[^;]*?from\s+'(\.\.\/ir\/[^']+)'/gm;
  let vazute = 0;
  for (const f of readdirSync(dosar).filter((x) => x.endsWith('.ts'))) {
    for (const m of readFileSync(new URL(f, dosar), 'utf8').matchAll(importuri)) {
      vazute++;
      assert.ok(m[1], `${f}: importă o valoare din ${m[2]}`);
    }
  }
  assert.ok(vazute >= 3, `doar ${vazute} importuri din IR văzute: expresia nu mai prinde nimic?`);
  const capcana = "import { baleiajArc, type Program } from '../ir/ir.ts';";
  assert.equal([...capcana.matchAll(importuri)][0]?.[1], undefined, 'plasa nu prinde un import de valoare');
});
