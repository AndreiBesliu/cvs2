/**
 * ORACOLUL SIMULĂRII: ce material scoate un program G-code dintr-o placă, pe o grilă densă, judecat brut. E portat din
 * sonda s4 (`docs/faza2/sonde/s4-simulare/cod/oracle/oracle.mjs`, `RAPORT.md` §4.2) și întărit. ZERO importuri: nici
 * din `src/`, nici din alte oracole. Autorul lui n-a văzut nucleul de simulare al aplicației (`PLAN.md` §4.1), deci nu
 * are cod comun cu el: nucleul primește mutările ca numere, oracolul citește TEXTUL programului.
 *
 * Ce modelează, în ordinea în care trece un program prin el:
 * 1. Cititorul (`citesteGcode`): dialectul postului GRBL 1.1 al aplicației (vezi `test/placi/placa-01/placa-01-A.nc`):
 *    - curățarea liniei ca pe controler (GRBL `protocol.c`, citat în `timp.ts`): caracterele de cod ≤ 32 aruncate,
 *      comentariile `( … )` și `; …` aruncate, literele mici ridicate. Spre deosebire de GRBL, o paranteză neînchisă,
 *      o `)` fără pereche, `/` (ștergerea de bloc), `%` și comenzile `$` se REFUZĂ, nu se ignoră;
 *    - cuvintele: G0 G1 G2 G3 (mișcarea), G4 P (pauza), G17, G20/G21, G90/G91, G91.1, G94, G40, G49, G54, G61, G80;
 *      M0 M1 M2 M3 M4 M5 M8 M9 M30; X Y Z I J R F S P N. Starea de pornire e cea din `gc_init` (G0 G17 G21 G90 G94);
 *    - pe linie, modurile (G20/G21, G90/G91, mișcarea) se aplică înaintea mutării, ca în `gc_execute_line`; o linie
 *      doar cu coordonate folosește mișcarea modală;
 *    - arcul cu I/J: centrul = startul + (I, J) (GRBL n-are G90.1), cu verificarea razei din `gcode.c:793-806`
 *      (Δr > 0,005 mm și peste 0,5 mm sau peste 0,1 % din rază = refuz, error:33);
 *    - arcul cu R: centrul pe mediatoarea coardei, cu formula GRBL (`gcode.c`, forma R: `h_x2_div_d`); R negativ =
 *      arcul mare. 4R² < coarda² e refuz (error:33), ca pe controler, fără toleranță; start = țintă cu R, refuz;
 *    - sensul și unghiul arcului: regula din `motion_control.c` (`mc_arc`): unghiul din atan2 între razele de start și
 *      de țintă; G3 cu unghiul ≤ 5e-7 rad (`ARC_ANGULAR_TRAVEL_EPSILON`, `config.h:407`) devine cerc complet, G2 la fel
 *      cu semnul schimbat. Deci start = țintă cu I/J = un cerc întreg;
 *    - F, S, pauzele, axul și răcirea nu schimbă geometria: se citesc și se ignoră. Scula taie și cu axul oprit (poarta
 *      invariantelor, `PLAN.md` §4.2 p. 7, prinde tăierea cu axul oprit; aici contează doar pe unde a trecut).
 *    Tot ce nu e în lista de mai sus aruncă `Error` cu numărul liniei (1 = prima linie): G18/G19 (alte plane), axele
 *    A/B/C și K, G28/G30/G92/G53/G10 (alte origini), G55–G59, G41/G42/G43.1 (compensări), G93, G38.x, M6 și T (o
 *    singură sculă pe judecată), cuvintele dublate, două coduri din același grup modal, I/J/R fără arc, P fără G4,
 *    G4 cu axe, axe sub G80, orice linie cu cuvinte după M2/M30.
 * 2. Poziția de pornire: necunoscută pe toate axele; scula e presupusă deasupra feței plăcii. Cât timp o axă e
 *    necunoscută, mutările nu se simulează, dar: o mutare care ajunge sub față (Z cunoscut < `sus`) dintr-o poziție
 *    necunoscută, un arc dintr-o poziție necunoscută și un Z relativ (G91) dintr-un Z necunoscut sunt REFUZATE.
 * 3. Cadrul: `deplasare` se adună la coordonatele programului (după trecerea în mm) și dă coordonatele grilei: un
 *    program exportat cu alt colț de origine sau cu Z0 jos se judecă pe aceeași grilă.
 * 4. Scula: silueta h(r), înălțimea muchiei tăietoare deasupra vârfului la raza r ≤ D/2, cu formulele lui s4, scrise
 *    altfel decât valorile pe hârtie: plata h = 0; bila h = R·(1 − cos(asin(r/R))); V-ul h = r·cos(α/2)/sin(α/2) (α =
 *    unghiul inclus); profilul, interpolare liniară între puncte. Peste D/2 scula nu atinge nimic (coada sculei e un
 *    cilindru vertical: peretele).
 * 5. Câmpul: grila densă Float64; celula (i, j) are centrul în (x0 + (i + 0,5)·celula, y0 + (j + 0,5)·celula), indexul
 *    j·nx + i, nx = ceil(latime / celula − 1e-9) (la fel ny). Valoarea = cel mai jos Z atins de suprafața sculei
 *    deasupra centrului; o celulă netăiată rămâne la `sus`. „Cea mai adâncă tăietură câștigă”, deci ordinea nu contează.
 * 6. Judecata (`judeca`): fiecare mutare cu un capăt sub față se eșantionează la pas = celula / div (implicit div = 8),
 *    cu numărul de pași ales așa încât și drumul în XY, și cel în Z să fie ≤ pas pe pas; pe arc, eșantioanele stau pe
 *    arcul ADEVĂRAT (cos/sin din centru, nu coarde); dacă raza de la start diferă de cea de la țintă (în toleranța
 *    GRBL), raza trece liniar de la una la alta, ca drumul să ajungă exact în țintă. Capetele sunt eșantioane exacte.
 *    La fiecare eșantion, pe toate celulele aflate la r ≤ D/2: z = min(z, zVârf + h(r)). G0 se simulează ca G1:
 *    scula scoate materialul pe unde trece (o rapidă prin material e treaba porții, `PLAN.md` §4.2 p. 3). Pe lângă câmp,
 *    judecata dă pereții: celulele în care marja nu mărginește exactul, cu o margine de jos a lui (derivarea la `judeca`).
 *
 * Proprietatea pe care stă comparația (s4 §4.2): eșantionarea nu poate găsi un punct mai adânc decât minimul exact,
 * deci pe fiecare celulă oracolul ≥ exactul. De aici regula din `PLAN.md` §4.1: nucleul NU e niciodată mai sus decât
 * oracolul cu peste 10 nm (`compara`). Marja în sens invers (cât poate fi exactul sub oracol) e derivată la
 * `marjaEsantionare`, cu locurile unde nu se aplică.
 *
 * Funcțiile de măsură (`verificaHartie`, `sectiuneBila`, `unghiV`, `latimeRadiala`) sunt verificările lui
 * `run-corpus.mjs`, pe orice câmp dens (al oracolului sau al nucleului), ca să le poată chema și testul nucleului.
 *
 * Ce NU modelează: subtăierile (câmpul de înălțimi are o singură valoare pe celulă: coada de rândunică nu se poate
 * simula), alte plane decât XY, axa A, compensarea razei și a lungimii, schimbarea sculei, deformarea, uzura și
 * fibra lemnului, avansul și timpul (le are `timp.ts`), segmentarea arcului pe controler (`mc_arc` taie arcul în
 * coarde de cel mult $12 = 0,002 mm săgeată; oracolul folosește arcul exact), limita de lungime a liniei (o are
 * `gcode.ts`).
 */

// ---------------------------------------------------------------------------------------------------------------
// Tipurile.

export type P2 = readonly [number, number];
export type P3 = readonly [number, number, number];

