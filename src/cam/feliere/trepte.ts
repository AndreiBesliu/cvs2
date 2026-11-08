/**
 * Geometria treptelor unei piese plate (ADR 0191, felia 3.6l): zonele cu înălțimi diferite (buzunarele, găuririle și profilele
 * parțiale ale piesei „după CNC”) devin benzi de straturi. Pe stratul k, regiunea e piesa minus treptele care s-au terminat
 * sub el.
 *
 * - Booleanele: `normalizeaza` (nonzero -> par-impar, din ușa importului: muchiile comune, tangențele și arcele exacte), cu o
 *   cutie: A minus U = B minus (compl(A) ∪ U), unde compl(X) e o cutie trigonometrică plus contururile lui X, orientate după
 *   adâncime și inversate (înfășurarea 1 - w_X). Din ieșire se scoate conturul cutiei celei mai mari. Tot așa intersecția:
 *   A ∩ P = B minus (compl(A) ∪ compl(P)).
 * - Benzile: înălțimile treptelor, ca număr de straturi, sortate; banda b începe la stratul de după treapta ei și are regiunea
 *   benzii de dedesubt minus treptele care se termină acolo. Două benzi cu aceeași arie se unesc (o treaptă acoperită de una mai
 *   joasă nu schimbă nimic), iar o bandă goală taie vârful piesei.
 * - Capsulele: ce scoate o freză de rază r purtată pe o cale (centrul ei), ca reuniune de capsule: fiecare segment, cu
 *   capetele rotunde (un arc: sectorul de inel, sau felia, cu discurile capetelor, când raza arcului e sub r).
 */
import { arieCuSemn, cerculArcului, inverseaza, inSensTrigonometric, numarSegmente, segment, type Contur, type Varf } from '../../geom/contur.ts';
import { conturCerc, conturDreptunghi } from '../../geom/conturBaza.ts';
import { inRegiune } from '../../geom/distanta.ts';
import { normalizeaza } from '../../geom/nonzero.ts';
import type { Regiune } from '../../geom/offset.ts';
import { numarStraturi } from './fel.ts';
import type { SetariFeliere } from './profil.ts';

/** O treaptă: zona (contururi cu înfășurarea cel puțin 1 înăuntru și 0 afară, citite nonzero) și înălțimea ei de la pat (mm). */
export type Treapta = { readonly contururi: readonly Contur[]; readonly inaltime: number };

/** Sub atâta arie (mm²), o diferență de regiuni nu contează (o fâșie sub o linie, zgomotul booleanului). */
const ARIE_NEGLIJABILA = 0.01;

/** Adâncimea fiecărui contur într-o figură par-impar (în câte altele stă; nu se ating, deci un vârf ajunge). */
const adancimi = (c: readonly Contur[]): number[] => c.map((x, i) => {
  const p = x.varfuri[0]!.p;
  let n = 0;
  for (let j = 0; j < c.length; j++) if (j !== i && inRegiune(p, [c[j]!])) n++;
  return n;
});

/** Figura par-impar, orientată după adâncime (par: trigonometric, impar: orar): înfășurarea e 1 înăuntru și 0 afară. */
export function dupaAdancime(c: readonly Contur[]): Contur[] {
  const a = adancimi(c);
  return c.map((x, i) => { const t = inSensTrigonometric(x); return a[i]! % 2 === 0 ? t : inverseaza(t); });
}

/** Aria unei figuri par-impar (mm²). */
export function arieFigura(c: readonly Contur[]): number {
  const a = adancimi(c);
  return c.reduce((s, x, i) => s + (a[i]! % 2 === 0 ? 1 : -1) * Math.abs(arieCuSemn(x)), 0);
}

