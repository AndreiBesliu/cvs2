/**
 * Probele de rețea (ADR 0136, felia 3.6f): o încercare pe o gazdă (podul ESP3D răspunde la `[ESP800]json`, un controler GRBL
 * la `?`, singurul lucru trimis unui controler care poate lucra pentru altcineva: timpul real n-are răspuns `ok`, deci nu
 * încurcă numărătoarea altui sender), legătura cu o conexiune ținută (numele, apoi ultimul IP) și legătura cu podul pentru
 * asistent (comenzile pe rând, fiecare cu răspunsul ei). Totul trece prin transportul senderului (`deschideRetea`), cu fabrica
 * de WebSocket-uri dată de probe.
 */
import {
  COMANDA_ATELIER, COMANDA_INFO, COMANDA_RETEA_PROPRIE, COMANDA_RETELE, areRaportGrbl, infoPod, obiectEsp, raspunsEsp,
  reteleEsp410, verdictPod, type ComandaPod, type Gazda, type Incercare, type InfoPod, type ReteaVazuta,
} from './conexiuni.ts';
import type { Transport } from './sesiune.ts';
import { adresaRetea, deschideRetea, PROFIL_RETEA, TIMP_DESCHIDERE_MS, type AdresaRetea, type FabricaWebSocket, type ProfilRetea } from './websocket.ts';

export type OptiuniSonda = {
  readonly creeaza?: FabricaWebSocket;
  readonly permisiune?: () => Promise<string | null>;
  /** Cât se așteaptă deschiderea (o gazdă care nu există nu răspunde deloc). */
  readonly timpDeschidereMs?: number;
  /** Cât se așteaptă răspunsul, după deschidere. */
  readonly timpRaspunsMs?: number;
  readonly semnal?: AbortSignal;
};

/**
 * De ce n-a mers: fără răspuns la adresă (`retea-nedeschis`, `retea-timp`), permisiunea rețelei locale refuzată, ceva care se
 * deschide dar nu răspunde ca un controler (`tacut`), un pod ESP3D cu altă versiune sau altă țintă, căutarea oprită.
 */
export type MotivSonda = 'retea-nedeschis' | 'retea-permisiune' | 'retea-timp' | 'tacut' | 'versiune' | 'tinta' | 'oprit';
export type Gasit = { readonly adresa: AdresaRetea; readonly inc: Incercare; readonly pod: InfoPod | null };
export type RezultatSonda = { readonly ok: true; readonly gasit: Gasit } | { readonly ok: false; readonly motiv: MotivSonda; readonly pod?: InfoPod };

/** Un refuz al podului la o comandă (`"status":"error"`, sau alt răspuns decât `ok` la o scriere), cu textul lui. */
export class RefuzPod extends Error {
  readonly nr: number;
  readonly date: string;
  constructor(nr: number, date: string) {
    super(`refuz-pod:${nr}`);
    this.nr = nr;
    this.date = date;
  }
}

const motivDeschidere = (e: unknown): MotivSonda => {
  const m = e instanceof Error ? e.message : '';
  return m === 'retea-permisiune' || m === 'retea-timp' ? m : 'retea-nedeschis';
};

/** Transportul cu textul primit de la ultima cerere; `cere` trimite și așteaptă răspunsul. */
class Legatura {
  private text = '';
  private inchisa = false;
  private motivInchidere: string | null = null;
  private trezeste: (() => void) | null = null;
  private readonly dec = new TextDecoder();
  private readonly t: Transport;
  constructor(t: Transport) {
    this.t = t;
    t.porneste(
      (o) => { this.text += this.dec.decode(o, { stream: true }); this.trezeste?.(); },
      (m) => { this.inchisa = true; this.motivInchidere = m; this.trezeste?.(); },
    );
  }

  esteInchisa(): boolean { return this.inchisa; }

