/**
 * Trasarea din imagine (ADR 0220): imaginea RGBA → cerneala → pragul → curățarea → conturul sub-pixel → poligonul → colțurile
 * și cubicele, cu abaterea măsurată. Pură, fără importuri din aplicație: rulează în workerul trasării
 * (`src/jobs/lucratorTrasare.ts`), iar probele o cheamă direct.
 *
 * Coordonatele sunt în pixeli: x spre dreapta, y în jos, pixelul (0, 0) acoperă pătratul [0, 1]², cu centrul în (0,5, 0,5).
 * Algoritmii vin din lucrări publice (Otsu 1979; marching squares; Selinger 2003 pentru poligon, colțuri și cubice), scriși
 * aici fără cod străin: potrace e GPL, iar `marchingsquares` din ediția întâi era AGPL.
 */

export type ImagineRGBA = { readonly latime: number; readonly inaltime: number; readonly date: ArrayLike<number> };
export type SursaTrasare = 'auto' | 'alfa' | 'lum';
export type Netezime = 'fidel' | 'echilibrat' | 'neted';

export type OptiuniTrasare = {
  readonly sursa: SursaTrasare;
  /** Pragul, din 255 (o valoare cel puțin cât el e cerneală); null: automat. */
  readonly prag: number | null;
  readonly inverseaza: boolean;
  readonly netezime: Netezime;
  /** Aria, în px², sub care o pată de cerneală se șterge (0: niciuna). */
  readonly petePx: number;
  /** Aria, în px², sub care un gol din cerneală se umple (0: niciunul). */
  readonly gauriPx: number;
};

/** Plafoanele trasării (ADR 0220 §9, lecția D6): peste ele, refuzul spune ce să schimbi. */
export const PLAFON_TRASARE = { contururi: 20_000, varfuri: 500_000 } as const;

/**
 * Căile trasate, în pixeli, gata de transferat: calea k are vârfurile [inceput[k], inceput[k + 1]); vârful v pornește din
 * (xy[6v], xy[6v + 1]) spre vârful următor al căii (după ultimul, primul: căile sunt închise), cu o linie (`tip[v]` 0) sau cu
 * o cubică (1), cu mânerele (xy[6v + 2], xy[6v + 3]) și (xy[6v + 4], xy[6v + 5]). `exterior[k]` e 1 pe marginea de afară a
 * cernelii și 0 pe un gol (din orientarea buclei: latura de tăiere, fără imbricare).
 */
export type CaiTrasate = {
  readonly inceput: Uint32Array; readonly tip: Uint8Array; readonly xy: Float64Array; readonly exterior: Uint8Array;
  /**
   * Liniile mediane (ADR 0222): `deschisa[k]` e 1 pe o cale deschisă, al cărei ultim vârf e capătul ei (fără segment după
   * el, ca un contur deschis al documentului); lipsă, toate căile sunt închise.
   */
  readonly deschisa?: Uint8Array;
  /**
   * Liniile mediane cu opțiuni (ADR 0223): `peLinie[k]` e 1 pe o cale tăiată pe linie și 0 pe una cu latura din `exterior[k]`
   * (contururile părților late, buclele ca vectori închiși); lipsă, toate căile mediane se taie pe linie.
   */
  readonly peLinie?: Uint8Array;
};

export type RaportTrasare = {
  readonly latime: number; readonly inaltime: number;
  /** Imaginea are fundal transparent (cel puțin 1 % din pixeli sub jumătatea opacității). */
  readonly transparenta: boolean;
  readonly sursa: 'alfa' | 'lum';
  /** Pragul folosit, din 255, și dacă a fost cel automat. */
  readonly prag: number; readonly automat: boolean;
  /** Marginile desenului: netezite (cu nuanțe între desen și fundal) sau dure (pixeli plini sau goi). */
  readonly margini: 'netezite' | 'dure';
  /** Petele șterse și golurile umplute la curățare. */
  readonly pete: number; readonly gauri: number;
  readonly contururi: number; readonly exterioare: number; readonly varfuri: number;
  /** Cea mai mare distanță dintre conturul sub-pixel și curbele trasate, în px. */
  readonly abatere: number;
  /** Histograma cernelii (256 de trepte, înainte de curățare): fereastra o arată sub glisorul pragului. */
  readonly histograma: readonly number[];
};

export type RezultatTrasare =
  | { readonly ok: true; readonly cai: CaiTrasate; readonly raport: RaportTrasare }
  | { readonly ok: false; readonly cod: 'prea-multe'; readonly raport: RaportTrasare };

/** Banda poligonului (ε), toleranța unirii cubicelor (τ) și pragul colțurilor (α), în px, pe treptele Netezimii. */
export const TREPTE: Readonly<Record<Netezime, { readonly eps: number; readonly tau: number; readonly colt: number }>> = {
  fidel: { eps: 0.2, tau: 0.22, colt: 1.5 },
  echilibrat: { eps: 0.3, tau: 0.32, colt: 2.0 },
  neted: { eps: 0.45, tau: 0.5, colt: 2.8 },
};
/**
 * Pe marginile dure, conturul urcă în trepte de o jumătate de pixel: se netezește întâi (o medie triunghiulară pe cinci puncte,
 * care lasă treptele la ~0,15 px), apoi banda le cuprinde.
 */
export const EPS_DUR = 0.4;

/** Netezirea unei bucle cu margini dure: media ponderată 1, 2, 3, 2, 1 a punctelor vecine. */
export function netezeste(b: Float64Array): Float64Array {
  const n = b.length / 2, r = new Float64Array(b.length);
  const v = (k: number, c: number): number => b[2 * (((k % n) + n) % n) + c] ?? 0;
  for (let k = 0; k < n; k++) {
    for (let c = 0; c < 2; c++) r[2 * k + c] = (v(k - 2, c) + 2 * v(k - 1, c) + 3 * v(k, c) + 2 * v(k + 1, c) + v(k + 2, c)) / 9;
  }
  return r;
}

// ── Cerneala și pragul ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Cerneala fiecărui pixel, în [0, 1], din RGBA (lecția D7: nu din luminanță întâi). Cu fundal transparent, cerneala e
 * acoperirea: alfa față de nivelul plin al imaginii (percentila 98 a pixelilor vizibili), deci literele albe, negre sau
 * colorate ies la fel. Pe o imagine opacă, cerneala e întunecimea (pusă pe alb), iar ce domină marginea imaginii e fundalul.
 */
export function cerneala(img: ImagineRGBA, o: Pick<OptiuniTrasare, 'sursa' | 'inverseaza'>): { f: Float32Array; transparenta: boolean; sursa: 'alfa' | 'lum' } {
  const { latime: W, inaltime: H, date: d } = img;
  const n = W * H;
  const hist = new Float64Array(256);
  for (let p = 0; p < n; p++) { const a = d[4 * p + 3] ?? 0; hist[a] = (hist[a] ?? 0) + 1; }
  let sub = 0;
  for (let a = 0; a < 128; a++) sub += hist[a] ?? 0;
  const transparenta = sub >= n * 0.01;
  const sursa = o.sursa === 'auto' ? (transparenta ? 'alfa' : 'lum') : o.sursa;
  const f = new Float32Array(n);
  if (sursa === 'alfa') {
    const vizibili = n - (hist[0] ?? 0);
    let plin = 255;
    for (let a = 255, s = 0; a >= 1 && vizibili > 0; a--) {
      s += hist[a] ?? 0;
      if (s >= vizibili * 0.02) { plin = a; break; }
    }
    for (let p = 0; p < n; p++) f[p] = Math.min(1, (d[4 * p + 3] ?? 0) / plin);
  } else {
    for (let p = 0; p < n; p++) {
      const a = (d[4 * p + 3] ?? 0) / 255, k = 255 * (1 - a);
      const l = 0.2126 * ((d[4 * p] ?? 0) * a + k) + 0.7152 * ((d[4 * p + 1] ?? 0) * a + k) + 0.0722 * ((d[4 * p + 2] ?? 0) * a + k);
      f[p] = 1 - l / 255;
    }
    let s = 0;
    for (let x = 0; x < W; x++) s += (f[x] ?? 0) + (f[(H - 1) * W + x] ?? 0);
    for (let y = 0; y < H; y++) s += (f[y * W] ?? 0) + (f[y * W + W - 1] ?? 0);
    if (s / (2 * (W + H)) > 0.5) for (let p = 0; p < n; p++) f[p] = 1 - (f[p] ?? 0);
  }
  if (o.inverseaza) for (let p = 0; p < n; p++) f[p] = 1 - (f[p] ?? 0);
  return { f, transparenta, sursa };
}

