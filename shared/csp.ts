/**
 * Politica de securitate a conținutului, scrisă o singură dată. Build-ul o pune în `index.html`, iar hosting-ul o va
 * pune în antete (felia 1.9). Fără `unsafe-eval` și fără `unsafe-inline` (T17, ADR 0017).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
