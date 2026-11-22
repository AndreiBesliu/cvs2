import type { ImagineRGBA } from '../../src/trasare/trasare.ts';

/**
 * Paginile sintetice ale probelor îndreptării (ADR 0271, generatorul prototipului `.tmp/gen-0271.ts`): forme cu acoperirea
 * calculată exact pe fiecare pixel (distanța semnată a centrului pixelului la formă, plus o jumătate de pixel), puse pe o
 * pagină și rotite cu un unghi știut în jurul centrului imaginii. Unghiul e în convenția ADR-ului: pozitiv când desenul e
 * rotit în sens invers acelor de ceasornic pe ecran (o linie orizontală urcă spre dreapta).
 */
export type Forma =
  | { readonly t: 'seg'; readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number; readonly hw: number }
  | { readonly t: 'cutie'; readonly cx: number; readonly cy: number; readonly hw: number; readonly hh: number }
  | { readonly t: 'cerc'; readonly cx: number; readonly cy: number; readonly r: number; readonly hw: number }
  | { readonly t: 'disc'; readonly cx: number; readonly cy: number; readonly r: number };

export type FelPagina = 'desen' | 'text' | 'schita' | 'cercuri' | 'zgomot';

/** Numere pseudo-aleatoare (generatorul congruențial al prototipului), cu sămânța dată: aceleași la fiecare rulare. */
function aleator(samanta: number): () => number {
  let s = samanta;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** Rânduri de „litere” (cutii cu urcări și coborâri) într-un dreptunghi al paginii, cu înălțimea literei mici `xh`. */
function randuri(f: Forma[], r: () => number, x0: number, y0: number, w: number, h: number, xh: number): void {
  for (let y = y0 + xh; y < y0 + h; y += 2.4 * xh) {
    let x = x0;
    const capat = x0 + w * (0.7 + 0.3 * r());
    while (x < capat) {
      const n = 2 + Math.floor(r() * 7);
      for (let i = 0; i < n && x < capat; i++) {
        const lw = xh * (0.45 + 0.4 * r()), sus = r() < 0.25 ? 0.6 * xh : 0, jos = r() < 0.1 ? 0.4 * xh : 0;
        f.push({ t: 'cutie', cx: x + lw / 2, cy: y - (xh + sus - jos) / 2, hw: lw / 2, hh: (xh + sus + jos) / 2 });
        x += lw + 0.15 * xh;
      }
      x += 0.6 * xh;
    }
  }
}

/**
 * Formele unei pagini W × H: un desen tehnic (chenarul, indicatorul cu text, patru dreptunghiuri cu câte un cerc și cota
 * lor, o linie oblică), o pagină de text, o schiță cu mâna liberă (30 de trăsături care se îndoaie la întâmplare), cercuri
 * și discuri, zgomot (3 000 de puncte).
 */
export function pagina(fel: FelPagina, W: number, H: number): Forma[] {
  const r = aleator(7), f: Forma[] = [], m = 0.06 * W, g = Math.max(1, W / 800);
  const seg = (ax: number, ay: number, bx: number, by: number, hw = g): void => { f.push({ t: 'seg', ax, ay, bx, by, hw }); };
  if (fel === 'desen') {
    seg(m, m, W - m, m, 1.5 * g); seg(W - m, m, W - m, H - m, 1.5 * g); seg(W - m, H - m, m, H - m, 1.5 * g); seg(m, H - m, m, m, 1.5 * g);
    const bx = W * 0.55, by = H * 0.85;
    seg(bx, by, W - m, by); seg(bx, by, bx, H - m); seg(bx, (by + H - m) / 2, W - m, (by + H - m) / 2);
    randuri(f, r, bx + 0.02 * W, by + 0.01 * H, W - m - bx - 0.04 * W, 0.04 * H, 0.012 * W);
    for (let i = 0; i < 4; i++) {
      const x = m + 0.1 * W + r() * 0.5 * W, y = m + 0.1 * H + r() * 0.5 * H, w = 0.1 * W + r() * 0.2 * W, h = 0.05 * H + r() * 0.15 * H;
      seg(x, y, x + w, y); seg(x + w, y, x + w, y + h); seg(x + w, y + h, x, y + h); seg(x, y + h, x, y);
      f.push({ t: 'cerc', cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 4, hw: g });
      seg(x, y - 0.02 * H, x + w, y - 0.02 * H, 0.5 * g);
    }
    seg(W * 0.2, H * 0.7, W * 0.45, H * 0.6);
  } else if (fel === 'text') {
    randuri(f, r, 0.12 * W, 0.1 * H, 0.76 * W, 0.8 * H, 0.012 * W);
  } else if (fel === 'schita') {
    for (let k = 0; k < 30; k++) {
      let x = m + r() * (W - 2 * m), y = m + r() * (H - 2 * m), a = r() * 2 * Math.PI;
      for (let i = 0; i < 40; i++) {
        a += (r() - 0.5) * 0.5;
        const nx = x + 6 * g * Math.cos(a), ny = y + 6 * g * Math.sin(a);
        seg(x, y, nx, ny, 1.5 * g); x = nx; y = ny;
      }
    }
  } else if (fel === 'cercuri') {
    for (let k = 0; k < 12; k++) {
      const rr = 0.03 * W + r() * 0.1 * W, cx = m + rr + r() * (W - 2 * m - 2 * rr), cy = m + rr + r() * (H - 2 * m - 2 * rr);
      if (r() < 0.5) f.push({ t: 'disc', cx, cy, r: rr }); else f.push({ t: 'cerc', cx, cy, r: rr, hw: 2 * g });
    }
  } else {
    for (let k = 0; k < 3000; k++) f.push({ t: 'disc', cx: r() * W, cy: r() * H, r: 1 + r() * 2 * g });
  }
  return f;
}

export type CumRandez = {
  /** Cerneala pe 1 bit (pragul la jumătatea acoperirii), ca o scanare alb-negru (G4). */
  readonly binar?: boolean;
  /** Abaterea zgomotului adăugat luminozității (aproape gaussian, din suma a trei uniforme); lipsă: fără. */
  readonly zgomot?: number;
  /** Luminozitatea hârtiei (0–1); lipsă: 1. */
  readonly hartie?: number;
  /** Desenul alb pe negru (pagina inversată). */
  readonly invers?: boolean;
};

/**
 * Pagina W × H cu formele date, rotită cu `unghi` grade în jurul centrului imaginii (convenția ADR 0271), în pixeli RGBA
 * opaci. Acoperirea fiecărei forme e clamp(0,5 − d), cu d distanța semnată a centrului pixelului (adus pe pagină) la ea.
 */
export function randeaza(forme: readonly Forma[], W: number, H: number, unghi: number, o: CumRandez = {}): ImagineRGBA {
  const ink = new Float32Array(W * H), a = (unghi * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = W / 2, cy = H / 2;
  // Pagina → imagine: punctul (x, y) față de centru merge în (x c + y s, −x s + y c); invers, la fel cu −a.
  const laImg = (x: number, y: number): [number, number] => [cx + (x - cx) * c + (y - cy) * s, cy - (x - cx) * s + (y - cy) * c];
  const laPag = (u: number, v: number): [number, number] => [cx + (u - cx) * c - (v - cy) * s, cy + (u - cx) * s + (v - cy) * c];
  for (const q of forme) {
    let x0: number, y0: number, x1: number, y1: number;
    if (q.t === 'seg') { x0 = Math.min(q.ax, q.bx) - q.hw; x1 = Math.max(q.ax, q.bx) + q.hw; y0 = Math.min(q.ay, q.by) - q.hw; y1 = Math.max(q.ay, q.by) + q.hw; }
    else if (q.t === 'cutie') { x0 = q.cx - q.hw; x1 = q.cx + q.hw; y0 = q.cy - q.hh; y1 = q.cy + q.hh; }
    else { const rr = q.r + (q.t === 'cerc' ? q.hw : 0); x0 = q.cx - rr; x1 = q.cx + rr; y0 = q.cy - rr; y1 = q.cy + rr; }
    const col = [laImg(x0 - 2, y0 - 2), laImg(x1 + 2, y0 - 2), laImg(x1 + 2, y1 + 2), laImg(x0 - 2, y1 + 2)];
    const u0 = Math.max(0, Math.floor(Math.min(...col.map((p) => p[0])))), u1 = Math.min(W - 1, Math.ceil(Math.max(...col.map((p) => p[0]))));
    const v0 = Math.max(0, Math.floor(Math.min(...col.map((p) => p[1])))), v1 = Math.min(H - 1, Math.ceil(Math.max(...col.map((p) => p[1]))));
    for (let v = v0; v <= v1; v++) {
      for (let u = u0; u <= u1; u++) {
        const [x, y] = laPag(u + 0.5, v + 0.5);
        let d: number;
        if (q.t === 'seg') {
          const dx = q.bx - q.ax, dy = q.by - q.ay, L2 = dx * dx + dy * dy;
          const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - q.ax) * dx + (y - q.ay) * dy) / L2)) : 0;
          d = Math.hypot(x - q.ax - t * dx, y - q.ay - t * dy) - q.hw;
        } else if (q.t === 'cutie') d = Math.max(Math.abs(x - q.cx) - q.hw, Math.abs(y - q.cy) - q.hh);
        else if (q.t === 'cerc') d = Math.abs(Math.hypot(x - q.cx, y - q.cy) - q.r) - q.hw;
        else d = Math.hypot(x - q.cx, y - q.cy) - q.r;
        const acop = Math.max(0, Math.min(1, 0.5 - d)), i = v * W + u;
        if (acop > (ink[i] ?? 0)) ink[i] = acop;
      }
    }
  }
  const r = aleator(11), date = new Uint8ClampedArray(W * H * 4), hartie = o.hartie ?? 1;
  for (let i = 0; i < W * H; i++) {
    let k = ink[i] ?? 0;
    if (o.binar) k = k >= 0.5 ? 1 : 0;
    let l = hartie * (1 - k);
    if (o.zgomot) l += o.zgomot * (r() + r() + r() - 1.5);
    if (o.invers) l = 1 - l;
    const b = Math.round(255 * Math.max(0, Math.min(1, l)));
    date[4 * i] = b; date[4 * i + 1] = b; date[4 * i + 2] = b; date[4 * i + 3] = 255;
  }
  return { latime: W, inaltime: H, date };
}
