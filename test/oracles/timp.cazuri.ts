/**
 * Cazurile PE HÂRTIE ale oracolului timpului pe GRBL 1.1h (`timp.ts`), cu ZERO importuri din `src/` și fără cod comun
 * cu oracolul (de la el se iau doar tipurile). Fiecare valoare așteptată e o formulă închisă, scrisă ca expresie aici
 * și cu calculul numeric în comentariu; niciuna nu e copiată din ce întoarce oracolul.
 *
 * Formulele (V = viteza nominală, a = accelerația blocului, L = lungimea; mm, mm/s, mm/s²):
 * - (T) trapez din repaus în repaus, când V²/a ≤ L: t = L/V + V/a (accelerarea și frânarea durează câte V/a și
 *   acoperă împreună V²/a; restul, la V);
 * - (Δ) triunghi din repaus în repaus, când a·L < V²: t = 2·√(L/a) (vârful √(a·L) la jumătate);
 * - (J) un bloc din repaus până la viteza de joncțiune v, cu croazieră: t = L/V + V/(2a) + (V − v)²/(2aV)
 *   (= V/a + (V − v)/a + [L − V²/(2a) − (V² − v²)/(2a)]/V);
 * - (S) un bloc cu intrarea și ieșirea u < V și vârf sub V: t = 2·(√(u² + a·L) − u)/a.
 * Din sursa GRBL: viteza nominală = min(F, viteza rapidă a blocului) (`planner.c:259-269`); viteza rapidă și
 * accelerația blocului = min pe axe din max_axă / |u_axă| (`nuts_bolts.c:180-190`); joncțiunea:
 * v² = a_j·δ·sin(θ/2)/(1 − sin(θ/2)) cu cos = −u₁·u₂ (`planner.c:429-451`); fereastra: 15 blocuri (`timp.ts`).
 */
import type { MutatiiGrbl, SetariGrbl } from './timp.ts';

export type Asteptat = {
  readonly secunde: number;
  readonly secundePauze?: number;
  readonly taiere?: number;
  readonly rapide?: number;
  readonly blocuri?: number;
};

/** Același caz, cu o setare sau un mecanism stricat: rezultatul TREBUIE să iasă din toleranță. */
export type ControlNegativ = {
  readonly descriere: string;
  readonly setari?: SetariGrbl;
  readonly mutatii?: MutatiiGrbl;
};

/** Același caz, cu o setare schimbată de care valoarea NU trebuie să depindă: rezultatul rămâne în toleranță. */
export type ControlNeutru = {
  readonly descriere: string;
  readonly setari: SetariGrbl;
};

export type CazTimp = {
  readonly nume: string;
  readonly gcode: string;
  readonly setari: SetariGrbl;
  readonly asteptat: Asteptat;
  /** Pe secunde (s). */
  readonly toleranta: number;
  /** Pe `taiere` / `rapide` (mm); lipsă = 1e-9. */
  readonly tolerantaMm?: number;
  readonly derivare: string;
  readonly controale: readonly ControlNegativ[];
  readonly neutre?: readonly ControlNeutru[];
};

/**
 * Implicitele GRBL 1.1h citite a doua oară, direct din sursă: `config.h:37` (`DEFAULTS_GENERIC`), `defaults.h:32-52`
 * (250 pași/mm, 500 mm/min, `10.0*60*60` mm/min² = 10 mm/s², `$11` = 0.01, `$12` = 0.002) și `planner.h:27-33`
 * (16 sloturi, unul mereu gol: 15 blocuri). Testul le compară cu `IMPLICITE_GRBL_11H` din oracol.
 */
export const GENERIC_HARTIE: SetariGrbl = {
  pasiPeMm: [250, 250, 250],
  vitezaMaxima: [500, 500, 500],
  acceleratie: [10, 10, 10],
  deviatieJonctiune: 0.01,
  toleranteArc: 0.002,
  blocuriPlanificator: 15,
};

const cu = (baza: SetariGrbl, schimbari: Partial<SetariGrbl>): SetariGrbl => ({ ...baza, ...schimbari });
const ori = (v: readonly [number, number, number], k: number): readonly [number, number, number] => [v[0] * k, v[1] * k, v[2] * k];

