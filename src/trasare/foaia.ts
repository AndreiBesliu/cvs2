/**
 * Foaia pozată oblic (ADR 0225, felia 25.5↑): colțurile foii găsite singure, proporțiile ei din perspectivă și îndreptarea.
 *
 * - **Găsirea:** pe imaginea redusă (cel mult `PIXELI_CAUTARE`), pragul Otsu pe luminozitate, componenta deschisă cea mai
 *   mare (4-vecinătate), punctele ei de margine, învelitoarea lor convexă (lanțul monoton), redusă la cel mult 40 de vârfuri
 *   (Visvalingam), apoi patrulaterul de arie maximă dintre ele (toate combinațiile: un colț rotunjit de pixeli în trei vârfuri
 *   apropiate nu-l pierde pe cel adevărat, cum îl pierdea Visvalingam până la patru) și laturile lui potrivite cu drepte.
 *   Nu e foaie: componenta sub 5 % din imagine, învelitoarea pe marginea imaginii pe peste 10 % din perimetrul ei (un scan,
 *   o foaie tăiată de cadru), patrulaterul sub 95 % din învelitoare (un logo rotund), o imagine cu transparență. Un colț
 *   ieșit puțin din cadru se extrapolează din laturile vecine.
 * - **Rafinarea:** pe imaginea întreagă, pe 48 de normale de-a lungul fiecărei laturi (fără capete), trecerea de 50 % dintre
 *   hârtie și masă, interpolată; dreapta celor mai mici pătrate totale pe ele (o dată, apoi fără punctele la peste 1 px);
 *   colțurile, din intersecțiile laturilor.
 * - **Proporțiile:** Zhang și He (2007), „Whiteboard scanning and image enhancement”: focala din ortogonalitatea laturilor,
 *   cu centrul optic în mijlocul imaginii, apoi raportul laturilor; din față (laturile paralele), raportul lor.
 * - **Îndreptarea:** omografia de la dreptunghiul de ieșire la colțurile din poză (transformarea liniară directă, 8 × 8),
 *   mersă pe rând (numărătorii și numitorul sunt liniari în x), eșantionarea biliniară; densitatea, a laturii celei mai lungi.
 *
 * Colțurile sunt în pixelii pozei (y în jos, pixelul (x, y) acoperă [x, x + 1) × [y, y + 1)), în ordinea stânga-sus,
 * dreapta-sus, dreapta-jos, stânga-jos, cu stânga-sus cel mai aproape de colțul pozei.
 */
import { pragAutomat, type ImagineRGBA } from './trasare.ts';
import { aria, colturiBune, cr, omografie, type Colturi, type Punct } from './colturi.ts';

export {
  aplicaOmografia, colturiBune, colturiImplicite, omografie, type Colturi, type Omografie, type Punct,
} from './colturi.ts';

/** Imaginea redusă pentru găsirea foii: cel mult atâția pixeli. */
const PIXELI_CAUTARE = 400_000;
/** Componenta foii: cel puțin atât din imagine. */
const ARIE_MINIMA = 0.05;
/** Învelitoarea foii pe marginea imaginii: cel mult atât din perimetrul ei. */
const PE_MARGINE = 0.1;
/** Patrulaterul foii: cel puțin atât din aria învelitoarii. */
const PLINATATE = 0.95;
/** Abaterea (grade) de la unghiul drept sau de la axe peste care foaia pare oblică (sugestia raportului). */
const OBLIC = 2;

// ── Găsirea foii ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** O dreaptă: un punct al ei și direcția (unitară). */
type Dreapta = { readonly px: number; readonly py: number; readonly dx: number; readonly dy: number };

