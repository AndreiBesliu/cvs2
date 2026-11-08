/**
 * Geometria straturilor unei piese plate (ADR 0191 §A; modelele, cusătura și călcarea, felia 3.6k): piesa e o prismă, deci un
 * strat diferă de altul doar prin rol, unghi și, la modelele 3D (cubic, giroid, hașura în cruce), prin Z. Se calculează o dată
 * fiecare fel de strat folosit (cheia lui, `felDe`), ca un șablon: căile în ordinea imprimării, insulă cu insulă, ca OrcaSlicer
 * (pereții interiori, cel exterior, apoi umplerea), cu călcarea la sfârșitul piesei.
 *
 * - Pereții: inele spre interior (`offsetFigura`, pe contururile cu arce), la pasul liniilor (`pas`): primul la w/2 de
 *   margine, al doilea la (pasul exterior + pasul interior) / 2 după el, restul la pasul interior. Pe primul strat, toate cu
 *   lățimea primului strat, plus compensarea „piciorului de elefant”. Fiecare buclă ține grupul ei (exteriorul unei insule sau
 *   un gol) și adâncimea, pentru cusătură.
 * - Cusătura (`seam_position`): bucla exterioară a grupului pornește din colțul ales (aliniat: cel mai ascuns, după unghiul
 *   colțului, ca `SeamPlacer`; aliniat în spate: la fel, cu fața din față penalizată; în spate: cel mai din spate; cea mai
 *   apropiată și aleatoare se aleg la scriere, după duză și după strat); pereții dinăuntru pornesc din proiecția ei, decalați
 *   înainte cu adâncimea lor (`staggered_inner_seams`).
 * - Umplerea: după model (`linii.ts`, `modele.ts`): liniile aliniate la pat (aceleași poziții pe fiecare strat și în fiecare
 *   insulă), tăiate par-impar de regiunea dinăuntrul pereților (lărgită peste ei cu suprapunerea).
 * - Călcarea: o trecere cu debit mic peste fața de sus (sau peste toate straturile pline), la marginea dată de contur.
 * - Treptele (felia 3.6l): fiecare bandă (`trepte.ts`) are pereții ei; pe un strat unde o treaptă se termină, umplerea se
 *   împarte pe părți (suprafața de sus a treptei, plinul de sub fața de sus, umplerea rară), fiecare în regiunea ei.
 */
import type { Contur } from '../../geom/conturBaza.ts';
import { arieCuSemn } from '../../geom/contur.ts';
import { inRegiune } from '../../geom/distanta.ts';
import { offsetFigura, type Regiune } from '../../geom/offset.ts';
import { anvelopa, arie, intervale, lungime, monoton, ordoneaza, puncte, zigzag, type Cale, type Rol } from './linii.ts';
import { citesteFel, type BenziFel, type FelStrat, type TipStrat } from './fel.ts';
import { crosshatch, curba, fagure, giroid, oscilante } from './modele.ts';
import { ARIE_FILAMENT, K1C, pas, sectiune, type Cusatura, type ModelPlin, type ModelRar, type SetariFeliere } from './profil.ts';
import { arieFigura, combina, regiuniDin, type Termen } from './trepte.ts';

export { arie, intervale, ordoneaza, puncte, SAGEATA, zigzag, type Cale, type Rol } from './linii.ts';
export { bandaFel, citesteFel, DEPINDE_DE_Z, felDe, unghiModel, type FelStrat, type TipStrat } from './fel.ts';

/** Sub atâta arie (mm²), umplerea rară a unei insule devine plină (`minimum_sparse_infill_area`). */
export const ARIE_MINIMA_RARA = 15;

/** Regiunile la distanța `d` spre interior (`d` < 0: spre exterior), sau [] dacă nu mai încape nimic, sau motivul. */
function laDistanta(c: readonly Contur[], d: number): Regiune[] | string {
  if (c.length === 0) return [];
  const r = offsetFigura(c, -d);
  if (r.ok) return [...r.regiuni];
  return r.motiv.startsWith('scula nu încape') ? [] : r.motiv;
}

const contururiDin = (r: readonly Regiune[]): Contur[] => r.flatMap((x) => [x.exterior, ...x.gauri]);
/** Aria regiunilor (exterioarele, minus golurile lor). */
const arieRegiuni = (r: readonly Regiune[]): number => r.reduce((a, g) => a + Math.abs(arieCuSemn(g.exterior)) - g.gauri.reduce((b, x) => b + Math.abs(arieCuSemn(x)), 0), 0);

// ---------------------------------------------------------------------------------------------------------------------------
// Cusătura

/** Funcția lui `SeamPlacer` (`gauss`): mean_value · (e^(1 / (falloff · (v − mean)² + 1)) − 1) / (e − 1). */
const gauss = (v: number, medie: number, valoare: number, cadere: number): number => {
  const s = v - medie;
  return (valoare * (Math.exp(1 / (cadere * s * s + 1)) - 1)) / (Math.E - 1);
};
/** Penalizarea unui colț (`compute_angle_penalty`): mică la colțurile concave ale materialului, mare pe o latură dreaptă. */
export const penalizareColt = (a: number): number => gauss(a, 0, 1, 3) + 1 / (2 + Math.exp(-a));

/** Unghiul de întoarcere la vârful i al buclei, cu semnul materialului: pozitiv la un colț convex al lui, negativ la unul concav. */
function unghiVarf(p: ArrayLike<number>, i: number, semn: number): number {
  const n = p.length / 2, a = (i + n - 1) % n, b = (i + 1) % n;
  const e1x = p[2 * i]! - p[2 * a]!, e1y = p[2 * i + 1]! - p[2 * a + 1]!, e2x = p[2 * b]! - p[2 * i]!, e2y = p[2 * b + 1]! - p[2 * i + 1]!;
  return semn * Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y);
}

