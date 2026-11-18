/**
 * Un scriitor TIFF al probelor (ADR 0229), pentru fișierele pe care codoarele Windows nu le scriu (MM, plăci, planar,
 * predictorul, 2 / 4 / 16 biți, alb-e-zero, CMYK, alfa asociat, orientarea, compresiile date de mână): antetul, apoi, pe
 * fiecare pagină, bucățile (benzile sau plăcile, comprimate deja), IFD-ul și valorile lungi după el. Ce e în fișier e
 * exact ce spune proba; pixelii așteptați îi socotește proba, pe hârtie.
 */

/** O etichetă: numărul, tipul (1 BYTE, 3 SHORT, 4 LONG, 5 RATIONAL: perechi numărător / numitor, 7 UNDEFINED), valorile. */
export type Eticheta = readonly [tag: number, tip: 1 | 3 | 4 | 5 | 7, valori: readonly number[]];

export type PaginaTiff = {
  /** Etichetele paginii, fără offset-urile bucăților și fără numărul lor de octeți (le pune scriitorul). */
  readonly etichete: readonly Eticheta[];
  /** Benzile (StripOffsets / StripByteCounts) sau, cu `placi`, plăcile (TileOffsets / TileByteCounts). */
  readonly bucati: readonly Uint8Array[];
  readonly placi?: boolean;
};

const MARIME: Readonly<Record<number, number>> = { 1: 1, 3: 2, 4: 4, 5: 8, 7: 1 };

/** Fișierul TIFF cu paginile date; `le`: ordinea octeților II (altfel MM). */
export function scrieTiff(pagini: readonly PaginaTiff[], le = true): Uint8Array<ArrayBuffer> {
  const o: number[] = [];
  const u8 = (p: number, x: number): void => { o[p] = x & 255; };
  const u16 = (p: number, x: number): void => { if (le) { u8(p, x); u8(p + 1, x >>> 8); } else { u8(p, x >>> 8); u8(p + 1, x); } };
  const u32 = (p: number, x: number): void => {
    if (le) { u8(p, x); u8(p + 1, x >>> 8); u8(p + 2, x >>> 16); u8(p + 3, x >>> 24); }
    else { u8(p, x >>> 24); u8(p + 1, x >>> 16); u8(p + 2, x >>> 8); u8(p + 3, x); }
  };
  u8(0, le ? 0x49 : 0x4d); u8(1, le ? 0x49 : 0x4d); u16(2, 42);
  let capat = 8, legatura = 4;
  for (const p of pagini) {
    const offs: number[] = [];
    for (const b of p.bucati) {
      offs.push(capat);
      for (let k = 0; k < b.length; k++) u8(capat + k, b[k] ?? 0);
      capat += b.length + (b.length & 1);
    }
    const toate: Eticheta[] = [...p.etichete, [p.placi ? 324 : 273, 4, offs], [p.placi ? 325 : 279, 4, p.bucati.map((b) => b.length)]];
    toate.sort((a, b) => a[0] - b[0]);
    const ifd = capat;
    u32(legatura, ifd);
    u16(ifd, toate.length);
    let lungi = ifd + 2 + 12 * toate.length + 4;
    for (const [k, [tag, tip, valori]] of toate.entries()) {
      const e = ifd + 2 + 12 * k, n = tip === 5 ? valori.length / 2 : valori.length, m = (MARIME[tip] ?? 1) * n;
      u16(e, tag); u16(e + 2, tip); u32(e + 4, n);
      let unde = e + 8;
      if (m > 4) { u32(e + 8, lungi); unde = lungi; lungi += m + (m & 1); }
      else u32(e + 8, 0);
      const pas = tip === 5 ? 4 : MARIME[tip] ?? 1;
      for (let j = 0; j < valori.length; j++) {
        const v = valori[j] ?? 0, q = unde + j * pas;
        if (tip === 3) u16(q, v); else if (tip === 4 || tip === 5) u32(q, v); else u8(q, v);
      }
    }
    legatura = ifd + 2 + 12 * toate.length;
    u32(legatura, 0);
    capat = lungi;
  }
  return Uint8Array.from({ length: o.length }, (_, k) => o[k] ?? 0);
}

/** Biții unor coduri date ca șiruri de „0” și „1”, împachetați de la bitul cel mai semnificativ, completați cu 0. */
export function biti(...coduri: readonly string[]): Uint8Array<ArrayBuffer> {
  const s = coduri.join('');
  const b = new Uint8Array(Math.ceil(s.length / 8));
  for (let i = 0; i < s.length; i++) if (s[i] === '1') b[i >> 3] = (b[i >> 3] ?? 0) | (0x80 >> (i & 7));
  return b;
}

/** Codurile LZW date, de câte `latime` biți fiecare (de la bitul cel mai semnificativ), ca în TIFF. */
export function coduriLzw(coduri: readonly (readonly [cod: number, latime: number])[]): Uint8Array<ArrayBuffer> {
  return biti(...coduri.map(([c, l]) => c.toString(2).padStart(l, '0')));
}
