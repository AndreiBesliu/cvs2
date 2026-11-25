/**
 * Resursele unui relief pentru CAM (ADR 0310 §3, ADR 0312; felia 18.1↑c-2): harta fiecărui strat (textul ei) și octeții
 * dalelor ei, după amprentă, aduse de firul principal din baza `cncvs2-relief` și trimise workerului CAM, care face compusul.
 * Pur: nicio bază, niciun fir.
 */
import type { FormaRelief } from '../model/document.ts';
import { compune, type StratValori } from './compunere.ts';
import { hartaDinText } from './harta.ts';
import { daleDinHarta, grilaDinDale } from './strat.ts';

/** Un strat adus: textul hărții și octeții dalelor ei, după amprentă. */
export type StratResursa = { readonly text: string; readonly octeti: Readonly<Record<string, Uint8Array<ArrayBuffer>>> };
/** Straturile aduse, după amprenta hărții lor (`StratRelief.dale`). */
export type ResurseRelief = Readonly<Record<string, StratResursa>>;

/**
 * Compusul unui relief (doar straturile vizibile, de jos în sus, ADR 0310 §1) din resurse; sau amprentele care lipsesc (o
 * hartă fără text, o dală fără octeți): nimic inventat.
 */
export function compusDinResurse(
  forma: FormaRelief, resurse: ResurseRelief,
): { readonly ok: true; readonly valori: Float32Array } | { readonly ok: false; readonly lipsa: readonly string[] } {
  const straturi: StratValori[] = [], lipsa: string[] = [];
  for (const s of forma.straturi) {
    if (!s.vizibil) continue;
    const r = resurse[s.dale];
    const h = r ? hartaDinText(r.text) : null;
    if (!r || !h || h.nx !== forma.nx || h.ny !== forma.ny) { lipsa.push(s.dale); continue; }
    const d = daleDinHarta(h, (a) => r.octeti[a]);
    if (!d.ok) { lipsa.push(...d.lipsa); continue; }
    straturi.push({ mod: s.mod, vizibil: true, valori: grilaDinDale(h.nx, h.ny, d.dale) });
  }
  if (lipsa.length > 0) return { ok: false, lipsa };
  return { ok: true, valori: compune(forma.nx * forma.ny, straturi) };
}
