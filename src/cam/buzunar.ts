import { apropiereContururi, distantaCutii } from '../geom/apropiere.ts';
import { cerculArcului, inverseaza, LINIE, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import { cutieContur, type Cutie } from '../geom/cutie.ts';
import { distantaLaContur, inRegiune, peArc } from '../geom/distanta.ts';
import { offsetRegiune } from '../geom/offset.ts';
import type { Miscare } from '../ir/ir.ts';
import type { Coborare } from '../model/document.ts';
import { incepeLa, punctLa } from './parcurgere.ts';
import type { Sens } from './profil.ts';
import { intrareElice, intrarePlonjare, intrareRampa, intrareZigzag, refuzCoborare, type Intrare } from './coborare.ts';
import { taieBucla, type ParametriTraseu } from './traseu.ts';

/**
 * Buzunarul (ADR 0069): materialul dinăuntrul unui contur închis, scos până la adâncime, în inele paralele cu conturul.
 * Inelul k e bucla centrului frezei la d_k = R + k · s de contur (offsetul interior exact, `offsetInchis`); inelele se
 * opresc când freza nu mai încape. Cu s ≤ R, orice punct al deschiderii conturului (ce poate atinge discul frezei) stă la
 * mai puțin de s de un inel (§3), deci e scos: rămân doar colțurile pe care nicio freză de raza R nu le atinge.
 * Insulele (ADR 0073): contururile dinăuntru pe care buzunarul le ocolește. Marginea e atunci conturul cu insulele, iar
 * distanța e la cea mai apropiată dintre ele (`offsetRegiune`); acoperirea rămâne aceeași, cu δ distanța la margine.
 */

/** Câte inele poate avea un buzunar (T23): peste, pasul lateral e greșit (0,001 mm pe un metru), nu lucrarea. */
export const PLAFON_INELE = 20_000;

/**
 * Cât poate veni o legătură la adâncime mai aproape de contur decât raza frezei (mm): rotunjirea postului plus toleranța
 * offsetului, ca la regiunea păstrată (`EPS_REGIUNE`, ADR 0026 §6). Mai aproape, freza se ridică.
 */
export const EPS_LEGATURA = 0.005;

/**
 * Cât se apropie de contur un inel al cărui offset cade pe un prag de topologie (mm): inelul degenerat (d exact cât raza
 * cercului înscris, unde regiunea e o linie) sau un gât lat exact cât 2d. Mai aproape de contur, golul până la inelul
 * dinainte scade, deci acoperirea (§3) rămâne; inelele următoare pornesc de acolo. Măsurat pe 25.10: dreptunghiul 40 × 30
 * cu Ø6 și pasul 2,4 are inelul 6 exact la 15 mm, iar offsetul îl refuză („se atinge singur”).
 */
const APROPIERI = [0.001, 0.01, 0.05] as const;

/**
 * Un inel: o bucată a regiunii centrului frezei la distanța `d` de margine. Buclele ei: întâi cea exterioară (sensul
 * trigonometric), apoi cele din jurul insulelor (orar), fiecare cu regiunea în stânga mersului. `copii`: inelele dinăuntru.
 */
export type InelBuzunar = { readonly d: number; readonly bucle: readonly Contur[]; readonly copii: InelBuzunar[] };

export type RezultatInele =
  | { readonly ok: true; readonly radacini: readonly InelBuzunar[]; readonly numar: number }
  | { readonly ok: false; readonly motiv: string };

/**
 * Inelele buzunarului, ca arbore: rădăcinile la d = R (câte una pe fiecare bucată în care încape freza), iar fiecare inel
 * la d_k + s stă în cel de la d_k care îl cuprinde: regiunea de la d_k + s e în cea de la d_k, deci fiecare bucată a ei e
 * într-o singură bucată de dinainte. `insule`: contururile închise din buzunar, care nu se ating (le judecă lucrarea).
 * `numar` numără buclele.
 */
export function ineleBuzunar(contur: Contur, raza: number, pasLateral: number, insule: readonly Contur[] = []): RezultatInele {
  if (!contur.inchis) return { ok: false, motiv: 'un buzunar cere un contur închis' };
  if (!(raza > 0 && Number.isFinite(raza))) return { ok: false, motiv: `raza frezei trebuie să fie pozitivă (${raza})` };
  if (!(pasLateral > 0 && pasLateral <= raza)) {
    return { ok: false, motiv: `pasul lateral de ${pasLateral} mm trebuie să fie în (0, ${raza}] (raza frezei): altfel rămâne material între inele` };
  }
  const radacini: InelBuzunar[] = [];
  let nivel: InelBuzunar[] = [];
  let numar = 0;
  const nuIncape = (o: ReturnType<typeof offsetRegiune>): boolean => !o.ok && o.motiv.startsWith('scula nu încape');
  for (let k = 0, d = raza; ; k++, d += pasLateral) {
    let o = offsetRegiune(contur, insule, -d);
    // Pe un prag de topologie, inelul puțin mai aproape de contur (`APROPIERI`); peretele (k = 0) nu, ca la profil: acolo
    // freza ar intra în perete.
    for (const a of APROPIERI) {
      if (o.ok || nuIncape(o) || k === 0 || a >= pasLateral / 2) break;
      const x = offsetRegiune(contur, insule, -(d - a));
      if (x.ok) { o = x; d -= a; }
    }
    // Freza nu mai încape: inelele s-au terminat (la k = 0, buzunarul e prea îngust).
    if (nuIncape(o)) break;
    if (!o.ok) return { ok: false, motiv: `inelul la ${d.toFixed(3)} mm de contur: ${o.motiv}` };
    if (o.regiuni.length === 0) break;
    const noi: InelBuzunar[] = o.regiuni.map((r) => ({ d, bucle: [r.exterior, ...r.gauri], copii: [] }));
    numar += noi.reduce((n, x) => n + x.bucle.length, 0);
    if (numar > PLAFON_INELE) {
      return { ok: false, motiv: `peste ${PLAFON_INELE} de inele: pasul lateral de ${pasLateral} mm e prea mic pentru buzunar` };
    }
    if (k === 0) {
      radacini.push(...noi);
    } else {
      for (const x of noi) {
        const p = x.bucle[0]?.varfuri[0]?.p;
        const parinte = p ? nivel.find((y) => inRegiune(p, y.bucle)) : undefined;
        if (!parinte) return { ok: false, motiv: `inelul la ${d.toFixed(3)} mm de contur nu stă în niciun inel de dinainte` };
        parinte.copii.push(x);
      }
    }
    nivel = noi;
  }
  if (radacini.length === 0) return { ok: false, motiv: `freza (Ø${2 * raza}) nu încape în buzunar` };
  return { ok: true, radacini, numar };
}

/**
 * Ordinea tăierii: dinăuntru în afară (§4), fiecare inel după toate inelele dinăuntrul lui (postordine, cu stivă: un
 * buzunar mare are mii de niveluri). Ultimul inel al fiecărei rădăcini e chiar peretele (cu buclele din jurul insulelor).
 */
export function ordineInele(radacini: readonly InelBuzunar[]): InelBuzunar[] {
  const rez: InelBuzunar[] = [];
  const stiva: Array<{ readonly x: InelBuzunar; readonly gata: boolean }> = [...radacini].reverse().map((x) => ({ x, gata: false }));
  for (let v = stiva.pop(); v !== undefined; v = stiva.pop()) {
    if (v.gata) { rez.push(v.x); continue; }
    stiva.push({ x: v.x, gata: true });
    for (let k = v.x.copii.length - 1; k >= 0; k--) {
      const c = v.x.copii[k];
      if (c) stiva.push({ x: c, gata: false });
    }
  }
  return rez;
}

/** Poziția (mm de la vârful 0, pe buclă) a punctului buclei celui mai apropiat de p: pe linii și arce, exact. */
export function pozitiaCeaMaiApropiata(c: Contur, p: Punct): number {
  return celMaiApropiat(c, p).s;
}

/** Punctul buclei cel mai apropiat de p: poziția lui (mm de la vârful 0) și distanța până la el. */
function celMaiApropiat(c: Contur, p: Punct): { readonly s: number; readonly distanta: number } {
  let cea = Infinity, s = 0, s0 = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s: seg } = segment(c, i);
    let f: number, L: number;
    if (seg.tip === 'A') {
      const cerc = cerculArcului(a, b, seg.bulge);
      L = cerc.raza * Math.abs(cerc.baleiaj);
      const u = Math.atan2(p.y - cerc.centru.y, p.x - cerc.centru.x);
      if (peArc(u, cerc.start, cerc.baleiaj)) {
        const rel = cerc.baleiaj >= 0 ? u - cerc.start : cerc.start - u;
        const doiPi = 2 * Math.PI;
        f = Math.min(1, (((rel % doiPi) + doiPi) % doiPi) / Math.abs(cerc.baleiaj));
      } else {
        f = Math.hypot(p.x - a.x, p.y - a.y) <= Math.hypot(p.x - b.x, p.y - b.y) ? 0 : 1;
      }
    } else {
      const dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      L = Math.sqrt(l2);
      f = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    }
    const q = seg.tip === 'A' ? punctPeArc(a, b, seg.bulge, f) : { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < cea) { cea = d; s = s0 + f * L; }
    s0 += L;
  }
  return { s, distanta: cea };
}

