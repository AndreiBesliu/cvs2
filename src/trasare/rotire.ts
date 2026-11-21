/**
 * Îndreptarea scanărilor (ADR 0271, felia 25.4↑c): unghiul cu care e rotit desenul într-o scanare și rotirea lui înapoi.
 *
 * - **Unghiul:** din cerneală (întunecimea, cu pragul Otsu și polaritatea din marginea imaginii), pe imaginea redusă:
 *   pixelii de cerneală, rotiți cu unghiul încercat, se proiectează pe rânduri și pe coloane, iar scorul e suma pătratelor
 *   diferențelor dintre rânduri (și coloane) vecine (Postl, 1988; ca Leptonica, aici pe ambele axe): e cel mai mare când
 *   liniile, rândurile de text și marginile formelor stau pe axe. Întâi un baleiaj grosier pe ±`UNGHI_CAUTAT` (coșuri
 *   late, o parte din puncte), apoi unul fin în jurul celui mai bun (coșuri de un pixel, toate punctele), apoi parabola
 *   prin cele trei scoruri de lângă maxim. Nesigur (null): prea puțină cerneală, scorul prea plat (un cerc, o schiță:
 *   maximul sub `INCREDERE_MINIMA` din cel mai mic) sau maximul la capătul intervalului (unghiul e dincolo de el).
 * - **Rotirea:** pe o pânză mărită cât să încapă toată imaginea, cu eșantionarea biliniară; în afara imaginii, culoarea
 *   din jurul ei (mediana marginii, pe fiecare canal); cu „Ignoră ce atinge marginea”, marginea imaginii se prelungește în
 *   afară, ca ce o atinge s-o atingă și pe cea nouă.
 *
 * Unghiul e în grade, pozitiv când desenul e rotit în sens invers acelor de ceasornic pe ecran (o linie orizontală urcă
 * spre dreapta); îndreptarea îl rotește înapoi. Coordonatele: x spre dreapta, y în jos, pixelul (x, y) acoperă
 * [x, x + 1) × [y, y + 1).
 */
import { pragAutomat, type ImagineRGBA } from './trasare.ts';

/** Cel mai mare unghi găsit singur (grade): o scanare strâmbă pusă cu mâna pe geam; dincolo, nesigur. */
export const UNGHI_CAUTAT = 10;
/** Cel mai mare unghi scris de mână (grade): dincolo e o întoarcere cu 90°, nu o îndreptare. */
export const UNGHI_MAXIM = 45;
/** De la atât (grade) raportul sugerează îndreptarea: 0,1° fac 0,35 mm pe 200 mm. */
export const UNGHI_SUGESTIE = 0.1;
/** Sub atât (grade), rotirea nu se face: ar doar estompa imaginea. */
const UNGHI_NEGLIJABIL = 0.005;
/** Imaginea redusă pentru unghi: cel mult atâția pixeli. */
const PIXELI_UNGHI = 2_000_000;
/** Pixelii de cerneală folosiți: cel mult atâția la baleiajul fin și atâția la cel grosier (luați la pas egal). */
const PUNCTE_FIN = 400_000;
const PUNCTE_GROSIER = 20_000;
/** Lățimea coșurilor baleiajului grosier, în pixeli ai imaginii reduse. */
const COS_GROSIER = 4;
/** Cerneala minimă (pixeli ai imaginii reduse) pentru un unghi. */
const CERNEALA_MINIMA = 64;
/**
 * Încrederea: scorul cel mai bun trebuie să fie de cel puțin atâtea ori cel mai bun scor aflat la cel puțin `DEPARTE` grade
 * de el (prototipul: desenele tehnice 5,7–7,3, textul 1,8–1,9, un logo cu un rând de text 1,4; o schiță, cercurile,
 * zgomotul 1,0–1,15).
 */
export const INCREDERE_MINIMA = 1.25;
const DEPARTE = 1;

/** Unghiul găsit (grade), sau null: nesigur; încrederea (vezi `INCREDERE_MINIMA`). */
export type UnghiGasit = { readonly unghi: number | null; readonly incredere: number };

/** Pixelii de cerneală ai imaginii reduse, față de centrul ei, și latura ei mai lungă. */
type Cerneala = { readonly x: Float32Array; readonly y: Float32Array; readonly n: number; readonly latura: number };

/**
 * Cerneala imaginii reduse prin media blocurilor s × s (s întreg): întunecimea pe alb, pragul Otsu, polaritatea din
 * margine (ce o domină e hârtia). Null: o imagine cu transparență (1 % din pixeli sub alfa 128) sau prea mică.
 */
