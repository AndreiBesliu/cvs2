/**
 * Descoperirea extensiilor (ADR 0232 §C), partea gazdei, ca trei cârlige mici:
 * - `useVeste`: câte extensii instalate au o versiune mai nouă, din ce s-a aflat la ultima deschidere a meniului (`noi.ts`);
 * - `usePaleta`: paleta de comenzi întreabă gazda ce extensii sunt instalate și îi cere s-o deschidă pe cea aleasă;
 * - `useZipLasat`: un `.zip` de extensie lăsat pe aplicație deschide confirmarea instalării; alt `.zip` merge la Import.
 * Toate stau în bucata gazdei, la cerere: aplicația de la pornire nu știe de ele (pornirea nu crește).
 */
import { useEffect, useRef, useState } from 'react';
import type { CerereExtensiiPaleta } from '../ui/Paleta.tsx';
import type { StareCatalog } from './biblioteca.ts';
import type { ExtensieInstalata } from './depozit.ts';
import { cateNoi, citesteNoi, noiDupaCatalog, pastreazaNoi, scrieNoi } from './noi.ts';
import { LIMITE_PACHET, MANIFEST } from './pachet.ts';
import { numeZip } from './zip.ts';

/**
 * Vestea despre o versiune nouă (ADR 0232 §C.16). Un catalog venit e adevărul de acum; fără el, vestea ținută scade doar cu
 * ce s-a actualizat ori s-a scos. Până nu s-a citit lista celor instalate, nu se atinge nimic (lista goală de la început ar
 * șterge vestea).
 */
export function useVeste(catalog: StareCatalog | { readonly fel: 'incarca' } | null, lista: readonly ExtensieInstalata[], listaCitita: boolean): number {
  const [noi, setNoi] = useState(() => citesteNoi());
  useEffect(() => {
    if (!listaCitita) return;
    const n = catalog?.fel === 'ok' ? noiDupaCatalog(catalog.catalog.extensii, lista) : pastreazaNoi(noi, lista);
    if (JSON.stringify(n) === JSON.stringify(noi)) return;
    setNoi(n);
    scrieNoi(n);
  }, [catalog, lista, listaCitita]);
  return cateNoi(noi, lista);
}

/** Numele evenimentului prin care paleta vorbește cu gazda; același text stă în `src/ui/Paleta.tsx` (o probă îi ține egali). */
export const EVENIMENT_PALETA = 'cncvs2-extensii';

/** Paleta de comenzi (ADR 0232 §C.14): gazda răspunde pe loc cu extensiile instalate și o deschide pe cea cerută. */
export function usePaleta(lista: readonly ExtensieInstalata[], deschide: (x: ExtensieInstalata) => void): void {
  const acum = useRef({ lista, deschide });
  acum.current = { lista, deschide };
  useEffect(() => {
    const cerut = (e: Event): void => {
      const d = (e as CustomEvent<CerereExtensiiPaleta | null>).detail;
      if (!d) return;
      if (d.instalate) d.instalate.push(...acum.current.lista.map((x) => ({ id: x.id, nume: x.manifest.nume })));
      const x = d.deschide === undefined ? undefined : acum.current.lista.find((y) => y.id === d.deschide);
      if (x) acum.current.deschide(x);
    };
    window.addEventListener(EVENIMENT_PALETA, cerut);
    return () => { window.removeEventListener(EVENIMENT_PALETA, cerut); };
  }, []);
}

/** O extensie se recunoaște după manifestul din rădăcina arhivei; o arhivă mai mare decât orice pachet nu se mai citește. */
async function esteExtensie(f: File): Promise<boolean> {
  if (f.size > LIMITE_PACHET.octetiTotal * 2) return false;
  try {
    return numeZip(new Uint8Array(await f.arrayBuffer()))?.includes(MANIFEST) ?? false;
  } catch {
    return false;
  }
}

/**
 * Un `.zip` lăsat pe aplicație (ADR 0232 §C.13). Gazda îl ia înaintea planșei (la captură), cât nu e deschis niciun dialog:
 * cu `extensie.json` în rădăcină, deschide confirmarea instalării; altfel îl lasă din nou, în același loc, pentru Import
 * (care îl refuză cu fraza lui). Mai multe fișiere deodată, sau alt fel de fișier, nu sunt atinse.
 */
export function useZipLasat(laExtensie: (f: File) => void): void {
  const acum = useRef(laExtensie);
  acum.current = laExtensie;
  useEffect(() => {
    const trimise = new WeakSet<Event>();
    const lasat = (e: DragEvent): void => {
      const f = e.dataTransfer?.files;
      const fisier = f?.length === 1 ? f[0] : undefined;
      if (trimise.has(e) || !fisier || !/\.zip$/i.test(fisier.name) || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const tinta = e.target instanceof Element ? e.target : document.body;
      const { clientX, clientY } = e;
      // Planșa nu mai așteaptă fișierul („Lasă aici”), oricare i-ar fi drumul.
      tinta.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
      void esteExtensie(fisier).then((da) => {
        if (da) { acum.current(fisier); return; }
        const dt = new DataTransfer();
        dt.items.add(fisier);
        const dinNou = new DragEvent('drop', { bubbles: true, cancelable: true, clientX, clientY, dataTransfer: dt });
        trimise.add(dinNou);
        (tinta.isConnected ? tinta : document.body).dispatchEvent(dinNou);
      });
    };
    window.addEventListener('drop', lasat, true);
    return () => { window.removeEventListener('drop', lasat, true); };
  }, []);
}
