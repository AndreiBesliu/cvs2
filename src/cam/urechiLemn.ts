import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import type { Sens } from '../model/document.ts';

/**
 * Urechile „unde ține” (ADR 0211, varianta b; felia 11.3↑e). Lucrarea taie întâi programul foii cu operațiile „unde ține” fără
 * urechi; fundul foii de la capătul lui (proba de la 11.3↑c, `sim/desprinse.ts`) spune unde e lemn legat de marginea foii.
 * Pe fiecare buclă, un loc e bun când tot palierul urechii, dus cât freza spre partea de care ține urechea, cade pe lemnul
 * de care să țină: pe un profil exterior, lemn legat de foaie, dincolo de tăietură; pe unul interior, lemnul piesei (urechea
 * ține miezul de piesă, iar piesa ține de foaie prin urechile ei). Apoi câte cere numărul, cât mai departe una de alta.
 * Totul se socotește pe instanță, la fiecare export (7a): două copii ale aceleiași piese au vecini diferiți.
 */

/** Fundul foii (ADR 0210, felia 11.3↑c), structural: lucrarea nu importă simularea (regulile importurilor). */
export type FundLemn = { readonly s: Uint8Array; readonly nx: number; readonly ny: number; readonly celula: number };
/** Celula tăiată prin foaie și cea de lemn legat de marginea ei: `TAIAT` și `LEGAT` din `sim/desprinse.ts` (o probă le ține egale). */
export const FUND_TAIAT = 1;
export const FUND_LEGAT = 2;

/** Partea de care ține urechea: pe un profil exterior, foaia; pe unul interior, piesa. */
export type LaturaLemn = 'exterior' | 'interior';

/** Valoarea fundului sub punctul (x, y), din celula care îl conține; în afara foii nu e lemn. */
export function fundSub(f: FundLemn, x: number, y: number): number {
  const i = Math.floor(x / f.celula), j = Math.floor(y / f.celula);
  if (!(i >= 0 && i < f.nx && j >= 0 && j < f.ny)) return FUND_TAIAT;
  return f.s[j * f.nx + i] ?? FUND_TAIAT;
}

/**
 * Mostrele buclei închise c, la m pași egali de la vârful ei 0 (pasul P / m, cel mult `pasMaxim`), ca lungime ca în
 * `lungimeBucla` (arcul ca r·|θ|). Pe fiecare, 1 dacă punctul de pe buclă, dus cu `departe` spre partea de care ține urechea,
 * cade pe lemnul ei. Partea deșeului (ADR 0030 §2): materialul păstrat e în dreapta sensului de mers la urcare și în stânga la
 * opoziție; pe exterior, urechea ține de deșeu (lemnul foii), pe interior, de material (piesa).
 */
