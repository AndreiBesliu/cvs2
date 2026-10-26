/**
 * Exportul 2D (ADR 0088), adus la cerere de panoul lui: foaia → vectori → textul fișierului (SVG sau DXF R2007), cu numele
 * și ce conține (câte entități, pe câte straturi), ca panoul să spună ce a descărcat.
 */
import type { Document } from '../model/document.ts';
import { scrieDxf } from './dxfExport.ts';
import { scrieSvg } from './svgExport.ts';
import { vectoriFoaie } from './vectori.ts';

export type FormatVectori = 'svg' | 'dxf';

export type FisierVectori = {
  readonly nume: string;
  readonly tip: string;
  readonly text: string;
  readonly entitati: number;
  readonly straturi: number;
};

export function exportaVectori(doc: Document, indexFoaie: number, format: FormatVectori, cuFoaia: boolean): FisierVectori {
  const v = vectoriFoaie(doc, indexFoaie, cuFoaia);
  const straturi = new Set(v.entitati.map((e) => e.strat)).size;
  const nume = `cncvs2-foaia-${indexFoaie + 1}.${format}`;
  return format === 'svg'
    ? { nume, tip: 'image/svg+xml', text: scrieSvg(v), entitati: v.entitati.length, straturi }
    : { nume, tip: 'application/dxf', text: scrieDxf(v), entitati: v.entitati.length, straturi };
}
