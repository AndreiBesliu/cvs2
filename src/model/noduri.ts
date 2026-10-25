/**
 * Editarea nodurilor (ADR 0062), partea pură: calea unei forme în coordonatele elementului, mutarea unui nod, un nod nou pe un
 * segment, scoaterea unui nod. Exact: dreptunghiul și cercul devin căile conturului lor (aceleași arce), arcul se împarte în
 * două arce ale aceluiași cerc, cubica prin de Casteljau; nimic nu se aproximează.
 */
import { cerculArcului, conturCerc, conturDreptunghi, type Contur, type Punct } from '../geom/conturBaza.ts';
import { TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import type { FormaDoc, SegmentDoc, VarfDoc } from './document.ts';

export type FormaCale = Extract<FormaDoc, { tip: 'cale' }>;

/** De ce un nod nu se poate scoate. */
export type MotivNod = 'curbe' | 'prea-putine';

function dinContur(c: Contur): FormaCale {
  return {
    tip: 'cale', inchis: c.inchis,
    varfuri: c.varfuri.map((v): VarfDoc => ({
      p: { x: v.p.x, y: v.p.y },
      s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : v.s.tip === 'C' ? { tip: 'C', c1: { ...v.s.c1 }, c2: { ...v.s.c2 } } : { tip: 'L' },
    })),
  };
}

/** Calea formei, în coordonatele elementului: calea ei, sau conturul exact al dreptunghiului (colțurile rotunjite ca arce) și al cercului. */
export function caleDinForma(f: FormaDoc): FormaCale {
  if (f.tip === 'cale') return f;
  return dinContur(f.tip === 'dreptunghi' ? conturDreptunghi(0, 0, f.latime, f.inaltime, f.razaColt) : conturCerc(0, 0, f.raza));
}

const segmenteCale = (c: FormaCale): number => (c.inchis ? c.varfuri.length : Math.max(0, c.varfuri.length - 1));

/**
 * Nodul `i` dus în `la` (coordonatele elementului); punctele de control vecine ale cubicelor se mută cu aceeași deplasare
 * (forma curbei din jurul nodului rămâne), arcele își păstrează bulge-ul (se scalează odată cu coarda).
 */
export function mutaNod(c: FormaCale, i: number, la: Punct): FormaCale {
  const n = c.varfuri.length;
  const v = c.varfuri[i];
  if (!v) return c;
  const dx = la.x - v.p.x, dy = la.y - v.p.y;
  const muta = (q: { x: number; y: number }) => ({ ...q, x: q.x + dx, y: q.y + dy });
  const varfuri = c.varfuri.map((w) => ({ ...w }));
  // Segmentul care pleacă din nod (al lui): punctul de control dinspre el.
  const s = v.s;
  varfuri[i] = { ...v, p: { ...v.p, x: la.x, y: la.y }, s: s.tip === 'C' && (c.inchis || i < n - 1) ? { ...s, c1: muta(s.c1) } : s };
  // Segmentul care vine în nod (al vârfului dinainte): punctul de control dinspre el.
  const j = i - 1 >= 0 ? i - 1 : c.inchis ? n - 1 : -1;
  const u = j >= 0 ? varfuri[j] : undefined;
  if (u && u.s.tip === 'C') varfuri[j] = { ...u, s: { ...u.s, c2: muta(u.s.c2) } };
  return { ...c, varfuri };
}

/** Un nod nou pe segmentul `i`, la parametrul `t` ∈ (0, 1): linia la `t`, arcul la `t` din baleiaj, cubica prin de Casteljau. */
export function adaugaNod(c: FormaCale, i: number, t: number): FormaCale {
  const n = c.varfuri.length;
  if (i < 0 || i >= segmenteCale(c) || !(t > 0 && t < 1)) return c;
  const a = c.varfuri[i]!, b = c.varfuri[(i + 1) % n]!;
  const s = a.s;
  let stanga: SegmentDoc, dreapta: SegmentDoc, p: Punct;
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a.p, b.p, s.bulge);
    const u = start + baleiaj * t;
    p = { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
    stanga = { ...s, bulge: Math.tan((baleiaj * t) / 4) };
    dreapta = { ...s, bulge: Math.tan((baleiaj * (1 - t)) / 4) };
  } else if (s.tip === 'C') {
    const m = (q: Punct, r: Punct): Punct => ({ x: q.x + (r.x - q.x) * t, y: q.y + (r.y - q.y) * t });
    const p01 = m(a.p, s.c1), p12 = m(s.c1, s.c2), p23 = m(s.c2, b.p), p012 = m(p01, p12), p123 = m(p12, p23);
    p = m(p012, p123);
    stanga = { ...s, c1: p01, c2: p012 };
    dreapta = { ...s, c1: p123, c2: p23 };
  } else {
    p = { x: a.p.x + (b.p.x - a.p.x) * t, y: a.p.y + (b.p.y - a.p.y) * t };
    stanga = s;
    dreapta = { tip: 'L' };
  }
  const varfuri = [...c.varfuri];
  varfuri[i] = { ...a, s: stanga };
  varfuri.splice(i + 1, 0, { p, s: dreapta });
  return { ...c, varfuri };
}

