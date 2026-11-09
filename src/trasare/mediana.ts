/**
 * Linia mediană (ADR 0222): cerneala la prag, cu aceeași curățare ca trasarea (`campul`); scheletul pe pixeli (subțierea
 * Zhang–Suen, apoi pixelii de scară în plus, după numărul de conexiune al lui Yokoi); graful lui: capete, joncțiuni, lanțuri
 * și buclele fără joncțiuni; cioturile tăiate; joncțiunile apropiate unite, în punctul celor mai mici pătrate al dreptelor
 * brațelor; centrul sub-pixel, la mijlocul dintre trecerile pragului de-a curmezișul trăsăturii (iar grosimea, distanța
 * dintre ele); capetele libere în centrul capătului rotund (unde se oprește o freză cât trăsătura); brațele din prelungire
 * ale unei joncțiuni legate într-o cale; curbele arcelor (ADR 0221) și ale buclelor. Opțiunile (ADR 0223): capetele în
 * vârful trăsăturii, părțile late ca contururi (și căutate doar pentru semnalare), buclele ca vectori închiși.
 *
 * Pură, fără importuri din aplicație (regula `trasare-izolat`): rulează în workerul trasării, iar probele o cheamă direct.
 * Coordonatele, ca la trasare: pixeli, y în jos, centrul pixelului (i, j) în (i + 0,5, j + 0,5). Algoritmii vin din lucrări
 * publice (Zhang și Suen 1984; Yokoi, Toriwaki și Fukumura 1975), scriși aici.
 */
import { partiLate } from './partiLate.ts';
import {
  arie, campul, contururi, curbeleArcului, curbeleBuclei, EPS_DUR, PLAFON_TRASARE, TREPTE,
  type BazaRaport, type Bucata, type CaiTrasate, type ImagineRGBA, type OptiuniTrasare,
} from './trasare.ts';

/** Opțiunile liniei mediane (ADR 0223); implicitele ferestrei sunt recomandările din ADR 0222, cu semnalarea pornită. */
export type OptiuniMediana = {
  /** Unde se termină o linie: în centrul capătului rotund (unde se oprește o freză cât trăsătura) sau în vârful trăsăturii. */
  readonly capete: 'centru' | 'varf';
  /** Părțile mai late decât pragul: linii mediane (ca restul) sau contururi (închise, cu latura din sensul lor). */
  readonly late: 'mediane' | 'contur';
  /** Pragul părților late, în px; null: automat, de două ori grosimea obișnuită a trăsăturilor. */
  readonly pragLatPx: number | null;
  /** Părțile late se caută și când rămân linii mediane: raportul le numără, previzualizarea le arată. */
  readonly semnaleaza: boolean;
  /** Buclele: tăiate pe linie, sau vectori închiși, cu latura din încuibare (bucla din afară pe exterior). */
  readonly bucle: 'linie' | 'inchise';
};

/** Linia mediană fără opțiuni (ADR 0222): capetele în centru, totul linii mediane, buclele pe linie, părțile late necăutate. */
export const MEDIANA_SIMPLA: OptiuniMediana = { capete: 'centru', late: 'mediane', pragLatPx: null, semnaleaza: false, bucle: 'linie' };

export type RaportMediana = BazaRaport & {
  /** Căile (deschise și bucle), dintre ele buclele, joncțiunile desenului și vârfurile curbelor. */
  readonly contururi: number; readonly bucle: number; readonly jonctiuni: number; readonly varfuri: number;
  /** Cea mai mare distanță dintre centrele măsurate și curbele trasate, în px. */
  readonly abatere: number;
  /** Grosimea obișnuită a trăsăturilor: mediana lățimilor măsurate de-a curmezișul, în px (0 fără măsurători). */
  readonly grosime: number;
  /** Trăsăturile mai scurte decât grosimea lor (puncte), rămase fără linie. */
  readonly puncte: number;
  /**
   * Părțile late (ADR 0223), dacă s-au căutat: câte (contururile lor de afară), ce parte din cerneală (0–1) și pragul de
   * lățime folosit, în px.
   */
  readonly parti?: { readonly numar: number; readonly arie: number; readonly pragPx: number };
};

export type RezultatMediana =
  | {
    readonly ok: true; readonly cai: CaiTrasate; readonly raport: RaportMediana;
    /** Contururile părților late, dacă s-au căutat: doar pentru semnalarea din previzualizare (fără laturi). */
    readonly late?: CaiTrasate;
  }
  | { readonly ok: false; readonly cod: 'prea-multe'; readonly raport: RaportMediana };

/**
 * Reglajele (ADR 0222 §3): pasul mersului de-a curmezișul (px); un ciot e mai scurt decât `ciot` · raza joncțiunii + 1 px;
 * două brațe se continuă sub `cotitura` grade; un punct cu lățimea sub `capat` · grosimea lanțului e în capătul rotund;
 * tangenta din punctele de la i − `vecini` la i + `vecini`; lățimea locală, mediana a ±`vecinatate` puncte; dreapta unui braț
 * sau a unei laturi de colț se trage doar cât punctele nu se abat de la ea cu mai mult de `drept` px; două brațe legate care
 * se abat de la prelungire cu peste `prelungire` grade dau, la locul joncțiunii, o singură dreaptă, prin centrele lor.
 */
