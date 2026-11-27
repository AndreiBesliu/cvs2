/**
 * Creasta lăsată de o freză pe un fund, pe hârtie (ADR 0310 §5, ADR 0303 §4). Pur.
 *
 * Silueta e înălțimea capătului frezei deasupra vârfului, la distanța r de axă: plata 0; bila de rază R, R − √(R² − r²);
 * toroidala, cu discul plat a = R − ρ, 0 pe disc și ρ − √(ρ² − (r − a)²) dincolo de el; V-ul de unghi θ, cu vârful plat v,
 * (r − v / 2) / tan(θ / 2) dincolo de vârf. Un punct al fundului aflat la d de cel mai apropiat drum al frezei, la adâncimea
 * finală, rămâne la h(d) deasupra fundului.
 */
import type { FormaSculaDoc, Scula } from './document.ts';

/** Silueta frezei la distanța r de axă (0 ≤ r ≤ R), deasupra vârfului. */
export function inaltimeFreza(s: Scula, r: number): number {
  const R = s.diametru / 2;
  const f = s.forma;
  if (f?.tip === 'bila') return R - Math.sqrt(Math.max(0, R * R - r * r));
  if (f?.tip === 'toroidala') {
    const rho = f.raza, a = R - rho;
    return r <= a ? 0 : rho - Math.sqrt(Math.max(0, rho * rho - (r - a) * (r - a)));
  }
  if (f?.tip === 'v') {
    const v = (f.varf ?? 0) / 2;
    return r <= v ? 0 : (r - v) / Math.tan((f.unghi * Math.PI) / 360);
  }
  return 0;
}

/**
 * Raza colțului unei freze rotunde (ADR 0303 §1): la bilă, R = Ø / 2; la toroidală, ρ (raza ei); altfel null. Cu bila fără
 * diametru știut, null: nu se poate spune.
 */
export function razaColtului(forma: FormaSculaDoc | undefined, diametru: number | undefined): number | null {
  if (forma?.tip === 'toroidala') return forma.raza;
  if (forma?.tip === 'bila') return diametru === undefined ? null : diametru / 2;
  return null;
}

/**
 * Peretele unei tăieturi pe o parte cu bila sau cu toroidala (ADR 0303 §4, felia 16.A↑e-6; întrebarea 2a), la adâncimea tăiată
 * d (cu supracursa): centrul frezei stă la R de desen, iar pe desen silueta are raza R abia la ρ deasupra vârfului, deci
 * peretele e vertical de la față până la d − ρ, iar la fund rămâne racordarea de rază ρ. Prin foaie (d ≥ grosimea g), cât
 * d − ρ < g, racordarea rămâne pe muchia de jos a piesei, pe g − (d − ρ) mm (`margineJos`; 0 altfel). `null`: freza nu e
 * rotundă, sau d < ρ (peretele n-ar ajunge la desen: lucrarea refuză).
 */
export function peretePeOParte(s: Scula, adancime: number, grosime: number | undefined): { readonly vertical: number; readonly raza: number; readonly margineJos: number } | null {
  const rho = razaColtului(s.forma, s.diametru);
  if (rho === null || !(adancime >= rho)) return null;
  const vertical = adancime - rho;
  const margineJos = grosime !== undefined && adancime >= grosime && vertical < grosime ? grosime - vertical : 0;
  return { vertical, raza: rho, margineJos };
}

/**
 * Creasta de pe fundul unui buzunar (ADR 0303 §4, felia 16.A↑e-5), la pasul lateral s: între două inele drepte, la s una de
 * alta, mijlocul e la s / 2 de amândouă, deci h(s / 2) = ρ − √(ρ² − ((s − 2a) / 2)²) (0 cât s ≤ 2a); pe colțurile inelelor și
 * pe mijlocul buzunarului, un punct poate sta la aproape s de drum (ADR 0069 §3), deci cel mult h(s). Freza plată nu lasă
 * creastă. `null`: pasul nu e al unui buzunar (în afara (0, R]) sau freza e în V (nu merge în buzunar).
 */
export function creastaBuzunar(s: Scula, pasLateral: number): { readonly intreInele: number; readonly maxima: number } | null {
  if (s.forma?.tip === 'v') return null;
  if (!(pasLateral > 0 && pasLateral <= s.diametru / 2)) return null;
  return { intreInele: inaltimeFreza(s, pasLateral / 2), maxima: inaltimeFreza(s, pasLateral) };
}
