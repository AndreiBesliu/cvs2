/**
 * Plasa pe sursă a nucleului reliefului (ADR 0310 §3, ca ADR 0047 §6 pentru simulare): în `src/relief/`, doar + − × ÷ √ min
 * max și rotunjirile, deci aceleași valori în Node și în orice browser. Funcțiile `Math` pe care ECMAScript le lasă
 * „dependente de implementare” (sin, exp, pow, `**`…) nu au voie. Prima plasă rămâne amprenta Node = Edge din e2e.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

test('nucleul reliefului nu cheamă funcții Math care pot diferi între motoare (sin, exp, log, pow, hypot, **…)', () => {
  const dosar = new URL('../../src/relief/', import.meta.url);
  const fisiere = readdirSync(dosar).filter((f) => f.endsWith('.ts'));
  assert.ok(fisiere.includes('imagine.ts') && fisiere.includes('dala.ts') && fisiere.includes('compunere.ts'), fisiere.join(', '));
  const interzise = /Math\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log1p|log2|log10|pow|cbrt|hypot)\b|[\w)\]]\s*\*\*\s*[\w(.-]/;
  for (const f of fisiere) {
    const fara = readFileSync(new URL(f, dosar), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, '');
    fara.split('\n').forEach((l, k) => assert.ok(!interzise.test(l), `${f}:${k + 1}: ${l.trim()}`));
  }
  assert.ok(interzise.test('const r = Math.exp(x);') && interzise.test('const q = 2 ** n;') && !interzise.test(' * Math'));
});