function punctPeArc(a: Punct, b: Punct, bulge: number, f: number): Punct {
  const cerc = cerculArcului(a, b, bulge);
  const u = cerc.start + cerc.baleiaj * f;
  return { x: cerc.centru.x + cerc.raza * Math.cos(u), y: cerc.centru.y + cerc.raza * Math.sin(u) };
}

/**
 * Legătura dreaptă de la a la b rămâne la adâncime (§5) dacă discul frezei nu iese din buzunar pe drum: segmentul stă la
 * cel puțin R − ε de contur și de fiecare insulă, iar mijlocul lui e în buzunar (în contur, în afara insulelor). Departe de
 * toată marginea, segmentul n-o trece, deci e întreg de aceeași parte cu mijlocul.
 */
export function legaturaInBuzunar(a: Punct, b: Punct, contur: Contur, raza: number, insule: readonly Contur[] = []): boolean {
  return legaturaLibera(a, b, marginea(contur, insule), raza);
}

/** Marginea buzunarului (conturul și insulele), cu cutiile lor, calculate o dată pentru toate legăturile. */
type Margine = ReadonlyArray<{ readonly c: Contur; readonly cutie: Cutie }>;

function marginea(contur: Contur, insule: readonly Contur[]): Margine {
  return [contur, ...insule].map((c) => ({ c, cutie: cutieContur(c) }));
}

