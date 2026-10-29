/**
 * WOFF 1.0 (ADR 0106 §2): un font web despachetat într-un font obișnuit (sfnt), ca un `.woff` încărcat de om să se citească
 * la fel ca TTF-ul sau OTF-ul din care s-a făcut. Tabelele sunt comprimate fiecare cu zlib (`DecompressionStream`, din
 * browser); antetul și directorul se scriu din nou, cu tabelele aliniate la 4 octeți. WOFF2 (Brotli și tabelele
 * transformate) nu se despachetează: se cere fontul TTF / OTF.
 */
import { FontStricat, Octeti } from './sfnt.ts';

/** Cel mai mare font despachetat (același plafon ca un fișier încărcat). */
export const PLAFON_WOFF = 40 * 1024 * 1024;

async function inflate(date: Uint8Array): Promise<Uint8Array> {
  const flux = new Blob([date as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/** Fontul sfnt din WOFF; aruncă `FontStricat` la un fișier greșit (antetul, un tabel tăiat, mărimile care nu se potrivesc). */
export async function desfaWoff(octeti: Uint8Array): Promise<Uint8Array> {
  const o = new Octeti(octeti);
  if (o.lungime < 44 || o.u32(0) !== 0x774f4646) throw new FontStricat('nu e WOFF');
  const flavor = o.u32(4), n = o.u16(12), total = o.u32(16);
  if (n === 0 || n > 512 || total > PLAFON_WOFF) throw new FontStricat(`WOFF cu ${n} tabele, ${total} octeți`);
  const tabele: { tag: number; suma: number; date: Uint8Array }[] = [];
  for (let k = 0; k < n; k++) {
    const r = 44 + 20 * k;
    const tag = o.u32(r), pos = o.u32(r + 4), comprimat = o.u32(r + 8), lungime = o.u32(r + 12), suma = o.u32(r + 16);
    const sursa = o.felie(pos, comprimat);
    const date = comprimat < lungime ? await inflate(sursa) : sursa;
    if (date.byteLength !== lungime || comprimat > lungime) throw new FontStricat(`tabelul ${k} are ${date.byteLength} octeți, nu ${lungime}`);
    tabele.push({ tag, suma, date });
  }
  // Tabelele, ordonate după etichetă (ca în orice sfnt), după antet și director, fiecare la un multiplu de 4.
  tabele.sort((a, b) => a.tag - b.tag);
  let pos = 12 + 16 * n;
  const locuri = tabele.map((t) => {
    const p = pos;
    pos += (t.date.byteLength + 3) & ~3;
    return p;
  });
  if (pos > PLAFON_WOFF) throw new FontStricat('fontul despachetat e prea mare');
  const iesire = new Uint8Array(pos);
  const v = new DataView(iesire.buffer);
  let putere = 1, exp = 0;
  while (putere * 2 <= n) { putere *= 2; exp++; }
  v.setUint32(0, flavor);
  v.setUint16(4, n);
  v.setUint16(6, putere * 16);
  v.setUint16(8, exp);
  v.setUint16(10, n * 16 - putere * 16);
  tabele.forEach((t, k) => {
    const r = 12 + 16 * k;
    v.setUint32(r, t.tag);
    v.setUint32(r + 4, t.suma);
    v.setUint32(r + 8, locuri[k]!);
    v.setUint32(r + 12, t.date.byteLength);
    iesire.set(t.date, locuri[k]!);
  });
  return iesire;
}
