import { cerculArcului, numarSegmente, segment, type Contur } from '../geom/contur.ts';
import { BULGE_MINIM, EPS_ATINGERE } from '../geom/offset.ts';
import type { Miscare } from '../ir/ir.ts';
import { degajeaza, type Degajare } from './degajari.ts';
import type { Trecere } from './profil.ts';
import { arcIesire, arcIntrare, arcIntrareCuRampa, type IntrareAleasa } from './intrari.ts';
import { buclaCuRampa, refuzLungimeRampa, type ParametriRampa } from './rampa.ts';
import { bucataCuUrechi, EPS_VARF, lungimeBucla, noduriProfil, type ParametriUrechi } from './urechi.ts';

export type ParametriTraseu = {
  /** Z-ul de siguranță, deasupra feței de sus (mm). */
  readonly zSigur: number;
  readonly avans: number;
  readonly avansPlonjare: number;
};

export type RezultatTraseu = { readonly ok: true; readonly miscari: readonly Miscare[] } | { readonly ok: false; readonly motiv: string };

/**
 * Bucla c la o trecere, de la vârful ei 0 înapoi la el: pe profilul urechilor dacă trecerea le traversează (ADR 0028),
 * altfel cu liniile și arcele ei (arcele rămân arce). Freza e deja în vârful 0, la −adâncime. La fiecare sosire într-un
 * colț de degajat, drumul Q → E → Q (ADR 0032 §4). Întoarce refuzul, sau `null`. Și inelele buzunarului (ADR 0069).
 */
export function taieBucla(
  m: Miscare[], c: Contur, adancime: number, p: ParametriTraseu, urechi: ParametriUrechi | undefined, degajari?: readonly Degajare[],
): string | null {
  if (urechi && adancime > urechi.varf + EPS_VARF) {
    const noduri = noduriProfil(lungimeBucla(c), urechi, adancime);
    if (typeof noduri === 'string') return noduri;
    const b = bucataCuUrechi(c, noduri, p.avans, p.avansPlonjare, degajari);
    if (!b.ok) return b.motiv;
    for (const x of b.miscari) m.push(x);
    return null;
  }
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L') {
      m.push({ tip: 'taiere', la: { X: b.x, Y: b.y }, avans: p.avans });
    } else if (s.tip === 'A') {
      const { centru, raza, baleiaj } = cerculArcului(a, b, s.bulge);
      // Un arc plat (|bulge| < 1e-6, săgeata ≤ 2e-8 mm sub raza maximă de 10 000) sau mai scurt de 1e-6 mm se scrie linie,
      // ca la curățarea offsetului: în IR, un baleiaj sub 1e-12 rad e cercul întreg (`baleiajArc`). Pe `pe-linie`,
      // conturul ajunge aici necurățat (13.10: un arc cu coarda 1e-11 mm ieșea un cerc Ø50 tăiat prin piesă).
      if (Math.abs(s.bulge) < BULGE_MINIM || !(raza * Math.abs(baleiaj) >= EPS_ATINGERE)) {
        m.push({ tip: 'taiere', la: { X: b.x, Y: b.y }, avans: p.avans });
      } else {
        m.push({ tip: 'arc', la: { X: b.x, Y: b.y }, centru, sens: s.bulge > 0 ? 'trigonometric' : 'orar', avans: p.avans });
      }
    } else {
      return 'cubicele ajung la post doar ca biarce (T6, etapa 2)';
    }
    degajeaza(m, b, degajari, p.avans);
  }
  return null;
}

