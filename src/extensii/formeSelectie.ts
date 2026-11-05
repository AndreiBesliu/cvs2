/**
 * Formele selecției, pentru o extensie (ADR 0166 §B): contururile exacte ale instanțelor alese, în lume (`elementeFoaie`,
 * `conturElement`, aceleași ca la pânză și la exportul 2D), în mm ai foii (originea în colțul stânga-jos, Y în sus), cu
 * arcele, cercurile și cubicele aproximate prin segmente, la cel mult `TOLERANTA_FORME` de forma exactă. Peste plafoane, sau
 * fără nicio formă, refuzul: extensia îl spune omului în fereastra ei. Vine la cerere, la „Trimite la <extensie>”.
 */
import type { ConturCvs2, FormeCvs2 } from '../../extensii/api.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import type { Document } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';

/** Cât se poate depărta un segment al aproximării de forma exactă, în mm. */
export const TOLERANTA_FORME = 0.02;
export const PLAFOANE_FORME = { contururi: 10_000, puncte: 200_000 } as const;

type Pct = [number, number];
/** Coordonatele, la 0,0001 mm: aceleași forme dau aceleași date, iar mesajul spre cadru rămâne mic. */
const rotunjit = (v: number): number => Math.round(v * 1e4) / 1e4;
const pct = (p: Punct): Pct => [rotunjit(p.x), rotunjit(p.y)];

/** Punctele arcului de la `a` la `b` (fără `a`), cu săgeata fiecărei coarde de cel mult `tol`. */
function puncteArc(a: Punct, b: Punct, bulge: number, tol: number, out: Pct[]): void {
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, bulge);
  // săgeata unei coarde de unghi u e r·(1 − cos(u / 2)): u ≤ 2·acos(1 − tol / r)
  const pas = raza <= tol ? Math.PI : 2 * Math.acos(1 - tol / raza);
  const n = Math.min(4096, Math.max(1, Math.ceil(Math.abs(baleiaj) / pas)));
  for (let k = 1; k < n; k++) {
    const u = start + (baleiaj * k) / n;
    out.push(pct({ x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) }));
  }
  out.push(pct(b));
}

/** Punctele cubicei (fără primul capăt): împărțită în două până când punctele de control stau la cel mult `tol` de coardă. */
function puncteCubica(a: Punct, c1: Punct, c2: Punct, b: Punct, tol: number, out: Pct[], adanc = 0): void {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
  const dist = (p: Punct): number => (l < 1e-12 ? Math.hypot(p.x - a.x, p.y - a.y) : Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / l);
  if (adanc >= 16 || Math.max(dist(c1), dist(c2)) <= tol) { out.push(pct(b)); return; }
  const m = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const p01 = m(a, c1), p12 = m(c1, c2), p23 = m(c2, b), p012 = m(p01, p12), p123 = m(p12, p23), mij = m(p012, p123);
  puncteCubica(a, p01, p012, mij, tol, out, adanc + 1);
  puncteCubica(mij, p123, p23, b, tol, out, adanc + 1);
}

/** Conturul exact, ca puncte: liniile la capete, arcele și cubicele prin segmente; unul închis nu-și repetă primul punct. */
export function puncteContur(c: Contur, tol = TOLERANTA_FORME): Pct[] {
  const n = numarSegmente(c);
  const prim = c.varfuri[0];
  if (!prim) return [];
  const out: Pct[] = [pct(prim.p)];
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) puncteArc(a, b, s.bulge, tol, out);
    else if (s.tip === 'C') puncteCubica(a, s.c1, s.c2, b, tol, out);
    else out.push(pct(b));
  }
  if (c.inchis && out.length > 1) out.pop();
  // punctele care se repetă unul după altul (o linie de lungime zero) nu spun nimic
  return out.filter((p, i) => i === 0 || p[0] !== out[i - 1]![0] || p[1] !== out[i - 1]![1]);
}

/** Formele instanțelor din `selectie`, de pe foaia `indexFoaie`, pentru extensie (plafoanele se pot da, pentru probe). */
export function formeSelectie(doc: Document, selectie: readonly string[], indexFoaie = 0,
  plafoane: { readonly contururi: number; readonly puncte: number } = PLAFOANE_FORME): FormeCvs2 {
  const alese = new Set(selectie);
  const contururi: ConturCvs2[] = [];
  let puncte = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (!alese.has(e.instanta)) continue;
    const c = conturElement(e);
    const p = puncteContur(c);
    if (p.length < 2) continue;
    puncte += p.length;
    if (contururi.length >= plafoane.contururi || puncte > plafoane.puncte) return { versiune: 1, ok: false, motiv: 'prea-mare' };
    for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    contururi.push({ inchis: c.inchis, puncte: p });
  }
  if (contururi.length === 0) return { versiune: 1, ok: false, motiv: 'nimic' };
  return { versiune: 1, ok: true, unitate: 'mm', contururi, cutie: { x0, y0, x1, y1 } };
}
