import type { Actiune } from './actiuni.ts';
import type { ContextExport, ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';
import type { Document } from '../model/document.ts';
import { elementeFoaie, taieturiFoaie } from '../model/lume.ts';

export type { ContextExport, ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';

/**
 * Calculul exportului se încarcă la cerere, la primul export: altfel ar intra în pachetul de pornire, plătit de fiecare
 * deschidere a aplicației. CAM-ul și postul rulează în workerul CAM (ADR 0109), nu pe firul principal.
 */
async function exportaDocument(doc: Document, p: ParametriExport, semnal: AbortSignal | undefined, toate: Document | undefined): Promise<RezultatExport> {
  const { calculeazaExport } = await import('./actiuniExportCalcul.ts');
  return calculeazaExport(doc, p, semnal, toate);
}

/** Ce cere un program: forme pe foaie și măcar o operație; altfel motivul. */
const deExportat = (ctx: ContextExport): true | 'motiv.nimic-de-exportat' | 'motiv.nicio-operatie' => (
  elementeFoaie(ctx.document(), 0).length === 0 ? 'motiv.nimic-de-exportat'
    : taieturiFoaie(ctx.document(), 0).length === 0 ? 'motiv.nicio-operatie' : true);

export const ACTIUNI_EXPORT: readonly Actiune<ContextExport>[] = [
  {
    id: 'export.gcode',
    eticheta: 'actiune.exporta-gcode',
    capabilitate: 'export-gcode',
    activa: deExportat,
    ruleaza: (ctx) => {
      void exportaDocument(ctx.document(), ctx.parametri(), ctx.semnal?.(), ctx.toate?.()).then(ctx.rezultat, (e: unknown) => {
        // Un worker căzut (nu o anulare și nu un refuz) e o defecțiune: ajunge și în jurnal. Numele, nu clasa: clasa ar
        // aduce bazinul în pachetul de pornire.
        if (e instanceof Error && e.name === 'LucratorCazut') reportError(e);
        ctx.rezultat({ ok: false, motiv: e instanceof Error ? e.message : String(e) });
      });
    },
  },
  // Raportul foilor și lista de tăiere (ADR 0210 §6, felia 11.6↑): fereastra lui o deschide aplicația, ca pe a exportului.
  { id: 'export.raport', eticheta: 'actiune.raport-foi', capabilitate: 'desen', activa: () => true, ruleaza: () => undefined },
  // „Trimite la mașină” (ADR 0250, felia 28.1↑d): fereastra exportului, cu butonul ei; după un export pe care senderul îl
  // vorbește, programul intră în fereastra Mașina, fără să pornească (ca „Deschide în Mașina”, ADR 0132 §7). Fereastra o
  // deschide aplicația, ca pe a exportului.
  { id: 'export.trimite', eticheta: 'actiune.trimite-masina', capabilitate: 'export-gcode', activa: deExportat, ruleaza: () => undefined },
];