/**
 * Trecerile unui profil, ca mișcări în IR: pe fiecare trecere și pe fiecare contur, rapid deasupra pornirii, coborâre
 * cu avansul de plonjare, conturul cu liniile și arcele lui (arcele rămân arce), apoi ridicare la Z-ul de siguranță.
 * Pe trecerile mai adânci decât vârful urechilor, Z-ul urmează profilul lor (ADR 0028); celelalte rămân neschimbate.
 * Cu rampă (ADR 0029), fiecare buclă se taie continuu, cu toate trecerile ei, înaintea buclei următoare: rapid deasupra
 * vârfului 0, coborâre până la fața de sus, apoi rampa și tura fiecărei treceri, fără ridicare între ele. Cu intrări
 * (ADR 0030, fără rampă), `intrari[j]` e intrarea aleasă pentru bucla j: trecerile ei plonjează în A (în deșeu), intră
 * pe buclă în p₀ pe un sfert de cerc, taie bucla de la p₀ (vârful ei 0) și ies pe sfertul următor. Cu rampă și intrare
 * (ADR 0031), fiecare trecere a buclei coboară prin aer în A până la fața de sus, apoi pe intrare, ca elice, până la
 * adâncimea ei; între treceri freza se ridică. O buclă cu rampă fără intrare (omisă) se taie ca la ADR 0029. Cu degajări
 * (ADR 0032), `degajari[j]` sunt colțurile buclei j: la fiecare sosire în Q, drumul Q → E → Q, pe oricare din drumuri.
 */
export function traseuProfil(
  treceri: readonly Trecere[], p: ParametriTraseu, urechi?: ParametriUrechi, rampa?: ParametriRampa,
  intrari?: readonly (IntrareAleasa | null)[], degajari?: readonly (readonly Degajare[])[],
): RezultatTraseu {
  if (!(p.zSigur > 0)) return { ok: false, motiv: `Z-ul de siguranță trebuie să fie deasupra materialului (${p.zSigur})` };
  if (!(p.avans > 0 && p.avansPlonjare > 0)) return { ok: false, motiv: 'avansurile trebuie să fie pozitive' };
  const m: Miscare[] = [];
  if (rampa) {
    const refuz = refuzLungimeRampa(rampa);
    if (refuz) return { ok: false, motiv: refuz };
    // Trecerile au aceleași bucle (profilul le decalează o dată); adâncimile, în ordine.
    const adancimi = treceri.map((t) => t.adancime);
    for (const [j, c] of (treceri[0]?.contururi ?? []).entries()) {
      const intrare = intrari?.[j] ?? null;
      if (intrare) {
        // ADR 0031 §3: rampa pe sfertul intrării, la fiecare trecere; între treceri, freza se ridică.
        for (const d of adancimi) {
          m.push({ tip: 'rapida', la: { Z: p.zSigur } });
          m.push({ tip: 'rapida', la: { X: intrare.a.x, Y: intrare.a.y } });
          m.push({ tip: 'taiere', la: { Z: 0 }, avans: p.avansPlonjare });
          m.push(arcIntrareCuRampa(intrare, -d, p.avans, p.avansPlonjare));
          const e = taieBucla(m, c, d, p, urechi, degajari?.[j]);
          if (e) return { ok: false, motiv: e };
          m.push(arcIesire(intrare, p.avans));
          m.push({ tip: 'rapida', la: { Z: p.zSigur } });
        }
        continue;
      }
      const start = c.varfuri[0]?.p;
      if (!start) continue;
      m.push({ tip: 'rapida', la: { Z: p.zSigur } });
      m.push({ tip: 'rapida', la: { X: start.x, Y: start.y } });
      m.push({ tip: 'taiere', la: { Z: 0 }, avans: p.avansPlonjare });
      const r = buclaCuRampa(c, adancimi, rampa, urechi, p.avans, p.avansPlonjare, degajari?.[j]);
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
      const e = taieBucla(m, c, t.adancime, p, urechi, degajari?.[j]);
      if (e) return { ok: false, motiv: e };
      if (intrare) m.push(arcIesire(intrare, p.avans));
      m.push({ tip: 'rapida', la: { Z: p.zSigur } });
    }
  }
  return { ok: true, miscari: m };
}