/** Câți pixeli are fiecare din cele 256 de trepte ale cernelii. */
export function histograma(f: Float32Array): Float64Array {
  const h = new Float64Array(256);
  for (const v of f) { const i = Math.round(v * 255); h[i] = (h[i] ?? 0) + 1; }
  return h;
}

/**
 * Pragul automat: Otsu desparte cele două clase ale histogramei, iar pragul stă la mijlocul mediilor lor, adică la
 * jumătatea acoperirii (muchia geometrică a unei margini netezite). Fără două clase, 0,5.
 */
export function pragAutomat(f: Float32Array, h: ArrayLike<number> = histograma(f)): number {
  let total = 0;
  for (let i = 0; i < 256; i++) total += i * (h[i] ?? 0);
  let w0 = 0, s0 = 0, cel = -1, m0b = 0, m1b = 255;
  for (let k = 0; k < 255; k++) {
    w0 += h[k] ?? 0;
    s0 += k * (h[k] ?? 0);
    const w1 = f.length - w0;
    if (w0 === 0 || w1 === 0) continue;
    const m0 = s0 / w0, m1 = (total - s0) / w1, v = w0 * w1 * (m0 - m1) * (m0 - m1);
    if (v > cel) { cel = v; m0b = m0; m1b = m1; }
  }
  return cel < 0 ? 0.5 : (m0b + m1b) / 510;
}

// ── Curățarea: componentele conexe ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Componentele conexe ale pixelilor cu `masca == v` (două treceri, cu reuniuni): cerneala în 8-vecinătate (`opt`), fundalul
 * în 4. Întoarce eticheta fiecărui pixel (−1 în afara lor), aria fiecărei componente și dacă atinge marginea imaginii.
 */
function componente(masca: Uint8Array, W: number, H: number, v: number, opt: boolean): { et: Int32Array; arie: number[]; margine: boolean[] } {
  const et = new Int32Array(W * H).fill(-1);
  let par = new Int32Array(1024);
  let k = 0;
  const rad = (a: number): number => {
    let r = a;
    while (par[r] !== r) r = par[r] ?? r;
    while (par[a] !== r) { const u = par[a] ?? r; par[a] = r; a = u; }
    return r;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (masca[p] !== v) continue;
      let e = -1;
      const vecini = opt ? [x > 0 ? p - 1 : -1, y > 0 ? p - W : -1, y > 0 && x > 0 ? p - W - 1 : -1, y > 0 && x < W - 1 ? p - W + 1 : -1]
        : [x > 0 ? p - 1 : -1, y > 0 ? p - W : -1];
      for (const q of vecini) {
        const l = q >= 0 ? et[q] ?? -1 : -1;
        if (l < 0) continue;
        if (e < 0) { e = rad(l); continue; }
        const a = rad(e), b = rad(l);
        if (a !== b) { if (a < b) par[b] = a; else par[a] = b; }
        e = Math.min(a, b);
      }
      if (e < 0) {
        if (k === par.length) { const np = new Int32Array(k * 2); np.set(par); par = np; }
        par[k] = k;
        e = k++;
      }
      et[p] = e;
    }
  }
  const idx = new Int32Array(k).fill(-1);
  const arie: number[] = [];
  const margine: boolean[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const l = et[p] ?? -1;
      if (l < 0) continue;
      const r = rad(l);
      let c = idx[r] ?? -1;
      if (c < 0) { c = arie.length; idx[r] = c; arie.push(0); margine.push(false); }
      et[p] = c;
      arie[c] = (arie[c] ?? 0) + 1;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) margine[c] = true;
    }
  }
  return { et, arie, margine };
}

/**
 * Petele de cerneală sub `petePx` se șterg din câmp, iar golurile sub `gauriPx` (care nu ating marginea) se umplu. Contururile
 * se trag apoi pe câmpul curățat, cu aceeași regulă de vecinătate (punctele-șa leagă cerneala), deci nu contrazic componentele.
 */
function curata(f: Float32Array, W: number, H: number, T: number, petePx: number, gauriPx: number): { pete: number; gauri: number } {
  let pete = 0, gauri = 0;
  if (petePx <= 0 && gauriPx <= 0) return { pete, gauri };
  const m = new Uint8Array(W * H);
  for (let p = 0; p < m.length; p++) m[p] = (f[p] ?? 0) >= T ? 1 : 0;
  if (petePx > 0) {
    const { et, arie } = componente(m, W, H, 1, true);
    const sterse = arie.map((a) => a < petePx);
    pete = sterse.filter(Boolean).length;
    if (pete > 0) for (let p = 0; p < m.length; p++) { const c = et[p] ?? -1; if (c >= 0 && sterse[c]) { f[p] = 0; m[p] = 0; } }
  }
  if (gauriPx > 0) {
    const { et, arie, margine } = componente(m, W, H, 0, false);
    const umplute = arie.map((a, c) => a < gauriPx && !margine[c]);
    gauri = umplute.filter(Boolean).length;
    if (gauri > 0) for (let p = 0; p < m.length; p++) { const c = et[p] ?? -1; if (c >= 0 && umplute[c]) f[p] = 1; }
  }
  return { pete, gauri };
}

// ── Conturul sub-pixel: marching squares, cu buclele orientate ──────────────────────────────────────────────────────────

/** Colțurile celulei (stânga-sus, dreapta-sus, dreapta-jos, stânga-jos) și laturile ei (sus, dreapta, jos, stânga). */
const COLT = [[0, 0], [1, 0], [1, 1], [0, 1]] as const;
const LATURA = [[0, 1], [1, 2], [3, 2], [0, 3]] as const;
const MIJLOC = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]] as const;
/** Ieșirea pe o latură: celula vecină (di, dj) și latura pe care intră în ea. */
const PAS = [[0, -1, 2], [1, 0, 3], [0, 1, 0], [-1, 0, 1]] as const;

/**
 * Segmentele fiecărui caz (cei patru biți: stânga-sus 8, dreapta-sus 4, dreapta-jos 2, stânga-jos 1), ca perechi de laturi
 * (de unde intră, pe unde iese), orientate cu cerneala pe aceeași parte (produsul vectorial pozitiv). Deci buclele exterioare
 * au aria (cu formula trapezelor, în coordonatele imaginii) pozitivă, iar golurile negativă. La punctul-șa cerneala trece pe
 * diagonală (8-vecinătate, ca la curățare): se taie colțurile goale.
 */
const SEGMENTE: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = Array.from({ length: 16 }, (_, c) => {
  const plin = [(c >> 3) & 1, (c >> 2) & 1, (c >> 1) & 1, c & 1];
  const orienteaza = (a: number, b: number, colt: number, semn: number): readonly [number, number] => {
    const [ax, ay] = MIJLOC[a] ?? [0, 0], [bx, by] = MIJLOC[b] ?? [0, 0], [cx, cy] = COLT[colt] ?? [0, 0];
    const cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    return cr * semn > 0 ? [a, b] : [b, a];
  };
  const taiate = [0, 1, 2, 3].filter((e) => { const [u, w] = LATURA[e] ?? [0, 0]; return plin[u] !== plin[w]; });
  if (taiate.length === 2) return [orienteaza(taiate[0] ?? 0, taiate[1] ?? 0, plin.indexOf(1), 1)];
  if (taiate.length !== 4) return [];
  return [0, 1, 2, 3].filter((k) => plin[k] === 0).map((g) => {
    const [a, b] = [0, 1, 2, 3].filter((e) => { const [u, w] = LATURA[e] ?? [0, 0]; return u === g || w === g; });
    return orienteaza(a ?? 0, b ?? 0, g, -1);
  });
});