function legaturaLibera(a: Punct, b: Punct, margine: Margine, raza: number): boolean {
  const drum: Contur = { inchis: false, varfuri: [{ p: a, s: LINIE }, { p: b, s: LINIE }] };
  const prag = raza - EPS_LEGATURA;
  // Par-impar pe toată marginea: un contur a cărui cutie nu cuprinde mijlocul nu-l cuprinde nici el.
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let inBuzunar = false;
  for (const x of margine) {
    if (m.x >= x.cutie.minX && m.x <= x.cutie.maxX && m.y >= x.cutie.minY && m.y <= x.cutie.maxY && inRegiune(m, [x.c])) inBuzunar = !inBuzunar;
  }
  if (!inBuzunar) return false;
  const cd = cutieContur(drum);
  return margine.every((x) => distantaCutii(cd, x.cutie) >= prag || apropiereContururi(drum, x.c, prag).distanta >= prag);
}

export type ParametriBuzunar = ParametriTraseu & {
  readonly sens: Sens;
  /** Raza frezei (mm). */
  readonly raza: number;
  /** Adâncimile trecerilor (`adancimiTreceri`), în ordine. */
  readonly adancimi: readonly number[];
  /** Coborârea la fiecare intrare (ADR 0076); lipsă = plonjarea dreaptă. */
  readonly coborare?: Coborare;
};

/** Traseul buzunarului și ce n-a putut face fără să fie o greșeală (elicea care nu încape, ADR 0076 §4). */
export type RezultatBuzunar =
  | { readonly ok: true; readonly miscari: readonly Miscare[]; readonly avertismente: readonly string[] }
  | { readonly ok: false; readonly motiv: string };

