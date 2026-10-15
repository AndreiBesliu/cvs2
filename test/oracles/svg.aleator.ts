/**
 * Generatorul de SVG-uri aleatoare (cu sămânță) al oracolului SVG: grupuri imbricate cu transformări de toate felurile
 * (și oglindiri), forme de toate felurile, căi cu toate comenzile (absolute și relative, repetarea implicită, S / T după
 * orice, arce cu steaguri, raze prea mici, raze 0, capete egale), numere scrise în feluri diferite (lipite, exponenți,
 * `.5`), atribute de stil, umplerea (`fill`, sub-felia 2.3c-1, dintr-un șir aleator separat). ZERO importuri din `src/`. Nu
 * are valori pe hârtie: îl judecă oracolul.
 *
 * Sub-felia 2.3c-3 (ADR 0037 §11): generatorul face deja căi deschise (subcăile fără `Z` cu `fill="none"`, ~15 % × ~25 %,
 * orice `line`, `polyline`-urile fără umplere, „M L”-urile umplute pe o dreaptă), deci nu se schimbă: aceleași fișiere pe
 * aceleași semințe. Pe cele 240, oracolul importă 87 de căi deschise în cele 97 de fișiere fără forme de normalizat (sonda
 * de autoconsistență din 13.10: rezultatul construit din oracol trece de `judecaRezultat`, 0 probleme).
 *
 * Precizarea 2.3c-6 (ADR 0037 §11, „Închiderea fără arie lasă o linie”): subcăile închise fără arie pe care generatorul
 * le făcea deja (poligoanele din 2 puncte, `M … H … Z`, arcele cu raza 0, cubicele pe o dreaptă) sunt acum linii, după
 * oracol. În plus, dintr-un șir aleator separat (geometria și umplerea de dinainte rămân aceleași pe fiecare sămânță), ~40 %
 * din fișiere primesc la coadă o formă „fără arie” (`formaFaraArie`): 88 din 240, dintre care 62 de linii (de autor, de
 * umplere, de ușă, exacte sau cu zgomot, cu mânere) și 26 de contraexemple (contururi subțiri, dar departe de prag). Sonda
 * de autoconsistență din 15.10: 156 de căi deschise în cele 103 fișiere fără forme de normalizat, 0 probleme.
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
  // Sub-felia 2.3c-1 (ADR 0037 §11): umplerea (`fill`) din alt șir aleator, ca geometria fiecărei semințe să rămână cea
  // de dinainte; `fill="none"` lasă deschise subcăile fără `Z` (umplute, se închid cu o linie).
  const rUmplere = aleator((Math.imul(samanta, 0x9e3779b1) ^ 0x5bd1e995) >>> 0);
  const umplere = (pNone: number, pPlin: number): string => {
    const x = rUmplere();
    return x < pNone ? ' fill="none"' : x < pNone + pPlin ? ' fill="#123"' : '';
  };
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
    const extra = `${stil}${id}${tr}${umplere(0.25, 0.1)}`;
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
    return `<g${tr}${ascuns}${vis}${umplere(0.15, 0)}>${copii.join('')}</g>`;
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
  // Precizarea 2.3c-6 (ADR 0037 §11): din al treilea șir aleator (geometria și umplerea de dinainte rămân aceleași pe
  // fiecare sămânță), în ~40 % din fișiere, o formă „fără arie” la coada desenului (`formaFaraArie`).
  const rLinie = aleator((Math.imul(samanta, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0);
  if (rLinie() < 0.4) corp.push(formaFaraArie(rLinie));
  return { text: `<svg xmlns="http://www.w3.org/2000/svg" ${pagina}>${corp.join('\n')}</svg>`, px: r() < 0.3 ? 72 : 96 };
}

/**
 * Precizarea 2.3c-6: o subcale închisă care e (sau nu e) o linie, departe de praguri, fără transformare (doar pagina, cu
 * scara între 0,24 și 1 mm pe unitate, uneori neuniformă). Punctele (vârfurile și mânerele) stau la cel mult 0,0015
 * unități de o dreaptă de 10 … 60 de unități: față de dreapta oricăror două puncte de la capete, cel mult 2 · 0,0015 =
 * 0,003 mm < 0,005 (o linie, fără să conteze care pereche e „cea mai depărtată”); pe dreptele orizontale / verticale,
 * uneori exact (punctul 2). Contraexemplele au un punct la 0,06 … 0,5 unități (≥ 0,024 mm după pagină > 0,005): rămân
 * contururi. Închiderile: de autor (Z, polygon, rect, prin apropiere), de umplere (fără Z), de ușă (fill="none", golul de
 * 0,001 … 0,0015 unități, de-a lungul dreptei).
 */
