/**
 * Ușa SVG pe fișierele reale (sub-felia 2.3c-1, ADR 0037 §11 și „Ce am măsurat” 4), aplicația față de oracol:
 * - (0) oracolul pe faptele măsurate (soarta fiecărei subcăi, din jurnalul `subcai`): logoul VfB are 8 subcăi umplute fără Z,
 *   cu golurile 5e-5 … 6e-4 mm la 96 px, toate închise de umplere; logoul Presto are 2, cu golul 0,001 px; valul de
 *   150 mm al lui CNC-referinta (`fill: none`) rămâne deschis; logoul AS Roma și logoul plăcii 2 n-au nicio subcale
 *   deschisă (AS Roma are o subcale `M … Z` fără întindere: degenerată, ca în 2.7c);
 * - (a) aplicația față de oracol, rezultatul întreg (`judecaRezultat`), la 96 și la 72 px pe țol.
 * Fișierele din afara repo-ului (VfB, Presto, AS Roma) se citesc de pe disc la rulare și se sar, cu motivul, unde lipsesc
 * (CI nu le are); reproducerile lor sintetice stau în corpus (secțiunea U), deci CI le judecă oricum. CNC-referinta și
 * logoul plăcii 2 sunt în repo.
 *
 * Praful logoului VfB (ADR 0037 §11, precizarea 13.10): „cele 2 subcăi praf” din „Ce am măsurat” 4 nu sunt subcăi ale
 * fișierului (nicio subcale nu e sub rezoluție). În formele 1 și 3, coada ultimei cubice taie capul primei lângă start, deci
 * închiderea de umplere lasă câte o buclă de mărimea golului. Forma 3 se normalizează (nonzero), iar ieșirea ei are 2 bucle
 * de 6,1e-5 și 6,9e-5 mm (96 px): praful ieșirii, sărit de ușă și numărat la `sub-rezolutie` (2). Forma 1 rămâne
 * nenormalizată (deja evenodd), cu bucla în contur. Oracolul le găsește cu aranjamentul local (`prafNormalizareO`).
 *
 * Sub-felia 2.3c-3 (ADR 0037 §11, partea a doua): valul lui CNC-referinta devine o cale deschisă (cubica din fișier și
 * vârful final), numărată `deschise` ca importată: 12 căi în loc de 11. Logourile VfB, Presto, AS Roma și al plăcii 2 nu
 * se schimbă (n-au nicio subcale rămasă deschisă și nicio `line`): aceleași numere, aceleași căi, nicio cale deschisă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { citesteSvg } from '../../src/io/svg.ts';
import { CODURI_2_3C1_O, CONST_O, citesteSvgO, judecaRezultat, parserTest, prafNormalizareO, type CaleO, type CodO, type RezultatO, type SubcaleJurnalO } from '../oracles/svg.ts';

/** Densitatea sondelor nonzero: fișierele au mii de cubice (corpusul are 1). */
const DENS = 0.2;

type Fisier = {
  readonly nume: string;
  readonly cale: string;
  /** Faptele măsurate, pe oracol, la `px` (96 sau 72). */
  readonly fapte: (o: Extract<RezultatO, { ok: true }>, px: 96 | 72) => void;
};

const dinRepo = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const deschiseFaraZ = (o: Extract<RezultatO, { ok: true }>): SubcaleJurnalO[] => o.subcai.filter((j) => !j.z && j.gol > CONST_O.tolImport);
const numerele = (o: Extract<RezultatO, { ok: true }>): Record<string, number> => Object.fromEntries(([...CODURI_2_3C1_O, 'deschise', 'degenerate'] as const).map((c: CodO) => [c, o.avertismente[c]]));
/** Sub-felia 2.3c-3: câte căi deschise a importat oracolul. */
const deschise = (o: Extract<RezultatO, { ok: true }>): number => o.cai.filter((c) => !c.inchis).length;

