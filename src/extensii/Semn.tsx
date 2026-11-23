/**
 * Semnul unei extensii (ADR 0231 §B.2), pe ecran: o imagine mică lângă numele ei, în meniu, în bibliotecă și pe fila ei. Doar
 * desen: numele stă lângă el, deci imaginea n-are text alternativ. Fără semn, sau dacă imaginea nu se poate arăta, piesa de
 * puzzle pe un fond neutru, cât semnul. Semnul unei extensii instalate vine din pachetul ei, printr-o adresă `blob:` ținută
 * cât e la vedere; nu se pune niciodată în pagină ca SVG.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { ExtensieInstalata } from './depozit.ts';
import { octetiSemn } from './semn.ts';

/** Adresa `blob:` a semnului unei extensii instalate, cât componenta e montată; null fără semn. */
export function useSemnInstalat(e: ExtensieInstalata | null): string | null {
  const [adresa, setAdresa] = useState<string | null>(null);
  useEffect(() => {
    const o = e ? octetiSemn(e) : null;
    if (!o) {
      setAdresa(null);
      return;
    }
    const u = URL.createObjectURL(new Blob([new Uint8Array(o)], { type: 'image/svg+xml' }));
    setAdresa(u);
    return () => { URL.revokeObjectURL(u); };
  }, [e]);
  return adresa;
}

/** Semnul, de la adresa dată (sau piesa de puzzle), într-un pătrat de `marime` px. */
export function Semn({ adresa, marime }: { readonly adresa: string | null; readonly marime: 20 | 28 }): ReactNode {
  // Adresa care n-a putut fi arătată: semnul următor (altă adresă) se încearcă din nou.
  const [stricata, setStricata] = useState<string | null>(null);
  if (adresa === null || adresa === stricata) {
    return (
      <span className={`semn-extensie semn-${marime}`} data-semn="" data-fara-semn="" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M10 3a2 2 0 0 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 0 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 0 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 0 0 0-4H5V6a1 1 0 0 1 1-1h4z"
            fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <img className={`semn-extensie semn-${marime}`} data-semn="" src={adresa} alt="" width={marime} height={marime} draggable={false}
      onError={() => { setStricata(adresa); }} />
  );
}

/** Semnul unei extensii instalate. */
export function SemnInstalat({ extensie, marime }: { readonly extensie: ExtensieInstalata; readonly marime: 20 | 28 }): ReactNode {
  return <Semn adresa={useSemnInstalat(extensie)} marime={marime} />;
}
