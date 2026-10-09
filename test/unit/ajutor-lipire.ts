/**
 * Lipirea oracolelor cu aplicația (nu e un test): documentul oracolului dat aplicației prin ușă (`incarca`), cum îl
 * primește interfața, și programul exportat (`calculeazaExport`, cu confirmarea ieșirii din foaie când o cere). Doar
 * testele din `test/unit` îl importă; oracolele (`test/oracles`) rămân fără `src/`.
 */
import type { DocV4O, DocV5O, Liber } from '../oracles/document.ts';

/** Versiunea schemei pe care o primește ușa aplicației (4 = ADR 0027, 5 = ADR 0028), aflată cu un document minim. */
export async function schemaAplicatiei(): Promise<number> {
  const { incarca } = await import('../../src/model/incarcare.ts');
  const r = incarca({
    schema: 4, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 10, inaltime: 10, grosime: 1 }, instante: [] }],
  });
  return r.ok ? (r.doc as unknown as Liber)['schema'] as number : 3;
}

/**
 * Documentul dat aplicației, prin ușă (`incarca`). O aplicație mai veche decât documentul îl refuză; atunci primește
 * același document coborât cât se poate fără să piardă nimic din ce taie: un v5 fără nicio ureche devine v4 (`urechi`
 * scos), un v4 devine v3 (`sens` scos; invariantele 1–8 nu depind de el). Un v5 CU urechi nu se coboară: refuzul ușii
 * e o eroare.
 */
export async function pentruAplicatie<D>(doc: DocV4O | DocV5O): Promise<D> {
  const { incarca } = await import('../../src/model/incarcare.ts');
  const r = incarca(structuredClone(doc));
  if (r.ok) return r.doc as unknown as D;
  let v4 = structuredClone(doc) as Liber;
  if (doc.schema === 5) {
    const operatii = (v4['piese'] as Liber[]).flatMap((p) => p['operatii'] as Liber[]);
    if (operatii.some((o) => o['urechi'] !== null)) throw new Error(`incarca a refuzat un document v5 cu urechi: ${String(r.motiv)}`);
    v4['schema'] = 4;
    for (const o of operatii) delete o['urechi'];
    const r4 = incarca(structuredClone(v4));
    if (r4.ok) return r4.doc as unknown as D;
    v4 = structuredClone(v4);
  }
  const v3 = v4;
  v3['schema'] = 3;
  for (const p of v3['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) delete o['sens'];
  const r3 = incarca(v3);
  if (!r3.ok) throw new Error(`incarca a refuzat documentul: ${String(r.motiv)} / ${String(r3.motiv)}`);
  return r3.doc as unknown as D;
}

export type IesireAplicatie = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly motiv: string };

/**
 * Programul aplicației pentru un document v4 / v5 și un montaj, cu confirmarea ieșirii din foaie dacă o cere. `supracursa`
 * (ADR 0028 §2, mm) se dă exportului doar când e cerută (implicit, ca din interfață, nu se trimite).
 */
export async function programulAplicatiei(
  doc: DocV4O | DocV5O,
  montaj: { readonly origine: 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus'; readonly z0: 'sus' | 'jos' },
  o: { readonly supracursa?: number } = {},
): Promise<IesireAplicatie> {
  const { calculeazaExport } = await import('../../src/ui/actiuniExportCalcul.ts');
  type DocApp = Parameters<typeof calculeazaExport>[0];
  type Optiuni = Parameters<typeof calculeazaExport>[1];
  const d = await pentruAplicatie<DocApp>(doc);
  const optiuni = (o.supracursa === undefined ? { ...montaj } : { ...montaj, supracursa: o.supracursa }) as Optiuni;
  let r = await calculeazaExport(d, optiuni);
  if (!r.ok && 'cereConfirmare' in r && r.cereConfirmare) r = await calculeazaExport(d, { ...optiuni, confirmareIesire: r.cereConfirmare });
  return r.ok ? { ok: true, text: r.program.text } : { ok: false, motiv: r.motiv };
}
