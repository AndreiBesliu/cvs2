import type { ImagineFoaie } from '../model/document.ts';
import { inImagine, LATURA_MINIMA_IMAGINE, peFoaie, type Asezare, type Punct } from './manereImagine.ts';

/**
 * Partea pură a lui „Calibrează” și „Trasează…” din imaginea de pe foaie (ADR 0272 §6, §7; felia 25.8↑b): calibrarea din două
 * puncte și o distanță (scalarea uniformă în jurul primului punct, ca „Calibrate” din Fusion 360), zona trasă pe foaie peste
 * imagine (în cadrul imaginii, deci și pe una rotită) și locul vectorilor trasați din ea, exact peste imagine. Totul în mm ai
 * foii (Y în sus), cu rotirea imaginii în grade, trigonometric.
 */

/**
 * O zonă a imaginii, în fracțiuni ale laturilor ei (0…1, cu Y de sus, ca pixelii): așa nu depinde de mărimea în pixeli a
 * fișierului, pe care modul pânzei n-o știe.
 */
export type ZonaRelativa = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/** O zonă în pixelii imaginii (ca `ZonaTrasare` a workerului trasării). */
export type ZonaPixeli = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/**
 * Așezarea vectorilor trasați din imaginea de pe foaie (ADR 0272 §7): punctul (cx, cy) al paginii importului cade în (x, y),
 * cu pagina rotită cu `rotire` grade în jurul lui. Aceeași formă o primește comanda importului (`AsezareImport`).
 */
export type AsezarePeImagine = { readonly x: number; readonly y: number; readonly rotire: number; readonly cx: number; readonly cy: number };

export const distanta = (p: Punct, q: Punct): number => Math.hypot(q.x - p.x, q.y - p.y);

/** Punctul e pe imagine (marginea inclusă), în cadrul ei rotit. */
export function peImagine(a: Asezare, p: Punct): boolean {
  const { u, w } = inImagine(a, p);
  const e = 1e-9 * Math.max(1, a.latime, a.inaltime);
  return Math.abs(u) <= a.latime / 2 + e && Math.abs(w) <= a.inaltime / 2 + e;
}

/**
 * Cu Shift, al doilea punct se duce pe axa imaginii prin primul: pe orizontala sau pe verticala ei (cea mai apropiată de
 * punct), ca o riglă pozată drept să se măsoare exact de-a lungul ei.
 */
export function peAxa(a: Asezare, p: Punct, q: Punct): Punct {
  const P = inImagine(a, p), Q = inImagine(a, q);
  return Math.abs(Q.u - P.u) >= Math.abs(Q.w - P.w) ? peFoaie(a, Q.u, P.w) : peFoaie(a, P.u, Q.w);
}

/** De ce nu se poate calibra: punctele una peste alta, distanța scrisă (nu un număr pozitiv), ori imaginea ar ieși prea mică. */
export type MotivCalibrare = 'puncte' | 'distanta' | 'mica';

/**
 * Imaginea calibrată (ADR 0272 §6): scalată uniform cu `d / |p1 p2|`, în jurul lui p1, care rămâne pe loc; rotirea, aceeași.
 * Sub `LATURA_MINIMA_IMAGINE` pe o latură, refuzul (ca la mânere); plafonul laturii îl judecă ușa, prin acțiune.
 */
export function calibrata(a: Asezare, p1: Punct, p2: Punct, d: number): { readonly ok: true; readonly a: Asezare } | { readonly ok: false; readonly motiv: MotivCalibrare } {
  const acum = distanta(p1, p2);
  if (!(acum > 1e-9 * Math.max(1, a.latime, a.inaltime))) return { ok: false, motiv: 'puncte' };
  if (!Number.isFinite(d) || !(d > 0)) return { ok: false, motiv: 'distanta' };
  const k = d / acum;
  if (Math.min(a.latime, a.inaltime) * k < LATURA_MINIMA_IMAGINE) return { ok: false, motiv: 'mica' };
  return { ok: true, a: { ...a, x: p1.x + k * (a.x - p1.x), y: p1.y + k * (a.y - p1.y), latime: a.latime * k, inaltime: a.inaltime * k } };
}

