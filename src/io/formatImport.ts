/**
 * Formatul unui fișier de importat (ADR 0035, ADR 0101, ADR 0104), fără nicio dependență. Îl folosesc doar modulele la
 * cerere (dialogul și ușile), deci nu intră în pachetul de pornire.
 */

/** Formatele pe care le importă dialogul. Un AI (Illustrator, de la versiunea 9) e un PDF: îl citește ușa PDF. */
export type FormatImport = 'svg' | 'dxf' | 'pdf';

/** Formatul fișierului, după extensie, apoi după tipul MIME; null: dialogul îl refuză (`tip`). */
export function formatImport(nume: string, tip: string): FormatImport | null {
  if (/\.svg$/i.test(nume)) return 'svg';
  if (/\.dxf$/i.test(nume)) return 'dxf';
  if (/\.(pdf|ai)$/i.test(nume)) return 'pdf';
  if (tip === 'image/svg+xml') return 'svg';
  if (['image/vnd.dxf', 'application/dxf', 'image/x-dxf', 'application/x-dxf'].includes(tip)) return 'dxf';
  if (['application/pdf', 'application/illustrator', 'application/vnd.adobe.illustrator'].includes(tip)) return 'pdf';
  return null;
}