/** Dreapta celor mai mici pătrate totale prin puncte (cel puțin două), sau null. */
function dreaptaPrin(pct: readonly Punct[]): Dreapta | null {
  if (pct.length < 2) return null;
  let mx = 0, my = 0;
  for (const p of pct) { mx += p[0]; my += p[1]; }
  mx /= pct.length; my /= pct.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pct) { const ex = p[0] - mx, ey = p[1] - my; sxx += ex * ex; sxy += ex * ey; syy += ey * ey; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { px: mx, py: my, dx: Math.cos(th), dy: Math.sin(th) };
}

/** Colțurile din laturi (în ordinea sus, dreapta, jos, stânga): colțul i e intersecția laturilor i − 1 și i; null: paralele. */
function colturiDinLaturi(l: readonly Dreapta[]): Colturi | null {
  const c: Punct[] = [];
  for (let i = 0; i < 4; i++) {
    const d0 = l[(i + 3) % 4], d1 = l[i];
    if (!d0 || !d1) return null;
    const det = d1.dx * d0.dy - d0.dx * d1.dy;
    if (Math.abs(det) < 1e-9) return null;
    const t = (d1.dx * (d1.py - d0.py) - d1.dy * (d1.px - d0.px)) / det;
    c.push([d0.px + t * d0.dx, d0.py + t * d0.dy]);
  }
  return c as unknown as Colturi;
}

/** Învelitoarea convexă (lanțul monoton), în sensul acelor de ceasornic pe ecran (y în jos), fără punctele coliniare. */
function invelitoare(pct: readonly Punct[]): Punct[] {
  const P = [...pct].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const jos: Punct[] = [], sus: Punct[] = [];
  for (const p of P) {
    while (jos.length >= 2 && cr(jos[jos.length - 2] ?? p, jos[jos.length - 1] ?? p, p) <= 0) jos.pop();
    jos.push(p);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i] ?? [0, 0];
    while (sus.length >= 2 && cr(sus[sus.length - 2] ?? p, sus[sus.length - 1] ?? p, p) <= 0) sus.pop();
    sus.push(p);
  }
  return [...jos.slice(0, -1), ...sus.slice(0, -1)];
}

/** Latura a–b a învelitorii stă pe una din marginile imaginii reduse (w × h, centrele pixelilor). */
function peMarginea(a: Punct, b: Punct, w: number, h: number): boolean {
  const pe = (v: number, m: number): boolean => v < 1 || v > m - 1;
  return (pe(a[0], w) && pe(b[0], w) && Math.abs(a[0] - b[0]) < 1) || (pe(a[1], h) && pe(b[1], h) && Math.abs(a[1] - b[1]) < 1);
}

/**
 * Colțurile foii ieșite din cadru: o latură a învelitorii pe marginea imaginii (foaia tăiată puțin de cadru) se înlocuiește
 * cu intersecția laturilor vecine ei (care stau pe marginile foii), după capetele laturii (învelitoarea rămâne convexă;
 * acolo, dincolo de margine, e afara imaginii). Altfel, latura rămâne.
 */
function colturiIesite(inv: readonly Punct[], w: number, h: number): Punct[] {
  const n = inv.length, scos = new Array<boolean>(n).fill(false), pus = new Map<number, Punct>();
  const v = (k: number): Punct => inv[((k % n) + n) % n] ?? [0, 0];
  /** Reperul dreptei prin vârful i, mergând cu pasul dat: vârful cel mai depărtat cu toate cele dintre ele la cel mult 1,5 px. */
  const reper = (i: number, pas: number): Punct => {
    const a = v(i);
    let r = v(i + pas);
    for (let k = 2; k < n / 2; k++) {
      const c = v(i + k * pas), L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      let drept = L > 0;
      for (let j = 1; j < k && drept; j++) drept = Math.abs(cr(a, c, v(i + j * pas))) / L <= 1.5;
      if (!drept) break;
      r = c;
    }
    return r;
  };
  for (let i = 0; i < n; i++) {
    const a = v(i), b = v(i + 1);
    if (!peMarginea(a, b, w, h) || peMarginea(v(i - 1), a, w, h) || peMarginea(b, v(i + 2), w, h)) continue;
    const p = reper(i, -1), q = reper(i + 1, 1);
    // p + t (a − p) = b + u (q − b): colțul e după a (t > 1) și înainte de b (u < 0).
    const ux = a[0] - p[0], uy = a[1] - p[1], vx = q[0] - b[0], vy = q[1] - b[1], det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-9) continue;
    const t = ((b[0] - p[0]) * vy - (b[1] - p[1]) * vx) / det, u = ((b[0] - p[0]) * uy - (b[1] - p[1]) * ux) / det;
    if (!(t > 1 && u < 0)) continue;
    scos[i] = true; scos[(i + 1) % n] = true; pus.set(i, [p[0] + t * ux, p[1] + t * uy]);
  }
  const rez: Punct[] = [];
  for (let i = 0; i < n; i++) {
    const x = pus.get(i);
    if (x) rez.push(x);
    if (!scos[i]) rez.push(inv[i] ?? [0, 0]);
  }
  return rez;
}

