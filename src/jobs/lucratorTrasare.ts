/**
 * Workerul trasării din imagine (ADR 0220 §2): primește fișierul și opțiunile, decodează, trasează și trimite căile, cu
 * tablourile transferate. Nu ține nimic între cereri (ADR 0015): bazinul (`bazinTrasare.ts`) îl oprește după răspuns, iar o
 * previzualizare nouă îl oprește din mijlocul calculului. E un worker al lui, nu cererea workerului CAM: workerele se
 * construiesc dintr-o bucată (IIFE), deci nucleul trasării ar fi crescut workerul CAM la fiecare export.
 */
import { raspundeTrasare, type CerereTrasare } from './calculTrasare.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<CerereTrasare>) => void) | null;
  postMessage(m: unknown, transfer?: Transferable[]): void;
};

lucrator.onmessage = (e) => {
  raspundeTrasare(e.data).then(({ raspuns, transfer }) => {
    lucrator.postMessage({ ok: true, raspuns }, transfer);
  }, (err: unknown) => {
    lucrator.postMessage({ ok: false, motiv: err instanceof Error ? err.message : String(err) });
  });
};
