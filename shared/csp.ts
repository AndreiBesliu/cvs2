/**
 * Politica de securitate a conținutului, scrisă o singură dată. Build-ul o pune în `index.html`, iar hosting-ul o pune în
 * antete (felia 1.9). Fără `unsafe-eval` și fără `unsafe-inline` (T17, ADR 0017).
 *
 * Originile Firebase (ADR 0040 §8): exact cele folosite de pagina `/admin` și, din 3.2, de raportorul de erori, pentru
 * cele două proiecte (același artefact servește testul și live-ul). Contul: `identitytoolkit`, `securetoken`, scriptul
 * `apis.google.com` și cadrul `authDomain` al popup-ului; Firestore; App Check cu reCAPTCHA Enterprise; funcțiile din
 * `europe-central2`. Nimic cu `*`.
 *
 * reCAPTCHA Enterprise (ADR 0043 §8): exact directivele din FAQ-ul Google („Can I customize the reCAPTCHA widget or
 * badge?”, docs.cloud.google.com/recaptcha/docs/faq): `script-src` și `frame-src` pe `www.google.com/recaptcha/`,
 * `www.gstatic.com/recaptcha/`, `recaptcha.google.com/recaptcha/`, plus `connect-src https://www.google.com/recaptcha/`.
 * App Check schimbă tokenul la `content-firebaseappcheck.googleapis.com` și aduce `www.google.com/recaptcha/enterprise.js`
 * (constantele `BASE_ENDPOINT` și `RECAPTCHA_ENTERPRISE_URL` din `@firebase/app-check`).
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
    'https://firestore.googleapis.com', 'https://content-firebaseappcheck.googleapis.com', 'https://www.google.com/recaptcha/',
    ...ORIGINI_FUNCTII,
  ].join(' '),
  ['frame-src', ...DOMENII_AUTH, 'https://www.google.com/recaptcha/', 'https://recaptcha.google.com/recaptcha/'].join(' '),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * CSP-ul cu amprentele scripturilor inline ale unei pagini (ADR 0098: harta importurilor din `index.html`), în `script-src`,
 * după `'self'`; fiecare o singură dată. Fără amprente, exact `CSP`. Rămâne fără `unsafe-inline`: doar textul exact al hărții
 * rulează, orice alt script inline e refuzat.
 */
export function cspCu(hashuri: readonly string[]): string {
  const unice = [...new Set(hashuri)];
  return unice.length === 0 ? CSP : CSP.replace("script-src 'self'", `script-src 'self' ${unice.join(' ')}`);
}
