/**
 * Piesa „după CNC” (ADR 0191, felia 3.6l): o instanță a foii, cum o lasă freza, ca piesă plată cu trepte.
 *
 * - Marginea și golurile: profilele prin tot (exterior / interior, cel puțin cât grosimea foii), cu regula regiunii păstrate
 *   (ADR 0026): un punct e al piesei dacă cel mai mic inel care îl cuprinde e o piesă. Contururile sunt inelele care despart
 *   piesa de ce nu e piesă, citite par-impar.
 * - Treptele (zona lor coboară la H minus adâncime; adâncimile rămân în mm, măsurate de sus, oricare ar fi H): buzunarele (pe
 *   adâncimi, par-impar, ca lucrarea: un contur într-altul de aceeași adâncime e insulă), găuririle (cercul desenului) și
 *   profilele parțiale sau pe căi deschise (ce scoate freza purtată pe traseul centrului ei: capsulele, la raza frezei).
 * - Prin tot (adâncimea cel puțin cât grosimea foii, sau cel puțin cât H): o gaură în piesă.
 * - Nu contează: urechile, rampele, intrările și degajările (sunt ale prinderii pe CNC). V-carve-ul și orice tăietură cu freza
 *   în V (gravura) nu se imprimă: se numără, pentru nota din dialog.
 */
import { conturDeTaiat } from '../contur.ts';
import { profil } from '../profil.ts';
import { regiunePastrata } from '../regiune.ts';
import { inSensTrigonometric, type Contur } from '../../geom/contur.ts';
import type { Taietura } from '../../model/lume.ts';
import { oglindeste } from '../../model/parte.ts';
import { arieFigura, capsule, combina, dupaAdancime, type Treapta } from './trepte.ts';

export type FormeCnc =
  | { readonly ok: true; readonly contururi: readonly Contur[]; readonly trepte: readonly Treapta[]; readonly vcarve: number }
  | { readonly ok: false; readonly motiv: 'fara-margine' | 'cnc'; readonly detaliu?: string };

/** Sub atât (mm), o adâncime e „cât grosimea”: rotunjirea zecimalelor din document. */
const EPS = 1e-9;

/** Formele unei instanțe, după CNC, din tăieturile ei (`taieturiFoaie`), pe o foaie de grosimea G, pentru înălțimea H (mm). */
export function formeDupaCnc(taieturi: readonly Taietura[], G: number, H: number): FormeCnc {
  const inel = (t: Taietura): boolean =>
    t.tip === 'profil' && (t.latura === 'exterior' || t.latura === 'interior') && t.adancime >= G - EPS && !t.scula.forma;
  const rp = regiunePastrata(taieturi.filter(inel));
  if (!rp.ok) return { ok: false, motiv: 'cnc', detaliu: rp.motiv };
  const inele = rp.regiune.inele;
  // Inelele de margine: piesa de o parte, altceva de cealaltă (părintele cel mai mic, ca la regiunea păstrată).
  const margini = inele.filter((x) => (x.rol === 'piesa') !== (x.parinte !== null && inele[x.parinte]?.rol === 'piesa'));
  if (!margini.some((x) => x.rol === 'piesa')) return { ok: false, motiv: 'fara-margine' };
  let contururi: Contur[] = margini.map((x) => x.contur);
  const prinTot = (d: number): boolean => d >= G - EPS || H - d <= EPS;
  const gauri: Contur[] = [];
  const trepte: Treapta[] = [];
  const adauga = (c: readonly Contur[], d: number): void => {
    if (c.length === 0) return;
    if (prinTot(d)) gauri.push(...c); else trepte.push({ contururi: c, inaltime: H - d });
  };
  const buzunare = new Map<number, Contur[]>();
  let vcarve = 0;
  for (const t of taieturi) {
    if (t.tip === 'vcarve' || t.scula.forma) { vcarve++; continue; }
    if (inel(t)) continue;
    const r = conturDeTaiat(t);
    if (!r.ok) return { ok: false, motiv: 'cnc', detaliu: `${t.idLume}: ${r.motiv}` };
    if (t.tip === 'buzunar' || t.tip === 'gaurire') {
      // Un buzunar sau o găurire pe o cale deschisă n-are interior (lucrarea le refuză): nu scot nimic.
      if (!r.contur.inchis) continue;
      if (t.tip === 'gaurire') adauga([inSensTrigonometric(r.contur)], t.adancime);
      else buzunare.set(t.adancime, [...(buzunare.get(t.adancime) ?? []), r.contur]);
      continue;
    }
    const p = profil(r.contur, {
      latura: t.latura, sens: t.sens, diametruScula: t.scula.diametru, adancime: t.adancime, pas: t.pas, oglindit: oglindeste(t.matrice),
    });
    if (!p.ok) return { ok: false, motiv: 'cnc', detaliu: `${t.idLume}: ${p.motiv}` };
    adauga((p.treceri[0]?.contururi ?? []).flatMap((c) => capsule(c, t.scula.diametru / 2)), t.adancime);
  }
  for (const [d, c] of buzunare) adauga(dupaAdancime(c), d);
  if (gauri.length > 0) {
    const r = combina([{ c: contururi, compl: true }, { c: gauri, infasurare: true }]);
    if (typeof r === 'string') return { ok: false, motiv: 'cnc', detaliu: r };
    if (r.length === 0 || arieFigura(r) < 0.01) return { ok: false, motiv: 'cnc', detaliu: 'tăieturile prin tot scot toată piesa' };
    contururi = r;
  }
  return { ok: true, contururi, trepte, vcarve };
}
