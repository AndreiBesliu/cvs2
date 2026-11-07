/**
 * Transportul prin rețea (ADR 0119, felia 3.6d): un WebSocket spre controlerul din rețeaua locală, lângă portul Web Serial
 * (`serial.ts`), peste același flux (numărarea caracterelor, ADR 0080). Aplicația e pe HTTPS: browserul (Chrome și Edge, de la
 * 147) lasă un `ws://` doar spre un IP local scris ca atare sau spre un nume `.local`, după permisiunea rețelei locale, deci
 * adresa se judecă înainte de conectare (`adresaRetea`). Cadrele primite, text sau binare, devin octeți pentru sesiune, fără
 * mesajele de control ale controlerului; fiecare scriere a sesiunii pleacă într-un cadru binar al ei (timpul real, singur).
 */
import { permisiuneRetea, TIMP_DESCHIDERE_MS, type AdresaRetea } from './reteaLocala.ts';
import type { Transport } from './sesiune.ts';

// Adresa locală și permisiunea stau în `reteaLocala.ts` (ADR 0190 §G), comune cu imprimanta; importatorii vechi le iau tot de aici.
export { adresaRetea, permisiuneRetea, TIMP_DESCHIDERE_MS, type AdresaRetea, type MotivAdresa } from './reteaLocala.ts';

/**
 * Profilurile controlerelor (ADR 0119 §3): portul implicit, subprotocolul WebSocket-ului și dacă cadrele text sunt doar
 * controlul controlerului (ieșirea GRBL venind binar), deci se aruncă toate.
 */
export const PROFILURI_RETEA = ['fluidnc', 'grblhal', 'esp3d'] as const;
export type ProfilRetea = (typeof PROFILURI_RETEA)[number];
export const PROFIL_RETEA: Readonly<Record<ProfilRetea, { readonly port: number; readonly subprotocol: string | null; readonly textDoarControl: boolean }>> = {
  // FluidNC: portul web + 1; grblHAL: `$307`, implicit 81; textul lor necunoscut rămâne date (după filtrul controlului).
  fluidnc: { port: 81, subprotocol: null, textDoarControl: false },
  grblhal: { port: 81, subprotocol: null, textDoarControl: false },
  // Podul ESP3D 3.0 (sursa lui, ramura 3.0: `DEFAULT_WEBSOCKET_PORT "8282"`, `websocket_data_server("arduino", …)`): ieșirea
  // serială pleacă binar (`broadcastBIN`), iar textul e controlul și jurnalul lui (`pushMSG`), care ar putea cădea în mijlocul
  // unei linii GRBL.
  esp3d: { port: 8282, subprotocol: 'arduino', textDoarControl: true },
};

export function esteProfilRetea(x: unknown): x is ProfilRetea {
  return (PROFILURI_RETEA as readonly unknown[]).includes(x);
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

/** Starea `OPEN` a unui WebSocket. */
const DESCHIS = 1;

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
  const { subprotocol, textDoarControl } = PROFIL_RETEA[profil];
  const ws = (opt.creeaza ?? creeazaImplicit)(adresa.url, subprotocol);
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
              if (!textDoarControl && !esteControl(d)) primit(codare.encode(d));
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