/** Avansuri mari permise pe toate axele (5000 mm/min), restul implicit: F-ul programului nu e tăiat. */
const LIBER = cu(GENERIC_HARTIE, { vitezaMaxima: [5000, 5000, 5000] });
/** Ca `LIBER`, cu 100 mm/s² pe toate axele și $11 = 0,05 mm (joncțiuni care contează la secundă). */
const RAPID = cu(LIBER, { acceleratie: [100, 100, 100], deviatieJonctiune: 0.05 });

const SQRT2 = Math.SQRT2;

// ---------------------------------------------------------------------------------------------------------------
// 1. Linia lungă, profil trapezoidal.
// G1 X200 F1000, $110 = 5000 (nu limitează), a = 10 mm/s². V = 1000/60 = 16,666667 mm/s; V²/a = 27,78 mm ≤ 200.
// (T): t = 200/16,666667 + 16,666667/10 = 12 + 1,666667 = 13,666667 s. 200 mm = 50 000 pași exact.
// Control: a × 1,01 → 12 + 1,650165 = 13,650165 s (Δ = 0,0165 s).
const V1 = 1000 / 60;
const TRAPEZ: CazTimp = {
  nume: 'linia lungă: trapez',
  gcode: 'G21 G90 G94\nG1 X200 F1000\n',
  setari: LIBER,
  asteptat: { secunde: 200 / V1 + V1 / 10, taiere: 200, rapide: 0, blocuri: 1 },
  toleranta: 1e-6,
  derivare: '(T) L/V + V/a = 200/16,6667 + 16,6667/10 = 13,666667 s',
  controale: [{ descriere: '$120–$122 × 1,01', setari: cu(LIBER, { acceleratie: ori(LIBER.acceleratie, 1.01) }) }],
};

// 2. Linia scurtă, profil triunghiular.
// G1 X5 F1000, a = 10: a·L = 50 < V² = 277,8 → triunghi, vârf √50 = 7,071 mm/s.
// (Δ): t = 2·√(5/10) = 1,414214 s. Control: a × 1,01 → 2·√(5/10,1) = 1,407195 s.
const TRIUNGHI: CazTimp = {
  nume: 'linia scurtă: triunghi',
  gcode: 'G1 X5 F1000',
  setari: LIBER,
  asteptat: { secunde: 2 * Math.sqrt(5 / 10), taiere: 5, blocuri: 1 },
  toleranta: 1e-6,
  derivare: '(Δ) 2·√(L/a) = 2·√0,5 = 1,414214 s',
  controale: [{ descriere: '$120–$122 × 1,01', setari: cu(LIBER, { acceleratie: ori(LIBER.acceleratie, 1.01) }) }],
};

// 3. G0 în diagonală, limitat pe axe.
// G0 X100 Y100: u = (1/√2, 1/√2, 0), L = 100·√2 = 141,421356 mm. $110 = 3000, $111 = 1500 → viteza rapidă
// = min(3000·√2, 1500·√2) = 2121,32 mm/min = 35,355339 mm/s (limitată de Y); a = min(50·√2, 50·√2) = 70,710678 mm/s².
// V²/a = 17,68 ≤ 141,4. (T): t = 141,421356/35,355339 + 35,355339/70,710678 = 4 + 0,5 = 4,5 s.
// Control: $111 = 3000 (axele egale) → V = 70,710678: 2 + 1 = 3 s.
const DIAG = cu(GENERIC_HARTIE, { vitezaMaxima: [3000, 1500, 500], acceleratie: [50, 50, 10] });
const VD = (1500 * SQRT2) / 60;
const AD = 50 * SQRT2;
const G0_DIAGONAL: CazTimp = {
  nume: 'G0 în diagonală, limitat de $111',
  gcode: 'G0 X100 Y100',
  setari: DIAG,
  asteptat: { secunde: (100 * SQRT2) / VD + VD / AD, taiere: 0, rapide: 100 * SQRT2, blocuri: 1 },
  toleranta: 1e-6,
  derivare: '(T) cu V = 1500·√2 mm/min și a = 50·√2: 4 + 0,5 = 4,5 s',
  controale: [{ descriere: '$111 = $110 = 3000', setari: cu(DIAG, { vitezaMaxima: [3000, 3000, 500] }) }],
};

