/**
 * Copierea de-a lungul unei curbe (ADR 0066), partea pură: locurile la distanțe egale pe lungimea unei curbe (cu tangenta în
 * fiecare) și copiile selecției așezate în ele. Liniile și arcele se măsoară exact; cubicele, cu cuadratura Gauss–Legendre
 * pe bucăți (eroarea sub 1e-9 mm pe curbele desenate). Pe o curbă deschisă, copiile merg de la capăt la capăt (ambele
 * incluse); pe una închisă, la pas egal pe tot conturul, de la primul ei vârf.
 */
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import type { Document, Instanta } from './document.ts';
import { conturElement, cutieElement } from './forme.ts';
import { elementeFoaie } from './lume.ts';
import type { CopieRetea } from './retea.ts';

/** Un loc pe curbă: punctul și direcția tangentei (grade, trigonometric, în sensul curbei). */
export type LocPeCurba = { readonly p: Punct; readonly unghi: number };

/** De ce copierea pe curbă nu se poate face: curba lipsă, compusă (mai multe contururi), prea scurtă, sau nimic de copiat. */
export type MotivCurba = 'curba' | 'curba-compusa' | 'curba-scurta' | 'fara-forme';

/** Sub atâta (mm), curba nu are lungime. */
const LUNGIME_MINIMA = 1e-6;
/** Nodurile și ponderile Gauss–Legendre cu 8 puncte, pe [−1, 1]. */
const GL_X = [-0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498, 0.1834346424956498, 0.5255324099163290, 0.7966664774136267, 0.9602898564975363];
const GL_W = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620, 0.3626837833783620, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];
/** Bucățile unei cubice pentru cuadratură și pentru căutarea parametrului. */
const BUCATI_CUBICA = 32;

type Cubica = { readonly a: Punct; readonly c1: Punct; readonly c2: Punct; readonly b: Punct };

const derivata = (q: Cubica, t: number): Punct => {
  const m = 1 - t;
  return {
    x: 3 * m * m * (q.c1.x - q.a.x) + 6 * m * t * (q.c2.x - q.c1.x) + 3 * t * t * (q.b.x - q.c2.x),
    y: 3 * m * m * (q.c1.y - q.a.y) + 6 * m * t * (q.c2.y - q.c1.y) + 3 * t * t * (q.b.y - q.c2.y),
  };
};
const peCubica = (q: Cubica, t: number): Punct => {
  const m = 1 - t;
  return {
    x: m * m * m * q.a.x + 3 * m * m * t * q.c1.x + 3 * m * t * t * q.c2.x + t * t * t * q.b.x,
    y: m * m * m * q.a.y + 3 * m * m * t * q.c1.y + 3 * m * t * t * q.c2.y + t * t * t * q.b.y,
  };
};
/** Lungimea cubicei între t0 și t1 (Gauss–Legendre cu 8 puncte). */
function lungimeIntre(q: Cubica, t0: number, t1: number): number {
  const h = (t1 - t0) / 2, m = (t0 + t1) / 2;
  let s = 0;
  for (let k = 0; k < 8; k++) { const d = derivata(q, m + h * GL_X[k]!); s += GL_W[k]! * Math.hypot(d.x, d.y); }
  return s * h;
}

/** Un segment al curbei, măsurat: lungimea și punctul cu tangenta la distanța `s` de la începutul lui. */
type SegmentMasurat = { readonly lungime: number; readonly la: (s: number) => LocPeCurba };

const grade = (x: number, y: number): number => ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

function masoara(c: Contur, i: number): SegmentMasurat {
  const { a, b, s } = segment(c, i);
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const semn = baleiaj >= 0 ? 1 : -1;
    return {
      lungime: Math.abs(baleiaj) * raza,
      la: (d) => {
        const u = start + semn * (d / raza);
        // Tangenta e perpendiculară pe rază, în sensul baleiajului.
        return { p: { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) }, unghi: grade(-semn * Math.sin(u), semn * Math.cos(u)) };
      },
    };
  }
  if (s.tip === 'C') {
    const q: Cubica = { a, c1: s.c1, c2: s.c2, b };
    const cumul = [0];
    for (let k = 1; k <= BUCATI_CUBICA; k++) cumul.push(cumul[k - 1]! + lungimeIntre(q, (k - 1) / BUCATI_CUBICA, k / BUCATI_CUBICA));
    const total = cumul[BUCATI_CUBICA]!;
    return {
      lungime: total,
      la: (d) => {
        // Bucata în care cade d, apoi Newton pe lungimea de la începutul bucății (derivata e viteza), păzit de capete.
        let k = 0;
        while (k < BUCATI_CUBICA - 1 && cumul[k + 1]! < d) k++;
        const t0 = k / BUCATI_CUBICA, t1 = (k + 1) / BUCATI_CUBICA;
        let t = t0 + ((d - cumul[k]!) / Math.max(cumul[k + 1]! - cumul[k]!, 1e-300)) * (t1 - t0);
        for (let n = 0; n < 8; n++) {
          const v = derivata(q, t), viteza = Math.hypot(v.x, v.y);
          if (viteza < 1e-12) break;
          t = Math.min(t1, Math.max(t0, t - (cumul[k]! + lungimeIntre(q, t0, t) - d) / viteza));
        }
        let v = derivata(q, t);
        if (Math.hypot(v.x, v.y) < 1e-12) v = { x: b.x - a.x, y: b.y - a.y };
        return { p: peCubica(q, t), unghi: grade(v.x, v.y) };
      },
    };
  }
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  const unghi = grade(b.x - a.x, b.y - a.y);
  return { lungime: l, la: (d) => ({ p: l > 0 ? { x: a.x + ((b.x - a.x) * d) / l, y: a.y + ((b.y - a.y) * d) / l } : a, unghi }) };
}

