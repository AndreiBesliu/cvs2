/**
 * Cifrele cotelor la export (ADR 0330 §7, felia 10.4↑c-1): așezarea lor cu un font (în aplicație, cel cu o singură linie
 * inclus, Relief SingleLine), centrate pe x = 0, cu linia de bază pe y = 0, ca trăsături (contururi), pentru `entitatiCote`
 * din `src/io/coteExport.ts`, care nu cunoaște fontul.
 */
import type { CifreAsezate } from '../io/coteExport.ts';
import { aseazaText } from './asezare.ts';
import type { Font } from './font.ts';

/** Fontul cifrelor cotelor la export: cel inclus, cu o singură linie. */
export const FONT_COTE = 'relief-singleline';

export function cifreDinFont(font: Font): (text: string, inaltime: number) => CifreAsezate {
  return (text, inaltime) => {
    const t = aseazaText(font, { continut: text, inaltime, spatiere: 0, interlinie: 1, aliniere: 'centru' });
    return { contururi: t.glife.flatMap((g) => g.cai), lipsa: t.caractereLipsa };
  };
}
