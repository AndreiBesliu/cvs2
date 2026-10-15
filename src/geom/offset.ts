import { plineClosed, plineOpen, StaticAabb2dIndexBuilder, type Polyline } from './cavalier/index.ts';
import {
  LINIE, arc, arieCuSemn, cerculArcului, inSensTrigonometric, numarSegmente, segment, type Contur, type Punct, type Segment, type Varf,
} from './contur.ts';
import { CUTIE_GOALA, cuPunct, cutieArc, type Cutie } from './cutie.ts';
import { distantaLaContur, distantaLaSegment, inRegiune, peArc, RIDICARE_RAZA, traversariSegment } from './distanta.ts';
import { REZOLUTIE } from './toleranta.ts';

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

/** Rezoluția modelului (`toleranta.ts`, un singur loc): sub ea, rezultatul nu e garantat (s1-V §5.4). */
export { REZOLUTIE };
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
 * mijlocul e pe același cerc, iar fiecare jumătate are bulge-ul tan(atan(b) / 2). Pe o cale deschisă, segmentul ultimului
 * vârf nu există (ADR 0001), deci nu se împarte.
 */
function imparteArceMari(varfuri: readonly Varf[], inchis = true): Varf[] {
  const rez: Varf[] = [];
  for (let i = 0; i < varfuri.length; i++) {
    const v = varfuri[i];
    const urm = varfuri[(i + 1) % varfuri.length];
    if (!v || !urm) continue;
    if (v.s.tip === 'A' && Math.abs(v.s.bulge) > 1 && (inchis || i < varfuri.length - 1)) {
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
 *
 * Pe o cale deschisă (ADR 0037 §5): fără perechea ultim–prim, iar capetele nu se mută. Un segment scurt la capătul de
 * final pierde vârful dinspre interior; unul singur, scurt, rămâne (îl refuză verificarea lungimii).
 */
function unesteVarfuri(varfuri: readonly Varf[], eps: number, inchis = true): Varf[] {
  const v = [...varfuri];
  let schimbat = true;
  while (schimbat && v.length > 1) {
    schimbat = false;
    for (let i = 0; i < (inchis ? v.length : v.length - 1) && v.length > 1; i++) {
      const urm = (i + 1) % v.length;
      const a = v[i];
      const b = v[urm];
      if (!a || !b || lungime(a.p, b.p, a.s) >= eps) continue;
      if (urm === 0) {
        // Perechea ultim–prim: segmentul scurt e al ultimului, care pleacă.
        v.splice(i, 1);
      } else if (!inchis && urm === v.length - 1) {
        if (v.length === 2) continue;
        // Ultimul segment al unei căi deschise: capătul rămâne, pleacă vârful dinspre interior.
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

/**
 * Scoate un vârf între două linii care stă pe latura dreaptă dintre vecinii lui (fără să întoarcă drumul înapoi). Pe o
 * cale deschisă, doar din interior: capetele rămân.
 */
function scoateVarfuriPeLatura(varfuri: readonly Varf[], inchis = true): Varf[] {
  const v = [...varfuri];
  const minim = inchis ? 3 : 2;
  let schimbat = true;
  while (schimbat && v.length > minim) {
    schimbat = false;
    for (let i = inchis ? 0 : 1; i < (inchis ? v.length : v.length - 1) && v.length > minim; i++) {
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
 * (suprapunerile, întoarcerile, intersecțiile depărtate) rămân refuzate. Pe o cale deschisă la fel, fără perechea
 * ultim–prim (ADR 0037 §5).
 *
 * La fel, o „suprapunere” raportată între doi vecini care merg înainte (sub 90°): doi vecini care merg înainte au în comun
 * doar vârful, deci suprapunerea e testul de paralelism nenormalizat al lui cavalier pe două coarde aproape coliniare
 * (recenzia B: un arc de 270° din coarde de 0,015 mm era refuzat cu „se atinge singură”, deși nu se atinge). Un vecin
 * care se întoarce peste celălalt (peste 90°) rămâne atingere.
 *
 * `iesireDeschisa` (doar bucățile offsetului deschis, ADR 0037 §5, „Atingerile”), două atingeri nu sunt atingeri:
 * - o suprapunere a două linii în sensuri opuse: traseul dus-întors al canelurii cât freza;
 * - capătul bucății în startul ei: freza ocolește o cameră cu gura mai îngustă decât D și se întoarce de unde a plecat
 *   (precizarea 2.3c-4), ca un contur închis.
 * Distanța la |d|, partea și acoperirea se verifică separat.
 */
function seAtingeSingur(c: Contur, iesireDeschisa = false): boolean {
  const n = c.varfuri.length;
  const dupa = (i: number): number => (c.inchis ? (i + 1) % n : i + 1);
  let gasit = false;
  laCavalier(c).visitSelfIntersectsOpt((x) => {
    if (iesireDeschisa && x.kind !== 'basic' && suprapunereDusIntors(c, x.startIndex1, x.startIndex2)) return true;
    if (iesireDeschisa && x.kind === 'basic' && capatInStart(c, x.startIndex1, x.startIndex2, x.point)) return true;
    if (x.kind !== 'basic' && n >= 3) {
      const urmator = x.startIndex2 === dupa(x.startIndex1) ? [x.startIndex1, x.startIndex2]
        : x.startIndex1 === dupa(x.startIndex2) ? [x.startIndex2, x.startIndex1] : null;
      const a = urmator ? c.varfuri[urmator[0] as number] : undefined, v = urmator ? c.varfuri[urmator[1] as number] : undefined;
      const b = urmator ? c.varfuri[dupa(urmator[1] as number)] : undefined;
      if (a && v && b) {
        const ti = directieLaCapat(a.p, v.p, a.s, 1), to = directieLaCapat(v.p, b.p, v.s, 0);
        if (ti.x * to.x + ti.y * to.y > 0) return true;
      }
    }
    if (x.kind === 'basic' && n >= 3) {
      const urmator = x.startIndex2 === dupa(x.startIndex1) ? [x.startIndex1, x.startIndex2]
        : x.startIndex1 === dupa(x.startIndex2) ? [x.startIndex2, x.startIndex1] : null;
      if (urmator) {
        const a = c.varfuri[urmator[0] as number], v = c.varfuri[urmator[1] as number], b = c.varfuri[dupa(urmator[1] as number)];
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

/** O cale deschisă care se închide pe ea însăși: atingerea e între primul și ultimul segment, în start, iar capătul e acolo. */
function capatInStart(c: Contur, i: number, j: number, x: Punct): boolean {
  const n = c.varfuri.length;
  const start = c.varfuri[0]?.p, capat = c.varfuri[n - 1]?.p;
  if (c.inchis || n < 3 || !start || !capat || Math.min(i, j) !== 0 || Math.max(i, j) !== n - 2) return false;
  return Math.hypot(capat.x - start.x, capat.y - start.y) <= EPS_ATINGERE && Math.hypot(x.x - start.x, x.y - start.y) <= EPS_ATINGERE;
}

/** Segmentele i și j sunt două linii în sensuri opuse (traseul dus-întors al canelurii cât freza)? */
function suprapunereDusIntors(c: Contur, i: number, j: number): boolean {
  const n = c.varfuri.length;
  const a = c.varfuri[i], a2 = c.varfuri[(i + 1) % n], b = c.varfuri[j], b2 = c.varfuri[(j + 1) % n];
  if (!a || !a2 || !b || !b2 || a.s.tip !== 'L' || b.s.tip !== 'L') return false;
  return (a2.p.x - a.p.x) * (b2.p.x - b.p.x) + (a2.p.y - a.p.y) * (b2.p.y - b.p.y) < 0;
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
  return { inchis: c.inchis, varfuri: unesteVarfuri(c.varfuri, EPS_ATINGERE, c.inchis) };
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
 * partea, nicio altă atingere), deci o tăiere greșită nu trece. La fel pe bucățile offsetului deschis, fără să treacă
 * peste capăt.
 */
function scoateBucleMici(c: Contur): Contur {
  let cur = c;
  for (let runda = 0; runda < 64; runda++) {
    const n = cur.varfuri.length;
    if (n < 4) return cur;
    const inchis = cur.inchis;
    let taiat: Contur | null = null;
    laCavalier(cur).visitSelfIntersectsOpt((x) => {
      if (x.kind !== 'basic') return true;
      for (const [i, j] of [[x.startIndex1, x.startIndex2], [x.startIndex2, x.startIndex1]] as const) {
        const k = inchis ? (j - i + n) % n : j - i;
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
        if (!inchis) {
          // Deschis: vârfurile până la vi (cu segmentul tăiat în X), X cu restul lui j, apoi cele de după j.
          const deschis: Varf[] = [...cur.varfuri.slice(0, i), { p: vi.p, s: parteDin(vi.p, vi1.p, vi.s, X, true) }];
          deschis.push({ p: X, s: parteDin(vj.p, vj1.p, vj.s, X, false) }, ...cur.varfuri.slice(j + 1));
          taiat = { inchis: false, varfuri: deschis };
          return false;
        }
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

// ── Offsetul deschis (ADR 0037 §5, felia 2.3c-4) ────────────────────────────────────────────────────────────────────

/** Pasul eșantioanelor ideale ale acoperirii, pe cale și pe evantaiele colțurilor (mm, ADR 0037 §5). */
const PAS_ACOPERIRE = 0.05;
/** Un punct ideal e valid dacă nicio parte a căii nu stă mai aproape de el decât |d| minus atât (mm, ADR 0037 §5). */
const MARJA_VALID = 1e-5;
/** Înjumătățirile marginilor lui `neatins`, pe un pas de cel mult 0,05 mm: mult sub rezoluție. */
const INJUMATATIRI = 40;
/** Un picior mai aproape de atât de capătul segmentului (mm) cade în vârf. */
const LA_VARF = 1e-9;
const NU_INCAPE = 'scula nu încape pe partea cerută';
/**
 * O frângere a căii sub atât (rad) e mers drept pentru parte: evantaiul ei ar avea |d| · 1e-6 mm, sub rezoluție. Recenzia
 * B: joncțiunile tangente ale biarcelor ies, departe de origine, cu frângeri de zgomot (~1e-12 rad), iar semnul lor nu
 * spune nimic despre partea punctului.
 */
const COTITURA_DREAPTA = 1e-6;
/** Toleranța capetelor pe deschis: cea a lui cavalier (`posEqualEps` implicit), ca intrarea verificată să fie cea decalată. */
const EPS_POZITIE_CAVALIER = 1e-5;
/**
 * Plafonul eșantioanelor ideale ale verificării (ADR 0037 „Limitele”, timpul): ~200 m de cale la 0,05 mm, ~1,5 s pe firul
 * principal. Peste el, refuz cu motiv: o cale atât de lungă își așteaptă calculul în worker.
 */
const PLAFON_ESANTIOANE = 4_000_000;

/**
 * O porțiune a căii pe care freza n-o atinge (ADR 0037 §5, `neatins`): punctele ei ideale nu sunt valide. `de` și `pana`
 * sunt pozițiile pe cale (mm pe curbă, de la vârful 0), `la` e punctul căii din mijlocul porțiunii.
 */
export type PortiuneNeatinsa = { readonly de: number; readonly pana: number; readonly lungime: number; readonly la: Punct };

/**
 * Offsetul unei căi deschise: bucățile (deschise, în sensul desenului, ordonate de-a lungul căii) și porțiunile căii pe
 * care freza nu le atinge, sau un motiv. Niciodată o excepție.
 */
export type RezultatOffsetDeschis =
  | { readonly ok: true; readonly bucati: readonly Contur[]; readonly neatins: readonly PortiuneNeatinsa[] }
  | { readonly ok: false; readonly motiv: string };

type SegmentCale = { readonly a: Punct; readonly b: Punct; readonly s: Segment; readonly lungime: number; readonly s0: number };

/** Segmentele căii, cu lungimea fiecăruia pe curbă și poziția pe cale a startului. */
function segmenteCale(c: Contur): SegmentCale[] {
  const rez: SegmentCale[] = [];
  let s0 = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    const l = lungime(a, b, s);
    rez.push({ a, b, s, lungime: l, s0 });
    s0 += l;
  }
  return rez;
}

/** Punctul segmentului la fracțiunea t din lungimea lui (pe curbă) și normala unitară din stânga mersului, acolo. */
function laFractiune(g: SegmentCale, t: number): { readonly p: Punct; readonly n: Punct } {
  if (g.s.tip !== 'A') {
    const ux = (g.b.x - g.a.x) / g.lungime, uy = (g.b.y - g.a.y) / g.lungime;
    const p = t <= 0 ? g.a : t >= 1 ? g.b : { x: g.a.x + (g.b.x - g.a.x) * t, y: g.a.y + (g.b.y - g.a.y) * t };
    return { p, n: { x: -uy, y: ux } };
  }
  const { centru, raza, start, baleiaj } = cerculArcului(g.a, g.b, g.s.bulge);
  const u = start + baleiaj * t;
  const cu = Math.cos(u), su = Math.sin(u);
  // Stânga mersului: spre centru pe un arc trigonometric, în afară pe unul orar.
  const semn = baleiaj >= 0 ? -1 : 1;
  const p = t <= 0 ? g.a : t >= 1 ? g.b : { x: centru.x + raza * cu, y: centru.y + raza * su };
  return { p, n: { x: semn * cu, y: semn * su } };
}

/** Piciorul lui p pe segment: distanța, fracțiunea t (pe curbă) și punctul. */
function piciorPeSegment(p: Punct, g: SegmentCale): { readonly dist: number; readonly t: number; readonly q: Punct } {
  if (g.s.tip !== 'A') {
    const dx = g.b.x - g.a.x, dy = g.b.y - g.a.y;
    const t = Math.max(0, Math.min(1, ((p.x - g.a.x) * dx + (p.y - g.a.y) * dy) / (dx * dx + dy * dy)));
    const q = { x: g.a.x + t * dx, y: g.a.y + t * dy };
    return { dist: Math.hypot(p.x - q.x, p.y - q.y), t, q };
  }
  const { centru, raza, start, baleiaj } = cerculArcului(g.a, g.b, g.s.bulge);
  const u = Math.atan2(p.y - centru.y, p.x - centru.x);
  if (peArc(u, start, baleiaj)) {
    const doiPi = 2 * Math.PI;
    const rel = baleiaj >= 0 ? (((u - start) % doiPi) + doiPi) % doiPi : (((start - u) % doiPi) + doiPi) % doiPi;
    return {
      dist: Math.abs(Math.hypot(p.x - centru.x, p.y - centru.y) - raza),
      t: Math.min(1, rel / Math.abs(baleiaj)),
      q: { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) },
    };
  }
  const da = Math.hypot(p.x - g.a.x, p.y - g.a.y), db = Math.hypot(p.x - g.b.x, p.y - g.b.y);
  return da <= db ? { dist: da, t: 0, q: g.a } : { dist: db, t: 1, q: g.b };
}

/** Cât pot diferi distanțele a două picioare ca să fie la egalitate (mm): punctul e la fel de aproape de amândouă. */
const EGALITATE_PICIOARE = EPS_ATINGERE;

type Picior = { readonly i: number; readonly t: number; readonly q: Punct; readonly dist: number };

/**
 * Picioarele lui p pe cale (segmentele din index, până la `raza`): cel mai apropiat și cele la egalitate cu el, în ordinea
 * căii. La egalitate punctul are mai multe picioare: de exemplu, la capătul unei bucăți unde două cercuri se taie (zig-zag-ul).
 */
function picioarePeCale(p: Punct, segmente: readonly SegmentCale[], index: IndexCutii, raza: number): Picior[] {
  const toate: Picior[] = [];
  index.vizita({ minX: p.x - raza, minY: p.y - raza, maxX: p.x + raza, maxY: p.y + raza }, (i) => {
    const g = segmente[i];
    if (g) toate.push({ i, ...piciorPeSegment(p, g) });
  });
  const min = Math.min(...toate.map((f) => f.dist));
  const pozitie = (f: Picior): number => (segmente[f.i] as SegmentCale).s0 + f.t * (segmente[f.i] as SegmentCale).lungime;
  return toate.filter((f) => f.dist <= min + EGALITATE_PICIOARE).sort((a, b) => pozitie(a) - pozitie(b));
}

const cruce = (u: Punct, v: Punct): number => u.x * v.y - u.y * v.x;
const scalar = (u: Punct, v: Punct): number => u.x * v.x + u.y * v.y;

/**
 * Punctul p al traseului (la |d| de cale) e pe partea cerută (ADR 0037 §5, „Partea”)? `semn` = semnul lui d (stânga > 0).
 * - piciorul în interiorul unui segment: produsul vectorial al tangentei cu (p − picior) are semnul cerut;
 * - piciorul într-un capăt al căii: p nu stă strict pe partea păstrată a tangentei din capăt și nici în capacul lui;
 * - piciorul într-un vârf din interior: p e în evantaiul colțului, care trebuie să fie convex dinspre sculă.
 * Cu mai multe picioare la egalitate, ajunge unul corect: punctul e pe granița dintre ele (precizarea 2.3c-4).
 */
function peParteaCeruta(p: Punct, segmente: readonly SegmentCale[], index: IndexCutii, d: number): boolean {
  return picioarePeCale(p, segmente, index, Math.abs(d) + TOLERANTA_DISTANTA).some((pc) => corectFataDe(p, pc, segmente, d));
}

function corectFataDe(p: Punct, pc: Picior, segmente: readonly SegmentCale[], d: number): boolean {
  const semn = Math.sign(d);
  const g = segmente[pc.i] as SegmentCale;
  const w = { x: p.x - pc.q.x, y: p.y - pc.q.y };
  const laStart = pc.t * g.lungime <= LA_VARF;
  const laFinal = (1 - pc.t) * g.lungime <= LA_VARF;
  if (laStart && pc.i === 0) {
    const t0 = directieLaCapat(g.a, g.b, g.s, 0);
    return scalar(w, t0) >= -TOLERANTA_DISTANTA && semn * cruce(t0, w) >= -TOLERANTA_DISTANTA;
  }
  if (laFinal && pc.i === segmente.length - 1) {
    const tn = directieLaCapat(g.a, g.b, g.s, 1);
    return scalar(w, tn) <= TOLERANTA_DISTANTA && semn * cruce(tn, w) >= -TOLERANTA_DISTANTA;
  }
  if (laStart || laFinal) {
    const inainte = segmente[laStart ? pc.i - 1 : pc.i] as SegmentCale, dupa = segmente[laStart ? pc.i : pc.i + 1] as SegmentCale;
    const tIn = directieLaCapat(inainte.a, inainte.b, inainte.s, 1), tOut = directieLaCapat(dupa.a, dupa.b, dupa.s, 0);
    const cotitura = cruce(tIn, tOut);
    // Mers (aproape) drept: piciorul e pe normală, iar partea o dă normala medie, nu semnul unei frângeri de zgomot.
    if (Math.abs(Math.atan2(cotitura, scalar(tIn, tOut))) <= COTITURA_DREAPTA) {
      return semn * (-(tIn.y + tOut.y) * w.x + (tIn.x + tOut.x) * w.y) > 0;
    }
    // Evantaiul e de partea convexă: în stânga la o cotitură spre dreapta, și invers.
    return cotitura * semn < 0;
  }
  const { n } = laFractiune(g, pc.t);
  return semn * scalar(n, w) > 0;
}

type Acoperire = {
  /** Câte puncte ideale sunt valide și primul dintre ele (punctul căii din care vine). */
  readonly valide: number;
  readonly primulValid: Punct | null;
  /** Primul punct ideal valid pe care traseul nu-l acoperă (punctul căii din care vine), sau null. */
  readonly lipsa: Punct | null;
  readonly neatins: readonly PortiuneNeatinsa[];
};

/**
 * Punctele ideale ale căii (ADR 0037 §5, „Acoperirea”): p + d·n(p) pe fiecare segment și evantaiele colțurilor convexe
 * dinspre sculă, la cel mult `PAS_ACOPERIRE`. Valid = nicio parte a căii nu e mai aproape de el decât |d| − `MARJA_VALID`.
 * Fiecare punct valid trebuie să stea la cel mult `TOLERANTA_DISTANTA` de traseu (`iesire`). Porțiunile cu punctele
 * ideale invalide dau `neatins`, cu marginile înjumătățite între eșantioane.
 */
function acoperire(segmente: readonly SegmentCale[], cale: ConturIndexat, d: number, iesire: ConturIndexat | null): Acoperire {
  const ad = Math.abs(d);
  const ideal = (p: Punct, n: Punct): Punct => ({ x: p.x + d * n.x, y: p.y + d * n.y });
  const valid = (q: Punct): boolean => distantaIndexata(q, cale, ad) >= ad - MARJA_VALID;
  const acoperit = (q: Punct): boolean => iesire !== null && distantaIndexata(q, iesire, TOLERANTA_DISTANTA * 2) <= TOLERANTA_DISTANTA;
  let valide = 0;
  let primulValid: Punct | null = null;
  let lipsa: Punct | null = null;
  const verifica = (p: Punct, q: Punct): boolean => {
    if (!valid(q)) return false;
    valide++;
    primulValid ??= p;
    if (!lipsa && !acoperit(q)) lipsa = p;
    return true;
  };
  const neatins: Array<{ de: number; pana: number }> = [];
  let deschisa: number | null = null;
  const validLa = (g: SegmentCale, t: number): boolean => {
    const { p, n } = laFractiune(g, t);
    return valid(ideal(p, n));
  };
  for (let i = 0; i < segmente.length; i++) {
    const g = segmente[i] as SegmentCale;
    const m = Math.max(1, Math.ceil(lungimeIdeala(g, d) / PAS_ACOPERIRE));
    let tPrec = 0;
    let validPrec: boolean | null = null;
    for (let k = 0; k <= m; k++) {
      const t = k / m;
      const { p, n } = laFractiune(g, t);
      const v = verifica(p, ideal(p, n));
      if (validPrec === null) {
        // Startul segmentului: o porțiune neatinsă continuă din segmentul dinainte sau începe aici.
        if (!v && deschisa === null) deschisa = g.s0;
        if (v && deschisa !== null) { neatins.push({ de: deschisa, pana: g.s0 }); deschisa = null; }
      } else if (v !== validPrec) {
        // Schimbarea cade între cele două eșantioane: înjumătățire pe validitate.
        let lo = tPrec, hi = t;
        for (let it = 0; it < INJUMATATIRI; it++) {
          const mij = (lo + hi) / 2;
          if (validLa(g, mij) === validPrec) lo = mij; else hi = mij;
        }
        const s = g.s0 + ((lo + hi) / 2) * g.lungime;
        if (v) { neatins.push({ de: deschisa ?? s, pana: s }); deschisa = null; } else deschisa = s;
      }
      tPrec = t;
      validPrec = v;
    }
    // Evantaiul colțului dinspre sculă, dacă e convex (doar acoperirea; vârful n-are lungime pe cale).
    const urm = segmente[i + 1];
    if (!urm) continue;
    const tIn = directieLaCapat(g.a, g.b, g.s, 1), tOut = directieLaCapat(urm.a, urm.b, urm.s, 0);
    const cotitura = Math.atan2(cruce(tIn, tOut), scalar(tIn, tOut));
    if (cotitura * d >= 0) continue;
    const pasi = Math.ceil((ad * Math.abs(cotitura)) / PAS_ACOPERIRE);
    const nIn = { x: -tIn.y, y: tIn.x };
    for (let k = 1; k < pasi; k++) {
      const u = (cotitura * k) / pasi;
      const n = { x: nIn.x * Math.cos(u) - nIn.y * Math.sin(u), y: nIn.x * Math.sin(u) + nIn.y * Math.cos(u) };
      verifica(g.b, ideal(g.b, n));
    }
  }
  const total = segmente.reduce((s, g) => s + g.lungime, 0);
  if (deschisa !== null) neatins.push({ de: deschisa, pana: total });
  return {
    valide,
    primulValid,
    lipsa,
    neatins: neatins.filter((n) => n.pana > n.de).map((n) => ({ ...n, lungime: n.pana - n.de, la: peCale(segmente, (n.de + n.pana) / 2) })),
  };
}

/**
 * Lungimea idealului unui segment: pe un arc, a cercului decalat (|r − d · semnul baleiajului| · |baleiaj|), care poate fi
 * mult mai lung decât arcul (R ≪ |d|, convex dinspre sculă). Pasul de 0,05 mm se ia pe ideal (recenzia B: pe un arc R0,05
 * cu d = 12,5, eșantioanele cădeau la 9 mm unul de altul și un gol de traseu trecea).
 */
function lungimeIdeala(g: SegmentCale, d: number): number {
  if (g.s.tip !== 'A') return g.lungime;
  const { raza, baleiaj } = cerculArcului(g.a, g.b, g.s.bulge);
  return Math.max(g.lungime, Math.abs(raza - d * Math.sign(baleiaj)) * Math.abs(baleiaj));
}

/** Câte eșantioane ideale cere verificarea: segmentele (pe ideal) și evantaiele colțurilor convexe dinspre sculă. */
function esantioaneIdeale(segmente: readonly SegmentCale[], d: number): number {
  let n = 0;
  for (let i = 0; i < segmente.length; i++) {
    const g = segmente[i] as SegmentCale;
    n += Math.ceil(lungimeIdeala(g, d) / PAS_ACOPERIRE) + 1;
    const urm = segmente[i + 1];
    if (!urm) continue;
    const tIn = directieLaCapat(g.a, g.b, g.s, 1), tOut = directieLaCapat(urm.a, urm.b, urm.s, 0);
    n += Math.ceil((Math.abs(d) * Math.abs(Math.atan2(cruce(tIn, tOut), scalar(tIn, tOut)))) / PAS_ACOPERIRE);
  }
  return n;
}

/** Tangenta unitară a segmentului la mijlocul lui, în sensul mersului. */
function tangentaLaMijloc(a: Punct, b: Punct, s: Segment): Punct {
  if (s.tip !== 'A') {
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  }
  const { start, baleiaj } = cerculArcului(a, b, s.bulge);
  const u = start + baleiaj / 2, semn = Math.sign(baleiaj);
  return { x: -Math.sin(u) * semn, y: Math.cos(u) * semn };
}

/** Tangenta căii în piciorul dat: pe segment, a lui; într-un vârf din interior, suma celor două (bisectoarea mersului). */
function tangentaCaii(pc: Picior, segmente: readonly SegmentCale[]): Punct {
  const g = segmente[pc.i] as SegmentCale;
  const laStart = pc.t * g.lungime <= LA_VARF, laFinal = (1 - pc.t) * g.lungime <= LA_VARF;
  if (laStart && pc.i > 0) {
    const p = segmente[pc.i - 1] as SegmentCale;
    const u = directieLaCapat(p.a, p.b, p.s, 1), v = directieLaCapat(g.a, g.b, g.s, 0);
    return { x: u.x + v.x, y: u.y + v.y };
  }
  if (laFinal && pc.i + 1 < segmente.length) {
    const nx = segmente[pc.i + 1] as SegmentCale;
    const u = directieLaCapat(g.a, g.b, g.s, 1), v = directieLaCapat(nx.a, nx.b, nx.s, 0);
    return { x: u.x + v.x, y: u.y + v.y };
  }
  const { n } = laFractiune(g, pc.t);
  return { x: n.y, y: -n.x };
}

/** Punctul căii la poziția s (mm pe curbă, de la vârful 0). */
function peCale(segmente: readonly SegmentCale[], s: number): Punct {
  for (const g of segmente) if (s <= g.s0 + g.lungime) return laFractiune(g, Math.max(0, (s - g.s0) / g.lungime)).p;
  const ultim = segmente.at(-1);
  return ultim ? ultim.b : { x: NaN, y: NaN };
}

function indexeazaToate(cs: readonly Contur[]): ConturIndexat {
  const segmente = cs.flatMap((c) => Array.from({ length: numarSegmente(c) }, (_, i) => segment(c, i)));
  return { segmente, index: indexCutii(segmente.map((s) => cutieSegment(s.a, s.b, s.s))) };
}

const langa = (p: Punct): string => `offsetul a eșuat lângă (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;

/** Intrarea offsetului deschis (ADR 0037 §5, „Intrarea”): curățată fără să-și schimbe forma, sau refuzată cu motiv. */
function curataIntrareDeschisa(c: Contur): Curatare {
  for (const v of c.varfuri) {
    if (v.s.tip === 'C') return { ok: false, motiv: 'calea are o cubică: intră în offset doar ca biarce (felia 2.7)' };
    if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y) || (v.s.tip === 'A' && !Number.isFinite(v.s.bulge))) {
      return { ok: false, motiv: 'calea are o coordonată care nu e un număr finit' };
    }
  }
  const n = c.varfuri.length;
  // Segmentul ultimului vârf nu există (ADR 0001): rămâne linie, oricum ar fi scris.
  const plate = c.varfuri.map((v, i) => (i === n - 1 || (v.s.tip === 'A' && Math.abs(v.s.bulge) < BULGE_MINIM) ? { p: v.p, s: LINIE } : v));
  // Segmentele sub toleranța de poziție a lui cavalier (1e-5 mm) se unesc, cu capetele nemutate: cavalier le șterge oricum
  // înainte de decalare, iar verificarea trebuie să judece aceeași cale (recenzia B: o codiță de 2e-6 mm la capăt, lăsată
  // de rotunjirea unui SVG, dădea refuzuri false).
  const varfuri = scoateVarfuriPeLatura(unesteVarfuri(imparteArceMari(plate, false), EPS_POZITIE_CAVALIER, false), false);
  const [v0, v1] = varfuri;
  if (!v0 || !v1 || (varfuri.length === 2 && lungime(v0.p, v1.p, v0.s) < EPS_POZITIE_CAVALIER)) {
    return { ok: false, motiv: 'calea are mai puțin de două vârfuri distincte' };
  }
  const curat: Contur = { inchis: false, varfuri };
  if (segmenteCale(curat).reduce((s, g) => s + g.lungime, 0) < REZOLUTIE) {
    return { ok: false, motiv: `calea e mai scurtă decât rezoluția declarată (${REZOLUTIE} mm)` };
  }
  let atinsa: boolean;
  try {
    atinsa = seAtingeSingur(curat);
  } catch (e) {
    return { ok: false, motiv: `calea nu se poate citi: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (atinsa) return { ok: false, motiv: 'calea se atinge singură: după încrucișare partea nu mai e definită: alege pe linie' };
  return { ok: true, contur: curat };
}

/** Ce e greșit în bucățile offsetului deschis, ca formă, distanță, parte și atingeri (ADR 0037 §5), sau null. */
function verificaBucati(segmente: readonly SegmentCale[], cale: ConturIndexat, d: number, bucati: readonly Contur[]): string | null {
  for (const c of bucati) {
    if (c.inchis) return 'offsetul a dat un contur închis';
    if (c.varfuri.length < 2) return 'offsetul a dat o bucată cu mai puțin de două vârfuri';
    for (const v of c.varfuri) {
      if (v.s.tip === 'C') return 'offsetul a dat o cubică';
      if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y) || (v.s.tip === 'A' && !Number.isFinite(v.s.bulge))) {
        return 'offsetul a dat o coordonată nefinită';
      }
    }
  }
  const ad = Math.abs(d);
  for (const c of bucati) {
    const puncteTraseu = [...c.varfuri.map((v) => v.p)];
    for (let i = 0; i < numarSegmente(c); i++) {
      const g = segment(c, i);
      puncteTraseu.push(mijloc(g.a, g.b, g.s));
    }
    for (const p of puncteTraseu) {
      if (Math.abs(distantaIndexata(p, cale, ad + TOLERANTA_DISTANTA) - ad) > TOLERANTA_DISTANTA) {
        let dist = Infinity;
        for (const g of segmente) dist = Math.min(dist, distantaLaSegment(p, g.a, g.b, g.s));
        return `offsetul a dat un punct la ${dist.toFixed(4)} mm de cale, nu la ${ad} mm`;
      }
      if (!peParteaCeruta(p, segmente, cale.index, d)) return `offsetul a dat un punct pe partea greșită a căii (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;
    }
    // Sensul (recenzia B): fiecare segment merge în sensul desenului față de cel puțin unul din picioarele mijlocului lui
    // (la egalitate, ca dus-întorsul canelurii cât freza). Profilul întoarce bucățile după tabelul sensului (§6) presupunând
    // asta; o bucată întoarsă s-ar tăia tăcut în sensul opus.
    for (let i = 0; i < numarSegmente(c); i++) {
      const g = segment(c, i);
      const mp = mijloc(g.a, g.b, g.s), tau = tangentaLaMijloc(g.a, g.b, g.s);
      const picioare = picioarePeCale(mp, segmente, cale.index, ad + TOLERANTA_DISTANTA);
      if (!picioare.some((pc) => scalar(tau, tangentaCaii(pc, segmente)) > 0)) {
        return `offsetul a dat o bucată în sens invers față de desen (lângă ${mp.x.toFixed(3)}, ${mp.y.toFixed(3)})`;
      }
    }
  }
  for (let i = 0; i < bucati.length; i++) {
    const a = bucati[i] as Contur;
    if (seAtingeSingur(a, true)) return 'offsetul a dat o bucată care se atinge singură';
    for (let j = i + 1; j < bucati.length; j++) if (seAtingIntreEle(a, bucati[j] as Contur)) return 'offsetul a dat două bucăți care se ating';
  }
  return null;
}

/**
 * Ce e greșit în ieșirea `bucati` a offsetului `d` al căii deschise `intrare` (curățată), sau null împreună cu porțiunile
 * neatinse (ADR 0037 §5, „Ieșirea se verifică singură” și „Refuzurile ieșirii”). Ieșirea goală e „nu încape” doar fără
 * niciun punct ideal valid; altfel e defectul offsetului.
 */
export function verificaIesireDeschisa(
  intrare: Contur, d: number, bucati: readonly Contur[],
): { readonly problema: string } | { readonly problema: null; readonly neatins: readonly PortiuneNeatinsa[] } {
  const segmente = segmenteCale(intrare);
  const cale = indexeaza(intrare);
  const ac = acoperire(segmente, cale, d, bucati.length > 0 ? indexeazaToate(bucati) : null);
  if (bucati.length === 0) return { problema: ac.primulValid ? langa(ac.primulValid) : NU_INCAPE };
  const problema = verificaBucati(segmente, cale, d, bucati);
  if (problema) return { problema };
  if (ac.lipsa) return { problema: langa(ac.lipsa) };
  return { problema: null, neatins: ac.neatins };
}

function incearcaDeschis(intrare: Contur, d: number): RezultatOffsetDeschis {
  let rezultat: Polyline[];
  try {
    // cavalier, pe o polilinie deschisă: distanța pozitivă e în stânga mersului (măsurat, ADR 0037 „Ce am măsurat” 3).
    rezultat = laCavalier(intrare).parallelOffset(d);
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
  const bucati = rezultat.map((pl) => curataIesire(scoateBucleMici(dinCavalier(pl))));
  const v = verificaIesireDeschisa(intrare, d, bucati);
  if (v.problema !== null) return { ok: false, motiv: v.problema };
  const segmente = segmenteCale(intrare);
  const cale = indexeaza(intrare);
  // Ordinea de-a lungul căii: după poziția piciorului startului fiecărei bucăți.
  const pozitie = (c: Contur): number => {
    const p0 = (c.varfuri[0] as Varf).p;
    const pc = picioarePeCale(p0, segmente, cale.index, Math.abs(d) + TOLERANTA_DISTANTA)[0];
    return pc ? (segmente[pc.i] as SegmentCale).s0 + pc.t * (segmente[pc.i] as SegmentCale).lungime : 0;
  };
  const ordonate = bucati.map((c) => ({ c, s: pozitie(c) })).sort((a, b) => a.s - b.s).map((x) => x.c);
  return { ok: true, bucati: ordonate, neatins: v.neatins };
}

/**
 * Offsetul unei căi deschise (ADR 0037 §5): `distanta` > 0 în stânga mersului, < 0 în dreapta, în coordonatele primite.
 * Intrarea se curăță (fără nicio legătură peste capăt) sau se refuză; ieșirea se verifică singură (forma, distanța,
 * partea, atingerile, acoperirea). La o verificare picată, încă o încercare cu |d| + 1e-4 mm, apoi refuzul. „Scula nu
 * încape” doar când niciun punct ideal nu e valid. Niciodată o excepție: orice eșec iese ca motiv.
 */
export function offsetDeschis(contur: Contur, distanta: number): RezultatOffsetDeschis {
  if (contur.inchis) return { ok: false, motiv: 'offsetul deschis cere o cale deschisă' };
  if (!Number.isFinite(distanta)) return { ok: false, motiv: `distanța offsetului nu e un număr finit (${distanta})` };
  if (Math.abs(distanta) < DISTANTA_MINIMA) {
    return { ok: false, motiv: `distanța ${distanta} mm e sub rezoluția declarată (${REZOLUTIE} mm)` };
  }
  try {
    const intrare = curataIntrareDeschisa(contur);
    if (!intrare.ok) return intrare;
    const segmente = segmenteCale(intrare.contur);
    if (esantioaneIdeale(segmente, Math.abs(distanta) + PAS_REINCERCARE) > PLAFON_ESANTIOANE) {
      const metri = segmente.reduce((s, g) => s + g.lungime, 0) / 1000;
      return { ok: false, motiv: `calea e prea lungă pentru verificarea offsetului pe firul principal (${metri.toFixed(1)} m de cale; cel mult ~${(PLAFON_ESANTIOANE * PAS_ACOPERIRE / 1e6).toFixed(0)} m de traseu verificat): calculul în worker vine mai târziu` };
    }
    const prima = incearcaDeschis(intrare.contur, distanta);
    if (prima.ok || prima.motiv === NU_INCAPE) return prima;
    const aDoua = incearcaDeschis(intrare.contur, distanta + Math.sign(distanta) * PAS_REINCERCARE);
    return aDoua.ok ? aDoua : { ok: false, motiv: `${prima.motiv} (și la a doua încercare)` };
  } catch (e) {
    return { ok: false, motiv: `offsetul a eșuat: ${e instanceof Error ? e.message : String(e)}` };
  }
}
