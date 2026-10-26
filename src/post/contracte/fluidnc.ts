import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * FluidNC (`bdring/FluidNC`: `GCode.cpp`, `Spindles/Spindle.cpp`), după sonda s8, Anexa A.3: fără cicluri fixe, linia de
 * 255 de caractere (plafonul comun rămâne 70), G4 P în secunde, M6 fără ATC sau `m6_macro` continuă fără pauză (deci M6 la
 * controler doar cu ele declarate). Wiki-ul a refuzat conexiunea la sondă: ce e aici vine din sursă. „Documentat” până la
 * proba pe controlerul axei A al owner-ului (T0, T2, T4).
 */
export const FLUIDNC: Contract = {
  nume: 'FluidNC',
  extensie: 'nc',
  axe: ['X', 'Y', 'Z', 'A'],
  zecimaleMm: 3,
  zecimaleInch: 5,
  unitati: { mm: 'G21', inch: 'G20' },
  comentariu: { deschidere: '(', inchidere: ')' },
  liniaMaxima: 70,
  pauza: { cuvant: 'G4 P', unitate: 's' },
  arc: { coardaMinimaRezolutii: 10, unghiMinim: 1e-4, razaMaxima: 1e4, baleiajMaxim: Math.PI },
  elice: true,
  antet: ['G90 G17 {unitati} G94', 'G40 G49 G80'],
  wcs: 'G54',
  final: ['M30'],
  scula: { implicita: 'bariera-sender', acceptate: ['bariera-sender', 'm6-controler', 'fisiere-separate', 'm0-comentariu'] },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G94'],
  coduriM: ['M0', 'M3', 'M5', 'M6', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} A.3: arcele ca la GRBL; 3 zecimale în mm, 5 în inch`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.3: G20 / G21`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.3: arcele ca la GRBL, cu elice`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.3: ( ), ;, (MSG,…), (PRINT,…), (DEBUG,…)`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.3: 255 de caractere; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.3: G4 P în secunde; spinup_ms poate aștepta singur (o pauză în plus nu strică)`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.3: ca la GRBL, G90.1 refuzat, aceeași toleranță`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} A.3: G17, G40, G49, G80, G90, G94 acceptate`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} §5.7: WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.3: M6 fără ATC și fără m6_macro schimbă doar numărul și continuă fără pauză`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.3: G 0–4, 10, 17–21, 28, 30, 38.x, 40, 43, 49, 53–59, 61, 80, 90–94; M 0–9, 30, 56, 61–68`, citit: CITIT },
    axe: { stare: 'documentat', sursa: '`PLAN.md` T22: contractul poartă cuvântul axei A; v1 taie doar XYZ', citit: CITIT },
  },
};
