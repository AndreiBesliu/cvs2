/**
 * Mesajele modulelor la cerere în probe (ADR 0086): un `fetch` fals care servește fișierele generate (`/mesaje/…`, exact ce
 * scrie build-ul) și numără cererile, ca modulele să-și aducă mesajele pe drumul aplicației; restul adreselor, 404.
 */
import { genereazaMesajele } from '../../scripts/mesaje.ts';

export function servesteMesajele(stricat: Readonly<Record<string, string | number>> = {}): { readonly cereri: string[]; restaureaza(): void } {
  const fisiere = genereazaMesajele();
  const vechi = globalThis.fetch;
  const cereri: string[] = [];
  globalThis.fetch = ((u: string | URL | Request) => {
    const cale = String(u instanceof Request ? u.url : u).replace(/^\//, '');
    cereri.push(cale);
    const s = stricat[cale];
    if (typeof s === 'number') return Promise.resolve(new Response('', { status: s }));
    const text = s ?? fisiere.get(cale);
    return Promise.resolve(text === undefined ? new Response('', { status: 404 }) : new Response(text, { status: 200, headers: { 'content-type': 'application/json' } }));
  }) as typeof fetch;
  return { cereri, restaureaza: () => { globalThis.fetch = vechi; } };
}
