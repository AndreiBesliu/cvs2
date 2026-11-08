/**
 * Felul fiecărui strat al unei piese plate (ADR 0191; treptele, felia 3.6l): cheia după care șablonul se calculează o singură
 * dată pentru straturile la fel. Fără geometrie: doar numărul straturilor, Z-ul, rolul, unghiurile modelelor (cu alternarea
 * lor) și, la o piesă cu trepte, benzile.
 *
 * - O piesă fără trepte: `tip:u:uPlin:z` (`felDe`), ca până acum: primul strat, plinul (de jos, de sus sau al umplerii de
 *   100 %), suprafața de sus, umplerea rară; Z-ul doar la modelele 3D.
 * - O piesă cu trepte, de la stratul 2: `t:b:b1:bs:uSus:uPlin:uRar:zRar` (`felStratTrepte`). b e banda stratului, b1 a
 *   stratului de deasupra (-1: deasupra piesei), bs a celui cu `sus` straturi mai sus (-1: deasupra piesei, sau plin pe tot
 *   stratul: plinul de jos, umplerea de 100 %). Pe strat: suprafața de sus în R_b minus R_b1, plinul în R_b1 minus R_bs,
 *   umplerea rară în R_bs; unghiurile doar ale părților care sunt (celelalte goale), ca straturile la fel să aibă aceeași cheie.
 */
import type { ModelPlin, ModelRar, SetariFeliere } from './profil.ts';

export type FelStrat = string;
/** `trepta`: un strat cu mai multe părți (o treaptă se termină pe el, sau plinul de sus al uneia începe sub ea). */
export type TipStrat = 'prim' | 'plin' | 'sus' | 'rar' | 'trepta';

export const felDe = (tip: Exclude<TipStrat, 'trepta'>, u: number, uPlin: number, z: number | null): FelStrat => `${tip}:${u}:${uPlin}:${z === null ? '' : z.toFixed(4)}`;

/** Benzile și unghiurile unui strat cu trepte (null: partea nu e pe strat). */
export type BenziFel = {
  readonly b: number; readonly b1: number; readonly bs: number;
  readonly uSus: number | null; readonly uPlin: number | null; readonly uRar: number | null; readonly zRar: number | null;
};

export type FelCitit = { tip: TipStrat; u: number; uPlin: number; z: number | null; trepte?: BenziFel };

const nr = (x: string | undefined): number | null => (x === undefined || x === '' ? null : Number(x));

/**
 * Cheia, desfăcută. La o cheie cu trepte, rolul e al părții singure (sus, plin, rar) sau `trepta`, cu unghiul primei părți
 * (sus, apoi plin, apoi rar) și Z-ul umplerii rare.
 */
export function citesteFel(f: FelStrat): FelCitit {
  const x = f.split(':');
  if (x[0] === 't') {
    const t: BenziFel = { b: Number(x[1]), b1: Number(x[2]), bs: Number(x[3]), uSus: nr(x[4]), uPlin: nr(x[5]), uRar: nr(x[6]), zRar: nr(x[7]) };
    const tip: TipStrat = t.b1 === -1 ? 'sus' : t.b1 === t.b && t.bs === -1 ? 'plin' : t.b1 === t.b && t.bs === t.b ? 'rar' : 'trepta';
    const u = tip === 'sus' ? t.uSus : tip === 'plin' ? t.uPlin : tip === 'rar' ? t.uRar : (t.uSus ?? t.uPlin ?? t.uRar);
    return { tip, u: u ?? 0, uPlin: t.uPlin ?? 0, z: t.zRar, trepte: t };
  }
  const [tip, u, uPlin, z] = x;
  return { tip: tip as TipStrat, u: Number(u), uPlin: Number(uPlin), z: z === undefined || z === '' ? null : Number(z) };
}

/** Banda unui fel (0 la o piesă fără trepte): a cui regiune îi dă pereții. */
export const bandaFel = (f: FelStrat): number => (f.startsWith('t:') ? Number(f.split(':')[1]) : 0);

