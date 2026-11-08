/**
 * Linia mediană (ADR 0222): cerneala la prag, cu aceeași curățare ca trasarea (`campul`); scheletul pe pixeli (subțierea
 * Zhang–Suen, apoi pixelii de scară în plus, după numărul de conexiune al lui Yokoi); graful lui: capete, joncțiuni, lanțuri
 * și buclele fără joncțiuni; cioturile tăiate; joncțiunile apropiate unite, în punctul celor mai mici pătrate al dreptelor
 * brațelor; centrul sub-pixel, la mijlocul dintre trecerile pragului de-a curmezișul trăsăturii (iar grosimea, distanța
 * dintre ele); capetele libere în centrul capătului rotund (unde se oprește o freză cât trăsătura); brațele din prelungire
 * ale unei joncțiuni legate într-o cale; curbele arcelor (ADR 0221) și ale buclelor.
 *
 * Pură, fără importuri din aplicație (regula `trasare-izolat`): rulează în workerul trasării, iar probele o cheamă direct.
 * Coordonatele, ca la trasare: pixeli, y în jos, centrul pixelului (i, j) în (i + 0,5, j + 0,5). Algoritmii vin din lucrări
 * publice (Zhang și Suen 1984; Yokoi, Toriwaki și Fukumura 1975), scriși aici.
 */
import {
  campul, curbeleArcului, curbeleBuclei, EPS_DUR, PLAFON_TRASARE, TREPTE,
  type BazaRaport, type Bucata, type CaiTrasate, type ImagineRGBA, type OptiuniTrasare,
} from './trasare.ts';

export type RaportMediana = BazaRaport & {
  /** Căile (deschise și bucle), dintre ele buclele, joncțiunile desenului și vârfurile curbelor. */
  readonly contururi: number; readonly bucle: number; readonly jonctiuni: number; readonly varfuri: number;
  /** Cea mai mare distanță dintre centrele măsurate și curbele trasate, în px. */
  readonly abatere: number;
  /** Grosimea obișnuită a trăsăturilor: mediana lățimilor măsurate de-a curmezișul, în px (0 fără măsurători). */
  readonly grosime: number;
  /** Trăsăturile mai scurte decât grosimea lor (puncte), rămase fără linie. */
  readonly puncte: number;
};

export type RezultatMediana =
  | { readonly ok: true; readonly cai: CaiTrasate; readonly raport: RaportMediana }
  | { readonly ok: false; readonly cod: 'prea-multe'; readonly raport: RaportMediana };

/**
 * Reglajele (ADR 0222 §3): pasul mersului de-a curmezișul (px); un ciot e mai scurt decât `ciot` · raza joncțiunii + 1 px;
 * două brațe se continuă sub `cotitura` grade; un punct cu lățimea sub `capat` · grosimea lanțului e în capătul rotund;
 * tangenta din punctele de la i − `vecini` la i + `vecini`.
 */
export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2 } as const;

// Vecinii în cerc, de la est, în sens trigonometric pe ecran (y în jos): E, NE, N, NV, V, SV, S, SE.
const DX = [1, 1, 0, -1, -1, -1, 0, 1] as const;
const DY = [0, -1, -1, -1, 0, 1, 1, 1] as const;

// ── Scheletul ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Subțierea Zhang–Suen, cu îndreptarea lui Lü și Wang (1986): un pixel iese doar cu cel puțin trei vecini (cu doi, cum cerea
 * Zhang–Suen, o trăsătură la 45° dispare toată: măsurat). Două sub-treceri, fiecare cu deciziile luate pe imaginea de la
 * începutul ei, până nu se mai schimbă nimic. Doar pixelii a căror vecinătate s-a schimbat de la ultima lor probă (pe aceeași
 * sub-trecere) se mai încearcă, deci munca e pe aria cernelii, nu pe arie ori grosime.
 */
