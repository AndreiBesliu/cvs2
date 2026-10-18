/**
 * Oracolul timpului pe GRBL 1.1h (`test/oracles/timp.ts`), judecat pe cazurile de hârtie (`timp.cazuri.ts`):
 * - fiecare caz, în toleranța lui (secundele, pauzele, mm de tăiere și de rapide, blocurile);
 * - pe fiecare caz, CONTROALE NEGATIVE: același program cu o setare sau un mecanism stricat (fereastra ±1 bloc, $11 × 2,
 *   $12 × 2, accelerația × 1,01, pauza fără rotunjire, sincronizarea scoasă / pusă peste tot) trebuie să iasă din
 *   toleranță, deci valoarea pe hârtie chiar depinde de mecanismul pe care îl probează; plus controale NEUTRE, unde o
 *   setare de care valoarea nu depinde trebuie să lase rezultatul pe loc;
 * - implicitele oracolului, față de cele citite a doua oară din `defaults.h` / `planner.h`;
 * - curățarea liniei ca în `protocol.c` (comentarii, spații, litere mici, `/`, N, T, CRLF);
 * - refuzurile: tot ce nu suportă oracolul (sau ar da `error:N` pe controler) aruncă, cu numărul liniei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMPLICITE_GRBL_11H, timpGrbl, timpGrblMutat, type SetariGrbl, type TimpGrbl } from '../oracles/timp.ts';
import { CAZURI_REFUZATE, CAZURI_TIMP, GENERIC_HARTIE, type CazTimp } from '../oracles/timp.cazuri.ts';

/** Abaterile rezultatului față de hârtie, câmp cu câmp; lista goală = în toleranță. */
function abateri(r: TimpGrbl, caz: CazTimp): string[] {
  const rez: string[] = [];
  const a = caz.asteptat;
  const tolMm = caz.tolerantaMm ?? 1e-9;
  const verifica = (camp: string, valoare: number, asteptat: number | undefined, tol: number): void => {
    if (asteptat === undefined) return;
    if (!(Math.abs(valoare - asteptat) <= tol)) rez.push(`${camp}: ${valoare} în loc de ${asteptat} (± ${tol})`);
  };
  verifica('secunde', r.secunde, a.secunde, caz.toleranta);
  verifica('secundePauze', r.secundePauze, a.secundePauze, caz.toleranta);
  verifica('taiere', r.taiere, a.taiere, tolMm);
  verifica('rapide', r.rapide, a.rapide, tolMm);
  verifica('blocuri', r.blocuri, a.blocuri, 0);
  return rez;
}

test('implicitele oracolului sunt cele din defaults.h (DEFAULTS_GENERIC) și planner.h, citite a doua oară', () => {
  assert.deepEqual(IMPLICITE_GRBL_11H, GENERIC_HARTIE);
});

test('sunt cel puțin 10 cazuri pe hârtie, fiecare cu derivare și cu cel puțin un control negativ', () => {
  assert.ok(CAZURI_TIMP.length >= 10, `${CAZURI_TIMP.length} cazuri`);
  for (const caz of CAZURI_TIMP) {
    assert.ok(caz.derivare.length > 0, caz.nume);
    assert.ok(caz.controale.length > 0, caz.nume);
    assert.ok(Number.isFinite(caz.asteptat.secunde) && caz.asteptat.secunde > 0, caz.nume);
  }
});

for (const caz of CAZURI_TIMP) {
  test(`hârtie: ${caz.nume} [${caz.derivare}]`, () => {
    const r = timpGrbl(caz.gcode, caz.setari);
    assert.deepEqual(abateri(r, caz), []);
    assert.ok(r.secunde >= r.secundePauze, 'totalul cuprinde pauzele');
  });

  for (const c of caz.controale) {
    test(`control negativ: ${caz.nume} — ${c.descriere} (trebuie să iasă din toleranță)`, () => {
      const s = c.setari ?? caz.setari;
      const r = c.mutatii ? timpGrblMutat(caz.gcode, s, c.mutatii) : timpGrbl(caz.gcode, s);
      assert.notDeepEqual(abateri(r, caz), [], `controlul a rămas în toleranță: ${JSON.stringify(r)}`);
    });
  }

  for (const n of caz.neutre ?? []) {
    test(`control neutru: ${caz.nume} — ${n.descriere} (rămâne în toleranță)`, () => {
      assert.deepEqual(abateri(timpGrbl(caz.gcode, n.setari), caz), []);
    });
  }
}

