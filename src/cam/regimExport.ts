/**
 * Regimul implicit al lucrării, Z-ul sigur și parcarea de la final (ADR 0291 §3, 3a; felia 28.8↑p). Stă singur, fără
 * dependențe, ca fereastra exportului să-i citească valorile și marginile fără să aducă CAM-ul în pachetul de pornire (ca
 * `supracursaMaxima.ts`).
 *
 * - Turația, avansul și plonjarea implicite taie cu orice freză fără valorile ei (`scula.regim`, documentul v27): o freză
 *   „scrisă de mână” care primește în fereastră doar unele dintre ele le ia pe celelalte de aici.
 * - Z-ul sigur și parcarea sunt două setări ale aplicației, din „Mașina și fișierul”, trimise exportului ca supracursa.
 *
 * - Z-ul sigur e înălțimea rapidelor de deasupra foii, față de fața ei de sus (mm). Cel puțin 1 mm: ciocănirea găuririi urcă
 *   rapid cu 1 mm peste fundul trecerii de dinainte (`RETRAGERE_PARTIALA`), deci un Z sigur mai mic ar strica ordinea
 *   mișcărilor; cel mult 100 mm, o cursă de mașină de atelier.
 * - Parcarea e un punct în coordonatele programului (față de XY0, cum le arată mașina), mm; postul îl scrie după `M5`.
 */

/** Turația (rot/min), avansul și plonjarea (mm/min) ale lucrării, pe frezele fără valorile lor. */
export const TURATIE_IMPLICITA = 18_000;
export const AVANS_IMPLICIT = 1_000;
export const PLONJARE_IMPLICITA = 300;

/** Z-ul sigur de până la 28.8↑p: programele fără setare rămân octet cu octet. */
export const Z_SIGUR_IMPLICIT = 5;
export const Z_SIGUR_MINIM = 1;
export const Z_SIGUR_MAXIM = 100;
/** Cât poate sta parcarea de XY0 pe fiecare axă, mm: latura cea mai mare a unei foi (`PLAFON.latura`). */
export const PARCARE_MAXIMA = 10_000;

/** Parcarea de la final, în coordonatele programului (mm). */
export type Parcare = { readonly x: number; readonly y: number };

export const zSigurBun = (z: number): boolean => Number.isFinite(z) && z >= Z_SIGUR_MINIM && z <= Z_SIGUR_MAXIM;
export const parcareBuna = (p: Parcare): boolean =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= PARCARE_MAXIMA && Math.abs(p.y) <= PARCARE_MAXIMA;

/** Motivul refuzului exportului pentru Z-ul sigur și parcarea date, sau null dacă trec. */
export function motivMiscariAer(zSigur: number | undefined, parcare: Parcare | undefined): string | null {
  if (zSigur !== undefined && !zSigurBun(zSigur)) {
    return `Z-ul sigur trebuie să fie între ${Z_SIGUR_MINIM} și ${Z_SIGUR_MAXIM} mm deasupra foii (${zSigur})`;
  }
  if (parcare !== undefined && !parcareBuna(parcare)) {
    return `parcarea trebuie să fie cel mult ${PARCARE_MAXIMA} mm de XY0 pe fiecare axă (${parcare.x}, ${parcare.y})`;
  }
  return null;
}