/** Regiunile unei figuri par-impar: fiecare exterior (adâncime pară, trigonometric) cu golurile lui (orar). */
export function regiuniDin(c: readonly Contur[]): Regiune[] {
  const a = adancimi(c);
  const ext = c.map((x, i) => ({ x, i })).filter((e) => a[e.i]! % 2 === 0)
    .map((e) => ({ exterior: inSensTrigonometric(e.x), gauri: [] as Contur[], arie: Math.abs(arieCuSemn(e.x)), ad: a[e.i]! }));
  c.forEach((x, i) => {
    if (a[i]! % 2 === 0) return;
    const p = x.varfuri[0]!.p;
    let gazda: (typeof ext)[number] | undefined;
    for (const e of ext) if (e.ad === a[i]! - 1 && inRegiune(p, [e.exterior]) && (!gazda || e.arie < gazda.arie)) gazda = e;
    gazda?.gauri.push(inverseaza(inSensTrigonometric(x)));
  });
  return ext.map(({ exterior, gauri }) => ({ exterior, gauri }));
}

/**
 * Un termen al combinării: o figură par-impar (sau, cu `infasurare`, contururi deja orientate, citite nonzero, ca treptele),
 * luată ca atare sau complementul ei (doar o figură).
 */
export type Termen = { readonly c: readonly Contur[]; readonly compl?: boolean; readonly infasurare?: boolean };

/**
 * Figura (par-impar) a lui B minus reuniunea termenilor, dacă vreun termen e un complement (diferența, intersecția); altfel,
 * reuniunea lor. Sau motivul normalizării.
 */
export function combina(termeni: readonly Termen[]): Contur[] | string {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of termeni) for (const c of t.c) for (const v of c.varfuri) { x0 = Math.min(x0, v.p.x); x1 = Math.max(x1, v.p.x); y0 = Math.min(y0, v.p.y); y1 = Math.max(y1, v.p.y); }
  if (!Number.isFinite(x0)) return [];
  const intrare: Contur[] = [];
  let k = 0;
  for (const t of termeni) {
    const o = t.infasurare ? [...t.c] : dupaAdancime(t.c);
    if (t.compl) {
      // Cutii una în alta (10, 20, ... mm în jur): niciuna nu atinge altceva, iar cea mai mare rămâne conturul exterior al ieșirii.
      k++;
      const m = 10 * k;
      intrare.push(conturDreptunghi(x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m));
      for (const c of o) intrare.push(inverseaza(c));
    } else for (const c of o) intrare.push(c);
  }
  if (intrare.length === 0) return [];
  const r = normalizeaza(intrare.map((c) => c.varfuri));
  if (!r.ok) return `booleanul treptelor: ${r.motiv}`;
  const iesire: Contur[] = r.cai.map((v: readonly Varf[]) => ({ inchis: true, varfuri: v })).filter((c) => Math.abs(arieCuSemn(c)) > 1e-9);
  if (k === 0) return iesire;
  const m = 10 * k;
  return iesire.filter((c) => {
    let a0 = Infinity, b0 = Infinity;
    for (const v of c.varfuri) { a0 = Math.min(a0, v.p.x); b0 = Math.min(b0, v.p.y); }
    return !(Math.abs(a0 - (x0 - m)) < 1e-6 && Math.abs(b0 - (y0 - m)) < 1e-6);
  });
}

/**
 * Ce scoate o freză de rază r purtată pe calea `c` (centrul ei, deschisă sau închisă): capsulele segmentelor, fiecare în sens
 * trigonometric, de citit nonzero (se suprapun la îmbinări). O linie: dreptunghiul cu două semicercuri. Un arc de rază R > r:
 * sectorul de inel dintre R - r și R + r, cu semicercurile capetelor; altfel felia până la R + r și discurile capetelor.
 */
