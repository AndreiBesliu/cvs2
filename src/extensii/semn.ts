/**
 * Semnul unei extensii (ADR 0231 §B.2), partea pură: de unde îl ia gazda.
 * - Al unei extensii instalate vine din pachetul ei (fișierul `pictograma` al manifestului): se vede și fără internet, și la
 *   una instalată din fișier.
 * - Al unui rând din bibliotecă vine din fișierul de lângă catalog (cu amprenta în nume).
 * Fără semn, gazda arată piesa de puzzle. Semnul se arată doar ca imagine (`<img>`), niciodată pus în pagină ca SVG.
 */
import type { RandBiblioteca } from '../../shared/biblioteca.ts';
import type { ExtensieInstalata } from './depozit.ts';
import { esteSvg, type Pachet } from './pachet.ts';

/** Octeții semnului unei extensii instalate, sau null (fără câmp, fără fișier, ori un fișier care nu e SVG). */
export function octetiSemn(e: ExtensieInstalata): Uint8Array | null {
  const cale = e.manifest.pictograma;
  if (cale === undefined || !Object.hasOwn(e.fisiere, cale)) return null;
  const o = e.fisiere[cale];
  return o && esteSvg(o) ? o : null;
}

/** Octeții semnului unui pachet abia citit (fereastra de confirmare, înainte de instalare), sau null. */
export function octetiSemnPachet(p: Pachet): Uint8Array | null {
  const o = p.manifest.pictograma === undefined ? undefined : p.fisiere.get(p.manifest.pictograma);
  return o && esteSvg(o) ? o : null;
}

/** Adresa semnului unui rând din bibliotecă, lângă catalog, sau null. */
export function adresaSemnCatalog(rand: RandBiblioteca, adresaCatalog: string): string | null {
  return rand.pictograma ? new URL(rand.pictograma.fisier, adresaCatalog).href : null;
}
