/**
 * Lipirea oracolului căii (ADR 0034) cu aplicația (nu e un test): documentul v9 dat prin ușă (`incarca`), programul IR
 * (`programDinDocument`) și textul lui prin postul GRBL (`exporta`), cu montajul stânga-jos / Z0 sus (coordonatele mașinii
 * sunt ale documentului). Doar testele din `test/unit` îl importă; oracolele rămân fără `src/`.
 */
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { exporta } from '../../src/post/export.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import type { Liber } from '../oracles/document.ts';
import type { Stoc } from '../oracles/cale.cazuri.ts';

export type Export =
  | { readonly ok: true; readonly miscari: readonly unknown[]; readonly text: string; readonly aproximari: number }
  | { readonly ok: false; readonly motiv: string; readonly unde: 'usa' | 'cam' | 'post' | 'exceptie' };

type DocApp = Parameters<typeof programDinDocument>[0];
type Program = Extract<ReturnType<typeof programDinDocument>, { ok: true }>['program'];

/** Documentul prin ușă, apoi CAM-ul și postul; o excepție e un rezultat, nu o oprire. */
export async function exportul(doc: Liber, stoc: Stoc): Promise<Export> {
  try {
    const r = incarca(structuredClone(doc));
    if (!r.ok) return { ok: false, motiv: String(r.motiv), unde: 'usa' };
    const j = programDinDocument(r.doc as DocApp);
    if (!j.ok) return { ok: false, motiv: j.motiv, unde: 'cam' };
    const e = await exporta(j.program, { foaie: { ...stoc }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
    if (!e.ok) return { ok: false, motiv: e.motiv, unde: 'post' };
    return { ok: true, miscari: j.program.miscari, text: e.exportat.text, aproximari: e.exportat.aproximari };
  } catch (x) {
    return { ok: false, motiv: String(x), unde: 'exceptie' };
  }
}

/** Textul unui program IR (schimbat de un control negativ) prin același post. */
export async function textDinMiscari(original: Export & { ok: true }, doc: Liber, stoc: Stoc, miscari: readonly unknown[]): Promise<string> {
  const r = incarca(structuredClone(doc));
  if (!r.ok) throw new Error(String(r.motiv));
  const j = programDinDocument(r.doc as DocApp);
  if (!j.ok) throw new Error(j.motiv);
  const program = { ...j.program, miscari } as Program;
  const e = await exporta(program, { foaie: { ...stoc }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
  if (!e.ok) throw new Error(e.motiv);
  void original;
  return e.exportat.text;
}