// 4. Colțul de 90°, viteza la joncțiune din $11.
// G1 X50 F1000 / G1 Y50; a = 100 mm/s² pe X și Y, δ = 0,05 mm, V = 16,666667 mm/s.
// cos = −(1,0,0)·(0,1,0) = 0 → sin(θ/2) = √0,5; direcția joncțiunii (u₂ − u₁)/|…| = (−1, 1, 0)/√2 → a_j = 100·√2.
// v_j² = 100·√2·0,05·√0,5/(1 − √0,5) = 5/(1 − 1/√2) = 5·(2 + √2) = 17,071068 → v_j = 4,131715 mm/s.
// Nimic altceva nu o limitează (V² = 277,8; 2·a·L = 10 000). Fiecare bloc: (J) L/V + V/(2a) + (V − v_j)²/(2aV)
// = 3 + 0,083333 + 157,1252/3333,33 = 3,130471 s; două blocuri: 6,260942 s.
// Control: δ × 2 → v_j = √(10·3,414214) = 5,843127 → 6,236956 s.
const vJ = (d: number): number => Math.sqrt(100 * d * (2 + SQRT2));
const tJ = (L: number, V: number, a: number, v: number): number => L / V + V / (2 * a) + (V - v) ** 2 / (2 * a * V);
const COLT_90: CazTimp = {
  nume: 'colțul de 90°, joncțiunea din $11',
  gcode: 'G1 X50 F1000\nG1 Y50',
  setari: RAPID,
  asteptat: { secunde: 2 * tJ(50, V1, 100, vJ(0.05)), taiere: 100, blocuri: 2 },
  toleranta: 1e-6,
  derivare: 'v_j² = a·δ·(2 + √2) = 17,0711; 2·(J) = 2·3,130471 = 6,260942 s',
  controale: [{ descriere: '$11 × 2', setari: cu(RAPID, { deviatieJonctiune: 0.1 }) }],
};

// 5. Întoarcerea la 180°.
// G1 X50 F1000 / G1 X0: cos = −(1,0,0)·(−1,0,0) = 1 > 0,999999 → MINIMUM_JUNCTION_SPEED² = 0 (`planner.c:437-439`):
// oprire, oricare ar fi $11. Două blocuri (T) din repaus în repaus: 2·(50/16,666667 + 16,666667/100) = 2·3,166667
// = 6,333333 s. Control: a × 1,01 → 6,330033 s. Neutru: $11 × 2 nu schimbă nimic.
const INTOARCERE: CazTimp = {
  nume: 'întoarcerea la 180°: oprire',
  gcode: 'G1 X50 F1000\nG1 X0',
  setari: RAPID,
  asteptat: { secunde: 2 * (50 / V1 + V1 / 100), taiere: 100, blocuri: 2 },
  toleranta: 1e-6,
  derivare: 'cos = 1 > 0,999999 → v_j = 0; 2·(T) = 6,333333 s',
  controale: [{ descriere: '$120–$122 × 1,01', setari: cu(RAPID, { acceleratie: ori(RAPID.acceleratie, 1.01) }) }],
  neutre: [{ descriere: '$11 × 2 (pragul 0,999999 dă oprirea oricum)', setari: cu(RAPID, { deviatieJonctiune: 0.1 }) }],
};

