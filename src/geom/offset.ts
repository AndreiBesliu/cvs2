import { plineClosed, plineOpen, StaticAabb2dIndexBuilder, type Polyline } from './cavalier/index.ts';
import {
  LINIE, arc, arieCuSemn, cerculArcului, inSensTrigonometric, numarSegmente, segment, type Contur, type Punct, type Segment, type Varf,
} from './contur.ts';
import { CUTIE_GOALA, cuPunct, cutieArc, type Cutie } from './cutie.ts';
import { distantaLaContur, distantaLaSegment, inRegiune, RIDICARE_RAZA, traversariSegment } from './distanta.ts';

/**
 * Cutii într-un index static (arborele R împachetat al lui cavalier; cavalier se folosește doar prin fațada asta, regula
 * `cavalier-doar-prin-fatada`). Cutiile se lărgesc cu o margine peste rotunjire, deci o întrebare întoarce un SUPERSET:
 * cine filtrează după aceea cu măsura exactă obține rezultatul exact (recenzia 2.7b: verificările erau O(n·m)).
 */
export type IndexCutii = { readonly vizita: (c: Cutie, f: (i: number) => void) => void };

const marjaIndex = (c: Cutie): number => 1e-6 + 1e-12 * Math.max(Math.abs(c.minX), Math.abs(c.minY), Math.abs(c.maxX), Math.abs(c.maxY));

export function indexCutii(cutii: readonly Cutie[]): IndexCutii {
  const b = new StaticAabb2dIndexBuilder(cutii.length);
  for (const c of cutii) {
    const m = marjaIndex(c);
    b.add(c.minX - m, c.minY - m, c.maxX + m, c.maxY + m);
  }
  const index = b.build();
  return { vizita: (c, f) => { index.visitQuery(c.minX, c.minY, c.maxX, c.maxY, (i) => { f(i); }); } };
}

type SegmentIndexat = { readonly a: Punct; readonly b: Punct; readonly s: Segment };
type ConturIndexat = { readonly segmente: readonly SegmentIndexat[]; readonly index: IndexCutii };

function cutieSegment(a: Punct, b: Punct, s: Segment): Cutie {
  if (s.tip === 'A') {
    const k = cerculArcului(a, b, s.bulge);
    return cutieArc(a, b, k.centru, k.baleiaj);
  }
  const c = cuPunct(cuPunct(CUTIE_GOALA, a), b);
  return s.tip === 'C' ? cuPunct(cuPunct(c, s.c1), s.c2) : c;
}

function indexeaza(c: Contur): ConturIndexat {
  const segmente = Array.from({ length: numarSegmente(c) }, (_, i) => segment(c, i));
  return { segmente, index: indexCutii(segmente.map((s) => cutieSegment(s.a, s.b, s.s))) };
}

/** Distanța de la p la contur, exactă dacă e cel mult `raza`; altfel un număr peste `raza` (Infinity, dacă nimic nu e aproape). */
function distantaIndexata(p: Punct, ic: ConturIndexat, raza: number): number {
  let d = Infinity;
  ic.index.vizita({ minX: p.x - raza, minY: p.y - raza, maxX: p.x + raza, maxY: p.y + raza }, (i) => {
    const s = ic.segmente[i];
    if (s) d = Math.min(d, distantaLaSegment(p, s.a, s.b, s.s));
  });
  return d;
}

/** `inRegiune(p, [c])` pe index: doar segmentele a căror cutie atinge raza orizontală din p spre +x. */
function inRegiuneIndexata(p: Punct, ic: ConturIndexat): boolean {
  const y = p.y + RIDICARE_RAZA;
  let n = 0;
  ic.index.vizita({ minX: p.x, minY: y, maxX: Infinity, maxY: y }, (i) => {
    const s = ic.segmente[i];
    if (s) n += traversariSegment(p, y, s.a, s.b, s.s);
  });
  return n % 2 === 1;
}

