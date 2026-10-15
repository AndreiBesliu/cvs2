import { inverseaza, type Contur } from '../geom/contur.ts';
import { offsetDeschis, offsetInchis, type PortiuneNeatinsa } from '../geom/offset.ts';
import { parteaLume } from '../model/parte.ts';

/**
 * Profilul: conturul decalat cu raza sculei, pe exterior sau pe interior, sau chiar linia, pe treceri de adâncime, în
 * sensul de tăiere cerut (ADR 0027). Pe o cale deschisă, și pe o parte: stânga / dreapta (ADR 0037 §3, §6).
 */
export type Latura = 'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta';
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
  /**
   * Matricea elementului în lume oglindește (determinantul negativ): pe o parte, partea pe foaie se inversează odată cu
   * forma (ADR 0037 §3, `parteaLume = latura XOR (det < 0)`). Conturul primit e deja în lume.
   */
  readonly oglindit?: boolean;
};

export type Trecere = { readonly adancime: number; readonly contururi: readonly Contur[] };

/** `neatins`: pe o parte, porțiunile peretelui la care freza nu ajunge (ADR 0037 §5, §10); altfel, gol. */
export type RezultatProfil =
  | { readonly ok: true; readonly treceri: readonly Trecere[]; readonly neatins: readonly PortiuneNeatinsa[] }
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
  let neatins: readonly PortiuneNeatinsa[] = [];
  if (p.latura === 'pe-linie') {
    // Scula taie ambii pereți: sensul nu schimbă materialul, deci traseul urmează conturul cum e desenat (ADR 0027 §3).
    contururi = [contur];
  } else if (p.latura === 'stanga' || p.latura === 'dreapta') {
    // Pe o parte (ADR 0037 §6): centrul pe offsetul deschis la R, pe partea sculei din lume; peretele rămâne linia.
    if (contur.inchis) return { ok: false, motiv: 'stânga / dreapta cer o cale deschisă: pe un contur închis alege exterior sau interior' };
    const parte = parteaLume(p.latura, p.oglindit === true);
    const raza = p.diametruScula / 2;
    const o = offsetDeschis(contur, parte === 'stanga' ? raza : -raza);
    if (!o.ok) return o;
    // Sensul (ADR 0037 §6, ADR 0027): bucățile ies în sensul desenului, cu materialul păstrat de partea cealaltă a liniei.
    // Cu M3, la urcare materialul păstrat stă în dreapta mersului: scula în stânga ⇒ ca desenul. Altfel, fiecare bucată se
    // inversează, și ordinea lor odată cu ele.
    const inversate = (parte === 'stanga') !== (p.sens === 'urcare');
    contururi = inversate ? [...o.bucati].reverse().map(inverseaza) : o.bucati;
    neatins = o.neatins;
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
  return { ok: true, treceri: adancimi.map((adancime) => ({ adancime, contururi })), neatins };
}
