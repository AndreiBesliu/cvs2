/**
 * Exportul 2D (ADR 0088, ADR 0089), adus la cerere de panoul lui: foaia → vectori → textul fișierului (DXF R2007, SVG, PDF
 * sau EPS, toate numai ASCII), cu numele și ce conține (câte entități, pe câte straturi), ca panoul să spună ce a descărcat.
 * Cu cotele (ADR 0330 §7, „Cu cotele”): și ele, pe stratul lor, cu cutia paginii lărgită cât ies din foaie; fără ele, sau pe
 * o foaie fără cote, fișierul e octet cu octet cel de dinainte. În DXF, cotele pot fi cote (DIMENSION, felia 10.4↑c-2), iar
 * cifrele pot fi text; în PDF și EPS, un semn al cifrelor fără loc în Helvetica se spune lipsă.
 */
import { uneste } from '../geom/cutie.ts';
import type { Document } from '../model/document.ts';
import { entitatiCote, type OptiuniCote } from './coteExport.ts';
import { inHelvetica } from './helvetica.ts';
import { scrieDxf } from './dxfExport.ts';
import { scrieEps } from './epsExport.ts';
import { scriePdf } from './pdfExport.ts';
import { scrieSvg } from './svgExport.ts';
import { vectoriFoaie, type StratCote, type VectoriFoaie } from './vectori.ts';

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
  /** Câte cote s-au scris, și semnele cifrelor pe care fontul nu le are (nedesenate). */
  readonly cote: number;
  readonly lipsa: readonly string[];
};

/** Cotele cerute la export: desenul și cifrele (din setări), fontul cifrelor, stratul lor, felul lor în DXF. */
export type CoteCerute = OptiuniCote & { readonly strat: StratCote; readonly dxf: 'dimension' | 'linii' };

export function exportaVectori(doc: Document, indexFoaie: number, format: FormatVectori, cuFoaia: boolean, cote?: CoteCerute): FisierVectori {
  let v: VectoriFoaie = vectoriFoaie(doc, indexFoaie, cuFoaia);
  const ec = cote ? entitatiCote(doc, indexFoaie, cote) : null;
  const lipsa = new Set(ec?.lipsa ?? []);
  if (cote && ec?.cutie) {
    v = { ...v, entitati: [...v.entitati, ...ec.entitati], cutie: uneste(v.cutie, ec.cutie), stratCote: cote.strat };
    if (format === 'dxf' && cote.dxf === 'dimension' && ec.definitii.length > 0) v = { ...v, dimensiuni: { definitii: ec.definitii, stil: cote.stil, format: cote.format } };
    if (format === 'pdf' || format === 'eps') for (const e of ec.entitati) if (e.fel === 'text') for (const x of inHelvetica(e.text).lipsa) lipsa.add(x);
  }
  const straturi = new Set(v.entitati.map((e) => e.strat)).size;
  const baza = `cncvs2-foaia-${indexFoaie + 1}`;
  const text = format === 'svg' ? scrieSvg(v) : format === 'pdf' ? scriePdf(v) : format === 'eps' ? scrieEps(v, baza) : scrieDxf(v);
  return { nume: `${baza}.${format}`, tip: TIPURI[format], text, entitati: v.entitati.length, straturi, cote: ec?.cote ?? 0, lipsa: [...lipsa] };
}
