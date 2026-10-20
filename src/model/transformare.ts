/**
 * Transformările selecției (ADR 0052), pure: rotirea și scalarea instanțelor alese, față de un punct al foii. Rotirea
 * schimbă doar instanța (unghiul și locul). Scalarea schimbă geometria piesei, EXACT: dreptunghiul își schimbă laturile,
 * cercul raza, calea vârfurile și punctele de control; unde rezultatul n-ar mai fi exact se refuză cu motiv (o scalare
 * neuniformă pe un cerc, pe un arc sau pe un colț rotunjit; o scalare neuniformă pe o instanță sau un nod rotit altfel decât
 * cu un multiplu de 90°; o piesă folosită și de alte instanțe).
 */
import type { Document, FormaDoc, Instanta, Matrice, Nod, Piesa } from './document.ts';

type P = { readonly x: number; readonly y: number };

export type Transformare =
  | { readonly fel: 'rotire'; readonly unghi: number; readonly centru: P }
  | { readonly fel: 'scalare'; readonly sx: number; readonly sy: number; readonly ancora: P };

export type MotivTransformare = 'neuniform-cerc' | 'neuniform-arc' | 'neuniform-colt' | 'neuniform-rotit' | 'piesa-impartita' | 'scara-invalida';

export type RezultatTransformare =
  | { readonly ok: true; readonly instante: readonly Instanta[]; readonly piese: readonly Piesa[] }
  | { readonly ok: false; readonly motiv: MotivTransformare };

const EPS = 1e-12;
const uniforma = (sx: number, sy: number): boolean => Math.abs(sx - sy) <= EPS * Math.max(1, Math.abs(sx), Math.abs(sy));
/** Unghiul (grade) e un multiplu de 90°: 0, 1, 2 sau 3 sferturi; altfel null. */
function sferturi(grade: number): number | null {
  const k = Math.round(grade / 90);
  return Math.abs(grade - k * 90) <= 1e-9 ? ((k % 4) + 4) % 4 : null;
}
const norm360 = (g: number): number => ((g % 360) + 360) % 360;

/** Scalarea (sx, sy) în axele unui nod rotit cu `q` sferturi: la 90° și 270° axele își schimbă locul. */
const inAxe = (sx: number, sy: number, q: number): [number, number] => (q % 2 === 1 ? [sy, sx] : [sx, sy]);

/** Sferturile părții liniare a unei matrice care e o rotire cu multiplu de 90° (eventual oglindită), sau null. */
function sferturiMatrice(m: Matrice): number | null {
  const s = Math.hypot(m.a, m.b);
  if (s <= 0) return null;
  return sferturi((Math.atan2(m.b, m.a) * 180) / Math.PI);
}

function scaleazaForma(f: FormaDoc, sx: number, sy: number): FormaDoc | MotivTransformare {
  const u = uniforma(sx, sy);
  switch (f.tip) {
    case 'dreptunghi':
      if (!u && f.razaColt > 0) return 'neuniform-colt';
      return { ...f, latime: f.latime * Math.abs(sx), inaltime: f.inaltime * Math.abs(sy), razaColt: f.razaColt * Math.abs(sx) };
    case 'cerc':
      if (!u) return 'neuniform-cerc';
      return { ...f, raza: f.raza * Math.abs(sx) };
    case 'cale': {
      if (!u && f.varfuri.some((v) => v.s.tip === 'A')) return 'neuniform-arc';
      const p = (q: { readonly x: number; readonly y: number; readonly [k: string]: unknown }) => ({ ...q, x: q.x * sx, y: q.y * sy });
      return {
        ...f,
        varfuri: f.varfuri.map((v) => ({ ...v, p: p(v.p), s: v.s.tip === 'C' ? { ...v.s, c1: p(v.s.c1), c2: p(v.s.c2) } : v.s })),
      };
    }
  }
}

/**
 * Pură: nodul scalat cu (sx, sy) în axele lui de deasupra: translația lui se scalează, iar copiii (sau forma) primesc scalarea
 * trecută prin rotirea lui (un multiplu de 90°; altfel doar o scalare uniformă trece).
 */
function scaleazaNod(n: Nod, sx: number, sy: number): Nod | MotivTransformare {
  const m = n.matrice;
  const matrice = { ...m, e: m.e * sx, f: m.f * sy };
  let lx = sx, ly = sy;
  if (!uniforma(sx, sy)) {
    const q = sferturiMatrice(m);
    if (q === null) return 'neuniform-rotit';
    [lx, ly] = inAxe(sx, sy, q);
  }
  // Scara proprie a nodului (|a, b|) nu se schimbă: scalarea intră în geometrie, în axele locale.
  if (n.tip === 'element') {
    const f = scaleazaForma(n.forma, lx, ly);
    return typeof f === 'string' ? f : { ...n, matrice, forma: f };
  }
  const copii: Nod[] = [];
  for (const c of n.copii) {
    const r = scaleazaNod(c, lx, ly);
    if (typeof r === 'string') return r;
    copii.push(r);
  }
  return { ...n, matrice, copii };
}

/** Pură: rotirea sau scalarea instanțelor `ids` ale foii `indexFoaie`, cu piesele lor (scalarea), sau motivul refuzului. */
export function transforma(doc: Document, indexFoaie: number, ids: readonly string[], t: Transformare): RezultatTransformare {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return { ok: true, instante: [], piese: [] };
  const alese = new Set(ids);
  const instante = foaie.instante.filter((i) => alese.has(i.id));
  if (t.fel === 'rotire') {
    const c = Math.cos((t.unghi * Math.PI) / 180), s = Math.sin((t.unghi * Math.PI) / 180);
    return {
      ok: true,
      piese: [],
      instante: instante.map((i) => {
        const dx = i.x - t.centru.x, dy = i.y - t.centru.y;
        return { ...i, x: t.centru.x + c * dx - s * dy, y: t.centru.y + s * dx + c * dy, rotire: norm360(i.rotire + t.unghi) };
      }),
    };
  }
  const { sx, sy, ancora } = t;
  // Fără oglindire din mânere: o scară care trece de zero (mânerul tras peste ancoră) e refuzată, nu întoarsă.
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) return { ok: false, motiv: 'scara-invalida' };
  // O piesă folosită de mai multe instanțe s-ar scala peste tot: refuz (copiile legate vin în etapa 11).
  const folosiri = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const noiPiese: Piesa[] = [];
  const noiInstante: Instanta[] = [];
  for (const i of instante) {
    const piesa = piese.get(i.piesa);
    if (!piesa) continue;
    if ((folosiri.get(i.piesa) ?? 0) > 1) return { ok: false, motiv: 'piesa-impartita' };
    let lx = sx, ly = sy;
    if (!uniforma(sx, sy)) {
      const q = sferturi(i.rotire);
      if (q === null) return { ok: false, motiv: 'neuniform-rotit' };
      [lx, ly] = inAxe(sx, sy, q);
    }
    const radacina = scaleazaNod(piesa.radacina, lx, ly);
    if (typeof radacina === 'string') return { ok: false, motiv: radacina };
    noiPiese.push({ ...piesa, radacina });
    noiInstante.push({ ...i, x: ancora.x + (i.x - ancora.x) * sx, y: ancora.y + (i.y - ancora.y) * sy });
  }
  return { ok: true, instante: noiInstante, piese: noiPiese };
}
