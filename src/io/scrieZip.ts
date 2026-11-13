/**
 * Scrierea unei arhive `.zip` (ADR 0210 §5, „Toate foile” la export): intrările stocate (metoda 0, fără compresie), cu data
 * fixă 01.01.1980 00:00 și fără câmpuri în plus, deci aceleași intrări dau mereu aceiași octeți. Numele sunt ASCII (exportul
 * le face din foaie și din numele programelor), fără dosare scrise separat (un `F2/` din nume e dosarul intrării). Fără ZIP64:
 * cel mult 65 535 de intrări și sub 4 GB, altfel refuz (exportul nu se apropie). Cititorul (`src/extensii/zip.ts`) o citește
 * înapoi.
 */
import { crc32 } from './crc32.ts';

export type IntrareArhiva = { readonly nume: string; readonly octeti: Uint8Array };

/** 01.01.1980, în formatul DOS al datei (anul de la 1980 pe 7 biți, luna pe 4, ziua pe 5); ora 00:00 e 0. */
const DATA_DOS = (0 << 9) | (1 << 5) | 1;
const LIMITA = 0xffffffff;

export function scrieZip(intrari: readonly IntrareArhiva[]): { readonly ok: true; readonly octeti: Uint8Array<ArrayBuffer> } | { readonly ok: false; readonly motiv: string } {
  if (intrari.length > 0xffff) return { ok: false, motiv: 'arhiva ar avea peste 65 535 de fișiere' };
  const enc = new TextEncoder();
  const nume = intrari.map((x) => enc.encode(x.nume));
  const locale = intrari.reduce((s, x, k) => s + 30 + (nume[k]?.length ?? 0) + x.octeti.length, 0);
  const director = nume.reduce((s, n) => s + 46 + n.length, 0);
  if (locale + director + 22 > LIMITA) return { ok: false, motiv: 'arhiva ar trece de 4 GB' };
  const out = new Uint8Array(locale + director + 22);
  const v = new DataView(out.buffer);
  const crc = intrari.map((x) => crc32(x.octeti));
  const locuri: number[] = [];
  let o = 0;
  // Câmpurile comune antetului local (de la versiune până la lungimea numelui) și celui din director.
  const comune = (k: number, la: number): void => {
    const x = intrari[k], n = nume[k];
    if (!x || !n) return;
    v.setUint16(la, 20, true); // versiunea care o citește (2.0)
    v.setUint16(la + 4, 0, true); // stocat
    v.setUint16(la + 6, 0, true); // ora
    v.setUint16(la + 8, DATA_DOS, true);
    v.setUint32(la + 10, crc[k] ?? 0, true);
    v.setUint32(la + 14, x.octeti.length, true);
    v.setUint32(la + 18, x.octeti.length, true);
    v.setUint16(la + 22, n.length, true);
    v.setUint16(la + 24, 0, true); // fără câmpuri în plus
  };
  for (let k = 0; k < intrari.length; k++) {
    const x = intrari[k], n = nume[k];
    if (!x || !n) continue;
    locuri.push(o);
    v.setUint32(o, 0x04034b50, true);
    comune(k, o + 4);
    out.set(n, o + 30);
    out.set(x.octeti, o + 30 + n.length);
    o += 30 + n.length + x.octeti.length;
  }
  const inceput = o;
  for (let k = 0; k < intrari.length; k++) {
    const n = nume[k];
    if (!n) continue;
    v.setUint32(o, 0x02014b50, true);
    v.setUint16(o + 4, 20, true); // scrisă de versiunea 2.0
    comune(k, o + 6);
    // Comentariul, discul, atributele: zero; apoi locul antetului local.
    v.setUint32(o + 42, locuri[k] ?? 0, true);
    out.set(n, o + 46);
    o += 46 + n.length;
  }
  v.setUint32(o, 0x06054b50, true);
  v.setUint16(o + 8, intrari.length, true);
  v.setUint16(o + 10, intrari.length, true);
  v.setUint32(o + 12, o - inceput, true);
  v.setUint32(o + 16, inceput, true);
  return { ok: true, octeti: out };
}