export function subtiaza(m: Uint8Array, W: number, H: number): Uint8Array {
  const s = new Uint8Array(m);
  const sucio = new Uint8Array(W * H);
  const coada: [number[], number[]] = [[], []];
  const v = (x: number, y: number): number => (x >= 0 && y >= 0 && x < W && y < H ? s[y * W + x] ?? 0 : 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!s[p]) continue;
      let plini = 0;
      for (let k = 0; k < 8; k++) plini += v(x + (DX[k] ?? 0), y + (DY[k] ?? 0));
      if (plini < 8) { coada[0].push(p); coada[1].push(p); sucio[p] = 3; }
    }
  }
  for (let schimbat = true; schimbat;) {
    schimbat = false;
    for (const sub of [0, 1] as const) {
      const lista = coada[sub];
      coada[sub] = [];
      const bit = sub === 0 ? 1 : 2;
      const scoase: number[] = [];
      for (const p of lista) {
        sucio[p] = (sucio[p] ?? 0) & ~bit;
        if (!s[p]) continue;
        const x = p % W, y = (p - x) / W;
        const p2 = v(x, y - 1), p3 = v(x + 1, y - 1), p4 = v(x + 1, y), p5 = v(x + 1, y + 1);
        const p6 = v(x, y + 1), p7 = v(x - 1, y + 1), p8 = v(x - 1, y), p9 = v(x - 1, y - 1);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 3 || B > 6) continue;
        const A = (1 - p2) * p3 + (1 - p3) * p4 + (1 - p4) * p5 + (1 - p5) * p6 + (1 - p6) * p7 + (1 - p7) * p8 + (1 - p8) * p9 + (1 - p9) * p2;
        if (A !== 1) continue;
        if (sub === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
        scoase.push(p);
      }
      for (const p of scoase) s[p] = 0;
      for (const p of scoase) {
        const x = p % W, y = (p - x) / W;
        for (let k = 0; k < 8; k++) {
          const xx = x + (DX[k] ?? 0), yy = y + (DY[k] ?? 0);
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const q = yy * W + xx;
          if (!s[q]) continue;
          const f = sucio[q] ?? 0;
          if (!(f & 1)) coada[0].push(q);
          if (!(f & 2)) coada[1].push(q);
          sucio[q] = 3;
        }
      }
      if (scoase.length > 0) schimbat = true;
    }
  }
  return s;
}

/** Vecinii pixelului (E, NE, N, …, SE), 0 sau 1, în `x8`; întoarce câți sunt. */
function vecinii(s: Uint8Array, W: number, H: number, p: number, x8: Uint8Array): number {
  const x = p % W, y = (p - x) / W;
  let n = 0;
  for (let k = 0; k < 8; k++) {
    const xx = x + (DX[k] ?? 0), yy = y + (DY[k] ?? 0);
    x8[k] = xx >= 0 && yy >= 0 && xx < W && yy < H && s[yy * W + xx] ? 1 : 0;
    n += x8[k] ?? 0;
  }
  return n;
}

/**
 * Coturile treptelor: un pixel cu doi vecini ortogonali în unghi drept (N și E, de exemplu) și cu partea opusă goală (S, SV,
 * V) iese, pe rând: vecinii lui rămân legați pe diagonală, iar nimic nu se scurtează (un pixel simplu oarecare ar fi ros, pe
 * rând, o linie de doi pixeli de la capăt; iar în joncțiuni le-ar fi mutat: măsurat). Linia rămâne de un pixel, cu doi
 * vecini pe pixel.
 */
function curataTrepte(s: Uint8Array, W: number, H: number, schelet: readonly number[]): void {
  const x8 = new Uint8Array(8);
  for (const p of schelet) {
    if (!s[p]) continue;
    vecinii(s, W, H, p, x8);
    for (let k = 0; k < 8; k += 2) {
      // Vecinii ortogonali k și k + 2 (în cerc), iar opusul lor: k + 4, k + 5, k + 6.
      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }
    }
  }
}

/** Pixelul e simplu (numărul de conexiune Yokoi pe 8-vecinătate e 1: fără el, vecinii rămân legați și nu se deschide un gol) și nu e capăt. */
function simplu(s: Uint8Array, W: number, H: number, p: number): boolean {
  const x8 = new Uint8Array(8);
  if (vecinii(s, W, H, p, x8) < 2) return false;
  let nc = 0;
  for (let k = 0; k < 8; k += 2) {
    const a = 1 - (x8[k] ?? 0), b = 1 - (x8[k + 1] ?? 0), c = 1 - (x8[(k + 2) % 8] ?? 0);
    nc += a - a * b * c;
  }
  return nc === 1;
}

type Lant = { readonly pix: number[]; readonly a: number; readonly b: number; readonly inchis: boolean };

/**
 * Lanțurile scheletului (lista lui de pixeli, crescătoare) între noduri (pixelii fără exact doi vecini: capete, joncțiuni,
 * punctele izolate), plus buclele fără noduri. Doi pixeli-nod vecini dau un lanț de doi pixeli (o punte, unită apoi). Scrie
 * numărul de vecini în `grad` (refolosit, ca și `vizitat`: doar pixelii scheletului se ating).
 */
