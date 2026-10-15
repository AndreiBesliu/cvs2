/**
 * CORPUSUL oracolului SVG (felia 2.7c, ADR 0035), scris de mână, cu valorile pe hârtie lângă fiecare fișier. ZERO importuri
 * din `src/`. Convenția hârtiei: pagina `width="Wmm" height="Hmm" viewBox="0 0 W H"` dă x_mm = x, y_mm = H − y; fără
 * `viewBox`, unitatea e 1 px = 25,4 / pxPeTol mm (K96 = 0,26458333…, K72 = 0,35277777…).
 *
 * Fiecare caz are `hartie`: ce se știe fără program (refuzul, pagina, px, câte căi, tipurile segmentelor pe cale, câteva
 * vârfuri, `bulge`, numerele raportului diferite de 0 — toate celelalte trebuie să fie 0 —, laturile, `forma`, `nume`).
 * Testul (0) cere ca oracolul să dea exact hârtia; testul (a) cere ca aplicația să dea exact oracolul.
 *
 * Cazurile ocolesc ambiguitățile listate în antetul lui `svg.ts` (și în raport), cu excepția celor marcate „ALEGERE”.
 *
 * Sub-felia 2.3c-1 (ADR 0037 §11): secțiunea U (umplerea, golul sub rezoluție, praful) și numerele noi
 * (`inchise-de-umplere`, `inchise-la-usa`, `sub-rezolutie`); C12 (polilinia umplută se închide) și E36 (cercul de 0,003 mm
 * e praf; proba lui trece în E37) s-au schimbat odată cu contractul. Precizarea 13.10 (praful ieșirii normalizării): U24
 * (logoul VfB minim: bucla de închidere scoasă din normalizare, `prafNormalizare` 1), U25 (aceeași buclă fără normalizare:
 * rămâne) și U26 (un contur de 0,012 mm în ieșire: nu e praf).
 *
 * Sub-felia 2.3c-3 (ADR 0037 §11, partea a doua): căile deschise se importă (`inchis: false`, cu vârful final), deci
 * cazurile care așteptau subcăi deschise sărite așteaptă acum căi deschise: C11 (line), C24 și U23 (line degenerată: sub
 * 2 vârfuri distincte, sub 0,01 mm), U6–U10, U16, U17, U22 (valul lui CNC-referinta), H7 (doar linii: nu mai e `gol`).
 * Secțiunea L adaugă line, polyline, căile `fill: none` (cu cubice, arce, arce eliptice, oglindite), pragul degenerării,
 * fișierul doar din linii, imbricarea fără căi deschise, normalizarea fără ele și `gol` = nicio cale. Plafonul cu vârful
 * final stă în `svg.mari.oracol.test.ts` (are 50 000 de vârfuri).
 *
 * Precizarea 2.3c-6 (ADR 0037 §11, „Închiderea fără arie lasă o linie”, textul corectat de coordonator): secțiunea P (linia
 * umplută scrisă cu l / c / c cu zgomot / q / mânerele retrase, `M10 10 L60 10 Z` și `M10 10 L60 10 L10 10`, fâșiile de
 * 0,004 și 0,02 mm, praful înaintea liniei, coliniarul exact sub rezoluție, pragul de 0,005 mm, martorii negativi, linia
 * închisă de ușă, forma golită de normalizare). Cazurile schimbate: C16, C22 (liniile închise de autor: dus-întors, nu
 * degenerate), C25, C26 (triunghiul de 5e-10 mm e acum o linie, înaintea normalizării; proba K7 trece pe un L subțire, C27,
 * C28), N7, N8, L9 (forma golită de normalizare se numără și la `degenerate`). U12, U13 nu se schimbă (praful e întâi).
 */
import { arieRuns, caiFinaleO, CODURI_O, laturiO, prafNormalizareO, type CodRefuzO, type RaportO, type RezultatO, type VarfO } from './svg.ts';

export const K96 = 25.4 / 96;
export const K72 = 25.4 / 72;
const NS = 'xmlns="http://www.w3.org/2000/svg"';
export const svg = (atribute: string, corp: string): string => `<svg ${NS} ${atribute}>${corp}</svg>`;
/** Pagina în mm cu viewBox-ul egal: x_mm = x, y_mm = H − y. */
export const mm = (W: number, H: number, corp: string): string => svg(`width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"`, corp);
const p100 = (corp: string): string => mm(100, 100, corp);

export type Hartie = {
  cod?: CodRefuzO;
  /** Detaliul refuzului (codul entităților, `includeri`). */
  detaliu?: string;
  pagina?: { latime: number; inaltime: number } | null;
  px?: boolean;
  illustrator?: boolean;
  cai?: number;
  tipuri?: string[];
  /** [cale, vârf, x, y] în mm. */
  varfuri?: Array<[number, number, number, number]>;
  /** [cale, vârf, bulge]. */
  bulge?: Array<[number, number, number]>;
  /** Numerele diferite de 0; restul trebuie să fie 0. */
  avertismente?: Partial<RaportO>;
  /** Sub-felia 2.3c-3: o cale deschisă n-are latură din imbricare, are `pe-linie`. */
  laturi?: Array<'exterior' | 'interior' | 'pe-linie'>;
  forme?: number[];
  /** Sub-felia 2.3c-3 (ADR 0037 §11): `inchis` al fiecărei căi, în ordine (false = cale deschisă, cu vârful final). */
  inchis?: boolean[];
  nume?: Array<string | undefined>;
  /**
   * Felia 2.7d (ADR 0036): ce rămâne după normalizarea formelor nonzero (căile, laturile lor, aria regiunii: exterioarele
   * plus, interioarele minus). Câmpurile de mai sus (`cai`, `tipuri`, `varfuri`, `laturi`) descriu citirea 2.7c, înainte
   * de normalizare; `avertismente['nonzero-normalizate']` = câte forme TREBUIE schimbate (predicția oracolului).
   */
  final?: { cai?: number; laturi?: Array<'exterior' | 'interior' | 'pe-linie'>; arie?: number };
  /** Câte dintre formele de schimbat le refuză normalizarea (ADR 0036 §8: cazurile pe care ADR-ul le numește), citite evenodd. */
  nonzeroRefuzate?: number;
  /**
   * Sub-felia 2.3c-1 (ADR 0037 §11): golurile (mm) subcăilor închise de ușă (umplerea sau golul sub rezoluție) care au
   * devenit căi, în ordinea căilor; și golul cel mai mare al celor închise la ușă (`fill: none`).
   */
  goluri?: number[];
  golLaUsa?: number;
  /**
   * ADR 0037 §11 (precizarea 13.10): câte contururi de praf scoate ușa din ieșirea normalizării nonzero (numărate și ele
   * la `sub-rezolutie`, peste subcăile-praf din `avertismente`).
   */
  prafNormalizare?: number;
};
export type CazSvg = {
  readonly nume: string;
  readonly text?: string;
  readonly octeti?: () => Uint8Array;
  readonly px?: 96 | 72;
  /** Limba aplicației pentru `systemLanguage` (implicit 'en'). */
  readonly limba?: string;
  readonly hartie: Hartie;
  /** Laturile nu se judecă (vârful de start stă pe granița altei căi: §8 nu o hotărăște). */
  readonly faraLaturi?: boolean;
};

const R4 = (x: number, y: number, w: number, h: number, H = 100): Array<[number, number]> =>
  [[x, H - y], [x + w, H - y], [x + w, H - y - h], [x, H - y - h]];
const varfuriRect = (cale: number, x: number, y: number, w: number, h: number, H = 100): Array<[number, number, number, number]> =>
  R4(x, y, w, h, H).map(([a, b], i) => [cale, i, a, b]);

const tan8 = Math.tan(Math.PI / 8);
const tan4 = Math.tan(Math.PI / 4);
/** Un L de 5e-10 mm grosime, cu laturile de 20 mm (C27, C28): subțire sub τ, dar nu pe o dreaptă (precizarea 2.3c-6). */
const L_SUBTIRE = '0,10 20,10 20,30 19.9999999995,30 19.9999999995,10.0000000005 0,10.0000000005';

// ---------------------------------------------------------------------------------------------------------------------
// A. Unitățile și pagina.

