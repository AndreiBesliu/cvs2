/**
 * Conectarea prin WiFi, mai ușoară (ADR 0136, felia 3.6f): partea pură.
 *
 * - **Conexiunile ținute** în browser, fiecare cu rețeaua ei (§1): omul alege la care se leagă, fereastra nu se conectează
 *   singură. Alegerile din 3.6d (`v: 1`) devin prima conexiune și rămân în formularul „Altă adresă…”.
 * - **Comenzile podului ESP3D 3.0.2** (§4): valorile cu escape-urile lui (`get_clean_param`: `\` în fața spațiului și a lui
 *   `\`), refuzate când podul le-ar citi altfel (`json`, `json=…`, `pwd=…`, `NOPASSWORD`) sau le-ar respinge (lungimea, un
 *   caracter în afara ASCII-ului tipăribil).
 * - **Cititorii răspunsurilor lui:** `[ESP800]json` (capul, perechile și coada pleacă separat, fără capăt de linie, deci o linie
 *   GRBL poate ajunge între ele), răspunsurile scurte (`{"cmd":…}` cu capăt de linie, ghilimelele din date nescrise cu `\`) și
 *   lista rețelelor (`[ESP410]` simplu, o rețea pe linie).
 * - **Căutarea** (§2): gazdele încercate (conexiunile ținute, numele obișnuite ale controlerelor, rețeaua proprie a podului) și,
 *   la cerere, o rețea /24 întreagă, cu un număr fix de încercări deodată; prima găsită oprește restul.
 */
import { esteProfilRetea, PROFIL_RETEA, type ProfilRetea } from './websocket.ts';

// —— Conexiunile ținute ——

/** Cheia din `localStorage` (aceeași din 3.6d; `v: 2` de la 3.6f). */
export const CHEIE_CONEXIUNI = 'cncvs2.masina.retea';
/** Câte conexiuni rămân (cele folosite mai demult cad primele). */
export const MAX_CONEXIUNI = 8;

/**
 * Pe unde ajunge calculatorul la mașină: prin rețeaua atelierului (după nume sau IP), direct, prin rețeaua proprie a mașinii
 * (a podului ESP3D, de exemplu, la 192.168.0.1), sau la o adresă scrisă de mână.
 */
export type DrumRetea = 'atelier' | 'proprie' | 'adresa';
const DRUMURI: readonly DrumRetea[] = ['atelier', 'proprie', 'adresa'];

export type ConexiuneTinuta = {
  readonly id: string;
  readonly profil: ProfilRetea;
  /** Numele (`.local`) sau IP-ul, fără port. */
  readonly adresa: string;
  readonly port: number;
  readonly drum: DrumRetea;
  /** Numele rețelei (SSID-ul), când se știe: cea aleasă în asistent sau rețeaua proprie a podului. */
  readonly retea: string | null;
  /** Ultimul IP văzut al unui nume: rezerva pentru un calculator care nu rezolvă `.local`. */
  readonly ultimIp: string | null;
  /** Ultima folosire (ms), pentru ordine. */
  readonly folosita: number;
};
export type FormularRetea = { readonly profil: ProfilRetea; readonly adresa: string; readonly port: number };
export type ConexiuniTinute = { readonly conexiuni: readonly ConexiuneTinuta[]; readonly formular: FormularRetea | null };
export type ConexiuneNoua = Omit<ConexiuneTinuta, 'id' | 'folosita' | 'retea' | 'ultimIp'> & {
  readonly retea?: string | null;
  readonly ultimIp?: string | null;
};

export const NICIUNA: ConexiuniTinute = { conexiuni: [], formular: null };

export const idConexiune = (profil: ProfilRetea, adresa: string, port: number): string => `${profil}|${adresa.trim().toLowerCase()}|${port}`;

const portBun = (p: unknown): p is number => typeof p === 'number' && Number.isInteger(p) && p >= 1 && p <= 65535;
const textSauNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

