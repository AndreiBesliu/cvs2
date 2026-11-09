import type { ImagineRGBA } from '../../src/trasare/trasare.ts';

/**
 * Pozele sintetice ale probelor luminii (ADR 0224): un desen cu linii pe hârtie, cu cerneala știută pe pixel, luminat inegal,
 * cu zgomot; la cerere o pată plină, o umbră tare, masa în jurul foii (foaia ușor rotită) sau creta pe tablă (cerneala
 * deschisă pe fondul închis). Acoperirea unei linii de grosime w la distanța d de axa ei e clamp(w/2 − d + 0,5), deci
 * cerneala adevărată (acoperirea de cel puțin 50 %) e d ≤ w/2.
 */
export type Poza = ImagineRGBA & {
  /** Cerneala adevărată, pe foaie (1), și foaia (1; restul e masa). */
  readonly adevar: Uint8Array; readonly hartie: Uint8Array;
  /** Luminozitatea fiecărui pixel, 0–1 (cea scrisă și în RGBA), și acoperirea lui cu cerneală (0 pe masă). */
  readonly l: Float32Array; readonly acoperire: Float32Array;
};

export type CumPoza = {
  readonly W: number; readonly H: number;
  /** Lumina în (x, y), ca factor; lipsă: 0,97 peste tot. */
  readonly lumina?: (x: number, y: number) => number;
  readonly pata?: boolean; readonly umbra?: boolean; readonly masa?: boolean; readonly creta?: boolean;
  /** Un desen rar (un zigzag larg, un cerc, o linie: cerneala nu umple nicio fereastră), în locul celui des. */
  readonly rar?: boolean;
  /** Un desen dat (liniile lui), în locul celui des sau rar. */
  readonly desen?: readonly Linie[];
  /** Abaterea zgomotului (aproape gaussian); lipsă: 0,025. */
  readonly zgomot?: number;
  readonly samanta?: number;
};

export type Linie = { readonly P: ReadonlyArray<readonly [number, number]>; readonly w: number };

/** Desenul, pe o foaie de W × H: patru rânduri de zigzaguri (3–6 px), un cerc (4 px), o spirală (3 px). */
export function desenPoza(W: number, H: number, masa = false): Linie[] {
  // Pe masă, desenul se strânge spre mijloc, ca să nu atingă marginea foii rotite.
  const sx = (masa ? 0.82 : 0.95) * W / 1200, sy = (masa ? 0.82 : 0.95) * H / 800;
  const ox = masa ? 0.09 * W : 0.02 * W, oy = masa ? 0.09 * H : 0.02 * H;
  const L: Linie[] = [];
  for (let rand = 0; rand < 4; rand++) {
    const P: Array<[number, number]> = [];
    for (let t = 0; t <= 140; t++) P.push([ox + (40 + t * 6) * sx, oy + (60 + rand * 120) * sy + 22 * sy * Math.sin(t * 0.55) + 10 * sy * Math.sin(t * 0.13 + rand)]);
    L.push({ P, w: 3 + rand });
  }
  L.push({ P: Array.from({ length: 121 }, (_, k) => [ox + 980 * sx + 90 * sx * Math.cos((2 * Math.PI * k) / 120), oy + 200 * sy + 90 * sy * Math.sin((2 * Math.PI * k) / 120)] as [number, number]), w: 4 });
  L.push({ P: Array.from({ length: 300 }, (_, k) => { const u = (k / 299) * 6 * Math.PI, r = 8 + u * 9; return [ox + 980 * sx + r * sx * Math.cos(u), oy + 520 * sy + r * sy * Math.sin(u)] as [number, number]; }), w: 3 });
  return L;
}

/** Desenul rar, ca în e2e: un zigzag cu dinții la 25 px, un cerc (raza 55) și o linie, toate de 6 px, pe o foaie de 600 × 400. */
export function desenRar(W: number, H: number): Linie[] {
  const sx = W / 600, sy = H / 400;
  return [
    { P: Array.from({ length: 9 }, (_, i) => [(100 + 25 * i) * sx, (100 + (i % 2 === 0 ? -25 : 25)) * sy] as [number, number]), w: 6 },
    { P: Array.from({ length: 121 }, (_, k) => [(450 + 55 * Math.cos((2 * Math.PI * k) / 120)) * sx, (200 + 55 * Math.sin((2 * Math.PI * k) / 120)) * sy] as [number, number]), w: 6 },
    { P: [[100 * sx, 300 * sy], [350 * sx, 320 * sy]], w: 6 },
  ];
}

