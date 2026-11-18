/**
 * Cazurile pe hârtie ale incrustației în trepte (ADR 0175 §3, §6), socotite aici din geometrie, nu din cod. R e raza celei mai
 * mici freze a locașului, r a celei mai mici a dopului, c jocul lateral, ρ = max(0, r − c), d adâncimea umărului, s lățimea lui:
 * - **spre interior:** nivelul de sus e locașul obișnuit (desenul, potrivit), până la d; deschiderea de sub umăr e desenul
 *   micșorat cu s, potrivit la fel (închis cu ρ, deschis cu R), de la d la D;
 * - **spre exterior:** deschiderea e desenul potrivit, iar nivelul de sus e desenul lărgit cu s, potrivit;
 * - **dopul**, mereu oglindit, cu tija în sus: tija e deschiderea micșorată cu c, flanșa nivelul de sus micșorat cu c.
 *   Pe umăr: tija D − d − g (g sub ea), flanșa d + H; pe fund: tija D − d + g (g deasupra umărului), flanșa d − g + H; la gaură
 *   (pe umăr, la nivel cu fața de jos): tija T − d, flanșa d + H. Înălțimea dopului h = tija + flanșa.
 * Un vârf convex de unghi α se retrage pe bisectoare cu R / sin(α/2) − R; micșorat întâi cu s, vârful mai merge s / sin(α/2).
 * Unghiul intrând (pana de unghi γ) închis cu ρ: peretele intră în pană cu ρ / sin(γ/2) − ρ; micșorat întâi cu s ≤ ρ, peretele
 * stă pe bisectoare la ρ − (ρ − s) / sin(γ/2) de vârf, spre desen.
 * `raze`: unde întâlnește peretele nivelului dat raza din p pe direcția d, pe hârtie.
 */
import type { DesenO, PunctO } from './incrustatie.ts';
import { stea, type FrezaPlataCaz, type RazaCaz } from './incrustatieDreapta.cazuri.ts';

export type RazaTrepte = RazaCaz & { readonly nivel: 'sus' | 'jos' };

export type CazTrepte = {
  readonly id: string;
  readonly desen: DesenO;
  /** Adâncimea locașului; la gaură, grosimea foii (operația scrie altă adâncime, pe care gaura o ignoră). */
  readonly D: number; readonly gaura?: true;
  readonly pas: number; readonly c: number;
  readonly d: number; readonly s: number; readonly spre: 'interior' | 'exterior';
  readonly dop: 'ridicat' | 'decupat';
  readonly sprijin: 'umar' | 'fund';
  readonly H: number; readonly g: number; readonly margine: number;
  /** Frezele locașului: prima, apoi cele de rest (dopul se taie cu ele). */
  readonly locas: readonly FrezaPlataCaz[];
  /** Pe hârtie: lungimea tijei și înălțimea dopului (tija + flanșa). */
  readonly tija: number; readonly h: number;
  readonly raze: readonly RazaTrepte[];
  readonly hartie: string;
};

const dreptunghi = (x: number, y: number, w: number, h: number): PunctO[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const L = (x: number, y: number): PunctO[] => [[x, y], [x + 16, y], [x + 16, y + 6], [x + 6, y + 6], [x + 6, y + 20], [x, y + 20]];

/** Unghiul dintre a − v și b − v, în radiani. */
function unghi(a: PunctO, v: PunctO, b: PunctO): number {
  const ux = a[0] - v[0], uy = a[1] - v[1], wx = b[0] - v[0], wy = b[1] - v[1];
  return Math.acos((ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy)));
}

const F6: FrezaPlataCaz = { numar: 1, diametru: 6, pasLateral: 2.4 };
const F3: FrezaPlataCaz = { numar: 1, diametru: 3, pasLateral: 1.2 };
const SQ = Math.SQRT2 - 1;
const S1 = stea(40, 40, 12, 5);
const alfa = unghi(S1[9]!, S1[0]!, S1[1]!); // vârful, 40,55°
const gamma = unghi(S1[0]!, S1[1]!, S1[2]!); // pana bazei, 112,55°
const sa = Math.sin(alfa / 2), sg = Math.sin(gamma / 2);
const u126: PunctO = [Math.cos((126 * Math.PI) / 180), Math.sin((126 * Math.PI) / 180)];