/**
 * Offsetul (T5, ADR 0005): cavalier_contours, adus în repo în `cavalier/`. Arcele rămân arce. Orice eșec iese ca motiv
 * scris, niciodată ca traseu tăcut și niciodată ca excepție.
 *
 * Gărzile (felia 2.1; contractul e în `docs/etape/etapa-02.md`, din `docs/faza2/sonde/s1-geometrie/VERIFICARE.md` §5):
 * - **rezoluția declarată e 0,01 mm:** o distanță sub jumătatea ei e refuzată;
 * - **intrarea se curăță fără să-și schimbe forma** (arcele de peste 180° împărțite, arcele plate devenite linii, vârfuri
 *   repetate, vârfuri în plus pe o latură dreaptă), iar cea care nu se poate decala (degenerată, autointersectată, cu
 *   cubice) e refuzată cu motiv. Și la distanța 0;
 * - **ieșirea se verifică singură** (`verificaIesire`): fiecare punct al traseului stă la |d| de intrare, pe partea
 *   cerută; niciun contur nu se atinge pe el însuși sau pe altul; insulele merg trigonometric, găurile orar. La o
 *   verificare picată se încearcă o dată cu |d| + 1e-4 mm: la un prag de topologie (un gât lat exact cât 2d), epsilon-ul
 *   lui cavalier decide, iar 0,1 µm mai încolo rezultatul e cel corect (s1-V §5.4; măsurat pe 08.10). Apoi se refuză.
 */
export type RezultatOffset =
  | { readonly ok: true; readonly contururi: readonly Contur[] }
  | { readonly ok: false; readonly motiv: string };

/** Rezoluția modelului, în mm: sub ea (colțuri, offseturi), rezultatul nu e garantat (s1-V §5.4). */
export const REZOLUTIE = 0.01;
/** Cea mai mică distanță de offset acceptată: jumătate din rezoluție. */
export const DISTANTA_MINIMA = REZOLUTIE / 2;
/** Două puncte mai apropiate de atât sunt unul singur, iar două segmente mai apropiate se ating (mm). */
export const EPS_ATINGERE = 1e-6;
/** Un arc mai plat de atât e o linie (s1-V §5.6); și traseul pe linie îl scrie linie (`taieBucla`). */
export const BULGE_MINIM = 1e-6;
/** Pasul celei de-a doua încercări: peste pragul de topologie decis de epsilon, sub rezoluția postului (1 µm). */
const PAS_REINCERCARE = 1e-4;
/** Cât poate diferi distanța unui punct al traseului de |d| (mm): sub rezoluția declarată, cu loc pentru rotunjiri. */
const TOLERANTA_DISTANTA = 2e-3;

function laCavalier(c: Contur): Polyline {
  const v: Array<[number, number, number]> = c.varfuri.map((varf) => {
    if (varf.s.tip === 'C') throw new Error('cubicele intră în offset doar ca biarce');
    return [varf.p.x, varf.p.y, varf.s.tip === 'A' ? varf.s.bulge : 0];
  });
  return c.inchis ? plineClosed(v) : plineOpen(v);
}

function dinCavalier(pl: Polyline): Contur {
  const varfuri: Varf[] = [];
  for (let i = 0; i < pl.vertexCount; i++) {
    const v = pl.at(i);
    varfuri.push({ p: { x: v.x, y: v.y }, s: v.bulge === 0 ? LINIE : arc(v.bulge) });
  }
  return { inchis: pl.isClosed, varfuri };
}

/** Lungimea segmentului care pleacă din `a` spre `b`, pe curbă (un arc aproape întreg are coarda mică, nu lungimea). */
function lungime(a: Punct, b: Punct, s: Varf['s']): number {
  if (s.tip !== 'A') return Math.hypot(b.x - a.x, b.y - a.y);
  const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
  return Number.isFinite(raza) ? raza * Math.abs(baleiaj) : Math.hypot(b.x - a.x, b.y - a.y);
}

