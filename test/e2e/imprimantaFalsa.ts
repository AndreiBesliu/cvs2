import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';

/**
 * O imprimantă Creality din familia K1, falsă, doar pentru probe (ADR 0190, felia 3.6g): WebSocket-ul de pe 9999, cu protocolul
 * de pe hârtie (ghidul `docs/masina/imprimanta-k1c.md`, după gazda „CrealityPrint” din OrcaSlicer și integrarea Home Assistant
 * `ha_creality_ws`):
 * - cadre text JSON; o bătaie a inimii la `inimaMs` (`{"ModeCode":"heart_beat",…}`), iar fără `ok` în `asteptareOkMs`
 *   imprimanta închide legătura;
 * - `{"method":"get","params":{"ReqPrinterPara":1}}`: toată starea; `{"reqGcodeFile":1}`: lista (`retGcodeFileInfo2`);
 * - starea pe bucăți, cu temperaturile ca text („220.000000”), doar câmpurile schimbate;
 * - `pause` 1 / 0, `stop` 1 (7, apoi 4 la 0,8 s), `opGcodeFile` (9, apoi 1, iar legătura se închide la 50 ms, ca K1);
 * - imprimarea înaintează cu un procent la `pasMs`; la 100 % arată întâi timp rămas, apoi se încheie (0, 100 %, 0 s);
 * - din 3.6h, `POST /upload/<nume>` (multipart, câmpul `file`, ca OrcaSlicer), pe același port: fișierul intră în listă sub
 *   numele lui din multipart, fără antete CORS; `urcarea('pierde')` răspunde la fel, dar nu-l mai pune în listă. Pe K1C
 *   urcarea e pe 80; proba își mută cererea pe portul imprimantei false (`page.route`), aplicația rămâne pe 80.
 * Ține minte cadrele primite (fără `ok`) și câte `ok` a primit; `taie` închide socket-urile fără cadrul de închidere (1006).
 */

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const DIR = '/usr/data/printer_data/gcodes/';

export type FisierFals = { readonly name: string; readonly timeCost?: number; readonly material?: string };

/** O urcare primită: calea cererii, câmpurile multipart, numele fișierului din multipart și conținutul lui. */
export type UrcareFalsa = { readonly url: string; readonly campuri: readonly string[]; readonly nume: string | null; readonly text: string };

export type OptiuniImprimantaFalsa = {
  readonly port?: number;
  readonly gazda?: string;
  readonly fisiere?: readonly FisierFals[];
  readonly inimaMs?: number;
  readonly asteptareOkMs?: number;
  readonly pasMs?: number;
  readonly model?: string;
  readonly nume?: string;
  readonly firmware?: string;
  /** Pornește imprimând fișierul acesta, de la procentul dat. */
  readonly imprima?: { readonly fisier: string; readonly progres: number };
};