export const CAZURI_TREPTE: readonly CazTrepte[] = [
  {
    id: 'dreptunghi-umar', desen: [dreptunghi(30, 30, 40, 30)], D: 8, pas: 2.5, c: 0.1, d: 3, s: 5, spre: 'interior', dop: 'ridicat',
    sprijin: 'umar', H: 2, g: 0.5, margine: 5, locas: [F6], tija: 8 - 3 - 0.5, h: 8 - 3 - 0.5 + 3 + 2,
    raze: [
      { nivel: 'sus', p: [50, 45], d: [1, 0], lungime: 30, asteptat: 20, ce: 'peretele nivelului de sus, la x = 70' },
      { nivel: 'jos', p: [50, 45], d: [1, 0], lungime: 30, asteptat: 15, ce: 'peretele deschiderii, la x = 70 − s = 65' },
      { nivel: 'sus', p: [50, 45], d: [0, 1], lungime: 30, asteptat: 15, ce: 'peretele nivelului de sus, la y = 60' },
      { nivel: 'jos', p: [50, 45], d: [0, 1], lungime: 30, asteptat: 10, ce: 'peretele deschiderii, la y = 55' },
      { nivel: 'sus', p: [70, 60], d: [-1, -1], lungime: 5, asteptat: 3 * SQ, ce: 'colțul de sus, rotunjit cu R3' },
      { nivel: 'jos', p: [65, 55], d: [-1, -1], lungime: 5, asteptat: 3 * SQ, ce: 'colțul deschiderii (desenul micșorat cu 5), rotunjit cu R3' },
    ],
    hartie: 'exemplul din ADR 0175: 40 × 30, Ø6, c 0,1, umărul spre interior d 3, s 5, D 8, H 2, g 0,5, pe umăr: locașul 40 × 30 R3 până la 3, deschiderea 30 × 20 R3 până la 8; flanșa 39,8 × 29,8, groasă de 5; tija 29,8 × 19,8, lungă de 4,5; h = 9,5',
  },
  {
    id: 'dreptunghi-fund', desen: [dreptunghi(30, 30, 40, 30)], D: 8, pas: 2.5, c: 0.1, d: 3, s: 5, spre: 'interior', dop: 'ridicat',
    sprijin: 'fund', H: 2, g: 0.5, margine: 5, locas: [F6], tija: 8 - 3 + 0.5, h: 8 - 3 + 0.5 + (3 - 0.5) + 2,
    raze: [
      { nivel: 'sus', p: [50, 45], d: [1, 0], lungime: 30, asteptat: 20, ce: 'peretele nivelului de sus' },
      { nivel: 'jos', p: [50, 45], d: [1, 0], lungime: 30, asteptat: 15, ce: 'peretele deschiderii' },
    ],
    hartie: 'același dreptunghi, cu dopul pe fund: tija 8 − 3 + 0,5 = 5,5 stă pe fund, flanșa 3 − 0,5 + 2 = 4,5 lasă g = 0,5 deasupra umărului; h = D + H = 10',
  },
  {
    id: 'dreptunghi-decupat', desen: [dreptunghi(30, 30, 40, 30)], D: 8, pas: 2.5, c: 0.1, d: 3, s: 5, spre: 'interior', dop: 'decupat',
    sprijin: 'umar', H: 2, g: 0.5, margine: 8, locas: [F6], tija: 4.5, h: 9.5,
    raze: [{ nivel: 'jos', p: [50, 45], d: [1, 0], lungime: 30, asteptat: 15, ce: 'peretele deschiderii' }],
    hartie: 'același dreptunghi, cu dopul decupat: oglindit, cu tija în sus, flanșa decupată prin placa lui de exact 9,5 mm, cu punți; pe umăr',
  },
  {
    id: 'exterior', desen: [dreptunghi(40, 40, 30, 20)], D: 8, pas: 2.5, c: 0.1, d: 3, s: 4, spre: 'exterior', dop: 'ridicat',
    sprijin: 'umar', H: 2, g: 0.5, margine: 5, locas: [F6], tija: 4.5, h: 9.5,
    raze: [
      { nivel: 'sus', p: [55, 50], d: [1, 0], lungime: 30, asteptat: 19, ce: 'nivelul de sus, desenul lărgit cu s = 4: x = 74' },
      { nivel: 'jos', p: [55, 50], d: [1, 0], lungime: 30, asteptat: 15, ce: 'deschiderea, chiar desenul: x = 70' },
      { nivel: 'sus', p: [70, 60], d: [1, 1], lungime: 6, asteptat: 4, ce: 'colțul de sus, arcul de rază s = 4 (≥ R3) în jurul colțului desenului' },
      { nivel: 'jos', p: [70, 60], d: [-1, -1], lungime: 5, asteptat: 3 * SQ, ce: 'colțul deschiderii, rotunjit cu R3' },
    ],
    hartie: 'umărul spre exterior (ca fălțuirea unui geam): deschiderea 30 × 20 R3, nivelul de sus 38 × 28 R4; semifabricatul e cutia lărgită cu 4, plus marginea',
  },
  {
    id: 'stea', desen: [S1], D: 6, pas: 3, c: 0.1, d: 2, s: 1, spre: 'interior', dop: 'ridicat', sprijin: 'umar', H: 2, g: 0.5,
    margine: 5, locas: [F3], tija: 6 - 2 - 0.5, h: 6 - 2 - 0.5 + 2 + 2,
    raze: [
      { nivel: 'sus', p: S1[0]!, d: [0, -1], lungime: 6, asteptat: 1.5 / sa - 1.5, ce: 'vârful de sus, retras cu R / sin(α/2) − R' },
      { nivel: 'jos', p: S1[0]!, d: [0, -1], lungime: 10, asteptat: (1 + 1.5) / sa - 1.5, ce: 'vârful deschiderii: s / sin(α/2), apoi R / sin(α/2) − R' },
      { nivel: 'sus', p: [40, 40], d: u126, lungime: 8, asteptat: 5 + (1.4 / sg - 1.4), ce: 'unghiul intrând, închis cu ρ = 1,4 (intră în pană)' },
      { nivel: 'jos', p: [40, 40], d: u126, lungime: 8, asteptat: 5 - (1.4 - (1.4 - 1) / sg), ce: 'unghiul intrând al deschiderii: micșorat cu 1 (arc de rază 1), apoi închis cu ρ = 1,4' },
    ],
    hartie: 'steaua din prag (12 și 5, Ø3) cu umărul spre interior d 2, s 1: vârful de sus se retrage 2,829, al deschiderii 5,715; unghiul intrând: sus +0,283 în pană, jos 0,919 spre centru',
  },
  {
    id: 'inel', desen: [dreptunghi(120, 30, 20, 20), dreptunghi(127, 37, 6, 6)], D: 4, pas: 2, c: 0.1, d: 2, s: 1.5, spre: 'interior',
    dop: 'ridicat', sprijin: 'umar', H: 2, g: 0.5, margine: 5, locas: [F3], tija: 1.5, h: 5.5,
    raze: [
      { nivel: 'sus', p: [136.5, 40], d: [1, 0], lungime: 6, asteptat: 3.5, ce: 'peretele exterior de sus, x = 140' },
      { nivel: 'jos', p: [136.5, 40], d: [1, 0], lungime: 6, asteptat: 2, ce: 'peretele exterior al deschiderii, x = 138,5' },
      { nivel: 'sus', p: [136.5, 40], d: [-1, 0], lungime: 6, asteptat: 3.5, ce: 'insula, sus: x = 133' },
      { nivel: 'jos', p: [136.5, 40], d: [-1, 0], lungime: 6, asteptat: 2, ce: 'insula, la deschidere: golul lărgit cu s, x = 134,5' },
    ],
    hartie: 'o literă cu gol (pătratul de 20 cu golul de 6): umărul ocolește și insula; deschiderea e inelul 17 × 17 cu golul de 9',
  },
  {
    id: 'L', desen: [L(60, 80)], D: 4, pas: 2, c: 0.1, d: 2, s: 1, spre: 'interior', dop: 'ridicat', sprijin: 'umar', H: 2, g: 0.5,
    margine: 5, locas: [F3], tija: 1.5, h: 5.5,
    raze: [
      { nivel: 'sus', p: [63, 95], d: [1, 0], lungime: 5, asteptat: 3, ce: 'brațul vertical, sus: x = 66' },
      { nivel: 'jos', p: [63, 95], d: [1, 0], lungime: 5, asteptat: 2, ce: 'brațul vertical, deschiderea: x = 65' },
      { nivel: 'sus', p: [72, 83], d: [0, 1], lungime: 5, asteptat: 3, ce: 'brațul orizontal, sus: y = 86' },
      { nivel: 'jos', p: [72, 83], d: [0, 1], lungime: 5, asteptat: 2, ce: 'brațul orizontal, deschiderea: y = 85' },
    ],
    hartie: 'un L, nesimetric față de verticală: dopul în trepte e oglindit pe X (unul neoglindit nu se potrivește); brațele de 6, deschiderea de 4',
  },
  {
    // Două freze: tija se ocolește cu prima și cu cea de rest, flanșa se decupează cu cea mai mică (Ø2), ca la dopul decupat.
    id: 'L-decupat-rest', desen: [L(60, 80)], D: 4, pas: 2, c: 0.1, d: 2, s: 1, spre: 'interior', dop: 'decupat', sprijin: 'umar', H: 2,
    g: 0.5, margine: 5, locas: [F3, { numar: 2, diametru: 2, pasLateral: 0.8 }], tija: 1.5, h: 5.5,
    raze: [
      { nivel: 'sus', p: [66, 86], d: [1, 1], lungime: 2, asteptat: 0.9 * SQ, ce: 'unghiul intrând de sus, închis cu ρ = 1 − 0,1 = 0,9' },
      { nivel: 'jos', p: [63, 95], d: [1, 0], lungime: 5, asteptat: 2, ce: 'brațul vertical, deschiderea: x = 65' },
    ],
    hartie: 'L-ul decupat, cu o freză de rest Ø2: R = r = 1, ρ = 0,9; flanșa se decupează cu Ø2',
  },
  {
    id: 'gaura', desen: [dreptunghi(30, 30, 30, 20)], D: 10, gaura: true, pas: 2.5, c: 0.1, d: 3, s: 4, spre: 'interior', dop: 'ridicat',
    sprijin: 'umar', H: 2, g: 0.5, margine: 5, locas: [F6], tija: 10 - 3, h: 10 - 3 + 3 + 2,
    raze: [
      { nivel: 'sus', p: [45, 40], d: [1, 0], lungime: 20, asteptat: 15, ce: 'nivelul de sus, x = 60' },
      { nivel: 'jos', p: [45, 40], d: [1, 0], lungime: 20, asteptat: 11, ce: 'gaura de sub umăr, x = 56' },
    ],
    hartie: 'gaura în trepte prin foaia de 10: umărul d 3, s 4 spre interior; dopul pe umăr, tija T − d = 7, la nivel cu fața de jos; h = 12',
  },
  {
    id: 'gaura-exterior', desen: [dreptunghi(40, 40, 30, 20)], D: 10, gaura: true, pas: 2.5, c: 0.1, d: 3, s: 4, spre: 'exterior',
    dop: 'decupat', sprijin: 'umar', H: 2, g: 0.5, margine: 8, locas: [F6], tija: 7, h: 12,
    raze: [
      { nivel: 'sus', p: [55, 50], d: [1, 0], lungime: 30, asteptat: 19, ce: 'falțul, desenul lărgit cu 4' },
      { nivel: 'jos', p: [55, 50], d: [1, 0], lungime: 30, asteptat: 15, ce: 'gaura, chiar desenul' },
    ],
    hartie: 'fereastra: gaura cât desenul prin foaia de 10, falțul de 4 spre exterior, adânc de 3; dopul decupat, oglindit, tija 7 la nivel cu fața de jos',
  },
];
