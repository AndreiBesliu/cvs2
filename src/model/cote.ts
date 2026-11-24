/**
 * Cotele foii (ADR 0330), pure: punctul fiecărei ancore, citit din lume, și valoarea fiecărui fel. O cotă nu se taie: stă pe
 * foaie (`Foaie.cote`), nu în piese, iar CAM-ul, postul, simularea și bazinul nu importă acest modul (regula `cam-fara-cote`).
 *
 * - O ancoră liberă e chiar punctul ei.
 * - O ancoră legată (ADR 0330 §3) își citește punctul din conturul elementului în lume (`conturElement`), deci urmează forma la
 *   mutare, rotire, scalare, oglindire, înclinare. Se dezleagă cinstit, la punctul văzut ultima oară (`x`, `y`): forma nu mai e
 *   pe foaie (`forma`), sau conturul ei are alt număr de segmente decât la legare ori locul nu mai e pe el (`noduri`: vârful k
 *   n-ar mai fi același). Cutia nu ține de noduri.
 */
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import type { AncoraCota, Cota, Document, FelCota, LocCota } from './document.ts';
import { conturElement, cutieElement } from './forme.ts';
import { elementeFoaie, idLume, type ElementLume } from './lume.ts';

/** Felurile cunoscute (ADR 0330 §4), ca valoare; tipul lor e în `document.ts`. */
export const FELURI_COTA: readonly FelCota[] = ['orizontala', 'verticala', 'aliniata', 'raza', 'diametru', 'unghi'];

/** Câte puncte are o cotă din fiecare fel: cele liniare, raza și diametrul, două; unghiul, trei (vârful) sau patru (două laturi). */
export const PUNCTE_COTA: Readonly<Record<FelCota, readonly number[]>> = {
  orizontala: [2], verticala: [2], aliniata: [2], raza: [2], diametru: [2], unghi: [3, 4],
};

export function felCunoscut(fel: unknown): fel is FelCota {
  return typeof fel === 'string' && (FELURI_COTA as readonly string[]).includes(fel);
}

/** Elementele foii în lume, după id-ul lor în lume (`instanta/nod`): o singură trecere prin lume pentru toate cotele foii. */
export function indexLume(doc: Document, indexFoaie: number): ReadonlyMap<string, ElementLume> {
  return new Map(elementeFoaie(doc, indexFoaie).map((e) => [e.idLume, e]));
}

export type PunctCota = { readonly p: Punct; readonly stare: 'libera' | 'legata' | 'dezlegata'; readonly motiv?: 'forma' | 'noduri' };

/** Punctul de pe arcul unui segment cu bulge, la unghiul `t` față de centru (radiani, în lume). */
const peCerc = (c: Punct, r: number, t: number): Punct => ({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });

