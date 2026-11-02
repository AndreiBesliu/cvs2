/**
 * Cititorul `.zip` al pachetelor de extensii (ADR 0127 §A): directorul central, metodele 0 (stocat) și 8 (deflate, prin
 * `DecompressionStream('deflate-raw')`), CRC-32 verificat după dezarhivare. Fără criptare și fără ZIP64. Mărimile declarate
 * se judecă înaintea dezarhivării, iar dezarhivarea se oprește la mărimea declarată: o „bombă” nu umple memoria.
 */
export type IntrareZip = { readonly nume: string; readonly octeti: Uint8Array };
export type LimiteZip = { readonly fisiere: number; readonly octetiFisier: number; readonly octetiTotal: number };
export type MotivZip = 'nu-e-zip' | 'zip64' | 'criptat' | 'metoda' | 'prea-multe' | 'prea-mare' | 'crc' | 'stricat';
export type RezultatZip =
  | { readonly ok: true; readonly intrari: readonly IntrareZip[] }
  | { readonly ok: false; readonly motiv: MotivZip; readonly nume?: string };

const TABEL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (polinomul 0xEDB88320, ca în ZIP). */
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = (TABEL[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Deflate-ul unei intrări, oprit dacă trece de mărimea declarată; null dacă iese altă mărime sau fluxul e stricat. */
async function dezumfla(date: Uint8Array, marime: number): Promise<Uint8Array | null> {
  const cititor = new Blob([new Uint8Array(date)]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const out = new Uint8Array(marime);
  let n = 0;
  for (;;) {
    const { done, value } = await cititor.read();
    if (done) break;
    if (n + value.length > marime) {
      await cititor.cancel();
      return null;
    }
    out.set(value, n);
    n += value.length;
  }
  return n === marime ? out : null;
}

const latin1 = (b: Uint8Array): string => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return s;
};

/** Intrările unui `.zip`, în ordinea directorului central (dosarele sărite), sau motivul refuzului. */
export async function citesteZip(octeti: Uint8Array, limite: LimiteZip): Promise<RezultatZip> {
  const v = new DataView(octeti.buffer, octeti.byteOffset, octeti.byteLength);
  // Sfârșitul directorului: 22 de octeți plus comentariul (cel mult 65 535), căutat de la coadă.
  let eocd = -1;
  for (let i = octeti.length - 22; i >= Math.max(0, octeti.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return { ok: false, motiv: 'nu-e-zip' };
  const total = v.getUint16(eocd + 10, true), marimeDir = v.getUint32(eocd + 12, true), startDir = v.getUint32(eocd + 16, true);
  if (total === 0xffff || marimeDir === 0xffffffff || startDir === 0xffffffff) return { ok: false, motiv: 'zip64' };
  if (total > limite.fisiere) return { ok: false, motiv: 'prea-multe' };
  if (startDir + marimeDir > eocd) return { ok: false, motiv: 'stricat' };
  const intrari: IntrareZip[] = [];
  let p = startDir, suma = 0;
  for (let k = 0; k < total; k++) {
    if (p + 46 > eocd || v.getUint32(p, true) !== 0x02014b50) return { ok: false, motiv: 'stricat' };
    const steaguri = v.getUint16(p + 8, true), metoda = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true);
    const comprimat = v.getUint32(p + 20, true), marime = v.getUint32(p + 24, true);
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const nume = latin1(octeti.subarray(p + 46, p + 46 + ln));
    p += 46 + ln + le + lc;
    if (nume.endsWith('/')) continue;
    if (steaguri & 1) return { ok: false, motiv: 'criptat', nume };
    if (comprimat === 0xffffffff || marime === 0xffffffff || local === 0xffffffff) return { ok: false, motiv: 'zip64', nume };
    if (metoda !== 0 && metoda !== 8) return { ok: false, motiv: 'metoda', nume };
    suma += marime;
    if (marime > limite.octetiFisier || suma > limite.octetiTotal) return { ok: false, motiv: 'prea-mare', nume };
    if (local + 30 > octeti.length || v.getUint32(local, true) !== 0x04034b50) return { ok: false, motiv: 'stricat', nume };
    const inceput = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    if (inceput + comprimat > octeti.length) return { ok: false, motiv: 'stricat', nume };
    const date = octeti.subarray(inceput, inceput + comprimat);
    const continut = metoda === 0 ? (comprimat === marime ? date.slice() : null) : await dezumfla(date, marime).catch(() => null);
    if (!continut) return { ok: false, motiv: 'stricat', nume };
    if (crc32(continut) !== crc) return { ok: false, motiv: 'crc', nume };
    intrari.push({ nume, octeti: continut });
  }
  return { ok: true, intrari };
}
