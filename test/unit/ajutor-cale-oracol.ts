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
import { BUGET_GCODE, BUGET_IR, judecaArcele, judecaTraseul, traseuDinGcode, traseuDinIR } from '../oracles/cale.ts';
import { contureleExacte, type CazCale, type Stoc } from '../oracles/cale.cazuri.ts';

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

/** Maximele abaterii pe familii: IR și G-code (mm), mișcările măsurate și cazurile. */
export type Maxime = Map<string, { ir: number; g: number; mutari: number; cazuri: number }>;

/**
 * Judecata unui caz (ADR 0034 §6): exportul, apoi, pe fiecare element din lume, traseul IR (|d − R| ≤ tol + 1e-6) și
 * traseul G-code (|d − R| ≤ tol + 0,002 + 1e-6), latura, etichetele, razele, nicio aproximare a postului. Maximele merg
 * în `maxime`, pe familia cazului.
 */
export async function judecaCazul(caz: CazCale, maxime: Maxime): Promise<string[]> {
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
