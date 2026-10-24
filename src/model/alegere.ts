import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import type { Document } from './document.ts';
import { conturElement, cutieElement } from './forme.ts';
import { elementeFoaie } from './lume.ts';

/**
 * Forma de sub un punct (alegerea cu clicul, ADR 0059 §5): o folosesc bucata alegerii (`src/ui/actiuniAlegere.ts`, adusă
 * la cerere pentru clicul pânzei) și modulul editării (dreptunghiul de selecție hotărăște la apăsare dacă apăsarea e pe
 * gol). Stă separat, ca editarea să nu depindă de bucata alegerii: dacă ea nu vine, clicul spune că n-a putut, dar
 * editarea merge mai departe.
 */

/** Foaia pe care se lucrează (ca `FOAIA` din `src/ui/actiuniDocument.ts`); Multi-Plate vine în etapa 11. */
const FOAIA = 0;

/**
 * Instanța de sub un punct al documentului: cea al cărei element, cel mai de sus, are conturul la cel mult `toleranta` mm
 * sau punctul înăuntru (regula evenodd). Sau null.
 */
export function instantaLa(doc: Document, x: number, y: number, toleranta: number): string | null {
  const lume = elementeFoaie(doc, FOAIA);
  for (let i = lume.length - 1; i >= 0; i--) {
    const e = lume[i];
    if (!e) continue;
    // Cutia, lărgită cu toleranța, o margine de jos a distanței: elementele departe de clic nu se mai măsoară.
    const k = cutieElement(e);
    if (x < k.minX - toleranta || x > k.maxX + toleranta || y < k.minY - toleranta || y > k.maxY + toleranta) continue;
    const c = conturElement(e);
    if (distantaLaContur({ x, y }, c) <= toleranta || inRegiune({ x, y }, [c])) return e.instanta;
  }
  return null;
}