function conexiuneCitita(x: unknown): ConexiuneTinuta | null {
  if (typeof x !== 'object' || x === null) return null;
  const d = x as Record<string, unknown>;
  const { profil, adresa, port, drum, folosita } = d;
  if (!esteProfilRetea(profil) || typeof adresa !== 'string' || adresa.trim() === '' || !portBun(port)) return null;
  if (!DRUMURI.includes(drum as DrumRetea)) return null;
  return {
    id: idConexiune(profil, adresa, port),
    profil,
    adresa: adresa.trim(),
    port,
    drum: drum as DrumRetea,
    retea: textSauNull(d['retea']),
    ultimIp: textSauNull(d['ultimIp']),
    folosita: typeof folosita === 'number' && Number.isFinite(folosita) ? folosita : 0,
  };
}

function formularCitit(x: unknown): FormularRetea | null {
  if (typeof x !== 'object' || x === null) return null;
  const { profil, adresa, port } = x as Record<string, unknown>;
  return esteProfilRetea(profil) && typeof adresa === 'string' && portBun(port) ? { profil, adresa, port } : null;
}

const ordonate = (l: readonly ConexiuneTinuta[]): ConexiuneTinuta[] => [...l].sort((a, b) => b.folosita - a.folosita).slice(0, MAX_CONEXIUNI);

/**
 * Conexiunile din textul ținut: `v: 2`, sau alegerile din 3.6d (`v: 1`: controlerul, adresa scrisă, portul), care devin
 * formularul și, cu o adresă, prima conexiune. Ce nu se poate citi se lasă deoparte, fără eroare.
 */
export function citesteConexiuni(text: string | null): ConexiuniTinute {
  let x: unknown;
  try {
    x = JSON.parse(text ?? 'null');
  } catch {
    return NICIUNA;
  }
  if (typeof x !== 'object' || x === null) return NICIUNA;
  const d = x as Record<string, unknown>;
  if (d['v'] === 1) {
    const f = formularCitit(d);
    if (!f) return NICIUNA;
    const c = f.adresa.trim() === '' ? null : conexiuneCitita({ ...f, drum: 'adresa', folosita: 0 });
    return { conexiuni: c ? [c] : [], formular: f };
  }
  if (d['v'] !== 2) return NICIUNA;
  const lista = Array.isArray(d['conexiuni']) ? d['conexiuni'].map(conexiuneCitita).filter((c): c is ConexiuneTinuta => c !== null) : [];
  // Două intrări cu același id (o stocare scrisă de mână): rămâne cea folosită mai recent.
  const unice = new Map<string, ConexiuneTinuta>();
  for (const c of [...lista].sort((a, b) => b.folosita - a.folosita)) if (!unice.has(c.id)) unice.set(c.id, c);
  return { conexiuni: ordonate([...unice.values()]), formular: formularCitit(d['formular']) };
}

export const scrieConexiuni = (s: ConexiuniTinute): string => JSON.stringify({
  v: 2,
  conexiuni: s.conexiuni.map(({ profil, adresa, port, drum, retea, ultimIp, folosita }) => ({ profil, adresa, port, drum, retea, ultimIp, folosita })),
  formular: s.formular,
});

/**
 * O conexiune reușită, ținută (prima în listă): una cu același controler, adresă și port se actualizează. Ce se știa și nu
 * se mai spune acum (rețeaua, ultimul IP) rămâne; o adresă scrisă de mână nu schimbă drumul unei conexiuni știute.
 */
export function tineConexiune(s: ConexiuniTinute, c: ConexiuneNoua, acum: number): ConexiuniTinute {
  const id = idConexiune(c.profil, c.adresa, c.port);
  const veche = s.conexiuni.find((x) => x.id === id);
  const noua: ConexiuneTinuta = {
    id,
    profil: c.profil,
    adresa: c.adresa.trim(),
    port: c.port,
    drum: veche && c.drum === 'adresa' ? veche.drum : c.drum,
    retea: c.retea ?? veche?.retea ?? null,
    ultimIp: c.ultimIp ?? veche?.ultimIp ?? null,
    folosita: Math.max(acum, (s.conexiuni[0]?.folosita ?? 0) + 1),
  };
  return { ...s, conexiuni: ordonate([noua, ...s.conexiuni.filter((x) => x.id !== id)]) };
}