function cerneala(img: ImagineRGBA): Cerneala | null {
  const { latime: W, inaltime: H, date: d } = img;
  const s = Math.max(1, Math.ceil(Math.sqrt((W * H) / PIXELI_UNGHI))), w = Math.floor(W / s), h = Math.floor(H / s);
  if (w < 8 || h < 8) return null;
  // Luminozitatea (pe alb, după alfa) adunată pe blocuri, rând cu rând din imagine (în ordinea memoriei).
  const f = new Float32Array(w * h), hist = new Float64Array(256), k = 1 / (255 * s * s);
  let transparenti = 0;
  for (let y = 0; y < h * s; y++) {
    const o = Math.floor(y / s) * w;
    for (let x = 0, i = 4 * y * W, bx = 0, cx = 0, t = 0; x < w * s; x++, i += 4) {
      const a = d[i + 3] ?? 0;
      if (a === 255) t += 0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0);
      else {
        const af = a / 255, alb = 255 - a;
        t += 0.2126 * ((d[i] ?? 0) * af + alb) + 0.7152 * ((d[i + 1] ?? 0) * af + alb) + 0.0722 * ((d[i + 2] ?? 0) * af + alb);
        if (a < 128) transparenti++;
      }
      if (++cx === s) { f[o + bx] = (f[o + bx] ?? 0) + t; t = 0; cx = 0; bx++; }
    }
  }
  for (let p = 0; p < w * h; p++) {
    const v = 1 - (f[p] ?? 0) * k;
    f[p] = v;
    const b = Math.round(v * 255);
    hist[b] = (hist[b] ?? 0) + 1;
  }
  if (transparenti >= 0.01 * W * H) return null;
  const T = pragAutomat(f, hist);
  let margine = 0;
  for (let x = 0; x < w; x++) margine += (f[x] ?? 0) + (f[(h - 1) * w + x] ?? 0);
  for (let y = 0; y < h; y++) margine += (f[y * w] ?? 0) + (f[y * w + w - 1] ?? 0);
  const intunecata = margine / (2 * (w + h)) > 0.5;
  let n = 0;
  for (let p = 0; p < w * h; p++) if (((f[p] ?? 0) >= T) !== intunecata) n++;
  if (n < CERNEALA_MINIMA) return null;
  const m = Math.min(n, PUNCTE_FIN), pas = n / m, xs = new Float32Array(m), ys = new Float32Array(m);
  for (let p = 0, i = 0, k2 = 0; p < w * h && k2 < m; p++) {
    if (((f[p] ?? 0) >= T) === intunecata) continue;
    // Al i-lea pixel de cerneală e luat dacă ajunge la următorul prag al pasului (la pas egal, în ordinea rândurilor).
    // Fiecare punct, mișcat cu o fracțiune de pixel (secvența R2, deterministă): pe axe, centrele pixelilor ar cădea toate
    // la fel între coșuri, iar unghiul 0 ar câștiga din grila pixelilor, nu din desen.
    if (i >= Math.floor(k2 * pas)) {
      xs[k2] = (p % w) + ((k2 * 0.7548776662466927) % 1) - w / 2;
      ys[k2] = Math.floor(p / w) + ((k2 * 0.5698402909980532) % 1) - h / 2;
      k2++;
    }
    i++;
  }
  return { x: xs, y: ys, n: m, latura: Math.max(w, h) };
}

/**
 * Scorul unghiului a (radiani): pixelii rotiți cu −a (desenul îndreptat dacă e rotit cu a), împărțiți liniar între două
 * coșuri de lățime `cos` pe rânduri și pe coloane; suma pătratelor diferențelor dintre coșurile vecine. Folosește din
 * puncte doar primele n, sau, cu `pas` > 1, unul din `pas`.
 */
function scor(c: Cerneala, a: number, cos: number, pas: number, R: Float64Array, C: Float64Array): number {
  R.fill(0); C.fill(0);
  const sn = Math.sin(a) / cos, cs = Math.cos(a) / cos, o = R.length / 2, xs = c.x, ys = c.y;
  for (let i = 0; i < c.n; i += pas) {
    const x = xs[i] ?? 0, y = ys[i] ?? 0;
    const r = x * sn + y * cs + o, q = x * cs - y * sn + o;
    const r0 = Math.floor(r), q0 = Math.floor(q), fr = r - r0, fq = q - q0;
    R[r0] = (R[r0] ?? 0) + 1 - fr; R[r0 + 1] = (R[r0 + 1] ?? 0) + fr;
    C[q0] = (C[q0] ?? 0) + 1 - fq; C[q0 + 1] = (C[q0 + 1] ?? 0) + fq;
  }
  let s = 0;
  for (let i = 1; i < R.length; i++) {
    const dr = (R[i] ?? 0) - (R[i - 1] ?? 0), dc = (C[i] ?? 0) - (C[i - 1] ?? 0);
    s += dr * dr + dc * dc;
  }
  return s;
}