const FISIERE: readonly Fisier[] = [
  {
    nume: 'logoul VfB (8 subcăi umplute fără Z)',
    cale: 'C:\\Users\\besli\\Desktop\\MyWork\\echipe\\VfB_Stuttgart_1893_Logo.svg',
    fapte: (o, px) => {
      const d = deschiseFaraZ(o);
      assert.equal(d.length, 8);
      assert.ok(d.every((j) => j.umplut && j.soarta === 'cale' && j.inchisaDeUsa === 'umplere'), JSON.stringify(d));
      assert.deepEqual(numerele(o), { 'inchise-de-umplere': 8, 'inchise-la-usa': 0, 'sub-rezolutie': 0, deschise: 0, degenerate: 0 });
      // „Ce am măsurat” 4: golurile 5e-5 … 6e-4 mm (la 96 px; la 72, × 4/3).
      const k = px === 96 ? 1 : 4 / 3;
      for (const j of d) assert.ok(j.gol >= 5e-5 * k && j.gol <= 6e-4 * k, `golul ${j.gol}`);
      assert.equal(o.cai.length, 17);
      assert.equal(deschise(o), 0);
      // ADR 0037 §11 (13.10): ieșirea normalizării formei 3 are 2 bucle de închidere sub rezoluție.
      assert.equal(prafNormalizareO(o), 2);
    },
  },
  {
    nume: 'logoul Presto (2 subcăi umplute fără Z)',
    cale: 'C:\\Users\\besli\\Desktop\\MyWork\\Apps\\PrestoConstruct\\public\\logo-presto-construct.svg',
    fapte: (o, px) => {
      const d = deschiseFaraZ(o);
      assert.equal(d.length, 2);
      assert.ok(d.every((j) => j.umplut && j.soarta === 'cale' && j.inchisaDeUsa === 'umplere'), JSON.stringify(d));
      assert.deepEqual(numerele(o), { 'inchise-de-umplere': 2, 'inchise-la-usa': 0, 'sub-rezolutie': 0, deschise: 0, degenerate: 0 });
      // Golul e 0,001 px (coordonatele rotunjite la trei zecimale).
      for (const j of d) assert.ok(Math.abs(j.gol - (0.001 * 25.4) / px) <= 1e-9, `golul ${j.gol}`);
      assert.equal(o.cai.length, 33);
      assert.equal(deschise(o), 0);
      assert.equal(prafNormalizareO(o), 0);
    },
  },
  {
    nume: 'logoul AS Roma (nicio subcale deschisă)',
    cale: 'C:\\Users\\besli\\Desktop\\MyWork\\echipe\\AS_Roma_logo_(2017).svg',
    fapte: (o) => {
      assert.equal(deschiseFaraZ(o).length, 0);
      // O subcale `M … Z` fără întindere: degenerată (înaintea prafului, ca în 2.7c).
      assert.deepEqual(numerele(o), { 'inchise-de-umplere': 0, 'inchise-la-usa': 0, 'sub-rezolutie': 0, deschise: 0, degenerate: 1 });
      assert.ok(o.subcai.some((j) => j.soarta === 'degenerate' && j.diagonala === 0));
      assert.equal(deschise(o), 0);
    },
  },
  {
    nume: 'CNC-referinta (valul de 150 mm, fill: none: 2.3c-3, o cale deschisă)',
    cale: dinRepo('../../docs/faza2/sonde/s2-export-import/pachet-owner/CNC-referinta.svg'),
    fapte: (o) => {
      const d = deschiseFaraZ(o);
      assert.equal(d.length, 1);
      const val = d[0] as SubcaleJurnalO;
      // ADR 0037 §11 (2.3c-3): valul e o cale deschisă importată (înainte: sărit, numărat `deschise`).
      assert.equal(val.soarta, 'deschisa');
      assert.equal(val.umplut, false);
      assert.ok(Math.abs(val.gol - 150) <= 1e-9, `golul ${val.gol}`);
      assert.deepEqual(numerele(o), { 'inchise-de-umplere': 0, 'inchise-la-usa': 0, 'sub-rezolutie': 0, deschise: 1, degenerate: 0 });
      assert.equal(o.cai.length, 12);
      assert.equal(deschise(o), 1);
      // Pagina 400 × 300 mm cu viewBox-ul egal: M160,240 C210,180 260,300 310,240 → (160, 60), c1 (210, 120), c2 (260, 0),
      // capătul (310, 60), vârful final, cu L.
      const v = (o.cai[val.cale as number] as CaleO).varfuri;
      assert.deepEqual(v.map((x) => x.s.tip).join(''), 'CL');
      const c = v[0]?.s as { c1: { x: number; y: number }; c2: { x: number; y: number } };
      const aproape = (p: { x: number; y: number }, x: number, y: number): boolean => Math.abs(p.x - x) <= 1e-9 && Math.abs(p.y - y) <= 1e-9;
      assert.ok(aproape(v[0]?.p as { x: number; y: number }, 160, 60) && aproape(c.c1, 210, 120) && aproape(c.c2, 260, 0) && aproape(v[1]?.p as { x: number; y: number }, 310, 60), JSON.stringify(v));
    },
  },
  {
    nume: 'logoul plăcii 2 (nicio subcale deschisă)',
    cale: dinRepo('../placi/placa-02/logo-80mm.svg'),
    fapte: (o) => {
      assert.equal(deschiseFaraZ(o).length, 0);
      assert.deepEqual(numerele(o), { 'inchise-de-umplere': 0, 'inchise-la-usa': 0, 'sub-rezolutie': 0, deschise: 0, degenerate: 0 });
      assert.equal(o.cai.length, 3);
      assert.equal(deschise(o), 0);
    },
  },
];

for (const f of FISIERE) {
  const lipsa = existsSync(f.cale) ? false : `fișierul lipsește (${f.cale}); pe CI e normal, reproducerea lui e în corpus (secțiunea U)`;
  const citeste = (): Uint8Array => new Uint8Array(readFileSync(f.cale));
  for (const px of [96, 72] as const) {
    test(`(0) oracolul, ${f.nume}, ${px} px`, { skip: lipsa }, () => {
      const o = citesteSvgO(citeste(), { pxPeTol: px, densitateNonzero: DENS });
      assert.ok(o.ok, o.ok ? '' : o.cod);
      f.fapte(o, px);
    });
    test(`(a) aplicația, ${f.nume}, ${px} px`, { skip: lipsa }, () => {
      const b = citeste();
      const o = citesteSvgO(b, { pxPeTol: px, densitateNonzero: DENS });
      const a = citesteSvg(b, { pxPeTol: px, parser: parserTest() });
      assert.deepEqual(judecaRezultat(a, o, { N: 8, densitateNonzero: DENS }), []);
    });
  }
}
