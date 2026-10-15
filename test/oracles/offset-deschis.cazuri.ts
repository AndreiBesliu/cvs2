/**
 * Cazurile oracolului offsetului deschis (ADR 0037 §5 și „Ce verifică oracolul”, al treilea punct), cu ZERO importuri din
 * `src/`:
 * - `HARTIE`: valorile pe hârtie 1 și 3–9, la nivel de geometrie (fără G-code): bucățile așteptate, vârf cu vârf, și
 *   porțiunile neatinse; sensul de tăiere e al CAM-ului (2.3c-5), deci aici bucățile merg în sensul desenului;
 * - `CORPUS`: căile deschise valide (linii, arce, arce de peste 180°, L-uri și lanțuri cu colțuri convexe și concave,
 *   cârlige, U-uri, V-uri înguste, zig-zag-uri, polilinii fine, joncțiuni aproape tangente de biarce, canalul cu
 *   strangulare, camera, intrări murdare), fiecare pe ambele părți și cu 3 raze;
 * - `REFUZATE`: intrările pe care contractul le refuză (atingerile, capetele în același punct, degeneratele, distanțele);
 * - `MARTORI`: ieșiri GREȘITE pe care oracolul (și verificarea aplicației) trebuie să le respingă, și `CONTROALE`: ieșiri
 *   corecte pe care trebuie să le primească.
 */
import {
  MOTIV_INCRUCISARE, MOTIV_NU_INCAPE, idealDeschis, traseuIdeal,
  type ConturD, type PortiuneD, type PunctD, type RezultatD, type SegmentD, type VarfD,
} from './offset-deschis.ts';

const RAD = Math.PI / 180;
const el = <T>(xs: readonly T[], i: number): T => xs[i] as T;

/** O cale deschisă din vârfuri [x, y] sau [x, y, bulge] (bulge-ul segmentului care pleacă din vârf). */
export function cale(...puncte: ReadonlyArray<readonly [number, number] | readonly [number, number, number]>): ConturD {
  return {
    inchis: false,
    varfuri: puncte.map((p, i): VarfD => {
      const b = p[2];
      const s: SegmentD = b !== undefined && b !== 0 && i < puncte.length - 1 ? { tip: 'A', bulge: b } : { tip: 'L' };
      return { p: { x: p[0], y: p[1] }, s };
    }),
  };
}

const polar = (r: number, grade: number, cx = 0, cy = 0): PunctD => ({ x: cx + r * Math.cos(grade * RAD), y: cy + r * Math.sin(grade * RAD) });

/** Vârfurile unui arc de cerc de la unghiul a0 la a1 (grade, baleiajul cu semn a1 − a0), ca un singur segment. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): Array<readonly [number, number, number] | readonly [number, number]> {
  const p = polar(r, a0, cx, cy);
  const q = polar(r, a1, cx, cy);
  return [[p.x, p.y, Math.tan(((a1 - a0) * RAD) / 4)], [q.x, q.y]];
}

/** Polilinia fină pe un arc: coardele cât mai aproape de `coarda`, egale. */
function poliliniePeArc(cx: number, cy: number, r: number, a0: number, a1: number, coarda: number): Array<readonly [number, number]> {
  const n = Math.max(1, Math.round((Math.abs(a1 - a0) * RAD * r) / coarda));
  const rez: Array<readonly [number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const p = polar(r, a0 + ((a1 - a0) * i) / n, cx, cy);
    rez.push([p.x, p.y]);
  }
  return rez;
}

/** Arcul care pleacă din p cu direcția `dir` (grade), raza r și baleiajul `sw` (grade, + = spre stânga). */
function arcDinTangenta(p: PunctD, dir: number, r: number, sw: number): { readonly v: readonly [number, number, number]; readonly fin: PunctD; readonly dirFin: number } {
  const sg = sw > 0 ? 1 : -1;
  const c = polar(r, dir + sg * 90, p.x, p.y);
  const a0 = Math.atan2(p.y - c.y, p.x - c.x) / RAD;
  return { v: [p.x, p.y, Math.tan((sw * RAD) / 4)], fin: polar(r, a0 + sw, c.x, c.y), dirFin: dir + sw };
}

/** Două arce legate cu o abatere de tangență `eps` (radiani): r1 / sw1, apoi r2 / sw2 (grade). */
function biarc(r1: number, sw1: number, r2: number, sw2: number, eps: number): ConturD {
  const a = arcDinTangenta({ x: 0, y: 0 }, 0, r1, sw1);
  const b = arcDinTangenta(a.fin, a.dirFin + eps / RAD, r2, sw2);
  return cale(a.v, b.v, [b.fin.x, b.fin.y]);
}

/** Zig-zag: n segmente cu pasul p (dus-întors pe x = p) și amplitudinea h. */
function zigzag(n: number, p: number, h: number): ConturD {
  const v: Array<readonly [number, number]> = [];
  for (let i = 0; i <= n; i++) v.push([(i * p) / 2, i % 2 === 0 ? 0 : h]);
  return cale(...v);
}

/** V cu deschiderea `grade`, cu brațele de lungime `l`, vârful în origine, bisectoarea pe +x; scula înăuntru = stânga. */
function vul(grade: number, l: number): ConturD {
  const a = polar(l, grade / 2);
  const b = polar(l, -grade / 2);
  return cale([a.x, a.y], [0, 0], [b.x, b.y]);
}