/** Mijlocul segmentului `k`: al liniei, al arcului (pe arc), al cubicei (la t = 1/2). */
function mijloc(c: Contur, k: number): Punct {
  const { a, b, s } = segment(c, k);
  if (s.tip === 'A') {
    const cerc = cerculArcului(a, b, s.bulge);
    return peCerc(cerc.centru, cerc.raza, cerc.start + cerc.baleiaj / 2);
  }
  if (s.tip === 'C') {
    return { x: (a.x + 3 * s.c1.x + 3 * s.c2.x + b.x) / 8, y: (a.y + 3 * s.c1.y + 3 * s.c2.y + b.y) / 8 };
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Punctul unui loc pe elementul din lume, sau `noduri` dacă locul nu mai e pe forma lui. Lipirea pe puncte (`puncteCote.ts`)
 * își face punctele tot de aici, deci un capăt lipit e exact punctul în care cota îl citește după aceea; ea dă și conturul
 * elementului, făcut o singură dată (`c`), ca o formă cu mii de vârfuri să nu-l refacă pentru fiecare punct.
 */
export function punctLoc(e: ElementLume, loc: LocCota, n: number, contur?: Contur): Punct | 'noduri' {
  if (loc.fel === 'cutie') {
    const b = cutieElement(e);
    const col = loc.i % 3, rand = Math.floor(loc.i / 3);
    return { x: [b.minX, (b.minX + b.maxX) / 2, b.maxX][col] ?? b.minX, y: [b.minY, (b.minY + b.maxY) / 2, b.maxY][rand] ?? b.minY };
  }
  const c = contur ?? conturElement(e);
  const m = numarSegmente(c);
  if (m !== n) return 'noduri';
  if (loc.fel === 'varf') return c.varfuri[loc.k]?.p ?? 'noduri';
  if (loc.k >= m) return 'noduri';
  if (loc.fel === 'mijloc') return mijloc(c, loc.k);
  const { a, b, s } = segment(c, loc.k);
  if (s.tip !== 'A') return 'noduri';
  const cerc = cerculArcului(a, b, s.bulge);
  if (loc.fel === 'centru') return cerc.centru;
  if (loc.fel !== 'cadran') return 'noduri';
  // Cadranul q, pe axele elementului: direcția (cos 90°q, sin 90°q) trecută prin partea liniară a matricei lui (pe un arc,
  // matricea e o asemănare: ușa refuză arcele sub o scalare neuniformă), apoi pe cerc.
  const u = Math.round(Math.cos((loc.q * Math.PI) / 2)), v = Math.round(Math.sin((loc.q * Math.PI) / 2));
  const M = e.matrice;
  return peCerc(cerc.centru, cerc.raza, Math.atan2(M.b * u + M.d * v, M.a * u + M.c * v));
}

/** Punctul unei ancore (ADR 0330 §3): al ei, liberă; din lume, legată; cel văzut ultima oară, dezlegată. */
export function punctAncora(a: AncoraCota, lume: ReadonlyMap<string, ElementLume>): PunctCota {
  const p = { x: a.x, y: a.y };
  const l = a.legatura;
  if (!l) return { p, stare: 'libera' };
  const e = lume.get(idLume(l.instanta, l.nod));
  if (!e) return { p, stare: 'dezlegata', motiv: 'forma' };
  const q = punctLoc(e, l.loc, l.n);
  return q === 'noduri' ? { p, stare: 'dezlegata', motiv: 'noduri' } : { p: q, stare: 'legata' };
}

/** Unghiul dintre două direcții, în grade, în [0, 180]; null dacă una e de lungime zero. */
function unghi(u: Punct, v: Punct): number | null {
  if ((u.x === 0 && u.y === 0) || (v.x === 0 && v.y === 0)) return null;
  return (Math.atan2(Math.abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y) * 180) / Math.PI;
}

/**
 * Valoarea cotei, din punctele ei (ADR 0330 §4), exactă (rotunjirea e a afișării): distanța pe X, pe Y sau dreaptă, raza,
 * diametrul, unghiul în grade. Null: un fel necunoscut, alt număr de puncte, o latură de lungime zero sau două laturi paralele.
 */
export function valoareCota(c: Cota, p: readonly Punct[]): number | null {
  if (!felCunoscut(c.fel) || !PUNCTE_COTA[c.fel].includes(p.length)) return null;
  const [a, b, x, y] = p as [Punct, Punct, Punct?, Punct?];
  switch (c.fel) {
    case 'orizontala': return Math.abs(b.x - a.x);
    case 'verticala': return Math.abs(b.y - a.y);
    case 'aliniata': case 'raza': return Math.hypot(b.x - a.x, b.y - a.y);
    case 'diametru': return 2 * Math.hypot(b.x - a.x, b.y - a.y);
    case 'unghi': {
      const s1 = c.linie?.s1 === -1 ? -1 : 1, s2 = c.linie?.s2 === -1 ? -1 : 1;
      if (!x) return null;
      // Trei puncte: vârful `a`, laturile spre `b` și `x`. Patru: laturile (a, b) și (x, y), care nu pot fi paralele.
      const d1 = { x: s1 * (b.x - a.x), y: s1 * (b.y - a.y) };
      const d2 = y ? { x: s2 * (y.x - x.x), y: s2 * (y.y - x.y) } : { x: s2 * (x.x - a.x), y: s2 * (x.y - a.y) };
      if (y && Math.abs(d1.x * d2.y - d1.y * d2.x) <= 1e-12 * Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y)) return null;
      return unghi(d1, d2);
    }
  }
}

/**
 * Cotele unei foi copiate („Duplică foaia”, cu piese noi sau legate; ADR 0210 §1, §2): capetele legate trec pe instanțele
 * copiei, după `harta` (id-ul vechi → cel nou), cu aceleași noduri (copia arborelui le păstrează). O cotă cu un fel necunoscut
 * se copiază neatinsă. Fără cote: nimic.
 */
export function coteCopiate(cote: readonly Cota[], harta: ReadonlyMap<string, string>): Cota[] {
  return cote.map((c) => {
    if (!felCunoscut(c.fel) || !Array.isArray(c.puncte)) return structuredClone(c);
    return {
      ...structuredClone(c),
      puncte: c.puncte.map((a) => {
        const nou = a.legatura ? harta.get(a.legatura.instanta) : undefined;
        return nou && a.legatura ? { ...structuredClone(a), legatura: { ...structuredClone(a.legatura), instanta: nou } } : structuredClone(a);
      }),
    };
  });
}

/**
 * „Dezleagă” din panoul cotei (ADR 0330 §3, §5, felia 10.4↑a-4): fiecare capăt legat își scrie punctul citit acum (`puncte`,
 * din `punctAncora`, în ordinea capetelor) și pierde legătura; cel deja dezlegat rămâne în ultimul loc văzut. Câmpurile
 * necunoscute ale capetelor și ale cotei rămân.
 */
export function cotaDezlegata(c: Cota, puncte: readonly PunctCota[]): Cota {
  if (!Array.isArray(c.puncte)) return structuredClone(c);
  return {
    ...structuredClone(c),
    puncte: c.puncte.map((a, k) => {
      if (!a.legatura) return structuredClone(a);
      const { legatura: _, ...rest } = structuredClone(a);
      const p = puncte[k]?.p ?? { x: a.x, y: a.y };
      return { ...rest, x: p.x, y: p.y };
    }),
  };
}

/** Textul cotei din panou (ADR 0330 §5): `<>` e valoarea; gol, doar spații sau doar „<>” scoate câmpul (rămâne cifra). */
export function cotaCuText(c: Cota, text: string): Cota {
  const { text: _, ...fara } = structuredClone(c);
  const t = text.trim();
  return t === '' || t === '<>' ? fara : { ...fara, text };
}

/** Distanța liniei de cotă (ADR 0330 §5), în mm, pe normală, față de mijlocul punctelor; restul liniei rămâne. */
export function cotaCuDistanta(c: Cota, d: number): Cota {
  return { ...structuredClone(c), linie: { ...structuredClone(c.linie ?? { d: 0 }), d } };
}

/**
 * Starea cotei, cum o spune panoul: dezlegată dacă un capăt e dezlegat (cu motivul primului), legată dacă vreun capăt e legat,
 * altfel liberă.
 */
export function stareCota(puncte: readonly PunctCota[]): { readonly stare: PunctCota['stare']; readonly motiv: 'forma' | 'noduri' | null } {
  const d = puncte.find((p) => p.stare === 'dezlegata');
  if (d) return { stare: 'dezlegata', motiv: d.motiv ?? null };
  return { stare: puncte.some((p) => p.stare === 'legata') ? 'legata' : 'libera', motiv: null };
}
