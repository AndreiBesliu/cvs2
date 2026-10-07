import { iesireDinFoaie } from '../cam/iesire.ts';
import { programDinDocument } from '../cam/job.ts';
import type { Depasire } from '../geom/cutie.ts';
import { PLAFON, type Document } from '../model/document.ts';
import { GRBL_11 } from '../post/contracte/grbl11.ts';
import { exporta } from '../post/export.ts';
import type { ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';

/** Așteptarea axului după pornire: un parametru al mașinii; profilul mașinii vine în etapa 3. */
const ASTEPTARE_AX = 3;

/** Aceeași ieșire: confirmarea omului acoperă exact ce a văzut, nu o ieșire calculată după aceea. */
function aceeasiDepasire(a: Depasire | undefined, b: Depasire): boolean {
  if (!a) return false;
  const egal = (u: number, v: number): boolean => Math.abs(u - v) <= 1e-9;
  return egal(a.stanga, b.stanga) && egal(a.dreapta, b.dreapta) && egal(a.jos, b.jos) && egal(a.sus, b.sus);
}

/** Exportul propriu-zis: documentul → profilele → IR → postul GRBL → octeții cu SHA-256. Se încarcă la cerere. */
export async function calculeazaExport(doc: Document, p: ParametriExport): Promise<RezultatExport> {
  const job = programDinDocument(doc, p.elemente, { numar: 1, nume: 'freza plata', diametru: p.diametruScula });
  if (!job.ok) return job;
  const iesire = iesireDinFoaie(job.program, doc.foaie);
  if (iesire) {
    const { stanga, dreapta, jos, sus } = iesire.depasire;
    // Plafonul pe artefact (T23): o ieșire cât încă o foaie maximă e o greșeală de poziție, nu o intenție.
    if (Math.max(stanga, dreapta, jos, sus) > PLAFON.latura) {
      return { ok: false, motiv: `freza iese din foaie cu peste ${PLAFON.latura} mm` };
    }
    if (!aceeasiDepasire(p.confirmareIesire, iesire.depasire)) {
      return { ok: false, motiv: 'freza iese din foaie: exportul cere confirmarea ta', cereConfirmare: iesire };
    }
  }
  const e = await exporta(job.program, { foaie: doc.foaie, origine: p.origine, z0: p.z0 }, GRBL_11, {
    asteptareAx: ASTEPTARE_AX,
    ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  return e.ok ? { ok: true, program: e.exportat } : e;
}
