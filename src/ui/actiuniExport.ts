import type { Actiune } from './actiuni.ts';
import type { ContextExport, ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';
import type { Document } from '../model/document.ts';
import { elementeFoaie, taieturiFoaie } from '../model/lume.ts';

export type { ContextExport, ParametriExport, RezultatExport } from './actiuniExportTipuri.ts';

/**
 * Calculul exportului (offset cavalier, CAM, post) se încarcă la cerere, la primul export: altfel ar intra în pachetul
 * de pornire, plătit de fiecare deschidere a aplicației.
 */
async function exportaDocument(doc: Document, p: ParametriExport): Promise<RezultatExport> {
  const { calculeazaExport } = await import('./actiuniExportCalcul.ts');
  return calculeazaExport(doc, p);
}

export const ACTIUNI_EXPORT: readonly Actiune<ContextExport>[] = [
  {
    id: 'export.gcode',
    eticheta: 'actiune.exporta-gcode',
    capabilitate: 'export-gcode',
    activa: (ctx) => (elementeFoaie(ctx.document(), 0).length === 0 ? 'motiv.nimic-de-exportat'
      : taieturiFoaie(ctx.document(), 0).length === 0 ? 'motiv.nicio-operatie' : true),
    ruleaza: (ctx) => {
      void exportaDocument(ctx.document(), ctx.parametri()).then(ctx.rezultat, (e: unknown) => {
        ctx.rezultat({ ok: false, motiv: e instanceof Error ? e.message : String(e) });
      });
    },
  },
];
