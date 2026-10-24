/**
 * Aducerea documentației generate la build (ADR 0048): `roadmap.json`, `catalog.json` și documentele, cerute abia la
 * deschiderea filei (nu sunt în bucata `/admin` și nici în precache). Fiecare fișier se cere o singură dată pe pagină; un
 * eșec (rețeaua, un 404, altă formă, de exemplu pagina aplicației în locul JSON-ului) nu rămâne ținut minte, deci
 * „Încearcă din nou” cere iar. Forma JSON-ului e verificată (`shared/documentatie.ts`); eroarea „forma” o traduce fila.
 */
import {
  FISIER_CATALOG, adresaFisier, esteCatalog, esteRoadmap, fisierDocument, fisierRoadmap, type Catalog, type Roadmap,
} from '../../../shared/documentatie.ts';

export type Aduce = (adresa: string) => Promise<Response>;

export interface AducatorDocumentatie {
  /** Roadmap-ul în limba dată (ADR 0056: `en` vine din dicționarul traducerilor). */
  readonly roadmap: (limba: 'ro' | 'en') => Promise<Roadmap>;
  readonly catalog: () => Promise<Catalog>;
  readonly document: (cale: string) => Promise<string>;
}

/** `no-cache`: documentația are nume fixe și se schimbă la fiecare publicare (antetul de pe hosting spune la fel). */
const aducePrinRetea: Aduce = (adresa) => fetch(adresa, { cache: 'no-cache' });

export function aducatorDocumentatie(aduce: Aduce = aducePrinRetea): AducatorDocumentatie {
  const cereri = new Map<string, Promise<unknown>>();
  function o<T>(fisier: string, citeste: (r: Response) => Promise<T>): Promise<T> {
    const veche = cereri.get(fisier);
    if (veche) return veche as Promise<T>;
    const noua = aduce(adresaFisier(fisier)).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return citeste(r);
    });
    cereri.set(fisier, noua);
    noua.catch(() => { if (cereri.get(fisier) === noua) cereri.delete(fisier); });
    return noua;
  }
  const json = <T>(verifica: (x: unknown) => x is T) => async (r: Response): Promise<T> => {
    let x: unknown;
    try {
      x = await r.json();
    } catch {
      throw new Error('forma');
    }
    if (!verifica(x)) throw new Error('forma');
    return x;
  };
  return {
    roadmap: (limba) => o(fisierRoadmap(limba), json(esteRoadmap)),
    catalog: () => o(FISIER_CATALOG, json(esteCatalog)),
    document: (cale) => o(fisierDocument(cale), (r) => r.text()),
  };
}
