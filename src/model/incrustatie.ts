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
  if (i?.fel !== 'v' || f?.tip !== 'v') return null;
  const S = op.adancime - i.joc, H = i.fierastrau, t = Math.tan((f.unghi * Math.PI) / 360);
  return { S, H, t, fata: S + H, contact: S * t, grosimeMinima: S + H + SUB_FATA_DOPULUI };
}

/** Valorile pe hârtie ale unei incrustații cu pereți drepți (ADR 0171): razele colțurilor, jocul, înălțimea dopului. */
export type ValoriIncrustatieDreapta = {
  /** Raza celei mai mici freze a locașului (vârfurile lui) și a dopului. */
  readonly rLocas: number; readonly rDop: number;
  /** Raza cu care se închide desenul (unghiurile locașului): max(0, rDop − c). */
  readonly rho: number;
  /** Colțurile dopului: vârfurile max(0, rLocas − c), unghiurile rho + c. */
  readonly varfDop: number; readonly unghiDop: number;
  readonly c: number;
  /** Înălțimea dopului: D + H pe fund sau decupat, D − g pe față. */
  readonly inaltime: number;
  /** Grosimea semifabricatului dopului: cea mai mică la cel ridicat (h + 1), cea exactă la cel decupat (D + H). */
  readonly grosime: number;
};

/**
 * Valorile pe hârtie ale incrustației cu pereți drepți a operației, sau null: singurul loc al razelor (panoul le arată, iar
 * lucrarea închide și deschide desenul cu ele, `cam/incrustatieDreapta.ts`).
 */
export function valoriIncrustatieDreapta(op: Pick<Operatie, 'adancime' | 'scula' | 'incrustatie' | 'rest'>): ValoriIncrustatieDreapta | null {
  const i = op.incrustatie;
  if (i?.fel !== 'drept') return null;
  const raza = (d: readonly { readonly scula: { readonly diametru: number } }[]): number => Math.min(...d.map((f) => f.scula.diametru / 2));
  const locas = [{ scula: op.scula }, ...(op.rest ?? [])];
  const rLocas = raza(locas), rDop = i.frezeDop && i.frezeDop.length > 0 ? raza(i.frezeDop) : rLocas;
  const c = i.jocLateral, rho = Math.max(0, rDop - c);
  const inaltime = i.dop === 'ridicat' && i.sprijin === 'fata' ? op.adancime - i.joc : op.adancime + i.fierastrau;
  return {
    rLocas, rDop, rho, varfDop: Math.max(0, rLocas - c), unghiDop: rho + c, c, inaltime,
    grosime: i.dop === 'decupat' ? inaltime : inaltime + SUB_FATA_DOPULUI,
  };
}
