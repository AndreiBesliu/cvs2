/**
 * Potrivirea incrustației în V (ADR 0170), pe oracolul independent (`test/oracles/incrustatie.ts`): documentul cu rolul
 * „Incrustație în V” trece prin exportul aplicației (în proces, ca în worker), iar oracolul citește textul celor două programe
 * (locașul, din programul foii, și dopul, din fișierul lui), le simulează pe sculă, întoarce dopul după contractul
 * semifabricatului și îl coboară până la primul contact. Valorile cerute vin de pe hârtie (`incrustatie.cazuri.ts`):
 * oprirea la S = D − g (± 0,05), pereții în contact pe cel puțin 95 % din bandă, jocul de sub dop g (± 0,05), spațiul dintre
 * plăci H (± 0,05). Controlul negativ: un dop tăiat ca a doua cavitate (defectul din ediția întâi) pică.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { masoaraPotrivirea, suprafataPeScule, type MasuraPotrivire } from '../oracles/incrustatie.ts';
import { CAZURI_INCRUSTATIE, type CazIncrustatie } from '../oracles/incrustatie.cazuri.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { documentCaz } from './ajutor-incrustatie.ts';

export { documentCaz } from './ajutor-incrustatie.ts';

const TOL = 0.05;
const CELULA = 0.1;

const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};

/** Sculele unui program, pe hârtie: freza dreaptă întâi, dacă programul are o schimbare, apoi freza în V. */
function scule(text: string, c: CazIncrustatie): SculaOracol[] {
  const v: SculaOracol = { tip: 'v', diametru: c.v.diametru, unghi: c.v.unghi };
  return /^T\d+ M6$/m.test(text) ? [{ tip: 'plata', diametru: c.dreapta.diametru }, v] : [v];
}

async function potrivire(c: CazIncrustatie): Promise<{ readonly m: MasuraPotrivire; readonly locas: string; readonly dop: string }> {
  const r = await calculeazaExport(deschis(documentCaz(c)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(`${c.id}: ${r.motiv}`);
  assert.equal(r.dopuri.length, 1, `${c.id}: un singur dop (o regiune de incrustație)`);
  const locas = r.program.text, dop = r.dopuri[0]!.program.text;
  const m = masoaraPotrivirea(
    { text: locas, scule: scule(locas, c) }, { text: dop, scule: scule(dop, c) }, c.desen,
    { D: c.D, g: c.g, H: c.H, margine: c.margine, unghi: c.v.unghi, celula: CELULA, lat: Math.min(c.margine, c.H * Math.tan((c.v.unghi * Math.PI) / 360) + 1) },
  );
  return { m, locas, dop };
}

for (const c of CAZURI_INCRUSTATIE) {
  test(`potrivirea pe oracol, ${c.id}: dopul se oprește la S = D − g, pereții se ating, jocurile pe hârtie (${c.hartie})`, async () => {
    const { m, locas } = await potrivire(c);
    const S = c.D - c.g;
    const unde = `${c.id}: oprirea ${m.asezare.toFixed(4)} la (${m.oprire[0].toFixed(2)}, ${m.oprire[1].toFixed(2)}); contactul ${(m.contact * 100).toFixed(1)} % din ${m.nContact}; sub ${JSON.stringify(m.sub)}; între ${JSON.stringify(m.intre)}`;
    assert.ok(Math.abs(m.asezare - S) <= TOL, `oprirea la S = ${S}: ${unde}`);
    assert.ok(m.nContact > 0 && m.contact >= 0.95, `pereții în contact pe cel puțin 95 %: ${unde}`);
    if (c.fundPlat) {
      assert.ok(m.sub.n > 0, `fundul plat are celule: ${unde}`);
      assert.ok(m.sub.min >= c.g - TOL && m.sub.max <= c.g + TOL, `jocul de sub dop g = ${c.g} ± ${TOL}: ${unde}`);
    } else {
      assert.equal(m.sub.n, 0, `fără fund plat: ${unde}`);
      assert.doesNotMatch(locas, /^T\d+ M6$/m, `locașul fără fund plat nu montează freza dreaptă: ${c.id}`);
    }
    assert.ok(m.intre.n > 0 && m.intre.min >= c.H - TOL && m.intre.max <= c.H + TOL, `spațiul dintre plăci H = ${c.H} ± ${TOL}: ${unde}`);
  });
}

test('fața dopului e coborâtă la S + H până la marginile semifabricatului, nu doar lângă desen (otrava P08: o ramă la margine)', async () => {
  const c = CAZURI_INCRUSTATIE[0]!;
  const r = await calculeazaExport(deschis(documentCaz(c)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const d = r.dopuri[0]!, text = d.program.text;
  const { latime, inaltime } = d.semifabricat;
  // Pe hârtie: dreptunghiul 12 × 6 cu marginea 5 → semifabricatul 22 × 16; fața la −(S + H) = −4,5, pe o fâșie de 1 mm
  // de-a lungul fiecărei margini (departe de pereții dopului, care stau la cel mult H·t = 1,155 de desen).
  assert.deepEqual([latime, inaltime], [22, 16]);
  const celula = 0.1;
  const o = suprafataPeScule(text, { x0: 0, y0: 0, latime, inaltime, celula }, scule(text, c));
  const S = c.D - c.g, fata = S + c.H;
  let n = 0, rele = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const x = (i + 0.5) * celula, y = (j + 0.5) * celula;
    if (Math.min(x, y, latime - x, inaltime - y) > 1) continue;
    n++;
    if (Math.abs(-o.z[j * o.nx + i]! - fata) > 0.05) rele++;
  }
  assert.ok(n > 1000, `celulele de pe margine: ${n}`);
  assert.equal(rele, 0, `${rele} din ${n} celule de pe margine nu sunt la −${fata}`);
});

test('controlul negativ: dopul tăiat ca a doua cavitate (desenul oglindit, săpat ca un V-carve obișnuit) pică oracolul', async () => {
  const c = CAZURI_INCRUSTATIE[0]!;
  // Același desen, oglindit și pus pe semifabricat după contract (x′ = x1 + m − x, y′ = y − y0 + m), cu un V-carve fără
  // incrustație: exact „masculul” din ediția întâi.
  const [x1, y0] = [32, 20];
  const oglindit = c.desen.map((pol) => pol.map(([x, y]) => [x1 + c.margine - x, y - y0 + c.margine] as const));
  const cavitate = { ...c, desen: oglindit };
  const r = await calculeazaExport(deschis(documentCaz(cavitate, false)), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const bun = await calculeazaExport(deschis(documentCaz(c)), { origine: 'stanga-jos', z0: 'sus' });
  if (!bun.ok) assert.fail(bun.motiv);
  const m = masoaraPotrivirea(
    { text: bun.program.text, scule: scule(bun.program.text, c) }, { text: r.program.text, scule: scule(r.program.text, c) }, c.desen,
    { D: c.D, g: c.g, H: c.H, margine: c.margine, unghi: c.v.unghi, celula: CELULA, lat: 2 },
  );
  assert.ok(!(Math.abs(m.asezare - (c.D - c.g)) <= TOL && m.contact >= 0.95), `a doua cavitate trece drept dop: oprirea ${m.asezare}, contactul ${m.contact}`);
});
