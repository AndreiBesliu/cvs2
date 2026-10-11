/**
 * Corpusul oracolului biarcelor (ADR 0033 §8), cu ZERO importuri din `src/`:
 * - `CAZURI`: cubicele, pe familii:
 *   · `cerc` / `elipsa`: sferturi cu κ = 4(√2 − 1)/3 (cum le scrie orice SVG pentru `<circle>` / `<ellipse>`), de la
 *     r = 0,005 la r = 1 220 mm, rotite și mutate pe foaie;
 *   · `svg`: căi scrise de mână ca într-un fișier SVG (inima, cu mânerele retrase pe care le dau editoarele, colțul
 *     rotunjit, valul unei firme de 2 440 mm);
 *   · `glife`: contururi de litere în unități de font (1 000 / em) aduse la 10 mm (S, O, e, g, a), plus litera „o” dintr-un
 *     font TrueType, cu PĂTRATICE ridicate exact la cubice (ADR 0001: c1 = p0 + ⅔(q − p0), c2 = p2 + ⅔(q − p2));
 *   · `grele`: cele din §8 (vârful exact, simetric și nesimetric; bucla; bucla închisă a = b; mânerul retras P1 = P0,
 *     P2 = P3 și amândouă; aproape dreapta, în bandă și peste ea; dubla inflexiune; 0,01 mm; 2 440 mm), plus dreapta
 *     exactă, dreapta care se întoarce, c1 = c2, aproape-vârful și cubica de 1e-6 mm;
 *   · `aleatoare`: cubice cu un PRNG propriu (mulberry32, sămânța fixă), la scări log-uniforme între 0,01 și 2 440 mm;
 *   · `recenzie`: familiile grele găsite de recenzia ADR-ului (secțiunea „Recenzia”), scrise aici independent: mânerul întors
 *     sau depășit pe o cubică (aproape) dreaptă, vârfurile exacte cu coordonate oarecare (date și construite), bucla mică
 *     de lângă un vârf, inflexiunea prost condiționată, arcele line de 2 440 mm cu raza peste și sub `RAZA_MAXIMA_ARC`;
 * - `CU_TOLERANTA_PROPRIE`: cazurile care cer toleranța lor (biarcul unic al recenziei, la 10,67 mm);
 * - `TOLERANTE`: 0,001 (a proiectului), 0,0001, 0,01, 0,1;
 * - `DEGENERATE`: cubicele care trebuie să dea lanțul gol (§4);
 * - `REFUZURI`: intrările din §5 (toleranța care nu e un număr finit pozitiv, punctele nefinite), plus toleranța de
 *   1e-300, la care niciun lanț nu poate încăpea (deci plafonul sau alt refuz explicit e singurul răspuns corect);
 * - `CONTURURI`: contururi întregi pentru `conturFaraCubice` (cu linii, arce și cubice amestecate, deschise și închise).
 * Pe fiecare caz, `inflexiuni` și `varfuri` sunt numărate și de oracol (o verificare a corpusului: dubla inflexiune chiar
 * are două, vârful chiar e vârf).
 */
import { PRAGURI, inflexiuni, varfuriCubica, type ConturO, type CubicaO, type PunctO, type SegmentO, type VarfO } from './biarce.ts';

export const TOLERANTE = [0.001, 0.0001, 0.01, 0.1] as const;

export type CazBiarc = {
  readonly nume: string;
  readonly familie: 'cerc' | 'elipsa' | 'svg' | 'glife' | 'grele' | 'aleatoare' | 'recenzie';
  readonly cub: CubicaO;
  /** Ce trebuie să fie adevărat despre forma cubicei (verificat de oracol pe corpus). */
  readonly inflexiuni?: number;
  readonly varfuri?: number;
};

const P = (x: number, y: number): PunctO => ({ x, y });
const C = (ax: number, ay: number, c1x: number, c1y: number, c2x: number, c2y: number, bx: number, by: number): CubicaO =>
  ({ a: P(ax, ay), c1: P(c1x, c1y), c2: P(c2x, c2y), b: P(bx, by) });

/** Transformarea x' = s·R(θ)·x + (dx, dy), pe toate cele patru puncte. */
function muta(c: CubicaO, theta: number, s: number, dx: number, dy: number): CubicaO {
  const co = Math.cos(theta), si = Math.sin(theta);
  const f = (p: PunctO): PunctO => P(s * (co * p.x - si * p.y) + dx, s * (si * p.x + co * p.y) + dy);
  return { a: f(c.a), c1: f(c.c1), c2: f(c.c2), b: f(c.b) };
}