/** Semnul materialului pentru o buclă: exteriorul îl are înăuntru (sensul trigonometric pozitiv), golul, în afară. */
const semnMaterial = (p: ArrayLike<number>, gaura: boolean): number => (arie(p) >= 0 ? 1 : -1) * (gaura ? -1 : 1);

/** Normala spre exteriorul materialului la vârful i (media normalelor laturilor alăturate). */
function normalaVarf(p: ArrayLike<number>, i: number, semn: number): [number, number] {
  const n = p.length / 2, a = (i + n - 1) % n, b = (i + 1) % n;
  let nx = 0, ny = 0;
  for (const [u, v] of [[a, i], [i, b]] as const) {
    const ex = p[2 * v]! - p[2 * u]!, ey = p[2 * v + 1]! - p[2 * u + 1]!, l = Math.hypot(ex, ey) || 1;
    // Cu materialul la stânga (semn > 0), exteriorul e la dreapta laturii.
    nx += (semn * ey) / l; ny += (-semn * ex) / l;
  }
  const l = Math.hypot(nx, ny) || 1;
  return [nx / l, ny / l];
}

/** Indicele vârfului de cusătură al unei bucle, după un mod care nu depinde de duză sau de strat. */
export function cusaturaStatica(p: ArrayLike<number>, gaura: boolean, mod: Exclude<Cusatura, 'nearest' | 'random'>): number {
  const semn = semnMaterial(p, gaura), n = p.length / 2;
  let best = 0, bp = Infinity;
  for (let i = 0; i < n; i++) {
    let pen = 0.6 * penalizareColt(unghiVarf(p, i, semn));
    if (mod === 'aligned_back') { const [, ny] = normalaVarf(p, i, semn); pen += Math.min(1, Math.max(0, (-ny + 1.2) * 0.5)); }
    if (mod === 'back') {
      const dy = p[2 * i + 1]! - p[2 * best + 1]!;
      if (i === 0 || dy > 1e-9 || (Math.abs(dy) <= 1e-9 && (pen < bp - 1e-9 || (Math.abs(pen - bp) <= 1e-9 && p[2 * i]! < p[2 * best]!)))) { best = i; bp = pen; }
      continue;
    }
    const dy = p[2 * i + 1]! - p[2 * best + 1]!;
    if (pen < bp - 1e-9 || (Math.abs(pen - bp) <= 1e-9 && (dy > 1e-9 || (Math.abs(dy) <= 1e-9 && p[2 * i]! < p[2 * best]!)))) { best = i; bp = pen; }
  }
  return best;
}

/** Vârful de cusătură cel mai apropiat de duză (`spNearest`): unghiul colțului, cu importanța 1, plus depărtarea. */
export function cusaturaApropiata(p: ArrayLike<number>, gaura: boolean, x: number, y: number): number {
  const semn = semnMaterial(p, gaura), n = p.length / 2;
  let best = 0, bp = Infinity;
  for (let i = 0; i < n; i++) {
    const pen = penalizareColt(unghiVarf(p, i, semn)) + 1 - gauss(Math.hypot(p[2 * i]! - x, p[2 * i + 1]! - y), 0, 1, 0.005);
    if (pen < bp - 1e-12) { best = i; bp = pen; }
  }
  return best;
}

/**
 * Cusătura aleatoare (`spRandom`): un punct ales uniform pe lungimea buclei, cu numărul pseudo-aleator al lui `SeamPlacer`
 * (|sin(x · 12,9898 + y · 78,233 + z · 133,3333)| · 43758,5453, partea fracționară), din primul vârf și Z-ul stratului.
 */
export function cusaturaAleatoare(p: ArrayLike<number>, z: number): { i: number; x: number; y: number } {
  let r = Math.abs(Math.sin(p[0]! * 12.9898 + p[1]! * 78.233 + z * 133.3333)) * 43758.5453;
  r -= Math.floor(r);
  const n = p.length / 2;
  let total = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; total += Math.hypot(p[2 * j]! - p[2 * i]!, p[2 * j + 1]! - p[2 * i + 1]!); }
  let rest = r * total;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, L = Math.hypot(p[2 * j]! - p[2 * i]!, p[2 * j + 1]! - p[2 * i + 1]!);
    if (rest <= L || i === n - 1) { const t = L > 0 ? Math.min(1, rest / L) : 0; return { i, x: p[2 * i]! + (p[2 * j]! - p[2 * i]!) * t, y: p[2 * i + 1]! + (p[2 * j + 1]! - p[2 * i + 1]!) * t }; }
    rest -= L;
  }
  return { i: 0, x: p[0]!, y: p[1]! };
}

/** Bucla, pornită din punctul (x, y) aflat pe latura i (de la vârful i la următorul); un punct într-un vârf nu se dublează. */
export function pornesteDin(p: ArrayLike<number>, i: number, x: number, y: number): Float64Array {
  const n = p.length / 2, r: number[] = [x, y];
  const j = (i + 1) % n;
  const inVarf = (k: number): boolean => Math.hypot(p[2 * k]! - x, p[2 * k + 1]! - y) < 1e-9;
  const start = inVarf(i) ? i : j;
  for (let k = 0; k < n; k++) {
    const v = (start + k) % n;
    if (k === 0 && inVarf(v)) continue;
    r.push(p[2 * v]!, p[2 * v + 1]!);
  }
  return Float64Array.from(r);
}

