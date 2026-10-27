/**
 * Strategia paralelă a buzunarului (ADR 0094): freza trece pe linii paralele, la unghiul dat față de X, cu pasul lateral s între
 * ele, înăuntrul zonei centrului ei Z (regiunea decalată cu −R, cu insulele); apoi, pe fiecare trecere, trecerea de profil pe
 * marginea lui Z, ca peretele să iasă pe vector (liniile se opresc în trepte pe el).
 *
 * Acoperirea (cu s ≤ R): un punct al buzunarului la cel mult R de marginea lui Z îl atinge trecerea de profil; unul mai departe
 * are tot discul de rază R în Z, deci și segmentul spre linia de dedesubt (la sub s ≤ R), pe care freza trece. Rezultă aceeași
 * deschidere ca la inele, deci frezele de rest (ADR 0093) merg la fel după ea.
 *
 * Marginea lui Z se aplatizează pentru intersecții (coardele arcelor, cu săgeata cel mult 0,0005 mm, stau spre interior), deci
 * liniile se opresc cel mult atât înaintea ei: în partea sigură. Liniile se leagă la adâncime doar spre linia vecină, când
 * drumul rămâne în buzunar (`legaturaInBuzunar`); altfel freza se ridică.
 */
import type { Contur, Punct } from '../geom/conturBaza.ts';
import { inverseaza } from '../geom/contur.ts';
import { offsetRegiune } from '../geom/offset.ts';
import type { Miscare } from '../ir/ir.ts';
import { legaturaInBuzunar } from './buzunar.ts';
import { lungimeBucla, parcurge } from './parcurgere.ts';
import type { Sens } from './profil.ts';
import { puncteBucla } from './rest.ts';

export type ParametriParalel = {
  readonly raza: number; readonly pasLateral: number; readonly unghi: number; readonly sens: Sens;
  readonly adancimi: readonly number[]; readonly zSigur: number; readonly avans: number; readonly avansPlonjare: number;
};

export type RezultatParalel =
  | { readonly ok: true; readonly miscari: readonly Miscare[]; readonly linii: number; readonly sfarsitTreceri: readonly number[] }
  | { readonly ok: false; readonly motiv: string };

type Seg = { readonly a: Punct; readonly b: Punct };

/** Liniile (segmentele) paralele din regiunea dată de bucle, la unghiul `u` (radiani), la pasul `s`, în ordinea liniilor. */
export function liniiParalele(bucle: readonly Contur[], u: number, s: number): Seg[][] {
  const c = Math.cos(u), si = Math.sin(u);
  // În reperul rotit cu −u, liniile sunt orizontale.
  const poligoane = bucle.map((b) => puncteBucla(b, Infinity).map((p) => ({ x: p.x * c + p.y * si, y: -p.x * si + p.y * c })));
  let y0 = Infinity, y1 = -Infinity;
  for (const pol of poligoane) for (const p of pol) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const rez: Seg[][] = [];
  for (let y = y0 + s; y < y1 - 1e-9; y += s) {
    const xs: number[] = [];
    for (const pol of poligoane) {
      for (let i = 1; i < pol.length; i++) {
        const p = pol[i - 1]!, q = pol[i]!;
        if ((p.y > y) !== (q.y > y)) xs.push(p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y));
      }
    }
    xs.sort((m, n) => m - n);
    const linie: Seg[] = [];
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = { x: xs[k]! * c - y * si, y: xs[k]! * si + y * c }, b = { x: xs[k + 1]! * c - y * si, y: xs[k + 1]! * si + y * c };
      if (Math.hypot(b.x - a.x, b.y - a.y) > 1e-9) linie.push({ a, b });
    }
    rez.push(linie);
  }
  return rez;
}

/**
 * Traseul paralel al buzunarului (conturul cu insulele lui): pe fiecare trecere, liniile în zigzag (legate la adâncime spre
 * linia vecină, altfel cu ridicare), apoi trecerea de profil pe fiecare buclă a zonei centrului, în sensul operației.
 */
