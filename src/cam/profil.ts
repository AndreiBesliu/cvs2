import { inverseaza, type Contur } from '../geom/contur.ts';
import { offsetInchis } from '../geom/offset.ts';

/**
 * Profilul: conturul decalat cu raza sculei, pe exterior sau pe interior, sau chiar linia, pe treceri de adâncime, în
 * sensul de tăiere cerut (ADR 0027). Urechile și intrările vin în feliile 2.4–2.5.
 */
export type Latura = 'exterior' | 'interior' | 'pe-linie';
/** Cu axul M3 (orar văzut de sus): urcare = materialul păstrat în DREAPTA sensului de mers; opoziție = în stânga. */
export type Sens = 'urcare' | 'opozitie';

export type ParametriProfil = {
  readonly latura: Latura;
  readonly sens: Sens;
  readonly diametruScula: number;
  /** Adâncimea totală, în mm, pozitivă (în jos de la suprafață). */
  readonly adancime: number;
  /** Cât scoate cel mult o trecere, în mm. */
  readonly pas: number;
};

export type Trecere = { readonly adancime: number; readonly contururi: readonly Contur[] };

export type RezultatProfil =
  | { readonly ok: true; readonly treceri: readonly Trecere[] }
  | { readonly ok: false; readonly motiv: string };

const pozitivFinit = (x: number): boolean => Number.isFinite(x) && x > 0;

/**
 * Adâncimile trecerilor, egal împărțite: n = ⌈adâncime / pas⌉ treceri de adâncime / n fiecare, ultima exact la adâncime.
 * Nicio trecere nu scoate mai mult decât pasul (invarianta 1). 8 mm cu pasul 4 dau [4, 8]; 10 mm cu pasul 4, trei de 3,33.
 */
/** Câte treceri pe adâncime poate avea un profil. */
export const PLAFON_TRECERI = 1000;

export function adancimiTreceri(adancime: number, pas: number): readonly number[] | string {
  if (!pozitivFinit(adancime)) return `adâncimea trebuie să fie un număr pozitiv (${adancime})`;
  if (!pozitivFinit(pas)) return `pasul trebuie să fie un număr pozitiv (${pas})`;
  const n = Math.max(1, Math.ceil(adancime / pas - 1e-9));
  // Plafonul pe artefact (T23): peste o mie de treceri pe o formă e un pas greșit (0,0002 mm), nu o lucrare.
  if (n > PLAFON_TRECERI) return `${n} treceri: pasul ${pas} mm e prea mic pentru adâncimea ${adancime} mm (cel mult ${PLAFON_TRECERI})`;
  return Array.from({ length: n }, (_, i) => (i + 1 === n ? adancime : ((i + 1) * adancime) / n));
}

export function profil(contur: Contur, p: ParametriProfil): RezultatProfil {
  if (!pozitivFinit(p.diametruScula)) return { ok: false, motiv: `diametrul sculei trebuie să fie pozitiv (${p.diametruScula})` };
  const adancimi = adancimiTreceri(p.adancime, p.pas);
  if (typeof adancimi === 'string') return { ok: false, motiv: adancimi };

  let contururi: readonly Contur[];
  if (p.latura === 'pe-linie') {
    // Scula taie ambii pereți: sensul nu schimbă materialul, deci traseul urmează conturul cum e desenat (ADR 0027 §3).
    contururi = [contur];
  } else {
    const raza = p.diametruScula / 2;
    const o = offsetInchis(contur, p.latura === 'exterior' ? raza : -raza);
    if (!o.ok) return o;
    // Offsetul dă buclele cu regiunea rezultatului în stânga (insulele trigonometric, golurile orar). La exterior,
    // rezultatul cuprinde piesa: materialul păstrat e în stânga, deci urcarea (păstrat în dreapta, ADR 0027) cere buclele
    // inversate. La interior, rezultatul e golul micșorat, iar materialul păstrat e în dreapta: urcarea e chiar sensul
    // lor. Pornirea rămâne vârful 0.
    const inversate = (p.latura === 'exterior') === (p.sens === 'urcare');
    contururi = inversate ? o.contururi.map(inverseaza) : o.contururi;
  }
  return { ok: true, treceri: adancimi.map((adancime) => ({ adancime, contururi })) };
}