/** Cel mai apropiat punct al buclei de (x, y): latura și piciorul perpendicularei. */
export function proiectie(p: ArrayLike<number>, x: number, y: number): { i: number; x: number; y: number; d: number } {
  const n = p.length / 2;
  let best = { i: 0, x: p[0]!, y: p[1]!, d: Infinity };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = p[2 * i]!, ay = p[2 * i + 1]!, ex = p[2 * j]! - ax, ey = p[2 * j + 1]! - ay;
    const l2 = ex * ex + ey * ey, t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    const qx = ax + ex * t, qy = ay + ey * t, d = Math.hypot(qx - x, qy - y);
    if (d < best.d - 1e-12) best = { i, x: qx, y: qy, d };
  }
  return best;
}

/** Punctul la distanța `dist` înainte pe buclă (în sensul ei), de la punctul (x, y) aflat pe latura i. */
export function inainte(p: ArrayLike<number>, i: number, x: number, y: number, dist: number): { i: number; x: number; y: number } {
  const n = p.length / 2;
  let rest = dist, cx = x, cy = y, k = i;
  for (let pas = 0; pas < n + 1; pas++) {
    const j = (k + 1) % n, L = Math.hypot(p[2 * j]! - cx, p[2 * j + 1]! - cy);
    if (rest <= L) { const t = L > 0 ? rest / L : 0; return { i: k, x: cx + (p[2 * j]! - cx) * t, y: cy + (p[2 * j + 1]! - cy) * t }; }
    rest -= L; cx = p[2 * j]!; cy = p[2 * j + 1]!; k = j;
  }
  return { i: k, x: cx, y: cy };
}

/**
 * Buclele unui grup, pornite din cusătura S a buclei exterioare: aceasta din S, fiecare perete dinăuntru din proiecția lui S pe
 * ea, decalată înainte cu adâncimea ei (cel puțin lățimea liniei) dacă `decalate`.
 */
export function cuCusatura(c: Cale, S: { readonly x: number; readonly y: number; readonly i?: number }, decalate: boolean): Cale {
  if ((c.adancime ?? 0) === 0 && S.i !== undefined) return { ...c, p: pornesteDin(c.p, S.i, S.x, S.y) };
  const f = proiectie(c.p, S.x, S.y);
  if ((c.adancime ?? 0) === 0 || !decalate) return { ...c, p: pornesteDin(c.p, f.i, f.x, f.y) };
  const q = inainte(c.p, f.i, f.x, f.y, Math.max(c.w, f.d));
  return { ...c, p: pornesteDin(c.p, q.i, q.x, q.y) };
}

/** Bucla pornită din vârful ei cel mai din spate (y cel mai mare, apoi x cel mai mic): brim-ul. */
function dinSpate(p: number[]): Float64Array {
  let k = 0;
  for (let i = 2; i < p.length; i += 2) if (p[i + 1]! > p[k + 1]! + 1e-9 || (Math.abs(p[i + 1]! - p[k + 1]!) <= 1e-9 && p[i]! < p[k]!)) k = i;
  return Float64Array.from([...p.slice(k), ...p.slice(0, k)]);
}

const distantaLaBucla = (x: number, y: number, p: ArrayLike<number>): number => proiectie(p, x, y).d;

// ---------------------------------------------------------------------------------------------------------------------------
// Șablonul

/** Șablonul unei piese: căile fiecărui fel de strat, conturul (pentru deplasări și previzualizare) și ce nu iese. */
export type SablonPiesa = {
  readonly fel: ReadonlyMap<FelStrat, readonly Cale[]>;
  /** Felul fiecărui strat, de la primul: câte straturi are piesa. */
  readonly ordine: readonly FelStrat[];
  /** Conturul piesei, aplatizat: poligoanele par-impar. */
  readonly contur: readonly Float64Array[];
  /** Conturul fiecărei benzi (prima, chiar `contur`): pe el se judecă o deplasare peste gol (`bandaFel`). */
  readonly benzi: readonly (readonly Float64Array[])[];
  /** Aria piesei și cea care nu iese (mai îngustă decât o linie, pe cea mai rea bandă), mm². */
  readonly arie: number; readonly subtire: number;
};

type Insula = { readonly ext: Contur; readonly cont: readonly Contur[] };

/**
 * Insula căreia îi aparține regiunea: un punct al regiunii stă în insulă, sau (o regiune lărgită peste pereți, cu o suprapunere
 * mare) un punct al insulei stă în regiune. Altfel -1.
 */
function insulaRegiunii(ins: readonly Insula[], g: Regiune): number {
  const i = ins.findIndex((x) => inRegiune(g.exterior.varfuri[0]!.p, x.cont));
  if (i >= 0) return i;
  const cont = [g.exterior, ...g.gauri];
  return ins.findIndex((x) => inRegiune(x.ext.varfuri[0]!.p, cont));
}

/** Generatorul buclelor concentrice ale unei insule sau părți: pasul liniilor, densitatea, suprapunerea, lățimea, rolul. */
type Concentric = (sp: number, d: number, suprapunere: number, w: number, rol: Rol) => Cale[] | string;

/**
 * Șablonul unei piese pentru felurile din `ordine` (felul fiecărui strat, de la primul, `fel.ts`). `benzi`: regiunile benzilor
 * (contururi închise, care nu se ating, par-impar; prima e piesa întreagă, `trepte.ts`), una singură la o piesă fără trepte.
 * Sau motivul, dacă geometria refuză (un offset sau un boolean eșuat, nu doar o parte prea subțire). Brim-ul și fusta sunt ale
 * grupului (`brimGrup`, `fustaGrup`).
 */
