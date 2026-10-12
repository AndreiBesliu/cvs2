import { inverseaza, type Punct, type Segment, type Varf } from './contur.ts';
import type { Cutie } from './cutie.ts';
import { TOLERANTA_IMPORT } from './toleranta.ts';

/**
 * Normalizarea `nonzero` → `evenodd` (felia 2.7d). ADR 0003 ține o singură regulă de umplere în aplicație, evenodd; ușa
 * SVG (și textul, la etapa 7) primește forme cu regula nonzero. Funcția de aici primește subcăile închise ale UNEI forme
 * și întoarce contururi a căror regiune evenodd e regiunea nonzero a intrării, sau un refuz cu motiv. Nu aruncă niciodată.
 *
 * E portul prototipului 2.7d-C/2 (aranjamentul exact în double, fără PathKit), cu schimbările cerute de judecata 2.7d:
 * 1. toleranța τ e relativă la ÎNTINDEREA grupului, nu la |coordonată|: τ = 1e-10 × diagonala cutiei + 64 × ulp(max
 *    |coordonată|). Aceeași formă dă același rezultat la 0, la 2 440 și la 1e6 mm (varianta „Crel” a judecății);
 * 2. subcăile cu cutiile disjuncte (tranzitiv) nu se ating sub nonzero: fiecare grup se normalizează singur, cu τ-ul lui,
 *    deci un desen mare nu lărgește toleranța unuia mic;
 * 3. autoverificarea din prototipul B: la fiecare clasificare prin raze, înfășurarea din dreapta, măsurată separat, e
 *    cea din stânga minus contribuția muchiilor comune;
 * 4. nicio gardă nu se oprește singură: garda sferturilor caută muchiile cu risc prin grila razelor, fără plafon tăcut
 *    (o rază pe eșantion; clasificarea completă doar când raza nu confirmă), iar tot lucrul intră într-un buget
 *    determinist care, depășit, dă refuz cu motiv;
 * 5. intersecțiile cerc × cerc se rafinează cu Newton până la convergență (păstrat doar dacă reziduul scade);
 * 6. calea rapidă: când nonzero e deja evenodd, se întoarce chiar tabloul de intrare (același obiect);
 * 7. bugetele: perechile de primitive cu cutiile suprapuse, pașii de subdivizare pe o pereche și lucrul total, plus un
 *    buget comun pe tot importul (`optiuni.buget`), scăzut de fiecare apel, și de cele refuzate;
 * 8. nu aruncă: orice excepție internă devine `{ ok: false, motiv }`;
 * 9. calea rapidă exactă, înaintea aranjamentului: un grup de curbe simple, două câte două disjuncte, cu înfășurarea
 *    fiecărei fețe 0 sau impară, nu are nimic de schimbat (recenzia 2.7d, constatarea 7: textul obișnuit era de 25 de
 *    ori mai lent). Dovada e ieftină și fără toleranță; la orice îndoială, grupul merge la aranjament.
 *
 * Pașii, pe fiecare grup:
 * - toate intersecțiile perechilor de primitive (forme închise plus Newton pentru L/L, L/A, A/A; rădăcinile unei cubice
 *   Bernstein pentru L/C; subdivizare pe bucăți monotone, Newton și profilul distanței cu semn pentru A/C, C/C și bucla
 *   unei cubice), suprapunerile (aceeași dreaptă, același cerc, aceeași cubică) și tangențele (o lentilă mai subțire
 *   decât τ devine un singur vârf);
 * - fiecare primitivă se taie la parametrii ei; muchiile identice geometric formează un grup cu multiplicitate cu semn;
 * - înfășurarea nonzero la stânga unei muchii se citește din raze cu semn (două direcții trebuie să fie de acord), cea
 *   din dreapta se verifică separat, apoi înfășurarea se propagă de-a lungul conturului prin încrucișările simple, cu
 *   închiderea conturului și o rază de control ca verificări;
 * - rămân muchiile cu plin(stânga) ≠ plin(dreapta), orientate cu plinul în stânga (exteriorul trigonometric, golurile
 *   orar), legate în contururi (la un vârf cu mai multe ieșiri, prima ieșire în sens orar, cu tangentele egale despărțite
 *   de curbură), tăiate la vârfurile prin care trec de două ori (contururile care se ating într-un vârf ies separate și
 *   nu se taie), iar bucățile vecine din aceeași primitivă se lipesc la loc.
 *
 * Geometria ieșirii e exactă prin construcție: liniile stau pe liniile-sursă; arcele, pe cercurile-sursă, cu bulge =
 * tan(baleiaj / 4) din unghiurile sursei (un arc întreg întors are −bulge exact); cubicele sunt subcurbele blossom ale
 * punctelor de control-sursă (o cubică întreagă întoarsă are c1 și c2 schimbate exact). Vârfurile sunt vârfuri-sursă,
 * bit cu bit, sau intersecții rafinate în double; nodurile mai apropiate de τ se contopesc (`info.noduriContopite`).
 *
 * Garanția de regiune: ieșirea sub evenodd e intrarea sub nonzero în orice punct mai departe de τ de frontiera intrării.
 * Ce e mai subțire decât τ (fante, lentile, atingeri) se poate închide, deschide sau lipi; ce e mai gros se reproduce
 * exact sau se refuză. τ ≤ `TOLERANTA_IMPORT`, altfel refuz (un grup cu diagonala peste ~1e4 mm), afară de grupurile
 * dovedite simple pe calea rapidă exactă (acolo nu se folosește nicio toleranță).
 */

/** Ce raportează o normalizare reușită: pentru raportul importului și pentru jurnalul de cost. */
export type InfoNormalizare = {
  /** Nonzero era deja evenodd: `cai` e chiar tabloul de intrare, neschimbat (nici reorientat). */
  readonly neschimbat: boolean;
  /** Câte grupuri de subcăi cu cutiile disjuncte s-au normalizat separat. */
  readonly grupuri: number;
  readonly intersectii: number;
  /** Atingeri: lentile mai subțiri decât τ și tangențe, fiecare devenită un singur vârf. */
  readonly tangente: number;
  /** Perechi de primitive pe același purtător (aceeași dreaptă, același cerc, aceeași cubică). */
  readonly suprapuneri: number;
  /** Noduri contopite (mai apropiate de τ, sau același parametru pe o primitivă). */
  readonly noduriContopite: number;
  /** Muchii (bucăți de primitive) care nu ajung în ieșire: interioare, exterioare, dublurile comune, cele nule. */
  readonly muchiiScoase: number;
  readonly contururiIntrare: number;
  readonly contururiIesire: number;
  /** Cea mai mare toleranță τ folosită, în mm: a grupurilor care au trecut prin aranjament (0 dacă niciunul). */
  readonly tau: number;
  /** Unitățile de lucru cheltuite, din `PLAFON_LUCRU`. */
  readonly lucru: number;
};

/** Toleranța relativă la întinderea grupului (judecata 2.7d: 0 erori tăcute de regiune pe 16,4 M puncte). */
export const TAU_RELATIV = 1e-10;

/** Podeaua aritmetică a lui τ, în ulp-uri ale celei mai mari coordonate a grupului. */
export const TAU_ULP = 64;

/** Pașii de subdivizare pe o pereche de primitive: peste atât, curbele sunt aproape suprapuse fără să fie identice. */
export const PLAFON_PERECHE = 100_000;

/**
 * Perechile de primitive cu cutiile suprapuse, pe toată forma: peste atât, refuz devreme (forma e prea densă pentru firul
 * principal). Măsurat: supa de glife a judecății (542 de contururi, 10 212 vârfuri) are 17 305; un zigzag de 700 de
 * vârfuri cu toate cutiile suprapuse, 244 650 (4,7 s fără plafon); un poligon aleator de 1 000 de vârfuri, 221 119.
 */
export const PLAFON_PERECHI = 200_000;

/**
 * Bugetul total de lucru al unei normalizări, în unități deterministe (nu în timp: aceeași formă se importă la fel pe
 * orice mașină): un test de cutii, un pas de subdivizare, o evaluare a profilului, o celulă străbătută de o rază (plus un
 * sfert pe fiecare muchie și vârf din ea), patru pe o traversare de rază, comparațiile contopirii nodurilor și ale căii
 * rapide. Ușa rulează pe firul principal. Măsurat (Node 26, serial; 0,085–0,3 µs pe unitate): supa de glife 4,18 M
 * (1,0 s), textul pe 3 rânduri suprapuse 0,45 M (0,11 s), 400 de cercuri suprapuse 1,34 M (0,17 s), un poligon aleator
 * de 300 de vârfuri 7,4 M (0,7 s), unul de 600 de vârfuri 14,8 M (1,25 s, refuzat), un zigzag de 400 de vârfuri cu toate
 * cutiile suprapuse 9,8 M (2,9 s). Plafonul lasă de 2,9 ori supa și oprește cu motiv, după cel mult câteva secunde, ce
 * trece de el. Pe un import întreg, ușa dă și un buget comun (`optiuni.buget`).
 */
export const PLAFON_LUCRU = 12_000_000;

/** Unghiurile razelor față de normala muchiei, în ordinea încercării (două trebuie să dea aceeași înfășurare). */
const UNGHIURI_RAZE = [0.35, -0.35, 0.7, -0.7, 0.1, -0.1, 1.0, -1.0, 1.3, -1.3] as const;

const DOI_PI = 2 * Math.PI;
const RANG = { L: 0, A: 1, C: 2 } as const;

/** Un refuz cu motiv: prins în `normalizeaza` și întors ca `{ ok: false, motiv }`. */
class Refuz extends Error {}

const el = <T>(a: readonly T[], i: number): T => a[i] as T;
const lerp = (a: Punct, b: Punct, t: number): Punct => ({ x: (1 - t) * a.x + t * b.x, y: (1 - t) * a.y + t * b.y });
const dist = (a: Punct, b: Punct): number => Math.hypot(a.x - b.x, a.y - b.y);
const cr = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;
const finit = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const punctBun = (p: unknown): p is Punct =>
  p !== null && typeof p === 'object' && finit((p as { x?: unknown }).x) && finit((p as { y?: unknown }).y);
const loc = (p: Punct): string => `(${p.x}, ${p.y})`;

/** Distanța de la x la următorul double (pentru x = 0, cel mai mic double pozitiv). */
function ulp(x: number): number {
  const a = Math.abs(x);
  if (!(a > 0)) return Number.MIN_VALUE;
  return Math.max(Number.MIN_VALUE, 2 ** (Math.floor(Math.log2(a)) - 52));
}

// ---------------------------------------------------------------- primitivele (parametrul t în [0, 1])

type Arc = { readonly c: Punct; readonly r: number; readonly th0: number; readonly sw: number };
type GeomL = { readonly k: 'L'; readonly p0: Punct; readonly p1: Punct };
type GeomA = { readonly k: 'A'; readonly p0: Punct; readonly p1: Punct; readonly bulge: number } & Arc;
type GeomC = {
  readonly k: 'C'; readonly p0: Punct; readonly p1: Punct; readonly c1: Punct; readonly c2: Punct;
  readonly d0: Punct; readonly d1: Punct; readonly d2: Punct;
};
type Geom = GeomL | GeomA | GeomC;
type BazaPrim = {
  readonly id: number;
  /** Subcalea din intrare și vârful ei (pentru motivele refuzurilor). */
  readonly ci: number;
  readonly vi: number;
  /** Conturul din grup. */
  readonly cj: number;
  readonly n0: number;
  readonly n1: number;
  readonly cutie: Cutie;
};
type Prim = Geom & BazaPrim;

/** Cercul unui arc dat prin capete și bulge (aceeași formulă ca `cerculArcului` din `contur.ts`). */
function arcDinBulge(a: Punct, b: Punct, bulge: number): Arc {
  const dx = b.x - a.x, dy = b.y - a.y, k = (1 - bulge * bulge) / (4 * bulge);
  const c = { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
  return { c, r: (Math.hypot(dx, dy) * (1 + bulge * bulge)) / (4 * Math.abs(bulge)), th0: Math.atan2(a.y - c.y, a.x - c.x), sw: 4 * Math.atan(bulge) };
}

function blossom(P: GeomC, t1: number, t2: number, t3: number): Punct {
  const a = lerp(P.p0, P.c1, t1), b = lerp(P.c1, P.c2, t1), c = lerp(P.c2, P.p1, t1);
  return lerp(lerp(a, b, t2), lerp(b, c, t2), t3);
}

function punct(P: Geom, t: number): Punct {
  if (t === 0) return P.p0;
  if (t === 1) return P.p1;
  if (P.k === 'L') return lerp(P.p0, P.p1, t);
  if (P.k === 'A') { const u = P.th0 + t * P.sw; return { x: P.c.x + P.r * Math.cos(u), y: P.c.y + P.r * Math.sin(u) }; }
  return blossom(P, t, t, t);
}

function derivata(P: Geom, t: number): Punct {
  if (P.k === 'L') return { x: P.p1.x - P.p0.x, y: P.p1.y - P.p0.y };
  if (P.k === 'A') { const u = P.th0 + t * P.sw, k = P.r * P.sw; return { x: -k * Math.sin(u), y: k * Math.cos(u) }; }
  const m = 1 - t, a = 3 * m * m, b = 6 * m * t, c = 3 * t * t;
  return { x: a * P.d0.x + b * P.d1.x + c * P.d2.x, y: a * P.d0.y + b * P.d1.y + c * P.d2.y };
}

function derivata2(P: Geom, t: number): Punct {
  if (P.k === 'L') return { x: 0, y: 0 };
  if (P.k === 'A') { const u = P.th0 + t * P.sw, k = P.r * P.sw * P.sw; return { x: -k * Math.cos(u), y: -k * Math.sin(u) }; }
  return { x: 6 * ((1 - t) * (P.d1.x - P.d0.x) + t * (P.d2.x - P.d1.x)), y: 6 * ((1 - t) * (P.d1.y - P.d0.y) + t * (P.d2.y - P.d1.y)) };
}

/** Parametrul unui punct pe arc, față de mijlocul arcului (în afara arcului: < 0 sau > 1). */
function paramArc(P: GeomA, X: Punct): number {
  const al = Math.atan2(X.y - P.c.y, X.x - P.c.x), m = P.th0 + P.sw / 2;
  let d = al - m;
  d -= DOI_PI * Math.round(d / DOI_PI);
  return 0.5 + d / P.sw;
}

function paramLinie(P: GeomL, X: Punct): number {
  const dx = P.p1.x - P.p0.x, dy = P.p1.y - P.p0.y;
  return ((X.x - P.p0.x) * dx + (X.y - P.p0.y) * dy) / (dx * dx + dy * dy);
}

/** Parametrii t din (lo, hi) la care unghiul arcului e faza + k·pas, sortați. */
function unghiuriPeArc(P: GeomA, faza: number, pas: number, lo = 0, hi = 1): number[] {
  const a = P.th0 + lo * P.sw, b = P.th0 + hi * P.sw, mn = Math.min(a, b), mx = Math.max(a, b), out: number[] = [];
  for (let k = Math.ceil((mn - faza) / pas); faza + k * pas < mx; k++) {
    const t = (faza + k * pas - P.th0) / P.sw;
    if (t > lo && t < hi) out.push(t);
  }
  return out.sort((u, v) => u - v);
}

/** Rădăcinile din (0, 1) ale pătraticei Bernstein q0, q1, q2, sortate. */
function radaciniPatratica(q0: number, q1: number, q2: number): number[] {
  const a = q0 - 2 * q1 + q2, b = 2 * (q1 - q0), c = q0, out: number[] = [];
  const s = Math.abs(q0) + Math.abs(q1) + Math.abs(q2);
  if (s === 0) return out;
  if (Math.abs(a) <= 1e-13 * s) {
    if (b !== 0) out.push(-c / b);
  } else {
    const D = b * b - 4 * a * c;
    if (D < 0) return out;
    // Forma fără anulare: q are semnul lui −b.
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(D));
    out.push(q / a);
    if (q !== 0) out.push(c / q);
  }
  return out.filter((t) => t > 0 && t < 1).sort((u, v) => u - v);
}