  /**
   * Golește ce venise, trimite și așteaptă până `citeste` dă ceva. Legătura închisă aruncă motivul ei (sau dă ce întoarce
   * `laInchidere`, când închiderea e răspunsul), timpul trecut aruncă `tacut`, semnalul, `oprit` (înainte de trimitere, nimic
   * nu pleacă).
   */
  cere<T>(trimis: string | Uint8Array, citeste: (text: string) => T | null, timpMs: number, semnal?: AbortSignal, laInchidere?: () => T): Promise<T> {
    this.text = '';
    return new Promise<T>((rezolva, respinge) => {
      let gata = false;
      const termina = (f: () => void): void => {
        if (gata) return;
        gata = true;
        clearTimeout(ceas);
        semnal?.removeEventListener('abort', opreste);
        this.trezeste = null;
        f();
      };
      const ceas = setTimeout(() => { termina(() => { respinge(new Error('tacut')); }); }, timpMs);
      const opreste = (): void => { termina(() => { respinge(new Error('oprit')); }); };
      const verifica = (): void => {
        const r = citeste(this.text);
        if (r !== null) { termina(() => { rezolva(r); }); return; }
        if (this.inchisa) {
          termina(() => {
            if (laInchidere) rezolva(laInchidere());
            else respinge(new Error(this.motivInchidere ?? 'retea-inchisa'));
          });
        }
      };
      if (semnal?.aborted || this.inchisa) {
        termina(() => { respinge(new Error(semnal?.aborted ? 'oprit' : 'retea-inchisa')); });
        return;
      }
      semnal?.addEventListener('abort', opreste);
      this.trezeste = verifica;
      this.t.scrie(typeof trimis === 'string' ? new TextEncoder().encode(trimis) : trimis).then(
        () => { verifica(); },
        (e: unknown) => { termina(() => { respinge(e instanceof Error ? e : new Error(String(e))); }); },
      );
    });
  }

  inchide(): Promise<void> { return this.t.inchide(); }
}

const citesteInfo = (x: string): InfoPod | null => {
  const o = obiectEsp(x, 800);
  return o ? infoPod(o) : null;
};

function deschide(adresa: AdresaRetea, profil: ProfilRetea, opt: OptiuniSonda, timpMs: number): Promise<Transport> {
  return deschideRetea(adresa, profil, {
    ...(opt.creeaza ? { creeaza: opt.creeaza } : {}),
    ...(opt.permisiune ? { permisiune: opt.permisiune } : {}),
    timpMs: opt.timpDeschidereMs ?? timpMs,
  });
}

/** O încercare pe o adresă: podul (`[ESP800]json`, judecat: versiunea 3.0, ținta GRBL) sau un controler GRBL (`?`). */
export async function sondeaza(adresa: AdresaRetea, inc: Incercare, opt: OptiuniSonda = {}): Promise<RezultatSonda> {
  if (opt.semnal?.aborted) return { ok: false, motiv: 'oprit' };
  let t: Transport;
  try {
    t = await deschide(adresa, inc.profil, opt, 5000);
  } catch (e) {
    return { ok: false, motiv: motivDeschidere(e) };
  }
  const l = new Legatura(t);
  try {
    if (inc.fel === 'grbl') {
      await l.cere(Uint8Array.of(0x3f), (x) => (areRaportGrbl(x) ? true : null), opt.timpRaspunsMs ?? 3000, opt.semnal);
      return { ok: true, gasit: { adresa, inc, pod: null } };
    }
    const pod = await l.cere(COMANDA_INFO, citesteInfo, opt.timpRaspunsMs ?? 3000, opt.semnal);
    const v = verdictPod(pod);
    return v === 'ok' ? { ok: true, gasit: { adresa, inc, pod } } : { ok: false, motiv: v, pod };
  } catch (e) {
    return { ok: false, motiv: e instanceof Error && e.message === 'oprit' ? 'oprit' : 'tacut' };
  } finally {
    await l.inchide();
  }
}

