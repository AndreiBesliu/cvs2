/**
 * Fluxul senderului (ADR 0080, T20) ca mașină de stare pură: `pas(stare, eveniment)` întoarce starea nouă și ce e de făcut
 * (octeți de scris, răspunsuri de dat), fără port, fără timp, fără promisiuni. Regulile din `docs/PORTARE.md` §3.4:
 * 1. o linie costă octeții ei + 1; neconfirmați stau cel mult cât bufferul controlerului (128 la GRBL);
 * 2. `ok` și `error:N` se potrivesc în ordine; răspunsul unei comenzi manuale (cu datele dinaintea lui) se leagă de ea;
 * 3. `error:N` pe o linie a programului: hold (`!`) și flux suspendat, nu terminat; reluarea continuă de la prima linie netrimisă;
 * 4. ALARM, Ctrl-X și bannerul de repornire golesc bufferul: punctul de reluare e pierdut, reluarea se refuză;
 * 5. lucrarea e terminată doar după ultimul `ok` și un raport Idle venit după el (hold-ul eliberat);
 * 6. `M0`, `M1`, `M6` nu pleacă la controler: fluxul se oprește în fața lor, așteaptă confirmarea a tot ce a plecat și Idle, la
 *    schimbarea sculei trimite `M5`; barierele vecine sunt o singură oprire;
 * 7. citirile `$#`, `$$`, `$G`, `$I`, `$N` pleacă doar când nicio comandă nu mai așteaptă răspuns și ultimul raport, venit după
 *    ultimul răspuns, e Idle;
 * 8. `Hold:0` diferă de `Hold:1` (rapoartele le citesc separat, `raspunsuri.ts`);
 * 9. octeții de timp real (`?`, `!`, `~`, Ctrl-X) ocolesc bufferul și nu intră în socoteală;
 * 11. WCS-ul e obligatoriu (îl cere încărcarea, `program.ts`).
 * Faza spune un singur lucru (în ediția întâi, `streaming` avea două înțelesuri, `LECTII.md` §2.2).
 */
import { grupBariere, LUNGIME_MAXIMA_LINIE, linieCurata, type ProgramIncarcat } from './program.ts';
import { citesteRaspuns, type Raport } from './raspunsuri.ts';

export type Faza =
  /** Niciun program încărcat. */
  | 'liber'
  /** Program încărcat, netrimis. */
  | 'pregatit'
  /** Fluxul umple bufferul. */
  | 'trimite'
  /** `error:N` pe o linie a programului: hold trimis; așteaptă „reia” (regula 3). */
  | 'suspendat'
  /** În fața unei bariere: așteaptă confirmarea a tot ce a plecat și Idle (regula 6). */
  | 'golire'
  /** Oprit la barieră (axul oprit, la schimbarea sculei): jog, palpare, zero, apoi „continuă”. */
  | 'bariera'
  /** Tot programul a plecat: așteaptă ultimele răspunsuri și Idle (regula 5). */
  | 'terminare'
  | 'terminat'
  /** Bufferul s-a golit (ALARM, Ctrl-X, repornirea): punctul de reluare e pierdut (regula 4). */
  | 'pierdut';

type Sursa = { readonly tip: 'program'; readonly linie: number } | { readonly tip: 'manual'; readonly id: string };
type InZbor = { readonly cost: number; readonly sursa: Sursa; readonly date: readonly string[] };
export type ComandaManuala = { readonly id: string; readonly text: string };
export type StareBariera = { readonly linie: number; readonly ultima: number; readonly m6: boolean; readonly ax: 'de-oprit' | 'trimis' | 'oprit' };