export const uitaConexiune = (s: ConexiuniTinute, id: string): ConexiuniTinute => ({ ...s, conexiuni: s.conexiuni.filter((x) => x.id !== id) });

export const cuFormular = (s: ConexiuniTinute, f: FormularRetea): ConexiuniTinute => ({ ...s, formular: f });

/** IPv4 scris ca atare (patru numere 0–255), fără port. */
export function esteIpv4(text: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  return m !== null && m.slice(1).every((x) => Number(x) <= 255);
}

// —— Podul ESP3D: comenzile ——

/** Escape-urile podului (`get_clean_param`): `\` în fața fiecărui spațiu și a fiecărui `\`. */
export const cuEscape = (valoare: string): string => valoare.replace(/[\s\\]/g, (c) => `\\${c}`);

/** Comanda podului, cu răspunsul în JSON (`json`) și capătul de linie (podul se oprește la primul spațiu alb nescris cu `\`). */
export const comandaEsp = (nr: number, valoare = ''): string => `[ESP${nr}]${valoare} json\n`;

export type MotivValoare = 'goala' | 'scurta' | 'lunga' | 'caractere' | 'rezervata';
/** ASCII-ul tipăribil: podul (`isPrintableChar`) refuză restul, iar un SSID cu diacritice nu se scrie la fel peste tot. */
const TIPARIBIL = /^[\x20-\x7e]*$/;
/** Ce scoate podul din parametri înainte de valoare (`get_clean_param`): valoarea ar ajunge goală, deci citire. */
const rezervata = (v: string): boolean => v === 'json' || v.startsWith('json=') || v.startsWith('pwd=');

/** Numele rețelei (SSID-ul): 1–32 de caractere tipăribile. */
export function motivRetea(ssid: string): MotivValoare | null {
  if (ssid.length === 0) return 'goala';
  if (!TIPARIBIL.test(ssid)) return 'caractere';
  if (ssid.length > 32) return 'lunga';
  return rezervata(ssid) ? 'rezervata' : null;
}

/** O parolă WiFi (a atelierului sau a rețelei proprii a podului): 8–64 de caractere tipăribile; `NOPASSWORD` ar însemna fără. */
export function motivParola(parola: string): MotivValoare | null {
  if (parola.length === 0) return 'goala';
  if (!TIPARIBIL.test(parola)) return 'caractere';
  if (parola.length < 8) return 'scurta';
  if (parola.length > 64) return 'lunga';
  return rezervata(parola) || parola === 'NOPASSWORD' ? 'rezervata' : null;
}

export type CampPod = 'retea' | 'parola' | 'parola-pod';
export type ComandaPod = { readonly nr: number; readonly text: string };

/**
 * Comenzile care pun podul în rețeaua atelierului (ADR 0136 §4), în ordinea lor: parola nouă a rețelei proprii a podului
 * (`[ESP106]`: în ea se întoarce dacă nu se poate lega, iar cea din fabrică e publică), rețeaua (`[ESP100]`), parola ei
 * (`[ESP101]`; o rețea liberă, `NOPASSWORD`). Trecerea în rețeaua atelierului (`[ESP110]WIFI-STA`) vine după ele, separat:
 * legătura cade atunci.
 */
export function comenziPod(c: { readonly retea: string; readonly parola: string | null; readonly parolaPod: string }):
  { readonly ok: true; readonly comenzi: readonly ComandaPod[] } | { readonly ok: false; readonly camp: CampPod; readonly motiv: MotivValoare } {
  const mr = motivRetea(c.retea);
  if (mr) return { ok: false, camp: 'retea', motiv: mr };
  const mp = c.parola === null ? null : motivParola(c.parola);
  if (mp) return { ok: false, camp: 'parola', motiv: mp };
  const mpp = motivParola(c.parolaPod);
  if (mpp) return { ok: false, camp: 'parola-pod', motiv: mpp };
  return {
    ok: true,
    comenzi: [
      { nr: 106, text: comandaEsp(106, cuEscape(c.parolaPod)) },
      { nr: 100, text: comandaEsp(100, cuEscape(c.retea)) },
      { nr: 101, text: comandaEsp(101, c.parola === null ? 'NOPASSWORD' : cuEscape(c.parola)) },
    ],
  };
}