/**
 * Nodul `i` scos: capătul unei căi deschise oricând; altfel doar dintre două linii (segmentul nou e linia dintre vecini).
 * O cale închisă păstrează cel puțin 3 noduri, una deschisă cel puțin 2.
 */
export function stergeNod(c: FormaCale, i: number): FormaCale | MotivNod {
  const n = c.varfuri.length;
  if (i < 0 || i >= n) return c;
  if (n - 1 < (c.inchis ? 3 : 2)) return 'prea-putine';
  const varfuri = [...c.varfuri];
  if (!c.inchis && i === 0) return { ...c, varfuri: varfuri.slice(1) };
  if (!c.inchis && i === n - 1) {
    const rest = varfuri.slice(0, -1);
    const ultim = rest[rest.length - 1]!;
    rest[rest.length - 1] = { ...ultim, s: { tip: 'L' } };
    return { ...c, varfuri: rest };
  }
  const j = (i - 1 + n) % n;
  if (c.varfuri[j]!.s.tip !== 'L' || c.varfuri[i]!.s.tip !== 'L') return 'curbe';
  varfuri.splice(i, 1);
  return { ...c, varfuri };
}

/**
 * Tipurile nodurilor (ADR 0063), comune uneltelor Pen și Noduri: un nod e un colț (fără mânere) sau face curbă, pe ambele
 * părți (cu mânere de o parte și de alta) sau doar pe o parte (înainte: spre segmentul care pleacă din nod; înapoi: spre cel
 * care vine). Mânerul e punctul de control al cubicei de pe partea aceea; o linie sau un mâner lipit de nod = fără mâner.
 */
export type TipNod = 'colt' | 'ambele' | 'inainte' | 'inapoi';
export type ParteNod = 'inainte' | 'inapoi';
/** Ce tip se poate cere: curba „pe o parte” alege singură partea (la a doua cerere, cealaltă). */
export type TipCerut = 'colt' | 'ambele' | 'o-parte';
/**
 * De ce un nod nu-și schimbă tipul: capătul unei căi deschise are o singură parte. (Un arc vecin nu mai refuză: devine
 * curbe la cerere, ADR 0068.)
 */
export type MotivTip = 'capat';

/** Un nod cu mânerele lui (în coordonatele căii); `null` = fără mâner pe partea aceea. */
export type NodCuManere = { readonly p: Punct; readonly inapoi: Punct | null; readonly inainte: Punct | null };

const egale = (a: Punct, b: Punct): boolean => a.x === b.x && a.y === b.y;

/** Segmentul `j` e un arc adevărat (nu o linie scrisă ca arc plat). */
const eArc = (c: FormaCale, j: number): boolean => {
  const s = j >= 0 ? c.varfuri[j]!.s : null;
  return s?.tip === 'A' && Math.abs(s.bulge) > 1e-12;
};

/** Indexul segmentului care vine în nodul `i` (al vârfului dinainte), sau -1 la începutul unei căi deschise. */
function segmentInapoi(c: FormaCale, i: number): number {
  return i > 0 ? i - 1 : c.inchis ? c.varfuri.length - 1 : -1;
}

/** Indexul segmentului care pleacă din nodul `i` (al lui), sau -1 la capătul unei căi deschise. */
function segmentInainte(c: FormaCale, i: number): number {
  return c.inchis || i < c.varfuri.length - 1 ? i : -1;
}