/**
 * Buclele conturului la nivelul T, cu interpolarea liniară între centrele pixelilor; în afara imaginii e fundal, deci
 * buclele se închid. Fiecare buclă: x0, y0, x1, y1, … (un punct pe fiecare latură tăiată, în ordinea mersului).
 */
export function contururi(f: Float32Array, W: number, H: number, T: number): Float64Array[] {
  const CW = W + 1, CH = H + 1;
  const g = (i: number, j: number): number => (i < 1 || j < 1 || i > W || j > H ? 0 : f[(j - 1) * W + (i - 1)] ?? 0);
  const caz = new Uint8Array(CW * CH);
  for (let j = 0; j < CH; j++) {
    for (let i = 0; i < CW; i++) {
      caz[j * CW + i] = (g(i, j) >= T ? 8 : 0) | (g(i + 1, j) >= T ? 4 : 0) | (g(i + 1, j + 1) >= T ? 2 : 0) | (g(i, j + 1) >= T ? 1 : 0);
    }
  }
  const t = (a: number, b: number): number => { const r = (T - a) / (b - a); return r < 1e-6 ? 1e-6 : r > 1 - 1e-6 ? 1 - 1e-6 : r; };
  const punct = (i: number, j: number, e: number, iesire: number[]): void => {
    if (e === 0) iesire.push(i - 0.5 + t(g(i, j), g(i + 1, j)), j - 0.5);
    else if (e === 1) iesire.push(i + 0.5, j - 0.5 + t(g(i + 1, j), g(i + 1, j + 1)));
    else if (e === 2) iesire.push(i - 0.5 + t(g(i, j + 1), g(i + 1, j + 1)), j + 0.5);
    else iesire.push(i - 0.5, j - 0.5 + t(g(i, j), g(i, j + 1)));
  };
  const vazut = new Uint8Array(CW * CH);
  const bucle: Float64Array[] = [];
  for (let c0 = 0; c0 < caz.length; c0++) {
    for (const [de0] of SEGMENTE[caz[c0] ?? 0] ?? []) {
      if ((vazut[c0] ?? 0) & (1 << de0)) continue;
      const pts: number[] = [];
      let c = c0, de = de0;
      for (;;) {
        const s = (SEGMENTE[caz[c] ?? 0] ?? []).find((x) => x[0] === de);
        if (!s || (vazut[c] ?? 0) & (1 << de)) break;
        vazut[c] = (vazut[c] ?? 0) | (1 << de);
        const i = c % CW, j = (c - i) / CW;
        punct(i, j, s[1], pts);
        const [di, dj, intra] = PAS[s[1]] ?? [0, 0, 0];
        c = (j + dj) * CW + (i + di);
        de = intra;
      }
      if (pts.length >= 6) bucle.push(Float64Array.from(pts));
    }
  }
  return bucle;
}

/** Aria cu semn a unei bucle (formula trapezelor, în coordonatele imaginii): pozitivă pe exterioare, negativă pe goluri. */
export function arie(b: Float64Array): number {
  let s = 0;
  const n = b.length / 2;
  for (let k = 0; k < n; k++) {
    const q = (k + 1) % n;
    s += (b[2 * k] ?? 0) * (b[2 * q + 1] ?? 0) - (b[2 * q] ?? 0) * (b[2 * k + 1] ?? 0);
  }
  return s / 2;
}

// ── Poligonul, colțurile și curbele unei bucle ──────────────────────────────────────────────────────────────────────────

export type Bucata = { tip: 0 | 1; x: number; y: number; c1x: number; c1y: number; c2x: number; c2y: number; de: number; la: number };

/**
 * Cel mai depărtat vârf j (indicele în buclă, cel mult `limita`) până la care toate punctele dintre i și j stau la cel mult
 * eps de dreapta lui i spre j, mergând înainte: conul direcțiilor posibile, strâns de discul fiecărui punct.
 */
export function urmatorul(P: Float64Array, n: number, i: number, eps: number, limita: number): number {
  const x0 = P[2 * (i % n)] ?? 0, y0 = P[2 * (i % n) + 1] ?? 0;
  let jos = -Infinity, sus = Infinity, baza = Number.NaN, ux = 0, uy = 0, maxProi = 0, cel = i + 1;
  for (let k = i + 1; k <= limita; k++) {
    const q = k % n;
    const dx = (P[2 * q] ?? 0) - x0, dy = (P[2 * q + 1] ?? 0) - y0;
    const r = Math.hypot(dx, dy);
    // În discul startului, înainte să iasă bucla din el: tot startul. După ce a ieșit, un punct întors acolo e o întoarcere
    // (un vârf subțire, de un pixel, al unei margini zgomotoase), judecată ca oricare: altfel latura, de 0,08 px, sărea
    // tot vârful (1,5 px pe o poză JPEG).
    if (r <= eps && Number.isNaN(baza)) { cel = k; continue; }
    if (Number.isNaN(baza)) { baza = Math.atan2(dy, dx); ux = dx / r; uy = dy / r; }
    const proi = dx * ux + dy * uy;
    if (proi < maxProi - eps) break;
    maxProi = Math.max(maxProi, proi);
    let fi = Math.atan2(dy, dx) - baza;
    if (fi > Math.PI) fi -= 2 * Math.PI;
    else if (fi < -Math.PI) fi += 2 * Math.PI;
    const delta = Math.asin(Math.min(1, eps / r));
    const valid = fi >= jos && fi <= sus;
    jos = Math.max(jos, fi - delta);
    sus = Math.min(sus, fi + delta);
    if (jos > sus) break;
    if (valid) cel = k;
  }
  return cel;
}

/** Dreapta celor mai mici pătrate prin punctele a…b ale buclei (fără capetele, unde colțurile netezite o trag). */
function dreapta(P: Float64Array, n: number, a: number, b: number): [number, number, number, number] {
  const m = b - a >= 8 ? Math.floor((b - a) * 0.15) : 0;
  let sx = 0, sy = 0, c = 0;
  for (let k = a + m; k <= b - m; k++) { const q = k % n; sx += P[2 * q] ?? 0; sy += P[2 * q + 1] ?? 0; c++; }
  const cx = sx / c, cy = sy / c;
  let sxx = 0, sxy = 0, syy = 0;
  for (let k = a + m; k <= b - m; k++) {
    const q = k % n, dx = (P[2 * q] ?? 0) - cx, dy = (P[2 * q + 1] ?? 0) - cy;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  const ung = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ux = Math.cos(ung), uy = Math.sin(ung);
  const qa = a % n, qb = b % n;
  if (ux * ((P[2 * qb] ?? 0) - (P[2 * qa] ?? 0)) + uy * ((P[2 * qb + 1] ?? 0) - (P[2 * qa + 1] ?? 0)) < 0) { ux = -ux; uy = -uy; }
  return [cx, cy, ux, uy];
}

/** Încrucișarea a două drepte (centru, direcție unitară), sau null dacă sunt aproape paralele. */
/**
 * Vârful (ox, oy), mutat în încrucișarea `i` a dreptelor vecine doar în afară și cel mult `raza`: pe o curbă netedă și la un
 * colț rotunjit de nuanțe, dreptele se încrucișează mai departe de coarda vecinilor (a–b) decât vârful; spre coardă le duce
 * doar un vârf subțire (un ac), pe care mutarea l-ar scurta (1,1 px, Neted). Aceeași regulă pentru bucle și pentru arce.
 */
function mutatInAfara(ox: number, oy: number, i: readonly [number, number] | null, ax: number, ay: number, bx: number, by: number,
  raza: number): readonly [number, number] {
  if (!i) return [ox, oy];
  const lc = Math.hypot(bx - ax, by - ay);
  const spreCoarda = (px: number, py: number): number => (lc > 0 ? ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / lc : 0);
  const inafara = lc === 0 || (Math.sign(spreCoarda(i[0], i[1])) === Math.sign(spreCoarda(ox, oy))
    && Math.abs(spreCoarda(i[0], i[1])) >= Math.abs(spreCoarda(ox, oy)));
  return inafara && Math.hypot(i[0] - ox, i[1] - oy) <= raza ? i : [ox, oy];
}

function intersectie(a: readonly number[] | undefined, b: readonly number[] | undefined): [number, number] | null {
  if (!a || !b) return null;
  const [ax = 0, ay = 0, aux = 1, auy = 0] = a, [bx = 0, by = 0, bux = 1, buy = 0] = b;
  const cr = aux * buy - auy * bux;
  if (Math.abs(cr) < 1e-3) return null;
  const t = ((bx - ax) * buy - (by - ay) * bux) / cr;
  return [ax + t * aux, ay + t * auy];
}

/** Indicele punctului buclei dintre a și b cel mai apropiat de (x, y). */
function aproape(P: Float64Array, n: number, a: number, b: number, x: number, y: number): number {
  let cel = a, cd = Infinity;
  for (let q = a; q <= b; q++) {
    const i = ((q % n) + n) % n, d = ((P[2 * i] ?? 0) - x) ** 2 + ((P[2 * i + 1] ?? 0) - y) ** 2;
    if (d < cd) { cd = d; cel = q; }
  }
  return cel;
}

/** Distanța de la (px, py) la segmentul (ax, ay)–(bx, by). */
function laSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(ax + u * dx - px, ay + u * dy - py);
}

