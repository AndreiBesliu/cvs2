/**
 * Valorile pe hârtie ale unei incrustații în V (ADR 0170, „Ce am aflat”), fără CAM: le arată panoul de proprietăți și le
 * folosește dopul (`cam/incrustatie.ts`), dintr-un singur loc. Cu t = tan(θ/2), D adâncimea locașului, g jocul pentru clei și
 * H spațiul pentru fierăstrău: dopul pornește la S = D − g și se sapă până la S + H; întors, intră S în locaș, cu pereții
 * lipiți pe S·t de la contur (pe orizontală), g sub el și H între plăci; semifabricatul lui are cel puțin S + H + 1 mm.
 */
import type { BandaDop, Operatie, Scula, Urechi } from './document.ts';

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
  /**
   * Fundul doar cu freza V (ADR 0173, fără freză dreaptă): creasta cel mult g/2 în locaș (sub dop rămân cel puțin g/2) și H/2
   * pe fața coborâtă a dopului sau pe fundul benzii (între plăci, cel puțin H/2); inelele, la 2·creasta·t unul de altul.
   */
  readonly creastaLocas: number; readonly creastaDop: number;
};

/** Valorile pe hârtie ale incrustației operației, sau null fără incrustație ori fără freză în V. */
export function valoriIncrustatie(op: Pick<Operatie, 'adancime' | 'scula' | 'incrustatie'>): ValoriIncrustatie | null {
  const i = op.incrustatie, f = op.scula.forma;
  if (i?.fel !== 'v' || f?.tip !== 'v') return null;
  const S = op.adancime - i.joc, H = i.fierastrau, t = Math.tan((f.unghi * Math.PI) / 360);
  return { S, H, t, fata: S + H, contact: S * t, grosimeMinima: S + H + SUB_FATA_DOPULUI, creastaLocas: i.joc / 2, creastaDop: H / 2 };
}

/** Rezerva benzii (ADR 0172, c): cât stă tăietura decupării de peretele dopului și de marginea fundului plat (mm). */
export const REZERVA_BANDA = 0.5;
/** Punțile implicite ale decupării (ADR 0172, răspunsul 5): ca la dopul decupat cu pereți drepți. */
export const PUNTI_BANDA: Urechi = { numar: 4, latime: 4, grosime: 1 };

/**
 * Lățimea cea mai mică a benzii (ADR 0172, răspunsul 1): pereții (H·t de fiecare parte), fundul plat cu freza lui și tăietura
 * decupării cu a ei, cu rezerva c pe fiecare parte: 2·H·t + max(Ø fundului plat, Ø decupării) + 2c. Fără freză dreaptă
 * (ADR 0173), Ø fundului plat e 0: fundul îl fac inelele frezei V.
 */
export const latimeMinimaBanda = (H: number, t: number, fund: number, decupare: number): number => 2 * H * t + Math.max(fund, decupare) + 2 * REZERVA_BANDA;

/** O valoare cea mai mică, arătată omului: rotunjită în sus la 0,001 mm, ca numărul arătat, scris înapoi, să fie primit. */
export const susLaMicron = (x: number): number => Math.ceil(x * 1000 - 1e-6) / 1000;

/** Banda implicită (ADR 0172): decuparea pusă, placa S + H + 1, punțile 4 × 4 × 1 mm, freza fundului plat, lățimea calculată. */
export const bandaImplicita = (S: number, H: number): BandaDop => ({ decupare: true, grosimePlaca: S + H + SUB_FATA_DOPULUI, punti: { ...PUNTI_BANDA } });

export type ValoriBanda = {
  /** Lățimea cea mai mică și cea folosită (a documentului sau, fără ea, cea mai mică), de la desen. */
  readonly minima: number; readonly latime: number;
  /** Cât stă tăietura decupării de desen: e = H·t + c (piesa păstrată ajunge până la e, cel mult e + Ø/2 în unghiuri). */
  readonly e: number;
  /** Marginea semifabricatului pe fiecare parte a cutiei desenului: banda, șanțul de la față (S·t) și marginea. */
  readonly margine: number;
  readonly decupare: boolean;
  /** Grosimea plăcii (exactă, cu decuparea) și cea mai mică cu decuparea: S + H + grosimea punților. */
  readonly placa: number; readonly placaMinima: number;
  /**
   * Freza decupării: a benzii sau a fundului plat; null fără amândouă (fundul doar cu freza V, ADR 0173), când decuparea
   * cere „Altă freză pentru decupare”.
   */
  readonly freza: Scula | null;
  readonly punti: Urechi;
};

/**
 * Valorile pe hârtie ale benzii din jurul dopului în V (ADR 0172), sau null: doar cu `jurDop: 'banda'` și freza în V. Fără
 * câmpul `banda` (un document de dinainte de v22), banda implicită. Fără freză dreaptă (ADR 0173), fundul benzii îl fac
 * inelele frezei V, deci lățimea cea mai mică n-are freza fundului plat. Singurul loc al lor: panoul le arată, fereastra
 * exportului le pune ca implicite, iar dopul (`cam/incrustatie.ts`) se taie cu ele.
 */
export function valoriBanda(op: Pick<Operatie, 'adancime' | 'scula' | 'incrustatie' | 'fundPlat'>): ValoriBanda | null {
  const v = valoriIncrustatie(op), i = op.incrustatie, fp = op.fundPlat;
  if (!v || i?.fel !== 'v' || i.jurDop !== 'banda') return null;
  const b = i.banda ?? bandaImplicita(v.S, v.H);
  const freza = b.freza ?? fp?.scula ?? null;
  // Freza decupării lărgește banda doar cu decuparea (fără ea, nu taie nimic); fundul doar cu V n-are freză de fund.
  const fund = fp?.scula.diametru ?? 0;
  const minima = latimeMinimaBanda(v.H, v.t, fund, b.decupare ? (freza?.diametru ?? 0) : fund);
  const latime = b.latime ?? minima;
  return {
    minima, latime, e: v.H * v.t + REZERVA_BANDA, margine: latime + v.contact + i.margine, decupare: b.decupare,
    placa: b.grosimePlaca, placaMinima: v.fata + b.punti.grosime, freza, punti: b.punti,
  };
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