/**
 * Canalul cu strangulare: doi pereți la x = ±1 (gura de 2 mm, mai îngustă decât D), apoi camera, un arc de ~349° în jurul
 * lui (0, 10), orar. Scula înăuntru (dreapta mersului) ocolește camera și se întoarce în start: bucata are capătul în start.
 */
export function strangulare(): ConturD {
  const a0 = Math.atan2(-10, -1);
  const a1 = Math.atan2(-10, 1);
  const sw = -(2 * Math.PI - (a1 - a0));
  return cale([-1, -20], [-1, 0, Math.tan(sw / 4)], [1, 0], [1, -20]);
}

/**
 * D-ul: o linie și un arc de 170° (R20) care se întoarce aproape de start; scula înăuntru (stânga) dă o bucată închisă din
 * DOUĂ segmente: offsetul liniei și al arcului, care se taie în două puncte.
 */
export const D_UL = ((): ConturD => {
  const q = polar(20, 170);
  return cale([-20, 0], [20, 0, Math.tan((170 * RAD) / 4)], [q.x, q.y]);
})();

/** Camera: o cameră de 50 × 20, cu gura de 2 mm în colțul din stânga-jos; scula înăuntru (stânga) dă două bucăți. */
export const CAMERA = cale([0, 0], [100, 0], [100, 20], [50, 20], [50, 2]);

// ---------------------------------------------------------------------------------------------------------------------
// Valorile pe hârtie (ADR 0037, „Valorile pe hârtie”, 1 și 3–9), la nivel de geometrie.
// ---------------------------------------------------------------------------------------------------------------------

/** Un vârf așteptat: poziția și bulge-ul segmentului care pleacă din el (0 = linie). */
export type VarfAsteptat = { readonly x: number; readonly y: number; readonly bulge: number };

export type Asteptare =
  | { readonly fel: 'bucati'; readonly bucati: readonly (readonly VarfAsteptat[])[]; readonly neatins: readonly { readonly de: number; readonly pana: number }[] }
  | { readonly fel: 'refuz'; readonly motiv: string }
  | { readonly fel: 'corect-sau-esuat'; readonly lungimeIdeala: number; readonly bucati: number };

export type CazHartie = { readonly nume: string; readonly cale: ConturD; readonly d: number; readonly asteptat: Asteptare };

/** Toleranța valorilor pe hârtie: sunt scrise cu 3 zecimale. */
export const TOLERANTA_HARTIE = 1e-3;

const v = (x: number, y: number, bulge = 0): VarfAsteptat => ({ x, y, bulge });
const SFERT = Math.tan(Math.PI / 8);

/** Matricea elementului (a, b, c, d, e, f): x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrice = readonly [number, number, number, number, number, number];

export function aplicaMatricea(c: ConturD, m: Matrice): ConturD {
  const [a, b, cc, d, e, f] = m;
  const det = a * d - b * cc;
  return {
    inchis: c.inchis,
    // O oglindire inversează sensul arcelor: bulge-ul își schimbă semnul.
    varfuri: c.varfuri.map((x) => ({
      p: { x: a * x.p.x + cc * x.p.y + e, y: b * x.p.x + d * x.p.y + f },
      s: x.s.tip === 'A' && det < 0 ? { tip: 'A', bulge: -x.s.bulge } : x.s,
    })),
  };
}

/** Partea în lume (ADR 0037 §3): parteaLume = latura XOR (det < 0); d > 0 = stânga. */
export function distantaInLume(latura: 'stanga' | 'dreapta', m: Matrice, R: number): number {
  const det = el(m, 0) * el(m, 3) - el(m, 1) * el(m, 2);
  const stanga = (latura === 'stanga') !== det < 0;
  return stanga ? R : -R;
}

const OGLINDA: Matrice = [-1, 0, 0, 1, 150, 50];
const V10 = vul(10, 100);