/**
 * Teșiturile colțurilor: netezirea (sau treptele pixelilor) taie vârful unui colț ascuțit, deci poligonul pune acolo una, două
 * sau trei laturi scurte (sub max(3,5, 6·eps) px, împreună sub max(4,5, 8·eps)) între două lungi. Ele se strâng într-un
 * singur vârf, în încrucișarea dreptelor laturilor lungi, dacă: laturile lungi se rotesc între ele cu cel puțin 25°,
 * încrucișarea e la cel mult 2,5 px de teșitură, bucla stă lângă cele două drepte (cel mult max(0,5, 1,5·eps)), rotirea se
 * face aproape toată în teșitură (pe un cerc, ea se împarte pe toată lungimea), iar colțul nou nu trece de contur cu mai mult
 * de `depasire` (0,9 px; pe marginile dure, unde conturul netezit scurtează vârfurile, 1,5 px).
 */
export function tesituri(P: Float64Array, n: number, V0: readonly number[], eps: number, depasire = 0.9, inchisa = true): { V: number[]; fix: Map<number, [number, number]> } {
  const V = [...V0];
  const fix = new Map<number, [number, number]>();
  const X = (k: number): number => P[2 * (((k % n) + n) % n)] ?? 0;
  const Y = (k: number): number => P[2 * (((k % n) + n) % n) + 1] ?? 0;
  const lung = (a: number, b: number): number => Math.hypot(X(b) - X(a), Y(b) - Y(a));
  const directie = (a: number, b: number): number => Math.atan2(Y(b) - Y(a), X(b) - X(a));
  const scurta = Math.max(4.5, 6 * eps);
  const unghi = (a: number, b: number): number => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  for (let k = 1; k + 2 < V.length; k++) {
    let e = k;
    while (e - k < 3 && e + 2 < V.length && lung(V[e] ?? 0, V[e + 1] ?? 0) <= scurta) e++;
    if (e === k) continue;
    const la = V[k - 1] ?? 0, lb = V[k] ?? 0, ra = V[e] ?? 0, rb = V[e + 1] ?? n;
    // Pe un arc deschis (o graniță între două joncțiuni, ADR 0221), vecinătatea nu trece peste capete.
    if (!inchisa && (lb - 3 < 0 || ra + 3 > n - 1)) continue;
    const ls = lung(lb, ra), LA = lung(la, lb), LB = lung(ra, rb);
    if (ls > Math.max(4.5, 8 * eps) || LA < Math.max(4, 2 * ls) || LB < Math.max(4, 2 * ls)) continue;
    const dA = dreapta(P, n, la, lb), dB = dreapta(P, n, ra, rb);
    const x = intersectie(dA, dB);
    if (!x) continue;
    const rotire = unghi(Math.atan2(dA[3], dA[2]), Math.atan2(dB[3], dB[2]));
    if (Math.abs(rotire) < (25 * Math.PI) / 180) continue;
    if (Math.hypot(x[0] - (X(lb) + X(ra)) / 2, x[1] - (Y(lb) + Y(ra)) / 2) > 2.5) continue;
    // Rotirea locală (de la două puncte înainte de teșitură la două după ea), față de cea dintre drepte.
    const locala = unghi(directie(lb - 2, lb), directie(ra, ra + 2));
    if (Math.abs(locala) < 0.6 * Math.abs(rotire) || Math.sign(locala) !== Math.sign(rotire)) continue;
    const pA = [dA[0] + dA[2] * ((X(lb - 3) - dA[0]) * dA[2] + (Y(lb - 3) - dA[1]) * dA[3]), dA[1] + dA[3] * ((X(lb - 3) - dA[0]) * dA[2] + (Y(lb - 3) - dA[1]) * dA[3])];
    const pB = [dB[0] + dB[2] * ((X(ra + 3) - dB[0]) * dB[2] + (Y(ra + 3) - dB[1]) * dB[3]), dB[1] + dB[3] * ((X(ra + 3) - dB[0]) * dB[2] + (Y(ra + 3) - dB[1]) * dB[3])];
    let dev = 0;
    for (let q = lb - 3; q <= ra + 3; q++) {
      dev = Math.max(dev, Math.min(laSegment(X(q), Y(q), pA[0] ?? 0, pA[1] ?? 0, x[0], x[1]), laSegment(X(q), Y(q), x[0], x[1], pB[0] ?? 0, pB[1] ?? 0)));
    }
    if (dev > Math.max(0.5, 1.5 * eps)) continue;
    // Colțul nu trece de contur cu mai mult de `depasire`: un colț rotunjit în desen (sub un pixel) arată ca unul ascuțit
    // netezit, deci mai departe de atât nu se inventează un vârf.
    const ic = aproape(P, n, lb - 3, ra + 3, x[0], x[1]);
    if (Math.hypot(X(ic) - x[0], Y(ic) - x[1]) > depasire) continue;
    const iv = aproape(P, n, lb, ra, x[0], x[1]);
    V.splice(k, e - k + 1, iv);
    fix.set(iv, x);
    // Vecinătatea se judecă din nou: lângă colțul strâns poate rămâne încă o latură scurtă.
    k = Math.max(0, k - 2);
  }
  return { V, fix };
}

/** Punctul cubicei la parametrul u, și derivatele întâi și a doua. */
function bezier(b: Bucata, x3: number, y3: number, u: number): [number, number, number, number, number, number] {
  const v = 1 - u;
  const x = v * v * v * b.x + 3 * v * v * u * b.c1x + 3 * v * u * u * b.c2x + u * u * u * x3;
  const y = v * v * v * b.y + 3 * v * v * u * b.c1y + 3 * v * u * u * b.c2y + u * u * u * y3;
  const dx = 3 * (v * v * (b.c1x - b.x) + 2 * v * u * (b.c2x - b.c1x) + u * u * (x3 - b.c2x));
  const dy = 3 * (v * v * (b.c1y - b.y) + 2 * v * u * (b.c2y - b.c1y) + u * u * (y3 - b.c2y));
  const ddx = 6 * (v * (b.c2x - 2 * b.c1x + b.x) + u * (x3 - 2 * b.c2x + b.c1x));
  const ddy = 6 * (v * (b.c2y - 2 * b.c1y + b.y) + u * (y3 - 2 * b.c2y + b.c1y));
  return [x, y, dx, dy, ddx, ddy];
}

