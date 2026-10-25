import { apropiereContururi } from '../geom/apropiere.ts';
import { cerculArcului, inverseaza, LINIE, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import { inRegiune, peArc } from '../geom/distanta.ts';
import { offsetInchis } from '../geom/offset.ts';
import type { Miscare } from '../ir/ir.ts';
import { incepeLa } from './parcurgere.ts';
import type { Sens } from './profil.ts';
import { taieBucla, type ParametriTraseu, type RezultatTraseu } from './traseu.ts';

/**
 * Buzunarul (ADR 0069): materialul dinăuntrul unui contur închis, scos până la adâncime, în inele paralele cu conturul.
 * Inelul k e bucla centrului frezei la d_k = R + k · s de contur (offsetul interior exact, `offsetInchis`); inelele se
 * opresc când freza nu mai încape. Cu s ≤ R, orice punct al deschiderii conturului (ce poate atinge discul frezei) stă la
 * mai puțin de s de un inel (§3), deci e scos: rămân doar colțurile pe care nicio freză de raza R nu le atinge.
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

/** Un inel: bucla centrului frezei la distanța `d` de contur (sensul trigonometric), cu inelele dinăuntrul lui. */
export type InelBuzunar = { readonly d: number; readonly bucla: Contur; readonly copii: InelBuzunar[] };

export type RezultatInele =
  | { readonly ok: true; readonly radacini: readonly InelBuzunar[]; readonly numar: number }
  | { readonly ok: false; readonly motiv: string };

/**
 * Inelele buzunarului, ca arbore: rădăcinile la d = R (câte una pe fiecare bucată în care încape freza), iar fiecare inel
 * la d_k + s stă în cel de la d_k care îl cuprinde (offsetul interior al unei regiuni fără găuri n-are găuri).
 */
export function ineleBuzunar(contur: Contur, raza: number, pasLateral: number): RezultatInele {
  if (!contur.inchis) return { ok: false, motiv: 'un buzunar cere un contur închis' };
  if (!(raza > 0 && Number.isFinite(raza))) return { ok: false, motiv: `raza frezei trebuie să fie pozitivă (${raza})` };
  if (!(pasLateral > 0 && pasLateral <= raza)) {
    return { ok: false, motiv: `pasul lateral de ${pasLateral} mm trebuie să fie în (0, ${raza}] (raza frezei): altfel rămâne material între inele` };
  }
  const radacini: InelBuzunar[] = [];
  let nivel: InelBuzunar[] = [];
  let numar = 0;
  const nuIncape = (o: ReturnType<typeof offsetInchis>): boolean => !o.ok && o.motiv.startsWith('scula nu încape');
  for (let k = 0, d = raza; ; k++, d += pasLateral) {
    let o = offsetInchis(contur, -d);
    // Pe un prag de topologie, inelul puțin mai aproape de contur (`APROPIERI`); peretele (k = 0) nu, ca la profil: acolo
    // freza ar intra în perete.
    for (const a of APROPIERI) {
      if (o.ok || nuIncape(o) || k === 0 || a >= pasLateral / 2) break;
      const x = offsetInchis(contur, -(d - a));
      if (x.ok) { o = x; d -= a; }
    }
    // Freza nu mai încape: inelele s-au terminat (la k = 0, buzunarul e prea îngust).
    if (nuIncape(o)) break;
    if (!o.ok) return { ok: false, motiv: `inelul la ${d.toFixed(3)} mm de contur: ${o.motiv}` };
    if (o.contururi.length === 0) break;
    const noi: InelBuzunar[] = o.contururi.map((bucla) => ({ d, bucla, copii: [] }));
    numar += noi.length;
    if (numar > PLAFON_INELE) {
      return { ok: false, motiv: `peste ${PLAFON_INELE} de inele: pasul lateral de ${pasLateral} mm e prea mic pentru buzunar` };
    }
    if (k === 0) {
      radacini.push(...noi);
    } else {
      for (const x of noi) {
        const p = x.bucla.varfuri[0]?.p;
        const parinte = p ? nivel.find((y) => inRegiune(p, [y.bucla])) : undefined;
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
 * buzunar mare are mii de niveluri). Ultimul inel al fiecărei rădăcini e chiar peretele.
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
  return s;
}

function punctPeArc(a: Punct, b: Punct, bulge: number, f: number): Punct {
  const cerc = cerculArcului(a, b, bulge);
  const u = cerc.start + cerc.baleiaj * f;
  return { x: cerc.centru.x + cerc.raza * Math.cos(u), y: cerc.centru.y + cerc.raza * Math.sin(u) };
}

/**
 * Legătura dreaptă de la a la b rămâne la adâncime (§5) dacă discul frezei nu iese din buzunar pe drum: segmentul stă la
 * cel puțin R − ε de contur, iar capetele (pe inele) sunt înăuntru.
 */
export function legaturaInBuzunar(a: Punct, b: Punct, contur: Contur, raza: number): boolean {
  const drum: Contur = { inchis: false, varfuri: [{ p: a, s: LINIE }, { p: b, s: LINIE }] };
  const prag = raza - EPS_LEGATURA;
  return inRegiune({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, [contur]) && apropiereContururi(drum, contur, prag).distanta >= prag;
}

export type ParametriBuzunar = ParametriTraseu & {
  readonly sens: Sens;
  /** Raza frezei (mm). */
  readonly raza: number;
  /** Adâncimile trecerilor (`adancimiTreceri`), în ordine. */
  readonly adancimi: readonly number[];
};

/** Două puncte mai apropiate de atât (mm) sunt același: legătura lipsește. */
const EPS_PUNCT = 1e-9;

/**
 * Traseul buzunarului: pe fiecare trecere, inelele în ordinea dată (`ordineInele`). Primul inel al trecerii se taie de la
 * vârful lui 0, cu coborârea cu avansul de plonjare; fiecare inel următor pornește din punctul lui cel mai apropiat de
 * freză, la care se ajunge la adâncime, în linie dreaptă, dacă drumul rămâne în buzunar, altfel prin ridicare. Sensul
 * (ADR 0027): inelele vin trigonometric, cu materialul de scos în dreapta mersului, deci urcarea le ia așa, opoziția le
 * întoarce. După fiecare trecere, freza se ridică la Z-ul de siguranță.
 */
export function traseuBuzunar(contur: Contur, inele: readonly InelBuzunar[], p: ParametriBuzunar): RezultatTraseu {
  if (!(p.zSigur > 0)) return { ok: false, motiv: `Z-ul de siguranță trebuie să fie deasupra materialului (${p.zSigur})` };
  if (!(p.avans > 0 && p.avansPlonjare > 0)) return { ok: false, motiv: 'avansurile trebuie să fie pozitive' };
  const bucle = inele.map((x) => (p.sens === 'urcare' ? x.bucla : inverseaza(x.bucla)));
  const m: Miscare[] = [];
  for (const d of p.adancimi) {
    let la: Punct | null = null;
    for (const b0 of bucle) {
      const b: Contur = la ? incepeLa(b0, pozitiaCeaMaiApropiata(b0, la)) : b0;
      const start: Punct | undefined = b.varfuri[0]?.p;
      if (!start) continue;
      if (la && legaturaInBuzunar(la, start, contur, p.raza)) {
        if (Math.hypot(start.x - la.x, start.y - la.y) > EPS_PUNCT) m.push({ tip: 'taiere', la: { X: start.x, Y: start.y }, avans: p.avans });
      } else {
        m.push({ tip: 'rapida', la: { Z: p.zSigur } });
        m.push({ tip: 'rapida', la: { X: start.x, Y: start.y } });
        m.push({ tip: 'taiere', la: { Z: -d }, avans: p.avansPlonjare });
      }
      const e = taieBucla(m, b, d, p, undefined);
      if (e) return { ok: false, motiv: e };
      la = start;
    }
    m.push({ tip: 'rapida', la: { Z: p.zSigur } });
  }
  return { ok: true, miscari: m };
}