// 6. Segmente scurte coliniare: fereastra planificatorului ține viteza sub nominală, în regim staționar.
// N = 100 de segmente de L = 1 mm pe X, F3000 (V = 50 mm/s, $110 = 5000), a = 10 mm/s². Joncțiunile coliniare sunt
// nelimitate (cos = −1); max_entry = V². Când blocul k se execută, planificatorul ține k..k+14 (W = 15), ultimul se
// termină în repaus, deci intrarea lui k+1 ≤ √(2·a·L·14) = √280 = 16,733201 mm/s (14 blocuri până la oprire).
// - blocurile 1..14: accelerare întreagă (intrare² = 2aL(k−1), ieșire² = 2aLk), de la 0 la v₁₄ pe 14 mm: v₁₄/a
//   = 1,673320 s;
// - blocurile 15..86 (N − 28 = 72): intrare = ieșire = v₁₄; stepperul accelerează spre V în fiecare bloc: (S), vârf
//   √(280 + 10) = 17,029386 < 50; t = 2·(17,029386 − 16,733201)/10 = 0,059237 s pe bloc, 4,265076 s în total;
// - blocurile 87..100: frânare întreagă de la v₁₄ la 0: 1,673320 s.
// Total: 2·1,673320 + 72·0,059237 = 7,611716 s.
// Controale: W = 14 (13 niveluri, √260, N − 26 = 74 la mijloc) → 7,770889 s; W = 16 (√300, 70) → 7,472425 s.
const fereastra = (W: number): number => {
  const a = 10, L = 1, N = 100, n = W - 1;
  const v = Math.sqrt(2 * a * L * n);
  return (2 * v) / a + (N - 2 * n) * ((2 * (Math.sqrt(v * v + a * L) - v)) / a);
};
const FEREASTRA: CazTimp = {
  nume: 'segmente scurte coliniare: fereastra de 15 blocuri',
  gcode: Array.from({ length: 100 }, (_, k) => `G1 X${k + 1}${k === 0 ? ' F3000' : ''}`).join('\n'),
  setari: LIBER,
  asteptat: { secunde: fereastra(15), taiere: 100, blocuri: 100 },
  toleranta: 1e-6,
  derivare: 'v = √(2aL·14); 2v/a + 72·2(√(v² + aL) − v)/a = 7,611716 s',
  controale: [
    { descriere: 'fereastra 14 (−1 bloc)', setari: cu(LIBER, { blocuriPlanificator: 14 }) },
    { descriere: 'fereastra 16 (+1 bloc)', setari: cu(LIBER, { blocuriPlanificator: 16 }) },
  ],
};

// 7. Arcul: cercul întreg G3 cu I/J, segmentele din $12.
// G3 X0 Y0 I10 J0 F600 din (0, 0): centrul (10, 0), R = 10, start = țintă → atan2(0, 100) = 0 ≤ 5·10⁻⁷ → +2π.
// Segmente = floor(|0,5·2π·10| / √(0,002·(20 − 0,002))) = floor(31,415927/0,199990) = floor(157,0875) = 157.
// Coardele: θ = 2π/157, fiecare 2R·sin(θ/2) → L = 157·20·sin(π/157) = 62,827660 mm. Joncțiunile dintre coarde:
// cos = −cos θ → sin(θ/2)_GRBL = cos(θ/2); v_j² ≥ a·δ·cos(θ/2)/(1 − cos(θ/2)) = 100·0,01·4994 = 4994 (mm/s)², adică
// ≥ 70,7 mm/s > V = 10 mm/s: nu limitează. Fereastra (14 coarde = 5,6 mm) > V²/(2a) = 0,5 mm: nici ea.
// Deci (T) pe toată lungimea: t = 62,827660/10 + 10/100 = 6,382766 s.
// Toleranța: accelerația unei coarde e a/cos(φ), φ = unghiul coardei față de Y; accelerarea și frânarea (0,5 mm
// fiecare, coardele cu φ ≤ 1,5θ = 0,06 rad) au a_ef ≤ 1,0018·a → |Δt| ≤ 2·0,1·0,0018 = 3,6·10⁻⁴ s; pașii (10 000 / mm)
// mută fiecare vârf cu ≤ √2·0,5·10⁻⁴ mm, perimetrul cu ≤ 157·7,1·10⁻⁵·θ = 4,4·10⁻⁴ mm. De aici 5·10⁻⁴ s și 5·10⁻⁴ mm.
// Control: $12 × 2 → floor(31,415927/0,282814) = floor(111,08) = 111 de segmente, L = 62,823465 mm.
const ARC_S = cu(RAPID, { deviatieJonctiune: 0.01, pasiPeMm: [10000, 10000, 10000] });
const L_ARC = 157 * 20 * Math.sin(Math.PI / 157);
const ARC: CazTimp = {
  nume: 'arcul G3 cu I/J: segmentele din $12',
  gcode: 'G17 G21\nG3 X0 Y0 I10 J0 F600',
  setari: ARC_S,
  asteptat: { secunde: L_ARC / 10 + 10 / 100, taiere: L_ARC, blocuri: 157 },
  toleranta: 5e-4,
  tolerantaMm: 5e-4,
  derivare: 'floor(πR/√(tol(2R − tol))) = 157; L = 157·2R·sin(π/157); L/V + V/a = 6,382766 s',
  controale: [{ descriere: '$12 × 2', setari: cu(ARC_S, { toleranteArc: 0.004 }) }],
};

