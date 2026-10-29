/**
 * Transformările selecției (ADR 0052, ADR 0054), pure: rotirea, scalarea și oglindirea instanțelor alese, față de un punct
 * al foii. Rotirea schimbă doar instanța (unghiul și locul). Scalarea schimbă geometria piesei, EXACT: dreptunghiul își
 * schimbă laturile, cercul raza, calea vârfurile și punctele de control; unde rezultatul n-ar mai fi exact se refuză cu
 * motiv (o scalare neuniformă pe un cerc, pe un arc sau pe un colț rotunjit; o scalare neuniformă pe o instanță sau un nod
 * rotit altfel decât cu un multiplu de 90°; o piesă folosită și de alte instanțe). Oglindirea pune reflexia în matricea
 * rădăcinii piesei (o similitudine: arcele rămân arce) și oglindește locul instanței; rotirea instanței rămâne. Înclinarea
 * (ADR 0065) intră în geometrie: liniile și cubicele rămân exacte; arcele (cercul, colțurile rotunjite) se refuză, sau, la
 * cererea omului, devin întâi cubice (ADR 0078), cu abaterea de după înclinare sub toleranța proiectului. Blocul unui text
 * (ADR 0105 §4) crește cu o scalare uniformă; orice altă schimbare a contururilor lui îl lasă doar vectori.
 */
import { inversa } from '../geom/inversa.ts';
import { aplica, compune, rotatie, translatie } from '../geom/matrice.ts';
import { TOLERANTA_IMPORT, TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import { PLAFON, type Document, type FormaDoc, type Instanta, type Matrice, type Nod, type Piesa, type VarfDoc } from './document.ts';
import { blocScalat } from './blocText.ts';
import { arcInCubice, caleDinForma } from './noduri.ts';

type P = { readonly x: number; readonly y: number };

export type Transformare =
  | { readonly fel: 'rotire'; readonly unghi: number; readonly centru: P }
  | { readonly fel: 'scalare'; readonly sx: number; readonly sy: number; readonly ancora: P }
  /** `orizontal`: stânga ↔ dreapta, față de dreapta verticală prin `centru`; `vertical`: sus ↔ jos, față de orizontala lui. */
  | { readonly fel: 'oglindire'; readonly directie: 'orizontal' | 'vertical'; readonly centru: P }
  /**
   * Înclinarea (ADR 0065), față de `centru`: întâi orizontal (x crește cu tan(unghiX) · distanța pe y), apoi vertical (y crește
   * cu tan(unghiY) · distanța pe x); unghiurile în grade, cel mult 75° în valoare absolută.
   */
  | {
    readonly fel: 'inclinare'; readonly unghiX: number; readonly unghiY: number; readonly centru: P;
    /** Arcele devin cubice înaintea înclinării (ADR 0078: cercul devine elipsă); lipsă sau false: o formă cu arce se refuză. */
    readonly arceInCurbe?: boolean;
  };

export type MotivTransformare =
  | 'neuniform-cerc' | 'neuniform-arc' | 'neuniform-colt' | 'neuniform-rotit' | 'piesa-impartita' | 'scara-invalida' | 'inclinare-arc' | 'unghi-invalid';

/** Cel mai mare unghi de înclinare acceptat, în grade (tan 75° ≈ 3,7). */
export const UNGHI_MAXIM_INCLINARE = 75;

/** Pură: matricea afină a înclinării față de `centru`: întâi orizontal cu `unghiX`, apoi vertical cu `unghiY` (grade). */
export function matriceInclinare(unghiX: number, unghiY: number, centru: P): Matrice {
  const kx = Math.tan((unghiX * Math.PI) / 180), ky = Math.tan((unghiY * Math.PI) / 180);
  // H = Hy · Hx (determinantul 1: aria se păstrează), mutată în centru.
  const H: Matrice = { a: 1, b: ky, c: kx, d: kx * ky + 1, e: 0, f: 0 };
  return compune(translatie(centru.x, centru.y), compune(H, translatie(-centru.x, -centru.y)));
}

/** Pură: cât lungește cel mult harta liniară a lui `m` (cea mai mare valoare singulară). */
export function intindere(m: Matrice): number {
  const s = m.a * m.a + m.b * m.b + m.c * m.c + m.d * m.d, det = m.a * m.d - m.b * m.c;
  return Math.sqrt((s + Math.sqrt(Math.max(0, s * s - 4 * det * det))) / 2);
}

/** Pură: o formă a instanțelor `ids` ale foii are arce (un cerc, colțuri rotunjite, o cale cu arce): înclinarea le-ar refuza. */
export function areArce(doc: Document, indexFoaie: number, ids: readonly string[]): boolean {
  const alese = new Set(ids);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const inNod = (n: Nod): boolean => n.tip === 'element'
    ? caleDinForma(n.forma).varfuri.some((v) => v.s.tip === 'A' && v.s.bulge !== 0)
    : n.copii.some(inNod);
  return (doc.foi[indexFoaie]?.instante ?? []).some((i) => {
    const p = alese.has(i.id) ? piese.get(i.piesa) : undefined;
    return p !== undefined && inNod(p.radacina);
  });
}

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
      const scalate = f.varfuri.map((v) => ({ ...v, p: p(v.p), s: v.s.tip === 'C' ? { ...v.s, c1: p(v.s.c1), c2: p(v.s.c2) } : v.s }));
      // Un arc pe care mărirea îl duce peste latura documentului (raza din coardă și bulge, ca schema, cu marja de 0,1 % a
      // importului) devine cubice sub toleranța importului, ca un arc plat la import (ADR 0035 §6, ADR 0102): altfel schema
      // ar refuza documentul, iar piesa n-ar mai crește deloc.
      const n = scalate.length;
      const varfuri = scalate.flatMap((v, i) => {
        const urm = scalate[(i + 1) % n];
        if (v.s.tip !== 'A' || !urm || (!f.inchis && i === n - 1)) return [v];
        const k = Math.abs(v.s.bulge);
        const raza = (Math.hypot(urm.p.x - v.p.x, urm.p.y - v.p.y) / 4) * (k + 1 / k);
        return raza <= PLAFON.latura * 0.999 ? [v] : arcInCubice(v.p, urm.p, v.s.bulge, TOLERANTA_IMPORT);
      });
      return { ...f, varfuri };
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
  // O piesă folosită de mai multe instanțe s-ar schimba peste tot: refuz (copiile legate vin în etapa 11).
  const folosiri = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  if (t.fel === 'oglindire') return oglindeste(instante, piese, folosiri, t);
  if (t.fel === 'inclinare') return inclina(instante, piese, folosiri, t);
  const { sx, sy, ancora } = t;
  // Fără oglindire din mânere: o scară care trece de zero (mânerul tras peste ancoră) e refuzată, nu întoarsă (oglindirea
  // are butoanele ei, ADR 0054).
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) return { ok: false, motiv: 'scara-invalida' };
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
    const scalata = scaleazaNod(piesa.radacina, lx, ly);
    if (typeof scalata === 'string') return { ok: false, motiv: scalata };
    // Un bloc de text (ADR 0105 §4) crește cu o scalare uniformă; una neuniformă îl face vectori.
    const radacina = blocScalat(piesa.radacina, scalata, lx, ly, uniforma(sx, sy));
    noiPiese.push({ ...piesa, radacina });
    noiInstante.push({ ...i, x: ancora.x + (i.x - ancora.x) * sx, y: ancora.y + (i.y - ancora.y) * sy });
  }
  return { ok: true, instante: noiInstante, piese: noiPiese };
}