/**
 * Poligonul convex redus la cel mult 40 de vârfuri (Visvalingam: pleacă vârful cu triunghiul cel mai mic, adică treptele
 * pixelilor de pe laturi); laturile care rămân sunt lungi, deci direcțiile lor sunt bune.
 */
function redus(inv: Punct[]): Punct[] {
  while (inv.length > 40) {
    let k = 0, m = Infinity;
    for (let i = 0; i < inv.length; i++) {
      const a = Math.abs(cr(inv[(i + inv.length - 1) % inv.length] ?? [0, 0], inv[i] ?? [0, 0], inv[(i + 1) % inv.length] ?? [0, 0]));
      if (a < m) { m = a; k = i; }
    }
    inv.splice(k, 1);
  }
  return inv;
}

/** Patrulaterul de arie maximă cu vârfuri din poligonul convex dat (cel mult 40 de vârfuri: toate combinațiile). */
function patrulaterMaxim(inv: readonly Punct[]): Punct[] {
  if (inv.length <= 4) return [...inv];
  const n = inv.length, v = (i: number): Punct => inv[i] ?? [0, 0];
  let cel = [0, 1, 2, 3], m = -1;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        const abc = cr(v(a), v(b), v(c));
        for (let d = c + 1; d < n; d++) {
          const s = Math.abs(abc + cr(v(a), v(c), v(d)));
          if (s > m) { m = s; cel = [a, b, c, d]; }
        }
      }
    }
  }
  return cel.map(v);
}

/** Ordinea colțurilor: în sensul acelor de ceasornic pe ecran, începând cu cel mai aproape de colțul stânga-sus al pozei. */
function ordoneaza(p: readonly Punct[]): Colturi {
  const cx = p.reduce((t, q) => t + q[0], 0) / p.length, cy = p.reduce((t, q) => t + q[1], 0) / p.length;
  const s = [...p].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  let i0 = 0;
  for (let i = 1; i < s.length; i++) if ((s[i]?.[0] ?? 0) + (s[i]?.[1] ?? 0) < (s[i0]?.[0] ?? 0) + (s[i0]?.[1] ?? 0)) i0 = i;
  return [...s.slice(i0), ...s.slice(0, i0)] as unknown as Colturi;
}

/** Luminozitatea în [0, 1] a pixelului (x, y) (RGB, Rec. 709). */
const lum709 = (d: ArrayLike<number>, i: number): number => (0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0)) / 255;

/**
 * Colțurile foii din poză, rafinate sub-pixel, sau null dacă nu se vede o foaie (vezi capul fișierului). Foaia trebuie să
 * fie mai deschisă decât ce e în jurul ei (hârtia pe o masă).
 */