export function mostreBune(
  c: Contur, sens: Sens, latura: LaturaLemn, fund: FundLemn, departe: number, pasMaxim: number,
): { readonly P: number; readonly bune: Uint8Array } {
  type Bucata = { readonly s0: number; readonly L: number; readonly a: Punct; readonly b: Punct; readonly arc: ReturnType<typeof cerculArcului> | null };
  const bucati: Bucata[] = [];
  let P = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    const arc = s.tip === 'A' ? cerculArcului(a, b, s.bulge) : null;
    const L = arc ? arc.raza * Math.abs(arc.baleiaj) : Math.hypot(b.x - a.x, b.y - a.y);
    bucati.push({ s0: P, L, a, b, arc });
    P += L;
  }
  if (!(P > 0) || !(pasMaxim > 0)) return { P, bune: new Uint8Array(0) };
  const m = Math.max(1, Math.ceil(P / pasMaxim - 1e-9));
  const bune = new Uint8Array(m);
  // Spre deșeu: stânga la urcare, dreapta la opoziție; pe interior, invers (spre piesă).
  const semn = (sens === 'urcare' ? 1 : -1) * (latura === 'exterior' ? 1 : -1);
  const cere = latura === 'exterior' ? (v: number): boolean => v === FUND_LEGAT : (v: number): boolean => v !== FUND_TAIAT;
  let k = 0;
  for (let i = 0; i < m; i++) {
    const s = (i * P) / m;
    while (k < bucati.length - 1 && s >= (bucati[k] as Bucata).s0 + (bucati[k] as Bucata).L) k++;
    const u = bucati[k] as Bucata;
    const f = u.L > 0 ? Math.min(1, Math.max(0, (s - u.s0) / u.L)) : 0;
    let px: number, py: number, tx: number, ty: number;
    if (u.arc) {
      const w = u.arc.start + u.arc.baleiaj * f, sg = u.arc.baleiaj > 0 ? 1 : -1;
      px = u.arc.centru.x + u.arc.raza * Math.cos(w);
      py = u.arc.centru.y + u.arc.raza * Math.sin(w);
      tx = -Math.sin(w) * sg;
      ty = Math.cos(w) * sg;
    } else {
      px = u.a.x + (u.b.x - u.a.x) * f;
      py = u.a.y + (u.b.y - u.a.y) * f;
      const L = Math.hypot(u.b.x - u.a.x, u.b.y - u.a.y);
      tx = L > 0 ? (u.b.x - u.a.x) / L : 0;
      ty = L > 0 ? (u.b.y - u.a.y) / L : 0;
    }
    // Normala din stânga mersului: (−t.y, t.x).
    if (cere(fundSub(fund, px - semn * ty * departe, py + semn * tx * departe))) bune[i] = 1;
  }
  return { P, bune };
}

/**
 * Centrele bune (ADR 0211, b): mostra i e bună ca centru când toate mostrele palierului ei, de la i − w la i + w (de jur
 * împrejur), sunt bune. Cu un palier cât bucla, toate sau niciuna.
 */
export function centreBune(bune: Uint8Array, w: number): Uint8Array {
  const m = bune.length;
  const rez = new Uint8Array(m);
  if (m === 0) return rez;
  if (2 * w + 1 >= m) {
    if (bune.every((x) => x === 1)) rez.fill(1);
    return rez;
  }
  const pre = new Int32Array(3 * m + 1);
  for (let k = 0; k < 3 * m; k++) pre[k + 1] = (pre[k] as number) + (bune[k % m] as number);
  for (let i = 0; i < m; i++) {
    const a = i - w + m, b = i + w + m;
    if ((pre[b + 1] as number) - (pre[a] as number) === 2 * w + 1) rez[i] = 1;
  }
  return rez;
}

/**
 * Câte urechi și unde, pe indicii mostrelor (ADR 0211, b: „câte cere numărul, cât mai departe una de alta”): întâi cât mai
 * multe, până la n, cu cel puțin `golMinim` pași între două centre vecine (W / 0,9, ca la locurile alese), apoi cel mai
 * mare gol minim. Între așezările cu același gol: prima cea mai lungă serie de porniri bune, pornită din mijlocul ei, iar
 * fiecare centru următor, primul bun la cel puțin golul acela. Indicii, crescători; nimic dacă nu încape niciuna.
 */
