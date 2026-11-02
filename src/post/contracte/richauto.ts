import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * RichAuto DSP (A11 / A18 / B18), după sonda s8, Anexa A.5: contractul prudent propus acolo, fiindcă manualul A11 n-are
 * listă de coduri și nu pomenește comentariile, M30 sau G21; lista de coduri e a personalului Axiom (B11), de pe un forum.
 * Fără comentarii, fără unități, fără WCS și fără G4 (întârzierea axului e o setare a controlerului), fișiere separate pe
 * sculă, nume scurte. Toate câmpurile sunt „documentate”; s8 socotește două runde de probă (T0a–d, T1–T5).
 */
export const RICHAUTO: Contract = {
  nume: 'RichAuto',
  extensie: 'nc',
  numeScurt: true,
  senderAplicatie: false,
  axe: ['X', 'Y', 'Z'],
  zecimaleMm: 3,
  zecimaleInch: 5,
  unitati: { mm: '', inch: null },
  comentariu: null,
  liniaMaxima: 70,
  pauza: null,
  arc: { coardaMinimaRezolutii: 10, unghiMinim: 1e-4, razaMaxima: 1000, baleiajMaxim: Math.PI },
  // Elicea nu apare în nicio sursă: segmente G1 pe elice (≤ 0,001 mm), până la proba T3.
  elice: false,
  inceput: [],
  antet: ['G90'],
  wcs: null,
  final: ['M30'],
  rapidaSeparata: true,
  setari: ['F Read = Read', 'AbsCntr = Off', 'Spindle delay >= 3000 ms'],
  scula: {
    implicita: 'fisiere-separate', acceptate: ['fisiere-separate'],
    schimbare: [], pornire: [], compensare: [],
  },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G90'],
  coduriM: ['M3', 'M5', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} §5.2: punctul zecimal mereu, 3 zecimale în mm`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.5: „codul trebuie să fie metric” (Axiom); G20 / G21 lipsesc din listă, deci nu se scriu`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.5: nicio sursă; prudent, segmente G1`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.5: comentariile nu apar în manual și pot opri citirea; fără comentarii până la probă`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.5: nedocumentată; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.5: întârzierea axului la pornire e o setare a controlerului, în ms; G4 fără unitate documentată`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.5: I/J incrementale cu AbsCntr = Off, cel mult 180° pe bloc; raza, prudent, ca la NcStudio`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} A.5: antet minim, G90`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} A.5: G5x doar dacă e ales (Read G54); aplicația nu-l alege, deci lucrează în cel activ`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.5: M6 nedocumentat în manual; fișiere separate pe sculă`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.5: G0–G4, G40–G44, G49, G54–G59, G80–G84, G90, G91; M3–M6, M8, M9 (Axiom, B11); M30 de probat`, citit: CITIT },
    inceput: { stare: 'documentat', sursa: `${S8} A.5: CodeHead (Skip / NoSkip) e o setare; nimic înaintea codului`, citit: CITIT },
    final: { stare: 'documentat', sursa: `${S8} A.5: sfârșit cu M30, de verificat (lipsește din manual și din lista Axiom)`, citit: CITIT },
    rapida: { stare: 'documentat', sursa: `${S8} A.5: G0 nedocumentat; despărțit, prudent`, citit: CITIT },
    fisier: { stare: 'documentat', sursa: `${S8} A.5 și Anexa B: .nc; nume scurte, ASCII, de pe stick FAT16/32`, citit: CITIT },
    setari: { stare: 'documentat', sursa: `${S8} §5.10 și A.5: F Read, AbsCntr („G Code Setup”); întârzierea axului (ASTEPTARE_AX = 3 s)`, citit: CITIT },
  },
};