export const HARTIE: readonly CazHartie[] = [
  { nume: '1. linia (10,50)→(110,50), stânga', cale: cale([10, 50], [110, 50]), d: 3, asteptat: { fel: 'bucati', bucati: [[v(10, 53), v(110, 53)]], neatins: [] } },
  { nume: '1. linia (10,50)→(110,50), dreapta', cale: cale([10, 50], [110, 50]), d: -3, asteptat: { fel: 'bucati', bucati: [[v(10, 47), v(110, 47)]], neatins: [] } },
  { nume: '3. semicercul R50, stânga', cale: cale([50, 0, 1], [-50, 0]), d: 3, asteptat: { fel: 'bucati', bucati: [[v(47, 0, 1), v(-47, 0)]], neatins: [] } },
  { nume: '3. semicercul R50, dreapta', cale: cale([50, 0, 1], [-50, 0]), d: -3, asteptat: { fel: 'bucati', bucati: [[v(53, 0, 1), v(-53, 0)]], neatins: [] } },
  {
    nume: '4. L-ul, dreapta (colțul convex ca arc R3)', cale: cale([0, 0], [100, 0], [100, 100]), d: -3,
    asteptat: { fel: 'bucati', bucati: [[v(0, -3), v(100, -3, SFERT), v(103, 0), v(103, 100)]], neatins: [] },
  },
  {
    nume: '4. L-ul, stânga (colțul concav)', cale: cale([0, 0], [100, 0], [100, 100]), d: 3,
    asteptat: { fel: 'bucati', bucati: [[v(0, 3), v(97, 3), v(97, 100)]], neatins: [{ de: 97, pana: 103 }] },
  },
  {
    nume: '5. cârligul, stânga', cale: cale([0, 0], [50, 0], [50, 2], [45, 2]), d: 3,
    asteptat: { fel: 'bucati', bucati: [[v(0, 3), v(42.172, 3)]], neatins: [{ de: 42.172, pana: 57 }] },
  },
  { nume: '6. U-ul de 5 mm, stânga (scula înăuntru)', cale: cale([0, 50], [0, 0], [5, 0], [5, 50]), d: 3, asteptat: { fel: 'refuz', motiv: MOTIV_NU_INCAPE } },
  {
    nume: '6. U-ul de 5 mm, dreapta (6 vârfuri, colțurile ca arce R3)', cale: cale([0, 50], [0, 0], [5, 0], [5, 50]), d: -3,
    asteptat: { fel: 'bucati', bucati: [[v(-3, 50), v(-3, 0, SFERT), v(0, -3), v(5, -3, SFERT), v(8, 0), v(8, 50)]], neatins: [] },
  },
  {
    nume: '7. V-ul de 10°, scula înăuntru', cale: V10, d: 3,
    asteptat: {
      fel: 'bucati',
      bucati: [[
        v(el(V10.varfuri, 0).p.x + 3 * Math.sin(5 * RAD), el(V10.varfuri, 0).p.y - 3 * Math.cos(5 * RAD)),
        v(34.421, 0),
        v(el(V10.varfuri, 2).p.x + 3 * Math.sin(5 * RAD), el(V10.varfuri, 2).p.y + 3 * Math.cos(5 * RAD)),
      ]],
      neatins: [{ de: 100 - 34.29, pana: 100 + 34.29 }],
    },
  },
  {
    nume: '8. arcul R5 de 300°, din coarde de 0,02 mm, decalat 1,5 mm spre exterior', cale: cale(...poliliniePeArc(0, 0, 5, 0, 300, 0.02)), d: -1.5,
    asteptat: { fel: 'corect-sau-esuat', lungimeIdeala: 34.03, bucati: 1 },
  },
  {
    nume: '9. oglindirea (a = −1, e = 150, f = 50), linia (0,0)→(100,0), stânga', cale: aplicaMatricea(cale([0, 0], [100, 0]), OGLINDA), d: distantaInLume('stanga', OGLINDA, 3),
    asteptat: { fel: 'bucati', bucati: [[v(150, 53), v(50, 53)]], neatins: [] },
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// Corpusul: căi valide, pe ambele părți, cu 3 raze.
// ---------------------------------------------------------------------------------------------------------------------

export const RAZE = [1.5875, 3, 6.35] as const;
export const AMBELE: readonly number[] = RAZE.flatMap((r) => [r, -r]);

export type CazCorpus = { readonly nume: string; readonly familie: string; readonly cale: ConturD; readonly distante: readonly number[] };

const caz = (familie: string, nume: string, c: ConturD, distante: readonly number[] = AMBELE): CazCorpus => ({ nume, familie, cale: c, distante });

const sinus = (): ConturD => {
  const v: Array<readonly [number, number]> = [];
  for (let i = 0; i <= 2000; i++) {
    const x = i * 0.02;
    v.push([x, Math.sin((2 * Math.PI * x) / 20)]);
  }
  return cale(...v);
};

/** Generator determinist (mulberry32), ca să fie corpusul același la fiecare rulare. */
function aleator(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * O cale aleatoare, monotonă pe x (deci fără atingeri): n segmente cu lungimi între 1 și 15 mm, direcții între −70° și
 * 70°; cam 40 % din segmente sunt arce cu |bulge| ≤ 0,4.
 */
function caleAleatoare(samanta: number, n: number): ConturD {
  const r = aleator(samanta);
  const v: Array<readonly [number, number, number]> = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const l = 1 + 14 * r();
    const a = (-70 + 140 * r()) * RAD;
    const b = r() < 0.4 ? -0.4 + 0.8 * r() : 0;
    v.push([x, y, b]);
    x += l * Math.cos(a);
    y += l * Math.sin(a);
  }
  return cale(...v, [x, y]);
}

/** Pieptenele: U-uri legate, cu lățimile date, adânci de 20 mm, la 4 mm unul de altul. */
function pieptene(latimi: readonly number[]): ConturD {
  const v: Array<readonly [number, number]> = [];
  let x = 0;
  for (const w of latimi) {
    v.push([x, 20], [x, 0], [x + w, 0], [x + w, 20]);
    x += w + 4;
  }
  return cale(...v);
}

export const CORPUS: readonly CazCorpus[] = [
  caz('linii', 'linia orizontală (10,50)→(110,50)', cale([10, 50], [110, 50])),
  caz('linii', 'linia diagonală', cale([0, 0], [70, 70])),
  caz('linii', 'linia verticală, în jos', cale([5, 40], [5, -60])),
  caz('linii', 'linia scurtă de 0,02 mm', cale([1, 1], [1.02, 1])),
  caz('linii', 'linia de 0,011 mm (peste rezoluție)', cale([0, 0], [0.011, 0])),
  caz('linii', 'linia lungă de 2000 mm', cale([-1000, 3], [1000, 3])),

  caz('arce', 'sfertul R5, trigonometric', cale(...arc(0, 0, 5, 0, 90))),
  caz('arce', 'sfertul R20, orar', cale(...arc(10, 10, 20, 90, 0))),
  caz('arce', 'semicercul R50 (hârtia, 3)', cale([50, 0, 1], [-50, 0])),
  caz('arce', 'arcul R1 de 90° (scula nu încape înăuntru)', cale(...arc(0, 0, 1, 0, 90))),
  caz('arce', 'arcul R2 de 120°, orar', cale(...arc(0, 0, 2, 120, 0))),
  caz('arce', 'arcul R10 de 30°', cale(...arc(0, 0, 10, 10, 40))),
  caz('arce', 'arcul R3 de 90° (raza exact |d| la R3)', cale(...arc(0, 0, 3, 0, 90))),
  caz('arce', 'arcul R3,1 de 120° (offsetul spre centru de 0,1)', cale(...arc(0, 0, 3.1, 0, 120))),
  caz('arce', 'arcul R6,4 de 100°, orar', cale(...arc(0, 0, 6.4, 100, 0))),
  caz('arce', 'arcul R1,6 de 150°', cale(...arc(0, 0, 1.6, 30, 180))),

  caz('arce-mari', 'arcul R10 de 200°', cale(...arc(0, 0, 10, -100, 100))),
  caz('arce-mari', 'arcul R10 de 270°, orar', cale(...arc(0, 0, 10, 0, -270))),
  caz('arce-mari', 'arcul R5 de 300°', cale(...arc(0, 0, 5, 0, 300))),
  caz('arce-mari', 'arcul R20 de 350°', cale(...arc(0, 0, 20, 5, 355))),
  caz('arce-mari', 'arcul R10 de 359°, orar', cale(...arc(0, 0, 10, 90, -269))),

  caz('L-uri', 'L-ul de 90° (hârtia, 4)', cale([0, 0], [100, 0], [100, 100])),
  caz('L-uri', 'L-ul ascuțit (45°)', cale([0, 0], [50, 0], [50 - 50 * Math.cos(45 * RAD), 50 * Math.sin(45 * RAD)])),
  caz('L-uri', 'L-ul obtuz (135°)', cale([0, 0], [50, 0], [50 + 50 * Math.cos(45 * RAD), 50 * Math.sin(45 * RAD)])),
  caz('L-uri', 'L-ul cu colțul rotunjit (R5, tangent)', cale([0, 0], [45, 0, SFERT], [50, 5], [50, 50])),
  caz('L-uri', 'L-ul cu colțul rotunjit (R2, tangent)', cale([0, 0], [48, 0, -SFERT], [50, -2], [50, -50])),

  caz('lanturi', 'lanțul de linii cu cotituri în ambele părți', cale([0, 0], [20, 0], [30, 10], [50, 10], [60, 0], [80, 5], [90, -5], [100, -5])),
  caz('lanturi', 'lanțul cu un arc frânt (30°)', cale([0, 0], [20, 0, 0.3], [40, 0], [40 + 20 * Math.cos(30 * RAD), 20 * Math.sin(30 * RAD)])),
  caz('lanturi', 'lanțul linie, arc tangent, linie, arc invers', cale([0, 0], [20, 0, SFERT], [30, 10], [30, 20, -SFERT], [40, 30], [60, 30])),
  caz('lanturi', 'treptele (colțuri de 90° alternante)', cale([0, 0], [10, 0], [10, 10], [20, 10], [20, 20], [30, 20], [30, 30])),
  caz('lanturi', 'spirala pătrată (colțuri concave pe o parte)', cale([0, 0], [40, 0], [40, 40], [0, 40], [0, 10], [30, 10], [30, 30], [10, 30])),

  caz('carlige', 'cârligul cu gura de 2 (hârtia, 5)', cale([0, 0], [50, 0], [50, 2], [45, 2])),
  caz('carlige', 'cârligul cu gura de 1', cale([0, 0], [50, 0], [50, 1], [40, 1])),
  caz('carlige', 'cârligul cu gura de 4', cale([0, 0], [50, 0], [50, 4], [40, 4])),
  caz('carlige', 'cârligul cu gura de 8', cale([0, 0], [50, 0], [50, 8], [35, 8])),
  caz('carlige', 'cârligul cu întoarcerea în arc', cale([0, 0], [50, 0, 1], [50, 6], [40, 6])),
  caz('carlige', 'cârligul parcurs invers (startul în cârlig)', cale([45, 2], [50, 2], [50, 0], [0, 0])),
  caz('carlige', 'linia oprită la 1 mm de ea însăși', cale([0, 0], [40, 0], [40, 20], [20, 20], [20, 1])),

  caz('U-uri', 'U-ul de 5 (hârtia, 6)', cale([0, 50], [0, 0], [5, 0], [5, 50])),
  caz('U-uri', 'U-ul de 6 (exact 2R la R3)', cale([0, 50], [0, 0], [6, 0], [6, 50])),
  caz('U-uri', 'U-ul de 6,5', cale([0, 50], [0, 0], [6.5, 0], [6.5, 50])),
  caz('U-uri', 'U-ul de 10', cale([0, 50], [0, 0], [10, 0], [10, 50])),
  caz('U-uri', 'U-ul de 20', cale([0, 50], [0, 0], [20, 0], [20, 50])),
  caz('U-uri', 'U-ul de 10 cu fundul semicerc', cale([0, 50], [0, 0, 1], [10, 0], [10, 50])),
  caz('U-uri', 'U-ul de 20 cu fundul semicerc', cale([0, 50], [0, 0, 1], [20, 0], [20, 50])),
  caz('U-uri', 'pieptenele (lățimi 5,9 / 6 / 6,05 / 6,5 / 12)', pieptene([5.9, 6, 6.05, 6.5, 12])),
  caz('U-uri', 'pieptenele (lățimi 3,1 / 3,175 / 3,3 / 12,7 / 12,8)', pieptene([3.1, 3.175, 3.3, 12.7, 12.8])),

  caz('V-uri', 'V-ul de 10° (hârtia, 7)', vul(10, 100)),
  caz('V-uri', 'V-ul de 5°', vul(5, 100)),
  caz('V-uri', 'V-ul de 20°', vul(20, 60)),
  caz('V-uri', 'V-ul de 2°', vul(2, 200)),
  caz('V-uri', 'V-ul de 60°', vul(60, 40)),

  caz('zig-zag', 'zig-zag-ul des (pasul 0,5, amplitudinea 2, 200 de segmente)', zigzag(200, 0.5, 2)),
  caz('zig-zag', 'zig-zag-ul cu pasul 5 (40 de segmente)', zigzag(40, 5, 2)),
  caz('zig-zag', 'zig-zag-ul cu pasul 20 (10 segmente)', zigzag(10, 20, 10)),
  caz('zig-zag', 'zig-zag-ul plat (pasul 1, amplitudinea 0,3)', zigzag(100, 1, 0.3)),

  caz('polilinii-fine', 'arcul R5 de 300°, coarde de 0,02 (hârtia, 8)', cale(...poliliniePeArc(0, 0, 5, 0, 300, 0.02))),
  caz('polilinii-fine', 'arcul R10 de 90°, coarde de 0,01', cale(...poliliniePeArc(0, 0, 10, 0, 90, 0.01))),
  caz('polilinii-fine', 'sinusoida din segmente de 0,02 (2000 de segmente)', sinus()),

  caz('biarce', 'S-ul de biarce, tangent', biarc(10, 60, 20, -60, 0)),
  caz('biarce', 'S-ul de biarce, abaterea 1e-9', biarc(10, 60, 20, -60, 1e-9)),
  caz('biarce', 'S-ul de biarce, abaterea 1e-6', biarc(10, 60, 20, -60, 1e-6)),
  caz('biarce', 'S-ul de biarce, abaterea 1e-4', biarc(10, 60, 20, -60, 1e-4)),
  caz('biarce', 'S-ul de biarce, abaterea −1e-6', biarc(10, 60, 20, -60, -1e-6)),
  caz('biarce', 'biarcul în același sens (R10, apoi R30), abaterea 1e-7', biarc(10, 50, 30, 40, 1e-7)),
  caz('biarce', 'biarcul în același sens (R30, apoi R10), abaterea −1e-7', biarc(30, 40, 10, 50, -1e-7)),

  caz('strangulare', 'canalul cu strangulare (bucata cu capătul în start)', strangulare()),
  caz('camera', 'camera cu gura de 2 mm (două bucăți, una închisă)', CAMERA),
  caz('camera', 'D-ul (bucata închisă din două segmente)', D_UL),

  caz('murdar', 'primul segment de 1e-7 mm, în unghi drept', cale([0, 0], [0, 1e-7], [100, 1e-7])),
  caz('murdar', 'ultimul segment de 1e-7 mm, în unghi drept', cale([0, 0], [100, 0], [100, 1e-7])),
  caz('murdar', 'un segment de 5e-7 mm în interior', cale([0, 0], [50, 0], [50, 5e-7], [50, 50])),
  caz('murdar', 'un arc plat (bulge 5e-7) într-un lanț', cale([0, 0], [30, 0, 5e-7], [60, 0], [60, 30])),
  caz('murdar', 'vârfuri în plus pe o latură dreaptă', cale([0, 0], [10, 0], [20, 0], [30, 0], [30, 20])),
  caz('murdar', 'calea care se apropie de ea la 0,001 (fără s-o atingă)', cale([0, 0], [10, 0], [10, 5], [5, 5], [5, 0.001])),
  caz('murdar', 'calea care se apropie de ea la 1e-5 (fără s-o atingă)', cale([0, 0], [10, 0], [10, 5], [5, 5], [5, 1e-5])),
  caz('murdar', 'arcul care trece la 1e-4 de o linie a căii', cale([-10, -1e-4], [10, -1e-4], [15, 5], [15, 10], [10, 10, -1], [-10, 10], [-10, 20])),
  caz('murdar', 'întoarcerea tangentă (arcul pleacă lipit înapoi pe linie)', cale([-10, -1], [10, -1], [10, 10, -1], [-10, 10], [-10, 20])),

  ...[11, 23, 37, 41, 59, 61, 73, 89].map((s, i) => caz('aleatoare', `calea aleatoare ${i + 1} (sămânța ${s})`, caleAleatoare(s, 12 + 3 * i))),
];

// ---------------------------------------------------------------------------------------------------------------------
// Refuzurile: intrările de nedecalat.
// ---------------------------------------------------------------------------------------------------------------------

export type CazRefuzat = { readonly nume: string; readonly cale: ConturD; readonly d: number; readonly motivContine?: string };

const LINIA = cale([10, 50], [110, 50]);

export const REFUZATE: readonly CazRefuzat[] = [
  { nume: 'încrucișarea în X', cale: cale([0, 0], [10, 10], [10, 0], [0, 10]), d: 3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'întoarcerea pe ea însăși', cale: cale([0, 0], [10, 0], [5, 0]), d: 3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'capătul pe altă parte a căii (T)', cale: cale([0, 0], [10, 0], [10, 10], [5, 10], [5, 0]), d: -3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'capetele în același punct (triunghiul)', cale: cale([0, 0], [10, 0], [5, 8], [0, 0]), d: 3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'capetele în același punct (două semicercuri)', cale: cale([10, 0, 1], [-10, 0, 1], [10, 0]), d: -3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'capetele în același punct (pătratul)', cale: cale([0, 0], [10, 0], [10, 10], [0, 10], [0, 0]), d: 1.5875, motivContine: MOTIV_INCRUCISARE },
  { nume: 'capătul la 5e-7 mm de cale', cale: cale([0, 0], [10, 0], [10, 5], [5, 5], [5, 5e-7]), d: 3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'arcul care taie prima linie', cale: cale([0, 0], [20, 0], [20, 10, 1], [10, 10], [10, -5]), d: 3, motivContine: MOTIV_INCRUCISARE },
  { nume: 'arcul tangent la altă parte a căii', cale: cale([-10, 0], [10, 0], [10, 10, -1], [-10, 10], [-10, 20]), d: -6.35, motivContine: MOTIV_INCRUCISARE },
  { nume: 'calea închisă', cale: { inchis: true, varfuri: LINIA.varfuri }, d: 3 },
  { nume: 'o cubică', cale: { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 3, y: 5 }, c2: { x: 7, y: 5 } } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }] }, d: 3 },
  { nume: 'o coordonată nefinită', cale: cale([0, 0], [Number.NaN, 5]), d: 3 },
  { nume: 'o coordonată infinită', cale: cale([0, 0], [Number.POSITIVE_INFINITY, 5]), d: 3 },
  { nume: 'un bulge nefinit', cale: cale([0, 0, Number.NaN], [10, 0]), d: 3 },
  { nume: 'un singur vârf', cale: cale([1, 1]), d: 3 },
  { nume: 'niciun vârf', cale: { inchis: false, varfuri: [] }, d: 3 },
  { nume: 'două vârfuri identice', cale: cale([1, 1], [1, 1]), d: 3 },
  { nume: 'două vârfuri la 1e-7 mm', cale: cale([1, 1], [1 + 1e-7, 1]), d: 3 },
  { nume: 'lungimea sub 0,01 mm', cale: cale([0, 0], [0.009, 0]), d: 3 },
  { nume: 'un arc sub 0,01 mm', cale: cale([0, 0, 0.5], [0.005, 0.005]), d: 3 },
  { nume: 'd = 0', cale: LINIA, d: 0 },
  { nume: 'd = −0', cale: LINIA, d: -0 },
  { nume: 'd = 0,004', cale: LINIA, d: 0.004 },
  { nume: 'd = −0,0049', cale: LINIA, d: -0.0049 },
  { nume: 'd = NaN', cale: LINIA, d: Number.NaN },
  { nume: 'd = +∞', cale: LINIA, d: Number.POSITIVE_INFINITY },
  { nume: 'd = −∞', cale: LINIA, d: Number.NEGATIVE_INFINITY },
];

