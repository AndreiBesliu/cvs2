/**
 * Conversia vectorilor (ADR 0180 §8, §10, §11; felia 10.3↑d), pură, pe formele alese ale foii de lucru: **Arce** în locul
 * curbelor, **În cerc** și **În dreptunghi**. Fiecare formă își păstrează elementul (id-ul, numele, câmpurile) și operațiile;
 * se schimbă doar forma și matricea elementului, cât să stea pe foaie unde era. Abaterea se măsoară pe toată forma, în ambele
 * sensuri (nodurile și laturile), nu doar pe noduri (lecția din ediția întâi).
 * - **În cerc, doar dacă e:** cercul trece prin noduri (răspunsul 5a): pe o formă doar din linii, cercul potrivit pe vârfuri,
 *   altfel pe eșantioanele formei; abaterea e cea radială, exactă pe linii și arce, valabilă cât forma ocolește centrul o
 *   singură dată (altfel, măsurată ca distanța Hausdorff). **Cu diametrul:** orice formă închisă, cercul dat, în centrul
 *   cutiei ei pe foaie.
 * - **În dreptunghi, doar dacă e:** dreptunghiul de arie minimă din jurul formei (pe învelitoarea ei convexă), cu raza colțului
 *   din cât lipsesc colțurile; un cerc (fără laturi drepte pe nicio axă) nu e dreptunghi, o fantă da; **cu mărimea:**
 *   dreptunghiul dat, drept pe foaie, în centrul cutiei. Găurirea cere un cerc (ADR 0087): o formă găurită nu devine dreptunghi.
 * - **Arce:** fiecare cubică devine linii și arce sub toleranță (biarcele, ADR 0033); cu „și liniile scurte”, un șir de linii
 *   ale căror vârfuri stau pe un cerc devine un arc prin primul, mijlocul și ultimul vârf (cel mult 180°), cât nu trece de
 *   toleranță; un vârf în care drumul se întoarce cu peste 30° e un colț și rămâne. Cercurile și dreptunghiurile rămân.
 * - **Netezește** (felia 10.3↑e, `netezire.ts`): șirurile de linii scurte devin cubice netede, sub toleranță; colțurile,
 *   liniile mai lungi de „Păstrează”, arcele și curbele rămân.
 * Căile deschise (la cerc și dreptunghi), piesele puse de mai multe ori și elementele întinse neuniform (la arce) se sar.
 */
import { cubicaInArce } from '../geom/biarce.ts';
import { conturCerc, conturDreptunghi } from '../geom/conturBaza.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import { cutieContur } from '../geom/cutie.ts';
import { distantaLaContur, peArc } from '../geom/distanta.ts';
import { inversa } from '../geom/inversa.ts';
import { compune, esteSimilitudine, transformaContur, type Matrice } from '../geom/matrice.ts';
import { RAZA_MAXIMA_ARC } from '../geom/toleranta.ts';
import type { Document, ElementNod, FormaDoc, Nod, Piesa, VarfDoc } from './document.ts';
import { conturElement } from './forme.ts';
import { elementeInstanta, matriceInstanta, type ElementLume } from './lume.ts';
import { abatere } from './abatereContur.ts';
import { netezesteCale } from './netezire.ts';
import { punctPe } from './reparare.ts';
import { TOLERANTA_MAXIMA, TOLERANTA_MINIMA } from './verificareLimite.ts';

export type CerereConversie =
  /** Arce în locul curbelor; `linii`: și șirurile de linii scurte care stau pe un cerc. */
  | { readonly fel: 'arce'; readonly alese: readonly string[]; readonly toleranta: number; readonly linii: boolean }
  /** În cerc: doar dacă e (diametrul null, sub toleranță) sau cu diametrul dat. */
  | { readonly fel: 'cerc'; readonly alese: readonly string[]; readonly toleranta: number; readonly diametru: number | null }
  /** În dreptunghi: doar dacă e (mărimea null, sub toleranță) sau cu mărimea dată. */
  | { readonly fel: 'dreptunghi'; readonly alese: readonly string[]; readonly toleranta: number; readonly marime: { readonly latime: number; readonly inaltime: number } | null }
  /** Netezește: șirurile de linii scurte devin cubice; `pastreaza`: liniile mai lungi de atât (mm) rămân linii. */
  | { readonly fel: 'netezire'; readonly alese: readonly string[]; readonly toleranta: number; readonly pastreaza: number };

