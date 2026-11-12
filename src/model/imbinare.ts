/**
 * Îmbinarea (ADR 0181 §6, felia 10.3↑j): pe o tăietură dreaptă, marginea nouă a bucăților urmează un model în locul liniei:
 * zigzag, val, dinți drepți, coadă de rândunică sau puzzle, cu pasul, înălțimea (de la vârful de jos la cel de sus) și raza
 * colțurilor. Pură și mică (o folosesc și workerul, și previzualizarea): drumul pe o coardă de lungime l, în reperul ei
 * (t de-a lungul, s spre stânga), de la (0, 0) la (l, 0).
 *
 * - **Dinții întregi** stau la mijlocul coardei: n = ⌊l / pas − 1⌋, iar ce rămâne se împarte egal la capete, cel puțin o
 *   jumătate de pas fiecare (niciun dinte nu e tăiat de marginea formei). Fiecare model e simetric față de mijlocul lui (o
 *   rotire cu 180°), deci cele două bucăți ale unei forme simetrice au aceeași arie.
 * - **Raza:** fiecare colț e al ambelor bucăți (scobit într-una, bombat în cealaltă), deci o freză de raza dată le taie pe
 *   amândouă doar dacă nicio rază a drumului nu e mai mică: la zigzag, dinți și coadă, colțurile se rotunjesc tangent cu ea
 *   (raza 0: colțuri ascuțite); valul și puzzle-ul sunt făcute din arce tangente, iar arcele lor trebuie să aibă cel puțin raza
 *   dată. Altfel `imbinare-raza`.
 * - **Modelele:** zigzagul urcă și coboară în linie dreaptă; dinții drepți, cu laturile perpendiculare; coada de rândunică,
 *   cu laturile înclinate 1 : 6, ca fiecare dinte să se lărgească spre vârful lui (ambele bucăți se prind); valul, din cocoașe
 *   alternante, fiecare din trei arce de aceeași rază, (pas² / 16 + înălțime² / 4) / (2 · înălțime), tangente între ele și la
 *   linie; puzzle-ul, din noduri alternante, fiecare cu capul de rază înălțime / 4 și gâtul din două arce de raza dată,
 *   depărtate cu √(înălțime · rază) de mijloc (capul e mai lat decât gâtul, cât timp înălțimea trece de patru raze).
 */

export const MODELE_IMBINARE = ['zigzag', 'val', 'dinti', 'coada', 'puzzle'] as const;
export type ModelImbinare = (typeof MODELE_IMBINARE)[number];
export type Imbinare = { readonly model: ModelImbinare; readonly pas: number; readonly inaltime: number; readonly raza: number };

/** Un vârf al drumului, în reperul coardei; `b`: bulge-ul segmentului care pleacă din el (0: latură dreaptă). */
export type VarfImbinare = { readonly t: number; readonly s: number; readonly b: number };

/** Cele mai mari valori primite, în mm. */
export const IMBINARE_MAXIMA = 1000;

/** Valorile bune: modelul cunoscut, pasul și înălțimea pozitive, raza cel puțin 0, toate cel mult 1 000 mm. */
export function imbinareBuna(im: Imbinare): boolean {
  const bun = (x: number, zero: boolean): boolean => (zero ? x >= 0 : x > 0) && x <= IMBINARE_MAXIMA;
  return (MODELE_IMBINARE as readonly string[]).includes(im.model) && bun(im.pas, false) && bun(im.inaltime, false) && bun(im.raza, true);
}

/** Câți dinți întregi încap pe o coardă de lungime l și marginea dreaptă de la fiecare capăt. */
export function dintiPe(l: number, pas: number): { readonly n: number; readonly margine: number } {
  const n = Math.max(0, Math.floor(l / pas - 1 + 1e-9));
  return { n, margine: (l - n * pas) / 2 };
}

type P = { readonly t: number; readonly s: number };

/** Bulge-ul arcului de la a la b în jurul centrului c, în sens trigonometric sau orar. */
function bulge(a: P, b: P, c: P, trig: boolean): number {
  let u = Math.atan2(b.s - c.s, b.t - c.t) - Math.atan2(a.s - c.s, a.t - c.t);
  if (trig) while (u <= 0) u += 2 * Math.PI;
  else while (u >= 0) u -= 2 * Math.PI;
  return Math.tan(u / 4);
}

/**
 * Polilinia cu colțurile rotunjite tangent cu raza r (arcul fiecărui colț are unghiul cotiturii lui), sau `imbinare-raza`
 * dacă rotunjirile de la capetele unei laturi nu încap pe ea.
 */
function rotunjita(p: readonly P[], r: number): VarfImbinare[] | 'imbinare-raza' {
  const m = p.length;
  const cot = p.map((b, i) => {
    const a = p[i - 1], c = p[i + 1];
    if (!a || !c) return 0;
    const ux = b.t - a.t, us = b.s - a.s, vx = c.t - b.t, vs = c.s - b.s;
    return Math.atan2(ux * vs - us * vx, ux * vx + us * vs);
  });
  const tg = cot.map((u) => r * Math.tan(Math.abs(u) / 2));
  for (let i = 0; i + 1 < m; i++) {
    const a = p[i] as P, b = p[i + 1] as P;
    if ((tg[i] as number) + (tg[i + 1] as number) > Math.hypot(b.t - a.t, b.s - a.s) + 1e-9) return 'imbinare-raza';
  }
  const rez: VarfImbinare[] = [];
  p.forEach((b, i) => {
    const l = tg[i] as number, a = p[i - 1], c = p[i + 1];
    if (!a || !c || !(l > 0)) { rez.push({ t: b.t, s: b.s, b: 0 }); return; }
    const la = Math.hypot(b.t - a.t, b.s - a.s), lc = Math.hypot(c.t - b.t, c.s - b.s);
    rez.push(
      { t: b.t - ((b.t - a.t) / la) * l, s: b.s - ((b.s - a.s) / la) * l, b: Math.tan((cot[i] as number) / 4) },
      { t: b.t + ((c.t - b.t) / lc) * l, s: b.s + ((c.s - b.s) / lc) * l, b: 0 },
    );
  });
  return rez;
}

