/**
 * Uneltele de desen (ADR 0051), partea pură: din cele două capete ale gestului (în mm ai foii, deja lipite) iese forma
 * exactă și locul instanței ei. Dreptunghiul și elipsa merg din colț în colț, cercul și poligonul din centru, linia din
 * capăt în capăt; Shift face pătrat / cerc sau pași de 15°. Elipsa se face cu aceeași funcție și toleranță ca importul SVG.
 */
import type { CheieSimpla } from '../i18n/t.ts';
import type { FormaDoc, VarfDoc } from '../model/document.ts';
import { elipsa, LATURI_MAX, LATURI_MIN, poligonRegulat } from '../model/formeParametrice.ts';

export { LATURI_MAX, LATURI_MIN };

/** Uneltele barei: Selecția, Transformarea (mânerele de scalare și rotire, ADR 0053) și cele de desen. */
export const UNELTE = ['selectie', 'transformare', 'noduri', 'pen', 'dreptunghi', 'cerc', 'elipsa', 'linie', 'poligon', 'text'] as const;
export type Unealta = (typeof UNELTE)[number];
export type UnealtaDesen = Exclude<Unealta, 'selectie' | 'transformare' | 'noduri' | 'pen' | 'text'>;

/**
 * Pură: unealta desenează dintr-o tragere (pânza îi dă gestul), sau alege și editează (Selecția, Transformarea, Nodurile);
 * Pen-ul desenează nod cu nod, cu gestul lui (ADR 0063); Textul pune ancora cu un clic și se scrie în panoul lui (ADR 0105).
 */
export const deseneaza = (u: Unealta): u is UnealtaDesen => u !== 'selectie' && u !== 'transformare' && u !== 'noduri' && u !== 'pen' && u !== 'text';

/** Tasta fiecărei unelte (fără modificatori). */
// T e „Arată traseul” (ADR 0038): Textul are X.
export const TASTE_UNELTE: Readonly<Record<string, Unealta>> = { v: 'selectie', s: 'transformare', n: 'noduri', b: 'pen', r: 'dreptunghi', o: 'cerc', e: 'elipsa', l: 'linie', p: 'poligon', x: 'text' };
/** Eticheta tastei pe butonul uneltei (cererea owner-ului din 25.10), din aceeași hartă: nu poate arăta altă tastă. */
export const TASTA_UNELTEI = Object.fromEntries(Object.entries(TASTE_UNELTE).map(([k, u]) => [u, k.toUpperCase()])) as Readonly<Record<Unealta, string>>;

export interface FormaDesenata {
  readonly forma: FormaDoc;
  /** Locul instanței (originea locală a formei), în mm ai foii. */
  readonly x: number;
  readonly y: number;
}

type P = { readonly x: number; readonly y: number };

const PAS_UNGHI = Math.PI / 12;

/** Pură: unghiul rotunjit la pași de 15°, cu aceeași lungime. */
function pe15(a: P, b: P): P {
  const r = Math.hypot(b.x - a.x, b.y - a.y);
  const u = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / PAS_UNGHI) * PAS_UNGHI;
  return { x: a.x + r * Math.cos(u), y: a.y + r * Math.sin(u) };
}

/** Pură: colțul opus, cu laturile egale (Shift), în direcția tragerii. */
function patrat(a: P, b: P): P {
  const l = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  return { x: a.x + Math.sign(b.x - a.x || 1) * l, y: a.y + Math.sign(b.y - a.y || 1) * l };
}

/** Tastele ținute la desen (ADR 0240): Shift = pătrat / cerc / pași de 15°, Ctrl = fără proporție, Alt = din centru. */
export type TasteDesen = { readonly shift: boolean; readonly ctrl: boolean; readonly alt: boolean };
const FARA: TasteDesen = { shift: false, ctrl: false, alt: false };

/** Pură: al doilea capăt al gestului, după Shift (pătrat / cerc / 15°); cercul nu se constrânge (e cerc oricum). */
export function capatConstrans(u: UnealtaDesen, a: P, b: P, taste: TasteDesen): P {
  if (!taste.shift) return b;
  if (u === 'dreptunghi' || u === 'elipsa') return patrat(a, b);
  if (u === 'linie' || u === 'poligon') return pe15(a, b);
  return b;
}

/** Pură: cercul se desenează ca elipsă (Ctrl fără Shift: fără proporție, ADR 0240), din centru, cu cursorul în colțul cutiei. */
export const cerculElipsa = (taste: TasteDesen): boolean => taste.ctrl && !taste.shift;

/** De unde pornește cercul (ADR 0240 §C.19, opțiunea de lângă rază): din centru (cursorul pe cerc) sau din colț (ca elipsa). */
export type ModCerc = 'centru' | 'colt';

/** O tastă din rândul tastelor (ADR 0240 §E.25) și ce face, ca cheie de text. */
export type TastaUneltei = { readonly tasta: 'shift' | 'ctrl' | 'alt'; readonly cheie: CheieSimpla };

/**
 * Pură: rândul tastelor din bara de jos (ADR 0240 §E.25) pentru unealta `u`: ce face Shift, Ctrl și Alt, doar cele care fac
 * ceva (la Transformare, Alt e față de ancoră sau de centru, după opțiune; la cerc, după felul lui). Gol la celelalte unelte.
 */