export function sablonPiesa(benzi: readonly (readonly Contur[])[], s: SetariFeliere, ordine: readonly FelStrat[]): SablonPiesa | string {
  const contururi = benzi[0] ?? [];
  const contur = contururi.map((c) => Float64Array.from(puncte(c)));
  const conturBenzi = benzi.map((bc, i) => (i === 0 ? contur : bc.map((c) => Float64Array.from(puncte(c)))));
  // Aria, par-impar: un contur cuprins într-un număr impar de altele e gol.
  let arieTotala = 0;
  contururi.forEach((c, i) => {
    const p = c.varfuri[0]!.p;
    const adancime = contururi.filter((alt, j) => j !== i && inRegiune(p, [alt])).length;
    arieTotala += (adancime % 2 === 0 ? 1 : -1) * Math.abs(arieCuSemn(c));
  });
  let cx0 = Infinity, cy0 = Infinity, cx1 = -Infinity, cy1 = -Infinity;
  for (const q of contur) for (let i = 0; i < q.length; i += 2) { cx0 = Math.min(cx0, q[i]!); cx1 = Math.max(cx1, q[i]!); cy0 = Math.min(cy0, q[i + 1]!); cy1 = Math.max(cy1, q[i + 1]!); }
  const cutieP = [cx0, cy0, cx1, cy1] as const;
  const fel = new Map<FelStrat, Cale[]>();
  type Pereti = { insule: Insula[]; cai: Cale[][]; adanc: number[] };
  // Pereții (pe bandă: primul strat și restul) și regiunile umplerii (pe bandă, după distanță) se calculează o singură dată.
  const memoPereti = new Map<string, Pereti | string>();
  const pereti = (b: number, h: number, prim: boolean): Pereti | string => {
    const k = `${b}:${prim}`;
    let r = memoPereti.get(k);
    if (r === undefined) { r = pereti0(b, h, prim); memoPereti.set(k, r); }
    return r;
  };
  const memoRegiuni = new Map<string, Regiune[] | string>();
  const regiuniLa = (b: number, d: number): Regiune[] | string => {
    const k = `${b}:${d.toFixed(6)}`;
    let r = memoRegiuni.get(k);
    if (r === undefined) { r = laDistanta(benzi[b] ?? [], d); memoRegiuni.set(k, r); }
    return r;
  };
  /**
   * Pereții benzii b: inelele, insulă cu insulă, și adâncimea la care se oprește fiecare insulă (marginea interioară a celui mai
   * adânc perete al ei): o insulă îngustă, cu mai puțini pereți, își are umplerea de la propria adâncime. Fiecare buclă, cu grupul
   * ei (bucla exterioară cea mai apropiată, de același fel: margine sau gol) și cu cusătura, la modurile care nu depind de duză.
   */
  function pereti1(b: number, h: number, wE: number, wI: number, e: number): Pereti | string {
    const insule: Insula[] = [], cai: Cale[][] = [], adanc: number[] = [];
    const radacini: { insula: number; gaura: boolean; p: Float64Array; grup: number }[] = [];
    let d = e + wE / 2;
    for (let k = 0; k < s.pereti; k++) {
      if (k === 1) d += (pas(wE, h) + pas(wI, h)) / 2; else if (k > 1) d += pas(wI, h);
      const r = regiuniLa(b, d);
      if (typeof r === 'string') return r;
      if (r.length === 0) break;
      const w = k === 0 ? wE : wI;
      if (k === 0) for (const g of r) { insule.push({ ext: g.exterior, cont: [g.exterior, ...g.gauri] }); cai.push([]); adanc.push(0); }
      for (const g of r) {
        const i = k === 0 ? insule.findIndex((x) => x.ext === g.exterior) : insulaRegiunii(insule, g);
        if (i < 0) continue;
        adanc[i] = d + w / 2;
        for (const c of [g.exterior, ...g.gauri]) {
          const gaura = c !== g.exterior, p = Float64Array.from(puncte(c));
          let grup: number;
          if (k === 0) { grup = radacini.length; radacini.push({ insula: i, gaura, p, grup }); } else {
            const cand = radacini.filter((x) => x.insula === i && x.gaura === gaura);
            const lista = cand.length > 0 ? cand : radacini.filter((x) => x.insula === i);
            grup = lista.reduce((y, x) => (distantaLaBucla(p[0]!, p[1]!, x.p) < distantaLaBucla(p[0]!, p[1]!, y.p) ? x : y), lista[0]!).grup;
          }
          cai[i]!.unshift({ rol: k === 0 ? 'exterior' : 'interior', p, inchisa: true, w, grup, adancime: k, gaura });
        }
      }
    }
    if (s.cusatura !== 'nearest' && s.cusatura !== 'random') {
      const S = radacini.map((x) => { const i = cusaturaStatica(x.p, x.gaura, s.cusatura as Exclude<Cusatura, 'nearest' | 'random'>); return { x: x.p[2 * i]!, y: x.p[2 * i + 1]!, i }; });
      for (const l of cai) for (let j = 0; j < l.length; j++) { const c = l[j]!; l[j] = cuCusatura(c, S[c.grup!]!, s.cusaturiDecalate); }
    }
    return { insule, cai, adanc };
  }
  function pereti0(b: number, h: number, prim: boolean): Pereti | string {
    if (!prim) return pereti1(b, h, s.wExterior, s.wInterior, 0);
    const r = pereti1(b, h, s.wPrim, s.wPrim, s.piciorElefant);
    if (typeof r === 'string') return r;
    // Compensarea primului strat (și linia lui mai lată) nu are voie să șteargă o trăsătură pe care straturile de deasupra o
    // au: altfel ea s-ar imprima în aer, de la stratul 2. Atunci primul strat începe ca celelalte (fără compensare, cu
    // peretele exterior la lățimea lui obișnuită).
    // Pierderea se vede pe arii: regiunea peretelui exterior de pe primul strat, lărgită înapoi până la cea de deasupra, trebuie
    // s-o acopere (colțurile rotunjite pierd sub 0,2 mm²; o trăsătură îngustă, mult mai mult).
    const d0 = s.piciorElefant + s.wPrim / 2, d1 = s.wExterior / 2;
    const sus = regiuniLa(b, d1), jos = regiuniLa(b, d0);
    if (typeof sus === 'string') return sus;
    if (typeof jos === 'string') return jos;
    const inapoi = jos.length === 0 || d0 - d1 < 1e-6 ? jos : laDistanta(contururiDin(jos), -(d0 - d1));
    const aSus = arieRegiuni(sus);
    const pierdute = typeof inapoi === 'string' || aSus - arieRegiuni(inapoi) > Math.max(0.2, 0.005 * aSus);
    return pierdute ? pereti1(b, h, s.wExterior, s.wPrim, 0) : r;
  }
  /** Buclele concentrice ale unei insule a benzii b, de la adâncimea d0 spre interior, la `dist` una de alta, fiecare din capătul celei de dinainte. */
  const concentrice = (b: number, pr: Pereti, i: number, d0: number, dist: number, rol: Rol, w: number): Cale[] | string => {
    const rez: Cale[] = [];
    let x = 0, y = 0;
    for (let j = 0; j < 10000; j++) {
      const r = regiuniLa(b, d0 + j * dist);
      if (typeof r === 'string') return r;
      const ale = r.filter((g) => insulaRegiunii(pr.insule, g) === i);
      if (ale.length === 0) break;
      for (const g of ale) {
        for (const c of [g.exterior, ...g.gauri]) {
          const p = Float64Array.from(puncte(c));
          const f = proiectie(p, x, y);
          const q = j === 0 && rez.length === 0 ? p : pornesteDin(p, f.i, f.x, f.y);
          rez.push({ rol, p: q, inchisa: true, w });
          x = q[0]!; y = q[1]!;
        }
      }
    }
    return rez;
  };
  /** Buclele concentrice ale unei figuri (o parte a unui strat cu trepte), de la d0 (0: chiar marginea ei) spre interior. */
  const concentriceFigura = (c: readonly Contur[], d0: number, dist: number, rol: Rol, w: number, mm3?: number): Cale[] | string => {
    const rez: Cale[] = [];
    let x = 0, y = 0;
    for (let j = 0; j < 100000; j++) {
      const d = d0 + j * dist;
      const r = d < 1e-9 ? regiuniDin(c) : laDistanta(c, d);
      if (typeof r === 'string') return r;
      if (r.length === 0) break;
      for (const g of r) {
        for (const k of [g.exterior, ...g.gauri]) {
          const p = Float64Array.from(puncte(k));
          const f = proiectie(p, x, y);
          const q = rez.length === 0 ? p : pornesteDin(p, f.i, f.x, f.y);
          rez.push({ rol, p: q, inchisa: true, w, ...(mm3 === undefined ? {} : { mm3 }) });
          x = q[0]!; y = q[1]!;
        }
      }
    }
    return rez;
  };
  /** Liniile drepte ale unor familii (unghiul și faza fiecăreia), la pasul `ls`, nelegate: modelele rare din linii. */
  const drepte = (pol: readonly number[][], familii: readonly { readonly u: number; readonly faza: number }[], ls: number, rol: Rol, w: number): Cale[] =>
    familii.flatMap(({ u, faza }) => { const l = zigzag(intervale(pol, u, ls, faza), u, ls, -1, rol, w, faza); return ordoneaza(l, l[0]?.p[0] ?? 0, l[0]?.p[1] ?? 0).cai; });
  const lanturi = (l: readonly number[][], rol: Rol, w: number): Cale[] => {
    const cai = l.filter((p) => p.length >= 4).map((p) => ({ rol, p: Float64Array.from(p), inchisa: false, w }));
    return ordoneaza(cai, cai[0]?.p[0] ?? 0, cai[0]?.p[1] ?? 0).cai;
  };
  /** Umplerea unei insule sau părți (poligoanele `pol`), după model; d = densitatea (1 la plin); concentricul, din `conc`. */
  const umpleInsula = (conc: Concentric, pol: number[][], model: ModelRar | ModelPlin, u: number, d: number, z: number, h: number, w: number,
    suprapunere: number, rol: Rol, rar: boolean): Cale[] | string => {
    const sp = pas(w, h);
    switch (model) {
      case 'monotonic': case 'monotonicline':
        return monoton(intervale(pol, u, sp), u, sp, model === 'monotonic', sp, rol, w);
      case 'rectilinear': case 'alignedrectilinear': {
        if (rar) return drepte(pol, [{ u, faza: 0.5 }], sp / d, rol, w);
        const l = zigzag(intervale(pol, u, sp), u, sp, sp, rol, w);
        return ordoneaza(l, l[0]?.p[0] ?? 0, l[0]?.p[1] ?? 0).cai;
      }
      case 'grid': return drepte(pol, [{ u, faza: 0.5 }, { u: u + 90, faza: 0.5 }], (2 * sp) / d, rol, w);
      case 'triangles': return drepte(pol, [{ u, faza: 0 }, { u: u + 60, faza: 0 }, { u: u + 120, faza: 0 }], (3 * sp) / d, rol, w);
      case 'tri-hexagon': return drepte(pol, [{ u, faza: 0 }, { u: u + 60, faza: 0 }, { u: u + 120, faza: 0.5 }], (3 * sp) / d, rol, w);
      case 'cubic': {
        const ls = (3 * sp) / d, f = (Math.SQRT1_2 * z) / ls, fr = (x: number): number => x - Math.floor(x);
        return drepte(pol, [{ u, faza: fr(f) }, { u: u + 60, faza: fr(-f) }, { u: u + 120, faza: fr(f) }], ls, rol, w);
      }
      case 'line': return lanturi(oscilante(pol, u, sp, d), rol, w);
      case 'honeycomb': return lanturi(fagure(pol, u, sp, d), rol, w);
      case 'gyroid': return lanturi(giroid(pol, u, sp, d, z), rol, w);
      case 'crosshatch': return lanturi(crosshatch(pol, u, sp, d, z), rol, w);
      case 'concentric': return conc(sp, d, suprapunere, w, rol);
      default: return lanturi(curba(model, pol, u, sp, d, cutieP), rol, w);
    }
  };
  /** Pereții și umplerea fiecărei insule a unui fel de strat al benzii b, cu un singur rol pe tot stratul. */
  const umplere = (b: number, h: number, prim: boolean, w: number, suprapunere: number, model: ModelRar | ModelPlin, u: number, uPlin: number, z: number,
    rol: Rol, rar: boolean): Cale[][] | string => {
    const pr = pereti(b, h, prim);
    if (typeof pr === 'string') return pr;
    const cai = pr.cai.map((x) => [...x]);
    if (pr.insule.length === 0 || (rar && s.umplere <= 0)) return cai;
    for (let i = 0; i < pr.insule.length; i++) {
      const r = regiuniLa(b, pr.adanc[i]! - suprapunere * w);
      if (typeof r === 'string') return r;
      const conc: Concentric = (sp, d, sup, wc, rc) => concentrice(b, pr, i, pr.adanc[i]! + sp / 2 - sup * wc, sp / d, rc, wc);
      for (const g of r) {
        if (insulaRegiunii(pr.insule, g) !== i) continue;
        const pol = [g.exterior, ...g.gauri].map((c) => puncte(c));
        // O insulă rară prea mică se umple plin (`minimum_sparse_infill_area`), cu modelul și lățimea plinului.
        const mica = rar && pol.reduce((a, p) => a + arie(p), 0) < ARIE_MINIMA_RARA;
        const umple = mica
          ? umpleInsula(conc, pol, s.modelPlin, uPlin, 1, z, h, s.wPlin, suprapunere, 'plin', false)
          : umpleInsula(conc, pol, model, u, rar ? s.umplere : 1, z, h, w, suprapunere, rol, rar);
        if (typeof umple === 'string') return umple;
        cai[i]!.push(...umple);
        // Concentricul ține toată insula dintr-odată (nu pe regiunea lărgită).
        if (!mica && model === 'concentric') break;
      }
    }
    return cai;
  };
  /** Partea unei insule a benzii b, la adâncimea dA (umplerea ei), tăiată de regiunile altor benzi (`termeni`): regiunile ei. */
  const memoParti = new Map<string, Regiune[] | string>();
  const parte = (b: number, pr: Pereti, i: number, dA: number, cheie: string, termeni: readonly Termen[]): Regiune[] | string => {
    const k = `${b}|${i}|${dA.toFixed(6)}|${cheie}`;
    let rez = memoParti.get(k);
    if (rez !== undefined) return rez;
    const r = regiuniLa(b, dA);
    if (typeof r === 'string') rez = r;
    else {
      const ale = r.filter((g) => insulaRegiunii(pr.insule, g) === i);
      const g = ale.length === 0 ? [] : combina([{ c: contururiDin(ale), compl: true }, ...termeni]);
      rez = typeof g === 'string' ? g : regiuniDin(g);
    }
    memoParti.set(k, rez);
    return rez;
  };
  /**
   * Un strat cu trepte, cu mai multe părți: pereții benzii b, apoi, în fiecare insulă, fiecare parte în regiunea ei: suprafața
   * de sus unde banda de deasupra lipsește (R_b minus R_b1), plinul unde lipsește banda cu `sus` straturi mai sus (R_b1 minus
   * R_bs), umplerea rară în rest (R_bs).
   */
  const amestecat = (t: BenziFel, h: number): Cale[][] | string => {
    const { b, b1, bs } = t;
    const pr = pereti(b, h, false);
    if (typeof pr === 'string') return pr;
    const cai = pr.cai.map((x) => [...x]);
    const R = (j: number): readonly Contur[] => benzi[j] ?? [];
    type Parte = { rol: Rol; model: ModelRar | ModelPlin; u: number; w: number; sup: number; rar: boolean; cheie: string; termeni: Termen[] };
    const parti: Parte[] = [];
    if (b1 !== b) parti.push({ rol: 'sus', model: s.modelSus, u: t.uSus ?? 0, w: s.wSus, sup: s.suprapunerePlin, rar: false, cheie: `s${b1}`, termeni: [{ c: R(b1) }] });
    if (b1 >= 0 && bs !== b1) {
      parti.push({
        rol: 'plin', model: s.modelPlin, u: t.uPlin ?? 0, w: s.wPlin, sup: s.suprapunerePlin, rar: false, cheie: `p${b1}:${bs}`,
        termeni: [{ c: R(b1), compl: true }, ...(bs >= 0 ? [{ c: R(bs) }] : [])],
      });
    }
    if (bs >= 0 && s.umplere > 0) {
      parti.push({ rol: 'rar', model: s.modelRar, u: t.uRar ?? 0, w: s.wRar, sup: s.suprapunereRar, rar: true, cheie: `r${bs}`, termeni: [{ c: R(bs), compl: true }] });
    }
    const z = t.zRar ?? 0;
    for (const P of parti) {
      for (let i = 0; i < pr.insule.length; i++) {
        const G = parte(b, pr, i, pr.adanc[i]! - P.sup * P.w, P.cheie, P.termeni);
        if (typeof G === 'string') return G;
        for (const g of G) {
          const gc = [g.exterior, ...g.gauri];
          const pol = gc.map((c) => puncte(c));
          const conc: Concentric = (sp, d, _sup, wc, rc) => concentriceFigura(gc, sp / 2, sp / d, rc, wc);
          const mica = P.rar && pol.reduce((a, p) => a + arie(p), 0) < ARIE_MINIMA_RARA;
          const umple = mica
            ? umpleInsula(conc, pol, s.modelPlin, t.uPlin ?? 0, 1, z, h, s.wPlin, P.sup, 'plin', false)
            : umpleInsula(conc, pol, P.model, P.u, P.rar ? s.umplere : 1, z, h, P.w, P.sup, P.rol, P.rar);
          if (typeof umple === 'string') return umple;
          cai[i]!.push(...umple);
        }
      }
    }
    return cai;
  };
  /**
   * Călcarea unui fel de strat al benzii b: fața piesei, strânsă cu marginea, cu debitul ei; cu `minus` (o bandă), doar unde
   * banda aceea lipsește (fața unei trepte).
   */
  const calcare = (b: number, u: number, minus: number): Cale[] | string => {
    const inset = s.margineCalcare > 0 ? s.margineCalcare : 0.5 * K1C.duza;
    const mm3 = s.strat * s.debitCalcare * s.pasCalcare, w = s.pasCalcare;
    let fig: Contur[] | null = null;
    if (minus >= 0) {
      const r = regiuniLa(b, inset);
      if (typeof r === 'string') return r;
      const g = r.length === 0 ? [] : combina([{ c: contururiDin(r), compl: true }, { c: benzi[minus] ?? [] }]);
      if (typeof g === 'string') return g;
      if (g.length === 0) return [];
      fig = g;
    }
    if (s.modelCalcare === 'concentric') {
      if (fig !== null) return concentriceFigura(fig, 0, s.pasCalcare, 'calcare', w, mm3);
      const rez: Cale[] = [];
      for (let j = 0; j < 100000; j++) {
        const r = regiuniLa(b, inset + j * s.pasCalcare);
        if (typeof r === 'string') return r;
        if (r.length === 0) break;
        for (const g of r) for (const c of [g.exterior, ...g.gauri]) rez.push({ rol: 'calcare', p: Float64Array.from(puncte(c)), inchisa: true, w, mm3 });
      }
      return rez;
    }
    const r = fig === null ? regiuniLa(b, inset) : regiuniDin(fig);
    if (typeof r === 'string') return r;
    const ua = u + s.unghiCalcare;
    return r.flatMap((g) => {
      const pol = [g.exterior, ...g.gauri].map((c) => puncte(c));
      return monoton(intervale(pol, ua, s.pasCalcare), ua, s.pasCalcare, true, 3 * s.pasCalcare, 'calcare', w).map((c) => ({ ...c, mm3 }));
    });
  };
  /** Ce se calcă pe un fel: banda din care se scade (-1: toată fața) sau nimic (null). */
  const deCalcat = (tip: TipStrat, t: BenziFel | undefined): number | null => {
    if (t === undefined) return ((s.calcare === 'sus' || s.calcare === 'ultima') ? tip === 'sus' : s.calcare === 'plin' && tip !== 'rar') ? -1 : null;
    if (s.calcare === 'sus') return t.b1 !== t.b ? t.b1 : null;
    if (s.calcare === 'ultima') return t.b1 === -1 ? -1 : null;
    if (s.calcare === 'plin') return t.bs === -1 ? -1 : t.bs !== t.b ? t.bs : null;
    return null;
  };
  const h = s.strat;
  for (const f of new Set(ordine)) {
    const cf = citesteFel(f);
    const { tip, u, uPlin, z } = cf, t = cf.trepte, b = t?.b ?? 0;
    let r: Cale[][] | string;
    if (tip === 'prim') r = umplere(0, s.strat1, true, s.wPrim, s.suprapunerePlin, s.modelJos, u, u, s.strat1, 'plin', false);
    else if (tip === 'rar') r = umplere(b, h, false, s.wRar, s.suprapunereRar, s.modelRar, u, uPlin, z ?? 0, 'rar', true);
    else if (tip === 'plin') r = umplere(b, h, false, s.wPlin, s.suprapunerePlin, s.modelPlin, u, u, z ?? 0, 'plin', false);
    else if (tip === 'sus') r = umplere(b, h, false, s.wSus, s.suprapunerePlin, s.modelSus, u, u, z ?? 0, 'sus', false);
    else r = amestecat(t!, h);
    if (typeof r === 'string') return r;
    const cai = r.flat();
    const minus = deCalcat(tip, t);
    if (minus !== null) {
      const c = calcare(b, u, minus);
      if (typeof c === 'string') return c;
      cai.push(...c);
    }
    fel.set(f, cai);
  }
  // Ce nu iese: regiunea minus deschiderea ei (strânsă cu w/2, apoi lărgită la loc), pe fiecare bandă; cea mai rea.
  let subtire = 0;
  benzi.forEach((bc, b) => {
    const total = b === 0 ? arieTotala : arieFigura(bc);
    const strans = laDistanta(bc, s.wExterior / 2);
    if (typeof strans === 'string') return;
    const larg = strans.length === 0 ? [] : laDistanta(contururiDin(strans), -s.wExterior / 2);
    const ramas = typeof larg === 'string' ? total : larg.reduce((a, g) => a + Math.abs(arieCuSemn(g.exterior)) - g.gauri.reduce((x, y) => x + Math.abs(arieCuSemn(y)), 0), 0);
    let x = Math.max(0, total - ramas);
    if (x < Math.max(0.05, 0.002 * total)) x = 0;
    subtire = Math.max(subtire, x);
  });
  return { fel, ordine, contur, benzi: conturBenzi, arie: arieTotala, subtire };
}