export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;

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
      // La pornire, doar pixelii care pot ieși acum (între 3 și 6 vecini): cu mai puțini nu ies niciodată (vecinii doar scad),
      // iar cu mai mulți intră în coadă când li se scoate un vecin.
      let plini = 0;
      for (let k = 0; k < 8; k++) plini += v(x + (DX[k] ?? 0), y + (DY[k] ?? 0));
      if (plini >= 3 && plini <= 6) { coada[0].push(p); coada[1].push(p); sucio[p] = 3; }
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
 * de pe lanț), cu lățimea de-a curmezișul. Un punct a cărui lățime iese din lățimea locală (mediana măsurătorilor din jur,
 * ±15 %, cel puțin ±1 px) sau a cărui mutare trece de o treime din ea rămâne pe pixelul lui, cu lățimea NaN (`colturi` îl
 * scoate apoi): într-un colț drept normala trece pe diagonală, spre colț, iar lângă o joncțiune intră în alt braț (mutate,
 * făceau zigzaguri în colțurile literelor: măsurat pe logo). Două treceri: a doua, cu tangenta din centrele primei.
 */
function centreaza(P0: Float64Array, inchis: boolean, f: Float32Array, W: number, H: number, T: number): { P: Float64Array; L: Float64Array } {
  const n = P0.length / 2;
  let Q = P0;
  let L = new Float64Array(n).fill(Number.NaN);
  const D = new Float64Array(n), M = new Float64Array(n), NX = new Float64Array(n), NY = new Float64Array(n);
  const fer: number[] = [];
  for (let trecut = 0; trecut < 2; trecut++) {
    for (let i = 0; i < n; i++) {
      const ia = inchis ? (i - MEDIANA.vecini + n) % n : Math.max(0, i - MEDIANA.vecini);
      const ib = inchis ? (i + MEDIANA.vecini) % n : Math.min(n - 1, i + MEDIANA.vecini);
      let tx = (Q[2 * ib] ?? 0) - (Q[2 * ia] ?? 0), ty = (Q[2 * ib + 1] ?? 0) - (Q[2 * ia + 1] ?? 0);
      const lt = Math.hypot(tx, ty);
      M[i] = Number.NaN;
      if (lt < 1e-9) continue;
      tx /= lt; ty /= lt;
      const x = P0[2 * i] ?? 0, y = P0[2 * i + 1] ?? 0;
      NX[i] = -ty; NY[i] = tx;
      const a = trecere(f, W, H, T, x, y, -ty, tx), b = trecere(f, W, H, T, x, y, ty, -tx);
      D[i] = (a - b) / 2;
      M[i] = a + b;
    }
    const R = new Float64Array(P0), Lnou = new Float64Array(n).fill(Number.NaN);
    // Fereastra: cel puțin ±`vecinatate` puncte, și cel puțin două grosimi de-o parte și de alta (într-un colț drept al unei
    // trăsături groase, punctele strâmbe ajung până la o grosime de colț și ar trage mediana după ele).
    fer.length = 0;
    for (let i = 0; i < n; i++) if ((M[i] ?? 0) > 0) fer.push(M[i] ?? 0);
    const K = Math.max(MEDIANA.vecinatate, Math.round(2 * mediana(fer)));
    for (let i = 0; i < n; i++) {
      const w = M[i] ?? Number.NaN, d = D[i] ?? 0;
      if (!(w > 0)) continue;
      fer.length = 0;
      for (let k = -K; k <= K; k++) {
        const j = inchis ? (((i + k) % n) + n) % n : i + k;
        const v = j >= 0 && j < n ? M[j] ?? Number.NaN : Number.NaN;
        if (v > 0) fer.push(v);
      }
      const wl = mediana(fer);
      if (Math.abs(d) > Math.max(1, wl / 3) || Math.abs(w - wl) > Math.max(1, 0.15 * wl)) continue;
      R[2 * i] = (P0[2 * i] ?? 0) + (NX[i] ?? 0) * d;
      R[2 * i + 1] = (P0[2 * i + 1] ?? 0) + (NY[i] ?? 0) * d;
      Lnou[i] = w;
    }
    Q = R;
    L = Lnou;
  }
  return { P: Q, L };
}

function mediana(v: readonly number[]): number {
  if (v.length === 0) return 0;
  const s = v.slice().sort((a, b) => a - b);
  return s[s.length >> 1] ?? 0;
}

/**
 * Colțurile drepte (ca ale unei litere): un șir de puncte nemăsurate (lățimea lor ieșea din cea locală) între puncte bune
 * iese; dacă dreptele punctelor bune de dinainte și de după (cât rămân drepte, cel mult 1,5 grosimi, cel puțin trei puncte:
 * la bucla lui „e” din logo, latura scurtă de lângă colț, trasă și pe curba de sus, ducea încrucișarea în afara cernelii, iar
 * colțul se teșea) se taie sub cel puțin
 * 20°, în cerneală și la cel mult o grosime de mijlocul șirului, colțul se pune în încrucișarea lor; altfel, curbele leagă
 * direct punctele bune. Capetele lanțului nu se ating (le au `retrage` și `curataBrat`). Pe un lanț închis, șirurile trec
 * peste capăt.
 */
