/**
 * Politica de securitate a conținutului, scrisă o singură dată. Build-ul o pune în `index.html`, iar hosting-ul o pune în
 * antete (felia 1.9). Fără `unsafe-eval` și fără `unsafe-inline` (T17, ADR 0017).
 *
 * Originile Firebase (ADR 0040 §8): exact cele folosite de pagina `/admin` și, din 3.2, de raportorul de erori, pentru
 * cele două proiecte (același artefact servește testul și live-ul). Contul: `identitytoolkit`, `securetoken`, scriptul
 * `apis.google.com` și cadrul `authDomain` al popup-ului; Firestore; App Check cu reCAPTCHA Enterprise; funcțiile din
 * `europe-central2`. Nimic cu `*`.
 */
const PROIECTE = ['cncvectorstudio-test', 'cncvectorstudio'] as const;
export const DOMENII_AUTH = PROIECTE.map((p) => `https://${p}.firebaseapp.com`);
export const ORIGINI_FUNCTII = PROIECTE.map((p) => `https://europe-central2-${p}.cloudfunctions.net`);

export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  [
    "connect-src 'self'", 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com',
    'https://firestore.googleapis.com', 'https://content-firebaseappcheck.googleapis.com', ...ORIGINI_FUNCTII,
  ].join(' '),
  ['frame-src', ...DOMENII_AUTH, 'https://www.google.com/recaptcha/', 'https://recaptcha.google.com/recaptcha/'].join(' '),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
