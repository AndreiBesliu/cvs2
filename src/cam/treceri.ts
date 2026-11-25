/**
 * Trecerile pe adâncime (ADR 0025, invarianta 1), fără niciun import: profilul, găurirea, V-carve-ul și buzunarul le iau de aici,
 * iar fereastra exportului le arată din aceeași funcție (ADR 0291, felia 28.8↑h), nu dintr-o copie.
 */

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
