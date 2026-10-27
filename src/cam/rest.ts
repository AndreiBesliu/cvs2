/**
 * Frezele de rest (ADR 0093): după o freză de rază R_a, una mai mică, de rază R, scoate doar ce n-a putut atinge cea mare —
 * colțurile și fâșiile mai înguste decât 2·R_a — în aceeași regiune (un buzunar cu insulele lui, sau fundul plat al unui
 * V-carve pe un nivel).
 *
 * Freza mare a scos deschiderea regiunii cu discul ei: tot ce stă la cel mult R_a de zona centrului ei Z_a (regiunea
 * decalată cu −R_a). Freza mică merge pe inelele ei de buzunar (`ineleBuzunar`, la R, R + s, …, cu s ≤ R), dar doar pe
 * bucățile ale căror puncte q stau la peste R_a − R + ε de Z_a (ε = `EPS_REST`): un punct q cu dist(q, Z_a) ≤ R_a − R are tot
 * discul frezei mici în ce a scos cea mare, deci acolo ar tăia în gol (pe un perete drept, inelul de lângă perete e exact la
 * R_a − R: nu se taie). Inelele la cel puțin R_a de margine stau în Z_a și se sar.
 *
 * Acoperirea: un punct p al regiunii neatins de freza mare (dist(p, Z_a) > R_a), cu d(p) distanța lui la margine, are pe
 * inelul δ_j ≤ max(d(p), R) cel mai apropiat de el un punct q la |p − q| < s ≤ R (pe segmentul spre cel mai apropiat punct al
 * marginii, d scade cu 1 la 1 mm; lângă perete, inelul R e la R − d(p) ≤ R). Atunci dist(q, Z_a) > R_a − R, deci q e pe o
 * bucată păstrată, iar discul frezei mici în q îl acoperă pe p. Rămân colțurile pe care nicio freză de raza R nu le atinge și
 * ce poate scăpa eșantionarea inelului la h = `PAS_REST`: distanța la Z_a e 1-Lipschitz, deci între două eșantioane sub prag
 * ea trece de prag cu cel mult h/2, adică o fâșie de cel mult h/2 grosime și sub h lungime; plus ε. Mai multe freze de rest: fiecare față de cea dinainte (deschiderea cu
 * un disc mai mic o cuprinde pe cea cu unul mai mare, deci frezele de până la ea au scos chiar deschiderea cu discul ei).
 *
 * Tot aici, uneltele pe care le folosește și V-carve-ul (inelele colțurilor, ADR 0091): punctele unei bucle, bucățile ei pe
 * care o zonă nu le atinge, offsetul reluat puțin mai departe pe un prag de topologie.
 */
import type { Contur, Punct } from '../geom/conturBaza.ts';
import { cerculArcului, inverseaza, numarSegmente, segment } from '../geom/contur.ts';
import { offsetRegiune } from '../geom/offset.ts';
import type { Miscare } from '../ir/ir.ts';
import { indexContururi } from './axaMediala.ts';
import { ineleBuzunar, ordineInele } from './buzunar.ts';
import { avansCoborare } from './parcurgere.ts';
import type { Sens } from './profil.ts';

/** Săgeata cea mai mare a coardelor cu care se aplatizează arcele buclelor (mm). */
const SAGEATA_COLTURI = 0.0005;
/** Pasul eșantionării pe inelele frezei de rest (mm). */
export const PAS_REST = 0.02;
/** Cât trece pragul R_a − R, ca un inel paralel cu un perete (exact la prag) să nu se taie din zgomotul numeric (mm). */
export const EPS_REST = 1e-4;

/**
 * Punctele unei bucle, pe linii și pe arce (coardele arcelor cu săgeata cel mult `SAGEATA_COLTURI`), la cel mult `pasMax`
 * unul de altul, de la vârful 0 înapoi la el.
 */
export function puncteBucla(c: Contur, pasMax: number): Punct[] {
  const rez: Punct[] = [];
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (i === 0) rez.push(a);
    if (s.tip === 'A') {
      const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
      const pasUnghi = Math.min(pasMax / raza, 2 * Math.acos(Math.max(-1, 1 - SAGEATA_COLTURI / raza)));
      const n = Math.max(1, Math.ceil(Math.abs(baleiaj) / pasUnghi));
      for (let k = 1; k < n; k++) {
        const u = start + (baleiaj * k) / n;
        rez.push({ x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) });
      }
    } else {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / pasMax));
      for (let k = 1; k < n; k++) rez.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    rez.push(b);
  }
  return rez;
}

