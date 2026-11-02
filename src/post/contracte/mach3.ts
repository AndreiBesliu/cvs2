import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * Mach3, după sonda s8, Anexa A.7: „Using Mach3Mill”, Release 1.84, cu postul Autodesk „Mach3Mill” ca martor (doar citat).
 * Modul I/J se forțează cu G91.1; unitatea lui G4 și oprirea la M6 sunt setări ale profilului, scrise în antet. Toate
 * câmpurile sunt „documentate” (T0–T5, fișiere sub 500 de linii pentru versiunea demo).
 */
export const MACH3: Contract = {
  nume: 'Mach3',
  extensie: 'tap',
  numeScurt: false,
  senderAplicatie: false,
  axe: ['X', 'Y', 'Z'],
  zecimaleMm: 3,
  zecimaleInch: 5,
  unitati: { mm: 'G21', inch: 'G20' },
  comentariu: { deschidere: '(', inchidere: ')' },
  liniaMaxima: 70,
  pauza: { cuvant: 'G4 P', unitate: 's' },
  arc: { coardaMinimaRezolutii: 10, unghiMinim: 1e-4, razaMaxima: 1e4, baleiajMaxim: Math.PI },
  elice: true,
  inceput: [],
  antet: ['G90 G17 {unitati} G94', 'G40 G49 G80', 'G91.1'],
  wcs: 'G54',
  final: ['M30'],
  rapidaSeparata: true,
  setari: ['G04 Dwell param in Milliseconds = off', 'Tool Change = Stop Spindle. Wait for Cycle Start'],
  // T pe linia lui, apoi M6 singur (s8 §5.4): cel mult un M pe linie, la orice setare.
  scula: {
    implicita: 'm6-controler', acceptate: ['m6-controler', 'fisiere-separate', 'm0-comentariu'],
    schimbare: ['T{n}', 'M6'], pornire: [], compensare: [],
  },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G91.1', 'G94'],
  coduriM: ['M0', 'M3', 'M5', 'M6', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} §5.2: punctul zecimal mereu, 3 zecimale în mm, 5 în inch`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.7: G20 / G21 și G70 / G71`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.7: elice da`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.7: ( … ) închis pe aceeași linie, fără imbricare; // până la capăt`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.7: 256 de caractere; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.7: unitatea lui G4 e setarea „G04 Dwell param in Milliseconds”; nebifată, secunde`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.7: modul IJ e o setare, forțat cu G91.1 (cercurile ratate = mod IJ greșit)`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} §5.6 și A.7: G91.1 pe linia lui; postul Autodesk: G90 G94 G91.1 G40 G49 G17`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} §5.7: WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.7: la M6, Safe Z, oprire, LED-ul Tool Change și Cycle Start; T pe linia dinainte`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.7: RS274NGC, cu G91.1, G43 / G44 / G49 și M6; până la 4 M pe linie`, citit: CITIT },
    inceput: { stare: 'documentat', sursa: `${S8} A.7: o linie care începe cu % e ignorată; nimic cerut`, citit: CITIT },
    final: { stare: 'documentat', sursa: `${S8} A.7: M30`, citit: CITIT },
    rapida: { stare: 'documentat', sursa: `${S8} A.7: G0 în linie dreaptă (RS274NGC, dedus); despărțit oricum, până la probă`, citit: CITIT },
    fisier: { stare: 'documentat', sursa: `${S8} A.7: postul Autodesk scrie .tap; demo: sub 500 de linii`, citit: CITIT },
    setari: { stare: 'documentat', sursa: `${S8} §5.10 și A.7: unitatea lui G4, oprirea la M6 („Stop Spindle. Wait for Cycle Start”, nu „Ignore”)`, citit: CITIT },
  },
};
