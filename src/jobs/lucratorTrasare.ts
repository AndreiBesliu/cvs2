/**
 * Workerul trasării din imagine (ADR 0220 §2): primește fișierul și opțiunile, decodează, trasează și trimite căile, cu
 * tablourile transferate. Nu ține nimic între cereri (ADR 0015): bazinul (`bazinTrasare.ts`) îl oprește după răspuns, iar o
 * previzualizare nouă îl oprește din mijlocul calculului. E un worker al lui, nu cererea workerului CAM: workerele se
 * construiesc dintr-o bucată (IIFE), deci nucleul trasării ar fi crescut workerul CAM la fiecare export. Cu
 * `imagineaFoii` (ADR 0272), nu trasează: trimite imaginea pentru foaie, gata de păstrat (fișierul, ori imaginea prelucrată
 * codată aici).
 */
import { octetiImaginiiFoii, raspundeTrasare, type CerereTrasare } from './calculTrasare.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<CerereTrasare>) => void) | null;
  postMessage(m: unknown, transfer?: Transferable[]): void;
};

lucrator.onmessage = (e) => {
  const r = e.data.imagineaFoii ? octetiImaginiiFoii(e.data).then((raspuns) => ({ raspuns, transfer: [] as ArrayBuffer[] })) : raspundeTrasare(e.data);
  r.then(({ raspuns, transfer }) => {
    lucrator.postMessage({ ok: true, raspuns }, transfer);
  }, (err: unknown) => {
    lucrator.postMessage({ ok: false, motiv: err instanceof Error ? err.message : String(err) });
  });
};
