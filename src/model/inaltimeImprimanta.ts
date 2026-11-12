/**
 * Înălțimea de imprimare a pieselor (ADR 0191, felia 3.6l), ținută în proiect: câmpul opțional `inaltimeImprimanta` al piesei,
 * scris din dialogul „Din desen…” al ferestrei Imprimanta ca orice altă schimbare (cu anularea obișnuită). Pură.
 */
import type { Comanda } from './jurnal.ts';
import type { Document, Piesa } from './document.ts';

/**
 * Comanda care pune înălțimile date (mm, după id-ul piesei; null = scoate câmpul), într-un singur pas, sau null dacă nu se
 * schimbă nimic. O piesă care nu există, sau o înălțime care nu e un număr pozitiv finit, nu intră.
 */
export function comandaInaltimi(doc: Document, inaltimi: ReadonlyMap<string, number | null>): Comanda | null {
  const comenzi: Comanda[] = [];
  for (const [id, h] of inaltimi) {
    const vechi = doc.piese.find((p) => p.id === id);
    if (!vechi || (h !== null && !(Number.isFinite(h) && h > 0))) continue;
    if ((vechi.inaltimeImprimanta ?? null) === h) continue;
    let nou: Piesa;
    if (h === null) {
      const { inaltimeImprimanta: _scos, ...rest } = vechi;
      nou = rest;
    } else nou = { ...vechi, inaltimeImprimanta: h };
    comenzi.push({ tip: 'inlocuieste-piesa', vechi, nou });
  }
  if (comenzi.length === 0) return null;
  return comenzi.length === 1 ? comenzi[0]! : { tip: 'lot', comenzi };
}
