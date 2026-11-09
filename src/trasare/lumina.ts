/**
 * Lumina unei scanări sau a unei poze (ADR 0224): cerneala raportată la fundalul hârtiei, nu la un prag unic. Luminozitatea e
 * lumina × hârtia, deci împărțită la fundal, hârtia iese 1 oriunde ar fi (corecția câmpului plat). Fundalul e:
 * - neted („Neuniformă”): un polinom de gradul 3 în (x, y), potrivit pe hârtie (cerneala și o pată plină nu intră în el);
 *   nu știe o umbră tare, fiindcă e neted;
 * - local („Cu umbre”): închiderea morfologică pe o fereastră pătrată (maximul, apoi minimul); șterge trăsăturile mai înguste
 *   decât fereastra și păstrează o treaptă (o funcție monotonă nu se schimbă la închidere); golește o pată plină mai lată
 *   decât fereastra.
 * Pe un fond închis (creta pe tablă), fundalul e al fondului (deschiderea, la cel local) și raportul se întinde după
 * percentila 99,5. Polaritatea, la aceste lumini, vine din minoritatea locală a cernelii, nu din marginea imaginii.
 *
 * Pură, fără importuri din aplicație (regula `trasare-izolat`). Coordonatele, ca la trasare: pixeli, y în jos.
 */

export type Lumina = 'uniforma' | 'neuniforma' | 'umbre';

/** Fereastra fundalului local: 1/12 din latura mică a imaginii, impară, cel puțin 15 px. */
export function fereastraLocala(W: number, H: number): number {
  return Math.max(15, 2 * Math.round(Math.min(W, H) / 24) + 1);
}

/** Câte coloane trec deodată prin filtrul pe coloane: un rând de 16 numere e o linie de cache. */
const BENZI = 16;

/**
 * Maximul (`max`) sau minimul pe fereastra pătrată de 2h + 1 px, tăiată la marginile imaginii. Separabil, pe linii și apoi pe
 * coloane, cu trei comparații pe pixel oricât de mare e fereastra (van Herk 1992; Gil și Werman 1993): pe blocuri de 2h + 1,
 * extremul de la începutul blocului până la fiecare punct și cel de la fiecare punct până la capătul blocului; o fereastră
 * prinde sfârșitul unui bloc și începutul următorului. Linia e bordată cu ∓∞ cât jumătatea ferestrei, deci la margini intră
 * doar ce e în imagine. `o` (ieșirea) poate fi chiar `v`: liniile se citesc toate înaintea coloanelor; `t` e bufferul
 * dintre ele.
 */
export function filtruFereastra(v: Float32Array, W: number, H: number, h: number, max: boolean, o: Float32Array = new Float32Array(W * H), t: Float32Array = new Float32Array(W * H)): Float32Array {
  if (h <= 0 || W === 0 || H === 0) { if (o !== v) o.set(v); return o; }
  const w = 2 * h + 1, gol = max ? -Infinity : Infinity;
  // Liniile: bordura, extremele pe blocuri, apoi fereastra fiecărui pixel.
  {
    const m = W + 2 * h, b = new Float32Array(m).fill(gol), G = new Float32Array(m), S = new Float32Array(m);
    for (let y = 0; y < H; y++) {
      const r = y * W;
      b.set(v.subarray(r, r + W), h);
      for (let i = 0, k = 0; i < m; i++, k = k + 1 === w ? 0 : k + 1) {
        const x = b[i] ?? 0, g = G[i - 1] ?? 0;
        G[i] = k === 0 ? x : max ? (x > g ? x : g) : (x < g ? x : g);
      }
      for (let i = m - 1; i >= 0; i--) {
        const x = b[i] ?? 0, s = S[i + 1] ?? 0;
        S[i] = i === m - 1 || (i + 1) % w === 0 ? x : max ? (x > s ? x : s) : (x < s ? x : s);
      }
      for (let j = 0; j < W; j++) {
        const a = S[j] ?? 0, c = G[j + w - 1] ?? 0;
        t[r + j] = max ? (a > c ? a : c) : (a < c ? a : c);
      }
    }
  }
  // Coloanele, câte `BENZI` deodată (rândurile benzii sunt contigue în imagine).
  {
    const m = H + 2 * h, b = new Float32Array(m * BENZI), G = new Float32Array(m * BENZI), S = new Float32Array(m * BENZI);
    for (let x0 = 0; x0 < W; x0 += BENZI) {
      const nc = Math.min(BENZI, W - x0);
      for (let i = 0; i < m; i++) {
        const y = i - h, q = i * BENZI;
        if (y < 0 || y >= H) for (let c = 0; c < nc; c++) b[q + c] = gol;
        else { const r = y * W + x0; for (let c = 0; c < nc; c++) b[q + c] = t[r + c] ?? 0; }
      }
      for (let i = 0; i < m; i++) {
        const q = i * BENZI, inceput = i % w === 0;
        for (let c = 0; c < nc; c++) {
          const x = b[q + c] ?? 0, g = G[q - BENZI + c] ?? 0;
          G[q + c] = inceput ? x : max ? (x > g ? x : g) : (x < g ? x : g);
        }
      }
      for (let i = m - 1; i >= 0; i--) {
        const q = i * BENZI, capat = i === m - 1 || (i + 1) % w === 0;
        for (let c = 0; c < nc; c++) {
          const x = b[q + c] ?? 0, s = S[q + BENZI + c] ?? 0;
          S[q + c] = capat ? x : max ? (x > s ? x : s) : (x < s ? x : s);
        }
      }
      for (let y = 0; y < H; y++) {
        const qa = y * BENZI, qc = (y + w - 1) * BENZI, r = y * W + x0;
        for (let c = 0; c < nc; c++) {
          const a = S[qa + c] ?? 0, d = G[qc + c] ?? 0;
          o[r + c] = max ? (a > d ? a : d) : (a < d ? a : d);
        }
      }
    }
  }
  return o;
}

