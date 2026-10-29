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
import type { CopieRetea, PozitieCurba } from './retea.ts';

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

/**
 * Curba măsurată pentru textul pe curbă (ADR 0108 §1): lungimea și locul la orice distanță `s` (mm, pe curbă), și dincolo de
 * capete: o curbă închisă se reia (s modulo lungimea), una deschisă continuă pe tangenta capătului (înapoi, înainte de
 * început). Într-un vârf, tangenta e a segmentului care pleacă din el; segmentele fără lungime nu dau tangenta capetelor.
 */
export type Parcurgere = { readonly lungime: number; readonly la: (s: number) => LocPeCurba };

export function parcurgere(c: Contur): Parcurgere | null {
  const segmente = Array.from({ length: numarSegmente(c) }, (_, i) => masoara(c, i));
  const cumul = [0];
  for (const x of segmente) cumul.push(cumul[cumul.length - 1]! + x.lungime);
  const total = cumul[segmente.length]!;
  if (!(total > LUNGIME_MINIMA)) return null;
  const pline = segmente.map((x, i) => i).filter((i) => segmente[i]!.lungime > 0);
  const primul = segmente[pline[0]!]!, ultimul = segmente[pline[pline.length - 1]!]!;
  const pe = (loc: LocPeCurba, d: number): LocPeCurba => {
    const u = (loc.unghi * Math.PI) / 180;
    return { p: { x: loc.p.x + d * Math.cos(u), y: loc.p.y + d * Math.sin(u) }, unghi: loc.unghi };
  };
  return {
    lungime: total,
    la: (s0) => {
      let s = s0;
      if (c.inchis) s = ((s % total) + total) % total;
      else if (s < 0) return pe(primul.la(0), s);
      else if (s > total) return pe(ultimul.la(ultimul.lungime), s - total);
      // Ultimul segment cu lungime care începe cel mult la s (căutare binară pe lungimile cumulate).
      let st = 0, dr = pline.length - 1;
      while (st < dr) {
        const m = (st + dr + 1) >> 1;
        if (cumul[pline[m]!]! <= s) st = m;
        else dr = m - 1;
      }
      const j = pline[st]!;
      return segmente[j]!.la(Math.min(Math.max(s - cumul[j]!, 0), segmente[j]!.lungime));
    },
  };
}

/**
 * Distanța pe curbă (mm, de la început) a punctului curbei cel mai apropiat de `q` (ADR 0108 §3: ancora unui text pe curbă):
 * eșantioane la cel mult 0,25 mm pe fiecare segment, secțiunea de aur în jurul celui mai bun, apoi zeroul derivatei distanței,
 * (P(s) − q) · T(s), prin bisecție, sub 1e-9 mm. Minimul singur nu se poate găsi mai bine de ~1e-7 mm: distanța e plată acolo
 * (pătratică), iar derivata trece prin zero oblic. Într-un colț, derivata sare peste zero, iar bisecția ajunge în colț.
 */
export function pozitiePeCurba(c: Contur, q: Punct): number | null {
  const par = parcurgere(c);
  if (!par) return null;
  const d = (s: number): number => { const p = par.la(s).p; return Math.hypot(p.x - q.x, p.y - q.y); };
  const derivata = (s: number): number => {
    const l = par.la(s), u = (l.unghi * Math.PI) / 180;
    return (l.p.x - q.x) * Math.cos(u) + (l.p.y - q.y) * Math.sin(u);
  };
  const n = Math.min(200_000, Math.max(64, Math.ceil(par.lungime / 0.25)));
  const pas = par.lungime / n;
  let best = 0, bd = Infinity;
  for (let k = 0; k <= n; k++) {
    const v = d(k * pas);
    if (v < bd) { bd = v; best = k * pas; }
  }
  const g = (Math.sqrt(5) - 1) / 2;
  let lo = c.inchis ? best - pas : Math.max(0, best - pas), hi = c.inchis ? best + pas : Math.min(par.lungime, best + pas);
  let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = d(x1), f2 = d(x2);
  for (let it = 0; it < 200 && hi - lo > 1e-10; it++) {
    if (f1 <= f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = d(x1); }
    else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = d(x2); }
  }
  let s = f1 <= f2 ? x1 : x2;
  // Zeroul derivatei lângă minimul găsit: ea crește prin zero (distanța scade, apoi crește).
  let a = c.inchis ? s - 1e-4 : Math.max(0, s - 1e-4), b = c.inchis ? s + 1e-4 : Math.min(par.lungime, s + 1e-4);
  if (derivata(a) < 0 && derivata(b) > 0) {
    for (let it = 0; it < 100 && b - a > 1e-13; it++) {
      const m = (a + b) / 2;
      if (derivata(m) < 0) a = m;
      else b = m;
    }
    if (d((a + b) / 2) <= d(s) + 1e-12) s = (a + b) / 2;
  }
  const rez = d(s) <= bd ? s : best;
  return c.inchis ? ((rez % par.lungime) + par.lungime) % par.lungime : rez;
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
 * Cât ajung contururile, de la punctul b, pe direcția unitară v (max ⟨p − b, v⟩ pe ele): exact pe linii (capetele), pe arce
 * (și punctul cercului spre v, dacă e pe arc) și pe cubice (și rădăcinile lui ⟨B′(t), v⟩ = 0, o ecuație de gradul doi).
 */
