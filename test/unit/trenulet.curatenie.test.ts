/**
 * Curățenia motorului elicelor (ADR 0340, felia 3.Cm-6; auditul elicelor, constatarea 7), la octet: o singură funcție a
 * secțiunilor paletei pentru elice, elicea de barcă și rotor, și un singur numărător al laturilor cercului (`laturiFine`, în
 * locul lui `laturiCerc` al ventilatorului). Piesele nu se schimbă: amprenta a 360 de elice, 240 de elice de barcă și 240 de
 * ventilatoare (rotorul, cu inel și fără, și carcasa), pe toată plaja (și peste Ø80, cu grosimea din 3.Cm-5), plus cotele lor,
 * luată din motorul lui 18.48.0, înaintea feliei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

type Lego = {
  construieste(d: Record<string, unknown>): { tri: unknown; prinderi?: unknown; tipar?: unknown };
  eliceCote(d: Record<string, unknown>): unknown;
  eliceBarcaCote(d: Record<string, unknown>): unknown;
  ventilatorCote(d: Record<string, unknown>): unknown;
};

const cere = createRequire(import.meta.url);
const { motoare } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as { motoare(): { L: Lego } };
const { L } = motoare();

/** Câte o valoare din fiecare listă, după cifrele lui i în baze diferite: combinațiile acoperă plaja fără produsul ei întreg. */
const din = <T>(i: number, k: number, v: readonly T[]): T => v[Math.floor(i / k) % v.length]!;

function amprenta(tip: string, cote: (d: Record<string, unknown>) => unknown, defs: readonly Record<string, unknown>[]): string {
  const h = createHash('sha256');
  for (const d of defs) {
    const p = L.construieste({ tip, ...d });
    h.update(JSON.stringify([p.tri, p.prinderi ?? null, p.tipar ?? null, cote(d)]));
  }
  return h.digest('hex');
}

const ELICE: Record<string, unknown>[] = [];
for (let i = 0; i < 360; i++) {
  ELICE.push({ palete: 2 + (i % 7), diametru: din(i, 7, [20, 27.4, 43.1, 72, 80, 100, 155.3, 200]), pas: din(i, 3, [0.3, 0.59, 0.93, 1.5]),
    latime: din(i, 5, [15, 25, 30, 60]), forma: din(i, 11, ['rot', 'ingust', 'drept']), paleta: din(i, 13, ['rasucita', 'plata']),
    profil: din(i, 17, ['placa', 'aripa']), sens: i % 2 ? 'stanga' : 'dreapta', gaura: din(i, 19, ['x', 'r', 'b', 'nu']), con: din(i, 23, ['nu', 'da']) });
}
const BARCA: Record<string, unknown>[] = [];
for (let i = 0; i < 240; i++) {
  BARCA.push({ palete: 3 + (i % 3), diametru: din(i, 3, [20, 24, 40, 56.3, 90, 120]), pas: din(i, 5, [0.5, 1, 1.6]), latime: din(i, 7, [40, 100, 150]),
    inclinare: din(i, 11, [0, 20, 40]), pupa: din(i, 13, [0, 7, 15]), sens: i % 2 ? 'stanga' : 'dreapta', gaura: din(i, 17, ['x', 'r', 'b', 'nu']), capac: din(i, 19, ['nu', 'da']) });
}
const VENTILATOR: Record<string, unknown>[] = [];
for (let i = 0; i < 240; i++) {
  VENTILATOR.push({ piesa: din(i, 1, ['rotor', 'rotor', 'carcasa']), palete: 3 + (i % 10), diametru: din(i, 3, [24, 40, 48, 56.3, 80, 120]),
    joc: din(i, 7, [0.3, 0.8, 2]), pas: din(i, 11, [0.3, 0.8, 1.5]), latime: din(i, 13, [15, 45, 60]), sens: i % 2 ? 'stanga' : 'dreapta',
    gaura: din(i, 17, ['x', 'r', 'b', 'nu']), inel: din(i, 19, ['nu', 'da']), urechi: din(i, 23, [2, 4]) });
}

test('elicea, pe toată plaja: plasa, prinderile, tipărirea și cotele, la octet', () => {
  assert.equal(amprenta('elice', (d) => L.eliceCote(d), ELICE), '9e9308851e8cdf1c7bdf1f0dd5977b2106f0f3a4719df043e128e6696e4d6e30');
});
test('elicea de barcă, pe toată plaja: la octet', () => {
  assert.equal(amprenta('eliceBarca', (d) => L.eliceBarcaCote(d), BARCA), 'b7518dab10fcda9c910766244a6536368c9ffe8bab5d6b31819a6acf59482313');
});
test('ventilatorul (rotorul, cu inel și fără, și carcasa), pe toată plaja: la octet', () => {
  assert.equal(amprenta('ventilator', (d) => L.ventilatorCote(d), VENTILATOR), '88caab3716c3be4628dbd2bd5a2cc3b28b1d19353ad9ef861475a82712b4b550');
});
