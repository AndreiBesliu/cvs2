// Același generator xorshift32 ca în web/storage.js, dar hash-ul îl face OpenSSL (node:crypto), nu crypto.subtle.
import { createHash } from 'node:crypto';
export function gen(bytes, seed) {
  const u8 = new Uint8Array(bytes); const u32 = new Uint32Array(u8.buffer, 0, bytes >>> 2);
  let x = seed >>> 0 || 1;
  for (let i = 0; i < u32.length; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; u32[i] = x; }
  return u8;
}
export const sha = (u8) => createHash('sha256').update(u8).digest('hex');
export function chunkShas(u8, chunk = 1 << 20) { const o = []; for (let i = 0; i < u8.length; i += chunk) o.push(sha(u8.subarray(i, i + chunk)).slice(0, 16)); return o; }