/**
 * Fundalul local (`Cu umbre`): pe hârtia deschisă, închiderea luminozității (maximul, apoi minimul, pe fereastra `w`); pe
 * fondul închis, deschiderea (minimul, apoi maximul). Cerneala mai îngustă decât fereastra iese din fundal; o treaptă rămâne.
 */
export function fundalLocal(l: Float32Array, W: number, H: number, w: number, hartieDeschisa: boolean): Float32Array {
  const h = w >> 1, t = new Float32Array(W * H);
  const a = filtruFereastra(l, W, H, h, hartieDeschisa, new Float32Array(W * H), t);
  return filtruFereastra(a, W, H, h, !hartieDeschisa, a, t);
}

/** Cei 10 termeni ai polinomului de gradul 3 în pixelul (x, y), cu coordonatele aduse la [−1, 1] pe imagine. */
function termeni(x: number, y: number, W: number, H: number, t: Float64Array): void {
  const u = (2 * (x + 0.5)) / W - 1, v = (2 * (y + 0.5)) / H - 1;
  t[0] = 1; t[1] = u; t[2] = v; t[3] = u * u; t[4] = u * v; t[5] = v * v; t[6] = u * u * u; t[7] = u * u * v; t[8] = u * v * v; t[9] = v * v * v;
}

/** Sistemul n × n (ecuațiile normale), cu pivotul cel mai mare pe coloană; null dacă e degenerat. */
function rezolva(A: Float64Array, b: Float64Array, n: number): Float64Array | null {
  const M = new Float64Array(n * (n + 1));
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i * (n + 1) + j] = A[i * n + j] ?? 0; M[i * (n + 1) + n] = b[i] ?? 0; }
  const e = (i: number, j: number): number => M[i * (n + 1) + j] ?? 0;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(e(i, k)) > Math.abs(e(p, k))) p = i;
    if (Math.abs(e(p, k)) < 1e-12) return null;
    if (p !== k) for (let j = 0; j <= n; j++) { const x = e(k, j); M[k * (n + 1) + j] = e(p, j); M[p * (n + 1) + j] = x; }
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = e(i, k) / e(k, k);
      if (f !== 0) for (let j = k; j <= n; j++) M[i * (n + 1) + j] = e(i, j) - f * e(k, j);
    }
  }
  return Float64Array.from({ length: n }, (_, i) => e(i, n) / e(i, i));
}

/** Câte eșantioane are potrivirea polinomului (o grilă rară, oricât de mare e imaginea). */
const ESANTIOANE = 40_000;

/**
 * Polinomul hârtiei, potrivit cu cele mai mici pătrate pe o grilă rară, de patru ori: întâi pe pixelii de partea hârtiei a
 * pragului `prag0` (peste el pe hârtia deschisă, sub el pe cea închisă), apoi pe cei apropiați de suprafața de dinainte (cel
 * puțin 0,85 din ea, respectiv cel mult 1,5 din ea). Întoarce coeficienții și variația suprafeței pe eșantioanele de hârtie
 * de la capăt: (max − min) / max.
 */