/** Unghiul V e cel inclus, în grade. Profilul: puncte (r, h) cu r crescător de la (0, 0) până la r = D/2, h nedescrescător. */
export type SculaOracol =
  | { readonly tip: 'plata'; readonly diametru: number }
  | { readonly tip: 'bila'; readonly diametru: number }
  | { readonly tip: 'v'; readonly diametru: number; readonly unghi: number }
  | { readonly tip: 'profil'; readonly diametru: number; readonly puncte: readonly P2[] };

/** Celula (i, j) are centrul în (x0 + (i + 0,5)·celula, y0 + (j + 0,5)·celula); nx = ceil(latime / celula − 1e-9), la fel ny; indexul e j·nx + i. `sus` = Z-ul feței plăcii (implicit 0); o celulă netăiată are valoarea `sus`. */
export type GrilaOracol = {
  readonly x0: number;
  readonly y0: number;
  readonly latime: number;
  readonly inaltime: number;
  readonly celula: number;
  readonly sus?: number;
};

export type MutareOracol =
  | { readonly tip: 'linie'; readonly a: P3; readonly b: P3; readonly linie: number }
  | { readonly tip: 'arc'; readonly sens: 'orar' | 'trigonometric'; readonly a: P3; readonly b: P3; readonly centru: P2; readonly linie: number };

/** Ce întoarce `judeca`: câmpul plus ce îi trebuie lui `compara` ca să-și derive marja și pereții. */
export type RezultatOracol = {
  readonly nx: number;
  readonly ny: number;
  readonly z: Float64Array;
  /** Pasul de eșantionare, mm (= celula / div). */
  readonly pas: number;
  readonly celula: number;
  /** Z-ul feței (al grilei). */
  readonly sus: number;
  /** Cel mai jos Z atins de vârful sculei de mutările care au coborât sub față; `sus` dacă n-a coborât niciuna. */
  readonly varf: number;
  /** Câte mutări au avut un capăt sub față (cele simulate). */
  readonly mutariTaiate: number;
  /** Marja de eșantionare a rulării: max pe mutările tăiate din s_z + L·s_xy/2 (`marjaEsantionare`). */
  readonly marja: number;
  /** Pereții rulării: celulele în care marja nu mărginește exactul, cu marginea lui de jos acolo (`judeca`, „PEREȚII”). */
  readonly perete: PereteOracol;
};

/**
 * Celulele (indexul j·nx + i, crescător) în care exactul poate fi sub oracol cu mai mult decât marja, fiecare cu o margine
 * de jos a exactului (`jos[k]` e a celulei `celule[k]`). Derivarea e la `judeca`.
 */
export type PereteOracol = { readonly celule: Int32Array; readonly jos: Float64Array };

/** Oracolul cum îl primește `compara`: minimul cerut, plus câmpurile opționale pe care le dă `judeca`. */
export type OracolComparat = {
  readonly z: Float64Array;
  readonly nx: number;
  readonly ny: number;
  readonly pas: number;
  /** Fără ei, `compara` nu recunoaște niciun perete: toate celulele sub marjă intră în `maiJosPesteMarja`. */
  readonly perete?: PereteOracol;
  /** Fără `sus` și `varf`, panta sculei se ia pe toată silueta (marja cea mai largă). */
  readonly sus?: number;
  readonly varf?: number;
  /** Marja rulării (din `judeca`); lipsă = marginea de sus `marjaEsantionare(scula, pas, sus − varf)`. */
  readonly marja?: number;
};

export type Comparatie = {
  /** Celulele în care nucleul e mai sus decât oracolul cu peste `prag` (sau nu e un număr): nucleul a lăsat material. */
  readonly maiSus: number;
  readonly maiSusMax: number;
  /** Prima astfel de celulă, (i, j), în ordinea indexului. */
  readonly primaMaiSus?: readonly [number, number];
  /** Celulele în care nucleul e sub oracol cu peste `marja` + `prag` și nu e pe un perete, sau e sub marginea peretelui. */
  readonly maiJosPesteMarja: number;
  /** Celulele sub oracol cu peste `marja` + `prag`, dar pe un perete al oracolului, deasupra marginii lui de jos: decide hârtia. */
  readonly pePerete: number;
  /** max |nucleu − oracol| pe toate celulele. */
  readonly difMax: number;
  readonly marja: number;
};

// ---------------------------------------------------------------------------------------------------------------
// Cititorul.

/** `config.h:407` (rad), cum îl citează `timp.ts`. */
const ARC_ANGULAR_TRAVEL_EPSILON = 5e-7;
/** `nuts_bolts.h`: `MM_PER_INCH (25.40)`. */
const MM_PER_INCH = 25.4;

/** Codurile G înțelese (×10, ca G91.1 să fie întreg), cu grupul modal; G4 e nemodal. */
const COD_G: ReadonlyMap<number, string> = new Map([
  [0, 'miscare'], [10, 'miscare'], [20, 'miscare'], [30, 'miscare'], [800, 'miscare'],
  [40, 'nemodal'],
  [170, 'plan'],
  [200, 'unitati'], [210, 'unitati'],
  [900, 'distanta'], [910, 'distanta'],
  [911, 'distantaArc'],
  [940, 'avans'],
  [400, 'compensare'],
  [490, 'lungime'],
  [540, 'coordonate'],
  [610, 'cale'],
]);

/** Codurile G refuzate cu motivul lor (restul: „nu e înțeles”). */
const G_REFUZAT: ReadonlyMap<number, string> = new Map([
  [180, 'planul G18 nu e simulat (doar XY, G17)'],
  [190, 'planul G19 nu e simulat (doar XY, G17)'],
  [100, 'G10 schimbă originile: nu e simulat'],
  [280, 'G28 merge într-o poziție salvată, necunoscută oracolului'],
  [300, 'G30 merge într-o poziție salvată, necunoscută oracolului'],
  [530, 'G53 (coordonate mașină) nu e simulat'],
  [920, 'G92 mută originea: nu e simulat'],
  [921, 'G92.1 nu e simulat'],
  [410, 'compensarea razei (G41) nu e simulată'],
  [420, 'compensarea razei (G42) nu e simulată'],
  [431, 'compensarea lungimii (G43.1) nu e simulată'],
  [930, 'avansul în timp invers (G93) nu e folosit de post'],
  [901, 'G90.1 nu există în GRBL'],
]);

/** Codurile M înțelese, cu grupul modal. */
const COD_M: ReadonlyMap<number, string> = new Map([
  [0, 'oprire'], [1, 'oprire'], [2, 'oprire'], [30, 'oprire'],
  [3, 'ax'], [4, 'ax'], [5, 'ax'],
  [8, 'racire'], [9, 'racire'],
]);

/** Literele cu valoare înțelese; restul se refuză (A/B/C și K cu motivul lor). */
const LITERE: ReadonlySet<string> = new Set(['X', 'Y', 'Z', 'I', 'J', 'R', 'F', 'S', 'P', 'N']);

const NUMAR = /[+-]?(?:\d+\.?\d*|\.\d+)/y;

/**
 * Citește programul și întoarce mutările în coordonatele grilei (mm, program + `deplasare`), fiecare cu linia ei.
 * Mutările din poziții necunoscute rămase deasupra feței nu apar (vezi antetul, p. 2); `sus` e fața, în coordonatele
 * grilei. Aruncă `Error` cu „linia N:” pe tot ce nu înțelege.
 */
