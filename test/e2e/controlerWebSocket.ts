import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { EmulatorGrbl } from '../../src/machine/emulator.ts';
import { TIMP_REAL } from '../../src/machine/flux.ts';

/**
 * Un controler GRBL în rețea, doar pentru probe (ADR 0119, felia 3.6d): emulatorul GRBL 1.1h (ADR 0079) în spatele unui server
 * WebSocket minimal (RFC 6455: strângerea de mână, cadrele mascate ale clientului, text / binar / închidere / ping), pe
 * `127.0.0.1`. Ca FluidNC: la conectare, un mesaj de control în cadru text (`CURRENT_ID:0`), apoi bannerul; ieșirea GRBL în
 * cadre binare. Ține minte cadrele primite (fără timpul real și fără citirile `$G` ale sesiunii), ca proba să compare programul
 * ajuns la controler cu exportul; `taie` închide socket-ul fără cadrul de închidere (legătura căzută: 1006 în browser).
 */

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const PAS_MS = 10;
const OCTETI_TIMP_REAL: ReadonlySet<number> = new Set(Object.values(TIMP_REAL));

export interface ControlerWebSocket {
  readonly port: number;
  /** Viteza simulării (1×, 100×): cât timp al controlerului trece la fiecare pas de 10 ms. */
  viteza: number;
  /** Octeții programului ajunși la controler: cadrele primite, fără timpul real și fără citirile `$G`. */
  program(): Uint8Array;
  /** Câte conexiuni a primit. */
  conexiuni(): number;
  /** Legătura căzută: socket-ul se închide fără cadrul de închidere. */
  taie(): void;
  inchide(): Promise<void>;
}

function cadru(op: number, date: Uint8Array): Buffer {
  const n = date.length;
  let cap: Buffer;
  if (n < 126) cap = Buffer.from([0x80 | op, n]);
  else if (n < 65536) cap = Buffer.from([0x80 | op, 126, n >> 8, n & 0xff]);
  else {
    cap = Buffer.alloc(10);
    cap[0] = 0x80 | op;
    cap[1] = 127;
    cap.writeBigUInt64BE(BigInt(n), 2);
  }
  return Buffer.concat([cap, Buffer.from(date)]);
}

export function pornesteControler(): Promise<ControlerWebSocket> {
  const socketuri = new Set<Socket>();
  const primite: Uint8Array[] = [];
  let conexiuni = 0;
  const ctl = { viteza: 100 };
  const server = createServer((_cerere, raspuns) => { raspuns.writeHead(426).end(); });
  server.on('upgrade', (cerere, socket: Socket) => {
    const cheie = cerere.headers['sec-websocket-key'];
    if (typeof cheie !== 'string') { socket.destroy(); return; }
    const accept = createHash('sha1').update(cheie + GUID).digest('base64');
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
    socketuri.add(socket);
    conexiuni++;
    const emu = new EmulatorGrbl(undefined, { laNemodelat: 'eroare' });
    const trimite = (o: Buffer): void => { if (!socket.destroyed) socket.write(o); };
    const iesirea = (): void => {
      const l = emu.citeste();
      if (l.length > 0) trimite(cadru(2, Buffer.from(l.map((x) => `${x}\r\n`).join(''), 'latin1')));
    };
    trimite(cadru(1, Buffer.from('CURRENT_ID:0')));
    trimite(cadru(2, Buffer.from(`\r\n${emu.contract.banner}\r\n`, 'latin1')));
    const ceas = setInterval(() => { emu.timp(PAS_MS * ctl.viteza); iesirea(); }, PAS_MS);
    let rest = Buffer.alloc(0);
    socket.on('data', (d: Buffer) => {
      rest = Buffer.concat([rest, d]);
      for (;;) {
        if (rest.length < 2) return;
        const op = (rest[0] ?? 0) & 0x0f;
        const mascat = ((rest[1] ?? 0) & 0x80) !== 0;
        let n = (rest[1] ?? 0) & 0x7f;
        let pozitie = 2;
        if (n === 126) { if (rest.length < 4) return; n = rest.readUInt16BE(2); pozitie = 4; }
        else if (n === 127) { if (rest.length < 10) return; n = Number(rest.readBigUInt64BE(2)); pozitie = 10; }
        const masca = mascat ? 4 : 0;
        if (rest.length < pozitie + masca + n) return;
        const date = Buffer.from(rest.subarray(pozitie + masca, pozitie + masca + n));
        if (mascat) for (let i = 0; i < date.length; i++) date[i] = (date[i] ?? 0) ^ (rest[pozitie + (i % 4)] ?? 0);
        rest = rest.subarray(pozitie + masca + n);
        if (op === 8) { trimite(cadru(8, date.subarray(0, 2))); socket.end(); return; }
        if (op === 9) { trimite(cadru(10, date)); continue; }
        if (op !== 1 && op !== 2) continue;
        const timpReal = date.length === 1 && OCTETI_TIMP_REAL.has(date[0] ?? 0);
        if (!timpReal && date.toString('latin1') !== '$G\n') primite.push(new Uint8Array(date));
        emu.scrie(new Uint8Array(date));
        iesirea();
      }
    });
    const gata = (): void => { clearInterval(ceas); socketuri.delete(socket); };
    socket.on('close', gata);
    socket.on('error', gata);
  });
  return new Promise((rezolva) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      rezolva({
        port,
        get viteza() { return ctl.viteza; },
        set viteza(v: number) { ctl.viteza = v; },
        program: () => {
          const n = primite.reduce((s, o) => s + o.length, 0);
          const tot = new Uint8Array(n);
          let k = 0;
          for (const o of primite) { tot.set(o, k); k += o.length; }
          return tot;
        },
        conexiuni: () => conexiuni,
        taie: () => { for (const s of socketuri) s.destroy(); },
        inchide: () => new Promise<void>((gata) => {
          for (const s of socketuri) s.destroy();
          server.close(() => { gata(); });
        }),
      });
    });
  });
}