function potriveste(val: (p: number) => number, W: number, H: number, hartieDeschisa: boolean, prag0: number): { c: Float64Array; variatie: number } {
  const n = 10, pas = Math.max(1, Math.round(Math.sqrt((W * H) / ESANTIOANE))), t = new Float64Array(n);
  const xs: number[] = [], ys: number[] = [];
  for (let y = pas >> 1; y < H; y += pas) for (let x = pas >> 1; x < W; x += pas) { xs.push(x); ys.push(y); }
  const vals = Float64Array.from(xs, (x, i) => val((ys[i] ?? 0) * W + x));
  const fit = new Float64Array(xs.length);
  let c: Float64Array = new Float64Array(n);
  const aproape = (v: number, s: number): boolean => (hartieDeschisa ? v >= 0.85 * s : v <= 1.5 * s);
  for (let it = 0; it < 4; it++) {
    const A = new Float64Array(n * n), b = new Float64Array(n);
    let k = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = vals[i] ?? 0;
      if (it === 0 ? (hartieDeschisa ? v < prag0 : v > prag0) : !aproape(v, fit[i] ?? 0)) continue;
      termeni(xs[i] ?? 0, ys[i] ?? 0, W, H, t);
      for (let r = 0; r < n; r++) {
        const tr = t[r] ?? 0;
        b[r] = (b[r] ?? 0) + tr * v;
        for (let q = r; q < n; q++) A[r * n + q] = (A[r * n + q] ?? 0) + tr * (t[q] ?? 0);
      }
      k++;
    }
    for (let r = 0; r < n; r++) for (let q = 0; q < r; q++) A[r * n + q] = A[q * n + r] ?? 0;
    // Prea puțină hârtie pentru un polinom (o imagine aproape toată cerneală): o suprafață plană, media hârtiei.
    const s = k >= 3 * n ? rezolva(A, b, n) : null;
    if (!s) {
      let suma = 0, nr = 0;
      for (let i = 0; i < xs.length; i++) { const v = vals[i] ?? 0; if (hartieDeschisa ? v >= prag0 : v <= prag0) { suma += v; nr++; } }
      c = new Float64Array(n);
      c[0] = nr > 0 ? suma / nr : prag0;
      fit.fill(c[0] ?? 0);
      break;
    }
    c = s;
    for (let i = 0; i < xs.length; i++) {
      termeni(xs[i] ?? 0, ys[i] ?? 0, W, H, t);
      let f = 0;
      for (let r = 0; r < n; r++) f += (t[r] ?? 0) * (c[r] ?? 0);
      fit[i] = f;
    }
  }
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (!aproape(vals[i] ?? 0, fit[i] ?? 0)) continue;
    const f = fit[i] ?? 0;
    if (f < mn) mn = f;
    if (f > mx) mx = f;
  }
  return { c, variatie: mx > 0 && mn <= mx ? (mx - mn) / mx : 0 };
}

/** Pasul grilei pe care se evaluează polinomul (apoi interpolat liniar pe fiecare pixel). */
const GRILA = 32;

/**
 * Fundalul neted (`Neuniformă`): polinomul hârtiei (vezi `potriveste`), evaluat în nodurile unei grile de 32 px și
 * interpolat biliniar pe fiecare pixel. `prag0` desparte hârtia de cerneală pentru prima potrivire (Otsu pe luminozitate).
 */
