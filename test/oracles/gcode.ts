/**
 * ORACOLUL G-code (din sonda s4, rescris): citește TEXTUL programului, cu ZERO importuri din `src/` și fără cod comun
 * cu postul. Regulile controlerului sunt propria lui copie, din documentația GRBL (s8, Anexa A.1), nu contractul din
 * `src/post/`: dacă amândouă ar citi același fișier, o greșeală acolo ar trece prin amândouă.
 */

/** Codurile pe care GRBL 1.1 le acceptă (s8 A.1). Orice alt cod dă `error:20` pe controler. */
export const GRBL_G: ReadonlySet<number> = new Set([
  0, 1, 2, 3, 4, 10, 17, 18, 19, 20, 21, 28, 30, 38.2, 38.3, 38.4, 38.5, 40, 43.1, 49, 53, 54, 55, 56, 57, 58, 59, 61,
  80, 90, 91, 91.1, 92, 92.1, 93, 94,
]);
export const GRBL_M: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 8, 9, 30]);
/** Plafonul de linie al proiectului (T9): 70 de octeți, sub cele 79 utile ale GRBL și sub bufferul de 128. */
export const LINIA_MAXIMA = 70;
/** Cuvintele care trebuie să aibă punctul zecimal scris (pe Syntec, `X10` înseamnă 0,010 mm). */
const CU_PUNCT: ReadonlySet<string> = new Set(['X', 'Y', 'Z', 'I', 'J', 'K', 'R', 'F', 'P']);

export type Problema = { readonly linia: number; readonly mesaj: string };

export type Punct3 = readonly [number, number, number];

export type Mutare = {
  readonly cod: 0 | 1 | 2 | 3;
  readonly linia: number;
  /** Startul e cunoscut doar după ce programul a scris toate trei axele: la pornire, scula e oriunde. */
  readonly startCunoscut: boolean;
  readonly a: Punct3;
  readonly b: Punct3;
  /** Pentru G2 / G3: I și J citite din text; centrul văzut de controler e startul + (I, J). */
  readonly i?: number;
  readonly j?: number;
};

export type Eveniment =
  | { readonly tip: 'mutare'; readonly m: Mutare }
  | { readonly tip: 'ax'; readonly pornit: boolean; readonly turatie: number; readonly linia: number }
  | { readonly tip: 'pauza'; readonly secunde: number; readonly linia: number };

export type Citire = { readonly evenimente: readonly Eveniment[]; readonly probleme: readonly Problema[] };

const CODOR = new TextEncoder();

/**
 * Citește programul linie cu linie. Ce nu e GRBL valid (cod necunoscut, linie prea lungă, număr fără punct, G91, G20,
 * alt plan decât G17, arc cu R) intră în `probleme`: sunt încălcări ale invariantei 6.
 */