/**
 * Unghiul cu care e rotit desenul în imagine (grade, ±`UNGHI_CAUTAT`), sau null: nesigur (vezi capul fișierului). Pe
 * imaginile cu transparență, null (o imagine decupată n-are hârtie).
 */
export function gasesteUnghiul(img: ImagineRGBA): UnghiGasit {
  const c = cerneala(img);
  if (!c) return { unghi: null, incredere: 0 };
  const rad = Math.PI / 180, raza = Math.hypot(c.latura, c.latura) / 2 + 4;
  // Grosier: coșuri de COS_GROSIER px, pasul unghiului cât o jumătate de coș pe latura cea mai lungă.
  const pasG = Math.max(1, Math.round(c.n / PUNCTE_GROSIER));
  const RG = new Float64Array(2 * Math.ceil(raza / COS_GROSIER) + 4), CG = new Float64Array(RG.length);
  const dG = Math.min(0.5, Math.max(0.05, (0.5 * COS_GROSIER) / c.latura / rad));
  const nG = Math.ceil(UNGHI_CAUTAT / dG);
  let iBun = 0, sBun = -1;
  const sG = new Float64Array(2 * nG + 1);
  for (let i = -nG; i <= nG; i++) {
    const v = scor(c, i * dG * rad, COS_GROSIER, pasG, RG, CG);
    sG[i + nG] = v;
    if (v > sBun) { sBun = v; iBun = i; }
  }
  // Încrederea: cât iese maximul deasupra celui mai bun scor aflat la cel puțin `DEPARTE` grade de el (un vârf ascuțit).
  let sDeparte = 0;
  for (let i = -nG; i <= nG; i++) if (Math.abs(i - iBun) * dG >= DEPARTE) sDeparte = Math.max(sDeparte, sG[i + nG] ?? 0);
  const incredere = sDeparte > 0 ? sBun / sDeparte : 0;
  if (Math.abs(iBun) === nG || !(incredere >= INCREDERE_MINIMA)) return { unghi: null, incredere };
  // Fin: coșuri de un pixel, toate punctele, pe ±1,5 pași grosieri, cu pasul cât un sfert de pixel pe latura cea mai lungă.
  const RF = new Float64Array(2 * Math.ceil(raza) + 4), CF = new Float64Array(RF.length);
  const dF = (0.25 / c.latura) / rad, nF = Math.ceil((1.5 * dG) / dF), a0 = iBun * dG;
  let jBun = 0, fBun = -1;
  const sF = new Float64Array(2 * nF + 1);
  for (let j = -nF; j <= nF; j++) {
    const v = scor(c, (a0 + j * dF) * rad, 1, 1, RF, CF);
    sF[j + nF] = v;
    if (v > fBun) { fBun = v; jBun = j; }
  }
  // Parabola prin maxim și vecinii lui (la capete, maximul însuși).
  let u = a0 + jBun * dF;
  if (Math.abs(jBun) < nF) {
    const s0 = sF[jBun + nF - 1] ?? 0, s1 = sF[jBun + nF] ?? 0, s2 = sF[jBun + nF + 1] ?? 0, num = s0 - 2 * s1 + s2;
    if (num < 0) u += (dF * 0.5 * (s0 - s2)) / num;
  }
  return { unghi: Math.abs(u) > UNGHI_CAUTAT ? null : u, incredere };
}