// 8. Pauza G4, cu rotunjirea din `delay_sec`.
// G1 X50 F1000 / G4 P0.12 / G4 P0.051 / G1 X100. `nuts_bolts.c:114`: ceil(1000/50·P) pași de 50 ms (1000/50 e
// împărțire întreagă = 20): ceil(2,4) = 3 → 0,15 s; ceil(1,02) = 2 → 0,10 s. Pauzele: 0,25 s. G4 golește bufferul
// (`motion_control.c:198`), deci cele două linii sunt (T) din repaus în repaus: 2·3,166667 = 6,333333 s.
// Total: 6,583333 s. Control: pauza fără rotunjire → 6,333333 + 0,171 = 6,504333 s.
const PAUZA: CazTimp = {
  nume: 'G4: pauza rotunjită la 50 ms, cu oprire',
  gcode: 'G1 X50 F1000\nG4 P0.12\nG4 P0.051\nG1 X100',
  setari: RAPID,
  asteptat: { secunde: 2 * (50 / V1 + V1 / 100) + 3 * 0.05 + 2 * 0.05, secundePauze: 0.25, taiere: 100, blocuri: 2 },
  toleranta: 1e-6,
  derivare: 'ceil(20·0,12)·0,05 + ceil(20·0,051)·0,05 = 0,25; + 2·(T) = 6,583333 s',
  controale: [{ descriere: 'pauza fără rotunjire', mutatii: { pauzaFaraRotunjire: true } }],
};

// 9. M3 / M5 opresc mișcarea (sincronizarea bufferului).
// G1 X50 F1000 / M3 S10000 / G1 X100 / M5 / G1 X150: schimbarea stării axului cheamă `spindle_sync` → golește
// bufferul (`gcode.c:942-948`, `spindle_control.c:277-282`). Trei blocuri coliniare, fiecare (T) din repaus în
// repaus: 3·(50/16,666667 + 16,666667/100) = 3·3,166667 = 9,5 s. Control: fără sincronizare, cele trei curg într-unul:
// 150/16,666667 + 0,166667 = 9,166667 s.
const AX: CazTimp = {
  nume: 'M3 / M5: oprirea la schimbarea axului',
  gcode: 'G1 X50 F1000\nM3 S10000\nG1 X100\nM5\nG1 X150',
  setari: RAPID,
  asteptat: { secunde: 3 * (50 / V1 + V1 / 100), taiere: 150, blocuri: 3 },
  toleranta: 1e-6,
  derivare: '3·(T) = 3·3,166667 = 9,5 s',
  controale: [{ descriere: 'fără sincronizare', mutatii: { faraSincronizare: true } }],
};

// 10. Turația schimbată cu axul pornit și lichidul de răcire opresc și ele mișcarea.
// M3 S10000 / G1 X50 F1000 / S12000 / G1 X100 / M8 / G1 X150 / M9 / M5 / M30.
// `gcode.c:917-923`: S diferit cu axul pornit (fără modul laser) → `spindle_sync`; `gcode.c:952-956`: M8 → `coolant_sync`.
// Aceleași trei blocuri (T) din repaus în repaus: 9,5 s. Control: fără sincronizare → 9,166667 s.
const TURATIE_RACIRE: CazTimp = {
  nume: 'S cu axul pornit și M8: oprirea',
  gcode: 'M3 S10000\nG1 X50 F1000\nS12000\nG1 X100\nM8\nG1 X150\nM9\nM5\nM30',
  setari: RAPID,
  asteptat: { secunde: 3 * (50 / V1 + V1 / 100), taiere: 150, blocuri: 3 },
  toleranta: 1e-6,
  derivare: '3·(T) = 9,5 s',
  controale: [{ descriere: 'fără sincronizare', mutatii: { faraSincronizare: true } }],
};

// 11. M3 cu aceeași stare și turație NU oprește.
// M3 S10000 / G1 X50 F1000 / M3 S10000 / G1 X100: starea și turația nu se schimbă, deci nicio sincronizare
// (`gcode.c:917` și `942` compară cu starea curentă); M9 cu răcirea deja oprită, la fel. Un singur drum coliniar
// de 100 mm, (T): 100/16,666667 + 0,166667 = 6,166667 s. Control: sincronizare la orice cuvânt → 2·3,166667 = 6,333333 s.
const FARA_SCHIMBARE: CazTimp = {
  nume: 'M3 fără schimbare: nicio oprire',
  gcode: 'M3 S10000\nG1 X50 F1000\nM3 S10000\nG1 X100\nM9\nM30',
  setari: RAPID,
  asteptat: { secunde: 100 / V1 + V1 / 100, taiere: 100, blocuri: 2 },
  toleranta: 1e-6,
  derivare: '(T) pe 100 mm = 6,166667 s',
  controale: [{ descriere: 'sincronizare la orice S / M3 / M5 / M8 / M9', mutatii: { sincronizareMereu: true } }],
};