export function gasesteFoaia(img: ImagineRGBA): Colturi | null {
  const { latime: W, inaltime: H, date: d } = img;
  if (W < 8 || H < 8) return null;
  // Imaginea redusă: media blocurilor s × s; transparența (ca la cerneală: 1 % din pixeli sub alfa 128) oprește căutarea.
  const s = Math.max(1, Math.round(Math.sqrt((W * H) / PIXELI_CAUTARE))), w = Math.floor(W / s), h = Math.floor(H / s);
  if (w < 8 || h < 8) return null;
  const l = new Float32Array(w * h), hist = new Float64Array(256);
  let transparenti = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t = 0;
      for (let j = 0; j < s; j++) {
        let i = 4 * ((y * s + j) * W + x * s);
        for (let k = 0; k < s; k++, i += 4) {
          t += lum709(d, i);
          if ((d[i + 3] ?? 0) < 128) transparenti++;
        }
      }
      const v = t / (s * s);
      l[y * w + x] = v;
      const b = Math.round(v * 255);
      hist[b] = (hist[b] ?? 0) + 1;
    }
  }
  if (transparenti >= 0.01 * w * h * s * s) return null;
  // Pragul Otsu (la mijlocul mediilor celor două clase), apoi componenta deschisă cea mai mare.
  const T = pragAutomat(l, hist);
  const et = new Int32Array(w * h).fill(-1), coada = new Int32Array(w * h);
  let cea = -1, arieMare = 0;
  for (let p0 = 0, n = 0; p0 < w * h; p0++) {
    if (et[p0] !== -1 || (l[p0] ?? 0) <= T) continue;
    let a = 0, b = 0;
    coada[b++] = p0; et[p0] = n;
    while (a < b) {
      const p = coada[a++] ?? 0, x = p % w;
      if (x > 0 && et[p - 1] === -1 && (l[p - 1] ?? 0) > T) { et[p - 1] = n; coada[b++] = p - 1; }
      if (x + 1 < w && et[p + 1] === -1 && (l[p + 1] ?? 0) > T) { et[p + 1] = n; coada[b++] = p + 1; }
      if (p >= w && et[p - w] === -1 && (l[p - w] ?? 0) > T) { et[p - w] = n; coada[b++] = p - w; }
      if (p + w < w * h && et[p + w] === -1 && (l[p + w] ?? 0) > T) { et[p + w] = n; coada[b++] = p + w; }
    }
    if (b > arieMare) { arieMare = b; cea = n; }
    n++;
  }
  if (cea < 0 || arieMare < ARIE_MINIMA * w * h) return null;
  // Punctele de margine ale componentei: cu un vecin în afara ei, sau pe marginea imaginii (centrele pixelilor).
  const pct: Punct[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (et[p] !== cea) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || et[p - 1] !== cea || et[p + 1] !== cea || et[p - w] !== cea || et[p + w] !== cea) {
        pct.push([x + 0.5, y + 0.5]);
      }
    }
  }
  const inv = invelitoare(pct);
  if (inv.length < 4) return null;
  // Învelitoarea pe marginea imaginii (laturile ei de-a lungul uneia din cele patru margini): un scan, o foaie tăiată.
  let perimetru = 0, peMargine = 0;
  for (let i = 0; i < inv.length; i++) {
    const a = inv[i] ?? [0, 0], b = inv[(i + 1) % inv.length] ?? [0, 0], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    perimetru += L;
    if (peMarginea(a, b, w, h)) peMargine += L;
  }
  if (peMargine > PE_MARGINE * perimetru) return null;
  const toata = colturiIesite(redus([...inv]), w, h);
  const q = patrulaterMaxim(toata);
  if (q.length !== 4 || aria(q) < PLINATATE * aria(toata)) return null;
  const grosier = ordoneaza(q);
  // Laturile: dreapta potrivită pe punctele de margine de lângă latură (la cel mult 3 px), fără capete (15 % din fiecare).
  const laturi: Dreapta[] = [];
  for (let i = 0; i < 4; i++) {
    const a = grosier[i] ?? [0, 0], b = grosier[(i + 1) % 4] ?? [0, 0];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const alese = pct.filter((p) => {
      const t = ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / L, dn = Math.abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux);
      return t > 0.15 && t < 0.85 && dn < 3;
    });
    const dr = dreaptaPrin(alese);
    laturi.push(dr ?? { px: a[0], py: a[1], dx: ux, dy: uy });
  }
  const c = colturiDinLaturi(laturi);
  if (!c) return null;
  const mare = c.map(([x, y]) => [x * s, y * s] as const) as unknown as Colturi;
  return rafineaza(img, mare, s);
}

