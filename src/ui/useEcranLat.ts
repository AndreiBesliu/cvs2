import { useSyncExternalStore } from 'react';

/**
 * Ecranul lat: peste 75rem, pragul de la care meniul global are loc, pe un rând, și de fișiere (ADR 0104 §8, schimbat pe
 * 09.11). Sub el, carcasa trece deja la aranjamentul îngust (`stil.css`, `max-width: 75rem`), iar fișierele stau la capătul
 * barei de sus (`grupuriZona`).
 */
const LAT = '(min-width: 75.0625rem)';

function asculta(f: () => void): () => void {
  const m = matchMedia(LAT);
  m.addEventListener('change', f);
  return () => { m.removeEventListener('change', f); };
}

/** Re-randează componenta când ecranul trece pragul lat / îngust. */
export function useEcranLat(): boolean {
  return useSyncExternalStore(asculta, () => matchMedia(LAT).matches, () => true);
}
