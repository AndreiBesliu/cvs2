import { areDepasire, CUTIE_GOALA, cuPunct, cutieArc, depasire, largita, uneste, type Cutie, type Depasire } from '../geom/cutie.ts';
import { baleiajArc, type Miscare, type Program } from '../ir/ir.ts';

/**
 * Cât iese freza din foaie cât taie. Decizia owner-ului (07.10.2026): o formă poate ieși din foaie intenționat, freza o
 * urmează și în afara foii, iar exportul cere confirmare, scrisă apoi în antetul programului.
 *
 * Se măsoară pe traseul real, nu pe vector: discul frezei (raza = diametrul / 2) purtat pe porțiunea de sub fața de sus a
 * fiecărei tăieri (G1, G2, G3). O mișcare care trece prin fața de sus (o rampă, o elice de intrare) se taie exact în
 * punctul unde Z = 0. Rapidele nu contează: trec prin aer, la Z sigur.
 *
 * Foaia e un dreptunghi paralel cu axele, deci discul rămâne în ea exact când cutia lui rămâne; iar cutia discului e cutia
 * traseului lărgită cu raza. Calculul e exact (arcele prin punctele lor de pe axe), fără eșantionare.
 *
 * Pragul e jumătate din rezoluția de 0,001 mm a postului (`PRAG_REZOLUTIE`): sub el, nici o adâncime, nici o ieșire nu
 * supraviețuiesc rotunjirii la 3 zecimale, deci n-au ce confirma. Peste el, orice ieșire se declară și apare în antet cu
 * cel puțin 0.001 pe o latură, iar oracolul independent o măsoară pe text cu toleranța lui.
 */
export const PRAG_REZOLUTIE = 0.0005;

export type IesireFoaie = {
  readonly depasire: Depasire;
  /** Id-urile elementelor documentului ale căror tăieri ies, în ordinea din program. */
  readonly elemente: readonly string[];
  /**
   * Amprenta traseului măsurat (mișcări, freză, foaie). Confirmarea omului acoperă exact traseul arătat: aceleași patru
   * numere pe alt traseu (o formă mutată pe aceeași latură) cer o confirmare nouă.
   */
  readonly amprenta: string;
};

type P3 = { readonly x: number; readonly y: number; readonly z: number };

/** Cutia porțiunii de sub fața de sus a unei tăieri de la `a` la `b` (linie sau arc), sau cutia goală. */
function cutieSubSuprafata(a: P3, b: P3, m: Extract<Miscare, { tip: 'taiere' | 'arc' }>): Cutie {
  if (Math.min(a.z, b.z) >= -PRAG_REZOLUTIE) return CUTIE_GOALA;
  // Fracțiunea mișcării (în lungime pentru linie, în unghi pentru elice) dintre care porțiunea e sub Z = 0.
  let f0 = 0;
  let f1 = 1;
  if (a.z >= 0) f0 = a.z / (a.z - b.z);
  else if (b.z >= 0) f1 = a.z / (a.z - b.z);
  if (m.tip === 'taiere') {
    const la = (f: number): { x: number; y: number } => (f === 0 ? a : f === 1 ? b : { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) });
    return cuPunct(cuPunct(CUTIE_GOALA, la(f0)), la(f1));
  }
  const baleiaj = baleiajArc(a, b, m.centru, m.sens === 'trigonometric');
  if (f0 === 0 && f1 === 1) return cutieArc(a, b, m.centru, baleiaj);
  const raza = Math.hypot(a.x - m.centru.x, a.y - m.centru.y);
  const u0 = Math.atan2(a.y - m.centru.y, a.x - m.centru.x);
  const pe = (f: number): { x: number; y: number } => (f === 0 ? a : f === 1 ? b
    : { x: m.centru.x + raza * Math.cos(u0 + f * baleiaj), y: m.centru.y + raza * Math.sin(u0 + f * baleiaj) });
  return cutieArc(pe(f0), pe(f1), m.centru, (f1 - f0) * baleiaj);
}

/** Două variante FNV-1a pe 32 de biți, alăturate: o amprentă de egalitate, nu de securitate. */
function amprentaText(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function iesireDinFoaie(program: Program, foaie: { readonly latime: number; readonly inaltime: number }): IesireFoaie | null {
  const raza = program.scula.diametru / 2;
  let x: number | undefined;
  let y: number | undefined;
  let z: number | undefined;
  let element: string | undefined;
  let total = CUTIE_GOALA;
  const elemente: string[] = [];
  for (const m of program.miscari) {
    if (m.tip === 'eticheta') { element = m.element; continue; }
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const nx = m.la.X ?? x;
    const ny = m.la.Y ?? y;
    const nz = m.la.Z ?? z;
    if (m.tip !== 'rapida' && nx !== undefined && ny !== undefined && nz !== undefined) {
      // Cu startul necunoscut (prima mișcare), doar capătul e o poziție sigură.
      const c = cutieSubSuprafata({ x: x ?? nx, y: y ?? ny, z: z ?? nz }, { x: nx, y: ny, z: nz }, m);
      if (c.minX <= c.maxX) {
        const disc = largita(c, raza);
        if (areDepasire(depasire(disc, foaie.latime, foaie.inaltime, PRAG_REZOLUTIE)) && element !== undefined && !elemente.includes(element)) {
          elemente.push(element);
        }
        total = uneste(total, disc);
      }
    }
    x = nx;
    y = ny;
    z = nz;
  }
  const d = depasire(total, foaie.latime, foaie.inaltime, PRAG_REZOLUTIE);
  if (!areDepasire(d)) return null;
  const amprenta = amprentaText(JSON.stringify([program.miscari, program.scula.diametru, foaie.latime, foaie.inaltime]));
  return { depasire: d, elemente, amprenta };
}