export function citesteGcode(text: string, deplasare: P3 = [0, 0, 0], sus = 0): MutareOracol[] {
  const rez: MutareOracol[] = [];
  // gc_init: G0 G17 G21 G90 G94; poziția necunoscută.
  let miscare: 0 | 1 | 2 | 3 | 80 = 0;
  let inch = false;
  let incremental = false;
  const poz: [number, number, number] = [Number.NaN, Number.NaN, Number.NaN];
  let terminat = false;

  const linii = text.split(/\r\n|\n|\r/);
  for (let idx = 0; idx < linii.length; idx++) {
    const nr = idx + 1;
    const eroare = (mesaj: string): Error => new Error(`linia ${nr}: ${mesaj}`);
    const brut = linii[idx] ?? '';

    // 1. Curățarea: comentariile și spațiile.
    let curat = '';
    for (let k = 0; k < brut.length; k++) {
      const c = brut[k] ?? '';
      if (c === '(') {
        const inchis = brut.indexOf(')', k + 1);
        if (inchis < 0) throw eroare('comentariu „(” neînchis');
        k = inchis;
        continue;
      }
      if (c === ';') break;
      if (c === ')') throw eroare('„)” fără „(”');
      if (c.charCodeAt(0) <= 32) continue;
      curat += c >= 'a' && c <= 'z' ? c.toUpperCase() : c;
    }
    if (curat === '') continue;
    if (terminat) throw eroare('cuvinte după sfârșitul programului (M2/M30)');
    if (curat[0] === '$') throw eroare('comenzile `$` nu sunt G-code de simulat');

    // 2. Cuvintele.
    const valori = new Map<string, number>();
    const grupuri = new Set<string>();
    const coduriG: number[] = [];
    let sfarsit = false;
    for (let k = 0; k < curat.length;) {
      const litera = curat[k] ?? '';
      if (litera < 'A' || litera > 'Z') throw eroare(`se aștepta o literă, nu „${litera}”`);
      NUMAR.lastIndex = k + 1;
      const m = NUMAR.exec(curat);
      if (!m) throw eroare(`număr lipsă sau greșit după ${litera}`);
      const v = Number(m[0]);
      k = NUMAR.lastIndex;
      if (litera === 'G') {
        const cod = Math.round(v * 10);
        if (Math.abs(v * 10 - cod) > 1e-6) throw eroare(`G${m[0]} nu există`);
        const refuz = G_REFUZAT.get(cod);
        if (refuz) throw eroare(refuz);
        const grup = COD_G.get(cod);
        if (!grup) throw eroare(`G${m[0]} nu e înțeles de oracol`);
        if (grupuri.has(grup)) throw eroare(`două coduri G din grupul „${grup}” pe aceeași linie`);
        grupuri.add(grup);
        coduriG.push(cod);
      } else if (litera === 'M') {
        if (!Number.isInteger(v)) throw eroare(`M${m[0]} nu există`);
        if (v === 6) throw eroare('schimbarea sculei (M6) nu e simulată: o singură sculă pe judecată');
        const grup = COD_M.get(v);
        if (!grup) throw eroare(`M${m[0]} nu e înțeles de oracol`);
        if (grupuri.has('M' + grup)) throw eroare(`două coduri M din grupul „${grup}” pe aceeași linie`);
        grupuri.add('M' + grup);
        if (v === 2 || v === 30) sfarsit = true;
      } else {
        if (litera === 'A' || litera === 'B' || litera === 'C') throw eroare(`axa ${litera} nu e simulată (doar XYZ)`);
        if (litera === 'K') throw eroare('K: arcele se simulează doar în planul XY (I, J)');
        if (litera === 'T') throw eroare('T: schimbarea sculei nu e simulată (o singură sculă pe judecată)');
        if (!LITERE.has(litera)) throw eroare(`litera ${litera} nu e înțeleasă de oracol`);
        if (valori.has(litera)) throw eroare(`${litera} apare de două ori`);
        valori.set(litera, v);
      }
    }

    // 3. Modurile liniei, înaintea mutării.
    let pauza = false;
    let miscareLinie: 0 | 1 | 2 | 3 | 80 | undefined;
    for (const cod of coduriG) {
      if (cod === 0 || cod === 10 || cod === 20 || cod === 30) miscareLinie = (cod / 10) as 0 | 1 | 2 | 3;
      else if (cod === 800) miscareLinie = 80;
      else if (cod === 40) pauza = true;
      else if (cod === 200) inch = true;
      else if (cod === 210) inch = false;
      else if (cod === 900) incremental = false;
      else if (cod === 910) incremental = true;
    }
    if (miscareLinie !== undefined) miscare = miscareLinie;

    const areX = valori.has('X'), areY = valori.has('Y'), areZ = valori.has('Z');
    const areAxe = areX || areY || areZ;
    const areIJ = valori.has('I') || valori.has('J');
    const areR = valori.has('R');
    if (valori.has('P') && !pauza) throw eroare('P fără G4');
    if (pauza) {
      if (!valori.has('P')) throw eroare('G4 fără P');
      if (!((valori.get('P') ?? -1) >= 0)) throw eroare('G4 cu P negativ');
      if (areAxe || areIJ || areR || miscareLinie !== undefined) throw eroare('G4 cu mișcare pe aceeași linie nu e înțeles');
      if (sfarsit) terminat = true;
      continue;
    }
    if (!areAxe) {
      if (areIJ || areR) throw eroare('I/J/R fără axe');
      if (miscareLinie === 2 || miscareLinie === 3) throw eroare(`G${miscareLinie} fără axe`);
      if (sfarsit) terminat = true;
      continue;
    }
    if (miscare === 80) throw eroare('axe sub G80 (mișcarea anulată)');
    if ((miscare === 0 || miscare === 1) && (areIJ || areR)) throw eroare(`I/J/R cu G${miscare}`);

    // 4. Ținta, în coordonatele grilei.
    const scara = inch ? MM_PER_INCH : 1;
    const startCunoscut = !Number.isNaN(poz[0]) && !Number.isNaN(poz[1]) && !Number.isNaN(poz[2]);
    const tinta: [number, number, number] = [poz[0], poz[1], poz[2]];
    const axe = ['X', 'Y', 'Z'] as const;
    for (let a = 0; a < 3; a++) {
      const v = valori.get(axe[a] ?? 'X');
      if (v === undefined) continue;
      if (incremental) {
        if (a === 2 && Number.isNaN(poz[2])) throw eroare('Z relativ (G91) dintr-un Z necunoscut');
        tinta[a] = poz[a]! + v * scara; // rămâne NaN dacă axa e necunoscută
      } else {
        tinta[a] = v * scara + deplasare[a]!;
      }
    }
    const a: P3 = [poz[0], poz[1], poz[2]];
    const b: P3 = [tinta[0], tinta[1], tinta[2]];

    if (miscare === 0 || miscare === 1) {
      if (startCunoscut) rez.push({ tip: 'linie', a, b, linie: nr });
      else if (!Number.isNaN(b[2]) && b[2] < sus) throw eroare(`coboară sub fața plăcii (Z ${b[2]}) dintr-o poziție necunoscută`);
    } else {
      // Arcul.
      if (!startCunoscut) throw eroare('arc dintr-o poziție necunoscută');
      if (!areX && !areY) throw eroare('arc fără X sau Y');
      if (areR && areIJ) throw eroare('arc cu R și cu I/J pe aceeași linie');
      if (!areR && !areIJ) throw eroare('arc fără I/J și fără R');
      const dx = b[0] - a[0], dy = b[1] - a[1];
      let centru: P2;
      if (areR) {
        // gcode.c, forma R: h_x2_div_d = 4r² − x² − y²; < 0 = error:33; apoi −√(…)/hypot(x, y), semn schimbat pentru
        // G3 (trigonometric) și încă o dată pentru R < 0; offset = ½(x − y·h, y + x·h).
        const r = (valori.get('R') ?? 0) * scara;
        if (dx === 0 && dy === 0) throw eroare('arc cu R și ținta = startul (nedefinit)');
        let h = 4 * r * r - dx * dx - dy * dy;
        if (h < 0) throw eroare(`raza R ${r} mai mică decât jumătate din coardă (error:33)`);
        h = -Math.sqrt(h) / Math.hypot(dx, dy);
        if (miscare === 3) h = -h;
        if (r < 0) h = -h;
        centru = [a[0] + 0.5 * (dx - dy * h), a[1] + 0.5 * (dy + dx * h)];
      } else {
        const ci = (valori.get('I') ?? 0) * scara, cj = (valori.get('J') ?? 0) * scara;
        const r0 = Math.hypot(ci, cj);
        if (r0 === 0) throw eroare('arc cu I = J = 0 (raza zero)');
        centru = [a[0] + ci, a[1] + cj];
        // gcode.c:793-806: ținta trebuie să fie pe același cerc.
        const r1 = Math.hypot(b[0] - centru[0], b[1] - centru[1]);
        const dr = Math.abs(r1 - r0);
        if (dr > 0.005 && (dr > 0.5 || dr > 0.001 * r0)) throw eroare(`ținta arcului nu e pe cerc: Δr = ${dr} mm (error:33)`);
      }
      rez.push({ tip: 'arc', sens: miscare === 2 ? 'orar' : 'trigonometric', a, b, centru, linie: nr });
    }
    poz[0] = tinta[0];
    poz[1] = tinta[1];
    poz[2] = tinta[2];
    if (sfarsit) terminat = true;
  }
  return rez;
}

