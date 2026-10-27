/**
 * Exportul 2D (ADR 0088, ADR 0089), adus la cerere de panoul lui: foaia → vectori → textul fișierului (DXF R2007, SVG, PDF
 * sau EPS, toate numai ASCII), cu numele și ce conține (câte entități, pe câte straturi), ca panoul să spună ce a descărcat.
 */
import type { Document } from '../model/document.ts';
import { scrieDxf } from './dxfExport.ts';
import { scrieEps } from './epsExport.ts';
import { scriePdf } from './pdfExport.ts';
import { scrieSvg } from './svgExport.ts';
import { vectoriFoaie } from './vectori.ts';

export type FormatVectori = 'dxf' | 'svg' | 'pdf' | 'eps';

const TIPURI: Readonly<Record<FormatVectori, string>> = {
  dxf: 'application/dxf', svg: 'image/svg+xml', pdf: 'application/pdf', eps: 'application/postscript',
};

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
  const baza = `cncvs2-foaia-${indexFoaie + 1}`;
  const text = format === 'svg' ? scrieSvg(v) : format === 'pdf' ? scriePdf(v) : format === 'eps' ? scrieEps(v, baza) : scrieDxf(v);
  return { nume: `${baza}.${format}`, tip: TIPURI[format], text, entitati: v.entitati.length, straturi };
}