/** Mijlocul segmentului, pe curbă. */
function mijloc(a: Punct, b: Punct, s: Varf['s']): Punct {
  if (s.tip !== 'A') return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
  const u = start + baleiaj / 2;
  return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
}

/**
 * Arcele de peste 180° (|bulge| > 1) se împart în două jumătăți: cavalier le cere de cel mult 180°. Forma nu se schimbă:
 * mijlocul e pe același cerc, iar fiecare jumătate are bulge-ul tan(atan(b) / 2).
 */
function imparteArceMari(varfuri: readonly Varf[]): Varf[] {
  const rez: Varf[] = [];
  for (let i = 0; i < varfuri.length; i++) {
    const v = varfuri[i];
    const urm = varfuri[(i + 1) % varfuri.length];
    if (!v || !urm) continue;
    if (v.s.tip === 'A' && Math.abs(v.s.bulge) > 1) {
      const jumatate = arc(Math.tan(Math.atan(v.s.bulge) / 2));
      rez.push({ p: v.p, s: jumatate }, { p: mijloc(v.p, urm.p, v.s), s: jumatate });
    } else {
      rez.push(v);
    }
  }
  return rez;
}

/**
 * Vârfurile unui contur închis, cu segmentele mai scurte de `eps` (pe curbă) scoase: capetele lor se unesc. Rămâne
 * vârful cu indicele mai mic, cu segmentul celui scos, deci un contur curat nu se mișcă deloc: un vârf repetat la 1e-7 mm
 * dispare fără să-și ia locul celui adevărat. Merge în cerc: ultimul se unește și cu primul (rămâne primul).
 */
function unesteVarfuri(varfuri: readonly Varf[], eps: number): Varf[] {
  const v = [...varfuri];
  let schimbat = true;
  while (schimbat && v.length > 1) {
    schimbat = false;
    for (let i = 0; i < v.length && v.length > 1; i++) {
      const urm = (i + 1) % v.length;
      const a = v[i];
      const b = v[urm];
      if (!a || !b || lungime(a.p, b.p, a.s) >= eps) continue;
      if (urm === 0) {
        // Perechea ultim–prim: segmentul scurt e al ultimului, care pleacă.
        v.splice(i, 1);
      } else {
        v[i] = { p: a.p, s: b.s };
        v.splice(urm, 1);
      }
      schimbat = true;
      i--;
    }
  }
  return v;
}

/** Scoate un vârf între două linii care stă pe latura dreaptă dintre vecinii lui (fără să întoarcă drumul înapoi). */
function scoateVarfuriPeLatura(varfuri: readonly Varf[]): Varf[] {
  const v = [...varfuri];
  let schimbat = true;
  while (schimbat && v.length > 3) {
    schimbat = false;
    for (let i = 0; i < v.length && v.length > 3; i++) {
      const prev = v[(i - 1 + v.length) % v.length];
      const cur = v[i];
      const next = v[(i + 1) % v.length];
      if (!prev || !cur || !next || prev.s.tip !== 'L' || cur.s.tip !== 'L') continue;
      const dx = next.p.x - prev.p.x;
      const dy = next.p.y - prev.p.y;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) continue;
      const t = ((cur.p.x - prev.p.x) * dx + (cur.p.y - prev.p.y) * dy) / l2;
      const departe = Math.abs((cur.p.x - prev.p.x) * dy - (cur.p.y - prev.p.y) * dx) / Math.sqrt(l2);
      if (t > 0 && t < 1 && departe < EPS_ATINGERE) {
        v.splice(i, 1);
        schimbat = true;
        i--;
      }
    }
  }
  return v;
}

/** Cât de aproape de vârful lor comun poate cădea un fals contact între două segmente vecine tangente (mm). */
const CONTACT_VECIN = 1e-4;