/** Unghiul parcurs de un arc, cu semn (+ trigonometric), regula `mc_arc` (vezi antetul). */
export function unghiArc(m: Extract<MutareOracol, { tip: 'arc' }>): number {
  const vx0 = m.a[0] - m.centru[0], vy0 = m.a[1] - m.centru[1];
  const vx1 = m.b[0] - m.centru[0], vy1 = m.b[1] - m.centru[1];
  let u = Math.atan2(vx0 * vy1 - vy0 * vx1, vx0 * vx1 + vy0 * vy1);
  if (m.sens === 'orar') {
    if (u >= -ARC_ANGULAR_TRAVEL_EPSILON) u -= 2 * Math.PI;
  } else if (u <= ARC_ANGULAR_TRAVEL_EPSILON) u += 2 * Math.PI;
  return u;
}

// ---------------------------------------------------------------------------------------------------------------
// Scula.

export type Silueta = { readonly raza: number; readonly h: (r: number) => number };

/** Aruncă pe o sculă fără sens (diametru ≤ 0, unghi în afara (0°, 180°), profil care nu respectă tipul). */
export function valideazaScula(s: SculaOracol): void {
  if (!(Number.isFinite(s.diametru) && s.diametru > 0)) throw new Error(`scula: diametrul ${s.diametru} nu e pozitiv`);
  if (s.tip === 'v' && !(s.unghi > 0 && s.unghi < 180)) throw new Error(`scula V: unghiul inclus ${s.unghi}° nu e în (0°, 180°)`);
  if (s.tip === 'profil') {
    const P = s.puncte;
    if (P.length < 2) throw new Error('scula profil: cel puțin două puncte');
    const p0 = P[0]!;
    if (p0[0] !== 0 || p0[1] !== 0) throw new Error('scula profil: primul punct e (0, 0)');
    for (let k = 1; k < P.length; k++) {
      const [r0, h0] = P[k - 1]!;
      const [r1, h1] = P[k]!;
      if (!(Number.isFinite(r1) && Number.isFinite(h1))) throw new Error(`scula profil: punctul ${k} nu e finit`);
      if (!(r1 > r0)) throw new Error(`scula profil: r nu crește strict la punctul ${k}`);
      if (!(h1 >= h0)) throw new Error(`scula profil: h scade la punctul ${k}`);
    }
    const rN = P[P.length - 1]![0];
    if (Math.abs(rN - s.diametru / 2) > 1e-12 * s.diametru) throw new Error(`scula profil: ultimul r (${rN}) nu e D/2`);
  }
}

/** Silueta h(r) a sculei, pentru 0 ≤ r ≤ D/2 (formulele din antet, p. 4). */
export function silueta(s: SculaOracol): Silueta {
  valideazaScula(s);
  const R = s.diametru / 2;
  switch (s.tip) {
    case 'plata':
      return { raza: R, h: () => 0 };
    case 'bila':
      return { raza: R, h: (r) => R * (1 - Math.cos(Math.asin(Math.min(1, r / R)))) };
    case 'v': {
      const jum = (s.unghi / 2) * (Math.PI / 180);
      const c = Math.cos(jum), si = Math.sin(jum);
      return { raza: R, h: (r) => (r * c) / si };
    }
    case 'profil': {
      const P = s.puncte;
      return {
        raza: R,
        h: (r) => {
          for (let k = 0; k + 1 < P.length; k++) {
            const [r0, h0] = P[k]!;
            const [r1, h1] = P[k + 1]!;
            if (r <= r1) return h0 + ((r - r0) / (r1 - r0)) * (h1 - h0);
          }
          return P[P.length - 1]![1];
        },
      };
    }
  }
}

/** Cea mai mare rază r ≤ D/2 la care h(r) ≤ adâncimea (bisecție, h nedescrescătoare); întoarce capătul de sus. */
function razaPana(S: Silueta, adancime: number): number {
  if (S.h(S.raza) <= adancime) return S.raza;
  let lo = 0, hi = S.raza;
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2;
    if (S.h(mid) > adancime) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** rLim din `pantaUtila`: raza până la care panta siluetei e mărginită de L. */
function razaLimita(S: Silueta, adancime: number, pas: number): number {
  return Math.min(razaPana(S, adancime), S.raza - pas);
}

/**
 * Panta cea mai mare a siluetei (dh/dr) pe partea care poate coborî sub față: r ≤ min(rA, D/2 − pas), unde rA e raza
 * la care h(rA) = adâncimea. Ultimul pas de lângă marginea sculei e lăsat afară: dacă scula e îngropată mai adânc
 * decât h(D/2), acolo e peretele cozii (la bilă panta tinde la infinit), iar pereții se judecă pe hârtie.
 * `adancime` = `sus` − cel mai jos vârf; `Infinity` = toată silueta.
 */
export function pantaUtila(scula: SculaOracol, adancime: number, pas: number): number {
  if (!(adancime > 0)) return 0;
  const S = silueta(scula);
  const rLim = razaLimita(S, adancime, pas);
  if (!(rLim > 0)) return 0;
  switch (scula.tip) {
    case 'plata':
      return 0;
    case 'v': {
      const jum = (scula.unghi / 2) * (Math.PI / 180);
      return Math.cos(jum) / Math.sin(jum);
    }
    case 'bila':
      // h = R(1 − cos(asin(r/R))) ⇒ h' = tan(asin(r/R)), crescătoare: maximul e la rLim.
      return Math.tan(Math.asin(rLim / S.raza));
    case 'profil': {
      let L = 0;
      const P = scula.puncte;
      for (let k = 0; k + 1 < P.length; k++) {
        const [r0, h0] = P[k]!;
        const [r1, h1] = P[k + 1]!;
        if (r0 < rLim && h0 <= adancime) L = Math.max(L, (h1 - h0) / (r1 - r0));
      }
      return L;
    }
  }
}

/**
 * MARJA DE EȘANTIONARE: cât poate fi oracolul deasupra exactului pe o celulă care nu e pe un perete.
 * Derivarea. O mutare are n pași; pe pas, drumul în XY e s_xy ≤ pas și cel în Z e s_z ≤ pas. Fie t* punctul exact
 * în care suprafața sculei coboară cel mai jos deasupra celulei c (E = z(t*) + h(ρ*), ρ* = distanța în XY), R raza
 * sculei și L panta siluetei (`pantaUtila`).
 * (i) ρ* ≤ R − s_xy/2: eșantionul cel mai apropiat de t* e la cel mult o jumătate de pas, la ρ ≤ ρ* + s_xy/2 ≤ R,
 *     deci acoperă celula, și O − E ≤ s_z/2 + L·s_xy/2.
 * (ii) ρ* > R − s_xy/2 (contactul e lângă marginea sculei; de exemplu fundul frezei plate pe rampă, unde cea mai
 *     adâncă poziție care mai acoperă celula e cea cu celula chiar pe margine): dacă zona acoperită are cel puțin un
 *     pas, un eșantion acoperitor (ρ ≤ R) e la cel mult un pas întreg, iar h(ρ) − h(ρ*) ≤ h(R) − h(ρ*) ≤ L·s_xy/2,
 *     deci O − E ≤ s_z + L·s_xy/2.
 * Deci, pe mutare: marja = s_z + L·s_xy/2 (`judeca` o ia pe cea mai mare dintre mutările tăiate); la o mutare
 * verticală (s_xy = 0), ρ e constant, cel mai jos punct e capătul de jos, care e eșantion: marja 0. La Z constant e
 * L·s_xy/2 ≤ L·pas/2, marja din s4 („panta × pas / 2”, 5,4 µm la V60); pe rampa plată e s_z, pasul întreg chiar
 * trebuie: s4 a măsurat 0,615 µm, peste jumătatea de pas (0,31 µm), sub pasul întreg (0,625 µm). Fără mutări
 * (funcția de aici), marginea de sus: pas·(1 + L/2).
 * UNDE NU ARE SENS: pe pereții verticali — marginea frezei plate (mereu îngropată: h(R) = 0) și coada oricărei scule
 * îngropate mai adânc decât h(D/2). Acolo zona acoperită a celulei poate fi mai scurtă decât un pas, niciun eșantion
 * n-o atinge, iar oracolul lasă netăiată o fâșie de lățime ≈ R − √(R² − (pas/2)²) (1,6·10⁻⁶ mm la Ø6 și pas 0,00625)
 * pe care exactul o taie la toată adâncimea; la bila îngropată (adâncime ≥ R), panta de lângă margine tinde la
 * infinit și (ii) nu mai e mărginit de L. Acolo `judeca` dă, pe celulă, o margine de jos a exactului („PEREȚII”), iar
 * `compara` numără separat celulele de deasupra ei (`pePerete`): decide hârtia. Pe un corpus cu coordonate rotunde,
 * niciun centru de celulă nu cade în fâșie; pe coordonate nerotunde, da (proba: `simulare-oracol.pereti.test.ts`).
 */
export function marjaEsantionare(scula: SculaOracol, pas: number, adancime = Infinity): number {
  return pas * (1 + pantaUtila(scula, adancime, pas) / 2);
}

// ---------------------------------------------------------------------------------------------------------------
// Grila și judecata.

export function dimensiuni(g: GrilaOracol): { readonly nx: number; readonly ny: number } {
  if (!(g.celula > 0 && g.latime > 0 && g.inaltime > 0)) throw new Error('grila: celula, lățimea și înălțimea sunt pozitive');
  return { nx: Math.ceil(g.latime / g.celula - 1e-9), ny: Math.ceil(g.inaltime / g.celula - 1e-9) };
}

/** Câmpul dens al unei funcții f(x, y, i, j) pe centrele celulelor (de ex. valoarea pe hârtie, sau un martor stricat). */
export function campDinFunctie(g: GrilaOracol, f: (x: number, y: number, i: number, j: number) => number): Float64Array {
  const { nx, ny } = dimensiuni(g);
  const z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = g.y0 + (j + 0.5) * g.celula;
    for (let i = 0; i < nx; i++) z[j * nx + i] = f(g.x0 + (i + 0.5) * g.celula, y, i, j);
  }
  return z;
}