export function capsule(c: Contur, r: number): Contur[] {
  const rez: Contur[] = [];
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
      // Sensul trigonometric: un arc orar se ia de la capăt la început.
      const [p, q, beta] = s.bulge > 0 ? [a, b, s.bulge] : [b, a, -s.bulge];
      const { centru: o, raza: R } = cerculArcului(p, q, beta);
      const ux = (p.x - o.x) / R, uy = (p.y - o.y) / R, vx = (q.x - o.x) / R, vy = (q.y - o.y) / R;
      const pe = { x: o.x + ux * (R + r), y: o.y + uy * (R + r) }, qe = { x: o.x + vx * (R + r), y: o.y + vy * (R + r) };
      if (R - r > 1e-6) {
        const pi = { x: o.x + ux * (R - r), y: o.y + uy * (R - r) }, qi = { x: o.x + vx * (R - r), y: o.y + vy * (R - r) };
        rez.push({ inchis: true, varfuri: [{ p: pe, s: { tip: 'A', bulge: beta } }, { p: qe, s: { tip: 'A', bulge: 1 } }, { p: qi, s: { tip: 'A', bulge: -beta } }, { p: pi, s: { tip: 'A', bulge: 1 } }] });
      } else {
        rez.push({ inchis: true, varfuri: [{ p: o, s: { tip: 'L' } }, { p: pe, s: { tip: 'A', bulge: beta } }, { p: qe, s: { tip: 'L' } }] });
        rez.push(conturCerc(p.x, p.y, r), conturCerc(q.x, q.y, r));
      }
      continue;
    }
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-9) { rez.push(conturCerc(a.x, a.y, r)); continue; }
    const nx = (-(b.y - a.y) / L) * r, ny = ((b.x - a.x) / L) * r;
    rez.push({
      inchis: true,
      varfuri: [
        { p: { x: a.x - nx, y: a.y - ny }, s: { tip: 'L' } }, { p: { x: b.x - nx, y: b.y - ny }, s: { tip: 'A', bulge: 1 } },
        { p: { x: b.x + nx, y: b.y + ny }, s: { tip: 'L' } }, { p: { x: a.x + nx, y: a.y + ny }, s: { tip: 'A', bulge: 1 } },
      ],
    });
  }
  if (rez.length === 0 && c.varfuri.length > 0) rez.push(conturCerc(c.varfuri[0]!.p.x, c.varfuri[0]!.p.y, r));
  return rez;
}

/** Benzile unei piese: regiunile (prima, piesa întreagă), straturile la care încep (prima, la 1) și câte straturi are piesa. */
export type Benzi = { readonly regiuni: readonly (readonly Contur[])[]; readonly inceput: readonly number[]; readonly n: number };

/** Benzile piesei cu contururile date (par-impar), de înălțimea H, cu treptele ei; sau motivul unui boolean refuzat. */
export function benziPiesa(contururi: readonly Contur[], trepte: readonly Treapta[], H: number, s: SetariFeliere): Benzi | string {
  const n = numarStraturi(H, s);
  const cu = trepte.map((t) => ({ t, n: numarStraturi(t.inaltime, s) })).filter((x) => x.n < n && x.t.contururi.length > 0);
  const regiuni: (readonly Contur[])[] = [contururi];
  const inceput = [1];
  if (cu.length === 0) return { regiuni, inceput, n };
  let arieJos = arieFigura(contururi);
  for (const m of [...new Set(cu.map((x) => x.n))].sort((a, b) => a - b)) {
    const r = combina([{ c: regiuni.at(-1)!, compl: true }, { c: cu.filter((x) => x.n === m).flatMap((x) => x.t.contururi), infasurare: true }]);
    if (typeof r === 'string') return r;
    const a = r.length === 0 ? 0 : arieFigura(r);
    // Nimic deasupra: piesa se oprește la vârful treptei.
    if (a < ARIE_NEGLIJABILA) return { regiuni, inceput, n: m };
    if (arieJos - a < ARIE_NEGLIJABILA) continue;
    regiuni.push(r); inceput.push(m + 1); arieJos = a;
  }
  return { regiuni, inceput, n };
}