export function suport(contururi: readonly Contur[], b: Punct, v: Punct): number {
  let m = Number.NEGATIVE_INFINITY;
  const ia = (p: Punct): void => { m = Math.max(m, (p.x - b.x) * v.x + (p.y - b.y) * v.y); };
  for (const c of contururi) {
    for (let i = 0; i < numarSegmente(c); i++) {
      const { a, b: q, s } = segment(c, i);
      ia(a);
      ia(q);
      if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
        const { centru, raza, start, baleiaj } = cerculArcului(a, q, s.bulge);
        // Unghiul lui v, dus de la start în sensul baleiajului: pe arc dacă e cel mult cât baleiajul.
        const u = Math.atan2(v.y, v.x), doiPi = 2 * Math.PI;
        const rel = (((baleiaj >= 0 ? u - start : start - u) % doiPi) + doiPi) % doiPi;
        if (rel <= Math.abs(baleiaj)) ia({ x: centru.x + raza * v.x, y: centru.y + raza * v.y });
      } else if (s.tip === 'C') {
        const k = { a, c1: s.c1, c2: s.c2, b: q };
        const d = (p: Punct, r: Punct): number => (r.x - p.x) * v.x + (r.y - p.y) * v.y;
        const A0 = d(a, s.c1), A1 = d(s.c1, s.c2), A2 = d(s.c2, q);
        const A = A0 - 2 * A1 + A2, B = 2 * (A1 - A0);
        const radacini = Math.abs(A) < 1e-15 ? (Math.abs(B) < 1e-15 ? [] : [-A0 / B]) : (() => {
          const disc = B * B - 4 * A * A0;
          return disc < 0 ? [] : [(-B - Math.sqrt(disc)) / (2 * A), (-B + Math.sqrt(disc)) / (2 * A)];
        })();
        for (const t of radacini) if (t > 0 && t < 1) ia(peCubica(k, t));
      }
    }
  }
  return m;
}

/**
 * Pură: copiile selecției de-a lungul curbei `curba` (o instanță din selecție, cu o piesă dintr-un singur element), `numar`
 * copii, fiecare cu centrul cutiei formelor (fără curbă) într-un loc al curbei; cu `roteste`, rotită cu tangenta locului
 * (originalul stă cum e, deci o formă desenată „spre dreapta” urmează curba). Formele copiate sunt cele alese, fără curbă.
 * Poziția (ADR 0074 §3): `centru` mută centrul cu `distanta` pe normala din stânga mersului; `stanga` / `dreapta` așază
 * copia de acea parte, cu punctul ei cel mai apropiat de curbă (exact, pe contururi, cu rotirea copiei) la `distanta` de
 * tangenta locului.
 */
export function copiiPeCurba(
  doc: Document, indexFoaie: number, selectie: readonly string[],
  r: { readonly curba: string; readonly numar: number; readonly roteste: boolean; readonly pozitie?: PozitieCurba; readonly distanta?: number },
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
  const alese = elemente.filter((e) => forme.has(e.instanta));
  const cutie = alese.map((e) => cutieElement(e)).reduce(uneste, CUTIE_GOALA);
  const b = { x: (cutie.minX + cutie.maxX) / 2, y: (cutie.minY + cutie.maxY) / 2 };
  const pozitie = r.pozitie ?? 'centru', distanta = r.distanta ?? 0;
  const contururi = pozitie === 'centru' ? [] : alese.map((e) => conturElement(e));
  const copii = locuri.map((l) => {
    const unghi = r.roteste ? l.unghi : 0;
    const u = (l.unghi * Math.PI) / 180, n = { x: -Math.sin(u), y: Math.cos(u) };
    let s = distanta;
    if (pozitie !== 'centru') {
      // Cât ajunge copia spre curbă: suportul formelor pe direcția spre curbă, adusă în cadrul lor (rotirea copiei, inversă).
      const semn = pozitie === 'stanga' ? 1 : -1, w = (-unghi * Math.PI) / 180;
      const spre = { x: -semn * n.x, y: -semn * n.y };
      const v = { x: spre.x * Math.cos(w) - spre.y * Math.sin(w), y: spre.x * Math.sin(w) + spre.y * Math.cos(w) };
      s = semn * (suport(contururi, b, v) + distanta);
    }
    return { unghi, centru: b, dx: l.p.x - b.x + n.x * s, dy: l.p.y - b.y + n.y * s };
  });
  return { copii, instante, cutie };
}