/**
 * O gazdă, cu încercările ei pe rând (podul întâi): se oprește la prima găsită, la un refuz al permisiunii (nimic altceva nu
 * mai merge) sau la un pod care răspunde, dar nu e cel potrivit (răspunsul lui contează mai mult decât terminalul de pe 81).
 */
export async function sondeazaGazda(g: Gazda, opt: OptiuniSonda = {}): Promise<RezultatSonda> {
  let ultim: RezultatSonda = { ok: false, motiv: 'retea-nedeschis' };
  for (const inc of g.incercari) {
    const a = adresaRetea(g.adresa, inc.port);
    if (!a.ok) continue;
    const r = await sondeaza(a.adresa, inc, opt);
    if (r.ok || r.motiv === 'retea-permisiune' || r.motiv === 'versiune' || r.motiv === 'tinta' || r.motiv === 'oprit') return r;
    ultim = r;
  }
  return ultim;
}

export type RezultatConexiune =
  | { readonly ok: true; readonly transport: Transport; readonly adresa: AdresaRetea; readonly pod: InfoPod | null; readonly prinIp: boolean }
  | { readonly ok: false; readonly motiv: MotivSonda; readonly pod?: InfoPod; readonly incercate: readonly string[] };

/**
 * Legătura cu o conexiune ținută (ADR 0136 §2): numele (sau adresa), apoi ultimul IP, dacă numele nu răspunde. La un pod,
 * întâi proba (versiunea, ținta, IP-ul de acum), apoi transportul senderului, deschis din nou; la un controler, direct
 * transportul. Fiecare deschidere așteaptă cât în 3.6d (10 s): după o căutare în toată rețeaua, browserul întârzie fiecare
 * WebSocket nou cu până la 5 s. Întoarce transportul nepornit: îl pornește sesiunea.
 */
export async function deschideConexiune(
  c: { readonly profil: ProfilRetea; readonly adresa: string; readonly port: number; readonly ultimIp: string | null },
  opt: OptiuniSonda = {},
): Promise<RezultatConexiune> {
  const incercate: string[] = [];
  let ultim: MotivSonda = 'retea-nedeschis';
  const adrese = [c.adresa, ...(c.ultimIp !== null && c.ultimIp.toLowerCase() !== c.adresa.toLowerCase() ? [c.ultimIp] : [])];
  for (const [k, x] of adrese.entries()) {
    const a = adresaRetea(x, c.port);
    if (!a.ok) continue;
    incercate.push(`${a.adresa.gazda}:${a.adresa.port}`);
    let pod: InfoPod | null = null;
    if (c.profil === 'esp3d') {
      const r = await sondeaza(a.adresa, { port: c.port, fel: 'esp3d', profil: 'esp3d' }, { ...opt, timpDeschidereMs: opt.timpDeschidereMs ?? TIMP_DESCHIDERE_MS });
      if (!r.ok) {
        if (r.motiv === 'retea-nedeschis' || r.motiv === 'retea-timp' || r.motiv === 'tacut') { ultim = r.motiv; continue; }
        return { ok: false, motiv: r.motiv, ...(r.pod ? { pod: r.pod } : {}), incercate };
      }
      pod = r.gasit.pod;
    }
    try {
      const transport = await deschide(a.adresa, c.profil, opt, TIMP_DESCHIDERE_MS);
      return { ok: true, transport, adresa: a.adresa, pod, prinIp: k > 0 };
    } catch (e) {
      const m = motivDeschidere(e);
      if (m === 'retea-permisiune') return { ok: false, motiv: m, incercate };
      ultim = m;
    }
  }
  return { ok: false, motiv: ultim, incercate };
}