const MODELE_ALTERNATE: ReadonlySet<string> = new Set(['monotonic', 'monotonicline', 'rectilinear', 'line', 'honeycomb']);
/**
 * Unghiul modelului pe stratul k (de la 1): baza, plus 90° pe straturile pare la modelele care alternează (`_layer_angle` din
 * OrcaSlicer: liniile, fagurele); celelalte țin aceeași direcție.
 */
export const unghiModel = (model: ModelRar | ModelPlin, k: number, baza: number): number => (MODELE_ALTERNATE.has(model) && k % 2 === 0 ? baza + 90 : baza);
/** Modelele rare care depind de Z (3D): cheia stratului îl ține. */
export const DEPINDE_DE_Z: ReadonlySet<string> = new Set(['cubic', 'crosshatch', 'gyroid']);

/** Câte straturi are o piesă de înălțimea H: primul, de `strat1`, apoi de `strat`. */
export const numarStraturi = (H: number, s: SetariFeliere): number => Math.max(1, Math.round((H - s.strat1) / s.strat + 1e-9) + 1);
/** Z-ul (vârful) stratului k, de la 1. */
export const zStrat = (k: number, s: SetariFeliere): number => s.strat1 + (k - 1) * s.strat;
/** Câte straturi pline de sus: cel puțin `sus`, cel puțin grosimea `susMinim`. */
const straturiSus = (s: SetariFeliere): number => Math.max(s.sus, Math.ceil(s.susMinim / s.strat - 1e-9));

/**
 * Felul stratului k (de la 1) al unei piese cu n straturi: primul (suprafața de jos), ultimul (suprafața de sus), plinul de jos și
 * de sus, umplerea rară; fiecare cu modelul și unghiul lui (cu alternarea stratului la modelele care o au) și, la modelele 3D, Z-ul.
 */
export function felStrat(k: number, n: number, s: SetariFeliere): FelStrat {
  const uPlin = unghiModel(s.modelPlin, k, s.unghiPlin);
  if (k === 1) return felDe('prim', unghiModel(s.modelJos, k, s.unghiPlin), uPlin, null);
  if (k === n) return felDe('sus', unghiModel(s.modelSus, k, s.unghiPlin), uPlin, null);
  if (k <= s.jos || k > n - straturiSus(s) || s.umplere >= 0.999) return felDe('plin', uPlin, uPlin, null);
  return felDe('rar', unghiModel(s.modelRar, k, s.unghiRar), uPlin, DEPINDE_DE_Z.has(s.modelRar) ? zStrat(k, s) : null);
}

/**
 * Felul stratului k al unei piese cu trepte: n straturi, benzile încep la straturile `inceput` (primul e 1). Primul strat e
 * suprafața de jos peste toată piesa (o treaptă de un strat se termină tot pe el, ca la OrcaSlicer: unde jos și sus se
 * suprapun, rămâne jos). De la al doilea: cheia `t:` (antetul modulului).
 */
export function felStratTrepte(k: number, n: number, inceput: readonly number[], s: SetariFeliere): FelStrat {
  if (k === 1) return felStrat(1, n, s);
  const banda = (j: number): number => {
    let b = 0;
    while (b + 1 < inceput.length && inceput[b + 1]! <= j) b++;
    return b;
  };
  const b = banda(k), b1 = k >= n ? -1 : banda(k + 1);
  const sus = straturiSus(s);
  const bs = k <= s.jos || s.umplere >= 0.999 || k + sus > n ? -1 : banda(k + sus);
  const areSus = b1 !== b, arePlin = b1 >= 0 && bs !== b1, areRar = bs >= 0;
  const uSus = areSus ? String(unghiModel(s.modelSus, k, s.unghiPlin)) : '';
  const uPlin = arePlin || areRar ? String(unghiModel(s.modelPlin, k, s.unghiPlin)) : '';
  const uRar = areRar ? String(unghiModel(s.modelRar, k, s.unghiRar)) : '';
  const zRar = areRar && DEPINDE_DE_Z.has(s.modelRar) ? zStrat(k, s).toFixed(4) : '';
  return `t:${b}:${b1}:${bs}:${uSus}:${uPlin}:${uRar}:${zRar}`;
}