export function traseuParalel(contur: Contur, p: ParametriParalel, insule: readonly Contur[] = []): RezultatParalel {
  if (!(p.pasLateral > 0 && p.pasLateral <= p.raza)) {
    return { ok: false, motiv: `pasul lateral de ${p.pasLateral} mm trebuie să fie în (0, ${p.raza}] (raza frezei): altfel rămâne material între linii` };
  }
  if (!(p.unghi >= 0 && p.unghi < 180)) return { ok: false, motiv: `unghiul liniilor, ${p.unghi}°, trebuie să fie în [0°, 180°)` };
  const o = offsetRegiune(contur, insule, -p.raza);
  if (!o.ok) return { ok: false, motiv: o.motiv.startsWith('scula nu încape') ? `freza (Ø${2 * p.raza}) nu încape în buzunar` : o.motiv };
  const u = (p.unghi * Math.PI) / 180;
  const zone = o.regiuni.map((r) => [r.exterior, ...r.gauri]);
  const linii = zone.map((b) => liniiParalele(b, u, p.pasLateral));
  const m: Miscare[] = [];
  const sfarsitTreceri: number[] = [];
  const sus = (x: Punct, z: number): void => {
    m.push({ tip: 'rapida', la: { Z: p.zSigur } }, { tip: 'rapida', la: { X: x.x, Y: x.y } }, { tip: 'taiere', la: { Z: z }, avans: p.avansPlonjare });
  };
  let numar = 0;
  for (const adancime of p.adancimi) {
    const z = -adancime;
    for (const [iz, L] of linii.entries()) {
      // Bucățile rămase, pe linii; lanțul merge pe linia următoare dacă drumul de legătură rămâne în buzunar.
      const ramase = L.map((l) => l.slice());
      let unde: Punct | null = null, k = -1;
      for (;;) {
        let ales: { k: number; i: number; invers: boolean } | null = null;
        if (unde !== null) {
          const vecina = ramase[k + 1] ?? [];
          let d = Infinity;
          vecina.forEach((sg, i) => {
            for (const invers of [false, true]) {
              const capat = invers ? sg.b : sg.a, dd = Math.hypot(capat.x - unde!.x, capat.y - unde!.y);
              if (dd < d && legaturaInBuzunar(unde!, capat, contur, p.raza, insule)) { d = dd; ales = { k: k + 1, i, invers }; }
            }
          });
        }
        if (ales === null) {
          const kk = ramase.findIndex((l) => l.length > 0);
          if (kk < 0) break;
          ales = { k: kk, i: 0, invers: false };
          unde = null;
        }
        const { k: ka, i, invers } = ales as { k: number; i: number; invers: boolean };
        const sg = ramase[ka]!.splice(i, 1)[0]!;
        const [a, b] = invers ? [sg.b, sg.a] : [sg.a, sg.b];
        if (unde === null) sus(a, z);
        else m.push({ tip: 'taiere', la: { X: a.x, Y: a.y }, avans: p.avans });
        m.push({ tip: 'taiere', la: { X: b.x, Y: b.y }, avans: p.avans });
        numar++;
        unde = b; k = ka;
      }
      // Trecerea de profil: buclele zonei centrului, la urcare cu regiunea în stânga (ca inelele buzunarului).
      for (const b of zone[iz]!) {
        const bucla = p.sens === 'urcare' ? b : inverseaza(b);
        const start = bucla.varfuri[0]!.p;
        const r = parcurge(bucla, [{ s: 0, z }, { s: lungimeBucla(bucla), z }], p.avans, p.avansPlonjare);
        if (!r.ok) return { ok: false, motiv: r.motiv };
        sus(start, z);
        for (const x of r.miscari) m.push(x);
      }
    }
    sfarsitTreceri.push(m.length);
  }
  m.push({ tip: 'rapida', la: { Z: p.zSigur } });
  return { ok: true, miscari: m, linii: numar, sfarsitTreceri };
}