export function fundalNeted(l: Float32Array, W: number, H: number, hartieDeschisa: boolean, prag0: number): { B: Float32Array; variatie: number } {
  const { c, variatie } = potriveste((p) => l[p] ?? 0, W, H, hartieDeschisa, prag0);
  const t = new Float64Array(10);
  const nod = (x: number, y: number): number => { termeni(x, y, W, H, t); let f = 0; for (let r = 0; r < 10; r++) f += (t[r] ?? 0) * (c[r] ?? 0); return f; };
  const gx = Math.max(2, Math.ceil((W - 1) / GRILA) + 1), gy = Math.max(2, Math.ceil((H - 1) / GRILA) + 1);
  const X = Float64Array.from({ length: gx }, (_, i) => Math.min(W - 1, i * GRILA)), Y = Float64Array.from({ length: gy }, (_, j) => Math.min(H - 1, j * GRILA));
  const N = new Float64Array(gx * gy);
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) N[j * gx + i] = nod(X[i] ?? 0, Y[j] ?? 0);
  const B = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const j = Math.min(gy - 2, Math.floor(y / GRILA)), dy = (Y[j + 1] ?? 0) - (Y[j] ?? 0), v = dy > 0 ? (y - (Y[j] ?? 0)) / dy : 0;
    for (let x = 0; x < W; x++) {
      const i = Math.min(gx - 2, Math.floor(x / GRILA)), dx = (X[i + 1] ?? 0) - (X[i] ?? 0), u = dx > 0 ? (x - (X[i] ?? 0)) / dx : 0;
      const a = N[j * gx + i] ?? 0, b = N[j * gx + i + 1] ?? 0, cc = N[(j + 1) * gx + i] ?? 0, d = N[(j + 1) * gx + i + 1] ?? 0;
      B[y * W + x] = (1 - v) * ((1 - u) * a + u * b) + v * ((1 - u) * cc + u * d);
    }
  }
  return { B, variatie };
}

/**
 * Cât variază hârtia unei imagini (sugestia raportului la „Uniformă”, ADR 0224 §1): polinomul potrivit pe luminozitatea
 * hârtiei (1 − cerneala, cu polaritatea de acum), doar pe eșantioane; `T` e pragul cernelii. (max − min) / max.
 */
export function variatieHartie(f: Float32Array, W: number, H: number, T: number): number {
  return potriveste((p) => 1 - (f[p] ?? 0), W, H, true, 1 - T).variatie;
}

/** Percentila `q` (0–1) a unor valori din [0, sus], dintr-o histogramă de 4096 de trepte. */
function percentila(v: ArrayLike<number>, q: number, sus: number, pas = 1): number {
  const K = 4096, h = new Uint32Array(K);
  let n = 0;
  for (let i = 0; i < v.length; i += pas) { const k = Math.max(0, Math.min(K - 1, Math.floor(((v[i] ?? 0) / sus) * K))); h[k] = (h[k] ?? 0) + 1; n++; }
  const tinta = q * n;
  for (let k = 0, s = 0; k < K; k++) { s += h[k] ?? 0; if (s >= tinta) return ((k + 0.5) / K) * sus; }
  return sus;
}

/**
 * Cerneala ca raport față de fundal: pe hârtia deschisă (B − l) / B, cu B de cel puțin un sfert din hârtia cea mai deschisă
 * (percentila 95 a fundalului): unde fundalul e aproape negru (masa din jurul foii, colțul cel mai întunecat), zgomotul
 * împărțit la el ar ieși pete. Pe fondul închis, (l / B − 1), întins după percentila 99,5 a raportului (creta cea mai deschisă
 * ajunge la 1). Fundalul are cel puțin 0,02 (un negru adânc nu împarte la zero). Scrie peste `B` (fundalul nu mai trebuie
 * după) și îl întoarce.
 */
