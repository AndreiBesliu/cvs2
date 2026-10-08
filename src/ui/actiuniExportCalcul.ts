import { iesireDinFoaie, type IesireFoaie } from '../cam/iesire.ts';
import { programDinDocument } from '../cam/job.ts';
import { PLAFON, type Document } from '../model/document.ts';
import { GRBL_11 } from '../post/contracte/grbl11.ts';
import { exporta } from '../post/export.ts';
import type { ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';

/** Așteptarea axului după pornire: un parametru al mașinii; profilul mașinii vine în etapa 3. */
const ASTEPTARE_AX = 3;

/** Aceeași ieșire, pe același traseu: confirmarea omului acoperă exact ce a văzut, nu o ieșire calculată după aceea. */
function aceeasiIesire(a: IesireFoaie | undefined, b: IesireFoaie): boolean {
  if (!a || a.amprenta !== b.amprenta) return false;
  const egal = (u: number, v: number): boolean => Math.abs(u - v) <= 1e-9;
  const [x, y] = [a.depasire, b.depasire];
  return egal(x.stanga, y.stanga) && egal(x.dreapta, y.dreapta) && egal(x.jos, y.jos) && egal(x.sus, y.sus);
}

/** Exportul propriu-zis: documentul → profilele → IR → postul GRBL → octeții cu SHA-256. Se încarcă la cerere. */
export async function calculeazaExport(doc: Document, p: ParametriExport): Promise<RezultatExport> {
  const foaie = doc.foi[0];
  if (!foaie) return { ok: false, motiv: 'documentul n-are foaie' };
  const job = programDinDocument(doc, p.elemente, { numar: 1, nume: 'freza plata', diametru: p.diametruScula });
  if (!job.ok) return job;
  const iesire = iesireDinFoaie(job.program, foaie.stoc);
  if (iesire) {
    const { stanga, dreapta, jos, sus } = iesire.depasire;
    // Plafonul pe artefact (T23): o ieșire cât încă o foaie maximă e o greșeală de poziție, nu o intenție.
    if (Math.max(stanga, dreapta, jos, sus) > PLAFON.latura) {
      return { ok: false, motiv: `freza iese din foaie cu peste ${PLAFON.latura} mm` };
    }
    if (!aceeasiIesire(p.confirmareIesire, iesire)) {
      return { ok: false, motiv: 'freza iese din foaie: exportul cere confirmarea ta', cereConfirmare: iesire };
    }
  }
  const e = await exporta(job.program, { foaie: foaie.stoc, origine: p.origine, z0: p.z0 }, GRBL_11, {
    asteptareAx: ASTEPTARE_AX,
    ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
  });
  return e.ok ? { ok: true, program: e.exportat } : e;
}