/** Lungimea curbei (mm, pe curbă). */
export function lungimeCurba(c: Contur): number {
  let s = 0;
  for (let i = 0; i < numarSegmente(c); i++) s += masoara(c, i).lungime;
  return s;
}

/**
 * Pură: `numar` locuri la distanțe egale pe lungimea curbei. Deschisă: de la capăt la capăt, ambele incluse (un singur loc:
 * începutul); închisă: la pasul lungime / numar, de la primul vârf. Într-un vârf, tangenta e a segmentului care pleacă din el
 * (la capătul unei curbe deschise, a celui care ajunge). Curba fără lungime: nimic.
 */
export function locuriPeCurba(c: Contur, numar: number): LocPeCurba[] {
  const segmente = Array.from({ length: numarSegmente(c) }, (_, i) => masoara(c, i));
  const total = segmente.reduce((s, x) => s + x.lungime, 0);
  if (!(total > LUNGIME_MINIMA) || numar < 1) return [];
  const pas = c.inchis ? total / numar : numar > 1 ? total / (numar - 1) : 0;
  const out: LocPeCurba[] = [];
  let j = 0, inceput = 0;
  for (let k = 0; k < numar; k++) {
    const d = Math.min(k * pas, total);
    // Segmentul care pleacă din punct; la capătul unei curbe deschise, ultimul.
    while (j < segmente.length - 1 && inceput + segmente[j]!.lungime <= d) { inceput += segmente[j]!.lungime; j++; }
    out.push(segmente[j]!.la(Math.min(d - inceput, segmente[j]!.lungime)));
  }
  return out;
}

/**
 * Pură: copiile selecției de-a lungul curbei `curba` (o instanță din selecție, cu o piesă dintr-un singur element), `numar`
 * copii, fiecare cu centrul cutiei formelor (fără curbă) într-un loc al curbei; cu `roteste`, rotită cu tangenta locului
 * (originalul stă cum e, deci o formă desenată „spre dreapta” urmează curba). Formele copiate sunt cele alese, fără curbă.
 */
export function copiiPeCurba(
  doc: Document, indexFoaie: number, selectie: readonly string[], r: { readonly curba: string; readonly numar: number; readonly roteste: boolean },
): { readonly copii: CopieRetea[]; readonly instante: Instanta[]; readonly cutie: Cutie } | MotivCurba {
  const foaie = doc.foi[indexFoaie];
  if (!foaie || !selectie.includes(r.curba) || !foaie.instante.some((i) => i.id === r.curba)) return 'curba';
  const elemente = elementeFoaie(doc, indexFoaie);
  const deCurba = elemente.filter((e) => e.instanta === r.curba);
  if (deCurba.length !== 1) return 'curba-compusa';
  const forme = new Set(selectie.filter((id) => id !== r.curba));
  const instante = foaie.instante.filter((i) => forme.has(i.id));
  if (instante.length === 0) return 'fara-forme';
  const locuri = locuriPeCurba(conturElement(deCurba[0]!), r.numar);
  if (locuri.length === 0) return 'curba-scurta';
  const cutie = elemente.filter((e) => forme.has(e.instanta)).map((e) => cutieElement(e)).reduce(uneste, CUTIE_GOALA);
  const b = { x: (cutie.minX + cutie.maxX) / 2, y: (cutie.minY + cutie.maxY) / 2 };
  const copii = locuri.map((l) => ({ unghi: r.roteste ? l.unghi : 0, centru: b, dx: l.p.x - b.x, dy: l.p.y - b.y }));
  return { copii, instante, cutie };
}