/** Distanța de la (px, py) la bucată (până în (x3, y3)): linia, exact; cubica, din 24 de eșantioane rafinate cu Newton. */
function distantaLa(b: Bucata, x3: number, y3: number, px: number, py: number): number {
  if (b.tip === 0) {
    const dx = x3 - b.x, dy = y3 - b.y, l2 = dx * dx + dy * dy;
    const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - b.x) * dx + (py - b.y) * dy) / l2));
    return Math.hypot(b.x + u * dx - px, b.y + u * dy - py);
  }
  let cu = 0, cd = Infinity;
  for (let k = 0; k <= 32; k++) {
    const [x, y] = bezier(b, x3, y3, k / 32);
    const d = (x - px) * (x - px) + (y - py) * (y - py);
    if (d < cd) { cd = d; cu = k / 32; }
  }
  // Newton, păstrând doar pașii care apropie (un pas care fuge ar supraestima distanța).
  for (let it = 0; it < 6; it++) {
    const [x, y, dx, dy, ddx, ddy] = bezier(b, x3, y3, cu);
    const num = (x - px) * dx + (y - py) * dy, den = dx * dx + dy * dy + (x - px) * ddx + (y - py) * ddy;
    if (den <= 0) break;
    const nu = Math.max(0, Math.min(1, cu - num / den));
    const [nx, ny] = bezier(b, x3, y3, nu);
    const nd = (nx - px) * (nx - px) + (ny - py) * (ny - py);
    if (nd >= cd) break;
    cd = nd; cu = nu;
  }
  return Math.sqrt(cd);
}

/**
 * O cubică de la A la B, cu tangentele date în capete (unitare: t1 spre interior din A, t2 spre interior din B), potrivită
 * punctelor buclei a…b prin cele mai mici pătrate (lungimile mânerelor), cu o reparametrizare Newton. Întoarce bucata și
 * cea mai mare distanță a punctelor până la ea.
 */
function potriveste(P: Float64Array, n: number, a: number, b: number, ax: number, ay: number, bx: number, by: number,
  t1x: number, t1y: number, t2x: number, t2y: number): { bucata: Bucata; eroare: number } {
  const m = b - a;
  const u = new Float64Array(m + 1);
  for (let k = 1; k <= m; k++) {
    const q = (a + k) % n, p = (a + k - 1) % n;
    u[k] = (u[k - 1] ?? 0) + Math.hypot((P[2 * q] ?? 0) - (P[2 * p] ?? 0), (P[2 * q + 1] ?? 0) - (P[2 * p + 1] ?? 0));
  }
  const L = u[m] ?? 0;
  for (let k = 0; k <= m; k++) u[k] = L > 0 ? (u[k] ?? 0) / L : k / Math.max(1, m);
  const corda = Math.hypot(bx - ax, by - ay);
  const bucata: Bucata = { tip: 1, x: ax, y: ay, c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: a, la: b };
  for (let it = 0; it < 3; it++) {
    let c11 = 0, c12 = 0, c22 = 0, x1 = 0, x2 = 0;
    for (let k = 0; k <= m; k++) {
      const q = (a + k) % n, s = u[k] ?? 0, v = 1 - s;
      const b0 = v * v * v, b1 = 3 * v * v * s, b2 = 3 * v * s * s, b3 = s * s * s;
      const a1x = t1x * b1, a1y = t1y * b1, a2x = t2x * b2, a2y = t2y * b2;
      const rx = (P[2 * q] ?? 0) - (ax * (b0 + b1) + bx * (b2 + b3)), ry = (P[2 * q + 1] ?? 0) - (ay * (b0 + b1) + by * (b2 + b3));
      c11 += a1x * a1x + a1y * a1y; c12 += a1x * a2x + a1y * a2y; c22 += a2x * a2x + a2y * a2y;
      x1 += rx * a1x + ry * a1y; x2 += rx * a2x + ry * a2y;
    }
    const det = c11 * c22 - c12 * c12;
    let al = det !== 0 ? (x1 * c22 - x2 * c12) / det : 0, be = det !== 0 ? (c11 * x2 - c12 * x1) / det : 0;
    if (!(al > corda * 1e-3) || !(be > corda * 1e-3) || al > corda * 2 || be > corda * 2) { al = corda / 3; be = corda / 3; }
    bucata.c1x = ax + al * t1x; bucata.c1y = ay + al * t1y; bucata.c2x = bx + be * t2x; bucata.c2y = by + be * t2y;
    if (it === 2) break;
    for (let k = 1; k < m; k++) {
      const q = (a + k) % n, s = u[k] ?? 0;
      const [x, y, dx, dy, ddx, ddy] = bezier(bucata, bx, by, s);
      const px = P[2 * q] ?? 0, py = P[2 * q + 1] ?? 0;
      const num = (x - px) * dx + (y - py) * dy, den = dx * dx + dy * dy + (x - px) * ddx + (y - py) * ddy;
      if (den > 0) u[k] = Math.max(0, Math.min(1, s - num / den));
    }
  }
  // Eroarea, pe punctele dinăuntru: capetele bucății cad între două puncte ale buclei.
  let eroare = 0;
  for (let k = 1; k < m; k++) {
    const q = (a + k) % n;
    eroare = Math.max(eroare, distantaLa(bucata, bx, by, P[2 * q] ?? 0, P[2 * q + 1] ?? 0));
  }
  return { bucata, eroare };
}

/**
 * Curbele unei bucle: poligonul cu cele mai puține laturi în banda eps (pornit din punctul cel mai depărtat de centru), cu
 * vârfurile mutate în încrucișarea dreptelor laturilor vecine; colțurile după cât se depărtează vârful de coarda dintre
 * mijloacele laturilor vecine (față de 4·eps, cât dă o curbă netedă); între colțuri, cubice; apoi cubicele vecine, pe aceeași
 * parte, unite cât abaterea rămâne sub tau. Întoarce bucățile și abaterea măsurată față de buclă.
 */