/**
 * Brim-ul grupului: buclele spre exterior ale tuturor pieselor deodată (`offsetFigura` le unește pe cele apropiate), doar
 * exterioarele, de la cea mai depărtată spre piese; o buclă intră doar dacă înconjoară o piesă cu brim. Așa, brim-ul nu trece
 * prin piesele vecine și nici peste brim-ul lor. Sau motivul (de exemplu, două piese care se ating).
 */
export function brimGrup(piese: readonly { readonly contururi: readonly Contur[]; readonly brim: boolean }[], s: SetariFeliere): Cale[] | string {
  if (s.latimeBrim <= 0 || !piese.some((p) => p.brim)) return [];
  const toate = piese.flatMap((p) => p.contururi);
  const repere = piese.filter((p) => p.brim && p.contururi.length > 0).map((p) => p.contururi[0]!.varfuri[0]!.p);
  const p = pas(s.wPrim, s.strat1), n = Math.max(1, Math.round(s.latimeBrim / p));
  // Buclele, grupate după piesele pe care le înconjoară: întâi cele comune (mai multe piese), apoi ale fiecărei piese, fiecare
  // grup de la exterior spre piese. Așa, între buclele alăturate ale aceluiași grup nu e nicio deplasare lungă.
  const grupuri = new Map<string, Cale[]>();
  for (let k = n - 1; k >= 0; k--) {
    const r = laDistanta(toate, -(s.golBrim + s.wPrim / 2 + k * p));
    if (typeof r === 'string') return r;
    for (const g of r) {
      const cheie = repere.map((q, i) => (inRegiune(q, [g.exterior]) ? i : -1)).filter((i) => i >= 0).join(',');
      if (cheie === '') continue;
      const l = grupuri.get(cheie) ?? [];
      l.push({ rol: 'brim', p: dinSpate(puncte(g.exterior)), inchisa: true, w: s.wPrim });
      grupuri.set(cheie, l);
    }
  }
  return [...grupuri.entries()].sort((a, b) => b[0].split(',').length - a[0].split(',').length).flatMap(([, l]) => l);
}

