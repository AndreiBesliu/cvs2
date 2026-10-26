import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * GRBL 1.1 (gnea/grbl), după sonda s8, Anexa A.1. Toate câmpurile sunt „documentate”: devin „probate” după placa 3,
 * tăiată pe GRBL 1.1h-ul owner-ului cu fișierele T0–T7.
 */
export const GRBL_11: Contract = {
  nume: 'GRBL 1.1',
  extensie: 'nc',
  axe: ['X', 'Y', 'Z'],
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
  // M6 dă error:20: îl oprește senderul aplicației (implicit); cu alt sender, fișiere separate sau M0 (ADR 0083 §3).
  scula: { implicita: 'bariera-sender', acceptate: ['bariera-sender', 'fisiere-separate', 'm0-comentariu'] },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G94'],
  coduriM: ['M0', 'M3', 'M5', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} §4.2: 3 zecimale în mm ajung pentru regula de capăt (200 000 de arce); 5 în inch (Vectric 10.5, 2020)`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.1: G21 implicit, G20 inch; valorile (și I/J/K) se convertesc la citire`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.1: elice da, în G17 / G18 / G19`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.1: ( … ) și ; până la capătul liniei`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.1 și §5.8: 79 de caractere utile; plafonul comun e 70`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.1: G4 P în secunde; nicio așteptare după M3`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} §4.2 și §5.3: I/J din startul rotunjit, coardă ≥ 10 rezoluții și unghi ≥ 1e-4 rad`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} §5.6: antetul setează tot (palparea lasă G91)`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} §5.7: M2 / M30 resetează la G54, deci WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.1 și §5.4: M6 dă error:20, T fără efect; M0 = Hold (jog doar în Idle / Jog); cu sender străin, fișiere separate`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.1: codurile acceptate`, citit: CITIT },
  },
};
