/**
 * Dala reliefului și cuantizarea ei (ADR 0311 §5): 256 × 256 de valori Float32 (golul NaN) devin o dală goală, o constantă
 * sau coduri Uint16 cu decalajul m și pasul p ale dalei (golul 65 535). Citirea dă înapoi Float32, cu eroarea cel mult
 * (M − m) / 131 068. Octeții („CVR1”, m, p, codurile, little-endian) sunt și cheia dalei: amprenta lor SHA-256.
 */
import { CELULE_DALA, LATURA_DALA } from './grila.ts';

export const COD_GOL = 65_535;
export const CODURI = 65_534;
export const OCTETI_DALA = 4 + 16 + 2 * CELULE_DALA;
const MAGIC = [0x43, 0x56, 0x52, 0x31] as const; // „CVR1”

export type Dala =
  | { readonly fel: 'gol' }
  | { readonly fel: 'constanta'; readonly m: number }
  | { readonly fel: 'coduri'; readonly m: number; readonly p: number; readonly coduri: Uint16Array };

/** Valorile dalei (ti, tj) dintr-o grilă nx × ny, cu j în sus; în afara grilei, golul. */
export function valoriDala(valori: ArrayLike<number>, nx: number, ny: number, ti: number, tj: number): Float32Array {
  const out = new Float32Array(CELULE_DALA).fill(NaN);
  const i0 = ti * LATURA_DALA, j0 = tj * LATURA_DALA;
  const la = Math.min(LATURA_DALA, nx - i0), lb = Math.min(LATURA_DALA, ny - j0);
  for (let b = 0; b < lb; b++) {
    const sursa = (j0 + b) * nx + i0, tinta = b * LATURA_DALA;
    for (let a = 0; a < la; a++) out[tinta + a] = valori[sursa + a] ?? NaN;
  }
  return out;
}

/** Cuantizarea (ADR 0311 §5). */
export function cuantizeaza(valori: Float32Array): Dala {
  let m = Infinity, M = -Infinity, goale = 0;
  for (let k = 0; k < valori.length; k++) {
    const v = valori[k] ?? NaN;
    if (v !== v) { goale++; continue; }
    if (v < m) m = v;
    if (v > M) M = v;
  }
  if (goale === valori.length) return { fel: 'gol' };
  if (goale === 0 && m === M) return { fel: 'constanta', m };
  const p = m === M ? 0 : (M - m) / CODURI;
  const coduri = new Uint16Array(valori.length);
  for (let k = 0; k < valori.length; k++) {
    const v = valori[k] ?? NaN;
    coduri[k] = v !== v ? COD_GOL : p === 0 ? 0 : Math.min(CODURI, Math.max(0, Math.round((v - m) / p)));
  }
  return { fel: 'coduri', m, p, coduri };
}

/** Valorile citite (ADR 0311 §5): Float32, golul NaN. */
export function citeste(d: Dala, out = new Float32Array(CELULE_DALA)): Float32Array {
  if (d.fel === 'gol') return out.fill(NaN);
  if (d.fel === 'constanta') return out.fill(d.m);
  const { m, p, coduri } = d;
  for (let k = 0; k < out.length; k++) {
    const c = coduri[k] ?? COD_GOL;
    out[k] = c === COD_GOL ? NaN : m + c * p;
  }
  return out;
}

/** Octeții unei dale cu coduri (ADR 0311 §5): „CVR1”, m, p ca Float64 little-endian, codurile ca Uint16 little-endian. */
export function octetiDala(d: Extract<Dala, { fel: 'coduri' }>): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(OCTETI_DALA), v = new DataView(out.buffer);
  out.set(MAGIC, 0);
  v.setFloat64(4, d.m, true);
  v.setFloat64(12, d.p, true);
  for (let k = 0; k < CELULE_DALA; k++) v.setUint16(20 + 2 * k, d.coduri[k] ?? COD_GOL, true);
  return out;
}

/** Dala citită din octeții ei, sau null dacă nu au forma (o bază stricată nu ajunge în relief). */
export function dalaDinOcteti(o: Uint8Array): Extract<Dala, { fel: 'coduri' }> | null {
  if (o.length !== OCTETI_DALA || MAGIC.some((x, k) => o[k] !== x)) return null;
  const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  const m = v.getFloat64(4, true), p = v.getFloat64(12, true);
  if (!Number.isFinite(m) || !Number.isFinite(p) || p < 0) return null;
  const coduri = new Uint16Array(CELULE_DALA);
  for (let k = 0; k < CELULE_DALA; k++) coduri[k] = v.getUint16(20 + 2 * k, true);
  return { fel: 'coduri', m, p, coduri };
}
