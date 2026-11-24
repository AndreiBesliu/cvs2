/**
 * Valorile de lucru ale unei freze și tăișul ei, în program (ADR 0300 §5, documentul v27). Pur, fără importuri din lucrare:
 * îl folosesc lucrarea (`job.ts`) și dopurile (`dopV.ts`).
 */
import type { Program } from '../ir/ir.ts';
import type { Scula } from '../model/document.ts';

/** Regimul lucrării (ca `Regim` din `job.ts`): turația, avansul și plonjarea, Z-ul sigur. */
export type RegimLucru = { readonly turatie: number; readonly avans: number; readonly avansPlonjare: number; readonly zSigur: number };

/**
 * Valorile cu care taie freza: ale ei, dacă le are (turația, avansul, plonjarea; Z-ul sigur rămâne al lucrării), altfel chiar
 * regimul lucrării, același obiect (deci programele fără valori pe freze rămân octet cu octet).
 */
export function regimFrezei(s: Pick<Scula, 'regim'>, baza: RegimLucru): RegimLucru {
  const r = s.regim;
  return r ? { turatie: r.turatie, avans: r.avans, avansPlonjare: r.plonjare, zSigur: baza.zSigur } : baza;
}

const mm = (x: number): string => String(Math.round(x * 1000) / 1000);

/**
 * Tăișul (ADR 0300 §5): o freză care coboară mai adânc decât tăișul ei ar tăia cu coada. Adâncimea e față de fața de sus a
 * semifabricatului (Z = 0 în program), deci cea tăiată, cu supracursa. Pe fiecare freză montată, cea mai mare adâncime a
 * tăierilor ei; prima freză (în ordinea montării) care trece de tăiș dă motivul, cu elementul unde a coborât cel mai adânc.
 * `freze`: frezele programului, după număr (un număr are o singură freză, judecată înainte). Null: toate încap.
 */
export function refuzTais(p: Program, freze: ReadonlyMap<number, Pick<Scula, 'numar' | 'nume' | 'tais'>>): string | null {
  const maxime = new Map<number, { adancime: number; element: string }>();
  let n = p.scula.numar, element = '';
  for (const m of p.miscari) {
    if (m.tip === 'eticheta') { if (m.element !== undefined) element = m.element; continue; }
    if (m.tip === 'schimba-scula') { n = m.scula.numar; continue; }
    if ((m.tip !== 'taiere' && m.tip !== 'arc') || m.la.Z === undefined) continue;
    const adancime = -m.la.Z, x = maxime.get(n);
    if (!x || adancime > x.adancime) maxime.set(n, { adancime, element });
  }
  for (const [numar, { adancime, element: unde }] of maxime) {
    const f = freze.get(numar);
    if (f?.tais === undefined || !(adancime > f.tais + 1e-9)) continue;
    return `${unde ? `${unde}: ` : ''}freza T${numar} (${f.nume}) are tăișul de ${mm(f.tais)} mm, iar tăietura coboară la ${mm(adancime)} mm: mai adânc, ar tăia cu coada; alege o freză cu tăișul mai lung sau micșorează adâncimea`;
  }
  return null;
}