/**
 * Laturile foii, rafinate pe imaginea întreagă: pe 48 de normale de-a lungul fiecărei laturi (15–85 % din ea), trecerea de
 * 50 % dintre hârtie (înăuntru) și masă (în afară), interpolată; dreapta potrivită pe ele (de două ori: a doua fără punctele
 * la peste 1 px de prima). O latură cu prea puține treceri (sub 8) își ține dreapta grosieră; colțuri rafinate mutate cu
 * mai mult decât poate greși găsirea grosieră (3 pixeli ai imaginii reduse, plus 2), la fel: întoarce colțurile grosiere.
 */
function rafineaza(img: ImagineRGBA, c: Colturi, s: number): Colturi {
  const { latime: W, inaltime: H, date: d } = img;
  const lum = (x: number, y: number): number => {
    const fx = Math.min(W - 1.001, Math.max(0, x - 0.5)), fy = Math.min(H - 1.001, Math.max(0, y - 0.5));
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, i = 4 * (y0 * W + x0), j = i + 4 * W;
    return (1 - ty) * ((1 - tx) * lum709(d, i) + tx * lum709(d, i + 4)) + ty * ((1 - tx) * lum709(d, j) + tx * lum709(d, j + 4));
  };
  const R = Math.max(10, 4 * s), pas = 0.25, n = Math.round((2 * R) / pas) + 1, sfert = Math.floor(n / 4);
  const gx = c.reduce((t, p) => t + p[0], 0) / 4, gy = c.reduce((t, p) => t + p[1], 0) / 4;
  const med = (v: Float64Array, a: number, b: number): number => { const t = v.slice(a, b).sort(); return t[(t.length - 1) >> 1] ?? 0; };
  const sir = new Float64Array(n);
  const laturi: Dreapta[] = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i] ?? [0, 0], b = c[(i + 1) % 4] ?? [0, 0], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    let nx = -uy, ny = ux;
    if (nx * ((a[0] + b[0]) / 2 - gx) + ny * ((a[1] + b[1]) / 2 - gy) < 0) { nx = -nx; ny = -ny; }
    const pct: Punct[] = [];
    for (let k = 0; k < 48; k++) {
      // O normală tăiată de cadru citește marginea pozei (eșantioanele se opresc la ea): fără contrast, se sare, iar o
      // trecere găsită acolo pleacă la a doua potrivire.
      const t = 0.15 + (0.7 * k) / 47, px = a[0] + t * (b[0] - a[0]), py = a[1] + t * (b[1] - a[1]);
      for (let j = 0; j < n; j++) sir[j] = lum(px + nx * (j * pas - R), py + ny * (j * pas - R));
      const inauntru = med(sir, 0, sfert), afara = med(sir, n - sfert, n);
      if (Math.abs(inauntru - afara) < 0.1) continue;
      const mij = (inauntru + afara) / 2;
      for (let j = sfert; j < n - sfert - 1; j++) {
        const u = (sir[j] ?? 0) - mij, v = (sir[j + 1] ?? 0) - mij;
        if (u === 0 || u * v < 0) {
          const q = (j + (u === 0 ? 0 : u / (u - v))) * pas - R;
          pct.push([px + nx * q, py + ny * q]);
          break;
        }
      }
    }
    let dr = pct.length >= 8 ? dreaptaPrin(pct) : null;
    if (dr) {
      const D = dr, aproape = pct.filter((p) => Math.abs((p[0] - D.px) * D.dy - (p[1] - D.py) * D.dx) <= 1);
      if (aproape.length >= 8) dr = dreaptaPrin(aproape);
    }
    laturi.push(dr ?? { px: a[0], py: a[1], dx: ux, dy: uy });
  }
  // Un colț din afara pozei e extrapolat: poate greși mai mult, cu cât e mai departe (5 % din cât iese).
  const r = colturiDinLaturi(laturi);
  const iese = (p: Punct): number => Math.max(0, -p[0], -p[1], p[0] - W, p[1] - H);
  if (!r || r.some((p, i) => Math.hypot(p[0] - (c[i]?.[0] ?? 0), p[1] - (c[i]?.[1] ?? 0)) > 3 * s + 2 + 0.05 * iese(c[i] ?? p))) return c;
  return r;
}

