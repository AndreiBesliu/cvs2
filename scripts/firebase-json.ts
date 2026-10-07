/**
 * Generează `firebase.json` din sursele lui unice: CSP-ul din `shared/csp.ts` intră și ca antet HTTP (`frame-ancestors`
 * merge doar ca antet, nu în `<meta>`). Testul `test/unit/firebase-json.test.ts` cere ca fișierul din repo să fie
 * exact ce generează scriptul ăsta.
 *
 * Antetele Hosting se potrivesc pe CALEA CERERII, iar ultima regulă care se potrivește câștigă: `/` și `/index.html` sunt
 * căi diferite, deci amândouă primesc `no-cache`.
 */
import { writeFileSync } from 'node:fs';
import { CSP } from '../shared/csp.ts';

export function configHosting(publicDir: string): object {
  const antet = (key: string, value: string) => ({ key, value });
  return {
    hosting: {
      public: publicDir,
      ignore: ['firebase.json', '**/.*'],
      headers: [
        {
          source: '**',
          headers: [
            antet('Content-Security-Policy', `${CSP}; frame-ancestors 'none'`),
            antet('X-Content-Type-Options', 'nosniff'),
            antet('Referrer-Policy', 'strict-origin-when-cross-origin'),
            antet('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'),
          ],
        },
        { source: '/assets/**', headers: [antet('Cache-Control', 'public, max-age=31536000, immutable')] },
        { source: '/', headers: [antet('Cache-Control', 'no-cache')] },
        { source: '/index.html', headers: [antet('Cache-Control', 'no-cache')] },
        { source: '/config.json', headers: [antet('Cache-Control', 'no-cache')] },
      ],
    },
  };
}

export function textFirebaseJson(): string {
  return `${JSON.stringify(configHosting('dist'), null, 2)}\n`;
}

if (import.meta.main) {
  writeFileSync(new URL('../firebase.json', import.meta.url), textFirebaseJson());
  console.log('firebase.json scris');
}
