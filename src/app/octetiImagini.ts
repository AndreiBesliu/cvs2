import { useEffect, useState } from 'react';
import type { ImaginePeFoaie } from '../canvas/protocol.ts';
import type { ImagineFoaie } from '../model/document.ts';

/**
 * Imaginile foii active pe pânză (ADR 0272): octeții lor, citiți din baza imaginilor la cerere (modulul bazei vine doar pe o
 * foaie cu imagini, deci pornirea rămâne aceeași), și lista celor vizibile, cu locul lor.
 */

const GOALA: ReadonlyMap<string, Blob | null> = new Map();
const FARA: readonly ImaginePeFoaie[] = [];

/**
 * Octeții imaginilor date: amprenta → fișierul, ori null dacă lipsește (ștearsă, ori un proiect adus din alt browser); ce încă
 * se citește nu e în hartă. O imagine citită o dată rămâne în hartă cât stă aplicația deschisă (Ctrl+Z o poate aduce înapoi).
 */
export function useOctetiImagini(imagini: readonly ImagineFoaie[] | undefined): ReadonlyMap<string, Blob | null> {
  const [harta, setHarta] = useState(GOALA);
  const surse = [...new Set((imagini ?? []).map((i) => i.sursa))].filter((s) => !harta.has(s)).sort().join(',');
  useEffect(() => {
    if (!surse) return;
    let viu = true;
    import('./imaginiFoaie.ts').then(async (m) => {
      const citite = await Promise.all(surse.split(',').map(async (s) => [s, (await m.citeste(s).catch(() => null))?.octeti ?? null] as const));
      if (viu) setHarta((h) => new Map([...h, ...citite]));
    }).catch(() => undefined);
    return () => { viu = false; };
  }, [surse]);
  return harta;
}

/** Pură: imaginile vizibile ale foii, pentru pânză, cu octeții lor (null: lipsă, ori încă se citesc); niciuna: aceeași listă. */
export function imaginiPentruPanza(imagini: readonly ImagineFoaie[] | undefined, octeti: ReadonlyMap<string, Blob | null>): readonly ImaginePeFoaie[] {
  const v = (imagini ?? []).filter((i) => i.vizibila);
  if (v.length === 0) return FARA;
  return v.map((i) => ({
    id: i.id, sursa: i.sursa, x: i.x, y: i.y, latime: i.latime, inaltime: i.inaltime, rotire: i.rotire, opacitate: i.opacitate,
    octeti: octeti.get(i.sursa) ?? null,
  }));
}