// 12. Plonjarea pe Z, cu limitele lui Z.
// G1 Z-5 F600, $112 = 300 mm/min, $122 = 20 mm/s² (X, Y: 5000 și 100). u = (0, 0, −1): viteza rapidă = 300 mm/min
// = 5 mm/s, deci nominala = min(600, 300) = 5 mm/s; a = 20. V²/a = 1,25 ≤ 5. (T): 5/5 + 5/20 = 1,25 s.
// Control: Z cu limitele lui X (5000 mm/min, 100 mm/s²) → V = 10 mm/s: 0,5 + 0,1 = 0,6 s.
const Z_LENT = cu(GENERIC_HARTIE, { vitezaMaxima: [5000, 5000, 300], acceleratie: [100, 100, 20] });
const PLONJARE: CazTimp = {
  nume: 'plonjarea pe Z: $112 și $122',
  gcode: 'G1 Z-5 F600',
  setari: Z_LENT,
  asteptat: { secunde: 5 / 5 + 5 / 20, taiere: 5, blocuri: 1 },
  toleranta: 1e-6,
  derivare: '(T) cu V = $112 = 5 mm/s, a = $122 = 20: 1,25 s',
  controale: [{ descriere: 'Z cu limitele lui X', setari: cu(Z_LENT, { vitezaMaxima: [5000, 5000, 5000], acceleratie: [100, 100, 100] }) }],
};

// 13. Avansul peste $110, tăiat la viteza maximă a blocului.
// G1 X100 F2000, $110 = 1000 mm/min, a = 50 mm/s²: nominala = min(2000, 1000) = 1000 mm/min = 16,666667 mm/s
// (`planner.c:265`). (T): 100/16,666667 + 16,666667/50 = 6 + 0,333333 = 6,333333 s.
// Control: $110 = 2500 → F2000 netăiat, V = 33,333333: 3 + 0,666667 = 3,666667 s.
const F_TAIAT = cu(GENERIC_HARTIE, { vitezaMaxima: [1000, 1000, 500], acceleratie: [50, 50, 10] });
const AVANS_TAIAT: CazTimp = {
  nume: 'F peste $110: tăiat la viteza maximă',
  gcode: 'G1 X100 F2000',
  setari: F_TAIAT,
  asteptat: { secunde: 100 / V1 + V1 / 50, taiere: 100, blocuri: 1 },
  toleranta: 1e-6,
  derivare: '(T) cu V = $110 = 1000 mm/min: 6,333333 s',
  controale: [{ descriere: '$110 = 2500', setari: cu(F_TAIAT, { vitezaMaxima: [2500, 1000, 500] }) }],
};

// 14. G20: X și F în inch.
// G20 / G1 X1 F10: X = 25,4 mm (6350 pași exact), F = 254 mm/min = 4,233333 mm/s (`gcode.c:419`, `478`), a = 10.
// V²/a = 1,79 ≤ 25,4. (T): 25,4/4,233333 + 4,233333/10 = 6 + 0,423333 = 6,423333 s. Control: a × 1,01 → 6,419142 s.
const V14 = (10 * 25.4) / 60;
const INCH: CazTimp = {
  nume: 'G20: X și F în inch',
  gcode: 'G20\nG1 X1 F10',
  setari: LIBER,
  asteptat: { secunde: 25.4 / V14 + V14 / 10, taiere: 25.4, blocuri: 1 },
  toleranta: 1e-6,
  derivare: '(T) cu L = 25,4 mm, V = 254 mm/min: 6,423333 s',
  controale: [{ descriere: '$120–$122 × 1,01', setari: cu(LIBER, { acceleratie: ori(LIBER.acceleratie, 1.01) }) }],
};