export function curbeleBuclei(bucla: Float64Array, eps: number, tau: number, colt: number, depasire = 0.9): { bucati: Bucata[]; abatere: number } {
  const n = bucla.length / 2;
  // Pornirea: punctul cel mai depărtat de centrul buclei (un colț, dacă are).
  let cx = 0, cy = 0;
  for (let k = 0; k < n; k++) { cx += bucla[2 * k] ?? 0; cy += bucla[2 * k + 1] ?? 0; }
  cx /= n; cy /= n;
  let s0 = 0, ds = -1;
  for (let k = 0; k < n; k++) {
    const d = ((bucla[2 * k] ?? 0) - cx) ** 2 + ((bucla[2 * k + 1] ?? 0) - cy) ** 2;
    if (d > ds) { ds = d; s0 = k; }
  }
  let P = new Float64Array(2 * n);
  const roteste = (s: number): void => {
    const R = new Float64Array(2 * n);
    for (let k = 0; k < n; k++) { const q = (s + k) % n; R[2 * k] = bucla[2 * q] ?? 0; R[2 * k + 1] = bucla[2 * q + 1] ?? 0; }
    P = R;
  };
  roteste(s0);
  const X = (k: number): number => P[2 * (((k % n) + n) % n)] ?? 0;
  const Y = (k: number): number => P[2 * (((k % n) + n) % n) + 1] ?? 0;
  // Startul se mută apoi în mijlocul celei mai lungi laturi a unui prim poligon: niciun colț nu cade peste capătul buclei.
  if (n >= 8) {
    const W0 = [0];
    for (let v = 0; v < n;) { v = urmatorul(P, n, v, eps, Math.min(n, v + 8192)); W0.push(v); }
    let cel = 0, cl = -1;
    for (let k = 0; k + 1 < W0.length; k++) {
      const a = W0[k] ?? 0, b = W0[k + 1] ?? n, l = Math.hypot(X(b) - X(a), Y(b) - Y(a));
      if (l > cl) { cl = l; cel = k; }
    }
    s0 = (s0 + Math.floor(((W0[cel] ?? 0) + (W0[cel + 1] ?? n)) / 2)) % n;
    roteste(s0);
  }
  if (n < 8) {
    const bucati: Bucata[] = [];
    for (let k = 0; k < n; k++) bucati.push({ tip: 0, x: X(k), y: Y(k), c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: k, la: k + 1 });
    return { bucati, abatere: 0 };
  }
  // Poligonul (indicii vârfurilor în buclă; ultimul e n, adică startul), cu teșiturile colțurilor strânse.
  const V0 = [0];
  for (let v = 0; v < n;) { v = urmatorul(P, n, v, eps, Math.min(n, v + 8192)); V0.push(v); }
  const { V, fix } = tesituri(P, n, V0, eps, depasire);
  const m = V.length - 1;
  if (m < 3) {
    const bucati: Bucata[] = [];
    for (let k = 0; k < m; k++) bucati.push({ tip: 0, x: X(V[k] ?? 0), y: Y(V[k] ?? 0), c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: V[k] ?? 0, la: V[k + 1] ?? n });
    return { bucati, abatere: masoara(bucati, P, n) };
  }
  // Dreptele laturilor și vârfurile mutate în încrucișarea lor (cel mult 2·eps, sau o parte din laturi, de punctul buclei).
  const dr = Array.from({ length: m }, (_, k) => dreapta(P, n, V[k] ?? 0, V[k + 1] ?? n));
  const lung = (k: number): number => {
    const a = V[k % m] ?? 0, b = V[(k % m) + 1] ?? n;
    return Math.hypot(X(b) - X(a), Y(b) - Y(a));
  };
  const vx = new Float64Array(m), vy = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const ox = X(V[k] ?? 0), oy = Y(V[k] ?? 0);
    vx[k] = ox; vy[k] = oy;
    const f = fix.get(V[k] ?? -1);
    if (f) { vx[k] = f[0]; vy[k] = f[1]; continue; }
    const i = intersectie(dr[(k + m - 1) % m], dr[k]);
    const raza = Math.max(2 * eps, 0.75, Math.min(2.5, 0.08 * Math.min(lung(k + m - 1), lung(k))));
    const [x, y] = mutatInAfara(ox, oy, i, X(V[(k + m - 1) % m] ?? 0), Y(V[(k + m - 1) % m] ?? 0), X(V[k + 1] ?? n), Y(V[k + 1] ?? n), raza);
    vx[k] = x; vy[k] = y;
  }
  // Colțurile: distanța vârfului la coarda dintre mijloacele laturilor vecine, față de 4·eps (cât dă o curbă netedă).
  const mx = (k: number): number => ((vx[k % m] ?? 0) + (vx[(k + 1) % m] ?? 0)) / 2;
  const my = (k: number): number => ((vy[k % m] ?? 0) + (vy[(k + 1) % m] ?? 0)) / 2;
  const eColt: boolean[] = [];
  for (let k = 0; k < m; k++) {
    const ax = mx(k + m - 1), ay = my(k + m - 1), bx = mx(k), by = my(k);
    const l = Math.hypot(bx - ax, by - ay);
    const d = l > 0 ? Math.abs((bx - ax) * ((vy[k] ?? 0) - ay) - (by - ay) * ((vx[k] ?? 0) - ax)) / l : 0;
    // O întoarcere (laturile se rotesc cu peste 120° în vârf: o limbă subțire, un ac) e un colț, deși vârful stă pe dreapta
    // coardei, dincolo de capătul ei: cubica ar ajunge doar la trei sferturi din drum (1,2 px lipsă pe o limbă de 4 px).
    // Pe un poligon în banda eps, doar o rază sub ~0,6 px se rotește așa într-un vârf.
    const ix = (vx[k] ?? 0) - (vx[(k + m - 1) % m] ?? 0), iy = (vy[k] ?? 0) - (vy[(k + m - 1) % m] ?? 0);
    const ox = (vx[(k + 1) % m] ?? 0) - (vx[k] ?? 0), oy = (vy[(k + 1) % m] ?? 0) - (vy[k] ?? 0);
    const li = Math.hypot(ix, iy), lo = Math.hypot(ox, oy);
    const intoarcere = li > 0 && lo > 0 && (ix * ox + iy * oy) / (li * lo) < -0.5;
    // Un vârf strâns dintr-o teșitură e un colț găsit explicit (rotirea lui se face toată acolo).
    eColt.push(fix.has(V[k] ?? -1) || d > colt * 4 * eps || intoarcere);
  }
  // Bucățile: la colț, două linii prin vârf; altfel, o cubică între mijloacele laturilor, cu mânerele spre vârf. Capătul
  // fiecărei bucăți e punctul buclei cel mai apropiat de mijlocul laturii (punctele buclei nu sunt la distanțe egale).
  const capete = Array.from({ length: m }, (_, k) => aproape(P, n, V[k] ?? 0, V[k + 1] ?? n, mx(k), my(k)));
  const mij = (k: number): number => capete[k] ?? 0;
  let bucati: Bucata[] = [];
  for (let k = 0; k < m; k++) {
    const ax = mx(k + m - 1), ay = my(k + m - 1), bx = mx(k), by = my(k);
    const de = k === 0 ? mij(m - 1) - n : mij(k - 1), la = mij(k);
    if (eColt[k]) {
      bucati.push({ tip: 0, x: ax, y: ay, c1x: 0, c1y: 0, c2x: 0, c2y: 0, de, la: V[k] ?? 0 });
      bucati.push({ tip: 0, x: vx[k] ?? 0, y: vy[k] ?? 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: V[k] ?? 0, la });
      continue;
    }
    // Mânerele: cubica trece prin vârful buclei de lângă vârf (cel mai depărtat de coardă), cel puțin 0,55, cel mult 1.
    const l = Math.hypot(bx - ax, by - ay);
    const dv = l > 0 ? Math.abs((bx - ax) * ((vy[k] ?? 0) - ay) - (by - ay) * ((vx[k] ?? 0) - ax)) / l : 0;
    // Un vârf aproape pe coardă (de exemplu startul, în mijlocul unei laturi drepte): o linie, nu o cubică.
    if (dv < 0.15) { bucati.push({ tip: 0, x: ax, y: ay, c1x: 0, c1y: 0, c2x: 0, c2y: 0, de, la }); continue; }
    let h = 0;
    for (let q = de; q <= la; q++) h = Math.max(h, l > 0 ? Math.abs((bx - ax) * (Y(q + n) - ay) - (by - ay) * (X(q + n) - ax)) / l : 0);
    const alfa = dv > 1e-9 ? Math.max(0.55, Math.min(1, (4 * h) / (3 * dv))) : 0.75;
    bucati.push({
      tip: 1, x: ax, y: ay, c1x: ax + alfa * ((vx[k] ?? 0) - ax), c1y: ay + alfa * ((vy[k] ?? 0) - ay),
      c2x: bx + alfa * ((vx[k] ?? 0) - bx), c2y: by + alfa * ((vy[k] ?? 0) - by), de, la,
    });
  }
  bucati = unesteLiniile(bucati);
  bucati = unesteCubicele(bucati, P, n, tau);
  return { bucati, abatere: masoara(bucati, P, n) };
}

/**
 * Curbele unui arc deschis (ADR 0221 §5: o graniță dintre două joncțiuni, folosită de ambele culori): aceleași reguli ca la
 * o buclă (poligonul în banda eps, teșiturile, vârfurile mutate în afară, colțurile, cubicele unite sub tau), cu capetele
 * fixe (joncțiunile rămân unde sunt) și fără trecere peste capăt. Bucățile încep fiecare la `x, y`; ultima se termină în
 * `sfarsit`, capătul arcului.
 */
