/**
 * Transportul prin rețea (ADR 0119, felia 3.6d): un WebSocket spre controlerul din rețeaua locală, lângă portul Web Serial
 * (`serial.ts`), peste același flux (numărarea caracterelor, ADR 0080). Aplicația e pe HTTPS: browserul (Chrome și Edge, de la
 * 147) lasă un `ws://` doar spre un IP local scris ca atare sau spre un nume `.local`, după permisiunea rețelei locale, deci
 * adresa se judecă înainte de conectare (`adresaRetea`). Cadrele primite, text sau binare, devin octeți pentru sesiune, fără
 * mesajele de control ale controlerului; fiecare scriere a sesiunii pleacă într-un cadru binar al ei (timpul real, singur).
 */
import type { Transport } from './sesiune.ts';

/** Profilurile controlerelor (ADR 0119 §3): portul implicit și subprotocolul WebSocket-ului. */
export const PROFILURI_RETEA = ['fluidnc', 'grblhal', 'esp3d'] as const;
export type ProfilRetea = (typeof PROFILURI_RETEA)[number];
export const PROFIL_RETEA: Readonly<Record<ProfilRetea, { readonly port: number; readonly subprotocol: string | null }>> = {
  // FluidNC: portul web + 1; grblHAL: `$307`, implicit 81; podul ESP3D: WebSocket-ul de date, din setările lui.
  fluidnc: { port: 81, subprotocol: null },
  grblhal: { port: 81, subprotocol: null },
  esp3d: { port: 8282, subprotocol: 'arduino' },
};

export function esteProfilRetea(x: unknown): x is ProfilRetea {
  return (PROFILURI_RETEA as readonly unknown[]).includes(x);
}

export type MotivAdresa = 'goala' | 'invalida' | 'schema' | 'cont' | 'port' | 'nume' | 'publica';
export type AdresaRetea = {
  readonly url: string;
  /** Gazda, cum o arată panoul (IPv6 între paranteze). */
  readonly gazda: string;
  readonly port: number;
};

const portBun = (p: number): boolean => Number.isInteger(p) && p >= 1 && p <= 65535;

/** IPv4 local (RFC 1918, link-local, loopback), scris ca atare; null dacă textul nu e un IPv4. */
function ipv4Local(gazda: string): boolean | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(gazda);
  if (!m) return null;
  const [a = 0, b = 0] = m.slice(1, 3).map(Number);
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

/** IPv6 local (loopback, ULA fc00::/7, link-local fe80::/10), între paranteze, cum îl dă `URL`; null dacă nu e un IPv6. */
function ipv6Local(gazda: string): boolean | null {
  if (!gazda.startsWith('[')) return null;
  const ip = gazda.slice(1, -1).toLowerCase();
  return ip === '::1' || /^f[cd][0-9a-f]{0,2}:/.test(ip) || /^fe[89ab][0-9a-f]?:/.test(ip);
}

/**
 * Adresa controlerului, din ce a scris omul: un IP sau un nume, cu portul opțional (altfel cel din câmp), ori un URL `ws://`
 * întreg, cu cale. Doar un IP local sau un nume `.local` (și `localhost`): browserul ar bloca restul ca conținut mixt,
 * verificând adresa înainte de DNS. `wss://` nu: niciun controler n-are TLS, iar CSP-ul aplicației nu-l deschide. Fără nume și
 * parolă în adresă (n-au ce căuta în browser).
 */
