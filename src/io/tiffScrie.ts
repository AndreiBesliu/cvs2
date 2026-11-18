/**
 * Scriitorul TIFF minim al ușii PDF (ADR 0270): o imagine dintr-un PDF scanat (eșantioanele brute, sau un flux CCITT
 * întreg), împachetată într-un TIFF de o pagină și o bandă, ca s-o citească cititorul TIFF al workerului trasării (ADR 0229).
 * La 16 biți, ordinea octeților e MM (cea a eșantioanelor din PDF); altfel II. Fără dependențe.
 */

export type TiffDeScris = {
  readonly latime: number;
  readonly inaltime: number;
  readonly biti: 1 | 2 | 4 | 8 | 16;
  readonly esantioane: 1 | 3 | 4;
  /** PhotometricInterpretation: 0 alb-e-zero, 1 negru-e-zero, 2 RGB, 3 paleta, 5 CMYK. */
  readonly foto: 0 | 1 | 2 | 3 | 5;
  /** Compression: 1 (eșantioanele brute), 2 (CCITT 1D, rândurile pe octeți, fără EOL), 3 (CCITT T.4) sau 4 (CCITT T.6). */
  readonly compresie: 1 | 2 | 3 | 4;
  /** T4Options (la compresia 3): bitul 0, rânduri 2D. */
  readonly t4?: number;
  /** ColorMap (la paletă): întâi roșii, apoi verzii, apoi albaștrii, pe 16 biți, câte 2^biti. */
  readonly harta?: readonly number[];
  /** Banda: eșantioanele, rând cu rând, sau fluxul CCITT. */
  readonly date: Uint8Array;
};

export function scrieTiffSimplu(t: TiffDeScris): Uint8Array<ArrayBuffer> {
  const le = t.biti !== 16;
  const etichete: Array<readonly [number, 3 | 4, readonly number[]]> = [
    [256, 4, [t.latime]], [257, 4, [t.inaltime]], [258, 3, Array<number>(t.esantioane).fill(t.biti)], [259, 3, [t.compresie]],
    [262, 3, [t.foto]], [273, 4, [0]], [277, 3, [t.esantioane]], [278, 4, [t.inaltime]], [279, 4, [t.date.length]],
    ...(t.compresie === 3 ? [[292, 4, [t.t4 ?? 0]] as const] : []),
    ...(t.harta ? [[320, 3, t.harta] as const] : []),
  ];
  // Antetul, banda, IFD-ul, valorile lungi.
  const lungi = etichete.reduce((s, [, tip, v]) => s + ((tip === 3 ? 2 : 4) * v.length > 4 ? (tip === 3 ? 2 : 4) * v.length : 0), 0);
  const banda = 8, ifd = banda + t.date.length + (t.date.length & 1);
  const n = etichete.length, total = ifd + 2 + 12 * n + 4 + lungi;
  const o = new Uint8Array(total), v = new DataView(o.buffer);
  o[0] = o[1] = le ? 0x49 : 0x4d;
  v.setUint16(2, 42, le); v.setUint32(4, ifd, le);
  o.set(t.date, banda);
  v.setUint16(ifd, n, le);
  let p = ifd + 2 + 12 * n + 4;
  etichete.forEach(([tag, tip, val], k) => {
    const e = ifd + 2 + 12 * k, m = tip === 3 ? 2 : 4;
    v.setUint16(e, tag, le); v.setUint16(e + 2, tip, le); v.setUint32(e + 4, val.length, le);
    let unde = e + 8;
    if (m * val.length > 4) { v.setUint32(e + 8, p, le); unde = p; p += m * val.length; }
    val.forEach((x, i) => {
      const q = tag === 273 ? banda : x;
      if (m === 2) v.setUint16(unde + 2 * i, q, le); else v.setUint32(unde + 4 * i, q, le);
    });
  });
  v.setUint32(ifd + 2 + 12 * n, 0, le);
  return o;
}