/** Mânerele nodului `i`: punctul de control de pe fiecare parte, dacă segmentul e o cubică și punctul nu stă pe nod. */
export function manereNod(c: FormaCale, i: number): { readonly inapoi: Punct | null; readonly inainte: Punct | null } {
  const v = c.varfuri[i];
  if (!v) return { inapoi: null, inainte: null };
  const ji = segmentInapoi(c, i), jo = segmentInainte(c, i);
  const si = ji >= 0 ? c.varfuri[ji]!.s : null, so = jo >= 0 ? v.s : null;
  return {
    inapoi: si?.tip === 'C' && !egale(si.c2, v.p) ? si.c2 : null,
    inainte: so?.tip === 'C' && !egale(so.c1, v.p) ? so.c1 : null,
  };
}

/** Tipul nodului `i`, după mânerele lui; o parte cu arc face și ea curbă (tangenta arcului e mânerul ei, ADR 0068). */
export function tipNod(c: FormaCale, i: number): TipNod {
  const m = manereNod(c, i);
  const inapoi = m.inapoi !== null || eArc(c, segmentInapoi(c, i)), inainte = m.inainte !== null || eArc(c, segmentInainte(c, i));
  return inapoi && inainte ? 'ambele' : inainte ? 'inainte' : inapoi ? 'inapoi' : 'colt';
}

const unitar = (x: number, y: number): Punct | null => {
  const l = Math.hypot(x, y);
  return l > 1e-12 ? { x: x / l, y: y / l } : null;
};

/** Vectorul `u` rotit cu unghiul `f` (radiani, trigonometric). */
const rotit = (u: Punct, f: number): Punct => ({ x: u.x * Math.cos(f) - u.y * Math.sin(f), y: u.x * Math.sin(f) + u.y * Math.cos(f) });

/** Direcția (unitară) în care segmentul `j` pleacă din vârful lui: spre primul punct de control diferit, sau tangenta arcului. */
function directieStart(c: FormaCale, j: number): Punct | null {
  const a = c.varfuri[j]!.p, b = c.varfuri[(j + 1) % c.varfuri.length]!.p, s = c.varfuri[j]!.s;
  const u = unitar(b.x - a.x, b.y - a.y);
  // Tangenta arcului la început e coarda rotită cu −θ/2 (θ = 4·atan(bulge), pozitiv trigonometric); la sfârșit, cu +θ/2.
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) return u ? rotit(u, -2 * Math.atan(s.bulge)) : null;
  if (s.tip === 'C') return unitar(s.c1.x - a.x, s.c1.y - a.y) ?? unitar(s.c2.x - a.x, s.c2.y - a.y) ?? u;
  return u;
}

/** Direcția (unitară) în care segmentul `j` ajunge în vârful următor. */
function directieSosire(c: FormaCale, j: number): Punct | null {
  const a = c.varfuri[j]!.p, b = c.varfuri[(j + 1) % c.varfuri.length]!.p, s = c.varfuri[j]!.s;
  const u = unitar(b.x - a.x, b.y - a.y);
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) return u ? rotit(u, 2 * Math.atan(s.bulge)) : null;
  if (s.tip === 'C') return unitar(b.x - s.c2.x, b.y - s.c2.y) ?? unitar(b.x - s.c1.x, b.y - s.c1.y) ?? u;
  return u;
}

