/**
 * Părțile late ale unui desen cu linii (ADR 0223): deschiderea morfologică a cernelii cu un disc de rază R0 (jumătate din
 * pragul de lățime). Miezul e cerneala al cărei cerc înscris are cel puțin R0; partea lată, ce e la cel mult R0 de miez.
 * Două transformări ale distanței (Felzenszwalb și Huttenlocher, 2012), liniare în pixeli.
 *
 * Pură, fără importuri din aplicație (regula `trasare-izolat`). Coordonatele, ca la trasare: pixeli, y în jos.
 */

/** Pătratul distanței de la fiecare pixel până la cel mai apropiat pixel cu `m` 0 (pe margini, imaginea e înconjurată de 1). */
export function edt(m: Uint8Array, W: number, H: number): Float64Array {
  const INF = 1e20, n = Math.max(W, H), f = new Float64Array(n), d = new Float64Array(W * H);
  const v = new Int32Array(n), z = new Float64Array(n + 1), r = new Float64Array(n);
  // Anvelopa inferioară a parabolelor (x − q)² + f(q), pe o linie de lungime `len`.
  const linie = (len: number): void => {
    let k = 0;
    v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      const fq = (f[q] ?? 0) + q * q;
      let s = (fq - ((f[v[k] ?? 0] ?? 0) + (v[k] ?? 0) ** 2)) / (2 * q - 2 * (v[k] ?? 0));
      while (s <= (z[k] ?? 0)) { k--; s = (fq - ((f[v[k] ?? 0] ?? 0) + (v[k] ?? 0) ** 2)) / (2 * q - 2 * (v[k] ?? 0)); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while ((z[k + 1] ?? 0) < q) k++;
      r[q] = (q - (v[k] ?? 0)) ** 2 + (f[v[k] ?? 0] ?? 0);
    }
  };
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = m[y * W + x] ? INF : 0;
    linie(H);
    for (let y = 0; y < H; y++) d[y * W + x] = r[y] ?? 0;
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = d[y * W + x] ?? 0;
    linie(W);
    for (let x = 0; x < W; x++) d[y * W + x] = r[x] ?? 0;
  }
  return d;
}

export type PartiLate = {
  /** Câmpul părților late (cerneala, tăiată la marginea lor) și al restului (cerneala fără ele), cu același prag. */
  readonly lata: Float32Array; readonly subtire: Float32Array;
  /** Distanța fiecărui pixel până la miez, în px (departe: Infinity, fără miez). */
  readonly laMiez: Float32Array;
  /** Raza deschiderii (jumătate din prag, plus o jumătate de pixel) și pixelii de cerneală: toți și ai părților late. */
  readonly R0: number; readonly arieCerneala: number; readonly arieLata: number;
};

/**
 * Părțile mai late decât 2·R0 ale cernelii câmpului `f` (pragul T). Un pixel de cerneală are distanța 1 până la fundal pe
 * margine, deci raza cercului înscris în el e distanța − 0,5. Câmpurile se taie lin, cu o rampă de un pixel la marginea
 * părții late, ca trecerile pragului (centrul liniilor, contururile) să rămână sub-pixel.
 */
export function partiLate(f: Float32Array, T: number, W: number, H: number, R0: number): PartiLate {
  const N = W * H;
  const m = new Uint8Array(N);
  let arieCerneala = 0;
  for (let p = 0; p < N; p++) if ((f[p] ?? 0) >= T) { m[p] = 1; arieCerneala++; }
  const d2 = edt(m, W, H);
  const fara = new Uint8Array(N).fill(1);
  let miez = 0;
  for (let p = 0; p < N; p++) if (m[p] && Math.sqrt(d2[p] ?? 0) - 0.5 >= R0) { fara[p] = 0; miez++; }
  const laMiez = new Float32Array(N);
  if (miez === 0) laMiez.fill(Number.POSITIVE_INFINITY);
  else { const dn2 = edt(fara, W, H); for (let p = 0; p < N; p++) laMiez[p] = Math.sqrt(dn2[p] ?? 0); }
  // Deschiderea, cu încă o jumătate de pixel: miezul e pe centrele pixelilor, deci marginea ei putea cădea până la ~0,7 px
  // înăuntrul cernelii (golul unui inel gros, la 0,77 px), iar conturul o urma pe ea, nu marginea cernelii.
  const R = R0 + 0.5;
  const lata = new Float32Array(N), subtire = new Float32Array(N);
  for (let p = 0; p < N; p++) {
    const c = f[p] ?? 0, dn = laMiez[p] ?? 0;
    lata[p] = Math.min(c, Math.max(0, Math.min(1, T + R - dn)));
    subtire[p] = Math.min(c, Math.max(0, Math.min(1, T + dn - R)));
  }
  if (miez > 0) alipesteResturile(f, T, W, H, R, laMiez, lata, subtire);
  let arieLata = 0;
  for (let p = 0; p < N; p++) if ((f[p] ?? 0) >= T && (lata[p] ?? 0) >= T) arieLata++;
  return { lata, subtire, laMiez, R0: R, arieCerneala, arieLata };
}

/**
 * Resturile: o bucată rămasă din cerneală (8-conexă) care atinge o parte lată și stă toată la cel mult 2·R0 + 1 de miezul ei
 * e un colț rotunjit de disc (la un colț de 60°, vârful e la 2·R0 de miez) sau fâșia de un pixel de pe margine; ține de
 * partea lată. Altfel, liniile ei mediane ar fi zeci de cioturi în jurul conturului (logoul owner-ului, blocurile frezei).
 * O liniuță separată, care nu atinge partea lată, rămâne linie.
 */
function alipesteResturile(f: Float32Array, T: number, W: number, H: number, R0: number, laMiez: Float32Array, lata: Float32Array, subtire: Float32Array): void {
  const N = W * H, vazut = new Uint8Array(N), coada: number[] = [];
  for (let p0 = 0; p0 < N; p0++) {
    if (vazut[p0] || (subtire[p0] ?? 0) < T) continue;
    coada.length = 0;
    coada.push(p0);
    vazut[p0] = 1;
    let atinge = false, departe = false;
    for (let i = 0; i < coada.length; i++) {
      const p = coada[i] ?? 0, x = p % W, y = (p - x) / W, dn = laMiez[p] ?? 0;
      if (dn <= R0 + 1) atinge = true;
      if (dn > 2 * R0 + 1) departe = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, q = yy * W + xx;
          if ((dx || dy) && xx >= 0 && yy >= 0 && xx < W && yy < H && !vazut[q] && (subtire[q] ?? 0) >= T) { vazut[q] = 1; coada.push(q); }
        }
      }
    }
    if (!atinge || departe) continue;
    // Bucata, cu marginea ei (pixelii vecini sub prag, unde e rampa cernelii), trece la partea lată.
    for (const p of coada) {
      const x = p % W, y = (p - x) / W;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, q = yy * W + xx;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          if ((dx === 0 && dy === 0) || (subtire[q] ?? 0) < T) { lata[q] = Math.max(lata[q] ?? 0, f[q] ?? 0); subtire[q] = 0; }
        }
      }
    }
  }
}
