/**
 * Dopul în vederea 3D (ADR 0178, felia 12.1↑e; ADR 0170 §5): vederea 3D are, lângă foaie, câte o alegere pe dop, „Dopul N”,
 * în ordinea și cu semifabricatele exportului (aceeași funcție). Relieful dopului e programul lui simulat pe semifabricatul
 * lui (fața la Z 0, fundul la grosimea lui): pe fiecare celulă plană, aceeași înălțime ca oracolul independent al simulării
 * (`suprafataPeScule`), care citește G-code-ul dopului exportat. Un dop care nu se poate tăia nu oprește foaia: vederea o
 * simulează și spune motivul dopurilor. Un document fără incrustații n-are dopuri.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport, programSimulare, simuleazaRelief } from '../../src/ui/actiuniExportCalcul.ts';
import { suprafataPeScule } from '../oracles/incrustatie.ts';
import { CAZURI_INCRUSTATIE } from '../oracles/incrustatie.cazuri.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { documentCaz } from './ajutor-incrustatie.ts';

type Rec = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const CELULA = 0.1;

/** Incrustația cu pereți drepți pe dreptunghiul de 30 × 20 din (80, 60), Ø6, adâncă de 3, cu dopul decupat (marginea dată). */
function piesaDreapta(margine: number): Rec {
  return {
    id: 'q', radacina: { tip: 'element', id: 'b', matrice: { ...I, e: 80, f: 60 }, forma: { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 } },
    operatii: [{
      id: 'o', tip: 'buzunar', noduri: ['b'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, pasLateral: 2.4,
      scula: { numar: 3, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
      incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine },
    }],
  };
}

/**
 * Foaia de 200 × 150 × 18 cu incrustația în V a cazului „dreptunghi” (piesa `p`) și cea cu pereți drepți (piesa `q`); fără
 * `dreapta`, doar cea în V; fără niciuna, un profil simplu.
 */
function document(fel: 'amandoua' | 'fara' | 'refuz'): unknown {
  const v = documentCaz(CAZURI_INCRUSTATIE.find((c) => c.id === 'dreptunghi')!) as { piese: Rec[]; foi: { instante: Rec[] }[] };
  const d = { ...(v as object), schema: 25 } as { schema: number; piese: Rec[]; foi: { instante: Rec[] }[] };
  if (fel === 'fara') {
    const p = d.piese[0]! as { operatii: Rec[] };
    p.operatii = [{ ...p.operatii[0]!, tip: 'profil', latura: 'exterior', scula: { numar: 1, nume: 'freza plata', diametru: 6 }, incrustatie: undefined, fundPlat: undefined }];
    return d;
  }
  // Refuzul: marginea dopului decupat (2) sub freza lui (Ø6).
  d.piese.push(piesaDreapta(fel === 'refuz' ? 2 : 8));
  d.foi[0]!.instante.push({ id: 'j', piesa: 'q', x: 0, y: 0, rotire: 0 });
  return d;
}

const deschis = (brut: unknown) => {
  const r = incarca(JSON.parse(JSON.stringify(brut)));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

/** Sculele bucăților unui program, după comentariile `(scula T… D…)` din fața fiecăreia (V-ul cu unghiul din nume). */
function scule(text: string): SculaOracol[] {
  return [...text.matchAll(/^\(scula T\d+ ([^)]*?) D([\d.]+)\)$/gm)].map((m) => {
    const v = /V(\d+)/.exec(m[1] ?? '');
    return v ? { tip: 'v', diametru: Number(m[2]), unghi: Number(v[1]) } : { tip: 'plata', diametru: Number(m[2]) };
  });
}

test('lista dopurilor din vederea 3D e a exportului: în V, apoi cel drept, cu semifabricatele lor', async () => {
  const doc = deschis(document('amandoua'));
  const exp = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!exp.ok) assert.fail(exp.motiv);
  const p = await programSimulare(doc);
  if (!p.ok) assert.fail(p.motiv);
  assert.equal(exp.dopuri.length, 2);
  // Întâi dopul în V, apoi cel drept, amândouă cu „Împreună (secțiunea)” (ADR 0179; cel drept fără trepte, felia 12.1↑e-3).
  assert.deepEqual(p.dopuri, exp.dopuri.map((d) => ({ element: d.element, semifabricat: d.semifabricat })));
  // Ordinea, pe elemente: întâi dopul în V (instanța `i`, elementul `a0`), apoi cel drept (instanța `j`, elementul `b`).
  assert.deepEqual(p.dopuri.map((d) => d.element), ['i/a0', 'j/b']);
  assert.equal(p.motivDopuri, undefined);
  // Foaia rămâne foaia: aceeași mărime și grosime.
  assert.deepEqual(p.foaie, { latime: 200, inaltime: 150, grosime: 18 });
});