export const COMANDA_INFO = comandaEsp(800);
export const COMANDA_RETEA_PROPRIE = comandaEsp(105);
/** Lista rețelelor, fără `json`: o rețea pe linie, deci o linie GRBL ajunsă între ele nu strică nimic. */
export const COMANDA_RETELE = '[ESP410]\n';
export const COMANDA_ATELIER = comandaEsp(110, 'WIFI-STA');

// —— Podul ESP3D: răspunsurile ——

/** Un răspuns scurt al podului (`dispatchAnswer`): starea și datele (fără ghilimelele de pe margini; cele dinăuntru, ca atare). */
export type RaspunsEsp = { readonly ok: boolean; readonly date: string };

/**
 * Răspunsul la comanda `nr`, dacă a venit: o linie întreagă `{"cmd":"nr","status":"ok"|"error","data":…}`. Podul nu scrie cu
 * `\` ghilimelele din date (un SSID cu `"`), deci linia se citește după formă, nu cu `JSON.parse`.
 */
export function raspunsEsp(text: string, nr: number): RaspunsEsp | null {
  for (const linie of text.split('\n')) {
    const m = /^\{"cmd":"(\d+)","status":"(ok|error)","data":(.*)\}\r?$/.exec(linie);
    if (!m || Number(m[1]) !== nr) continue;
    const date = m[3] ?? '';
    return { ok: m[2] === 'ok', date: date.length >= 2 && date.startsWith('"') && date.endsWith('"') ? date.slice(1, -1) : date };
  }
  return null;
}

/**
 * Obiectul JSON al comenzii `nr` (`{"cmd":"nr",…}`), dacă a venit întreg; liniile străine ajunse între perechile lui (ieșirea
 * GRBL, care se termină cu capăt de linie) se sar. Un răspuns care nu se poate citi (ghilimele nescrise cu `\`) dă null.
 */