/** `nimic-ales`, `toleranta` (în afara 0,001 … 1 mm), `valoare` (un diametru, o mărime sau „Păstrează” care nu e un număr pozitiv). */
export type MotivConversie = 'nimic-ales' | 'toleranta' | 'valoare';

export type RezultatConversie =
  | {
    readonly ok: true;
    /** Piesele schimbate, cu aceleași id-uri (goală: nimic de convertit). */
    readonly piese: readonly Piesa[];
    readonly convertite: number;
    /** Sărite: căile deschise (la cerc și dreptunghi), formele din piese puse de mai multe ori, cele întinse neuniform. */
    readonly sarite: number;
    /** Doar dacă e: câte nu sunt cercuri / dreptunghiuri sub toleranță, cu cea mai mică abatere dintre ele. */
    readonly nepotrivite: number;
    readonly abatereMinima: number | null;
    /** Câte nu se pot face dreptunghi (o operație care cere cerc: găurirea). */
    readonly operatie: number;
    /** Abaterea cea mai mare a formelor convertite, măsurată, în mm (0 la mărimea dată). */
    readonly abatere: number;
    /** La arce: câte curbe s-au înlocuit și câte arce și linii au ieșit; la netezire: câte linii s-au înlocuit și câte curbe au ieșit. */
    readonly curbe: number;
    readonly arce: number;
    readonly linii: number;
  }
  | { readonly ok: false; readonly motiv: MotivConversie };

type Stare = { convertite: number; sarite: number; nepotrivite: number; abatereMinima: number | null; operatie: number; abatere: number; curbe: number; arce: number; linii: number };

/** Un vârf în care drumul se întoarce cu mai mult de atât e un colț: Arce nu-l rotunjește. */
const COLT = Math.PI / 6;
/** Cel mai lung șir de linii cercetat pentru un arc (căutarea e pătratică în lungimea lui). */
const SIR_MAXIM = 256;

const dist = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);
const pozitiv = (x: number): boolean => Number.isFinite(x) && x > 0;
const translatie = (x: number, y: number): Matrice => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

// ——— În cerc ———

/** Cercul celor mai mici pătrate (algebric, Kåsa), pe puncte centrate; null pe mai puțin de trei puncte sau pe o dreaptă. */
function kasa(pts: readonly Punct[]): { readonly centru: Punct; readonly raza: number } | null {
  const n = pts.length;
  if (n < 3) return null;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const p of pts) {
    const u = p.x - mx, v = p.y - my;
    suu += u * u; svv += v * v; suv += u * v;
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (!(Math.abs(det) > 1e-18 * (suu + svv) * (suu + svv))) return null;
  const bu = (suuu + suvv) / 2, bv = (svvv + svuu) / 2;
  const uc = (bu * svv - bv * suv) / det, vc = (bv * suu - bu * suv) / det;
  return { centru: { x: mx + uc, y: my + vc }, raza: Math.sqrt(uc * uc + vc * vc + (suu + svv) / n) };
}

/** Punctele de pe care se potrivește cercul: vârfurile unei forme doar din linii (cercul trece prin noduri), altfel eșantioane. */
function punctePotrivire(c: Contur): Punct[] {
  const m = numarSegmente(c);
  const curbe = c.varfuri.some((v, i) => i < m && v.s.tip !== 'L' && !(v.s.tip === 'A' && Math.abs(v.s.bulge) <= 1e-12));
  if (!curbe) return c.varfuri.map((v) => v.p);
  const rez: Punct[] = [];
  for (let i = 0; i < m; i++) {
    const g = segment(c, i);
    for (let j = 0; j < 16; j++) rez.push(punctPe(g, j / 16));
  }
  return rez;
}