// 15. G91: trei pași relativi coliniari, un singur trapez.
// G91 / G1 X10 F600 / X10 / X10: 30 mm pe X la V = 10 mm/s, a = 10. Joncțiunile sunt drepte; blocul 1 vede toate cele 3
// (capătul programului), ieșirea lui ≤ √(2·10·20) > V. (T) pe 30 mm: 30/10 + 10/10 = 4 s.
// Control: fereastra 1 → fiecare bloc singur, oprit: 3·(10/10 + 1) = 6 s. Neutru: fereastra 2 (un bloc înainte
// = 10 mm de frânare ≥ V²/(2a) = 5 mm) dă tot 4 s.
const INCREMENTAL: CazTimp = {
  nume: 'G91: pași relativi coliniari',
  gcode: 'G91\nG1 X10 F600\nX10\nX10',
  setari: LIBER,
  asteptat: { secunde: 30 / 10 + 10 / 10, taiere: 30, blocuri: 3 },
  toleranta: 1e-6,
  derivare: '(T) pe 30 mm la 10 mm/s: 4 s',
  controale: [{ descriere: 'fereastra 1', setari: cu(LIBER, { blocuriPlanificator: 1 }) }],
  neutre: [{ descriere: 'fereastra 2', setari: cu(LIBER, { blocuriPlanificator: 2 }) }],
};

// 16. Un traseu mixt cu $11 = 0 (oprire exactă la fiecare colț): rapidele, tăierea, blocurile.
// $110 = $111 = 3000, $112 = 600 mm/min; $120 = $121 = 100, $122 = 50 mm/s². Toate colțurile sunt de 90° (cos = 0), iar
// cu δ = 0 viteza la joncțiune e max(0, 0) = 0: fiecare bloc e (T) din repaus în repaus.
// - G0 Z5:       L = 5,  V = 10 mm/s (Z), a = 50:                    0,5 + 0,2  = 0,7 s;
// - G0 X30 Y40:  L = 50, u = (0,6; 0,8): V = min(5000, 3750) mm/min = 62,5 mm/s, a = min(166,7; 125) = 125:
//                                                                     0,8 + 0,5  = 1,3 s;
// - G1 Z-1 F300: L = 6,  V = 5 mm/s, a = 50:                          1,2 + 0,1  = 1,3 s;
// - G1 X60:      L = 30, V = 5 mm/s, a = 100:                         6 + 0,05   = 6,05 s;
// - G0 Z5:       L = 6,  V = 10 mm/s, a = 50:                         0,6 + 0,2  = 0,8 s.
// Total 10,15 s; rapide 5 + 50 + 6 = 61 mm; tăiere 6 + 30 = 36 mm; 5 blocuri. Control: $11 = 0,01 → colțurile curg.
const MIXT_S = cu(GENERIC_HARTIE, { vitezaMaxima: [3000, 3000, 600], acceleratie: [100, 100, 50], deviatieJonctiune: 0 });
const MIXT: CazTimp = {
  nume: 'traseu mixt cu $11 = 0: rapide, tăiere, blocuri',
  gcode: 'G90 G21 G17 G94 G54 G40 G49 G80\nG0 Z5\nG0 X30 Y40\nG1 Z-1 F300\nG1 X60\nG0 Z5\nM30\n',
  setari: MIXT_S,
  asteptat: {
    secunde: (0.5 + 0.2) + (50 / 62.5 + 62.5 / 125) + (6 / 5 + 5 / 50) + (30 / 5 + 5 / 100) + (6 / 10 + 10 / 50),
    taiere: 36,
    rapide: 61,
    blocuri: 5,
  },
  toleranta: 1e-6,
  derivare: '5 blocuri (T) oprite la colțuri: 0,7 + 1,3 + 1,3 + 6,05 + 0,8 = 10,15 s',
  controale: [{ descriere: '$11 = 0,01', setari: cu(MIXT_S, { deviatieJonctiune: 0.01 }) }],
};

export const CAZURI_TIMP: readonly CazTimp[] = [
  TRAPEZ, TRIUNGHI, G0_DIAGONAL, COLT_90, INTOARCERE, FEREASTRA, ARC, PAUZA, AX, TURATIE_RACIRE, FARA_SCHIMBARE,
  PLONJARE, AVANS_TAIAT, INCH, INCREMENTAL, MIXT,
];

// ---------------------------------------------------------------------------------------------------------------
// Ce oracolul refuză: GRBL ar da `error:N` pe linie, sau timpul n-are sens (omul, coordonatele necunoscute).

