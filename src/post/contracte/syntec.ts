import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * Syntec (freză și router), după sonda s8, Anexa A.6: Mill Machine Program Manual v8.19 (2015), cu postul Autodesk „SYNTEC”
 * ca martor (doar citat). Ca Fanuc 0M, cu G70 / G71 în loc de G20 / G21; un întreg e în unitatea minimă (`X10` = 0,010 mm),
 * deci punctul zecimal e obligatoriu. Seriile noi pot diferi. Toate câmpurile sunt „documentate” (T0, T1, T2 cu punctul
 * zecimal, T3–T5).
 */
export const SYNTEC: Contract = {
  nume: 'Syntec',
  extensie: 'nc',
  numeScurt: false,
  senderAplicatie: false,
  axe: ['X', 'Y', 'Z'],
  zecimaleMm: 3,
  zecimaleInch: 5,
  unitati: { mm: 'G71', inch: 'G70' },
  comentariu: { deschidere: '(', inchidere: ')' },
  liniaMaxima: 70,
  pauza: { cuvant: 'G4 P', unitate: 'ms' },
  arc: { coardaMinimaRezolutii: 10, unghiMinim: 1e-4, razaMaxima: 1e4, baleiajMaxim: Math.PI },
  elice: true,
  inceput: ['%', 'O0001'],
  antet: ['G90 G17 {unitati} G94', 'G40 G49 G80'],
  wcs: 'G54',
  final: ['M30', '%'],
  rapidaSeparata: true,
  setari: [],
  // T + M06, apoi lungimea sculei din tabelă (G43 H), și la pornire: scula montată e chiar cea a programului.
  scula: {
    implicita: 'm6-controler', acceptate: ['m6-controler', 'fisiere-separate', 'm0-comentariu'],
    schimbare: ['T{n} M6'], pornire: ['T{n} M6'], compensare: ['G43 H{n}'],
  },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G40', 'G43', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G70', 'G71', 'G80', 'G90', 'G94'],
  coduriM: ['M0', 'M3', 'M5', 'M6', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} A.6: o valoare cu punct e în mm, inch sau s; un întreg, în µm sau ms (X10 = 0,010 mm)`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.6: G70 = inch, G71 = mm (manualul și postul Autodesk); G20 / G21 nu apar`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.6: elice cu al treilea ax; G17 / G18 / G19`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.6: nedocumentate; exemplele au //, postul Autodesk ( ); se probează amândouă`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.6: nedocumentată; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.6: G04 P fără punct = ms; postul scrie P în ms, întreg`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.6: I/J/K = vectorul de la start la centru, mereu incremental`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} A.6: Fanuc 0M cu G70 / G71 (G17, G40, G49, G80, G90, G94)`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} §5.7: WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.6: M06 cu T, apoi H (G43 / G44 / G49); postul Autodesk: T<n> M6`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.6: G00–G04, G17–G19, G43 / G44 / G49, G70 / G71, G73–G89; M00–M06, M08, M09, M30`, citit: CITIT },
    inceput: { stare: 'documentat', sursa: `${S8} A.6: postul Autodesk scrie %, O cu 4 cifre, codul, M30 și %`, citit: CITIT },
    final: { stare: 'documentat', sursa: `${S8} A.6: M30 = sfârșit și întoarcere la început, apoi %`, citit: CITIT },
    rapida: { stare: 'documentat', sursa: `${S8} A.6: parametrul #411 poate face din G00 un drum în „L”; Z se retrage înaintea XY`, citit: CITIT },
    fisier: { stare: 'documentat', sursa: `${S8} A.6: .nc (Autodesk); în memoria controlerului, numele O####`, citit: CITIT },
    setari: { stare: 'documentat', sursa: `${S8} §5.10: nicio setare listată; G43 H ia lungimea din tabela de scule (0, dacă Z se face pe fiecare sculă)`, citit: CITIT },
  },
};
