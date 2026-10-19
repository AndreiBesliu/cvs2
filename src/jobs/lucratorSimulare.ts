/**
 * Workerul simulării (ADR 0047 §4, ADR 0015): primește o bandă, o simulează cu nucleul (`src/sim/banda.ts`) și trimite
 * înapoi rezumatul ei. Nu ține nimic între cereri: câmpul benzii e aruncat după răspuns.
 */
import { calculeazaBanda } from '../sim/banda.ts';
import { transferabile, type MesajSimulare, type RaspunsSimulare } from './protocolSimulare.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<MesajSimulare>) => void) | null;
  postMessage(m: RaspunsSimulare, transfer?: Transferable[]): void;
};

lucrator.onmessage = (e) => {
  const { id, cerere } = e.data;
  try {
    const raspuns = calculeazaBanda(cerere);
    lucrator.postMessage({ id, ok: true, raspuns }, transferabile(raspuns));
  } catch (err) {
    lucrator.postMessage({ id, ok: false, motiv: err instanceof Error ? err.message : String(err) });
  }
};