/** Două puncte mai apropiate de atât (mm) sunt același: legătura lipsește. */
const EPS_PUNCT = 1e-9;
/** Câte puncte pe latură are grila în care se caută centrul elicei, în cutia bucății. */
const GRILA_ELICE = 9;

/**
 * Centrul elicei de rază `razaElice` în bucata `inel` (ADR 0076 §3), sau null dacă nu încape: un punct al bucății (în bucla
 * exterioară, în afara celor ale insulelor) la cel puțin `razaElice` de toate buclele ei, adunat cu ce are bucata în plus față
 * de raza frezei (d − R): în bucata de la d, distanța la margine a unui punct e d plus distanța lui la buclele bucății, deci
 * tot cercul elicei stă la cel puțin R de margine. Dintre centrul de greutate al vârfurilor și o grilă în cutia bucății, cel
 * cu cel mai mult loc.
 */
export function centruElice(inel: InelBuzunar, razaFrezei: number, razaElice: number): Punct | null {
  const ext = inel.bucle[0];
  if (!ext || ext.varfuri.length === 0) return null;
  const k = cutieContur(ext);
  const candidati: Punct[] = [{
    x: ext.varfuri.reduce((a, v) => a + v.p.x, 0) / ext.varfuri.length, y: ext.varfuri.reduce((a, v) => a + v.p.y, 0) / ext.varfuri.length,
  }];
  for (let i = 0; i < GRILA_ELICE; i++) {
    for (let j = 0; j < GRILA_ELICE; j++) {
      candidati.push({ x: k.minX + ((i + 0.5) * (k.maxX - k.minX)) / GRILA_ELICE, y: k.minY + ((j + 0.5) * (k.maxY - k.minY)) / GRILA_ELICE });
    }
  }
  let cel: { readonly c: Punct; readonly loc: number } | null = null;
  for (const c of candidati) {
    if (!inRegiune(c, inel.bucle)) continue;
    const loc = Math.min(...inel.bucle.map((b) => distantaLaContur(c, b))) + (inel.d - razaFrezei);
    if (!cel || loc > cel.loc) cel = { c, loc };
  }
  return cel && cel.loc >= razaElice ? cel.c : null;
}

/**
 * Traseul buzunarului: pe fiecare trecere, inelele în ordinea dată (`ordineInele`), iar buclele unui inel de la cea mai
 * apropiată de freză. Fiecare buclă după prima pornește din punctul ei cel mai apropiat de freză, la care se ajunge la
 * adâncime, în linie dreaptă, dacă drumul rămâne în buzunar (departe de contur și de insule). Altfel (și la prima buclă a
 * trecerii) e o intrare: freza se ridică, vine deasupra și coboară cu `coborare` (ADR 0076; lipsă = plonjarea dreaptă, de la
 * vârful 0). Elicea care nu încape în bucata ei (sau nu se poate lega la buclă) coboară pe inel, cu același unghi, și spune
 * asta. Sensul (ADR 0027): buclele vin cu regiunea în stânga, deci cu materialul de scos (peretele, insula) în dreapta
 * mersului: urcarea le ia așa, opoziția le întoarce (și elicea merge la fel). După fiecare trecere, freza se ridică la Z-ul de
 * siguranță.
 */