function lanturi(s: Uint8Array, W: number, H: number, schelet: readonly number[], grad: Uint8Array, vizitat: Uint8Array): Lant[] {
  const x8 = new Uint8Array(8);
  for (const p of schelet) { grad[p] = vecinii(s, W, H, p, x8); vizitat[p] = 0; }
  const lant: Lant[] = [];
  const vecin = (p: number, k: number): number => {
    const x = p % W, y = (p - x) / W, xx = x + (DX[k] ?? 0), yy = y + (DY[k] ?? 0);
    return xx >= 0 && yy >= 0 && xx < W && yy < H && s[yy * W + xx] ? yy * W + xx : -1;
  };
  const urmatorul = (cur: number, prev: number): number => {
    for (let k = 0; k < 8; k++) { const q = vecin(cur, k); if (q >= 0 && q !== prev) return q; }
    return -1;
  };
  for (const p of schelet) {
    if (grad[p] === 2) continue;
    for (let k = 0; k < 8; k++) {
      const q0 = vecin(p, k);
      if (q0 < 0) continue;
      if (grad[q0] !== 2) { if (p < q0) lant.push({ pix: [p, q0], a: p, b: q0, inchis: false }); continue; }
      if (vizitat[q0]) continue;
      const pix = [p, q0];
      vizitat[q0] = 1;
      let prev = p, cur = q0;
      for (;;) {
        const urm = urmatorul(cur, prev);
        if (urm < 0) break;
        pix.push(urm);
        if (grad[urm] !== 2) break;
        if (vizitat[urm]) break;
        vizitat[urm] = 1;
        prev = cur;
        cur = urm;
      }
      lant.push({ pix, a: p, b: pix[pix.length - 1] ?? p, inchis: false });
    }
  }
  for (const p of schelet) {
    if (grad[p] !== 2 || vizitat[p]) continue;
    const pix = [p];
    vizitat[p] = 1;
    let prev = -1, cur = p;
    for (;;) {
      let urm = -1;
      for (let k = 0; k < 8 && urm < 0; k++) { const q = vecin(cur, k); if (q >= 0 && q !== prev && !vizitat[q]) urm = q; }
      if (urm < 0) break;
      vizitat[urm] = 1;
      pix.push(urm);
      prev = cur;
      cur = urm;
    }
    lant.push({ pix, a: p, b: p, inchis: true });
  }
  return lant;
}

function lungime(pix: readonly number[], W: number): number {
  let L = 0;
  for (let i = 1; i < pix.length; i++) {
    const a = pix[i - 1] ?? 0, b = pix[i] ?? 0;
    L += Math.hypot((b % W) - (a % W), Math.floor(b / W) - Math.floor(a / W));
  }
  return L;
}

/** Raza cercului înscris în pixel: distanța de la centrul lui până la cel mai apropiat centru de fundal (afară e fundal). */
function raza(m: Uint8Array, W: number, H: number, p: number): number {
  const x0 = p % W, y0 = (p - x0) / W;
  let cel = Infinity;
  const vezi = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= W || y >= H || !m[y * W + x]) cel = Math.min(cel, Math.hypot(x - x0, y - y0));
  };
  for (let k = 1; k < cel; k++) {
    for (let i = -k; i <= k; i++) { vezi(x0 + i, y0 - k); vezi(x0 + i, y0 + k); }
    for (let i = -k + 1; i < k; i++) { vezi(x0 - k, y0 + i); vezi(x0 + k, y0 + i); }
  }
  return cel;
}

// ── De-a curmezișul: centrul și grosimea ───────────────────────────────────────────────────────────────────────────────

/** Câmpul la (x, y), biliniar între centrele pixelilor; în afara imaginii, fundal. */
function camp(f: Float32Array, W: number, H: number, x: number, y: number): number {
  const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
  const g = (i: number, j: number): number => (i < 0 || j < 0 || i >= W || j >= H ? 0 : f[j * W + i] ?? 0);
  return (1 - u) * (1 - v) * g(x0, y0) + u * (1 - v) * g(x0 + 1, y0) + (1 - u) * v * g(x0, y0 + 1) + u * v * g(x0 + 1, y0 + 1);
}

/** Cât se merge din (x, y) pe direcția (dx, dy) până sub prag (interpolat între pași); 0 dacă punctul e deja sub el. */
function trecere(f: Float32Array, W: number, H: number, T: number, x: number, y: number, dx: number, dy: number): number {
  let prev = camp(f, W, H, x, y);
  if (prev < T) return 0;
  const max = W + H;
  for (let u = MEDIANA.pas; u <= max; u += MEDIANA.pas) {
    const c = camp(f, W, H, x + dx * u, y + dy * u);
    if (c < T) return u - MEDIANA.pas + (MEDIANA.pas * (prev - T)) / Math.max(1e-12, prev - c);
    prev = c;
  }
  return max;
}

/**
 * Punctele unui lanț (x0, y0, x1, y1, …) mutate în mijlocul dintre trecerile pragului pe normala lui (tangenta din vecinii
 * de pe lanț), cu lățimea de-a curmezișul (NaN unde mutarea ar fi peste o treime din lățime: lângă o joncțiune, normala
 * intră în alt braț). Două treceri: a doua, cu tangenta din centrele primei.
 */