// ---------------------------------------------------------------------------------------------------------------------
// Martorii negativi (ieșiri greșite) și controalele (ieșiri corecte).
// ---------------------------------------------------------------------------------------------------------------------

export type Martor = {
  readonly nume: string;
  readonly cale: ConturD;
  readonly d: number;
  readonly rezultat: RezultatD;
  /** Se dă și verificării aplicației (`verificaIesireDeschisa`): bucățile, sau ieșirea goală la un refuz. */
  readonly laVerificare: boolean;
  /** Martorul pe care verificarea aplicației îl primește (o constatare a oracolului): se judecă într-un test separat. */
  readonly constatare?: string;
};

const bucata = (...puncte: ReadonlyArray<readonly [number, number] | readonly [number, number, number]>): ConturD => cale(...puncte);
const ok = (bucati: readonly ConturD[], neatins: readonly PortiuneD[] = []): RezultatD => ({ ok: true, bucati, neatins });

/** Ieșirea corectă (după oracol) a unei căi: bucățile traseului ideal și `neatins` de pe hârtie. */
export function iesireCorecta(c: ConturD, d: number): { readonly bucati: readonly ConturD[]; readonly neatins: readonly PortiuneD[] } {
  return { bucati: traseuIdeal(c, d), neatins: idealDeschis(c, d).neatins };
}