/** Acoperirea cu cerneală a fiecărui pixel (centrul lui la x + 0,5, y + 0,5), de la linii și dreptunghiuri pline. */
export function acoperirePoza(W: number, H: number, linii: readonly Linie[], pline: ReadonlyArray<readonly [number, number, number, number]> = []): Float32Array {
  const a = new Float32Array(W * H);
  for (const { P, w } of linii) {
    for (let i = 0; i + 1 < P.length; i++) {
      const [ax, ay] = P[i] ?? [0, 0], [bx, by] = P[i + 1] ?? [0, 0];
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - w)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + w));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - w)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + w));
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
          const c = Math.max(0, Math.min(1, w / 2 - Math.hypot(ax + t * dx - px, ay + t * dy - py) + 0.5));
          const p = y * W + x;
          if (c > (a[p] ?? 0)) a[p] = c;
        }
      }
    }
  }
  for (const [x0, y0, x1, y1] of pline) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) {
        const c = Math.max(0, Math.min(1, x + 1 - x0, x1 - x)) * Math.max(0, Math.min(1, y + 1 - y0, y1 - y));
        const p = y * W + x;
        if (c > (a[p] ?? 0)) a[p] = c;
      }
    }
  }
  return a;
}

/** Lumina care scade dintr-un colț în cel opus (de la 87,5 % la 17,5 %: de cinci ori), cu vignetarea, ca în prototip. */
export const luminaLaterala = (W: number, H: number) => (x: number, y: number): number =>
  1 - 0.45 * (x / W) - 0.25 * (y / H) - 0.25 * (((x - W / 2) / W) ** 2 + ((y - H / 2) / H) ** 2);

export function poza(o: CumPoza): Poza {
  const { W, H } = o;
  let s = o.samanta ?? 3;
  const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  // Ca în prototip: suma a șase uniforme, centrată (abaterea ~0,71), înmulțită cu `zgomot`.
  const gauss = (): number => { let t = 0; for (let i = 0; i < 6; i++) t += r(); return t - 3; };
  const pline: Array<readonly [number, number, number, number]> = o.pata ? [[0.125 * W, 0.65 * H, 0.39 * W, 0.875 * H]] : [];
  const ac = acoperirePoza(W, H, o.desen ?? (o.rar ? desenRar(W, H) : desenPoza(W, H, o.masa)), pline);
  const lumina = o.lumina ?? ((): number => 0.97), zg = o.zgomot ?? 0.025;
  const date = new Uint8ClampedArray(W * H * 4), adevar = new Uint8Array(W * H), hartie = new Uint8Array(W * H).fill(1), l = new Float32Array(W * H);
  const acoperire = new Float32Array(W * H);
  const [fond, cer] = o.creta ? [0.15, 0.85] : [0.93, 0.12];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (o.masa) {
        const u = (x - W / 2) * Math.cos(0.04) + (y - H / 2) * Math.sin(0.04), v = -(x - W / 2) * Math.sin(0.04) + (y - H / 2) * Math.cos(0.04);
        if (Math.abs(u) > W / 2 - 0.025 * W || Math.abs(v) > H / 2 - 0.03 * H) hartie[p] = 0;
      }
      let lum = lumina(x, y);
      if (o.umbra && x / W + 0.6 * (y / W) > 700 / 1200 && x / W + 0.6 * (y / W) < 980 / 1200) lum *= 0.62;
      const c = hartie[p] ? ac[p] ?? 0 : 0;
      adevar[p] = hartie[p] && c >= 0.5 ? 1 : 0;
      acoperire[p] = c;
      const baza = hartie[p] ? fond * (1 - c) + cer * c : 0.18;
      const v = Math.max(0, Math.min(1, lum * baza + zg * gauss()));
      l[p] = v;
      const b = Math.round(255 * v);
      date[4 * p] = b; date[4 * p + 1] = b; date[4 * p + 2] = b; date[4 * p + 3] = 255;
    }
  }
  return { latime: W, inaltime: H, date, adevar, hartie, l, acoperire };
}

/**
 * Cerneala găsită (câmpul peste prag) față de cea adevărată: în plus și lipsă, ca parte din cerneala adevărată. O greșeală e
 * un pixel clar de partea cealaltă: în plus, unul cu acoperirea sub 0,4 (sau de pe masă); lipsă, unul cu acoperirea de cel
 * puțin 0,6. Pe marginea unei trăsături subțiri, pragul automat (mijlocul mediilor claselor, ADR 0220 §3) cade la acoperirea
 * ~0,47, nu 0,5 (pixelii parțiali trag media cernelii spre hârtie): un pixel cu 0,47–0,5 nu e o greșeală a luminii.
 */
export function erori(p: Poza, f: Float32Array, T: number): { readonly plus: number; readonly lipsa: number } {
  let plus = 0, lipsa = 0, ad = 0;
  for (let i = 0; i < p.adevar.length; i++) {
    const e = (f[i] ?? 0) >= T, c = p.acoperire[i] ?? 0;
    if (p.adevar[i] === 1) ad++;
    if (e && c < 0.4) plus++;
    if (!e && c >= 0.6) lipsa++;
  }
  return { plus: plus / Math.max(1, ad), lipsa: lipsa / Math.max(1, ad) };
}
