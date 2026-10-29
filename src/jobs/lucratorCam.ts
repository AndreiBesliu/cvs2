/**
 * Workerul CAM (ADR 0109, ADR 0015): primește o cerere (exportul, traseul, simularea 3D, timpul), o calculează cu
 * `calculCam.ts` și trimite înapoi răspunsul, cu tablourile transferate. Nu ține nimic între cereri; bazinul îl oprește
 * după răspuns, iar o anulare îl oprește din mijlocul calculului.
 */
import { raspunde } from './calculCam.ts';
import type { MesajCam, RaspunsMesajCam } from './protocolCam.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<MesajCam>) => void) | null;
  postMessage(m: RaspunsMesajCam, transfer?: Transferable[]): void;
};

lucrator.onmessage = (e) => {
  const { id, cerere } = e.data;
  raspunde(cerere).then(({ raspuns, transfer }) => {
    lucrator.postMessage({ id, ok: true, raspuns }, transfer);
  }, (err: unknown) => {
    lucrator.postMessage({ id, ok: false, motiv: err instanceof Error ? err.message : String(err) });
  });
};