/** Fereastra (x0, y0, x1, y1), în coordonatele grilei. */
export type Fereastra = readonly [number, number, number, number];

/**
 * Sub-grila celulelor cu centrul în fereastră, aliniată pe grila mare (aceleași centre), plus deplasarea indexului:
 * celula (i, j) a sub-grilei e celula (i0 + i, j0 + j) a grilei mari. Așa se judecă placa întreagă pe ferestre.
 */
export function grilaFereastra(g: GrilaOracol, f: Fereastra): { readonly grila: GrilaOracol; readonly i0: number; readonly j0: number } {
  const { nx, ny } = dimensiuni(g);
  const c = g.celula;
  const i0 = Math.max(0, Math.ceil((f[0] - g.x0) / c - 0.5));
  const i1 = Math.min(nx - 1, Math.floor((f[2] - g.x0) / c - 0.5));
  const j0 = Math.max(0, Math.ceil((f[1] - g.y0) / c - 0.5));
  const j1 = Math.min(ny - 1, Math.floor((f[3] - g.y0) / c - 0.5));
  if (i1 < i0 || j1 < j0) throw new Error('fereastra nu conține niciun centru de celulă');
  const grila: GrilaOracol = {
    x0: g.x0 + i0 * c,
    y0: g.y0 + j0 * c,
    latime: (i1 - i0 + 1) * c,
    inaltime: (j1 - j0 + 1) * c,
    celula: c,
    ...(g.sus !== undefined ? { sus: g.sus } : {}),
  };
  return { grila, i0, j0 };
}

/** Lungimea drumului în XY pe care se aleg pașii: pe arc, |Δu|·max(r0, r1) + |r1 − r0| (≥ lungimea spiralei). */
function lungimeXY(m: MutareOracol): number {
  const [ax, ay] = m.a, [bx, by] = m.b;
  if (m.tip === 'linie') return Math.hypot(bx - ax, by - ay);
  const [cx, cy] = m.centru;
  const r0 = Math.hypot(ax - cx, ay - cy), r1 = Math.hypot(bx - cx, by - cy);
  return Math.abs(unghiArc(m)) * Math.max(r0, r1) + Math.abs(r1 - r0);
}

/** Jocul rotunjirilor pe razele pereților, mm (lărgește zona: o margine de jos rămâne margine de jos). */
const JOC_PERETE = 1e-9;

/** Panta cea mai mare a siluetei pe toată raza [0, D/2] (la bilă, infinită lângă margine). */
function pantaMaxima(s: SculaOracol): number {
  switch (s.tip) {
    case 'plata':
      return 0;
    case 'v': {
      const jum = (s.unghi / 2) * (Math.PI / 180);
      return Math.cos(jum) / Math.sin(jum);
    }
    case 'bila':
      return Infinity;
    case 'profil': {
      let m = 0;
      for (let k = 0; k + 1 < s.puncte.length; k++) {
        const [r0, h0] = s.puncte[k]!, [r1, h1] = s.puncte[k + 1]!;
        m = Math.max(m, (h1 - h0) / (r1 - r0));
      }
      return m;
    }
  }
}

