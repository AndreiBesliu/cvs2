/**
 * CORPUSUL SIMULĂRII: piesele pe care se judecă oracolul (`simulare.ts`) și, după el, nucleul de simulare. E portat
 * din sonda s4 (`docs/faza2/sonde/s4-simulare/cod/test/corpus.mjs`), cu ZERO importuri din `src/` și fără cod comun cu
 * oracolul (de la el se iau doar tipurile).
 *
 * Fiecare caz poartă mutările într-o descriere neutră (`mutari`, pentru nucleu) și TEXTUL G-code-ului (`gcode`, pentru
 * oracol). CONVENȚIA DE LEGĂTURĂ, aceeași pe care o aplică testul nucleului când transformă `mutari` în programul lui
 * (și pe care o respectă `scrieGcode` de mai jos):
 * 1. programul începe cu `G21 G90 G17` și `G0 Z5`;
 * 2. înaintea fiecărei mutări al cărei start diferă de poziția curentă (egalitate exactă a numerelor; la prima
 *    mutare poziția în XY e necunoscută, deci diferă mereu): `G0 Z5`, `G0 X… Y…` (startul), `G1 Z…` (Z-ul startului);
 * 3. mutarea: linia `G1 X… Y… Z…`, arcul `G2` (orar) / `G3` (trigonometric) `X… Y… Z… I… J…`, cu I/J = centrul −
 *    startul; excepție: piesele scrise de mână cu `R` (`arc-g2-R`, `arc-mare-R-neg`), care respectă restul convenției;
 * 4. la sfârșit, `G0 Z5`.
 * Numerele se scriu rotunjite la 1e-9 mm, fără zerourile de la coadă: diferența față de numerele din `mutari` e sub
 * 1 nm, deci nu poate muta niciun perete peste un centru de celulă decât într-o fâșie de 1 nm. Mutările de legătură
 * nu adaugă nimic: urcarea pornește din capătul mutării de dinainte, rapida e la Z5, deasupra feței, iar coborârea
 * se oprește în startul mutării, pe care mutarea îl acoperă oricum.
 *
 * VALORILE PE HÂRTIE (`hartie`) sunt formule închise z(x, y), scrise aici independent de oracol, cu calculul în
 * comentariu; niciuna nu e copiată din ce întoarce el. `muchie(x, y)` e distanța de la (x, y) la discontinuitatea
 * hârtiei (peretele vertical): celulele aflate chiar pe ea se sar. Fața plăcii e z = 0 peste tot (`sus` lipsă).
 *
 * MARTORII GREȘIȚI (`MARTORI_GRESITI`) sunt cele 7 otrăvuri ale sondei (`cod/test/poisons.mjs`), puse în câmpuri dense
 * construite din valoarea pe hârtie cu defectul injectat (sau dintr-un calcul brut mic cu defectul, la elice); fiecare
 * spune ce verificări TREBUIE să-l prindă.
 *
 * Abateri de la s4: piesa cu litere (Arial de pe Windows) e înlocuită cu o gravură V60 pe două polilinii calculate
 * aici (`gravura-v60`); `elice` și `gravura-v60` au primit și valoare pe hârtie (în s4 erau doar cu oracol); muchia
 * pieselor cu două șanțuri e distanța la reuniune (în s4, la fiecare șanț în parte).
 */
import type { Fereastra, GrilaOracol, P2, P3, SculaOracol } from './simulare.ts';

export type MutareCaz =
  | { readonly tip: 'linie'; readonly a: P3; readonly b: P3 }
  | { readonly tip: 'arc'; readonly sens: 'orar' | 'trigonometric'; readonly a: P3; readonly b: P3; readonly centru: P2 };

export type CazSimulare = {
  readonly id: string;
  readonly descriere: string;
  readonly grila: GrilaOracol;
  /** Cel mai adânc Z programat: niciun câmp nu coboară sub el. */
  readonly zProgramat: number;
  readonly scula: SculaOracol;
  readonly mutari: readonly MutareCaz[];
  readonly gcode: string;
  /** Valoarea pe hârtie, în coordonatele grilei. */
  readonly hartie?: (x: number, y: number) => number;
  /** Distanța la discontinuitatea hârtiei (pereții); lipsă = hârtia e continuă. */
  readonly muchie?: (x: number, y: number) => number;
  /** Hârtia (și oracolul) se verifică doar pe aceste ferestre: placa întreagă e prea mare pentru o grilă densă. */
  readonly ferestre?: readonly Fereastra[];
  /** Secțiunea bilei pe coloana x: cercul așteptat. */
  readonly sectiune?: { readonly x: number; readonly raza: number; readonly centruY: number; readonly centruZ: number };
  /** Unghiul V pe coloana x, cu axa șanțului la centruY. */
  readonly unghiV?: { readonly x: number; readonly centruY: number; readonly grade: number };
  /** Lățimea radială a șanțului pe arc, pe razele de unghiuri date. */
  readonly radial?: {
    readonly centru: P2; readonly unghiuri: readonly number[]; readonly rMin: number; readonly rMax: number;
    readonly zPrag: number; readonly latime: number;
  };
  /** Același câmp ca al altui caz (alt program, aceeași materie scoasă). */
  readonly identicCu?: string;
  /** O aproximare declarată a nucleului din s4 pe piesa asta (nu a oracolului). */
  readonly abatereDeclarata?: { readonly maiSusMax: number; readonly motiv: string };
};

