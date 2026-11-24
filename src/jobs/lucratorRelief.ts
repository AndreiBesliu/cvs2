/**
 * Workerul reliefului (ADR 0310 §3): primește o cerere (imaginea de făcut relief, ori dalele unui relief de desenat), o
 * calculează și trimite rezultatul, cu tablourile transferate. Nu ține nimic între cereri (ADR 0015): bazinul
 * (`bazinRelief.ts`) îl oprește după răspuns. E un worker al lui, ca al trasării: workerele se construiesc dintr-o bucată,
 * deci nucleul reliefului n-ar trebui să crească workerul CAM la fiecare export.
 */
import { raspundeRelief, type CerereRelief } from './calculRelief.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<CerereRelief>) => void) | null;
  postMessage(m: unknown, transfer?: Transferable[]): void;
};

lucrator.onmessage = (e) => {
  raspundeRelief(e.data).then(({ raspuns, transfer }) => {
    lucrator.postMessage({ ok: true, raspuns }, transfer);
  }, (err: unknown) => {
    lucrator.postMessage({ ok: false, motiv: err instanceof Error ? err.message : String(err) });
  });
};