/**
 * Judecata brută (antetul, p. 6): grila densă după programul `text`, cu scula dată. `deplasare` ca la `citesteGcode`.
 *
 * PEREȚII: unde marja nu mărginește exactul (`marjaEsantionare`, „unde nu are sens”), judecata dă, pe celulă, o margine
 * de jos a exactului. Notațiile de acolo: O oracolul, E exactul, t* punctul exact cel mai jos deasupra celulei c,
 * ρ* = |c − p(t*)| în XY, E = z(t*) + h(ρ*); L și rLim din `pantaUtila` (panta siluetei e ≤ L pe [0, rLim]). Scula e
 * „blândă” dacă panta ei e ≤ L pe toată raza (plata, V-ul, profilul fără o margine mai abruptă; bila nu e).
 * Pe o mutare cu pașii s = s_xy > 0 și s_z, t* stă între două eșantioane consecutive a și b; fie n cel mai apropiat de t*
 * (la cel mult s/2 în XY și s_z/2 în Z) și o celălalt (la cel mult s și s_z), cu distanțele r_n și r_o la celulă.
 * (1) r_n ≤ rLim: n acoperă celula și O − E ≤ (z_n − z(t*)) + (h(r_n) − h(ρ*)) ≤ s_z/2 + L·s/2 ≤ marja.
 * (2) Scula e blândă și r_n ≤ R: la fel, cu panta ≤ L până la R.
 * (3) Scula e blândă și r_n > R ≥ r_o: ρ* ≥ r_n − s/2 > R − s/2 și O ≤ z_o + h(r_o) ≤ z_o + h(R), deci
 *     O − E ≤ s_z + L·(R − ρ*) < s_z + L·s/2 ≤ marja.
 * Deci, fără să știm care e n, marja ajunge pe perechea (a, b) dacă r_a, r_b ≤ rLim sau dacă scula e blândă și
 * min(r_a, r_b) ≤ R. Altfel, pe pereche: z(t*) ≥ min(z_a, z_b) și ρ* ≥ d_ab, distanța celulei la bucata de drum dintre a
 * și b (pe linie, distanța la segmentul ab; pe arc, la coarda ab minus săgeata bucății, care e ≤ s/2), deci
 * E ≥ J_ab = min(z_a, z_b) + h(d_ab), dacă d_ab ≤ R (altfel t* nu e pe bucata asta). Cu J minimul lui J_ab pe perechile
 * fără marjă, pe orice celulă E ≥ min(O − marja, J) (E și O sunt minimele pe mutări). Nu intră: mutarea verticală (s = 0,
 * r_n = ρ*: (1) ține fără nicio pantă) și perechea cu ambele capete deasupra feței (E ≥ sus). Pe linie, J_ab e cel mult
 * cu s_z sub cel mai jos punct al bucății, deci J e o margine strânsă.
 * J coboară sub O − marja (aici sunt PEREȚII, `perete`: celulele cu J < O − marja și J-ul lor) doar (a) lângă marginea
 * unei scule îngropate (h(R) sub față), unde drumul dintre a și b trece la ≤ R de celulă, dar niciunul nu o acoperă:
 * oracolul ratează fâșia, exactul o taie; (b) lângă marginea unei scule neblânde îngropate dincolo de rLim (bila).
 * Regula e geometrică, fără înălțimea treptei: o treaptă de 0,03 mm e un perete ca una de 3 mm. Regula veche din
 * `compara` (un vecin mai jos în oracol cu peste √2·celula·(1 + L) + 2·marja) nu vedea treptele mai mici decât pragul,
 * pe care și o pantă le face între doi vecini: o tăietură plată de 0,03 mm pe coordonate nerotunde dădea
 * `maiJosPesteMarja` pe un câmp exact. Și invers: o celulă de lângă un perete înalt, dar în afara marginii (d_ab > R), pe
 * care regula veche o lăsa pe perete, nu mai e perete.
 */
export function judeca(
  text: string,
  grila: GrilaOracol,
  scula: SculaOracol,
  optiuni: { readonly div?: number; readonly deplasare?: P3 } = {},
): RezultatOracol {
  const div = optiuni.div ?? 8;
  if (!(Number.isInteger(div) && div >= 1)) throw new Error(`div = ${div}: un întreg ≥ 1`);
  const { nx, ny } = dimensiuni(grila);
  const sus = grila.sus ?? 0;
  const c = grila.celula, x0 = grila.x0, y0 = grila.y0;
  const pas = c / div;
  const S = silueta(scula);
  const R = S.raza, h = S.h;

  // Întâi pașii mutărilor tăiate și vârful cel mai jos: panta L, rLim și marja trebuie știute înaintea ștampilelor.
  const mutari: { readonly m: MutareOracol; readonly n: number; readonly sxy: number; readonly sz: number }[] = [];
  let varf = sus;
  for (const m of citesteGcode(text, optiuni.deplasare, sus)) {
    const az = m.a[2], bz = m.b[2];
    if (Math.min(az, bz) >= sus) continue;
    varf = Math.min(varf, az, bz);
    const lz = Math.abs(bz - az), lxy = lungimeXY(m);
    const n = Math.max(1, Math.ceil(Math.max(lxy, lz) / pas));
    mutari.push({ m, n, sxy: lxy / n, sz: lz / n });
  }
  const L = pantaUtila(scula, sus - varf, pas);
  const rLim = razaLimita(S, sus - varf, pas);
  const blanda = pantaMaxima(scula) <= L;
  let marja = 0;
  // O mutare verticală (s_xy = 0) are ρ constant: cel mai jos punct e capătul de jos, un eșantion, deci marja 0.
  for (const p of mutari) if (p.sxy > 0) marja = Math.max(marja, p.sz + (L * p.sxy) / 2);

  const z = new Float64Array(nx * ny).fill(sus);
  /** J pe celulă (PEREȚII); Infinity = nicio pereche fără marjă. */
  const J = new Float64Array(nx * ny).fill(Infinity);
  /** Mutarea curentă: pasul în XY și săgeata bucăților de drum dintre eșantioane (0 pe linie). */
  let sxy = 0, sageata = 0;
  // razaPana pe adâncime, ținută pe ultimele două valori (ale ștampilei și ale perechii).
  let adA = Number.NaN, rA = R, adB = Number.NaN, rB = R;
  const raza = (ad: number): number => {
    if (ad === adA) return rA;
    if (ad === adB) return rB;
    adB = adA;
    rB = rA;
    adA = ad;
    rA = razaPana(S, ad);
    return rA;
  };

  /** Ștampila eșantionului (px, py, pz) și perechea lui cu eșantionul următor al mutării, `urm` (null la capăt). */
  const stampila = (px: number, py: number, pz: number, urm: Float64Array | null): void => {
    const taie = pz < sus;
    const pereche = urm !== null && sxy > 0 && (taie || urm[2]! < sus);
    if (!taie && !pereche) return;
    const re = taie ? raza(sus - pz) : -Infinity;
    // Perechea: J_ab e sub față doar dacă d_ab < razaPana(adâncimea mai mare), deci celula e la cel mult atât + s +
    // 2·săgeata de eșantion. Sub rLim − s, ambele distanțe sunt ≤ rLim (|r_b − r_a| ≤ s): marja ajunge.
    let rp = -Infinity, vx = 0, vy = 0, l2 = 0, zp = 0;
    if (urm !== null && pereche) {
      zp = Math.min(pz, urm[2]!);
      rp = Math.min(R, raza(sus - zp)) + sxy + 2 * sageata + JOC_PERETE;
      vx = urm[0]! - px;
      vy = urm[1]! - py;
      l2 = vx * vx + vy * vy;
    }
    const rJos = rLim - sxy - JOC_PERETE;
    const rb = Math.max(re, rp);
    // Rândurile și coloanele cu centrul la cel mult `rb`, lărgite cu o celulă (rotunjirile nu pot pierde o celulă);
    // filtrele exacte rămân r ≤ R (ștampila) și r ≤ rp (perechea). Dincolo de `re`, suprafața sculei e deasupra feței.
    const jA = Math.max(0, Math.ceil((py - rb - y0) / c - 0.5) - 1);
    const jB = Math.min(ny - 1, Math.floor((py + rb - y0) / c - 0.5) + 1);
    for (let j = jA; j <= jB; j++) {
      const dy = y0 + (j + 0.5) * c - py;
      const dy2 = dy * dy;
      const q = rb * rb - dy2;
      const w = q > 0 ? Math.sqrt(q) : 0;
      const iA = Math.max(0, Math.ceil((px - w - x0) / c - 0.5) - 1);
      const iB = Math.min(nx - 1, Math.floor((px + w - x0) / c - 0.5) + 1);
      const baza = j * nx;
      for (let i = iA; i <= iB; i++) {
        const dx = x0 + (i + 0.5) * c - px;
        const r = Math.sqrt(dx * dx + dy2);
        const k = baza + i;
        if (taie && r <= R) {
          const zt = pz + h(r);
          if (zt < z[k]!) z[k] = zt;
        }
        if (r > rJos && r <= rp && !(blanda && r <= R)) {
          const ex = dx - vx, ey = dy - vy;
          const rn = Math.sqrt(ex * ex + ey * ey);
          if (!((r <= rLim && rn <= rLim) || (blanda && rn <= R))) {
            let t = l2 > 0 ? (dx * vx + dy * vy) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const d = Math.hypot(dx - t * vx, dy - t * vy) - sageata;
            if (d <= R + JOC_PERETE) {
              const jk = zp + h(Math.min(R, Math.max(0, d)));
              if (jk < J[k]!) J[k] = jk;
            }
          }
        }
      }
    }
  };

  const P = new Float64Array(3), Q = new Float64Array(3);
  for (const mut of mutari) {
    const { m, n } = mut;
    const [ax, ay, az] = m.a;
    const [bx, by, bz] = m.b;
    sxy = mut.sxy;
    let punct: (k: number, T: Float64Array) => void;
    if (m.tip === 'linie') {
      sageata = 0;
      punct = (k, T) => {
        if (k === n) {
          T[0] = bx; T[1] = by; T[2] = bz;
          return;
        }
        const t = k / n;
        T[0] = ax + (bx - ax) * t; T[1] = ay + (by - ay) * t; T[2] = az + (bz - az) * t;
      };
    } else {
      const [cx, cy] = m.centru;
      const r0 = Math.hypot(ax - cx, ay - cy), r1 = Math.hypot(bx - cx, by - cy);
      const u0 = Math.atan2(ay - cy, ax - cx);
      const du = unghiArc(m);
      // Bucata de arc de rază r și lungime ≤ s stă la cel mult s²/(8r) de coardă; raza care trece de la r0 la r1 mai
      // adaugă de două ori pasul ei. Oricum, orice punct al bucății e la cel mult s/2 de un capăt, deci de coardă.
      const rMin = Math.min(r0, r1);
      sageata = rMin > 0 ? Math.min(sxy / 2, (sxy * sxy) / (8 * rMin) + (2 * Math.abs(r1 - r0)) / n) : sxy / 2;
      punct = (k, T) => {
        if (k === n) {
          T[0] = bx; T[1] = by; T[2] = bz;
          return;
        }
        const t = k / n;
        const u = u0 + du * t, r = r0 + (r1 - r0) * t;
        T[0] = cx + r * Math.cos(u); T[1] = cy + r * Math.sin(u); T[2] = az + (bz - az) * t;
      };
    }
    // Eșantioanele k = 0…n (n = capătul, exact), fiecare cu perechea lui spre următorul.
    let A = P, B = Q;
    punct(0, A);
    for (let k = 0; k <= n; k++) {
      let urm: Float64Array | null = null;
      if (k < n) {
        punct(k + 1, B);
        urm = B;
      }
      stampila(A[0]!, A[1]!, A[2]!, urm);
      const T = A;
      A = B;
      B = T;
    }
  }

  const celule: number[] = [], jos: number[] = [];
  for (let k = 0; k < z.length; k++) {
    if (J[k]! < z[k]! - marja) {
      celule.push(k);
      jos.push(J[k]!);
    }
  }
  const perete: PereteOracol = { celule: Int32Array.from(celule), jos: Float64Array.from(jos) };
  return { nx, ny, z, pas, celula: c, sus, varf, mutariTaiate: mutari.length, marja, perete };
}