// ── Proporțiile, oblicitatea, colțurile implicite ────────────────────────────────────────────────────────────────────

/** Zhang și He pe colțurile date: focala (px, sau null) și raportul lățime / înălțime pentru o focală dată. */
function zhangHe(c: Colturi, W: number, H: number): { readonly focala: number | null; readonly raportCu: (f: number) => number } {
  // m1 stânga-sus, m2 dreapta-sus, m3 stânga-jos, m4 dreapta-jos: dreptunghiul (0, 0), (w, 0), (0, h), (w, h).
  const m = [c[0], c[1], c[3], c[2]].map(([x, y]) => [x, y, 1] as const);
  const [m1, m2, m3, m4] = m as unknown as [readonly number[], readonly number[], readonly number[], readonly number[]];
  const x = (a: readonly number[], b: readonly number[]): number[] => [
    (a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0), (a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0),
    (a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0),
  ];
  const o = (a: readonly number[], b: readonly number[]): number => (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
  const k2 = o(x(m1, m4), m3) / o(x(m2, m4), m3), k3 = o(x(m1, m4), m2) / o(x(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - (m1[i] ?? 0)), n3 = m3.map((v, i) => k3 * v - (m1[i] ?? 0));
  const n2z = n2[2] ?? 0, n3z = n3[2] ?? 0, u0 = W / 2, v0 = H / 2;
  const a2x = (n2[0] ?? 0) - u0 * n2z, a2y = (n2[1] ?? 0) - v0 * n2z, a3x = (n3[0] ?? 0) - u0 * n3z, a3y = (n3[1] ?? 0) - v0 * n3z;
  const f2 = -(a2x * a3x + a2y * a3y) / (n2z * n3z), D = Math.hypot(W, H);
  // O focală în afara oricărui telefon (sub 0,3 sau peste 3 diagonale) vine din laturi aproape paralele: nedeterminată.
  const f = Math.abs(n2z * n3z) > 1e-12 && Number.isFinite(f2) && f2 > 0 ? Math.sqrt(f2) : NaN;
  return {
    focala: f >= 0.3 * D && f <= 3 * D ? f : null,
    raportCu: (ff) => Math.sqrt(((a2x * a2x + a2y * a2y) / (ff * ff) + n2z * n2z) / ((a3x * a3x + a3y * a3y) / (ff * ff) + n3z * n3z)),
  };
}

/** Proporțiile din poză sunt nesigure când intervalul lor e mai lat de atât (max / min − 1). */
export const PROPORTII_NESIGURE = 0.02;

export type ProportiiFoaie = {
  /** Lățimea pe înălțime (lățimea: latura de sus din poză). */
  readonly raport: number;
  /** Focala găsită (px), sau null: nedeterminată (laturile de sus și de jos, ori cele din stânga și din dreapta, paralele). */
  readonly focala: number | null;
  /**
   * Intervalul raportului: colțurile mișcate cu câte 1 px (pe pozele mari, o două-miime din diagonală: greșelile colțurilor
   * cresc cu poza, din lentilă și din hârtia nedreaptă) și, cu focala nedeterminată, focala între 0,5 și 1,5 diagonale.
   */
  readonly min: number; readonly max: number;
  /** Intervalul e mai lat decât `PROPORTII_NESIGURE`: raportul spune că proporțiile sunt nesigure. */
  readonly nesigure: boolean;
};

/**
 * Proporțiile foii din poză, din perspectivă (Zhang și He, 2007): focala din ortogonalitatea laturilor, cu centrul optic în
 * mijlocul imaginii, apoi raportul. Cu focala nedeterminată (o poză înclinată doar înainte, ori din față), raportul ia o
 * focală obișnuită de telefon (0,85 din diagonala pozei) și intervalul arată cât contează ea; din față, deloc.
 */
export function proportiiDinPoza(c: Colturi, W: number, H: number): ProportiiFoaie {
  const D = Math.hypot(W, H), baza = zhangHe(c, W, H);
  let raport = baza.raportCu(baza.focala ?? 0.85 * D);
  if (!(Number.isFinite(raport) && raport > 0)) {
    // Colțuri nepotrivite (degenerate): raportul laturilor celor mai lungi.
    const [a, b, cc, e] = c, L = (p: Punct, q: Punct): number => Math.hypot(q[0] - p[0], q[1] - p[1]);
    raport = Math.max(L(a, b), L(e, cc)) / Math.max(1e-9, Math.max(L(a, e), L(b, cc)));
    return { raport, focala: null, min: raport, max: raport, nesigure: false };
  }
  let min = raport, max = raport;
  const ia = (z: ReturnType<typeof zhangHe>): void => {
    const fs = z.focala !== null ? [z.focala] : [0.5 * D, 0.85 * D, 1.5 * D];
    for (const f of fs) { const r = z.raportCu(f); if (Number.isFinite(r) && r > 0) { min = Math.min(min, r); max = Math.max(max, r); } }
  };
  ia(baza);
  const d = Math.max(1, D / 2000);
  for (let i = 0; i < 4; i++) {
    for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]] as const) {
      const m = c.map((p, k) => (k === i ? [p[0] + dx, p[1] + dy] : p)) as unknown as Colturi;
      ia(zhangHe(m, W, H));
    }
  }
  return { raport, focala: baza.focala, min, max, nesigure: max / min - 1 > PROPORTII_NESIGURE };
}

