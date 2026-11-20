import { CUTIE_GOALA, cutieContur, uneste, type Cutie } from '../geom/cutie.ts';
import type { Contur, Punct } from '../geom/contur.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';

/**
 * Numărul panoului gravat pe el (ADR 0181, felia 10.3↑n): unde încap cifrele pe un panou tăiat. Pur și mic (firul principal).
 *
 * - **Locul bun:** cutia cifrelor stă toată în materialul panoului (regiunea par-impar a contururilor lui închise: placa,
 *   fără golurile ei) și la cel puțin `joc` de orice contur al lui (marginea, tăieturile, dinții, literele, liniile de gravat).
 * - **Proba:** niciun contur întreg înăuntrul cutiei (o literă, o gaură), iar probele de pe marginea cutiei (la pasul `joc / 2`)
 *   și mijlocul ei stau în material, la cel puțin `joc + joc / 4` de contururile din jur. Fiecare punct al marginii e la cel
 *   mult `joc / 4` de o probă, deci la cel puțin `joc` de orice contur; un contur care ar intra în cutie ar trece prin margine.
 * - **Căutarea:** lângă colțul din stânga-jos al cutiei panoului, o grilă fină (pasul, jumătate din mărimea cifrelor; 30 de pași
 *   pe fiecare axă), iar peste tot panoul, una rară (cel puțin a 60-a parte din el pe fiecare axă): cel mult ~4 500 de locuri,
 *   încercate de la cel mai apropiat de colț (la egalitate, cel de jos); primul loc bun. Nu rând cu rând: un panou cu dinți dedesubt are în primele rânduri doar dinții, iar numărul
 *   ar ajunge pe un dinte, departe de colț (văzut pe firma reală, felia 10.3↑n).
 */

/** Jocul dintre cifre și contururile panoului, în mm: un sfert din înălțime, cel puțin 2. */
export const jocNumar = (inaltime: number): number => Math.max(2, inaltime / 4);

const EPS = 1e-9;

/** Probele marginii cutiei `b` (colțurile și punctele dintre ele, la cel mult `pas`) și mijlocul ei. */
function probe(b: Cutie, pas: number): Punct[] {
  const rez: Punct[] = [{ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }];
  const latura = (a: Punct, c: Punct): void => {
    const n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / pas));
    for (let k = 0; k < n; k++) rez.push({ x: a.x + ((c.x - a.x) * k) / n, y: a.y + ((c.y - a.y) * k) / n });
  };
  const c0 = { x: b.minX, y: b.minY }, c1 = { x: b.maxX, y: b.minY }, c2 = { x: b.maxX, y: b.maxY }, c3 = { x: b.minX, y: b.maxY };
  latura(c0, c1);
  latura(c1, c2);
  latura(c2, c3);
  latura(c3, c0);
  return rez;
}

const seAting = (a: Cutie, b: Cutie, d: number): boolean => a.minX <= b.maxX + d && b.minX <= a.maxX + d && a.minY <= b.maxY + d && b.minY <= a.maxY + d;
const inauntru = (a: Cutie, b: Cutie): boolean => a.minX >= b.minX && a.maxX <= b.maxX && a.minY >= b.minY && a.maxY <= b.maxY;

/**
 * Originea textului cifrelor pe panou (unde se pune instanța lor), cu `cifre` cutia lor față de origine: primul loc bun, sau
 * null (panoul n-are loc). `contururi`: toate contururile panoului, în lume (închise și deschise).
 */
export function locNumar(contururi: readonly Contur[], cifre: Cutie, joc: number): Punct | null {
  const inchise = contururi.filter((c) => c.inchis);
  // Fără contururi închise, cutia panoului e goală și nu iese niciun loc (otrava N08: o probă separată era de prisos).
  if (!(joc > 0)) return null;
  const cutii = contururi.map(cutieContur);
  const K = inchise.reduce((k, c) => uneste(k, cutieContur(c)), CUTIE_GOALA);
  const w = cifre.maxX - cifre.minX, h = cifre.maxY - cifre.minY;
  if (!(w >= 0) || !(h > 0)) return null;
  const pas = joc / 2, departe = joc + pas / 2;
  const finX = Math.max(w / 2, pas), finY = Math.max(h / 2, pas);
  const rarX = Math.max(finX, (K.maxX - K.minX) / 60), rarY = Math.max(finY, (K.maxY - K.minY) / 60);
  const bun = (b: Cutie): boolean => {
    for (const c of cutii) if (inauntru(c, b)) return false;
    const aproape = contururi.filter((_, k) => seAting(cutii[k] as Cutie, b, departe));
    for (const q of probe(b, pas)) {
      if (!inRegiune(q, inchise)) return false;
      for (const c of aproape) if (distantaLaContur(q, c) < departe - EPS) return false;
    }
    return true;
  };
  const x0 = K.minX + departe, y0 = K.minY + departe;
  const locuri: Array<{ readonly x: number; readonly y: number; readonly d: number }> = [];
  const grila = (px: number, py: number, pasi: number): void => {
    for (let j = 0, y = y0; j < pasi && y + h <= K.maxY - departe + EPS; j++, y += py) {
      for (let i = 0, x = x0; i < pasi && x + w <= K.maxX - departe + EPS; i++, x += px) locuri.push({ x, y, d: (x - x0) ** 2 + (y - y0) ** 2 });
    }
  };
  grila(finX, finY, 30);
  grila(rarX, rarY, Infinity);
  locuri.sort((a, b) => a.d - b.d || a.y - b.y);
  for (const l of locuri) {
    if (bun({ minX: l.x, minY: l.y, maxX: l.x + w, maxY: l.y + h })) return { x: l.x - cifre.minX, y: l.y - cifre.minY };
  }
  return null;
}