/** Direcția de mers a segmentului de la a la b, la un capăt (0 = în a, 1 = în b): arcul e coarda rotită cu ∓2·atan(bulge). */
function directieLaCapat(a: Punct, b: Punct, s: Varf['s'], la: 0 | 1): Punct {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / l, uy = (b.y - a.y) / l;
  if (s.tip !== 'A') return { x: ux, y: uy };
  const fi = (la === 0 ? -2 : 2) * Math.atan(s.bulge);
  return { x: ux * Math.cos(fi) - uy * Math.sin(fi), y: ux * Math.sin(fi) + uy * Math.cos(fi) };
}

/**
 * Conturul se atinge singur? Cavalier socotește centrele în double: la două arce mici tangente în vârful lor comun,
 * distanța dintre centre iese cu ~1e-14 peste diferența razelor, iar intersecția cercurilor dă un al doilea punct la
 * ~1e-6 mm de vârf (recenzia 2.7b: lanțurile de biarce, până la 90 % din florile mici refuzate fals). Un astfel de punct,
 * între două segmente VECINE, la cel mult `CONTACT_VECIN` de vârful lor comun, unde mersul se rupe cu sub 90°, nu e o
 * autointersecție: o linie sau un arc de cel mult 180° nu-și poate tăia vecinul lângă vârf fără să se întoarcă. Restul
 * (suprapunerile, întoarcerile, intersecțiile depărtate) rămân refuzate.
 */
function seAtingeSingur(c: Contur): boolean {
  const n = c.varfuri.length;
  let gasit = false;
  laCavalier(c).visitSelfIntersectsOpt((x) => {
    if (x.kind === 'basic' && c.inchis && n >= 3) {
      const urmator = x.startIndex2 === (x.startIndex1 + 1) % n ? [x.startIndex1, x.startIndex2]
        : x.startIndex1 === (x.startIndex2 + 1) % n ? [x.startIndex2, x.startIndex1] : null;
      if (urmator) {
        const a = c.varfuri[urmator[0] as number], v = c.varfuri[urmator[1] as number], b = c.varfuri[((urmator[1] as number) + 1) % n];
        if (a && v && b && Math.hypot(x.point.x - v.p.x, x.point.y - v.p.y) <= CONTACT_VECIN) {
          const ti = directieLaCapat(a.p, v.p, a.s, 1), to = directieLaCapat(v.p, b.p, v.s, 0);
          if (ti.x * to.x + ti.y * to.y > 0) return true;
        }
      }
    }
    gasit = true;
    return false;
  }, { posEqualEps: EPS_ATINGERE });
  return gasit;
}

function seAtingIntreEle(a: Contur, b: Contur): boolean {
  const r = laCavalier(a).findIntersectsOpt(laCavalier(b), { posEqualEps: EPS_ATINGERE });
  return r.basicIntersects.length + r.overlappingIntersects.length > 0;
}

type Curatare = { readonly ok: true; readonly contur: Contur } | { readonly ok: false; readonly motiv: string };