/**
 * Abaterea formei închise de cercul (o, R): radială, exactă pe linii (capetele și piciorul perpendicularei din o) și pe arce
 * (capetele și punctele de pe dreapta o–centrul arcului), eșantionată pe cubice. Valabilă și în celălalt sens doar cât forma
 * ocolește centrul o singură dată, fără să se întoarcă; altfel, distanța Hausdorff.
 */
function abatereCerc(c: Contur, o: Punct, R: number): number {
  let dev = 0, tot = 0, prev: number | null = null;
  let monoton = true, semn = 0;
  const vezi = (q: Punct): void => {
    dev = Math.max(dev, Math.abs(dist(q, o) - R));
    const u = Math.atan2(q.y - o.y, q.x - o.x);
    if (prev !== null) {
      let du = u - prev;
      if (du > Math.PI) du -= 2 * Math.PI; else if (du < -Math.PI) du += 2 * Math.PI;
      if (Math.abs(du) > 1e-12) {
        const s = Math.sign(du);
        if (semn !== 0 && s !== semn) monoton = false;
        semn = s;
      }
      tot += du;
    }
    prev = u;
  };
  for (let i = 0; i < numarSegmente(c); i++) {
    const g = segment(c, i);
    vezi(g.a);
    if (g.s.tip === 'L' || (g.s.tip === 'A' && Math.abs(g.s.bulge) <= 1e-12)) {
      const dx = g.b.x - g.a.x, dy = g.b.y - g.a.y, l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? ((o.x - g.a.x) * dx + (o.y - g.a.y) * dy) / l2 : 0;
      if (t > 0 && t < 1) vezi({ x: g.a.x + dx * t, y: g.a.y + dy * t });
    } else if (g.s.tip === 'A') {
      const k = cerculArcului(g.a, g.b, g.s.bulge);
      const u = Math.atan2(k.centru.y - o.y, k.centru.x - o.x);
      const extreme = [u, u + Math.PI].filter((x) => peArc(x, k.start, k.baleiaj)).sort((x, y) => {
        const rx = ((((x - k.start) * Math.sign(k.baleiaj)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const ry = ((((y - k.start) * Math.sign(k.baleiaj)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return rx - ry;
      });
      for (const x of extreme) vezi({ x: k.centru.x + k.raza * Math.cos(x), y: k.centru.y + k.raza * Math.sin(x) });
    } else {
      for (let j = 1; j < 64; j++) vezi(punctPe(g, j / 64));
    }
  }
  if (c.varfuri[0]) vezi(c.varfuri[0].p);
  if (monoton && Math.abs(Math.abs(tot) - 2 * Math.PI) < 1e-6) return dev;
  return abatere(c, conturCerc(o.x, o.y, R));
}

// ——— În dreptunghi ———

/** Învelitoarea convexă (lanțul monoton al lui Andrew), în sens trigonometric. */
function infasuratoare(pts: readonly Punct[]): Punct[] {
  const p = [...pts].sort((u, v) => u.x - v.x || u.y - v.y);
  if (p.length < 3) return p;
  const cruce = (o: Punct, a: Punct, b: Punct): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const jos: Punct[] = [], sus: Punct[] = [];
  for (const q of p) {
    while (jos.length >= 2 && cruce(jos[jos.length - 2] as Punct, jos[jos.length - 1] as Punct, q) <= 0) jos.pop();
    jos.push(q);
  }
  for (const q of [...p].reverse()) {
    while (sus.length >= 2 && cruce(sus[sus.length - 2] as Punct, sus[sus.length - 1] as Punct, q) <= 0) sus.pop();
    sus.push(q);
  }
  return [...jos.slice(0, -1), ...sus.slice(0, -1)];
}

/**
 * Dreptunghiul formei închise (în lume): cel de arie minimă din jurul ei, pe o latură a învelitorii convexe, cu unghiul în
 * (−45°, 45°]; raza colțului, din cât lipsesc colțurile (distanța de la colț la formă = r·(√2 − 1)). Null pe o formă plată.
 */
function dreptunghiPotrivit(c: Contur): { readonly latime: number; readonly inaltime: number; readonly raza: number; readonly m: Matrice } | null {
  const pts = punctePotrivire(c);
  const h = infasuratoare(pts.length > 4000 ? pts.filter((_, i) => i % Math.ceil(pts.length / 4000) === 0) : pts);
  if (h.length < 3) return null;
  let best: { arie: number; u: number; u0: number; v0: number; w: number; hh: number } | null = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i] as Punct, b = h[(i + 1) % h.length] as Punct;
    const u = Math.atan2(b.y - a.y, b.x - a.x), cu = Math.cos(u), su = Math.sin(u);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of h) {
      const x = q.x * cu + q.y * su, y = -q.x * su + q.y * cu;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const arie = (x1 - x0) * (y1 - y0);
    if (!best || arie < best.arie * (1 - 1e-12)) best = { arie, u, u0: x0, v0: y0, w: x1 - x0, hh: y1 - y0 };
  }
  if (!best || !(best.w > 0 && best.hh > 0)) return null;
  // Unghiul în (−45°, 45°]: un sfert de tură schimbă lățimea cu înălțimea și colțul de pornire.
  let { u, u0, v0, w, hh } = best;
  while (u > Math.PI / 4 + 1e-12) { [u0, v0, w, hh] = [-v0 - hh, u0, hh, w]; u -= Math.PI / 2; }
  while (u <= -Math.PI / 4 + 1e-12) { [u0, v0, w, hh] = [v0, -u0 - w, hh, w]; u += Math.PI / 2; }
  const cu = Math.cos(u), su = Math.sin(u);
  const m: Matrice = { a: cu, b: su, c: -su, d: cu, e: u0 * cu - v0 * su, f: u0 * su + v0 * cu };
  const colturi = [[0, 0], [w, 0], [w, hh], [0, hh]].map(([x, y]) => ({ x: m.a * (x as number) + m.c * (y as number) + m.e, y: m.b * (x as number) + m.d * (y as number) + m.f }));
  const lipsa = colturi.reduce((s, q) => s + distantaLaContur(q, c), 0) / 4;
  const raza = Math.min(lipsa / (Math.SQRT2 - 1), Math.min(w, hh) / 2);
  return { latime: w, inaltime: hh, raza: raza > 1e-9 * Math.max(w, hh) ? raza : 0, m };
}

// ——— Arce ———

/**
 * Arcul prin primul, mijlocul și ultimul punct al șirului, cu abaterea lui față de șir în ambele sensuri: vârfurile (radial),
 * laturile (piciorul perpendicularei din centru) și arcul dintre două vârfuri (la mijlocul unghiului, până la latura lor).
 * Null dacă punctele stau pe o dreaptă, arcul trece de 180° sau de raza cea mai mare, ori șirul se întoarce pe arc.
 */
function arcPrin(P: readonly Punct[]): { readonly bulge: number; readonly dev: number } | null {
  const p0 = P[0] as Punct, p1 = P[P.length - 1] as Punct, pm = P[Math.floor((P.length - 1) / 2)] as Punct;
  const ax = p0.x - pm.x, ay = p0.y - pm.y, bx = p1.x - pm.x, by = p1.y - pm.y;
  const det = 2 * (ax * by - ay * bx);
  if (!(Math.abs(det) > 1e-12 * (ax * ax + ay * ay + bx * bx + by * by))) return null;
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by;
  const o = { x: pm.x + (by * a2 - ay * b2) / det, y: pm.y + (ax * b2 - bx * a2) / det };
  const R = dist(o, pm);
  if (!(R < RAZA_MAXIMA_ARC)) return null;
  const sens = Math.sign(det) < 0 ? 1 : -1;
  const u0 = Math.atan2(p0.y - o.y, p0.x - o.x);
  const rel = (q: Punct): number => ((((Math.atan2(q.y - o.y, q.x - o.x) - u0) * sens) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const baleiaj = rel(p1);
  if (!(baleiaj <= Math.PI + 1e-9) || baleiaj < 1e-9) return null;
  let dev = 0, inainte = 0;
  for (let t = 0; t < P.length; t++) {
    const q = P[t] as Punct;
    const r = t === P.length - 1 ? baleiaj : t === 0 ? 0 : rel(q);
    if (r < inainte - 1e-12 || r > baleiaj + 1e-12) return null;
    inainte = r;
    dev = Math.max(dev, Math.abs(dist(q, o) - R));
    if (t === 0) continue;
    const a = P[t - 1] as Punct;
    const dx = q.x - a.x, dy = q.y - a.y, l2 = dx * dx + dy * dy;
    const s = l2 > 0 ? ((o.x - a.x) * dx + (o.y - a.y) * dy) / l2 : 0;
    if (s > 0 && s < 1) dev = Math.max(dev, Math.abs(Math.hypot(a.x + dx * s - o.x, a.y + dy * s - o.y) - R));
    const um = u0 + sens * ((t === 1 ? 0 : rel(a)) + r) / 2;
    const m = { x: o.x + R * Math.cos(um), y: o.y + R * Math.sin(um) };
    const sm = l2 > 0 ? Math.max(0, Math.min(1, ((m.x - a.x) * dx + (m.y - a.y) * dy) / l2)) : 0;
    dev = Math.max(dev, Math.hypot(a.x + dx * sm - m.x, a.y + dy * sm - m.y));
  }
  return { bulge: sens * Math.tan(baleiaj / 4), dev };
}

/** Unghiul cu care se întoarce drumul în b (de la a, spre c). */
function intoarcere(a: Punct, b: Punct, c: Punct): number {
  const u = Math.atan2(b.y - a.y, b.x - a.x), v = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(v - u) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

const caVarfDoc = (v: { readonly p: Punct; readonly s: { readonly tip: string; readonly bulge?: number } }): VarfDoc =>
  ({ p: { x: v.p.x, y: v.p.y }, s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge as number } : { tip: 'L' } });

/** Arce pe o cale (în coordonatele elementului, toleranța împărțită la scara lui): vârfurile noi, sau null dacă nu s-a schimbat nimic. */
function arceCale(f: Extract<FormaDoc, { tip: 'cale' }>, tol: number, linii: boolean, st: Stare, scara: number): VarfDoc[] | null {
  const v = f.varfuri, n = v.length, m = f.inchis ? n : n - 1;
  const P = (k: number): Punct => (v[k % n] as VarfDoc).p;
  const rez: VarfDoc[] = [];
  // Numerele căii se adună în stare doar dacă ea se schimbă de tot (o cubică refuzată lasă calea cum era).
  const loc = { abatere: 0, curbe: 0, arce: 0, linii: 0 };
  let schimbat = false;
  for (let k = 0; k < n;) {
    const x = v[k] as VarfDoc;
    if (k < m && x.s.tip === 'C') {
      const b = P(k + 1);
      const r = cubicaInArce(x.p, x.s.c1, x.s.c2, b, tol);
      if (!r.ok) return null;
      const lant = r.varfuri.map(caVarfDoc);
      const cub: Contur = { inchis: false, varfuri: [{ p: x.p, s: x.s }, { p: b, s: { tip: 'L' } }] };
      const ch: Contur = { inchis: false, varfuri: [...r.varfuri, { p: b, s: { tip: 'L' } }] };
      loc.abatere = Math.max(loc.abatere, abatere(cub, ch) * scara);
      loc.curbe++;
      for (const y of r.varfuri) { if (y.s.tip === 'A') loc.arce++; else loc.linii++; }
      if (lant[0]) lant[0] = { ...lant[0], p: x.p };
      rez.push(...lant);
      schimbat = true;
      k++;
      continue;
    }
    // Un șir de linii pe un cerc: cel mai lung arc prin el, din k, sub toleranță, fără colțuri.
    let sfarsit = -1, bun: { readonly bulge: number; readonly dev: number } | null = null;
    if (linii && k < m && x.s.tip === 'L') {
      for (let j = k + 2; j <= Math.min(m, k + SIR_MAXIM); j++) {
        if ((v[(j - 1) % n] as VarfDoc).s.tip !== 'L' || (j - 1 >= m)) break;
        if (intoarcere(P(j - 2), P(j - 1), P(j)) > COLT) break;
        const a = arcPrin(Array.from({ length: j - k + 1 }, (_, t) => P(k + t)));
        if (!a || a.dev > tol) break;
        sfarsit = j;
        bun = a;
      }
    }
    if (bun && sfarsit > 0) {
      rez.push({ ...x, s: { tip: 'A', bulge: bun.bulge } });
      loc.abatere = Math.max(loc.abatere, bun.dev * scara);
      loc.arce++;
      schimbat = true;
      k = sfarsit;
      continue;
    }
    rez.push(x);
    k++;
  }
  // Un șir care se termină chiar în primul vârf al unei căi închise a dus k la n: vârful 0 nu se pune de două ori.
  if (!schimbat) return null;
  st.abatere = Math.max(st.abatere, loc.abatere);
  st.curbe += loc.curbe;
  st.arce += loc.arce;
  st.linii += loc.linii;
  return rez;
}

// ——— Formele ———

function elementeArbore(radacina: Nod): Map<string, ElementNod> {
  const rez = new Map<string, ElementNod>();
  const stiva: Nod[] = [radacina];
  for (let x = stiva.pop(); x; x = stiva.pop()) {
    if (x.tip === 'element') rez.set(x.id, x); else stiva.push(...x.copii);
  }
  return rez;
}

function inlocuieste(n: Nod, noi: ReadonlyMap<string, ElementNod>): Nod {
  return n.tip === 'element' ? (noi.get(n.id) ?? n) : { ...n, copii: n.copii.map((c) => inlocuieste(c, noi)) };
}

/** Elementul cu forma nouă, cu matricea care o pune în lume la `N` (matricea ei de lume). */
function cuForma(nod: ElementNod, e: ElementLume, forma: FormaDoc, N: Matrice): ElementNod | null {
  const inv = inversa(e.matrice);
  return inv ? { ...nod, forma, matrice: compune(compune(nod.matrice, inv), N) } : null;
}

function nepotrivit(st: Stare, dev: number): null {
  st.nepotrivite++;
  if (Number.isFinite(dev)) st.abatereMinima = st.abatereMinima === null ? dev : Math.min(st.abatereMinima, dev);
  return null;
}

/** Un element convertit, sau null dacă rămâne cum e (numărat, după caz). */
function convertesteElement(e: ElementLume, nod: ElementNod, p: Piesa, c: CerereConversie, st: Stare): ElementNod | null {
  // Netezirea lucrează pe vârfurile elementului, cu matricea lui: n-are nevoie de conturul în lume.
  if (c.fel === 'netezire') {
    if (nod.forma.tip !== 'cale') return null;
    const varfuri = netezesteCale(nod.forma, e.matrice, c.toleranta, c.pastreaza, st);
    return varfuri ? { ...nod, forma: { ...nod.forma, varfuri } } : null;
  }
  let w: Contur;
  try {
    w = conturElement(e);
  } catch {
    st.sarite++;
    return null;
  }
  if (c.fel === 'arce') {
    if (nod.forma.tip !== 'cale') return null;
    if (!esteSimilitudine(e.matrice)) {
      st.sarite++;
      return null;
    }
    const scara = Math.sqrt(Math.abs(e.matrice.a * e.matrice.d - e.matrice.b * e.matrice.c));
    const varfuri = arceCale(nod.forma, c.toleranta / scara, c.linii, st, scara);
    return varfuri ? { ...nod, forma: { ...nod.forma, varfuri } } : null;
  }
  if (!w.inchis || w.varfuri.length < 2) {
    st.sarite++;
    return null;
  }
  const k = cutieContur(w);
  const mijloc = { x: (k.minX + k.maxX) / 2, y: (k.minY + k.maxY) / 2 };
  if (c.fel === 'cerc') {
    if (c.diametru !== null) return cuForma(nod, e, { tip: 'cerc', raza: c.diametru / 2 }, translatie(mijloc.x, mijloc.y));
    if (nod.forma.tip === 'cerc') return null;
    const fit = kasa(punctePotrivire(w));
    if (!fit) return nepotrivit(st, Infinity);
    const dev = abatereCerc(w, fit.centru, fit.raza);
    if (!(dev <= c.toleranta)) return nepotrivit(st, dev);
    st.abatere = Math.max(st.abatere, dev);
    return cuForma(nod, e, { tip: 'cerc', raza: fit.raza }, translatie(fit.centru.x, fit.centru.y));
  }
  if (p.operatii.some((o) => o.tip === 'gaurire' && o.noduri.includes(nod.id))) {
    st.operatie++;
    return null;
  }
  if (c.marime) {
    const { latime, inaltime } = c.marime;
    return cuForma(nod, e, { tip: 'dreptunghi', latime, inaltime, razaColt: 0 }, translatie(mijloc.x - latime / 2, mijloc.y - inaltime / 2));
  }
  if (nod.forma.tip === 'dreptunghi') return null;
  const fit = dreptunghiPotrivit(w);
  if (!fit) return nepotrivit(st, Infinity);
  // Un cerc nu e dreptunghi: fără laturi drepte pe nicio axă (colțurile rotunjite cu jumătate din ambele laturi). O fantă
  // (laturi drepte pe o singură axă) rămâne dreptunghi.
  if (fit.latime - 2 * fit.raza <= c.toleranta && fit.inaltime - 2 * fit.raza <= c.toleranta) return nepotrivit(st, Infinity);
  const dev = abatere(w, transformaContur(conturDreptunghi(0, 0, fit.latime, fit.inaltime, fit.raza), fit.m), c.toleranta);
  if (!(dev <= c.toleranta)) return nepotrivit(st, dev);
  st.abatere = Math.max(st.abatere, dev);
  return cuForma(nod, e, { tip: 'dreptunghi', latime: fit.latime, inaltime: fit.inaltime, razaColt: fit.raza }, fit.m);
}

/** Conversia formelor alese pe foaia de lucru (ADR 0180 §8, §10): piesele schimbate (aceleași id-uri) și ce s-a întâmplat. */
export function converteste(doc: Document, c: CerereConversie, indexFoaie = 0): RezultatConversie {
  const foaie = doc.foi[indexFoaie];
  if (!foaie || c.alese.length === 0) return { ok: false, motiv: 'nimic-ales' };
  if (!(c.toleranta >= TOLERANTA_MINIMA && c.toleranta <= TOLERANTA_MAXIMA)) return { ok: false, motiv: 'toleranta' };
  if (c.fel === 'cerc' && c.diametru !== null && !pozitiv(c.diametru)) return { ok: false, motiv: 'valoare' };
  if (c.fel === 'dreptunghi' && c.marime && !(pozitiv(c.marime.latime) && pozitiv(c.marime.inaltime))) return { ok: false, motiv: 'valoare' };
  if (c.fel === 'netezire' && !pozitiv(c.pastreaza)) return { ok: false, motiv: 'valoare' };
  const alese = new Set(c.alese);
  const folosiri = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const st: Stare = { convertite: 0, sarite: 0, nepotrivite: 0, abatereMinima: null, operatie: 0, abatere: 0, curbe: 0, arce: 0, linii: 0 };
  const schimbate = new Map<string, Piesa>();
  for (const inst of foaie.instante) {
    const p = alese.has(inst.id) ? piese.get(inst.piesa) : undefined;
    if (!p) continue;
    const lume = elementeInstanta(p.radacina, inst, matriceInstanta(inst));
    if ((folosiri.get(p.id) ?? 0) > 1) {
      st.sarite += lume.length;
      continue;
    }
    const noduri = elementeArbore(p.radacina);
    const noi = new Map<string, ElementNod>();
    for (const e of lume) {
      const nod = noduri.get(e.nod);
      const nou = nod ? convertesteElement(e, nod, p, c, st) : null;
      if (nou) noi.set(e.nod, nou);
    }
    st.convertite += noi.size;
    if (noi.size > 0) schimbate.set(p.id, { ...p, radacina: inlocuieste(p.radacina, noi) });
  }
  return { ok: true, piese: [...schimbate.values()], ...st };
}