/**
 * Bucățile buclei (cu punctele `puncteBucla`) pe care `atins` le dă false, cu capetele căutate prin înjumătățire pe coarda
 * dintre ultimul punct neatins și primul atins. O buclă neatinsă nicăieri iese întreagă, închisă.
 */
export function bucatiNeatinse(c: Contur, atins: (q: Punct) => boolean, pasMax: number): Punct[][] {
  const pts = puncteBucla(c, pasMax);
  if (pts.length > 1) pts.pop();
  const n = pts.length;
  const stare = pts.map(atins);
  const k0 = stare.indexOf(true);
  if (k0 < 0) return n > 1 ? [[...pts, pts[0]!]] : [];
  const granita = (a: Punct, b: Punct): Punct => {
    // a neatins, b atins: granița pe coarda ab.
    let lo = 0, hi = 1;
    for (let it = 0; it < 30; it++) {
      const t = (lo + hi) / 2;
      if (atins({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) })) hi = t; else lo = t;
    }
    return { x: a.x + lo * (b.x - a.x), y: a.y + lo * (b.y - a.y) };
  };
  const rez: Punct[][] = [];
  let cur: Punct[] | null = null;
  for (let s = 1; s <= n; s++) {
    const i = (k0 + s) % n, prev = (k0 + s - 1) % n;
    if (!stare[i]) {
      if (!cur) cur = [granita(pts[i]!, pts[prev]!)];
      cur.push(pts[i]!);
    } else if (cur) {
      cur.push(granita(pts[prev]!, pts[i]!));
      rez.push(cur);
      cur = null;
    }
  }
  return rez;
}

/** Cât se mută un offset care cade pe un prag de topologie (mm), în ordine; spre axă, deci departe de pereți. */
const PRAGURI_OFFSET = [0.001, 0.002, 0.005] as const;

/**
 * Regiunea decalată cu −d; pe un prag de topologie (d exact cât raza cercului înscris, unde regiunea e o linie, sau un gât lat
 * exact 2d: offsetul „se atinge singur”), din nou puțin mai departe de contur (`PRAGURI_OFFSET`), ca inelele buzunarului.
 */
export function offsetDepartat(g: { readonly exterior: Contur; readonly gauri: readonly Contur[] }, d: number): ReturnType<typeof offsetRegiune> {
  let o = offsetRegiune(g.exterior, g.gauri, -d);
  for (const a of PRAGURI_OFFSET) {
    if (o.ok || o.motiv.startsWith('scula nu încape')) break;
    o = offsetRegiune(g.exterior, g.gauri, -(d + a));
  }
  return o;
}

const nuIncape = (motiv: string): boolean => /nu încape/.test(motiv);

export type RezultatBucatiRest =
  | { readonly ok: true; readonly bucati: readonly (readonly Punct[])[] }
  | { readonly ok: false; readonly motiv: string };

/**
 * Bucățile traseului frezei de rest (raza R, pasul s) în regiunea dintre `exterior` și `gauri`, după o freză de rază
 * `razaMare`: bucățile inelelor ei la peste R_a − R + `EPS_REST` de zona centrului frezei mari, orientate după sens (la
 * urcare, regiunea în stânga mersului, ca buzunarul). Freza mică nu încape nicăieri: nicio bucată.
 */
export function bucatiRest(exterior: Contur, gauri: readonly Contur[], razaMare: number, raza: number, pasLateral: number, sens: Sens): RezultatBucatiRest {
  if (!(raza > 0 && raza < razaMare)) return { ok: false, motiv: `freza de rest (raza ${raza}) trebuie să fie mai mică decât cea dinainte (raza ${razaMare})` };
  const inele = ineleBuzunar(exterior, raza, pasLateral, gauri);
  if (!inele.ok) return nuIncape(inele.motiv) ? { ok: true, bucati: [] } : { ok: false, motiv: inele.motiv };
  const z = offsetDepartat({ exterior, gauri }, razaMare);
  if (!z.ok && !nuIncape(z.motiv)) return { ok: false, motiv: `zona frezei dinainte: ${z.motiv}` };
  const zona = z.ok ? z.regiuni.flatMap((r) => [r.exterior, ...r.gauri]) : [];
  const iz = zona.length > 0 ? indexContururi(zona) : null;
  const prag = razaMare - raza + EPS_REST;
  // Inelele care stau în Z_a se sar (mai jos), deci punctele judecate sunt în afara ei: distanța la marginea ei e distanța la ea.
  const atins = (q: Punct): boolean => iz !== null && iz.distanta(q, prag) <= prag;
  const bucati: Punct[][] = [];
  for (const inel of ordineInele(inele.radacini)) {
    // Un inel la cel puțin R_a de margine stă în zona centrului frezei mari.
    if (iz !== null && inel.d >= razaMare) continue;
    for (const b of inel.bucle) bucati.push(...bucatiNeatinse(sens === 'urcare' ? b : inverseaza(b), atins, PAS_REST));
  }
  return { ok: true, bucati };
}

