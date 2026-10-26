/**
 * Mașina simulată (ADR 0081): emulatorul GRBL 1.1h (ADR 0079) ca transport, ca omul să încerce panoul mașinii fără CNC. Doar pe
 * instanța de test și doar online (bucata `MasinaSimulata`, în afara precache-ului, cu plafonul ei): nu e o funcție a produsului,
 * ci o mașină de probă. Timpul simulării merge cu ceasul paginii, înmulțit cu viteza aleasă (1×, 10×, 100×); ce nu știe simularea
 * răspunde cu un mesaj și `error:20`, nu cu un răspuns inventat.
 */
import { EmulatorGrbl } from './emulator.ts';
import type { Ceas, Transport } from './sesiune.ts';

export const PAS_SIMULARE_MS = 10;
export const VITEZE_SIMULARE = [1, 10, 100] as const;

const octeti = (t: string): Uint8Array => Uint8Array.from(t, (c) => c.charCodeAt(0) & 0xff);

export function deschideSimulata(opt: { readonly ceas: Ceas; readonly viteza: () => number }): Transport & { readonly emulator: EmulatorGrbl } {
  const emu = new EmulatorGrbl(undefined, { laNemodelat: 'eroare' });
  let primit: ((o: Uint8Array) => void) | null = null;
  let ticker: unknown = null;
  const trimiteIesirea = (): void => {
    const l = emu.citeste();
    if (l.length > 0 && primit) primit(octeti(l.map((x) => `${x}\r\n`).join('')));
  };
  return {
    fel: 'simulat',
    emulator: emu,
    scrie: (o) => {
      emu.scrie(o);
      trimiteIesirea();
      return Promise.resolve();
    },
    porneste(p) {
      primit = p;
      // Ca un GRBL la deschiderea portului: bannerul.
      p(octeti(`\r\n${emu.contract.banner}\r\n`));
      ticker = opt.ceas.setInterval(() => {
        emu.timp(PAS_SIMULARE_MS * opt.viteza());
        trimiteIesirea();
      }, PAS_SIMULARE_MS);
    },
    inchide() {
      if (ticker !== null) opt.ceas.clearInterval(ticker);
      ticker = null;
      primit = null;
      return Promise.resolve();
    },
  };
}
