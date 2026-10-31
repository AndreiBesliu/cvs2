/**
 * Formatul unui fișier de importat (ADR 0035, ADR 0101, ADR 0104, ADR 0115), fără nicio dependență. Îl folosesc doar
 * modulele la cerere (dialogul și ușile), deci nu intră în pachetul de pornire.
 */

/**
 * Formatele pe care le importă dialogul. `pdf` și `eps` sunt aceeași familie: un AI e PDF de la Illustrator 9 și PostScript
 * înainte, deci ușa o alege antetul fișierului (`formatDupaAntet`), nu extensia.
 */
export type FormatImport = 'svg' | 'dxf' | 'pdf' | 'eps';

/** Formatul fișierului, după extensie, apoi după tipul MIME; null: dialogul îl refuză (`tip`). */
export function formatImport(nume: string, tip: string): FormatImport | null {
  if (/\.svg$/i.test(nume)) return 'svg';
  if (/\.dxf$/i.test(nume)) return 'dxf';
  if (/\.(pdf|ai)$/i.test(nume)) return 'pdf';
  if (/\.eps[fi]?$/i.test(nume)) return 'eps';
  if (tip === 'image/svg+xml') return 'svg';
  if (['image/vnd.dxf', 'application/dxf', 'image/x-dxf', 'application/x-dxf'].includes(tip)) return 'dxf';
  if (['application/pdf', 'application/illustrator', 'application/vnd.adobe.illustrator'].includes(tip)) return 'pdf';
  if (['application/postscript', 'application/eps', 'application/x-eps', 'image/eps', 'image/x-eps'].includes(tip)) return 'eps';
  return null;
}

/**
 * Ușa unui fișier PDF / AI / EPS, după antet (ADR 0115 §1): PostScript (`%!`, după un eventual ^D, sau antetul binar al unui
 * EPS DOS, C5 D0 D3 C6) → `eps`; `%PDF-` în primii 1024 de octeți (ca la cititoarele PDF) → `pdf`; altfel null (ușa
 * formatului din extensie își spune refuzul).
 */
export function formatDupaAntet(b: Uint8Array): 'pdf' | 'eps' | null {
  if (b[0] === 0xc5 && b[1] === 0xd0 && b[2] === 0xd3 && b[3] === 0xc6) return 'eps';
  let k = 0;
  while (b[k] === 4) k++;
  if (b[k] === 0x25 && b[k + 1] === 0x21) return 'eps';
  const n = Math.min(b.length, 1024);
  for (let i = 0; i + 5 <= n; i++) {
    if (b[i] === 0x25 && b[i + 1] === 0x50 && b[i + 2] === 0x44 && b[i + 3] === 0x46 && b[i + 4] === 0x2d) return 'pdf';
  }
  return null;
}