export function tasteUneltei(u: Unealta, o: { readonly altFix: 'ancora' | 'centru'; readonly cerc: ModCerc }): readonly TastaUneltei[] {
  const r = (tasta: TastaUneltei['tasta'], cheie: CheieSimpla): TastaUneltei => ({ tasta, cheie });
  switch (u) {
    case 'transformare':
      return [r('shift', 'editare.mod.proportional'), r('ctrl', 'editare.mod.liber'), r('alt', o.altFix === 'centru' ? 'editare.mod.fix.centru' : 'editare.mod.fix.ancora')];
    case 'dreptunghi':
    case 'elipsa':
      return [r('shift', u === 'elipsa' ? 'editare.desen.cerc' : 'editare.desen.patrat'), r('ctrl', 'editare.mod.liber'), r('alt', 'editare.desen.din-centru')];
    case 'cerc':
      return o.cerc === 'colt' ? [r('ctrl', 'editare.desen.elipsa'), r('alt', 'editare.desen.din-centru')] : [r('ctrl', 'editare.desen.elipsa')];
    case 'linie':
      return [r('shift', 'editare.desen.pas15'), r('alt', 'editare.desen.din-mijloc')];
    case 'poligon':
      return [r('shift', 'editare.desen.pas15'), r('ctrl', 'editare.desen.intins')];
    default:
      return [];
  }
}

const L = (p: P): VarfDoc => ({ p: { x: p.x, y: p.y }, s: { tip: 'L' } });

/**
 * Pură: forma desenată între `a` și `b` (mm ai foii, după lipire și Shift), sau null dacă e degenerată (o latură, raza
 * sau lungimea sub `minim` mm: tragerea prea scurtă nu face nimic). Cu Alt (ADR 0240), dreptunghiul și elipsa pornesc din
 * centru (`a` e centrul, `b` un colț al cutiei), iar linia din mijloc; cercul și poligonul pornesc oricum din centru. Cu Ctrl
 * fără Shift, cercul devine elipsă, din centru, cu `b` în colțul cutiei ei, iar poligonul se întinde (6.V↑d). Cercul „din colț”
 * (opțiunea `cerc`, 6.V↑d) se desenează ca elipsa cu Shift: din cutia pătrată, Alt din centru, Ctrl elipsă.
 */
export function formaDesenata(u: UnealtaDesen, a: P, b: P, laturi: number, minim: number, taste: TasteDesen = FARA, cerc: ModCerc = 'centru'): FormaDesenata | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (u === 'cerc' && cerc === 'colt') return formaDesenata('elipsa', a, cerculElipsa(taste) ? b : patrat(a, b), laturi, minim, { ...taste, shift: false });
  switch (u) {
    case 'dreptunghi': {
      const w = Math.abs(dx) * (taste.alt ? 2 : 1), h = Math.abs(dy) * (taste.alt ? 2 : 1);
      if (w < minim || h < minim) return null;
      const x = taste.alt ? a.x - Math.abs(dx) : Math.min(a.x, b.x), y = taste.alt ? a.y - Math.abs(dy) : Math.min(a.y, b.y);
      return { forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 }, x, y };
    }
    case 'cerc': {
      if (cerculElipsa(taste)) {
        if (Math.abs(dx) < minim / 2 || Math.abs(dy) < minim / 2) return null;
        return { forma: elipsa({ x: 0, y: 0 }, Math.abs(dx), Math.abs(dy)), x: a.x, y: a.y };
      }
      const r = Math.hypot(dx, dy);
      return r < minim ? null : { forma: { tip: 'cerc', raza: r }, x: a.x, y: a.y };
    }
    case 'elipsa': {
      const rx = Math.abs(dx) / (taste.alt ? 1 : 2), ry = Math.abs(dy) / (taste.alt ? 1 : 2);
      if (rx < minim / 2 || ry < minim / 2) return null;
      // Centrată în originea piesei; razele egale (Shift) dau un cerc exact, nu cubice (generatorul comun, ADR 0053).
      return { forma: elipsa({ x: 0, y: 0 }, rx, ry), x: taste.alt ? a.x : (a.x + b.x) / 2, y: taste.alt ? a.y : (a.y + b.y) / 2 };
    }
    case 'linie': {
      const k = taste.alt ? 2 : 1;
      if (Math.hypot(dx, dy) * k < minim) return null;
      return { forma: { tip: 'cale', inchis: false, varfuri: [L({ x: 0, y: 0 }), L({ x: dx * k, y: dy * k })] }, x: taste.alt ? a.x - dx : a.x, y: taste.alt ? a.y - dy : a.y };
    }
    case 'poligon': {
      // Întins (Ctrl fără Shift, 6.V↑d): vârfurile pe elipsa cu semiaxele |dx| și |dy|, primul sus; nu mai e regulat.
      if (cerculElipsa(taste)) {
        if (Math.abs(dx) < minim / 2 || Math.abs(dy) < minim / 2) return null;
        const n = Math.round(Math.min(LATURI_MAX, Math.max(LATURI_MIN, laturi)));
        const varfuri = Array.from({ length: n }, (_, k) => {
          const u0 = Math.PI / 2 + (2 * Math.PI * k) / n;
          return L({ x: Math.abs(dx) * Math.cos(u0), y: Math.abs(dy) * Math.sin(u0) });
        });
        return { forma: { tip: 'cale', inchis: true, varfuri }, x: a.x, y: a.y };
      }
      const r = Math.hypot(dx, dy);
      if (r < minim) return null;
      return { forma: poligonRegulat({ x: 0, y: 0 }, r, laturi, Math.atan2(dy, dx)), x: a.x, y: a.y };
    }
  }
}