export const KAPPA = (4 * (Math.SQRT2 - 1)) / 3;

/** Sfertul de elipsă (rx, ry) de la unghiul θ0, în sens trigonometric, rotit cu φ și mutat în (cx, cy). */
export function sfert(cx: number, cy: number, rx: number, ry: number, theta0: number, phi = 0): CubicaO {
  const t1 = theta0 + Math.PI / 2;
  const c0 = Math.cos(theta0), s0 = Math.sin(theta0), c1 = Math.cos(t1), s1 = Math.sin(t1);
  const loc = C(
    rx * c0, ry * s0,
    rx * c0 - KAPPA * rx * s0, ry * s0 + KAPPA * ry * c0,
    rx * c1 + KAPPA * rx * s1, ry * s1 - KAPPA * ry * c1,
    rx * c1, ry * s1,
  );
  return muta(loc, phi, 1, cx, cy);
}

/** Ridicarea EXACTĂ a pătraticei (p0, q, p2) la cubică (ADR 0001). */
export function dinPatratica(p0: PunctO, q: PunctO, p2: PunctO): CubicaO {
  return { a: p0, c1: P(p0.x + (2 / 3) * (q.x - p0.x), p0.y + (2 / 3) * (q.y - p0.y)), c2: P(p2.x + (2 / 3) * (q.x - p2.x), p2.y + (2 / 3) * (q.y - p2.y)), b: p2 };
}

/**
 * O cale SVG cu comenzi ABSOLUTE M, L, C, Q, Z (numerele separate prin spații), scalată cu s și mutată cu (dx, dy) și
 * întoarsă cu y în jos → y în sus dacă `flip` (fontul și SVG-ul au y-ul în sens opus). Întoarce conturul (linii și cubice).
 */
export function cale(d: string, s = 1, dx = 0, dy = 0): ConturO {
  const tok = d.trim().split(/[\s,]+/);
  const varfuri: { p: PunctO; s: SegmentO }[] = [];
  let i = 0;
  let cur: PunctO = P(0, 0);
  let inchis = false;
  const num = (): number => { const v = Number(tok[i++]); if (!Number.isFinite(v)) throw new Error(`cale: număr greșit în ${d}`); return v; };
  const pt = (): PunctO => { const x = num(), y = num(); return P(x * s + dx, y * s + dy); };
  let cmd = '';
  while (i < tok.length) {
    const t = tok[i] as string;
    if (/^[MLCQZ]$/.test(t)) { cmd = t; i++; if (cmd === 'Z') { inchis = true; continue; } }
    if (cmd === 'M') { cur = pt(); cmd = 'L'; continue; }
    if (cmd === 'L') { const p = pt(); varfuri.push({ p: cur, s: { tip: 'L' } }); cur = p; continue; }
    if (cmd === 'C') { const c1 = pt(), c2 = pt(), p = pt(); varfuri.push({ p: cur, s: { tip: 'C', c1, c2 } }); cur = p; continue; }
    if (cmd === 'Q') {
      const q = pt(), p = pt();
      const c = dinPatratica(cur, q, p);
      varfuri.push({ p: cur, s: { tip: 'C', c1: c.c1, c2: c.c2 } });
      cur = p;
      continue;
    }
    throw new Error(`cale: comandă necunoscută ${t}`);
  }
  // Închisă: ultimul punct e chiar primul (calea revine), deci nu mai adaugă un vârf; deschisă: ultimul punct e un vârf.
  const primul = varfuri[0]?.p;
  if (inchis && primul !== undefined && primul.x === cur.x && primul.y === cur.y) return { inchis: true, varfuri };
  varfuri.push({ p: cur, s: { tip: 'L' } });
  return { inchis, varfuri };
}

