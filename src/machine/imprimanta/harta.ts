/**
 * Harta unui `.gcode`, pentru placa din fereastra Imprimanta (felia 3.6q, ADR 0193 §B.7), fără rețea și fără timp: straturile
 * (vârful fiecăruia, filamentul de la începutul lui, căile extrudate, cu piesa fiecăreia), piesele (`EXCLUDE_OBJECT_DEFINE`) și
 * pauzele. Fișierul vine pe bucăți, ca la verificarea de la 3.6h; analiza ține doar linia neterminată și stratul de acum.
 *
 * Filamentul e cel net al fișierului (retragerile scad, revenirile adună), ca `print_stats.filament_used` al lui Klipper, deci
 * stratul de acum se poate afla din filamentul spus de imprimantă (`stratViu.ts`). Linia de curățare din `START_PRINT` (un
 * macrou al imprimantei, nu din fișier) nu e aici: imprimanta numără câțiva mm în plus.
 */
import { RE_PAUZA } from './gcode3d.ts';

/** O piesă a fișierului: numele, cu majuscule (cum îl spune Klipper înapoi), și conturul, în mm. */
export type PiesaHarta = { readonly nume: string; readonly contur: readonly (readonly [number, number])[] };

/**
 * Un strat: vârful lui (mm; null: fără `;Z:`), filamentul de la începutul lui (mm), căile extrudate ca puncte x, y (o pereche
 * NaN, NaN între două căi) și piesa fiecărei căi, în ordine (indexul în `piese`; -1: în afara pieselor, ca fusta).
 */
export type StratHarta = { readonly z: number | null; readonly e: number; readonly puncte: Float32Array; readonly piese: Int16Array };

/** O pauză a fișierului: înaintea stratului (de la 1), după vârful celui de dedesubt (null: neștiut), cu nota scrisă de cvs2. */
export type PauzaHarta = { readonly strat: number; readonly z: number | null; readonly nota: string | null };

export type HartaGcode = {
  readonly straturi: readonly StratHarta[];
  readonly piese: readonly PiesaHarta[];
  readonly pauze: readonly PauzaHarta[];
  /** Filamentul întregului fișier, în mm. */
  readonly filament: number;
  /** Cutia căilor extrudate, în mm (null: niciuna). */
  readonly cutie: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } | null;
  /** Căile s-au oprit la `MAX_PUNCTE_HARTA`: straturile de după au doar vârful și filamentul. */
  readonly taiata: boolean;
};

/** Câte puncte ține harta, cel mult (~16 MB): un fișier uriaș se vede pe placă până acolo, apoi doar numărul stratului. */
export const MAX_PUNCTE_HARTA = 2_000_000;
/** Un punct mai aproape de cel ținut înaintea lui decât atât (mm) nu se ține: pe placă nu s-ar vedea. */
export const PRAG_PUNCT = 0.05;
/** Cel mult atâtea piese și pauze. */
const MAX_PIESE = 64, MAX_PAUZE = 50;

export type ConstructorHarta = { readonly adauga: (t: string) => void; readonly gata: () => HartaGcode };