/** Coarda segmentului `j` (lungimea mânerului nou: o treime din ea). */
function coarda(c: FormaCale, j: number): number {
  const a = c.varfuri[j]!.p, b = c.varfuri[(j + 1) % c.varfuri.length]!.p;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** O cubică cu ambele puncte de control pe capete e linia dintre ele: devine `L`. */
function simplifica(j: number, varfuri: VarfDoc[]): void {
  const v = varfuri[j]!, s = v.s;
  if (s.tip === 'C' && egale(s.c1, v.p) && egale(s.c2, varfuri[(j + 1) % varfuri.length]!.p)) varfuri[j] = { ...v, s: { tip: 'L' } };
}

/** Pune mânerele nodului `i` (`undefined` = rămâne cum e; `null` = scos); o linie vecină devine cubică dacă primește un mâner. */
function puneManere(c: FormaCale, i: number, inapoi: Punct | null | undefined, inainte: Punct | null | undefined): FormaCale {
  const n = c.varfuri.length;
  const varfuri = c.varfuri.map((w) => ({ ...w }));
  const p = varfuri[i]!.p;
  const ji = segmentInapoi(c, i), jo = segmentInainte(c, i);
  if (jo >= 0 && inainte !== undefined) {
    const v = varfuri[jo]!, b = varfuri[(jo + 1) % n]!.p;
    const c1 = inainte ?? p;
    if (v.s.tip === 'C') varfuri[jo] = { ...v, s: { ...v.s, c1: { x: c1.x, y: c1.y } } };
    else if (v.s.tip === 'L' && inainte) varfuri[jo] = { ...v, s: { tip: 'C', c1: { x: c1.x, y: c1.y }, c2: { x: b.x, y: b.y } } };
    simplifica(jo, varfuri);
  }
  if (ji >= 0 && inapoi !== undefined) {
    const v = varfuri[ji]!;
    const c2 = inapoi ?? p;
    if (v.s.tip === 'C') varfuri[ji] = { ...v, s: { ...v.s, c2: { x: c2.x, y: c2.y } } };
    else if (v.s.tip === 'L' && inapoi) varfuri[ji] = { ...v, s: { tip: 'C', c1: { x: v.p.x, y: v.p.y }, c2: { x: c2.x, y: c2.y } } };
    simplifica(ji, varfuri);
  }
  return { ...c, varfuri };
}

/**
 * Nodul `i` cu tipul cerut. Colțul scoate mânerele (o cubică rămasă fără ele redevine linie). Curba pe ambele părți pune
 * mânerele pe aceeași dreaptă, pe bisectoarea direcțiilor din nod, și cu aceeași lungime (ADR 0074 §5): media celor două, sau
 * lungimea celui care există; fără niciunul, câte o treime din coarda segmentului lui. Curba pe o parte păstrează mânerul de pe partea ei (sau pune unul în prelungirea celeilalte
 * părți, ca linia să intre lin în curbă) și îl scoate pe celălalt; cerută din nou, trece pe cealaltă parte. Un arc vecin pe
 * partea care ar primi un mâner refuză (arcul nu se aproximează), la fel o cerere imposibilă la capătul unei căi deschise.
 */
export function schimbaTipNod(c: FormaCale, i: number, tip: TipCerut): { readonly cale: FormaCale; readonly nod: number } | MotivTip {
  if (!c.varfuri[i]) return { cale: c, nod: i };
  // Arcele vecine devin întâi curbe (ADR 0068): mânerele lor pornesc pe tangentele arcelor, deci forma nu se schimbă.
  const { cale, nod } = arceInCubice(c, i, ['inapoi', 'inainte']);
  const r = tipFaraArce(cale, nod, tip);
  return typeof r === 'string' ? r : { cale: r, nod };
}

/** Tipul cerut pe un nod fără arce vecine (`schimbaTipNod`, după conversia lor). */
function tipFaraArce(c: FormaCale, i: number, tip: TipCerut): FormaCale | MotivTip {
  const v = c.varfuri[i];
  if (!v) return c;
  const p = v.p;
  const ji = segmentInapoi(c, i), jo = segmentInainte(c, i);
  const m = manereNod(c, i);
  if (tip === 'colt') return puneManere(c, i, null, null);
  if (tip === 'ambele') {
    if (ji < 0 || jo < 0) return 'capat';
    const uo = m.inainte ? unitar(m.inainte.x - p.x, m.inainte.y - p.y) : null;
    const ui = m.inapoi ? unitar(p.x - m.inapoi.x, p.y - m.inapoi.y) : null;
    const tIn = ui ?? directieSosire(c, ji), tOut = uo ?? directieStart(c, jo);
    const d = (tIn && tOut ? unitar(tIn.x + tOut.x, tIn.y + tOut.y) : null) ?? tOut ?? tIn;
    if (!d) return c;
    const lInainte = m.inainte ? Math.hypot(m.inainte.x - p.x, m.inainte.y - p.y) : null;
    const lInapoi = m.inapoi ? Math.hypot(m.inapoi.x - p.x, m.inapoi.y - p.y) : null;
    const comun = lInainte !== null && lInapoi !== null ? (lInainte + lInapoi) / 2 : lInainte ?? lInapoi;
    const lo = comun ?? coarda(c, jo) / 3, li = comun ?? coarda(c, ji) / 3;
    return puneManere(c, i, { x: p.x - d.x * li, y: p.y - d.y * li }, { x: p.x + d.x * lo, y: p.y + d.y * lo });
  }
  // Pe o parte: partea de acum trece în cealaltă; din colț sau din ambele, înainte (dacă există).
  const t = tipNod(c, i);
  const parte: ParteNod = t === 'inainte' ? 'inapoi' : t === 'inapoi' ? 'inainte' : jo >= 0 ? 'inainte' : 'inapoi';
  if ((parte === 'inainte' ? jo : ji) < 0) return 'capat';
  if (parte === 'inainte') {
    if (m.inainte) return puneManere(c, i, null, undefined);
    const d = (ji >= 0 ? directieSosire(c, ji) : null) ?? directieStart(c, jo);
    if (!d) return c;
    const l = coarda(c, jo) / 3;
    return puneManere(c, i, null, { x: p.x + d.x * l, y: p.y + d.y * l });
  }
  if (m.inapoi) return puneManere(c, i, undefined, null);
  const d = (jo >= 0 ? directieStart(c, jo) : null) ?? directieSosire(c, ji);
  if (!d) return c;
  const l = coarda(c, ji) / 3;
  return puneManere(c, i, { x: p.x - d.x * l, y: p.y - d.y * l }, null);
}

/** Eroarea radială maximă a cubicei standard pentru un arc de unghi φ (rad) și rază r: r · 2·sin⁶(φ/4) / (27·cos²(φ/4)). */
function eroareCubica(raza: number, phi: number): number {
  const s = Math.sin(Math.abs(phi) / 4), c = Math.cos(Math.abs(phi) / 4);
  return (raza * 2 * s ** 6) / (27 * c * c);
}

/**
 * Pură: arcul din `a` în `b` (bulge) ca n cubice ale aceluiași cerc, cu n cel mai mic (cel puțin o bucată la 90°) la care
 * abaterea de la cerc e sub `tol` (implicit, toleranța proiectului, 0,001 mm, ca biarcele tăierii). Vârfurile lor încep în `a`
 * (fără `b`); punctele de control sunt pe tangente, la 4/3 · tan(φ/4) · r, deci la capete tangenta arcului rămâne.
 */
export function arcInCubice(a: Punct, b: Punct, bulge: number, tol = TOLERANTA_PROIECT): VarfDoc[] {
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, bulge);
  let n = Math.max(1, Math.ceil(Math.abs(baleiaj) / (Math.PI / 2) - 1e-12));
  while (n < 64 && eroareCubica(raza, baleiaj / n) > tol) n++;
  const pe = (u: number): Punct => ({ x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) });
  const out: VarfDoc[] = [];
  for (let k = 0; k < n; k++) {
    const u0 = start + (baleiaj * k) / n, u1 = start + (baleiaj * (k + 1)) / n;
    const h = (4 / 3) * Math.tan((u1 - u0) / 4) * raza;
    const p0 = k === 0 ? { x: a.x, y: a.y } : pe(u0), p3 = k === n - 1 ? b : pe(u1);
    out.push({
      p: p0,
      s: { tip: 'C', c1: { x: p0.x - h * Math.sin(u0), y: p0.y + h * Math.cos(u0) }, c2: { x: p3.x + h * Math.sin(u1), y: p3.y - h * Math.cos(u1) } },
    });
  }
  return out;
}