/** Proporțiile din poză se potrivesc cu formatul (orientat după ele): raportul lui, în interval, cu 3 % de o parte și de alta. */
export function potrivesteFormatul(p: ProportiiFoaie, f: { readonly w: number; readonly h: number }): boolean {
  const o = formatOrientat(f, p.raport), r = o.w / o.h;
  return r >= p.min / 1.03 && r <= p.max * 1.03;
}

/** Formatul întors după proporțiile din poză: culcat dacă foaia e mai lată decât înaltă în poză, altfel în picioare. */
export function formatOrientat(f: { readonly w: number; readonly h: number }, raportPoza: number): { readonly w: number; readonly h: number } {
  return (raportPoza > 1) === (f.w > f.h) || f.w === f.h ? { w: f.w, h: f.h } : { w: f.h, h: f.w };
}

/** Foaia pare oblică: un unghi se abate de la 90° sau o latură de la axe cu peste 2° (ADR 0225: sugestia raportului). */
export function pareOblica(c: Colturi): boolean {
  const g = 180 / Math.PI;
  for (let i = 0; i < 4; i++) {
    const a = c[(i + 3) % 4] ?? [0, 0], b = c[i] ?? [0, 0], e = c[(i + 1) % 4] ?? [0, 0];
    const u = Math.atan2(a[1] - b[1], a[0] - b[0]), v = Math.atan2(e[1] - b[1], e[0] - b[0]);
    let unghi = Math.abs(u - v) * g;
    if (unghi > 180) unghi = 360 - unghi;
    const axa = ((Math.atan2(e[1] - b[1], e[0] - b[0]) * g) % 90 + 90) % 90;
    if (Math.abs(unghi - 90) > OBLIC || Math.min(axa, 90 - axa) > OBLIC) return true;
  }
  return false;
}

