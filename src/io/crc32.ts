/**
 * CRC-32 (polinomul 0xEDB88320, ca în ZIP și PNG): o singură funcție pentru cititorul arhivelor extensiilor (ADR 0127 §A) și
 * pentru arhiva exportului cu toate foile (ADR 0210 §5).
 */
const TABEL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = (TABEL[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
