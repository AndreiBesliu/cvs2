/**
 * Dicționarul codurilor imprimantei în aplicație (felia 3.6v, ADR 0195 §A.5): fișierul familiei driverului
 * (`coduri/<familie>.<limba>.json`, în precache), cerut abia la prima eroare, o singură dată pe familie și limbă, și verificat
 * după formă (un fișier vechi, trunchiat sau al altei familii nu trece). O cerere căzută (fără rețea, înainte de precache) se
 * reîncearcă la următoarea cerere. Notificarea sistemului nu așteaptă după el decât puțin: fără dicționar, pleacă cu cheia.
 */
import { useEffect, useState } from 'react';
import type { LimbaCoduri } from '../../shared/coduri.ts';
import {
  esteDictionarImprimanta, explicaEroare, fisierCoduriImprimanta, type DictionarImprimanta, type FamilieImprimanta,
  type IntrareCodImprimanta,
} from '../../shared/coduriImprimanta.ts';
import { useLimba } from '../ui/useLimba.ts';

/** Cererile făcute în pagina asta (promisiunea, nu răspunsul: cardul și notificarea nu cer de două ori). */
const aduse = new Map<string, Promise<DictionarImprimanta>>();

export function aduCoduriImprimanta(familie: FamilieImprimanta, limba: LimbaCoduri): Promise<DictionarImprimanta> {
  const k = `${familie}.${limba}`;
  let p = aduse.get(k);
  if (!p) {
    p = fetch(`/${fisierCoduriImprimanta(familie, limba)}`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const x: unknown = await r.json();
      if (!esteDictionarImprimanta(x, familie, limba)) throw new Error('fișierul codurilor nu are forma așteptată');
      return x;
    });
    p.catch(() => { aduse.delete(k); });
    aduse.set(k, p);
  }
  return p;
}

/** Dicționarul încă pe drum, nevenit (fără rețea, înainte de precache), sau null: driverul n-are dicționar ori n-a fost cerut. */
export type StareCoduriImprimanta = DictionarImprimanta | 'incarca' | 'lipsa' | null;

/** Dicționarul familiei, în limba de acum, cerut de la prima eroare (`cere`) încolo. */
export function useCoduriImprimanta(familie: FamilieImprimanta | null, cere: boolean): StareCoduriImprimanta {
  const limba = useLimba();
  const [cerut, setCerut] = useState(cere);
  if (cere && !cerut) setCerut(true);
  const [d, setD] = useState<StareCoduriImprimanta>(null);
  useEffect(() => {
    if (familie === null || !cerut) {
      setD(null);
      return undefined;
    }
    let viu = true;
    setD('incarca');
    aduCoduriImprimanta(familie, limba).then((x) => { if (viu) setD(x); }, () => { if (viu) setD('lipsa'); });
    return () => { viu = false; };
  }, [familie, limba, cerut]);
  return d;
}

/** Intrarea erorii din dicționar, așteptată cel mult `ms` (pentru notificarea sistemului); null fără ea, la timp. */
export function intrareCuTermen(familie: FamilieImprimanta, limba: LimbaCoduri, eroare: number | null, cheie: number | null, ms: number): Promise<IntrareCodImprimanta | null> {
  const dupaTermen = new Promise<null>((rez) => { setTimeout(() => { rez(null); }, ms); });
  const din = aduCoduriImprimanta(familie, limba).then((d) => explicaEroare(d, eroare, cheie)?.intrare ?? null, () => null);
  return Promise.race([din, dupaTermen]);
}