function colturi(P: number[], L: number[], inchis: boolean, f: Float32Array, W: number, H: number, T: number): void {
  const n = P.length / 2;
  const masurate: number[] = [];
  for (let i = 0; i < n; i++) if ((L[i] ?? 0) > 0) masurate.push(L[i] ?? 0);
  const wl = mediana(masurate);
  if (!(wl > 0) || masurate.length === n) return;
  // O insulă de cel mult două puncte bune între puncte nemăsurate ține tot de colț (lățimea lor trecea de puțin, dar și ele
  // sunt strâmbe: la colțul unui pătrat, două șiruri despărțite de două puncte nu mai aveau fiecare trei puncte bune alături).
  const rau = Uint8Array.from({ length: n }, (_, i) => ((L[i] ?? 0) > 0 ? 0 : 1));
  for (let i = 0; i < n; i++) {
    if (rau[i]) continue;
    let e = i;
    while (e < i + 3 && !rau[inchis ? e % n : e] && (inchis || e < n)) e++;
    const stanga = inchis ? rau[(i - 1 + n) % n] : i > 0 ? rau[i - 1] : 0;
    const dreapta_ = inchis ? rau[e % n] : e < n ? rau[e] : 0;
    if (e - i <= 2 && stanga && dreapta_) for (let q = i; q < e; q++) rau[inchis ? q % n : q] = 1;
  }
  const bun = (i: number): boolean => !rau[i];
  // Pe o buclă, pornirea dintr-un punct bun: un șir rău nu trece peste capătul listei.
  let start = 0;
  if (inchis) while (!bun(start)) start++;
  const at = (k: number): number => (((start + k) % n) + n) % n;
  const inLant = (k: number): boolean => inchis || (k >= 0 && k < n);
  // Dreapta punctelor bune de la k0 încolo, în sensul `pas` (cât rămân drepte, cel mult 1,5 grosimi, cel puțin trei puncte),
  // sau null.
  const dreaptaDe = (k0: number, pas: number): { cx: number; cy: number; dx: number; dy: number } | null => {
    const sel: number[] = [];
    for (let k = k0, c = 0; inLant(k) && c < n && bun(at(k)); k += pas, c++) {
      const x = P[2 * at(k)] ?? 0, y = P[2 * at(k) + 1] ?? 0;
      if (sel.length >= 6 && Math.hypot(x - (sel[0] ?? 0), y - (sel[1] ?? 0)) > Math.max(3, 1.5 * wl)) break;
      sel.push(x, y);
      if (sel.length >= 8 && abatereDreptei(sel) > MEDIANA.drept) { sel.length -= 2; break; }
    }
    return sel.length >= 6 ? dreapta(sel, 0, sel.length / 2 - 1) : null;
  };
  const Q: number[] = [], M: number[] = [];
  const pastreaza = (k: number): void => { Q.push(P[2 * at(k)] ?? 0, P[2 * at(k) + 1] ?? 0); M.push(L[at(k)] ?? Number.NaN); };
  for (let k = 0; k < n;) {
    if (bun(at(k))) { pastreaza(k); k++; continue; }
    let e = k;
    while (e < n && !bun(at(e))) e++;
    // Un șir care atinge un capăt al lanțului deschis rămâne: e al capătului.
    if (!inchis && (k === 0 || e >= n)) { for (let q = k; q < e; q++) pastreaza(q); k = e; continue; }
    const A = dreaptaDe(k - 1, -1), B = dreaptaDe(e, 1);
    if (A && B) {
      const sin = A.dx * B.dy - A.dy * B.dx;
      if (Math.abs(sin) >= Math.sin((20 * Math.PI) / 180)) {
        const t = ((B.cx - A.cx) * B.dy - (B.cy - A.cy) * B.dx) / sin;
        const x = A.cx + A.dx * t, y = A.cy + A.dy * t, im = at(Math.floor((k + e - 1) / 2));
        if (camp(f, W, H, x, y) >= T && Math.hypot(x - (P[2 * im] ?? 0), y - (P[2 * im + 1] ?? 0)) <= wl) { Q.push(x, y); M.push(Number.NaN); }
      }
    } else {
      for (let q = k; q < e; q++) pastreaza(q);
    }
    k = e;
  }
  P.length = 0; P.push(...Q);
  L.length = 0; L.push(...M);
}