/** Legătura cu podul ESP3D, pentru asistent (ADR 0136 §4): podul verificat, apoi comenzile, pe rând. */
export interface LegaturaPod {
  readonly adresa: AdresaRetea;
  readonly info: InfoPod;
  /** Numele rețelei proprii a podului (`[ESP105]`), dacă îl spune. */
  numeReteaProprie(): Promise<string | null>;
  /** Rețelele văzute de pod (`[ESP410]`); căutarea durează câteva secunde. */
  retele(): Promise<readonly ReteaVazuta[]>;
  /** O scriere (`[ESP106]`, `[ESP100]`, `[ESP101]`): aruncă `RefuzPod` dacă podul n-a spus `ok`. */
  seteaza(c: ComandaPod): Promise<void>;
  /**
   * Trecerea în rețeaua atelierului (`[ESP110]WIFI-STA`): podul o face pe loc, deci legătura cade (răspunsul). Fără răspuns și
   * fără căderea legăturii în câteva secunde: `necunoscut` (podul poate trece și după).
   */
  treciPeAtelier(): Promise<'ok' | 'necunoscut'>;
  inchisa(): boolean;
  inchide(): Promise<void>;
}

/** Cât așteaptă fiecare răspuns al podului (ms); probele le scurtează. */
export type TimpiPod = { readonly info: number; readonly nume: number; readonly comanda: number; readonly retele: number; readonly atelier: number };
const TIMPI_POD: TimpiPod = { info: 4000, nume: 2500, comanda: 6000, retele: 20_000, atelier: 8000 };

export async function deschidePod(adresa: AdresaRetea, opt: OptiuniSonda & { readonly timpi?: Partial<TimpiPod> } = {}): Promise<{ readonly ok: true; readonly pod: LegaturaPod } | { readonly ok: false; readonly motiv: MotivSonda; readonly info?: InfoPod }> {
  let t: Transport;
  try {
    t = await deschide(adresa, 'esp3d', opt, 8000);
  } catch (e) {
    return { ok: false, motiv: motivDeschidere(e) };
  }
  const timpi = { ...TIMPI_POD, ...opt.timpi };
  const l = new Legatura(t);
  let info: InfoPod;
  try {
    info = await l.cere(COMANDA_INFO, citesteInfo, timpi.info, opt.semnal);
  } catch (e) {
    await l.inchide();
    return { ok: false, motiv: e instanceof Error && e.message === 'oprit' ? 'oprit' : 'tacut' };
  }
  const v = verdictPod(info);
  if (v !== 'ok') {
    await l.inchide();
    return { ok: false, motiv: v, info };
  }
  const pod: LegaturaPod = {
    adresa,
    info,
    async numeReteaProprie() {
      try {
        const r = await l.cere(COMANDA_RETEA_PROPRIE, (x) => raspunsEsp(x, 105), timpi.nume);
        return r.ok && r.date !== '' ? r.date : null;
      } catch {
        return null;
      }
    },
    retele: () => l.cere(COMANDA_RETELE, reteleEsp410, timpi.retele),
    async seteaza(c) {
      const r = await l.cere(c.text, (x) => raspunsEsp(x, c.nr), timpi.comanda);
      if (!r.ok || r.date !== 'ok') throw new RefuzPod(c.nr, r.date);
    },
    async treciPeAtelier() {
      try {
        const r = await l.cere(COMANDA_ATELIER, (x) => raspunsEsp(x, 110), timpi.atelier, undefined, () => ({ ok: true, date: 'ok' }));
        if (!r.ok) throw new RefuzPod(110, r.date);
        return 'ok';
      } catch (e) {
        if (e instanceof RefuzPod) throw e;
        if (e instanceof Error && e.message === 'tacut') return 'necunoscut';
        // Legătura căzută înainte de trimitere (podul a trecut deja): tot trecerea.
        return 'ok';
      }
    },
    inchisa: () => l.esteInchisa(),
    inchide: () => l.inchide(),
  };
  return { ok: true, pod };
}

/** Adresa podului în rețeaua lui (pasul 1 al asistentului): 192.168.0.1, portul de date 8282. */
export const ADRESA_POD_NOU = `192.168.0.1:${PROFIL_RETEA.esp3d.port}`;