/** `maxPuncte`: plafonul punctelor (implicit `MAX_PUNCTE_HARTA`; probele îl coboară). */
export function construiesteHarta(opt: { readonly maxPuncte?: number } = {}): ConstructorHarta {
  const maxPuncte = opt.maxPuncte ?? MAX_PUNCTE_HARTA;
  let rest = '';
  let absXY = true, absE = true;
  let x: number | null = null, y: number | null = null, eUltim = 0, cumulat = 0;
  const straturi: StratHarta[] = [];
  const piese: PiesaHarta[] = [];
  const pauze: PauzaHarta[] = [];
  let felStrat: 'schimbare' | 'cura' | null = null;
  // Stratul de acum (null: încă dinaintea primului).
  let acum: { z: number | null; e: number; p: number[]; o: number[] } | null = null;
  let deschisa = false;
  let px = 0, py = 0;
  let piesa = -1;
  let total = 0;
  let taiata = false;
  let nota: string | null = null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

  const inchideStrat = (): void => {
    if (acum === null) return;
    straturi.push({ z: acum.z, e: acum.e, puncte: Float32Array.from(acum.p), piese: Int16Array.from(acum.o) });
    acum = null;
  };
  const stratNou = (): void => {
    inchideStrat();
    acum = { z: null, e: cumulat, p: [], o: [] };
    deschisa = false;
    nota = null;
  };
  const tine = (a: number, b: number): void => {
    acum!.p.push(a, b);
    total++;
    px = a; py = b;
    if (a < x0) x0 = a;
    if (a > x1) x1 = a;
    if (b < y0) y0 = b;
    if (b > y1) y1 = b;
  };

  const linie = (brut: string): void => {
    const l = brut.trim();
    if (l === '') return;
    const k = l.indexOf(';');
    if (k === 0) {
      const c = l.slice(1).trim();
      let m: RegExpExecArray | null;
      if (c === 'LAYER_CHANGE') {
        if (felStrat !== 'cura') { felStrat = 'schimbare'; stratNou(); }
      } else if ((m = /^LAYER:(-?\d+)$/.exec(c)) !== null) {
        if (felStrat !== 'schimbare') { felStrat = 'cura'; stratNou(); }
      } else if ((m = /^Z:\s*(-?\d+(?:\.\d+)?)$/.exec(c)) !== null) {
        if (acum !== null && acum.z === null) acum.z = Number(m[1]);
      } else if ((m = /^pause note:\s*(.*)$/i.exec(c)) !== null) {
        nota = (m[1] ?? '').trim().slice(0, 80) || null;
      }
      return;
    }
    const cod = (k < 0 ? l : l.slice(0, k)).trim();
    const sus = cod.toUpperCase();
    if (sus.startsWith('EXCLUDE_OBJECT')) {
      const nume = /\bNAME=(\S+)/i.exec(cod)?.[1]?.toUpperCase() ?? null;
      if (sus.startsWith('EXCLUDE_OBJECT_DEFINE') && nume !== null && piese.length < MAX_PIESE && !piese.some((p) => p.nume === nume)) {
        let contur: [number, number][] = [];
        const poligon = /\bPOLYGON=(\[.*\])/i.exec(cod)?.[1];
        if (poligon !== undefined) {
          try {
            const v = JSON.parse(poligon) as unknown;
            if (Array.isArray(v)) {
              contur = v.flatMap((q): [number, number][] => (Array.isArray(q) && typeof q[0] === 'number' && typeof q[1] === 'number'
                && Number.isFinite(q[0]) && Number.isFinite(q[1]) ? [[q[0], q[1]]] : [])).slice(0, 256);
            }
          } catch {
            // Un contur stricat: piesa rămâne, fără el.
          }
        }
        piese.push({ nume, contur });
      } else if (sus.startsWith('EXCLUDE_OBJECT_START')) {
        piesa = nume === null ? -1 : piese.findIndex((p) => p.nume === nume);
        deschisa = false;
      } else if (sus.startsWith('EXCLUDE_OBJECT_END')) {
        piesa = -1;
        deschisa = false;
      }
      return;
    }
    if (RE_PAUZA.test(sus)) {
      if (pauze.length < MAX_PAUZE && straturi.length + (acum === null ? 0 : 1) > 0) {
        const n = straturi.length + (acum === null ? 0 : 1);
        pauze.push({ strat: n, z: n >= 2 ? (straturi[n - 2]?.z ?? null) : null, nota });
      }
      nota = null;
      return;
    }
    const m = /^([GM])(\d+)(.*)$/.exec(sus);
    if (m === null) return;
    const nr = Number(m[2]);
    if (m[1] === 'M') {
      if (nr === 82) absE = true;
      else if (nr === 83) absE = false;
      return;
    }
    if (nr === 90) { absXY = true; absE = true; return; }
    if (nr === 91) { absXY = false; absE = false; return; }
    const par: Record<string, number> = {};
    for (const [, lit, v] of (m[3] ?? '').matchAll(/([A-Z])\s*(-?(?:\d+\.?\d*|\.\d+))/g)) par[lit!] ??= Number(v);
    if (nr === 92) {
      if (par['E'] !== undefined) eUltim = par['E'];
      return;
    }
    if (nr === 28) { x = null; y = null; deschisa = false; return; }
    if (nr > 3) return;
    const nx = par['X'] === undefined ? x : absXY ? par['X'] : x === null ? null : x + par['X'];
    const ny = par['Y'] === undefined ? y : absXY ? par['Y'] : y === null ? null : y + par['Y'];
    let de = 0;
    if (par['E'] !== undefined) {
      de = absE ? par['E'] - eUltim : par['E'];
      eUltim = absE ? par['E'] : eUltim;
      cumulat += de;
    }
    const misca = nx !== x || ny !== y;
    if (de > 0 && misca && acum !== null && x !== null && y !== null && nx !== null && ny !== null && !taiata) {
      if (!deschisa) {
        if (acum.p.length > 0) acum.p.push(Number.NaN, Number.NaN);
        acum.o.push(piesa);
        tine(x, y);
        deschisa = true;
      }
      if (Math.hypot(nx - px, ny - py) >= PRAG_PUNCT) tine(nx, ny);
      if (total >= maxPuncte) taiata = true;
    } else if (misca) {
      deschisa = false;
    }
    x = nx; y = ny;
  };

  return {
    adauga: (t) => {
      const linii = (rest + t).split('\n');
      rest = linii.pop() ?? '';
      for (const l of linii) linie(l);
    },
    gata: () => {
      if (rest !== '') linie(rest);
      rest = '';
      inchideStrat();
      return {
        straturi: [...straturi], piese: [...piese], pauze: [...pauze], filament: cumulat,
        cutie: x0 <= x1 ? { x0, y0, x1, y1 } : null, taiata,
      };
    },
  };
}

export function hartaText(t: string, opt: { readonly maxPuncte?: number } = {}): HartaGcode {
  const h = construiesteHarta(opt);
  h.adauga(t);
  return h.gata();
}

/** Cât citește odată: printre bucăți, pagina rămâne vie. */
const BUCATA = 1 << 20;

/** Harta unui fișier ținut, citită pe bucăți (UTF-8, fără să taie un caracter între două bucăți). */
export async function hartaFisier(f: Blob, semnal?: AbortSignal): Promise<HartaGcode> {
  const h = construiesteHarta();
  const dec = new TextDecoder();
  for (let i = 0; i < f.size; i += BUCATA) {
    semnal?.throwIfAborted();
    h.adauga(dec.decode(new Uint8Array(await f.slice(i, i + BUCATA).arrayBuffer()), { stream: true }));
  }
  h.adauga(dec.decode());
  return h.gata();
}