/** Cubicele unui contur. */
export function cubiceDin(c: ConturO): CubicaO[] {
  const v = c.varfuri;
  const rez: CubicaO[] = [];
  for (let i = 0; i < v.length; i++) {
    const x = v[i] as VarfO;
    if (x.s.tip !== 'C') continue;
    if (!c.inchis && i + 1 >= v.length) continue;
    rez.push({ a: x.p, c1: x.s.c1, c2: x.s.c2, b: (v[(i + 1) % v.length] as VarfO).p });
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------------
// Căile (SVG și glife), scrise de mână.
// ---------------------------------------------------------------------------------------------------------------------

/** Inima: „C 5 5 5 30 5 30” are P2 = P3, „C 95 30 95 5 …” are P1 = P0 (mânerele retrase ale editoarelor). */
export const INIMA = 'M 50 25 C 50 20 42 5 25 5 C 5 5 5 30 5 30 C 5 50 25 70 50 92 C 75 70 95 50 95 30 C 95 30 95 5 75 5 C 58 5 50 20 50 25 Z';
/** Dreptunghiul 40 × 20 cu colțurile rotunjite r = 3 (sferturi κ), pe foaie la (1 200, 600). */
export const COLTURI = (() => {
  const r = 3, k = KAPPA * r;
  return `M 3 0 L 37 0 C ${37 + k} 0 40 ${3 - k} 40 3 L 40 17 C 40 ${17 + k} ${37 + k} 20 37 20 L 3 20 C ${3 - k} 20 0 ${17 + k} 0 17 L 0 3 C 0 ${3 - k} ${3 - k} 0 3 0 Z`;
})();
/** Valul unei firme pe toată foaia 2 440 × 1 220. */
export const VAL = 'M 0 600 C 600 1200 1200 0 2440 610 L 2440 1220 L 0 1220 Z';
/** Glifele, în unități de font (y în sus), aduse la 10 mm (× 0,01). */
export const GLIFA_S = 'M 620 560 C 600 640 540 700 440 700 C 330 700 260 640 260 560 C 260 480 320 445 430 410 C 560 370 640 320 640 210 C 640 90 550 20 430 20 C 300 20 210 80 190 190';
export const GLIFA_O = 'M 500 0 C 780 0 900 200 900 400 C 900 600 780 800 500 800 C 220 800 100 600 100 400 C 100 200 220 0 500 0 Z';
export const GLIFA_E = 'M 120 300 L 560 300 C 560 450 470 560 340 560 C 200 560 100 440 100 280 C 100 120 210 0 350 0 C 450 0 520 40 560 110';
export const GLIFA_G = 'M 300 0 C 520 0 600 60 600 160 C 600 250 520 290 300 290 C 180 290 140 320 140 360 C 140 380 150 395 170 405';
/** Burta lui „a”, cu o capcană de cerneală (rază de ~0,1 mm la 10 mm). */
export const GLIFA_A = 'M 520 0 L 520 330 C 520 470 450 520 330 520 C 230 520 160 480 140 400 C 230 405 300 400 330 380 C 345 370 350 362 352 350 C 250 340 100 300 100 150 C 100 50 170 0 260 0 C 380 0 450 60 470 120';
/** Litera „o” dintr-un font TrueType: doar pătratice (Q), ridicate exact la cubice. */
export const GLIFA_O_TT = 'M 500 0 Q 800 0 800 350 Q 800 700 500 700 Q 200 700 200 350 Q 200 0 500 0 Z';

// ---------------------------------------------------------------------------------------------------------------------
// Cazurile.
// ---------------------------------------------------------------------------------------------------------------------

function cazuri(): CazBiarc[] {
  const rez: CazBiarc[] = [];
  const pune = (nume: string, familie: CazBiarc['familie'], cub: CubicaO, extra: { inflexiuni?: number; varfuri?: number } = {}): void => {
    rez.push({ nume, familie, cub, ...extra });
  };
  // Cercuri și elipse.
  for (const [r, cx, cy] of [[0.005, 0.01, 0.01], [1, 5, 5], [25, 100, 100], [600, 1220, 610], [1220, 1220, 1220]] as const) {
    pune(`sfert de cerc r = ${r}`, 'cerc', sfert(cx, cy, r, r, 0));
    pune(`sfert de cerc r = ${r}, rotit 0,3 rad`, 'cerc', sfert(cx, cy, r, r, 1.2, 0.3));
  }
  pune('sfert de elipsă 100 × 30', 'elipsa', sfert(300, 200, 100, 30, 0));
  pune('sfert de elipsă 100 × 30, al doilea', 'elipsa', sfert(300, 200, 100, 30, Math.PI / 2, 0.7));
  pune('sfert de elipsă 1 200 × 50', 'elipsa', sfert(1220, 610, 1200, 50, Math.PI));
  pune('sfert de elipsă 0,01 × 0,004', 'elipsa', sfert(0.02, 0.02, 0.01, 0.004, 0, 2));
  // Căile SVG și glifele.
  const din = (nume: string, familie: CazBiarc['familie'], d: string, s: number, dx: number, dy: number): void => {
    cubiceDin(cale(d, s, dx, dy)).forEach((c, i) => pune(`${nume}, cubica ${i + 1}`, familie, c));
  };
  din('inima', 'svg', INIMA, 1, 100, 100);
  din('colțurile rotunjite', 'svg', COLTURI, 1, 1200, 600);
  din('valul firmei 2 440', 'svg', VAL, 1, 0, 0);
  din('glifa S', 'glife', GLIFA_S, 0.01, 10, 10);
  din('glifa O', 'glife', GLIFA_O, 0.01, 30, 10);
  din('glifa e', 'glife', GLIFA_E, 0.01, 50, 10);
  din('glifa g', 'glife', GLIFA_G, 0.01, 70, 10);
  din('glifa a', 'glife', GLIFA_A, 0.01, 90, 10);
  din('glifa o (TrueType, pătratice)', 'glife', GLIFA_O_TT, 0.01, 110, 10);
  din('glifa S la 300 mm', 'glife', GLIFA_S, 0.3, 500, 500);
  // Cele grele (§8) și vecinele lor.
  pune('vârful exact (simetric, t = ½)', 'grele', C(0, 0, 10, 10, 0, 10, 10, 0), { varfuri: 1 });
  pune('vârful exact (t = ¼)', 'grele', C(0, 0, 10, 0, -2, 4, -20, -20), { varfuri: 1 });
  pune('vârful de 0,01 mm', 'grele', C(0, 0, 0.01, 0.01, 0, 0.01, 0.01, 0), { varfuri: 1 });
  pune('vârful de 2 440 mm', 'grele', C(0, 0, 2440, 2440, 0, 2440, 2440, 0), { varfuri: 1 });
  // P3.x neschimbat: x′ are o rădăcină dublă în ½, iar y′ = 0 la ½ + 1,25e-5, deci min |B′| / max |B′| ≈ 4,5e-10: vârf exact
  // până la rotunjire (pragul oracolului e 1e-9).
  pune('aproape vârful (P3 mutat cu 0,001: vârf până la rotunjire)', 'grele', C(0, 0, 10, 10, 0, 10, 10, 0.001), { varfuri: 1 });
  pune('vârful rotunjit (P3 mutat cu 0,1)', 'grele', C(0, 0, 10, 10, 0, 10, 10, 0.1), { varfuri: 0 });
  pune('aproape vârful de 2 440 mm (P3 mutat cu 0,01)', 'grele', C(0, 0, 2440, 2440, 0, 2440, 2440, 0.01), { varfuri: 1 });
  pune('vârful rotunjit, P3 mutat cu 0,03 (sub pragul practic, peste cel exact)', 'grele', C(0, 0, 10, 10, 0, 10, 10, 0.03), { varfuri: 0 });
  pune('bucla', 'grele', C(0, 0, 15, 10, -5, 10, 10, 0), { varfuri: 0 });
  pune('bucla închisă (a = b)', 'grele', C(5, 5, 25, 25, -15, 25, 5, 5), { varfuri: 0 });
  pune('bucla de 2 440 mm', 'grele', C(0, 0, 3660, 2440, -1220, 2440, 2440, 0));
  pune('mânerul retras P1 = P0', 'grele', C(0, 0, 0, 0, 10, 10, 20, 0));
  pune('mânerul retras P2 = P3', 'grele', C(0, 0, 10, 10, 20, 0, 20, 0));
  pune('ambele mânere retrase (dreaptă cu viteză neuniformă)', 'grele', C(0, 0, 0, 0, 20, 5, 20, 5));
  pune('c1 = c2', 'grele', C(0, 0, 5, 10, 5, 10, 10, 0));
  pune('aproape dreaptă, arc la 0,0005', 'grele', C(0, 0, 33, 0.0005, 66, 0.0005, 100, 0), { inflexiuni: 0 });
  pune('aproape dreaptă, arc la 0,0015', 'grele', C(0, 0, 33, 0.0015, 66, 0.0015, 100, 0), { inflexiuni: 0 });
  pune('aproape dreaptă, S la ±0,0004', 'grele', C(0, 0, 33, 0.0004, 66, -0.0004, 100, 0), { inflexiuni: 1 });
  pune('aproape dreaptă, arc la 0,02 pe 2 440 mm', 'grele', C(0, 0, 813, 0.02, 1626, 0.02, 2440, 0));
  pune('dreapta exactă', 'grele', C(0, 0, 3, 0, 7, 0, 10, 0));
  pune('dreapta exactă la 45°', 'grele', C(1, 1, 3, 3, 7, 7, 10, 10));
  pune('dreapta care se întoarce (c1 dincolo de b)', 'grele', C(0, 0, 20, 0, -10, 0, 10, 0));
  pune('dreapta cu mânerele încrucișate', 'grele', C(0, 0, 9, 0, 1, 0, 10, 0));
  pune('dubla inflexiune', 'grele', C(0, 0, 0, 10, 10, 10, -3, 8), { inflexiuni: 2 });
  pune('dubla inflexiune de 0,01 mm', 'grele', C(0, 0, 0, 0.01, 0.01, 0.01, -0.003, 0.008), { inflexiuni: 2 });
  pune('dubla inflexiune de 2 440 mm', 'grele', C(0, 0, 0, 2440, 2440, 2440, -732, 1952), { inflexiuni: 2 });
  pune('S de 0,01 mm', 'grele', C(0, 0, 0.0033, 0.004, 0.0066, -0.004, 0.01, 0), { inflexiuni: 1 });
  pune('S de 2 440 mm', 'grele', C(0, 0, 813, 1000, 1626, -1000, 2440, 0), { inflexiuni: 1 });
  pune('S de 2 440 mm, mutat la (2 440, 1 220)', 'grele', muta(C(0, 0, 813, 1000, 1626, -1000, 2440, 0), 0, 1, 2440, 1220));
  pune('cubica de 1e-6 mm', 'grele', C(0, 0, 3e-7, 1e-7, 7e-7, -1e-7, 1e-6, 0));
  pune('arc strâns (rază ~0,05 mm)', 'grele', C(0, 0, 0.3, 0, 0.5, 0.02, 0.52, 0.2));
  // Recenzia ADR-ului (familiile ei, nu codul ei).
  pune('mânerul întors (0,0), (−1,0), (40,0), (50,0)', 'recenzie', C(0, 0, -1, 0, 40, 0, 50, 0), { varfuri: 1 });
  pune('mânerul depășit la capăt (oglinda: (0,0), (10,0), (51,0), (50,0))', 'recenzie', C(0, 0, 10, 0, 51, 0, 50, 0), { varfuri: 1 });
  pune('mânerul întors de 1 000 mm (0,0), (−16,0), (500,0), (1 000,0)', 'recenzie', C(0, 0, -16, 0, 500, 0, 1000, 0), { varfuri: 1 });
  pune('mânerul întors, aproape drept (y de 0,0003)', 'recenzie', C(0, 0, -1, 0.0003, 40, 0.0002, 50, 0));
  pune('mânerul întors pe 2 440 mm, aproape drept', 'recenzie', C(0, 0, -40, 0.005, 1200, 0.003, 2440, 0));
  pune('mânerul întors, înclinat la 30°', 'recenzie', muta(C(0, 0, -1, 0.0003, 40, 0.0002, 50, 0), Math.PI / 6, 1, 300, 200));
  pune('vârf exact cu coordonate oarecare (recenzie)', 'recenzie', C(4.79980349125729, 12.249421487953235, -18.10314736242403, -1.3186210573296702, 18.655791894120785, 21.340242969462068, 7.598275977733781, 9.4042605391192), { varfuri: 1 });
  {
    // Vârfuri construite: P0, P1, P2 la întâmplare și P3 ales ca B′(t0) = 0, pentru t0 în (0,1, 0,9).
    const r = aleator(0xc05);
    for (let k = 0; k < 6; k++) {
      const s = 10 ** (Math.log10(0.05) + r() * (Math.log10(2000) - Math.log10(0.05)));
      const o = r() * 400;
      const p0 = P(o + r() * s, o + r() * s), p1 = P(o + r() * s, o + r() * s), p2 = P(o + r() * s, o + r() * s);
      const t0 = 0.1 + 0.8 * r(), m = 1 - t0;
      const p3 = P(
        p2.x - (m * m * (p1.x - p0.x) + 2 * m * t0 * (p2.x - p1.x)) / (t0 * t0),
        p2.y - (m * m * (p1.y - p0.y) + 2 * m * t0 * (p2.y - p1.y)) / (t0 * t0),
      );
      pune(`vârf construit ${k} (t0 = ${t0.toFixed(3)}, scara ${s.toPrecision(3)} mm)`, 'recenzie', { a: p0, c1: p1, c2: p2, b: p3 }, { varfuri: 1 });
    }
  }
  pune('buclă mică lângă un vârf (recenzie)', 'recenzie', C(177.8391647733072, 143.8190746647097, 525.94826517736, 298.6413519111187, -435.6086454799504, -134.48545922208658, -251.41297334490028, 6.831723728673467));
  pune('inflexiune prost condiționată (recenzie)', 'recenzie', C(78.889, 7.649, -103.209, 47.312, 2492.535, -518.071, 2462.991, -511.636));
  for (const R of [9000, 15000, 50000]) pune(`arc lin de rază ${R} pe coarda 2 440`, 'recenzie', arcPeCoarda(R, 2440, 0, 610));
  pune('arc lin de rază 15 000, rotit, pe 2 440', 'recenzie', muta(arcPeCoarda(15000, 2440, 0, 0), 0.4, 1, 100, 100));
  // Aleatoare, cu sămânța fixă.
  const rnd = aleator(0x27a);
  for (let k = 0; k < 40; k++) {
    const s = 10 ** (Math.log10(0.01) + rnd() * (Math.log10(2440) - Math.log10(0.01)));
    const ox = rnd() * (2440 - s), oy = rnd() * (2440 - s);
    const q = (): number => rnd() * s;
    pune(`aleatoare ${k} (scara ${s.toPrecision(3)} mm)`, 'aleatoare', C(ox + q(), oy + q(), ox + q(), oy + q(), ox + q(), oy + q(), ox + q(), oy + q()));
  }
  return rez;
}

/** Cubica unui arc de cerc de rază R pe coarda L (de la (x0, y0) spre +x, bombat în sus): mânerul (4/3)·tan(θ/4)·R. */
export function arcPeCoarda(R: number, L: number, x0: number, y0: number): CubicaO {
  const phi = Math.asin(L / 2 / R);
  const h = (4 / 3) * Math.tan(phi / 2) * R;
  return C(x0, y0, x0 + h * Math.cos(phi), y0 + h * Math.sin(phi), x0 + L - h * Math.cos(phi), y0 + h * Math.sin(phi), x0 + L, y0);
}

/** Cazurile cu toleranța lor (biarcul unic al recenziei: vârful abaterii între eșantioane, 1,13 × tol înainte de §6). */
export const CU_TOLERANTA_PROPRIE: readonly { readonly nume: string; readonly cub: CubicaO; readonly tol: number }[] = [
  {
    nume: 'un singur biarc, vârful abaterii între eșantioane (recenzie), la tol = 10,671…',
    cub: C(56.62638258913084, 92.79311068427265, 78.49125098736287, 2.8565286603443325, 10.889276491046695, 92.4084531930849, 53.214604817947006, 55.56575573865025),
    tol: 10.671023297107523,
  },
];

/** mulberry32: un PRNG mic, determinist, în [0, 1). */
export function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CAZURI: readonly CazBiarc[] = cazuri();

/** Verificarea corpusului: cazurile care declară inflexiuni / vârfuri chiar le au. */
export function verificaCorpusul(): string[] {
  const p: string[] = [];
  for (const c of CAZURI) {
    if (c.inflexiuni !== undefined) {
      const n = new Set(inflexiuni(c.cub).map((t) => t.toFixed(9))).size;
      if (n !== c.inflexiuni) p.push(`${c.nume}: ${n} inflexiuni, declarate ${c.inflexiuni}`);
    }
    const v = varfuriCubica(c.cub, PRAGURI.varfExact).length;
    if (c.varfuri !== undefined && v !== c.varfuri) p.push(`${c.nume}: ${v} vârfuri exacte, declarate ${c.varfuri}`);
  }
  return p;
}

// ---------------------------------------------------------------------------------------------------------------------
// Degeneratele și refuzurile.
// ---------------------------------------------------------------------------------------------------------------------

export const DEGENERATE: readonly { readonly nume: string; readonly cub: CubicaO }[] = [
  { nume: 'toate punctele egale', cub: C(5, 5, 5, 5, 5, 5, 5, 5) },
  { nume: 'toate punctele egale, în origine', cub: C(0, 0, 0, 0, 0, 0, 0, 0) },
  { nume: 'toate la sub 3e-10 unul de altul', cub: C(100, 100, 100 + 2e-10, 100, 100, 100 + 2e-10, 100 + 1e-10, 100 + 1e-10) },
  { nume: 'toate egale, la 2 440', cub: C(2440, 1220, 2440, 1220, 2440, 1220, 2440, 1220) },
];

export type CazRefuz = { readonly nume: string; readonly cub: CubicaO; readonly tol: number };

const S_REF = C(0, 0, 3, 4, 7, -4, 10, 0);

/**
 * Sub rezoluția numerică (§5): la 1e6 mm de origine un ulp e 1,16e-10 mm. La tol = 1e-11 niciun lanț nu încape: vârfurile
 * lui sunt numere reprezentabile, iar o coardă care stă la 1e-11 de o curbă cu curbura ~0,1/mm are cel mult ~3e-5 mm, deci
 * ar trebui peste 3·10⁵ bucăți. Refuzul e singurul răspuns corect; motivul lui e al rezoluției, nu al plafonului.
 */
export const SUB_REZOLUTIE: readonly CazRefuz[] = [
  { nume: 'S de 10 mm la 1e6 mm de origine, tol = 1e-11 (sub rezoluția numerică)', cub: muta(S_REF, 0, 1, 1e6, 1e6), tol: 1e-11 },
  { nume: 'S de 10 mm la 1e6 mm de origine, tol = 1e-10 (exemplul ADR-ului)', cub: muta(S_REF, 0, 1, 1e6, 1e6), tol: 1e-10 },
];

/** Plafonul, pentru comparația motivelor: aceeași cubică în origine, la 1e-11 (rezolvabilă, dar peste 4 096 de bucăți). */
export const PLAFON_LA_ORIGINE: CazRefuz = { nume: 'S de 10 mm în origine, tol = 1e-11 (plafonul)', cub: S_REF, tol: 1e-11 };

export const REFUZURI: readonly CazRefuz[] = (() => {
  const rez: CazRefuz[] = [];
  for (const tol of [0, -0, -0.001, -Number.MIN_VALUE, NaN, Infinity, -Infinity]) {
    rez.push({ nume: `tol = ${Object.is(tol, -0) ? '−0' : String(tol)}`, cub: S_REF, tol });
    rez.push({ nume: `tol = ${Object.is(tol, -0) ? '−0' : String(tol)}, pe o cubică degenerată`, cub: C(1, 1, 1, 1, 1, 1, 1, 1), tol });
  }
  const chei = ['a', 'c1', 'c2', 'b'] as const;
  for (const ch of chei) {
    for (const ax of ['x', 'y'] as const) {
      for (const v of [NaN, Infinity, -Infinity]) {
        const p = { ...S_REF[ch], [ax]: v };
        rez.push({ nume: `${ch}.${ax} = ${String(v)}`, cub: { ...S_REF, [ch]: p }, tol: 0.001 });
      }
    }
  }
  // La 1e-300 niciun lanț nu încape: o bucată are coarda de cel puțin un ulp (≥ 1,1e-13 mm lângă 1 000), iar pe o lungime
  // nenulă o cubică ne-dreaptă se abate de la orice cerc sau dreaptă cu mult peste 1e-300. Singurul răspuns corect e refuzul.
  rez.push({ nume: 'tol = 1e-300 (niciun lanț nu încape: plafonul sau alt refuz explicit)', cub: muta(S_REF, 0, 1, 1000, 1000), tol: 1e-300 });
  rez.push({ nume: 'tol = 5e-324 (cel mai mic număr pozitiv)', cub: muta(S_REF, 0, 1, 1000, 1000), tol: Number.MIN_VALUE });
  rez.push(...SUB_REZOLUTIE);
  return rez;
})();

/**
 * Cazurile de lângă plafon: toleranțe finite și pozitive, dar foarte mici. Răspunsul corect e fie un lanț valid de cel
 * mult 4 096 de bucăți, fie un refuz cu motiv (§5); niciodată un lanț peste toleranță (trunchierea tăcută).
 */
export const LANGA_PLAFON: readonly CazRefuz[] = [
  { nume: 'S de 10 mm la 1e-7', cub: S_REF, tol: 1e-7 },
  { nume: 'S de 10 mm la 1e-9', cub: S_REF, tol: 1e-9 },
  { nume: 'S de 10 mm la 1e-10', cub: S_REF, tol: 1e-10 },
  { nume: 'S de 10 mm la 1e-11', cub: S_REF, tol: 1e-11 },
  { nume: 'S de 2 440 mm la 1e-6', cub: C(0, 0, 813, 1000, 1626, -1000, 2440, 0), tol: 1e-6 },
  { nume: 'dubla inflexiune de 2 440 mm la 1e-6', cub: C(0, 0, 0, 2440, 2440, 2440, -732, 1952), tol: 1e-6 },
];

// ---------------------------------------------------------------------------------------------------------------------
// Contururile întregi, pentru `conturFaraCubice`.
// ---------------------------------------------------------------------------------------------------------------------

export type CazContur = { readonly nume: string; readonly contur: ConturO };

export const CONTURURI: readonly CazContur[] = [
  { nume: 'inima (închisă, doar cubice)', contur: cale(INIMA, 1, 100, 100) },
  { nume: 'colțurile rotunjite (închis, linii și cubice)', contur: cale(COLTURI, 1, 1200, 600) },
  { nume: 'valul firmei (închis, cubică și linii)', contur: cale(VAL) },
  { nume: 'glifa S (deschisă)', contur: cale(GLIFA_S, 0.01, 10, 10) },
  { nume: 'glifa e (deschisă, linie și cubice)', contur: cale(GLIFA_E, 0.01, 50, 10) },
  { nume: 'glifa o TrueType (închisă, pătratice ridicate)', contur: cale(GLIFA_O_TT, 0.01, 110, 10) },
  {
    nume: 'amestec: arc, linie, cubică, arc mare, cubică degenerată, cubică (închis)',
    contur: {
      inchis: true,
      varfuri: [
        { p: P(0, 0), s: { tip: 'A', bulge: 0.4 } },
        { p: P(10, 0), s: { tip: 'L' } },
        { p: P(10, 10), s: { tip: 'C', c1: P(10, 15), c2: P(5, 20) } },
        { p: P(0, 20), s: { tip: 'A', bulge: -1.5 } },
        { p: P(-5, 15), s: { tip: 'C', c1: P(-5, 15), c2: P(-5, 15) } },
        { p: P(-5, 15), s: { tip: 'C', c1: P(-8, 10), c2: P(3, 5) } },
      ],
    },
  },
  {
    nume: 'deschis: cubică, arc, cubică, linie',
    contur: {
      inchis: false,
      varfuri: [
        { p: P(0, 0), s: { tip: 'C', c1: P(2, 5), c2: P(8, -5) } },
        { p: P(10, 0), s: { tip: 'A', bulge: 0.2 } },
        { p: P(20, 0), s: { tip: 'C', c1: P(25, 10), c2: P(15, 10) } },
        { p: P(20, 5), s: { tip: 'L' } },
        { p: P(25, 5), s: { tip: 'L' } },
      ],
    },
  },
  { nume: 'fără cubice (închis, linii și arc)', contur: { inchis: true, varfuri: [{ p: P(0, 0), s: { tip: 'L' } }, { p: P(10, 0), s: { tip: 'A', bulge: 0.5 } }, { p: P(10, 10), s: { tip: 'L' } }] } },
];

/** Contururile care trebuie refuzate (o cubică cu un punct nefinit, sau o toleranță rea cu cel puțin o cubică). */
export const CONTURURI_REFUZ: readonly { readonly nume: string; readonly contur: ConturO; readonly tol: number }[] = [
  { nume: 'c1 al unei cubice = NaN', contur: { inchis: true, varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(NaN, 1), c2: P(2, 1) } }, { p: P(3, 0), s: { tip: 'L' } }] }, tol: 0.001 },
  { nume: 'c2 al unei cubice = ∞', contur: { inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'L' } }, { p: P(3, 0), s: { tip: 'C', c1: P(4, 1), c2: P(Infinity, 1) } }, { p: P(6, 0), s: { tip: 'L' } }] }, tol: 0.001 },
  { nume: 'capătul cubicei = NaN', contur: { inchis: true, varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(1, 1), c2: P(2, 1) } }, { p: P(NaN, 0), s: { tip: 'L' } }] }, tol: 0.001 },
  { nume: 'tol = 0, cu o cubică', contur: cale(INIMA, 1, 100, 100), tol: 0 },
  { nume: 'tol = NaN, cu o cubică', contur: cale(GLIFA_S, 0.01, 10, 10), tol: NaN },
  { nume: 'tol = −1, cu o cubică', contur: cale(COLTURI, 1, 1200, 600), tol: -1 },
  { nume: 'tol = ∞, cu o cubică', contur: cale(VAL), tol: Infinity },
];
