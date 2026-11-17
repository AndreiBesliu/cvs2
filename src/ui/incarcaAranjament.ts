/**
 * Aranjamentele pe care le are build-ul (ADR 0250) și încărcarea lor. Insulele stau în pornire; celelalte vin ca bucăți la
 * cerere, cu CSS-ul lor: înaintea primei randări când sunt alese (`main.tsx`), sau pe loc, din fereastra Aspectul. Fiecare
 * felie 28.x adaugă aici un aranjament; o alegere ținută a unuia care lipsește dă Insule (`alegereAranjament.ts`).
 *
 * Încărcarea stă separat de `aranjament.ts`, ca bucata unui aranjament (care importă tipul și Insulele de acolo) să nu
 * închidă un ciclu cu cine o cere.
 */
import { IDURI_ARANJAMENT, type IdAranjament } from './alegereAranjament.ts';
import { ARANJAMENT_MODERN, type Aranjament } from './aranjament.ts';

const INCARCA: { readonly [I in IdAranjament]?: () => Promise<Aranjament> } = {
  modern: () => Promise.resolve(ARANJAMENT_MODERN),
  atelier: () => import('./atelier.ts').then((m) => m.ARANJAMENT_ATELIER),
};

export const ARANJAMENTE_DISPONIBILE: readonly IdAranjament[] = IDURI_ARANJAMENT.filter((i) => INCARCA[i] !== undefined);

/** Aranjamentul `id`, cu bucata lui adusă; respins pentru unul pe care build-ul nu-l are sau când bucata nu vine. */
export function incarcaAranjament(id: IdAranjament): Promise<Aranjament> {
  const f = INCARCA[id];
  return f ? f() : Promise.reject(new Error(`aranjamentul „${id}” nu e în build`));
}
