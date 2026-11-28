/**
 * Un strat ascuns nu se taie (ADR 0310 §1; ADR 0320, felia 18.1↑j): programul finisării unui relief cu un strat ascuns e
 * octet cu octet programul aceluiași relief fără stratul acela, chiar dacă dalele lui lipsesc din resurse; arătat, stratul
 * schimbă programul. Și modurile: „păstrează înalt” cu un strat mai jos nu schimbă nimic; „scade” mută vârful compusului, pe
 * hârtie: calota de rază 6 minus cea de rază 3 are maximul pe inelul de rază 3, √(36 − 9) = √27 ≈ 5,196 mm (fața plăcii e la
 * vârful compusului, deci adâncimea cea mai mare a traseului scade de la ~6 la ~5,196).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import type { ResurseRelief } from '../../src/relief/resurse.ts';
import type { Document, ModRelief } from '../../src/model/document.ts';
import type { Program } from '../../src/ir/ir.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const NX = 40, NY = 40, CEL = 0.5;

/** O calotă de rază `r`, centrată, pe 40 × 40 celule de 0,5 mm. */
function calota(r: number, sus = 0): Float64Array {
  const v = new Float64Array(NX * NY);
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const d2 = ((i + 0.5) * CEL - 10) ** 2 + ((j + 0.5) * CEL - 10) ** 2;
      v[j * NX + i] = d2 < r * r ? Math.sqrt(r * r - d2) + sus : sus;
    }
  }
  return v;
}

async function strat(v: Float64Array): Promise<{ readonly amprenta: string; readonly resurse: ResurseRelief }> {
  const s = await stratDinGrila(v, NX, NY);
  return { amprenta: s.amprenta, resurse: { [s.amprenta]: { text: s.text, octeti: Object.fromEntries(s.octeti) } } };
}

type Strat = { readonly id: string; readonly mod: ModRelief; readonly vizibil: boolean; readonly dale: string };

function doc(straturi: readonly Strat[]): Document {
  const d = {
    schema: 32, rev: 0,
    piese: [{
      id: 'p',
      radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [
        { tip: 'element', id: 'r', forma: { tip: 'relief', nx: NX, ny: NY, celula: CEL, straturi }, matrice: { ...I } },
      ] },
      operatii: [{
        id: 'f', tip: 'finisare', noduri: ['r'], scula: { numar: 2, nume: 'freza bila', diametru: 4, forma: { tip: 'bila' } }, latura: 'pe-linie',
        sens: 'urcare', adancime: 10, pas: 2.5, pasLateral: 1, finisare: { unghi: 0 }, urechi: null, rampa: null, intrari: null, colturi: null,
      }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 40, y: 40, rotire: 0 }] }],
  };
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}

function program(d: Document, resurse: ResurseRelief): Program {
  const r = programDinDocument(d, REGIM_IMPLICIT, 0, false, undefined, resurse);
  if (!r.ok) assert.fail(r.motiv);
  return r.program;
}

const miscari = (p: Program): string => JSON.stringify(p.miscari);

test('ascuns: programul e cel fără strat, și cu dalele lui lipsă; arătat, alt program', async () => {
  const baza = await strat(calota(6));
  const varf = await strat(calota(3, 0));
  const sus: Strat = { id: 's2', mod: 'aduna', vizibil: true, dale: varf.amprenta };
  const jos: Strat = { id: 's1', mod: 'aduna', vizibil: true, dale: baza.amprenta };
  const toate = { ...baza.resurse, ...varf.resurse };
  const singur = miscari(program(doc([jos]), baza.resurse));
  assert.equal(miscari(program(doc([jos, { ...sus, vizibil: false }]), toate)), singur);
  // Dalele stratului ascuns nu trebuie: lipsesc din resurse, iar programul iese tot.
  assert.equal(miscari(program(doc([jos, { ...sus, vizibil: false }]), baza.resurse)), singur);
  assert.notEqual(miscari(program(doc([jos, sus]), toate)), singur);
  // Arătat, dar lipsă din resurse: refuzat (nu se taie fără el pe tăcute).
  assert.equal(programDinDocument(doc([jos, sus]), REGIM_IMPLICIT, 0, false, undefined, baza.resurse).ok, false);
});

test('modurile: „păstrează înalt” cu o calotă mai mică nu schimbă nimic; „scade” mută vârful compusului la √27', async () => {
  const mare = await strat(calota(6));
  const mica = await strat(calota(3));
  const toate = { ...mare.resurse, ...mica.resurse };
  const jos: Strat = { id: 's1', mod: 'aduna', vizibil: true, dale: mare.amprenta };
  const singur = program(doc([jos]), mare.resurse);
  assert.equal(miscari(program(doc([jos, { id: 's2', mod: 'inalt', vizibil: true, dale: mica.amprenta }]), toate)), miscari(singur));
  const scade = program(doc([jos, { id: 's2', mod: 'scade', vizibil: true, dale: mica.amprenta }]), toate);
  const zMin = (p: Program): number => Math.min(...p.miscari.flatMap((m) => ('la' in m && m.tip === 'taiere' && m.la.Z !== undefined ? [m.la.Z] : [])));
  assert.ok(Math.abs(zMin(singur) + 6) < 0.05, `fără scădere: ${zMin(singur)}`);
  assert.ok(Math.abs(zMin(scade) + Math.sqrt(27)) < 0.05, `scade: ${zMin(scade)} față de −√27`);
});