const HOOK = cale([0, 0], [50, 0], [50, 2], [45, 2]);
/** Punctul cârligului la poziția s pe cale (pe hârtie: 50 + 2 + 5). */
const punctPeCaleHook = (s: number): PunctD => (s <= 50 ? { x: s, y: 0 } : s <= 52 ? { x: 50, y: s - 50 } : { x: 50 - (s - 52), y: 2 });
const L_UL = cale([0, 0], [100, 0], [100, 100]);
const U10 = cale([0, 50], [0, 0], [10, 0], [10, 50]);
const U60015 = cale([0, 50], [0, 0], [6.0015, 0], [6.0015, 50]);
const ARC8 = (HARTIE.find((h) => h.nume.startsWith('8.')) as CazHartie).cale;

export function martori(): Martor[] {
  const camera = iesireCorecta(CAMERA, 3);
  const carlig = iesireCorecta(HOOK, 3);
  const deplasat = (dy: number): RezultatD => ok([bucata([10, 53 + dy], [110, 53 + dy])]);
  return [
    { nume: 'partea inversată (Y47 în loc de Y53)', cale: LINIA, d: 3, rezultat: ok([bucata([10, 47], [110, 47])]), laVerificare: true },
    { nume: 'o bucată scăpată (camera, fără bucata din cameră)', cale: CAMERA, d: 3, rezultat: ok([el(camera.bucati, 0)], camera.neatins), laVerificare: true },
    { nume: 'o bucată scăpată (camera, fără bucata de afară)', cale: CAMERA, d: 3, rezultat: ok([el(camera.bucati, 1)], camera.neatins), laVerificare: true },
    { nume: 'traseul prelungit dincolo de normala startului', cale: LINIA, d: 3, rezultat: ok([bucata([9, 53], [110, 53])]), laVerificare: true },
    { nume: 'traseul prelungit dincolo de normala capătului', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [111, 53])]), laVerificare: true },
    { nume: 'traseul care ocolește startul', cale: LINIA, d: 3, rezultat: ok([bucata([10, 47, -1], [10, 53], [110, 53])]), laVerificare: true },
    { nume: 'traseul care ocolește capătul', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [110, 53, -1], [110, 47])]), laVerificare: true },
    { nume: 'ieșirea goală luată drept „nu încape” (linia)', cale: LINIA, d: 3, rezultat: { ok: false, motiv: MOTIV_NU_INCAPE }, laVerificare: true },
    { nume: 'ieșirea goală luată drept „nu încape” (hârtia, 8)', cale: ARC8, d: -1.5, rezultat: { ok: false, motiv: MOTIV_NU_INCAPE }, laVerificare: true },
    { nume: 'ok fără nicio bucată', cale: LINIA, d: 3, rezultat: ok([]), laVerificare: false },
    { nume: 'mersul împotriva sensului desenului', cale: LINIA, d: 3, rezultat: ok([bucata([110, 53], [10, 53])]), laVerificare: false },
    { nume: 'bucățile în ordinea inversă (camera)', cale: CAMERA, d: 3, rezultat: ok([el(camera.bucati, 1), el(camera.bucati, 0)], camera.neatins), laVerificare: false },
    { nume: 'traseul intră în zona nevalidă (cârligul dus până la x = 45)', cale: HOOK, d: 3, rezultat: ok([bucata([0, 3], [45, 3])], carlig.neatins), laVerificare: true },
    { nume: 'o bucată cu o cubică', cale: LINIA, d: 3, rezultat: ok([{ inchis: false, varfuri: [{ p: { x: 10, y: 53 }, s: { tip: 'C', c1: { x: 40, y: 53 }, c2: { x: 80, y: 53 } } }, { p: { x: 110, y: 53 }, s: { tip: 'L' } }] }]), laVerificare: true },
    { nume: 'o bucată închisă', cale: LINIA, d: 3, rezultat: ok([{ inchis: true, varfuri: bucata([10, 53], [110, 53]).varfuri }]), laVerificare: true },
    { nume: 'două bucăți care se suprapun', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [60, 53]), bucata([50, 53], [110, 53])]), laVerificare: true },
    { nume: 'bucata care se întoarce peste ea', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [60, 53], [40, 53], [110, 53])]), laVerificare: true },
    { nume: 'colțul convex tăiat cu o coardă (L, dreapta)', cale: L_UL, d: -3, rezultat: ok([bucata([0, -3], [100, -3], [103, 0], [103, 100])]), laVerificare: true },
    { nume: 'colțul convex ascuțit în loc de arc (L, dreapta)', cale: L_UL, d: -3, rezultat: ok([bucata([0, -3], [103, -3], [103, 100])]), laVerificare: true },
    { nume: 'dus-întorsul într-un U mai lat decât 2R', cale: U10, d: 3, rezultat: ok([bucata([3, 50], [3, 3], [3, 50])], iesireCorecta(U10, 3).neatins), laVerificare: true },
    { nume: 'traseul decalat cu 0,003 mm', cale: LINIA, d: 3, rezultat: deplasat(0.003), laVerificare: true },
    { nume: '`neatins` lipsă (cârligul)', cale: HOOK, d: 3, rezultat: ok(carlig.bucati, []), laVerificare: false },
    { nume: '`neatins` cu porțiunea mutată (cârligul)', cale: HOOK, d: 3, rezultat: ok(carlig.bucati, carlig.neatins.map((p) => ({ ...p, de: p.de - 0.5, lungime: p.lungime + 0.5, la: { x: p.la.x - 0.25, y: p.la.y } }))), laVerificare: false },
    { nume: 'o gaură de 20 mm în traseu (linia)', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [20, 53]), bucata([40, 53], [110, 53])]), laVerificare: true },
    { nume: 'o gaură de 0,06 mm în traseu (linia)', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [60, 53]), bucata([60.06, 53], [110, 53])]), laVerificare: true },
    {
      nume: 'o bucată dublată în U-ul de 10 (atingere într-un canal mai lat decât 2R)', cale: U10, d: 3,
      rezultat: ok([...iesireCorecta(U10, 3).bucati, bucata([3, 40], [3, 30])], iesireCorecta(U10, 3).neatins), laVerificare: true,
    },
    {
      nume: 'dus-întorsul într-un U de 6,0015 (în afara lui 2R ± 1e-4)', cale: U60015, d: 3,
      rezultat: ok([bucata([3.00075, 50], [3.00075, 3], [3.00075, 50])], iesireCorecta(U60015, 3).neatins), laVerificare: true,
      constatare: 'verificaIesireDeschisa primește un dus-întors care se atinge singur la lățimea 2R + 1,5e-3 (contractul: doar 2R ± 1e-4)',
    },
    { nume: '`neatins` cu o porțiune în plus (linia)', cale: LINIA, d: 3, rezultat: ok([bucata([10, 53], [110, 53])], [{ de: 10, pana: 20, lungime: 10, la: { x: 25, y: 50 } }]), laVerificare: false },
    { nume: 'un traseu pe o cale care se încrucișează', cale: cale([0, 0], [10, 10], [10, 0], [0, 10]), d: 3, rezultat: ok([bucata([0, 4.2426], [5.7574, 10])]), laVerificare: false },
    {
      nume: '`neatins` cu porțiunile vecine neunite (cârligul)', cale: HOOK, d: 3,
      rezultat: ok(carlig.bucati, [[42.1716, 50], [50, 52], [52, 57]].map(([de, pana]) => ({ de: de as number, pana: pana as number, lungime: (pana as number) - (de as number), la: punctPeCaleHook(((de as number) + (pana as number)) / 2) }))),
      laVerificare: false,
    },
    { nume: '`neatins` cu `la` greșit (L-ul, stânga)', cale: L_UL, d: 3, rezultat: ok(iesireCorecta(L_UL, 3).bucati, iesireCorecta(L_UL, 3).neatins.map((p) => ({ ...p, la: { x: p.la.x + 1, y: p.la.y } }))), laVerificare: false },
  ];
}

