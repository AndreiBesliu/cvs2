/**
 * Felul găuririi unui cerc și pașii ciocănirii (ADR 0087), fără niciun import greu: `traseuGaurire` le folosește ca să scrie
 * programul, iar fereastra exportului le arată din aceleași funcții (ADR 0291, felia 28.8↑h), nu dintr-o copie. Fără importuri.
 */

/** Cât poate diferi cercul de freză ca să fie găurit în centru, în mm: gaura iese cât freza, deci cât cercul ± atât. */
export const TOLERANTA_GAURA = 0.02;
/** Cât se ridică freza între doi pași fără ieșire (rupe așchia), în mm. */
export const RETRAGERE_PARTIALA = 1;
/** Cât deasupra fundului de dinainte coboară rapid freza după o ieșire, în mm. */
export const APROPIERE = 0.5;

/**
 * Diametrul unui cerc în lume (ADR 0087 §1): raza formei, scalată de matricea elementului, care pe un cerc e o asemănare
 * (rotire, oglindire, scară uniformă).
 */
export const diametruCerc = (raza: number, m: { readonly a: number; readonly b: number }): number => 2 * raza * Math.hypot(m.a, m.b);

/**
 * Cum găurește lucrarea un cerc de Ø`Dc` cu freza de Ø`D`: ciocănirea în centru (cercul cât freza, ± `TOLERANTA_GAURA`), elicea
 * pe perete (până la 2·D), sau refuzul: `mic` (cercul mai mic decât freza) și `mare` (peste 2·D, în centru ar rămâne un miez:
 * e un buzunar). `gresit`: un diametru care nu e pozitiv.
 */
export type FelGaurire = 'ciocanire' | 'elice' | 'mic' | 'mare' | 'gresit';

export function felGaurire(Dc: number, D: number): FelGaurire {
  if (!(D > 0) || !(Dc > 0)) return 'gresit';
  if (Dc < D - TOLERANTA_GAURA) return 'mic';
  if (Dc > 2 * D) return 'mare';
  return Dc - D <= TOLERANTA_GAURA ? 'ciocanire' : 'elice';
}

/** O mișcare pe Z a ciocănirii: până la z (sau sus, la Z-ul sigur), tăind (cu avansul de plonjare) sau rapid. */
export type PasCiocanire = { readonly z: number; readonly taie: true } | { readonly z: number | 'sus'; readonly taie: false };

/**
 * Mișcările pe Z ale ciocănirii, după coborârea la centru și înaintea ieșirii de la capăt: fiecare trecere tăiată în jos (cum
 * le dă `adancimiTreceri`); între două, freza se ridică `RETRAGERE_PARTIALA`, iar după fiecare al `retragere`-lea pas iese sus și
 * coboară rapid la `APROPIERE` deasupra fundului de dinainte.
 */
export function pasiCiocanire(adancimi: readonly number[], retragere: number): PasCiocanire[] {
  const m: PasCiocanire[] = [];
  for (const [k, d] of adancimi.entries()) {
    if (k > 0) {
      const fund = adancimi[k - 1] as number;
      if (k % retragere === 0) {
        m.push({ z: 'sus', taie: false });
        m.push({ z: -fund + APROPIERE, taie: false });
      } else {
        m.push({ z: -fund + RETRAGERE_PARTIALA, taie: false });
      }
    }
    m.push({ z: -d, taie: true });
  }
  return m;
}