/** Ușa de intrare a offsetului: curăță ce se poate curăța fără să schimbe forma și refuză ce nu se poate decala. */
export function curataIntrare(c: Contur): Curatare {
  if (!c.inchis) return { ok: false, motiv: 'offsetul exterior / interior cere un contur închis' };
  for (const v of c.varfuri) {
    if (v.s.tip === 'C') return { ok: false, motiv: 'conturul are o cubică: intră în offset doar ca biarce (felia 2.7)' };
    if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y) || (v.s.tip === 'A' && !Number.isFinite(v.s.bulge))) {
      return { ok: false, motiv: 'conturul are o coordonată care nu e un număr finit' };
    }
  }
  const plate = c.varfuri.map((v) => (v.s.tip === 'A' && Math.abs(v.s.bulge) < BULGE_MINIM ? { p: v.p, s: LINIE } : v));
  const varfuri = scoateVarfuriPeLatura(unesteVarfuri(imparteArceMari(plate), EPS_ATINGERE));
  if (varfuri.length < 2) return { ok: false, motiv: 'conturul are mai puțin de două vârfuri distincte' };
  const curat: Contur = { inchis: true, varfuri };
  // Întâi autointersecția: o fundiță are aria netă zero, iar motivul adevărat e că laturile ei se taie.
  let autointersectat: boolean;
  try {
    autointersectat = seAtingeSingur(curat);
  } catch (e) {
    return { ok: false, motiv: `conturul nu se poate citi: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (autointersectat) return { ok: false, motiv: 'conturul se autointersectează: nu se poate decala' };
  // Un contur închis care nu se autointersectează are arie; unul mai mic decât rezoluția nu se poate însă garanta.
  const xs = varfuri.map((v) => v.p.x);
  const ys = varfuri.map((v) => v.p.y);
  if (Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < REZOLUTIE) {
    return { ok: false, motiv: `conturul e mai mic decât rezoluția declarată (${REZOLUTIE} mm)` };
  }
  return { ok: true, contur: curat };
}

/**
 * Ieșirea, fără segmentele de lungime practic zero (sub toleranța de atingere). Cele scurte, dar reale, rămân: scoaterea
 * lor ar muta începutul arcului următor, iar arcul și-ar schimba cercul (măsurat pe 08.10: conturul ajungea să se atingă
 * singur). Postul scrie oricum G1 acolo unde coarda e sub 10 rezoluții.
 */
function curataIesire(c: Contur): Contur {
  return { inchis: c.inchis, varfuri: unesteVarfuri(c.varfuri, EPS_ATINGERE) };
}

/** Cel mult atâtea segmente între cele două care se taie: o buclă locală, nu o parte din traseu. */
const SEGMENTE_BUCLA = 8;
/** O buclă locală mai scurtă de atât (mm, pe curbă) e un artefact al tăierii, nu traseu (măsurat: 5e-4 … 0,03 mm). */
const BUCLA_MAXIMA = 0.1;

/**
 * Segmentul de la a la b tăiat în punctul X de pe el: partea dinainte de X (`inainte`) sau cea de după, cu bulge-ul ei
 * (arcul își păstrează cercul; baleiajul se împarte la unghiul lui X).
 */
function parteDin(a: Punct, b: Punct, s: Varf['s'], X: Punct, inainte: boolean): Varf['s'] {
  if (s.tip !== 'A') return LINIE;
  const { centru, start, baleiaj } = cerculArcului(a, b, s.bulge);
  const doiPi = 2 * Math.PI;
  const uX = Math.atan2(X.y - centru.y, X.x - centru.x);
  let rel = baleiaj >= 0 ? uX - start : start - uX;
  rel = Math.min(((rel % doiPi) + doiPi) % doiPi, Math.abs(baleiaj));
  const pana = Math.sign(baleiaj) * rel;
  const parte = inainte ? pana : baleiaj - pana;
  return Math.abs(parte) < 1e-15 ? LINIE : arc(Math.tan(parte / 4));
}

/**
 * Buclele minuscule ale ieșirii cavalier (recenzia 2.7b). La o joncțiune aproape tangentă a intrării (o linie lângă un arc
 * al biarcelor, cu frântura de ~1e-4 rad), offsetul intersectează două segmente aproape paralele; punctul e prost
 * condiționat, iar tăierea lasă o buclă de ~1e-3 mm care se întoarce în același punct. Offsetul exact n-are bucle, deci
 * o buclă LOCALĂ (cel mult `SEGMENTE_BUCLA` segmente între cele două care se taie), mai scurtă de `BUCLA_MAXIMA`, se
 * scoate: traseul trece direct prin punctul de intersecție. Ce rămâne se verifică apoi ca orice ieșire (distanța la |d|,
 * partea, nicio altă atingere), deci o tăiere greșită nu trece.
 */
function scoateBucleMici(c: Contur): Contur {
  let cur = c;
  for (let runda = 0; runda < 64 && cur.inchis; runda++) {
    const n = cur.varfuri.length;
    if (n < 4) return cur;
    let taiat: Contur | null = null;
    laCavalier(cur).visitSelfIntersectsOpt((x) => {
      if (x.kind !== 'basic') return true;
      for (const [i, j] of [[x.startIndex1, x.startIndex2], [x.startIndex2, x.startIndex1]] as const) {
        const k = (j - i + n) % n;
        if (k < 1 || k > SEGMENTE_BUCLA) continue;
        const vi = cur.varfuri[i], vi1 = cur.varfuri[(i + 1) % n], vj = cur.varfuri[j], vj1 = cur.varfuri[(j + 1) % n];
        if (!vi || !vi1 || !vj || !vj1) continue;
        const X = { x: x.point.x, y: x.point.y };
        // Două segmente vecine care se „taie” lângă vârful lor comun: contactul fals de la o joncțiune tangentă (vezi
        // `seAtingeSingur`), nu o buclă. O buclă reală între vecini are al doilea punct departe de vârf.
        if (k === 1 && Math.hypot(X.x - vj.p.x, X.y - vj.p.y) <= CONTACT_VECIN) continue;
        let L = lungime(X, vi1.p, parteDin(vi.p, vi1.p, vi.s, X, false)) + lungime(vj.p, X, parteDin(vj.p, vj1.p, vj.s, X, true));
        for (let m = 1; m < k; m++) {
          const a = cur.varfuri[(i + m) % n], b = cur.varfuri[(i + m + 1) % n];
          if (a && b) L += lungime(a.p, b.p, a.s);
        }
        if (!(L < BUCLA_MAXIMA) || !(L > EPS_ATINGERE)) continue;
        // De la vj1 înainte până la vi (cu segmentul tăiat în X), apoi X cu restul lui j: vârfurile buclei cad.
        const varfuri: Varf[] = [];
        for (let m = (j + 1) % n; ; m = (m + 1) % n) {
          const v = cur.varfuri[m];
          if (!v) break;
          varfuri.push(m === i ? { p: v.p, s: parteDin(vi.p, vi1.p, vi.s, X, true) } : v);
          if (m === i) break;
        }
        varfuri.push({ p: X, s: parteDin(vj.p, vj1.p, vj.s, X, false) });
        taiat = { inchis: true, varfuri };
        return false;
      }
      return true;
    }, { posEqualEps: EPS_ATINGERE });
    if (!taiat) return cur;
    cur = taiat;
  }
  return cur;
}

/**
 * Ce e greșit în ieșirea offsetului `d` al conturului `intrare` (curățat, trigonometric), sau null. Ieșirea se verifică pe
 * ea însăși față de intrare, nu doar ca formă. Aria nu se mai verifică separat: o curbă închisă cu toate punctele la
 * exact |d| de intrare, pe partea cerută, e chiar curba de nivel, deci aria ei crește afară și scade înăuntru de la sine.
 */
export function verificaIesire(intrare: Contur, d: number, iesire: readonly Contur[]): string | null {
  if (iesire.length === 0) return d < 0 ? 'scula nu încape: offsetul interior dispare' : 'offsetul exterior n-a dat niciun contur';
  for (const c of iesire) {
    if (!c.inchis) return 'offsetul a dat un contur deschis';
    if (c.varfuri.length < 2) return 'offsetul a dat un contur cu mai puțin de două vârfuri';
    for (const v of c.varfuri) {
      if (v.s.tip === 'C') return 'offsetul a dat o cubică';
      if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y) || (v.s.tip === 'A' && !Number.isFinite(v.s.bulge))) {
        return 'offsetul a dat o coordonată nefinită';
      }
    }
  }
  // Fiecare punct al traseului (vârfurile și mijloacele segmentelor) stă la |d| de intrare, pe partea cerută. Intrarea se
  // indexează o dată, iar distanța se caută doar până la |d| + toleranță; mesajul unui eșec o măsoară întreagă.
  const ic = indexeaza(intrare);
  const raza = Math.abs(d) + TOLERANTA_DISTANTA;
  for (const c of iesire) {
    for (let i = 0; i < c.varfuri.length; i++) {
      const v = c.varfuri[i];
      const urm = c.varfuri[(i + 1) % c.varfuri.length];
      if (!v || !urm) continue;
      for (const p of [v.p, mijloc(v.p, urm.p, v.s)]) {
        if (Math.abs(distantaIndexata(p, ic, raza) - Math.abs(d)) > TOLERANTA_DISTANTA) {
          const dist = distantaLaContur(p, intrare);
          if (Math.abs(dist - Math.abs(d)) > TOLERANTA_DISTANTA) {
            return `offsetul a dat un punct la ${dist.toFixed(4)} mm de contur, nu la ${Math.abs(d)} mm`;
          }
        }
        if (inRegiuneIndexata(p, ic) !== d < 0) return 'offsetul a dat un punct pe partea greșită a conturului';
      }
    }
  }
  // Niciun contur nu se atinge pe el însuși sau pe altul: freza ar trece de două ori pe același loc.
  for (let i = 0; i < iesire.length; i++) {
    const a = iesire[i];
    if (!a) continue;
    if (seAtingeSingur(a)) return 'offsetul a dat un contur care se atinge singur';
    for (let j = i + 1; j < iesire.length; j++) {
      const b = iesire[j];
      if (b && seAtingIntreEle(a, b)) return 'offsetul a dat două contururi care se ating';
    }
  }
  // Insulele merg trigonometric, găurile orar: adâncimea de includere pară = insulă.
  for (const c of iesire) {
    const p = c.varfuri[0]?.p;
    if (!p) continue;
    const adancime = iesire.filter((alt) => alt !== c && inRegiune(p, [alt])).length;
    if ((arieCuSemn(c) > 0) !== (adancime % 2 === 0)) return 'offsetul a dat un contur în sensul greșit';
  }
  return null;
}

function incearca(intrare: Contur, d: number): RezultatOffset {
  let rezultat: Polyline[];
  try {
    // cavalier: pe un contur trigonometric, distanța pozitivă merge spre interior.
    rezultat = laCavalier(intrare).parallelOffset(-d);
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
  const contururi = rezultat.map((pl) => curataIesire(scoateBucleMici(dinCavalier(pl))));
  const problema = verificaIesire(intrare, d, contururi);
  return problema ? { ok: false, motiv: problema } : { ok: true, contururi };
}

/**
 * Offsetul unui contur închis, spre exterior (`distanta` > 0) sau spre interior (`distanta` < 0). Conturul se curăță,
 * se aduce în sens trigonometric (ca semnul să însemne același lucru pentru orice intrare), se decalează, iar ieșirea se
 * verifică. La distanța 0, conturul trece tot prin gărzi și iese neschimbat. Niciodată o excepție: orice eșec iese ca motiv.
 */
export function offsetInchis(contur: Contur, distanta: number): RezultatOffset {
  if (!contur.inchis) return { ok: false, motiv: 'offsetul exterior / interior cere un contur închis' };
  if (!Number.isFinite(distanta)) return { ok: false, motiv: `distanța offsetului nu e un număr finit (${distanta})` };
  if (distanta !== 0 && Math.abs(distanta) < DISTANTA_MINIMA) {
    return { ok: false, motiv: `distanța ${distanta} mm e sub rezoluția declarată (${REZOLUTIE} mm)` };
  }
  try {
    const intrare = curataIntrare(contur);
    if (!intrare.ok) return intrare;
    if (distanta === 0) return { ok: true, contururi: [contur] };
    const trig = inSensTrigonometric(intrare.contur);
    const prima = incearca(trig, distanta);
    if (prima.ok) return prima;
    // Interiorul care dispare nu e un accident numeric: scula chiar nu încape.
    if (prima.motiv.startsWith('scula nu încape')) return prima;
    const aDoua = incearca(trig, distanta + Math.sign(distanta) * PAS_REINCERCARE);
    return aDoua.ok ? aDoua : { ok: false, motiv: `${prima.motiv} (și la a doua încercare)` };
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
}