/** Vârfurile modelelor cu laturi drepte (fără capetele coardei), de la (e, 0) la (e + n · pas, 0). */
function poligonal(model: 'zigzag' | 'dinti' | 'coada', e: number, n: number, p: number, H: number): P[] {
  const h = H / 2, q = H / 12;
  const rez: P[] = [{ t: e, s: 0 }];
  for (let k = 0; k < n; k++) {
    const t = e + k * p;
    if (model === 'zigzag') rez.push({ t: t + p / 4, s: h }, { t: t + (3 * p) / 4, s: -h });
    else if (model === 'dinti') rez.push({ t, s: h }, { t: t + p / 2, s: h }, { t: t + p / 2, s: -h }, { t: t + p, s: -h });
    // Coada de rândunică: laturile trec prin linie la fiecare jumătate de pas, înclinate cu H / 6 pe toată înălțimea.
    else rez.push({ t: t - q, s: h }, { t: t + p / 2 + q, s: h }, { t: t + p / 2 - q, s: -h }, { t: t + p + q, s: -h });
  }
  rez.push({ t: e + n * p, s: 0 });
  return rez;
}

/**
 * Cocoașele (valul) sau nodurile (puzzle-ul), alternând sus și jos, câte una pe jumătate de pas: fiecare din trei arce
 * tangente, flancul (centrul la `rf` de linie, deasupra piciorului lui), capul (centrul pe mijloc, la `h − R`) și flancul
 * celălalt; între ele, linia. `d`: cât de departe de mijloc stau picioarele flancurilor.
 */
function arce(e: number, n: number, p: number, H: number, rf: number, R: number, d: number): VarfImbinare[] {
  const rez: VarfImbinare[] = [];
  for (let k = 0; k < 2 * n; k++) {
    const c = e + (k * p) / 2 + p / 4, z = k % 2 === 0 ? 1 : -1;
    const F1 = { t: c - d, s: z * rf }, C = { t: c, s: z * (H / 2 - R) }, F2 = { t: c + d, s: z * rf };
    // Punctele de tangență: pe drumul dintre centre, la rf de flanc (cercurile se ating pe dinafară).
    const T = (F: P): P => {
      const l = Math.hypot(C.t - F.t, C.s - F.s);
      return { t: F.t + ((C.t - F.t) / l) * rf, s: F.s + ((C.s - F.s) / l) * rf };
    };
    const T1 = T(F1), T2 = T(F2), A0 = { t: c - d, s: 0 }, A1 = { t: c + d, s: 0 };
    rez.push(
      { t: A0.t, s: 0, b: bulge(A0, T1, F1, z > 0) },
      { t: T1.t, s: T1.s, b: bulge(T1, T2, C, z < 0) },
      { t: T2.t, s: T2.s, b: bulge(T2, A1, F2, z > 0) },
      { t: A1.t, s: 0, b: 0 },
    );
  }
  return rez;
}

/**
 * Drumul îmbinării pe o coardă de lungime l, de la (0, 0) la (l, 0): marginea dreaptă, n dinți ai modelului, marginea dreaptă.
 * Null: niciun dinte întreg nu încape (coarda rămâne dreaptă); `imbinare-raza`: modelul nu iese cu pasul, înălțimea și raza
 * date (o rotunjire nu încape pe latura ei; o rază a valului sau a puzzle-ului sub cea dată; puzzle-ul fără cap mai lat decât
 * gâtul, sau prea lat pentru jumătatea lui de pas).
 */
export function drumImbinare(l: number, im: Imbinare): VarfImbinare[] | null | 'imbinare-raza' {
  const { n, margine: e } = dintiPe(l, im.pas);
  if (n < 1) return null;
  const p = im.pas, H = im.inaltime, r = im.raza;
  let v: VarfImbinare[] | 'imbinare-raza';
  if (im.model === 'val') {
    // Trei arce de aceeași rază pe fiecare jumătate de pas: picioarele flancurilor la capetele ei.
    const rho = (p * p / 16 + H * H / 4) / (2 * H);
    v = rho < r - 1e-9 ? 'imbinare-raza' : [{ t: 0, s: 0, b: 0 }, ...arce(e, n, p, H, rho, rho, p / 4), { t: l, s: 0, b: 0 }];
  } else if (im.model === 'puzzle') {
    const R = H / 4, d = Math.sqrt(H * r);
    const bun = r > 0 && R >= r - 1e-9 && R > d - r + 1e-9 && d <= p / 4 + 1e-9;
    v = bun ? [{ t: 0, s: 0, b: 0 }, ...arce(e, n, p, H, r, R, d), { t: l, s: 0, b: 0 }] : 'imbinare-raza';
  } else {
    v = rotunjita([{ t: 0, s: 0 }, ...poligonal(im.model, e, n, p, H), { t: l, s: 0 }], r);
  }
  if (typeof v === 'string') return v;
  // Un vârf în același loc cu următorul (o latură de lungime zero între două rotunjiri sau două noduri lipite) se scoate.
  return v.filter((x, i) => {
    const u = v[i + 1];
    return !u || x.b !== 0 || Math.hypot(u.t - x.t, u.s - x.s) > 1e-9;
  });
}
