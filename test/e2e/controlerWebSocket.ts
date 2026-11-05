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
 *
 * Serverul nu închide el TCP-ul după un cadru de închidere (îl închide browserul), iar o legătură tăiată de el pleacă cu RST:
 * altfel, pe Windows, conexiunile lui rămân în TIME_WAIT pe port ~2 minute, iar un server nou pe același port (8282, al
 * podului) n-ar mai putea asculta (`EADDRINUSE`): o probă ar cădea din cauza celei de dinainte.
 *
 * Cu `pod`, e un pod ESP3D 3.0.2 (ADR 0136, felia 3.6f) peste același GRBL: subprotocolul `arduino`, controlul lui în cadre text
 * (`currentID:0`), fără banner (podul nu resetează GRBL-ul), iar comenzile `[ESP…]` rămân în pod, ca în sursa lui: `[ESP800]json`
 * în bucăți fără capăt de linie (cu un raport GRBL ajuns între ele), răspunsurile scurte `{"cmd":…}` cu capăt de linie,
 * `[ESP410]` simplu, scrierile ținute minte, iar `[ESP110]WIFI-STA` taie legătura (podul trece în rețeaua atelierului).
 */

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const PAS_MS = 10;
const OCTETI_TIMP_REAL: ReadonlySet<number> = new Set(Object.values(TIMP_REAL));
const RAPORT = '<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n';

export type PodFals = {
  readonly versiune?: string;
  /** Modul WiFi spus de `[ESP800]`: AP în rețeaua proprie, STA în rețeaua atelierului. */
  readonly mod: 'AP' | 'STA';
  readonly ip: string;
  readonly numeRetea?: string;
  readonly retele?: readonly { readonly ssid: string; readonly semnal: number; readonly protejata: boolean }[];
  /** Chemată la `[ESP110]WIFI-STA`, după răspuns, înainte să cadă legătura. */
  readonly laAtelier?: () => void;
};

export interface ControlerWebSocket {
  readonly port: number;
  /** Viteza simulării (1×, 100×): cât timp al controlerului trece la fiecare pas de 10 ms. */
  viteza: number;
  /** Octeții programului ajunși la controler: cadrele primite, fără timpul real și fără citirile `$G`. */
  program(): Uint8Array;
  /** Câte conexiuni a primit. */
  conexiuni(): number;
  /** Comenzile `[ESP…]` primite de pod, exact cum au venit (cu escape-urile). */
  comenziEsp(): readonly string[];
  /** Ce au primit de la browser, pe fiecare conexiune, cadrele care nu erau comenzi ale podului (`?` al probelor, de exemplu). */
  alteCadre(): readonly string[];
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

export function pornesteControler(opt: { readonly port?: number; readonly gazda?: string; readonly pod?: PodFals } = {}): Promise<ControlerWebSocket> {
  const socketuri = new Set<Socket>();
  const primite: Uint8Array[] = [];
  const comenzi: string[] = [];
  const alte: string[] = [];
  let conexiuni = 0;
  const ctl = { viteza: 100 };
  const pod = opt.pod;
  const server = createServer((_cerere, raspuns) => { raspuns.writeHead(426).end(); });
  server.on('upgrade', (cerere, socket: Socket) => {
    const cheie = cerere.headers['sec-websocket-key'];
    if (typeof cheie !== 'string') { socket.destroy(); return; }
    const accept = createHash('sha1').update(cheie + GUID).digest('base64');
    const cerute = String(cerere.headers['sec-websocket-protocol'] ?? '').split(',').map((x) => x.trim());
    // Browserul cere subprotocolul podului; un server care nu-l întoarce e refuzat (ca un controler fără el).
    const protocol = pod && cerute.includes('arduino') ? ['Sec-WebSocket-Protocol: arduino'] : [];
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, ...protocol, '', ''].join('\r\n'));
    socketuri.add(socket);
    conexiuni++;
    const emu = new EmulatorGrbl(undefined, { laNemodelat: 'eroare' });
    const trimite = (o: Buffer): void => { if (!socket.destroyed) socket.write(o); };
    const binar = (s: string): void => { trimite(cadru(2, Buffer.from(s, 'utf8'))); };
    const iesirea = (): void => {
      const l = emu.citeste();
      if (l.length > 0) trimite(cadru(2, Buffer.from(l.map((x) => `${x}\r\n`).join(''), 'latin1')));
    };
    if (pod) trimite(cadru(1, Buffer.from('currentID:0')));
    else {
      trimite(cadru(1, Buffer.from('CURRENT_ID:0')));
      trimite(cadru(2, Buffer.from(`\r\n${emu.contract.banner}\r\n`, 'latin1')));
    }
    const ceas = setInterval(() => { emu.timp(PAS_MS * ctl.viteza); iesirea(); }, PAS_MS);
    /** O comandă a podului (`[ESPnnn]…`), răspunsă ca ESP3D 3.0.2; true dacă era una. */
    const comandaPod = (text: string): boolean => {
      if (!pod || !text.startsWith('[ESP')) return false;
      comenzi.push(text);
      const m = /^\[ESP(\d+)\](.*?)( json)?\n$/.exec(text);
      const nr = Number(m?.[1] ?? 0);
      const valoare = (m?.[2] ?? '').replace(/\\(.)/g, '$1');
      if (nr === 800) {
        const bucati = ['{"cmd":"800","status":"ok","data":{', `"FWVersion":"${pod.versiune ?? '3.0.2'}"`, ',"FWTarget":"grbl"',
          ',"FWTargetID":"10"', ',"Setup":"Enabled"', `,"WebSocketIP":"${pod.ip}"`, ',"WebSocketPort":"81"', ',"Hostname":"esp3d"',
          `,"WiFiMode":"${pod.mod}"`, '}}'];
        bucati.forEach((b, k) => { binar(b); if (k === 4) binar(RAPORT); });
      } else if (nr === 410) {
        binar('Start Scan\n');
        for (const r of pod.retele ?? []) binar(`${r.ssid}\t${r.semnal}%\t${r.protejata ? 'Secure' : 'Open'}\n`);
        binar('End Scan\n');
      } else if (nr === 105 && valoare === '') {
        binar(`{"cmd":"105","status":"ok","data":"${pod.numeRetea ?? 'ESP3D'}"}\n`);
      } else if (nr === 110 && valoare === 'WIFI-STA') {
        binar('{"cmd":"110","status":"ok","data":"ok"}\n');
        pod.laAtelier?.();
        setTimeout(() => { socket.resetAndDestroy(); }, 50);
      } else {
        binar(`{"cmd":"${nr}","status":"ok","data":"ok"}\n`);
      }
      return true;
    };
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
        if (op === 8) { trimite(cadru(8, date.subarray(0, 2))); return; }
        if (op === 9) { trimite(cadru(10, date)); continue; }
        if (op !== 1 && op !== 2) continue;
        if (comandaPod(date.toString('utf8'))) continue;
        alte.push(date.toString('latin1'));
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
  return new Promise((rezolva, respinge) => {
    server.once('error', respinge);
    server.listen(opt.port ?? 0, opt.gazda ?? '127.0.0.1', () => {
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
        comenziEsp: () => [...comenzi],
        alteCadre: () => [...alte],
        taie: () => { for (const s of socketuri) s.resetAndDestroy(); },
        inchide: () => new Promise<void>((gata) => {
          for (const s of socketuri) s.resetAndDestroy();
          server.close(() => { gata(); });
        }),
      });
    });
  });
}
