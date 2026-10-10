import { cerculArcului, numarSegmente, segment } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';
import type { Trecere } from './profil.ts';
import { arcIesire, arcIntrare, type IntrareAleasa } from './intrari.ts';
import { buclaCuRampa, type ParametriRampa } from './rampa.ts';
import { bucataCuUrechi, EPS_VARF, lungimeBucla, noduriProfil, type ParametriUrechi } from './urechi.ts';

export type ParametriTraseu = {
  /** Z-ul de siguranță, deasupra feței de sus (mm). */
  readonly zSigur: number;
  readonly avans: number;
  readonly avansPlonjare: number;
};

export type RezultatTraseu = { readonly ok: true; readonly miscari: readonly Miscare[] } | { readonly ok: false; readonly motiv: string };

/**
 * Trecerile unui profil, ca mișcări în IR: pe fiecare trecere și pe fiecare contur, rapid deasupra pornirii, coborâre
 * cu avansul de plonjare, conturul cu liniile și arcele lui (arcele rămân arce), apoi ridicare la Z-ul de siguranță.
 * Pe trecerile mai adânci decât vârful urechilor, Z-ul urmează profilul lor (ADR 0028); celelalte rămân neschimbate.
 * Cu rampă (ADR 0029), fiecare buclă se taie continuu, cu toate trecerile ei, înaintea buclei următoare: rapid deasupra
 * vârfului 0, coborâre până la fața de sus, apoi rampa și tura fiecărei treceri, fără ridicare între ele. Cu intrări
 * (ADR 0030, fără rampă), `intrari[j]` e intrarea aleasă pentru bucla j: trecerile ei plonjează în A (în deșeu), intră
 * pe buclă în p₀ pe un sfert de cerc, taie bucla de la p₀ (vârful ei 0) și ies pe sfertul următor.
 */
export function traseuProfil(
  treceri: readonly Trecere[], p: ParametriTraseu, urechi?: ParametriUrechi, rampa?: ParametriRampa,
  intrari?: readonly (IntrareAleasa | null)[],
): RezultatTraseu {
  if (!(p.zSigur > 0)) return { ok: false, motiv: `Z-ul de siguranță trebuie să fie deasupra materialului (${p.zSigur})` };
  if (!(p.avans > 0 && p.avansPlonjare > 0)) return { ok: false, motiv: 'avansurile trebuie să fie pozitive' };
  const m: Miscare[] = [];
  if (rampa) {
    // Trecerile au aceleași bucle (profilul le decalează o dată); adâncimile, în ordine.
    const adancimi = treceri.map((t) => t.adancime);
    for (const c of treceri[0]?.contururi ?? []) {
      const start = c.varfuri[0]?.p;
      if (!start) continue;
      m.push({ tip: 'rapida', la: { Z: p.zSigur } });
      m.push({ tip: 'rapida', la: { X: start.x, Y: start.y } });
      m.push({ tip: 'taiere', la: { Z: 0 }, avans: p.avansPlonjare });
      const r = buclaCuRampa(c, adancimi, rampa, urechi, p.avans, p.avansPlonjare);
      if (!r.ok) return r;
      for (const x of r.miscari) m.push(x);
      m.push({ tip: 'rapida', la: { Z: p.zSigur } });
    }
    return { ok: true, miscari: m };
  }
  for (const t of treceri) {
    const z = -t.adancime;
    for (const [j, c] of t.contururi.entries()) {
      const intrare = intrari?.[j] ?? null;
      const start = intrare ? intrare.a : c.varfuri[0]?.p;
      if (!start) continue;
      m.push({ tip: 'rapida', la: { Z: p.zSigur } });
      m.push({ tip: 'rapida', la: { X: start.x, Y: start.y } });
      m.push({ tip: 'taiere', la: { Z: z }, avans: p.avansPlonjare });
      if (intrare) m.push(arcIntrare(intrare, p.avans));
      if (urechi && t.adancime > urechi.varf + EPS_VARF) {
        const noduri = noduriProfil(lungimeBucla(c), urechi, t.adancime);
        if (typeof noduri === 'string') return { ok: false, motiv: noduri };
        const b = bucataCuUrechi(c, noduri, p.avans, p.avansPlonjare);
        if (!b.ok) return b;
        for (const x of b.miscari) m.push(x);
        if (intrare) m.push(arcIesire(intrare, p.avans));
        m.push({ tip: 'rapida', la: { Z: p.zSigur } });
        continue;
      }
      for (let i = 0; i < numarSegmente(c); i++) {
        const { a, b, s } = segment(c, i);
        if (s.tip === 'L') {
          m.push({ tip: 'taiere', la: { X: b.x, Y: b.y }, avans: p.avans });
        } else if (s.tip === 'A') {
          const { centru } = cerculArcului(a, b, s.bulge);
          m.push({ tip: 'arc', la: { X: b.x, Y: b.y }, centru, sens: s.bulge > 0 ? 'trigonometric' : 'orar', avans: p.avans });
        } else {
          return { ok: false, motiv: 'cubicele ajung la post doar ca biarce (T6, etapa 2)' };
        }
      }
      if (intrare) m.push(arcIesire(intrare, p.avans));
      m.push({ tip: 'rapida', la: { Z: p.zSigur } });
    }
  }
  return { ok: true, miscari: m };
}