const A: CazSvg[] = [
  { nume: 'A1 mm + viewBox', text: mm(100, 50, '<rect x="10" y="10" width="20" height="10"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: false, illustrator: false, cai: 1, tipuri: ['LLLL'], varfuri: varfuriRect(0, 10, 10, 20, 10, 50), laturi: ['exterior'], forme: [0], nume: [undefined] } },
  { nume: 'A2 cm', text: svg('width="10cm" height="5cm" viewBox="0 0 100 50"', '<rect x="10" y="10" width="20" height="10"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: false, varfuri: varfuriRect(0, 10, 10, 20, 10, 50) } },
  { nume: 'A3 in', text: svg('width="2in" height="1in" viewBox="0 0 2 1"', '<rect x="0.5" y="0.25" width="1" height="0.5"/>'),
    hartie: { pagina: { latime: 50.8, inaltime: 25.4 }, px: false, varfuri: [[0, 0, 12.7, 19.05], [0, 1, 38.1, 19.05], [0, 2, 38.1, 6.35], [0, 3, 12.7, 6.35]] } },
  { nume: 'A4 pt', text: svg('width="72pt" height="36pt" viewBox="0 0 72 36"', '<rect x="36" y="0" width="36" height="18"/>'),
    hartie: { pagina: { latime: 25.4, inaltime: 12.7 }, px: false, varfuri: [[0, 0, 12.7, 12.7], [0, 1, 25.4, 12.7], [0, 2, 25.4, 6.35], [0, 3, 12.7, 6.35]] } },
  { nume: 'A5 pc', text: svg('width="6pc" height="3pc" viewBox="0 0 6 3"', '<rect x="3" y="0" width="3" height="1.5"/>'),
    hartie: { pagina: { latime: 25.4, inaltime: 12.7 }, px: false, varfuri: [[0, 0, 12.7, 12.7], [0, 1, 25.4, 12.7], [0, 2, 25.4, 6.35]] } },
  { nume: 'A6 Q', text: svg('width="400Q" height="200Q" viewBox="0 0 100 50"', '<rect x="10" y="10" width="20" height="10"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: false, varfuri: varfuriRect(0, 10, 10, 20, 10, 50) } },
  { nume: 'A7 unități cu majuscule', text: svg('width="100MM" height="50Mm" viewBox="0 0 100 50"', '<rect x="10" y="10" width="20" height="10"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: false, varfuri: varfuriRect(0, 10, 10, 20, 10, 50) } },
  { nume: 'A8 px la 96', text: svg('width="96px" height="48px"', '<rect x="48" y="0" width="48" height="24"/>'),
    hartie: { pagina: { latime: 25.4, inaltime: 12.7 }, px: true, varfuri: [[0, 0, 12.7, 12.7], [0, 1, 25.4, 12.7], [0, 2, 25.4, 6.35], [0, 3, 12.7, 6.35]] } },
  { nume: 'A9 px la 72', px: 72, text: svg('width="96px" height="48px"', '<rect x="48" y="0" width="48" height="24"/>'),
    hartie: { pagina: { latime: 96 * K72, inaltime: 48 * K72 }, px: true, varfuri: [[0, 0, 48 * K72, 48 * K72], [0, 1, 96 * K72, 48 * K72], [0, 2, 96 * K72, 24 * K72]] } },
  { nume: 'A10 fără unitate la 72', px: 72, text: svg('width="72" height="36"', '<rect width="72" height="36"/>'),
    hartie: { pagina: { latime: 25.4, inaltime: 12.7 }, px: true, varfuri: [[0, 0, 0, 12.7], [0, 1, 25.4, 12.7], [0, 2, 25.4, 0], [0, 3, 0, 0]] } },
  { nume: 'A11 doar viewBox la 96', text: svg('viewBox="0 0 96 48"', '<rect width="96" height="48"/>'),
    hartie: { pagina: { latime: 25.4, inaltime: 12.7 }, px: true, varfuri: [[0, 0, 0, 12.7], [0, 2, 25.4, 0]] } },
  { nume: 'A12 doar viewBox la 72', px: 72, text: svg('viewBox="0 0 96 48"', '<rect width="96" height="48"/>'),
    hartie: { pagina: { latime: 96 * K72, inaltime: 48 * K72 }, px: true, varfuri: [[0, 0, 0, 48 * K72], [0, 2, 96 * K72, 0]] } },
  { nume: 'A13 viewBox decalat', text: svg('width="100mm" height="100mm" viewBox="50 50 100 100"', '<rect x="60" y="60" width="10" height="10"/>'),
    hartie: { pagina: { latime: 100, inaltime: 100 }, px: false, varfuri: [[0, 0, 10, 90], [0, 1, 20, 90], [0, 2, 20, 80], [0, 3, 10, 80]] } },
  { nume: 'A14 fără mărime (y = −y·k)', text: svg('', '<rect x="10" y="20" width="30" height="40"/>'),
    hartie: { pagina: null, px: true, avertismente: { 'pagina-fara-marime': 1 }, varfuri: [[0, 0, 10 * K96, -20 * K96], [0, 1, 40 * K96, -20 * K96], [0, 2, 40 * K96, -60 * K96], [0, 3, 10 * K96, -60 * K96]] } },
  { nume: 'A15 o singură latură, fără viewBox: fără mărime (precizarea 12.10)', text: svg('width="100mm"', '<rect x="10" y="20" width="30" height="40"/>'),
    hartie: { pagina: null, px: true, avertismente: { 'pagina-fara-marime': 1 }, varfuri: [[0, 0, 10 * K96, -20 * K96], [0, 2, 40 * K96, -60 * K96]] } },
  // Revizia 12.10 (dimensionarea intrinsecă): W = 100 mm, H = 100 · 50 / 100 = 50 mm; scara 1; px = false.
  { nume: 'A16 o latură absolută + viewBox: cealaltă din raport', text: svg('width="100mm" viewBox="0 0 100 50"', '<rect width="100" height="50"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: false, varfuri: [[0, 0, 0, 50], [0, 1, 100, 50], [0, 2, 100, 0]] } },
  // H = 40 mm, W = 40 · 200 / 100 = 80 mm; scara 0,4.
  { nume: 'A26 doar înălțimea + viewBox: lățimea din raport', text: svg('height="40mm" viewBox="0 0 200 100"', '<rect width="200" height="100"/>'),
    hartie: { pagina: { latime: 80, inaltime: 40 }, px: false, varfuri: [[0, 0, 0, 40], [0, 1, 80, 40], [0, 2, 80, 0]] } },
  { nume: 'A27 lățimea în % lipsește: din raport, fără avertisment', text: svg('width="50%" height="40mm" viewBox="0 0 200 100"', '<rect width="200" height="100"/>'),
    hartie: { pagina: { latime: 80, inaltime: 40 }, px: false, varfuri: [[0, 1, 80, 40]] } },
  // W = 300 px = 79,375 mm la 96; H = 39,6875; scara 0,396875; px = true (latura dată în px).
  { nume: 'A28 o latură în px + viewBox: din raport, px = true', text: svg('width="300px" viewBox="0 0 200 100"', '<rect width="200" height="100"/>'),
    hartie: { pagina: { latime: 300 * K96, inaltime: 150 * K96 }, px: true, varfuri: [[0, 0, 0, 150 * K96], [0, 1, 300 * K96, 150 * K96], [0, 2, 300 * K96, 0]] } },
  { nume: 'A29 % pe ambele, fără viewBox: fără mărime', text: svg('width="100%" height="100%"', '<rect x="10" y="20" width="30" height="40"/>'),
    hartie: { pagina: null, px: true, avertismente: { 'pagina-fara-marime': 1 }, varfuri: [[0, 0, 10 * K96, -20 * K96]] } },
  { nume: 'A17 latura în px + viewBox: px = true', text: svg('width="100mm" height="378px" viewBox="0 0 100 100"', '<rect width="100" height="100"/>'),
    hartie: { pagina: { latime: 100, inaltime: 378 * K96 }, px: true } },
  { nume: 'A18 viewBox negativ: ignorat, cu avertisment', text: svg('width="100mm" height="50mm" viewBox="0 0 -100 50"', '<rect width="96" height="48"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: true, avertismente: { 'viewbox-invalid': 1 }, varfuri: [[0, 0, 0, 50], [0, 1, 25.4, 50], [0, 2, 25.4, 37.3]] } },
  { nume: 'A19 viewBox cu trei numere', text: svg('width="100mm" height="50mm" viewBox="0 0 100"', '<rect width="96" height="48"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: true, avertismente: { 'viewbox-invalid': 1 }, varfuri: [[0, 2, 25.4, 37.3]] } },
  { nume: 'A20 viewBox cu virgule', text: svg('width="100mm" height="50mm" viewBox="0,0,100,50"', '<rect x="10" y="10" width="20" height="10"/>'),
    hartie: { pagina: { latime: 100, inaltime: 50 }, px: false, varfuri: varfuriRect(0, 10, 10, 20, 10, 50) } },
  { nume: 'A21 unitățile formei: 10mm = 37,8 px, la 72 dă 13,33 mm (96 px pe țol oricare ar fi pxPeTol)', px: 72, text: svg('width="100mm" height="100mm"', '<rect width="10mm" height="10mm"/>'),
    hartie: { pagina: { latime: 100, inaltime: 100 }, px: true, varfuri: [[0, 0, 0, 100], [0, 1, 40 / 3, 100], [0, 2, 40 / 3, 100 - 40 / 3]] } },
  { nume: 'A22 unitățile formei la 96: 10 mm', text: svg('width="100mm" height="100mm"', '<rect width="10mm" height="10mm"/>'),
    hartie: { pagina: { latime: 100, inaltime: 100 }, px: true, varfuri: [[0, 1, 10, 100], [0, 2, 10, 90]] } },
  { nume: 'A23 1in pe un rect într-o pagină de mm = 96 mm', text: p100('<rect width="1in" height="0.5in"/>'),
    hartie: { px: false, varfuri: [[0, 0, 0, 100], [0, 1, 96, 100], [0, 2, 96, 52], [0, 3, 0, 52]] } },
  { nume: 'A24 BOM UTF-8 și id cu diacritice', octeti: () => new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(p100('<rect id="ușă" width="10" height="10"/>'))]),
    hartie: { cai: 1, nume: ['ușă'] } },
  { nume: 'A25 id lung: tăiat la 200', text: p100(`<rect id="${'x'.repeat(250)}" width="10" height="10"/>`),
    hartie: { cai: 1, nume: ['x'.repeat(200)] } },
];

// ---------------------------------------------------------------------------------------------------------------------
// B. preserveAspectRatio (viewBox 10 × 10, pătratul întreg).

const pagPar = (W: number, H: number, par: string | null, corp = '<rect width="10" height="10"/>'): string =>
  svg(`width="${W}mm" height="${H}mm" viewBox="0 0 10 10"${par === null ? '' : ` preserveAspectRatio="${par}"`}`, corp);
/** Pătratul viewBox-ului la scara s, cu colțul stânga-sus (x0, ysus) în mm cu Y în sus. */
const patrat = (x0: number, ysus: number, s: number): Array<[number, number, number, number]> =>
  [[0, 0, x0, ysus], [0, 1, x0 + 10 * s, ysus], [0, 2, x0 + 10 * s, ysus - 10 * s], [0, 3, x0, ysus - 10 * s]];

const B: CazSvg[] = [
  { nume: 'B1 implicit = xMidYMid meet', text: pagPar(100, 50, null), hartie: { varfuri: patrat(25, 50, 5) } },
  { nume: 'B2 xMinYMin meet', text: pagPar(100, 50, 'xMinYMin meet'), hartie: { varfuri: patrat(0, 50, 5) } },
  { nume: 'B3 xMidYMid', text: pagPar(100, 50, 'xMidYMid'), hartie: { varfuri: patrat(25, 50, 5) } },
  { nume: 'B4 xMaxYMid', text: pagPar(100, 50, 'xMaxYMid'), hartie: { varfuri: patrat(50, 50, 5) } },
  { nume: 'B5 xMidYMin (pagina înaltă)', text: pagPar(50, 100, 'xMidYMin'), hartie: { varfuri: patrat(0, 100, 5) } },
  { nume: 'B6 xMinYMid (pagina înaltă)', text: pagPar(50, 100, 'xMinYMid'), hartie: { varfuri: patrat(0, 75, 5) } },
  { nume: 'B7 xMaxYMax (pagina înaltă)', text: pagPar(50, 100, 'xMaxYMax meet'), hartie: { varfuri: patrat(0, 50, 5) } },
  { nume: 'B8 xMidYMid slice', text: pagPar(100, 50, 'xMidYMid slice'), hartie: { varfuri: patrat(0, 75, 10) } },
  { nume: 'B9 xMinYMin slice', text: pagPar(100, 50, 'xMinYMin slice'), hartie: { varfuri: patrat(0, 50, 10) } },
  { nume: 'B10 xMaxYMax slice', text: pagPar(100, 50, 'xMaxYMax slice'), hartie: { varfuri: patrat(0, 100, 10) } },
  { nume: 'B11 xMaxYMin slice (pagina înaltă)', text: pagPar(50, 100, 'xMaxYMin slice'), hartie: { varfuri: patrat(-50, 100, 10) } },
  { nume: 'B12 defer xMinYMax meet', text: pagPar(50, 100, 'defer xMinYMax meet'), hartie: { varfuri: patrat(0, 50, 5) } },
  // none: sx = 10, sy = 5; cercul r = 4 devine elipsa 40 × 20 mm: σ = 40, φ = (1e-6 / (1,82e-5 · 40))^(1/6) = 0,33341 rad,
  // n = ⌈π / φ⌉ = 10 pe fiecare jumătate (ALEGERE: două arce), deci 20 de cubice.
  { nume: 'B13 none: neuniform, cercul devine cubice', text: pagPar(100, 50, 'none', '<rect width="10" height="10"/><circle cx="5" cy="5" r="4"/>'),
    hartie: { cai: 2, tipuri: ['LLLL', 'C'.repeat(20)], varfuri: [[0, 0, 0, 50], [0, 1, 100, 50], [0, 2, 100, 0], [1, 0, 90, 25], [1, 10, 10, 25]], avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 20 }, laturi: ['exterior', 'interior'] } },
];

// ---------------------------------------------------------------------------------------------------------------------
// C. Formele și regulile lor (SVG 2), în pagina de 100 × 100 mm.

const C: CazSvg[] = [
  // rx = ry = 5: start (15, 10) → (15, 90); bulge = tan(22,5°) · semn(det) = −0,41421 (pagina oglindește).
  { nume: 'C1 rect cu rx = ry: LALALALA', text: p100('<rect x="10" y="10" width="40" height="20" rx="5"/>'),
    hartie: { tipuri: ['LALALALA'], varfuri: [[0, 0, 15, 90], [0, 1, 45, 90], [0, 2, 50, 85], [0, 3, 50, 75], [0, 4, 45, 70], [0, 5, 15, 70], [0, 6, 10, 75], [0, 7, 10, 85]], bulge: [[0, 1, -tan8], [0, 3, -tan8], [0, 5, -tan8], [0, 7, -tan8]] } },
  // ry ia rx = 50, apoi fiecare tăiat: rx = 10, ry = 5; liniile devin nule (scoase): patru sferturi eliptice.
  // σ = 10: φ = (1e-6 / 1,82e-4)^(1/6) = 0,42008, n = ⌈(π/2) / φ⌉ = 4 pe sfert.
  { nume: 'C2 rect cu rx mare: tăiat, liniile nule scoase, elipsă din 16 cubice', text: p100('<rect width="20" height="10" rx="50"/>'),
    hartie: { tipuri: ['C'.repeat(16)], varfuri: [[0, 0, 10, 100], [0, 4, 20, 95], [0, 8, 10, 90], [0, 12, 0, 95]], avertismente: { 'arce-eliptice': 4, 'cubice-din-arce': 16 } } },
  { nume: 'C3 rect stadion: rx = h/2, verticalele nule scoase', text: p100('<rect width="40" height="10" rx="5"/>'),
    hartie: { tipuri: ['LAALAA'], varfuri: [[0, 0, 5, 100], [0, 1, 35, 100], [0, 2, 40, 95], [0, 3, 35, 90], [0, 4, 5, 90], [0, 5, 0, 95]], bulge: [[0, 1, -tan8], [0, 2, -tan8]] } },
  // rx = 4, ry = 2: σ = 4, φ = 0,48939, n = ⌈1,5708 / 0,48939⌉ = 4.
  { nume: 'C4 rect cu rx ≠ ry: colțuri eliptice', text: p100('<rect x="10" y="10" width="40" height="20" rx="4" ry="2"/>'),
    hartie: { tipuri: ['LCCCCLCCCCLCCCCLCCCC'], varfuri: [[0, 0, 14, 90], [0, 1, 46, 90], [0, 5, 50, 88]], avertismente: { 'arce-eliptice': 4, 'cubice-din-arce': 16 } } },
  { nume: 'C5 rect: lățimea 0 și lipsa sar în tăcere; negativul, procentul, em și textul sunt atribut-invalid', text: p100('<rect width="0" height="5"/><rect height="5"/><rect width="-5" height="5"/><rect width="10%" height="5"/><rect width="1em" height="5"/><rect width="abc" height="5"/><rect x="1" y="1" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [6], avertismente: { 'atribut-invalid': 4 }, varfuri: [[0, 0, 1, 99]] } },
  { nume: 'C6 cercul: două arce de 180°, din (cx + r, cy), în sensul unghiului crescător SVG', text: p100('<circle cx="50" cy="50" r="10"/>'),
    hartie: { tipuri: ['AA'], varfuri: [[0, 0, 60, 50], [0, 1, 40, 50]], bulge: [[0, 0, -tan4], [0, 1, -tan4]] } },
  { nume: 'C7 cercul: r 0 și lipsă în tăcere, r negativ și r cu procent atribut-invalid', text: p100('<circle r="0"/><circle cx="5"/><circle r="-1"/><circle r="5%"/><circle cx="50" cy="50" r="10"/>'),
    hartie: { cai: 1, forme: [4], avertismente: { 'atribut-invalid': 2 } } },
  // σ = 20: φ = 0,37425, n = ⌈π / φ⌉ = 9 pe jumătate.
  { nume: 'C8 elipsa: două jumătăți eliptice, 18 cubice', text: p100('<ellipse cx="50" cy="50" rx="20" ry="10"/>'),
    hartie: { tipuri: ['C'.repeat(18)], varfuri: [[0, 0, 70, 50], [0, 9, 30, 50]], avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 18 } } },
  { nume: 'C9 elipsa cu un singur rx: e cerc (arce)', text: p100('<ellipse cx="50" cy="50" rx="10"/><ellipse cx="20" cy="20" ry="5"/>'),
    hartie: { tipuri: ['AA', 'AA'], varfuri: [[0, 0, 60, 50], [1, 0, 25, 80]] } },
  // Revizia 12.10 (ca în Edge): rx negativ = lipsă, deci ia ry = 3: un cerc (arce), din (3, 0) → (3, 100).
  { nume: 'C10 elipsa: rx 0 și ambele lipsă în tăcere; rx negativ ia ry', text: p100('<ellipse rx="0" ry="5"/><ellipse cx="3"/><ellipse rx="-2" ry="3"/><rect x="20" width="5" height="5"/>'),
    hartie: { cai: 2, forme: [2, 3], tipuri: ['AA', 'LLLL'], varfuri: [[0, 0, 3, 100], [0, 1, -3, 100]] } },
  { nume: 'C20 rect: rx „auto” / necitibil = 0 (colțuri drepte), rx negativ = lipsă (ia ry), ry negativ singur = fără colțuri', text: p100('<rect rx="auto" ry="5" width="20" height="10"/><rect x="30" rx="abc" width="20" height="10"/><rect x="60" y="20" rx="-3" ry="4" width="20" height="10"/><rect x="60" y="50" ry="-3" width="20" height="10"/>'),
    hartie: { cai: 4, tipuri: ['LLLL', 'LLLL', 'LALALALA', 'LLLL'], varfuri: [[0, 0, 0, 100], [2, 0, 64, 80], [2, 1, 76, 80], [3, 0, 60, 50]], bulge: [[2, 1, -tan8]] } },
  { nume: 'C21 elipsa: rx necitibil = 0, deci sărită în tăcere', text: p100('<ellipse rx="abc" ry="5" cx="50" cy="50"/><ellipse rx="auto" ry="5" cx="50" cy="50"/><rect width="5" height="5"/>'),
    hartie: { cai: 1, forme: [2] } },
  // Sub-felia 2.3c-3 (ADR 0037 §11): orice `line` e o cale deschisă, cu vârful final (segmentul L); înainte era sărită.
  { nume: 'C11 line: o cale deschisă (2.3c-3; înainte sărită)', text: p100('<line x1="0" y1="0" x2="10" y2="10"/><rect width="5" height="5"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LL', 'LLLL'], inchis: [false, true], varfuri: [[0, 0, 0, 100], [0, 1, 10, 90]], laturi: ['pe-linie', 'exterior'], avertismente: { deschise: 1 } } },
  // Sub-felia 2.3c-1 (ADR 0037 §11): prima polilinie e umplută (implicit), deci se închide cu o linie (golul √200 mm);
  // în 2.7c era deschisă (sărită, `deschise`).
  { nume: 'C12 polyline umplută fără întoarcere (2.3c-1: închisă de umplere) și închisă prin apropiere', text: p100('<polyline points="0,0 10,0 10,10"/><polyline points="20,20 30,20 30,30 20,20"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLL', 'LLL'], varfuri: [[0, 0, 0, 100], [0, 1, 10, 100], [0, 2, 10, 90], [1, 0, 20, 80], [1, 1, 30, 80], [1, 2, 30, 70]], avertismente: { 'inchise-de-umplere': 1 }, goluri: [Math.SQRT2 * 10] } },
  { nume: 'C13 polygon: linia de închidere', text: p100('<polygon points="10,10 20,10 15,20"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 0, 10, 90], [0, 1, 20, 90], [0, 2, 15, 80]] } },
  { nume: 'C14 polygon cu număr impar: punctele dinaintea erorii', text: p100('<polygon points="10,10 20,10 15,20 30"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 2, 15, 80]], avertismente: { 'eroare-date': 1 } } },
  { nume: 'C15 polygon cu o eroare la mijloc', text: p100('<polygon points="10,10 20,10 15,20 x 40,40"/>'),
    hartie: { tipuri: ['LLL'], avertismente: { 'eroare-date': 1 } } },
  // Revizia 12.10: doar din linii, toate pe o dreaptă = degenerată (n-are arie). Precizarea 2.3c-6 (ADR 0037 §11, punctul
  // 2): închise de autor, sunt LINII, cu drumul înapoi până în start: vârfurile subcăii, linia de închidere a lui Z și
  // vârful final în start. (0, 0) → (0, 100); (0, 40) (10, 50) (20, 60) (5, 45) → (0, 60) (10, 50) (20, 40) (5, 55).
  { nume: 'C16 polygon dus-întors, trei puncte pe dreaptă, M L Z (2.3c-6: linii dus-întors; înainte degenerate)', text: p100('<polygon points="0,0 10,0"/><polygon points="0,20 10,20 20,20"/><path d="M 30 30 L 40 30 Z"/><polygon points="0,40 10,50 20,60 5,45"/><rect x="50" y="50" width="5" height="5"/>'),
    hartie: { cai: 5, forme: [0, 1, 2, 3, 4], tipuri: ['LLL', 'LLLL', 'LLL', 'LLLLL', 'LLLL'], inchis: [false, false, false, false, true],
      varfuri: [[0, 0, 0, 100], [0, 1, 10, 100], [0, 2, 0, 100], [1, 0, 0, 80], [1, 2, 20, 80], [1, 3, 0, 80], [2, 0, 30, 70], [2, 1, 40, 70], [2, 2, 30, 70], [3, 0, 0, 60], [3, 1, 10, 50], [3, 2, 20, 40], [3, 3, 5, 55], [3, 4, 0, 60]],
      laturi: ['pe-linie', 'pe-linie', 'pe-linie', 'pe-linie', 'exterior'], avertismente: { deschise: 4 } } },
  // D = 20 mm: abaterea 1e-12 mm ≤ 1e-12 · 20 (pe dreaptă, punctul 2), 1e-9 mm nu (dar ≤ 0,005 mm: punctul 4). Precizarea
  // 2.3c-6: amândouă sunt linii închise de autor (polygon), cu drumul înapoi; pragul de 1e-12 se vede doar sub rezoluție
  // (P11). Felia 2.7d: a doua e evenodd (proba pragului 2.7c); n-are importanță: liniile nu intră în normalizare.
  { nume: 'C22 coliniar la 1e-12 din mărime și la 1e-9: amândouă linii dus-întors (2.3c-6; înainte degenerată / cale)', text: p100('<polygon points="0,0 10,0 20,0.000000000001"/><polygon fill-rule="evenodd" points="0,10 10,10 20,10.000000001"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLL', 'LLLL'], inchis: [false, false], varfuri: [[0, 0, 0, 100], [0, 2, 20, 100], [0, 3, 0, 100], [1, 0, 0, 90], [1, 2, 20, 90], [1, 3, 0, 90]], laturi: ['pe-linie', 'pe-linie'], avertismente: { deschise: 2 } } },
  // ADR 0036 §6 (amendamentul K7, fosta constatare K7): triunghiul de 5e-10 mm (τ ≈ 2e-9) ieșea gol din normalizare.
  // Precizarea 2.3c-6: toate punctele lui stau la 5e-10 mm ≤ 0,005 mm de dreaptă (punctul 4), deci e o linie (închisă de
  // autor: cu drumul înapoi), înaintea normalizării. Proba K7 trece pe un L subțire (C27, C28: nu e pe o dreaptă).
  { nume: 'C25 triunghiul de 5e-10 mm, nonzero, singur: o linie dus-întors (2.3c-6; înainte gol, K7)', text: p100('<polygon points="0,10 10,10 20,10.000000001"/>'),
    hartie: { cai: 1, tipuri: ['LLLL'], inchis: [false], varfuri: [[0, 0, 0, 90], [0, 1, 10, 90], [0, 2, 20, 90], [0, 3, 0, 90]], laturi: ['pe-linie'], avertismente: { deschise: 1 } } },
  { nume: 'C26 triunghiul de 5e-10 mm lângă un dreptunghi: linia și dreptunghiul (2.3c-6; înainte triunghiul dispărea)', text: p100('<polygon points="0,10 10,10 20,10.000000001"/><rect x="50" y="50" width="10" height="10"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLL', 'LLLL'], inchis: [false, true], laturi: ['pe-linie', 'exterior'], avertismente: { deschise: 1 }, final: { cai: 2, laturi: ['pe-linie', 'exterior'], arie: 100 } } },
  // ADR 0036 §6 (K7) după 2.3c-6: un L de 5e-10 mm grosime (20 + 20 mm) nu e pe o dreaptă (colțul (20, 90) stă la 14,1 mm de
  // dreapta capetelor), deci rămâne contur: un singur contur simplu, deja evenodd, cu martor la τ (≈ 2,8e-9 mm) și nicio
  // sondă umplută dincolo de τ: iese gol (numărat nonzero-normalizate și, din 2.3c-6, degenerate) sau poate rămâne.
  // Golul ultimului punct (5e-10 mm ≤ TOLERANTA_IMPORT) închide prin apropiere: 5 vârfuri.
  { nume: 'C27 un L de 5e-10 mm, nonzero, singur: gol, nonzero-normalizate și degenerate (§6, K7; 2.3c-6)', text: p100(`<polygon points="${L_SUBTIRE}"/>`),
    hartie: { cod: 'gol', avertismente: { 'nonzero-normalizate': 1, degenerate: 1 } } },
  { nume: 'C28 un L de 5e-10 mm lângă un dreptunghi: L-ul dispare (numărat de două ori), dreptunghiul rămâne', text: p100(`<polygon points="${L_SUBTIRE}"/><rect x="50" y="50" width="10" height="10"/>`),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLLL', 'LLLL'], avertismente: { 'nonzero-normalizate': 1, degenerate: 1 }, final: { cai: 1, laturi: ['exterior'], arie: 100 } } },
  { nume: 'C23 polygon cu un punct, M Z, M L-nul Z: degenerate (fosta constatare K2)', text: p100('<polygon points="5,5"/><path d="M 20 20 Z"/><path d="M 30 30 L 30 30 Z"/><rect x="50" y="50" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [3], avertismente: { degenerate: 3 } } },
  // 2.3c-3: calea deschisă cu mai puțin de 2 vârfuri distincte e degenerată (ADR 0037 §11).
  { nume: 'C24 line de lungime 0: degenerată (2.3c-3; înainte sărită ca deschisă)', text: p100('<line x1="5" y1="5" x2="5" y2="5"/><rect width="5" height="5"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { degenerate: 1 } } },
  { nume: 'C17 polygon cu un punct repetat: linia nulă scoasă', text: p100('<polygon points="0,0 10,0 10,0 10,10"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 0, 0, 100], [0, 1, 10, 100], [0, 2, 10, 90]] } },
  { nume: 'C18 polyline închisă prin apropiere în mm (gol 1e-7 px ≤ 1e-6 mm)', text: svg('width="100" height="100"', '<polyline points="10,10 20,10 20,20 10.0000001,10"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 0, 10 * K96, 90 * K96]] } },
  { nume: 'C19 subcale închisă de 1e-7: sub 2 vârfuri, degenerată', text: p100('<path d="M0 0 L 1e-7 0 Z"/><rect width="5" height="5"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { degenerate: 1 } } },
];

// ---------------------------------------------------------------------------------------------------------------------
// D. Transformările.

const D: CazSvg[] = [
  { nume: 'D1 translate pe grup', text: p100('<g transform="translate(10,20)"><rect width="10" height="5"/></g>'),
    hartie: { varfuri: [[0, 0, 10, 80], [0, 1, 20, 80], [0, 2, 20, 75], [0, 3, 10, 75]] } },
  { nume: 'D2 scale(2)', text: p100('<rect transform="scale(2)" x="1" y="1" width="5" height="5"/>'),
    hartie: { varfuri: [[0, 0, 2, 98], [0, 1, 12, 98], [0, 2, 12, 88], [0, 3, 2, 88]] } },
  { nume: 'D3 scale(2, 3)', text: p100('<rect transform="scale(2 3)" x="1" y="1" width="5" height="5"/>'),
    hartie: { varfuri: [[0, 0, 2, 97], [0, 1, 12, 97], [0, 2, 12, 82], [0, 3, 2, 82]] } },
  { nume: 'D4 rotate(90): (x, y) → (−y, x)', text: p100('<rect transform="rotate(90)" x="10" y="-30" width="10" height="5"/>'),
    hartie: { varfuri: [[0, 0, 30, 90], [0, 1, 30, 80], [0, 2, 25, 80], [0, 3, 25, 90]] } },
  { nume: 'D5 rotate(90, 50, 50)', text: p100('<rect transform="rotate(90, 50, 50)" x="60" y="50" width="10" height="5"/>'),
    hartie: { varfuri: [[0, 0, 50, 40], [0, 1, 50, 30], [0, 2, 45, 30], [0, 3, 45, 40]] } },
  { nume: 'D6 skewX(45): (x + y, y)', text: p100('<rect transform="skewX(45)" x="0" y="10" width="10" height="10"/>'),
    hartie: { varfuri: [[0, 0, 10, 90], [0, 1, 20, 90], [0, 2, 30, 80], [0, 3, 20, 80]] } },
  { nume: 'D7 skewY(45): (x, y + x)', text: p100('<rect transform="skewY(45)" x="10" y="0" width="10" height="10"/>'),
    hartie: { varfuri: [[0, 0, 10, 90], [0, 1, 20, 80], [0, 2, 20, 70], [0, 3, 10, 80]] } },
  { nume: 'D8 matrix: translate și rotire', text: p100('<rect transform="matrix(1 0 0 1 5 6)" width="5" height="5"/><rect transform="matrix(0,1,-1,0,0,0)" x="10" y="-30" width="10" height="5"/>'),
    hartie: { varfuri: [[0, 0, 5, 94], [0, 2, 10, 89], [1, 0, 30, 90], [1, 2, 25, 80]] } },
  { nume: 'D9 grupuri imbricate', text: p100('<g transform="translate(50,50)"><g transform="scale(2)"><rect width="5" height="5"/></g></g>'),
    hartie: { varfuri: [[0, 0, 50, 50], [0, 1, 60, 50], [0, 2, 60, 40], [0, 3, 50, 40]] } },
  { nume: 'D10 lista se compune de la stânga la dreapta', text: p100('<rect transform="translate(10,0) scale(2)" x="1" y="1" width="1" height="1"/><rect transform="scale(2) translate(10,0)" x="1" y="1" width="1" height="1"/>'),
    hartie: { varfuri: [[0, 0, 12, 98], [1, 0, 22, 98]] } },
  { nume: 'D11 separatoare: spațiu, virgulă, wsp înainte de paranteză', text: p100('<rect transform="translate(10 20)" width="1" height="1"/><rect transform="translate(10, 20) , scale(1)" width="1" height="1"/><rect transform="translate (10,20)" width="1" height="1"/><rect transform="  translate(10,20)  " width="1" height="1"/>'),
    hartie: { cai: 4, varfuri: [[0, 0, 10, 80], [1, 0, 10, 80], [2, 0, 10, 80], [3, 0, 10, 80]] }, faraLaturi: true },
  { nume: 'D12 transformări greșite: elementul și subarborele sar (numărate o dată)', text: p100('<rect width="5" height="5"/><g transform="translate(10"><rect width="1" height="1"/><rect width="1" height="1"/></g><rect transform="rotate(1,2)" width="1" height="1"/><rect transform="foo(1)" width="1" height="1"/><rect transform="translate(,10)" width="1" height="1"/><rect transform="scale()" width="1" height="1"/><rect transform="translate(1) x" width="1" height="1"/>'),
    hartie: { cai: 1, forme: [0], avertismente: { 'transformare-invalida': 6 } } },
  // Oglinda: det(M) = (−1)·(−1) = 1 ⇒ bulge > 0. Startul: (cx + r, cy) = (−40, 50) → (40, 50).
  { nume: 'D13 cercul oglindit: bulge pozitiv', text: p100('<g transform="scale(-1,1)"><circle cx="-50" cy="50" r="10"/></g>'),
    hartie: { tipuri: ['AA'], varfuri: [[0, 0, 40, 50], [0, 1, 60, 50]], bulge: [[0, 0, tan4], [0, 1, tan4]] } },
  { nume: 'D14 arcul oglindit: același arc din ambele părți ale oglinzii', text: p100('<path d="M 40 30 A 10 10 0 0 1 60 30 Z"/><path transform="scale(-1,1)" d="M -40 70 A 10 10 0 0 1 -60 70 Z"/>'),
    hartie: { tipuri: ['AL', 'AL'], varfuri: [[0, 0, 40, 70], [0, 1, 60, 70], [1, 0, 40, 30], [1, 1, 60, 30]], bulge: [[0, 0, -tan4], [1, 0, tan4]] } },
  // skewX(30) · cercul r = 10: σ = 10 · 1,32951, φ = 0,40059, n = ⌈π / φ⌉ = 8 pe jumătate.
  { nume: 'D15 cercul sub înclinare: eliptic (cubice)', text: p100('<g transform="translate(30,50) skewX(30)"><circle r="10"/></g>'),
    hartie: { tipuri: ['C'.repeat(16)], varfuri: [[0, 0, 40, 50], [0, 8, 20, 50]], avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 16 } } },
  { nume: 'D16 matricea singulară sare forma', text: p100('<rect transform="scale(0)" width="5" height="5"/><g transform="scale(1,0)"><rect width="5" height="5"/><circle r="3"/></g><path transform="matrix(1 2 2 4 0 0)" d="M0 0 L 5 0 L 5 5 Z"/><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [4], avertismente: { singulara: 4 } } },
  { nume: 'D18 separatorul dintre transformări e opțional (revizia 12.10)', text: p100('<rect transform="translate(10,20)scale(1)" width="1" height="1"/>'),
    hartie: { cai: 1, varfuri: [[0, 0, 10, 80]] } },
  // a = 0,001, d = 0,0010000000001: abaterea 1e-13, relativ 1e-10 > 1e-12 ⇒ nu e similitudine (cu podeaua 1 ar fi fost):
  // cercul (50, 50) r 20 mm e eliptic: σ = 20,000000002, n = 9 pe jumătate.
  { nume: 'D19 similitudinea relativă la scară: o matrice mică aproape uniformă dă cubice', text: p100('<circle transform="matrix(0.001 0 0 0.0010000000001 0 0)" cx="50000" cy="50000" r="20000"/>'),
    hartie: { tipuri: ['C'.repeat(18)], varfuri: [[0, 0, 70, 50]], avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 18 } } },
  { nume: 'D17 transform pe rădăcină: ignorat, cu avertisment', text: svg('width="100mm" height="100mm" viewBox="0 0 100 100" transform="translate(10,10)"', '<rect x="10" y="10" width="20" height="10"/>'),
    hartie: { avertismente: { 'transformare-radacina': 1 }, varfuri: [[0, 0, 10, 90]] } },
];

// ---------------------------------------------------------------------------------------------------------------------
// E. Gramatica datelor căii.

const E: CazSvg[] = [
  { nume: 'E1 numere lipite: 1-2', text: p100('<path d="M10 20l20-0 0 20z"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 0, 10, 80], [0, 1, 30, 80], [0, 2, 30, 60]] } },
  { nume: 'E2 .5.5 sunt două numere', text: p100('<path d="M.5.5L10.5.5 10.5 10.5z"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 0, 0.5, 99.5], [0, 1, 10.5, 99.5], [0, 2, 10.5, 89.5]] } },
  { nume: 'E3 exponenți', text: p100('<path d="M1e1 2E1 L3e+1 2e1 3.0e1 4e1Z"/>'),
    hartie: { tipuri: ['LLL'], varfuri: [[0, 0, 10, 80], [0, 1, 30, 80], [0, 2, 30, 60]] } },
  // a10 10 0 1120 0: rx 10, ry 10, φ 0, mare 1, sens 1, (20, 0): semicerc exact, Δθ = +π, bulge = −1 în mm.
  { nume: 'E4 steaguri lipite: a10 10 0 1120 0', text: p100('<path d="M 10 50 a10 10 0 1120 0 Z"/>'),
    hartie: { tipuri: ['AL'], varfuri: [[0, 0, 10, 50], [0, 1, 30, 50]], bulge: [[0, 0, -tan4]] } },
  { nume: 'E5 repetarea implicită după M și m', text: p100('<path d="M 10 10 20 10 20 20 Z"/><path d="m 40 10 10 0 0 10 z"/>'),
    hartie: { tipuri: ['LLL', 'LLL'], varfuri: [[0, 1, 20, 90], [0, 2, 20, 80], [1, 0, 40, 90], [1, 1, 50, 90], [1, 2, 50, 80]] } },
  { nume: 'E6 relative h v și z', text: p100('<path d="m10 10 h10 v10 h-10 z"/>'),
    hartie: { tipuri: ['LLLL'], varfuri: [[0, 0, 10, 90], [0, 1, 20, 90], [0, 2, 20, 80], [0, 3, 10, 80]] } },
  { nume: 'E7 Z urmat de L: subcale nouă din startul celei închise', text: p100('<path fill-rule="evenodd" d="M10 10 L20 10 L20 20 Z L 0 10 L 0 0 Z"/>'),
    hartie: { cai: 2, tipuri: ['LLL', 'LLL'], varfuri: [[1, 0, 10, 90], [1, 1, 0, 90], [1, 2, 0, 100]] }, faraLaturi: true },
  { nume: 'E8 S după C oglindește c2', text: p100('<path d="M 10 50 C 10 60 20 60 20 50 S 30 40 30 50 Z"/>'),
    hartie: { tipuri: ['CCL'], varfuri: [[0, 1, 20, 50], [0, 2, 30, 50]] } },
  // Felia 2.7d: în prima, linia (10, 50) → (20, 50) e parcursă dus-întors de linia de închidere (30, 50) → (10, 50): o muchie
  // coincidentă, deci forma nonzero se normalizează (§7: fără dus-întors); rămân cubica și linia de închidere scurtată.
  { nume: 'E9 S după L și după Q: c1 = punctul curent', text: p100('<path d="M 10 50 L 20 50 S 30 40 30 50 Z"/><path d="M 10 20 Q 15 10 20 20 S 30 10 30 20 Z"/>'),
    hartie: { tipuri: ['LCL', 'CCL'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 2 } } },
  { nume: 'E10 Q și T după Q: ridicarea exactă, oglindirea lui q', text: p100('<path d="M 10 50 Q 15 40 20 50 T 30 50 Z"/>'),
    hartie: { tipuri: ['CCL'], varfuri: [[0, 1, 20, 50]] } },
  { nume: 'E11 T după L și T după T (după nimic)', text: p100('<path d="M 10 50 L 20 50 T 30 40 Z"/><path d="M 10 20 T 20 20 T 30 10 Z"/>'),
    hartie: { tipuri: ['LCL', 'CCL'] } },
  { nume: 'E12 H și V absolute', text: p100('<path d="M 10 10 H 30 V 30 H 10 Z"/>'),
    hartie: { tipuri: ['LLLL'], varfuri: [[0, 0, 10, 90], [0, 1, 30, 90], [0, 2, 30, 70], [0, 3, 10, 70]] } },
  { nume: 'E13 eroare la mijloc: comanda incompletă', text: p100('<path d="M 10 10 L 20 10 L 20 20 L 10 10 L 5"/>'),
    hartie: { tipuri: ['LLL'], avertismente: { 'eroare-date': 1 } } },
  { nume: 'E14 eroare la mijloc: caracter străin', text: p100('<path d="M 10 10 L 20 10 L 20 20 L 10 10 # 5 5"/>'),
    hartie: { tipuri: ['LLL'], avertismente: { 'eroare-date': 1 } } },
  { nume: 'E15 eroare la început: fără M', text: p100('<path d="L 10 10 20 20"/><rect width="5" height="5"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { 'eroare-date': 1 } } },
  { nume: 'E16 steag invalid (2): calea până înaintea arcului', text: p100('<path d="M 10 50 L 30 50 L 20 40 L 10 50 A 10 10 0 2 1 30 50 Z"/>'),
    hartie: { tipuri: ['LLL'], avertismente: { 'eroare-date': 1 } } },
  { nume: 'E17 virgulă dublă după M: nimic', text: p100('<path d="M 10,,10 L 20 20"/><rect width="5" height="5"/>'),
    hartie: { cai: 1, avertismente: { 'eroare-date': 1 } } },
  { nume: 'E18 virgulă după litera comenzii: eroare', text: p100('<path d="M10 10 L 20 10 L 20 20 L 10 10 L,5 5"/>'),
    hartie: { tipuri: ['LLL'], avertismente: { 'eroare-date': 1 } } },
  // 270°: centrul (50, 50), din (60, 50) cu Δθ = +3π/2; bulge total −tan(3π/8) = −2,41421; jumătățile −tan(3π/16).
  { nume: 'E19 arc de 270°: două jumătăți, mijlocul pe mediatoare', text: p100('<path d="M 60 50 A 10 10 0 1 1 50 40 Z"/>'),
    hartie: { tipuri: ['AAL'], varfuri: [[0, 0, 60, 50], [0, 1, 50 - 10 * Math.SQRT1_2, 50 - 10 * Math.SQRT1_2], [0, 2, 50, 60]], bulge: [[0, 0, -Math.tan((3 * Math.PI) / 16)], [0, 1, -Math.tan((3 * Math.PI) / 16)]] } },
  { nume: 'E20 raze prea mici: mărite cu √Λ (semicerc)', text: p100('<path d="M 10 50 A 5 5 0 0 1 30 50 Z"/>'),
    hartie: { tipuri: ['AL'], bulge: [[0, 0, -tan4]] } },
  // Λ = 4: rx = 10, ry = 4; σ = 10, n = ⌈π / 0,42008⌉ = 8.
  { nume: 'E21 raze eliptice prea mici: jumătate de elipsă din 8 cubice', text: p100('<path d="M 10 50 A 5 2 0 0 1 30 50 Z"/>'),
    hartie: { tipuri: ['CCCCCCCCL'], avertismente: { 'arce-eliptice': 1, 'cubice-din-arce': 8 } } },
  { nume: 'E22 raza 0: linie; capetele egale: arcul omis', text: p100('<path d="M 10 50 A 0 5 0 0 1 30 50 L 20 40 Z"/><path d="M 10 20 L 30 20 A 5 5 0 0 1 30 20 L 20 10 Z"/>'),
    hartie: { tipuri: ['LLL', 'LLL'], varfuri: [[0, 1, 30, 50], [0, 2, 20, 60]] } },
  { nume: 'E23 sensul 0: bulge pozitiv în mm', text: p100('<path d="M 10 50 A 10 10 0 0 0 30 50 Z"/>'),
    hartie: { tipuri: ['AL'], bulge: [[0, 0, tan4]] } },
  // F.6.5 pe hârtie: x1′ = −12,99038, y1′ = 7,5, Λ = 0,98438, coef = +0,12599, Δθ = 2,89088 rad; σ = 20 ⇒ φ = 0,37425, n = 8.
  { nume: 'E24 arc eliptic rotit (φ = 30°)', text: p100('<path d="M 10 50 A 20 10 30 0 1 40 50 Z"/>'),
    hartie: { tipuri: ['CCCCCCCCL'], avertismente: { 'arce-eliptice': 1, 'cubice-din-arce': 8 } } },
  // R = 20 000 mm > 10 000: cubice cu σ = R; Δθ = 2·asin(50 / 20 000) = 0,005 rad < φ = 0,11834 ⇒ o cubică.
  { nume: 'E25 arc plat (R = 20 000 mm): o cubică', text: p100('<path d="M 0 50 A 20000 20000 0 0 1 100 50 Z"/>'),
    hartie: { tipuri: ['CL'], avertismente: { 'arce-plate': 1, 'cubice-din-arce': 1 } } },
  { nume: 'E26 arc de R = 9 000 mm: rămâne arc', text: p100('<path d="M 0 50 A 9000 9000 0 0 1 100 50 Z"/>'),
    hartie: { tipuri: ['AL'] } },
  // r = 37 000 px: la 96 → 9 789,6 mm (arc), la 72 → 13 052,8 mm (plat).
  { nume: 'E27 raza în mm depinde de pxPeTol (96: arc)', text: svg('width="400" height="400"', '<path d="M 0 100 A 37000 37000 0 0 1 300 100 Z"/>'),
    hartie: { tipuri: ['AL'], px: true } },
  { nume: 'E28 raza în mm depinde de pxPeTol (72: plat)', px: 72, text: svg('width="400" height="400"', '<path d="M 0 100 A 37000 37000 0 0 1 300 100 Z"/>'),
    hartie: { tipuri: ['CL'], avertismente: { 'arce-plate': 1, 'cubice-din-arce': 1 } } },
  // Revizia 12.10: peste 0,999 × 10 000 = 9 990 mm, cubice. Δθ = 2·asin(50 / 9 995) = 0,010 < φ = 0,13286: o cubică.
  { nume: 'E31 arc de R = 9 995 mm: cubică; R = 9 985 mm: arc', text: p100('<path d="M 0 30 A 9995 9995 0 0 1 100 30 Z"/><path d="M 0 70 A 9985 9985 0 0 1 100 70 Z"/>'),
    hartie: { tipuri: ['CL', 'AL'], avertismente: { 'arce-plate': 1, 'cubice-din-arce': 1 } } },
  // Aproape 360°: capetele (60, 50) și (60, 50,002), r = 10, mare = 1, sens = 1: centrul (60 + d, 50,001), d = √(100 − 1e-6);
  // mijlocul la t1 + Δθ/2 = 0: (70 + d, 50,001) → (70 + d, 49,999); fiecare jumătate tan(Δθ / 8) · (−1).
  { nume: 'E32 arc aproape de 360°: mijlocul din centrul F.6.5', text: p100('<path d="M 60 50 A 10 10 0 1 1 60 50.002 Z"/>'),
    hartie: { tipuri: ['AAL'], varfuri: [[0, 0, 60, 50], [0, 1, 70 + Math.sqrt(100 - 1e-6), 49.999], [0, 2, 60, 49.998]], bulge: [[0, 0, -Math.tan((2 * Math.PI - 2 * Math.atan2(0.001, Math.sqrt(100 - 1e-6))) / 8)]] } },
  { nume: 'E33 semicerc cu raze mărite (Λ > 1): un singur arc (fosta K3)', text: p100('<path d="M 96.6 62.4 A 2 2 0 1 1 92.1 82.8 Z"/>'),
    hartie: { tipuri: ['AL'], bulge: [[0, 0, -tan4]] } },
  { nume: 'E34 arc eliptic cu raze mărite (Λ > 1) (fosta K4)', text: p100('<path d="M 76.4 72.2 A 40 3 89 1 0 87.7 85.9 Z"/>'),
    hartie: { cai: 1, avertismente: { 'arce-eliptice': 1, 'cubice-din-arce': 11 } } },
  { nume: 'E35 elipsa excentrică departe de origine (fosta K5)', px: 72, text: p100('<ellipse cx="71.3" cy="66.9" rx="0.1" ry="23.8"/>'),
    hartie: { cai: 1, avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 18 } } },
  // Sub-felia 2.3c-1 (ADR 0037 §11): cercul de rază 0,003 mm are diagonala cutiei 0,006 · √2 = 0,0085 mm < 0,01, deci e
  // praf (sărit, `sub-rezolutie`); proba semicercurilor exacte (fosta K6) trece la raza 0,004 mm (diagonala 0,0113 mm).
  { nume: 'E36 cerc mic departe de origine (r 0,003 mm): 2.3c-1, praf, fișierul e gol', text: svg('width="10000mm" height="10000mm" viewBox="0 0 10000 10000"', '<circle cx="5000.1" cy="3.3" r="0.003"/>'),
    hartie: { cod: 'gol', avertismente: { 'sub-rezolutie': 1 } } },
  { nume: 'E37 cerc mic departe de origine (r 0,004 mm): semicercuri exacte (fosta K6)', text: svg('width="10000mm" height="10000mm" viewBox="0 0 10000 10000"', '<circle cx="5000.1" cy="3.3" r="0.004"/>'),
    hartie: { tipuri: ['AA'], varfuri: [[0, 0, 5000.104, 9996.7], [0, 1, 5000.096, 9996.7]], bulge: [[0, 0, -tan4], [0, 1, -tan4]] } },
  { nume: 'E29 două subcăi: ordinea și latura', text: p100('<path d="M 10 10 h 30 v 30 h -30 z M 20 20 h 10 v 10 h -10 z"/>'),
    hartie: { cai: 2, tipuri: ['LLLL', 'LLLL'], forme: [0, 0], laturi: ['exterior', 'interior'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 900 } } },
  // A doua (revizia 12.10): bucla dintr-o singură cubică se împarte la t = 1/2: B(½) = ((50 + 210 + 210 + 50) / 8,
  // (50 + 150 + 210 + 50) / 8) = (65, 57,5) → (65, 42,5).
  { nume: 'E30 o cubică nulă se scoate; bucla dintr-o singură cubică se împarte în două', text: p100('<path d="M 10 10 L 30 10 C 30 10 30 10 30 10 L 30 30 Z"/><path d="M 50 50 C 70 50 70 70 50 50 Z"/>'),
    hartie: { cai: 2, tipuri: ['LLL', 'CC'], varfuri: [[1, 0, 50, 50], [1, 1, 65, 42.5]] } },
];

// ---------------------------------------------------------------------------------------------------------------------
// F. Ascunderea, switch, spațiile de nume, stilul.

const F: CazSvg[] = [
  { nume: 'F1 display="none" pe grup: formele numărate și numerotate', text: p100('<g display="none"><rect width="5" height="5"/><circle r="3"/><text>x</text></g><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [2], avertismente: { ascunse: 2 } } },
  { nume: 'F2 display:none în style', text: p100('<rect style="display:none" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { ascunse: 1 } } },
  { nume: 'F3 style câștigă peste atribut; ultima declarație câștigă', text: p100('<rect display="none" style="display:inline" width="5" height="5"/><rect display="inline" style="display:none" x="10" width="5" height="5"/><rect style="display:none;display:inline" x="20" width="5" height="5"/><rect style="display: inline ; display : none" x="30" width="5" height="5"/>'),
    hartie: { cai: 2, forme: [0, 2], avertismente: { ascunse: 2 } } },
  { nume: 'F4 visibility moștenită; copilul visible reapare', text: p100('<g visibility="hidden"><rect width="5" height="5"/><rect visibility="visible" x="10" width="5" height="5"/><g><rect x="20" width="5" height="5"/></g></g>'),
    hartie: { cai: 1, forme: [1], avertismente: { ascunse: 2 } } },
  { nume: 'F5 visibility collapse și în style', text: p100('<rect visibility="collapse" width="5" height="5"/><rect style="visibility:hidden" x="10" width="5" height="5"/><rect style="visibility:visible" visibility="hidden" x="20" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [2], avertismente: { ascunse: 2 } } },
  { nume: 'F6 elementele sărite: numărate, conținutul nu; display:none nu se numără', text: p100('<text>a</text><use href="#r"/><image width="1" height="1"/><foreignObject width="1" height="1"><rect width="5" height="5"/></foreignObject><svg><rect width="5" height="5"/></svg><g display="none"><text>b</text><image/></g><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [0], avertismente: { 'sarit-text': 1, 'sarit-use': 1, 'sarit-image': 1, 'sarit-foreignObject': 1, 'sarit-svg': 1 } } },
  { nume: 'F7 switch: primul copil fără requiredExtensions', text: p100('<switch><foreignObject requiredExtensions="http://ns.adobe.com/AdobeIllustrator/10.0/" width="1" height="1"><rect width="9" height="9"/></foreignObject><g><rect x="10" y="10" width="5" height="5"/></g><g><rect x="30" y="30" width="5" height="5"/></g></switch>'),
    hartie: { cai: 1, forme: [0], varfuri: [[0, 0, 10, 90]] } },
  { nume: 'F8 switch: un copil din alt spațiu de nume nu e candidat (precizarea 12.10)', text: p100('<switch><i:pgf xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"><rect width="9" height="9"/></i:pgf><rect x="10" y="10" width="5" height="5"/><rect x="30" y="30" width="5" height="5"/></switch>'),
    hartie: { cai: 1, forme: [0], varfuri: [[0, 0, 10, 90]] } },
  { nume: 'F9 switch: systemLanguage străin nu e ales (revizia 12.10)', text: p100('<switch><g systemLanguage="xx"><rect x="10" y="10" width="5" height="5"/></g><g><rect x="30" y="30" width="5" height="5"/></g></switch>'),
    hartie: { cai: 1, varfuri: [[0, 0, 30, 70]] } },
  { nume: 'F19 switch: ro ales doar cu limba ro (en)', text: p100('<switch><g systemLanguage="ro"><rect x="10" y="10" width="5" height="5"/></g><g><rect x="30" y="30" width="5" height="5"/></g></switch>'),
    hartie: { cai: 1, varfuri: [[0, 0, 30, 70]] } },
  { nume: 'F20 switch: ro ales doar cu limba ro (ro)', limba: 'ro', text: p100('<switch><g systemLanguage="ro"><rect x="10" y="10" width="5" height="5"/></g><g><rect x="30" y="30" width="5" height="5"/></g></switch>'),
    hartie: { cai: 1, varfuri: [[0, 0, 10, 90]] } },
  { nume: 'F21 switch: en-US și „fr, en” se potrivesc cu en; „eng” nu; requiredFeatures nejudecat', text: p100('<switch><g systemLanguage="eng"><rect width="5" height="5"/></g><g systemLanguage="en-US" requiredFeatures="http://www.w3.org/TR/SVG11/feature#Shape"><rect x="10" y="10" width="5" height="5"/></g></switch><switch><g systemLanguage="fr, en"><rect x="40" y="40" width="5" height="5"/></g><g><rect x="70" y="70" width="5" height="5"/></g></switch>'),
    hartie: { cai: 2, varfuri: [[0, 0, 10, 90], [1, 0, 40, 60]] } },
  // Revizia 12.10 (inversul fostei K1): visibility nu scoate elementele sărite din raport; doar display:none.
  { nume: 'F22 elementele sărite ascunse cu visibility: tot numărate', text: p100('<g visibility="hidden"><text>b</text><image width="1" height="1"/><use/><svg/><foreignObject/></g><text visibility="hidden">c</text><g display="none"><text>d</text></g><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, avertismente: { 'sarit-text': 2, 'sarit-image': 1, 'sarit-use': 1, 'sarit-svg': 1, 'sarit-foreignObject': 1 } } },
  { nume: 'F10 containerele nedesenate: nimic, fără raport', text: p100('<defs><rect width="5" height="5"/><path d="M0 0 L5 0 L5 5 Z"/></defs><symbol><rect width="5" height="5"/></symbol><clipPath><rect width="5" height="5"/></clipPath><mask><rect width="5" height="5"/></mask><marker><rect width="5" height="5"/></marker><pattern><rect width="5" height="5"/></pattern><linearGradient/><filter/><title>t</title><desc>d</desc><metadata/><script>alert(1)</script><animate/><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [0] } },
  { nume: 'F11 alte spații de nume: ignorate', text: svg('xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" width="100mm" height="100mm" viewBox="0 0 100 100"', '<sodipodi:namedview pagecolor="#fff"><inkscape:grid/></sodipodi:namedview><inkscape:rect width="5" height="5"/><rect xmlns="http://example.com/x" width="5" height="5"/><rect inkscape:label="r" x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [0] } },
  { nume: 'F12 rădăcina fără spațiu de nume', text: '<svg width="100mm" height="100mm" viewBox="0 0 100 100"><g><rect x="10" y="10" width="5" height="5"/></g></svg>',
    hartie: { cai: 1, varfuri: [[0, 0, 10, 90]] } },
  { nume: 'F13 rădăcina cu prefix', text: '<s:svg xmlns:s="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100"><s:g><s:rect x="10" y="10" width="5" height="5"/></s:g></s:svg>',
    hartie: { cai: 1, varfuri: [[0, 0, 10, 90]] } },
  // Felia 2.7d (ADR 0035 §4 „Stilurile”): regulile simple din <style> se aplică, iar `stil` numără doar o regulă necitită.
  { nume: 'F14 <style> cu o regulă simplă: clasa ascunde forma (2.7d; în 2.7c doar avertiza)', text: p100('<style>.a { display: none }</style><rect class="a" x="10" y="10" width="5" height="5"/><rect x="30" y="30" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { ascunse: 1 } } },
  { nume: 'F15 <style> CDATA în defs, cu o regulă simplă (fill): se aplică, fără avertisment (2.7d)', text: p100('<defs><style><![CDATA[ .a { fill: red } ]]></style></defs><rect class="a" x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1 } },
  { nume: 'F16 ascuns cu transformare greșită: ascunse, nu transformare-invalida (precizarea 12.10)', text: p100('<g display="none" transform="translate(1"><rect width="5" height="5"/><g transform="bad"><circle r="2"/></g></g><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [2], avertismente: { ascunse: 2 } } },
  { nume: 'F17 a: container', text: p100('<a href="https://example.com"><rect x="10" y="10" width="5" height="5"/></a>'),
    hartie: { cai: 1 } },
  { nume: 'F18 spațiile din jurul valorilor atributelor', text: p100('<rect x=" 10 " y="10" width="5 " height=" 5"/>'),
    hartie: { cai: 1, varfuri: [[0, 0, 10, 90]] } },
];

// ---------------------------------------------------------------------------------------------------------------------
// G. Imbricarea (§8) și perechile nonzero (§10).

/** Un cerc ca o subcale din două arce (sens: 1 = unghiul SVG crescător). */
const cerc = (cx: number, cy: number, r: number, sens: 0 | 1): string =>
  `M ${cx - r} ${cy} A ${r} ${r} 0 1 ${sens} ${cx + r} ${cy} A ${r} ${r} 0 1 ${sens} ${cx - r} ${cy} Z`;
const patratD = (x: number, y: number, l: number, invers = false): string =>
  invers ? `M ${x} ${y} v ${l} h ${l} v ${-l} z` : `M ${x} ${y} h ${l} v ${l} h ${-l} z`;

const G: CazSvg[] = [
  { nume: 'G1 litera O cu sensuri opuse: deja evenodd, neschimbată', text: p100(`<path d="${cerc(50, 50, 20, 1)} ${cerc(50, 50, 10, 0)}"/>`),
    hartie: { cai: 2, tipuri: ['AA', 'AA'], laturi: ['exterior', 'interior'], forme: [0, 0] } },
  { nume: 'G2 litera O cu același sens: normalizată, discul (2.7d)', text: p100(`<path d="${cerc(50, 50, 20, 1)} ${cerc(50, 50, 10, 1)}"/>`),
    hartie: { cai: 2, laturi: ['exterior', 'interior'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 400 * Math.PI } } },
  { nume: 'G3 același sens, fill-rule="evenodd": nenormalizată', text: p100(`<path fill-rule="evenodd" d="${cerc(50, 50, 20, 1)} ${cerc(50, 50, 10, 1)}"/>`),
    hartie: { cai: 2, laturi: ['exterior', 'interior'] } },
  { nume: 'G4 fill-rule moștenit de la grup (ALEGERE) și style peste atribut', text: p100(`<g fill-rule="evenodd"><path d="${patratD(0, 0, 40)} ${patratD(10, 10, 20)}"/></g><path fill-rule="evenodd" style="fill-rule:nonzero" d="${patratD(50, 50, 40)} ${patratD(60, 60, 20)}"/>`),
    hartie: { cai: 4, laturi: ['exterior', 'interior', 'exterior', 'interior'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 3, laturi: ['exterior', 'interior', 'exterior'], arie: 1600 - 400 + 1600 } } },
  { nume: 'G5 trei pătrate imbricate, elemente separate, în altă ordine', text: p100('<rect x="20" y="20" width="50" height="50"/><rect width="90" height="90"/><rect x="10" y="10" width="70" height="70"/>'),
    hartie: { cai: 3, laturi: ['exterior', 'exterior', 'interior'] } },
  { nume: 'G6 litera B: conturul și două goluri, sensuri opuse', text: p100(`<path d="M 10 10 H 40 C 55 10 55 45 40 45 C 60 45 60 90 40 90 H 10 Z ${patratD(20, 20, 15, true)} ${patratD(20, 55, 20, true)}"/>`),
    hartie: { cai: 3, laturi: ['exterior', 'interior', 'interior'] } },
  { nume: 'G7 forme alăturate: toate exterioare', text: p100('<rect width="10" height="10"/><circle cx="30" cy="5" r="5"/><ellipse cx="50" cy="5" rx="6" ry="4"/><polygon points="70,0 80,0 75,10"/>'),
    hartie: { cai: 4, laturi: ['exterior', 'exterior', 'exterior', 'exterior'], avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 14 } } },
  { nume: 'G8 trei subcăi imbricate cu același sens: normalizate, pătratul mare (2.7d)', text: p100(`<path d="${patratD(0, 0, 90)} ${patratD(10, 10, 70)} ${patratD(20, 20, 50)}"/>`),
    hartie: { cai: 3, laturi: ['exterior', 'interior', 'exterior'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 8100 } } },
  { nume: 'G9 două subcăi alăturate cu același sens: neschimbate', text: p100(`<path d="${patratD(0, 0, 20)} ${patratD(30, 0, 20)}"/>`),
    hartie: { cai: 2, laturi: ['exterior', 'exterior'] } },
  { nume: 'G10 imbricarea trece peste forme; normalizarea doar în aceeași formă', text: p100(`<path d="${patratD(0, 0, 90)}"/><path d="${patratD(10, 10, 70)}"/>`),
    hartie: { cai: 2, laturi: ['exterior', 'interior'] } },
  { nume: 'G11 cerc într-un cerc (arce), cu startul pe axă', text: p100('<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="10"/>'),
    hartie: { cai: 3, laturi: ['exterior', 'interior', 'exterior'] } },
  { nume: 'G12 cubice: o lacrimă în altă lacrimă', text: p100('<path d="M 50 10 C 90 50 70 90 50 90 C 30 90 10 50 50 10 Z"/><path d="M 50 40 C 60 55 55 70 50 70 C 45 70 40 55 50 40 Z"/>'),
    hartie: { cai: 2, laturi: ['exterior', 'interior'] } },
  // σ = 40: φ = 0,33341, n = ⌈π / φ⌉ = 10 pe jumătate.
  { nume: 'G13 elipsă (cubice) cu un punct lângă margine, înăuntru', text: p100('<ellipse cx="50" cy="50" rx="40" ry="20"/><rect x="85" y="49" width="2" height="2"/>'),
    hartie: { cai: 2, laturi: ['exterior', 'interior'], avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 20 } } },
];

// ---------------------------------------------------------------------------------------------------------------------
// N. Normalizarea nonzero la ușă (felia 2.7d, ADR 0036, ADR 0035 §8 și §10): forma cu regula efectivă nonzero trece, cu
// toate subcăile ei, prin normalizare; formele separate nu se amestecă; evenodd nu se atinge. Hârtia: câte forme trebuie
// schimbate (predicția), ce rămâne (`final`), aria regiunii (formule închise).

/** Reuniunea a două discuri de rază r la distanța d < 2r: 2πr² − lentila. */
const arieDouaCercuri = (r: number, d: number): number => 2 * Math.PI * r * r - (2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d));
/** Pentagrama de rază R sub nonzero: 5·R·rᵢ·sin 36°, rᵢ = R·cos 72° / cos 36°. */
const ariePentagrama = (R: number): number => 5 * R * ((R * Math.cos((2 * Math.PI) / 5)) / Math.cos(Math.PI / 5)) * Math.sin(Math.PI / 5);
/** Pentagrama în coordonatele SVG (Y în jos), centrul (cx, cy), raza R, ca listă de puncte. */
const puncteStea = (cx: number, cy: number, R: number): string => Array.from({ length: 5 }, (_, i) => {
  const a = Math.PI / 2 + (i * 4 * Math.PI) / 5;
  return `${(cx + R * Math.cos(a)).toFixed(12)},${(cy - R * Math.sin(a)).toFixed(12)}`;
}).join(' ');
const dreptRotunjit = (x: number, y: number): string => `M ${x + 5} ${y} h 30 a 5 5 0 0 1 5 5 v 20 a 5 5 0 0 1 -5 5 h -30 a 5 5 0 0 1 -5 -5 v -20 a 5 5 0 0 1 5 -5 z`;

const N: CazSvg[] = [
  { nume: 'N1 două dreptunghiuri suprapuse în aceeași cale: reuniunea (8 linii)', text: p100('<path d="M 10 10 h 40 v 30 h -40 z M 30 20 h 40 v 30 h -40 z"/>'),
    hartie: { cai: 2, tipuri: ['LLLL', 'LLLL'], forme: [0, 0], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 2400 - 400 } } },
  { nume: 'N2 aceleași dreptunghiuri ca elemente separate: fiecare formă rămâne (se normalizează singură)', text: p100('<rect x="10" y="10" width="40" height="30"/><rect x="30" y="20" width="40" height="30"/>'),
    hartie: { cai: 2, forme: [0, 1], laturi: ['exterior', 'interior'], final: { cai: 2, laturi: ['exterior', 'interior'] } } },
  { nume: 'N3 pentagrama dintr-o singură subcale (nonzero): steaua, 10 linii', text: p100(`<polygon points="${puncteStea(50, 50, 40)}"/>`),
    hartie: { cai: 1, tipuri: ['LLLLL'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: ariePentagrama(40) } } },
  { nume: 'N4 pentagrama cu fill-rule="evenodd": rămâne', text: p100(`<polygon fill-rule="evenodd" points="${puncteStea(50, 50, 40)}"/>`),
    hartie: { cai: 1, tipuri: ['LLLLL'], final: { cai: 1 } } },
  { nume: 'N5 pentagrama: style fill-rule:nonzero peste atributul evenodd: normalizată', text: p100(`<polygon fill-rule="evenodd" style="fill-rule: nonzero" points="${puncteStea(50, 50, 40)}"/>`),
    hartie: { cai: 1, avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, arie: ariePentagrama(40) } } },
  { nume: 'N6 pentagrama într-un grup cu fill-rule="evenodd" (moștenit): rămâne', text: p100(`<g fill-rule="evenodd"><polygon points="${puncteStea(50, 50, 40)}"/></g>`),
    hartie: { cai: 1, final: { cai: 1 } } },
  // Precizarea 2.3c-6 (ADR 0037 §11): forma golită de tot de normalizare se numără și la `degenerate` (o dată pe formă).
  { nume: 'N7 o cale și inversa ei, singure: regiunea vidă, fișierul e gol (2.3c-6: și degenerate)', text: p100('<path d="M 10 10 h 20 v 20 h -20 z M 10 10 v 20 h 20 v -20 z"/>'),
    hartie: { cod: 'gol', avertismente: { 'nonzero-normalizate': 1, degenerate: 1 } } },
  { nume: 'N8 o cale și inversa ei lângă un dreptunghi: forma dispare, dreptunghiul rămâne (2.3c-6: și degenerate)', text: p100('<path id="dus-intors" d="M 10 10 h 20 v 20 h -20 z M 10 10 v 20 h 20 v -20 z"/><rect id="r" x="60" y="60" width="10" height="10"/>'),
    hartie: { cai: 3, forme: [0, 0, 1], avertismente: { 'nonzero-normalizate': 1, degenerate: 1 }, final: { cai: 1, laturi: ['exterior'], arie: 100 } } },
  { nume: 'N9 două cercuri suprapuse în aceeași cale: reuniunea, arce pe cercurile sursei', text: p100(`<path id="opt" d="${cerc(40, 50, 20, 1)} ${cerc(60, 50, 20, 1)}"/>`),
    hartie: { cai: 2, tipuri: ['AA', 'AA'], nume: ['opt', 'opt'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: arieDouaCercuri(20, 20) } } },
  // Fiecare jumătate de elipsă (rx 20, ry 10): σ = 20, φ = 0,37425, n = 9; patru jumătăți, 36 de cubice.
  { nume: 'N10 două elipse suprapuse în aceeași cale: reuniunea, din sub-curbele cubicelor ușii', text: p100('<path d="M 20 50 A 20 10 0 1 1 60 50 A 20 10 0 1 1 20 50 Z M 40 50 A 20 10 0 1 1 80 50 A 20 10 0 1 1 40 50 Z"/>'),
    hartie: { cai: 2, tipuri: ['C'.repeat(18), 'C'.repeat(18)], avertismente: { 'nonzero-normalizate': 1, 'arce-eliptice': 4, 'cubice-din-arce': 36 }, final: { cai: 1, laturi: ['exterior'] } } },
  { nume: 'N11 două dreptunghiuri cu o latură comună în aceeași cale: unul singur', text: p100('<path d="M 10 10 h 20 v 20 h -20 z M 30 10 h 20 v 20 h -20 z"/>'),
    hartie: { cai: 2, avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 800 } } },
  // ADR 0036 §8: „curbe aproape coincidente, dar nu identice” — două cubice la 1e-6 una de alta, cu trei traversări: refuz,
  // forma se citește evenodd (ca în 2.7c) și se numără.
  { nume: 'N12 cubice aproape paralele (1e-6, trei traversări) în aceeași cale: normalizarea refuzată, citită evenodd', text: p100('<path d="M 0 70 C 30 30 70 30 100 70 L 100 90 L 0 90 Z M 100 69.9999999 C 70 30.000001 30 29.999999 0 70.0000001 L 0 10 L 100 10 Z"/>'),
    hartie: { cai: 2, tipuri: ['CLLL', 'CLLL'], avertismente: { 'nonzero-normalizate': 1 }, nonzeroRefuzate: 1, final: { cai: 2 } } },
  { nume: 'N13 o formă oglindită (scale(-1, 1)) cu subcăi suprapuse: reuniunea, trigonometric în mm', text: p100('<g transform="translate(100, 0) scale(-1, 1)"><path d="M 10 10 h 40 v 30 h -40 z M 30 20 h 40 v 30 h -40 z"/></g>'),
    hartie: { cai: 2, avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 2000 } } },
  { nume: 'N14 un dreptunghi rotunjit dublat exact în aceeași cale (L + A): unul singur', text: p100(`<path d="${dreptRotunjit(15, 10)} ${dreptRotunjit(15, 10)}"/>`),
    hartie: { cai: 2, tipuri: ['LALALALA', 'LALALALA'], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 1, laturi: ['exterior'], arie: 1200 - (100 - 25 * Math.PI) } } },
  { nume: 'N15 o fundă dintr-o singură subcale (lobii ±1): deja evenodd, rămâne', text: p100('<path d="M 10 10 L 40 40 L 40 10 L 10 40 Z"/>'),
    hartie: { cai: 1, tipuri: ['LLLL'], final: { cai: 1 } } },
  { nume: 'N16 litera O din două subcăi cu sensuri opuse și un punct în gaură în același sens: rămân trei căi', text: p100(`<path d="${cerc(50, 50, 30, 1)} ${cerc(50, 50, 15, 0)} ${cerc(50, 50, 5, 1)}"/>`),
    hartie: { cai: 3, laturi: ['exterior', 'interior', 'exterior'], final: { cai: 3, laturi: ['exterior', 'interior', 'exterior'], arie: Math.PI * (900 - 225 + 25) } } },
  { nume: 'N17 trei forme: una normalizată, una evenodd suprapusă, una simplă: doar prima se schimbă', text: p100(`<path d="M 10 10 h 20 v 20 h -20 z M 20 20 h 20 v 20 h -20 z"/><path fill-rule="evenodd" d="M 60 10 h 20 v 20 h -20 z M 70 20 h 20 v 20 h -20 z"/><circle cx="50" cy="80" r="10"/>`),
    hartie: { cai: 5, forme: [0, 0, 1, 1, 2], avertismente: { 'nonzero-normalizate': 1 }, final: { cai: 4 } } },
];

// ---------------------------------------------------------------------------------------------------------------------
// S. Stilurile și umplerea (felia 2.7d, recenzia: ADR 0035 §4 „Stilurile” și „Umplerea”, ADR 0036 §9). Forma de probă e
// D2: două dreptunghiuri suprapuse în aceeași cale (sub nonzero, reuniunea: o cale, aria 2 000; sub evenodd sau fără
// umplere, cele două căi citite ca atare).

const D2 = 'M 10 10 h 40 v 30 h -40 z M 30 20 h 40 v 30 h -40 z';
/** D2 normalizată (nonzero, umplută). */
const NORM: Partial<Hartie> = { cai: 2, tipuri: ['LLLL', 'LLLL'], final: { cai: 1, laturi: ['exterior'], arie: 2000 } };
/** D2 citită ca atare (evenodd sau fără umplere). */
const RAW: Partial<Hartie> = { cai: 2, tipuri: ['LLLL', 'LLLL'], final: { cai: 2 } };
const n1 = { 'nonzero-normalizate': 1 } as const;

const S: CazSvg[] = [
  { nume: 'S1 fill-rule: evenodd dintr-o clasă din <style>: pentagrama rămâne, fără avertisment', text: p100(`<style>.eo { fill-rule: evenodd }</style><polygon class="eo" points="${puncteStea(50, 50, 40)}"/>`),
    hartie: { cai: 1, final: { cai: 1 } } },
  { nume: 'S2 fill: none dintr-o clasă (ca la Illustrator): forma de contur nu se normalizează', text: p100(`<style>.st0{fill:none;}</style><path class="st0" d="${D2}"/>`),
    hartie: { ...RAW } },
  { nume: 'S3 atributul fill="none": nu se normalizează', text: p100(`<path fill="none" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S4 fill="none" moștenit de la grup: nu se normalizează', text: p100(`<g fill="none"><path d="${D2}"/></g>`), hartie: { ...RAW } },
  { nume: 'S5 fill="inherit" ia părintele (none): nu se normalizează', text: p100(`<g fill="none"><path fill="inherit" d="${D2}"/></g>`), hartie: { ...RAW } },
  { nume: 'S6 o culoare sub un grup fill="none": umplută, se normalizează', text: p100(`<g fill="none"><path fill="#000" d="${D2}"/></g>`), hartie: { ...NORM, avertismente: n1 } },
  { nume: 'S7 style="fill:none" pe grup, style="fill:inherit" pe formă: nu se normalizează', text: p100(`<g style="fill:none"><path style="fill:inherit" d="${D2}"/></g>`), hartie: { ...RAW } },
  { nume: 'S8 regula din <style> câștigă peste atribut: path { fill-rule: nonzero } peste fill-rule="evenodd"', text: p100(`<style>path { fill-rule: nonzero }</style><path fill-rule="evenodd" d="${D2}"/>`), hartie: { ...NORM, avertismente: n1 } },
  { nume: 'S9 style câștigă peste <style>: style="fill-rule: nonzero" peste path { fill-rule: evenodd }', text: p100(`<style>path { fill-rule: evenodd }</style><path style="fill-rule: nonzero" d="${D2}"/>`), hartie: { ...NORM, avertismente: n1 } },
  { nume: 'S10 regula din <style> câștigă peste atributul fill: path { fill: none } peste fill="red"', text: p100(`<style>path { fill: none }</style><path fill="red" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S11 specificitatea: #id peste .clasă (evenodd câștigă)', text: p100(`<style>#a { fill-rule: evenodd } .c { fill-rule: nonzero }</style><path id="a" class="c" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S12 la specificitate egală câștigă ultima regulă (.d după .c)', text: p100(`<style>.c { fill-rule: nonzero } .d { fill-rule: evenodd }</style><path class="c d" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S13 path.c (clasă + element) peste .c, deși e înainte', text: p100(`<style>path.c { fill-rule: evenodd } .c { fill-rule: nonzero }</style><path class="c" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S14 două elemente <style>: ultima regulă din document câștigă', text: p100(`<style>.c { fill-rule: evenodd }</style><style>.c { fill-rule: nonzero }</style><path class="c" d="${D2}"/>`), hartie: { ...NORM, avertismente: n1 } },
  { nume: 'S15 * are specificitatea cea mai mică: path { nonzero } peste * { evenodd } scris după', text: p100(`<style>path { fill-rule: nonzero } * { fill-rule: evenodd }</style><path d="${D2}"/>`), hartie: { ...NORM, avertismente: n1 } },
  { nume: 'S16 selector cu combinator (g > path): regula nu se aplică, avertisment', text: p100(`<style>g > path { fill-rule: evenodd }</style><g><path d="${D2}"/></g>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S17 regula @media cu fill-rule: nu se aplică, avertisment', text: p100(`<style>@media print { path { fill-rule: evenodd } }</style><path d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S18 !important în <style>: avertisment, dar style câștigă (se aplică doar ca o declarație obișnuită)', text: p100(`<style>.a { fill-rule: evenodd !important }</style><path class="a" style="fill-rule: nonzero" d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S19 !important în <style>, fără style: se aplică (evenodd), cu avertisment', text: p100(`<style>.a { fill-rule: evenodd !important }</style><path class="a" d="${D2}"/>`), hartie: { ...RAW, avertismente: { stil: 1 } } },
  { nume: 'S20 reguli obișnuite fără cele patru proprietăți (combinator, !important pe color): fără avertisment', text: p100(`<style>g > path { stroke: red } .a { color: red !important }</style><path class="a" d="${D2}"/>`), hartie: { ...NORM, avertismente: n1 } },
  // ALEGERE (textul ADR 0035 §4: „o regulă `@` (`@media`…) … dau avertismentul”, necalificat): orice regulă @ avertizează.
  { nume: 'S35 o regulă @ fără cele patru proprietăți (@font-face, @import): avertisment', text: p100(`<style>@import url(x.css); @font-face { font-family: x }</style><path d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S36 !important pe color într-o regulă cu fill: avertisment, regula se aplică', text: p100(`<style>.a { color: red !important; fill: none }</style><path class="a" d="${D2}"/>`), hartie: { ...RAW, avertismente: { stil: 1 } } },
  { nume: 'S21 două id-uri (#a#b): nu e simplu, avertisment', text: p100(`<style>#a#b { fill: none }</style><path id="a" d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S22 selector cu atribut (path[id=a]): nu e simplu, avertisment', text: p100(`<style>path[id=a] { fill: none }</style><path id="a" d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S23 pseudo-clasă (path:first-child): nu e simplu, avertisment', text: p100(`<style>path:first-child { fill: none }</style><path d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S24 comentariile se sar: regula din comentariu nu contează', text: p100(`<style>/* .c { fill-rule: nonzero } */ .c { fill-rule: evenodd } /* .c { fill: none } */</style><path class="c" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S25 display: none dintr-o clasă: grupul și formele lui ascunse', text: p100('<style>.h { display: none }</style><g class="h"><rect width="5" height="5"/><circle r="3"/></g><rect x="10" y="10" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [2], avertismente: { ascunse: 2 } } },
  { nume: 'S26 visibility din <style>, moștenită; o clasă visible reapare', text: p100('<style>g { visibility: hidden } .v { visibility: visible }</style><g><rect class="v" width="5" height="5"/><rect x="10" width="5" height="5"/></g>'),
    hartie: { cai: 1, forme: [0], avertismente: { ascunse: 1 } } },
  { nume: 'S27 selectorul de element svg (rădăcina): fill-rule moștenit de toate', text: p100(`<style>svg { fill-rule: evenodd }</style><path d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S28 o clasă pe grup: fill-rule moștenit', text: p100(`<style>.eo{fill-rule:evenodd}</style><g class="eo"><path d="${D2}"/></g>`), hartie: { ...RAW } },
  { nume: 'S29 *.c (lipit cu *): se aplică', text: p100(`<style>*.c { fill: none }</style><path class="c" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S30 o listă de selectori simpli (rect, .c): se aplică ambilor', text: p100(`<style>rect, .c { fill-rule: evenodd }</style><path class="c" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S31 10 000 de reguli: se citesc (evenodd), fără avertisment', text: p100(`<style>${'.x{fill-rule:evenodd}'.repeat(10_000)}</style><path class="x" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S32 10 001 de reguli: <style> nu se citește deloc (nonzero), avertisment', text: p100(`<style>${'.x{fill-rule:evenodd}'.repeat(10_001)}</style><path class="x" d="${D2}"/>`), hartie: { ...NORM, avertismente: { ...n1, stil: 1 } } },
  { nume: 'S33 un <style> doar cu proprietăți necitite (stroke): fără avertisment (2.7c avertiza)', text: p100(`<style>path { stroke: red; stroke-width: 2 }</style><path fill-rule="evenodd" d="${D2}"/>`), hartie: { ...RAW } },
  { nume: 'S34 !important în style se ignoră (style rămâne cea mai tare sursă), fără avertisment', text: p100(`<style>path { fill-rule: nonzero }</style><path style="fill-rule: evenodd !important" d="${D2}"/>`), hartie: { ...RAW } },
];

// ---------------------------------------------------------------------------------------------------------------------
// U. Umplerea, golul sub rezoluție și praful (sub-felia 2.3c-1, ADR 0037 §11, amendează ADR 0035 §7, §10). Pe hârtie:
// - o subcale fără `Z` cu golul peste TOLERANTA_IMPORT (1e-6 mm) a unei forme UMPLUTE (`fill` efectiv ≠ `none`; implicit
//   plin) se închide cu o linie: `inchise-de-umplere`; dacă închiderea dă o cale degenerată, rămâne deschisă (2.3c-3: o
//   cale deschisă, numărată `deschise`, sau `degenerate` dacă are sub 2 vârfuri distincte ori sub 0,01 mm);
// - cu `fill: none`, golul ≤ REZOLUTIE (0,01 mm) se închide cu o linie: `inchise-la-usa`; peste, rămâne deschisă;
// - o subcale (închisă cu `Z`, sau închisă de ușă) cu diagonala cutiei sub 0,01 mm se sare: `sub-rezolutie`;
// - golul ≤ 1e-6 mm se închide în tăcere, ca în 2.7c (fără linie, fără număr);
// - căile închise așa intră în normalizarea nonzero și în imbricare, ca orice cale închisă.
// Golurile sunt reproduceri sintetice ale fișierelor reale măsurate (logoul VfB: 8 subcăi umplute fără Z, golurile 5e-5 …
// 6e-4 mm din rotunjirea coordonatelor relative; logoul Presto: 2, golul 0,001 px; CNC-referinta: valul de 150 mm, fără
// umplere, rămâne deschis); fișierele însele se judecă în `svg.reale.oracol.test.ts`, când există.

/** Trei pătrate fără Z într-o singură cale, fiecare `m` relativ la capătul celei dinainte: golurile 5e-5, 1e-4, 6e-4 mm. */
const VFB_PATRATE = 'm 10 10 h 20 v 20 h -20 v -19.99995 m 30 -0.00005 h 20 v 20 h -20 v -19.9999 m 30 -0.0001 h 20 v 20 h -20 v -19.9994';
/** Pătratul fără Z a cărui ultimă latură trece de start: închiderea lasă o buclă de 5,66e-5 mm (logoul VfB, minim). */
const VFB_BUCLA = 'M 10 90 L 30 90 L 30 70 L 10 70 L 10.00004 90.00004';
/** Aria patrulaterului X, (30, 10), (30, 30), (10, 30), în mm (X: ultima latură taie y = 10). */
const ARIE_VFB_PATRULATER = ((): number => {
  const E = { x: 10.00004, y: 100 - 90.00004 };
  const X = { x: 10 + ((E.x - 10) * (30 - 10)) / (30 - E.y), y: 10 };
  const q = [X, { x: 30, y: 10 }, { x: 30, y: 30 }, { x: 10, y: 30 }];
  return q.reduce((s, p, i) => { const r = q[(i + 1) % q.length] as { x: number; y: number }; return s + (p.x * r.y - r.x * p.y) / 2; }, 0);
})();

const U: CazSvg[] = [
  { nume: 'U1 VfB: trei subcăi umplute fără Z (golurile 5e-5, 1e-4, 6e-4 mm, din coordonatele relative): închise de umplere', text: p100(`<path d="${VFB_PATRATE}"/>`),
    hartie: { cai: 3, forme: [0, 0, 0], tipuri: ['LLLLL', 'LLLLL', 'LLLLL'], laturi: ['exterior', 'exterior', 'exterior'],
      varfuri: [[0, 0, 10, 90], [0, 3, 10, 70], [0, 4, 10, 89.99995], [1, 0, 40, 90], [1, 4, 40, 89.9999], [2, 0, 70, 90], [2, 4, 70, 89.9994]],
      avertismente: { 'inchise-de-umplere': 3 }, goluri: [5e-5, 1e-4, 6e-4], golLaUsa: 0, final: { cai: 3, laturi: ['exterior', 'exterior', 'exterior'], arie: 1200 } } },
  // A doua cubică ajunge orizontal în (50, 20,0006): linia de închidere e verticală, de 6e-4 mm, fără încrucișare.
  { nume: 'U2 VfB: lacrima din două cubice fără Z, golul 6e-4 mm: cubicele și linia de închidere', text: p100('<path d="M 50 20 C 70 20 70 50 50 50 C 30 50 30 20.0006 50 20.0006"/>'),
    hartie: { cai: 1, tipuri: ['CCL'], varfuri: [[0, 0, 50, 80], [0, 1, 50, 50], [0, 2, 50, 79.9994]], avertismente: { 'inchise-de-umplere': 1 }, goluri: [6e-4], laturi: ['exterior'] } },
  // Ca în logoul VfB (ADR 0037, „Ce am măsurat” 4): coada cubicei a doua taie capul primei la 3e-4 mm de start, deci
  // închiderea lasă o încrucișare minusculă. Ușa n-o judecă (ADR 0034 §2); evenodd, ca normalizarea să nu intre în joc.
  { nume: 'U3 VfB: încrucișarea minusculă la închidere (evenodd): închisă de umplere, nejudecată la ușă', text: p100('<path fill-rule="evenodd" d="M 50 20 C 70 20 70 50 50 50 C 30 50 30 20 50.0006 20"/>'),
    hartie: { cai: 1, tipuri: ['CCL'], varfuri: [[0, 2, 50.0006, 80]], avertismente: { 'inchise-de-umplere': 1 }, goluri: [6e-4] } },
  // Presto: coordonate în px fără viewBox, rotunjite la 0,001 px: golul 0,001 · 25,4 / 96 = 2,6458e-4 mm.
  { nume: 'U4 Presto: golul de 0,001 px (2,6458e-4 mm la 96): închisă de umplere', text: svg('width="100" height="100"', '<path d="m 10 10 h 20 v 20 h -20 v -19.999"/>'),
    hartie: { cai: 1, px: true, tipuri: ['LLLLL'], varfuri: [[0, 0, 10 * K96, 90 * K96], [0, 4, 10 * K96, (100 - 10.001) * K96]], avertismente: { 'inchise-de-umplere': 1 }, goluri: [0.001 * K96] } },
  { nume: 'U5 triunghiul umplut fără Z, golul mare (√800 mm): închis cu o linie', text: p100('<path d="M 10 10 L 30 10 L 30 30"/>'),
    hartie: { cai: 1, tipuri: ['LLL'], varfuri: [[0, 0, 10, 90], [0, 1, 30, 90], [0, 2, 30, 70]], avertismente: { 'inchise-de-umplere': 1 }, goluri: [Math.sqrt(800)], laturi: ['exterior'] } },
  // 2.3c-3: subcăile care rămân deschise devin căi deschise (vârfurile plus vârful final), nu mai sunt sărite.
  { nume: 'U6 „M L” umplută și trei puncte pe o dreaptă: închiderea ar fi degenerată, rămân deschise (2.3c-3: căi deschise)', text: p100('<path d="M 10 10 L 30 10"/><path d="M 10 20 L 30 20 L 20 20"/><rect x="50" y="50" width="10" height="10"/>'),
    hartie: { cai: 3, forme: [0, 1, 2], tipuri: ['LL', 'LLL', 'LLLL'], inchis: [false, false, true], varfuri: [[0, 0, 10, 90], [0, 1, 30, 90], [1, 0, 10, 80], [1, 1, 30, 80], [1, 2, 20, 80]], laturi: ['pe-linie', 'pe-linie', 'exterior'], avertismente: { deschise: 2 } } },
  { nume: 'U7 „M L” umplută singură: o cale deschisă (2.3c-3; înainte fișierul era gol)', text: p100('<path d="M 10 10 L 30 10"/>'),
    hartie: { cai: 1, tipuri: ['LL'], inchis: [false], varfuri: [[0, 0, 10, 90], [0, 1, 30, 90]], laturi: ['pe-linie'], avertismente: { deschise: 1 } } },
  { nume: 'U8 polyline umplută: închisă de umplere; cu fill="none": o cale deschisă (2.3c-3)', text: p100('<polyline points="10,10 30,10 30,30"/><polyline fill="none" points="50,10 70,10 70,30"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLL', 'LLL'], inchis: [true, false], varfuri: [[0, 2, 30, 70], [1, 0, 50, 90], [1, 1, 70, 90], [1, 2, 70, 70]], laturi: ['exterior', 'pe-linie'], avertismente: { 'inchise-de-umplere': 1, deschise: 1 }, goluri: [Math.sqrt(800)] } },
  // Golul 0,005: |89,995 − 90|; golul 0,02: deschisă. A treia, o polilinie fără umplere cu golul 0,005: închisă la ușă.
  // Calea deschisă (2.3c-3): 4 segmente plus vârful final (50, 89,98), deci tot 5 vârfuri, fără linia de închidere.
  { nume: 'U9 fill="none": golul 0,005 mm se închide la ușă (path și polyline), golul 0,02 mm rămâne deschis (2.3c-3: o cale deschisă)', text: p100('<path fill="none" d="M 10 10 L 30 10 L 30 30 L 10 30 L 10 10.005"/><path fill="none" d="M 50 10 L 70 10 L 70 30 L 50 30 L 50 10.02"/><polyline fill="none" points="10,50 30,50 30,70 10,70 10,50.005"/>'),
    hartie: { cai: 3, forme: [0, 1, 2], tipuri: ['LLLLL', 'LLLLL', 'LLLLL'], inchis: [true, false, true], varfuri: [[0, 4, 10, 89.995], [1, 0, 50, 90], [1, 4, 50, 89.98], [2, 4, 10, 49.995]], avertismente: { 'inchise-la-usa': 2, deschise: 1 }, goluri: [0.005, 0.005], golLaUsa: 0.005, laturi: ['exterior', 'pe-linie', 'exterior'] } },
  { nume: 'U10 fill="none", doar golul 0,02 mm: o cale deschisă (2.3c-3; înainte fișierul era gol)', text: p100('<path fill="none" d="M 50 10 L 70 10 L 70 30 L 50 30 L 50 10.02"/>'),
    hartie: { cai: 1, tipuri: ['LLLLL'], inchis: [false], varfuri: [[0, 0, 50, 90], [0, 3, 50, 70], [0, 4, 50, 89.98]], avertismente: { deschise: 1 } } },
  { nume: 'U11 golul sub TOLERANTA_IMPORT (5e-7 mm), fără Z: închise în tăcere, fără număr (umplută și fără umplere)', text: p100('<path d="m 10 10 h 20 v 20 h -20 v -19.9999995"/><path fill="none" d="m 50 10 h 20 v 20 h -20 v -19.9999995"/>'),
    hartie: { cai: 2, tipuri: ['LLLL', 'LLLL'], varfuri: [[0, 3, 10, 70], [1, 3, 50, 70]], goluri: [], golLaUsa: 0 } },
  // Praful: diagonala 1e-4 · √2 mm. A doua e umplută fără Z (s-ar închide de umplere), a treia fără umplere (golul 1,4e-4 mm
  // s-ar închide la ușă): amândouă sunt praf, deci nu se numără închiderea. Precizarea 2.3c-6: triunghiurile stau la cel
  // mult 7,1e-5 mm de o dreaptă (linii, după punctul 4), dar praful (punctul 3) se judecă întâi: rămân praf.
  { nume: 'U12 praful: triunghiurile de 1e-4 mm (cu Z, fără Z umplut, fără Z fără umplere) sărite, sub-rezolutie', text: p100('<path d="M 20 20 l 0.0001 0 l 0 0.0001 z"/><path d="M 30 20 l 0.0001 0 l 0 0.0001"/><path fill="none" d="M 40 20 l 0.0001 0 l 0 0.0001"/><rect x="50" y="50" width="10" height="10"/>'),
    hartie: { cai: 1, forme: [3], avertismente: { 'sub-rezolutie': 3 } } },
  // Lângă prag: catetele 0,0035 (diagonala 0,00495 mm) și 0,008 (0,01131 mm). Precizarea 2.3c-6: praful se judecă înaintea
  // regulii liniei (U12, U13 neschimbate), iar triunghiul de 0,008 nu e o linie: vârful drept stă la 0,008 / √2 = 0,00566 mm
  // > 0,005 de ipotenuză (dreapta celor mai depărtate două puncte).
  { nume: 'U13 praful lângă prag: diagonala 0,00495 mm sărită, 0,01131 mm păstrată', text: p100('<path d="M 20 20 l 0.0035 0 l 0 0.0035 z"/><path d="M 30 20 l 0.008 0 l 0 0.008 z"/>'),
    hartie: { cai: 1, forme: [1], tipuri: ['LLL'], varfuri: [[0, 0, 30, 80], [0, 1, 30.008, 80], [0, 2, 30.008, 79.992]], avertismente: { 'sub-rezolutie': 1 } } },
  { nume: 'U14 praful singur: fișierul e gol, cu sub-rezolutie', text: p100('<path d="M 20 20 l 0.0001 0 l 0 0.0001 z"/>'),
    hartie: { cod: 'gol', avertismente: { 'sub-rezolutie': 1 } } },
  // Degenerata rămâne înaintea prafului (ALEGERE): `M Z` și linia nulă închisă sunt `degenerate`, ca în 2.7c (C19, C23).
  { nume: 'U15 degenerată și praf deodată (M Z, M L Z de 1e-7): degenerate, ca în 2.7c; triunghiul de 1e-4: sub-rezolutie', text: p100('<path d="M 20 20 Z"/><path d="M 0 0 L 1e-7 0 Z"/><path d="M 20 30 l 0.0001 0 l 0 0.0001 z"/><rect x="50" y="50" width="5" height="5"/>'),
    hartie: { cai: 1, forme: [3], avertismente: { degenerate: 2, 'sub-rezolutie': 1 } } },
  { nume: 'U16 fill moștenit de la grup: none lasă deschisă (2.3c-3: cale deschisă), o culoare pe formă o închide, fill="inherit" ia none', text: p100('<g fill="none"><path d="M 10 10 L 30 10 L 30 30"/><path fill="#000" d="M 50 10 L 70 10 L 70 30"/><path fill="inherit" d="M 10 50 L 30 50 L 30 70"/></g>'),
    hartie: { cai: 3, forme: [0, 1, 2], tipuri: ['LLL', 'LLL', 'LLL'], inchis: [false, true, false], varfuri: [[0, 2, 30, 70], [1, 0, 50, 90], [1, 1, 70, 90], [1, 2, 70, 70], [2, 0, 10, 50], [2, 2, 30, 30]], avertismente: { 'inchise-de-umplere': 1, deschise: 2 } } },
  { nume: 'U17 fill dintr-o clasă CSS: .c{fill:none} lasă deschisă (și moștenit, pe o polilinie; 2.3c-3: căi deschise); .u{fill:#123} sub un grup none o închide', text: p100('<style>.c{fill:none} .u{fill:#123}</style><path class="c" d="M 10 10 L 30 10 L 30 30"/><g fill="none"><path class="u" d="M 50 10 L 70 10 L 70 30"/></g><g class="c"><polyline points="10,50 30,50 30,70"/></g>'),
    hartie: { cai: 3, forme: [0, 1, 2], tipuri: ['LLL', 'LLL', 'LLL'], inchis: [false, true, false], varfuri: [[1, 0, 50, 90], [2, 2, 30, 30]], avertismente: { 'inchise-de-umplere': 1, deschise: 2 } } },
  { nume: 'U18 style="fill:none" pe grup, golul 0,005 mm: închisă la ușă; style="fill:red" pe formă: închisă de umplere', text: p100('<g style="fill:none"><path d="M 10 10 L 30 10 L 30 30 L 10 30 L 10 10.005"/><path style="fill:red" d="M 50 10 L 70 10 L 70 30"/></g>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLLL', 'LLL'], avertismente: { 'inchise-la-usa': 1, 'inchise-de-umplere': 1 }, goluri: [0.005, Math.sqrt(800)], golLaUsa: 0.005 } },
  // Ca N1, fără Z: cele două dreptunghiuri se închid de umplere, apoi forma nonzero se normalizează (reuniunea, 2 000 mm²).
  { nume: 'U19 două dreptunghiuri suprapuse fără Z, umplute (nonzero): închise de umplere, apoi normalizate (reuniunea)', text: p100('<path d="M 10 10 h 40 v 30 h -40 M 30 20 h 40 v 30 h -40"/>'),
    hartie: { cai: 2, forme: [0, 0], tipuri: ['LLLL', 'LLLL'], avertismente: { 'inchise-de-umplere': 2, 'nonzero-normalizate': 1 }, goluri: [30, 30], final: { cai: 1, laturi: ['exterior'], arie: 2000 } } },
  { nume: 'U20 aceleași, fill="none" și golul 0,005 mm: închise la ușă, nenormalizate, imbricate', text: p100('<path fill="none" d="M 10 10 h 40 v 30 h -40 v -29.995 M 30 20 h 40 v 30 h -40 v -29.995"/>'),
    hartie: { cai: 2, tipuri: ['LLLLL', 'LLLLL'], laturi: ['exterior', 'interior'], avertismente: { 'inchise-la-usa': 2 }, goluri: [0.005, 0.005], golLaUsa: 0.005, final: { cai: 2, laturi: ['exterior', 'interior'] } } },
  { nume: 'U21 o cale închisă de umplere într-un dreptunghi: interioară (imbricarea)', text: p100('<rect x="10" y="10" width="80" height="80"/><path d="M 30 30 L 70 30 L 70 70 L 30 70"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLL', 'LLLL'], laturi: ['exterior', 'interior'], avertismente: { 'inchise-de-umplere': 1 }, goluri: [40], final: { cai: 2, laturi: ['exterior', 'interior'], arie: 6400 - 1600 } } },
  // CNC-referinta (stratul GRAVARE): valul de 150 mm cu fill="none" moștenit de la strat rămâne deschis: din 2.3c-3, o cale
  // deschisă (cubica din fișier, apoi vârful final (310, 60)); cercul rămâne.
  { nume: 'U22 CNC-referinta: valul de 150 mm, fill="none" pe strat, rămâne deschis (2.3c-3: o cale deschisă)', text: svg('width="400mm" height="300mm" viewBox="0 0 400 300"', '<g fill="none" stroke="#000" stroke-width="0.2"><circle cx="70" cy="73" r="50"/></g><g fill="none" stroke="#000" stroke-width="0.2"><path d="M160,240C210,180 260,300 310,240"/></g>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['AA', 'CL'], inchis: [true, false], varfuri: [[1, 0, 160, 60], [1, 1, 310, 60]], laturi: ['exterior', 'pe-linie'], avertismente: { deschise: 1 } } },
  // `line` nu trece prin praf (ALEGERE): e mereu deschisă, oricât de scurtă (ADR 0035 §4); din 2.3c-3, regula ei de lungime:
  // sub 0,01 mm, degenerată.
  { nume: 'U23 line de 1e-4 mm: degenerată (2.3c-3: sub 0,01 mm), nu sub-rezolutie', text: p100('<line x1="5" y1="5" x2="5.0001" y2="5"/><rect width="5" height="5"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { degenerate: 1 } } },
  // ADR 0037 §11 (precizarea 13.10), reproducerea minimă a logoului VfB: ultima latură a pătratului fără Z, (10, 30) →
  // E = (10,00004; 9,99996), taie prima latură (y = 10) în X = (10 + 4e-5 · 20 / 20,00004; 10), lângă start, iar linia de
  // închidere E → (10, 10) lasă bucla X–E–S (diagonala 5,66e-5 mm), în sens opus pătratului: înfășurarea −1, umplută sub
  // nonzero. Dreptunghiul suprapus din aceeași cale face forma de normalizat; ieșirea are reuniunea și bucla, iar ușa sare
  // bucla (praful ieșirii), numărată la `sub-rezolutie`. Rămâne reuniunea: patrulaterul X, (30, 10), (30, 30), (10, 30)
  // plus 400 − 25 mm².
  { nume: 'U24 VfB minim: bucla de închidere sub rezoluție, scoasă din normalizare (praful ieșirii)', text: p100(`<path d="${VFB_BUCLA} M 25 75 L 45 75 L 45 55 L 25 55 Z"/>`),
    hartie: { cai: 2, forme: [0, 0], tipuri: ['LLLLL', 'LLLL'], laturi: ['exterior', 'interior'], varfuri: [[0, 4, 10.00004, 100 - 90.00004]],
      avertismente: { 'inchise-de-umplere': 1, 'nonzero-normalizate': 1 }, prafNormalizare: 1, final: { cai: 1, laturi: ['exterior'], arie: ARIE_VFB_PATRULATER + 375 } } },
  // Aceeași buclă într-o formă care nu se normalizează (un singur contur, deja evenodd: lobii ±1): rămâne în contur, ca
  // forma 1 a logoului VfB; praful ieșirii nu se aplică.
  { nume: 'U25 aceeași buclă de închidere, fără normalizare (deja evenodd): rămâne în contur, fără praf', text: p100(`<path d="${VFB_BUCLA}"/>`),
    hartie: { cai: 1, tipuri: ['LLLLL'], avertismente: { 'inchise-de-umplere': 1 }, prafNormalizare: 0, final: { cai: 1 } } },
  // Bucla de închidere subțire: E la 1e-7 mm sub prima latură (raza înscrisă 2·aria / perimetrul ≈ 5e-8 mm, peste 2τ ≈ 1e-8):
  // tot praf, scos din ieșire și numărat.
  { nume: 'U27 bucla de închidere de 4e-5 × 1e-7 mm, în forma normalizată: praf, scoasă și numărată', text: p100('<path d="M 10 90 L 30 90 L 30 70 L 10 70 L 10.00004 90.0000001 M 25 75 L 45 75 L 45 55 L 25 55 Z"/>'),
    hartie: { cai: 2, forme: [0, 0], avertismente: { 'inchise-de-umplere': 1, 'nonzero-normalizate': 1 }, prafNormalizare: 1, final: { cai: 1, laturi: ['exterior'] } } },
  // Pragul prafului pe ieșirea normalizării: un pătrat de 0,0085 mm (diagonala 0,01202 ≥ 0,01) în forma normalizată nu e
  // praf: rămâne contur (controlul negativ îl scoate și cere să fie prins).
  { nume: 'U26 un pătrat de 0,0085 mm în forma normalizată: diagonala 0,012 mm, nu e praf, rămâne', text: p100('<path d="M 10 90 h 20 v -20 h -20 z M 25 75 h 20 v -20 h -20 z M 60 40 h 0.0085 v -0.0085 h -0.0085 z"/>'),
    hartie: { cai: 3, forme: [0, 0, 0], avertismente: { 'nonzero-normalizate': 1 }, prafNormalizare: 0, final: { cai: 2, laturi: ['exterior', 'exterior'], arie: 775 + 0.0085 * 0.0085 } } },
];

// ---------------------------------------------------------------------------------------------------------------------
// L. Căile deschise (sub-felia 2.3c-3, ADR 0037 §11, partea a doua; amendează ADR 0035 §7, §8, §10). Pe hârtie:
// - devin căi deschise (`inchis: false`): orice `line`, subcăile fără `Z` cu `fill: none` și golul peste 0,01 mm,
//   `polyline`-urile cu `fill: none` care nu se închid, și subcăile pe care închiderea ușii le-ar face degenerate;
// - calea are vârfurile subcăii plus vârful final (capătul ultimului segment), cu segmentul L; tipurile au deci un L la
//   coadă (o linie: „LL”);
// - degenerată (sărită, `degenerate`) cu mai puțin de 2 vârfuri distincte sau cu lungimea sub 0,01 mm;
// - nu intră în imbricare (latura `pe-linie`, nu conțin nimic) și nici în normalizarea nonzero; `deschise` le numără;
// - refuzul `gol` = nicio cale.

const L: CazSvg[] = [
  { nume: 'L1 o line singură: o cale deschisă, cu vârful final', text: p100('<line x1="10" y1="10" x2="60" y2="40"/>'),
    hartie: { cai: 1, forme: [0], tipuri: ['LL'], inchis: [false], varfuri: [[0, 0, 10, 90], [0, 1, 60, 60]], laturi: ['pe-linie'], avertismente: { deschise: 1 } } },
  // rotate(90): (x, y) → (−y, x): (10, −30) → (30, 10), (20, −30) → (30, 20).
  { nume: 'L2 line sub o transformare (rotate(90))', text: p100('<line transform="rotate(90)" x1="10" y1="-30" x2="20" y2="-30"/>'),
    hartie: { cai: 1, tipuri: ['LL'], inchis: [false], varfuri: [[0, 0, 30, 90], [0, 1, 30, 80]], avertismente: { deschise: 1 } } },
  { nume: 'L3 polyline cu fill="none" care nu se închide: o cale deschisă cu 4 vârfuri (3 segmente + final)', text: p100('<polyline fill="none" points="10,10 50,10 50,50 20,40"/>'),
    hartie: { cai: 1, tipuri: ['LLLL'], inchis: [false], varfuri: [[0, 0, 10, 90], [0, 1, 50, 90], [0, 2, 50, 50], [0, 3, 20, 60]], laturi: ['pe-linie'], avertismente: { deschise: 1 } } },
  // Cubica din fișier (10, 50) → (50, 50), apoi semicercul A 20 20 0 0 0 spre (90, 50): centrul (70, 50), prin (70, 30) în
  // mm, deci trigonometric: bulge = +1. Vârful final (90, 50), cu L.
  { nume: 'L4 cale cu fill="none" din cubică și semicerc: CAL, bulge +1', text: p100('<path fill="none" d="M 10 50 C 20 70 40 70 50 50 A 20 20 0 0 0 90 50"/>'),
    hartie: { cai: 1, tipuri: ['CAL'], inchis: [false], varfuri: [[0, 0, 10, 50], [0, 1, 50, 50], [0, 2, 90, 50]], bulge: [[0, 1, tan4]], avertismente: { deschise: 1 } } },
  { nume: 'L5 fișierul doar din linii (o gravură): se importă, două căi deschise, cu numele', text: p100('<line id="sus" x1="0" y1="0" x2="100" y2="0"/><line id="jos" x1="0" y1="50" x2="100" y2="50"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LL', 'LL'], inchis: [false, false], nume: ['sus', 'jos'], varfuri: [[0, 0, 0, 100], [0, 1, 100, 100], [1, 0, 0, 50], [1, 1, 100, 50]], laturi: ['pe-linie', 'pe-linie'], avertismente: { deschise: 2 } } },
  // Pragul degenerării (0,01 mm), pe linii: line de 0,009 mm degenerată, de 0,011 mm cale; „M L” umplută (închiderea ar fi
  // degenerată, deci rămâne deschisă) de 0,006 mm degenerată, de 0,02 mm cale.
  { nume: 'L6 pragul degenerării: 0,009 și 0,006 mm degenerate, 0,011 și 0,02 mm căi deschise', text: p100('<line x1="5" y1="5" x2="5.009" y2="5"/><line x1="5" y1="10" x2="5.011" y2="10"/><path d="M 30 30 L 30.006 30"/><path d="M 40 40 L 40.02 40"/>'),
    hartie: { cai: 2, forme: [1, 3], tipuri: ['LL', 'LL'], inchis: [false, false], varfuri: [[0, 0, 5, 90], [0, 1, 5.011, 90], [1, 0, 40, 60], [1, 1, 40.02, 60]], avertismente: { degenerate: 2, deschise: 2 } } },
  { nume: 'L7 doar căi deschise degenerate: nicio cale, gol (cu raportul)', text: p100('<line x1="5" y1="5" x2="5" y2="5"/><path d="M 30 30 L 30.006 30"/><text>t</text>'),
    hartie: { cod: 'gol', avertismente: { degenerate: 2, 'sarit-text': 1 } } },
  // Imbricarea fără căile deschise: U-ul deschis (10, 90) → (10, 10) → (90, 10) → (90, 90), citit închis (cu orice coardă:
  // (90, 90) → (10, 90), sau peste ultimul segment, (90, 10) → (10, 90)), ar conține primul vârf (20, 40) al pătratului mic
  // (adâncimea 2: exterior); deschis, nu conține nimic (adâncimea 1: interior, în pătratul mare). Linia din pătratul mic nu
  // primește latură. Aria regiunii: 10 000 − 100, căile deschise nu intră.
  { nume: 'L8 imbricarea fără căile deschise: U-ul deschis nu conține pătratul, linia nu primește latură', text: p100('<path fill="none" d="M 10 10 L 10 90 L 90 90 L 90 10"/><rect x="20" y="60" width="10" height="10"/><rect width="100" height="100"/><line x1="25" y1="62" x2="25" y2="68"/>'),
    hartie: { cai: 4, forme: [0, 1, 2, 3], tipuri: ['LLLL', 'LLLL', 'LLLL', 'LL'], inchis: [false, true, true, false], varfuri: [[1, 0, 20, 40]], laturi: ['pe-linie', 'interior', 'exterior', 'pe-linie'], avertismente: { deschise: 2 },
      final: { cai: 4, laturi: ['pe-linie', 'interior', 'exterior', 'pe-linie'], arie: 9900 } } },
  // Ca N7 (o cale și inversa ei: regiunea vidă), plus „M L” umplută în aceeași formă: închiderea ar fi degenerată, deci o
  // cale deschisă, care nu intră în normalizare. Forma își pierde căile închise, dar fișierul nu e gol: rămâne linia.
  // Precizarea 2.3c-6: „o formă golită de tot” e ambiguă aici (regiunea e vidă, linia rămâne): predicția o numără la
  // `degenerate`; `judecaRezultat` primește de la aplicație 0 sau 1 (ALEGERE, în raport).
  { nume: 'L9 o formă nonzero vidă cu o cale deschisă: linia rămâne, fișierul nu e gol', text: p100('<path d="M 10 10 h 20 v 20 h -20 z M 10 10 v 20 h 20 v -20 z M 50 50 L 90 50"/>'),
    hartie: { cai: 3, forme: [0, 0, 0], tipuri: ['LLLL', 'LLLL', 'LL'], inchis: [true, true, false], varfuri: [[2, 0, 50, 50], [2, 1, 90, 50]], avertismente: { 'nonzero-normalizate': 1, deschise: 1, degenerate: 1 }, final: { cai: 1, laturi: ['pe-linie'], arie: 0 } } },
  // Ca N1 (reuniunea, 2 000 mm²), plus o linie umplută în aceeași formă: reuniunea doar din căile închise; linia rămâne.
  { nume: 'L10 reuniunea nonzero cu o cale deschisă în aceeași formă: linia rămâne în afara normalizării', text: p100('<path d="M 10 10 h 40 v 30 h -40 z M 30 20 h 40 v 30 h -40 z M 10 80 L 90 80"/>'),
    hartie: { cai: 3, forme: [0, 0, 0], tipuri: ['LLLL', 'LLLL', 'LL'], inchis: [true, true, false], avertismente: { 'nonzero-normalizate': 1, deschise: 1 }, final: { cai: 2, arie: 2000 } } },
  // Pătratul umplut singur e deja evenodd (un contur simplu): nu se normalizează. Linia „M L” din aceeași formă (o cale
  // deschisă: închiderea ei ar fi degenerată) stă pe latura de sus a pătratului; dacă ar intra în normalizare, muchiile
  // coincidente ar cere schimbarea formei (ADR 0036). Căile deschise nu intră (ADR 0037 §11): nonzero-normalizate 0.
  { nume: 'L17 o cale deschisă pe latura unui pătrat umplut, în aceeași formă: nu intră în normalizare (pătratul rămâne)', text: p100('<path d="M 10 10 h 20 v 20 h -20 z M 10 10 L 30 10"/>'),
    hartie: { cai: 2, forme: [0, 0], tipuri: ['LLLL', 'LL'], inchis: [true, false], varfuri: [[1, 0, 10, 90], [1, 1, 30, 90]], laturi: ['exterior', 'pe-linie'], avertismente: { deschise: 1 }, final: { cai: 2, laturi: ['exterior', 'pe-linie'], arie: 400 } } },
  { nume: 'L11 ordinea subcăilor într-o formă fill="none": închisă, deschisă, închisă', text: p100('<path fill="none" d="M 10 10 h 20 v 20 h -20 z M 50 10 L 90 10 M 50 50 h 20 v 20 h -20 z"/>'),
    hartie: { cai: 3, forme: [0, 0, 0], tipuri: ['LLLL', 'LL', 'LLLL'], inchis: [true, false, true], varfuri: [[1, 0, 50, 90], [1, 1, 90, 90]], laturi: ['exterior', 'pe-linie', 'exterior'], avertismente: { deschise: 1 } } },
  // translate(100, 0) scale(−1, 1): x → 100 − x. Semicercul din (90, 50) spre (50, 50), sens 0: în mm, din (10, 50) prin
  // (30, 70) în (50, 50), orar: det(M) = (−1)(−1) = +1, Δθ = −π, bulge = −1. Apoi linia spre (50, 80), vârful final.
  { nume: 'L12 cale deschisă oglindită, cu un semicerc: bulge −1, sensul din fișier păstrat', text: p100('<g transform="translate(100, 0) scale(-1, 1)"><path fill="none" d="M 90 50 A 20 20 0 0 0 50 50 L 50 20"/></g>'),
    hartie: { cai: 1, tipuri: ['ALL'], inchis: [false], varfuri: [[0, 0, 10, 50], [0, 1, 50, 50], [0, 2, 50, 80]], bulge: [[0, 0, -tan4]], avertismente: { deschise: 1 } } },
  // σ = 20: φ = 0,37425, n = ⌈π / φ⌉ = 9 cubice, apoi vârful final (50, 50).
  { nume: 'L13 jumătate de elipsă deschisă: 9 cubice și vârful final', text: p100('<path fill="none" d="M 10 50 A 20 10 0 0 1 50 50"/>'),
    hartie: { cai: 1, tipuri: [`${'C'.repeat(9)}L`], inchis: [false], varfuri: [[0, 0, 10, 50], [0, 9, 50, 50]], avertismente: { deschise: 1, 'arce-eliptice': 1, 'cubice-din-arce': 9 } } },
  { nume: 'L14 cale deschisă cu o linie nulă și un arc cu capetele egale: scoase', text: p100('<path fill="none" d="M 10 10 L 30 10 L 30 10 A 5 5 0 0 1 30 10 L 30 30"/>'),
    hartie: { cai: 1, tipuri: ['LLL'], inchis: [false], varfuri: [[0, 0, 10, 90], [0, 1, 30, 90], [0, 2, 30, 70]], avertismente: { deschise: 1 } } },
  // Dus-întors pe aceeași dreaptă: pe o cale deschisă e voie (ADR 0037 §4: autointersecția e permisă), lungimea 120 mm.
  { nume: 'L15 polyline dus-întors pe o dreaptă (fill="none"): o cale deschisă, nu degenerată', text: p100('<polyline fill="none" points="10,10 90,10 50,10"/>'),
    hartie: { cai: 1, tipuri: ['LLL'], inchis: [false], varfuri: [[0, 0, 10, 90], [0, 1, 90, 90], [0, 2, 50, 90]], avertismente: { deschise: 1 } } },
  // Fără viewBox, la 96: 1 px = K96 mm; pagina 100 px, deci y_mm = (100 − y) · K96.
  { nume: 'L16 line în px (fără viewBox, 96)', text: svg('width="100" height="100"', '<line x1="0" y1="0" x2="96" y2="0"/>'),
    hartie: { cai: 1, px: true, tipuri: ['LL'], inchis: [false], varfuri: [[0, 0, 0, 100 * K96], [0, 1, 25.4, 100 * K96]], avertismente: { deschise: 1 } } },
];

// ---------------------------------------------------------------------------------------------------------------------
// P. Precizarea 2.3c-6 (ADR 0037 §11, „Închiderea fără arie lasă o linie”, textul corectat). Pe hârtie, pe o subcale
// închisă (de autor: cu Z sau cu golul ≤ 1e-6 mm; de umplere; de ușă: fill="none" și golul ≤ 0,01 mm), în ordinea:
// (1) sub 2 vârfuri: degenerată; (2) numai linii pe o dreaptă la 1e-12: LINIE; (3) praful (diagonala < 0,01 mm);
// (4) fără arce, toate punctele cu mânerele la ≤ 0,005 mm de dreapta celor mai depărtate două puncte: LINIE.
// Linia e o cale deschisă (`deschise`; sub 0,01 mm, `degenerate`): închisă de ușă / umplere, fără linia de închidere;
// închisă de autor, cu drumul înapoi până în start (vârful final = startul). Pe pagina de 100 mm: x_mm = x, y_mm = 100 − y.

/** Linia (10, 50) → (60, 50), o cale deschisă: aceeași hârtie oricum ar fi scrisă (P1–P5). */
const LINIA_P = (tip: string): Hartie => ({ cai: 1, forme: [0], tipuri: [tip], inchis: [false], varfuri: [[0, 0, 10, 50], [0, 1, 60, 50]], laturi: ['pe-linie'], avertismente: { deschise: 1 } });

const P: CazSvg[] = [
  // Umplută, fără Z: închisă de umplere, deci linia pierde linia de închidere; (2) exact pe dreaptă (ca U7).
  { nume: 'P1 linia umplută scrisă cu l: o cale deschisă (10, 50) → (60, 50)', text: p100('<path d="M 10 50 l 50 0"/>'), hartie: LINIA_P('LL') },
  // (4): mânerele (20, 50) și (50, 50) pe dreaptă; cubica din fișier rămâne cubică (ADR 0035 §6), apoi vârful final.
  { nume: 'P2 linia umplută scrisă cu c, mânerele pe dreaptă: aceeași cale deschisă (CL)', text: p100('<path d="M 10 50 c 10 0 40 0 50 0"/>'), hartie: LINIA_P('CL') },
  // Mânerele la 0,001 mm de dreaptă (zgomotul rotunjirii, ca la Illustrator): (20, 49,999), (50, 50,001) ≤ 0,005.
  { nume: 'P3 linia umplută scrisă cu c, mânerele cu zgomot de 0,001 mm: aceeași cale deschisă', text: p100('<path d="M 10 50 c 10 0.001 40 -0.001 50 0"/>'), hartie: LINIA_P('CL') },
  // Q ridicată exact: c1 = (10 + ⅔·25, 50), c2 = (60 − ⅔·25, 50), pe dreaptă.
  { nume: 'P4 linia umplută scrisă cu q: aceeași cale deschisă', text: p100('<path d="M 10 50 q 25 0 50 0"/>'), hartie: LINIA_P('CL') },
  // Mânerele retrase (Inkscape: c 0,0 … 50,0 50,0): c1 = startul, c2 = capătul.
  { nume: 'P5 linia umplută cu mânerele retrase (Inkscape): aceeași cale deschisă', text: p100('<path d="M 10 50 c 0 0 50 0 50 0"/>'), hartie: LINIA_P('CL') },
  // Închise de autor (Z), umplută și fără umplere: drumul înapoi e linia de închidere, vârful final e startul.
  { nume: 'P6 M10 10 L60 10 Z (umplută și fill="none"): o linie dus-întors, nu „fără lungime”', text: p100('<path d="M10 10 L60 10 Z"/><path fill="none" d="M10 20 L60 20 Z"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLL', 'LLL'], inchis: [false, false], varfuri: [[0, 0, 10, 90], [0, 1, 60, 90], [0, 2, 10, 90], [1, 0, 10, 80], [1, 1, 60, 80], [1, 2, 10, 80]], laturi: ['pe-linie', 'pe-linie'], avertismente: { deschise: 2 } } },
  // Închisă de autor prin apropiere (golul 0): drumul înapoi e segmentul desenat.
  { nume: 'P7 M10 10 L60 10 L10 10: o linie dus-întors', text: p100('<path d="M10 10 L60 10 L10 10"/>'),
    hartie: { cai: 1, tipuri: ['LLL'], inchis: [false], varfuri: [[0, 0, 10, 90], [0, 1, 60, 90], [0, 2, 10, 90]], laturi: ['pe-linie'], avertismente: { deschise: 1 } } },
  // (4): fâșia de 0,004 × 50 mm: colțurile stau la ≤ 0,004 mm de diagonală (dreapta celor mai depărtate două puncte). Ca
  // path cu Z (linia de închidere adăugată) și ca rect (latura a patra e scrisă): amândouă LLLLL, cu vârful final în start.
  { nume: 'P8 fâșia închisă de 0,004 × 50 mm (path cu Z și rect): o linie dus-întors', text: p100('<path d="M 10 50 h 50 v 0.004 h -50 z"/><rect x="10" y="60" width="50" height="0.004"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLLL', 'LLLLL'], inchis: [false, false], varfuri: [[0, 0, 10, 50], [0, 2, 60, 49.996], [0, 3, 10, 49.996], [0, 4, 10, 50], [1, 0, 10, 40], [1, 2, 60, 39.996], [1, 4, 10, 40]], laturi: ['pe-linie', 'pe-linie'], avertismente: { deschise: 2 } } },
  // Martor negativ: fâșia de 0,02 mm: colțurile la ~0,02 mm de diagonală > 0,005. Rămâne contur (simplu, deja evenodd).
  { nume: 'P9 fâșia închisă de 0,02 × 50 mm: rămâne contur închis', text: p100('<path d="M 10 50 h 50 v 0.02 h -50 z"/>'),
    hartie: { cai: 1, tipuri: ['LLLL'], inchis: [true], varfuri: [[0, 0, 10, 50], [0, 1, 60, 50], [0, 2, 60, 49.98], [0, 3, 10, 49.98]], laturi: ['exterior'], final: { cai: 1, laturi: ['exterior'], arie: 50 * 0.02 } } },
  // Praful înaintea regulii liniei (punctul 3 înaintea lui 4): acul de 0,008 mm (al treilea vârf la 1e-6 mm de dreaptă: nu
  // exact pe ea) are diagonala 0,008 < 0,01: praf. Ca linie, dus-întors ar avea 0,016 mm și s-ar importa.
  { nume: 'P10 acul de 0,008 mm aproape pe dreaptă: praf (judecat înaintea liniei), nu linie', text: p100('<path d="M 20 20 l 0.008 0 l -0.004 0.000001 z"/><rect x="50" y="50" width="10" height="10"/>'),
    hartie: { cai: 1, forme: [1], avertismente: { 'sub-rezolutie': 1 } } },
  // Punctul 2 (coliniarul EXACT, la 1e-12) stă înaintea prafului (textul corectat): poligonul (10, 90) (10,004, 90)
  // (10,008, 90) e o linie dus-întors de 0,016 mm ≥ 0,01: importată; același cu al treilea vârf la 1e-6 mm de dreaptă e
  // praf; „M 30 30 L 30,004 30 Z” e o linie de 0,008 mm: degenerată (nu praf). Consecință literală a ordinii, spusă în raport.
  { nume: 'P11 coliniarul exact sub rezoluție (punctul 2 înaintea prafului): linia de 0,016 mm importată, cea de 0,008 degenerată; neexact: praf', text: p100('<polygon points="10,10 10.004,10 10.008,10"/><polygon points="10,20 10.004,20 10.008,20.000001"/><path d="M 30 30 L 30.004 30 Z"/><rect x="50" y="50" width="10" height="10"/>'),
    hartie: { cai: 2, forme: [0, 3], tipuri: ['LLLL', 'LLLL'], inchis: [false, true], varfuri: [[0, 0, 10, 90], [0, 1, 10.004, 90], [0, 2, 10.008, 90], [0, 3, 10, 90]], laturi: ['pe-linie', 'exterior'], avertismente: { deschise: 1, degenerate: 1, 'sub-rezolutie': 1 } } },
  // Pragul de 0,005 mm, cu startul în vârful din mijloc: (10, 50) – (60, 50) sunt cele mai depărtate (50 mm); vârful (35, …)
  // stă la 0,0045 (linie) sau la 0,0055 (contur). Dreapta prin start și punctul cel mai depărtat de el ar lăsa celălalt capăt
  // la ~0,009 mm (deci perechea contează).
  { nume: 'P12 pragul de 0,005 mm: triunghiul de 0,0045 mm e linie, cel de 0,0055 mm rămâne contur', text: p100('<path d="M 35 50.0045 L 10 50 L 60 50 Z"/><path d="M 35 70.0055 L 10 70 L 60 70 Z"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLLL', 'LLL'], inchis: [false, true], varfuri: [[0, 0, 35, 49.9955], [0, 1, 10, 50], [0, 2, 60, 50], [0, 3, 35, 49.9955], [1, 0, 35, 29.9945], [1, 1, 10, 30], [1, 2, 60, 30]], laturi: ['pe-linie', 'exterior'], avertismente: { deschise: 1 } } },
  // Martorii negativi ai regulii (evenodd: normalizarea nu intră în joc): (a) cubica în S cu mânerele la 0,008 mm de dreaptă
  // (curba însăși stă la ≤ 0,0023 mm: 0,024·t(1 − t)(1 − 2t) la t = 0,211): mânerele contează, rămâne contur, închis de
  // umplere; (b) arcul de R 9 000 mm pe coarda de 10 mm (săgeata 100 / 72 000 = 0,0014 mm): are arce, rămâne contur.
  { nume: 'P13 martorii negativi: cubica cu mânerele la 0,008 mm (curba la 0,0023) și arcul plat cu săgeata 0,0014 mm rămân contururi', text: p100('<path fill-rule="evenodd" d="M 10 30 C 20 30.008 50 29.992 60 30"/><path fill-rule="evenodd" d="M 10 10 A 9000 9000 0 0 1 20 10 Z"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['CL', 'AL'], inchis: [true, true], varfuri: [[0, 0, 10, 70], [0, 1, 60, 70], [1, 0, 10, 90], [1, 1, 20, 90]], laturi: ['exterior', 'exterior'], avertismente: { 'inchise-de-umplere': 1 }, goluri: [50] } },
  // Închisă de ușă (fill="none", golul 0,002 ≤ 0,01) și de umplere (golul 0,002): (4) linii, fără linia de închidere;
  // vârful final e capătul subcăii (10, 49,998), nu startul. Nu se numără la inchise-la-usa / inchise-de-umplere.
  { nume: 'P14 linia închisă de ușă (fill="none", golul 0,002 mm) și de umplere: căi deschise fără linia de închidere', text: p100('<path fill="none" d="M 10 50 L 60 50 L 10 50.002"/><path d="M 10 30 L 60 30 L 10 30.002"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['LLL', 'LLL'], inchis: [false, false], varfuri: [[0, 0, 10, 50], [0, 1, 60, 50], [0, 2, 10, 49.998], [1, 0, 10, 70], [1, 1, 60, 70], [1, 2, 10, 69.998]], laturi: ['pe-linie', 'pe-linie'], avertismente: { deschise: 2 } } },
  // Bulina a doua: semicercul dus-întors (același arc, sensuri opuse; Λ = 1, centrul (20, 50)) are arce, deci nu e linie:
  // intră în normalizare (muchii coincidente), care îl golește de tot: nonzero-normalizate și degenerate.
  { nume: 'P15 semicercul dus-întors (arce) lângă un dreptunghi: golit de normalizare, numărat și degenerate', text: p100('<path d="M 10 50 A 10 10 0 0 1 30 50 A 10 10 0 0 0 10 50 Z"/><rect x="60" y="60" width="10" height="10"/>'),
    hartie: { cai: 2, forme: [0, 1], tipuri: ['AA', 'LLLL'], avertismente: { 'nonzero-normalizate': 1, degenerate: 1 }, final: { cai: 1, laturi: ['exterior'], arie: 100 } } },
  // Închisă de autor, scrisă cu C (Illustrator): cubica, apoi drumul înapoi (linia de închidere), vârful final în start.
  { nume: 'P16 linia umplută scrisă cu C și închisă cu Z: cubica și drumul înapoi (CLL)', text: p100('<path d="M 10 50 C 20 50 50 50 60 50 Z"/>'),
    hartie: { cai: 1, tipuri: ['CLL'], inchis: [false], varfuri: [[0, 0, 10, 50], [0, 1, 60, 50], [0, 2, 10, 50]], laturi: ['pe-linie'], avertismente: { deschise: 1 } } },
];

// ---------------------------------------------------------------------------------------------------------------------
// H. Refuzurile mici (cele mari stau în testul lor).

const H: CazSvg[] = [
  { nume: 'H1 XML stricat', text: '<svg xmlns="http://www.w3.org/2000/svg"><rect></svg>', hartie: { cod: 'parsare' } },
  { nume: 'H2 text care nu e XML', text: 'hello', hartie: { cod: 'parsare' } },
  { nume: 'H3 fișier gol', text: '', hartie: { cod: 'parsare' } },
  { nume: 'H4 entitate nedeclarată', text: p100('<rect width="&foo;" height="5"/>'), hartie: { cod: 'parsare' } },
  { nume: 'H5 rădăcina html', text: '<html xmlns="http://www.w3.org/1999/xhtml"><body/></html>', hartie: { cod: 'radacina' } },
  { nume: 'H6 svg în alt spațiu de nume', text: '<svg xmlns="http://example.com/x"><rect width="5" height="5"/></svg>', hartie: { cod: 'radacina' } },
  // ADR 0037 §11 (2.3c-3): refuzul `gol` = nicio cale; un fișier doar din linii se importă (înainte: refuzat `gol`).
  { nume: 'H7 nicio cale închisă, doar linii: se importă, trei căi deschise (2.3c-3; înainte gol)', text: p100('<line x2="10"/><path d="M 0 0 L 10 10"/><polyline points="0,0 5,5"/><text>t</text>'),
    hartie: { cai: 3, forme: [0, 1, 2], tipuri: ['LL', 'LL', 'LL'], inchis: [false, false, false], varfuri: [[0, 0, 0, 100], [0, 1, 10, 100], [1, 1, 10, 90], [2, 1, 5, 95]], laturi: ['pe-linie', 'pe-linie', 'pe-linie'], avertismente: { deschise: 3, 'sarit-text': 1 } } },
  { nume: 'H8 svg gol', text: p100(''), hartie: { cod: 'gol' } },
  { nume: 'H9 coordonată peste 10⁷ mm', text: p100('<rect x="20000000" width="10" height="10"/>'), hartie: { cod: 'departe' } },
  { nume: 'H10 fără pagină, departe în y', text: svg('', '<rect y="-40000000" width="10" height="10"/>'), hartie: { cod: 'departe' } },
  { nume: 'H11 svgz', octeti: () => new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00]), hartie: { cod: 'svgz' } },
  { nume: 'H21 entitate fără nume', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY "x">]>${p100('<rect width="5" height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'fara-nume' } },
  { nume: 'H22 entitate neterminată (fișier tăiat)', text: '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "x', hartie: { cod: 'entitati', detaliu: 'neterminata' } },
  { nume: 'H23 ATTLIST cu valoare implicită literală', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ATTLIST rect width CDATA "5">]>${p100('<rect height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'attlist' } },
  { nume: 'H24 ATTLIST cu #IMPLIED: trece', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ATTLIST rect class CDATA #IMPLIED>]>${p100('<rect width="5" height="5"/>')}`, hartie: { cai: 1 } },
  { nume: 'H25 entitate declarată de două ori: prima câștigă', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY w "5"><!ENTITY w "20">]>${p100('<rect width="&w;" height="&w;"/>')}`,
    hartie: { cai: 1, varfuri: [[0, 1, 5, 100], [0, 2, 5, 95]] } },
  { nume: 'H26 duplicatele se numără la 100: 60 + 41 = 101', text: `<?xml version="1.0"?><!DOCTYPE svg [${Array.from({ length: 60 }, (_, i) => `<!ENTITY e${i} "x">`).join('')}${'<!ENTITY e0 "y">'.repeat(41)}]>${p100('<rect width="5" height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'numar' } },
  { nume: 'H27 expansiunea cu duplicat: prima (scurtă) câștigă, trece', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY e "a"><!ENTITY e "${'a'.repeat(100_000)}">]>${p100(`<text>${'&e;'.repeat(200)}</text><rect width="5" height="5"/>`)}`,
    hartie: { cai: 1, avertismente: { 'sarit-text': 1 } } },
  { nume: 'H28 expansiunea cu duplicat: prima (lungă) câștigă, 200 × 100 000 > 16 MiB', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY e "${'a'.repeat(100_000)}"><!ENTITY e "a">]>${p100(`<text>${'&e;'.repeat(200)}</text><rect width="5" height="5"/>`)}`, hartie: { cod: 'entitati', detaliu: 'expansiune' } },
  { nume: 'H12 entitate imbricată (billion laughs)', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "lol"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]>${p100('<text>&b;</text>')}`, hartie: { cod: 'entitati', detaliu: 'valoare' } },
  { nume: 'H13 entitate parametru', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY % p "x">]>${p100('<rect width="5" height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'parametru' } },
  { nume: 'H14 entitate externă SYSTEM', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>${p100('<text>&x;</text><rect width="5" height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'externa' } },
  { nume: 'H15 entitate externă PUBLIC', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x PUBLIC "-//X//Y" "http://example.com/x">]>${p100('<rect width="5" height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'externa' } },
  { nume: 'H16 entitate care aduce elemente', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY r "<rect width='5' height='5'/>">]>${p100('&r;')}`, hartie: { cod: 'entitati', detaliu: 'valoare' } },
  { nume: 'H17 expansiunea pătratică: 100 000 × 200 > 16 MiB', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY e "${'a'.repeat(100_000)}">]>${p100(`<text>${'&e;'.repeat(200)}</text><rect width="5" height="5"/>`)}`, hartie: { cod: 'entitati', detaliu: 'expansiune' } },
  { nume: 'H18 101 declarații de entități (precizarea 12.10)', text: `<?xml version="1.0"?><!DOCTYPE svg [${Array.from({ length: 101 }, (_, i) => `<!ENTITY e${i} "x">`).join('')}]>${p100('<rect width="5" height="5"/>')}`, hartie: { cod: 'entitati', detaliu: 'numar' } },
  { nume: 'H19 100 de declarații nefolosite: trec', text: `<?xml version="1.0"?><!DOCTYPE svg [${Array.from({ length: 100 }, (_, i) => `<!ENTITY e${i} "x">`).join('')}]>${p100('<rect width="5" height="5"/>')}`, hartie: { cai: 1 } },
  { nume: 'H20 entități simple folosite (ca la Illustrator): trec la ușă și se expandează (parserul ca browserul)', text: `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY ns_svg "http://www.w3.org/2000/svg"><!ENTITY w "5">]><svg xmlns="&ns_svg;" width="100mm" height="100mm" viewBox="0 0 100 100"><rect width="&w;" height="&w;"/></svg>`,
    hartie: { cai: 1, varfuri: [[0, 1, 5, 100], [0, 2, 5, 95]] } },
];

// ---------------------------------------------------------------------------------------------------------------------
// I. Fișiere realiste.

/** Inkscape: mm, viewBox, stratul cu translate, namedview, metadata RDF, stil inline, căi relative cu repetare implicită. */
export const INKSCAPE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (http://www.inkscape.org/) -->

<svg
   width="210mm"
   height="297mm"
   viewBox="0 0 210 297"
   version="1.1"
   id="svg5"
   inkscape:version="1.3.2 (091e20e, 2023-11-25)"
   sodipodi:docname="placa2.svg"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:dc="http://purl.org/dc/elements/1.1/">
  <sodipodi:namedview
     id="namedview7"
     pagecolor="#ffffff"
     bordercolor="#666666"
     inkscape:document-units="mm"
     inkscape:zoom="0.7"
     inkscape:current-layer="layer1" />
  <defs
     id="defs2">
    <linearGradient id="lg1"><stop offset="0" /></linearGradient>
  </defs>
  <metadata
     id="metadata1">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     transform="translate(-12.5,-30)">
    <path
       style="fill:#000000;fill-rule:evenodd;stroke:none;stroke-width:0.264583"
       d="m 32.5,50 c 10,0 20,5 20,15 0,10 -10,15 -20,15 -10,0 -20,-5 -20,-15 0,-10 10,-15 20,-15 z"
       id="path10"
       inkscape:label="lacrima" />
    <circle
       style="fill:none;stroke:#000000;stroke-width:0.5"
       id="c1"
       cx="80"
       cy="65"
       r="12.5" />
    <rect
       style="fill:#ff0000;stroke-width:0.264583"
       id="rect1"
       width="40"
       height="30"
       x="110"
       y="50"
       ry="5" />
    <text
       xml:space="preserve"
       style="font-size:10.5833px;line-height:1.25;font-family:sans-serif"
       x="20"
       y="120"
       id="text1"><tspan
         sodipodi:role="line"
         id="tspan1"
         x="20"
         y="120">Placa 2</tspan></text>
    <g
       id="g2"
       style="display:none">
      <rect id="ascuns" x="0" y="0" width="5" height="5" />
    </g>
  </g>
</svg>
`;

/** Illustrator: DOCTYPE cu entitățile spațiilor de nume, comentariul generatorului, px la 72, switch cu foreignObject, i:pgf. */
export const ILLUSTRATOR = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">
	<!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/">
	<!ENTITY ns_graphs "http://ns.adobe.com/Graphs/1.0/">
	<!ENTITY ns_vars "http://ns.adobe.com/Variables/1.0/">
	<!ENTITY ns_imrep "http://ns.adobe.com/ImageReplacement/1.0/">
	<!ENTITY ns_sfw "http://ns.adobe.com/SaveForWeb/1.0/">
	<!ENTITY ns_custom "http://ns.adobe.com/GenericCustomNamespace/1.0/">
	<!ENTITY ns_adobe_xpath "http://ns.adobe.com/XPath/1.0/">
	<!ENTITY ns_svg "http://www.w3.org/2000/svg">
	<!ENTITY ns_xlink "http://www.w3.org/1999/xlink">
]>
<svg version="1.1" id="Layer_1" xmlns:x="&ns_extend;" xmlns:i="&ns_ai;" xmlns:graph="&ns_graphs;"
	 xmlns="&ns_svg;" xmlns:xlink="&ns_xlink;" x="0px" y="0px" width="226.7717px" height="113.3858px"
	 viewBox="0 0 226.7717 113.3858" enable-background="new 0 0 226.7717 113.3858" xml:space="preserve">
<style type="text/css">
<![CDATA[
	.st0{fill:#231F20;}
	.st1{fill:#FFFFFF;}
]]>
</style>
<switch>
	<foreignObject requiredExtensions="&ns_ai;" x="0" y="0" width="1" height="1">
		<i:pgfRef  xlink:href="#adobe_illustrator_pgf">
		</i:pgfRef>
	</foreignObject>
	<g i:extraneous="self">
		<g>
			<path class="st0" d="M10,10h206.7717v93.3858H10V10z M20,20v73.3858h186.7717V20H20z"/>
			<circle class="st1" cx="56.6929" cy="56.6929" r="28.3465"/>
			<polygon class="st0" points="113.3858,28.3465 141.7323,85.0394 85.0394,85.0394 	"/>
			<path class="st0" d="M155.9055,42.5197c0-7.8278,6.3456-14.1732,14.1732-14.1732s14.1732,6.3454,14.1732,14.1732
				c0,7.8276-6.3456,14.1732-14.1732,14.1732S155.9055,50.3473,155.9055,42.5197z"/>
			<ellipse class="st0" cx="170.0787" cy="77.9528" rx="22.6772" ry="11.3386"/>
		</g>
	</g>
</switch>
<i:pgf  id="adobe_illustrator_pgf">
	<![CDATA[
	eJzsvWmTHTlyIPhdZvoP7300mbE2Lx5xxyerZ/aKXtXbs1rZSG4jUqKSlWJWUkUJ2ozM9rh8d/+t
]]>
</i:pgf>
</svg>
`;

const I: CazSvg[] = [
  // Startul căii: (32,5 − 12,5, 50 − 30) = (20, 20) → (20, 277); cercul: (80 + 12,5 − 12,5, 65 − 30) = (80, 35) → (80, 262);
  // dreptunghiul (rx = ry = 5): (110 + 5 − 12,5, 50 − 30) = (102,5, 20) → (102,5, 277).
  { nume: 'I1 Inkscape', text: INKSCAPE,
    hartie: { pagina: { latime: 210, inaltime: 297 }, px: false, illustrator: false, cai: 3, tipuri: ['CCCC', 'AA', 'LALALALA'], nume: ['path10', 'c1', 'rect1'], forme: [0, 1, 2],
      varfuri: [[0, 0, 20, 277], [0, 1, 40, 262], [0, 2, 20, 247], [0, 3, 0, 262], [1, 0, 80, 262], [1, 1, 55, 262], [2, 0, 102.5, 277], [2, 1, 132.5, 277]],
      laturi: ['exterior', 'exterior', 'exterior'], avertismente: { 'sarit-text': 1, ascunse: 1 } } },
  // La 72: 226,7717 px = 80,00001 mm. Rama exterioară, golul ei (interior), cercul, triunghiul și „O”-ul (în golul ramei: exterioare
  // față de ramă, adică adâncimea 2), elipsa. Elipsa: σ = 22,6772 · K72 = 8 mm, φ = 0,43636, n = ⌈π / φ⌉ = 8 pe jumătate.
  { nume: 'I2 Illustrator (px = 72)', px: 72, text: ILLUSTRATOR,
    hartie: { pagina: { latime: 226.7717 * K72, inaltime: 113.3858 * K72 }, px: true, illustrator: true, cai: 6,
      tipuri: ['LLLL', 'LLLL', 'AA', 'LLL', 'CCCC', 'C'.repeat(16)],
      varfuri: [[0, 0, 10 * K72, (113.3858 - 10) * K72], [1, 0, 20 * K72, (113.3858 - 20) * K72]],
      laturi: ['exterior', 'interior', 'exterior', 'exterior', 'exterior', 'exterior'],
      avertismente: { 'arce-eliptice': 2, 'cubice-din-arce': 16 } } },
  { nume: 'I3 comentariul doar cu „Illustrator” (fără „Adobe”): nu e Illustrator', text: `<?xml version="1.0"?><!-- exported for Illustrator users -->${mm(100, 100, '<rect width="5" height="5"/>')}`,
    hartie: { illustrator: false } },
  { nume: 'I4 „Adobe Illustrator” după primii 16 KiB: nu se vede', text: `<?xml version="1.0"?><!--${' '.repeat(20_000)}--><!-- Generator: Adobe Illustrator 27.0 -->${mm(100, 100, '<rect width="5" height="5"/>')}`,
    hartie: { illustrator: false } },
  { nume: 'I5 „Adobe Illustrator” în comentariu, în primii 16 KiB', text: `<?xml version="1.0"?>${mm(100, 100, '<!-- Adobe Illustrator 28 --><rect width="5" height="5"/>')}`,
    hartie: { illustrator: true } },
];

export const CORPUS: readonly CazSvg[] = [...A, ...B, ...C, ...D, ...E, ...F, ...G, ...N, ...S, ...U, ...L, ...P, ...H, ...I];

// ---------------------------------------------------------------------------------------------------------------------
// Judecata hârtiei: oracolul trebuie să dea exact ce scrie pe hârtie.

const aproape = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

export function judecaHartia(o: RezultatO, h: Hartie): string[] {
  const pr: string[] = [];
  const raport = (r: RaportO | undefined): void => {
    if (r === undefined) { pr.push('raportul lipsește'); return; }
    for (const c of CODURI_O) if (r[c] !== (h.avertismente?.[c] ?? 0)) pr.push(`${c} = ${r[c]} ≠ ${h.avertismente?.[c] ?? 0} (hârtia)`);
  };
  if (h.cod !== undefined) {
    if (o.ok || o.cod !== h.cod) return [`trebuia refuzat cu ${h.cod}: ${o.ok ? 'ok' : o.cod}`];
    if (h.detaliu !== undefined && o.detaliu !== h.detaliu) return [`detaliul ${String(o.detaliu)} ≠ ${h.detaliu}`];
    if (h.cod === 'gol') raport(o.avertismente);
    return pr;
  }
  if (!o.ok) return [`refuzat: ${o.cod}`];
  if (h.pagina !== undefined) {
    if (h.pagina === null ? o.pagina !== null : o.pagina === null || !aproape(o.pagina.latime, h.pagina.latime) || !aproape(o.pagina.inaltime, h.pagina.inaltime)) pr.push(`pagina ${JSON.stringify(o.pagina)} ≠ ${JSON.stringify(h.pagina)}`);
  }
  if (h.px !== undefined && o.px !== h.px) pr.push(`px ${o.px}`);
  if (h.illustrator !== undefined && o.illustrator !== h.illustrator) pr.push(`illustrator ${o.illustrator}`);
  if (h.cai !== undefined && o.cai.length !== h.cai) pr.push(`${o.cai.length} căi ≠ ${h.cai}`);
  h.tipuri?.forEach((t, i) => {
    const c = o.cai[i];
    const tc = c === undefined ? '-' : c.varfuri.map((v) => v.s.tip).join('');
    if (tc !== t) pr.push(`calea ${i}: ${tc} ≠ ${t}`);
  });
  if (h.tipuri !== undefined && h.cai === undefined && o.cai.length !== h.tipuri.length) pr.push(`${o.cai.length} căi ≠ ${h.tipuri.length}`);
  for (const [c, v, x, y] of h.varfuri ?? []) {
    const w = o.cai[c]?.varfuri[v] as VarfO | undefined;
    if (w === undefined || !aproape(w.p.x, x) || !aproape(w.p.y, y)) pr.push(`calea ${c}, vârful ${v}: ${JSON.stringify(w?.p)} ≠ (${x}, ${y})`);
  }
  for (const [c, v, b] of h.bulge ?? []) {
    const w = o.cai[c]?.varfuri[v]?.s;
    if (w?.tip !== 'A' || Math.abs(w.bulge - b) > 1e-12) pr.push(`calea ${c}, vârful ${v}: ${JSON.stringify(w)} ≠ bulge ${b}`);
  }
  raport(o.avertismente);
  if (h.laturi !== undefined && JSON.stringify(laturiO(o.cai)) !== JSON.stringify(h.laturi)) pr.push(`laturi ${JSON.stringify(laturiO(o.cai))} ≠ ${JSON.stringify(h.laturi)}`);
  if (h.forme !== undefined && JSON.stringify(o.cai.map((c) => c.forma)) !== JSON.stringify(h.forme)) pr.push(`forme ${JSON.stringify(o.cai.map((c) => c.forma))} ≠ ${JSON.stringify(h.forme)}`);
  if (h.nume !== undefined && JSON.stringify(o.cai.map((c) => c.nume ?? null)) !== JSON.stringify(h.nume.map((n) => n ?? null))) pr.push(`nume ${JSON.stringify(o.cai.map((c) => c.nume))}`);
  if (h.inchis !== undefined && JSON.stringify(o.cai.map((c) => c.inchis)) !== JSON.stringify(h.inchis)) pr.push(`inchis ${JSON.stringify(o.cai.map((c) => c.inchis))} ≠ ${JSON.stringify(h.inchis)}`);
  // Sub-felia 2.3c-1: golurile căilor închise de ușă (în ordinea căilor) și golul cel mai mare închis la ușă.
  if (h.goluri !== undefined) {
    const g = o.subcai.filter((j) => j.soarta === 'cale' && j.inchisaDeUsa !== null).sort((x, y) => (x.cale ?? 0) - (y.cale ?? 0)).map((j) => j.gol);
    if (g.length !== h.goluri.length || g.some((x, i) => !(Math.abs(x - (h.goluri?.[i] as number)) <= 1e-12 * Math.max(1, x)))) pr.push(`golurile închiderilor ${JSON.stringify(g)} ≠ ${JSON.stringify(h.goluri)}`);
  }
  if (h.golLaUsa !== undefined && !(Math.abs(o.golLaUsa - h.golLaUsa) <= 1e-12)) pr.push(`golLaUsa ${o.golLaUsa} ≠ ${h.golLaUsa}`);
  if (h.prafNormalizare !== undefined) {
    const n = prafNormalizareO(o);
    if (n !== h.prafNormalizare) pr.push(`contururile de praf ale normalizării: ${n} ≠ ${h.prafNormalizare} (hârtia)`);
  }
  return pr;
}

/**
 * Hârtia după normalizare (felia 2.7d), pe rezultatul aplicației deja judecat de `judecaRezultat`: numerele `nonzero-*`
 * EXACT (cele de schimbat minus cele refuzate pe hârtie; refuzurile pe hârtie), câte căi rămân, laturile lor și aria
 * regiunii (exterioarele plus, interioarele minus).
 */
export function judecaHartiaFinala(app: unknown, o: RezultatO, h: Hartie): string[] {
  const a = app as { ok?: unknown; cod?: unknown; avertismente?: Record<string, unknown> } | null;
  // Refuzul de pe hârtie e strict (și unde oracolul are o alternativă, ADR 0036 §6: forma subțire „poate” rămâne).
  if (h.cod !== undefined) return a?.ok === false && a.cod === h.cod ? [] : [`hârtia: trebuia refuzat ${h.cod}, dar ok = ${String(a?.ok)}, cod ${String(a?.cod)}`];
  if (!o.ok || a?.ok !== true) return [];
  const pr: string[] = [];
  const ref = h.nonzeroRefuzate ?? 0;
  const norm = (h.avertismente?.['nonzero-normalizate'] ?? 0) - ref;
  if (a.avertismente?.['nonzero-normalizate'] !== norm) pr.push(`hârtia: nonzero-normalizate = ${String(a.avertismente?.['nonzero-normalizate'])} ≠ ${norm}`);
  if (a.avertismente?.['nonzero-refuzate'] !== ref) pr.push(`hârtia: nonzero-refuzate = ${String(a.avertismente?.['nonzero-refuzate'])} ≠ ${ref}`);
  // ADR 0037 §11: subcăile-praf plus contururile de praf scoase din normalizare (când normalizarea nu e refuzată).
  const sub = (h.avertismente?.['sub-rezolutie'] ?? 0) + (ref > 0 ? 0 : (h.prafNormalizare ?? 0));
  if (a.avertismente?.['sub-rezolutie'] !== sub) pr.push(`hârtia: sub-rezolutie = ${String(a.avertismente?.['sub-rezolutie'])} ≠ ${sub}`);
  const f = h.final;
  if (f === undefined) return pr;
  const fin = caiFinaleO(app, o);
  if (f.cai !== undefined && fin.length !== f.cai) pr.push(`hârtia: ${fin.length} căi după normalizare ≠ ${f.cai}`);
  const lat = laturiO(fin);
  if (f.laturi !== undefined && JSON.stringify(lat) !== JSON.stringify(f.laturi)) pr.push(`hârtia: laturile după normalizare ${JSON.stringify(lat)} ≠ ${JSON.stringify(f.laturi)}`);
  if (f.arie !== undefined) {
    // Căile deschise (2.3c-3) n-au arie: nu intră în regiune.
    const A = fin.reduce((s, c, i) => s + (lat[i] === 'pe-linie' ? 0 : (lat[i] === 'exterior' ? 1 : -1) * Math.abs(arieRuns(c.runs))), 0);
    if (!(Math.abs(A - f.arie) <= 1e-9 * Math.max(1, Math.abs(f.arie)))) pr.push(`hârtia: aria după normalizare ${A} ≠ ${f.arie}`);
  }
  return pr;
}

export const octetiCaz = (c: CazSvg): Uint8Array => (c.octeti !== undefined ? c.octeti() : new TextEncoder().encode(c.text ?? ''));

// ---------------------------------------------------------------------------------------------------------------------
// CONSTATĂRILE: cazurile în care aplicația diferă de oracol, iar oracolul urmează ADR-ul (testul lor e separat,
// `svg.constatari.oracol.test.ts`, și pică până se repară aplicația sau se precizează ADR-ul).

export const CONSTATARI: readonly CazSvg[] = [
  // Revizia 12.10: K2–K6 reparate în aplicație (mutate în corpus: C23, E33–E36); K1 inversată de ADR (F22).
  // Felia 2.7d: K7 rezolvată de amendamentul ADR 0036 §6 (mutată în corpus: C22 cu evenodd, C25).
];
