/**
 * CAM-ul pe căi cu cubice (felia 2.7b, ADR 0034 §6, §9), de la cap la coadă, judecat de oracolul independent
 * (`test/oracles/cale.ts`) pe corpusul `test/oracles/cale.cazuri.ts`: documentul v9 → ușa → programul IR → postul GRBL →
 * textul G-code, citit înapoi și măsurat față de calea EXACTĂ (cubicele adevărate, nu biarcele):
 * - (a) fiecare caz: `trebuie` → exportul reușește; `refuz` → CAM-ul refuză cu motiv (conturul se autointersectează,
 *   verificat independent în corpus); `corect-sau-refuz` → una din două. Pe un export reușit, pe fiecare element din lume:
 *   · IR: fiecare mișcare de tăiere din plan stă la R de calea exactă, |d − R| ≤ tol + 1e-6 mm, pe latura cerută;
 *   · G-code: la fel, |d − R| ≤ tol + 0,002 + 1e-6 mm (rotunjirea postului, ADR 0026 §6);
 *   · razele: arcele IR ≤ 9 950 mm, G2 / G3 ≤ 10 000 mm (garda GRBL); postul n-a scris niciun arc ca segmente (numărul
 *     mișcărilor G1 și `aproximari` = 0); fiecare mișcare de tăiere are eticheta unui element cunoscut;
 * - (b) exportul din interfață (`calculeazaExport`) dă exact același text ca lanțul măsurat aici;
 * - (f) rezumatul (doar informativ): abaterea maximă / tol, pe familii, pe IR și pe G-code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUGET_GCODE, BUGET_IR, judecaArcele, judecaTraseul, traseuDinGcode, traseuDinIR } from '../oracles/cale.ts';
import { CAZURI_CALE, contureleExacte, type CazCale } from '../oracles/cale.cazuri.ts';
import { exportul } from './ajutor-cale-oracol.ts';

const TOL = 0.001;
const maxime = new Map<string, { ir: number; g: number; mutari: number; cazuri: number }>();

async function judeca(caz: CazCale): Promise<string[]> {
  const e = await exportul(caz.doc, caz.stoc);
  if (!e.ok) {
    if (e.unde === 'exceptie') return [`a aruncat: ${e.motiv}`];
    if (!(e.motiv.trim().length > 0)) return [`refuz fără motiv (${e.unde})`];
    if (caz.categorie === 'trebuie') return [`refuzat la ${e.unde}: ${e.motiv}`];
    if (caz.categorie === 'refuz' && e.unde !== 'cam') return [`refuzat la ${e.unde}, nu la CAM: ${e.motiv}`];
    return [];
  }
  if (caz.categorie === 'refuz') return ['exportul a reușit, dar conturul se autointersectează: trebuia refuzat'];
  const probleme: string[] = [];
  const ce = contureleExacte(caz.doc);
  const ir = traseuDinIR(e.miscari), gc = traseuDinGcode(e.text);
  const R = caz.diametru / 2;
  const cunoscute = new Set(ce.keys());
  for (const m of ir.plan) if (!cunoscute.has(m.eticheta.split(':')[0] ?? '')) { probleme.push(`IR ${m.sursa}: mișcare fără eticheta unui element (${m.eticheta})`); break; }
  for (const m of gc.plan) if (!cunoscute.has(m.eticheta)) { probleme.push(`G-code ${m.sursa}: mișcare fără eticheta unui element (${m.eticheta})`); break; }
  let mi = 0, mg = 0, mutari = 0;
  for (const [id, c] of ce) {
    const ji = judecaTraseul({ ...ir, plan: ir.plan.filter((m) => m.eticheta.startsWith(`${id}:`)) }, c, R, caz.latura, BUGET_IR);
    const jg = judecaTraseul({ ...gc, probleme: [], plan: gc.plan.filter((m) => m.eticheta === id) }, c, R, caz.latura, BUGET_GCODE);
    probleme.push(...ji.probleme.map((x) => `IR ${id}: ${x}`), ...jg.probleme.map((x) => `G-code ${id}: ${x}`));
    mi = Math.max(mi, ji.masura.max);
    mg = Math.max(mg, jg.masura.max);
    mutari += jg.masura.mutari;
  }
  probleme.push(...gc.probleme.map((x) => `G-code: ${x}`), ...judecaArcele(ir, gc));
  if (e.aproximari !== 0) probleme.push(`postul a declarat ${e.aproximari} arce scrise ca segmente`);
  const f = maxime.get(caz.familie) ?? { ir: 0, g: 0, mutari: 0, cazuri: 0 };
  maxime.set(caz.familie, { ir: Math.max(f.ir, mi), g: Math.max(f.g, mg), mutari: f.mutari + mutari, cazuri: f.cazuri + 1 });
  return probleme;
}

for (const caz of CAZURI_CALE) {
  test(`(a) ${caz.familie} [${caz.categorie}]: ${caz.nume}`, async () => { assert.deepEqual(await judeca(caz), []); });
}

test('(b) exportul din interfață (calculeazaExport) dă același text ca lanțul măsurat', async () => {
  const { calculeazaExport } = await import('../../src/ui/actiuniExportCalcul.ts');
  const { incarca } = await import('../../src/model/incarcare.ts');
  type DocApp = Parameters<typeof calculeazaExport>[0];
  const diferite: string[] = [];
  for (const caz of CAZURI_CALE.filter((c) => c.categorie === 'trebuie').filter((_c, i) => i % 4 === 0)) {
    const e = await exportul(caz.doc, caz.stoc);
    const r = incarca(structuredClone(caz.doc));
    assert.ok(e.ok && r.ok, caz.nume);
    const x = await calculeazaExport(r.doc as DocApp, { origine: 'stanga-jos', z0: 'sus' });
    if (!x.ok || x.program.text !== e.text) diferite.push(caz.nume);
  }
  assert.deepEqual(diferite, []);
});

test('(f) rezumatul: abaterea maximă / tol, pe familii (IR și G-code)', (t) => {
  let ir = 0, g = 0;
  for (const [familie, m] of [...maxime].sort(([a], [b]) => a.localeCompare(b))) {
    t.diagnostic(`${familie}: ${m.cazuri} cazuri, ${m.mutari} mișcări; IR max ${(m.ir / TOL).toFixed(4)} × tol, G-code max ${(m.g / TOL).toFixed(4)} × tol`);
    ir = Math.max(ir, m.ir);
    g = Math.max(g, m.g);
  }
  t.diagnostic(`bugetul: IR ${(BUGET_IR / TOL).toFixed(4)} × tol, G-code ${(BUGET_GCODE / TOL).toFixed(4)} × tol; măsurat: IR ${(ir / TOL).toFixed(4)}, G-code ${(g / TOL).toFixed(4)}`);
  assert.ok(maxime.size > 0, 'rezumatul rulează după (a)');
});
