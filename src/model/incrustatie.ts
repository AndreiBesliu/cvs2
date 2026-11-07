/**
 * Valorile pe hârtie ale unei incrustații în V (ADR 0170, „Ce am aflat”), fără CAM: le arată panoul de proprietăți și le
 * folosește dopul (`cam/incrustatie.ts`), dintr-un singur loc. Cu t = tan(θ/2), D adâncimea locașului, g jocul pentru clei și
 * H spațiul pentru fierăstrău: dopul pornește la S = D − g și se sapă până la S + H; întors, intră S în locaș, cu pereții
 * lipiți pe S·t de la contur (pe orizontală), g sub el și H între plăci; semifabricatul lui are cel puțin S + H + 1 mm.
 */
import type { Operatie } from './document.ts';

/** Cât lasă grosimea cea mai mică a semifabricatului sub fața coborâtă (mm): dopul nu se taie prin placă. */
export const SUB_FATA_DOPULUI = 1;

export type ValoriIncrustatie = {
  /** Adâncimea de start a dopului și cât intră el în locaș: S = D − g. */
  readonly S: number;
  /** Spațiul pentru fierăstrău, între plăci. */
  readonly H: number;
  /** tan(θ/2). */
  readonly t: number;
  /** Fața coborâtă a dopului: S + H. */
  readonly fata: number;
  /** Banda pe care pereții dopului ating locașul, de la contur, pe orizontală: S·t. */
  readonly contact: number;
  /** Grosimea cea mai mică a semifabricatului dopului: S + H + `SUB_FATA_DOPULUI`. */
  readonly grosimeMinima: number;
};

/** Valorile pe hârtie ale incrustației operației, sau null fără incrustație ori fără freză în V. */
export function valoriIncrustatie(op: Pick<Operatie, 'adancime' | 'scula' | 'incrustatie'>): ValoriIncrustatie | null {
  const i = op.incrustatie, f = op.scula.forma;
  if (!i || f?.tip !== 'v') return null;
  const S = op.adancime - i.joc, H = i.fierastrau, t = Math.tan((f.unghi * Math.PI) / 360);
  return { S, H, t, fata: S + H, contact: S * t, grosimeMinima: S + H + SUB_FATA_DOPULUI };
}