/**
 * Pură: arcele de pe părțile cerute ale nodului `i` devin cubice (`arcInCubice`); vârfurile noi intră între capetele arcului,
 * deci nodul își poate schimba indexul (`nod`). Fără arce pe părțile acelea: calea neschimbată.
 */
export function arceInCubice(c: FormaCale, i: number, parti: readonly ParteNod[]): { readonly cale: FormaCale; readonly nod: number } {
  let cale = c, nod = i;
  const inlocuieste = (j: number): void => {
    const v = cale.varfuri[j]!, b = cale.varfuri[(j + 1) % cale.varfuri.length]!;
    if (v.s.tip !== 'A') return;
    const bucati = arcInCubice(v.p, b.p, v.s.bulge);
    const varfuri = [...cale.varfuri];
    varfuri.splice(j, 1, ...bucati);
    cale = { ...cale, varfuri };
    if (j < nod) nod += bucati.length - 1;
  };
  // Întâi segmentul care pleacă din nod (inserează după el), apoi cel care vine (poate muta nodul).
  if (parti.includes('inainte') && eArc(cale, segmentInainte(cale, nod))) inlocuieste(segmentInainte(cale, nod));
  if (parti.includes('inapoi') && eArc(cale, segmentInapoi(cale, nod))) inlocuieste(segmentInapoi(cale, nod));
  return { cale, nod };
}