// ---------------------------------------------------------------------------------------------------------------
// Comparația cu un nucleu.

/**
 * Compară câmpul unui nucleu (dens, același index j·nx + i) cu oracolul. Regula din `PLAN.md` §4.1: nucleul NU e
 * niciodată mai sus decât oracolul cu peste `prag` (implicit 1e-5 mm = 10 nm) — acolo nucleul a lăsat material pe care
 * oracolul l-a tăiat; se verifică pe TOATE celulele, pereți incluși, iar o valoare care nu e număr se numără aici.
 * Nucleul mai jos e permis doar cât marja de eșantionare a rulării (`RezultatOracol.marja`; derivarea la
 * `marjaEsantionare`) plus același `prag` (zgomotul numeric, simetric). Pe pereții oracolului (`RezultatOracol.perete`,
 * derivarea la `judeca`) exactul poate fi mai jos de atât, dar nu sub marginea de jos a peretelui: acolo celulele în care
 * nucleul e sub marjă, dar deasupra marginii (cu același `prag`), se numără în `pePerete` și le judecă hârtia; sub margine,
 * nucleul e mai adânc decât poate fi exactul și celula intră în `maiJosPesteMarja`. Fără pereți (un oracol construit de
 * mână), toate intră acolo. Pe corpus, ambele numere trebuie să fie 0.
 * Nucleul și oracolul trebuie să judece ACELEAȘI numere: un text cu 3 zecimale mută traseul cu până la 0,5 µm pe
 * axă, adică peste pragul de 10 nm pe orice pantă, dacă nucleul primește coordonatele nerotunjite.
 */
export function compara(nucleu: ArrayLike<number>, oracol: OracolComparat, scula: SculaOracol, prag = 1e-5): Comparatie {
  const { z, nx, ny, pas } = oracol;
  if (z.length !== nx * ny) throw new Error(`oracolul are ${z.length} celule, nu nx·ny = ${nx * ny}`);
  if (nucleu.length !== z.length) throw new Error(`nucleul are ${nucleu.length} celule, oracolul ${z.length}`);
  const adancime = oracol.sus !== undefined && oracol.varf !== undefined ? oracol.sus - oracol.varf : Infinity;
  const marja = oracol.marja ?? marjaEsantionare(scula, pas, adancime);
  const pereti = oracol.perete?.celule ?? new Int32Array(0), josPerete = oracol.perete?.jos ?? new Float64Array(0);
  if (pereti.length !== josPerete.length) throw new Error(`pereții au ${pereti.length} celule și ${josPerete.length} margini`);
  /** Cursorul în pereți: celulele se parcurg în ordinea indexului, ca și ei. */
  let p = 0;

  let maiSus = 0, maiSusMax = 0, maiJos = 0, pePerete = 0, difMax = 0;
  let prima: readonly [number, number] | undefined;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const o = z[k]!;
      const n = Number(nucleu[k]);
      const d = n - o;
      if (!(d <= prag)) {
        maiSus++;
        const v = Number.isNaN(d) ? Infinity : d;
        if (v > maiSusMax) maiSusMax = v;
        if (!prima) prima = [i, j];
      }
      const ad = Number.isNaN(d) ? Infinity : Math.abs(d);
      if (ad > difMax) difMax = ad;
      if (-d > marja + prag) {
        while (p < pereti.length && pereti[p]! < k) p++;
        if (p < pereti.length && pereti[p] === k && n >= josPerete[p]! - prag) pePerete++;
        else maiJos++;
      }
    }
  }
  return { maiSus, maiSusMax, ...(prima ? { primaMaiSus: prima } : {}), maiJosPesteMarja: maiJos, pePerete, difMax, marja };
}

// ---------------------------------------------------------------------------------------------------------------
// Funcțiile de măsură (verificările lui `run-corpus.mjs`), pe orice câmp dens.

export type VerificareHartie = {
  /** Celulele comparate. */
  readonly celule: number;
  /** Celulele sărite: centrul la mai puțin de `pragMuchie` de discontinuitatea hârtiei. */
  readonly peMuchie: number;
  /** Celulele cu câmpul sub hârtie cu peste `sub` sau peste ea cu peste `peste` (sau care nu sunt numere). */
  readonly gresite: number;
  readonly maiJos: number;
  readonly maiSus: number;
  /** max |câmp − hârtie| pe celulele comparate. */
  readonly eroareMax: number;
  readonly primaGresita?: readonly [number, number];
};

/**
 * Valoarea pe hârtie pe toate celulele (sau pe ferestre): câmpul `z` față de `hartie(x, y)` în centrele celulelor.
 * Implicit, ca în s4: o celulă e greșită dacă |câmp − hârtie| > 1e-5; cu `sub` / `peste` diferite, verificarea e
 * asimetrică (pentru oracol: sub = 1e-9, oracolul nu e niciodată mai adânc; peste = marja). Celulele cu
 * `muchie(x, y) < pragMuchie` (implicit 1e-9: exact pe muchia discontinuității) se sar și se numără. Ferestrele:
 * celulele cu centrul în dreptunghiul închis.
 */
