/**
 * Ușa SVG pe SVG-uri aleatoare (cu sămânță; `test/oracles/svg.aleator.ts`): grupuri imbricate cu transformări de toate
 * felurile, toate formele, căi cu toate comenzile, numere scrise în toate felurile gramaticii, pagini cu și fără viewBox,
 * cu preserveAspectRatio, px la 96 și 72. Aplicația față de oracol (rezultatul întreg) și latura față de imbricarea
 * oracolului. Fără valori pe hârtie: corpusul (`svg.oracol.test.ts`) ancorează oracolul.
 *
 * Modul `lambdaTolerant` (arcele cu Λ ≥ 1, cu zgomotul F.6.5 al aplicației, constatarea 1) e oprit din 12.10: după
 * reparația constatării, și arcele acelea se judecă strict.
 * Felia 2.7d (ADR 0036): formele nonzero se normalizează; cele schimbate le judecă oracolul normalizării (regiunea,
 * geometria citirii, topologia), iar numerele `nonzero-normalizate` / `nonzero-refuzate` se judecă pe forme. Euristica
 * ariei din 2.7c (perechile în același sens) a dispărut, deci și filtrul căilor cu aria practic nulă. Laturile se judecă
 * pe căile finale.
 * Sub-felia 2.3c-3 (ADR 0037 §11): căile deschise (`inchis: false`, cu vârful final) se judecă separat de cele închise, în
 * ordinea lor; latura lor e `pe-linie` (nu intră în imbricare), deci și ele sunt „hotărâte”.
 * Precizarea 2.3c-6 (ADR 0037 §11): subcăile închise fără arie sunt linii (căi deschise), iar formele golite de normalizare
 * se numără și la `degenerate`; generatorul are în plus o formă „fără arie” la coada a ~40 % din fișiere.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteSvg } from '../../src/io/svg.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { caiFinaleO, citesteSvgO, judecaRezultat, laturiHotarate, laturiO, parserTest, type VarfO } from '../oracles/svg.ts';
import { SEMINTE_CONSTATARI, svgAleator } from '../oracles/svg.aleator.ts';

const SEMINTE = 240;
const PE_TEST = 20;

for (let start = 1; start <= SEMINTE; start += PE_TEST) {
  test(`aleator: semințele ${start}…${start + PE_TEST - 1}`, () => {
    const pr: string[] = [];
    for (let s = start; s < start + PE_TEST; s++) {
      // Semințele cu o constatare deschisă se judecă în testul constatărilor (`svg.constatari.oracol.test.ts`).
      if (SEMINTE_CONSTATARI.includes(s)) continue;
      const { text, px } = svgAleator(s);
      const b = new TextEncoder().encode(text);
      // Densitatea sondelor nonzero 0,6 (corpusul o are 1): 240 de fișiere sub un minut.
      const o = citesteSvgO(b, { pxPeTol: px, densitateNonzero: 0.6 });
      const a = citesteSvg(b, { pxPeTol: px, parser: parserTest() });
      const p = judecaRezultat(a, o, { lambdaTolerant: false, densitateNonzero: 0.6 });
      if (o.ok) {
        if (p.length === 0) {
          const fin = caiFinaleO(a, o);
          const la = laturiDinImbricare((a as unknown as { cai: Array<{ varfuri: VarfO[] }> }).cai), lo = laturiO(fin);
          // Doar laturile hotărâte (primul vârf nu stă pe conturul altei căi: acolo includerea e nedefinită, §8).
          const h = laturiHotarate(fin, 1e-9 * Math.max(1, o.marime));
          const dif = lo.map((x, i) => (h[i] === true && la[i] !== x ? i : -1)).filter((i) => i >= 0);
          if (dif.length > 0) p.push(`laturi ${JSON.stringify(la)} ≠ ${JSON.stringify(lo)} la ${JSON.stringify(dif)}`);
        }
      }
      for (const x of p) pr.push(`sămânța ${s} (px ${px}): ${x}`);
    }
    assert.deepEqual(pr, []);
  });
}