function centreaza(P0: Float64Array, inchis: boolean, f: Float32Array, W: number, H: number, T: number): { P: Float64Array; L: Float64Array } {
  const n = P0.length / 2;
  let Q = P0;
  const L = new Float64Array(n).fill(Number.NaN);
  for (let trecut = 0; trecut < 2; trecut++) {
    const R = new Float64Array(P0);
    for (let i = 0; i < n; i++) {
      const ia = inchis ? (i - MEDIANA.vecini + n) % n : Math.max(0, i - MEDIANA.vecini);
      const ib = inchis ? (i + MEDIANA.vecini) % n : Math.min(n - 1, i + MEDIANA.vecini);
      let tx = (Q[2 * ib] ?? 0) - (Q[2 * ia] ?? 0), ty = (Q[2 * ib + 1] ?? 0) - (Q[2 * ia + 1] ?? 0);
      const lt = Math.hypot(tx, ty);
      if (lt < 1e-9) continue;
      tx /= lt; ty /= lt;
      const x = P0[2 * i] ?? 0, y = P0[2 * i + 1] ?? 0, nx = -ty, ny = tx;
      const a = trecere(f, W, H, T, x, y, nx, ny), b = trecere(f, W, H, T, x, y, -nx, -ny);
      const d = (a - b) / 2, w = a + b;
      if (Math.abs(d) > Math.max(1, w / 3)) { L[i] = Number.NaN; continue; }
      R[2 * i] = x + nx * d;
      R[2 * i + 1] = y + ny * d;
      L[i] = w;
    }
    Q = R;
  }
  return { P: Q, L };
}

function mediana(v: readonly number[]): number {
  if (v.length === 0) return 0;
  const s = v.slice().sort((a, b) => a - b);
  return s[s.length >> 1] ?? 0;
}

/** Dreapta celor mai mici pătrate prin punctele [i, j] ale listei: centrul și direcția (vectorul propriu cel mare). */
function dreapta(P: readonly number[], i: number, j: number): { cx: number; cy: number; dx: number; dy: number } {
  let cx = 0, cy = 0;
  const n = j - i + 1;
  for (let k = i; k <= j; k++) { cx += P[2 * k] ?? 0; cy += P[2 * k + 1] ?? 0; }
  cx /= n; cy /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let k = i; k <= j; k++) {
    const x = (P[2 * k] ?? 0) - cx, y = (P[2 * k + 1] ?? 0) - cy;
    sxx += x * x; sxy += x * y; syy += y * y;
  }
  const t = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { cx, cy, dx: Math.cos(t), dy: Math.sin(t) };
}

/**
 * Capătul liber al unei liste de puncte (primul punct): în centrul capătului rotund (ADR 0222 §4). Punctele capătului ies
 * până la primele trei la rând cu lățimea lanțului (de la `capat` · grosimea lui la 1,2 · grosimea, sau +0,75 px: mai
 * îngustă e rotunjimea capătului, mai lată, o normală strâmbă, ca pe scheletul care cotește spre colțul unui capăt drept);
 * direcția, din dreapta punctelor de după ele (cât 1,5 grosimi); vârful, unde trece pragul mergând înainte; centrul e la o
 * jumătate de grosime înapoi de vârf. Un capăt drept dă tot punctul în care se oprește o freză cât trăsătura.
 */
function retrage(P: number[], L: number[], f: Float32Array, W: number, H: number, T: number): void {
  const n = P.length / 2;
  const masurate = L.filter((x) => x > 0);
  if (n < 2 || masurate.length === 0) return;
  const wm = mediana(masurate);
  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) >= MEDIANA.capat * wm && (L[k] ?? 0) <= Math.max(1.2 * wm, wm + 0.75));
  let i0 = 0;
  while (i0 < n >> 1 && !(bun(i0) && bun(i0 + 1) && bun(i0 + 2))) i0++;
  if (!bun(i0)) i0 = 0;
  const x0 = P[2 * i0] ?? 0, y0 = P[2 * i0 + 1] ?? 0;
  let i1 = i0 + 1;
  while (i1 + 1 < n && Math.hypot((P[2 * i1 + 2] ?? 0) - x0, (P[2 * i1 + 3] ?? 0) - y0) <= Math.max(2, 1.5 * wm)) i1++;
  if (i1 >= n) return;
  // Mersul spre vârf pleacă din centrul dreptei (pe axă, oricât s-ar abate primul punct bun: pe un capăt drept, cu 1 px).
  const d = dreapta(P, i0, i1);
  let { dx, dy } = d;
  if (dx * (x0 - (P[2 * i1] ?? 0)) + dy * (y0 - (P[2 * i1 + 1] ?? 0)) < 0) { dx = -dx; dy = -dy; }
  const wl = mediana(L.slice(i0, i1 + 1).filter((x) => x > 0)) || wm;
  const avans = trecere(f, W, H, T, d.cx, d.cy, dx, dy) - wl / 2;
  const cx = d.cx + dx * avans, cy = d.cy + dy * avans;
  let k = i0;
  while (k + 1 < n && ((P[2 * k] ?? 0) - cx) * dx + ((P[2 * k + 1] ?? 0) - cy) * dy > -0.05) k++;
  P.splice(0, 2 * k, cx, cy);
  L.splice(0, k, wl);
}

