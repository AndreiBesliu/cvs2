/**
 * Tabelele codurilor controlerului (ADR 0085), pe familie: ce număr are ce înțeles (cheia textului), cât de grav e și ce
 * butoane ale panoului ajută. Numerele vin din sursele firmware-ului, citite (GPL-3.0: faptele, nu textele):
 * - GRBL 1.1: `gnea/grbl` @ bfb67f0, `doc/csv/error_codes_en_US.csv` și `alarm_codes_en_US.csv` (erorile 1–17 și 20–38:
 *   `error:18` și `error:19` nu există; alarmele 1–10, a 10-a doar cu axa dublă); `grbl/protocol.c`: limitele hard și soft
 *   sunt evenimente critice („Reset to continue”);
 * - grblHAL: `grblHAL/core` @ 4ec1ae4, `errors.h` (1–58, 60–66, 70–92, 253) și `alarms.h` (1–22; critice: 1, 2, 10, 17, 20,
 *   `alarm_is_critical`);
 * - FluidNC: `bdring/FluidNC` @ c82d217, `Error.h` și `Alarm.h` (1–18; critice în `Protocol.cpp`: 1, 2, 13; la 16 cere
 *   repornirea plăcii). `$H` fără homing configurat dă `error:5` (`ProcessSettings.cpp`), o linie de peste 127 de caractere
 *   `error:14` (`GCode.cpp`).
 * Fișierul nu intră în aplicație: generatorul (`scripts/coduri.ts`) îl scrie, cu textele, în `dist/coduri/`.
 */
import type { ActiuneCod, FamilieCoduri, IntrareCod } from '../../../shared/coduri.ts';
import type { CheieTextCod } from './texte.en.ts';

export type Intrare = IntrareCod & { readonly text: CheieTextCod };
export type Tabel = {
  readonly nume: string;
  readonly erori: Readonly<Record<number, Intrare>>;
  readonly alarme: Readonly<Record<number, Intrare>>;
};

/** Doar linia a fost refuzată: controlerul primește următoarea. */
const linie = (text: CheieTextCod): Intrare => ({ text, gravitate: 'linie' });
/** Controlerul refuză și ce urmează, până când omul face ceva. */
const oprit = (text: CheieTextCod, actiuni: readonly ActiuneCod[] = []): Intrare =>
  ({ text, gravitate: 'oprit', ...(actiuni.length > 0 ? { actiuni } : {}) });
/** O alarmă după care poziția nu mai e sigură. */
const pierduta = (text: CheieTextCod, actiuni: readonly ActiuneCod[]): Intrare => ({ ...oprit(text, actiuni), pozitiePierduta: true });
/** Aceeași intrare pe un șir de numere (o grupă: fișierele controlerului, expresiile). */
const sir = (numere: readonly number[], i: Intrare): Record<number, Intrare> => Object.fromEntries(numere.map((n) => [n, i]));
const de = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, k) => a + k);

/** Erorile GRBL 1.1, refolosite de grblHAL și FluidNC acolo unde înțelesul e același. */
const ERORI_GRBL: Readonly<Record<number, Intrare>> = {
  1: linie('e1'), 2: linie('e2'), 3: linie('e3'), 4: linie('e4'), 5: linie('homing-neconfigurat'), 6: linie('e6'),
  7: linie('e7'), 8: linie('e8'), 9: oprit('e9', ['deblocare']), 10: linie('e10'), 11: linie('e11'), 12: linie('e12'),
  13: oprit('e13', ['eliberare']), 14: linie('e14'), 15: linie('e15'), 16: linie('e16'), 17: linie('e17'),
  20: linie('e20'), 21: linie('e21'), 22: linie('e22'), 23: linie('e23'), 24: linie('e24'), 25: linie('e25'), 26: linie('e26'),
  27: linie('e27'), 28: linie('e28'), 29: linie('e29'), 30: linie('e30'), 31: linie('e31'), 32: linie('e32'),
  33: linie('e33'), 34: linie('e34'), 35: linie('e35'), 36: linie('e36'), 37: linie('e37'), 38: linie('e38'),
};

/** Alarmele 1–9, aceleași la toate trei. */
const ALARME_COMUNE: Readonly<Record<number, Intrare>> = {
  1: pierduta('a1', ['repornire', 'deblocare', 'jog']),
  2: oprit('a2', ['repornire', 'deblocare']),
  3: pierduta('a3', ['deblocare']),
  4: oprit('a4', ['deblocare', 'jog', 'palpare']),
  5: oprit('a5', ['deblocare', 'palpare']),
  6: pierduta('a6', ['deblocare']),
  7: pierduta('a7', ['deblocare']),
  8: pierduta('a8', ['deblocare']),
  9: pierduta('a9', ['deblocare']),
};