/**
 * Mânerele de arătat ale nodului `i`: cele adevărate, iar pe o parte cu arc, mânerul pe care l-ar avea după conversie (tangenta
 * arcului, ADR 0068): tras, arcul devine curbe întâi.
 */
export function manereAfisate(c: FormaCale, i: number): { readonly inapoi: Punct | null; readonly inainte: Punct | null } {
  const m = manereNod(c, i);
  if (m.inapoi && m.inainte) return m;
  const { cale, nod } = arceInCubice(c, i, ['inapoi', 'inainte']);
  const v = manereNod(cale, nod);
  return { inapoi: m.inapoi ?? v.inapoi, inainte: m.inainte ?? v.inainte };
}

/** Mânerele sunt pe aceeași dreaptă, de o parte și de alta a nodului (nodul e neted), cu o toleranță de 0,001 rad. */
export function neted(c: FormaCale, i: number): boolean {
  const v = c.varfuri[i], m = manereNod(c, i);
  if (!v || !m.inapoi || !m.inainte) return false;
  const a = { x: m.inainte.x - v.p.x, y: m.inainte.y - v.p.y }, b = { x: v.p.x - m.inapoi.x, y: v.p.y - m.inapoi.y };
  return Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) <= 1e-3;
}

/**
 * Mânerul `parte` al nodului `i` dus în `la`. Pe un nod neted, mânerul de pe cealaltă parte se rotește odată cu el (își
 * păstrează lungimea), ca nodul să rămână neted; `alt` (Alt) le desparte. Pe un nod cu mânerele despărțite, celălalt rămâne,
 * iar `alt` le unește din nou (ADR 0074 §5): celălalt devine oglinda lui, pe aceeași dreaptă și cu aceeași lungime. Un mâner
 * adus pe nod dispare (o cubică fără mânere redevine linie). Fără mâner pe partea aceea: nimic.
 */
export function mutaManer(c: FormaCale, i: number, parte: ParteNod, la: Punct, alt: boolean): FormaCale {
  const v = c.varfuri[i], m = manereNod(c, i);
  if (!v || !m[parte]) return c;
  const p = v.p;
  const celalalt = parte === 'inainte' ? m.inapoi : m.inainte;
  let opus: Punct | undefined;
  if (celalalt && neted(c, i) !== alt) {
    // Neted fără Alt: celălalt se rotește, cu lungimea lui. Despărțit cu Alt: celălalt e oglinda celui tras.
    const d = unitar(la.x - p.x, la.y - p.y);
    const l = alt ? Math.hypot(la.x - p.x, la.y - p.y) : Math.hypot(celalalt.x - p.x, celalalt.y - p.y);
    opus = d ? { x: p.x - d.x * l, y: p.y - d.y * l } : undefined;
  }
  const nou = egale(la, p) ? null : la;
  return parte === 'inainte' ? puneManere(c, i, opus, nou) : puneManere(c, i, nou, opus);
}

/**
 * Calea din noduri cu mânere (cea a uneltei Pen): între două noduri, o cubică dacă vreunul are mâner spre celălalt, altfel o
 * linie. Pe o cale deschisă, ultimul vârf are segmentul `L` (schema), iar mânerele de la capete se ignoră.
 */
export function caleDinNoduri(noduri: readonly NodCuManere[], inchis: boolean): FormaCale {
  const n = noduri.length;
  const varfuri = noduri.map((a, k): VarfDoc => {
    const b = noduri[(k + 1) % n]!;
    if ((!inchis && k === n - 1) || (!a.inainte && !b.inapoi)) return { p: { x: a.p.x, y: a.p.y }, s: { tip: 'L' } };
    const c1 = a.inainte ?? a.p, c2 = b.inapoi ?? b.p;
    return { p: { x: a.p.x, y: a.p.y }, s: { tip: 'C', c1: { x: c1.x, y: c1.y }, c2: { x: c2.x, y: c2.y } } };
  });
  return { tip: 'cale', inchis, varfuri };
}
