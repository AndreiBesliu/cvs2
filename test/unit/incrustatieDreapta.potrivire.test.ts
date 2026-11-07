/**
 * Potrivirea incrustației cu pereți drepți (ADR 0171), pe oracolul independent (`test/oracles/incrustatieDreapta.ts`):
 * documentul v21 cu un buzunar care își declară dopul trece prin exportul aplicației (în proces, ca în worker), iar oracolul
 * citește textul celor două programe și măsoară jocul lateral c ± 0,02 pe tot peretele locașului (și în colțuri), interferența
 * (niciun punct al peretelui dopului în afara locașului), adâncimea și înălțimea dopului ± 0,05, spațiul rămas după sprijin, și
 * razele colțurilor pe hârtie (`incrustatieDreapta.cazuri.ts`) ± 0,02. Controlul negativ: un dop cu vârfuri ascuțite (desenul
 * micșorat cu c, fără potrivirea colțurilor) pică, pe interferență.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivireaDreapta, type MasuraDreapta } from '../oracles/incrustatieDreapta.ts';
import { CAZURI_DREAPTA, type CazDreapta, type FrezaPlataCaz } from '../oracles/incrustatieDreapta.cazuri.ts';
import { cutieDesen, type PunctO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const TOL_JOC = 0.02, TOL_Z = 0.05, TOL_RAZA = 0.02;
const CELULA = 0.05;

const cale = (pol: readonly PunctO[]) => ({ tip: 'cale', inchis: true, varfuri: pol.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) });
const sculaDoc = (f: FrezaPlataCaz) => ({ numar: f.numar, nume: 'freza plata', diametru: f.diametru });

/** Documentul v21 al unui caz: o piesă cu desenul și buzunarul cu incrustația, pe o foaie de 200 × 150 × 18. */
export function documentDrept(c: CazDreapta): unknown {
  const noduri = c.desen.map((pol, k) => ({ tip: 'element', id: `a${k}`, matrice: { ...I }, forma: cale(pol) }));
  const [prima, ...rest] = c.locas;
  const operatie = {
    id: 'inc', tip: 'buzunar', noduri: noduri.map((n) => n.id), latura: 'interior', sens: 'urcare', adancime: c.D, pas: c.pas,
    scula: sculaDoc(prima!), pasLateral: prima!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
    ...(rest.length > 0 ? { rest: rest.map((r) => ({ scula: sculaDoc(r), pasLateral: r.pasLateral })) } : {}),
    incrustatie: {
      fel: 'drept', jocLateral: c.c, dop: c.dop, sprijin: c.sprijin, joc: c.g, fierastrau: c.H, margine: c.margine,
      ...(c.frezeDop ? { frezeDop: c.frezeDop.map((f) => ({ scula: sculaDoc(f), pasLateral: f.pasLateral })) } : {}),
    },
  };
  return {
    schema: 21, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii: [operatie] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}

const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

/** Sculele bucăților unui program, în ordine: cea de la pornire, apoi fiecare `T… M6`, după numărul lor. */
function scule(text: string, freze: readonly FrezaPlataCaz[]): SculaOracol[] {
  const dupaNumar = new Map(freze.map((f) => [f.numar, f.diametru]));
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  // Prima bucată e a frezei montate la pornire: cea dinaintea primei schimbări (aici, cea care nu e prima schimbată).
  const ramase = freze.map((f) => f.numar).filter((n) => n !== m6[0]);
  const pornire = m6.length === 0 ? freze[0]!.numar : (ramase[0] ?? freze[0]!.numar);
  return [pornire, ...m6].map((n) => ({ tip: 'plata', diametru: dupaNumar.get(n) ?? NaN }));
}

const inaltimeDop = (c: CazDreapta): number => (c.dop === 'decupat' || c.sprijin === 'fund' ? c.D + c.H : c.D - c.g);

async function potrivire(c: CazDreapta): Promise<{ readonly m: MasuraDreapta; readonly locas: string; readonly dop: string }> {
  const r = await calculeazaExport(deschis(documentDrept(c)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  assert.equal(r.dopuri.length, 1, `${c.id}: un singur dop`);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  const m = masoaraPotrivireaDreapta(
    { text: locas, scule: scule(locas, c.locas) }, { text: dop, scule: scule(dop, c.frezeDop ?? c.locas) }, c.desen,
    { D: c.D, h: inaltimeDop(c), dop: c.dop, margine: c.margine, celula: CELULA },
  );
  return { m, locas, dop };
}

for (const c of CAZURI_DREAPTA) {
  test(`pereții drepți pe oracol, ${c.id}: jocul ${c.c} pe tot conturul, fără interferență, oprirea și razele pe hârtie (${c.hartie})`, async () => {
    const { m } = await potrivire(c);
    const h = inaltimeDop(c);
    const unde = `${c.id}: jocul ${JSON.stringify(m.joc)}, interferența ${m.interferenta} din ${m.nDop}, D ${m.adancime}, h ${m.inaltime}`;
    assert.ok(m.joc.n > 100, `punctele peretelui locașului: ${unde}`);
    assert.ok(m.joc.min >= c.c - TOL_JOC && m.joc.max <= c.c + TOL_JOC, `jocul lateral c = ${c.c} ± ${TOL_JOC}: ${unde}`);
    assert.ok(m.nDop > 100, `punctele peretelui dopului: ${unde}`);
    assert.equal(m.interferenta, 0, `niciun punct al dopului în afara locașului: ${unde}`);
    assert.ok(Math.abs(m.adancime - c.D) <= TOL_Z, `adâncimea locașului D = ${c.D}: ${unde}`);
    assert.ok(Math.abs(m.inaltime - h) <= TOL_Z, `înălțimea dopului h = ${h}: ${unde}`);
    if (c.dop === 'ridicat' && c.sprijin === 'fata') assert.ok(Math.abs(m.adancime - m.inaltime - c.g) <= TOL_Z, `sub dop rămâne g = ${c.g}: ${unde}`);
    else assert.ok(Math.abs(m.inaltime - m.adancime - c.H) <= TOL_Z, `peste placă rămâne H = ${c.H}: ${unde}`);
    for (const q of c.raze) {
      const t = m.margineaPeRaza(q.p, q.d, q.lungime);
      assert.ok(Math.abs(t - q.asteptat) <= TOL_RAZA, `${c.id}, ${q.ce}: ${t.toFixed(4)} față de ${q.asteptat.toFixed(4)} pe hârtie`);
    }
  });
}

/** Poligonul micșorat cu d (fiecare latură mutată spre interior, vârfurile la intersecții), pentru un poligon trigonometric. */
function micsorat(pol: readonly PunctO[], d: number): PunctO[] {
  const n = pol.length;
  const linii = pol.map((a, k) => {
    const b = pol[(k + 1) % n]!;
    const lx = b[0] - a[0], ly = b[1] - a[1], l = Math.hypot(lx, ly);
    const nx = -ly / l, ny = lx / l; // normala spre interior (stânga), pe un poligon trigonometric
    return { p: [a[0] + nx * d, a[1] + ny * d] as const, u: [lx / l, ly / l] as const };
  });
  return linii.map((L1, k) => {
    const L0 = linii[(k - 1 + n) % n]!;
    const den = L0.u[0] * L1.u[1] - L0.u[1] * L1.u[0];
    const t = ((L1.p[0] - L0.p[0]) * L1.u[1] - (L1.p[1] - L0.p[1]) * L1.u[0]) / den;
    return [L0.p[0] + t * L0.u[0], L0.p[1] + t * L0.u[1]] as const;
  });
}

test('controlul negativ: un dop cu vârfuri ascuțite (desenul micșorat cu c, colțurile nepotrivite) pică, pe interferență', async () => {
  const c = CAZURI_DREAPTA[0]!;
  const { x1, y0 } = cutieDesen(c.desen);
  const m = c.margine, h = inaltimeDop(c);
  // Dopul „rău”: un buzunar obișnuit al semifabricatului lărgit, cu steaua micșorată cu c, oglindită după contract, ca insulă.
  const oglindit = micsorat(c.desen[0]!, c.c).map(([x, y]) => [x1 + m - x, y - y0 + m] as const).reverse();
  const { x0: X0, y0: Y0, x1: X1, y1: Y1 } = cutieDesen(c.desen);
  const W = X1 - X0 + 2 * m, Hs = Y1 - Y0 + 2 * m;
  const rau = {
    schema: 21, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'r', matrice: { ...I }, copii: [
          // Rama cât semifabricatul (în foaie, fără ieșire): fâșia netăiată de lângă margine e a ramei, nu a dopului.
          { tip: 'element', id: 'rama', matrice: { ...I }, forma: cale([[0, 0], [W, 0], [W, Hs], [0, Hs]]) },
          { tip: 'element', id: 'dop', matrice: { ...I }, forma: cale(oglindit) },
        ],
      },
      operatii: [{
        id: 'b', tip: 'buzunar', noduri: ['rama', 'dop'], latura: 'interior', sens: 'urcare', adancime: h, pas: c.pas,
        scula: sculaDoc(c.locas[0]!), pasLateral: c.locas[0]!.pasLateral, urechi: null, rampa: null, intrari: null, colturi: null,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
  const r = await calculeazaExport(deschis(rau), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const bun = await calculeazaExport(deschis(documentDrept(c)), { origine: 'stanga-jos', z0: 'sus' });
  if (!bun.ok) assert.fail(bun.motiv);
  const masura = masoaraPotrivireaDreapta(
    { text: bun.program.text, scule: scule(bun.program.text, c.locas) }, { text: r.program.text, scule: scule(r.program.text, c.locas) }, c.desen,
    { D: c.D, h, dop: 'ridicat', margine: m, celula: CELULA },
  );
  assert.ok(masura.interferenta > 0, `dopul cu vârfuri ascuțite trece drept potrivit: ${JSON.stringify(masura.joc)}, interferența ${masura.interferenta} din ${masura.nDop}`);
});