export function alegeIndici(bune: Uint8Array, n: number, golMinim: number): number[] {
  const m = bune.length;
  if (m === 0 || n < 1 || golMinim > m) return [];
  // Primul indice bun de la j încolo, pe bucla desfășurată de două ori (2m: niciunul).
  const urm = new Int32Array(2 * m + 1);
  urm[2 * m] = 2 * m;
  for (let j = 2 * m - 1; j >= 0; j--) urm[j] = bune[j % m] === 1 ? j : (urm[j + 1] as number);
  /** Ultimul centru al lanțului de k din i, la cel puțin g pași; −1 dacă nu se închide cu un gol de cel puțin g. */
  const lant = (i: number, k: number, g: number): number => {
    let x = i;
    for (let r = 1; r < k; r++) {
      const y = x + g;
      if (y >= 2 * m) return -1;
      x = urm[y] as number;
      if (x >= 2 * m) return -1;
    }
    return i + m - x >= g ? x : -1;
  };
  const porniri = (k: number, g: number): number[] => {
    const rez: number[] = [];
    for (let i = 0; i < m; i++) if (bune[i] === 1 && lant(i, k, g) >= 0) rez.push(i);
    return rez;
  };
  let k = Math.min(n, Math.floor(m / golMinim));
  while (k >= 1 && porniri(k, golMinim).length === 0) k--;
  if (k < 1) return [];
  // Cel mai mare gol minim: porniri(k, g) se golește crescând g.
  let lo = golMinim, hi = Math.floor(m / k);
  while (lo < hi) {
    const mij = Math.ceil((lo + hi) / 2);
    if (porniri(k, mij).length > 0) lo = mij;
    else hi = mij - 1;
  }
  const bun = porniri(k, lo);
  // Seriile de porniri consecutive (de jur împrejur): cea mai lungă, prima la egalitate, de la mijlocul ei.
  const esteStart = new Uint8Array(m);
  for (const i of bun) esteStart[i] = 1;
  let start = bun[0] as number;
  if (bun.length < m) {
    const gol = esteStart.findIndex((x) => x === 0);
    let cea = -1, ceaStart = 0;
    for (let r = 1; r <= m; r++) {
      const i = (gol + r) % m;
      if (esteStart[i] !== 1 || esteStart[(i - 1 + m) % m] === 1) continue;
      let l = 0;
      while (l < m && esteStart[(i + l) % m] === 1) l++;
      if (l > cea || (l === cea && i < ceaStart)) { cea = l; ceaStart = i; }
    }
    start = (ceaStart + Math.floor((cea - 1) / 2)) % m;
  }
  const rez = [start];
  let x = start;
  for (let r = 1; r < k; r++) {
    x = urm[x + lo] as number;
    rez.push(x % m);
  }
  return rez.sort((a, b) => a - b);
}

/** Rezerva relativă a golului dintre două urechi, peste W / 0,9: rotunjirea pozițiilor nu trece de refuzul lucrării. */
const REZERVA = 1e-9;

/** Urechile „unde ține” ale unei bucle: câte au încăput și centrele lor (lungimi de la vârful 0); `egale`, la distanțe egale. */
export type UrechiLemnBucla = { readonly cate: number; readonly centre: readonly number[]; readonly egale: boolean };

/**
 * Urechile „unde ține” ale unei bucle de lungime P (ADR 0211, b). Dacă toate cele n locuri de la distanțe egale ((k + ½)·P / n,
 * ADR 0028) sunt bune, ele (`egale`); altfel, `alegeIndici` pe mostrele bucle, la pasul `pasMaxim` (celula fundului).
 * `departe`: cât se duce palierul spre lemn (freza); W: palierul.
 */
export function urechiLemnBucla(
  c: Contur, sens: Sens, latura: LaturaLemn, fund: FundLemn, departe: number, W: number, n: number, pasMaxim: number, cuEgale: boolean,
): UrechiLemnBucla {
  const { P, bune } = mostreBune(c, sens, latura, fund, departe, pasMaxim);
  const m = bune.length;
  if (m === 0) return { cate: 0, centre: [], egale: false };
  const pas = P / m;
  const centre = centreBune(bune, Math.floor(W / 2 / pas + 1e-9));
  // Cu o rezervă de rotunjire, ca lucrarea (W ≤ 0,9 · golul) să primească mereu centrele date.
  if (cuEgale && W * (1 + REZERVA) <= 0.9 * (P / n)) {
    const egale = Array.from({ length: n }, (_, k) => ((k + 0.5) * P) / n);
    if (egale.every((s) => centre[Math.round(s / pas) % m] === 1)) return { cate: n, centre: egale, egale: true };
  }
  let gol = Math.max(1, Math.ceil(W / 0.9 / pas));
  while (0.9 * gol * pas < W * (1 + REZERVA)) gol++;
  const indici = alegeIndici(centre, n, gol);
  return { cate: indici.length, centre: indici.map((i) => i * pas), egale: false };
}