/** Mediana fiecărui canal pe marginea imaginii (rândul de sus și de jos, coloanele din stânga și din dreapta). */
function culoareaMarginii(img: ImagineRGBA): [number, number, number, number] {
  const { latime: W, inaltime: H, date: d } = img;
  // Histogramele celor patru canale, una după alta (canalul k de la 256 k).
  const h = new Uint32Array(1024);
  let n = 0;
  const ia = (x: number, y: number): void => {
    const i = 4 * (y * W + x);
    for (let k = 0; k < 4; k++) { const v = 256 * k + (d[i + k] ?? 0); h[v] = (h[v] ?? 0) + 1; }
    n++;
  };
  for (let x = 0; x < W; x++) { ia(x, 0); if (H > 1) ia(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { ia(0, y); if (W > 1) ia(W - 1, y); }
  const med = (k: number): number => {
    for (let v = 0, s = 0; v < 256; v++) { s += h[256 * k + v] ?? 0; if (2 * s >= n) return v; }
    return 255;
  };
  return [med(0), med(1), med(2), med(3)];
}

/** Mărimea pânzei imaginii W × H rotite cu `unghi` grade (cât să încapă toată), înaintea reducerii. */
export function panzaRotita(W: number, H: number, unghi: number): { readonly latime: number; readonly inaltime: number } {
  const a = (Math.abs(unghi) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { latime: Math.max(1, Math.round(W * c + H * s)), inaltime: Math.max(1, Math.round(W * s + H * c)) };
}

/**
 * Imaginea îndreptată: desenul rotit cu −`unghi` grade în jurul centrului, pe pânza mărită cât să încapă toată imaginea
 * (`panzaRotita`); peste `maxPixeli`, redusă cu factorul k (< 1; altfel 1), cu proporțiile păstrate. Eșantionarea
 * biliniară; în afara imaginii, culoarea marginii ei, sau, cu `prelungeste`, marginea prelungită.
 */
export function rotesteImaginea(img: ImagineRGBA, unghi: number, o: { readonly prelungeste: boolean; readonly maxPixeli: number }): { img: ImagineRGBA; k: number } {
  const { latime: W, inaltime: H, date: d } = img;
  if (Math.abs(unghi) < UNGHI_NEGLIJABIL || W < 2 || H < 2) return { img, k: 1 };
  const p = panzaRotita(W, H, unghi);
  let Wo = p.latime, Ho = p.inaltime, k = 1;
  if (Wo * Ho > o.maxPixeli) {
    k = Math.sqrt(o.maxPixeli / (Wo * Ho));
    Wo = Math.max(1, Math.floor(Wo * k)); Ho = Math.max(1, Math.floor(Ho * k));
  }
  const a = (unghi * Math.PI) / 180, c = Math.cos(a) / k, s = Math.sin(a) / k;
  const fond = culoareaMarginii(img), out = new Uint8ClampedArray(Wo * Ho * 4), rand = 4 * W;
  const f0 = fond[0], f1 = fond[1], f2 = fond[2], f3 = fond[3];
  for (let Y = 0; Y < Ho; Y++) {
    // Pixelul (X, Y) al pânzei vine din punctul (u, v) al imaginii (centrele pixelilor la +0,5).
    const qy = Y + 0.5 - Ho / 2, qx0 = 0.5 - Wo / 2;
    let u = W / 2 + qx0 * c + qy * s - 0.5, v = H / 2 - qx0 * s + qy * c - 0.5;
    for (let X = 0, q = 4 * Y * Wo; X < Wo; X++, q += 4, u += c, v -= s) {
      const x0 = Math.floor(u), y0 = Math.floor(v), tx = u - x0, ty = v - y0;
      const wa = (1 - tx) * (1 - ty), wb = tx * (1 - ty), wc = (1 - tx) * ty, wd = tx * ty;
      if (x0 >= 0 && y0 >= 0 && x0 + 1 < W && y0 + 1 < H) {
        const i = 4 * (y0 * W + x0), j = i + rand;
        out[q] = wa * (d[i] ?? 0) + wb * (d[i + 4] ?? 0) + wc * (d[j] ?? 0) + wd * (d[j + 4] ?? 0);
        out[q + 1] = wa * (d[i + 1] ?? 0) + wb * (d[i + 5] ?? 0) + wc * (d[j + 1] ?? 0) + wd * (d[j + 5] ?? 0);
        out[q + 2] = wa * (d[i + 2] ?? 0) + wb * (d[i + 6] ?? 0) + wc * (d[j + 2] ?? 0) + wd * (d[j + 6] ?? 0);
        out[q + 3] = wa * (d[i + 3] ?? 0) + wb * (d[i + 7] ?? 0) + wc * (d[j + 3] ?? 0) + wd * (d[j + 7] ?? 0);
        continue;
      }
      // Lângă margine sau în afară: fiecare din cele patru eșantioane, din imagine, din marginea prelungită sau fondul.
      let r = 0, g = 0, b = 0, al = 0;
      for (let t = 0; t < 4; t++) {
        let xx = x0 + (t & 1), yy = y0 + (t >> 1);
        const w = t === 0 ? wa : t === 1 ? wb : t === 2 ? wc : wd;
        if (w === 0) continue;
        const inauntru = xx >= 0 && yy >= 0 && xx < W && yy < H;
        if (!inauntru && !o.prelungeste) { r += w * f0; g += w * f1; b += w * f2; al += w * f3; continue; }
        xx = Math.min(W - 1, Math.max(0, xx)); yy = Math.min(H - 1, Math.max(0, yy));
        const i = 4 * (yy * W + xx);
        r += w * (d[i] ?? 0); g += w * (d[i + 1] ?? 0); b += w * (d[i + 2] ?? 0); al += w * (d[i + 3] ?? 0);
      }
      out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = al;
    }
  }
  return { img: { latime: Wo, inaltime: Ho, date: out }, k };
}