export function raportFundal(l: Float32Array, B: Float32Array, hartieDeschisa: boolean): Float32Array {
  const f = B;
  if (hartieDeschisa) {
    const jos = Math.max(0.02, 0.25 * percentila(B, 0.95, 1, Math.max(1, Math.floor(B.length / 200_000))));
    for (let p = 0; p < l.length; p++) {
      const b = B[p] ?? 0, v = (b - (l[p] ?? 0)) / Math.max(jos, b);
      f[p] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    return f;
  }
  for (let p = 0; p < l.length; p++) f[p] = (l[p] ?? 0) / Math.max(0.02, B[p] ?? 0);
  let sus = 1;
  for (let p = 0; p < f.length; p += 7) if ((f[p] ?? 0) > sus) sus = f[p] ?? 0;
  const p995 = percentila(f, 0.995, sus, Math.max(1, Math.floor(f.length / 200_000)));
  const s = p995 > 1.01 ? p995 - 1 : 1;
  for (let p = 0; p < f.length; p++) { const v = ((f[p] ?? 0) - 1) / s; f[p] = v < 0 ? 0 : v > 1 ? 1 : v; }
  return f;
}

/**
 * Polaritatea pe o poză (ADR 0224 §2): true dacă cerneala e deschisă pe un fond închis. Pe imaginea redusă la ~0,25 Mpx,
 * mediana luminozității în fereastra fiecărui pixel (1/12 din latura mică): acolo, hârtia e majoritatea, deci mediana e a
 * hârtiei, iar cerneala e ce se abate de la ea. Abaterile de peste zgomot (de trei ori abaterea mediană absolută, cel puțin
 * 5 / 255) se adună pe semne, iar cerneala are semnul celor mai mari. Lumina nu se abate (mediana o urmează), nici o treaptă
 * de umbră sau marginea mesei (de fiecare parte, mediana e a părții); marginea imaginii nu mai decide. Un desen în care
 * cerneala e majoritatea ferestrei (o pată plină mare) se abate doar pe marginile lui, deci nu decide.
 */
export function cernealaDeschisa(l: Float32Array, W: number, H: number): boolean {
  const s = Math.max(1, Math.round(Math.sqrt((W * H) / 250_000))), w = Math.max(1, Math.floor(W / s)), h = Math.max(1, Math.floor(H / s));
  const r = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t = 0, n = 0;
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const yy = y * s + j, xx = x * s + i; if (yy < H && xx < W) { t += l[yy * W + xx] ?? 0; n++; } }
      r[y * w + x] = Math.max(0, Math.min(255, Math.round((255 * t) / Math.max(1, n))));
    }
  }
  // Mediana pe fereastră, glisantă pe rânduri (Huang, 1979): histograma ferestrei, cu coloana nouă adăugată și cea veche
  // scoasă, și mediana mutată pas cu pas.
  const k = Math.max(3, Math.round(Math.min(w, h) / 24)), dev = new Int16Array(w * h), hist = new Int32Array(256);
  for (let y = 0; y < h; y++) {
    hist.fill(0);
    const y0 = Math.max(0, y - k), y1 = Math.min(h - 1, y + k);
    let n = 0, m = 0, sub = 0;
    const coloana = (x: number, semn: number): void => {
      for (let yy = y0; yy <= y1; yy++) { const v = r[yy * w + x] ?? 0; hist[v] = (hist[v] ?? 0) + semn; if (v < m) sub += semn; }
      n += semn * (y1 - y0 + 1);
    };
    for (let x = 0; x <= Math.min(w - 1, k); x++) coloana(x, 1);
    for (let x = 0; x < w; x++) {
      if (x > 0) {
        if (x + k < w) coloana(x + k, 1);
        if (x - k - 1 >= 0) coloana(x - k - 1, -1);
      }
      const tinta = (n + 1) >> 1;
      while (sub + (hist[m] ?? 0) < tinta && m < 255) { sub += hist[m] ?? 0; m++; }
      while (m > 0 && sub >= tinta) { m--; sub -= hist[m] ?? 0; }
      dev[y * w + x] = (r[y * w + x] ?? 0) - m;
    }
  }
  // Zgomotul: abaterea mediană absolută (pe o histogramă a abaterilor), de trei ori, ca abaterea tipică a hârtiei.
  const ha = new Int32Array(256);
  for (let p = 0; p < w * h; p++) { const a = Math.min(255, Math.abs(dev[p] ?? 0)); ha[a] = (ha[a] ?? 0) + 1; }
  let mad = 0;
  for (let a = 0, c = 0; a < 256; a++) { c += ha[a] ?? 0; if (c >= (w * h) / 2) { mad = a; break; } }
  const prag = Math.max(5, 3 * 1.4826 * mad);
  let inchise = 0, deschise = 0;
  for (let p = 0; p < w * h; p++) {
    const d = dev[p] ?? 0;
    if (d > prag) deschise += d - prag;
    else if (d < -prag) inchise += -d - prag;
  }
  return deschise > inchise;
}

/**
 * Cerneala unei poze cu lumina aleasă (ADR 0224 §2): polaritatea din minoritatea locală (Inversează o întoarce), fundalul
 * (neted sau local) și raportul față de el. `l`: luminozitatea, 0–1; `prag0`: pragul Otsu pe luminozitate (prima potrivire a
 * fundalului neted).
 */
export function cernealaLuminata(l: Float32Array, W: number, H: number, lumina: Exclude<Lumina, 'uniforma'>, inverseaza: boolean, prag0: number): Float32Array {
  const hartieDeschisa = cernealaDeschisa(l, W, H) === inverseaza;
  const B = lumina === 'neuniforma' ? fundalNeted(l, W, H, hartieDeschisa, prag0).B : fundalLocal(l, W, H, fereastraLocala(W, H), hartieDeschisa);
  return raportFundal(l, B, hartieDeschisa);
}
