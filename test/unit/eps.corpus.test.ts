import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Varf } from '../../src/geom/contur.ts';
import { citesteEps, CODURI_AVERTISMENT_EPS, type CaleEps } from '../../src/io/eps.ts';

/**
 * Corpusul independent al importului EPS și AI ≤ 8 (ADR 0115): fișierele scrise de `test/oracles-py/eps_import_corpus.py`,
 * trecute acolo prin Ghostscript și recitite cu PyMuPDF (fiecare subcale de pe hârtie desenată, niciuna în plus), și
 * valorile lor pe hârtie. Aici, ușa le citește și trebuie să dea aceleași căi (sub 1e-6 mm), aceleași numere de căi,
 * aceleași straturi și exact raportul scris (restul codurilor, 0), sau refuzul scris, cu detaliul lui.
 */

type Pereche = readonly [number, number];
type Asteptat = {
  readonly refuz?: string;
  readonly detaliu?: string;
  readonly straturi?: readonly string[];
  readonly linii_frante?: ReadonlyArray<{ readonly ce: string; readonly puncte: readonly Pereche[]; readonly inchis: boolean; readonly strat?: string }>;
  readonly bezier?: ReadonlyArray<{ readonly ce: string; readonly puncte: readonly Pereche[] }>;
  readonly arii?: ReadonlyArray<{ readonly ce: string; readonly arie: number; readonly cutie: readonly [number, number, number, number] }>;
  readonly numar_cai?: { readonly inchise: number; readonly deschise: number };
  readonly raport?: Readonly<Record<string, number>>;
  readonly illustrator?: boolean;
};

const DIR = new URL('../fixtures/eps/', import.meta.url);
const ASTEPTAT = JSON.parse(readFileSync(new URL('asteptat.json', DIR), 'utf8')) as Readonly<Record<string, Asteptat>>;
const TOL = 1e-6;
const aproape = (p: { readonly x: number; readonly y: number }, q: Pereche | undefined): boolean => q !== undefined && Math.hypot(p.x - q[0], p.y - q[1]) <= TOL;

/** O cale doar din linii, cu vârfurile exact punctele (închisă: fără primul repetat; deschisă: cu punctul final). */
function linieFranta(cai: readonly CaleEps[], puncte: readonly Pereche[], inchis: boolean, strat?: string): boolean {
  return cai.some((c) => c.inchis === inchis && (strat === undefined || c.strat === strat) && c.varfuri.length === puncte.length
    && c.varfuri.every((v, i) => v.s.tip === 'L' && aproape(v.p, puncte[i])));
}

/** O cubică (din p0, cu c1, c2, până în p3) într-una din căi. */
function cubica(cai: readonly CaleEps[], [p0, c1, c2, p3]: readonly Pereche[]): boolean {
  return cai.some((c) => c.varfuri.some((v, i) => v.s.tip === 'C' && aproape(v.p, p0) && aproape(v.s.c1, c1) && aproape(v.s.c2, c2)
    && aproape((c.varfuri[(i + 1) % c.varfuri.length] as Varf).p, p3)));
}

/** Aria (formula trapezelor) și cutia unei căi închise doar din linii. */
function arieSiCutie(c: CaleEps): { readonly arie: number; readonly cutie: readonly [number, number, number, number] } | null {
  if (!c.inchis || !c.varfuri.every((v) => v.s.tip === 'L')) return null;
  let a = 0;
  c.varfuri.forEach((v, i) => {
    const u = (c.varfuri[(i + 1) % c.varfuri.length] as Varf).p;
    a += v.p.x * u.y - u.x * v.p.y;
  });
  const xs = c.varfuri.map((v) => v.p.x), ys = c.varfuri.map((v) => v.p.y);
  return { arie: Math.abs(a / 2), cutie: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

for (const [fisier, a] of Object.entries(ASTEPTAT)) {
  test(`corpusul EPS: ${fisier}`, () => {
    const r = citesteEps(new Uint8Array(readFileSync(new URL(fisier, DIR))));
    if (a.refuz) {
      assert.equal(r.ok ? 'citit' : r.cod, a.refuz);
      if (!r.ok && a.detaliu !== undefined) assert.equal(r.detaliu, a.detaliu);
      if (!r.ok && a.raport) for (const k of CODURI_AVERTISMENT_EPS) assert.equal(r.avertismente?.[k] ?? 0, a.raport[k] ?? 0, `${fisier}: ${k}`);
      return;
    }
    if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
    for (const x of a.linii_frante ?? []) assert.ok(linieFranta(r.cai, x.puncte, x.inchis, x.strat), x.ce);
    for (const x of a.bezier ?? []) assert.ok(cubica(r.cai, x.puncte), x.ce);
    for (const x of a.arii ?? []) {
      const gasita = r.cai.some((c) => {
        const m = arieSiCutie(c);
        return m !== null && Math.abs(m.arie - x.arie) <= TOL && m.cutie.every((v, i) => Math.abs(v - (x.cutie[i] as number)) <= TOL);
      });
      assert.ok(gasita, x.ce);
    }
    if (a.numar_cai) assert.deepEqual({ inchise: r.cai.filter((c) => c.inchis).length, deschise: r.cai.filter((c) => !c.inchis).length }, a.numar_cai);
    assert.deepEqual(r.straturi, a.straturi ?? []);
    if (a.illustrator !== undefined) assert.equal(r.illustrator, a.illustrator);
    // Raportul întreg: codurile scrise cu numărul lor, celelalte 0 (`deschise` e numărul căilor deschise, deja verificat).
    const raport = a.raport ?? {};
    for (const k of CODURI_AVERTISMENT_EPS) if (k !== 'deschise') assert.equal(r.avertismente[k], raport[k] ?? 0, `${fisier}: ${k}`);
  });
}

test('corpusul EPS are toate fișierele generatorului (cele 7 seturi), fiecare cu un fișier pe disc', () => {
  assert.equal(Object.keys(ASTEPTAT).length, 7);
  for (const f of Object.keys(ASTEPTAT)) assert.ok(readFileSync(new URL(f, DIR)).length > 0, f);
});