const conturDin = (h: readonly (readonly [number, number])[]): Contur => ({ inchis: true, varfuri: h.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' as const } })) });

/**
 * Fusta (`_make_skirt`): bucle în jurul anvelopei convexe a pieselor (cu brim-ul lor), la `distantaFusta` de ele, la pasul
 * liniei primului strat; cu lungimea minimă de filament, cât trebuie în plus. Combinată (una pentru toate) sau câte una pentru
 * fiecare piesă. Buclele, de la cea mai depărtată spre piese (ordinea imprimării); prima pornește la unghiul dat față de
 * centrul anvelopei (0° = dreapta, pozitiv în sens trigonometric). Sau motivul.
 */
export function fustaGrup(piese: readonly { readonly contur: readonly ArrayLike<number>[] }[], brim: readonly Cale[], s: SetariFeliere): Cale[] | string {
  if (s.fusta <= 0 || piese.length === 0) return [];
  const sp = pas(s.wPrim, s.strat1);
  const ePeMm = (sectiune(s.wPrim, s.strat1) / ARIE_FILAMENT) * s.debit;
  const grupuri = s.tipFusta === 'combinata' ? [piese.flatMap((p) => p.contur)] : piese.map((p) => p.contur);
  const rez: Cale[] = [];
  for (const contur of grupuri) {
    // Brim-ul pieselor grupului (buclele care le înconjoară) intră și el în anvelopă: fusta stă la distanța ei de brim.
    const baza = anvelopa(contur);
    if (baza.length < 3) continue;
    const ale = s.tipFusta === 'combinata' ? brim.map((b) => b.p) : brim.filter((b) => baza.some(([x, y]) => inRegiune({ x, y }, [conturDin(pereche(b.p))]))).map((b) => b.p);
    const h = anvelopa([...contur, ...ale]);
    const hc = conturDin(h);
    let cx = 0, cy = 0;
    for (const [x, y] of h) { cx += x / h.length; cy += y / h.length; }
    const bucle: Float64Array[] = [];
    let filament = 0;
    for (let k = 1; k <= s.fusta || (s.lungimeMinimaFusta > 0 && filament < s.lungimeMinimaFusta && k <= 100); k++) {
      const r = laDistanta([hc], -(s.distantaFusta - sp / 2 + k * sp));
      if (typeof r === 'string') return r;
      if (r.length === 0) break;
      const p = Float64Array.from(puncte(r[0]!.exterior));
      bucle.push(p);
      filament += (lungime(p) + Math.hypot(p[0]! - p[p.length - 2]!, p[1]! - p[p.length - 1]!)) * ePeMm;
    }
    // Cea mai depărtată întâi; ea pornește la unghiul dat, celelalte din punctul cel mai apropiat de capătul celei de dinainte.
    bucle.reverse();
    let x = 0, y = 0;
    bucle.forEach((p, j) => {
      let q: Float64Array;
      if (j === 0) {
        const tinta = (s.unghiFusta * Math.PI) / 180;
        let bi = 0, bd = Infinity;
        for (let i = 0; i < p.length; i += 2) {
          const a = Math.atan2(p[i + 1]! - cy, p[i]! - cx);
          const dif = Math.abs(Math.atan2(Math.sin(a - tinta), Math.cos(a - tinta)));
          if (dif < bd - 1e-12) { bd = dif; bi = i / 2; }
        }
        q = pornesteDin(p, bi, p[2 * bi]!, p[2 * bi + 1]!);
      } else { const f = proiectie(p, x, y); q = pornesteDin(p, f.i, f.x, f.y); }
      rez.push({ rol: 'fusta', p: q, inchisa: true, w: s.wPrim });
      x = q[0]!; y = q[1]!;
    });
  }
  return rez;
}

/** Punctele unei bucle, ca perechi. */
const pereche = (p: ArrayLike<number>): [number, number][] => { const r: [number, number][] = []; for (let i = 0; i < p.length; i += 2) r.push([p[i]!, p[i + 1]!]); return r; };