export type StareFlux = {
  /** Octeții bufferului controlerului (din contract; 128 la GRBL 1.1). */
  readonly capacitate: number;
  readonly program: ProgramIncarcat | null;
  readonly faza: Faza;
  /** Prima linie a programului netrimisă. */
  readonly urm: number;
  /** Ce a plecat și n-a primit încă răspuns, în ordine. */
  readonly inZbor: readonly InZbor[];
  readonly suma: number;
  readonly raport: Raport | null;
  /** A venit un raport după ultimul răspuns (`ok` / `error`): un Idle de dinainte nu dovedește nimic. */
  readonly proaspat: boolean;
  /** Ultimul `WCO` primit (GRBL îl trimite din când în când). */
  readonly wco: readonly number[] | null;
  readonly erori: readonly { readonly linie: number; readonly cod: number }[];
  /** Comenzile manuale care încă n-au plecat. */
  readonly coada: readonly ComandaManuala[];
  readonly bariera: StareBariera | null;
  /** De ce s-a pierdut fluxul (`ALARM:N`, `repornire`, `oprit`). */
  readonly motiv: string | null;
  /** Răspunsuri `ok` / `error` venite fără nimic în zbor (după o repornire, de exemplu). */
  readonly necorelate: number;
};

export type Eveniment =
  | { readonly tip: 'incarca'; readonly program: ProgramIncarcat }
  | { readonly tip: 'start' }
  | { readonly tip: 'reia' }
  | { readonly tip: 'continua' }
  | { readonly tip: 'opreste' }
  | { readonly tip: 'hold' }
  | { readonly tip: 'eliberare' }
  /** Ceasul sesiunii: cere un raport. */
  | { readonly tip: 'tic' }
  /** O linie de la controler. */
  | { readonly tip: 'primit'; readonly linie: string }
  | { readonly tip: 'manual'; readonly id: string; readonly text: string };

export type CodRefuzFlux = 'fara-program' | 'faza' | 'punct-pierdut' | 'manual-in-flux' | 'manual-invalid';
export type Actiune =
  | { readonly tip: 'scrie'; readonly octeti: Uint8Array }
  | { readonly tip: 'raspuns'; readonly id: string; readonly date: readonly string[]; readonly rezultat: 'ok' | 'pierdut' | number }
  | { readonly tip: 'refuz'; readonly eveniment: Eveniment['tip']; readonly cod: CodRefuzFlux }
  | { readonly tip: 'alarma'; readonly cod: number }
  | { readonly tip: 'mesaj'; readonly text: string };