const intre01 = (x: number): number => Math.min(1, Math.max(0, x));

/**
 * Zona trasă pe foaie între punctele p și q (ADR 0272 §7): dreptunghiul cu diagonala pq în cadrul imaginii (pe o imagine
 * rotită, rotit cu ea), tăiat la imagine, în fracțiuni; null dacă nu acoperă nimic din ea.
 */
export function zonaDinTragere(a: Asezare, p: Punct, q: Punct): ZonaRelativa | null {
  const P = inImagine(a, p), Q = inImagine(a, q);
  const fx = (u: number): number => intre01(u / a.latime + 0.5), fy = (w: number): number => intre01(0.5 - w / a.inaltime);
  const x0 = Math.min(fx(P.u), fx(Q.u)), x1 = Math.max(fx(P.u), fx(Q.u));
  const y0 = Math.min(fy(P.w), fy(Q.w)), y1 = Math.max(fy(P.w), fy(Q.w));
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}

/** Colțurile zonei pe foaie (pentru desen), în ordinea sv, se, ne, nv ale imaginii nerotite. */
export function colturiZonei(a: Asezare, z: ZonaRelativa): readonly Punct[] {
  const u = (f: number): number => (f - 0.5) * a.latime, w = (f: number): number => (0.5 - f) * a.inaltime;
  return [peFoaie(a, u(z.x0), w(z.y1)), peFoaie(a, u(z.x1), w(z.y1)), peFoaie(a, u(z.x1), w(z.y0)), peFoaie(a, u(z.x0), w(z.y0))];
}

/**
 * Zona în pixelii unei imagini de W × H: pixelii atinși de ea, cel puțin unul pe fiecare latură, în imagine. Marginile la un
 * pixel întreg (în virgulă mobilă, cu o miime de miime alături) nu adaugă un pixel.
 */
export function zonaInPixeli(z: ZonaRelativa, W: number, H: number): ZonaPixeli {
  const x = Math.min(W - 1, Math.max(0, Math.floor(z.x0 * W + 1e-6))), y = Math.min(H - 1, Math.max(0, Math.floor(z.y0 * H + 1e-6)));
  const x1 = Math.min(W, Math.max(x + 1, Math.ceil(z.x1 * W - 1e-6))), y1 = Math.min(H, Math.max(y + 1, Math.ceil(z.y1 * H - 1e-6)));
  return { x, y, w: x1 - x, h: y1 - y };
}

/**
 * Locul vectorilor trasați din imaginea de pe foaie (ADR 0272 §7), din raportul trasării (imaginea întreagă în pixeli, scara
 * și zona): centrul imaginii în pagina importului (originea paginii e colțul stânga-jos al zonei, ori al imaginii, Y în sus,
 * ca în `asezareInPagina`) cade în centrul ei de pe foaie, rotit cu ea. Cu scara imaginii de pe foaie (`latime / W`), un
 * vârf trasat dintr-un pixel cade pe foaie peste pixelul acela.
 */
export function asezarePeImagine(im: Pick<ImagineFoaie, 'x' | 'y' | 'rotire'>, latimePx: number, inaltimePx: number, mmPePx: number,
  zona: ZonaPixeli | null): AsezarePeImagine {
  const zx = zona?.x ?? 0, zy = zona?.y ?? 0, zh = zona?.h ?? inaltimePx;
  return { x: im.x, y: im.y, rotire: im.rotire, cx: (latimePx / 2 - zx) * mmPePx, cy: (zy + zh - inaltimePx / 2) * mmPePx };
}

/**
 * Numele fișierului dat ferestrei trasării pentru imaginea de pe foaie: numele ei fără extensie (al fișierului din care a
 * venit poate fi „scan.pdf”), cu extensia tipului păstrat, ca ușa importului s-o citească drept imagine.
 */
export function numeFisierImagine(nume: string, tip: string): string {
  const ext = tip === 'image/jpeg' ? 'jpg' : tip === 'image/webp' ? 'webp' : 'png';
  const baza = nume.replace(/\.[a-z0-9]{1,5}$/i, '') || 'imagine';
  return `${baza}.${ext}`;
}
