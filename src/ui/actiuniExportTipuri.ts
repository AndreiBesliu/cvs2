import type { ParametriElement } from '../cam/job.ts';
import type { ColtOrigine } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import type { ProgramExportat } from '../post/export.ts';

/**
 * Exportul G-code v0, ca acțiune a registrului (capabilitatea „export-gcode”): documentul → profilele → IR → postul GRBL
 * → octeții cu SHA-256. Interfața primește doar rezultatul, ca date, și îl descarcă.
 */
export type ParametriExport = {
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
  readonly diametruScula: number;
  readonly elemente: ReadonlyMap<string, ParametriElement>;
};

export type RezultatExport = { readonly ok: true; readonly program: ProgramExportat } | { readonly ok: false; readonly motiv: string };

export type ContextExport = {
  readonly document: () => Document;
  readonly parametri: () => ParametriExport;
  readonly rezultat: (r: RezultatExport) => void;
};
