import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import type { Document } from '../model/document.ts';
import { conturElement, cutieElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';

/**
 * Alegerea cu clicul (acțiunea `selectie.la-punct`, `actiuniDocument.ts`): distanța la contur și regula de umplere vin la
 * cerere, cu modulul ăsta, cerut de aplicație la montare (loc în pachetul de pornire, 17.10). Un clic dat înainte de
 * sosirea lui golește selecția pe loc și se aplică la sosire (doar ultimul clic în așteptare).
 */

/** Foaia pe care se lucrează (ca `FOAIA` din `actiuniDocument.ts`); Multi-Plate vine în etapa 11. */
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
