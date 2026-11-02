import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * Mach4, după sonda s8, Anexa A.8: „Mach4 Mill GCode Manual” v1.0 și „Mill Programming Guide” v1.1 (build 3775), cu
 * postul Autodesk „Mach4Mill” ca martor (doar citat). Ca Mach3, dar pauza `G4 P3.000` (cu punct) e aceeași în ambele ediții,
 * iar T pe linia dinaintea lui M6 dă aceeași sculă la ambele setări: nicio setare de verificat. Toate câmpurile sunt
 * „documentate” (T0–T5).
 */
export const MACH4: Contract = {
  nume: 'Mach4',
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
  final: ['M30', '%'],
  rapidaSeparata: true,
  setari: [],
  scula: {
    implicita: 'm6-controler', acceptate: ['m6-controler', 'fisiere-separate', 'm0-comentariu'],
    schimbare: ['T{n}', 'M6'], pornire: [], compensare: [],
  },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G91.1', 'G94'],
  coduriM: ['M0', 'M3', 'M5', 'M6', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} A.8: punctul nu e obligatoriu, dar „foarte recomandat”; 3 zecimale în mm, 5 în inch`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.0: G21 / G20`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.8: ca Mach3 (dedus)`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.8: nedocumentate în manuale; postul Autodesk scrie ( … )`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.8: nedocumentată; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.8: v1.0 spune P în secunde, v1.1 P fără punct = ms; P cu punct = secunde în ambele, singurul G din bloc`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.8: G90.1 / G91.1 sau setarea, independent de G90 / G91`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} §5.6: G91.1 pe linia lui`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} A.8: M02 resetează G54; §5.7: WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.8: o setare decide dacă T de pe linia cu M06 e scula curentă sau următoarea; cu T pe linia dinainte, aceeași`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.8: un singur cod M pe bloc; G4 singurul G din bloc`, citit: CITIT },
    inceput: { stare: 'documentat', sursa: `${S8} A.8: nimic cerut înaintea codului (dedus)`, citit: CITIT },
    final: { stare: 'documentat', sursa: `${S8} A.8: M30, urmat de %, ca ultima linie să aibă sfârșit de bloc`, citit: CITIT },
    rapida: { stare: 'documentat', sursa: `${S8} A.8: G0 în linie dreaptă (RS274NGC, dedus); despărțit oricum, până la probă`, citit: CITIT },
    fisier: { stare: 'documentat', sursa: `${S8} A.8: .tap (Autodesk)`, citit: CITIT },
    setari: { stare: 'documentat', sursa: `${S8} §5.10: T de la M6, acoperit de forma T, apoi M6; G4 P cu punct, același în ambele ediții`, citit: CITIT },
  },
};