/** −0 → 0 (o reflexie înmulțește zerourile cu −1): matricea scrisă în document rămâne aceeași la comparare. */
const fara0 = (m: Matrice): Matrice => ({ a: m.a + 0, b: m.b + 0, c: m.c + 0, d: m.d + 0, e: m.e + 0, f: m.f + 0 });

/**
 * Oglindirea (ADR 0054). În lume, un punct p al piesei e T(loc)·R(rotire)·p. Oglinda S față de axa prin `centru` dă
 * S·T(loc)·R(rotire)·p = T(loc′)·R(rotire)·L·p, cu loc′ = oglinda locului și L = R(−rotire)·S·R(rotire) (o reflexie): rotirea
 * instanței rămâne, iar L intră în matricea rădăcinii piesei, înaintea ei. La multiplii de 90°, L e exactă (0 și ±1).
 */
function oglindeste(
  instante: readonly Instanta[], piese: ReadonlyMap<string, Piesa>, folosiri: ReadonlyMap<string, number>,
  t: Extract<Transformare, { fel: 'oglindire' }>,
): RezultatTransformare {
  const S: Matrice = t.directie === 'orizontal' ? { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } : { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 };
  const noiPiese: Piesa[] = [];
  const noiInstante: Instanta[] = [];
  for (const i of instante) {
    const piesa = piese.get(i.piesa);
    if (!piesa) continue;
    if ((folosiri.get(i.piesa) ?? 0) > 1) return { ok: false, motiv: 'piesa-impartita' };
    const L = compune(rotatie(-i.rotire), compune(S, rotatie(i.rotire)));
    noiPiese.push({ ...piesa, radacina: { ...piesa.radacina, matrice: fara0(compune(L, piesa.radacina.matrice)) } });
    noiInstante.push(t.directie === 'orizontal' ? { ...i, x: 2 * t.centru.x - i.x } : { ...i, y: 2 * t.centru.y - i.y });
  }
  return { ok: true, instante: noiInstante, piese: noiPiese };
}

