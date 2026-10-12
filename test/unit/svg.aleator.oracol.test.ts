/**
 * Ușa SVG pe SVG-uri aleatoare (cu sămânță; `test/oracles/svg.aleator.ts`): grupuri imbricate cu transformări de toate
 * felurile, toate formele, căi cu toate comenzile, numere scrise în toate felurile gramaticii, pagini cu și fără viewBox,
 * cu preserveAspectRatio, px la 96 și 72. Aplicația față de oracol (rezultatul întreg) și latura față de imbricarea
 * oracolului. Fără valori pe hârtie: corpusul (`svg.oracol.test.ts`) ancorează oracolul.
 *
 * Modul `lambdaTolerant` (arcele cu Λ ≥ 1, cu zgomotul F.6.5 al aplicației, constatarea 1) e oprit din 12.10: după
 * reparația constatării, și arcele acelea se judecă strict.
 * Perechile `nonzero` nu se judecă într-o formă care are o cale cu aria practic nulă (semnul ariei e zgomot).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteSvg } from '../../src/io/svg.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { arieRuns, citesteSvgO, judecaRezultat, laturiO, parserTest, type CaleO, type VarfO } from '../oracles/svg.ts';
import { svgAleator } from '../oracles/svg.aleator.ts';

const SEMINTE = 240;
const PE_TEST = 20;

for (let start = 1; start <= SEMINTE; start += PE_TEST) {
  test(`aleator: semințele ${start}…${start + PE_TEST - 1}`, () => {
    const pr: string[] = [];
    for (let s = start; s < start + PE_TEST; s++) {
      const { text, px } = svgAleator(s);
      const b = new TextEncoder().encode(text);
      const o = citesteSvgO(b, { pxPeTol: px });
      const a = citesteSvg(b, { pxPeTol: px, parser: parserTest() });
      let p = judecaRezultat(a, o, { lambdaTolerant: false });
      if (o.ok) {
        const plata = new Set(o.cai.filter((c: CaleO) => Math.abs(arieRuns(c.runs)) <= 1e-9 * o.marime * o.marime).map((c) => c.forma));
        if (plata.size > 0) p = p.filter((x) => !x.startsWith('raportul: nonzero'));
        if (p.length === 0) {
          const la = laturiDinImbricare((a as unknown as { cai: Array<{ varfuri: VarfO[] }> }).cai), lo = laturiO(o.cai);
          if (JSON.stringify(la) !== JSON.stringify(lo)) p.push(`laturi ${JSON.stringify(la)} ≠ ${JSON.stringify(lo)}`);
        }
      }
      for (const x of p) pr.push(`sămânța ${s} (px ${px}): ${x}`);
    }
    assert.deepEqual(pr, []);
  });
}