const GRBL_11: Tabel = {
  nume: 'GRBL 1.1',
  erori: ERORI_GRBL,
  alarme: { ...ALARME_COMUNE, 10: pierduta('a10', ['deblocare']) },
};

const GRBLHAL: Tabel = {
  nume: 'grblHAL',
  erori: {
    ...ERORI_GRBL,
    18: linie('hal.e18'), 19: linie('hal.e19'), 39: linie('hal.e39'), 40: linie('hal.e40'), 41: linie('hal.e41'),
    42: linie('hal.e42'), 43: linie('hal.e43'), 44: linie('hal.e44'), 45: oprit('hal.e45', ['repornire']), 46: oprit('hal.e46'),
    47: linie('hal.e47'), 48: linie('hal.e48'), 49: oprit('autotest'), 50: oprit('hal.e50', ['repornire']),
    51: oprit('defect-motor', ['repornire']), 52: linie('setare-valoare'), 53: linie('hal.e53'), 54: linie('hal.e54'),
    55: linie('hal.e55'), 56: linie('hal.e56'), 57: linie('hal.e57'), 58: linie('grup.port'),
    ...sir([...de(60, 66), 84, 85, 89], linie('grup.fisiere')),
    70: linie('hal.e70'),
    ...sir([...de(71, 76), ...de(80, 83)], linie('grup.expresii')),
    77: linie('grup.acces'), 78: linie('grup.acces'), 79: oprit('hal.e79', ['repornire']), 86: linie('grup.port'),
    87: linie('grup.scula-ax'), 88: linie('grup.scula-ax'),
    ...sir(de(90, 92), linie('grup.compensare')),
    253: linie('hal.e253'),
  },
  alarme: {
    ...ALARME_COMUNE,
    10: pierduta('hal.a10', ['repornire', 'deblocare']),
    11: pierduta('homing-cerut', ['deblocare']),
    12: pierduta('hal.a12', ['deblocare', 'jog']),
    13: pierduta('hal.a13', ['deblocare']),
    14: pierduta('hal.a14', ['deblocare']),
    15: pierduta('a10', ['deblocare']),
    16: oprit('autotest'),
    17: pierduta('defect-motor', ['repornire', 'deblocare']),
    18: pierduta('hal.a18', ['deblocare']),
    19: pierduta('hal.a19', ['deblocare']),
    20: pierduta('hal.a20', ['repornire', 'deblocare']),
    21: oprit('hal.a21'),
    22: pierduta('hal.a22', ['deblocare']),
  },
};

const FLUIDNC: Tabel = {
  nume: 'FluidNC',
  erori: {
    ...ERORI_GRBL,
    14: linie('e11'), 18: linie('homing-neconfigurat'), 19: linie('fnc.e19'), 38: linie('fnc.e38'), 39: linie('fnc.e39'),
    40: oprit('fnc.e40', ['repornire']),
    ...sir([...de(60, 70), 82, 83, 160, 161], linie('grup.fisiere')),
    80: linie('setare-valoare'), 81: linie('setare-valoare'),
    ...sir([90, ...de(111, 115)], linie('fnc.intern')),
    100: linie('fnc.nvs'), 101: linie('fnc.nvs'), 110: linie('grup.acces'), 120: linie('fnc.e120'), 130: linie('fnc.e130'),
    ...sir(de(150, 152), linie('fnc.config')),
    162: linie('fnc.e162'),
    ...sir(de(170, 180), linie('grup.expresii')),
    181: linie('fnc.e181'), 182: linie('fnc.e182'),
  },
  alarme: {
    ...ALARME_COMUNE,
    10: pierduta('fnc.a10', ['deblocare']),
    11: oprit('fnc.a11', ['deblocare']),
    12: pierduta('fnc.a12', ['deblocare']),
    13: pierduta('fnc.a13', ['repornire', 'deblocare']),
    14: pierduta('homing-cerut', ['deblocare']),
    15: pierduta('fnc.a15', ['deblocare']),
    16: oprit('fnc.a16'),
    17: pierduta('fnc.a17', ['deblocare']),
    18: pierduta('fnc.a18', ['deblocare', 'jog']),
  },
};

export const TABELE: Readonly<Record<FamilieCoduri, Tabel>> = { 'grbl-11': GRBL_11, grblhal: GRBLHAL, fluidnc: FLUIDNC };

/** Starea Alarm fără cod (`'$H'|'$X' to unlock`), comună familiilor. */
export const BLOCARE: Intrare = pierduta('blocare', ['deblocare']);
