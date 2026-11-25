/**
 * Găurirea (ADR 0087): un cerc al documentului, găurit până la adâncime, scris doar cu G0 / G1 / G2 / G3 (fără ciclurile
 * fixe G81–G83, pe care GRBL nu le are: același program pe toate controlerele, `PLAN.md`, ciclurile în v1.x).
 * - **Cercul cât freza** (diametrul în D ± `TOLERANTA_GAURA`): ciocănirea în centru. Pași de cel mult `pas` (cum îi dă
 *   `adancimiTreceri`, ca la profil), cu avansul de plonjare; după fiecare pas, freza se ridică `RETRAGERE_PARTIALA` mm
 *   (rupe așchia), iar după fiecare al `retragereCompleta`-lea iese la Z-ul de siguranță (scoate așchia) și coboară rapid
 *   până la `APROPIERE` mm deasupra fundului. La urmă, la Z-ul de siguranță.
 * - **Cercul mai mare** (până la 2·D): elicea pe peretele găurii, pe cercul centrului frezei, de rază (Dc − D) / 2, cu cel
 *   mult `pas` pe tură (n = ⌈adâncime / pas⌉ ture), apoi un cerc plin la fund (fundul neted). Pe orice bucată care coboară,
 *   viteza pe Z rămâne cel mult avansul de plonjare (`parcurge`: F = min(avans, avansPlonjare · L / |ΔZ|)). Sensul: la urcare
 *   trigonometric (peretele, materialul de păstrat, în dreapta mersului, ADR 0027), la opoziție orar. Gaura iese cât cercul:
 *   centrul frezei la Dc / 2 − R de centru. Peste 2·D, discul n-ar mai acoperi centrul (ar rămâne un miez): e un buzunar.
 * Refuzate, cu motiv: cercul mai mic decât freza; peste două diametre ale ei; un pas sau o adâncime greșite.
 */
import { arc, type Contur, type Punct } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';
import { parcurge } from './parcurgere.ts';
import { felGaurire, pasiCiocanire } from './gaurireFel.ts';
import { adancimiTreceri } from './treceri.ts';

export { APROPIERE, RETRAGERE_PARTIALA, TOLERANTA_GAURA } from './gaurireFel.ts';

export type ParametriGaurire = {
  readonly centru: Punct;
  /** Diametrul cercului din desen, în mm. */
  readonly diametru: number;
  /** Diametrul frezei, în mm. */
  readonly diametruScula: number;
  readonly adancime: number;
  readonly pas: number;
  /** La al câtelea pas iese freza din gaură (1 = la fiecare). */
  readonly retragereCompleta: number;
  /** Elicea trigonometric (urcarea) sau orar (opoziția). */
  readonly trigonometric: boolean;
  readonly avans: number;
  readonly avansPlonjare: number;
  readonly zSigur: number;
};

export type RezultatGaurire =
  | { readonly ok: true; readonly fel: 'ciocanire' | 'elice'; readonly miscari: readonly Miscare[] }
  | { readonly ok: false; readonly motiv: string };

const mm = (x: number): string => String(Math.round(x * 1000) / 1000);

export function traseuGaurire(p: ParametriGaurire): RezultatGaurire {
  const D = p.diametruScula, Dc = p.diametru;
  if (!(D > 0) || !(Dc > 0)) return { ok: false, motiv: `diametrele trebuie să fie pozitive (cercul Ø${Dc}, freza Ø${D})` };
  const fel = felGaurire(Dc, D);
  if (fel === 'mic') return { ok: false, motiv: `cercul de Ø${mm(Dc)} e mai mic decât freza (Ø${mm(D)}): găurirea cere o freză cel mult cât el` };
  if (fel === 'mare') return { ok: false, motiv: `cercul de Ø${mm(Dc)} trece de două diametre ale frezei (Ø${mm(D)}): în centru ar rămâne un miez, deci e un buzunar` };
  if (!(Number.isInteger(p.retragereCompleta) && p.retragereCompleta >= 1)) {
    return { ok: false, motiv: `retragerea completă se face la un număr întreg de pași, cel puțin 1 (${p.retragereCompleta})` };
  }
  const adancimi = adancimiTreceri(p.adancime, p.pas);
  if (typeof adancimi === 'string') return { ok: false, motiv: adancimi };
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: p.zSigur } }];
  if (fel === 'ciocanire') {
    m.push({ tip: 'rapida', la: { X: p.centru.x, Y: p.centru.y } });
    for (const x of pasiCiocanire(adancimi, p.retragereCompleta)) {
      m.push(x.taie ? { tip: 'taiere', la: { Z: x.z }, avans: p.avansPlonjare } : { tip: 'rapida', la: { Z: x.z === 'sus' ? p.zSigur : x.z } });
    }
    m.push({ tip: 'rapida', la: { Z: p.zSigur } });
    return { ok: true, fel: 'ciocanire', miscari: m };
  }
  // Elicea: n ture pe cercul centrului frezei, apoi o tură plină la fund.
  const r = (Dc - D) / 2;
  const tura = 2 * Math.PI * r;
  const n = adancimi.length;
  const semn = p.trigonometric ? 1 : -1;
  const pe = (u: number): Punct => ({ x: p.centru.x + r * Math.cos(u), y: p.centru.y + r * Math.sin(u) });
  const cerc: Contur = { inchis: true, varfuri: [{ p: pe(0), s: arc(semn) }, { p: pe(Math.PI), s: arc(semn) }] };
  m.push({ tip: 'rapida', la: { X: pe(0).x, Y: pe(0).y } });
  m.push({ tip: 'taiere', la: { Z: 0 }, avans: p.avansPlonjare });
  const e = parcurge(cerc, [{ s: 0, z: 0 }, { s: n * tura, z: -p.adancime }, { s: (n + 1) * tura, z: -p.adancime }], p.avans, p.avansPlonjare);
  if (!e.ok) return { ok: false, motiv: e.motiv };
  for (const x of e.miscari) m.push(x);
  m.push({ tip: 'rapida', la: { Z: p.zSigur } });
  return { ok: true, fel: 'elice', miscari: m };
}