test('fără mutații, varianta mutată e oracolul însuși', () => {
  for (const caz of CAZURI_TIMP) assert.deepEqual(timpGrblMutat(caz.gcode, caz.setari, {}), timpGrbl(caz.gcode, caz.setari), caz.nume);
});

test('curățarea liniei ca în protocol.c: comentarii, spații, litere mici, `/`, N, T, CRLF, liniile goale', () => {
  const s: SetariGrbl = { ...GENERIC_HARTIE, vitezaMaxima: [5000, 5000, 5000] };
  const baza = timpGrbl('G1 X200 F1000\nG1 Y50', s);
  const variante = [
    'g1 x200 f1000\ng1 y50',
    'G1 X 200 F 1000 (comentariu ; cu punct și virgulă)\nG1 Y50 ; restul liniei',
    '(antet)\n\n   \nN10 T1 G1 X200.000 F1000.\r\nN20 G1 Y+50',
    '/G1 X200 F1000\r\nG1 Y50\r\n',
    'G1 X200 F1000 (neînchis până la capăt X999\nG1 Y50',
    'G1X200F1000\nG1Y50',
  ];
  for (const v of variante) assert.deepEqual(timpGrbl(v, s), baza, JSON.stringify(v));
});

test('read_float ține doar primele 8 cifre (nuts_bolts.c:25, 56-62)', () => {
  // Cu 3 pași/mm, pragul de jumătate de pas e 1/6 mm = 0,1666…: 0,16666666667 e peste el (lround → 1 pas), dar
  // GRBL citește doar 0,1666666 (8 cifre), sub el (lround → 0): blocul e gol.
  const s: SetariGrbl = { ...GENERIC_HARTIE, pasiPeMm: [3, 3, 3] };
  assert.equal(timpGrbl('G1 X0.16666666667 F100', s).blocuri, 0);
  assert.equal(timpGrbl('G1 X0.1666667 F100', s).blocuri, 1);
});

test('o linie cu exact 79 de caractere utile trece, cu 80 e refuzată', () => {
  const linie = (n: number): string => `G0X${'0'.repeat(n - 3)}`;
  assert.equal(linie(79).length, 79);
  assert.deepEqual(timpGrbl(linie(79), GENERIC_HARTIE), timpGrbl('', GENERIC_HARTIE));
  assert.throws(() => timpGrbl(linie(80), GENERIC_HARTIE), /^Error: linia 1:/);
});

test('programul gol, comentariile și modurile fără mișcare durează 0', () => {
  for (const g of ['', '\n\n', '(doar comentarii)\n; și asta', 'G21 G90 G94 G17 G40 G49 G54 G80\nG1 F100\nS1000\nM9\nM30']) {
    assert.deepEqual(timpGrbl(g, GENERIC_HARTIE), { secunde: 0, secundePauze: 0, taiere: 0, rapide: 0, blocuri: 0 }, JSON.stringify(g));
  }
});

test('blocul gol (sub jumătate de pas) nu intră în planificator', () => {
  // 0,001 mm × 250 pași/mm = 0,25 pași → lround = 0 (planner.c:381).
  assert.deepEqual(timpGrbl('G1 X0.001 F100', GENERIC_HARTIE), { secunde: 0, secundePauze: 0, taiere: 0, rapide: 0, blocuri: 0 });
});

for (const r of CAZURI_REFUZATE) {
  test(`refuzat: ${r.nume} (linia ${r.linia})`, () => {
    assert.throws(
      () => timpGrbl(r.gcode, GENERIC_HARTIE),
      (e: unknown) => e instanceof Error && e.message.startsWith(`linia ${r.linia}: `),
    );
  });
}

test('setările nevalide sunt refuzate', () => {
  const rele: readonly SetariGrbl[] = [
    { ...GENERIC_HARTIE, pasiPeMm: [250, 0, 250] },
    { ...GENERIC_HARTIE, vitezaMaxima: [500, 500, Number.NaN] },
    { ...GENERIC_HARTIE, acceleratie: [-1, 10, 10] },
    { ...GENERIC_HARTIE, deviatieJonctiune: -0.01 },
    { ...GENERIC_HARTIE, toleranteArc: 0 },
    { ...GENERIC_HARTIE, blocuriPlanificator: 0 },
    { ...GENERIC_HARTIE, blocuriPlanificator: 2.5 },
  ];
  for (const s of rele) assert.throws(() => timpGrbl('G0 X1', s), /setări GRBL nevalide/);
});
