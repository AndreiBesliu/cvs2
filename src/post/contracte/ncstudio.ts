import type { Contract } from '../contract.ts';

const S8 = 'docs/faza2/sonde/s8-posturi/RAPORT.md';
const CITIT = '07.10.2026';

/**
 * NcStudio (Weihong), după sonda s8, Anexa A.4: Programming Manual ed. 6 (2016) și User's Manual V8, cu postul Autodesk
 * „NcStudio Programming System” ca martor (doar citat). Toate câmpurile sunt „documentate”: devin „probate” cu pachetul
 * atelierelor (T0a/b/c, T1–T5; `PLAN.md` §5.3, etapa 4, punctul 6). Fișierul se rulează de pe controler, nu din aplicație.
 */
export const NCSTUDIO: Contract = {
  nume: 'NcStudio',
  extensie: 'nc',
  numeScurt: false,
  senderAplicatie: false,
  axe: ['X', 'Y', 'Z'],
  zecimaleMm: 3,
  zecimaleInch: 5,
  unitati: { mm: 'G21', inch: 'G20' },
  comentariu: { deschidere: "'", inchidere: '' },
  liniaMaxima: 70,
  pauza: { cuvant: 'G4 P', unitate: 'ms' },
  // Postul Autodesk ține raza între 0,01 și 1 000 mm: peste, arcul iese segmente G1 (≤ 0,001 mm), până la proba T1.
  arc: { coardaMinimaRezolutii: 10, unghiMinim: 1e-4, razaMaxima: 1000, baleiajMaxim: Math.PI },
  elice: true,
  inceput: [],
  // Fără G94: nu e în lista de coduri a manualului (avansul e oricum în mm/min).
  antet: ['G90 G17 {unitati}', 'G40 G49 G80'],
  wcs: 'G54',
  final: ['M30'],
  rapidaSeparata: true,
  setari: ['N4063 = 1', 'N4034 = 0', 'N4035 = 0'],
  // Fără M06: un fișier pe sculă (implicit), sau M0 cu scula în comentariu.
  scula: {
    implicita: 'fisiere-separate', acceptate: ['fisiere-separate', 'm0-comentariu'],
    schimbare: [], pornire: [], compensare: [],
  },
  coduriG: ['G0', 'G1', 'G2', 'G3', 'G4', 'G17', 'G20', 'G21', 'G40', 'G49', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90'],
  coduriM: ['M0', 'M3', 'M5', 'M30'],
  surse: {
    zecimale: { stare: 'documentat', sursa: `${S8} §5.2: punctul zecimal mereu, 3 zecimale în mm, 5 în inch (regula comună)`, citit: CITIT },
    unitati: { stare: 'documentat', sursa: `${S8} A.4: G21 sau G71 = mm, G20 sau G70 = inch; implicit mm`, citit: CITIT },
    elice: { stare: 'documentat', sursa: `${S8} A.4: elice da, în G17 / G18 / G19`, citit: CITIT },
    comentariu: { stare: 'documentat', sursa: `${S8} A.4: doar apostroful, până la capătul liniei; ; și ( ) nu sunt comentarii`, citit: CITIT },
    liniaMaxima: { stare: 'documentat', sursa: `${S8} A.4: nedocumentată; plafonul comun e 70 (T9)`, citit: CITIT },
    pauza: { stare: 'documentat', sursa: `${S8} A.4: G04 P în milisecunde`, citit: CITIT },
    arc: { stare: 'documentat', sursa: `${S8} A.4: I/J relative la start cu N4063 = 1 (implicit); postul Autodesk: R între 0,01 și 1 000 mm`, citit: CITIT },
    antet: { stare: 'documentat', sursa: `${S8} A.4: G17, G21, G40, G49, G80, G90 în lista de coduri; G94 lipsește`, citit: CITIT },
    wcs: { stare: 'documentat', sursa: `${S8} A.4: G54 implicit; G54–G59; §5.7: WCS-ul se scrie mereu`, citit: CITIT },
    scula: { stare: 'documentat', sursa: `${S8} A.4: fără M06; M00 = oprire obligatorie; implicit, fișiere separate`, citit: CITIT },
    coduri: { stare: 'documentat', sursa: `${S8} A.4: G00–G04, G17–G21, G40–G44, G49, G54–G59, G80–G89, G90; M00–M05, M30`, citit: CITIT },
    inceput: { stare: 'documentat', sursa: `${S8} A.4: nimic cerut înaintea codului (dedus)`, citit: CITIT },
    final: { stare: 'documentat', sursa: `${S8} A.4: M30 = sfârșit și întoarcere la început`, citit: CITIT },
    rapida: { stare: 'documentat', sursa: `${S8} A.4: un F pe G00 setează viteza rapidă (postul nu-l scrie); G00 în linie dreaptă nedocumentat, deci despărțit`, citit: CITIT },
    fisier: { stare: 'documentat', sursa: `${S8} A.4: extensia nenumită în manual; postul Autodesk scrie .nc`, citit: CITIT },
    setari: { stare: 'documentat', sursa: `${S8} §5.10 și A.4: N4063 (I/J incrementale), N4034 și N4035 (avansul și turația din fișier)`, citit: CITIT },
  },
};
