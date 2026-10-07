// hash.mjs — amprentă deterministă a câmpului (aceeași în Node și în browser) + conversie densă.
import { SH, M, TILE_CELLS } from './core.mjs';

// FNV-1a pe 2×32 biți peste cuvintele u32 ale dalelor alocate, în ordinea indexului.
export function hashField(F) {
  let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 ^ 0x5bd1e995;
  for (let idx = 0; idx < F.tiles.length; idx++) {
    const t = F.tiles[idx];
    if (t === null) continue;
    h1 = Math.imul(h1 ^ idx, 0x01000193); h2 = Math.imul(h2 ^ idx, 0x5bd1e995);
    const u = new Uint32Array(t.buffer, t.byteOffset, TILE_CELLS);
    for (let k = 0; k < TILE_CELLS; k++) { const w = u[k]; h1 = Math.imul(h1 ^ w, 0x01000193); h2 = Math.imul(h2 ^ (w >>> 7), 0x5bd1e995); }
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
}

export function toDense(F) {
  const out = new Float32Array(F.nx * F.ny).fill(F.top);
  for (let ty = 0; ty < F.nty; ty++) for (let tx = 0; tx < F.ntx; tx++) {
    const t = F.tiles[ty * F.ntx + tx];
    if (t === null) continue;
    for (let ly = 0; ly < 1 << SH; ly++) {
      const j = (ty << SH) + ly; if (j >= F.ny) break;
      for (let lx = 0; lx < 1 << SH; lx++) {
        const i = (tx << SH) + lx; if (i >= F.nx) break;
        out[j * F.nx + i] = t[(ly << SH) | lx];
      }
    }
  }
  return out;
}
export { M };