/** Octeții de timp real (regula 9): nu intră în buffer, nu intră în socoteală. */
export const TIMP_REAL = { raport: 0x3f, hold: 0x21, reluare: 0x7e, reset: 0x18 } as const;
/** Comanda internă a barierei de sculă (regula 6). */
const ID_M5 = '#M5';
const CITIRE = /^\$(#|G|\$|I|N)$/;
const IN_FLUX: ReadonlySet<Faza> = new Set(['trimite', 'golire', 'terminare']);
const CU_PUNCT: ReadonlySet<Faza> = new Set(['trimite', 'suspendat', 'golire', 'bariera', 'terminare']);

export function fluxNou(capacitate = 128): StareFlux {
  return {
    capacitate, program: null, faza: 'liber', urm: 0, inZbor: [], suma: 0, raport: null, proaspat: false, wco: null, erori: [],
    coada: [], bariera: null, motiv: null, necorelate: 0,
  };
}

type Ciorna = { -readonly [K in keyof StareFlux]: StareFlux[K] } & { inZbor: InZbor[]; erori: { linie: number; cod: number }[]; coada: ComandaManuala[] };

const octetiText = (t: string): Uint8Array => Uint8Array.from(t, (c) => c.charCodeAt(0));

export function pas(s0: StareFlux, e: Eveniment): { readonly stare: StareFlux; readonly actiuni: readonly Actiune[] } {
  const s: Ciorna = { ...s0, inZbor: [...s0.inZbor], erori: [...s0.erori], coada: [...s0.coada] };
  const actiuni: Actiune[] = [];
  let bucati = '';
  const goleste = (): void => { if (bucati) { actiuni.push({ tip: 'scrie', octeti: octetiText(bucati) }); bucati = ''; } };
  const realtime = (b: number): void => { goleste(); actiuni.push({ tip: 'scrie', octeti: Uint8Array.of(b) }); };
  const refuza = (cod: CodRefuzFlux): void => { actiuni.push({ tip: 'refuz', eveniment: e.tip, cod }); };
  const trimiteLinie = (text: string, sursa: Sursa): void => {
    const cost = text.length + 1;
    bucati += `${text}\n`;
    s.inZbor.push({ cost, sursa, date: [] });
    s.suma += cost;
  };

  /** Regula 1 (și 6): umple bufferul cu liniile programului cât încap, până la o barieră sau la capăt. */
  const umple = (): void => {
    const linii = s.program?.linii ?? [];
    while (s.faza === 'trimite' && s.urm < linii.length) {
      const l = linii[s.urm];
      if (!l) break;
      if (l.bariera) {
        const g = grupBariere(linii, s.urm);
        s.bariera = { linie: s.urm, ultima: g.ultima, m6: g.m6, ax: g.m6 ? 'de-oprit' : 'oprit' };
        s.faza = 'golire';
        break;
      }
      if (s.suma + l.cost > s.capacitate) break;
      trimiteLinie(l.text, { tip: 'program', linie: s.urm });
      s.urm++;
    }
    if (s.faza === 'trimite' && s.urm >= linii.length) s.faza = 'terminare';
  };

  /** Regulile 5 și 6: golirea și terminarea înaintează doar pe un Idle venit după ultimul răspuns, cu nimic în zbor. */
  const verifica = (): void => {
    const idle = s.inZbor.length === 0 && s.proaspat && s.raport?.stare === 'Idle';
    if (s.faza === 'golire' && idle && s.bariera) {
      if (s.bariera.ax === 'de-oprit') {
        trimiteLinie('M5', { tip: 'manual', id: ID_M5 });
        s.bariera = { ...s.bariera, ax: 'trimis' };
      } else if (s.bariera.ax === 'oprit') {
        s.faza = 'bariera';
      }
    }
    if (s.faza === 'terminare' && idle) s.faza = 'terminat';
  };

  /** Regula 7: comenzile manuale, una câte una; citirile doar pe un Idle proaspăt. */
  const trimiteManuale = (): void => {
    for (;;) {
      const c = s.coada[0];
      if (!c || s.inZbor.length > 0 || !manualPermis(s)) return;
      if (CITIRE.test(c.text.toUpperCase()) && !(s.proaspat && s.raport?.stare === 'Idle')) return;
      s.coada.shift();
      trimiteLinie(c.text, { tip: 'manual', id: c.id });
    }
  };

  /** Regula 4: bufferul s-a golit; răspunsurile din zbor nu mai vin. */
  const pierde = (motiv: string): void => {
    for (const x of s.inZbor) if (x.sursa.tip === 'manual' && x.sursa.id !== ID_M5) actiuni.push({ tip: 'raspuns', id: x.sursa.id, date: x.date, rezultat: 'pierdut' });
    s.inZbor = [];
    s.suma = 0;
    s.proaspat = false;
    if (CU_PUNCT.has(s.faza)) { s.faza = 'pierdut'; s.motiv = motiv; s.bariera = null; }
  };

  switch (e.tip) {
    case 'incarca':
      if (!['liber', 'pregatit', 'terminat', 'pierdut'].includes(s.faza)) { refuza('faza'); break; }
      Object.assign(s, { program: e.program, faza: 'pregatit', urm: 0, erori: [], bariera: null, motiv: null });
      break;
    case 'start':
      if (!s.program) { refuza('fara-program'); break; }
      if (!['pregatit', 'terminat', 'pierdut'].includes(s.faza) || s.inZbor.length > 0 || s.coada.length > 0) { refuza('faza'); break; }
      Object.assign(s, { faza: 'trimite', urm: 0, erori: [], bariera: null, motiv: null });
      umple();
      break;
    case 'reia':
      if (s.faza === 'pierdut') { refuza('punct-pierdut'); break; }
      if (s.faza !== 'suspendat') { refuza('faza'); break; }
      realtime(TIMP_REAL.reluare);
      // `umple` regăsește singur bariera (linia ei n-a plecat) și capătul programului.
      s.faza = 'trimite';
      umple();
      verifica();
      break;
    case 'continua':
      if (s.faza !== 'bariera' || !s.bariera) { refuza('faza'); break; }
      s.urm = s.bariera.ultima + 1;
      s.bariera = null;
      s.faza = 'trimite';
      umple();
      break;
    case 'opreste':
      realtime(TIMP_REAL.reset);
      pierde('oprit');
      break;
    case 'hold': realtime(TIMP_REAL.hold); break;
    case 'eliberare': realtime(TIMP_REAL.reluare); break;
    case 'tic': realtime(TIMP_REAL.raport); break;
    case 'manual': {
      const t = e.text;
      if (t === '' || t.length > LUNGIME_MAXIMA_LINIE || /[^\x20-\x7e]|[?!~]/.test(t) || linieCurata(t) === '') { refuza('manual-invalid'); break; }
      if (IN_FLUX.has(s.faza) || (s.faza === 'suspendat' && s.inZbor.length > 0)) { refuza('manual-in-flux'); break; }
      s.coada.push({ id: e.id, text: t });
      break;
    }
    case 'primit': {
      const r = citesteRaspuns(e.linie);
      if (r.tip === 'ok' || r.tip === 'eroare') {
        const x = s.inZbor.shift();
        if (!x) { s.necorelate++; break; }
        s.suma -= x.cost;
        s.proaspat = false;
        if (x.sursa.tip === 'program') {
          if (r.tip === 'eroare') {
            s.erori.push({ linie: x.sursa.linie, cod: r.cod });
            if (IN_FLUX.has(s.faza)) { s.faza = 'suspendat'; realtime(TIMP_REAL.hold); }
          }
        } else if (x.sursa.id === ID_M5) {
          if (s.bariera && r.tip === 'ok') { s.bariera = { ...s.bariera, ax: 'oprit' }; if (s.faza === 'golire') s.faza = 'bariera'; }
          else if (s.bariera) { s.erori.push({ linie: s.bariera.linie, cod: r.tip === 'eroare' ? r.cod : 0 }); s.faza = 'suspendat'; }
        } else {
          actiuni.push({ tip: 'raspuns', id: x.sursa.id, date: x.date, rezultat: r.tip === 'ok' ? 'ok' : r.cod });
        }
      } else if (r.tip === 'raport') {
        s.raport = r.raport;
        s.proaspat = true;
        if (r.raport.wco) s.wco = r.raport.wco;
      } else if (r.tip === 'alarma') {
        actiuni.push({ tip: 'alarma', cod: r.cod });
        pierde(`ALARM:${r.cod}`);
      } else if (r.tip === 'banner') {
        pierde(s.motiv === 'oprit' ? 'oprit' : 'repornire');
      } else {
        const cap = s.inZbor[0];
        const text = r.tip === 'mesaj' ? `[MSG:${r.text}]` : r.text;
        if (cap && cap.sursa.tip === 'manual' && r.tip !== 'necunoscut') s.inZbor[0] = { ...cap, date: [...cap.date, text] };
        else actiuni.push({ tip: 'mesaj', text });
      }
      break;
    }
  }
  umple();
  verifica();
  trimiteManuale();
  goleste();
  return { stare: s, actiuni };
}

/** Faza în care o comandă manuală poate pleca: în afara fluxului, cu nimic din program în zbor. */
function manualPermis(s: StareFlux): boolean {
  if (s.faza === 'bariera' && s.bariera?.ax !== 'oprit') return false;
  return ['liber', 'pregatit', 'bariera', 'terminat', 'pierdut', 'suspendat'].includes(s.faza) && !s.inZbor.some((x) => x.sursa.tip === 'program');
}
