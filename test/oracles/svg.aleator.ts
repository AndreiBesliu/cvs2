/**
 * Generatorul de SVG-uri aleatoare (cu sămânță) al oracolului SVG: grupuri imbricate cu transformări de toate felurile
 * (și oglindiri), forme de toate felurile, căi cu toate comenzile (absolute și relative, repetarea implicită, S / T după
 * orice, arce cu steaguri, raze prea mici, raze 0, capete egale), numere scrise în feluri diferite (lipite, exponenți,
 * `.5`), atribute de stil. ZERO importuri din `src/`. Nu are valori pe hârtie: îl judecă oracolul.
 */

/**
 * Semințele cu o constatare deschisă, judecate în `svg.constatari.oracol.test.ts` (nu în bucla aleatoare). Felia 2.7d:
 * 164 (un contur care se tăia singur lângă o cuspidă, înfășurarea −1 la 2,8e-7 mm de frontieră) a picat pe instantaneul
 * portului și trece pe portul de acum; a rămas în buclă, iar reproducerea minimă e în corpusul normalizării.
 */
export const SEMINTE_CONSTATARI: readonly number[] = [];

/** mulberry32: determinist, aceeași secvență pe orice mașină. */
export function aleator(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function svgAleator(samanta: number): { text: string; px: 96 | 72 } {
  const r = aleator(samanta);
  const int = (a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
  const alege = <T>(l: readonly T[]): T => l[Math.floor(r() * l.length)] as T;
  /** Un număr scris într-unul din felurile gramaticii. */
  const nr = (v: number): string => {
    const fel = int(0, 5);
    const s = Number(v.toFixed(3));
    if (fel === 0 && s !== 0 && Math.abs(s) >= 1) return s.toExponential(2).replace('+', '');
    if (fel === 1 && Math.abs(s) < 1 && s !== 0) return (s < 0 ? '-' : '') + String(Math.abs(s)).replace(/^0\./, '.');
    return String(s);
  };
  const sep = (): string => alege([' ', ',', ', ', '  ', '\n', ' ,']);
  const coord = (): number => int(0, 1000) / 10;
  const rel = (): number => int(-300, 300) / 10;
  const transform = (): string => {
    const n = int(0, 2);
    const t: string[] = [];
    for (let i = 0; i < n; i++) {
      const f = int(0, 6);
      if (f === 0) t.push(`translate(${nr(rel())}${sep()}${nr(rel())})`);
      else if (f === 1) t.push(`scale(${nr(alege([1, -1, 0.5, 2, 1.5]))}${r() < 0.5 ? '' : `${sep()}${nr(alege([1, -1, 0.5, 2, 1.5, 0.8]))}`})`);
      else if (f === 2) t.push(`rotate(${nr(int(-180, 180))}${r() < 0.5 ? '' : `${sep()}${nr(coord())}${sep()}${nr(coord())}`})`);
      else if (f === 3) t.push(`skewX(${nr(int(-40, 40))})`);
      else if (f === 4) t.push(`skewY(${nr(int(-40, 40))})`);
      else if (f === 5) t.push(`matrix(${[alege([1, -1, 0.5]), 0, 0, alege([1, -1, 2]), rel(), rel()].map(nr).join(sep())})`);
      else t.push(`rotate(${alege([90, 180, 270, -90])})`);
    }
    return t.join(alege([' ', ',', ' , ']));
  };
  const cale = (): string => {
    const parti: string[] = [];
    const subcai = int(1, 3);
    for (let k = 0; k < subcai; k++) {
      parti.push(`${alege(['M', 'm'])}${nr(coord())}${sep()}${nr(coord())}`);
      const n = int(1, 7);
      for (let i = 0; i < n; i++) {
        const c = alege(['L', 'l', 'H', 'h', 'V', 'v', 'C', 'c', 'S', 's', 'Q', 'q', 'T', 't', 'A', 'a', 'A']);
        const p = (): string => {
          const relativ = c === c.toLowerCase();
          return `${nr(relativ ? rel() : coord())}${sep()}${nr(relativ ? rel() : coord())}`;
        };
        let args: string;
        switch (c.toUpperCase()) {
          case 'L': case 'T': args = p(); break;
          case 'H': case 'V': args = nr(c === c.toLowerCase() ? rel() : coord()); break;
          case 'C': args = `${p()}${sep()}${p()}${sep()}${p()}`; break;
          case 'S': case 'Q': args = `${p()}${sep()}${p()}`; break;
          default: {
            const rx = alege([0, 2, 5, 10, 20, 40, 3.7]);
            const ry = r() < 0.5 ? rx : alege([0, 3, 8, 15, 25]);
            args = `${nr(rx)}${sep()}${nr(ry)}${sep()}${nr(int(0, 3) === 0 ? int(-90, 90) : 0)}${sep()}${int(0, 1)}${alege(['', ' ', ','])}${int(0, 1)}${alege(['', ' ', ','])}${p()}`;
          }
        }
        // Repetarea implicită, uneori.
        parti.push(`${c}${alege(['', ' '])}${args}`);
      }
      if (r() < 0.85) parti.push(alege(['Z', 'z', ' Z']));
    }
    return parti.join(alege([' ', '', '\n']));
  };
  const forma = (): string => {
    const f = int(0, 9);
    const stil = r() < 0.15 ? ` fill-rule="${alege(['evenodd', 'nonzero'])}"` : '';
    const id = r() < 0.3 ? ` id="f${int(0, 999)}"` : '';
    const tr = r() < 0.3 ? ` transform="${transform()}"` : '';
    const extra = `${stil}${id}${tr}`;
    if (f <= 3) return `<path${extra} d="${cale()}"/>`;
    if (f === 4) {
      const rx = r() < 0.5 ? '' : ` rx="${nr(alege([1, 2, 5, 30]))}"`;
      const ry = r() < 0.5 ? '' : ` ry="${nr(alege([1, 3, 5, 30]))}"`;
      return `<rect${extra} x="${nr(coord())}" y="${nr(coord())}" width="${nr(int(1, 400) / 10)}" height="${nr(int(1, 400) / 10)}"${rx}${ry}/>`;
    }
    if (f === 5) return `<circle${extra} cx="${nr(coord())}" cy="${nr(coord())}" r="${nr(int(1, 300) / 10)}"/>`;
    if (f === 6) return `<ellipse${extra} cx="${nr(coord())}" cy="${nr(coord())}" rx="${nr(int(1, 300) / 10)}" ry="${nr(int(1, 300) / 10)}"/>`;
    if (f === 7) {
      const n = int(2, 8);
      const pts = Array.from({ length: n }, () => `${nr(coord())}${sep()}${nr(coord())}`);
      return `<${alege(['polygon', 'polygon', 'polyline'])}${extra} points="${pts.join(alege([' ', ', ', '  ']))}"/>`;
    }
    if (f === 8) return `<line${extra} x1="${nr(coord())}" y1="${nr(coord())}" x2="${nr(coord())}" y2="${nr(coord())}"/>`;
    return `<rect${extra} x="${nr(coord())}" y="${nr(coord())}" width="${nr(int(1, 300) / 10)}" height="${nr(int(1, 300) / 10)}" visibility="${alege(['hidden', 'visible'])}"/>`;
  };
  const grup = (adancime: number): string => {
    const n = int(1, 4);
    const copii: string[] = [];
    for (let i = 0; i < n; i++) copii.push(adancime < 3 && r() < 0.3 ? grup(adancime + 1) : forma());
    const tr = r() < 0.6 ? ` transform="${transform()}"` : '';
    const ascuns = r() < 0.05 ? ' display="none"' : '';
    const vis = r() < 0.05 ? ' visibility="hidden"' : '';
    return `<g${tr}${ascuns}${vis}>${copii.join('')}</g>`;
  };
  const pagina = alege([
    'width="100mm" height="100mm" viewBox="0 0 100 100"',
    'width="210mm" height="148mm" viewBox="0 0 210 148"',
    'width="120mm" height="80mm" viewBox="-10 -10 200 120" preserveAspectRatio="xMinYMax meet"',
    'width="120mm" height="80mm" viewBox="0 0 200 200" preserveAspectRatio="none"',
    'width="400" height="300"',
    'viewBox="0 0 300 300"',
    'width="5in" height="4in" viewBox="0 0 500 400" preserveAspectRatio="xMaxYMid slice"',
    '',
  ]);
  const n = int(1, 5);
  const corp: string[] = [];
  for (let i = 0; i < n; i++) corp.push(r() < 0.5 ? grup(0) : forma());
  return { text: `<svg xmlns="http://www.w3.org/2000/svg" ${pagina}>${corp.join('\n')}</svg>`, px: r() < 0.3 ? 72 : 96 };
}