export type CazRefuzat = { readonly nume: string; readonly gcode: string; readonly linia: number };

/** 3 + 80 = 83 de caractere utile (comentariile și spațiile nu se numără, `protocol.c:119-147`). */
const LUNGA = `G1 X${'1'.repeat(80)} (comentariul nu se numără)`;
export const CAZURI_REFUZATE: readonly CazRefuzat[] = [
  { nume: 'G18', gcode: 'G21\nG18', linia: 2 },
  { nume: 'G19', gcode: 'G19', linia: 1 },
  { nume: 'G93', gcode: 'G1 X1 F100\nG93 G1 X2 F10', linia: 2 },
  { nume: 'M0', gcode: 'G1 X1 F100\nM0', linia: 2 },
  { nume: 'M1', gcode: 'M1', linia: 1 },
  { nume: 'arc cu R', gcode: 'G1 F100\nG2 X10 Y0 R5', linia: 2 },
  { nume: 'G28', gcode: 'G28', linia: 1 },
  { nume: 'G92', gcode: 'G92 X0 Y0', linia: 1 },
  { nume: 'G10 L20', gcode: 'G10 L20 P1 X0', linia: 1 },
  { nume: 'G38.2', gcode: 'G38.2 Z-5 F10', linia: 1 },
  { nume: 'G43.1', gcode: 'G43.1 Z1', linia: 1 },
  { nume: 'G53', gcode: 'G53 G0 X0', linia: 1 },
  { nume: 'G61.1', gcode: 'G61.1', linia: 1 },
  { nume: 'G90.1', gcode: 'G90.1', linia: 1 },
  { nume: 'G64', gcode: 'G64', linia: 1 },
  { nume: 'G1.5 (neîntreg)', gcode: 'G1.5 X1', linia: 1 },
  { nume: 'M6', gcode: 'M6 T1', linia: 1 },
  { nume: 'M7 (oprit implicit)', gcode: 'M7', linia: 1 },
  { nume: 'litera A', gcode: 'G1 F100\nG1 X1 A10', linia: 2 },
  { nume: '%', gcode: '%\nG0 X1', linia: 1 },
  { nume: 'paranteză închisă fără deschidere', gcode: 'G0 X1 )', linia: 1 },
  { nume: 'G1 fără F (error:22)', gcode: 'G1 X10', linia: 1 },
  { nume: 'G1 explicit fără F, fără axe (error:22)', gcode: 'G1', linia: 1 },
  { nume: 'I pe G1 (cuvânt nefolosit, error:36)', gcode: 'G1 F100\nG1 X10 I5', linia: 2 },
  { nume: 'P fără G4 (error:36)', gcode: 'G0 X1 P1', linia: 1 },
  { nume: 'G4 fără P', gcode: 'G4', linia: 1 },
  { nume: 'arcul cu ținta în afara cercului (error:33)', gcode: 'G1 F100\nG2 X10 Y0 I3 J0', linia: 2 },
  { nume: 'arc fără I / J', gcode: 'G2 X10 Y0 F100', linia: 1 },
  { nume: 'arc doar cu Z', gcode: 'G2 Z1 I1 F100', linia: 1 },
  { nume: 'două mișcări pe o linie (conflict de axe, error:24)', gcode: 'G0 G1 X1 F100', linia: 1 },
  { nume: 'G90 și G91 pe o linie (grup modal, error:21)', gcode: 'G90 G91', linia: 1 },
  { nume: 'cuvânt repetat', gcode: 'G0 X1 X2', linia: 1 },
  { nume: 'F negativ', gcode: 'G1 X1 F-100', linia: 1 },
  { nume: 'axe cu G80 (error:31)', gcode: 'G80\nX10', linia: 2 },
  { nume: 'G49 cu axe', gcode: 'G49 Z5', linia: 1 },
  { nume: '$H', gcode: 'G0 X1\n$H', linia: 2 },
  { nume: 'linia peste 79 de caractere utile', gcode: `G0 X0\n${LUNGA}`, linia: 2 },
  { nume: 'literă fără număr', gcode: 'G0 X', linia: 1 },
  { nume: 'G4 peste uint16_t', gcode: 'G4 P99999', linia: 1 },
  { nume: 'T peste 255', gcode: 'T300', linia: 1 },
  { nume: 'N peste 10 000 000', gcode: 'N10000001 G0 X1', linia: 1 },
];
