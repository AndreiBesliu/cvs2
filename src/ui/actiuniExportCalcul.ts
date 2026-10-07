import { programDinDocument } from '../cam/job.ts';
import type { Document } from '../model/document.ts';
import { GRBL_11 } from '../post/contracte/grbl11.ts';
import { exporta } from '../post/export.ts';
import type { ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';

/** Așteptarea axului după pornire: un parametru al mașinii; profilul mașinii vine în etapa 3. */
const ASTEPTARE_AX = 3;

/** Exportul propriu-zis: documentul → profilele → IR → postul GRBL → octeții cu SHA-256. Se încarcă la cerere. */
export async function calculeazaExport(doc: Document, p: ParametriExport): Promise<RezultatExport> {
  const job = programDinDocument(doc, p.elemente, { numar: 1, nume: 'freza plata', diametru: p.diametruScula });
  if (!job.ok) return job;
  const e = await exporta(job.program, { foaie: doc.foaie, origine: p.origine, z0: p.z0 }, GRBL_11, { asteptareAx: ASTEPTARE_AX });
  return e.ok ? { ok: true, program: e.exportat } : e;
}