export type Control = { readonly nume: string; readonly cale: ConturD; readonly d: number; readonly bucati: readonly ConturD[] };

/** Ieșiri corecte (unele scrise de mână, altele din traseul ideal), pe care oracolul și verificarea trebuie să le primească. */
export function controale(): Control[] {
  const ideal = (nume: string, c: ConturD, d: number): Control => ({ nume, cale: c, d, bucati: iesireCorecta(c, d).bucati });
  return [
    { nume: 'linia, stânga (de mână)', cale: LINIA, d: 3, bucati: [bucata([10, 53], [110, 53])] },
    { nume: 'linia, dreapta (de mână)', cale: LINIA, d: -3, bucati: [bucata([10, 47], [110, 47])] },
    { nume: 'linia, decalată cu 0,0015 mm (în toleranță)', cale: LINIA, d: 3, bucati: [bucata([10, 53.0015], [110, 53.0015])] },
    { nume: 'L-ul, dreapta, cu arcul (de mână)', cale: L_UL, d: -3, bucati: [bucata([0, -3], [100, -3, SFERT], [103, 0], [103, 100])] },
    { nume: 'L-ul, stânga (de mână)', cale: L_UL, d: 3, bucati: [bucata([0, 3], [97, 3], [97, 100])] },
    { nume: 'cârligul (de mână)', cale: HOOK, d: 3, bucati: [bucata([0, 3], [45 - Math.sqrt(8), 3])] },
    { nume: 'semicercul, stânga (de mână)', cale: el(HARTIE, 2).cale, d: 3, bucati: [bucata([47, 0, 1], [-47, 0])] },
    ideal('camera (două bucăți, una închisă)', CAMERA, 3),
    ideal('canalul cu strangulare (bucata cu capătul în start)', strangulare(), -3),
    ideal('D-ul (bucata închisă din două segmente)', D_UL, 3),
    ideal('V-ul de 10°', V10, 3),
    ideal('U-ul de 6, dus-întors la exact 2R', cale([0, 50], [0, 0], [6, 0], [6, 50]), 3),
    { nume: 'U-ul de 6,00005, dus-întors pe mijloc (în 2R ± 1e-4)', cale: cale([0, 50], [0, 0], [6.00005, 0], [6.00005, 50]), d: 3, bucati: [bucata([3.000025, 50], [3.000025, 3], [3.000025, 50])] },
    ideal('U-ul de 5, dreapta', cale([0, 50], [0, 0], [5, 0], [5, 50]), -3),
    ideal('zig-zag-ul cu pasul 5', zigzag(40, 5, 2), 3),
    ideal('arcul R5 de 300°, coarde de 0,02 (hârtia, 8)', ARC8, -1.5),
    ideal('S-ul de biarce, abaterea 1e-6', biarc(10, 60, 20, -60, 1e-6), 3),
    ideal('spirala pătrată', cale([0, 0], [40, 0], [40, 40], [0, 40], [0, 10], [30, 10], [30, 30], [10, 30]), 3),
  ];
}