/** Cea mai mare abatere a punctelor listei de la dreapta lor (a celor mai mici pătrate). */
function abatereDreptei(P: readonly number[]): number {
  const d = dreapta(P, 0, P.length / 2 - 1);
  let m = 0;
  for (let t = 0; t < P.length; t += 2) m = Math.max(m, Math.abs(((P[t] ?? 0) - d.cx) * d.dy - ((P[t + 1] ?? 0) - d.cy) * d.dx));
  return m;
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
 * până la primele trei la rând cu lățimea lanțului (cel puțin `capat` · grosimea lui: mai îngustă e rotunjimea capătului);
 * direcția, din dreapta punctelor de după ele (cât 1,5 grosimi); vârful, unde trece pragul mergând înainte, din centrul
 * dreptei; centrul e la o jumătate de grosime înapoi de vârf, recentrat de-a curmezișul. Un capăt drept dă tot punctul în
 * care se oprește o freză cât trăsătura.
 */
function retrage(P: number[], L: number[], f: Float32Array, W: number, H: number, T: number, varf: boolean): void {
  const n = P.length / 2;
  const masurate = L.filter((x) => x > 0);
  if (n < 2 || masurate.length === 0) return;
  const wm = mediana(masurate);
  const bun = (k: number): boolean => k >= n || (L[k] ?? 0) >= MEDIANA.capat * wm;
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
  let cx = d.cx + dx * avans, cy = d.cy + dy * avans;
  // Centrul capătului, recentrat de-a curmezișul: acolo trăsătura are toată lățimea, iar o direcție puțin strâmbă (scheletul
  // cotit spre colțul unui capăt drept) îl muta cu până la 0,7 px într-o parte (măsurat).
  const sus = trecere(f, W, H, T, cx, cy, -dy, dx), jos = trecere(f, W, H, T, cx, cy, dy, -dx);
  if (sus > 0 && jos > 0 && Math.abs(sus - jos) / 2 <= Math.max(1, wl / 3)) { cx += (-dy * (sus - jos)) / 2; cy += (dx * (sus - jos)) / 2; }
  // Punctele din fața centrului ies, ca și cele la mai puțin de o jumătate de grosime de el: capătul intră drept în centru, pe
  // direcția lui (lângă capătul unui bloc gros sau al unei trăsături cu capătul tăiat oblic, ele cârligau linia: logoul).
  let k = i0;
  while (k + 1 < n && (((P[2 * k] ?? 0) - cx) * dx + ((P[2 * k + 1] ?? 0) - cy) * dy > -0.05 || Math.hypot((P[2 * k] ?? 0) - cx, (P[2 * k + 1] ?? 0) - cy) < wl / 2)) k++;
  // În vârf (ADR 0223): din centrul capătului, până trece pragul (pe un capăt rotund, vârful lui; pe unul drept, marginea; lângă
  // o parte lată tăiată din câmp, conturul ei), pe direcția porțiunii drepte de lângă capăt (abaterea cel mult `drept`): pe
  // talpa scurtă a lui „t” din logo, dreapta celor 1,5 grosimi prindea curba și scotea vârful oblic, în colț.
  if (varf) {
    let j = i0 + 1, vx = dx, vy = dy;
    while (j + 1 <= i1 && abatereDreptei(P.slice(2 * i0, 2 * (j + 2))) <= MEDIANA.drept) j++;
    if (j - i0 >= 2) {
      const dv = dreapta(P, i0, j), semn = dv.dx * dx + dv.dy * dy < 0 ? -1 : 1;
      vx = semn * dv.dx; vy = semn * dv.dy;
    }
    const t = trecere(f, W, H, T, cx, cy, vx, vy);
    if (t > 0) {
      P.splice(0, 2 * k, cx + vx * t, cy + vy * t, cx, cy);
      L.splice(0, k, wl, wl);
      return;
    }
  }
  P.splice(0, 2 * k, cx, cy);
  L.splice(0, k, wl);
}

// ── Linia mediană întreagă ─────────────────────────────────────────────────────────────────────────────────────────────

/** Capătul unei muchii: liber (centrul capătului rotund) sau într-o joncțiune (grupul ei). */
type Capat = { readonly g: number };
/** O direcție (vector unitate). */
type Directie = readonly [number, number];
/**
 * Muchia: punctele (de la capătul a la b), lățimile, capetele și, la fiecare capăt dintr-o joncțiune, direcția brută a
 * brațului (din pixelii scheletului de lângă joncțiune).
 */
type Muchie = {
  readonly P: number[]; readonly L: number[]; readonly a: Capat | null; readonly b: Capat | null;
  readonly dA: Directie | null; readonly dB: Directie | null;
};

/** Căile asamblate ale liniilor mediane, în pixeli, înaintea curbelor; lățimile măsurate, joncțiunile și punctele. */
type Linii = {
  readonly cai: Array<{ P: number[]; inchisa: boolean }>; readonly latimi: number[]; readonly jonctiuni: number; readonly puncte: number;
};

/** Liniile mediane ale cernelii câmpului `f` (pragul T); `varf`: capetele libere în vârful trăsăturii (ADR 0223). */
function linii(f: Float32Array, T: number, W: number, H: number, varf: boolean): Linii {
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
  // Muchiile: fiecare lanț (afară de punți), fără pixelii din cercul joncțiunii, centrat, cu colțurile refăcute și, la fiecare
  // capăt dintr-o joncțiune, direcția brută a brațului: media pixelilor scheletului de la cercul joncțiunii până la încă 1,5
  // grosimi de el (din ea, verificarea dreptei brațului și direcția lui, dacă n-are dreaptă).
  const bucleLibere: Array<{ P: Float64Array; L: Float64Array }> = [];
  const latimi: number[] = [];
  const centrate: Muchie[] = [];
  for (const l of lant) {
    if (punti.has(l)) continue;
    if (l.inchis) {
      const P0 = Float64Array.from(l.pix.flatMap((q) => [(q % W) + 0.5, Math.floor(q / W) + 0.5]));
      const c = centreaza(P0, true, f, W, H, T);
      for (const w of c.L) if (w > 0) latimi.push(w);
      const P = Array.from(c.P), L = Array.from(c.L);
      colturi(P, L, true, f, W, H, T);
      bucleLibere.push({ P: Float64Array.from(P), L: Float64Array.from(L) });
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
    const pixA = pix.slice(0, 128), pixB = pix.slice(-128).reverse();
    let i = 0, j = pix.length - 1;
    while (i <= j && !departe(pix[i] ?? 0, a)) i++;
    while (j >= i && !departe(pix[j] ?? 0, b)) j--;
    pix = pix.slice(i, j + 1);
    const P0 = Float64Array.from(pix.flatMap((q) => [(q % W) + 0.5, Math.floor(q / W) + 0.5]));
    const c = pix.length > 0 ? centreaza(P0, false, f, W, H, T) : { P: P0, L: new Float64Array(0) };
    for (const w of c.L) if (w > 0) latimi.push(w);
    const P = Array.from(c.P), L = Array.from(c.L);
    colturi(P, L, false, f, W, H, T);
    const wa = mediana(L.filter((x) => x > 0));
    const bruta = (cap: Capat | null, pixe: readonly number[]): Directie | null => {
      const v = cap ? grupuri.get(cap.g) : undefined;
      if (!cap || !v) return null;
      let sx = 0, sy = 0, k = 0;
      for (const q of pixe) {
        const x = (q % W) + 0.5, y = Math.floor(q / W) + 0.5, d = Math.hypot(x - v.x, y - v.y);
        if (d > v.r + Math.max(3, 1.5 * (wa || 2 * v.r))) break;
        if (d >= v.r) { sx += x; sy += y; k++; }
      }
      const bx = k > 0 ? sx / k - v.x : 0, by = k > 0 ? sy / k - v.y : 0, m = Math.hypot(bx, by);
      return m > 1e-9 ? [bx / m, by / m] : null;
    };
    centrate.push({ P, L, a, b, dA: bruta(a, pixA), dB: bruta(b, pixB) });
  }
  // Brațele fiecărei joncțiuni: dreapta primelor puncte ale brațului (curățat lângă joncțiune), cât rămân pe o dreaptă (abaterea
  // cel mult `drept`, cel mult 1,5 grosimi, cel puțin trei puncte: un braț scurt care cotește după joncțiune, ca latura unei
  // urechi a logoului, nu-și ia direcția din colț; cu abaterea de 0,1 grosimi, la „e”-ul logoului, latura dreaptă doar ~4 px
  // după joncțiune prindea curba buclei și se înclina cu 22°), cu direcția dinspre joncțiune; altfel, direcția brută (nu a
  // capătului îndepărtat al brațului, care la urechea logoului era joncțiunea de jos: brațul inelului se lega de trăsătura de
  // sus).
  type Brat = { readonly e: number; readonly capat: 'a' | 'b'; readonly dx: number; readonly dy: number; readonly cx: number; readonly cy: number; readonly linie: boolean; readonly px: number; readonly py: number };
  const brateDin = (muchii: readonly Muchie[]): Map<number, Brat[]> => {
    const brate = new Map<number, Brat[]>();
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
          // Un punct nemăsurat (un colț, o margine a joncțiunii) încheie porțiunea dreaptă: la urechea din dreapta a logoului,
          // colțul inelului venea după două puncte ale laturii și înclina dreapta brațului cu 37°.
          if (k > 0 && !((mu.L[q] ?? 0) > 0)) break;
          sel.push(x, y);
          if (sel.length >= 8 && abatereDreptei(sel) > MEDIANA.drept) { sel.length -= 2; break; }
        }
        let dx = 0, dy = 0, cx = v.x, cy = v.y;
        // Dreapta contează doar dacă merge cam încotro pleacă scheletul din joncțiune (cel mult 45° de direcția lui brută): la
        // urechea logoului, primele puncte bune ale inelului erau deja după colț, pe latura verticală, iar dreapta lor „cobora”.
        const bruta = capat === 'a' ? mu.dA : mu.dB;
        let linie = sel.length >= 6;
        if (linie && bruta) {
          const d = dreapta(sel, 0, sel.length / 2 - 1), semn = (d.cx - v.x) * d.dx + (d.cy - v.y) * d.dy < 0 ? -1 : 1;
          if (semn * (d.dx * bruta[0] + d.dy * bruta[1]) < Math.SQRT1_2) linie = false;
        }
        // Doar două puncte (latura scurtă dintre joncțiune și un colț): coarda lor dă direcția brațului, pentru legare, dacă e
        // cam încotro pleacă scheletul; locul joncțiunii cere însă o dreaptă din cel puțin trei puncte.
        const coarda = sel.length === 4 ? Math.hypot((sel[2] ?? 0) - (sel[0] ?? 0), (sel[3] ?? 0) - (sel[1] ?? 0)) : 0;
        if (linie) {
          ({ dx, dy, cx, cy } = dreapta(sel, 0, sel.length / 2 - 1));
          if ((cx - v.x) * dx + (cy - v.y) * dy < 0) { dx = -dx; dy = -dy; }
        } else if (coarda >= 0.75 && bruta && (((sel[2] ?? 0) - (sel[0] ?? 0)) * bruta[0] + ((sel[3] ?? 0) - (sel[1] ?? 0)) * bruta[1]) / coarda >= Math.SQRT1_2) {
          dx = (sel[2] ?? 0) - (sel[0] ?? 0); dy = (sel[3] ?? 0) - (sel[1] ?? 0);
        } else if (bruta) {
          [dx, dy] = bruta;
        } else if (n > 0) {
          dx = (mu.P[2 * idx(0)] ?? 0) - v.x; dy = (mu.P[2 * idx(0) + 1] ?? 0) - v.y;
        } else {
          const alt = mu[capat === 'a' ? 'b' : 'a'], u = alt ? grupuri.get(alt.g) : undefined;
          if (u) { dx = u.x - v.x; dy = u.y - v.y; }
        }
        const l = Math.hypot(dx, dy) || 1;
        const lista = brate.get(c.g) ?? [];
        lista.push({ e, capat, dx: dx / l, dy: dy / l, cx, cy, linie, px: sel[0] ?? v.x, py: sel[1] ?? v.y });
        brate.set(c.g, lista);
      }
    }
    return brate;
  };
  // Capetele: cel liber, în centrul capătului rotund; cel dintr-o joncțiune, curățat de punctele în care normala intră în
  // celelalte brațe, adică până la (w/2)/tan(θ/2) de centrul ei, θ fiind unghiul cel mai mic dintre două brațe ale joncțiunii
  // (la 90°, o jumătate de grosime; la o furcă de 20°, ~2,8 grosimi: și brațul din spate trece prin zona în care trăsăturile
  // se suprapun). Nu mai departe: la urechile logoului, curățarea de până la trei grosimi trecea de colțul inelului de lângă
  // joncțiune și îl tăia cu o coardă. Unghiul vine din dreptele brațelor după o primă curățare, cea de până la trei grosimi
  // (direcțiile brute, din pixelii de lângă joncțiune, sunt strâmbe tocmai la furcile înguste: la 20°, 73°).
  const curata = (unghiuri: ReadonlyMap<number, number> | null): Muchie[] => centrate.map((m) => {
    const P = m.P.slice(), L = m.L.slice();
    const laCapat = (cap: Capat | null): void => {
      if (!cap) { retrage(P, L, f, W, H, T, varf); return; }
      const v = grupuri.get(cap.g);
      if (v) curataBrat(P, L, v.x, v.y, v.r, unghiuri?.get(cap.g) ?? null);
    };
    laCapat(m.a);
    invers(P, L);
    laCapat(m.b);
    invers(P, L);
    return { P, L, a: m.a, b: m.b, dA: m.dA, dB: m.dB };
  });
  const unghiuri = new Map<number, number>();
  for (const [g, lista] of brateDin(curata(null))) {
    let m = Math.PI;
    for (const [i, a] of lista.entries()) for (const b of lista.slice(i + 1)) m = Math.min(m, Math.acos(Math.max(-1, Math.min(1, a.dx * b.dx + a.dy * b.dy))));
    unghiuri.set(g, m);
  }
  const muchii: Muchie[] = [];
  for (const mu of curata(unghiuri)) {
    if (!mu.a && !mu.b && lungimeXY(mu.P) < 0.5) { puncte++; continue; }
    muchii.push(mu);
  }
  const brate = brateDin(muchii);
  const locuri = new Map<number, readonly [number, number]>();
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
  // Locul fiecărei joncțiuni: punctul celor mai mici pătrate al dreptelor brațelor, dacă e în cerneală; altfel (la „Ve”, în
  // logo, încrucișarea brațelor curbe ieșea la 15 px, între litere), sau fără două direcții destul de diferite, media pixelilor
  // ei. Două brațe legate într-o pereche (o trăsătură care trece prin joncțiune) care nu sunt în prelungire (peste `prelungire`
  // grade) dau o singură dreaptă, prin primele lor puncte (cele mai apropiate de joncțiune: pe o trăsătură curbă, coarda dintre
  // centrele dreptelor trecea cu săgeata arcului mai încolo, 1 px pe buclele semnăturii): la „e”-ul logoului, latura din stânga se curbează de o parte și
  // de alta a barei din mijloc, iar cele două drepte, fiecare puțin înclinată spre curba ei, se tăiau în afara mijlocului
  // (4,6 px). În prelungire, dreptele rămân separate: la o furcă de 20°, primele puncte ale brațului din spate, din zona
  // comună, mută centrul lui cu 0,15 px, iar dreapta comună ducea joncțiunea de la 0,14 la 0,32 px. Fără gardă de distanță: într-o furcă
  // îngustă, încrucișarea stă departe de pixelii joncțiunii (la 20°, ~5 raze; o gardă de o rază o respingea, cu linia la
  // 0,29 px în loc de 0,09).
  const dupaCheie = new Map<number, Brat>();
  for (const lista of brate.values()) for (const b of lista) dupaCheie.set(cheie(b.e, b.capat), b);
  for (const [g, lista] of brate) {
    const v = grupuri.get(g);
    if (!v) continue;
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    const adauga = (cx: number, cy: number, dx: number, dy: number, w: number): void => {
      const m11 = 1 - dx * dx, m12 = -dx * dy, m22 = 1 - dy * dy;
      a11 += w * m11; a12 += w * m12; a22 += w * m22;
      b1 += w * (m11 * cx + m12 * cy); b2 += w * (m12 * cx + m22 * cy);
    };
    const facut = new Set<Brat>();
    for (const b of lista) {
      if (!b.linie || facut.has(b)) continue;
      facut.add(b);
      const p = pereche.get(cheie(b.e, b.capat)), o = p === undefined ? undefined : dupaCheie.get(p);
      // Un braț vecin apropiat de pereche (sub 45°: un X îngust, unde perechea leagă o trăsătură de puntea dintre cele două Y-uri,
      // pe bisectoare) face din primele puncte ale perechii puncte ale zonei comune: atunci, dreptele separate.
      if (!o || !o.linie) { adauga(b.cx, b.cy, b.dx, b.dy, 1); continue; }
      const departe = lista.every((q) => q === b || q === o || Math.max(q.dx * b.dx + q.dy * b.dy, q.dx * o.dx + q.dy * o.dy) <= Math.SQRT1_2);
      if (!departe || -(b.dx * o.dx + b.dy * o.dy) >= Math.cos((MEDIANA.prelungire * Math.PI) / 180)) { adauga(b.cx, b.cy, b.dx, b.dy, 1); continue; }
      facut.add(o);
      let dx = o.px - b.px, dy = o.py - b.py;
      const l = Math.hypot(dx, dy);
      if (l >= 2) { dx /= l; dy /= l; } else { dx = b.dx - o.dx; dy = b.dy - o.dy; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; }
      adauga((b.px + o.px) / 2, (b.py + o.py) / 2, dx, dy, 2);
    }
    const det = a11 * a22 - a12 * a12;
    let x = v.x, y = v.y;
    if (det > 0.05) {
      const lx = (a22 * b1 - a12 * b2) / det, ly = (a11 * b2 - a12 * b1) / det;
      if (camp(f, W, H, lx, ly) >= T) { x = lx; y = ly; }
    }
    locuri.set(g, [x, y]);
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
  return { cai, latimi, jonctiuni: locuri.size, puncte };
}