// ---------------------------------------------------------------------------------------------------------------
// Scriitorul (convenția din antet).

/** Numărul rotunjit la 1e-9, fără zerourile de la coadă. */
export function numar(v: number): string {
  const s = (Math.round(v * 1e9) / 1e9).toFixed(9).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
}

export function scrieGcode(mutari: readonly MutareCaz[]): string {
  const L = ['G21 G90 G17', 'G0 Z5'];
  let poz: P3 | undefined;
  for (const m of mutari) {
    const [ax, ay, az] = m.a;
    if (!poz || poz[0] !== ax || poz[1] !== ay || poz[2] !== az) L.push('G0 Z5', `G0 X${numar(ax)} Y${numar(ay)}`, `G1 Z${numar(az)}`);
    const [bx, by, bz] = m.b;
    if (m.tip === 'linie') L.push(`G1 X${numar(bx)} Y${numar(by)} Z${numar(bz)}`);
    else L.push(`${m.sens === 'orar' ? 'G2' : 'G3'} X${numar(bx)} Y${numar(by)} Z${numar(bz)} I${numar(m.centru[0] - ax)} J${numar(m.centru[1] - ay)}`);
    poz = m.b;
  }
  L.push('G0 Z5');
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------------------------------------------
// Geometria hârtiei (independentă de oracol).

const linie = (a: P3, b: P3): MutareCaz => ({ tip: 'linie', a, b });
const arc = (sens: 'orar' | 'trigonometric', a: P3, b: P3, centru: P2): MutareCaz => ({ tip: 'arc', sens, a, b, centru });

/** Distanța de la (px, py) la segmentul AB: proiecția pe dreaptă, tăiată la capete. */
export function dSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/**
 * Distanța la arcul de rază r din (cx, cy), parcurs trigonometric de la a0 la a1 grade (a0 < a1 ≤ a0 + 360), prin
 * unghiul atan2: în deschiderea arcului, distanța e |ρ − r| (proiecția radială cade pe arc); în afara ei, cel mai
 * apropiat punct al arcului e un capăt.
 */
export function dArc(px: number, py: number, cx: number, cy: number, r: number, a0: number, a1: number): number {
  let a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  while (a < a0) a += 360;
  if (a <= a1) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  const [e0x, e0y] = pol(cx, cy, r, a0), [e1x, e1y] = pol(cx, cy, r, a1);
  return Math.min(Math.hypot(px - e0x, py - e0y), Math.hypot(px - e1x, py - e1y));
}

export function pol(cx: number, cy: number, r: number, grade: number): P2 {
  return [cx + r * Math.cos((grade * Math.PI) / 180), cy + r * Math.sin((grade * Math.PI) / 180)];
}

const FLAT6: SculaOracol = { tip: 'plata', diametru: 6 };
const BALL6: SculaOracol = { tip: 'bila', diametru: 6 };
const V90: SculaOracol = { tip: 'v', diametru: 12, unghi: 90 };
const V60: SculaOracol = { tip: 'v', diametru: 6, unghi: 60 };
/** Fund plat de 4 mm (r ≤ 2), pereți la 45° până la r = 5, h = 3. */
const PROF: SculaOracol = { tip: 'profil', diametru: 10, puncte: [[0, 0], [2, 0], [5, 3]] };
const SQRT3 = Math.sqrt(3);

const G6040: GrilaOracol = { x0: 0, y0: 0, latime: 60, inaltime: 40, celula: 0.05 };
const G8080: GrilaOracol = { x0: 0, y0: 0, latime: 80, inaltime: 80, celula: 0.05 };
const G6060: GrilaOracol = { x0: 0, y0: 0, latime: 60, inaltime: 60, celula: 0.05 };
const G4040: GrilaOracol = { x0: 0, y0: 0, latime: 40, inaltime: 40, celula: 0.05 };

/** Freza plată la Z constant: z = zc unde distanța la traseu ≤ R, altfel fața (0). */
const plata = (d: number, zc: number): number => (d <= 3 ? zc : 0);

// ---------------------------------------------------------------------------------------------------------------
// Piesele.

function cazuri(): CazSimulare[] {
  const C: CazSimulare[] = [];
  const pune = (c: Omit<CazSimulare, 'gcode'> & { readonly gcode?: string }): void => {
    C.push({ ...c, gcode: c.gcode ?? scrieGcode(c.mutari) });
  };

  // 1. Șanțul plat Ø6 la −3, de la (10, 20) la (50, 20): z = −3 la distanța d ≤ 3 de segment, altfel 0.
  const dSant = (x: number, y: number): number => dSeg(x, y, 10, 20, 50, 20);
  pune({
    id: 'sant-plat', descriere: 'șanț cu freza plată Ø6 la −3: lățime 6, adâncime −3 exact', grila: G6040, zProgramat: -3,
    scula: FLAT6, mutari: [linie([10, 20, -3], [50, 20, -3])],
    hartie: (x, y) => plata(dSant(x, y), -3),
    muchie: (x, y) => Math.abs(dSant(x, y) - 3),
  });

  // 2. Șanțul cu bilă Ø6 la −2: centrul bilei la z = −2 + 3 = 1, suprafața z = 1 − √(9 − d²) (Pitagora în secțiunea
  //    perpendiculară), tăiată la fața 0; ajunge la față la d = √8 ≈ 2,828 (fără perete).
  pune({
    id: 'sant-bila', descriere: 'șanț cu bila Ø6 la −2: secțiunea e un cerc de rază 3 cu centrul la z = +1', grila: G6040,
    zProgramat: -2, scula: BALL6, mutari: [linie([10, 20, -2], [50, 20, -2])],
    hartie: (x, y) => {
      const d = dSant(x, y);
      return d <= 3 ? Math.min(0, 1 - Math.sqrt(9 - d * d)) : 0;
    },
    sectiune: { x: 30, raza: 3, centruY: 20, centruZ: 1 },
  });

  // 3. V90 Ø12 la −2: pereții au panta cot 45° = 1, deci z = −2 + d; ajunge la față la d = 2.
  pune({
    id: 'sant-v90', descriere: 'șanț V90 la −2: pereți cu pantele ±1 (unghi drept)', grila: G6040, zProgramat: -2,
    scula: V90, mutari: [linie([10, 20, -2], [50, 20, -2])],
    hartie: (x, y) => Math.min(0, -2 + dSant(x, y)),
    unghiV: { x: 30, centruY: 20, grade: 90 },
  });

  // 4. V60 Ø6 la −1,5: panta cot 30° = √3 (triunghiul 30-60-90), z = −1,5 + √3·d; ajunge la față la d = 0,866.
  pune({
    id: 'sant-v60', descriere: 'șanț V60 la −1,5: pereți cu pantele ±√3 (unghi de 60°)', grila: G6040, zProgramat: -1.5,
    scula: V60, mutari: [linie([10, 20, -1.5], [50, 20, -1.5])],
    hartie: (x, y) => Math.min(0, -1.5 + SQRT3 * dSant(x, y)),
    unghiV: { x: 30, centruY: 20, grade: 60 },
  });

  // 5. Arcul G3 r = 25 din (40, 40), de la 30° la 120°, plat la −3: z = −3 la distanța ≤ 3 de arc.
  //    Același arc, parcurs invers cu G2 și scris de mână cu R25: aceeași materie.
  {
    const [sx, sy] = pol(40, 40, 25, 30), [ex, ey] = pol(40, 40, 25, 120);
    const dA = (x: number, y: number): number => dArc(x, y, 40, 40, 25, 30, 120);
    pune({
      id: 'arc-g3', descriere: 'șanț pe arc G3 (I/J) de la 30° la 120°, r 25: lățime radială 6', grila: G8080, zProgramat: -3,
      scula: FLAT6, mutari: [arc('trigonometric', [sx, sy, -3], [ex, ey, -3], [40, 40])],
      hartie: (x, y) => plata(dA(x, y), -3),
      muchie: (x, y) => Math.abs(dA(x, y) - 3),
      radial: { centru: [40, 40], unghiuri: [30, 45, 60, 90, 120], rMin: 15, rMax: 35, zPrag: -2.999, latime: 6 },
    });
    pune({
      id: 'arc-g2-R', descriere: 'același arc, parcurs G2 de la 120° la 30° și scris de mână cu R25', grila: G8080,
      zProgramat: -3, scula: FLAT6, mutari: [arc('orar', [ex, ey, -3], [sx, sy, -3], [40, 40])],
      gcode: [
        'G21 G90 G17', 'G0 Z5', '(arcul de la 120 la 30 de grade, scris cu R)', 'G0 Z5', `G0 X${numar(ex)} Y${numar(ey)}`,
        'G1 Z-3', `G2 X${numar(sx)} Y${numar(sy)} Z-3 R25`, 'G0 Z5', '',
      ].join('\n'),
      hartie: (x, y) => plata(dA(x, y), -3),
      muchie: (x, y) => Math.abs(dA(x, y) - 3),
      identicCu: 'arc-g3',
    });
  }

  // 6. Cercul complet G3 cu I/J (startul = ținta), r 15 din (30, 30): inelul 12 ≤ ρ ≤ 18 la −3.
  pune({
    id: 'cerc-complet', descriere: 'cerc complet G3 cu I/J: inel între 12 și 18 mm', grila: G6060, zProgramat: -3,
    scula: FLAT6, mutari: [arc('trigonometric', [45, 30, -3], [45, 30, -3], [30, 30])],
    hartie: (x, y) => plata(Math.abs(Math.hypot(x - 30, y - 30) - 15), -3),
    muchie: (x, y) => Math.abs(Math.abs(Math.hypot(x - 30, y - 30) - 15) - 3),
  });

  // 7. Arcul mare (270°) cu R negativ, scris de mână: G3 de la 0° la 270°, r 15 din (30, 30).
  {
    const [sx, sy] = pol(30, 30, 15, 0), [ex, ey] = pol(30, 30, 15, 270);
    const dA = (x: number, y: number): number => dArc(x, y, 30, 30, 15, 0, 270);
    pune({
      id: 'arc-mare-R-neg', descriere: 'arc de 270° G3 scris cu R−15 (arcul mare)', grila: G6060, zProgramat: -3, scula: FLAT6,
      mutari: [arc('trigonometric', [sx, sy, -3], [ex, ey, -3], [30, 30])],
      gcode: [
        'G21 G90 G17', 'G0 Z5', 'G0 Z5', `G0 X${numar(sx)} Y${numar(sy)}`, 'G1 Z-3 ; coborârea în start',
        `G3 X${numar(ex)} Y${numar(ey)} Z-3 R-15`, 'G0 Z5', '',
      ].join('\n'),
      hartie: (x, y) => plata(dA(x, y), -3),
      muchie: (x, y) => Math.abs(dA(x, y) - 3),
    });
  }

  // 8. Plonjarea plată de la Z5 la −5 în (20, 20): gaura de rază 3 la −5.
  const rP = (x: number, y: number): number => Math.hypot(x - 20, y - 20);
  pune({
    id: 'plonjare-plata', descriere: 'plonjare cu freza plată: gaură de rază 3 la −5', grila: G4040, zProgramat: -5,
    scula: FLAT6, mutari: [linie([20, 20, 5], [20, 20, -5])],
    hartie: (x, y) => plata(rP(x, y), -5),
    muchie: (x, y) => Math.abs(rP(x, y) - 3),
  });

  // 9. Plonjarea cu bilă până la −4: centrul bilei la −1, emisfera z = −1 − √(9 − ρ²); la ρ = 3, z = −1, deci coada
  //    sculei lasă un perete vertical de la −1 la 0.
  pune({
    id: 'plonjare-bila', descriere: 'plonjare cu bila până la −4: emisferă, perete vertical de 1 mm la ρ = 3', grila: G4040,
    zProgramat: -4, scula: BALL6, mutari: [linie([20, 20, 5], [20, 20, -4])],
    hartie: (x, y) => {
      const r = rP(x, y);
      return r <= 3 ? -1 - Math.sqrt(9 - r * r) : 0;
    },
    muchie: (x, y) => Math.abs(rP(x, y) - 3),
  });

  // 10. Rampa plată de la (10, 20, 0) la (40, 20, −3): z(t) = −3t, x(t) = 10 + 30t. Celula la e = y − 20 e acoperită
  //     cât timp |x − x(t)| ≤ w = √(9 − e²), adică t ∈ [ta, tb] = [(x − 10 − w)/30, (x − 10 + w)/30] ∩ [0, 1]. Z scade
  //     cu t, deci cel mai jos e la tb: z = −3·tb. Pereții: marginea zonei măturate (|e| = 3 și capacul de la capăt).
  pune({
    id: 'rampa-plata', descriere: 'rampă cu freza plată, 0 → −3 pe 30 mm: pe celulă, cel mai jos punct al intervalului acoperit',
    grila: G6040, zProgramat: -3, scula: FLAT6, mutari: [linie([10, 20, 0], [40, 20, -3])],
    hartie: (x, y) => {
      const e = y - 20;
      if (Math.abs(e) > 3) return 0;
      const w = Math.sqrt(9 - e * e);
      const ta = Math.max(0, (x - 10 - w) / 30), tb = Math.min(1, (x - 10 + w) / 30);
      return ta > tb ? 0 : Math.min(0, -3 * tb);
    },
    muchie: (x, y) => Math.abs(dSeg(x, y, 10, 20, 40, 20) - 3),
  });

  // 11. Profilul h(r) = max(0, r − 2) (fund de 4 mm, pereți la 45°) la −2: z = −2 + max(0, d − 2), la față la d = 4.
  pune({
    id: 'profil-h(r)', descriere: 'sculă de profil (fund 4 mm, pereți la 45°) la −2: lățime 4 jos, 8 sus', grila: G6040,
    zProgramat: -2, scula: PROF, mutari: [linie([10, 20, -2], [50, 20, -2])],
    hartie: (x, y) => {
      const d = dSant(x, y);
      return d <= 5 ? Math.min(0, -2 + Math.max(0, d - 2)) : 0;
    },
  });

  // 12. Trăsătura de 0,01 mm: V60 la −0,01 pe grila de 0,002 mm; z = −0,01 + √3·d, la față la d = 0,00577.
  pune({
    id: 'mic-0.01', descriere: 'trăsătură V60 de 0,01 mm adâncime, celula 0,002 mm', grila: { x0: 0, y0: 0, latime: 2, inaltime: 1, celula: 0.002 },
    zProgramat: -0.01, scula: V60, mutari: [linie([0.2, 0.5, -0.01], [1.8, 0.5, -0.01])],
    hartie: (x, y) => Math.min(0, -0.01 + SQRT3 * dSeg(x, y, 0.2, 0.5, 1.8, 0.5)),
  });

  // 13. Placa întreagă 2440×1220 la 0,25 mm: linie de 2430 mm la y = 1000 și arcul r = 1000 din (1220, −400) de la 60°
  //     la 120°, plat la −3; hârtia pe 5 ferestre (capetele și mijlocul liniei, vârful arcului, capătul arcului).
  {
    const [sx, sy] = pol(1220, -400, 1000, 60), [ex, ey] = pol(1220, -400, 1000, 120);
    const dM = (x: number, y: number): number => Math.min(dSeg(x, y, 5, 1000, 2435, 1000), dArc(x, y, 1220, -400, 1000, 60, 120));
    pune({
      id: 'mare-2440', descriere: 'placa 2440×1220 la 0,25 mm: linie de 2430 mm și arc cu r 1000, pe ferestre',
      grila: { x0: 0, y0: 0, latime: 2440, inaltime: 1220, celula: 0.25 }, zProgramat: -3, scula: FLAT6,
      mutari: [linie([5, 1000, -3], [2435, 1000, -3]), arc('trigonometric', [sx, sy, -3], [ex, ey, -3], [1220, -400])],
      hartie: (x, y) => plata(dM(x, y), -3),
      muchie: (x, y) => Math.abs(dM(x, y) - 3),
      ferestre: [[0, 980, 30, 1020], [1200, 980, 1240, 1020], [2410, 980, 2440, 1020], [1200, 580, 1240, 620], [700, 480, 760, 540]],
    });
  }

  // 14. Linie + arc tangent (r 10 din (40, 20), de la −90° la 0°) + linie: colțul rotunjit, fără cocoașă la joncțiuni.
  {
    const dT = (x: number, y: number): number =>
      Math.min(dSeg(x, y, 10, 10, 40, 10), dArc(x, y, 40, 20, 10, -90, 0), dSeg(x, y, 50, 20, 50, 50));
    pune({
      id: 'tangent', descriere: 'linie + arc tangent + linie: fără cocoașă la joncțiuni', grila: G6060, zProgramat: -3, scula: FLAT6,
      mutari: [linie([10, 10, -3], [40, 10, -3]), arc('trigonometric', [40, 10, -3], [50, 20, -3], [40, 20]), linie([50, 20, -3], [50, 50, -3])],
      hartie: (x, y) => plata(dT(x, y), -3),
      muchie: (x, y) => Math.abs(dT(x, y) - 3),
    });
  }

  // 15. Două șanțuri la 6,001 mm (y = 15 și y = 21,001): creasta de 0,001 mm dintre ele (18 ≤ y ≤ 18,001) nu conține
  //     niciun centru de celulă (centrele sunt la 17,975 și 18,025), deci pe grilă cele două se unesc.
  {
    const dD = (x: number, y: number): number => Math.min(dSeg(x, y, 10, 15, 50, 15), dSeg(x, y, 10, 21.001, 50, 21.001));
    pune({
      id: 'aproape-coincident', descriere: 'două șanțuri la 6,001 mm: creasta de 0,001 mm nu conține niciun centru de celulă',
      grila: G6040, zProgramat: -3, scula: FLAT6,
      mutari: [linie([10, 15, -3], [50, 15, -3]), linie([10, 21.001, -3], [50, 21.001, -3])],
      hartie: (x, y) => plata(dD(x, y), -3),
      muchie: (x, y) => Math.abs(dD(x, y) - 3),
    });
  }

  // 16. Elicea plată: o tură G3 din (30, 20) în jurul lui (20, 20), r 10, z de la 0 la −2 liniar cu unghiul.
  pune({
    id: 'elice', descriere: 'elice plată: o tură G3 cu Z de la 0 la −2, pe arcul adevărat (hârtie adăugată față de s4)',
    grila: G4040, zProgramat: -2, scula: FLAT6, mutari: [arc('trigonometric', [30, 20, 0], [30, 20, -2], [20, 20])],
    hartie: (x, y) => elicePlata(x, y, 'ultim'),
    muchie: (x, y) => {
      const r = Math.hypot(x - 20, y - 20);
      return Math.min(Math.abs(r - 7), Math.abs(r - 13), Math.abs(Math.hypot(x - 30, y - 20) - 3));
    },
  });

  // 17. Gravura V60 la −0,5 pe două polilinii din segmente scurte (înlocuiește literele din s4): z = −0,5 + √3·d, d =
  //     distanța la reuniunea segmentelor (V-ul la Z constant mătură exact distanța), la față la d = 0,2887.
  {
    const polilinii = [ROZA, ZIMTI];
    const mutari: MutareCaz[] = [];
    for (const p of polilinii) {
      for (let k = 0; k + 1 < p.length; k++) {
        const a = p[k]!, b = p[k + 1]!;
        mutari.push(linie([a[0], a[1], -0.5], [b[0], b[1], -0.5]));
      }
    }
    const d = distantaLaPolilinii(polilinii, 0.3);
    pune({
      id: 'gravura-v60', descriere: `gravură V60 la −0,5 pe ${mutari.length} de segmente scurte (o roză închisă și un zimț cu colțuri ascuțite)`,
      grila: { x0: 0, y0: 0, latime: 70, inaltime: 50, celula: 0.05 }, zProgramat: -0.5, scula: V60, mutari,
      hartie: (x, y) => Math.min(0, -0.5 + SQRT3 * d(x, y)),
    });
  }

  // Piesele doar cu oracol.
  pune({
    id: 'rampa-bila', descriere: 'rampă cu bila, 0 → −3, oblică în XY', grila: G6040, zProgramat: -3, scula: BALL6,
    mutari: [linie([10, 20, 0], [40, 25, -3])],
  });
  pune({
    id: 'rampa-v90', descriere: 'două rampe V90 legate: −0,5 → −3 → −1', grila: G6040, zProgramat: -3, scula: V90,
    mutari: [linie([10, 20, -0.5], [40, 22, -3]), linie([40, 22, -3], [45, 30, -1])],
  });
  pune({
    id: 'profil-rampa', descriere: 'sculă de profil pe rampă, 0 → −2,5', grila: G6040, zProgramat: -2.5, scula: PROF,
    mutari: [linie([10, 20, 0], [40, 22, -2.5])],
    abatereDeclarata: {
      maiSusMax: 0.00094,
      motiv: 's4: nucleul a făcut profilul pe rampă cu ștampile la pas de celula/4 și a ieșit mai sus cu cel mult 0,94 µm pe 35 437 de celule; PLAN cere formula exactă (sumă de trunchiuri de con)',
    },
  });
  pune({
    id: 'dublat', descriere: 'șanțul plat dus și întors: aceeași materie ca șanțul simplu', grila: G6040, zProgramat: -3, scula: FLAT6,
    mutari: [linie([10, 20, -3], [50, 20, -3]), linie([50, 20, -3], [10, 20, -3])],
    identicCu: 'sant-plat',
  });
  return C;
}

// ---------------------------------------------------------------------------------------------------------------
// Elicea pe hârtie și polilinia gravurii.

/**
 * Elicea plată pe hârtie. Centrul (20, 20), raza 10, startul la unghiul 0 ((30, 20)), o tură trigonometrică
 * θ ∈ [0, 2π], z = −2·θ/(2π); freza R = 3. Celula, în polare (ρ, φ) față de centru, e acoperită la unghiul θ ⟺
 * ρ² + 10² − 2·10·ρ·cos(θ − φ) ≤ 3² ⟺ cos(θ − φ) ≥ κ = (ρ² + 91)/(20ρ) (legea cosinusului). Dacă κ > 1 (ρ < 7 sau
 * ρ > 13), niciodată. Altfel, cu a = acos κ, mulțimea e [φ − a, φ + a] + 2πk. Z scade cu θ, deci cel mai jos e la
 * ULTIMUL θ acoperit: dacă θ = 2π (≡ 0) e acoperit, adică cos φ ≥ κ, atunci θ = 2π și z = −2; altfel intervalul stă
 * întreg în (0, 2π) și θ = φ + a. Otrava „elicea plată ia capătul greșit” ia PRIMUL θ: 0 dacă cos φ ≥ κ, altfel φ − a.
 * Pereții: ρ = 7, ρ = 13 și marginea discului final (centrul (30, 20), raza 3), unde ultimul θ sare la 2π.
 */
export function elicePlata(x: number, y: number, capat: 'ultim' | 'prim'): number {
  const rho = Math.hypot(x - 20, y - 20);
  if (rho === 0) return 0;
  const kappa = (rho * rho + 91) / (20 * rho);
  if (kappa > 1) return 0;
  let phi = Math.atan2(y - 20, x - 20);
  if (phi < 0) phi += 2 * Math.PI;
  const a = Math.acos(Math.max(-1, kappa));
  const capete = Math.cos(phi) >= kappa;
  const theta = capat === 'ultim' ? (capete ? 2 * Math.PI : phi + a) : (capete ? 0 : phi - a);
  return Math.min(0, (-2 * theta) / (2 * Math.PI));
}

/** Roza r(θ) = 14 + 6·cos 5θ din (35, 25), închisă, în 1600 de segmente (0,03–0,08 mm). */
const ROZA: readonly P2[] = (() => {
  const N = 1600;
  const p: P2[] = [];
  for (let k = 0; k < N; k++) {
    const t = (2 * Math.PI * k) / N, r = 14 + 6 * Math.cos(5 * t);
    p.push([35 + r * Math.cos(t), 25 + r * Math.sin(t)]);
  }
  p.push(p[0]!);
  return p;
})();

/** Zimțul: 40 de segmente de 3,35 mm între y = 1 și y = 4, cu colțuri de 28°. */
const ZIMTI: readonly P2[] = Array.from({ length: 41 }, (_, k): P2 => [4 + 1.5 * k, k % 2 === 0 ? 1 : 4]);

/**
 * Distanța de la (x, y) la reuniunea segmentelor poliliniilor, exactă până la `raza` (dincolo: o valoare > raza sau
 * Infinity). Segmentele sunt puse în găleți de 1 mm după dreptunghiul lor lărgit cu `raza`, deci orice segment aflat
 * la cel mult `raza` de (x, y) e în găleata lui (x, y).
 */
function distantaLaPolilinii(polilinii: readonly (readonly P2[])[], raza: number): (x: number, y: number) => number {
  const seg: (readonly [number, number, number, number])[] = [];
  for (const p of polilinii) for (let k = 0; k + 1 < p.length; k++) seg.push([p[k]![0], p[k]![1], p[k + 1]![0], p[k + 1]![1]]);
  const galeti = new Map<string, number[]>();
  seg.forEach(([ax, ay, bx, by], idx) => {
    for (let gi = Math.floor(Math.min(ax, bx) - raza); gi <= Math.floor(Math.max(ax, bx) + raza); gi++) {
      for (let gj = Math.floor(Math.min(ay, by) - raza); gj <= Math.floor(Math.max(ay, by) + raza); gj++) {
        const cheie = `${gi},${gj}`;
        const g = galeti.get(cheie);
        if (g) g.push(idx);
        else galeti.set(cheie, [idx]);
      }
    }
  });
  return (x, y) => {
    let d = Infinity;
    for (const idx of galeti.get(`${Math.floor(x)},${Math.floor(y)}`) ?? []) {
      const [ax, ay, bx, by] = seg[idx]!;
      d = Math.min(d, dSeg(x, y, ax, ay, bx, by));
    }
    return d;
  };
}

export const CAZURI_SIMULARE: readonly CazSimulare[] = cazuri();

export function cazul(id: string): CazSimulare {
  const c = CAZURI_SIMULARE.find((k) => k.id === id);
  if (!c) throw new Error(`cazul ${id} nu există`);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Martorii greșiți: cele 7 otrăvuri din s4, ca valori pe hârtie stricate.

/** Verificările care pot prinde un martor: hârtia (±1e-5), `compara` (maiSus / maiJosPesteMarja), secțiunea, unghiul. */
export type Verificare = 'hartie' | 'maiSus' | 'maiJos' | 'sectiune' | 'unghiV';

export type MartorGresit = {
  /** Numele otrăvii din `poisons.mjs`. */
  readonly nume: string;
  readonly explicatie: string;
  /** Cazul pe a cărui grilă (și oracol) se judecă. */
  readonly caz: string;
  /** Valoarea stricată pe celula (i, j), cu centrul (x, y). */
  readonly valoare: (x: number, y: number, i: number, j: number) => number;
  /** Fiecare dintre ele TREBUIE să pice. */
  readonly prinsDe: readonly Verificare[];
};

function martori(): MartorGresit[] {
  const M: MartorGresit[] = [];
  const hartie = (id: string): ((x: number, y: number) => number) => {
    const h = cazul(id).hartie;
    if (!h) throw new Error(`cazul ${id} n-are hârtie`);
    return h;
  };

  // 1. arc-baleiaj-sau: testul „celula e în deschiderea arcului” cu produse vectoriale, cross(u0, v) ≥ 0 ȘI
  //    cross(v, u1) ≥ 0 (arc ≤ 180°), scris cu SAU: deschiderea crește de la 90° la 270°, deci se taie și inelul din
  //    afara arcului.
  const arcSau = (x: number, y: number, cx: number, cy: number, r: number, a0: number, a1: number): number => {
    const vx = x - cx, vy = y - cy;
    const u0 = [Math.cos((a0 * Math.PI) / 180), Math.sin((a0 * Math.PI) / 180)] as const;
    const u1 = [Math.cos((a1 * Math.PI) / 180), Math.sin((a1 * Math.PI) / 180)] as const;
    const inDeschidere = u0[0] * vy - u0[1] * vx >= 0 || vx * u1[1] - vy * u1[0] >= 0;
    if (inDeschidere) return Math.abs(Math.hypot(vx, vy) - r);
    const [e0x, e0y] = pol(cx, cy, r, a0), [e1x, e1y] = pol(cx, cy, r, a1);
    return Math.min(Math.hypot(x - e0x, y - e0y), Math.hypot(x - e1x, y - e1y));
  };
  const explArc = 'testul de baleiaj al arcului cu „sau” în loc de „și”: se taie și inelul din afara deschiderii arcului';
  M.push({ nume: 'arc-baleiaj-sau', caz: 'arc-g3', explicatie: explArc, prinsDe: ['hartie', 'maiJos'], valoare: (x, y) => plata(arcSau(x, y, 40, 40, 25, 30, 120), -3) });
  M.push({
    nume: 'arc-baleiaj-sau', caz: 'tangent', explicatie: explArc, prinsDe: ['hartie', 'maiJos'],
    valoare: (x, y) => plata(Math.min(dSeg(x, y, 10, 10, 40, 10), arcSau(x, y, 40, 20, 10, -90, 0), dSeg(x, y, 50, 20, 50, 50)), -3),
  });

  // 2. v-tan-in-loc-de-cot: panta V-ului tan(α/2) în loc de 1/tan(α/2). La V90 sunt egale (de aceea V60); la V60,
  //    tan 30° = 0,577 în loc de 1,732: pereți mai culcați, șanț mai lat, unghiul 120°.
  const explV = 'V-ul cu tan(α/2) în loc de 1/tan(α/2): pereți de 120° în loc de 60°, șanțul prea lat';
  M.push({ nume: 'v-tan-in-loc-de-cot', caz: 'sant-v60', explicatie: explV, prinsDe: ['hartie', 'maiJos', 'unghiV'], valoare: (x, y) => Math.min(0, -1.5 + Math.tan(Math.PI / 6) * dSeg(x, y, 10, 20, 50, 20)) });
  M.push({ nume: 'v-tan-in-loc-de-cot', caz: 'mic-0.01', explicatie: explV, prinsDe: ['hartie', 'maiJos'], valoare: (x, y) => Math.min(0, -0.01 + Math.tan(Math.PI / 6) * dSeg(x, y, 0.2, 0.5, 1.8, 0.5)) });

  // 3. rampa-capat-gresit: rampa plată ia capătul de SUS al intervalului acoperit (ta), nu pe cel de jos (tb).
  M.push({
    nume: 'rampa-capat-gresit', caz: 'rampa-plata', prinsDe: ['hartie', 'maiSus'],
    explicatie: 'rampa plată ia capătul greșit al intervalului acoperit: fundul rămâne mai sus, material netăiat',
    valoare: (x, y) => {
      const e = y - 20;
      if (Math.abs(e) > 3) return 0;
      const w = Math.sqrt(9 - e * e);
      const ta = Math.max(0, (x - 10 - w) / 30), tb = Math.min(1, (x - 10 + w) / 30);
      return ta > tb ? 0 : Math.min(0, -3 * ta);
    },
  });

  // 4. bila-fara-patrat: R² − d în loc de R² − d²: mai sus pentru d < 1, mai jos pentru d > 1, perete la d = 3.
  const explBila = 'bila cu √(R² − d) în loc de √(R² − d²): secțiunea nu mai e cerc';
  M.push({
    nume: 'bila-fara-patrat', caz: 'sant-bila', explicatie: explBila, prinsDe: ['hartie', 'maiSus', 'maiJos', 'sectiune'],
    valoare: (x, y) => { const d = dSeg(x, y, 10, 20, 50, 20); return d <= 3 ? Math.min(0, 1 - Math.sqrt(9 - d)) : 0; },
  });
  M.push({
    nume: 'bila-fara-patrat', caz: 'plonjare-bila', explicatie: explBila, prinsDe: ['hartie', 'maiSus', 'maiJos'],
    valoare: (x, y) => { const r = Math.hypot(x - 20, y - 20); return r <= 3 ? -1 - Math.sqrt(9 - r) : 0; },
  });

  // 5. centrul-celulei: centrul celulei în x la x0 + i·celula în loc de x0 + (i + 0,5)·celula (ca în otravă, doar
  //    pe x): tot câmpul se mută cu o jumătate de celulă.
  for (const id of ['sant-plat', 'sant-v90', 'arc-g3']) {
    const c = cazul(id), h = hartie(id);
    M.push({
      nume: 'centrul-celulei', caz: id, prinsDe: id === 'sant-v90' ? ['hartie', 'maiSus', 'maiJos'] : ['hartie', 'maiSus'],
      explicatie: 'centrul celulei la i în loc de i + 0,5: câmpul mutat cu o jumătate de celulă în x',
      valoare: (_x, y, i) => h(c.grila.x0 + i * c.grila.celula, y),
    });
  }

  // 6. span-fara-ax: intervalul de coloane al unui rând calculat relativ la startul segmentului (ax = 10) și folosit
  //    fără „+ ax”: pe fiecare rând se vizitează [10 − w, 50 + w] − 10 = [−w, 40 + w]; celulele de după 40 + w rămân
  //    netăiate (otrava reală din timpul sondei).
  for (const [id, f] of [
    ['sant-plat', (d: number) => plata(d, -3)],
    ['sant-v60', (d: number) => Math.min(0, -1.5 + SQRT3 * d)],
  ] as const) {
    M.push({
      nume: 'span-fara-ax', caz: id, prinsDe: ['hartie', 'maiSus'],
      explicatie: 'intervalul pe rând fără deplasarea „+ax”: rândul e vizitat cu 10 mm mai la stânga, capătul din dreapta rămâne netăiat',
      valoare: (x, y) => {
        const e = y - 20;
        if (Math.abs(e) > 3) return 0;
        const w = Math.sqrt(9 - e * e);
        return x >= -w && x <= 40 + w ? f(dSeg(x, y, 10, 20, 50, 20)) : 0;
      },
    });
  }

  // 7. elice-z-invers: elicea plată ia capătul greșit (primul unghi acoperit, cel mai sus), calculul brut din
  //    `elicePlata`.
  M.push({
    nume: 'elice-z-invers', caz: 'elice', prinsDe: ['hartie', 'maiSus'],
    explicatie: 'elicea plată ia capătul greșit al intervalului de unghiuri: primul trecaj (cel mai sus) în loc de ultimul',
    valoare: (x, y) => elicePlata(x, y, 'prim'),
  });
  return M;
}

export const MARTORI_GRESITI: readonly MartorGresit[] = martori();