// ── Îndreptarea ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Foaia îndreptată: un dreptunghi cu proporțiile `raport` (lățime / înălțime), cu densitatea laturii celei mai lungi din
 * poză (cealaltă latură crește până la raport), sub `maxPixeli` (redusă cu proporțiile păstrate), eșantionată biliniar.
 * Colțurile trebuie să fie bune (`colturiBune`); altfel, null.
 */
export function indreaptaFoaia(img: ImagineRGBA, c: Colturi, raport: number, maxPixeli = Infinity): ImagineRGBA | null {
  if (!colturiBune(c) || !(raport > 0) || img.latime < 2 || img.inaltime < 2) return null;
  const L = (p: Punct, q: Punct): number => Math.hypot(q[0] - p[0], q[1] - p[1]);
  let w = Math.max(L(c[0], c[1]), L(c[3], c[2])), h = Math.max(L(c[0], c[3]), L(c[1], c[2]));
  if (w / h > raport) h = w / raport; else w = h * raport;
  let Wo = Math.max(1, Math.round(w)), Ho = Math.max(1, Math.round(h));
  if (Wo * Ho > maxPixeli) {
    const k = Math.sqrt(maxPixeli / (w * h));
    Wo = Math.max(1, Math.floor(w * k)); Ho = Math.max(1, Math.floor(h * k));
  }
  const M = omografie([[0, 0], [Wo, 0], [Wo, Ho], [0, Ho]], c);
  if (!M) return null;
  const { latime: W, inaltime: H, date: d } = img, o = new Uint8ClampedArray(Wo * Ho * 4);
  const m0 = M[0] ?? 0, m1 = M[1] ?? 0, m2 = M[2] ?? 0, m3 = M[3] ?? 0, m4 = M[4] ?? 0, m5 = M[5] ?? 0, m6 = M[6] ?? 0, m7 = M[7] ?? 0, m8 = M[8] ?? 1;
  const xMax = W - 1.001, yMax = H - 1.001, rand = 4 * W;
  for (let y = 0; y < Ho; y++) {
    const yy = y + 0.5, bx = m1 * yy + m2, by = m4 * yy + m5, bw = m7 * yy + m8;
    let q = y * Wo * 4;
    for (let x = 0; x < Wo; x++, q += 4) {
      const xx = x + 0.5, iw = 1 / (m6 * xx + bw);
      let u = (m0 * xx + bx) * iw - 0.5, v = (m3 * xx + by) * iw - 0.5;
      if (!(u > 0)) u = 0; else if (u > xMax) u = xMax;
      if (!(v > 0)) v = 0; else if (v > yMax) v = yMax;
      const x0 = u | 0, y0 = v | 0, tx = u - x0, ty = v - y0, i = (y0 * W + x0) * 4, j = i + rand;
      const a = (1 - tx) * (1 - ty), b = tx * (1 - ty), e = (1 - tx) * ty, f = tx * ty;
      o[q] = a * (d[i] ?? 0) + b * (d[i + 4] ?? 0) + e * (d[j] ?? 0) + f * (d[j + 4] ?? 0);
      o[q + 1] = a * (d[i + 1] ?? 0) + b * (d[i + 5] ?? 0) + e * (d[j + 1] ?? 0) + f * (d[j + 5] ?? 0);
      o[q + 2] = a * (d[i + 2] ?? 0) + b * (d[i + 6] ?? 0) + e * (d[j + 2] ?? 0) + f * (d[j + 6] ?? 0);
      o[q + 3] = a * (d[i + 3] ?? 0) + b * (d[i + 7] ?? 0) + e * (d[j + 3] ?? 0) + f * (d[j + 7] ?? 0);
    }
  }
  return { latime: Wo, inaltime: Ho, date: o };
}