/** Inelul închis P (x0, y0, x1, y1, …) cuprinde punctul (x, y)? (paritatea tăieturilor unei raze spre dreapta) */
function inInel(P: readonly number[], x: number, y: number): boolean {
  let in_ = false;
  const n = P.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = P[2 * i] ?? 0, yi = P[2 * i + 1] ?? 0, xj = P[2 * j] ?? 0, yj = P[2 * j + 1] ?? 0;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
}

/**
 * Capetele unei linii de lângă o parte lată (tăiată din câmp, deci capătul rămâne la o jumătate de grosime de ea): linia
 * merge mai departe, pe direcția capătului, până în conturul părții late (cel mult încă o grosime și jumătate), ca freza să
 * nu lase o punte între linie și buzunar.
 */
function lipeste(cai: Linii['cai'], laMiez: Float32Array, W: number, H: number, R0: number, w: number): number {
  const d = (x: number, y: number): number => {
    const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const g = (i: number, j: number): number => laMiez[Math.min(H - 1, Math.max(0, j)) * W + Math.min(W - 1, Math.max(0, i))] ?? Infinity;
    return (1 - u) * (1 - v) * g(x0, y0) + u * (1 - v) * g(x0 + 1, y0) + (1 - u) * v * g(x0, y0 + 1) + u * v * g(x0 + 1, y0 + 1);
  };
  let lipite = 0;
  for (const c of cai) {
    if (c.inchisa) continue;
    for (const capat of [0, 1] as const) {
      const P = c.P, n = P.length / 2;
      if (n < 2) break;
      const i0 = capat === 0 ? 0 : n - 1, pas = capat === 0 ? 1 : -1;
      const x = P[2 * i0] ?? 0, y = P[2 * i0 + 1] ?? 0;
      if (!(d(x, y) <= R0 + w)) continue;
      // Direcția capătului: spre el, din punctele de pe ultima grosime și jumătate.
      let k = i0;
      while (k + pas >= 0 && k + pas < n && Math.hypot((P[2 * (k + pas)] ?? 0) - x, (P[2 * (k + pas) + 1] ?? 0) - y) <= Math.max(2, 1.5 * w)) k += pas;
      let dx = x - (P[2 * k] ?? 0), dy = y - (P[2 * k + 1] ?? 0);
      const l = Math.hypot(dx, dy);
      if (!(l > 1e-9)) continue;
      dx /= l; dy /= l;
      let u = 0;
      while (u <= 1.5 * w && d(x + dx * u, y + dy * u) > R0) u += 0.25;
      if (u > 1.5 * w || u === 0) continue;
      lipite++;
      if (capat === 0) P.unshift(x + dx * u, y + dy * u);
      else P.push(x + dx * u, y + dy * u);
    }
  }
  return lipite;
}