test('relieful fiecărui dop: pe semifabricatul lui, celulă cu celulă ca oracolul pe G-code-ul exportat (unde e plan)', async () => {
  const doc = deschis(document('amandoua'));
  const exp = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!exp.ok) assert.fail(exp.motiv);
  for (const [k, dop] of exp.dopuri.entries()) {
    const p = await programSimulare(doc, undefined, k);
    if (!p.ok) assert.fail(p.motiv);
    const s = dop.semifabricat;
    assert.deepEqual(p.foaie, { latime: s.latime, inaltime: s.inaltime, grosime: s.grosimeMinima }, `dopul ${k + 1}: semifabricatul`);
    const fereastra = { x0: 0, y0: 0, latime: s.latime, inaltime: s.inaltime, celula: CELULA };
    const r = await simuleazaRelief(p, fereastra);
    if (!r.ok) assert.fail(r.motiv);
    assert.equal(r.bloc, 1);
    const o = suprafataPeScule(dop.program.text, fereastra, scule(dop.program.text));
    assert.deepEqual([o.nx, o.ny], [r.latime, r.inaltime], `dopul ${k + 1}: grila`);
    // Celulele plane ale oracolului (vecinii la 0,01 unii de alții): aceeași înălțime, ± 0,02; fundul, la grosimea dopului.
    const zo = (i: number, j: number): number => Math.max(o.z[j * o.nx + i]!, -s.grosimeMinima);
    let plane = 0, rele = 0, prima = '';
    for (let j = 1; j < o.ny - 1; j++) {
      for (let i = 1; i < o.nx - 1; i++) {
        let lo = Infinity, hi = -Infinity;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const z = zo(i + di, j + dj); lo = Math.min(lo, z); hi = Math.max(hi, z); }
        if (hi - lo > 0.01) continue;
        plane++;
        const a = r.z[j * r.latime + i]!, b = zo(i, j);
        if (Math.abs(a - b) > 0.02) { rele++; if (!prima) prima = `(${i}, ${j}): relieful ${a}, oracolul ${b}`; }
      }
    }
    assert.ok(plane > 0.5 * (o.nx - 2) * (o.ny - 2), `dopul ${k + 1}: ${plane} celule plane din ${(o.nx - 2) * (o.ny - 2)}`);
    assert.equal(rele, 0, `dopul ${k + 1}: ${rele} celule plane diferite, prima ${prima}`);
    // Pe hârtie: fața dopului la 0, iar adâncimea cea mai mare e chiar fundul semifabricatului (decupat) sau fața coborâtă (V).
    assert.equal(r.sus, 0);
  }
});

test('un dop care nu se poate tăia nu oprește foaia: vederea o simulează, fără dopuri, cu motivul; un dop care lipsește, refuzat', async () => {
  const doc = deschis(document('refuz'));
  const p = await programSimulare(doc);
  if (!p.ok) assert.fail(p.motiv);
  assert.deepEqual(p.dopuri, []);
  assert.match(p.motivDopuri ?? '', /marginea dopului decupat \(2 mm\) trebuie să fie cel puțin cât freza lui/);
  const fara = await programSimulare(deschis(document('amandoua')), undefined, 2);
  assert.ok(!fara.ok && /dopul 3 nu mai e/.test(fara.motiv), fara.ok ? 'primit' : fara.motiv);
});

test('un document fără incrustații: foaia, fără dopuri și fără motiv', async () => {
  const p = await programSimulare(deschis(document('fara')));
  if (!p.ok) assert.fail(p.motiv);
  assert.deepEqual(p.dopuri, []);
  assert.equal(p.motivDopuri, undefined);
});
