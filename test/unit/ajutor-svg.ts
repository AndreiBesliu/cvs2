/**
 * SVG pentru teste (ADR 0035): parserul din Node (`@xmldom/xmldom`, ca în oracol; în browser e `DOMParser`) și o pagină
 * de 100 × 50 mm cu viewBox-ul în mm, ca o unitate să fie un milimetru.
 */
import { DOMParser } from '@xmldom/xmldom';
import { citesteSvg, type OptiuniSvg, type ParserXml } from '../../src/io/svg.ts';

/** O eroare de parsare aruncă (ușa o întoarce ca refuz `parsare`); avertismentele parserului trec. */
export const PARSER: ParserXml = new DOMParser({
  onError: (nivel: string, mesaj: string) => {
    if (nivel !== 'warning') throw new Error(mesaj);
  },
}) as unknown as ParserXml;

export const octeti = (text: string): Uint8Array => new TextEncoder().encode(text);

export const pagina = (corp: string, radacina = 'width="100mm" height="50mm" viewBox="0 0 100 50"'): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${radacina}>${corp}</svg>`;

export const citeste = (text: string, optiuni: Omit<OptiuniSvg, 'parser'> = {}) => citesteSvg(octeti(text), { ...optiuni, parser: PARSER });
