/**
 * Lipirea oracolelor cu aplicația (nu e un test): documentul oracolului dat aplicației prin ușă (`incarca`), cum îl
 * primește interfața, și programul exportat (`calculeazaExport`, cu confirmarea ieșirii din foaie când o cere). Doar
 * testele din `test/unit` îl importă; oracolele (`test/oracles`) rămân fără `src/`.
 */
import type { DocV4O, Liber } from '../oracles/document.ts';

/** Versiunea schemei pe care o primește ușa aplicației (4 = a trecut la ADR 0027), aflată cu un document v4 minim. */
export async function schemaAplicatiei(): Promise<number> {
  const { incarca } = await import('../../src/model/incarcare.ts');
  const r = incarca({
    schema: 4, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 10, inaltime: 10, grosime: 1 }, instante: [] }],
  });
  return r.ok ? (r.doc as unknown as Liber)['schema'] as number : 3;
}

/**
 * Documentul dat aplicației, prin ușă (`incarca`). O aplicație încă pe schema 3 refuză un v4: atunci primește același
 * document fără `sens` (invariantele 1–8 nu depind de el; invarianta 9 cere aplicația pe v4).
 */
export async function pentruAplicatie<D>(doc: DocV4O): Promise<D> {
  const { incarca } = await import('../../src/model/incarcare.ts');
  const r = incarca(structuredClone(doc));
  if (r.ok) return r.doc as unknown as D;
  const v3 = structuredClone(doc) as Liber;
  v3['schema'] = 3;
  for (const p of v3['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['sens'];
  const r3 = incarca(v3);
  if (!r3.ok) throw new Error(`incarca a refuzat documentul: ${String(r.motiv)} / ${String(r3.motiv)}`);
  return r3.doc as unknown as D;
}

export type IesireAplicatie = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly motiv: string };

/** Programul aplicației pentru un document v4 și un montaj, cu confirmarea ieșirii din foaie dacă o cere. */
export async function programulAplicatiei(
  doc: DocV4O, montaj: { readonly origine: 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus'; readonly z0: 'sus' | 'jos' },
): Promise<IesireAplicatie> {
  const { calculeazaExport } = await import('../../src/ui/actiuniExportCalcul.ts');
  type DocApp = Parameters<typeof calculeazaExport>[0];
  const d = await pentruAplicatie<DocApp>(doc);
  let r = await calculeazaExport(d, montaj);
  if (!r.ok && 'cereConfirmare' in r && r.cereConfirmare) r = await calculeazaExport(d, { ...montaj, confirmareIesire: r.cereConfirmare });
  return r.ok ? { ok: true, text: r.program.text } : { ok: false, motiv: r.motiv };
}
