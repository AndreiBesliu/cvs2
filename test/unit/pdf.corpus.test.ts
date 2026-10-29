import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Varf } from '../../src/geom/contur.ts';
import { citestePdf, CODURI_AVERTISMENT_PDF, type CalePdf } from '../../src/io/pdf.ts';

/**
 * Corpusul independent al importului PDF (ADR 0104): PDF-urile scrise de PyMuPDF / MuPDF (`test/oracles-py/pdf_import_corpus.py`)
 * și valorile lor pe hârtie, verificate în generator față de ce citește MuPDF din fișier. Aici, ușa le citește și trebuie să
 * dea aceleași căi (sub 1e-6 mm), aceleași numere de căi, aceleași straturi și exact raportul scris (restul codurilor, 0).
 */

type Pereche = readonly [number, number];
type Asteptat = {
  readonly refuz?: string;
  readonly pagina?: Pereche;
  readonly pagini?: number;
  readonly straturi?: readonly string[];
  readonly linii_frante?: ReadonlyArray<{ readonly ce: string; readonly puncte: readonly Pereche[]; readonly inchis: boolean; readonly strat?: string }>;
  readonly bezier?: ReadonlyArray<{ readonly ce: string; readonly puncte: readonly Pereche[] }>;
  readonly arii?: ReadonlyArray<{ readonly ce: string; readonly arie: number; readonly cutie: readonly [number, number, number, number] }>;
  readonly numar_cai?: { readonly inchise: number; readonly deschise: number };
  readonly raport?: Readonly<Record<string, number>>;
};

const DIR = new URL('../fixtures/pdf/', import.meta.url);
const ASTEPTAT = JSON.parse(readFileSync(new URL('asteptat.json', DIR), 'utf8')) as Readonly<Record<string, Asteptat>>;
const TOL = 1e-6;
const aproape = (p: { readonly x: number; readonly y: number }, q: Pereche | undefined): boolean => q !== undefined && Math.hypot(p.x - q[0], p.y - q[1]) <= TOL;

/** O cale doar din linii, cu vârfurile exact punctele (închisă: fără primul repetat; deschisă: cu punctul final). */
function linieFranta(cai: readonly CalePdf[], puncte: readonly Pereche[], inchis: boolean, strat?: string): boolean {
  return cai.some((c) => c.inchis === inchis && (strat === undefined || c.strat === strat) && c.varfuri.length === puncte.length
    && c.varfuri.every((v, i) => v.s.tip === 'L' && aproape(v.p, puncte[i])));
}

/** O cubică (din p0, cu c1, c2, până în p3) într-una din căi. */
function cubica(cai: readonly CalePdf[], [p0, c1, c2, p3]: readonly Pereche[]): boolean {
  return cai.some((c) => c.varfuri.some((v, i) => v.s.tip === 'C' && aproape(v.p, p0) && aproape(v.s.c1, c1) && aproape(v.s.c2, c2)
    && aproape((c.varfuri[(i + 1) % c.varfuri.length] as Varf).p, p3)));
}

/** Aria (formula trapezelor) și cutia unei căi închise doar din linii. */
function arieSiCutie(c: CalePdf): { readonly arie: number; readonly cutie: readonly [number, number, number, number] } | null {
  if (!c.inchis || !c.varfuri.every((v) => v.s.tip === 'L')) return null;
  let a = 0;
  c.varfuri.forEach((v, i) => {
    const u = (c.varfuri[(i + 1) % c.varfuri.length] as Varf).p;
    a += v.p.x * u.y - u.x * v.p.y;
  });
  const xs = c.varfuri.map((v) => v.p.x), ys = c.varfuri.map((v) => v.p.y);
  return { arie: Math.abs(a / 2), cutie: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

for (const [cheie, a] of Object.entries(ASTEPTAT)) {
  test(`corpusul PDF: ${cheie}`, async () => {
    const [fisier, pagina] = cheie.split('#') as [string, string | undefined];
    const octeti = new Uint8Array(readFileSync(new URL(fisier, DIR)));
    const r = await citestePdf(octeti, pagina ? { pagina: Number(pagina) } : {});
    if (a.refuz) {
      assert.equal(r.ok ? 'citit' : r.cod, a.refuz);
      return;
    }
    if (!r.ok) throw new Error(`refuzat: ${r.cod} ${r.detaliu ?? ''}`);
    assert.equal(r.pagini, a.pagini);
    if (a.pagina) assert.ok(Math.abs(r.marime.latime - a.pagina[0]) <= TOL && Math.abs(r.marime.inaltime - a.pagina[1]) <= TOL, JSON.stringify(r.marime));
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
    if (a.straturi) assert.deepEqual(r.straturi, a.straturi);
    // Raportul întreg: codurile scrise cu numărul lor, celelalte 0 (`deschise` e numărul căilor deschise, deja verificat).
    const raport = a.raport ?? {};
    for (const k of CODURI_AVERTISMENT_PDF) if (k !== 'deschise') assert.equal(r.avertismente[k], raport[k] ?? 0, `${cheie}: ${k}`);
  });
}

test('corpusul PDF are toate fișierele generatorului (cele 10 seturi), fiecare cu un fișier pe disc', () => {
  assert.equal(Object.keys(ASTEPTAT).length, 10);
  for (const cheie of Object.keys(ASTEPTAT)) assert.ok(readFileSync(new URL(cheie.split('#')[0] as string, DIR)).length > 0, cheie);
});