export function obiectEsp(text: string, nr: number): Record<string, unknown> | null {
  const start = text.indexOf(`{"cmd":"${nr}"`);
  if (start < 0) return null;
  let curat = '';
  let i = start;
  // Adâncimea obiectelor; între membri (după `{` sau după o valoare) poate veni o linie străină, până la capătul ei.
  let adancime = 0;
  let intreMembri = false;
  while (i < text.length) {
    const c = text[i] ?? '';
    if (intreMembri && !/[\s",}]/.test(c)) {
      const capat = text.indexOf('\n', i);
      if (capat < 0) return null;
      i = capat + 1;
      continue;
    }
    if (c === '"') {
      // Un șir întreg (cu `\` ca escape), fără capăt de linie înăuntru.
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') j++;
        if (text[j] === '\n') return null;
        j++;
      }
      if (j >= text.length) return null;
      curat += text.slice(i, j + 1);
      i = j + 1;
      // După o cheie vine `:`; după o valoare, alt membru sau capătul obiectului.
      intreMembri = /^\s*:/.test(text.slice(i, i + 8)) ? false : true;
      continue;
    }
    curat += c;
    i++;
    if (c === '{') { adancime++; intreMembri = true; }
    else if (c === '}') {
      adancime--;
      intreMembri = true;
      if (adancime === 0) break;
    } else if (c === ',') intreMembri = true;
    else if (c === ':') intreMembri = false;
    else if (!/\s/.test(c)) {
      // O valoare care nu e șir (un număr, true): după ea, alt membru.
      while (i < text.length && /[0-9a-zA-Z.+-]/.test(text[i] ?? '')) curat += text[i++];
      intreMembri = true;
    }
  }
  if (adancime !== 0) return null;
  try {
    const o: unknown = JSON.parse(curat);
    return typeof o === 'object' && o !== null && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Ce spune podul despre el (`[ESP800]json`): versiunea, ținta, numele din rețea, IP-ul, modul WiFi. */
export type InfoPod = {
  readonly versiune: string;
  readonly tinta: string;
  readonly nume: string | null;
  readonly ip: string | null;
  readonly mod: 'AP' | 'STA' | null;
};

export function infoPod(o: Record<string, unknown>): InfoPod | null {
  const d = o['data'];
  if (o['status'] !== 'ok' || typeof d !== 'object' || d === null) return null;
  const x = d as Record<string, unknown>;
  const text = (k: string): string | null => (typeof x[k] === 'string' && x[k] !== '' ? (x[k] as string) : null);
  const versiune = text('FWVersion');
  if (versiune === null) return null;
  const ip = text('WebSocketIP');
  const mod = text('WiFiMode');
  return {
    versiune,
    tinta: (text('FWTarget') ?? '').toLowerCase(),
    nume: text('Hostname')?.toLowerCase() ?? null,
    ip: ip !== null && esteIpv4(ip) ? ip : null,
    mod: mod === 'AP' || mod === 'STA' ? mod : null,
  };
}

/**
 * Podul cu care lucrează aplicația (ADR 0119): ESP3D 3.0 (3.1 are alt socket de date) cu ținta GRBL (grblHAL trece la fel:
 * timpul real ajunge imediat). Altfel, motivul.
 */
export function verdictPod(i: InfoPod): 'ok' | 'versiune' | 'tinta' {
  if (!/^3\.0(?:\.|$)/.test(i.versiune)) return 'versiune';
  return i.tinta === 'grbl' || i.tinta === 'grblhal' ? 'ok' : 'tinta';
}

/** Numele pe care podul îl are în rețeaua atelierului (`<nume>.local`), din răspunsul lui; implicit `esp3d.local`. */
export const numeLocal = (i: InfoPod | null): string => `${i?.nume && /^[a-z0-9-]{1,63}$/.test(i.nume) ? i.nume : 'esp3d'}.local`;

/** O rețea văzută de pod (`[ESP410]`): numele, semnalul (0–100) și dacă cere parolă. */
export type ReteaVazuta = { readonly ssid: string; readonly semnal: number; readonly protejata: boolean };

/**
 * Lista rețelelor (`[ESP410]` simplu: „Start Scan”, câte o linie `SSID⇥semnal%⇥Open|Secure`, „End Scan”), dacă a venit
 * întreagă: fiecare nume o dată (cu semnalul cel mai bun), cele mai puternice întâi; o rețea ascunsă (fără nume) se sare.
 */
export function reteleEsp410(text: string): readonly ReteaVazuta[] | null {
  const linii = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const start = linii.indexOf('Start Scan');
  if (start < 0) return null;
  const capat = linii.indexOf('End Scan', start + 1);
  if (capat < 0) return null;
  const dupaNume = new Map<string, ReteaVazuta>();
  for (const l of linii.slice(start + 1, capat)) {
    const m = /^(.*)\t(\d{1,3})%\t(Open|Secure)$/.exec(l);
    if (!m || m[1] === '' || m[1] === undefined) continue;
    const r: ReteaVazuta = { ssid: m[1], semnal: Math.min(100, Number(m[2])), protejata: m[3] === 'Secure' };
    const veche = dupaNume.get(r.ssid);
    if (!veche || r.semnal > veche.semnal) dupaNume.set(r.ssid, r);
  }
  return [...dupaNume.values()].sort((a, b) => b.semnal - a.semnal || a.ssid.localeCompare(b.ssid));
}

/** Un raport de stare GRBL (`<Idle|…>`): un controler care răspunde la `?`. */
export const areRaportGrbl = (text: string): boolean => /<[A-Z][a-z]+[|:>]/.test(text);

// —— Căutarea ——

/** O încercare pe o gazdă: portul și proba (podul ESP3D răspunde la `[ESP800]`, un controler GRBL la `?`). */
export type Incercare = { readonly port: number; readonly fel: 'esp3d' | 'grbl'; readonly profil: ProfilRetea };
export type Gazda = { readonly adresa: string; readonly incercari: readonly Incercare[] };

const incercarePentru = (profil: ProfilRetea, port: number): Incercare => ({ port, fel: profil === 'esp3d' ? 'esp3d' : 'grbl', profil });
/** Podul ESP3D, pe portul lui de date. */
export const INCERCARE_POD: Incercare = incercarePentru('esp3d', PROFIL_RETEA.esp3d.port);
/** Un controler GRBL pe 81 (FluidNC și grblHAL se leagă la fel; numele lui nu se știe dintr-un IP). */
export const INCERCARE_81: Incercare = incercarePentru('fluidnc', PROFIL_RETEA.fluidnc.port);
const POD = INCERCARE_POD;
const PORT_81 = INCERCARE_81;

/** Rețeaua proprie a podului ESP3D (și a FluidNC-ului fără rețea): mașina e la 192.168.0.1. */
export const IP_RETEA_PROPRIE = '192.168.0.1';

/**
 * Gazdele încercate de „Caută mașina” (ADR 0136 §2), deodată: ale conexiunilor ținute (numele, apoi ultimul IP), numele
 * obișnuite ale controlerelor și rețeaua proprie a podului. Pe aceeași gazdă, încercările merg pe rând (podul întâi): un pod
 * ESP3D are pe 81 și terminalul paginii lui, care ar răspunde ca un controler.
 */
export function gazdeCautare(conexiuni: readonly ConexiuneTinuta[]): readonly Gazda[] {
  const gazde = new Map<string, Incercare[]>();
  const adauga = (adresa: string, inc: Incercare): void => {
    const cheie = adresa.toLowerCase();
    const l = gazde.get(cheie) ?? [];
    if (!l.some((x) => x.port === inc.port && x.fel === inc.fel)) l.push(inc);
    gazde.set(cheie, l);
  };
  for (const c of conexiuni) adauga(c.adresa, incercarePentru(c.profil, c.port));
  for (const c of conexiuni) if (c.ultimIp) adauga(c.ultimIp, incercarePentru(c.profil, c.port));
  adauga('esp3d.local', POD);
  adauga('fluidnc.local', incercarePentru('fluidnc', PROFIL_RETEA.fluidnc.port));
  adauga('grblhal.local', incercarePentru('grblhal', PROFIL_RETEA.grblhal.port));
  adauga(IP_RETEA_PROPRIE, POD);
  adauga(IP_RETEA_PROPRIE, PORT_81);
  return [...gazde].map(([adresa, incercari]) => ({ adresa, incercari: [...incercari].sort((a, b) => Number(b.fel === 'esp3d') - Number(a.fel === 'esp3d')) }));
}

/**
 * Rețelele /24 căutate de „Caută în toată rețeaua” (ADR 0136 §2): ale IP-urilor știute (conexiunile ținute), altfel cele mai
 * obișnuite rețele de acasă și de atelier (192.168.0.x, 192.168.1.x). Pagina nu știe rețeaua calculatorului.
 */
export function reteleDeCautat(conexiuni: readonly ConexiuneTinuta[]): readonly string[] {
  const prefixe: string[] = [];
  for (const c of conexiuni) {
    for (const ip of [c.adresa, c.ultimIp]) {
      if (ip === null || !esteIpv4(ip) || ip === IP_RETEA_PROPRIE) continue;
      const p = ip.split('.').slice(0, 3).join('.');
      if (!prefixe.includes(p)) prefixe.push(p);
    }
  }
  return prefixe.length > 0 ? prefixe : ['192.168.0', '192.168.1'];
}

/**
 * Gazdele unei rețele /24 (1–254), cu o singură încercare. Căutarea în toată rețeaua trece de două ori: întâi podul (8282) pe
 * toate, apoi portul 81, deci pe fiecare gazdă podul tot întâi.
 */
export const gazdeRetea = (prefix: string, inc: Incercare): readonly Gazda[] => Array.from({ length: 254 }, (_, k) => ({ adresa: `${prefix}.${k + 1}`, incercari: [inc] }));

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