export function curbeleArcului(P: Float64Array, eps: number, tau: number, colt: number, depasire = 0.9): { bucati: Bucata[]; sfarsit: [number, number]; abatere: number } {
  const n = P.length / 2;
  const X = (k: number): number => P[2 * k] ?? 0;
  const Y = (k: number): number => P[2 * k + 1] ?? 0;
  const sfarsit: [number, number] = [X(n - 1), Y(n - 1)];
  const linie = (k: number, de: number, la: number, x = X(k), y = Y(k)): Bucata => ({ tip: 0, x, y, c1x: 0, c1y: 0, c2x: 0, c2y: 0, de, la });
  if (n <= 2) return { bucati: [linie(0, 0, n - 1)], sfarsit, abatere: 0 };
  // Poligonul de la un capăt la celălalt (fără trecere peste capăt), cu teșiturile strânse doar înăuntru.
  const V0 = [0];
  for (let v = 0; v < n - 1;) { v = urmatorul(P, n, v, eps, n - 1); V0.push(v); }
  const { V, fix } = tesituri(P, n, V0, eps, depasire, false);
  const m = V.length - 1;
  if (m < 2) {
    // Un arc scurt (o singură latură în bandă): coarda lui.
    const bucati = [linie(0, 0, n - 1)];
    return { bucati, sfarsit, abatere: masoara(bucati, P, n, sfarsit) };
  }
  const dr = Array.from({ length: m }, (_, k) => dreapta(P, n, V[k] ?? 0, V[k + 1] ?? n - 1));
  const lung = (k: number): number => Math.hypot(X(V[k + 1] ?? 0) - X(V[k] ?? 0), Y(V[k + 1] ?? 0) - Y(V[k] ?? 0));
  // Vârfurile: capetele fixe; cele dinăuntru, mutate în încrucișarea dreptelor vecine, doar în afară (ca la o buclă).
  const vx = new Float64Array(m + 1), vy = new Float64Array(m + 1);
  for (let k = 0; k <= m; k++) {
    const ox = X(V[k] ?? 0), oy = Y(V[k] ?? 0);
    vx[k] = ox; vy[k] = oy;
    if (k === 0 || k === m) continue;
    const f = fix.get(V[k] ?? -1);
    if (f) { vx[k] = f[0]; vy[k] = f[1]; continue; }
    const i = intersectie(dr[k - 1], dr[k]);
    const raza = Math.max(2 * eps, 0.75, Math.min(2.5, 0.08 * Math.min(lung(k - 1), lung(k))));
    const [x, y] = mutatInAfara(ox, oy, i, X(V[k - 1] ?? 0), Y(V[k - 1] ?? 0), X(V[k + 1] ?? 0), Y(V[k + 1] ?? 0), raza);
    vx[k] = x; vy[k] = y;
  }
  // Mijloacele laturilor și capetele bucăților (punctul arcului cel mai apropiat de mijloc).
  const mx = (k: number): number => ((vx[k] ?? 0) + (vx[k + 1] ?? 0)) / 2;
  const my = (k: number): number => ((vy[k] ?? 0) + (vy[k + 1] ?? 0)) / 2;
  const mij = Array.from({ length: m }, (_, k) => aproape(P, n, V[k] ?? 0, V[k + 1] ?? n - 1, mx(k), my(k)));
  // Primul capăt: o linie până la mijlocul primei laturi.
  let bucati: Bucata[] = [linie(0, 0, mij[0] ?? 0)];
  for (let k = 1; k < m; k++) {
    const ax = mx(k - 1), ay = my(k - 1), bx = mx(k), by = my(k);
    const de = mij[k - 1] ?? 0, la = mij[k] ?? 0;
    const l = Math.hypot(bx - ax, by - ay);
    const d = l > 0 ? Math.abs((bx - ax) * ((vy[k] ?? 0) - ay) - (by - ay) * ((vx[k] ?? 0) - ax)) / l : 0;
    const ix = (vx[k] ?? 0) - (vx[k - 1] ?? 0), iy = (vy[k] ?? 0) - (vy[k - 1] ?? 0);
    const ox = (vx[k + 1] ?? 0) - (vx[k] ?? 0), oy = (vy[k + 1] ?? 0) - (vy[k] ?? 0);
    const li = Math.hypot(ix, iy), lo = Math.hypot(ox, oy);
    const intoarcere = li > 0 && lo > 0 && (ix * ox + iy * oy) / (li * lo) < -0.5;
    if (fix.has(V[k] ?? -1) || d > colt * 4 * eps || intoarcere) {
      bucati.push(linie(0, de, V[k] ?? 0, ax, ay));
      bucati.push(linie(0, V[k] ?? 0, la, vx[k] ?? 0, vy[k] ?? 0));
      continue;
    }
    if (d < 0.15) { bucati.push(linie(0, de, la, ax, ay)); continue; }
    let h = 0;
    for (let q = de; q <= la; q++) h = Math.max(h, l > 0 ? Math.abs((bx - ax) * (Y(q) - ay) - (by - ay) * (X(q) - ax)) / l : 0);
    const alfa = Math.max(0.55, Math.min(1, (4 * h) / (3 * d)));
    bucati.push({
      tip: 1, x: ax, y: ay, c1x: ax + alfa * ((vx[k] ?? 0) - ax), c1y: ay + alfa * ((vy[k] ?? 0) - ay),
      c2x: bx + alfa * ((vx[k] ?? 0) - bx), c2y: by + alfa * ((vy[k] ?? 0) - by), de, la,
    });
  }
  // Ultimul: o linie de la mijlocul ultimei laturi la capătul arcului.
  bucati.push(linie(0, mij[m - 1] ?? 0, n - 1, mx(m - 1), my(m - 1)));
  bucati = unesteLiniile(bucati, sfarsit);
  bucati = unesteCubicele(bucati, P, n, tau, sfarsit);
  return { bucati, sfarsit, abatere: masoara(bucati, P, n, sfarsit) };
}

/**
 * Capătul bucății i: începutul celei de după ea; pe un arc deschis (`sfarsit` dat), după ultima vine capătul arcului, nu
 * prima bucată.
 */
function urmatoarea(b: readonly Bucata[], i: number, sfarsit?: readonly [number, number]): { x: number; y: number } {
  if (i + 1 < b.length) return b[i + 1] as Bucata;
  return sfarsit ? { x: sfarsit[0], y: sfarsit[1] } : (b[(i + 1) % b.length] as Bucata);
}

/** Liniile care continuă pe aceeași dreaptă (o latură între două colțuri, ruptă la mijloc) devin una. */
function unesteLiniile(b: Bucata[], sfarsit?: readonly [number, number]): Bucata[] {
  const pe = (p: Bucata, x: Bucata, urm: { x: number; y: number }): boolean => {
    const ux = x.x - p.x, uy = x.y - p.y, wx = urm.x - x.x, wy = urm.y - x.y;
    const lu = Math.hypot(ux, uy), lw = Math.hypot(wx, wy);
    return p.tip === 0 && x.tip === 0 && lu > 0 && lw > 0 && Math.abs(ux * wy - uy * wx) / (lu * lw) < 1e-9 && ux * wx + uy * wy > 0;
  };
  const r: Bucata[] = [];
  for (let i = 0; i < b.length; i++) {
    const x = b[i] as Bucata, p = r[r.length - 1];
    if (p && pe(p, x, urmatoarea(b, i, sfarsit))) { p.la = x.la; continue; }
    r.push(x);
  }
  // Peste capătul listei: ultima linie continuă în prima (doar pe o buclă).
  while (!sfarsit && r.length > 3) {
    const u = r[r.length - 1] as Bucata, p0 = r[0] as Bucata, p1 = r[1] as Bucata;
    if (!pe(u, p0, p1)) break;
    u.la = p0.la;
    r.shift();
  }
  return r;
}

/**
 * Cubicele vecine, care se rotesc în același sens și cu cel mult 100° împreună, se unesc într-una, potrivită punctelor
 * buclei dintre ele cu tangentele capetelor păstrate, cât abaterea rămâne sub tau (unirea curbelor din Selinger, §2.5).
 */