/**
 * Forma elementului cu harta afină `A` aplicată geometriei: o cale (dreptunghiul devine conturul lui). Arcele se refuză, sau,
 * cu `tolArce` (mm, în coordonatele elementului), devin întâi cubice ale aceluiași cerc (`arcInCubice`, ADR 0068), apoi se
 * transformă ca orice cubică: exact față de cubice, la cel mult `tolArce` · |A| de arcul înclinat.
 */
function aplicaFormei(f: FormaDoc, A: Matrice, tolArce: number | null): FormaDoc | MotivTransformare {
  const c = caleDinForma(f);
  const n = c.varfuri.length;
  const arc = (k: number): boolean => { const v = c.varfuri[k]; return v !== undefined && v.s.tip === 'A' && v.s.bulge !== 0 && (c.inchis || k < n - 1); };
  let varfuri: readonly VarfDoc[] = c.varfuri;
  if (c.varfuri.some((_, k) => arc(k))) {
    if (tolArce === null) return 'inclinare-arc';
    varfuri = c.varfuri.flatMap((v, k) => {
      const b = c.varfuri[(k + 1) % n];
      return arc(k) && b && v.s.tip === 'A' ? arcInCubice(v.p, b.p, v.s.bulge, tolArce) : [v];
    });
  }
  const p = (q: { readonly x: number; readonly y: number }) => aplica(A, q);
  return { ...c, varfuri: varfuri.map((v) => ({ p: p(v.p), s: v.s.tip === 'C' ? { tip: 'C' as const, c1: p(v.s.c1), c2: p(v.s.c2) } : { tip: 'L' as const } })) };
}

/**
 * Nodul cu înclinarea `H` (în lume) trecută în geometria fiecărui element: punctul p al unui element, cu matricea lui în lume
 * W, ajunge în H·W·p = W·(W⁻¹·H·W)·p, deci geometria primește A = W⁻¹·H·W, iar matricele (instanța, nodurile) rămân.
 * Cu `arce`, abaterea unei cubice față de arcul ei (în element) ajunge în lume înmulțită cel mult cu scara lui W și cu
 * întinderea lui H, deci arcele se fac cubice la toleranța proiectului împărțită la amândouă (ADR 0078 §2).
 */
function inclinaNod(n: Nod, sus: Matrice, H: Matrice, arce: boolean): Nod | MotivTransformare {
  const W = compune(sus, n.matrice);
  if (n.tip === 'element') {
    const inv = inversa(W);
    if (!inv) return 'unghi-invalid';
    const tol = arce ? TOLERANTA_PROIECT / (Math.hypot(W.a, W.b) * intindere(H)) : null;
    const f = aplicaFormei(n.forma, compune(inv, compune(H, W)), tol);
    return typeof f === 'string' ? f : { ...n, forma: f };
  }
  const copii: Nod[] = [];
  for (const c of n.copii) {
    const r = inclinaNod(c, W, H, arce);
    if (typeof r === 'string') return r;
    copii.push(r);
  }
  return { ...n, copii };
}

/** Înclinarea (ADR 0065): geometria pieselor primește înclinarea, locul și rotirea instanțelor rămân. */
function inclina(
  instante: readonly Instanta[], piese: ReadonlyMap<string, Piesa>, folosiri: ReadonlyMap<string, number>,
  t: Extract<Transformare, { fel: 'inclinare' }>,
): RezultatTransformare {
  const bun = (u: number): boolean => Number.isFinite(u) && Math.abs(u) <= UNGHI_MAXIM_INCLINARE;
  if (!bun(t.unghiX) || !bun(t.unghiY)) return { ok: false, motiv: 'unghi-invalid' };
  const H = matriceInclinare(t.unghiX, t.unghiY, t.centru);
  const noiPiese: Piesa[] = [];
  for (const i of instante) {
    const piesa = piese.get(i.piesa);
    if (!piesa) continue;
    if ((folosiri.get(i.piesa) ?? 0) > 1) return { ok: false, motiv: 'piesa-impartita' };
    const radacina = inclinaNod(piesa.radacina, compune(translatie(i.x, i.y), rotatie(i.rotire)), H, t.arceInCurbe === true);
    if (typeof radacina === 'string') return { ok: false, motiv: radacina };
    noiPiese.push({ ...piesa, radacina });
  }
  return { ok: true, instante: [], piese: noiPiese };
}