export function traseuBuzunar(contur: Contur, inele: readonly InelBuzunar[], p: ParametriBuzunar, insule: readonly Contur[] = []): RezultatBuzunar {
  if (!(p.zSigur > 0)) return { ok: false, motiv: `Z-ul de siguranță trebuie să fie deasupra materialului (${p.zSigur})` };
  if (!(p.avans > 0 && p.avansPlonjare > 0)) return { ok: false, motiv: 'avansurile trebuie să fie pozitive' };
  const cob: Coborare = p.coborare ?? { fel: 'plonjare' };
  const refuz = refuzCoborare(cob);
  if (refuz) return { ok: false, motiv: refuz };
  const margine = marginea(contur, insule);
  const componente = inele.map((x) => x.bucle.map((b) => (p.sens === 'urcare' ? b : inverseaza(b))));
  const m: Miscare[] = [];
  const avertismente = new Set<string>();
  const centre = new Map<InelBuzunar, Punct | null>();
  /** Intrarea pe bucla b (pornită din punctul ei de intrare) a bucății `inel`, la trecerea de la −dp la −d: unde rămâne freza. */
  const intra = (b: Contur, inel: InelBuzunar, d: number, dp: number): Punct | string => {
    const pun = (r: Intrare | string): Punct | string => {
      if (typeof r === 'string') return r;
      for (const x of r.miscari) m.push(x);
      return r.la;
    };
    if (cob.fel === 'plonjare') {
      const la = pun(intrarePlonjare(b, d, p));
      if (typeof la === 'string') return la;
      return taieBucla(m, b, d, p, undefined) ?? la;
    }
    if (cob.fel === 'zigzag') return pun(intrareZigzag(b, dp, d, cob.unghi, cob.lungime, p));
    if (cob.fel === 'elice') {
      if (!centre.has(inel)) centre.set(inel, centruElice(inel, p.raza, cob.raza));
      const c = centre.get(inel);
      if (c) {
        // Punctul buclei cel mai apropiat de centru: acolo duce raza pe care se termină elicea, apoi bucla pornește din el.
        const q = celMaiApropiat(b, c);
        const qp = punctLa(b, q.s)?.p;
        const e = qp ? intrareElice(c, cob.raza, qp, dp, d, cob.unghi, p.sens === 'urcare', p) : 'bucla n-are lungime';
        if (qp && typeof e !== 'string' && (Math.hypot(e.la.x - qp.x, e.la.y - qp.y) <= EPS_PUNCT || legaturaLibera(e.la, qp, margine, p.raza))) {
          pun(e);
          if (Math.hypot(e.la.x - qp.x, e.la.y - qp.y) > EPS_PUNCT) m.push({ tip: 'taiere', la: { X: qp.x, Y: qp.y }, avans: p.avans });
          return taieBucla(m, incepeLa(b, q.s), d, p, undefined) ?? qp;
        }
      }
      avertismente.add(`elicea de rază ${cob.raza} mm nu încape în bucata de la ${inel.d.toFixed(3)} mm de contur: acolo coboară pe inel, cu ${cob.unghi}°`);
    }
    return pun(intrareRampa(b, dp, d, cob.unghi, p));
  };
  for (const [kp, d] of p.adancimi.entries()) {
    const dp = kp === 0 ? 0 : (p.adancimi[kp - 1] ?? 0);
    let la: Punct | null = null;
    for (const [ic, bucle] of componente.entries()) {
      const inel = inele[ic];
      if (!inel) continue;
      const ramase = [...bucle];
      while (ramase.length > 0) {
        // Bucla cea mai apropiată de freză (prima a trecerii: cea exterioară, de la vârful 0).
        let k = 0, poz = 0;
        if (la) {
          let cea = Infinity;
          for (const [j, x] of ramase.entries()) {
            const q = celMaiApropiat(x, la);
            if (q.distanta < cea) { cea = q.distanta; k = j; poz = q.s; }
          }
        }
        const b0 = ramase.splice(k, 1)[0];
        if (!b0) break;
        const b: Contur = la ? incepeLa(b0, poz) : b0;
        const start: Punct | undefined = b.varfuri[0]?.p;
        if (!start) continue;
        if (la && legaturaLibera(la, start, margine, p.raza)) {
          if (Math.hypot(start.x - la.x, start.y - la.y) > EPS_PUNCT) m.push({ tip: 'taiere', la: { X: start.x, Y: start.y }, avans: p.avans });
          const e = taieBucla(m, b, d, p, undefined);
          if (e) return { ok: false, motiv: e };
          la = start;
          continue;
        }
        const r = intra(b, inel, d, dp);
        if (typeof r === 'string') return { ok: false, motiv: r };
        la = r;
      }
    }
    m.push({ tip: 'rapida', la: { Z: p.zSigur } });
  }
  return { ok: true, miscari: m, avertismente: [...avertismente] };
}
