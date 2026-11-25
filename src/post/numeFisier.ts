/**
 * Numele fișierului ales de om (ADR 0291 §5, felia 28.8↑n). Exportul își numește fișierele după baza `cncvs2-<colț>`
 * (`numeFisier`, `numeFisierDop`, `numeInArhiva`); omul poate pune altă bază, înainte de Exportă. Se schimbă doar baza din fața
 * numelui, după calcul: octeții, ordinea, sufixele pe sculă, ale dopurilor și ale foilor rămân. Numele scurte ale controlerelor
 * cu stick FAT (`numeScurt`, `CNCVS2.NC`, `CV1T2.NC`) nu au bază, deci rămân.
 */

/** Baza numelor de azi: `cncvs2-<colțul XY0>`. */
export const bazaFisier = (origine: string): string => `cncvs2-${origine}`;

/** Cel mult atâtea caractere în baza aleasă (sufixele și extensia vin după ea). */
export const LUNGIME_NUME = 80;

/** Cât păstrează propunerea din numele foii (o bază scurtă, citibilă). */
const LUNGIME_PROPUNERE = 60;

/** De ce nu merge o bază: goală, prea lungă, cu caractere oprite de sistemele de fișiere, cu margini rele, rezervată (Windows). */
export type MotivNume = 'gol' | 'lung' | 'caractere' | 'margini' | 'rezervat';

const OPRITE = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const REZERVATE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Motivul pentru care baza `nume` nu se poate folosi; `null` dacă merge. */
export function motivNume(nume: string): MotivNume | null {
  if (nume.trim() === '') return 'gol';
  if ([...nume].length > LUNGIME_NUME) return 'lung';
  if (OPRITE.test(nume)) return 'caractere';
  if (nume !== nume.trim() || nume.startsWith('.') || nume.endsWith('.')) return 'margini';
  if (REZERVATE.test(nume)) return 'rezervat';
  return null;
}

/**
 * Propunerea de bază: din numele scris de om al foii (fără diacritice, litere mici, orice altceva ca o liniuță), altfel baza de
 * azi. Documentul n-are încă nume de proiect (proiectele multiple sunt o linie a lor); când îl va avea, intră aici.
 */
export function propunereNume(numeFoaie: string | undefined, origine: string): string {
  const slug = (numeFoaie ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const scurt = slug.slice(0, LUNGIME_PROPUNERE).replace(/-+$/, '');
  return scurt === '' ? bazaFisier(origine) : scurt;
}

/**
 * Numele `nume` al exportului făcut cu colțul `origine`, cu baza aleasă `baza` în locul celei de azi. Fără bază aleasă, cu
 * baza de azi, sau la un nume care nu începe cu baza întreagă (urmată de `-` sau `.`), numele rămâne.
 */
export function cuBaza(nume: string, origine: string, baza: string | undefined): string {
  const azi = bazaFisier(origine);
  if (baza === undefined || baza === azi || !nume.startsWith(azi)) return nume;
  const rest = nume.slice(azi.length);
  return rest === '' || rest.startsWith('-') || rest.startsWith('.') ? `${baza}${rest}` : nume;
}