function unesteCubicele(b: Bucata[], P: Float64Array, n: number, tau: number, sfarsit?: readonly [number, number]): Bucata[] {
  const N = b.length;
  if (N < 2) return b;
  // Pornirea: după o bucată care nu e cubică, ca o fugă să nu treacă peste capătul listei; altfel, de la început. Pe un arc
  // deschis, de la început, fără trecere peste capăt.
  const start = sfarsit ? 0 : Math.max(0, b.findIndex((x, k) => x.tip === 0 && (b[(k + 1) % N]?.tip ?? 0) === 1) + 1);
  const ord = Array.from({ length: N }, (_, k) => b[(start + k) % N] as Bucata);
  const r: Bucata[] = [];
  for (let i = 0; i < N;) {
    const a = ord[i] as Bucata;
    if (a.tip !== 1) { r.push(a); i++; continue; }
    let cel = i, celBucata: Bucata | null = null;
    const t1x = a.c1x - a.x, t1y = a.c1y - a.y, l1 = Math.hypot(t1x, t1y);
    for (let j = i + 1; j < N && l1 > 0; j++) {
      const z = ord[j] as Bucata;
      if (z.tip !== 1) break;
      const fin = urmatoarea(ord, j, sfarsit);
      const t2x = z.c2x - fin.x, t2y = z.c2y - fin.y, l2 = Math.hypot(t2x, t2y);
      if (l2 === 0) break;
      // Același sens și o rotire de cel mult 100°.
      const semn = (u: Bucata, w: Bucata): number => Math.sign((u.c2x - u.c1x) * (w.c2y - w.c1y) - (u.c2y - u.c1y) * (w.c2x - w.c1x));
      if (semn(ord[j - 1] as Bucata, z) !== semn(a, ord[i + 1] as Bucata)) break;
      const cosr = (t1x * -t2x + t1y * -t2y) / (l1 * l2);
      if (cosr < Math.cos((100 * Math.PI) / 180)) break;
      let de = a.de, la = z.la;
      if (la < de) la += n;
      if (de < 0) { de += n; la += n; }
      const { bucata, eroare } = potriveste(P, n, de, la, a.x, a.y, fin.x, fin.y, t1x / l1, t1y / l1, t2x / l2, t2y / l2);
      if (eroare > tau) break;
      cel = j;
      celBucata = { ...bucata, de: a.de, la: z.la };
    }
    if (celBucata) { r.push(celBucata); i = cel + 1; } else { r.push(a); i++; }
  }
  return r;
}

/**
 * Abaterea: cea mai mare distanță dintre un punct al buclei și curbele trasate. Fiecare punct se judecă față de bucata în
 * care cade (după indici) și de vecinele ei: un capăt de bucată stă între două puncte ale buclei.
 */
function masoara(b: Bucata[], P: Float64Array, n: number, sfarsit?: readonly [number, number]): number {
  let ab = 0;
  const N = b.length;
  const la = (k: number, px: number, py: number): number => {
    // Pe un arc deschis, vecinele din afara lui nu există.
    if (sfarsit && (k < 0 || k >= N)) return Infinity;
    const i = ((k % N) + N) % N, x = b[i] as Bucata, urm = urmatoarea(b, i, sfarsit);
    return distantaLa(x, urm.x, urm.y, px, py);
  };
  for (let k = 0; k < N; k++) {
    const x = b[k] as Bucata;
    let de = x.de, sf = x.la;
    if (sf < de) sf += n;
    for (let q = de; q <= sf; q++) {
      const i = ((q % n) + n) % n, px = P[2 * i] ?? 0, py = P[2 * i + 1] ?? 0;
      let d = la(k, px, py);
      if (d > 0.05) d = Math.min(d, la(k - 1, px, py), la(k + 1, px, py));
      ab = Math.max(ab, d);
    }
  }
  return ab;
}

// ── Trasarea întreagă ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Ce știe raportul înainte de curbe: imaginea, cerneala, pragul, curățarea și marginile. */
export type BazaRaport = Omit<RaportTrasare, 'contururi' | 'exterioare' | 'varfuri' | 'abatere'>;

/**
 * Partea comună a trasării și a liniei mediane (ADR 0222 §3): cerneala, histograma (înainte de curățare, care scrie în câmp;
 * o dată, pentru prag și pentru fereastră), pragul (automat sau ales), curățarea petelor și a golurilor, apoi felul
 * marginilor: printre pixelii de lângă prag, câți au o nuanță între desen și fundal.
 */
export function campul(img: ImagineRGBA, o: OptiuniTrasare): { readonly f: Float32Array; readonly T: number; readonly baza: BazaRaport } {
  const { latime: W, inaltime: H } = img;
  const { f, transparenta, sursa } = cerneala(img, o);
  const automat = o.prag === null;
  const h = histograma(f);
  const T = automat ? (sursa === 'alfa' ? 0.5 : pragAutomat(f, h)) : (Math.max(1, Math.min(254, o.prag)) - 0.5) / 255;
  const { pete, gauri } = curata(f, W, H, T, o.petePx, o.gauriPx);
  let langa = 0, nuante = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x + 1 < W; x++) {
      const a = f[y * W + x] ?? 0, b = f[y * W + x + 1] ?? 0;
      if ((a >= T) === (b >= T)) continue;
      langa += 2;
      if (a > 0.08 && a < 0.92) nuante++;
      if (b > 0.08 && b < 0.92) nuante++;
    }
  }
  const margini = langa > 0 && nuante / langa < 0.15 ? 'dure' : 'netezite';
  return { f, T, baza: { latime: W, inaltime: H, transparenta, sursa, prag: Math.round(T * 255), automat, margini, pete, gauri, histograma: Array.from(h) } };
}

/** Trasarea unei imagini: căile închise, în pixeli, și raportul; peste plafoane, refuzul, cu raportul (ce s-a numărat). */
export function traseaza(img: ImagineRGBA, o: OptiuniTrasare): RezultatTrasare {
  const { latime: W, inaltime: H } = img;
  const { f, T, baza } = campul(img, o);
  const { margini } = baza;
  const trepte = TREPTE[o.netezime];
  const eps = margini === 'dure' ? Math.max(trepte.eps, EPS_DUR) : trepte.eps;
  const tau = margini === 'dure' ? Math.max(trepte.tau, EPS_DUR) : trepte.tau;
  const bucle = margini === 'dure' ? contururi(f, W, H, T).map(netezeste) : contururi(f, W, H, T);
  const pozitive = Uint8Array.from(bucle, (b) => (arie(b) > 0 ? 1 : 0));
  const exterioare = pozitive.reduce((s, x) => s + x, 0);
  if (bucle.length > PLAFON_TRASARE.contururi) {
    return { ok: false, cod: 'prea-multe', raport: { ...baza, contururi: bucle.length, exterioare, varfuri: 0, abatere: 0 } };
  }
  const inceput = new Uint32Array(bucle.length + 1);
  const tipuri: number[] = [];
  const xy: number[] = [];
  let abatere = 0;
  for (const [k, b] of bucle.entries()) {
    const r = curbeleBuclei(b, eps, tau, trepte.colt, margini === 'dure' ? 1.5 : 0.9);
    abatere = Math.max(abatere, r.abatere);
    for (const x of r.bucati) { tipuri.push(x.tip); xy.push(x.x, x.y, x.c1x, x.c1y, x.c2x, x.c2y); }
    inceput[k + 1] = tipuri.length;
    if (tipuri.length > PLAFON_TRASARE.varfuri) {
      return { ok: false, cod: 'prea-multe', raport: { ...baza, contururi: bucle.length, exterioare, varfuri: tipuri.length, abatere } };
    }
  }
  return {
    ok: true,
    cai: { inceput, tip: Uint8Array.from(tipuri), xy: Float64Array.from(xy), exterior: pozitive },
    raport: { ...baza, contururi: bucle.length, exterioare, varfuri: tipuri.length, abatere },
  };
}
