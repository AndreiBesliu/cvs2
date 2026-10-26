import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * grblHAL (`grblHAL/core`, build 20261004), după sonda s8, Anexa A.2: ca GRBL 1.1, cu linia de 256 de caractere (plafonul
 * comun rămâne 70), cu M6 după `$341` și cu axa A declarată (T22; v1 n-o taie). Toate câmpurile sunt „documentate”:
 * devin „probate” pe controlerul axei A al owner-ului (T0, T1, T2, T4; `PLAN.md` §5.5, punctul 12).
 */
export const GRBLHAL: Contract = {
  nume: 'grblHAL',
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
  // M6 la controler doar cu `$341` între 0 și 3 (cu 4, ignorat tăcut; fără un flux care se poate suspenda, error:20).
  scula: { implicita: 'bariera-sender', acceptate: ['bariera-sender', 'm6-controler', 'fisiere-separate', 'm0-comentariu'] },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G94'],
  coduriM: ['M0', 'M3', 'M5', 'M6', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} A.2 și §4.2: regula de arc ca la GRBL (dedus); 3 zecimale în mm, 5 în inch`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.0 și A.2: G21 / G20, ca GRBL 1.1`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.2: arcele ca la GRBL 1.1, cu elice`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.0: ( … ) și ;`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.2: 256 de caractere, buffer de 1 024; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.0: G4 P în secunde (dedus din GRBL)`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.2: I/J doar incremental, G90.1 nesuportat; regula de capăt ca la GRBL (dedus)`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} §5.6: antetul setează tot`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} §5.7: WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.2: M6 după $341 (0 manual, 1 atingere manuală, 2–3 la G59.3, 4 ignorat); fără ATC, error:20`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.2: codurile GRBL 1.1, plus G5, G73, G81–G83, M6, M61 (după driver)`, citit: CITIT },
    axe: { stare: 'documentat', sursa: '`PLAN.md` T22: contractul poartă cuvântul axei A; v1 taie doar XYZ', citit: CITIT },
  },
};
