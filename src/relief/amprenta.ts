/** Amprenta SHA-256 (ADR 0311 §5, §6), în hexazecimal mic: cheia dalelor și a hărților în bază. */
export async function sha256(x: Uint8Array<ArrayBuffer> | string): Promise<string> {
  const date = typeof x === 'string' ? new TextEncoder().encode(x) : x;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', date));
  let s = '';
  for (const b of h) s += b.toString(16).padStart(2, '0');
  return s;
}