// ── Linia mediană întreagă ─────────────────────────────────────────────────────────────────────────────────────────────

/** Capătul unei muchii: liber (centrul capătului rotund) sau într-o joncțiune (grupul ei). */
type Capat = { readonly g: number };
type Muchie = { readonly P: number[]; readonly L: number[]; readonly a: Capat | null; readonly b: Capat | null };

export function traseazaMediana(img: ImagineRGBA, o: OptiuniTrasare): RezultatMediana {
  const { latime: W, inaltime: H } = img;
  const { f, T, baza } = campul(img, o);
  const m = new Uint8Array(W * H);
  for (let p = 0; p < m.length; p++) m[p] = (f[p] ?? 0) >= T ? 1 : 0;
  const s = subtiaza(m, W, H);
  let schelet: number[] = [];
  for (let p = 0; p < s.length; p++) if (s[p]) schelet.push(p);
  curataTrepte(s, W, H, schelet);
  schelet = schelet.filter((p) => s[p]);
  const grad = new Uint8Array(W * H), vizitat = new Uint8Array(W * H);
  const raze = new Map<number, number>();
  const R = (p: number): number => {
    let v = raze.get(p);
    if (v === undefined) { v = raza(m, W, H, p); raze.set(p, v); }
    return v;
  };
  // Cioturile: un lanț de la un capăt la o joncțiune, mai scurt decât `ciot` · raza joncțiunii + 1 px, iese, până nu mai iese
  // nimic; pixelul joncțiunii iese și el dacă a rămas simplu (un ciot de un pixel sub linie: altfel, o joncțiune falsă).
  for (let it = 0; it < 20; it++) {
    const lant = lanturi(s, W, H, schelet, grad, vizitat);
    let scos = 0;
    for (const l of lant) {
      if (l.inchis) continue;
      const ga = grad[l.a] ?? 0, gb = grad[l.b] ?? 0;
      const jonct = ga >= 3 ? l.a : gb >= 3 ? l.b : -1;
      if (jonct < 0 || (ga !== 1 && gb !== 1)) continue;
      if (lungime(l.pix, W) < MEDIANA.ciot * R(jonct) + 1) {
        for (const q of l.pix) if (q !== jonct) s[q] = 0;
        if (simplu(s, W, H, jonct)) s[jonct] = 0;
        scos++;
      }
    }
    if (scos === 0) break;
    schelet = schelet.filter((p) => s[p]);
    curataTrepte(s, W, H, schelet);
    schelet = schelet.filter((p) => s[p]);
  }
  const lant = lanturi(s, W, H, schelet, grad, vizitat);
  // Joncțiunile: pixelii cu cel puțin trei vecini; doi legați de un lanț mai scurt decât suma razelor lor (cercurile înscrise
  // se suprapun: un X subțiat iese două Y cu o punte) devin una.
  const par = new Map<number, number>();
  const rad = (p: number): number => {
    let q = p;
    while ((par.get(q) ?? q) !== q) q = par.get(q) ?? q;
    return q;
  };
  const punti = new Set<Lant>();
  for (const l of lant) {
    if (l.inchis || l.a === l.b) continue;
    if ((grad[l.a] ?? 0) >= 3 && (grad[l.b] ?? 0) >= 3 && lungime(l.pix, W) < R(l.a) + R(l.b)) {
      punti.add(l);
      const a = rad(l.a), b = rad(l.b);
      if (a !== b) par.set(Math.max(a, b), Math.min(a, b));
    }
  }
  // Grupurile: media centrelor pixelilor și raza cea mai mare.
  const grupuri = new Map<number, { x: number; y: number; r: number; n: number }>();
  for (const p of schelet) {
    if ((grad[p] ?? 0) < 3) continue;
    const g = rad(p), x = (p % W) + 0.5, y = Math.floor(p / W) + 0.5;
    const v = grupuri.get(g);
    if (v) { v.x += x; v.y += y; v.n++; v.r = Math.max(v.r, R(p)); } else grupuri.set(g, { x, y, r: R(p), n: 1 });
  }
  for (const v of grupuri.values()) { v.x /= v.n; v.y /= v.n; }
  let puncte = 0;
  for (const p of schelet) if (grad[p] === 0) puncte++;
  // Muchiile: fiecare lanț (afară de punți), fără pixelii din cercul joncțiunii, centrat.
  const muchii: Muchie[] = [];
  const bucleLibere: Array<{ P: Float64Array; L: Float64Array }> = [];
  const latimi: number[] = [];
  for (const l of lant) {
    if (punti.has(l)) continue;
    if (l.inchis) {
      const P0 = Float64Array.from(l.pix.flatMap((q) => [(q % W) + 0.5, Math.floor(q / W) + 0.5]));
      const c = centreaza(P0, true, f, W, H, T);
      for (const w of c.L) if (w > 0) latimi.push(w);
      bucleLibere.push(c);
      continue;
    }
    const capat = (q: number): Capat | null => ((grad[q] ?? 0) >= 3 ? { g: rad(q) } : null);
    const a = capat(l.a), b = capat(l.b);
    let pix = l.pix;
    const departe = (q: number, c: Capat | null): boolean => {
      if (!c) return true;
      const v = grupuri.get(c.g);
      return !v || Math.hypot((q % W) + 0.5 - v.x, Math.floor(q / W) + 0.5 - v.y) >= v.r;
    };
    let i = 0, j = pix.length - 1;
    while (i <= j && !departe(pix[i] ?? 0, a)) i++;
    while (j >= i && !departe(pix[j] ?? 0, b)) j--;
    pix = pix.slice(i, j + 1);
    const P0 = Float64Array.from(pix.flatMap((q) => [(q % W) + 0.5, Math.floor(q / W) + 0.5]));
    const c = pix.length > 0 ? centreaza(P0, false, f, W, H, T) : { P: P0, L: new Float64Array(0) };
    for (const w of c.L) if (w > 0) latimi.push(w);
    const P = Array.from(c.P), L = Array.from(c.L);
    const laCapat = (cap: Capat | null, P: number[], L: number[]): void => {
      if (!cap) { retrage(P, L, f, W, H, T); return; }
      const v = grupuri.get(cap.g);
      if (v) curataBrat(P, L, v.x, v.y, v.r);
    };
    laCapat(a, P, L);
    invers(P, L);
    laCapat(b, P, L);
    invers(P, L);
    if (!a && !b && lungimeXY(P) < 0.5) { puncte++; continue; }
    muchii.push({ P, L, a, b });
  }
  // Brațele fiecărei joncțiuni: dreapta primelor puncte ale brațului (curățat lângă joncțiune; cât 1,5 grosimi de la primul,
  // cel puțin trei), cu direcția dinspre joncțiune; fără destule puncte, direcția spre capătul lui sau spre joncțiunea de dincolo.
  type Brat = { readonly e: number; readonly capat: 'a' | 'b'; readonly dx: number; readonly dy: number; readonly cx: number; readonly cy: number; readonly linie: boolean };
  const brate = new Map<number, Brat[]>();
  const locuri = new Map<number, readonly [number, number]>();
  for (const [e, mu] of muchii.entries()) {
    for (const capat of ['a', 'b'] as const) {
      const c = mu[capat];
      if (!c) continue;
      const v = grupuri.get(c.g);
      if (!v) continue;
      const n = mu.P.length / 2;
      const idx = (k: number): number => (capat === 'a' ? k : n - 1 - k);
      const wa = mediana(mu.L.filter((x) => x > 0)) || 2 * v.r;
      const sel: number[] = [];
      for (let k = 0; k < n; k++) {
        const q = idx(k), x = mu.P[2 * q] ?? 0, y = mu.P[2 * q + 1] ?? 0;
        if (k >= 3 && Math.hypot(x - (sel[0] ?? 0), y - (sel[1] ?? 0)) > Math.max(2, 1.5 * wa)) break;
        sel.push(x, y);
      }
      let dx = 0, dy = 0, cx = v.x, cy = v.y;
      const linie = sel.length >= 6;
      if (linie) {
        ({ dx, dy, cx, cy } = dreapta(sel, 0, sel.length / 2 - 1));
        if ((cx - v.x) * dx + (cy - v.y) * dy < 0) { dx = -dx; dy = -dy; }
      } else if (n > 0) {
        dx = (mu.P[2 * idx(n - 1)] ?? 0) - v.x; dy = (mu.P[2 * idx(n - 1) + 1] ?? 0) - v.y;
      } else {
        const alt = mu[capat === 'a' ? 'b' : 'a'], u = alt ? grupuri.get(alt.g) : undefined;
        if (u) { dx = u.x - v.x; dy = u.y - v.y; }
      }
      const l = Math.hypot(dx, dy) || 1;
      const lista = brate.get(c.g) ?? [];
      lista.push({ e, capat, dx: dx / l, dy: dy / l, cx, cy, linie });
      brate.set(c.g, lista);
    }
  }
  // Locul fiecărei joncțiuni: punctul celor mai mici pătrate al dreptelor brațelor; fără două direcții destul de diferite, sau
  // mai departe de o rază (+1 px) de pixelii ei, media lor.
  for (const [g, lista] of brate) {
    const v = grupuri.get(g);
    if (!v) continue;
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    for (const b of lista) {
      if (!b.linie) continue;
      const m11 = 1 - b.dx * b.dx, m12 = -b.dx * b.dy, m22 = 1 - b.dy * b.dy;
      a11 += m11; a12 += m12; a22 += m22;
      b1 += m11 * b.cx + m12 * b.cy; b2 += m12 * b.cx + m22 * b.cy;
    }
    const det = a11 * a22 - a12 * a12;
    let x = v.x, y = v.y;
    if (det > 0.05) {
      const lx = (a22 * b1 - a12 * b2) / det, ly = (a11 * b2 - a12 * b1) / det;
      if (Math.hypot(lx - v.x, ly - v.y) <= v.r + 1) { x = lx; y = ly; }
    }
    locuri.set(g, [x, y]);
  }
  // Brațele din prelungire se leagă două câte două (cele mai drepte întâi, sub `cotitura`); o joncțiune cu doar două brațe
  // e o trecere, oricum ar coti.
  const pereche = new Map<number, number>();
  const cheie = (e: number, c: 'a' | 'b'): number => 2 * e + (c === 'a' ? 0 : 1);
  for (const lista of brate.values()) {
    const cand: Array<{ i: number; j: number; c: number }> = [];
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        if (!a || !b) continue;
        const cot = 180 - (Math.acos(Math.max(-1, Math.min(1, a.dx * b.dx + a.dy * b.dy))) * 180) / Math.PI;
        if (cot <= MEDIANA.cotitura || lista.length === 2) cand.push({ i, j, c: cot });
      }
    }
    cand.sort((p, q) => p.c - q.c || p.i - q.i || p.j - q.j);
    const luat = new Set<number>();
    for (const { i, j } of cand) {
      if (luat.has(i) || luat.has(j)) continue;
      const a = lista[i], b = lista[j];
      if (!a || !b) continue;
      luat.add(i); luat.add(j);
      pereche.set(cheie(a.e, a.capat), cheie(b.e, b.capat));
      pereche.set(cheie(b.e, b.capat), cheie(a.e, a.capat));
    }
  }
  // Căile: de la un capăt liber sau de la un braț fără pereche, din muchie în muchie prin perechi; ce rămâne sunt bucle
  // (toate brațele lor au pereche).
  const folosita = new Uint8Array(muchii.length);
  const cai: Array<{ P: number[]; inchisa: boolean }> = [];
  const loc = (c: Capat | null): readonly [number, number] | null => (c ? locuri.get(c.g) ?? null : null);
  const mergi = (e0: number, c0: 'a' | 'b', inchisa: boolean): void => {
    const P: number[] = [];
    let e = e0, c = c0;
    for (;;) {
      folosita[e] = 1;
      const mu = muchii[e];
      if (!mu) break;
      const start = loc(mu[c]);
      if (start) P.push(start[0], start[1]);
      const n = mu.P.length / 2;
      for (let k = 0; k < n; k++) { const q = c === 'a' ? k : n - 1 - k; P.push(mu.P[2 * q] ?? 0, mu.P[2 * q + 1] ?? 0); }
      const alt: 'a' | 'b' = c === 'a' ? 'b' : 'a';
      const urm = pereche.get(cheie(e, alt));
      if (urm !== undefined && !folosita[urm >> 1]) { e = urm >> 1; c = urm & 1 ? 'b' : 'a'; continue; }
      if (!inchisa) { const fin = loc(mu[alt]); if (fin) P.push(fin[0], fin[1]); }
      break;
    }
    cai.push({ P: faraDubluri(P, inchisa), inchisa });
  };
  for (const [e, mu] of muchii.entries()) {
    if (folosita[e]) continue;
    for (const c of ['a', 'b'] as const) {
      if (folosita[e]) break;
      if (!mu[c] || !pereche.has(cheie(e, c))) mergi(e, c, false);
    }
  }
  for (const [e] of muchii.entries()) if (!folosita[e]) mergi(e, 'a', true);
  for (const b of bucleLibere) cai.push({ P: Array.from(b.P), inchisa: true });
  // Curbele, cu treptele Netezimii (pe marginile dure, banda cel puțin `EPS_DUR`, ca la trasare).
  const trepte = TREPTE[o.netezime];
  const dure = baza.margini === 'dure';
  const eps = dure ? Math.max(trepte.eps, EPS_DUR) : trepte.eps;
  const tau = dure ? Math.max(trepte.tau, EPS_DUR) : trepte.tau;
  const valide = cai.filter((c) => c.P.length >= (c.inchisa ? 6 : 4));
  const grosime = mediana(latimi);
  const jonctiuni = locuri.size;
  const bucle = valide.filter((c) => c.inchisa).length;
  const raport = (varfuri: number, abatere: number): RaportMediana => ({
    ...baza, contururi: valide.length, bucle, jonctiuni, varfuri, abatere, grosime, puncte,
  });
  if (valide.length > PLAFON_TRASARE.contururi) return { ok: false, cod: 'prea-multe', raport: raport(0, 0) };
  const inceput = new Uint32Array(valide.length + 1);
  const deschisa = new Uint8Array(valide.length);
  const tipuri: number[] = [];
  const xy: number[] = [];
  let abatere = 0;
  for (const [k, c] of valide.entries()) {
    const P = Float64Array.from(c.P);
    let bucati: Bucata[];
    if (c.inchisa) {
      const r = curbeleBuclei(P, eps, tau, trepte.colt, dure ? 1.5 : 0.9);
      bucati = r.bucati;
      abatere = Math.max(abatere, r.abatere);
    } else {
      const r = curbeleArcului(P, eps, tau, trepte.colt, dure ? 1.5 : 0.9);
      bucati = [...r.bucati, { tip: 0, x: r.sfarsit[0], y: r.sfarsit[1], c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: 0, la: 0 }];
      abatere = Math.max(abatere, r.abatere);
      deschisa[k] = 1;
    }
    for (const x of bucati) { tipuri.push(x.tip); xy.push(x.x, x.y, x.c1x, x.c1y, x.c2x, x.c2y); }
    inceput[k + 1] = tipuri.length;
    if (tipuri.length > PLAFON_TRASARE.varfuri) return { ok: false, cod: 'prea-multe', raport: raport(tipuri.length, abatere) };
  }
  return {
    ok: true,
    cai: { inceput, tip: Uint8Array.from(tipuri), xy: Float64Array.from(xy), exterior: new Uint8Array(valide.length), deschisa },
    raport: raport(tipuri.length, abatere),
  };
}

