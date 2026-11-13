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
 *   urcarea e pe 80; proba își mută cererea pe portul imprimantei false (`page.route`), aplicația rămâne pe 80;
 * - din 3.6i, `fel: 'k1c-2025'`, după transcrierea owner-ului (K1C 2025, firmware V1.0.0.26, 07.11): fără bătăi ale inimii (la
 *   `inimaMs`, doar o bucată de stare, `{"maxBedTemp":115}`), lista ca text (`retGcodeFileInfo.fileInfo`, cu mărimile), urmată de
 *   istoric (`historyList`) și de filme (`elapseVideoList`), firmware-ul în `DWIN sw ver`;
 * - din 3.6o (ADR 0192), comenzile din timpul imprimării, cu numele din integrarea Home Assistant: `lightSw` 0 / 1; `gcodeCmd`
 *   doar `M106 P<0|1|2> S<0–255>` (ventilatoarele piesei, carcasei și cel lateral, în `modelFanPct`, `caseFanPct`,
 *   `auxiliaryFanPct`; orice alt text e ignorat); `setFeedratePct` și `setFlowratePct`, întregi 1–200; `nozzleTempControl` și
 *   `bedTempControl` (`{num: 0, val}`), între 0 și maxime (320 și 115); `autohome` „X Y”, apoi „Z”, fiecare cu `deviceState` 7
 *   cât durează (`homingMs`), cu axele în `autohome` („X:1 Y:1 Z:0”). `ignora` face imprimanta să nu răspundă la câmpurile date.
 * - din 3.6r (ADR 0193 §C), `gcodeCmd` `EXCLUDE_OBJECT NAME=<piesă>`, cât „imprimă” un fișier (și în pauză): o piesă din
 *   listă, încă neanulată, intră în `excluded_objects` (listă JSON ca text, ca K1C); piesa la care lucrează acum e refuzată
 *   (ca firmware-ul Creality, „Forbidden”), fără niciun răspuns. Ca Klipper, o piesă anulată se sare repede (fără să țină un
 *   pas), capul nu merge acolo, iar filamentul numărat rămâne cel al fișierului.
 * - din 3.6s (ADR 0194 §A), un fișier „imprimat” se încheie cu `state` 2 (ca o K3: doi pași, apoi 0, cu `printJobTime` și
 *   `usedMaterialLength` puse pe 0); `faraFilament()` pune `materialStatus` 1 și pauza (ca senzorul K1), iar Reia îl pune
 *   la loc (0).
 * - din 3.6t (ADR 0194 §B), istoricul (`historyList`, câmpurile din transcrierea owner-ului): trimis la `reqHistory`, după
 *   lista fișierelor (`k1c-2025`) și la finalul sau oprirea unei lucrări (cu `printfinish` 1 sau 0), pornind de la `istoric`.
 * Ține minte cadrele primite (fără `ok`) și câte `ok` a primit; `taie` închide socket-urile fără cadrul de închidere (1006).
 */

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const DIR = '/usr/data/printer_data/gcodes/';