export function verificaHartie(
  z: ArrayLike<number>,
  grila: GrilaOracol,
  hartie: (x: number, y: number) => number,
  optiuni: {
    readonly ferestre?: readonly Fereastra[];
    readonly muchie?: (x: number, y: number) => number;
    readonly pragMuchie?: number;
    readonly sub?: number;
    readonly peste?: number;
  } = {},
): VerificareHartie {
  const { nx, ny } = dimensiuni(grila);
  if (z.length !== nx * ny) throw new Error(`câmpul are ${z.length} celule, grila ${nx * ny}`);
  const c = grila.celula;
  const sub = optiuni.sub ?? 1e-5, peste = optiuni.peste ?? 1e-5, pragMuchie = optiuni.pragMuchie ?? 1e-9;
  const ferestre: readonly Fereastra[] = optiuni.ferestre ?? [[grila.x0, grila.y0, grila.x0 + nx * c, grila.y0 + ny * c]];
  let celule = 0, peMuchie = 0, gresite = 0, maiJos = 0, maiSus = 0, eroareMax = 0;
  let prima: readonly [number, number] | undefined;
  for (const f of ferestre) {
    const iA = Math.max(0, Math.ceil((f[0] - grila.x0) / c - 0.5)), iB = Math.min(nx - 1, Math.floor((f[2] - grila.x0) / c - 0.5));
    const jA = Math.max(0, Math.ceil((f[1] - grila.y0) / c - 0.5)), jB = Math.min(ny - 1, Math.floor((f[3] - grila.y0) / c - 0.5));
    for (let j = jA; j <= jB; j++) {
      const y = grila.y0 + (j + 0.5) * c;
      for (let i = iA; i <= iB; i++) {
        const x = grila.x0 + (i + 0.5) * c;
        if (optiuni.muchie && optiuni.muchie(x, y) < pragMuchie) {
          peMuchie++;
          continue;
        }
        celule++;
        const e = Number(z[j * nx + i]) - hartie(x, y);
        const ae = Number.isNaN(e) ? Infinity : Math.abs(e);
        if (ae > eroareMax) eroareMax = ae;
        const jos = !(e >= -sub), susP = !(e <= peste);
        if (jos) maiJos++;
        if (susP) maiSus++;
        if (jos || susP) {
          gresite++;
          if (!prima) prima = [i, j];
        }
      }
    }
  }
  return { celule, peMuchie, gresite, maiJos, maiSus, eroareMax, ...(prima ? { primaGresita: prima } : {}) };
}

/**
 * Secțiunea șanțului cu bilă: cercul ajustat (Kasa, cele mai mici pătrate pe y² + z² = a·y + b·z + c) pe coloana de
 * celule care conține x, pe celulele tăiate cu peste `prag` (implicit 1e-4 mm) sub față. Șanțul cu bilă Ø6 la −2 dă
 * raza 3 și centrul la z = +1.
 */
export function sectiuneBila(z: ArrayLike<number>, grila: GrilaOracol, x: number, prag = 1e-4): {
  readonly raza: number; readonly centruY: number; readonly centruZ: number; readonly puncte: number;
} {
  const { nx, ny } = dimensiuni(grila);
  const sus = grila.sus ?? 0;
  const i = Math.floor((x - grila.x0) / grila.celula);
  if (i < 0 || i >= nx) throw new Error(`x = ${x} e în afara grilei`);
  let Sy = 0, Sz = 0, Syy = 0, Szz = 0, Syz = 0, Syq = 0, Szq = 0, Sq = 0, N = 0;
  for (let j = 0; j < ny; j++) {
    const v = Number(z[j * nx + i]);
    if (!(v < sus - prag)) continue;
    const y = grila.y0 + (j + 0.5) * grila.celula;
    const q = y * y + v * v;
    Sy += y; Sz += v; Syy += y * y; Szz += v * v; Syz += y * v; Syq += y * q; Szq += v * q; Sq += q; N++;
  }
  // [Syy Syz Sy; Syz Szz Sz; Sy Sz N]·[a b c] = [Syq Szq Sq], regula lui Cramer (rândurile matricei pe rând).
  const det3 = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, k: number): number =>
    a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
  const D = det3(Syy, Syz, Sy, Syz, Szz, Sz, Sy, Sz, N);
  const a = det3(Syq, Syz, Sy, Szq, Szz, Sz, Sq, Sz, N) / D;
  const b = det3(Syy, Syq, Sy, Syz, Szq, Sz, Sy, Sq, N) / D;
  const cc = det3(Syy, Syz, Syq, Syz, Szz, Szq, Sy, Sz, Sq) / D;
  const yc = a / 2, zc = b / 2;
  return { raza: Math.sqrt(cc + yc * yc + zc * zc), centruY: yc, centruZ: zc, puncte: N };
}

/**
 * Unghiul inclus al șanțului V, din pantele pereților: pe coloana care conține x, câte o dreaptă (cele mai mici
 * pătrate z = a + s·y) pe fiecare parte a lui `centruY` (celulele la peste o celulă de el, tăiate cu peste `prag`,
 * implicit 0,1 mm), apoi unghiul = atan(1/|s_stânga|) + atan(1/|s_dreapta|), în grade.
 */
export function unghiV(z: ArrayLike<number>, grila: GrilaOracol, x: number, centruY: number, prag = 0.1): {
  readonly grade: number; readonly pante: readonly [number, number]; readonly puncte: readonly [number, number];
} {
  const { nx, ny } = dimensiuni(grila);
  const sus = grila.sus ?? 0;
  const c = grila.celula;
  const i = Math.floor((x - grila.x0) / c);
  if (i < 0 || i >= nx) throw new Error(`x = ${x} e în afara grilei`);
  const panta = (parte: number): readonly [number, number] => {
    let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0, N = 0;
    for (let j = 0; j < ny; j++) {
      const y = grila.y0 + (j + 0.5) * c, v = Number(z[j * nx + i]);
      if ((y - centruY) * parte <= c || !(v < sus - prag)) continue;
      Sx += y; Sy += v; Sxx += y * y; Sxy += y * v; N++;
    }
    return [(N * Sxy - Sx * Sy) / (N * Sxx - Sx * Sx), N];
  };
  const [sS, nS] = panta(-1);
  const [sD, nD] = panta(1);
  const grade = (Math.atan(1 / Math.abs(sS)) + Math.atan(1 / Math.abs(sD))) * (180 / Math.PI);
  return { grade, pante: [sS, sD], puncte: [nS, nD] };
}

/**
 * Lățimea radială a șanțului pe arc, pe raza de unghi dat din `centru`: puncte la pas celula/4 de la rMin la rMax;
 * se numără cele a căror celulă (cea care conține punctul) e sub `zPrag`; lățimea = număr × pas. Eroarea de măsură
 * vine din pasul punctelor și din celule: cel mult celula·√2 + celula/4.
 */
export function latimeRadiala(
  z: ArrayLike<number>, grila: GrilaOracol, centru: P2, unghiGrade: number, rMin: number, rMax: number, zPrag: number,
): number {
  const { nx, ny } = dimensiuni(grila);
  const pasM = grila.celula / 4;
  const u = (unghiGrade * Math.PI) / 180;
  const n = Math.floor((rMax - rMin) / pasM + 1e-9);
  let cate = 0;
  for (let k = 0; k <= n; k++) {
    const s = rMin + k * pasM;
    const i = Math.floor((centru[0] + s * Math.cos(u) - grila.x0) / grila.celula);
    const j = Math.floor((centru[1] + s * Math.sin(u) - grila.y0) / grila.celula);
    if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
    if (Number(z[j * nx + i]) < zPrag) cate++;
  }
  return cate * pasM;
}

/** Cel mai mic Z din câmp (invarianta: niciodată sub Z-ul programat). */
export function minim(z: ArrayLike<number>): number {
  let m = Infinity;
  for (let k = 0; k < z.length; k++) {
    const v = Number(z[k]);
    if (Number.isNaN(v)) return Number.NaN;
    if (v < m) m = v;
  }
  return m;
}