/** Lista de puncte (și lățimile lor) întoarsă pe loc. */
function invers(P: number[], L: number[]): void {
  const n = P.length / 2;
  for (let i = 0, j = n - 1; i < j; i++, j--) {
    const x = P[2 * i] ?? 0, y = P[2 * i + 1] ?? 0;
    P[2 * i] = P[2 * j] ?? 0; P[2 * i + 1] = P[2 * j + 1] ?? 0; P[2 * j] = x; P[2 * j + 1] = y;
  }
  L.reverse();
}

/**
 * Lângă o joncțiune, normala unui braț intră în celelalte brațe: lățimea măsurată acolo e prea mare (sau lipsește), iar
 * centrul, greșit (pe un X la 60°, cu 2,6 px: măsurat). Punctele de la capătul dinspre joncțiune ies până la primele trei la
 * rând cu lățimea brațului (±20 %, cel puțin ±0,75 px), dar nu mai departe de raza joncțiunii plus trei grosimi.
 */
function curataBrat(P: number[], L: number[], jx: number, jy: number, r: number): void {
  const n = P.length / 2;
  const wa = mediana(L.filter((x) => x > 0));
  if (!(wa > 0)) return;
  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) > 0 && Math.abs((L[k] ?? 0) - wa) <= Math.max(0.75, 0.2 * wa));
  let k = 0;
  while (k < n && Math.hypot((P[2 * k] ?? 0) - jx, (P[2 * k + 1] ?? 0) - jy) < r + 3 * wa && !(bun(k) && bun(k + 1) && bun(k + 2))) k++;
  P.splice(0, 2 * k);
  L.splice(0, k);
}

function lungimeXY(P: readonly number[]): number {
  let L = 0;
  for (let k = 2; k < P.length; k += 2) L += Math.hypot((P[k] ?? 0) - (P[k - 2] ?? 0), (P[k + 1] ?? 0) - (P[k - 1] ?? 0));
  return L;
}

/** Fără puncte la mai puțin de 1e-6 px de cel dinainte (și, la o buclă, fără ultimul egal cu primul). */
function faraDubluri(P: readonly number[], inchisa: boolean): number[] {
  const R: number[] = [];
  for (let k = 0; k < P.length; k += 2) {
    const x = P[k] ?? 0, y = P[k + 1] ?? 0;
    if (R.length >= 2 && Math.hypot(x - (R[R.length - 2] ?? 0), y - (R[R.length - 1] ?? 0)) < 1e-6) continue;
    R.push(x, y);
  }
  if (inchisa && R.length >= 4 && Math.hypot((R[0] ?? 0) - (R[R.length - 2] ?? 0), (R[1] ?? 0) - (R[R.length - 1] ?? 0)) < 1e-6) R.length -= 2;
  return R;
}
