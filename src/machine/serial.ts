/**
 * Portul Web Serial (ADR 0081, T20): omul alege portul (fereastra browserului), se deschide la 115 200 baud (GRBL), octeții
 * pleacă printr-un singur scriitor, iar cititorul aduce bucățile până la închidere. Cablul scos sau o eroare a portului închid
 * transportul cu motivul. Web Serial există doar în Chrome și Edge pe desktop (nu în Firefox, nu în Safari): fără el, panoul
 * spune asta în loc să ofere conectarea.
 */
import type { Transport } from './sesiune.ts';

/** Ce folosim din `SerialPort` (tipurile Web Serial nu sunt în lib.dom). */
type PortSerial = {
  open(o: { readonly baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
};
type Serial = { requestPort(o?: object): Promise<PortSerial> };

export const BAUD_GRBL = 115200;

export function serialDisponibil(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Cere un port omului și îl deschide; aruncă dacă omul renunță sau portul nu se deschide (ocupat de alt program). */
export async function deschideSerial(baud = BAUD_GRBL): Promise<Transport> {
  const serial = (navigator as unknown as { readonly serial?: Serial }).serial;
  if (!serial) throw new Error('Web Serial lipsește');
  const port = await serial.requestPort();
  await port.open({ baudRate: baud });
  const scriitor = port.writable?.getWriter();
  if (!scriitor) { await port.close().catch(() => undefined); throw new Error('portul nu se poate scrie'); }
  let cititor: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let inchis = false;
  return {
    fel: 'serial',
    scrie: (o) => scriitor.write(new Uint8Array(o)),
    porneste(primit, laInchidere) {
      void (async () => {
        try {
          while (!inchis && port.readable) {
            cititor = port.readable.getReader();
            try {
              for (;;) {
                const { value, done } = await cititor.read();
                if (done) break;
                if (value) primit(value);
              }
            } finally {
              cititor.releaseLock();
            }
          }
          laInchidere(inchis ? null : 'portul s-a închis');
        } catch (e) {
          laInchidere(inchis ? null : e instanceof Error ? e.message : String(e));
        }
      })();
    },
    async inchide() {
      inchis = true;
      await cititor?.cancel().catch(() => undefined);
      scriitor.releaseLock();
      await port.close().catch(() => undefined);
    },
  };
}