/** Parametrii la care primitiva își schimbă monotonia pe x sau pe y. */
function separatoriMonotonie(P: Geom): number[] {
  if (P.k === 'L') return [];
  if (P.k === 'A') return unghiuriPeArc(P, 0, Math.PI / 2);
  const r = [...radaciniPatratica(P.d0.x, P.d1.x, P.d2.x), ...radaciniPatratica(P.d0.y, P.d1.y, P.d2.y)].sort((u, v) => u - v);
  return r.filter((t, i) => t > 1e-12 && t < 1 - 1e-12 && (i === 0 || t - el(r, i - 1) > 1e-12));
}

/** Punctele de control ale bucății [a, b] a cubicei (blossom). */
function subcurba(P: GeomC, a: number, b: number): readonly [Punct, Punct, Punct, Punct] {
  return [punct(P, a), blossom(P, a, a, b), blossom(P, a, b, b), punct(P, b)];
}

function cutiePuncte(pts: readonly Punct[], m: number): Cutie {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { minX: minX - m, minY: minY - m, maxX: maxX + m, maxY: maxY + m };
}

/** Cutia bucății [a, b], lărgită cu m: capetele, plus extremele pe axe (arcul) sau punctele de control (cubica). */
function cutieBucata(P: Geom, a: number, b: number, m: number): Cutie {
  if (P.k === 'L') return cutiePuncte([punct(P, a), punct(P, b)], m);
  if (P.k === 'A') return cutiePuncte([punct(P, a), punct(P, b), ...unghiuriPeArc(P, 0, Math.PI / 2, a, b).map((t) => punct(P, t))], m);
  return cutiePuncte(subcurba(P, a, b), m);
}

/** Cât se depărtează bucata [a, b] de coarda ei. */
function platitudine(P: Geom, a: number, b: number): number {
  if (P.k === 'L') return 0;
  if (P.k === 'A') return P.r * (1 - Math.cos(Math.abs(P.sw * (b - a)) / 2));
  const [q0, q1, q2, q3] = subcurba(P, a, b), dx = q3.x - q0.x, dy = q3.y - q0.y, l = Math.hypot(dx, dy);
  if (l === 0) return Math.max(dist(q1, q0), dist(q2, q0));
  return Math.max(Math.abs(cr(dx, dy, q1.x - q0.x, q1.y - q0.y)), Math.abs(cr(dx, dy, q2.x - q0.x, q2.y - q0.y))) / l;
}

/** Lungimea aproximativă a bucății [a, b] (8 coarde): doar pentru pragul muchiilor nule. */
function lungimeBucata(P: Geom, a: number, b: number): number {
  let l = 0, q = punct(P, a);
  for (let i = 1; i <= 8; i++) { const r = punct(P, a + ((b - a) * i) / 8); l += dist(q, r); q = r; }
  return l;
}

// ---------------------------------------------------------------- intrarea publică

/**
 * Subcăile închise ale unei forme (vârfurile ADR 0034; segmentul vârfului i merge spre vârful i + 1, ultimul se
 * închide în primul), citite cu `regula` (implicit nonzero), devin contururi cu aceeași regiune sub evenodd.
 *
 * Ieșirea normalizată (`info.neschimbat` fals): plinul în stânga (exteriorul trigonometric, golurile orar), cel puțin
 * două vârfuri pe contur, niciun segment de lungime zero, nicio muchie comună; o buclă dintr-o singură cubică se taie la
 * mijlocul parametrului. Toate grupurile ies așa, și cele care n-aveau nimic de schimbat. Pe calea rapidă
 * (`info.neschimbat`: niciun grup n-are ce schimba), `cai` e chiar tabloul de intrare, cu orientarea lui.
 *
 * Motivul unui refuz începe cu un cod, apoi locul: `intrare` (date invalide), `toleranta` (τ peste `TOLERANTA_IMPORT`),
 * `plafon` (bugetele), `nedecis` (razele nu se pun de acord: curbe aproape suprapuse sau tangente care nu sunt identice),
 * `autoverificare`, `inchidere`, `control`, `sfert` (verificările proprii), `topologie` (grade inegale, contur deschis),
 * `interna` (o excepție neprevăzută).
 *
 * `optiuni.buget`: bugetul de lucru al întregului import (ușa face unul pe fișier), în aceleași unități ca
 * `PLAFON_LUCRU`. Fiecare apel îl scade cu lucrul lui, și cele refuzate; când se termină, apelul refuză cu `plafon`.
 * Plafonul pe apel rămâne.
 */
