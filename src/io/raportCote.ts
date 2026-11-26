/**
 * Desenul unei foi în raportul foilor (ADR 0210 §6), cu cotele ei la cerere (ADR 0330 §7, felia 10.4↑d-3): SVG-ul exportului
 * de vectori, cu foaia, liniile la a 150-a parte din latura mare a foii, cât să se vadă în previzualizare. Fără cote cerute
 * (sau pe o foaie fără cote), desenul de până acum, octet cu octet. Cu ele, stratul COTE (culoarea din setări, liniile la
 * jumătate din ale pieselor), cu cifrele mărite cât să se citească pe desen: cel puțin a 60-a parte din latura mare, cu
 * capetele, golul și depășirea crescute la fel (linia cotei rămâne unde a pus-o omul); pagina se lărgește cât ies cotele din
 * foaie, ca să nu se taie. Pur; vine la cerere, doar când raportul cere cotele.
 */
import { uneste } from '../geom/cutie.ts';
import type { StilCota } from '../model/desenCota.ts';
import type { Document } from '../model/document.ts';
import { entitatiCote, type OptiuniCote } from './coteExport.ts';
import { scrieSvg } from './svgExport.ts';
import { vectoriFoaie, type VectoriFoaie } from './vectori.ts';

/** Cifrele cotelor pe desenul raportului: cel puțin a atâta parte din latura mare a foii. */
export const PARTE_CIFRE_RAPORT = 60;
/** Liniile foii și ale pieselor pe desenul raportului: a atâta parte din latura mare (ale cotelor, jumătate). */
export const PARTE_LINII_RAPORT = 150;

/** Latura mare a foii, după care se măsoară desenul ei în raport. */
export const laturaRaport = (doc: Document, k: number): number => {
  const s = doc.foi[k]?.stoc;
  return s ? Math.max(s.latime, s.inaltime) : 0;
};

/** Pură: stilul cotelor pe desenul raportului; pe o foaie la care cifrele se citesc deja, exact cel dat. */
export function stilRaport(stil: StilCota, latura: number): StilCota {
  const m = latura / PARTE_CIFRE_RAPORT / stil.inaltime;
  return m <= 1 ? stil : { ...stil, inaltime: stil.inaltime * m, capat: stil.capat * m, gol: stil.gol * m, depasire: stil.depasire * m };
}

/** Cotele cerute de raport: desenul și scrierea cifrelor (din setări), fontul cifrelor și culoarea stratului. */
export type CoteRaport = OptiuniCote & { readonly culoare: string };

/** Pură: SVG-ul foii `k` pentru raport, cu cotele ei dacă sunt cerute. */
export function svgFoaieRaport(doc: Document, k: number, cote?: CoteRaport): string {
  const latura = laturaRaport(doc, k);
  const v: VectoriFoaie = vectoriFoaie(doc, k, true);
  const ec = cote ? entitatiCote(doc, k, { ...cote, stil: stilRaport(cote.stil, latura) }) : null;
  if (!cote || !ec?.cutie) return scrieSvg(v, latura / PARTE_LINII_RAPORT);
  const cuCote: VectoriFoaie = {
    ...v, entitati: [...v.entitati, ...ec.entitati], cutie: uneste(v.cutie, ec.cutie),
    stratCote: { nume: 'COTE', culoare: cote.culoare, grosime: latura / (2 * PARTE_LINII_RAPORT) },
  };
  return scrieSvg(cuCote, latura / PARTE_LINII_RAPORT, uneste({ minX: 0, minY: 0, maxX: v.latime, maxY: v.inaltime }, ec.cutie));
}