/**
 * Linia mediană a unei imagini (ADR 0222), cu opțiunile din ADR 0223 (`om`; lipsă: ca în ADR 0222, fără părțile late).
 * Părțile late se caută cu pragul dat sau cu de două ori grosimea obișnuită (din liniile întregului desen): ca contururi,
 * liniile se retrasează pe rest, cu capetele lipite de conturul lor.
 */
export function traseazaMediana(img: ImagineRGBA, o: OptiuniTrasare, om: OptiuniMediana = MEDIANA_SIMPLA): RezultatMediana {
  const { latime: W, inaltime: H } = img;
  const { f, T, baza } = campul(img, o);
  const varf = om.capete === 'varf';
  let L = linii(f, T, W, H, varf);
  const grosime = mediana(L.latimi);
  // Părțile late: căutate pentru semnalare sau ca să rămână contururi; fără grosime măsurată (doar puncte), nu.
  let late: Float64Array[] = [];
  let parti: RaportMediana['parti'];
  if ((om.semnaleaza || om.late === 'contur') && grosime > 0) {
    const pragPx = om.pragLatPx ?? 2 * grosime;
    const pl = partiLate(f, T, W, H, pragPx / 2);
    late = pl.arieLata > 0 ? contururi(pl.lata, W, H, T) : [];
    parti = { numar: late.filter((b) => arie(b) > 0).length, arie: pl.arieLata / Math.max(1, pl.arieCerneala), pragPx };
    if (om.late === 'contur' && late.length > 0) {
      L = linii(pl.subtire, T, W, H, varf);
      lipeste(L.cai, pl.laMiez, W, H, pl.R0, grosime);
    }
  }
  // Curbele, cu treptele Netezimii (pe marginile dure, banda cel puțin `EPS_DUR`, ca la trasare).
  const trepte = TREPTE[o.netezime];
  const dure = baza.margini === 'dure';
  const eps = dure ? Math.max(trepte.eps, EPS_DUR) : trepte.eps;
  const tau = dure ? Math.max(trepte.tau, EPS_DUR) : trepte.tau;
  const depasire = dure ? 1.5 : 0.9;
  const valide = L.cai.filter((c) => c.P.length >= (c.inchisa ? 6 : 4));
  const contur = om.late === 'contur' ? late : [];
  // Buclele ca vectori închiși: latura din încuibare (câte alte bucle o cuprind: pare, exterior; impare, interior).
  const inchise = om.bucle === 'inchise' ? valide.filter((c) => c.inchisa) : [];
  const exteriorBucla = new Map<(typeof valide)[number], number>();
  for (const c of inchise) {
    const x = c.P[0] ?? 0, y = c.P[1] ?? 0;
    let n = 0;
    for (const d of inchise) if (d !== c && inInel(d.P, x, y)) n++;
    exteriorBucla.set(c, n % 2 === 0 ? 1 : 0);
  }
  const nCai = valide.length + contur.length;
  const bucle = valide.filter((c) => c.inchisa).length;
  const raport = (varfuri: number, abatere: number): RaportMediana => ({
    ...baza, contururi: nCai, bucle, jonctiuni: L.jonctiuni, varfuri, abatere, grosime, puncte: L.puncte, ...(parti ? { parti } : {}),
  });
  if (nCai > PLAFON_TRASARE.contururi) return { ok: false, cod: 'prea-multe', raport: raport(0, 0) };
  const inceput = new Uint32Array(nCai + 1);
  const deschisa = new Uint8Array(nCai), exterior = new Uint8Array(nCai), peLinie = new Uint8Array(nCai).fill(1);
  const tipuri: number[] = [];
  const xy: number[] = [];
  let abatere = 0;
  const adauga = (bucati: readonly Bucata[], k: number): boolean => {
    for (const x of bucati) { tipuri.push(x.tip); xy.push(x.x, x.y, x.c1x, x.c1y, x.c2x, x.c2y); }
    inceput[k + 1] = tipuri.length;
    return tipuri.length <= PLAFON_TRASARE.varfuri;
  };
  for (const [k, c] of valide.entries()) {
    const P = Float64Array.from(c.P);
    let bucati: Bucata[];
    if (c.inchisa) {
      const r = curbeleBuclei(P, eps, tau, trepte.colt, depasire);
      bucati = r.bucati;
      abatere = Math.max(abatere, r.abatere);
      const e = exteriorBucla.get(c);
      if (e !== undefined) { peLinie[k] = 0; exterior[k] = e; }
    } else {
      const r = curbeleArcului(P, eps, tau, trepte.colt, depasire);
      bucati = [...r.bucati, { tip: 0, x: r.sfarsit[0], y: r.sfarsit[1], c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: 0, la: 0 }];
      abatere = Math.max(abatere, r.abatere);
      deschisa[k] = 1;
    }
    if (!adauga(bucati, k)) return { ok: false, cod: 'prea-multe', raport: raport(tipuri.length, abatere) };
  }
  // Contururile părților late, ca la trasare: latura din sensul lor (marginea de afară, exterior; un gol, interior).
  const curbeLate = late.map((b) => curbeleBuclei(b, eps, tau, trepte.colt, depasire));
  for (const [j, r] of (om.late === 'contur' ? curbeLate : []).entries()) {
    const k = valide.length + j;
    abatere = Math.max(abatere, r.abatere);
    peLinie[k] = 0;
    exterior[k] = arie(late[j] ?? new Float64Array(0)) > 0 ? 1 : 0;
    if (!adauga(r.bucati, k)) return { ok: false, cod: 'prea-multe', raport: raport(tipuri.length, abatere) };
  }
  const cai: CaiTrasate = {
    inceput, tip: Uint8Array.from(tipuri), xy: Float64Array.from(xy), exterior, deschisa,
    ...(peLinie.includes(0) ? { peLinie } : {}),
  };
  if (!parti) return { ok: true, cai, raport: raport(tipuri.length, abatere) };
  // Contururile pentru semnalare, separat (și când părțile late rămân linii mediane); doar de desenat, fără laturi.
  const t2: number[] = [], xy2: number[] = [], inceput2 = new Uint32Array(late.length + 1);
  for (const [j, r] of curbeLate.entries()) {
    for (const x of r.bucati) { t2.push(x.tip); xy2.push(x.x, x.y, x.c1x, x.c1y, x.c2x, x.c2y); }
    inceput2[j + 1] = t2.length;
  }
  return {
    ok: true, cai, raport: raport(tipuri.length, abatere),
    late: { inceput: inceput2, tip: Uint8Array.from(t2), xy: Float64Array.from(xy2), exterior: new Uint8Array(late.length) },
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
 * rând cu lățimea brațului (±20 %, cel puțin ±0,75 px), dar nu mai departe de cât intră normala în brațul cel mai apropiat,
 * la unghiul `unghi` (rad): (w/2)/tan(θ/2) de centru, cel puțin raza joncțiunii, plus un sfert de grosime (cel puțin 1 px),
 * și cel mult raza plus trei grosimi (fără unghi, atât).
 */
function curataBrat(P: number[], L: number[], jx: number, jy: number, r: number, unghi: number | null): void {
  const n = P.length / 2;
  const wa = mediana(L.filter((x) => x > 0));
  if (!(wa > 0)) return;
  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) > 0 && Math.abs((L[k] ?? 0) - wa) <= Math.max(0.75, 0.2 * wa));
  const pana = unghi === null ? r + 3 * wa : Math.min(r + 3 * wa, Math.max(r, wa / 2 / Math.tan(unghi / 2)) + Math.max(1, 0.25 * wa));
  // Dincolo de zonă, un punct rău nu e al joncțiunii (la urechea din dreapta a logoului, colțul inelului venea după două puncte
  // bune ale laturii, iar curățarea le scotea, cu brațul pornit din colț): acolo contează ca bun.
  const inZona = (k: number): boolean => k < n && Math.hypot((P[2 * k] ?? 0) - jx, (P[2 * k + 1] ?? 0) - jy) < pana;
  const bunAici = (k: number): boolean => !inZona(k) || bun(k);
  let k = 0;
  while (inZona(k) && !(bun(k) && bunAici(k + 1) && bunAici(k + 2))) k++;
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