/**
 * Lanțul frezelor de rest după freza de rază `raza0`: fiecare față de cea dinainte (deschiderea cu un disc mai mic o cuprinde pe
 * cea cu unul mai mare, deci frezele de până la ea au scos chiar deschiderea cu discul ei). Bucățile fiecăreia, în ordine.
 */
export function bucatiRestInLant(
  exterior: Contur, gauri: readonly Contur[], raza0: number, freze: ReadonlyArray<{ readonly diametru: number; readonly pasLateral: number }>, sens: Sens,
): { readonly ok: true; readonly bucati: readonly (readonly (readonly Punct[])[])[] } | { readonly ok: false; readonly motiv: string; readonly freza: number } {
  const rez: (readonly (readonly Punct[])[])[] = [];
  let Ra = raza0;
  for (const [k, f] of freze.entries()) {
    const b = bucatiRest(exterior, gauri, Ra, f.diametru / 2, f.pasLateral, sens);
    if (!b.ok) return { ok: false, motiv: b.motiv, freza: k };
    rez.push(b.bucati);
    Ra = f.diametru / 2;
  }
  return { ok: true, bucati: rez };
}

export type ParametriTaiereBucati = { readonly zSigur: number; readonly avans: number; readonly avansPlonjare: number };

/**
 * Bucățile tăiate pe niveluri (`adancime` > 0, în ordine), câte o trecere: pe fiecare nivel, bucățile în ordinea începutului
 * cel mai apropiat de unde a rămas freza (niciuna inversată: freza plată taie pe o parte, deci sensul bucății, cel al
 * buzunarului, rămâne), fiecare cu ridicare la Z-ul de siguranță, plonjare la −adâncime și tăiere pe puncte. Între niveluri, freza coboară cel mult cât diferența lor (bucățile sunt aceleași sau mai mici: ce
 * trebuia scos la nivelul de dinainte s-a scos). `sfarsitTreceri`: indicele, în mișcări, de după fiecare nivel.
 */
export function taieBucati(
  niveluri: ReadonlyArray<{ readonly adancime: number; readonly bucati: readonly (readonly Punct[])[] }>, p: ParametriTaiereBucati,
): { readonly miscari: Miscare[]; readonly sfarsitTreceri: number[] } {
  const m: Miscare[] = [];
  const sfarsitTreceri: number[] = [];
  let unde: Punct = { x: 0, y: 0 };
  for (const { adancime, bucati } of niveluri) {
    const z = -adancime;
    const ramase = bucati.filter((b) => b.length > 0).slice();
    while (ramase.length > 0) {
      let cel = 0, dCel = Infinity;
      ramase.forEach((b, i) => {
        const a = b[0]!, da = (a.x - unde.x) ** 2 + (a.y - unde.y) ** 2;
        if (da < dCel) { dCel = da; cel = i; }
      });
      const b = ramase.splice(cel, 1)[0]!;
      m.push({ tip: 'rapida', la: { Z: p.zSigur } }, { tip: 'rapida', la: { X: b[0]!.x, Y: b[0]!.y } }, { tip: 'taiere', la: { Z: z }, avans: p.avansPlonjare });
      for (let i = 1; i < b.length; i++) {
        const q = b[i - 1]!, r = b[i]!;
        const lung = Math.hypot(r.x - q.x, r.y - q.y);
        if (lung < 1e-9) continue;
        m.push({ tip: 'taiere', la: { X: r.x, Y: r.y }, avans: avansCoborare(lung, 0, p.avans, p.avansPlonjare) });
      }
      unde = b[b.length - 1]!;
    }
    sfarsitTreceri.push(m.length);
  }
  if (m.length > 0) m.push({ tip: 'rapida', la: { Z: p.zSigur } });
  return { miscari: m, sfarsitTreceri };
}
