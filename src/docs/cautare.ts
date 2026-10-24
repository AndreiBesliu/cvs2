/** Pentru căutarea din manual (ADR 0058): litere mici, fără diacritice (ș = s, ă = a), ca „rotește” să găsească „roteste”. */
export function normalizeazaCautare(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
