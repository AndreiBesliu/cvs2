/**
 * Rețeaua locală, comună senderului prin WiFi (ADR 0119, 0136) și imprimantei (ADR 0190): adresa unui dispozitiv din rețeaua
 * locală, judecată înainte de conectare (browserul lasă un `ws://` dintr-o pagină HTTPS doar spre un IP local scris ca atare sau
 * spre un nume `.local`, după permisiunea rețelei locale), starea acelei permisiuni și planificatorul căutării în toată rețeaua.
 * Stă separat ca imprimanta să le folosească fără transportul senderului și fără conexiunile mașinilor (`websocket.ts`,
 * `conexiuni.ts`, care le reexportă).
 */

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

/** Cât așteaptă deschiderea: un controler stins nu răspunde deloc (fără refuz). */
export const TIMP_DESCHIDERE_MS = 10_000;

/** Starea permisiunii rețelei locale (Chrome 147: `local-network`; înainte, `local-network-access`); null: browserul n-o știe. */
export async function permisiuneRetea(): Promise<string | null> {
  for (const name of ['local-network', 'local-network-access']) {
    try {
      return (await navigator.permissions.query({ name } as unknown as PermissionDescriptor)).state;
    } catch {
      // Numele nu e cunoscut de browserul acesta: următorul.
    }
  }
  return null;
}

/** IPv4 scris ca atare (patru numere 0–255), fără port. */
export function esteIpv4(text: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  return m !== null && m.slice(1).every((x) => Number(x) <= 255);
}

/**
 * Câte gazde se încearcă deodată la căutarea în toată rețeaua. Chrome întârzie fiecare WebSocket nou al paginii cu 1–5 s după
 * multe încercări fără răspuns (`WebSocketPerProcessThrottler`: rand(1000, 5000) · 2^min(p + f / (s + 1), 16) / 65536 ms, cu
 * p încercările în curs, f cele căzute și s cele reușite din ultimele 2–4 minute), iar întârzierile curg în paralel.
 */
export const CONCURENTA_RETEA = 32;
/**
 * Cât așteaptă deschiderea unei încercări la căutarea în toată rețeaua: întârzierea browserului (cel mult 5 s), apoi o gazdă
 * care nu există (în rețeaua locală, ARP-ul fără răspuns cade în ~3 s), cu o marjă.
 */
export const TIMP_DESCHIDERE_RETEA_MS = 9000;

/**
 * Încearcă `n` lucruri, cel mult `concurenta` deodată, și se oprește la primul care dă ceva (celelalte primesc semnalul de
 * oprire). O încercare care aruncă e una fără rezultat. Oprirea din afară (`semnal`) dă null; `laProgres` primește câte s-au
 * terminat.
 */
export function primulGasit<T>(
  n: number,
  incearca: (i: number, semnal: AbortSignal) => Promise<T | null>,
  opt: { readonly concurenta: number; readonly semnal?: AbortSignal; readonly laProgres?: (terminate: number) => void },
): Promise<{ readonly i: number; readonly rezultat: T } | null> {
  const oprire = new AbortController();
  return new Promise((rezolva) => {
    let urm = 0;
    let terminate = 0;
    let gata = false;
    const incheie = (r: { readonly i: number; readonly rezultat: T } | null): void => {
      if (gata) return;
      gata = true;
      opt.semnal?.removeEventListener('abort', dinAfara);
      oprire.abort();
      rezolva(r);
    };
    const dinAfara = (): void => { incheie(null); };
    if (opt.semnal?.aborted) { incheie(null); return; }
    opt.semnal?.addEventListener('abort', dinAfara);
    const porneste = (): void => {
      if (gata) return;
      if (urm >= n) {
        if (terminate === n) incheie(null);
        return;
      }
      const i = urm++;
      void Promise.resolve().then(() => incearca(i, oprire.signal)).then((r) => r, () => null).then((r) => {
        if (gata) return;
        terminate++;
        opt.laProgres?.(terminate);
        if (r !== null) { incheie({ i, rezultat: r }); return; }
        porneste();
      });
    };
    if (n === 0) { incheie(null); return; }
    for (let k = 0; k < Math.max(1, opt.concurenta) && k < n; k++) porneste();
  });
}