export interface ImprimantaFalsa {
  readonly port: number;
  conexiuni(): number;
  /** Cadrele text primite, în ordine, fără `ok`-uri. */
  comenzi(): readonly string[];
  okuri(): number;
  /** Câte bătăi ale inimii a trimis. */
  inimi(): number;
  stare(): Readonly<Record<string, string | number>>;
  /** Urcările primite (`POST /upload/…`), în ordine. */
  urcate(): readonly UrcareFalsa[];
  /** `pierde`: urcarea primește 200, dar fișierul nu intră în listă. */
  urcarea(fel: 'primeste' | 'pierde'): void;
  /** O eroare semnalată, ca `err` în stare (0: niciuna). */
  eroare(cod: number, cheie: number): void;
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

const temp = (v: number): string => v.toFixed(6);

/** Părțile unui corp multipart/form-data: câmpul, numele fișierului (dacă e unul) și octeții. */
function multipart(corp: Buffer, tip: string): { camp: string; nume: string | null; date: Buffer }[] {
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/.exec(tip);
  if (!m) return [];
  const granita = Buffer.from(`--${m[1] ?? m[2] ?? ''}`);
  const parti: { camp: string; nume: string | null; date: Buffer }[] = [];
  let i = corp.indexOf(granita);
  while (i >= 0) {
    const start = i + granita.length;
    if (corp.subarray(start, start + 2).toString() === '--') break;
    const j = corp.indexOf(granita, start);
    if (j < 0) break;
    // Fără CRLF-ul de după graniță și fără cel dinaintea următoarei.
    const parte = corp.subarray(start + 2, j - 2);
    const h = parte.indexOf('\r\n\r\n');
    const antet = parte.subarray(0, h).toString('utf8');
    parti.push({ camp: /; name="([^"]*)"/.exec(antet)?.[1] ?? '', nume: /; filename="([^"]*)"/.exec(antet)?.[1] ?? null, date: parte.subarray(h + 4) });
    i = j;
  }
  return parti;
}

export function pornesteImprimanta(opt: OptiuniImprimantaFalsa = {}): Promise<ImprimantaFalsa> {
  const socketuri = new Set<Socket>();
  const trimitatori = new Set<(campuri: Readonly<Record<string, unknown>>) => void>();
  const primite: string[] = [];
  let conexiuni = 0;
  let okuri = 0;
  let inimi = 0;
  const fisiere: FisierFals[] = [...(opt.fisiere ?? [])];
  const urcate: UrcareFalsa[] = [];
  let pierde = false;
  const pasMs = opt.pasMs ?? 200;
  // Starea imprimantei, cum o trimite ea.
  const s: Record<string, string | number | Record<string, number>> = {
    model: opt.model ?? 'K1C', hostname: opt.nume ?? 'K1C-8578', modelVersion: `printer hw ver:CR4CU220812S12;printer sw ver:${opt.firmware ?? '1.3.3.5'};DWIN hw ver:;DWIN sw ver:;`,
    state: 0, printFileName: '', printProgress: 0, printJobTime: 0, printLeftTime: 0, layer: 0, TotalLayer: 0,
    nozzleTemp: temp(28), targetNozzleTemp: temp(0), bedTemp0: temp(24), targetBedTemp0: temp(0), boxTemp: temp(23),
    err: { errcode: 0, key: 0 }, withSelfTest: 0, lightSw: 1,
  };
  /** Schimbă câmpurile și le trimite, doar pe ele, tuturor. */
  const schimba = (c: Readonly<Record<string, string | number | Record<string, number>>>): void => {
    Object.assign(s, c);
    for (const t of trimitatori) t(c);
  };
  const imprima = (fisier: string, progres: number): void => {
    const f = fisiere.find((x) => `${DIR}${x.name}` === fisier);
    const total = f?.timeCost ?? 600;
    schimba({
      state: 1, printFileName: fisier, printProgress: progres, printJobTime: Math.round((total * progres) / 100), printLeftTime: Math.round(total * (1 - progres / 100)),
      TotalLayer: 50, layer: Math.round(progres / 2), targetNozzleTemp: temp(220), nozzleTemp: temp(220), targetBedTemp0: temp(50), bedTemp0: temp(49.5),
    });
  };
  if (opt.imprima) imprima(`${DIR}${opt.imprima.fisier}`, opt.imprima.progres);
  let finalizare = 0;
  const pas = setInterval(() => {
    if (s['state'] !== 1) return;
    const p = Number(s['printProgress']);
    const total = Number(s['printJobTime']) + Number(s['printLeftTime']);
    if (p < 100) {
      const nou = p + 1;
      schimba({ printProgress: nou, printJobTime: Math.round((total * nou) / 100), printLeftTime: Math.max(1, Math.round(total * (1 - nou / 100))), layer: Math.round(nou / 2) });
      return;
    }
    // Ca o K1C: 100 % cu timp rămas, apoi se încheie.
    finalizare++;
    if (finalizare >= 2) {
      finalizare = 0;
      schimba({ state: 0, printLeftTime: 0, targetNozzleTemp: temp(0), targetBedTemp0: temp(0) });
    }
  }, pasMs);

  const server = createServer((cerere, raspuns) => {
    const url = cerere.url ?? '';
    if (cerere.method !== 'POST' || !url.startsWith('/upload/')) { raspuns.writeHead(426).end(); return; }
    const bucati: Buffer[] = [];
    cerere.on('data', (b: Buffer) => { bucati.push(b); });
    cerere.on('end', () => {
      const parti = multipart(Buffer.concat(bucati), String(cerere.headers['content-type'] ?? ''));
      const f = parti.find((p) => p.camp === 'file');
      urcate.push({ url, campuri: parti.map((p) => p.camp), nume: f?.nume ?? null, text: f?.date.toString('utf8') ?? '' });
      if (f?.nume && !pierde) {
        const nou: FisierFals = { name: f.nume, timeCost: 600, material: 'PLA' };
        const k = fisiere.findIndex((x) => x.name === f.nume);
        if (k >= 0) fisiere[k] = nou;
        else fisiere.push(nou);
      }
      // Fără antete CORS (nemăsurat pe K1C): aplicația oricum nu citește răspunsul.
      raspuns.writeHead(200, { 'Content-Type': 'application/json' }).end('{"code":0}');
    });
  });
  server.on('upgrade', (cerere, socket: Socket) => {
    const cheie = cerere.headers['sec-websocket-key'];
    if (typeof cheie !== 'string') { socket.destroy(); return; }
    const accept = createHash('sha1').update(cheie + GUID).digest('base64');
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
    socketuri.add(socket);
    conexiuni++;
    const trimite = (t: string): void => { if (!socket.destroyed) socket.write(cadru(1, Buffer.from(t, 'utf8'))); };
    const json = (o: unknown): void => { trimite(JSON.stringify(o)); };
    const laSchimbare = (c: Readonly<Record<string, unknown>>): void => { json(c); };
    trimitatori.add(laSchimbare);
    /** Imprimanta închide legătura: cadrul de închidere, apoi socket-ul. */
    const inchide = (): void => {
      if (socket.destroyed) return;
      socket.write(cadru(8, Buffer.from([0x03, 0xe8])));
      setTimeout(() => { socket.destroy(); }, 20);
    };
    let asteaptaOk: ReturnType<typeof setTimeout> | null = null;
    const inima = setInterval(() => {
      inimi++;
      json({ ModeCode: 'heart_beat', msg: new Date().toISOString() });
      if (asteaptaOk === null) asteaptaOk = setTimeout(inchide, opt.asteptareOkMs ?? 3000);
    }, opt.inimaMs ?? 1000);
    const comanda = (text: string): void => {
      if (text === 'ok') {
        okuri++;
        if (asteaptaOk !== null) { clearTimeout(asteaptaOk); asteaptaOk = null; }
        return;
      }
      primite.push(text);
      let o: { method?: unknown; params?: Record<string, unknown> } | null = null;
      try {
        o = JSON.parse(text) as { method?: unknown; params?: Record<string, unknown> };
      } catch {
        return;
      }
      const p = o.params ?? {};
      if (o.method === 'get' && p['ReqPrinterPara'] === 1) { json(s); return; }
      if (o.method === 'get' && p['reqGcodeFile'] === 1) {
        json({ retGcodeFileInfo2: fisiere.map((f) => ({ name: f.name, path: `${DIR}${f.name}`, ...(f.timeCost !== undefined ? { timeCost: String(f.timeCost) } : {}), ...(f.material ? { material: f.material } : {}), software: 'Creality Print' })) });
        return;
      }
      if (o.method !== 'set') return;
      if (p['pause'] === 1 && s['state'] === 1) schimba({ state: 5 });
      else if (p['pause'] === 0 && s['state'] === 5) schimba({ state: 1 });
      else if (p['stop'] === 1 && (s['state'] === 1 || s['state'] === 5)) {
        schimba({ state: 7 });
        setTimeout(() => { schimba({ state: 4, targetNozzleTemp: temp(0), targetBedTemp0: temp(0) }); }, 800);
      } else if (typeof p['opGcodeFile'] === 'string' && p['opGcodeFile'].startsWith('printprt:') && s['state'] !== 1 && s['state'] !== 5) {
        const cale = p['opGcodeFile'].slice('printprt:'.length);
        if (!fisiere.some((f) => `${DIR}${f.name}` === cale)) return;
        schimba({ state: 9, printFileName: cale, printProgress: 0 });
        setTimeout(() => { imprima(cale, 0); }, 100);
        // Ca K1: după pornire, imprimanta închide legătura.
        setTimeout(inchide, 50);
      }
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
        if (op === 8) { if (!socket.destroyed) socket.write(cadru(8, date.subarray(0, 2))); continue; }
        if (op === 9) { if (!socket.destroyed) socket.write(cadru(10, date)); continue; }
        // Familia K1 primește doar cadre text.
        if (op !== 1) continue;
        comanda(date.toString('utf8'));
      }
    });
    const gata = (): void => {
      clearInterval(inima);
      if (asteaptaOk !== null) clearTimeout(asteaptaOk);
      trimitatori.delete(laSchimbare);
      socketuri.delete(socket);
    };
    socket.on('close', gata);
    socket.on('error', gata);
  });
  return new Promise((rezolva, respinge) => {
    server.once('error', respinge);
    server.listen(opt.port ?? 0, opt.gazda ?? '127.0.0.1', () => {
      rezolva({
        port: (server.address() as AddressInfo).port,
        conexiuni: () => conexiuni,
        comenzi: () => [...primite],
        okuri: () => okuri,
        inimi: () => inimi,
        stare: () => ({ ...s }) as Readonly<Record<string, string | number>>,
        urcate: () => [...urcate],
        urcarea: (fel) => { pierde = fel === 'pierde'; },
        eroare: (cod, cheieEroare) => { schimba({ err: { errcode: cod, key: cheieEroare } }); },
        taie: () => { for (const x of socketuri) x.resetAndDestroy(); },
        inchide: () => new Promise<void>((g) => {
          clearInterval(pas);
          for (const x of socketuri) x.resetAndDestroy();
          server.close(() => { g(); });
        }),
      });
    });
  });
}