export type FisierFals = { readonly name: string; readonly timeCost?: number; readonly material?: string; readonly size?: number };

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
  /** `k1` (implicit): bătăile inimii și lista `retGcodeFileInfo2`; `k1c-2025`: ca imprimanta owner-ului (vezi antetul). */
  readonly fel?: 'k1' | 'k1c-2025';
  /** Cât durează fiecare pas al homing-ului (`deviceState` 7), în ms. */
  readonly homingMs?: number;
  /**
   * Din 3.6q: un fișier trimis se „imprimă” din conținutul lui, în atâția pași (implicit 40): straturile, poziția, filamentul,
   * piesele, oprirea la o pauză.
   */
  readonly pasiFisier?: number;
  /** Ca K1C (transcrierea din 07.11): `layer` sare între numărătoarea adevărată și una cu 5 mai mare. */
  readonly numaratoriDuble?: boolean;
  /** Filamentul liniei de curățare din `START_PRINT`, numărat de imprimantă în plus față de fișier (mm; implicit 12). */
  readonly filamentInPlus?: number;
  /** Conținutul unor fișiere din listă, ca și cum ar fi fost trimise din altă parte (Creality Print): se „imprimă” din el. */
  readonly continut?: Readonly<Record<string, string>>;
  /** Din 3.6t: istoricul de la pornire (intrările `historyList`, ca în transcriere). */
  readonly istoric?: readonly Readonly<Record<string, string | number>>[];
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
  /** Imprimanta nu mai răspunde la comenzile `set` cu aceste câmpuri (de exemplu `setFlowratePct`): primite, dar fără efect. */
  ignora(campuri: readonly string[]): void;
  /** Stratul adevărat al fișierului „imprimat” acum (null: niciunul), oricât de des ar sări `layer`. */
  stratAdevarat(): number | null;
  /** Din 3.6s: senzorul spune că s-a terminat filamentul (`materialStatus` 1), iar o imprimare trece în pauză. */
  faraFilament(): void;
  /** Un pas al imprimării, ca la fiecare `pasMs`, dat de probă (din 3.6r: cu `pasMs` mare, imprimanta stă între pași). */
  pas(): void;
  taie(): void;
  /**
   * Ca imprimanta owner-ului la o pornire de pe ecran (3.6i): legăturile de acum tac, fără să se închidă, iar adresa nu mai
   * primește legături noi (imprimanta și-a refăcut WiFi-ul, cu alt IP).
   */
  taci(): void;
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
  /** Legăturile care tac (`taci`): nu mai trimit și nu mai ascultă, dar rămân deschise. */
  const tacute = new Set<Socket>();
  let ascultaServerul = true;
  const trimitatori = new Set<(campuri: Readonly<Record<string, unknown>>) => void>();
  const primite: string[] = [];
  let conexiuni = 0;
  let okuri = 0;
  let inimi = 0;
  const fisiere: FisierFals[] = [...(opt.fisiere ?? [])];
  const urcate: UrcareFalsa[] = [];
  let pierde = false;
  const pasMs = opt.pasMs ?? 200;
  const k2025 = opt.fel === 'k1c-2025';
  // Starea imprimantei, cum o trimite ea.
  const s: Record<string, string | number | Record<string, number>> = {
    model: opt.model ?? 'K1C', hostname: opt.nume ?? 'K1C-8578',
    modelVersion: k2025
      ? `printer hw ver:;printer sw ver:;DWIN hw ver:CR4SU200382C13;DWIN sw ver:${opt.firmware ?? 'V1.0.0.26.20251024S'};`
      : `printer hw ver:CR4CU220812S12;printer sw ver:${opt.firmware ?? '1.3.3.5'};DWIN hw ver:;DWIN sw ver:;`,
    state: 0, printFileName: '', printProgress: 0, printJobTime: 0, printLeftTime: 0, layer: 0, TotalLayer: 0,
    nozzleTemp: temp(28), targetNozzleTemp: temp(0), bedTemp0: temp(24), targetBedTemp0: temp(0), boxTemp: temp(23),
    err: { errcode: 0, key: 0 }, withSelfTest: 0, lightSw: 1,
    // Din 3.6o, ca în transcrierea owner-ului (07.11): ventilatoarele, viteza, debitul, maximele, „ocupată” și axele.
    fan: 0, fanCase: 0, fanAuxiliary: 0, modelFanPct: 0, caseFanPct: 0, auxiliaryFanPct: 0, curFeedratePct: 100, curFlowratePct: 100,
    maxNozzleTemp: 320, maxBedTemp: 115, deviceState: 0, autohome: 'X:0 Y:0 Z:0',
    // Din 3.6s: senzorul de filament (0: filamentul e pus), ca K1C-ul owner-ului.
    materialStatus: 0,
  };
  const ignorate = new Set<string>();
  const homingMs = opt.homingMs ?? 600;
  /** Schimbă câmpurile și le trimite, doar pe ele, tuturor. */
  const schimba = (c: Readonly<Record<string, string | number | Record<string, number>>>): void => {
    Object.assign(s, c);
    for (const t of trimitatori) t(c);
  };
  // Din 3.6t: istoricul (cele mai noi întâi, ca K1) și începutul lucrării de acum (s).
  const istoric: Readonly<Record<string, string | number>>[] = [...(opt.istoric ?? [])];
  let inceputLucrare = 0;
  const trimiteIstoric = (): void => { for (const t of trimitatori) t({ historyList: istoric }); };
  /** Lucrarea de acum intră în istoric (1: gata, 0: oprită), cu timpul și filamentul de dinaintea finalului; apoi istoricul, tuturor. */
  const inIstoric = (printfinish: number): void => {
    const nume = String(s['printFileName']);
    const durata = Number(s['printJobTime']);
    istoric.unshift({
      id: istoric.length + 1, filename: nume, size: 1000, ctime: inceputLucrare, starttime: inceputLucrare, totaltime: durata + 40,
      usagematerial: Number(s['usedMaterialLength'] ?? 0), startway: 9, usagetime: durata, printfinish, thumbnail: `${DIR}.thumbs/dummpy.png`,
    });
    trimiteIstoric();
  };
  const imprima = (fisier: string, progres: number): void => {
    const f = fisiere.find((x) => `${DIR}${x.name}` === fisier);
    const total = f?.timeCost ?? 600;
    inceputLucrare = Math.floor(Date.now() / 1000) - Math.round((total * progres) / 100);
    schimba({
      state: 1, printFileName: fisier, printProgress: progres, printJobTime: Math.round((total * progres) / 100), printLeftTime: Math.round(total * (1 - progres / 100)),
      TotalLayer: 50, layer: Math.round(progres / 2), targetNozzleTemp: temp(220), nozzleTemp: temp(220), targetBedTemp0: temp(50), bedTemp0: temp(49.5),
    });
  };
  if (opt.imprima) imprima(`${DIR}${opt.imprima.fisier}`, opt.imprima.progres);
  // Din 3.6q: conținutul fișierelor trimise și „imprimarea” lor, linie cu linie (ca `virtual_sdcard` al lui Klipper).
  const continut = new Map<string, string>(Object.entries(opt.continut ?? {}));
  type Rulare = {
    readonly linii: readonly string[]; readonly marime: number; readonly pePas: number; i: number; octeti: number;
    strat: number; e: number; absE: boolean; x: number; y: number; piesa: string; alterna: boolean;
    /** Din 3.6r: numele pieselor din fișier (mari, ca Klipper) și cele anulate. */
    readonly piese: ReadonlySet<string>; readonly excluse: Set<string>;
  };
  let rulare: Rulare | null = null;
  const imprimaFisier = (cale: string, text: string): void => {
    const linii = text.split('\n');
    const piese: { name: string; center?: number[]; polygon?: number[][] }[] = [];
    for (const l of linii) {
      const m = /^EXCLUDE_OBJECT_DEFINE NAME=(\S+)(?: CENTER=(\S+))?(?: POLYGON=(\S+))?/.exec(l);
      if (m === null) continue;
      piese.push({ name: m[1]!.toUpperCase(), ...(m[2] ? { center: m[2].split(',').map(Number) } : {}), ...(m[3] ? { polygon: JSON.parse(m[3]) as number[][] } : {}) });
    }
    const straturi = linii.filter((l) => l === ';LAYER_CHANGE').length;
    inceputLucrare = Math.floor(Date.now() / 1000);
    rulare = {
      linii, marime: Buffer.byteLength(text), pePas: Math.max(1, Math.ceil(linii.length / (opt.pasiFisier ?? 40))), i: 0, octeti: 0,
      strat: 0, e: 0, absE: true, x: 0, y: 0, piesa: '', alterna: false, piese: new Set(piese.map((p) => p.name)), excluse: new Set(),
    };
    schimba({
      state: 1, printFileName: cale, printProgress: 0, printJobTime: 0, printLeftTime: 600, TotalLayer: straturi, layer: 0, usedMaterialLength: 0,
      curPosition: 'X:00 Y:00 Z:00', targetNozzleTemp: temp(220), nozzleTemp: temp(220), targetBedTemp0: temp(55), bedTemp0: temp(55),
    });
    schimba({ current_object: '', excluded_objects: '[]', objects: JSON.stringify(piese) });
  };
  /** Un pas al „imprimării” unui fișier: liniile pasului, până la capăt sau la o pauză; apoi starea, ca la K1C. */
  const pasFisier = (r: Rulare): void => {
    let pauza = false;
    const piesaInainte = r.piesa;
    for (let n = 0; n < r.pePas && r.i < r.linii.length && !pauza;) {
      const l = r.linii[r.i]!;
      r.i++;
      r.octeti += Buffer.byteLength(l) + 1;
      const cod = l.split(';')[0]!.trim().toUpperCase();
      // Din 3.6r: liniile unei piese anulate trec fără să țină pasul, iar capul nu merge acolo.
      const sarita = r.excluse.has(r.piesa);
      if (!sarita) n++;
      if (l === ';LAYER_CHANGE') r.strat++;
      else if (/^(PAUSE|M600|M601|M0|M25)(\s|$)/.test(cod)) pauza = true;
      else if (cod.startsWith('EXCLUDE_OBJECT_START')) r.piesa = (/NAME=(\S+)/.exec(cod)?.[1] ?? '').toUpperCase();
      else if (cod.startsWith('EXCLUDE_OBJECT_END')) r.piesa = '';
      else if (cod === 'M82') r.absE = true;
      else if (cod === 'M83') r.absE = false;
      else if (/^G92\b/.test(cod)) { /* E pus la loc: în modul relativ nu schimbă nimic, iar fișierele cvs2 sunt relative. */ }
      else if (/^G[01]\b/.test(cod)) {
        const v = (k: string): number | null => { const m = new RegExp(`\\b${k}(-?[\\d.]+)`).exec(cod); return m ? Number(m[1]) : null; };
        if (!sarita) { r.x = v('X') ?? r.x; r.y = v('Y') ?? r.y; }
        // Filamentul numărat e cel al fișierului, și pe o piesă anulată (Klipper: `print_stats.filament_used`).
        const e = v('E');
        if (e !== null && !r.absE) r.e += e;
      }
    }
    r.alterna = !r.alterna;
    const trecut = Number(s['printJobTime']) + 1;
    schimba({
      // La pauză, numărătoarea cu 5 în plus (cazul greu: ultima valoare bună rămâne pe stratul de dinainte).
      layer: opt.numaratoriDuble && (r.alterna || pauza) ? r.strat + 5 : r.strat, printProgress: Math.min(99, Math.floor((100 * r.octeti) / r.marime)),
      curPosition: `X:${Math.round(r.x)} Y:${Math.round(r.y)} Z:00`, usedMaterialLength: Math.round(r.e + (opt.filamentInPlus ?? 12)),
      printJobTime: trecut, printLeftTime: Math.max(1, Number(s['printLeftTime']) - 1),
    });
    if (r.piesa !== piesaInainte) schimba({ current_object: r.piesa });
    if (pauza) { schimba({ state: 5 }); return; }
    if (r.i >= r.linii.length) {
      rulare = null;
      // Din 3.6s: „terminată” (2), ca o K3; după doi pași, liberă (0), cu timpul și filamentul pe 0. Din 3.6t, și istoricul.
      schimba({ printProgress: 100, current_object: '', state: 2, printLeftTime: 0 });
      inIstoric(1);
    }
  };
  let finalizare = 0;
  const unPas = (): void => {
    if (s['state'] === 2) {
      finalizare++;
      if (finalizare >= 2) {
        finalizare = 0;
        schimba({ state: 0, printJobTime: 0, usedMaterialLength: 0, targetNozzleTemp: temp(0), targetBedTemp0: temp(0) });
      }
      return;
    }
    if (s['state'] !== 1) return;
    if (rulare !== null) { pasFisier(rulare); return; }
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
      inIstoric(1);
      schimba({ state: 0, printLeftTime: 0, targetNozzleTemp: temp(0), targetBedTemp0: temp(0) });
    }
  };
  const pas = setInterval(unPas, pasMs);

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
        const nou: FisierFals = { name: f.nume, timeCost: 600, material: 'PLA', size: f.date.length };
        const k = fisiere.findIndex((x) => x.name === f.nume);
        if (k >= 0) fisiere[k] = nou;
        else fisiere.push(nou);
        continut.set(f.nume, f.date.toString('utf8'));
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
    const trimite = (t: string): void => { if (!socket.destroyed && !tacute.has(socket)) socket.write(cadru(1, Buffer.from(t, 'utf8'))); };
    const json = (o: unknown): void => { trimite(JSON.stringify(o)); };
    const laSchimbare = (c: Readonly<Record<string, unknown>>): void => { json(c); };
    trimitatori.add(laSchimbare);
    /** Imprimanta închide legătura: cadrul de închidere, apoi socket-ul. */
    const inchide = (): void => {
      if (socket.destroyed || tacute.has(socket)) return;
      socket.write(cadru(8, Buffer.from([0x03, 0xe8])));
      setTimeout(() => { socket.destroy(); }, 20);
    };
    let asteaptaOk: ReturnType<typeof setTimeout> | null = null;
    const inima = setInterval(() => {
      // K1C 2025: fără bătăi ale inimii, doar o bucată de stare, iar legătura ține și fără `ok`.
      if (k2025) { json({ maxBedTemp: 115 }); return; }
      inimi++;
      json({ ModeCode: 'heart_beat', msg: new Date().toISOString() });
      if (asteaptaOk === null) asteaptaOk = setTimeout(inchide, opt.asteptareOkMs ?? 3000);
    }, opt.inimaMs ?? 1000);
    const comanda = (text: string): void => {
      if (tacute.has(socket)) return;
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
      if (o.method === 'get' && p['reqHistory'] === 1) { json({ historyList: istoric }); return; }
      if (o.method === 'get' && p['reqGcodeFile'] === 1) {
        if (k2025) {
          // Ca în transcrierea owner-ului: `director:nume:mărime:strat:dată:filament:miniatură;…`, apoi istoricul și filmele.
          const text = fisiere.map((f) => `${DIR.slice(0, -1)}:${f.name}:${f.size ?? 1000}:0.200000:1793890905:${f.timeCost ?? 0}:/tmp/creality/local_gcode/humbnail/${f.name.replace(/\.gcode$/, '.png')};`).join('');
          json({ retGcodeFileInfo: { totalNum: fisiere.length, fileInfo: text } });
          json({ historyList: istoric });
          json({ elapseVideoList: [] });
          return;
        }
        json({ retGcodeFileInfo2: fisiere.map((f) => ({ name: f.name, path: `${DIR}${f.name}`, ...(f.timeCost !== undefined ? { timeCost: String(f.timeCost) } : {}), ...(f.material ? { material: f.material } : {}), software: 'Creality Print' })) });
        return;
      }
      if (o.method !== 'set') return;
      // Comenzile din timpul imprimării (3.6o): fiecare câmp, doar cu o valoare bună; unul ignorat (`ignora`) nu schimbă nimic.
      const camp = Object.keys(p)[0] ?? '';
      if (ignorate.has(camp)) return;
      const intreg = (v: unknown, min: number, max: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
      if (camp === 'lightSw') { const v = intreg(p['lightSw'], 0, 1); if (v !== null) schimba({ lightSw: v }); return; }
      if (camp === 'gcodeCmd') {
        // Din 3.6r: anularea unei piese (vezi antetul); orice refuz, fără răspuns.
        const x = typeof p['gcodeCmd'] === 'string' ? /^EXCLUDE_OBJECT NAME=([A-Za-z0-9_.-]+)$/.exec(p['gcodeCmd']) : null;
        if (x !== null) {
          const r = rulare as Rulare | null;
          const nume = x[1]!.toUpperCase();
          if (r === null || (s['state'] !== 1 && s['state'] !== 5) || !r.piese.has(nume) || r.excluse.has(nume) || s['current_object'] === nume) return;
          r.excluse.add(nume);
          schimba({ excluded_objects: JSON.stringify([...r.excluse]) });
          return;
        }
        const m = typeof p['gcodeCmd'] === 'string' ? /^M106 P([012]) S(\d{1,3})$/.exec(p['gcodeCmd']) : null;
        const sv = m === null ? null : intreg(Number(m[2]), 0, 255);
        if (m === null || sv === null) return;
        const canale: readonly (readonly [string, string])[] = [['modelFanPct', 'fan'], ['caseFanPct', 'fanCase'], ['auxiliaryFanPct', 'fanAuxiliary']];
        const [procent, pornit] = canale[Number(m[1])] ?? ['', ''];
        schimba({ [procent]: Math.round((sv / 255) * 100), [pornit]: sv > 0 ? 1 : 0 });
        return;
      }
      if (camp === 'setFeedratePct' || camp === 'setFlowratePct') {
        const v = intreg(p[camp], 1, 200);
        if (v !== null) schimba(camp === 'setFeedratePct' ? { curFeedratePct: v } : { curFlowratePct: v });
        return;
      }
      if (camp === 'nozzleTempControl') { const v = intreg(p[camp], 0, 320); if (v !== null) schimba({ targetNozzleTemp: temp(v) }); return; }
      if (camp === 'bedTempControl') {
        const b = p[camp] as { num?: unknown; val?: unknown } | null;
        const v = b !== null && typeof b === 'object' && b.num === 0 ? intreg(b.val, 0, 115) : null;
        if (v !== null) schimba({ targetBedTemp0: temp(v) });
        return;
      }
      if (camp === 'autohome') {
        const axe = p['autohome'] === 'X Y' ? 'X:1 Y:1 Z:0' : p['autohome'] === 'Z' ? 'X:1 Y:1 Z:1' : null;
        if (axe === null || s['state'] === 1 || s['state'] === 5) return;
        schimba({ deviceState: 7 });
        setTimeout(() => { schimba({ deviceState: 0, autohome: axe }); }, homingMs);
        return;
      }
      if (p['pause'] === 1 && s['state'] === 1) schimba({ state: 5 });
      else if (p['pause'] === 0 && s['state'] === 5) schimba({ state: 1, materialStatus: 0 });
      else if (p['stop'] === 1 && (s['state'] === 1 || s['state'] === 5)) {
        rulare = null;
        schimba({ state: 7 });
        // Ca imprimanta owner-ului (07.11): după oprire, piesele se golesc.
        schimba({ current_object: '', excluded_objects: '[]', objects: '[]' });
        setTimeout(() => { inIstoric(0); schimba({ state: 4, targetNozzleTemp: temp(0), targetBedTemp0: temp(0) }); }, 800);
      } else if (typeof p['opGcodeFile'] === 'string' && p['opGcodeFile'].startsWith('printprt:') && s['state'] !== 1 && s['state'] !== 5) {
        const cale = p['opGcodeFile'].slice('printprt:'.length);
        if (!fisiere.some((f) => `${DIR}${f.name}` === cale)) return;
        schimba({ state: 9, printFileName: cale, printProgress: 0 });
        const text = continut.get(cale.slice(DIR.length));
        setTimeout(() => { if (text !== undefined) imprimaFisier(cale, text); else imprima(cale, 0); }, 100);
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
        ignora: (campuri) => { for (const c of campuri) ignorate.add(c); },
        stratAdevarat: () => (rulare === null ? null : (rulare as Rulare).strat),
        faraFilament: () => { schimba(s['state'] === 1 ? { materialStatus: 1, state: 5 } : { materialStatus: 1 }); },
        pas: unPas,
        taie: () => { for (const x of socketuri) x.resetAndDestroy(); },
        taci: () => {
          for (const x of socketuri) tacute.add(x);
          if (ascultaServerul) { ascultaServerul = false; server.close(); }
        },
        inchide: () => new Promise<void>((g) => {
          clearInterval(pas);
          for (const x of socketuri) x.resetAndDestroy();
          if (!ascultaServerul) { g(); return; }
          ascultaServerul = false;
          server.close(() => { g(); });
        }),
      });
    });
  });
}