export function adresaRetea(text: string, port: number): { readonly ok: true; readonly adresa: AdresaRetea } | { readonly ok: false; readonly motiv: MotivAdresa } {
  const t = text.trim();
  if (t === '') return { ok: false, motiv: 'goala' };
  const cuSchema = /^[a-z][a-z0-9+.-]*:\/\//i.test(t);
  let u: URL;
  try {
    u = new URL(cuSchema ? t : `ws://${t}`);
  } catch {
    return { ok: false, motiv: 'invalida' };
  }
  if (u.protocol !== 'ws:') return { ok: false, motiv: 'schema' };
  if (u.hostname === '') return { ok: false, motiv: 'invalida' };
  if (u.username !== '' || u.password !== '') return { ok: false, motiv: 'cont' };
  // `URL` scoate portul implicit al schemei (80 la ws://): portul scris se citește din text.
  const autoritate = (cuSchema ? t.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '') : t).split(/[/?#]/)[0] ?? '';
  const scris = /:(\d+)$/.exec(autoritate)?.[1];
  const p = u.port !== '' ? Number(u.port) : scris !== undefined ? Number(scris) : port;
  if (!portBun(p)) return { ok: false, motiv: 'port' };
  const gazda = u.hostname;
  const local = ipv4Local(gazda) ?? ipv6Local(gazda);
  if (local === false) return { ok: false, motiv: 'publica' };
  if (local === null && !(gazda === 'localhost' || gazda.endsWith('.localhost') || gazda.endsWith('.local'))) return { ok: false, motiv: 'nume' };
  return { ok: true, adresa: { url: `ws://${gazda}:${p}${u.pathname}${u.search}`, gazda, port: p } };
}

/**
 * Mesajele de control ale controlerului, în cadre text, care nu sunt ieșirea GRBL: id-ul clientului (`CURRENT_ID:`,
 * `currentID:`, `ACTIVE_ID:`, `activeID:`) și ping-ul (`PING`, `PING:…`), ale FluidNC și ale interfețelor ESP3D. O linie GRBL
 * nu începe niciodată așa.
 */
export function esteControl(text: string): boolean {
  return /^(?:CURRENT_ID|currentID|ACTIVE_ID|activeID):/.test(text) || /^PING(?::|\s|$)/.test(text);
}

/** Ce folosim dintr-un WebSocket (probele îl înlocuiesc). */
export interface WebSocketMinim {
  binaryType: string;
  readonly readyState: number;
  send(d: Uint8Array): void;
  close(code?: number): void;
  onopen: (() => void) | null;
  onmessage: ((e: { readonly data: unknown }) => void) | null;
  onclose: ((e: { readonly code: number; readonly reason: string }) => void) | null;
  onerror: (() => void) | null;
}
export type FabricaWebSocket = (url: string, subprotocol: string | null) => WebSocketMinim;

/** Cât așteaptă deschiderea: un controler stins nu răspunde deloc (fără refuz). */
export const TIMP_DESCHIDERE_MS = 10_000;
const DESCHIS = 1;

/** Starea permisiunii rețelei locale (Chrome 147: `local-network`; înainte, `local-network-access`); null: browserul n-o știe. */
async function permisiuneRetea(): Promise<string | null> {
  for (const name of ['local-network', 'local-network-access']) {
    try {
      return (await navigator.permissions.query({ name } as unknown as PermissionDescriptor)).state;
    } catch {
      // Numele nu e cunoscut de browserul acesta: următorul.
    }
  }
  return null;
}

const creeazaImplicit: FabricaWebSocket = (url, subprotocol) =>
  (subprotocol === null ? new WebSocket(url) : new WebSocket(url, subprotocol)) as unknown as WebSocketMinim;

/**
 * Deschide WebSocket-ul spre controler; aruncă `retea-nedeschis` (fără răspuns la adresa aceea), `retea-permisiune` (omul a
 * refuzat accesul la rețeaua locală) sau `retea-timp`. Închiderea de după deschidere: `retea-cazuta` (1006, legătura pierdută,
 * WiFi-ul), `retea-inchisa:<cod>` (controlerul a închis), null (noi).
 */
export function deschideRetea(adresa: AdresaRetea, profil: ProfilRetea, opt: {
  readonly creeaza?: FabricaWebSocket;
  readonly timpMs?: number;
  readonly permisiune?: () => Promise<string | null>;
} = {}): Promise<Transport> {
  const ws = (opt.creeaza ?? creeazaImplicit)(adresa.url, PROFIL_RETEA[profil].subprotocol);
  ws.binaryType = 'arraybuffer';
  const codare = new TextEncoder();
  return new Promise((rezolva, respinge) => {
    let gata = false;
    const ceas = setTimeout(() => {
      if (gata) return;
      gata = true;
      ws.onopen = null;
      ws.onclose = null;
      ws.close(1000);
      respinge(new Error('retea-timp'));
    }, opt.timpMs ?? TIMP_DESCHIDERE_MS);
    // Înainte de deschidere, `error` sau `close` e eșecul: o conexiune oprită de browser (CSP-ul, de exemplu) dă doar `error`.
    const esec = (): void => {
      if (gata) return;
      gata = true;
      clearTimeout(ceas);
      // Un refuz al permisiunii arată ca un controler care nu răspunde; starea permisiunii le desparte.
      (opt.permisiune ?? permisiuneRetea)().then(
        (s) => { respinge(new Error(s === 'denied' ? 'retea-permisiune' : 'retea-nedeschis')); },
        () => { respinge(new Error('retea-nedeschis')); },
      );
    };
    ws.onerror = esec;
    ws.onclose = esec;
    ws.onopen = () => {
      if (gata) return;
      gata = true;
      clearTimeout(ceas);
      let inchisDeNoi = false;
      let inchis = false;
      rezolva({
        fel: 'retea',
        scrie: (o) => {
          if (inchis || ws.readyState !== DESCHIS) return Promise.reject(new Error('retea-inchisa'));
          ws.send(o);
          return Promise.resolve();
        },
        porneste(primit, laInchidere) {
          ws.onmessage = (e) => {
            const d = e.data;
            if (typeof d === 'string') {
              if (!esteControl(d)) primit(codare.encode(d));
            } else if (d instanceof ArrayBuffer) {
              primit(new Uint8Array(d));
            }
          };
          ws.onclose = (e) => {
            if (inchis) return;
            inchis = true;
            laInchidere(inchisDeNoi ? null : e.code === 1006 ? 'retea-cazuta' : `retea-inchisa:${e.code}`);
          };
        },
        inchide() {
          inchisDeNoi = true;
          if (!inchis) ws.close(1000);
          return Promise.resolve();
        },
      });
    };
  });
}