function formaFaraArie(q: () => number): string {
  const int = (a: number, b: number): number => a + Math.floor(q() * (b - a + 1));
  const alege = <T>(l: readonly T[]): T => l[Math.floor(q() * l.length)] as T;
  const f = (v: number): string => v.toFixed(4);
  const grade = alege([0, 90, 0, 90, 15, 30, 45, 60, 120, 135, 160, 200, 290]);
  const axa = grade % 90 === 0;
  const ux = axa ? Math.round(Math.cos((grade * Math.PI) / 180)) : Math.cos((grade * Math.PI) / 180);
  const uy = axa ? Math.round(Math.sin((grade * Math.PI) / 180)) : Math.sin((grade * Math.PI) / 180);
  const ax = int(20, 150) / 2, ay = int(20, 150) / 2, L = int(10, 60);
  const exact = axa && q() < 0.5;
  const zg = (): number => (exact ? 0 : int(-15, 15) / 10_000);
  /** Punctul de la parametrul t pe dreaptă, decalat perpendicular cu d (unități). */
  const pt = (t: number, d: number): string => `${f(ax + ux * L * t - uy * d)} ${f(ay + uy * L * t + ux * d)}`;
  const departe = (): number => ((q() < 0.5 ? -1 : 1) * int(6, 50)) / 100;
  const contur = q() < 0.25;
  const stil = q() < 0.2 ? ' fill-rule="evenodd"' : '';
  const tip = int(0, 7);
  if (tip <= 1) {
    // Poligonul sau calea cu Z: 2 … 5 puncte pe dreaptă, în ordine; contraexemplul are un punct la mijloc departe.
    const k = int(2, 5);
    const ts = Array.from({ length: k }, (_, i) => (k === 1 ? 0 : i / (k - 1)));
    const pts = ts.map((t, i) => pt(t, contur && i === 1 ? departe() : zg()));
    if (contur && k === 2) pts.splice(1, 0, pt(0.5, departe()));
    return tip === 0 ? `<polygon${stil} points="${pts.join(' ')}"/>` : `<path${stil} d="M ${pts.join(' L ')} ${alege(['Z', 'z'])}"/>`;
  }
  if (tip === 2 || tip === 3) {
    // Umplută, fără Z: o cubică (C) sau o pătratică (Q) cu mânerele pe dreaptă, cu zgomot; contraexemplul are un mâner departe.
    const umplere = alege(['', ' fill="#123"']);
    const p0 = pt(0, zg()), p1 = pt(1, zg());
    if (tip === 2) {
      const t1 = int(0, 10) / 10, t2 = int(0, 10) / 10;
      return `<path${stil}${umplere} d="M ${p0} C ${pt(t1, contur ? departe() : zg())} ${pt(t2, zg())} ${p1}"/>`;
    }
    return `<path${stil}${umplere} d="M ${p0} Q ${pt(int(1, 9) / 10, contur ? departe() : zg())} ${p1}"/>`;
  }
  if (tip === 4) {
    // fill="none", închisă de ușă: întoarsă în start, cu golul de 0,001 … 0,0015 unități de-a lungul dreptei.
    const gol = int(10, 15) / 10_000;
    return `<path fill="none" d="M ${pt(0, zg())} L ${pt(1, zg())} L ${contur ? `${pt(0.5, departe())} L ` : ''}${pt(gol / L, zg())}"/>`;
  }
  if (tip === 5) {
    // Închisă de autor prin apropiere: dus-întors, înapoi exact în start.
    const p0 = pt(0, zg());
    return `<path${stil} d="M ${p0} L ${pt(1, zg())} L ${contur ? `${pt(0.5, departe())} L ` : ''}${p0}"/>`;
  }
  if (tip === 6) {
    // Polilinia umplută: închisă de umplere.
    const pts = [pt(0, zg()), pt(0.4, contur ? departe() : zg()), pt(1, zg())];
    return `<polyline${stil} points="${pts.join(' ')}"/>`;
  }
  // Dreptunghiul subțire, pe axe: grosimea 0,0005 … 0,0015 unități (linie) sau 0,06 … 0,5 (contur).
  const h = contur ? Math.abs(departe()) : int(5, 15) / 10_000;
  const [w, hh] = grade % 180 === 0 ? [L, h] : [h, L];
  return `<rect${stil} x="${f(ax)}" y="${f(ay)}" width="${f(w)}" height="${f(hh)}"/>`;
}