export function citeste(text: string): Citire {
  const evenimente: Eveniment[] = [];
  const probleme: Problema[] = [];
  let x = 0, y = 0, z = 0;
  let cunoscutXY = false;
  let cunoscutZ = false;
  let mod: 0 | 1 | 2 | 3 = 0;
  let turatie = 0;
  const linii = text.split('\n');
  if (linii.at(-1) === '') linii.pop();

  linii.forEach((brut, idx) => {
    const nr = idx + 1;
    const problema = (mesaj: string): void => { probleme.push({ linia: nr, mesaj }); };
    if (CODOR.encode(brut).length > LINIA_MAXIMA) problema(`linia are peste ${LINIA_MAXIMA} de octeți`);
    if (/[^\x20-\x7e]/.test(brut)) problema('caracter în afara ASCII');

    // Faza 1: cuvintele liniei, fără comentarii.
    let linie = brut.replace(/\([^)]*\)/g, ' ');
    const pv = linie.indexOf(';');
    if (pv >= 0) linie = linie.slice(0, pv);
    if (/[()]/.test(linie)) problema('paranteză de comentariu neînchisă');
    const cuvinte = [...linie.matchAll(/([A-Za-z])\s*([-+]?[\d.]+)/g)].map((m) => [(m[1] ?? '').toUpperCase(), m[2] ?? ''] as const);
    const ramas = linie.replace(/([A-Za-z])\s*([-+]?[\d.]+)/g, '').trim();
    if (ramas) problema(`text necitibil: „${ramas}”`);

    const val: Record<string, number> = {};
    const g: number[] = [];
    const mCoduri: number[] = [];
    for (const [litera, text] of cuvinte) {
      const v = Number(text);
      if (!Number.isFinite(v)) { problema(`număr nevalid: ${litera}${text}`); continue; }
      if (CU_PUNCT.has(litera) && !text.includes('.')) problema(`${litera}${text} fără punct zecimal`);
      if (litera === 'G') { if (!GRBL_G.has(v)) problema(`G${text} nu există în GRBL 1.1 (error:20)`); g.push(v); }
      else if (litera === 'M') { if (!GRBL_M.has(v)) problema(`M${text} nu există în GRBL 1.1 (error:20)`); mCoduri.push(v); }
      else val[litera] = v;
    }

    // Faza 2: ordinea de execuție a controlerului: turația, axul, pauza, apoi mișcarea.
    if (val['S'] !== undefined) turatie = val['S'];
    for (const cod of mCoduri) {
      if (cod === 3 || cod === 4) evenimente.push({ tip: 'ax', pornit: true, turatie, linia: nr });
      if (cod === 5 || cod === 2 || cod === 30) evenimente.push({ tip: 'ax', pornit: false, turatie: 0, linia: nr });
    }
    for (const cod of g) {
      if (cod === 91) problema('G91 (incremental): postul scrie doar absolut');
      if (cod === 20) problema('G20 (inch) într-un program în mm');
      if (cod === 18 || cod === 19) problema(`G${cod}: arcele din v1 sunt doar în G17`);
      if (cod === 0 || cod === 1 || cod === 2 || cod === 3) mod = cod;
    }
    if (g.includes(4)) {
      const p = val['P'];
      if (p === undefined) problema('G4 fără P');
      else evenimente.push({ tip: 'pauza', secunde: p, linia: nr });
      return;
    }
    const areXY = val['X'] !== undefined || val['Y'] !== undefined;
    if (!areXY && val['Z'] === undefined) return;
    if (areXY && !cunoscutXY && (val['X'] === undefined || val['Y'] === undefined)) problema('prima mișcare în XY nu dă ambele axe');
    const b: Punct3 = [val['X'] ?? x, val['Y'] ?? y, val['Z'] ?? z];
    const a: Punct3 = [x, y, z];
    if (mod === 2 || mod === 3) {
      if (val['R'] !== undefined) problema('arc cu R: postul scrie I / J');
      evenimente.push({ tip: 'mutare', m: { cod: mod, linia: nr, startCunoscut: cunoscutXY && cunoscutZ, a, b, i: val['I'] ?? 0, j: val['J'] ?? 0 } });
    } else {
      evenimente.push({ tip: 'mutare', m: { cod: mod, linia: nr, startCunoscut: cunoscutXY && cunoscutZ, a, b } });
    }
    [x, y, z] = b;
    if (areXY) cunoscutXY = true;
    if (val['Z'] !== undefined) cunoscutZ = true;
  });
  return { evenimente, probleme };
}

/**
 * Regula de arc a GRBL 1.1, rescrisă din `gcode.c` și `motion_control.c` (s8 §4.2), în float32 ca pe controler:
 * - `error:33` dacă |raza până la capăt − raza din I/J| > 0,005 mm și (> 0,5 mm sau > 0,1 % din rază);
 * - unghiul din atan2; sub 5·10⁻⁷ rad în sensul cerut, GRBL adaugă 2π, adică un cerc întreg.
 */
export function regulaArcGrbl(m: Mutare): { readonly eroare33: boolean; readonly unghi: number; readonly raza: number } {
  const F = Math.fround;
  const [sx, sy] = m.a;
  const [ex, ey] = m.b;
  const i = F(m.i ?? 0), j = F(m.j ?? 0);
  const cx = F(F(sx) + i), cy = F(F(sy) + j);
  const r = F(Math.hypot(i, j));
  const rtx = F(F(ex) - cx), rty = F(F(ey) - cy);
  const delta = Math.abs(F(F(Math.hypot(rtx, rty)) - r));
  const eroare33 = delta > 0.005 && (delta > 0.5 || delta > 0.001 * r);
  const r0x = -i, r0y = -j;
  let unghi = F(Math.atan2(F(F(r0x * rty) - F(r0y * rtx)), F(F(r0x * rtx) + F(r0y * rty))));
  if (m.cod === 2) { if (unghi >= -5e-7) unghi -= 2 * Math.PI; } else if (unghi <= 5e-7) unghi += 2 * Math.PI;
  return { eroare33, unghi, raza: r };
}

/** Puncte de-a lungul unei mișcări, la cel mult `pas` mm (în XY, iar pe plonjări în Z), capetele incluse. */
export function esantioane(m: Mutare, pas: number): Punct3[] {
  const [x0, y0, z0] = m.a;
  const [x1, y1, z1] = m.b;
  if (m.cod === 0 || m.cod === 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.hypot(x1 - x0, y1 - y0), Math.abs(z1 - z0)) / pas));
    return Array.from({ length: n + 1 }, (_, k) => [x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, z0 + ((z1 - z0) * k) / n] as const);
  }
  const { unghi, raza } = regulaArcGrbl(m);
  const cx = x0 + (m.i ?? 0), cy = y0 + (m.j ?? 0);
  const u0 = Math.atan2(y0 - cy, x0 - cx);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(unghi) * raza, Math.abs(z1 - z0)) / pas));
  return Array.from({ length: n + 1 }, (_, k) => {
    if (k === n) return [x1, y1, z1] as const;
    const u = u0 + (unghi * k) / n;
    return [cx + raza * Math.cos(u), cy + raza * Math.sin(u), z0 + ((z1 - z0) * k) / n] as const;
  });
}