export function normalizeaza(
  cai: ReadonlyArray<readonly Varf[]>,
  optiuni?: { readonly regula?: 'nonzero' | 'evenodd'; readonly buget?: BugetImport },
): { readonly ok: true; readonly cai: readonly Varf[][]; readonly info: InfoNormalizare } | { readonly ok: false; readonly motiv: string } {
  try {
    return normalizeazaTot(cai, optiuni);
  } catch (e) {
    if (e instanceof Refuz) return { ok: false, motiv: e.message };
    return { ok: false, motiv: `interna: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Bugetul de lucru comun al unui import: `ramas` scade cu fiecare unitate cheltuită de oricare apel. */
export type BugetImport = { ramas: number };

type Buget = { lucru: number; perechi: number; readonly extern: BugetImport | null };

const MOTIV_BUGET_IMPORT = 'plafon: bugetul de lucru al importului s-a terminat';

function cheltuie(buget: Buget, n: number): void {
  buget.lucru += n;
  if (buget.lucru > PLAFON_LUCRU) throw new Refuz(`plafon: forma cere peste ${PLAFON_LUCRU} de unități de lucru (prea densă pentru firul principal)`);
  const e = buget.extern;
  if (e) {
    e.ramas -= n;
    if (!(e.ramas >= 0)) throw new Refuz(MOTIV_BUGET_IMPORT);
  }
}

/**
 * Grupurile de subcăi: componentele conexe ale grafului „cutiile se ating” (cu marja). Întâi împărțirea pe proiecții:
 * mulțimea se taie unde proiecțiile pe x nu se mai suprapun, fiecare parte apoi pe y, și tot așa până nu se mai taie
 * nimic. E O(n log n) pe trecere, fără perechi (fâșiile stivuite, rândurile de text), și sigură: două părți separate pe o
 * axă nu se ating. În fiecare parte rămasă, măturarea exactă pe x cu uniune-găsire. Totul intră în buget.
 */
function grupeaza(cutii: readonly Cutie[], marja: number, buget: Buget): number[][] {
  const imparte = (k: readonly number[], peX: boolean): number[][] => {
    const lo = (i: number): number => (peX ? el(cutii, i).minX : el(cutii, i).minY);
    const hi = (i: number): number => (peX ? el(cutii, i).maxX : el(cutii, i).maxY);
    const ord = [...k].sort((a, b) => lo(a) - lo(b));
    cheltuie(buget, ord.length);
    const parti: number[][] = [];
    let cur: number[] = [], max = -Infinity;
    for (const i of ord) {
      if (cur.length && lo(i) > max + marja) { parti.push(cur); cur = []; max = -Infinity; }
      cur.push(i);
      max = Math.max(max, hi(i));
    }
    if (cur.length) parti.push(cur);
    return parti;
  };
  const finale: number[][] = [];
  const stiva: Array<{ readonly k: readonly number[]; readonly peX: boolean; readonly blocat: boolean }> = [{ k: cutii.map((_, i) => i), peX: true, blocat: false }];
  for (let q = stiva.pop(); q; q = stiva.pop()) {
    const parti = imparte(q.k, q.peX);
    if (parti.length > 1) for (const p of parti) stiva.push({ k: p, peX: !q.peX, blocat: false });
    else if (q.blocat) finale.push([...q.k]);
    else stiva.push({ k: q.k, peX: !q.peX, blocat: true });
  }
  const tata = cutii.map((_, k) => k);
  const rad = (k: number): number => {
    let i = k;
    for (;;) {
      const p = el(tata, i);
      if (p === i) return i;
      const g = el(tata, p);
      tata[i] = g;
      i = g;
    }
  };
  for (const parte of finale) {
    const ord = parte.sort((a, b) => el(cutii, a).minX - el(cutii, b).minX);
    let activ: number[] = [];
    for (const k of ord) {
      const c = el(cutii, k);
      cheltuie(buget, 1 + (activ.length >> 2));
      activ = activ.filter((a) => el(cutii, a).maxX + marja >= c.minX);
      for (const a of activ) {
        const b = el(cutii, a);
        if (b.minY - marja <= c.maxY && c.minY - marja <= b.maxY) { const ra = rad(a), rc = rad(k); if (ra !== rc) tata[Math.max(ra, rc)] = Math.min(ra, rc); }
      }
      activ.push(k);
    }
  }
  const grupuri = new Map<number, number[]>();
  for (let k = 0; k < cutii.length; k++) {
    const r = rad(k), g = grupuri.get(r);
    if (g) g.push(k); else grupuri.set(r, [k]);
  }
  // Ordinea ieșirii: ordinea primei subcăi a fiecărui grup.
  return [...grupuri.values()].sort((a, b) => el(a, 0) - el(b, 0));
}

type StatGrup = {
  intersectii: number; tangente: number; suprapuneri: number; lipiri: number; muchii: number; muchiiNule: number;
  pastrate: number; raze: number; sferturi: number;
};

type RezultatGrup = { readonly neschimbat: boolean; readonly st: StatGrup; readonly emite: () => Varf[][] };

function normalizeazaTot(
  cai: ReadonlyArray<readonly Varf[]>,
  optiuni: { readonly regula?: 'nonzero' | 'evenodd'; readonly buget?: BugetImport } | undefined,
): { readonly ok: true; readonly cai: readonly Varf[][]; readonly info: InfoNormalizare } {
  const ext: unknown = optiuni?.buget;
  if (ext !== undefined && (ext === null || typeof ext !== 'object' || typeof (ext as { ramas?: unknown }).ramas !== 'number' || Number.isNaN((ext as { ramas: number }).ramas))) {
    throw new Refuz('intrare: bugetul importului nu e de forma { ramas: număr }');
  }
  const extern = ext === undefined ? null : (ext as BugetImport);
  if (extern && !(extern.ramas > 0)) throw new Refuz(MOTIV_BUGET_IMPORT);
  if (!Array.isArray(cai)) throw new Refuz('intrare: nu e o listă de subcăi');
  const regula: unknown = optiuni?.regula;
  if (regula !== undefined && regula !== 'nonzero' && regula !== 'evenodd') throw new Refuz('intrare: regula de umplere necunoscută');
  const plin = regula === 'evenodd' ? (w: number): boolean => (w & 1) !== 0 : (w: number): boolean => w !== 0;

  // 1. Validarea și cutia exactă a fiecărei subcăi (arcele cu extremele pe axe, cubicele cu punctele de control).
  const cutii: Cutie[] = [];
  let maxAbs = 0;
  cai.forEach((cale: unknown, ci) => {
    // O cale are cel puțin 2 vârfuri (ADR 0034 §2; oracolul 2.7d, K1: un singur vârf trecea „neschimbat”).
    if (!Array.isArray(cale) || cale.length < 2) throw new Refuz(`intrare: subcalea ${ci} are sub 2 vârfuri`);
    const n = cale.length;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const cu = (p: Punct): void => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); };
    for (let vi = 0; vi < n; vi++) {
      const v: unknown = cale[vi], u = `intrare: subcalea ${ci}, vârful ${vi}`;
      if (v === null || typeof v !== 'object') throw new Refuz(`${u}: vârf invalid`);
      const { p, s } = v as { p?: unknown; s?: unknown };
      if (!punctBun(p)) throw new Refuz(`${u}: punct invalid`);
      if (s === null || typeof s !== 'object') throw new Refuz(`${u}: segment invalid`);
      cu(p);
      const seg = s as { tip?: unknown; bulge?: unknown; c1?: unknown; c2?: unknown };
      if (seg.tip === 'A') {
        if (!finit(seg.bulge) || seg.bulge === 0) throw new Refuz(`${u}: arc cu bulge invalid`);
        const urm: unknown = cale[(vi + 1) % n];
        const q = urm !== null && typeof urm === 'object' ? (urm as { p?: unknown }).p : undefined;
        if (!punctBun(q)) throw new Refuz(`intrare: subcalea ${ci}, vârful ${(vi + 1) % n}: punct invalid`);
        if (q.x === p.x && q.y === p.y) throw new Refuz(`${u}: arc cu capetele egale`);
        const k = arcDinBulge(p, q, seg.bulge);
        if (!finit(k.c.x) || !finit(k.c.y) || !finit(k.r) || !(k.r > 0)) throw new Refuz(`${u}: arc cu cercul nedefinit`);
        for (const t of unghiuriPeArc({ k: 'A', p0: p, p1: q, bulge: seg.bulge, ...k }, 0, Math.PI / 2)) {
          const w = k.th0 + t * k.sw;
          cu({ x: k.c.x + k.r * Math.cos(w), y: k.c.y + k.r * Math.sin(w) });
        }
      } else if (seg.tip === 'C') {
        if (!punctBun(seg.c1) || !punctBun(seg.c2)) throw new Refuz(`${u}: punct de control invalid`);
        cu(seg.c1);
        cu(seg.c2);
      } else if (seg.tip !== 'L') {
        throw new Refuz(`${u}: tip de segment necunoscut`);
      }
    }
    cutii.push({ minX, minY, maxX, maxY });
    maxAbs = Math.max(maxAbs, Math.abs(minX), Math.abs(minY), Math.abs(maxX), Math.abs(maxY));
  });

  // 2. Grupurile: înfășurarea e o sumă pe subcăi, nulă în afara cutiei fiecăreia, deci grupurile cu cutiile disjuncte nu
  // se influențează. Marja acoperă rotunjirea cutiilor.
  const buget: Buget = { lucru: 0, perechi: 0, extern };
  cheltuie(buget, 1 + (cutii.length >> 2));
  const ordine = grupeaza(cutii, TAU_ULP * ulp(maxAbs), buget);

  // 3. Fiecare grup, cu τ-ul lui; ordinea ieșirii e ordinea primei subcăi a fiecărui grup.
  const rezultate: RezultatGrup[] = [];
  let tauMax = 0;
  for (const indici of ordine) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of indici) {
      const c = el(cutii, k);
      minX = Math.min(minX, c.minX); minY = Math.min(minY, c.minY); maxX = Math.max(maxX, c.maxX); maxY = Math.max(maxY, c.maxY);
    }
    const diag = Math.hypot(maxX - minX, maxY - minY);
    const tau = TAU_RELATIV * diag + TAU_ULP * ulp(Math.max(Math.abs(minX), Math.abs(minY), Math.abs(maxX), Math.abs(maxY)));
    const caiGrup = indici.map((k) => el(cai, k));
    const simplu = grupSimplu(caiGrup, tau, plin, buget);
    if (simplu) { rezultate.push(simplu); continue; }
    if (!(tau <= TOLERANTA_IMPORT)) {
      const care = indici.length > 4 ? `${indici.slice(0, 4).join(', ')} și alte ${indici.length - 4}` : indici.join(', ');
      throw new Refuz(`toleranta: grupul subcăilor ${care} are diagonala ${diag} mm, deci τ = ${tau} mm trece de toleranța importului (${TOLERANTA_IMPORT} mm)`);
    }
    tauMax = Math.max(tauMax, tau);
    rezultate.push(normalizeazaGrup(caiGrup, indici, tau, plin, buget));
  }

  const suma = (f: (s: StatGrup) => number): number => rezultate.reduce((a, r) => a + f(r.st), 0);
  const comun = {
    grupuri: rezultate.length,
    intersectii: suma((s) => s.intersectii),
    tangente: suma((s) => s.tangente),
    suprapuneri: suma((s) => s.suprapuneri),
    noduriContopite: suma((s) => s.lipiri),
    contururiIntrare: cai.length,
    tau: tauMax,
  };
  if (rezultate.every((r) => r.neschimbat)) {
    // Calea rapidă: chiar obiectul de intrare (documentul și G-code-ul rămân octet cu octet ce erau). Tipul de ieșire
    // promite tablouri interioare modificabile; aici sunt ale apelantului, deci nu se modifică.
    return { ok: true, cai: cai as readonly Varf[][], info: { ...comun, neschimbat: true, muchiiScoase: 0, contururiIesire: cai.length, lucru: buget.lucru } };
  }
  const iesire: Varf[][] = [];
  for (const r of rezultate) for (const c of r.emite()) iesire.push(c);
  return {
    ok: true,
    cai: iesire,
    info: { ...comun, neschimbat: false, muchiiScoase: suma((s) => s.muchii - s.pastrate + s.muchiiNule), contururiIesire: iesire.length, lucru: buget.lucru },
  };
}

// ---------------------------------------------------------------- calea rapidă exactă: curbe simple, disjuncte

/** Marja unghiulară a conurilor (radiani): direcțiile vin din atan2 pe diferențe exacte de coordonate. */
const MARJA_UNGHI = 1e-9;

type Con = { readonly s: number; readonly w: number };
type SegSimplu = {
  readonly v: Varf; readonly a: Punct; readonly b: Punct; readonly cale: number; readonly k: number; readonly cutie: Cutie;
  readonly geom: Geom;
};

/** Geometria unui segment-sursă (parametrul t în [0, 1]), pentru cutiile bucăților lui. */
function geomSegment(a: Punct, b: Punct, s: Segment): Geom {
  if (s.tip === 'L') return { k: 'L', p0: a, p1: b };
  if (s.tip === 'A') return { k: 'A', p0: a, p1: b, bulge: s.bulge, ...arcDinBulge(a, b, s.bulge) };
  return {
    k: 'C', p0: a, p1: b, c1: s.c1, c2: s.c2,
    d0: { x: s.c1.x - a.x, y: s.c1.y - a.y }, d1: { x: s.c2.x - s.c1.x, y: s.c2.y - s.c1.y }, d2: { x: b.x - s.c2.x, y: b.y - s.c2.y },
  };
}

const modDoiPi = (x: number): number => { const r = x % DOI_PI; return r < 0 ? r + DOI_PI : r; };

/** Cel mai mic arc de direcții (început, lățime) care cuprinde vectorii nenuli; null dacă nu e niciunul sau e ≥ π. */
function conVectori(v: readonly Punct[]): Con | null {
  const a = v.filter((q) => q.x !== 0 || q.y !== 0).map((q) => modDoiPi(Math.atan2(q.y, q.x))).sort((x, y) => x - y);
  if (!a.length) return null;
  let iMax = a.length - 1, gMax = el(a, 0) + DOI_PI - el(a, a.length - 1);
  for (let i = 0; i + 1 < a.length; i++) { const g = el(a, i + 1) - el(a, i); if (g > gMax) { gMax = g; iMax = i; } }
  const w = DOI_PI - gMax;
  return w < Math.PI - MARJA_UNGHI ? { s: el(a, (iMax + 1) % a.length), w } : null;
}

/**
 * Conul direcțiilor din vârful de plecare spre punctele segmentului (de la a spre b; `inapoi`: din b spre a). Linia: o
 * direcție. Arcul: între tangentă și coardă (unghiul înscris crește monoton de la una la cealaltă). Cubica: conul
 * punctelor de control (învelitoarea convexă), dacă e mai îngust de π.
 */
function conSegment(a: Punct, b: Punct, s: Segment, inapoi: boolean): Con | null {
  const V = inapoi ? b : a, W = inapoi ? a : b;
  if (s.tip === 'L') return conVectori([{ x: W.x - V.x, y: W.y - V.y }]);
  if (s.tip === 'A') {
    const th = 4 * Math.atan(inapoi ? -s.bulge : s.bulge), psi = Math.atan2(W.y - V.y, W.x - V.x), w = Math.abs(th) / 2;
    if (!(w < Math.PI - MARJA_UNGHI)) return null;
    return { s: modDoiPi(th > 0 ? psi - th / 2 : psi), w };
  }
  const k1 = inapoi ? s.c2 : s.c1, k2 = inapoi ? s.c1 : s.c2;
  return conVectori([{ x: k1.x - V.x, y: k1.y - V.y }, { x: k2.x - V.x, y: k2.y - V.y }, { x: W.x - V.x, y: W.y - V.y }]);
}

/** Două conuri cu același vârf au în comun doar vârful (cu marja unghiulară). */
const conuriDisjuncte = (p: Con, q: Con): boolean => modDoiPi(q.s - p.s) > p.w + MARJA_UNGHI && modDoiPi(p.s - q.s) > q.w + MARJA_UNGHI;

/** Cutia exactă a segmentului, lărgită cu m (arcul: capetele și extremele pe axe; cubica: punctele de control). */
function cutieSegment(a: Punct, b: Punct, s: Segment, m: number): Cutie {
  if (s.tip === 'L') return cutiePuncte([a, b], m);
  if (s.tip === 'C') return cutiePuncte([a, s.c1, s.c2, b], m);
  const k = arcDinBulge(a, b, s.bulge), pts = [a, b];
  for (const t of unghiuriPeArc({ k: 'A', p0: a, p1: b, bulge: s.bulge, ...k }, 0, Math.PI / 2)) {
    const u = k.th0 + t * k.sw;
    pts.push({ x: k.c.x + k.r * Math.cos(u), y: k.c.y + k.r * Math.sin(u) });
  }
  return cutiePuncte(pts, m);
}

/** Aria cu semn a segmentului față de punctul r (termenul coardei, plus segmentul de cerc / integrala cubicei, Gauss 3). */
function arieSegment(a: Punct, b: Punct, s: Segment, r: Punct): number {
  const ax = a.x - r.x, ay = a.y - r.y, bx = b.x - r.x, by = b.y - r.y;
  if (s.tip === 'L') return (ax * by - bx * ay) / 2;
  if (s.tip === 'A') { const k = arcDinBulge(a, b, s.bulge); return (ax * by - bx * ay) / 2 + ((k.r * k.r) / 2) * (k.sw - Math.sin(k.sw)); }
  const c1x = s.c1.x - r.x, c1y = s.c1.y - r.y, c2x = s.c2.x - r.x, c2y = s.c2.y - r.y;
  let arie = 0;
  for (const [t, w] of [[0.5 - Math.sqrt(0.15), 5 / 18], [0.5, 8 / 18], [0.5 + Math.sqrt(0.15), 5 / 18]] as const) {
    const u = 1 - t;
    const x = u * u * u * ax + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * bx;
    const y = u * u * u * ay + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * by;
    const dx = 3 * (u * u * (c1x - ax) + 2 * u * t * (c2x - c1x) + t * t * (bx - c2x));
    const dy = 3 * (u * u * (c1y - ay) + 2 * u * t * (c2y - c1y) + t * t * (by - c2y));
    arie += (w * (x * dy - y * dx)) / 2;
  }
  return arie;
}

/**
 * Traversările cu semn ale razei orizontale din p spre +x de către segment, cu regula semi-deschisă pe bucăți monotone pe
 * y (capetele arcului și ale cubicei sunt chiar vârfurile, deci un vârf de pe rază se numără o dată). Exactă cât timp p
 * nu e lângă segment: aici p e la peste τ de el (cutiile lărgite sunt disjuncte).
 */
function traversareSegment(p: Punct, a: Punct, b: Punct, s: Segment): number {
  const lin = (u: Punct, v: Punct, x: () => number): number => {
    if ((u.y <= p.y) === (v.y <= p.y)) return 0;
    return x() > p.x ? (v.y > u.y ? 1 : -1) : 0;
  };
  if (s.tip === 'L') return lin(a, b, () => a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y));
  if (s.tip === 'A') {
    const k = arcDinBulge(a, b, s.bulge);
    const ts = [0, ...unghiuriPeArc({ k: 'A', p0: a, p1: b, bulge: s.bulge, ...k }, Math.PI / 2, Math.PI), 1];
    const pe = (i: number): Punct => (i === 0 ? a : i === ts.length - 1 ? b : { x: k.c.x, y: k.c.y + k.r * Math.sin(k.th0 + el(ts, i) * k.sw) });
    let n = 0;
    for (let i = 0; i + 1 < ts.length; i++) {
      const m = k.th0 + ((el(ts, i) + el(ts, i + 1)) / 2) * k.sw, dy = Math.abs(p.y - k.c.y);
      n += lin(pe(i), pe(i + 1), () => k.c.x + (Math.cos(m) > 0 ? 1 : -1) * Math.sqrt(Math.max(0, (k.r - dy) * (k.r + dy))));
    }
    return n;
  }
  const P: GeomC = {
    k: 'C', p0: a, p1: b, c1: s.c1, c2: s.c2,
    d0: { x: s.c1.x - a.x, y: s.c1.y - a.y }, d1: { x: s.c2.x - s.c1.x, y: s.c2.y - s.c1.y }, d2: { x: b.x - s.c2.x, y: b.y - s.c2.y },
  };
  const ts = [0, ...radaciniPatratica(P.d0.y, P.d1.y, P.d2.y), 1], pts = ts.map((t) => punct(P, t));
  let n = 0;
  for (let i = 0; i + 1 < ts.length; i++) {
    n += lin(el(pts, i), el(pts, i + 1), () => {
      let lo = el(ts, i), hi = el(ts, i + 1);
      const jos = el(pts, i).y <= p.y;
      for (let k = 0; k < 64; k++) { const m = (lo + hi) / 2; if (m === lo || m === hi) break; if ((punct(P, m).y <= p.y) === jos) lo = m; else hi = m; }
      return punct(P, (lo + hi) / 2).x;
    });
  }
  return n;
}

/**
 * Calea rapidă exactă a unui grup: dovedește, fără toleranță, că subcăile sunt curbe închise simple, două câte două
 * disjuncte, și că fiecare față are înfășurarea 0 sau impară (sub regula dată, regiunea e chiar cea evenodd). Atunci
 * grupul n-are nimic de schimbat. Dovada:
 * - fiecare segment e simplu: linia și arcul mereu; cubica, dacă hodograful (d0, d1, d2) stă într-un semiplan deschis
 *   (proiecția pe o direcție crește strict);
 * - două segmente vecine se ating doar în vârful comun: conurile lor din vârf sunt disjuncte; o subcale din două
 *   segmente e simplă dacă e linie + arc, sau două arce diferite peste aceeași coardă;
 * - oricare alte două segmente, din aceeași subcale sau din subcăi diferite, au cutiile lărgite cu τ/2 disjuncte, direct
 *   sau după înjumătățiri (cutiile bucăților), deci curbele sunt la peste τ una de alta;
 * - incluziunile: un vârf al unei subcăi față de fiecare subcale a cărei cutie o cuprinde, cu raza exactă; orientarea:
 *   semnul ariei, calculat față de primul vârf și cerut mult peste rotunjire.
 * Orice îndoială (cutii care se ating, un con prea larg, o arie prea mică, o subcale dintr-un singur segment) întoarce
 * null: grupul merge la aranjamentul complet. Ieșirea normalizată (când alt grup al formei se schimbă) e fiecare subcale,
 * fără segmentele nule, orientată cu plinul în stânga.
 */
function grupSimplu(cai: ReadonlyArray<readonly Varf[]>, tau: number, plin: (w: number) => boolean, buget: Buget): RezultatGrup | null {
  const segs: SegSimplu[] = [], perCale: SegSimplu[][] = [];
  for (let ci = 0; ci < cai.length; ci++) {
    const cale = el(cai, ci), n = cale.length, proprii: SegSimplu[] = [];
    cheltuie(buget, 1 + (n >> 1));
    for (let i = 0; i < n; i++) {
      const v = el(cale, i), a = v.p, b = el(cale, (i + 1) % n).p, s = v.s;
      if (a.x === b.x && a.y === b.y && (s.tip === 'L' || (s.tip === 'C' && s.c1.x === a.x && s.c1.y === a.y && s.c2.x === a.x && s.c2.y === a.y))) continue;
      if (s.tip === 'C' && !conVectori([{ x: s.c1.x - a.x, y: s.c1.y - a.y }, { x: s.c2.x - s.c1.x, y: s.c2.y - s.c1.y }, { x: b.x - s.c2.x, y: b.y - s.c2.y }])) return null;
      proprii.push({ v, a, b, cale: ci, k: proprii.length, cutie: cutieSegment(a, b, s, tau / 2), geom: geomSegment(a, b, s) });
    }
    const m = proprii.length;
    if (m === 1) return null;
    if (m === 2) {
      const [p, q] = proprii as [SegSimplu, SegSimplu];
      const tp = p.v.s, tq = q.v.s;
      const bun = (tp.tip === 'A' && tq.tip === 'L') || (tp.tip === 'L' && tq.tip === 'A') || (tp.tip === 'A' && tq.tip === 'A' && tp.bulge + tq.bulge !== 0);
      if (!bun) return null;
    } else {
      for (let k = 0; k < m; k++) {
        const p = el(proprii, k), q = el(proprii, (k + 1) % m);
        const cp = conSegment(p.a, p.b, p.v.s, true), cq = conSegment(q.a, q.b, q.v.s, false);
        if (!cp || !cq || !conuriDisjuncte(cp, cq)) return null;
      }
    }
    perCale.push(proprii);
    for (const g of proprii) segs.push(g);
  }
  // Măturarea pe x: o pereche de cutii care se ating, între segmente nevecine, se rafinează prin înjumătățire (cutiile
  // bucăților, lărgite tot cu τ/2: la glife, cutiile punctelor de control ale bucăților scurte se ating des); dacă nici
  // la adâncimea 8 nu se despart, grupul merge la aranjament.
  const despart = (P: Geom, a0: number, a1: number, Q: Geom, b0: number, b1: number, adanc: number): boolean => {
    cheltuie(buget, 2);
    const ca = cutieBucata(P, a0, a1, tau / 2), cb = cutieBucata(Q, b0, b1, tau / 2);
    if (ca.maxX < cb.minX || cb.maxX < ca.minX || ca.maxY < cb.minY || cb.maxY < ca.minY) return true;
    if (adanc >= 8) return false;
    if (Math.hypot(ca.maxX - ca.minX, ca.maxY - ca.minY) >= Math.hypot(cb.maxX - cb.minX, cb.maxY - cb.minY)) {
      const m = (a0 + a1) / 2;
      return despart(P, a0, m, Q, b0, b1, adanc + 1) && despart(P, m, a1, Q, b0, b1, adanc + 1);
    }
    const m = (b0 + b1) / 2;
    return despart(P, a0, a1, Q, b0, m, adanc + 1) && despart(P, a0, a1, Q, m, b1, adanc + 1);
  };
  const vecine = (p: SegSimplu, q: SegSimplu): boolean => {
    if (p.cale !== q.cale) return false;
    const m = el(perCale, p.cale).length, d = Math.abs(p.k - q.k);
    return d === 1 || d === m - 1;
  };
  {
    const ord = [...segs].sort((p, q) => p.cutie.minX - q.cutie.minX);
    let activ: SegSimplu[] = [];
    for (const g of ord) {
      cheltuie(buget, 1 + (activ.length >> 2));
      activ = activ.filter((a) => a.cutie.maxX >= g.cutie.minX);
      for (const a of activ) {
        if (a.cutie.minY <= g.cutie.maxY && g.cutie.minY <= a.cutie.maxY && !vecine(a, g) && !despart(a.geom, 0, 1, g.geom, 0, 1, 0)) return null;
      }
      activ.push(g);
    }
  }
  // Orientarea fiecărei subcăi și incluziunile (subcăile sunt disjuncte, deci un vârf ajunge).
  const cutiiCale = perCale.map((l) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const g of l) { minX = Math.min(minX, g.cutie.minX); minY = Math.min(minY, g.cutie.minY); maxX = Math.max(maxX, g.cutie.maxX); maxY = Math.max(maxY, g.cutie.maxY); }
    return { minX, minY, maxX, maxY };
  });
  const orient: number[] = [];
  for (let i = 0; i < perCale.length; i++) {
    const l = el(perCale, i), c = el(cutiiCale, i);
    if (!l.length) { orient.push(0); continue; }
    const r = el(l, 0).a, D = Math.hypot(c.maxX - c.minX, c.maxY - c.minY);
    let arie = 0;
    for (const g of l) arie += arieSegment(g.a, g.b, g.v.s, r);
    cheltuie(buget, l.length);
    if (!(Math.abs(arie) > 1e-11 * l.length * D * D)) return null;
    orient.push(arie > 0 ? 1 : -1);
  }
  // Subcalea i e în subcalea j doar dacă cutia lui j o cuprinde pe a lui i; perechile se caută cu o măturare pe x (o placă
  // cu mii de găuri e un singur grup: fiecare gaură se compară doar cu cutiile deschise peste ea).
  const suma = orient.slice();
  const cuprinde = (i: number, j: number): boolean => {
    const ci = el(cutiiCale, i), cj = el(cutiiCale, j);
    return cj.minX <= ci.minX && ci.maxX <= cj.maxX && cj.minY <= ci.minY && ci.maxY <= cj.maxY;
  };
  /** Subcalea i e în subcalea j? Un vârf al lui i, cu raza exactă față de j (j e simplă: înfășurarea e 0 sau orientarea ei). */
  const inauntru = (i: number, j: number): boolean | null => {
    const lj = el(perCale, j), p = el(el(perCale, i), 0).a;
    cheltuie(buget, 1 + lj.length);
    let w = 0;
    for (const g of lj) if (!(g.cutie.maxX < p.x || g.cutie.minY > p.y || g.cutie.maxY < p.y)) w += traversareSegment(p, g.a, g.b, g.v.s);
    return w === 0 ? false : w === el(orient, j) ? true : null;
  };
  {
    const ord = perCale.map((_, i) => i).filter((i) => el(perCale, i).length > 0).sort((a, b) => el(cutiiCale, a).minX - el(cutiiCale, b).minX);
    let deschise: number[] = [];
    for (const i of ord) {
      const ci = el(cutiiCale, i);
      cheltuie(buget, 1 + (deschise.length >> 2));
      deschise = deschise.filter((j) => el(cutiiCale, j).maxX >= ci.minX);
      for (const j of deschise) {
        for (const [a, b] of [[i, j], [j, i]] as const) {
          if (!cuprinde(a, b)) continue;
          const r = inauntru(a, b);
          if (r === null) return null;
          if (r) suma[a] = el(suma, a) + el(orient, b);
        }
      }
      deschise.push(i);
    }
  }
  // Fața din interiorul fiecărei subcăi are înfășurarea suma[i]; fața de afară are suma[i] − orient[i] (a părintelui, sau
  // 0). Regiunea regulii e cea evenodd dacă fiecare față e plină exact când înfășurarea ei e impară.
  for (let i = 0; i < perCale.length; i++) {
    if (!el(perCale, i).length) continue;
    const w = el(suma, i);
    if (plin(w) !== ((w & 1) !== 0)) return null;
  }
  const emite = (): Varf[][] => {
    const iesire: Varf[][] = [];
    for (let i = 0; i < perCale.length; i++) {
      const l = el(perCale, i);
      if (!l.length) continue;
      const varfuri = l.map((g) => g.v);
      iesire.push(plin(el(suma, i)) === el(orient, i) > 0 ? varfuri : [...inverseaza({ inchis: true, varfuri }).varfuri]);
    }
    return iesire;
  };
  return {
    neschimbat: true,
    st: { intersectii: 0, tangente: 0, suprapuneri: 0, lipiri: 0, muchii: 0, muchiiNule: 0, pastrate: 0, raze: 0, sferturi: 0 },
    emite,
  };
}

// ---------------------------------------------------------------- un grup

type SegSursa =
  | { readonly k: 'L'; readonly a: Punct; readonly b: Punct; readonly vi: number }
  | { readonly k: 'A'; readonly a: Punct; readonly b: Punct; readonly vi: number; readonly bulge: number }
  | { readonly k: 'C'; readonly a: Punct; readonly b: Punct; readonly vi: number; readonly c1: Punct; readonly c2: Punct };

type Taietura = { readonly t: number; readonly n: number };
type Radacina = { readonly s: number; readonly t: number; readonly X?: Punct | undefined };
type RadacinaX = { readonly s: number; readonly t: number; readonly X: Punct };

type Muchie = {
  readonly id: number; readonly P: Prim; readonly ta: number; readonly tb: number; readonly na: number; readonly nb: number;
  readonly cutie: Cutie;
  /** Ultima rază care a numărat-o (o muchie se numără o dată pe rază, deși stă în mai multe celule). */
  raza: number;
  /** Ultima muchie pentru care s-a verificat ca vecină, la garda sferturilor. */
  vecin: number;
};
/** Decizia unui grup de muchii comune; `dinRaza`: citită cu raze chiar la mijlocul lui `ref` (nu propagată). */
type Decizie = { readonly wL: number; readonly wR: number; readonly ref: Muchie; readonly dinRaza: boolean; pastrat: boolean };
type Capat = { readonly e: Muchie; readonly iese: boolean };
type Orientata = { readonly id: number; readonly P: Prim; readonly ta: number; readonly tb: number; readonly na: number; readonly nb: number };
type Celula = { readonly m: Muchie[]; readonly v: Punct[] };

function normalizeazaGrup(
  cai: ReadonlyArray<readonly Varf[]>,
  indici: readonly number[],
  tau: number,
  plin: (w: number) => boolean,
  buget: Buget,
): RezultatGrup {
  /** Scara grupului (întinderea, cu podeaua aritmetică): pragurile prototipului relative la formă. */
  const S = tau / TAU_RELATIV;
  /** O rază care trece mai aproape de atât de un vârf, sau o traversare atât de aproape de origine, e ambiguă. */
  const tAmb = 4 * tau;
  const st: StatGrup = { intersectii: 0, tangente: 0, suprapuneri: 0, lipiri: 0, muchii: 0, muchiiNule: 0, pastrate: 0, raze: 0, sferturi: 0 };
  const lucreaza = (n: number): void => { cheltuie(buget, n); };

  // ---------- primitivele și nodurile (vârfurile-sursă au prioritatea 3: rămân reprezentantul la contopire)
  const nodPt: Punct[] = [], nodPrio: number[] = [], parinte: number[] = [];
  const nod = (p: Punct, prio: number): number => { nodPt.push(p); nodPrio.push(prio); parinte.push(parinte.length); return parinte.length - 1; };
  const gaseste = (i: number): number => {
    let k = i;
    for (;;) {
      const p = el(parinte, k);
      if (p === k) return k;
      const g = el(parinte, p);
      parinte[k] = g;
      k = g;
    }
  };
  const uneste = (x: number, y: number): void => {
    let a = gaseste(x), b = gaseste(y);
    if (a === b) return;
    if (el(nodPrio, b) > el(nodPrio, a)) [a, b] = [b, a];
    parinte[b] = a;
    st.lipiri++;
  };
  /** Cubica e chiar segmentul [a, b]: mânerele la cel mult τ de coardă, cu proiecția crescătoare (fără întoarceri). */
  const dreapta = (a: Punct, c1: Punct, c2: Punct, b: Punct): boolean => {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
    if (l === 0) return false;
    const d1 = Math.abs(cr(dx, dy, c1.x - a.x, c1.y - a.y)) / l, d2 = Math.abs(cr(dx, dy, c2.x - a.x, c2.y - a.y)) / l;
    if (d1 > tau || d2 > tau) return false;
    const u1 = ((c1.x - a.x) * dx + (c1.y - a.y) * dy) / l2, u2 = ((c2.x - a.x) * dx + (c2.y - a.y) * dy) / l2;
    return u1 >= 0 && u1 <= u2 && u2 <= 1;
  };
  const prims: Prim[] = [], contururi: number[][] = [];
  cai.forEach((cale, ciLocal) => {
    const n = cale.length, segs: SegSursa[] = [];
    for (let i = 0; i < n; i++) {
      const v = el(cale, i), a = v.p, b = el(cale, (i + 1) % n).p, s = v.s, egal = a.x === b.x && a.y === b.y;
      if (s.tip === 'L') { if (!egal) segs.push({ k: 'L', a, b, vi: i }); }
      else if (s.tip === 'A') segs.push({ k: 'A', a, b, vi: i, bulge: s.bulge });
      else {
        const { c1, c2 } = s;
        if (egal && c1.x === a.x && c1.y === a.y && c2.x === a.x && c2.y === a.y) continue;
        if (!egal && dreapta(a, c1, c2, b)) segs.push({ k: 'L', a, b, vi: i });
        else segs.push({ k: 'C', a, b, vi: i, c1, c2 });
      }
    }
    if (!segs.length) return;
    const noduri = segs.map((g) => nod(g.a, 3)), ids: number[] = [], cj = contururi.length;
    segs.forEach((g, j) => {
      const baza = { id: prims.length, ci: el(indici, ciLocal), vi: g.vi, cj, n0: el(noduri, j), n1: el(noduri, (j + 1) % segs.length) };
      let geom: Geom;
      if (g.k === 'A') geom = { k: 'A', p0: g.a, p1: g.b, bulge: g.bulge, ...arcDinBulge(g.a, g.b, g.bulge) };
      else if (g.k === 'C') {
        geom = {
          k: 'C', p0: g.a, p1: g.b, c1: g.c1, c2: g.c2,
          d0: { x: g.c1.x - g.a.x, y: g.c1.y - g.a.y }, d1: { x: g.c2.x - g.c1.x, y: g.c2.y - g.c1.y }, d2: { x: g.b.x - g.c2.x, y: g.b.y - g.c2.y },
        };
      } else geom = { k: 'L', p0: g.a, p1: g.b };
      prims.push({ ...geom, ...baza, cutie: cutieBucata(geom, 0, 1, tau) });
      ids.push(baza.id);
    });
    contururi.push(ids);
  });
  const taieturi: Taietura[][] = prims.map((P) => [{ t: 0, n: P.n0 }, { t: 1, n: P.n1 }]);
  const undeE = (P: Prim): string => `subcalea ${P.ci}, segmentul ${P.vi}`;

  // ---------- evenimentele (intersecții, suprapuneri), cu lipirea la capete
  const viteza = (P: Prim, s: number): number => { const d = derivata(P, Math.min(1, Math.max(0, s))); return Math.hypot(d.x, d.y); };
  /** Parametrul s pe P, lipit la capăt sub τ; null în afara primitivei. */
  const lipeste = (P: Prim, s: number): number | null => {
    if (!(s === s)) return null;
    const v = viteza(P, s), e = v > 0 ? tau / v : 1e-12;
    if (s < -e || s > 1 + e) return null;
    if (s <= e) return 0;
    if (s >= 1 - e) return 1;
    return s;
  };
  /** Punctul intersecției, luat pe primitiva cu rangul mai mare (cubica > arcul > linia). */
  const alege = (A: Prim, s: number, B: Prim, t: number): Punct => (RANG[A.k] >= RANG[B.k] ? punct(A, s) : punct(B, t));
  const eveniment = (A: Prim, s: number, B: Prim, t: number, X?: Punct): void => {
    const nA = s === 0 ? A.n0 : s === 1 ? A.n1 : -1, nB = t === 0 ? B.n0 : t === 1 ? B.n1 : -1;
    if (nA >= 0 && nB >= 0) {
      // Capete pe capete: o intersecție doar dacă unește noduri distincte (nu capătul comun al segmentelor vecine).
      if (gaseste(nA) !== gaseste(nB)) st.intersectii++;
      uneste(nA, nB);
      return;
    }
    st.intersectii++;
    const n = nA >= 0 ? nA : nB >= 0 ? nB : nod(X ?? alege(A, s, B, t), Math.max(RANG[A.k], RANG[B.k]));
    if (nA < 0) el(taieturi, A.id).push({ t: s, n });
    if (nB < 0) el(taieturi, B.id).push({ t, n });
  };
  /** Piciorul perpendicularei din X pe P: Newton din t0, prins în [lo, hi] (linia și arcul: închis). */
  const proiectie = (P: Prim, X: Punct, t0: number, lo = 0, hi = 1): { t: number; d: number } => {
    if (P.k === 'L') { const t = Math.min(hi, Math.max(lo, paramLinie(P, X))); return { t, d: dist(punct(P, t), X) }; }
    if (P.k === 'A') { const t = Math.min(hi, Math.max(lo, paramArc(P, X))); return { t, d: dist(punct(P, t), X) }; }
    let t = t0;
    for (let i = 0; i < 30; i++) {
      const B = punct(P, t), d1 = derivata(P, t), d2 = derivata2(P, t), ex = B.x - X.x, ey = B.y - X.y;
      const g = ex * d1.x + ey * d1.y, h = d1.x * d1.x + d1.y * d1.y + ex * d2.x + ey * d2.y;
      if (!(h > 0)) break;
      const tn = Math.min(hi, Math.max(lo, t - g / h));
      if (Math.abs(tn - t) < 1e-16) { t = tn; break; }
      t = tn;
    }
    return { t, d: dist(punct(P, t), X) };
  };
  const proiectieCubica = (P: Prim, X: Punct): { t: number; d: number } => {
    let best = { t: 0, d: dist(P.p0, X) };
    for (let i = 1; i <= 32; i++) { const t = i / 32, d = dist(punct(P, t), X); if (d < best.d) best = { t, d }; }
    const r = proiectie(P, X, best.t);
    if (r.d < best.d) best = r;
    if (dist(P.p1, X) <= best.d) best = { t: 1, d: dist(P.p1, X) };
    return best;
  };
  /** Lentila dintre două rădăcini vecine e mai subțire decât τ? */
  const lentilaSubtire = (A: Prim, B: Prim, q1: RadacinaX, q2: RadacinaX): boolean => {
    if (dist(q1.X, q2.X) > 1e-3 * S) return false;
    for (const f of [0.25, 0.5, 0.75]) {
      const s = q1.s + f * (q2.s - q1.s), t = q1.t + f * (q2.t - q1.t);
      if (proiectie(B, punct(A, s), t, Math.min(q1.t, q2.t), Math.max(q1.t, q2.t)).d > tau) return false;
    }
    return true;
  };
  const eCap = (q: Radacina): boolean => q.s === 0 || q.s === 1 || q.t === 0 || q.t === 1;
  const inregistreaza = (A: Prim, B: Prim, radacini: readonly Radacina[]): void => {
    const r: RadacinaX[] = [];
    for (const q of radacini) {
      const s = lipeste(A, q.s), t = lipeste(B, q.t);
      if (s === null || t === null) continue;
      r.push({ s, t, X: s === q.s && t === q.t && q.X ? q.X : alege(A, s, B, t) });
    }
    r.sort((u, v) => u.s - v.s);
    const out: RadacinaX[] = [];
    for (const q of r) {
      const p = out[out.length - 1];
      if (p && ((dist(p.X, q.X) <= tau && Math.abs(p.s - q.s) <= 1e-6 && Math.abs(p.t - q.t) <= 1e-6) || lentilaSubtire(A, B, p, q))) {
        if (dist(p.X, q.X) > tau) st.tangente++;
        const capQ = eCap(q), capP = eCap(p);
        if (capQ && !capP) out[out.length - 1] = q;
        else if (!capP && !capQ) { const s = (p.s + q.s) / 2, t = (p.t + q.t) / 2; out[out.length - 1] = { s, t, X: alege(A, s, B, t) }; }
        continue;
      }
      out.push(q);
    }
    for (const q of out) eveniment(A, q.s, B, q.t, q.X);
  };
  /** A și B pe aceeași dreaptă sau pe același cerc: capetele fiecăreia taie cealaltă. */
  const suprapunere = (A: Prim, B: Prim): void => {
    const par = (P: Prim, X: Punct): number => (P.k === 'L' ? paramLinie(P, X) : P.k === 'A' ? paramArc(P, X) : NaN);
    st.suprapuneri++;
    const rad: RadacinaX[] = [
      { s: par(A, B.p0), t: 0, X: B.p0 }, { s: par(A, B.p1), t: 1, X: B.p1 }, { s: 0, t: par(B, A.p0), X: A.p0 }, { s: 1, t: par(B, A.p1), X: A.p1 },
    ];
    for (const q of rad) { const s = lipeste(A, q.s), t = lipeste(B, q.t); if (s !== null && t !== null) eveniment(A, s, B, t, q.X); }
  };
  const LL = (A: Prim & GeomL, B: Prim & GeomL): void => {
    const dx = A.p1.x - A.p0.x, dy = A.p1.y - A.p0.y, ex = B.p1.x - B.p0.x, ey = B.p1.y - B.p0.y, la = Math.hypot(dx, dy);
    const h0 = cr(dx, dy, B.p0.x - A.p0.x, B.p0.y - A.p0.y) / la, h1 = cr(dx, dy, B.p1.x - A.p0.x, B.p1.y - A.p0.y) / la;
    if (Math.abs(h0) <= tau && Math.abs(h1) <= tau) { suprapunere(A, B); return; }
    const den = cr(dx, dy, ex, ey);
    if (den === 0) return;
    const qx = B.p0.x - A.p0.x, qy = B.p0.y - A.p0.y, s = cr(qx, qy, ex, ey) / den, t = cr(qx, qy, dx, dy) / den;
    inregistreaza(A, B, [{ s, t, X: { x: A.p0.x + s * dx, y: A.p0.y + s * dy } }]);
  };
  const LA = (L: Prim & GeomL, A: Prim & GeomA): void => {
    const dx = L.p1.x - L.p0.x, dy = L.p1.y - L.p0.y, la = Math.hypot(dx, dy), ux = dx / la, uy = dy / la;
    const fx = A.c.x - L.p0.x, fy = A.c.y - L.p0.y, h = cr(ux, uy, fx, fy), sm = (fx * ux + fy * uy) / la, ah = Math.abs(h), r = A.r;
    if (ah > r + tau) return;
    const rad: RadacinaX[] = [];
    if (ah >= r - tau) {
      // Tangentă: un singur punct, pe cerc.
      const px = L.p0.x + sm * dx - A.c.x, py = L.p0.y + sm * dy - A.c.y, l = Math.hypot(px, py);
      const X = l > 0 ? { x: A.c.x + (r * px) / l, y: A.c.y + (r * py) / l } : { x: L.p0.x + sm * dx, y: L.p0.y + sm * dy };
      rad.push({ s: sm, t: paramArc(A, X), X });
      st.tangente++;
    } else {
      const w = Math.sqrt((r - ah) * (r + ah)) / la;
      for (const s of [sm - w, sm + w]) { const X = { x: L.p0.x + s * dx, y: L.p0.y + s * dy }; rad.push({ s, t: paramArc(A, X), X }); }
    }
    inregistreaza(L, A, rad);
  };
  const AA = (A: Prim & GeomA, B: Prim & GeomA): void => {
    const dx = B.c.x - A.c.x, dy = B.c.y - A.c.y, d = Math.hypot(dx, dy), r1 = A.r, r2 = B.r;
    if (d <= tau && Math.abs(r1 - r2) <= tau) { suprapunere(A, B); return; }
    if (d === 0 || d > r1 + r2 + tau || d < Math.abs(r1 - r2) - tau) return;
    const ux = dx / d, uy = dy / d, a = (d * d + r1 * r1 - r2 * r2) / (2 * d), adanc = Math.min(r1 + r2 - d, d - Math.abs(r1 - r2));
    const rad: RadacinaX[] = [];
    const cu = (X: Punct): void => { rad.push({ s: paramArc(A, X), t: paramArc(B, X), X }); };
    if (adanc <= tau) {
      const s = a >= 0 ? r1 : -r1;
      cu({ x: A.c.x + s * ux, y: A.c.y + s * uy });
      st.tangente++;
    } else {
      const h = Math.sqrt(Math.max(0, (r1 - a) * (r1 + a)));
      const rezidual = (X: Punct): number => Math.max(Math.abs(dist(X, A.c) - r1), Math.abs(dist(X, B.c) - r2));
      for (const sg of [1, -1]) {
        // Forma închisă, apoi Newton pe cele două ecuații ale cercurilor, până nu se mai mișcă. Forma închisă singură e
        // 1,8e-9 mm departe de cercuri pe un cerc de 2e-4 pe unul de 100 (judecata 2.7d: 3,5e-9 la prototipul B); Newton
        // o aduce la ~1e-20. Lângă tangență Newton poate rătăci: rezultatul lui se ia doar dacă reziduul scade.
        const X0 = { x: A.c.x + a * ux - sg * h * uy, y: A.c.y + a * uy + sg * h * ux };
        let X = X0;
        const prag = 2 * ulp(Math.max(Math.abs(X.x), Math.abs(X.y)));
        for (let i = 0; i < 8; i++) {
          const ax = X.x - A.c.x, ay = X.y - A.c.y, bx = X.x - B.c.x, by = X.y - B.c.y;
          const f1 = ax * ax + ay * ay - r1 * r1, f2 = bx * bx + by * by - r2 * r2, det = 4 * cr(ax, ay, bx, by);
          if (det === 0 || !Number.isFinite(det)) break;
          const px = (f1 * 2 * by - 2 * ay * f2) / det, py = (2 * ax * f2 - 2 * bx * f1) / det;
          if (!Number.isFinite(px) || !Number.isFinite(py)) break;
          X = { x: X.x - px, y: X.y - py };
          if (Math.abs(px) <= prag && Math.abs(py) <= prag) break;
        }
        cu(rezidual(X) <= rezidual(X0) ? X : X0);
      }
    }
    inregistreaza(A, B, rad);
  };
  /** Rădăcinile din [0, 1] ale cubicei Bernstein g (valorile sub τ sunt zero: atingere). */
  const radaciniCubica = (g: readonly [number, number, number, number]): number[] => {
    const ev = (t: number): number => {
      const m = 1 - t, a = m * g[0] + t * g[1], b = m * g[1] + t * g[2], c = m * g[2] + t * g[3], d = m * a + t * b, e = m * b + t * c;
      return m * d + t * e;
    };
    const pts = [0, ...radaciniPatratica(g[1] - g[0], g[2] - g[1], g[3] - g[2]), 1], v = pts.map(ev), out: number[] = [];
    pts.forEach((t, i) => { if (Math.abs(el(v, i)) <= tau) { out.push(t); if (i > 0 && i < pts.length - 1) st.tangente++; } });
    for (let i = 0; i + 1 < pts.length; i++) {
      const vi = el(v, i), vj = el(v, i + 1);
      if (Math.abs(vi) <= tau || Math.abs(vj) <= tau || (vi < 0) === (vj < 0)) continue;
      let a = el(pts, i), b = el(pts, i + 1);
      const neg = vi < 0;
      for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (m === a || m === b) break; if ((ev(m) < 0) === neg) a = m; else b = m; }
      out.push((a + b) / 2);
    }
    return out;
  };
  const LC = (L: Prim & GeomL, C: Prim & GeomC): void => {
    const dx = L.p1.x - L.p0.x, dy = L.p1.y - L.p0.y, l2 = dx * dx + dy * dy, la = Math.sqrt(l2), nx = -dy / la, ny = dx / la;
    const f = (p: Punct): number => nx * (p.x - L.p0.x) + ny * (p.y - L.p0.y);
    inregistreaza(L, C, radaciniCubica([f(C.p0), f(C.c1), f(C.c2), f(C.p1)]).map((t) => {
      const X = punct(C, t);
      return { s: ((X.x - L.p0.x) * dx + (X.y - L.p0.y) * dy) / l2, t, X };
    }));
  };
  const newton = (A: Prim, B: Prim, s0: number, t0: number): { s: number; t: number } | null => {
    let s = s0, t = t0;
    for (let i = 0; i < 64; i++) {
      const P = punct(A, s), Q = punct(B, t), fx = P.x - Q.x, fy = P.y - Q.y;
      if (fx === 0 && fy === 0) break;
      const da = derivata(A, s), db = derivata(B, t), a = da.x, b = -db.x, c = da.y, d = -db.y, det = a * d - b * c;
      if (det === 0 || !Number.isFinite(det)) break;
      const ds = (-fx * d + b * fy) / det, dt = (-a * fy + c * fx) / det;
      s += ds; t += dt;
      if (!(s > -0.5 && s < 1.5 && t > -0.5 && t < 1.5)) return null;
      if (Math.abs(ds) < 1e-16 && Math.abs(dt) < 1e-16) break;
    }
    return dist(punct(A, s), punct(B, t)) <= tau ? { s, t } : null;
  };
  /** Intersecțiile prin subdivizare pe bucăți monotone (A/C, C/C, bucla unei cubice cu `acelasi`). */
  const generic = (A: Prim, B: Prim, acelasi: boolean): void => {
    const ta = [0, ...separatoriMonotonie(A), 1], tb = acelasi ? ta : [0, ...separatoriMonotonie(B), 1];
    const rad: Radacina[] = [];
    let pasi = 0;
    const profil = (P: Prim, p0: number, p1: number, Q: Prim, q0: number, q1: number, inv: boolean): void => {
      const n = 16, m = 0.25 * (q1 - q0), lo = q0 - m, hi = q1 + m;
      let tg = q0, bestD = Infinity;
      for (let k = 0; k <= 4; k++) { const t = q0 + (k / 4) * (q1 - q0), d = dist(punct(Q, t), punct(P, p0)); if (d < bestD) { bestD = d; tg = t; } }
      type V = { readonly s: number; readonly h: number; readonly t: number };
      const H = (s: number): V | null => {
        lucreaza(1);
        const X = punct(P, s), pr = proiectie(Q, X, tg, lo, hi);
        if (!(pr.t > lo && pr.t < hi)) return null;
        const T = derivata(Q, pr.t), Y = punct(Q, pr.t), l = Math.hypot(T.x, T.y);
        if (l === 0) return null;
        tg = pr.t;
        return { s, h: cr(T.x, T.y, X.x - Y.x, X.y - Y.y) / l, t: pr.t };
      };
      const pune = (v: V): void => {
        const r0 = inv ? { s: v.t, t: v.s } : { s: v.s, t: v.t };
        const r1 = newton(A, B, r0.s, r0.t);
        rad.push(r1 && Math.abs(r1.s - r0.s) < 1e-6 && Math.abs(r1.t - r0.t) < 1e-6 ? r1 : r0);
      };
      const bisect = (va: V, vb: V): void => {
        let a = va, b = vb;
        for (let k = 0; k < 100; k++) {
          const sm = (a.s + b.s) / 2;
          if (sm === a.s || sm === b.s) break;
          const v = H(sm);
          if (!v) return;
          if ((v.h > 0) === (a.h > 0)) a = v; else b = v;
        }
        pune(Math.abs(a.h) <= Math.abs(b.h) ? a : b);
      };
      const v: Array<V | null> = [];
      for (let i = 0; i <= n; i++) v.push(H(p0 + (i / n) * (p1 - p0)));
      const vv = (i: number): V | null => v[i] ?? null;
      const schimba = (i: number): boolean => { const a = vv(i), b = vv(i + 1); return !!a && !!b && (a.h > 0) !== (b.h > 0); };
      for (let i = 0; i < n; i++) { const a = vv(i), b = vv(i + 1); if (a && b && schimba(i)) bisect(a, b); }
      for (let i = 0; i <= n; i++) {
        const w = vv(i);
        if (!w) continue;
        const st0 = i > 0 ? vv(i - 1) : null, dr0 = i < n ? vv(i + 1) : null;
        if ((st0 && Math.abs(st0.h) < Math.abs(w.h)) || (dr0 && Math.abs(dr0.h) < Math.abs(w.h))) continue;
        if ((i > 0 && schimba(i - 1)) || (i < n && schimba(i))) continue;
        // Extremul spre zero al lui h pe [s(i − 1), s(i + 1)], prin secțiunea de aur.
        const sg = w.h > 0 ? 1 : -1, sa = p0 + (Math.max(0, i - 1) / n) * (p1 - p0), sb = p0 + (Math.min(n, i + 1) / n) * (p1 - p0);
        const g = (s: number): number => { const q = H(s); return q ? sg * q.h : Infinity; };
        const gr = (Math.sqrt(5) - 1) / 2;
        let x1 = sb - gr * (sb - sa), x2 = sa + gr * (sb - sa), g1 = g(x1), g2 = g(x2), a = sa, b = sb;
        for (let k = 0; k < 80 && b - a > 1e-16; k++) {
          if (g1 < g2) { b = x2; x2 = x1; g2 = g1; x1 = b - gr * (b - a); g1 = g(x1); }
          else { a = x1; x1 = x2; g1 = g2; x2 = a + gr * (b - a); g2 = g(x2); }
        }
        let vm = H(g1 < g2 ? x1 : x2);
        if (!vm) continue;
        if (sg * w.h <= sg * vm.h) vm = w;
        if (Math.abs(vm.h) <= tau) { pune(vm); st.tangente++; continue; }
        if (sg * vm.h < 0) {
          // Coboară prin zero: o lentilă mai groasă decât τ, două rădăcini.
          const va = H(sa), vb = H(sb);
          if (va && (va.h > 0) !== (vm.h > 0)) bisect(va, vm);
          if (vb && (vb.h > 0) !== (vm.h > 0)) bisect(vm, vb);
        }
      }
    };
    const rec = (a0: number, a1: number, b0: number, b1: number, adanc: number): void => {
      if (++pasi > PLAFON_PERECHE) {
        throw new Refuz(`plafon: ${undeE(A)} și ${undeE(B)}: intersecția nu se separă în ${PLAFON_PERECHE} de pași (curbe aproape suprapuse) lângă ${loc(punct(A, a0))}`);
      }
      lucreaza(1);
      const pa0 = punct(A, a0), pa1 = punct(A, a1), pb0 = punct(B, b0), pb1 = punct(B, b1);
      if (Math.min(pa0.x, pa1.x) > Math.max(pb0.x, pb1.x) + tau || Math.min(pb0.x, pb1.x) > Math.max(pa0.x, pa1.x) + tau ||
          Math.min(pa0.y, pa1.y) > Math.max(pb0.y, pb1.y) + tau || Math.min(pb0.y, pb1.y) > Math.max(pa0.y, pa1.y) + tau) return;
      {
        // Cutiile se ating doar lângă un capăt comun: singurul punct comun posibil e acel vârf.
        const ix0 = Math.max(Math.min(pa0.x, pa1.x), Math.min(pb0.x, pb1.x)), ix1 = Math.min(Math.max(pa0.x, pa1.x), Math.max(pb0.x, pb1.x));
        const iy0 = Math.max(Math.min(pa0.y, pa1.y), Math.min(pb0.y, pb1.y)), iy1 = Math.min(Math.max(pa0.y, pa1.y), Math.max(pb0.y, pb1.y));
        if (ix1 - ix0 <= 2 * tau && iy1 - iy0 <= 2 * tau) {
          for (const [s, p, t, q] of [[a0, pa0, b0, pb0], [a0, pa0, b1, pb1], [a1, pa1, b0, pb0], [a1, pa1, b1, pb1]] as const) {
            if ((s === 0 || s === 1) && (t === 0 || t === 1) && p.x === q.x && p.y === q.y) { rad.push({ s, t }); return; }
          }
        }
      }
      const la = dist(pa0, pa1), lb = dist(pb0, pb1), fa = platitudine(A, a0, a1), fb = platitudine(B, b0, b1);
      const mic = Math.max(la, lb) <= 10 * tau || adanc > 80;
      const plataA = fa <= 1e-3 * la + tau, plataB = fb <= 1e-3 * lb + tau;
      if (!mic && !(plataA && plataB)) {
        // Întâi bucata curbă.
        if ((!plataA && a1 - a0 > 1e-15) || b1 - b0 <= 1e-15) { const m = (a0 + a1) / 2; rec(a0, m, b0, b1, adanc + 1); rec(m, a1, b0, b1, adanc + 1); }
        else { const m = (b0 + b1) / 2; rec(a0, a1, b0, m, adanc + 1); rec(a0, a1, m, b1, adanc + 1); }
        return;
      }
      const ex = pa1.x - pa0.x, ey = pa1.y - pa0.y, fx = pb1.x - pb0.x, fy = pb1.y - pb0.y, qx = pb0.x - pa0.x, qy = pb0.y - pa0.y;
      const den = cr(ex, ey, fx, fy);
      if (Math.abs(den) > 1e-2 * la * lb) {
        // Transversale: ghicitul din coarde, apoi Newton.
        const u = cr(qx, qy, fx, fy) / den, v = cr(qx, qy, ex, ey) / den;
        if (u < -0.5 || u > 1.5 || v < -0.5 || v > 1.5) return;
        const r = newton(A, B, a0 + u * (a1 - a0), b0 + v * (b1 - b0));
        if (r) rad.push(r);
        return;
      }
      const ds = (p: Punct, a: Punct, b: Punct): number => {
        const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy, w = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2)) : 0;
        return Math.hypot(p.x - a.x - w * vx, p.y - a.y - w * vy);
      };
      // Perechea cade doar dacă distanța dintre coarde trece de fa + fb + τ. Distanța e zero dacă coardele se taie (testul
      // de orientare pe cele patru capete): capetele singure n-o mărginesc, două coarde aproape paralele care se taie în X
      // sub un unghi mic au toate capetele departe de cealaltă (recenzia 2.7d, constatarea 0: lentila ratată, tăcut).
      const o = (p: Punct, q: Punct, r: Punct): number => cr(q.x - p.x, q.y - p.y, r.x - p.x, r.y - p.y);
      const seTaie = o(pa0, pa1, pb0) * o(pa0, pa1, pb1) <= 0 && o(pb0, pb1, pa0) * o(pb0, pb1, pa1) <= 0;
      if (!seTaie && Math.min(ds(pa0, pb0, pb1), ds(pa1, pb0, pb1), ds(pb0, pa0, pa1), ds(pb1, pa0, pa1)) > fa + fb + tau) return;
      // Aproape paralele și apropiate: profilul distanței cu semn (bucata mai scurtă, proiectată pe cealaltă).
      if (la <= lb) profil(A, a0, a1, B, b0, b1, false); else profil(B, b0, b1, A, a0, a1, true);
    };
    if (!acelasi) {
      // Capetele fiecăreia pe cealaltă (vârfuri comune, contact plat lângă un vârf).
      const pr = (P: Prim, X: Punct): { t: number; d: number } => (P.k === 'C' ? proiectieCubica(P, X) : proiectie(P, X, 0));
      for (const t of [0, 1]) { const p = pr(A, punct(B, t)); if (p.d <= tau) rad.push({ s: p.t, t }); }
      for (const s of [0, 1]) { const p = pr(B, punct(A, s)); if (p.d <= tau) rad.push({ s, t: p.t }); }
    }
    for (let i = 0; i + 1 < ta.length; i++) {
      for (let j = 0; j + 1 < tb.length; j++) {
        if (acelasi && j < i + 2) continue;
        rec(el(ta, i), el(ta, i + 1), el(tb, j), el(tb, j + 1), 0);
      }
    }
    inregistreaza(A, B, acelasi
      ? rad.filter((q) => Math.abs(q.s - q.t) > 1e-9 && dist(punct(A, q.s), punct(A, q.t)) <= tau).map((q) => (q.s < q.t ? q : { s: q.t, t: q.s }))
      : rad);
  };
  /** Două cubice pe aceeași cubică polinomială (subcurbele comune la cel mult 16τ): capetele fiecăreia taie cealaltă. */
  const coincidCubice = (A: Prim & GeomC, B: Prim & GeomC): boolean => {
    const per: Array<readonly [number, number]> = [];
    const add = (s: number, t: number): void => { if (!per.some((q) => Math.abs(q[0] - s) < 1e-9 && Math.abs(q[1] - t) < 1e-9)) per.push([s, t]); };
    for (const [t, X] of [[0, B.p0], [1, B.p1]] as const) { const p = proiectieCubica(A, X); if (p.d <= tau) add(p.t, t); }
    for (const [s, X] of [[0, A.p0], [1, A.p1]] as const) { const p = proiectieCubica(B, X); if (p.d <= tau) add(s, p.t); }
    if (per.length < 2) return false;
    let bi = 0, bj = 1;
    for (let i = 0; i < per.length; i++) {
      for (let j = i + 1; j < per.length; j++) if (Math.abs(el(per, i)[0] - el(per, j)[0]) > Math.abs(el(per, bi)[0] - el(per, bj)[0])) { bi = i; bj = j; }
    }
    const pi = el(per, bi), pj = el(per, bj);
    if (Math.abs(pi[0] - pj[0]) < 1e-9) return false;
    const sa = subcurba(A, pi[0], pj[0]), sb = subcurba(B, pi[1], pj[1]);
    // Punctele de control la cel mult τ mărginesc abaterea curbelor la τ (învelitoarea convexă), deci garanția de τ rămâne
    // (recenzia 2.7d, constatarea 3: cu 16τ, o lentilă de până la 16τ dispărea).
    for (let k = 0; k < 4; k++) if (dist(el(sa, k), el(sb, k)) > tau) return false;
    st.suprapuneri++;
    for (const [s0, t0] of per) { const s = lipeste(A, s0), t = lipeste(B, t0); if (s !== null && t !== null) eveniment(A, s, B, t); }
    return true;
  };
  const intersecteaza = (X: Prim, Y: Prim): void => {
    const [A, B]: readonly [Prim, Prim] = RANG[X.k] > RANG[Y.k] ? [Y, X] : [X, Y];
    if (A.k === 'L') {
      if (B.k === 'L') LL(A, B);
      else if (B.k === 'A') LA(A, B);
      else LC(A, B);
      return;
    }
    if (A.k === 'A' && B.k === 'A') { AA(A, B); return; }
    if (A.k === 'C' && B.k === 'C' && coincidCubice(A, B)) return;
    generic(A, B, false);
  };
  {
    // Măturarea pe x: doar perechile cu cutiile suprapuse.
    const ord = [...prims].sort((p, q) => p.cutie.minX - q.cutie.minX);
    for (let i = 0; i < ord.length; i++) {
      const A = el(ord, i);
      for (let j = i + 1; j < ord.length; j++) {
        const B = el(ord, j);
        if (B.cutie.minX > A.cutie.maxX) break;
        lucreaza(1);
        if (B.cutie.minY > A.cutie.maxY || B.cutie.maxY < A.cutie.minY) continue;
        if (++buget.perechi > PLAFON_PERECHI) throw new Refuz(`plafon: peste ${PLAFON_PERECHI} de perechi de segmente cu cutiile suprapuse (forma e prea densă)`);
        intersecteaza(A, B);
      }
    }
    for (const P of prims) if (P.k === 'C') generic(P, P, true);
  }

  // ---------- contopirea nodurilor apropiate (sub τ) și muchiile
  {
    // Contopirea e tranzitivă (lanțuri de noduri la cel mult τ unul de altul), dar un ciorchine de k noduri în același
    // punct costă k, nu k² (recenzia 2.7d, constatarea 1: un „soare” de clepsidre ținea firul 41 s, fără buget). Un nod la
    // cel mult τ/4 de un nod din grilă nu mai intră în grilă: îl „acoperă” acela (și e deja unit cu el). Un nod nou se
    // unește cu orice nod din grilă la cel mult τ; la o distanță între τ și 5τ/4 de un nod din grilă, dintr-o altă
    // componentă, se verifică unul câte unul nodurile acoperite de acesta (unul poate fi la cel mult τ); peste 5τ/4,
    // niciunul nu poate fi. Celula de 4τ cuprinde vecinătatea de 5τ/4 în 3 × 3 celule. Comparațiile intră în buget.
    const cel = 4 * tau, grila = new Map<string, number[]>(), acoperite = new Map<number, number[]>();
    for (let i = 0; i < nodPt.length; i++) {
      const p = el(nodPt, i), gx = Math.floor(p.x / cel), gy = Math.floor(p.y / cel);
      let gazda = -1;
      for (let ax = gx - 1; ax <= gx + 1; ax++) {
        for (let ay = gy - 1; ay <= gy + 1; ay++) {
          const l = grila.get(ax + ',' + ay);
          if (!l) continue;
          lucreaza(1 + (l.length >> 2));
          for (const j of l) {
            const d = dist(el(nodPt, j), p);
            if (d <= tau) {
              uneste(i, j);
              if (gazda < 0 && d <= tau / 4) gazda = j;
            } else if (d <= 1.25 * tau && gaseste(i) !== gaseste(j)) {
              const ac = acoperite.get(j) ?? [];
              lucreaza(1 + (ac.length >> 2));
              for (const c of ac) if (dist(el(nodPt, c), p) <= tau) { uneste(i, c); break; }
            }
          }
        }
      }
      if (gazda >= 0) {
        const ac = acoperite.get(gazda);
        if (ac) ac.push(i); else acoperite.set(gazda, [i]);
        continue;
      }
      const k = gx + ',' + gy, l = grila.get(k);
      if (l) l.push(i); else grila.set(k, [i]);
    }
  }
  for (const arr of taieturi) {
    arr.sort((u, v) => u.t - v.t);
    for (let i = 1; i < arr.length; i++) if (el(arr, i).t === el(arr, i - 1).t) uneste(el(arr, i).n, el(arr, i - 1).n);
  }
  const muchii: Muchie[] = [], muchiiContur: Muchie[][] = contururi.map(() => []);
  for (const P of prims) {
    const arr = el(taieturi, P.id).filter((q, i, a) => i === 0 || q.t !== el(a, i - 1).t);
    for (let i = 0; i + 1 < arr.length; i++) {
      const qa = el(arr, i), qb = el(arr, i + 1), na = gaseste(qa.n), nb = gaseste(qb.n);
      if (na === nb && lungimeBucata(P, qa.t, qb.t) <= 8 * tau) { st.muchiiNule++; continue; }
      const e: Muchie = { id: muchii.length, P, ta: qa.t, tb: qb.t, na, nb, cutie: cutieBucata(P, qa.t, qb.t, tAmb), raza: 0, vecin: -1 };
      muchii.push(e);
      el(muchiiContur, P.cj).push(e);
    }
  }
  st.muchii = muchii.length;
  const pt = (n: number): Punct => el(nodPt, gaseste(n));

  // ---------- muchiile comune (aceleași capete, aceeași geometrie) formează un grup
  const grup = muchii.map((e) => e.id);
  const grupul = (i: number): number => {
    let k = i;
    for (;;) {
      const p = el(grup, k);
      if (p === k) return k;
      const g = el(grup, p);
      grup[k] = g;
      k = g;
    }
  };
  {
    const dupa = new Map<string, Muchie[]>();
    for (const e of muchii) {
      const k = Math.min(e.na, e.nb) + ',' + Math.max(e.na, e.nb), l = dupa.get(k);
      if (l) l.push(e); else dupa.set(k, [e]);
    }
    /** Distanța de la X la bucata [lo, hi] a lui P: piciorul perpendicularei (la cubică, din cel mai apropiat eșantion). */
    const laBucata = (P: Prim, X: Punct, lo: number, hi: number): number => {
      if (P.k !== 'C') return proiectie(P, X, lo, lo, hi).d;
      let t0 = lo, d0 = Infinity;
      for (let k = 0; k <= 8; k++) { const t = lo + ((hi - lo) * k) / 8, d = dist(punct(P, t), X); if (d < d0) { d0 = d; t0 = t; } }
      return Math.min(d0, proiectie(P, X, t0, lo, hi).d);
    };
    /**
     * Abaterea maximă a muchiei e față de muchia f: 7 eșantioane, apoi secțiunea de aur în jurul celui mai mare. Peste
     * `prag` se oprește devreme (nu mai contează cât).
     */
    const abatere = (e: Muchie, f: Muchie, prag: number): number => {
      const g = (u: number): number => laBucata(f.P, punct(e.P, e.ta + u * (e.tb - e.ta)), f.ta, f.tb);
      let uMax = 0.5, dMax = -1;
      for (let k = 1; k < 8; k++) {
        lucreaza(2);
        const d = g(k / 8);
        if (d > prag) return d;
        if (d > dMax) { dMax = d; uMax = k / 8; }
      }
      const gr = (Math.sqrt(5) - 1) / 2;
      let a = uMax - 1 / 8, b = uMax + 1 / 8, x1 = b - gr * (b - a), x2 = a + gr * (b - a), g1 = g(x1), g2 = g(x2);
      for (let k = 0; k < 24; k++) {
        if (g1 > g2) { b = x2; x2 = x1; g2 = g1; x1 = b - gr * (b - a); g1 = g(x1); }
        else { a = x1; x1 = x2; g1 = g2; x2 = a + gr * (b - a); g2 = g(x2); }
      }
      lucreaza(12);
      return Math.max(dMax, g1, g2);
    };
    // Două muchii între aceleași noduri sunt comune doar dacă abaterea lor maximă, măsurată în ambele sensuri, e cel mult
    // τ (recenzia 2.7d, constatarea 3: cu 16τ pe trei eșantioane, o lentilă de până la 16τ dispărea tăcut). Altfel lentila
    // dintre ele iese exactă, sau razele o refuză (`nedecis`).
    const aceeasi = (e: Muchie, f: Muchie): boolean => abatere(e, f, tau) <= tau && abatere(f, e, tau) <= tau;
    for (const lista of dupa.values()) {
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          lucreaza(1);
          const e = el(lista, i), f = el(lista, j);
          if ((e.na === f.na || e.na === f.nb) && aceeasi(e, f)) { const a = grupul(e.id), b = grupul(f.id); if (a !== b) grup[b] = a; }
        }
      }
    }
  }
  const membri = new Map<number, Muchie[]>();
  for (const e of muchii) { const g = grupul(e.id), l = membri.get(g); if (l) l.push(e); else membri.set(g, [e]); }
  const membriiLui = (e: Muchie): Muchie[] => membri.get(grupul(e.id)) as Muchie[];

  // ---------- clasificarea: înfășurarea nonzero la stânga și la dreapta, din raze
  const noduriUnice = [...new Set(muchii.flatMap((e) => [e.na, e.nb]))].map((n) => el(nodPt, n));
  /** Parametrii din (lo, hi) unde tangenta lui P e paralelă cu d (bucata e monotonă față de rază între ei). */
  const critici = (P: Prim, d: Punct, lo: number, hi: number): number[] => {
    if (P.k === 'L') return [];
    if (P.k === 'A') return unghiuriPeArc(P, Math.atan2(d.y, d.x) + Math.PI / 2, Math.PI, lo, hi);
    return radaciniPatratica(cr(d.x, d.y, P.d0.x, P.d0.y), cr(d.x, d.y, P.d1.x, P.d1.y), cr(d.x, d.y, P.d2.x, P.d2.y)).filter((t) => t > lo && t < hi);
  };
  const razaCutie = (M: Punct, d: Punct, b: Cutie): boolean => {
    let lo = 0, hi = Infinity;
    for (const [m, v, mn, mx] of [[M.x, d.x, b.minX, b.maxX], [M.y, d.y, b.minY, b.maxY]] as const) {
      if (v === 0) { if (m < mn || m > mx) return false; continue; }
      let t1 = (mn - m) / v, t2 = (mx - m) / v;
      if (t1 > t2) [t1, t2] = [t2, t1];
      lo = Math.max(lo, t1); hi = Math.min(hi, t2);
    }
    return lo <= hi;
  };
  /** Traversările cu semn ale razei M + s·d (s > 0) de către muchia g; null dacă o traversare e prea aproape de M. */
  const traversari = (g: Muchie, M: Punct, d: Punct, sari: number | null): number | null => {
    const P = g.P, ts = [g.ta, ...critici(P, d, g.ta, g.tb)], b = g.cutie;
    let smin = Infinity, smax = -Infinity;
    for (const x of [b.minX, b.maxX]) for (const y of [b.minY, b.maxY]) { const v = (x - M.x) * d.x + (y - M.y) * d.y; smin = Math.min(smin, v); smax = Math.max(smax, v); }
    if (smax <= -tAmb) return 0;
    // Toată muchia e în fața originii: locul traversării nu contează.
    const inainte = sari === null && smin >= tAmb;
    if (sari !== null) ts.push(sari);
    ts.push(g.tb);
    ts.sort((u, v) => u - v);
    const f = (p: Punct): number => cr(d.x, d.y, p.x - M.x, p.y - M.y);
    const pe = (t: number): Punct => (t === g.ta ? pt(g.na) : t === g.tb ? pt(g.nb) : punct(P, t));
    let n = 0, pa = pe(el(ts, 0));
    for (let i = 0; i + 1 < ts.length; i++) {
      const a = el(ts, i), bb = el(ts, i + 1), pb = pe(bb), fa = f(pa) > 0, fb = f(pb) > 0;
      pa = pb;
      if (a === bb || fa === fb || (sari !== null && (a === sari || bb === sari))) continue;
      if (inainte) { n += fb ? 1 : -1; continue; }
      let u = a, v = bb;
      for (let k = 0; k < 200; k++) { const m = (u + v) / 2; if (m === u || m === v) break; if ((f(punct(P, m)) > 0) === fa) u = m; else v = m; }
      const X = punct(P, (u + v) / 2), s = (X.x - M.x) * d.x + (X.y - M.y) * d.y;
      if (s <= -tAmb) continue;
      if (s < tAmb) return null;
      n += fb ? 1 : -1;
    }
    return n;
  };
  // Grila razelor: muchiile (după cutie) și vârfurile (cu marja tAmb) în celule; raza le vizitează pe drum (DDA).
  const grila = (() => {
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for (const e of muchii) { mnx = Math.min(mnx, e.cutie.minX); mny = Math.min(mny, e.cutie.minY); mxx = Math.max(mxx, e.cutie.maxX); mxy = Math.max(mxy, e.cutie.maxY); }
    const G = Math.max(1, Math.min(512, Math.ceil(2 * Math.sqrt(muchii.length)))), w = (mxx - mnx) / G || 1, h = (mxy - mny) / G || 1;
    const cel: Celula[] = Array.from({ length: G * G }, () => ({ m: [], v: [] })), mx = 1e-6 * w, my = 1e-6 * h;
    const ix = (x: number): number => Math.min(G - 1, Math.max(0, Math.floor((x - mnx) / w)));
    const iy = (y: number): number => Math.min(G - 1, Math.max(0, Math.floor((y - mny) / h)));
    const vizita = (b: Cutie, f: (c: Celula) => boolean | void): boolean => {
      for (let j = iy(b.minY - my); j <= iy(b.maxY + my); j++) for (let i = ix(b.minX - mx); i <= ix(b.maxX + mx); i++) if (f(el(cel, j * G + i)) === true) return true;
      return false;
    };
    for (const e of muchii) vizita(e.cutie, (c) => { c.m.push(e); });
    for (const V of noduriUnice) vizita({ minX: V.x - tAmb, minY: V.y - tAmb, maxX: V.x + tAmb, maxY: V.y + tAmb }, (c) => { c.v.push(V); });
    /** Câte celule străbate raza M + s·d până iese din grilă: costul ei, aproximativ. */
    const cost = (M: Punct, d: Punct): number => {
      const sx = d.x > 0 ? (mxx - M.x) / d.x : d.x < 0 ? (mnx - M.x) / d.x : Infinity;
      const sy = d.y > 0 ? (mxy - M.y) / d.y : d.y < 0 ? (mny - M.y) / d.y : Infinity;
      const s = Math.max(0, Math.min(sx, sy));
      return s * (Math.abs(d.x) / w + Math.abs(d.y) / h);
    };
    return { G, mnx, mny, w, h, cel, ix, iy, vizita, cost };
  })();
  let razaId = 0;
  /** Înfășurarea în M + 0·d, din raza M + s·d; null dacă raza e ambiguă (trece pe lângă un vârf, traversare la origine). */
  const infasurare = (d: Punct, M: Punct, sari: ReadonlyMap<Muchie, number>): number | null => {
    const { G, mnx, mny, w, h, cel, ix, iy } = grila, id = ++razaId;
    const sx = Math.sign(d.x), sy = Math.sign(d.y);
    if (!sx && !sy) return null;
    let i = ix(M.x), j = iy(M.y), wtot = 0;
    let tx = sx ? (mnx + (i + (sx > 0 ? 1 : 0)) * w - M.x) / d.x : Infinity, ty = sy ? (mny + (j + (sy > 0 ? 1 : 0)) * h - M.y) / d.y : Infinity;
    const dx = sx ? w / Math.abs(d.x) : Infinity, dy = sy ? h / Math.abs(d.y) : Infinity;
    while (i >= 0 && i < G && j >= 0 && j < G) {
      const c = el(cel, j * G + i);
      // O celulă: 1, plus un sfert pentru fiecare vârf și muchie din ea (testul de duplicat e de ~4 ori mai ieftin).
      lucreaza(1 + ((c.v.length + c.m.length) >> 2));
      for (const V of c.v) {
        const rx = V.x - M.x, ry = V.y - M.y;
        if (rx * d.x + ry * d.y > -tAmb && Math.abs(cr(d.x, d.y, rx, ry)) < tAmb) return null;
      }
      for (const g of c.m) {
        if (g.raza === id) continue;
        g.raza = id;
        if (!razaCutie(M, d, g.cutie)) continue;
        lucreaza(4);
        const k = traversari(g, M, d, sari.get(g) ?? null);
        if (k === null) return null;
        wtot += k;
      }
      if (tx < ty) { i += sx; tx += dx; } else { j += sy; ty += dy; }
    }
    return wtot;
  };
  /**
   * Punctul de la fracția u a muchiei e, multiplicitatea cu semn a grupului de muchii comune și razele spre stânga
   * (semn 1) și spre dreapta (semn −1): direcțiile din `UNGHIURI_RAZE` față de normală, cele mai scurte întâi (o rază
   * costă celulele grilei pe care le străbate până iese).
   */
  const pregateste = (e: Muchie, u: number) => {
    const grp = membriiLui(e), tm = e.ta + u * (e.tb - e.ta), M = punct(e.P, tm);
    let T = derivata(e.P, tm);
    if (Math.hypot(T.x, T.y) === 0) T = derivata2(e.P, tm);
    const lt = Math.hypot(T.x, T.y);
    if (!(lt > 0) || !Number.isFinite(lt)) throw new Refuz(`nedecis: muchia de lângă ${loc(M)} n-are direcție`);
    const n0 = { x: -T.y / lt, y: T.x / lt };
    let mult = 0;
    const sari = new Map<Muchie, number>();
    for (const f of grp) {
      let acelasi = f === e;
      if (!acelasi) {
        if (e.na !== e.nb) acelasi = f.na === e.na;
        else {
          // O buclă (capetele în același nod): sensul lui f, din punctul lui f cel mai apropiat de M (la u sau la 1 − u).
          const tu = f.ta + u * (f.tb - f.ta), tv = f.ta + (1 - u) * (f.tb - f.ta);
          const d = derivata(f.P, dist(punct(f.P, tu), M) <= dist(punct(f.P, tv), M) ? tu : tv);
          acelasi = d.x * T.x + d.y * T.y > 0;
        }
      }
      mult += acelasi ? 1 : -1;
      sari.set(f, f.ta + (acelasi ? u : 1 - u) * (f.tb - f.ta));
    }
    const directii = (semn: 1 | -1): Punct[] => UNGHIURI_RAZE
      .map((fi) => { const c = Math.cos(fi), s = Math.sin(fi); return { x: semn * (c * n0.x - s * n0.y), y: semn * (s * n0.x + c * n0.y) }; })
      .map((d) => ({ d, k: grila.cost(M, d) }))
      .sort((a, b) => a.k - b.k)
      .map((q) => q.d);
    const raza = (d: Punct): number | null => {
      st.raze++;
      return infasurare(d, M, sari);
    };
    return { M, mult, raza, stanga: directii(1), dreapta: directii(-1) };
  };
  /**
   * Înfășurarea la stânga și la dreapta punctului de la fracția u a muchiei e. Stânga: prima valoare dată de două raze.
   * Dreapta (autoverificarea, prototipul B): măsurată separat, trebuie să fie stânga minus contribuția muchiilor comune.
   */
  const clasificaLa = (e: Muchie, u: number): Decizie => {
    const { M, mult, raza, stanga, dreapta } = pregateste(e, u);
    let wL: number | null = null;
    const valori: number[] = [];
    for (const d of stanga) {
      const w = raza(d);
      if (w === null) continue;
      if (valori.includes(w)) { wL = w; break; }
      valori.push(w);
    }
    if (wL === null) throw new Refuz(`nedecis: muchia de lângă ${loc(M)}: înfășurarea nu se poate decide (curbe aproape suprapuse sau tangente)`);
    const wR = wL - mult, alte: number[] = [];
    for (const d of dreapta) {
      const w = raza(d);
      if (w === null) continue;
      if (w === wR) return { wL, wR, ref: e, dinRaza: u === 0.5, pastrat: false };
      if (alte.includes(w)) {
        throw new Refuz(`autoverificare: muchia de lângă ${loc(M)}: înfășurarea e ${wL} la stânga și ${w} la dreapta, dar muchiile comune contribuie cu ${mult}`);
      }
      alte.push(w);
    }
    throw new Refuz(`nedecis: muchia de lângă ${loc(M)}: înfășurarea din dreapta nu se poate decide (curbe aproape suprapuse sau tangente)`);
  };
  const decizie = new Map<number, Decizie>();
  const decizia = (e: Muchie): Decizie => decizie.get(grupul(e.id)) as Decizie;
  const clasifica = (e: Muchie): Decizie => {
    const g = grupul(e.id), d = decizie.get(g);
    if (d) return d;
    const r = clasificaLa(e, 0.5);
    decizie.set(g, r);
    return r;
  };
  // Propagarea de-a lungul conturului: printr-un vârf de grad 2 înfășurarea nu se schimbă; printr-o încrucișare simplă
  // (4 capete, cealaltă curbă trece transversal) scade cu sigma = +1 dacă cealaltă curbă trece din dreapta în stânga.
  // Altfel (tangențe, muchii comune, vârfuri multiple) o rază nouă. Închiderea conturului și o rază de control verifică.
  const comuna = (e: Muchie): boolean => membriiLui(e).length > 1;
  const laNod = new Map<number, Capat[]>(), urm = new Map<Muchie, Muchie>();
  for (const e of muchii) {
    for (const [v, iese] of [[e.na, true], [e.nb, false]] as const) { const l = laNod.get(v); if (l) l.push({ e, iese }); else laNod.set(v, [{ e, iese }]); }
  }
  for (const E of muchiiContur) E.forEach((e, k) => urm.set(e, el(E, (k + 1) % E.length)));
  const dir = (P: Prim, t: number, sens: number): number | null => {
    const d = derivata(P, t);
    let x = d.x * sens, y = d.y * sens;
    if (Math.hypot(x, y) === 0) { const d2 = derivata2(P, t); x = d2.x; y = d2.y; if (Math.hypot(x, y) === 0) return null; }
    return Math.atan2(y, x);
  };
  const ccw = (a: number, b: number): number => { let d = (b - a) % DOI_PI; if (d < 0) d += DOI_PI; return d; };
  const sigma = (e: Muchie, nx: Muchie): number | null => {
    const L = laNod.get(e.nb) ?? [];
    if (L.length === 2) return 0;
    if (L.length !== 4) return null;
    const alt = L.filter((c) => c.e !== e && c.e !== nx);
    if (alt.length !== 2 || el(alt, 0).iese === el(alt, 1).iese) return null;
    const f = (alt.find((c) => !c.iese) as Capat).e, g = (alt.find((c) => c.iese) as Capat).e;
    if (urm.get(f) !== g || comuna(f) || comuna(g)) return null;
    const a1 = dir(e.P, e.tb, -1), a2 = dir(nx.P, nx.ta, 1), b1 = dir(f.P, f.tb, -1), b2 = dir(g.P, g.ta, 1);
    if (a1 === null || a2 === null || b1 === null || b2 === null) return null;
    const u = [a1, a2, b1, b2];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (Math.min(ccw(el(u, i), el(u, j)), ccw(el(u, j), el(u, i))) < 1e-6) return null;
    const stanga = (x: number): boolean => ccw(a2, x) < ccw(a2, a1);
    // Atingere, nu încrucișare.
    if (stanga(b1) === stanga(b2)) return null;
    return stanga(b2) ? 1 : -1;
  };
  for (const E of muchiiContur) {
    const E0 = E[0];
    if (!E0) continue;
    let r = clasifica(E0), netrivial = false;
    const propagate: Muchie[] = [];
    for (let k = 1; k <= E.length; k++) {
      const e = el(E, k - 1), nx = el(E, k % E.length);
      const sg = comuna(e) || comuna(nx) ? null : sigma(e, nx);
      if (k === E.length) {
        if (sg !== null) {
          const d0 = decizia(nx);
          if (r.wL - sg !== d0.wL || r.wR - sg !== d0.wR) throw new Refuz(`inchidere: subcalea ${e.P.ci}: propagarea înfășurării nu se închide`);
        }
        break;
      }
      if (sg === null) r = clasifica(nx);
      else {
        r = { wL: r.wL - sg, wR: r.wR - sg, ref: nx, dinRaza: false, pastrat: false };
        decizie.set(grupul(nx.id), r);
        if (sg) netrivial = true;
        if (netrivial) propagate.push(nx);
      }
    }
    // Rază de control, dacă propagarea a trecut prin încrucișări.
    const q = propagate[propagate.length >> 1];
    if (q) {
      const g = grupul(q.id), v = decizie.get(g) as Decizie;
      decizie.delete(g);
      const w = clasifica(q);
      if (w.wL !== v.wL || w.wR !== v.wR) throw new Refuz(`control: subcalea ${q.P.ci}: propagarea și raza de control nu se potrivesc lângă ${loc(punct(q.P, (q.ta + q.tb) / 2))}`);
    }
  }

  // ---------- garda sferturilor: o muchie care se apropie de alta (cutiile se suprapun, fără capăt comun) se verifică la
  // 1/4 și 3/4 (și la 1/2, dacă decizia ei e propagată); o înfășurare care se schimbă de-a lungul muchiei = o încrucișare
  // ratată → refuz, nu geometrie greșită.
  // Muchiile cu risc se caută prin grila razelor (fără plafon care s-o oprească); costul intră în bugetul de lucru.
  {
    const cuVecin = (e: Muchie): boolean => {
      const b = e.cutie;
      return grila.vizita(b, (c) => {
        lucreaza(1 + (c.m.length >> 2));
        for (const f of c.m) {
          if (f === e || f.vecin === e.id) continue;
          f.vecin = e.id;
          if (f.cutie.minX > b.maxX || f.cutie.maxX < b.minX || f.cutie.minY > b.maxY || f.cutie.maxY < b.minY) continue;
          if (f.na === e.na || f.na === e.nb || f.nb === e.na || f.nb === e.nb) continue;
          return true;
        }
        return false;
      });
    };
    for (const g of membri.keys()) {
      const r = decizie.get(g) as Decizie, e = r.ref;
      if (!cuVecin(e)) continue;
      // O decizie propagată se verifică și la mijloc: două încrucișări ratate în jumătatea din mijloc a muchiei (recenzia
      // 2.7d, constatarea 0) schimbă înfășurarea acolo, deci ies refuz, nu geometrie greșită.
      for (const u of r.dinRaza ? [0.25, 0.75] : [0.25, 0.5, 0.75]) {
        st.sferturi++;
        // Întâi cea mai scurtă rază spre stânga: o încrucișare ratată schimbă înfășurarea de pe ambele părți, deci o
        // parte ajunge. Numai dacă raza nu confirmă (sau e ambiguă), clasificarea completă: două raze + autoverificarea.
        const { raza, stanga } = pregateste(e, u);
        if (raza(el(stanga, 0)) === r.wL) continue;
        const q = clasificaLa(e, u);
        if (q.wL !== r.wL || q.wR !== r.wR) {
          throw new Refuz(`sfert: muchia de lângă ${loc(punct(e.P, e.ta + u * (e.tb - e.ta)))}: înfășurarea se schimbă de-a lungul ei (o încrucișare ratată, curbe aproape suprapuse)`);
        }
      }
    }
  }

  let toatePastrate = true, faraComune = true;
  for (const [g, m] of membri) {
    const r = decizie.get(g) as Decizie;
    r.pastrat = plin(r.wL) !== plin(r.wR);
    if (!r.pastrat) toatePastrate = false;
    if (m.length > 1) faraComune = false;
  }

  // ---------- muchiile păstrate, orientate cu plinul în stânga, legate în contururi; apoi vârfurile
  const emite = (): Varf[][] => {
    const iesiri = new Map<number, Orientata[]>(), intrari = new Map<number, Orientata[]>(), orientate: Orientata[] = [];
    for (const g of membri.keys()) {
      const r = decizie.get(g) as Decizie;
      if (!r.pastrat) continue;
      const e = r.ref, fata = plin(r.wL), id = orientate.length;
      const o: Orientata = fata ? { id, P: e.P, ta: e.ta, tb: e.tb, na: e.na, nb: e.nb } : { id, P: e.P, ta: e.tb, tb: e.ta, na: e.nb, nb: e.na };
      orientate.push(o);
      const li = iesiri.get(o.na); if (li) li.push(o); else iesiri.set(o.na, [o]);
      const lo = intrari.get(o.nb); if (lo) lo.push(o); else intrari.set(o.nb, [o]);
    }
    st.pastrate = orientate.length;
    const urmator: Array<Orientata | null> = orientate.map(() => null);
    /** Direcția de plecare din vârf, în (−π, π], cu −π adus la π (aceeași direcție nu se desparte la capetele sortării). */
    const unghi = (P: Prim, t: number, sens: number): number => {
      const d = derivata(P, t);
      let x = d.x * sens, y = d.y * sens;
      if (Math.hypot(x, y) === 0) { const d2 = derivata2(P, t); x = d2.x; y = d2.y; }
      const a = Math.atan2(y, x);
      return a <= -Math.PI + 1e-12 ? a + 2 * Math.PI : a;
    };
    /**
     * La tangente egale, curbura cu semn a ramurii în sensul plecării din vârf, κ = cr(d1·sens, d2) / |d1|³: mai mare = se
     * întoarce mai mult spre stânga, deci vine întâi în sens orar. Secanta la un pas fix de parametru (prototipul) dădea
     * aceeași valoare la arce cu același baleiaj și raze diferite, iar ordinea ieșea din rotunjire (recenzia 2.7d,
     * constatarea 2: contururi care se taie în vârf).
     */
    const curbura = (P: Prim, t: number, sens: number): number => {
      const d1 = derivata(P, t), d2 = derivata2(P, t), x = d1.x * sens, y = d1.y * sens, l = Math.hypot(x, y);
      return l > 0 ? cr(x, y, d2.x, d2.y) / (l * l * l) : 0;
    };
    const secanta = (P: Prim, t: number, t2: number): number => { const a = punct(P, t), b = punct(P, t + 1e-4 * (t2 - t)); return Math.atan2(b.y - a.y, b.x - a.x); };
    for (const [v, outs] of iesiri) {
      const ins = intrari.get(v) ?? [];
      if (ins.length !== outs.length) throw new Refuz(`topologie: vârful ${loc(el(nodPt, v))} are ${ins.length} intrări și ${outs.length} ieșiri`);
      if (outs.length === 1) { urmator[el(ins, 0).id] = el(outs, 0); continue; }
      // La un vârf cu mai multe ieșiri: din fiecare intrare, prima ieșire liberă în sens orar.
      const capat = (o: Orientata, iese: boolean) => {
        const t = iese ? o.ta : o.tb, t2 = iese ? o.tb : o.ta, sens = Math.sign(t2 - t);
        return { o, iese, a: unghi(o.P, t, sens), k: curbura(o.P, t, sens), b: secanta(o.P, t, t2) };
      };
      const capete = [...outs.map((o) => capat(o, true)), ...ins.map((o) => capat(o, false))]
        .sort((p, q) => (Math.abs(p.a - q.a) > 1e-9 ? q.a - p.a : p.k !== q.k ? q.k - p.k : q.b - p.b));
      const luat = new Set<Orientata>();
      capete.forEach((c, i) => {
        if (c.iese) return;
        for (let k = 1; k < capete.length; k++) {
          const q = el(capete, (i + k) % capete.length);
          if (q.iese && !luat.has(q.o)) { luat.add(q.o); urmator[c.o.id] = q.o; return; }
        }
      });
    }
    for (const [v, ins] of intrari) if (!iesiri.has(v)) throw new Refuz(`topologie: vârful ${loc(el(nodPt, v))} are ${ins.length} intrări și nicio ieșire`);
    const vizitat = orientate.map(() => false), cicluri: Orientata[][] = [];
    for (const o0 of orientate) {
      if (vizitat[o0.id]) continue;
      const c: Orientata[] = [];
      for (let o: Orientata | null = o0; ; o = urmator[o.id] ?? null) {
        if (!o) throw new Refuz('topologie: un contur nu se închide');
        if (vizitat[o.id]) { if (o !== o0) throw new Refuz('topologie: un contur nu se închide'); break; }
        vizitat[o.id] = true;
        c.push(o);
      }
      // Un ciclu care trece de două ori prin același vârf (o gaură care atinge exteriorul, două frontiere tangente) se
      // taie acolo în bucle simple: aceleași muchii, deci aceeași regiune, iar frontierele care se ating ies contururi
      // separate, care nu se taie (recenzia 2.7d, constatarea 2: CAM-ul refuza decalarea conturului legat).
      const stiva: Orientata[] = [], poz = new Map<number, number>();
      for (const o of c) {
        const k = poz.get(o.na);
        if (k !== undefined) {
          const bucla = stiva.splice(k);
          for (const x of bucla) poz.delete(x.na);
          cicluri.push(bucla);
        }
        poz.set(o.na, stiva.length);
        stiva.push(o);
      }
      cicluri.push(stiva);
    }
    // Bucățile vecine din aceeași primitivă se lipesc la loc; segmentul se scrie din sursă.
    type Bucata = { readonly P: Prim; readonly ta: number; tb: number; readonly p: Punct };
    const continua = (a: { readonly P: Prim; readonly ta: number; readonly tb: number }, b: Orientata): boolean =>
      a.P === b.P && a.tb === b.ta && Math.sign(a.tb - a.ta) === Math.sign(b.tb - b.ta);
    const segment = (P: Prim, ta: number, tb: number): Segment => {
      if (P.k === 'L') return { tip: 'L' };
      if (P.k === 'A') {
        if (ta === 0 && tb === 1) return { tip: 'A', bulge: P.bulge };
        if (ta === 1 && tb === 0) return { tip: 'A', bulge: -P.bulge };
        return { tip: 'A', bulge: Math.tan((P.sw * (tb - ta)) / 4) };
      }
      if (ta === 0 && tb === 1) return { tip: 'C', c1: P.c1, c2: P.c2 };
      if (ta === 1 && tb === 0) return { tip: 'C', c1: P.c2, c2: P.c1 };
      return { tip: 'C', c1: blossom(P, ta, ta, tb), c2: blossom(P, ta, tb, tb) };
    };
    const iesire: Varf[][] = [];
    for (const c of cicluri) {
      const k0 = c.findIndex((o, i) => !continua(el(c, (i - 1 + c.length) % c.length), o));
      const bucati: Bucata[] = [];
      if (k0 < 0) {
        // O singură primitivă, închisă în ea însăși: se împarte în două.
        const o = el(c, 0), last = el(c, c.length - 1), m = (o.ta + last.tb) / 2;
        bucati.push({ P: o.P, ta: o.ta, tb: m, p: pt(o.na) }, { P: o.P, ta: m, tb: last.tb, p: punct(o.P, m) });
      } else {
        for (let i = 0; i < c.length; i++) {
          const o = el(c, (k0 + i) % c.length), b = bucati[bucati.length - 1];
          if (b && i > 0 && continua(b, o)) b.tb = o.tb;
          else bucati.push({ P: o.P, ta: o.ta, tb: o.tb, p: pt(o.na) });
        }
      }
      const b0 = bucati[0];
      if (bucati.length === 1 && b0) {
        // Un contur dintr-o singură bucată (bucla unei cubice): se taie la mijlocul parametrului, ca să aibă două vârfuri.
        const m = (b0.ta + b0.tb) / 2;
        bucati.splice(0, 1, { P: b0.P, ta: b0.ta, tb: m, p: b0.p }, { P: b0.P, ta: m, tb: b0.tb, p: punct(b0.P, m) });
      }
      iesire.push(bucati.map((b) => ({ p: b.p, s: segment(b.P, b.ta, b.tb) })));
    }
    return iesire;
  };

  return { neschimbat: toatePastrate && faraComune, st, emite };
}
