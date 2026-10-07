/**
 * Catalogul capabilităților (`PLAN.md` §3.2, termenul 28): dreptul de a folosi o funcție. Fiecare acțiune din registru
 * îl declară din prima zi, ca împărțirea pe niveluri să nu ceară refactorizare (`BRIEF.md` §4). Dreptul de acces al
 * contului se calculează doar pe server; până la facturare (etapa 27), toate sunt permise.
 *
 * Catalogul e comun clientului și serverului, deci nu importă nimic din `src/`.
 */
export const CAPABILITATI = [
  /** Desenul și editarea vectorilor, local. */
  'desen',
  /** Operațiile CAM și previzualizarea traseului. */
  'cam',
  /** Exportul programului G-code pentru mașină. */
  'export-gcode',
  /** Exportul vectorial (DXF, SVG, PDF, EPS). */
  'export-vectori',
  /** Senderul: trimiterea programului la mașină. */
  'masina',
] as const;

export type Capabilitate = (typeof CAPABILITATI)[number];

export function esteCapabilitate(x: string): x is Capabilitate {
  return (CAPABILITATI as readonly string[]).includes(x);
}
